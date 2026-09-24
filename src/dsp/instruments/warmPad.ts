// Warm pad: several detuned band-limited "saw" voices with a warm spectral roll-off, read from a
// single-cycle wavetable, each voice drifting slowly in level so the pad breathes. The sample is
// a steady tone; attack and release envelopes are applied at playback so notes can be any length.

import type { Rng } from '../../core/rng.ts';
import type { WarmPadParams } from '../../data/music/instruments.ts';
import { applyFades, midiToHz, removeDc } from '../util.ts';

const TABLE_SIZE = 4096;

function buildTable(f0: number, p: WarmPadParams): Float32Array {
  const table = new Float32Array(TABLE_SIZE);
  const maxH = Math.max(1, Math.floor(Math.min(p.maxHarmonicHz, p.sampleRate * 0.45) / f0));
  for (let h = 1; h <= maxH; h++) {
    const fh = h * f0;
    const amp = (1 / h) * (1 / (1 + (fh / p.corner) ** 2));
    if (amp < 1e-4) break;
    for (let i = 0; i < TABLE_SIZE; i++)
      table[i] = (table[i] ?? 0) + amp * Math.sin((2 * Math.PI * h * i) / TABLE_SIZE);
  }
  return table;
}

export function renderWarmPadNote(p: WarmPadParams, midi: number, rng: Rng): Float32Array {
  const sr = p.sampleRate;
  const f0 = midiToHz(midi);
  const length = Math.floor(p.seconds * sr);
  const out = new Float32Array(length);
  const table = buildTable(f0, p);

  for (let v = 0; v < p.voices; v++) {
    const spread = p.voices === 1 ? 0 : (v / (p.voices - 1)) * 2 - 1;
    const cents = spread * p.detuneCents + (rng.next() - 0.5) * 1.5;
    const inc = (f0 * 2 ** (cents / 1200) * TABLE_SIZE) / sr;
    let pos = rng.next() * TABLE_SIZE;
    const driftPhase = rng.next() * 2 * Math.PI;
    const driftRate = p.driftRateHz * (0.7 + 0.6 * rng.next());
    const driftW = (2 * Math.PI * driftRate) / sr;
    for (let i = 0; i < length; i++) {
      const i0 = Math.floor(pos);
      const frac = pos - i0;
      const a = table[i0 & (TABLE_SIZE - 1)] ?? 0;
      const b = table[(i0 + 1) & (TABLE_SIZE - 1)] ?? 0;
      const level = 1 + p.driftDepth * Math.sin(driftPhase + driftW * i);
      out[i] = (out[i] ?? 0) + (a + (b - a) * frac) * level;
      pos += inc;
      if (pos >= TABLE_SIZE) pos -= TABLE_SIZE;
    }
  }

  // A breath of air: very soft band-limited noise follows the tone.
  let lp = 0;
  const lpK = Math.exp((-2 * Math.PI * 2500) / sr);
  for (let i = 0; i < length; i++) {
    lp = lp * lpK + (rng.next() * 2 - 1) * (1 - lpK);
    out[i] = (out[i] ?? 0) + lp * p.airLevel * p.voices;
  }

  removeDc(out, sr);
  applyFades(out, Math.floor(0.02 * sr), Math.floor(0.3 * sr));
  return out;
}
