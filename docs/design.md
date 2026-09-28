# CLOBBERFIELD: Design Document (docs/design.md)

> A physics sandbox where two armies of wobbly ragdoll soldiers bonk each other. You get a gold budget, place your blue army on your half of the field, press Start, and watch the mess.
> This is an implementation spec. All numbers are starting values and live in `src/data/tuning.js` or `src/data/units.js`. All names, factions, units and maps are original.

---

## 0. Conventions

- Units are SI: meters, seconds, kilograms. Impulses are N·s. Angles are degrees in data and radians in code.
- World axes: **y is up**. **x is the battle axis**: blue deploys at x < 0, red at x > 0. **z is lateral**. Blue units face yaw 0 (+x) and red units face yaw π at spawn.
- Field: **80 × 60 m** (x ∈ [-40, 40], z ∈ [-30, 30]). This is the standard; maps can shrink it.
- Sim rate: **60 Hz fixed** (dt = 1/60). The sim is deterministic from `seed` and the placement list.
- Colors: `team` means team color, `teamDark` means the darker team shade, `skin` means the faction skin color, and anything else is a hex value.
- Team colors: **Blue `#3F7FFF` / dark `#2A55B8`**, **Red `#FF5A4E` / dark `#B83228`**. No faction palette uses pure red or pure blue.

---

## 1. Architecture

### 1.1 Build and delivery

- The deliverable is `dist/index.html`: one file with inline CSS and one inline `<script type="module">`.
- Three.js r128 UMD is loaded by `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">` before the module and accessed as `globalThis.THREE`. Only `src/view/**` touches it.
- cannon-es 0.20.0: sim files `import * as CANNON from 'cannon-es'`.
  - `build.mjs` runs esbuild with a plugin: `onResolve({filter:/^cannon-es$/}) → {path:'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js', external:true}`.
  - In Node tests, `cannon-es` resolves from `node_modules` (devDependency, pinned to 0.20.0).
- `build.mjs` bundles `src/main.js` in ESM format with minify on and inlines it into `index.template.html`.
- Debug hooks are available only with `?debug=1`: `window.__clobber = { state, sim, debug:{ setTimeScale(n), fillArmy(side,gold,seed), winNow(side), stats(), seed } }`.

### 1.2 Module layout and responsibilities

| Module | Responsibility |
|---|---|
| `src/data/units.js` | `UNITS` array of UnitDef (section 2) plus `MOUNTS` defs and shared primitive "kits". Pure data. |
| `src/data/factions.js` | 8 FactionDefs: id, name, palette, skin, blurb, unit order. |
| `src/data/maps.js` | 6 MapDefs, with height/surface functions as pure JS. |
| `src/data/campaign.js` | 22 LevelDefs (20 main + 2 bonus), chapter metadata, unlock rules. |
| `src/data/tuning.js` | All constants: physics gains, rule timers, knockback caps, cost formula constants, camera, LOD, quality presets. |
| `src/sim/rng.js` | `mulberry32(seed)` with helpers `float()`, `range(a,b)`, `int(a,b)`, `pick(arr)`, `gauss()`. The sim never calls `Math.random`. |
| `src/sim/world.js` | `createSim(opts)`. Owns the CANNON.World, ground/props from the map, spatial hash, hazards, battle rules (timers, sudden death, victory), tick order, snapshot buffers. |
| `src/sim/ragdoll.js` | Builds bodies and constraints for the archetypes (humanoid, mounted, cart). Balance controller (hover, upright, yaw), gait, arm pose drive, stagger/launch/down/getup, death to limp, sleep/despawn. |
| `src/sim/unit.js` | Unit factory (def to Unit object), state machine glue, status effects (slow, burn, haste, might), damage/heal application, heal cap. |
| `src/sim/ai.js` | Staggered think: targeting, steering (separation, hazards, edges, bridges), kiting, charging, support positioning, stuck detection. |
| `src/sim/combat.js` | Attack state machine (windup, hit, recover). Melee arc resolution, slam, beam, cone, chain, aoePoint, heal, buff, revive, summon, charge. Knockback application. |
| `src/sim/projectiles.js` | Pooled struct-of-arrays ballistic projectiles: launch-angle solve with lead, substep integration, spatial-hash hits, terrain/prop impacts, splash, roller, boomerang, heal lobs. |
| `src/sim/effects-events.js` | Event bus (`emit`, `drain`) and area-effect entities (spore clouds, flower patches, telegraphs, geyser state). Radial damage/impulse helper. |
| `src/view/renderer.js` | THREE scene, lights, sky, ground mesh from the map, one InstancedMesh per primitive geometry, per-frame instance matrix/color writes, LOD, frustum cull, build-phase ghosts, zone tint, unit icon rendering. |
| `src/view/camera.js` | Build cam, free-fly cam, follow cam, cinematic cam, shake (trauma), input binding (mouse, keys, touch). |
| `src/view/fx.js` | Particle pool (one InstancedMesh per particle shape), event to effect mapping, damage flash, KO stars, beams, chain bolts, trails, telegraph rings. |
| `src/audio/sfx.js` | WebAudio synth recipes, voice limiter, per-type throttling, music loop. |
| `src/ui/*.js` | `dom.js` (helpers), `menu.js` (title/settings), `campaign.js` (map screen), `build.js` (build phase), `hud.js` (battle HUD), `result.js`, `sandbox.js`, `save.js` (storage wrapper). |
| `src/main.js` | Boot, game state machine, main loop (fixed-step accumulator, interpolation), event dispatch to view/audio/ui. |

**Hard rule:** nothing under `src/sim/` or `src/data/` may reference `window`, `document`, `THREE` or `performance`. They must pass `node --test`. Timing inside the sim uses tick counts.

### 1.3 Key data structures

**Unit (runtime, `sim/unit.js`)**
```js
{
  id, defId, def, team: 0 /*blue*/ | 1 /*red*/,
  alive: true, state: 'idle'|'move'|'attack'|'stagger'|'launched'|'down'|'getup'|'dead',
  hp, maxHp, value /* cost; 0 for summons; halved after revive */,
  isSummon: false, revived: false, revivesLeft /* remolder only */,
  bodies: { torso, head, armL, armR, legL, legR, mount?, mountHead?, cart? },  // CANNON.Body refs
  constraints: [], riderLock: null,
  bodyIndex0,            // first slot in sim snapshot arrays
  pos: {x,y,z}, vel: {x,y,z}, yaw, desiredYaw,          // cached after each physics step
  moveDir: {x,z}, desiredSpeed, charging: false,
  target: unitId|null, targetScore, thinkOffset /* id % 15 */, path: [waypoints], pathIdx,
  atk: { phase:'ready'|'windup'|'active'|'recover', t, cdLeft, chargeCdLeft, beamT, discOut },
  status: { slowAmt, slowT, burnDps, burnT, burnSrcTeam, hasteT, mightT, healBucket },
  bal: { gain /*0..1*/, staggerT, launchT, downT, getupT, airborneT },
  gait: { phase },
  stuck: { lastX, lastZ, t },
  stats: { dmgDealt, dmgTaken, kills, healed },
  deathTick: -1, corpseState: 'fresh'|'settled'|'sleeping'
}
```

**UnitDef**: see section 2. **MountDef**: see section 2.4. **MapDef**: see section 5.1. **LevelDef**: see section 6.1.

**Placement (source of truth for build phase):**
`army = [{ defId, x, z, team }]`. The sim is always rebuilt from `(seed, mapId, army)`, so Reset and Retry are exact.

### 1.4 Game state machine

```
BOOT → TITLE
TITLE → CAMPAIGN_MAP | SANDBOX_SETUP | SETTINGS(overlay)
CAMPAIGN_MAP → BUILD(level)
SANDBOX_SETUP → BUILD(sandbox)            (map picker, gold mode, seed)
BUILD → COUNTDOWN (Start; only if player army non-empty; campaign: red preset loaded)
COUNTDOWN (1.5 s "3-2-1-CLOBBER!", AI frozen, physics running) → BATTLE
BATTLE ⇄ PAUSED (time control)
BATTLE → RESULT (sim.result != null)
BATTLE → BUILD (Reset: rebuild sim from army, same seed)
RESULT → BUILD (Retry / Edit Army, keeps army) | BUILD(next level) | CAMPAIGN_MAP | TITLE
```
In BUILD the sim exists with AI disabled and battle rules off, so units bob idly in place. Adding or removing a unit calls `sim.addUnit` / `sim.removeUnit`.

### 1.5 Sim API

```js
const sim = createSim({ seed, mapId, army, rules:{ campaign:true }, perfMode:false });
sim.addUnit(defId, team, x, z) → id;  sim.removeUnit(id);  sim.begin();
sim.step();                 // exactly one 1/60 tick
sim.drainEvents() → Event[] // events since last drain
sim.snapshot                // Float32Array pos(3)+quat(4) per body, plus prevSnapshot for interpolation
sim.units, sim.projectiles, sim.areas, sim.time, sim.tick, sim.result
```

### 1.6 Tick order (one `sim.step()`)

1. `tick++`, `time += dt`. Update rule phase (normal / tired / sudden death). Update hazards (geyser timers; emit `geyserWarn` and `geyser`).
2. Rebuild the **spatial hash**: cell 3 m over 100×80 m, counting-sort into `Int32Array cellStart/cellItems`, keyed on torso (or mount) position. Cost is O(n).
3. **AI think** for units where `(tick + thinkOffset) % 15 === 0`, so each unit thinks every 0.25 s and about 8 units think per tick at 120 units. This updates target, path and desired move.
4. **AI steer** every tick for all units (cheap): path following, separation, hazard/edge repulsion, giving `moveDir` and `desiredSpeed`.
5. **Controllers** (`ragdoll.js`): hover, upright, yaw and locomotion forces; gait drive for legs; pose drive for arms. Skipped or scaled per `bal.gain`.
6. **Combat** (`combat.js`): advance attack state machines, resolve hit frames (melee, slam, beam ticks, cone ticks, chain, aoePoint resolution, heals, buffs, revives, summons, charges), spawn projectiles.
7. **Projectiles** step (substeps so each substep is 0.5 m or less), then hits and impacts.
8. **Areas and status**: spore clouds, flower patches, burn ticks (every 0.25 s), aura refresh (every 0.5 s), regen, heal-cap bucket refill, sudden-death drain.
9. `world.step(1/60)` (no internal substeps; `maxSubSteps` 1).
10. **Post-step**: cache pos/vel/yaw, then apply these checks in order:
    - NaN guard.
    - Fall-through fix.
    - killY and hole checks.
    - Lava contact.
    - Deaths (hp ≤ 0 → `die()`).
    - Corpse management (collision downgrade, sleeping, despawn).
    - Stuck detection.
11. **Battle rules**: victory check, timeout, stalemate breaker.
12. Copy body transforms into `snapshot` (swap with `prevSnapshot` first).

Per-tick budget (desktop, 120 units): physics 6 ms or less, AI 1 ms or less, combat+projectiles 1.5 ms or less, the rest 1 ms or less, for about 10 ms total at most.

### 1.7 Event bus (`effects-events.js`)

`sim.emit(type, data)` pushes `{type, tick, ...data}` into `sim.events`. `main.js` drains after each frame's sim steps and dispatches to `fx.on(e)`, `sfx.on(e)`, `camera.on(e)` and `hud.on(e)`. The sim never reads from consumers.

