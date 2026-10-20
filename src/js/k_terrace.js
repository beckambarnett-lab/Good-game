/* ================= 雫テラス: the footbridge's stages (gauntlet/BRIDGE_UPGRADE_MAP.md) ================= */
// Stage 0 until the Chapter 3 unlock, stage 1 at the unlock, then one more per bridge upgrade (UPG entries with `bridge: n`).
// buildBridge() (e_building.js) draws the structure for stage 0 / stage 1+; buildTerrace() (k_ch3.js) the opened deck, tables
// and the older heaters / strings; each later upgrade draws its own pieces here, in its own function, into the 'terraceFx' part.
function bridgeOpen() { return S.ch >= 3; }
function bup(id) { return S.ch >= 3 && lv(id) > 0; }
function bridgeStage() { return S.ch < 3 ? 0 : 1 + UPG.filter(u => u.bridge && lv(u.id)).length; }
function rebuildBridge() { buildBridge(); buildTerrace(); buildTerraceFx(); rebakeStreet(); refreshSeats(); }

// one function per upgrade: (ch, em, g) are the solid chunk, the emissive chunk and the part group; collision uses the upgrade id as its tag
const TERRACE_FX = {
  tstreet(ch, em, g) { },
  tstairs(ch, em, g) { },
  tlanterns(ch, em, g) { },
  tplanters(ch, em, g) { },
  // amber downlights the length of the underside (lighting the road below), and a thin cyan LED strip on both lower fascia edges
  tunder(ch, em, g) {
    const yb = F2 - 0.62; // the slab's underside
    for (const z of [1.4, 2.9, 4.3, 5.7, 7.1, 8.5, 9.9, 11.3, 12.8]) { for (const x of [-5.75, -4.65]) { ch.cyl(0.1, 0.1, 0.03, 10, 0x1a1b1f, x, yb - 0.01, z); em.cyl(0.065, 0.065, 0.012, 10, 0xffc27a, x, yb - 0.026, z); } tagA(anchor(-5.2, yb - 0.5, z, 0xffa858, 1.5, 4.6, ['street'], 0.2), 'terraceFx'); }
    for (const x of [-6.465, -3.935]) { const o = Math.sign(x + 5.2); ch.box(0.03, 0.05, 12.9, 0x16171b, x, yb + 0.03, 7.45); em.box(0.02, 0.026, 12.9, 0x6ff4ff, x + o * 0.012, yb + 0.03, 7.45); for (const z of [3.5, 7.5, 11.5]) tagA(anchor(x + o * 0.8, yb - 0.3, z, 0x33e4ff, 0.55, 3.4, ['street'], 0.2), 'terraceFx'); }
  },
  // the pink neon teacup over the bridge's second ad panel: the west face (konbini side) covers the old panel, the east face is the one the street sees
  tneon(ch, em, g) {
    const R = tfxRes(), y = F2 + 0.47, z = 10.0;
    for (const [x, ry] of [[-6.445, -Math.PI / 2], [-3.925, Math.PI / 2]]) {
      const nx = Math.sin(ry); ch.box(0.03, 0.84, 1.1, 0x14151b, x, y, z); for (const dz of [-0.555, 0.555]) em.box(0.012, 0.86, 0.012, 0xff3d9a, x + nx * 0.016, y, z + dz);
      for (const [mat, d] of [[R.cupMat, 0.02], [R.steamMat, 0.026]]) { const m = new THREE.Mesh(gPlaneIdx(), mat); m.userData.keepGeo = true; m.position.set(x + nx * d, y, z); m.rotation.y = ry; m.scale.set(0.78, 0.78, 1); m.layers.enable(1); m.renderOrder = 2; g.add(m); if (mat === R.steamMat) m.userData.steamY = y; }
      tagA(anchor(x + nx * 0.7, y, z, 0xff3d9a, 1.5, 4.8, ['street', 'far'], 0.15), 'terraceFx');
    }
  },
  // a slim black steel pergola over the whole deck with clear polycarbonate panels, rain sheeting off the long edges, and two more tables under it
  tcanopy(ch, em, g) {
    const R = tfxRes(), yt = F2 + 2.5, K = 0x141519; tfxPosts(ch);
    for (const x of [-6.36, -4.04]) ch.box(0.08, 0.12, 12.85, K, x, yt - 0.06, 7.45); // edge beams
    for (const x of [-5.8, -5.2, -4.6]) ch.box(0.04, 0.06, 12.85, K, x, yt - 0.03, 7.45); // purlins
    for (const z of [...TFX_PZ, 13.85]) ch.box(2.36, 0.1, 0.06, K, -5.2, yt - 0.05, z); // cross beams
    for (let z = 1.9; z < 13.8; z += 1.5) ch.box(2.32, 0.04, 0.03, K, -5.2, yt - 0.02, z); // glazing bars between them
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 12.95), R.polyMat); m.rotation.x = -Math.PI / 2; m.position.set(-5.2, yt + 0.012, 7.43); m.renderOrder = 3; g.add(m); }
    { // rain running off the two long edges: one scrolling streak sheet per side
      const q = new THREE.PlaneGeometry(12.9, 2.9); q.translate(0, -1.45, 0); for (const x of [-6.47, -3.93]) { const m = new THREE.Mesh(q, R.sheetMat); m.rotation.y = Math.PI / 2; m.position.set(x, yt - 0.02, 7.45); m.renderOrder = 3; g.add(m); } }
    TFX_TZ.forEach((z, k) => {
      ch.cyl(0.32, 0.32, 0.04, 12, C.cedarL, -5.2, F2 + 0.74, z); ch.cyl(0.04, 0.04, 0.72, 6, C.iron, -5.2, F2 + 0.37, z); P.stool(ch, -5.75, F2, z, 0.5); P.stool(ch, -4.65, F2, z, 0.5); P.yunomi(ch, -5.25, F2 + 0.76, z + 0.1);
      solidC(-5.2, z, 0.62, 0.62, F2, F2 + 0.8, 'tcanopy'); for (const [x, sd] of [[-5.75, 'L'], [-4.65, 'R']]) { solidC(x, z, 0.4, 0.4, F2, F2 + 0.5, 'tcanopy'); SOL[SOL.length - 1].seat = 't' + (3 + k) + sd; } // stools: solid only while someone sits (as in buildTerrace)
    });
    tagA(anchor(-5.2, yt - 0.4, 9.5, 0xffd2a0, 0.5, 4, ['street'], 0.3), 'terraceFx');
  },
  tbamboo(ch, em, g) { },
  twisteria(ch, em, g) { },
  // four copper mushroom heaters along the street-side (west) parapet, between the tables
  heaters(ch, em, g) {
    const CU = C.copper, CD = 0x7a4626, x = -6.1;
    for (const z of [2.35, 3.65, 4.95, 6.25]) {
      ch.cyl(0.2, 0.23, 0.06, 14, CD, x, F2 + 0.03, z); ch.cyl(0.07, 0.1, 0.26, 12, CU, x, F2 + 0.19, z); ch.cyl(0.035, 0.035, 1.05, 8, CU, x, F2 + 0.84, z);
      ch.cyl(0.11, 0.11, 0.06, 12, C.brass, x, F2 + 1.38, z); em.cyl(0.08, 0.08, 0.7, 12, 0xff8a3c, x, F2 + 1.76, z); em.cyl(0.045, 0.045, 0.66, 8, 0xffd0a0, x, F2 + 1.76, z);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ch.box(0.014, 0.7, 0.014, CU, x + Math.cos(a) * 0.115, F2 + 1.76, z + Math.sin(a) * 0.115); }
      ch.cyl(0.12, 0.12, 0.05, 12, C.brass, x, F2 + 2.13, z); ch.cyl(0.06, 0.4, 0.13, 16, CU, x, F2 + 2.22, z); ch.cyl(0.41, 0.41, 0.025, 16, CD, x, F2 + 2.155, z); ch.cyl(0.025, 0.025, 0.07, 6, C.brass, x, F2 + 2.32, z);
      tagA(anchor(x + 0.25, F2 + 1.6, z, 0xff7a34, 1.3, 3.2, ['street'], 0.35), 'terraceFx');
      solidC(x, z, 0.38, 0.38, F2, F2 + 2.2, 'heaters'); // only the parapet strip: the middle of the deck stays clear
    }
  },
  // bulb strands zig-zagging overhead from post to post (on the pergola's beams once it's up): warm white, amber, pink and teal, instanced
  strings(ch, em, g) {
    if (!bup('tcanopy')) tfxPosts(ch);
    const R = tfxRes(), y = F2 + 2.42, xs = [-6.32, -4.08], pts = [], cols = [0xfff0d6, 0xffb35c, 0xfff0d6, 0xff5aa6, 0xfff0d6, 0xffb35c, 0xfff0d6, 0x33e4d8], c = new THREE.Color();
    for (const ph of [0, 1]) for (let k = 0; k + 1 < TFX_PZ.length; k++) {
      const a = [xs[(k + ph) % 2], y, TFX_PZ[k]], b = [xs[(k + ph + 1) % 2], y, TFX_PZ[k + 1]]; ch.cable(a, b, 0.28, 0.01, 0x0e0f12, 8);
      for (let i = 1; i < 9; i++) { const t = i / 9; pts.push([lerp(a[0], b[0], t), y - Math.sin(t * Math.PI) * 0.28 - 0.04, lerp(a[2], b[2], t)]); }
    }
    const m = new THREE.InstancedMesh(R.bulbGeo, R.bulbMat, pts.length), M4 = new THREE.Matrix4();
    pts.forEach((p, i) => { M4.makeScale(0.034, 0.04, 0.034).setPosition(p[0], p[1], p[2]); m.setMatrixAt(i, M4); m.setColorAt(i, c.set(cols[i % cols.length])); });
    m.userData.keepGeo = true; m.layers.enable(1); m.frustumCulled = false; g.add(m);
    for (const z of [2.6, 5.6, 8.6, 11.6]) tagA(anchor(-5.2, y - 0.5, z, 0xffc888, 0.75, 3.2, ['street'], 0.3), 'terraceFx');
  },
};
// the pergola's post stations (about every 1.5 m); the east side stops short of the far stair opening (z 12.65+)
const TFX_PZ = [1.15, 2.5, 4.0, 5.5, 7.0, 8.5, 10.0, 11.5, 12.55];
const TFX_TZ = [5.6, 6.9]; // the canopy's two extra tables, continuing buildTerrace's row (1.7, 3.0, 4.3)
// slim black posts on both parapets (shared by the canopy and, before it, the strings)
function tfxPosts(ch) { for (const z of TFX_PZ) for (const x of [-6.36, -4.04]) ch.box(0.07, 2.5, 0.07, 0x141519, x, F2 + 1.25, z); ch.box(0.07, 2.5, 0.07, 0x141519, -6.36, F2 + 1.25, 13.85); }
// materials and textures shared by every rebuild (rebuilds only re-place meshes)
const TFXR = {};
function tfxRes() {
  if (TFXR.bulbMat) return TFXR; let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; // its own generator: built once, so it must not shift the seeded build sequence
  TFXR.bulbGeo = new THREE.IcosahedronGeometry(1, 1); TFXR.bulbMat = new THREE.MeshBasicMaterial({ fog: true });
  // polycarbonate: faint panel seams, a sheen and beaded water
  const poly = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#5a6870'; x.fillRect(0, 0, w, h); const gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(230,245,255,.8)'; for (let i = 0; i < 70; i++) { x.beginPath(); x.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.6, 0, 7); x.fill(); } x.fillStyle = 'rgba(20,24,28,.9)'; x.fillRect(0, 0, w, 2); x.fillRect(0, 0, 2, h); }, { repeat: true });
  poly.repeat.set(2, 9); TFXR.polyMat = new THREE.MeshBasicMaterial({ map: poly, color: 0xb0c4d0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: true });
  // rain sheets: vertical streaks that scroll down (map), fading out toward the street (alphaMap, fixed)
  const st = canvasTex(64, 128, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const sx = rnd() * w, y0 = rnd() * h, L = 20 + rnd() * 70; x.strokeStyle = `rgba(255,255,255,${0.35 + rnd() * 0.6})`; x.lineWidth = 0.6 + rnd() * 0.8; for (const o of [0, -h, h]) { x.beginPath(); x.moveTo(sx, y0 + o); x.lineTo(sx, y0 + L + o); x.stroke(); } } }, { repeat: true });
  st.repeat.set(14, 1); const fa = canvasTex(4, 64, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#777'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  TFXR.sheetMat = new THREE.MeshBasicMaterial({ map: st, alphaMap: fa, color: 0xc4dcee, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
  // the neon teacup and its steam (separate, so the steam can rise and fade)
  const glow = (x, path) => { for (const [col, lw, blur, a] of [['#ff3d9a', 16, 30, 0.55], ['#ff4fa8', 8, 12, 1], ['#ffd4ea', 2.6, 4, 1]]) { x.save(); x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = lw; x.shadowColor = '#ff3d9a'; x.shadowBlur = blur; x.lineCap = x.lineJoin = 'round'; x.beginPath(); path(); x.stroke(); x.restore(); } };
  const cup = canvasTex(256, 256, x => { x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
    glow(x, () => { x.moveTo(58, 122); x.lineTo(68, 186); x.quadraticCurveTo(72, 208, 96, 208); x.lineTo(156, 208); x.quadraticCurveTo(180, 208, 184, 186); x.lineTo(194, 122); x.closePath(); });
    glow(x, () => x.arc(198, 156, 24, -Math.PI * 0.45, Math.PI * 0.45)); glow(x, () => { x.moveTo(36, 226); x.quadraticCurveTo(126, 242, 216, 226); }); });
  const steam = canvasTex(256, 256, x => { x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); for (const sx of [98, 126, 154]) glow(x, () => { x.moveTo(sx, 104); x.bezierCurveTo(sx - 18, 84, sx + 18, 66, sx, 46); x.bezierCurveTo(sx - 12, 32, sx + 10, 24, sx + 2, 12); }); });
  const sm = map => new THREE.MeshBasicMaterial({ map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(2.2, 2.2, 2.2), fog: true });
  TFXR.cupMat = sm(cup); TFXR.steamMat = sm(steam);
  return TFXR;
}
// cheap per-frame bits: the rain sheets scroll, the teacup's steam rises and fades
HOOK.update.push(dt => {
  if (!TFXR.bulbMat || !bridgeOpen()) return; const off = S.flags.blackout ? 0.05 : 1;
  if (bup('tcanopy')) { const t = TFXR.sheetMat.map; t.offset.y = (t.offset.y + dt * 1.6) % 1; TFXR.sheetMat.opacity = 0.55 * clamp(WX.rain * 1.2, 0, 1); }
  if (bup('tneon') && PARTS.terraceFx) { const q = (time * 0.45) % 1; TFXR.steamMat.color.setScalar(2.2 * Math.sin(q * Math.PI) * off); TFXR.cupMat.color.setScalar(2.2 * off); for (const m of PARTS.terraceFx.children) if (m.userData.steamY) m.position.y = m.userData.steamY + q * 0.06; }
});
function buildTerraceFx() {
  reseed(3203); clearAnchors('terraceFx'); for (const id in TERRACE_FX) clearTag(id); const g = part('terraceFx'); if (!bridgeOpen()) return;
  const a0 = ANCHORS.length, ch = new Chunk('terraceFx', 'street'), em = new Chunk('terraceFxEm', 'street', { emis: true });
  for (const id in TERRACE_FX) if (bup(id)) TERRACE_FX[id](ch, em, g);
  addBuilt(g, ch); addBuilt(g, em);
  for (let i = a0; i < ANCHORS.length; i++) ANCHORS[i].tag = ANCHORS[i].tag || 'terraceFx';
  // the bridge and deck were baked before these anchors existed: rebake them so the heaters, bulbs and downlights reach them
  for (const n of ['bridge', 'terrace']) if (PARTS[n]) PARTS[n].traverse(o => { if (o.isMesh) rebake(o, 'street'); });
}
HOOK.upper.push(buildTerraceFx);
HOOK.apply.push(id => { if (UID[id] && UID[id].bridge) rebuildBridge(); });
// the canopy's two tables: seats (once it's bought) and their waypoints. Guests come off the far stairs down the east lane
// to the aisles, instead of walking through the new tables on the straight br1-br2 line
HOOK.waypoints.push(() => {
  if (!WP.br1 || !WP.br2) return; unlinkPair('br1', 'br2');
  TFX_TZ.forEach((z, k) => { const i = 3 + k; wp('ta' + i, -5.2, F2, z + 0.55); wp('t' + i + 'L', -5.75, F2, z); wp('t' + i + 'R', -4.65, F2, z); link('ta' + i, 't' + i + 'L'); link('ta' + i, 't' + i + 'R'); });
  wp('tlA', -4.26, F2, 7.45); wp('tlB', -4.26, F2, 6.15); wp('tlC', -4.26, F2, 5.2); link('br1', 'ta4', 'tlA', 'tlB', 'tlC', 'br2'); link('tlB', 'ta3');
});
HOOK.seats.push(s => { if (!bup('tcanopy')) return; for (const i of [3, 4]) { s.push({ id: 't' + i + 'L', node: 't' + i + 'L', yaw: Math.PI / 2, kind: 'stool', sp: 'terrace' }); s.push({ id: 't' + i + 'R', node: 't' + i + 'R', yaw: -Math.PI / 2, kind: 'stool', sp: 'terrace' }); } });
// where each bridge upgrade is installed (the crate's ghost and the install camera)
HOOK.upos.push(id => {
  const out = (spot, stand, size, axis) => ({ spot, cam: { pos: stand.clone().add(Vv(0, 1.55, 0)), at: spot }, size, axis });
  return ({
    tstreet: out(Vv(1.4, 0.4, 12.4), Vv(2.4, 0.12, 11.9), [1.2, 0.8, 0.6]),
    tstairs: out(Vv(-1.2, 1.9, 13.27), Vv(2.2, 0.12, 12.4), [3.0, 0.3, 1.2], Vv(1, 0, 0)),
    tlanterns: out(Vv(-6.3, F2 + 1.3, 6.0), Vv(-5.2, F2, 6.0), [0.3, 0.5, 3.0]),
    tplanters: out(Vv(-4.1, F2 + 1.15, 8.0), Vv(-5.2, F2, 8.0), [0.35, 0.4, 3.0]),
    tunder: out(Vv(-5.2, F2 - 0.6, 7.0), Vv(-2.6, 0, 7.0), [2.2, 0.1, 4.0]),
    tneon: out(Vv(-3.95, F2 - 0.1, 9.5), Vv(-1.6, 0, 9.5), [0.1, 0.8, 1.4], Vv(0, 1, 0)),
    tcanopy: out(Vv(-5.2, F2 + 2.45, 7.0), Vv(-5.2, F2, 5.4), [2.4, 0.1, 3.0]),
    tbamboo: out(Vv(-6.3, F2 + 1.0, 2.0), Vv(-5.2, F2, 2.8), [0.4, 1.8, 1.0]),
    twisteria: out(Vv(-4.0, F2 + 0.6, 6.0), Vv(-5.0, F2, 6.0), [0.3, 1.2, 3.0]),
  })[id] || null;
});
