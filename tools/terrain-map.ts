// Renders the generated valley as a shaded relief map (hillshade, elevation tint, 5 m contours)
// with roads, rail, creek, bridges and landmarks drawn on top: artifacts/terrain/map.png. This is
// how terrain changes are checked by eye before anything is built on them.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { wrenhollowTerrain as def } from '../src/data/world/terrain.ts';
import { generateTerrain, pointAlong } from '../src/sim/world/TerrainGen.ts';
import { encodePng } from './png.ts';

const SCALE = 2; // pixels per metre
const CONTOUR = 5; // metres
const LANDMARKS: [string, number, number][] = [
  ['cabin', -175, -25],
  ['lantern', 0, 0],
  ['halt', -10, 55],
  ['school', -40, -75],
  ['ranger', -90, -190],
  ['lookout', -40, -225],
  ['landing', 163, 14],
  ['farmhouse', 45, 150],
  ['barn', 80, 165],
];

const t0 = performance.now();
const terrain = generateTerrain(def);
const hf = terrain.heightfield;
console.log(`Terrain generated in ${(performance.now() - t0).toFixed(0)} ms`);

const W = def.size * SCALE;
const rgb = new Uint8Array(W * W * 3);
const tint: [number, number, number, number][] = [
  [-4, 120, 160, 200],
  [-1, 175, 200, 215],
  [2, 214, 226, 208],
  [12, 226, 222, 190],
  [35, 205, 190, 165],
  [65, 190, 180, 175],
  [95, 245, 245, 250],
];
const colourAt = (h: number): [number, number, number] => {
  for (let k = 1; k < tint.length; k++) {
    const b = tint[k] as [number, number, number, number];
    if (h <= b[0] || k === tint.length - 1) {
      const a = tint[k - 1] as [number, number, number, number];
      const t = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0])));
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
    }
  }
  return [255, 255, 255];
};
const light = { x: -0.5, y: 0.7, z: -0.5 };
const ll = Math.hypot(light.x, light.y, light.z);
const nrm = { x: 0, y: 1, z: 0 };
for (let py = 0; py < W; py++) {
  const z = py / SCALE - def.size / 2;
  for (let px = 0; px < W; px++) {
    const x = px / SCALE - def.size / 2;
    const h = hf.sample(x, z);
    hf.normal(x, z, nrm);
    const shade = 0.55 + 0.6 * Math.max(0, (nrm.x * light.x + nrm.y * light.y + nrm.z * light.z) / ll);
    let [r, g, b] = colourAt(h);
    const hx = hf.sample(x + 1 / SCALE, z);
    const hz = hf.sample(x, z + 1 / SCALE);
    const band = Math.floor(h / CONTOUR);
    if (Math.floor(hx / CONTOUR) !== band || Math.floor(hz / CONTOUR) !== band) {
      const major = Math.floor(Math.max(h, hx, hz) / CONTOUR) % 5 === 0;
      r *= major ? 0.55 : 0.78;
      g *= major ? 0.55 : 0.78;
      b *= major ? 0.55 : 0.78;
    }
    const o = (py * W + px) * 3;
    rgb[o] = Math.min(255, r * shade);
    rgb[o + 1] = Math.min(255, g * shade);
    rgb[o + 2] = Math.min(255, b * shade);
  }
}

const dot = (x: number, z: number, radius: number, c: [number, number, number]) => {
  const cx = (x + def.size / 2) * SCALE;
  const cy = (z + def.size / 2) * SCALE;
  const r = radius * SCALE;
  for (let py = Math.floor(cy - r); py <= cy + r; py++) {
    for (let px = Math.floor(cx - r); px <= cx + r; px++) {
      if (px < 0 || py < 0 || px >= W || py >= W || Math.hypot(px - cx, py - cy) > r) continue;
      const o = (py * W + px) * 3;
      rgb[o] = c[0];
      rgb[o + 1] = c[1];
      rgb[o + 2] = c[2];
    }
  }
};
const stroke = (id: string, radius: number, c: [number, number, number], dash = 0) => {
  const path = terrain.paths.get(id);
  if (!path) return;
  const len = path.s.at(-1) ?? 0;
  for (let s = 0; s <= len; s += 0.5) {
    if (dash > 0 && Math.floor(s / dash) % 2 === 1) continue;
    const [x, z] = pointAlong(path, s);
    dot(x, z, radius, c);
  }
};

for (const creek of def.creeks) stroke(creek.id, creek.width / 2, [70, 120, 190]);
for (const road of def.roads) {
  if (road.id === 'railLine') continue;
  stroke(road.id, road.width / 2, [110, 100, 90]);
}
stroke('railLine', 1.2, [30, 30, 30], 4);
for (const b of terrain.bridges) {
  const path = terrain.paths.get(b.road);
  if (!path) continue;
  for (let s = b.s0; s <= b.s1; s += 0.5) {
    const [x, z] = pointAlong(path, s);
    dot(x, z, 1.8, [200, 60, 50]);
  }
}
for (const [, x, z] of LANDMARKS) {
  dot(x, z, 3.2, [255, 255, 255]);
  dot(x, z, 2.2, [220, 40, 40]);
}

const outDir = join(import.meta.dirname, '..', 'artifacts', 'terrain');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'map.png'), encodePng(W, W, rgb));

const report = LANDMARKS.map(
  ([name, x, z]) => `${name.padEnd(10)} (${x}, ${z})  y ${hf.sample(x, z).toFixed(2)}`,
);
let lo = Infinity;
let hi = -Infinity;
for (const v of hf.heights) {
  lo = Math.min(lo, v);
  hi = Math.max(hi, v);
}
console.log(`Heights ${lo.toFixed(1)} .. ${hi.toFixed(1)} m\n${report.join('\n')}`);
console.log(`Wrote ${join(outDir, 'map.png')}`);
