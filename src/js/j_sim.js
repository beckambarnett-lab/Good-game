/* game-time timers (pause-safe) */
const TIMERS = [];
function later(sec, fn) { TIMERS.push({ t: sec, fn }); }
const setTimeoutG = (fn, ms) => later((ms || 0) / 1000, fn);
function updateTimers(dt) { for (let i = TIMERS.length - 1; i >= 0; i--) { const t = TIMERS[i]; t.t -= dt; if (t.t <= 0) { TIMERS.splice(i, 1); t.fn(); } } }
/* ================= simulation: people, orders, staff, crates ================= */
const NPCS = [];
const ZONE_FLOOR = { g0: 0, f2: 3.6, f3: 6.8, roof: 10 };
function spawnNPC(look, x, y, z, yaw) { const p = makePerson(look); p.root.position.set(x, y, z); p.root.rotation.y = yaw || 0; scene.add(p.root); const n = { p, pos: p.root.position, path: null, speed: rand(1.15, 1.4), onArrive: null, pose: null, yawT: yaw || 0, hit: null, name: look.name || '', alive: true, probeT: 0 }; NPCS.push(n); return n; }
function removeNPC(n) { n.alive = false; scene.remove(n.p.root); if (n.ia) removeIA(n.ia.id); const i = NPCS.indexOf(n); if (i >= 0) NPCS.splice(i, 1); }
function npcGo(n, node, cb) { const from = nearestWp(n.pos); const path = from ? wpPath(from, node) : null; if (!path) { n.path = [WP[node].p.clone()]; } else n.path = path; n.onArrive = cb || null; n.pose = null; }
function npcGoPt(n, v, cb) { n.path = [v.clone()]; n.onArrive = cb || null; n.pose = null; }
function faceTo(n, x, z) { n.yawT = Math.atan2(x - n.pos.x, z - n.pos.z); }
function updateNPCs(dt) {
  for (const n of NPCS.slice()) {
    let moving = false;
    if (n.path && n.path.length) {
      const t = n.path[0]; const dx = t.x - n.pos.x, dz = t.z - n.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.06) { n.pos.y = t.y; n.path.shift(); if (!n.path.length) { n.path = null; const cb = n.onArrive; n.onArrive = null; if (cb) cb(); } }
      else { const sp = Math.min(d, n.speed * dt); n.pos.x += dx / d * sp; n.pos.z += dz / d * sp; n.pos.y = lerp(n.pos.y, t.y, Math.min(1, sp / Math.max(d, 0.01))); n.yawT = Math.atan2(dx, dz); moving = true; }
    }
    n.p.root.rotation.y = lerpAngle(n.p.root.rotation.y, n.yawT, 1 - Math.exp(-dt * 8));
    const out = !sheltered(n.pos) && n.pos.z > -0.1 && n.p.look.umbrella;
    const pose = n.pose || (moving ? (out ? 'umbrella' : (n.carry ? 'carry' : 'walk')) : (out && n.p.look.umbrella ? 'umbrella' : 'idle'));
    // look at the player when close
    const dp = n.pos.distanceTo(player.pos); n.p.lookAt = (dp < 3.2 && !moving) || n.lookPlayer ? camera.position : null;
    const far = n.pos.distanceToSquared(camera.position) > (tierName === 'high' ? 1600 : tierName === 'medium' ? 576 : 324) || (Math.abs(n.pos.y - camera.position.y) > 4 && playerIndoors());
    const inCam = !!player.focus && Math.hypot(n.pos.x - camera.position.x, n.pos.y + 1.2 - camera.position.y, n.pos.z - camera.position.z) < 0.75; // never let someone fill the station view
    n.p.root.visible = !far && !inCam; if (far && frameN % 3) continue;
    animPerson(n.p, dt, moving, pose);
    n.probeT -= dt; if (n.probeT < 0) { n.probeT = 0.4 + Math.random() * 0.2; updateProbe(n.p, n.pos); }
    if (n.carryObj) n.carryObj.visible = true;
  }
}
/* ---------- waypoints ---------- */
function initWaypoints() {
  for (const k of Object.keys(WP)) delete WP[k];
  wp('sL', -25, 0.12, 1.3); wp('sW2', -12, 0.12, 1.3); wp('sW1', -4, 0.12, 1.3); wp('sDoor', 1.35, 0.12, 1.3); wp('sE1', 3.6, 0.12, 1.3); wp('sE2', 12, 0.12, 1.3); wp('sR', 25, 0.12, 1.3);
  link('sL', 'sW2', 'sW1', 'sDoor', 'sE1', 'sE2', 'sR');
  wp('fL', -25, 0.12, 12.9); wp('fM', 2, 0.12, 12.9); wp('fR', 25, 0.12, 12.9); link('fL', 'fM', 'fR'); wp('cN', 2.0, 0.12, 2.2); wp('cS', 2.0, 0, 7); link('sDoor', 'cN', 'cS', 'fM'); link('sE1', 'cN');
  wp('dOut', 1.35, 0.12, 0.55); wp('dIn', 1.35, 0, -0.7); link('sDoor', 'dOut', 'dIn');
  wp('a1', 1.35, 0, -1.65); wp('a2', 0.1, 0, -1.65); wp('a25', -0.6, 0, -1.65); wp('a3', -1.3, 0, -1.65); wp('a4', -2.0, 0, -1.65); link('dIn', 'a1', 'a2', 'a25', 'a3', 'a4');
  wp('st0', -2.0, 0, -2.28); wp('st1', -1.3, 0, -2.28); wp('st2', -0.6, 0, -2.28); wp('st3', 0.1, 0, -2.28); link('a4', 'st0'); link('a3', 'st1'); link('a25', 'st2'); link('a2', 'st3');
  for (const [i, x] of [-1.95, -1.3, -0.65, 0.0, -1.6, -0.4].entries()) { wp('wa' + i, x, 0, -1.4); wp('w' + i, x, 0, -0.98); link('wa' + i, 'w' + i); const near = ['a4', 'a3', 'a25', 'a2'].map(k => [k, Math.abs(WP[k].p.x - x)]).sort((p, q) => p[1] - q[1])[0][0]; link('wa' + i, near); }
  wp('gap', 1.3, 0, -2.6); wp('b1', 1.3, 0, -4.15); wp('b2', -0.3, 0, -4.2); wp('kettle', -1.45, 0, -4.35); wp('sink', 1.25, 0, -4.35); link('a1', 'gap', 'b1', 'b2', 'kettle'); link('b1', 'sink');
  wp('alleyIn', 2.2, 0, -4.2); wp('alleyOut', 3.15, 0.06, -4.2); wp('drop', 3.6, 0.06, -2.5); wp('alleyMouth', 2.95, 0.06, 0.4); wp('dump', 3.4, 0.06, -8.3); link('b1', 'alleyIn', 'alleyOut', 'drop', 'alleyMouth', 'sE1'); link('alleyOut', 'dump');
  wp('bd1', 0, 0, -4.9); wp('bd2', 0, 0, -6.1); wp('fuse', 2.0, 0, -6.0); wp('holo', 1.2, 0, -5.85); wp('stB', -2.05, 0, -7.35); wp('stB2', -1.9, 0, -6.6);
  link('b2', 'bd1', 'bd2', 'fuse'); link('bd2', 'holo'); link('bd2', 'stB2', 'stB');
  wp('aw0', -1.05, 0.12, 0.6); wp('aw1', 0.08, 0.12, 0.6); link('sW1', 'aw0'); link('sDoor', 'aw1'); link('aw0', 'aw1');
  wp('gen', -4.3, 0.12, 0.9); link('sW1', 'gen');
}
/* ---------- seats ---------- */
function seatList() {
  const s = [];
  for (let i = 0; i < 4; i++) s.push({ id: 'st' + i, node: 'st' + i, yaw: Math.PI, kind: 'stool', sp: 'g0' });
  const ws = lv('stools') ? [0, 1, 2, 3] : [4, 5]; for (const i of ws) s.push({ id: 'w' + i, node: 'w' + i, yaw: 0, kind: 'stool', sp: 'g0' });
  if (lv('bench')) { s.push({ id: 'aw0', node: 'aw0', yaw: 0, kind: 'stool', sp: 'out', h: 0.6 }); s.push({ id: 'aw1', node: 'aw1', yaw: 0, kind: 'stool', sp: 'out', h: 0.6 }); }
  if (typeof extraSeats === 'function') extraSeats(s);
  return s;
}
let SEATS = [];
function refreshSeats() { const occ = {}; for (const s of SEATS) if (s.occ) occ[s.id] = s.occ; SEATS = seatList(); for (const s of SEATS) s.occ = occ[s.id] || null; }
/* ---------- customers ---------- */
const CUST = [];
let spawnT = 6;
const NAMES = ['Ken', 'Mai', 'Haruto', 'Yui', 'Sota', 'Hina', 'Riku', 'Aoi', 'Daiki', 'Emi', 'Kaito', 'Nana', 'Ren', 'Saki', 'Yuto', 'Mio', 'Taro', 'Kana', 'Shun', 'Rei'];
function pickOrder(c) {
  const sp = c && c.seat ? c.seat.sp : 'g0';
  let rs = unlockedRecipes().filter(r => S.ch >= r.ch);
  if (sp === 'g0' || sp === 'out') rs = rs.filter(r => r.st === 'kettle' || r.st === 'shaker');
  if (sp === 'f2') rs = rs.filter(r => r.id === 'matcha' || r.id === 'gyokuro' || r.id === 'sencha' || r.id === 'blend');
  if (sp === 'togo') rs = rs.filter(r => r.st === 'shaker' || r.id === 'hoji');
  if (!rs.length) rs = [RECIPES[0]];
  const w = rs.map(r => 1 + r.ch * 0.6 + (sp === 'f2' && r.id === 'matcha' ? 2.5 : 0) - (r.id === 'gyokuro' ? 0.5 : 0)); let t = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < rs.length; i++) { t -= w[i]; if (t <= 0) return RID[rs[i].id]; } return RID[rs[0].id];
}
const PAT = { g0: 75, out: 90, f2: 120, terrace: 90, togo: 45, roof: 95 };
function sitPose(seat) { return seat.kind === 'kneel' ? 'kneel' : seat.kind === 'stand' ? 'idle' : 'sit'; }
function drinkPose(seat) { return seat.kind === 'kneel' ? 'kneelDrink' : seat.kind === 'stand' ? 'idle' : 'sitDrink'; }
function spawnCustomer(o) {
  o = o || {}; const free = SEATS.filter(s => !s.occ && (!o.seatKind || s.sp === o.seatKind)); if (!free.length) return null;
  const seat = o.seat ? SEATS.find(s => s.id === o.seat && !s.occ) || pick(free) : pick(free);
  const side = Math.random() < 0.5 ? 'sL' : 'sR'; const st = WP[side].p;
  const look = o.look || randomLook(); const n = spawnNPC(look, st.x, st.y, st.z, side === 'sL' ? Math.PI / 2 : -Math.PI / 2);
  const c = { n, seat, rid: 0, state: 'arrive', pat: 0, patMax: ((PAT[seat.sp] || 75) + (seat.sp === 'terrace' && lv('heaters') ? 30 : 0)) * (SET.relaxed ? 3 : 1), name: o.name || pick(NAMES), reg: o.reg || null, drinkT: 0, ticket: null, mod: null, onServed: o.onServed };
  c.rid = o.rid != null ? o.rid : pickOrder(c); seat.occ = c; CUST.push(c);
  npcGo(n, seat.node, () => { n.pos.y = WP[seat.node].p.y; n.yawT = seat.yaw; n.pose = sitPose(seat); seatOffset(n, seat); c.state = 'order'; makeTicket(c); Snd.bell(); if (o.onSeat) o.onSeat(c); });
  // interaction: serve
  c.ia = addIA({ id: 'cust' + Math.random().toString(36).slice(2, 7), obj: custHit(n), name: () => `${c.reg ? (SPEAKERS[c.reg] || [c.name])[0] : c.name} · ${RECIPES[c.rid].name}`, verb: () => holdsFor(c) ? 'Serve' : (c.state === 'drink' ? 'Enjoying it' : c.state === 'order' ? 'Waiting for ' + RECIPES[c.rid].name : '…'), act: () => serveCustomer(c), cond: () => c.state === 'order' || c.state === 'drink', reach: 2.4 });
  n.ia = c.ia; return c;
}
function seatOffset(n, seat) { if (seat.kind === 'stool') { n.pos.y += (seat.h != null ? seat.h - 0.72 : 0) * 0; const back = 0.0; n.pos.x += Math.sin(seat.yaw) * back; n.pos.z += Math.cos(seat.yaw) * back; } }
function custHit(n) { const m = new THREE.Mesh(gBox(), HIT); m.scale.set(0.6, 1.5, 0.6); m.position.set(0, 0.85, 0); n.p.root.add(m); return m; }
function holdsFor(c) { const h = player.hold; return h && h.kind === 'tray' && h.n > 0 && h.rid === c.rid && c.state === 'order'; }
function serveCustomer(c) {
  if (c.state === 'drink') { toast(`${c.reg ? SPEAKERS[c.reg][0] : c.name} is enjoying the tea.`); return; }
  if (c.state !== 'order') return; const h = player.hold;
  if (!h || h.kind !== 'tray') { toast(`${c.reg ? SPEAKERS[c.reg][0] : c.name} would like ${RECIPES[c.rid].name}. Brew it at the kettle.`); return; }
  if (h.rid !== c.rid) { toast(`They ordered ${RECIPES[c.rid].name}, not ${RECIPES[h.rid].name}.`); Snd.miss(); return; }
  const es = h.stars;
  h.n--; if (h.n <= 0) holdItem(null); else setHandItem(h);
  completeServe(c, es, true);
}
function completeServe(c, stars, byPlayer) {
  c.state = 'drink'; c.drinkT = c.seat.kind === 'stand' ? 1.5 : rand(16, 24); c.n.pose = drinkPose(c.seat); removeTicket(c);
  const R = RECIPES[c.rid]; const mul = [0, 0.7, 1.0, 1.3][stars] * (c.reg ? 1.2 : 1); const speed = clamp(1 - c.pat / c.patMax, 0, 1); const tip = Math.round(R.price * 0.35 * speed * (stars / 3));
  const pay = Math.round(R.price * mul + tip); S.yen += pay; S.stats.earned += pay; S.stats.served++; if (stars === 3) S.stats.perfect++;
  const hp = c.n.pos.clone(); hp.y += 1.8; popAt(hp, '+' + yen(pay)); if (stars === 3 && byPlayer) { const hp2 = hp.clone(); hp2.y += 0.3; popAt(hp2, 'Perfect cup', 'small'); }
  Snd.coin(); if (S.flags.critic === 'here' && c.critic) { S.flags.critic = stars === 3 ? true : false; if (stars === 3) toast('That was a food critic. Appeal +5 for the rest of the chapter.'); }
  if (c.onServed) c.onServed(c, stars); if (typeof onServeHook === 'function') onServeHook(c, stars);
}
function customerLeave(c, happy) {
  c.state = 'leave'; removeTicket(c); c.seat.occ = null; c.n.pose = null;
  if (!happy) { const hp = c.n.pos.clone(); hp.y += 1.8; popAt(hp, 'Left without tea', 'bad'); S.flags.dip = 60; }
  const exit = Math.random() < 0.5 ? 'sL' : 'sR'; npcGo(c.n, exit, () => { removeNPC(c.n); const i = CUST.indexOf(c); if (i >= 0) CUST.splice(i, 1); });
  if (c.ia) removeIA(c.ia.id);
}
function updateCustomers(dt) {
  if (S.flags.open) { spawnT -= dt; const ap = appeal() - (S.flags.dip > 0 ? 3 : 0); const iv = clamp(34 / (1 + ap / 8), 6, 30) * (WX.storm ? 0.77 : 1) * (S.flags.surge > 0 ? 0.6 : 1); if (spawnT <= 0) { spawnT = iv * rand(0.75, 1.25); if (CUST.length < SEATS.length && !S.flags.noSpawn) spawnCustomer(); } }
  if (S.flags.dip > 0) S.flags.dip -= dt; if (S.flags.surge > 0) S.flags.surge -= dt;
  for (const c of CUST.slice()) {
    if (c.state === 'order') { if (!c.noPat) c.pat += dt; if (c.pat > c.patMax) customerLeave(c, false); }
    else if (c.state === 'drink') { c.drinkT -= dt; if (c.drinkT <= 0) { if (c.onDone) c.onDone(c); else customerLeave(c, true); } }
  }
}
/* ---------- order tickets on the rail ---------- */
const TICKETS = [];
function makeTicket(c) {
  const tex = panelTex(96, 128, () => { }); const m = new THREE.Mesh(gPlaneIdx(), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, color: new THREE.Color(1.1, 1.1, 1.1) })); m.scale.set(0.075, 0.1, 1);
  const rail = ticketRail(c.seat); m.position.copy(rail.base); m.rotation.y = rail.ry; scene.add(m); const t = { c, m, tex, sw: Math.random() * 6, rail }; c.ticket = t; TICKETS.push(t); layoutTickets(); drawTicket(t);
}
function ticketRail(seat) { if (seat.sp === 'f2') return railF2(); if ((seat.sp === 'terrace' || seat.sp === 'togo') && typeof railYatai === 'function') return seat.sp === 'togo' ? railYatai() : railTerrace(); if (seat.sp === 'roof' && typeof railRoof === 'function') return railRoof(); return { base: new THREE.Vector3(0.4, 1.96, -3.0), ry: Math.PI, dx: -0.11, key: 'g0' }; }
function removeTicket(c) { const t = c.ticket; if (!t) return; scene.remove(t.m); t.tex.dispose(); TICKETS.splice(TICKETS.indexOf(t), 1); c.ticket = null; layoutTickets(); }
function layoutTickets() { const per = {}; for (const t of TICKETS) { const k = t.rail.key; per[k] = (per[k] || 0) + 1; const i = per[k] - 1; t.m.position.copy(t.rail.base).add(new THREE.Vector3((t.rail.dx || 0) * i, 0, (t.rail.dz || 0) * i)); } }
function drawTicket(t) { const x = t.tex.userData.ctx, c = t.c, R = RECIPES[c.rid]; const k = c.pat / c.patMax; x.fillStyle = k < 0.5 ? '#efe4cc' : k < 0.8 ? '#ffcf8f' : '#ff9a8a'; x.fillRect(0, 0, 96, 128); x.fillStyle = '#2a2118'; x.font = `48px ${FONT_SIGN}`; x.textAlign = 'center'; x.fillText(R.icon, 48, 58); x.font = `13px ${FONT_UI}`; x.fillText(R.name.length > 13 ? R.name.slice(0, 12) + '…' : R.name, 48, 84); x.font = `12px ${FONT_DOT}`; x.fillText('SEAT ' + c.seat.id.toUpperCase(), 48, 104); x.fillStyle = '#c2362b'; x.fillRect(8, 114, 80 * (1 - k), 6); t.tex.needsUpdate = true; }
function updateTickets(dt) { for (const t of TICKETS) { t.sw += dt; t.m.rotation.z = Math.sin(t.sw * 1.3) * 0.04; if (frameN % 30 === 0) drawTicket(t); } }
/* ---------- passers-by ---------- */
const PASS = [];
function updatePassers(dt) {
  if (S.flags.shutterUp && PASS.length < (tierName === 'high' ? (S.ch >= 1 ? 7 : 4) : tierName === 'medium' ? 4 : 2) && Math.random() < dt * 0.4) { const far = Math.random() < 0.45; const dir = Math.random() < 0.5 ? 1 : -1; const z = far ? rand(12.3, 13.5) : rand(1.0, 1.9); const x = -dir * 26; const n = spawnNPC(randomLook({ umbrella: Math.random() < 0.85 }), x, 0.12, z, dir > 0 ? Math.PI / 2 : -Math.PI / 2); n.speed = rand(1.1, 1.5); npcGoPt(n, new THREE.Vector3(dir * 26, 0.12, z + rand(-0.3, 0.3)), () => { removeNPC(n); PASS.splice(PASS.indexOf(n), 1); }); PASS.push(n); }
}
/* ---------- holding things ---------- */
function holdItem(it) { player.hold = it; setHandItem(it); }
function putDown() {
  const h = player.hold; if (!h) return;
  if (h.kind === 'tray') { if (h.n > 0 && player.pos.z < -2.4 && player.pos.z > -5.2 && playerIndoors() && player.pos.y < 1) { stowTray(); } else if (h.n > 0) { toast('Set the cups on the tea counter: stand behind the counter downstairs and press Q.'); } else holdItem(null); return; }
  if (h.kind === 'crate') { dropCrateAt(h.id, player.pos.clone().add(new THREE.Vector3(-Math.sin(player.yaw) * 0.7, 0, -Math.cos(player.yaw) * 0.7))); holdItem(null); return; }
  if (h.kind === 'trash' || h.kind === 'planks' || h.kind === 'kettle') { toast('Keep hold of it for now.'); return; }
  holdItem(null);
}
// the pass: cups waiting on the counter end
let PASS_OBJ = null;
function updatePass() { refreshTeaCups(); }
function takeFromPass() { }
/* ---------- crates & installing ---------- */
const CRATE_OBJS = [];
function availableUpgrades() { return UPG.filter(u => u.ch <= S.ch && (u.max ? lv(u.id) < u.max : !lv(u.id)) && (!u.req || u.req())); }
function buyUpgrade(id) {
  if (id === 'leaves') { if (!canPay(600)) return; pay(600); S.leaves += 10; Snd.coin(); toast('Ten portions of tea leaves, delivered to the shelf.'); return; }
  if (id === 'leaves50') { if (!canPay(2700)) return; pay(2700); S.leaves += 50; Snd.coin(); toast('Fifty portions of tea leaves, stacked on the shelf.'); return; }
  const u = UID[id]; if (!u || !canPay(u.cost)) return; pay(u.cost); S.pending = S.pending || []; S.pending.push({ id, t: 20 }); Snd.coin(); toast(`${u.name} ordered. Tomo will drop it at the alley door.`); save();
}
function hireStaff(id) { const s = STAFF.find(x => x.id === id); if (!s || S.staff[id] || !canPay(s.cost)) return; pay(s.cost); S.staff[id] = 1; Snd.chime(); toast(`${s.name} is on the crew.`); if (typeof onHire === 'function') onHire(id); save(); }
function updateDeliveries(dt) { const ps = S.pending || []; for (const p of ps.slice()) { p.t -= dt; if (p.t <= 0) { ps.splice(ps.indexOf(p), 1); S.crates.push(p.id); refreshCrates(); if (typeof tomoDrop === 'function') tomoDrop(); toast(`Delivery at the alley door: ${UID[p.id].name}.`); } } }
function dropZonePos(i) { return new THREE.Vector3(3.95 - (i % 2) * 0.6, 0.06, -2.2 - Math.floor(i / 2) * 0.55); }
function refreshCrates() {
  for (const o of CRATE_OBJS) { scene.remove(o); if (o.userData.ia) removeIA(o.userData.ia.id); } CRATE_OBJS.length = 0;
  const all = S.crates.map((id, i) => ({ id, pos: dropZonePos(i), idx: i })).concat((S.dropped || []).map((d, i) => ({ id: d.id, pos: new THREE.Vector3(d.x, d.y, d.z), dropped: i })));
  for (const c of all) { const g = crateObj(c.id); g.position.copy(c.pos); g.rotation.y = rand(-0.2, 0.2); scene.add(g); const gm = g.userData.mat; probeAt(c.pos, zoneAt(c.pos), gm.userData.probe.value); CRATE_OBJS.push(g);
    const r = addIA({ id: 'crate' + Math.random().toString(36).slice(2, 6), box: [c.pos.x, c.pos.y + 0.25, c.pos.z, 0.6, 0.6, 0.5], name: (UID[c.id] ? UID[c.id].name : 'Crate') + ' crate', verb: 'Pick up', act: () => { if (player.hold) { toast('Your hands are full.'); return; } if (c.dropped != null) S.dropped.splice(c.dropped, 1); else S.crates.splice(c.idx, 1); holdItem({ kind: 'crate', id: c.id }); refreshCrates(); showGhost(c.id); } }); g.userData.ia = r; }
}
function dropCrateAt(id, p) { S.dropped = S.dropped || []; const h = groundUnder(p.x, p.z, player.pos.y); S.dropped.push({ id, x: p.x, y: h, z: p.z }); refreshCrates(); hideGhost(); }
// where each upgrade goes
function UPOS(id) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const out = (spot, stand, size, axis) => ({ spot, cam: { pos: stand.clone().add(V(0, 1.55, 0)), at: spot }, size, axis });
  return ({
    barrel2: out(V(3.15, 1.3, -6.2), V(3.7, 0.06, -4.9), [0.62, 0.5, 0.62], V(0, 1, 0)), gutter: out(V(2.75, 2.8, 0.75), V(1.8, 0.12, 2.0), [0.15, 0.6, 0.15], V(0, 1, 0)),
    lanterns: out(V(-0.8, 3.0, 0.62), V(-0.8, 0.12, 2.1), [4.5, 0.4, 0.3]), awning: out(V(-1.0, 2.7, 0.8), V(-1.0, 0.12, 2.2), [4.4, 0.1, 1.4]),
    bench: out(V(-0.8, 0.45, 0.58), V(-0.8, 0.12, 2.1), [2.3, 0.6, 0.5]), vending: out(V(4.15, 1.0, 0.45), V(3.6, 0.12, 2.2), [1.0, 1.9, 0.8]), cladding: out(V(0, 5.2, 0.1), V(0, 0.12, 3.2), [5.0, 0.3, 0.1]),
    stools: out(V(-1.3, 0.4, -0.95), V(-1.3, 0, -1.9), [1.6, 0.7, 0.4]), menu: out(V(2.3, 0.5, 1.2), V(1.6, 0.12, 2.1), [0.55, 0.9, 0.4]),
    neon: out(V(-3.45, 3.0, 2.25), V(-2.4, 0.12, 3.2), [0.3, 2.0, 0.3]), kyusu: out(V(-0.97, 1.02, -5.04), V(-1.0, 0, -4.2), [0.2, 0.15, 0.2]),
    tetsubin: out(V(-1.45, 1.05, -5.08), V(-1.4, 0, -4.2), [0.25, 0.2, 0.25]),
    burner2: out(V(2.0, 1.0, -5.08), V(2.0, 0, -4.2), [0.4, 0.1, 0.35]), timers: out(V(1.5, 1.0, -5.2), V(1.5, 0, -4.2), [0.3, 0.12, 0.2]),
    dumbwaiter: out(V(2.45, 1.0, -2.2), V(1.6, 0, -2.2), [0.1, 0.8, 0.6], V(0, 1, 0)), tearack: out(V(-1.0, 1.08, -3.2), V(-1.0, 0, -3.95), [2.6, 0.08, 0.2], V(1, 0, 0)),
    scales: out(V(0.75, 1.0, -5.1), V(0.8, 0, -4.2), [0.25, 0.08, 0.2]), autokettle: out(V(1.0, 1.08, -5.1), V(1.0, 0, -4.2), [0.25, 0.25, 0.2]), bigpot: out(V(1.6, 1.1, -5.15), V(1.6, 0, -4.2), [0.35, 0.3, 0.35]),
  })[id] || staffUPOS(id) || (typeof UPOS2 === 'function' ? UPOS2(id) : null);
}
let GHOST = null;
function showGhost(id) { hideGhost(); const u = UPOS(id); if (!u) return; const g = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(...u.size), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 2.0), transparent: true, opacity: 0.12, depthWrite: false })); const ed = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: new THREE.Color(0.5, 2.2, 2.8) })); g.add(box, ed); g.position.copy(u.spot); g.layers.enable(1); scene.add(g); GHOST = { g, id, u };
  GHOST.ia = addIA({ id: 'ghost', box: [u.spot.x, u.spot.y, u.spot.z, Math.max(0.5, u.size[0]), Math.max(0.6, u.size[1]), Math.max(0.5, u.size[2])], name: UID[id].name, verb: JOB_NAMES[UID[id].job], reach: 3.2, cond: () => player.hold && player.hold.kind === 'crate' && player.hold.id === id, act: () => installUpgrade(id) }); }
