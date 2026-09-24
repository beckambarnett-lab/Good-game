## Part 7 — Technical Architecture

### 7.1 Stack (pin exact versions in M0; the versions below are current as of this plan)

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (strict). TS 7.x if tooling is smooth, else 5.9 | Types catch cross-data mistakes for a long-lived AI-maintained codebase |
| Bundler / dev server | Vite 8 | Fast HMR, static build |
| 3D | three r186 (`WebGLRenderer`, WebGL2) | See Part 0 |
| Post | `postprocessing` 6.39 (peer range covers r186), `n8ao` 2.x | Merged effect passes, quality AO |
| Collision | `three-mesh-bvh` 0.9 | Fast capsule and ray queries, camera collision |
| Asset decode | `GLTFLoader` + `MeshoptDecoder` (three examples) | Compact .glb |
| UI | `preact` 10 + `@preact/signals` | Tiny, reactive DOM overlay |
| Storage | IndexedDB (tiny in-house wrapper), `CompressionStream` | Saves |
| Tests | Vitest 5 (unit/sim), Playwright 1.56.x pinned to the preinstalled Chromium | Headless browser QA in the container |
| Lint / format | Biome | One fast tool |
| Asset build (offline) | `bpy` 4.5 LTS via `uv`, `@gltf-transform/cli` | Headless Blender scripts, meshopt compression |
| CI / deploy | GitHub Actions → GitHub Pages | Playtest builds per milestone (the repo is public) |

**Runtime dependency budget:** only three, postprocessing, n8ao, three-mesh-bvh, preact and signals. Anything else needs a written reason in `docs/decisions/`.

