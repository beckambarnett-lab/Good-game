// Felt piano: additive modal synthesis of a stiff, felt-damped string pair.
// Each partial is a slightly inharmonic sine with a two-stage (prompt + aftersound) decay;
// two detuned "unison strings" per partial give the slow beating of a real piano, a felt
// hammer darkens the spectrum, and a soft key/felt thump sits under the attack.

import type { Rng } from '../../core/rng.ts';
import type { FeltPianoParams } from '../../data/music/instruments.ts';
import { applyFades, biquadInPlace, lowpassCoeffs, midiToHz, peakingCoeffs, removeDc } from '../util.ts';

export function renderFeltPianoNote(
  p: FeltPianoParams,
  midi: number,
  velocity: number,
  rng: Rng,
): Float32Array {
  const sr = p.sampleRate;
  const f0 = midiToHz(midi);
  const v = Math.min(1, Math.max(0, velocity));

  const decaySlow = p.decayAt36 * (f0 / midiToHz(36)) ** -p.decayPitchExponent;
  const seconds = Math.min(p.maxSeconds, Math.max(p.minSeconds, decaySlow * 3.2));
  const length = Math.floor(seconds * sr);
  const out = new Float32Array(length);

  const inharm = p.inharmonicityAt48 * 2 ** ((midi - 48) / (12 * p.inharmonicityOctaves));
  const slope = p.slopeSoft + (p.slopeHard - p.slopeSoft) * v;
  const corner = p.feltCornerSoft + (p.feltCornerHard - p.feltCornerSoft) * v * v;
  const nyquistGuard = sr * 0.45;

  for (let n = 1; n <= p.maxPartials; n++) {
    const fn = n * f0 * Math.sqrt(1 + inharm * n * n);
    if (fn >= nyquistGuard) break;
    // Spectral envelope: slope, felt low-pass, strike-position comb.
    let amp = 1 / n ** slope;
    amp /= 1 + (fn / corner) ** 2;
    amp *= 0.25 + 0.75 * Math.abs(Math.sin(Math.PI * n * p.strikePosition));
    if (amp < 1e-4) continue;
    // Higher partials die faster; the prompt/aftersound split gives the "bloom then hang" shape.
    const tauSlow = decaySlow / (1 + (n - 1) * 0.18 + fn / 2500);
    const tauFast = tauSlow * p.promptRatio;
    const kSlow = Math.exp(-1 / (tauSlow * sr));
    const kFast = Math.exp(-1 / (tauFast * sr));

    for (let s = 0; s < 2; s++) {
      const cents = (s === 0 ? -1 : 1) * p.unisonDetuneCents * (0.6 + 0.8 * rng.next()) * (n === 1 ? 1 : 0.7);
      const f = fn * 2 ** (cents / 1200);
      const w = (2 * Math.PI * f) / sr;
      // Recursive sine oscillator: y[k] = 2cos(w) y[k-1] - y[k-2].
      const phase = rng.next() * 2 * Math.PI;
      const c2 = 2 * Math.cos(w);
      let y1 = Math.sin(phase - w);
      let y2 = Math.sin(phase - 2 * w);
      let eSlow = (1 - p.promptShare) * amp * 0.5;
      let eFast = p.promptShare * amp * 0.5;
      for (let i = 0; i < length; i++) {
        const y = c2 * y1 - y2;
        y2 = y1;
        y1 = y;
        out[i] = (out[i] ?? 0) + y * (eSlow + eFast);
        eSlow *= kSlow;
        eFast *= kFast;
        if (eSlow + eFast < 1e-6) break;
      }
    }
  }

  // Felt/key thump: a short low-passed noise burst plus a low "thud" around 80–110 Hz.
  const thumpLen = Math.floor(0.05 * sr);
  const thump = new Float32Array(thumpLen);
  const thudHz = 80 + 30 * rng.next();
  for (let i = 0; i < thumpLen; i++) {
    const t = i / sr;
    const env = Math.exp(-t / 0.012);
    thump[i] = (rng.next() * 2 - 1) * env + Math.sin(2 * Math.PI * thudHz * t) * Math.exp(-t / 0.02) * 1.5;
  }
  biquadInPlace(thump, lowpassCoeffs(900 + 1500 * v, 0.7, sr));
  const thumpGain = p.thumpLevel * (0.5 + 0.8 * v);
  for (let i = 0; i < thumpLen; i++) out[i] = (out[i] ?? 0) + (thump[i] ?? 0) * thumpGain;

  // Soundboard body colour: a little low warmth, a gentle presence dip (felt).
  biquadInPlace(out, peakingCoeffs(140, 0.9, 2.0, sr));
  biquadInPlace(out, peakingCoeffs(420, 1.2, 1.2, sr));
  biquadInPlace(out, peakingCoeffs(2300, 1.0, -2.5, sr));

  removeDc(out, sr);
  const attackMs = p.attackSoftMs + (p.attackHardMs - p.attackSoftMs) * v;
  applyFades(out, Math.floor((attackMs / 1000) * sr), Math.floor(0.08 * sr));
  return out;
}
