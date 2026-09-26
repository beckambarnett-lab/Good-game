# 0001 — Valley hydrology and road profiles

**Date:** 2026-09-24 · **Status:** accepted · **Code:** `src/data/world/terrain.ts`, `src/sim/world/TerrainGen.ts`

## Context
Plan Part 3.1 puts Stillmere's ice at Y 0 and Tallow Creek at Y −3, with the creek draining into the lake. Taken literally, the water climbs 3 m at the mouth, and the frozen creek (walkable from Day 6) would visibly rise into the lake.

The same section also fixes several other things the terrain must honour:
- Cabin Road: 110 m, climbing 10 m.
- Farm Lane's 14° rise: a 25 m ramp.
- A rail line with a level crossing, a trestle and a tunnel at each edge.
- Houses along School Lane and Cabin Road.

The first terrain pass used straight polylines. Their corners, together with 1 m profile quantization, pushed the Cabin Road over its grade. Its flat zones also read as geometric rectangles and circles on the relief map.

## Decision
1. **Water runs downhill.**
   - Stillmere's ice sits at **Y −3.2**, the valley's lowest point.
   - Tallow Creek's channel floor has absolute heights, falling from −2.2 at the west edge to −3.15 at the lake's edge.
   - The farm bottoms sit at −1.6 and the farmyard terrace at 4.6, so the farm spans about −2..4, as planned.
2. **Roads are splines with design grades.**
   - Every road and the rail is a centripetal Catmull-Rom spline through its control points, with a maximum grade.
   - By default a profile follows the land: smoothed, then grade-limited with its ends fixed, with forward and backward passes averaged.
   - Control points may pin heights to make a designed profile:
     - **Farm Lane:** level crossing at 1, bridge deck about 0.2–0.3, bottoms −1.6, then +6.2 m over 25 m (14°) to the farmyard.
     - **Rail:** level at Y 1 everywhere, cutting into portal hills at both map edges.
3. **Bridges are spans of distance along their road.** The terrain beneath is left to the creek or lake. The creek carves first, and roads lay their beds over it.
4. **Routes that fit the grade and the houses.**
   - Cabin Road winds for about 100 m, with an S-bend between the Mortons (north) and the Vargas (south), which keeps its 9 m climb under 12%.
   - School Lane runs west of the School Lane houses to the foot of School Hill (about 90 m).
5. **Flats are landforms, not shapes.**
   - Each flat zone has a noise-warped edge (`edgeNoise`).
   - Each may keep part of the land's natural roll (`relief`). Building pads keep none.

## Why
- **Keeping the lake at 0** would mean raising the whole creek corridor about 3 m above the town and the farm bottoms. That contradicts "valley floor ≈ 0" and "farm −2..4" far more than moving one number.
- **Ignoring hydrology** leaves a creek that visibly flows uphill, which is the kind of wrongness players notice in a calm game.
- **Pinned profiles** make the few designed gradients (the farm ramp, the level rail) exact and testable. Everything else just follows the land.

## Consequences
- The lake's shores slope down 3–4 m to the ice. The landing is a small bluff (the dock needs steps), and the sauna's plunge hole is reached by a short slope.
- Bridge meshes take their deck heights from `GeneratedTerrain.roadProfiles` and their extents from `GeneratedTerrain.bridges`.
- `tests/unit/terrain.test.ts` enforces:
  - every road's grade and camber;
  - the farm ramp angle;
  - the level crossing;
  - the creek's fall into the lake;
  - the planned elevations.
- `npm run map` renders `artifacts/terrain/map.png` so layout changes are checked by eye.
- Not yet in the data: the ridge switchbacks, the Ridge Trail and the shore footpath (M8 and M7). They get the same road model when those milestones start.
