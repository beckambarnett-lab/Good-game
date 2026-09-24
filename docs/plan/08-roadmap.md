## Part 8 — Phased Build Roadmap

### 8.1 How every build session works (the protocol future sessions follow)
1. Read `CLAUDE.md`, then `docs/progress.md`, then the plan Part(s) for the current task.
2. Take the **next unchecked task** of the current milestone. Tasks are listed below and mirrored as checkboxes in `progress.md`.
3. Implement to the **Definition of Done** (7.11). Run `check`, `test`, `content`, then `shots`, `audio` and `e2e` as relevant. **Look at the screenshots and spectrograms** and fix what's wrong.
4. Update `progress.md` with what was done, what's next, and any known issues. Record decisions as ADRs.
5. Commit in small, descriptive commits and push the milestone branch. Keep a draft PR per milestone that is kept green.
6. **At milestone end:**
   1. Deploy the playtest build to Pages.
   2. Post a **playtest brief**: what to try, what to listen for, how to send feedback (F8 capture, Sound Board notes, benchmark text).
   3. Triage the feedback into `docs/playtests/Mx.md` as must-fix / should-fix / later.
   4. Must-fixes block the next milestone.

Effort is given in **sessions** (one focused multi-hour build session) as rough sizing, not promises. Total ≈ 90–115 sessions.

### 8.2 Milestones

#### M0 — Foundations (≈ 4 sessions)
**Deliverables**
1. Scaffold: Vite + TS strict + Biome + Vitest + Playwright (1.56.x, `executablePath` to the preinstalled Chromium). npm scripts from 7.10. `ci.yml` and `pages.yml`. `docs/progress.md`.
2. App shell: state machine, fixed-step loop with interpolation, EventBus, Context, Settings (localStorage), visibility handling, RNG with forks.
3. Render core:
   - Renderer, Quality presets, DynamicResolution.
   - PostFX (bloom, tone map, Grade, vignette, grain).
   - HearthMaterial v0 (wrap, shadow tint, custom fog, dither).
   - Sky v0 (gradient, sun, stars).
   - Lights (sun, hemi, pool), Prewarm.
4. World core: TerrainGen v0 (valley bowl, flatten polygon, one road spline) in a worker; TerrainMesh chunks; Heightfield queries.
5. Joinery v0 + Pine v0 + Forest instancing v0 (CPU cull + LOD).
6. Input (KBM, gamepad, bindings, pointer lock). CameraRig v0 (orbit, springs, collision). Movement v0 (capsule + BVH).
7. Audio core:
   - AudioEngine (unlock, buses, limiter, IR generator).
   - Foundry worker pool + 3 recipes (snow crunch, UI tick, felt-piano note).
   - Lookahead scheduler.
   - DirectorCore v0 playing a 4-bar test phrase.
8. Save core: IndexedDB wrapper, gzip, CRC, slots, version/migration framework.
9. Dev: overlay (fps, ms, draws, tris, heap), cheats (time, weather, teleport, coins), `shots` with 2 shots, `soak` and `audio-render` skeletons.

**Done when**
- CI is green on all gates.
- The Pages build shows a snowy valley test scene you can walk around: pines sway, footsteps crunch, a felt-piano phrase plays.
- The save round-trip test passes. Screenshots appear as CI artifacts. The dev overlay shows the budgets.

#### M1 — Vertical Slice, already polished (≈ 14 sessions) ★
**Scope:**
- Cabin (interior + porch), woodshed L1, chopping block, woodlot (~40 pine/birch), driveway, Cabin Road, **Anvil & Ember** (exterior + interior) at the road's end, 3 backdrop houses, mountains.
- **One character: Ines** (with her dog Anvil).
- **Music + weather:** Clear, Fair, Overcast, Light Snow, Heavy Snow, across full day/night.

