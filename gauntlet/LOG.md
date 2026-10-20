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

## Round 1 (critique of the baseline; first builders)
**Captures:** `captures/round_1/`, all 13 stages × 5 angles, plus `reveal_unlock`, `walk0_desktop`, `walk1_desktop` and `walk1_phone`.
**Critics:** 30 fresh agents, per CRITICS.md. Full gaps are in `captures/round_1/DIGEST.md`.

**Scores (mean):**
- **BEFORE:** high 2.33, street 2.75.
- **AFTER (final stage):** terrace 1.50, high 1.78, balcony 2.50, street 2.67, konbini 3.00.
- **Reveal:** 1.0. **Playability:** 2.75. **Mobile:** 4.33. **Beauty:** stages 0/1 5.65, stages 6/12 5.25.
- **Progression (0→100):** stage 1 lands at 22–34, stages 2–10 are flat (only the heaters at 6 and the strings at 7 move), the final reaches 39–50. All four critics: "fails as a progression".

**Top gaps** (raised by several critics):
1. **The upgrade visuals don't exist yet** (the `TERRACE_FX` slots are empty): frozen stages, a terrace that reads as a blockout, and no lanterns, planters, canopy, heaters, underglow, neon, wisteria or bamboo.
2. **The Chapter 3 unlock changes only the tea house**, not the bridge (no repaint, sign, cedar deck or warm light). The reveal happens off-camera, behind a fade.
3. **Stage 0 materials:** flat, untextured steel; solid-block stairs; the barrier props are missing. (Builder running.)
4. **Road:** wavy, speckled, psychedelic reflections. Fixed in 42dc12d.
5. **Lighting:** a cold purple ambient with no warm pools; the rain reads as a white overlay. Fixed in 68e6a9a.
6. **Konbini and neighbours:** "AMA MART", a flat skyline, a short vista. (Builder running.)
7. **Continuity:**
   - the crosswalk (a tea house upgrade) is a scatter of floating tiles;
   - stray floating boxes and dark puddle-decal blobs;
   - the furniture layout disagrees between angles.
8. **Harness:**
   - the stage 0 walk sat behind the move-in intro modal;
   - the terrace walk seated no customers.
9. **Mobile:** HUD buttons below the minimum size; a chapter banner covers the view.

**Merged this round:**
- **Wet road** (builder, 42dc12d): removed the ripple, column grain and glints; a vertical streak blur at reflection-texture resolution.
- **Lighting** (builder, 68e6a9a): ambient cut about 60% and moved to grey-blue, a teal/amber grade, blue-grey fog, finer additive rain.

**Process notes:**
- **API session limit:** all four builders stopped mid-task and were resumed after the limit reset.
- **Wrong worktree base:** builder worktrees are created on the repo's default checkout (an unrelated project). Builders reset onto `gauntlet-bridge`, and BUILDER.md now says to check this.
- **CPU:** 4 cores were saturated (load 23). Builders now iterate at half size, one capture at a time.

## Wrap-up (paused at the user's request: weekly usage low)
- **Loop stopped.** All builder work is preserved: either merged into `gauntlet-bridge` or on its `worktree-agent-*` branch.
- **Merged without visual verification:** the WIP of the stage 0 rusted bridge (`worktree-agent-a4d8777491843ad89`) and of the structure-and-light upgrades (`worktree-agent-abc7558f4cd862b27`: underside lights, neon teacup, canopy with 2 more tables, copper heaters, bulb strings). Both builders were cut off by the usage limit. `check.mjs` passes on the merged result, but no critic has seen it yet.
- **Not merged:**
  - **Greenery WIP** (`worktree-agent-a70260c133da7a1ef`): conflicts in `k_terrace.js` with the structure work.
  - **Tea house exterior builder** (`worktree-agent-a00f1b07a68c77e8b`): it stopped before making any edits.
- **Next session:**
  1. Resolve and merge the greenery branch.
  2. Build the stage 1 unlock look (repaint, cedar deck, 雫テラス sign, downlights) and remove the old heaters and strings from `buildTerrace`.
  3. Build the on-camera reveal.
  4. Recapture as round 2 and run fresh critics.
- **Published:** the current build (`dist/index.html`) went to the original Shizuku artifact.