### 7.2 Repository layout
```
Good-game/
├─ CLAUDE.md                     # how to work on this repo (read first every session)
├─ README.md
├─ docs/
│  ├─ plan/                      # this plan, split by Part (00–10) + index
│  ├─ decisions/                 # short ADRs (one per non-obvious choice)
│  ├─ playtests/                 # user feedback notes per milestone, with resolutions
│  └─ progress.md                # milestone checklist state (updated every session)
├─ index.html
├─ package.json · tsconfig.json · vite.config.ts · vitest.config.ts · playwright.config.ts · biome.json
├─ public/
│  ├─ assets/                    # committed .glb outputs from art/blender
│  └─ fonts/                     # OFL fonts + licenses
├─ art/
│  ├─ blender/  build.py · lib/ (parts, rig, anim, export) · characters/ · animals/ · vehicles/ · tools/
│  └─ previews/                  # turntable contact sheets (from our viewer)
├─ src/
│  ├─ main.ts
│  ├─ app/        App.ts (state machine) · Boot.ts · GameLoop.ts · Game.ts · Context.ts · EventBus.ts · Settings.ts · Visibility.ts
│  ├─ core/       math/ (vec, spring, easing, noise, curves, geom) · rng.ts · pool.ts · spatialHash.ts · log.ts · assert.ts · profiler.ts
│  ├─ data/       tuning.ts · woods.ts · items.ts · upgrades.ts · shops.ts · clothing.ts · households.ts · orders.ts
│  │              festivals.ts · weather.ts · strings/en.ts
│  │              characters/*.ts · dialogue/*.ts · arcs/*.ts · music/*.ts · sfx/*.ts · world/*.ts
│  ├─ sim/        # PURE LOGIC — runs in Node (no DOM, no WebGL, no WebAudio)
│  │  ├─ Sim.ts                  # headless world orchestrator (system list, fixed step, advance(dt))
│  │  ├─ clock/ · weather/ · world/ (Heightfield, TerrainGen, Zones, Collision, Sites)
│  │  ├─ snow/ (Patches, TrailMap, Drifts, Accumulator)
│  │  ├─ wood/ (Trees, Logs, Rounds, Heap, Woodshed, Debris)
│  │  ├─ player/ (State, Movement, Warmth, Clothing, Carry, Inventory)
│  │  ├─ actions/ (Felling, Bucking, Splitting, Stacking, Shoveling, Plowing, Loading, Fishing,
│  │  │            Snowman, Stargazing, Sitting, Drinking, Stove, Decorating)
│  │  ├─ vehicles/ (TruckSim, SledSim, Wheelbarrow)
│  │  ├─ npc/ (Npc, Schedule, NavGraph, Pathfinder, Steering, Activities, Ambient, Birds, Fish)
│  │  ├─ story/ (Friendship, TownMemory, Arcs, Dialogue, Conditions, Effects, Letters, Hints,
│  │  │          Festivals, Collections)
│  │  ├─ economy/ (Prices, Demand, Orders, Contracts, Jobs, Ledger, Shops, Business)
│  │  └─ save/ (SaveModel, Serializer, Migrations)
│  ├─ music/      # PURE: Theory, Piece, Form, Performers/*, DirectorCore (emits note events)
│  ├─ dsp/        # PURE: Sound Foundry DSP + instrument/SFX recipes + analysis (LUFS, clicks)
│  ├─ view/       # BROWSER: rendering, audio playback, UI
│  │  ├─ render/  Renderer · Quality · DynamicResolution · PostFX · effects/ · palette · materials/ (+chunks/*.glsl)
│  │  │           Sky · Lights · LightPools · Shadows · Culling · Instancing · Batching · Cutaway · Prewarm
│  │  ├─ geo/     Joinery (mesh DSL) · trees/ · buildings/ (BuildingGen, InteriorGen, kits/) · props/
│  │  │           terrain/ (TerrainMesh, NearField) · snow/ (PatchMesh, Banks, DriftMesh) · wood/ (RoundGeo,
│  │  │           SplitGeo, StackView, HeapView, ChipsView) · ForestCards · Mountains · Water
│  │  ├─ fx/      Snowfall · Deformation · Particles · Smoke · Fire · Breath · Textures
│  │  ├─ actors/  AssetLoader · CharacterView · AnimController · IK · SpringBones · Faces · AnimalView · TruckView · ToolView
│  │  ├─ camera/  CameraRig · Framings · CinematicSplines · PhotoMode
│  │  ├─ audio/   AudioEngine · Buses · Mixer · Reverbs · Spatial · Sfx · Footsteps · Ambience · VoiceBlips
│  │  │           Radio · MusicPlayer (plays DirectorCore events) · FoundryClient (worker pool)
│  │  ├─ ui/      (Preact) hud/ prompts/ dialogue/ notebook/ menus/ shop/ map/ toasts/ theme/
│  │  └─ input/   Input · Bindings · Keyboard · Mouse · Gamepad · PointerLock · Glyphs
│  ├─ workers/    foundry.worker.ts · terrain.worker.ts
│  └─ dev/        DevOverlay · Cheats · Shots · Benchmark · AssetViewer · SoundBoard · PoseLab · FeedbackCapture
├─ tools/         econ-sim.ts · soak.ts · shots.ts · audio-render.ts · perf-probe.ts · check-content.ts · build-assets.sh
├─ tests/         unit/ · sim/ · e2e/ · fixtures/saves/
└─ .github/workflows/  ci.yml · pages.yml
```
**The one hard rule:** `sim/`, `music/` and `dsp/` never import from `view/`, the DOM, WebGL or WebAudio. This keeps the whole game logic testable and simulatable in Node: econ sim, soak tests, save round-trips and music repetition tests.

### 7.3 Runtime architecture
- **App state machine:** `Boot → Splash (audio unlock) → Title → (NewGame | Load) → Loading → Playing ⇄ Paused`, with sub-states `Dialogue`, `Shop`, `Notebook`, `Photo` and `Cutscene`, plus `TimeSkip`.
- **Game loop:** `requestAnimationFrame`.
  - A **fixed 60 Hz simulation** step with an accumulator, max 5 steps per frame to avoid a spiral of death.
  - Render interpolation with alpha, so 120/144 Hz displays are smooth.
  - The sim never reads frame time.
