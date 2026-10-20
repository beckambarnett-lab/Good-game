/* ================= Chapter 4: roots (the garden floor) ================= */
const RACK_SPOTS = [[-2.15, -1.2, 1], [2.15, -1.2, -1], [-2.15, -2.7, 1], [2.15, -2.7, -1], [-2.15, -4.2, 1], [2.15, -4.2, -1], [-2.15, -5.5, 1], [2.15, -5.5, -1]];
function rackCount() { return 4 + 2 * lv('racks'); }
const RACK_OBJ = [];
function buildF3() {
  reseed(4004); clearAnchors('f3'); clearTag('f3furn'); const g = part('f3'); const ch = new Chunk('f3furn', 'f3'), em = new Chunk('f3Em', 'f3', { emis: true });
  if (S.ch < 4) { for (let i = 0; i < 10; i++) P.cardboard(ch, srange(-2.2, 2.0), F3 + (i > 6 ? 0.35 : 0), srange(-5.6, -0.8), srange(-0.3, 0.3), srange(0.4, 0.7), 0.35, srange(0.35, 0.5)); for (let i = 0; i < 4; i++) ch.box(0.5, 0.05, 1.2, 0x8a8e94, srange(-1.5, 1.5), F3 + 0.03, srange(-5, -1), 0, srange(0, 3), 0); tagA(anchor(0, F3 + 1.8, -0.5, 0x6a7ab0, 0.5, 4, ['f3'], 0.4), 'f3'); addBuilt(g, ch); return; }
  // concrete floor with drains, ceiling pipes
  for (let x = -2.5; x < 2.49; x += 0.6) for (let z = -6.0; z < -0.21; z += 0.6) ch.box(0.59, 0.03, 0.59, new THREE.Color(0x6a6e6a).multiplyScalar(srange(0.85, 1.05)).getHex(), x + 0.3, F3 + 0.015, z + 0.3);
  P.drain(ch, 0, F3, -3.2, 1.0); ch.box(5.0, 0.03, 6.0, 0x4a4e56, 0, F3 + 2.97, -3.1);
  for (const x of [-1.6, 1.6]) P.pipe(ch, [x, F3 + 2.8, -0.4], [x, F3 + 2.8, -6.0], 0.03, lv('mist') ? 0x8ab0c0 : C.steelD);
  if (lv('mist')) for (let z = -0.8; z > -6; z -= 0.7) for (const x of [-1.6, 1.6]) ch.cyl(0.015, 0.02, 0.06, 6, C.brass, x, F3 + 2.74, z);
  // racks
  for (let i = 0; i < rackCount(); i++) { const [x, z, f] = RACK_SPOTS[i]; at(ch, x, F3, z, f > 0 ? Math.PI / 2 : -Math.PI / 2, () => { for (const sx of [-0.55, 0.55]) for (const sz of [-0.2, 0.2]) ch.box(0.04, 1.9, 0.04, C.steel, sx, 0.95, sz); for (const y of [0.35, 0.95, 1.55]) { ch.box(1.16, 0.03, 0.44, C.steelD, 0, y, 0); ch.box(1.1, 0.08, 0.38, 0x2a2a2e, 0, y + 0.055, 0); } }); for (const y of [0.85, 1.45, 2.05]) em.box(0.06, 0.02, 1.0, 0xff3aa8, x + f * 0.05, F3 + y - 0.18, z); solidC(x, z, 0.5, 1.2, F3, F3 + 2, 'f3furn'); }
  for (let i = 0; i < rackCount(); i++) tagA(anchor(RACK_SPOTS[i][0] + RACK_SPOTS[i][2] * 0.6, F3 + 1.4, RACK_SPOTS[i][1], 0xff4ab0, 1.4, 3.4, ['f3', 'facade'], 0.3), 'f3');
  // workbench + seed tin + cistern
  ch.box(1.4, 0.05, 0.6, C.cedarL, 0, F3 + 0.9, -0.6); for (const sx of [-0.65, 0.65]) ch.box(0.05, 0.88, 0.55, C.cedarD, sx, F3 + 0.45, -0.6); ch.cyl(0.06, 0.06, 0.1, 10, 0x8a6a3a, -0.4, F3 + 0.98, -0.6); P.plant(ch, 0.45, F3 + 0.93, -0.6, 0.6); ch.box(0.3, 0.02, 0.2, 0xb8ad94, 0.05, F3 + 0.935, -0.55);
  solidC(0, -0.6, 1.4, 0.6, F3, F3 + 1, 'f3furn');
  if (lv('cistern')) { ch.cyl(0.6, 0.6, 1.8, 14, 0x3a6a8a, 0, F3 + 0.9, -5.4); for (const h of [0.4, 1.4]) ch.torus(0.61, 0.02, 16, 0x2a4a6a, 0, F3 + h, -5.4, Math.PI / 2); solidC(0, -5.4, 1.2, 1.2, F3, F3 + 2, 'f3furn'); }
  tagA(anchor(0, F3 + 2.2, -3.0, 0xd8b0ff, 1.4, 5, ['f3'], 0.2), 'f3'); tagA(anchor(-0.15, F3 + 1.5, -0.62, 0xffd0a0, 1.1, 2.6, ['f3'], 0.2), 'f3');
  // clamp-on task lamp on the bench
  ch.box(0.12, 0.05, 0.1, C.iron, -0.5, F3 + 0.95, -0.82); ch.bar([-0.5, F3 + 0.97, -0.82], [-0.42, F3 + 1.42, -0.8], 0.022, C.iron); ch.bar([-0.42, F3 + 1.42, -0.8], [-0.15, F3 + 1.5, -0.66], 0.02, C.iron);
  ch.cone(0.08, 0.12, 10, 0x2f4a3c, -0.13, F3 + 1.46, -0.64); em.ball(0.03, 0xffe0b0, -0.13, F3 + 1.4, -0.64, 1);
  // pegboard of tools on the pier between the windows
  ch.box(0.7, 0.62, 0.02, 0xb8a888, 0, F3 + 1.55, -0.23); for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) ch.box(0.012, 0.012, 0.004, 0x6a5a48, -0.3 + i * 0.1, F3 + 1.3 + j * 0.1, -0.218);
  ch.box(0.04, 0.22, 0.02, C.steel, -0.2, F3 + 1.6, -0.21); ch.box(0.08, 0.06, 0.02, 0xc23b2b, -0.2, F3 + 1.73, -0.21); // trowel
  ch.bar([0.02, F3 + 1.75, -0.21], [0.1, F3 + 1.45, -0.21], 0.015, C.steel); ch.bar([0.12, F3 + 1.75, -0.21], [0.04, F3 + 1.45, -0.21], 0.015, C.steel); ch.box(0.05, 0.06, 0.02, 0xe0b53a, 0.07, F3 + 1.78, -0.21); // shears
  ch.torus(0.07, 0.015, 10, 0x3a8a4a, 0.24, F3 + 1.55, -0.21); ch.box(0.1, 0.02, 0.02, C.steel, 0.24, F3 + 1.68, -0.21); // coil of twine
  // Chiyo's mother's tea bush, in a big pot by the window
  ch.cyl(0.3, 0.24, 0.42, 12, 0x8a4a2a, -1.25, F3 + 0.21, -0.72); ch.torus(0.3, 0.025, 12, 0x7a3e22, -1.25, F3 + 0.42, -0.72, Math.PI / 2); ch.cyl(0.27, 0.27, 0.02, 12, C.soil, -1.25, F3 + 0.41, -0.72);
  for (let k = 0; k < 5; k++) ch.bar([-1.25, F3 + 0.42, -0.72], [-1.25 + srange(-0.22, 0.22), F3 + srange(0.75, 1.05), -0.72 + srange(-0.2, 0.2)], 0.018, 0x5a4030);
  for (let k = 0; k < 70; k++) { const a2 = srand() * 6.28, r = Math.sqrt(srand()) * 0.36, y = srange(0.7, 1.25); ch.box(0.075, 0.012, 0.04, srand() < 0.5 ? C.leaf : C.leafD, -1.25 + Math.cos(a2) * r, F3 + y, -0.72 + Math.sin(a2) * r * 0.8, srange(-0.5, 0.5), srange(0, 3), srange(-0.4, 0.4)); }
  for (let k = 0; k < 6; k++) ch.ball(0.018, 0xf4f0e8, -1.25 + srange(-0.3, 0.3), F3 + srange(0.9, 1.2), -0.72 + srange(-0.25, 0.25)); // a few white camellia flowers
  solidC(-1.25, -0.72, 0.6, 0.6, F3, F3 + 1.2, 'f3furn');
  // drip lines from the mist pipes down to every rack
  for (let i = 0; i < rackCount(); i++) { const [x, z, f] = RACK_SPOTS[i]; const px = f > 0 ? -1.6 : 1.6; for (const dz of [-0.35, 0.35]) ch.bar([px, F3 + 2.8, z + dz], [x + f * 0.05, F3 + 1.98, z + dz], 0.01, 0x2a2c31); }
  // hanging grow panels over the aisle
  for (const z of [-2.0, -4.0]) { ch.box(1.1, 0.05, 0.28, 0x2a2c31, 0, F3 + 2.45, z); em.box(1.02, 0.01, 0.22, 0xd890ff, 0, F3 + 2.42, z); for (const x of [-0.5, 0.5]) ch.bar([x, F3 + 2.47, z], [x, F3 + 2.95, z], 0.008, C.steel); }
  // rubber mats down the aisle, seedling trays, soil sacks, a watering can, a stool
  for (const z of [-1.4, -2.95, -4.5]) { ch.box(1.0, 0.012, 1.4, 0x3a5244, 0, F3 + 0.036, z); for (let i = 0; i < 6; i++) ch.box(0.96, 0.006, 0.03, 0x2e4236, 0, F3 + 0.044, z - 0.6 + i * 0.24); }
  for (let i = 0; i < 5; i++) ch.box(0.5, 0.05, 0.32, 0x1a1a1c, 1.05, F3 + 0.06 + i * 0.055, -5.05, 0, srange(-0.08, 0.08), 0); for (let k = 0; k < 8; k++) ch.box(0.04, 0.05, 0.04, C.leaf, 0.85 + (k % 4) * 0.12, F3 + 0.33, -5.12 + Math.floor(k / 4) * 0.14);
  for (const [x, ry] of [[-1.0, 0.2], [-1.05, -0.3]]) at(ch, x, F3 + (ry < 0 ? 0.24 : 0), -5.1, ry, () => { ch.box(0.5, 0.24, 0.34, 0x5a4a3a, 0, 0.12, 0); ch.box(0.46, 0.02, 0.2, 0xd8c8a0, 0, 0.18, 0.171); });
  solid(0.75, 1.35, F3, F3 + 0.4, -5.25, -4.85, 'f3furn'); solid(-1.35, -0.7, F3, F3 + 0.5, -5.35, -4.85, 'f3furn');
  at(ch, 0.9, F3, -1.0, -0.6, () => { ch.cyl(0.11, 0.12, 0.24, 10, 0x3a7a5a, 0, 0.12, 0); ch.bar([0, 0.18, 0.1], [0, 0.3, 0.32], 0.025, 0x3a7a5a); ch.cyl(0.03, 0.03, 0.03, 8, 0x2a5a42, 0, 0.31, 0.33, Math.PI / 2); ch.torus(0.08, 0.015, 8, 0x3a7a5a, 0, 0.3, -0.04, 0, Math.PI / 2); });
  P.stool(ch, 0.5, F3, -1.15, 0.6, C.cedar);
  addBuilt(g, ch); addBuilt(g, em);
  buildRackPlants();
}
function buildRackPlants() {
  for (const o of RACK_OBJ) scene.remove(o); RACK_OBJ.length = 0; if (S.ch < 4) return;
  S.plants = S.plants || []; for (let i = 0; i < rackCount(); i++) { if (!S.plants[i]) S.plants[i] = i < 4 ? { st: 'grow', t: 0.25 + i * 0.18, q: 1, pr: false, prDone: i > 1 } : { st: 'empty', t: 0, q: 1, pr: false };
    const [x, z, f] = RACK_SPOTS[i]; const grp = new THREE.Group(); grp.position.set(x, F3, z); grp.rotation.y = f > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(grp); RACK_OBJ.push(grp);
    const arr = []; for (const y of [0.42, 1.02, 1.62]) { const c = new Chunk('plants', 'f3', { jit: 0.12 }); for (let k = 0; k < 9; k++) { const px = -0.45 + k * 0.11; c.box(0.02, 0.12, 0.02, C.leafD, px, 0.06, srange(-0.1, 0.1)); for (let l = 0; l < 4; l++) c.box(0.075, 0.012, 0.045, srand() < 0.5 ? 0x6fbf4a : 0x9fd86a, px + srange(-0.03, 0.03), 0.08 + l * 0.04, srange(-0.13, 0.13), srange(-0.4, 0.4), srange(0, 3), srange(-0.3, 0.3)); } const m = new THREE.Mesh(c.raw(), personMat()); m.material.userData.probe.value.setRGB(0.8, 0.55, 0.75); m.position.y = y + 0.03; grp.add(m); arr.push(m); }
    grp.userData.plants = { set visible(v) { arr.forEach(m => m.visible = v); }, scale: { set: (a, s2, b2) => arr.forEach(m => m.scale.set(1, s2, 1)) } };
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 0.6), transparent: true, opacity: 0, depthWrite: false })); hl.position.y = 1.0; grp.add(hl); grp.userData.hl = hl;
  }
  removeIA(/^rack/); for (let i = 0; i < rackCount(); i++) { const [x, z] = RACK_SPOTS[i]; addIA({ id: 'rack' + i, box: [x, F3 + 1.0, z, 0.6, 1.8, 1.2], reach: 2.6, name: () => `Rack ${i + 1} · ${rackLabel(i)}`, verb: () => rackVerb(i), hold: 0, act: () => rackAct(i) }); }
}
function rackLabel(i) { const p = S.plants[i]; if (p.st === 'empty') return 'empty'; if (p.st === 'ready') return 'ready to harvest'; return `growing ${Math.round(p.t * 100)}%${p.pr ? ', needs pruning' : ''}`; }
function rackVerb(i) { const p = S.plants[i]; return p.st === 'empty' ? 'Plant cuttings' : p.st === 'ready' ? 'Harvest' : p.pr ? 'Prune' : 'Mist'; }
function rackAct(i) {
  const p = S.plants[i]; const [x, z, f] = RACK_SPOTS[i]; const cam = { pos: Vv(x + f * 1.25, F3 + 1.55, z), at: Vv(x, F3 + 1.0, z) };
  if (player.hold) { toast('Your hands are full.'); return; }
  if (p.st === 'empty') { startJob('place', { title: 'Plant cuttings', cam, done: () => { p.st = 'grow'; p.t = 0; p.q = 1; p.pr = false; p.prDone = false; Snd.soft(); } }); return; }
  if (p.st === 'ready') { startJob('place', { title: 'Harvest', cam, done: () => { const y = Math.round(6 * (lv('mist') ? 1.25 : 1) * p.q); S.leaves += y; popAt(Vv(x, F3 + 1.8, z), '+' + y + ' leaves', 'small'); p.st = 'empty'; p.t = 0; Snd.chime(); } }); return; }
  if (p.pr) { startJob('hang', { title: 'Prune the runners', cam, spot: Vv(x, F3 + 1.3, z), size: [0.1, 0.25, 0.1], axis: Vv(0, 0, 1), done: () => { p.pr = false; p.prDone = true; p.q = Math.min(1.2, p.q + 0.2); Snd.soft(); } }); return; }
  startJob('place', { title: 'Mist the rack', cam, done: () => { p.t = Math.min(1, p.t + 0.2); Snd.hit(5000, 0.5, 0.1, 0.6); } });
}
HOOK.update.push(dt => {
  if (S.ch < 4 || !S.plants) return; const rate = 1 / (lv('mist') ? 96 : 120);
  for (let i = 0; i < Math.min(S.plants.length, rackCount()); i++) { const p = S.plants[i]; if (p.st === 'grow') { p.t += dt * rate; if (p.t > 0.5 && !p.prDone && !p.pr) p.pr = true; if (p.pr) p.q = Math.max(0.6, p.q - dt * 0.002); if (p.t >= 1) { p.st = 'ready'; p.t = 1; } }
    const o = RACK_OBJ[i]; if (o) { const s = p.st === 'empty' ? 0.001 : lerp(0.25, 1, p.t); o.userData.plants.scale.set(1, s, 1); o.userData.plants.visible = p.st !== 'empty'; o.userData.hl.material.opacity = p.st === 'ready' ? 0.08 + Math.sin(time * 4) * 0.05 : p.pr ? 0.05 : 0; } }
  // Hana tends the racks
  if (S.staff.hana) { S.hanaT = (S.hanaT || 0) - dt; if (S.hanaT <= 0) { S.hanaT = 14; const i = S.plants.findIndex((p, k) => k < rackCount() && (p.st === 'ready' || p.st === 'empty' || p.pr)); if (i >= 0) { const p = S.plants[i]; if (p.st === 'ready') { S.leaves += Math.round(6 * (lv('mist') ? 1.25 : 1) * p.q * 0.85); p.st = 'empty'; } else if (p.st === 'empty') { p.st = 'grow'; p.t = 0; p.q = 0.95; p.pr = false; p.prDone = false; } else { p.pr = false; p.prDone = true; } if (STAFFN.hana) { const [x, z, f] = RACK_SPOTS[i]; npcGoPt(STAFFN.hana.n, Vv(x + f * 0.75, F3, z), () => { STAFFN.hana.n.yawT = f > 0 ? -Math.PI / 2 : Math.PI / 2; STAFFN.hana.n.pose = 'work'; setTimeoutG(() => { if (STAFFN.hana) STAFFN.hana.n.pose = null; }, 3000); }); } } } }
});
HOOK.upper.push(buildF3);
HOOK.waypoints.push(() => {
  wp('st2a', 2.0, F2, -6.45); wp('st2b', -1.6, F3, -6.45); wp('f3L', -2.05, F3, -6.45); wp('f3c', 0, F3, -3.2); wp('f3d', -2.05, F3, -5.9);
  link('f2L2', 'st2a', 'st2b', 'f3L', 'f3d', 'f3c');
});
/* ---------- Shizuku Blend unlock ---------- */
function blendOk() { return !!S.flags.letter2; }
HOOK.init.push(() => {
  removeIA('seedTin'); if (S.ch < 4) return;
  addIA({ id: 'seedTin', box: [-0.4, F3 + 1.0, -0.6, 0.3, 0.3, 0.3], name: 'Chiyo\'s seed tin', verb: () => S.flags.letter2 ? 'Look' : 'Open it', act: () => { if (!S.flags.letter2) { S.flags.letter2 = 1; showLetter(LETTERS[2], () => { toast('Shizuku Blend is on the menu: garden leaf, roasted rice, 70°C, steep 1:30.'); addMsg('hana', 'Those seeds are a cultivar I\'ve never seen. Let\'s blend them with the roasted rice. It\'s yours, nobody else\'s.'); }); } else toast('Faded paper inside the lid: Chiyo\'s handwriting, a hillside, a date sixty years ago.'); } });
  if (S.staff.hana) spawnHana();
});
function spawnHana() { if (STAFFN.hana) return; const n = spawnNPC({ name: 'Hana', skin: 0xe3b08a, hair: 0x3a2a1e, hairStyle: 'bob', top: 0x4f7d48, bottom: 0x3a3d48, outfit: 'jacket', boots: true, plantClips: true, umbrella: false, h: 0.97 }, 0, F3, -3.0, 0); STAFFN.hana = { n, state: 'idle' }; n.ia = addIA({ id: 'staff_hana', obj: custHit(n), name: 'Hana', verb: 'Talk', act: () => say([{ w: 'hana', t: pick(['The pink light is a lie we tell the leaves. They believe it.', 'Mist in the morning, prune at half height, harvest when they shine.', 'The cistern water is softer than the tap. The tea notices.']) }], null, lookCrew) }); }
HOOK.hire.push(id => { if (id === 'hana') { spawnHana(); say([{ w: 'hana', t: 'Boots on. I\'ll keep every rack planted and harvested. You keep making the tea.' }], null, lookCrew); } });
/* ---------- renovation: garden ---------- */
RENO[3] = {
  pos: Vv(0.6, F3, -1.6), yaw: 0.2, task: 'Bolt the first grow rack with Hana', target: Vv(-2.15, F3 + 1.0, -1.2),
  build() { S.ch = 4; S.flags.renoF3 = 1; buildUpper(); buildFacade(); rebakeStreet(); initWaypoints(); for (const f of HOOK.waypoints) f(); for (const f of HOOK.init) f(); },
  crew() { const n = spawnNPC({ name: 'Hana', skin: 0xe3b08a, hair: 0x3a2a1e, hairStyle: 'bob', top: 0x4f7d48, bottom: 0x3a3d48, outfit: 'jacket', boots: true, plantClips: true, umbrella: false, h: 0.97 }, -1.2, F3, -2.0, -Math.PI / 2); CREW.hana = n; S.flags.meet_hana = 1; },
  intro: [{ w: 'narr', t: 'You called Hana. She arrived with two students, forty seedling trays and a roll of pink LED strip.' }, { w: 'hana', t: 'Racks along both walls, pink light, mist from the ceiling. Last bolt\'s yours.' }],
  job(done) { startJob('bolt', { title: 'Bolt the first rack', cam: { pos: Vv(-0.9, F3 + 1.6, -1.2), at: Vv(-2.15, F3 + 0.8, -1.2) }, points: [Vv(-2.15, F3 + 0.35, -0.65), Vv(-2.15, F3 + 0.95, -0.65), Vv(-2.15, F3 + 0.35, -1.75), Vv(-2.15, F3 + 0.95, -1.75)], boltRot: Math.PI / 2, cancel: false, done }); },
  outro: [{ w: 'hana', t: 'There. Plant cuttings, mist them, prune at half height, harvest when they shine.' }, { w: 'hana', t: 'Home-grown leaf costs you nothing. And there\'s a tin on the bench I think you should open.' }, { w: 'hana', t: 'If you want me on the crew, I\'m in your phone.' }],
};
BEATS.c4_open = {
  task: () => !S.flags.letter2 ? 'Open the seed tin on the garden workbench' : gateMet() ? 'Start the renovation at the holo-model table' : `Save ${yen(260000)} and 80 leaves · ${yen(S.yen)} · ${S.leaves}/80 leaves`,
  target: () => !S.flags.letter2 ? Vv(-0.4, F3 + 1.0, -0.6) : gateMet() ? Vv(1.2, 1.1, -6.35) : null, enter() { S.flags.open = 1; },
};
HOOK.chapter.push(n => { if (n === 4) { goBeat('c4_open'); } });
HOOK.apply.push(id => { if (UID[id].space === 'f3') { buildF3(); } if (id === 'greenwall') { buildFacade(); rebakeStreet(); } });
HOOK.upos.push(id => { const out = (spot, stand, size, axis) => ({ spot, cam: { pos: stand.clone().add(Vv(0, 1.55, 0)), at: spot }, size, axis });
  const n = rackCount(); const r = RACK_SPOTS[Math.min(n, 7)];
  return ({ racks: out(Vv(r[0], F3 + 1.0, r[1]), Vv(r[0] + r[2] * 1.3, F3, r[1]), [0.5, 1.9, 1.2]), mist: out(Vv(0, F3 + 2.75, -3.0), Vv(0, F3, -2.0), [3.4, 0.1, 0.2], Vv(1, 0, 0)), cistern: out(Vv(0, F3 + 0.9, -5.4), Vv(0, F3, -3.8), [1.2, 1.8, 1.2]), greenwall: out(Vv(0, 8.5, 0.1), Vv(0, 0.12, 4.0), [4.8, 2.8, 0.1], Vv(1, 0, 0)) })[id] || null; });
// stair to the third floor: roped until chapter 4
HOOK.upper.push(() => { clearTag('stairBlock2'); removeIA('rope2IA'); if (S.ch >= 4) return; if (S.ch < 2) return; solid(1.66, 1.74, F2, F2 + 2.2, -6.9, -6.0, 'stairBlock2'); addIA({ id: 'rope2IA', box: [1.7, F2 + 1.0, -6.45, 0.3, 1.0, 0.9], name: 'Stairs to the third floor', verb: 'Storage, for now', act: () => toast('The third floor opens in a later renovation.') }); const g = part('stairBlock2'); const ch = new Chunk('rope2', 'f2'); const y0 = F2 + 0.27; ch.box(0.04, 1.0, 0.04, C.brass, 1.7, y0 + 0.5, -6.05); ch.box(0.04, 1.0, 0.04, C.brass, 1.7, y0 + 0.5, -6.85); ch.cable([1.7, y0 + 0.9, -6.05], [1.7, y0 + 0.9, -6.85], 0.12, 0.02, 0xc2362b, 6); addBuilt(g, ch); });

