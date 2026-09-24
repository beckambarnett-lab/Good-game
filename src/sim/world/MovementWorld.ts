// The generated valley as a MovementWorld: the heightfield for ground, the surface grid, and the
// trunks and stumps of the tree sites as colliders in a spatial hash (saplings don't block).

import type { ForestDef } from '../../data/world/forests.ts';
import { SURFACE } from '../../data/world/terrain.ts';
import type { Collider, MovementWorld } from '../player/Movement.ts';
import type { TreeSite } from './Sites.ts';
import type { GeneratedTerrain } from './TerrainGen.ts';

/** Collider hash cell (m). */
const CELL = 4;

export function valleyMovementWorld(
  terrain: GeneratedTerrain,
  sites: readonly TreeSite[],
  forest: ForestDef,
): MovementWorld {
  const hf = terrain.heightfield;
  const half = hf.size / 2;
  const cells = new Map<number, Collider[]>();
  const key = (i: number, j: number) => (i + 1024) * 2048 + (j + 1024);
  for (const s of sites) {
    if (s.state === 'sapling') continue;
    const r = (forest.trunkRadius[s.species] * s.height) / forest.modelHeight;
    const k = key(Math.floor(s.x / CELL), Math.floor(s.z / CELL));
    const list = cells.get(k);
    const c = { x: s.x, z: s.z, r };
    if (list) list.push(c);
    else cells.set(k, [c]);
  }
  return {
    halfSize: half,
    heightAt: (x, z) => hf.sample(x, z),
    normalAt: (x, z, out) => hf.normal(x, z, out),
    surfaceAt: (x, z) => {
      const i = Math.round((x + half) / hf.cellSize);
      const j = Math.round((z + half) / hf.cellSize);
      if (i < 0 || j < 0 || i >= hf.n || j >= hf.n) return SURFACE.snow;
      return terrain.surface[j * hf.n + i] as number;
    },
    collidersNear: (x, z, radius, out) => {
      out.length = 0;
      const i0 = Math.floor((x - radius) / CELL);
      const i1 = Math.floor((x + radius) / CELL);
      const j0 = Math.floor((z - radius) / CELL);
      const j1 = Math.floor((z + radius) / CELL);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const list = cells.get(key(i, j));
          if (list) out.push(...list);
        }
      }
      return out;
    },
  };
}
