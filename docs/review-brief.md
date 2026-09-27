# Blind review brief

You are reviewing a browser game build as a player and QA tester. You did not write it. Do not read
the source code under `src/`; judge only what the build does. Score what you see and what you can do.

## How to run the build headlessly
- `cd /home/user/Good-game && node tools/build.mjs` writes `dist/index.html`.
- `tools/harness.mjs` has `serve()`, `launch()` and `preparePage(page)`. They serve `dist/`, start Chromium (SwiftShader WebGL) and route the CDN scripts locally. Never run `playwright install`.
- `node tools/shot.mjs <name> "<js>" wait:<ms> shot:<suffix> ...` opens the page, runs each JS snippet in order and saves `artifacts/shots/<name>*.png`. Set `W=390 H=844 TOUCH=1` for a phone.
- You can also write your own Playwright scripts in your scratch folder, based on `tools/e2e.mjs`.
- SwiftShader renders only a few frames per second. To move time forward quickly in a battle, call `window.__game.sim.step()` in a loop inside `page.evaluate`. The sim runs at 60 steps per second of game time. Do **not** count low render FPS in SwiftShader as a bug; the sim cost per step is the meaningful number.
- Test hooks you may use to drive the game (as a player would through the UI):
  - `window.__game.mode`
  - `.army`
  - `.sim` (units, time, phase, winner)
  - `.startSandbox(mapId)`, `.startLevel(i)`, `.startBattle()`, `.resetBattle()`
  - `.selected = window.__game.sim.defs[id]` then `.tryPlace(x, z)`. Blue deploys at z in [4, 26], red at z in [-26, -4], x in [-34, 34].
  - `.placeTeam` (0 or 1, sandbox only)
  - `.camera`, `.rig`
  - `.setUserScale(s)`, `.follow(unit)`
- Prefer real clicks and taps on the UI where practical. Use the hooks for bulk setup and for fast-forwarding.

## Output
Score each of the 10 features from 1 to 10. For each score, give specific evidence (screenshots you looked at, numbers you measured) and a list of concrete bugs or weaknesses, each with repro steps. Then give the top 10 fixes, ranked. Be strict: an 8 means "polished, would ship"; below 8 means something is visibly missing or broken.
