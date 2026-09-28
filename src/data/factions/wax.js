// Waxwick Coven: spooky-but-cute candle folk. Burn damage over time, attrition and resurrection.
// Faction motif: every coven member carries a little flame somewhere on (or instead of) their head.
// Wax is translucent, so every wax-coloured prim gets the glow flag (see the loop at the bottom):
// under the scene's cool sky fill plain cream reads khaki, lit-from-within cream reads like wax.
const WAX = '#E8CFA2';
const WAX_DK = '#D9B27A';
const HALO = '#EBD9A8';
const FLAME = '#FF7410';
const CORE = '#FFD23C';
const EMBER = '#FF6B1A';
const TWI = '#5E548E';
const TWI_LT = '#7466AE';
const TWI_DK = '#3E3663';
const WICK = '#2B2622';
const INK = '#1B1B1B';
const EYE_W = '#FFF8EC';
const BRASS = '#C9A24A';
const BRASS_DK = '#A8822E';
const SILVER = '#D5DAE2';
const SILVER_LT = '#C8CDD6';
const SILVER_DK = '#8E96A3';
const IRON = '#34303A';
const IRON_LT = '#57505F';
const GOO = '#8E6CC9';
const GOO_LT = '#C3A8F2';
const WOOD = '#6B4A2C';
const CRYSTAL = '#BFE7F5';
const PI = Math.PI;

const G = { glow: true };
const GD = { glow: true, detail: true };
const D = { detail: true };

