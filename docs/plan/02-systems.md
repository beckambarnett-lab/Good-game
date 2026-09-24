## Part 2 — System Designs (rules, numbers, tuning targets)

All numbers live in `src/data/tuning.ts`, one typed object with comments, and are hot-reloadable in dev. The values below are **starting values**. The econ simulator (Part 7.10) and playtests tune them. Changing a value never needs a code change.

### 2.1 Time and calendar
**Clock**
- Game time runs in minutes since the start of Year 1, stored as a float.
- **Time scale (Standard):** 06:00–22:00 runs at 90 real seconds per game hour, so 16 h take 24 min. 22:00–06:00 runs at 45 s per hour, so 8 h take 6 min. A full day is **30 real minutes**.
- The *Day length* setting multiplies these: Relaxed ×1.33 (40 min), Standard ×1 (30 min), Brisk ×0.67 (20 min).
- **Time freezes** during menus, the Notebook, shop screens, dialogue (setting: "Time passes while talking", default off), cutscene beats, and the Day 1 intro. The clock starts at 15:00 when Hal's first tree lands.
- **Winter light:**

| Period | Time | Notes |
|---|---|---|
| Dawn | 06:30–08:00 | Sunrise 07:30 |
| Day | 08:00–15:30 | Sun peaks at only 22° at 12:00, so shadows are long |
| Dusk | 15:30–17:00 | Sunset 16:30 |
| Night | 17:00–06:30 | |

Nights are long and lamplit on purpose, because that's where the coziness is.
- **Moon:** an 8-day phase cycle. Moonlight intensity is 0.25 at new moon and 1.0 at full. Full moon falls on Days 4, 12, 20, … and is guaranteed on Lantern Night.
- **Town bell:** 12:00 (12 strikes, soft) and 18:00 (6 strikes). It gives a time cue without looking at the HUD.

**Calendar**
- 7-day weeks, Monday to Sunday. **Day 1 is a Monday.** A Winter is 8 weeks (56 days), then the Year increments.
- **Weekly rhythm:** Thursday is Train Day (10:00 arrival, 10:30 departure; mail and export crates). Saturday is Market Day (stalls in the square 09:00–14:00). Sunday is café brunch and the hall potluck at 17:00. Wednesday night is checkers at The Kettle.
- **Festivals** (full design in Part 3.6):

| Day | Festival |
|---|---|
| 1 | First Snow Supper |
| 14 | Hearth Fair |
| 28 | **Lantern Night** |
| 35 | Ice-Fishing Derby |
| 42 | Sled Race & Snow Sculpture Day |
| 49 | Sugaring Off |
| 56 | Long Night's End |

- **End of Winter (after Day 56, 22:00):** a paper-card time-skip plays with a music box version of the main theme. The cards read "The thaw came. Spring greened the woodlot. Summer at the lake. Leaves on the ridge. And then, one morning…" Year 2 Day 1 begins at 06:00 with a first snowfall.
- **Carried into Year 2:** all progress. Arcs show epilogue lines, festivals repeat with "anniversary" variants, and prices and orders scale ×1.1.

**Sleep**
- Interact with the bed and choose: "Sleep until morning" (to 06:00), "Nap 2 hours", or "Cancel".
- The sleep sequence runs about 6 s:
  1. Fade to warm black.
  2. The world simulates the skipped time in coarse steps: snow accrues, the stove burns, seasoning ticks, NPCs are placed per schedule.
  3. The **day card** shows yesterday's ledger, tomorrow's forecast and any new letters.
  4. Autosave runs.
- There is **no penalty** for never sleeping. Day rollover (orders, seasoning, autosave, day card toast) happens at 06:00 regardless.

**Sitting time-lapse**
- On any seat (porch swing, bench, café chair, stump, lookout bench), hold *Jump* to run time ×20.
- Music keeps its tempo. The ambient bed crossfades naturally. Falling snow, clouds and shadows visibly speed up.
- Time-lapse stops automatically at 06:00, 18:00, when a festival starts, or when an NPC approaches to talk.

### 2.2 Weather and environment
**States**

| State | Chance | Snowfall | Wind km/h | Fog density | Notes |
|---|---|---|---|---|---|
| Clear | 25% | 0 | 5–15 | 0.0035 | Crisp, long shadows. Night version is "Clear Frozen Night" |
| Fair | 15% | 0 | 5–15 | 0.0045 | Scattered cumulus |
| Overcast | 20% | 0 | 10–20 | 0.0070 | Flat light, soft shadows |
| Light Snow | 22% | 0.6 cm/h | 5–20 | 0.0100 | Big lazy flakes |
| Heavy Snow | 13% | 1.8 cm/h | 15–30 | 0.0180 | Dense, hushed |
| Blizzard | 5% | 3.0 cm/h + drifting | 45–70 | 0.0350 | Rare. Always forecast. 6–12 h long |

Chance is the long-run share of 6-hour blocks. Fog density is the exp2 fog density at the player.

**Modifiers**
- **Cold Snap:** a temperature front of −10°C lasting 1–2 days, about once a week. It raises demand.
- **Ice Fog:** morning, near the lake and farm fields, after a Clear, calm, cold night. 06:00–10:00, sparkling diamond dust in sunlight.
- **Hoarfrost:** the morning after Ice Fog. All trees and fences are rimed white until noon (a shader parameter).
- **Aurora:** Clear night, temperature ≤ −12°C, 12% chance per eligible night. Guaranteed on the night after Freya's arc beat 2, and at least once per Winter week from week 3 onward.

**Generation**
- A seeded Markov chain over 6-hour blocks, pre-generated **4 days ahead** and stored in the save. The transition matrix lives in `data/weather.ts` and is tuned so runs last 1–3 blocks.
- **Hard rules:**
  - No Blizzard on Days 1–3, on festival evenings, or back to back.
  - At least 1 day of forecast warning before a Blizzard.
  - At least one snowfall every 2 days, so shoveling jobs always exist.
  - Scripted overrides: Day 1 Light Snow from 15:00. Lantern Night Clear with full moon and aurora. Derby day Fair. Sled Race day fresh overnight snow then Clear.

**Temperature** (°C)

| Front | Base |
|---|---|
| Mild | −3 |
| Normal | −8 |
| Cold | −14 |
| Cold Snap | −22 |

- Diurnal swing ±4, lowest at 06:00 and highest at 14:00.
- Location offsets: Ridge −3, Lake −1, inside town −0.5 (heat island, charming).

**Wind**
- Base speed comes from the state. Gusts are a 1D noise with a 4–12 s period and 0–60% amplitude.
- **One shared gust signal drives tree sway, snow particles, flags, chimney smoke bend and the wind audio layers**, so what you see and hear always agrees.
- Exposure by zone:

| Zone | Exposure |
|---|---|
| Forest | 0.5 |
| Town | 0.7 |
| Cabin clearing | 0.8 |
| Farm fields | 1.0 |
| Lake | 1.2 |
| Ridge top | 1.4 |

**Transitions:** every visual and audio parameter lerps over 30 game minutes between states (Blizzard onset takes 45 min). The weather never pops.

**Forecast**
- Always accurate. Planning must be trustworthy.
- Sources: the radio (truck or cabin, read by DJ "Dale" as text captions over radio music), a chalkboard outside the general store (3-day icons), and Bea's gossip.
- The forecast includes cold snaps and aurora likelihood ("good chance of northern lights, folks").

**Gameplay effects**

| Effect | Rule |
|---|---|
| Warmth drain | Temperature, wind and night multipliers (2.6) |
| Snow accumulation | Shovel and plow jobs spawn at dawn after ≥ 4 cm fell (2.7) |
| Demand | Cold Snap ×1.3, day after Blizzard ×1.2, Mild ×0.9 |
| Deadfall | Each Blizzard fells 2–5 standing dead trees (marked snags) in forests: dry wood, **seasons at 50%** already |
| Visibility and driving | Grip on unplowed roads (2.8), fog |
| NPC schedules | Blizzard means most NPCs stay indoors. Clear afternoons mean kids sledding. Heavy Snow means NPCs shovel their own paths at 07:00 unless you already did (then they thank you) |
| Birds and fish | Feeder activity ×1.5 in snow or cold. Fish bite best at dawn, dusk and in overcast |
| Stargazing | Needs Clear night. Aurora is a bonus |

### 2.3 Player, camera, controls, interaction
**Character movement** (kinematic capsule, r 0.35 m, h 1.7 m, step 0.35 m, max walkable slope 38°)

| Parameter | Value |
|---|---|
| Walk | 3.4 m/s |
| Jog (hold or toggle) | 5.2 m/s. No stamina |
| Acceleration | 0 to walk in 0.18 s; stop in 0.12 s |
| Turn rate | ≤ 600°/s, smoothed |
| Carry multipliers | Armload ×0.88; one round ×0.78; two rounds ×0.7; wheelbarrow and sled ×0.9 (then surface rules) |
| Hop | 0.45 m, purely for fun; landing puff and crunch |

Surface speed multiplier (fresh snow penalty):
`m = 1 − clamp(depth_cm − 5, 0, 45) × 0.7 / 45 × (1 − boots_bonus) × (snowshoes ? 0.3 : 1)`

- Packed snow and cleared ground: 1.0.
- 25 cm fresh: ≈ 0.69 with starter boots. That is noticeable but not frustrating.
- Deep drifts are colliders, not walkable.
- Ice: speed 0.97, accel/decel ×0.35 (a gentle slide) unless crampons.
- Warmth "Cold" and "Frozen" states multiply speed (2.6).

