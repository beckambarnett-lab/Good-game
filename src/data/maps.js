// Battle maps. Field is x in [-36, 36] (lateral), z in [-30, 30]. Blue (team 0) deploys at
// z in [4, 26], red (team 1) at z in [-26, -4]. Every map is mirror-symmetric across z = 0.

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Rise outside the playable field so the horizon is hills, not a cliff.
const rim = (x, z, k = 7) => smooth(38, 62, Math.abs(x)) * k + smooth(32, 56, Math.abs(z)) * k;

const CALDERA_POOLS = [
  { x: 0, z: 0, r: 5 },
  { x: 14, z: 14, r: 2.5 },
  { x: -14, z: 14, r: 2.5 },
  { x: 14, z: -14, r: 2.5 },
  { x: -14, z: -14, r: 2.5 },
];
const CALDERA_GEYSERS = [
  { x: 20, z: 0, offset: 0 },
  { x: -20, z: 0, offset: 4 },
  { x: 0, z: 18, offset: 2 },
  { x: 0, z: -18, offset: 6 },
];
const GLAZE_HOLES = [
  { x: 0, z: 0, r: 2.2 },
  { x: 11, z: 0, r: 1.6 },
  { x: -11, z: 0, r: 1.6 },
];
const inIce = (x, z) => (x * x) / (20 * 20) + (z * z) / (24 * 24) < 1;

export const MAPS = {
  meadow: {
    id: 'meadow',
    name: 'Buttercup Meadow',
    blurb: 'Flat, friendly grass. Nowhere to hide.',
    extent: [140, 120],
    theme: {
      grassA: '#72a14a',
      grassB: '#5e8c3c',
      dirt: '#b99a62',
      skyTop: '#5fa8f5',
      skyBottom: '#dff3ff',
      fog: '#cfe7fb',
      sun: '#fff1d6',
      decor: 'meadow',
    },
  },

  hills: {
    id: 'hills',
    name: 'Rumpled Hills',
    blurb: 'Two archer hills and a knoll. Throwers on high ground reach further.',
    extent: [140, 120],
    height: (x, z) => {
      const hill = (cx, cz, h, s) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / s);
      return hill(8, 24, 3.2, 60) + hill(8, -24, 3.2, 60) + hill(-10, 0, 2.0, 80) + 0.6 * Math.cos(0.35 * z) * Math.cos(0.3 * x) + rim(x, z);
    },
    theme: {
      grassA: '#9cc766',
      grassB: '#6f9f45',
      dirt: '#a88a58',
      skyTop: '#7fb2f0',
      skyBottom: '#f6e7cf',
      fog: '#e8e2d2',
      sun: '#ffe2b0',
      decor: 'hills',
    },
  },

  gorge: {
    id: 'gorge',
    name: 'Wobblegap Gorge',
    blurb: 'A ravine with two rope bridges and one very thin plank. Falling in is final.',
    extent: [140, 120],
    killY: -7,
    height: (x, z) => {
      const az = Math.abs(z);
      const depth = -18 * (1 - smooth(5.2, 6.4, az));
      const bumps = 0.35 * Math.sin(x * 0.2) * Math.cos(z * 0.23) * smooth(7, 10, az);
      return depth + bumps + rim(x, z, 6);
    },
    props: [
      { shape: 'box', kind: 'bridge', pos: [-14, -0.2, 0], size: [4.5, 0.4, 14], walkable: true, color: '#9a6a3a' },
      { shape: 'box', kind: 'bridge', pos: [14, -0.2, 0], size: [4.5, 0.4, 14], walkable: true, color: '#9a6a3a' },
      { shape: 'box', kind: 'bridge', pos: [0, -0.15, 0], size: [1.6, 0.3, 14], walkable: true, color: '#8b5e34' },
      { shape: 'box', kind: 'rail', pos: [-16.35, 0.25, 0], size: [0.2, 0.5, 13], color: '#6b4524', solid: false },
      { shape: 'box', kind: 'rail', pos: [-11.65, 0.25, 0], size: [0.2, 0.5, 13], color: '#6b4524', solid: false },
      { shape: 'box', kind: 'rail', pos: [11.65, 0.25, 0], size: [0.2, 0.5, 13], color: '#6b4524', solid: false },
      { shape: 'box', kind: 'rail', pos: [16.35, 0.25, 0], size: [0.2, 0.5, 13], color: '#6b4524', solid: false },
    ],
    water: { y: -13, color: '#3f8fb5', w: 14 },
    nav: {
      side: (x, z) => (z > 6.3 ? 1 : z < -6.3 ? -1 : 0),
      bridges: [
        { x: -14, z0: -7, z1: 7, halfW: 2.0 },
        { x: 14, z0: -7, z1: 7, halfW: 2.0 },
        { x: 0, z0: -7, z1: 7, halfW: 0.6, cost: 6 },
      ],
    },
    deploy: { near: 8 },
    theme: {
      grassA: '#a3b86a',
      grassB: '#7f9a4f',
      dirt: '#8a6d4f',
      rock: '#7c7068',
      skyTop: '#8fb9e6',
      skyBottom: '#f3dcc0',
      fog: '#e7d8c6',
      sun: '#ffd9a6',
      decor: 'gorge',
    },
  },

  caldera: {
    id: 'caldera',
    name: 'Cinderpop Caldera',
    blurb: 'A warm volcanic bowl. Lava pools cook, geysers yeet.',
    extent: [140, 120],
    height: (x, z) => {
      let h = 0.0018 * (x * x + z * z) + 0.3 * Math.cos(0.5 * x) * Math.cos(0.45 * z);
      for (const p of CALDERA_POOLS) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < p.r + 1) h -= 0.6 * (1 - Math.min(1, d / (p.r + 1))) ** 2 + 0.25 * (1 - smooth(p.r - 0.5, p.r + 1, d));
      }
      return h + rim(x, z, 5);
    },
    hazards: [
      ...CALDERA_POOLS.map((p) => ({ type: 'lava', x: p.x, z: p.z, r: p.r, dps: 90, burn: 6, burnTime: 3 })),
      ...CALDERA_GEYSERS.map((g) => ({ type: 'geyser', x: g.x, z: g.z, r: 2.6, period: 8, offset: g.offset, warn: 1.5, dvUp: 11, dvOut: 3, dmg: 20 })),
    ],
    theme: {
      grassA: '#5d4c48',
      grassB: '#463836',
      dirt: '#6e5048',
      rock: '#3e3230',
      skyTop: '#4d3b5c',
      skyBottom: '#f09a62',
      fog: '#c98a6a',
      sun: '#ffc690',
      decor: 'cinder',
    },
  },

  glaze: {
    id: 'glaze',
    name: 'Glazepond',
    blurb: 'A frozen pond. Everyone slides, charges go wild, and the ice has holes.',
    extent: [140, 120],
    killY: -3,
    height: (x, z) => {
      let h = 0;
      for (const p of GLAZE_HOLES) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < p.r + 0.6) h = Math.min(h, -9 * (1 - smooth(p.r - 0.4, p.r + 0.5, d)));
      }
      return h + rim(x, z, 5);
    },
    gripAt: (x, z) => (inIce(x, z) ? 0.3 : 1),
    kbAt: (x, z) => (inIce(x, z) ? 1.4 : 1),
    friction: 0.12,
    holes: GLAZE_HOLES,
    theme: {
      grassA: '#e3eef4',
      grassB: '#cfe0ea',
      dirt: '#eef5f8',
      rock: '#6f8796',
      skyTop: '#8fb4d8',
      skyBottom: '#eef6fb',
      fog: '#e4eef5',
      sun: '#ffffff',
      decor: 'ice',
      ice: true,
    },
  },

  mesa: {
    id: 'mesa',
    name: 'Tumbletop Mesa',
    blurb: 'A tabletop with no railings. Knock them off the edge.',
    extent: [140, 120],
    killY: -8,
    ledges: true,
    walls: false,
    height: (x, z) => {
      const ax = Math.abs(x);
      const az = Math.abs(z);
      const edge = Math.max(ax - 24, az - 29);
      let h = edge > 0 ? -22 * smooth(0, 1.4, edge) : 0;
      // centre dais 10x10 at +1.5 with 1:3 ramps on all sides
      const dm = Math.max(ax, az);
      if (dm < 9.5) h = Math.max(h, 1.5 * (1 - smooth(5, 9.5, dm)));
      return h;
    },
    deploy: { halfX: 22 },
    theme: {
      grassA: '#c9a86a',
      grassB: '#b18f55',
      dirt: '#a6784a',
      rock: '#8a5a3c',
      skyTop: '#6aa7e0',
      skyBottom: '#ffe0b8',
      fog: '#f0d9bc',
      sun: '#fff0d0',
      decor: 'mesa',
    },
  },
};

