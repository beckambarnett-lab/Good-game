// Terrain worker (Plan Part 7.4): generates the valley and its tree sites off the main thread during
// Loading and transfers the heightfield and surface arrays back.
import { wrenhollowForests } from '../data/world/forests.ts';
import { wrenhollowTerrain } from '../data/world/terrain.ts';
import { generateSites } from '../sim/world/Sites.ts';
import { generateTerrain } from '../sim/world/TerrainGen.ts';
import { payloadTransfers, toPayload } from '../sim/world/terrainPayload.ts';

self.onmessage = () => {
  const t0 = performance.now();
  const terrain = generateTerrain(wrenhollowTerrain);
  const sites = generateSites(wrenhollowTerrain, wrenhollowForests, terrain);
  const payload = toPayload(terrain, sites, performance.now() - t0);
  (self as unknown as Worker).postMessage(payload, payloadTransfers(payload));
};
