// Sound-effect recipes (Plan Part 6.7): felling and footsteps. Each renders one variant from a
// seed; variants differ in resonance, timing and colour so repeated sounds never match.

import { hashString, Rng } from '../../core/rng.ts';
import { applyFades, biquadInPlace, lowpassCoeffs, normalizePeak, removeDc } from '../util.ts';

export const SFX_RATE = 44100;

export type SfxId =
  | 'chopSmall'
  | 'chopMedium'
  | 'chopLarge'
  | 'miss'
  | 'whoosh'
  | 'creak'
  | 'crack'
  | 'fallWhoosh'
  | 'thud'
  | 'snowSift'
  | 'stepSnow'
  | 'stepPacked'
  | 'stepIce'
  | 'stepSqueak'
  | 'rustle';

/** Recipes built from deliberate micro-impulses (crackle, stick-slip); click QA doesn't apply. */
export const IMPULSIVE_SFX: ReadonlySet<SfxId> = new Set([
  'creak',
  'crack',
  'snowSift',
  'stepSnow',
  'stepPacked',
  'stepIce',
  'stepSqueak',
]);

/** Variant counts; footsteps follow Plan Part 6.7 (fresh 10, packed 8, squeak 6, ice 8). */
export const SFX_VARIANTS: Readonly<Record<SfxId, number>> = {
  chopSmall: 6,
  chopMedium: 6,
  chopLarge: 6,
  miss: 5,
  whoosh: 5,
  creak: 4,
  crack: 3,
  fallWhoosh: 2,
  thud: 3,
  snowSift: 4,
  stepSnow: 10,
  stepPacked: 8,
  stepIce: 8,
  stepSqueak: 6,
  rustle: 6,
};

/** Footstep and clothing sounds, for the footstep system and its QA. */
export const FOOTSTEP_SFX: readonly SfxId[] = ['stepSnow', 'stepPacked', 'stepIce', 'stepSqueak', 'rustle'];

const bandpass = (f0: number, q: number) => {
  const w = (2 * Math.PI * f0) / SFX_RATE;
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * Math.cos(w)) / a0,
    a2: (1 - alpha) / a0,
  };
};

/** Decaying sine mode added into `out` starting at sample `at`. */
function mode(out: Float32Array, at: number, freq: number, level: number, decay: number, rng: Rng): void {
  const w = (2 * Math.PI * freq) / SFX_RATE;
  const k = Math.exp(-1 / (decay * SFX_RATE));
  let e = level;
  let phase = rng.next() * Math.PI * 2;
  const ramp = 0.0015 * SFX_RATE; // 1.5 ms onset so a mode never starts with a step
  for (let i = at; i < out.length && e > 1e-5; i++) {
    const onset = Math.min(1, (i - at) / ramp);
    out[i] = (out[i] ?? 0) + Math.sin(phase) * e * onset;
    phase += w;
    e *= k;
  }
}

/** Noise burst with exponential decay, optionally band-passed. */
function burst(len: number, decay: number, rng: Rng, amp = 1): Float32Array {
  const b = new Float32Array(len);
  const k = Math.exp(-1 / (decay * SFX_RATE));
  let e = amp;
  for (let i = 0; i < len; i++) {
    b[i] = (rng.next() * 2 - 1) * e;
    e *= k;
  }
  return b;
}

function mixInto(out: Float32Array, src: Float32Array, at: number, gain: number): void {
  for (let i = 0; i < src.length && at + i < out.length; i++)
    out[at + i] = (out[at + i] ?? 0) + (src[i] ?? 0) * gain;
}

function finish(out: Float32Array, peakTarget: number): Float32Array {
  removeDc(out, SFX_RATE);
  applyFades(out, 8, Math.floor(0.01 * SFX_RATE));
  normalizePeak(out, peakTarget);
  return out;
}

