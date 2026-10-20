/* ================= the Aoyama Building ================= */
const BLD = { x0: -2.7, x1: 2.7, z0: -8, z1: 0, ix0: -2.5, ix1: 2.5, iz0: -7.8, iz1: -0.2, F: [0, 3.6, 6.8, 10], H: [3.4, 3.0, 3.0] };
const PARTS = {};      // name -> THREE.Group
const REF = {};        // named positions / objects other modules use
function part(name) { if (PARTS[name]) { const g = PARTS[name]; scene.remove(g); g.traverse(o => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose(); }); } const g = new THREE.Group(); g.name = name; scene.add(g); PARTS[name] = g; return g; }
function addBuilt(g, ch) { const m = ch.build(); if (m) g.add(m); return m; }
function clearAnchors(tag) { for (let i = ANCHORS.length - 1; i >= 0; i--) if (ANCHORS[i].tag === tag) ANCHORS.splice(i, 1); }
function tagA(a, tag) { a.tag = tag; return a; }
// wall panel with holes. axis 'x' => wall runs along x at fixed z; 'z' => runs along z at fixed x
function wallPanel(ch, axis, fixed, a0, a1, y0, y1, th, holes, col, wet) {
  const bp = new Set([a0, a1]); for (const h of holes) { if (h.a0 > a0 && h.a0 < a1) bp.add(h.a0); if (h.a1 > a0 && h.a1 < a1) bp.add(h.a1); }
  const xs = [...bp].sort((p, q) => p - q);
  for (let i = 0; i < xs.length - 1; i++) {
    const s0 = xs[i], s1 = xs[i + 1], mid = (s0 + s1) / 2; const cover = holes.filter(h => mid > h.a0 && mid < h.a1).sort((p, q) => p.y0 - q.y0);
    let y = y0; const segs = []; for (const h of cover) { if (h.y0 > y) segs.push([y, Math.min(h.y0, y1)]); y = Math.max(y, h.y1); } if (y < y1) segs.push([y, y1]);
    for (const [ya, yb] of segs) { if (yb - ya < 0.005) continue; if (axis === 'x') ch.box(s1 - s0, yb - ya, th, col, mid, (ya + yb) / 2, fixed, 0, 0, 0, wet); else ch.box(th, yb - ya, s1 - s0, col, fixed, (ya + yb) / 2, mid, 0, 0, 0, wet); }
  }
}
// plank floor with holes (rectangles to skip)
function plankFloor(ch, x0, x1, z0, z1, y, holes, col, plankW) {
  plankW = plankW || 0.18;
  for (let z = z0; z < z1 - 0.001; z += plankW) {
    const zz = Math.min(plankW, z1 - z), zc = z + zz / 2; let x = x0;
    while (x < x1 - 0.001) { const len = Math.min(srange(1.0, 2.2), x1 - x); const xc = x + len / 2; const inHole = holes.some(h => xc > h.x0 && xc < h.x1 && zc > h.z0 && zc < h.z1); if (!inHole) { const tone = new THREE.Color(col).multiplyScalar(srange(0.82, 1.1)).getHex(); ch.box(len - 0.008, 0.04, zz - 0.008, tone, xc, y - 0.02, zc); } x += len; }
  }
}
// straight stair along x
function stairX(ch, xa, xb, ya, yb, z0, z1, col) {
  const n = Math.round(Math.abs(yb - ya) / 0.2), dx = (xb - xa) / n, dy = (yb - ya) / n, zc = (z0 + z1) / 2, w = z1 - z0;
  for (let i = 0; i < n; i++) { const x = xa + dx * (i + 0.5), y = ya + dy * (i + 1); ch.box(Math.abs(dx) + 0.04, 0.045, w, col || C.cedar, x, y - 0.0225, zc); ch.box(0.02, Math.abs(dy), w - 0.02, C.cedarD, x - dx / 2, y - dy / 2, zc); }
  // stringers
  const len = Math.hypot(xb - xa, yb - ya), ang = Math.atan2(yb - ya, xb - xa);
  for (const zz of [z0 + 0.03, z1 - 0.03]) ch.box(len, 0.24, 0.05, C.cedarD, (xa + xb) / 2, (ya + yb) / 2 - 0.1, zz, 0, 0, ang);
}

