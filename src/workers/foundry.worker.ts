// Sound Foundry worker: renders instrument zones and SFX variants off the main thread and
// transfers the PCM back.
import { renderZone, type ZoneJob } from '../dsp/bank.ts';
import { renderSfx, type SfxId } from '../dsp/sfx/recipes.ts';

export type FoundryJob = { kind: 'zone'; job: ZoneJob } | { kind: 'sfx'; id: SfxId; variant: number };

interface Request {
  id: number;
  work: FoundryJob;
}

self.onmessage = (e: MessageEvent<Request>) => {
  const w = e.data.work;
  const data = w.kind === 'zone' ? renderZone(w.job) : renderSfx(w.id, w.variant);
  (self as unknown as Worker).postMessage({ id: e.data.id, data }, [data.buffer]);
};
