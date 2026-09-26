// IndexedDB storage for save slots (Plan Part 2.11). A tiny wrapper: one object store keyed by
// slot id. Writes resolve only when their transaction commits.

import type { SaveBackend, SaveRecord, SlotId } from '../sim/save/SaveSlots.ts';

const STORE = 'saves';
const DB_VERSION = 1;

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const committed = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });

export class IdbSaveBackend implements SaveBackend {
  private readonly db: Promise<IDBDatabase>;

  constructor(name = 'hearthwood') {
    this.db = new Promise((resolve, reject) => {
      const open = indexedDB.open(name, DB_VERSION);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(STORE))
          open.result.createObjectStore(STORE, { keyPath: 'slot' });
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
      open.onblocked = () => reject(new Error('IndexedDB is blocked by another open tab'));
    });
  }

  async get(slot: SlotId): Promise<SaveRecord | undefined> {
    const tx = (await this.db).transaction(STORE, 'readonly');
    return (await request(tx.objectStore(STORE).get(slot))) as SaveRecord | undefined;
  }

  async put(record: SaveRecord): Promise<void> {
    const tx = (await this.db).transaction(STORE, 'readwrite', { durability: 'strict' });
    tx.objectStore(STORE).put(record);
    await committed(tx);
  }

  async delete(slot: SlotId): Promise<void> {
    const tx = (await this.db).transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(slot);
    await committed(tx);
  }

  async all(): Promise<SaveRecord[]> {
    const tx = (await this.db).transaction(STORE, 'readonly');
    return (await request(tx.objectStore(STORE).getAll())) as SaveRecord[];
  }
}
