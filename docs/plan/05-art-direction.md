## Part 5 — Art Direction

### 5.1 Style pillars
1. **Chunky, readable low-poly.** Big simple forms, visible facets, slightly exaggerated proportions (hats and mittens oversized, trees plump). Every object reads at thumbnail size.
2. **Warm against cold.** The world is blue-white snow and cool shadow. Life is amber: windows, lanterns, fires, barn red, knitwear. The eye always finds the warm thing.
3. **Soft, not sterile.** Flat-shaded faces with soft gradient lighting, wrap lighting on snow, gentle fog layering depth, restrained bloom on lights, a whisper of film grain.
4. **Handmade.** Small random jitter on vertices and placements. Nothing perfectly straight except what people built with care. The UI looks inked on paper.
5. **Motion is life.** Everything subtly moves: trees sway with the shared wind signal, smoke bends, snow falls, scarves flutter, NPCs breathe, windows flicker with firelight.

In words, the target sits between A Short Hike's warmth, Alba's clean low-poly brightness, and a children's picture-book winter. There are no photoreal textures anywhere.

### 5.2 Palette (design tokens in `src/view/render/palette.ts`, sRGB hex, converted to linear)

| Group | Tokens |
|---|---|
| Snow | lit `#F4F7FB` · shadow `#B9CBE3` · deep shadow `#8FA5C8` · packed `#DCE3EC` · sparkle `#FFFFFF` |
| Ice | `#A9CFE0` clear · `#D7E8EF` frosted · `#5E8FA8` deep · cracks `#EAF6FA` |
| Conifer | `#2F5D50` · `#3E7361` · `#27493F` (shadowed tiers) |
| Birch | bark `#EDE8DC` · marks `#3B3631` |
| Oak | bark `#5B4636` · dry leaves `#8A5A3A` |
| Wood (cut) | green end `#E9D9A6` · seasoned `#D8A96E` · rings `#C98E55` · aged `#B9B3A8` |
| Buildings | log `#7A5236`/`#8E6443` · barn red `#B5322E` · mustard `#D9A441` · teal `#3F7F86` · cream `#EFE3C8` · sage `#8AA38B` · brick `#9C4A3A` · navy `#34466B` · plum roof `#5E4A55` · slate roof `#4F5D6E` · stone `#8C8A86` |
| Warm lights | window `#FFB65C` · lamp `#FFCF8A` · fire `#FF8A3D` · ember `#E0552A` |
| Night | sky zenith `#0B1330` · horizon `#22335C` · stars `#FFF7E0` · moonlight `#9DB4E8` |
| Aurora | `#6BF2B8` · `#4FD6E0` · `#C86BD8` (sparingly) |
| Skin tones (8) | `#F6DCC4` `#F2D3B5` `#E6BC98` `#E0B48E` `#C68B5E` `#A8704A` `#8D5A3B` `#5C3A28` |
| UI | paper `#F3EBDD` · ink `#3A3230` · pencil `#8A8078` · red `#B5322E` · green `#3E7361` · amber `#E7A13D` · lake `#4F7FA8` |

### 5.3 Lighting and time-of-day key frames
The **Environment** system blends these key frames by time, then applies weather modifiers. Values are starting points for look-dev in M1.