/** Axe biting into a trunk. `scale` < 1 = thin tree (brighter), > 1 = thick (deeper). */
function chop(scale: number, rng: Rng): Float32Array {
  const out = new Float32Array(Math.floor(0.55 * SFX_RATE));
  // Body thump.
  const thudHz = (95 - 20 * (scale - 1)) * (0.95 + 0.1 * rng.next());
  mode(out, 0, thudHz, 0.9, 0.05 + 0.02 * scale, rng);
  // Wood resonance modes (the "tock").
  const base = (340 / scale) * (0.92 + 0.16 * rng.next());
  mode(out, 0, base, 0.55, 0.09 * scale, rng);
  mode(out, 0, base * 2.31, 0.3, 0.05 * scale, rng);
  mode(out, 0, base * 3.87, 0.16, 0.03, rng);
  // Crack of the edge cutting fibres.
  const crack = burst(Math.floor(0.05 * SFX_RATE), 0.008, rng, 0.9);
  biquadInPlace(crack, bandpass(1800 + 900 * rng.next(), 0.9));
  mixInto(out, crack, 0, 1.4);
  // Chips pattering down in the snow.
  const chips = 5 + Math.floor(rng.next() * 6);
  for (let c = 0; c < chips; c++) {
    const at = Math.floor((0.03 + rng.next() * 0.25) * SFX_RATE);
    const tick = burst(Math.floor(0.006 * SFX_RATE), 0.0015, rng, 0.25 * (1 - c / chips));
    biquadInPlace(tick, bandpass(2500 + 2500 * rng.next(), 2));
    mixInto(out, tick, at, 1);
  }
  return finish(out, 0.9);
}

function miss(rng: Rng): Float32Array {
  const out = new Float32Array(Math.floor(0.3 * SFX_RATE));
  const f = 260 + 80 * rng.next();
  mode(out, 0, f, 0.6, 0.03, rng);
  mode(out, 0, f * 2.7, 0.2, 0.015, rng);
  const scrape = burst(Math.floor(0.12 * SFX_RATE), 0.03, rng, 0.25);
  biquadInPlace(scrape, bandpass(3200, 1.5));
  mixInto(out, scrape, Math.floor(0.005 * SFX_RATE), 1);
  return finish(out, 0.55);
}

function whoosh(rng: Rng): Float32Array {
  const len = Math.floor(0.32 * SFX_RATE);
  const out = new Float32Array(len);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const f = 400 + 1400 * t * t + 200 * rng.next();
    const c = bandpass(f, 1.2);
    const x = (rng.next() * 2 - 1) * Math.sin(Math.PI * t) ** 2;
    const y = c.b0 * x + z1;
    z1 = c.b1 * x - c.a1 * y + z2;
    z2 = c.b2 * x - c.a2 * y;
    out[i] = y;
  }
  return finish(out, 0.35);
}

function creak(rng: Rng): Float32Array {
  const secs = 0.7 + 0.5 * rng.next();
  const out = new Float32Array(Math.floor(secs * SFX_RATE));
  // Stick-slip: a train of tiny impulses whose rate glides, exciting woody resonances.
  let t = 0;
  const rate0 = 25 + 20 * rng.next();
  const rate1 = rate0 * (1.3 + 0.8 * rng.next());
  while (t < secs) {
    const at = Math.floor(t * SFX_RATE);
    const env = Math.sin((Math.PI * t) / secs);
    if (at < out.length) out[at] = (out[at] ?? 0) + (0.6 + 0.4 * rng.next()) * env;
    const r = rate0 + (rate1 - rate0) * (t / secs);
    t += (1 / r) * (0.85 + 0.3 * rng.next());
  }
  const a = new Float32Array(out);
  const b = new Float32Array(out);
  biquadInPlace(a, bandpass(420 + 120 * rng.next(), 8));
  biquadInPlace(b, bandpass(930 + 200 * rng.next(), 6));
  for (let i = 0; i < out.length; i++) out[i] = (a[i] ?? 0) + 0.6 * (b[i] ?? 0);
  return finish(out, 0.4);
}

