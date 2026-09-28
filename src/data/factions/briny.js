// Brinywash Crew: salty sea folk. Control: they pull enemies in with harpoons, make them slip,
// and shove them around with waves and lamplight. See docs/schema.md for the UnitDef schema.
const TEAL = '#2A9D8F';
const SAND = '#E9C46A';
const CORAL = '#F28482';
const CORAL_DK = '#D9605E';
const SKIN = '#D99A6C';
const WHITE = '#F4F1EA';
const FOAM = '#BDE0D7';
const SLICKER = '#F4C430';
const KELP = '#3A7D44';
const KELP_LT = '#5FA052';
const WOOD = '#8B5A2B';
const WOOD_DK = '#5A3A22';
const IRON = '#4A4E5A';
const BRASS = '#C9A24A';
const INK = '#23262F';
const STEEL = '#C4CBD3';
const LAMP = '#FFE66D';
const STRIPE = '#E76F51';
const PI = Math.PI;
const D = { detail: true };

// Items held along the hand-frame diagonal d = (0, -0.707, 0.707): low and forward at rest,
// raised overhead on a throw.
const DIAG = [(3 * PI) / 4, 0, 0]; // turns a y-axis prim onto d
const DIAG_Z = [PI / 4, 0, 0]; // turns a z-axis prim (torus) onto d
const at = (t, x = 0) => [x, -0.7071 * t, 0.7071 * t];

// Crab leg on mount leg bone `bone`, splayed out to side s (-1 left, +1 right): upper segment up
// and out to a high knee, pointed lower segment splayed down to the ground.
const crabLeg = (bone, s) => [
  ['box', bone, [s * 0.21, 0.11, 0], [0.16, 0.5, 0.16], CORAL_DK, [0, 0, -s * 1.088], D],
  ['cone', bone, [s * 0.56, -0.17, 0], [0.2, 0.83, 0.2], CORAL, [0, 0, -s * 2.8]],
];

// A little starfish facing forward (+z), centred at p.
function starfish(bone, p, r, c) {
  const out = [['sphere', bone, p, [r * 0.7, r * 0.7, r * 0.4], c, null, D]];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * 2 * PI;
    out.push(['cone', bone, [p[0] + Math.sin(a) * r * 0.55, p[1] + Math.cos(a) * r * 0.55, p[2]], [r * 0.45, r * 0.9, r * 0.3], c, [0, 0, -a], D]);
  }
  return out;
}

