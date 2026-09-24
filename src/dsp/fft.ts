// In-place iterative radix-2 FFT (real input via re/im arrays). Used for spectrograms and analysis.

export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] as number;
      re[i] = re[j] as number;
      re[j] = tr;
      const ti = im[i] as number;
      im[i] = im[j] as number;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = (re[b] as number) * cr - (im[b] as number) * ci;
        const xi = (re[b] as number) * ci + (im[b] as number) * cr;
        re[b] = (re[a] as number) - xr;
        im[b] = (im[a] as number) - xi;
        re[a] = (re[a] as number) + xr;
        im[a] = (im[a] as number) + xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/**
 * Log-frequency spectrogram as a grayscale-ish RGB image (width = time columns, height = bins).
 * Returns RGB bytes, top row = highest frequency.
 */
export function spectrogram(
  signal: Float32Array,
  sampleRate: number,
  width: number,
  height: number,
): { width: number; height: number; rgb: Uint8Array } {
  const n = 2048;
  const rgb = new Uint8Array(width * height * 3);
  const hop = Math.max(1, Math.floor((signal.length - n) / width));
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const fMin = 40;
  const fMax = Math.min(16000, sampleRate / 2);
  for (let x = 0; x < width; x++) {
    const off = x * hop;
    for (let i = 0; i < n; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      re[i] = (signal[off + i] ?? 0) * w;
      im[i] = 0;
    }
    fft(re, im);
    for (let y = 0; y < height; y++) {
      const frac = 1 - y / (height - 1);
      const f = fMin * (fMax / fMin) ** frac;
      const bin = Math.min(n / 2 - 1, Math.round((f / sampleRate) * n));
      const mag = Math.hypot(re[bin] as number, im[bin] as number) / (n / 4);
      const db = 20 * Math.log10(mag + 1e-9);
      const v = Math.max(0, Math.min(1, (db + 90) / 90));
      const idx = (y * width + x) * 3;
      // Dark blue → amber → white ramp (easy to read quickly).
      rgb[idx] = Math.round(255 * Math.min(1, v * 1.6));
      rgb[idx + 1] = Math.round(255 * Math.max(0, v * 1.4 - 0.3));
      rgb[idx + 2] = Math.round(255 * Math.max(0.15 * (1 - v), v * 2 - 1));
    }
  }
  return { width, height, rgb };
}
