/* ================= stations: framework ================= */
const ST = { cur: null, padDown: false, pointerDown: false, keyDown: false };
function stMeter(v, lo, hi, max, label, over) { const el = $('#stMeter'); if (v == null) { el.hidden = true; return; } el.hidden = false; $('#stWin').style.left = (lo / max * 100) + '%'; $('#stWin').style.width = ((hi - lo) / max * 100) + '%'; $('#stNeedle').style.left = Math.min(100, v / max * 100) + '%'; $('#stNeedle').style.background = over ? '#ff6a5a' : ''; $('#stTime').textContent = label; }
const stUI = { root: $('#stationUI'), title: $('#stTitle'), steps: $('#stSteps'), hint: $('#stHint'), pad: $('#stPad'), back: $('#stBack') };
function startStation(st) {
  if (ST.cur) return; ST.cur = st; releasePointer(); releaseUse();
  player.focus = { pos: st.cam.pos.clone(), at: st.cam.at.clone(), fov: st.cam.fov || 0.82, hands: false, glance: new THREE.Vector2() };
  stUI.root.hidden = false; stUI.back.hidden = false; stUI.title.textContent = st.title; ST.padDown = false;
  if (st.enter) st.enter(); renderStationUI(); updateLockHint();
}
function endStation(result) {
  const st = ST.cur; if (!st) return; if (CHEAT.perfect && result && typeof result === 'object' && result.stars) result.stars = 3; ST.cur = null; player.focus = null; stUI.root.hidden = true; stMeter(null); stUI.back.hidden = true; ST.padDown = false; Snd.loopStop('pourL'); Snd.loopStop('hissL');
  if (st.exit) st.exit(result); updateLockHint();
}
function stepBack() { if (!ST.cur) { player.focus = null; return; } if (ST.cur.cancel === false) { toast('Finish this first.'); return; } endStation(null); }
function renderStationUI() {
  const st = ST.cur; if (!st) return; const steps = st.steps || [];
  stUI.steps.innerHTML = steps.map((s, i) => `<span class="${i < st.si ? 'done' : i === st.si ? 'on' : ''}">${s.label}</span>`).join('');
  const s = steps[st.si]; stUI.hint.textContent = (st.note ? st.note + ' ' : '') + (s ? (COARSE ? s.hintT || s.hint : s.hint) : '');
  const pl = s && s.pad ? s.pad : null; stUI.pad.hidden = !pl; if (pl) stUI.pad.textContent = typeof pl === 'function' ? pl() : pl; stUI.pad.classList.toggle('hold', !!(s && s.holdPad && ST.padDown));
}
function stationKey(code, down) { if (!ST.cur) return; if (code === 'Space' || code === 'Enter' || code === 'KeyE') { if (down && !ST.keyDown) { ST.keyDown = true; padPress(); } else if (!down) { ST.keyDown = false; padRelease(); } } if (ST.cur && ST.cur.key) ST.cur.key(code, down); }
function stationPointer(type, x, y, button, id) {
  const st = ST.cur; if (!st) return; if (button === 2 && type === 'down') { stepBack(); return; }
  if (st.pointer && st.pointer(type, x, y, id)) return;
  // default: anywhere on the scene acts as the pad
  if (type === 'down') { ST.pointerDown = true; padPress(); } else if (type === 'up' && ST.pointerDown) { ST.pointerDown = false; padRelease(); }
  if (type === 'move' && st.glance && !ST.pointerDown) { player.focus.glance.set(-(x / vw - 0.5) * 0.3, -(y / vh - 0.5) * 0.2); }
}
function padPress() { const st = ST.cur; if (!st) return; ST.padDown = true; const s = st.steps[st.si]; if (s && s.down) s.down(); renderStationUI(); }
function padRelease() { const st = ST.cur; if (!st) return; if (!ST.padDown) return; ST.padDown = false; const s = st.steps[st.si]; if (s && s.up) s.up(); renderStationUI(); }
stUI.pad.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); padPress(); });
stUI.pad.addEventListener('pointerup', e => { e.preventDefault(); padRelease(); });
stUI.pad.addEventListener('pointerleave', () => padRelease());
stUI.back.addEventListener('click', () => stepBack());
/* ---------- automation hooks for the test harness (pure reads; no gameplay effect) ----------
   Each station step may define:
     bot()      -> { kind: 'tap'|'hold'|'zigzag'|'drag', world:[x,y,z] | x,y (css px) | css:'#sel', every: gameSeconds, path:[[x,y,z],...] }
     botReady() -> true when a human would act now (e.g. temperature in the band); harness waits for it before pressing
     botDone()  -> for 'hold'/'zigzag': true when to let go / stop
   Defaults: tap/hold on the on-screen pad (or screen centre). Keep these in sync when a step's mechanics change. */
const _bv = new THREE.Vector3();
function botScreen(x, y, z) { _bv.set(x, y, z).project(camera); return { x: (_bv.x + 1) / 2 * vw, y: (1 - _bv.y) / 2 * vh, vis: _bv.z < 1 && Math.abs(_bv.x) <= 1 && Math.abs(_bv.y) <= 1 }; }
function botStep() { const st = ST.cur; return st ? st.steps[st.si] : null; }
function botAction() {
  const st = ST.cur; if (!st) return null; const s = botStep(); if (!s) return { kind: 'wait', step: '' };
  const a = Object.assign({}, s.bot ? s.bot() : (s.holdPad ? { kind: 'hold' } : { kind: 'tap' }));
  if (a.world) { const p = botScreen(a.world[0], a.world[1], a.world[2]); a.x = p.x; a.y = p.y; }
  if (a.path) a.spath = a.path.map(p => { const q = botScreen(p[0], p[1], p[2]); return [q.x, q.y]; });
  if (a.css) { const el = $(a.css); if (el && !el.hidden) { const r = el.getBoundingClientRect(); a.x = r.x + r.width / 2; a.y = r.y + r.height / 2; } }
  if (a.x == null) { if (!stUI.pad.hidden) { const r = stUI.pad.getBoundingClientRect(); a.x = r.x + r.width / 2; a.y = r.y + r.height / 2; } else { a.x = vw / 2; a.y = vh * 0.45; } }
  a.step = s.label; a.si = st.si; a.station = st.id; return a;
}
function botReady() { const s = botStep(); return !s || !s.botReady || !!s.botReady(); }
function botDone() { const s = botStep(); return !s || !s.botDone || !!s.botDone(); }
function nextStep(st) { st.si++; ST.padDown = false; if (st.si >= st.steps.length) { if (st.finish) st.finish(); } else { const s = st.steps[st.si]; if (s.start) s.start(); } renderStationUI(); }
function updateStation(dt) { const st = ST.cur; if (!st) return; const s = st.steps[st.si]; if (s && s.update) s.update(dt); if (st.update) st.update(dt); if (frameN % 6 === 0) renderStationUI(); }
const wide = v => SET.relaxed ? v * 1.4 : v;

/* ---------- LED readout panels (diegetic gauges) ---------- */
function ledPanel(w, h, px) { const tex = canvasTex(w, h, () => { }); const m = new THREE.Mesh(gPlaneIdx(), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.6, 1.6, 1.6) })); m.scale.set(px * w / h, px, 1); m.renderOrder = 6; return { m, tex, ctx: tex.userData.ctx, w, h }; }

