// Where the trees grow (Plan Parts 2.5.2, 3.1, 5.5). Each area is scattered with a Poisson disc in
// data order, so fellable areas claim their exact site counts first and every site gets a stable id.
// About 3,200 trees at the Medium base; the High (+20%) and Ultra (+40%) presets bring the plan's
// ~4,000 (Plan Part 5.5). Oaks, apples and the maple grove join with their milestones (M7, M8).

import type { Shape } from './terrain.ts';

export type TreeSpecies = 'pine' | 'birch';
export type SiteSize = 'small' | 'medium' | 'large';
export type SiteState = 'mature' | 'stump' | 'sapling';
export type ForestZone = 'woodlot' | 'ridge' | 'farmEdge' | 'shore' | 'wild';

export interface ForestArea {
  id: string;
  zone: ForestZone;
  shape: Shape;
  /** Poisson-disc minimum distance between trees in this area (m). */
  spacing: number;
  /** Keep exactly this many sites (fellable areas), or keep each with probability `density`. */
  count?: number;
  density?: number;
  species: Readonly<Record<TreeSpecies, number>>;
  sizes: Readonly<Record<SiteSize, number>>;
  /** Only fellable areas have stumps and saplings at the start; the rest of their sites are mature. */
  fellable: boolean;
  stumps?: number;
  saplings?: number;
  /** Steepest ground (degrees) a tree takes root on. */
  maxSlope: number;
}

/** Ground no tree grows on, except in the listed areas. */
export interface Clearing {
  id: string;
  shape: Shape;
  allow: readonly string[];
}

export interface ForestDef {
  areas: readonly ForestArea[];
  clearings: readonly Clearing[];
  /** Keep this far (m) beyond a road's or the rail's edge, the creek floor and the lake ice. */
  roadClearance: number;
  railClearance: number;
  iceClearance: number;
  /** Building pads (flats with no relief) stay clear this far beyond their shape. */
  padClearance: number;
  /** No two trees closer than this, across areas (m). */
  minGap: number;
  /** Heights (m) by size (Plan Part 2.5.2). */
  heights: Readonly<Record<SiteSize, readonly [number, number]>>;
}

const MIXED = { pine: 0.7, birch: 0.3 } as const;
const CONIFER = { pine: 0.9, birch: 0.1 } as const;
const MOSTLY_PINE = { pine: 0.8, birch: 0.2 } as const;
const GROWN = { small: 0.25, medium: 0.45, large: 0.3 } as const;

