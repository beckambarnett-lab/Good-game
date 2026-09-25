import { describe, expect, it } from 'vitest';
import type { Sim } from '../../src/sim/Sim.ts';
import { migrate, SaveMigrationError, SaveTooNewError } from '../../src/sim/save/Migrations.ts';
import { buildSave, restoreSave, SAVE_VERSION, type SaveFile } from '../../src/sim/save/SaveModel.ts';
import {
  MemorySaveBackend,
  type SaveHeader,
  SaveMissingError,
  SaveSlots,
} from '../../src/sim/save/SaveSlots.ts';
import { decodeSave, encodeSave, gzip, SaveCorruptError } from '../../src/sim/save/Serializer.ts';
import { makeSim } from '../fixtures/world.ts';

const meta = {
  gameVersion: '0.0.1',
  createdAt: '2026-09-24T10:00:00Z',
  savedAt: '2026-09-24T11:00:00Z',
  playSeconds: 60,
};
const header = (day: number): SaveHeader => ({
  absoluteDay: day,
  hourOfDay: 15,
  location: 'Cabin',
  coins: 0,
  playSeconds: 60,
  savedAt: meta.savedAt,
});

function worldAfter(steps: number, seed = 5): Sim {
  const sim = makeSim(seed);
  for (let i = 0; i < steps; i++) sim.step();
  return sim;
}

const utf8 = new TextEncoder();

describe('save serializer', () => {
  it('round-trips a world byte for byte, and the loaded world carries on identically', async () => {
    const sim = worldAfter(1200);
    sim.advance(30);
    const save = buildSave(sim, meta);
    const encoded = await encodeSave(save);
    const decoded = await decodeSave(encoded.gz, encoded);
    expect(JSON.stringify(decoded)).toBe(JSON.stringify(save));

    const loaded = makeSim(5);
    restoreSave(loaded, decoded);
    for (let i = 0; i < 600; i++) {
      sim.step();
      loaded.step();
    }
    expect(JSON.stringify(loaded.serialize())).toBe(JSON.stringify(sim.serialize()));
  });

  it('reports damage as SaveCorruptError', async () => {
    const encoded = await encodeSave(buildSave(worldAfter(10), meta));
    const flipped = encoded.gz.slice();
    flipped[Math.floor(flipped.length / 2)] = (flipped[Math.floor(flipped.length / 2)] as number) ^ 0xff;
    await expect(decodeSave(flipped, encoded)).rejects.toBeInstanceOf(SaveCorruptError);
    await expect(decodeSave(encoded.gz.slice(0, 20), encoded)).rejects.toBeInstanceOf(SaveCorruptError);
    await expect(decodeSave(encoded.gz, { ...encoded, crc: encoded.crc ^ 1 })).rejects.toBeInstanceOf(
      SaveCorruptError,
    );
    await expect(decodeSave(await gzip(utf8.encode('not json')))).rejects.toBeInstanceOf(SaveCorruptError);
  });

  it('refuses saves from a newer build', async () => {
    const future = { ...buildSave(worldAfter(1), meta), saveVersion: SAVE_VERSION + 1 };
    await expect(decodeSave(await gzip(utf8.encode(JSON.stringify(future))))).rejects.toBeInstanceOf(
      SaveTooNewError,
    );
  });
});

describe('save migrations', () => {
  const chain = {
    1: (s: Record<string, unknown>) => ({ ...s, coins: 0 }),
    2: (s: Record<string, unknown>) => {
      const { coins, ...rest } = s;
      return { ...rest, wallet: { coins } };
    },
  };

  it('upgrade step by step without touching the input', () => {
    const v1 = { saveVersion: 1, name: 'Robin' };
    const v3 = migrate(v1, chain, 3);
    expect(v3).toEqual({ saveVersion: 3, name: 'Robin', wallet: { coins: 0 } });
    expect(v1).toEqual({ saveVersion: 1, name: 'Robin' });
  });

  it('fail clearly on gaps, garbage and the future', () => {
    expect(() => migrate({ saveVersion: 1 }, { 1: chain[1] }, 3)).toThrow(SaveMigrationError);
    expect(() => migrate({ saveVersion: 'one' }, chain, 3)).toThrow(SaveMigrationError);
    expect(() => migrate({ saveVersion: 4 }, chain, 3)).toThrow(SaveTooNewError);
  });
});

