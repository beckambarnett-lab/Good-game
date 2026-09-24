## Part 3 — The Town Bible: Wrenhollow

### 3.1 Geography and map layout
**Coordinate system:** the world is 512 × 512 m, centered on the Lantern Tree in the town square at (0, 0). +X is east, +Z is south (north is −Z), Y is up (m). The valley floor is at Y ≈ 0.

A backdrop ring of low-poly mountains (Graybeard Peak 1,900 m to the north, the Twin Sisters to the east, Kestrel Ridge to the south-west) sits outside the playable square. It is rendered as fog-faded silhouettes.

```
                      N (−Z)
   ┌───────────────────────────────────────────────────────────────┐
   │  GRAYBEARD RIDGE  (Y 40–90)          ☆ Lookout (−40,−225) Y88  │
   │   old-growth oak & pine    Ranger Stn (−90,−190) Y62           │
   │        ╲╱╲╱ switchbacks (chains)     │ Ridge Trail (crampons)  │
   │   ◇ Grandmother Oak (−150,−200)      │                         │
   │ WOODLOT  (−250..−150, −100..+40)   School Hill ▲ (−40,−140→−85)│   Boathouse (220,−40)
   │   ⌂ CABIN (−175,−25) Y10           Schoolhouse (−40,−75)        │  ╭──────────╮
   │     woodshed, block, feeder    School Lane                     │  │ STILLMERE │
   │   Cabin Road ↘ (−100,0)  ════ MAIN STREET ════ (+100,0) ══ Lake Road ══ drift (130,5) ══ Landing (165,15)
   │                    Garage·Forge·Woolens·Post│Hall│Store·Hal·Park     │  LAKE     │ Sauna+Margo (160,60)
   │                    Abernathy·Nakamura·Kettle│ ⊕  │Inn · Bellweather  │ (215,40)  │
   │                                  Square(0,0)│    │ Farm Lane ↓ (50,20)╰──────────╯
   │  ═══ rail (z≈60) ═══ Wrenhollow Halt (−10,55) ══ level crossing (50,60) ═══ trestle → east
   │  ~~~~ Tallow Creek (frozen) ~~~~~~~~~~ bridge (50,95) ~~~~~~~~~~~~~~~~~ → lake (150,85)
   │                         Orchard (0..30,170..210)  LINDQVIST FARM: house (45,150), barn (80,165)
   │                                                   Maple grove + Sugar Shack (110,200)
   └───────────────────────────────────────────────────────────────┘
                      S (+Z)
```

**Areas, zones and gates**

| Area | Bounds (x, z) | Elevation | Music/ambience zone | Foot access | Truck access |
|---|---|---|---|---|---|
| Cabin & Woodlot | −250..−150, −100..+40 | 5–25 | `cabin`, `woodlot` | Always | Always (driveway) |
| Wrenhollow town | −110..+110, −90..+70 | 0–3 | `town` | Always | Always (Main Street is plowed by Rusty) |
| School & School Hill | −70..−10, −150..−60 | 2–30 | `town` / `hill` | Always | School Lane |
| Stillmere Lake | 150..280, −50..130 | 0 (ice) | `lake` | Always via the shore footpath. **Ice safe from Day 6** | **Plow Blade** clears the Lake Road drift |
| Lindqvist Farm | −20..140, 90..230 | −2..4 | `farm` | Always (deep unplowed lane, slow) | **Snow Tires** (or Plow) for the lane's 14° rise |
| Tallow Creek | −256..150, 80..115 | −3 | `creek` | Ice walkable from Day 6 | Bridge at (50, 95) |
| Graybeard Ridge | −240..+60, −256..−140 | 40–90 | `ridge` | **Crampon Boots** on the Ridge Trail | **Tire Chains** on the switchbacks |
| Lookout tower | (−40, −225) | 88 + 12 m tower | `lookout` | Ridge access | Ridge access |

**Roads (splines, widths):**
- **Main Street:** 200 m, 10 m wide, lined with sidewalks.
- **Cabin Road:** 110 m, 6 m wide, climbs 10 m. Hal's mailbox marks your drive.
- **School Lane:** 90 m, 5 m.
- **Lake Road:** 70 m, 6 m. The drift gate is 3 m tall.
- **Farm Lane:** 150 m, 5 m. Level crossing, bridge, then the 14° rise at the farm gate (a 25 m ramp).
- **Switchbacks:** 420 m, 5 m, 18° grade on the hairpins (12° between), 3 hairpins with ice patches.
- **Ridge Trail:** a footpath, 30° in places.
- **Shore footpath:** town east end to the lake landing, 90 m through birches.
- **Rail line:** tunnel west (−256, 60) → Halt → level crossing → trestle (160, 95) → tunnel east (256, 120).

**Signature vistas (composed on purpose; used for screenshot QA shots):**
1. **Cabin porch at night:** the town's lights twinkling below, the hall's bell tower lit, the lake beyond.
2. **Main Street from the Cabin Road bend:** the street framed by snowy pines.
3. **The frozen lake at dawn:** pink sky, the sauna smoking, ice fog.
4. **The Lookout:** the whole valley, the aurora overhead.
5. **The Lindqvist red barn** against the white fields at dusk.

### 3.2 Locations (buildings that serve gameplay)
Lots on Main Street are about 20 m wide. North-side fronts sit at z ≈ −14 and south-side fronts at z ≈ +14.

| # | Location | Position | Owner | Hours | Interior | Gameplay role |
|---|---|---|---|---|---|---|
| L1 | **Your cabin + woodshed + chopping block** | (−175, −25) | You | — | Yes (cabin; woodshed is open-sided) | Home, stove, bed, decorating, storage, feeder, porch |
| L2 | **Okafor Garage** | N1 (−88, −16) | Rusty | 07:30–17:30 (Sat –12:00, Sun closed) | Yes (bay + office) | Truck repair and upgrades, towing, plow jobs |
| L3 | **Anvil & Ember** (forge + hardware) | N2 (−66, −16) | Ines | 07:30–17:30 (Sun closed) | Yes (shop + forge) | Tools, shed kits, stoves, sharpening. Buys oak (+20%) |
| L4 | **Sörensen's Woolens** | N3 (−44, −16) | Nadia | 09:00–17:00 (Sun closed) | Yes | Clothing, dyes, sled, snowshoes, skates, textile decor |
| L5 | **Post Office & Notice Board** | N4 (−22, −16) | Bea | 08:00–17:00 (Sat 09:00–12:00, Sun closed; the board is outside, always readable) | Yes | Orders board, parcel runs, mail-order contract, letters |
| L6 | **Meeting Hall** (bell tower, stage, piano) | (0, −36) | Town (Bea chairs) | Events; open 10:00–20:00 | Yes (hall + stage) | Festivals, potluck, piano, community orders |
| L7 | **Pemberton's General Store** | N5 (+22, −16) | Gus | 08:00–19:00 (Sun 10:00–14:00). Honor jar during checkers | Yes | Wholesale buyer, groceries, drinks, seed, feeders, tote, thermos, rod, decor, price chalkboard |
| L8 | **Hal's house** | N6 (+44, −16) | Hal | — | Arc scenes only | Hal's porch (whittling, birds) |
| L9 | **The Kettle café** | S3 (−44, +16) | Mara | 06:30–19:00 (Sun brunch 09:00–13:00; Wed checkers till 21:00) | Yes (with window seats) | Drinks and buns (warmth), fish buyer, contract, overheard talk |
| L10 | **The Snowdrift Inn** | S4 (+24, +18) | Wendell | Lobby 07:00–22:00 | Yes (lobby + dining) | Big contracts, roof jobs, gift shelf, grand fireplace seat |
| L11 | **Schoolhouse** | (−40, −75) | Elin | School days 08:00–15:00 | Yes (one room) | School contract, birch-bark crafts, recess life |
| L12 | **Wrenhollow Halt** (rail) | (−10, 55) | Bea (Thursdays) | Thursday train 10:00–10:30 | Shelter only | Mail-order crate, arrivals (Dot), ambience |
| L13 | **Stillmere Landing: bait shack, sauna, plunge hole** | (160, 40–60) | Margo | Bait 09:00–12:00. Sauna 13:00–21:00 | Yes (sauna + shack) | Fishing gear, bait, shelter rental, sauna warmth, contract |
| L14 | **Boathouse & pike weed edge** | (220, −40) | Town | — | No | Pike fishing spot, Margo's shanty (arc) |
| L15 | **Lindqvist Farm:** house, barn, coop, sheep pen, **sugar shack**, orchard | (45–110, 150–210) | Otto & Freya | Farm always; kitchen via arc | Farm kitchen + sugar shack | Farm orders, plow job, applewood, sugaring contract, Sugaring Off |
| L16 | **Ranger Station** | (−90, −190) | Felix | 07:00–17:00 | Yes (one room) | Saplings, contract, deadfall map, bird feeder (Pine Grosbeak) |
| L17 | **Fire Lookout** | (−40, −225) | Felix | Always | Open cab at the top | Stargazing, telescope spot, aurora, meteor night |
| L18 | **Grandmother Oak** (Heritage tree) | (−150, −200) | — | — | — | Felix arc. Protected landmark |

