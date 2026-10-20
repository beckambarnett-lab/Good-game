/* ================= Chapter 5: the roof ================= */
const MAST = Vv(-2.2, FR, -5.9), RACK = Vv(-1.4, FR, -5.2), PAD = Vv(1.0, FR, -4.4), TERM = Vv(2.1, FR, -5.4);
let BIGSIGN = null;
function buildRoof() {
  reseed(5005); clearAnchors('roof'); clearTag('roofFurn'); const g = part('roof'); const ch = new Chunk('roofFurn', 'roof'), em = new Chunk('roofEm', 'roof', { emis: true });
  // always: water tank, AC units, stair-house door, antennae
  ch.box(0.9, 2.1, 0.05, S.ch >= 5 ? 0x3a3e46 : 0x55595e, 2.05, FR + 1.05, -6.72); if (S.ch < 5) solid(1.6, 2.5, FR, FR + 2.2, -6.75, -6.65, 'roofFurn');
  if (S.ch < 5) { addBuilt(g, ch); return; }
  // drone pad
  ch.box(1.6, 0.05, 1.6, 0x2a2c31, PAD.x, FR + 0.025, PAD.z); ch.torus(0.6, 0.02, 24, 0xe0b53a, PAD.x, FR + 0.06, PAD.z, Math.PI / 2); ch.box(0.6, 0.01, 0.08, 0xe0b53a, PAD.x, FR + 0.06, PAD.z); ch.box(0.08, 0.01, 0.6, 0xe0b53a, PAD.x - 0.25, FR + 0.06, PAD.z);
  if (lv('padlights')) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; em.ball(0.04, 0x33e4ff, PAD.x + Math.cos(a) * 0.78, FR + 0.08, PAD.z + Math.sin(a) * 0.78); } tagA(anchor(PAD.x, FR + 0.6, PAD.z, 0x33e4ff, lv('padlights') ? 1.2 : 0.4, 3, ['roof'], 0.3), 'roof');
  // delivery terminal
  ch.box(0.5, 1.3, 0.35, 0x2a2c31, TERM.x, FR + 0.65, TERM.z); em.box(0.36, 0.26, 0.01, 0x0a3a4a, TERM.x - 0.18, FR + 1.1, TERM.z, 0, -Math.PI / 2, 0); solidC(TERM.x, TERM.z, 0.5, 0.35, FR, FR + 1.3, 'roofFurn');
  // lightning mast + capacitor rack
  if (lv('mast')) { ch.cyl(0.06, 0.1, 6, 8, C.copper, MAST.x, FR + 3, MAST.z); ch.cone(0.07, 0.6, 6, C.copper, MAST.x, FR + 6.3, MAST.z); for (let k = 0; k < 3; k++) ch.cable([MAST.x, FR + 4 - k, MAST.z], [MAST.x + 1.5, FR + 0.4, MAST.z + 1.5 - k * 1.2], 0.1, 0.012, 0x2a2c31, 4); solidC(MAST.x, MAST.z, 0.3, 0.3, FR, FR + 3, 'roofFurn'); ch.cable([MAST.x, FR + 0.8, MAST.z], [RACK.x, FR + 0.9, RACK.z], 0.2, 0.03, C.copper, 6); }
  ch.box(1.2, 1.1, 0.45, 0x2a2c31, RACK.x, FR + 0.55, RACK.z); for (let i = 0; i < 4; i++) { ch.cyl(0.09, 0.09, 0.5, 10, 0x3a3e46, RACK.x - 0.42 + i * 0.28, FR + 0.6, RACK.z + 0.24); if (i < lv('cells')) em.box(0.12, 0.3, 0.01, 0x33e4ff, RACK.x - 0.42 + i * 0.28, FR + 0.6, RACK.z + 0.34); }
  solidC(RACK.x, RACK.z, 1.2, 0.5, FR, FR + 1.2, 'roofFurn');
  // seats
  if (lv('roofseats')) for (const [x, z] of [[-1.4, -2.0], [0.2, -2.6], [-0.6, -3.6]]) { ch.cyl(0.35, 0.35, 0.04, 12, C.cedarL, x, FR + 0.72, z); ch.cyl(0.04, 0.04, 0.7, 6, C.iron, x, FR + 0.36, z); P.stool(ch, x - 0.55, FR, z, 0.5); P.stool(ch, x + 0.55, FR, z, 0.5); ch.cyl(0.02, 0.02, 2.2, 6, C.iron, x, FR + 1.1, z); ch.cone(1.0, 0.35, 8, spick([0x2c5a6e, 0xc2362b, 0x3a3e46]), x, FR + 2.3, z); solidC(x, z, 0.7, 0.7, FR, FR + 0.8, 'roofFurn'); em.ball(0.05, 0xffd090, x, FR + 2.1, z); tagA(anchor(x, FR + 1.9, z, 0xffc080, 0.9, 3, ['roof'], 0.3), 'roof'); }
  // skybridge to the arcade roof (x 2.7..4.6)
  ch.box(2.0, 0.08, 1.0, 0x55595e, 3.65, FR - 0.04, -3.5); P.railing(ch, 2.65, -3.0, 4.65, -3.0, FR, 1.0, C.iron); P.railing(ch, 2.65, -4.0, 4.65, -4.0, FR, 1.0, C.iron);
  zoneFlat(2.5, 4.7, -3.95, -3.05, FR, 'roofFurn'); clearTag('parapetGap');
  // the big sign
  if (lv('bigsign')) {
    ch.box(1.7, 5.4, 0.2, 0x16181e, 0.0, FR + 3.2, -0.23); ch.box(1.66, 5.36, 0.02, 0x3a3e46, 0.0, FR + 3.2, -0.34); // cabinet, galvanised back
    for (let i = 0; i < 9; i++) ch.box(1.62, 0.025, 0.03, 0x4a4e56, 0, FR + 0.65 + i * 0.64, -0.36); // ribs
    // steel truss behind it, bolted to the parapet
    for (const x of [-0.7, 0.7]) { ch.box(0.1, 5.8, 0.1, 0x2a2c31, x, FR + 2.9, -0.62); ch.box(0.1, 0.1, 0.42, 0x2a2c31, x, FR + 0.1, -0.45); }
    for (let y = FR + 0.6; y < FR + 5.6; y += 1.0) { ch.box(1.5, 0.07, 0.07, 0x2a2c31, 0, y, -0.62); ch.bar([-0.7, y, -0.62], [0.7, y + 1.0, -0.62], 0.04, 0x34363c); }
    for (let y = FR + 1.0; y < FR + 5.4; y += 1.2) ch.box(0.06, 0.06, 0.3, 0x2a2c31, 0, y, -0.48);
    // service ladder, conduit and two ballast boxes with status lights
    for (let y = FR + 0.3; y < FR + 5.5; y += 0.3) ch.box(0.36, 0.025, 0.025, 0x55595e, -0.25, y, -0.72); for (const x of [-0.43, -0.07]) ch.box(0.03, 5.4, 0.03, 0x55595e, x, FR + 2.85, -0.72);
    ch.bar([0.45, FR + 0.1, -0.7], [0.45, FR + 5.3, -0.7], 0.04, 0x3a3a30); ch.box(0.3, 0.38, 0.16, 0x6a6e74, 0.45, FR + 1.2, -0.76); ch.box(0.3, 0.38, 0.16, 0x6a6e74, 0.45, FR + 3.6, -0.76);
    em.box(0.03, 0.03, 0.01, 0x3aff8a, 0.52, FR + 1.32, -0.845); em.box(0.03, 0.03, 0.01, 0x3aff8a, 0.52, FR + 3.72, -0.845);
    solid(-0.8, 0.8, FR, FR + 5.8, -0.8, -0.1, 'roofFurn');
  }
  tagA(anchor(0, FR + 1.5, -3.5, 0x6a7ab0, 0.6, 5, ['roof'], 0.3), 'roof');
  addBuilt(g, ch); addBuilt(g, em);
  if (lv('bigsign')) { BIGSIGN = neon('茶房雫', 0.0, FR + 3.2, -0.08, 0, 4.8, signHex(), { vertical: true, px: 140, k: 3.0, lit: 0, group: g }); tagA(anchor(0, FR + 3, 3, signHex(), 4, 16, ['street', 'facade', 'far'], 0.2), 'facade'); } else BIGSIGN = null;
}
HOOK.upper.push(() => { buildRoof(); clearTag('stairBlock3'); removeIA('rope3IA'); if (S.ch >= 2 && S.ch < 5) { solid(-1.65, -1.55, F3, F3 + 2, -7.8, -6.9, 'stairBlock3'); if (S.ch >= 4) addIA({ id: 'rope3IA', box: [-1.6, F3 + 0.8, -7.35, 0.3, 1.0, 0.9], name: 'Stairs to the roof', verb: 'Locked, for now', act: () => toast('The roof opens in a later renovation.') }); } });
HOOK.waypoints.push(() => {
  wp('st3a', -1.6, F3, -7.35); wp('st3b', 2.0, FR, -7.35); wp('rfL', 2.25, FR, -7.2); wp('rfD', 2.05, FR, -6.3); wp('rfC', 0.6, FR, -3.0); link('f3d', 'st3a', 'st3b', 'rfL', 'rfD', 'rfC');
  for (const [i, x, z] of [[0, -1.4, -2.0], [1, 0.2, -2.6], [2, -0.6, -3.6]]) { wp('rsa' + i, x, FR, z + 0.6); wp('rs' + i + 'L', x - 0.55, FR, z); wp('rs' + i + 'R', x + 0.55, FR, z); link('rfC', 'rsa' + i); link('rsa' + i, 'rs' + i + 'L'); link('rsa' + i, 'rs' + i + 'R'); }
});
HOOK.seats.push(s => { if (S.ch < 5 || !lv('roofseats')) return; for (let i = 0; i < 3; i++) { s.push({ id: 'rs' + i + 'L', node: 'rs' + i + 'L', yaw: Math.PI / 2, kind: 'stool', sp: 'roof' }); s.push({ id: 'rs' + i + 'R', node: 'rs' + i + 'R', yaw: -Math.PI / 2, kind: 'stool', sp: 'roof' }); } });
function railRoof() { return { base: Vv(TERM.x - 0.3, FR + 1.55, TERM.z + 0.2), ry: -Math.PI / 2, dx: 0, dz: 0.11, key: 'roof' }; }
/* ---------- lightning, collector, capacitors ---------- */
function strikeTarget() { if (S.ch >= 5 && lv('mast') && Math.random() < 0.6) return Vv(MAST.x, FR + 6.5, MAST.z); return null; }
function onStrike(near) { if (!near) return; S.collector = Math.min(1, (S.collector || 0) + 0.5); popAt(Vv(MAST.x, FR + 5, MAST.z), '+charge in the collector', 'cy'); Snd.zap(); if (player.pos.y > 9 && player.pos.distanceTo(MAST) < 8) toast('Lightning hits the mast. The collector is humming. Swap it into the capacitor rack.'); }
HOOK.init.push(() => {
  removeIA(/^(rackIA|termIA)/); if (S.ch < 5) return;
  addIA({ id: 'rackIA', box: [RACK.x, FR + 0.7, RACK.z, 1.2, 1.1, 0.6], name: () => `Capacitor rack · ${S.charge.toFixed(1)}/${capCharge().toFixed(1)}⚡ · collector ${Math.round((S.collector || 0) * 100)}%`, verb: () => (S.collector || 0) > 0.05 ? 'Swap the cell' : 'Waiting for lightning', act: () => {
    if ((S.collector || 0) < 0.05) { toast(lv('mast') ? (WX.storm ? 'No strike yet. Lightning loves that mast.' : 'Lightning only comes with thunderstorms.') : 'You need the lightning mast first.'); return; }
    startJob('align', { title: 'Swap the capacitor cell', cam: { pos: Vv(RACK.x, FR + 1.55, RACK.z + 1.0), at: Vv(RACK.x, FR + 0.6, RACK.z) }, spot: Vv(RACK.x, FR + 0.6, RACK.z + 0.3), size: [0.18, 0.5, 0.18], axis: Vv(1, 0, 0), done: () => { const add = (S.collector || 0) * 2.5; S.charge = Math.min(capCharge(), S.charge + add); S.collector = 0; Snd.zap(); toast(`+${add.toFixed(1)}⚡ stored.`); } });
  } });
  addIA({ id: 'termIA', box: [TERM.x, FR + 1.0, TERM.z, 0.5, 1.0, 0.5], name: () => `Delivery terminal · ${(S.dlv || []).length} orders`, verb: 'Pack a delivery', act: deliveryMenu });
  if (S.staff.mako) spawnMako(); if (S.staff.tomo) spawnTomo();
});
/* ---------- deliveries ---------- */
HOOK.update.push(dt => {
  if (S.ch < 5) return; S.dlv = S.dlv || []; S.dlvT = (S.dlvT == null ? 30 : S.dlvT) - dt;
  if (S.dlvT <= 0) { S.dlvT = rand(70, 110) * (lv('padlights') ? 0.75 : 1); if (S.dlv.length < 3) { const pool = unlockedRecipes(); const items = Array.from({ length: Math.floor(rand(2, 5)) }, () => RID[pick(pool).id]); S.dlv.push({ items, pay: 0, to: pick(['Capsule hotel, room 418', 'Night clinic, 3F', 'Arcade staff room', 'Apartment 9-C', 'Konbini night shift', '8 Line depot']) }); toast('A delivery order is waiting on the roof terminal.'); } }
  if (S.staff.tomo && S.dlv.length) { S.tomoT = (S.tomoT || 0) - dt; if (S.tomoT <= 0) { S.tomoT = 100; const d = S.dlv.shift(); const pay = Math.round(d.items.reduce((a, r) => a + RECIPES[r].price, 0) * 1.4 * 0.7); S.yen += pay; launchDrone(); toast(`Tomo flew a delivery to the ${d.to}: +${yen(pay)}.`); } }
  if (S.staff.mako && (S.collector || 0) > 0.4) { S.makoT = (S.makoT || 0) - dt; if (S.makoT <= 0) { S.makoT = 20; S.charge = Math.min(capCharge(), S.charge + S.collector * 2.5); S.collector = 0; } }
  if (BIGSIGN) { const on = S.charge > 0.05; if (on) S.charge = Math.max(0, S.charge - dt * 0.002); BIGSIGN.mesh.material.color.setScalar(on ? 3.0 : 0.15); }
  updateDrones(dt);
});
function deliveryMenu() {
  const d = (S.dlv || []); if (!d.length) { toast('No delivery orders right now.'); return; } if (player.hold) { toast('Your hands are full.'); return; }
  openPanel(`<h2>Deliveries</h2><p class="sub">Pack the box, then launch the drone. Each cup uses one leaf or roasted portion.</p>${d.map((o, i) => `<div class="card"><h3>${o.to}</h3><p>${o.items.map(r => RECIPES[r].name).join(', ')}</p><div class="row"><span class="price">${yen(Math.round(o.items.reduce((a, r) => a + RECIPES[r].price, 0) * 1.4))}</span><button class="btn" data-d="${i}">Pack it</button></div></div>`).join('')}`, box => box.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { closePanel(); startPacking(+b.dataset.d); }));
}
function startPacking(i) {
  const o = S.dlv[i]; if (!o) return; const need = o.items.length; if (S.leaves + S.roasted < need) { toast('Not enough leaves or roasted stock to fill this order.'); return; }
  const st = { id: 'pack', title: 'Pack the delivery', si: 0, cam: { pos: Vv(PAD.x, FR + 1.7, PAD.z + 1.1), at: Vv(PAD.x, FR + 0.2, PAD.z) } };
  const items = o.items.map(r => ({ r, cold: RECIPES[r].st === 'shaker', placed: false })); let drag = null, wrong = 0, t0 = time, launch = 0;
  const cv = document.createElement('canvas'); const W = Math.min(340, vw - 30), H = 280; cv.width = W * 2; cv.height = H * 2; cv.style.cssText = `position:fixed;left:50%;top:44%;transform:translate(-50%,-50%);width:${W}px;height:${H}px;z-index:7;border-radius:16px;touch-action:none;background:rgba(11,16,34,.92);border:1px solid rgba(255,179,92,.4)`; const x = cv.getContext('2d'); x.scale(2, 2); document.body.appendChild(cv);
  const home = k => ({ x: 34 + k * 56, y: 236 }); const slot = (cold, k) => ({ x: (cold ? W * 0.62 : W * 0.12) + (k % 2) * 56 + 30, y: 70 + Math.floor(k / 2) * 60 });
  items.forEach((it, k) => { it.p = home(k); });
  const draw = () => { x.clearRect(0, 0, W, H); x.font = `13px ${FONT_DOT}`; x.textAlign = 'center'; x.fillStyle = '#ffcf8f'; x.fillText('BENTO BOX · ' + o.to.toUpperCase().slice(0, 22), W / 2, 20); x.strokeStyle = 'rgba(255,90,74,.6)'; x.lineWidth = 2; x.strokeRect(W * 0.08, 36, W * 0.4, 150); x.strokeStyle = 'rgba(51,228,255,.6)'; x.strokeRect(W * 0.52, 36, W * 0.4, 150); x.fillStyle = '#ff9a8a'; x.fillText('HOT', W * 0.28, 200); x.fillStyle = '#9fe8ff'; x.fillText('COLD', W * 0.72, 200);
    items.forEach(it => { x.fillStyle = it.cold ? '#9fe8ff' : '#ffcf8f'; x.beginPath(); x.arc(it.p.x, it.p.y, 20, 0, 7); x.fill(); x.fillStyle = '#0b1022'; x.font = `16px ${FONT_SIGN}`; x.fillText(RECIPES[it.r].icon, it.p.x, it.p.y + 6); }); };
  const pos = e => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] || e.changedTouches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; };
  const dn = e => { e.preventDefault(); e.stopPropagation(); const p = pos(e); drag = items.find(it => !it.placed && Math.hypot(it.p.x - p.x, it.p.y - p.y) < 24) || null; };
  const mv = e => { if (!drag) return; e.preventDefault(); const p = pos(e); drag.p = p; draw(); };
  const up = e => { if (!drag) return; const p = pos(e); const inHot = p.x > W * 0.08 && p.x < W * 0.48 && p.y > 36 && p.y < 186, inCold = p.x > W * 0.52 && p.x < W * 0.92 && p.y > 36 && p.y < 186; if ((inHot && !drag.cold) || (inCold && drag.cold)) { drag.placed = true; const k = items.filter(q => q.placed && q.cold === drag.cold).length - 1; drag.p = slot(drag.cold, k); Snd.soft(); } else { if (inHot || inCold) { wrong++; Snd.miss(); st.note = drag.cold ? 'Iced drinks go on the cold side.' : 'Hot tea goes on the hot side.'; } drag.p = home(items.indexOf(drag)); } drag = null; draw(); if (items.every(q => q.placed)) nextStep(st); };
  cv.addEventListener('mousedown', dn); cv.addEventListener('touchstart', dn, { passive: false }); addEventListener('mousemove', mv); cv.addEventListener('touchmove', mv, { passive: false }); addEventListener('mouseup', up); cv.addEventListener('touchend', up);
  st.pointer = (type) => st.si === 0; draw();
  st.steps = [{ label: 'Pack', hint: 'Drag each cup into the box: hot tea on the hot side, iced drinks on the cold side.' }, { label: 'Launch', hint: 'Hold to spin up the drone, then let go.', pad: () => ST.padDown ? 'Spinning up…' : 'Hold to launch', holdPad: true, start() { cv.remove(); }, down() { launch = 0; }, up() { if (launch < 0.6) return; nextStep(st); }, update(dt) { if (ST.padDown) launch += dt; if (launch > 0.05 && frameN % 6 === 0) Snd.hit(400 + launch * 400, 2, 0.05, 0.08); } }];
  st.finish = () => { const base = o.items.reduce((a, r) => a + RECIPES[r].price, 0) * 1.4; const speed = clamp(1.3 - (time - t0) / 30, 0.7, 1.2); const pay = Math.round(base * speed * (wrong ? 0.85 : 1)); for (const it of items) { if (RECIPES[it.r].roast && S.roasted > 0) S.roasted--; else if (S.leaves > 0) S.leaves--; } S.yen += pay; S.stats.earned += pay; S.dlv.splice(i, 1); launchDrone(); Snd.coin(); st.note = `The drone lifts off into the rain. +${yen(pay)}`; stUI.hint.textContent = st.note; setTimeoutG(() => endStation(true), 900); };
  st.exit = () => { cv.remove(); removeEventListener('mousemove', mv); removeEventListener('mouseup', up); };
  startStation(st);
}
const DRONES = [];
function droneMesh() { const g = new THREE.Group(); const c = new Chunk('drone', 'roof', { jit: 0 }); c.box(0.3, 0.08, 0.3, 0x2a2c31, 0, 0, 0); for (const [x, z] of [[0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]]) { c.bar([0, 0, 0], [x, 0.02, z], 0.03, 0x3a3e46); c.cyl(0.12, 0.12, 0.01, 10, 0x55595e, x, 0.05, z); } c.box(0.22, 0.16, 0.22, C.cardboard, 0, -0.14, 0); const m = new THREE.Mesh(c.raw(), personMat()); g.add(m); const l = new THREE.Mesh(new THREE.SphereGeometry(0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.6, 0.6) })); l.position.set(0, -0.02, 0.16); g.add(l); return g; }
function launchDrone() { const g = droneMesh(); g.position.set(PAD.x, FR + 0.2, PAD.z); scene.add(g); DRONES.push({ g, t: 0, dir: new THREE.Vector3(rand(-1, 1), 0, rand(0.5, 1.5)).normalize() }); }
function updateDrones(dt) { for (let i = DRONES.length - 1; i >= 0; i--) { const d = DRONES[i]; d.t += dt; const up = Math.min(d.t, 2) * 2.2; d.g.position.y = FR + 0.2 + up + Math.max(0, d.t - 2) * 1.5; d.g.position.addScaledVector(d.dir, Math.max(0, d.t - 1.5) * dt * 6); d.g.rotation.y += dt * 0.5; if (d.t > 14) { scene.remove(d.g); DRONES.splice(i, 1); } } }
/* ---------- staff: Mako + Tomo ---------- */
function spawnMako() { if (STAFFN.mako) return; const n = spawnNPC(crewLooks().mako, RACK.x + 0.8, FR, RACK.z + 0.9, Math.PI); STAFFN.mako = { n }; n.ia = addIA({ id: 'staff_mako', obj: custHit(n), name: 'Mako', verb: 'Talk', act: () => say([{ w: 'mako', t: pick(['Every strike is free power. The sky\'s just very bad at invoicing.', 'Rack\'s healthy. Your neon will outlive the grid.', 'If the hair on your arms stands up, step away from the mast.']) }], null, lookCrew) }); }
function spawnTomo() { if (STAFFN.tomo) return; const n = spawnNPC(crewLooks().tomo, PAD.x + 0.9, FR, PAD.z + 0.6, -Math.PI / 2); STAFFN.tomo = { n }; n.ia = addIA({ id: 'staff_tomo', obj: custHit(n), name: 'Tomo', verb: 'Talk', act: () => say([{ w: 'tomo', t: pick(['Drones don\'t get wet. Well. They do. They just don\'t complain.', 'I flew one past the Kaiun office. Accidentally. Twice.', 'Every order I fly, someone across the city gets a warm cup. That\'s kind of the best job.']) }], null, lookCrew) }); }
HOOK.hire.push(id => { if (id === 'mako') { spawnMako(); say([{ w: 'mako', t: 'Fine. I\'ll babysit your lightning. Swaps, rack, neon. You brew.' }], null, lookCrew); } if (id === 'tomo') { spawnTomo(); say([{ w: 'tomo', t: 'Delivery department, reporting! I\'ll fly every order on the terminal.' }], null, lookCrew); } });
/* ---------- renovation: roof ---------- */
RENO[4] = {
  pos: Vv(1.6, FR, -5.0), yaw: Math.PI * 0.9, task: 'Bolt the drone pad down with Tomo', target: PAD,
  build() { S.ch = 5; S.flags.meet_mako = 1; S.flags.meet_tomo = 1; buildUpper(); buildFacade(); rebakeStreet(); initWaypoints(); for (const f of HOOK.waypoints) f(); for (const f of HOOK.init) f(); refreshSeats(); },
  crew() { crewPut('tomo', PAD.x + 0.8, FR, PAD.z + 0.4, -Math.PI / 2); const m = crewPut('mako', RACK.x + 0.6, FR, RACK.z + 0.8, Math.PI); },
  intro: [{ w: 'narr', t: 'The roof, at last. The city spreads out in every direction, and the rain is louder up here.' }, { w: 'tomo', t: 'Drone pad! Bolt it down and the whole city can order your tea.' }, { w: 'mako', t: 'And a mast for the lightning, when you can afford copper. Storms are free power if you\'re brave.' }],
  job(done) { startJob('bolt', { title: 'Bolt the drone pad', cam: { pos: Vv(PAD.x, FR + 1.6, PAD.z + 1.2), at: Vv(PAD.x, FR, PAD.z) }, points: [Vv(PAD.x - 0.7, FR + 0.06, PAD.z - 0.7), Vv(PAD.x + 0.7, FR + 0.06, PAD.z - 0.7), Vv(PAD.x + 0.7, FR + 0.06, PAD.z + 0.7), Vv(PAD.x - 0.7, FR + 0.06, PAD.z + 0.7)], boltRot: 0, cancel: false, done }); },
  outro: [{ w: 'mako', t: 'Hire us, if you like. Tomo flies the deliveries, I keep the lightning in the jar.' }, { w: 'tomo', t: 'The skybridge goes to the arcade roof. Best view of your building in the whole city.' }],
};
BEATS.c5_open = {
  task: () => gateMet() ? 'The typhoon is coming. Start the preparations at the holo-model table.' : `Save ${yen(380000)} and charge the rack to 10⚡ · ${yen(S.yen)} · ${S.charge.toFixed(1)}⚡`, target: () => gateMet() ? Vv(1.2, 1.1, -6.35) : null,
  enter() { S.flags.open = 1; },
  update() { if (!S.flags.kuroda5 && S.stats.served >= (S.flags.c5base || 0) + 10 && !DLG.active && !player.focus) { S.flags.kuroda5 = 1; kurodaVisit2([{ w: 'kuroda', t: 'My final offer. I\'m told the typhoon will take the grid down for days.' }, { w: 'kuroda', t: 'Your little shop will go dark like everyone else\'s. Mrs. Oda will see an empty street. Then she\'ll call me.' }, { w: 'kuroda', t: 'Good evening.' }]); } },
};
HOOK.chapter.push(n => { if (n === 5) { S.flags.c5base = S.stats.served; addMsg('mako', 'Storm charge comes from lightning on the mast. Swap the collector into the rack after each strike. The rack needs 10⚡ before the typhoon.'); goBeat('c5_open'); } });
HOOK.apply.push(id => { if (UID[id].space === 'roof') { buildRoof(); refreshSeats(); for (const f of HOOK.init) f(); if (id === 'bigsign') { rebakeStreet(); toast('茶房 雫, five metres tall. You can see it from the 8 Line.'); } } });
HOOK.upos.push(id => { const out = (spot, stand, size, axis) => ({ spot, cam: { pos: stand.clone().add(Vv(0, 1.55, 0)), at: spot }, size, axis });
  return ({ mast: out(Vv(MAST.x, FR + 1.5, MAST.z), Vv(MAST.x + 1.2, FR, MAST.z + 1.2), [0.3, 3, 0.3]), cells: out(Vv(RACK.x, FR + 0.6, RACK.z + 0.3), Vv(RACK.x, FR, RACK.z + 1.2), [0.2, 0.5, 0.2]), padlights: out(Vv(PAD.x, FR + 0.1, PAD.z), Vv(PAD.x, FR, PAD.z + 1.3), [1.6, 0.1, 1.6]), roofseats: out(Vv(-0.6, FR + 0.4, -2.6), Vv(0.9, FR, -1.6), [2.4, 0.8, 2.2]), bigsign: out(Vv(0, FR + 2.5, -0.4), Vv(0.3, FR, -2.4), [1.7, 5, 0.3], Vv(1, 0, 0)) })[id] || null; });
