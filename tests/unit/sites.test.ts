import { beforeAll, describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng.ts';
import { wrenhollowForests as forest } from '../../src/data/world/forests.ts';
import { SURFACE, wrenhollowTerrain as terrainDef } from '../../src/data/world/terrain.ts';
import { generateSites, poissonDisc, type TreeSite } from '../../src/sim/world/Sites.ts';
import { distanceOutside, type GeneratedTerrain, generateTerrain } from '../../src/sim/world/TerrainGen.ts';

let terrain: GeneratedTerrain;
let sites: TreeSite[];
beforeAll(() => {
  terrain = generateTerrain(terrainDef);
  sites = generateSites(terrainDef, forest, terrain);
});

describe('poissonDisc', () => {
  it('keeps points apart and fills the rectangle', () => {
    const pts = poissonDisc(0, 0, 100, 60, 5, new Rng(3));
    for (let a = 0; a < pts.length; a++) {
      for (let b = a + 1; b < pts.length; b++) {
        const [ax, az] = pts[a] as [number, number];
        const [bx, bz] = pts[b] as [number, number];
        expect(Math.hypot(ax - bx, az - bz)).toBeGreaterThanOrEqual(5 - 1e-9);
      }
    }
    // A maximal disc packing at r = 5 in 6000 m² holds roughly 150–250 points.
    expect(pts.length).toBeGreaterThan(150);
    expect(pts.length).toBeLessThan(260);
  });
});

describe('tree sites', () => {
  it('are deterministic, with unique stable ids', () => {
    const again = generateSites(terrainDef, forest, terrain);
    expect(again).toEqual(sites);
    expect(new Set(sites.map((s) => s.id)).size).toBe(sites.length);
  });

  it('match the plan: ~4,000 trees, a 60-site woodlot (38 / 12 / 10) and 20 at the farm edge', () => {
    expect(sites.length).toBeGreaterThan(3000);
    expect(sites.length).toBeLessThan(4800);
    const woodlot = sites.filter((s) => s.area === 'woodlot');
    expect(woodlot).toHaveLength(60);
    const count = (state: string) => woodlot.filter((s) => s.state === state).length;
    expect([count('mature'), count('stump'), count('sapling')]).toEqual([38, 12, 10]);
    expect(sites.filter((s) => s.area === 'farmEdge')).toHaveLength(20);
    expect(sites.filter((s) => s.fellable).every((s) => s.zone === 'woodlot' || s.zone === 'farmEdge')).toBe(
      true,
    );
  });

  it('keep off roads, rail, ice, pads, clearings and steep ground', () => {
    const n = terrain.heightfield.n;
    const surfaceAt = (x: number, z: number) =>
      terrain.surface[Math.round(z + 256) * n + Math.round(x + 256)] as number;
    const pads = terrainDef.flats.filter((f) => f.relief === 0 && !f.surface);
    for (const s of sites) {
      expect(surfaceAt(s.x, s.z), `site ${s.id} surface`).toBe(SURFACE.snow);
      for (const p of pads)
        expect(distanceOutside(p.shape, s.x, s.z)).toBeGreaterThanOrEqual(forest.padClearance);
      for (const c of forest.clearings) {
        if (!c.allow.includes(s.area))
          expect(distanceOutside(c.shape, s.x, s.z), `${s.id} in ${c.id}`).toBeGreaterThan(0);
      }
      const area = forest.areas.find((a) => a.id === s.area);
      expect(terrain.heightfield.slopeDegrees(s.x, s.z)).toBeLessThanOrEqual(area?.maxSlope ?? 0);
    }
  });

  it('never crowd each other, even across areas', () => {
    const cell = 5;
    const grid = new Map<string, TreeSite[]>();
    for (const s of sites) {
      const k = `${Math.floor(s.x / cell)},${Math.floor(s.z / cell)}`;
      grid.set(k, [...(grid.get(k) ?? []), s]);
    }
    let closest = Infinity;
    for (const s of sites) {
      const i = Math.floor(s.x / cell);
      const j = Math.floor(s.z / cell);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          for (const o of grid.get(`${i + di},${j + dj}`) ?? []) {
            if (o.id !== s.id) closest = Math.min(closest, Math.hypot(o.x - s.x, o.z - s.z));
          }
        }
      }
    }
    expect(closest).toBeGreaterThanOrEqual(forest.minGap - 1e-9);
  });

  it('give each tree a height for its size and sit on the ground', () => {
    for (const s of sites.slice(0, 500)) {
      const [lo, hi] = forest.heights[s.size];
      expect(s.height).toBeGreaterThanOrEqual(lo);
      expect(s.height).toBeLessThanOrEqual(hi);
      expect(s.y).toBeCloseTo(terrain.heightfield.sample(s.x, s.z), 5);
    }
  });
});
