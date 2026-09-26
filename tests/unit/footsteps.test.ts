import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng.ts';
import { footsteps, movement } from '../../src/data/tuning.ts';
import { SURFACE } from '../../src/data/world/terrain.ts';
import { analyze, spectralCentroid } from '../../src/dsp/analysis.ts';
import {
  type Footfall,
  FootstepPlanner,
  renderVoices,
  type StepVoice,
  stepSoundFor,
} from '../../src/dsp/footsteps.ts';
import {
  FRESH_CRUNCH,
  PACKED_CRUNCH,
  planCrunch,
  renderSfx,
  SFX_RATE,
  SFX_VARIANTS,
  type SfxId,
} from '../../src/dsp/sfx/recipes.ts';
import { dbToGain } from '../../src/dsp/util.ts';

const walkOn = (surface: number, extra: Partial<Footfall> = {}): Footfall => ({
  surface,
  side: 0,
  speed: movement.walkSpeed,
  jog: false,
  airC: -6,
  ...extra,
});

describe('sound effect recipes', () => {
  it('render every variant the same way twice, finite, audible and below full scale', () => {
    for (const id of Object.keys(SFX_VARIANTS) as SfxId[]) {
      for (let v = 0; v < SFX_VARIANTS[id]; v++) {
        const a = renderSfx(id, v);
        const b = renderSfx(id, v);
        let same = a.length === b.length;
        let finite = true;
        let peak = 0;
        for (let i = 0; i < a.length; i++) {
          const x = a[i] as number;
          if (x !== b[i]) same = false;
          if (!Number.isFinite(x)) finite = false;
          peak = Math.max(peak, Math.abs(x));
        }
        expect(same, `${id}#${v} deterministic`).toBe(true);
        expect(finite, `${id}#${v} finite`).toBe(true);
        expect(peak, `${id}#${v}`).toBeGreaterThan(0.05);
        expect(peak, `${id}#${v}`).toBeLessThan(0.97);
      }
    }
  });

  it('crunches like the plan: 30–80 clicks over 120–250 ms in fresh snow, shorter when packed', () => {
    for (let seed = 0; seed < 200; seed++) {
      const fresh = planCrunch(FRESH_CRUNCH, new Rng(seed));
      expect(fresh.grains.length).toBeGreaterThanOrEqual(30);
      expect(fresh.grains.length).toBeLessThanOrEqual(80);
      expect(fresh.duration).toBeGreaterThanOrEqual(0.12);
      expect(fresh.duration).toBeLessThanOrEqual(0.25);
      for (const g of fresh.grains) {
        expect(g.t).toBeGreaterThanOrEqual(0);
        expect(g.t).toBeLessThanOrEqual(fresh.duration);
      }
      const packed = planCrunch(PACKED_CRUNCH, new Rng(seed));
      expect(packed.duration).toBeLessThan(0.15);
    }
  });

  it('keeps each footstep’s variants within 3 dB of each other', () => {
    for (const id of ['stepSnow', 'stepPacked', 'stepIce', 'stepSqueak', 'rustle'] as const) {
      const louds = Array.from(
        { length: SFX_VARIANTS[id] },
        (_, v) => analyze([renderSfx(id, v)], SFX_RATE).loudnessDb,
      );
      expect(Math.max(...louds) - Math.min(...louds), id).toBeLessThan(3);
    }
  });
});