**Camera** (third-person orbit, pointer lock)
- **Orbit:** yaw free, pitch −10° to +60°. Distance 6.5 m by default, wheel zoom 3.5–12 m. Target is the head minus 0.3 m. FOV 55° (setting 45–75).
- **Smoothing:** critically damped springs (position ω 8, zoom ω 6).
- **Lazy recenter:** after 2 s with no mouse input while moving, the camera eases behind the heading at ≤ 60°/s (setting).
- **Collision:** sphere-cast (r 0.25) against the collision BVH. It pulls in fast (ω 20) and releases slowly (ω 4). Thin occluders (trunks, posts, fences, NPCs) **dither-fade** instead of pushing the camera.
- **Context framings** (0.5 s ease; the player can still orbit ±40° except during dialogue):

| Context | Framing |
|---|---|
| Splitting | 3.2 m, pitch 26°, shoulder offset 0.6 m |
| Felling | 5.5 m, pitch 12°, yawed to show the fall line |
| Sawing | 3.8 m, side-on |
| Shoveling | 5.0 m, pitch 35° (see the cleared strip) |
| Talk | Two-shot framing both heads, 12° pitch |
| Interior | Authored diorama pose per room, 15% follow |
| Truck | Chase 7.5 m / 2.6 m high with lag and look-ahead; optional cab view (M5 stretch) |
| Sled | Low chase 4 m |
| Stargaze | Lying view, free look up |
| Sitting | Slow auto-orbit drift after 10 s idle |

- **Shake:** trauma model (trauma², Perlin), max 0.35° rotation / 0.04 m, decays in 0.4 s. *Reduce camera motion* sets it to 0.

**Controls — keyboard and mouse** (all rebindable)

| Action | Default |
|---|---|
| Move / jog | WASD / Shift (hold; toggle option) |
| Camera | Mouse (pointer lock). Wheel zooms |
| Use tool / primary | LMB (hold for charged actions) |
| Secondary / aim-adjust | RMB (shovel: throw direction; fishing: set hook) |
| Interact | E |
| Drink from thermos | Q |
| Tool radial | Hold R. Hotkeys 1–6: hands, axe, saw, shovel, maul, rod/auger |
| Lantern | F |
| Notebook | Tab (opens on last tab). J = Orders, M = Map |
| Jump / time-lapse while seated | Space |
| Pause | Esc |
| Truck | W/S throttle/brake-reverse, A/D steer, Space handbrake, E exit, H horn, L lights, P plow up/down, R radio station, T tailgate |
| Photo mode | P (on foot) |
| Dev overlay | F3 (dev builds) |

**Controls — gamepad** (standard mapping via the Gamepad API; prompts swap automatically to Xbox or PlayStation glyphs)

| Action | Button |
|---|---|
| Move / camera | Left stick / right stick |
| Tool / primary | RT (hold to charge) |
| Interact | A |
| Back | B |
| Drink | X |
| Notebook | Y |
| Cycle tools | LB/RB |
| Lantern | D-pad up |
| Map | D-pad right |
| Tool radial | D-pad left |
| Pause | Start |
| Map (alt) | View |
| Jog toggle | L3 |
| Truck | RT throttle, LT brake/reverse, A exit, X horn, Y radio, RB plow |
| Rumble | Impacts at ≤ 0.35 strength; off switch in settings |

**Interaction system**
- **Candidates:** interactables within 2.2 m (trees 2.4 m) and within a 70° cone of the character's facing. When the player is not moving, the camera forward is used.
- **Selection:** score = distance + angle penalty − priority bonus. Hysteresis (+0.3 score) stops the target flickering between two candidates.
- **Highlight:** a soft animated rim (fresnel emissive, 0.6 Hz breathe) on the target, plus a hand-drawn prompt bubble in screen space above it: `[E] Stack (Birch)`. Prompts fade after the player has performed that verb 5 times (setting: "Always show prompts").
- **Verbs:** Talk, Gather armload, Pick up round, Drop, Stack, Place on block, Split (enter mode), Fell, Buck, Load truck, Unload/Deliver, Hitch/Unhitch hauler, Enter/Exit, Sit/Stand, Sleep, Feed fire, Light fire, Brew, Fill feeder, Read (board, letter, sign), Shop, Drive, Plant sapling, Pet (dogs, cats, horses).
- **Carry state:** `none | armload(n, type) | rounds(1–2) | item(id) | hauler(sled|wheelbarrow)`. Carrying disables tools. Dropping (E on empty ground) makes a neat little pile that stays in the world and is saved.

### 2.4 Snow: accumulation, deformation, shoveling, plowing
Snow is both the main visual texture and a gameplay resource. There are four layers, each chosen to be cheap and reliable.

**Layer A — Base snow (terrain).** The terrain is always snow-covered. Snow is a material (Part 5), not a simulated volume. There are no bare-ground areas except cleared patches and under dense conifers (a darker needle-litter tint).

**Layer B — Clearable Snow Patches (gameplay-authoritative).** These are authored surfaces where depth matters: paths, driveways, porches, steps, the rink, road segments, and roofs.
- **Data:** each patch is a polygon or rectangle in local space, with a surface type (flagstone, gravel, planks, shingles, asphalt, ice), a grid resolution, `maxDepth_cm`, `exposure` (roofs 1.0, covered porch 0.15, under-eave paths 0.6) and an owner (for jobs).

| Patch kind | Cell size |
|---|---|
| Paths, porches, steps | 0.125 m |
| Roofs | 0.25 m |
| Roads | 0.25 m, 20 m segments |

- **Depth model, O(1) with no per-frame work:**
  - A global counter `A` (cumulative cm of snowfall on exposed flat ground) increases with the snowfall rate.
  - Each cell stores `base` (cm, Uint8) and `aMark` (value of `A` at last change, Float32).
  - Depth is `d = min(maxDepth, base + (A − aMark) × exposure × driftFactor)`. Writes set `base = newDepth`, `aMark = A`.
  - `driftFactor` is 1.0, or up to 1.6 on windward patches during a Blizzard (a per-patch value precomputed from wind direction).
- **Rendering:**
  - Each patch is a grid mesh over the underlying surface mesh. Vertex heights come from a small `DataTexture` (R8) sampled in the vertex shader.
  - The texture is re-uploaded only for dirty rects after a change, then batched once per frame.
  - Edges get a 0.25 m soft lip that blends into the base snow. The surface underneath shows through where depth < 1 cm: wet-dark tint, then dry.
- **Snowbanks:** each patch edge has "bank strips" (spline meshes) whose height grows with the volume shoveled toward that side (capped at 1.2 m). Banks are what make a cleared driveway look *done*. They are collidable when > 0.5 m.
- **Clearance %** = cells with d < 2 cm ÷ total cells. Jobs complete at ≥ 90%. The last 10% auto-clears with a satisfying "tidy-up" sweep animation so perfectionism is never required.
- **Save:** per-patch `base` quantized to a Uint8 array plus `aMark` compressed. Around 200 patches is under 400 KB before gzip (we gzip saves).

**Layer C — Trail and footprint deformation (visual + light gameplay).**
- **C1, world trail map:** 1024² R8 texture over the 512 m world (0.5 m per texel), mirrored on the CPU (Uint8Array 1 MB).
  - Value = packedness (0 pristine to 255 hard-packed).
  - Every footstep, sled run or tire track adds packedness in a small brush.
  - Snowfall decays it: `packed −= snowfall_cm × 12` per cell. A lazy scheduler updates 1/64 of rows per frame; GPU mirror updates are batched.
  - **Gameplay:** packed ≥ 120 counts as "packed snow". Speed is ×1.0 instead of the fresh-snow penalty, and footsteps switch to the squeaky packed sound.
  - Your habitual routes become real paths (desire paths) that fresh snow slowly erases.
- **C2, near-field footprint RT:** 2048² RG16F render target covering a 64 m square around the player (3.1 cm per texel). It uses toroidal (wrap) addressing: when the window shifts, only the newly exposed strips are cleared.
  - R = depression depth. G = rim/disturbance for shading.
  - Stamps (instanced quads into the RT): boot prints (left/right shapes, oriented), sled runners, tire treads (chains have a distinct pattern), snowball roll tracks, snow-angel shape, dog paws, NPC footprints within the window.
  - Refill: a full-RT pass each frame multiplies by `1 − refillRate × dt`. The rate is proportional to the snowfall rate (Heavy snow erases a footprint in about 6 game hours).
- **Terrain rendering:** the near 96 m of terrain uses a dense grid (0.25 m vertex spacing, a moving clipmap ring) so deformation displaces vertices. Normals come from RT gradients. The fragment shader darkens depressions slightly (blue shadow inside prints) and adds sparkle on the rims.

**Layer D — Snow on things.** One shared shader chunk, `snowcap`, blends snow onto upward-facing surfaces.
- `amount = smoothstep(0.55, 0.9, worldNormal.y) × coverage × objMask`, broken up by world-space noise.
- `coverage` is global and weather-driven: it rises during snowfall and holds while cold.
- Trees, roofs (visual only; roof *gameplay* snow is Layer B), fences, rails, lampposts and parked vehicles all get it.
- **Dynamic owners** (truck, player, NPCs) track their own `objMask`. It accumulates while stationary outdoors in snowfall (0 to 1 over 3 game hours) and resets when driven fast or when you step indoors. The player shakes off snow with an idle animation on entering interiors.

**Falling snow**
- A GPU particle volume (40 × 24 × 40 m box that follows the camera, wrapping positions in the vertex shader). No CPU per-particle work.

| Preset | Flakes |
|---|---|
| Low | 4k |
| Medium | 10k |
| High | 20k |

- Size, fall speed, turbulence and wind drift come from the weather state. Blizzard adds streak-stretched quads plus ground-hugging spindrift sprites.
- Culled inside interiors and under large roofs via up to 8 "no-snow boxes" passed as uniforms.
- Flakes near the camera use a soft bokeh sprite (larger, blurred). Diamond dust (Ice Fog) uses tiny glinting sprites that sparkle only toward the sun.

