## Part 9 — Polish Checklist
Mirrored into `docs/progress.md` as checkboxes at M1 (for VS scope) and M11 (full).

### 9.1 Juice and feedback — per action (all must be present)

| Action | Anticipation | Impact | Follow-through | Particles | Sound layers | Camera / haptics | World response |
|---|---|---|---|---|---|---|---|
| Axe chop | Wind-up squash 0.25 s | 50 ms hit-stop | Recoil, blade wiggle | Chips, bark flakes, branch snow | Whoosh + species impact + (ring) + snow sift | Kick 0.1, rumble 0.2 | Notch deepens, tree shivers |
| Tree fall | Creak build, crack | Landing thud | Rebound, settle, slide | Powder ring (150), branch snow | Crack → whoosh → thud + whump → branch crackle → **valley echo** | Trauma 0.5, rumble 0.35 | Birds flush, trunk imprint, music rest |
| Saw stroke | Pull-back | Bite | — | Sawdust spurts | Rasp (pitch ↑ with depth) | Micro-sway | Kerf opens; round drops with a thunk and roll |
| Split (clean) | Raise + **glint** | 60 ms hit-stop, pop | Halves tumble, settle | Chips + end-grain dust | Crack + pop + clatter + **in-key chime** | Kick 0.15, rumble 0.25 | Heap grows; streak song |
| Split (stuck → slam) | Lift with round | Slam | Split | Chips | Bite + creak → slam + crack | Kick 0.2 | Comic beat |
| Stack piece | Arm reach | Clack | Tiny settle | — | Clack pitched to the scale | — | Stack grows exactly; bay-full flourish |
| Shovel push / throw | Lean-in | Scrape start | Throw arc | Chunks → powder | Scrape (surface) + load + whoosh + whump | Nudge 0.05 | Clean strip, bank grows |
| Patch complete | — | Chime (in key) | Owner waves / door opens | Sparkle along the edge | Chime + distant "thank you!" blip | — | Payment, gossip event |
| Roof avalanche | Creak | Slide | Powder cloud | Big powder | *Fwumph* + slide hiss | Trauma 0.25 | Roof clear, ground mound |
| Plow | Blade drop hiss | Scrape | Windrow | Spray | Steel scrape + snow rush + engine load | Rumble by depth | Road clears, windrow |
| *Marigold* starts | Starter whirr | Cough-catch | Idle settles | Exhaust puff | Whirr → cough → rumble → radio | Light shake | Headlights on, radio |
| Deliver | Carry trips | Pile grows | Customer appears | — | Wood clonks, door, voice blips | — | Porch pile visible; payment scene or envelope |
| Purchase | Catalogue page flip | Register bell (in key) | Item handed over | Paper confetti (tiny) | Bell + coin jingle | — | Item appears in hands or world |
| Friendship ✦ | — | Motif + bell | ✦ floats up | Hand-drawn sparkles | Character motif | — | Notebook candle lights |
| Stove feed | Door creak | Log thunk | Flare-up | Sparks | Thunk + roar swell | — | Room light warms |
| Drink | Unscrew | Sip | "Ahh" breath | Steam | Pour, sip, breath | — | Warmth rises, frost recedes |
| Fish bite / land | Rod-tip twitch | Hook set | Flop on the ice | Splash | Tick → reel → splash → flop | Rumble pulses | Record card |
| Snowball roll | — | — | Grows | Snow crumbs | Roll crunch (pitch ↓ as it grows) | — | Trail, patch cleared |
| Enter building | Door swing | Walls dither away | Camera settles | — | Door (+bell) + mixer snapshot | Ease 0.6 s | Interior light and room tone |
| Trace constellation edge | Star brightens | Chalk line | Twinkle | Star glint | One motif note | — | Constellation art on completion |

### 9.2 Transitions
- [ ] Splash → title: the logo draws itself, the scene fades up, music enters on a downbeat.
- [ ] Title → game: a continuous camera flight to the player, with no cut and no loading screen after first load.
- [ ] Interior enter/exit (cutaway), dialogue open/close (camera two-shot ease), Notebook open (paper slide) and page turns, shop open/close.
- [ ] Sleep: fade, day card, morning fade-in with birdsong. Time-skip card at the end of Winter.
- [ ] Weather transitions over 30 game minutes. Zone music crossfades on bar lines. Snapshot blends in the mixer.
- [ ] Festival starts: an authored camera spline, then back to gameplay with a 1 s blend.
- [ ] Pause: blur + low-pass. Resume restores exactly.
- [ ] No pops: LOD transitions dither-fade, lights fade in and out, particles fade, audio has ≥ 5 ms ramps on every start and stop.

### 9.3 UI and UX
- [ ] Consistent paper/ink style. Every screen reachable and escapable with both input devices. Esc/B always backs out.
- [ ] Gamepad menu focus is always visible. Input glyphs switch within 0.2 s of the last-used device.
- [ ] Readable at 1280×720 and at 4K. UI scale 80–150% has no clipping. Dialogue bubbles never go off-screen (clamped with the tail re-aimed).
- [ ] Notifications queue gently (max 3 visible), never block input, and are never modal after the intro.
- [ ] Destructive actions (overwrite save, sell a whole lot) ask to confirm. Numbers are formatted consistently ("12c", "3.4 bundles").
- [ ] Autosave indicator: a tiny wren flapping in the corner for 1 s.
- [ ] Errors are friendly: storage full, audio blocked ("Click to enable sound"), WebGL context lost (auto-restore and reload the scene).
- [ ] Shop catalogue shows owned and next-tier items, prerequisites in plain words, try-on.

