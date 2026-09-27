# Clobberfield gauntlet log

The gauntlet loop (from the brief): automated headless tests → equal-gold balance tournament → blind
review by a fresh agent → fix → repeat. Exit when all tests pass, no unit is outside the 20–80%
equal-gold band, and every feature scores 8+ from a fresh reviewer, two rounds in a row.

Tools: `npm test` (tools/sim-test.mjs, G01–G24), `npm run balance` (tools/balance.mjs),
`npm run e2e` (tools/e2e.mjs, Playwright + SwiftShader), `node tools/duel.mjs a b [gold]`.

## Decisions made while the user was away

| # | Decision | Why |
|---|---|---|
| D1 | Battle axis is **z** (blue deploys at z>0 near the default camera, red at z<0); the design doc uses x. Formation DSL `at: [depth, lateral]` is mapped accordingly. | Camera behind your own army is the natural view on desktop and in portrait on phones. |
| D2 | Mounted riders keep **physical legs** (8 bodies per rider+mount instead of the doc's 6). | Riders flop off and tumble properly when the mount dies. |
| D3 | All collision shapes are spheres; limbs collide with the ground only; same-unit pairs are filtered in the broadphase. | Performance (see perf notes below). |
| D4 | cannon's `ArrayCollisionMatrix` replaced by a no-op matrix. | It was O(bodies²) per step (~20% of step time at 120 units) and only feeds contact events we don't use. |
| D5 | Settled corpses are removed from the physics world ("frozen") but still drawn; more than 70 corpses sink into the ground and disappear. | Keeps late-battle step cost flat. |
| D6 | Balance band is checked on each unit's **average** win rate over 6 reference armies at equal gold (both sides, several seeds). Supports are measured by marginal value: (Hoe Hand escort + unit) vs (same escort + reference). | Individual counters (siege vs cavalry, etc.) are meant to be lopsided; a pure healer army can't fight at all. |
| D7 | Aim error widened to σ_yaw = (1−acc)·11°, σ_pitch = (1−acc)·5°. | With the doc's 6°/3°, `acc` barely mattered and ranged units hit almost everything. |
| D8 | Three.js r128 (UMD on cdnjs) and cannon-es 0.20.0 (ESM on jsdelivr). | Both are pinned CDN builds the artifact CSP allows. The container can't reach the CDNs, so tests route those URLs to node_modules copies of the same versions. |
| D9 | Physics runs at a fixed 60 Hz, with smaller steps in slow motion. The solver uses 7 iterations, dropping to 5 above 90 live units or on slow devices. | Smooth slow-mo, and it degrades gracefully. |

## Rounds

_(filled in below as rounds complete)_
