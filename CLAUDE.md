# CLAUDE.md — working on Hearthwood

**Hearthwood** is a cozy, low-poly, third-person winter game for desktop web browsers. It's built with Three.js, TypeScript and Vite.
- You play the new firewood supplier of Wrenhollow, a small mountain town.
- The loop: fell, buck, split, stack, season, deliver.
- Around it: shovel and plow snow, stay warm, and befriend 14 townsfolk through one long winter.
- No fail states. Everything should feel tactile and calm.

## Read first, every session
1. `docs/progress.md`: current milestone, the next unchecked task, known issues.
2. `docs/plan/README.md`: the plan index. Open only the Parts your task needs.
3. The milestone's section in `docs/plan/08-roadmap.md`, and the Definition of Done in `docs/plan/07-technical-architecture.md` (7.11).

## Session protocol (from Plan Part 8.1)
1. Take the next unchecked task of the current milestone in `docs/progress.md`.
2. Implement it to the Definition of Done.
3. Run the checks. **Look at the screenshots and spectrograms** and fix what's wrong.
4. Update `docs/progress.md`: done, next, issues. Record non-obvious decisions as ADRs in `docs/decisions/`.
5. Make small, descriptive commits. Push the milestone branch and keep its PR green.
6. At milestone end:
   1. Deploy the playtest build.
   2. Post a playtest brief for the user.
   3. Triage their feedback into `docs/playtests/Mx.md`.
   4. Must-fixes block the next milestone.

## Hard rules
- **Review gate:** feel-critical features (music, SFX, ambience, minigames, controls, camera, looks) are built as a standalone Lab first. They enter the game **only after the user says "approved"** (Plan Part 8.0). Everything else is verified with tests.
- **Pillars:** tactile satisfaction, calm, a living town, gentle progression. Every feature is judged against them.
- **Polish bar:** no feature is done without animation, particles, layered sound and a world response (Plan Part 9.1). The vertical slice (M1) must already feel finished.
- **No paid, ripped or copyrighted assets.**
  - Music is always generated in code.
  - SFX are synthesized by the Sound Foundry. CC0 recordings are a documented last resort only (Plan Part 10, R4).
  - Fonts are OFL, self-hosted with their licenses.
- **Sim/view boundary:** `src/sim/`, `src/music/` and `src/dsp/` must never import from `src/view/`, the DOM, WebGL or WebAudio. They must run in Node.
- **Tunables live in `src/data/tuning.ts`.** Content lives in `src/data/`. No magic numbers in code. No `Math.random` in sim/music/dsp: use the seeded RNG forks.
- **Never claim something works without running the checks.** Report failures honestly.

## Environment notes (cloud container)
- **Playwright:** 1.56.x, with Chromium preinstalled at `/opt/pw-browsers/chromium`. Use `executablePath`; **never run `playwright install`**.
  - Headless Chromium has WebGL2 (SwiftShader) and OfflineAudioContext.
  - There is **no WebGPU, no real GPU and no speakers**. Real-hardware performance comes from the in-game Benchmark the user runs; audio quality comes from the user via the Sound Board.
- **Blender:** headless via `uv run --with 'bpy==4.5.*' python art/blender/build.py`. `download.blender.org` is blocked; PyPI works; apt `blender` 4.0 is a fallback. Generated `.glb` files are committed, so the game never needs Blender to build.
- Node 22, Python 3.11 and `uv` are available.

## Commands
- `npm run dev`: Vite dev server. `npm run build` / `npm run preview`: the production build.
- `npm run check`: Biome lint, `tsc` typecheck and the sim/view boundary check. Run before every commit.
- `npm test`: Vitest unit and sim tests. `npm run e2e`: Playwright against the built app.
- `npm run audio [seeds…]`: offline renders of the soundtrack, every SFX variant and a footstep walk, with spectrograms and QA metrics → `artifacts/audio/`.
- `npm run map`: the terrain relief map → `artifacts/terrain/map.png`. Look at it after any terrain change.
- `npm run shots [S01 …] [--no-build]`: art QA shots (`src/data/shots.ts`) in headless Chromium → `artifacts/shots/` + render budgets. **Look at the PNGs.**
- `npm run lab:build <name>` / `npm run lab:check`: build a Review Lab for publishing, and its headless checks.
- The app accepts `?shot=S04` (frame a QA shot) and `?selftest` (in-browser checks for e2e).
- Still to come: `soak` (M0), then `content`, `econ`, `perf` and `assets` as their milestones land.

## Current status
M0 (Foundations) in progress. Labs #1 (soundtrack), #2 (felling) and #3 (winter walk) are in review. See `docs/progress.md`.