**Shoveling (the interaction)**
- **Hold LMB to push.** The shovel blade (tool-dependent width) scrapes forward along the character's path and accumulates a **load** (visible snow heaped on the blade).
- **Release LMB, or reach load capacity, to throw.** A throw animation flings the load to the side chosen with RMB-hold aim (default: the nearest patch edge) and adds to that bank.
- A **pusher** blade (Snow Pusher upgrade) doesn't throw. It bulldozes a growing ridge you deposit at the patch end.
- Each blade pass removes `min(depth, clearPerPass)` from cells under the blade footprint.

| Tool | Blade width | Clear per pass | Load capacity | Throw distance |
|---|---|---|---|---|
| Tin Shovel (start) | 0.45 m | 8 cm | 0.035 m³ | 1.8 m |
| Steel Shovel | 0.55 m | 12 cm | 0.05 m³ | 2.4 m |
| Snow Pusher | 0.80 m | 15 cm | 0.12 m³ | — (pushes) |
| Big Scoop | 0.75 m | 20 cm | 0.09 m³ | 3.2 m |
| Roof Rake | 0.6 m (reach 4 m) | 20 cm | — | Snow slides off the roof edge |

- **Feel:** the scrape pitch depends on the surface underneath (stone rings, gravel hisses, planks knock, ice squeals). Snow chunks are pooled instanced low-poly lumps that break into powder on landing. Each throw has a small camera nudge. When a patch crosses 90%, a soft completion chime plays in key and the owner's door opens: they wave and pay, or leave payment in the mailbox.
- **Pacing:** a 3 × 12 m driveway under 10 cm of snow takes about 70 s with the tin shovel and about 30 s with the Snow Pusher.
- **Roof raking:** from the ground, aim at the eave. Each pull slides a chunk of roof snow down. At about 30% cleared, a **mini-avalanche** releases the remainder of that roof face in a big powdery slide (scripted chunk mesh plus particles), with a lovely *fwumph*.

**Plowing (truck with Plow Blade)**
- P lowers the blade. While moving above 1 m/s, the blade footprint (2.6 m wide, angled) clears road and driveway patch cells to 1 cm and pushes snow into a windrow bank on the right side.
- Blade sounds: steel scrape plus a snow rush proportional to depth. Chunks spray off the blade.
- Plowing through a **drift** (scripted objects gating the Lake Road and the Ridge switchbacks) takes several passes, each shrinking the drift mesh by 25%, with heavy thumps.
- The town plow (Rusty, 05:30–07:00 daily after snowfall) clears Main Street and the Cabin Road junction. Side roads, driveways and the farm lane are left for you, which is where plow jobs come from.

**Drifts (gates)**
- Drifts are authored sculpted meshes (1.5–3 m tall) with a collision hull and a `clearedStage` (0–4).
- Snowfall regrows only cosmetic drifts. **Gate drifts never regrow** once cleared, so progress is permanent.

### 2.5 The firewood loop
Pipeline: **Tree → (fell) → Fallen trunk + brush → (buck) → Rounds → (haul) → Round pile → (split) → Splits in heap → (gather + stack) → Lot in woodshed → (season) → (load) → Truck bed → (deliver/sell) → coins, friendship, a visibly restocked porch woodpile.**

#### 2.5.1 Wood species

| Species | Where | Hardness | Seasoning days | Burn hours/split | Base price per bundle (seasoned) | Character |
|---|---|---|---|---|---|---|
| Pine | Woodlot (60%), Ridge | 1.0 | 2.0 | 0.8 | 4c | Easy, resinous, pops and sparks. Red-brown bark, pale wood |
| Birch | Woodlot (40%), Farm edge | 1.2 | 3.0 | 1.0 | 6c | White bark, bright clean flame. Bakers love it |
| Oak | Ridge (70%), 6 old oaks at Farm | 2.0 | 5.0 | 1.6 | 10c | Dense, knotty, long hot burn. Needs Forester Axe+ |
| Applewood | Farm orchard prunings (Otto arc L2+) | 1.4 | 3.0 | 1.2 | 16c | Sweet smoke. Tiny quantities. Café smoker, gifts |

- **1 bundle = 10 splits.** All UI counts in bundles with one decimal ("3.4 bundles").
- **Moisture pricing:** Green ×0.5, Seasoned ×1.0, Well-seasoned ×1.1.
- **Byproducts:**
  - **Kindling:** gather from brush piles, 3 bundles per tree; 1c each. Lights fires; some orders add it.
  - **Birch bark:** optional "peel" on a birch round before splitting; 1 roll, 2c. Used for Elin's craft order and as a fire starter.
  - **Pinecones:** pick up under pines. Snowman decoration, Pip loves them, bird-feeder ornament recipe.

#### 2.5.2 Trees and sites

| Size | Diameter | Height | Rounds | Splits per round | Splits per tree |
|---|---|---|---|---|---|
| Small (S) | 18–22 cm | 7–9 m | 3 | 2 | 6 |
| Medium (M) | 26–34 cm | 11–13 m | 5 | 4 | 20 |
| Large (L) | 38–44 cm | 14–17 m | 7 | 6 | 42 |
| Old oak (XL) | 48–56 cm | 16–19 m | 8 | 8 | 64 |

