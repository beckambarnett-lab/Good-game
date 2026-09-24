# Progress

**Current milestone:** M0 — Foundations
**Last updated:** planning session (2026-09-24)

## Status log
- 2026-09-24: Complete development plan written (`docs/plan/`). No code yet.
- 2026-09-24: User switched to the review-gated Lab workflow and designed the swinging-bar felling minigame. `main` created.

## Review queue (Plan Part 8.0)

| Lab | Status | Link |
|---|---|---|
| #1 Soundtrack: Wrenhollow Lullaby | not started | — |
| #2 Felling minigame (swinging bar) | not started | — |

## Known issues / open questions
- None yet.

---

## M0 — Foundations (≈ 4 sessions)
Plan: `docs/plan/08-roadmap.md` → M0.

- [ ] Scaffold
  - [ ] Vite + TS strict + Biome + Vitest + Playwright 1.56.x (executablePath)
  - [ ] npm scripts (Plan 7.10)
  - [ ] `ci.yml` + `pages.yml`
  - [ ] Update the Commands section of `CLAUDE.md`
- [ ] App shell
  - [ ] State machine
  - [ ] Fixed-step loop with interpolation
  - [ ] EventBus, Context, Settings (localStorage)
  - [ ] Visibility handling
  - [ ] Seeded RNG with forks
- [ ] Render core
  - [ ] Renderer, Quality presets, DynamicResolution
  - [ ] PostFX (bloom, tone map, Grade, vignette, grain)
  - [ ] HearthMaterial v0
  - [ ] Sky v0
  - [ ] Lights + pool
  - [ ] Prewarm
- [ ] World core: TerrainGen v0 (worker), TerrainMesh chunks, Heightfield queries
- [ ] Joinery v0 + Pine v0 + Forest instancing v0 (CPU cull + LOD)
- [ ] Input (KBM, gamepad, bindings, pointer lock), CameraRig v0, Movement v0 (capsule + BVH)
- [ ] Audio core
  - [ ] AudioEngine (unlock, buses, limiter, IR generator)
  - [ ] Foundry worker pool + 3 recipes
  - [ ] Lookahead scheduler
  - [ ] DirectorCore v0 test phrase
- [ ] Save core: IndexedDB, gzip, CRC, slots, migrations framework, round-trip test
- [ ] Dev tools: overlay, cheats, `shots` (2 shots), `soak` and `audio-render` skeletons
- [ ] **Done-check:**
  - [ ] CI green
  - [ ] Pages test scene (walkable valley, swaying pines, crunching footsteps, felt-piano phrase)
  - [ ] Save round-trip passes
  - [ ] Screenshot artifacts
  - [ ] Budgets shown in the dev overlay

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
- [ ] 7. Clock/calendar, 5 weather states, Environment key frames, radio forecast v0
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
