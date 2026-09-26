// Procedural reverb impulse responses: decorrelated stereo noise with exponential decay that
// darkens over time (high frequencies die first), a short pre-delay and sparse early echoes.

import { Rng } from '../core/rng.ts';

export interface IrSpec {
  seconds: number;
  /** Time for the tail to fall 60 dB. */
  rt60: number;
  predelay: number;
  /** One-pole low-pass corner at the start and end of the tail (Hz): the tail darkens. */
  brightStart: number;
  brightEnd: number;
  /** Discrete early reflections (seconds, gain), e.g. a valley answering from the ridge. */
  echoes: readonly { t: number; gain: number }[];
  seed: number;
}

export const musicHall: IrSpec = {
  seconds: 3.6,
  rt60: 3.2,
  predelay: 0.018,
  brightStart: 7000,
  brightEnd: 1400,
  echoes: [
    { t: 0.021, gain: 0.35 },
    { t: 0.034, gain: 0.25 },
    { t: 0.049, gain: 0.18 },
  ],
  seed: 3,
};

export function generateIr(spec: IrSpec, sampleRate: number): [Float32Array, Float32Array] {
  const len = Math.floor(spec.seconds * sampleRate);
  const chans: [Float32Array, Float32Array] = [new Float32Array(len), new Float32Array(len)];
  const pre = Math.floor(spec.predelay * sampleRate);
  const decayPerSample = Math.log(1000) / (spec.rt60 * sampleRate);
  chans.forEach((ch, c) => {
    const rng = new Rng(spec.seed * 2 + c);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / len;
      const corner = spec.brightStart * (spec.brightEnd / spec.brightStart) ** t;
      const k = Math.exp((-2 * Math.PI * corner) / sampleRate);
      lp = lp * k + (rng.next() * 2 - 1) * (1 - k);
      const env = Math.exp(-(i - pre) * decayPerSample);
      // Fade in over 8 ms so the tail builds smoothly after the early echoes.
      const build = Math.min(1, (i - pre) / (0.008 * sampleRate));
      ch[i] = lp * env * build * 2.2;
    }
    for (const e of spec.echoes) {
      const at = Math.floor((e.t + (c === 1 ? 0.0013 : 0)) * sampleRate);
      if (at < len) ch[at] = (ch[at] ?? 0) + e.gain * (c === 0 ? 1 : 0.85);
    }
    // Gentle fade-out at the very end avoids a truncation click.
    const tail = Math.floor(0.2 * sampleRate);
    for (let i = 0; i < tail; i++) {
      const idx = len - 1 - i;
      ch[idx] = (ch[idx] ?? 0) * (i / tail);
    }
  });
  return chans;
}