**Tasks (in order)**
1. Cabin area terrain and layout data; cabin, woodshed and forge via BuildingGen/InteriorGen v1; cutaway v1 (cabin, forge).
2. Trees: pine and birch generators (LOD0–2); woodlot sites; brush piles.
3. Player character v1: Blender player kit with 3 presets, shared rig, `anim_human` clips for VS actions, AnimController layers, foot IK, spring bones. Asset pipeline (`npm run assets`) working end to end.
4. Felling (fall line, rhythm, fall ODE, landing, auto-limbing), bucking (strokes, cadence), rounds, carry, round pile.
5. **Splitting** (read round, aim, glint window, damage model, sector geometry, outcomes, streak song), heap (physics-lite), gather, **stacking** (packing, musical clacks), lots and seasoning visuals, woodbox and stove, Hal's starter stock.
6. Snow: GPU snowfall, patches (cabin path, porch, drive, forge walk) with accumulation, **shoveling** with banks and completion chime, footprints (near RT) and trail map, snowcap, sparkle.
7. Clock and calendar, Weather (5 states) + Environment key frames + transitions. Cabin radio forecast v0.
8. Warmth v1 (drain, refill, states, stove, Tin Thermos, cocoa brewing). Lantern.
9. Economy mini: Ines's counter buys wood; the shop catalogue UI sells sharpening, new blade, steel shovel, **splitting maul**; coins HUD; ledger v0. Hal's notes (letters on the cabin table) as onboarding.
10. **Ines:** Blender model, NPC schedule (forge, lunch bench, dog walk), nav graph (VS area), dialogue system v1 (barks, chats, scenes, voice blips, ✦), ~60 lines, arc beats L1–L2 (VS-adapted: well-seasoned birch for the shop stove, then the weathervane sketch teaser), friendship.
11. Audio: full VS SFX set, footstep system (fresh, packed, planks, flagstone, gravel), ambience (wind ×3, hush, creaks, chickadee, crows, fire, room tone, clock, forge hammering), mixer snapshots (outdoor, cabin, shop), ducking.
12. Music: DirectorCore v1 (forms, voicing, performers, motifs, humanize, rests, transitions, stingers). Pieces **P01, P02, P03, P08, P09**. Radio R01. Stacking and split pitches in key.
13. UI: splash, **title screen (live scene)**, new game (name, pronouns, 3 looks), pause, settings (graphics, audio, controls with rebinding, accessibility core), HUD (clock, warmth, coins, prompts), toasts, Notebook v0 (Woodshed, Ledger, Folks: Ines), save/load UI (autosave + 3 slots + export/import).
14. Accessibility v0: relaxed timing, hold/toggle, text size, readable font, reduce motion, captions.
15. **Polish pass:** the Part 9 juice table for every VS action; transitions; performance (budgets in shots S01, S02, S03, S13 + VS heavy-snow shot); benchmark v0; Sound Board v0.

**Done when**
1. A first-time player completes **fell → buck → haul → split → stack → (season / starter stock) → sell to Ines → buy the maul → split with it and *feel* the difference**, with only diegetic prompts and Hal's notes.
2. Every VS action passes the Part 9 juice checklist.
3. Day/night and 5 weathers look and sound distinct. Shots are approved in review.
4. A 60-minute Director soak shows no repetition violations. The Sound Board is deployed and a **user listening session** is done.
5. Save/load restores the full VS state. Autosave, slots and export/import work.
6. Budgets hold in shots. No long frames after load. The user's benchmark is ≥ 60 fps average at Medium, or deviations are fixed.
7. No console errors in a 30-minute e2e soak.
8. **User Playtest #1** (20–30 min) is triaged, and all must-fixes are resolved.

