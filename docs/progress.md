# Progress

**Current milestone:** M0 — Foundations
**Last updated:** 2026-09-24

## Status log
- 2026-09-24: Complete development plan written (`docs/plan/`).
- 2026-09-24: User switched to the review-gated Lab workflow and designed the swinging-bar felling minigame. `main` created; draft PR open, CI green.
- 2026-09-24: Scaffold, core utilities, Sound Foundry, DirectorCore v1, Stage and Joinery built; Labs #1 and #2 published for review.
- 2026-09-24: User supplied an alternative main theme. It was measured against P01; verdict and recommendation are in `docs/reviews/soundtrack-lullaby.md`. Waiting on provenance and direction.
- 2026-09-24: TerrainGen v0 with the full town-bible layout (ADR 0001). `npm run map` added.
- 2026-09-24: The valley is walkable: Input (KBM + gamepad + pointer lock, bindings as data), CameraRig (orbit, springs, terrain collision, lazy recenter), Movement (kinematic capsule per Plan 2.3: walk/jog, ice slide, slope limit, trunk collisions, hop) and a placeholder walker. Walking e2e test.
- 2026-09-24: Forest v0: ~3,200 tree sites (Poisson-disc, deterministic, stable ids; woodlot 60 = 38/12/10, farm edge 20) generated in the terrain worker; one InstancedMesh per species × LOD with CPU culling, LOD hysteresis and wind sway (11 draw calls).
- 2026-09-24: App shell (flow state machine, GameLoop, Settings, Visibility); TerrainMesh (batched chunk LODs); the valley test scene boots Splash → Loading (terrain worker) → Playing; `npm run shots` with 3 shots (S01, S04, S08) and budgets; valley e2e smoke test; shots uploaded by CI.
- 2026-09-24: Sim core (system registry, fixed step, coarse advance, saved RNG streams, typed events, ClockSystem) and the save core (gzip + CRC, verify-after-write, A/B autosave + 3 manual slots, migrations, export/import, IndexedDB). Round trip passes in Node and in Chromium.

## Review queue (Plan Part 8.0)

| Lab | Status | Link |
|---|---|---|
| #1 Soundtrack: Wrenhollow Lullaby | **in review.** User supplied an alternative theme; direction pending | [Lab](https://claude.ai/artifact/JiveVgK6AeMt8GvXXvoAcu) · `docs/reviews/soundtrack-lullaby.md` |
| #2 Felling minigame (swinging bar) | **in review** | [Lab](https://claude.ai/artifact/6WoiRfvAxPesv8yLczJVGh) · `docs/reviews/felling-minigame.md` |

