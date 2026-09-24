// Builds the valley heightfield from authored features (Plan Part 7.4, ADR 0001): a ridge rising to
// the north, hills, masked fractal noise and flattened zones make the natural land; the creek carves
// its channel toward the lake; roads and the rail then cut graded beds with soft shoulders over it
// (left open under bridges). Paths are centripetal Catmull-Rom splines through their control
// points. Deterministic for a TerrainDef.

import { Noise2D } from '../../core/math/noise.ts';
import { smoothstep } from '../../core/math/spring.ts';
import type { FlatZone, PathPoint, RoadDef, Shape, TerrainDef } from '../../data/world/terrain.ts';
import { Heightfield } from './Heightfield.ts';

/** Target spacing (m) of densified path vertices. */
const PATH_STEP = 1;
/** Profile sample spacing along roads (m). */
const PROFILE_STEP = 1;
/** Moving-average window (m) that rounds the kinks the grade limiter leaves. */
const PROFILE_FINISH_WINDOW = 6;
/** Height (m) over which a creek bank's top edge is rounded into the land. */
const CREEK_BANK_ROUNDING = 1.2;
/** Height (m) above the bed the banks may climb, and the fade (m) at the edge of that reach. */
const CREEK_MAX_BANK = 12;
const CREEK_EDGE_FADE = 4;

/** Distance from a point to a shape (0 inside). */
export function distanceOutside(shape: Shape, x: number, z: number): number {
  switch (shape.kind) {
    case 'circle':
      return Math.max(0, Math.hypot(x - shape.x, z - shape.z) - shape.r);
    case 'ellipse': {
      const d = Math.hypot((x - shape.x) / shape.rx, (z - shape.z) / shape.rz);
      return d <= 1 ? 0 : (d - 1) * Math.min(shape.rx, shape.rz);
    }
    case 'rect': {
      const dx = Math.max(shape.x0 - x, 0, x - shape.x1);
      const dz = Math.max(shape.z0 - z, 0, z - shape.z1);
      return Math.hypot(dx, dz);
    }
  }
}

/** A path densified along its spline: vertex positions and arc lengths. */
export interface DensePath {
  x: number[];
  z: number[];
  /** Arc length at each vertex. */
  s: number[];
  /** Arc length at each control point (they all lie on the spline). */
  controlS: number[];
}

/** Samples a centripetal Catmull-Rom spline through the control points (ends extended linearly). */
export function densify(points: readonly PathPoint[], step = PATH_STEP): DensePath {
  const n = points.length;
  const px = (i: number): number => {
    if (i < 0) return 2 * (points[0] as PathPoint)[0] - (points[1] as PathPoint)[0];
    if (i >= n) return 2 * (points[n - 1] as PathPoint)[0] - (points[n - 2] as PathPoint)[0];
    return (points[i] as PathPoint)[0];
  };
  const pz = (i: number): number => {
    if (i < 0) return 2 * (points[0] as PathPoint)[1] - (points[1] as PathPoint)[1];
    if (i >= n) return 2 * (points[n - 1] as PathPoint)[1] - (points[n - 2] as PathPoint)[1];
    return (points[i] as PathPoint)[1];
  };
  const out: DensePath = { x: [px(0)], z: [pz(0)], s: [0], controlS: [0] };
  for (let i = 0; i < n - 1; i++) {
    const X = [px(i - 1), px(i), px(i + 1), px(i + 2)];
    const Z = [pz(i - 1), pz(i), pz(i + 1), pz(i + 2)];
    const t = [0, 0, 0, 0];
    for (let k = 1; k < 4; k++) {
      const d = Math.hypot((X[k] as number) - (X[k - 1] as number), (Z[k] as number) - (Z[k - 1] as number));
      t[k] = (t[k - 1] as number) + Math.max(1e-6, Math.sqrt(d));
    }
    const [t0, t1, t2, t3] = t as [number, number, number, number];
    const chord = Math.hypot((X[2] as number) - (X[1] as number), (Z[2] as number) - (Z[1] as number));
    const pieces = Math.max(1, Math.ceil(chord / step));
    for (let m = 1; m <= pieces; m++) {
      const tt = t1 + ((t2 - t1) * m) / pieces;
      const lerp = (a: number, b: number, ta: number, tb: number) =>
        (a * (tb - tt) + b * (tt - ta)) / (tb - ta);
      const eval1 = (V: number[]): number => {
        const a1 = lerp(V[0] as number, V[1] as number, t0, t1);
        const a2 = lerp(V[1] as number, V[2] as number, t1, t2);
        const a3 = lerp(V[2] as number, V[3] as number, t2, t3);
        const b1 = lerp(a1, a2, t0, t2);
        const b2 = lerp(a2, a3, t1, t3);
        return lerp(b1, b2, t1, t2);
      };
      const x = m === pieces ? (X[2] as number) : eval1(X);
      const z = m === pieces ? (Z[2] as number) : eval1(Z);
      const last = out.x.length - 1;
      out.s.push(
        (out.s[last] as number) + Math.hypot(x - (out.x[last] as number), z - (out.z[last] as number)),
      );
      out.x.push(x);
      out.z.push(z);
    }
    out.controlS.push(out.s.at(-1) as number);
  }
  return out;
}

