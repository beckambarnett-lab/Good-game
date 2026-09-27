# Clobberfield

A wobbly-ragdoll army battle sandbox that runs in one HTML page. Spend your gold, drop soldiers on
your half of the field, press **Start** and watch physics sort it out.

- 8 original factions, 56 units (8 over-the-top legendaries), each with its own silhouette, stats and weapon behaviour
- Active ragdolls (cannon-es): balance forces, stumbles, knockback flights, limp deaths
- 20-level campaign + 2 bonus levels with 1–3 star ratings, and a sandbox with unlimited gold
- 6 battlefields: flat meadow, hills, a gorge with bridges, a lava caldera with geysers, a holey frozen pond, a tabletop mesa
- Synthesized sound effects and music (WebAudio, no samples)
- Desktop and phone controls

## Build and play
```
npm ci
npm run build        # -> dist/clobberfield.html (the artifact) and dist/index.html (local wrapper)
```
Open `dist/index.html` in a browser (it loads three.js r128 from cdnjs and cannon-es 0.20.0 from jsdelivr).

## The Gauntlet (tests)
- `npm test`: headless sim scenarios G01–G24 (NaN, stuck units, termination, determinism, perf)
- `npm run balance [seeds]`: equal-gold tournament of every unit vs 6 reference armies
- `npm run e2e`: Playwright UI flows, mobile, and the 100-unit performance check
- `node tools/duel.mjs <unitA> <unitB> [gold]`: quick equal-gold duel

Design: `docs/design.md`. Engine schema: `docs/schema.md`. Test history: `docs/gauntlet-log.md`.
