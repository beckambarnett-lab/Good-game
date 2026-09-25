// Seeded PRNG (sfc32) with named forks. All randomness in sim/music/dsp goes through this so
// every run is reproducible from the save seed.

/** 32-bit FNV-1a hash of a string; used to derive fork seeds from labels. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    // splitmix32 expands one seed into four state words.
    let s = seed >>> 0;
    const next = (): number => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.a = next();
    this.b = next();
    this.c = next();
    this.d = next();
    for (let i = 0; i < 12; i++) this.nextU32();
  }

  /** Uniform unsigned 32-bit integer. */
  nextU32(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.c = (this.c + t) >>> 0;
    return t;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick on empty array');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Pick an index with probability proportional to its weight. */
  weightedIndex(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i] ?? 0;
      if (r < 0) return i;
    }
    return weights.length - 1;
  }

  /** Approximately normal (Irwin–Hall, 4 samples), mean 0, stddev ~1. */
  gaussian(): number {
    return (this.next() + this.next() + this.next() + this.next() - 2) * Math.sqrt(3);
  }

  /** The generator's four state words (as unsigned integers), for saving mid-sequence. */
  getState(): [number, number, number, number] {
    // `^` leaves some words signed; every use is mod 2^32, so the unsigned form is equivalent.
    return [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0];
  }

  /** Restores a state from `getState()`, so the sequence continues exactly where it was saved. */
  setState(state: readonly number[]): void {
    if (state.length !== 4 || state.some((w) => !Number.isInteger(w) || w < 0 || w > 0xffffffff)) {
      throw new Error('Rng.setState: expected four unsigned 32-bit words');
    }
    [this.a, this.b, this.c, this.d] = state as [number, number, number, number];
  }

  /**
   * Independent child stream derived from this stream's state and a label, so adding a new
   * consumer never shifts another system's random sequence.
   */
  fork(label: string): Rng {
    return new Rng((this.a ^ Math.imul(hashString(label), 0x9e3779b1)) >>> 0);
  }
}
