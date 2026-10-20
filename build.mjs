// Builds the single-file game (dist/index.html) from src/.
// All JS files share one module scope, in the order below, so a name declared
// in an earlier file is visible in every later one.
//   node build.mjs           build once
//   node build.mjs --watch   rebuild whenever a file in src/ changes
import { readFileSync, writeFileSync, mkdirSync, watch } from 'node:fs';

const MODULES = [
  'a_core.js', 'b_render.js', 'c_props.js', 'd_city.js', 'd_store.js',
  'e_alley.js', 'e_building.js', 'x_exterior.js', 'e_ground.js', 'f_people.js',
  'g_nav.js', 'h_stations.js', 'i_weather.js', 'j_sim.js', 'j_staff.js',
  'j_story.js', 'j_tea.js', 'k_ch2.js', 'k_ch3.js', 'k_ch4.js', 'k_ch5.js',
  'k_ui.js', 'l_audio.js', 'l_cheat.js', 'm_loop.js',
];

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');

function build() {
  const css = read('src/style.css');
  const js = MODULES.map(m => `/* ---- ${m} ---- */\n` + read(`src/js/${m}`)).join('');
  const html = read('src/index.html')
    .replace('<!-- @css -->\n', () => css)
    .replace('<!-- @js -->\n', () => js);
  mkdirSync(new URL('dist/', import.meta.url), { recursive: true });
  writeFileSync(new URL('dist/index.html', import.meta.url), html);
  console.log(`built dist/index.html (${(html.length / 1024).toFixed(0)} KB)`);
}

build();
if (process.argv.includes('--watch')) {
  let t = null;
  watch(new URL('src/', import.meta.url), { recursive: true }, () => {
    clearTimeout(t);
    t = setTimeout(() => { try { build(); } catch (e) { console.error(e.message); } }, 50);
  });
  console.log('watching src/ …');
}
