import { describe, expect, it } from 'vitest';
import { hashString, Rng } from '../../src/core/rng.ts';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('differs across seeds', () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it('stays in range and is roughly uniform', () => {
    const r = new Rng(7);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 100_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      buckets[Math.floor(v * 10)]++;
    }
    for (const b of buckets) expect(Math.abs(b - 10_000)).toBeLessThan(500);
  });

  it('int is inclusive', () => {
    const r = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(r.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('forks are stable and independent of later consumers', () => {
    const f1 = new Rng(99).fork('weather').next();
    const root = new Rng(99);
    root.fork('music');
    expect(root.fork('weather').next()).toBe(f1);
    expect(new Rng(99).fork('music').next()).not.toBe(f1);
  });

  it('weightedIndex respects zero weights', () => {
    const r = new Rng(5);
    for (let i = 0; i < 200; i++) expect(r.weightedIndex([0, 1, 0])).toBe(1);
  });

  it('a restored state continues the exact sequence', () => {
    const r = new Rng(123);
    for (let i = 0; i < 1000; i++) r.nextU32();
    const state = r.getState();
    expect(state.every((w) => Number.isInteger(w) && w >= 0 && w <= 0xffffffff)).toBe(true);
    const copy = new Rng(1);
    copy.setState(state);
    for (let i = 0; i < 1000; i++) expect(copy.nextU32()).toBe(r.nextU32());
    expect(() => copy.setState([1, 2, 3])).toThrow();
  });

  it('hashString is stable', () => {
    expect(hashString('hearthwood')).toBe(hashString('hearthwood'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
