# Clobberfield UnitDef schema (engine truth)

`docs/design.md` is the design intent. **This file is what the engine actually reads.** When they
disagree, follow this file. `src/data/factions/grow.js` is the complete reference example.

## Faction file: `src/data/factions/<id>.js`

```js
export const FACTION = {
  id: 'top', name: 'Big Top Bonanza', short: 'Big Top',   // short name shows on the tray tab
  color: '#9B5DE5',                                        // tab dot colour
  blurb: 'One line.',
  projLooks: { name: [ /* projectile primitives, see below */ ] },   // optional
  hidden: [ /* optional helper UnitDefs not shown in the tray (e.g. summons) */ ],
  units: [ /* 7 UnitDefs */ ],
};
```

## UnitDef

| field | meaning |
|---|---|
| `id` `name` `role` `desc` | role: melee, ranged, tank, cavalry, siege, support, legendary. `desc` is a one-line, funny, plain-English description shown on the card. |
| `cost` `hp` `mass` `speed` `scale` | mass is total kg (rider + mount). speed m/s. scale multiplies the 1.8 m humanoid. |
| `bulk` | optional width multiplier for the torso/hips (fat units: 1.2–1.5). |
| `armor` | optional 0..0.5 flat damage reduction. |
| `staggerImmune: true`, `stability: 3` | legendaries: ignore small stagger; launch threshold × stability. |
| `hoverMul` | optional (0.3–1). Softer balance spring = floaty/bouncy. |
| `grip` | optional locomotion grip multiplier (walrus 0.3 = slides). |
| `mount` | optional, see Mounts. |
| `weapon` | primary weapon (required). |
| `weapon2` | optional instant secondary weapon with its own cooldown. `when: 'near'` (default: nearest enemy within its range) or `when: 'crowd', crowd: 3` (fires when ≥3 enemies within range). No windup animation. |
| `charge` | cavalry: `{ damage, knockback, cooldown: 8, speedMul: 1.35, reach: 1.2, maxTargets: 3 }`. Rides faster while charge is ready, tramples on contact. |
| `passive` | `{ aura: { kind: 'slowEnemies'|'might'|'haste'|'burn', r, amt } , regen: hpPerSec, block: { deg: 120, reduce: 0.7 }, deathBlast: { r, damage, knockback }, summon: { id, every, count, max } }` (any subset). `might` = +20% dmg / −15% dmg taken to allies in r. |
| `ai` | `{ range: preferred distance, kite: true/false, priority: 'near'|'backline'|'biggest'|'cluster'|'weakest'|'allyLowest'|'allyFront', flee: metres }` |
| `look` | see Looks. |

### Weapon

Common: `kind, damage, range, minRange, cooldown, windup (0.3), recover (0.3), knockback (N·s impulse; negative on swing/thrust = pull), lift (0.35 upward share), anim, sound, shootSound, effect, hop (m/s upward jump at windup)`.

`effect` (status on hit): `{ slow: 0.25, slowTime: 2, burn: dps, burnTime: 3, stun: seconds }` — `slow` is the fraction removed (0.25 = 25% slower).

| kind | extra fields | behaviour |
|---|---|---|
| `swing` | `arc` (deg, 110), `maxTargets` (2) | melee arc at the hit frame |
| `thrust` | `arc` (30), `maxTargets` (1) | knockback along facing |
| `slam` | `radius`, `reach` (centre offset forward, 0 = on self), `lift` (0.9) | radial blast |
| `spin` | `radius`, `duration`, `tick`, `spinRate` | whirl, hitting everything around repeatedly |
| `projectile` | `proj: { look, speed, gravity (scale), radius, arc: 'low'|'high', acc (0..1), count, spread (deg total), splash, pierce (n), bounce (n), spinRate, roll: { dist, speed, damage, knockback }, pull (impulse toward shooter), cloud: { r, dps, time, effect }, boomerang: true, flat: true (no gravity) }`, `muzzle: { bone: 'mount'|'torso', at: [x,y,z] }` | real ballistics with lead + aim error |
| `beam` | `beam: { time (0 = instant), tick (0.1), width, pierce: bool, sweep (deg) }`, `color` | damage is the total per target over `time` |
| `chain` | `chain: { jumps, radius, falloff }`, `color` | instant lightning chain |
| `cone` | `cone: { angle, len, time, push, look: 'frost'|'fire' }` | breath; `damage` is per second |
| `aoePoint` | `radius`, `aoe: { delay (1.5), lead (0.5), lift, look: 'sun' }`, `color` | telegraphed ground strike |
| `heal` | `heal`, `radius` (0 = single), `cleanse`, `look` | single-target heal |
| `healPulse` | `heal`, `radius` | heals all allies around self |
| `healPatch` | `heal` (hp/s), `radius`, `patchTime` | ground zone that heals |
| `buff` | `radius`, `buff: { kind: 'haste'|'might', time }` | haste = +30% move, +25% attack rate |
| `revive` | `reviveHp` (0.4) | revives a fresh ally corpse (non-mounted, cost ≤ 400, once each, 3 per reviver) |
| `explode` | `radius` | suicide blast |