function crack(rng: Rng): Float32Array {
  const out = new Float32Array(Math.floor(0.7 * SFX_RATE));
  const snap = burst(Math.floor(0.03 * SFX_RATE), 0.006, rng, 1);
  mixInto(out, snap, 0, 1);
  // Splinters: dense crackle thinning out.
  for (let i = 0; i < 60; i++) {
    const at = Math.floor(rng.next() ** 2 * 0.5 * SFX_RATE);
    const s = burst(Math.floor(0.004 * SFX_RATE), 0.001, rng, 0.5 * (1 - at / (0.5 * SFX_RATE)));
    mixInto(out, s, at, 1);
  }
  mode(out, 0, 180 + 60 * rng.next(), 0.5, 0.08, rng);
  biquadInPlace(out, lowpassCoeffs(5000, 0.7, SFX_RATE));
  return finish(out, 0.85);
}

function fallWhoosh(rng: Rng): Float32Array {
  const secs = 1.8;
  const len = Math.floor(secs * SFX_RATE);
  const out = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const k = Math.exp((-2 * Math.PI * (300 + 1500 * t * t)) / SFX_RATE);
    lp = lp * k + (rng.next() * 2 - 1) * (1 - k);
    out[i] = lp * t ** 2.2 * 3;
  }
  // Branches brushing past as it gains speed.
  for (let i = 0; i < 40; i++) {
    const at = Math.floor((0.5 + 0.5 * rng.next()) ** 0.7 * (len - 2000));
    const s = burst(Math.floor(0.01 * SFX_RATE), 0.003, rng, 0.15);
    biquadInPlace(s, bandpass(2000 + 3000 * rng.next(), 1.5));
    mixInto(out, s, at, 1);
  }
  return finish(out, 0.5);
}

function thud(rng: Rng): Float32Array {
  const out = new Float32Array(Math.floor(1.4 * SFX_RATE));
  // Deep trunk impact with a pitch drop.
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SFX_RATE;
    const f = 42 + 38 * Math.exp(-t / 0.08);
    phase += (2 * Math.PI * f) / SFX_RATE;
    out[i] = Math.sin(phase) * Math.exp(-t / 0.28);
  }
  // Snow "whump": a big low-passed noise burst.
  const whump = burst(Math.floor(0.6 * SFX_RATE), 0.12, rng, 0.9);
  biquadInPlace(whump, lowpassCoeffs(450 + 150 * rng.next(), 0.8, SFX_RATE));
  mixInto(out, whump, 0, 1.3);
  // A bounce a moment later.
  mode(out, Math.floor(0.22 * SFX_RATE), 60, 0.35, 0.12, rng);
  const crackle = burst(Math.floor(0.4 * SFX_RATE), 0.08, rng, 0.2);
  biquadInPlace(crackle, bandpass(2400, 1));
  mixInto(out, crackle, Math.floor(0.01 * SFX_RATE), 1);
  return finish(out, 0.95);
}

function snowSift(rng: Rng): Float32Array {
  const secs = 0.9 + 0.5 * rng.next();
  const out = new Float32Array(Math.floor(secs * SFX_RATE));
  for (let i = 0; i < 220; i++) {
    const at = Math.floor(rng.next() ** 1.4 * (out.length - 400));
    const s = burst(Math.floor(0.003 * SFX_RATE), 0.0008, rng, 0.2 * (1 - at / out.length));
    mixInto(out, s, at, 1);
  }
  biquadInPlace(out, bandpass(3500, 0.7));
  return finish(out, 0.3);
}

// ---- Footsteps and clothing (Plan Parts 6.7–6.8) --------------------------------------------

