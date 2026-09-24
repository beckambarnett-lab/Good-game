## Part 10 — Risks and Scope Cuts

### 10.1 Risk register

| # | Risk | Likelihood / impact | Early warning | Mitigation | Fallback that keeps the pillars |
|---|---|---|---|---|---|
| R1 | **AI can't hear or feel the game** | High / High | Quality judged only by metrics | User playtests every milestone, Sound Board, benchmark, F8 capture, spectrograms, shots | Must-fixes block progress; lean on user feedback loops |
| R2 | Characters and animation look stiff | Med / High | VS shots and user feedback | Blender auto-weights, spring bones, IK, pose-lab reviews, stylize further | Rounder "mitten-and-noodle" style, rigid segmented parts, fewer clips shared across NPCs |
| R3 | Generative music sounds aimless | Med / High | Listening session notes: "random", "noodly" | Composed-first: authored motifs and progressions, strict voice leading, dense rests | Fewer, more fully composed arrangements with light variation (still no audible loops thanks to rests and forms) |
| R4 | Synthesized SFX unconvincing (footsteps, engine, animals) | Med / High | Sound Board notes | Iterate recipes against acoustic references; layer more; refine the granular crunch | **Only allowed exception:** CC0-licensed recordings for specific failing SFX, logged with licenses in `docs/decisions/`. Music always stays generated |
| R5 | Snow deformation too costly or complex | Med / Med | Perf probe, shots | Lower RT resolution, fewer stamps, near field only | Decal footprints (projected quads) + normal-only shading. Patches (gameplay) unchanged |
| R6 | Truck handling feels bad | Med / Med | Playtest #2 | Tune the arcade model, add assists (auto-straighten, speed limiter) | Road-rail driving: spline-following with lane offset and speed, off-road only on driveways and plowable areas |
| R7 | Cutaway interiors glitchy | Low-Med / Med | Clipping, sorting bugs | Tag discipline, per-room camera poses | Fade-teleport into the same interior with a fixed camera |
| R8 | iGPU performance | Med / High | Benchmark < 60 | Budgets from M0, dynamic resolution, batching, culling, presets | Reduce forest density, shadow distance and particles; earlier forest cards; AO off; "30 fps smooth" option |
| R9 | Writing volume (2,800 lines) | High / Med | Milestones slipping on dialogue | Templates, town-memory reactive lines multiply content, write alongside systems | Minimum 1,800 lines: smaller chat pools for secondary characters; 4-beat arcs for Wendell, Nadia, Felix and Bea |
| R10 | Overall scope | High / High | Session estimates exceeded by > 30% | Strict milestone gates, cut order below | Follow 10.2 |
| R11 | NPC stuck or pathing bugs | Med / Med | Soak lateness reports | `schedule(t)` re-placement, teleport-when-unseen, corridor widths | Simplify routes; fewer simultaneous walkers |
| R12 | Economy imbalance | Med / Med | Econ sim, playtest | Tunables in data; sim gates | Adjust costs and demand without code changes |
| R13 | Save corruption | Low / High | Checksum failures | A/B autosave, verify-after-write, export | Recover from the other slot; import a backup |
| R14 | Blender pipeline unavailable later | Low / Med | `uv` or bpy install fails | Outputs committed; apt `blender` 4.0 is reachable as a fallback | Author the missing asset with the TS Joinery character kit |
| R15 | Browser differences (Safari/Firefox) | Med / Low-Med | User reports | Feature detection, conservative WebGL2 usage | Document supported browsers; Safari best effort |

### 10.2 Cut order (first to cut → last)
1. Skating, whittling (stretch items).
2. The train set piece. Replace it with a whistle from off-screen and crates appearing at the Halt; Bea's Dot arrives by road.
3. Truck cab view and Cruise autopilot.
4. Photo-mode extras (filters, DOF). Keep basic capture.
5. Sled Race snowball "war" and sculpture stamps. Keep snowmen and the race.
6. Year 2 vignettes. Keep epilogue pools and festival repeats.
7. Ridge Chute run and a separate Meteor Night. Freya L4 moves to the farm fields.
8. Hidden constellations and telescope reveals. The telescope becomes decor.
9. Four arcs trimmed to 4 beats (Wendell, Nadia, Felix, Bea).
10. Secondary interiors (school, ranger station, farm kitchen, sugar shack) become exterior scenes.
11. The Ridge shrinks to a small viewpoint area (lookout + oak stand), keeping the chains gate and aurora.
12. Applewood (keep pine, birch and oak; Mara's L2 uses birch-smoked fish instead).

**Never cut** (these *are* the pillars):
- The tactile core: felling, bucking, splitting, stacking, shoveling, truck, plow.
- Warmth.
- Day/night and weather.
- Generative music and ambience quality.
- Save/load.
- Accessibility basics.
- At least **10 living characters with arcs**.
- **Lantern Night.**
