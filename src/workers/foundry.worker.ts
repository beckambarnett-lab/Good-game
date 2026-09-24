// Sound Foundry worker: renders instrument zones off the main thread and transfers the PCM back.
import { renderZone, type ZoneJob } from '../dsp/bank.ts';

interface Request {
  id: number;
  job: ZoneJob;
}

self.onmessage = (e: MessageEvent<Request>) => {
  const data = renderZone(e.data.job);
  (self as unknown as Worker).postMessage({ id: e.data.id, data }, [data.buffer]);
};
