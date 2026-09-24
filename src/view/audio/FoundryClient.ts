// Renders instrument banks using a small worker pool, falling back to the main thread (in
// yielding chunks) if workers are unavailable, e.g. inside a restrictive sandbox.

import {
  type InstrumentBank,
  type InstrumentId,
  renderZone,
  sampleRateOf,
  type ZoneJob,
  zoneJobs,
} from '../../dsp/bank.ts';

export type Progress = (done: number, total: number) => void;

export async function renderBanks(
  instruments: readonly InstrumentId[],
  seed: number,
  onProgress?: Progress,
): Promise<Map<InstrumentId, InstrumentBank>> {
  const jobs = instruments.flatMap((id) => zoneJobs(id, seed));
  // Render the most-used instrument first so playback can start sooner in the future.
  const results = new Array<Float32Array | undefined>(jobs.length);
  let done = 0;
  const report = () => onProgress?.(++done, jobs.length);

  let workers: Worker[] = [];
  try {
    const count = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
    workers = Array.from(
      { length: count },
      () => new Worker(new URL('../../workers/foundry.worker.ts', import.meta.url), { type: 'module' }),
    );
    await runWithWorkers(workers, jobs, results, report);
  } catch {
    workers.forEach((w) => {
      w.terminate();
    });
    workers = [];
    for (let i = 0; i < jobs.length; i++) {
      if (results[i]) continue;
      results[i] = renderZone(jobs[i] as ZoneJob);
      report();
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    workers.forEach((w) => {
      w.terminate();
    });
  }

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
    const data = results[i];
    if (data) bank.zones.push({ midi: job.midi, velocity: job.velocity, data });
  });
  return banks;
}

function runWithWorkers(
  workers: Worker[],
  jobs: ZoneJob[],
  results: (Float32Array | undefined)[],
  report: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let next = 0;
    let finished = 0;
    const timeout = setTimeout(() => reject(new Error('Foundry workers timed out')), 60_000);
    const feed = (w: Worker) => {
      if (next >= jobs.length) return;
      const id = next++;
      w.postMessage({ id, job: jobs[id] });
    };
    for (const w of workers) {
      w.onmessage = (e: MessageEvent<{ id: number; data: Float32Array }>) => {
        results[e.data.id] = e.data.data;
        report();
        finished++;
        if (finished === jobs.length) {
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
