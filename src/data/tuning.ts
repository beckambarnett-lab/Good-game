// All gameplay tunables live here (CLAUDE.md hard rule). Values marked "Lab" are set by the user
// in a Review Lab before integration; the lab edits a live copy of these objects.

export type TreeSize = 'small' | 'medium' | 'large' | 'oldOak';

export interface FellingTuning {
  /** Successful chops needed to fell any tree (user design: 3). */
  chopsToFell: number;
  /** Seconds for the marker to sweep from one end of the bar to the other, per tree size. */
  sweepSeconds: Record<TreeSize, number>;
  /** Green zone width as a fraction of the bar (0–1), before axe bonus. */
  greenWidth: number;
  /** Inner "perfect" band width (fraction of bar): extra sparkle and chime, no extra effect. */
  perfectWidth: number;
  /** Relaxed mode: marker speed multiplier while inside the green zone (accessibility). */
  relaxedGreenSpeed: number;
  /** Seconds the bar pauses after a chop while the swing animation plays. */
  chopRecover: number;
  /** Seconds after a miss before the next press counts (prevents mashing). */
  missLockout: number;
  /** Proposed axe-tier bonus to the green width (fraction of bar), to confirm in review. */
  axeGreenBonus: readonly number[];
}

export const felling: FellingTuning = {
  chopsToFell: 3,
  sweepSeconds: { small: 0.8, medium: 1.2, large: 1.7, oldOak: 2.0 },
  greenWidth: 0.22,
  perfectWidth: 0.06,
  relaxedGreenSpeed: 0.4,
  chopRecover: 0.45,
  missLockout: 0.35,
  axeGreenBonus: [0, 0.03, 0.06, 0.09, 0.11],
};

export interface ClockTuning {
  /** Real seconds per game hour during the day window and at night (Standard pace). */
  dayHourSeconds: number;
  nightHourSeconds: number;
  /** Day window [start, end) in game hours; outside it the night rate applies. */
  dayStartHour: number;
  dayEndHour: number;
  /** Pace multipliers for the Day length setting. */
  pace: Record<'relaxed' | 'standard' | 'brisk', number>;
  daysPerWinter: number;
  /** Game starts on Day 1 (Monday) at this hour; the clock is frozen during Hal's intro. */
  startHour: number;
}

export const clock: ClockTuning = {
  dayHourSeconds: 90,
  nightHourSeconds: 45,
  dayStartHour: 6,
  dayEndHour: 22,
  pace: { relaxed: 1.33, standard: 1, brisk: 0.67 },
  daysPerWinter: 56,
  startHour: 15,
};
