// The M0 valley test scene (Plan Part 8.2): the generated terrain under the daylight Stage. The
// forest, the player, footsteps and music join it as their modules land.

import { MeshLambertMaterial, type Vector3 } from 'three';
import { terrainView } from '../../data/tuning.ts';
import type { GeneratedTerrain } from '../../sim/world/TerrainGen.ts';
import { TerrainMesh } from '../geo/terrain/TerrainMesh.ts';
import type { Stage } from '../render/Stage.ts';

export class ValleyScene {
  readonly world: GeneratedTerrain;
  readonly terrain: TerrainMesh;

  constructor(stage: Stage, world: GeneratedTerrain) {
    this.world = world;
    // Smooth-shaded: snow reads soft, and objects on it keep the flat facets (see TerrainMesh).
    const material = new MeshLambertMaterial({ vertexColors: true });
    this.terrain = new TerrainMesh(world.heightfield, world.surface, material, terrainView);
    stage.scene.add(this.terrain.mesh);
  }

  /** Ground height (m) at world x, z. */
  groundAt(x: number, z: number): number {
    return this.world.heightfield.sample(x, z);
  }

  update(camera: Vector3, dt: number): void {
    this.terrain.update(camera, dt);
  }

  /** Picks every chunk's LOD for the camera right now (after a jump, or before a screenshot). */
  settle(camera: Vector3): void {
    this.terrain.refresh(camera);
  }
}
