import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { blob, box, cylinder, type Part } from '../../src/view/geo/Joinery.ts';

/** Every face normal should point away from the part's centre (correct winding). */
function outwardShare(p: Part, center: Vector3): number {
  let out = 0;
  for (const t of p.tris) {
    const n = new Vector3().subVectors(t.b, t.a).cross(new Vector3().subVectors(t.c, t.a));
    const c = t.a
      .clone()
      .add(t.b)
      .add(t.c)
      .multiplyScalar(1 / 3)
      .sub(center);
    if (n.dot(c) > 0) out++;
  }
  return out / p.tris.length;
}

describe('Joinery', () => {
  it('box faces wind outward', () => {
    expect(outwardShare(box(1, 2, 3, 0xffffff), new Vector3())).toBe(1);
  });
  it('cylinder faces wind outward', () => {
    expect(outwardShare(cylinder(1, 0.6, 2, 8, 0xffffff), new Vector3(0, 1, 0))).toBe(1);
  });
  it('cone faces wind outward', () => {
    expect(outwardShare(cylinder(1, 0, 2, 7, 0xffffff), new Vector3(0, 0.5, 0))).toBe(1);
  });
  it('blob faces wind outward at both detail levels', () => {
    expect(outwardShare(blob(1, 0xffffff), new Vector3())).toBe(1);
    expect(outwardShare(blob(1, 0xffffff, 1), new Vector3())).toBe(1);
  });
  it('geometry has one colour per vertex', () => {
    const g = box(1, 1, 1, 0xff0000).toGeometry();
    expect(g.getAttribute('position').count).toBe(36);
    expect(g.getAttribute('color').count).toBe(36);
  });
});