/* ================= kettle station ================= */
// Props on the left back bench (worktop x -2.5..-0.6, top y 0.945). Static dressing is merged into two chunks (matte + glossy) and
// one label mesh (shared canvas atlas); only the parts that move or change (kettle lid/handle/water, kyusu, bowl water, rice jar,
// cups, sand, LEDs, steam) are their own meshes.
const KS = { g: null, kettle: null, water: null, lid: null, handle: null, kyusu: null, cups: [], led: null, timer: null, stream: null, steam: [], bowl: null, bowlWater: null, riceJar: null, scale: null, sand: null, ring: null, lidOff: false, lidK: 0, heating: false, base: new THREE.Vector3(-1.45, 0.96, -5.08) };
const KS_TOP = 0.945, KS_PLATE = 0.975; // bench worktop / induction plate top
const KS_LAY = { tray: [-1.9, -4.9], bowl: [-1.15, -5.1], rice: [-1.05, -5.31], kyusu: [-0.97, -5.14], mat: [-0.98, -4.89], scale: [-0.74, -4.95], sand: [-0.73, -5.1], board: [-2.03, -5.16] };
// material with the same ambient-probe hook as personMat (Lambert, or Phong for glossy iron/glaze; map for labels)
function ksMat(o) {
  o = o || {}; const pr = KS.mat.userData.probe;
  const m = o.gloss ? new THREE.MeshPhongMaterial({ vertexColors: !o.map, shininess: o.gloss, specular: new THREE.Color(o.spec || 0x404040) }) : new THREE.MeshLambertMaterial({ vertexColors: !o.map, map: o.map || null, transparent: !!o.op, opacity: o.op || 1, depthWrite: !o.op });
  m.userData.probe = pr; m.onBeforeCompile = sh => { sh.uniforms.uProbe = pr; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uProbe;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uProbe;'); };
  m.customProgramCacheKey = () => 'probeV1'; return m;
}
// lathe (profile [[r,y],...] bottom→top) pushed into a chunk
function ksLathe(c, pts, seg, col, x, y, z, sx, sy, sz) { const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg).toNonIndexed(); c.geo(g, col, M(x, y, z, 0, 0, 0, sx || 1, sy || sx || 1, sz || sx || 1)); g.dispose(); }
// one merged mesh of paper labels from an atlas canvas: items {w,h,m:Matrix4,r:[x0,y0,x1,y1] px, cr: wrap radius}
function ksLabels(tex, items) {
  const W = tex.image.width, H = tex.image.height, pos = [], uv = [], nor = [], v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const it of items) {
    nm.getNormalMatrix(it.m); const seg = it.cr ? 6 : 1, u0 = it.r[0] / W, u1 = it.r[2] / W, vt = 1 - it.r[1] / H, vb = 1 - it.r[3] / H;
    const P = (u, w) => { if (it.cr) { const a = (u - 0.5) * it.w / it.cr; v.set(it.cr * Math.sin(a), (w - 0.5) * it.h, it.cr * Math.cos(a)); n.set(Math.sin(a), 0, Math.cos(a)); } else { v.set((u - 0.5) * it.w, (w - 0.5) * it.h, 0); n.set(0, 0, 1); } v.applyMatrix4(it.m); n.applyMatrix3(nm).normalize(); pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); uv.push(u0 + u * (u1 - u0), vb + w * (vt - vb)); };
    for (let i = 0; i < seg; i++) { const a = i / seg, b = (i + 1) / seg; P(a, 0); P(b, 0); P(b, 1); P(a, 0); P(b, 1); P(a, 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return new THREE.Mesh(g, ksMat({ map: tex }));
}
const KS_ATLAS = { tag: [0, 0, 192, 108], rice: [192, 0, 272, 128], tin1: [272, 0, 352, 128], tin2: [352, 0, 432, 128], tin3: [432, 0, 512, 128] };
function ksAtlas() {
  return canvasTex(512, 128, (x) => {
    x.clearRect(0, 0, 512, 128);
    const paper = (r, col) => { x.fillStyle = col || '#efe3c6'; x.fillRect(r[0] + 2, r[1] + 2, r[2] - r[0] - 4, r[3] - r[1] - 4); x.strokeStyle = 'rgba(120,90,50,.35)'; x.lineWidth = 2; x.strokeRect(r[0] + 6, r[1] + 6, r[2] - r[0] - 12, r[3] - r[1] - 12); };
    const vert = (r, s, px) => { x.fillStyle = '#1e1a16'; x.font = `${px}px ${FONT_SIGN}`; x.textAlign = 'center'; x.textBaseline = 'middle'; const cx = (r[0] + r[2]) / 2, n = s.length, step = Math.min(px * 1.05, (r[3] - r[1] - 20) / n); for (let i = 0; i < n; i++) x.fillText(s[i], cx, (r[1] + r[3]) / 2 + (i - (n - 1) / 2) * step); };
    // Chiyo's paper tag
    const t = KS_ATLAS.tag; paper(t, '#f2e6c8'); x.fillStyle = '#2a2018'; x.font = 'italic 600 54px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Chiyo', 104, 58);
    x.fillStyle = '#7a6a50'; x.beginPath(); x.arc(20, 54, 7, 0, 7); x.fill();
    paper(KS_ATLAS.rice); vert(KS_ATLAS.rice, '玄米', 40); x.fillStyle = '#a0322a'; x.fillRect(KS_ATLAS.rice[2] - 22, 12, 10, 10);
    paper(KS_ATLAS.tin1); vert(KS_ATLAS.tin1, '煎茶', 40);
    paper(KS_ATLAS.tin2); vert(KS_ATLAS.tin2, '玉露', 40);
    paper(KS_ATLAS.tin3, '#e8dcbc'); vert(KS_ATLAS.tin3, '抹茶', 36);
  });
}
function ksSteamTex() {
  return canvasTex(64, 128, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.filter = 'blur(4px)';
    for (let i = 0; i < 9; i++) { const t = i / 8, cx = 32 + Math.sin(t * 5.5) * 9, cy = h - 16 - t * (h - 34), r = 9 + t * 9; const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, `rgba(255,255,255,${0.5 - t * 0.2})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }
  });
}
function buildKettleStation() {
  if (KS.g) { scene.remove(KS.g); }
  const g = new THREE.Group(); KS.g = g; scene.add(g); const b = KS.base;
  const mat = personMat(); mat.userData.probe.value.setRGB(0.55, 0.42, 0.3); KS.mat = mat;
  const glossM = KS.glossM = ksMat({ gloss: 60, spec: 0x505050 }), ironM = ksMat({ gloss: 30, spec: 0x4a4a52 });
  const S0 = new Chunk('ksS', 'g0', { jit: 0.02 }), SG = new Chunk('ksG', 'g0', { jit: 0.015 }); // static matte / glossy
  const atlas = ksAtlas(), labels = [];
  const T = KS_TOP, kx = b.x, kz = b.z;
  // ---- compact induction plate (glass-ceramic top, front fascia with the LED), blue ring under the kettle
  SG.box(0.36, 0.026, 0.46, 0x141519, kx, T + 0.013, kz + 0.04); SG.box(0.352, 0.004, 0.452, 0x1d1f25, kx, KS_PLATE - 0.002, kz + 0.04);
  S0.box(0.364, 0.006, 0.464, 0x5a5e66, kx, T + 0.003, kz + 0.04); // brushed rim
  for (const dx of [-0.125, 0.125]) S0.cyl(0.009, 0.009, 0.003, 8, 0x3a3e46, kx + dx, KS_PLATE + 0.0005, kz + 0.235);
  for (const dx of [0.11, 0.14]) SG.cyl(0.006, 0.006, 0.003, 8, 0x2a2c32, kx + dx, KS_PLATE + 0.0005, kz + 0.2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.178, 0.0045, 6, 40), new THREE.MeshBasicMaterial({ color: 0x2a80ff })); ring.rotation.x = Math.PI / 2; ring.position.set(kx, KS_PLATE + 0.001, kz); g.add(ring); KS.ring = ring;
  const rg = new THREE.Mesh(gPlaneIdx(), new THREE.MeshBasicMaterial({ map: GLOW_TEX, color: 0x3a8cff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })); rg.rotation.x = -Math.PI / 2; rg.scale.set(0.5, 0.5, 1); rg.position.set(kx, KS_PLATE + 0.002, kz); g.add(rg); KS.ringGlow = rg;
  KS.led = ledPanel(192, 80, 0.07); KS.led.m.position.set(kx, KS_PLATE + 0.02, kz + 0.212); KS.led.m.rotation.x = -0.95; g.add(KS.led.m);
  // ---- Chiyo's tetsubin: black hobnail (arare) cast iron, bail handle, lid knob, spout, paper tag
  const kg = new THREE.Group(); kg.position.set(kx, KS_PLATE, kz); g.add(kg); KS.kettle = kg;
  const IRON = 0x1b1c1f, IRONB = 0x2b2c31;
  const prof = [[0, 0.006], [0.085, 0.006], [0.1, 0.0], [0.122, 0.012], [0.146, 0.036], [0.161, 0.07], [0.165, 0.1], [0.158, 0.134], [0.14, 0.164], [0.114, 0.188], [0.088, 0.202], [0.074, 0.208], [0.073, 0.222], [0.067, 0.226], [0.063, 0.218], [0.061, 0.05], [0, 0.05]];
  const kc = new Chunk('ket', 'g0', { jit: 0.04 }); ksLathe(kc, prof, 28, IRON, 0, 0, 0);
  const rAt = y => { for (let i = 1; i < 12; i++) { const a = prof[i - 1], c = prof[i]; if (y <= c[1]) return lerp(a[0], c[0], (y - a[1]) / Math.max(1e-4, c[1] - a[1])); } return 0.07; };
  [0.042, 0.066, 0.09, 0.114, 0.138, 0.16, 0.18].forEach((y, row) => { const r = rAt(y), n = Math.round(Math.PI * 2 * r / 0.026); for (let i = 0; i < n; i++) { const a = (i + (row % 2) * 0.5) / n * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.32 && y < 0.15) continue; kc.ball(0.0068, IRONB, Math.cos(a) * (r - 0.001), y, -Math.sin(a) * (r - 0.001), 0, 1, 0.9, 1); } });
  kc.cyl(0.024, 0.032, 0.09, 8, IRON, 0.178, 0.1, 0, 0, 0, -0.95); kc.cyl(0.015, 0.022, 0.07, 8, IRON, 0.236, 0.162, 0, 0, 0, -0.62); kc.cyl(0.0165, 0.0165, 0.007, 10, IRONB, 0.257, 0.191, 0, 0, 0, -0.62);
  for (const sx of [-1, 1]) { kc.box(0.02, 0.03, 0.024, IRON, sx * 0.083, 0.214, 0); kc.cyl(0.008, 0.008, 0.026, 6, IRONB, sx * 0.083, 0.222, 0, Math.PI / 2, 0, 0); }
  kc.bar([0.086, 0.222, 0.01], [0.085, 0.148, 0.168], 0.0025, 0xd8cdb0, 4); // tag string
  kg.add(new THREE.Mesh(kc.raw(), ironM));
  labels.push({ w: 0.078, h: 0.044, m: M(kx + 0.085, KS_PLATE + 0.126, kz + 0.172, 0.1, -0.25, -0.12), r: KS_ATLAS.tag });
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 18), new THREE.MeshStandardMaterial({ color: 0x5fa8e0, emissive: 0x0d2a44, transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.1 })); water.position.y = 0.05; water.scale.y = 0.001; water.visible = false; kg.add(water); KS.water = water;
  // lid (lifts off and leans against the tiles during Fill so the water shows in the open mouth)
  const lid = new THREE.Group(); lid.position.set(0, 0.222, 0); kg.add(lid); KS.lid = lid;
  const lc = new Chunk('kl', 'g0', { jit: 0.04 }); lc.cyl(0.08, 0.082, 0.01, 20, IRON, 0, 0.005, 0); lc.cyl(0.05, 0.072, 0.016, 20, IRON, 0, 0.016, 0); lc.cyl(0.008, 0.012, 0.02, 8, IRON, 0, 0.032, 0); lc.ball(0.017, IRONB, 0, 0.048, 0, 1, 1, 0.8, 1);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; lc.ball(0.006, IRONB, Math.cos(a) * 0.062, 0.017, Math.sin(a) * 0.062); }
  lid.add(new THREE.Mesh(lc.raw(), ironM));
  // bail handle: pivots on the lugs (x axis), folds back while filling so the tap can run into the mouth
  const hd = new THREE.Group(); hd.position.set(0, 0.222, 0); kg.add(hd); KS.handle = hd;
  const hc = new Chunk('kh', 'g0', { jit: 0.02 }); let prev = null;
  for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI, p = [0.083 * Math.cos(a) * (1 + 0.32 * Math.sin(a)), 0.165 * Math.pow(Math.sin(a), 0.55), 0]; if (prev) hc.bar(prev, p, a > 1.05 && a < 2.1 ? 0.024 : 0.013, a > 1.05 && a < 2.1 ? 0x2a1d14 : IRON, 8); prev = p; }
  const arc = a => [0.083 * Math.cos(a) * (1 + 0.32 * Math.sin(a)), 0.165 * Math.pow(Math.sin(a), 0.55)];
  for (let i = 0; i < 10; i++) { const a = 1.1 + i * 0.105, p = arc(a), q = arc(a + 0.01); hc.cyl(0.0138, 0.0138, 0.004, 8, 0x4a3424, p[0], p[1], 0, 0, 0, Math.atan2(-(q[0] - p[0]), q[1] - p[1])); }
  hd.add(new THREE.Mesh(hc.raw(), ironM));
  KS.spoutTip = new THREE.Vector3(kx + 0.262, KS_PLATE + 0.2, kz);
  // tap: chrome gooseneck out of the tiles, ending in a white rainwater filter cartridge; outlet stays at (b.x, 1.46, b.z) where the Fill stream starts
  const tc = new Chunk('tap', 'g0', { jit: 0 }), CHR = 0xdfe4e8, CHD = 0x7e868c;
  tc.cyl(0.034, 0.034, 0.012, 14, CHD, b.x, 1.3, -5.371, Math.PI / 2); tc.bar([b.x, 1.3, -5.37], [b.x, 1.3, -5.3], 0.026, CHR, 10); tc.ball(0.017, CHR, b.x, 1.3, -5.3, 1);
  tc.cyl(0.02, 0.02, 0.03, 10, CHD, b.x, 1.36, -5.3); tc.box(0.012, 0.03, 0.05, 0x2a5a8a, b.x, 1.36, -5.27); // valve + blue lever
  { let pv = [b.x, 1.3, -5.3]; const Z = [-5.3, -5.3, b.z, b.z], Y = [1.5, 1.605, 1.605, 1.555]; // riser, then a cubic gooseneck that clears the shelf LED
    const pts = [[b.x, 1.5, -5.3]]; for (let i = 1; i <= 12; i++) { const t = i / 12, u = 1 - t, k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]; pts.push([b.x, k[0] * Y[0] + k[1] * Y[1] + k[2] * Y[2] + k[3] * Y[3], k[0] * Z[0] + k[1] * Z[1] + k[2] * Z[2] + k[3] * Z[3]]); }
    for (const p of pts) { tc.bar(pv, p, 0.024, CHR, 10); tc.ball(0.012, CHR, p[0], p[1], p[2], 1); pv = p; } }
  tc.cyl(0.02, 0.022, 0.016, 12, CHD, b.x, 1.548, b.z); tc.cyl(0.03, 0.03, 0.06, 14, 0xf2f2ee, b.x, 1.51, b.z); tc.cyl(0.0305, 0.0305, 0.008, 14, 0x3a7ab8, b.x, 1.522, b.z); // collar, cartridge, blue band
  tc.cyl(0.026, 0.03, 0.006, 14, 0xd8d8d2, b.x, 1.477, b.z); tc.cyl(0.009, 0.012, 0.016, 10, CHR, b.x, 1.468, b.z); // cartridge foot + aerator (outlet ~1.46)
  g.add(new THREE.Mesh(tc.raw(), mat));
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 1, 6), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.65 })); stream.visible = false; g.add(stream); KS.stream = stream;
  // ---- kyusu: red clay side-handle pot, spout to -x (pours into the cups on its left), handle toward the front
  KS.kyHome = new THREE.Vector3(KS_LAY.kyusu[0], T, KS_LAY.kyusu[1]);
  const ky = new THREE.Group(); ky.position.copy(KS.kyHome); g.add(ky); KS.kyusu = ky;
  const KR = 0xa8442c, KRD = 0x7e2e1e, yc = new Chunk('ky', 'g0', { jit: 0.03 });
  ksLathe(yc, [[0, 0], [0.045, 0], [0.05, 0.006], [0.066, 0.024], [0.074, 0.05], [0.07, 0.074], [0.058, 0.092], [0.048, 0.099], [0.047, 0.104], [0, 0.104]], 20, KR, 0, 0, 0);
  yc.cyl(0.05, 0.05, 0.004, 20, KRD, 0, 0.105, 0); yc.cyl(0.032, 0.046, 0.012, 20, KR, 0, 0.112, 0); yc.cyl(0.006, 0.009, 0.012, 8, KR, 0, 0.123, 0); yc.ball(0.011, KRD, 0, 0.133, 0, 1, 1, 0.8, 1);
  yc.cyl(0.011, 0.019, 0.075, 10, KR, -0.088, 0.06, 0, 0, 0, 0.95); yc.cyl(0.0125, 0.0125, 0.006, 10, KRD, -0.118, 0.083, 0, 0, 0, 0.95);
  yc.cyl(0.012, 0.016, 0.105, 10, KR, 0, 0.06, 0.112, Math.PI / 2 - 0.22, 0, 0); yc.ball(0.013, KRD, 0, 0.072, 0.163, 1, 1, 1, 1);
  ky.add(new THREE.Mesh(yc.raw(), glossM));
  S0.box(0.2, 0.008, 0.17, 0x232a40, KS.kyHome.x + 0.01, T + 0.004, KS.kyHome.z + 0.03, 0, 0.12, 0); S0.box(0.2, 0.009, 0.012, 0x3a4462, KS.kyHome.x + 0.01, T + 0.0045, KS.kyHome.z + 0.1, 0, 0.12, 0); // navy cloth under it
  KS.timer = ledPanel(128, 128, 0.12); KS.timer.m.position.set(b.x + 0.2, b.y + 0.42, b.z - 0.02); g.add(KS.timer.m); KS.timer.m.visible = false;
  // ---- yuzamashi: larger white/celadon katakuchi (spouted) cooling bowl, spout to the front
  const bw = new Chunk('bw', 'g0', { jit: 0.015 }); const CEL = 0xb9cfb8;
  ksLathe(bw, [[0, 0], [0.042, 0], [0.046, 0.008], [0.064, 0.02], [0.08, 0.044], [0.088, 0.072], [0.089, 0.08], [0.083, 0.08], [0.079, 0.052], [0.062, 0.018], [0, 0.009]], 24, CEL, 0, 0, 0);
  bw.cone(0.02, 0.05, 8, CEL, 0, 0.068, 0.104, -Math.PI / 2 + 0.25, 0, 0); bw.torus(0.0885, 0.0028, 24, 0xe6ece0, 0, 0.08, 0, Math.PI / 2, 0, 0);
  const bowl = new THREE.Group(); bowl.add(new THREE.Mesh(bw.raw(), glossM)); bowl.position.set(KS_LAY.bowl[0], T, KS_LAY.bowl[1]); bowl.rotation.y = 0.35; g.add(bowl); KS.bowl = bowl;
  const bwt = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.056, 1, 18), new THREE.MeshStandardMaterial({ color: 0x9ac8e8, emissive: 0x10283a, transparent: true, opacity: 0.8, roughness: 0.08 })); bwt.position.y = 0.006; bwt.scale.y = 0.001; bowl.add(bwt); KS.bowlWater = bwt;
  // ---- roasted rice jar 玄米 (tips into the pot in the Rice step)
  KS.riceHome = new THREE.Vector3(KS_LAY.rice[0], T, KS_LAY.rice[1]);
  const rj = new Chunk('rj', 'g0', { jit: 0.02 }); ksLathe(rj, [[0, 0], [0.05, 0], [0.056, 0.012], [0.058, 0.11], [0.05, 0.128], [0.045, 0.14], [0.047, 0.146], [0.041, 0.146], [0.041, 0.13], [0, 0.13]], 18, 0xa0703c, 0, 0, 0); rj.torus(0.0565, 0.003, 18, 0x5a3a20, 0, 0.11, 0, Math.PI / 2, 0, 0);
  for (let i = 0; i < 26; i++) { const a = srand() * 7, r = Math.sqrt(srand()) * 0.036; rj.ball(0.0055, spick([0xc89a50, 0xb07a38, 0xd9b070, 0x8a5a2a]), Math.cos(a) * r, 0.132, Math.sin(a) * r, 0, 1, 0.6, 1); }
  const rjar = new THREE.Group(); rjar.add(new THREE.Mesh(rj.raw(), glossM)); rjar.position.copy(KS.riceHome); g.add(rjar); KS.riceJar = rjar;
  rjar.add(ksLabels(atlas, [{ w: 0.05, h: 0.075, m: M(0, 0.062, 0, 0, -0.5, 0), r: KS_ATLAS.rice, cr: 0.0595 }]));
  // ---- cups on a dark wood tray (show a little tea at rest; the Pour step starts them empty)
  KS.cupTray = new THREE.Group(); KS.cupTray.position.set(KS_LAY.tray[0], T, KS_LAY.tray[1]); g.add(KS.cupTray); layCups(); cupsDisplay();
  // ---- static worktop dressing, left → right
  // cutting board with wagashi and a knife (partly off the left edge of the view)
  at(S0, KS_LAY.board[0], T, KS_LAY.board[1], 0.12, () => {
    S0.box(0.32, 0.022, 0.21, 0xc89a62, 0, 0.011, 0); S0.box(0.3, 0.002, 0.19, 0xd4a86e, 0, 0.0225, 0); S0.cyl(0.008, 0.008, 0.024, 8, 0x8a6a42, 0.14, 0.011, -0.08, Math.PI / 2, 0, 0);
    SG.geo(gCyl(16, 0.8), 0xe8e2d4, M(KS_LAY.board[0] + 0.02, T + 0.028, KS_LAY.board[1] - 0.01, 0, 0, 0, 0.15, 0.01, 0.15));
    [[0.0, -0.02, 0xf0a8b8], [0.045, 0.01, 0xf2ece0], [-0.03, 0.035, 0x6a3a26], [0.03, 0.05, 0x9ab86a]].forEach(([dx, dz, col]) => { SG.ball(0.02, col, KS_LAY.board[0] + 0.02 + dx * Math.cos(0.12) + dz * Math.sin(0.12), T + 0.044, KS_LAY.board[1] - 0.01 + dz * Math.cos(0.12) - dx * Math.sin(0.12), 1, 1, 0.7, 1); });
    S0.box(0.13, 0.003, 0.026, 0xc8ccd2, -0.03, 0.026, 0.075, 0, 0.25, 0); S0.box(0.07, 0.012, 0.018, 0x1a1412, -0.125, 0.029, 0.1, 0, 0.25, 0);
  });
  // bamboo utensil cup (chashaku, scoops) + ceramic cup with thermometers
  { const ux = -1.86, uz = -5.3; S0.cyl(0.034, 0.034, 0.12, 12, C.bamboo, ux, T + 0.06, uz); S0.cyl(0.036, 0.036, 0.008, 12, 0x8a7240, ux, T + 0.07, uz); S0.cyl(0.031, 0.031, 0.002, 12, 0x2a2016, ux, T + 0.12, uz);
    [[0.012, 0.01, 0.2, 0xd4b878], [-0.012, 0.008, -0.2, 0xc9a866], [0.004, -0.014, 0.1, 0x8a6a3a], [-0.008, -0.004, -0.05, 0xe0c890], [0.016, -0.006, 0.28, 0x2a2420]].forEach(([dx, dz, tl, col], i) => { const h = 0.17 + i * 0.012; S0.bar([ux + dx, T + 0.02, uz + dz], [ux + dx + tl * 0.12, T + h, uz + dz + 0.01], i === 4 ? 0.007 : 0.006, col, 4); if (i === 1 || i === 3) S0.ball(0.011, col, ux + dx + tl * 0.12, T + h, uz + dz + 0.01, 0, 1, 0.5, 1.4); });
    const tx = -1.755, tz = -5.27; SG.cyl(0.034, 0.03, 0.095, 14, 0xe4e2dc, tx, T + 0.0475, tz); for (let i = 0; i < 8; i++) { const a = i * 0.8; SG.box(0.008, 0.008, 0.002, 0x3a5a8a, tx + Math.cos(a) * 0.033, T + 0.03 + (i % 3) * 0.02, tz + Math.sin(a) * 0.033, 0, -a + Math.PI / 2, 0); }
    S0.bar([tx - 0.008, T + 0.03, tz], [tx - 0.02, T + 0.22, tz + 0.01], 0.008, 0xf2f2ee, 6); S0.box(0.004, 0.09, 0.003, 0xc83a30, tx - 0.016, T + 0.15, tz + 0.006, 0, 0, 0.06); S0.bar([tx + 0.01, T + 0.03, tz], [tx + 0.022, T + 0.19, tz - 0.005], 0.006, 0xd8dcde, 6); S0.cyl(0.016, 0.016, 0.006, 12, 0xd8dcde, tx + 0.022, T + 0.19, tz - 0.002, Math.PI / 2 - 0.4, 0, 0); }
  // bamboo mat with the matcha set: raku chawan of bright matcha, chasen on its holder, chashaku, natsume, sifter
  { const [mx, mz] = KS_LAY.mat; at(S0, mx, T, mz, -0.08, () => { for (let i = 0; i < 13; i++) S0.box(0.27, 0.005, 0.0125, i % 2 ? 0xc8a868 : 0xb89656, 0, 0.0025, -0.084 + i * 0.014); S0.box(0.004, 0.006, 0.18, 0x6a5a3a, -0.1, 0.004, 0); S0.box(0.004, 0.006, 0.18, 0x6a5a3a, 0.1, 0.004, 0); });
    const cx = mx + 0.035, cz = mz + 0.01;
    ksLathe(SG, [[0, 0], [0.03, 0], [0.032, 0.008], [0.05, 0.014], [0.06, 0.04], [0.062, 0.066], [0.058, 0.068], [0.056, 0.042], [0.046, 0.02], [0, 0.016]], 16, 0x2c2622, cx, T + 0.004, cz);
    SG.cyl(0.054, 0.054, 0.002, 16, 0x8ccf3c, cx, T + 0.058, cz); SG.cyl(0.03, 0.03, 0.0025, 12, 0xa8e05a, cx + 0.008, T + 0.0585, cz - 0.006); SG.torus(0.0615, 0.003, 16, 0x4a3a2c, cx, T + 0.07, cz, Math.PI / 2, 0, 0);
    const hx = mx - 0.075, hz = mz + 0.04; SG.cyl(0.016, 0.02, 0.034, 12, 0xeeece4, hx, T + 0.021, hz); SG.ball(0.019, 0xeeece4, hx, T + 0.045, hz, 1, 1, 1.2, 1);
    S0.cyl(0.017, 0.028, 0.05, 14, 0xe0cc8a, hx, T + 0.06, hz); S0.cyl(0.012, 0.012, 0.048, 10, 0xc9a866, hx, T + 0.108, hz); S0.cyl(0.0125, 0.0125, 0.005, 10, 0x2a2016, hx, T + 0.09, hz);
    SG.cyl(0.026, 0.026, 0.05, 16, 0x101012, mx - 0.065, T + 0.03, mz - 0.045); SG.cyl(0.027, 0.027, 0.003, 16, 0xc9a24a, mx - 0.065, T + 0.042, mz - 0.045); SG.ball(0.026, 0x101012, mx - 0.065, T + 0.055, mz - 0.045, 1, 1, 0.3, 1);
    S0.bar([mx - 0.02, T + 0.012, mz + 0.075], [mx + 0.13, T + 0.008, mz + 0.03], 0.006, 0xd4b878, 4); S0.ball(0.008, 0xd4b878, mx - 0.022, T + 0.014, mz + 0.076, 0, 1, 0.5, 1.6);
    S0.cyl(0.028, 0.026, 0.024, 14, C.steel, mx + 0.1, T + 0.017, mz - 0.07); S0.cyl(0.024, 0.024, 0.002, 14, 0x5a6a3a, mx + 0.1, T + 0.029, mz - 0.07); S0.cyl(0.014, 0.014, 0.004, 8, C.steelD, mx + 0.1, T + 0.004, mz - 0.07); }
  // digital scale: steel pan + dish of leaves; LED reads grams (KS.scale.set)
  { const [sx, sz] = KS_LAY.scale; SG.box(0.13, 0.024, 0.15, 0x1c1d22, sx, T + 0.012, sz, 0, 0.1, 0); S0.box(0.11, 0.006, 0.11, 0xb8bcc2, sx + 0.002, T + 0.027, sz - 0.012, 0, 0.1, 0); S0.box(0.13, 0.02, 0.026, 0x14151a, sx + 0.006, T + 0.016, sz + 0.064, -0.5, 0.1, 0);
    SG.geo(gCyl(14, 0.75), 0xf2efe8, M(sx, T + 0.034, sz - 0.012, 0, 0, 0, 0.09, 0.012, 0.09)); for (let i = 0; i < 14; i++) { const a = srand() * 7, r = srand() * 0.03; S0.box(0.014, 0.003, 0.004, spick([0x3e5a24, 0x4a6a2a, 0x2e4a1c]), sx + Math.cos(a) * r, T + 0.041, sz - 0.012 + Math.sin(a) * r, 0, srand() * 3, 0); }
    const sl = ledPanel(96, 36, 0.028); sl.m.position.set(sx + 0.008, T + 0.026, sz + 0.07); sl.m.rotation.set(-0.5 - 0.6, 0.1, 0, 'YXZ'); g.add(sl.m);
    KS.scale = { led: sl, g: 0, set(gr) { this.g = gr; const x = sl.ctx; x.fillStyle = '#000'; x.fillRect(0, 0, sl.w, sl.h); x.font = `30px ${FONT_DOT}`; x.fillStyle = '#4fc8ff'; x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillText(gr.toFixed(1) + 'g', sl.w - 6, sl.h / 2 + 1); sl.tex.needsUpdate = true; } }; KS.scale.set(0); }
  // hourglass sand timer (KS.sand.set(f): f = fraction of the sand run through, 0..1)
  { const [hx, hz] = KS_LAY.sand, hg = new THREE.Group(); hg.position.set(hx, T, hz); g.add(hg);
    S0.cyl(0.036, 0.038, 0.01, 12, 0x5a3a24, hx, T + 0.005, hz); S0.cyl(0.036, 0.034, 0.01, 12, 0x5a3a24, hx, T + 0.125, hz); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.4; S0.cyl(0.004, 0.004, 0.11, 6, 0x4a2e1c, hx + Math.cos(a) * 0.029, T + 0.065, hz + Math.sin(a) * 0.029); }
    const gl = new Chunk('hgl', 'g0', { jit: 0 }); gl.cyl(0.004, 0.025, 0.055, 12, 0xd8eef4, 0, 0.0375, 0); gl.cyl(0.025, 0.004, 0.055, 12, 0xd8eef4, 0, 0.0925, 0);
    hg.add(new THREE.Mesh(gl.raw(), ksMat({ op: 0.28 })));
    const sm = new THREE.MeshLambertMaterial({ color: 0xe8c070, emissive: 0x3a2a10 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.004, 1, 12), sm), bot = new THREE.Mesh(new THREE.ConeGeometry(0.022, 1, 12), sm), sst = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.05, 4), sm);
    sst.position.y = 0.04; hg.add(top, bot, sst);
    KS.sand = { f: 1, set(f) { f = clamp(f, 0, 1); this.f = f; const ht = 0.044 * (1 - f); top.visible = ht > 0.001; top.scale.set(0.35 + 0.65 * (1 - f), Math.max(0.001, ht), 0.35 + 0.65 * (1 - f)); top.position.y = 0.067 + ht / 2; const hb = 0.004 + 0.034 * f; bot.scale.set(0.6 + 0.4 * f, hb, 0.6 + 0.4 * f); bot.position.y = 0.012 + hb / 2; sst.visible = f > 0 && f < 1; } }; KS.sand.set(1); }
  // tea tins at the right end + the label strip on everything
  [[-0.835, -5.31, 0x1e3a30, 0.17, KS_ATLAS.tin1], [-0.705, -5.3, 0x1a1a1e, 0.15, KS_ATLAS.tin2], [-0.66, -5.19, 0x2a4a44, 0.1, KS_ATLAS.tin3]].forEach(([x, z, col, h, lab]) => {
    const r = h > 0.12 ? 0.052 : 0.04; SG.cyl(r, r, h, 16, col, x, T + h / 2, z); SG.cyl(r + 0.002, r + 0.002, 0.026, 16, 0x8a8e94, x, T + h - 0.012, z); SG.cyl(r - 0.006, r - 0.006, 0.004, 16, 0x6a6e74, x, T + h + 0.002, z); SG.cyl(r + 0.001, r + 0.001, 0.006, 16, 0xc9a24a, x, T + 0.004, z);
    labels.push({ w: r * 1.05, h: h * 0.52, m: M(x, T + h * 0.46, z, 0, -0.55, 0), r: lab, cr: r + 0.0012 }); });
  g.add(new THREE.Mesh(S0.raw(), mat)); g.add(new THREE.Mesh(SG.raw(), glossM)); g.add(ksLabels(atlas, labels));
  // steam: a small pool of soft wispy sprites
  KS.steamTex = ksSteamTex(); KS.steam = [];
  for (let i = 0; i < 22; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: KS.steamTex, color: 0xf4f2ee, transparent: true, opacity: 0, depthWrite: false })); s.scale.set(0.06, 0.1, 1); s.visible = false; g.add(s); KS.steam.push({ s, t: 0, life: 1, on: false, k: 1, vx: 0 }); }
  KS.mat.userData.probe.value.setRGB(0.7, 0.52, 0.36);
  drawLED(KS.temp || 20, 0, 0, '');
}
function layCups() {
  KS.cupTray.clear(); KS.cups = []; const n = potCups(), cols = Math.min(3, n), rows = Math.ceil(n / 3); KS.trayCx = (cols - 1) * 0.055;
  const tc = new Chunk('tr', 'g0', { jit: 0.02 }), tw = 0.104 + (cols - 1) * 0.11, td = 0.06 + rows * 0.11, cz = -(rows - 1) * 0.055;
  tc.box(tw, 0.012, td, 0x2e1a12, KS.trayCx, 0.006, cz); for (const s of [-1, 1]) { tc.box(tw, 0.016, 0.012, 0x24140e, KS.trayCx, 0.014, cz + s * (td / 2 - 0.006)); tc.box(0.012, 0.016, td, 0x24140e, KS.trayCx + s * (tw / 2 - 0.006), 0.014, cz); }
  KS.cupTray.add(new THREE.Mesh(tc.raw(), KS.mat));
  const CUPC = [0xeeeae0, 0xc9d6bc, 0xe8dcc4, 0xdedad0, 0xb8c8b0, 0xece4d4];
  for (let i = 0; i < n; i++) {
    const cg = new THREE.Group(), cc = new Chunk('cp', 'g0', { jit: 0.01 }), col = CUPC[i % CUPC.length];
    ksLathe(cc, [[0, 0.012], [0.026, 0.012], [0.028, 0.02], [0.034, 0.026], [0.04, 0.06], [0.043, 0.093], [0.04, 0.094], [0.037, 0.062], [0.031, 0.024], [0, 0.018]], 16, col, 0, 0, 0);
    cc.torus(0.0425, 0.0016, 16, i % 2 ? 0x5a4a32 : 0x2a5a3a, 0, 0.0925, 0, Math.PI / 2);
    cg.add(new THREE.Mesh(cc.raw(), KS.glossM));
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 1, 14), new THREE.MeshLambertMaterial({ color: 0xb5c45e, emissive: 0x2a2a10 })); liq.position.y = 0.017; liq.scale.y = 0.001; cg.add(liq);
    cg.position.set((i % 3) * 0.11, 0.012, -Math.floor(i / 3) * 0.11); cg.userData.liq = liq; KS.cupTray.add(cg); KS.cups.push(cg);
  }
}
// cups at rest show a little tea (display); the Pour step resets them to empty
function cupsDisplay() { const T = [0xc4c86a, 0xa8c85a, 0xd2b55a]; KS.cups.forEach((c, i) => cupLiq(i, 0.7, T[i % 3])); }
function drawLED(temp, target, band, label) {
  const L = KS.led, x = L.ctx, W = L.w, H = L.h; x.clearRect(0, 0, W, H); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const lo = 20, hi = 100, X = t => 10 + (t - lo) / (hi - lo) * (W - 20);
  x.fillStyle = 'rgba(60,170,255,.2)'; x.fillRect(10, 60, W - 20, 10);
  if (target) { x.fillStyle = 'rgba(127,255,150,.6)'; x.fillRect(X(target - band), 57, X(target + band) - X(target - band), 16); }
  const k = clamp((temp - lo) / (hi - lo), 0, 1); const g = x.createLinearGradient(10, 0, W - 10, 0); g.addColorStop(0, '#3ab4ff'); g.addColorStop(0.6, '#ffb35c'); g.addColorStop(1, '#ff5a4a'); x.fillStyle = g; x.fillRect(10, 62, (W - 20) * k, 6);
  x.font = `46px ${FONT_DOT}`; x.fillStyle = target && Math.abs(temp - target) <= band ? '#9affb0' : '#4fc8ff'; x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText(Math.round(temp) + '°C', 6, 4);
  if (label) { x.font = `18px ${FONT_DOT}`; x.fillStyle = '#ffcf8f'; x.textAlign = 'right'; x.fillText(label, W - 6, 8); }
  L.tex.needsUpdate = true;
}
// Fill readout: the kettle is opaque iron, so the level is a % with the two target lines (84% .. 104%) on the bar
function drawFillLED(f) {
  const L = KS.led, x = L.ctx, W = L.w, H = L.h, MAX = 1.12, X = v => 10 + Math.min(v, MAX) / MAX * (W - 20); x.clearRect(0, 0, W, H); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const ok = f >= 0.84 && f <= 1.04, over = f > 1.04;
  x.font = `18px ${FONT_DOT}`; x.fillStyle = '#ffcf8f'; x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText('FILL', 8, 8);
  x.font = `44px ${FONT_DOT}`; x.fillStyle = over ? '#ff6a5a' : ok ? '#9affb0' : '#4fc8ff'; x.textAlign = 'right'; x.fillText(Math.round(f * 100) + '%', W - 6, 4);
  x.fillStyle = 'rgba(60,170,255,.2)'; x.fillRect(10, 60, W - 20, 10); x.fillStyle = 'rgba(127,255,150,.45)'; x.fillRect(X(0.84), 57, X(1.04) - X(0.84), 16);
  x.fillStyle = over ? '#ff6a5a' : '#3ab4ff'; x.fillRect(10, 62, X(f) - 10, 6);
  x.fillStyle = '#eaffef'; for (const v of [0.84, 1.04]) x.fillRect(X(v) - 1.5, 52, 3, 26);
  L.tex.needsUpdate = true;
}
function drawTimer(m, target, win) {
  const L = KS.timer, x = L.ctx, W = L.w, H = L.h; x.clearRect(0, 0, W, H); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 + 6, r = 44; const max = Math.max(target * 1.6, target + 1);
  x.lineWidth = 8; x.strokeStyle = 'rgba(51,228,255,.2)'; x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5); x.stroke();
  const a = t => -Math.PI / 2 + t / max * Math.PI * 2;
  x.strokeStyle = 'rgba(127,255,150,.7)'; x.lineWidth = 12; x.beginPath(); x.arc(cx, cy, r, a(target - win), a(target + win)); x.stroke();
  x.strokeStyle = m > target + win ? '#ff6a5a' : '#ffcf8f'; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, a(Math.min(m, max))); x.stroke();
  x.fillStyle = '#ede6d7'; x.font = `22px ${FONT_DOT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(fmtTea(m), cx, cy);
  x.font = `13px ${FONT_DOT}`; x.fillStyle = '#33e4ff'; x.fillText('STEEP ' + fmtTea(target), cx, 12);
  L.tex.needsUpdate = true;
}
// water level inside the iron kettle (only visible through the open mouth while the lid is off)
function kettleWater(f) { const w = KS.water; w.scale.y = Math.max(0.001, f * 0.152); w.position.y = 0.05 + w.scale.y / 2; w.visible = f > 0.01; }
function steamPuff(p, k, vx) { const s = KS.steam.find(q => !q.on); if (!s) return; s.on = true; s.t = 0; s.life = rand(1.0, 1.7); s.s.position.copy(p); s.s.position.x += rand(-0.008, 0.008); s.k = k || 1; s.vx = vx == null ? 0.05 : vx; s.rot = rand(-0.4, 0.4); s.s.material.rotation = s.rot; s.s.visible = true; }
function updateKettleFx(dt) {
  if (!KS.g) return;
  for (const s of KS.steam) { if (!s.on) continue; s.t += dt; const q = s.t / s.life; if (q >= 1) { s.on = false; s.s.visible = false; s.s.material.opacity = 0; continue; } s.s.position.y += dt * (0.2 + q * 0.08); s.s.position.x += (s.vx * (1 - q) + Math.sin(s.t * 2.6 + s.life * 4) * 0.025) * dt; s.s.material.rotation = s.rot + Math.sin(s.t * 1.7 + s.life) * 0.25; s.s.scale.set(0.045 + q * 0.14, 0.09 + q * 0.26, 1); s.s.material.opacity = Math.sin(Math.min(1, q * 3) * Math.PI * 0.5) * (1 - q) * 0.62 * s.k; }
  const temp = KS.temp || 20, hk = clamp((temp - 20) / 80, 0, 1);
  if (temp > 50 && Math.random() < dt * (temp - 48) * 0.28) steamPuff(KS.spoutTip, clamp((temp - 45) / 45, 0.25, 1), 0.07);
  if (KS.steepOn && Math.random() < dt * 4) steamPuff(new THREE.Vector3(KS.kyusu.position.x, KS.kyusu.position.y + 0.14, KS.kyusu.position.z), 0.6, 0);
  // induction ring: dim standby blue, brighter as the water heats (and while the plate is on)
  const on = KS.heating ? 0.45 + 0.12 * Math.sin(time * 5) : 0, ri = 0.45 + hk * 1.1 + on; KS.ring.material.color.setRGB(0.12 * ri, 0.45 * ri, 1.0 * ri); KS.ringGlow.material.opacity = 0.1 + hk * 0.35 + on * 0.4;
  // lid off / bail handle folded back while filling
  KS.lidK = clamp(KS.lidK + (KS.lidOff ? dt : -dt) * 2.8, 0, 1); const lk = KS.lidK, e = lk * lk * (3 - 2 * lk);
  KS.lid.position.set(lerp(0, 0.2, e), lerp(0.222, 0.044, e) + Math.sin(e * Math.PI) * 0.12, lerp(0, -0.27, e)); KS.lid.rotation.x = 1.3 * e; KS.handle.rotation.x = -1.25 * Math.min(1, e * 1.6);
  if (KS.water.scale.y <= 0.002) KS.water.visible = false;
  // idle temp drift + idle readout
  if (!ST.cur || ST.cur.id !== 'kettle') { KS.temp = damp(temp, 20, 0.05, dt); KS.ledT = (KS.ledT || 0) + dt; if (KS.ledT > 0.5) { KS.ledT = 0; drawLED(KS.temp, 0, 0, ''); } }
}
function cupLiq(i, f, col) { const c = KS.cups[i]; if (!c) return; const l = c.userData.liq; l.scale.y = Math.max(0.001, f * 0.072); l.position.y = 0.017 + l.scale.y / 2; if (col != null) { l.material.color.set(col); l.material.emissive.set(col).multiplyScalar(0.3); } }
function startKettle(rid, opts) {
  opts = opts || {}; const R = RECIPES[rid]; const b = KS.base; layCups(); KS.cups.forEach((c, i) => cupLiq(i, 0, R.liq));
  const n = potCups(); const need = n * 0.25;
  if (S.water < need * 0.6 && !opts.free) { toast(`The barrels are low (${S.water.toFixed(1)} L). Wait for more rain, or add barrels and gutters.`); return; }
  if (R.roast && S.roasted < 1 && !opts.free) { toast('No roasted hōjicha left. Roast a batch in the pan on the yatai.'); return; }
  if (!R.roast && S.leaves < 1 && !opts.free) { toast('Out of tea leaves. Order more on Kumo Supply' + (S.ch >= 4 ? ', or harvest the garden.' : '.')); return; }
  const scores = []; const st = { id: 'kettle', title: `${R.jp} ${R.name}`, si: 0, rid, glance: true, cam: { pos: new THREE.Vector3(b.x + 0.12, b.y + 0.62, b.z + 0.78), at: new THREE.Vector3(b.x + 0.06, b.y + 0.1, b.z + 0.02), fov: 0.86 } };
  let fill = 0, temp = KS.temp = Math.max(20, KS.temp || 20), m = 0, cupI = 0, cupF = 0, heatOn = false, rice = 0;
  const maxFill = Math.min(1.12, (opts.free ? 99 : S.water) / need);
  const sc = (v) => { scores.push(clamp(v, 0, 1)); };
  const steps = [];
  steps.push({ label: 'Fill', hint: 'The lid is off. Hold the mouse (or Space) to run the tap. Let go between the two white lines on the blue readout.', hintT: 'Hold the pad to run the tap. Let go between the two white lines on the readout.', pad: () => ST.padDown ? 'Filling…' : 'Hold to fill', holdPad: true, botDone: () => fill >= 0.9,
    start() { KS.lidOff = true; }, down() { Snd.loopStart('pourL', 1300, 0.9, 0.08); KS.stream.visible = true; }, up() { Snd.loopStop('pourL'); KS.stream.visible = false; if (fill < 0.1) { st.note = 'Hold it down to let the water run.'; fill = 0; return; } KS.lidOff = false; const f = fill; sc(f > 1.04 ? 0.4 : f >= 0.84 ? 1 : 1 - (0.84 - f) / 0.35); st.note = f > 1.04 ? 'A little over the line.' : f >= 0.84 ? 'Right on the line.' : 'A little short.'; if (!opts.free) S.water = Math.max(0, S.water - Math.min(f, 1.1) * need); nextStep(st); },
    update(dt) { if (ST.padDown) { fill = Math.min(maxFill, fill + dt * 0.36); if (fill >= maxFill && maxFill < 1) { st.note = 'The barrels ran dry.'; ST.padDown = false; this.up(); } } kettleWater(fill); const wy = KS.kettle.position.y + KS.water.position.y + KS.water.scale.y / 2; KS.stream.position.set(b.x, (1.45 + wy) / 2, b.z); KS.stream.scale.y = 1.45 - wy; Snd.loopFreq('pourL', 900 + fill * 1400); drawFillLED(fill); } });
  steps.push({ label: 'Heat', hint: `Click (or Space) to lift the kettle off at ${R.cool ? 80 : R.temp}°C. The green band on the readout is your target.`, hintT: `Tap when the readout reaches ${R.cool ? 80 : R.temp}°C, inside the green band.`, pad: 'Lift the kettle', botReady: () => temp >= (R.cool ? 80 : R.temp) - 0.8,
    start() { heatOn = true; KS.heating = true; KS.lidOff = false; Snd.loopStart('hissL', 600, 0.6, 0.0); }, down() { const tgt = R.cool ? 80 : R.temp; const d = Math.abs(temp - tgt); sc(1 - d / wide(9)); st.note = d < wide(2.5) ? 'Perfect temperature.' : temp < tgt ? `A bit cool at ${Math.round(temp)}°C.` : `A bit hot at ${Math.round(temp)}°C.`; heatOn = false; KS.heating = false; Snd.loopStop('hissL'); Snd.soft(); nextStep(st); },
    update(dt) { if (heatOn) { temp += (7 + (temp - 20) * 0.22) * dt; if (temp >= 100) { temp = 100; sc(0.15); st.note = 'It boiled hard. The tea may turn bitter.'; heatOn = false; KS.heating = false; Snd.loopStop('hissL'); Snd.whistle(); nextStep(st); } Snd.loopFreq('hissL', 300 + temp * 12); if (Snd.hissL) Snd.hissL.g.gain.setTargetAtTime(Math.max(0, (temp - 40) / 60) * 0.06, Snd.ctx.currentTime, 0.2); } KS.temp = temp; drawLED(temp, R.cool ? 80 : R.temp, wide(3), 'HEAT'); } });
  if (R.cool) steps.push({ label: 'Cool', hint: 'The water is pouring into the cooling bowl. Click when it drops to 60°C.', hintT: 'Tap when the cooling bowl reaches 60°C.', pad: 'Pour into the pot', botReady: () => temp <= 60.6,
    start() { KS.bowlWater.scale.y = 0.045; KS.bowlWater.position.y = 0.006 + 0.0225; Snd.pour(); }, down() { const d = Math.abs(temp - 60); sc(1 - d / wide(8)); st.note = d < wide(2.5) ? 'Just right for gyokuro.' : temp > 60 ? 'Still a little hot.' : 'A touch cool.'; KS.bowlWater.scale.y = 0.001; nextStep(st); },
    update(dt) { temp -= (2.5 + (temp - 20) * 0.06) * dt; if (temp < 40) { sc(0.2); st.note = 'It went cold.'; KS.bowlWater.scale.y = 0.001; nextStep(st); } KS.temp = temp; drawLED(temp, 60, wide(2.5), 'COOL'); } });
  if (R.rice) steps.push({ label: 'Rice', hint: 'Hold to tip roasted rice into the pot. Let go at one scoop.', hintT: 'Hold to tip the rice in. Let go at one scoop.', pad: () => ST.padDown ? 'Pouring rice…' : 'Hold to add rice', holdPad: true, botDone: () => rice >= 0.98,
    down() { Snd.loopStart('pourL', 3200, 2, 0.05); KS.riceJar.rotation.z = -1.05; KS.riceJar.position.set(KS.kyusu.position.x - 0.15, KS.kyusu.position.y + 0.1, KS.kyusu.position.z); }, up() { Snd.loopStop('pourL'); KS.riceJar.rotation.z = 0; KS.riceJar.position.copy(KS.riceHome); if (rice < 0.1) { st.note = 'Hold to pour.'; rice = 0; return; } sc(1 - Math.abs(rice - 1) / wide(0.6)); st.note = Math.abs(rice - 1) < wide(0.18) ? 'One neat scoop.' : rice > 1 ? 'A heavy hand with the rice.' : 'Not quite a scoop.'; nextStep(st); },
    update(dt) { if (ST.padDown) rice += dt * 0.7; const L = KS.led, x = L.ctx; x.fillStyle = '#000'; x.fillRect(0, 0, L.w, L.h); x.font = `26px ${FONT_DOT}`; x.fillStyle = '#ffcf8f'; x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText('RICE ' + rice.toFixed(1), 8, 4); x.fillStyle = 'rgba(127,255,150,.55)'; x.fillRect(10 + 0.82 / 1.6 * (L.w - 20), 40, 0.36 / 1.6 * (L.w - 20), 12); x.fillStyle = '#ffb35c'; x.fillRect(10, 43, Math.min(1, rice / 1.6) * (L.w - 20), 6); L.tex.needsUpdate = true; } });
  steps.push({ label: 'Steep', hint: `The leaves are steeping. Click when the timer is in the green window (${fmtTea(R.steep)}).`, hintT: `Tap when the timer is in the green window (${fmtTea(R.steep)}).`, pad: 'Decant now', botReady: () => m >= R.steep,
    start() { Snd.pour(); KS.steepOn = true; KS.timer.m.visible = true; KS.water.scale.y = 0.001; KS.kettle.rotation.z = 0; if (!opts.free) { if (R.roast) S.roasted = Math.max(0, S.roasted - 1); else S.leaves = Math.max(0, S.leaves - 1); } }, down() { const d = Math.abs(m - R.steep); sc(1 - d / wide(0.75)); st.note = d < wide(0.2) ? 'Steeped perfectly.' : m < R.steep ? 'A little weak.' : 'A little strong.'; KS.steepOn = false; KS.timer.m.visible = false; stMeter(null); nextStep(st); },
    update(dt) { m += dt / TEA_MIN; if (m > R.steep * 1.6 + 0.5) { sc(0.1); st.note = 'Steeped far too long.'; KS.steepOn = false; KS.timer.m.visible = false; stMeter(null); nextStep(st); } drawTimer(m, R.steep, wide(0.2)); drawLED(temp, 0, 0, 'STEEP'); stMeter(m, R.steep - wide(0.2), R.steep + wide(0.2), Math.max(R.steep * 1.6, R.steep + 1), `${fmtTea(m)} / ${fmtTea(R.steep)}`, m > R.steep + wide(0.2)); } });
  steps.push({ label: 'Pour', hint: 'Hold to pour into each cup. Let go at the green line. Then the next cup.', hintT: 'Hold to pour each cup. Let go at the line.', pad: () => ST.padDown ? `Pouring cup ${cupI + 1}…` : `Hold to pour cup ${cupI + 1} of ${n}`, holdPad: true, botDone: () => cupF >= 0.8,
    start() { cupI = 0; cupF = 0; const c0 = new THREE.Vector3(); KS.cupTray.getWorldPosition(c0); c0.x += KS.trayCx; player.focus.tpos = new THREE.Vector3(c0.x + 0.15, c0.y + 0.55, c0.z + 0.62); player.focus.tat = new THREE.Vector3(c0.x + 0.05, c0.y + 0.06, c0.z); }, down() { Snd.loopStart('pourL', 1100, 1, 0.07); }, up() { Snd.loopStop('pourL'); if (cupF < 0.08) return; const d = cupF > 0.95 ? 0.5 : 1 - Math.abs(cupF - 0.82) / wide(0.4); st.cupS = (st.cupS || 0) + clamp(d, 0, 1); cupI++; cupF = 0; KS.kyusu.rotation.z = 0; if (cupI >= n) { sc(st.cupS / n); st.note = ''; nextStep(st); } },
    update(dt) { if (ST.padDown && cupI < n) { cupF = Math.min(1.1, cupF + dt * 0.55); cupLiq(cupI, Math.min(1, cupF), R.liq); const cp = KS.cups[cupI]; const wp = new THREE.Vector3(); cp.getWorldPosition(wp); KS.kyusu.position.lerp(new THREE.Vector3(wp.x + 0.1, b.y + 0.16, wp.z), 0.2); KS.kyusu.rotation.z = lerp(KS.kyusu.rotation.z, 0.9, 0.2); if (cupF >= 1.1) { this.up(); } } else { KS.kyusu.rotation.z = lerp(KS.kyusu.rotation.z, 0, 0.2); } } });
  st.steps = steps;
  st.enter = () => { KS.cups.forEach((c, i) => cupLiq(i, 0, R.liq)); steps[0].start && steps[0].start(); };
  st.finish = () => {
    const avg = scores.reduce((a, v) => a + v, 0) / Math.max(1, scores.length); const stars = avg >= 0.8 ? 3 : avg >= 0.5 ? 2 : 1;
    S.stats.brews++; if (stars === 3) S.mastery[R.id] = Math.min(MASTER_N, (S.mastery[R.id] || 0) + 1);
    st.note = ['', 'A weak pot.', 'A good pot.', 'A perfect pot.'][stars]; Snd.chime(); stUI.hint.textContent = st.note;
    setTimeoutG(() => { endStation({ rid, n, stars }); }, 700);
  };
  st.exit = (res) => { KS.kyusu.position.copy(KS.kyHome); KS.kyusu.rotation.z = 0; KS.lidOff = false; KS.heating = false; KS.riceJar.rotation.z = 0; KS.riceJar.position.copy(KS.riceHome); KS.bowlWater.scale.y = 0.001; KS.timer.m.visible = false; KS.steepOn = false; KS.stream.visible = false; kettleWater(0); cupsDisplay(); if (res) { holdItem({ kind: 'tray', n: res.n, rid: res.rid, stars: res.stars }); if (opts.done) opts.done(res); if (S.mastery[RECIPES[res.rid].id] === MASTER_N && !S.flags['mast_' + res.rid]) { S.flags['mast_' + res.rid] = 1; toast(`${RECIPES[res.rid].name} mastered. ${S.staff.rin ? 'Rin can brew it now.' : 'Staff can brew it once hired.'}`); } } };
  startStation(st);
}

/* ================= install jobs ================= */
const JOB_NAMES = { bolt: 'Bolt it', wire: 'Wire it', align: 'Align it', hang: 'Hang it', place: 'Place it' };
function startJob(kind, o) {
  // o: {title, cam:{pos,at}, n, done(), spot}
  const st = { id: 'job', title: o.title, si: 0, cam: o.cam, glance: false, cancel: o.cancel };
  const done = () => { Snd.build(); setTimeoutG(() => { endStation(true); if (o.done) o.done(); }, 450); };
  if (kind === 'bolt') {
    const n = o.n || 4; let i = 0, torque = 0, driving = false; const bolts = []; const g = new THREE.Group(); scene.add(g); st.g = g;
    const pts = o.points || Array.from({ length: n }, (_, k) => o.spot.clone().add(new THREE.Vector3((k - (n - 1) / 2) * 0.22, 0, 0)));
    for (const p of pts) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.4, 0.6) })); m.position.copy(p); m.rotation.x = o.boltRot || Math.PI / 2; g.add(m); bolts.push(m); }
    const ring = ledPanel(128, 40, 0.05); g.add(ring.m);
    st.steps = pts.map((p, k) => ({ label: `Bolt ${k + 1}`, hint: 'Hold to drive the bolt. Let go when the torque is in the green.', pad: () => ST.padDown ? 'Driving…' : 'Hold to drive', holdPad: true,
      start() { torque = 0; }, down() { driving = true; Snd.drill(); }, up() { driving = false; if (torque < 0.15) return; if (torque > 0.9) { st.note = 'Overdriven. Back it out and try again.'; torque = 0; Snd.miss(); return; } if (torque < 0.62) { st.note = 'Not tight yet.'; Snd.miss(); torque = 0; return; } st.note = ''; bolts[k].material.color.setRGB(0.5, 1.6, 0.8); Snd.knock(); i++; HANDS.dip = 1; nextStep(st); },
      update(dt) { if (driving) { torque += dt * 0.55; if (frameN % 8 === 0) Snd.drill(); bolts[k].rotation.y += dt * 20; } ring.m.position.copy(pts[k]).add(new THREE.Vector3(0, 0.1, 0.02)); ring.m.lookAt(camera.position); const x = ring.ctx; x.fillStyle = '#000'; x.fillRect(0, 0, 128, 40); x.fillStyle = 'rgba(51,228,255,.2)'; x.fillRect(6, 14, 116, 12); x.fillStyle = 'rgba(127,255,150,.6)'; x.fillRect(6 + 116 * 0.62, 12, 116 * 0.28, 16); x.fillStyle = torque > 0.9 ? '#ff5a4a' : '#ffb35c'; x.fillRect(6, 16, 116 * Math.min(1, torque), 8); ring.tex.needsUpdate = true; bolts[k].material.color.setRGB(2 + Math.sin(time * 8) * 0.5, 1.4, 0.6); } }));
    st.finish = done; st.exit = () => { scene.remove(g); };
  } else if (kind === 'align' || kind === 'hang') {
    const reps = kind === 'hang' ? 2 : 1; let ph = 0; const g = new THREE.Group(); scene.add(g); st.g = g;
    const box = new THREE.BoxGeometry(o.size ? o.size[0] : 0.4, o.size ? o.size[1] : 0.3, o.size ? o.size[2] : 0.05);
    let piece; if (o.model) { const c = new Chunk('jobPiece', 'g0', { jit: 0.02 }); o.model(c); const pm = personMat(); probeAt(o.spot, zoneAt(o.spot), pm.userData.probe.value); piece = new THREE.Mesh(c.raw(), pm); } else piece = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.9, 0.5), transparent: true, opacity: 0.55, depthWrite: false }));
    g.add(piece); const okCol = () => { if (!o.model) piece.material.color.setRGB(0.5, 1.6, 0.8); }, baseCol = () => { if (!o.model) piece.material.color.setRGB(1.2, 0.9, 0.5); };
    const target = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: new THREE.Color(0.5, 1.5, 1.8), transparent: true, opacity: 0.8 })); target.position.copy(o.spot); g.add(target); const ax = o.axis || new THREE.Vector3(1, 0, 0);
    st.steps = Array.from({ length: reps }, (_, k) => ({ label: kind === 'hang' ? `Hook ${k + 1}` : 'Line it up', hint: kind === 'hang' ? 'It swings as you lift it. Click when it lines up with the outline.' : 'It sways as you hold it. Click when it sits inside the outline.', hintT: 'Tap when it lines up with the outline.', pad: kind === 'hang' ? 'Hook it' : 'Set it',
      start() { ph = rand(0, 6); }, down() { const off = Math.sin(ph) * 0.35; if (Math.abs(off) < wide(0.06)) { st.note = ''; Snd.knock(); HANDS.dip = 1; okCol(); setTimeoutG(baseCol, 300); nextStep(st); } else { st.note = 'Not quite. Wait for it to line up.'; Snd.miss(); } },
      update(dt) { ph += dt * (2.2 + k * 0.5) * (SET.relaxed ? 0.7 : 1); const off = Math.sin(ph) * 0.35; piece.position.copy(o.spot).addScaledVector(ax, off); piece.position.y += kind === 'hang' ? Math.abs(off) * 0.2 : 0; const inb = Math.abs(off) < wide(0.06); target.material.color.setRGB(inb ? 0.5 : 0.5, inb ? 1.9 : 1.5, inb ? 0.7 : 1.8); if (kind === 'hang') piece.rotation.z = off * 0.25; } }));
    st.finish = done; st.exit = () => { scene.remove(g); };
  } else if (kind === 'wire') {
    // a junction box: drag each cable end to the socket with the same colour and symbol
    const cols = ['#ff5a4a', '#33e4ff', '#ffe05a', '#8fd16a'].slice(0, o.n || 3); const syms = ['●', '▲', '■', '◆'];
    const order = cols.map((_, i) => i).sort(() => Math.random() - 0.5); let joined = new Set(); let drag = null;
    const cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;left:50%;top:46%;transform:translate(-50%,-50%);z-index:7;border-radius:16px;touch-action:none;background:rgba(11,16,34,.9);border:1px solid rgba(51,228,255,.4);box-shadow:0 0 30px rgba(51,228,255,.15)';
    const W = Math.min(340, vw - 30), H = 260; cv.width = W * 2; cv.height = H * 2; cv.style.width = W + 'px'; cv.style.height = H + 'px'; const x = cv.getContext('2d'); x.scale(2, 2); document.body.appendChild(cv);
    const L = i => ({ x: 46, y: 50 + i * (H - 90) / Math.max(1, cols.length - 1) }), R = j => ({ x: W - 46, y: 50 + j * (H - 90) / Math.max(1, cols.length - 1) });
    const draw = () => { x.clearRect(0, 0, W, H); x.font = `13px ${FONT_DOT}`; x.fillStyle = '#33e4ff'; x.textAlign = 'center'; x.fillText('JUNCTION BOX · ' + (o.label || 'WIRING'), W / 2, 22);
      cols.forEach((c, i) => { const a = L(i); const j = order.indexOf(i); const b = R(j); if (joined.has(i)) { x.strokeStyle = c; x.lineWidth = 5; x.beginPath(); x.moveTo(a.x, a.y); x.bezierCurveTo(W / 2, a.y, W / 2, b.y, b.x, b.y); x.stroke(); }
        x.fillStyle = c; x.beginPath(); x.arc(a.x, a.y, 14, 0, 7); x.fill(); x.fillStyle = '#0b1022'; x.font = '14px sans-serif'; x.fillText(syms[i], a.x, a.y + 5); x.strokeStyle = cols[order[i]]; x.lineWidth = 3; x.beginPath(); x.arc(R(i).x, R(i).y, 15, 0, 7); x.stroke(); x.fillStyle = cols[order[i]]; x.fillText(syms[order[i]], R(i).x, R(i).y + 5); });
      if (drag) { x.strokeStyle = cols[drag.i]; x.lineWidth = 5; x.beginPath(); x.moveTo(L(drag.i).x, L(drag.i).y); x.lineTo(drag.x, drag.y); x.stroke(); } };
    const pos = e => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] || e.changedTouches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; };
    const dn = e => { e.preventDefault(); e.stopPropagation(); const p = pos(e); cols.forEach((_, i) => { if (!joined.has(i) && Math.hypot(p.x - L(i).x, p.y - L(i).y) < 26) drag = { i, x: p.x, y: p.y }; }); draw(); };
    const mv = e => { if (!drag) return; e.preventDefault(); const p = pos(e); drag.x = p.x; drag.y = p.y; draw(); };
    const up = e => { if (!drag) return; const p = pos(e); const j = order.indexOf(drag.i); const b = R(j); if (Math.hypot(p.x - b.x, p.y - b.y) < 28) { joined.add(drag.i); Snd.zap(); HANDS.dip = 1; if (joined.size === cols.length) { st.note = 'All connected.'; draw(); setTimeoutG(() => nextStep(st), 250); } } else { Snd.miss(); } drag = null; draw(); };
    cv.addEventListener('mousedown', dn); cv.addEventListener('touchstart', dn, { passive: false }); addEventListener('mousemove', mv); cv.addEventListener('touchmove', mv, { passive: false }); addEventListener('mouseup', up); cv.addEventListener('touchend', up);
    st.pointer = () => true; draw();
    st.steps = [{ label: 'Connect', hint: 'Drag each cable to the socket with the same colour and symbol.' }];
    st.finish = done; st.exit = () => { cv.remove(); removeEventListener('mousemove', mv); removeEventListener('mouseup', up); };
  } else { // place
    st.steps = [{ label: 'Place', hint: 'Set it down.', pad: 'Set it down', down() { Snd.knock(); nextStep(st); } }];
    st.finish = done;
  }
  startStation(st);
}

