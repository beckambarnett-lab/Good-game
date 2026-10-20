import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* ================= utilities ================= */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (n, m) => ((n % m) + m) % m;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
let seedS = 1234567;
const srand = () => { seedS = (seedS * 16807) % 2147483647; return (seedS - 1) / 2147483646; };
const srange = (a, b) => a + srand() * (b - a);
const spick = a => a[Math.floor(srand() * a.length) % a.length];
const reseed = s => { seedS = (s % 2147483646) + 1; };
const smooth = t => t * t * (3 - 2 * t);
const smoothstep = (a, b, x) => smooth(clamp((x - a) / (b - a), 0, 1));
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const lerpAngle = (a, b, t) => { let d = mod(b - a + Math.PI, Math.PI * 2) - Math.PI; return a + d * t; };
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const fmt = n => Math.round(n).toLocaleString('en-US');
const yen = n => '¥' + fmt(n);
const COARSE = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEBUG = !!window.__szDebug;

/* ================= data ================= */
// tea minutes: 1 tea minute = 4 real seconds
const TEA_MIN = 4;
const RECIPES = [
  { id: 'sencha', name: 'Sencha', jp: '煎茶', st: 'kettle', price: 380, temp: 80, steep: 1.0, ch: 0, liq: 0xb5c45e, icon: '煎' },
  { id: 'genmai', name: 'Genmaicha', jp: '玄米茶', st: 'kettle', rice: true, price: 420, temp: 85, steep: 0.75, ch: 1, liq: 0xd2b55a, icon: '玄' },
  { id: 'gyokuro', name: 'Gyokuro', jp: '玉露', st: 'kettle', cool: true, price: 900, temp: 60, steep: 2.0, ch: 2, liq: 0xa6cf5a, icon: '玉' },
  { id: 'matcha', name: 'Matcha', jp: '抹茶', st: 'matcha', price: 1200, temp: 80, ch: 2, liq: 0x6f9e2a, icon: '抹' },
  { id: 'hoji', name: 'Hōjicha', jp: 'ほうじ茶', st: 'kettle', roast: true, price: 520, temp: 95, steep: 0.5, ch: 3, liq: 0x8a4a22, icon: 'ほ' },
  { id: 'iced', name: 'Iced sencha', jp: '冷煎茶', st: 'shaker', price: 450, ch: 3, liq: 0xc2d47a, icon: '冷' },
  { id: 'latte', name: 'Iced hōjicha latte', jp: 'ほうじ茶ラテ', st: 'shaker', roast: true, milk: true, price: 680, ch: 3, liq: 0xb98a62, icon: 'ラ' },
  { id: 'blend', name: 'Shizuku Blend', jp: '雫ブレンド', st: 'kettle', garden: true, rice: true, price: 1600, temp: 70, steep: 1.5, ch: 4, liq: 0xc8b860, icon: '雫' },
];
const RID = Object.fromEntries(RECIPES.map((r, i) => [r.id, i]));
const MASTER_N = 8;
// upgrades: space, cost, install job, chapter, appeal, effect; bridge: n marks the n-th 雫テラス bridge upgrade (the gauntlet harness builds its stages from these)
const UPG = [
  { id: 'barrel2', name: 'Barrel extension', space: 'alley', cost: 2500, job: 'align', ch: 1, ap: 0, fx: 'A stacked tank on the rain barrel. +40 L storage.' },
  { id: 'gutter', name: 'New gutter and downpipe', space: 'facade', cost: 4000, job: 'hang', ch: 1, ap: 1, fx: 'Replace the rusted downpipe. +50% rain catchment.' },
  { id: 'lanterns', name: 'Paper lanterns ×7', space: 'facade', cost: 3000, job: 'hang', ch: 1, ap: 2, fx: 'Gen-san takes his old lantern back. A row of seven glows along your shop front.' },
  { id: 'awning', name: 'Striped awning', space: 'facade', cost: 6000, job: 'bolt', ch: 1, ap: 2, fx: 'A blue-and-white awning over the rusty band where the old sign hung.' },
  { id: 'bench', name: 'Red bench', space: 'street', cost: 4000, job: 'bolt', ch: 1, ap: 2, fx: 'A long red bench under the window: two sidewalk seats. The crate of old tins goes inside.' },
  { id: 'vending', name: 'Vending machines', space: 'street', cost: 5000, job: 'wire', ch: 1, ap: 1, fx: 'Refurbish the scuffed old machine and lease a bright new one by the alley.' },
  { id: 'stools', name: 'Counter stools ×2', space: 'ground', cost: 3500, job: 'bolt', ch: 1, ap: 1, fx: 'Two more seats at the counter.' },
  { id: 'menu', name: 'Chalk menu board', space: 'street', cost: 1500, job: 'hang', ch: 1, ap: 1, fx: 'Sweep up the street litter and set out a hand-lettered A-board by the door.' },
  { id: 'neon', name: 'Crosswalk and street lamps', space: 'street', cost: 8000, job: 'wire', ch: 1, ap: 3, fx: 'The ward paints a crosswalk outside and puts up two tall lamps.' },
  { id: 'burner2', name: 'Second staff burner', space: 'ground', cost: 4500, job: 'wire', ch: 1, ap: 0, fx: 'Another burner on the staff bench: two baristas can brew at once.' },
  { id: 'timers', name: 'Kitchen timers', space: 'ground', cost: 2500, job: 'place', ch: 1, ap: 0, fx: 'Staff brew 20% faster.' },
  { id: 'kyusu', name: 'Bigger kyūsu', space: 'ground', cost: 5000, job: 'place', ch: 1, ap: 0, fx: 'Brews 4 cups per pot.' },
  { id: 'shoji', name: 'Shoji screens', space: 'f2', cost: 6000, job: 'align', ch: 2, ap: 2, fx: 'Backlit paper screens, seen from the street.' },
  { id: 'ikebana', name: 'Ikebana', space: 'f2', cost: 4000, job: 'place', ch: 2, ap: 2, fx: 'Flowers in the alcove.' },
  { id: 'scroll', name: 'Hanging scroll', space: 'f2', cost: 7000, job: 'hang', ch: 2, ap: 2, fx: 'A scroll for the alcove.' },
  { id: 'moonlamp', name: 'Round-window lamp', space: 'f2', cost: 5000, job: 'wire', ch: 2, ap: 3, fx: 'The round window glows like a moon.' },
  { id: 'table2', name: 'Second low table', space: 'f2', cost: 12000, job: 'bolt', ch: 2, ap: 1, fx: '+4 cushions upstairs.' },
  { id: 'planters', name: 'Balcony planters', space: 'facade', cost: 5000, job: 'hang', ch: 2, ap: 2, fx: 'Clear the broken chair and dead plant: flowers and herbs instead.' },
  { id: 'cladding', name: 'Cedar cladding', space: 'facade', cost: 15000, job: 'bolt', ch: 2, ap: 3, fx: 'Strip the rusted steel siding and clad the front in dark cedar.' },
  { id: 'galley', name: 'Upstairs galley kitchen', space: 'f2', cost: 18000, job: 'bolt', ch: 2, ap: 1, fx: 'Two staff stations on the second floor. Staff there can whisk matcha too.' },
  { id: 'dumbwaiter', name: 'Dumbwaiter', space: 'ground', cost: 12000, job: 'wire', ch: 2, ap: 0, fx: 'A lift for trays between floors: staff get around 30% faster.' },
  { id: 'tetsubin', name: 'Cast-iron tetsubin', space: 'ground', cost: 24000, job: 'place', ch: 2, ap: 0, fx: 'Brews 6 cups per pot.' },
  { id: 'heaters', name: 'Terrace heaters', space: 'terrace', bridge: 5, cost: 10000, job: 'wire', ch: 3, ap: 1, fx: 'Copper patio heaters along the parapet. Terrace guests wait 30 s longer.' },
  { id: 'strings', name: 'Bridge string lights', space: 'terrace', bridge: 6, cost: 9000, job: 'hang', ch: 3, ap: 4, fx: 'Lights strung over the street.' },
  { id: 'tstreet', name: 'Sidewalk planters', space: 'terrace', bridge: 1, cost: 5000, job: 'place', ch: 3, ap: 1, fx: 'Sweep the litter from around the footbridge stairs and set out potted plants.' },
  { id: 'tstairs', name: 'Terrace stairs', space: 'terrace', bridge: 2, cost: 7000, job: 'bolt', ch: 3, ap: 2, fx: 'Cedar treads with step lights, lanterns top and bottom, and a テラス席 board where the cones stood.' },
  { id: 'tlanterns', name: 'Droplet lanterns', space: 'terrace', bridge: 3, cost: 6000, job: 'hang', ch: 3, ap: 2, fx: 'Paper lanterns with the water-drop crest on the bridge railings.' },
  { id: 'tplanters', name: 'Cedar planters', space: 'terrace', bridge: 4, cost: 8000, job: 'place', ch: 3, ap: 2, fx: 'Long cedar planter boxes on the parapets: ivy, ferns, small flowers.' },
  { id: 'tunder', name: 'Underside lights', space: 'terrace', bridge: 7, cost: 7000, job: 'wire', ch: 3, ap: 2, fx: 'Warm downlights the length of the bridge and a cyan strip along its edge.' },
  { id: 'tneon', name: 'Neon teacup', space: 'terrace', bridge: 8, cost: 9000, job: 'wire', ch: 3, ap: 3, fx: 'A pink neon teacup, steaming, on the bridge\'s old ad panel.' },
  { id: 'tcanopy', name: 'Rain canopy', space: 'terrace', bridge: 9, cost: 16000, job: 'bolt', ch: 3, ap: 2, fx: 'A black steel pergola with clear roof panels, and two more tables under it. Terrace guests stay patient in a downpour.' },
  { id: 'tbamboo', name: 'Bamboo end', space: 'terrace', bridge: 10, cost: 12000, job: 'place', ch: 4, ap: 2, fx: 'A cedar planter wall with tall bamboo and a stone lantern where the old gate was chained.' },
  { id: 'twisteria', name: 'Wisteria', space: 'terrace', bridge: 11, cost: 20000, job: 'hang', ch: 4, ap: 5, fx: 'Purple wisteria trailing over the planters and down the sides of the bridge.' },
  { id: 'yatainoren', name: 'Yatai noren and lantern', space: 'alley', cost: 6000, job: 'hang', ch: 3, ap: 2, fx: 'Dress the cart.' },
  { id: 'cartburner', name: 'Cart burner', space: 'alley', cost: 16000, job: 'wire', ch: 3, ap: 0, fx: 'A staff station on the yatai: brews kettle teas and shakes iced drinks.' },
  { id: 'tearack', name: 'Bigger tea counter', space: 'ground', cost: 9000, job: 'bolt', ch: 3, ap: 0, fx: 'Each tea counter section holds 14 cups instead of 8.' },
  { id: 'pan2', name: 'Second roasting pan', space: 'alley', cost: 15000, job: 'place', ch: 3, ap: 0, fx: '20 portions per batch.' },
  { id: 'koi', name: 'Koi windsock', space: 'facade', cost: 30000, job: 'hang', ch: 3, ap: 6, fx: 'A koinobori on the old empty bracket at the corner.' },
  { id: 'racks', name: 'Extra garden racks ×2', space: 'f3', cost: 20000, job: 'bolt', ch: 4, ap: 1, max: 2, fx: '+2 racks, pink light in the windows.' },
  { id: 'scales', name: 'Precision scales', space: 'ground', cost: 22000, job: 'place', ch: 4, ap: 0, fx: 'Staff weigh every pot: their tea is three-star.' },
  { id: 'pantry', name: 'Garden pantry', space: 'f2', cost: 15000, job: 'place', ch: 4, ap: 0, fx: 'Staff can brew the Shizuku Blend.' },
  { id: 'mist', name: 'Misting system', space: 'f3', cost: 18000, job: 'wire', ch: 4, ap: 1, fx: 'Garden yield +25%.' },
  { id: 'cistern', name: 'Rain cistern', space: 'f3', cost: 25000, job: 'align', ch: 4, ap: 0, fx: '+200 L storage.' },
  { id: 'greenwall', name: 'Green wall', space: 'facade', cost: 22000, job: 'hang', ch: 4, ap: 4, fx: 'Ivy, vines and wisteria over the bare walls, plants on the top balcony.' },
  { id: 'autokettle', name: 'Auto-kettles', space: 'ground', cost: 40000, job: 'wire', ch: 5, ap: 0, fx: 'Staff brew another 25% faster.' },
  { id: 'bigpot', name: 'Staff stockpots', space: 'ground', cost: 35000, job: 'place', ch: 5, ap: 0, fx: 'Staff brew six cups per pot.' },
  { id: 'mast', name: 'Lightning mast', space: 'roof', cost: 60000, job: 'bolt', ch: 5, ap: 2, fx: 'Catches strikes during storms.' },
  { id: 'cells', name: 'Capacitor cells', space: 'roof', cost: 30000, job: 'wire', ch: 5, ap: 0, max: 4, fx: '+2.5⚡ storage each.' },
  { id: 'padlights', name: 'Drone pad lights', space: 'roof', cost: 12000, job: 'wire', ch: 5, ap: 1, fx: 'Deliveries 25% faster.' },
  { id: 'roofseats', name: 'Rooftop seating', space: 'roof', cost: 28000, job: 'bolt', ch: 5, ap: 2, fx: '+6 seats under the sign.' },
  { id: 'bigsign', name: 'Giant sign 茶房 雫', space: 'roof', cost: 120000, job: 'wire', ch: 5, ap: 12, fx: 'Seen across the city. Needs charge.' },
];
const UID = Object.fromEntries(UPG.map(u => [u.id, u]));
const STAFF = [
  { id: 'rin', name: 'Rin', role: 'Barista', cost: 8000, wage: 40, ch: 1, col: '#ff7aa8', what: 'Brews full pots of any tea you have mastered and serves whoever has waited longest, on any floor.' },
  { id: 'kenta', name: 'Kenta', role: 'Barista', cost: 20000, wage: 60, ch: 2, col: '#7fd8c8', auto: true, what: 'A second pair of hands. Brews mastered teas at any free kitchen station, then runs them out.' },
  { id: 'yui', name: 'Yui', role: 'Barista', cost: 35000, wage: 80, ch: 3, col: '#ffd86a', auto: true, what: 'Fast on her feet. Brews and serves like the others, and runs cups off the tea counter.' },
  { id: 'sora', name: 'Sora', role: 'Barista', cost: 50000, wage: 100, ch: 4, col: '#b8a0ff', auto: true, what: 'Calm under pressure. Another barista for the busiest nights.' },
  { id: 'hana', name: 'Hana', role: 'Gardener', cost: 60000, wage: 150, ch: 4, col: '#8fd16a', what: 'Plants, mists and harvests the garden racks.' },
  { id: 'tomo', name: 'Tomo', role: 'Deliveries', cost: 90000, wage: 200, ch: 5, col: '#ffb35c', what: 'Packs and flies drone deliveries.' },
  { id: 'mako', name: 'Mako', role: 'Power', cost: 120000, wage: 250, ch: 5, col: '#33e4ff', what: 'Swaps capacitors and keeps the neon lit.' },
];
const CHAPTERS = [
  { n: 0, kick: 'PROLOGUE', title: 'Move-in', gate: null },
  { n: 1, kick: 'CHAPTER 1', title: 'Open Late', gate: { yen: 30000 }, reno: 'f2', renoName: 'Open the second floor' },
  { n: 2, kick: 'CHAPTER 2', title: 'Up the Stairs', gate: { yen: 120000, flag: 'odaService' }, reno: 'out', renoName: 'Build the yatai and the terrace' },
  { n: 3, kick: 'CHAPTER 3', title: 'Out the Window', gate: { yen: 160000, roasted: 30 }, reno: 'f3', renoName: 'Turn the third floor into a garden' },
  { n: 4, kick: 'CHAPTER 4', title: 'Roots', gate: { yen: 260000, leaves: 80 }, reno: 'roof', renoName: 'Open the roof' },
  { n: 5, kick: 'CHAPTER 5', title: 'Rooftop', gate: { yen: 380000, charge: 10 }, reno: 'storm', renoName: 'Prepare for the typhoon' },
  { n: 6, kick: 'FINALE', title: 'The Long Storm', gate: null },
];
const WEATHER = [
  { id: 'drizzle', name: 'Drizzle', dur: 240, rain: 0.32, mm: 1.2 },
  { id: 'steady', name: 'Steady rain', dur: 180, rain: 0.58, mm: 4.5 },
  { id: 'downpour', name: 'Downpour', dur: 180, rain: 0.9, mm: 12 },
  { id: 'storm', name: 'Thunderstorm', dur: 120, rain: 1.0, mm: 18, storm: true },
];
const CYCLE = WEATHER.reduce((a, w) => a + w.dur, 0);
function weatherAt(t) { t = mod(t, CYCLE); let acc = 0; for (let i = 0; i < WEATHER.length; i++) { const w = WEATHER[i]; if (t < acc + w.dur) return { i, w, left: acc + w.dur - t, into: t - acc }; acc += w.dur; } return { i: 0, w: WEATHER[0], left: 1, into: 0 }; }
const SIGN_COLORS = { cyan: 0x33e4ff, magenta: 0xff3d9a, amber: 0xffb35c };