/** One grain of a crunch: a tiny band-passed click from a fracturing snow crystal. */
export interface Grain {
  /** Seconds from the heel strike. */
  t: number;
  amp: number;
  /** Band centre (Hz) and resonance. */
  hz: number;
  q: number;
  /** Length of the noise excitation (s). */
  len: number;
}

export interface CrunchPlan {
  /** Seconds from the heel strike to toe-off. */
  duration: number;
  grains: Grain[];
}

/** How a surface crunches under a boot: heel strike, roll and toe-off. */
export interface CrunchShape {
  duration: readonly [number, number];
  grains: readonly [number, number];
  /** Shares of the grains in the heel strike and in the roll; the rest are toe-off. */
  heelShare: number;
  rollShare: number;
  heelHz: readonly [number, number];
  rollHz: readonly [number, number];
  toeHz: readonly [number, number];
  q: readonly [number, number];
  /** Loudness skew: higher means mostly faint grains and a few loud cracks. */
  skew: number;
}

/** Fresh powder: a long, lumpy crunch (Plan 6.7: 30–80 clicks over 120–250 ms). */
export const FRESH_CRUNCH: CrunchShape = {
  duration: [0.12, 0.25],
  grains: [30, 80],
  heelShare: 0.45,
  rollShare: 0.4,
  heelHz: [550, 2600],
  rollHz: [900, 4200],
  toeHz: [1100, 4800],
  q: [0.9, 2.6],
  skew: 2.6,
};

/** Packed snow (roads, trodden paths): shorter, duller and more even. */
export const PACKED_CRUNCH: CrunchShape = {
  duration: [0.08, 0.14],
  grains: [22, 42],
  heelShare: 0.6,
  rollShare: 0.3,
  heelHz: [500, 2200],
  rollHz: [800, 3200],
  toeHz: [1000, 3500],
  q: [0.9, 2.8],
  skew: 1.6,
};

/** Snow soaks up the highest frequencies: step sounds roll off above this (Hz); ice keeps more. */
const SNOW_AIR_HZ = 8000;
const ICE_AIR_HZ = 11000;
/** Loudness every step variant is levelled to (RMS of its loudest 50 ms), and its peak cap. */
const STEP_RMS = 0.06;
const STEP_PEAK = 0.9;
/** Grain loudness is scaled by (REF_HZ / centre)^TILT so bright grains don't swamp the body. */
const GRAIN_REF_HZ = 1500;
const GRAIN_TILT = 0.55;

const logRange = ([lo, hi]: readonly [number, number], rng: Rng) => lo * (hi / lo) ** rng.next();

/** Times, pitches and loudness of a step's grains. Pure, so the plan's ranges are testable. */
export function planCrunch(shape: CrunchShape, rng: Rng): CrunchPlan {
  const duration = rng.range(shape.duration[0], shape.duration[1]);
  const count = rng.int(shape.grains[0], shape.grains[1]);
  const grains: Grain[] = [];
  for (let i = 0; i < count; i++) {
    const phase = rng.next();
    let t: number;
    let base: number;
    let band: readonly [number, number];
    if (phase < shape.heelShare) {
      t = duration * 0.32 * rng.next() ** 1.4; // crowded toward the strike
      base = 1;
      band = shape.heelHz;
    } else if (phase < shape.heelShare + shape.rollShare) {
      t = duration * rng.range(0.22, 0.75);
      base = 0.6;
      band = shape.rollHz;
    } else {
      t = duration * rng.range(0.7, 1);
      base = 0.45;
      band = shape.toeHz;
    }
    const hz = logRange(band, rng);
    grains.push({
      t,
      amp: base * (0.12 + 0.88 * rng.next() ** shape.skew) * (GRAIN_REF_HZ / hz) ** GRAIN_TILT,
      hz,
      q: rng.range(shape.q[0], shape.q[1]),
      len: rng.range(0.0006, 0.0024),
    });
  }
  grains.sort((a, b) => a.t - b.t);
  return { duration, grains };
}