| Key | Sun/Moon elevation | Key light | Hemi sky / ground | Sky zenith → horizon | Fog colour | Grade |
|---|---|---|---|---|---|---|
| 00:00 Night | Moon 40° | `#9DB4E8` × 0.35 × phase | `#1B2A4A` / `#2E3E63` | `#0B1330` → `#22335C` | `#1E2B4A` | temp −0.15, sat 0.85, highlights warm `#FFD9A0` |
| 06:30 Pre-dawn | Sun −6° | Moon fading | `#3A4270` / `#5B5F86` | `#2C3868` → `#C98FA3` | `#6E6F95` | temp −0.05 |
| 07:30 Sunrise | 2° | `#FF9E6B` × 1.2 | `#8D9CC8` / `#C7B3C6` | `#5D78B8` → `#F8C49A` | `#E6B7A8` | temp +0.15, sat 1.05 (pink snow) |
| 09:00 Morning | 12° | `#FFE3C2` × 1.8 | `#A9C3E6` / `#DDE6F2` | `#6F9AD6` → `#D5E4F3` | `#D6E1EE` | neutral |
| 12:00 Noon | 22° | `#FFF4E6` × 2.2 | `#B7CFEE` / `#E8EFF7` | `#6A97D9` → `#DCE8F5` | `#DCE6F1` | contrast +0.05 |
| 15:00 Afternoon | 12° | `#FFD8A8` × 1.9 | `#AFC2E2` / `#E3E3EA` | `#7094CF` → `#EAD7C4` | `#E2DCD8` | temp +0.05 |
| 16:15 Golden | 4° | `#FFB070` × 1.5 | `#8E9BC9` / `#E4C6B0` | `#5A6FAE` → `#F4B27A` | `#E9B89A` | temp +0.2; lamps on |
| 16:45 Sunset | −1° | off | `#5E6AA0` / `#B08FA2` | `#3E4A8C` → `#E98E6B` / `#B8708A` | `#8E7897` | sat 1.1, bloom ↑ |
| 17:30 Blue hour | −8° | off | `#3B4C84` / `#6F7FB0` | `#25306A` → `#5C6AA3` | `#4A5688` | the **coziest frame**: windows at full strength |

**Weather modifiers**
- **Overcast:** sky collapses to `#AEB9C8`, sun ×0.35, shadow opacity 0.4, saturation −10%.
- **Heavy Snow:** fog `#C9D3DE`, density ×2.5, sky `#C4CEDA`.
- **Blizzard:** fog `#D8E0EA`, about 30 m visibility, sun ×0.15.
- **Night snowfall:** fog `#3A4868`; lamps get halos (bloom + fog light-scatter sprite).
- **Ice Fog:** low height-fog layer (0–6 m) `#E8EEF4`, with diamond-dust glints toward the sun.
- **Hoarfrost:** tree and fence materials get a white rime layer (snowcap ×2 on all faces, noise-broken).

**Light rig**
- **One directional light** (sun or moon) with shadows (Part 5.10), plus a **HemisphereLight**.
- **Dynamic point lights:** at most **6** pooled PointLights, assigned each frame to the nearest or most important emitters. Priority: player lantern, then fires within 20 m, then lamps. The pool size is constant so shaders never recompile.
- **Fake lights:** everything else is emissive plus a **light-pool decal**, a soft additive circle projected on snow under lamps and windows. This is cheap and gorgeous on snow.
- **Window glass:** emissive `#FFB65C` × occupancy × flicker (fire-lit homes flicker slowly). Curtains add variation.

### 5.4 How assets are made (no paid or copyrighted assets)
**A. Runtime procedural (TypeScript).** Everything dynamic, repeated or large, generated at load with seeded variation and cached in memory:
- Terrain, snow patches and banks, drifts.
- Trees: pine, birch, oak, apple, snags, saplings, stumps.
- Rocks.
- **Buildings (exterior + interior kits)**, fences, lamps, signs (text via CanvasTexture), roads, bridge, rails, dock, huts.
- Wood pieces: rounds, splits, stacks, heap, chips.
- Sky, clouds, mountains backdrop.
- All particles.

Built with **Joinery**, our mesh-builder DSL (Part 7.4):
- Primitives: box with bevel, prism, cylinder, cone, lathe, extrude, icosphere, roof, plank, log.
- Transforms and vertex-colour painting from palette tokens.
- Deterministic jitter.
- Flat normals.
- Merge into a few geometries per object, with tagged groups (cutaway walls, snowable faces, sway weights).

**B. Scripted Blender (bpy 4.5 LTS, headless in the container) → glTF (.glb).** Articulated or organic "hero" assets:
- All characters and the player kit.
- Animals.
- *Marigold* and her upgrade parts, the trailer, the fire engine, the tractor, the plow truck, the wrecker, the ranger pickup, the train.
- Handheld tools: axes, mauls, wedge and sledge, saws, shovels, roof rake, auger, rod, lanterns, thermoses, sled, wheelbarrow.

