/* ================= Chapter 3: out the window ================= */
const YT = { x: 3.8, z: -1.0 }; // yatai cart centre (alley mouth), counter faces the street
function buildYatai() {
  reseed(3003); clearAnchors('yatai'); clearTag('yatai'); const g = part('yatai'); if (S.ch < 3) return;
  const ch = new Chunk('yatai', 'alley'), em = new Chunk('yataiEm', 'alley', { emis: true }); const x = YT.x, z = YT.z;
  // cart body + wheels
  ch.box(1.2, 0.85, 1.1, C.cedar, x, 0.55, z); ch.box(1.3, 0.06, 1.2, C.cedarL, x, 1.0, z); for (let i = 0; i < 6; i++) ch.box(0.02, 0.8, 0.012, C.cedarD, x - 0.55 + i * 0.22, 0.55, z + 0.556);
  for (const sx of [-0.62, 0.62]) { ch.torus(0.24, 0.035, 10, C.cedarD, x + sx, 0.26, z + 0.2, 0, Math.PI / 2, 0); ch.cyl(0.04, 0.04, 0.08, 6, C.iron, x + sx, 0.26, z + 0.2, 0, 0, Math.PI / 2); }
  for (const [sx, sz] of [[-0.58, -0.5], [0.58, -0.5], [-0.58, 0.5], [0.58, 0.5]]) ch.box(0.06, 1.25, 0.06, C.cedarD, x + sx, 1.62, z + sz);
  ch.box(1.5, 0.06, 1.4, 0x3a3e46, x, 2.27, z, 0.12); for (let i = 0; i < 8; i++) ch.box(0.17, 0.04, 1.42, 0x2a2c31, x - 0.65 + i * 0.185, 2.31, z, 0.12);
  // menu strip + pan + brazier + shaker corner
  ch.box(1.2, 0.18, 0.02, 0xefe4cc, x, 2.12, z + 0.53); ch.cyl(0.18, 0.2, 0.14, 12, 0x3a3e46, x - 0.3, 1.1, z - 0.2); ch.cyl(0.2, 0.17, 0.05, 14, 0x7a4a32, x - 0.3, 1.2, z - 0.2); ch.bar([x - 0.3, 1.22, z - 0.2], [x - 0.3, 1.24, z - 0.6], 0.03, C.cedarD);
  em.cyl(0.14, 0.14, 0.02, 10, 0xff6a2a, x - 0.3, 1.18, z - 0.2);
  ch.box(0.36, 0.02, 0.3, C.steel, x + 0.33, 1.04, z - 0.15); ch.cyl(0.05, 0.045, 0.2, 10, C.steel, x + 0.45, 1.15, z - 0.2); ch.box(0.22, 0.18, 0.22, 0x9ab0b4, x + 0.25, 1.12, z - 0.25); // ice box
  for (let i = 0; i < 4; i++) ch.cyl(0.04, 0.035, 0.12, 8, 0xd8e8ee, x + 0.1 + i * 0.1, 1.09, z + 0.3);
  if (lv('yatainoren')) { P.noren(ch, x, 2.2, z + 0.62, 1.3, 0.42, 0xc2362b, 4); P.lantern(ch, x + 0.75, 1.9, z + 0.6, 0, 0.8); P.lanternGlow(em, x + 0.75, 1.9, z + 0.6, 0xff5030, 0.8); tagA(anchor(x + 0.75, 1.8, z + 1.2, 0xff6a3a, 1.2, 4, ['alley', 'street'], 0.3), 'yatai'); }
  if (lv('pan2')) { ch.cyl(0.18, 0.2, 0.14, 12, 0x3a3e46, x - 0.3, 1.1, z + 0.25); ch.cyl(0.2, 0.17, 0.05, 14, 0x7a4a32, x - 0.3, 1.2, z + 0.25); em.cyl(0.14, 0.14, 0.02, 10, 0xff6a2a, x - 0.3, 1.18, z + 0.25); }
  em.box(1.2, 0.03, 0.03, 0xffd8a0, x, 2.2, z + 0.55); tagA(anchor(x, 1.9, z + 0.4, 0xffc890, 1.6, 4, ['alley', 'street'], 0.25), 'yatai'); tagA(anchor(x - 0.3, 1.3, z - 0.2, 0xff6a2a, 0.8, 2, ['alley'], 0.3), 'yatai');
  neon('ほうじ茶', x - 0.62, 1.6, z + 0.62, Math.PI / 2, 0.55, 'amber', { vertical: true, px: 80, ds: true, k: 2.2, lit: 0.4, group: g }, ['alley', 'street']);
  addBuilt(g, ch); addBuilt(g, em); blob(g, x, 0.06, z, 1.6, 1.4);
  solid(x - 0.62, x + 0.62, 0, 2.3, z - 0.58, z + 0.58, 'yatai');
  // the dumpster moves deeper; drop zone deeper
}
function railYatai() { return { base: Vv(YT.x + 0.5, 1.95, YT.z - 0.62), ry: Math.PI, dx: -0.11, key: 'yatai' }; }
function railTerrace() { return { base: Vv(-3.3, F2 + 1.9, 0.6), ry: Math.PI, dx: -0.11, key: 'terrace' }; }
function buildTerrace() {
  reseed(3103); clearAnchors('terrace'); clearTag('terrace'); const g = part('terrace'); if (S.ch < 3) return;
  const ch = new Chunk('terrace', 'street'), em = new Chunk('terraceEm', 'street', { emis: true });
  // deck from the balcony along the soba facade onto the bridge
  for (let x = -6.4; x < -2.5; x += 0.2) ch.box(0.19, 0.05, 0.88, new THREE.Color(C.cedar).multiplyScalar(srange(0.85, 1.05)).getHex(), x + 0.1, F2 - 0.017, 0.54); // sits 8 mm proud of the bridge slab and stops short of its edge (no z-fighting)
  ch.box(3.9, 0.2, 0.9, 0x4a4e56, -4.45, F2 - 0.15, 0.55); P.railing(ch, -6.4, 1.0, -6.4, 0.1, F2, 1.0, C.iron);
  // street-side railing where the deck isn't backed by the bridge, joining the balcony's front rail
  P.railing(ch, -4.0, 0.98, -2.75, 0.98, F2, 1.0, C.iron); P.railing(ch, -2.75, 0.98, -2.65, 1.2, F2, 1.0, C.iron);
  // tables + stools on the bridge
  for (const z of [1.7, 3.0, 4.3]) { ch.cyl(0.32, 0.32, 0.04, 12, C.cedarL, -5.2, F2 + 0.74, z); ch.cyl(0.04, 0.04, 0.72, 6, C.iron, -5.2, F2 + 0.37, z); P.stool(ch, -5.75, F2, z, 0.5); P.stool(ch, -4.65, F2, z, 0.5); P.yunomi(ch, -5.25, F2 + 0.76, z + 0.1); }
  if (lv('heaters')) for (const z of [2.35, 3.65]) { ch.cyl(0.06, 0.12, 2.0, 8, C.steel, -6.1, F2 + 1.0, z); ch.cone(0.32, 0.2, 10, C.steel, -6.1, F2 + 2.1, z); em.cyl(0.08, 0.08, 0.5, 8, 0xff6a2a, -6.1, F2 + 1.7, z); tagA(anchor(-5.7, F2 + 1.7, z, 0xff7a3a, 1.1, 3.2, ['street'], 0.3), 'terrace'); }
  if (lv('strings')) for (let k = 0; k < 4; k++) { const z0 = 0.5 + k * 1.6; for (let i = 0; i <= 10; i++) { const t = i / 10; const x = lerp(-6.4, -4.0, t), y = F2 + 2.3 - Math.sin(t * Math.PI) * 0.35; em.ball(0.026, new THREE.Color(spick([0xffd090, 0xffb35c, 0x33e4ff, 0xff7aa8])).multiplyScalar(0.8).getHex(), x, y - 0.05, z0 + 0.6, 1); ch.cyl(0.012, 0.012, 0.04, 6, 0x111111, x, y - 0.015, z0 + 0.6); } ch.cable([-6.4, F2 + 2.3, z0 + 0.6], [-4.0, F2 + 2.3, z0 + 0.6], 0.35, 0.012, 0x111111, 10); tagA(anchor(-5.2, F2 + 2.0, z0 + 0.6, 0xffc080, 0.7, 2.5, ['street'], 0.3), 'terrace'); }
  // string-light posts on the bridge parapets (one per string), out of the walkway and clear of the stair gate
  for (const z of [1.1, 2.7, 4.3, 5.9]) { ch.box(0.06, 2.4, 0.06, C.iron, -6.36, F2 + 1.2, z); ch.box(0.06, 2.4, 0.06, C.iron, -4.04, F2 + 1.2, z); }
  ch.cyl(0.01, 0.01, 1.2, 6, C.brass, -3.3, F2 + 1.98, 0.6, 0, 0, Math.PI / 2);
  tagA(anchor(-5.2, F2 + 1.8, 2.5, 0xffc890, 1.0, 4, ['street'], 0.3), 'terrace');
  addBuilt(g, ch); addBuilt(g, em);
  zoneFlat(-6.3, -2.5, 0.12, 1.12, F2, 'terrace'); // overlaps the bridge floor (z 1.05+) so there's no gap to get stuck on clearTag('bridgeEnd'); clearTag('balcL');
  for (const z of [1.7, 3.0, 4.3]) solidC(-5.2, z, 0.62, 0.62, F2, F2 + 0.8, 'terrace');
  // stools are solid while someone sits on them; empty ones can be clambered over (blockedAt / climbAt)
  [1.7, 3.0, 4.3].forEach((z, i) => { for (const [x, sd] of [[-5.75, 'L'], [-4.65, 'R']]) { solidC(x, z, 0.4, 0.4, F2, F2 + 0.5, 'terrace'); SOL[SOL.length - 1].seat = 't' + i + sd; } });
}
function buildPopup() {
  const g = part('popup'); if (!(S.flags.popup && !lv('koi'))) return;
  const ch = new Chunk('popup', 'far'), em = new Chunk('popupEm', 'far', { emis: true }); ch.box(2.4, 2.4, 1.2, 0x1a1c22, 7, 1.32, 13.0); em.box(2.2, 0.8, 0.02, 0xff3d9a, 7, 2.2, 12.39); em.box(1.6, 1.0, 0.02, 0x3a1030, 7, 1.0, 12.39);
  addBuilt(g, ch); addBuilt(g, em); neon('KAIUN BREW ¥99', 7, 2.75, 12.36, Math.PI, 0.3, 'mag', { px: 64, k: 2.6, lit: 0.6, group: g, flicker: true }, ['street', 'far']);
}
// before the chapter-3 deck: the balcony's west rail is closed, the bridge's shop end is barred, and the stub landing between them
// (where Gen-san's deck goes) holds the ward's 立入禁止 barrier facing the shop, a cone, a dead plant in a cracked pot and a knocked-over chair
function buildPreDeck() {
  const g = part('preDeck'); if (S.ch >= 3) return;
  reseed(3013); const T = bridgeTex(), ch = new Chunk('preDeck', 'street'), tq = new TQ('street'), rust = 0x5e3826, bx = -3.9; P.railing(ch, -2.65, 0.05, -2.65, 1.2, F2, 1.0, 0x2a2c31);
  ch.box(3.7, 0.1, 0.9, 0x44474c, -4.55, F2 - 0.05, 0.55);
  // end rail across the bridge: rusted frame with a striped board, facing the deck
  for (const x of [-6.3, -5.2, -4.1]) ch.box(0.05, 1.05, 0.05, rust, x, F2 + 0.525, 1.04);
  ch.bar([-6.35, F2 + 1.02, 1.04], [-4.05, F2 + 1.02, 1.04], 0.045, rust, 8); ch.bar([-6.35, F2 + 0.15, 1.04], [-4.05, F2 + 0.15, 1.04], 0.035, rust, 8);
  ch.box(2.12, 0.38, 0.03, 0x1e1c1a, -5.2, F2 + 0.62, 1.04); for (const [z, ry] of [[1.057, 0], [1.023, Math.PI]]) tq.q(T.hazard, -5.2, F2 + 0.62, z, 2.1, 0.36, 0, ry, [0, 0, 1.45, 1]);
  // the barrier: striped hazard board on a rusted frame, the red sign bolted above it
  for (const z of [0.14, 0.96]) ch.box(0.05, 1.46, 0.05, rust, bx, F2 + 0.73, z);
  ch.bar([bx, F2 + 1.44, 0.12], [bx, F2 + 1.44, 0.98], 0.04, rust, 8); ch.bar([bx, F2 + 0.2, 0.12], [bx, F2 + 0.2, 0.98], 0.035, rust, 8);
  ch.box(0.03, 0.46, 0.84, 0x1e1c1a, bx, F2 + 0.7, 0.55); for (const s of [-1, 1]) tq.q(T.hazard, bx + s * 0.017, F2 + 0.7, 0.55, 0.82, 0.44, 0, s * Math.PI / 2, [0, 0, 0.47, 1]);
  ch.box(0.03, 0.31, 0.8, 0x2a2624, bx, F2 + 1.19, 0.55); tq.q(T.sign, bx + 0.017, F2 + 1.19, 0.55, 0.76, 0.28, 0, Math.PI / 2);
  for (const z of [0.3, 0.8]) for (const y of [F2 + 1.08, F2 + 1.3]) ch.ball(0.012, 0x3a2a22, bx + 0.02, y, z);
  // on the landing: a cone, a cracked white pot with a dead bare-twig plant, a white plastic chair on its side with a snapped leg
  P.cone(ch, -2.92, F2, 0.8);
  { const x = -3.58, z = 0.3, w = 0xd6d3cb; ch.cyl(0.14, 0.11, 0.26, 10, w, x, F2 + 0.13, z); ch.torus(0.135, 0.012, 10, 0xc6c2b8, x, F2 + 0.26, z, Math.PI / 2); ch.cyl(0.125, 0.125, 0.02, 10, 0x2a2018, x, F2 + 0.235, z);
    ch.box(0.004, 0.17, 0.012, 0x2a2826, x + 0.128, F2 + 0.14, z + 0.03, 0, 0, 0.25); ch.box(0.004, 0.08, 0.01, 0x2a2826, x + 0.12, F2 + 0.08, z - 0.02, 0, 0, -0.5); ch.box(0.05, 0.03, 0.03, 0x3a3632, x + 0.11, F2 + 0.255, z - 0.06);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + srand(), L = srange(0.3, 0.6), lean = srange(0.15, 0.45), b = [x + Math.cos(a) * 0.03, F2 + 0.24, z + Math.sin(a) * 0.03], e = [b[0] + Math.cos(a) * L * lean, b[1] + L, b[2] + Math.sin(a) * L * lean];
      ch.bar(b, e, 0.012, 0x4a3a2c); for (let k = 0; k < 2; k++) { const t = srange(0.4, 0.8), p = [lerp(b[0], e[0], t), lerp(b[1], e[1], t), lerp(b[2], e[2], t)], a2 = a + srange(-1.2, 1.2), l2 = L * srange(0.25, 0.45); ch.bar(p, [p[0] + Math.cos(a2) * l2 * 0.6, p[1] + l2 * 0.7, p[2] + Math.sin(a2) * l2 * 0.6], 0.007, 0x54412f); } } }
  atR(ch, -3.22, F2 + 0.235, 0.6, 0, 1.3, Math.PI / 2, () => { const w = 0xd9d7cf; ch.box(0.44, 0.035, 0.42, w, 0, 0.42, 0); ch.box(0.44, 0.36, 0.03, w, 0, 0.64, -0.2, -0.12);
    for (const [sx, sz, L] of [[-0.19, -0.17, 1], [0.19, -0.17, 1], [-0.19, 0.17, 1], [0.19, 0.17, 0.35]]) ch.bar([sx, 0.41, sz], [lerp(sx, sx * 1.12, L), 0.41 - 0.41 * L, lerp(sz, sz * 1.12, L)], 0.03, w);
    for (const sx of [-0.21, 0.21]) { ch.box(0.03, 0.03, 0.38, w, sx, 0.6, 0); ch.box(0.03, 0.18, 0.03, w, sx, 0.51, 0.17); } });
  addBuilt(g, ch); tq.build(g);
}

