# Review: Soundtrack — Wrenhollow Lullaby (Lab #1)

- **Lab link:** https://claude.ai/artifact/JiveVgK6AeMt8GvXXvoAcu
- **Status:** in review

## Round 1 (2026-09-24)
- **What's in it:** synthesized felt piano, warm pad and music box. The director performs a fresh variation per seed: form, chord colours, accompaniment patterns, ornaments, music-box echoes, rests. Three moods: clear, snow, night. Sliders for tempo, instrument levels, reverb and volume.
- **QA before publishing:** offline renders of all moods × 2 seeds, peak ≤ −6 dB, 0 clicks, no DC. Headless browser check: plays, advances, switches mood, no errors.
- **Feedback:** no direct notes on the Lab. Instead, the user supplied a separate main theme (`hearthwood_main_theme.ogg`, 2:54) that they "quite like", and asked for an unbiased verdict on which is better.

### Comparison: the user's theme vs P01 (measured; I can't hear)
Both tracks went through the same pipeline: loudness (BS.1770), long-term spectrum, stereo, tempo, key and chords (chroma), a self-similarity structure map, and basic-pitch transcription. I calibrated it on P01 first, where it recovered D major, 66 bpm and the right chords.

| | User's theme | P01 (clear, seed 1) |
|---|---|---|
| Form | A (0:00–0:57) – B (0:58–1:35) – A′ – coda (from 2:30). In B the low-F drone drops about 20 dB and the harmony lifts: G/D centre, B♮ in place of B♭. | intro A A2 B A3 outro, but the texture and register barely change, so there's little large-scale contrast. |
| Dynamics | Integrated −18.0 LUFS, loudness range 11.4 LU, climax around 2:00–2:10 (−10.5 LUFS short-term), 25 s wind-down. | −21.0 LUFS, 5.9 LU, no real climax. |
| Stereo | L/R correlation 0.54, side/mid −5.2 dB: wide. | 0.955, −16.4 dB: nearly mono. |
| Low end | Sustained F1 pedal (≈ 44 Hz); 6.4 % of energy below 60 Hz. | Nothing below about 70 Hz; a bump at 90–150 Hz. |
| Harmony | F major pentatonic with sus chords over a drone: open, modal, wintry. | D-major I–V–IV–vi lullaby: sweet but conventional. |
| Texture | Pads, plucked/bell notes, a soft broadband air bed, a vibrato lead late on. | Felt piano, pad, music box; a silent, dry background. |
| Tempo / meter | ≈ 72 bpm, duple. | 66 bpm, 3/4. |

- **Verdict:** as a piece of music and as a main theme, the user's track is stronger: form, arc, width, low end and harmonic colour. P01's advantages are the system's: it's adaptive (it never repeats, and follows weather and time of day), it's generated in code, and it carries no licensing risk.
- **The track looks synthesized** (dead-straight partials, a synthetic vibrato, an ffmpeg-encoded file with no tags). Provenance and licence were asked about on 2026-09-24.
- **Recommendation given:**
  1. Use the track as the main theme (title screen and big moments) if the rights are clear.
  2. Retune the generative engine toward its sound for in-world music: wider stereo, a low pedal, modal/pentatonic harmony with sus chords, real arcs with a contrasting middle, a soft air bed.
  3. Ideally, port the theme into the engine as its own piece, so night and snowfall versions exist.
- **Engine gaps exposed (fix regardless of the decision):** narrow stereo image; no sub or pedal layer; flat dynamic arc; weak sectional contrast; piano attacks brighter than a felt piano's; no ambient bed.
- **Waiting on:** the user's answer on provenance and the direction.

## Approved values
_(to fill in on approval, then copy into `src/data/music/*`)_
