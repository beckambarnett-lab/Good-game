// Footstep voices (Plan Part 6.8): which sounds a footfall makes and how each one is varied. Pure
// and seeded, so the game (through Web Audio) and the offline QA render (in Node) make the very
// same steps, and the plan's variation rules are unit-tested.

import type { Rng } from '../core/rng.ts';
import { squeakySteps, surfaceSteps } from '../data/audio/footsteps.ts';
import type { FootstepTuning } from '../data/tuning.ts';
import { SURFACE, type SurfaceKind } from '../data/world/terrain.ts';
import { SFX_VARIANTS, type SfxId } from './sfx/recipes.ts';
import { biquadInPlace, dbToGain, highShelfCoeffs } from './util.ts';

export interface Footfall {
  /** Surface code under the foot (`SURFACE`). */
  surface: number;
  /** 0 = left foot, 1 = right. */
  side: 0 | 1;
  /** Ground speed (m/s). */
  speed: number;
  jog: boolean;
  /** Air temperature (°C), for the cold squeak. */
  airC: number;
  /** Landing from a hop: both feet, heavier. */
  land?: boolean;
}

export interface StepVoice {
  id: SfxId;
  variant: number;
  /** Linear gain. */
  gain: number;
  /** Playback rate: pitch and speed together, as a sample played faster. */
  rate: number;
  /** −1 (left) … 1 (right). */
  pan: number;
  /** High-shelf boost (dB) at the tuning's shelf frequency; 0 for none. */
  shelfDb: number;
  /** Seconds after the footfall. */
  delay: number;
}

const kindOf = new Map<number, SurfaceKind>(
  (Object.entries(SURFACE) as [SurfaceKind, number][]).map(([k, code]) => [code, k]),
);

/** The step sound for a surface code; unknown codes are treated as fresh snow. */
export function stepSoundFor(surface: number): SfxId {
  return surfaceSteps[kindOf.get(surface) ?? 'snow'];
}

export class FootstepPlanner {
  private readonly t: FootstepTuning;
  private readonly walkSpeed: number;
  private readonly rng: Rng;
  private readonly last = new Map<SfxId, number>();

  /** `t` is read on every step, so a live-tuned object takes effect at once. */
  constructor(t: FootstepTuning, walkSpeed: number, rng: Rng) {
    this.t = t;
    this.walkSpeed = walkSpeed;
    this.rng = rng;
  }

  /** The voices one footfall sounds, written into `out`. */
  plan(f: Footfall, out: StepVoice[]): StepVoice[] {
    const t = this.t;
    out.length = 0;
    const id = stepSoundFor(f.surface);
    const pace = Math.min(1, Math.max(0, f.speed / this.walkSpeed));
    const level = t.level * (t.creepLevel + (1 - t.creepLevel) * pace);
    const db = (f.jog ? t.jogGainDb : 0) + (f.land ? t.landGainDb : 0);
    const shelf = f.jog ? t.jogShelfDb : 0;
    const pan = (f.side === 0 ? -1 : 1) * t.footPan;
    out.push(this.voice(id, level * dbToGain(db), pan, shelf, 0));
    if (f.land) out.push(this.voice(id, level * dbToGain(db - 4), -pan, shelf, t.landSecondFoot));
    if (squeakySteps.has(id) && f.airC <= t.squeakBelowC) {
      out.push(this.voice('stepSqueak', level * dbToGain(db + t.squeakDb), pan, 0, 0));
    }
    out.push(this.voice('rustle', level * dbToGain(db + t.rustleDb), 0, 0, 0));
    return out;
  }

  /** A varied voice: never the same variant twice running, jittered pitch and gain. */
  private voice(id: SfxId, gain: number, pan: number, shelfDb: number, delay: number): StepVoice {
    const count = SFX_VARIANTS[id];
    let variant = this.rng.int(0, count - 1);
    const previous = this.last.get(id);
    if (count > 1 && variant === previous) variant = (variant + this.rng.int(1, count - 1)) % count;
    this.last.set(id, variant);
    const t = this.t;
    return {
      id,
      variant,
      gain: gain * dbToGain(this.rng.range(-1, 1) * t.gainJitterDb),
      rate: 1 + this.rng.range(-1, 1) * t.pitchJitter,
      pan,
      shelfDb,
      delay,
    };
  }
}

/**
 * Renders voices to stereo the way the game's Web Audio graph plays them (rate by linear
 * interpolation, high shelf, gain, equal-power pan), for the offline QA render and tests.
 */
export function renderVoices(
  voices: readonly (StepVoice & { at: number })[],
  sources: (id: SfxId, variant: number) => Float32Array,
  shelfHz: number,
  sampleRate: number,
  seconds: number,
): [Float32Array, Float32Array] {
  const left = new Float32Array(Math.ceil(seconds * sampleRate));
  const right = new Float32Array(left.length);
  for (const v of voices) {
    const src = sources(v.id, v.variant);
    const out = new Float32Array(Math.floor(src.length / v.rate));
    for (let i = 0; i < out.length; i++) {
      const x = i * v.rate;
      const i0 = Math.floor(x);
      const a = src[i0] ?? 0;
      const b = src[i0 + 1] ?? 0;
      out[i] = a + (b - a) * (x - i0);
    }
    if (v.shelfDb !== 0) biquadInPlace(out, highShelfCoeffs(shelfHz, v.shelfDb, sampleRate));
    const p = (v.pan + 1) / 2;
    const gl = Math.cos((p * Math.PI) / 2) * v.gain;
    const gr = Math.sin((p * Math.PI) / 2) * v.gain;
    const start = Math.round((v.at + v.delay) * sampleRate);
    for (let i = 0; i < out.length && start + i < left.length; i++) {
      const s = out[i] ?? 0;
      left[start + i] = (left[start + i] ?? 0) + s * gl;
      right[start + i] = (right[start + i] ?? 0) + s * gr;
    }
  }
  return [left, right];
}
