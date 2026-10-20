/* ================= kitchen staff: baristas who brew full pots and serve whoever has waited longest ================= */
const BARISTAS = ['rin', 'kenta', 'yui', 'sora'];
const STAFF_BUSY = {}; // station id -> barista id
function staffStations() {
  const L = [{ id: 'g0a', stand: V3(0.95, 0, -4.35), yaw: Math.PI, kettle: true, floor: 0 }];
  if (lv('burner2')) L.push({ id: 'g0b', stand: V3(2.0, 0, -4.35), yaw: Math.PI, kettle: true, floor: 0 });
  if (lv('galley') && S.ch >= 2) { L.push({ id: 'f2a', stand: V3(1.6, F2, -4.85), yaw: Math.PI / 2, kettle: true, matcha: true, floor: 1 }); L.push({ id: 'f2b', stand: V3(1.6, F2, -4.0), yaw: Math.PI / 2, kettle: true, matcha: true, floor: 1 }); }
  if (lv('cartburner') && S.ch >= 3) L.push({ id: 'yt', stand: V3(YT.x + 0.4, 0.06, YT.z - 0.95), yaw: 0, kettle: true, shaker: true, floor: 0 });
  return L;
}
const staffSpeedK = () => (lv('dumbwaiter') ? 1.3 : 1);
const staffBrewT = () => 28 * (lv('timers') ? 0.8 : 1) * (lv('autokettle') ? 0.75 : 1);
const staffCups = () => lv('bigpot') ? 6 : potCups();
const staffStars = () => lv('scales') ? 3 : 2;
function canStaffBrew(R, st) {
  if ((S.mastery[R.id] || 0) < MASTER_N) return false;
  if (R.st === 'kettle' && !st.kettle) return false; if (R.st === 'matcha' && !st.matcha) return false; if (R.st === 'shaker' && !st.shaker) return false;
  if (R.garden && !lv('pantry')) return false;
  if (S.water < staffCups() * 0.25 * 0.6) return false; if (R.roast ? S.roasted < 1 : S.leaves < 1) return false;
  return true;
}
const urgency = c => 1 + (c.patMax ? c.pat / c.patMax : 0);
const waiting = (rid, who) => CUST.filter(c => c.state === 'order' && c.rid === rid && (!c.claimed || c.claimed === who));
function approachNode(c) { const nd = c.seat.node; return nd.startsWith('st') ? ({ st0: 'a4', st1: 'a3', st2: 'a25', st3: 'a2' })[nd] : nd.startsWith('w') ? 'wa' + nd.slice(1) : nd; }
function staffWalk(b, target, cb) { const n = b.n; n.speed = 1.3 * staffSpeedK(); b.walkT = 0; if (typeof target === 'string') npcGo(n, target, cb); else { n.path = routeTo(n, target); n.onArrive = cb; n.pose = null; } }
function staffTray(b, on) { const n = b.n; if (b.trayObj) { n.p.P.hdR.remove(b.trayObj); b.trayObj = null; } n.carry = !!on; if (on && b.cups > 0) { const t = trayObj(Math.min(4, b.cups), b.rid); t.scale.setScalar(0.8); t.position.set(-0.2, -0.12, 0.18); n.p.P.hdR.add(t); b.trayObj = t; } }
function staffRelease(b) { for (const c of CUST) if (c.claimed === b.id) c.claimed = null; if (b.station) { delete STAFF_BUSY[b.station]; b.station = null; } }
function staffIdle(b) { staffRelease(b); b.state = 'idle'; b.t = 0.6; b.cups = 0; staffTray(b, false); b.n.pose = null; }
function spawnBarista(id) {
  if (STAFFN[id]) return; const n = spawnNPC(crewLooks()[id], WP.b2.p.x, 0, WP.b2.p.z, Math.PI); n.speed = 1.3;
  STAFFN[id] = { id, n, state: 'idle', t: 1 + BARISTAS.indexOf(id) * 0.7, cups: 0, rid: -1, stars: 2, station: null, walkT: 0 };
  n.ia = addIA({ id: 'staff_' + id, obj: custHit(n), name: () => `${SPEAKERS[id][0]} · ${staffDoing(STAFFN[id])}`, verb: 'Talk', act: () => staffTalk(id) });
}
function staffDoing(b) { if (!b) return ''; const R = RECIPES[b.rid]; return b.state === 'brew' ? `brewing ${R.name}` : b.state === 'serve' ? `serving ${R.name} (${b.cups})` : b.state === 'toStation' ? `heading to brew ${R.name}` : b.state === 'fetch' ? `fetching ${R.name}` : b.state === 'stow' ? 'stowing cups' : 'waiting for orders'; }
// pick the job that helps the most: cups already on the counter first, then the tea with the most urgent demand
function staffDecide(b) {
  const busyCups = {}; for (const id in STAFFN) { const o = STAFFN[id]; if (o !== b && o.rid >= 0 && ['toStation', 'brew', 'serve', 'fetch'].includes(o.state)) busyCups[o.rid] = (busyCups[o.rid] || 0) + (o.cups || staffCups()); }
  const store = teaStore();
  // 1. run cups that are already on the tea counter
  for (const rid of teaSlots()) { const have = (store[rid] || []).length; if (!have) continue; const w = waiting(rid, b.id).filter(c => !c.claimed); const need = w.length - (busyCups[rid] || 0); if (need <= 0) continue;
    b.rid = rid; b.state = 'fetch'; const take = Math.min(have, need, staffCups()); w.sort((p, q) => urgency(q) - urgency(p)).slice(0, take).forEach(c => c.claimed = b.id);
    staffWalk(b, V3(teaSlotX(rid), 0, -3.72), () => { const arr = teaStore()[rid] || []; const got = arr.splice(0, take); refreshTeaCups(); b.cups = got.length; b.stars = got.length ? Math.round(got.reduce((a, c) => a + c.stars, 0) / got.length) : 0; b.n.yawT = 0; if (!b.cups) { staffIdle(b); return; } staffTray(b, true); b.state = 'serve'; staffServeNext(b); }); return; }
  // 2. brew the most-needed tea at the nearest free station that can make it
  const demand = {}; for (const c of CUST) if (c.state === 'order' && !c.claimed) demand[c.rid] = (demand[c.rid] || 0) + urgency(c);
  const opts = Object.keys(demand).map(Number).filter(rid => demand[rid] - (busyCups[rid] || 0) > 0.5).sort((p, q) => demand[q] - demand[p]);
  for (const rid of opts) { const R = RECIPES[rid]; const st = staffStations().filter(s => !STAFF_BUSY[s.id] && canStaffBrew(R, s)).sort((p, q) => p.stand.distanceTo(b.n.pos) - q.stand.distanceTo(b.n.pos))[0]; if (!st) continue;
    STAFF_BUSY[st.id] = b.id; b.station = st.id; b.rid = rid; b.state = 'toStation';
    staffWalk(b, st.stand, () => { if (b.state !== 'toStation') return; if (!canStaffBrew(R, st)) { staffIdle(b); return; } b.n.yawT = st.yaw; b.n.pose = 'work'; b.state = 'brew'; b.t = staffBrewT();
      if (R.roast) S.roasted = Math.max(0, S.roasted - 1); else S.leaves = Math.max(0, S.leaves - 1); S.water = Math.max(0, S.water - staffCups() * 0.25); }); return; }
  // 3. nothing to do: wait by the counter
  const home = V3(-0.3 + BARISTAS.indexOf(b.id) * 0.35, 0, -4.2); if (!b.n.path && b.n.pos.distanceTo(home) > 0.9) staffWalk(b, home, () => { b.n.yawT = 0; });
}
// serve the most urgent customer who ordered this tea, wherever they sit; then the next one
function staffServeNext(b) {
  if (b.cups <= 0) { staffIdle(b); return; }
  const cands = waiting(b.rid, b.id); if (!cands.length) { staffStow(b); return; }
  cands.sort((p, q) => urgency(q) - urgency(p) || p.n.pos.distanceTo(b.n.pos) - q.n.pos.distanceTo(b.n.pos));
  const c = cands[0]; c.claimed = b.id;
  staffWalk(b, approachNode(c), () => { faceTo(b.n, c.n.pos.x, c.n.pos.z); if (c.state === 'order' && c.rid === b.rid) { completeServe(c, b.stars, false); b.cups--; staffTray(b, true); } c.claimed = null; staffServeNext(b); });
}
// leftovers go on the tea counter for later
function staffStow(b) {
  if (!S.flags.counterBuilt || b.cups <= 0) { staffIdle(b); return; } b.state = 'stow';
  staffWalk(b, V3(teaSlotX(b.rid) || -0.8, 0, -3.72), () => { const st = teaStore(); const arr = st[b.rid] = st[b.rid] || []; while (b.cups > 0 && arr.length < teaCap()) { arr.push({ stars: b.stars }); b.cups--; } refreshTeaCups(); b.n.yawT = 0; staffIdle(b); });
}
function updateBaristas(dt) {
  for (const id of BARISTAS) {
    const b = STAFFN[id]; if (!b || !S.staff[id]) continue;
    if (b.n.path) { b.walkT += dt; if (b.walkT > 45) { b.n.path = null; staffIdle(b); } } // never get wedged forever
    if (b.state === 'idle') { b.t -= dt; if (b.t <= 0) { b.t = 1; staffDecide(b); } }
    else if (b.state === 'brew') { b.t -= dt; if (b.t <= 0) { delete STAFF_BUSY[b.station]; b.station = null; b.cups = staffCups(); b.stars = staffStars(); b.n.pose = null; staffTray(b, true); b.state = 'serve'; staffServeNext(b); } }
  }
}

