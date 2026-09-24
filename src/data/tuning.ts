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
  /** Hour of the daily rollover: orders, seasoning, autosave, the day card (Plan Part 2.1). */
  rolloverHour: number;
}

export const clock: ClockTuning = {
  dayHourSeconds: 90,
  nightHourSeconds: 45,
  dayStartHour: 6,
  dayEndHour: 22,
  pace: { relaxed: 1.33, standard: 1, brisk: 0.67 },
  daysPerWinter: 56,
  startHour: 15,
  rolloverHour: 6,
};

export interface SimTuning {
  /** Fixed simulation rate (Hz); the sim never reads frame time (Plan Part 7.3). */
  stepHz: number;
  /** Catch-up cap per rendered frame; backlog beyond it is dropped. */
  maxStepsPerFrame: number;
}

export const sim: SimTuning = {
  stepHz: 60,
  maxStepsPerFrame: 5,
};

export interface AppTuning {
  /** Longest frame (s) render-side animation may see after a stall, so nothing leaps. */
  maxRenderDeltaSeconds: number;
  /** Music and ambience level while the tab is hidden with "Background audio" on (Plan Part 2.11). */
  backgroundAudioDuckDb: number;
}

export const app: AppTuning = {
  maxRenderDeltaSeconds: 0.1,
  backgroundAudioDuckDb: -6,
};

export interface TerrainViewTuning {
  /** Chunk edge (m); the world is divided into square chunks, each with every LOD. */
  chunkSize: number;
  /** Heightfield sample stride per LOD (1 = every metre). */
  lodStrides: readonly number[];
  /** Distance (m) from the camera beyond which each LOD gives way to the next coarser one. */
  lodDistances: readonly number[];
  /** Extra distance (m) before switching back, so chunks don't flicker at a threshold. */
  lodHysteresis: number;
  /** Skirt depth (m) beyond the widest gap between any two LODs along a chunk's edges. */
  skirtMargin: number;
  /** LOD reselection rate (Hz); Plan Part 7.4 throttles culling updates to 10 Hz. */
  updateHz: number;
  /** Snow colour: how deep a hollow (m below its neighbours' mean, at 2 m) turns fully shadow-blue. */
  hollowDepth: number;
  hollowTint: number;
  /** Slopes (degrees) that fade toward deep-shadow blue; rock outcrops come later (Plan Part 5.5). */
  steepFrom: number;
  steepTo: number;
  steepTint: number;
}

export const terrainView: TerrainViewTuning = {
  chunkSize: 32,
  lodStrides: [1, 2, 4, 8],
  lodDistances: [64, 128, 256],
  lodHysteresis: 8,
  skirtMargin: 0.5,
  updateHz: 10,
  hollowDepth: 0.5,
  hollowTint: 0.55,
  steepFrom: 32,
  steepTo: 48,
  steepTint: 0.5,
};

export interface SaveTuning {
  /** Autosave cadence in real seconds of play (Plan Part 2.11). */
  autosaveEveryRealSeconds: number;
  /** Debounce after a purchase or completed order before autosaving. */
  eventAutosaveDebounceSeconds: number;
  manualSlots: number;
}

export const save: SaveTuning = {
  autosaveEveryRealSeconds: 300,
  eventAutosaveDebounceSeconds: 30,
  manualSlots: 3,
};
