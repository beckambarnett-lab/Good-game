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
function buildBridge() {
  reseed(515); const g = part('bridge'); const ch = new Chunk('bridge', 'street'), em = new Chunk('bridgeEm', 'street', { emis: true });
  const x0 = -6.4, x1 = -4.0, y = 3.6, za = 1.0, zb = 13.9, cx = (x0 + x1) / 2;
  ch.box(x1 - x0, 0.12, zb - za, 0x4a4e56, cx, y - 0.06, (za + zb) / 2); ch.box(x1 - x0 + 0.1, 0.5, zb - za, 0x5a5e66, cx, y - 0.37, (za + zb) / 2);
  // side parapets; the near-end west side opens onto the (closed) near stairs at z g0..g1
  const g0 = 1.5, g1 = 2.5, run = (x, a, b) => { ch.box(0.06, 1.0, b - a, 0x8a8e94, x, y + 0.5, (a + b) / 2); ch.box(0.1, 0.06, b - a, 0x55595e, x, y + 1.03, (a + b) / 2); };
  run(x0 + 0.04, za, g0); run(x0 + 0.04, g1, zb); run(x1 - 0.04, za, zb);
  for (let z = za; z < zb; z += 1.2) for (const x of [x0 + 0.04, x1 - 0.04]) if (x > x0 + 0.1 || z < g0 - 0.1 || z > g1 + 0.1) ch.box(0.08, 1.06, 0.08, 0x55595e, x, y + 0.5, z);
  for (const z of [g0, g1]) ch.box(0.1, 1.12, 0.1, 0x55595e, x0 + 0.04, y + 0.53, z);
  // near stairs, down along the kerb toward the Kaiun site. Kaiun's hoarding swallowed the bottom of them, so the ward chained the top:
  // the bridge still crosses the street from the far side, but nobody comes up this end (which is why Gen-san can deck onto it in chapter 3)
  const nb = -11.4, nz = (g0 + g1) / 2, nw = g1 - g0 - 0.1; stairX(ch, nb, x0, 0.12, y, g0 + 0.05, g1 - 0.05, 0x5a5e66);
  { const L = Math.hypot(x0 - nb, y - 0.12), ang = Math.atan2(y - 0.12, x0 - nb);
    for (const z of [g0 + 0.03, g1 - 0.03]) { ch.box(L, 0.06, 0.06, 0x8a8e94, (nb + x0) / 2, (y + 0.12) / 2 + 0.95, z, 0, 0, ang); for (let t = 0.12; t < 1; t += 0.22) ch.box(0.04, 0.95, 0.04, 0x55595e, lerp(nb, x0, t), lerp(0.12, y, t) + 0.48, z); }
    ch.box(0.26, 2.2, 0.26, 0x6a6e76, -8.3, 1.1, nz); }
  // top: a chained gate across the opening, hazard bar, and the ward's sign facing the deck
  ch.box(0.04, 0.9, nw, 0x3a3d42, x0 + 0.04, y + 0.5, nz); for (let k = 0; k < 7; k++) ch.box(0.03, 0.86, 0.02, 0x6a6e74, x0 + 0.06, y + 0.5, g0 + 0.12 + k * (nw - 0.14) / 6);
  for (let k = 0; k < 6; k++) ch.box(0.05, 0.12, nw / 6, k % 2 ? 0x16171a : 0xe8c21e, x0 + 0.1, y + 0.72, g0 + 0.05 + (k + 0.5) * nw / 6);
  ch.cable([x0 + 0.13, y + 0.45, g0 + 0.08], [x0 + 0.13, y + 0.45, g1 - 0.08], 0.12, 0.014, 0x8a8e94, 10); ch.box(0.05, 0.08, 0.06, 0xc8a040, x0 + 0.14, y + 0.33, nz);
  ch.box(0.02, 0.3, 0.62, 0xefe9da, x0 + 0.13, y + 0.98, nz); neon('立入禁止', x0 + 0.15, y + 0.98, nz, Math.PI / 2, 0.14, 'red', { px: 48, lit: 0.15, k: 1.3 });
  // bottom: a Kaiun hoarding panel across the foot of the stairs
  ch.box(0.08, 2.1, g1 - g0 + 0.1, 0xe8e6e0, nb - 0.35, 1.17, nz); ch.box(0.09, 0.25, g1 - g0 + 0.1, 0x2a2c31, nb - 0.35, 0.24, nz);
  for (let k = 0; k < 6; k++) ch.box(0.1, 0.1, (g1 - g0) / 6, k % 2 ? 0x16171a : 0xe8c21e, nb - 0.4, 1.0, g0 + (k + 0.5) * (g1 - g0) / 6);
  neon('立入禁止', nb - 0.41, 1.6, nz, -Math.PI / 2, 0.2, 'red', { px: 48, lit: 0.2, k: 1.4 }); neon('開運', nb - 0.41, 1.9, nz, -Math.PI / 2, 0.16, 'mag', { px: 48, lit: 0.15, k: 1.8 });
  for (const z of [2.0, 12.0]) { ch.box(0.5, y - 0.6, 0.5, 0x6a6e76, x0 + 0.4, (y - 0.6) / 2, z); ch.box(0.5, y - 0.6, 0.5, 0x6a6e76, x1 - 0.4, (y - 0.6) / 2, z); }
  // far stairs down toward +x
  const s0 = 12.65, s1 = 13.9; stairX(ch, 1.0, x1, 0.12, y, s0, s1, 0x5a5e66);
  ch.box(x1 - 1.0 + 0.0, 0.06, 0.06, 0x8a8e94, (1.0 + x1) / 2, (y + 0.12) / 2 + 0.95, s0, 0, 0, Math.atan2(y - 0.12, x1 - 1.0));
  // under-deck light strip + sign
  em.box(x1 - x0 - 0.2, 0.04, 0.05, 0xe8f6ff, cx, y - 0.62, 6); em.box(x1 - x0 - 0.2, 0.04, 0.05, 0xe8f6ff, cx, y - 0.62, 9);
  anchor(cx, y - 0.8, 7.5, 0xbfe6ff, 1.8, 6, ['street'], 0.2);
  neon('歩道橋', cx, y + 1.45, 7.3, -Math.PI / 2, 0.42, 'white', { px: 64, lit: 0.3, k: 1.4, ds: true });
  // panels with graffiti / ads on the bridge sides
  for (const z of [4, 10]) ch.box(0.02, 0.8, 2.2, spick([0x3a5a8a, 0x8a3a5a, 0x5a8a3a]), x0 - 0.02, y + 0.45, z);
  addBuilt(g, ch); addBuilt(g, em);
  zoneFlat(x0 + 0.1, x1 - 0.1, za + 0.05, zb, y, 'bridge'); zoneRamp(1.0, x1, s0 + 0.1, s1 - 0.05, 'x', 1.0, x1, 0.12, y, 'bridgeStair');
  solid(x0, x0 + 0.1, y, y + 1.1, za, zb, 'bridgeR'); solid(x1 - 0.1, x1, y, y + 1.1, 1.3, s0, 'bridgeR'); if (S.ch < 3) solid(x0, x1, y, y + 1.1, za - 0.05, za + 0.05, 'bridgeEnd'); // end wall only until the chapter-3 deck opens it (rebuilds must not bring it back)
  solid(1.0, x1, 0, 1.0, s0 - 0.06, s0, 'bridgeR');
  solid(nb - 0.45, -8.6, 0, 1.95, g0, g1, 'bridgeR'); // under the low end of the near stairs + the hoarding
  REF.bridgeView = new THREE.Vector3(cx, y, 5.5);
}

/* ---------- facade dressing (depends on state + upgrades) ---------- */
function signHex() { return SIGN_COLORS[S.sign] || SIGN_COLORS.cyan; }
