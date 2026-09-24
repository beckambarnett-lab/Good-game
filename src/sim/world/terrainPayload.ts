// The generated terrain as a plain, transferable message (the terrain worker posts it back to the
// main thread at load) and its reconstruction.

import { Heightfield } from './Heightfield.ts';
import type { BridgeSpan, DensePath, GeneratedTerrain } from './TerrainGen.ts';

export interface TerrainPayload {
  size: number;
  cellSize: number;
  heights: Float32Array;
  surface: Uint8Array;
  paths: Record<string, DensePath>;
  roadProfiles: Record<string, number[]>;
  bridges: BridgeSpan[];
  /** Generation time (ms), for the loading log. */
  ms: number;
}

export function toPayload(t: GeneratedTerrain, ms: number): TerrainPayload {
  return {
    size: t.heightfield.size,
    cellSize: t.heightfield.cellSize,
    heights: t.heightfield.heights,
    surface: t.surface,
    paths: Object.fromEntries(t.paths),
    roadProfiles: Object.fromEntries(t.roadProfiles),
    bridges: t.bridges,
    ms,
  };
}

export function fromPayload(p: TerrainPayload): GeneratedTerrain {
  return {
    heightfield: new Heightfield(p.size, p.cellSize, p.heights),
    surface: p.surface,
    paths: new Map(Object.entries(p.paths)),
    roadProfiles: new Map(Object.entries(p.roadProfiles)),
    bridges: p.bridges,
  };
}

/** The buffers to transfer (not copy) when posting a payload. */
export const payloadTransfers = (p: TerrainPayload): ArrayBuffer[] => [
  p.heights.buffer as ArrayBuffer,
  p.surface.buffer as ArrayBuffer,
];