export function pathLength(path: DensePath): number {
  return path.s.at(-1) ?? 0;
}

/** World (x, z) at arc length s along a dense path. */
export function pointAlong(path: DensePath, s: number): [number, number] {
  const { x, z } = path;
  const arcs = path.s;
  if (s <= 0) return [x[0] as number, z[0] as number];
  let lo = 0;
  let hi = arcs.length - 1;
  if (s >= (arcs[hi] as number)) return [x[hi] as number, z[hi] as number];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((arcs[mid] as number) <= s) lo = mid;
    else hi = mid;
  }
  const s0 = arcs[lo] as number;
  const s1 = arcs[hi] as number;
  const t = s1 === s0 ? 0 : (s - s0) / (s1 - s0);
  return [
    (x[lo] as number) + ((x[hi] as number) - (x[lo] as number)) * t,
    (z[lo] as number) + ((z[hi] as number) - (z[lo] as number)) * t,
  ];
}

/** Distance to a dense path and the arc length of its nearest point. */
export function nearestOnPath(path: DensePath, x: number, z: number): { distance: number; along: number } {
  let best = Infinity;
  let along = 0;
  for (let k = 0; k < path.x.length - 1; k++) {
    const ax = path.x[k] as number;
    const az = path.z[k] as number;
    const vx = (path.x[k + 1] as number) - ax;
    const vz = (path.z[k + 1] as number) - az;
    const len2 = vx * vx + vz * vz;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len2));
    const d = Math.hypot(x - (ax + vx * t), z - (az + vz * t));
    if (d < best) {
      best = d;
      along = (path.s[k] as number) + t * Math.sqrt(len2);
    }
  }
  return { distance: best, along };
}

/** Moving average with the ends held (keeps a profile's steepest step from growing). */
export function movingAverage(values: readonly number[], window: number): number[] {
  const half = Math.max(0, Math.round(window / 2));
  if (half === 0) return values.slice();
  const n = values.length;
  return values.map((_, i) => {
    let sum = 0;
    for (let k = i - half; k <= i + half; k++) sum += values[Math.min(n - 1, Math.max(0, k))] as number;
    return sum / (2 * half + 1);
  });
}

/**
 * Limits every step of a profile to `maxRise` while keeping both ends where they are. Forward and
 * backward passes are averaged so climbs sit centred on the land's own rise. If the ends are too far
 * apart for the limit, returns the straight line between them.
 */
export function limitGrade(values: readonly number[], maxRise: number): number[] {
  const n = values.length;
  if (n < 3) return values.slice();
  const a = values[0] as number;
  const b = values[n - 1] as number;
  if (Math.abs(b - a) > maxRise * (n - 1)) return values.map((_, i) => a + ((b - a) * i) / (n - 1));
  const pass = (src: readonly number[]): number[] => {
    const out = src.slice();
    const end = out[n - 1] as number;
    for (let i = 1; i < n - 1; i++) {
      const prev = out[i - 1] as number;
      const toEnd = maxRise * (n - 1 - i);
      const lo = Math.max(prev - maxRise, end - toEnd);
      const hi = Math.min(prev + maxRise, end + toEnd);
      out[i] = Math.min(hi, Math.max(lo, out[i] as number));
    }
    return out;
  };
  const forward = pass(values);
  const backward = pass(values.slice().reverse()).reverse();
  return forward.map((v, i) => (v + (backward[i] as number)) / 2);
}

/** Scale (m) of the wobble that breaks up flat-zone boundaries. */
const FLAT_EDGE_WAVELENGTH = 37;

function flatWeight(f: FlatZone, noise: Noise2D, x: number, z: number): number {
  let wx = 0;
  let wz = 0;
  if (f.edgeNoise > 0) {
    wx = noise.get(x / FLAT_EDGE_WAVELENGTH + 11.3, z / FLAT_EDGE_WAVELENGTH - 4.1) * f.edgeNoise;
    wz = noise.get(x / FLAT_EDGE_WAVELENGTH - 7.7, z / FLAT_EDGE_WAVELENGTH + 9.2) * f.edgeNoise;
  }
  return 1 - smoothstep(0, f.falloff, distanceOutside(f.shape, x + wx, z + wz));
}