How the pipeline works:
- Scripts live in `art/blender/`. Shared part generators live in `art/blender/lib/`: heads, noses, hair, hats, coats, mittens, boots, faces.
- Each asset is one script with a seed.
- `npm run assets` runs `uv run --with 'bpy==4.5.*' python art/blender/build.py [asset…]`. Then `gltf-transform` (MIT) applies meshopt compression and quantization.
- Outputs go to `public/assets/`. **Outputs are committed**, so the game build, CI and players never need Blender.
- A **preview harness** renders every asset turntable in *our own Three.js asset viewer* (`/dev/assets`) via Playwright. The previews show the asset under in-game lighting and are what the developer inspects.

**C. Assets drawn in code:** logo, icons and UI ornaments are SVG path data authored in TS with a jitter helper. The paper texture is generated with procedural noise onto canvas.

**D. Fonts:** SIL OFL, self-hosted in `public/fonts/` with license files.
- **Nunito** for UI and dialogue.
- **Caveat** for handwritten notes, labels and the map.
- **Fraunces** for logo and headings.
- **Atkinson Hyperlegible** for the readable-font option.

**Modelling rules (both pipelines)**
- **Flat-shaded, vertex-coloured.** No texture maps except procedural shader patterns: end grain, ice cracks, snow sparkle, paper.
- Bevel hero edges (0.02–0.05 m) so light catches the facets.
- Vertex jitter of 1–3% of feature size on natural objects; 0.5% on built objects.
- Snowable faces: a vertex attribute `snow` (0–1) marks where snow may collect, multiplied by upward normals in the shader.
- Sway weights: a vertex attribute `sway` (0 at the trunk root, 1 at the tips).
- **Triangle budgets:**

| Asset | Triangles |
|---|---|
| Player / named NPC (body + outfit) | 2.5–4k |
| Extras | ≤ 2.5k |
| Dog | ~1.2k |
| Horse | ~2k |
| Bird | 150–300 |
| *Marigold* | ~6k (+0.5–1.5k per upgrade part) |
| Tools | 100–600 |
| Trees | LOD0 300–900 / LOD1 80–200 / LOD2 12–24 |
| Building exterior | 1.5–5k |
| Interior (only drawn when inside) | 2–6k |
| Props | 50–500 |

- **Sockets:** glTF empties named `socket_hand_R`, `socket_hand_L`, `socket_back`, `socket_hip`, `socket_head` (hats), `socket_tailgate`, `socket_plow`, `socket_hitch`.
- **Naming:** `char_hal.glb`, `anim_human.glb` (shared clips), `veh_marigold.glb`, `tool_axe_forester.glb`, `animal_dog_anvil.glb`.

### 5.5 Environment art specs
- **Terrain:**
  - Heightfield generated from authored features (Part 7.5).
  - Snow-white vertex colour with a subtle blue tint in concavities, needle litter under conifers, and a darker "trodden" tint driven by the trail map.
  - Steep slopes (> 40°) get placed low-poly rock outcrops instead of texture.
- **Pine/spruce:**
  - Tapered 6-sided trunk.
  - 5–9 stacked 8–10-sided tier skirts with jagged lower edges.
  - Tiers alternate rotation and have slightly drooping tips.
  - Colour varies per instance within the conifer tokens.
  - Snow sits on tier tops via the `snow` attribute and the global coverage value.
  - Tiny cones.
- **Birch:**
  - White trunk with jittered dark bands.
  - A gentle lean.
  - L-system branching (depth 3) with thin prisms and twig fans; no leaves.
  - Snow ridges along upper branch surfaces.
- **Oak:**
  - Thick buttressed trunk; crooked branching (space-colonization-lite, 3 levels).
  - **Clusters of dry brown leaves** that rustle, since oaks hold leaves in winter.
- **Apple:** short and twisted; a few frozen red apples.
- **Snag:** grey and barkless; marked with a ribbon after Felix L1.
- **Saplings:** in snow, with a stake and a red ribbon.
- **Stumps:** end-grain shader rings plus a snow cap.
- **Forest LOD and density:**
  - LOD0 < 40 m, LOD1 < 120 m, LOD2 < 300 m.
  - Beyond that, **forest cards**: impostors baked at load by rendering LOD1 trees from 8 angles into an atlas (render-to-texture).
  - About 4,000 trees total. Visible per frame ≤ 1,200 (Medium).
