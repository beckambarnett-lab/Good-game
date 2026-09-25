// Tree sites (Plan Parts 2.5.2, 7.5): a Poisson-disc scatter per forest area, clear of roads, the
// rail, ice, building pads, clearings and ground too steep to root on. Deterministic from the
// terrain seed (each area has its own random stream), and ids are stable (area index × stride +
// index) so saves can refer to a site.

import { Rng } from '../../core/rng.ts';
import type {
  ForestArea,
  ForestDef,
  ForestZone,
  SiteSize,
  SiteState,
  TreeSpecies,
} from '../../data/world/forests.ts';
import { SURFACE, type TerrainDef } from '../../data/world/terrain.ts';
import { distanceOutside, type GeneratedTerrain, shapeBounds } from './TerrainGen.ts';

export interface TreeSite {
  id: number;
  area: string;
  zone: ForestZone;
  x: number;
  z: number;
  /** Ground height at the site (m). */
  y: number;
  species: TreeSpecies;
  size: SiteSize;
  /** Height (m) of the tree when mature, whatever its state now. */
  height: number;
  state: SiteState;
  fellable: boolean;
  /** Facing (rad), lean (rad) and colour variation (−1..1) for the view. */
  yaw: number;
  lean: number;
  tint: number;
}

/** A site's id is its area's index times this, plus its index within the area. */
export const SITE_ID_STRIDE = 100_000;
/** Candidate attempts per active point in Bridson's Poisson-disc sampling. */
const POISSON_ATTEMPTS = 24;
/** Birches lean a little (Plan Part 5.5); pines stand nearly straight (rad). */
const LEAN = { pine: 0.02, birch: 0.08 } as const;

/** Bridson's Poisson disc over a rectangle: points at least `r` apart, filling it evenly. */
export function poissonDisc(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  r: number,
  rng: Rng,
): [number, number][] {
  const cell = r / Math.SQRT2;
  const gw = Math.max(1, Math.ceil((x1 - x0) / cell));
  const gh = Math.max(1, Math.ceil((z1 - z0) / cell));
  const grid = new Int32Array(gw * gh).fill(-1);
  const pts: [number, number][] = [];
  const active: number[] = [];
  const gi = (x: number) => Math.min(gw - 1, Math.floor((x - x0) / cell));
  const gj = (z: number) => Math.min(gh - 1, Math.floor((z - z0) / cell));
  const add = (x: number, z: number) => {
    grid[gj(z) * gw + gi(x)] = pts.length;
    active.push(pts.length);
    pts.push([x, z]);
  };
  const fits = (x: number, z: number): boolean => {
    if (x < x0 || x >= x1 || z < z0 || z >= z1) return false;
    const i = gi(x);
    const j = gj(z);
    for (let jj = Math.max(0, j - 2); jj <= Math.min(gh - 1, j + 2); jj++) {
      for (let ii = Math.max(0, i - 2); ii <= Math.min(gw - 1, i + 2); ii++) {
        const k = grid[jj * gw + ii] as number;
        if (k < 0) continue;
        const [px, pz] = pts[k] as [number, number];
        if ((px - x) ** 2 + (pz - z) ** 2 < r * r) return false;
      }
    }
    return true;
  };
  add(rng.range(x0, x1), rng.range(z0, z1));
  while (active.length > 0) {
    const a = rng.int(0, active.length - 1);
    const [px, pz] = pts[active[a] as number] as [number, number];
    let placed = false;
    for (let k = 0; k < POISSON_ATTEMPTS; k++) {
      const angle = rng.range(0, Math.PI * 2);
      const d = rng.range(r, 2 * r);
      const x = px + Math.cos(angle) * d;
      const z = pz + Math.sin(angle) * d;
      if (fits(x, z)) {
        add(x, z);
        placed = true;
        break;
      }
    }
    if (!placed) active.splice(a, 1);
  }
  return pts;
}

/** Uniform shuffle (Fisher–Yates) with the seeded stream. */
function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}

function pick<K extends string>(weights: Readonly<Record<K, number>>, rng: Rng): K {
  const keys = Object.keys(weights) as K[];
  return keys[rng.weightedIndex(keys.map((k) => weights[k]))] as K;
}

