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
  /** How far roads and rail shift from lit snow toward packed snow / ballast (subtle: they're under snow). */
  roadTint: number;
  railTint: number;
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
  roadTint: 0.5,
  railTint: 0.7,
};

export interface MovementTuning {
  /** Speeds (m/s; Plan Part 2.3). */
  walkSpeed: number;
  jogSpeed: number;
  /** Seconds to reach walking speed from rest, and to stop from it. */
  accelTime: number;
  stopTime: number;
  /** Fastest turn toward the heading (degrees per second). */
  turnRate: number;
  /** Kinematic capsule (m) and the steepest walkable ground (degrees). */
  capsuleRadius: number;
  capsuleHeight: number;
  maxSlope: number;
  /** The hop, purely for fun (m), and gravity (m/s²). */
  hopHeight: number;
  gravity: number;
  /** Ice: top-speed and acceleration multipliers (a gentle slide without crampons). */
  iceSpeed: number;
  iceGrip: number;
  /** Keep this far inside the world's edge (m). */
  worldMargin: number;
}

export const movement: MovementTuning = {
  walkSpeed: 3.4,
  jogSpeed: 5.2,
  accelTime: 0.18,
  stopTime: 0.12,
  turnRate: 600,
  capsuleRadius: 0.35,
  capsuleHeight: 1.7,
  maxSlope: 38,
  hopHeight: 0.45,
  gravity: 9.81,
  iceSpeed: 0.97,
  iceGrip: 0.35,
  worldMargin: 6,
};

export interface CameraRigTuning {
  /** Orbit distance (m): default, and the wheel-zoom range. */
  distance: number;
  minDistance: number;
  maxDistance: number;
  /** Pitch limits (degrees; positive looks down on the player). */
  minPitch: number;
  maxPitch: number;
  startPitch: number;
  /** The orbit target sits this far below the head. */
  targetDrop: number;
  /** Spring rates (ω): following the player, zooming, and collision pull-in / release. */
  followOmega: number;
  zoomOmega: number;
  pullInOmega: number;
  releaseOmega: number;
  /** Camera clearance above the ground and the collision probe radius (m). */
  groundClearance: number;
  probeRadius: number;
  /** Lazy recenter: seconds without look input while moving, then degrees per second. */
  recenterDelay: number;
  recenterRate: number;
  /** Look speed: radians per pixel of mouse at sensitivity 1, and per second of full stick. */
  mouseRadiansPerPixel: number;
  stickRadiansPerSecond: number;
  /** Wheel zoom step (m per notch). */
  zoomStep: number;
}

export const cameraRig: CameraRigTuning = {
  distance: 6.5,
  minDistance: 3.5,
  maxDistance: 12,
  minPitch: -10,
  maxPitch: 60,
  startPitch: 16,
  targetDrop: 0.3,
  followOmega: 8,
  zoomOmega: 6,
  pullInOmega: 20,
  releaseOmega: 4,
  groundClearance: 0.35,
  probeRadius: 0.25,
  recenterDelay: 2,
  recenterRate: 60,
  mouseRadiansPerPixel: 0.0025,
  stickRadiansPerSecond: 2.6,
  zoomStep: 0.8,
};

export interface ForestViewTuning {
  /** Distance (m) where LOD0 gives way to LOD1, and LOD1 to LOD2 (Plan Part 5.5: 40 / 120). */
  lodDistances: readonly [number, number];
  /** Extra distance (m) before a tree switches back, so trees don't flicker at a threshold. */
  lodHysteresis: number;
  /** Stumps are small: drawn only within this distance (m). */
  stumpDistance: number;
  /** Culling and LOD rate (Hz; Plan Part 7.4). */
  updateHz: number;
  /** Distinct LOD0 models per species, so near trees don't repeat. */
  lod0Variants: number;
  saplingHeight: number;
  /** Per-tree brightness variation (±). */
  tintAmount: number;
  /** Wind sway: metres at the top of a reference-height tree, and angular speed (rad/s). */
  swayAmplitude: number;
  swaySpeed: number;
}

export const forestView: ForestViewTuning = {
  lodDistances: [40, 120],
  lodHysteresis: 4,
  stumpDistance: 60,
  updateHz: 10,
  lod0Variants: 3,
  saplingHeight: 1.3,
  tintAmount: 0.08,
  swayAmplitude: 0.18,
  swaySpeed: 0.9,
};

export interface ValleyViewTuning {
  /** Exponential fog density: light enough that the town reads from the cabin (170 m). */
  fogDensity: number;
  /** Camera far plane (m); the whole 512 m valley plus the backdrop. */
  far: number;
  /** Light scale so lit snow reads white (until Environment key frames calibrate each hour, M1). */
  exposure: number;
  /** Where the walker starts: the cabin pad, facing the valley (yaw rad; facing (sin, cos)). */
  spawnX: number;
  spawnZ: number;
  spawnYaw: number;
  /** World seed of the test scene, until New Game (M1) chooses one per save. */
  seed: number;
}

export const valleyView: ValleyViewTuning = {
  fogDensity: 0.0025,
  far: 1200,
  exposure: 1.6,
  spawnX: -166,
  spawnZ: -22,
  spawnYaw: Math.PI / 2,
  seed: 1847261,
};

/** Render budgets for the Medium preset (Plan Part 7.8), checked by `npm run shots`. */
export interface RenderBudget {
  mainCalls: number;
  mainTriangles: number;
  shadowCalls: number;
  shadowTriangles: number;
}

export const renderBudget: RenderBudget = {
  mainCalls: 250,
  mainTriangles: 1_200_000,
  shadowCalls: 120,
  shadowTriangles: 600_000,
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
