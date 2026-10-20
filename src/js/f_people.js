/* ================= people ================= */
Chunk.prototype.raw = function () { if (!this.p.length) return null; const m = this.build(); const g = m.geometry; g.deleteAttribute('bake'); return g; };
function personMat() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.userData.probe = { value: new THREE.Color(0.3, 0.28, 0.32) };
  m.onBeforeCompile = sh => { sh.uniforms.uProbe = m.userData.probe; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uProbe;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uProbe;'); };
  m.customProgramCacheKey = () => 'probeV1'; return m;
}
// light at a point from anchors (for dynamic objects)
function probeAt(p, zone, out) {
  const zd = ZONES[zone] || ZONES.street; let r = zd.amb.r, g = zd.amb.g, b = zd.amb.b;
  for (const a of ANCHORS) { if (!a.z.includes(zone)) continue; const dx = a.p[0] - p.x, dy = a.p[1] - (p.y + 1.2), dz = a.p[2] - p.z; const d2 = dx * dx + dy * dy + dz * dz; if (d2 > a.r * a.r) continue; const d = Math.sqrt(d2); const q = 1 - d / a.r; const k = q * q * a.i * 0.7 / (1 + d2 * 0.08); r += a.c.r * k; g += a.c.g * k; b += a.c.b * k; }
  const knee = v => v < 0.8 ? v : 0.8 + (v - 0.8) / (1 + (v - 0.8) * 2.2); // soft cap: no blown-out people next to lamps
  out.setRGB(knee(r), knee(g), knee(b)); return out;
}
function zoneAt(p) {
  if (p.x > BLD.ix0 - 0.05 && p.x < BLD.ix1 + 0.05 && p.z < -0.15 && p.z > BLD.iz0 - 0.05) { if (p.y < 3.2) return 'g0'; if (p.y < 6.4) return 'f2'; if (p.y < 9.6) return 'f3'; return 'roof'; }
  if (p.y > 9.6 && p.x > BLD.x0 && p.x < BLD.x1 && p.z < 0 && p.z > BLD.z0) return 'roof';
  if (p.x > 2.7 && p.x < 4.6 && p.z < 0) return 'alley';
  return 'street';
}
const SKIN = [0xf1c8a6, 0xe3b08a, 0xc98d64, 0xa86e48, 0x7a4e32, 0xf5d5bc];
const HAIR = [0x1a1414, 0x2a1d16, 0x3a2a1e, 0x5a3a24, 0x8a8e94, 0xd8d0c8, 0x6a2a3a, 0x2a3a6a];
const TOPS = [0x2c3c6e, 0x5a2a3a, 0x3a5a4a, 0x8a6a3a, 0x2a2c31, 0xb8b0a0, 0x6a3a8a, 0x3a6a8a, 0xc23b2b, 0x4a4e56, 0xe0b53a];
const BOTS = [0x1f2128, 0x2a2c33, 0x3a3d48, 0x4a3a2a, 0x23304a, 0x55595e];
function randomLook(o) {
  const outfit = pick(['coat', 'coat', 'hoodie', 'suit', 'jacket', 'jacket', 'scrubs', 'uniform']);
  return Object.assign({ skin: pick(SKIN), hair: pick(HAIR), hairStyle: pick(['short', 'bob', 'long', 'bun', 'cap', 'buzz', 'side']), top: pick(TOPS), bottom: pick(BOTS), outfit, h: rand(0.94, 1.06), led: outfit === 'hoodie' || Math.random() < 0.15 ? pick([0x33e4ff, 0xff3d9a, 0x8b5cff, 0x5dff9a]) : 0, glasses: Math.random() < 0.18, umbrella: Math.random() < 0.75, umbCol: Math.random() < 0.7 ? -1 : pick([0xc2362b, 0x2c3c6e, 0x2a2c31, 0xe0b53a]), bag: Math.random() < 0.3, phones: Math.random() < 0.15, visor: Math.random() < 0.06 }, o || {});
}
function makePerson(look) {
  look = look || randomLook(); const mat = personMat(); const h = look.h || 1;
  const root = new THREE.Group(); const P2 = {};
  const mk = (fn) => { const c = new Chunk('p', 'street', { jit: 0.02 }); fn(c); const g = c.raw(); return new THREE.Mesh(g, mat); };
  const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const top = look.top, bot = look.bottom, skin = look.skin, coatLong = look.outfit === 'coat' || look.outfit === 'scrubs';
  P2.hips = grp(root, 0, 0.9, 0);
  P2.hips.add(mk(c => { c.box(0.34, 0.16, 0.2, bot, 0, 0, 0); if (coatLong) c.box(0.38, 0.32, 0.24, top, 0, -0.1, 0); if (look.outfit === 'apron') c.box(0.36, 0.5, 0.02, look.apron || C.indigo, 0, -0.12, 0.12); }));
  P2.spine = grp(P2.hips, 0, 0.08, 0);
  P2.chest = grp(P2.spine, 0, 0.0, 0);
  P2.chest.add(mk(c => {
    c.box(0.38, 0.5, 0.22, top, 0, 0.27, 0); c.box(0.4, 0.12, 0.24, top, 0, 0.47, 0);
    if (look.outfit === 'suit') { c.box(0.1, 0.3, 0.01, 0xe8e4dc, 0, 0.32, 0.112); c.box(0.04, 0.24, 0.012, look.tie || 0x8a2a2a, 0, 0.3, 0.118); }
    if (look.outfit === 'hoodie') { c.box(0.3, 0.14, 0.18, top, 0, 0.56, -0.12); c.box(0.2, 0.12, 0.012, new THREE.Color(top).multiplyScalar(0.8).getHex(), 0, 0.12, 0.112); }
    if (look.outfit === 'scrubs') { c.box(0.2, 0.2, 0.01, 0x9fd0c8, 0, 0.3, 0.113); }
    if (look.outfit === 'uniform') { c.box(0.12, 0.06, 0.012, 0xc23b2b, 0, 0.42, 0.113); c.box(0.4, 0.04, 0.23, 0x1a1c22, 0, 0.05, 0); }
    if (look.apron) c.box(0.34, 0.42, 0.012, look.apron, 0, 0.2, 0.115);
    if (look.scarf) { c.box(0.3, 0.08, 0.26, look.scarf, 0, 0.52, 0); c.box(0.08, 0.2, 0.03, look.scarf, 0.08, 0.4, 0.13); }
    if (look.bag) { c.box(0.3, 0.24, 0.08, look.bagCol || 0x3a2a20, 0.18, 0.05, 0.1, 0, 0.3, 0); c.bar([-0.16, 0.5, 0.11], [0.2, 0.15, 0.13], 0.03, 0x2a2420); }
    if (look.backpack) c.box(0.32, 0.38, 0.18, look.backpack, 0, 0.28, -0.2);
  }));
  if (look.led) { const em = new THREE.Mesh(mk2(c => { c.box(0.012, 0.42, 0.012, look.led, -0.15, 0.28, 0.115); c.box(0.012, 0.42, 0.012, look.led, 0.15, 0.28, 0.115); c.box(0.3, 0.012, 0.012, look.led, 0, 0.06, 0.115); }), new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2, 2, 2) })); P2.chest.add(em); }
  P2.neck = grp(P2.chest, 0, 0.55, 0);
  P2.head = grp(P2.neck, 0, 0.07, 0);
  P2.head.add(mk(c => {
    c.box(0.1, 0.08, 0.1, skin, 0, -0.04, 0); c.box(0.22, 0.25, 0.22, skin, 0, 0.12, 0); c.box(0.2, 0.04, 0.18, skin, 0, 0.0, 0.01); // head + jaw
    c.box(0.04, 0.05, 0.03, new THREE.Color(skin).multiplyScalar(0.92).getHex(), 0, 0.1, 0.115); // nose
    c.box(0.03, 0.06, 0.06, skin, -0.115, 0.1, 0); c.box(0.03, 0.06, 0.06, skin, 0.115, 0.1, 0); // ears
    c.box(0.06, 0.012, 0.01, 0x7a3a34, 0, 0.035, 0.112); // mouth
    c.box(0.05, 0.012, 0.01, look.hair, -0.05, 0.19, 0.112, 0, 0, 0.1); c.box(0.05, 0.012, 0.01, look.hair, 0.05, 0.19, 0.112, 0, 0, -0.1); // brows
    if (look.blush) { c.box(0.035, 0.02, 0.006, 0xe08a8a, -0.07, 0.08, 0.111); c.box(0.035, 0.02, 0.006, 0xe08a8a, 0.07, 0.08, 0.111); }
    const hc = look.hair, st = look.hairStyle;
    if (st !== 'buzz') c.box(0.24, 0.08, 0.24, hc, 0, 0.26, -0.005); else c.box(0.23, 0.03, 0.23, hc, 0, 0.245, 0);
    if (st === 'short' || st === 'side' || st === 'cap') { c.box(0.24, 0.12, 0.06, hc, 0, 0.19, -0.1); c.box(0.03, 0.12, 0.2, hc, -0.115, 0.18, -0.01); c.box(0.03, 0.12, 0.2, hc, 0.115, 0.18, -0.01); c.box(0.22, 0.05, 0.04, hc, st === 'side' ? 0.03 : 0, 0.23, 0.1, 0, 0, st === 'side' ? -0.25 : 0); }
    if (st === 'bob' || st === 'long') { c.box(0.26, st === 'long' ? 0.42 : 0.24, 0.1, hc, 0, st === 'long' ? 0.06 : 0.14, -0.08); c.box(0.04, st === 'long' ? 0.36 : 0.22, 0.2, hc, -0.125, st === 'long' ? 0.08 : 0.15, 0.0); c.box(0.04, st === 'long' ? 0.36 : 0.22, 0.2, hc, 0.125, st === 'long' ? 0.08 : 0.15, 0.0); c.box(0.22, 0.06, 0.04, hc, 0, 0.23, 0.1); }
    if (st === 'bun') { c.box(0.24, 0.16, 0.06, hc, 0, 0.18, -0.1); c.ball(0.07, hc, 0, 0.29, -0.13, 0); c.box(0.22, 0.05, 0.04, hc, 0, 0.23, 0.1); c.box(0.03, 0.12, 0.2, hc, -0.115, 0.18, -0.01); c.box(0.03, 0.12, 0.2, hc, 0.115, 0.18, -0.01); }
    if (st === 'cap') { c.box(0.25, 0.08, 0.25, look.capCol || 0x2a2c31, 0, 0.28, 0); c.box(0.2, 0.02, 0.12, look.capCol || 0x2a2c31, 0, 0.245, 0.15); }
    if (look.hachimaki) { c.box(0.25, 0.04, 0.25, 0xf0ece0, 0, 0.21, 0); c.box(0.06, 0.08, 0.02, 0xf0ece0, 0.04, 0.2, -0.13, 0, 0, 0.6); }
    if (look.helmet) { c.box(0.27, 0.12, 0.27, look.helmet, 0, 0.29, 0); c.box(0.25, 0.04, 0.05, 0x1a1c22, 0, 0.23, 0.12); }
    if (look.glasses) { c.box(0.07, 0.04, 0.01, 0x1a1a1a, -0.05, 0.14, 0.118); c.box(0.07, 0.04, 0.01, 0x1a1a1a, 0.05, 0.14, 0.118); c.box(0.03, 0.01, 0.01, 0x1a1a1a, 0, 0.145, 0.118); }
    if (look.phones) { c.box(0.26, 0.03, 0.04, 0x1a1c22, 0, 0.27, 0); c.box(0.04, 0.08, 0.08, 0x1a1c22, -0.13, 0.12, 0); c.box(0.04, 0.08, 0.08, 0x1a1c22, 0.13, 0.12, 0); }
    if (look.plantClips) { c.box(0.04, 0.03, 0.02, 0x8fd16a, -0.09, 0.26, 0.08); c.box(0.04, 0.03, 0.02, 0xff7aa8, 0.08, 0.27, 0.06); }
  }));
  // eyes (separate for blinking)
  P2.eyes = new THREE.Mesh(mk2(c => { c.box(0.035, 0.035, 0.012, 0x1a1414, -0.05, 0, 0); c.box(0.035, 0.035, 0.012, 0x1a1414, 0.05, 0, 0); c.box(0.012, 0.012, 0.004, 0xffffff, -0.045, 0.007, 0.007); c.box(0.012, 0.012, 0.004, 0xffffff, 0.055, 0.007, 0.007); }), new THREE.MeshBasicMaterial({ vertexColors: true }));
  P2.eyes.position.set(0, 0.14, 0.111); P2.head.add(P2.eyes);
  if (look.visor) { const v = new THREE.Mesh(mk2(c => c.box(0.24, 0.05, 0.02, look.visor === true ? 0x33e4ff : look.visor, 0, 0, 0)), new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.4, 2.4, 2.4) })); v.position.set(0, 0.14, 0.12); P2.head.add(v); }
  // arms
  for (const s of [-1, 1]) {
    const sh = grp(P2.chest, s * 0.24, 0.45, 0); const up = mk(c => { c.box(0.1, 0.3, 0.11, top, 0, -0.14, 0); }); sh.add(up);
    const el = grp(sh, 0, -0.29, 0); el.add(mk(c => { c.box(0.09, 0.27, 0.1, top, 0, -0.12, 0); c.box(0.095, 0.04, 0.105, new THREE.Color(top).multiplyScalar(0.8).getHex(), 0, -0.24, 0); }));
    const hd = grp(el, 0, -0.27, 0); hd.add(mk(c => { c.box(0.08, 0.1, 0.05, skin, 0, -0.04, 0.0); c.box(0.03, 0.05, 0.03, skin, -s * 0.04, -0.02, 0.03); }));
    if (s < 0) { P2.shL = sh; P2.elL = el; P2.hdL = hd; } else { P2.shR = sh; P2.elR = el; P2.hdR = hd; }
    if (look.armGlow && s < 0) { const ag = new THREE.Mesh(mk2(c => { c.box(0.02, 0.24, 0.02, 0xff8a3a, 0, -0.12, 0.055); }), new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.5, 2.5, 2.5) })); el.add(ag); el.children[0].material = mat; }
  }
  // legs
  for (const s of [-1, 1]) {
    const hp = grp(P2.hips, s * 0.1, -0.06, 0); hp.add(mk(c => { c.box(0.14, 0.42, 0.15, bot, 0, -0.2, 0); if (coatLong) c.box(0.16, 0.3, 0.17, top, 0, -0.1, 0); }));
    const kn = grp(hp, 0, -0.42, 0); kn.add(mk(c => { c.box(0.12, 0.4, 0.13, bot, 0, -0.19, 0); c.box(0.13, 0.08, 0.24, look.shoe || (look.boots ? 0x2a3a2a : 0x1a1a1c), 0, -0.38, 0.04); if (look.boots) c.box(0.135, 0.2, 0.14, 0x2a3a2a, 0, -0.3, 0); }));
    if (s < 0) { P2.hpL = hp; P2.knL = kn; } else { P2.hpR = hp; P2.knR = kn; }
  }
  root.scale.setScalar(h);
  // umbrella (clear vinyl) in the left hand
  let umb = null; if (look.umbrella) { umb = makeUmbrella(look.umbCol); umb.visible = false; P2.hdL.add(umb); umb.position.set(0, -0.06, 0.02); }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  const p = { root, P: P2, mat, look, umb, t: Math.random() * 10, blinkT: rand(1, 4), pose: 'idle', poseK: 0, held: null, speed: 0, lookAt: null, headYaw: 0, headPitch: 0 };
  return p;
}
function mk2(fn) { const c = new Chunk('p', 'street', { jit: 0.0 }); fn(c); return c.raw(); }
const UMB_MAT = new THREE.MeshStandardMaterial({ color: 0xdfeef6, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
function makeUmbrella(col, fp) {
  const g = new THREE.Group(); const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.28, 8, 1, true), col >= 0 ? new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide }) : UMB_MAT); canopy.position.y = 0.86; g.add(canopy);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.92, 5), new THREE.MeshLambertMaterial({ color: 0xc8ccd0 })); shaft.position.y = 0.46; g.add(shaft);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 4, 8, Math.PI), new THREE.MeshLambertMaterial({ color: 0x2a2c31 })); hd.rotation.z = Math.PI; hd.position.set(0.04, 0.0, 0); g.add(hd);
  if (!fp) for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.56), new THREE.MeshLambertMaterial({ color: 0x9aa0a6 })); const a = i / 8 * Math.PI * 2; r.position.set(Math.cos(a) * 0.27, 0.86, Math.sin(a) * 0.27); r.lookAt(new THREE.Vector3(Math.cos(a) * 0.6, 0.72, Math.sin(a) * 0.6).add(new THREE.Vector3(0, 0, 0))); g.add(r); }
  if (fp) { canopy.material = new THREE.MeshStandardMaterial({ color: 0xcfe0ea, transparent: true, opacity: 0.13, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }); canopy.scale.set(1.1, 0.8, 1.1); g.children.forEach(ch => { if (ch !== canopy) ch.visible = false; }); }
  g.userData.canopy = canopy; return g;
}
// ---------- held items ----------
function cupObj(rid, kind) {
  const r = RECIPES[rid]; const g = new THREE.Group(); const iced = r && r.st === 'shaker';
  const c = new Chunk('cup', 'street', { jit: 0.0 });
  if (rid >= 0 && r.st === 'matcha') { c.cyl(0.075, 0.055, 0.07, 10, 0x3a2a24, 0, 0.035, 0); c.cyl(0.068, 0.068, 0.006, 10, r.liq, 0, 0.066, 0); }
  else if (iced) { c.cyl(0.045, 0.038, 0.13, 10, 0xd8e8ee, 0, 0.065, 0); c.cyl(0.04, 0.04, 0.09, 10, r.liq, 0, 0.055, 0); c.cyl(0.047, 0.047, 0.012, 10, 0xeef4f6, 0, 0.13, 0); c.cyl(0.006, 0.006, 0.08, 4, 0x2a2c31, 0.015, 0.17, 0); }
  else { c.cyl(0.04, 0.034, 0.08, 10, kind === 'celadon' ? C.celadon : C.ceramic, 0, 0.04, 0); c.cyl(0.035, 0.035, 0.005, 10, rid >= 0 ? r.liq : 0x7fae5a, 0, 0.074, 0); }
  const m = new THREE.Mesh(c.raw(), personMat()); g.add(m); g.userData.mat = m.material; return g;
}
function trayObj(n, rid) {
  const g = new THREE.Group(); const c = new Chunk('tray', 'street', { jit: 0.0 }); c.box(0.42, 0.02, 0.3, 0x3a1e16, 0, 0, 0); c.box(0.42, 0.03, 0.012, 0x2a1610, 0, 0.02, 0.145); c.box(0.42, 0.03, 0.012, 0x2a1610, 0, 0.02, -0.145); c.box(0.012, 0.03, 0.3, 0x2a1610, 0.21, 0.02, 0); c.box(0.012, 0.03, 0.3, 0x2a1610, -0.21, 0.02, 0);
  const tm = new THREE.Mesh(c.raw(), personMat()); g.add(tm); g.userData.mat = tm.material; g.userData.cups = [];
  for (let i = 0; i < n; i++) { const cp = cupObj(rid); cp.position.set(-0.14 + (i % 3) * 0.14, 0.012, i < 3 ? -0.06 : 0.07); g.add(cp); g.userData.cups.push(cp); }
  return g;
}
function crateObj(id) { const g = new THREE.Group(); const c = new Chunk('crate', 'street', { jit: 0.03 }); P.crate(c, 0, 0, 0, 0); c.box(0.5, 0.06, 0.06, 0x8a6a3a, 0, 0.3, 0.205); const m = new THREE.Mesh(c.raw(), personMat()); g.add(m); g.userData.mat = m.material;
  const tex = panelTex(128, 64, (x, w, h) => { x.fillStyle = '#efe4cc'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a2118'; x.font = `20px ${FONT_SIGN}`; x.textAlign = 'center'; x.fillText('KUMO', w / 2, 26); x.font = `13px ${FONT_UI}`; x.fillText(id === 'trash' ? '' : (UID[id] ? UID[id].name.slice(0, 18) : id), w / 2, 48); });
  const lb = printedMesh(tex, 0.24, 0.12, true); lb.position.set(0.05, 0.25, 0.202); g.add(lb); return g; }
function trashObj() { const g = new THREE.Group(); const c = new Chunk('trash', 'street', { jit: 0.05 }); P.trashBag(c, 0, 0, 0, 0.85); const m = new THREE.Mesh(c.raw(), personMat()); g.add(m); g.userData.mat = m.material; return g; }

/* ---------- animation ---------- */
function animPerson(p, dt, moving, pose) {
  p.t += dt; const P2 = p.P; const t = p.t;
  const target = pose || (moving ? 'walk' : 'idle'); p.pose = target;
  const sp = 7.2;
  let hipY = 0.9, lean = 0, aL = 0, aR = 0, eL = 0, eR = 0, lL = 0, lR = 0, kL = 0, kR = 0, sideL = 0, sideR = 0, head = 0, neck = 0;
  if (target === 'walk') { const s = Math.sin(t * sp); lL = s * 0.5; lR = -s * 0.5; kL = Math.max(0, -Math.cos(t * sp)) * 0.7; kR = Math.max(0, Math.cos(t * sp)) * 0.7; aL = -s * 0.4; aR = s * 0.4; eL = eR = -0.25; hipY = 0.9 + Math.abs(Math.cos(t * sp)) * 0.025; lean = 0.05; }
  else if (target === 'idle') { const b = Math.sin(t * 1.6) * 0.012; hipY = 0.9 + b * 0.3; aL = 0.05; aR = 0.05; eL = eR = -0.12; neck = b; }
  else if (target === 'sit') { hipY = 0.78; lL = lR = -1.45; kL = kR = 1.45; aL = aR = -0.55; eL = eR = -0.9; lean = 0.08; }
  else if (target === 'sitDrink') { hipY = 0.78; lL = lR = -1.45; kL = kR = 1.45; const d = (Math.sin(t * 0.8) > 0.6) ? 1 : 0; aL = -0.55; eL = -0.9; aR = -0.9 - d * 0.5; eR = -1.6 - d * 0.4; lean = 0.08; head = -d * 0.15; }
  else if (target === 'kneel') { hipY = 0.42; lL = lR = -0.25; kL = kR = 2.6; aL = aR = -0.35; eL = eR = -0.8; }
  else if (target === 'kneelDrink') { hipY = 0.42; lL = lR = -0.25; kL = kR = 2.6; const d = (Math.sin(t * 0.7) > 0.5) ? 1 : 0; aL = -0.8 - d * 0.5; eL = -1.4 - d * 0.4; aR = -0.8 - d * 0.5; eR = -1.4 - d * 0.4; head = -d * 0.2; }
  else if (target === 'work') { const s = Math.sin(t * 9); aR = -1.2 + s * 0.4; eR = -0.9 + s * 0.3; aL = -0.7; eL = -0.9; lean = 0.25; hipY = 0.86; }
  else if (target === 'crouch') { hipY = 0.5; lL = lR = -1.3; kL = kR = 2.0; aL = aR = -0.6; eL = eR = -0.6; lean = 0.35; const s = Math.sin(t * 7); aR += s * 0.2; }
  else if (target === 'carry') { const s = Math.sin(t * sp); lL = s * 0.4 * (moving ? 1 : 0); lR = -lL; kL = Math.max(0, -Math.cos(t * sp)) * 0.5 * (moving ? 1 : 0); kR = Math.max(0, Math.cos(t * sp)) * 0.5 * (moving ? 1 : 0); aL = aR = -0.8; eL = eR = -0.7; }
  else if (target === 'talk') { const s = Math.sin(t * 2.3); aR = -0.4 + s * 0.25; eR = -1.1 + Math.sin(t * 3.1) * 0.25; aL = 0.05; eL = -0.15; neck = Math.sin(t * 1.7) * 0.05; }
  else if (target === 'bow') { lean = 0.55; aL = aR = 0.15; }
  else if (target === 'wave') { aR = -2.6; eR = -0.3 + Math.sin(t * 9) * 0.35; sideR = -0.3; }
  else if (target === 'umbrella') { const s = Math.sin(t * sp); if (moving) { lL = s * 0.5; lR = -s * 0.5; kL = Math.max(0, -Math.cos(t * sp)) * 0.7; kR = Math.max(0, Math.cos(t * sp)) * 0.7; aR = s * 0.4; hipY = 0.9 + Math.abs(Math.cos(t * sp)) * 0.025; } aL = -1.0; eL = -1.0; sideL = 0.15; eR = -0.25; }
  else if (target === 'phone') { aL = -0.9; eL = -1.6; aR = 0.05; eR = -0.2; head = 0.35; }
  else if (target === 'sweep') { const s = Math.sin(t * 3.2); aR = -0.55 + s * 0.12; eR = -0.35; aL = -0.75 + s * 0.12; eL = -0.55; lean = 0.18; sideR = s * 0.12; sideL = -s * 0.1; hipY = 0.88; head = 0.25; }
  else if (target === 'hold') { const b = Math.sin(t * 1.3) * 0.03; aL = aR = -0.95 + b; eL = eR = -0.55; lean = 0.12; hipY = 0.88; head = 0.2; }
  else if (target === 'reach') { const s = Math.sin(t * 2.4); aL = -2.55 + s * 0.08; aR = -2.6 - s * 0.08; eL = eR = -0.25; head = -0.35; hipY = 0.92; }
  else if (target === 'tool') { const s = Math.sin(t * 11); aR = -1.25 + s * 0.06; eR = -1.0 + s * 0.08; aL = -0.85; eL = -0.9; lean = 0.08; head = 0.15; }
  else if (target === 'kneelWork') { hipY = 0.42; lL = lR = -0.25; kL = kR = 2.6; const s = Math.sin(t * 6); aR = -1.0 + s * 0.2; eR = -0.6; aL = -0.7; eL = -0.5; lean = 0.3; head = 0.35; }
  const k = 1 - Math.exp(-dt * 12);
  const L = (o, ax, v) => { o.rotation[ax] = lerp(o.rotation[ax], v, k); };
  P2.hips.position.y = lerp(P2.hips.position.y, hipY, k); L(P2.spine, 'x', lean); L(P2.shL, 'x', aL); L(P2.shR, 'x', aR); L(P2.elL, 'x', eL); L(P2.elR, 'x', eR); L(P2.shL, 'z', -0.06 - sideL); L(P2.shR, 'z', 0.06 + sideR);
  L(P2.hpL, 'x', lL); L(P2.hpR, 'x', lR); L(P2.knL, 'x', kL); L(P2.knR, 'x', kR); L(P2.neck, 'x', neck + head);
  // head looks at target
  if (p.lookAt) { const wp = new THREE.Vector3(); p.root.getWorldPosition(wp); const dx = p.lookAt.x - wp.x, dz = p.lookAt.z - wp.z, dy = p.lookAt.y - (wp.y + 1.6 * p.look.h); let yaw = Math.atan2(dx, dz) - p.root.rotation.y; yaw = mod(yaw + Math.PI, Math.PI * 2) - Math.PI; yaw = clamp(yaw, -1.1, 1.1); const pit = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.5, 0.5); p.headYaw = lerp(p.headYaw, yaw, k * 0.6); p.headPitch = lerp(p.headPitch, pit, k * 0.6); }
  else { p.headYaw = lerp(p.headYaw, 0, k * 0.4); p.headPitch = lerp(p.headPitch, 0, k * 0.4); }
  P2.head.rotation.y = p.headYaw; P2.head.rotation.x = p.headPitch;
  // blink
  p.blinkT -= dt; if (p.blinkT < 0) { p.blinkT = rand(2, 5); } P2.eyes.scale.y = p.blinkT < 0.12 ? 0.15 : 1;
  if (p.umb) p.umb.visible = target === 'umbrella';
}
function updateProbe(p, pos) { const z = zoneAt(pos); probeAt(pos, z, p.mat.userData.probe.value); p.mat.userData.probe.value.multiplyScalar(0.85); }

/* ================= first-person hands ================= */
const HANDS = { g: new THREE.Group(), L: null, R: null, pose: 'idle', item: null, itemKind: null, sway: new THREE.Vector2(), bob: 0, phone: null, umb: null, tool: null, dip: 0 };
hudScene.add(HANDS.g);
const HAND_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
function buildHands() {
  const mkHand = s => {
    const g = new THREE.Group(); const c = new Chunk('hand', 'street', { jit: 0.0 });
    // sleeve (mustard raincoat) + reflective strip
    c.box(0.11, 0.1, 0.34, 0xd6a03f, 0, 0, 0.12); c.box(0.115, 0.105, 0.035, 0xc8d0d4, 0, 0, 0.0); c.box(0.115, 0.012, 0.3, 0xb8862f, 0, -0.05, 0.12);
    // hand: palm, fingers, thumb
    c.box(0.085, 0.032, 0.1, 0xe3b08a, 0, 0, -0.07); for (let i = 0; i < 4; i++) c.box(0.018, 0.022, 0.07, 0xe3b08a, -0.03 + i * 0.02, 0.0, -0.15, 0.08 * i, 0, 0);
    c.box(0.022, 0.024, 0.06, 0xe3b08a, s * 0.05, 0.005, -0.06, 0, s * 0.6, 0);
    const m = new THREE.Mesh(c.raw(), HAND_MAT); g.add(m); return g;
  };
  HANDS.L = mkHand(-1); HANDS.R = mkHand(1); HANDS.g.add(HANDS.L, HANDS.R); hudCam.add(HANDS.g);
  HANDS.umb = makeUmbrella(-1, true); HANDS.L.add(HANDS.umb); HANDS.umb.position.set(0.06, 0.0, -0.1); HANDS.umb.rotation.set(-0.12, 0, 0.16); HANDS.umb.visible = false;
  // phone
  const pc = new Chunk('phone', 'street', { jit: 0 }); pc.box(0.075, 0.15, 0.008, 0x0b0d14, 0, 0, 0); pc.box(0.068, 0.138, 0.002, 0x0a2a3a, 0, 0, 0.005);
  HANDS.phone = new THREE.Mesh(pc.raw(), new THREE.MeshBasicMaterial({ vertexColors: true })); HANDS.phone.position.set(0.0, 0.05, -0.12); HANDS.phone.rotation.x = -0.4; HANDS.phone.visible = false; HANDS.L.add(HANDS.phone);
}
// set what the hands hold: null | {kind:'tray', n, rid} | {kind:'crate', id} | {kind:'trash'} | {kind:'tool', tool}
function setHandItem(it) {
  if (HANDS.item) { HANDS.g.remove(HANDS.item); HANDS.item = null; }
  HANDS.itemKind = it ? it.kind : null; if (!it) return;
  let o = null;
  if (it.kind === 'tray') { o = trayObj(it.n, it.rid); o.position.set(0, -0.3, -0.55); o.rotation.x = 0.25; }
  else if (it.kind === 'cup') { o = cupObj(it.rid); o.scale.setScalar(1.3); o.position.set(0.16, -0.22, -0.42); }
  else if (it.kind === 'crate') { o = crateObj(it.id); o.position.set(0, -0.42, -0.7); o.rotation.y = 0.08; }
  else if (it.kind === 'trash') { o = trashObj(); o.position.set(0.12, -0.55, -0.6); }
  else if (it.kind === 'planks') { o = new THREE.Group(); const c = new Chunk('pl', 'street'); for (let i = 0; i < 3; i++) c.box(1.4, 0.04, 0.2, C.cedarL, 0, i * 0.045, 0); const m = new THREE.Mesh(c.raw(), personMat()); o.add(m); o.userData.mat = m.material; o.position.set(0.1, -0.35, -0.7); o.rotation.y = 1.3; }
  else if (it.kind === 'kettle') { o = new THREE.Group(); const c = new Chunk('k', 'street'); c.cyl(0.08, 0.1, 0.14, 10, C.iron, 0, 0, 0); c.cyl(0.05, 0.05, 0.03, 10, C.iron, 0, 0.08, 0); const m = new THREE.Mesh(c.raw(), personMat()); o.add(m); o.userData.mat = m.material; o.position.set(0.2, -0.3, -0.5); }
  if (o) { o.userData.bx = o.position.x; o.userData.by = o.position.y; o.position.y -= 0.4; HANDS.g.add(o); HANDS.item = o; }
}

