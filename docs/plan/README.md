# Hearthwood — Development Plan (index)

> Working title: **Hearthwood**. A slow, low-poly, third-person winter game about keeping a small mountain town warm.
> This is the build bible. Build the game by following the Roadmap (Part 8) milestone by milestone. Use the other parts for rules, numbers and content.

## How to use this plan
- **Starting a session?** Read the repo-root `CLAUDE.md`, then `docs/progress.md`, then only the parts relevant to your current task.
- **Numbers are starting values.** They move into `src/data/tuning.ts` and get tuned by the econ simulator and playtests. If a number changes, update the plan too, so the plan and the code never disagree.
- **Decisions:** the plan's decisions are deliberate (see Part 0.4). To change one, write a short ADR in `docs/decisions/` explaining why.

## Parts

| # | File | What's inside |
|---|---|---|
| 0 | [00-assumptions-and-decisions.md](00-assumptions-and-decisions.md) | Context, environment facts, assumptions, strong decisions |
| 1 | [01-summary-and-core-loop.md](01-summary-and-core-loop.md) | One-page summary, pillars, first 10 minutes / first hour / hour ten / hour twenty |
| 2 | [02-systems.md](02-systems.md) | Time, weather, player/camera/controls, snow, firewood loop, warmth and clothing, economy, vehicles, townsfolk AI and dialogue, side activities, save/settings/menus/onboarding |
| 3 | [03-town-bible.md](03-town-bible.md) | Map and coordinates, locations, interiors, households, ambient life, all 14 characters (schedules, arcs, lines), festivals |
| 4 | [04-progression.md](04-progression.md) | Full upgrade catalogue with costs, dependency tree, unlock timeline |
| 5 | [05-art-direction.md](05-art-direction.md) | Style, palette, lighting key frames, asset pipelines (TS procedural + headless Blender), characters and animation, VFX, shaders, post, UI art, QA shots |
| 6 | [06-audio-direction.md](06-audio-direction.md) | Audio engine, Sound Foundry, generative music system (pieces, keys, tempos, main theme), instruments, ambience, SFX, footsteps, spatial, mixing, audio QA |
| 7 | [07-technical-architecture.md](07-technical-architecture.md) | Stack, repo layout, runtime architecture, modules, data and save formats, performance budget, tooling and verification, conventions |
| 8 | [08-roadmap.md](08-roadmap.md) | Session protocol, milestones M0–M12 with deliverables and done criteria |
| 9 | [09-polish-checklist.md](09-polish-checklist.md) | Juice table per action, transitions, UI/UX, onboarding, accessibility, audio/visual consistency, perf, bugs, saves, content QA |
| 10 | [10-risks-and-cuts.md](10-risks-and-cuts.md) | Risk register, cut order, never-cut list |
| A | [appendix.md](appendix.md) | Consistency checks, delivery notes |