export const wrenhollowForests: ForestDef = {
  areas: [
    {
      // Hal's woodlot, around the cabin clearing (Plan 2.5.2: 60 sites; 38 mature, 12 stumps, 10 saplings).
      id: 'woodlot',
      zone: 'woodlot',
      shape: { kind: 'rect', x0: -250, z0: -105, x1: -150, z1: 40 },
      spacing: 8,
      count: 60,
      species: MIXED,
      sizes: { small: 0.3, medium: 0.45, large: 0.25 },
      fellable: true,
      stumps: 12,
      saplings: 10,
      maxSlope: 35,
    },
    {
      // Birches and a few pines along the fields' west edge (Plan 2.5.2: 20 sites).
      id: 'farmEdge',
      zone: 'farmEdge',
      shape: { kind: 'rect', x0: -34, z0: 138, x1: -21, z1: 228 },
      spacing: 5,
      count: 20,
      species: { pine: 0.15, birch: 0.85 },
      sizes: GROWN,
      fellable: true,
      maxSlope: 35,
    },
    {
      // The shore footpath runs through birches from town to the landing (Plan 3.1).
      id: 'shoreBirches',
      zone: 'shore',
      shape: { kind: 'rect', x0: 106, z0: -30, x1: 160, z1: -8 },
      spacing: 4,
      density: 0.8,
      species: { pine: 0, birch: 1 },
      sizes: GROWN,
      fellable: false,
      maxSlope: 35,
    },
    {
      // Graybeard Ridge's forest; its 120 fellable sites are designated in M8.
      id: 'ridgeForest',
      zone: 'ridge',
      shape: { kind: 'rect', x0: -256, z0: -256, x1: 256, z1: -128 },
      spacing: 4.2,
      density: 0.9,
      species: CONIFER,
      sizes: GROWN,
      fellable: false,
      // Mountain forest clings to steep ground; rock outcrops join it above 40° (Plan Part 5.5).
      maxSlope: 48,
    },
    {
      id: 'kestrelWoods',
      zone: 'wild',
      shape: { kind: 'circle', x: -230, z: 150, r: 75 },
      spacing: 5,
      density: 0.75,
      species: MOSTLY_PINE,
      sizes: GROWN,
      fellable: false,
      maxSlope: 40,
    },
    {
      id: 'northShoreWoods',
      zone: 'wild',
      shape: { kind: 'rect', x0: 120, z0: -128, x1: 256, z1: -58 },
      spacing: 5,
      density: 0.6,
      species: MOSTLY_PINE,
      sizes: GROWN,
      fellable: false,
      maxSlope: 40,
    },
    {
      // South-east of the farm; the maple grove (M7) keeps its own clearing.
      id: 'southEastWoods',
      zone: 'wild',
      shape: { kind: 'rect', x0: 102, z0: 140, x1: 238, z1: 232 },
      spacing: 5,
      density: 0.7,
      species: MOSTLY_PINE,
      sizes: GROWN,
      fellable: false,
      maxSlope: 40,
    },
    {
      id: 'southWestWoods',
      zone: 'wild',
      shape: { kind: 'rect', x0: -160, z0: 130, x1: -40, z1: 232 },
      spacing: 5,
      density: 0.55,
      species: MIXED,
      sizes: GROWN,
      fellable: false,
      maxSlope: 40,
    },
    // Edge woods close the valley at the map's west, east and south edges.
    {
      id: 'westEdge',
      zone: 'wild',
      shape: { kind: 'rect', x0: -256, z0: -128, x1: -238, z1: 256 },
      spacing: 4.5,
      density: 0.85,
      species: MOSTLY_PINE,
      sizes: GROWN,
      fellable: false,
      maxSlope: 42,
    },
    {
      id: 'eastEdge',
      zone: 'wild',
      shape: { kind: 'rect', x0: 238, z0: -128, x1: 256, z1: 256 },
      spacing: 4.5,
      density: 0.85,
      species: MOSTLY_PINE,
      sizes: GROWN,
      fellable: false,
      maxSlope: 42,
    },
    {
      id: 'southEdge',
      zone: 'wild',
      shape: { kind: 'rect', x0: -256, z0: 232, x1: 256, z1: 256 },
      spacing: 4.5,
      density: 0.85,
      species: MOSTLY_PINE,
      sizes: GROWN,
      fellable: false,
      maxSlope: 42,
    },
  ],
  clearings: [
    {
      id: 'woodlotReserve',
      shape: { kind: 'rect', x0: -250, z0: -105, x1: -150, z1: 40 },
      allow: ['woodlot'],
    },
    { id: 'cabinClearing', shape: { kind: 'circle', x: -175, z: -25, r: 30 }, allow: [] },
    // Town trees are placed with the buildings in M2.
    { id: 'town', shape: { kind: 'rect', x0: -118, z0: -98, x1: 118, z1: 78 }, allow: [] },
    { id: 'fields', shape: { kind: 'rect', x0: -20, z0: 125, x1: 100, z1: 230 }, allow: [] },
    { id: 'mapleGrove', shape: { kind: 'circle', x: 110, z: 200, r: 34 }, allow: [] },
    // School Hill's sled run, top to runout (Plan 3.1).
    { id: 'sledRun', shape: { kind: 'rect', x0: -54, z0: -152, x1: -26, z1: -84 }, allow: [] },
  ],
  roadClearance: 2.5,
  railClearance: 4,
  iceClearance: 3,
  padClearance: 4,
  minGap: 2.5,
  heights: { small: [7, 9], medium: [11, 13], large: [14, 17] },
};