/* ================= state ================= */
const SAVE_KEY = 'shizuku-save-v1', SET_KEY = 'shizuku-settings-v1';
function DEFAULT() {
  return {
    v: 1, ch: 0, beat: 'start', flags: {}, done: {}, yen: 0, leaves: 12, water: 16, charge: 0, roasted: 0,
    up: {}, crates: [], staff: {}, staffLv: {}, mastery: {}, regulars: {}, letters: 0,
    stats: { served: 0, perfect: 0, earned: 0, brews: 0 }, sign: 'cyan', wt: 30, last: Date.now(), played: 0,
    plants: [], rackN: 4, pass: [],
  };
}
function DEFAULT_SET() { return { sound: 2, vol: 0.85, music: 0.55, sens: 1, invert: false, fov: 0, reduce: REDUCED, noflash: false, relaxed: false, holdToggle: false, text: 1, lefty: false, quality: 'auto', autoAdv: false, teaHud: true }; }
function migrate(s) { const d = DEFAULT(); for (const k in d) if (s[k] === undefined) s[k] = d[k]; for (const k in d.stats) if (s.stats[k] === undefined) s.stats[k] = 0; return s; }
function loadSave() { try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const s = JSON.parse(raw); if (!s || s.v !== 1) return null; return migrate(s); } catch (e) { return null; } }
function loadSet() { try { const raw = localStorage.getItem(SET_KEY); return Object.assign(DEFAULT_SET(), raw ? JSON.parse(raw) : {}); } catch (e) { return DEFAULT_SET(); } }
let S = DEFAULT(), SET = loadSet();
let hasSave = !!loadSave();
function save() { if (!S || S.ch < 0 || window.__noSave) return; S.last = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function saveSet() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) { } }
const lv = id => S.up[id] || 0;
function capWater() { return 60 + (lv('barrel2') ? 40 : 0) + (lv('cistern') ? 200 : 0); }
function capCharge() { return 2 + lv('cells') * 2.5; }
function potCups() { return lv('tetsubin') ? 6 : lv('kyusu') ? 4 : 3; }
function appeal() { let a = 4; for (const u of UPG) if (lv(u.id)) a += u.ap * (u.max ? lv(u.id) : 1); if (S.ch >= 2) a += 3; if (S.ch >= 3) a += 4; if (S.ch >= 4) a += 3; if (S.ch >= 5) a += 4; if (lv('bigsign') && S.charge <= 0.05) a -= 12; return a + (S.flags.critic ? 5 : 0) - (S.flags.popup && !lv('koi') ? Math.round(a * 0.25) : 0); }
function canPay(y) { return S.yen >= y; }
function pay(y) { S.yen -= y; }
function unlockedRecipes() { return RECIPES.filter(r => r.ch <= Math.min(S.ch, 5) && (r.id !== 'blend' || S.flags.letter2)); }

