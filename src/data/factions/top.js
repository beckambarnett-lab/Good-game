// Big Top Bonanza: a traveling circus. Knockback chaos: enemies get launched, juggled and fired
// out of cannons. Palette: grape, lemon, bubblegum. See docs/schema.md for the UnitDef schema.
const GRAPE = '#9B5DE5';
const LEMON = '#FEE440';
const BUBBLE = '#F15BB5';
const SKIN = '#FFE0CC';
const WHITE = '#FFFFFF';
const CREAM = '#F7F1E8';
const RED = '#E63946';
const ORANGE = '#FF8C42';
const INK = '#2B2D42';
const WOOD = '#C98B55';
const STEEL = '#B8BDC7';
const PI = Math.PI;
const D = { detail: true };

// A juggling pin held in a hand, pointing forward (+z).
const heldPin = (bone, c) => [
  ['cyl', bone, [0, 0, 0.12], [0.05, 0.2, 0.05], WHITE, [PI / 2, 0, 0]],
  ['sphere', bone, [0, 0, 0.3], [0.12, 0.12, 0.22], WHITE],
  ['cyl', bone, [0, 0, 0.22], [0.075, 0.04, 0.075], c, [PI / 2, 0, 0], D],
  ['sphere', bone, [0, 0, 0.02], [0.07, 0.07, 0.07], c, null, D],
];

// A ring of cones fanning out and down from a point (jester collars, ruffles).
// dir(a) = (sin a, ., cos a) horizontally; phi tilts the cone away from straight up.
function collar(bone, y, r, n, len, dia, colors, phi, a0 = 0) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * 2 * PI;
    const dx = Math.sin(phi) * Math.sin(a);
    const dy = Math.cos(phi);
    const dz = Math.sin(phi) * Math.cos(a);
    const pos = [Math.sin(a) * r + dx * len * 0.5, y + dy * len * 0.5, Math.cos(a) * r + dz * len * 0.5];
    out.push(['cone', bone, pos, [dia, len, dia * 0.6], colors[k % colors.length], [0, a - PI / 2, -phi]]);
  }
  return out;
}

// Lance along the hand-frame diagonal d = (0, -0.707, 0.707): couched low at rest, tilts up on the thrust.
const LANCE_ROT = [(3 * PI) / 4, 0, 0];
const lanceAt = (t) => [0, -0.7071 * t, 0.7071 * t];