- **`Game`** owns the `Sim` (headless systems) and the `View` (renderer, audio, UI).
  - The view reads sim state and interpolates positions.
  - The sim emits typed events (`EventBus`) that view, audio and UI subscribe to.
  - Input becomes **commands** into the sim (`MoveIntent`, `UsePressed`, `Interact`…).
- **System interface:**
```ts
interface SimSystem {
  readonly id: string;
  init(ctx: SimContext): void;
  fixedUpdate(dt: number): void;              // 1/60 s
  advance(gameMinutes: number): void;         // coarse skip (sleep, background, tests)
  serialize(): unknown; deserialize(data: unknown, version: number): void;
}
```
- **Fixed-step order:**
  1. Input commands
  2. Clock
  3. Weather/Environment
  4. Player movement
  5. Interaction targeting
  6. Active action
  7. Vehicles
  8. Snow
  9. Wood (felling falls, debris, seasoning)
  10. NPC schedules → paths → steering
  11. Birds and fish
  12. Story (dialogue queue, arcs, hints)
  13. Economy (orders, jobs, demand at rollover)
  14. Autosave triggers
- **Render-rate order:**
  1. Animation mixers + IK + springs
  2. Camera rig
  3. Culling and instancing updates (throttled at 10 Hz)
  4. Particles
  5. Environment → materials uniforms
  6. Audio parameter sync (listener, emitters, mixer snapshot)
  7. Render + post
  8. UI signal sync (throttled)
- **Events** are typed (`EventMap`), e.g. `'wood/split' {species, clean, streak, pos}`, `'snow/patchCleared' {patchId, owner}`, `'economy/orderCompleted' {orderId, coins}`, `'npc/bark' {npcId, lineId}`, `'music/stinger' {id}`.
- **Determinism:** one seeded PRNG (sfc32) with named forks (`rng.fork('weather')`), so every system's randomness is reproducible from the save seed. Wall-clock time is never used in the sim.
- **Time skip:** `Sim.advance(minutes)` steps systems coarsely: snow accumulator, stove, seasoning, schedules re-placed, weather timeline, orders at rollover. Used for sleep, background resume (optional), tests and the econ sim.

### 7.4 Key modules

| Module | Responsibility | Notes |
|---|---|---|
| `Joinery` (view/geo) | Mesh DSL: primitives, transforms, palette colouring, jitter, flat normals, tags (cutaway groups, `snow`, `sway`), merge | Returns BufferGeometry + metadata. Unit-tested for vertex counts and determinism |
| `TerrainGen` (sim/world) | `height(x,z)` from authored features: valley bowl, ridge rise, masked noise, **flatten polygons** (town, lots), **road splines** (profile + shoulders), **creek carve**, lake basin | Runs in a worker at load (513² samples, about 60 ms). Deterministic. Also yields masks: forest density, exposure, rockiness |
| `TerrainMesh` + `NearField` (view) | 32 m chunks × 4 LODs with skirts, plus a 96 m dense (0.25 m) deformation field around the player | Snow shader reads deformation RTs |
| `Forest` (view) | Global per-(species × LOD) `InstancedMesh`es with CPU culling and LOD selection at 10 Hz; forest cards beyond 300 m | About 12 draw calls for all trees (+ shadow) |
| `Batching` (view) | Static buildings and props packed into `BatchedMesh` per material | Cutaway swaps a building's parts to individual meshes while inside |
| `Cutaway` (view) | Interior enter/exit: dither-fade tagged walls and roof, camera pose, light and audio snapshot | Fallback: fade-teleport (Part 10) |
| `Deformation` (view/fx) | Near RT (toroidal) + world trail texture; stamp batches; refill pass | Mirrors sim `TrailMap` for gameplay |
| `SnowPatches` (sim) + `PatchMesh` (view) | Patch grids (`base`, `aMark`), clearing ops, clearance %, bank volumes; dirty-rect uploads | The core gameplay snow |
| `Woodshed` (sim) + `StackView` (view) | Bays, lots, slots, seasoning, FIFO loading; instanced split pieces with per-instance `season` | Visual stack exactly equals the data |
| `Debris` (sim) | Physics-lite rigid bodies (≤ 64 active): gravity, heightfield/box contacts, restitution 0.2, friction 0.6, sleep | For splits, rounds, chips |
| `Movement` (sim/player) | Kinematic capsule: BVH shapecast, step-up, slope limit, ground snap, surface speed rules | three-mesh-bvh on a static collision BVH (simplified collision meshes built alongside visuals) |
| `TruckSim` (sim) | Raycast-wheel arcade model (Part 2.8) | Deterministic fixed-step |
| `Schedule` / `Pathfinder` / `Steering` (sim/npc) | `schedule(t)` pure function; A\* on the nav graph with cache; smoothing; separation | LOD tiers |
| `Dialogue` (sim/story) | Chat selection, scenes, effects, recency memory | Conditions are typed predicates |
| `Environment` (sim/weather) | Blends time key frames + weather → one `EnvState` (sun, sky, fog, grade, wind, gust, snowfall, temperature) | Consumed by materials, audio, gameplay |
| `DirectorCore` (music) | Context → piece → form → performers → **note events** (time, instrument, pitch, velocity, duration) | Pure; testable in Node; `MusicPlayer` schedules the events in WebAudio |
| `Foundry` (dsp) | Synthesis recipes → Float32Arrays; analysis utilities | Worker pool in browser; Node in tools |
| `AudioEngine` (view/audio) | Context, buses, IRs, mixer snapshots, ducking, spatial emitters, pooling | — |
| `CameraRig` (view) | Orbit, springs, contexts, collision, shake, cinematics | — |
| `AnimController` (view/actors) | Mixer + layers + events → sim/audio | Clip phases drive input timing windows |