#### M2 — The Valley and the Town Shell (≈ 8 sessions)
**Deliverables**
- The full map: terrain features, all roads, creek, lake basin, ridge.
- All building exteriors (Main Street, hall, school, halt, farm, lake, ranger station, lookout).
- **Interiors:** café, store, woolens, post office, garage (with lift), hall, inn lobby.
- Props and charm details: sequential street lamps, light pools, window occupancy stub, chimney smoke, icicles, mailboxes, porch woodpiles.
- All forests scattered; forest cards; BatchedMesh batching; zones.
- Town, forest and lake ambience beds. Music **P04, P11, P12**.
- Road and path snow patches everywhere. Notice board with shovel jobs (NPC-less stub). Map tab v1.

**Done when**
- The whole valley can be walked with budgets holding in the worst shots: town at night, S04, S06, S07.
- Zone music and ambience switch correctly.
- The cutaway works in all listed interiors.

#### M3 — *Marigold* and the Roads (≈ 6 sessions)
**Deliverables**
- TruckSim; Blender truck + upgrade parts; engine synth and tire/door/tailgate/chain/plow audio; enter/exit; chase cam.
- Radio (R01–R04, DJ captions).
- Loading/unloading with bed visuals; stuck assist and tow.
- Battery repair flow (garage counter stub).
- Snow tires, stake bed, **plow blade** (road patches, windrows), drift gates, chains; switchbacks physics.
- Town plow NPC truck.
- Sled and wheelbarrow haulers.

**Done when**
- All gates behave per the physics rules, with and without the right upgrades.
- Plowing and driving feel great: **User Playtest #2** includes a 15-minute drive-and-plow session.
- Budgets hold while driving at speed (streaming, culling).

#### M4 — Townsfolk (≈ 12 sessions)
**Deliverables**
- The full NPC system: schedules and overrides, nav graph, A\*, steering, LOD, doors, activity library, time-skip re-placement.
- **Characters:** Hal, Mara, Pip, Gus, Bea, Rusty, Nadia, Wendell, Elin (Ines is done), plus the kids, extras kit, dogs and cats.
- **Dialogue system complete:** scenes with camera, letters and mailbox, overheard pairs, town memory with spread, gifts, friendship perks.
- **Writing:** for each town character, barks, chats, arc scenes L1–L3 and first letters (≥ 150 lines each).
- Hal's Day-1 walkthrough (replaces the VS notes). First Snow Supper (festival layer v1). Café seating and drinks. Checkers watching. Petting.

**Done when**
- A 14-day headless soak: all NPCs keep routines, lateness < 1 game hour, zero stuck agents.
- Reactive-line fixtures pass: storm, new coat, truck fixed, etc.
- **User Playtest #3:** "does the town feel alive?"

#### M5 — Business (≈ 8 sessions)
**Deliverables**
- Economy complete: prices, demand, chalkboard, wholesale, order generation, delivery spots, **porch woodpiles grow and shrink**, payment scenes and mailbox envelopes, contracts, jobs (shovel, roof, plow), business tier + sign swaps, ledger with chart, households, parcel runs, market stall.
- **All shop catalogues** with runtime 3D thumbnails and clothing try-on. All upgrades wired with their feel changes.
- Econ sim tuned.

**Done when**
- The econ sim is within ±15% of Part 4.4, with no dead spot > 45 min and no soft locks.
- **User Playtest #4 (3 h):** reaches truck, maul, snow tires, plow.
- The upgrade feel checklist is fully verified.

#### M6 — Winter Deepens (≈ 6 sessions)
**Deliverables**
- Blizzard (visuals, audio, drift growth, deadfall), cold snaps, ice fog, hoarfrost, aurora sky.
- Full forecast (radio, chalkboard, Bea).
- Warmth complete (head-home flow, lift offers). All clothing tiers (Blender meshes on the player rig). Lanterns. Snowshoes.
- Roof raking and mini-avalanches. Night lighting polish. **P10 White Out.**

**Done when**
- Each weather is distinct in shots and audio renders.
- Warmth tuning passes the sim and the user review ("cold never feels punishing").

