// Entry point: boots the App. `?shot=S01` frames an art QA shot for `npm run shots`;
// `?selftest` runs in-browser checks for the e2e suite instead. `?dev=1` shows the dev overlay
// and cheats (dev builds have them too, behind F3). `?look=proposed` draws the look in review.

import { App, type AppOptions } from './app/App.ts';
import { shots } from './data/shots.ts';
import { proposedLook } from './data/tuning.ts';

const params = new URLSearchParams(location.search);
const host = document.getElementById('app');

if (params.has('selftest')) {
  void import('./dev/selfTest.ts').then(({ saveRoundTrip }) => {
    (window as unknown as { __hearthwood: object }).__hearthwood = { saveRoundTrip };
  });
} else if (host) {
  const shotId = params.get('shot');
  const shot = shotId ? shots.find((s) => s.id === shotId) : undefined;
  const devTools = params.has('dev') ? 'visible' : import.meta.env.DEV ? 'hidden' : undefined;
  const options: AppOptions = {};
  if (devTools) options.devTools = devTools;
  // `?look=proposed` draws the look in review, for side-by-side shots.
  if (params.get('look') === 'proposed') options.look = structuredClone(proposedLook);
  const app = new App(host, options);
  (window as unknown as { __hearthwood: object }).__hearthwood = { app };
  if (shotId && !shot) app.fail(`Unknown shot ${shotId}`);
  else app.start(shot).catch((e: unknown) => app.fail(e instanceof Error ? e.message : String(e)));
}
