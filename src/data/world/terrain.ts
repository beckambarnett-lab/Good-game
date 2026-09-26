// Terrain features of the Wrenhollow valley (Plan Part 3.1; ADR 0001). Coordinates in metres: the
// world is 512 × 512 centred on the Lantern Tree at (0, 0); +X east, +Z south, Y up.

/** What the ground is at a heightfield sample: drives footsteps, speed rules and colour. */
export const SURFACE = { snow: 0, road: 1, rail: 2, lakeIce: 3, creekIce: 4 } as const;
export type SurfaceKind = keyof typeof SURFACE;
export type SurfaceCode = (typeof SURFACE)[SurfaceKind];

/** A path vertex: [x, z], or [x, z, y] to pin the path's height there. */
export type PathPoint = readonly [number, number] | readonly [number, number, number];

export type Shape =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'ellipse'; x: number; z: number; rx: number; rz: number }
  | { kind: 'rect'; x0: number; z0: number; x1: number; z1: number };

export interface FlatZone {
  id: string;
  shape: Shape;
  height: number;
  /** Distance (m) over which the flat blends back into the terrain around it. */
  falloff: number;
  /** How far (m) the boundary wanders, so flats don't read as circles and rectangles. */
  edgeNoise: number;
  /** Fraction (0–1) of the land's natural roll kept inside the flat; 0 = dead level (building pads). */
  relief: number;
  /** The ground inside the flat, when it isn't snow (the lake's ice). */
  surface?: SurfaceKind;
}

