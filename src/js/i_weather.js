/* ================= weather: rain, wet reflections, lightning ================= */
let forceWeather = null;
const WX = { rain: 0.4, target: 0.4, storm: false, flash: 0, strikeT: 8, name: 'Drizzle', mm: 1.2, i: 0, lens: 0, wet: 0.85 };
// sheltering surfaces: [x0,x1,z0,z1,y]
const SHELTER = [];
function initShelter() {
  SHELTER.length = 0;
  SHELTER.push([BLD.x0, BLD.x1, BLD.z0, 0, 10.1], [-2.85, 2.85, 0, 0.72, 3.45], [-2.7, 2.7, 0, 1.25, 3.5], [-8.6, -2.7, 0, 0.95, 3.3], [4.6, 13, 0, 1.1, 2.9], [-6.4, -4.0, 1.0, 13.9, 3.55], [-60, 60, 11.2, 15.6, 9.7], [4.6, 13, -10, 0, 10.5], [-8.5, -2.7, -8, 0, 7.2], [-60, -8.5, -20, 0, 14], [13, 60, -20, 0, 14], [-60, 60, 14.5, 30, 16]);
}
function roofAt(x, z) { let y = 0; for (const s of SHELTER) if (x > s[0] && x < s[1] && z > s[2] && z < s[3] && s[4] > y) y = s[4]; return y; }
function surfaceAt(x, z, below) { let y = 0; for (const s of SHELTER) if (x > s[0] && x < s[1] && z > s[2] && z < s[3] && s[4] > y && s[4] < below) y = s[4]; if (y === 0) { if (z > 0 && z < 2.4 || z > 11.6 && z < 14.2) y = 0.12; } return y; }
function sheltered(p) { return roofAt(p.x, p.z) > p.y + 1.7; }
let RAIN_N = Q.rain; const RIP = { mesh: null, zero: new THREE.Matrix4().makeScale(0, 0, 0), m: new THREE.Matrix4(), c: new THREE.Color() };
let rainGeo, rainPos, rainCol, rainSt, rainLines, splPos, splVel, splLife, splGeo, splPts, ripples = [];
const SPL_N = 700;
function initRain() {
  RAIN_N = Q.rain; rainPos = new Float32Array(RAIN_N * 6); rainCol = new Float32Array(RAIN_N * 8); rainSt = new Float32Array(RAIN_N * 4);
  rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3).setUsage(THREE.DynamicDrawUsage)); rainGeo.setAttribute('color', new THREE.BufferAttribute(rainCol, 4).setUsage(THREE.DynamicDrawUsage));
  rainLines = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: true })); rainLines.frustumCulled = false; rainLines.renderOrder = 3; scene.add(rainLines);
  for (let i = 0; i < RAIN_N; i++) resetDrop(i, false);
  splPos = new Float32Array(SPL_N * 3); splVel = new Float32Array(SPL_N * 3); splLife = new Float32Array(SPL_N); for (let i = 0; i < SPL_N; i++) splPos[i * 3 + 1] = -99;
  splGeo = new THREE.BufferGeometry(); splGeo.setAttribute('position', new THREE.BufferAttribute(splPos, 3).setUsage(THREE.DynamicDrawUsage));
  splPts = new THREE.Points(splGeo, new THREE.PointsMaterial({ size: 0.035, map: DOT_TEX, transparent: true, depthWrite: false, color: 0xcfe2f0, opacity: 0.7 })); splPts.frustumCulled = false; scene.add(splPts);
  const ringGeo = new THREE.RingGeometry(0.85, 0.92, 18); ringGeo.rotateX(-Math.PI / 2);
  RIP.mesh = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }), 60); RIP.mesh.frustumCulled = false; scene.add(RIP.mesh);
  for (let i = 0; i < 60; i++) { ripples.push({ i, t: 0, life: 0.6, big: 1, on: false, p: new THREE.Vector3() }); RIP.mesh.setMatrixAt(i, RIP.zero); RIP.mesh.setColorAt(i, new THREE.Color(0, 0, 0)); }
}
const _cp = new THREE.Vector3();
function resetDrop(i, top) { const o = i * 4; const a = Math.random() * Math.PI * 2, r = 1.2 + Math.sqrt(Math.random()) * 10.6; rainSt[o] = _cp.x + Math.cos(a) * r; rainSt[o + 2] = _cp.z + Math.sin(a) * r; rainSt[o + 1] = _cp.y + (top ? rand(8, 14) : rand(-4, 14)); const rf = roofAt(rainSt[o], rainSt[o + 2]); if (rf > 0 && rainSt[o + 1] < rf) rainSt[o + 1] = rf + rand(0.2, 6); rainSt[o + 3] = rand(11, 15); }
let splHead = 0;
function spawnSplash(x, y, z, n) { for (let k = 0; k < n; k++) { const i = splHead; splHead = (splHead + 1) % SPL_N; splPos[i * 3] = x; splPos[i * 3 + 1] = y + 0.01; splPos[i * 3 + 2] = z; const a = Math.random() * 6.28, sp = rand(0.3, 0.9); splVel[i * 3] = Math.cos(a) * sp; splVel[i * 3 + 1] = rand(0.9, 1.9); splVel[i * 3 + 2] = Math.sin(a) * sp; splLife[i] = rand(0.15, 0.3); } }
function spawnRipple(x, y, z, big) { const r = ripples.find(q => !q.on); if (!r) return; r.p.set(x, y + 0.006, z); r.t = 0; r.life = rand(0.45, 0.8); r.big = big || 1; r.on = true; }
function inPuddle(x, z) { for (const p of CITY.puddles) { const qx = (x - p[0]) / p[3], qz = (z - p[2]) / p[4]; if (qx * qx + qz * qz < 0.6) return p; } return null; }
// light at a rain drop: nearest anchors (cheap version)
const _rc = [0, 0, 0]; let RAIN_LIGHTS = [];
function refreshRainLights() { RAIN_LIGHTS = ANCHORS.filter(a => (a.z.includes('street') || a.z.includes('alley')) && Math.abs(a.p[0] - _cp.x) < 18 && Math.abs(a.p[2] - _cp.z) < 18 && a.i > 0.5); }
function rainLight(x, y, z) { let r = 0.035, g = 0.042, b = 0.065; for (const a of RAIN_LIGHTS) { const dx = a.p[0] - x, dy = a.p[1] - y, dz = a.p[2] - z; const d2 = dx * dx + dy * dy * 0.6 + dz * dz; const rr = a.r * 0.7; if (d2 > rr * rr) continue; const k = (1 - Math.sqrt(d2) / rr); const kk = k * k * a.i * 0.7; r += a.c.r * kk; g += a.c.g * kk; b += a.c.b * kk; } _rc[0] = r; _rc[1] = g; _rc[2] = b; }
let rainLightT = 0;
function updateRain(dt) {
  _cp.copy(camera.position); const amt = WX.rain, active = Math.floor(RAIN_N * clamp(amt, 0.05, 1)); const wind = 0.4 + Math.sin(time * 0.3) * 0.4 + amt * 0.6;
  rainLightT -= dt; if (rainLightT < 0) { rainLightT = 0.5; refreshRainLights(); }
  const inside = playerIndoors();
  for (let i = 0; i < RAIN_N; i++) {
    const o = i * 4, p = i * 6, c = i * 8;
    if (i >= active) { rainCol[c + 3] = 0; rainCol[c + 7] = 0; continue; }
    let x = rainSt[o], y = rainSt[o + 1], z = rainSt[o + 2]; const v = rainSt[o + 3];
    y -= v * dt; x += wind * dt;
    const dx = x - _cp.x, dz = z - _cp.z; if (dx * dx + dz * dz > 12 * 12 || y < _cp.y - 6) { resetDrop(i, true); continue; }
    const gy = surfaceAt(x, z, y + 0.5);
    if (y < gy) { if (dx * dx + dz * dz < 64 && !inside) { if (Math.random() < 0.4) spawnSplash(x, gy, z, 2); if (gy < 0.2 && inPuddle(x, z) && Math.random() < 0.7) spawnRipple(x, gy, z, 1); } resetDrop(i, true); continue; }
    rainSt[o] = x; rainSt[o + 1] = y; rainSt[o + 2] = z;
    const len = 0.1 + v * 0.011, sl = wind / v;
    rainPos[p] = x; rainPos[p + 1] = y; rainPos[p + 2] = z; rainPos[p + 3] = x - sl * len; rainPos[p + 4] = y + len; rainPos[p + 5] = z;
    if ((i & 3) === (frameN & 3)) { rainLight(x, y, z); rainCol[c] = _rc[0]; rainCol[c + 1] = _rc[1]; rainCol[c + 2] = _rc[2]; rainCol[c + 4] = _rc[0]; rainCol[c + 5] = _rc[1]; rainCol[c + 6] = _rc[2]; }
    rainCol[c + 3] = (inside ? 0.22 : 0.4) + WX.flash * 0.3; rainCol[c + 7] = 0;
  }
  if (WX.flash > 0.05) for (let i = 0; i < active; i++) { const c = i * 8; rainCol[c] = Math.max(rainCol[c], WX.flash); rainCol[c + 1] = Math.max(rainCol[c + 1], WX.flash); rainCol[c + 2] = Math.max(rainCol[c + 2], WX.flash * 1.1); }
  rainGeo.attributes.position.needsUpdate = true; rainGeo.attributes.color.needsUpdate = true;
  for (let i = 0; i < SPL_N; i++) { if (splLife[i] <= 0) continue; splLife[i] -= dt; if (splLife[i] <= 0) { splPos[i * 3 + 1] = -99; continue; } splVel[i * 3 + 1] -= 9.8 * dt; splPos[i * 3] += splVel[i * 3] * dt; splPos[i * 3 + 1] += splVel[i * 3 + 1] * dt; splPos[i * 3 + 2] += splVel[i * 3 + 2] * dt; }
  splGeo.attributes.position.needsUpdate = true; splPts.material.opacity = 0.35 + 0.4 * amt;
  // ambient ripples in puddles near the camera
  if (!inside) { let n = 30 * amt * dt; while (n > 0) { if (Math.random() < n) { const p = pick(CITY.puddles); if (Math.abs(p[0] - _cp.x) < 16 && Math.abs(p[2] - _cp.z) < 16) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * 0.7; spawnRipple(p[0] + Math.cos(a) * p[3] * d, p[1], p[2] + Math.sin(a) * p[4] * d, rand(0.7, 1.3)); } } n -= 1; } }
  for (const r of ripples) { if (!r.on) continue; r.t += dt; const q = r.t / r.life; if (q >= 1) { r.on = false; RIP.mesh.setMatrixAt(r.i, RIP.zero); continue; } const sc = (0.03 + 0.17 * q) * r.big; RIP.m.makeScale(sc, sc, sc).setPosition(r.p); RIP.mesh.setMatrixAt(r.i, RIP.m); RIP.c.setRGB(0.2, 0.24, 0.32).multiplyScalar((1 - q) * (1 - q)); RIP.mesh.setColorAt(r.i, RIP.c); }
  RIP.mesh.instanceMatrix.needsUpdate = true; if (RIP.mesh.instanceColor) RIP.mesh.instanceColor.needsUpdate = true;
  updateDrips(dt, amt);
}
// eave drips (lines) from the building's eave, awnings, bridge
const DRIP_N = 260; let dripPos, dripSt, dripGeo, dripHead = 0;
function initDrips() { dripPos = new Float32Array(DRIP_N * 6); dripSt = new Float32Array(DRIP_N * 5); dripGeo = new THREE.BufferGeometry(); dripGeo.setAttribute('position', new THREE.BufferAttribute(dripPos, 3).setUsage(THREE.DynamicDrawUsage)); const l = new THREE.LineSegments(dripGeo, new THREE.LineBasicMaterial({ color: 0xbcd4ea, transparent: true, opacity: 0.6, depthWrite: false })); l.frustumCulled = false; scene.add(l); }
function emitDrip(x, y, z, v0) { const i = dripHead; dripHead = (dripHead + 1) % DRIP_N; const o = i * 5; dripSt[o] = x; dripSt[o + 1] = y; dripSt[o + 2] = z; dripSt[o + 3] = v0 || 0; dripSt[o + 4] = 1; }
const DRIP_EDGES = [];
function initDripEdges() { DRIP_EDGES.length = 0; DRIP_EDGES.push([-2.8, 2.8, 0.72, 3.3, 1], [-8.5, -2.7, 0.95, 3.2, 0.8], [4.6, 13, 1.1, 2.85, 0.6], [-2.7, 2.7, 1.25, 3.45, 0.7]); }
function updateDrips(dt, amt) {
  if (amt > 0.05 && Math.abs(camera.position.z) < 12) for (const e of DRIP_EDGES) { let m = (e[1] - e[0]) * 6 * amt * dt * e[4]; while (m > 0) { if (Math.random() < m) emitDrip(rand(e[0], e[1]), e[3], e[2] + rand(-0.02, 0.02)); m -= 1; } }
  if (lv('gutter') && amt > 0.05) { if (Math.random() < 26 * amt * dt) emitDrip(2.75 + rand(-0.03, 0.03), rand(0.3, 3.2), 0.75, 0.4); }
  for (let i = 0; i < DRIP_N; i++) {
    const o = i * 5, p = i * 6; if (!dripSt[o + 4]) { dripPos[p + 1] = -99; dripPos[p + 4] = -99; continue; }
    dripSt[o + 3] += 9.8 * dt; dripSt[o + 1] -= dripSt[o + 3] * dt; const gy = (dripSt[o + 2] > 0 && dripSt[o + 2] < 2.4) ? 0.12 : 0;
    if (dripSt[o + 1] < gy) { dripSt[o + 4] = 0; spawnSplash(dripSt[o], gy, dripSt[o + 2], 3); continue; }
    const len = Math.min(0.3, 0.05 + dripSt[o + 3] * 0.035); dripPos[p] = dripSt[o]; dripPos[p + 1] = dripSt[o + 1]; dripPos[p + 2] = dripSt[o + 2]; dripPos[p + 3] = dripSt[o]; dripPos[p + 4] = dripSt[o + 1] + len; dripPos[p + 5] = dripSt[o + 2];
  }
  dripGeo.attributes.position.needsUpdate = true;
}
/* ---------- window glass with running drops ---------- */
const DROPS_TEX = canvasTex(256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const px = Math.random() * w, py = Math.random() * h, r = rand(0.8, 2.6); const g = x.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(200,220,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); if (Math.random() < 0.2) { x.strokeStyle = 'rgba(220,235,255,.25)'; x.lineWidth = rand(0.6, 1.4); x.beginPath(); x.moveTo(px, py); x.lineTo(px + rand(-3, 3), py - rand(10, 50)); x.stroke(); } } }, { repeat: true });
const GLASS_MATS = [];
function glassPane(group, w, h, x, y, z, ry, tint) {
  const t = DROPS_TEX.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 1.2, h / 1.2);
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.5, 0.55, 0.65), side: THREE.DoubleSide, fog: true });
  const mesh = new THREE.Mesh(gPlaneIdx(), m); mesh.scale.set(w, h, 1); mesh.position.set(x, y, z); mesh.rotation.y = ry || 0; mesh.renderOrder = 4; group.add(mesh); GLASS_MATS.push({ m, t, sp: rand(0.02, 0.05) }); return mesh;
}
function updateGlass(dt) { for (const g of GLASS_MATS) { g.t.offset.y += g.sp * dt * (0.4 + WX.rain); { const k = playerIndoors() ? 0.35 : 1; g.m.color.setRGB((0.2 + 0.25 * WX.rain) * k, (0.24 + 0.25 * WX.rain) * k, (0.32 + 0.25 * WX.rain) * k); } } }
/* ---------- wet reflection pass ---------- */
function initReflection() { if (!Q.refl) { WET_U.uReflOn.value = 0; return; } const rt = d => new THREE.WebGLRenderTarget(Q.refl, Q.refl, { type: THREE.HalfFloatType, depthBuffer: d }); REFL.rt = rt(true); REFL.rb = rt(false); REFL.rs = rt(false); WET_U.tRefl.value = REFL.rt.texture; WET_U.tReflF.value = REFL.rb.texture; WET_U.tReflS.value = REFL.rs.texture; WET_U.uReflOn.value = 1; REFL.cam.layers.set(1); }
// vertical-only smear of the mirror (wet asphalt stretches lights into streaks toward the viewer), done at reflection resolution:
// a fine 8-tap box (its taps alternate half a texel sideways: a free [1 2 1] horizontal filter that hides the mirror's stair-stepped edges),
// then a coarse 8-tap tent, so the long streak is continuous instead of a ladder of ghost copies. Steps are in uv, so every tier smears alike.
const REFL_BLUR = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uStep: { value: 0 }, uTent: { value: 0 }, uX: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float uStep,uTent,uX; varying vec2 vUv; void main(){ vec3 c=vec3(0.0); float ws=0.0; for(int i=0;i<8;i++){ float o=float(i)-3.5; float w=1.0-uTent*abs(o)/4.5; c+=texture2D(tDiffuse,vUv+vec2(mod(float(i),2.0)<0.5?-uX:uX,o*uStep)).rgb*w; ws+=w; } gl_FragColor=vec4(c/ws,1.0); }',
});
const _rv = new THREE.Vector3(), _rt = new THREE.Vector3(), _rl = new THREE.Vector3(), _rm = new THREE.Matrix4(), _rn = new THREE.Vector3(0, 1, 0), _rcp = new THREE.Vector3();
// keep the wet-road reflection in step with the quality tier: auto-quality can drop to Low (no reflection pass) or climb back,
// and without this the last reflection stayed frozen on the road
function syncReflection() {
  if (!Q.refl) { WET_U.uReflOn.value = 0; return; }
  if (!REFL.rt) initReflection(); else if (REFL.rt.width !== Q.refl) for (const t of [REFL.rt, REFL.rb, REFL.rs]) t.setSize(Q.refl, Q.refl);
}
function renderReflection() {
  if (!REFL.rt) return; _rcp.setFromMatrixPosition(camera.matrixWorld); if (_rcp.y < 0.05 || (playerIndoors() && player.pos.y > 2)) { WET_U.uReflOn.value = 0; return; } WET_U.uReflOn.value = 1;
  const vc = REFL.cam; _rv.set(0, 0, 0).sub(_rcp); _rv.reflect(_rn).negate(); _rm.extractRotation(camera.matrixWorld); _rl.set(0, 0, -1).applyMatrix4(_rm).add(_rcp); _rt.set(0, 0, 0).sub(_rl); _rt.reflect(_rn).negate();
  vc.position.copy(_rv); vc.up.set(0, 1, 0).applyMatrix4(_rm).reflect(_rn); vc.lookAt(_rt); vc.far = camera.far; vc.updateMatrixWorld(); vc.projectionMatrix.copy(camera.projectionMatrix);
  REFL.mat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1); REFL.mat.multiply(vc.projectionMatrix); REFL.mat.multiply(vc.matrixWorldInverse);
  const fog = scene.fog, bg = scene.background; scene.fog = null; sky.visible = false; clouds.visible = false;
  renderer.setRenderTarget(REFL.rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, vc);
  const U = REFL_BLUR.uniforms; U.uStep.value = 1.5 / 512; U.uTent.value = 0; U.uX.value = 0.5 / Q.refl; REFL_BLUR.render(renderer, REFL.rb, REFL.rt); U.uStep.value = 14 / 512; U.uTent.value = 1; U.uX.value = 0; REFL_BLUR.render(renderer, REFL.rs, REFL.rb);
  renderer.setRenderTarget(null); renderer.setClearColor(0x05070f, 1);
  scene.fog = fog; sky.visible = true; clouds.visible = true;
  (REFL.cp || (REFL.cp = new THREE.Vector3())).copy(camera.position); (REFL.cq || (REFL.cq = new THREE.Quaternion())).copy(camera.quaternion);
}
/* ---------- lightning ---------- */
const BOLTS = [];
function makeBolt(from, to) {
  const pts = []; const n = 14; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector3(lerp(from.x, to.x, t) + (i && i < n ? rand(-1.2, 1.2) * (1 - t * 0.4) : 0), lerp(from.y, to.y, t), lerp(from.z, to.z, t) + (i && i < n ? rand(-1.2, 1.2) : 0))); }
  const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(4, 4.4, 6), transparent: true })); l.layers.enable(1); scene.add(l); BOLTS.push({ l, t: 0.35 });
}
function strike(near) {
  const x = near ? near.x : rand(-60, 60), z = near ? near.z : rand(-80, 80) + (Math.random() < 0.5 ? 60 : -60);
  makeBolt(new THREE.Vector3(x + rand(-8, 8), 70, z + rand(-6, 6)), new THREE.Vector3(x, near ? near.y : 20, z)); WX.flash = SET.noflash ? 0.25 : 1.0;
  const d = Math.hypot(x - camera.position.x, z - camera.position.z); if (typeof Snd !== 'undefined') Snd.thunder(Math.min(4, d / 340 * 3 + 0.2));
  if (typeof onStrike === 'function') onStrike(near);
}
function updateLightning(dt) {
  if (WX.storm) { WX.strikeT -= dt; if (WX.strikeT < 0) { WX.strikeT = rand(7, 16); strike(typeof strikeTarget === 'function' ? strikeTarget() : null); } }
  WX.flash = Math.max(0, WX.flash - dt * (SET.noflash ? 1.5 : 3.2));
  for (let i = BOLTS.length - 1; i >= 0; i--) { const b = BOLTS[i]; b.t -= dt; b.l.material.opacity = Math.max(0, b.t / 0.35) * (Math.random() < 0.7 ? 1 : 0.3); if (b.t <= 0) { scene.remove(b.l); b.l.geometry.dispose(); BOLTS.splice(i, 1); } }
}
function updateWeather(dt) {
  if (forceWeather) { WX.target = forceWeather.rain; WX.storm = !!forceWeather.storm; WX.name = forceWeather.name; WX.mm = forceWeather.mm; }
  else { S.wt += dt; const w = weatherAt(S.wt); WX.i = w.i; WX.target = w.w.rain; WX.storm = !!w.w.storm; WX.name = w.w.name; WX.mm = w.w.mm; }
  WX.rain = damp(WX.rain, WX.target, 0.3, dt);
  scene.fog.density = lerp(0.011, 0.022, WX.rain) * (playerIndoors() ? 0.5 : 1);
  // inside the ground-floor shop the cool sky/moon fill would wash the warm tungsten room lavender: fade it out
  INDOOR.k = damp(INDOOR.k, zoneAt(camera.position) === 'g0' ? 1 : 0, 4, dt);
  hemi.intensity = lerp(0.5, 0.1, INDOOR.k) + WX.flash * 3; moon.intensity = lerp(0.22, 0.03, INDOOR.k) + WX.flash * 2.4;
  gradePass.uniforms.uIn.value = INDOOR.k;
  gradePass.uniforms.uFlash.value = WX.flash * 0.35;
  clouds.material.color.setRGB(0.1 + WX.flash * 1.6, 0.07 + WX.flash * 1.6, 0.16 + WX.flash * 2); cloudTex.offset.x += dt * 0.002 * (1 + WX.rain);
  updateLightning(dt);
}

