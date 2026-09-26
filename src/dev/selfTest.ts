// In-browser self-test (loaded only with `?selftest`): a real IndexedDB + CompressionStream save
// round trip, used by the e2e suite to prove what Node tests can't.

import { IdbSaveBackend } from '../app/IdbSaveBackend.ts';
import { clock as clockTuning, save as saveTuning, sim as simTuning } from '../data/tuning.ts';
import { ClockSystem } from '../sim/clock/ClockSystem.ts';
import { Sim } from '../sim/Sim.ts';
import { buildSave, restoreSave } from '../sim/save/SaveModel.ts';
import { type SaveHeader, SaveSlots } from '../sim/save/SaveSlots.ts';

const SELF_TEST_SEED = 4242;
const STEPS_BETWEEN_SAVES = 600;

export async function saveRoundTrip(): Promise<{ ok: boolean; detail: string }> {
  const makeSim = () => new Sim(SELF_TEST_SEED, simTuning.stepHz, [new ClockSystem(clockTuning)]).init();
  const sim = makeSim();
  const slots = new SaveSlots(
    new IdbSaveBackend(`hearthwood-selftest-${Date.now()}`),
    saveTuning.manualSlots,
  );
  const now = new Date().toISOString();
  const meta = { gameVersion: 'selftest', createdAt: now, savedAt: now, playSeconds: 0 };
  const header: SaveHeader = {
    absoluteDay: 1,
    hourOfDay: 15,
    location: 'Cabin',
    coins: 0,
    playSeconds: 0,
    savedAt: now,
  };

  const written: string[] = [];
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < STEPS_BETWEEN_SAVES; i++) sim.step();
    written.push(await slots.autosave(buildSave(sim, meta), header));
  }
  const latest = await slots.loadLatestAutosave();
  if (!latest) return { ok: false, detail: 'no autosave could be loaded' };
  const loaded = makeSim();
  restoreSave(loaded, latest.save);
  const identical = JSON.stringify(loaded.serialize()) === JSON.stringify(sim.serialize());
  const detail = `${written.join(',')} → ${latest.slot}, identical=${identical}`;
  return { ok: identical && written.join(',') === 'autoA,autoB' && latest.slot === 'autoB', detail };
}