// Rotate an offset by Euler XYZ angles (same convention as the renderer: R = Rx·Ry·Rz).
function rot(v, r) {
  if (!r) return v;
  let [x, y, z] = v;
  let c = Math.cos(r[2]);
  let s = Math.sin(r[2]);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(r[1]);
  s = Math.sin(r[1]);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(r[0]);
  s = Math.sin(r[0]);
  [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}
const add = (p, o) => [p[0] + o[0], p[1] + o[1], p[2] + o[2]];
// Points on a horizontal circle (angle 0 = +z front, 90 = +x right).
const ring = (r, deg, y) => [Math.sin((deg * PI) / 180) * r, y, Math.cos((deg * PI) / 180) * r];

// A candle flame: a round yellow bulb with an orange tip. `p` is the base; `r` tilts it.
function flame(bone, p, s = 1, r = null, detail = false) {
  const f = detail ? GD : G;
  return [
    ['sphere', bone, add(p, rot([0, 0.055 * s, 0], r)), [0.14 * s, 0.15 * s, 0.14 * s], CORE, r, f],
    ['cone', bone, add(p, rot([0, 0.19 * s, 0], r)), [0.12 * s, 0.3 * s, 0.12 * s], FLAME, r, f],
  ];
}
// A single-cone flicker for small candles.
const flick = (bone, p, s = 1, r = null, detail = false) => ['cone', bone, add(p, rot([0, 0.1 * s, 0], r)), [0.09 * s, 0.2 * s, 0.09 * s], '#FF9416', r, detail ? GD : G];
// A run of wax: a long drop with a bead at the bottom.
function drip(bone, p, len, col = WAX, detail = true) {
  const f = detail ? D : null;
  return [
    ['sphere', bone, p, [0.06, len, 0.06], col, null, f],
    ['sphere', bone, [p[0], p[1] - len * 0.42, p[2]], [0.08, 0.08, 0.08], col, null, f],
  ];
}
// Redrawn kit parts (use with look.hide) so they can take the wax glow.
const kitArms = (arm, hand = WAX, hs = 0.13) => [
  ['box', 'armL', [0, 0.03, 0], [0.13, 0.58, 0.13], arm],
  ['box', 'armR', [0, 0.03, 0], [0.13, 0.58, 0.13], arm],
  ['sphere', 'handL', [0, 0.02, 0], [hs, hs, hs], hand],
  ['sphere', 'handR', [0, 0.02, 0], [hs, hs, hs], hand],
];
const kitHead = () => [
  ['sphere', 'head', [0, 0, 0], [0.34, 0.36, 0.34], WAX],
  ['sphere', 'head', [-0.065, 0.03, 0.15], [0.055, 0.07, 0.04], INK, null, D],
  ['sphere', 'head', [0.065, 0.03, 0.15], [0.055, 0.07, 0.04], INK, null, D],
];

export const FACTION = {
  id: 'wax',
  name: 'Waxwick Coven',
  short: 'Waxwick',
  color: '#FF9F1C',
  blurb: 'Spooky-but-cute candle folk. Set everything alight, then bring the fallen back for another go.',
  projLooks: {
    waxblob: [
      ['sphere', [0, 0, 0], [0.3, 0.26, 0.34], '#F6E3BC'],
      ['sphere', [0, -0.02, -0.2], [0.16, 0.14, 0.22], '#EBCB92'],
      ['sphere', [0, 0.1, -0.02], [0.14, 0.14, 0.14], '#FFE066'],
      ['cone', [0, 0.14, -0.12], [0.14, 0.3, 0.14], '#FF9F1C', [-1.0, 0, 0]],
    ],
    goo: [
      ['sphere', [0, 0, 0], [0.62, 0.52, 0.66], GOO],
      ['sphere', [0.16, 0.16, 0.12], [0.2, 0.2, 0.2], GOO_LT],
      ['sphere', [-0.14, 0.2, -0.06], [0.14, 0.14, 0.14], GOO_LT],
      ['sphere', [0.05, -0.05, -0.36], [0.26, 0.22, 0.34], GOO],
      ['sphere', [-0.04, -0.06, -0.58], [0.12, 0.12, 0.16], GOO],
    ],
    candlefire: [
      ['sphere', [0, 0, 0.05], [0.5, 0.5, 0.5], '#FFE066'],
      ['cone', [0, 0, -0.45], [0.52, 0.9, 0.52], '#FF9F1C', [-PI / 2, 0, 0]],
      ['cone', [0, 0, -0.75], [0.3, 0.6, 0.3], EMBER, [-PI / 2, 0, 0]],
      ['sphere', [0.12, 0.1, 0.18], [0.14, 0.14, 0.14], '#FFF6D0'],
    ],
  },
  units: [
    // ------------------------------------------------------------------ Wick Scamp
    {
      id: 'wax_scamp',
      name: 'Wick Scamp',
      role: 'melee',
      desc: 'A pocket-sized candle stub with a torch and no sense of fire safety whatsoever.',
      cost: 65,
      hp: 80,
      mass: 55,
      speed: 3.6,
      scale: 0.85,
      weapon: {
        kind: 'swing',
        damage: 12,
        range: 1.5,
        cooldown: 0.9,
        windup: 0.25,
        arc: 70,
        maxTargets: 1,
        knockback: 80,
        effect: { burn: 4, burnTime: 3 },
        sound: 'whoosh',
      },
      ai: { range: 1.3, priority: 'near' },
      look: {
        top: 'team',
        torso: 'barrel',
        belt: false,
        legs: TWI_DK,
        feet: '#2A2440',
        hide: ['head', 'arms'],
        parts: [
          ...kitArms(WAX),
          // the head is the top of the candle: team-coloured wax with a face, a melted rim and a flame
          ['cyl', 'head', [0, -0.03, 0], [0.46, 0.4, 0.46], 'team'],
          ['torus', 'head', [0, 0.16, 0], [0.47, 0.47, 0.42], 'team', [PI / 2, 0, 0]],
          ['cyl', 'head', [0, 0.2, 0], [0.03, 0.1, 0.03], WICK],
          ...flame('head', [0, 0.22, 0], 1.5),
          ['sphere', 'head', [-0.085, 0.0, 0.215], [0.11, 0.13, 0.05], EYE_W],
          ['sphere', 'head', [0.085, 0.0, 0.215], [0.11, 0.13, 0.05], EYE_W],
          ['sphere', 'head', [-0.08, -0.005, 0.24], [0.06, 0.075, 0.03], INK],
          ['sphere', 'head', [0.08, -0.005, 0.24], [0.06, 0.075, 0.03], INK],
          ['sphere', 'head', [0, -0.12, 0.225], [0.06, 0.045, 0.03], INK, null, D],
          ...drip('head', ring(0.23, 40, 0.07), 0.2, 'team'),
          ...drip('head', ring(0.23, 250, 0.05), 0.26, 'team'),
          ...drip('torso', ring(0.25, 130, 0.12), 0.3, 'team'),
          // brass chamberstick the candle stands in, with its finger ring at the back
          ['cyl', 'torso', [0, -0.33, 0], [0.8, 0.06, 0.8], BRASS],
          ['torus', 'torso', [0, -0.3, 0], [0.82, 0.82, 0.45], BRASS_DK, [PI / 2, 0, 0], D],
          ['torus', 'torso', [0, -0.24, -0.46], [0.22, 0.22, 0.28], BRASS, [0, PI / 2, 0]],
          // torch: stick tilted up-forward, rag wrap, big flame at the tip
          ['cyl', 'handR', [0, 0.17, 0.25], [0.05, 0.62, 0.05], WOOD, [0.97, 0, 0]],
          ['cyl', 'handR', [0, 0.33, 0.48], [0.1, 0.13, 0.1], '#8C7355', [0.97, 0, 0]],
          ...flame('handR', [0, 0.38, 0.53], 1.5),
        ],
      },
    },
    // ------------------------------------------------------------------ Tallow Hexer
    {
      id: 'wax_hexer',
      name: 'Tallow Hexer',
      role: 'ranged',
      desc: 'Flicks blobs of molten wax from a candle wand. Her hat is also a candle. She is very proud of this.',
      cost: 75,
      hp: 75,
      mass: 60,
      speed: 3.1,
      scale: 1,
      weapon: {
        kind: 'projectile',
        anim: 'throw',
        damage: 18,
        range: 24,
        cooldown: 2.0,
        windup: 0.4,
        knockback: 60,
        effect: { burn: 5, burnTime: 3 },
        proj: { look: 'waxblob', speed: 16, gravity: 1, radius: 0.15, arc: 'low', acc: 0.6, splash: 1.2, spinRate: 5 },
        shootSound: 'shoot_magic',
        sound: 'squeak',
      },
      ai: { range: 20, kite: true, priority: 'near' },
      look: {
        top: 'team',
        torso: 'cone',
        legs: TWI_DK,
        feet: '#2A2440',
        belt: TWI_DK,
        hide: ['head', 'arms'],
        parts: [
          ...kitHead(),
          ...kitArms('team'),
          // melting wax brim, twilight cone, team band, and a little candle for a tip
          ['cyl', 'head', [0, 0.12, 0], [0.62, 0.045, 0.62], WAX],
          ...drip('head', ring(0.27, 60, 0.06), 0.13, WAX, true),
          ...drip('head', ring(0.28, 150, 0.05), 0.16, WAX, true),
          ...drip('head', ring(0.27, 230, 0.07), 0.1, WAX, true),
          ...drip('head', ring(0.28, 305, 0.05), 0.17, WAX, true),
          ['cone', 'head', [0, 0.43, -0.02], [0.36, 0.62, 0.36], TWI_LT],
          ['cyl', 'head', [0, 0.18, -0.01], [0.34, 0.07, 0.34], 'team'],
          ['cyl', 'head', [0, 0.76, -0.02], [0.06, 0.1, 0.06], WAX],
          ...flame('head', [0, 0.8, -0.02], 0.75),
          ['sphere', 'head', [0.09, 0.4, 0.07], [0.045, 0.045, 0.045], CORE, null, GD],
          ['sphere', 'head', [-0.06, 0.52, 0.04], [0.035, 0.035, 0.035], CORE, null, GD],
          // pointy wax nose
          ['cone', 'head', [0, -0.02, 0.2], [0.07, 0.13, 0.07], WAX_DK, [PI / 2 - 0.25, 0, 0]],
          // twilight shawl and hem
          ['cyl', 'torso', [0, 0.28, 0], [0.54, 0.09, 0.42], TWI_LT],
          ['cyl', 'torso', [0, -0.31, 0], [0.68, 0.05, 0.6], TWI_DK, null, D],
          // candle wand
          ['cyl', 'handR', [0, 0, 0.24], [0.035, 0.46, 0.035], '#4A3B2A', [PI / 2, 0, 0]],
          ['sphere', 'handR', [0, 0, 0.47], [0.06, 0.06, 0.06], BRASS],
          ['cyl', 'handR', [0, 0.07, 0.5], [0.06, 0.12, 0.06], WAX],
          ...flame('handR', [0, 0.13, 0.5], 0.7),
          // pouch of spare wax on the hip
          ['sphere', 'torso', [-0.24, -0.24, 0.1], [0.16, 0.18, 0.14], '#7A5C3A', null, D],
        ],
      },
    },
    // ------------------------------------------------------------------ Chandelier Brute
    {
      id: 'wax_brute',
      name: 'Chandelier Brute',
      role: 'tank',
      desc: 'Wears a chandelier as a hula hoop and spins until the whole room is on fire.',
      cost: 260,
      hp: 680,
      mass: 190,
      speed: 2.2,
      scale: 1.3,
      bulk: 1.4,
      weapon: {
        kind: 'spin',
        damage: 13,
        range: 2.4,
        radius: 2.8,
        duration: 0.8,
        tick: 0.4,
        spinRate: 14,
        cooldown: 2.0,
        windup: 0.35,
        knockback: 260,
        effect: { burn: 4, burnTime: 3 },
        sound: 'bonk',
      },
      ai: { range: 2.0, priority: 'near' },
      look: {
        top: 'team',
        torso: 'barrel',
        belt: false,
        legs: TWI_DK,
        feet: '#2A2440',
        hide: ['head', 'arms'],
        parts: [
          ...kitArms(WAX, WAX, 0.24),
          // wax poured over the shoulders, running down the team-coloured body
          ['cyl', 'torso', [0, 0.3, 0], [0.8, 0.1, 0.8], WAX],
          ...drip('torso', ring(0.37, 20, 0.16), 0.26, WAX, false),
          ...drip('torso', ring(0.37, 130, 0.14), 0.3, WAX, true),
          ...drip('torso', ring(0.37, 220, 0.17), 0.22, WAX, true),
          ...drip('torso', ring(0.37, 320, 0.12), 0.34, WAX, false),
          // pillar-candle head with a grumpy brow and a big flame
          ['cyl', 'head', [0, 0, 0], [0.42, 0.44, 0.42], WAX],
          ['torus', 'head', [0, 0.21, 0], [0.44, 0.44, 0.35], WAX_DK, [PI / 2, 0, 0]],
          ...drip('head', ring(0.21, 300, 0.1), 0.2, WAX_DK, true),
          ['sphere', 'head', [-0.075, 0.02, 0.2], [0.075, 0.085, 0.04], INK],
          ['sphere', 'head', [0.075, 0.02, 0.2], [0.075, 0.085, 0.04], INK],
          ['box', 'head', [-0.075, 0.1, 0.21], [0.13, 0.04, 0.03], TWI_DK, [0, 0, -0.3]],
          ['box', 'head', [0.075, 0.1, 0.21], [0.13, 0.04, 0.03], TWI_DK, [0, 0, 0.3]],
          ['cyl', 'head', [0, 0.26, 0], [0.04, 0.1, 0.04], WICK],
          ...flame('head', [0, 0.28, 0], 2.0),
          // the chandelier hoop: a hexagonal brass frame with a candle and a crystal drop at each corner
          ...[0, 60, 120, 180, 240, 300].map((a) => ['box', 'torso', ring(0.56, a, -0.36), [0.66, 0.06, 0.06], BRASS, [0, (a * PI) / 180, 0]]),
          ...[30, 90, 150, 210, 270, 330].flatMap((a) => [
            ['cyl', 'torso', ring(0.645, a, -0.2), [0.09, 0.26, 0.09], WAX],
            flick('torso', ring(0.645, a, -0.07), 1.1),
            ['sphere', 'torso', ring(0.645, a, -0.44), [0.06, 0.13, 0.06], CRYSTAL, null, D],
          ]),
        ],
      },
    },
    // ------------------------------------------------------------------ Candlehorse Cavalier
    {
      id: 'wax_cav',
      name: 'Candlehorse Cavalier',
      role: 'cavalry',
      desc: 'A dashing rider who misplaced his head and replaced it with a candle flame. Nobody has the heart to tell him.',
      cost: 185,
      hp: 260,
      mass: 220,
      speed: 7.0,
      scale: 1,
      mount: { kind: 'beast', len: 1.5, w: 0.6, h: 0.7, height: 1.05, saddle: 1.45, legs: 4, head: true, headR: 0.22, neck: 0.42 },
      weapon: { kind: 'swing', damage: 20, range: 2.2, cooldown: 1.0, windup: 0.3, arc: 90, maxTargets: 2, knockback: 300, effect: { burn: 3, burnTime: 2 }, sound: 'slash' },
      charge: { damage: 50, knockback: 1000, cooldown: 8, speedMul: 1.35, reach: 1.2, maxTargets: 3 },
      ai: { range: 1.8, priority: 'backline' },
      look: {
        top: 'team',
        legs: TWI_DK,
        feet: '#2A2440',
        hide: ['head', 'arms'],
        // body, head and neck are redrawn below so the wax can glow; the kit legs shrink to a core
        mount: { legs: WAX_DK, legW: 0.05, noHoof: true, noTail: true, noBody: true, noHead: true, saddle: 'team' },
        parts: [
          ...kitArms(TWI),
          // headless: a flame where the head should be, a top hat floating politely above it
          ['cyl', 'torso', [0, 0.33, 0], [0.34, 0.1, 0.34], TWI_DK],
          ...flame('head', [0, -0.2, 0], 2.1),
          ['cyl', 'head', [0.03, 0.27, 0], [0.44, 0.035, 0.44], TWI_DK, [0, 0, -0.2]],
          ['cyl', 'head', [0.055, 0.39, 0], [0.27, 0.24, 0.27], TWI_DK, [0, 0, -0.2]],
          ['cyl', 'head', [0.038, 0.31, 0], [0.28, 0.06, 0.28], 'team', [0, 0, -0.2]],
          // cape
          ['box', 'torso', [0, -0.02, -0.19], [0.5, 0.72, 0.04], 'teamDark', [0.18, 0, 0]],
          // candle-sabre: grip, brass guard, wax blade, flaming tip
          ['cyl', 'handR', [0, 0, 0.05], [0.05, 0.16, 0.05], WOOD, [PI / 2, 0, 0]],
          ['box', 'handR', [0, 0, 0.14], [0.24, 0.05, 0.05], BRASS],
          ['cyl', 'handR', [0, 0, 0.6], [0.075, 0.9, 0.075], WAX, [PI / 2, 0, 0]],
          ['sphere', 'handR', [0.035, -0.02, 0.4], [0.045, 0.06, 0.1], WAX_DK, null, D],
          ...flame('handR', [0, 0, 1.03], 1.1, [PI / 2, 0, 0]),
          // jack-o-candle lantern in the off hand
          ['torus', 'handL', [0, -0.09, 0], [0.18, 0.18, 0.18], IRON],
          ['sphere', 'handL', [0, -0.28, 0.02], [0.32, 0.27, 0.32], '#F28C28'],
          ['cyl', 'handL', [0, -0.14, 0.02], [0.05, 0.05, 0.05], '#4E7D2A', null, D],
          ['box', 'handL', [-0.06, -0.25, 0.165], [0.06, 0.06, 0.03], CORE, [0, 0, PI / 4], GD],
          ['box', 'handL', [0.06, -0.25, 0.165], [0.06, 0.06, 0.03], CORE, [0, 0, PI / 4], GD],
          ['box', 'handL', [0, -0.33, 0.16], [0.13, 0.035, 0.03], CORE, null, GD],
          // the waxhorse: body, neck, head with snout and ears, glowing eyes
          ['sphere', 'mount', [0, 0, 0], [0.66, 0.8, 1.62], WAX],
          ['cyl', 'mount', [0, 0.44, 0.7], [0.24, 0.67, 0.24], WAX, [0.5, 0, 0]],
          ['sphere', 'mountHead', [0, 0, 0.02], [0.38, 0.38, 0.46], WAX],
          ['sphere', 'mountHead', [0, -0.06, 0.24], [0.26, 0.22, 0.28], WAX_DK],
          ['cone', 'mountHead', [-0.1, 0.2, -0.04], [0.08, 0.16, 0.08], WAX, null, D],
          ['cone', 'mountHead', [0.1, 0.2, -0.04], [0.08, 0.16, 0.08], WAX, null, D],
          ['sphere', 'mountHead', [-0.12, 0.06, 0.14], [0.08, 0.09, 0.06], CORE, null, G],
          ['sphere', 'mountHead', [0.12, 0.06, 0.14], [0.08, 0.09, 0.06], CORE, null, G],
          // saddle cloth draped over the waxhorse
          ['box', 'mount', [0, 0.36, -0.05], [0.6, 0.06, 0.66], 'team'],
          ['box', 'mount', [-0.3, 0.2, -0.05], [0.04, 0.34, 0.62], 'team'],
          ['box', 'mount', [0.3, 0.2, -0.05], [0.04, 0.34, 0.62], 'team'],
          ['box', 'mount', [-0.31, 0.03, -0.05], [0.05, 0.05, 0.64], BRASS, null, D],
          ['box', 'mount', [0.31, 0.03, -0.05], [0.05, 0.05, 0.64], BRASS, null, D],
          // flame mane, forelock and tail
          ['cone', 'mount', [0, 0.33, 0.51], [0.17, 0.34, 0.17], FLAME, [-0.5, 0, 0], G],
          ['cone', 'mount', [0, 0.44, 0.57], [0.19, 0.4, 0.19], '#FF9416', [-0.5, 0, 0], G],
          ['cone', 'mount', [0, 0.55, 0.62], [0.2, 0.44, 0.2], FLAME, [-0.5, 0, 0], G],
          ['cone', 'mount', [0, 0.66, 0.68], [0.19, 0.4, 0.19], '#FF9416', [-0.5, 0, 0], G],
          ['cone', 'mount', [0, 0.76, 0.74], [0.16, 0.34, 0.16], FLAME, [-0.5, 0, 0], G],
          ...flame('mountHead', [0, 0.16, -0.08], 1.3, [-0.3, 0, 0]),
          ...flame('mount', [0, 0.26, -0.74], 2.2, [-0.9, 0, 0]),
          // drippy tapered legs with puddle feet
          ...[0, 1, 2, 3].flatMap((k) => [
            ['cone', `mLeg${k}`, [0, -0.38, 0], [0.22, 0.76, 0.22], WAX, [PI, 0, 0]],
            ['sphere', `mLeg${k}`, [0, -0.84, 0.03], [0.24, 0.1, 0.28], WAX_DK, null, D],
          ]),
        ],
      },
    },
    // ------------------------------------------------------------------ Cauldron Mortar
    {
      id: 'wax_cauldron',
      name: 'Cauldron Mortar',
      role: 'siege',
      desc: 'Brews lavender goo, then serves it by the ladle-full from forty metres. Sticky. Very sticky.',
      cost: 135,
      hp: 160,
      mass: 230,
      speed: 1.5,
      scale: 1,
      mount: { kind: 'cart', len: 2.0, w: 1.3, h: 0.45, height: 0.6, saddle: 1.15, riderZ: -0.62, wheels: 4, wheelR: 0.38 },
      weapon: {
        kind: 'projectile',
        anim: 'raise',
        damage: 55,
        range: 40,
        minRange: 10,
        cooldown: 5.5,
        windup: 0.8,
        knockback: 300,
        effect: { slow: 0.4, slowTime: 3 },
        muzzle: { bone: 'mount', at: [0, 1.4, 0.3] },
        proj: { look: 'goo', speed: 21, gravity: 1, radius: 0.35, arc: 'high', splash: 3, acc: 0.5, spinRate: 3 },
        shootSound: 'shoot_squirt',
        sound: 'squeak',
      },
      ai: { range: 36, priority: 'cluster' },
      look: {
        top: 'team',
        legs: TWI_DK,
        hide: ['head', 'arms'],
        mount: { body: '#4A3F66', trim: 'team', wheel: '#3A2F4F', hub: BRASS },
        parts: [
          ...kitHead(),
          ...kitArms('team'),
          // cook: twilight kerchief with a candle topknot
          ['sphere', 'head', [0, 0.08, -0.04], [0.37, 0.28, 0.37], TWI_LT],
          ['cone', 'head', [0, 0.02, -0.2], [0.12, 0.16, 0.08], TWI_LT, [-2.2, 0, 0], D],
          ['cyl', 'head', [0, 0.23, -0.02], [0.08, 0.12, 0.08], WAX],
          ...flame('head', [0, 0.29, -0.02], 0.8),
          // big stirring paddle held upright
          ['cyl', 'handR', [0, 0.42, 0.06], [0.05, 1.3, 0.05], WOOD],
          ['box', 'handR', [0, 1.12, 0.06], [0.05, 0.3, 0.16], WOOD],
          ['sphere', 'handR', [0, 1.0, 0.09], [0.08, 0.14, 0.08], GOO, null, D],
          // iron cauldron on stubby legs, lavender goo bubbling over the rim
          ['sphere', 'mount', [0, 0.66, 0.3], [0.86, 0.72, 0.86], IRON],
          ['torus', 'mount', [0, 0.98, 0.3], [0.86, 0.86, 0.7], IRON_LT, [PI / 2, 0, 0]],
          ['sphere', 'mount', [0, 1.02, 0.3], [0.72, 0.3, 0.72], GOO],
          ['sphere', 'mount', [0.14, 1.08, 0.4], [0.18, 0.14, 0.18], GOO_LT, null, D],
          ['sphere', 'mount', [-0.16, 1.07, 0.22], [0.13, 0.1, 0.13], GOO_LT, null, D],
          ['sphere', 'mount', [0.02, 1.22, 0.2], [0.08, 0.08, 0.08], GOO_LT, null, D],
          ['sphere', 'mount', [-0.08, 1.36, 0.36], [0.06, 0.06, 0.06], GOO_LT, null, D],
          ['sphere', 'mount', [0.33, 0.86, 0.5], [0.09, 0.22, 0.09], GOO],
          ['cyl', 'mount', [0.25, 0.3, 0.45], [0.06, 0.18, 0.06], IRON, null, D],
          ['cyl', 'mount', [-0.25, 0.3, 0.45], [0.06, 0.18, 0.06], IRON, null, D],
          ['cyl', 'mount', [0, 0.3, 0.05], [0.06, 0.18, 0.06], IRON, null, D],
          // little campfire under the pot
          ['cyl', 'mount', [0, 0.27, 0.3], [0.08, 0.7, 0.08], '#5A3E24', [0, 0.6, PI / 2], D],
          flick('mount', add(ring(0.36, 100, 0.22), [0, 0, 0.3]), 1.9),
          flick('mount', add(ring(0.36, 220, 0.22), [0, 0, 0.3]), 1.7),
          flick('mount', add(ring(0.36, 340, 0.22), [0, 0, 0.3]), 1.8),
          // team pennant at the back corner
          ['cyl', 'mount', [0.55, 0.95, -0.9], [0.05, 1.5, 0.05], WOOD],
          ['box', 'mount', [0.55, 1.5, -1.14], [0.03, 0.34, 0.48], 'team'],
          ['sphere', 'mount', [0.55, 1.72, -0.9], [0.08, 0.08, 0.08], BRASS, null, D],
          // spare jar of goo
          ['cyl', 'mount', [-0.5, 0.35, -0.95], [0.18, 0.24, 0.18], GOO, null, D],
          ['cyl', 'mount', [-0.5, 0.49, -0.95], [0.19, 0.04, 0.19], WAX, null, D],
        ],
      },
    },
    // ------------------------------------------------------------------ Wax Remolder
    {
      id: 'wax_remold',
      name: 'Wax Remolder',
      role: 'support',
      desc: 'Scoops up fallen friends, pats them back into shape, and sends them out again. Mostly the right shape.',
      cost: 85,
      hp: 100,
      mass: 70,
      speed: 3.1,
      scale: 1,
      weapon: { kind: 'revive', anim: 'heal', range: 1.6, cooldown: 10, windup: 2.0, recover: 0.4, reviveHp: 0.4, sound: 'summon' },
      weapon2: { kind: 'swing', damage: 8, range: 1.4, cooldown: 1.2, arc: 90, maxTargets: 1, knockback: 80, when: 'near', sound: 'bonk' },
      ai: { range: 6, priority: 'allyFront' },
      look: {
        headColor: '#2E2842',
        eyes: false,
        top: 'team',
        torso: 'cone',
        legs: TWI_DK,
        feet: '#2A2440',
        belt: BRASS,
        hide: ['arms'],
        parts: [
          ...kitArms('team'),
          // deep hood with a shadowed face, two warm glowing eyes and a droopy tip
          ['sphere', 'head', [0, 0.03, -0.07], [0.46, 0.48, 0.42], TWI_LT],
          ['cone', 'head', [0, 0.2, -0.2], [0.3, 0.4, 0.3], TWI_LT, [-1.0, 0, 0]],
          ['sphere', 'head', [0, 0.31, -0.37], [0.07, 0.07, 0.07], HALO, null, D],
          ['cone', 'head', [0, -0.21, -0.03], [0.66, 0.3, 0.54], TWI_LT],
          ['sphere', 'head', [-0.06, 0.03, 0.165], [0.06, 0.075, 0.03], CORE, null, G],
          ['sphere', 'head', [0.06, 0.03, 0.165], [0.06, 0.075, 0.03], CORE, null, G],
          // drippy halo with three tiny flames
          ['torus', 'head', [0, 0.46, 0], [0.44, 0.44, 0.5], HALO, [PI / 2, 0, 0]],
          ...drip('head', ring(0.175, 45, 0.41), 0.08, HALO),
          ...drip('head', ring(0.175, 200, 0.41), 0.11, HALO),
          flick('head', ring(0.175, 0, 0.48), 0.9),
          flick('head', ring(0.175, 120, 0.48), 0.9),
          flick('head', ring(0.175, 240, 0.48), 0.9),
          // wax-splattered hem
          ['sphere', 'torso', [0.2, -0.28, 0.2], [0.12, 0.08, 0.1], WAX, null, D],
          ['sphere', 'torso', [-0.25, -0.3, 0.1], [0.1, 0.07, 0.12], WAX, null, D],
          ['sphere', 'torso', [0.06, -0.3, -0.26], [0.14, 0.07, 0.1], WAX, null, D],
          // sculptor's spatula and a lump of fresh wax
          ['cyl', 'handR', [0, 0, 0.17], [0.04, 0.32, 0.04], WOOD, [PI / 2, 0, 0]],
          ['box', 'handR', [0, 0, 0.44], [0.15, 0.02, 0.26], SILVER],
          ['box', 'handR', [0, 0.013, 0.5], [0.1, 0.01, 0.12], WAX, null, D],
          ['sphere', 'handL', [0, -0.08, 0.06], [0.17, 0.15, 0.17], WAX],
          ['sphere', 'handL', [0.03, -0.17, 0.08], [0.05, 0.1, 0.05], WAX_DK, null, D],
        ],
      },
    },
    // ------------------------------------------------------------------ The Grand Candelabra
    {
      id: 'wax_candel',
      name: 'The Grand Candelabra',
      role: 'legendary',
      desc: 'A towering silver candelabra that went for a walk and never came back. Throws fireballs by the handful.',
      cost: 2050,
      hp: 5500,
      mass: 700,
      speed: 2.3,
      scale: 3.8,
      bulk: 1.3,
      staggerImmune: true,
      stability: 3,
      weapon: {
        kind: 'projectile',
        anim: 'raise',
        damage: 40,
        range: 32,
        cooldown: 3.0,
        windup: 0.6,
        knockback: 400,
        effect: { burn: 5, burnTime: 3 },
        muzzle: { bone: 'torso', at: [0, 3.4, 0.5] },
        proj: { look: 'candlefire', speed: 20, gravity: 1, radius: 0.3, arc: 'low', acc: 0.5, count: 5, spread: 20, splash: 2, spinRate: 0 },
        shootSound: 'shoot_magic',
        sound: 'explosion',
      },
      weapon2: { kind: 'slam', damage: 30, radius: 3, reach: 0, range: 3, cooldown: 4, knockback: 800, lift: 0.7, when: 'crowd', crowd: 3, sound: 'slam' },
      ai: { range: 24, priority: 'cluster' },
      look: {
        skin: SILVER,
        eyes: false,
        hide: ['torso', 'head', 'arms', 'legs'],
        parts: [
          // --- torso: stem with knops, a bell-shaped base, a crossbar holding two inner candles
          ['cyl', 'torso', [0, 0.02, 0], [0.16, 0.66, 0.16], SILVER],
          ['sphere', 'torso', [0, -0.03, 0], [0.26, 0.2, 0.26], SILVER_LT],
          ['sphere', 'torso', [0, 0.2, 0], [0.2, 0.12, 0.2], SILVER, null, D],
          ['cone', 'torso', [0, -0.2, 0], [0.6, 0.34, 0.6], SILVER],
          ['torus', 'torso', [0, -0.36, 0], [0.62, 0.62, 0.4], SILVER_DK, [PI / 2, 0, 0]],
          ['cone', 'torso', [0, 0.28, 0], [0.3, 0.12, 0.3], SILVER, [PI, 0, 0]],
          ['cyl', 'torso', [0, 0.34, 0], [0.46, 0.04, 0.46], SILVER_LT],
          ['box', 'torso', [0, 0.13, 0], [0.58, 0.06, 0.07], SILVER],
          ...[-1, 1].flatMap((sx) => [
            ['torus', 'torso', [sx * 0.17, 0.2, 0], [0.13, 0.13, 0.2], SILVER_DK, null, D],
            ['cyl', 'torso', [sx * 0.27, 0.19, 0], [0.05, 0.12, 0.05], SILVER],
            ['cyl', 'torso', [sx * 0.27, 0.25, 0], [0.16, 0.035, 0.16], SILVER_LT],
            ['cyl', 'torso', [sx * 0.27, 0.38, 0], [0.1, 0.26, 0.1], 'team'],
            ...flame('torso', [sx * 0.27, 0.51, 0], 1.0),
          ]),
          // wax drips spilling over the central drip pan
          ...drip('torso', ring(0.22, 20, 0.3), 0.1, WAX, true),
          ...drip('torso', ring(0.22, 200, 0.3), 0.14, WAX, true),
          // team bow tied round the stem
          ['cone', 'torso', [-0.08, 0.06, 0.1], [0.11, 0.14, 0.05], 'team', [0, 0, PI / 2]],
          ['cone', 'torso', [0.08, 0.06, 0.1], [0.11, 0.14, 0.05], 'team', [0, 0, -PI / 2]],
          ['sphere', 'torso', [0, 0.06, 0.1], [0.06, 0.06, 0.06], 'teamDark'],
          ['box', 'torso', [-0.04, -0.03, 0.1], [0.04, 0.13, 0.02], 'team', [0, 0, -0.4], D],
          ['box', 'torso', [0.04, -0.03, 0.1], [0.04, 0.13, 0.02], 'team', [0, 0, 0.4], D],
          // third (rear) tripod leg
          ['cyl', 'torso', [0, -0.73, -0.24], [0.1, 0.95, 0.1], SILVER, [0.49, 0, 0]],
          ['sphere', 'torso', [0, -1.11, -0.45], [0.22, 0.14, 0.24], SILVER_DK],
          // --- head: the central candle, with a face and the biggest flame
          ['cyl', 'head', [0, 0.05, 0], [0.36, 0.56, 0.36], WAX],
          ['torus', 'head', [0, 0.32, 0], [0.38, 0.38, 0.3], WAX_DK, [PI / 2, 0, 0]],
          ...drip('head', ring(0.18, 60, 0.22), 0.16, WAX_DK),
          ...drip('head', ring(0.18, 190, 0.18), 0.24, WAX_DK),
          ...drip('head', ring(0.18, 300, 0.23), 0.12, WAX_DK),
          ['cyl', 'head', [0, 0.37, 0], [0.025, 0.08, 0.025], WICK],
          ...flame('head', [0, 0.38, 0], 2.4),
          ['sphere', 'head', [-0.07, 0.09, 0.17], [0.1, 0.12, 0.04], EYE_W],
          ['sphere', 'head', [0.07, 0.09, 0.17], [0.1, 0.12, 0.04], EYE_W],
          ['sphere', 'head', [-0.065, 0.085, 0.188], [0.055, 0.075, 0.03], INK],
          ['sphere', 'head', [0.065, 0.085, 0.188], [0.055, 0.075, 0.03], INK],
          ['box', 'head', [0, -0.03, 0.182], [0.07, 0.024, 0.02], INK],
          ['box', 'head', [-0.047, -0.017, 0.18], [0.035, 0.022, 0.02], INK, [0, 0, -0.6]],
          ['box', 'head', [0.047, -0.017, 0.18], [0.035, 0.022, 0.02], INK, [0, 0, 0.6]],
          ['sphere', 'head', [-0.115, -0.02, 0.16], [0.055, 0.035, 0.02], '#F2A07B', null, D],
          ['sphere', 'head', [0.115, -0.02, 0.16], [0.055, 0.035, 0.02], '#F2A07B', null, D],
          // --- arms: silver rods to an L-bend, then up to an outer candle
          ...[
            ['armL', 'handL', -1],
            ['armR', 'handR', 1],
          ].flatMap(([arm, hand, sx]) => [
            ['cyl', arm, [0, 0, 0], [0.08, 0.62, 0.08], SILVER],
            ['sphere', arm, [0, 0.3, 0], [0.15, 0.15, 0.15], SILVER_LT],
            ['sphere', arm, [0, -0.02, 0], [0.11, 0.11, 0.11], SILVER_DK, null, D],
            ['sphere', hand, [0, 0, 0], [0.13, 0.13, 0.13], SILVER_LT],
            ['cyl', hand, [sx * 0.16, 0, 0], [0.06, 0.32, 0.06], SILVER, [0, 0, PI / 2]],
            ['sphere', hand, [sx * 0.32, 0, 0], [0.09, 0.09, 0.09], SILVER_DK, null, D],
            ['cyl', hand, [sx * 0.32, 0.22, 0], [0.06, 0.46, 0.06], SILVER],
            ['torus', hand, [sx * 0.24, 0.17, 0], [0.13, 0.13, 0.16], SILVER_DK, null, D],
            ['cyl', hand, [sx * 0.32, 0.45, 0], [0.16, 0.035, 0.16], SILVER_LT],
            ['cyl', hand, [sx * 0.32, 0.58, 0], [0.1, 0.26, 0.1], 'team'],
            ...flame(hand, [sx * 0.32, 0.71, 0], 1.0),
          ]),
          // --- legs: silver legs with hip and knee knops and ball feet
          ...['legL', 'legR'].flatMap((leg) => [
            ['cyl', leg, [0, 0, 0], [0.12, 0.8, 0.12], SILVER],
            ['sphere', leg, [0, 0.36, 0], [0.16, 0.16, 0.16], SILVER],
            ['sphere', leg, [0, 0.02, 0.02], [0.15, 0.15, 0.15], SILVER_LT, null, D],
            ['sphere', leg, [0, -0.38, 0.05], [0.22, 0.14, 0.28], SILVER_DK],
          ]),
        ],
      },
    },
  ],
};

// Wax glows a little from within: every wax-coloured prim gets the glow flag (kept with `detail`).
// Polished silver highlights get it too, so the Candelabra gleams.
const WAXY = new Set([WAX, WAX_DK, HALO, SILVER_LT]);
for (const u of FACTION.units) {
  u.look.parts = u.look.parts.map((p) => {
    if (!WAXY.has(p[4])) return p;
    const q = p.slice();
    while (q.length < 6) q.push(null);
    q[6] = { ...(q[6] || {}), glow: true };
    return q;
  });
}
