// Entry point. The M0 app shell replaces this placeholder boot.
const app = document.getElementById('app');
if (app) app.textContent = 'Hearthwood — foundations in progress.';

// `?selftest` exposes in-browser checks for the e2e suite (loaded as a separate chunk).
if (new URLSearchParams(location.search).has('selftest')) {
  void import('./dev/selfTest.ts').then(({ saveRoundTrip }) => {
    (window as unknown as { __hearthwood: object }).__hearthwood = { saveRoundTrip };
  });
}
