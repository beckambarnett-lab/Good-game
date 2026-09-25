// 2D simplex noise (seeded permutation) and fractal sum. Deterministic; used by terrain,
// scatter and wind.

import { Rng } from '../rng.ts';

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export class Noise2D {
  private readonly perm = new Uint8Array(512);

  constructor(seed: number) {
    const rng = new Rng(seed);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = rng.int(0, i);
      [p[i], p[j]] = [p[j] as number, p[i] as number];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255] as number;
  }

  /** Simplex noise in [-1, 1]. */
  get(x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const corner = (gx: number, gy: number, h: number) => {
      const t0 = 0.5 - gx * gx - gy * gy;
      if (t0 < 0) return 0;
      const g = GRAD[h % 8] as number[];
      return t0 ** 4 * ((g[0] as number) * gx + (g[1] as number) * gy);
    };
    const n0 = corner(x0, y0, this.perm[ii + (this.perm[jj] as number)] as number);
    const n1 = corner(x1, y1, this.perm[ii + i1 + (this.perm[jj + j1] as number)] as number);
    const n2 = corner(x2, y2, this.perm[ii + 1 + (this.perm[jj + 1] as number)] as number);
    return 70 * (n0 + n1 + n2);
  }

  /** Fractal Brownian motion: `octaves` layers, each at double frequency and `gain` amplitude. */
  fbm(x: number, y: number, octaves = 4, gain = 0.5): number {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += this.get(x * freq, y * freq) * amp;
      norm += amp;
      amp *= gain;
      freq *= 2;
    }
    return sum / norm;
  }
}