describe('save slots', () => {
  const slotsWith = () => {
    const backend = new MemorySaveBackend();
    return { backend, slots: new SaveSlots(backend, 3) };
  };
  const saveAt = (steps: number): SaveFile => buildSave(worldAfter(steps), meta);

  it('autosaves alternate A/B and the newest loads', async () => {
    const { slots } = slotsWith();
    const order: string[] = [];
    for (let i = 1; i <= 4; i++) order.push(await slots.autosave(saveAt(i * 60), header(i)));
    expect(order).toEqual(['autoA', 'autoB', 'autoA', 'autoB']);
    const latest = await slots.loadLatestAutosave();
    expect(latest?.slot).toBe('autoB');
    expect(latest?.save.steps).toBe(240);
  });

  it('falls back to the other autosave when the newest is damaged', async () => {
    const { backend, slots } = slotsWith();
    await slots.autosave(saveAt(60), header(1));
    await slots.autosave(saveAt(120), header(2));
    const newest = await backend.get('autoB');
    if (!newest) throw new Error('missing autoB');
    newest.gz[newest.gz.length - 9] = (newest.gz[newest.gz.length - 9] as number) ^ 0x55;
    await backend.put(newest);
    const latest = await slots.loadLatestAutosave();
    expect(latest?.slot).toBe('autoA');
    expect(latest?.save.steps).toBe(60);
    // And the next autosave overwrites the damaged slot, never the last good one.
    expect(await slots.autosave(saveAt(180), header(3))).toBe('autoB');
  });

  it('ignores a write that never verified', async () => {
    const { backend, slots } = slotsWith();
    await slots.autosave(saveAt(60), header(1));
    const good = await backend.get('autoA');
    if (!good) throw new Error('missing autoA');
    await backend.put({ ...good, slot: 'autoB', seq: good.seq + 1, valid: false });
    expect((await slots.loadLatestAutosave())?.slot).toBe('autoA');
    await expect(slots.load('autoB')).rejects.toBeInstanceOf(SaveMissingError);
    expect(await slots.autosave(saveAt(90), header(2))).toBe('autoB');
  });

  it('manual slots, listing, export and import', async () => {
    const { slots } = slotsWith();
    const save = saveAt(300);
    await slots.write('manual2', save, header(9));
    await slots.autosave(saveAt(30), header(1));
    const list = await slots.list();
    expect(list.map((s) => s.slot)).toEqual(['autoA', 'manual2']);
    expect(list.every((s) => s.valid)).toBe(true);
    expect(JSON.stringify(await slots.load('manual2'))).toBe(JSON.stringify(save));
    const file = await slots.exportSlot('manual2');
    expect(JSON.stringify(await slots.importFile(file))).toBe(JSON.stringify(save));
    await expect(slots.write('manual4', save, header(1))).rejects.toThrow(/Unknown save slot/);
    await expect(slots.load('manual1')).rejects.toBeInstanceOf(SaveMissingError);
  });
});

describe('save slots under concurrency', () => {
  it('overlapping saves queue up and never share a sequence number', async () => {
    const slots = new SaveSlots(new MemorySaveBackend(), 3);
    const save = buildSave(worldAfter(30), meta);
    const results = await Promise.all([
      slots.autosave(save, header(1)),
      slots.write('manual1', save, header(1)),
      slots.autosave(save, header(1)),
    ]);
    expect(results[0]).toBe('autoA');
    expect(results[2]).toBe('autoB');
    const seqs = (await slots.list()).map((s) => s.seq).sort();
    expect(seqs).toEqual([1, 2, 3]);
  });
});
