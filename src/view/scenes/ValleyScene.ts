// The M0 valley test scene (Plan Part 8.2): the generated terrain and its forest under the daylight
// Stage. The player, footsteps and music join it as their modules land.

import { MeshLambertMaterial, type PerspectiveCamera } from 'three';
import { forestView, terrainView } from '../../data/tuning.ts';
import { wrenhollowTerrain } from '../../data/world/terrain.ts';
import type { TreeSite } from '../../sim/world/Sites.ts';
import type { GeneratedTerrain } from '../../sim/world/TerrainGen.ts';
import { Forest } from '../geo/Forest.ts';
import { TerrainMesh } from '../geo/terrain/TerrainMesh.ts';
import type { Stage } from '../render/Stage.ts';

export class ValleyScene {
  readonly world: GeneratedTerrain;
  readonly terrain: TerrainMesh;
  readonly forest: Forest;

  constructor(stage: Stage, world: GeneratedTerrain, sites: readonly TreeSite[]) {
    this.world = world;
    // Smooth-shaded: snow reads soft, and objects on it keep the flat facets (see TerrainMesh).
    const material = new MeshLambertMaterial({ vertexColors: true });
    this.terrain = new TerrainMesh(world.heightfield, world.surface, material, terrainView);
    stage.scene.add(this.terrain.mesh);
    this.forest = new Forest(sites, forestView, wrenhollowTerrain.seed);
    stage.scene.add(this.forest.group);
  }

  /** Ground height (m) at world x, z. */
  groundAt(x: number, z: number): number {
    return this.world.heightfield.sample(x, z);
  }

  update(camera: PerspectiveCamera, dt: number): void {
    this.terrain.update(camera.position, dt);
    this.forest.update(camera, dt);
  }

  /** Picks every LOD for the camera right now (after a jump, or before a screenshot). */
  settle(camera: PerspectiveCamera): void {
    this.terrain.refresh(camera.position);
    this.forest.refresh(camera);
  }
}