**Why each earns its place:**
- Each shop sells one upgrade family (Part 4) and buys at least one wood product.
- Each has an owner with a routine and an arc.
- Non-shop locations host festivals or a side activity.
- No location is decorative-only except Hal's house, which hosts arc scenes and ambient whittling.

### 3.3 Interiors
All interiors are built with the interiors kit (Part 5.5) and revealed with the cutaway (Part 7.4).

| Interior | Rooms / size | Key stations |
|---|---|---|
| Cabin | 1 room + loft, 7 × 9 m | Stove, bed, table, armchair, radio, woodbox, window seat, decor slots (~40) |
| Kettle café | 8 × 10 m | Counter, 4 tables, window bench, oven (visible fire), cat bed |
| General store | 8 × 12 m | Counter, shelves (procedural goods), bird-seed barrels, honor jar, chalkboard |
| Anvil & Ember | 10 × 12 m | Counter, forge (glow, sparks), anvil, bellows, tool racks |
| Woolens | 7 × 9 m | Counter, loom, mannequins (try-on), yarn walls |
| Post office | 7 × 8 m | Counter, sorting cubbies, cat in window |
| Garage | 12 × 14 m | Bay with a lift (truck upgrades are animated here), office, cat |
| Meeting Hall | 12 × 20 m | Stage, piano, long tables, stove, bell rope |
| Snowdrift Inn | Lobby 10 × 12 m + dining | Grand fireplace seat, front desk, gift shelf |
| Schoolhouse | 8 × 10 m | Desks, stove, piano |
| Sauna + shack | Sauna 3 × 4 m, shack 5 × 6 m | Benches, stove with stones, ladle; bait counter |
| Ranger station | 6 × 8 m | Maps, desk, stove, sapling crates |
| Farm kitchen | 7 × 8 m | Table, woodstove, syrup shelf |
| Sugar shack | 6 × 10 m | Evaporator with firebox, steam vent |
| Hal's house | 6 × 7 m | Workbench, carvings (arc scenes only) |

### 3.4 Households, ambient townsfolk, animals, vehicles
**Distance rule for schedule authors:**
- NPCs walk 1.1–1.5 m/s in real time. At day speed (90 s per game hour), **one game hour of walking covers about 100–135 m**.
- Homes are placed near workplaces. Long trips use vehicles: Otto's tractor, Felix's ranger pickup, Rusty's wrecker.
- The scheduler converts real path time to game time using the time scale in effect.

**Named households** (order customers; mostly seen as ambient residents)

| # | Household | Location | Size | Preferences | Notes |
|---|---|---|---|---|---|
| H1 | Fern & Walter Abernathy | S1 (−88, +16) | 2 | Oak, small orders | Elderly. Walter shovels badly and is grateful for your help. Early shovel jobs |
| H2 | The Nakamuras | S2 (−66, +16) | 4 | Any | Kids **Kenji (10)** and **Aya (7)** are ambient kids |
| H3 | Theo & Priya Bellweather | S6 (+66, +16) | 3 | Pine (quick warm-up) | New baby, pushed in a sled-pram |
| H4 | Mr. Ambrose Quill | S7 (+88, +16) | 1 | Birch | Retired teacher; feeds crows; loves Elin's concerts |
| H5 | The Okonkwos | N8 (+88, −16) | 5 | Large any | Big family; lots of snowmen in the yard |
| H6 | The Delacroix sisters | School Lane (−30, −50) | 2 | Birch, well-seasoned | Knitting circle with Nadia |
| H7 | The Hendersons | School Lane (−30, −62) | 3 | Pine | Dog-less, envy Biscuit |
| H8 | The Mortons | Cabin Road (−125, −8) | 2 | Any | Your nearest neighbours. Corgi **Biscuit** |
| H9 | The Vargas | Cabin Road (−140, +20) | 4 | Oak | Grandpa Varga tells stories |
| H10 | Lakeside Cabins (Inn annex) | Lake W shore (175, −10) | Guests | Birch | Wendell's overflow guests |
| H11 | The Tanakas' weekend cabin | Lake N shore (240, −55) | 2 | Any, Fri–Sun only | Orders appear only on weekends |
| H12 | Sven Aalto, boathouse caretaker | (225, −35) | 1 | Pine | Silent, carves decoys; waves |
| H13 | The Kowalskis | Farm Lane cottage (45, 70) | 3 | Pine/birch | Near the level crossing; love the train |
| H14 | The Adeyemis | Farm Lane smallholding (70, 120) | 4 | Oak | Goats and a tiny dairy |
| H15 | Ruth & Omar Oduya | Ridge cabin (−130, −170) | 2 | Oak | Writers who winter here. Ridge access |
| H16 | Dr. Linnea Holm | Main St (+66, −16) wing | 1 | Birch | Town doctor, rarely home |
| H17 | The Schoolhouse | (−40, −75) | — | Any | Community (Elin) |
| H18 | Meeting Hall | (0, −36) | — | Any | Community (Bea) |