/* ---------- shell: walls, slabs, stairs (built once) ---------- */
function buildShell() {
  reseed(4242);
  const g = part('shell');
  const ext = new Chunk('shellExt', 'facade'), g0 = new Chunk('g0shell', 'g0'), f2 = new Chunk('f2shell', 'f2'), f3 = new Chunk('f3shell', 'f3'), rf = new Chunk('roofShell', 'roof');
  const { x0, x1, z0, ix0, ix1, iz0 } = BLD, F = BLD.F;
  const facadeCol = 0x15171b, panelCol = 0x434753, plaster = C.plaster;
  // ---- exterior skin: front (z=0) with openings per floor
  const frontHoles = [{ a0: -2.3, a1: 0.5, y0: 0.85, y1: 2.55 }, { a0: 0.8, a1: 1.9, y0: 0, y1: 2.4 }, // ground window + door
    { a0: -1.9, a1: 0.3, y0: F[1] + 0.5, y1: F[1] + 2.5 }, { a0: 0.8, a1: 1.9, y0: F[1], y1: F[1] + 2.3 }, // f2 round-window bay + balcony door
    { a0: -2.2, a1: -0.4, y0: F[2] + 0.8, y1: F[2] + 2.3 }, { a0: 0.4, a1: 2.2, y0: F[2] + 0.8, y1: F[2] + 2.3 }]; // f3 windows
  wallPanel(ext, 'x', -0.03, x0, x1, 0, F[3] + 1.1, 0.06, frontHoles, facadeCol);
  // ground storefront band: dark timber frame
  // jambs (reveals) for openings
  for (const h of frontHoles) { if (h.a0 === 0.8 && (h.y0 === F[1] || h.y0 === 0)) continue; const w = h.a1 - h.a0, hh = h.y1 - h.y0, cx = (h.a0 + h.a1) / 2; ext.box(w, 0.03, 0.2, 0x2a2c31, cx, h.y1 - 0.015, -0.1); if (h.y0 > 0.01) ext.box(w + 0.06, 0.06, 0.26, 0x55595e, cx, h.y0 - 0.03, -0.08); ext.box(0.03, hh, 0.2, 0x2a2c31, h.a0 + 0.015, (h.y0 + h.y1) / 2, -0.1); ext.box(0.03, hh, 0.2, 0x2a2c31, h.a1 - 0.015, (h.y0 + h.y1) / 2, -0.1); }
  // upper floor cladding panels + floor bands
  // parapet + coping
  // side walls exterior
  ext.box(0.06, F[3] + 1.1, 8, panelCol, x0 - 0.03, (F[3] + 1.1) / 2, z0 / 2);
  wallPanel(ext, 'z', x1 + 0.03, z0, 0, 0, F[3] + 1.1, 0.06, [{ a0: -4.6, a1: -3.8, y0: 0, y1: 2.2 }, { a0: -3.4, a1: -2.0, y0: F[1] + 0.9, y1: F[1] + 2.1 }, { a0: -3.4, a1: -2.0, y0: F[2] + 0.9, y1: F[2] + 2.1 }], panelCol);
  ext.box(5.5, F[3] + 1.1, 0.06, panelCol, 0, (F[3] + 1.1) / 2, z0 - 0.03);
  // side-wall clutter (alley side): pipes, meters, conduit, fire-escape ladder
  P.bracketPipe(ext, x1 + 0.12, 0, F[3] + 0.9, -0.5, 0.055, 0x5a5d62);
  // rain gutter along the alley eave, feeding the downspout at z -6.2 (its lower end is fitted in the prologue)
  ext.box(0.16, 0.12, 7.9, 0x4a4d52, x1 + 0.12, F[3] + 1.02, -4.0); ext.bar([x1 + 0.13, F[3] + 0.98, -6.2], [x1 + 0.13, 2.42, -6.2], 0.13, 0x4a4d52, 8);
  for (let y = 3.2; y < F[3]; y += 1.4) ext.box(0.2, 0.04, 0.2, C.iron, x1 + 0.1, y, -6.2); ext.cyl(0.085, 0.07, 0.08, 8, 0x3a3d42, x1 + 0.13, 2.4, -6.2);
  P.meter(ext, x1 + 0.1, 1.5, -5.2, Math.PI / 2); P.meter(ext, x1 + 0.1, 1.5, -5.6, Math.PI / 2); P.meter(ext, x1 + 0.1, 1.9, -5.4, Math.PI / 2);
  P.conduit(ext, [[x1 + 0.08, 1.7, -5.4], [x1 + 0.08, 2.9, -5.4], [x1 + 0.08, 2.9, -1.0], [x1 + 0.08, F[1] + 2.6, -1.0]], 0.04);
  P.acUnit(ext, x1 + 0.2, F[1] + 0.5, -5.5, Math.PI / 2); P.acUnit(ext, x1 + 0.2, F[2] + 0.5, -5.5, Math.PI / 2);
  // fire-escape ladder, hung high (starts above head height), at the back corner
  for (let y = 2.4; y < F[3] + 0.9; y += 0.32) ext.box(0.04, 0.03, 0.44, 0x3a3c42, x1 + 0.3, y, -7.42); for (const z of [-7.2, -7.64]) ext.box(0.045, F[3] + 0.9 - 2.2, 0.045, 0x3a3c42, x1 + 0.3, (F[3] + 0.9 + 2.2) / 2, z);
  for (const y of [3.0, 6.2, 9.4]) { ext.box(0.3, 0.04, 0.04, 0x3a3c42, x1 + 0.15, y, -7.2); ext.box(0.3, 0.04, 0.04, 0x3a3c42, x1 + 0.15, y, -7.64); }
  // left side above the soba roof: ads + AC
  P.acUnit(ext, x0 - 0.2, 7.6, -3.2, -Math.PI / 2); P.bracketPipe(ext, x0 - 0.12, 7.2, F[3] + 0.9, -1.0, 0.05);
  // ---- balcony slab (f2) + railing
  ext.box(5.4, 0.18, 1.25, 0x4a4e56, 0, F[1] - 0.09, 0.62); P.railing(ext, -2.65, 1.2, 2.65, 1.2, F[1], 1.0, 0x2a2c31); P.railing(ext, 2.65, 0.05, 2.65, 1.2, F[1], 1.0, 0x2a2c31); // west side rail: buildPreDeck (gone once the deck opens it)
  // ---- interior skins per floor
  const inner = (ch, fy, h, holesFront, wainscot, col) => {
    wallPanel(ch, 'x', -0.2 - 0.03, ix0, ix1, fy, fy + h, 0.06, holesFront, col);
    wallPanel(ch, 'z', ix0 - 0.03, iz0, -0.2, fy, fy + h, 0.06, [], col);
    wallPanel(ch, 'z', ix1 + 0.03, iz0, -0.2, fy, fy + h, 0.06, fy === 0 ? [{ a0: -4.6, a1: -3.8, y0: 0, y1: 2.2 }] : [{ a0: -3.4, a1: -2.0, y0: fy + 0.9, y1: fy + 2.1 }], col);
    wallPanel(ch, 'x', iz0 - 0.03, ix0, ix1, fy, fy + h, 0.06, [], col);
  };
  inner(g0, 0, 3.4, [{ a0: -2.3, a1: 0.5, y0: 0.85, y1: 2.55 }, { a0: 0.8, a1: 1.9, y0: 0, y1: 2.4 }], true, plaster);
  inner(f2, F[1], 3.0, [{ a0: -1.9, a1: 0.3, y0: F[1] + 0.5, y1: F[1] + 2.5 }, { a0: 0.8, a1: 1.9, y0: F[1], y1: F[1] + 2.3 }], false, 0xb9ad96);
  inner(f3, F[2], 3.0, [{ a0: -2.2, a1: -0.4, y0: F[2] + 0.8, y1: F[2] + 2.3 }, { a0: 0.4, a1: 2.2, y0: F[2] + 0.8, y1: F[2] + 2.3 }], false, 0x9a9a92);
  // window/door reveals inside
  for (const [ch, holes] of [[g0, [{ a0: -2.3, a1: 0.5, y0: 0.85, y1: 2.55 }]]]) for (const h of holes) { const w = h.a1 - h.a0; ch.box(w, 0.04, 0.2, C.cedarD, (h.a0 + h.a1) / 2, h.y1 - 0.02, -0.1); ch.box(0.04, h.y1 - h.y0, 0.2, C.cedarD, h.a0 + 0.02, (h.y0 + h.y1) / 2, -0.1); ch.box(0.04, h.y1 - h.y0, 0.2, C.cedarD, h.a1 - 0.02, (h.y0 + h.y1) / 2, -0.1); }
  // ground: wainscot (lower panelling) on side + back walls
  for (const [xa, za, xb, zb] of [[ix0 + 0.02, -0.25, ix0 + 0.02, -5.45], [ix1 - 0.02, -0.25, ix1 - 0.02, -3.75]]) { const len = Math.abs(zb - za); g0.box(0.03, 0.95, len, C.cedar, xa, 0.475, (za + zb) / 2); g0.box(0.05, 0.05, len, C.cedarD, xa, 0.97, (za + zb) / 2); for (let z = Math.min(za, zb); z < Math.max(za, zb); z += 0.3) g0.box(0.035, 0.9, 0.02, C.cedarD, xa, 0.45, z); }
  g0.box(1.8, 0.95, 0.03, C.cedar, -1.6, 0.475, -0.25); g0.box(1.8, 0.05, 0.05, C.cedarD, -1.6, 0.97, -0.26);
  // skirting
  for (const [x, z, w, d] of [[0, iz0 + 0.02, 5, 0.03]]) g0.box(w, 0.1, d, C.cedarD, x, 0.05, z);
  // partition wall between work area and back room (z -5.6..-5.4) with doorway x -0.5..0.5
  wallPanel(g0, 'x', -5.5, ix0, ix1, 0, 3.4, 0.2, [{ a0: -0.5, a1: 0.5, y0: 0, y1: 2.15 }], plaster);
  g0.box(1.1, 0.08, 0.24, C.cedarD, 0, 2.19, -5.5); g0.box(0.06, 2.15, 0.24, C.cedarD, -0.53, 1.075, -5.5); g0.box(0.06, 2.15, 0.24, C.cedarD, 0.53, 1.075, -5.5);
  // ---- floors and ceilings
  const st1 = { x0: -1.6, x1: 2.0, z0: -7.8, z1: -6.9 }, st2 = { x0: -1.6, x1: 2.0, z0: -6.9, z1: -6.0 }, st3 = { x0: -1.6, x1: 2.0, z0: -7.8, z1: -6.9 };
  // dark varnished planks with a wet-look sheen (gloss chunk: grain, lamp highlights, planar reflection of bulbs/neon) over a black sub-floor that shows in the seams
  { const fl = new Chunk('g0floor', 'g0', { gloss: true }); fl.box(ix1 - ix0, 0.02, -0.2 - iz0, 0x0e0906, (ix0 + ix1) / 2, -0.045, (iz0 - 0.2) / 2); fl.gk = 4; plankFloor(fl, ix0, ix1, iz0, -0.2, 0, [], 0x3c2516, 0.16); addBuilt(g, fl); }
  // ground ceiling (underside of f2 slab) with beams
  g0.box(5.0, 0.04, 7.6, 0x6a5038, 0, 3.38, -4.0);
  for (let z = -0.6; z > -7.8; z -= 1.1) g0.box(5.0, 0.18, 0.12, C.cedarD, 0, 3.27, z);
  // f2 floor (holes: stair1 opening, stair2 run)
  f2.box(5.0, 0.04, 6.0, 0x8a7a5a, 0, F[1] - 0.02, -3.2 + 0.0);
  f2.box(0.5, 0.04, 1.8, 0x8a7a5a, 2.25, F[1] - 0.02, -6.9); // landing
  f2.box(0.9, 0.04, 0.9, 0x8a7a5a, -2.05, F[1] - 0.02, -6.45); // nook floor
  P.railing(f2, -1.6, -6.88, 1.55, -6.88, F[1], 0.95, C.cedarD); f2.box(0.08, 1.0, 0.08, C.cedarD, 1.55, F[1] + 0.5, -6.88); // newel post: the rail stops short so you can turn onto the next flight
  f2.box(5.0, 0.04, 7.6, 0x6a5a48, 0, F[2] - 0.22, -4.0);
  // f3 floor: everything except the stair2 opening
  f3.box(5.0, 0.04, 6.0, 0x6a6a64, 0, F[2] - 0.02, -3.2); f3.box(0.9, 0.04, 1.8, 0x6a6a64, -2.05, F[2] - 0.02, -6.9); f3.box(0.5, 0.04, 0.9, 0x6a6a64, 2.25, F[2] - 0.02, -6.45);
  P.railing(f3, -1.6, -6.02, 2.0, -6.02, F[2], 0.95, C.iron);
  f3.box(5.0, 0.04, 7.6, 0x5a5a56, 0, F[3] - 0.22, -4.0);
  // roof surface (outside), parapet inner faces
  rf.box(5.0, 0.06, 6.6, 0x5a5e66, 0, F[3] - 0.03, -3.5); rf.box(0.5, 0.06, 1.1, 0x5a5e66, 2.25, F[3] - 0.03, -7.25);
  for (const [x, z, w, d] of [[0, -0.12, 5.4, 0.2], [0, -7.92, 5.4, 0.2], [-2.62, -4, 0.2, 7.8], [2.62, -4, 0.2, 7.8]]) rf.box(w, 1.1, d, 0x6a6e76, x, F[3] + 0.55, z);
  // stair house on the roof
  rf.box(4.0, 2.4, 0.15, 0x6a6e76, 0.3, F[3] + 1.2, -6.75 + 0.0); // front wall of stair house (door gap handled below)
  rf.box(0.15, 2.4, 1.1, 0x6a6e76, -1.75, F[3] + 1.2, -7.3); rf.box(4.4, 0.15, 1.3, 0x55595e, 0.4, F[3] + 2.45, -7.25);
  // stairs
  stairX(g0, -1.6, 2.0, 0, F[1], st1.z0 + 0.02, st1.z1 - 0.02, C.cedar);
  stairX(f2, 2.0, -1.6, F[1], F[2], st2.z0 + 0.02, st2.z1 - 0.02, C.cedar);
  stairX(f3, -1.6, 2.0, F[2], F[3], st3.z0 + 0.02, st3.z1 - 0.02, 0x7a7a72);
  // handrails
  g0.bar([-1.6, 0.9, -6.92], [2.0, F[1] + 0.9, -6.92], 0.045, C.cedarD); f2.bar([2.0, F[1] + 0.9, -6.02], [-1.6, F[2] + 0.9, -6.02], 0.045, C.cedarD); f3.bar([-1.6, F[2] + 0.9, -6.92], [2.0, F[3] + 0.9, -6.92], 0.045, C.iron);
  // stairwell wall lamps on each flight
  const semis = new Chunk('stairEm', 'g0', { emis: true });
  for (const [x, y, z, zone] of [[-2.4, 2.0, -7.35, 'g0'], [2.4, F[1] + 1.9, -6.9, 'f2'], [-2.4, F[2] + 1.9, -6.45, 'f3'], [2.4, F[2] + 2.4, -7.6, 'f3']]) { semis.box(0.06, 0.18, 0.12, 0xffd8a0, x, y, z); anchor(x * 0.92, y, z, 0xffc890, 1.4, 3.6, [zone], 0.3).tag = 'stairs'; }
  addBuilt(g, semis);
  for (const ch of [ext, g0, f2, f3, rf]) addBuilt(g, ch);
  // ---- collision for the building (walls) - walls except openings
  const T = 'bld';
  solid(x0, x1, 0, 14, z0 - 0.3, iz0, T); solid(x0 - 0.3, ix0, 0, 14, z0, 0, T);
  solid(ix1, x1, 0, 14, z0, -4.6, T); solid(ix1, x1, 0, 14, -3.8, 0, T); solid(ix1, x1, 2.2, 14, -4.6, -3.8, T);
  // front wall per floor (keep the door openings)
  solid(x0, 0.8, 0, 3.4, -0.2, 0, T); solid(1.9, x1, 0, 3.4, -0.2, 0, T); solid(0.8, 1.9, 2.4, 3.6, -0.2, 0, T);
  solid(x0, 0.8, 3.6, 6.8, -0.2, 0, T); solid(1.9, x1, 3.6, 6.8, -0.2, 0, T);
  solid(x0, x1, 6.8, 10, -0.2, 0, T);
  // partition with doorway
  solid(ix0, -0.5, 0, 3.4, -5.6, -5.4, T); solid(0.5, ix1, 0, 3.4, -5.6, -5.4, T);
  // floors: ground and up
  zoneFlat(ix0 + 0.01, ix1 - 0.01, iz0 + 0.01, -0.21, 0, 'g0');
  zoneFlat(0.8, 1.9, -0.25, 0.05, 0, 'g0'); zoneFlat(2.45, 2.75, -4.6, -3.8, 0.03, 'g0');
  zoneRamp(st1.x0, st1.x1, st1.z0 + 0.05, st1.z1 - 0.06, 'x', st1.x0, st1.x1, 0, F[1], 'stair1');
  zoneFlat(ix0, ix1, -6.0, -0.21, F[1], 'f2'); zoneFlat(2.0, ix1, iz0, -6.0, F[1], 'f2');
  zoneRamp(st2.x0, st2.x1, st2.z0 + 0.05, st2.z1 - 0.05, 'x', st2.x1, st2.x0, F[1], F[2], 'stair2');
  zoneFlat(ix0, ix1, -6.0, -0.21, F[2], 'f3'); zoneFlat(ix0, -1.6, iz0, -6.0, F[2], 'f3'); zoneFlat(2.0, ix1, -6.9, -6.0, F[2], 'f3');
  zoneRamp(st3.x0, st3.x1, st3.z0 + 0.05, st3.z1 - 0.05, 'x', st3.x0, st3.x1, F[2], F[3], 'stair3');
  zoneFlat(ix0, ix1, -6.7, -0.25, F[3], 'roof'); zoneFlat(2.0, ix1, iz0, -6.7, F[3], 'roof');
  // stair railings & under-stair solids
  solid(-1.6, 1.59, 3.6, 4.6, -6.92, -6.86, T);   // f2 rail along the stair1 opening (stops short of the landing)
  solid(-1.6, 2.0, 6.8, 7.8, -6.06, -6.0, T);    // f3 rail along the stair2 opening
  solid(ix0, -1.6, 3.6, 6.8, -6.9, -6.0, T);     // f2 nook under stair2 top
  solid(-1.6, 2.0, 0, 2.4, -6.88, -6.82, 'st1side'); // keep people off the stair side
  solid(-2.6, 1.7, F[3], F[3] + 2.4, -6.82, -6.68, T); // stair house front wall (door at x 1.7..2.5)
  // roof parapet
  solid(x0, x1, F[3], F[3] + 1.1, -0.3, -0.05, T); solid(x0, x0 + 0.25, F[3], F[3] + 1.1, z0, 0, T); solid(x1 - 0.25, x1, F[3], F[3] + 1.1, z0, 0, T);
  // balcony
  solid(-2.7, 2.7, 3.6, 4.7, 1.17, 1.3, 'balc'); if (S.ch < 3) solid(-2.75, -2.6, 3.6, 4.7, 0, 1.3, 'balcL'); // west balcony rail, opened by the chapter-3 deck (rebuilds must not bring it back) solid(2.6, 2.75, 3.6, 4.7, 0, 1.3, 'balc');
  REF.stairBase = new THREE.Vector3(-2.05, 0, -7.35);
}