- **Buildings kit parameters:**
  - Footprint, floors (1–2), wall type (log, clapboard, board-and-batten, stone base), palette pair, roof (gable, hip, saltbox, shed; pitch; overhang; plum or slate), chimney (position and material).
  - Porch (depth, posts, rails, steps, roof), window layout per wall (6 styles: frames, mullions, sills with snow, shutters, curtains).
  - Door (4 styles; wreath slot), sign (text, board shape, bracket), awnings, flower boxes (snow-filled), sconces.
  - Gutters with **icicles** (procedural length grows by day), bell tower (hall), stovepipes.
  - Every wall face and roof is tagged for the cutaway (`front`, `side`, `back`, `roof`, `interior`).
- **Props list** (all procedural):
  - Split-rail and picket fences, gas-style lampposts, benches, fire barrels, mailboxes (flag), porch woodpiles (instanced splits, count-driven), crates, barrels, the sled-pram.
  - The Lantern Tree, the gazebo, Saturday market stalls, the notice board, the chalkboard.
  - Rail halt shelter, crossing signal (bell + lights), bridge, dock, ice huts, sauna, boathouse, sugar-shack evaporator, hay bales, lookout tower (timber frame), ranger station, signposts, trail markers, viewpoint benches.
  - Ice lanterns, paper lanterns (festival), the weathervane (both states), snow forts, kids' snowmen.
- **Interiors kit:** plank floors, log or plaster walls, rugs, counters, shelves with procedural goods (jars, tins, boxes, yarn), tables and chairs, stoves and fireplaces (visible fire), beds, bookshelves, lamps, pictures, stage, piano, desks, forge, anvil, loom, lift.
- **Sky:**
  - Gradient dome shader: zenith/horizon, sun/moon discs with glow, stars (3k, magnitude-driven twinkle), Milky Way band (noise).
  - Aurora curtains: 3 layered noise ribbons with vertical streaks, animated.
  - Cloud layer: 2D noise, coverage-driven, lit by sun colour.
  - Meteors: short-lived streaks.
- **Mountains backdrop:** 3 rings of low-poly silhouettes with snow caps and aerial perspective (fog-coloured by distance).
- **Lake ice:**
  - Base ice colour with procedural crack networks (Voronoi edges) and snow-dust patches (noise).
  - Wind-polished clear patches show dark depth (a fake parallax "depth" layer).
  - Augured holes show dark water with a subtle ripple and a skim-ice state.

### 5.6 Characters and animation
- **Proportions:** 5.5 heads tall (stylized, chunky).
  - Big hands (mittens), big boots, rounded torsos, simple faces.
  - Adults 1.55–1.95 m (Hal and Otto tallest; Pip 1.1 m).
- **Faces:**
  - Eyes are small glossy black ellipsoids with white catchlights.
  - Brows are thick bars that animate for expressions.
  - Nose shapes from a set of 6.
  - Mouths: 4 geometry shapes (neutral, smile, open, "o") swapped for talking and expressions.
  - Blink by scaling the eyes' Y.
  - Beards and hair are chunky low-poly masses.
- **Skeleton:** one shared humanoid rig for all humans, 22 bones: root, hips, spine, chest, neck, head, clavicle ×2, upper arm ×2, forearm ×2, hand ×2, thigh ×2, shin ×2, foot ×2, toe ×2.
  - Spring bones for scarves, ear flaps, pompoms, braids and apron hems, simulated at runtime.
  - Clothing is separate skinned meshes on the same skeleton, so **player outfit tiers swap at runtime**.