describe('footstep planner (Plan Part 6.8)', () => {
  it('resolves the valley’s surfaces to fresh, packed and ice steps', () => {
    expect(stepSoundFor(SURFACE.snow)).toBe('stepSnow');
    expect(stepSoundFor(SURFACE.road)).toBe('stepPacked');
    expect(stepSoundFor(SURFACE.rail)).toBe('stepPacked');
    expect(stepSoundFor(SURFACE.lakeIce)).toBe('stepIce');
    expect(stepSoundFor(SURFACE.creekIce)).toBe('stepIce');
    expect(stepSoundFor(99)).toBe('stepSnow');
  });

  it('never repeats a variant back to back, and varies pitch ±5 %, gain ±1.5 dB and pan by foot', () => {
    const planner = new FootstepPlanner(footsteps, movement.walkSpeed, new Rng(3));
    const out: StepVoice[] = [];
    let previous = -1;
    const variants = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const side = (i % 2) as 0 | 1;
      const step = planner.plan(walkOn(SURFACE.snow, { side }), out)[0] as StepVoice;
      expect(step.id).toBe('stepSnow');
      expect(step.variant).not.toBe(previous);
      previous = step.variant;
      variants.add(step.variant);
      expect(Math.abs(step.rate - 1)).toBeLessThanOrEqual(0.05);
      const db = 20 * Math.log10(step.gain / footsteps.level);
      expect(Math.abs(db)).toBeLessThanOrEqual(1.5 + 1e-9);
      expect(step.pan).toBeCloseTo(side === 0 ? -0.05 : 0.05, 12);
    }
    expect(variants.size).toBe(SFX_VARIANTS.stepSnow);
  });

  it('adds a coat rustle at −12 dB, a squeak only on packed snow at −15 °C or colder, and two feet on landing', () => {
    const planner = new FootstepPlanner(footsteps, movement.walkSpeed, new Rng(5));
    const ids = (f: Footfall) => planner.plan(f, []).map((v) => v.id);
    expect(ids(walkOn(SURFACE.snow))).toEqual(['stepSnow', 'rustle']);
    expect(ids(walkOn(SURFACE.road, { airC: -14 }))).toEqual(['stepPacked', 'rustle']);
    expect(ids(walkOn(SURFACE.road, { airC: -15 }))).toEqual(['stepPacked', 'stepSqueak', 'rustle']);
    expect(ids(walkOn(SURFACE.lakeIce, { airC: -20 }))).toEqual(['stepIce', 'rustle']);
    const landing = planner.plan(walkOn(SURFACE.snow, { land: true }), []);
    expect(landing.map((v) => v.id)).toEqual(['stepSnow', 'stepSnow', 'rustle']);
    expect(landing[1]?.delay).toBe(footsteps.landSecondFoot);
    expect(landing[1]?.variant).not.toBe(landing[0]?.variant);
    // Rustle sits 12 dB under the step (each carries its own ±1.5 dB jitter).
    const trials = Array.from({ length: 200 }, () => planner.plan(walkOn(SURFACE.snow), []));
    const meanDb =
      trials.reduce(
        (s, [step, rustle]) => s + 20 * Math.log10((rustle as StepVoice).gain / (step as StepVoice).gain),
        0,
      ) / trials.length;
    expect(meanDb).toBeCloseTo(footsteps.rustleDb, 0);
  });

  it('softens slow steps', () => {
    const planner = new FootstepPlanner({ ...footsteps, gainJitterDb: 0 }, movement.walkSpeed, new Rng(9));
    const walkGain = planner.plan(walkOn(SURFACE.snow), [])[0]?.gain ?? 0;
    const creepGain = planner.plan(walkOn(SURFACE.snow, { speed: 0 }), [])[0]?.gain ?? 0;
    expect(creepGain / walkGain).toBeCloseTo(footsteps.creepLevel, 9);
  });

  it('makes jog steps about 2 dB louder and 600 Hz brighter, as played', () => {
    const shelf = footsteps.jogShelfDb;
    // The shelf adds more loudness to bright powder than to dull packed snow: +2 dB on average.
    const louder: number[] = [];
    for (const id of ['stepSnow', 'stepPacked'] as const) {
      let dLoud = 0;
      let dCentroid = 0;
      for (let v = 0; v < SFX_VARIANTS[id]; v++) {
        const base: StepVoice = { id, variant: v, gain: 0.5, rate: 1, pan: 0, shelfDb: 0, delay: 0 };
        const jog: StepVoice = { ...base, gain: 0.5 * dbToGain(footsteps.jogGainDb), shelfDb: shelf };
        const render = (voice: StepVoice) =>
          renderVoices([{ ...voice, at: 0 }], renderSfx, footsteps.jogShelfHz, SFX_RATE, 0.5)[0];
        const a = render(base);
        const b = render(jog);
        dLoud += analyze([b], SFX_RATE).loudnessDb - analyze([a], SFX_RATE).loudnessDb;
        dCentroid += spectralCentroid(b, SFX_RATE) - spectralCentroid(a, SFX_RATE);
      }
      const n = SFX_VARIANTS[id];
      louder.push(dLoud / n);
      expect(dLoud / n, id).toBeGreaterThan(1.4);
      expect(dLoud / n, id).toBeLessThan(2.6);
      expect(dCentroid / n, id).toBeGreaterThan(450);
      expect(dCentroid / n, id).toBeLessThan(750);
    }
    expect(louder.reduce((a, b) => a + b, 0) / louder.length).toBeCloseTo(2, 0);
  });
});