/* ---------- footbridge over the street (pedestrian bridge) ---------- */
// textured quads that still take the baked street light (Chunk is colour-only): one mesh per texture, worldMat with a map
class TQ {
  constructor(zone) { this.zone = zone; this.b = new Map(); }
  // unit plane (local XY, facing +z) placed like M(x,y,z,rx,ry,0,w,h); uv = [u0,v0,u1,v1]; nx×ny cells keep the vertex bake local
  q(tex, x, y, z, w, h, rx, ry, uv, nx, ny, tint) {
    let b = this.b.get(tex); if (!b) this.b.set(tex, b = { p: [], n: [], u: [], c: [] });
    const m = M(x, y, z, rx, ry, 0, w, h, 1), [u0, v0, u1, v1] = uv || [0, 0, 1, 1]; nx = nx || 1; ny = ny || 1; _col.set(tint == null ? 0xffffff : tint); _v2.set(0, 0, 1).transformDirection(m);
    const pt = (i, j) => { _v1.set(i / nx - 0.5, j / ny - 0.5, 0).applyMatrix4(m); b.p.push(_v1.x, _v1.y, _v1.z); b.n.push(_v2.x, _v2.y, _v2.z); b.u.push(lerp(u0, u1, i / nx), lerp(v0, v1, j / ny)); b.c.push(_col.r, _col.g, _col.b); };
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { pt(i, j); pt(i + 1, j); pt(i + 1, j + 1); pt(i, j); pt(i + 1, j + 1); pt(i, j + 1); }
    return this;
  }
  build(g) {
    for (const [tex, b] of this.b) {
      const pos = new Float32Array(b.p), nor = new Float32Array(b.n), bake = new Float32Array(pos.length); bakeArrays(this.zone, pos, nor, bake, true);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(b.u), 2)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(b.c), 3)); geo.setAttribute('bake', new THREE.BufferAttribute(bake, 3));
      geo.computeBoundingSphere(); const mesh = new THREE.Mesh(geo, tex.userData.wm || (tex.userData.wm = worldMat({ map: tex }))); mesh.matrixAutoUpdate = false; mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
    }
  }
}
// the BEFORE bridge's surfaces, drawn once and shared: weathered parapet steel (one tile = 4.2 m of side, parapet top to girder bottom),
// diamond-plate treads, a hazard board, the ward's red 立入禁止 sign. Own seed; the builder's random sequence is restored after.
const BTX = {};
function bridgeTex() {
  if (BTX.steel) return BTX; const keep = seedS; reseed(5150); const R = srange;
  const wrapDraw = (c, W) => (x, w, fn) => { for (const o of [0, -W, W]) if (x + o + w > 0 && x + o - w < W) { c.save(); c.translate(o, 0); fn(); c.restore(); } };
  BTX.steel = canvasTex(512, 256, (c, W, H) => {
    const wrap = wrapDraw(c, W), DL = 159; // DL: the deck line (parapet above, girder web below)
    const streak = (x, y, len, w, a) => { const g = c.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, `rgba(150,66,24,${a})`); g.addColorStop(0.4, `rgba(122,56,22,${a * 0.6})`); g.addColorStop(1, 'rgba(100,46,18,0)'); wrap(x, w, () => { c.fillStyle = g; c.fillRect(x - w / 2, y, w, len); }); };
    const rivet = (x, y) => wrap(x, 3, () => { c.fillStyle = 'rgba(26,28,32,0.85)'; c.beginPath(); c.arc(x, y + 0.6, 1.8, 0, 7); c.fill(); c.fillStyle = 'rgba(170,180,184,0.55)'; c.fillRect(x - 0.8, y - 1, 1.4, 1); });
    // paint: desaturated pale blue-grey, mottled; the girder web below the deck line darker
    c.fillStyle = '#6a7275'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { const x = R(0, W), y = R(0, H), r = R(2, 14), k = R(0.6, 1), col = srand() < 0.5 ? `rgba(160,166,164,${R(0.04, 0.13)})` : `rgba(40,40,40,${R(0.05, 0.14)})`; wrap(x, r * 1.4, () => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r * 1.4, r * k, 0, 0, 7); c.fill(); }); }
    c.fillStyle = 'rgba(40,30,26,0.4)'; c.fillRect(0, DL, W, H - DL);
    // peeling paint: primer-white flakes and patches of bare rusted steel
    for (let i = 0; i < 30; i++) { const x = R(0, W), y = R(4, H - 10), s = R(4, 20), rust = srand() < 0.55, pts = []; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, rr = s * R(0.45, 1.2); pts.push([x + Math.cos(a) * rr * 1.5, y + Math.sin(a) * rr * 0.75]); }
      const fill = rust ? `rgb(${R(92, 120) | 0},${R(50, 64) | 0},${R(30, 40) | 0})` : '#9aa4a6';
      wrap(x, s * 1.8, () => { c.beginPath(); for (const p of pts) c.lineTo(p[0], p[1]); c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = rust ? 'rgba(178,188,190,0.55)' : 'rgba(26,30,34,0.5)'; c.lineWidth = 1; c.stroke(); }); }
    // plate seams with rivet columns (4 plates a tile), rivet rows under the cap, both sides of the deck line and at the bottom
    for (let k = 0; k < 4; k++) { const x = k * 128 + 3; c.fillStyle = 'rgba(22,25,28,0.85)'; c.fillRect(x - 1, 0, 2, H); c.fillStyle = 'rgba(150,162,168,0.35)'; c.fillRect(x + 1, 0, 1, H); for (let y = 8; y < H; y += 9) { rivet(x - 5, y); rivet(x + 6, y); } }
    for (const y of [5, DL - 6, DL + 6, H - 9]) for (let x = 6; x < W; x += 9) rivet(x, y);
    c.fillStyle = 'rgba(18,20,24,0.9)'; c.fillRect(0, DL - 1, W, 3);
    // rust: blooms on the rivet rows, streaks bleeding down from the top rail, the seams and the deck line
    for (let i = 0; i < 60; i++) { const x = R(0, W), y = spick([5, DL - 6, DL + 6, H - 9]), r = R(3, 9), col = `rgba(140,60,22,${R(0.25, 0.5)})`; wrap(x, r * 2, () => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r * 2, r * 0.7, 0, 0, 7); c.fill(); }); }
    for (let i = 0; i < 170; i++) streak(R(0, W), R(0, 6), R(14, 130), R(1, 5), R(0.35, 0.85));
    for (let k = 0; k < 4; k++) for (let i = 0; i < 9; i++) streak(k * 128 + 3 + R(-7, 7), R(0, H - 20), R(10, 70), R(1, 3), R(0.3, 0.7));
    for (let i = 0; i < 80; i++) streak(R(0, W), DL - 4, R(10, 95), R(1, 4.5), R(0.3, 0.8));
    // grime: darkening toward the deck line and the girder bottom, plus rain tracks
    let g = c.createLinearGradient(0, 0, 0, DL); g.addColorStop(0, 'rgba(14,13,12,0)'); g.addColorStop(0.55, 'rgba(14,13,12,0.08)'); g.addColorStop(1, 'rgba(14,13,12,0.42)'); c.fillStyle = g; c.fillRect(0, 0, W, DL);
    g = c.createLinearGradient(0, DL, 0, H); g.addColorStop(0, 'rgba(16,12,10,0.12)'); g.addColorStop(1, 'rgba(16,10,6,0.72)'); c.fillStyle = g; c.fillRect(0, DL, W, H - DL);
    for (let i = 0; i < 170; i++) { const x = R(0, W), y = R(0, H), w = R(0.6, 2), h = R(10, 80), col = `rgba(18,20,22,${R(0.05, 0.16)})`; wrap(x, w, () => { c.fillStyle = col; c.fillRect(x, y, w, h); }); }
    // graffiti: black spray tags, scribbles with drips, a few block-letter throw-ups
    const scrib = (x, y, s) => { const n = 5 + (srand() * 6 | 0), pts = []; let px = x - s; for (let k = 0; k < n; k++) { const nx = px + s * 2 / n * R(0.6, 1.5); pts.push([px + R(-s, s) * 0.5, y + R(-s, s) * 0.6, nx, y + R(-s, s) * 0.45]); px = nx; }
      const lw = R(1.6, 3.4), a = R(0.75, 0.95), sw = srand() < 0.6, drips = [0, 1, 2].map(() => srand() < 0.5 ? [x + R(-s, s), R(6, 18)] : null);
      wrap(x, s * 2.2, () => { c.lineCap = c.lineJoin = 'round'; c.strokeStyle = `rgba(12,12,14,${a})`; c.lineWidth = lw; c.beginPath(); c.moveTo(x - s, y); for (const p of pts) c.quadraticCurveTo(p[0], p[1], p[2], p[3]); c.stroke();
        if (sw) { c.beginPath(); c.moveTo(x - s, y + s * 0.45); c.quadraticCurveTo(x, y + s * 0.75, x + s * 1.1, y + s * 0.3); c.stroke(); }
        c.lineWidth = 1; for (const d of drips) if (d) { c.beginPath(); c.moveTo(d[0], y); c.lineTo(d[0], y + d[1]); c.stroke(); } }); };
    for (let i = 0; i < 9; i++) scrib(R(0, W), R(30, 135), R(12, 32));
    for (let i = 0; i < 3; i++) scrib(R(0, W), R(188, 232), R(10, 22));
    for (let i = 0; i < 4; i++) { const x = R(0, W), y = R(50, 140), px = R(22, 34) | 0, wd = spick(['REM', 'KZ', 'OKE', 'SHO', 'NEO', 'ZK7', 'AME', 'DRIP']), rot = R(-0.15, 0.1);
      wrap(x, px * 2.2, () => { c.translate(x, y); c.rotate(rot); c.font = `${px}px ${FONT_SIGN}`; c.textAlign = 'center'; c.lineWidth = 2.2; c.strokeStyle = 'rgba(12,12,14,0.9)'; c.strokeText(wd, 0, 0); }); }
    // torn paper posters and stickers, slightly grimed
    for (let i = 0; i < 5; i++) { const x = R(0, W), y = R(16, 112), w = R(16, 34), h = R(22, 40), rot = R(-0.08, 0.08), ink = spick(['#2a2a2e', '#a8322a', '#33416e']), pts = [], lines = [];
      for (let k = 0; k <= 6; k++) pts.push([k / 6 * w, R(-1.5, 1.5) + (srand() < 0.2 ? R(0, h * 0.3) : 0)]); for (let k = 0; k <= 6; k++) pts.push([w + R(-1.5, 1.5), k / 6 * h]);
      for (let k = 0; k <= 6; k++) pts.push([w - k / 6 * w, h + R(-1.5, 1.5) - (srand() < 0.4 ? R(0, h * 0.45) : 0)]); for (let k = 0; k <= 6; k++) pts.push([R(-1.5, 1.5), h - k / 6 * h]);
      for (let ly = h * 0.36; ly < h * 0.9; ly += 4) lines.push([ly, w * R(0.4, 0.75)]); const paper = `rgb(${R(196, 224) | 0},${R(194, 220) | 0},${R(182, 208) | 0})`;
      wrap(x, w, () => { c.translate(x, y); c.rotate(rot); c.beginPath(); for (const p of pts) c.lineTo(p[0], p[1]); c.closePath(); c.fillStyle = paper; c.fill(); c.clip();
        c.globalAlpha = 0.7; c.fillStyle = ink; c.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.16); c.fillStyle = '#4a4a4e'; for (const l of lines) c.fillRect(w * 0.12, l[0], l[1], 1.4);
        c.globalAlpha = 1; const gg = c.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, 'rgba(120,100,70,0.08)'); gg.addColorStop(1, 'rgba(90,70,40,0.45)'); c.fillStyle = gg; c.fillRect(-2, -2, w + 4, h + 4); }); }
    for (let i = 0; i < 24; i++) { const x = R(0, W), y = R(14, 150), w = R(4, 10), h = R(3, 8), rot = R(-0.4, 0.4), col = spick(['#e6e2d8', '#e6e2d8', '#d4be48', '#c4483a', '#3a66aa', '#eeeeea']); wrap(x, w, () => { c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.fillRect(0, 0, w, h); }); }
    // a last film of rust bleed over everything from the top rail
    for (let i = 0; i < 34; i++) streak(R(0, W), R(0, 6), R(30, 130), R(1, 3), R(0.12, 0.32));
  }, { repeat: true });
  // diamond plate: dark steel, rust in the corners, raised lugs, worn brighter down the middle
  BTX.plate = canvasTex(128, 128, (c, W, H) => {
    c.fillStyle = '#34322f'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const x = R(0, W), y = R(0, H), r = R(3, 12); c.fillStyle = `rgba(118,54,24,${R(0.1, 0.35)})`; c.beginPath(); c.ellipse(x, y, r, r * R(0.5, 1), R(0, 3), 0, 7); c.fill(); }
    for (let j = -1; j < 9; j++) for (let i = -1; i < 9; i++) { const x = i * 16 + (j & 1) * 8, y = j * 16 + 8; c.save(); c.translate(x, y); c.rotate((i + j) & 1 ? 0.7 : -0.7); c.fillStyle = 'rgba(112,108,100,0.85)'; c.fillRect(-6, -1.6, 12, 3.2); c.fillStyle = 'rgba(10,10,10,0.55)'; c.fillRect(-6, 1.4, 12, 1.2); c.restore(); }
    const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.5, 'rgba(160,160,160,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }, { repeat: true });
  // hazard board: diagonal yellow/black, scuffed, rust bleeding from the bolt holes
  BTX.hazard = canvasTex(256, 64, (c, W, H) => {
    c.fillStyle = '#d4ac1c'; c.fillRect(0, 0, W, H); c.fillStyle = '#17171a'; for (let x = -H; x < W + H; x += 36) { c.beginPath(); c.moveTo(x, H); c.lineTo(x + 18, H); c.lineTo(x + 18 + H, 0); c.lineTo(x + H, 0); c.closePath(); c.fill(); }
    for (let i = 0; i < 60; i++) { c.fillStyle = srand() < 0.5 ? `rgba(30,26,20,${R(0.1, 0.3)})` : `rgba(220,210,180,${R(0.08, 0.2)})`; c.fillRect(R(0, W), R(0, H), R(2, 14), R(1, 3)); }
    for (const x of [10, W - 10]) for (const y of [10, H - 10]) { c.fillStyle = '#2a2420'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); const g = c.createLinearGradient(0, y, 0, H); g.addColorStop(0, 'rgba(140,60,20,0.7)'); g.addColorStop(1, 'rgba(140,60,20,0)'); c.fillStyle = g; c.fillRect(x - 2, y, 4, H - y); }
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(10,10,10,0)'); g.addColorStop(1, 'rgba(20,14,8,0.45)'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.strokeStyle = '#1a1816'; c.lineWidth = 3; c.strokeRect(1.5, 1.5, W - 3, H - 3);
  }, { repeat: true });
  // the ward's sign: white 立入禁止 on red, a white keyline, rust at the bolts
  BTX.sign = canvasTex(256, 96, (c, W, H) => {
    c.fillStyle = '#b8211c'; c.fillRect(0, 0, W, H); c.strokeStyle = '#f2ede4'; c.lineWidth = 4; c.strokeRect(8, 8, W - 16, H - 16);
    c.fillStyle = '#f6f2ea'; c.font = `54px ${FONT_SIGN}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('立入禁止', W / 2, H / 2 + 2);
    for (const x of [4, W - 4]) { c.fillStyle = '#3a2a22'; c.beginPath(); c.arc(x, H / 2, 2.5, 0, 7); c.fill(); }
    for (let i = 0; i < 14; i++) { const x = srand() < 0.5 ? R(0, 22) : R(W - 22, W), y = R(0, H); c.fillStyle = `rgba(110,50,22,${R(0.2, 0.5)})`; c.beginPath(); c.arc(x, y, R(1, 4), 0, 7); c.fill(); }
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(30,10,8,0.3)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  seedS = keep; return BTX;
}
function buildBridge() {
  // rebuild-safe: upgrades call this again (rebuildBridge in k_terrace.js), so drop last build's anchors, signs and collision first
  clearAnchors('bridge'); for (const t of ['bridge', 'bridgeStair', 'bridgeR', 'bridgeEnd']) clearTag(t); for (let i = CITY.signs.length - 1; i >= 0; i--) if (CITY.signs[i].part === 'bridge') CITY.signs.splice(i, 1);
  for (let i = CITY.flicker.length - 1; i >= 0; i--) if (CITY.flicker[i].part === 'bridge') CITY.flicker.splice(i, 1);
  const T = bridgeTex(), a0 = ANCHORS.length, s0n = CITY.signs.length;
  reseed(515); const g = part('bridge'); const ch = new Chunk('bridge', 'street'), em = new Chunk('bridgeEm', 'street', { emis: true }), tq = new TQ('street');
  const x0 = -6.4, x1 = -4.0, y = 3.6, za = 1.0, zb = 13.9, cx = (x0 + x1) / 2, old = !bridgeOpen();
  const yt = y + 1.02, yb = y - 0.62, TL = 5.2, TH = yt - yb, g0 = 1.5, g1 = 2.5, s0 = 12.65, s1 = 13.9;
  // stage 0: weathered pale blue-grey steel (the texture carries the paint, rust, tags and posters); open: plain charcoal-indigo
  const paint = old ? 0x56616a : 0x262937, cap = old ? 0x4a4f53 : 0x1d1f2b, flange = old ? 0x3a2a20 : 0x191b24, beam = old ? 0x3a3330 : 0x1c1e27;
  ch.box(x1 - x0 - 0.2, 0.12, zb - za, 0x4a4e56, cx, y - 0.06, (za + zb) / 2);
  // one outer/inner face of the riveted side wall; u runs left→right as seen from the face's front, so the posters aren't mirrored
  const face = (x, dir, a, b, ya, yb2, off) => tq.q(T.steel, x, (ya + yb2) / 2, (a + b) / 2, b - a, yb2 - ya, 0, dir * Math.PI / 2,
    [(dir > 0 ? -b : a) / TL + off, (ya - yb) / TH, (dir > 0 ? -a : b) / TL + off, (yb2 - yb) / TH], Math.max(1, Math.round((b - a) / 1.1)), yb2 - ya > 0.8 ? 2 : 1);
  // the two sides: plate-girder web under the deck (full length), parapet above it (gaps for the near-stair gate and the far-stair landing),
  // a chunky cap rail, a rust-stained lower flange, posts on the inner face
  for (const s of [-1, 1]) {
    const xc = s < 0 ? x0 + 0.02 : x1 - 0.02, xo = xc + s * 0.062, xi = xc - s * 0.062, off = s < 0 ? 0.37 : 0;
    ch.box(0.12, y - yb, zb - za, paint, xc, (y + yb) / 2, (za + zb) / 2); ch.box(0.26, 0.07, zb - za, flange, xc, yb - 0.035, (za + zb) / 2); ch.box(0.03, 0.05, zb - za, flange, xc - s * 0.1, yb + 0.02, (za + zb) / 2);
    if (old) face(xo, s, za, zb, yb, y, off);
    for (const [a, b] of s < 0 ? [[za, g0], [g1, zb]] : [[za, s0]]) {
      ch.box(0.12, yt - y, b - a, paint, xc, (y + yt) / 2, (a + b) / 2); ch.box(0.22, 0.09, b - a, cap, xc, yt + 0.045, (a + b) / 2); ch.box(0.26, 0.025, b - a, cap, xc, yt + 0.005, (a + b) / 2);
      if (old) { face(xo, s, a, b, y, yt, off); face(xi, -s, a, b, y, yt, off + 0.23); }
      for (let z = a + 0.55; z < b - 0.25; z += 1.2) ch.box(0.05, yt - y, 0.09, cap, xi - s * 0.025, (y + yt) / 2, z);
    }
  }
  // far end wall (konbini side), same build
  { const zc = zb - 0.06; ch.box(x1 - x0 - 0.04, yt - y, 0.12, paint, cx, (y + yt) / 2, zc); ch.box(x1 - x0 + 0.1, 0.09, 0.22, cap, cx, yt + 0.045, zc);
    if (old) { tq.q(T.steel, cx, (y + yt) / 2, zc + 0.062, x1 - x0 - 0.04, yt - y, 0, 0, [x0 / TL, (y - yb) / TH, x1 / TL, 1], 2, 1); tq.q(T.steel, cx, (y + yt) / 2, zc - 0.062, x1 - x0 - 0.04, yt - y, 0, Math.PI, [-x1 / TL + 0.5, (y - yb) / TH, -x0 / TL + 0.5, 1], 2, 1); } }
  for (const z of [g0, g1]) ch.box(0.1, 1.12, 0.1, cap, x0 + 0.04, y + 0.53, z);
  // under the deck: exposed steel I-beams (cross beams every 1.6 m, two stringers)
  const bw = x1 - x0 - 0.26;
  for (let z = za + 0.7; z < zb - 0.2; z += 1.6) { ch.box(bw, 0.34, 0.025, beam, cx, y - 0.12 - 0.17, z); ch.box(bw, 0.025, 0.14, beam, cx, y - 0.13, z); ch.box(bw, 0.025, 0.14, beam, cx, y - 0.45, z); }
  for (const x of [cx - 0.55, cx + 0.55]) { ch.box(0.025, 0.28, zb - za - 0.1, beam, x, y - 0.26, (za + zb) / 2); ch.box(0.12, 0.025, zb - za - 0.1, beam, x, y - 0.4, (za + zb) / 2); }
  // near stairs, down along the kerb toward the Kaiun site. Kaiun's hoarding swallowed the bottom of them, so the ward chained the top:
  // the bridge still crosses the street from the far side, but nobody comes up this end (which is why Gen-san can deck onto it in chapter 3)
  const nb = -11.4, nz = (g0 + g1) / 2, nw = g1 - g0 - 0.1; stairX(ch, nb, x0, 0.12, y, g0 + 0.05, g1 - 0.05, 0x3e3c3a);
  { const L = Math.hypot(x0 - nb, y - 0.12), ang = Math.atan2(y - 0.12, x0 - nb);
    for (const z of [g0 + 0.03, g1 - 0.03]) { ch.box(L, 0.06, 0.06, 0x4e4440, (nb + x0) / 2, (y + 0.12) / 2 + 0.95, z, 0, 0, ang); for (let t = 0.12; t < 1; t += 0.22) ch.box(0.04, 0.95, 0.04, 0x3a3634, lerp(nb, x0, t), lerp(0.12, y, t) + 0.48, z); }
    ch.box(0.26, 2.2, 0.26, 0x55595e, -8.3, 1.1, nz); }
  // top: a chained gate across the opening, a hazard board, and the ward's sign facing the deck
  ch.box(0.04, 0.9, nw, 0x2e2a28, x0 + 0.04, y + 0.5, nz); for (let k = 0; k < 7; k++) ch.box(0.03, 0.86, 0.02, 0x5a4234, x0 + 0.06, y + 0.5, g0 + 0.12 + k * (nw - 0.14) / 6);
  tq.q(T.hazard, x0 + 0.1, y + 0.72, nz, nw, 0.16, 0, Math.PI / 2, [0, 0, 2.2, 1]);
  ch.cable([x0 + 0.13, y + 0.45, g0 + 0.08], [x0 + 0.13, y + 0.45, g1 - 0.08], 0.12, 0.014, 0x6a5a50, 10); ch.box(0.05, 0.08, 0.06, 0xa88a40, x0 + 0.14, y + 0.33, nz);
  ch.box(0.02, 0.3, 0.66, 0x2a2624, x0 + 0.12, y + 0.98, nz); tq.q(T.sign, x0 + 0.135, y + 0.98, nz, 0.62, 0.23, 0, Math.PI / 2);
  // bottom: a Kaiun hoarding panel across the foot of the stairs
  ch.box(0.08, 2.1, g1 - g0 + 0.1, 0xe8e6e0, nb - 0.35, 1.17, nz); ch.box(0.09, 0.25, g1 - g0 + 0.1, 0x2a2c31, nb - 0.35, 0.24, nz);
  for (let k = 0; k < 6; k++) ch.box(0.1, 0.1, (g1 - g0) / 6, k % 2 ? 0x16171a : 0xe8c21e, nb - 0.4, 1.0, g0 + (k + 0.5) * (g1 - g0) / 6);
  neon('立入禁止', nb - 0.41, 1.6, nz, -Math.PI / 2, 0.2, 'red', { px: 48, lit: 0.2, k: 1.4, group: g }); neon('開運', nb - 0.41, 1.9, nz, -Math.PI / 2, 0.16, 'mag', { px: 48, lit: 0.15, k: 1.8, group: g });
  for (const z of [2.0, 12.0]) { ch.box(0.5, y - 0.6, 0.5, 0x5a5e64, x0 + 0.4, (y - 0.6) / 2, z); ch.box(0.5, y - 0.6, 0.5, 0x5a5e64, x1 - 0.4, (y - 0.6) / 2, z); }
  // far stairs down toward +x: an open-riser steel stair. Until the stairs upgrade: rusty diamond-plate treads, rusted nosings, worn rubber
  // strips, rusty stringers, round handrails on balusters both sides, caution tape on the konbini-side rail
  const rusty = !bup('tstairs'), sb = 1.0, n = 17, sdx = (x1 - sb) / n, sdy = (y - 0.12) / n, tw = s1 - s0 - 0.11, szc = (s0 + s1) / 2, slope = (y - 0.12) / (sb - x1);
  const yN = x => 0.12 + (sb - x) * slope, railH = 0.88, railC = rusty ? 0x6a4028 : 0x262834, strC = rusty ? 0x4c3022 : 0x22242e;
  for (let i = 0; i < n; i++) {
    const x = sb + sdx * (i + 0.5), ty = 0.12 + sdy * (i + 1), d = Math.abs(sdx) + 0.03, fx = x + Math.abs(sdx) / 2;
    ch.box(d, 0.025, tw, rusty ? 0x2e2b28 : 0x2a2c34, x, ty - 0.0125, szc);
    if (rusty) { tq.q(T.plate, x, ty + 0.002, szc, d, tw, -Math.PI / 2, 0, [0, 0, d / 0.22, tw / 0.22], 1, 2, 0xb0b4ba);
      ch.box(0.035, 0.05, tw + 0.01, new THREE.Color(0x7a4022).multiplyScalar(srange(0.75, 1.1)).getHex(), fx - 0.012, ty - 0.02, szc);
      for (let z = s0 + 0.1; z < s1 - 0.15;) { const L = Math.min(srange(0.18, 0.5), s1 - 0.1 - z); ch.box(0.05, 0.008, L, 0x19191b, fx - 0.06, ty + 0.004, z + L / 2); z += L + srange(0.02, 0.12); } // worn rubber strip, torn in places
    }
  }
  { const L = Math.hypot(sb - x1, y - 0.12), ang = Math.atan2(y - 0.12, x1 - sb);
    for (const z of [s0 + 0.03, s1 - 0.03]) { ch.box(L + 0.1, 0.26, 0.05, strC, (sb + x1) / 2, (y + 0.12) / 2 - 0.11, z, 0, 0, ang); ch.box(L + 0.1, 0.03, 0.1, strC, (sb + x1) / 2 - 0.02, (y + 0.12) / 2 - 0.23, z - Math.sign(z - szc) * 0.025, 0, 0, ang); }
    // round tubular handrails on balusters, both sides; the road-side rail runs on up to the bridge's parapet
    for (const z of [s0 + 0.03, s1 - 0.03]) {
      const xa = sb - 0.05, xe = x1 + 0.02; ch.bar([xa, yN(xa) + railH, z], [xe, yN(xe) + railH, z], 0.05, railC, 8); ch.bar([xa, yN(xa) + railH, z], [sb + 0.3, yN(xa) + railH, z], 0.05, railC, 8);
      ch.bar([sb + 0.3, 0.12, z], [sb + 0.3, yN(xa) + railH + 0.02, z], 0.055, railC, 8); ch.bar([xe, y, z], [xe, yN(xe) + railH, z], 0.055, railC, 8);
      for (let i = 0; i < n; i++) { const x = sb + sdx * (i + 0.5); ch.box(0.022, railH - 0.06, 0.022, railC, x, yN(x) + railH / 2 + 0.02, z); }
      if (z < szc) ch.bar([xe, yN(xe) + railH, z], [x1 - 0.02, yt, s0 - 0.05], 0.05, railC, 8);
    }
  }
  if (rusty) { // yellow/black caution tape wrapped round the konbini-side rail near the bottom, and a loose end hanging off the newel post
    const z = s1 - 0.03, tape = (a, b, k) => { for (let i = 0; i < k; i++) ch.bar([lerp(a[0], b[0], i / k), lerp(a[1], b[1], i / k), lerp(a[2], b[2], i / k)], [lerp(a[0], b[0], (i + 1) / k), lerp(a[1], b[1], (i + 1) / k), lerp(a[2], b[2], (i + 1) / k)], 0.024, i % 2 ? 0x161618 : 0xe2c21c); };
    for (let i = 0; i < 9; i++) { const x = sb + 0.25 - i * 0.07, yy = (i < 3 ? 0.4 + i * 0.22 : yN(x) + railH); ch.box(0.045, 0.075, 0.075, i % 2 ? 0x161618 : 0xe2c21c, i < 3 ? sb + 0.3 : x, yy, z, 0.35, 0, i < 3 ? 0 : -0.6); }
    tape([sb + 0.3, 0.95, z + 0.03], [sb + 0.05, 0.45, z + 0.08], 6); tape([sb + 0.05, 0.45, z + 0.08], [sb + 0.15, 0.13, z + 0.2], 4); tape([sb + 0.15, 0.13, z + 0.2], [sb + 0.55, 0.125, z + 0.3], 4);
  }
  // under-deck: one bare fluorescent tube under the street-side girder, cold white and a little flickery (stage 0); dead fittings until the underside lights
  const fit = (z, live) => { ch.box(0.07, 0.03, 1.28, 0x2a2b2e, x1 - 0.05, yb - 0.085, z); for (const dz of [-0.5, 0.5]) ch.box(0.02, 0.05, 0.02, 0x2a2b2e, x1 - 0.05, yb - 0.05, z + dz); if (!live) ch.cyl(0.016, 0.016, 1.2, 6, 0x6a6e72, x1 - 0.05, yb - 0.115, z, Math.PI / 2); };
  if (old) {
    fit(7.5, true); const tube = new THREE.Mesh(gCyl(8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.8, 1.8), fog: true })); tube.position.set(x1 - 0.05, yb - 0.115, 7.5); tube.rotation.x = Math.PI / 2; tube.scale.set(0.034, 1.2, 0.034); tube.layers.enable(1); tube.userData.keepGeo = true; g.add(tube);
    const rec = { mesh: tube, hex: 0xe8f6ff, base: 1.8, flick: true, ph: 3.7, part: 'bridge' }; CITY.signs.push(rec); CITY.flicker.push(rec);
    anchor(cx, y - 0.8, 7.5, 0xbfe6ff, 1.8, 6, ['street'], 0.2);
  }
  if (!bup('tunder')) for (const z of [3.5, 11.2]) fit(z, false);
  // blank, sun-bleached ad panels on the outer fascias (stage 1 puts the 雫テラス board on the first; the neon teacup upgrade replaces the second)
  const ad = (z, w) => { for (const s of [-1, 1]) { const xo = (s < 0 ? x0 + 0.02 : x1 - 0.02) + s * 0.062; ch.box(0.03, 0.74, w + 0.08, old ? 0x44403c : 0x1e2029, xo + s * 0.015, y - 0.12, z); ch.box(0.012, 0.62, w - 0.04, new THREE.Color(0x7c7a72).multiplyScalar(srange(0.85, 1)).getHex(), xo + s * 0.034, y - 0.12, z);
    for (let k = 0; k < 5; k++) ch.box(0.004, srange(0.05, 0.2), srange(0.008, 0.02), 0x7a4a2a, xo + s * 0.041, y - 0.12 + srange(-0.25, 0.1), z + srange(-w / 2, w / 2) * 0.9); } };
  if (old) ad(6.0, 1.8); if (!bup('tneon')) ad(9.6, 1.4);
  // the far stair foot before the terrace: cones (one knocked over) until the stairs upgrade, two utility cabinets at stage 0, litter until the sidewalk planters
  if (rusty) { P.cone(ch, -0.3, 0.12, 12.25); P.cone(ch, 1.3, 0.12, 14.05); atR(ch, 0.25, 0.2, 12.1, 0, 0.7, Math.PI / 2 + 0.3, () => P.cone(ch, 0, -0.27, 0)); }
  if (old) for (const [x, k] of [[-1.0, 0], [-1.6, 1]]) { // grimy grey utility cabinets on the road side of the stairs
    const c = k ? 0x6c7276 : 0x777c80, z = 12.4, h = 0.95 - k * 0.12; ch.box(0.52, 0.06, 0.32, 0x2e3032, x, 0.15, z); ch.box(0.5, h, 0.3, c, x, 0.18 + h / 2, z); ch.box(0.56, 0.03, 0.36, 0x5a5f62, x, 0.195 + h, z);
    ch.box(0.004, h - 0.15, 0.01, 0x3a3d40, x, 0.18 + h / 2, z - 0.151); ch.box(0.06, 0.03, 0.01, 0x2a2c2e, x + 0.14, 0.7, z - 0.153); for (let v = 0; v < 4; v++) ch.box(0.3, 0.012, 0.006, 0x4a4e52, x - 0.05, 0.3 + v * 0.03, z - 0.153);
    ch.box(0.12, 0.08, 0.004, 0xe0dccf, x - 0.12, h - 0.1, z - 0.153); ch.box(0.12, 0.012, 0.005, 0xc23a2e, x - 0.12, h - 0.08, z - 0.154);
    for (let s = 0; s < 3; s++) ch.box(0.006, srange(0.15, 0.4), 0.004, 0x6a4026, x + srange(-0.2, 0.2), h - 0.15, z - 0.152);
    solid(x - 0.27, x + 0.27, 0, 1.2, z - 0.17, z + 0.17, 'bridge');
  }
  if (!bup('tstreet')) { // crushed cans in the gutter and on the kerb, soggy paper flyers
    for (const [x, yy, z, c, ry] of [[1.45, 0, 11.25, 0xb02e28, 0.4], [2.05, 0, 11.38, 0x9aa0a6, 2.1], [-0.9, 0.12, 12.05, 0x2a7a6a, 1.2]]) atR(ch, x, yy + 0.022, z, 0, ry, Math.PI / 2, () => { ch.ball(0.036, c, 0, 0, 0, 1, 1, 1.4, 0.62); ch.cyl(0.031, 0.031, 0.006, 8, 0xb8bcc0, 0, 0.05, 0); });
    for (const [x, yy, z, ry, c] of [[0.6, 0.12, 12.15, 0.5, 0xc8c2b2], [2.5, 0, 11.05, -0.3, 0xb8b09e], [-1.6, 0, 10.7, 1.1, 0xd0c8b4], [3.2, 0.12, 12.6, 2.4, 0xbab4a4]]) { ch.box(0.21, 0.004, 0.29, c, x, yy + 0.004, z, 0.02, ry, 0.03); ch.box(0.15, 0.002, 0.06, 0x3a3a40, x, yy + 0.007, z, 0, ry, 0); }
  }
  addBuilt(g, ch); addBuilt(g, em); tq.build(g);
  zoneFlat(x0 + 0.1, x1 - 0.1, za + 0.05, zb, y, 'bridge'); zoneRamp(1.0, x1, s0 + 0.1, s1 - 0.05, 'x', 1.0, x1, 0.12, y, 'bridgeStair');
  solid(x0, x0 + 0.1, y, y + 1.1, za, zb, 'bridgeR'); solid(x1 - 0.1, x1, y, y + 1.1, 1.3, s0, 'bridgeR'); if (S.ch < 3) solid(x0, x1, y, y + 1.1, za - 0.05, za + 0.05, 'bridgeEnd'); // end wall only until the chapter-3 deck opens it (rebuilds must not bring it back)
  solid(x0, x1, y, y + 1.1, zb - 0.12, zb, 'bridgeR');
  solid(1.0, x1, 0, 1.0, s0 - 0.06, s0, 'bridgeR');
  solid(nb - 0.45, -8.6, 0, 1.95, g0, g1, 'bridgeR'); // under the low end of the near stairs + the hoarding
  REF.bridgeView = new THREE.Vector3(cx, y, 5.5);
  for (let i = a0; i < ANCHORS.length; i++) ANCHORS[i].tag = 'bridge'; for (let i = s0n; i < CITY.signs.length; i++) CITY.signs[i].part = 'bridge';
}

/* ---------- facade dressing (depends on state + upgrades) ---------- */
function signHex() { return SIGN_COLORS[S.sign] || SIGN_COLORS.cyan; }
