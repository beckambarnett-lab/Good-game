# Gauntlet log: 雫テラス bridge

Each round appends what changed, all critic scores, the top remaining gaps, decisions about conflicting references, and the commit hash.

## How to run the harness
```sh
cd gauntlet/harness && npm i && ./fetch-fonts.sh   # playwright-core + three, and a local copy of the Google Fonts
node ../../build.mjs                  # build dist/index.html (run from the repo root)
node shoot.mjs refs --round N         # every stage × every reference angle → gauntlet/captures/round_N/
node shoot.mjs sheets --round N       # progression and continuity sheets
node shoot.mjs cam --stage final --pos x,y,z --at x,y,z --fov 70 --ref bridge_after_high.png --out x.png
node shoot.mjs seq --stage 1 --angle street --do "<js>" --frames 24 --out dir    # reveal / install recordings
node shoot.mjs walk --stage 1 --device phone --out dir                          # player-view walk (desktop or touch)
```
- **Stages** come from the game's own `UPG` entries tagged `bridge: n` (`stages.mjs`).
- **Debug hooks** run only when the page sets `window.__szDebug`: `window.__sz(code)` evaluates in the game's scope, and `window.__szPhoto` parks the camera (`l_cheat.js`).

## Setup (round 0)
- **Branch:** `gauntlet-bridge`, from `claude/shizuku`. There's no `gauntlet-exterior` branch and no `UPGRADE_MAP.md`, so there was no tea house track to build on.
- **Reference names:** the references were saved earlier under other names and renamed to the brief's names.
  - **High view:** the brief says `bridge_after_high` is the same angle as `bridge_before_high`, so it's the shot along the shop's balcony walkway.
  - **Balcony view:** that leaves `bridge_after_balcony` as the elevated head-on view down the street. It reads as taken from a balcony on the building opposite.
- **Missing references:** `exterior_start.png` and `exterior_final.png` weren't supplied. Until they are, the tea house as drawn in the bridge references is canonical for it.
- **Topology** (the references disagree; the game's existing layout matches the majority, so it stays):
  - The shop is at the bridge's near end, on the 2F balcony side.
  - The konbini is across the street, under the far end.
  - The far stairs are the foreground stairs in B-street / A-cross and the left stairs in A-balcony.
  - Where A-cross shows ほしマート under the bridge on the shop side, that's treated as the soba frontage; all the other views put the konbini opposite the shop.
- **Never pushed.** The brief forbids pushing, so all work is local commits on `gauntlet-bridge`. Warning: this cloud container is temporary, and the work exists only here until someone pushes it.
- **Camera calibration** (round 0, five angles): the street, high and konbini views already line up well with the references; the terrace and balcony views are approximate. Calibration continues in later rounds.

### Baseline problems seen during calibration (before any critic)
- The road reflection is a wavy, speckled smear (a bug).
- Materials are flat and untextured: no rust, graffiti or paint wear on the bridge.
- The konbini is "AMA MART" with rainbow stripes, where it should be ほしマート with teal, white and orange stripes and a star.
- The lighting is cold and blue overall, and the city lacks the warm pools of light the references have.
- **Plumbing before round 1** (commit 5eecf4a):
  - The nine new bridge upgrades exist as data, with empty visuals. `k_terrace.js` holds one `TERRACE_FX` function per upgrade, so builders never edit the same function.
  - `buildBridge()` is now rebuild-safe.
  - `check.mjs` covers the gameplay regressions: stages load, upgrades apply in order, idempotent rebuilds, a walkable deck and stairs, the shop end closed or open, terrace seats, old saves.
- **Captures aren't committed** (`.gitignore`). At ~2.5 MB each, 65 per round would bloat the repo. The critique JSON and `DIGEST.md` are committed.
- **Street camera recalibrated** after the round 0 baseline drifted: `pos [2.6, 0.9, 13.1]`, `at [-6, 3.4, 4.5]`, fov 74, at the far-stair foot looking up the run.
- **User clarification** (during round 1): the 2 BEFORE references show the move-in (prologue) state, which is stage 0. The 5 AFTER references are fully upgraded Chapter 5 shots, which is the final stage (stage 12: chapter 5, every upgrade). That's how the harness is wired already: AFTER critics only ever see the final stage. Calibration shots for the AFTER-only angles were taken at stage 0 purely to line up the camera, never to judge content.