export const FACTION = {
  id: 'briny',
  name: 'Brinywash Crew',
  short: 'Brinywash',
  color: TEAL,
  blurb: 'Salty sea folk. They reel you in with harpoons, mop your feet out from under you and wash you away.',
  projLooks: {
    harpoon: [
      ['cyl', [0, 0, -0.05], [0.05, 1.3, 0.05], WOOD, [PI / 2, 0, 0]],
      ['cone', [0, 0, 0.72], [0.13, 0.24, 0.13], STEEL, [PI / 2, 0, 0]],
      ['cone', [-0.07, 0, 0.6], [0.05, 0.16, 0.05], STEEL, [-PI / 2, 0, 0]],
      ['cone', [0.07, 0, 0.6], [0.05, 0.16, 0.05], STEEL, [-PI / 2, 0, 0]],
      ['torus', [0, 0, -0.72], [0.16, 0.16, 0.2], SAND],
      ['box', [0, 0, -0.55], [0.02, 0.12, 0.16], CORAL],
    ],
    powderkeg: [
      ['cyl', [0, 0, 0], [0.56, 0.62, 0.56], WOOD, [0, 0, PI / 2]],
      ['cyl', [-0.2, 0, 0], [0.6, 0.07, 0.6], IRON, [0, 0, PI / 2]],
      ['cyl', [0.2, 0, 0], [0.6, 0.07, 0.6], IRON, [0, 0, PI / 2]],
      ['cyl', [0, 0, 0], [0.58, 0.06, 0.58], CORAL, [0, 0, PI / 2]],
      ['cyl', [0, 0.32, 0], [0.04, 0.14, 0.04], INK],
      ['sphere', [0, 0.41, 0], [0.12, 0.12, 0.12], '#FFB347'],
    ],
  },
  units: [
    {
      id: 'briny_swab',
      name: 'Deck Swabber',
      role: 'melee',
      desc: 'Mops the deck, mops the floor, mops the floor with you. Very slippery afterwards.',
      cost: 70,
      hp: 100,
      mass: 70,
      speed: 3.2,
      scale: 1,
      weapon: { kind: 'swing', damage: 13, range: 1.8, cooldown: 0.8, windup: 0.25, arc: 110, maxTargets: 2, knockback: 100, effect: { slow: 0.2, slowTime: 1.5 }, sound: 'bonk' },
      ai: { range: 1.6, priority: 'near' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: 'team',
        legs: SAND,
        feet: SKIN,
        belt: WOOD,
        parts: [
          // striped sailor shirt
          ['box', 'torso', [0, 0.19, 0], [0.47, 0.055, 0.31], WHITE],
          ['box', 'torso', [0, 0.05, 0], [0.47, 0.055, 0.31], WHITE],
          ['box', 'torso', [0, -0.09, 0], [0.47, 0.055, 0.31], WHITE],
          ['box', 'armL', [0, 0.12, 0], [0.14, 0.05, 0.14], WHITE, null, D],
          ['box', 'armR', [0, 0.12, 0], [0.14, 0.05, 0.14], WHITE, null, D],
          // bandana, earring, big nose, stubble
          ['sphere', 'head', [0, 0.07, -0.01], [0.37, 0.25, 0.37], CORAL],
          ['box', 'head', [0.04, 0.03, -0.2], [0.07, 0.14, 0.03], CORAL, [0.4, 0, 0.35]],
          ['box', 'head', [-0.04, 0.02, -0.2], [0.07, 0.14, 0.03], CORAL, [0.4, 0, -0.35]],
          ['sphere', 'head', [0.07, 0.15, 0.12], [0.04, 0.04, 0.03], WHITE, null, D],
          ['sphere', 'head', [-0.1, 0.12, 0.13], [0.04, 0.04, 0.03], WHITE, null, D],
          ['torus', 'head', [0.175, -0.07, 0], [0.07, 0.07, 0.07], BRASS, [0, PI / 2, 0], D],
          ['sphere', 'head', [0, -0.02, 0.175], [0.07, 0.08, 0.07], '#C9845A'],
          ['sphere', 'head', [0, -0.1, 0.1], [0.24, 0.1, 0.16], '#8C6A55', null, D],
          // rolled trousers, bare feet
          ['cyl', 'legL', [0, -0.2, 0], [0.21, 0.08, 0.21], '#D4AE52', null, D],
          ['cyl', 'legR', [0, -0.2, 0], [0.21, 0.08, 0.21], '#D4AE52', null, D],
          // mop: long handle, grey head with dangling strands
          ['cyl', 'handR', [0, 0, 0.5], [0.05, 1.2, 0.05], WOOD, [PI / 2, 0, 0]],
          ['sphere', 'handR', [0, -0.04, 1.14], [0.3, 0.2, 0.3], '#B8BCC2'],
          ['cone', 'handR', [0.1, -0.2, 1.08], [0.09, 0.3, 0.09], '#D2D6DB', [PI, 0, 0]],
          ['cone', 'handR', [-0.1, -0.2, 1.08], [0.09, 0.3, 0.09], '#D2D6DB', [PI, 0, 0]],
          ['cone', 'handR', [0, -0.22, 1.24], [0.09, 0.32, 0.09], '#D2D6DB', [PI, 0, 0]],
          ['cone', 'handR', [0, -0.2, 1.02], [0.09, 0.28, 0.09], '#D2D6DB', [PI, 0, 0], D],
          // sloshing bucket in the left hand
          ['cyl', 'handL', [0, -0.16, 0.03], [0.26, 0.24, 0.24], '#8C98A4'],
          ['cyl', 'handL', [0, -0.05, 0.03], [0.22, 0.02, 0.2], '#7FC8EE', null, D],
          ['torus', 'handL', [0, -0.02, 0.03], [0.24, 0.24, 0.24], '#6B7682', [0, PI / 2, 0], D],
        ],
      },
    },
    {
      id: 'briny_harpoon',
      name: 'Harpooneer',
      role: 'ranged',
      desc: 'Harpoons the scrawniest enemy and reels them in for a chat.',
      cost: 80,
      hp: 85,
      mass: 70,
      speed: 3.0,
      scale: 1,
      weapon: {
        kind: 'projectile',
        anim: 'throw',
        damage: 45,
        range: 26,
        cooldown: 3.0,
        windup: 0.5,
        knockback: 0,
        proj: { look: 'harpoon', speed: 30, gravity: 0.5, radius: 0.14, arc: 'low', acc: 0.75, pull: 400 },
        shootSound: 'shoot_throw',
        sound: 'stab',
      },
      ai: { range: 22, kite: true, priority: 'weakest' },
      look: {
        skin: SKIN,
        top: SLICKER,
        arms: SLICKER,
        legs: 'team',
        feet: SLICKER,
        belt: WOOD_DK,
        parts: [
          // sou'wester: crown, sloping brim, team band
          ['sphere', 'head', [0, 0.09, -0.01], [0.38, 0.26, 0.38], SLICKER],
          ['cyl', 'head', [0, 0.1, -0.01], [0.4, 0.06, 0.4], 'team'],
          ['cyl', 'head', [0, 0.06, -0.05], [0.58, 0.03, 0.64], SLICKER, [-0.28, 0, 0]],
          // salt-and-pepper beard
          ['sphere', 'head', [0, -0.1, 0.07], [0.3, 0.2, 0.24], '#6E6259'],
          ['sphere', 'head', [0, -0.02, 0.17], [0.07, 0.08, 0.07], '#C9845A', null, D],
          // team scarf
          ['cyl', 'torso', [0, 0.3, 0], [0.38, 0.11, 0.32], 'team'],
          ['box', 'torso', [0.1, 0.12, 0.165], [0.09, 0.3, 0.03], 'team', [0.05, 0, 0.12]],
          // slicker coat: skirt, toggles, pocket
          ['box', 'torso', [0, -0.4, 0], [0.5, 0.2, 0.33], SLICKER],
          ['box', 'torso', [0, 0.05, 0.156], [0.02, 0.5, 0.02], '#C99A10', null, D],
          ['box', 'torso', [-0.06, 0.12, 0.158], [0.07, 0.025, 0.02], WOOD_DK, null, D],
          ['box', 'torso', [-0.06, -0.02, 0.158], [0.07, 0.025, 0.02], WOOD_DK, null, D],
          ['box', 'torso', [-0.06, -0.16, 0.158], [0.07, 0.025, 0.02], WOOD_DK, null, D],
          // rope coil and a spare harpoon on the back
          ['torus', 'torso', [0, -0.02, -0.19], [0.36, 0.36, 0.55], SAND],
          ['cyl', 'torso', [0.12, 0.25, -0.2], [0.04, 1.1, 0.04], WOOD, [0, 0, -0.35], D],
          ['cone', 'torso', [0.3, 0.77, -0.2], [0.1, 0.16, 0.1], STEEL, [0, 0, -0.35], D],
          // boots
          ['box', 'legL', [0, -0.26, 0.02], [0.2, 0.3, 0.22], SLICKER, null, D],
          ['box', 'legR', [0, -0.26, 0.02], [0.2, 0.3, 0.22], SLICKER, null, D],
          // harpoon held low and forward
          ['cyl', 'handR', at(0.15), [0.05, 1.2, 0.05], WOOD, DIAG],
          ['cone', 'handR', at(0.85), [0.14, 0.22, 0.14], STEEL, DIAG],
          ['cone', 'handR', at(0.74, -0.06), [0.05, 0.14, 0.05], STEEL, [-PI / 4, 0, 0]],
          ['cone', 'handR', at(0.74, 0.06), [0.05, 0.14, 0.05], STEEL, [-PI / 4, 0, 0]],
          ['torus', 'handR', at(-0.46), [0.14, 0.14, 0.2], SAND, DIAG_Z, D],
        ],
      },
    },
    {
      id: 'briny_anchor',
      name: 'Anchor Hauler',
      role: 'tank',
      desc: 'Carries a ship\'s anchor like a handbag. Swings it like a much angrier handbag.',
      cost: 200,
      hp: 650,
      mass: 170,
      speed: 2.2,
      scale: 1.2,
      bulk: 1.3,
      weapon: { kind: 'swing', anim: 'swing2', damage: 38, range: 2.4, cooldown: 2.2, windup: 0.5, arc: 200, maxTargets: 4, knockback: 650, lift: 0.4, sound: 'bonk' },
      ai: { range: 2.0, priority: 'near' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: 'team',
        legs: '#3E4A59',
        feet: INK,
        belt: WOOD_DK,
        parts: [
          // bushy ginger beard and knit cap with pompom
          ['sphere', 'head', [0, -0.1, 0.08], [0.38, 0.34, 0.3], '#C0612B'],
          ['sphere', 'head', [0, -0.035, 0.165], [0.22, 0.07, 0.08], '#A64F20'],
          ['sphere', 'head', [0, 0.0, 0.18], [0.08, 0.08, 0.07], '#C9845A', null, D],
          ['box', 'head', [-0.07, 0.1, 0.15], [0.09, 0.03, 0.03], '#A64F20', [0, 0, 0.2], D],
          ['box', 'head', [0.07, 0.1, 0.15], [0.09, 0.03, 0.03], '#A64F20', [0, 0, -0.2], D],
          ['sphere', 'head', [0, 0.1, -0.01], [0.37, 0.24, 0.37], CORAL],
          ['cyl', 'head', [0, 0.08, 0], [0.385, 0.08, 0.385], CORAL_DK],
          ['sphere', 'head', [0, 0.25, 0], [0.13, 0.13, 0.13], WHITE],
          // fisherman's jumper: roll neck, cable knit, rolled sleeves with bare forearms
          ['cyl', 'torso', [0, 0.31, 0], [0.34, 0.1, 0.3], 'teamDark'],
          ['box', 'torso', [-0.1, 0.02, 0.196], [0.05, 0.46, 0.02], 'teamDark', null, D],
          ['box', 'torso', [0.1, 0.02, 0.196], [0.05, 0.46, 0.02], 'teamDark', null, D],
          ['box', 'armL', [0, -0.14, 0], [0.145, 0.3, 0.145], SKIN],
          ['box', 'armR', [0, -0.14, 0], [0.145, 0.3, 0.145], SKIN],
          ['cyl', 'armL', [0, 0.02, 0], [0.2, 0.08, 0.2], 'teamDark', null, D],
          ['cyl', 'armR', [0, 0.02, 0], [0.2, 0.08, 0.2], 'teamDark', null, D],
          ['box', 'legL', [0, -0.3, 0.03], [0.21, 0.2, 0.3], INK, null, D],
          ['box', 'legR', [0, -0.3, 0.03], [0.21, 0.2, 0.3], INK, null, D],
          // the anchor: ring, wooden stock, shaft, crown, arms and flukes
          ['torus', 'handR', [0, 0, -0.08], [0.3, 0.3, 0.4], IRON, [0, PI / 2, 0]],
          ['cyl', 'handR', [0, 0, 0.22], [0.08, 0.66, 0.08], WOOD, [0, 0, PI / 2]],
          ['sphere', 'handR', [-0.34, 0, 0.22], [0.1, 0.1, 0.1], WOOD_DK, null, D],
          ['sphere', 'handR', [0.34, 0, 0.22], [0.1, 0.1, 0.1], WOOD_DK, null, D],
          ['cyl', 'handR', [0, 0, 0.64], [0.11, 1.2, 0.11], IRON, [PI / 2, 0, 0]],
          ['sphere', 'handR', [0, 0, 1.24], [0.17, 0.17, 0.17], IRON],
          ['box', 'handR', [0, 0.19, 1.14], [0.11, 0.42, 0.11], IRON, [-0.485, 0, 0]],
          ['box', 'handR', [0, -0.19, 1.14], [0.11, 0.42, 0.11], IRON, [0.485, 0, 0]],
          ['cone', 'handR', [0, 0.4, 1.0], [0.07, 0.28, 0.26], IRON, [-PI / 2, 0, 0]],
          ['cone', 'handR', [0, -0.4, 1.0], [0.07, 0.28, 0.26], IRON, [-PI / 2, 0, 0]],
        ],
      },
    },
    {
      id: 'briny_crab',
      name: 'Crabback Rider',
      role: 'cavalry',
      desc: 'A ship\'s captain on a giant crab. Neither of them knows which way is forward.',
      cost: 185,
      hp: 360,
      mass: 260,
      speed: 5.5,
      scale: 1,
      mount: { kind: 'beast', len: 1.0, w: 1.5, h: 0.55, height: 0.72, saddle: 1.42, legs: 6, head: true, headR: 0.2, neck: 0.05 },
      weapon: { kind: 'swing', damage: 30, range: 2.2, cooldown: 1.2, windup: 0.3, arc: 70, maxTargets: 1, knockback: 300, sound: 'slash' },
      charge: { damage: 40, knockback: 700, cooldown: 8, speedMul: 1.35 },
      ai: { range: 1.8, priority: 'backline' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: 'team',
        legs: WHITE,
        feet: INK,
        mount: { body: CORAL, legs: CORAL, legW: 0.001, noHoof: true, noHead: true, noTail: true, noSaddle: true },
        parts: [
          // captain: bicorne worn sideways, moustache, epaulettes
          ['sphere', 'head', [0, 0.19, -0.01], [0.6, 0.26, 0.2], INK],
          ['sphere', 'head', [0, 0.155, -0.01], [0.62, 0.1, 0.22], BRASS, null, D],
          ['cyl', 'head', [0.14, 0.22, 0.09], [0.09, 0.02, 0.09], 'team', [PI / 2, 0, 0]],
          ['sphere', 'head', [0, -0.055, 0.16], [0.2, 0.06, 0.07], '#9A9A9A'],
          ['box', 'torso', [-0.26, 0.3, 0], [0.16, 0.05, 0.2], BRASS, null, D],
          ['box', 'torso', [0.26, 0.3, 0], [0.16, 0.05, 0.2], BRASS, null, D],
          ['sphere', 'torso', [-0.08, 0.05, 0.155], [0.045, 0.045, 0.03], BRASS, null, D],
          ['sphere', 'torso', [-0.08, -0.1, 0.155], [0.045, 0.045, 0.03], BRASS, null, D],
          // crab shell: team saddle blanket on top, spots
          ['sphere', 'mount', [0, 0.26, -0.02], [0.8, 0.2, 0.66], 'team'],
          ['cyl', 'mount', [0, 0.46, 0], [0.5, 0.34, 0.46], 'team'],
          ['cyl', 'mount', [0, 0.64, 0], [0.54, 0.05, 0.5], SAND, null, D],
          ['box', 'mount', [0, 0.78, -0.24], [0.46, 0.34, 0.06], 'teamDark', [-0.15, 0, 0]],
          ['cyl', 'mount', [0, 0.95, -0.26], [0.46, 0.05, 0.08], SAND, [0, 0, PI / 2], D],
          ['sphere', 'mount', [0, -0.05, 0], [1.7, 0.2, 1.1], CORAL_DK, null, D],
          // six splayed crab legs
          ...crabLeg('mLeg0', -1),
          ...crabLeg('mLeg1', 1),
          ...crabLeg('mLeg2', -1),
          ...crabLeg('mLeg3', 1),
          ...crabLeg('mLeg4', -1),
          ...crabLeg('mLeg5', 1),
          // eye stalks and big pincers (on the wobbly head)
          ['cyl', 'mountHead', [-0.09, 0.08, 0.02], [0.05, 0.24, 0.05], CORAL],
          ['cyl', 'mountHead', [0.09, 0.08, 0.02], [0.05, 0.24, 0.05], CORAL],
          ['sphere', 'mountHead', [-0.09, 0.22, 0.03], [0.12, 0.12, 0.12], WHITE],
          ['sphere', 'mountHead', [0.09, 0.22, 0.03], [0.12, 0.12, 0.12], WHITE],
          ['sphere', 'mountHead', [-0.09, 0.22, 0.085], [0.055, 0.055, 0.03], INK, null, D],
          ['sphere', 'mountHead', [0.09, 0.22, 0.085], [0.055, 0.055, 0.03], INK, null, D],
          ['cyl', 'mountHead', [-0.45, -0.16, 0.065], [0.12, 0.44, 0.12], CORAL, [1.435, 0, 0.496]],
          ['cyl', 'mountHead', [0.45, -0.16, 0.065], [0.12, 0.44, 0.12], CORAL, [1.435, 0, -0.496]],
          ['sphere', 'mountHead', [-0.56, -0.12, 0.38], [0.34, 0.28, 0.42], CORAL],
          ['sphere', 'mountHead', [0.56, -0.12, 0.38], [0.34, 0.28, 0.42], CORAL],
          ['cone', 'mountHead', [-0.56, -0.05, 0.68], [0.17, 0.38, 0.12], CORAL_DK, [PI / 2, 0, 0]],
          ['cone', 'mountHead', [0.56, -0.05, 0.68], [0.17, 0.38, 0.12], CORAL_DK, [PI / 2, 0, 0]],
          ['cone', 'mountHead', [-0.56, -0.19, 0.64], [0.12, 0.3, 0.09], CORAL_DK, [PI / 2, 0, 0], D],
          ['cone', 'mountHead', [0.56, -0.19, 0.64], [0.12, 0.3, 0.09], CORAL_DK, [PI / 2, 0, 0], D],
          // claw-on-a-pole grabber
          ['cyl', 'handR', [0, 0, 0.5], [0.05, 1.1, 0.05], WOOD, [PI / 2, 0, 0]],
          ['sphere', 'handR', [0, 0, 1.08], [0.2, 0.16, 0.24], CORAL],
          ['cone', 'handR', [0, 0.05, 1.28], [0.1, 0.24, 0.07], CORAL_DK, [PI / 2, 0, 0]],
          ['cone', 'handR', [0, -0.05, 1.25], [0.08, 0.18, 0.06], CORAL_DK, [PI / 2, 0, 0]],
        ],
      },
    },
    {
      id: 'briny_barrel',
      name: 'Barrel Mortar',
      role: 'siege',
      desc: 'Lobs powder kegs from a stubby deck mortar. The kegs are labelled "NOT RUM".',
      cost: 150,
      hp: 160,
      mass: 230,
      speed: 1.5,
      scale: 1,
      mount: { kind: 'cart', len: 2.0, w: 1.4, h: 0.45, height: 0.62, saddle: 0.9, riderZ: -0.6, wheels: 4, wheelR: 0.4 },
      weapon: {
        kind: 'projectile',
        anim: 'point',
        damage: 75,
        range: 42,
        minRange: 10,
        cooldown: 6.0,
        windup: 0.8,
        knockback: 900,
        muzzle: { bone: 'mount', at: [0, 1.05, 0.72] },
        proj: { look: 'powderkeg', speed: 28, gravity: 1, radius: 0.3, arc: 'high', splash: 3.5, acc: 0.5, spinRate: 5 },
        shootSound: 'shoot_cannon',
      },
      ai: { range: 38, priority: 'cluster' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: 'team',
        legs: '#3E4A59',
        mount: { body: SAND, trim: TEAL, wheel: WOOD_DK, hub: BRASS },
        parts: [
          // gunner: striped shirt, teal cap, eyepatch
          ['box', 'torso', [0, 0.15, 0], [0.47, 0.05, 0.31], WHITE],
          ['box', 'torso', [0, 0.01, 0], [0.47, 0.05, 0.31], WHITE],
          ['sphere', 'head', [0, 0.1, -0.01], [0.36, 0.22, 0.36], TEAL],
          ['box', 'head', [0, 0.1, 0.17], [0.3, 0.02, 0.1], TEAL, [-0.2, 0, 0]],
          ['sphere', 'head', [0.065, 0.03, 0.16], [0.08, 0.08, 0.03], INK, null, D],
          ['box', 'head', [0, 0.06, 0.1], [0.36, 0.02, 0.2], INK, [0, 0, -0.3], D],
          ['sphere', 'head', [0, -0.1, 0.1], [0.24, 0.14, 0.18], '#6E6259', null, D],
          // linstock with a glowing match
          ['cyl', 'handR', [0, 0, 0.35], [0.04, 0.8, 0.04], WOOD, [PI / 2, 0, 0]],
          ['sphere', 'handR', [0, 0, 0.78], [0.08, 0.08, 0.08], '#FFB347', null, { glow: true }],
          // deck planks
          ['box', 'mount', [-0.35, 0.228, 0], [0.02, 0.01, 1.96], '#B88E3A', null, D],
          ['box', 'mount', [0.35, 0.228, 0], [0.02, 0.01, 1.96], '#B88E3A', null, D],
          // stubby mortar at 45 degrees on a wooden block
          ['box', 'mount', [0, 0.37, 0.28], [0.8, 0.3, 0.8], WOOD],
          ['cyl', 'mount', [0, 0.66, 0.3], [0.7, 0.8, 0.7], IRON, [PI / 4, 0, 0]],
          ['cyl', 'mount', [0, 0.66, 0.3], [0.74, 0.16, 0.74], 'team', [PI / 4, 0, 0]],
          ['torus', 'mount', [0, 0.94, 0.58], [0.9, 0.9, 1.2], BRASS, [-PI / 4, 0, 0]],
          ['cyl', 'mount', [0, 0.945, 0.585], [0.5, 0.02, 0.5], '#111111', [PI / 4, 0, 0]],
          ['cyl', 'mount', [0, 0.52, 0.3], [0.12, 0.9, 0.12], INK, [0, 0, PI / 2], D],
          // powder kegs
          ['cyl', 'mount', [0.52, 0.45, -0.3], [0.34, 0.44, 0.34], WOOD],
          ['cyl', 'mount', [0.52, 0.45, -0.3], [0.36, 0.05, 0.36], IRON, null, D],
          ['cyl', 'mount', [0.52, 0.45, -0.72], [0.34, 0.44, 0.34], WOOD, null, D],
          ['cyl', 'mount', [0.52, 0.45, -0.72], [0.36, 0.05, 0.36], IRON, null, D],
          // life ring and team pennant
          ['torus', 'mount', [-0.72, 0.12, 0.35], [0.46, 0.46, 0.6], WHITE, [0, PI / 2, 0], D],
          ['torus', 'mount', [-0.73, 0.12, 0.35], [0.47, 0.47, 0.3], CORAL, [PI / 4, PI / 2, 0], D],
          ['cyl', 'mount', [-0.55, 1.05, -0.86], [0.05, 1.8, 0.05], WOOD],
          ['cone', 'mount', [-0.55, 1.78, -0.6], [0.03, 0.52, 0.36], 'team', [PI / 2, 0, 0]],
          ['sphere', 'mount', [-0.55, 1.97, -0.86], [0.09, 0.09, 0.09], BRASS, null, D],
        ],
      },
    },
    {
      id: 'briny_tide',
      name: 'Tide Singer',
      role: 'support',
      desc: 'Hums a sea shanty into a conch. A wave of warm seawater patches everyone up.',
      cost: 70,
      hp: 100,
      mass: 70,
      speed: 3.1,
      scale: 1,
      weapon: { kind: 'healPulse', anim: 'raise', heal: 14, radius: 7, range: 5, cooldown: 3, windup: 0.35 },
      weapon2: { kind: 'swing', damage: 6, range: 1.6, cooldown: 1.0, arc: 90, maxTargets: 1, knockback: 60, when: 'near', sound: 'bonk' },
      ai: { range: 5, priority: 'allyFront', flee: 3.5 },
      look: {
        skin: SKIN,
        top: 'team',
        arms: SKIN,
        legs: TEAL,
        feet: SAND,
        torso: 'cone',
        belt: false,
        parts: [
          // kelp hair
          ['sphere', 'head', [0, 0.06, -0.03], [0.38, 0.3, 0.38], KELP],
          ['cone', 'head', [-0.15, -0.14, -0.05], [0.1, 0.38, 0.08], KELP, [PI, 0, -0.15]],
          ['cone', 'head', [0.15, -0.14, -0.05], [0.1, 0.38, 0.08], KELP, [PI, 0, 0.15]],
          ['cone', 'head', [-0.08, -0.18, -0.13], [0.1, 0.44, 0.08], KELP_LT, [PI + 0.2, 0, 0]],
          ['cone', 'head', [0.08, -0.18, -0.13], [0.1, 0.44, 0.08], KELP_LT, [PI + 0.2, 0, 0]],
          ['cone', 'head', [0, -0.2, -0.15], [0.1, 0.46, 0.08], KELP, [PI + 0.25, 0, 0], D],
          ['cone', 'head', [0.1, 0.18, 0.07], [0.12, 0.12, 0.06], KELP_LT, [0.7, 0, -0.4], D],
          ...starfish('head', [0.13, 0.12, 0.12], 0.12, CORAL),
          ['sphere', 'head', [-0.1, -0.05, 0.14], [0.05, 0.04, 0.02], CORAL, null, D],
          ['sphere', 'head', [0.1, -0.05, 0.14], [0.05, 0.04, 0.02], CORAL, null, D],
          // pearl necklace with a scallop pendant, sea-foam hem
          ['torus', 'torso', [0, 0.26, 0.02], [0.3, 0.3, 0.5], WHITE, [PI / 2 - 0.3, 0, 0]],
          ['cone', 'torso', [0, 0.14, 0.13], [0.14, 0.1, 0.04], SAND, [0.2, 0, 0]],
          ['sphere', 'torso', [0, 0.12, 0.13], [0.14, 0.08, 0.04], SAND],
          ['torus', 'torso', [0, -0.31, 0], [0.82, 0.74, 0.8], FOAM, [PI / 2, 0, 0]],
          ['box', 'torso', [0, -0.08, 0.19], [0.28, 0.05, 0.03], SAND, null, D],
          ['sphere', 'torso', [-0.22, -0.2, 0.12], [0.08, 0.08, 0.04], FOAM, null, D],
          ['sphere', 'torso', [0.18, -0.25, 0.16], [0.07, 0.07, 0.04], FOAM, null, D],
          // conch shell horn (held aloft when she sings)
          ['sphere', 'handR', [0, -0.13, 0.03], [0.17, 0.22, 0.15], '#F7C6B5'],
          ['cone', 'handR', [0, -0.3, 0.03], [0.12, 0.18, 0.12], '#F7D6C4', [PI, 0, 0]],
          ['sphere', 'handR', [0, -0.1, 0.09], [0.1, 0.15, 0.05], CORAL],
          ['torus', 'handR', [0, -0.25, 0.03], [0.14, 0.14, 0.18], '#E8B4A2', [PI / 2, 0, 0], D],
          // sandals
          ['box', 'legL', [0, -0.4, 0.04], [0.19, 0.03, 0.29], WOOD, null, D],
          ['box', 'legR', [0, -0.4, 0.04], [0.19, 0.03, 0.29], WOOD, null, D],
        ],
      },
    },
    {
      id: 'briny_light',
      name: 'Old Beacon Barnaby',
      role: 'legendary',
      desc: 'A lighthouse keeper carrying his lighthouse. When he points his lantern, the whole shore goes bright and flat.',
      cost: 2300,
      hp: 4500,
      mass: 500,
      speed: 2.2,
      scale: 2.6,
      bulk: 1.15,
      staggerImmune: true,
      stability: 3,
      weapon: {
        kind: 'beam',
        anim: 'point',
        damage: 300,
        range: 35,
        cooldown: 5,
        windup: 0.8,
        knockback: 130,
        beam: { time: 3, tick: 0.1, width: 0.8, pierce: true, sweep: 40 },
        color: '#FFF3A0',
        sound: 'beam',
      },
      weapon2: { kind: 'swing', damage: 30, range: 3, cooldown: 1.5, arc: 240, maxTargets: 4, knockback: 500, when: 'near', sound: 'bonk' },
      ai: { range: 28, priority: 'cluster' },
      look: {
        skin: SKIN,
        top: 'team',
        arms: 'team',
        legs: '#3E4A59',
        feet: INK,
        belt: WOOD_DK,
        parts: [
          // keeper's cap, huge white beard, red nose, pipe
          ['cyl', 'head', [0, 0.14, 0], [0.37, 0.12, 0.37], INK],
          ['cyl', 'head', [0, 0.2, 0], [0.35, 0.02, 0.35], '#3A3F4F', null, D],
          ['box', 'head', [0, 0.1, 0.17], [0.26, 0.025, 0.13], '#15171C', [-0.2, 0, 0]],
          ['sphere', 'head', [0, 0.16, 0.18], [0.07, 0.07, 0.03], BRASS, null, D],
          ['sphere', 'head', [0, -0.12, 0.08], [0.36, 0.34, 0.28], '#EDEDED'],
          ['sphere', 'head', [0, -0.26, 0.1], [0.24, 0.16, 0.2], '#E2E2E2', null, D],
          ['sphere', 'head', [0, -0.045, 0.168], [0.24, 0.075, 0.08], '#D5D5D5'],
          ['sphere', 'head', [0, 0.0, 0.185], [0.08, 0.085, 0.08], '#E08070'],
          ['box', 'head', [-0.07, 0.09, 0.15], [0.1, 0.035, 0.04], '#EDEDED', [0, 0, 0.25], D],
          ['box', 'head', [0.07, 0.09, 0.15], [0.1, 0.035, 0.04], '#EDEDED', [0, 0, -0.25], D],
          ['cyl', 'head', [0.08, -0.065, 0.24], [0.025, 0.16, 0.025], WOOD_DK, [PI / 2, 0, -0.49]],
          ['cyl', 'head', [0.12, -0.035, 0.31], [0.07, 0.09, 0.07], WOOD_DK],
          // pea coat: collar, brass buttons, straps for the lighthouse
          ['cyl', 'torso', [0, 0.31, 0], [0.38, 0.09, 0.33], 'teamDark'],
          ['sphere', 'torso', [-0.09, 0.1, 0.16], [0.05, 0.05, 0.03], BRASS, null, D],
          ['sphere', 'torso', [0.09, 0.1, 0.16], [0.05, 0.05, 0.03], BRASS, null, D],
          ['sphere', 'torso', [-0.09, -0.06, 0.16], [0.05, 0.05, 0.03], BRASS, null, D],
          ['sphere', 'torso', [0.09, -0.06, 0.16], [0.05, 0.05, 0.03], BRASS, null, D],
          ['box', 'torso', [-0.15, 0.08, 0.168], [0.06, 0.46, 0.02], WOOD_DK],
          ['box', 'torso', [0.15, 0.08, 0.168], [0.06, 0.46, 0.02], WOOD_DK],
          // the lighthouse on his back
          ['cyl', 'torso', [-0.13, -0.1, -0.38], [0.4, 0.32, 0.4], STRIPE],
          ['cyl', 'torso', [-0.13, 0.22, -0.38], [0.37, 0.32, 0.37], WHITE],
          ['cyl', 'torso', [-0.13, 0.54, -0.38], [0.34, 0.32, 0.34], STRIPE],
          ['cyl', 'torso', [-0.13, 0.86, -0.38], [0.31, 0.32, 0.31], WHITE],
          ['cyl', 'torso', [-0.13, 1.04, -0.38], [0.46, 0.05, 0.46], INK],
          ['torus', 'torso', [-0.13, 1.1, -0.38], [0.5, 0.5, 0.3], INK, [PI / 2, 0, 0], D],
          ['sphere', 'torso', [-0.13, 1.18, -0.38], [0.28, 0.28, 0.28], LAMP, null, { glow: true }],
          ['cyl', 'torso', [-0.13, 1.18, -0.38], [0.3, 0.2, 0.3], '#FFF7C2', null, { glow: true, detail: true }],
          ['cone', 'torso', [-0.13, 1.42, -0.38], [0.38, 0.26, 0.38], STRIPE],
          ['sphere', 'torso', [-0.13, 1.57, -0.38], [0.07, 0.07, 0.07], INK, null, D],
          // big boots
          ['box', 'legL', [0, -0.3, 0.05], [0.22, 0.24, 0.34], INK],
          ['box', 'legR', [0, -0.3, 0.05], [0.22, 0.24, 0.34], INK],
          // brass storm lantern hanging from his right hand (the beam comes from here)
          ['torus', 'handR', [0, -0.04, 0], [0.16, 0.16, 0.2], BRASS, [0, PI / 2, 0]],
          ['cone', 'handR', [0, -0.14, 0], [0.24, 0.1, 0.24], BRASS],
          ['cyl', 'handR', [0, -0.3, 0], [0.22, 0.24, 0.22], LAMP, null, { glow: true }],
          ['cyl', 'handR', [0, -0.44, 0], [0.26, 0.05, 0.26], BRASS],
          ['box', 'handR', [0.1, -0.3, 0], [0.02, 0.26, 0.02], BRASS, null, D],
          ['box', 'handR', [-0.1, -0.3, 0], [0.02, 0.26, 0.02], BRASS, null, D],
        ],
      },
    },
  ],
};