- **Clips** (authored in Blender via pose-keyframe scripts; shared across humans via `anim_human.glb`):
  - **Locomotion:** idle, idle_cold, idle variants (look around, stretch, shake snow off), walk, jog, walk_deep_snow (high knees), carry_armload, carry_round, push_wheelbarrow, pull_sled, hop, land.
  - **Work (phased for input-driven timing):**
    - Chop: windup, strike, recover.
    - Split: raise, hold loop, strike, stuck-lift, slam.
    - Saw: push, pull.
    - Shovel: push loop, throw.
    - Other: roof_rake_pull, gather_armload, stack_place loop, pick_round, place_round, feed_fire, auger_drill.
  - **Fishing:** sit, jig, hook, reel, land.
  - **Life:** drink_thermos, sit_down/idle/stand, lie_down/idle, snow_angel, wave, talk gestures ×3, laugh, shiver, stamp_feet, clap, pet_dog, door_open, flop (sled), snowball_push/lift/throw, sleep.
  - **NPC-specific:** hammer_anvil, wipe_counter, whittle, knit, sweep, npc_shovel, read, write, play_piano, checkers_move, bellows, ladle, measure_tree, pitchfork, sled_ride, telescope.
- **Runtime layers** (Three.js AnimationMixer plus our procedural stack):
  1. Base clip blend: speed-driven blend space for locomotion.
  2. Upper-body action layer (masked).
  3. **2-bone foot IK** to terrain and snow depth (feet sink into fresh snow).
  4. Head and eye look-at with smoothing.
  5. Lean into turns.
  6. Additive breathing.
  7. Cold shiver noise.
  8. Spring bones.
  9. Impact squash (3%).
- **Animation principles:**
  - Anticipation 0.15–0.3 s and follow-through on every action.
  - Overlap on accessories.
  - Exaggeration about 120% of realistic.
  - Hit frames emit events: `impact`, `release`, `footstep_L/R`, `place`.
  - Sound and particles are keyed off these events, never off timers.
- **Player creator** combines body presets (6), skin (8), hair (8 × 8 colours) and coat colour (6).

### 5.7 Animals
- **Dogs:** 3 breeds, meshes and rigs from Blender. Clips: idle, trot, run, sit, lie, sniff, wag, shake, flop in snow, beg.
- **Cats:** 2. Idle, walk, loaf, groom.
- **Horses:** idle, walk, trot, head-toss, snort.
- **Sheep:** idle, graze-in-snow, walk, huddle.
- **Chickens:** peck, hop, flap.
- **Birds:** 10 species on 2 rigs (songbird, owl). Clips: perch idle, hop, peck, flap-fly loop, glide, land.
  - Birds fly along procedural Bézier paths.
  - Flocking (redpolls, buntings) uses a light boids model.
- **Fox, hare, deer:** idle, walk, run, alert. Mostly seen at a distance.

### 5.8 VFX catalogue

| Effect | Implementation | Count / lifetime | Notes |
|---|---|---|---|
| Wood chips | Instanced low-poly chips, species colour | 8–20 per hit, 3 s | Up to 200 persist around the chopping block, gently snow-covered over days: "you've worked here" |
| Bark flakes, sawdust | Sprites | 20–40 per stroke, 1.5 s | Sawdust drifts with wind |
| Snow puff | Soft sprites expanding | 12–30 per impact, 1.2 s | Tree landing uses 150 in a ring |
| Snow chunks | Instanced lumps → powder | 6–14 per throw | Break on landing |
| Branch snow dump | Clumps + powder | Per tier | During felling hits and falls |
| Breath | Sprite puff | 1 per 3–4 s (1 per 2 s when cold) | Tinted by nearby warm lights at night |
| Chimney smoke | Soft sprites | 40 per chimney (10 far LOD) | Bends with shared wind |
| Fire | Layered flame sprites + embers + light flicker | per fire | Crackle-synced ember bursts |
| Sparks | Additive streaks | Forge hammer 15, fire pop 5 | — |
| Steam | Soft sprites | Cocoa, sauna, sugar shack, water hole | — |
| Ice shavings | Sprites + ring mesh growth | Auger | — |
| Splash | Droplets + ring | Fish landing, plunge | — |
| Diamond dust | Glint sprites | Ice fog mornings | Only visible toward the sun |
| Spindrift | Ground wisps | Wind > 30 km/h | — |
| Heart puff | Hand-drawn heart sprites | Petting | — |
| Perfect-streak ring | 8 star sprites | Every 8 clean splits | — |
| Lantern glow | Emissive + sway | Festivals | — |
| Frost overlay | Screen shader | Warmth-driven | — |

