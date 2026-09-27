// Campaign levels. Enemy groups use a formation DSL:
//   { u: unitId, n: count, f: 'line'|'block'|'wedge'|'arc'|'scatter', at: [depth, lateral], sp, cols, r, w, d }
// depth = metres from the centre line into the red half, lateral = metres across the field.
// Stars: 1 = win, 2 = win spending <= par.two, 3 = win spending <= par.three.

const A = ['grow', 'top', 'briny', 'cog', 'moss', 'mitten', 'noon', 'wax'];
const F2 = ['grow', 'top'];
const F4 = ['grow', 'top', 'briny', 'cog'];
const F6 = ['grow', 'top', 'briny', 'cog', 'moss', 'mitten'];

export const LEVELS = [
  {
    id: 'L01',
    name: 'Turnip Tuesday',
    map: 'meadow',
    budget: 550,
    factions: ['grow'],
    enemy: [{ u: 'grow_hoer', n: 6, f: 'line', at: [14, 0], sp: 2 }],
    par: { two: 400, three: 300 },
    hint: 'Place Hoe Hands in the blue zone, then press Start. Cheaper wins earn more stars.',
  },
  {
    id: 'L02',
    name: 'Spud Storm',
    map: 'meadow',
    budget: 850,
    factions: F2,
    enemy: [
      { u: 'grow_hoer', n: 4, f: 'line', at: [12, 0], sp: 2 },
      { u: 'grow_spud', n: 6, f: 'line', at: [22, 0], sp: 3 },
    ],
    par: { two: 650, three: 500 },
    hint: 'Slingers hang back. Something fast could reach them.',
  },
  {
    id: 'L03',
    name: 'Send in the Clowns',
    map: 'meadow',
    budget: 900,
    factions: ['top'],
    enemy: [
      { u: 'top_clown', n: 8, f: 'block', cols: 4, at: [14, 0], sp: 1.8 },
      { u: 'top_juggler', n: 4, f: 'line', at: [24, 0], sp: 4 },
    ],
    par: { two: 700, three: 600 },
    hint: 'Mallet Clowns knock people over but fall over easily too.',
  },
  {
    id: 'L04',
    name: 'Hay There',
    map: 'hills',
    budget: 1200,
    factions: F2,
    enemy: [
      { u: 'grow_bale', n: 3, f: 'line', at: [12, 0], sp: 4 },
      { u: 'grow_spud', n: 6, f: 'block', cols: 3, at: [24, 8], sp: 2 },
      { u: 'grow_soup', n: 2, f: 'line', at: [18, 0], sp: 3 },
    ],
    par: { two: 1000, three: 750 },
    hint: 'Throwers on the hill reach further. The Soup Aunties keep the bales going.',
  },
  {
    id: 'L05',
    name: 'The Strongest Man',
    boss: true,
    map: 'hills',
    budget: 1550,
    factions: F2,
    enemy: [
      { u: 'top_strong', n: 2, f: 'line', at: [12, 0], sp: 8 },
      { u: 'top_clown', n: 6, f: 'wedge', at: [15, 0] },
      { u: 'top_ring', n: 1, f: 'line', at: [20, 0] },
      { u: 'top_cannon', n: 2, f: 'line', at: [32, 0], sp: 16 },
    ],
    par: { two: 1300, three: 1000 },
    hint: 'Boss fight. Strongmen shrug off small hits; the cannons in the back hurt.',
  },
  {
    id: 'L06',
    name: 'Mind the Gap',
    map: 'gorge',
    budget: 950,
    factions: ['briny', 'cog'],
    enemy: [
      { u: 'briny_harpoon', n: 6, f: 'line', at: [10, 0], sp: 3 },
      { u: 'briny_swab', n: 2, f: 'block', cols: 2, at: [11, -14] },
      { u: 'briny_swab', n: 2, f: 'block', cols: 2, at: [11, 14] },
    ],
    par: { two: 750, three: 650 },
    hint: 'Harpooneers yank you across the gap. Fast riders can cross the bridges first.',
  },
  {
    id: 'L07',
    name: 'Plank Walk',
    map: 'gorge',
    budget: 1600,
    factions: F4,
    enemy: [
      { u: 'briny_anchor', n: 1, f: 'line', at: [10, -14] },
      { u: 'briny_anchor', n: 1, f: 'line', at: [10, 0] },
      { u: 'briny_anchor', n: 1, f: 'line', at: [10, 14] },
      { u: 'briny_harpoon', n: 6, f: 'arc', at: [16, 0], r: 10 },
      { u: 'briny_barrel', n: 2, f: 'line', at: [30, 0], sp: 16 },
    ],
    par: { two: 1450, three: 1100 },
    hint: 'Anchors guard every crossing. Mortars can reach across the gorge.',
  },
  {
    id: 'L08',
    name: 'Clockwork Parade',
    map: 'meadow',
    budget: 1600,
    factions: F4,
    enemy: [
      { u: 'cog_wrench', n: 8, f: 'block', cols: 4, at: [12, 0] },
      { u: 'cog_rivet', n: 6, f: 'line', at: [20, 0], sp: 3 },
      { u: 'cog_oilcan', n: 2, f: 'line', at: [22, 0], sp: 6 },
      { u: 'cog_zap', n: 1, f: 'line', at: [28, 0] },
    ],
    par: { two: 1400, three: 1100 },
    hint: 'The Zapcoil Wagon chains lightning through tight groups. Spread out.',
  },
  {
    id: 'L09',
    name: "Slip 'n' Slide",
    map: 'glaze',
    budget: 2000,
    factions: F4,
    enemy: [
      { u: 'briny_swab', n: 6, f: 'block', cols: 3, at: [12, 0] },
      { u: 'briny_crab', n: 4, f: 'wedge', at: [18, 0] },
      { u: 'cog_velo', n: 4, f: 'line', at: [28, 0], sp: 5 },
    ],
    par: { two: 1800, three: 1450 },
    hint: 'Nobody can stop on the ice, and it has holes in it.',
  },
  {
    id: 'L10',
    name: 'Boiler Room',
    boss: true,
    map: 'gorge',
    budget: 1800,
    factions: F4,
    enemy: [
      { u: 'cog_boiler', n: 1, f: 'line', at: [10, -14] },
      { u: 'cog_boiler', n: 1, f: 'line', at: [10, 0] },
      { u: 'cog_boiler', n: 1, f: 'line', at: [10, 14] },
      { u: 'cog_rivet', n: 6, f: 'line', at: [14, 0], sp: 3 },
      { u: 'cog_zap', n: 2, f: 'line', at: [20, 0], sp: 10 },
      { u: 'cog_oilcan', n: 2, f: 'line', at: [18, 0], sp: 8 },
    ],
    par: { two: 1600, three: 1250 },
    hint: 'Boss fight. Boiler Golems explode when they fall. Do not stand next to them.',
  },
  {
    id: 'L11',
    name: 'Twig Tide',
    map: 'hills',
    budget: 1600,
    factions: ['moss', 'mitten'],
    enemy: [
      { u: 'moss_twig', n: 30, f: 'scatter', at: [16, 0], w: 14, d: 40, sp: 1.4 },
      { u: 'moss_acorn', n: 6, f: 'line', at: [24, 8], sp: 3 },
      { u: 'moss_bloom', n: 2, f: 'line', at: [22, 0], sp: 6 },
    ],
    par: { two: 1450, three: 1150 },
    hint: 'Thirty Twiglings. Anything that hits many at once will shine.',
  },
  {
    id: 'L12',
    name: 'Stumped',
    map: 'caldera',
    budget: 1650,
    factions: F6,
    enemy: [
      { u: 'moss_stump', n: 4, f: 'line', at: [10, 0], sp: 5 },
      { u: 'moss_acorn', n: 8, f: 'block', cols: 4, at: [20, 0] },
      { u: 'moss_seed', n: 2, f: 'line', at: [30, 0], sp: 12 },
      { u: 'moss_bloom', n: 2, f: 'line', at: [16, 0], sp: 6 },
    ],
    par: { two: 1500, three: 1250 },
    hint: 'Stumplings regrow. Lava pools and geysers do not care who you are.',
  },
  {
    id: 'L13',
    name: 'Brrr-igade',
    map: 'glaze',
    budget: 2000,
    factions: F6,
    enemy: [
      { u: 'mitten_icicle', n: 8, f: 'line', at: [10, 0], sp: 1.8 },
      { u: 'mitten_fluff', n: 2, f: 'line', at: [13, 0], sp: 8 },
      { u: 'mitten_pelter', n: 8, f: 'block', cols: 4, at: [20, 0] },
      { u: 'mitten_walrus', n: 2, f: 'line', at: [18, 0], sp: 20 },
      { u: 'mitten_cocoa', n: 1, f: 'line', at: [22, 0] },
    ],
    par: { two: 1800, three: 1550 },
    hint: 'Snowballs slow you down. Walruses slide in from the flanks.',
  },
  {
    id: 'L14',
    name: 'Edge of the Table',
    map: 'mesa',
    budget: 1950,
    factions: F6,
    enemy: [
      { u: 'mitten_walrus', n: 3, f: 'line', at: [12, 0], sp: 6 },
      { u: 'grow_goat', n: 3, f: 'line', at: [14, -14], sp: 4 },
      { u: 'top_unicycle', n: 4, f: 'line', at: [14, 14], sp: 4 },
      { u: 'mitten_pelter', n: 6, f: 'line', at: [24, 0], sp: 3 },
    ],
    par: { two: 1750, three: 1450 },
    hint: 'Heavy units are hard to shove off cliffs.',
  },
  {
    id: 'L15',
    name: 'The Grove Wakes',
    boss: true,
    map: 'hills',
    budget: 2550,
    factions: F6,
    legendary: 1,
    enemy: [
      { u: 'moss_oak', n: 1, f: 'line', at: [22, 0] },
      { u: 'moss_twig', n: 10, f: 'scatter', at: [12, 0], w: 8, d: 24 },
      { u: 'moss_acorn', n: 6, f: 'line', at: [26, 8], sp: 3 },
      { u: 'moss_bloom', n: 2, f: 'line', at: [24, -4], sp: 4 },
    ],
    par: { two: 2300, three: 1950 },
    hint: 'Boss fight. Legendaries unlocked: you may field one.',
  },
  {
    id: 'L16',
    name: 'High Noon',
    map: 'meadow',
    budget: 2800,
    factions: ['noon', 'wax'],
    legendary: 1,
    enemy: [
      { u: 'noon_shield', n: 6, f: 'line', at: [10, 0], sp: 2 },
      { u: 'noon_spear', n: 10, f: 'block', cols: 5, at: [12, 0] },
      { u: 'noon_lens', n: 8, f: 'block', cols: 4, at: [20, 0] },
      { u: 'noon_herald', n: 2, f: 'line', at: [16, 0], sp: 8 },
      { u: 'noon_mirror', n: 1, f: 'line', at: [32, 0] },
    ],
    par: { two: 2500, three: 2050 },
    hint: 'Shields block arrows from the front. Go around, or go over.',
  },
  {
    id: 'L17',
    name: 'Candlelight Ambush',
    map: 'caldera',
    budget: 2150,
    factions: A,
    legendary: 1,
    enemy: [
      { u: 'wax_scamp', n: 6, f: 'scatter', at: [10, -22], w: 6, d: 8 },
      { u: 'wax_scamp', n: 6, f: 'scatter', at: [10, 22], w: 6, d: 8 },
      { u: 'wax_brute', n: 2, f: 'line', at: [12, 0], sp: 6 },
      { u: 'wax_hexer', n: 6, f: 'line', at: [20, 0], sp: 3 },
      { u: 'wax_remold', n: 2, f: 'line', at: [22, 0], sp: 6 },
      { u: 'wax_cauldron', n: 2, f: 'line', at: [32, 0], sp: 12 },
    ],
    par: { two: 1950, three: 1600 },
    hint: 'Remolders bring the fallen back. Take them out first.',
  },
  {
    id: 'L18',
    name: 'Two Bridges, No Waiting',
    map: 'gorge',
    budget: 2250,
    factions: A,
    legendary: 1,
    enemy: [
      { u: 'noon_shield', n: 2, f: 'block', cols: 2, at: [10, -14] },
      { u: 'noon_shield', n: 2, f: 'block', cols: 2, at: [10, 14] },
      { u: 'noon_lens', n: 8, f: 'line', at: [14, 0], sp: 3 },
      { u: 'cog_zap', n: 2, f: 'line', at: [12, 0], sp: 20 },
      { u: 'noon_mirror', n: 2, f: 'line', at: [32, 0], sp: 12 },
      { u: 'noon_herald', n: 2, f: 'line', at: [16, 0], sp: 14 },
    ],
    par: { two: 2000, three: 1700 },
    hint: 'Solar Mirrors mark the ground before they strike. Keep moving.',
  },
  {
    id: 'L19',
    name: 'Blizzard Buffet',
    boss: true,
    map: 'glaze',
    budget: 3200,
    factions: A,
    legendary: 1,
    enemy: [
      { u: 'mitten_bliz', n: 1, f: 'line', at: [20, 0] },
      { u: 'mitten_fluff', n: 4, f: 'line', at: [12, 0], sp: 4 },
      { u: 'mitten_pelter', n: 8, f: 'block', cols: 4, at: [24, 0] },
      { u: 'mitten_boulder', n: 2, f: 'line', at: [34, 0], sp: 14 },
      { u: 'mitten_cocoa', n: 2, f: 'line', at: [26, 0], sp: 6 },
    ],
    par: { two: 2900, three: 2400 },
    hint: 'Boss fight. Mother Blizzardine freezes everything in front of her.',
  },
  {
    id: 'L20',
    name: 'The Clobberfield Finale',
    boss: true,
    map: 'hills',
    budget: 6750,
    factions: A,
    legendary: 1,
    enemy: [
      { u: 'noon_colossus', n: 1, f: 'line', at: [26, -8] },
      { u: 'wax_candel', n: 1, f: 'line', at: [26, 8] },
      { u: 'noon_shield', n: 4, f: 'line', at: [9, 0], sp: 3 },
      { u: 'wax_brute', n: 4, f: 'line', at: [12, 0], sp: 4 },
      { u: 'noon_spear', n: 10, f: 'block', cols: 5, at: [14, 0] },
      { u: 'wax_hexer', n: 8, f: 'block', cols: 4, at: [22, 0] },
      { u: 'noon_herald', n: 2, f: 'line', at: [18, 0], sp: 10 },
      { u: 'wax_remold', n: 2, f: 'line', at: [20, 0], sp: 10 },
    ],
    par: { two: 6100, three: 5050 },
    hint: 'Everything they have. Good luck.',
  },
  {
    id: 'B1',
    name: 'Bounce House',
    bonus: true,
    needStars: 30,
    map: 'caldera',
    budget: 2700,
    factions: ['grow'],
    legendary: 1,
    enemy: [
      { u: 'top_bouncer', n: 1, f: 'line', at: [20, 0] },
      { u: 'top_clown', n: 20, f: 'block', cols: 5, at: [12, 0] },
    ],
    par: { two: 2450, three: 2000 },
    hint: 'Bonus: Growers only against a giant inflatable strongman.',
  },
  {
    id: 'B2',
    name: 'Lights Out',
    bonus: true,
    needStars: 45,
    map: 'gorge',
    budget: 3650,
    factions: ['wax'],
    legendary: 1,
    enemy: [
      { u: 'briny_light', n: 1, f: 'line', at: [20, 0] },
      { u: 'briny_anchor', n: 2, f: 'block', cols: 2, at: [10, -14] },
      { u: 'briny_anchor', n: 2, f: 'block', cols: 2, at: [10, 14] },
      { u: 'briny_harpoon', n: 8, f: 'line', at: [12, 0], sp: 3 },
      { u: 'briny_tide', n: 2, f: 'line', at: [18, 0], sp: 8 },
    ],
    par: { two: 3300, three: 2750 },
    hint: 'Bonus: Waxwick only against a lighthouse keeper with a very big beam.',
  },
];

