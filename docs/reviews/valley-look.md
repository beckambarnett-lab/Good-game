# Review: Valley look (Lab #4)

- **What's reviewed:** how the valley looks: the light (sun against sky fill), soft light on snow and trees, the colour of shade, fog and distance haze, and the colour grade (warmth, colour strength, contrast, lifted darks, split toning, grain, vignette). Plan Parts 5.2, 5.9 and 5.10.
- **Lab link:** https://claude.ai/artifact/5ogEf6mcnRK97g4cs6e5WW
- **Status:** in review

## Round 1 (2026-09-26)
- **What's in it:**
  - The real valley and the game's own App and renderer, drawn in two looks:
    - **Today** is what the game draws now (`look` in `src/data/tuning.ts`, neutral);
    - **Proposed** is the art plan's look (`proposedLook`), which the sliders tune.
  - Flip with the switch, or hold C to see the other look while the key is down.
  - Four fixed views from the art QA shot list: Woodlot (S02, cast shadows on snow), Cabin porch (S01, open snow), Main Street bend (S04, distance) and Lookout (S08, forest and haze). WASD walks on from the view.
- **What the proposal changes:**
  - **HearthMaterial** (one patch over three's Lambert material, on the terrain, the trees and the walker):
    - wrap diffuse, which softens where light turns to shade;
    - shaded sky light tinted toward the snow-shadow blue instead of grey;
    - trees 8 % darker at their base;
    - fog measured through the air (not view depth), a little thinner higher up.
  - **The Grade** (after tone mapping): lift, saturation, contrast, split toning (cool shade, warm light), animated film grain, and a vignette of 0.25.
  - **Light trims:** the sun at 115 %, the sky fill at 100 %.
- **Starting values:** the plan's (Part 5.9: wrap 0.25; Part 5.10: grain 0.02, vignette 0.25; Part 5.3's noon key frame: contrast +0.05), with one deliberate change:
  - Soft light on snow starts at 0.20, not the plan's 0.40. At 0.40 the snow's relief flattened in the cabin view.
  - The sun goes to 115 % instead, which keeps the snow as bright as the plan's value would but leaves more shape on shaded slopes.
- **Measured against the Part 5.2 snow palette** (woodlot view; lit snow `#F4F7FB`, shadow `#B9CBE3`, deep shadow `#8FA5C8`):

  | Snow in view | Today | Proposed |
  |---|---|---|
  | Lit | `#E4E9F1` | `#F3F5F9` |
  | In cast shadow | `#8BA1BC` (grey-blue) | `#8BA8D1` (blue) |

  On open flat snow (the cabin view) the proposal reads bright, and the gentle dunes show less shape. The sun, sky and soft-light sliders are the ones to try there.
- **Sliders:**
  - **Light:** sun, sky light.
  - **Shade:** soft light on snow, soft light on trees, blue in the shade, trees darker at the base.
  - **Fog:** thickness, how much it hugs the valley floor, how deep the low haze is.
  - **Colour:** warmth, colour strength, contrast, lifted (bluer) darks, cool shade / warm light, film grain, vignette.
  - **Buttons:** Copy settings, Reset (back to the proposal).
- **QA:**
  - Unit tests: HearthMaterial patches three's shader chunks at every anchor and fails loudly if they change; the game's look is neutral.
  - Shots: the neutral look draws exactly what the game drew before. Main Street (S04) was pixel-identical with and without HearthMaterial, and moving the vignette and fog into the look left the woodlot and lookout shots pixel-identical. `npm run shots -- --look=proposed` renders the proposal into `artifacts/shots/look-proposed/`.
  - Shots now hold their finished frame for the screenshot, so every shot is pixel-identical from run to run. Before, distant trees swayed by however many frames ran before the capture.
  - The headless lab check:
    - measures the snow in the woodlot view: proposed 203 against today 191 (mean luma);
    - checks that holding C flips the look;
    - checks the sun slider: 50 % takes the snow to 187, and Reset brings back 203;
    - holds the Lookout view, then walks on from it;
    - fails on any console error.
- **Found and fixed while building this:**
  - Every dynamic-resolution step showed one blank frame (the page behind the canvas). The resize now lands before the frame is drawn, and an e2e test forces a step every frame: 9 of 10 screenshots were blank before, none after.
  - Lab #3 (Winter walk) had the same flash, so it is republished with the fix (v3).
- **Not verified (needs your eyes):** whether the proposal is the look you want. Only the midday light exists. Dawn, dusk and night come with the day cycle (M1.7), each with its own key frame of the grade.
- **Known placeholders:**
  - The broadleaf trees are grey stand-in shapes. The winter tree kit, with bare branches, comes in M1.
  - The lake has no ice material yet, so from the lookout it melts into the snow.
  - SnowMaterial (sparkle, trodden tint) is its own later piece.
  - Bloom is left as it is: it matters for lamps and windows at night.
- **Feedback:** _(waiting)_

## Approved values
_(fill in on approval, then copy into `src/data/tuning.ts` → `look`, the look the game draws)_
