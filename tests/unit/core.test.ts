import { describe, expect, it } from 'vitest';
import { crc32 } from '../../src/core/crc32.ts';
import { Noise2D } from '../../src/core/math/noise.ts';
import { springStep } from '../../src/core/math/spring.ts';

describe('core utilities', () => {
  it('noise is deterministic, bounded and smooth', () => {
    const a = new Noise2D(1);
    const b = new Noise2D(1);
    let max = 0;
    for (let i = 0; i < 2000; i++) {
      const x = i * 0.137;
      const y = i * 0.071;
      expect(a.get(x, y)).toBe(b.get(x, y));
      max = Math.max(max, Math.abs(a.get(x, y)));
      expect(Math.abs(a.get(x, y) - a.get(x + 0.001, y))).toBeLessThan(0.02);
    }
    expect(max).toBeLessThanOrEqual(1.0001);
    expect(max).toBeGreaterThan(0.5);
  });

  it('spring reaches its target without overshoot', () => {
    const s = { value: 0, velocity: 0 };
    let over = false;
    for (let i = 0; i < 600; i++) {
      springStep(s, 1, 8, 1 / 60);
      if (s.value > 1.0001) over = true;
    }
    expect(over).toBe(false);
    expect(s.value).toBeCloseTo(1, 4);
  });

  it('crc32 matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});
