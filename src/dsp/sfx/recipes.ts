// Sound-effect recipes for felling. Each renders one variant from a seed; variants differ in
// resonance, timing and colour so repeated chops never sound identical.

import { Rng } from '../../core/rng.ts';
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
  | 'snowSift';

/** Recipes built from deliberate micro-impulses (crackle, stick-slip); click QA doesn't apply. */
export const IMPULSIVE_SFX: ReadonlySet<SfxId> = new Set(['creak', 'crack', 'snowSift']);

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
};

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

export function renderSfx(id: SfxId, variant: number): Float32Array {
  const rng = new Rng(9000 + variant * 131 + id.length * 7919 + id.charCodeAt(0));
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
  }
}
