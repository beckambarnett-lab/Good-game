// Terrain worker (Plan Part 7.4): generates the valley off the main thread during Loading and
// transfers the heightfield and surface arrays back.
import { wrenhollowTerrain } from '../data/world/terrain.ts';
import { generateTerrain } from '../sim/world/TerrainGen.ts';
import { payloadTransfers, toPayload } from '../sim/world/terrainPayload.ts';

self.onmessage = () => {
  const t0 = performance.now();
  const payload = toPayload(generateTerrain(wrenhollowTerrain), performance.now() - t0);
  (self as unknown as Worker).postMessage(payload, payloadTransfers(payload));
};
