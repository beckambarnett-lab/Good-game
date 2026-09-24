import { describe, expect, it } from 'vitest';
import { felling } from '../../src/data/tuning.ts';
import { pressChop, startFelling, stepFelling, zoneAt } from '../../src/sim/actions/felling.ts';

describe('felling minigame', () => {
  it('three green hits fell a tree', () => {
    const s = startFelling('medium', 0.5);
    expect(pressChop(s, felling)).toBe('perfect');
    s.lock = 0;
    s.marker = 0.5 + felling.greenWidth / 2 - 0.01;
    expect(pressChop(s, felling)).toBe('chop');
    s.lock = 0;
    expect(s.felled).toBe(false);
    s.marker = 0.5;
    pressChop(s, felling);
    expect(s.felled).toBe(true);
  });

  it('a miss gives no progress and a short lockout', () => {
    const s = startFelling('small', 0.05);
    expect(pressChop(s, felling)).toBe('miss');
    expect(s.chops).toBe(0);
    expect(pressChop(s, felling)).toBe('ignored');
    stepFelling(s, felling.missLockout + 0.01, felling);
    expect(s.lock).toBe(0);
  });

  it('bigger trees sweep slower', () => {
    const small = startFelling('small', 0);
    const large = startFelling('large', 0);
    stepFelling(small, 0.3, felling);
    stepFelling(large, 0.3, felling);
    expect(small.marker).toBeGreaterThan(large.marker);
    expect(small.marker).toBeCloseTo(0.3 / felling.sweepSeconds.small, 2);
  });

  it('marker ping-pongs within the bar', () => {
    const s = startFelling('small', 0);
    for (let i = 0; i < 1000; i++) {
      stepFelling(s, 1 / 60, felling);
      expect(s.marker).toBeGreaterThanOrEqual(0);
      expect(s.marker).toBeLessThanOrEqual(1);
    }
  });

  it('relaxed mode slows the marker inside the green', () => {
    const normal = startFelling('medium', 0.45);
    const relaxed = startFelling('medium', 0.45);
    stepFelling(normal, 0.05, felling);
    stepFelling(relaxed, 0.05, felling, true);
    expect(relaxed.marker - 0.45).toBeLessThan(normal.marker - 0.45);
  });

  it('zones are centred', () => {
    expect(zoneAt(0.5, felling)).toBe('perfect');
    expect(zoneAt(0.5 + felling.greenWidth / 2 - 0.001, felling)).toBe('green');
    expect(zoneAt(0.95, felling)).toBe('outside');
  });

  it('after a chop the marker restarts from an edge (no free follow-up chop)', () => {
    const s = startFelling('medium', 0.5);
    pressChop(s, felling);
    stepFelling(s, felling.chopRecover + 0.01, felling);
    expect(Math.min(s.marker, 1 - s.marker)).toBeLessThan(0.05);
    expect(pressChop(s, felling)).toBe('ignored');
  });
});