### 7.5 World data (authored as TypeScript, `src/data/world/`)
```ts
export const roads: RoadDef[] = [
  { id: 'main_street', width: 10, surface: 'asphalt', plowedBy: 'town',
    points: [[-100,0],[-50,0],[0,0],[50,0],[100,0]], sidewalks: 2.5, lamps: { every: 20, side: 'both' } },
  { id: 'lake_road', width: 6, surface: 'gravel', plowedBy: 'player',
    points: [[100,0],[130,5],[165,15]], gate: { drift: 'lake_drift', needs: 'plow_blade' } },
  // …
];
export const buildings: BuildingDef[] = [
  { id: 'kettle', lot: 'S3', pos: [-44, 16], rot: 180, footprint: [10, 12], floors: 2,
    walls: 'clapboard', palette: ['mustard','cream'], roof: { type: 'gable', pitch: 38, material: 'plum' },
    chimney: { at: [3, -2], kind: 'brick' }, porch: { depth: 2.4, steps: 3 },
    windows: { front: ['W3','W3','door','W3'], side: ['W2','W2'] }, sign: { text: 'The Kettle', board: 'oval' },
    interior: 'cafe', snowPatches: ['kettle_steps','kettle_walk'], deliverySpot: [ -40, 22 ] },
  // …
];
export const patches: PatchDef[] = [
  { id: 'kettle_walk', owner: 'mara', surface: 'flagstone', rect: [-47, 18, 3, 8], cell: 0.125, exposure: 1 },
  // …
];
```
- **Plus:** `props.ts` (placements and scatter rules), `navgraph.ts` (nodes and edges; helper generators along roads and sidewalks), `zones.ts` (polygons → zone ids), `sites.ts` (tree site generation: Poisson-disc within forest masks, excluding roads, buildings and paths via distance fields; hero trees fixed; stable integer ids for saves).
- **Validation:** `tools/check-content.ts` (also run in CI) validates all cross-references: every schedule place exists, every patch owner is a character or household, every order customer has a delivery spot, every dialogue condition references existing flags, items and characters, every shop item exists, and every nav node is connected.

