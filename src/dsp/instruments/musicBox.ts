// Music box: a plucked steel tine modelled as a few inharmonic modes with fast-decaying highs and
// a tiny pluck click. Bright, delicate, used for sparkle and night variants.

import type { Rng } from '../../core/rng.ts';
import type { MusicBoxParams } from '../../data/music/instruments.ts';
import { applyFades, midiToHz, removeDc } from '../util.ts';

export function renderMusicBoxNote(p: MusicBoxParams, midi: number, rng: Rng): Float32Array {
  const sr = p.sampleRate;
  const f0 = midiToHz(midi);
  const length = Math.floor(p.seconds * sr);
  const out = new Float32Array(length);

  for (const part of p.partials) {
    const f = f0 * part.ratio * (1 + (rng.next() - 0.5) * 0.002);
    if (f >= sr * 0.45) continue;
    const w = (2 * Math.PI * f) / sr;
    const c2 = 2 * Math.cos(w);
    let y1 = 0;
    let y2 = Math.sin(-w);
    // Higher notes ring shorter.
    const tau = part.decay * (midiToHz(72) / f0) ** 0.35;
    const k = Math.exp(-1 / (tau * sr));
    let e = part.level;
    for (let i = 0; i < length; i++) {
      const y = c2 * y1 - y2;
      y2 = y1;
      y1 = y;
      out[i] = (out[i] ?? 0) + y * e;
      e *= k;
      if (e < 1e-6) break;
    }
  }

  const clickLen = Math.floor(0.004 * sr);
  for (let i = 0; i < clickLen; i++) {
    out[i] = (out[i] ?? 0) + (rng.next() * 2 - 1) * p.clickLevel * (1 - i / clickLen);
  }

  removeDc(out, sr);
  applyFades(out, Math.floor(0.0015 * sr), Math.floor(0.05 * sr));
  return out;
}