HOOK.upper.push(() => { buildPreDeck(); buildYatai(); buildTerrace(); buildPopup(); balconyZones(); });
function balconyZones() { clearTag('balcony'); if (S.ch >= 2) { zoneFlat(0.8, 1.9, -0.26, 0.06, F2, 'balcony'); zoneFlat(-2.5, 2.5, 0.05, 1.15, F2, 'balcony'); } }
HOOK.waypoints.push(() => {
  // move drop zone + route through the gap beside the cart
  WP.alleyMouth.p.set(2.95, 0.06, 0.3); wp('alleyGap', 2.95, 0.06, -2.2); unlinkPair('drop', 'alleyMouth'); unlinkPair('alleyOut', 'drop'); WP.drop.p.set(3.5, 0.06, -7.75); wp('alleyW', 3.66, 0.06, -5.7);
  link('alleyMouth', 'alleyGap', 'alleyOut'); link('alleyGap', 'alleyW', 'drop'); link('alleyOut', 'alleyW');
  wp('yt', YT.x, 0.06, YT.z - 0.95); link('alleyOut', 'yt'); link('alleyGap', 'yt');
  for (const [i, x, z] of [[0, 3.8, 0.9], [1, 3.8, 1.6], [2, 3.0, 1.6]]) { wp('tg' + i, x, 0.12, z); link('tg' + i, 'sE1'); }
  // bridge from the far side
  wp('bs0', 1.2, 0.12, 13.3); wp('bs1', -4.0, F2, 13.3); wp('br1', -5.2, F2, 12.6); wp('br2', -5.2, F2, 5.2); link('fM', 'bs0', 'bs1', 'br1', 'br2');
  const tz = [1.7, 3.0, 4.3]; tz.forEach((z, i) => { wp('ta' + i, -5.2, F2, z + 0.55); wp('t' + i + 'L', -5.75, F2, z); wp('t' + i + 'R', -4.65, F2, z); link('br2', 'ta' + i); link('ta' + i, 't' + i + 'L'); link('ta' + i, 't' + i + 'R'); if (i) link('ta' + i, 'ta' + (i - 1)); });
  wp('deck', -3.3, F2, 0.55); link('balOut', 'deck', 'ta0');
});
function unlinkPair(a, b) { if (WP[a] && WP[b]) { WP[a].n.delete(b); WP[b].n.delete(a); } }
HOOK.seats.push(s => {
  if (S.ch < 3) return; for (let i = 0; i < 3; i++) s.push({ id: 'tg' + i, node: 'tg' + i, yaw: Math.PI, kind: 'stand', sp: 'togo' });
  for (let i = 0; i < 3; i++) { s.push({ id: 't' + i + 'L', node: 't' + i + 'L', yaw: Math.PI / 2, kind: 'stool', sp: 'terrace' }); s.push({ id: 't' + i + 'R', node: 't' + i + 'R', yaw: -Math.PI / 2, kind: 'stool', sp: 'terrace' }); }
});
/* ---------- roaster station ---------- */
function startRoaster() {
  if (S.leaves < 2) { toast('You need 2 leaf portions to roast a batch. Order leaves on Kumo Supply.'); return; }
  const x = YT.x - 0.3, z = YT.z - 0.2, beat = 0.65, win = SET.relaxed ? 0.18 : 0.12;
  const st = { id: 'roast', title: '焙烙 Hōroku roasting', si: 0, glance: true, cam: { pos: Vv(YT.x - 0.1, 1.72, YT.z - 1.15), at: Vv(x, 1.16, z), fov: 0.82 } };
  let color = 0, scorch = 0, t0 = time, lastBeat = -1, tossed = false; const g = new THREE.Group(); scene.add(g); st.g = g;
  const leaves = []; for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.014), new THREE.MeshLambertMaterial({ color: 0x5f8a3a })); m.position.set(x + rand(-0.12, 0.12), 1.235, z + rand(-0.12, 0.12)); m.rotation.y = rand(0, 6); g.add(m); leaves.push({ m, v: 0, y: 1.235 }); }
  const led = ledPanel(200, 70, 0.07); led.m.position.set(x + 0.32, 1.32, z - 0.3); led.m.lookAt(st.cam.pos); g.add(led.m);
  const smoke = []; for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: 0xb8a890, transparent: true, opacity: 0, depthWrite: false })); g.add(s); smoke.push({ s, t: 9 }); }
  const draw = () => { const L = led, c = L.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, L.w, L.h); const gr = c.createLinearGradient(10, 0, L.w - 10, 0); gr.addColorStop(0, '#6f9e2a'); gr.addColorStop(0.7, '#8a5a2a'); gr.addColorStop(1, '#3a1e10'); c.fillStyle = gr; c.globalAlpha = 0.35; c.fillRect(10, 44, L.w - 20, 10); c.globalAlpha = 1; c.fillStyle = '#ffcf8f'; c.fillRect(10, 46, (L.w - 20) * Math.min(1, color), 6); c.fillStyle = '#ff5a4a'; c.fillRect(10, 58, (L.w - 20) * Math.min(1, scorch), 4); const ph = ((time - t0) % beat) / beat; c.font = `20px ${FONT_DOT}`; c.fillStyle = '#9affb0'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('ROAST ' + Math.round(color * 100) + '%', 8, 6); c.strokeStyle = '#33e4ff'; c.lineWidth = 3; c.beginPath(); c.arc(L.w - 26, 24, 6 + (1 - ph) * 12, 0, 7); c.stroke(); c.fillStyle = ph < 0.18 || ph > 0.82 ? '#9affb0' : '#33e4ff'; c.beginPath(); c.arc(L.w - 26, 24, 6, 0, 7); c.fill(); L.tex.needsUpdate = true; };
  st.steps = [{ label: 'Toss', hint: 'Toss the leaves on the beat: click (or Space) when the ring closes. Off-beat or missed tosses scorch them.', hintT: 'Tap the pad when the ring closes, on the beat.', pad: 'Toss',
    down() { const ph = (time - t0) % beat; const off = Math.min(ph, beat - ph); const bi = Math.round((time - t0) / beat); if (off <= win && bi !== lastBeat) { color += 0.075; lastBeat = bi; tossed = true; Snd.hit(1800, 1.5, 0.08, 0.08); for (const l of leaves) l.v = rand(0.6, 1.4); } else { scorch += 0.1; Snd.miss(); st.note = 'Off the beat.'; } },
    update(dt) { const bi = Math.floor((time - t0) / beat); if (bi > lastBeat + 1 && time - t0 > 1.5) { lastBeat = bi - 1; scorch += 0.05; } if (Math.floor((time - t0) / beat) !== st._tick) { st._tick = Math.floor((time - t0) / beat); Snd.tone(660, 'sine', 0.015, 0.05); }
      for (const l of leaves) { l.v -= 9.8 * dt * 0.4; l.y = Math.max(1.235, l.y + l.v * dt); if (l.y <= 1.235) l.v = 0; l.m.position.y = l.y; l.m.material.color.setRGB(lerp(0.37, 0.42, color) * (1 - scorch * 0.5), lerp(0.54, 0.22, color) * (1 - scorch * 0.5), lerp(0.23, 0.08, color)); }
      for (const s of smoke) { s.t += dt; if (s.t > 1.6 && Math.random() < 0.3) { s.t = 0; s.s.position.set(x + rand(-0.1, 0.1), 1.26, z + rand(-0.1, 0.1)); } const q = s.t / 1.6; s.s.position.y += dt * 0.3; s.s.scale.setScalar(0.06 + q * 0.25); s.s.material.opacity = q < 1 ? Math.sin(q * Math.PI) * (0.15 + color * 0.25) : 0; }
      draw(); if (color >= 1) nextStep(st); if (scorch >= 1) { st.note = 'Burnt. Most of the batch is ash.'; nextStep(st); } } }];
  st.finish = () => { const q = clamp(1 - scorch, 0.1, 1); const n = Math.round((lv('pan2') ? 20 : 10) * (q > 0.3 ? 1 : 0.3)); S.leaves -= 2; S.roasted += n; st.note = `${n} roasted portions. ${q > 0.75 ? 'A deep, even chestnut.' : q > 0.45 ? 'A little uneven.' : 'Smoky and scorched.'}`; stUI.hint.textContent = st.note; Snd.chime(); setTimeoutG(() => endStation(true), 900); };
  st.exit = () => scene.remove(g);
  startStation(st);
}
/* ---------- shaker station ---------- */
function startShaker(rid) {
  const R = RECIPES[rid]; if (R.roast && S.roasted < 1) { toast('You need roasted hōjicha. Roast a batch in the pan first.'); return; } if (!R.roast && S.leaves < 1) { toast('Out of tea leaves.'); return; } if (S.water < 0.5) { toast('The barrels are dry.'); return; }
  const x = YT.x + 0.33, z = YT.z - 0.15; const sc = []; const add = v => sc.push(clamp(v, 0, 1));
  const st = { id: 'shake', title: `${R.jp} ${R.name}`, si: 0, glance: true, cam: { pos: Vv(YT.x + 0.2, 1.7, YT.z - 1.15), at: Vv(x, 1.12, z), fov: 0.82 } };
  const g = new THREE.Group(); scene.add(g); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xc8d0d8, metalness: 0.7, roughness: 0.3 })); sh.position.set(x, 1.15, z); g.add(sh);
  let ice = 0, fill = 0, capped = false, beats = 0, t0 = 0, hits = 0; const bp = 0.45, win = SET.relaxed ? 0.16 : 0.11;
  const led = ledPanel(160, 60, 0.05); led.m.position.set(x - 0.2, 1.22, z - 0.25); led.m.lookAt(st.cam.pos); g.add(led.m);
  const L = (t, v, band) => { const c = led.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, 160, 60); c.font = `18px ${FONT_DOT}`; c.fillStyle = '#9affb0'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(t, 6, 4); c.fillStyle = 'rgba(51,228,255,.2)'; c.fillRect(8, 38, 144, 10); if (band) { c.fillStyle = 'rgba(127,255,150,.55)'; c.fillRect(8 + band[0] * 144, 36, (band[1] - band[0]) * 144, 14); } c.fillStyle = '#ffb35c'; c.fillRect(8, 40, 144 * clamp(v, 0, 1), 6); led.tex.needsUpdate = true; };
  st.steps = [
    { label: 'Ice', hint: 'Three scoops of ice. Click three times.', pad: () => `Scoop ice (${ice}/3)`, down() { ice++; Snd.hit(3000, 3, 0.1, 0.05); const cube = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.7 })); cube.position.set(x + rand(-0.02, 0.02), 1.08 + ice * 0.02, z); g.add(cube); if (ice >= 3) { add(1); nextStep(st); } }, update() { L('ICE ' + ice + '/3', ice / 3); } },
    { label: 'Pour', hint: 'Hold to pour the tea in. Let go at the line.', pad: () => ST.padDown ? 'Pouring…' : 'Hold to pour', holdPad: true, down() { Snd.loopStart('pourL', 1000, 1, 0.06); }, up() { Snd.loopStop('pourL'); if (fill < 0.08) return; add(1 - Math.abs(fill - 0.86) / wide(0.35)); nextStep(st); }, update(dt) { if (ST.padDown) fill = Math.min(1.1, fill + dt * 0.5); L('FILL', fill / 1.1, [0.78 / 1.1, 0.94 / 1.1]); } },
    { label: 'Cap', hint: 'Cap the shaker.', pad: 'Cap it', down() { capped = true; Snd.knock(); add(1); nextStep(st); } },
    { label: 'Shake', hint: 'Shake to the 4-beat: click (or Space) on every tick. Eight shakes.', hintT: 'Tap on every tick. Eight shakes.', pad: () => `Shake (${beats}/8)`, start() { t0 = time; }, down() { const ph = (time - t0) % bp; const off = Math.min(ph, bp - ph); beats++; if (off <= win) { hits++; Snd.hit(2200, 2, 0.12, 0.06); } else Snd.hit(900, 2, 0.08, 0.06); sh.position.y = 1.15 + 0.05; if (beats >= 8) { add(hits / 8); nextStep(st); } }, update(dt) { if (Math.floor((time - t0) / bp) !== st._tk) { st._tk = Math.floor((time - t0) / bp); Snd.tone(st._tk % 4 ? 660 : 990, 'sine', 0.02, 0.05); } sh.position.y = damp(sh.position.y, 1.15, 12, dt); sh.rotation.z = Math.sin(time * 20) * 0.1 * (sh.position.y - 1.15) * 20; L('SHAKE ' + beats + '/8', ((time - t0) % bp) / bp); } },
  ];
  st.finish = () => { const avg = sc.reduce((a, v) => a + v, 0) / sc.length; const stars = avg >= 0.8 ? 3 : avg >= 0.5 ? 2 : 1; if (R.roast) S.roasted--; else S.leaves--; S.water -= 0.5; if (stars === 3) S.mastery[R.id] = Math.min(MASTER_N, (S.mastery[R.id] || 0) + 1); S.stats.brews++; Snd.chime(); setTimeoutG(() => endStation({ stars }), 600); };
  st.exit = res => { scene.remove(g); if (res) holdItem({ kind: 'tray', n: 2, rid, stars: res.stars }); };
  startStation(st);
}
function shakerChooser() { if (player.hold) { toast('Your hands are full.'); return; } const rs = [RID.iced, RID.latte]; const open = {}; CUST.forEach(c => { if (c.state === 'order') open[c.rid] = (open[c.rid] || 0) + 1; });
  openPanel(`<h2>Shaker</h2><p class="sub">2 cups per shake · ${S.leaves} leaves · ${S.roasted} roasted portions</p><div style="display:flex;flex-direction:column;gap:8px">${rs.map(r => `<button class="btn ghost" data-r="${r}" style="display:flex;justify-content:space-between;padding:12px 14px"><span>${RECIPES[r].jp} ${RECIPES[r].name}</span><span style="color:var(--amber2);font-size:12.5px">${open[r] ? open[r] + ' waiting' : ''}</span></button>`).join('')}</div>`, box => box.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { closePanel(); startShaker(+b.dataset.r); })); }