### 7.6 Content data formats (typed; `satisfies` checks)
```ts
// woods.ts
export const woods = {
  pine:  { hardness: 1.0, seasonDays: 2, burnHours: 0.8, price: 4,  wholesale: 2,  color: 'pineEnd' },
  birch: { hardness: 1.2, seasonDays: 3, burnHours: 1.0, price: 6,  wholesale: 4,  color: 'birchEnd' },
  oak:   { hardness: 2.0, seasonDays: 5, burnHours: 1.6, price: 10, wholesale: 6,  color: 'oakEnd' },
  apple: { hardness: 1.4, seasonDays: 3, burnHours: 1.2, price: 16, wholesale: 10, color: 'appleEnd' },
} satisfies Record<WoodId, WoodDef>;

// upgrades.ts
{ id: 'splitting_maul', shop: 'anvil', price: 110, requires: [], tier: 1,
  effects: [{ kind: 'splitTool', tool: 'maul', split: 48, windup: 0.8 }],
  feel: { sfxSet: 'maul', anim: 'split_maul', cameraKick: 1.3 }, target: { hour: 3.5 } }

// characters/hal.ts
export const hal: CharacterDef = {
  id: 'hal', name: 'Hal Brennan', home: 'hal_house', walk: 1.1,
  voice: { basePitch: 105, formants: 'low_gravel', rate: 11 }, look: 'char_hal',
  gifts: { loved: ['carved_bird','birch_bark'], liked: ['cardamom_bun','pinecone','tea_tin'] },
  relations: { gus: 'friend', margo: 'oldFlame', rusty: 'friend', pip: 'grandfatherly' },
  schedule: {
    weekday: [ ['06:30','homeIdle','hal_house'], ['07:15','eat','kettle.table2'], ['08:45','whittle','hal_house.porch'],
               ['11:30','feedBirds','square.feeder'], ['12:30','homeIdle','hal_house'],
               ['15:00','checkers','kettle.table1', { days: ['mon','wed','fri'], with: 'gus' }], /* … */ ],
    overrides: [ { when: dow('mon'), blocks: [ ['07:30','visit','cabin.porch_bench'], ['12:00','walk','hal_house'] ] },
                 { when: weather('blizzard'), replace: 'outdoor→homeIdle' } ],
  },
};

// dialogue/hal.ts
chat('hal.chop_advice', { when: [carryingTool('axe')], weight: 2 },
  [ say('hal', "Let the axe do the work. You just steer.") ]);
scene('hal.arc3.one_last_tree', { arc: ['hal', 3], when: [dayAtLeast(10), at('cabin'), time(8, 15)] }, [
  say('hal', "There's a pine out back I've been eyeing for thirty years."), /* … */,
  effect(startCoopFelling('hal_last_pine')), effect(advanceArc('hal')),
]);

// music/p01_lullaby.ts  (Part 6.4 specification encoded)
export const lullaby: PieceDef = { id: 'P01', key: 'D', mode: 'major', meter: [3,4], bpm: 66,
  sections: { A: { chords: ['D','A/C#','G','A','D','Bm','A','D'], melody: 'lullaby_A' },
              B: { chords: ['Bm','G','A','D/F#','Em','A/C#','A7','D'], melody: 'lullaby_B' } },
  motifs: { M1: [[0,'F#4',1],[1,'A4',1],[2,'D5',1]], /* … */ },
  moods: { clear: { keys: 'feltPiano', pad: 'warmPad', sparkle: 'musicBox' }, night: { /* … */ } },
  form: 'Intro(2) A A\' B? A\'\' Outro(2)' };
```

