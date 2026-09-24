// The sim's typed event map (Plan Part 7.3). View, audio and UI subscribe; systems emit.
// Grows as systems land; payloads are plain data.

export type SimEvents = {
  /** A game hour began. `absoluteDay` is 1-based. */
  'clock/hour': { hour: number; absoluteDay: number };
  /** The daily rollover hour (06:00) began: orders, seasoning, autosave, the day card. */
  'clock/rollover': { absoluteDay: number };
  /** `Sim.advance` skipped time coarsely (sleep, tests, the econ sim). */
  'sim/advanced': { gameMinutes: number };
  /** Something the player did deserves an autosave soon (a purchase, a completed order). */
  'save/requested': { reason: 'rollover' | 'sleep' | 'purchase' | 'order' };
};