// Expand a level's enemy groups into concrete red placements [{ id, x, z }].
export function buildEnemyArmy(level, units, map, rng, zone) {
  const out = [];
  for (const g of level.enemy) {
    const def = units[g.u];
    if (!def) continue;
    const sp = g.sp || 1.6 * Math.max(1, def.scale || 1) + (def.mount ? 1 : 0);
    const pts = formation(g, sp, rng);
    for (const [depth, lat] of pts) out.push({ id: g.u, x: lat, z: -depth });
  }
  // clamp into the red deployment zone and out of forbidden spots
  for (const p of out) {
    p.x = Math.max(zone.x0 + 1, Math.min(zone.x1 - 1, p.x));
    p.z = Math.max(zone.z0 + 0.5, Math.min(zone.z1 - 0.5, p.z));
    for (let k = 0; k < 20 && map.noDeploy && map.noDeploy(p.x, p.z); k++) {
      p.z -= 0.8;
      p.x += (p.x >= 0 ? 1 : -1) * 0.4;
      p.z = Math.max(zone.z0 + 0.5, Math.min(zone.z1 - 0.5, p.z));
    }
  }
  return out;
}

function formation(g, sp, rng) {
  const [d0, l0] = g.at;
  const n = g.n || 1;
  const pts = [];
  switch (g.f) {
    case 'block': {
      const cols = g.cols || Math.ceil(Math.sqrt(n));
      for (let i = 0; i < n; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        pts.push([d0 + r * sp, l0 + (c - (cols - 1) / 2) * sp]);
      }
      break;
    }
    case 'wedge': {
      let i = 0;
      for (let row = 0; i < n; row++) {
        for (let k = -row; k <= row && i < n; k++, i++) pts.push([d0 + row * sp, l0 + k * sp]);
      }
      break;
    }
    case 'arc': {
      const r = g.r || 8;
      for (let i = 0; i < n; i++) {
        const a = n === 1 ? 0 : -Math.PI / 3 + ((2 * Math.PI) / 3) * (i / (n - 1));
        pts.push([d0 + r * (1 - Math.cos(a)), l0 + r * Math.sin(a)]);
      }
      break;
    }
    case 'scatter': {
      const w = g.w || 10;
      const d = g.d || 10;
      for (let i = 0; i < n; i++) {
        let best = null;
        for (let k = 0; k < 30; k++) {
          const p = [d0 + (rng.next() - 0.5) * w, l0 + (rng.next() - 0.5) * d];
          if (pts.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) >= sp)) {
            best = p;
            break;
          }
          best = p;
        }
        pts.push(best);
      }
      break;
    }
    default:
      for (let i = 0; i < n; i++) pts.push([d0, l0 + (i - (n - 1) / 2) * sp]);
  }
  return pts;
}

export function levelUnlocked(progress, i) {
  const L = LEVELS[i];
  if (L.bonus) return totalStars(progress) >= L.needStars;
  if (i === 0) return true;
  const prev = LEVELS[i - 1];
  return (progress.stars[prev.id] || 0) > 0;
}

export function totalStars(progress) {
  let s = 0;
  for (const k in progress.stars) s += progress.stars[k];
  return s;
}

export function starsFor(level, won, spent) {
  if (!won) return 0;
  if (spent <= level.par.three) return 3;
  if (spent <= level.par.two) return 2;
  return 1;
}