### 9.4 Onboarding without heavy tutorials
- [ ] Hal's walkthrough ≤ 8 minutes, skippable, teaching by doing.
- [ ] Prompts extended for the first 3 uses, fading after 5 (Adaptive).
- [ ] Hal's Notes hint system tuned. Each hint fires ≤ 2 times and never nags.
- [ ] The Notebook "Today" page always suggests at least one good next step.
- [ ] Every new mechanic is first met in a safe, obvious context: the first fish with Margo, the first plow on your own driveway.
- [ ] Playtest: a fresh player reaches the truck repair in ≤ 60 minutes without outside help.

### 9.5 Accessibility (following the Game Accessibility Guidelines, basic + intermediate)
- [ ] Full remapping (KBM and gamepad); hold ↔ toggle for every hold; adjustable hold durations.
- [ ] **No required timing:** relaxed mode auto-succeeds the sweet spot and alignment; auto-saw, auto-jig and auto-split; generous hook windows.
- [ ] Text size, UI scale, readable font, high-contrast prompts. Subtitles are inherent (all speech is text); captions for important sounds (bites, creaks, knocks, the train).
- [ ] Colour-independent information (icons + text for wood type, seasoning, warmth, prices ▲▼). Checked with colour-blindness simulation shots.
- [ ] Reduce motion (shake, sway amplitude, screen overlays, head bob). Photosensitivity: no flashing; aurora shimmer slowed.
- [ ] Mono audio, per-bus volumes, night mode. Visual cue for every gameplay-relevant sound.
- [ ] Pause anywhere, save anywhere, no fail states, no time pressure.
- [ ] Mouse sensitivity, invert Y, FOV, stick dead zones, vibration off.

### 9.6 Audio consistency
- [ ] Loudness per family within ±2 LU of target. The master never exceeds the ceiling (QA harness).
- [ ] Every one-shot has ≥ 4 variants plus randomization. No variant repeats back to back.
- [ ] No clicks at starts, ends or loop seams. All parameter changes ramped.
- [ ] Spatial correctness: panning matches the screen, occlusion in and out of buildings, distance air absorption, snow hush.
- [ ] Mix snapshots and ducking behave as specified. Speech and stingers are always intelligible over the ambience.
- [ ] Music soak: repetition rules pass, rests present, transitions on bar lines, no two pieces clashing.
- [ ] Pitched gameplay sounds match `currentKey`, with no dissonant clashes.
- [ ] A user Sound Board listening pass is completed and all notes resolved.

### 9.7 Visual consistency
- [ ] Palette adherence (tokens only). Silhouettes readable at 50 m.
- [ ] Night readability (moonlight on snow, lamp pools). Nothing crushed to black.
- [ ] No shadow acne or peter-panning, no z-fighting (decals and patches offset), no LOD popping, no seams in terrain chunks or skirts, no visible instancing repetition (per-instance variation).
- [ ] Bloom never blows out the UI or the snow. Fog colour matches the sky at every time key.
- [ ] Shot contact sheet reviewed each milestone. Baselines updated only on intentional change.

### 9.8 Performance pass
- [ ] Worst-case scenes within budget: Lantern Night crowd, blizzard in town at night, the truck at full speed on Main Street, ridge vista.
- [ ] No per-frame allocations (allocation sampling). No heap growth over a 2-hour soak. No GPU resource leaks (owner registry audit).
- [ ] Shader pre-warm complete (no compile hitches). Dynamic resolution recovers smoothly.
- [ ] Load times and bundle sizes within budget. Low preset tested on the user's weakest machine if available.

### 9.9 Bugs and stability
- [ ] Soak (30 in-game days headless and 4 h in-browser) with zero exceptions.
- [ ] **Edge cases:**
  - Stacking into a full shed.
  - Truck wedged in a drift.
  - NPC blocked in a doorway.
  - Saving during a scene.
  - Tab hidden mid-dialogue.
  - Gamepad disconnect.
  - Pointer-lock lost.
  - Window resize and DPR change.
  - AudioContext suspended (resume on focus).
  - Storage quota exceeded.
  - Corrupted save (falls back to the other autosave).
  - Time skip across a festival or Year rollover.
  - Order for a customer whose arc changed.
  - Buying an item twice.
  - Dropping armloads inside interiors.
  - Snowman on a road being plowed.
- [ ] Deterministic replays for bug reports (seed + input log in the dev build).

### 9.10 Save/load
- [ ] Every system round-trips byte-stable (tests). Migrations tested against fixture saves of every released version.
- [ ] Autosave A/B rotation. Verify-after-write. Export/import. Slot thumbnails.
- [ ] Loading restores the camera, music context and weather without a pop.

### 9.11 Content QA
- [ ] Spellcheck script (custom dictionary of names and places) over all strings.
- [ ] Each character's voice is consistent (review against their bible entry). No line repeats within 5 days (test).
- [ ] Pronoun and name substitution tests. Bubble line length ≤ 140 chars per page.
- [ ] Every arc beat reachable (story soak). Missed-festival fallbacks verified.
- [ ] Every item has an icon, thumbnail, description and price where applicable.

### 9.12 Release checks
- [ ] Credits (tools, OFL fonts with license texts).
- [ ] Version shown on the title screen.
- [ ] Build reproducible.
- [ ] Pages deploy verified in Chrome and Firefox (Safari best effort).
- [ ] README "How to play".