HOOK.init.push(() => {
  removeIA(/^(roastIA|shakeIA)/); if (S.ch < 3) return;
  addIA({ id: 'roastIA', box: [YT.x - 0.3, 1.25, YT.z - 0.2, 0.5, 0.3, 0.5], name: () => `Hōroku pan · ${S.roasted} roasted`, verb: 'Roast a batch', act: () => { if (player.hold) { toast('Your hands are full.'); return; } startRoaster(); } });
  addIA({ id: 'shakeIA', box: [YT.x + 0.33, 1.15, YT.z - 0.15, 0.4, 0.3, 0.4], name: 'Shaker', verb: 'Make iced tea', act: shakerChooser });
});
// kettle: hōjicha uses roasted stock instead of leaves
/* ---------- renovation: yatai + terrace ---------- */
RENO[2] = {
  pos: Vv(-2.0, F2, 0.55), yaw: Math.PI / 2, task: 'Fix the last deck board with Gen-san', target: Vv(-4.4, F2, 0.55),
  build() { S.ch = 3; S.flags.popup = 1; S.flags.renoOut = 1; buildUpper(); buildFacade(); rebakeStreet(); initWaypoints(); for (const f of HOOK.waypoints) f(); refreshSeats(); for (const f of HOOK.init) f(); },
  crew() { const g = crewPut('gen', -4.8, F2, 0.55, -Math.PI / 2); g.pose = 'crouch'; const t = crewPut('tomo', 3.0, 0.06, -2.2, Math.PI); },
  intro: [{ w: 'narr', t: 'Kaiun\'s hoarding closed the footbridge\'s near stairs months ago, so its landing sits empty outside your balcony. Gen-san has decked a walkway onto it. Tomo has wheeled a yatai cart into the alley mouth, roof and all.' }, { w: 'gen', t: 'One more board. The bridge belongs to the city, so we don\'t tell the city.' }],
  job(done) { startJob('bolt', { title: 'Bolt the last deck board', cam: { pos: Vv(-3.6, F2 + 1.6, 0.55), at: Vv(-4.4, F2, 0.55) }, points: [-4.9, -4.6, -4.3, -4.0].map(x => Vv(x, F2 + 0.02, 0.55)), boltRot: 0, cancel: false, done }); },
  outro: [{ w: 'gen', t: 'Now people can drink tea over the traffic. Chiyo would have hated it. Then loved it.' }, { w: 'tomo', t: 'And the cart\'s yours! Roast hōjicha in the pan, shake iced tea, sell it to-go through the alley.' }],
};
BEATS.c3_open = {
  task: () => gateMet() ? 'Start the renovation at the holo-model table' : `Save ${yen(160000)} and stock 30 roasted portions · ${yen(S.yen)} · ${S.roasted}/30`, target: () => gateMet() ? Vv(1.2, 1.1, -6.35) : null,
  enter() { S.flags.open = 1; },
  update() {
    if (!S.flags.kuroda3 && S.stats.served >= (S.flags.c3base || 0) + 5 && !DLG.active && !player.focus) { S.flags.kuroda3 = 1; kurodaVisit2([{ w: 'kuroda', t: 'You\'ll have noticed our little kiosk across the street. Ninety-nine yen a cup.' }, { w: 'kuroda', t: 'Your neighbours will notice too. Price is a very loud sign.' }], () => toast('Kaiun\'s pop-up is pulling customers away. Something bigger on your facade would pull them back: the koi hologram.')); }
    if (!S.flags.meet_hana && S.stats.served >= (S.flags.c3base || 0) + 12 && !DLG.active) { S.flags.meet_hana = 1; const c = spawnCustomer({ rid: RID.hoji, look: { name: 'Hana', skin: 0xe3b08a, hair: 0x3a2a1e, hairStyle: 'bob', top: 0x4f7d48, bottom: 0x3a3d48, outfit: 'jacket', boots: true, plantClips: true, umbrella: true, umbCol: 0x4f7d48, h: 0.97 }, reg: 'hana', name: 'Hana', onSeat: cc => say([{ w: 'hana', t: 'Sorry, I\'m dripping. So are they. These seedlings are from the university greenhouse. It flooded last week.' }, { w: 'hana', t: 'Hōjicha, please. And maybe a dry corner for the tray?' }], null, () => cc.n.pos.clone().add(Vv(0, 1.3, 0))), onServed: cc => setTimeoutG(() => say([{ w: 'hana', t: 'Your third floor faces south, right? Under all this rain, it\'s the closest thing to sun on the block.' }, { w: 'hana', t: 'If you ever want a garden up there, call me. I mean it.' }], null, () => cc.n.pos.clone().add(Vv(0, 1.3, 0))), 800) }); if (c) c.patMax *= 2; }
  },
};
HOOK.chapter.push(n => { if (n === 3) { S.flags.c3base = S.stats.served; addMsg('tomo', 'Cart tip: roast a batch first (2 leaves = 10 portions). Hōjicha at the kettle uses roasted stock. Iced drinks come from the shaker on the cart.'); goBeat('c3_open'); } });
HOOK.apply.push(id => { if (id === 'koi') { buildPopup(); buildFacade(); toast('A koi windsock streams from the corner bracket. Across the street, the Kaiun kiosk looks small.'); } if (UID[id].space === 'terrace') buildTerrace(); if (id === 'yatainoren' || id === 'pan2') { buildYatai(); for (const f of HOOK.init) f(); } rebakeStreet(); });
HOOK.upos.push(id => { const out = (spot, stand, size, axis) => ({ spot, cam: { pos: stand.clone().add(Vv(0, 1.55, 0)), at: spot }, size, axis });
  return ({ heaters: out(Vv(-6.1, F2 + 1.0, 3.0), Vv(-5.0, F2, 3.0), [0.3, 2.0, 0.3], Vv(0, 0, 1)), strings: out(Vv(-5.2, F2 + 2.2, 2.0), Vv(-5.2, F2, 3.6), [2.4, 0.2, 0.2]), yatainoren: out(Vv(YT.x, 2.0, YT.z + 0.62), Vv(YT.x, 0.12, YT.z + 1.9), [1.3, 0.4, 0.05]), pan2: out(Vv(YT.x - 0.3, 1.2, YT.z + 0.25), Vv(YT.x - 0.1, 0.06, YT.z - 1.15), [0.4, 0.2, 0.4]), koi: out(Vv(-2.62, F2 + 1.8, 0.58), Vv(-1.6, 0.12, 3.0), [0.35, 1.1, 0.35], Vv(0, 1, 0)) })[id] || null; });