Global rules: heal cap 15 HP/s per unit; healing ×0.5 after 60 s; sudden death at 90 s (no healing, everyone drains 3%/s); hard end 120 s.

`anim`: `swing, swing2 (two-handed), thrust, lance, throw, aim (both arms forward, held), bow, raise, point, slam, spin, heal, none`.

`sound` (hit) / `shootSound`: `bonk, slash, stab, whoosh, shoot_bow, shoot_throw, shoot_cannon, shoot_magic, shoot_squirt, beam, explosion, slam, freeze, squeak, spin, summon`.

## Mounts

`mount: { kind: 'beast'|'cart'|'wheel', len, w, h, height, saddle, legs (0/2/4/6), head: bool, headR, neck, wheels, wheelR, wheelPos: [[x, z, r], ...], riderZ, rider: 'straddle'|'stand', scale }` — all at mount scale 1 in metres. `height` = body-centre hover height, `saddle` = height of the rider's hips. Visual legs animate with the gait; wheels spin.
Defaults: beast `{len 1.5, w .7, h .7, height 1.05, saddle 1.45, legs 4, head true}`, cart `{len 2, w 1.4, h .5, height .62, saddle .95, wheels 4, wheelR .45, rider 'stand'}`, wheel `{len .3, w .3, h .6, height 1.1, saddle 1.5, wheels 1, wheelR .6}`.

## Looks

```js
look: {
  skin, top ('team' default), arms, legs, feet, hands, headColor, eyeColor, belt (false = none),
  torso: 'box'|'round'|'barrel'|'cone', head: 'sphere'|'box', eyes: false, hide: ['torso','head','arms','legs'],
  mount: { body, head, legs, hoof, tail, saddle, trim, wheel, hub, frame, shape: 'box', wheelShape: 'torus',
           legW, noBody, noHead, noSaddle, noTail, noHoof },
  parts: [ [shape, bone, [x,y,z], [sx,sy,sz], color, [rx,ry,rz]?, { detail: true }?], ... ],
}
```

- shapes: `box` (full size), `sphere` (diameters), `cyl` (diameter, height, diameter; axis = local y), `cone` (base diameter, height; tip +y), `torus` (outer diameter ≈ size; ring in the local XY plane, axis z).
- colours: `'#rrggbb'`, `'team'` (blue/red side colour), `'teamDark'`. **Every unit must show team colour somewhere clearly visible** (shirt, sash, banner, saddle cloth, flag…).
- bones and their frames (scale-1 metres; +x right, +y up, +z forward when standing):
  - `torso`: centre; 0.46 wide, 0.62 tall, 0.30 deep (front face z = +0.15).
  - `head`: sphere centre, r 0.17 (front z = +0.17, top y = +0.18).
  - `armL`/`armR`: arm centre, arm hangs along −y (shoulder y = +0.31, hand y = −0.31).
  - `handL`/`handR`: at the fist, same orientation as the arm. **Held weapons point along +z** (a sword blade from z 0.1 to 1.0). When the arm raises and swings, the weapon arcs overhead and comes down in front.
  - `legL`/`legR`: leg centre, hip y = +0.4, sole y = −0.4.
  - `mount`, `mountHead`: mount body / head centres (mount scale); `mLeg0..5`: leg pivots (leg hangs along −y); `wheel`: prims on this bone spin about their own axis (cyl around local y, torus around local z).
- `detail: true` prims are dropped at distance (LOD). Keep 8–25 extra prims per unit.
- Rotations are radians (Euler XYZ). `Math.PI` is fine.

Projectile looks: `[shape, [x,y,z], [sx,sy,sz], '#color', [rx,ry,rz]?]`, +z = flight direction.
