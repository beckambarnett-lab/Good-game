import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { forestView } from '../../src/data/tuning.ts';
import type { TreeSite } from '../../src/sim/world/Sites.ts';
import { Forest, forestLod } from '../../src/view/geo/Forest.ts';

const site = (id: number, x: number, z: number, over: Partial<TreeSite> = {}): TreeSite => ({
  id,
  area: 'test',
  zone: 'wild',
  x,
  z,
  y: 0,
  species: 'pine',
  size: 'medium',
  height: 12,
  state: 'mature',
  fellable: false,
  yaw: 0,
  lean: 0,
  tint: 0,
  ...over,
});

/** A camera at the origin looking down −z. */
function camera(): PerspectiveCamera {
  const cam = new PerspectiveCamera(55, 16 / 9, 0.1, 1000);
  cam.position.set(0, 2, 0);
  cam.lookAt(0, 2, -1);
  cam.updateProjectionMatrix();
  return cam;
}

describe('forest LOD', () => {
  it('follows distance with hysteresis', () => {
    const d = forestView.lodDistances;
    const h = forestView.lodHysteresis;
    expect(forestLod(10, -1, d, h)).toBe(0);
    expect(forestLod(500, -1, d, h)).toBe(2);
    expect(forestLod(d[0] + h / 2, 0, d, h)).toBe(0);
    expect(forestLod(d[0] - h / 2, 1, d, h)).toBe(1);
    expect(forestLod(d[0] + h * 1.5, 0, d, h)).toBe(1);
  });
});

describe('Forest', () => {
  it('draws only what the camera sees, at each tree’s LOD', () => {
    const sites = [
      site(0, 0, -20), // near, ahead → LOD0
      site(1, 3, -80), // mid → LOD1
      site(2, -5, -200), // far → LOD2
      site(3, 0, 30), // behind → culled
      site(4, 2, -10, { state: 'sapling' }), // sapling → LOD1 model
      site(5, -2, -30, { state: 'stump' }), // near stump
      site(6, 1, -150, { state: 'stump' }), // stump too far to draw
      site(7, 4, -25, { species: 'birch' }),
    ];
    const forest = new Forest(sites, forestView, 7);
    forest.refresh(camera());
    const lods = forest.trees.map((t) => t.lod);
    expect(lods).toEqual([0, 1, 2, -1, 0, 0, -1, 0]);
    const counts = forest.counts();
    expect(counts['pine:1:0']).toBe(2); // the mid tree and the sapling
    expect(counts['pine:2:0']).toBe(1);
    expect(counts.stump).toBe(1);
    expect(counts['birch:0:1']).toBe(1); // site 7 → variant 7 % 3
    expect(forest.visible()).toBe(6);
  });

  it('stays within about a dozen draw calls', () => {
    const forest = new Forest([site(0, 0, -20)], forestView, 7);
    expect(forest.group.children.length).toBeLessThanOrEqual(12);
  });
});
