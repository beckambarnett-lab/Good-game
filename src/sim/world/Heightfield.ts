// A square heightfield over the world with bilinear sampling. World (x, z) in metres, centred on
// the origin. Pure data: used by movement, placement, snow and rendering alike.

export class Heightfield {
  readonly size: number;
  readonly cellSize: number;
  /** Samples per edge (size / cellSize + 1). */
  readonly n: number;
  readonly heights: Float32Array;

  constructor(size: number, cellSize: number, heights?: Float32Array) {
    this.size = size;
    this.cellSize = cellSize;
    this.n = Math.round(size / cellSize) + 1;
    this.heights = heights ?? new Float32Array(this.n * this.n);
    if (this.heights.length !== this.n * this.n) throw new Error('Heightfield: wrong sample count');
  }

  /** World coordinate of sample column/row i. */
  coord(i: number): number {
    return i * this.cellSize - this.size / 2;
  }

  at(i: number, j: number): number {
    const ci = Math.min(this.n - 1, Math.max(0, i));
    const cj = Math.min(this.n - 1, Math.max(0, j));
    return this.heights[cj * this.n + ci] as number;
  }

  /** Bilinear height at world (x, z); clamps at the edges. */
  sample(x: number, z: number): number {
    const fx = (x + this.size / 2) / this.cellSize;
    const fz = (z + this.size / 2) / this.cellSize;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const h00 = this.at(i, j);
    const h10 = this.at(i + 1, j);
    const h01 = this.at(i, j + 1);
    const h11 = this.at(i + 1, j + 1);
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  /** Unit surface normal at world (x, z) from central differences. */
  normal(x: number, z: number, out: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 }) {
    const e = this.cellSize;
    const dx = this.sample(x + e, z) - this.sample(x - e, z);
    const dz = this.sample(x, z + e) - this.sample(x, z - e);
    const nx = -dx;
    const ny = 2 * e;
    const nz = -dz;
    const len = Math.hypot(nx, ny, nz);
    out.x = nx / len;
    out.y = ny / len;
    out.z = nz / len;
    return out;
  }

  /** Slope angle in degrees at world (x, z). */
  slopeDegrees(x: number, z: number): number {
    return (Math.acos(Math.min(1, this.normal(x, z).y)) * 180) / Math.PI;
  }
}
