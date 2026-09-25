// A snowy clearing: a disc of gentle low-poly bumps, rising into a bank at the edge.

import { Vector3 } from 'three';
import type { Rng } from '../../core/rng.ts';
import { palette } from '../render/palette.ts';
import { Part } from './Joinery.ts';

export function snowClearing(radius: number, rings: number, rng: Rng): Part {
  const verts: Vector3[] = [new Vector3(0, 0, 0)];
  const perRing: number[] = [];
  for (let r = 1; r <= rings; r++) {
    const count = 6 * r;
    perRing.push(count);
    const rad = (r / rings) * radius;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (r % 2) * (Math.PI / count);
      const edge = Math.max(0, (rad / radius - 0.55) / 0.45);
      const y = rng.range(-0.08, 0.08) + edge * edge * 3.5 + Math.sin(a * 3 + r) * 0.05 * edge;
      verts.push(new Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad));
    }
  }
  const faces: number[][] = [];
  const ringStart = (r: number) => 1 + perRing.slice(0, r - 1).reduce((s, n) => s + n, 0);
  for (let i = 0; i < 6; i++) faces.push([0, 1 + ((i + 1) % 6), 1 + i]);
  for (let r = 1; r < rings; r++) {
    const a0 = ringStart(r);
    const b0 = ringStart(r + 1);
    const na = perRing[r - 1] as number;
    const nb = perRing[r] as number;
    let i = 0;
    let j = 0;
    while (i < na || j < nb) {
      const ai = a0 + (i % na);
      const bj = b0 + (j % nb);
      // Advance whichever ring lags in angle.
      if (j < nb && (i >= na || (j + 1) / nb <= (i + 1) / na)) {
        faces.push([ai, b0 + ((j + 1) % nb), bj]);
        j++;
      } else {
        faces.push([ai, a0 + ((i + 1) % na), bj]);
        i++;
      }
    }
  }
  const part = Part.fromPolys(verts, faces, palette.snowLit);
  return part.tint(0.012, rng);
}