/** A short noise excitation through a band-pass, with room to ring out so it never ends on a step. */
function addGrain(out: Float32Array, at: number, amp: number, hz: number, q: number, len: number, rng: Rng) {
  const n = Math.max(4, Math.round(len * SFX_RATE));
  const ring = Math.ceil(((6 * q) / (Math.PI * hz)) * SFX_RATE);
  const g = new Float32Array(n + ring);
  const k = Math.exp(-4 / n);
  let e = amp;
  for (let i = 0; i < n; i++) {
    g[i] = (rng.next() * 2 - 1) * e;
    e *= k;
  }
  biquadInPlace(g, bandpass(hz, q));
  mixInto(out, g, at, 1);
}

/** Low-passed noise thump: the snow compressing under the heel. */
function addBody(out: Float32Array, at: number, amp: number, hz: number, decay: number, rng: Rng) {
  const b = burst(Math.floor(decay * 6 * SFX_RATE), decay, rng, amp);
  biquadInPlace(b, lowpassCoeffs(hz, 0.7, SFX_RATE));
  mixInto(out, b, at, 1);
}

/** Band-passed noise with a soft attack: a sole sliding, a fabric swish. */
function addScrape(
  out: Float32Array,
  at: number,
  secs: number,
  amp: number,
  hz: number,
  q: number,
  rng: Rng,
) {
  const n = Math.floor(secs * SFX_RATE);
  const s = new Float32Array(n + Math.ceil(((6 * q) / (Math.PI * hz)) * SFX_RATE));
  const attack = 0.008 * SFX_RATE;
  for (let i = 0; i < n; i++)
    s[i] = (rng.next() * 2 - 1) * amp * Math.min(1, i / attack) * (1 - i / n) ** 1.5;
  biquadInPlace(s, bandpass(hz, q));
  mixInto(out, s, at, 1);
}

/** Below this (Hz) the ear hears little, so levelling ignores it (a heel's thump can't hide a quiet crunch). */
const LEVEL_HIGHPASS_HZ = 150;

/** Level by the loudest 50 ms rather than the peak, so a grainy variant never jumps out. */
function finishLevel(out: Float32Array, targetRms: number, peakCap: number): Float32Array {
  removeDc(out, SFX_RATE);
  applyFades(out, 8, Math.floor(0.01 * SFX_RATE));
  const w = Math.floor(0.05 * SFX_RATE);
  const heard = new Float32Array(out);
  const r = 1 - (2 * Math.PI * LEVEL_HIGHPASS_HZ) / SFX_RATE;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < heard.length; i++) {
    const x = heard[i] ?? 0;
    y1 = x - x1 + r * y1;
    x1 = x;
    heard[i] = y1;
  }
  let sum = 0;
  let loudest = 0;
  for (let i = 0; i < heard.length; i++) {
    const v = heard[i] ?? 0;
    sum += v * v;
    if (i >= w) {
      const o = heard[i - w] ?? 0;
      sum -= o * o;
    }
    loudest = Math.max(loudest, sum);
  }
  const rms = Math.sqrt(loudest / w);
  if (rms > 0) for (let i = 0; i < out.length; i++) out[i] = ((out[i] ?? 0) * targetRms) / rms;
  let p = 0;
  for (let i = 0; i < out.length; i++) p = Math.max(p, Math.abs(out[i] ?? 0));
  if (p > peakCap) normalizePeak(out, peakCap);
  return out;
}

/** Seconds to a sample index. */
const samples = (seconds: number) => Math.round(seconds * SFX_RATE);