/** Natural land: ridge, hills, noise and flats (before roads and creeks). */
export function naturalHeight(def: TerrainDef, noise: Noise2D, x: number, z: number): number {
  const ridge = smoothstep(def.ridge.zStart, def.ridge.zEnd, z);
  let h = ridge * (def.ridge.height + noise.fbm(x / 90, 7.3, 3) * def.ridge.skylineAmplitude);
  for (const hill of def.hills) {
    const d = Math.hypot(x - hill.x, z - hill.z) / hill.radius;
    if (d < 1) h += hill.height * (0.5 + 0.5 * Math.cos(Math.PI * d));
  }
  const roll = noise.fbm(x * def.noise.scale, z * def.noise.scale, def.noise.octaves) * def.noise.amplitude;
  h += roll;
  for (const f of def.flats) {
    const w = flatWeight(f, noise, x, z);
    if (w > 0) h += (f.height + f.relief * roll - h) * w;
  }
  return h;
}

/** Linear interpolation of pinned control heights along a dense path (held beyond the ends). */
function pinnedHeightAt(points: readonly PathPoint[], path: DensePath, s: number): number | undefined {
  const anchors: [number, number][] = [];
  points.forEach((p, i) => {
    if (p.length === 3) anchors.push([path.controlS[i] as number, p[2]]);
  });
  if (anchors.length === 0) return undefined;
  let k = 0;
  while (k < anchors.length - 1 && s > (anchors[k + 1] as [number, number])[0]) k++;
  const [s0, y0] = anchors[k] as [number, number];
  const [s1, y1] = anchors[Math.min(k + 1, anchors.length - 1)] as [number, number];
  return s1 === s0 ? y0 : y0 + (y1 - y0) * Math.max(0, Math.min(1, (s - s0) / (s1 - s0)));
}

/** Height profile of a road, sampled every PROFILE_STEP metres of arc length. */
export function roadProfile(def: TerrainDef, noise: Noise2D, road: RoadDef, path: DensePath): number[] {
  const len = pathLength(path);
  const raw: number[] = [];
  for (let s = 0; s <= len + 1e-9; s += PROFILE_STEP) {
    const pinned = pinnedHeightAt(road.points, path, s);
    if (pinned !== undefined) {
      raw.push(pinned);
    } else {
      const [x, z] = pointAlong(path, s);
      raw.push(naturalHeight(def, noise, x, z));
    }
  }
  const smoothed = movingAverage(raw, road.smoothing / PROFILE_STEP);
  // Keep the ends on the land they join before limiting the grade in between.
  smoothed[0] = raw[0] as number;
  smoothed[smoothed.length - 1] = raw.at(-1) as number;
  const graded = limitGrade(smoothed, road.maxGrade * PROFILE_STEP);
  return movingAverage(graded, PROFILE_FINISH_WINDOW / PROFILE_STEP);
}

/** Road height at arc length s, interpolated between profile samples. */
export function profileAt(profile: readonly number[], s: number): number {
  const f = Math.max(0, Math.min(profile.length - 1, s / PROFILE_STEP));
  const k = Math.min(profile.length - 2, Math.floor(f));
  if (k < 0) return profile[0] ?? 0;
  const a = profile[k] as number;
  return a + ((profile[k + 1] as number) - a) * (f - k);
}

/** Per-cell distance to a dense path and arc length of the nearest point, within `reach`. */
interface PathField {
  i0: number;
  j0: number;
  w: number;
  h: number;
  dist: Float32Array;
  along: Float32Array;
}

function rasterizePath(hf: Heightfield, path: DensePath, reach: number): PathField {
  const toIndex = (v: number) => (v + hf.size / 2) / hf.cellSize;
  const clampI = (v: number) => Math.min(hf.n - 1, Math.max(0, v));
  const i0 = clampI(Math.floor(toIndex(Math.min(...path.x) - reach)));
  const i1 = clampI(Math.ceil(toIndex(Math.max(...path.x) + reach)));
  const j0 = clampI(Math.floor(toIndex(Math.min(...path.z) - reach)));
  const j1 = clampI(Math.ceil(toIndex(Math.max(...path.z) + reach)));
  const w = i1 - i0 + 1;
  const h = j1 - j0 + 1;
  const dist = new Float32Array(w * h).fill(Infinity);
  const along = new Float32Array(w * h);
  for (let k = 0; k < path.x.length - 1; k++) {
    const ax = path.x[k] as number;
    const az = path.z[k] as number;
    const vx = (path.x[k + 1] as number) - ax;
    const vz = (path.z[k + 1] as number) - az;
    const len2 = vx * vx + vz * vz;
    const sa = path.s[k] as number;
    const segLen = Math.sqrt(len2);
    const si0 = Math.max(i0, Math.floor(toIndex(Math.min(ax, ax + vx) - reach)));
    const si1 = Math.min(i1, Math.ceil(toIndex(Math.max(ax, ax + vx) + reach)));
    const sj0 = Math.max(j0, Math.floor(toIndex(Math.min(az, az + vz) - reach)));
    const sj1 = Math.min(j1, Math.ceil(toIndex(Math.max(az, az + vz) + reach)));
    for (let j = sj0; j <= sj1; j++) {
      const z = hf.coord(j);
      for (let i = si0; i <= si1; i++) {
        const x = hf.coord(i);
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len2));
        const d = Math.hypot(x - (ax + vx * t), z - (az + vz * t));
        const idx = (j - j0) * w + (i - i0);
        if (d < (dist[idx] as number)) {
          dist[idx] = d;
          along[idx] = sa + t * segLen;
        }
      }
    }
  }
  return { i0, j0, w, h, dist, along };
}

