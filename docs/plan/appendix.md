## Appendix A — Consistency checks performed on this plan
- **Calendar:** Day 1 is Monday, so Days 7/14/21/28/35/42/49/56 are Sundays (all Sunday festivals ✓). Day 38 is a Wednesday (Meteor Night ✓). Thursdays are Days 4, 11, 18, 25… (train ✓). Full moons Days 4, 12, 20, **28** (Lantern Night ✓).
- **First-hour economy:** Hal 20c + 10c, café 7c × 2, 3 shovel jobs ≈ 16c, totalling ≈ 60c. Tote 12c + battery 40c = 52c ✓ (Part 1.4).
- **Time:** 90 s per game hour by day and 45 s at night → 30-minute day ✓. Walking cabin → square (≈ 180 m) takes about 55 s real (≈ 37 game min). Driving takes about 12 s.
- **Gates:** the Farm Lane rise of 14° needs μ ≥ 0.25. Stock tires in 30 cm of snow give 0.23 ✗; snow tires 0.51 ✓; a plowed lane 0.70 ✓. The switchback hairpins at 18° need μ ≥ 0.33. On ice, stock gives 0.15 ✗ and snow tires 0.30 ✗; chains give 0.70 ✓.
- **Progression:** main-path spend ≈ 2,500c versus ≈ 2,400c earned by hour 10 → chains land around hour 10 ✓. Everything ≈ 11,300c, reached around hours 24–26 ✓ (brief asked for 10–20+ h).
- **Schedules:** every NPC's home is within about 1 game hour's walk of their work, or they have a vehicle (Otto tractor, Felix pickup, Rusty wrecker) ✓. Hal's Monday cabin visit is budgeted as a morning-long walk ✓.

## Appendix B — Delivery on approval (this session)
1. Split this document into `docs/plan/` files: `README.md` (index + how to use), `00-assumptions-and-decisions.md`, `01-summary-and-core-loop.md`, `02-systems.md`, `03-town-bible.md`, `04-progression.md`, `05-art-direction.md`, `06-audio-direction.md`, `07-technical-architecture.md`, `08-roadmap.md`, `09-polish-checklist.md`, `10-risks-and-cuts.md`, `appendix.md`.
2. Write `CLAUDE.md`. It covers:
   - The project in one paragraph.
   - "Read `docs/plan/README.md` and `docs/progress.md` first."
   - The session protocol (Part 8.1).
   - Hard rules: the pillars, the sim/view boundary, no copyrighted assets, tunables in data, Definition of Done, never claim done without running the checks and looking at the shots.
   - Environment notes: Playwright `executablePath=/opt/pw-browsers/chromium`, `uv` + `bpy` for assets, no WebGPU and no real GPU in the container.
3. Write `docs/progress.md` with the M0 and M1 task checklists from Part 8, and a short `README.md`.
4. Commit to `claude/lucid-hypatia-j11ko6`, push with `-u`, open a **draft PR** titled "Hearthwood: complete development plan", and subscribe to PR activity.
5. **Verification:**
   - Every Part heading appears in exactly one split file.
   - The index links resolve.
   - A line-count sanity check shows no content was dropped.
   - The rendered markdown was reviewed once.