| type | payload | consumers |
|---|---|---|
| `spawn` | id | fx pop-in, sfx plink |
| `swing` | id, weapon | sfx whoosh, fx trail |
| `shoot` | id, kind, x,y,z | sfx thwip/boom |
| `hit` | srcId, targetId, x,y,z, dmg, dv, kind (`melee`,`proj`,`beam`,`splash`,`hazard`,`charge`) | fx sparks/flash, sfx bonk, shake |
| `stagger` | id | fx dizzy swirl |
| `launch` | id, dv | sfx boing, fx speed lines, slow-mo candidate |
| `death` | id, x,y,z, cause, value, legendary | fx KO stars + confetti, sfx wheee-plop, hud tally |
| `explode` | x,y,z, r, kind, hits | fx burst, sfx kaboom, shake |
| `impact` | x,y,z, surface (`ground`,`prop`,`water`,`lava`,`ice`) | fx dust/splash |
| `beam` | id, x0,y0,z0,x1,y1,z1, dur, kind | fx beam mesh, sfx zap |
| `chain` | points[] | fx bolt polyline |
| `cone` | id, dur | fx frost breath |
| `telegraph` | x,z, r, dur | fx ground ring |
| `heal` / `healPulse` | src, target / x,z,r | fx green plus signs, sfx chime |
| `buff` | id, kind, r | fx gold sparkles |
| `revive` / `summon` | id | fx wax swirl / leaf burst |
| `charge` | id | fx speed lines, sfx gallop-honk |
| `geyserWarn` / `geyser` | i | fx steam, sfx rumble / whoosh |
| `dunk` | x,z | fx splash ring |
| `bigMoment` | x,y,z, weight | auto slow-mo, cinematic cam |
| `phase` | `tired`,`suddenDeath` | hud banner, sfx gong |
| `battleEnd` | winner, reason | state machine |
| `simError` | id, reason | console and test failure |

---

## 2. Units

### 2.1 UnitDef schema

```js
{
  id: 'grow_hoer', name: 'Hoe Hand', faction: 'grow',
  role: 'melee'|'ranged'|'tank'|'cavalry'|'siege'|'support'|'legendary',
  cost: 65, hp: 90, mass: 65,            // total kg (mounted: rider+mount; cart: cart+operator)
  speed: 3.3, scale: 1.0,                // height multiplier on the 1.88 m humanoid
  body: 'humanoid'|'mounted'|'cart', mount: 'goat'|... (mounted/cart only),
  damage: 18, attackRange: 1.6, attackCooldown: 1.0, minRange: 0,
  windup: 0.30, recover: 0.25,           // s; hit frame at end of windup
  weapon: {
    type: 'swing'|'thrust'|'slam'|'projectile'|'beam'|'cone'|'chain'|'aoePoint'|'boomerang'|'heal'|'healPulse'|'healPatch'|'buffPulse'|'aura'|'revive',
    arc: 100, maxTargets: 2, knockback: 150,          // melee
    radius, offset,                                    // slam / aoePoint
    projectile: { kind:'potato', speed:18, gravityScale:1.0, drag:0, radius:0.12,
                  arc:'low'|'high', splash:0, count:1, spread:0, acc:0.65,
                  pierce:false, roll:null|{dist,speed,dmg,kb}, pull:0, cloud:null|{r,dps,dur} },
    beam: { dur, width, pierce, sweepDeg }, cone: { deg, len, dps, on, off, pushPerTick },
    chain: { jumps, radius, falloff },
    heal: { amount, range, targets:'single'|'aoe', radius }, buff: { kind, radius, dur, every },
    status: { slow:0.2, slowDur:1.5, burnDps:0, burnDur:0 },
  },
  weapon2: null | { ...same shape },    // legendaries only
  charge: null | { dmg:45, kb:900, cd:8, minDist:8, speedMul:1.35, cone:60, reach:2.2, maxTargets:3 },
  passive: null | { aura:{kind:'crowSlow',r:6,amt:0.2} | regen:4 | block:{deg:60,reduce:0.7}
                   | deathBlast:{r,dmg,kb} | summon:{defId,every,count,maxAlive} },
  ai: { preferredRange: 1.4, kite: false, targetPriority: 'near'|'backline'|'biggest'|'cluster'|'weakest'|'allyLowest'|'allyFront' },
  look: [ /* primitives, see 2.3 */ ],
  icon: { camDist: 3.2, camY: 1.1 }     // icon render framing
}
```

### 2.2 Body archetypes (physics)

**Humanoid (6 bodies).** Dimensions are multiplied by `scale` (s).

| Body | Visual size (w×h×d) | Collision shapes | Mass share | Joint |
|---|---|---|---|---|
| torso | 0.46×0.62×0.28 | 2 spheres r 0.17s at y ±0.15s | 0.50 | root |
| head | sphere r 0.17 | 1 sphere | 0.08 | ConeTwist neck at torso top: cone 0.5 rad, twist 0.3 |
| armL/R | 0.13×0.62×0.13 | 1 sphere r 0.08s at distal end | 0.06 each | ConeTwist shoulder at (±0.29s, +0.26s): cone 1.6, twist 0.6 |
| legL/R | 0.17×0.90×0.17 | 1 sphere r 0.10s at foot and 1 at mid | 0.15 each | ConeTwist hip at (±0.13s, -0.31s): cone 0.9, twist 0.2 |

- All collision shapes are spheres, because sphere-plane and sphere-heightfield are cheap in cannon.
- Standing torso-center height is **1.21·s**, and the head center is about 1.71·s.
- Collision groups:
  - `G_GROUND=1, G_PROP=2, G_TORSO=4, G_LIMB=8, G_CORPSE=16`.
  - Torso and head: group TORSO, mask GROUND|PROP|TORSO.
  - Limbs: group LIMB, mask GROUND|PROP.
  - 2 s after death all parts become group CORPSE with mask GROUND|PROP, so corpses stop blocking the living.
- Alive bodies have `allowSleep=false`. Corpses have `allowSleep=true`, `sleepSpeedLimit=0.3`, `sleepTimeLimit=0.6`.

**Mounted (6 bodies).**
- Bodies: mount body, mount head (ConeTwist), rider torso, rider head, rider armL, rider armR.
- Rider legs are visual prims on the `mount` bone.
- The rider torso is attached with a `LockConstraint` (maxForce 1e5) at the saddle point.
- The mount's 4 or 6 legs (or wheels) are procedural visuals driven by the gait phase.
- Hover acts on the mount body. Upright acts on both mount and rider torso.
- **On death:** remove the lock. The rider gets impulse Δv (−2 back, +4 up), then everything goes limp.

**Cart (5 bodies).** Cart body plus operator torso, head, armL and armR (operator locked standing at the rear). Wheels are visual.

**Legendaries** use humanoid bodies at scale 2.6–4.0. They are immune to stagger. Launch still happens at Δv ≥ 7, which is almost never.

### 2.3 Look primitives (rendering)

`look` is an array of `{ g, bone, p:[x,y,z], r:[deg], s:[x,y,z], c, detail? }`.
- `g` ∈ `box | sphere | cyl | cone | pill | torus | wedge`.
- Positions are local to the bone's frame, in unscaled meters, and are multiplied by `scale`.
- Bones: `torso, head, armL, armR, legL, legR, weapon` (child of armR at the hand, local +y along the weapon), `offhand` (child of armL), `mount, mountHead, mLeg0..5, wheel0..3, cart`.
- `detail:true` primitives are dropped beyond the LOD distance.
- **Default humanoid kit** (auto-prepended unless `kit:false`):
  - torso box 0.46×0.62×0.28 in `team`;
  - head sphere 0.34 in `skin`;
  - arms box 0.13×0.62×0.13 in faction cloth;
  - legs box 0.17×0.9×0.17 in faction trousers;
  - two black eye spheres 0.04 (detail);
  - a team badge (a small flat cone above the head: blue is round, red is square in color-blind mode).
- Every unit's look is written out in the `look` array. The table column "Look" below describes the **extras** on top of the kit.

Example (Hoe Hand, full):
```js
look: [ // + default kit
  { g:'cyl',  bone:'head',   p:[0,0.12,0], s:[0.52,0.04,0.52], c:'#F4D35E' },            // hat brim
  { g:'cone', bone:'head',   p:[0,0.20,0], s:[0.26,0.16,0.26], c:'#F4D35E' },            // hat crown
  { g:'box',  bone:'torso',  p:[0,0.05,0.145], s:[0.30,0.36,0.02], c:'#A1662F' },        // overall bib
  { g:'cyl',  bone:'weapon', p:[0,0.55,0], s:[0.05,1.4,0.05], c:'#8B5A2B' },             // handle
  { g:'box',  bone:'weapon', p:[0.08,1.22,0], r:[0,0,20], s:[0.22,0.06,0.14], c:'#9AA0A6' }, // blade
  { g:'sphere', bone:'head', p:[0.12,-0.02,0.14], s:[0.06,0.04,0.02], c:'#E07A5F', detail:true } // rosy cheek
]
```

### 2.4 Mounts