/** A boot in fresh powder: a "whumpf", then a lumpy crackle rolling from heel to toe. */
function stepSnow(rng: Rng): Float32Array {
  const plan = planCrunch(FRESH_CRUNCH, rng);
  const out = new Float32Array(samples(plan.duration + 0.08));
  addBody(out, 0, 0.6, rng.range(220, 360), 0.03, rng);
  for (const g of plan.grains) addGrain(out, samples(g.t), g.amp, g.hz, g.q, g.len, rng);
  // The finest crystals hiss faintly under the roll.
  addScrape(out, samples(0.01), plan.duration * 0.9, 0.03, rng.range(2800, 3800), 0.9, rng);
  biquadInPlace(out, lowpassCoeffs(SNOW_AIR_HZ, 0.7, SFX_RATE));
  return finishLevel(out, STEP_RMS, STEP_PEAK);
}

/** Packed snow: a firm heel, a compact crump, and a scuff at toe-off. */
function stepPacked(rng: Rng): Float32Array {
  const plan = planCrunch(PACKED_CRUNCH, rng);
  const out = new Float32Array(samples(plan.duration + 0.09));
  mode(out, 0, rng.range(95, 135), 0.12, 0.02, rng);
  addBody(out, 0, 0.3, rng.range(320, 480), 0.018, rng);
  for (const g of plan.grains) addGrain(out, samples(g.t), g.amp, g.hz, g.q, g.len, rng);
  addScrape(
    out,
    samples(plan.duration * rng.range(0.75, 0.9)),
    rng.range(0.02, 0.04),
    0.1,
    rng.range(1500, 3000),
    1.3,
    rng,
  );
  biquadInPlace(out, lowpassCoeffs(SNOW_AIR_HZ, 0.7, SFX_RATE));
  return finishLevel(out, STEP_RMS, STEP_PEAK);
}

/** A hard heel on ice: a bright glassy click. */
function iceClick(out: Float32Array, start: number, level: number, rng: Rng): void {
  addGrain(out, start, level, rng.range(3000, 6000), 0.9, rng.range(0.0003, 0.0006), rng);
  mode(out, start, rng.range(2400, 3400), 0.22 * level, rng.range(0.006, 0.014), rng);
  mode(out, start, rng.range(4200, 5600), 0.12 * level, rng.range(0.004, 0.009), rng);
}

/** Ice: heel click and tock, a short slide with frost grit, a softer toe click. */
function stepIce(rng: Rng): Float32Array {
  const out = new Float32Array(samples(0.34));
  iceClick(out, 0, 1, rng);
  mode(out, 0, rng.range(170, 320), 0.12, 0.016, rng);
  const slideAt = rng.range(0.015, 0.035);
  const slideLen = rng.range(0.04, 0.11);
  addScrape(out, samples(slideAt), slideLen, rng.range(0.1, 0.2), rng.range(2500, 4500), 1.2, rng);
  const grit = rng.int(5, 14);
  for (let i = 0; i < grit; i++) {
    const t = slideAt + slideLen * rng.next();
    addGrain(out, samples(t), rng.range(0.03, 0.12), rng.range(2000, 7000), 1.5, 0.0008, rng);
  }
  iceClick(out, samples(rng.range(0.09, 0.15)), rng.range(0.3, 0.5), rng);
  biquadInPlace(out, lowpassCoeffs(ICE_AIR_HZ, 0.7, SFX_RATE));
  return finishLevel(out, STEP_RMS, STEP_PEAK);
}

