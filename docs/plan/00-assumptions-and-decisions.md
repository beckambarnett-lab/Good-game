## Part 0 — Context, Delivery and Assumptions

### 0.1 Context
The repository `beckambarnett-lab/Good-game` was empty when this was written. This plan is the first deliverable: a build-ready design + technical plan. No game code is written in this step.

**Delivered by the planning session (done):**
1. Split this document into `docs/plan/*.md` (one file per Part, plus an index) so later sessions can load only what they need.
2. Add a root `CLAUDE.md` telling future sessions: what Hearthwood is, where the plan lives, the current milestone, the build/test commands (once they exist), and the non-negotiable rules (pillars, polish bar, no copyrighted assets, verify before claiming done).
3. Add a short `README.md`.
4. Committed on branch `claude/lucid-hypatia-j11ko6` and opened as a draft PR.

### 0.2 Environment facts verified in this session (they shape the plan)
| Fact | Consequence |
|---|---|
| Node 22, npm 10, pnpm, Python 3.11, `uv` available | TypeScript + Vite toolchain; Python for Blender scripts |
| Playwright 1.56.1 + Chromium 141 preinstalled at `/opt/pw-browsers/chromium` | Pin `@playwright/test@1.56.x` or launch with `executablePath`; never run `playwright install` |
| Headless Chromium: **WebGL2 works** (SwiftShader), MSAA 4×, float render targets, timer queries, `OfflineAudioContext`, `AudioWorklet`, `CompressionStream`, IndexedDB. **No WebGPU.** | WebGLRenderer is the right renderer; automated screenshot + audio-render QA is possible in CI/containers |
| No real GPU, no speakers in the container | Performance is verified with hardware-independent budgets (draw calls, triangles, CPU ms) + an in-game benchmark the user runs; audio is verified with metrics + spectrograms + the user's ears |
| `download.blender.org` blocked; **`bpy` 4.5 LTS installable from PyPI** (cp311) | Blender runs headless in the container for hero assets; outputs committed, so Blender is never a build dependency |
| Repo is **public** | GitHub Pages can host playtest builds per milestone |
| npm latest: three r186, postprocessing 6.39 (supports three <0.187), three-mesh-bvh 0.9, n8ao 2.0, Vite 8, Vitest 5, Preact 10.29 | Versions pinned in M0 (exact pins recorded in `package.json`) |

### 0.3 Assumptions (explicit)
1. **Platform:** desktop web browsers. Primary: Chrome/Edge (last 2 versions). Supported: Firefox (last 2). Best effort: Safari 17+. No mobile/touch support at launch.
2. **"Mid-range hardware"** = reference machine class: Intel Iris Xe / AMD Radeon 680M / Apple M1 / NVIDIA GTX 1650, 8–16 GB RAM, 1080p display. Target: **60 fps at 1080p on the Medium preset** with dynamic resolution allowed down to 0.8. Low preset exists for older iGPUs (UHD 620).
3. **Single-player, offline, no accounts, no monetization, no analytics.** Saves live in the browser (IndexedDB) with file export/import.
4. **English only** at launch; all UI strings go through one string table so localization is possible later. Dialogue is authored inline in typed data (deliberate: faster writing), with IDs so it can be extracted later.
5. **Team:** one AI developer (future Claude sessions) + the user as creative director and playtester (the only one who can hear the audio and feel the game on real hardware). The plan has explicit **user playtest checkpoints**.
6. **Content length:** main progression ≈ 12–15 h; full completion (all arcs, all upgrades, all collections) ≈ 20–25 h; after that the game continues forever (Year 2+ loop).
7. **Tone:** gentle, warm, lightly funny, never saccharine. No villains, no romance-sim mechanics (one small older-couple subplot exists as story only), no religion-specific holidays (the town's festivals are invented).
8. **Assets:** everything original. World and dynamic assets are generated in TypeScript at runtime; hero assets (characters, animals, truck, handheld tools) are built by committed Blender Python scripts and exported as `.glb`. Fonts are SIL Open Font License fonts, self-hosted with their licenses. No paid, ripped, or copyrighted assets. CC0 recordings are **not** used (all audio is synthesized; see Part 10 for the one allowed fallback).
9. **Rating feel:** suitable for all ages. No combat, no fail states, no punishing timers.

### 0.4 Strong decisions where the brief was open (short rationale)
| Question | Decision | Why |
|---|---|---|
| Engine | **Three.js r186 WebGLRenderer (WebGL2)** + TypeScript + Vite | Mature, fast, fully testable in headless Chromium (same code path as players). WebGPURenderer rejected: not testable here, weaker post-FX ecosystem, fallback path differs from production path. Godot web/Unity WebGL rejected: heavy downloads, poor procedural-audio story on web |
| Physics engine | **None.** Custom kinematic character, arcade raycast truck, scripted tree falls, "physics-lite" debris | Brief says "simple and reliable". Scripted motion never jitters or explodes; a physics engine would add WASM weight and tuning risk for little gain |
| Pathfinding | **Authored waypoint graph + A\* + steering** | Small town, ~25 walkers; deterministic and debuggable; navmesh WASM is overkill |
| UI tech | **DOM overlay with Preact + signals**, hand-drawn CSS/SVG theme | Crisp text, accessibility, fast iteration |
| Audio | **Raw Web Audio API + our own "Sound Foundry" DSP** (pure TS, runs in Web Workers and Node) instead of Tone.js | We pre-render instruments and SFX variants from code (rich timbres, cheap playback), need offline metrics in Node, and want no Transport global-state quirks |
| Day length | **90 real s per game hour by day (06:00–22:00), 45 s at night**, so a full day is **30 min** by default. Setting: Relaxed 40 min / Standard 30 / Brisk 20 | Long enough to never feel rushed; a winter's week ≈ 3.5 h |
| Calendar | One **Winter = 8 weeks (56 days)**, seven festivals, then a poetic time-skip card and **Year 2** begins (the game never ends) | Gives the season an arc and an ending moment without stopping play |
| Deadlines | **No order deadlines.** Some orders mention an ideal day; hitting it earns a thank-you scene + small tip, never a penalty | Calm pillar |
| Stamina / sleep | **No stamina, no forced sleep.** Sleeping is optional fast-forward + ledger + autosave | Nothing nags the player |
| Fuel / tool durability / rent | **None** | Friction without joy |
| Premise | The player takes over **Hal Brennan's** firewood business ("Hearthwood Firewood & Kindling") as Hal retires; Hal gives the cabin, woodlot and his dead-battery truck *Marigold* | Warm mentor instead of a dead relative; the truck repair is the first goal |
| Currency | **Coins** ("c"), small integers | Readable, cozy |
| Interiors | **Seamless cutaway interiors** (walls/roof dither away, camera eases to a diorama framing) | No loading screens; lit windows are the real rooms |
| Map gating | Snow is the gate: every area has a **foot gate** (clothing/boots/time) and a **haul gate** (truck upgrade) | Upgrades open places, thematically |