## Known issues / open questions
- **Main theme direction:** the user's track vs P01. Waiting on the user: where the track came from (licence, and source code if it was made in code), and whether it becomes the main theme.
- **Music engine gaps** exposed by the comparison (Lab #1 round 2 material):
  - stereo width;
  - a pedal/sub layer;
  - dynamic arc and sectional contrast;
  - softer felt-piano attacks;
  - an ambient air bed.
- **Scripts not yet present:** `npm run soak` and `npm run shots` are declared in `package.json`, but `tools/soak.ts` and `tools/shots.ts` don't exist yet (M0 dev tools).
- **Controls feel** (feel-critical → Winter Walk lab): walk/jog speeds, acceleration, camera distance, springs and recenter are the plan's numbers, not yet playtested. No shake yet; trunks don't dither-fade yet (HearthMaterial).
- **Forest:** oaks (ridge old growth), apples and the maple grove arrive with M7/M8; forest cards beyond 300 m and quality-preset density with the render core; tree shadows don't sway yet (the depth material lacks the sway patch); the ridge's 120 fellable sites are designated in M8.
- **Valley look (M0 placeholders):** lighting uses a flat exposure scale (1.6) until the Environment key frames (M1.7); the valley is empty until the forest and buildings land; the world edge shows without the backdrop mountains; roads are vertex colour on the terrain, so their edges stair-step at far LODs (road ribbons come with M3).
- **Save fixtures:** add `tests/fixtures/saves/v1.hearthwood` at the first playtest release, then one per released save version.
- **Terrain gaps:** the ridge switchbacks, Ridge Trail and shore footpath are not in the terrain data yet (M8/M7). Terrain generation takes about 1 s on the main thread; move it to a worker with TerrainMesh.

---

## M0 — Foundations (≈ 4 sessions)
Plan: `docs/plan/08-roadmap.md` → M0.

- [ ] Scaffold
  - [x] Vite + TS strict + Biome + Vitest + Playwright 1.56.x (executablePath)
  - [ ] npm scripts (Plan 7.10): dev, build, check, test, e2e, audio, map, lab:* done; soak, shots to come
  - [ ] `ci.yml` (done) + `pages.yml`
  - [x] Update the Commands section of `CLAUDE.md`
- [ ] App shell
  - [x] State machine: `StateMachine` (core) + the app flow and per-state traits (`src/app/states.ts`: which states step the world and run the clock)
  - [x] Fixed-step loop with interpolation: `FixedStepper` + `GameLoop` (rAF, fps cap, pause without replay, stall cap)
  - [x] EventBus, Settings (schema in `src/data/settings.ts`, validated, localStorage, live change events)
  - [x] Visibility handling (`Visibility`: hidden/visible/pagehide events)
  - [x] `App` assembly (the App holds the context: settings, flow, loop, sim, stage): Boot → Splash → Title (pass-through until M1) → Loading → Playing
  - [x] Seeded RNG with forks (streams saved and restored)
  - [x] Sim skeleton: `Sim.ts` system registry, fixed step, `advance`, serialize; `ClockSystem`
- [ ] Render core
  - [ ] Renderer (Stage done), Quality presets, DynamicResolution
  - [ ] PostFX (bloom, tone map, vignette done; Grade, grain to come)
  - [ ] HearthMaterial v0
  - [x] Sky v0
  - [ ] Lights (hemi + sun done) + pool
  - [ ] Prewarm
- [ ] World core
  - [x] TerrainGen v0: bible layout, spline roads with design grades, bridges, creek, rail (ADR 0001)
  - [x] Heightfield queries (bilinear height, normal, slope)
  - [x] TerrainGen in a worker (`terrain.worker.ts`, transferable payload)
  - [x] TerrainMesh chunks (32 m × 4 LODs, gap-sized skirts, one BatchedMesh, LOD at 10 Hz with hysteresis; smooth-shaded, ADR 0002)
- [x] Joinery v0 + Pine v0 (plus birch; LOD1/LOD2 variants, stumps) + Forest instancing v0 (CPU cull + LOD at 10 Hz, sway)
- [x] Input (KBM, gamepad, bindings, pointer lock), CameraRig v0 (orbit, springs, terrain collision, lazy recenter), Movement v0 (capsule on the heightfield + trunk colliders; the building BVH arrives with the cabin in M1)
- [x] Audio core
  - [x] AudioEngine (unlock, buses, limiter, IR generator)
  - [x] Foundry worker pool + 3 recipes
  - [x] Lookahead scheduler
  - [x] DirectorCore test phrase (v1 already, for Lab #1)
- [x] Save core: IndexedDB, gzip, CRC, slots (A/B autosave + 3 manual), migrations framework, round-trip test (unit + e2e)
- [ ] Dev tools: overlay, cheats, `soak` (`shots` with 3 shots, audio-render and map done)
- [ ] **Done-check:**
  - [ ] CI green
  - [ ] Pages test scene (walkable valley, swaying pines, crunching footsteps, felt-piano phrase)
  - [x] Save round-trip passes (`tests/unit/save.test.ts`, `tests/e2e/save.spec.ts`)
  - [x] Screenshot artifacts (`npm run shots`; CI uploads `artifacts/shots/`)
  - [ ] Budgets shown in the dev overlay

**Built early for later milestones:** Clock/calendar (M1.7) and the felling sim + SFX recipes (M1.4, Lab #2).

## M1 — Vertical Slice, already polished (≈ 14 sessions) ★
Plan: `docs/plan/08-roadmap.md` → M1.

- [ ] 1. Cabin-area layout; cabin, woodshed and forge (BuildingGen/InteriorGen v1); cutaway v1
- [ ] 2. Pine and birch generators (LOD0–2), woodlot sites, brush piles
- [ ] 3. Player character v1
  - [ ] Blender kit and rig
  - [ ] `anim_human` clips
  - [ ] AnimController, IK, springs
  - [ ] `npm run assets` pipeline
- [ ] 4. Felling, bucking, rounds, carry, round pile
- [ ] 5. Splitting and wood handling
  - [ ] Full model: aim, glint, damage, sectors, outcomes, streak song
  - [ ] Heap, gather
  - [ ] Stacking (musical)
  - [ ] Lots and seasoning
  - [ ] Woodbox and stove, starter stock
- [ ] 6. Snow
  - [ ] GPU snowfall
  - [ ] Patches with accumulation
  - [ ] Shoveling with banks
  - [ ] Footprints and trail map
  - [ ] Snowcap, sparkle
- [ ] 7. Clock/calendar (done), 5 weather states, Environment key frames, radio forecast v0
- [ ] 8. Warmth v1, thermos and cocoa, lantern
- [ ] 9. Economy mini
  - [ ] Ines buys wood
  - [ ] Shop catalogue (sharpening, blade, steel shovel, maul)
  - [ ] Coins, ledger v0
  - [ ] Hal's notes
- [ ] 10. Ines
  - [ ] Model
  - [ ] Schedule, nav graph
  - [ ] Dialogue system v1
  - [ ] ~60 lines, arc L1–L2
  - [ ] Friendship
  - [ ] Dog Anvil
- [ ] 11. Audio
  - [ ] VS SFX set
  - [ ] Footstep system
  - [ ] Ambience
  - [ ] Mixer snapshots, ducking
- [ ] 12. Music
  - [ ] DirectorCore v1
  - [ ] P01, P02, P03, P08, P09
  - [ ] Radio R01
  - [ ] In-key gameplay pitches
- [ ] 13. UI
  - [ ] Splash, live title screen
  - [ ] New game
  - [ ] Pause, settings
  - [ ] HUD, toasts
  - [ ] Notebook v0
  - [ ] Save/load UI
- [ ] 14. Accessibility v0
- [ ] 15. Polish pass
  - [ ] Juice table for VS actions
  - [ ] Transitions
  - [ ] Performance budgets in shots
  - [ ] Benchmark v0
  - [ ] Sound Board v0
- [ ] **Done-check (Plan 8.2, M1: all 8 criteria)**
- [ ] **User Playtest #1** triaged (`docs/playtests/M1.md`); must-fixes resolved

## Later milestones
Task lists are expanded from `docs/plan/08-roadmap.md` when each milestone starts.
- [ ] M2 — The Valley and the Town Shell
- [ ] M3 — *Marigold* and the Roads
- [ ] M4 — Townsfolk
- [ ] M5 — Business
- [ ] M6 — Winter Deepens
- [ ] M7 — Stillmere Lake and the Lindqvist Farm
- [ ] M8 — Graybeard Ridge
- [ ] M9 — Festivals and Stories
- [ ] M10 — Home and Hobbies
- [ ] M11 — Polish, Onboarding, Accessibility
- [ ] M12 — Release Candidate
