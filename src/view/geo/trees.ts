// Procedural low-poly trees (Plan Part 5.5). Each tree is split at the felling hinge: a stump
// part (ground to hinge) and a crown part (hinge upward, local origin at the hinge) so the crown
// can rotate about the notch when it falls.

import type { Rng } from '../../core/rng.ts';
import { palette } from '../render/palette.ts';
import { box, cylinder, merge, type Part } from './Joinery.ts';

export interface TreeParts {
  stump: Part;
  crown: Part;
  height: number;
  trunkRadius: number;
  hingeY: number;
}

export const HINGE_Y = 0.42;

const snowTop = (_c: unknown, n: { y: number }) => n.y > 0.5;

export function pine(height: number, trunkRadius: number, rng: Rng): TreeParts {
  const trunkH = height * 0.92;
  const topR = trunkRadius * 0.35;
  const rAtHinge = trunkRadius + (topR - trunkRadius) * (HINGE_Y / trunkH);
  const stump = cylinder(trunkRadius, rAtHinge, HINGE_Y, 7, palette.pineBark).tint(0.03, rng);
  const trunk = cylinder(rAtHinge, topR, trunkH - HINGE_Y, 7, palette.pineBark).tint(0.03, rng);

  const tiers = Math.max(4, Math.round(height / 1.6));
  const crownBase = height * 0.2;
  const parts: Part[] = [trunk];
  for (let i = 0; i < tiers; i++) {
    const f = i / tiers;
    const y = crownBase + f * (height - crownBase) * 0.9;
    const radius = (1 - f * 0.82) * height * 0.24 * rng.range(0.9, 1.08);
    const tierH = ((height - crownBase) / tiers) * rng.range(1.5, 1.9);
    const segs = 8 + (i % 2);
    const tint = [palette.pine, palette.pineLight, palette.pineDark][i % 3] as number;
    const tier = cylinder(radius, radius * 0.12, tierH, segs, tint)
      .jitter(radius * 0.08, rng)
      .rot(0, rng.range(0, Math.PI), 0)
      .at(0, y - HINGE_Y, 0)
      .tint(0.03, rng)
      .paint(palette.snowLit, snowTop);
    parts.push(tier);
  }
  return { stump, crown: merge(...parts), height, trunkRadius, hingeY: HINGE_Y };
}

export function birch(height: number, trunkRadius: number, rng: Rng): TreeParts {
  const stump = cylinder(trunkRadius, trunkRadius * 0.97, HINGE_Y, 7, palette.birchBark);
  const parts: Part[] = [];
  // Trunk in stacked bands; a few dark lenticel marks.
  const bands = 9;
  const trunkH = height * 0.9 - HINGE_Y;
  for (let i = 0; i < bands; i++) {
    const y0 = (i / bands) * trunkH;
    const r0 = trunkRadius * (0.97 - (i / bands) * 0.6);
    const r1 = trunkRadius * (0.97 - ((i + 1) / bands) * 0.6);
    const dark = rng.chance(0.3);
    parts.push(
      cylinder(r0, r1, trunkH / bands, 7, dark ? palette.birchMark : palette.birchBark, false)
        .at(0, y0, 0)
        .tint(0.02, rng),
    );
  }
  // Bare branches angled upward, with snow ridges on top.
  const branchCount = 7 + Math.floor(rng.next() * 4);
  for (let i = 0; i < branchCount; i++) {
    const y = trunkH * rng.range(0.35, 0.95);
    const len = height * rng.range(0.14, 0.26) * (1.1 - y / trunkH);
    const branch = cylinder(trunkRadius * 0.22, trunkRadius * 0.06, len, 5, palette.birchBark)
      .rot(0, 0, rng.range(0.6, 1.1))
      .rot(0, rng.range(0, Math.PI * 2), 0)
      .at(0, y, 0)
      .paint(palette.snowLit, snowTop);
    parts.push(branch);
    // Twig fan.
    for (let k = 0; k < 2; k++) {
      parts.push(
        cylinder(trunkRadius * 0.05, 0.005, len * 0.5, 4, palette.birchMark, false)
          .rot(0, 0, rng.range(0.3, 1.3))
          .rot(0, rng.range(0, Math.PI * 2), 0)
          .at(0, y + len * 0.4, 0),
      );
    }
  }
  return { stump, crown: merge(...parts), height, trunkRadius, hingeY: HINGE_Y };
}

/** A dark wedge cut for the felling notch; scale x/z grows with progress. */
export function notch(trunkRadius: number): Part {
  return box(trunkRadius * 1.2, 0.14, trunkRadius * 0.9, 0x6b4f3a).paint(
    palette.woodSeasoned,
    (_c, n) => n.y < -0.5,
  );
}
