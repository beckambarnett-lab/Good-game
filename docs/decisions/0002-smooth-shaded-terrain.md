# 0002 — Terrain is smooth-shaded; objects keep flat facets

**Date:** 2026-09-24 · **Status:** accepted (the look is confirmed with the user in the Winter Walk lab) · **Code:** `src/view/scenes/ValleyScene.ts`, `src/view/geo/terrain/TerrainMesh.ts`

## Context
The art direction (Plan Part 5.1) says "flat-shaded faces with soft gradient lighting, wrap lighting on snow". The first valley shots rendered the 1 m terrain grid flat-shaded, and three problems showed:
- Every metre-sized triangle caught the low sun differently, so the snow read as tessellation noise (diamond moiré), not as "big simple forms".
- The LOD skirts, being vertical faces, took their own flat normals and drew a thin dark line along every chunk edge where LODs met.
- The terrain casting shadows onto itself at a grazing sun produced acne across the whole shadow box.

## Decision
- The terrain uses smooth per-vertex normals from the heightfield. Skirt vertices copy their top vertex's normal, so skirts light exactly like the surface and stay invisible.
- The terrain receives shadows but doesn't cast them.
- Trees, rocks, buildings, props and characters stay flat-shaded, as Part 5.1 intends.

## Why
- Facets make low-poly *objects* chunky and readable. On a 1 m ground grid they're noise.
- Soft ground under faceted objects is the standard look for stylized snow, and it matches "soft gradient lighting, wrap lighting on snow".
- Coarser facets (2–4 m triangles near the player) were rejected: they'd fight snow deformation and footprints, which need fine detail.

## Consequences
- Ground detail comes from vertex colour (blue hollows, packed roads, ice), the snow material's sparkle and trail tint (render core, M1) and placed rock outcrops on steep slopes (Part 5.5). It doesn't come from facet lighting.
- If the user prefers faceted ground in the lab review, the switch is the material's `flatShading` plus a shader override for skirt normals.