Particle textures (soft circle, flake, spark, smoke puff, heart, star) are **generated in code** at load onto canvases.

### 5.9 Materials and shaders
**HearthMaterial.** One shared material family built by patching `MeshLambertMaterial` via `onBeforeCompile`, so all Three.js lights and shadows work. Most objects share it, which keeps state changes and draw calls low. It adds:
- Wrap diffuse (`w = 0.25`, snow `0.4`).
- **Shadow tint:** shadowed areas blend toward the snow-shadow blue, not grey.
- Height gradient: surfaces darken 8% near the ground.
- Rim light from the sky colour at dusk and night.
- **Snowcap chunk.**
- **Wind sway chunk:** vertex shader using the `sway` attribute and the shared gust uniform.
- **Dither fade:** Bayer 4×4 alpha-to-dither for cutaways and camera occluders.
- **Custom fog:** distance + height fog coloured from the sky horizon, so objects melt into the sky colour.
- **Hoarfrost** parameter.

**Other materials**

| Material | Features |
|---|---|
| **SnowMaterial** (terrain + patches) | Deformation displacement and normals, sparkle (view-dependent hashed glints that twinkle as the camera moves, sun-facing, suppressed at night except under lamps), trodden tint, soft wrap lighting |
| **WoodEndGrain** | Procedural rings from the per-instance radial coordinate, radial checks growing with `season`, bark ring, colour by species and season |
| **Ice** | Cracks, depth fake, snow dust |
| **Water hole** | Dark water, ripple |
| **Glass** | Emissive windows, subtle reflection of sky colour |
| **Fire** | Scrolling-noise flame cards |
| **Sky** | Dome shader (5.5) |
| **Aurora** | Part of Sky |

Shader variants are kept to a minimum and **pre-warmed** at load (`renderer.compile` on a hidden scene with every material permutation) so gameplay never hitches.

### 5.10 Post-processing and quality presets
Built with the pmndrs `postprocessing` library. Effects are merged into one EffectPass where possible.

1. RenderPass (MSAA 4× via composer multisampling on Medium+).
2. **N8AO** (High/Ultra; radius 1.5 m, half-res on High).
3. **Bloom:** mipmap blur, luminance threshold 0.85. Intensity 0.5 by day, 1.1 by night.
4. **Tone mapping: Khronos PBR Neutral**, which preserves authored hues. AgX is kept as a look-dev alternative, and the choice is locked by screenshot review in M1.
5. **Grade:** custom effect. White balance, lift/gamma/gain, saturation, contrast, and split toning driven by the time-of-day key frames.
6. **Frost overlay:** custom. Warmth-driven edge crystals with slight refraction.
7. Vignette (0.25) and film grain (0.02, animated; kills sky banding).
8. SMAA (Low only).
9. **Photo mode and dialogue close-ups only:** cheap depth-based blur.

**Presets**

| Setting | Low | Medium (target) | High | Ultra |
|---|---|---|---|---|
| Render scale | 0.75 (auto) | 1.0 (auto ≥ 0.8) | 1.0 | 1.0 (+MSAA) |
| AA | SMAA | MSAA 4× | MSAA 4× | MSAA 4× |
| Shadows | 1024, 40 m, hard-ish PCF | 2048, 60 m, PCF soft | 2 cascades 2048 | 3 cascades 2048 |
| AO | off | off | N8AO half-res | N8AO full |
| Bloom | on (cheap) | on | on | on |
| Snow particles | 4k | 10k | 16k | 20k |
| Forest | cards from 150 m | LOD2 to 300 m | +20% density | +40% density |
| Near deformation RT | 1024² | 2048² | 2048² | 2048² |
| Point-light pool | 3 | 6 | 6 | 8 |
| NPC animation LOD distances | ×0.7 | ×1 | ×1.3 | ×1.6 |