export const FACTION = {
  id: 'top',
  name: 'Big Top Bonanza',
  short: 'Big Top',
  color: GRAPE,
  blurb: 'A traveling circus. Knockback chaos: enemies get launched, juggled and fired out of cannons.',
  projLooks: {
    pin: [
      ['cyl', [0, 0, -0.08], [0.06, 0.22, 0.06], WHITE, [PI / 2, 0, 0]],
      ['sphere', [0, 0, 0.1], [0.13, 0.13, 0.24], WHITE],
      ['cyl', [0, 0, 0.02], [0.08, 0.05, 0.08], RED, [PI / 2, 0, 0]],
      ['sphere', [0, 0, -0.2], [0.08, 0.08, 0.08], RED],
    ],
    stuntclown: [
      ['sphere', [0, 0, 0], [0.42, 0.42, 0.62], BUBBLE],
      ['sphere', [0, 0.02, 0.38], [0.3, 0.3, 0.3], CREAM],
      ['sphere', [0, 0.08, 0.38], [0.34, 0.24, 0.34], LEMON],
      ['sphere', [0, -0.01, 0.54], [0.09, 0.09, 0.09], RED],
      ['sphere', [-0.15, 0.06, 0.34], [0.1, 0.1, 0.1], ORANGE],
      ['sphere', [0.15, 0.06, 0.34], [0.1, 0.1, 0.1], ORANGE],
      ['cyl', [-0.14, 0.05, 0.52], [0.08, 0.36, 0.08], GRAPE, [PI / 2, 0, 0]],
      ['cyl', [0.14, 0.05, 0.52], [0.08, 0.36, 0.08], GRAPE, [PI / 2, 0, 0]],
      ['sphere', [-0.14, 0.05, 0.72], [0.1, 0.1, 0.1], WHITE],
      ['sphere', [0.14, 0.05, 0.72], [0.1, 0.1, 0.1], WHITE],
      ['cyl', [-0.1, 0, -0.42], [0.11, 0.42, 0.11], GRAPE, [PI / 2, 0, 0]],
      ['cyl', [0.1, 0, -0.42], [0.11, 0.42, 0.11], GRAPE, [PI / 2, 0, 0]],
      ['sphere', [-0.1, 0, -0.66], [0.14, 0.12, 0.2], RED],
      ['sphere', [0.1, 0, -0.66], [0.14, 0.12, 0.2], RED],
      ['box', [0, 0.18, -0.2], [0.34, 0.03, 0.5], RED, [0.25, 0, 0]],
    ],
  },
  units: [
    {
      id: 'top_clown',
      name: 'Mallet Clown',
      role: 'melee',
      desc: 'Honk nose, huge shoes, bigger mallet. Every bonk squeaks and every victim flies.',
      cost: 60,
      hp: 110,
      mass: 75,
      speed: 3.2,
      scale: 1,
      weapon: { kind: 'swing', damage: 16, range: 1.8, cooldown: 1.3, windup: 0.3, arc: 90, maxTargets: 2, knockback: 480, sound: 'squeak' },
      ai: { range: 1.6, priority: 'near' },
      look: {
        skin: SKIN,
        headColor: CREAM,
        top: 'team',
        arms: 'team',
        hands: WHITE,
        legs: GRAPE,
        feet: RED,
        torso: 'round',
        belt: false,
        parts: [
          // face
          ['sphere', 'head', [0, -0.01, 0.18], [0.11, 0.11, 0.11], RED],
          ['box', 'head', [0, -0.09, 0.148], [0.12, 0.025, 0.03], RED, null, D],
          ['box', 'head', [-0.07, -0.075, 0.145], [0.045, 0.022, 0.03], RED, [0, 0, -0.6], D],
          ['box', 'head', [0.07, -0.075, 0.145], [0.045, 0.022, 0.03], RED, [0, 0, 0.6], D],
          ['box', 'head', [-0.065, 0.1, 0.14], [0.035, 0.035, 0.02], '#3A86FF', [0, 0, PI / 4], D],
          ['box', 'head', [0.065, 0.1, 0.14], [0.035, 0.035, 0.02], '#3A86FF', [0, 0, PI / 4], D],
          // hair puffs and tiny hat
          ['sphere', 'head', [-0.17, 0.03, -0.02], [0.16, 0.18, 0.2], ORANGE],
          ['sphere', 'head', [0.17, 0.03, -0.02], [0.16, 0.18, 0.2], ORANGE],
          ['sphere', 'head', [0, 0.03, -0.13], [0.22, 0.18, 0.14], ORANGE, null, D],
          ['cyl', 'head', [0.03, 0.17, 0], [0.15, 0.02, 0.15], BUBBLE],
          ['cone', 'head', [0.04, 0.27, 0], [0.13, 0.2, 0.13], LEMON, [0, 0, -0.2]],
          ['sphere', 'head', [0.06, 0.37, 0], [0.07, 0.07, 0.07], BUBBLE, null, D],
          // ruffle collar and puffball buttons
          ['cyl', 'torso', [0, 0.3, 0], [0.62, 0.08, 0.52], LEMON],
          ['cyl', 'torso', [0, 0.335, 0], [0.48, 0.06, 0.4], WHITE, null, D],
          ['sphere', 'torso', [0, 0.15, 0.245], [0.11, 0.11, 0.09], LEMON],
          ['sphere', 'torso', [0, -0.01, 0.28], [0.11, 0.11, 0.09], WHITE],
          ['sphere', 'torso', [0, -0.17, 0.26], [0.11, 0.11, 0.09], LEMON],
          // pant cuffs and giant shoes
          ['cyl', 'legL', [0, -0.24, 0], [0.24, 0.08, 0.24], LEMON, null, D],
          ['cyl', 'legR', [0, -0.24, 0], [0.24, 0.08, 0.24], LEMON, null, D],
          ['sphere', 'legL', [0, -0.37, 0.13], [0.22, 0.14, 0.46], RED],
          ['sphere', 'legR', [0, -0.37, 0.13], [0.22, 0.14, 0.46], RED],
          // squeaky mallet: handle forward, fat head across it
          ['cyl', 'handR', [0, 0, 0.42], [0.06, 0.84, 0.06], WOOD, [PI / 2, 0, 0]],
          ['cyl', 'handR', [0, 0, 0.9], [0.38, 0.52, 0.38], BUBBLE],
          ['cyl', 'handR', [0, 0.27, 0.9], [0.4, 0.05, 0.4], LEMON],
          ['cyl', 'handR', [0, -0.27, 0.9], [0.4, 0.05, 0.4], LEMON],
          ['cyl', 'handR', [0, 0, 0.9], [0.4, 0.1, 0.4], WHITE, null, D],
        ],
      },
    },
    {
      id: 'top_juggler',
      name: 'Pin Juggler',
      role: 'ranged',
      desc: 'Throws three pins at once. Aims at nobody in particular, hits somebody in particular.',
      cost: 55,
      hp: 75,
      mass: 60,
      speed: 3.4,
      scale: 0.95,
      weapon: {
        kind: 'projectile',
        anim: 'throw',
        damage: 10,
        range: 18,
        cooldown: 1.8,
        windup: 0.4,
        knockback: 60,
        proj: { look: 'pin', speed: 20, gravity: 0.8, radius: 0.13, arc: 'low', acc: 0.45, count: 3, spread: 12, spinRate: 16 },
        shootSound: 'shoot_throw',
        sound: 'bonk',
      },
      ai: { range: 15, kite: true, priority: 'near' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: 'team',
        legs: 'team',
        feet: LEMON,
        hands: WHITE,
        belt: LEMON,
        parts: [
          // two-tone jester hat with bells
          ['sphere', 'head', [0, 0.1, -0.01], [0.38, 0.22, 0.38], 'team'],
          ['cone', 'head', [-0.13, 0.22, 0], [0.13, 0.36, 0.13], 'team', [0, 0, 0.95]],
          ['cone', 'head', [0.13, 0.22, 0], [0.13, 0.36, 0.13], LEMON, [0, 0, -0.95]],
          ['sphere', 'head', [-0.28, 0.33, 0], [0.09, 0.09, 0.09], LEMON],
          ['sphere', 'head', [0.28, 0.33, 0], [0.09, 0.09, 0.09], BUBBLE],
          ['cyl', 'head', [0, 0.06, 0], [0.4, 0.05, 0.4], LEMON, null, D],
          ['sphere', 'head', [-0.1, -0.05, 0.14], [0.05, 0.05, 0.02], BUBBLE, null, D],
          ['sphere', 'head', [0.1, -0.05, 0.14], [0.05, 0.05, 0.02], BUBBLE, null, D],
          // harlequin: lemon sleeve and trouser leg, diamond patches
          ['box', 'armR', [0, 0.03, 0], [0.14, 0.59, 0.14], LEMON],
          ['box', 'legL', [0, 0.04, 0], [0.17, 0.72, 0.18], LEMON],
          ['box', 'torso', [-0.11, 0.1, 0.155], [0.16, 0.16, 0.02], LEMON, [0, 0, PI / 4]],
          ['box', 'torso', [0.11, -0.1, 0.155], [0.16, 0.16, 0.02], LEMON, [0, 0, PI / 4]],
          ['box', 'torso', [0.11, 0.1, 0.155], [0.1, 0.1, 0.02], BUBBLE, [0, 0, PI / 4], D],
          ['box', 'torso', [-0.11, -0.1, 0.155], [0.1, 0.1, 0.02], BUBBLE, [0, 0, PI / 4], D],
          ['box', 'torso', [0.11, 0.1, -0.155], [0.16, 0.16, 0.02], LEMON, [0, 0, PI / 4], D],
          ['box', 'torso', [-0.11, -0.1, -0.155], [0.16, 0.16, 0.02], LEMON, [0, 0, PI / 4], D],
          // jester collar
          ...collar('torso', 0.29, 0.13, 6, 0.2, 0.15, [LEMON, BUBBLE], 1.95),
          // curly toes
          ['cone', 'legL', [0, -0.31, 0.27], [0.1, 0.2, 0.08], 'team', [1.1, 0, 0]],
          ['cone', 'legR', [0, -0.31, 0.27], [0.1, 0.2, 0.08], LEMON, [1.1, 0, 0]],
          // a pin in each hand
          ...heldPin('handR', RED),
          ...heldPin('handL', GRAPE),
        ],
      },
    },
    {
      id: 'top_strong',
      name: 'Iron Strongman',
      role: 'tank',
      desc: 'Lifts a thousand pounds before breakfast. Lifts you after.',
      cost: 210,
      hp: 700,
      mass: 180,
      speed: 2.3,
      scale: 1.25,
      bulk: 1.35,
      weapon: { kind: 'swing', anim: 'swing2', damage: 35, range: 2.2, cooldown: 1.8, windup: 0.4, arc: 140, maxTargets: 3, knockback: 750, lift: 0.45, sound: 'bonk' },
      ai: { range: 1.8, priority: 'near' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: SKIN,
        hands: SKIN,
        legs: INK,
        feet: '#3D2B1F',
        belt: false,
        parts: [
          // slick hair and handlebar moustache
          ['sphere', 'head', [0, 0.08, -0.02], [0.37, 0.22, 0.37], '#1B1B1B'],
          ['sphere', 'head', [-0.075, -0.06, 0.162], [0.14, 0.05, 0.05], '#1B1B1B', [0, 0, -0.3]],
          ['sphere', 'head', [0.075, -0.06, 0.162], [0.14, 0.05, 0.05], '#1B1B1B', [0, 0, 0.3]],
          ['sphere', 'head', [-0.145, -0.025, 0.13], [0.05, 0.05, 0.05], '#1B1B1B', null, D],
          ['sphere', 'head', [0.145, -0.025, 0.13], [0.05, 0.05, 0.05], '#1B1B1B', null, D],
          // striped singlet over a massive chest, bare shoulders
          ['box', 'torso', [0, 0.12, 0], [0.64, 0.07, 0.42], WHITE],
          ['box', 'torso', [0, -0.04, 0], [0.64, 0.07, 0.42], WHITE],
          ['sphere', 'torso', [-0.34, 0.24, 0], [0.26, 0.24, 0.28], SKIN],
          ['sphere', 'torso', [0.34, 0.24, 0], [0.26, 0.24, 0.28], SKIN],
          ['sphere', 'armL', [0, 0.06, 0.01], [0.21, 0.3, 0.21], SKIN],
          ['sphere', 'armR', [0, 0.06, 0.01], [0.21, 0.3, 0.21], SKIN],
          ['cyl', 'armL', [0, -0.2, 0], [0.17, 0.08, 0.17], LEMON, null, D],
          ['cyl', 'armR', [0, -0.2, 0], [0.17, 0.08, 0.17], LEMON, null, D],
          // championship belt
          ['box', 'torso', [0, -0.25, 0], [0.65, 0.13, 0.43], LEMON],
          ['cyl', 'torso', [0, -0.25, 0.215], [0.2, 0.03, 0.2], '#E0B000', [PI / 2, 0, 0]],
          ['sphere', 'torso', [0, -0.25, 0.235], [0.08, 0.08, 0.04], BUBBLE, null, D],
          ['box', 'legL', [0, -0.32, 0.04], [0.21, 0.18, 0.3], '#3D2B1F', null, D],
          ['box', 'legR', [0, -0.32, 0.04], [0.21, 0.18, 0.3], '#3D2B1F', null, D],
          // giant dumbbell in the right hand, little kettlebell in the left
          ['cyl', 'handR', [0, 0, 0.05], [0.08, 1.0, 0.08], STEEL, [PI / 2, 0, 0]],
          ['sphere', 'handR', [0, 0, 0.55], [0.46, 0.46, 0.46], INK],
          ['sphere', 'handR', [0, 0, -0.45], [0.4, 0.4, 0.4], INK],
          ['cyl', 'handR', [0, 0, 0.55], [0.48, 0.08, 0.48], LEMON, [PI / 2, 0, 0], D],
          ['cyl', 'handR', [0, 0, -0.45], [0.42, 0.08, 0.42], LEMON, [PI / 2, 0, 0], D],
          ['sphere', 'handL', [0, -0.16, 0.02], [0.24, 0.22, 0.24], INK],
          ['torus', 'handL', [0, -0.03, 0.02], [0.16, 0.16, 0.2], INK, [0, PI / 2, 0], D],
        ],
      },
    },
    {
      id: 'top_unicycle',
      name: 'Unicycle Lancer',
      role: 'cavalry',
      desc: 'One wheel, one lance, zero brakes. Pedals straight for your archers.',
      cost: 135,
      hp: 180,
      mass: 110,
      speed: 7.5,
      scale: 1,
      mount: { kind: 'wheel', len: 0.3, w: 0.3, h: 0.6, height: 1.15, saddle: 1.6, wheels: 1, wheelR: 0.66, rider: 'stand' },
      weapon: { kind: 'thrust', anim: 'lance', damage: 18, range: 2.8, cooldown: 1.0, windup: 0.25, arc: 40, maxTargets: 1, knockback: 250, sound: 'stab' },
      charge: { damage: 60, knockback: 1100, cooldown: 8, speedMul: 1.35, reach: 1.4 },
      ai: { range: 2.4, priority: 'backline' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: 'team',
        hands: WHITE,
        legs: WHITE,
        feet: RED,
        mount: { wheel: BUBBLE, wheelShape: 'torus', noBody: true, noSaddle: true },
        parts: [
          // pointy star hat and frilly collar
          ['cyl', 'head', [0, 0.13, 0], [0.38, 0.04, 0.38], LEMON],
          ['cone', 'head', [0, 0.36, -0.01], [0.28, 0.48, 0.28], 'team'],
          ['sphere', 'head', [0, 0.61, -0.01], [0.09, 0.09, 0.09], LEMON],
          ['sphere', 'head', [0.07, 0.3, 0.1], [0.06, 0.06, 0.03], LEMON, null, D],
          ['sphere', 'head', [-0.05, 0.42, 0.07], [0.05, 0.05, 0.03], LEMON, null, D],
          ...collar('torso', 0.3, 0.12, 6, 0.15, 0.15, [LEMON, WHITE], 1.85),
          ['box', 'torso', [0, 0, 0.155], [0.08, 0.72, 0.02], BUBBLE, [0, 0, 0.6]],
          ['box', 'legL', [0, 0.1, 0], [0.17, 0.12, 0.18], BUBBLE, null, D],
          ['box', 'legR', [0, -0.1, 0], [0.17, 0.12, 0.18], BUBBLE, null, D],
          // unicycle: fork, seat, cranks, hub (wheel centre is 0.43 below the mount centre)
          ['cyl', 'mount', [-0.2, -0.03, 0], [0.05, 0.8, 0.05], STEEL],
          ['cyl', 'mount', [0.2, -0.03, 0], [0.05, 0.8, 0.05], STEEL],
          ['box', 'mount', [0, 0.38, 0], [0.46, 0.06, 0.1], STEEL],
          ['cyl', 'mount', [0, 0.43, 0], [0.06, 0.1, 0.06], STEEL, null, D],
          ['box', 'mount', [0, 0.49, 0], [0.24, 0.08, 0.34], 'team'],
          ['cyl', 'mount', [0, -0.43, 0], [0.06, 0.56, 0.06], INK, [0, 0, PI / 2]],
          ['box', 'mount', [-0.28, -0.43, 0.08], [0.1, 0.03, 0.16], INK, null, D],
          ['box', 'mount', [0.28, -0.43, -0.08], [0.1, 0.03, 0.16], INK, null, D],
          ['torus', 'wheel', [0, -0.43, 0], [0.9, 0.9, 0.9], LEMON, [0, PI / 2, 0]],
          ['sphere', 'wheel', [0, -0.43, 0], [0.18, 0.18, 0.18], LEMON],
          // candy-striped lance, couched low
          ['cone', 'handR', lanceAt(1.0), [0.2, 1.8, 0.2], WHITE, LANCE_ROT],
          ['torus', 'handR', lanceAt(0.45), [0.21, 0.21, 0.3], BUBBLE, [PI / 4, 0, 0]],
          ['torus', 'handR', lanceAt(0.85), [0.16, 0.16, 0.26], BUBBLE, [PI / 4, 0, 0], D],
          ['torus', 'handR', lanceAt(1.25), [0.1, 0.1, 0.2], BUBBLE, [PI / 4, 0, 0], D],
          ['cone', 'handR', lanceAt(0.16), [0.34, 0.18, 0.34], LEMON, [-PI / 4, 0, 0]],
          ['cyl', 'handR', lanceAt(-0.08), [0.06, 0.34, 0.06], WOOD, LANCE_ROT],
        ],
      },
    },
    {
      id: 'top_cannon',
      name: 'Cannonball Cannon',
      role: 'siege',
      desc: 'Fires a stunt clown in a crash helmet. The clown volunteered. Twice.',
      cost: 175,
      hp: 180,
      mass: 260,
      speed: 1.5,
      scale: 1,
      mount: { kind: 'cart', len: 2.0, w: 1.3, h: 0.45, height: 0.62, saddle: 0.9, riderZ: -0.62, wheels: 4, wheelR: 0.42 },
      weapon: {
        kind: 'projectile',
        anim: 'point',
        damage: 60,
        range: 40,
        minRange: 4,
        cooldown: 4.5,
        windup: 0.7,
        knockback: 1200,
        muzzle: { bone: 'mount', at: [0, 1.25, 1.02] },
        proj: { look: 'stuntclown', speed: 27, gravity: 1, radius: 0.35, arc: 'low', splash: 2.5, acc: 0.55, spinRate: 0 },
        shootSound: 'shoot_cannon',
        sound: 'bonk',
      },
      ai: { range: 34, priority: 'cluster' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: 'team',
        hands: WHITE,
        legs: GRAPE,
        mount: { body: GRAPE, trim: LEMON, wheel: BUBBLE, hub: LEMON },
        parts: [
          // operator: crash helmet and goggles
          ['sphere', 'head', [0, 0.07, -0.01], [0.39, 0.3, 0.39], LEMON],
          ['box', 'head', [0, 0.14, 0], [0.08, 0.2, 0.4], 'team'],
          ['cyl', 'head', [0, 0.06, 0], [0.4, 0.05, 0.4], INK, null, D],
          ['cyl', 'head', [-0.07, 0.05, 0.17], [0.1, 0.05, 0.1], '#8FE3FF', [PI / 2, 0, 0], D],
          ['cyl', 'head', [0.07, 0.05, 0.17], [0.1, 0.05, 0.1], '#8FE3FF', [PI / 2, 0, 0], D],
          ['sphere', 'head', [0, -0.02, 0.18], [0.08, 0.08, 0.08], RED, null, D],
          // star-painted cannon barrel, 35 degrees up
          ['cyl', 'mount', [0, 0.74, 0.32], [0.62, 1.5, 0.62], GRAPE, [0.96, 0, 0]],
          ['cyl', 'mount', [0, 0.92, 0.57], [0.66, 0.16, 0.66], 'team', [0.96, 0, 0]],
          ['cyl', 'mount', [0, 0.57, 0.08], [0.66, 0.16, 0.66], 'team', [0.96, 0, 0], D],
          ['torus', 'mount', [0, 1.17, 0.93], [0.8, 0.8, 1.2], LEMON, [-0.61, 0, 0]],
          ['cyl', 'mount', [0, 1.175, 0.935], [0.46, 0.02, 0.46], INK, [0.96, 0, 0]],
          ['sphere', 'mount', [0, 0.28, -0.3], [0.5, 0.5, 0.5], GRAPE],
          ['sphere', 'mount', [0, 0.5, -0.45], [0.1, 0.1, 0.1], ORANGE, null, { glow: true }],
          ['sphere', 'mount', [-0.3, 0.8, 0.4], [0.04, 0.16, 0.16], LEMON, [0.96, 0, 0], D],
          ['sphere', 'mount', [0.3, 0.8, 0.4], [0.04, 0.16, 0.16], LEMON, [0.96, 0, 0], D],
          ['sphere', 'mount', [-0.3, 0.6, 0.1], [0.04, 0.12, 0.12], BUBBLE, [0.96, 0, 0], D],
          ['sphere', 'mount', [0.3, 0.6, 0.1], [0.04, 0.12, 0.12], BUBBLE, [0.96, 0, 0], D],
          // cradle and trunnion
          ['box', 'mount', [-0.38, 0.45, 0.2], [0.1, 0.5, 0.5], LEMON],
          ['box', 'mount', [0.38, 0.45, 0.2], [0.1, 0.5, 0.5], LEMON],
          ['cyl', 'mount', [0, 0.62, 0.22], [0.14, 0.9, 0.14], INK, [0, 0, PI / 2], D],
          // team pennant
          ['cyl', 'mount', [-0.55, 1.0, -0.88], [0.05, 1.7, 0.05], WOOD],
          ['cone', 'mount', [-0.55, 1.7, -0.62], [0.03, 0.52, 0.36], 'team', [PI / 2, 0, 0]],
          ['sphere', 'mount', [-0.55, 1.87, -0.88], [0.09, 0.09, 0.09], LEMON, null, D],
          // bunting stars on the cart sides
          ['box', 'mount', [-0.66, 0.1, 0.3], [0.03, 0.16, 0.16], LEMON, [PI / 4, 0, 0], D],
          ['box', 'mount', [0.66, 0.1, 0.3], [0.03, 0.16, 0.16], LEMON, [PI / 4, 0, 0], D],
          ['box', 'mount', [-0.66, 0.1, -0.3], [0.03, 0.16, 0.16], BUBBLE, [PI / 4, 0, 0], D],
          ['box', 'mount', [0.66, 0.1, -0.3], [0.03, 0.16, 0.16], BUBBLE, [PI / 4, 0, 0], D],
        ],
      },
    },
    {
      id: 'top_ring',
      name: 'Ringmaster',
      role: 'support',
      desc: 'Shouts "FASTER!" through a megaphone. Everyone nearby panics into a sprint.',
      cost: 115,
      hp: 120,
      mass: 70,
      speed: 3.2,
      scale: 1,
      weapon: { kind: 'buff', anim: 'point', range: 7, radius: 8, cooldown: 4, windup: 0.35, buff: { kind: 'haste', time: 5 }, sound: 'whoosh' },
      weapon2: { kind: 'thrust', damage: 10, range: 3.0, cooldown: 1.0, arc: 40, maxTargets: 1, knockback: 120, when: 'near', sound: 'slash' },
      ai: { range: 6, priority: 'allyFront' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: 'team',
        hands: WHITE,
        legs: CREAM,
        feet: INK,
        belt: INK,
        parts: [
          // top hat
          ['cyl', 'head', [0, 0.15, 0], [0.48, 0.03, 0.48], INK],
          ['cyl', 'head', [0, 0.35, 0], [0.3, 0.38, 0.3], INK],
          ['cyl', 'head', [0, 0.21, 0], [0.315, 0.08, 0.315], 'team'],
          ['cyl', 'head', [0, 0.54, 0], [0.31, 0.02, 0.31], '#44475E', null, D],
          // curly moustache and sideburns
          ['sphere', 'head', [-0.06, -0.06, 0.165], [0.11, 0.035, 0.04], '#6B3E26', [0, 0, 0.35]],
          ['sphere', 'head', [0.06, -0.06, 0.165], [0.11, 0.035, 0.04], '#6B3E26', [0, 0, -0.35]],
          ['box', 'head', [-0.165, 0, 0.03], [0.03, 0.14, 0.08], '#6B3E26', null, D],
          ['box', 'head', [0.165, 0, 0.03], [0.03, 0.14, 0.08], '#6B3E26', null, D],
          // shirt front, bow tie, lapels, buttons, epaulettes
          ['box', 'torso', [0, 0.1, 0.152], [0.16, 0.38, 0.02], WHITE],
          ['cone', 'torso', [-0.045, 0.26, 0.17], [0.07, 0.08, 0.03], LEMON, [0, 0, PI / 2]],
          ['cone', 'torso', [0.045, 0.26, 0.17], [0.07, 0.08, 0.03], LEMON, [0, 0, -PI / 2]],
          ['box', 'torso', [-0.11, 0.12, 0.158], [0.07, 0.34, 0.02], 'teamDark', [0, 0, -0.25]],
          ['box', 'torso', [0.11, 0.12, 0.158], [0.07, 0.34, 0.02], 'teamDark', [0, 0, 0.25]],
          ['sphere', 'torso', [-0.13, -0.08, 0.16], [0.045, 0.045, 0.03], LEMON, null, D],
          ['sphere', 'torso', [0.13, -0.08, 0.16], [0.045, 0.045, 0.03], LEMON, null, D],
          ['sphere', 'torso', [-0.13, -0.16, 0.16], [0.045, 0.045, 0.03], LEMON, null, D],
          ['sphere', 'torso', [0.13, -0.16, 0.16], [0.045, 0.045, 0.03], LEMON, null, D],
          ['box', 'torso', [-0.27, 0.3, 0], [0.16, 0.05, 0.2], LEMON],
          ['box', 'torso', [0.27, 0.3, 0], [0.16, 0.05, 0.2], LEMON],
          // tailcoat flaps
          ['box', 'torso', [-0.1, -0.5, -0.13], [0.17, 0.48, 0.04], 'team', [0.14, 0, 0.04]],
          ['box', 'torso', [0.1, -0.5, -0.13], [0.17, 0.48, 0.04], 'team', [0.14, 0, -0.04]],
          // riding boots
          ['box', 'legL', [0, -0.2, 0.01], [0.19, 0.4, 0.2], INK, null, D],
          ['box', 'legR', [0, -0.2, 0.01], [0.19, 0.4, 0.2], INK, null, D],
          // megaphone hanging from the right hand (points ahead when he points)
          ['cone', 'handR', [0, -0.2, 0.02], [0.26, 0.34, 0.26], LEMON],
          ['torus', 'handR', [0, -0.37, 0.02], [0.32, 0.32, 0.3], BUBBLE, [PI / 2, 0, 0]],
          ['box', 'handR', [0, -0.12, -0.08], [0.04, 0.1, 0.1], INK, null, D],
          // whip in the left hand, coil on the hip
          ['cyl', 'handL', [0, 0, 0.14], [0.05, 0.3, 0.05], '#5A3A22', [PI / 2, 0, 0]],
          ['cyl', 'handL', [0, -0.12, 0.62], [0.025, 0.72, 0.025], '#3B2618', [PI / 2 + 0.35, 0, 0]],
          ['torus', 'torso', [-0.25, -0.22, 0.02], [0.22, 0.22, 0.22], '#3B2618', [0, PI / 2, 0], D],
        ],
      },
    },
    {
      id: 'top_bouncer',
      name: 'Big Bouncy Bertram',
      role: 'legendary',
      desc: 'An inflatable strongman the size of a tent. Hops up, belly-flops down, and the whole field goes airborne.',
      cost: 1400,
      hp: 6000,
      mass: 400,
      speed: 3.0,
      scale: 3.4,
      bulk: 1.3,
      hoverMul: 0.4,
      staggerImmune: true,
      stability: 3,
      weapon: { kind: 'slam', anim: 'slam', damage: 70, range: 3.5, radius: 5, reach: 0.4, cooldown: 2.2, windup: 0.9, hop: 13, knockback: 2200, lift: 0.9, sound: 'slam' },
      ai: { range: 3, priority: 'cluster' },
      look: {
        skin: '#FF9BD2',
        headColor: '#FF9BD2',
        top: BUBBLE,
        legs: BUBBLE,
        hide: ['torso', 'arms', 'legs', 'head'],
        parts: [
          ['sphere', 'head', [0, 0.02, 0], [0.46, 0.44, 0.44], '#FF9BD2'],
          // balloon body
          ['sphere', 'torso', [0, -0.02, 0], [0.95, 0.86, 0.8], BUBBLE],
          ['sphere', 'torso', [0, -0.2, 0], [0.96, 0.62, 0.82], 'team'],
          ['cyl', 'torso', [0, -0.16, 0], [0.97, 0.16, 0.82], LEMON],
          ['cyl', 'torso', [0, -0.16, 0.4], [0.3, 0.03, 0.3], LEMON, [PI / 2, 0, 0]],
          ['sphere', 'torso', [0, -0.16, 0.415], [0.14, 0.14, 0.04], 'team', [0, 0, PI / 4]],
          ['sphere', 'torso', [-0.18, 0.1, 0.33], [0.2, 0.16, 0.08], '#FF9BD2', null, D],
          ['sphere', 'torso', [0.18, 0.1, 0.33], [0.2, 0.16, 0.08], '#FF9BD2', null, D],
          // valve nozzle on the back
          ['cyl', 'torso', [0, 0.05, -0.4], [0.1, 0.12, 0.1], LEMON, [PI / 2, 0, 0]],
          ['sphere', 'torso', [0, 0.05, -0.47], [0.12, 0.12, 0.06], RED],
          // stubby balloon limbs
          ['sphere', 'armL', [0, 0, 0], [0.3, 0.74, 0.3], BUBBLE],
          ['sphere', 'armR', [0, 0, 0], [0.3, 0.74, 0.3], BUBBLE],
          ['sphere', 'handL', [0, 0, 0], [0.28, 0.28, 0.28], '#FF9BD2'],
          ['sphere', 'handR', [0, 0, 0], [0.28, 0.28, 0.28], '#FF9BD2'],
          ['cyl', 'armL', [0, -0.22, 0], [0.24, 0.07, 0.24], LEMON, null, D],
          ['cyl', 'armR', [0, -0.22, 0], [0.24, 0.07, 0.24], LEMON, null, D],
          ['sphere', 'legL', [0, 0.02, 0], [0.34, 0.9, 0.34], BUBBLE],
          ['sphere', 'legR', [0, 0.02, 0], [0.34, 0.9, 0.34], BUBBLE],
          ['sphere', 'legL', [0, -0.38, 0.07], [0.34, 0.16, 0.46], 'team'],
          ['sphere', 'legR', [0, -0.38, 0.07], [0.34, 0.16, 0.46], 'team'],
          // painted face: googly eyes, grin, quiff, moustache
          ['sphere', 'head', [-0.08, 0.07, 0.185], [0.13, 0.15, 0.06], WHITE],
          ['sphere', 'head', [0.08, 0.07, 0.185], [0.13, 0.15, 0.06], WHITE],
          ['sphere', 'head', [-0.075, 0.06, 0.215], [0.06, 0.07, 0.03], INK],
          ['sphere', 'head', [0.075, 0.06, 0.215], [0.06, 0.07, 0.03], INK],
          ['box', 'head', [0, -0.105, 0.19], [0.18, 0.04, 0.03], INK],
          ['box', 'head', [-0.1, -0.085, 0.175], [0.06, 0.035, 0.03], INK, [0, 0, -0.6], D],
          ['box', 'head', [0.1, -0.085, 0.175], [0.06, 0.035, 0.03], INK, [0, 0, 0.6], D],
          ['sphere', 'head', [-0.07, -0.05, 0.2], [0.12, 0.04, 0.05], INK, [0, 0, -0.25]],
          ['sphere', 'head', [0.07, -0.05, 0.2], [0.12, 0.04, 0.05], INK, [0, 0, 0.25]],
          ['sphere', 'head', [0, 0.23, 0.04], [0.18, 0.13, 0.22], INK],
          ['cone', 'head', [0, 0.28, 0.14], [0.11, 0.18, 0.11], INK, [1.0, 0, 0], D],
          ['sphere', 'head', [-0.15, -0.06, 0.15], [0.08, 0.06, 0.03], '#FF6FA8', null, D],
          ['sphere', 'head', [0.15, -0.06, 0.15], [0.08, 0.06, 0.03], '#FF6FA8', null, D],
        ],
      },
    },
  ],
};