| Mount | Body (w×h×l) | Hover height (body center) | Saddle y | Visual legs | Notes |
|---|---|---|---|---|---|
| goat | 0.7×0.7×1.3 | 0.95 | 1.35 | 4 cyl 0.12×0.6 | head sphere 0.3 with 2 curled torus horns and a cone beard |
| unicycle | 0.2×0.8×0.2 post | 1.15 | 1.6 | wheel: torus r0.7 | upright kp ×1.5 so it wobbles comically but recovers |
| crab | 1.6×0.6×1.2 | 0.8 | 1.2 | 6 cone legs | body yaw offset +90° (scuttles sideways); 2 claw boxes on mountHead |
| velocipede | 0.25×0.6×1.3 frame | 1.3 | 2.0 | front wheel torus r0.9, rear r0.3 | wheel spin = speed / r |
| stag | 0.6×0.7×1.4 | 1.1 | 1.5 | 4 cyl legs | antlers: 6 small cyl branches, thistle-purple tips |
| walrus | 1.0×0.8×1.8 pill | 0.5 | 1.0 | 4 flipper boxes | friction multiplier 0.3 (slides, overshoots) |
| ostrich | 0.8×0.8×1.0 | 1.25 | 1.65 | 2 long cyl legs | neck cyl 1.0 plus small head with cone beak |
| waxhorse | 0.6×0.7×1.5 | 1.05 | 1.45 | 4 cone legs (drippy) | mane of 5 flame cones (#FF9F1C, emissive-looking) |
| cart | 1.6×0.8×2.2 | 0.55 | 1.0 (operator stands) | 2–4 cyl wheels r0.45 | siege machines sit on top |

---

## 3. Factions and rosters (8 factions × 7 units = 56 units, 8 legendaries)

Legend for the tables:
- **Wpn** column: `arc` is the melee arc in degrees, `mT` is max targets, `kb` is the knockback impulse in N·s, `v` is projectile speed in m/s, `g` is gravity scale, `spl` is splash radius, `acc` is the design accuracy used by the cost model, and `burn a×b` means a HP/s for b s.
- **AI** column: preferred range, kite (K), and priority.
- **Wind**: windup in seconds. Default windup is 0.30 s for melee and 0.40 s for ranged.

### 3.1 Muddlebrook Growers (`grow`), cheerful veggie farmfolk
- Palette: straw `#F4D35E`, soil `#A1662F`, sprout `#7CB342`. Skin `#F2C29B`.
- Identity: cheap, numerous, scrappy. Win by swarming and lobbing produce.

| id | Name | Role | Cost | HP | Mass | Spd | Scale | Dmg | Rng | CD | Wpn | AI | Look (extras) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| grow_hoer | Hoe Hand | melee | 65 | 90 | 65 | 3.3 | 1.0 | 18 | 1.6 | 1.0 | swing arc100 mT2 kb150 | 1.4, near | straw hat, overall bib, hoe (see example) |
| grow_spud | Spud Slinger | ranged | 60 | 75 | 60 | 3.2 | 0.95 | 18 | 22 | 1.5 | projectile potato v18 g1.0 r0.12 low arc acc.65 kb90 | 18 K, near | sack (pill, brown) on back, cloth cap, potato sphere in hand, sling (thin cyl) |
| grow_bale | Bale Buddy | tank | 145 | 480 | 150 | 2.4 | 1.15 | 22 | 1.8 | 1.4 | swing (shoulder-barge) arc120 mT3 kb380 | 1.6, near | huge hay-bale box 0.8×0.7×0.6 (#E9C46A) around torso with 3 thin twine boxes, only head and limbs poke out |
| grow_goat | Billy Jouster | cavalry | 155 | 280 | 230 | 6.5 | 1.0 (goat) | 20 | 2.0 | 1.1 | swing headbutt arc60 mT1 kb400; charge 45 kb900 cd8 | 1.8, backline | rider with carrot lance (orange cone 1.2 m) and saucepan helmet; white goat |
| grow_pumpkin | Pumpkin Lobber | siege | 150 | 150 | 220 | 1.6 | cart | 80 | 45 (min 10) | 5.5 | projectile pumpkin v22 g1 r0.35 high arc spl3 kb600 acc.5 | 40, cluster | wooden cart with catapult arm (box beam and cup) that animates on fire; orange pumpkin sphere with green cyl stalk |
| grow_soup | Soup Auntie | support | 80 | 110 | 70 | 3.0 | 1.0 | 8 | 1.6 | 1.2 | heal single 18 per 1.5 s, range 10 (lobbed bowl, visual only); ladle bonk as fallback | 7, allyLowest | apron box, headscarf (half sphere), giant ladle, pot on hip (cyl) |
| grow_scare | **Gus, the Harvest Colossus** | legendary | 1800 | 7000 | 900 | 2.6 | 3.2 | 120 | 5.5 | 2.2 | swing pitchfork arc220 mT8 kb1800 wind0.7; aura "Crow Cloud" r6: enemies −20% move | 4, biggest | scarecrow: patched sack head, stitched smile, wide straw hat, straw tufts (cones) at wrists and ankles, pole through arms, 3 crow spheres orbiting head (detail), 3-tine pitchfork |

### 3.2 Big Top Bonanza (`top`), traveling circus
- Palette: grape `#9B5DE5`, lemon `#FEE440`, bubblegum `#F15BB5`. Skin `#FFE0CC`.
- Identity: knockback chaos. Enemies get launched, juggled and fired out of cannons.

| id | Name | Role | Cost | HP | Mass | Spd | Scale | Dmg | Rng | CD | Wpn | AI | Look |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| top_clown | Mallet Clown | melee | 60 | 110 | 75 | 3.2 | 1.0 | 16 | 1.8 | 1.3 | swing squeaky mallet arc90 mT2 kb480 | 1.6, near | white face, red sphere nose, 3 puffball buttons, tiny cone hat, oversized mallet (cyl handle and fat cyl head) |
| top_juggler | Pin Juggler | ranged | 55 | 75 | 60 | 3.4 | 0.95 | 10×3 | 18 | 1.8 | projectile 3 pins spread12° v20 g0.8 acc.45 kb60 (pins tumble visually) | 15 K, near | harlequin diamond-patch torso (2-color boxes), jester collar (4 cones), 3 pins orbiting hands while idle |
| top_strong | Iron Strongman | tank | 210 | 700 | 180 | 2.3 | 1.25 | 35 | 2.2 | 1.8 | swing dumbbell arc140 mT3 kb750 | 1.8, near | striped singlet, handlebar moustache (2 small pills), barbell (cyl bar and 2 big black spheres) |
| top_unicycle | Unicycle Lancer | cavalry | 135 | 180 | 110 | 7.5 | 1.0 (unicycle) | 18 | 2.8 | 1.0 | thrust lance kb250; charge 60 kb1100 cd8 | 2.4, backline | pointy hat, candy-striped lance (cone with rings), arms flail for balance |
| top_cannon | Cannonball Cannon | siege | 175 | 180 | 260 | 1.5 | cart | 60 | 40 (min 4) | 4.5 | projectile "stunt clown" v26 g1 low arc spl2.5 kb1200 acc.55 | 34, cluster | star-painted barrel cyl on cart; the projectile is a clown-colored sphere with a tiny helmet |
| top_ring | Ringmaster | support | 115 | 120 | 70 | 3.2 | 1.0 | 10 | 3.0 | 1.0 | thrust whip kb120; buffPulse every 4 s r8: Haste 5 s (+30% move, +25% attack rate) | 6, allyFront | tall top hat (cyl and brim), tailcoat flaps (2 boxes), megaphone cone in offhand |
| top_bouncer | **Big Bouncy Bertram** | legendary | 1400 | 6000 | 400 | 3.0 | 3.4 | 70 | slam r5 | 2.2 | slam: hop 1.5 m then belly-flop, self-centered r5 mT10 kb2200 wind0.9 | 3, cluster | inflatable strongman: pill torso (bubblegum), sphere head with painted grin, stubby pill limbs, valve nozzle on back. Hover ω=5 so it floats and bounces. |

### 3.3 Brinywash Crew (`briny`), salty sea folk
- Palette: teal `#2A9D8F`, sand `#E9C46A`, coral `#F28482`. Skin `#D99A6C`.
- Identity: control. They pull enemies with harpoons, make them slip, and push with waves.

| id | Name | Role | Cost | HP | Mass | Spd | Scale | Dmg | Rng | CD | Wpn | AI | Look |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| briny_swab | Deck Swabber | melee | 70 | 100 | 70 | 3.2 | 1.0 | 13 | 1.8 | 0.8 | swing mop arc110 mT2 kb100; slow 20% 1.5 s ("slippery") | 1.6, near | striped shirt (stacked teal/white boxes), bandana, mop (cyl and grey pill head) |
| briny_harpoon | Harpooneer | ranged | 80 | 85 | 70 | 3.0 | 1.0 | 45 | 26 | 3.0 | projectile harpoon v30 g0.5 acc.75 kb −400 (**pull** toward shooter); rope drawn | 22 K, weakest | yellow slicker coat, sou'wester hat (wedge), harpoon (cyl and cone tip) |
| briny_anchor | Anchor Hauler | tank | 200 | 650 | 170 | 2.2 | 1.2 | 38 | 2.4 | 2.2 | swing anchor arc200 mT4 kb650 wind0.5 | 2.0, near | bushy beard sphere, knit cap, anchor (cyl shaft, torus ring, 2 wedge flukes) |
| briny_crab | Crabback Rider | cavalry | 185 | 360 | 260 | 5.5 | 1.0 (crab) | 30 | 2.2 | 1.2 | swing claw arc70 mT1 kb300; charge 40 kb700 cd8 | 1.8, backline | coral crab with rider in a captain's bicorne (wedge); sideways scuttle |
| briny_barrel | Barrel Mortar | siege | 150 | 160 | 230 | 1.5 | cart | 75 | 42 (min 10) | 6.0 | projectile powder barrel v21 high arc spl3.5 kb900 acc.5 | 38, cluster | stubby mortar tube (wide cyl, 45°) on a deck-plank cart; barrel cyl with rings |
| briny_tide | Tide Singer | support | 70 | 100 | 70 | 3.1 | 1.0 | 6 | 1.6 | 1.0 | healPulse every 3 s r7: +14 to all allies (expanding wave ring) | 5, allyFront | seashell bra (2 half spheres), kelp hair (cones), conch in hand |
| briny_light | **Old Beacon Barnaby** | legendary | 2300 | 4500 | 500 | 2.2 | 2.6 | 100/s | 35 | 5.0 | beam 3 s sweeping ±20° across the target, pierce all, width 0.8, kb 40 per 0.1 s tick, wind0.8; weapon2 lantern bonk 30 when an enemy is within 3 m | 28, cluster | old keeper with a striped mini-lighthouse on his back (cyl stack red/white, cone roof, glowing sphere lamp), pipe, big boots |

### 3.4 Cogwhistle Guild (`cog`), clockwork tinkers
- Palette: brass `#C9A227`, copper `#B87333`, steel `#6C757D`. "Skin" is metal `#8D99AE`.
- Identity: sturdy and precise, with electrical chain effects. Slow, but they hit hard.

| id | Name | Role | Cost | HP | Mass | Spd | Scale | Dmg | Rng | CD | Wpn | AI | Look |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cog_wrench | Wrench Bot | melee | 70 | 150 | 90 | 2.8 | 1.0 | 24 | 1.7 | 1.4 | swing wrench arc80 mT1 kb180 | 1.5, near | box head with one lens (cyl), wind-up key on back (spins), giant wrench |
| cog_rivet | Rivet Gunner | ranged | 70 | 90 | 80 | 2.9 | 1.0 | 7 | 20 | 0.35 | projectile rivet v45 g0.2 acc.5 kb40 (steady stream) | 17 K, near | goggles (2 torus), brass backpack tank, rivet gun (box and 3 barrel cyls) |
| cog_boiler | Boiler Golem | tank | 210 | 900 | 260 | 1.9 | 1.4 | 40 | 2.0 | 2.0 | swing steam-punch arc60 mT1 kb900; **deathBlast** r3 60 dmg kb800 | 1.8, near | boiler cyl torso with chimney cyl (steam puffs), rivets (detail spheres), piston arms |
| cog_velo | Velocipede Knight | cavalry | 155 | 220 | 120 | 8.0 | 1.0 (velocipede) | 20 | 3.0 | 1.0 | thrust lance kb250; charge 55 kb1000 cd8 | 2.6, backline | pith helmet, monocle, brass lance |
| cog_zap | Zapcoil Wagon | siege | 180 | 200 | 250 | 1.8 | cart | 50 | 24 | 3.5 | chain instant, 4 jumps r5 falloff 0.7, kb150 | 20, cluster | wagon with tall coil (stacked torus rings) and copper sphere on top |
| cog_oilcan | Oilcan Tinker | support | 85 | 120 | 75 | 3.0 | 0.9 | 10 | 1.6 | 1.2 | heal single 25 per 2 s, range 6 (oil squirt arc) | 4, allyLowest | tiny bot with a giant spouted oilcan (cyl and long thin cone spout) |
| cog_titan | **Steam Titan Mk. IX** | legendary | 2150 | 8000 | 1200 | 2.0 | 3.6 | 150 | slam r4 @3 m | 2.6 | slam double-fist mT8 kb1600 wind0.8; weapon2 shoulder rivet cannon: projectile 20 dmg cd0.8 rng25 v40 g0.2; deathBlast r5 100 kb1500 | 3, biggest | walking brass boiler-mech: 2 chimneys, porthole face, gauge dials, piston arms with box fists |

### 3.5 Mossgrove Kin (`moss`), forest spirits
- Palette: moss `#6A994E`, bark `#7F5539`, blossom `#F7B2BD`. Skin is bark.
- Identity: swarms, regrowth and area-over-time effects.

| id | Name | Role | Cost | HP | Mass | Spd | Scale | Dmg | Rng | CD | Wpn | AI | Look |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| moss_twig | Twigling | melee | 35 | 55 | 30 | 3.8 | 0.7 | 10 | 1.3 | 0.7 | swing twig arc80 mT1 kb60 | 1.1, near | stick body (thin cyl torso over the kit, `kit` limbs thin), leaf-sprout head (2 green cones) |
| moss_acorn | Acorn Plinker | ranged | 45 | 70 | 55 | 3.3 | 0.9 | 12 | 20 | 1.2 | projectile acorn v24 g1 acc.6 kb50 | 17 K, near | acorn-cap helmet (half sphere with stub), Y-slingshot (3 cyls) |
| moss_stump | Stumpling | tank | 190 | 700 | 220 | 2.0 | 1.3 | 26 | 2.0 | 1.6 | swing root arm arc120 mT3 kb500; **regen** 4 HP/s | 1.8, near | stump cyl torso with ring top, mushroom cluster (detail), root-leg cyls |
| moss_stag | Thistle Stag Rider | cavalry | 160 | 240 | 200 | 7.0 | 1.0 (stag) | 22 | 2.2 | 1.0 | thrust antlers kb300; charge 50 kb1100 cd8 | 1.8, backline | leaf-cloaked rider, flower crown |
| moss_seed | Seedpod Willow | siege | 150 | 170 | 240 | 1.4 | 1.9 (humanoid) | 45 | 40 (min 6) | 5.0 | projectile seedpod v21 high arc spl2.5 kb300 acc.55; spawns spore cloud r3, 8 dps, 4 s | 36, cluster | droopy willow: hanging green cones from head, long whip-branch right arm that flings |
| moss_bloom | Bloom Mender | support | 70 | 90 | 60 | 3.2 | 0.9 | 6 | 1.4 | 1.0 | healPatch every 6 s at the densest ally spot within 6 m: r4, 6 HP/s for 5 s | 5, allyFront | giant tulip head (5 wedge petals), leaf skirt |
| moss_oak | **Grandfather Oakheart** | legendary | 1700 | 9000 | 1500 | 1.6 | 4.0 | 130 | 6 | 2.8 | swing branch arc180 mT10 kb2000 wind0.9; **summon** 2 Twiglings every 10 s (max 6 alive) | 5, cluster | huge trunk, canopy of 5 green spheres (detail except 1), knot face, beard of moss |

### 3.6 Mittenfolk Drifters (`mitten`), cozy ice nomads
- Palette: glacier `#A8DADC`, snow `#F1FAEE`, dusk `#6D597A`. Skin `#F5DCC8`.
- Identity: slow and freeze control. They make the enemy slide around.

| id | Name | Role | Cost | HP | Mass | Spd | Scale | Dmg | Rng | CD | Wpn | AI | Look |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mitten_icicle | Icicle Poker | melee | 65 | 100 | 70 | 3.1 | 1.0 | 26 | 2.4 | 1.3 | thrust icicle kb150; slow 25% 2 s | 2.2, near | puffy parka (pill), fur-trim hood (torus), huge mittens (spheres), ice cone spear |
| mitten_pelter | Snowball Pelter | ranged | 50 | 75 | 60 | 3.2 | 0.9 | 9 | 20 | 1.0 | projectile snowball v17 g1 acc.6 kb60; slow 30% 1.5 s | 17 K, near | bobble hat (cone and sphere pom), scarf (thin box trailing), snowball in mitten |
| mitten_fluff | Fluffhulk | tank | 250 | 800 | 240 | 2.4 | 1.7 | 34 | slam r2.5 @1.5 m | 2.2 | slam two-fist mT4 kb800 | 2.0, near | shaggy white beast: sphere torso fluff clusters (detail), tiny horns, blue nose |
| mitten_walrus | Walrus Slider | cavalry | 195 | 320 | 300 | 6.0 | 1.0 (walrus) | 24 | 2.2 | 1.3 | swing tusks arc90 mT2 kb350; charge = belly slide 55 kb1300 cd8 | 1.8, backline | rider with earmuffs (2 spheres) and a fishing rod |
| mitten_boulder | Snowboulder Sling | siege | 150 | 170 | 230 | 1.5 | cart (sled) | 55 | 38 (min 6) | 6.0 | projectile snowball r0.8 v20 spl2 kb600 acc.6; then **rolls** 8 m at 9 m/s, hitting each unit once for 45 kb600 | 34, cluster | sled with sling arm; the projectile grows visually as it rolls |
| mitten_cocoa | Cocoa Brewer | support | 80 | 95 | 65 | 3.1 | 0.95 | 6 | 1.4 | 1.0 | heal single 30 per 2.5 s, range 12 (lobbed mug); cleanses slow and burn | 8, allyLowest | kettle backpack (sphere and spout), steaming mug in hand |
| mitten_bliz | **Mother Blizzardine** | legendary | 1500 | 6000 | 800 | 2.2 | 3.0 | 60/s | cone 12 m 60° | cycle 6 (3 on) | cone frost breath: slow 50%, push 30 N·s per 0.2 s tick; weapon2 stomp r3 40 kb900 cd4 when 3 or more enemies are within 3 m | 9, cluster | enormous granny in knitted shawl (torus layers), icicle tiara (cones), snowflake brooch |

### 3.7 Noonbright Legion (`noon`), sun-worshipping parade soldiers
- Palette: gold `#F6BD60`, ivory `#FFF8E7`, amber `#F28C28`. Skin `#D9A066`.
- Identity: disciplined lines, shields, precise beams and buffs.

| id | Name | Role | Cost | HP | Mass | Spd | Scale | Dmg | Rng | CD | Wpn | AI | Look |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| noon_spear | Glint Spearman | melee | 70 | 120 | 75 | 3.1 | 1.0 | 22 | 2.6 | 1.1 | thrust spear kb160 | 2.4, near | sunburst crest helmet (fan of 5 wedges), gold spear |
| noon_lens | Lens Adept | ranged | 85 | 80 | 60 | 3.1 | 1.0 | 40 | 24 | 2.6 | beam: 0.8 s charge then 0.3 s beam, hits the first enemy on the line, kb80 | 20 K, weakest | robe (cone torso skirt), big monocle lens staff (torus and flat cyl) |
| noon_shield | Dawnshield Bearer | tank | 170 | 600 | 160 | 2.4 | 1.15 | 20 | 1.8 | 1.5 | swing bash arc90 mT2 kb600; **block**: projectiles and beams arriving within ±60° of facing take −70% damage and no knockback | 1.6, near | tower shield (tall box with sun disc torus), plumed helm |
| noon_ostrich | Noonrunner | cavalry | 140 | 170 | 110 | 9.0 | 1.0 (ostrich) | 18 | 2.0 | 0.8 | thrust peck kb150; charge 40 kb800 cd8 | 1.8, backline | tiny jockey with gold visor on a giant ostrich |
| noon_mirror | Solar Mirror | siege | 210 | 180 | 230 | 1.5 | cart | 90 | 50 (min 6) | 7.0 | aoePoint: telegraph ring 1.5 s at the target's position (with lead), then burst r3.5, kb500 mostly up | 45, cluster | wagon with a big dish (flat cyl) on a swivel, operator in sun-hat |
| noon_herald | Hymn Herald | support | 115 | 110 | 70 | 3.1 | 1.0 | 8 | 1.6 | 1.1 | aura r8: Might (+20% damage dealt, −15% damage taken), refreshed every 0.5 s | 6, allyFront | long trumpet (cyl and cone bell), banner pole with sun flag (thin box) |
| noon_colossus | **The Noonday Colossus** | legendary | 2050 | 6500 | 1000 | 2.4 | 3.5 | 110 | 30 | 3.2 | boomerang sun-disc v22: flies out to target distance +4 m, returns to owner, pierce (each unit once per leg), kb700; weapon2 fists 40 arc90 while the disc is out | 20, cluster | gilded statue: sun-ray crown, toga, the disc is a big gold torus with a spinning center |

### 3.8 Waxwick Coven (`wax`), spooky-but-cute candle folk
- Palette: wax `#F4E9CD`, flame `#FF9F1C`, twilight `#5E548E`. Skin is wax.
- Identity: burn damage over time, attrition and resurrection.

| id | Name | Role | Cost | HP | Mass | Spd | Scale | Dmg | Rng | CD | Wpn | AI | Look |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| wax_scamp | Wick Scamp | melee | 65 | 80 | 55 | 3.6 | 0.85 | 12 + burn 4×3 | 1.5 | 0.9 | swing torch arc70 mT1 kb80 | 1.3, near | candle-stub body (cyl torso), wick and flame cone on head, drip spheres (detail) |
| wax_hexer | Tallow Hexer | ranged | 75 | 75 | 60 | 3.1 | 1.0 | 18 + burn 5×3 | 24 | 2.0 | projectile wax blob v16 g1 spl1.2 acc.6 kb60 | 20 K, near | tall pointed hat (cone) with a melting brim, candle wand |
| wax_brute | Chandelier Brute | tank | 260 | 680 | 190 | 2.2 | 1.3 | 26 + burn 4×3 | slam self r2.8 | 2.0 | slam spin mT5 kb450 | 2.0, near | wears a chandelier (torus ring with 6 candle cyls) around the waist that spins on attack |
| wax_cav | Candlehorse Cavalier | cavalry | 185 | 260 | 220 | 7.0 | 1.0 (waxhorse) | 20 | 2.2 | 1.0 | swing candle-sabre arc90 mT2 kb300; charge 50 kb1000 cd8 | 1.8, backline | headless-looking rider carrying a jack-o-candle (sphere with flame) |
| wax_cauldron | Cauldron Mortar | siege | 135 | 160 | 230 | 1.5 | cart | 55 | 40 (min 10) | 5.5 | projectile goo v20 high arc spl3 kb300 acc.5; slow 40% 3 s | 36, cluster | bubbling cauldron (sphere and torus lip) on a cart, bubbles (detail spheres) |
| wax_remold | Wax Remolder | support | 85 | 100 | 70 | 3.1 | 1.0 | 8 | 1.4 | 1.2 | **revive** (rules in 4.4): channel 2 s, cd 10 s, max 3 per Remolder | 6, allyFront | hooded robe, sculptor's spatula, drippy halo torus |
| wax_candel | **The Grand Candelabra** | legendary | 2050 | 5500 | 700 | 2.3 | 3.8 | 40 + burn 5×3 per fireball | 32 | 3.0 | projectile volley of 5 fireballs, spread20° v20 g1 spl2 acc.5 kb400; weapon2 stomp r3 30 kb800 cd4 | 24, cluster | walking silver candelabra: 5 arms each with candle and flame, a face on the central candle, tripod legs |

### 3.9 Weapon behavior rules (combat.js)

- **swing**:
  - At the hit frame, collect enemies whose torso is within `range + targetRadius(0.3·scale)` and within `arc/2` of facing. Sort by distance and take up to `maxTargets`.
  - Hit point = target torso position.
  - Knockback direction = horizontal (attacker → target) plus 0.35 up, normalized.
- **thrust**: arc 30°, maxTargets 1 unless `pierce`. Knockback direction is along the facing.
- **slam**: center = self + facing × offset. Every enemy within radius takes damage × lerp(1, 0.4, d/r). Impulse is radial with 0.5 up.
- **projectile**:
  - Launch-angle solve: `tanθ = (v² ± sqrt(v⁴ − g(g·dx² + 2·dy·v²))) / (g·dx)` with g = 9.82·gravityScale. Use the − root for `low` and + for `high`.
  - Lead: `t = dx / (v cosθ)`, predicted target = pos + vel·t. Iterate twice.
  - If there is no real solution, the AI moves closer.
  - Aim error: yaw σ = (1 − acc)·6°, pitch σ = (1 − acc)·3°, drawn from the sim RNG.
  - Hits: sphere vs body-part spheres (torso r 0.3s, head r 0.17s, mount body r 0.5·w) via the spatial hash.
  - Terrain: `p.y < map.heightAt(p.x, p.z)`. Props: AABB list.
  - Splash damage falls from 100% at the center to 30% at the edge.
- **beam**:
  - Segment from the muzzle along the aim direction, `range` long.
  - Walk the spatial hash every 2 m and test capsule(width) against torso spheres.
  - Non-pierce beams stop at the first hit. Damage ticks every 0.1 s over `dur`.
- **cone**: every 0.2 s, enemies within `len` and `deg/2` take `dps·0.2`, get the status, and get the push impulse.
- **chain**: first target within range, then the nearest un-hit enemy within `radius` of the last one, up to `jumps`. Damage × falloff^i. Instant.
- **aoePoint**: emit `telegraph`, then resolve radial damage at that point 1.5 s later. No homing, so units that wander out survive.
- **boomerang**: gravity 0. Outbound to the end point, then steers back to the owner at 22 m/s. Each unit is hit at most once per leg. Caught on return (the attack cooldown starts on catch, max 4 s).
- **roller**: after the first ground impact, moves along the terrain at `heightAt + r`. Speed decays 1.2 m/s². Ends after `dist`, below 2 m/s, or over void.
- **pull** (negative kb): impulse toward the shooter, capped at Δv 6.
- **heal**: picks the ally with the lowest hp% (below 95%) within range. Healing is subject to the heal cap (4.4).
- **charge** (cavalry):
  - Starts if `chargeCdLeft==0` and the target is more than `minDist` away. Speed becomes `speed·speedMul`.
  - When any enemy torso is within `reach` in the front 60° cone while speed is at least 70% of charge speed: apply charge damage and kb to up to 3 enemies. Emit `charge` hit events.
  - The rider continues 6 m, turns, and then fights normally. `chargeCd` 8 s.
- **Friendly fire**: never damage. Splash and slam knockback affect allies at 50% (comedy without griefing).
- **Status effects** do not stack. Keep the strongest value and refresh the duration.
  - Slow: movement × (1 − amt), attack rate × (1 − amt/2). Minimum speed factor 0.5.
  - Burn: ticks every 0.25 s.
  - Haste and Might: as in the unit tables.

---

## 4. Balance model

### 4.1 Power-per-gold formula

Rationale: in a Lanchester square-law brawl, army strength is proportional to N²·DPS·HP. With N = G/cost, equal-gold fairness requires **cost ∝ √(DPS × HP)**, adjusted for things that change how much of that DPS and HP gets used.

```
effTargets:
  swing   = min(maxTargets, 1 + arc/120)
  thrust  = 1 (pierce: +1)
  slam    = min(maxTargets, 1 + 0.4·r², 5)
  proj / aoePoint with splash r = 1 + min(3, 0.3·r²)  (+1.5 if roller)
  chain   = 1 + Σ_{i=1..jumps} falloff^i
  beam(pierce) 2.5, cone 3, boomerang 3.5, otherwise 1
T = 1 + 0.5·(effTargets − 1)                    // multi-target, diminishing
K = 1 + min(|kb|, 2000)/5000                     // knockback control
C = 1 + 0.5·slowAmt                              // slow control
perHit = dmg + burnDps·burnDur (+ 0.5·cloudDps·cloudDur)
eDPS = perHit · count · acc / cd · T · K · C
     + charge.dmg · (1 + min(charge.kb,2000)/5000) / 10      // about 1 charge per 10 s
     + supportEq
eHP  = hp · clamp((mass/70)^0.15, 0.85, 1.35) · (1 + 20·regen/hp) · (1 + 0.35 if block)
R = 1 + 0.035 · max(0, min(range,40) − 2)        // free hits while the enemy closes
S = 0.75 + 0.08 · speed
A = 1.3 support (stays out of danger) | 0.9 siege with minRange ≥ 10 | 1.0 otherwise
cost = round(1.4 · √(eDPS · eHP) · R · S · A)    // rounded to 5 (<200), 10 (<1000), 50 (≥1000)
```

`supportEq` values (dps-equivalent):

| Unit | Value |
|---|---|
| Soup Auntie | 10.8 |
| Oilcan Tinker | 11.3 |
| Cocoa Brewer | 12.8 (includes cleanse) |
| Tide Singer | 11.2 |
| Bloom Mender | 12.0 |
| Ringmaster | 22 |
| Hymn Herald | 30 |
| Wax Remolder | 14 |
| Gus crow aura | 20 |
| Oakheart summons | 20 |
| Titan secondary | 15 |
| Blizzardine stomp | 10 |
| Boiler deathBlast | 3 |

Every listed cost in section 3 is the output of this formula. `tests/balance/costcheck.mjs` recomputes it from `units.js` and fails if a listed cost deviates by more than 15% without a `costNote` string in the def. Hand-tuned deviations must be documented there.

Worked example, Hoe Hand:
- effTargets = min(2, 1.83) = 1.83, so T = 1.42.
- K = 1.03.
- eDPS = 18·0.9/1.0·1.42·1.03 = 23.6.
- eHP = 90·0.98 = 89.
- R = 1, S = 1.01.
- cost = 1.4·√(23.6·89)·1.01 = 65.

Cost range: **35 (Twigling) to 2300 (Old Beacon Barnaby)**.

### 4.2 Tournament band and retuning knobs

The target is a 20–80% win rate at equal gold for every unit against every role-class reference (method in section 10.2). When a unit falls outside the band, retune in this order:

| Symptom | Knob 1 | Knob 2 | Knob 3 |
|---|---|---|---|
| Wins everything (>80% against 4 or more role classes) | cost +10% per step | acc (ranged) or maxTargets/arc (melee) | hp −10% |
| Loses everything (<20% against 4 or more) | cost −10% per step | check AI behavior (range, kite, targeting). Usually a mechanic bug. | dmg +10% |
| Only one matchup is out of band | leave it (counters are fine) if it stays within 10–90% | the specific mechanic (e.g. block angle, splash falloff) | n/a |
| Siege out of band | splash radius ±0.5 | cd ±0.5 s | acc |
| Cavalry out of band | charge.dmg | charge cd | speed |
| Healer or support out of band | amount per pulse | radius | heal cap interplay (4.4) |
| Legendary out of band | hp ±10% | maxTargets | cost |

Rule: always change **cost first** for global strength. Only change mechanics when the per-matchup pattern shows a *behavioral* problem.

### 4.3 Roster sanity review (issues found and fixes baked in)

1. **Healers making fights endless.**
   - Heal cap: each unit can receive at most **15 HP/s from all sources** (bucket refills 15/s, max 15).
   - No self-heal. Healing ×0.5 after 60 s. Healing disabled in sudden death.
   - Regen follows the same schedule.
2. **Revive loops.**
   - Each corpse can be revived once.
   - Revive targets must have cost ≤ 400, not be legendary, summon or Remolder, and have been dead for 12 s or less.
   - Revived units come back at 40% hp and count 50% value.
   - 3 revives per Remolder. None in sudden death.
3. **Siege one-shots.**
   - Splash falls off to 30% at the edge. The highest single-hit damage is the Mirror's 90 at the exact center.
   - Tanks (480 hp or more) survive at least 5 center hits.
   - Siege has min range, aim error and 150–210 hp. Cavalry and harpoons prioritize the backline.
   - Siege never damages allies.
4. **Cheap cavalry.**
   - The formula prices cavalry at about 2–3× melee because of the speed factor S.
   - Charge needs a run-up of 8 m or more and has an 8 s cooldown, so repeated charges require a disengage loop.
   - The fastest unit (Noonrunner, 9 m/s) has 170 hp.
5. **Knockback abuse.**
   - Δv per hit is capped at **12 m/s horizontal and 9 m/s vertical**. Launch threshold is 7 m/s.
   - Legendaries are stagger-immune.
   - Map hazards amplify knockback value. This is deliberate and handled in level tuning, not in costs.
6. **Summons.** Oakheart keeps at most 6 alive, summons count 0 value, and there are none in sudden death.
7. **Kiting forever.**
   - Kite for at most 2 s, then a 3 s kite cooldown (the unit must shoot).
   - Invisible boundary walls at |x|=42, |z|=32 on open maps.
   - Sudden death disables kiting.
8. **Slow-lock.** Slows don't stack and movement never drops below 50%.
9. **Burn stacking.** No stacking. Keep the highest dps.
10. **Block vs rivets.** Rivet Gunner's many small hits make Dawnshield strong against it. Accepted as a counter.

### 4.4 Rules that guarantee battles end

| Time | Phase | Effect |
|---|---|---|
| 0–60 s | normal | none |
| 60 s | "Tired Healers" | healing, regen and heal patches ×0.5 |
| 90 s | **Sudden Death** | Gong and banner. No heal, regen, revive or summon. All living units lose 3% maxHP/s (legendaries 1.5%/s). The AI forces an advance toward the enemy centroid: kite off, supports join melee, siege moves up. |
| 120 s | **Hard end** | The winner has the higher remaining value Σ(value·hp/maxHp). An exact tie is a Draw, which counts as a loss in the campaign. |

Other end rules:
- **Stalemate breaker:** if no damage has been dealt for 15 s before the 90 s mark, sudden death starts immediately.
- **Instant end:** a side with 0 living units loses. Summons count as living. If both sides reach 0 on the same tick, it is a draw.

---

## 5. Maps

### 5.1 MapDef schema
```js
{ id, name, blurb, field:{ w:80, d:60 },
  ground: { kind:'plane'|'heightfield'|'boxes', elem:1.0, extent:[-60,60,-50,50] },
  heightAt(x,z) → y (−Infinity over void), surfaceAt(x,z) → 'grass'|'rock'|'ice'|'lava'|'hole'|'void'|'wood',
  killY, walls: true|false,               // invisible boundary at |x|=42, |z|=32
  zones: { blue:{x:[-38,-6], z:[-28,28]}, red:{x:[6,38], z:[-28,28]}, forbid:[{x,z,r}] },
  props: [{ kind:'box', pos, size, rotY, color, collide:true, isBridge? }],
  hazards: [{ type:'lava', x,z,r, dps, burn, hop } | { type:'geyser', x,z,r, period, offset, warn, dur, dvUp, dvOut, dmg } | { type:'hole', x,z,r }],
  nav: { bridges:[{ a:[x,z], b:[x,z], width }], avoid:[{ x,z,r,pad }], edgeLookahead:[2,4] },
  look: { sky:[top,horizon], fog:[near,far], ground:[c1,c2], sun:[dir,color,int], decor:[...] } }
```
All maps are **mirror-symmetric across x=0** so neither side has a terrain advantage.

### 5.2 Map list

| # | Map | Ground | Deploy zones | Hazards / features | Nav hints |
|---|---|---|---|---|---|
| M1 | **Buttercup Meadow** | Plane at y=0 | blue x[-38,-6], red x[6,38], z[-28,28] | Walls on. Decor outside the field: flowers, fence, haystacks. | none |
| M2 | **Rumpled Hills** | Heightfield 1 m (121×101 samples) | same as M1 | Archer hills at (±24, 8), a center knoll, ripples. Height advantage: ranged units get +0.5 m range per 1 m of height above the target (max +4). | Slopes need no special handling. Hover reads `heightAt`. |
| M3 | **Wobblegap Gorge** | 2 static plateau boxes (top y=0, x∈[-45,-6] and [6,45]) | blue x[-38,-9], red x[9,38] | Chasm at x∈(−6,6). killY −10. Bridges (wood boxes, top y=0, x∈[−7,7]): **North** z=+14 width 4.5, **South** z=−14 width 4.5, **The Plank** z=0 width 1.6. Rails are 0.5 m-high boxes along the long bridges only, so launched units still go over. | Bridge waypoints a=(∓8,zb), b=(±8,zb). Choice cost = \|z_self−zb\| + \|z_tgt−zb\| + 2·(units already routed to that bridge in the last 2 s). Plank cost +6. |
| M4 | **Cinderpop Caldera** | Heightfield bowl | same as M1 minus forbidden circles | Lava pools (r): (0,0) 5; (±14,±14) 2.5. Contact means the torso is inside r+0.3 and torso y < pool surface + 1.6·scale. Lava: 90 dps + burn 6×3, a 4 m/s "hot-foot" hop every 0.5 s. Corpses sink and despawn after 2 s. Geysers r2.6 at (0,±18) and (±20,0): period 8 s, offsets 0/2/4/6 s, warn 1.5 s (steam), erupt 0.5 s with Δv up 11 and out 3, 20 dmg. They also launch corpses. | `avoid` lava r+1.5. Geysers join `avoid` only during warn and erupt. Walls on. |
| M5 | **Glazepond** | Plane at y=0 with an ice material region | same as M1 minus holes | Ice ellipse centered at 0 with semi-axes 24 (x) and 18 (z): locomotion accel ×0.3, friction 0.03, linear damping 0.02 (0.25 on grass), knockback ×1.4. Holes: (0,0) r2.2, (0,±11) r1.6. A torso over a hole below y 1.0·scale drops through: its bodies lose GROUND in their mask, it dies at y < −3, and a `dunk` event fires. Corpses too. | `avoid` holes r+1.5. Walls on. |
| M6 | **Tumbletop Mesa** | Static box plateau x∈[-35,35], z∈[-22,22], top y=0; center dais 10×10 at +1.5 with 4 ramps (1:3) | blue x[-33,-6], red x[6,33], z[-20,20] | Edges drop to killY −10, no walls. Knockback off the edge is the point. | Edge avoidance: sample `heightAt(pos + dir·2)` and `pos + dir·4`. Void pushes the steering vector away along the inward normal with weight 3. |

**Height functions**

- **M2 Rumpled Hills:**
  ```
  h = 3.2·exp(−((x−24)²+(z−8)²)/60) + 3.2·exp(−((x+24)²+(z−8)²)/60)
    + 2.0·exp(−(x²+(z+10)²)/80) + 0.6·cos(0.35x)·cos(0.30z)
  ```
- **M4 Cinderpop Caldera:**
  ```
  h = 0.0018·(x²+z²) + 0.3·cos(0.5x)·cos(0.45z)
  ```
  Inside a lava pool: `h −= 0.6·(1−d/r)²`. The lava surface is a flat disc at `h(center)−0.3`.
- **M3 and M6:** `heightAt` returns 0 on plateaus and bridges (or 1.5 plus the ramp interpolation on the M6 dais) and −Infinity over void. Projectiles use the same function, so bridges stop projectiles.

**Hover over void:** if `heightAt` is −Infinity, there is no hover force and the unit falls. In the AI, a straight line from unit to target that crosses void (sampled every 2 m) triggers bridge routing. Ranged units don't route if the target is within range.

**Bridge jams:** a unit on a bridge path with progress under 0.5 m in 5 s re-routes to the next-best bridge. If it is already on a bridge, it gets a small lateral jostle (Δv 1.5).

---

## 6. Campaign

### 6.1 LevelDef schema
```js
{ id:'L07', chapter:2, name:'Plank Walk', map:'gorge', budget:1800,
  factions:['grow','top','briny','cog'] | 'all', maxUnits:60, maxLegendary:0|1,
  enemy:[ { u:'briny_anchor', n:1, f:'line', at:[10,-14], sp:2 }, ... ],
  par:{ two:1600, three:1250 }, hint:'Harpooneers yank. Keep tanks in front.', unlock:'L08' }
```

**Formation DSL.**
- `at` = [x, z]. x is the distance from the center line into the enemy half (red world x = +x), so blue sees them facing −x.
- `sp` = spacing (default 1.6·scale). Formations:
  - `line`: n units along z, centered on `at`.
  - `block`: `cols` wide, rows go back in +x.
  - `wedge`: row k has 2k+1 units, apex at `at`, pointing at the player.
  - `arc`: 120° arc of radius `r`, midpoint at `at`, bulging toward the player.
  - `scatter`: seeded random inside `w`×`d` centered on `at`, with min spacing `sp`.
- The engine clamps everything into the red zone and pushes out of forbidden circles.

**Star rule (one rule everywhere).**
- ★ = win.
- ★★ = win having spent ≤ `par.two`.
- ★★★ = win having spent ≤ `par.three`.
- Pars were derived as `two = min(1.15·V, 0.9·budget)` and `three = min(0.9·V, 0.75·budget)`, where V is the enemy value, rounded to 50.
- The level solver (10.3) must confirm ★★★ is achievable. Otherwise raise `three` by 50 until it is.

**Unlocks.**
- Level n+1 unlocks when level n is won.
- Factions: Growers and Big Top at start. Brinywash and Cogwhistle unlock at L06. Mossgrove and Mittenfolk at L11. Noonbright and Waxwick at L16.
- Legendaries become usable from **L15** (1 per army).
- Bonus B1 unlocks at 30★ and B2 at 45★ (60★ is the max for main levels).

**Save.**
- Progress is always kept in memory.
- It is mirrored to `localStorage['clobberfield.v1']` = `{stars:{L01:3,...}, bestSpend:{}, unlocked:[], settings:{}, sandboxSlots:[...]}`.
- Every read and write is wrapped in try/catch. A failure falls back silently to memory only.

### 6.2 Levels

| # | Name | Map | Budget | Allowed | Enemy army | V | ★★ ≤ | ★★★ ≤ |
|---|---|---|---|---|---|---|---|---|
| L01 | Turnip Tuesday | Meadow | 600 | grow | 6 grow_hoer line sp2 @(14,0) | 390 | 450 | 350 |
| L02 | Spud Storm | Meadow | 950 | grow, top | 4 grow_hoer line sp2 @(12,0); 6 grow_spud line sp3 @(22,0) | 620 | 700 | 550 |
| L03 | Send in the Clowns | Meadow | 1000 | top | 8 top_clown block cols4 sp1.8 @(14,0); 4 top_juggler line sp4 @(24,0) | 700 | 800 | 650 |
| L04 | Hay There | Hills | 1350 | grow, top | 3 grow_bale line sp4 @(12,0); 6 grow_spud block cols3 sp2 @(24,8) (hilltop); 2 grow_soup line sp3 @(18,0) | 955 | 1100 | 850 |
| L05 | The Strongest Man (boss) | Hills | 1700 | grow, top | 2 top_strong line sp8 @(12,0); 6 top_clown wedge @(15,0); 1 top_ring @(20,0); 2 top_cannon line sp16 @(32,0) | 1245 | 1450 | 1100 |
| L06 | Mind the Gap | Gorge | 1050 | briny, cog | 6 briny_harpoon line sp3 @(10,0); 2 briny_swab block cols2 @(11,−14); 2 briny_swab block cols2 @(11,14) | 760 | 850 | 700 |
| L07 | Plank Walk | Gorge | 1800 | grow, top, briny, cog | 1 briny_anchor each @(10,−14), (10,0), (10,14); 6 briny_harpoon arc r10 @(16,0); 2 briny_barrel line sp16 @(30,0) | 1380 | 1600 | 1250 |
| L08 | Clockwork Parade | Meadow | 1750 | 4 unlocked | 8 cog_wrench block cols4 @(12,0); 6 cog_rivet line sp3 @(20,0); 2 cog_oilcan line sp6 @(22,0); 1 cog_zap @(28,0) | 1330 | 1550 | 1200 |
| L09 | Slip 'n' Slide | Glazepond | 2200 | 4 unlocked | 6 briny_swab block cols3 @(12,0); 4 briny_crab wedge @(18,0); 4 cog_velo line sp5 @(28,0) | 1780 | 2000 | 1600 |
| L10 | Boiler Room (boss) | Gorge | 2000 | 4 unlocked | 1 cog_boiler each @(10,−14), (10,0), (10,14); 6 cog_rivet line sp3 @(14,0); 2 cog_zap line sp10 @(20,0); 2 cog_oilcan line sp8 @(18,0) | 1580 | 1800 | 1400 |
| L11 | Twig Tide | Hills | 1800 | moss, mitten | 30 moss_twig scatter w14 d40 sp1.4 @(16,0); 6 moss_acorn line sp3 @(24,8); 2 moss_bloom line sp6 @(22,0) | 1460 | 1600 | 1300 |
| L12 | Stumped | Caldera | 1850 | 6 unlocked | 4 moss_stump line sp5 @(10,0); 8 moss_acorn block cols4 @(20,0); 2 moss_seed line sp12 @(30,0); 2 moss_bloom line sp6 @(16,0) | 1560 | 1650 | 1400 |
| L13 | Brrr-igade | Glazepond | 2250 | 6 unlocked | 8 mitten_icicle line sp1.8 @(10,0); 2 mitten_fluff line sp8 @(13,0); 8 mitten_pelter block cols4 @(20,0); 2 mitten_walrus line sp20 @(18,0); 1 mitten_cocoa @(22,0) | 1890 | 2000 | 1700 |
| L14 | Edge of the Table | Mesa | 2150 | 6 unlocked | 3 mitten_walrus line sp6 @(12,0); 3 grow_goat line sp4 @(14,−14); 4 top_unicycle line sp4 @(14,14); 6 mitten_pelter line sp3 @(24,0) | 1890 | 1950 | 1600 |
| L15 | The Grove Wakes (boss) | Hills | 2850 | 6 unlocked, 1 legendary | 1 moss_oak @(22,0); 10 moss_twig scatter w8 d24 @(12,0); 6 moss_acorn line sp3 @(26,8); 2 moss_bloom line sp4 @(24,−4) | 2460 | 2550 | 2150 |
| L16 | High Noon | Meadow | 3100 | noon, wax (+1 leg.) | 6 noon_shield line sp2 @(10,0); 10 noon_spear block cols5 @(12,0); 8 noon_lens block cols4 @(20,0); 2 noon_herald line sp8 @(16,0); 1 noon_mirror @(32,0) | 2840 | 2800 | 2300 |
| L17 | Candlelight Ambush | Caldera | 2400 | all, 1 leg. | 6 wax_scamp scatter w6 d8 @(10,−22); 6 wax_scamp scatter w6 d8 @(10,22); 2 wax_brute line sp6 @(12,0); 6 wax_hexer line sp3 @(20,0); 2 wax_remold line sp6 @(22,0); 2 wax_cauldron line sp12 @(32,0) | 2190 | 2150 | 1800 |
| L18 | Two Bridges, No Waiting | Gorge | 2500 | all, 1 leg. | 2 noon_shield block cols2 @(10,−14); 2 noon_shield block cols2 @(10,14); 8 noon_lens line sp3 @(14,0); 2 cog_zap line sp20 @(12,0); 2 noon_mirror line sp12 @(32,0); 2 noon_herald line sp14 @(16,0) | 2370 | 2250 | 1900 |
| L19 | Blizzard Buffet (boss) | Glazepond | 3550 | all, 1 leg. | 1 mitten_bliz @(20,0); 4 mitten_fluff line sp4 @(12,0); 8 mitten_pelter block cols4 @(24,0); 2 mitten_boulder line sp14 @(34,0); 2 mitten_cocoa line sp6 @(26,0) | 3360 | 3200 | 2650 |
| L20 | The Clobberfield Finale | Hills | 7500 | all, 1 leg. | 1 noon_colossus @(26,−8); 1 wax_candel @(26,8); 4 noon_shield line sp3 @(9,0); 4 wax_brute line sp4 @(12,0); 10 noon_spear block cols5 @(14,0); 8 wax_hexer block cols4 @(22,0); 2 noon_herald line sp10 @(18,0); 2 wax_remold line sp10 @(20,0) | 7520 | 6750 | 5600 |
| B1 | Bounce House (bonus, 30★) | Caldera | 3000 | grow only, 1 leg. | 1 top_bouncer @(20,0); 20 top_clown block cols5 @(12,0) | 2600 | 2700 | 2250 |
| B2 | Lights Out (bonus, 45★) | Gorge | 4050 | wax only, 1 leg. | 1 briny_light @(20,0); 2 briny_anchor block cols2 @(10,−14); 2 briny_anchor block cols2 @(10,14); 8 briny_harpoon line sp3 @(12,0); 2 briny_tide line sp8 @(18,0) | 3880 | 3650 | 3050 |

**Difficulty curve.**
- Budget/V ratio falls from 1.6 (L01) to 1.0 (L20).
- Chapter bosses (L05, L10, L15, L19) teach combined arms.
- Late levels require exploiting terrain (bridges, ice, edges) and counters.

**Hints** appear on the build screen, one line each. For example:
- L06: "Harpooneers can't pull what they can't hit. Try fast cavalry over the bridges."
- L14: "Heavy units are hard to shove off cliffs."

---

## 7. Sandbox mode

- Map picker (6 maps) and seed field (random by default, editable, so battles can be reproduced).
- A **Side toggle** (Blue or Red) controls which half placement goes to. The red zone is placeable in sandbox.
- Gold:
  - Budget per side (default 3000, range 100–20000).
  - An **Unlimited gold** toggle hides the counters and enforces the unit cap only.
- All factions and legendaries are available with no legendary limit.
- Unit cap: 80 per side. Above 120 total, a warning chip says "Performance may drop".
- Buttons:
  - Mirror Army: copy blue to red with x mirrored.
  - Random Army: auto-builder at the current budget.
  - Clear Side.
  - Clear All.
  - Save/Load (3 slots in localStorage, try/catch).
- Results screen shows the winner, time and MVP. No stars.

---

## 8. UI/UX

### 8.1 Layout (build phase)

**Desktop (≥ 900 px wide):**
- **Top bar:**
  - left: Back and level name;
  - center: gold counter "1,250 / 1,800" (it shakes red when the player can't afford a unit);
  - right: Settings.
- **Bottom dock:** faction tabs (8 tabs with palette color stripe and emblem; locked tabs greyed with a lock) above a horizontal scroll row of **unit cards**.
  - Card: 72×92 px with a rendered icon, the name (2 lines max), a cost pill and a role glyph.
  - Legendary cards have a gold frame.
  - Hovering a card shows a tooltip with HP, DPS, range, speed and a one-line behavior.
- **Right rail:**
  - Tool buttons: Place (default), Eraser, Brush size (1 / 3×3 block / line).
  - Clear.
  - Snap-to-1 m toggle.
  - A big **START** button.
- **Zones:** the placeable zone is tinted translucent team color. The enemy half shows the preset army (campaign) idling.

**Phone (portrait or landscape, < 900 px):**
- The dock is a bottom sheet with tabs as a horizontal chip row and cards at 60×76.
- The sheet collapses to a single "Units" handle during camera moves.
- Tool buttons: Place, Camera (hand icon), Eraser and Start sit in a vertical floating stack on the right.
- Gold is shown top-center.

### 8.2 Placement interactions

| Action | Desktop | Phone |
|---|---|---|
| Select unit | click card, or number keys 1–7 within the tab | tap card |
| Place | left click; left-drag paints units with min spacing 1.3·scale m | Place tool: tap; one-finger drag paints |
| Remove | right click (nearest own unit within 1.5 m); right-drag erases along the path; Eraser tool | Eraser tool tap/drag; **tap-hold 450 ms** on a unit removes it (with a radial fill indicator) |
| Rotate/pan/zoom (build) | middle-drag or Alt+left-drag orbits; WASD pans; wheel zooms | Camera tool one-finger orbit; two-finger drag pans; pinch zooms (two fingers always control the camera in any tool) |
| Undo | Ctrl+Z (stack of 50 placement ops) | Undo button in the stack |
| Clear | Clear button (with confirm if more than 10 units) | same |

- **Ghost preview** follows the cursor or finger: green when valid, red when invalid (outside zone, over a hazard or void, overlapping, or can't afford).
- The spend hint shows below the gold counter: "Next: 65".
- In campaign, the star par lines are shown under gold ("★★ 1,600 · ★★★ 1,250"), and the current spend is colored accordingly.

### 8.3 Battle HUD
- Top-center: timer (counts up 0:00, turns amber at 60 s and red with a "SUDDEN DEATH" banner at 90 s).
- Tug-of-war bar: blue vs red remaining value.
- Bottom-right time controls:
  - **Pause** (Space).
  - **0.25×** (1).
  - **1×** (2).
  - **2×** (3).
  - Hidden 8× for debug only.
- Buttons: Reset (R) returns to build with the same army, and Auto-cam toggle (C).
- Unit counts per side appear under the tug bar.

### 8.4 Cameras
- **Build cam:** default at (−55, 38, 0) looking at (−6, 0, 0). Pitch clamp 20–80°, distance 12–110 m, pan bounds are the field ± 20 m.
- **Free-fly (battle):**
  - WASD moves, Q/E moves down/up, Shift ×3 speed (base 14 m/s).
  - Right-drag or middle-drag looks around. F toggles pointer-lock mouse-look.
  - Wheel dollies.
  - Phone: one-finger drag orbits around the ground point at screen center, two-finger drag pans, pinch zooms.
- **Follow cam:**
  - Click or tap a unit to follow. The camera chases at distance 5·scale + 3, height 2·scale + 1.5, with spring smoothing 6/s. Mouse or finger drag orbits the offset.
  - Tab or on-screen arrows cycle units on the same side.
  - Esc, clicking empty ground, or the back chip exits.
  - When the followed unit dies, the camera holds 1.5 s and then switches to the nearest ally.
  - A unit info chip shows name, HP bar and kills.
- **Cinematic auto-cam (C):** every 4 s, move toward the highest "action heat" cell (sum of recent `hit` dv and `explode` weight, decaying 1/s), orbiting slowly.
- **Shake:** trauma model. `trauma += 0.2` for an explosion near the camera and 0.08 for a big hit (dv ≥ 9); it decays 1.5/s. Offset = 0.6 m · trauma², roll = 1.5° · trauma². A "Reduce shake" setting multiplies it by 0.3.

### 8.5 Result screen
- Big wobbly title: **VICTORY!** (blue confetti), **DEFEAT** (grey rain puff), or **DRAW**.
- Stars fill one by one with a "ding" and sparkle. Each star's requirement is listed ("Win", "Spend ≤ 1,600", "Spend ≤ 1,250"). New bests are flagged.
- Stats: gold spent, survivors / started, time, MVP (most damage; shows its icon), biggest launch (m/s).
- Buttons: **Retry** (same army), **Edit Army**, **Next Level** (if unlocked), **Campaign Map**.

### 8.6 Campaign map screen
- A stylized board-game path across 4 floating "chapter islands": Sprout Vale, Salty Shallows, Wild Wilds and Sunset Parade. Each island holds 5 level nodes, with 2 bonus nodes on a cloud.
- Nodes show the star count. Locked nodes are grey with a padlock. The next node pulses.
- The total star counter is at top-right.
- Tapping a node opens a panel with the level name, map thumbnail, allowed factions, budget and a "Clobber!" button.

### 8.7 Settings
- Quality: Low / Medium / High (see 11.4).
- Auto slow-mo: on/off.
- Damage numbers: off by default.
- Reduce shake.
- Color-blind team badges.
- SFX volume and music volume.
- Reset progress (with confirm).

---

## 9. Juice

### 9.1 Visual effects (fx.js; particles from a pool of 2000 instances, cheap CPU integration)

| Trigger | Effect |
|---|---|
| melee `hit` | 6–10 **star sparks** (flat 5-point star mesh, yellow/white) plus a white **damage flash** on the victim (instanceColor lerp 70% to white for 80 ms) |
| `hit` with dv ≥ 9 | extra confetti ring, "BONK!" comic text sprite (optional), shake |
| `launch` | speed-line streaks for 0.4 s, a dizzy swirl on landing |
| `stagger` | 3 tiny orbiting stars above the head for 0.6 s |
| `death` | **KO**: 5 gold stars orbit the head for 1.5 s, confetti in the team colors, then the eyes turn to little "x" boxes (swap the eye prims) |
| `explode` | expanding puff spheres (white to faction tint), 20 confetti, ground scorch decal (dark disc, fades over 8 s) |
| footsteps / landings | dust puffs (tan spheres, 0.3 s) on grass; snow sparkles on ice; embers in the caldera |
| projectiles | per-kind mesh (potato, pins, harpoon with a rope line, rivet, pumpkin, barrel, clown, acorn, snowball, seedpod, wax blob, goo, fireball with ember trail) |
| beam / chain / cone | stretched emissive cylinder (beam); jagged polyline of thin boxes regenerated every 50 ms (chain); particle cone of snowflakes (breath) |
| heal / buff | green "+" sprites rising; gold sparkles; pulse ring decals |
| burn / slow | small flame cones on the head; snowflake sparkles and a blue tint of 15% |
| `telegraph` | pulsing ground ring that fills over its duration |
| `geyserWarn` / `geyser` | steam wisps building up, then a white column of spheres |
| `dunk` / lava | water ring and droplets; lava plop, then a smoke puff |
| spawn (build) | pop-in scale bounce 0 → 1.15 → 1 over 200 ms |
| battle start | "3 · 2 · 1 · CLOBBER!" wobbly text |

**Auto slow-mo.** Triggered by `bigMoment` events, which the sim emits when a single hit has dv ≥ 10, an explosion hits 4 or more units, or a legendary dies. Time scale goes to 0.3 for 0.6 s wall time, eases back over 0.3 s, and has a 6 s cooldown. It respects the user's time control: it never speeds up and doesn't trigger while paused.

### 9.2 SFX (sfx.js, WebAudio synthesis only)

- Signal chain: master gain, then a DynamicsCompressor (threshold −18 dB, ratio 4), then the destination.
- Voice cap is 24. There is a per-type throttle (e.g. at most 6 `bonk` per 50 ms).
- Pitch gets ±8% random detune per play, and positional panning uses the StereoPanner from screen x.
- A shared white-noise buffer (1 s) is created once, and brown noise is derived from it by filtering.

| Name | Used for | Recipe |
|---|---|---|
| bonk | melee hit | sine 220→110 Hz exp over 80 ms, plus noise → bandpass 1.2 kHz Q2 for 30 ms; env A2 ms D120 ms |
| squeak | clown mallet | square 1200→1600→1100 Hz over 60 ms, lowpass 3 kHz |
| whoosh | swing | noise → bandpass sweeping 400→2000 Hz Q1.5 over 180 ms; env A40 D140 |
| thwip | sling/juggle/throw | sawtooth 800→1600 Hz for 20 ms plus highpassed noise for 30 ms |
| boom | cannon/mortar fire | sine 90→40 Hz over 250 ms plus lowpassed noise 400 Hz for 200 ms |
| kaboom | explosion | brown noise → lowpass 800→120 Hz over 600 ms, plus a 60 Hz sine thump (D300); gain scaled by radius |
| pop | small projectile impact | sine 900→300 Hz over 40 ms |
| boing | launch | sine glide 120→480 Hz over 250 ms with 18 Hz vibrato (depth 40 Hz); env D350 |
| wheee-plop | death | sine 600→200 Hz over 300 ms, then pop at 150 Hz |
| zap | chain/beam | sawtooth 90 Hz ring-modulated by a square wave at 1.3 kHz ±300 Hz random steps every 20 ms; 200 ms |
| hum | long beam/cone | two detuned sines 220/223 Hz plus filtered noise for the duration |
| chime | heal | sines 880 and 1320 Hz, bell envelope D400 |
| sparkle | buff | 3 quick sine blips 1500/1900/2400 Hz, 30 ms each |
| splash | dunk | noise → bandpass 600 Hz Q1 with decaying gain over 400 ms, plus a 3-bubble sine blip |
| sizzle | lava/burn | noise → highpass 3 kHz, amplitude-modulated by random crackle at 30 Hz, 500 ms |
| rumble / geyser | geyser | brown noise lowpass 200 Hz rising over 1.5 s, then whoosh |
| honk | cavalry charge | two square waves 330/392 Hz through lowpass 1.5 kHz, 200 ms |
| gong | sudden death | inharmonic sines at 110·{1, 2.76, 5.40, 8.93} Hz, D2.5 s |
| plink / unplink | place / remove | sine 660 Hz (pitch = 880 − 0.1·cost, clamp 300) for 50 ms / reversed glide |
| click | UI | square 1000 Hz for 20 ms at low gain |
| kazoo victory | victory | sawtooth through 2 bandpass formants (800 Hz, 1400 Hz, Q5) with 6 Hz vibrato. Notes C5 E5 G5 C6 – G5 E5 C6 (last held 0.6 s), 140 bpm |
| wah-wah | defeat | sawtooth through a lowpass with a filter envelope (300→1200→300 Hz per note). Notes G4 F♯4 F4 E4, last note with 5 Hz vibrato for 1 s |
| march loop | build music (optional) | 100 bpm: triangle bass on root/fifth, noise snare on 2 and 4, square-wave piccolo motif; gain 0.15 |

---

## 10. Test plan: "The Gauntlet"

### 10.1 Headless sim tests (`node --test tests/`)

Harness: `runBattle({seed, mapId, blue:[...], red:[...], maxTime:130})` returns `{winner, reason, time, events summary, metrics}`.

Invariant checks on **every** battle:
- **No NaN or Infinity** in any body state. Any `simError` is a failure.
- **No runaway speed**: body speed must stay ≤ 60 m/s. The Δv cap must hold (≤ 12 horizontal, ≤ 9 vertical plus gravity).
- **Fall-through**: fewer than 1 fall-through correction per battle on average. Any living unit below killY is a failure.
- **Stuck**: at most 10% of living units stuck (moved < 0.5 m in 8 s while not attacking and having a target).
- **Termination**: `result` is set by 120 s of sim time.
- **Determinism**: same inputs give the same final hash (Σ of rounded positions and hp).

| # | Scenario | Pass criteria |
|---|---|---|
| G01 | 1 grow_hoer vs 1 grow_hoer, Meadow | ends, no invariant breaks |
| G02 | 10 v 10 grow_hoer mirrored, 20 seeds | blue win rate 35–65% (side bias) |
| G03 | every melee unit vs reference tank (briny_anchor) at equal gold | ends; hits > 0 |
| G04 | every ranged unit vs reference melee (grow_hoer) at equal gold | projectiles/beams fire; kites occur |
| G05 | every cavalry vs a line of 10 grow_spud | at least 1 `charge` hit event per cavalry unit |
| G06 | every siege vs 20 moss_twig | `explode` events; ≥ 3 kills by splash; no siege self-damage |
| G07 | healers only plus tanks, both sides (e.g. 4 noon_shield + 3 mitten_cocoa each) | ends by 120 s; sudden death triggered; heal cap never exceeded |
| G08 | 10 wax_remold + 10 grow_hoer, mirrored | ≤ 30 revives per side; no revive after 90 s; ends |
| G09 | each legendary vs equal gold of moss_twig, then of noon_lens | ends; tournament data recorded |
| G10 | Gorge 20 melee v 20 melee | ≥ 70% of units reach a bridge; falls counted; stuck ≤ 10% |
| G11 | Gorge ranged v ranged across the chasm | ends (sudden death forced advance) |
| G12 | Caldera mixed 30 v 30 | ≥ 1 geyser `launch`; no living unit stays in lava more than 3 s; corpses despawn |
| G13 | Glazepond cavalry v cavalry | ≥ 1 `dunk` over 10 seeds; ice slide; no NaN |
| G14 | Mesa cavalry vs infantry | edge deaths; all units below killY dead within 1 tick |
| G15 | Hills ranged on hilltops v melee | terrain `impact` events; height range bonus applied |
| G16 | **Stress**: 60 v 60 mixed (auto-builder), Meadow, 60 s | avg tick ≤ 10 ms, p95 ≤ 16 ms (Node on CI machine; logged) |
| G17 | Determinism: G16 army twice with the same seed / with a different seed | identical hash / different hash |
| G18 | Timeout: 2 noon_shield + 2 mitten_cocoa each side in opposite corners, AI slowed | `reason` ∈ {`kills`, `timeout`}, time ≤ 120 s |
| G19 | Red side empty | blue wins at tick ≤ 1 |
| G20 | Every unit type (56) idle alone for 10 s | no NaN; torso tilt < 25° after 2 s; drift < 1 m |
| G21 | Big Bouncy Bertram slams 10 moss_twig | Δv cap holds; launches recorded |
| G22 | Special weapons smoke test: beam, cone, chain, boomerang (returns), roller (rolls ≥ 3 m), aoePoint (telegraph → resolve), pull, deathBlast, summon (≤ 6 alive), block | each triggers and applies damage |
| G23 | Every campaign level with the auto-built player army at `par.two` | battle ends; solver report written |
| G24 | Corpse flood: 200 deaths in sandbox | live corpse count ≤ 80; ≥ 70% of corpses asleep after 5 s |

### 10.2 Equal-gold balance tournament (`tests/balance/tournament.mjs`, worker_threads)

- **Pairing at equal gold.**
  - For a pair (A, B), choose G in [1000, 1600] that minimizes max(leftoverA, leftoverB)/G, where N = floor(G/cost).
  - Leftover must be ≤ 6%. Otherwise extend the search up to 2400.
  - With a legendary involved, G = cost(legendary) · k for k ∈ {1, 2}.
- **Placement.** The standard auto-deploy puts melee and tanks at the front (x=±10), cavalry on the flanks, ranged at ±18, siege and support at ±26. Blocks are 8 columns, spacing 1.6·scale. Each matchup also runs with **sides swapped**.
- **Matrix.**
  1. **Role matrix** (every PR): all 56 units vs 6 references (grow_hoer, mitten_pelter, briny_anchor, moss_stag, briny_barrel, cog_oilcan+grow_hoer escort), plus legendaries vs each other. 6 seeds × 2 sides, Meadow. That is about 4,000 battles, run with `perfMode` (limb collisions off) and 4× parallel.
  2. **Faction round-robin** (nightly): auto-built 2000-gold army per faction (40% melee, 20% ranged, 15% tank, 10% cavalry, 10% siege, 5% support), 28 pairs × 10 seeds × 2 sides × 3 maps (Meadow, Hills, Gorge).
  3. **Full pairwise** (weekly, optional): 1,540 pairs × 3 seeds × 2 sides.
- **Scoring.** Win rate = (wins + 0.5·draws)/games. Required band **20–80%** per unit vs each reference class and per faction overall (factions 35–65%).
- **Output.** `tests/out/balance.csv` (unit, opponent, G, N_A, N_B, winrate, avgTime, avgSurvivorValue) plus `balance.md` with out-of-band units and suggested knob changes from the table in 4.2.

### 10.3 Level solver (`tests/balance/levels.mjs`)

For each level, a random-restart hill climber builds player armies from the allowed pool (at most 400 candidates × 5 seeds) that win at least 60% at spend ≤ `par.three`. It reports the cheapest winning spend. If none is found, it suggests raising `three` or `budget`.

### 10.4 Playwright (`tests/e2e/*.spec.mjs`, against `dist/index.html` over a local static server)

1. **Boot:** the page loads with 0 console errors, the title screen renders, and the attract battle is running.
2. **Campaign flow:**
   - Open L01 and place 6 grow_hoer by clicking canvas coordinates mapped via `__clobber.debug`.
   - Check the gold counter updates, then Start.
   - `setTimeScale(8)`, wait for the result, and assert VICTORY or DEFEAT text and a star count.
   - Retry keeps the army; the eraser removes a unit and restores gold.
3. **Sandbox flow:** pick each map in turn; Unlimited gold toggle; Mirror Army; Start; pause, 0.25×, 2×; click a unit to enter follow cam; Esc exits.
4. **Mobile:** emulate a 390×844 touch viewport.
   - Tap-place and tap-hold remove.
   - Pinch zoom (synthesized touch events).
   - The bottom sheet opens and collapses.
5. **FPS:** sandbox Meadow, `fillArmy('blue',6000)` + `fillArmy('red',6000)` (about 100 units total), 10 s of battle.
   - Measure rAF fps and `__clobber.debug.stats().simMs`.
   - Assert ≥ 45 fps on a GPU runner, ≥ 20 fps under SwiftShader, and simMs avg ≤ 10.
   - The report is attached to the test output.
6. **Screenshots** (saved in `tests/screens/`): title, campaign map, build (each of the 6 maps), battle mid-fight, follow cam, result, and mobile build.

---

## 11. Visual style

### 11.1 Look: "Toybox Diorama"
- Chunky low-poly primitives with flat shading. The world looks like painted wooden toys on a picnic-table field.
- Material: a single `MeshLambertMaterial({ vertexColors:false, flatShading:true })` per InstancedMesh, colored by `instanceColor`.
- Non-team primitives are tinted 12% toward the team color, so faction-accurate units still read as blue or red at a glance.
- Emissive-looking parts (flames, lamps, lava) use a second tiny InstancedMesh set with `MeshBasicMaterial` so they stay bright. That gives about 8–10 draw calls for all units.
- Instanced geometries:
  - box;
  - sphere (12×8);
  - cylinder (10 segments);
  - cone (10);
  - pill (LatheGeometry capsule, because r128 has no CapsuleGeometry);
  - torus (8×12);
  - wedge (a triangular prism).
- Capacity starts at 2048 per mesh and doubles on demand.

### 11.2 Scene and lighting
- **Sky:** a big inverted sphere with a gradient shader: zenith `#7EC8F2`, horizon `#FDE7C8`. There is a soft sun disc and 6–10 puffy cloud clusters (white spheres) drifting slowly.
- **Lights:**
  - HemisphereLight (sky `#BFE3FF`, ground `#8A9A5B`, 0.65).
  - DirectionalLight (`#FFF1D6`, 0.9) from (−0.5, 1, 0.3).
  - Shadow map 2048 on High, fitted to the field.
  - Medium and Low use **blob shadows**: an instanced dark translucent disc under every torso or mount, scaled by the height above ground.
- **Fog:** linear 90–220 m in the horizon color.
- **Ground:**
  - The field is a "tablecloth" of 4 m tiles alternating ±4% brightness on grass `#8CCB5E`.
  - The outer ground is `#7DB851`, bordered by a chunky wooden table rim beyond the field.
  - The deploy zone tint shows only during build.
- **Per-map palette:**
  - Hills: `#93C95F` with darker `#6FA94A` slopes.
  - Gorge: sandstone `#E0B084` plateaus, a deep chasm fading to `#2B2D42`, wooden bridges `#A0703C`.
  - Caldera: basalt `#4A4E69`, lava `#FF7B00` to `#FFD23F` (animated UV noise), and a warmer sky `#FFB38A` horizon.
  - Glazepond: snow `#F1FAEE`, ice `#BDE0FE` with crack lines, dark water holes `#1D3557`.
  - Mesa: terracotta `#D98E5F` top with a sky all around and clouds below.

### 11.3 Title screen concept
- Giant block letters spelling **CLOBBERFIELD** (each letter built from 3–6 box primitives in alternating faction colors) drop from the sky one by one. Each lands with a bonk, wobbles, and settles slightly crooked on the Buttercup Meadow.
- An **attract-mode battle** runs behind them: 12 v 12 random units, seeded, restarting every 45 s. Units that bump into letters knock them askew, since the letters are physics props.
- The camera slowly orbits.
- Menu buttons (Campaign, Sandbox, Settings) are chunky rounded pills with drop shadows. They squash and stretch on hover and press, with a "boing" sound.
- Tagline under the logo: *"Tiny armies. Big bonks."*

### 11.4 Quality presets and LOD

| Preset | Shadows | LOD distance (detail prims dropped) | Particles | Pixel ratio |
|---|---|---|---|---|
| High | shadow map 2048 | 60 m | 2000 | min(devicePixelRatio, 2) |
| Medium (default desktop) | blob | 45 m | 1200 | min(dpr, 1.5) |
| Low (default phone) | blob | 30 m | 600 | 1 |

- Auto-downgrade: if the average frame time exceeds 28 ms over 90 frames, step down one preset (view-side only; the sim is unaffected) and show a toast.
- "Low physics" (limb ground collision off for living units) is a manual setting, applied only at battle start because it changes outcomes.

**Performance targets:** 120 units at 60 fps on a mid-range desktop; 80 units at 30 fps or better on a mid-range phone.

**Snapshot interpolation.**
- `renderer.js` interpolates body transforms between `prevSnapshot` and `snapshot` with α = accumulator/dt.
- Weapon bone = armR matrix · grip offset. Mount legs and wheels are computed procedurally from `gait.phase`.
- Frustum culling uses a per-unit bounding sphere, before primitives are written.

---

## 12. Physics and controller constants (`tuning.js` defaults)

| Constant | Value |
|---|---|
| gravity | −9.82 |
| solver | GSSolver, 7 iterations, tolerance 1e-3 |
| broadphase | SAPBroadphase (axis x) |
| default contact | friction 0.4, restitution 0.05 |
| ice contact | friction 0.03 |
| hover (per unit, applied to torso or mount body) | F = M·g + M·(ω²·err − 2ζω·v_y), ω = 10 (Bertram 5), ζ = 0.8, clamp [0, 3Mg]. Active when err ∈ [−0.4s, 0.9s]. |
| upright PD | τ = I_eff·(220·axisAngleErr − 22·ω_perp)·gain, I_eff = m_torso·s²·0.1 |
| yaw PD | τ_y = I_eff·(120·yawErr − 18·ω_y)·gain |
| locomotion | F_xz = M·clamp(6·(v_target − v), 14 m/s²)·gain; ice ×0.3 |
| linear damping | alive 0.25, ice 0.02, corpse 0.1; angular damping 0.4 |
| gait | phase += dt·π·\|v_h\|/(1.1·s); hip target ±0.6 rad·min(1, \|v\|/speed) |
| limb drive | velocity drive: ω_limb = ω_torso + clamp(12·err, ±12 rad/s) (alive, gain > 0.5) |
| arm poses | ready / windup / strike / recover target angles per weapon type, table in `tuning.js` |
| knockback | Δv = \|J\|/M_unit, capped at 12 m/s horizontal and 9 vertical. Applied 70% at torso (at the hit point, giving spin) and 30% at the struck limb. |
| stagger | 2.5 ≤ Δv < 7: gain 0.25 for 0.5 s, then ramps up over 0.3 s; interrupts windup |
| launched | Δv ≥ 7 or geyser: gain 0, no hover or locomotion until speed < 1.5 and near ground (max 4 s), then down 0.8 s, then getup 0.6 s (hover target and gain ramp from 0 to 1) |
| death | gain 0 forever; after 2 s the group becomes CORPSE; sleep allowed; despawn when older than 25 s or when more than 80 corpses exist (oldest first, sinks 1 m/s for 1 s) |
| fall-through fix | torso more than 1.0·s below `heightAt` over solid ground for 0.5 s: teleport to h+1.2s and zero velocity |
| NaN guard | any NaN or \|v\| > 80: remove the unit's bodies, mark dead, emit `simError` |
| stuck | moved < 0.5 m in 6 s while wanting to move: lateral nudge Δv 2 and re-path; outside the field for more than 12 s: kill |
| unit caps | campaign 60 per side; sandbox 80 per side |

**Critical Files for Implementation**
- /home/user/Good-game/src/sim/world.js (tick order, rules, spatial hash, hazards, events)
- /home/user/Good-game/src/sim/ragdoll.js (6-body archetypes, balance controller, stagger/launch/death)
- /home/user/Good-game/src/sim/combat.js (all weapon types, knockback, heal cap, revive, charge)
- /home/user/Good-game/src/data/units.js (56 UnitDefs with look primitives; costs must match the formula in 4.1)
- /home/user/Good-game/src/view/renderer.js (instanced primitive rendering, interpolation, LOD)