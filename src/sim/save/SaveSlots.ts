// Save slots (Plan Part 2.11): two rotating autosaves (A/B, so a bad write never destroys the last
// good save) plus manual slots, with verify-after-write and export/import. Storage is injected:
// IndexedDB in the browser (src/app/IdbSaveBackend.ts), memory in Node tests and tools.

import type { SaveFile } from './SaveModel.ts';
import { decodeSave, encodeSave, SaveCorruptError } from './Serializer.ts';

export type SlotId = 'autoA' | 'autoB' | `manual${number}`;

/** What a slot card shows without decoding the whole save. */
export interface SaveHeader {
  absoluteDay: number;
  hourOfDay: number;
  location: string;
  coins: number;
  playSeconds: number;
  savedAt: string;
  /** Encoded image bytes (320 × 180), when the view provides one. */
  thumbnail?: Uint8Array;
}

export interface SaveRecord {
  slot: SlotId;
  /** Monotonic write counter across all slots: higher is newer. */
  seq: number;
  /** False until the write has been read back and verified. */
  valid: boolean;
  header: SaveHeader;
  crc: number;
  byteLength: number;
  gz: Uint8Array;
}

export interface SaveBackend {
  get(slot: SlotId): Promise<SaveRecord | undefined>;
  put(record: SaveRecord): Promise<void>;
  delete(slot: SlotId): Promise<void>;
  all(): Promise<SaveRecord[]>;
}

/** In-memory backend with structured-clone semantics, like IndexedDB. */
export class MemorySaveBackend implements SaveBackend {
  private readonly records = new Map<SlotId, SaveRecord>();

  async get(slot: SlotId): Promise<SaveRecord | undefined> {
    const r = this.records.get(slot);
    return r ? structuredClone(r) : undefined;
  }

  async put(record: SaveRecord): Promise<void> {
    this.records.set(record.slot, structuredClone(record));
  }

  async delete(slot: SlotId): Promise<void> {
    this.records.delete(slot);
  }

  async all(): Promise<SaveRecord[]> {
    return [...this.records.values()].map((r) => structuredClone(r));
  }
}

export class SaveMissingError extends Error {
  constructor(slot: SlotId) {
    super(`There is no save in slot ${slot}.`);
    this.name = 'SaveMissingError';
  }
}

export interface SlotSummary {
  slot: SlotId;
  valid: boolean;
  seq: number;
  header: SaveHeader;
}

export const AUTOSAVE_SLOTS: readonly SlotId[] = ['autoA', 'autoB'];

export class SaveSlots {
  private readonly backend: SaveBackend;
  private queue: Promise<unknown> = Promise.resolve();
  readonly manualSlots: readonly SlotId[];

  constructor(backend: SaveBackend, manualSlotCount: number) {
    this.backend = backend;
    this.manualSlots = Array.from({ length: manualSlotCount }, (_, i) => `manual${i + 1}` as SlotId);
  }

  /** Serialize → gzip → write → read back → verify → only then mark valid. */
  write(slot: SlotId, save: SaveFile, header: SaveHeader): Promise<SaveRecord> {
    return this.exclusive(() => this.writeNow(slot, save, header));
  }

  /**
   * Writes to the autosave slot that does not hold the newest *good* autosave (checked by decoding,
   * so a damaged newer slot is the one overwritten, never the last good save).
   */
  autosave(save: SaveFile, header: SaveHeader): Promise<SlotId> {
    return this.exclusive(async () => {
      const good = await this.newestGoodAutosave();
      const target: SlotId = good?.slot === 'autoA' ? 'autoB' : 'autoA';
      await this.writeNow(target, save, header);
      return target;
    });
  }

  async load(slot: SlotId): Promise<SaveFile> {
    const rec = await this.backend.get(slot);
    if (!rec?.valid) throw new SaveMissingError(slot);
    return decodeSave(rec.gz, rec);
  }

  /** The newest autosave that verifies, falling back to the other slot if the newest is damaged. */
  async loadLatestAutosave(): Promise<{ slot: SlotId; save: SaveFile } | undefined> {
    return this.newestGoodAutosave();
  }

  private async newestGoodAutosave(): Promise<{ slot: SlotId; save: SaveFile } | undefined> {
    const recs = (await Promise.all(AUTOSAVE_SLOTS.map((s) => this.backend.get(s))))
      .filter((r): r is SaveRecord => r?.valid === true)
      .sort((x, y) => y.seq - x.seq);
    for (const rec of recs) {
      try {
        return { slot: rec.slot, save: await decodeSave(rec.gz, rec) };
      } catch (e) {
        if (!(e instanceof SaveCorruptError)) throw e;
      }
    }
    return undefined;
  }

  /** Slot cards, newest first. */
  async list(): Promise<SlotSummary[]> {
    const recs = await this.backend.all();
    return recs
      .map((r) => ({ slot: r.slot, valid: r.valid, seq: r.seq, header: r.header }))
      .sort((x, y) => y.seq - x.seq);
  }

  async delete(slot: SlotId): Promise<void> {
    await this.backend.delete(slot);
  }

  /** The `.hearthwood` file for a slot (gzipped JSON), verified before it leaves. */
  async exportSlot(slot: SlotId): Promise<Uint8Array> {
    const rec = await this.backend.get(slot);
    if (!rec?.valid) throw new SaveMissingError(slot);
    await decodeSave(rec.gz, rec);
    return rec.gz;
  }

  /** Reads a `.hearthwood` file (gzip's own CRC catches damage), migrating older versions. */
  importFile(bytes: Uint8Array): Promise<SaveFile> {
    return decodeSave(bytes);
  }

  private async writeNow(slot: SlotId, save: SaveFile, header: SaveHeader): Promise<SaveRecord> {
    if (!AUTOSAVE_SLOTS.includes(slot) && !this.manualSlots.includes(slot)) {
      throw new Error(`Unknown save slot ${slot}`);
    }
    const encoded = await encodeSave(save);
    const seq = (await this.highestSeq()) + 1;
    await this.backend.put({ slot, seq, valid: false, header, ...encoded });
    const back = await this.backend.get(slot);
    if (!back || back.seq !== seq) throw new SaveCorruptError(`slot ${slot} did not keep the write`);
    await decodeSave(back.gz, back);
    const verified: SaveRecord = { ...back, valid: true };
    await this.backend.put(verified);
    return verified;
  }

  /** Runs writes one at a time (an autosave on tab-hide can land mid manual save). */
  private exclusive<T>(job: () => Promise<T>): Promise<T> {
    const run = this.queue.then(job, job);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async highestSeq(): Promise<number> {
    let max = 0;
    for (const r of await this.backend.all()) max = Math.max(max, r.seq);
    return max;
  }
}
