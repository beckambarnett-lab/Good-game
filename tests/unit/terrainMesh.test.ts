import { Color, MeshLambertMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { terrainView } from '../../src/data/tuning.ts';
import { SURFACE } from '../../src/data/world/terrain.ts';
import { Heightfield } from '../../src/sim/world/Heightfield.ts';
import {
  buildChunkGeometry,
  chooseLod,
  chunkEdgeGap,
  lodCounts,
  TerrainMesh,
  terrainColors,
} from '../../src/view/geo/terrain/TerrainMesh.ts';
import { palette } from '../../src/view/render/palette.ts';

const CHUNK = 32;

/** A 64 m test world: rolling bumps, a steep bank and a hollow. */
function testWorld(): { hf: Heightfield; surface: Uint8Array } {
  const hf = new Heightfield(64, 1);
  const surface = new Uint8Array(hf.n * hf.n);
  for (let j = 0; j < hf.n; j++) {
    for (let i = 0; i < hf.n; i++) {
      const x = hf.coord(i);
      const z = hf.coord(j);
      let h = Math.sin(x * 0.31) * 1.3 + Math.cos(z * 0.23) * 0.9 + Math.max(0, x - 10) * 0.9;
      h -= 2.5 * Math.exp(-((x + 15) ** 2 + (z + 15) ** 2) / 20);
      hf.heights[j * hf.n + i] = h;
      if (Math.abs(z) < 2) surface[j * hf.n + i] = SURFACE.road;
    }
  }
  return { hf, surface };
}

const vec = (a: ArrayLike<number>, v: number) => new Vector3(a[v * 3], a[v * 3 + 1], a[v * 3 + 2]);

function faceNormals(g: ReturnType<typeof buildChunkGeometry>) {
  const pos = g.getAttribute('position').array;
  const idx = g.getIndex()?.array ?? [];
  const out: { n: Vector3; c: Vector3 }[] = [];
  for (let k = 0; k < idx.length; k += 3) {
    const a = vec(pos, idx[k] as number);
    const b = vec(pos, idx[k + 1] as number);
    const c = vec(pos, idx[k + 2] as number);
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    out.push({ n, c: a.add(b).add(c).divideScalar(3) });
  }
  return out;
}

describe('terrain chunks', () => {
  const { hf, surface } = testWorld();
  const colors = terrainColors(hf, surface, terrainView);

  it('have the expected vertex and index counts per LOD', () => {
    expect(lodCounts(32, 1)).toEqual({ vertices: 33 * 33 + 4 * 33, indices: 32 * 32 * 6 + 4 * 32 * 6 });
    for (const stride of terrainView.lodStrides) {
      const g = buildChunkGeometry(hf, colors, 0, 1, CHUNK, stride, 2);
      const c = lodCounts(CHUNK, stride);
      expect(g.getAttribute('position').count).toBe(c.vertices);
      expect(g.getIndex()?.count).toBe(c.indices);
    }
  });

  it('sit on the heightfield, face up, and skirt outward', () => {
    const g = buildChunkGeometry(hf, colors, 1, 0, CHUNK, 2, 2);
    const pos = g.getAttribute('position').array;
    const side = CHUNK / 2 + 1;
    for (let v = 0; v < side * side; v++) {
      const p = vec(pos, v);
      expect(p.y).toBeCloseTo(hf.sample(p.x, p.z), 5);
    }
    const tops = (CHUNK / 2) ** 2 * 2;
    const faces = faceNormals(g);
    faces.slice(0, tops).forEach(({ n }) => {
      expect(n.y).toBeGreaterThan(0);
    });
    // Chunk (1, 0) spans x 0..32, z −32..0; each skirt faces away from the chunk's centre.
    const centre = new Vector3(16, 0, -16);
    for (const { n, c } of faces.slice(tops)) {
      const out = new Vector3(c.x - centre.x, 0, c.z - centre.z);
      expect(n.dot(out)).toBeGreaterThan(0);
    }
  });

  it('skirts cover the widest gap between any two LODs along every edge', () => {
    for (const [ci, cj] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const skirt = terrainView.skirtMargin + chunkEdgeGap(hf, ci, cj, CHUNK, terrainView.lodStrides);
      // Brute force the shared edge x = 0 of chunks (0, *) and (1, *) at every pair of strides.
      if (ci !== 1) continue;
      const zs = cj === 0 ? [-32, 0] : [0, 32];
      const lodH = (z: number, stride: number) => {
        const k = z - (zs[0] as number);
        const k0 = Math.floor(k / stride) * stride;
        const k1 = Math.min(CHUNK, k0 + stride);
        const t = k1 === k0 ? 0 : (k - k0) / (k1 - k0);
        return hf.sample(0, (zs[0] as number) + k0) * (1 - t) + hf.sample(0, (zs[0] as number) + k1) * t;
      };
      let worst = 0;
      for (let z = zs[0] as number; z <= (zs[1] as number); z += 1) {
        for (const a of terrainView.lodStrides) {
          for (const b of terrainView.lodStrides) worst = Math.max(worst, Math.abs(lodH(z, a) - lodH(z, b)));
        }
      }
      expect(worst).toBeLessThan(skirt);
    }
  });

  it('colour roads packed, hollows bluer than the open snow', () => {
    const at = (x: number, z: number) => {
      const i = x + 32;
      const j = z + 32;
      const k = (j * hf.n + i) * 3;
      return new Color(colors[k] as number, colors[k + 1] as number, colors[k + 2] as number);
    };
    expect(at(-20, 0).getHex()).toBe(new Color().setHex(palette.snowPacked).getHex());
    const hollow = at(-15, -15);
    const open = at(-25, 20);
    expect(hollow.b - hollow.r).toBeGreaterThan(open.b - open.r);
  });
});

describe('terrain LOD selection', () => {
  const d = terrainView.lodDistances;
  const h = terrainView.lodHysteresis;

  it('follows distance with hysteresis at every threshold', () => {
    expect(chooseLod(10, 3, d, h)).toBe(0);
    expect(chooseLod(1000, 0, d, h)).toBe(3);
    const t0 = d[0] as number;
    expect(chooseLod(t0 + h / 2, 0, d, h)).toBe(0);
    expect(chooseLod(t0 + h * 1.5, 0, d, h)).toBe(1);
    expect(chooseLod(t0 - h / 2, 1, d, h)).toBe(1);
    expect(chooseLod(t0 - h * 1.5, 1, d, h)).toBe(0);
  });
});

describe('TerrainMesh', () => {
  it('packs every chunk and LOD into one batch and picks LODs from the camera', () => {
    const { hf, surface } = testWorld();
    const tuning = { ...terrainView, lodDistances: [20, 40, 80] };
    const terrain = new TerrainMesh(hf, surface, new MeshLambertMaterial(), tuning);
    expect(terrain.chunks).toHaveLength(4);
    terrain.refresh(new Vector3(-16, 5, -16));
    const lods = terrain.chunks.map((c) => c.lod);
    expect(lods[0]).toBe(0);
    expect(Math.max(...lods)).toBeGreaterThan(0);
    const perLod = tuning.lodStrides.map((s) => lodCounts(CHUNK, s).indices / 3);
    expect(terrain.triangles()).toBe(lods.reduce((sum, l) => sum + (perLod[l] as number), 0));
    terrain.dispose();
  });
});
