# Review: Winter walk (Lab #3)

- **What's reviewed:** controls feel (walking, jogging, turning, ice, the hop), the camera (distance, follow, swing-back, FOV, look speed), footsteps on each valley surface, and the valley's occasional felt-piano phrase.
- **Lab link:** https://claude.ai/artifact/9SMnuu8SoFQB7rG7jUoDgN
- **Status:** in review

## Round 1 (2026-09-24)
- **What's in it:**
  - The real valley and the game's own App: the same terrain, forest, movement, camera rig and input code the game runs. The lab only passes live copies of the tuning to its sliders.
  - Five places to jump to: Cabin (powder), Woodlot (among the trees), Main Street (packed road), Lake (ice) and the Lookout (88 m up).
  - Footsteps, resolved from the surface under the walker (Plan 6.8):
    - fresh powder: a "whumpf" and 30–80 tiny fractures over 120–250 ms (10 variants);
    - packed snow: a firmer, shorter crump with a toe scuff (8);
    - ice: a glassy heel click, a short slide with frost grit, a softer toe click (8);
    - cold squeak on packed snow at −15 °C or colder, as stick-slip chirps (6); the lab's Cold snap switch sets −18 °C;
    - a coat rustle on every step at −12 dB (6).
  - Variation per step: never the same variant twice in a row, pitch ±5 %, gain ±1.5 dB, left/right foot pan ±0.05. Jog steps are about 2 dB louder and 600 Hz brighter. Slow steps are softer. A hop lands with both feet.
  - The valley's music for M0: now and then one 4-bar felt-piano phrase of P01 (the answering phrases, which end home), performed fresh each time, with rests by the Music frequency setting (the lab defaults to Often). The mix follows Plan 6.10: the music bus sits 8 dB under world sound effects.
- **Sliders:** walking and jogging speed, time to get going and to stop, turn speed, step length (sets the footstep cadence), grip on ice, hop height; camera distance, follow tightness, swing-back delay and speed, field of view, look sensitivity; footsteps level, coat rustle, music volume, phrase frequency. Switches: jog toggle, camera swing-back, cold snap. "Play a phrase now" for the piano.
- **Starting values:** the plan's numbers (Plan 2.3) for movement and camera. The step lengths are new: 1.40 m walking (146 steps/min at 3.4 m/s) and 1.80 m jogging (173/min at 5.2 m/s).
- **Input:** if the page can't lock the pointer (some embedded frames can't), dragging looks around instead. Keys a focused slider or button uses stay with the panel; W/A/S/D and Shift always walk.
- **QA:**
  - Unit tests: the footstep planner (surfaces, no repeats, variation bounds, rustle −12 dB, squeak threshold, landing, slow steps), the jog loudness and brightness as played, crunch timing and grain counts, loudness spread across variants, the phrase mode and the rests between phrases.
  - `npm run audio` renders every SFX variant and a 28 s walk over powder, powder jogging, road, road at −18 °C and ice, with a phrase underneath. All within peak, DC and spread limits. I looked at the spectrograms: fresh-snow steps were hissy above 8 kHz, so steps now roll off above 8 kHz (ice above 11 kHz).
  - The headless lab check walks on powder, the road with the cold snap and the lake. It checks that each surface's footsteps sounded, that the walking-speed slider changes the measured speed to 2 m/s, that a phrase plays, and that there are no console errors.
- **Not verified (needs your ears and hands):** how the footsteps and the phrase actually sound, and how walking and the camera feel.
- **Known placeholders:** the walker is the felling lab's woodcutter (the Blender character comes in M1). Lighting and the snow's look are M0 stand-ins, and the world edge shows past the lake. There is no wind or ambience yet: that is its own lab.
- **Feedback:** _(waiting)_

## Approved values
_(fill in on approval, then copy into `src/data/tuning.ts` → `movement`, `gait`, `cameraRig`, `footsteps`, `valleyMusic`, and switch the game's `footstepSounds` / `valleyPhrases` on)_