/* ================= finale ================= */
RENO[5] = 'finale';
function startFinale() {
  S.ch = 6; S.beat = 'finale'; S.fin = { t: 360, started: true }; save();
  showCard('FINALE', 'The Long Storm', 4);
  say([{ w: 'narr', t: 'Every phone on the street buzzes at once: TYPHOON HISAME. LANDFALL TONIGHT. STAY INDOORS.' }, { w: 'mako', t: 'Rack\'s full. Whatever happens to the grid, we stay lit.' }, { w: 'gen', t: 'I closed the soba shop. Where else would I be?' }], () => { enterBeat('finale'); }, lookCrew);
}
BEATS.finale = {
  task: () => S.fin && S.fin.t > 0 ? `Keep the shop warm through the typhoon · ${Math.floor(S.fin.t / 60)}:${String(Math.floor(S.fin.t % 60)).padStart(2, '0')}` : 'The storm is passing…', target: null,
  enter() {
    if (!S.fin) S.fin = { t: 360 }; forceWeather = { rain: 1.0, storm: true, name: 'Typhoon Hisame', mm: 64 }; blackout(true); S.flags.open = 1; S.flags.surge = 9999;
    if (!CREW.gen) crewPut('gen', -4.3, 0.12, 0.9, 0); crewWalk('gen', [-1.3, 0, -2.28, Math.PI, 'sit']);
    for (const id of ['rin', 'hana', 'mako', 'tomo']) if (!S.staff[id]) { S.staff[id] = 1; } spawnStaff('rin'); spawnHana(); spawnMako(); spawnTomo();
  },
  update(dt) {
    if (!S.fin) return; if (S.fin.t > 0) { S.fin.t -= dt; S.charge = Math.max(0.6, S.charge - dt * 0.01); if (Math.random() < dt * 0.25) strike(Math.random() < 0.6 ? Vv(MAST.x, FR + 6.5, MAST.z) : null); if (S.fin.t <= 0) endFinale(); }
  },
};
function blackout(on) {
  S.flags.blackout = on ? 1 : 0; for (const r of CITY.signs) { if (!r.mesh.parent || r.mesh.parent === SIGN_GROUP) r.mesh.material.color.setScalar(on ? 0.05 : r.base); }
  for (const hb of CITY.holo) hb.mesh.visible = !on; CITY.group.traverse(o => { if (o.isMesh && o.material && o.material.map === WIN_TEX) o.material.color.setScalar(on ? 0.1 : CITY.skyK); if (o.isMesh && o.name === 'streetEm') o.visible = !on; });
  if (CITY.train) CITY.train.g.visible = false; CITY.trainOff = on;
  for (const a of ANCHORS) { if (a.city === undefined) a.city = !a.tag; if (a.city) a.i0 = a.i0 ?? a.i, a.i = on ? a.i0 * 0.06 : a.i0; }
  rebakeStreet(); CITY.group.traverse(o => { if (o.isMesh && o.name === 'far') rebake(o, 'far'); if (o.isMesh && o.name === 'alley') rebake(o, 'alley'); });
}
function endFinale() {
  forceWeather = { rain: 0.25, storm: false, name: 'Drizzle', mm: 0.8 }; S.flags.surge = 0;
  const top = new THREE.Color(0x0f1e48), mid = new THREE.Color(0x2a3a78), hor = new THREE.Color(0x8a6a9a); const pa = sky.geometry.attributes.position, col = sky.geometry.attributes.color, c = new THREE.Color(); for (let i = 0; i < pa.count; i++) { const y = pa.getY(i) / 300; if (y > 0.25) c.copy(mid).lerp(top, smoothstep(0.25, 0.9, y)); else c.copy(hor).lerp(mid, smoothstep(-0.05, 0.25, y)); col.setXYZ(i, c.r, c.g, c.b); } col.needsUpdate = true;
  toast('The wind drops. For the first time in eleven years, the sky turns blue at the edges.');
  setTimeoutG(() => { const n = spawnNPC(crewLooks().oda, -26, 0.12, 1.3, Math.PI / 2); VIS.oda = n; npcGo(n, 'a1', () => { faceTo(n, player.pos.x, player.pos.z); say([
    { w: 'oda', t: 'I watched from my window all night. Every building on Hachiban-dōri went black. Except one.' },
    { w: 'oda', t: 'Half the street was in here. Gen-san asleep at the counter. A robot on the bridge, waving at the trains.' },
    { w: 'narr', t: 'She takes a folded document from her coat: Kaiun\'s contract. She tears it in half, then in half again.' },
    { w: 'oda', t: 'The building is yours. Chiyo wrote to me, years ago, and asked me to give you something when you\'d earned it.' },
  ], () => { showLetter(LETTERS[3], () => { S.beat = 'post'; S.flags.ended = 1; blackout(false); forceWeather = null; save(); credits(); }); }, lookCrew); }); }, 6000);
}
function credits() {
  openPanel(`<h2>雫 Shizuku</h2><p class="sub">A tea shop under the 8 Line, kept warm by everyone in it.</p><div class="card"><h3>${S.stats.served} cups served</h3><p>${S.stats.perfect} perfect · ${yen(S.stats.earned)} earned · ${Math.round(S.played / 60)} minutes on Hachiban-dōri</p></div><p class="sub">Chiyo Aoyama · Gen-san · Mako · Tomo · Rin · Hana · Mrs. Oda · Mr. Sato & Mochi · Aiko · Yume · K-7 · the Okada twins · and, grudgingly, Kuroda.</p><p class="sub">The shop stays open. Every night, the rain comes back, and so do they.</p><button class="btn" id="crOk">Keep the shop open</button>`, box => { box.querySelector('#crOk').onclick = () => { closePanel(); enterBeat('post'); }; });
}
BEATS.post = { task: 'Keep the shop warm. Every night is yours now.', target: null, enter() { S.flags.open = 1; forceWeather = null; if (S.flags.blackout) blackout(false); } };
// the holo table for chapter 5 starts the finale instead of a building
HOOK.init.push(() => { if (S.beat === 'finale' && S.fin) { /* resumes via enterBeat */ } });