Only the Ridge has XL oaks.
- **Sites:**
  - Woodlot: 60 sites (start: 38 mature trees, 12 stumps, 10 saplings).
  - Ridge: 120 sites.
  - Farm edge: 20 sites (birch, a few old oaks, Otto's permission after arc L1).
  - Town, lake-shore and Heritage trees are protected. They get an "*This one stays, it's older than the town.*" prompt and no felling.
- **Growth:** stump → planted sapling (instantly) → Small at 6 days, Medium at 12, Large at 20. An unplanted stump sprouts on its own after 8 days.
  - Planting: E on a stump while carrying a sapling (free, 5 per week from Felix or Hal). +1 friendship with Felix and Hal, once per day.
- **Deadfall:** each Blizzard topples 2–5 pre-marked dead snags (grey, barkless) across the forests. They are already-fallen trunks at seasoning progress 0.5. Felix's map marks them after his arc L1.

#### 2.5.3 Felling
- **Equip the axe and face a tree** (within 2.4 m). A **fall-line preview** (dotted chalk line, 1.1× tree height) points away from you. It turns red and shows a tiny icon (shed, truck, person) if the fall zone intersects a protected thing. Walk around to change the direction; red swings only chip bark.
- **Swinging:** hold or tap LMB. Each swing does `P × rhythm` work against the tree's `W = diameter_cm × hardness`.
  - **Rhythm:** a press during the last 0.25 s of the previous swing's recovery. A soft wood-knock tick marks it, and the tree shivers at its apex. It gives ×1.35 power and a 0.8× wind-up.
  - Holding LMB auto-swings at normal cadence, which is fine and relaxing.

| Axe | Power P | Swing cycle | Notes |
|---|---|---|---|
| Old Axe (start) | 3.0 | 1.00 s | Dull thud, few chips |
| Old Axe, sharpened | 3.75 | 0.95 s | Adds a bright "tink" ring layer; bigger chips |
| Forester's Axe | 5.1 | 0.90 s | Deeper thock; unlocks oak |
| Longhorn Felling Axe | 7.2 | 0.95 s | Big arc, heavy whoosh, stronger camera kick |
| Old Faithful (Hal arc) | 7.8 | 0.90 s | Engraved head; a soft chime on rhythm hits |

  - Example: a medium pine (W 30) takes 10 swings with the Old Axe (8 with rhythm), 6/5 with the Forester's Axe, and 5/4 with the Longhorn.
- **Swing feedback:**
  - Anticipation squash on the wind-up.
  - 50 ms hit-stop and bark-chip burst (species-coloured).
  - Snow sifts down from the branches in bigger clumps each hit.
  - A notch mesh deepens visibly: the trunk has a procedural wedge cut that grows with progress.
  - The creak layer intensifies after 60% progress.
- **The fall:**
  1. At 100%, a crack plays and the trunk hinges at the notch.
  2. The angle follows the rigid-rod pivot equation `θ'' = (3g / 2L)·sin θ`, from θ₀ = 2° with a small kick. The fall takes 2.5–4 s: slow, then fast, like the real thing.
  3. From θ > 20°, branch snow dumps in waves.
  4. On landing (θ reaches the terrain slope), the trunk rebounds 3–5°, settles in 0.6 s and slides 0.2 m.
  5. Impact effects:
     - A snow-puff ring.
     - A trunk imprint stamped into the deformation maps.
     - Camera trauma 0.5 within 20 m.
     - Rumble.
     - Birds flush from trees within 25 m.
     - The sound stack plays whoosh, crack, thud and branch crackle, plus a delayed valley echo (0.4 s, low-passed).
  6. Music ducks −6 dB for 2 s, then a "rest" is favoured.
- **Auto-limbing:** on landing, the crown and branches separate into a **brush pile** beside the trunk. The trunk becomes a clean log with **bucking marks** (chalk ticks) along its usable length, one per round.

#### 2.5.4 Bucking (sawing rounds)
- **Equip the saw** and stand at a mark. Stroke by alternating LMB/RMB (push/pull), or hold LMB to auto-saw at the ideal cadence.
- **Strokes needed:** `ceil(diameter × hardness / (3.5 × sawPower))`. Each stroke takes about 0.4 s.
- **Cadence bonus:** alternating within ±0.12 s of the saw's beat gives ×1.2 progress, heard as a smooth rhythmic rasp instead of a binding screech.

| Saw | Power | Strokes, medium pine | Strokes, large oak (d 42) |
|---|---|---|---|
| Rusty Bucksaw (start) | 1.0 | 9 | 24 |
| Bucksaw + new blade | 1.5 | 6 | 16 |
| Swedish Bow Saw | 2.4 | 4 | 10 |
| Raker-Tooth Saw | 3.6 | 3 | 7 |

- **Feel:** rasp pitch rises as the kerf deepens. Sawdust spurts on each stroke. At 90% the kerf opens and the round sags. The last stroke drops the round with a *thunk*, and it rolls up to 0.5 m on a slope.
- **Rounds** carry `species, diameter, knots (0–2), seasoning 0`. Carry: one round by hand (×0.78 speed; ×0.7 if d ≥ 40), two small rounds (d < 25).

#### 2.5.5 Hauling

| Hauler | Capacity | Speed on cleared/packed | Speed in fresh snow > 10 cm | Sound identity |
|---|---|---|---|---|
| Hands | 1 round or 10 splits | ×0.88 (armload) | per surface rule | Wool rustle, wood knocking in arms |
| Log Tote | 2 small rounds or 20 splits | ×0.88 | per surface rule | Canvas creak |
| Wheelbarrow | 4 rounds / 40 splits | ×0.95 | ×0.60 | Rhythmic squeak (gone after Pneumatic Tire upgrade) |
| Sled | 6 rounds / 60 splits | ×0.60 on gravel or cleared, ×0.95 on snow | ×0.95 | Runner hiss; scrape on gravel |
| Truck | 10 → 18 (+16 trailer) bundle-units; 1 round = 0.5 unit | Part 2.8 | Part 2.8 | Part 2.8 |

- The wheelbarrow wants cleared paths and the sled wants snow. Both stay useful all game, and shoveling your own paths pays off.
- **Hitch:** E on the handle or rope. Load and unload with E at piles, heaps and stacks. Dropped rounds near the chopping block auto-arrange into the **round pile** (neat pyramid, up to 30; overflow makes a second pile).

#### 2.5.6 Splitting (the signature interaction)
1. **Enter:** E at the chopping block. If you carry a round it is placed; otherwise the next round comes from the pile (0.8 s lift-and-set, *thunk*). The camera eases to split framing. The tool auto-swaps to the best splitting tool you own.
2. **Read the round:** the top face shows procedural end-grain rings, 1–3 radial **checks** (cracks) and 0–2 **knots** (dark ovals).
3. **Aim:** mouse X (or the stick) rotates the round on the block by nudging it with your boot. Align a check with the fixed blade line.
   - Within ±8° of a check the line gently magnetizes. Assist strength is a setting and defaults on.
   - A knot on the line shows the line faintly brown.
4. **Swing:** hold LMB to wind up (axe 0.6 s, maul 0.8 s to apex).
   - At the apex the blade **glints** and a soft bell tone plays. That is the **sweet window** (0.35 s).
   - After the window the tool sags slightly (×0.85 power). Hold as long as you like; there is no punishment.
   - Release LMB for the 0.18 s downswing.
5. **Damage** = `toolSplit × timing × alignment`.
   - Timing: early release gives the raise fraction (0.4–1.0), sweet window ×1.15, late ×0.85.
   - Alignment: on a check ×1.25, neutral ×1.0, on a knot ×0.6.
6. **Toughness** of the piece on the block: `T = diameter × hardness × (1 + 0.5 × knotsOnLine)`. Each split produces two pieces with `T × 0.4` each.
   - The final piece count is fixed by round size (2/4/6/8). Pieces are true sector prisms of the round's geometry, so a clean split cleaves exactly along your aimed line.

| Split tool | toolSplit |
|---|---|
| Old Axe | 20 |
| Sharpened Old Axe | 26 |
| Forester's Axe | 30 |
| Longhorn | 30 |
| Old Faithful | 36 |
| Splitting Maul | 48 |
| Master Maul | 70 |
| Wedge + Sledge (for T > 80) | 35 per wedge strike, ignores knots |

   - Example: a medium pine round has T 30. The Old Axe with a perfect aligned strike does 28.75, so 2 strikes. Sharpened does 37, a one-strike clean split. A big oak round (T 84–112) needs the maul. With perfect strikes it takes 2 strikes for the first split, then one per piece.
7. **Outcomes:**
   - **Clean split** (split on the first strike of that piece): the halves pop apart and tumble into the **heap**. A chime plays in key. Consecutive clean splits walk up the current scale ("the splitting song"). Every 8th in a row resolves with a little cadence and a sparkle ring.
   - **Split** (more strikes needed): normal pop, no chime step. The streak resets gently, with no sound of failure.
   - **Stuck** (damage < 50% of T): the blade bites and sticks. The next LMB lifts the round on the blade and slams it down (auto, +50% damage). Funny and satisfying.
   - **Glance** (knot, weak strike): a dull *tok*, the piece rotates 10°. Re-aim.
8. **Tire ring** (Hal arc L2: "my father's trick", using an old tire from Rusty's yard): an old tire on the block keeps the pieces standing, so you strike again immediately without re-placing. That is about ×1.6 throughput and very rhythmic. Without it, remaining pieces are re-stood automatically (0.6 s).
9. **Exit** any time (E, Esc, or walking away). **Relaxed mode** (accessibility): alignment auto-snaps, every release counts as the sweet window, and hold-to-repeat splits automatically.
- **Pacing targets:**

| Round | Tool | Seconds, including placement |
|---|---|---|
| Medium pine | Sharpened axe, no tire | ≈ 5.5 |
| Medium pine | Maul + tire | ≈ 3.0 |
| Big oak | Maul + tire | ≈ 9.0 |

#### 2.5.7 Heap, gathering, stacking
- **Heap:** pieces land by physics-lite (`Debris`, Part 7.4) in a heap zone around the block and settle onto a heap height-grid, so the pile really grows.
- **Gathering:** E on the heap fills an armload to capacity (10 by hand, 20 with the tote). E on the heap while a hauler is hitched fills the hauler.
- **Woodshed structure:** bays → rows → lots. A **lot** is contiguous pieces of one species stacked the same day. Each lot has a small chalk tag showing species, day and a seasoning dot.

| Shed level | Capacity (bundles) | Seasoning speed |
|---|---|---|
| L1 (start) | 16 | ×1.0 |
| L2 Second Bay | 32 | ×1.0 |
| L3 Ventilated Walls | 48 | ×1.25 |
| L4 Drying Loft | 72 | ×1.6 |
| Outdoor tarp rack (max 4) | +8 each | ×0.8 |

- **Stacking:** hold E at a bay. Pieces are placed one by one at 0.28 s each, bark-up with slight random yaw, in a procedural packing pattern.
  - Each placement clack is pitched to the next note of the current key's pentatonic scale, wrapping by octave. A full armload plays a phrase that fits the music.
  - When a bay fills, it gets a little flourish and a "full" chalk mark.
- **Home woodbox** (beside the stove, holds 1 bundle): E at a shed lot → "Fill woodbox".

#### 2.5.8 Seasoning
- Each lot has progress `s`: `s += dtDays / seasonDays(species) × shedMult`. Deadfall lots start at s = 0.5.
- **States:** Green (s < 1), Seasoned (1 ≤ s < 2), Well-seasoned (s ≥ 2).
- **Visuals:** a per-instance `season` attribute drives end-grain colour (cream-green → warm tan with radial checks → silver-grey with deep checks) and a slight bark desaturation. Looking at a stack shows "Birch · 3.4 bundles · Seasoned (Day 9)".
- Loading picks the oldest lot of a species first (FIFO) unless an order needs a specific state.

#### 2.5.9 Loading and delivering
- **Load:** park with the tailgate within 6 m of the shed or heap. Hold E at the tailgate to open the **Load panel**, a tiny radial. The default is **"Load for my orders"**: it fills exactly what the active route needs, then asks about spare space.
  - The character auto-ferries armloads, 1.1 s per trip at short range. Pieces settle into the bed in species-sorted layers (instanced, per-slot).
- **Deliver:** park near a customer's **delivery spot** (porch woodbox, woodpile, café back door, sauna stove shed, farm sugar shack) and hold E to ferry.
  - The customer's **visible woodpile grows**.
  - If the customer is home they come out, pay and chat. Otherwise they leave an envelope in their mailbox: "Paid! 23c and a note: 'You're a lifesaver. —G.'"
- **Home stove:**
  - Burn times: pine 0.8 h, birch 1.0, oak 1.6, apple 1.2 per split.
  - Stove capacity: Old Stove 6, Cast-Iron 10, Masonry Heater 12 (stays warm 12 h after going out).
  - If the stove goes out, the cabin cools: indoor warmth refill drops from +50 to +15 per game hour, frost creeps on the windows, and the light turns blue-grey.
  - Relighting uses one kindling. If you have none there is always the matchbox, which takes a little longer.

### 2.6 Warmth and clothing
**Warmth** W runs 0–100. Rates are per game hour.

**Drain outdoors:**
```
drain = (3 + 0.6 × max(0, −T°C))
        × (1 + windKmh × zoneExposure / 60)
        × (snowing heavy/blizzard ? 1.1 : 1)
        × (working in last 10 s ? 0.6 : 1)
        × (1 − insulation)
        × buffMultipliers
```
- Normal day (−8°C, 10 km/h wind, cabin clearing): about 8.8/h in starter clothes, about 7/h while working. Chilly after about 10 real minutes of continuous outdoor time.
- Clear night (−15°C): about 13.6/h.
- Blizzard (−12°C, 60 km/h): about 22/h.

**Refill:**

| Source | Refill |
|---|---|
| Within 3.5 m of a fire (stove, fireplace, fire barrel, campfire) | +45/h |
| Inside a heated building | +30/h |
| Cabin with the stove lit | +50/h |
| Cabin with the stove out | +15/h |
| Truck cab | Drain ×0.5 (no heater); +40/h with Cab Heater |
| Sauna | +120/h |

**Drinks and buffs** (thermos with Q, café, home brew)

| Item | Instant | Buff |
|---|---|---|
| Cocoa | +20 | Toasty: drain ×0.5 for 1 h |
| Coffee | +12 | Toasty 0.5 h + Perked: work speed +10% for 1 h |
| Tea | +15 | Toasty 1.5 h |
| Cider (café) | +25 | Toasty 1.5 h |
| Mara's Special (arc recipe) | +30 | Toasty 2 h |
| Sauna | — | Glow: drain ×0.3 for 3 h |
| Cold plunge after sauna | W = 100 | Invigorated: +10% move speed for 1 h (Margo cheers) |

**Warmth states** (never harmful)

| W | State | Effects |
|---|---|---|
| ≥ 70 | Warm | HUD icon hidden |
| 50–70 | Comfortable | Icon faint |
| 30–50 | Chilly | Bigger breath puffs, occasional shiver idle, 10% frost vignette, icon shown |
| 10–30 | Cold | Move ×0.88, actions ×0.9, hunched idle, occasional teeth chatter, 25% frost vignette. After 60 s a thought bubble: "A warm drink… or home." |
| 0–10 | Frozen | Move ×0.75, actions ×0.8, 35% frost. A gentle prompt: **"Head home?"** |

- **"Head home?"** fades out, and you trudge home. The clock advances by the travel time, capped at 1 game hour. You arrive by the stove with W 80.
- Alternatively, on a road, a passing neighbour ("Hop in, you look frozen!") drives you home.
- There is no loss of coins, items or progress. W never drops below 0.

**Clothing.** Insulation is additive and capped at 0.80. Every tier has its own mesh or colour, rustle sound and footstep layer, and NPCs comment on new pieces.

| Slot | Tier 0 (start) | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|---|
| Hat | Old toque 0.00 | Wool Beanie 0.06 | Trapper Hat 0.12 | Wrenhollow Bobble 0.16 |
| Scarf | — | Knit Scarf 0.04 | — | — |
| Mittens | Work gloves 0.00 | Wool Mittens 0.05 | Leather Choppers 0.10 (+5% tool speed) | Down Mittens 0.14 |
| Jacket | Canvas chore coat 0.04 | Wool Mackinaw 0.12 | Quilted Parka 0.20 | Down Expedition Parka 0.26 |
| Boots | Rubber boots 0 (deep-snow bonus 0) | Felt-lined Pac Boots 0.04 (bonus 0.15) | Leather Mountain Boots 0.08 (0.25) | Crampon Boots 0.10 (0.30, ice grip, Ridge trail) |
| Sweater | — | — | — | Wrenhollow Sweater 0.08 (Nadia arc reward) |

- Maximum total is 0.78. Late game, a full kit makes nights comfortable and blizzards a gentle challenge.
- **Snowshoes** are equipment, not clothing: fresh-snow penalty ×0.3 and a "whump" footstep. They strap on automatically with a quick flourish in fresh snow deeper than 15 cm and come off on cleared or packed ground.
- **Dyes:** 6 colours per garment family, 10c at Nadia's. This is cosmetic only.
- **Sound identity:** canvas coat is a crisp swish. Wool is a soft brush. Down is a puffy "fff". Leather boots add a creak. Crampons add a metallic bite on ice.

**Light**

| Lantern | Radius | Look |
|---|---|---|
| Hal's Old Lantern (Day 1) | 6 m | Warm 2200 K, flickers |
| Brass Lantern | 9 m | Steadier |
| Storm Lantern | 12 m | Rock-steady in blizzards; subtle glass-ringing clink when walking |

- The lantern is automatically lit outdoors from dusk to dawn. F toggles it.
- It hangs from the belt when your hands are busy and is held up when walking empty-handed.

### 2.7 Economy
**Prices**
- **Delivery (household) price per bundle, seasoned:** Pine 4, Birch 6, Oak 10, Apple 16. Then multiply by moisture (0.5 / 1.0 / 1.1) × demand D.
- **Wholesale** (Gus's store, open 08:00–19:00, any quantity): Pine 2, Birch 4, Oak 6, Apple 10 (× moisture × D).
  - Full price for the first 12 bundles per species per day. Then −10% per extra bundle, down to a 50% floor. The limit resets at 06:00.
  - The store is the always-available outlet. Orders pay about 1.6× better and build friendship.
- **Delivery fee per stop:** Town 1c, Lake 3c, Farm 3c, Ridge 5c.
- **Tips:** 3% of order value per friendship level (L5 = 15%). A further +10% if an order's "ideal day" is met.
- **Demand D** (per species, per day, shown on the store chalkboard with ▲/▼):
  - `D = weather × festival × trend × drift`.
  - Weather: Cold Snap 1.3 (oak 1.4); day after a Blizzard 1.2; Mild 0.9.
  - Festival week: 1.1.
  - Trend: oak +2% per week, capped at +12%.
  - Drift: ±5%, mean-reverting, seeded daily.
- **Rounding:** totals round to whole coins at payment. Internally prices are floats.

**Orders** (Notebook → Orders tab; the notice board sits outside the post office)
- **Board generation at 06:00:** 2 + business tier cards (3–7 new), with at most 10 cards on the board. Unaccepted cards rotate out after 3 days.
- **Active orders:** accept up to 5 + tier (6–10).
- **Orders never expire** once accepted.
- **Card template:** customer, species (or "any"), minimum seasoning, bundles, optional extras (kindling or birch bark), optional *ideal day*, and a note written in the customer's voice.

| Tier | Bundles per order |
|---|---|
| T1 | 1–3 |
| T2 | 2–5 |
| T3 | 3–8 |
| T4 | 5–12 |
| T5 | 8–16 |

- **Customers:** the 14 named characters plus **18 named households** (Part 3.4). Area unlocks add their households to the pool.
  - Weighting favours customers whose porch woodpile is low. Each household's pile drains 0.5–2 bundles per day depending on household size and temperature.
- **Jobs:**
  - **Shovel jobs** appear at 06:00 after ≥ 4 cm of overnight snow: 2–6 of them, on the board or asked in person. Pay = `max(3, round(area_m² × depth_cm × 0.012))`. A 30 m² path under 10 cm pays 4c; a 60 m² driveway under 15 cm pays 11c.
  - **Roof jobs** (Roof Rake) pay 8–20c.
  - **Plow jobs** (Plow Blade: lanes and driveways) pay 8–25c. The Farm Lane pays 25c, and every snowfall afterwards generates it again.
- **Standing contracts:** opt in at the customer. Pause or cancel any time. A skipped delivery gets a friendly "no worries" note and costs nothing.

| Contract | Unlock | Terms |
|---|---|---|
| The Kettle (Mara) | Offered at your first delivery to Mara (Day 1–2) | 1 birch bundle, Mon–Sat, +10% |
| Stillmere Sauna (Margo) | Lake access | 3 bundles pine/birch every 2 days |
| Snowdrift Inn (Wendell) | Tier 2 | 8 bundles, any seasoned, every 3 days; +15% if birch |
| Schoolhouse (Elin) | Elin L1 | 2 bundles every Monday |
| Ranger Station (Felix) | Ridge access | 4 bundles weekly |
| Sugar Shack (Otto) | Day 42 (arc) | 10 bundles every 2 days until Day 49 |
| Mail-order crate (Bea) | Tier 3 | Up to 30 bundles each Thursday at wholesale ×1.2; unlimited demand, so a big producer is never capped |

- **Community orders:** the school stove, hall stove and festival bonfires. They pay little (or nothing) but give **+2 friendship with everyone** and a unique decor reward.

**Business tier** ("Hearthwood's name around town")
- Points = bundles delivered (orders + contracts + community, not wholesale) + 1 per job.

| Tier | Points | Sign at the cabin drive |
|---|---|---|
| T1 | 0 | Hand-painted board |
| T2 | 25 | Carved sign |
| T3 | 80 | Carved sign with lantern |
| T4 | 180 | Wrought-iron sign by Ines |
| T5 | 350 | Iron sign with an iron wren on top |

- Each tier-up is a small moment: Bea sends a letter, the sign is swapped overnight, and the truck door lettering is freshened.

**Ledger** (Notebook)
- Daily entries by category. Income: deliveries, contracts, wholesale, jobs, fish, tips. Spending: tools, truck, clothing, home, consumables, gifts.
- A hand-drawn weekly bar chart.
- Lifetime stats: trees felled, rounds split, clean-split record, bundles delivered, m² shoveled, km driven, fish caught, birds seen.

**Economy tuning targets** (typical engaged player; validated by `tools/econ-sim.ts`, Part 7.10)

| Play time | Earning rate | Cumulative earned |
|---|---|---|
| 1 h | ≈ 80 c/h | ≈ 80 |
| 3 h | ≈ 150 c/h | ≈ 380 |
| 6 h | ≈ 230 c/h | ≈ 1,050 |
| 10 h | ≈ 350 c/h | ≈ 2,400 |
| 15 h | ≈ 500 c/h | ≈ 4,900 |
| 20 h | ≈ 620 c/h | ≈ 8,000 |

- **Guardrails:**
  - No single upgrade costs more than about 90 minutes of income at its intended unlock time.
  - Every play hour offers at least one affordable, desirable purchase.
  - Wholesale-only play still progresses at about 60% of the order-based pace, so the game never soft-locks.

### 2.8 Vehicles
**The truck, *Marigold*** (arcade raycast vehicle; no physics engine)
- **Model:**
  - 4 wheel raycasts against the terrain heightfield and BVH ramps.
  - Spring-damper suspension (k and c tuned for a soft, bouncy ride).
  - Longitudinal and lateral tire forces from a simple slip model using μ(surface, tires).
  - Engine: a force curve with 3 automatic gears (audio only; the driver never shifts).
  - Mass is about 1.8 t. Center of mass low. Roll clamped ±12° and pitch ±15°, so it **cannot flip**.
- **Driving numbers:**
  - Top speed: 60 km/h on plowed roads, 45 km/h in fresh snow, 15 km/h in reverse.
  - 0 to 40 km/h: 6 s on a plowed road.
  - Steering: 32° lock at low speed down to 12° at top speed. 0.15 s smoothing, auto-centering.
- **Grip μ by surface:**

| Surface | Stock tires | Snow tires | Chains |
|---|---|---|---|
| Plowed road | 0.70 | 0.85 | 0.95 |
| Packed snow | 0.45 | 0.70 | 0.85 |
| Fresh snow of depth d cm | 0.35 − 0.004d | 0.60 − 0.003d | 0.80 − 0.002d |
| Ice | 0.15 | 0.30 | 0.70 |

- **Gates follow from physics:**
  - The Farm Lane entrance is a **14°** rise (needs μ ≥ 0.25) in about 30 cm of unplowed snow. Stock tires (μ 0.23) just spin; snow tires (0.51) climb. A plowed lane (0.70) also works.
  - The Ridge switchbacks are an **18°** grade (needs μ ≥ 0.33) with ice patches on the hairpins. Stock (0.15) and snow tires (0.30) slide back on the ice; chains (0.70) climb.
  - Climb rule in TruckSim: the traction force is capped at `μ·m·g·cos θ`. If it's less than `m·g·sin θ` plus rolling resistance, the wheels spin: wheel-spin audio, snow spray, a slow slide back.
  - The Lake Road is blocked by a gate drift, which needs the plow.
- **Stuck assist:** after 3 s of throttle with no progress, a hint names the missing upgrade, plus "[Hold Space] Rock free". Space is the handbrake key; holding it 1 s while stuck auto-reverses 3 m. The Notebook also offers "Call Rusty": a free tow within 1 game hour, and he honks and chuckles.
- **Collisions:** soft rubbery bounce and a wood-rattle sound. No damage anywhere.
- **Enter and exit:** E at the door. There are door animations and a "clunk". The handbrake is set automatically.
- **Cruise** (M5 stretch, accessibility): choose a destination in the Map. *Marigold* autodrives along the road graph at 40 km/h while you listen to the radio. Any input cancels it.
- **Upgrades change feel** (Part 4 lists prices):

| Upgrade | Visual | Audio | Handling |
|---|---|---|---|
| New Battery | Headlights and dash lights work | Starter whirr, catch, idle rumble | Driving unlocked |
| Snow Tires | Chunky tread | Richer crunch | μ per the table |
| Stake Bed | Wooden stake sides | Wood rattle over bumps | 18 bundle-units |
| Plow Blade | Yellow front blade | Hydraulic whine, steel scrape, snow rush | −5% top speed with the blade down |
| Tire Chains | Chains on the rear wheels | Rhythmic jingle-clink tied to wheel speed | Ice grip; distinct track stamp |
| Cab Heater | Warm orange dash glow; windshield frost clears in 20 s instead of 3 min | Soft fan hum | +40/h warmth in the cab |
| Fog Lights | Two amber bumper lamps with light cones in snowfall | Toggle click | Visibility |
| Flatbed Trailer | Hitched trailer | Hitch clank | +16 units; slight sway, simple pivot follower |
| Radio Antenna | Whip antenna | Adds the "Night Owl" station (20:00–04:00) | — |
| Paint jobs | 4 colours, cosmetic | — | — |

**Radio**
- **Radio Wrenhollow** (daytime): old-time generated tunes. At the top of each game hour, DJ Dale reads the forecast and town news as captions, with a muffled voice-blip murmur.
- **Night Owl:** slow ballads.
- **Off:** just engine and wind.
- The same radio exists as a tabletop set in the cabin (starting item) and in the café.

**Sled** (hauler, and rideable on slopes > 8°)
- Ride physics: `a = g·sin θ − μ·g·cos θ`, with μ 0.06 on packed snow and 0.12 on fresh. Speed capped at 13 m/s.
- Steer by leaning; brake by dragging your feet (S), which leaves drag marks.
- Hitting an obstacle causes a gentle **flop**: a tumble into powder, a snow puff, 1.5 s to stand up, and kids laugh if they're nearby. It is never a failure.
- Leaves runner tracks in the deformation map. The Sled Race uses this.

**Wheelbarrow:** pushed with ground following and slight bump bounce. It cannot tip. It squeaks until the Pneumatic Tire upgrade.

### 2.9 Townsfolk: scheduling, navigation, dialogue, friendship
**Character data** (`src/data/characters/<id>.ts`; one file per character):
- Identity: name, role, home, workplace, walk speed (1.0–1.5 m/s), voice parameters.
- Look reference: the Blender script id.
- Personality tags.
- Relationships to others, typed: `family | friend | oldFlame | rival | mentor | colleague`.
- Gift preferences.
- Schedule.
- Dialogue pools and arc definition.

**Schedules** — a deterministic function `schedule(characterId, gameTime, world) → {activity, place, phase}`.
- **Tables** per day type: `weekday | saturday | sunday`. Override layers are applied in this order: **festival → weather → arc state → base**.
- **Blocks:** `{ from: "07:30", activity: "work", at: "cafe.counter" }`. Travel is automatic: departure = block start − path time − 2 min buffer.
  - If the player is talking with them, they are simply late and say so ("Goodness, the buns!").
- **Activity library:**

| Activity | Description |
|---|---|
| Sleep | Hidden in home; window dark |
| HomeIdle | Inside; window lit; sometimes visible at a window |
| Work(station) | Counter, forge, garage bay, desk, classroom, barn, sauna stove |
| Eat(table) | At a table |
| Chat(partner, spot) | Synchronized pairs; can be overheard |
| Stroll(route) | Walk a route |
| ShovelOwnPath | Only if their patch is > 4 cm deep. If the player already cleared it they walk out, see it, and a thank-you is queued |
| Shop(store) | Visit a store |
| SitBench | Sit on a bench |
| WalkDog(route) | Dog walk |
| Checkers(partner) | At the café |
| Fish(hole) | On the lake |
| Sauna | At the lake sauna |
| Sled / BuildSnowman / SnowballFight | Kids and ambient |
| Perform(role) | Festivals |
| Travel(vehicle) | Rusty's wrecker, Otto's tractor, the town plow |

- **Weather overrides:**
  - Blizzard: outdoor blocks become indoor equivalents.
  - After ≥ 4 cm of snow: homeowners' 07:00 ShovelOwnPath.
  - Clear afternoons: kids Sled 15:00–17:00.
- **Skipped time** (sleep or background): NPCs are re-placed via `schedule(t)`, so there is no drift and no stuck NPCs.

**Navigation**
- **Waypoint graph:** about 450 nodes covering sidewalks, crossings, paths, porches, doors and interior nodes. It is authored in `data/world/navgraph.ts` with helper generators along road splines.
- Edges have a type (sidewalk, crossing, path, trail, interior, stairs, ice) and a cost.
- A\* with a path cache keyed (from, to).
- **Smoothing:** string-pulling within each edge's corridor width.
- **Steering:** seek/arrive + separation (0.6 m) from NPCs and the player + slow-down near the player.
  - If the player blocks a narrow spot for more than 1 s, the NPC side-steps, or waits and says "Pardon me!"
- **Doors:** the door swings and a shop bell rings. Entering switches the NPC to interior nodes.
- **LOD:**

| Distance | Update |
|---|---|
| Near (< 40 m, visible) | Full animation, IK and steering at 60 Hz |
| Mid (40–120 m) | Animation at 30 Hz, no IK, steering at 10 Hz |
| Far or hidden | "Virtual" position advanced along the path at 2 Hz, not rendered |

**Awareness and barks**
- NPCs turn their head toward the player within 5 m (head IK with ±70° yaw and smoothing).
- They wave on first sight each day (≤ 15 m).
- They bark about what you're doing, with cooldowns: 90 s per NPC and 20 s global. Examples: "Nice stack!", "Mind the ice!", "Is that my birch?"

**Dialogue content types**

| Type | Input | Use |
|---|---|---|
| Bark | None; floating bubble | Ambient, contextual |
| Chat | Talk (E); 1–4 lines, occasional choice | Daily conversation |
| Scene | Talk when the ✦ sparkle shows over their head | Arc beats; camera framing, choices, effects |
| Letter | Read at the mailbox | Orders, thanks, arc beats, tier-ups, Hal's gentle tips |
| Overheard | Automatic when within 8 m of a Chat pair or seated in the café | Townsfolk talking to each other about events |
| Radio | Captions | DJ Dale: forecast, town news, song intros |

**Chat selection algorithm** (deterministic given the RNG seed):
1. If an **arc scene** is available (friendship threshold plus conditions), the ✦ shows. Talk plays the scene.
2. Else, if the player carries or has an order for this NPC, play an order-related line.
3. Else, pick from **reactive** lines: town-memory events the NPC *knows* about, within their freshness window.
4. Else, pick from **contextual** lines (weather, time, place, festival proximity, player's outfit or tools).
5. Else, pick from **general** pool lines.

- Within a tier, pick by weight × recency penalty. A line doesn't repeat within 5 days, and a pool that runs out resets with its oldest lines first.
- The first chat each day gives +1 friendship.

**Condition DSL** (typed helpers, all serializable IDs):
`time(6,10)`, `dow('sat')`, `dayAtLeast(14)`, `weather('heavy','blizzard')`, `tempBelow(-15)`, `at('cafe')`, `friendship('hal', 3)`, `flag('truck_repaired')`, `arc('freya', '>=', 2)`, `knows('storm_last_night', {withinDays: 2})`, `owns('plow_blade')`, `wearing('trapper_hat')`, `carrying('birch')`, `orderFor('mara')`, `festival('lantern', 'tomorrow')`, `chance(0.3)`.

**Effects:** `setFlag`, `friendship(+n)`, `give(item | coins)`, `offerOrder(template)`, `startContract(id)`, `advanceArc`, `remember(event)`, `unlock(area | shopItem)`, `sendLetter(id, delayDays)`, `stinger(id)`.

**Town memory**
- A typed event log with timestamps. Examples: `truck_repaired`, `first_oak_split`, `storm_last_night`, `player_plowed_farm_lane`, `lantern_night_done`, `pip_won_race`, `player_new_coat`, `player_fell_in_snow_near_kids`.
- **Knowledge spread:** witnesses know immediately. Bea knows everything within 0.5 day. Family members know after 0.5 day. Everyone else knows after 1–2 days (seeded).
- This makes gossip feel real: Bea is first and Gus is last.

**Voices**
- Per-character "murmur" blips: pitch 80–320 Hz base, vowel formant pair per syllable, speed 11–16 syllables per second.
- Level is −18 dB relative to SFX. Music ducks −3 dB under speech. Settings: Voices on/off.

**Text presentation**
- Bubble above the speaker with a tail and a name tag.
- Reveal speed is 45 chars/s (settings: 30/45/60/instant). E completes, then advances.
- Choices are 2–3 hand-drawn tabs.
- The player's name and pronouns (chosen at New Game) are inserted via `{name}`, `{they}`, `{them}`, `{their}`.

**Writing budget per named character**

| Content | Lines |
|---|---|
| Barks | ~40 |
| Chat lines (~30 chats) | ~60 |
| Arc scenes (5 × ~10) | ~50 |
| Letters | 6 |
| Festival lines | ~20 |
| Overheard pair lines | ~20 |
| **Total** | **≈ 200** |

- About 2,800 lines for the town, written milestone by milestone (Part 8). **Minimum shippable is 1,800.**

**Friendship**
- Points per character. Levels at 10 / 25 / 45 / 70 / 100 are L1–L5, shown as five candles on their Notebook page.
- **Gains:**

| Action | Points |
|---|---|
| First chat of the day | +1 |
| Completed delivery | +2, +1 per 5 bundles |
| Job for them | +2 |
| Gift (once per day) | Loved +4, liked +2, other +1 |
| Arc task | +5 to +10 |
| Community order | +2 to everyone |
| Attending a festival | +1 to everyone present |

- **No decay and no negatives.** Even an odd gift is +1 with a funny line.
- **Level perks:**

| Level | Perk |
|---|---|
| L1 | Schedule notes appear in Folks |
| L2 | 5% discount at their shop, or +tip |
| L3 | Occasional mailbox gifts |
| L4 | 10% discount |
| L5 | Arc finale + reward + framed photo for the cabin wall |

**Gifts** (15 items). Loves and likes per character are listed in Part 3.5.

| Gift | Source |
|---|---|
| Perch, lake trout, smelt, whitefish, burbot | Ice fishing |
| Cardamom bun | The Kettle, 3c |
| Cocoa tin, tea tin | Gus, 8c / 5c |
| Birch bark roll | Peel birch rounds |
| Pinecone | Forage under pines |
| Applewood split | Your applewood lots |
| Carved bird, carved bear | Whittling; or buy from Hal's porch (8c, Hal L1+) or Sven's boathouse decoys (10c). This keeps the gift available if whittling is cut |
| Maple syrup jar | Otto: Saturday market / farm, 10c; weekly free after Otto L5 |
| Knitted mitten pair | Nadia, 12c |
| Star chart | Freya, 6c (Tue/Sat in town, or at the farm) |
| Sauna birch whisk | Margo's shack, 5c; or tie one from birch brush (E on a birch brush pile) |

**Mail**
- The cabin mailbox raises its red flag and a soft bell chimes as you approach.
- Letters carry text and optional coins, an item, an order or a contract.
- Hal's letters double as **gentle onboarding** (Part 2.11).

### 2.10 Side activities
There is no pressure or failure in any of these; they all feed collections, friendships or the cabin. **Core** means it ships in the main milestones. **Stretch** means built after the core is polished, and cut first (Part 10).

#### Ice fishing (core, M7)
- **Needs:** Ice Auger (70c) and a Jig Rod (30c).
  - Bait: 2c for 5 at Margo's shack; free from Margo L2.
  - The lake is **safe from Day 6**. Margo's "four inches of good ice" news is a Town Memory event. Before that, rope lines and "THIN ICE" signs keep you off.
- **Drill:** equip the auger and hold LMB.
  - Takes 4 s (Basic Auger) or 2.5 s (Sharpened Blades upgrade).
  - Shavings spiral out and pile into a ring. A *thunk* marks the breakthrough, then a gurgle as water wells up.
  - Holes persist and skim over after 2 days.
- **Fish:**
  1. E at a hole sits you on an upturned bucket.
  2. The mouse wheel sets depth (shallow, mid, deep).
  3. Jig with gentle mouse-Y motion, or hold LMB to auto-jig.
  4. A **bite** shows as a rod-tip twitch with a tick sound (plus an optional visual pulse). Press LMB within **1.2 s** (Relaxed: 2.5 s) to set the hook.
  5. **Reel:** hold LMB. The fish surges in bursts and the rod bend shows tension. Easing off during a surge is optimal.
  6. Sustained max tension for 2 s means the fish slips off ("It got away!", splash, bait gone). The line never breaks.
  7. **Landing:** the fish flops onto the ice and a paper card shows species, size, value and a ★ if it's a record.
- **Species:**

| Species | Where | When | Size | Value |
|---|---|---|---|---|
| Yellow Perch | Shallow | Day | 15–30 cm | 3c |
| Rainbow Smelt | Mid | Night; bites come in runs | 10–20 cm | 2c |
| Whitefish | Mid | Overcast | 30–50 cm | 7c |
| Lake Trout | Deep | Dawn/dusk, ≤ −10°C | 40–80 cm | 12c |
| Burbot | Deep | Night | 30–70 cm | 9c (a beloved ugly fish) |
| Northern Pike | Shallow weed edge by the boathouse | Day | 50–100 cm | 14c |
| **"Old Whiskers"** (legendary pike, 118 cm) | — | Only after Margo arc L4: Derby day or any overcast dawn | 118 cm | — |

- **Pacing:** one bite every 40–120 real seconds.
- **Uses:** sell to Mara, Margo or Wendell; gifts; the Fish log (best sizes).
- **Ice shelter:** rent Margo's hut (5c per day, free at L3). Warm inside (+30/h) with a tiny stove and radio, so night fishing is cozy.

#### Bird feeding and the Bird Book (core, M10; the cabin feeder arrives in M1)
- **Feeders:**

| Feeder | Price | Attracts |
|---|---|---|
| Porch Feeder | 15c | — |
| Tube Feeder | 40c | Finches |
| Suet Cage | 20c | Woodpeckers, nuthatch |
| Platform Feeder | 30c | Jays, cardinals |

- **Seed:**

| Seed | Price | Fills |
|---|---|---|
| Sunflower | 5c | 3 |
| Nyjer | 7c | 3 |
| Suet cake | 4c | 1 |

  One fill lasts about 1 game day. A visible level drops as birds eat.
- **Behaviour:** birds arrive along curved flight paths, perch, hop and peck (procedural animation).
  - They flee if you jog within 4 m or chop within 10 m. They stay if you're still or seated.
  - Activity is ×1.5 in snow or cold.
- **Spotting:** a bird that's within 12 m and in view for 2 s while you're slow or still is recorded. The Bird Book page shows a sketch-filtered render of the in-game bird model.
- **Species:**

| Species | Where / feeder |
|---|---|
| Black-capped Chickadee | Sunflower |
| Blue Jay | Platform |
| Northern Cardinal | Platform; red on snow |
| White-breasted Nuthatch | Suet; walks upside down |
| Downy Woodpecker | Suet |
| Common Redpoll | Nyjer; flocks in snowfall |
| Snow Bunting | Farm fields; flocks, no feeder |
| Pine Grosbeak | Ridge ranger station feeder |
| Great Horned Owl | Night, woodlot and ridge; heard more than seen |
| **Winter Wren** | Rare. Appears at the cabin brush pile at dawn only after Gus arc L4 |

- **Rewards:** Gus's arc, a carved-bird mobile, and the Birder's badge.

#### Snowmen and snow angels (core, M10)
- **Roll:** in fresh snow ≥ 10 cm, with hands free, E starts a snowball. Walk into it to push it.
  - Radius grows 1.2 cm per metre rolled over fresh snow (max 0.6 m).
  - It leaves a real trail. Rolling across a snow patch clears it, which is a delightful trick.
- **Stack:** push a smaller ball against a bigger one and press E (lift and set), up to 3 high.
- **Decorate:** E on a snowman opens a small radial.
  - Face: coal (Ines's forge bucket, free from L1; 1c before) or pebbles.
  - Nose: carrot (1c at Gus's), pinecone or stick.
  - Arms: sticks from brush piles.
  - Hat and scarf: any hat or scarf you own.
  - Buttons: pinecones or pebbles.
- **Persistence:** snowmen persist and soften (droop shader) after 5 days, but never melt away. Kids add to yours. NPCs comment.
- **Snow angel:** hold E on open snow to lie down, then flap with LMB. The angel is stamped into the deformation map. Lying down is also the entry to stargazing.

#### Sledding (core, M10)
- **Runs:**
  - School Hill (town): 120 m, gentle.
  - Cabin Hill: 60 m.
  - Ridge Chute: 300 m, after Chains.
- **Physics:** see the sled in Part 2.8. Kids ride alongside on weekends and after school.
- Leaves tracks; flops are part of the fun. The Sled Race (Day 42) uses flag gates on School Hill.

#### The café and sitting (core, M4)
- Order at the counter: cocoa 3c, cider 4c, coffee 2c, tea 2c, cardamom bun 3c (+10 warmth, a gift item).
- Sit, sip (steam), and watch the street through the window.
- **Overheard conversations** play when you're seated (town-memory driven).
- Hal and Gus play checkers at 15:00 on weekdays, and you can watch. Time-lapse works on any seat.

#### Stargazing and constellations (core, M8)
- **Conditions:** a clear night with cloud cover under 20%.
- **Light pollution** limits faint stars: in town you see magnitude ≤ 3.0 stars, at the cabin ≤ 4.0, at the lookout ≤ 5.0. With the telescope you see everything.
- **Enter:** lie in the snow, sit on the porch swing, sit at the lookout bench, or use the telescope.
- **Sky:**
  - A procedural star field of about 3,000 stars with magnitudes and twinkle.
  - A Milky Way band.
  - 2 "wanderers" (planets).
  - Meteors (6 per hour; 60 per hour on Meteor Night, Day 38).
  - Aurora ribbons.
  - The sky turns once per game day, so different constellations are up at different hours.
- **Constellations:** 12 invented ones, 4–9 stars each: The Woodcutter, The Kettle, The Wren, The Sled, The Old Oak, The Lantern, The Pike, The Sleeping Bear, The Skater, The Red Barn, The Twin Mittens, The Hearth. **3 hidden faint ones** need the telescope: The Owl, The Snowflake, The Two Old Friends.
- **Tracing:**
  - Undiscovered stars twinkle slightly more.
  - Look from star to star. Each edge draws a faint chalk line and plays one note of that constellation's **4–6 note motif**.
  - When all edges are traced, hand-drawn line art fades in, the myth is written into the Notebook, and the motif joins the night-music vocabulary (Part 6.4).
- **Aurora:** sky curtains shaded by animated noise ribbons (teal, green, a touch of magenta), a faint coloured ambient tint on the snow, and the "Aurora" music variant.

#### Sauna and cold plunge (core, M7)
- Sit on the bench (E): +120 warmth per hour.
- LMB ladles water onto the stones: a big hiss and a burst of steam. Exiting grants **Glow**.
- The plunge hole is outside: E to jump in (splash, a comic "hhhhHHH" breath), then out, for **Invigorated**. Margo cheers the first time.

#### Porch swing, benches and time-lapse (core, M1 bench; swing M10)
Sitting is a first-class activity. See Part 2.1 for time-lapse. The porch swing creaks gently in rhythm.

#### Hall piano (core-small, M9)
- Sit at the Meeting Hall upright.
- Keys 1–8 (or the gamepad face buttons plus D-pad) play the current key's scale on the felt piano. A soft generative pad harmonizes.
- Elin's arc asks you to play the first phrase of the Wrenhollow Lullaby from a hand-drawn score.

#### Whittling (stretch, M10)
- Needs Hal's knife (Hal L2) and offcuts (1 per 10 rounds split, collected automatically into an offcut basket).
- At the fireside chair, choose a pattern: bird, bear, fish, star, tree, wren.
- Hold LMB and trace a guide path with gentle mouse motion. Shavings curl off as a clipping-plane reveal uncovers the figure.
- Results are gifts, decor, or sold at the inn's gift shelf for 5–12c.

#### Skating (stretch, M10)
- Nadia sells skates (60c). The rink is cleared at the lake shore.
- Glide physics: low friction, LMB rhythm for strides, hold to spin. Kids and Wendell skate on Sundays.

#### Photo mode (core-small, M11)
- P freezes time. A free camera stays within 30 m of the player (with collision).
- Controls: FOV and roll, filters (Warm, Frost, Postcard, Night), depth-of-field focus, vignette, hide the player.
- Capture downloads a PNG. The last 20 captures are kept as thumbnails in IndexedDB as "Postcards", which can be pinned to the cabin corkboard.

#### Cabin decorating (core, M10)
- **Arrange mode** (inside the cabin, or Notebook → Home):
  - Roof cutaway with a 45° diorama camera.
  - Move items with the mouse: 0.25 m grid snap (toggle for free placement), rotate in 15° steps.
  - Surface snapping to floor, wall, tabletop, shelf and windowsill, with footprint collision checks.
- An **exterior mode** covers the porch and yard.
- **Catalog (~45 items):**
  - Rugs (4) and quilts (3).
  - Armchair, rocking chair, bookshelf, side tables.
  - Lamps (3, emissive with a light pool).
  - Potted spruce, amaryllis, paperwhites.
  - Prints (4).
  - Gramophone: plays music-box renditions of any music piece you've heard, so it works as a jukebox.
  - Cabin radio.
  - Corkboard, wall clock, candles, knitted throws.
  - Arc rewards: Hal's carved wren, Mara's recipe card, Ines's candle holder, Rusty's hood-ornament wren, Bea's framed map, Wendell's playbill, Nadia's sweater (worn), Elin's music box, Gus's bird mobile, Margo's ship-in-a-bottle, Otto's syrup shelf, Freya's telescope, Felix's pressed-leaf frame, Pip's drawing.
  - Trophies: Fair ribbon, Derby trophy, Sled Race medal.
  - Mounted record fish (auto-generated model and plaque).
  - The town photo (finale).
  - Exterior: string lights, door wreath, fire pit, wind chime, porch swing, ice lanterns, bird feeders, bench, snow-shovel rack, flag.
- **Cozy score:** the sum of item cozy points. At ≥ 60 you wake with **Hearth Glow** (+5% move and work for 2 game hours), and Hal and visitors comment. There is no other effect and no pressure.

### 2.11 Save/load, settings, menus, onboarding
**Saving**
- **Autosave triggers:**
  - 06:00 rollover.
  - After sleep.
  - After a purchase or completed order (debounced 30 s).
  - Every 5 real minutes of play.
  - `visibilitychange → hidden` and `pagehide` (best effort).
- **Slots:** two rotating autosave slots (A/B), so a bad write never destroys the last good save, plus **3 manual slots**. The player can save from the pause menu anywhere.
- **Write safety:**
  1. Serialize.
  2. Gzip (`CompressionStream`).
  3. Write to IndexedDB.
  4. Read back, decompress and parse.
  5. Verify the CRC32.
  6. Only then mark the slot valid.
- **Slot card:** thumbnail (a 320×180 canvas grab), day, time, location, coins, play time.
- **Export/Import:** `.hearthwood` files (gzipped JSON) from the Load menu.
- **Versioning:** `saveVersion` integer and a `migrations[n]` chain. Every released version gets a **fixture save** tested in CI.
- **Background tabs:** when the tab is hidden, the simulation pauses. Music and ambience keep playing at −6 dB if "Background audio" is on (default). It resumes seamlessly.

**Settings** (global, `localStorage`, applied live)

| Group | Settings |
|---|---|
| Graphics | Preset (Low/Medium/High/Ultra/Custom); Render scale (Auto dynamic, default, targeting 60 fps, or fixed 50–100%); Shadows (Off/Low/Med/High); Ambient occlusion; Anti-aliasing (SMAA / MSAA 4×); Bloom; Draw distance; Snow density; Forest density; FPS cap (30/60/uncapped); FOV; Brightness; Film grain; Frost overlay strength |
| Audio | Master, Music, Ambience, SFX, Voices, UI; Music frequency (Often/Sometimes/Rarely/Off); Background audio; Mono; Spatial (HRTF/Stereo); Night mode (gentle compression for quiet listening) |
| Controls | Full rebinding for keyboard/mouse and gamepad; mouse sensitivity; invert Y; camera recenter; hold vs toggle for jog and for all hold actions; hold duration; stick dead zones; vibration |
| Gameplay | Day length; Time passes while talking; Prompts (Adaptive/Always/Minimal); HUD (Standard/Minimal/Hidden); Clock; Hints on/off; Relaxed timing (auto sweet spot, auto-align); Aim-assist strength; Auto-saw and auto-jig |
| Accessibility | Text size 80–150%; UI scale; Readable font (Atkinson Hyperlegible); High-contrast prompts; Sound captions (Off/Important/All); Reduce motion (shake, sway amplitude, screen overlays); Photosensitivity (slows aurora shimmer and disables sparkle flicker); Colour-independent cues (always on: every state has icon + text) |

**Menus and flow**
- **Boot splash:** "Click or press any key". This is needed to unlock the AudioContext. The logo draws itself stroke by stroke with a soft chime while the Sound Foundry warms up.
- **Title screen:**
  - A live 3D scene: your cabin at your save's time and weather, or canonical dusk snowfall for a new player, with a slow camera drift.
  - Logo; Continue / New Game / Load / Settings / Credits. The main theme plays.
  - **Continue flies the camera from the title shot to the player without a cut.**
- **New Game:**
  - Name.
  - Pronouns (they/she/he).
  - Look: 6 body presets, 8 skin tones, 8 hair styles × 8 colours, 6 coat colours.
  - Day length.
  - "Skip Hal's walkthrough" (for returning players).
- **Pause:** Resume / Notebook / Save / Load / Settings / Photo / Title. The last frame blurs, a paper panel slides in, and music low-passes to 2 kHz.
- **Notebook** (leather-bound, paper pages, tabs):
  - Today: suggestions, forecast, reminders.
  - Orders.
  - Map.
  - Folks.
  - Woodshed.
  - Ledger.
  - Collections: Birds, Fish, Stars, Postcards, Snowmen.
  - Home.
- **Map:** generated from world data as wobbly ink lines with watercolour washes.
  - Pins for orders, shops (with hours and open/closed state), and the likely whereabouts of L1+ friends.
  - Locked areas are pencil outlines labelled "Snowed in".

**Onboarding without tutorials**
1. **Hal's walkthrough** (Day 1 intro, about 8 minutes, skippable) teaches felling, bucking, splitting, stacking, the stove and the lantern by *doing*, with at most one line per step.
2. **Verb prompts** show extended text for the first 3 uses ("Hold LMB, release at the glint"). After that they're a single word, and after 5 uses they fade out entirely in Adaptive mode.
3. **Hal's Notes (adaptive hints):**
   - The system watches for stuck signals:
     - No order, sale or purchase in 8 real minutes.
     - 3 glances in a row.
     - Truck stuck twice.
     - Warmth < 20 twice in a day.
     - An affordable key upgrade unbought for 20 minutes.
   - It then offers one hint through the most natural channel: a Hal letter, an NPC bark, or the Notebook's Today page.
   - Each hint fires at most twice, and hints can be turned off.
4. **The Notebook Today page** keeps a soft to-do list: "Mara's birch is ready", "Pine lot is seasoned", "Snow tonight — shovel jobs likely tomorrow".
5. **No modal pop-ups** after the intro. Nothing pauses the game to teach.
