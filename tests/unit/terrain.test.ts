import { beforeAll, describe, expect, it } from 'vitest';
import { wrenhollowTerrain as def, type RoadDef, SURFACE } from '../../src/data/world/terrain.ts';
import type { Heightfield } from '../../src/sim/world/Heightfield.ts';
import {
  type BridgeSpan,
  type DensePath,
  generateTerrain,
  limitGrade,
  pathLength,
  pointAlong,
} from '../../src/sim/world/TerrainGen.ts';

let hf: Heightfield;
let paths: Map<string, DensePath>;
let bridges: BridgeSpan[];
let surface: Uint8Array;
beforeAll(() => {
  const t = generateTerrain(def);
  hf = t.heightfield;
  paths = t.paths;
  bridges = t.bridges;
  surface = t.surface;
});

const surfaceAt = (x: number, z: number): number => {
  const i = Math.round((x + def.size / 2) / def.cellSize);
  const j = Math.round((z + def.size / 2) / def.cellSize);
  return surface[j * hf.n + i] as number;
};

const pathOf = (id: string): DensePath => {
  const p = paths.get(id);
  if (!p) throw new Error(`no path ${id}`);
  return p;
};

const road = (id: string): RoadDef => {
  const r = def.roads.find((x) => x.id === id);
  if (!r) throw new Error(`no road ${id}`);
  return r;
};

/** True within a metre of any bridge span on this road (the abutments are the bridge's). */
const onBridge = (r: RoadDef, s: number) =>
  bridges.some((b) => b.road === r.id && s > b.s0 - 1 && s < b.s1 + 1);

/** Grades along a road's centreline every 2 m, skipping bridge spans. */
function grades(r: RoadDef): { s: number; grade: number }[] {
  const out: { s: number; grade: number }[] = [];
  const path = pathOf(r.id);
  const len = pathLength(path);
  for (let s = 1; s < len - 3; s += 2) {
    const [x, z] = pointAlong(path, s);
    const [x2, z2] = pointAlong(path, s + 2);
    if (onBridge(r, s) || onBridge(r, s + 2)) continue;
    out.push({ s, grade: (hf.sample(x2, z2) - hf.sample(x, z)) / Math.hypot(x2 - x, z2 - z) });
  }
  return out;
}

describe('limitGrade', () => {
  it('limits every step and keeps the ends', () => {
    const src = [0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    const out = limitGrade(src, 0.5);
    expect(out[0]).toBe(0);
    expect(out.at(-1)).toBe(5);
    for (let i = 1; i < out.length; i++) {
      expect(Math.abs((out[i] as number) - (out[i - 1] as number))).toBeLessThanOrEqual(0.5 + 1e-9);
    }
  });

  it('falls back to a straight line when the ends are too far apart', () => {
    expect(limitGrade([0, 0, 0, 9], 1)).toEqual([0, 3, 6, 9]);
  });
});

describe('Wrenhollow terrain', () => {
  it('is deterministic', () => {
    expect(generateTerrain(def).heightfield.heights).toEqual(hf.heights);
  });

  it('puts key places at their planned elevations', () => {
    expect(hf.sample(-175, -25)).toBeCloseTo(10, 0); // cabin
    expect(Math.abs(hf.sample(0, 0) - 1)).toBeLessThan(0.3); // Lantern Tree square
    expect(hf.sample(220, 40)).toBeCloseTo(-3.2, 1); // Stillmere ice
    expect(hf.sample(-40, -225)).toBeCloseTo(88, 0); // lookout
    expect(hf.sample(-90, -190)).toBeCloseTo(62, 0); // ranger station
    expect(hf.sample(60, 160)).toBeCloseTo(4.6, 0); // farmyard
    expect(hf.sample(-40, -125)).toBeGreaterThan(20); // top of School Hill
  });

  it('keeps flat zones flat', () => {
    expect(hf.slopeDegrees(-175, -25)).toBeLessThan(2);
    expect(hf.slopeDegrees(10, -30)).toBeLessThan(2);
    expect(hf.slopeDegrees(220, 40)).toBeLessThan(0.5);
  });

  it('every road and the rail stay within their design grade, with level cross-sections', () => {
    for (const r of def.roads) {
      for (const { s, grade } of grades(r)) {
        expect(Math.abs(grade), `${r.id} grade at ${s} m`).toBeLessThan(r.maxGrade + 0.02);
        const [x, z] = pointAlong(pathOf(r.id), s);
        const [x2, z2] = pointAlong(pathOf(r.id), s + 2);
        const len = Math.hypot(x2 - x, z2 - z);
        const half = r.width / 2 - 0.5;
        const nx = -(z2 - z) / len;
        const nz = (x2 - x) / len;
        const camber = Math.abs(
          hf.sample(x + nx * half, z + nz * half) - hf.sample(x - nx * half, z - nz * half),
        );
        expect(camber, `${r.id} camber at ${s} m`).toBeLessThan(0.35);
      }
    }
  });

  it('Cabin Road climbs about 9 m from Main Street to the cabin', () => {
    const p = pathOf('cabinRoad');
    const [x1, z1] = pointAlong(p, pathLength(p));
    expect(hf.sample(x1, z1) - hf.sample(-104, 0)).toBeGreaterThan(8);
  });

  it('Farm Lane has its 14° rise at the farm gate, and meets the rail level at the crossing', () => {
    const steepest = Math.max(...grades(road('farmLane')).map((g) => g.grade));
    expect((Math.atan(steepest) * 180) / Math.PI).toBeGreaterThan(12.5);
    expect((Math.atan(steepest) * 180) / Math.PI).toBeLessThan(14.5);
    expect(Math.abs(hf.sample(50, 60) - 1)).toBeLessThan(0.1);
  });

  it('Tallow Creek runs in a channel that falls toward the lake', () => {
    const creek = def.creeks[0];
    if (!creek) throw new Error('no creek');
    let previous = Infinity;
    for (const [x, z, bed] of creek.points) {
      const h = hf.sample(x, z);
      expect(h, `creek bed at ${x}`).toBeLessThan(bed + 0.3);
      expect(h).toBeLessThanOrEqual(previous + 0.05);
      previous = h;
    }
    expect(previous).toBeGreaterThan(hf.sample(220, 40) - 0.05); // drains into, not up to, the lake
    expect(hf.sample(-90, 104)).toBeLessThan(hf.sample(-90, 120) - 1.5); // banks stand above it
  });

  it('the bridge and trestle leave the creek open beneath them', () => {
    expect(hf.sample(50, 95)).toBeLessThan(-2);
    expect(hf.sample(140, 86)).toBeLessThan(-2);
  });

  it('the ridge rises well above the valley', () => {
    expect(hf.sample(-150, -240)).toBeGreaterThan(55);
    expect(hf.sample(-150, 60)).toBeLessThan(15);
  });

  it('knows what the ground is made of', () => {
    expect(surfaceAt(220, 40)).toBe(SURFACE.lakeIce);
    expect(surfaceAt(-60, 0)).toBe(SURFACE.road);
    expect(surfaceAt(-10, 55)).toBe(SURFACE.rail);
    expect(surfaceAt(-90, 104)).toBe(SURFACE.creekIce);
    expect(surfaceAt(50, 95)).toBe(SURFACE.creekIce); // under the farm bridge
    expect(surfaceAt(-200, -60)).toBe(SURFACE.snow);
    expect(surfaceAt(163, 14)).not.toBe(SURFACE.lakeIce); // the landing is dry land
  });
});
