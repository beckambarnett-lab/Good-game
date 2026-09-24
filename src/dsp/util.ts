// Small DSP helpers shared by recipes. Pure functions over Float32Arrays.

export const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export const dbToGain = (db: number): number => 10 ** (db / 20);

export const gainToDb = (g: number): number => (g <= 0 ? -Infinity : 20 * Math.log10(g));

/** Raised-cosine fade in over `n` samples and out over `m` samples, in place. */
export function applyFades(buf: Float32Array, fadeIn: number, fadeOut: number): void {
  const n = Math.min(fadeIn, buf.length);
  for (let i = 0; i < n; i++) buf[i] = (buf[i] ?? 0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / n));
  const m = Math.min(fadeOut, buf.length);
  for (let i = 0; i < m; i++) {
    const idx = buf.length - 1 - i;
    buf[idx] = (buf[idx] ?? 0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / m));
  }
}

export function peak(buf: Float32Array): number {
  let p = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = Math.abs(buf[i] ?? 0);
    if (v > p) p = v;
  }
  return p;
}

/** Scale in place so the absolute peak equals `target`. */
export function normalizePeak(buf: Float32Array, target: number): void {
  const p = peak(buf);
  if (p <= 0) return;
  const k = target / p;
  for (let i = 0; i < buf.length; i++) buf[i] = (buf[i] ?? 0) * k;
}

/** Remove DC with a one-pole high-pass (~5 Hz), in place. */
export function removeDc(buf: Float32Array, sampleRate: number): void {
  const r = 1 - (2 * Math.PI * 5) / sampleRate;
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i] ?? 0;
    const y = x - x1 + r * y1;
    x1 = x;
    y1 = y;
    buf[i] = y;
  }
}

/** RBJ biquad peaking EQ coefficients (normalized). */
export function peakingCoeffs(f0: number, q: number, gainDb: number, sampleRate: number) {
  const a = 10 ** (gainDb / 40);
  const w = (2 * Math.PI * f0) / sampleRate;
  const alpha = Math.sin(w) / (2 * q);
  const cos = Math.cos(w);
  const a0 = 1 + alpha / a;
  return {
    b0: (1 + alpha * a) / a0,
    b1: (-2 * cos) / a0,
    b2: (1 - alpha * a) / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha / a) / a0,
  };
}

/** RBJ biquad low-pass coefficients (normalized). */
export function lowpassCoeffs(f0: number, q: number, sampleRate: number) {
  const w = (2 * Math.PI * Math.min(f0, sampleRate * 0.45)) / sampleRate;
  const alpha = Math.sin(w) / (2 * q);
  const cos = Math.cos(w);
  const a0 = 1 + alpha;
  return {
    b0: (1 - cos) / 2 / a0,
    b1: (1 - cos) / a0,
    b2: (1 - cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

/**
 * High shelf with slope 1, exactly as Web Audio's BiquadFilterNode 'highshelf' computes it, so
 * a brightness measured here in Node is what the browser plays.
 */
export function highShelfCoeffs(f0: number, gainDb: number, sampleRate: number) {
  const a = 10 ** (gainDb / 40);
  const w = (2 * Math.PI * f0) / sampleRate;
  const cos = Math.cos(w);
  const alpha = (Math.sin(w) / 2) * Math.SQRT2;
  const k = 2 * Math.sqrt(a) * alpha;
  const a0 = a + 1 - (a - 1) * cos + k;
  return {
    b0: (a * (a + 1 + (a - 1) * cos + k)) / a0,
    b1: (-2 * a * (a - 1 + (a + 1) * cos)) / a0,
    b2: (a * (a + 1 + (a - 1) * cos - k)) / a0,
    a1: (2 * (a - 1 - (a + 1) * cos)) / a0,
    a2: (a + 1 - (a - 1) * cos - k) / a0,
  };
}

export type Biquad = ReturnType<typeof peakingCoeffs>;

/** Run a biquad over the buffer in place (transposed direct form II). */
export function biquadInPlace(buf: Float32Array, c: Biquad): void {
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i] ?? 0;
    const y = c.b0 * x + z1;
    z1 = c.b1 * x - c.a1 * y + z2;
    z2 = c.b2 * x - c.a2 * y;
    buf[i] = y;
  }
}
