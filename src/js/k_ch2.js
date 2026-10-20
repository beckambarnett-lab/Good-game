/* ================= chapter hooks (shared) ================= */
const HOOK = { seats: [], upos: [], apply: [], chapter: [], hire: [], init: [], update: [], upper: [], serve: [], waypoints: [] };
function extraSeats(s) { for (const f of HOOK.seats) f(s); }
function UPOS2(id) { for (const f of HOOK.upos) { const r = f(id); if (r) return r; } return null; }
function applyUpgrade2(id) { for (const f of HOOK.apply) f(id); }
function startChapter2(n) { for (const f of HOOK.chapter) f(n); }
function onHire2(id) { for (const f of HOOK.hire) f(id); }
function initGame2() { for (const f of HOOK.waypoints) f(); refreshSeats(); for (const f of HOOK.init) f(); }
function updateGame2(dt) { for (const f of HOOK.update) f(dt); }
function buildUpper() { for (const f of HOOK.upper) f(); }
function onServeHook(c, stars) { for (const f of HOOK.serve) f(c, stars); }
function preWorld() { }
const F2 = 3.6, F3 = 6.8, FR = 10;
const Vv = (x, y, z) => new THREE.Vector3(x, y, z);
/* ---------- generic renovation sequence ---------- */
function renovate(ch) {
  if (RENO[ch] === 'finale') { startFinale(); return; }
  const R = RENO[ch]; if (!R) { toast('Nothing to renovate.'); return; }
  releasePointer(); fadeTo(1, () => {
    R.build(); if (R.pos) { player.pos.copy(R.pos); player.yaw = R.yaw || 0; player.pitch = 0; player.vel.set(0, 0); }
    if (R.crew) R.crew(); fadeTo(0); setTask(R.task, R.target || null); save();
    say(R.intro || [], () => { if (R.job) R.job(() => { say(R.outro || [], () => { crewHome(); startChapter(ch + 1); }, lookCrew); }); }, lookCrew);
  }, 500);
}
const RENO = {};
// after a job, the crew walk home: Gen to his soba shop, the others off down the street
function crewHome() { ['gen', 'mako', 'tomo', 'hana'].forEach((id, k) => { if (!CREW[id]) return; setTimeoutG(() => { if (!CREW[id]) return; crewProp(id, id === 'mako' ? 'toolbox' : null); crewWalk(id, id === 'gen' ? [-4.3, 0.12, 0.9, 0, null] : [k % 2 ? -26 : 26, 0.12, 1.3, 0, null], () => { if (id !== 'gen') despawnCrew(id); }); }, 400 + k * 700); }); }
/* ================= Chapter 2: the tatami room ================= */
const TATAMI = [0x6a3a3a, 0x2c3c6e, 0x3a5a4a, 0x5a2a4a, 0x7a5a2a];
function buildF2() {
  reseed(2002); clearAnchors('f2'); clearTag('f2furn');
  const g = part('f2'); const ch = new Chunk('f2furn', 'f2'), em = new Chunk('f2Em', 'f2', { emis: true }); const open = S.ch >= 2;
  if (!open) {
    // storage: boxes, sheets, darkness; stairs roped off below
    for (let i = 0; i < 9; i++) P.cardboard(ch, srange(-2.2, 1.5), F2 + (i > 5 ? 0.35 : 0), srange(-5.5, -0.8), srange(-0.3, 0.3), srange(0.4, 0.7), 0.35, srange(0.35, 0.5));
    ch.box(2.0, 0.8, 1.2, 0xd8cdb4, -1.2, F2 + 0.4, -3.0, 0, 0.2, 0); ch.box(2.1, 0.04, 1.3, 0xd8cdb4, -1.2, F2 + 0.81, -3.0, 0.04, 0.2, 0.05);
    tagA(anchor(-0.8, F2 + 1.8, 0.5, 0x6a7ab0, 0.5, 4, ['f2'], 0.4), 'f2');
    addBuilt(g, ch); return;
  }
  // tatami floor
  for (let x = -2.5; x < 1.85; x += 0.9) for (let z = -6.0; z < -0.25; z += 1.8) { const w = Math.min(0.9, 1.9 - x), d = Math.min(1.8, -0.2 - z); ch.box(w - 0.015, 0.05, d - 0.015, new THREE.Color(C.tatami).multiplyScalar(srange(0.92, 1.05)).getHex(), x + w / 2, F2 + 0.025, z + d / 2); ch.box(w - 0.01, 0.052, 0.04, C.tatamiB, x + w / 2, F2 + 0.026, z + 0.02); ch.box(w - 0.01, 0.052, 0.04, C.tatamiB, x + w / 2, F2 + 0.026, z + d - 0.02); }
  plankFloor(ch, 1.9, 2.5, -6.0, -0.2, F2 + 0.02, [], C.cedar, 0.18);
  // walls: washi lower panels, posts, nageshi beam
  ch.box(3.23, 0.06, 0.04, C.cedarD, -0.885, F2 + 2.15, -0.24); ch.box(0.53, 0.06, 0.04, C.cedarD, 2.235, F2 + 2.15, -0.24); // nageshi, broken by the balcony door casing
  for (let z = -0.6; z > -5.9; z -= 0.9) { ch.box(0.08, 3.0, 0.08, C.cedarD, -2.46, F2 + 1.5, z); ch.box(0.08, 3.0, 0.08, C.cedarD, 2.46, F2 + 1.5, z); }
  ch.box(0.04, 0.06, 5.8, C.cedarD, -2.46, F2 + 2.15, -3.1); ch.box(0.04, 0.06, 5.8, C.cedarD, 2.46, F2 + 2.15, -3.1); ch.box(5.0, 0.06, 0.04, C.cedarD, 0, F2 + 2.15, -5.98);
  for (const [x, z, w, d] of [[-2.47, -3.1, 0.02, 5.6], [2.47, -4.6, 0.02, 2.6]]) ch.box(w, 0.6, d, C.washi, x, F2 + 0.35, z);
  // ceiling lattice
  ch.box(5.0, 0.03, 5.8, 0x6a5038, 0, F2 + 2.98, -3.1); for (let x = -2.4; x < 2.5; x += 0.45) ch.box(0.03, 0.04, 5.8, C.cedarD, x, F2 + 2.95, -3.1); ch.box(5.0, 0.05, 0.05, C.cedarD, 0, F2 + 2.95, -3.1);
  // tokonoma alcove
  ch.box(1.2, 0.14, 0.9, C.walnut, -1.9, F2 + 0.07, -5.5); ch.box(0.08, 2.9, 0.08, 0x8a6a48, -1.3, F2 + 1.45, -5.06); ch.box(1.2, 0.08, 0.1, C.cedarD, -1.9, F2 + 2.2, -5.06); ch.box(1.18, 2.0, 0.02, 0xc8b898, -1.9, F2 + 1.15, -5.96);
  if (lv('scroll')) { ch.box(0.4, 1.3, 0.01, 0xefe4cc, -1.9, F2 + 1.3, -5.94); ch.box(0.46, 0.03, 0.03, C.cedarD, -1.9, F2 + 1.97, -5.93); ch.box(0.46, 0.03, 0.03, C.cedarD, -1.9, F2 + 0.64, -5.93); const sc = printedMesh(panelTex(64, 192, (x) => { x.fillStyle = '#efe4cc'; x.fillRect(0, 0, 64, 192); x.fillStyle = '#1b1b1b'; x.font = `40px ${FONT_CHALK}`; x.textAlign = 'center'; '雨聴'.split('').forEach((c, i) => x.fillText(c, 32, 70 + i * 52)); }), 0.3, 0.9, true); sc.position.set(-1.9, F2 + 1.3, -5.92); g.add(sc); }
  if (lv('ikebana')) { ch.cyl(0.1, 0.07, 0.2, 10, 0x2a2a30, -1.75, F2 + 0.24, -5.5); for (let i = 0; i < 5; i++) ch.bar([-1.75, F2 + 0.34, -5.5], [-1.75 + srange(-0.25, 0.25), F2 + srange(0.7, 1.1), -5.5 + srange(-0.15, 0.15)], 0.012, 0x4a3a2a); for (let i = 0; i < 7; i++) ch.ball(0.04, spick([0xd77aa0, 0xefe4cc, 0xc2362b]), -1.75 + srange(-0.25, 0.25), F2 + srange(0.75, 1.1), -5.5 + srange(-0.12, 0.12), 0); }
  // round window (inside frame) + lattice
  ch.torus(1.0, 0.09, 28, C.cedarD, -0.8, F2 + 1.5, -0.22); for (let i = -2; i <= 2; i++) { ch.box(0.025, 1.8 - Math.abs(i) * 0.25, 0.03, C.cedarD, -0.8 + i * 0.36, F2 + 1.5, -0.2); ch.box(1.8 - Math.abs(i) * 0.25, 0.025, 0.03, C.cedarD, -0.8, F2 + 1.5 + i * 0.36, -0.2); }
  if (lv('moonlamp')) { em.ball(0.86, 0xffe6b8, -0.8, F2 + 1.5, -0.12, 1, 1, 1, 0.01); tagA(anchor(-0.8, F2 + 1.5, -0.9, 0xffd8a0, 1.6, 4.2, ['f2'], 0.2), 'f2'); }
  // shoji screens (upgrade) along the left wall, backlit
  if (lv('shoji')) for (let z = -0.6; z > -4.8; z -= 0.9) { ch.box(0.04, 1.8, 0.86, C.cedarL, -2.4, F2 + 0.95, z - 0.45); for (let i = 1; i < 4; i++) ch.box(0.045, 0.02, 0.84, C.cedarL, -2.4, F2 + 0.05 + i * 0.45, z - 0.45); em.box(0.01, 1.7, 0.8, 0x6a5a40, -2.37, F2 + 0.95, z - 0.45); }
  // low tables + cushions
  P.lowTable(ch, -0.6, F2, -2.0, 1.2, 0.75); for (const [x, z] of [[-0.6, -1.35], [-0.6, -2.65], [-1.45, -2.0], [0.25, -2.0]]) P.cushion(ch, x, F2, z, 0x5a2a3a);
  if (lv('table2')) { P.lowTable(ch, -0.6, F2, -4.0, 1.2, 0.75); for (const [x, z] of [[-0.6, -3.35], [-0.6, -4.65], [-1.45, -4.0], [0.25, -4.0]]) P.cushion(ch, x, F2, z, 0x2c3c6e); solidC(-0.6, -4.0, 1.2, 0.75, F2, F2 + 0.4, 'f2furn'); }
  solidC(-0.6, -2.0, 1.2, 0.75, F2, F2 + 0.4, 'f2furn'); solid(-2.5, -1.3, F2, F2 + 2, -6.0, -5.05, 'f2furn');
  // mizuya: standing matcha counter on the right wall
  ch.box(0.6, 0.06, 2.2, C.cedarL, 2.2, F2 + 0.9, -2.3); ch.box(0.56, 0.86, 2.16, C.walnut, 2.22, F2 + 0.44, -2.3); for (let z = -3.3; z < -1.2; z += 0.5) ch.box(0.02, 0.6, 0.46, C.cedarD, 1.93, F2 + 0.45, z + 0.25);
  ch.cyl(0.16, 0.18, 0.14, 12, 0x3a3e46, 2.25, F2 + 1.0, -3.0); ch.cyl(0.13, 0.15, 0.16, 12, C.iron, 2.25, F2 + 1.15, -3.0); ch.cyl(0.08, 0.08, 0.02, 12, C.iron, 2.25, F2 + 1.24, -3.0); ch.ball(0.025, C.brass, 2.25, F2 + 1.27, -3.0);
  ch.cyl(0.08, 0.08, 0.18, 10, 0x2a3a5a, 2.3, F2 + 1.02, -1.55); P.shelf(ch, 2.38, F2 + 1.6, -2.3, 2.0, -Math.PI / 2); for (let i = 0; i < 5; i++) ch.cyl(0.07, 0.05, 0.07, 10, spick([0x3a2a24, 0x6a3a2a, C.celadon, 0x2a3a4a]), 2.38, F2 + 1.65, -3.1 + i * 0.4);
  solid(1.9, 2.5, F2, F2 + 1, -3.45, -1.15, 'f2furn');
  // andon floor lamps + hanging lamp
  for (const [x, z] of [[-2.2, -0.5], [1.6, -5.6]]) { ch.box(0.24, 0.6, 0.24, C.cedarD, x, F2 + 0.3, z); em.box(0.2, 0.5, 0.2, 0xffd0a0, x, F2 + 0.32, z); tagA(anchor(x, F2 + 0.5, z, 0xffb070, 1.0, 2.8, ['f2'], 0.3), 'f2'); }
  ch.cyl(0.006, 0.006, 0.7, 4, 0x111111, -0.6, F2 + 2.62, -2.0); ch.cyl(0.24, 0.24, 0.3, 12, C.washi, -0.6, F2 + 2.15, -2.0); em.cyl(0.22, 0.22, 0.28, 12, 0xffe0b8, -0.6, F2 + 2.15, -2.0);
  tagA(anchor(-0.6, F2 + 2.0, -2.0, 0xffc890, 2.0, 4.5, ['f2'], 0.2), 'f2'); tagA(anchor(2.0, F2 + 2.0, -2.3, 0xffc890, 1.0, 3, ['f2'], 0.2), 'f2');
  if (lv('table2')) { ch.cyl(0.006, 0.006, 0.7, 4, 0x111111, -0.6, F2 + 2.62, -4.0); ch.cyl(0.24, 0.24, 0.3, 12, C.washi, -0.6, F2 + 2.15, -4.0); em.cyl(0.22, 0.22, 0.28, 12, 0xffe0b8, -0.6, F2 + 2.15, -4.0); tagA(anchor(-0.6, F2 + 2.0, -4.0, 0xffc890, 1.8, 4, ['f2'], 0.2), 'f2'); }
  // ticket rail by the mizuya
  ch.cyl(0.01, 0.01, 1.2, 6, C.brass, 1.7, F2 + 2.05, -2.3, Math.PI / 2, 0, 0);
  addBuilt(g, ch); addBuilt(g, em);
  for (const [x, z] of [[-0.6, -1.35], [-0.6, -2.65], [-1.45, -2.0], [0.25, -2.0]]) blob(g, x, F2 + 0.05, z, 0.6, 0.6); blob(g, -0.6, F2 + 0.05, -2.0, 1.5, 1.0);
}
function railF2() { return { base: new THREE.Vector3(1.7, F2 + 1.96, -1.8), ry: -Math.PI / 2, dx: 0, dz: -0.11, key: 'f2' }; }
HOOK.upper.push(() => { buildF2(); stairBlock(); });
/* ---------- sliding entrance doors: telescoping pairs of glazed panels that pocket into the wall on the right ----------
   Both doorways (shop front x 0.8..1.9 at y 0, 2F balcony x 0.8..1.9 at F2) sit in the 0.26 m front wall (z -0.26..0).
   Panel L rides the outer track, R the inner one; opening, L travels twice as far as R and both stack in the wall
   cavity (x 1.88..2.46). Each opens itself when someone walks up to it. */