// koi hologram on the facade
let KOI = null;
function buildKoi() { if (KOI) { scene.remove(KOI.m); KOI = null; } return; // windsock: buildFacade
 const tex = canvasTex(128, 256, () => { }); const m = new THREE.Mesh(gPlaneIdx(), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(2, 2, 2), side: THREE.DoubleSide })); m.position.set(-1.6, 6.2, 0.35); m.scale.set(1.6, 3.2, 1); m.layers.enable(1); scene.add(m); KOI = { m, tex }; anchor(-1.6, 6, 1.4, 0xff7a3a, 1.8, 6, ['street', 'facade'], 0.3).tag = 'facade'; }
HOOK.upper.push(buildKoi);
HOOK.update.push(dt => { if (!KOI || frameN % 4) return; const c = KOI.tex.userData.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, 128, 256); const t = time; for (let k = 0; k < 2; k++) { const y = mod(256 - (t * 30 + k * 128), 300) - 20, x = 64 + Math.sin(t * 1.3 + k * 2) * 26; c.save(); c.translate(x, y); c.rotate(Math.sin(t * 2 + k) * 0.3); c.fillStyle = k ? '#ffb35c' : '#ff5a3a'; c.shadowColor = c.fillStyle; c.shadowBlur = 14; c.beginPath(); c.ellipse(0, 0, 13, 34, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(0, 30); c.lineTo(-14, 52 + Math.sin(t * 8) * 4); c.lineTo(14, 52 - Math.sin(t * 8) * 4); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-4, -12, 5, 8, 0, 0, 7); c.fill(); c.restore(); } c.strokeStyle = 'rgba(51,228,255,.25)'; for (let y = 0; y < 256; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.stroke(); } KOI.tex.needsUpdate = true; });
HOOK.serve.push(c => { if (c.seat && c.seat.sp === 'togo') { /* to-go: they leave right away */ } });

