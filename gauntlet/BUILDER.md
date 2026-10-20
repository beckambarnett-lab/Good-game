# Builder brief (read this first)

You're a builder on **Shizuku**, a first-person Three.js (r160) tea-shop game set on a rainy neon street at night. The footbridge over the street transforms over the game: stage 0 (the BEFORE references) runs from move-in to the Chapter 3 unlock; stage 1 is the unlock, where it becomes 雫テラス; stages 2–12 each add one purchasable upgrade, until it matches the AFTER references. You do **one focused task**, verify it with captures, and commit it. You don't grade your own work: fresh critics do that later.

## Where you work
- **Your worktree:** you're in an isolated git worktree of the repo (your current working directory). Commit there. Never push.
- **Code:** `src/js/*.js` are joined, in the order listed in `build.mjs`, into ONE `<script type="module">`. That means one shared scope, not separate ES modules. `node build.mjs` writes `dist/index.html`.
- **Read these first:**
  - `gauntlet/BRIDGE_INVENTORY.md`: every BEFORE → AFTER difference, and what never changes.
  - `gauntlet/BRIDGE_UPGRADE_MAP.md`: what each stage removes and adds.
  - `references/README.md`: what's in each reference image.
  - The reference images themselves: `/home/user/good-game/references/*.png`.

### Key files
- `b_render.js`: renderer, quality tiers (`TIERS`), post-processing (bloom, grade), lights, baked vertex lighting (`ANCHORS`, `ZONES`, `bakeArrays`), the `Chunk` geometry batcher, materials, wet surfaces and reflection.
- `c_props.js`: the prop library `P.*` (railing, lantern, lanternGlow, stool, noren, cone, bollard, …) and the palette `C.*`.
- `d_city.js`: the city: road, sidewalks, neighbouring buildings (soba shop, Kaiun site, arcade, far side with the konbini, viaduct), street lamps, skyline, the `neon()` sign helper.
- `e_building.js`: the tea house shell, and `buildBridge()` (the footbridge structure: deck, parapets, far stairs x 1→-4 at z 12.65–13.9, near stairs x -6.4→-11.4 at z 1.5–2.5, the under-deck light, panels).
- `x_exterior.js`: `buildFacade()`, the tea house exterior (its own upgrade track; never undo its work).
- `k_ch3.js`: Chapter 3: `buildTerrace()` (the opened deck, tables and stools, heaters, strings), `buildPreDeck()` (the shop-end barrier before Chapter 3), `RENO[2]` (the unlock sequence).
- `k_terrace.js`: bridge stage helpers `bridgeStage()`, `bup(id)`, `rebuildBridge()`, plus `TERRACE_FX`, with one function per later upgrade.
- `i_weather.js`: rain, drips, weather.

### Coordinates
- **Shop:** front at z = 0 (x -2.7..2.7), with the 2F balcony at y 3.6, z 0..1.2.
- **Street:** near sidewalk z 0..2.5, road z 2.5..11.5, far sidewalk z 11.7..14.2. The konbini front is at z 14.5, x -14..-3.5.
- **Bridge:** deck y 3.6, x -6.4..-4.0, from z 1.0 (shop end) to z 13.9 (far end).

### Conventions
- Match the surrounding code: dense one-line style, short names, sparse comments that explain why.
- Geometry goes through `Chunk` (`ch.box/cyl/ball/cable/bar/geo`), with emissive pieces in a `{ emis: true }` chunk.
- Light comes from baked `anchor(...)` points (tag them so rebuilds clear them) plus the few dynamic lights.
- Seeded randomness: `reseed`, `srand`, `srange`, `spick`. Never use `Math.random` in builders.
- Procedural canvas textures are fine; there are no image assets. Fonts come from Google Fonts, as the page already loads them.

## Rules
- **Match the references one to one:** shape, proportions, layout, props, materials, lighting, color, wet reflections, rain, mood. Ignore people in the references. The intended Japanese text is 茶房雫, 雫テラス, テラス席, 立入禁止, 関係者以外立入禁止, テナント募集, ほしマート, 開運 KAIUN.
- **Stage discipline:**
  - Stage 0 (`S.ch < 3`) matches BEFORE. The final stage matches AFTER.
  - Something that belongs to a later stage is drawn only when `bridgeOpen()` / `bup(id)` says so.
  - Never bring an old feature back at a later stage. Never add anything that isn't in the AFTER images.
  - Neighbouring buildings, the road and the skyline look the same at every stage.
- **Rebuild safety:** builders that rebuild must clear their own anchors and collision first (see the top of `buildBridge`).
- **Keep it playable:** the bridge must stay walkable, and the far stairs climbable. Keep collision (`zoneFlat`, `zoneRamp`, `solid`) consistent with what you draw. Don't block serving spots.
- **Phone performance:** prefer emissive materials and baked anchors over real lights. Batch through `Chunk`, and use instancing or merged geometry for repeated bits. Keep textures small (≤ 512 px, shared and reused). Don't add full-screen passes.

## Verify (required)
1. Run `node build.mjs` in your worktree.
2. Capture with the shared harness (in the main checkout; don't copy it), pointed at YOUR build:
   ```sh
   cd /home/user/good-game/gauntlet/harness
   SZ_DIST=<worktree>/dist/index.html node shoot.mjs cam --stage <0|1|…|final> --pos x,y,z --at x,y,z --fov F --ref <reference.png> --out <file.png>
   ```
   For several angles from one load: `SZ_DIST=… node shoot.mjs multi --stage S --list cams.json`, where the list is `[{ref,pos,at,fov,out}]`.
   The reference cameras (from `gauntlet/harness/angles.mjs`):
   | Angle | pos | at | fov | Reference(s) |
   |---|---|---|---|---|
   | street | 2.6,0.9,13.1 | -6,3.4,4.5 | 74 | `bridge_before_street` / `bridge_after_crosswalk` |
   | high | 2.5,7.8,1.0 | -7,2.0,9 | 70 | `bridge_before_high` / `bridge_after_high` |
   | konbini | -13.5,0.9,11.6 | -3,3.4,7.8 | 72 | `bridge_after_konbini` |
   | terrace | -5.0,5.0,1.3 | -5.2,4.0,9 | 70 | `bridge_after_terrace` |
   | balcony | 7.5,5.5,6.5 | -6,4.2,7.2 | 60 | `bridge_after_balcony` |
   Each capture takes 2–6 minutes (software WebGL on a shared 4-core machine), so batch angles with `multi` and be patient. Look at the PNGs with the Read tool and iterate.
3. Run `cd /home/user/good-game/gauntlet/harness && SZ_DIST=<worktree>/dist/index.html node check.mjs` (gameplay regressions). Ignore only a pre-existing "rebuild is idempotent" failure, if the counts it prints are unchanged by your work.
4. Keep scratch captures out of the repo: put them in `/tmp/claude-0/-home-user-good-game/97272e98-22b2-5247-98e2-89c6fc17c9ea/scratchpad/<your-task>/`.
5. Commit with `git -c user.name="Beckam Barnett" -c user.email="beckam.barnett@gmail.com" commit`. End the message with these two lines:
   ```
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   Claude-Session: https://claude.ai/code/session_0166YmBFkHFGhA8r33uCLm84
   ```

**Reply with:** the commit hash, your worktree path and branch, a 3–6 line summary of what you changed (files and functions), anything you couldn't do, and the paths of your final verification PNGs.