### 7.7 Save format
```jsonc
{ "saveVersion": 3, "gameVersion": "0.9.0", "seed": 1847261, "createdAt": "…", "playSeconds": 51233,
  "clock": { "minutes": 40215.5 }, "weather": { "timeline": [/* 16 blocks */], "accum": 812.4 },
  "player": { "name": "Robin", "pronouns": "they", "look": {…}, "pos": [..], "yaw": 1.2, "warmth": 74,
              "coins": 312, "tools": {…}, "clothing": {…}, "carry": {…}, "buffs": [..] },
  "wood": { "trees": [[siteId, state, species, size, growth]…], "logs": [...], "rounds": [...],
            "heap": [...], "shed": { "level": 2, "bays": [ { "lots": [ { "species": "birch", "count": 34, "stackedAt": 20.3 } ] } ] } },
  "snow": { "patches": { "kettle_walk": "<b64 u8 grid>", … }, "aMarks": "<b64>", "trail": "<b64 gz u8 1024²>", "drifts": {…} },
  "vehicles": { "truck": { "pos": [..], "upgrades": [...], "bed": [...], "radio": 1 } },
  "npcs": { "friendship": { "hal": 47, … }, "arcs": { "hal": 3, … }, "flags": [...], "seenLines": { "hal.chop_advice": 20.5 } },
  "memory": [ { "id": "storm_last_night", "t": 39000 } ],
  "economy": { "orders": [...], "contracts": [...], "ledger": [...], "tier": 2, "points": 61, "demand": {...} },
  "world": { "snowmen": [...], "holes": [...], "decor": [...], "feeders": [...], "placedItems": [...] },
  "collections": { "birds": [...], "fish": {...}, "stars": [...], "postcards": [...] } }
```
- Stored gzipped. Header fields (day, coins, location, thumbnail) are kept separately for fast slot listing.

### 7.8 Performance budget (Medium preset, 1080p, reference iGPU)

| Resource | Budget | How it's measured |
|---|---|---|
| Frame time | 16.6 ms (60 fps), p99 < 20 ms | In-game Benchmark (user hardware), timer queries |
| CPU: sim fixed step | ≤ 2.5 ms per step (60 Hz) | Profiler marks; Node soak test (hardware-independent CPU proxy with a 4× headroom check) |
| CPU: render submission + animation | ≤ 4 ms | Profiler |
| CPU: audio scheduling | ≤ 0.5 ms | Profiler |
| Draw calls (main pass) | ≤ 250 (Low 180, High 350) | `renderer.info` in shot tests (**CI gate**) |
| Triangles (main pass) | ≤ 1.2 M (Low 0.6 M, High 2 M) | `renderer.info` (**CI gate**) |
| Shadow pass | ≤ 120 draws, ≤ 0.6 M tris | `renderer.info` |
| Skinned characters on screen | ≤ 24 at full rate | LOD rules |
| Dynamic lights | 6 point + 1 directional | Fixed pool |
| Textures + RTs (GPU) | ≤ 160 MB | Estimation tool in the dev overlay |
| JS heap | ≤ 350 MB, no growth over 2 h | Soak with heap snapshots (Playwright CDP) |
| Audio PCM | ≤ 64 MB | Foundry accounting |
| Per-frame allocations | ~0 in steady state | Chrome "allocation sampling" check in the perf probe |
| Load: first splash | ≤ 1.5 s | Playwright timing |
| Load: title screen | ≤ 5 s | Playwright timing |
| Load: in-game | ≤ 8 s | Playwright timing |
| Download (gz) | JS ≤ 1.2 MB, assets ≤ 12 MB, fonts ≤ 400 KB | Build report (**CI gate**) |
| Shader warm-up | All variants compiled before gameplay; no hitch > 50 ms after load | Perf probe long-frame detector |

