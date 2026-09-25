# 0003 — Render scale is a per-preset pixel budget; dynamic resolution steps, and backs off

**Date:** 2026-09-24 · **Status:** accepted · **Code:** `src/data/quality.ts`, `src/view/render/Quality.ts`, `src/view/render/DynamicResolution.ts`, `src/view/render/GpuTimer.ts`, `src/view/render/Stage.ts`

## Context
Plan Part 5.10 gives each preset a render scale (Low 0.75, Medium 1.0 …) and a dynamic resolution rule: with the GPU frame time averaging over 15.5 ms for a second, drop 0.05 (floor 0.7 Low, 0.8 Medium); recover after 3 s under 13 ms; changes smoothed and invisible. Three gaps showed when building it:
1. **"Render scale 1.0" of what?** Much of the reference hardware (Plan 0: Apple M1, Iris Xe laptops) drives high-density screens. At the screen's own density, a 1440×900 window at DPR 2 is 5.2 MP, 2.5× the 1080p the 60 fps target assumes.
2. **The frame-interval fallback can't use the plan's thresholds.** Browsers often don't expose the GPU timer (EXT_disjoint_timer_query_webgl2). The fallback is the rAF interval, and under vsync at 60 Hz every frame is 16.7 ms whether the GPU needed 5 ms or 16. Against 15.5 ms, the scale would always drop. Under 13 ms, it could never recover.
3. **Smoothing every frame is expensive.** Each change of pixel ratio reallocates the composer's render targets.

## Decision
- **Pixel budget.** Each preset has `maxMegapixels`: Low 1.25, Medium 2.1 (1080p), High 3.7 (1440p), Ultra 8.3 (4K). At render scale 1 the renderer's pixel ratio is the screen's own, capped so the frame is no larger than the budget. Render scale multiplies that. Small windows never render above native.
- **Stepped changes.** Dynamic resolution changes the scale in 0.05 steps, at most once per 1 s averaging window. A 5 % step is too small to see as a pop, and the render targets are rebuilt at most once a second.
- **Two cost sources.** With a GPU timer, the plan's thresholds apply as written. Without one, the frame interval is compared with the frame-rate target: drop above 1.06× the target interval (17.7 ms at 60 fps), and count calm below 1.01× (16.8 ms).
- **Back-off.** A step up undone within 4 s doubles the next recovery wait (3 → 6 → 12 … 48 s). Without a GPU timer, "frames on time" can't show headroom, so the controller probes upward. The back-off stops it hunting.
- **Settling.** Nothing is judged in the first 2 s after loading or a quality change (shader compiles, streaming).
- **Shots** hold a fixed render scale, so screenshots stay deterministic.
- **Cascaded shadows** (High: 2, Ultra: 3) are recorded in the preset table but not built yet. High and Ultra use the Medium single map until CSM lands with the Environment (M1.7). N8AO (High/Ultra) and the forest density and card distance rows wait on their systems too.

## Why
- A pixel budget keeps "Medium" meaning 1080p-class cost on every screen. The alternative, native resolution times 0.8, still left HiDPI laptops at 3.3 MP on their floor.
- Per-frame smoothing (a new fractional pixel ratio every frame) was rejected: it would reallocate the render targets 60 times a second.
- A CPU-bound frame (a busy sim) with a GPU timer shows low GPU time, so the scale correctly stays put. Only the fallback can mistake CPU cost for GPU cost, and the back-off limits the damage.

## Consequences
- The in-game Benchmark (M1) reports the preset, the settled render scale and whether the GPU timer was available, so the user's numbers can be read correctly.
- The Settings UI shows render scale as a percentage of the budgeted resolution, not of native.
- If players on strong GPUs want native HiDPI on Medium, raise that budget or offer "Native" as a fixed render scale option.
