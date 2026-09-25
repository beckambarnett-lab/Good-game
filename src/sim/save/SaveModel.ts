// The save file (Plan Part 7.7): metadata plus the sim snapshot. Wall-clock fields come from the
// app; the sim itself never reads them.

import type { Sim, SimSnapshot } from '../Sim.ts';

/** Bump when the save shape changes, and add `migrations[previous]` (Migrations.ts) + a fixture. */
export const SAVE_VERSION = 1;

export interface SaveMeta {
  gameVersion: string;
  /** ISO timestamps from the app's wall clock. */
  createdAt: string;
  savedAt: string;
  /** Real seconds of play. */
  playSeconds: number;
}

export interface SaveFile extends SaveMeta, SimSnapshot {
  saveVersion: number;
}

export function buildSave(sim: Sim, meta: SaveMeta): SaveFile {
  const snap = sim.serialize();
  return {
    saveVersion: SAVE_VERSION,
    gameVersion: meta.gameVersion,
    createdAt: meta.createdAt,
    savedAt: meta.savedAt,
    playSeconds: meta.playSeconds,
    seed: snap.seed,
    steps: snap.steps,
    rng: snap.rng,
    systems: snap.systems,
  };
}

/** Loads a (migrated, current-version) save into an initialised sim with the same seed. */
export function restoreSave(sim: Sim, save: SaveFile): void {
  sim.deserialize(save, save.saveVersion);
}

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

/** Structural check of a current-version save; throws with the first problem found. */
export function assertSaveShape(x: unknown): asserts x is SaveFile {
  const fail = (why: string): never => {
    throw new TypeError(`Save file: ${why}`);
  };
  if (!isRecord(x)) fail('not an object');
  const s = x as Record<string, unknown>;
  if (s.saveVersion !== SAVE_VERSION) fail(`saveVersion ${String(s.saveVersion)} is not ${SAVE_VERSION}`);
  for (const k of ['gameVersion', 'createdAt', 'savedAt'] as const) {
    if (typeof s[k] !== 'string') fail(`${k} is not a string`);
  }
  for (const k of ['playSeconds', 'seed', 'steps'] as const) {
    if (typeof s[k] !== 'number' || !Number.isFinite(s[k])) fail(`${k} is not a number`);
  }
  if (!isRecord(s.systems)) fail('systems is not an object');
  if (!isRecord(s.rng)) fail('rng is not an object');
  for (const [label, state] of Object.entries(s.rng as Record<string, unknown>)) {
    if (!Array.isArray(state) || state.length !== 4) fail(`rng stream '${label}' is malformed`);
  }
}
