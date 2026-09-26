# Review: Felling minigame (Lab #2)

- **Design:** the user's swinging-bar idea. Chop when the marker is in the green centre, 3 chops fell the tree, bigger trees swing slower.
- **Lab link:** https://claude.ai/artifact/6WoiRfvAxPesv8yLczJVGh
- **Status:** in review

## Round 1 (2026-09-24)
- **What's in it:**
  - A snowy clearing with a placeholder woodcutter (the real character comes later).
  - Three trees: small birch, medium pine, large pine.
  - The hand-drawn bar with a green zone and a perfect band.
  - Chop and miss swings with synthesized sounds (size-dependent chop, glancing tok, whoosh, creak, crack, fall whoosh, thud), chips, snow shaken from branches, hit-stop, camera shake, and the physical fall (rigid-rod pivot) with a landing bounce and snow cloud.
- **Design detail added:** after each chop the marker restarts from the edge of the bar, so every chop needs its own timing (found during automated testing).
- **Sliders:** green width, perfect width, sweep time per size, chops to fell, axe tier (proposed green bonus), relaxed mode, volume.
- **QA:** unit tests for the minigame logic. A headless browser run lands 3 chops, the tree falls and lands, no console errors. SFX variants checked for clipping and DC.
- **Feedback:** _(waiting)_

## Approved values
_(fill in on approval, then copy into `src/data/tuning.ts` → `felling`)_