/** Cold squeak (≤ −15 °C): stick-slip chirps, a pulse train through narrow resonances. */
function stepSqueak(rng: Rng): Float32Array {
  const out = new Float32Array(samples(0.34));
  const chirps = rng.int(2, 3);
  let t = rng.range(0.02, 0.06);
  for (let c = 0; c < chirps && t < 0.26; c++) {
    const len = Math.min(rng.range(0.04, 0.1), 0.3 - t);
    const r0 = rng.range(450, 800);
    const r1 = r0 * rng.range(0.8, 1.35);
    const train = new Float32Array(samples(len + 0.02));
    for (let tt = 0; tt < len; ) {
      const i = samples(tt);
      train[i] = (train[i] ?? 0) + (0.7 + 0.3 * rng.next()) * Math.sin((Math.PI * tt) / len) ** 1.5;
      tt += (1 / (r0 + (r1 - r0) * (tt / len))) * (0.96 + 0.08 * rng.next());
    }
    const a = new Float32Array(train);
    const b = new Float32Array(train);
    const f = rng.range(1600, 2600);
    biquadInPlace(a, bandpass(f, 4));
    biquadInPlace(b, bandpass(f * 1.9, 5));
    for (let i = 0; i < train.length; i++) train[i] = (a[i] ?? 0) + 0.35 * (b[i] ?? 0);
    mixInto(out, train, samples(t), 1 - c * 0.25);
    t += len + rng.range(0.005, 0.03);
  }
  // Only the resonances should sing, not the pulse train's upper harmonics.
  biquadInPlace(out, lowpassCoeffs(3800, 0.7, SFX_RATE));
  biquadInPlace(out, lowpassCoeffs(3800, 0.7, SFX_RATE));
  return finishLevel(out, STEP_RMS, STEP_PEAK);
}

/** Clothing rustle: a soft swish whose colour drifts, with a slow crinkle in its level. */
function rustle(rng: Rng): Float32Array {
  const secs = rng.range(0.18, 0.3);
  const n = samples(secs);
  const out = new Float32Array(n + samples(0.02));
  const f0 = rng.range(1100, 1900);
  const f1 = f0 * rng.range(0.7, 1.5);
  const attack = rng.range(0.03, 0.05) * SFX_RATE;
  const crinkleStep = samples(0.01);
  let crinkle = 1;
  let crinkleTarget = 1;
  let c = bandpass(f0, 0.9);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < n; i++) {
    if (i % 64 === 0) c = bandpass(f0 + ((f1 - f0) * i) / n, 0.9);
    if (i % crinkleStep === 0) crinkleTarget = 0.55 + 0.45 * rng.next();
    crinkle += (crinkleTarget - crinkle) * 0.004;
    const x = (rng.next() * 2 - 1) * Math.min(1, i / attack) * (1 - i / n) ** 1.3 * crinkle;
    const y = c.b0 * x + z1;
    z1 = c.b1 * x - c.a1 * y + z2;
    z2 = c.b2 * x - c.a2 * y;
    out[i] = y;
  }
  // A darker swish of the coat's body underneath.
  const swish = new Float32Array(n);
  for (let i = 0; i < n; i++) swish[i] = (rng.next() * 2 - 1) * Math.sin((Math.PI * i) / n) ** 2 * 0.6;
  biquadInPlace(swish, lowpassCoeffs(rng.range(700, 1100), 0.7, SFX_RATE));
  biquadInPlace(out, lowpassCoeffs(5000, 0.7, SFX_RATE));
  mixInto(out, swish, 0, 1);
  return finishLevel(out, STEP_RMS, STEP_PEAK);
}

export function renderSfx(id: SfxId, variant: number): Float32Array {
  const rng = new Rng(hashString(`${id}:${variant}`));
  switch (id) {
    case 'chopSmall':
      return chop(0.75, rng);
    case 'chopMedium':
      return chop(1, rng);
    case 'chopLarge':
      return chop(1.35, rng);
    case 'miss':
      return miss(rng);
    case 'whoosh':
      return whoosh(rng);
    case 'creak':
      return creak(rng);
    case 'crack':
      return crack(rng);
    case 'fallWhoosh':
      return fallWhoosh(rng);
    case 'thud':
      return thud(rng);
    case 'snowSift':
      return snowSift(rng);
    case 'stepSnow':
      return stepSnow(rng);
    case 'stepPacked':
      return stepPacked(rng);
    case 'stepIce':
      return stepIce(rng);
    case 'stepSqueak':
      return stepSqueak(rng);
    case 'rustle':
      return rustle(rng);
  }
}
