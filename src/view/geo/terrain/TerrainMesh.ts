// The valley's ground (Plan Part 7.4): 32 m chunks, each with four LODs and skirts that hide the
// cracks where LODs meet, all packed into one BatchedMesh (one draw call, per-chunk culling). The
// camera's distance picks each chunk's LOD a few times a second, with hysteresis. Flat-shaded
// facets; vertex colours from the palette: snow, blue in hollows, packed roads, ice.

import { BatchedMesh, BufferAttribute, BufferGeometry, Color, type Material, type Vector3 } from 'three';
import { smoothstep } from '../../../core/math/spring.ts';
import type { TerrainViewTuning } from '../../../data/tuning.ts';
import { SURFACE } from '../../../data/world/terrain.ts';
import type { Heightfield } from '../../../sim/world/Heightfield.ts';
import { palette } from '../../render/palette.ts';

/** Linear-space RGB for every heightfield sample, so each LOD colours a vertex the same way. */
export function terrainColors(hf: Heightfield, surface: Uint8Array, t: TerrainViewTuning): Float32Array {
  const n = hf.n;
  const out = new Float32Array(n * n * 3);
  const c = (hex: number) => new Color().setHex(hex);
  const lit = c(palette.snowLit);
  const shadow = c(palette.snowShadow);
  const deep = c(palette.snowDeep);
  const fixed = new Map<number, Color>([
    [SURFACE.road, c(palette.snowPacked)],
    [SURFACE.rail, c(palette.snowPacked).lerp(c(palette.stone), 0.3)],
    [SURFACE.lakeIce, c(palette.iceFrosted)],
    [SURFACE.creekIce, c(palette.iceFrosted).lerp(c(palette.iceClear), 0.35)],
  ]);
  const tmp = new Color();
  const nrm = { x: 0, y: 1, z: 0 };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const idx = j * n + i;
      const own = fixed.get(surface[idx] as number);
      if (own) {
        tmp.copy(own);
      } else {
        const h = hf.at(i, j);
        const around = (hf.at(i - 2, j) + hf.at(i + 2, j) + hf.at(i, j - 2) + hf.at(i, j + 2)) / 4;
        tmp.copy(lit).lerp(shadow, smoothstep(0, t.hollowDepth, around - h) * t.hollowTint);
        hf.normal(hf.coord(i), hf.coord(j), nrm);
        const slope = (Math.acos(Math.min(1, nrm.y)) * 180) / Math.PI;
        tmp.lerp(deep, smoothstep(t.steepFrom, t.steepTo, slope) * t.steepTint);
      }
      out[idx * 3] = tmp.r;
      out[idx * 3 + 1] = tmp.g;
      out[idx * 3 + 2] = tmp.b;
    }
  }
  return out;
}

/** Vertex and index counts of one chunk LOD (grid + four skirts). */
export function lodCounts(chunkSamples: number, stride: number): { vertices: number; indices: number } {
  const cells = chunkSamples / stride;
  const side = cells + 1;
  return { vertices: side * side + 4 * side, indices: cells * cells * 6 + 4 * cells * 6 };
}