function hideGhost() { if (GHOST) { scene.remove(GHOST.g); removeIA('ghost'); GHOST = null; } }
function installUpgrade(id) {
  const u = UID[id], pos = UPOS(id);
  startJob(u.job, { title: `${JOB_NAMES[u.job]} · ${u.name}`, cam: pos.cam, spot: pos.spot, size: pos.size, axis: pos.axis, n: u.job === 'bolt' ? 4 : 3, label: u.name.toUpperCase(), done: () => {
    holdItem(null); hideGhost(); S.up[id] = (S.up[id] || 0) + 1; Snd.build(); toast(`${u.name}: installed.`); applyUpgrade(id); save();
  } });
}
function applyUpgrade(id) {
  const sp = UID[id].space; if (sp === 'facade' || sp === 'street' || sp === 'terrace') { buildFacade(); rebakeStreet(); }
  if (sp === 'ground' || id === 'stools' || id === 'barrel2') { buildG0(); buildKettleStation(); }
  if (sp === 'alley') { buildG0(); if (id === 'yatainoren') buildFacade(); }
  if (['burner2', 'timers', 'galley', 'dumbwaiter', 'cartburner', 'tearack', 'scales', 'pantry', 'autokettle', 'bigpot'].includes(id)) { buildKitchens(); buildTeaCounter(); }
  if (typeof applyUpgrade2 === 'function') applyUpgrade2(id);
  refreshSeats(); if (id === 'neon' || id === 'menu') { }
}
function rebakeStreet() { CITY.group.traverse(o => { if (o.isMesh && o.name === 'ground') rebake(o, 'street'); if (o.isMesh && o.name === 'street') rebake(o, 'street'); }); }
/* ---------- staff: Rin ---------- */
const STAFFN = {};
function spawnStaff(id) {
  if (BARISTAS.includes(id)) { spawnBarista(id); return; }
  if (STAFFN[id]) return; const looks = crewLooks(); const n = spawnNPC(looks[id], WP.b2.p.x, 0, WP.b2.p.z, Math.PI); n.speed = 1.3; STAFFN[id] = { n, state: 'idle', t: 0, job: null };
  n.ia = addIA({ id: 'staff_' + id, obj: custHit(n), name: SPEAKERS[id][0], verb: 'Talk', act: () => staffTalk(id) });
}
function staffTalk(id) { const lines = { kenta: ['Ramen counters taught me one thing: oldest ticket first.', 'If the counter fills up, I run cups off it.'], yui: ['Whoever waited longest gets the next cup. That\'s the rule.', 'Upstairs is busy tonight. I\'ll take the stairs.'], sora: ['Breathe. The kettle won\'t boil faster if you stare at it.', 'I keep a pot going for whoever needs it most.'], rin: ['If you master a recipe, I can brew it for you.', 'The regulars like it when you bring the tray yourself.', 'Kaiun made us pour coffee into a cup with a QR code on it. This is better.'] }[id] || ['…']; say([{ w: id, t: pick(lines) }], null, () => STAFFN[id].n.pos.clone().add(new THREE.Vector3(0, 1.6, 0))); }
function updateStaff(dt) {
  updateBaristas(dt);
  const r = null; if (r) {
    const n = r.n;
    if (r.state === 'idle') { r.t -= dt; if (r.t <= 0) { r.t = 1; const c = CUST.find(c => { const R = RECIPES[c.rid]; return c.state === 'order' && !c.claimed && (S.mastery[R.id] || 0) >= MASTER_N && R.st === 'kettle' && (R.roast ? S.roasted > 0 : S.leaves > 0) && S.water > 1 && c.seat.sp !== 'roof'; }); if (c) { c.claimed = 'rin'; r.job = c; r.state = 'toKettle'; npcGo(n, 'sink', () => { n.yawT = Math.PI; n.pose = 'work'; r.state = 'brew'; r.t = 12; const R = RECIPES[c.rid]; if (R.roast) S.roasted = Math.max(0, S.roasted - 1); else S.leaves = Math.max(0, S.leaves - 1); S.water = Math.max(0, S.water - 0.5); }); } else if (n.pos.distanceTo(WP.b2.p) > 0.4 && !n.path) npcGo(n, 'b2', () => { n.yawT = 0; }); } }
    else if (r.state === 'brew') { r.t -= dt; if (r.t <= 0) { const c = r.job; n.pose = null; if (!c || c.state !== 'order') { r.state = 'idle'; return; } r.state = 'carry'; n.carry = true; const cp = cupObj(c.rid); n.p.P.hdR.add(cp); cp.position.set(0, -0.1, 0.05); r.cup = cp; const approach = c.seat.node.startsWith('st') ? ({ st0: 'a4', st1: 'a3', st2: 'a25', st3: 'a2' })[c.seat.node] : c.seat.node.startsWith('w') ? 'wa' + c.seat.node.slice(1) : c.seat.node; npcGo(n, approach, () => { faceTo(n, c.n.pos.x, c.n.pos.z); if (c.state === 'order') completeServe(c, 2, false); n.carry = false; if (r.cup) { n.p.P.hdR.remove(r.cup); r.cup = null; } r.state = 'idle'; r.t = 0.5; }); } }
  }
  // wages
  S.wageAcc = (S.wageAcc || 0) + dt; if (S.wageAcc >= 60) { S.wageAcc = 0; for (const s of STAFF) if (S.staff[s.id]) S.yen -= s.wage; }
}
/* ---------- water, saving, events ---------- */
let saveT = 20, eventT = 240;
function updateEconomy(dt) {
  if (S.flags.plumbed) S.water = Math.min(capWater(), S.water + WX.rain * (lv('gutter') ? 1.5 : 1) * 0.11 * dt);
  saveT -= dt; if (saveT <= 0) { saveT = 20; save(); }
  S.played += dt;
  if (S.flags.open) { eventT -= dt; if (eventT <= 0) { eventT = rand(240, 360); fireEvent(); } }
  if (S.flags.flicker > 0) { S.flags.flicker -= dt; if (S.flags.flicker <= 0) { toast('The power steadies.'); } }
}
function fireEvent() {
  const opts = ['surge', 'flicker', 'critic']; const e = pick(opts);
  if (e === 'surge') { S.flags.surge = 90; toast('The rain gets heavy. People are ducking in to shelter.'); }
  else if (e === 'flicker') { if (S.charge >= 0.3) { S.charge -= 0.3; toast('The block\'s power dips, but your battery keeps the neon lit.'); } else { S.flags.flicker = 10; toast('The power flickers. The neon goes dark for a moment.'); } }
  else if (e === 'critic' && S.flags.critic !== true) { const c = spawnCustomer(); if (c) { c.critic = true; S.flags.critic = 'here'; } }
}
function onTrain() { if (player.hold && player.hold.kind === 'tray' && player.moving && player.hold.n > 1) { player.hold.n--; setHandItem(player.hold); toast('The train rattles past and a cup slops off your tray.'); } }