/** A spatial hash of accepted sites for the cross-area minimum gap. */
class GapGrid {
  private readonly cells = new Map<number, [number, number][]>();
  private readonly gap: number;
  constructor(gap: number) {
    this.gap = gap;
  }
  private key(i: number, j: number): number {
    return (i + 4096) * 8192 + (j + 4096);
  }
  clear(x: number, z: number): boolean {
    const i = Math.floor(x / this.gap);
    const j = Math.floor(z / this.gap);
    for (let jj = j - 1; jj <= j + 1; jj++) {
      for (let ii = i - 1; ii <= i + 1; ii++) {
        for (const [px, pz] of this.cells.get(this.key(ii, jj)) ?? []) {
          if ((px - x) ** 2 + (pz - z) ** 2 < this.gap * this.gap) return false;
        }
      }
    }
    return true;
  }
  add(x: number, z: number): void {
    const k = this.key(Math.floor(x / this.gap), Math.floor(z / this.gap));
    const list = this.cells.get(k);
    if (list) list.push([x, z]);
    else this.cells.set(k, [[x, z]]);
  }
}

export function generateSites(
  terrainDef: TerrainDef,
  forest: ForestDef,
  terrain: GeneratedTerrain,
): TreeSite[] {
  const hf = terrain.heightfield;
  const n = hf.n;
  const half = terrainDef.size / 2;
  const surfaceAt = (x: number, z: number): number => {
    const i = Math.round((x + half) / terrainDef.cellSize);
    const j = Math.round((z + half) / terrainDef.cellSize);
    if (i < 0 || j < 0 || i >= n || j >= n) return SURFACE.snow;
    return terrain.surface[j * n + i] as number;
  };
  const clearance: Record<number, number> = {
    [SURFACE.road]: forest.roadClearance,
    [SURFACE.rail]: forest.railClearance,
    [SURFACE.lakeIce]: forest.iceClearance,
    [SURFACE.creekIce]: forest.iceClearance,
  };
  const reach = Math.max(forest.roadClearance, forest.railClearance, forest.iceClearance);
  const rings = [0, reach / 3, (2 * reach) / 3, reach];
  const clearOfSurfaces = (x: number, z: number): boolean => {
    for (const d of rings) {
      const steps = d === 0 ? 1 : 12;
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2;
        const code = surfaceAt(x + Math.cos(a) * d, z + Math.sin(a) * d);
        const c = clearance[code];
        if (c !== undefined && d <= c) return false;
      }
    }
    return true;
  };
  const pads = terrainDef.flats.filter((f) => f.relief === 0 && !f.surface);
  const gaps = new GapGrid(forest.minGap);
  const sites: TreeSite[] = [];

  forest.areas.forEach((area: ForestArea, areaIndex) => {
    const rng = new Rng(terrainDef.seed).fork(`sites:${area.id}`);
    const [x0, z0, x1, z1] = shapeBounds(area.shape);
    const candidates = poissonDisc(x0, z0, x1, z1, area.spacing, rng).filter(([x, z]) => {
      if (Math.abs(x) > half - 1 || Math.abs(z) > half - 1) return false;
      if (distanceOutside(area.shape, x, z) > 0) return false;
      for (const c of forest.clearings) {
        if (!c.allow.includes(area.id) && distanceOutside(c.shape, x, z) === 0) return false;
      }
      for (const p of pads) if (distanceOutside(p.shape, x, z) < forest.padClearance) return false;
      if (hf.slopeDegrees(x, z) > area.maxSlope) return false;
      return clearOfSurfaces(x, z) && gaps.clear(x, z);
    });
    let chosen: [number, number][];
    if (area.count !== undefined) {
      if (candidates.length < area.count) {
        throw new Error(`Forest area ${area.id}: only ${candidates.length} sites fit, ${area.count} needed`);
      }
      chosen = shuffle(candidates, rng).slice(0, area.count);
    } else {
      const keep = area.density ?? 1;
      chosen = candidates.filter(() => rng.chance(keep));
    }
    // Start states: stumps first, then saplings, from a shuffled order; the rest are mature.
    const order = shuffle(
      chosen.map((_, i) => i),
      rng,
    );
    const stateOf = new Map<number, SiteState>();
    order.forEach((i, rank) => {
      const stumps = area.stumps ?? 0;
      const saplings = area.saplings ?? 0;
      stateOf.set(i, rank < stumps ? 'stump' : rank < stumps + saplings ? 'sapling' : 'mature');
    });
    chosen.forEach(([x, z], i) => {
      gaps.add(x, z);
      const species = pick(area.species, rng);
      const size = pick(area.sizes, rng);
      const [lo, hi] = forest.heights[size];
      sites.push({
        id: areaIndex * SITE_ID_STRIDE + i,
        area: area.id,
        zone: area.zone,
        x,
        z,
        y: hf.sample(x, z),
        species,
        size,
        height: rng.range(lo, hi),
        state: stateOf.get(i) ?? 'mature',
        fellable: area.fellable,
        yaw: rng.range(0, Math.PI * 2),
        lean: rng.range(0, LEAN[species]),
        tint: rng.range(-1, 1),
      });
    });
  });
  return sites;
}
