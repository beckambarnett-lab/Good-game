// Runs terrain generation in its worker and rebuilds the result on the main thread.

import type { GeneratedTerrain } from '../../../sim/world/TerrainGen.ts';
import { fromPayload, type TerrainPayload } from '../../../sim/world/terrainPayload.ts';

export function generateTerrainInWorker(): Promise<{ terrain: GeneratedTerrain; ms: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../../workers/terrain.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<TerrainPayload>) => {
      worker.terminate();
      resolve({ terrain: fromPayload(e.data), ms: e.data.ms });
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(e.error ?? new Error(`Terrain worker failed: ${e.message}`));
    };
    worker.postMessage(null);
  });
}