const SDOORS = {};
const SD_W = 0.56, SD_X0 = 0.835, SD_ZL = -0.095, SD_ZR = -0.158, SD_DL = 1.068, SD_DR = 0.536;
// style 'balcony': plank kickboard, horizontal yokoshige glazing. style 'shop': koshi-do, a band of fine vertical slats over the glass
// below a clear upper light, with a frosted washi strip and a brass push plate.
function slideDoorPanel(ch, x0, z, y0, H, pull, style) {
  const W = SD_W, T = 0.034, cx = x0 + W / 2, shop = style === 'shop', fr = shop ? 0x3a2416 : C.cedar, frD = shop ? 0x22140b : C.cedarD, frL = shop ? 0x5a3a24 : C.cedarL;
  const st = 0.052, rT = 0.07, rB = 0.11, kick = shop ? 0.5 : 0.62;
  for (const sx of [x0 + st / 2, x0 + W - st / 2]) ch.box(st, H, T, fr, sx, y0 + H / 2, z);
  ch.box(W - 2 * st, rT, T, fr, cx, y0 + H - rT / 2, z); ch.box(W - 2 * st, rB, T, fr, cx, y0 + rB / 2, z); ch.box(W - 2 * st, 0.05, T, fr, cx, y0 + kick, z);
  const kh = kick - 0.025 - rB; ch.box(W - 2 * st, kh, 0.014, frD, cx, y0 + rB + kh / 2, z);
  const gw = W - 2 * st, g0 = y0 + kick + 0.025, g1 = y0 + H - rT, panes = [];
  if (shop) {
    // kickboard: two flat fielded panels; then koshi slats to 1.45 m, a rail, and the upper light with a frosted band
    for (const f of [-1, 1]) { ch.box(gw - 0.06, kh * 0.36, 0.006, frL, cx, y0 + rB + kh * 0.28, z + f * 0.01); ch.box(gw - 0.06, kh * 0.36, 0.006, frL, cx, y0 + rB + kh * 0.72, z + f * 0.01); }
    const k1 = y0 + 1.45; ch.box(gw, 0.045, T, fr, cx, k1, z);
    for (let x = x0 + st + 0.03; x < x0 + W - st - 0.01; x += 0.054) ch.box(0.016, k1 - g0, 0.026, fr, x, (g0 + k1) / 2, z);
    ch.box(gw, 0.012, 0.02, fr, cx, (k1 + g1) / 2 + 0.06, z); ch.box(gw, 0.012, 0.02, fr, cx, (k1 + g1) / 2 - 0.02, z);
    panes.push([g0, k1 - 0.022, 0], [k1 + 0.022, g1, 0], [(k1 + g1) / 2 + 0.02, (k1 + g1) / 2 + 0.054, 1]);
  } else {
    for (let i = 1; i <= 3; i++) for (const f of [-1, 1]) ch.box(0.02, kh - 0.02, 0.008, frL, x0 + st + gw * i / 4, y0 + rB + kh / 2, z + f * 0.011);
    for (let y = g0 + 0.135; y < g1 - 0.2; y += 0.135) ch.box(gw, 0.012, 0.02, fr, cx, y, z);
    ch.box(gw, 0.012, 0.02, fr, cx, g1 - 0.16, z); ch.box(gw, 0.012, 0.02, fr, cx, g1 - 0.12, z); ch.box(0.014, g1 - g0, 0.02, fr, cx, (g0 + g1) / 2, z);
    panes.push([g0, g1, 0], [g1 - 0.154, g1 - 0.126, 1]);
  }
  // hikite: black lacquer pull recessed into the leading stile (both faces) and a brass thumb latch; the shop door adds a brass push plate
  if (pull) { const px = x0 + st / 2; for (const f of [-1, 1]) { ch.box(0.026, 0.1, 0.006, 0x14100c, px, y0 + 0.98, z + f * (T / 2 + 0.001)); ch.box(0.016, 0.075, 0.004, 0x2a2420, px, y0 + 0.98, z + f * (T / 2 + 0.003)); if (shop) ch.box(0.04, 0.22, 0.004, C.brass, px + 0.045, y0 + 1.12, z + f * (T / 2 + 0.002)); } ch.box(0.014, 0.03, 0.044, C.brass, px, y0 + 1.2, z); }
  for (const rx of [x0 + 0.08, x0 + W - 0.08]) ch.box(0.04, 0.014, 0.012, 0x2a2c31, rx, y0 - 0.006, z);
  return { gw, cx, panes };
}
// cfg: key, y0 (floor), h (opening height), zone (inside bake zone), style, casing (outside casing + drip cap), lip (stone step), near(p, npc), active()
function buildSlideDoor(cfg) {
  const g = part('sdoor_' + cfg.key), D = SDOORS[cfg.key] || (SDOORS[cfg.key] = { t: 0, open: false }); D.cfg = cfg; D.L = D.R = null;
  const fr = new Chunk('sdoorFrame_' + cfg.key, cfg.zone), ex = new Chunk('sdoorExt_' + cfg.key, 'facade'); const y0 = cfg.y0, y1 = y0 + cfg.h, ym = (y0 + y1) / 2, DK = 0x22140b, lin = cfg.style === 'shop' ? DK : C.cedarD;
  // jamb linings: plain on the left, two lips on the right so the panels have a slot to pocket into, dark pocket behind
  fr.box(0.04, cfg.h, 0.26, lin, 0.82, ym, -0.13); fr.box(0.04, cfg.h, 0.065, lin, 1.88, ym, -0.0325); fr.box(0.04, cfg.h, 0.06, lin, 1.88, ym, -0.23);
  fr.box(0.56, cfg.h, 0.134, 0x0c0907, 2.2, ym, -0.133);
  // head with two grooves, threshold with two brass tracks
  fr.box(1.14, 0.07, 0.26, lin, 1.35, y1 - 0.035, -0.13); for (const z of [SD_ZL, SD_ZR]) fr.box(1.06, 0.012, 0.042, 0x0e0a08, 1.35, y1 - 0.074, z);
  fr.box(1.14, 0.05, 0.3, 0x3a281c, 1.35, y0 - 0.005, -0.12); for (const z of [SD_ZL, SD_ZR]) fr.box(1.06, 0.008, 0.01, C.brass, 1.35, y0 + 0.024, z);
  // inside casing
  fr.box(0.07, cfg.h + 0.12, 0.025, lin, 0.765, y0 + (cfg.h + 0.12) / 2, -0.272); fr.box(0.07, cfg.h + 0.12, 0.025, lin, 1.935, y0 + (cfg.h + 0.12) / 2, -0.272); fr.box(1.24, 0.08, 0.025, lin, 1.35, y1 + 0.04, -0.272);
  if (cfg.casing) { ex.box(0.075, cfg.h + 0.1, 0.035, DK, 0.763, y0 + (cfg.h + 0.1) / 2, 0.017); ex.box(0.075, cfg.h + 0.1, 0.035, DK, 1.937, y0 + (cfg.h + 0.1) / 2, 0.017); ex.box(1.25, 0.09, 0.035, DK, 1.35, y1 + 0.045, 0.017);
    ex.box(1.36, 0.035, 0.11, DK, 1.35, y1 + 0.105, 0.045); ex.box(1.3, 0.012, 0.09, 0x3a3d42, 1.35, y1 + 0.128, 0.04); }
  if (cfg.lip) ex.box(1.2, 0.03, 0.1, 0x55595e, 1.35, y0 + 0.005, 0.05);
  addBuilt(g, fr); addBuilt(g, ex);
  // panels: each its own group so it can slide; lighting is baked at the closed position (they pocket out of sight when open).
  // Glass is one face per side: it holds a little lamplight seen from outside and reads as cool night glass from inside.
  const glassIn = new THREE.MeshBasicMaterial({ color: 0x9cc2d6, transparent: true, opacity: 0.13, depthWrite: false }), glassOut = new THREE.MeshBasicMaterial({ color: 0xffc888, transparent: true, opacity: 0.2, depthWrite: false });
  const frost = new THREE.MeshBasicMaterial({ color: 0xffe2b8, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide });
  const H = cfg.h - 0.1, py = y0 + 0.025;
  for (const [key, z, pull, x0] of [['R', SD_ZR, false, SD_X0 + SD_W - 0.046], ['L', SD_ZL, true, SD_X0]]) {
    const pg = new THREE.Group(); const ch = new Chunk('sdoor' + key + '_' + cfg.key, cfg.zone, { jit: 0.02 }); const d = slideDoorPanel(ch, x0, z, py, H, pull, cfg.style); addBuilt(pg, ch);
    for (const [ya, yb, fro] of d.panes) {
      if (fro) { const fb = new THREE.Mesh(gPlaneIdx(), frost); fb.scale.set(d.gw, yb - ya, 1); fb.position.set(d.cx, (ya + yb) / 2, z); fb.renderOrder = 1; fb.userData.keepGeo = true; pg.add(fb); continue; }
      for (const [mat, f] of [[glassOut, 1], [glassIn, -1]]) { const gl = new THREE.Mesh(gPlaneIdx(), mat); gl.scale.set(d.gw, yb - ya, 1); gl.position.set(d.cx, (ya + yb) / 2, z + f * 0.002); if (f < 0) gl.rotation.y = Math.PI; gl.renderOrder = 1; gl.userData.keepGeo = true; pg.add(gl); }
    }
    g.add(pg); D[key] = pg;
  }
  slideDoorPose(D);
}
function slideDoorPose(D) { const e = D.t * D.t * (3 - 2 * D.t); if (D.L) D.L.position.x = SD_DL * e; if (D.R) D.R.position.x = SD_DR * e; }
HOOK.upper.push(() => {
  buildSlideDoor({ key: 'balcony', y0: F2, h: 2.3, zone: 'f2', style: 'balcony', casing: true, lip: true, active: () => S.ch >= 2,
    near: (p, npc) => Math.abs(p.y - F2) < 1.3 && (npc ? p.x > 0.75 && p.x < 1.95 && p.z > -1.0 && p.z < 1.0 : p.x > 0.0 && p.x < 2.7 && p.z > -1.9 && p.z < 1.5) });
  buildSlideDoor({ key: 'shop', y0: 0, h: 2.4, zone: 'g0', style: 'shop', casing: false, lip: false, active: () => !!S.flags.shutterUp,
    near: (p, npc) => p.y < 1.2 && (npc ? p.x > 0.75 && p.x < 1.95 && p.z > -0.9 && p.z < 0.9 : p.x > 0.3 && p.x < 2.4 && p.z > -1.6 && p.z < 1.7) });
});
HOOK.update.push(dt => {
  for (const k in SDOORS) { const D = SDOORS[k], c = D.cfg; if (!D.L) continue; let want = false, who = 0;
    if (c.active()) { want = c.near(player.pos, false); if (want) who = 1; else for (const n of NPCS) if (n.alive && c.near(n.pos, true)) { want = true; break; } }
    if (want !== D.open) { D.open = want; Snd.hit(want ? 620 : 520, 0.7, who ? 0.05 : 0.025, 0.5, 0, 0.45, 'lowpass'); }
    const t = clamp(D.t + (want ? 1 : -1) * dt / 0.55, 0, 1);
    if (t !== D.t) { const was = D.t; D.t = t; slideDoorPose(D); if (!want && t === 0 && was > 0) Snd.hit(240, 1, who ? 0.07 : 0.035, 0.12); } }
});
function stairBlock() { clearTag('stairBlock'); const g = part('stairBlock'); if (S.ch >= 2) { removeIA('ropeIA'); return; } const ch = new Chunk('rope', 'g0'); ch.box(0.04, 1.0, 0.04, C.brass, -1.65, 0.5, -6.95); ch.box(0.04, 1.0, 0.04, C.brass, -1.65, 0.5, -7.75); ch.cable([-1.65, 0.9, -6.95], [-1.65, 0.9, -7.75], 0.12, 0.02, 0xc2362b, 6); addBuilt(g, ch); neon('立入禁止', -1.66, 0.75, -7.35, -Math.PI / 2, 0.1, 'red', { px: 48, k: 1.6, lit: 0, group: g }); solid(-1.7, -1.55, 0, 2, -7.8, -6.9, 'stairBlock');
  addIA({ id: 'ropeIA', box: [-1.65, 0.8, -7.35, 0.3, 1.0, 0.9], name: 'Roped-off stairs', verb: 'Upstairs is storage for now', act: () => toast('The second floor opens once you renovate it from the holo-model table.') }); }
