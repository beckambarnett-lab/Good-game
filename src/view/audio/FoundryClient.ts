// Renders instrument banks and SFX variants using a small worker pool, falling back to the main
// thread (in yielding chunks) if workers are unavailable, e.g. inside a restrictive sandbox.

import {
  type InstrumentBank,
  type InstrumentId,
  renderZone,
  sampleRateOf,
  zoneJobs,
} from '../../dsp/bank.ts';
import { renderSfx, SFX_VARIANTS, type SfxId } from '../../dsp/sfx/recipes.ts';
import type { FoundryJob } from '../../workers/foundry.worker.ts';

export type Progress = (done: number, total: number) => void;

function renderLocal(w: FoundryJob): Float32Array {
  return w.kind === 'zone' ? renderZone(w.job) : renderSfx(w.id, w.variant);
}

/** Render a list of jobs, in parallel where possible. Results keep the input order. */
export async function renderJobs(work: FoundryJob[], onProgress?: Progress): Promise<Float32Array[]> {
  const results = new Array<Float32Array | undefined>(work.length);
  let done = 0;
  const report = () => onProgress?.(++done, work.length);
  let workers: Worker[] = [];
  try {
    const count = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
    workers = Array.from(
      { length: count },
      () => new Worker(new URL('../../workers/foundry.worker.ts', import.meta.url), { type: 'module' }),
    );
    await runWithWorkers(workers, work, results, report);
  } catch {
    for (let i = 0; i < work.length; i++) {
      if (results[i]) continue;
      results[i] = renderLocal(work[i] as FoundryJob);
      report();
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    for (const w of workers) w.terminate();
  }
  return results as Float32Array[];
}

export async function renderBanks(
  instruments: readonly InstrumentId[],
  seed: number,
  onProgress?: Progress,
): Promise<Map<InstrumentId, InstrumentBank>> {
  const jobs = instruments.flatMap((id) => zoneJobs(id, seed));
  const data = await renderJobs(
    jobs.map((job) => ({ kind: 'zone', job })),
    onProgress,
  );
  const banks = new Map<InstrumentId, InstrumentBank>();
  jobs.forEach((job, i) => {
    let bank = banks.get(job.instrument);
    if (!bank) {
      bank = {
        id: job.instrument,
        sampleRate: sampleRateOf(job.instrument),
        sustained: job.instrument === 'warmPad',
        zones: [],
      };
      banks.set(job.instrument, bank);
    }
    const d = data[i];
    if (d) bank.zones.push({ midi: job.midi, velocity: job.velocity, data: d });
  });
  return banks;
}

export async function renderSfxBank(
  ids: readonly SfxId[],
  onProgress?: Progress,
): Promise<Map<SfxId, Float32Array[]>> {
  const work: FoundryJob[] = ids.flatMap((id) =>
    Array.from({ length: SFX_VARIANTS[id] }, (_, variant) => ({ kind: 'sfx' as const, id, variant })),
  );
  const data = await renderJobs(work, onProgress);
  const out = new Map<SfxId, Float32Array[]>();
  work.forEach((w, i) => {
    if (w.kind !== 'sfx') return;
    const list = out.get(w.id) ?? [];
    const d = data[i];
    if (d) list.push(d);
    out.set(w.id, list);
  });
  return out;
}

function runWithWorkers(
  workers: Worker[],
  work: FoundryJob[],
  results: (Float32Array | undefined)[],
  report: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let next = 0;
    let finished = 0;
    const timeout = setTimeout(() => reject(new Error('Foundry workers timed out')), 60_000);
    const feed = (w: Worker) => {
      if (next >= work.length) return;
      const id = next++;
      w.postMessage({ id, work: work[id] });
    };
    for (const w of workers) {
      w.onmessage = (e: MessageEvent<{ id: number; data: Float32Array }>) => {
        results[e.data.id] = e.data.data;
        report();
        finished++;
        if (finished === work.length) {
          clearTimeout(timeout);
          resolve();
        } else feed(w);
      };
      w.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
      };
      feed(w);
    }
  });
}
