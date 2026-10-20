/* ================= the tea counter: one warmed section per tea, cups cool slowly ================= */
// S.store = { rid: [{ stars, w }] }   w = warmth (hot teas) or chill (iced), 1 fresh .. 0 gone
const TEA = { g: null, built: '', plaques: {}, ia: [] , lastSig: '' };
const TEA_X0 = -2.36, TEA_W = 0.33, TEA_Z = -3.2, TEA_Y = 1.035;
const teaCap = () => lv('tearack') ? 14 : 8;
const isIced = rid => RECIPES[rid] && RECIPES[rid].st === 'shaker';
// tea keeps: no cooling, no quality loss (it only caused frustration)
function teaStore() { S.store = S.store || {}; if (S.pass && S.pass.length) { for (const p of S.pass) { (S.store[p.rid] = S.store[p.rid] || []).push({ stars: p.stars, w: 0.75 }); } S.pass = []; } return S.store; }
function teaSlots() { return unlockedRecipes().map(r => RID[r.id]); }
function teaSlotX(rid) { const i = teaSlots().indexOf(rid); return TEA_X0 + (i + 0.5) * TEA_W; }
function buildTeaCounter() {
  if (TEA.g) { scene.remove(TEA.g); TEA.g.traverse(o => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose(); }); TEA.g = null; } removeIA(/^tea_/); TEA.plaques = {}; if (!S.flags.counterBuilt) return;
  const g = new THREE.Group(); scene.add(g); TEA.g = g; teaStore(); const sv = seedS; reseed(4417);
  const ch = new Chunk('teaCounter', 'g0'), gl = new Chunk('teaCounterGloss', 'g0', { gloss: true }); const slots = teaSlots();
  slots.forEach((rid, i) => {
    const cx = TEA_X0 + (i + 0.5) * TEA_W;
    teaTrayDressing(ch, gl, rid, cx); // lacquer tray, canister, leaf dish, back of the name card
    const pm = teaCardMesh(rid, cx); g.add(pm); TEA.plaques[rid] = pm;
    TEA.ia.push(addIA({ id: 'tea_' + rid, box: [cx, TEA_Y + 0.06, TEA_Z, TEA_W - 0.02, 0.16, 0.2], reach: 2.2, name: () => teaLabel(rid), verb: () => teaVerb(rid), cond: () => !!S.flags.counterBuilt, act: () => teaAct(rid) }));
  });
  const m = ch.build(); if (m) g.add(m); const mg = gl.build(); if (mg) g.add(mg);
  TEA.cups = new THREE.Group(); g.add(TEA.cups); TEA.built = slots.join(','); TEA.lastSig = ''; seedS = sv; refreshTeaCups();
}
function refreshTeaCups() {
  if (!TEA.cups) return; const st = teaStore(); const sig = teaSlots().map(rid => rid + ':' + (st[rid] || []).length).join('|'); if (sig === TEA.lastSig) return; TEA.lastSig = sig;
  while (TEA.cups.children.length) TEA.cups.remove(TEA.cups.children[0]);
  for (const rid of teaSlots()) { const cups = st[rid] || []; const cx = teaSlotX(rid); cups.slice(0, 4).forEach((c, i) => { const cp = cupObj(rid); cp.position.set(cx - 0.105 + i * 0.07, TEA_Y + 0.016, TEA_Z + 0.015); TEA.cups.add(cp); });
    const pm = TEA.plaques[rid]; if (pm) { const old = pm.material.map; pm.material.map = plaqueTex(rid); pm.material.needsUpdate = true; if (old) old.dispose(); } }
}
function teaLabel(rid) { const cups = teaStore()[rid] || []; const r = RECIPES[rid]; return cups.length ? `${r.name} · ${cups.length} cup${cups.length > 1 ? 's' : ''}` : `${r.name} section · empty`; }
function teaVerb(rid) { const h = player.hold; if (h && h.kind === 'tray') return h.rid === rid ? 'Set the cups here' : `Set the ${RECIPES[h.rid].name} down first (Q)`; return (teaStore()[rid] || []).length ? 'Pick up' : 'Empty'; }
function teaAct(rid) { const h = player.hold; if (h && h.kind === 'tray') { stowTray(); return; } if (h) { toast('Your hands are full.'); return; } takeTea(rid); }
// put the held tray into its own section (anywhere behind the counter, or from the kettle)
function stowTray(quiet) {
  const h = player.hold; if (!h || h.kind !== 'tray' || h.n <= 0) return false; const st = teaStore(); const arr = st[h.rid] = st[h.rid] || [];
  const room = teaCap() - arr.length; if (room <= 0) { toast(`The ${RECIPES[h.rid].name} section is full (${teaCap()} cups). Serve some first.`); return false; }
  const put = Math.min(room, h.n); for (let i = 0; i < put; i++) arr.push({ stars: h.stars }); h.n -= put;
  if (h.n <= 0) holdItem(null); else setHandItem(h); Snd.knock(); refreshTeaCups(); updateTeaHud(true);
  if (!quiet) toast(`${put} ${RECIPES[h.rid].name} on the tea counter.${h.n > 0 ? ` ${h.n} still in hand: that section is full.` : ''}`); return true;
}
function takeTea(rid) {
  const st = teaStore(); const arr = st[rid] || []; if (!arr.length) { toast(`No ${RECIPES[rid].name} on the counter. Brew some.`); return; }
  const take = arr.splice(0, Math.min(potCups(), arr.length)); // oldest first
  const stars = Math.round(take.reduce((a, c) => a + c.stars, 0) / take.length); holdItem({ kind: 'tray', n: take.length, rid, stars }); Snd.soft(); refreshTeaCups();
}
// cooling: held tray and every stored cup; a cup that goes fully cold is poured out
let teaTick = 0;
function updateTea(dt) {
  if (!TEA.migrated) { TEA.migrated = true; const gone = { cozies: 1800, warmer: 2800, urns: 9000, icewell: 7000 }; let refund = 0; S.crates = (S.crates || []).filter(id => { if (gone[id]) { refund += gone[id]; return false; } return true; }); S.pending = (S.pending || []).filter(p => { if (gone[p.id]) { refund += gone[p.id]; return false; } return true; }); if (refund) { S.yen += refund; refreshCrates(); toast(`Tea no longer goes cold, so Kumo refunded ${yen(refund)} for the warming gear.`); } }
  teaTick -= dt; if (teaTick <= 0) { teaTick = 1.0; if (S.flags.counterBuilt && TEA.built !== teaSlots().join(',')) { buildTeaCounter(); if (TEA.built.split(',').length > 1) toast('A new section on the tea counter, for the new tea.'); } refreshTeaCups(); }
  updateTeaHud(); updateCounterFx(dt);
}
// HUD: what you are carrying and how hot it still is
function updateTeaHud(force) {
  const el = $('#teaHud'); if (!el) return; const h = player.hold; const show = SET.teaHud !== false && started && h && h.kind === 'tray' && h.n > 0 && !player.focus && !DLG.active && !UI.modal;
  if (!show) { if (!el.hidden) el.hidden = true; return; }
  if (el.hidden) el.hidden = false;
  const txt = `${RECIPES[h.rid].name} ×${h.n}`, tt = '★'.repeat(h.stars) + '☆'.repeat(Math.max(0, 3 - h.stars));
  if (force || el.dataset.t !== txt + tt) { el.dataset.t = txt + tt; $('#teaName').textContent = txt; $('#teaTemp').textContent = tt; }
  const bar = $('#teaBar'); bar.style.width = Math.round(h.n / potCups() * 100) + '%'; bar.style.background = isIced(h.rid) ? 'var(--cyan)' : 'var(--amber)';
}
/* ================= tea-tray dressing + the serving counter clutter ================= */
const TEA_LEAF = { sencha: 0x3e5a24, genmai: 0xb8985a, gyokuro: 0x2e4a1e, matcha: 0x6a9a2a, hoji: 0x6a3a1c, iced: 0x4a6a2a, latte: 0x7a4a26, blend: 0x5a6a30 };
const TEA_CARD_A = 0.32, TEA_CARD_H = 0.066, TEA_CARD_Z = -3.268;
// one lacquer tray per section: raised rim, lidded canister with a leaf motif and a dish of loose leaf behind the cups
function teaTrayDressing(ch, gl, rid, cx) {
  const r = RECIPES[rid], iced = isIced(rid), zc = -3.17, w = TEA_W - 0.03, d = 0.27, y = TEA_Y;
  gl.gk = 1; gl.box(w, 0.012, d, 0x1e0806, cx, y + 0.006, zc); gl.box(w - 0.02, 0.003, d - 0.02, iced ? 0x1c2a34 : 0x4a120c, cx, y + 0.0135, zc);
  for (const s of [-1, 1]) { gl.box(w, 0.02, 0.01, 0x160604, cx, y + 0.016, zc + s * (d / 2 - 0.005)); gl.box(0.01, 0.02, d, 0x160604, cx + s * (w / 2 - 0.005), y + 0.016, zc); }
  gl.gk = 0;
  // canister (back right from the staff side), cream glaze, wooden lid, leaf motif facing the staff
  const kx = cx - 0.075, kz = -3.078, body = iced ? 0xc8d4d8 : spick([0xd9d0bc, 0xd4ccb4, 0xcfc8b8]);
  ch.cyl(0.04, 0.043, 0.085, 10, body, kx, y + 0.0155 + 0.0425, kz); ch.cyl(0.03, 0.04, 0.014, 10, body, kx, y + 0.107, kz);
  ch.cyl(0.033, 0.033, 0.016, 10, 0x5a3c28, kx, y + 0.122, kz); ch.ball(0.011, 0x3a2414, kx, y + 0.134, kz); ch.torus(0.0425, 0.004, 10, 0x8a7a5a, kx, y + 0.028, kz, Math.PI / 2);
  const lz = kz - 0.042; ch.box(0.02, 0.036, 0.004, 0x4f7d48, kx - 0.006, y + 0.062, lz, 0, 0, 0.55); ch.box(0.016, 0.03, 0.004, 0x3e6e38, kx + 0.009, y + 0.07, lz, 0, 0, -0.5); ch.box(0.003, 0.03, 0.005, 0x5a4a2a, kx + 0.001, y + 0.05, lz - 0.001, 0, 0, 0.15);
  // small dish of loose tea (back left)
  const dx = cx + 0.08, dz = -3.08, lc = TEA_LEAF[r.id] || 0x4a6a2a; ch.cyl(0.045, 0.033, 0.016, 10, 0x2e2a28, dx, y + 0.0155 + 0.008, dz); ch.cyl(0.04, 0.04, 0.003, 10, 0x8a8478, dx, y + 0.032, dz);
  ch.ball(0.03, lc, dx, y + 0.032, dz, 0, 1, 0.28, 1);
  if (r.st !== 'matcha') for (let i = 0; i < 5; i++) ch.box(0.016, 0.003, 0.004, i % 2 ? lc : new THREE.Color(lc).multiplyScalar(0.7).getHex(), dx + srange(-0.022, 0.022), y + 0.038, dz + srange(-0.02, 0.02), 0, srand() * 3, 0);
  if (r.rice) for (let i = 0; i < 4; i++) ch.ball(0.004, 0x8a5a2a, dx + srange(-0.02, 0.02), y + 0.039, dz + srange(-0.018, 0.018));
  if (r.st === 'matcha') { ch.box(0.006, 0.004, 0.07, C.bamboo, dx + 0.03, y + 0.04, dz + 0.012, 0.15, 0.4, 0); }
  // back half of the folded paper name card (the printed front face is TEA.plaques)
  const a = TEA_CARD_A, h = TEA_CARD_H; ch.box(0.15, h, 0.002, 0xd8ccb2, cx, y + 0.013 + h / 2 * Math.cos(a), TEA_CARD_Z + h / 2 * Math.sin(a), -a, 0, 0, 0.0);
}
function plaqueTex(rid) {
  const r = RECIPES[rid], n = (teaStore()[rid] || []).length, cap = teaCap();
  return panelTex(256, 112, (x, W, H) => {
    x.fillStyle = '#efe6d0'; x.fillRect(0, 0, W, H);
    const gr = x.createLinearGradient(0, 0, 0, 14); gr.addColorStop(0, 'rgba(90,60,30,.35)'); gr.addColorStop(1, 'rgba(90,60,30,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, 14); // fold shadow
    x.strokeStyle = 'rgba(120,90,60,.25)'; x.lineWidth = 1; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, 18 + i * 10 + (i % 3)); x.lineTo(W, 20 + i * 10); x.stroke(); } // washi fibres
    x.fillStyle = '#1e140c'; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = 58; x.font = `600 ${fs}px ${FONT_BRUSH}`;
    while (fs > 22 && x.measureText(r.jp).width > 172) { fs -= 2; x.font = `600 ${fs}px ${FONT_BRUSH}`; } x.fillText(r.jp, 104, 54);
    // count: a small hanko-style stamp in the corner + capacity dots along the bottom
    const sx = W - 30, sy = 40; x.beginPath(); x.arc(sx, sy, 19, 0, Math.PI * 2);
    if (n) { x.fillStyle = isIced(rid) ? '#2a7aa8' : '#b8322a'; x.fill(); x.fillStyle = '#f6eedc'; } else { x.strokeStyle = 'rgba(120,96,70,.6)'; x.lineWidth = 2; x.stroke(); x.fillStyle = 'rgba(120,96,70,.7)'; }
    x.font = `bold 24px ${FONT_UI}`; x.fillText(String(n), sx, sy + 1);
    const dw = Math.min(14, 200 / cap); for (let i = 0; i < cap; i++) { x.beginPath(); x.arc(20 + i * dw, H - 12, 3.2, 0, Math.PI * 2); if (i < n) { x.fillStyle = isIced(rid) ? '#2a7aa8' : '#b8322a'; x.fill(); } else { x.strokeStyle = 'rgba(120,96,70,.45)'; x.lineWidth = 1.2; x.stroke(); } }
  });
}
function teaCardMesh(rid, cx) {
  const a = TEA_CARD_A, h = TEA_CARD_H; const pm = printedMesh(plaqueTex(rid), 0.15, h, false); pm.material.color.setRGB(0.8, 0.66, 0.5);
  pm.rotation.order = 'YXZ'; pm.rotation.set(-a, Math.PI, 0); pm.position.set(cx, TEA_Y + 0.013 + h / 2 * Math.cos(a), TEA_CARD_Z - h / 2 * Math.sin(a) - 0.0012); return pm;
}
// ---- counter clutter (built inside buildG0's counter chunks) ----
const CTR = { wisps: [], atlas: null, glass: null };
let _ctrSeed = 7;
const _ctrR = () => { _ctrSeed = (_ctrSeed * 16807) % 2147483647; return _ctrSeed / 2147483647; };
function counterAtlas() {
  if (CTR.atlas) return CTR.atlas; _ctrSeed = 7;
  CTR.atlas = canvasTex(1024, 512, (x) => {
    x.fillStyle = '#1a1410'; x.fillRect(0, 0, 1024, 512);
    // A (0,0,256,144): tent card 本日 開店間近です
    x.fillStyle = '#f1e8d4'; x.fillRect(0, 0, 256, 144); x.strokeStyle = '#6a4a30'; x.lineWidth = 3; x.strokeRect(8, 8, 240, 128);
    x.fillStyle = '#1e140c'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = `600 40px ${FONT_BRUSH}`; x.fillText('本日', 62, 46); x.font = `600 34px ${FONT_BRUSH}`; x.fillText('開店間近です', 22, 102);
    x.beginPath(); x.arc(34, 46, 13, 0, Math.PI * 2); x.lineWidth = 2.5; x.strokeStyle = '#1e140c'; x.stroke(); x.beginPath(); x.moveTo(34, 38); x.lineTo(34, 46); x.lineTo(40, 50); x.stroke();
    // B (256,0,512,352): open manga magazine spread, two pages of panels
    for (let p = 0; p < 2; p++) { const ox = 256 + p * 256; x.fillStyle = '#ece6da'; x.fillRect(ox, 0, 256, 352); x.strokeStyle = '#141414'; x.lineWidth = 3;
      const rows = p ? [[0, 110], [118, 230], [238, 340]] : [[0, 150], [158, 250], [258, 340]];
      rows.forEach(([y0, y1], ri) => { const split = ri === 1 ? 0.45 : (ri === 2 && p ? 0.62 : 1); const cols = split < 1 ? [[0, split], [split, 1]] : [[0, 1]];
        for (const [a0, a1] of cols) { const px = ox + 14 + a0 * 228 + (a0 ? 5 : 0), pw = (a1 - a0) * 228 - (a0 || a1 < 1 ? 5 : 0), py = y0 + 12, ph = y1 - y0 - 4;
          x.fillStyle = '#f8f4ea'; x.fillRect(px, py, pw, ph); for (let k = 0; k < 3; k++) { x.fillStyle = `rgba(30,30,30,${0.15 + _ctrR() * 0.5})`; x.beginPath(); x.ellipse(px + _ctrR() * pw, py + ph * (0.4 + _ctrR() * 0.6), 8 + _ctrR() * pw * 0.25, 6 + _ctrR() * ph * 0.3, 0, 0, Math.PI * 2); x.fill(); }
          for (let k = 0; k < 6; k++) { x.strokeStyle = 'rgba(20,20,20,.5)'; x.lineWidth = 1; x.beginPath(); const lx = px + _ctrR() * pw; x.moveTo(lx, py); x.lineTo(lx + (_ctrR() - 0.5) * 40, py + ph); x.stroke(); }
          x.fillStyle = '#fff'; x.strokeStyle = '#141414'; x.lineWidth = 2; x.beginPath(); x.ellipse(px + pw * 0.25 + _ctrR() * pw * 0.5, py + 20, Math.min(30, pw * 0.25), 15, 0, 0, Math.PI * 2); x.fill(); x.stroke();
          x.lineWidth = 3; x.strokeStyle = '#141414'; x.strokeRect(px, py, pw, ph); } });
      x.fillStyle = p ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.25)'; x.fillRect(p ? ox : ox + 236, 0, 20, 352); }
    x.fillStyle = '#c23b2b'; x.fillRect(256 + 14, 330, 60, 16); x.fillStyle = '#fff'; x.font = `bold 12px ${FONT_UI}`; x.fillText('週刊', 256 + 26, 338);
    // C (768,0,960,256): clipboard menu お品書き
    x.fillStyle = '#efe6d0'; x.fillRect(768, 0, 192, 256); x.fillStyle = '#1e140c'; x.textAlign = 'center'; x.font = `600 30px ${FONT_BRUSH}`; x.fillText('お品書き', 864, 40);
    x.fillStyle = '#b8322a'; x.fillRect(800, 62, 128, 2); x.textAlign = 'left'; x.font = `20px ${FONT_BRUSH}`;
    [['煎茶', 380], ['玄米茶', 420], ['玉露', 900], ['抹茶', 1200], ['ほうじ茶', 520], ['和菓子', 500]].forEach(([t, p], i) => { x.fillStyle = '#1e140c'; x.textAlign = 'left'; x.fillText(t, 784, 88 + i * 27); x.textAlign = 'right'; x.fillText('¥' + p, 946, 88 + i * 27); });
    // D (0,160,128,424): phone lock screen
    const pg = x.createLinearGradient(0, 160, 0, 424); pg.addColorStop(0, '#1a2440'); pg.addColorStop(1, '#3a1a3a'); x.fillStyle = pg; x.fillRect(0, 160, 128, 264);
    x.fillStyle = '#dfe8ff'; x.textAlign = 'center'; x.font = `300 34px ${FONT_UI}`; x.fillText('21:47', 64, 220); x.font = `11px ${FONT_UI}`; x.fillText('10月17日 土曜日', 64, 246);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(12, 268, 104, 30); x.fillRect(12, 304, 104, 30); x.fillStyle = '#4aff9a'; x.fillRect(54, 400, 20, 6); // charging bar
  });
  return CTR.atlas;
}
// one mesh of textured quads cut from the atlas (r = pixel rect), each placed by a matrix
function atlasMesh(quads, tint) {
  const pos = [], uv = [], idx = []; const v = new THREE.Vector3();
  for (const q of quads) { const [p0, p1, p2, p3] = q.r, u0 = p0 / 1024, u1 = p2 / 1024, vt = 1 - p1 / 512, vb = 1 - p3 / 512, b = pos.length / 3;
    for (const [lx, ly, uu, vv] of [[-0.5, -0.5, u0, vb], [0.5, -0.5, u1, vb], [0.5, 0.5, u1, vt], [-0.5, 0.5, u0, vt]]) { v.set(lx * q.w, ly * q.h, 0).applyMatrix4(q.m); pos.push(v.x, v.y, v.z); uv.push(uu, vv); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
  if (!CTR.atlasMat) CTR.atlasMat = new THREE.MeshBasicMaterial({ map: counterAtlas(), side: THREE.DoubleSide });
  CTR.atlasMat.color.setRGB(tint[0], tint[1], tint[2]); return new THREE.Mesh(g, CTR.atlasMat);
}
function ctrWisp(g, x, y, z, kind, ph) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: kind ? 0xc8c8d0 : 0xffffff, transparent: true, opacity: 0, depthWrite: false })); sp.userData.keepGeo = true; sp.renderOrder = 3;
  sp.position.set(x, y, z); g.add(sp); CTR.wisps.push({ s: sp, x, y, z, kind, t: ph }); return sp;
}
function updateCounterFx(dt) {
  for (const w of CTR.wisps) { const life = w.kind ? 3.2 : 2.2; w.t = (w.t + dt) % life; const q = w.t / life;
    if (w.kind) { w.s.position.set(w.x + Math.sin(w.t * 1.7 + w.x * 9) * 0.012 * q, w.y + q * 0.16, w.z); w.s.scale.set(0.018 + q * 0.03, 0.07 + q * 0.06, 1); w.s.material.opacity = Math.sin(q * Math.PI) * 0.16; }
    else { w.s.position.set(w.x + Math.sin(w.t * 2 + w.z * 7) * 0.02 * q, w.y + q * 0.24, w.z); const sc = 0.05 + q * 0.16; w.s.scale.set(sc, sc * 1.2, 1); w.s.material.opacity = Math.sin(q * Math.PI) * 0.13; } }
}
// everything on the serving counter top (z -3.0..-2.66 strip, clear of the tea trays) + the dressed staff-side face
function buildCounterDressing(g, ch, em, gl, lit) {
  CTR.wisps = []; CTR.q = []; const Y = 1.035, sv = seedS; reseed(2203);
  // ---- staff-side (inner) face: closed lower panel with board lines, open cubby under the top with cups, bowls, cloths
  ch.box(3.4, 0.56, 0.03, 0x3a2618, -0.8, 0.31, -3.31); for (let x = -2.45; x < 0.9; x += 0.21) ch.box(0.006, 0.54, 0.006, 0x1e140c, x, 0.31, -3.327);
  ch.box(3.4, 0.03, 0.02, 0x2a1a10, -0.8, 0.045, -3.33); ch.box(3.4, 0.025, 0.02, 0x4a3020, -0.8, 0.585, -3.33);
  ch.box(3.36, 0.025, 0.58, 0x5a3c26, -0.8, 0.6, -3.03); ch.box(3.36, 0.34, 0.02, 0x24180f, -0.8, 0.78, -2.75); ch.box(3.4, 0.045, 0.025, 0x2a160c, -0.8, 0.935, -3.32);
  for (const x of [-2.46, -1.62, -0.78, 0.06, 0.86]) ch.box(0.025, 0.34, 0.58, 0x3a2618, x, 0.78, -3.03);
  if (lit) { em.box(3.3, 0.006, 0.012, new THREE.Color(1.2, 0.7, 0.32), -0.8, 0.905, -3.28); for (const x of [-2.0, -1.2, -0.4, 0.45]) tagA(anchor(x, 0.86, -3.12, 0xffa050, 0.55, 0.65, ['g0'], 0.35), 'g0');
    for (const x of [-1.9, -0.7, 0.4]) tagA(anchor(x, 1.0, -3.85, 0xff9a50, 0.35, 1.0, ['g0'], 0.45), 'g0'); }
  const sy = 0.6125;
  for (let bay = 0; bay < 4; bay++) { const x0 = -2.42 + bay * 0.84; let x = x0 + 0.06;
    const items = [['cups', 0.09], ['bowls', 0.15], ['cloth', 0.17], ['cups', 0.09], ['tins', 0.12], ['cups', 0.09]]; for (let i = 0; i < items.length && x < x0 + 0.76; i++) { const [k, w] = items[(i + bay * 2) % items.length]; const cx = x + w / 2, cz = -3.1 + srange(-0.04, 0.04);
      if (k === 'cups') P.cupStack(ch, cx, sy, cz, 2 + (srand() * 2 | 0), spick([C.ceramic, C.celadon, 0x6a4a3a, 0xd8d0c0]));
      else if (k === 'bowls') for (let j = 0; j < 3; j++) ch.cyl(0.07, 0.045, 0.04, 10, spick([C.ceramic, 0x2e2a28, 0x8a5a3a]), cx, sy + 0.02 + j * 0.028, cz);
      else if (k === 'cloth') for (let j = 0; j < 4; j++) ch.box(0.15, 0.022, 0.13, spick([C.washi, 0xd8d0c0, C.indigo, 0x5a6a8a]), cx, sy + 0.011 + j * 0.023, cz, 0, srange(-0.08, 0.08), 0);
      else { P.tin(ch, cx - 0.025, sy, cz, spick([0x2a3a2a, 0x6a2a20, 0x2c3c6e]), 0.12); ch.box(0.05, 0.08, 0.05, C.cardboard, cx + 0.04, sy + 0.04, cz + 0.03); }
      x += w + 0.04; } }
  // ---- right end (x 0.45..0.85): small plant at the staff end, clipboard menu, napkins
  P.plant(ch, 0.68, Y, -3.16, 0.45, 1);
  { const cx = 0.66, cz = -2.86, a = 0.22; atR(ch, cx, Y, cz, -a, 0.25, 0, () => { ch.box(0.17, 0.24, 0.008, 0x6a4a2a, 0, 0.12, 0); ch.box(0.06, 0.02, 0.016, C.steel, 0, 0.235, 0.006); ch.box(0.02, 0.012, 0.02, C.steelD, 0, 0.245, 0.01); });
    { const L = M(cx, Y, cz, -a, 0.25, 0), p1 = new THREE.Vector3(0, 0.15, -0.006).applyMatrix4(L), p2 = new THREE.Vector3(0, 0, -0.11).applyMatrix4(L); ch.bar([p1.x, p1.y, p1.z], [p2.x, Y + 0.004, p2.z], 0.008, 0x4a3020); }
    const m = M(cx, Y, cz, -a, 0.25, 0).multiply(M(0, 0.115, 0.0055)); CTR.q.push({ w: 0.15, h: 0.2, m, r: [768, 0, 960, 256] }); }
  for (let i = 0; i < 6; i++) ch.box(0.12, 0.008, 0.12, i % 3 ? 0xf2efe8 : 0xe8e2d6, 0.5, Y + 0.004 + i * 0.008, -2.74, 0, 0.1 + srange(-0.06, 0.06), 0);
  ch.box(0.13, 0.012, 0.025, 0xb8322a, 0.5, Y + 0.03, -2.74, 0, 0.1, 0); // napkin band
  // ---- around the register / tablet: wagashi plate, mug
  { const px = -0.08, pz = -2.82; ch.cyl(0.065, 0.05, 0.012, 12, 0x2e2826, px, Y + 0.006, pz); ch.cyl(0.055, 0.055, 0.002, 12, 0x6a5a4e, px, Y + 0.013, pz);
    ch.ball(0.028, 0xf2d8e0, px - 0.01, Y + 0.03, pz, 1, 1, 0.75, 1); ch.ball(0.01, 0xe890b0, px - 0.01, Y + 0.05, pz); ch.ball(0.024, 0x9ac070, px + 0.03, Y + 0.026, pz + 0.012, 1, 1, 0.7, 1);
    ch.bar([px + 0.045, Y + 0.016, pz - 0.03], [px - 0.03, Y + 0.016, pz - 0.05], 0.004, 0x8a6a3a); }
  { const mx = -0.33, mz = -2.9; gl.gk = 0.5; gl.cyl(0.04, 0.038, 0.095, 10, 0xd8d0b8, mx, Y + 0.0475, mz); gl.cyl(0.036, 0.036, 0.003, 10, 0x4a2a14, mx, Y + 0.09, mz); gl.torus(0.024, 0.006, 8, 0xd8d0b8, mx + 0.045, Y + 0.05, mz, 0, 0, 0); gl.cyl(0.041, 0.041, 0.02, 10, 0x4a6a8a, mx, Y + 0.06, mz); gl.gk = 0; }
  // ---- open manga magazine + reading glasses
  { const mx = -0.62, mz = -2.86, ry = Math.PI + 0.12; at(ch, mx, Y, mz, ry, () => { ch.box(0.34, 0.006, 0.235, 0xc23b2b, 0, 0.003, 0); ch.box(0.32, 0.007, 0.22, 0xe0dace, 0, 0.007, 0); ch.box(0.004, 0.012, 0.22, 0xb8b0a0, 0, 0.009, 0); });
    const base = M(mx, Y + 0.0113, mz, 0, ry, 0); CTR.q.push({ w: 0.155, h: 0.215, m: base.clone().multiply(M(-0.079, 0, 0, -Math.PI / 2, 0, 0.03)), r: [256, 0, 512, 352] }); CTR.q.push({ w: 0.155, h: 0.215, m: base.clone().multiply(M(0.079, 0, 0, -Math.PI / 2, 0, -0.03)), r: [512, 0, 768, 352] }); }
  { const gx = -0.55, gz = -2.84; at(ch, gx, Y + 0.024, gz, 0.4, () => { for (const s of [-1, 1]) ch.torus(0.022, 0.0035, 10, 0x3a2418, s * 0.028, 0, 0, Math.PI / 2 - 0.25); ch.box(0.014, 0.004, 0.004, 0x3a2418, 0, 0.004, 0);
    for (const s of [-1, 1]) ch.bar([s * 0.05, 0.004, -0.006], [s * 0.046, -0.006, -0.12], 0.004, 0x3a2418); }); }
  // ---- smartphone with a white cable over the customer edge
  { const px = -0.9, pz = -2.76, ry = 0.35; at(ch, px, Y, pz, ry, () => { ch.box(0.074, 0.008, 0.15, 0x16181c, 0, 0.004, 0); }); CTR.q.push({ w: 0.066, h: 0.138, m: M(px, Y + 0.0085, pz, 0, ry, 0).multiply(M(0, 0, 0, -Math.PI / 2, 0, 0)), r: [0, 160, 128, 424] });
    const e = [px + Math.sin(ry) * 0.078, Y + 0.004, pz + Math.cos(ry) * 0.078]; const W = 0xe8e8e4;
    const path = [e, [e[0] + 0.02, Y + 0.004, -2.69], [e[0] + 0.03, Y + 0.003, -2.662], [e[0] + 0.034, Y - 0.02, -2.652], [e[0] + 0.04, 0.82, -2.652], [e[0] + 0.03, 0.66, -2.656], [e[0] + 0.012, 0.56, -2.66]];
    for (let i = 0; i < path.length - 1; i++) ch.bar(path[i], path[i + 1], 0.006, W); ch.box(0.014, 0.03, 0.01, W, e[0] + 0.012, 0.54, -2.66); }
  // ---- tent card 本日 開店間近です (printed on both faces)
  { const tx = -1.13, tz = -2.84, a = 0.3, h = 0.11, w = 0.19; for (const s of [0, 1]) CTR.q.push({ w, h, m: M(tx, Y + h / 2 * Math.cos(a), tz + (s ? -1 : 1) * h / 2 * Math.sin(a), -a, s ? Math.PI : 0, 0), r: [0, 0, 256, 144] }); }
  // ---- tetsubin on a wooden trivet, a little steam
  { const kx = -1.47, kz = -2.88; ch.box(0.2, 0.012, 0.2, 0x4a3020, kx, Y + 0.006, kz); for (let i = 0; i < 4; i++) ch.box(0.2, 0.012, 0.032, 0x6a4a2a, kx, Y + 0.018, kz - 0.075 + i * 0.05);
    const ty = Y + 0.024; gl.gk = 0.35; const I = 0x232326; gl.ball(0.088, I, kx, ty + 0.07, kz, 1, 1, 0.78, 1); gl.cyl(0.05, 0.06, 0.02, 12, I, kx, ty + 0.13, kz); gl.cyl(0.044, 0.044, 0.012, 12, 0x2e2e30, kx, ty + 0.145, kz); gl.ball(0.013, I, kx, ty + 0.162, kz);
    for (let i = 0; i < 14; i++) { const ang = i / 14 * Math.PI * 2; for (const yy of [0.05, 0.085]) gl.ball(0.007, 0x3a3a3c, kx + Math.cos(ang) * 0.086 * (yy > 0.06 ? 0.93 : 1), ty + yy, kz + Math.sin(ang) * 0.086 * (yy > 0.06 ? 0.93 : 1)); }
    gl.cyl(0.012, 0.022, 0.08, 8, I, kx + 0.1, ty + 0.1, kz - 0.01, 0, 0, -0.9); gl.gk = 0;
    ch.bar([kx - 0.06, ty + 0.14, kz], [kx - 0.045, ty + 0.21, kz], 0.008, C.iron, 6); ch.bar([kx - 0.045, ty + 0.21, kz], [kx + 0.045, ty + 0.21, kz], 0.008, C.iron, 6); ch.bar([kx + 0.045, ty + 0.21, kz], [kx + 0.06, ty + 0.14, kz], 0.008, C.iron, 6);
    for (let i = 0; i < 3; i++) ctrWisp(g, kx + 0.14, ty + 0.15, kz - 0.01, 0, i * 0.73); }
  // ---- matcha bowl, chasen on its ceramic holder, oshibori on a bamboo tray
  { const bx = -1.76, bz = -2.8; gl.gk = 0.5; gl.cyl(0.062, 0.042, 0.06, 12, 0x4a6a34, bx, Y + 0.03, bz); gl.cyl(0.056, 0.056, 0.003, 12, 0x9ac060, bx, Y + 0.058, bz); gl.gk = 0; ch.cyl(0.035, 0.035, 0.008, 10, 0x4a3a2a, bx, Y + 0.004, bz);
    const wx = -1.74, wz = -2.95; ch.cyl(0.026, 0.034, 0.05, 10, 0xe8e2d4, wx, Y + 0.025, wz); ch.ball(0.03, 0xe8e2d4, wx, Y + 0.065, wz, 0, 1, 1.2, 1);
    ch.cyl(0.04, 0.026, 0.07, 12, 0xd9c48a, wx, Y + 0.09, wz); ch.cyl(0.014, 0.014, 0.06, 8, C.bamboo, wx, Y + 0.155, wz); ch.torus(0.04, 0.004, 12, 0xc8b070, wx, Y + 0.125, wz, Math.PI / 2);
    const ox = -1.99, oz = -2.8; ch.box(0.16, 0.008, 0.08, C.bamboo, ox, Y + 0.004, oz, 0, 0.2, 0); for (let i = 0; i < 4; i++) ch.box(0.16, 0.003, 0.004, 0x8a7440, ox, Y + 0.0095, oz - 0.03 + i * 0.02, 0, 0.2, 0);
    ch.cyl(0.024, 0.024, 0.13, 10, 0xf2efe8, ox, Y + 0.033, oz, 0, 0.2, Math.PI / 2); ch.cyl(0.024, 0.024, 0.02, 10, 0x8aa0c8, ox + 0.03, Y + 0.034, oz - 0.006, 0, 0.2, Math.PI / 2); }
  // ---- chopstick cup + incense holder with a thin smoke wisp
  { const cx = 0.52, cz = -3.1; ch.cyl(0.034, 0.03, 0.11, 10, 0x2a2020, cx, Y + 0.055, cz); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; ch.bar([cx + Math.cos(a) * 0.015, Y + 0.03, cz + Math.sin(a) * 0.015], [cx + Math.cos(a) * 0.028, Y + 0.21, cz + Math.sin(a) * 0.028], 0.006, i % 3 ? 0xa8845a : 0x2a1a10); } }
  { const ix = -2.06, iz = -2.95; ch.cyl(0.04, 0.03, 0.022, 10, 0x6a6e66, ix, Y + 0.011, iz); ch.cyl(0.034, 0.034, 0.004, 10, 0x9a948a, ix, Y + 0.022, iz); ch.bar([ix, Y + 0.022, iz], [ix + 0.01, Y + 0.16, iz - 0.006], 0.003, 0x5a3a24);
    if (lit) em.ball(0.004, new THREE.Color(3, 0.9, 0.2), ix + 0.01, Y + 0.161, iz - 0.006); for (let i = 0; i < 2; i++) ctrWisp(g, ix + 0.01, Y + 0.18, iz - 0.006, 1, i * 1.6); }
  // ---- glass cloche on a cake stand with colourful wagashi
  { const cx = -2.3, cz = -2.86, sy2 = Y + 0.075; ch.cyl(0.06, 0.07, 0.012, 12, 0xd8d0c0, cx, Y + 0.006, cz); ch.cyl(0.018, 0.026, 0.06, 8, 0xd8d0c0, cx, Y + 0.042, cz); ch.cyl(0.12, 0.11, 0.012, 14, 0xe8e2d4, cx, sy2, cz);
    [[0xf0a8c0, -0.05, -0.02], [0x9ac070, 0.0, -0.05], [0xf2efe4, 0.05, -0.01], [0xe8c060, -0.02, 0.04], [0x9a6ab0, 0.04, 0.045], [0xf0a8c0, 0.0, 0.0]].forEach(([c, dx, dz], i) => { ch.ball(0.024, c, cx + dx, sy2 + 0.024 + (i === 5 ? 0.02 : 0), cz + dz, 1, 1, 0.75, 1); if (i % 2) ch.ball(0.008, 0xffffff, cx + dx, sy2 + 0.042 + (i === 5 ? 0.02 : 0), cz + dz); });
    ch.ball(0.012, 0xc8d8e0, cx, sy2 + 0.205, cz);
    if (!CTR.glass) CTR.glass = new THREE.MeshPhongMaterial({ color: 0xd8e8f0, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const dm = new THREE.Mesh(new THREE.SphereGeometry(0.118, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), CTR.glass); dm.scale.set(1, 1.6, 1); dm.position.set(cx, sy2 + 0.006, cz); dm.renderOrder = 2; g.add(dm);
    ch.torus(0.118, 0.004, 14, 0xb8c8d0, cx, sy2 + 0.008, cz, Math.PI / 2); }
  g.add(atlasMesh(CTR.q, [0.8, 0.66, 0.5])); seedS = sv;
}