**Ambient townsfolk:** Kenji and Aya Nakamura, the Bellweathers, Mr. Quill, the Mortons, 4–6 rotating **Inn guests** (tourists with skis and cameras, generated from the character kit), and Dot Holloway (Bea's sister, after Bea arc L4). They have short schedules and small bark pools.

**Animals** (procedural animation, Blender-authored meshes)

| Group | Animals and behaviour |
|---|---|
| Dogs | **Anvil** (Ines's shaggy giant; follows her, flops in snow), **Biscuit** (Mortons' corgi; zoomies after snowfall), **Moss** (Otto's border collie; herds sheep, trots beside the tractor). All can be petted: E, a heart-puff, tail wag, +1 cozy moment, no gameplay effect |
| Cats | **Carb** (Rusty's garage cat), **Postage** (Bea's window cat). Pet-able |
| Farm | Horses **Nils** and **Birgit** (in the paddock on clear days), 12 sheep ("the ladies"), 8 chickens and a dawn rooster |
| Wildlife | Crows, chickadees and the other feeder birds; a snowshoe hare and a red fox at dusk in the woodlot (tracks always, sightings 15%); deer at the forest edge at dawn (10%); lynx tracks on the ridge (Felix lore) |

**Vehicles**

| Vehicle | Behaviour |
|---|---|
| Town plow (Rusty) | Orange, amber beacon. 05:30–07:00 after ≥ 4 cm of snow: Main Street, School Lane, Cabin Road junction |
| Rusty's wrecker | Tows you if asked; drives to the garage |
| Otto's red tractor | Tuesday and Saturday town runs; Freya rides along |
| Felix's green ranger pickup | Thursday town runs; clear-night trips to the lookout |
| Thursday train | 3 cars and a small steam-style engine. Tunnel west → Halt 10:00–10:30 → east. Whistle echoes across the valley |

**Always-on charm details**
- Chimney smoke on every home whose fire is lit. Occupied houses have lit fires; smoke bends with the shared wind signal.
- **Windows light up by occupancy.** A home is lit when its residents are home and awake, and dark after bedtime. The Inn and hall stay lit during events.
- Street lamps come on at 16:15 in sequence down Main Street, a nice moment.
- Kids sled on School Hill after school and on weekends. Snowball fights at recess. Kids' snowmen appear and change over days.
- Porch woodpiles shrink daily and grow when you deliver.
- Icicles lengthen over days on south-facing eaves.
- Festival decorations (paper lanterns strung across Main Street from Day 21, wreaths, the lit Lantern Tree) appear on schedule.
- NPCs shovel their own paths after snowfall unless you already did, in which case they thank you.
- Laughing kids, a dog barking far off, the forge ringing, the café door bell, the 12:00 and 18:00 bells.

### 3.5 The characters
Format for each: look (for the Blender script), personality, home and work, schedule, economic role, relationships, gifts, dialogue themes with sample lines, and a five-beat arc (L1–L5).

**Arc rules**
- Arc beats become available at the friendship level **and** the listed condition.
- They are **never missable**: festival-tied beats have a fallback trigger on the next suitable day.
- Beats may ask for goods (which need tools you'll naturally own by then), but **attending a scene never requires an area-unlock purchase.** If a scene is in an area you can't reach yet, a character gives you a lift:
  - Felix's pickup to the Ridge: Freya L2, Meteor Night.
  - Otto's tractor to the farm.
  - Rusty's wrecker to the lake.

---

#### 1. Hal Brennan (72): the retired woodcutter, your mentor
- **Look:**
  - Tall, lanky, slightly stooped.
  - Red-and-black plaid mackinaw, grey flat cap, orange scarf.
  - White stubble, bushy eyebrows.
  - Carved walking stick.
  - *Silhouette: tall + stick.*
- **Personality:** gruff-funny, patient, sentimental underneath, restless in retirement. Talks to birds. His late wife **June** loved birch fires; he mentions her gently and rarely.
- **Home:** Hal's house (N6).

**Schedule**

| Day | Schedule |
|---|---|
| Weekday | 06:30 wake · 07:15 walk to The Kettle (coffee with Gus) · 08:45 home porch, whittling (Blizzard: indoors) · 11:30 fills the square bird feeder, sits on the bench · 12:30 home lunch · M/W/F 15:00–17:00 checkers at The Kettle with Gus · Tu/Th 14:00–16:00 visits Rusty's garage · 17:00 home · 21:00 sleep |
| **Monday special** | 07:30 walks up Cabin Road to **your porch**, arrives about 10:00, sits whittling and comments on your work. Leaves 12:00, home about 14:30, then checkers as usual. Skipped in Heavy Snow or Blizzard |
| Saturday | 09:00–12:00 market stroll · 14:00–16:00 sauna (after Hal/Margo resolution; before that, the lake-shore bench) |
| Sunday | 17:00–19:00 hall potluck |

- **Economy:**
  - 1 birch bundle every Friday ("only the best, mind").
  - Gives 5 saplings per week.
  - Teaches through his lines (hint channel).
- **Relationships:**
  - Gus: best friend and checkers rival.
  - Margo: old flame, stubborn.
  - Rusty: owes him favours.
  - Pip: calls him "Grandpa Hal" (not related).
- **Gifts:** loves *carved bird*, *birch bark roll*. Likes *cardamom bun*, *pinecone*, *tea tin*.
- **Themes:** wood lore, technique tips, *Marigold*, old Wrenhollow, birds, his back, June.
- **Sample lines:**
  - (bark, you chopping) "Let the axe do the work. You just steer."
  - (cold snap) "Cold enough to freeze the words in your mouth. You'd have to thaw 'em by the stove to hear what you said."
  - (about Gus) "Gus says he's winning at checkers. Gus has always been a liar with a good heart."
  - (after the chains upgrade) "Chains on Marigold! She'll think she's young again. Don't let her go to her head."

**Arc — "One Last Tree"**

| Level | Beat |
|---|---|
| L1 | Hal asks for "birch like June liked" and tells you about her on his porch. *Reward:* carved chickadee (decor), plus Hal's knife if whittling ships |
| L2 | Restless, Hal visits the woodlot and teaches "my father's trick": the **tire ring** (you fetch an old tire from Rusty's yard). *Reward:* Tire Ring upgrade |
| L3 (after Day 10) | "One last tree." A scripted co-op felling of a big pine by the cabin. Hal calls the fall line and shouts "Timber!", then goes quiet. *Reward:* framed photo, and Hal's hand-drawn woodlot map (shows tree sizes) |
| L4 (Day 26–27) | Hal has carved a bird for every neighbour for Lantern Night, but his hands shake. You deliver 12 carved birds around town, each with a reaction scene |
| L5 (after Lantern Night) | Hal gives you his father's axe head wrapped in burlap. Ines re-hafts it (free), giving **Old Faithful**. Final porch scene: Hal says he's "taking Margo up on that sauna." *Reward:* Old Faithful, Hal's Carved Wren (decor) |

---

#### 2. Mara Kettleby (41): owner of The Kettle café
- **Look:**
  - Short, round, rosy.
  - Auburn curls under a mustard kerchief.
  - Green apron dusted with flour over a cream knit sweater, rolled sleeves.
  - *Silhouette: round + kerchief knot.*
- **Personality:** warm, brisk, funny, a worrier, generous. Talks fast and bakes when stressed.
- **Home:** upstairs at the café (S3). Son **Pip**. **Wendell** is her uncle ("Uncle Wen").

**Schedule**

| Day | Schedule |
|---|---|
| Weekday | 05:30 baking (lights and chimney early) · 06:30–19:00 counter · 14:00 sweeps or shovels the café steps (skipped if you cleared them) · 15:00 Pip home · 19:00 closes; upstairs · 21:30 sleep |
| Wednesday | Hosts checkers night until 21:00 |
| Sunday | Brunch 09:00–13:00 · 17:00 potluck |

- **Economy:**
  - Contract: 1 birch per day, Mon–Sat, +10%.
  - Buys fish ×1.2.
  - Sells drinks and buns.
  - Buys applewood (arc).
- **Relationships:**
  - Bea: best friend, gossip partner.
  - Wendell: uncle.
  - Hal: a father figure.
  - Elin: Pip's teacher, a new friend.
- **Gifts:** loves *applewood split*, *maple syrup jar*. Likes *perch*, *cocoa tin*, *tea tin*.
- **Themes:** baking, Pip, oven moods, gossip, never taking a day off.
- **Sample lines:**
  - "If this oven were a person, it'd be Gus. Cold in the morning, warm by noon, grumbling all the while."
  - (you, cold) "Sit. Cocoa. Don't argue, I've already poured it."
  - (Pip-related) "If Pip calls you 'Wood Wizard' one more time I'm going to start charging him rent."

**Arc — "The Perfect Bake"**

| Level | Beat |
|---|---|
| L1 | Her oven sulks on damp wood. She asks for **well-seasoned birch** for her Hearth Fair entry |
| L2 (Hearth Fair) | Her cardamom braid takes second place to Otto's rye, and she laughs it off. She wants to try smoking fish and asks for **applewood**. The beat waits until farm access. *Non-blocking* |
| L3 | "Smoked Perch Chowder." Bring 5 perch. The café fills up and Pip becomes "chief taster" |
| L4 | Mara admits she's never taken a day off. Bea secretly organizes the town to run the café for a Sunday (Day ≥ 44). You deliver recruitment notes to 5 volunteers. Hilarious chaos scene; Mara cries-laughs |
| L5 | *Reward:* **Mara's Special Cocoa** recipe (home brew +30, Toasty 2 h) and the recipe card (decor) |

---

#### 3. Pip Kettleby (9): Mara's son, would-be sled champion
- **Look:**
  - Tiny.
  - Puffy blue snowsuit, giant red bobble hat.
  - Mismatched mittens (green and orange).
  - Missing front tooth.
  - *Silhouette: small + huge pompom.*
- **Personality:** boundless energy, dramatic, invents facts ("Did you know snow is just cloud dandruff?"). Calls you "Wood Wizard."

**Schedule**

| Day | Schedule |
|---|---|
| School days | 07:50 walks to school · 08:00–15:00 school (recess 10:30, 12:30: snowball fights) · 15:00–17:00 sledding on School Hill (Blizzard: home) · 17:00 home · 20:00 sleep |
| Saturday | 09:00–12:00 sledding · 13:00–15:00 snow fort in the square |
| Sunday | Brunch with Mara · afternoon snowmen |

- **Economy:** none, except silly "jobs" paid in **bottle caps**. A side collectible: 10 caps hidden around the valley, with 3 more earned from Pip's jobs. Pip trades 10 caps for his "treasure" (snow-globe decor).
- **Relationships:**
  - Mara: mum.
  - Elin: teacher.
  - Hal: "Grandpa Hal".
  - Kenji and Aya: rivals and best friends.
- **Gifts:** loves *pinecone*, *cardamom bun*. Likes *carved bird*, *smelt* ("it's like a tiny dragon!").
- **Sample lines:**
  - (bark) "WOOD WIZARD! Can you split a snowball? Can you? CAN YOU?"
  - "My sled's cursed. Kenji says it's not cursed, it's just bad. That's what a cursed sled WANTS you to think."

**Arc — "Pip's Big Race"**

| Level | Beat |
|---|---|
| L1 | His sled "is cursed" and he needs a real one |
| L2 (Hal L1 done) | You find Hal's old toboggan in your woodshed loft and take it to Hal to restore |
| L3 | A practice race on School Hill: you vs Pip on sleds. Coaching dialogue |
| L4 (Day 42 Sled Race) | Pip races the restored toboggan. If L3 is done he wins; otherwise he gets the "Most Spirited" ribbon. Both outcomes are joyful |
| L5 | *Reward:* Pip's crayon drawing of you, Hal and *Marigold* (decor). His sled is now named "Wood Wizard" |

---

#### 4. Gus Pemberton (68): general store owner, birder
- **Look:**
  - Short, stout, stooped.
  - Grey cardigan, burgundy wool vest, checked shirt.
  - Half-moon glasses on a chain.
  - Bald with white tufts, pencil behind his ear.
  - *Silhouette: small + glasses glint.*
- **Personality:** slow-talking, deadpan, seems stingy but is secretly generous. Obsessive birder and list-maker.
- **Home:** back rooms of the store (N5). Cousin of **Bea**.

**Schedule**

| Day | Schedule |
|---|---|
| Weekday | 06:50 to The Kettle for coffee with Hal · 07:50 opens the store (08:00–19:00 at the counter) · 12:30 fills the square feeder with Hal · M/W/F 15:00–17:00 checkers at The Kettle (store on the **honor jar**) · 19:00 closes · 21:00 sleep |
| Wednesday | Also checkers night 19:00–21:00 |
| Sunday | Store 10:00–14:00 · 15:00 bird walk along the shore footpath |

- **Economy:**
  - **Wholesale wood buyer**.
  - Groceries, drink tins, seed, feeders, tote, thermos, rod, carrots, candles, basic decor.
  - The price chalkboard outside.
- **Relationships:**
  - Hal: best friend and checkers rival.
  - Bea: cousin ("Bea's news travels faster than the real news").
  - Mr. Quill: fellow bird nerd.
- **Gifts:** loves *carved bird*, *tea tin*. Likes *cardamom bun*, *smelt*, *maple syrup jar*.
- **Sample lines:**
  - "Pine's two coins. Was two coins in 1987. Will be two coins when we're both birds ourselves."
  - (you, bird sighting) "A redpoll. Hm. Write it down. Things you don't write down didn't happen."

**Arc — "The Winter Wren"**

| Level | Beat |
|---|---|
| L1 | Gives you a **porch feeder** (free) and asks you to report birds |
| L2 | Spot 5 species. *Reward:* **Suet Cage**, and the legend of the town's namesake, the Winter Wren, unseen for 20 years |
| L3 | Spot 8 species. Gus shows his father's 1961 journal: the wren was seen "at the woodcutter's brush pile" (your cabin) |
| L4 | Keep a brush pile standing near the cabin for 3 days. At dawn the **Winter Wren** appears there; spot it |
| L5 | Dawn scene: Gus sits on your porch in silence while the tiny bird sings its huge song. "Well. That's that, then." *Reward:* bird mobile (decor), his father's journal (decor), 15% store discount |

---

#### 5. Bea Holloway (63): postmaster, gossip, festival chair
- **Look:**
  - Tall and sturdy.
  - Long plum coat, enormous cream scarf wrapped three times, teal beret.
  - Silver bob, red lipstick.
  - Mail satchel.
  - *Silhouette: tall + huge scarf.*
- **Personality:** sharp, talkative, organized, a kind busybody who knows everything. Secretly lonely.
- **Home:** above the post office (N4).

**Schedule**

| Day | Schedule |
|---|---|
| Weekday | 06:00–06:20 pins new cards on the notice board (visible) · 08:00–17:00 post office · 12:00–13:00 lunch at The Kettle with Mara · Tu/Th 17:00–18:30 festival committee at the hall · evenings home writing letters |
| **Thursday** | 09:45–10:45 at the Halt meeting the train |
| Saturday | Market organizer 09:00–14:00 |
| Sunday | Potluck organizer 17:00 |

- **Economy:**
  - The notice board.
  - **Parcel runs** on Thursdays: 2–4 parcels at 2c each.
  - **Mail-order crate** contract (Tier 3).
  - Letters.
- **Relationships:**
  - Gus: cousin.
  - Mara: best friend.
  - Wendell: festival co-chair and dramatic foil.
  - **Dot:** estranged sister.
- **Gifts:** loves *tea tin*, *maple syrup jar*. Likes *cardamom bun*, *knitted mittens*, *birch bark roll*.
- **Sample lines:** (Bea has the largest reactive pool)
  - "I heard you split an oak round in two strikes. Well — Ines heard it, and told Rusty, and Rusty told the whole café, so now it's history."
  - "Storm last night! The Abernathys' path is buried to the doorknob. There's a card on the board with your name written all over it."

**Arc — "The Hundredth Lantern Night"** (this winter is the centennial)

| Level | Beat |
|---|---|
| L1 | Collect **10 old photos** for the centennial album. Deliveries to households have a chance to yield one; a pity timer guarantees one every 2 deliveries after 6 |
| L2 | The **bonfire order**: 20 bundles to the square by Day 27 (community order) |
| L3 | Bea confesses she hasn't spoken to her sister **Dot** in 30 years over "a silly thing about a hat". She has written her an invitation; you post it on the Thursday train |
| L4 (Lantern Night, special train 16:00) | You go with Bea to meet Dot at the Halt. A reconciliation scene. Dot stays at the Inn for a week (ambient) |
| L5 | The album is completed with a new town photo from Lantern Night, with you in it. *Reward:* framed town photo, Bea's framed hand-drawn map, mail-order crate +10% |

---

#### 6. Ines Castellano (38): blacksmith, Anvil & Ember
- **Look:**
  - Tall, athletic.
  - Thick dark braid, forge goggles on her forehead.
  - Leather apron over a charcoal work jacket, sleeves rolled (burn-scarred forearms).
  - Gauntlets hanging from her belt.
  - *Silhouette: goggles + braid + apron.*
- **Personality:** precise, dry wit, perfectionist, few words. Soft on kids and dogs. Learned from **abuela Pilar**. Reigning checkers champion.
- **Home:** cottage behind the forge. Dog **Anvil**.

**Schedule**

| Day | Schedule |
|---|---|
| Weekday | 06:30 lights the forge (sparks from the chimney) · 07:30–17:30 forge and counter (hammering) · 12:00–12:40 lunch on the bench outside with Anvil (weather permitting) · 17:30–18:30 walks Anvil round the square and School Hill · 18:30 home |
| Wednesday | Checkers night 19:00–21:00 |
| Saturday | Forge demo at the market 10:00–12:00 (kids watch) |
| Sunday | Closed. 10:00–14:00 ice fishing (after the lake opens) |

- **Economy:**
  - Axes, mauls, wedges, saws, shovels, roof rake, auger, wheelbarrow, shed kits, stoves, lanterns, sharpening.
  - **Buys oak ×1.2** (charcoal kiln) plus a little shop firewood.
- **Relationships:**
  - Rusty: friendly rival ("Tools have no soul." "Tools ARE soul.").
  - Pip: adores Anvil.
  - Margo: fishing buddy.
- **Gifts:** loves *lake trout*, *maple syrup jar*. Likes *carved bear*, *cardamom bun*, *cocoa tin*.
- **Sample lines:**
  - "Sharp is not a feeling. Sharp is a fact. Bring it here, I'll show you."
  - (after you buy the maul) "Let it fall. Don't push it. It knows the way down."

**Arc — "The Wren Weathervane"**

| Level | Beat |
|---|---|
| L1 (needs Forester's Axe) | Bring 3 bundles of **oak**, from the farm's old oaks or deadfall, for charcoal |
| L2 | She shows you the sketch of Wrenhollow's copper **wren weathervane**, lost in the Great Storm of '78. She'll forge a new one for the centennial |
| L3 | The old iron base is in Rusty's scrap yard. Broker the trade: Rusty wants 10 oak bundles for his garage stove. Ferry the base |
| L4 (night scene, Day 25–27) | You work the **bellows** (a rhythm: hold and release with the forge roar) while she forges the wren. Showcase of sparks, glow and ringing hammer. It's mounted on the hall for Lantern Night: a **visible world change** |
| L5 | She re-hafts **Old Faithful** (Hal L5) and forges you a **Master Maul** (free). *Reward:* iron candle holder (decor) |

---

#### 7. Russell "Rusty" Okafor (54): mechanic, town plow driver
- **Look:**
  - Big, broad, beaming.
  - Navy coveralls with name patch, orange trapper hat with ear flaps.
  - Grey-flecked beard, grease on his cheeks.
  - Wrench in the chest pocket.
  - *Silhouette: wide + ear flaps.*
- **Personality:** jovial, sings badly, terrible puns, loves old engines. Lives alone with **Carb** the garage cat.
- **Home:** above the garage (N1).

**Schedule**

| Day | Schedule |
|---|---|
| After ≥ 4 cm of snow | 05:30–07:00 town plow run |
| Weekday | 07:30–17:30 garage (under trucks, clanking) · 12:00–13:00 lunch at The Kettle · 17:30–19:30 tinkers on his secret project · Tu/Th Hal visits |
| Wednesday | Checkers night |
| Saturday | Garage until 12:00 · market in the afternoon |
| Sunday | Ice fishing with Margo 08:00–12:00 (after the lake opens) |

- **Economy:**
  - Truck repair and upgrades.
  - Towing (free).
  - Gives side-road **plow jobs** once you have the blade.
  - Buys oak for the garage stove.
- **Relationships:**
  - Ines: rival and friend.
  - Hal: knew *Marigold* new.
  - Margo: fishing buddy.
  - Wendell: fellow ham.
- **Gifts:** loves *cardamom bun*, *burbot* ("the uglier the better"). Likes *maple syrup jar*, *carved bear*, *cocoa tin*.
- **Sample lines:**
  - "Marigold! Look at you. Somebody's been feeding you proper. Oil's like soup for trucks, y'know."
  - "What do you call a truck that plows and sings? Me, in about six hours. Coffee first."

**Arc — "The Parade Engine"**

| Level | Beat |
|---|---|
| L1 | Reveals he's restoring the town's 1938 fire engine for the Lantern Night parade. *Gift:* **Radio Antenna** (free) — "Marigold deserves music" |
| L2 | He needs the engine's **brass bell** from the hall attic. Ask Bea, then fetch it |
| L3 | 10 bundles of oak to heat the garage for night work, plus a bracket only Ines can forge. He's too proud to ask; you broker it (ties to Ines L3) |
| L4 (Lantern Night) | The parade. You ride on the engine's running board, bell clanging, down Main Street |
| L5 | *Reward:* iron-wren **hood ornament** for *Marigold* (made with Ines), a free paint job, 20% off all garage items |

---

#### 8. Nadia Sörensen (45): outfitter, Sörensen's Woolens
- **Look:**
  - Slim, elegant.
  - Long silver-blonde braid over one shoulder.
  - Red/white Nordic-pattern poncho, huge pompom hat, red mittens, tall boots.
  - *Silhouette: poncho triangle + pompom.*
- **Personality:** artistic, dreamy, a little dramatic, earnest about craft. Talks about colour, and critiques your outfit (reactive lines).
- **Home:** above the shop (N3).

**Schedule**

| Day | Schedule |
|---|---|
| Weekday | 09:00–17:00 shop (knitting at the counter) · 12:00–13:00 lunch at The Kettle · 17:00–18:00 walk to the square · evenings knitting at her window (visible silhouette) |
| Saturday | Market stall 09:00–14:00 |
| Sunday | 14:00–16:00 skating at the lake (after the lake opens) |

- **Economy:** clothing, dyes, sled, snowshoes, skates, textile decor.
- **Relationships:**
  - Otto: wool supplier.
  - Wendell: she makes his costumes.
  - The Delacroix sisters: knitting circle.
- **Gifts:** loves *tea tin*, *pinecone* (for her window display). Likes *maple syrup jar*, *cardamom bun*, *carved bird*.
- **Sample lines:**
  - (you in the starter coat) "That coat is not a coat. It is a suggestion of a coat. Come inside, please, before I cry."
  - (you in the parka) "Oh — oh, yes. Now you look like someone winter is afraid of."

**Arc — "The Wrenhollow Sweater"**

| Level | Beat |
|---|---|
| L1 | Deliver dyed yarn to Otto's farm (first reason to walk the Farm Lane) |
| L2 | She finds her grandmother's lost **Wrenhollow sweater** pattern and needs undyed wool from Otto's store (Otto L1+) |
| L3 | Natural dye: onion skins from Gus plus 3 birch bark rolls from you |
| L4 (Lantern Night eve) | Knitting marathon: she makes costume scarves for Wendell's pageant, and something secret |
| L5 | *Reward:* the **Wrenhollow Sweater** (+0.08 insulation). She names a pattern after you |

---

#### 9. Wendell Ashgrove (66): innkeeper, retired actor
- **Look:**
  - Tall, thin, elegant.
  - Long charcoal coat with a fur collar, a burgundy scarf flung dramatically, tall astrakhan hat.
  - Trim white goatee, pocket watch.
  - *Silhouette: tall + tall hat.*
- **Personality:** theatrical, grandiloquent, kind, nostalgic. Worried about the inn.
- **Home:** the Snowdrift Inn.

**Schedule**

| Day | Schedule |
|---|---|
| Weekday | 07:00–10:00 breakfast for guests · 10:00–12:00 inspects fireplaces, reads in the lobby · M/W/F 12:00–13:00 lunch at The Kettle with Mara · 13:00–17:00 front desk · 17:00–19:00 evening promenade on Main Street, reciting · 19:00–22:00 hosts by the fire |
| Sunday | 14:00–17:00 rehearsals at the hall (from Day 15) |

- **Economy:**
  - Inn contract (Tier 2), birch +15%.
  - Roof jobs.
  - Buys carved figures for the gift shelf.
  - The grand-fireplace seat (warmth, time-lapse).
- **Relationships:**
  - Mara: niece.
  - Bea: co-chair.
  - Nadia: costumes.
  - Hal: "the only man in town with worse knees."
- **Gifts:** loves *applewood split* ("smells like the green room of '72"), *maple syrup jar*. Likes *carved bear*, *tea tin*, *whitefish*.
- **Sample lines:**
  - "Ah! The keeper of the flame! Enter, enter — the fire has been expecting you."
  - (promenade bark) "…and lo, the snow did fall upon the just and the unjust alike, though mostly upon my hat…"

**Arc — "The Last Act"**

| Level | Beat |
|---|---|
| L1 | The inn is half empty. He'll revive the **Lantern Night Pageant**. Deliver flyers to 6 households |
| L2 | The hall must be warm for rehearsals: 10 birch bundles (community order), plus Nadia's costumes (link) |
| L3 | Casting: recruit Hal (reluctant), Pip (too eager) and Gus (a deadpan narrator) through dialogue chains |
| L4 (Lantern Night) | The pageant. You play the Lantern Bearer and cross the stage (comedy beat) |
| L5 | A letter: the inn is fully booked for next winter thanks to a newspaper review. *Reward:* playbill (decor), a permanent grand-fireplace seat |

---

#### 10. Elin Park (34): schoolteacher, pianist
- **Look:**
  - Petite.
  - Black bob with bangs, round glasses.
  - Camel coat, white earmuffs, green scarf.
  - Canvas satchel of sheet music.
  - *Silhouette: bob + earmuffs.*
- **Personality:** gentle, organized, curious, quietly determined, shy with adults. Moved here 3 years ago and still feels "new".
- **Home:** Main St N7 (+66, −16). At night, **generative piano drifts from her lit window** (diegetic music).

**Schedule**

| Day | Schedule |
|---|---|
| School days | 07:30 to school · 08:00–15:00 classroom (recess duty 10:30 and 12:30) · 15:00–16:00 supervises School Hill · 16:00–17:00 marks papers at The Kettle · Tu/Th 17:00–18:00 choir practice at the hall · evenings piano at home |
| Saturday | 10:00–12:00 library corner at the hall |
| Sunday | Clear nights: stargazing (after Freya L2, at the lookout with Felix and Freya) |

- **Economy:** school contract (2 bundles, Mondays); birch-bark craft order; buys pinecones.
- **Relationships:**
  - Freya: former student.
  - Pip: student, handful.
  - Mara: friend.
  - Mr. Quill: her predecessor.
- **Gifts:** loves *star chart*, *tea tin*. Likes *pinecone*, *birch bark roll*, *cardamom bun*.
- **Sample lines:**
  - "Aya asked me today whether snowflakes get lonely. I said no, there are so many. She said 'that's not what I asked.' I've been thinking about it all afternoon."
  - (passing her house at night) *(piano through the window; a caption if enabled)*

**Arc — "The Midwinter Concert"**

| Level | Beat |
|---|---|
| L1 | 5 **birch bark** rolls for the class's Lantern Night lanterns |
| L2 | The hall piano is badly out of tune. Fetch a tuning hammer from Ines and warm the hall (a community order shared with Wendell's) |
| L3 | Sit at the piano and play the first phrase of the **Wrenhollow Lullaby** while she tunes (piano mini-activity) |
| L4 (Lantern Night) | The kids' choir sings the Lullaby with Elin at the piano. **Music highlight:** the main theme in full arrangement |
| L5 | "I think I live here now." *Reward:* **music box** (decor, plays the theme). The gramophone unlocks the choir version |

---

#### 11. Otto Lindqvist (57): farmer, maple syrup maker
- **Look:**
  - Huge, barrel-chested.
  - Brown canvas barn coat, suspenders, red-and-white knit cap.
  - Massive blond-grey beard with frost in it.
  - Always carrying a bucket or pitchfork.
  - *Silhouette: huge + beard.*
- **Personality:** quiet, slow, deep laugh, stubborn, proud. Speaks in weather proverbs. "It's been me and Freya since she was small." (No more detail.)
- **Home:** farmhouse.

**Schedule**

| Day | Schedule |
|---|---|
| Daily | 05:00 barn chores (barn lit) · 07:00 breakfast · 08:00–12:00 farm stations (fences, hay by tractor, from Day 40 sugar-shack prep) · 12:00 lunch · 15:00–17:00 barn · 19:00–21:00 whittles tool handles by the stove · 21:00 sleep |
| Tuesday and Saturday | 13:00–15:00 tractor to town with Freya (store; Saturday market stall: eggs, wool, syrup) |

- **Economy:**
  - Farm household orders.
  - **Farm Lane plow job** (25c).
  - Applewood (orchard, L2).
  - **Sugar-shack contract** (Day 42–49).
  - Farm-edge birch and oak cutting permission (L1).
- **Relationships:**
  - Freya: daughter.
  - Nadia: wool.
  - Mara: sells her eggs.
  - Hal: an old hunting buddy.
- **Gifts:** loves *tea tin*, *carved bear*. Likes *perch*, *pinecone*, *cardamom bun*.
- **Sample lines:**
  - "Ring round the moon, snow by noon. The moon's never lied to me. Freya says that's not science. The moon says it doesn't care."
  - (maples) "Cut the birch. Cut the old oak by the fence, it's dying proud. But the maples stay. The maples are the farm."

**Arc — "Sugaring Off"**

| Level | Beat |
|---|---|
| L1 | The lane is buried; he needs wood by truck (snow tires or plow). He grants **farm-edge cutting permission** |
| L2 | Prune 6 old apple trees with him (a short "snip" activity), which unlocks **applewood**. He shows his stored wool (Nadia link) |
| L3 | Sugaring prep: stock the sugar shack. Optional pre-stock of up to 40 bundles before Day 42; the contract runs Day 42–49. He worries aloud about Freya |
| L4 (Day 49, Sugaring Off) | The first boil at night: steam, lanterns in the maple grove, the town arrives, **sugar-on-snow** (you pour syrup onto snow: a tiny activity) |
| L5 | Makes peace with Freya's plan (Freya L4 link). *Reward:* a syrup jar in your mailbox weekly (gift item), syrup shelf (decor), "Honorary Lindqvist" knit cap (cosmetic hat) |

---

#### 12. Freya Lindqvist (19): Otto's daughter, stargazer
- **Look:**
  - Tall, lanky, freckled.
  - Long red braid.
  - Teal parka with fur-lined hood, navy beanie with white stars.
  - Binoculars around her neck, notebook and thermos.
  - *Silhouette: hood + binoculars.*
- **Personality:** curious, restless, earnest, nerdy-funny. Torn between the farm and the stars.
- **Home:** farmhouse.

**Schedule**

| Day | Schedule |
|---|---|
| Daily | 06:00–08:00 chores with Otto · 09:00–12:00 studies at the kitchen table |
| Tuesday and Saturday | Rides to town with Otto: post office (letters), The Kettle |
| Other afternoons | Farm |
| **Clear nights** | 20:00–24:00 stargazing: at the farm fields before Ridge access; afterwards at the lookout (Felix drives her) |
| Cloudy nights | Reading at home |

- **Economy:** small orders. Sells hand-drawn **star charts** (gift item, decor).
- **Relationships:**
  - Otto: father.
  - Felix: mentor.
  - Elin: former teacher.
  - Pip: calls her "Space Freya".
- **Gifts:** loves *cocoa tin*, *carved bird*. Likes *pinecone*, *tea tin*, *cardamom bun*.
- **Sample lines:**
  - "That's The Kettle — see the spout? Grandma said it pours the dawn. That's not astronomy. It's better than astronomy."
  - (overcast) "Clouds. The sky's got its curtains shut. Rude."

**Arc — "Northern Lights"**

| Level | Beat |
|---|---|
| L1 (clear night) | Stargazing in the farm fields. Trace "The Red Barn" together (stargazing onboarding) |
| L2 (Ridge access, or Felix's lift) | Meet her at the lookout on a clear night. **First aurora**, guaranteed that night |
| L3 | Her university acceptance letter arrives via Bea. She hasn't told Otto and asks you. The choice (encourage or "the farm needs you?") only changes her lines. Either way she resolves to tell him |
| L4 (Day 38, Meteor Night) | At the lookout with Felix, Elin, Pip and Hal, under the meteor shower, she tells Otto. A tender scene |
| L5 | *Reward:* her **telescope** (porch decor). Reveals the 3 hidden constellations and planet rings. The last constellation traced together is "The Two Old Friends" |

---

#### 13. Margo Vance (69): sauna keeper, ice-fishing legend
- **Look:**
  - Stocky and strong.
  - Orange-brown bib overalls, forest-green ear-flap cap.
  - Weathered face with deep laugh lines, one silver braid.
  - Always a thermos mug in hand.
  - *Silhouette: stocky + ear flaps + overalls.*
- **Personality:** loud, blunt, laughs hard, tells tall tales, fiercely independent, secretly lonely. Courted Hal 40 years ago; both were too stubborn.
- **Home:** the shack at the Stillmere landing.

**Schedule**

| Day | Schedule |
|---|---|
| Daily | 05:30 fires the sauna (smoke) · 06:00–09:00 dawn fishing at her hole · 09:00–12:00 bait shack · 13:00–16:00 tends the sauna · 16:00–18:00 dusk fishing · 18:00–21:00 sauna evenings (Rusty on Tuesdays; Hal after the arc) |
| Saturday | Town market 10:00–12:00 (smoked fish) |
| Day 35 | Derby organizer |

- **Economy:**
  - Sauna contract.
  - Bait, rod, ice-shelter rental.
  - Buys your fish ×0.8 (she smokes them).
- **Relationships:**
  - Hal: the old flame.
  - Rusty, Ines: fishing buddies.
  - Felix: teases him.
- **Gifts:** loves *burbot*, *maple syrup jar*. Likes *perch*, *cocoa tin*, *cardamom bun*.
- **Sample lines:**
  - "Hear that? Pew-pew-pew? That's the ice singing. Tourists think it's aliens. It's just the lake stretching its old bones. Like me."
  - "Hal Brennan. Hmph. Tell him the sauna's hot. Don't tell him I said so."

**Arc — "Old Whiskers"**

| Level | Beat |
|---|---|
| L1 | Teaches ice fishing (free bait) and the legend of **Old Whiskers** |
| L2 | Wants "proper birch, not that pine rubbish" for the sauna. First sauna together. *Reward:* free ice shelter from L3 |
| L3 | Rebuild her old shanty at the pike weed edge: 6 bundles plus a small iron stove from Ines |
| L4 (Day 35, Derby) | You fish beside her. She hooks Old Whiskers and **lets it go** ("some legends ought to stay legends"). Afterwards Old Whiskers can be caught by you on overcast dawns (catch-and-release gives a special ribbon) |
| L5 | She sends you with a note to Hal: "Tell the old goat the sauna's hot Tuesday." Resolves with Hal L5. *Reward:* ship-in-a-bottle (decor), **Golden Lure** (bites +30%) |

---

#### 14. Felix Moreau (44): forest ranger, lookout keeper
- **Look:**
  - Medium build.
  - Forest-green ranger jacket with patches, brown fur-trim cap with badge.
  - Wire glasses, neat dark beard with grey.
  - Rope coil, compass, walking staff.
  - *Silhouette: ranger cap + staff.*
- **Personality:** soft-spoken, patient, dry humour, a gentle scientist of trees. Solitary.
- **Home:** Ranger Station.

**Schedule**

| Day | Schedule |
|---|---|
| Daily | 07:00–09:00 ridge patrol (marks snags, fills the station feeder) · 09:00–12:00 station desk · 13:00–16:00 patrol (lookout, trail) · clear nights 20:00–23:00 at the lookout |
| Thursday | 10:00–13:00 in town by pickup (post office, The Kettle) |

- **Economy:**
  - Ranger contract (4 bundles weekly).
  - Free saplings.
  - Deadfall map (L1).
  - Pays 1c per 5 pinecones (seed program).
- **Relationships:**
  - Freya: mentee.
  - Margo: teases him.
  - Hal: respects him.
  - Otto: a neighbour of sorts.
- **Gifts:** loves *pinecone*, *star chart*. Likes *tea tin*, *whitefish*, *carved bear*.
- **Sample lines:**
  - (looking at tracks) "Fox. See how the prints are in a line? She walks like she's on a tightrope. Foxes are very neat."
  - "Every tree you cut, plant one. It's not a rule. It's a conversation with whoever comes after you."

**Arc — "The Grandmother Oak"**

| Level | Beat |
|---|---|
| L1 | Sustainable harvest: plant 10 saplings anywhere. *Reward:* **deadfall marked on your map** |
| L2 | Survey 5 marked old-growth oaks (walk to each and measure). The story of the 400-year-old **Grandmother Oak** |
| L3 (next Blizzard after L2) | A great limb cracks off the Grandmother Oak: unique **Heritage Oak** rounds (×2 value). Choice: sell them, or give them to the town (Ines's forge and the hall stage). No wrong answer; lines and a small reward differ |
| L4 (Day 38) | Meteor Night with Freya. He plans a **dark-sky preserve** on the ridge. Deliver 6 petition letters |
| L5 | The preserve is approved. The lookout gets a plaque naming you "Keeper of the Woodlot". *Reward:* pressed-leaf frame (decor), the **Forester's Map** (collectible hints for birds, fish and stars) |

---

**Relationship web (quick reference, used for cross-references in dialogue)**
- **Family:** Mara–Pip, Mara–Wendell (uncle), Gus–Bea (cousins), Bea–Dot (sisters), Otto–Freya.
- **Best friends:** Hal–Gus, Mara–Bea, Rusty–Margo (fishing).
- **Rivals:** Ines–Rusty (friendly), Pip–Kenji.
- **Mentors:** Hal→you, Felix→Freya, Elin→kids, Margo→you (fishing), Ines→Pip (awe).
- **Old flame:** Hal–Margo (resolves as late-life companionship).
- **Colleagues:** Bea–Wendell (festival committee), Nadia–Wendell (costumes), Nadia–Otto (wool).

### 3.6 Festivals, weekly rhythms, and the Winter's shape
**Festival rules**
- Festivals are **opportunities, never deadlines.**
  - Attending gives +1 friendship with everyone present, a unique decor item or ribbon, and scenes.
  - Missing one gives "We missed you!" lines, and any arc beat moves to a private fallback on the next suitable day.
- On festival days, the NPC schedule festival layer takes over from 2 hours before start. Shops close early, with a sign.
- Decorations appear the day before (Lantern Night: from Day 21).

| Day | Festival | Where / when | What happens | Player activities | Rewards |
|---|---|---|---|---|---|
| 1 (Mon) | **First Snow Supper** | Meeting Hall 18:00–21:00 | Potluck soup; everyone introduces themselves | Meet everyone (first-meeting lines) | +1 all, soup bowl decor |
| 14 (Sun) | **Hearth Fair** | Square 10:00–16:00 | Stalls, baking (Mara 2nd, Otto's rye 1st), Rusty's chili cook-off, splitting demo | **Holzhausen contest:** build a round beehive woodpile (up to 3 m diameter) in a marked ring by gathering from a provided pile. Judged on height, roundness and neatness (computed from piece placement). Everyone gets a blue, red or white ribbon. **Splitting demo:** split 10 rounds; style points are clean splits; no timer | Ribbon (decor), 15–40c, +1 all |
| 21–27 | Lantern Week | Town | Paper lanterns across Main Street; Bea's bonfire order; arc prep (Hal, Ines, Rusty, Wendell, Elin, Nadia) | Deliveries, arc beats | — |
| 28 (Sun) | **Lantern Night** (centennial) | Hall → Square, 16:00–23:00 | 16:00 special train (Dot) · 17:00 lantern procession · 18:00 Rusty's fire-engine parade · 18:30 Wendell's pageant · 19:30 Elin's choir sings the Wrenhollow Lullaby · 20:00 bonfire (your wood) and Lantern Tree lighting, the **wren weathervane** unveiled · 22:00 aurora. Guaranteed clear sky and full moon | Carry a lantern in the procession, ride the engine, play the Lantern Bearer, light the bonfire (you get the honour) | The emotional peak; town photo (Bea L5), +2 all |
| 35 (Sun) | **Ice-Fishing Derby** | Stillmere 07:00–14:00 | Everyone fishes; Mara's soup tent; free sauna | Fish; the biggest per species wins a category | Derby trophy (decor), 20–60c |
| 38 (Wed) | Meteor Night *(small event)* | Lookout 21:00–01:00 | Freya, Felix, Elin, Pip, Hal, Otto | Stargaze (60 meteors/h) | Freya and Felix arc beats |
| 42 (Sun) | **Sled Race & Snow Sculpture Day** | School Hill 10:00–15:00 | Races by age; sculpture plots; a 14:00 snowball "war" (kids vs adults) | Race (flag gates, no time pressure, cheerful results); sculpt in a plot (the snowman tools, plus 3 shaping stamps: carve, smooth, add); **snowball fight** (RMB throws, no health, splat counts) | Medal (decor), +1 all |
| 49 (Sun) | **Sugaring Off** | Lindqvist Farm 16:00–21:00 | First boil (your wood), lanterns in the maple grove, fiddle tunes (generated), sugar-on-snow | Pour taffy, ride the hay sled | Syrup jar, +1 all |
| 56 (Sun) | **Long Night's End** | Stillmere shore 18:00–23:00 | Townsfolk place **ice lanterns** along the shore; a bonfire on the ice; farewell toasts | Place ice lanterns (a gentle placement activity), sit by the fire | Then the time-skip card and Year 2 |

**Festival activity details**
- **Holzhausen contest (Hearth Fair):**
  - A chalk ring (2.4 m) on the square and a provided pile of 120 splits.
  - A special stacking mode: a ghost piece follows your aim along the current layer's circle. The mouse wheel rotates it (bark out, or bark up for the "roof" layer). LMB places it. Layers snap as each ring closes.
  - Finish with "Done" whenever you like. There is no timer.
  - `score = 0.4 × min(1, layers / 10) + 0.4 × roundness (1 − stdev(radius) / mean radius) + 0.2 × closure (1 − gap fraction)`, plus +0.1 for a bark-up roof layer.
  - Ribbons: blue ≥ 0.8, red ≥ 0.55, white otherwise. The display stays in the square until Lantern Week, and NPCs admire it.
- **Borrowed gear:** Margo lends an auger and rod on Derby day. The festival lends a sled for the race if you have none. Nobody is excluded by purchases.
- **Market stall (Saturdays, Tier 2+):**
  1. Park near your stall spot on the square and hold E to set out up to 10 bundles.
  2. Buyers (townsfolk and Inn guests) come by every ~10 game minutes and buy 1–2 bundles, with a short bark and payment.
  3. Unsold wood returns to the truck at 14:00.
  4. Sitting at the stall supports time-lapse.

**Weekly rhythms**

| When | What |
|---|---|
| Wednesday 19:00–21:00 | Checkers night at The Kettle (watch; Ines usually wins) |
| Thursday | Train Day, parcel runs, mail-order crate |
| Saturday | Market Day 09:00–14:00. **Your stall** (Tier 2+): sell bundles to the public at delivery price ×1.1, up to 10 bundles, while you chat |
| Sunday | Café brunch, 17:00 hall potluck (drop in for soup and overheard chats, +1 friendship with those present) |

**Year 2 and beyond**
- Festivals repeat with *anniversary variants*:
  - Lantern Night has Elin's choir singing a new song.
  - The Derby has a "beat your record" board.
  - Wendell stages a new pageant.
- Completed arcs switch to **epilogue pools** (about 15 lines each), reflecting how things turned out: Freya's letters from university, Hal and Margo at the sauna, Dot visiting.
- New small Year 2 vignettes (2–3 per character) keep the town moving.
- Prices and orders ×1.1. All shops keep full inventories. Cosmetics rotate monthly.

**Arc pacing across the Winter** (typical player; checked in the econ/progression sim)

| Week | Days | Pacing |
|---|---|---|
| 1 | 1–7 | L1 beats: Hal, Mara, Gus, Bea, Ines, Rusty, Nadia, Pip, Elin |
| 2 | 8–14 | Lake opens (Margo L1). Hearth Fair (Mara L2) |
| 3 | 15–21 | Farm access (Otto L1–L2), L2 beats in town, Wendell L1–L2 |
| 4 | 22–28 | Lantern Week: most L3–L4 beats converge on Lantern Night |
| 5 | 29–35 | Ridge access (Felix L1–L2, Freya L2). Derby (Margo L4) |
| 6 | 36–42 | Meteor Night. Sled Race. Gus L4 |
| 7 | 43–49 | Mara L4 café day, Sugaring Off |
| 8 | 50–56 | L5 finales. Long Night's End |
