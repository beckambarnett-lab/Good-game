# 雫テラス upgrade map

How the footbridge goes from the BEFORE references to the AFTER references.
- **Stage 0** is every save from move-in until the Chapter 3 unlock.
- **Stage 1** is the unlock itself.
- **Stages 2–12** each add one purchasable upgrade, in this order. The harness builds its stages from the `bridge: n` field on these `UPG` entries, so this table and the code must stay in sync.

Item numbers (#) refer to the rows in `BRIDGE_INVENTORY.md`.

## Economy context
- **Chapter 3** starts when the player pays the Chapter 2 gate (¥120,000 plus Mrs. Oda's three-star service). Chapter 4 needs ¥160,000 and 30 roasted portions.
- **Existing Chapter 3 spending:** about ¥95,000 (yatai noren, cart burner, tea counter, second pan, koi). The bridge adds about ¥77,000 in Chapter 3 and about ¥32,000 in Chapter 4.
- **Bridge upgrades are cheap and frequent.** This is deliberate: something new from the street roughly every 10–15 minutes of play.
- **Appeal (`ap`) drives customer arrivals.** Terrace-specific effects are listed per upgrade.

## Stage 0: the forgotten crossing (move-in → end of Chapter 2)
It matches B-street and B-high: the rusted, graffitied pale steel; the shop-end 立入禁止 barrier with its pink sign, cone, dead plant and broken chair; the flickering fluorescent tube; the litter.
- **Walkable:** the player can climb the far stairs and cross the bridge to the barrier.
- **Shop end closed:** the barrier is a solid wall (`bridgeEnd`), and the balcony's west rail (`balcL`) is closed.

## Stage 1: the Chapter 3 unlock, 雫テラス opens (the big step, about a third of the way)
This is `RENO[2]` ("Build the yatai and the terrace"). The player bolts the last deck board with Gen-san, then watches a short reveal: the camera pulls back to the street and the terrace lights come up in sequence.

| Removes | Adds |
|---|---|
| The shop-end barrier, 立入禁止 sign, cone, dead plant, broken chair, tarp (#1) | An open junction with the balcony walkway, red pots on the rail (#1) |
| Graffiti, peeling paint, rust bleed on the parapets (#2) | Deep charcoal-indigo paint with a weathered patina (#2) |
| Bare concrete deck (#3) | Cedar planks with brass edge strips (#3) |
| The flickering fluorescent tube (#4) | Three warm downlights under the deck (the first of #4) |
| The blank sun-bleached fascia panel (#5) | The cedar 雫テラス signboard with the water-drop crest, on both fascias (#5) |
| — | Three round hinoki tables with red-cushion stools (6 seats); the terrace takes orders (#14) |

- **Gameplay:** 6 terrace seats, terrace orders (`sp: 'terrace'`), and the far stairs plus the balcony become routes.
- **Persists into stage 1, for later upgrades to remove:** the rusty stair treads, tape and cones; the bare railing tops and empty hooks; the second blank panel; the dead underside fixtures; the near-stair chained gate; the sidewalk litter; the cables over the deck; the rust streaks low on the outer fascia.

## Incremental upgrades (each one is noticeable from the street)
| Stage | Id | Name | Ch | Cost | Removes (BEFORE) | Adds (AFTER) | Gameplay |
|---|---|---|---|---|---|---|---|
| 2 | `tstreet` | Sidewalk planters | 3 | ¥5,000 | Litter, soggy flyers, crushed cans around both stair feet (#17) | Potted plants and clean wet paving (#17) | +1 appeal |
| 3 | `tstairs` | Terrace stairs | 3 | ¥7,000 | Rusty treads, worn rubber strips, caution tape, the cones at the far stair foot (#7, #8) | Cedar treads on charcoal stringers, LED step lights, lanterns top and bottom, the テラス席 ↑ A-board where the cones stood (#7, #8) | +2 appeal; terrace guests arrive by the far stairs |
| 4 | `tlanterns` | Droplet lanterns | 3 | ¥6,000 | The empty rusted hooks along the railings (#10) | Paper lanterns with the water-drop crest (#10) | +2 appeal |
| 5 | `tplanters` | Cedar planters | 3 | ¥8,000 | Bare rusty railing tops (#9) | Long cedar planter boxes with ivy, ferns, small flowers (#9) | +2 appeal |
| 6 | `heaters` | Terrace heaters | 3 | ¥10,000 | Standing puddles on the deck (the heaters dry it to a sheen) (#3) | Copper mushroom heaters with glowing orange columns, along the street-side parapet (#13) | Terrace guests wait 30 s longer |
| 7 | `strings` | String lights | 3 | ¥9,000 | The sagging dead cables directly over the deck | Warm white, amber, pink and teal bulb strands (#12) | +4 appeal |
| 8 | `tunder` | Underside lights | 3 | ¥7,000 | The remaining dead fixtures under the deck (#4) | Amber downlights along the full length, plus the cyan LED strip on the lower fascia edge (#4) | +2 appeal |
| 9 | `tneon` | Neon teacup | 3 | ¥9,000 | The second blank ad panel (#6) | The pink neon teacup with rising steam (#6) | +3 appeal |
| 10 | `tcanopy` | Rain canopy | 3 | ¥16,000 | Open sky and rain straight onto the far half of the deck (#11) | A black pergola with polycarbonate panels, rain sheeting off; two more tables under it (#11, #14) | +4 terrace seats; terrace guests don't lose patience faster in a downpour |
| 11 | `tbamboo` | Bamboo end | 4 | ¥12,000 | The chained near-stair gate (#15) | A cedar planter wall with tall bamboo, a stone lantern, the 関係者以外立入禁止 plaque (#15) | +2 appeal |
| 12 | `twisteria` | Wisteria | 4 | ¥20,000 | The last rust streaks on the outer fascia (#16) | Purple wisteria trailing over the planters and down the fascia (#16) | +5 appeal (final, matches AFTER) |

## Rules this map enforces
- **One direction only:** each row removes BEFORE items and adds only AFTER items, and nothing removed comes back.
- **Stage 1 is the biggest step,** and every later row is visible from at least one street angle.
- **Rebuild safety:** `buildBridge()` and `buildTerrace()` read the stage from `S.ch` and `S.up` on every rebuild, so loading a save lands on the right stage.

## Decisions (also logged in LOG.md)
- **Topology:** the far stairs (konbini side) are the public terrace entrance and get the テラス席 board. The near stairs keep the Kaiun hoarding at the bottom. Their top gate is the "closed end" that the bamboo wall finishes.
- **Cones and caution tape** stay until the stairs upgrade (the brief removes them at the unlock), so the stairs upgrade has something old to replace.
- **Extra tables** come with the canopy, so the covered run doubles the seating.
- **Heater count:** four, spaced along the street-side parapet, the count most consistent across A-high, A-balcony and A-terrace.