**Standard CPU/GPU tactics:**
- Object pools and scratch vectors (no per-frame `new`).
- Typed arrays for large stores.
- Throttled culling.
- `InstancedMesh` + `BatchedMesh`.
- Frozen matrices for static objects (`matrixAutoUpdate = false`).
- Shared materials.
- `renderer.compile` pre-warm.
- Shadow casters limited (small props don't cast).
- Shadow map updates each frame only within 60 m.
- Far forest cards receive no shadows.

### 7.9 Rendering specifics
- **Color management:** sRGB output, linear workflow. Palette tokens converted once.
- **Shadows:**
  - The directional shadow camera follows the player (texel-snapped to avoid shimmer).
  - At night the moon casts soft shadows (lower resolution, 0.5 opacity).
  - Only the High preset uses cascades (CSM addon).
- **Fog:** custom height+distance fog in `HearthMaterial` (sky-horizon coloured).
- **Transparency:** kept minimal (particles, glass, dither for fades).
- **Cutaway:** a dither-fade uniform per building part, depth-write kept for stable sorting.
- **Weather-driven uniforms** live in one UBO-like shared uniform object: time, wind, gust, snow coverage, temperature, fog, sun and moon direction.
- **Headless verification:** the same renderer runs in SwiftShader in CI for screenshots. Shots use a fixed timestep and a fixed `rng` seed for determinism; pixel diffs against approved baselines use a tolerance (SSIM ≥ 0.98).

### 7.10 Tooling, testing and verification (how "done" is proven without a GPU or speakers)

| Tool | Command | What it proves |
|---|---|---|
| Typecheck, lint | `npm run check` | No type or lint errors |
| Unit tests | `npm test` | Pure logic: prices, demand, orders, seasoning, warmth math, snow patch math, splitting damage model, schedule(t), A\*, dialogue selection, conditions, voice leading, form grammar, save migrations, Joinery determinism |
| Content check | `npm run content` | All data cross-references valid (Part 7.5) |
| **Econ sim** | `npm run econ` | Runs `Sim` headless for 60 in-game days with scripted player policies (typical, wholesale-only, orders-only, idle-heavy). Reports cumulative coins, unlock times, dead spots, soft locks. **Gate:** matches Part 4.4 within ±15% |
| **Soak** | `npm run soak` | 30 in-game days headless with a random-but-sane bot. Asserts no exceptions, no stuck NPCs (arrival lateness < 1 game hour), no NaNs, save round-trip each day is byte-stable, memory flat |
| **Shots** | `npm run shots` | Playwright + SwiftShader: the S01–S20 contact sheet (Part 5.13) + `renderer.info` budget checks + no console errors + SSIM vs baselines |
| **Perf probe** | `npm run perf` | Headless: long-frame detector, heap growth over a scripted 10-minute run, allocation sampling, load timings |
| **Audio render** | `npm run audio` | Part 6.11 metrics, WAVs and spectrograms → `artifacts/audio/` |
| **E2E** | `npm run e2e` | Boot → splash → new game → Hal walkthrough (scripted inputs) → fell, buck, split, stack → save → reload → verify state; settings persist; pause and menus |
| Assets | `npm run assets [name]` | Headless Blender build + meshopt + our-viewer turntable previews |
| **Benchmark (user)** | In-game: Settings → Benchmark | 90 s scripted flythrough (town at night, woodlot in snow, lake at dawn). Reports avg / 1% low fps, GPU ms (timer query), draw calls, preset, and a copyable text block for the user to paste back |
| **Feedback capture (user)** | F8 in playtest builds | Screenshot + game-state snapshot + note → a downloadable `.json` to attach in chat |

- **CI (`ci.yml`, on every PR):** check → unit → content → build → e2e smoke → shots (artifacts) → audio metrics (artifacts) → bundle-size report.
- **Pages (`pages.yml`, on main and milestone tags):** build → deploy to GitHub Pages, with dev pages (Sound Board, Asset Viewer, Benchmark) enabled behind `?dev=1`.

### 7.11 Engineering conventions
- TypeScript strict, `noUncheckedIndexedAccess`, no `any` (use `unknown` + guards). ES modules. Small files (< 400 lines, one concept each).
- **All tunables live in `data/tuning.ts`.** All player-visible strings live in data. Magic numbers in code are bugs.
- **Sim/view separation** (7.2). Events for cross-system communication; no reaching into other systems' internals.
- **Deterministic RNG only** in sim, music and dsp. No `Math.random` (lint rule).
- **No per-frame allocation in hot paths.** Pools for particles, emitters, vectors.
- **GPU resources** are disposed through an owner registry. Leaks are checked in the perf probe.
- Comments explain *why*, not what. ADRs for decisions that future sessions might otherwise undo.
- **Definition of Done (every feature):**
  1. Code + unit tests (where logic exists).
  2. Tunables in data.
  3. **Juice: animation + particles + layered sound + world response.**
  4. Save/load support.
  5. Settings and accessibility respected.
  6. Perf budget holds (shots + probe).
  7. Screenshots and audio metrics reviewed.
  8. `docs/progress.md` updated.
  9. No console errors.
