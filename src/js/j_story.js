/* ================= story ================= */
function crewLooks() {
  return {
    mako: { name: 'Mako', skin: 0xe3b08a, hair: 0x1a1414, hairStyle: 'side', top: 0x22252c, bottom: 0x1f2128, outfit: 'jacket', led: 0x33e4ff, armGlow: true, boots: true, umbrella: false, h: 1.0 },
    gen: { name: 'Gen-san', skin: 0xd8a47e, hair: 0x9aa0a6, hairStyle: 'buzz', top: 0xb8b0a0, bottom: 0x3a3d48, outfit: 'apron', apron: 0x23304a, hachimaki: true, umbrella: true, umbCol: -1, h: 0.94 },
    tomo: { name: 'Tomo', skin: 0xf1c8a6, hair: 0x2a1d16, hairStyle: 'short', top: 0x3a6a8a, bottom: 0x2a2c33, outfit: 'hoodie', led: 0xffb35c, helmet: 0xffb35c, backpack: 0x2a2c31, umbrella: false, h: 0.96 },
    kenta: { name: 'Kenta', skin: 0xd8a47e, hair: 0x1a1414, hairStyle: 'short', top: 0xe8e4dc, bottom: 0x2a2c33, outfit: 'jacket', apron: 0x2c5a6e, umbrella: false, h: 1.02 },
    yui: { name: 'Yui', skin: 0xf1c8a6, hair: 0x5a2a1a, hairStyle: 'bob', top: 0xe8e4dc, bottom: 0x2a2c33, outfit: 'jacket', apron: 0x2c5a6e, umbrella: false, h: 0.95 },
    sora: { name: 'Sora', skin: 0xe3b08a, hair: 0x2a2a3a, hairStyle: 'bun', top: 0xe8e4dc, bottom: 0x1f2128, outfit: 'jacket', apron: 0x2c5a6e, umbrella: false, h: 0.99, glasses: true },
    rin: { name: 'Rin', skin: 0xf5d5bc, hair: 0x1a1414, hairStyle: 'bun', top: 0xe8e4dc, bottom: 0x1f2128, outfit: 'jacket', apron: 0x2c5a6e, umbrella: false, h: 0.98, blush: true },
    oda: { name: 'Mrs. Oda', skin: 0xf1c8a6, hair: 0xd8d0c8, hairStyle: 'bob', top: 0x5a2a3a, bottom: 0x2a2c33, outfit: 'coat', umbrella: true, umbCol: 0x5a2a3a, h: 0.9, glasses: true },
    kuroda: { name: 'Kuroda', skin: 0xe3b08a, hair: 0x111111, hairStyle: 'short', top: 0x16171c, bottom: 0x16171c, outfit: 'suit', tie: 0xff3d9a, glasses: true, umbrella: true, umbCol: 0x0a0a0c, h: 1.05 },
    sato: { name: 'Mr. Sato', skin: 0xd8a47e, hair: 0xb8bcc0, hairStyle: 'buzz', top: 0x6a5a3a, bottom: 0x3a3d48, outfit: 'jacket', scarf: 0x8a2a2a, umbrella: true, umbCol: -1, h: 0.92, glasses: true },
    aiko: { name: 'Aiko', skin: 0xf1c8a6, hair: 0x2a1d16, hairStyle: 'long', top: 0x3a8a8a, bottom: 0x3a8a8a, outfit: 'scrubs', umbrella: true, h: 0.97 },
  };
}
const CREW = {};
function spawnCrew(id, x, y, z, yaw) { if (CREW[id]) return CREW[id]; const n = spawnNPC(crewLooks()[id], x, y, z, yaw); n.speed = 1.25; CREW[id] = n; n.ia = addIA({ id: 'crew_' + id, obj: custHit(n), name: SPEAKERS[id][0], verb: () => crewVerb(id), act: () => crewAct(id), cond: () => !!CREW[id] }); return n; }
// place a crew member instantly: only used while the screen is faded out
function crewPut(id, x, y, z, yaw) { const n = spawnCrew(id, x, y, z, yaw); n.path = null; n.onArrive = null; n.pos.set(x, y, z); n.yawT = yaw || 0; n.p.root.rotation.y = n.yawT; return n; }
function despawnCrew(id) { if (CREW[id]) { removeNPC(CREW[id]); delete CREW[id]; } }
const crewAt = id => () => CREW[id] ? CREW[id].pos.clone().add(new THREE.Vector3(0, 1.58 * (CREW[id].p.look.h || 1), 0)) : null;
const lookCrew = w => CREW[w] ? crewAt(w)() : (STAFFN[w] ? STAFFN[w].n.pos.clone().add(new THREE.Vector3(0, 1.58, 0)) : (VIS[w] ? VIS[w].pos.clone().add(new THREE.Vector3(0, 1.58, 0)) : null));
const VIS = {}; // visiting story characters (not crew)
function crewVerb(id) { if (S.beat === 'serveCrew' && player.hold && player.hold.kind === 'tray' && !S.flags['served_' + id]) return 'Serve'; return 'Talk'; }
function crewAct(id) {
  if (S.beat === 'serveCrew' && player.hold && player.hold.kind === 'tray' && !S.flags['served_' + id]) { const h = player.hold; h.n--; if (h.n <= 0) holdItem(null); else setHandItem(h); S.flags['served_' + id] = 1; CREW[id].pose = 'sitDrink'; Snd.soft(); const ln = { gen: 'Hm. Same as hers. Maybe a little braver.', mako: 'Hot. Good. I can feel my hands again.', tomo: 'Oh, that\'s actually really good. Is that weird to say?' }[id]; say([{ w: id, t: ln }], () => checkCrewServed(), lookCrew); return; }
  const idle = { gen: ['Take your time. Chiyo never rushed a pot.', 'My soba shop is next door. Knock if you need a hammer.'], mako: ['Wires don\'t lie. People do.', 'If it sparks, step back. If it smokes, call me.'], tomo: ['I deliver anything. Crates, noodles, bad news.', 'Order stuff on Kumo Supply and I\'ll bring it round the alley.'] }[id] || ['…'];
  say([{ w: id, t: pick(idle) }], null, lookCrew);
}
/* ---------- letters ---------- */
const LETTERS = [
  'If you\'re reading this, the key found you.\nThe stall is under the 8 Line, where it always was. The kettle still works. The street still needs somewhere warm.\nOpen the shutter. Gen-san next door will help, even if he grumbles. Don\'t let anyone rush you. Tea takes the time it takes.',
  'You found the alcove. I kept this room for the people who needed to sit longer than a cup.\nKneel, turn the bowl twice, and let them see the front. That\'s all a ceremony is: showing someone you thought about them.',
  'These seeds came from my mother\'s hillside, before the rain never stopped. They don\'t need sun, they need patience.\nGrow something here that nobody can buy.',
  'If the lights stayed on, then you did it. Not the building. The people in it.\nPour one for Gen-san. He won\'t say thank you, but he\'ll drink it slowly.',
];
/* ---------- director ---------- */
const BEATS = {};
function goBeat(id) { S.beat = id; save(); enterBeat(id); }
function enterBeat(id) { const b = BEATS[id]; if (!b) { console.warn('no beat', id); return; } if (b.enter) b.enter(); setTask(typeof b.task === 'function' ? b.task() : b.task, b.target || null); }
let beatT = 0;
function updateBeat(dt) { const b = BEATS[S.beat]; if (b && b.update) b.update(dt); beatT += dt; if (b && b.task && typeof b.task === 'function' && frameN % 20 === 0) setTask(b.task(), b.target || null); }
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------- Prologue ---------- */
BEATS.start = {
  task: 'Open the shutter', target: V3(-0.1, 1.2, 0.2),
  enter() {
    player.pos.set(1.2, 0.12, 7.5); player.yaw = 0.06; player.pitch = 0.05;
    addIA({ id: 'shutter', box: [-0.1, 1.3, 0.2, 4.6, 2.6, 0.3], name: 'Roll shutter', verb: 'Roll it up', hold: 1.2, cond: () => !S.flags.shutterUp, act: () => { S.flags.shutterUp = 1; Snd.train(); removeIA('shutter'); buildFacade(); buildG0(); goBeat('lookin'); } });
    if (!S.flags.letter0) { S.flags.letter0 = 1; setTimeoutG(() => showLetter(LETTERS[0], () => say([{ w: 'narr', t: 'Hachiban-dōri. Under the 8 Line, the rain never stops. Grandma\'s stall is the dark one with the shutter down.' }])), 900); }
  },
};
BEATS.lookin = {
  task: 'Step inside', target: V3(-0.4, 1.0, -2.0),
  update() {
    if (playerIndoors() && !S.flags.lookSaid) {
      S.flags.lookSaid = 1;
      say([{ w: 'narr', t: 'Dust, a dripping ceiling, and an empty space where the counter used to be. Somebody has already left a bucket under the leak.' }, { w: 'narr', t: 'Footsteps outside. Voices.' }], () => {
        crewArrive();
      });
    }
  },
};
function crewArrive() {
  const g = spawnCrew('gen', -5.2, 0.12, 1.3, Math.PI / 2), m = spawnCrew('mako', -6.3, 0.12, 1.5, Math.PI / 2), t = spawnCrew('tomo', -7.4, 0.12, 1.2, Math.PI / 2);
  crewProp('mako', 'toolbox'); crewProp('tomo', 'crate'); t.carry = true;
  crewWalk('gen', [-0.9, 0, -2.0, null, 'talk']);
  setTimeoutG(() => crewWalk('mako', [0.4, 0, -1.55, null, 'idle']), 700);
  setTimeoutG(() => crewWalk('tomo', [1.62, 0, -1.0, 1.9, 'crouch'], () => { crewProp('tomo', null); t.carry = false; S.flags.crateDown = 1; buildG0(); setTimeoutG(() => { if (CREW.tomo && CREW.tomo.pose === 'crouch') CREW.tomo.pose = null; }, 900); }), 1400);
  setTimeoutG(() => {
    S.flags.crew = 1; buildG0();
    say([
      { w: 'gen', t: 'So you\'re Chiyo\'s. You have her eyebrows.' },
      { w: 'gen', t: 'Ishikawa. Gen-san to everyone. I run the soba shop next door. She asked me to help when you came. So.' },
      { w: 'mako', t: 'Mako. Electrician. The wiring in here is older than the train line, and the train line is old.' },
      { w: 'tomo', t: 'Tomo! I brought planks, a breaker panel, some rope, and a noren that a lady at the market swore was lucky.' },
      { w: 'gen', t: 'First the rubbish. Then the counter. Then we see if she still has a heart.', ch: [['Let\'s start.', [{ w: 'gen', t: 'Good. Bags out to the dumpster in the alley. Mako, the side door.' }]], ['Where do I even begin?', [{ w: 'gen', t: 'With the bags. Out to the dumpster in the alley. Mako, open the side door.' }]]] },
      { w: 'mako', t: 'Side door. Stuck since the Olympics, probably. Give me a second.' },
    ], () => goBeat('trash'), lookCrew);
  }, 6400);
}
/* ---------- crew choreography: everyone walks, carries and works; nobody pops ---------- */
const crewReady = id => !!CREW[id] && !CREW[id].path;
function routeTo(n, tgt) {
  const a = nearestWp(n.pos), b = nearestWp(tgt); let path = a && b ? wpPath(a, b) : null; if (!path) path = [];
  if (path.length > 1 && n.pos.distanceTo(path[1]) < path[0].distanceTo(path[1])) path.shift();
  if (path.length > 1 && tgt.distanceTo(path[path.length - 2]) < path[path.length - 1].distanceTo(path[path.length - 2])) path.pop();
  if (path.length === 1 && n.pos.distanceTo(tgt) < n.pos.distanceTo(path[0])) path.shift();
  path.push(tgt.clone()); return path;
}
// spot: [x, y, z, yaw|null(face player), pose, prop]
function crewWalk(id, spot, cb) {
  const n = CREW[id]; if (!n) return; const t = V3(spot[0], spot[1], spot[2]);
  const arrive = () => { n.carry = false; if (spot[3] === null || spot[3] === undefined) faceTo(n, player.pos.x, player.pos.z); else n.yawT = spot[3]; n.pose = spot[4] || null; if (spot[5] !== undefined) crewProp(id, spot[5]); if (cb) cb(); };
  if (n.pos.distanceTo(t) < 0.2) { n.path = null; arrive(); return; }
  n.path = routeTo(n, t); n.onArrive = arrive; n.pose = null;
}
function handProp(kind) {
  const c = new Chunk('prop', 'g0', { jit: 0.02 });
  if (kind === 'broom') { c.bar([0, 0.32, 0.02], [0, -1.45, 0.02], 0.018, C.bamboo, 6); c.box(0.34, 0.07, 0.1, 0x3a2a1a, 0, -1.47, 0.02); for (let i = 0; i < 9; i++) c.box(0.028, 0.16, 0.05, 0xb79a5a, -0.15 + i * 0.037, -1.58, 0.02, 0, 0, (i - 4) * 0.03); }
  else if (kind === 'toolbox') { c.box(0.4, 0.17, 0.17, 0xc23b2b, 0, -0.2, 0.02); c.box(0.41, 0.03, 0.18, 0x8a2a20, 0, -0.12, 0.02); c.box(0.2, 0.03, 0.03, 0x1a1a1c, 0, -0.07, 0.02); for (const x of [-0.1, 0.1]) c.box(0.025, 0.06, 0.025, 0x1a1a1c, x, -0.09, 0.02); c.box(0.06, 0.03, 0.01, 0xd8d0c0, 0.12, -0.18, 0.11); }
  else if (kind === 'crate') { c.box(0.62, 0.36, 0.42, 0xa8885a, -0.24, -0.08, 0.22); for (const y of [-0.2, 0.04]) c.box(0.63, 0.05, 0.43, 0x7a5a3a, -0.24, y, 0.22); c.box(0.5, 0.04, 0.3, C.cedarL, -0.24, 0.12, 0.22); c.box(0.4, 0.035, 0.28, C.cedar, -0.2, 0.155, 0.2, 0, 0.1, 0); }
  else if (kind === 'planks') { for (let i = 0; i < 3; i++) c.box(1.6, 0.035, 0.2, i % 2 ? C.cedarL : C.cedar, -0.24, -0.02 + i * 0.038, 0.12, 0, 0, 0); }
  else if (kind === 'drill') { c.box(0.055, 0.13, 0.06, 0x2a2c31, 0, -0.08, 0.03); c.box(0.06, 0.07, 0.16, 0xd8b53a, 0, 0.0, 0.08); c.cyl(0.01, 0.006, 0.1, 6, C.steel, 0, 0.0, 0.2, Math.PI / 2); }
  else if (kind === 'sign') { c.box(1.7, 0.46, 0.08, 0x1a1c22, -0.24, 0.12, 0.1); c.box(1.72, 0.03, 0.09, 0x3a3c42, -0.24, 0.36, 0.1); c.box(1.72, 0.03, 0.09, 0x3a3c42, -0.24, -0.12, 0.1); }
  else if (kind === 'noren') { P.noren(c, 0, 0.1, 0.06, 0.9, 0.7, C.indigo, 2); }
  else if (kind === 'trash') { P.trashBag(c, 0, -0.6, 0.02, 0.8); }
  else return null;
  const m = new THREE.Mesh(c.raw(), personMat()); m.castShadow = true;
  if (kind === 'sign') { const tex = neonTex('茶房 雫', { col: '#' + new THREE.Color(signHex()).getHexString(), px: 90 }); const a = tex.userData.aspect || 4; const q = new THREE.Mesh(gPlaneIdx(), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color(0.45, 0.45, 0.45) })); q.scale.set(0.34 * a, 0.34, 1); q.position.set(-0.24, 0.12, 0.145); m.add(q); }
  return m;
}
function crewProp(id, kind) {
  const n = CREW[id]; if (!n) return; const hd = n.p.P.hdR;
  if (n.propObj) { hd.remove(n.propObj); n.propObj = null; n.propKind = null; }
  if (!kind) return; const m = handProp(kind); if (!m) return; m.position.set(0, -0.06, 0.02); hd.add(m); n.propObj = m; n.propKind = kind;
  n.propProbe = m.material.userData.probe;
}
const TRASH_POS = [[-2.15, 0, -1.3], [0.4, 0, -2.2], [-2.1, 0, -4.4], [1.75, 0, -3.62]];
let TRASH_OBJ = [];
BEATS.trash = {
  task: () => `Carry the trash bags to the dumpster in the alley (${S.flags.trashN || 0}/4)`, target: () => player.hold && player.hold.kind === 'trash' ? V3(4.1, 1.2, -9.35) : nextTrashPos(),
  enter() {
    placeCrewForBeat(); spawnTrash();
    addIA({ id: 'dumpster', box: [4.1, 0.7, -9.35, 1.1, 1.4, 1.7], name: 'Dumpster', verb: 'Toss it in', cond: () => player.hold && player.hold.kind === 'trash', act: () => { holdItem(null); S.flags.trashN = (S.flags.trashN || 0) + 1; Snd.knock(); Snd.hit(200, 1, 0.3, 0.3); if (S.flags.trashN >= 4) { S.flags.cleaned = 1; buildG0(); removeIA('dumpster'); say([{ w: 'gen', t: 'Better. Now she can breathe.' }, { w: 'gen', t: 'Counter time. I\'ll hold the boards, you drive the bolts. Don\'t overdo them, the wood is older than you.' }], () => goBeat('counter'), lookCrew); } } });
  },
};
function nextTrashPos() { const i = TRASH_OBJ.findIndex(o => o); return i >= 0 ? V3(TRASH_POS[i][0], 0.4, TRASH_POS[i][2]) : null; }
function spawnTrash() {
  TRASH_OBJ.forEach(o => o && scene.remove(o)); TRASH_OBJ = []; removeIA(/^trash/);
  const left = 4 - (S.flags.trashN || 0) - (player.hold && player.hold.kind === 'trash' ? 1 : 0);
  TRASH_POS.forEach((p, i) => { if (i >= left) { TRASH_OBJ.push(null); return; } const o = trashObj(); o.position.set(p[0], p[1], p[2]); o.rotation.y = rand(0, 6); probeAt(o.position, 'g0', o.userData.mat.userData.probe.value); scene.add(o); TRASH_OBJ.push(o);
    addIA({ id: 'trash' + i, box: [p[0], 0.3, p[2], 0.6, 0.6, 0.6], name: 'Trash bag', verb: 'Pick up', cond: () => !!TRASH_OBJ[i], act: () => { if (player.hold) { toast('Your hands are full.'); return; } scene.remove(TRASH_OBJ[i]); TRASH_OBJ[i] = null; holdItem({ kind: 'trash' }); } }); });
}
BEATS.counter = {
  task: () => S.flags.counterLaid ? 'Bolt the counter boards down' : 'Help Gen-san build the counter: he\'s bringing the boards', target: V3(-0.8, 1.0, -2.9),
  enter() { placeCrewForBeat(); addIA({ id: 'counterJob', box: [-0.8, 0.8, -3.0, 3.2, 0.9, 0.7], name: 'Counter boards', verb: 'Bolt them down', cond: () => S.beat === 'counter' && S.flags.counterLaid, act: () => {
    const pts = [-2.2, -1.5, -0.8, -0.1, 0.6].map(x => V3(x, 1.03, -2.75));
    startJob('bolt', { title: 'Bolt the counter', cam: { pos: V3(-0.8, 1.62, -1.75), at: V3(-0.8, 0.95, -2.9) }, points: pts, boltRot: 0, cancel: true, done: () => { removeIA('counterJob'); S.flags.counterBuilt = 1; buildG0(); refreshSeats(); say([{ w: 'gen', t: 'Cedar. It\'ll outlive both of us if you oil it.' }, { w: 'mako', t: 'My turn. Fuse box is in the back room. Come on.' }], () => goBeat('wire'), lookCrew); } });
  } }); },
};
BEATS.wire = {
  task: () => crewReady('mako') ? 'Wire the breaker panel with Mako (back room)' : 'Mako is heading to the breaker panel in the back room', target: V3(2.0, 1.6, -5.65),
  enter() { placeCrewForBeat(); addIA({ id: 'fuseJob', box: [2.0, 1.6, -5.68, 0.5, 0.6, 0.2], name: 'Breaker panel', verb: 'Wire it', cond: () => S.beat === 'wire' && crewReady('mako'), act: () => {
    say([{ w: 'mako', t: 'Before I close it up: the sign. What colour do you want it?', ch: [['Cyan, like the rain under the lamps.', [{ w: 'mako', t: 'Cold. I like it.', fx: () => { S.sign = 'cyan'; } }]], ['Magenta. Loud.', [{ w: 'mako', t: 'Loud it is. Kaiun will hate that.', fx: () => { S.sign = 'magenta'; } }]], ['Amber, like a lantern.', [{ w: 'mako', t: 'Warm. Chiyo would have picked that.', fx: () => { S.sign = 'amber'; } }]]] }, { w: 'mako', t: 'Now match the cables. Colour to colour, shape to shape. Don\'t lick anything.' }], () => {
      startJob('wire', { title: 'Wire the breaker panel', cam: { pos: V3(2.0, 1.62, -6.45), at: V3(2.0, 1.55, -5.6) }, n: 3, label: 'MAIN PANEL', cancel: true, done: () => { removeIA('fuseJob'); S.flags.wired = 1; S.flags.signHung = 1; crewProp('tomo', null); if (CREW.tomo) CREW.tomo.pose = 'idle'; buildG0(); buildFacade(); say([{ w: 'mako', t: 'Clean work. Tomo\'s hanging a noren over the front door. No power till everything\'s ready, though.' }, { w: 'tomo', t: 'Rain barrel next! The downspout in the alley just dumps on the ground right now.' }], () => goBeat('plumb'), lookCrew); } });
    }, lookCrew);
  } }); },
};
BEATS.plumb = {
  task: () => crewReady('tomo') ? 'Fit the downspout to the rain barrel in the alley' : 'Tomo is carrying the pipe out to the rain barrel in the alley', target: V3(3.0, 1.6, -6.2),
  enter() { placeCrewForBeat(); addIA({ id: 'plumbJob', box: [3.05, 1.4, -6.2, 0.8, 2.2, 0.8], name: 'Rain barrel', verb: 'Fit the downspout', reach: 2.8, cond: () => S.beat === 'plumb' && crewReady('tomo'), act: () => {
    startJob('align', { title: 'Fit the downspout', cam: { pos: V3(3.95, 1.55, -4.75), at: V3(2.95, 1.75, -6.2) }, spot: V3(2.86, 1.92, -6.2), size: [0.2, 1.02, 0.2], axis: V3(0, 0, 1), model: c => { c.cyl(0.06, 0.06, 1.0, 8, 0x5a5e66, 0, 0, 0); c.cyl(0.072, 0.072, 0.06, 8, 0x3a3d42, 0, 0.48, 0); c.cyl(0.072, 0.072, 0.06, 8, 0x3a3d42, 0, -0.48, 0); }, cancel: true, done: () => { removeIA('plumbJob'); S.flags.plumbed = 1; S.water = Math.max(S.water, 6); buildG0(); toast('Rain runs down the pipe and drums into the barrel.'); say([{ w: 'tomo', t: 'Listen to that. Free water, forever. Amagase\'s one perk.' }, { w: 'tomo', t: 'Here, the lucky noren. Back doorway, between the counter and the stairs.' }], () => goBeat('noren'), lookCrew); } });
  } }); },
};
BEATS.noren = {
  task: 'Hang the noren in the back doorway', target: V3(0, 2.0, -5.45),
  enter() { placeCrewForBeat(); addIA({ id: 'norenJob', box: [0, 1.6, -5.45, 1.0, 1.2, 0.3], name: 'Back doorway', verb: 'Hang the noren', cond: () => S.beat === 'noren', act: () => {
    startJob('hang', { title: 'Hang the noren', cam: { pos: V3(0.15, 1.6, -3.75), at: V3(0, 1.7, -5.45) }, spot: V3(0, 1.7, -5.38), size: [1.04, 0.92, 0.06], axis: V3(1, 0, 0), model: c => { P.noren(c, 0, 0.42, 0, 1.0, 0.9, C.indigo, 2, 0, 0xefe4cc); }, cancel: true, done: () => { removeIA('norenJob'); S.flags.noren = 1; buildG0(); goBeat('kettleBox'); } });
  } }); },
};
BEATS.kettleBox = {
  task: () => player.hold && player.hold.kind === 'kettle' ? 'Set Chiyo\'s kettle on the burner' : 'Find Chiyo\'s kettle in the back room', target: () => player.hold && player.hold.kind === 'kettle' ? V3(-1.45, 1.1, -5.08) : V3(-2.1, 0.6, -6.0),
  enter() {
    placeCrewForBeat(); if (KS.g) KS.g.visible = false;
    if (!S.flags.kettleTaken) addIA({ id: 'kettleBox', box: [-2.15, 0.55, -5.95, 0.6, 0.5, 0.5], name: 'Box marked 「台所」', verb: 'Look inside', act: () => { say([{ w: 'narr', t: 'Newspaper, wrapped twice. Inside: a heavy black iron kettle, hobnailed all over, with a paper tag on the handle, and a note in Chiyo\'s hand: "Don\'t let it boil hard."' }], () => { S.flags.kettleTaken = 1; removeIA('kettleBox'); holdItem({ kind: 'kettle' }); setTask('Set Chiyo\'s kettle on the burner', V3(-1.45, 1.1, -5.08)); }); } });
    addIA({ id: 'burner', box: [-1.45, 1.05, -5.08, 0.5, 0.25, 0.45], name: 'Induction burner', verb: 'Set the kettle down', cond: () => player.hold && player.hold.kind === 'kettle', act: () => { holdItem(null); removeIA('burner'); S.flags.kettle = 1; KS.g.visible = true; Snd.knock(); say([{ w: 'gen', t: '…' }, { w: 'gen', t: 'Well. Make us a pot, then. Sencha. We\'ll sit at your new counter like real customers.' }], () => goBeat('brewCrew'), lookCrew); } });
  },
};
BEATS.brewCrew = {
  task: () => player.hold && player.hold.kind === 'tray' ? 'Serve the crew at the counter' : 'Brew sencha for the crew at the kettle', target: () => player.hold && player.hold.kind === 'tray' ? V3(-1.3, 1.3, -2.3) : V3(-1.45, 1.1, -5.08),
  enter() { placeCrewForBeat(); if (KS.g) KS.g.visible = true; },
  update() { if (player.hold && player.hold.kind === 'tray') goBeat('serveCrew'); },
};
BEATS.serveCrew = {
  task: () => `Serve the crew (${['gen', 'mako', 'tomo'].filter(i => S.flags['served_' + i]).length}/3)`, target: () => { const id = ['gen', 'mako', 'tomo'].find(i => !S.flags['served_' + i]); return id && CREW[id] ? crewAt(id)() : null; },
  enter() { placeCrewForBeat(); if (!player.hold && !['gen', 'mako', 'tomo'].every(i => S.flags['served_' + i])) { S.beat = 'brewCrew'; enterBeat('brewCrew'); } },
};
function checkCrewServed() {
  if (!['gen', 'mako', 'tomo'].every(i => S.flags['served_' + i])) { if (!player.hold) { setTask('Brew another pot for the rest of the crew', V3(-1.45, 1.1, -5.08)); S.beat = 'brewCrew'; } return; }
  setTimeoutG(() => say([{ w: 'tomo', t: 'To Chiyo-san!' }, { w: 'gen', t: 'To Chiyo.' }, { w: 'mako', t: 'To working wiring.' }, { w: 'mako', t: 'Right. Do the honours. Main breaker, back room. Hold it till it clicks.' }], () => goBeat('breaker'), lookCrew), 1200);
}
BEATS.breaker = {
  task: 'Throw the main breaker in the back room', target: V3(2.0, 1.6, -5.65),
  enter() { placeCrewForBeat(); addIA({ id: 'breaker', box: [2.0, 1.6, -5.68, 0.5, 0.6, 0.2], name: 'Main breaker', verb: 'Throw it', hold: 1.0, cond: () => S.beat === 'breaker', act: () => {
    removeIA('breaker'); Snd.zap(); Snd.knock(); fadeTo(1, () => { S.flags.power = 1; buildG0(); buildFacade(); rebakeStreet(); buildKettleStation(); fadeTo(0); Snd.chime(); say([{ w: 'mako', t: 'There she is.' }, { w: 'mako', t: 'Go on. Go out and look at it from the street. Properly.' }], () => goBeat('outside'), lookCrew); }, 350);
  } }); },
};
BEATS.outside = {
  task: 'Step outside and look at your shop', target: V3(0.5, 0.12, 4.5),
  enter() { placeCrewForBeat(); },
  update() {
    if (S.flags.titleShown) return; const p = player.pos; const fwdZ = -Math.cos(player.yaw);
    if (p.z > 3.2 && fwdZ < -0.6 && Math.abs(p.x) < 6) { S.flags.titleShown = 1; Snd.chime(); showCard('雫', 'SHIZUKU', 4.2); setTimeoutG(() => {
      Snd.buzz(); say([{ w: 'narr', t: 'Your phone buzzes. The screen says: Mrs. Oda (landlord).' }, { w: 'oda', t: 'I can see the light from my window. So Chiyo\'s grandchild is real.' }, { w: 'oda', t: 'I\'ll be honest with you. Kaiun Holdings wants this whole block. They\'ve offered me more than the building is worth.' }, { w: 'oda', t: 'I told them I\'d decide at the end of typhoon season. If that shop is alive by then, really alive, I won\'t sell.' }, { w: 'oda', t: 'Chiyo would have liked that you tried. Good night.' }],
        () => { addMsg('oda', 'End of typhoon season. Make it alive. — Oda'); crewLeave(); startChapter(1); });
    }, 4200); }
  },
};
function crewLeave() {
  say([{ w: 'gen', t: 'I\'ll be at my shop. Knock if you need me.' }, { w: 'mako', t: 'Call me when you\'re ready for something bigger.' }, { w: 'tomo', t: 'Order anything on Kumo Supply and I\'ll bring it to the alley door. Bye!' }], () => {
    ['gen', 'mako', 'tomo'].forEach((id, k) => { setTimeoutG(() => { if (!CREW[id]) return; crewProp(id, id === 'mako' ? 'toolbox' : null); crewWalk(id, id === 'gen' ? [-4.3, 0.12, 0.9, 0, null] : [id === 'mako' ? -26 : 26, 0.12, 1.3, 0, null], () => { if (id !== 'gen') despawnCrew(id); }); }, 300 + k * 600); });
  }, lookCrew);
}
// where each crew member is, and what they are doing, for each prologue beat
const CREW_SPOTS = {
  trash: { gen: [-0.6, 0, -1.9, -2.2, 'sweep', 'broom'], mako: [2.15, 0, -4.2, Math.PI / 2, 'tool', 'drill'], tomo: [-1.7, 0, -3.75, 0, 'kneelWork', null] },
  counter: { gen: [-1.5, 0, -3.72, 0, 'hold', null], mako: [1.25, 0, -1.6, -2.4, 'idle', null], tomo: [0.35, 0, -3.72, 0, 'hold', null] },
  wire: { gen: [-1.2, 0, -3.72, 0, 'work', null], mako: [0.25, 0, -6.15, Math.PI / 2, 'talk', 'drill'], tomo: [-0.2, 0.12, 0.85, Math.PI, 'reach', 'sign'] },
  plumb: { gen: [-1.2, 0, -3.72, 0, 'work', null], mako: [0.5, 0, -3.8, 0, 'reach', 'drill'], tomo: [3.6, 0.06, -6.8, -0.75, 'hold', null] },
  noren: { gen: [-1.2, 0, -3.72, 0, 'work', null], mako: [0.5, 0, -3.8, 0, 'reach', 'drill'], tomo: [1.1, 0, -4.45, -2.3, 'talk', null] },
  seated: { gen: [-1.3, 0, -2.28, Math.PI, 'sit', null], mako: [-0.6, 0, -2.28, Math.PI, 'sit', null], tomo: [0.1, 0, -2.28, Math.PI, 'sit', null] },
};
function placeCrewForBeat() {
  const b = S.beat; if (!S.flags.crew) return;
  if (['outside'].includes(b) && S.flags.titleShown) return;
  const spots = CREW_SPOTS[b] || CREW_SPOTS.seated;
  ['gen', 'mako', 'tomo'].forEach((id, k) => {
    const p = spots[id]; const fresh = !CREW[id]; const n = fresh ? spawnCrew(id, p[0], p[1], p[2], p[3] || 0) : CREW[id];
    const sp = p.slice(); if (sp[4] === 'sit' && S.flags['served_' + id]) sp[4] = 'sitDrink';
    if (fresh && b === 'counter') S.flags.counterLaid = 1;
    if (fresh) { n.pos.set(p[0], p[1], p[2]); n.yawT = p[3] || 0; n.p.root.rotation.y = n.yawT; n.pose = sp[4]; crewProp(id, sp[5]); return; }
    // same spot already (e.g. re-entering a beat): just refresh the pose
    if (n.pos.distanceTo(V3(p[0], p[1], p[2])) < 0.25) { n.path = null; n.onArrive = null; n.pose = sp[4]; if (p[3] !== null) n.yawT = p[3]; return; }
    if (sp[4] !== 'sit' && sp[4] !== 'sitDrink' && sp[5]) crewProp(id, sp[5]); else if (n.propKind && sp[5] !== n.propKind) crewProp(id, null);
    let cb = null;
    if (b === 'counter' && id === 'gen' && !S.flags.counterLaid) { // Gen picks the boards up off the sawhorses, then lays them across the frame
      crewProp('gen', null); setTimeoutG(() => crewWalk('gen', [-0.6, 0, -1.75, 0, 'crouch', null], () => setTimeoutG(() => { crewProp('gen', 'planks'); CREW.gen.carry = true; crewWalk('gen', sp, () => { crewProp('gen', null); S.flags.counterLaid = 1; Snd.knock(); buildG0(); setTask(BEATS.counter.task(), BEATS.counter.target); }); }, 700)), 250); return;
    }
    setTimeoutG(() => crewWalk(id, sp, cb), 250 + k * 450);
  });
  if (b === 'trash' && !S.flags.alleyOpen) {
    // Mako forces the side door once she gets there
    const wait = () => { const m = CREW.mako; if (!m || S.flags.alleyOpen) return; if (!m.path && m.pos.distanceTo(V3(2.15, 0, -4.2)) < 0.3) { setTimeoutG(() => { S.flags.alleyOpen = 1; Snd.knock(); Snd.hit(160, 1, 0.25, 0.4); clearTag('sideDoor'); toast('The side door scrapes open onto the alley.'); }, 1400); return; } setTimeoutG(wait, 300); };
    wait();
  }
}
/* ---------- chapters ---------- */
function startChapter(n) {
  S.ch = n; save(); const c = CHAPTERS[n]; setTimeoutG(() => showCard(c.kick, c.title), 600);
  if (n === 1) { S.flags.open = 0; goBeat('c1_first'); }
  if (typeof startChapter2 === 'function' && n >= 2) startChapter2(n);
}
BEATS.c1_first = {
  task: 'Your first customer is coming', target: null,
  enter() {
    if (!S.flags.c1sato) { S.flags.c1sato = 1; setTimeoutG(() => { const c = spawnCustomer({ seat: 'st1', rid: RID.sencha, look: crewLooks().sato, reg: 'sato', name: 'Mr. Sato', onSeat: () => { say([{ w: 'sato', t: 'The lights are on. I thought I was dreaming.' }, { w: 'sato', t: 'I came here every night for thirty years. Sencha, please. Not too hot. She never made it too hot.' }], null, () => c.n.pos.clone().add(V3(0, 1.4, 0))); setTask('Brew sencha for Mr. Sato', V3(-1.45, 1.1, -5.08)); }, onServed: (cc, stars) => { setTimeoutG(() => say([{ w: 'sato', t: stars >= 3 ? '…Ah. There it is.' : 'It\'s good. It will get better. Hers did too.' }, { w: 'sato', t: 'I\'ll tell the others on the block. Expect company.' }], () => { S.flags.open = 1; S.flags.supply = 1; addMsg('tomo', 'Kumo Supply is live on your phone! Order stuff, I drop it at the alley door. Leaves too, don\'t run out!'); goBeat('c1_open'); }, () => cc.n.pos.clone().add(V3(0, 1.4, 0))), 900); } }); c.noPat = true; }, 2500); }
    else { S.flags.open = 1; goBeat('c1_open'); }
  },
};
BEATS.c1_open = {
  task: () => S.yen >= 30000 ? 'Start the renovation at the holo-model table' : `Save ${yen(30000)} to open the second floor · ${yen(S.yen)}`, target: () => S.yen >= 30000 ? V3(1.2, 1.1, -6.35) : null,
  enter() { S.flags.open = 1; },
  update() {
    if (S.stats.served >= 4 && !S.flags.aiko1 && !DLG.active) { S.flags.aiko1 = 1; const c = spawnCustomer({ rid: RID.sencha, look: crewLooks().aiko, reg: 'aiko', name: 'Aiko', onSeat: (cc) => say([{ w: 'aiko', t: 'Twelve hours on the ward. Is it true you brew it yourself, by hand?' }, { w: 'aiko', t: 'Then I\'ll wait. Sencha, please.' }], null, () => cc.n.pos.clone().add(V3(0, 1.4, 0))), onServed: (cc) => setTimeoutG(() => say([{ w: 'aiko', t: 'Oh. Oh, that\'s warm all the way down.' }, { w: 'aiko', t: 'I\'ll be back after every night shift. Fair warning.' }], null, () => cc.n.pos.clone().add(V3(0, 1.4, 0))), 800) }); if (c) c.patMax *= 1.6; }
    if (S.stats.served >= 7 && !S.flags.meet_rin && !DLG.active && !player.focus) { S.flags.meet_rin = 1; rinArrives(); }
    if (S.stats.earned >= 9000 && !S.flags.kuroda1 && !DLG.active && !player.focus) { S.flags.kuroda1 = 1; kurodaVisit(1); }
    if (S.stats.served >= 14 && !S.flags.sato2 && !DLG.active) { S.flags.sato2 = 1; spawnCustomer({ rid: RID.genmai, look: crewLooks().sato, reg: 'sato', name: 'Mr. Sato', onSeat: (cc) => say([{ w: 'sato', t: 'Genmaicha tonight. Mochi, my cat, likes the smell of the rice. She\'s at home sulking.' }], null, () => cc.n.pos.clone().add(V3(0, 1.4, 0))), onServed: (cc) => setTimeoutG(() => say([{ w: 'sato', t: 'You\'ve started to stand like her behind that counter. Feet apart. Patient.' }], null, () => cc.n.pos.clone().add(V3(0, 1.4, 0))), 800) }); }
  },
};
function rinArrives() {
  const n = spawnNPC(crewLooks().rin, -26, 0.12, 1.3, Math.PI / 2); VIS.rin = n; n.speed = 1.6;
  npcGo(n, 'a1', () => { faceTo(n, player.pos.x, player.pos.z); say([
    { w: 'narr', t: 'A young woman in a Kaiun Brew uniform steps in, soaked, phone to her ear.' },
    { w: 'rin', t: '—no, I\'m not coming back. Put your QR code on your own cup. Bye.' },
    { w: 'rin', t: 'Sorry. Hi. I\'m Rin. I just quit the coffee chain across the street, and your sign was the only warm thing on the block.' },
    { w: 'rin', t: 'I can brew. Not like you, yet. But anything you\'ve really mastered, I can take off your hands.', ch: [['You\'re hired. Probably.', [{ w: 'rin', t: 'Probably is fine. Find me in the Crew app on your phone when you\'re ready.' }]], ['What do you need?', [{ w: 'rin', t: 'A wage and a towel. Find me in the Crew app on your phone when you\'re ready.' }]]] },
  ], () => { npcGo(n, 'sR', () => { removeNPC(n); delete VIS.rin; }); toast('Rin can be hired in the Crew app. She brews recipes you\'ve mastered (8 three-star brews).'); }, lookCrew); });
}
function onHire(id) { if (BARISTAS.includes(id) && id !== 'rin') { spawnStaff(id); say([{ w: id, t: { kenta: 'Kenta. I\'ve pulled double shifts at a ramen counter. This is calmer.', yui: 'Yui! Point me at the people who\'ve waited longest.', sora: 'Sora. I\'ll keep the pots going. Breathe.' }[id] }], null, lookCrew); } if (id === 'rin') { spawnStaff('rin'); say([{ w: 'rin', t: 'Apron\'s on. I\'ll brew anything you\'ve mastered, and you take care of the rest.' }], null, lookCrew); } if (typeof onHire2 === 'function') onHire2(id); }
function kurodaVisit(k) {
  const n = spawnNPC(crewLooks().kuroda, 26, 0.12, 1.3, -Math.PI / 2); VIS.kuroda = n; n.speed = 1.2;
  const lines = {
    1: [{ w: 'kuroda', t: 'Good evening. Kuroda, Kaiun Holdings. Acquisitions.' }, { w: 'kuroda', t: 'Charming. Truly. Our tower will have a tea concept on floor forty. I\'d be glad to offer you a position.' }, { w: 'kuroda', t: 'Or a cheque. A generous one. For the lease, the kettle, all of it.', ch: [['It\'s not for sale.', [{ w: 'kuroda', t: 'Everything is, eventually. I\'ll come back when the rain gets heavier.' }]], ['How generous?', [{ w: 'kuroda', t: 'Generous enough that you\'d never smell wet concrete again. Think about it. I\'ll come back.' }]]] }],
  }[k];
  npcGo(n, 'a1', () => { faceTo(n, player.pos.x, player.pos.z); say(lines, () => npcGo(n, 'sR', () => { removeNPC(n); delete VIS.kuroda; }), lookCrew); });
}
/* ---------- the kettle, pass, holo table ---------- */
function brewChooser() {
  if (player.hold && player.hold.kind === 'tray' && S.flags.counterBuilt) { if (!stowTray()) return; }
  if (player.hold) { toast('Your hands are full.'); return; }
  if (S.beat === 'brewCrew') { startKettle(RID.sencha, { free: true, done: () => { } }); return; }
  const rs = unlockedRecipes().filter(r => r.st === 'kettle'); if (rs.length === 1) { startKettle(RID[rs[0].id]); return; }
  const open = {}; CUST.forEach(c => { if (c.state === 'order') open[c.rid] = (open[c.rid] || 0) + 1; });
  openPanel(`<h2>What are you brewing?</h2><p class="sub">${potCups()} cups per pot · ${S.water.toFixed(0)} L water · ${S.leaves} leaf portions</p><div style="display:flex;flex-direction:column;gap:8px">${rs.map(r => { const why = S.water < potCups() * 0.25 * 0.6 ? 'not enough water' : r.roast && S.roasted < 1 ? 'no roasted leaves' : ''; return `<button class="btn ghost" data-r="${RID[r.id]}" ${why ? 'disabled' : ''} style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px${why ? ';opacity:.5' : ''}"><span>${r.jp} ${r.name}</span><span style="color:var(--amber2);font-size:12.5px">${why || (open[RID[r.id]] ? open[RID[r.id]] + ' waiting' : '')}</span></button>`; }).join('')}</div>`, box => box.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { closePanel(); startKettle(+b.dataset.r); }));
}
let HOLO = null;
function buildHolo() {
  if (HOLO) scene.remove(HOLO.g); const g = new THREE.Group(); g.position.set(1.2, 0.98, -6.35); scene.add(g);
  const mk = (w, h, d, y, col, k) => { const geo = new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending })); const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k * 1.6), transparent: true, opacity: 0.9 })); const gg = new THREE.Group(); gg.add(m, e); gg.position.y = y; g.add(gg); return gg; };
  const s = 0.05, spaces = [['g0', 0, 3.4, 0], ['f2', 3.6, 3.0, 2], ['f3', 6.8, 3.0, 4], ['roof', 10, 0.6, 5]]; HOLO = { g, parts: [] };
  for (const [id, y, h, ch] of spaces) { const open = S.ch >= ch, next = S.ch + 1 === ch || (ch === 2 && S.ch === 1); HOLO.parts.push({ o: mk(5.4 * s, h * s, 8 * s, (y + h / 2) * s, open ? 0x33e4ff : next ? 0xffb35c : 0x6f7787, open ? 1.2 : next ? 1.5 : 0.5), next }); }
  if (S.ch >= 3) mk(1.8 * s, 1.0 * s, 1.5 * s, 0.6 * s, 0x33e4ff, 1).position.x = 3.6 * s;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.2, 1.6), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(base);
  g.traverse(o => o.layers && o.layers.enable(1));
}
function updateHolo(dt) { if (!HOLO) return; HOLO.g.visible = !!S.flags.power; HOLO.g.rotation.y += dt * 0.3; for (const p of HOLO.parts) if (p.next) p.o.children.forEach(c => { c.material.opacity = (c.isLineSegments ? 0.6 : 0.1) + Math.sin(time * 4) * 0.25; }); }
function nextGateText() { const c = CHAPTERS[S.ch]; if (!c || !c.gate) return 'Nothing planned right now.'; const g = c.gate; const parts = [`${yen(g.yen)}`]; if (g.roasted) parts.push(`${g.roasted} roasted portions`); if (g.leaves) parts.push(`${g.leaves} leaves`); if (g.charge) parts.push(`${g.charge}⚡`); if (g.flag === 'odaService') parts.push('a three-star service for Mrs. Oda'); return `${c.renoName}: ${parts.join(' + ')}.`; }
function gateMet() { const c = CHAPTERS[S.ch]; if (!c || !c.gate) return false; const g = c.gate; return S.yen >= g.yen && (!g.roasted || S.roasted >= g.roasted) && (!g.leaves || S.leaves >= g.leaves) && (!g.charge || S.charge >= g.charge) && (!g.flag || S.flags[g.flag]); }
function holoAct() {
  if (!S.flags.power) { toast('No power yet.'); return; }
  const c = CHAPTERS[S.ch]; const met = gateMet();
  openPanel(`<h2>Renovation plans</h2><p class="sub">The hologram turns slowly: four floors, the alley, the street. ${c && c.gate ? 'The next part of the building glows amber.' : ''}</p><div class="card"><h3>${c && c.renoName ? c.renoName : 'All done'}</h3><p>${nextGateText()}</p></div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn" id="hGo" ${met ? '' : 'disabled'}>${met ? 'Start the renovation' : 'Not yet'}</button><button class="btn ghost" id="hClose">Close</button></div>`, box => {
    box.querySelector('#hClose').onclick = () => closePanel();
    const go = box.querySelector('#hGo'); if (go) go.onclick = () => { closePanel(); startRenovation(S.ch); };
  });
}
function startRenovation(ch) { if (typeof renovate === 'function') { const g = CHAPTERS[ch].gate; pay(g.yen); if (g.roasted) S.roasted -= g.roasted; if (g.leaves) S.leaves -= g.leaves; renovate(ch); } else toast('The second floor opens in the next update. Keep the shop running meanwhile.'); }
/* ---------- Tomo's deliveries ---------- */
let tomoBusy = false;
function tomoDrop() { if (tomoBusy || CREW.tomo) return; tomoBusy = true; const n = spawnNPC(crewLooks().tomo, 26, 0.12, 1.3, -Math.PI / 2); n.speed = 2.2; npcGo(n, 'drop', () => { n.pose = 'wave'; faceTo(n, player.pos.x, player.pos.z); setTimeoutG(() => { n.pose = null; npcGo(n, 'sR', () => { removeNPC(n); tomoBusy = false; }); }, 2500); }); }
/* ---------- static interactables ---------- */
function setupStaticIA() {
  setupBinIA();
  removeIA(/^(kettleIA|passIA|holoIA|genDoor|shrine|fuseIdle|vend)/);
  addIA({ id: 'kettleIA', box: [-1.45, 1.1, -5.08, 0.5, 0.4, 0.5], name: 'Chiyo\'s kettle', verb: 'Brew', cond: () => S.flags.kettle && !['kettleBox'].includes(S.beat), act: brewChooser });
  addIA({ id: 'holoIA', box: [1.2, 1.1, -6.35, 1.2, 0.5, 0.7], name: 'Holo-model table', verb: 'Plan a renovation', cond: () => S.ch >= 1, act: holoAct });
  addIA({ id: 'shrine', box: [4.28, 0.6, -5.05, 0.5, 0.9, 0.7], name: 'Little shrine', verb: 'Leave ¥100', act: () => { if (S.yen < 100) { toast('Not even ¥100. The shrine understands.'); return; } S.yen -= 100; Snd.bell(); S.flags.luck = (S.flags.luck || 0) + 1; toast(pick(['You clap twice and bow. The rain sounds a little softer.', 'A small bow. Someone left a fresh tangerine here.', 'You make a wish for the shop.'])); } });
  addIA({ id: 'vend', box: [-2.2, 1.0, 0.62, 1.0, 1.9, 0.8], name: 'Vending machine', verb: 'Buy a drink (¥130)', act: () => { if (S.yen < 130) { toast('Not enough change.'); return; } S.yen -= 130; Snd.hit(300, 2, 0.3, 0.2); toast(pick(['A can of hot corn soup rattles down. Of course.', 'Royal milk tea, hot. You hold it for the warmth.', 'Pocari Sweat. The rain makes it feel ironic.'])); } });
}
/* ---------- game hooks ---------- */
function initGame() {
  initWaypoints(); refreshSeats(); buildKettleStation(); buildKitchens(); refreshCrates(); updatePass(); setupStaticIA(); buildHolo();
  if (!S.flags.kettle && KS.g) KS.g.visible = false;
  if (typeof initGame2 === 'function') initGame2();
}
function updateGame(dt) {
  updateTimers(dt); updateDialogue(dt); updateStation(dt); updateKettleFx(dt); updateNPCs(dt); updateCustomers(dt); updatePassers(dt); updateStaff(dt); updateDeliveries(dt); updateEconomy(dt); updateBeat(dt); updateHolo(dt); updateSideDoor(dt); updateTea(dt);
  if (S.flags.trashN !== undefined && S.beat === 'trash' && player.hold === null && TRASH_OBJ.every(o => !o) && (S.flags.trashN || 0) < 4) spawnTrash();
  if (typeof updateGame2 === 'function') updateGame2(dt);
}
function humLevel() { let k = 0; for (const r of CITY.signs) { if (!r.mesh.parent) continue; const d = r.mesh.getWorldPosition(_pv).distanceTo(camera.position); if (d < 5) k = Math.max(k, 1 - d / 5); } return k; }
function musicFlavor() { if (player.pos.y > 9.5) return 2; if (player.pos.y > 3.3 && player.pos.y < 6.5 && playerIndoors()) return 1; return 0; }
function loadingScan() {
  let bad = 0; scene.traverse(o => { if (o.isMesh && !o.material) bad++; if (o.isMesh && o.material && o.material.type === 'MeshBasicMaterial' && !o.material.map && !o.material.vertexColors && o.material.color.r === 1 && o.material.color.g === 1 && o.material.color.b === 1 && o.material.visible && !o.material.transparent && o.parent !== HITS) bad++; const g = o.geometry; if (g && g.attributes && g.attributes.position) { const a = g.attributes.position.array; for (let i = 0; i < a.length; i += 97) if (!Number.isFinite(a[i])) { bad++; break; } } });
  if (bad && DEBUG) console.warn('scan: ' + bad + ' suspicious meshes');
}
/* ---------- title ---------- */
function showTitle() {
  const t = $('#title'); t.hidden = false; const acts = $('#titleActs'); const sv = hasSave && S.beat !== 'start';
  acts.innerHTML = (sv ? `<button class="btn" id="tCont">Continue · ${S.ch === 0 ? 'Move-in' : CHAPTERS[S.ch].kick.toLowerCase()}</button><button class="btn ghost" id="tNew">New game</button>` : `<button class="btn" id="tNew">Begin with sound</button><button class="btn ghost" id="tQuiet">Begin quietly</button>`);
  $('#titleNote').innerHTML = COARSE ? 'Left thumb walks, right thumb looks. Tap things to use them.' : 'Mouse and keyboard: <kbd>WASD</kbd> walk · mouse look · <kbd>E</kbd> use · <kbd>Q</kbd> put down · <kbd>Tab</kbd> phone · <kbd>Esc</kbd> pause';
  player.pos.set(1.2, 0.12, 9.5); player.yaw = 0.08; player.pitch = 0.22;
  const begin = (fresh, sound) => {
    if (fresh) { S = DEFAULT(); window.__noSave = false; hasSave = false; for (const id of Object.keys(CREW)) despawnCrew(id); buildFacade(); buildG0(); buildKettleStation(); initGame(); }
    if (sound !== undefined) setSound(sound); else if (SET.sound > 0) Snd.init(), Snd.applyVol();
    t.hidden = true; started = true; $('#hud').hidden = false; if (COARSE) { $('#touch').hidden = false; $('#tbtns').hidden = false; }
    for (const id of BARISTAS) if (S.staff[id]) spawnStaff(id); if (S.ch >= 1 && !CREW.gen) { const g = spawnCrew('gen', -4.3, 0.12, 0.9, 0); }
    if (S.pp && !fresh) { player.pos.set(S.pp[0], S.pp[1], S.pp[2]); player.yaw = S.pp[3] || 0; }
    enterBeat(S.beat); if (!COARSE) canvas.requestPointerLock && canvas.requestPointerLock();
    if (!S.flags.ctlShown) { S.flags.ctlShown = 1; setTimeout(() => { if (!DLG.active && !UI.modal) toast(COARSE ? 'Drag left to walk, right to look. Tap things to use them.' : 'WASD to walk, mouse to look, E to use. Tab opens your phone.'); }, S.beat === 'start' ? 9000 : 1500); }
  };
  const c = $('#tCont'), n = $('#tNew'), q = $('#tQuiet');
  if (c) c.onclick = () => begin(false);
  if (n) n.onclick = () => { if (sv) { if (!confirm('Start over? This erases your saved shop.')) return; } begin(true, 2); };
  if (q) q.onclick = () => begin(true, 0);
}
addEventListener('pagehide', () => { if (started) { S.pp = [player.pos.x, player.pos.y, player.pos.z, player.yaw]; save(); } });
setInterval(() => { if (started) S.pp = [player.pos.x, player.pos.y, player.pos.z, player.yaw]; }, 5000);