**Dynamic resolution** (Auto): if the GPU frame time (timer query, or the rAF delta as fallback) averages above 15.5 ms for 1 s, render scale drops 0.05 (floor 0.7 Low, 0.8 Medium). It recovers after 3 s under 13 ms. Changes are smoothed and invisible.

### 5.11 Camera direction and composition
- **Default framing:** the character sits slightly below centre, with the horizon in the upper third so the sky gets room. The warm point of interest (a lit window, a fire) is usually in frame. Level designers place such points along routes.
- **Cuts** happen only in dialogue scenes and festival set pieces. Everything else eases.
- **Festival set pieces** use authored camera splines: parade, bonfire lighting, first aurora, Sugaring Off, Lantern Night finale. They always end back at the gameplay camera with a 1 s blend.

### 5.12 UI art direction
- **Materials:**
  - Paper `#F3EBDD` with procedural fibre noise, deckled edges (SVG mask) and soft shadows.
  - Ink `#3A3230` lines with wobble. Our jitter helper generates SVG paths with 1.5–2.5 px strokes.
  - Watercolour fills: blotchy SVG turbulence filters, cached.
- **Components:**

| Component | Design |
|---|---|
| Interaction prompt | A small paper **luggage tag** on a string, swaying slightly above the target, e.g. `[E] Stack · Birch` |
| Clock | Top-right: a brass pocket-watch face with a day/night arc and the day name. Hideable |
| Warmth | Bottom-left: a knitted mitten icon that fills; cold blue → warm amber. Appears only when relevant |
| Coins | A small coin stack pops "+14" and drifts upward, then fades |
| Toasts | Paper notes slide in from the right (letters, orders, friendship ✦) |
| Notebook | Leather cover (stitched), paper pages, coloured paper tab flags, CSS 3D page turns (0.35 s) with paper rustle |
| Dialogue | Paper bubble with inked outline and tail; name on a ribbon; text in Nunito 20 px (scalable) |
| Map | Wobbly ink roads and buildings, watercolour washes by area, pencil outlines for locked areas, hand-lettered labels (Caveat) |
| Shop catalog | Paper catalogue page with item **thumbnails rendered at runtime** from the 3D models (lit, 3/4 view), price tag, description, try-on for clothing |
| Input glyphs | Keyboard keys as little paper keys. Xbox and PlayStation glyphs drawn in the same ink style |

- **Motion:** gentle springs (5% overshoot), 150–350 ms. Resting paper elements tilt ±1.5°. **Nothing flashes.**
- **UI sounds:** paper rustle, pencil tick, soft wood block, tiny bell (Part 6).
- **Logo:** "Hearthwood" in Fraunces Black (soft, "wonky" axis) with an inked ornament: a wren on a split log with a curl of chimney smoke. It animates stroke by stroke on the boot splash.

### 5.13 Art QA shot list (deterministic screenshots, `tools/shots.ts`)
Each shot has a fixed seed, position, target, time and weather. Captured at 1280×720 in CI and reviewed as a contact sheet each milestone.

| # | Shot |
|---|---|
| S01 | Cabin porch → town lights, 21:00, Clear |
| S02 | Woodlot, 12:00, Light Snow |
| S03 | Chopping block split view, 09:00, Clear |
| S04 | Main Street from the Cabin Road bend, 16:30 |
| S05 | Café interior, 18:00 |
| S06 | Lake at dawn, Ice Fog |
| S07 | Farm and barn, 16:15, Fair |
| S08 | Lookout, 23:00, aurora |
| S09 | Cabin Road, 14:00, Blizzard |
| S10 | Truck plowing, 20:00, Heavy Snow with fog lights |
| S11 | Woodshed L4 full, 10:00 |
| S12 | Lantern Night square, 20:05 |
| S13 | Forge interior, 11:00 |
| S14 | Hoarfrost morning birches, 08:30 |
| S15 | Sauna steam, 19:00 |
| S16 | Sugar shack, 19:30 |
| S17 | Character lineup (all 14) on a neutral stage |
| S18 | Player creator presets lineup |
| S19 | Tool rack lineup |
| S20 | *Marigold* with every upgrade |
