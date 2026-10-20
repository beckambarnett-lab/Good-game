# 雫 Shizuku

A first-person tea shop game. You run a shop under the 8 Line, in a city where it never stops raining. Brew every pot by hand, and build the shop up and out, floor by floor. Built with Three.js 0.160 (loaded from jsDelivr), with no install step.

## Build

```sh
node build.mjs           # → dist/index.html, one self-contained page
node build.mjs --watch   # rebuild on every change in src/
```

`dist/index.html` is the whole game in one file. Open it in a browser through any static server, or publish it as a claude.ai artifact.

## Layout

- `src/index.html`: the page (HUD, phone, dialogue and title markup). `<!-- @css -->` and `<!-- @js -->` mark where the build inlines the code.
- `src/style.css`: all styles.
- `src/js/`: the game, in the order listed in `build.mjs`. The files are **not** separate ES modules. They are joined into one `<script type="module">`, so everything shares one scope, and a file can use anything declared in a file listed before it.

| File | What's in it |
|---|---|
| `a_core.js` | Utilities, game data (recipes, upgrades, staff, chapters, weather), save state |
| `b_render.js` | Renderer, quality tiers, post-processing, lights, baked lighting |
| `c_props.js` | Shared prop builders |
| `d_city.js`, `d_store.js` | The surrounding city, store helpers |
| `e_alley.js`, `e_building.js`, `x_exterior.js`, `e_ground.js` | The alley, the shop building, its facade, the ground floor |
| `f_people.js`, `g_nav.js` | Customers and characters, navigation |
| `h_stations.js` | Brewing stations |
| `i_weather.js` | Rain, weather cycle |
| `j_sim.js`, `j_staff.js`, `j_story.js`, `j_tea.js` | Simulation, staff, story beats, tea brewing |
| `k_ch2.js` … `k_ch5.js` | Chapter 2–5 content |
| `k_ui.js` | HUD, phone and panels |
| `l_audio.js`, `l_cheat.js` | Audio, debug cheats |
| `m_loop.js` | Main loop and boot |
