// Mossgrove Kin: forest spirits of bark, leaf and blossom. Swarms, regrowth and lingering
// area effects.
const MOSS = '#6A994E';
const BARK = '#7F5539';
const BLOSSOM = '#F7B2BD';
const LEAF = '#A7C957';
const DEEPLEAF = '#4F7A3A';
const DARKBARK = '#5C3D2E';
const PALEWOOD = '#D9B38C';
const FACEWOOD = '#C9A27A';
const THISTLE = '#A56CC1';
const CAP = '#D64545';
const CREAM = '#F4F1E8';
const GLOWEYE = '#FFF3B0';
const PI = Math.PI;

// Thistle lance direction in the hand frame (lowered at rest, raised when thrusting).
const LANCE_ROT = 1.98;
const lanceAt = (d) => [0, -0.4 * d, 0.92 * d];

// Ring of petals/leaves: `n` flattened spheres around a bone, leaning outward.
// a: angle from +z toward +x. Rotation [0, a - PI/2, -lean] tilts the top outward.
function ring(bone, angles, r, y, size, color, lean, detail) {
  return angles.map((a, i) => [
    'sphere',
    bone,
    [r * Math.sin(a), y, r * Math.cos(a)],
    size,
    Array.isArray(color) ? color[i % color.length] : color,
    [0, a - PI / 2, -lean],
    detail ? { detail: true } : null,
  ]);
}

// Drooping willow fronds (inverted cones) hanging around the head.
function fronds(anglesDeg, r, y, len) {
  return anglesDeg.map((d, i) => {
    const a = (d * PI) / 180;
    return ['cone', 'head', [r * Math.sin(a), y, r * Math.cos(a)], [0.12, len, 0.12], i % 2 ? '#7CA84A' : '#95BF5E', [PI, 0, 0], i % 3 === 2 ? { detail: true } : null];
  });
}