function staffUPOS(id) { const V = (x, y, z) => new THREE.Vector3(x, y, z); const out = (spot, stand, size, axis) => ({ spot, cam: { pos: stand.clone().add(V(0, 1.55, 0)), at: spot }, size, axis });
  return ({ galley: out(V(2.25, F2 + 0.6, -4.4), V(1.3, F2, -4.4), [0.55, 1.0, 1.6]), pantry: out(V(2.4, F2 + 1.6, -4.4), V(1.4, F2, -4.4), [0.2, 0.4, 1.2], V(0, 0, 1)), cartburner: out(V(YT.x + 0.4, 1.0, YT.z - 0.4), V(YT.x + 0.4, 0.06, YT.z - 1.4), [0.35, 0.12, 0.3]) })[id] || null; }
// staff kitchens: burners, kettles and the upstairs galley, rebuilt whenever a kitchen upgrade lands
function buildKitchens() {
  const g = part('kitchens'); clearTag('kitchenFurn'); const ch = new Chunk('kitchens', 'g0'), em = new Chunk('kitchensEm', 'g0', { emis: true }), f2 = new Chunk('galley', 'f2'), f2e = new Chunk('galleyEm', 'f2', { emis: true });
  // induction plate with a glowing ring; an iron tetsubin on it (or the electric kettle once 'autokettle' lands)
  const RING = new THREE.Color(3.2, 0.95, 0.22), RINGD = new THREE.Color(1.4, 0.32, 0.06);
  const burner = (c, e, x, y, z, ry) => { at(c, x, y, z, ry || 0, () => { c.box(0.3, 0.03, 0.28, 0x141518, 0, 0.015, 0); c.box(0.31, 0.012, 0.29, 0x5a6066, 0, 0.006, 0); c.box(0.08, 0.004, 0.02, 0x2a2c31, 0.08, 0.032, 0.115);
    if (lv('autokettle')) { c.cyl(0.075, 0.09, 0.16, 12, 0xd8d4c8, 0, 0.11, 0); c.cyl(0.03, 0.03, 0.03, 8, 0x2a2c31, 0, 0.205, 0); c.bar([0.08, 0.1, 0], [0.14, 0.15, 0], 0.015, 0x3a3d42); }
    else { const IR = 0x2b2724; c.ball(0.095, IR, 0, 0.1, 0, 1, 1, 0.72, 1); c.cyl(0.07, 0.085, 0.03, 12, IR, 0, 0.05, 0); c.cyl(0.048, 0.05, 0.022, 10, 0x221f1c, 0, 0.165, 0); c.ball(0.014, 0x3a2a20, 0, 0.183, 0);
      c.cyl(0.012, 0.022, 0.085, 6, IR, 0.11, 0.12, 0, 0, 0, -0.95); c.bar([0, 0.15, -0.075], [0, 0.245, -0.045], 0.012, 0x1c1a18); c.bar([0, 0.245, -0.045], [0, 0.245, 0.045], 0.012, 0x1c1a18); c.bar([0, 0.245, 0.045], [0, 0.15, 0.075], 0.012, 0x1c1a18); c.cyl(0.011, 0.011, 0.06, 6, 0x3a2418, 0, 0.247, 0, Math.PI / 2); } });
    at(e, x, y, z, ry || 0, () => { e.torus(0.118, 0.012, 20, RING, 0, 0.036, 0, Math.PI / 2); e.torus(0.135, 0.004, 20, RINGD, 0, 0.033, 0, Math.PI / 2); e.box(0.012, 0.004, 0.012, 0xff6a2a, 0.12, 0.032, 0.115); }); };
  // a little steam off the spout of a kettle that's kept hot (static soft sprites)
  const steam = (x, y, z) => { for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: 0xf2eee8, transparent: true, opacity: 0.13 - i * 0.03, depthWrite: false })); sp.position.set(x + 0.16 + i * 0.025, y + 0.25 + i * 0.1, z + Math.sin(i * 2.1) * 0.02); const s = 0.08 + i * 0.07; sp.scale.set(s, s * 1.3, 1); sp.renderOrder = 3; sp.userData.keepGeo = true; g.add(sp); } };
  if (S.ch >= 1 && S.flags.power && !lv('autokettle')) steam(0.95, 0.94, -5.1);
  if (S.ch >= 1) burner(ch, em, 0.95, 0.94, -5.1); if (lv('burner2')) burner(ch, em, 2.0, 0.94, -5.12);
  if (lv('timers')) for (const x of [1.45, 1.6]) { ch.box(0.07, 0.05, 0.04, 0xe8e4dc, x, 0.97, -5.28); em.box(0.04, 0.015, 0.002, 0x7fd88f, x, 0.975, -5.258); }
  if (lv('scales')) { ch.box(0.2, 0.03, 0.18, 0xd8d8d0, 0.72, 0.955, -5.0); ch.box(0.16, 0.005, 0.14, C.steel, 0.72, 0.972, -5.0); em.box(0.06, 0.02, 0.002, 0x33e4ff, 0.72, 0.955, -4.909); }
  if (lv('bigpot')) ch.cyl(0.15, 0.15, 0.24, 14, C.steel, 1.6, 1.06, -5.18);
  if (lv('dumbwaiter')) { ch.box(0.05, 0.7, 0.62, 0x6a6e74, 2.47, 1.25, -2.2); ch.box(0.03, 0.6, 0.52, 0x2a2c31, 2.44, 1.25, -2.2); em.box(0.01, 0.03, 0.03, 0x7fd88f, 2.44, 1.65, -1.85); }
  if (lv('galley') && S.ch >= 2) { // a narrow galley along the right wall upstairs, clear of the stair landing
    f2.box(0.5, 0.88, 1.62, 0x3a2a20, 2.25, F2 + 0.44, -4.42); f2.box(0.54, 0.05, 1.66, 0x9a9890, 2.24, F2 + 0.905, -4.42);
    for (const z of [-4.85, -4.0]) burner(f2, f2e, 2.2, F2 + 0.93, z, -Math.PI / 2);
    f2.box(0.3, 0.02, 1.4, C.cedarD, 2.38, F2 + 1.55, -4.42); for (let i = 0; i < 6; i++) P.cupStack(f2, 2.38, F2 + 1.56, -5.0 + i * 0.22, 3, spick([C.ceramic, C.celadon]));
    f2.cyl(0.08, 0.06, 0.07, 10, 0x3a2a24, 2.25, F2 + 0.965, -4.42); P.whisk(f2, 2.32, F2 + 0.93, -4.62);
    if (lv('pantry')) for (let i = 0; i < 5; i++) P.jar(f2, 2.38, F2 + 1.97, -4.9 + i * 0.22, spick([0x5f7d38, 0xc8a050, 0x8a5a2a]), 0.18);
    solid(1.98, 2.5, F2, F2 + 1.0, -5.25, -3.6, 'kitchenFurn'); }
  if (S.flags.counterBuilt) { ch.cyl(0.15, 0.13, 0.42, 12, 0x3a4a3a, -2.3, 0.21, -4.6); ch.cyl(0.155, 0.155, 0.03, 12, 0x2a362a, -2.3, 0.43, -4.6); ch.box(0.1, 0.02, 0.04, C.steel, -2.3, 0.44, -4.46); solidC(-2.3, -4.6, 0.3, 0.3, 0, 0.45, 'kitchenFurn'); }
  if (S.flags.counterBuilt) { ch.cyl(0.15, 0.13, 0.42, 12, 0x3a4a3a, -2.3, 0.21, -4.6); ch.cyl(0.155, 0.155, 0.03, 12, 0x2a362a, -2.3, 0.43, -4.6); ch.box(0.1, 0.02, 0.04, C.steel, -2.3, 0.44, -4.46); solidC(-2.3, -4.6, 0.3, 0.3, 0, 0.45, 'kitchenFurn'); }
  if (lv('cartburner') && S.ch >= 3) burner(ch, em, YT.x + 0.4, 1.0, YT.z - 0.38, Math.PI);
  for (const [c, gg] of [[ch, g], [em, g], [f2, g], [f2e, g]]) addBuilt(gg, c);
}

function dumpTray() { const h = player.hold; if (!h || h.kind !== 'tray') return; toast(`You tip ${h.n} cup${h.n > 1 ? 's' : ''} of ${RECIPES[h.rid].name} away.`); holdItem(null); Snd.knock(); }
function setupBinIA() {
  removeIA(/^(dumpBin|kitchenBin)/);
  addIA({ id: 'dumpBin', box: [4.1, 0.7, -9.35, 1.1, 1.4, 1.7], name: 'Dumpster', verb: 'Throw the cups away', cond: () => !!(player.hold && player.hold.kind === 'tray') && S.beat !== 'trash', act: dumpTray });
  addIA({ id: 'kitchenBin', box: [-2.3, 0.3, -4.6, 0.4, 0.6, 0.4], name: 'Kitchen bin', verb: 'Throw the cups away', cond: () => !!(player.hold && player.hold.kind === 'tray') && !!S.flags.counterBuilt, act: dumpTray });
}