// Derived helpers
MAPS.caldera.avoid = [
  ...CALDERA_POOLS.map((p) => ({ x: p.x, z: p.z, r: p.r, pad: 1.5 })),
  ...CALDERA_GEYSERS.map((g) => ({ x: g.x, z: g.z, r: 2.6, pad: 0.8, geyser: true })),
];
MAPS.glaze.avoid = GLAZE_HOLES.map((p) => ({ x: p.x, z: p.z, r: p.r, pad: 1.5 }));
MAPS.caldera.noDeploy = (x, z) => [...CALDERA_POOLS, ...CALDERA_GEYSERS.map((g) => ({ ...g, r: 2.6 }))].some((h) => Math.hypot(x - h.x, z - h.z) < h.r + 1);
MAPS.glaze.noDeploy = (x, z) => GLAZE_HOLES.some((h) => Math.hypot(x - h.x, z - h.z) < h.r + 1);

export const MAP_LIST = ['meadow', 'hills', 'gorge', 'caldera', 'glaze', 'mesa'];

// Deployment rectangle for a team on a map.
export function deployZone(map, team) {
  const d = map.deploy || {};
  const near = d.near ?? 4;
  const far = d.far ?? 26;
  const halfX = d.halfX ?? 34;
  return team === 0 ? { x0: -halfX, x1: halfX, z0: near, z1: far } : { x0: -halfX, x1: halfX, z0: -far, z1: -near };
}