/** Height range of a chunk's samples. */
export function chunkHeightRange(
  hf: Heightfield,
  ci: number,
  cj: number,
  chunkSamples: number,
): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = cj * chunkSamples; j <= (cj + 1) * chunkSamples; j++) {
    for (let i = ci * chunkSamples; i <= (ci + 1) * chunkSamples; i++) {
      const h = hf.at(i, j);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  return [lo, hi];
}

/** Height along a chunk edge at sample k, as an LOD with `stride` draws it (linear between its vertices). */
function edgeHeight(edge: (k: number) => number, k: number, stride: number, cells: number): number {
  const k0 = Math.floor(k / stride) * stride;
  const k1 = Math.min(cells, k0 + stride);
  const t = k1 === k0 ? 0 : (k - k0) / (k1 - k0);
  return edge(k0) * (1 - t) + edge(k1) * t;
}

/**
 * The widest vertical gap between any two LODs along any of a chunk's four edges: its skirt must
 * reach at least this far so no crack shows whatever LOD the neighbour is at. Both neighbours see
 * the same edge samples, so each covers the gap on its own.
 */
export function chunkEdgeGap(
  hf: Heightfield,
  ci: number,
  cj: number,
  chunkSamples: number,
  strides: readonly number[],
): number {
  const i0 = ci * chunkSamples;
  const j0 = cj * chunkSamples;
  const edges: ((k: number) => number)[] = [
    (k) => hf.at(i0 + k, j0),
    (k) => hf.at(i0 + k, j0 + chunkSamples),
    (k) => hf.at(i0, j0 + k),
    (k) => hf.at(i0 + chunkSamples, j0 + k),
  ];
  let worst = 0;
  for (const edge of edges) {
    for (let k = 0; k <= chunkSamples; k++) {
      for (let a = 0; a < strides.length; a++) {
        for (let b = a + 1; b < strides.length; b++) {
          const ha = edgeHeight(edge, k, strides[a] as number, chunkSamples);
          const hb = edgeHeight(edge, k, strides[b] as number, chunkSamples);
          worst = Math.max(worst, Math.abs(ha - hb));
        }
      }
    }
  }
  return worst;
}

/**
 * One chunk at one LOD, in world coordinates. Each cell splits along the diagonal whose ends are
 * closest in height (no false ridges). Skirts hang `skirt` metres below every edge, facing outward.
 */
export function buildChunkGeometry(
  hf: Heightfield,
  colors: Float32Array,
  ci: number,
  cj: number,
  chunkSamples: number,
  stride: number,
  skirt: number,
): BufferGeometry {
  const cells = chunkSamples / stride;
  if (!Number.isInteger(cells)) throw new Error('buildChunkGeometry: stride must divide the chunk');
  const side = cells + 1;
  const { vertices, indices } = lodCounts(chunkSamples, stride);
  const pos = new Float32Array(vertices * 3);
  const nor = new Float32Array(vertices * 3);
  const col = new Float32Array(vertices * 3);
  const index = new Uint16Array(indices);
  const nrm = { x: 0, y: 1, z: 0 };
  const i0 = ci * chunkSamples;
  const j0 = cj * chunkSamples;

  const put = (v: number, i: number, j: number, drop: number) => {
    const x = hf.coord(i);
    const z = hf.coord(j);
    pos[v * 3] = x;
    pos[v * 3 + 1] = hf.at(i, j) - drop;
    pos[v * 3 + 2] = z;
    hf.normal(x, z, nrm);
    nor[v * 3] = nrm.x;
    nor[v * 3 + 1] = nrm.y;
    nor[v * 3 + 2] = nrm.z;
    const c = (j * hf.n + i) * 3;
    col[v * 3] = colors[c] as number;
    col[v * 3 + 1] = colors[c + 1] as number;
    col[v * 3 + 2] = colors[c + 2] as number;
  };
  for (let jj = 0; jj < side; jj++) {
    for (let ii = 0; ii < side; ii++) put(jj * side + ii, i0 + ii * stride, j0 + jj * stride, 0);
  }

  let k = 0;
  const tri = (a: number, b: number, c: number) => {
    index[k++] = a;
    index[k++] = b;
    index[k++] = c;
  };
  const y = (v: number) => pos[v * 3 + 1] as number;
  for (let jj = 0; jj < cells; jj++) {
    for (let ii = 0; ii < cells; ii++) {
      const v00 = jj * side + ii;
      const v10 = v00 + 1;
      const v01 = v00 + side;
      const v11 = v01 + 1;
      if (Math.abs(y(v00) - y(v11)) < Math.abs(y(v10) - y(v01))) {
        tri(v00, v01, v11);
        tri(v00, v11, v10);
      } else {
        tri(v00, v01, v10);
        tri(v10, v01, v11);
      }
    }
  }

  // Edges ordered so that (top[k], top[k+1], skirt[k]) faces outward: −z, +x, +z, −x.
  const edges: number[][] = [[], [], [], []];
  for (let t = 0; t < side; t++) {
    (edges[0] as number[]).push(t);
    (edges[1] as number[]).push(t * side + cells);
    (edges[2] as number[]).push(cells * side + (cells - t));
    (edges[3] as number[]).push((cells - t) * side);
  }
  edges.forEach((top, e) => {
    const base = side * side + e * side;
    top.forEach((v, t) => {
      const gi = i0 + (v % side) * stride;
      const gj = j0 + Math.floor(v / side) * stride;
      put(base + t, gi, gj, skirt);
    });
    for (let t = 0; t < cells; t++) {
      const a = top[t] as number;
      const b = top[t + 1] as number;
      tri(a, b, base + t);
      tri(b, base + t + 1, base + t);
    }
  });

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  g.setAttribute('color', new BufferAttribute(col, 3));
  g.setIndex(new BufferAttribute(index, 1));
  return g;
}

/**
 * The LOD for a distance, given the current one: switching finer needs the camera `hysteresis`
 * metres inside a threshold, switching coarser needs it that far beyond.
 */
export function chooseLod(
  distance: number,
  current: number,
  distances: readonly number[],
  hysteresis: number,
): number {
  let lod = 0;
  distances.forEach((d, l) => {
    if (distance >= d + (l < current ? -hysteresis : hysteresis)) lod = l + 1;
  });
  return lod;
}

interface Chunk {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  y0: number;
  y1: number;
  geometryIds: number[];
  instanceId: number;
  lod: number;
}

export class TerrainMesh {
  readonly mesh: BatchedMesh;
  readonly chunks: Chunk[] = [];
  private readonly t: TerrainViewTuning;
  private sinceUpdate = Infinity;
  private readonly trianglesPerLod: number[];

  constructor(hf: Heightfield, surface: Uint8Array, material: Material, t: TerrainViewTuning) {
    this.t = t;
    const chunkSamples = t.chunkSize / hf.cellSize;
    const perEdge = (hf.n - 1) / chunkSamples;
    if (!Number.isInteger(perEdge)) throw new Error('TerrainMesh: chunk size must divide the world');
    const counts = t.lodStrides.map((s) => lodCounts(chunkSamples, s));
    const chunkCount = perEdge * perEdge;
    const totalVertices = chunkCount * counts.reduce((a, c) => a + c.vertices, 0);
    const totalIndices = chunkCount * counts.reduce((a, c) => a + c.indices, 0);
    this.trianglesPerLod = counts.map((c) => c.indices / 3);

    const colors = terrainColors(hf, surface, t);
    this.mesh = new BatchedMesh(chunkCount, totalVertices, totalIndices, material);
    this.mesh.name = 'terrain';
    const coarsest = t.lodStrides.length - 1;
    for (let cj = 0; cj < perEdge; cj++) {
      for (let ci = 0; ci < perEdge; ci++) {
        const [y0, y1] = chunkHeightRange(hf, ci, cj, chunkSamples);
        const skirt = t.skirtMargin + chunkEdgeGap(hf, ci, cj, chunkSamples, t.lodStrides);
        const geometryIds = t.lodStrides.map((stride) => {
          const g = buildChunkGeometry(hf, colors, ci, cj, chunkSamples, stride, skirt);
          const id = this.mesh.addGeometry(g);
          g.dispose();
          return id;
        });
        const instanceId = this.mesh.addInstance(geometryIds[coarsest] as number);
        this.chunks.push({
          x0: hf.coord(ci * chunkSamples),
          z0: hf.coord(cj * chunkSamples),
          x1: hf.coord((ci + 1) * chunkSamples),
          z1: hf.coord((cj + 1) * chunkSamples),
          y0: y0 - skirt,
          y1,
          geometryIds,
          instanceId,
          lod: coarsest,
        });
      }
    }
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
  }

  /** Reselects LODs for a camera position, at most `updateHz` times a second. */
  update(camera: Vector3, dt: number): void {
    this.sinceUpdate += dt;
    if (this.sinceUpdate < 1 / this.t.updateHz) return;
    this.sinceUpdate = 0;
    this.refresh(camera);
  }

  /** Reselects every chunk's LOD now. */
  refresh(camera: Vector3): void {
    for (const c of this.chunks) {
      const dx = Math.max(c.x0 - camera.x, 0, camera.x - c.x1);
      const dy = Math.max(c.y0 - camera.y, 0, camera.y - c.y1);
      const dz = Math.max(c.z0 - camera.z, 0, camera.z - c.z1);
      const lod = chooseLod(Math.hypot(dx, dy, dz), c.lod, this.t.lodDistances, this.t.lodHysteresis);
      if (lod !== c.lod) {
        c.lod = lod;
        this.mesh.setGeometryIdAt(c.instanceId, c.geometryIds[lod] as number);
      }
    }
  }

  /** Triangles across all chunks at their current LODs (before culling). */
  triangles(): number {
    return this.chunks.reduce((sum, c) => sum + (this.trianglesPerLod[c.lod] as number), 0);
  }

  dispose(): void {
    this.mesh.dispose();
  }
}
