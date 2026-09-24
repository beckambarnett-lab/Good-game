// Audio metrics used by the QA tools: I can't hear the game, so every render is measured.

import { gainToDb } from './util.ts';

export interface AudioMetrics {
  seconds: number;
  peakDb: number;
  rmsDb: number;
  /** Approximate loudness: RMS of a K-weighting-like pre-filtered signal (not full BS.1770 gating). */
  loudnessDb: number;
  dcOffset: number;
  /** Sample-to-sample jumps far larger than the local signal slope (likely clicks). */
  clicks: number;
  clipped: number;
}

export function analyze(channels: Float32Array[], sampleRate: number): AudioMetrics {
  const first = channels[0];
  const len = first ? first.length : 0;
  let peak = 0;
  let sumSq = 0;
  let sum = 0;
  let clicks = 0;
  let clipped = 0;
  let weightedSq = 0;
  for (const ch of channels) {
    // Pre-filter: first-order high-pass ~100 Hz + slight high shelf approximation (+3 dB above ~2 kHz).
    let hpX = 0;
    let hpY = 0;
    const r = 1 - (2 * Math.PI * 100) / sampleRate;
    let hs = 0;
    const hsK = Math.exp((-2 * Math.PI * 2000) / sampleRate);
    // Running mean of |delta| over ~64 samples: a click is a jump far above recent activity.
    let meanAbsDelta = 0;
    for (let i = 0; i < ch.length; i++) {
      const x = ch[i] ?? 0;
      const a = Math.abs(x);
      if (a > peak) peak = a;
      if (a >= 0.999) clipped++;
      sumSq += x * x;
      sum += x;
      const y = x - hpX + r * hpY;
      hpX = x;
      hpY = y;
      hs = hs * hsK + y * (1 - hsK);
      const w = y + (y - hs) * 0.41;
      weightedSq += w * w;
      if (i > 0) {
        const d = Math.abs(x - (ch[i - 1] ?? 0));
        // Skip the first 20 ms: a note's own attack is a legitimate transient.
        if (i > sampleRate * 0.02 && d > 0.05 && d > 8 * meanAbsDelta + 0.02) clicks++;
        meanAbsDelta += (d - meanAbsDelta) / 64;
      }
    }
  }
  const n = Math.max(1, len * channels.length);
  return {
    seconds: len / sampleRate,
    peakDb: gainToDb(peak),
    rmsDb: gainToDb(Math.sqrt(sumSq / n)),
    loudnessDb: gainToDb(Math.sqrt(weightedSq / n)),
    dcOffset: sum / n,
    clicks,
    clipped,
  };
}