#### M7 — Stillmere Lake and the Lindqvist Farm (≈ 10 sessions)
**Deliverables**
- **Lake:** ice-safety event, fishing (auger, rod, jig, bite, reel, 6 species, records, log), shelter, sauna and plunge, **Margo** (model, schedule, dialogue, arc L1–L3), ice-singing ambience, **P05**, lake households, boathouse.
- **Farm:** **Otto** and **Freya**, farm animals, orchard pruning → applewood, sugar-shack prep, farm orders, lane plow job, snow buntings, **P06**. Links: Nadia's wool, Mara's applewood.
- Stargazing v1 in the farm fields: star field, tracing, 6 constellations. Freya L1.

**Done when**
- **User Playtest #5** (lake and farm).
- All listed arc beats are playable.
- Budgets hold (S06, S07).

#### M8 — Graybeard Ridge (≈ 6 sessions)
**Deliverables**
- Ridge terrain and forests (oak stands, Grandmother Oak), switchbacks + chains, ridge trail + crampons, ranger station, **lookout tower**.
- **Felix** (arc L1–L3), deadfall map.
- Stargazing complete (12 + 3 hidden constellations, telescope).
- **First aurora set piece** (Freya L2). **P07**, **P08 Aurora**.
- Ridge Chute sled run. Heritage Oak.

**Done when**
- The user approves the first-aurora moment.
- S08 is within budget.

#### M9 — Festivals and Stories (≈ 12 sessions)
**Deliverables**
- **All festivals:**
  - Hearth Fair: holzhausen contest and splitting demo.
  - **Lantern Night:** parade, pageant, choir, bonfire, weathervane, aurora, cinematic splines.
  - Derby.
  - Meteor Night.
  - Sled Race + sculptures + snowball fight.
  - Sugaring Off + taffy.
  - Long Night's End + ice lanterns.
- **All arcs to L5** for all 14 characters, with rewards. Epilogue pools. **Year 2** loop and time-skip card. Hall piano. Choir and fiddle instruments. **F01–F06**.

**Done when**
- The "story soak" bot completes every arc in the headless sim. Every beat is reachable, and missed festivals fall back correctly.
- **User Playtest #6:** Lantern Night.

#### M10 — Home and Hobbies (≈ 8 sessions)
**Deliverables**
- Decorating (interior and exterior, catalogue, cozy score).
- **Bird feeding + Bird Book** (10 species, flocking, Winter Wren).
- Snowmen and snow angels. Sledding runs. Porch swing and time-lapse polish.
- Collections UI. Gramophone jukebox. Pip's bottle caps.
- *Stretch:* whittling, skating.

**Done when**
- **User Playtest #7:** a 30-minute "just existing" session feels lovely.

#### M11 — Polish, Onboarding, Accessibility (≈ 10 sessions)
**Deliverables**
- The full Part 9 checklist: juice audit, transitions, UI/UX consistency, hint tuning, accessibility completion.
- Audio loudness pass across all content, mix snapshots.
- Photo mode.
- Worst-case performance: Lantern Night crowd, blizzard in town.
- Bug bash, save compatibility.

**Done when**
- The Part 9 checklist is at 100%.
- **User Playtest #8:** ideally a fresh player's first hour.

#### M12 — Release Candidate (≈ 4 sessions)
**Deliverables**
- A 4-hour in-browser soak.
- Save fixtures for every version with migration tests.
- Final perf and bundle reports, credits (font licenses, tools), README "how to play", the `v1.0` tag and Pages release.

**Done when**
- All CI gates are green, there are no must-fix bugs, and the user signs off.

### 8.3 Dependency graph
```
M0 → M1 ★ → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 → M11 → M12
                        └────────── M5 econ tuning reruns after M7/M8/M9 content ──────────┘
```
- Art (Blender characters) and writing can run one milestone ahead of their systems. Each session prefers finishing systems, then content.
- **Never move on with a red CI or an unresolved must-fix.**