/** A bridge as a span of arc length along its road; the terrain beneath is left alone. */
export interface BridgeSpan {
  id: string;
  road: string;
  s0: number;
  s1: number;
}

export interface GeneratedTerrain {
  heightfield: Heightfield;
  /** Dense spline paths of every road and creek, by id. */
  paths: Map<string, DensePath>;
  /** Road height profiles by id, sampled every PROFILE_STEP m (bridge decks follow these). */
  roadProfiles: Map<string, number[]>;
  bridges: BridgeSpan[];
}

export function generateTerrain(def: TerrainDef): GeneratedTerrain {
  const hf = new Heightfield(def.size, def.cellSize);
  const noise = new Noise2D(def.seed);
  const n = hf.n;
  for (let j = 0; j < n; j++) {
    const z = hf.coord(j);
    for (let i = 0; i < n; i++) hf.heights[j * n + i] = naturalHeight(def, noise, hf.coord(i), z);
  }

  const paths = new Map<string, DensePath>();
  const roadProfiles = new Map<string, number[]>();
  const bridges: BridgeSpan[] = [];
  // The creek carves first; roads and the rail then lay their beds over it, except on bridges.
  for (const creek of def.creeks) {
    const path = densify(creek.points);
    paths.set(creek.id, path);
    const bedAt = (s: number): number => pinnedHeightAt(creek.points, path, s) ?? 0;
    const half = creek.width / 2;
    const reach = half + CREEK_MAX_BANK / creek.bankSlope;
    const field = rasterizePath(hf, path, reach);
    for (let fj = 0; fj < field.h; fj++) {
      const j = fj + field.j0;
      for (let fi = 0; fi < field.w; fi++) {
        const d = field.dist[fj * field.w + fi] as number;
        if (d > reach) continue;
        const idx = j * n + fi + field.i0;
        const h = hf.heights[idx] as number;
        const channel =
          bedAt(field.along[fj * field.w + fi] as number) + creek.bankSlope * Math.max(0, d - half);
        // Cut down to the channel: the floor always fully, the bank's top edge rounded into the
        // land. Never raise the land, never undercut the channel, fade out at the edge of the reach.
        const excess = h - channel;
        if (excess <= 0) continue;
        const floor = 1 - smoothstep(half - 0.5, half + 1.5, d);
        const cut = excess * Math.max(floor, smoothstep(0, CREEK_BANK_ROUNDING, excess));
        hf.heights[idx] = h - cut * (1 - smoothstep(reach - CREEK_EDGE_FADE, reach, d));
      }
    }
  }
  for (const road of def.roads) {
    const path = densify(road.points);
    paths.set(road.id, path);
    const profile = roadProfile(def, noise, road, path);
    roadProfiles.set(road.id, profile);
    const spans = def.bridges
      .filter((b) => b.road === road.id)
      .map((b) => {
        const centre = nearestOnPath(path, b.x, b.z).along;
        return { id: b.id, road: road.id, s0: centre - b.halfLength, s1: centre + b.halfLength };
      });
    bridges.push(...spans);
    const edge = road.width / 2;
    const reach = edge + road.shoulder;
    const field = rasterizePath(hf, path, reach);
    for (let fj = 0; fj < field.h; fj++) {
      const j = fj + field.j0;
      for (let fi = 0; fi < field.w; fi++) {
        const d = field.dist[fj * field.w + fi] as number;
        if (d > reach) continue;
        const along = field.along[fj * field.w + fi] as number;
        if (spans.some((b) => along > b.s0 && along < b.s1)) continue;
        const target = profileAt(profile, along);
        const w = 1 - smoothstep(edge, reach, d);
        const idx = j * n + fi + field.i0;
        const h = hf.heights[idx] as number;
        hf.heights[idx] = h + (target - h) * w;
      }
    }
  }

  return { heightfield: hf, paths, roadProfiles, bridges };
}
