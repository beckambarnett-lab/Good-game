// Joinery: a tiny mesh-building kit for flat-shaded, vertex-coloured low-poly models.
// Parts are built from primitives, transformed, coloured, jittered for a handmade feel, then
// merged into one non-indexed BufferGeometry (flat normals, one draw call per model).

import { BufferGeometry, Color, Euler, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import type { Rng } from '../../core/rng.ts';

export interface Tri {
  a: Vector3;
  b: Vector3;
  c: Vector3;
  color: Color;
}

export class Part {
  tris: Tri[] = [];

  constructor(tris: Tri[] = []) {
    this.tris = tris;
  }

  static fromPolys(verts: Vector3[], faces: number[][], color: number): Part {
    const col = new Color(color);
    const tris: Tri[] = [];
    for (const f of faces) {
      for (let i = 1; i < f.length - 1; i++) {
        const a = verts[f[0] as number];
        const b = verts[f[i] as number];
        const c = verts[f[i + 1] as number];
        if (!a || !b || !c) continue;
        // Skip zero-area triangles (e.g. where a cone's side quads meet at the apex).
        const area = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).lengthSq();
        if (area < 1e-12) continue;
        tris.push({ a: a.clone(), b: b.clone(), c: c.clone(), color: col.clone() });
      }
    }
    return new Part(tris);
  }

  apply(m: Matrix4): this {
    for (const t of this.tris) {
      t.a.applyMatrix4(m);
      t.b.applyMatrix4(m);
      t.c.applyMatrix4(m);
    }
    return this;
  }

  at(x: number, y: number, z: number): this {
    return this.apply(new Matrix4().makeTranslation(x, y, z));
  }

  rot(x: number, y: number, z: number): this {
    const q = new Quaternion().setFromEuler(new Euler(x, y, z));
    return this.apply(new Matrix4().makeRotationFromQuaternion(q));
  }

  scale(x: number, y = x, z = x): this {
    return this.apply(new Matrix4().makeScale(x, y, z));
  }

  color(hex: number): this {
    const c = new Color(hex);
    for (const t of this.tris) t.color = c.clone();
    return this;
  }

  /** Colour faces by a predicate on their centroid/normal (e.g. snow on upward faces). */
  paint(hex: number, when: (centroid: Vector3, normal: Vector3) => boolean): this {
    const c = new Color(hex);
    const n = new Vector3();
    const e1 = new Vector3();
    const e2 = new Vector3();
    for (const t of this.tris) {
      e1.subVectors(t.b, t.a);
      e2.subVectors(t.c, t.a);
      n.crossVectors(e1, e2).normalize();
      const centroid = t.a
        .clone()
        .add(t.b)
        .add(t.c)
        .multiplyScalar(1 / 3);
      if (when(centroid, n)) t.color = c.clone();
    }
    return this;
  }

  /** Nudge shared vertices by up to `amount` (same position → same offset, so no cracks). */
  jitter(amount: number, rng: Rng): this {
    const offsets = new Map<string, Vector3>();
    const key = (v: Vector3) => `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    for (const t of this.tris) {
      for (const v of [t.a, t.b, t.c]) {
        const k = key(v);
        let o = offsets.get(k);
        if (!o) {
          o = new Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).multiplyScalar(amount);
          offsets.set(k, o);
        }
      }
    }
    for (const t of this.tris) {
      for (const v of [t.a, t.b, t.c]) v.add(offsets.get(key(v)) as Vector3);
    }
    return this;
  }

  /** Slightly vary face colours (lightness ±amount) so large surfaces aren't flat blocks. */
  tint(amount: number, rng: Rng): this {
    for (const t of this.tris) t.color.offsetHSL(0, 0, rng.range(-amount, amount));
    return this;
  }

  add(...others: Part[]): this {
    for (const o of others) this.tris.push(...o.tris);
    return this;
  }

  clone(): Part {
    return new Part(
      this.tris.map((t) => ({ a: t.a.clone(), b: t.b.clone(), c: t.c.clone(), color: t.color.clone() })),
    );
  }

  toGeometry(): BufferGeometry {
    const pos: number[] = [];
    const col: number[] = [];
    for (const t of this.tris) {
      pos.push(t.a.x, t.a.y, t.a.z, t.b.x, t.b.y, t.b.z, t.c.x, t.c.y, t.c.z);
      for (let i = 0; i < 3; i++) col.push(t.color.r, t.color.g, t.color.b);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

export function merge(...parts: Part[]): Part {
  return new Part().add(...parts);
}

/** Axis-aligned box centred at the origin. */
export function box(w: number, h: number, d: number, color: number): Part {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const v = [
    new Vector3(-x, -y, -z),
    new Vector3(x, -y, -z),
    new Vector3(x, y, -z),
    new Vector3(-x, y, -z),
    new Vector3(-x, -y, z),
    new Vector3(x, -y, z),
    new Vector3(x, y, z),
    new Vector3(-x, y, z),
  ];
  const faces = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 4, 7, 3],
    [1, 2, 6, 5],
    [3, 7, 6, 2],
    [0, 1, 5, 4],
  ];
  return Part.fromPolys(v, faces, color);
}

/** Frustum along +Y from y=0 to y=h (cone when rTop = 0). */
export function cylinder(
  rBottom: number,
  rTop: number,
  h: number,
  segments: number,
  color: number,
  caps = true,
): Part {
  const verts: Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    verts.push(new Vector3(Math.cos(a) * rBottom, 0, Math.sin(a) * rBottom));
  }
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    verts.push(new Vector3(Math.cos(a) * rTop, h, Math.sin(a) * rTop));
  }
  const faces: number[][] = [];
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    faces.push([i, i + segments, j + segments, j]);
  }
  if (caps) {
    faces.push(Array.from({ length: segments }, (_, i) => i));
    if (rTop > 0) faces.push(Array.from({ length: segments }, (_, i) => 2 * segments - 1 - i));
  }
  return Part.fromPolys(verts, faces, color);
}

/** Low-poly sphere (icosahedron, optionally subdivided once). */
export function blob(radius: number, color: number, detail: 0 | 1 = 0): Part {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map(([x, y, z]) => new Vector3(x, y, z).normalize());
  let faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  if (detail === 1) {
    const mids = new Map<string, number>();
    const mid = (a: number, b: number) => {
      const k = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = mids.get(k);
      if (hit !== undefined) return hit;
      const v = (verts[a] as Vector3)
        .clone()
        .add(verts[b] as Vector3)
        .normalize();
      verts.push(v);
      mids.set(k, verts.length - 1);
      return verts.length - 1;
    };
    const next: number[][] = [];
    for (const [a, b, c] of faces as [number, number, number][]) {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
    verts = [...verts];
  }
  return Part.fromPolys(
    verts.map((v) => v.multiplyScalar(radius)),
    faces,
    color,
  );
}