export interface Hill {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface RoadDef {
  id: string;
  surface: 'road' | 'rail';
  width: number;
  /** Blend distance beyond the road edge. */
  shoulder: number;
  /** Vertices; pinned heights make a designed profile, otherwise the road follows the land. */
  points: readonly PathPoint[];
  /** Moving-average window (m) applied to the height profile. */
  smoothing: number;
  /** Steepest allowed rise per metre along the road (0.12 = 12 %). */
  maxGrade: number;
}

/** Where a road or rail crosses on a bridge: the terrain below is left alone. */
export interface BridgeDef {
  id: string;
  road: string;
  x: number;
  z: number;
  /** Half the span, measured from the centre along the ground (m). */
  halfLength: number;
}

export interface CreekDef {
  id: string;
  /** Flat channel floor width (m). */
  width: number;
  /** Bank rise per metre beyond the channel floor. */
  bankSlope: number;
  /** Vertices with the channel-floor height; it must fall toward the mouth. */
  points: readonly (readonly [number, number, number])[];
}

export interface TerrainDef {
  size: number;
  /** Heightfield cell edge (m). */
  cellSize: number;
  seed: number;
  ridge: { zStart: number; zEnd: number; height: number; skylineAmplitude: number };
  hills: readonly Hill[];
  noise: { amplitude: number; scale: number; octaves: number };
  /** Applied in order: a later flat overrides an earlier one where they overlap. */
  flats: readonly FlatZone[];
  roads: readonly RoadDef[];
  bridges: readonly BridgeDef[];
  creeks: readonly CreekDef[];
}

export const wrenhollowTerrain: TerrainDef = {
  size: 512,
  cellSize: 1,
  seed: 1978,
  ridge: { zStart: -120, zEnd: -245, height: 82, skylineAmplitude: 14 },
  hills: [
    { id: 'woodlotRise', x: -200, z: -40, radius: 85, height: 14 },
    { id: 'schoolHill', x: -40, z: -125, radius: 45, height: 26 },
    { id: 'mapleKnoll', x: 120, z: 200, radius: 45, height: 6 },
    { id: 'kestrelShoulder', x: -230, z: 150, radius: 70, height: 10 },
    { id: 'westPortal', x: -268, z: 58, radius: 45, height: 18 },
    { id: 'eastPortal', x: 268, z: 126, radius: 45, height: 18 },
    { id: 'lookoutPeak', x: -40, z: -228, radius: 45, height: 9 },
  ],
  noise: { amplitude: 2.6, scale: 1 / 70, octaves: 4 },
  flats: [
    {
      id: 'town',
      shape: { kind: 'rect', x0: -112, z0: -92, x1: 112, z1: 72 },
      height: 1,
      falloff: 28,
      edgeNoise: 14,
      relief: 0.12,
    },
    {
      id: 'cabinPad',
      shape: { kind: 'circle', x: -175, z: -25, r: 16 },
      height: 10,
      falloff: 18,
      edgeNoise: 4,
      relief: 0,
    },
    // Stillmere's ice is the valley's lowest point; Tallow Creek drains into it (ADR 0001).
    {
      id: 'lakeIce',
      shape: { kind: 'ellipse', x: 220, z: 40, rx: 50, rz: 82 },
      height: -3.2,
      falloff: 14,
      edgeNoise: 7,
      relief: 0,
      surface: 'lakeIce',
    },
    {
      id: 'landing',
      shape: { kind: 'circle', x: 163, z: 14, r: 7 },
      height: 0.6,
      falloff: 5,
      edgeNoise: 1.5,
      relief: 0,
    },
    {
      id: 'farmBottoms',
      shape: { kind: 'rect', x0: -20, z0: 100, x1: 140, z1: 124 },
      height: -1.6,
      falloff: 10,
      edgeNoise: 8,
      relief: 0.3,
    },
    {
      id: 'farmFields',
      shape: { kind: 'rect', x0: -20, z0: 140, x1: 100, z1: 230 },
      height: 3.8,
      falloff: 12,
      edgeNoise: 10,
      relief: 0.3,
    },
    {
      id: 'farmyard',
      shape: { kind: 'rect', x0: 35, z0: 136, x1: 95, z1: 178 },
      height: 4.6,
      falloff: 6,
      edgeNoise: 4,
      relief: 0,
    },
    {
      id: 'rangerStation',
      shape: { kind: 'circle', x: -90, z: -190, r: 14 },
      height: 62,
      falloff: 16,
      edgeNoise: 4,
      relief: 0,
    },
    {
      id: 'lookout',
      shape: { kind: 'circle', x: -40, z: -225, r: 6 },
      height: 88,
      falloff: 10,
      edgeNoise: 2,
      relief: 0,
    },
  ],
  roads: [
    {
      id: 'mainStreet',
      surface: 'road',
      width: 10,
      shoulder: 6,
      smoothing: 30,
      maxGrade: 0.04,
      points: [
        [-104, 0],
        [0, 0],
        [104, 0],
      ],
    },
    {
      // Winds past the Mortons (north) and the Vargas (south) to keep the 9 m climb gentle.
      id: 'cabinRoad',
      surface: 'road',
      width: 6,
      shoulder: 5,
      smoothing: 24,
      maxGrade: 0.12,
      points: [
        [-104, 0],
        [-125, 2],
        [-142, 10],
        [-158, 12],
        [-172, 6],
        [-182, -4],
        [-184, -12],
      ],
    },
    {
      // West of the School Lane houses, ending at the foot of School Hill past the schoolhouse.
      id: 'schoolLane',
      surface: 'road',
      width: 5,
      shoulder: 4,
      smoothing: 20,
      maxGrade: 0.08,
      points: [
        [-30, 0],
        [-34, -30],
        [-40, -55],
        [-46, -70],
        [-48, -88],
      ],
    },
    {
      id: 'lakeRoad',
      surface: 'road',
      width: 6,
      shoulder: 5,
      smoothing: 24,
      maxGrade: 0.08,
      points: [
        [104, 0],
        [130, 5],
        [163, 14],
      ],
    },
    {
      // Level crossing at z 60, bridge over Tallow Creek, down into the bottoms, then the 14° rise
      // (25 m, +6.2 m) up to the farmyard.
      id: 'farmLane',
      surface: 'road',
      width: 5,
      shoulder: 4,
      smoothing: 6,
      maxGrade: 0.26,
      points: [
        [50, 4, 1],
        [50, 60, 1],
        [50, 86, 0.3],
        [50, 104, 0.2],
        [50, 118, -1.6],
        [51, 143, 4.6],
        [54, 152, 4.6],
        [66, 162, 4.6],
      ],
    },
    {
      // Tunnel west → Wrenhollow Halt → level crossing → trestle over the creek mouth → tunnel east.
      id: 'railLine',
      surface: 'rail',
      width: 4,
      shoulder: 3,
      smoothing: 10,
      maxGrade: 0.02,
      points: [
        [-262, 60, 1],
        [-120, 58, 1],
        [-10, 55, 1],
        [50, 60, 1],
        [110, 72, 1],
        [160, 95, 1],
        [205, 132, 1],
        [262, 122, 1],
      ],
    },
  ],
  bridges: [
    { id: 'tallowBridge', road: 'farmLane', x: 50, z: 95, halfLength: 9 },
    { id: 'creekTrestle', road: 'railLine', x: 142, z: 87, halfLength: 22 },
  ],
  creeks: [
    {
      id: 'tallowCreek',
      width: 7,
      bankSlope: 0.55,
      points: [
        [-256, 108, -2.2],
        [-170, 96, -2.4],
        [-90, 104, -2.55],
        [-10, 92, -2.7],
        [50, 95, -2.8],
        [110, 88, -2.95],
        [150, 85, -3.05],
        [176, 88, -3.15],
      ],
    },
  ],
};
