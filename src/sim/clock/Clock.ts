// Game clock and calendar (Plan Part 2.1). Time is stored as game minutes since Year 1, Day 1,
// 00:00. Real time converts to game time at a slower rate by day than at night.

import type { ClockTuning } from '../../data/tuning.ts';

export const MINUTES_PER_DAY = 24 * 60;
export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type Pace = 'relaxed' | 'standard' | 'brisk';

export interface CalendarTime {
  year: number;
  /** Day within the winter, 1..daysPerWinter. */
  day: number;
  /** Absolute day count since the game began, 1-based. */
  absoluteDay: number;
  weekday: Weekday;
  hour: number;
  minute: number;
  /** Fractional hour of day 0..24. */
  hourOfDay: number;
}

export class Clock {
  /** Game minutes since Year 1 Day 1 00:00. */
  minutes: number;
  frozen = false;
  pace: Pace = 'standard';
  private readonly t: ClockTuning;

  constructor(t: ClockTuning, minutes?: number) {
    this.t = t;
    this.minutes = minutes ?? t.startHour * 60;
  }

  /** Real seconds that one game hour takes at the given hour of day. */
  secondsPerGameHour(hourOfDay: number): number {
    const day = hourOfDay >= this.t.dayStartHour && hourOfDay < this.t.dayEndHour;
    return (day ? this.t.dayHourSeconds : this.t.nightHourSeconds) * this.t.pace[this.pace];
  }

  /** Advance by real seconds (the frame delta), crossing day/night rate boundaries exactly. */
  tick(realSeconds: number): void {
    if (this.frozen) return;
    let remaining = realSeconds;
    while (remaining > 1e-9) {
      const hod = this.hourOfDay();
      const rate = 60 / this.secondsPerGameHour(hod); // game minutes per real second
      const boundary = this.nextBoundaryHour(hod);
      const minutesToBoundary = (boundary - hod) * 60;
      const realToBoundary = minutesToBoundary / rate;
      if (realToBoundary >= remaining) {
        this.minutes += remaining * rate;
        remaining = 0;
      } else {
        this.minutes += minutesToBoundary;
        remaining -= realToBoundary;
      }
    }
  }

  /** Jump ahead by game minutes (sleep, time-lapse, tests). */
  advanceMinutes(gameMinutes: number): void {
    this.minutes += gameMinutes;
  }

  hourOfDay(): number {
    return (this.minutes % MINUTES_PER_DAY) / 60;
  }

  /** Minutes until the next occurrence of `hour` (e.g. 6 for morning). */
  minutesUntil(hour: number): number {
    const now = this.minutes % MINUTES_PER_DAY;
    const target = hour * 60;
    return target > now ? target - now : MINUTES_PER_DAY - now + target;
  }

  now(): CalendarTime {
    const absoluteDay = Math.floor(this.minutes / MINUTES_PER_DAY) + 1;
    const year = Math.floor((absoluteDay - 1) / this.t.daysPerWinter) + 1;
    const day = ((absoluteDay - 1) % this.t.daysPerWinter) + 1;
    const hourOfDay = this.hourOfDay();
    return {
      year,
      day,
      absoluteDay,
      weekday: WEEKDAYS[(absoluteDay - 1) % 7] as Weekday,
      hour: Math.floor(hourOfDay),
      minute: Math.floor((hourOfDay % 1) * 60),
      hourOfDay,
    };
  }

  private nextBoundaryHour(hod: number): number {
    if (hod < this.t.dayStartHour) return this.t.dayStartHour;
    if (hod < this.t.dayEndHour) return this.t.dayEndHour;
    return 24;
  }
}

/** "Thursday, Day 4 · 07:30" */
export function formatTime(c: CalendarTime): string {
  return `${c.weekday}, Day ${c.day} · ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}