/* ---------- waypoints upstairs ---------- */
HOOK.waypoints.push(() => {
  wp('st1a', -1.6, 0, -7.35); wp('st1b', 2.0, F2, -7.35); wp('f2L', 2.25, F2, -7.0); wp('f2L2', 2.25, F2, -5.7); wp('f2A', 1.2, F2, -4.8); wp('f2B', 1.2, F2, -2.0); wp('f2C', 0.6, F2, -0.8); wp('f2E', -1.6, F2, -0.9); wp('f2D', 0.6, F2, -3.2); wp('f2F', 0.6, F2, -5.0); wp('f2G', -1.7, F2, -4.9); wp('mz', 1.45, F2, -2.3);
  link('stB', 'st1a', 'st1b', 'f2L', 'f2L2', 'f2A', 'f2B', 'f2C', 'f2E'); link('f2A', 'f2D', 'f2B'); link('f2A', 'f2F', 'f2G'); link('f2B', 'mz');
  wp('k0', -0.6, F2, -1.35); wp('k1', -0.6, F2, -2.65); wp('k2', -1.45, F2, -2.0); wp('k3', 0.25, F2, -2.0); link('f2C', 'k0'); link('f2D', 'k1'); link('f2E', 'k2'); link('f2B', 'k3');
  wp('k4', -0.6, F2, -3.35); wp('k5', -0.6, F2, -4.65); wp('k6', -1.45, F2, -4.0); wp('k7', 0.25, F2, -4.0); link('f2D', 'k4'); link('f2F', 'k5'); link('f2G', 'k6'); link('f2F', 'k7');
  wp('balIn', 1.35, F2, -0.6); wp('balOut', 1.35, F2, 0.6); link('f2C', 'balIn', 'balOut');
});
HOOK.seats.push(s => {
  if (S.ch < 2) return; const k = [['k0', Math.PI], ['k1', 0], ['k2', Math.PI / 2], ['k3', -Math.PI / 2]]; if (lv('table2')) k.push(['k4', Math.PI], ['k5', 0], ['k6', Math.PI / 2], ['k7', -Math.PI / 2]);
  for (const [id, yaw] of k) s.push({ id, node: id, yaw, kind: 'kneel', sp: 'f2' });
});
/* ---------- the matcha station ---------- */
const MS = { g: null, bowl: null, surf: null, whisk: null, sifter: null, ladle: null, base: Vv(2.2, F2 + 0.93, -2.3) };
function buildMatchaStation() {
  if (MS.g) scene.remove(MS.g); if (S.ch < 2) return; const g = new THREE.Group(); MS.g = g; scene.add(g); const b = MS.base; const mat = personMat(); mat.userData.probe.value.setRGB(0.62, 0.46, 0.32); MS.mat = mat;
  const bw = new Chunk('bowl', 'f2', { jit: 0 }); bw.cyl(0.075, 0.05, 0.075, 14, 0x3a2a24, 0, 0.0375, 0); bw.cyl(0.04, 0.04, 0.012, 10, 0x2a1e18, 0, 0.006, 0); bw.box(0.03, 0.02, 0.005, 0xb8a080, 0.074, 0.05, 0, 0, 0, 0);
  MS.bowl = new THREE.Group(); MS.bowl.add(new THREE.Mesh(bw.raw(), mat)); MS.bowl.position.set(b.x - 0.05, b.y, b.z); g.add(MS.bowl);
  MS.surf = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.004, 16), new THREE.MeshLambertMaterial({ color: 0xcfe0e8 })); MS.surf.position.y = 0.01; MS.surf.visible = false; MS.bowl.add(MS.surf);
  const wk = new Chunk('wk', 'f2', { jit: 0 }); wk.cyl(0.011, 0.011, 0.08, 6, C.bamboo, 0, 0.1, 0); wk.cyl(0.028, 0.012, 0.06, 12, 0xd9c48a, 0, 0.03, 0); MS.whisk = new THREE.Group(); MS.whisk.add(new THREE.Mesh(wk.raw(), mat)); MS.whisk.position.set(b.x + 0.05, b.y, b.z + 0.18); g.add(MS.whisk);
  const sf = new Chunk('sf', 'f2', { jit: 0 }); sf.cyl(0.05, 0.05, 0.04, 12, C.steel, 0, 0, 0); sf.cyl(0.045, 0.045, 0.005, 12, 0x6f9e2a, 0, 0.015, 0); MS.sifter = new THREE.Group(); MS.sifter.add(new THREE.Mesh(sf.raw(), mat)); MS.sifter.position.set(b.x + 0.05, b.y + 0.02, b.z - 0.18); g.add(MS.sifter);
  const ld = new Chunk('ld', 'f2', { jit: 0 }); ld.cyl(0.03, 0.03, 0.03, 8, C.bamboo, 0, 0, 0); ld.bar([0, 0.01, 0], [0, 0.03, 0.28], 0.012, C.bamboo); MS.ladle = new THREE.Group(); MS.ladle.add(new THREE.Mesh(ld.raw(), mat)); MS.ladle.position.set(b.x + 0.05, b.y + 0.12, b.z - 0.55); g.add(MS.ladle);
  MS.led = ledPanel(160, 64, 0.05); MS.led.m.position.set(b.x - 0.25, b.y + 0.05, b.z + 0.22); MS.led.m.rotation.set(-0.6, -Math.PI / 2, 0, 'YXZ'); g.add(MS.led.m);
  removeIA('matchaIA'); addIA({ id: 'matchaIA', box: [b.x, b.y + 0.15, b.z, 0.5, 0.4, 1.0], name: 'Matcha bowl', verb: 'Make matcha', cond: () => S.ch >= 2, act: () => { if (player.hold) { toast('Your hands are full.'); return; } startMatcha(); } });
}
function msLED(label, v, band) { const L = MS.led, x = L.ctx; x.fillStyle = '#000'; x.fillRect(0, 0, L.w, L.h); let fs = 22; x.font = `${fs}px ${FONT_DOT}`; while (fs > 12 && x.measureText(label).width > L.w - 16) { fs -= 2; x.font = `${fs}px ${FONT_DOT}`; } x.fillStyle = '#9affb0'; x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText(label, 8, 4); x.fillStyle = 'rgba(51,228,255,.2)'; x.fillRect(10, 40, L.w - 20, 10); if (band) { x.fillStyle = 'rgba(127,255,150,.55)'; x.fillRect(10 + band[0] * (L.w - 20), 38, (band[1] - band[0]) * (L.w - 20), 14); } x.fillStyle = '#ffb35c'; x.fillRect(10, 42, clamp(v, 0, 1) * (L.w - 20), 6); L.tex.needsUpdate = true; }
function startMatcha(opts) {
  opts = opts || {}; const b = MS.base; const R = RECIPES[RID.matcha]; const sc = []; const add = v => sc.push(clamp(v, 0, 1));
  const st = { id: 'matcha', title: '抹茶 Matcha', si: 0, glance: true, cam: { pos: Vv(b.x - 0.42, b.y + 0.72, b.z + 0.02), at: Vv(b.x - 0.05, b.y + 0.0, b.z), fov: 0.74 } };
  let sift = 0, water = 0, foam = 0, strokes = [], lastDir = 0, lastX = null, splash = 0, whiskT = 0, hold = 0, turns = 0;
  MS.surf.visible = false; MS.bowl.rotation.y = 0;
  const stroke = () => { strokes.push(time); MS.whisk.position.x = b.x - 0.05 + (strokes.length % 2 ? 0.02 : -0.02); Snd.hit(2500, 2, 0.04, 0.03); };
  st.pointer = (type, x, y) => { const s = st.steps[st.si]; if (!s) return false; if (s.label === 'Sift' || s.label === 'Whisk') { if (type === 'move' && ST.pointerDown) { if (lastX != null) { const dx = x - lastX; if (s.label === 'Sift') { sift += Math.abs(dx) / 900; MS.sifter.position.z = b.z - 0.18 + Math.sin(sift * 30) * 0.03; } else { const d = Math.sign(dx); if (d && d !== lastDir && Math.abs(dx) > 2) { lastDir = d; stroke(); } } } lastX = x; } if (type === 'down') { ST.pointerDown = true; lastX = x; if (s.label === 'Sift') { sift += 0.06; } } if (type === 'up') { ST.pointerDown = false; lastX = null; } return true; } return false; };
  st.key = (code, down) => { const s = st.steps[st.si]; if (!s || !down) return; if (s.label === 'Whisk' && (code === 'KeyA' || code === 'KeyD' || code === 'ArrowLeft' || code === 'ArrowRight')) stroke(); };
  st.steps = [
    { label: 'Sift', hint: 'Drag back and forth to sift the matcha into the bowl. (Or tap the pad.)', hintT: 'Rub back and forth on the screen to sift. Or tap the pad.', pad: 'Shake the sifter', bot: () => ({ kind: 'zigzag', world: [b.x - 0.05, b.y + 0.14, b.z] }), botDone: () => sift >= 1, down() { sift += 0.14; MS.sifter.position.z = b.z - 0.18 + Math.random() * 0.03; Snd.hit(4000, 1, 0.03, 0.05); },
      start() { MS.sifter.position.set(b.x - 0.05, b.y + 0.14, b.z); }, update() { msLED('SIFT ' + Math.round(Math.min(1, sift) * 100) + '%', sift); if (sift >= 1) { add(1); MS.sifter.position.set(b.x + 0.05, b.y + 0.02, b.z - 0.18); MS.surf.visible = true; MS.surf.material.color.set(0x6f9e2a); nextStep(st); } } },
    { label: 'Water', hint: 'Hold to ladle 80°C water from the kettle. Let go at the line.', pad: () => ST.padDown ? 'Pouring…' : 'Hold to ladle water', holdPad: true, botDone: () => water >= 0.86,
      down() { Snd.loopStart('pourL', 1200, 1, 0.06); MS.ladle.position.set(b.x - 0.02, b.y + 0.16, b.z - 0.12); MS.ladle.rotation.x = 0.6; }, up() { Snd.loopStop('pourL'); MS.ladle.position.set(b.x + 0.05, b.y + 0.12, b.z - 0.55); MS.ladle.rotation.x = 0; if (water < 0.1) return; add(1 - Math.abs(water - 0.86) / wide(0.35)); st.note = Math.abs(water - 0.86) < 0.08 ? 'Just enough water.' : water > 0.86 ? 'A little thin.' : 'A little thick.'; nextStep(st); },
      update(dt) { if (ST.padDown) water = Math.min(1.2, water + dt * 0.5); MS.surf.position.y = 0.012 + water * 0.04; msLED('WATER', water / 1.2, [0.78 / 1.2, 0.94 / 1.2]); } },
    { label: 'Whisk', hint: 'Zig-zag fast: drag left-right, or tap A and D in turn. Keep it in the green: too slow makes no foam, too wild splashes.', hintT: 'Zig-zag your finger left and right, fast. Or tap the pad quickly.', pad: 'Whisk', bot: () => ({ kind: 'tap', every: 0.12 }), down() { stroke(); },
      start() { strokes = []; MS.whisk.position.set(b.x - 0.05, b.y + 0.05, b.z); }, update(dt) { whiskT += dt; strokes = strokes.filter(t => time - t < 1); const rate = strokes.length; const lo = SET.relaxed ? 3 : 5, hi = SET.relaxed ? 14 : 11; if (rate >= lo && rate <= hi) foam += dt * 0.28; else if (rate > hi + 2) { splash += dt; foam += dt * 0.08; } else foam = Math.max(0, foam - dt * 0.05); MS.surf.material.color.setRGB(lerp(0.17, 0.62, foam), lerp(0.36, 0.78, foam), lerp(0.03, 0.32, foam)); msLED('FOAM ' + Math.round(Math.min(1, foam) * 100) + '% ' + rate + '/s', foam); MS.whisk.rotation.z = Math.sin(time * 30) * 0.2 * Math.min(1, rate / 6); if (foam >= 1) { add(1 - splash * 0.25 - Math.max(0, whiskT - 7) * 0.05); st.note = splash > 0.6 ? 'Some of it splashed out.' : 'Fine, even foam.'; MS.whisk.position.set(b.x + 0.05, b.y, b.z + 0.18); nextStep(st); } } },
    { label: 'Finish', hint: 'Hold for one slow circle, then let go to lift the whisk.', pad: () => ST.padDown ? 'Circling…' : 'Hold: one slow circle', holdPad: true, botDone: () => hold >= 1.3, down() { hold = 0; }, up() { if (hold < 0.2) return; add(1 - Math.abs(hold - 1.3) / wide(1.0)); st.note = Math.abs(hold - 1.3) < 0.35 ? 'A clean finish.' : 'Close enough.'; nextStep(st); },
      update(dt) { if (ST.padDown) { hold += dt; MS.whisk.position.set(b.x - 0.05 + Math.cos(hold * 5) * 0.02, b.y + 0.05, b.z + Math.sin(hold * 5) * 0.02); } msLED('CIRCLE', hold / 2.4, [0.9 / 2.4, 1.7 / 2.4]); } },
    { label: 'Present', hint: 'Tap twice to turn the bowl so its front faces your guest.', pad: () => `Turn the bowl (${turns}/2)`, down() { turns++; Snd.soft(); if (turns >= 2) { add(1); nextStep(st); } }, update() { MS.bowl.rotation.y = damp(MS.bowl.rotation.y, turns * Math.PI / 2, 8, 0.016); } },
  ];
  st.finish = () => { const avg = sc.reduce((a, v) => a + v, 0) / sc.length; const stars = avg >= 0.8 ? 3 : avg >= 0.5 ? 2 : 1; S.stats.brews++; if (stars === 3) S.mastery.matcha = Math.min(MASTER_N, (S.mastery.matcha || 0) + 1); st.note = ['', 'A thin bowl.', 'A good bowl.', 'A beautiful bowl.'][stars]; Snd.chime(); setTimeoutG(() => endStation({ stars }), 700); };
  st.exit = res => { MS.surf.visible = false; MS.bowl.rotation.y = 0; if (res) { holdItem({ kind: 'tray', n: 1, rid: RID.matcha, stars: res.stars }); if (opts.done) opts.done(res); } };
  startStation(st); st.steps[0].start();
}
/* ---------- renovation: second floor ---------- */
RENO[1] = {
  pos: Vv(1.2, F2, -4.6), yaw: 0.3, task: 'Lay the tatami with Gen-san', target: Vv(-0.6, F2 + 0.2, -2.0),
  build() { S.ch = 2; S.flags.renoF2 = 1; buildUpper(); buildFacade(); rebakeStreet(); buildMatchaStation(); refreshSeats(); initWaypoints(); for (const f of HOOK.waypoints) f(); },
  crew() { const g = crewPut('gen', -1.6, F2, -2.6, Math.PI / 2); g.pose = 'crouch'; },
  intro: [{ w: 'narr', t: 'A week of sawdust later. The boxes are gone. Gen-san has carried up eight new tatami mats, one at a time, refusing every offer of help.' }, { w: 'gen', t: 'Last mat. Line it up with the border cloth, or it\'ll look drunk forever.' }],
  job(done) { startJob('align', { title: 'Lay the last tatami', cam: { pos: Vv(-0.6, F2 + 1.7, -0.6), at: Vv(-0.6, F2, -2.0) }, spot: Vv(-0.6, F2 + 0.05, -2.0), size: [0.9, 0.06, 1.8], axis: Vv(1, 0, 0), cancel: false, done }); },
  outro: [{ w: 'gen', t: 'Good. Chiyo kept this room for people who needed to sit longer than a cup.' }, { w: 'gen', t: 'There\'s a loose board in the alcove. She hid things in there. You should look.' }],
};
/* ---------- chapter 2 beats ---------- */
BEATS.c2_open = {
  task: () => { if (!S.flags.letter1) return 'Look in the alcove upstairs'; if (S.yen >= 120000 && !S.flags.odaService && S.stats.served < (S.flags.odaNext || 0)) return `Practise matcha. Mrs. Oda returns after ${S.flags.odaNext - S.stats.served} more guests`; if (S.yen >= 120000 && !S.flags.odaService) return 'Mrs. Oda is coming for matcha. Make her a three-star bowl.'; if (gateMet()) return 'Start the renovation at the holo-model table'; return `Save ${yen(120000)} and serve Mrs. Oda · ${yen(S.yen)}`; },
  target: () => !S.flags.letter1 ? Vv(-1.9, F2 + 0.4, -5.5) : gateMet() ? Vv(1.2, 1.1, -6.35) : null,
  enter() { S.flags.open = 1; },
  update() {
    if (S.stats.served >= (S.flags.c2base || 0) + 6 && !S.flags.battery && !DLG.active && !player.focus) { S.flags.battery = 1; batteryEvent(); }
    if (S.yen >= 120000 && !S.flags.odaService && !S.flags.odaHere && !DLG.active && !player.focus && S.flags.letter1 && S.stats.served >= (S.flags.odaNext || 0)) { S.flags.odaHere = 1; odaVisit(); }
  },
};
HOOK.chapter.push(n => { if (n === 2) { S.flags.c2base = S.stats.served; addMsg('gen', 'The tatami room is ready. Customers will climb up for matcha and gyokuro. Brew matcha at the counter on the right wall up there.'); goBeat('c2_open'); } });
HOOK.init.push(() => {
  buildMatchaStation();
  removeIA('alcoveIA'); addIA({ id: 'alcoveIA', box: [-1.9, F2 + 0.3, -5.5, 1.0, 0.5, 0.8], name: 'The alcove', verb: () => S.flags.letter1 ? 'Look' : 'Lift the loose board', cond: () => S.ch >= 2, act: () => { if (!S.flags.letter1) { S.flags.letter1 = 1; Snd.knock(); showLetter(LETTERS[1]); } else toast('The alcove. Chiyo\'s favourite spot to stand and look at the room.'); } });
});
function batteryEvent() {
  S.flags.flicker = 6; Snd.zap(); toast('The block\'s power trips. Every sign on the street goes dark for a moment.');
  setTimeoutG(() => { const m = spawnCrew('mako', 26, 0.12, 1.3, -Math.PI / 2); npcGo(m, 'a1', () => { faceTo(m, player.pos.x, player.pos.z); say([{ w: 'mako', t: 'Kaiun\'s site next door keeps overloading the line. Every night at peak.' }, { w: 'mako', t: 'I built you a battery out of scooter cells. When the grid dips, your neon stays on.' }, { w: 'mako', t: 'Little thing. But in a storm, the shop with lights is the shop people walk into.' }], () => { S.charge = Math.max(S.charge, 2); toast('Battery installed: 2⚡ of storm charge. It refills slowly from the grid.'); npcGo(m, 'sL', () => despawnCrew('mako')); }, lookCrew); }); }, 4000);
}
function odaVisit() {
  const n = spawnNPC(crewLooks().oda, -26, 0.12, 1.3, Math.PI / 2); VIS.oda = n; n.speed = 0.95;
  say([{ w: 'narr', t: 'A text from Mrs. Oda: "I\'m coming up the street. I\'d like to see Chiyo\'s room."' }]);
  const seat = SEATS.find(s => s.sp === 'f2' && !s.occ) || SEATS.find(s => s.sp === 'f2');
  const c = { n, seat, rid: RID.matcha, state: 'arrive', pat: 0, patMax: 999, name: 'Mrs. Oda', reg: 'oda', noPat: true };
  if (seat.occ) { const o = seat.occ; customerLeave(o, true); } seat.occ = c; CUST.push(c);
  c.ia = addIA({ id: 'odaCust', obj: custHit(n), name: 'Mrs. Oda · Matcha', verb: () => holdsFor(c) ? 'Serve' : 'Waiting for matcha', act: () => serveCustomer(c), cond: () => c.state === 'order' });
  c.onServed = (cc, stars) => {
    setTimeoutG(() => { if (stars >= 3) { S.flags.odaService = 1; say([{ w: 'oda', t: 'You turned the bowl. Twice. She always did that and I always pretended not to notice.' }, { w: 'oda', t: 'All right. The building has a pulse. Keep it going.' }], () => { c.state = 'drink'; c.drinkT = 6; }, () => n.pos.clone().add(Vv(0, 1.0, 0))); } else { S.flags.odaHere = 0; S.flags.odaNext = S.stats.served + 4; say([{ w: 'oda', t: 'It\'s pleasant. It\'s not hers yet.' }, { w: 'oda', t: 'I\'ll come back another night. Practise.' }], null, () => n.pos.clone().add(Vv(0, 1.0, 0))); } }, 900);
  };
  npcGo(n, seat.node, () => { n.yawT = seat.yaw; n.pose = 'kneel'; c.state = 'order'; makeTicket(c); say([{ w: 'oda', t: 'Matcha, please. Take your time.' }], null, () => n.pos.clone().add(Vv(0, 1.0, 0))); });
}
/* ---------- regulars & visitors over the whole story ---------- */
const REGS = {
  aiko: { look: () => crewLooks().aiko, scenes: [
    null, { ch: 2, rid: 'gyokuro', on: [{ w: 'aiko', t: 'Gyokuro tonight. A patient pulled through. I want something that takes its time.' }], done: [{ w: 'aiko', t: 'Sweet, like broth. I didn\'t know tea could taste like that.' }] },
    { ch: 4, rid: 'blend', on: [{ w: 'aiko', t: 'The whole ward smells like your third floor now. We put a sprig in the break room.' }], done: [{ w: 'aiko', t: 'If this shop closes I\'m going to chain myself to the counter.' }] }] },
  sato: { look: () => crewLooks().sato, scenes: [null, null, { ch: 3, rid: 'hoji', on: [{ w: 'sato', t: 'Hōjicha. Chiyo roasted it in the alley too, you know. Same pan, maybe.' }], done: [{ w: 'sato', t: 'Mochi has forgiven me for going out every night. She sends her regards.' }] }] },
  yume: { look: () => ({ name: 'Yume', skin: 0xf5d5bc, hair: 0xd77aa0, hairStyle: 'long', top: 0xff7aa8, bottom: 0x2a2c33, outfit: 'hoodie', led: 0xff3d9a, glasses: true, phones: true, umbrella: true, umbCol: 0xff7aa8, h: 0.96 }), scenes: [
    { ch: 2, rid: 'matcha', sp: 'f2', on: [{ w: 'yume', t: 'Is anyone up here? Good. Please don\'t look at my face for too long.' }, { w: 'yume', t: 'Matcha. And if anyone asks, I\'m nobody.' }], done: [{ w: 'yume', t: 'Nobody has made me anything by hand in three years. Thank you.' }] },
    { ch: 3, rid: 'latte', sp: 'terrace', on: [{ w: 'yume', t: 'My manager thinks I\'m at the gym. Iced hōjicha latte, please. Out here, where the rain is.' }], done: [{ w: 'yume', t: 'I wrote a song in my head on the walk up the stairs. First time in a year.' }] },
    { ch: 5, rid: 'matcha', on: [{ w: 'yume', t: 'I put your sign in the background of my new video. Sorry. Or, you\'re welcome?' }], done: [{ w: 'yume', t: 'Your queue is going to get very long. I\'m very sorry.' }] }] },
  k7: { look: () => ({ name: 'K-7', skin: 0x9aa0a6, hair: 0x5a5e66, hairStyle: 'buzz', top: 0xd8b53a, bottom: 0x3a3d48, outfit: 'jacket', visor: true, led: 0x7ad8ff, umbrella: false, h: 1.04 }), scenes: [
    { ch: 3, rid: 'hoji', on: [{ w: 'k7', t: 'GREETINGS. I AM K-7. I MAINTAIN THE 8 LINE.' }, { w: 'k7', t: 'I CANNOT DRINK. I WOULD LIKE TO ORDER A HŌJICHA TO SMELL.' }], done: [{ w: 'k7', t: 'AROMA LOGGED. CATEGORY: "CHESTNUT, RAIN, SOMEONE\'S KITCHEN". I WILL RETURN.' }] },
    { ch: 4, rid: 'blend', on: [{ w: 'k7', t: 'MY LOG SAYS YOU GROW LEAVES NOW. I WOULD LIKE TO SMELL THE NEW ONE.' }], done: [{ w: 'k7', t: 'THIS SMELL IS NOT IN MY DATABASE. I HAVE CREATED A NEW CATEGORY. IT IS CALLED "SHIZUKU".' }] },
    { ch: 5, rid: 'hoji', on: [{ w: 'k7', t: 'THE GRID WILL FAIL IN THE TYPHOON. I HAVE DONE THE MATH. YOUR CAPACITORS WILL NOT.' }], done: [{ w: 'k7', t: 'I WILL BE ON THE LINE THAT NIGHT. LOOK UP WHEN THE TRAINS STOP. I WILL WAVE.' }] }] },
  twins: { look: () => ({ name: 'Okada twins', skin: 0xf1c8a6, hair: 0x1a1414, hairStyle: 'bob', top: 0x23304a, bottom: 0x23304a, outfit: 'uniform', backpack: 0x8a2a2a, umbrella: true, h: 0.9 }), scenes: [
    { ch: 3, rid: 'iced', on: [{ w: 'twins', t: 'Two iced sencha! We have a chemistry test. Is caffeine a study aid? It\'s a study aid.' }], done: [{ w: 'twins', t: 'We\'re going to do our homework here every Thursday. Is that okay? It\'s okay.' }] },
    { ch: 4, rid: 'iced', on: [{ w: 'twins', t: 'We passed! Mostly. One of us passed. We\'re celebrating anyway.' }], done: [{ w: 'twins', t: 'When we\'re famous chemists we\'ll put this shop in our acceptance speech.' }] },
    { ch: 5, rid: 'latte', on: [{ w: 'twins', t: 'There\'s a petition at school to stop the Kaiun tower. We got two hundred signatures. Two hundred and two with you.' }], done: [{ w: 'twins', t: 'See you after the typhoon! Stay dry. Well. Stay inside.' }] }] },
};
let regT = 120;
HOOK.update.push(dt => {
  if (!S.flags.open || S.ch < 2 || S.ch > 5) return; regT -= dt; if (regT > 0 || DLG.active || player.focus) return; regT = rand(150, 240);
  for (const [id, R] of Object.entries(REGS)) { S.regulars[id] = S.regulars[id] || 0; for (let k = S.regulars[id]; k < R.scenes.length; k++) { const sc = R.scenes[k]; if (!sc) { S.regulars[id] = k + 1; continue; } if (sc.ch > S.ch) break; if (RECIPES[RID[sc.rid]].ch > S.ch) break; const c = spawnCustomer({ rid: RID[sc.rid], look: R.look(), reg: id, name: SPEAKERS[id][0], seatKind: sc.sp, onSeat: cc => say(sc.on, null, () => cc.n.pos.clone().add(Vv(0, 1.3, 0))), onServed: cc => setTimeoutG(() => say(sc.done, null, () => cc.n.pos.clone().add(Vv(0, 1.3, 0))), 800) }); if (c) { c.patMax *= 1.6; S.regulars[id] = k + 1; return; } break; } }
});
// Kuroda's later visits
HOOK.update.push(() => {
  if (DLG.active || player.focus) return;
  if (S.ch === 2 && S.stats.served >= (S.flags.c2base || 0) + 10 && !S.flags.kuroda2) { S.flags.kuroda2 = 1; kurodaVisit2([{ w: 'kuroda', t: 'A tatami room. Very authentic. Our focus groups love authentic.' }, { w: 'kuroda', t: 'The offer has gone up. So has the rain. I\'d take one of them.' }]); }
});
function kurodaVisit2(lines, after) { const n = spawnNPC(crewLooks().kuroda, 26, 0.12, 1.3, -Math.PI / 2); VIS.kuroda = n; n.speed = 1.2; npcGo(n, 'a1', () => { faceTo(n, player.pos.x, player.pos.z); say(lines, () => { if (after) after(); npcGo(n, 'sR', () => { removeNPC(n); delete VIS.kuroda; }); }, lookCrew); }); }
// storm charge trickles back from the grid once you have a battery
HOOK.update.push(dt => { if (S.flags.battery && S.charge < Math.min(2, capCharge())) S.charge = Math.min(Math.min(2, capCharge()), S.charge + dt * 0.003); });
HOOK.upos.push(id => { const out = (spot, stand, size, axis) => ({ spot, cam: { pos: stand.clone().add(Vv(0, 1.55, 0)), at: spot }, size, axis });
  return ({ shoji: out(Vv(-2.4, F2 + 0.95, -2.5), Vv(-1.2, F2, -2.5), [0.1, 1.8, 0.9], Vv(0, 0, 1)), ikebana: out(Vv(-1.75, F2 + 0.4, -5.5), Vv(-1.4, F2, -4.4), [0.3, 0.6, 0.3]), scroll: out(Vv(-1.9, F2 + 1.3, -5.9), Vv(-1.6, F2, -4.4), [0.45, 1.3, 0.05]), moonlamp: out(Vv(-0.8, F2 + 1.5, -0.25), Vv(-0.6, F2, -1.6), [1.9, 1.9, 0.1]),
    table2: out(Vv(-0.6, F2 + 0.2, -4.0), Vv(0.9, F2, -4.0), [1.2, 0.4, 0.75]), planters: out(Vv(0, F2 + 1.0, 1.12), Vv(0.2, F2, 0.5), [5, 0.3, 0.3]) })[id] || null; });
HOOK.apply.push(id => { if (UID[id].space === 'f2') { buildF2(); } if (id === 'table2') refreshSeats(); });