export const FACTION = {
  id: 'moss',
  name: 'Mossgrove Kin',
  short: 'Mossgrove',
  color: MOSS,
  blurb: 'Forest spirits. They swarm, regrow, and leave the ground itchy behind them.',
  projLooks: {
    acorn: [
      ['sphere', [0, 0, 0.03], [0.18, 0.18, 0.24], '#C58A4A'],
      ['sphere', [0, 0, -0.06], [0.21, 0.21, 0.14], '#6B4A2C'],
      ['cyl', [0, 0, -0.14], [0.03, 0.07, 0.03], '#4A3222', [PI / 2, 0, 0]],
    ],
    seedpod: [
      ['sphere', [0, 0, 0], [0.34, 0.32, 0.5], '#9BAF4F'],
      ['box', [0, 0.14, 0], [0.05, 0.06, 0.42], '#6E7F35'],
      ['box', [0, -0.14, 0], [0.05, 0.06, 0.42], '#6E7F35'],
      ['cone', [0, 0, -0.3], [0.2, 0.2, 0.2], '#EDE6C8', [-PI / 2, 0, 0]],
    ],
  },
  units: [
    {
      id: 'moss_twig',
      name: 'Twigling',
      role: 'melee',
      desc: 'A stick with big ambitions. Mostly pokes shins.',
      cost: 35,
      hp: 55,
      mass: 30,
      speed: 3.8,
      scale: 0.7,
      weapon: { kind: 'swing', damage: 10, range: 1.3, cooldown: 0.7, windup: 0.25, arc: 80, maxTargets: 1, knockback: 60, sound: 'bonk' },
      ai: { range: 1.1, priority: 'near' },
      look: {
        skin: FACEWOOD,
        headColor: FACEWOOD,
        hide: ['torso', 'arms', 'legs'],
        parts: [
          // stick body in a team leaf poncho
          ['cyl', 'torso', [0, 0, 0], [0.14, 0.66, 0.14], BARK],
          ['cone', 'torso', [0, 0.04, 0], [0.5, 0.46, 0.4], 'team'],
          ['cone', 'torso', [0, -0.22, 0], [0.54, 0.06, 0.44], 'teamDark', [PI, 0, 0], { detail: true }],
          // twig limbs
          ['cyl', 'armL', [0, 0.02, 0], [0.07, 0.6, 0.07], BARK],
          ['cyl', 'armR', [0, 0.02, 0], [0.07, 0.6, 0.07], BARK],
          ['sphere', 'handL', [0, 0, 0], [0.1, 0.1, 0.1], DARKBARK],
          ['sphere', 'handR', [0, 0, 0], [0.1, 0.1, 0.1], DARKBARK],
          ['cyl', 'legL', [0, 0.02, 0], [0.08, 0.78, 0.08], BARK],
          ['cyl', 'legR', [0, 0.02, 0], [0.08, 0.78, 0.08], BARK],
          ['box', 'legL', [0, -0.37, 0.05], [0.13, 0.07, 0.22], DARKBARK],
          ['box', 'legR', [0, -0.37, 0.05], [0.13, 0.07, 0.22], DARKBARK],
          // leaf sprouts on the head
          ['cyl', 'head', [0, 0.2, 0], [0.03, 0.1, 0.03], DEEPLEAF],
          ['cone', 'head', [-0.09, 0.32, 0], [0.16, 0.32, 0.07], LEAF, [0, 0, 0.6]],
          ['cone', 'head', [0.09, 0.32, 0], [0.16, 0.32, 0.07], MOSS, [0, 0, -0.6]],
          ['sphere', 'head', [-0.1, -0.04, 0.13], [0.06, 0.04, 0.02], BLOSSOM, null, { detail: true }],
          ['sphere', 'head', [0.1, -0.04, 0.13], [0.06, 0.04, 0.02], BLOSSOM, null, { detail: true }],
          // the twig
          ['cyl', 'handR', [0, 0, 0.36], [0.05, 0.72, 0.05], BARK, [PI / 2, 0, 0]],
          ['cyl', 'handR', [0.06, 0, 0.5], [0.03, 0.22, 0.03], BARK, [PI / 2, 0, -0.7], { detail: true }],
          ['sphere', 'handR', [0, 0.02, 0.74], [0.12, 0.03, 0.2], LEAF],
        ],
      },
    },
    {
      id: 'moss_acorn',
      name: 'Acorn Plinker',
      role: 'ranged',
      desc: 'Plinks acorns at foreheads with the focus of a squirrel with a grudge.',
      cost: 45,
      hp: 70,
      mass: 55,
      speed: 3.3,
      scale: 0.9,
      weapon: {
        kind: 'projectile',
        anim: 'bow',
        damage: 12,
        range: 20,
        cooldown: 1.2,
        windup: 0.4,
        knockback: 50,
        proj: { look: 'acorn', speed: 24, gravity: 1, radius: 0.1, arc: 'low', acc: 0.6, spinRate: 10 },
        shootSound: 'shoot_throw',
        sound: 'bonk',
      },
      ai: { range: 17, kite: true, priority: 'near' },
      look: {
        skin: FACEWOOD,
        top: 'team',
        arms: MOSS,
        hands: FACEWOOD,
        legs: BARK,
        feet: DARKBARK,
        belt: DARKBARK,
        parts: [
          // acorn-cap helmet
          ['sphere', 'head', [0, 0.08, -0.01], [0.42, 0.28, 0.42], '#8A5A2B'],
          ['cyl', 'head', [0, 0.05, -0.01], [0.43, 0.05, 0.43], '#6B4A2C', null, { detail: true }],
          ['cyl', 'head', [0, 0.24, 0], [0.05, 0.1, 0.05], '#4A3222'],
          // leaf collar
          ['cone', 'torso', [0, 0.32, 0], [0.58, 0.16, 0.42], LEAF],
          ['sphere', 'head', [-0.1, -0.05, 0.13], [0.06, 0.04, 0.02], BLOSSOM, null, { detail: true }],
          ['sphere', 'head', [0.1, -0.05, 0.13], [0.06, 0.04, 0.02], BLOSSOM, null, { detail: true }],
          // acorn pouch on the hip
          ['sphere', 'torso', [-0.26, -0.18, 0.04], [0.17, 0.2, 0.16], '#8C6A48'],
          ['sphere', 'torso', [-0.26, -0.06, 0.05], [0.08, 0.08, 0.1], '#C58A4A', null, { detail: true }],
          ['sphere', 'torso', [-0.22, -0.07, 0.0], [0.08, 0.08, 0.1], '#C58A4A', null, { detail: true }],
          // Y-slingshot in the left hand (upright when aiming), team-coloured band
          ['cyl', 'handL', [0, 0, 0.11], [0.05, 0.22, 0.05], BARK, [PI / 2, 0, 0]],
          ['cyl', 'handL', [0.045, 0, 0.3], [0.045, 0.22, 0.045], BARK, [PI / 2, 0, -0.45]],
          ['cyl', 'handL', [-0.045, 0, 0.3], [0.045, 0.22, 0.045], BARK, [PI / 2, 0, 0.45]],
          ['box', 'handL', [0, 0, 0.39], [0.2, 0.025, 0.025], 'team'],
          // an acorn ready in the right hand
          ['sphere', 'handR', [0, -0.06, 0.05], [0.12, 0.12, 0.14], '#C58A4A', null, { detail: true }],
          ['sphere', 'handR', [0, -0.06, 0.0], [0.13, 0.12, 0.08], '#6B4A2C', null, { detail: true }],
        ],
      },
    },
    {
      id: 'moss_stump',
      name: 'Stumpling',
      role: 'tank',
      desc: 'An old stump that refuses to be cleared. Whatever you chop off grows back.',
      cost: 190,
      hp: 700,
      mass: 220,
      speed: 2.0,
      scale: 1.3,
      bulk: 1.4,
      weapon: { kind: 'swing', anim: 'swing2', damage: 26, range: 2.0, cooldown: 1.6, windup: 0.35, arc: 120, maxTargets: 3, knockback: 500, lift: 0.5, sound: 'bonk' },
      passive: { regen: 4 },
      ai: { range: 1.8, priority: 'near' },
      look: {
        skin: BARK,
        hide: ['torso', 'head'],
        arms: BARK,
        hands: DARKBARK,
        legs: BARK,
        feet: DARKBARK,
        parts: [
          // the stump, with a team band
          ['cyl', 'torso', [0, 0.02, 0], [0.74, 0.8, 0.6], BARK],
          ['cyl', 'torso', [0, -0.16, 0], [0.77, 0.12, 0.63], 'team'],
          ['box', 'torso', [-0.3, 0.1, 0.16], [0.05, 0.5, 0.05], DARKBARK, [0, 0, 0.05], { detail: true }],
          ['box', 'torso', [0.28, 0.05, -0.18], [0.05, 0.55, 0.05], DARKBARK, [0, 0, -0.04], { detail: true }],
          ['box', 'torso', [0.1, 0.12, -0.3], [0.05, 0.4, 0.05], DARKBARK, null, { detail: true }],
          // cut top with growth rings
          ['cyl', 'torso', [0, 0.43, 0], [0.68, 0.04, 0.55], PALEWOOD],
          ['torus', 'torso', [0, 0.45, 0], [0.46, 0.38, 0.1], '#B08968', [PI / 2, 0, 0], { detail: true }],
          ['torus', 'torso', [0, 0.45, 0], [0.24, 0.2, 0.1], '#B08968', [PI / 2, 0, 0], { detail: true }],
          // knot-hole face
          ['sphere', 'torso', [-0.12, 0.17, 0.29], [0.14, 0.15, 0.05], PALEWOOD],
          ['sphere', 'torso', [0.12, 0.17, 0.29], [0.14, 0.15, 0.05], PALEWOOD],
          ['sphere', 'torso', [-0.11, 0.16, 0.31], [0.07, 0.09, 0.03], '#2B1D14'],
          ['sphere', 'torso', [0.11, 0.16, 0.31], [0.07, 0.09, 0.03], '#2B1D14'],
          ['box', 'torso', [0, 0.02, 0.3], [0.16, 0.035, 0.03], '#2B1D14'],
          ['sphere', 'torso', [0, 0.1, 0.31], [0.06, 0.06, 0.06], DARKBARK, null, { detail: true }],
          // mushroom cluster and moss on top
          ['sphere', 'torso', [-0.14, 0.46, -0.1], [0.3, 0.08, 0.24], MOSS],
          ['cyl', 'torso', [0.16, 0.51, -0.06], [0.06, 0.14, 0.06], CREAM],
          ['sphere', 'torso', [0.16, 0.58, -0.06], [0.22, 0.12, 0.22], CAP],
          ['cyl', 'torso', [0.04, 0.49, -0.16], [0.05, 0.1, 0.05], CREAM, null, { detail: true }],
          ['sphere', 'torso', [0.04, 0.54, -0.16], [0.14, 0.08, 0.14], CAP, null, { detail: true }],
          ['sphere', 'torso', [0.13, 0.63, -0.03], [0.04, 0.03, 0.04], CREAM, null, { detail: true }],
          ['sphere', 'torso', [0.21, 0.61, -0.1], [0.04, 0.03, 0.04], CREAM, null, { detail: true }],
          // gnarled thick limbs
          ['box', 'armL', [0, 0.02, 0], [0.19, 0.5, 0.19], BARK],
          ['box', 'armR', [0, 0.02, 0], [0.19, 0.5, 0.19], BARK],
          ['box', 'legL', [0, 0.08, 0], [0.24, 0.56, 0.24], BARK],
          ['box', 'legR', [0, 0.08, 0], [0.24, 0.56, 0.24], BARK],
          // root fingers
          ['cone', 'handL', [-0.04, -0.1, 0.02], [0.06, 0.2, 0.06], DARKBARK, [PI, 0, 0.3]],
          ['cone', 'handL', [0.04, -0.1, 0.02], [0.06, 0.2, 0.06], DARKBARK, [PI, 0, -0.3]],
          ['cone', 'handR', [-0.04, -0.1, 0.02], [0.06, 0.2, 0.06], DARKBARK, [PI, 0, 0.3]],
          ['cone', 'handR', [0.04, -0.1, 0.02], [0.06, 0.2, 0.06], DARKBARK, [PI, 0, -0.3]],
          ['sphere', 'armL', [0, 0.25, 0], [0.18, 0.1, 0.18], MOSS, null, { detail: true }],
          // splayed roots at the feet
          ['cone', 'legL', [-0.1, -0.36, 0.08], [0.08, 0.26, 0.08], BARK, [1.9, 0, 0.6], { detail: true }],
          ['cone', 'legR', [0.1, -0.36, 0.08], [0.08, 0.26, 0.08], BARK, [1.9, 0, -0.6], { detail: true }],
        ],
      },
    },
    {
      id: 'moss_stag',
      name: 'Thistle Stag Rider',
      role: 'cavalry',
      desc: 'A flower-crowned rider on a stag that has never once looked where it is going.',
      cost: 160,
      hp: 240,
      mass: 200,
      speed: 7.0,
      scale: 1,
      mount: { kind: 'beast', len: 1.4, w: 0.6, h: 0.7, height: 1.1, saddle: 1.5, legs: 4, head: true, headR: 0.22, neck: 0.45 },
      weapon: { kind: 'thrust', anim: 'lance', damage: 22, range: 2.2, cooldown: 1.0, windup: 0.25, arc: 40, maxTargets: 1, knockback: 300, sound: 'stab' },
      charge: { damage: 50, knockback: 1100, cooldown: 8, speedMul: 1.35 },
      ai: { range: 1.8, priority: 'backline' },
      look: {
        skin: FACEWOOD,
        top: 'team',
        arms: MOSS,
        hands: FACEWOOD,
        legs: BARK,
        mount: { body: '#A0673D', head: '#A0673D', legs: '#7A4A2A', hoof: '#3A2A1E', saddle: 'team', legW: 0.13, noTail: true },
        parts: [
          // flower crown
          ['torus', 'head', [0, 0.12, 0], [0.38, 0.38, 0.3], LEAF, [PI / 2, 0, 0]],
          ['sphere', 'head', [0, 0.14, 0.17], [0.09, 0.09, 0.09], BLOSSOM],
          ['sphere', 'head', [0.15, 0.14, 0.08], [0.08, 0.08, 0.08], '#FFF3B0'],
          ['sphere', 'head', [-0.15, 0.14, 0.08], [0.08, 0.08, 0.08], BLOSSOM],
          ['sphere', 'head', [0.12, 0.14, -0.12], [0.08, 0.08, 0.08], BLOSSOM, null, { detail: true }],
          ['sphere', 'head', [-0.12, 0.14, -0.12], [0.08, 0.08, 0.08], '#FFF3B0', null, { detail: true }],
          // leaf cloak
          ['box', 'torso', [0, 0.0, -0.18], [0.5, 0.6, 0.04], MOSS],
          ['cone', 'torso', [-0.16, -0.36, -0.18], [0.16, 0.18, 0.05], DEEPLEAF, [PI, 0, 0], { detail: true }],
          ['cone', 'torso', [0, -0.38, -0.18], [0.16, 0.2, 0.05], DEEPLEAF, [PI, 0, 0], { detail: true }],
          ['cone', 'torso', [0.16, -0.36, -0.18], [0.16, 0.18, 0.05], DEEPLEAF, [PI, 0, 0], { detail: true }],
          ['cone', 'torso', [0, 0.32, 0], [0.56, 0.14, 0.4], LEAF],
          // thistle lance
          ['cyl', 'handR', lanceAt(0.75), [0.06, 1.5, 0.06], DEEPLEAF, [LANCE_ROT, 0, 0]],
          ['sphere', 'handR', lanceAt(1.55), [0.2, 0.22, 0.2], MOSS, [LANCE_ROT, 0, 0]],
          ['cone', 'handR', lanceAt(1.72), [0.2, 0.2, 0.2], THISTLE, [LANCE_ROT, 0, 0]],
          ['cone', 'handR', [0.1, -0.6, 1.4], [0.04, 0.14, 0.04], LEAF, [LANCE_ROT, 0, -0.9], { detail: true }],
          ['cone', 'handR', [-0.1, -0.6, 1.4], [0.04, 0.14, 0.04], LEAF, [LANCE_ROT, 0, 0.9], { detail: true }],
          // team saddle blanket
          ['box', 'mount', [-0.31, 0.12, -0.02], [0.03, 0.34, 0.6], 'team'],
          ['box', 'mount', [0.31, 0.12, -0.02], [0.03, 0.34, 0.6], 'team'],
          // white muzzle, nose, ears
          ['sphere', 'mountHead', [0, -0.07, 0.2], [0.24, 0.18, 0.24], CREAM],
          ['sphere', 'mountHead', [0, -0.03, 0.31], [0.08, 0.06, 0.05], '#2B1D14', null, { detail: true }],
          ['cone', 'mountHead', [-0.17, 0.12, -0.06], [0.08, 0.2, 0.05], '#A0673D', [0, 0, 1.1]],
          ['cone', 'mountHead', [0.17, 0.12, -0.06], [0.08, 0.2, 0.05], '#A0673D', [0, 0, -1.1]],
          // antlers: two beams with two tines each, thistle-purple tips
          ['cyl', 'mountHead', [0.21, 0.36, -0.08], [0.05, 0.5, 0.05], PALEWOOD, [-0.3, 0, -0.55]],
          ['cyl', 'mountHead', [-0.21, 0.36, -0.08], [0.05, 0.5, 0.05], PALEWOOD, [-0.3, 0, 0.55]],
          ['cyl', 'mountHead', [0.215, 0.422, 0.0], [0.04, 0.25, 0.04], PALEWOOD, [0.6, 0, -0.25]],
          ['cyl', 'mountHead', [-0.215, 0.422, 0.0], [0.04, 0.25, 0.04], PALEWOOD, [0.6, 0, 0.25]],
          ['cyl', 'mountHead', [0.335, 0.544, -0.114], [0.04, 0.2, 0.04], PALEWOOD, [0, 0, -0.64]],
          ['cyl', 'mountHead', [-0.335, 0.544, -0.114], [0.04, 0.2, 0.04], PALEWOOD, [0, 0, 0.64]],
          ['sphere', 'mountHead', [0.34, 0.56, -0.14], [0.09, 0.09, 0.09], THISTLE],
          ['sphere', 'mountHead', [-0.34, 0.56, -0.14], [0.09, 0.09, 0.09], THISTLE],
          ['sphere', 'mountHead', [0.246, 0.522, 0.067], [0.08, 0.08, 0.08], THISTLE, null, { detail: true }],
          ['sphere', 'mountHead', [-0.246, 0.522, 0.067], [0.08, 0.08, 0.08], THISTLE, null, { detail: true }],
          ['sphere', 'mountHead', [0.395, 0.624, -0.114], [0.08, 0.08, 0.08], THISTLE, null, { detail: true }],
          ['sphere', 'mountHead', [-0.395, 0.624, -0.114], [0.08, 0.08, 0.08], THISTLE, null, { detail: true }],
          // fluffy white rump tail
          ['sphere', 'mount', [0, 0.14, -0.74], [0.18, 0.2, 0.14], CREAM],
          // dappled flank spots
          ['sphere', 'mount', [0.3, 0.05, -0.35], [0.04, 0.1, 0.1], CREAM, null, { detail: true }],
          ['sphere', 'mount', [-0.3, 0.08, -0.45], [0.04, 0.1, 0.1], CREAM, null, { detail: true }],
          ['sphere', 'mount', [0.29, -0.06, -0.52], [0.04, 0.08, 0.08], CREAM, null, { detail: true }],
        ],
      },
    },
    {
      id: 'moss_seed',
      name: 'Seedpod Willow',
      role: 'siege',
      desc: 'A droopy willow that flings sneezy seedpods. They burst into itchy spore clouds.',
      cost: 150,
      hp: 170,
      mass: 240,
      speed: 1.4,
      scale: 1.9,
      weapon: {
        kind: 'projectile',
        anim: 'throw',
        damage: 45,
        range: 40,
        minRange: 6,
        cooldown: 5.0,
        windup: 0.8,
        knockback: 300,
        proj: { look: 'seedpod', speed: 21, gravity: 1, radius: 0.25, arc: 'high', splash: 2.5, acc: 0.55, spinRate: 5, cloud: { r: 3, dps: 8, time: 4 } },
        shootSound: 'shoot_throw',
      },
      ai: { range: 36, priority: 'cluster' },
      look: {
        skin: BARK,
        headColor: '#9C6B45',
        eyeColor: '#2B1D14',
        top: BARK,
        torso: 'barrel',
        belt: false,
        arms: BARK,
        hands: DARKBARK,
        legs: DARKBARK,
        feet: DARKBARK,
        parts: [
          // team sash and armband
          ['box', 'torso', [0, 0.0, 0.25], [0.12, 0.8, 0.03], 'team', [0, 0, 0.62]],
          ['box', 'torso', [0, 0.0, -0.25], [0.12, 0.8, 0.03], 'team', [0, 0, -0.62]],
          ['cyl', 'armL', [0, 0.12, 0], [0.16, 0.08, 0.16], 'team'],
          // willow canopy and drooping fronds (face left open)
          ['sphere', 'head', [0, 0.2, -0.03], [0.6, 0.32, 0.56], '#88B04B'],
          ...fronds([60, 95, 130, 165, 195, 230, 265, 300], 0.25, -0.02, 0.5),
          ['sphere', 'head', [0.14, 0.31, 0.12], [0.07, 0.07, 0.07], BLOSSOM, null, { detail: true }],
          ['sphere', 'head', [-0.16, 0.28, -0.1], [0.07, 0.07, 0.07], BLOSSOM, null, { detail: true }],
          ['sphere', 'head', [-0.08, -0.05, 0.155], [0.07, 0.04, 0.02], BLOSSOM, null, { detail: true }],
          ['sphere', 'head', [0.08, -0.05, 0.155], [0.07, 0.04, 0.02], BLOSSOM, null, { detail: true }],
          // bark knots
          ['sphere', 'torso', [0.14, 0.1, 0.2], [0.08, 0.1, 0.04], DARKBARK, null, { detail: true }],
          // long whip-branch arm with leaves and a pod cup
          ['cyl', 'handR', [0, 0, 0.7], [0.06, 1.4, 0.06], BARK, [PI / 2, 0, 0]],
          ['sphere', 'handR', [0.07, 0, 0.45], [0.12, 0.03, 0.2], LEAF, [0, 0.5, 0], { detail: true }],
          ['sphere', 'handR', [-0.07, 0, 0.85], [0.12, 0.03, 0.2], LEAF, [0, -0.5, 0], { detail: true }],
          ['sphere', 'handR', [0.07, 0, 1.15], [0.12, 0.03, 0.2], LEAF, [0, 0.5, 0], { detail: true }],
          ['cone', 'handR', [0, 0.04, 1.42], [0.24, 0.14, 0.24], DARKBARK],
          ['sphere', 'handR', [0, 0.12, 1.42], [0.17, 0.16, 0.24], '#9BAF4F'],
          // drooping leaves at the left hand
          ['cone', 'handL', [-0.04, -0.12, 0], [0.08, 0.3, 0.08], '#7CA84A', [PI, 0, 0.2], { detail: true }],
          ['cone', 'handL', [0.04, -0.12, 0], [0.08, 0.3, 0.08], '#95BF5E', [PI, 0, -0.2], { detail: true }],
          // roots at the feet
          ['cone', 'legL', [-0.1, -0.36, 0.06], [0.08, 0.26, 0.08], BARK, [1.9, 0, 0.6], { detail: true }],
          ['cone', 'legR', [0.1, -0.36, 0.06], [0.08, 0.26, 0.08], BARK, [1.9, 0, -0.6], { detail: true }],
        ],
      },
    },
    {
      id: 'moss_bloom',
      name: 'Bloom Mender',
      role: 'support',
      desc: 'Plants a patch of healing flowers wherever the team is huddled. Smells lovely.',
      cost: 70,
      hp: 90,
      mass: 60,
      speed: 3.2,
      scale: 0.9,
      weapon: { kind: 'healPatch', anim: 'raise', heal: 6, radius: 4, patchTime: 5, range: 6, cooldown: 6, windup: 0.4, look: 'bloom' },
      weapon2: { kind: 'swing', damage: 6, range: 1.4, cooldown: 1.0, arc: 90, maxTargets: 1, knockback: 60, when: 'near', sound: 'bonk' },
      ai: { range: 5, priority: 'allyFront' },
      look: {
        skin: '#B8D98A',
        headColor: '#F9E79F',
        top: MOSS,
        torso: 'cone',
        belt: false,
        arms: LEAF,
        hands: '#B8D98A',
        legs: DEEPLEAF,
        feet: MOSS,
        parts: [
          // giant tulip head: team petals around a pollen-yellow face
          ...ring('head', [PI, (2 * PI) / 3, -(2 * PI) / 3, PI / 3, -PI / 3], 0.2, 0.08, [0.1, 0.56, 0.32], 'team', 0.3),
          ...ring('head', [(5 * PI) / 6, -(5 * PI) / 6, PI / 2, -PI / 2], 0.16, 0.14, [0.08, 0.44, 0.24], 'teamDark', 0.18, true),
          ['sphere', 'head', [0, -0.16, 0], [0.34, 0.1, 0.3], DEEPLEAF],
          ['sphere', 'head', [-0.09, -0.04, 0.14], [0.06, 0.04, 0.02], BLOSSOM, null, { detail: true }],
          ['sphere', 'head', [0.09, -0.04, 0.14], [0.06, 0.04, 0.02], BLOSSOM, null, { detail: true }],
          ['box', 'head', [0, -0.07, 0.165], [0.06, 0.015, 0.01], '#2B1D14', null, { detail: true }],
          // leaf skirt
          ...[0, PI / 3, (2 * PI) / 3, PI, -(2 * PI) / 3, -PI / 3].map((a, i) => ['cone', 'torso', [0.28 * Math.sin(a), -0.34, 0.28 * Math.cos(a)], [0.07, 0.34, 0.24], i % 2 ? DEEPLEAF : LEAF, [0, a - PI / 2, PI + 0.4]]),
          // leaf shoulders and a dandelion wand
          ['sphere', 'armL', [-0.04, 0.27, 0], [0.08, 0.1, 0.22], LEAF, [0, 0, 0.5], { detail: true }],
          ['sphere', 'armR', [0.04, 0.27, 0], [0.08, 0.1, 0.22], LEAF, [0, 0, -0.5], { detail: true }],
          ['cyl', 'handR', [0, 0, 0.22], [0.03, 0.44, 0.03], DEEPLEAF, [PI / 2, 0, 0]],
          ['sphere', 'handR', [0, 0, 0.48], [0.2, 0.2, 0.2], CREAM],
          ['sphere', 'handL', [0, -0.05, 0.05], [0.12, 0.12, 0.12], BLOSSOM, null, { detail: true }],
        ],
      },
    },
    {
      id: 'moss_oak',
      name: 'Grandfather Oakheart',
      role: 'legendary',
      desc: 'Older than the hills and twice as grumpy. Twiglings drop from his branches like acorns.',
      cost: 1700,
      hp: 9000,
      mass: 1500,
      speed: 1.6,
      scale: 4.0,
      bulk: 1.25,
      staggerImmune: true,
      stability: 3,
      weapon: { kind: 'swing', anim: 'swing2', damage: 130, range: 6, cooldown: 2.8, windup: 0.9, arc: 180, maxTargets: 10, knockback: 2000, lift: 0.5, sound: 'slam' },
      passive: { summon: { id: 'moss_twig', every: 10, count: 2, max: 6 } },
      ai: { range: 5, priority: 'cluster' },
      look: {
        skin: BARK,
        headColor: '#8B6446',
        eyes: false,
        hide: ['torso'],
        arms: BARK,
        hands: DARKBARK,
        legs: BARK,
        feet: DARKBARK,
        parts: [
          // the trunk, with a team vine-band and ridges
          ['cyl', 'torso', [0, -0.02, 0], [0.66, 0.74, 0.56], BARK],
          ['cyl', 'torso', [0, -0.14, 0], [0.69, 0.1, 0.59], 'team'],
          ['cyl', 'torso', [0, -0.07, 0], [0.68, 0.03, 0.58], 'teamDark', null, { detail: true }],
          ['box', 'torso', [-0.26, 0.08, 0.16], [0.05, 0.5, 0.05], DARKBARK, null, { detail: true }],
          ['box', 'torso', [0.24, 0.02, 0.18], [0.05, 0.55, 0.05], DARKBARK, null, { detail: true }],
          ['box', 'torso', [0.02, 0.05, -0.28], [0.05, 0.6, 0.05], DARKBARK, null, { detail: true }],
          // birdhouse with a team roof
          ['box', 'torso', [0.16, 0.14, 0.3], [0.12, 0.12, 0.08], PALEWOOD],
          ['cone', 'torso', [0.16, 0.24, 0.3], [0.19, 0.09, 0.13], 'team'],
          ['sphere', 'torso', [0.16, 0.14, 0.345], [0.04, 0.04, 0.01], '#2B1D14', null, { detail: true }],
          // bracket fungus
          ['cyl', 'torso', [-0.3, -0.02, 0.06], [0.14, 0.03, 0.1], '#E9C46A', null, { detail: true }],
          ['cyl', 'torso', [-0.31, -0.08, 0.02], [0.1, 0.03, 0.08], '#E9C46A', null, { detail: true }],
          // big knotted head with glowing eyes in dark rings, bushy brows, knot nose, moss beard
          ['cyl', 'torso', [0, 0.42, 0], [0.42, 0.3, 0.38], BARK],
          ['sphere', 'head', [0, 0, 0], [0.44, 0.46, 0.42], '#8B6446'],
          ['torus', 'head', [-0.08, 0.04, 0.19], [0.13, 0.13, 0.12], DARKBARK],
          ['torus', 'head', [0.08, 0.04, 0.19], [0.13, 0.13, 0.12], DARKBARK],
          ['sphere', 'head', [-0.08, 0.04, 0.19], [0.07, 0.07, 0.04], GLOWEYE, null, { glow: true }],
          ['sphere', 'head', [0.08, 0.04, 0.19], [0.07, 0.07, 0.04], GLOWEYE, null, { glow: true }],
          ['box', 'head', [-0.09, 0.12, 0.19], [0.14, 0.045, 0.06], DEEPLEAF, [0, 0, -0.25]],
          ['box', 'head', [0.09, 0.12, 0.19], [0.14, 0.045, 0.06], DEEPLEAF, [0, 0, 0.25]],
          ['cone', 'head', [0, -0.03, 0.24], [0.08, 0.12, 0.08], DARKBARK, [PI / 2, 0, 0]],
          ['cone', 'head', [0, -0.26, 0.12], [0.34, 0.4, 0.22], MOSS, [PI - 0.3, 0, 0]],
          ['cone', 'head', [-0.12, -0.22, 0.1], [0.16, 0.28, 0.14], DEEPLEAF, [PI - 0.3, 0, 0.25], { detail: true }],
          ['cone', 'head', [0.12, -0.22, 0.1], [0.16, 0.28, 0.14], DEEPLEAF, [PI - 0.3, 0, -0.25], { detail: true }],
          // canopy
          ['sphere', 'head', [0, 0.38, -0.08], [0.9, 0.52, 0.8], MOSS],
          ['sphere', 'head', [-0.38, 0.28, -0.14], [0.52, 0.44, 0.52], '#588B3E', null, { detail: true }],
          ['sphere', 'head', [0.38, 0.3, -0.12], [0.54, 0.44, 0.52], '#7FB35A', null, { detail: true }],
          ['sphere', 'head', [0, 0.46, -0.38], [0.58, 0.46, 0.52], '#588B3E', null, { detail: true }],
          ['sphere', 'head', [0.06, 0.6, 0.0], [0.5, 0.36, 0.46], '#7FB35A', null, { detail: true }],
          ['sphere', 'head', [0.22, 0.4, 0.22], [0.07, 0.07, 0.07], BLOSSOM, null, { detail: true }],
          ['sphere', 'head', [-0.24, 0.46, 0.08], [0.07, 0.07, 0.07], BLOSSOM, null, { detail: true }],
          ['sphere', 'head', [-0.4, 0.2, 0.08], [0.07, 0.07, 0.07], BLOSSOM, null, { detail: true }],
          // branch arms with twigs and leaf tufts
          ['sphere', 'armL', [0, 0.26, 0], [0.2, 0.12, 0.2], MOSS, null, { detail: true }],
          ['sphere', 'armR', [0, 0.26, 0], [0.2, 0.12, 0.2], MOSS, null, { detail: true }],
          ['box', 'armL', [0, 0.02, 0], [0.17, 0.56, 0.17], BARK],
          ['box', 'armR', [0, 0.02, 0], [0.17, 0.56, 0.17], BARK],
          ['box', 'legL', [0, 0.06, 0], [0.22, 0.62, 0.22], BARK],
          ['box', 'legR', [0, 0.06, 0], [0.22, 0.62, 0.22], BARK],
          ['cyl', 'armL', [-0.12, -0.02, 0], [0.04, 0.3, 0.04], BARK, [0, 0, 0.8], { detail: true }],
          ['sphere', 'armL', [-0.22, 0.07, 0], [0.18, 0.16, 0.18], LEAF, null, { detail: true }],
          ['cyl', 'armR', [0.12, 0.06, 0], [0.04, 0.3, 0.04], BARK, [0, 0, -0.8], { detail: true }],
          ['sphere', 'armR', [0.22, 0.15, 0], [0.18, 0.16, 0.18], MOSS, null, { detail: true }],
          ['cone', 'armL', [0.0, -0.05, 0.1], [0.08, 0.2, 0.04], DEEPLEAF, [PI, 0, 0], { detail: true }],
          // the great branch club
          ['cyl', 'handR', [0, 0, 0.8], [0.14, 1.6, 0.14], BARK, [PI / 2, 0, 0]],
          ['sphere', 'handR', [0, 0, 1.6], [0.26, 0.26, 0.3], DARKBARK],
          ['cyl', 'handR', [0.12, 0, 1.1], [0.05, 0.36, 0.05], BARK, [PI / 2, 0, -0.7]],
          ['sphere', 'handR', [0.24, 0.04, 1.24], [0.26, 0.2, 0.26], LEAF],
          ['sphere', 'handR', [-0.1, 0.06, 1.42], [0.22, 0.18, 0.22], MOSS, null, { detail: true }],
          // roots at the feet
          ['cone', 'legL', [-0.12, -0.36, 0.08], [0.1, 0.3, 0.1], BARK, [1.9, 0, 0.6]],
          ['cone', 'legR', [0.12, -0.36, 0.08], [0.1, 0.3, 0.1], BARK, [1.9, 0, -0.6]],
          ['cone', 'legL', [0.02, -0.37, -0.12], [0.08, 0.24, 0.08], BARK, [-1.9, 0, 0], { detail: true }],
          ['cone', 'legR', [-0.02, -0.37, -0.12], [0.08, 0.24, 0.08], BARK, [-1.9, 0, 0], { detail: true }],
        ],
      },
    },
  ],
};
