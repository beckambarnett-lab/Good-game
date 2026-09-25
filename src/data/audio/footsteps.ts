// Which footstep each ground surface makes (Plan Part 6.8). The valley's M0 surfaces: snow off the
// roads is fresh powder, plowed roads and the rail bed are packed snow, and lake and creek are ice.
// Snow patches, trail wear and interiors join the resolution order as they land (M1).

import type { SfxId } from '../../dsp/sfx/recipes.ts';
import type { SurfaceKind } from '../world/terrain.ts';

export const surfaceSteps: Readonly<Record<SurfaceKind, SfxId>> = {
  snow: 'stepSnow',
  road: 'stepPacked',
  rail: 'stepPacked',
  lakeIce: 'stepIce',
  creekIce: 'stepIce',
};

/** Step sounds that take the cold squeak layer. */
export const squeakySteps: ReadonlySet<SfxId> = new Set(['stepPacked']);
