import { describe, expect, it } from 'vitest';
import { clock as clockTuning } from '../../src/data/tuning.ts';
import { Clock, MINUTES_PER_DAY } from '../../src/sim/clock/Clock.ts';

describe('Clock', () => {
  it('starts on Monday Day 1 at 15:00', () => {
    const c = new Clock(clockTuning);
    expect(c.now()).toMatchObject({ day: 1, weekday: 'Monday', hour: 15, year: 1 });
  });

  it('a full day takes 30 real minutes at Standard pace', () => {
    const c = new Clock(clockTuning, 0);
    for (let i = 0; i < 30 * 60 * 10; i++) c.tick(0.1);
    expect(c.minutes).toBeCloseTo(MINUTES_PER_DAY, 3);
  });

  it('runs twice as fast at night', () => {
    const day = new Clock(clockTuning, 10 * 60);
    const night = new Clock(clockTuning, 23 * 60);
    day.tick(45);
    night.tick(45);
    expect(night.minutes - 23 * 60).toBeCloseTo(2 * (day.minutes - 10 * 60), 6);
  });

  it('crosses the 22:00 boundary exactly', () => {
    const c = new Clock(clockTuning, 21.5 * 60);
    c.tick(45 + 45); // 30 min of day (45 s) then 60 min of night (45 s)
    expect(c.hourOfDay()).toBeCloseTo(23, 6);
  });

  it('pace settings scale day length', () => {
    const c = new Clock(clockTuning, 0);
    c.pace = 'relaxed';
    c.tick(30 * 60);
    expect(c.minutes).toBeLessThan(MINUTES_PER_DAY);
  });

  it('frozen clocks do not move', () => {
    const c = new Clock(clockTuning);
    c.frozen = true;
    c.tick(100);
    expect(c.now().hour).toBe(15);
  });

  it('festival days fall on Sundays', () => {
    for (const d of [14, 28, 35, 42, 49, 56]) {
      const c = new Clock(clockTuning, (d - 1) * MINUTES_PER_DAY + 12 * 60);
      expect(c.now().weekday).toBe('Sunday');
    }
    const meteor = new Clock(clockTuning, 37 * MINUTES_PER_DAY);
    expect(meteor.now().weekday).toBe('Wednesday');
  });

  it('rolls into Year 2 after Day 56', () => {
    const c = new Clock(clockTuning, 56 * MINUTES_PER_DAY + 60);
    expect(c.now()).toMatchObject({ year: 2, day: 1, weekday: 'Monday' });
  });

  it('minutesUntil finds the next morning', () => {
    const c = new Clock(clockTuning, 22 * 60);
    expect(c.minutesUntil(6)).toBe(8 * 60);
  });
});
