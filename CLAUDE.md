# CLAUDE.md: working on Clobberfield

Clobberfield is a physics army battle sandbox, shipped as one self-contained HTML page (the artifact).
It uses Three.js r128 (UMD global, cdnjs) and cannon-es 0.20.0 (ESM, jsdelivr), bundled by esbuild.

- `src/sim/` and `src/data/` are headless, deterministic and Node-runnable. They never import view, ui or audio code, touch the DOM, or use `Math.random` (use `sim.rng`). `npm run check` enforces this.
- `docs/schema.md` is the UnitDef contract the engine reads. `src/data/factions/grow.js` is the reference faction.
- Before committing, run `npm run check`, `npm run build` and `npm test`. For UI work, run `npm run e2e` and look at `artifacts/e2e/*.png`.
- Playwright uses the preinstalled Chromium at `/opt/pw-browsers/chromium`; never run `playwright install`. The CDNs are unreachable from the container, so `tools/harness.mjs` routes them to node_modules.
