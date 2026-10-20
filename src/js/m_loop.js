/* ================= player, camera, input, loop ================= */
let time = 0, frameN = 0, started = false, paused = false;
const player = { pos: new THREE.Vector3(1.0, 0.12, 6.0), yaw: Math.PI, pitch: 0, vel: new THREE.Vector2(), moving: false, speed: 0, hold: null, busy: null, focus: null, bob: 0, stepD: 0, lastSurf: 'wet', wet: 0, lock: 0 };
const keys = {};
const look = { dx: 0, dy: 0, lastDx: 0, lastDy: 0 };
let pointerLocked = false;
function playerIndoors() { const p = player.pos; return p.x > BLD.ix0 - 0.05 && p.x < BLD.ix1 + 0.05 && p.z < -0.18 && p.z > BLD.iz0 - 0.05 && !(p.y > 9.6); }
function canMove() { return started && !paused && !player.focus && !DLG.active && !player.busy && !PHONE.open && !UI.modal && player.lock <= 0; }
function surfaceKind() { const p = player.pos; if (playerIndoors()) { if (p.y > 3.4 && p.y < 4) return S.ch >= 2 ? 'tatami' : 'wood'; if (Math.abs(p.z + 7.35) < 0.5 || Math.abs(p.z + 6.45) < 0.5) return 'wood'; return p.y > 6 ? 'stone' : 'wood'; } if (p.y > 3 && p.y < 4.2 && p.x < -3.9) return 'metal'; if (p.y > 9.5) return 'stone'; return 'wet'; }
const _fw = new THREE.Vector3();
function updatePlayer(dt) {
  if (player.lock > 0) player.lock -= dt;
  if (CHEAT.fly) { flyPlayer(dt); return; }
  if (!player.focus) { CLIMB_OK = true; updateUnstick(dt, player.pos); CLIMB_OK = false; }
  let mx = 0, mz = 0, run = false;
  if (canMove()) {
    if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
    mx += TOUCH.stick.x; mz += TOUCH.stick.y; run = keys.ShiftLeft || keys.ShiftRight || TOUCH.stickMag > 0.92;
  }
  const mag = Math.min(1, Math.hypot(mx, mz)); let tx = 0, tz = 0;
  if (mag > 0.05) { const a = Math.atan2(mx, mz); const s = Math.sin(player.yaw + Math.PI), c = Math.cos(player.yaw + Math.PI); const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw); const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw); const nx = (fx * mz + rx * mx) / Math.max(1, Math.hypot(mx, mz)), nz = (fz * mz + rz * mx) / Math.max(1, Math.hypot(mx, mz)); let sp = run ? 4.2 : 2.6; if (player.hold && player.hold.kind === 'crate') sp *= 0.75; if (PHONE.open) sp *= 0.5; const onStair = WZ.some(z => z.ramp && player.pos.x >= z.x0 && player.pos.x <= z.x1 && player.pos.z >= z.z0 && player.pos.z <= z.z1); if (onStair) sp *= 0.8; if (player.climb) sp = Math.min(sp, 0.8); tx = nx * sp * mag; tz = nz * sp * mag; }
  tx *= CHEAT.run; tz *= CHEAT.run; const acc = mag > 0.05 ? 14 : 10; player.vel.x = damp(player.vel.x, tx, acc * 0.6, dt); player.vel.y = damp(player.vel.y, tz, acc * 0.6, dt);
  const sp = player.vel.length(); player.speed = sp;
  if (sp > 0.02) { const y0 = player.pos.y; CLIMB_OK = true; moveBody(player.pos, player.vel.x * dt, player.vel.y * dt); CLIMB_OK = false; player.moving = sp > 0.3; if (player.moving) { player.bob += dt * (run ? 10.5 : 8.2); player.stepD += sp * dt; if (player.stepD > (run ? 0.85 : 0.68)) { player.stepD = 0; Snd.step(surfaceKind()); } } }
  else player.moving = false;
  // clambering over a free stool: slow, and the camera lurches (see updateCamera)
  player.climb = climbAt(player.pos.x, player.pos.z, PR); player.climbK = damp(player.climbK || 0, player.climb ? 1 : 0, 8, dt); if (player.climb && player.moving) player.climbT = (player.climbT || 0) + dt * 6.5;
  // settle on ground (stairs)
  const h = supportAt(player.pos.x, player.pos.z, player.pos.y); if (h !== null) player.pos.y = h;
  if (!playerIndoors() && !sheltered(player.pos) && player.hold && player.hold.kind !== 'cup') player.wet = Math.min(1, player.wet + dt * 0.4 * WX.rain);
  else player.wet = Math.max(0, player.wet - dt * 0.2);
}
// cheat flight: free-fly along the view (pitch included), no collision, no gravity
const FLYV = new THREE.Vector3();
function flyPlayer(dt) {
  let mx = 0, mz = 0, my = 0, fast = false;
  if (canMove()) { if (keys.KeyW || keys.ArrowUp) mz += 1; if (keys.KeyS || keys.ArrowDown) mz -= 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
    if (keys.Space) my += 1; if (keys.KeyC || keys.ControlLeft) my -= 1; mx += TOUCH.stick.x; mz += TOUCH.stick.y; fast = keys.ShiftLeft || keys.ShiftRight || TOUCH.stickMag > 0.92; }
  const cy = Math.cos(player.pitch), sp = (fast ? 12 : 5) * CHEAT.run;
  const fx = -Math.sin(player.yaw) * cy, fy = Math.sin(player.pitch), fz = -Math.cos(player.yaw) * cy, rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const tx = (fx * mz + rx * mx) * sp, ty = (fy * mz + my) * sp, tz = (fz * mz + rz * mx) * sp;
  FLYV.x = damp(FLYV.x, tx, 6, dt); FLYV.y = damp(FLYV.y, ty, 6, dt); FLYV.z = damp(FLYV.z, tz, 6, dt);
  player.pos.x += FLYV.x * dt; player.pos.y = Math.max(-0.5, player.pos.y + FLYV.y * dt); player.pos.z += FLYV.z * dt;
  player.moving = false; player.speed = FLYV.length(); player.wet = Math.max(0, player.wet - dt * 0.2);
}
/* ---------- camera ---------- */
const CAMS = { pos: new THREE.Vector3(), q: new THREE.Quaternion(), focusT: 0, from: null };
const _ce = new THREE.Euler(0, 0, 0, 'YXZ'), _cq = new THREE.Quaternion(), _cv = new THREE.Vector3();
let dialogLook = null; // point to ease view toward during dialogue
function updateCamera(dt) {
  if (DEBUG && window.__szPhoto) { photoCam(); return; } // gauntlet harness: fixed reference camera (l_cheat.js)
  // look input
  if (!player.focus && !UI.modal && started && !paused) {
    const sens = SET.sens; player.yaw -= look.dx * 0.0022 * sens; player.pitch -= look.dy * 0.0022 * sens * (SET.invert ? -1 : 1);
    player.pitch = clamp(player.pitch, -1.45, 1.45);
  }
  look.dx = 0; look.dy = 0;
  if (dialogLook && !player.focus) { const dx = dialogLook.x - camera.position.x, dz = dialogLook.z - camera.position.z, dy = dialogLook.y - camera.position.y; const ty = Math.atan2(-dx, -dz); const tp = Math.atan2(dy, Math.hypot(dx, dz)); player.yaw = lerpAngle(player.yaw, ty, 1 - Math.exp(-dt * 3)); player.pitch = damp(player.pitch, tp, 3, dt); }
  const bobOn = !SET.reduce; const by = bobOn && player.moving ? Math.sin(player.bob) * 0.025 : 0, bx = bobOn && player.moving ? Math.cos(player.bob * 0.5) * 0.012 : 0;
  const ck = CHEAT.fly ? 0 : (player.climbK || 0) * (bobOn ? 1 : 0.3), ct = player.climbT || 0; // climbing wobble: step up, rock side to side
  _cv.set(player.pos.x + Math.cos(player.yaw) * bx, player.pos.y + 1.62 + by + ck * (0.14 + Math.abs(Math.sin(ct)) * 0.06), player.pos.z - Math.sin(player.yaw) * bx);
  _ce.set(player.pitch + ck * Math.sin(ct * 2) * 0.025, player.yaw, ck * Math.sin(ct) * 0.07); _cq.setFromEuler(_ce);
  const f = player.focus;
  if (f) { CAMS.focusT = Math.min(1, CAMS.focusT + dt / 0.35); } else CAMS.focusT = Math.max(0, CAMS.focusT - dt / 0.3);
  if (f && f.tpos) { f.pos.lerp(f.tpos, 1 - Math.exp(-dt * 4)); f.at.lerp(f.tat, 1 - Math.exp(-dt * 4)); }
  const k = easeInOut(CAMS.focusT);
  if (k > 0 && (f || CAMS.lastFocus)) { const fp = (f || CAMS.lastFocus); const fq = new THREE.Quaternion(); const m = new THREE.Matrix4().lookAt(fp.pos, fp.at, new THREE.Vector3(0, 1, 0)); fq.setFromRotationMatrix(m); if (fp.glance) { fq.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(fp.glance.y, fp.glance.x, 0, 'YXZ'))); } camera.position.lerpVectors(_cv, fp.pos, k); camera.quaternion.slerpQuaternions(_cq, fq, k); if (f) CAMS.lastFocus = f; }
  else { camera.position.copy(_cv); camera.quaternion.copy(_cq); CAMS.lastFocus = null; }
  camera.fov = damp(camera.fov, baseFov() * (f && f.fov ? f.fov : 1), 6, dt); camera.updateProjectionMatrix();
}
/* ---------- hands ---------- */
let umbrellaUp = false;
function updateHands(dt) {
  if (!HANDS.L) return;
  const outside = !playerIndoors() && !sheltered(player.pos);
  const free = !player.hold; umbrellaUp = outside && free && !player.focus;
  HANDS.umb.visible = umbrellaUp; HANDS.phone.visible = PHONE.open;
  const b = player.moving && !SET.reduce ? player.bob : 0; const sw = HANDS.sway; sw.x = damp(sw.x, clamp(-look.lastDx * 0.0015, -0.06, 0.06), 10, dt); sw.y = damp(sw.y, clamp(look.lastDy * 0.0015, -0.05, 0.05), 10, dt); look.lastDx = 0; look.lastDy = 0;
  const bobX = Math.cos(b * 0.5) * 0.012, bobY = Math.abs(Math.sin(b)) * -0.014;
  const hide = player.focus && !player.focus.hands; const pose = PHONE.open ? 'phone' : (player.hold ? player.hold.kind : (umbrellaUp ? 'umbrella' : 'idle'));
  const T = { idle: [[-0.24, -0.34, -0.42, 0.2, 0.25], [0.24, -0.34, -0.42, 0.2, -0.25]], umbrella: [[-0.18, -0.24, -0.4, -0.2, 0.35], [0.26, -0.36, -0.44, 0.2, -0.25]], tray: [[-0.22, -0.32, -0.5, 0.0, 0.5], [0.22, -0.32, -0.5, 0.0, -0.5]], cup: [[-0.26, -0.38, -0.42, 0.2, 0.25], [0.15, -0.25, -0.4, 0.1, -0.1]], crate: [[-0.26, -0.3, -0.58, 0.0, 1.1], [0.26, -0.3, -0.58, 0.0, -1.1]], trash: [[-0.26, -0.4, -0.42, 0.2, 0.25], [0.14, -0.3, -0.5, 0.4, -0.2]], planks: [[-0.1, -0.32, -0.6, 0.0, 0.8], [0.3, -0.34, -0.6, 0.0, -0.6]], kettle: [[-0.26, -0.38, -0.42, 0.2, 0.25], [0.22, -0.3, -0.48, 0.2, -0.2]], phone: [[-0.08, -0.22, -0.38, 0.6, 0.1], [0.26, -0.4, -0.44, 0.2, -0.25]] }[pose] || [[-0.24, -0.34, -0.42, 0.2, 0.25], [0.24, -0.34, -0.42, 0.2, -0.25]];
  const kk = 1 - Math.exp(-dt * 12); const dip = HANDS.dip; HANDS.dip = Math.max(0, dip - dt * 2);
  [[HANDS.L, T[0]], [HANDS.R, T[1]]].forEach(([h, t]) => { h.position.x = lerp(h.position.x, t[0] + sw.x + bobX, kk); h.position.y = lerp(h.position.y, t[1] * (window.HAND_YK || 1) + sw.y + bobY - dip * 0.05 + (hide ? -0.6 : 0), kk); h.position.z = lerp(h.position.z, t[2], kk); h.rotation.x = lerp(h.rotation.x, t[3], kk); h.rotation.z = lerp(h.rotation.z, t[4] * 0.3, kk); h.rotation.y = lerp(h.rotation.y, t[4] * 0.25, kk); });
  if (HANDS.item) { HANDS.item.position.x = lerp(HANDS.item.position.x, HANDS.item.userData.bx + sw.x * 0.8 + bobX, kk); HANDS.item.visible = !hide; HANDS.item.position.y = lerp(HANDS.item.position.y, HANDS.item.userData.by * (window.HAND_YK || 1) + sw.y, kk); }
  // hand light tint follows the environment
  const pr = probeAt(player.pos, zoneAt(player.pos), new THREE.Color()); hudHemi.color.copy(pr).multiplyScalar(2.2).addScalar(0.12); hudHemi.intensity = 1.0 + WX.flash * 2; hudKey.intensity = playerIndoors() ? 1.2 : 0.5;
}
/* ---------- interaction ---------- */
const HITS = new THREE.Group(); scene.add(HITS);
const IA = [];  // interactables {id, obj, name, verb, act, hold, cond, reach, pos}
function addIA(o) { const r = Object.assign({ reach: 2.3, hold: 0, cond: null }, o); if (!r.obj && r.box) { const b = r.box; const m = new THREE.Mesh(gBox(), HIT); m.scale.set(b[3], b[4], b[5]); m.position.set(b[0], b[1], b[2]); m.updateMatrixWorld(); HITS.add(m); r.obj = m; } r.obj.userData.ia = r; IA.push(r); return r; }
function removeIA(id) { for (let i = IA.length - 1; i >= 0; i--) if (IA[i].id === id || (id instanceof RegExp && id.test(IA[i].id))) { const r = IA[i]; if (r.obj && r.obj.parent === HITS) HITS.remove(r.obj); IA.splice(i, 1); } }
function moveIA(id, x, y, z) { const r = IA.find(q => q.id === id); if (r && r.obj) { r.obj.position.set(x, y, z); r.obj.updateMatrixWorld(); } }
const ray = new THREE.Raycaster(); const _rc0 = new THREE.Vector2(0, 0); let aim = null, aimT = 0;
const _wp = new THREE.Vector3();
function iaActive(r) { if (r.cond && !r.cond()) return false; return true; }
function findAim(ndc) {
  ray.setFromCamera(ndc || _rc0, camera); ray.far = 3.2;
  const objs = IA.filter(iaActive).map(r => r.obj); const hits = ray.intersectObjects(objs, true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.ia) o = o.parent; if (!o) continue; const r = o.userData.ia; if (h.distance <= r.reach + 0.3) return r; }
  if (ndc) return null;
  // aim assist: 4 degrees
  let best = null, bd = 0.07; const dir = ray.ray.direction;
  for (const r of IA) { if (!iaActive(r)) continue; r.obj.getWorldPosition(_wp); const v = _wp.sub(camera.position); const d = v.length(); if (d > r.reach + 0.2) continue; const ang = Math.acos(clamp(v.dot(dir) / d, -1, 1)); if (ang < bd) { bd = ang; best = r; } }
  return best;
}
let holdT = 0, holdingUse = false, holdTarget = null;
function useAim(viaTouch) {
  if (!canMove() && !(player.busy && player.busy.skippable)) return;
  const r = viaTouch || aim; if (!r) { if (player.hold) altAction(); return; }
  if (r.hold && !SET.holdToggle) { holdingUse = true; holdTarget = r; holdT = 0; return; }
  r.act(); Snd.click();
}
function releaseUse() { holdingUse = false; holdTarget = null; holdT = 0; $('#holdRing').hidden = true; }
function updateHold(dt) {
  if (!holdingUse || !holdTarget) return; if (aim !== holdTarget && !TOUCH.useDown) { releaseUse(); return; }
  holdT += dt; const k = holdT / holdTarget.hold; const ring = $('#holdRing'); ring.hidden = false; ring.querySelector('circle').style.strokeDashoffset = String(94.25 * (1 - Math.min(1, k)));
  if (k >= 1) { const r = holdTarget; releaseUse(); r.act(); }
}
function altAction() { if (player.focus) { stepBack(); return; } if (player.hold && window.putDown) putDown(); }
function updateAim(dt) {
  aim = canMove() ? findAim() : null;
  const cross = $('#cross'), pr = $('#prompt');
  cross.hidden = !started || !!player.focus || UI.modal || PHONE.open; cross.className = aim ? (aim.hold ? 'on hold' : 'on') : '';
  if (aim && !player.focus) { pr.hidden = false; $('#pName').textContent = typeof aim.name === 'function' ? aim.name() : aim.name; const v = typeof aim.verb === 'function' ? aim.verb() : aim.verb; $('#pAct').innerHTML = COARSE ? v : `<kbd>E</kbd> ${v}${aim.hold ? ' (hold)' : ''}`; }
  else pr.hidden = true;
  const ub = $('#btnUse'); if (COARSE) { ub.classList.toggle('dim', !aim); ub.textContent = aim ? (typeof aim.verb === 'function' ? aim.verb() : aim.verb) : 'Use'; const alt = $('#btnAlt'); alt.hidden = !(player.hold || player.focus); alt.textContent = player.focus ? 'Step back' : 'Put down'; }
}
/* ---------- input: desktop ---------- */
addEventListener('keydown', e => {
  if (e.code === 'Tab') { e.preventDefault(); if (started && !DLG.active && !player.focus && !UI.modal) togglePhone(); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (!started) return;
  if (DLG.active && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) { dlgAdvance(); return; }
  if (e.code === 'Escape') { if (player.focus) { stepBack(); return; } if (PHONE.open) { togglePhone(false); return; } if (UI.modal) { closePanel(); return; } openPause(); return; }
  if (player.focus) { stationKey(e.code, true); return; }
  if (e.code === 'KeyE' || e.code === 'KeyF') useAim();
  if (e.code === 'KeyQ') altAction();
});
addEventListener('keyup', e => { keys[e.code] = false; if (player.focus) stationKey(e.code, false); if ((e.code === 'KeyE' || e.code === 'KeyF') && holdingUse) releaseUse(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; releaseUse(); });
canvas.addEventListener('mousedown', e => {
  if (COARSE || !started) return;
  if (player.focus) { stationPointer('down', e.clientX, e.clientY, e.button); return; }
  if (DLG.active) { dlgAdvance(); return; }
  if (!pointerLocked && !UI.modal && !PHONE.open && !paused) { canvas.requestPointerLock && canvas.requestPointerLock(); return; }
  if (e.button === 0) useAim(); else if (e.button === 2) altAction();
});
addEventListener('mouseup', e => { if (COARSE) return; if (player.focus) stationPointer('up', e.clientX, e.clientY, e.button); if (holdingUse && e.button === 0) releaseUse(); });
addEventListener('mousemove', e => { if (COARSE) return; if (player.focus) { stationPointer('move', e.clientX, e.clientY); return; } if (pointerLocked) { if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return; /* Chrome pointer-lock spike */ look.dx += e.movementX; look.dy += e.movementY; look.lastDx = e.movementX; look.lastDy = e.movementY; } });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === canvas; updateLockHint(); });
function updateLockHint() { $('#lockHint').hidden = COARSE || !started || pointerLocked || !!player.focus || UI.modal || PHONE.open || DLG.active || paused; }
function releasePointer() { if (document.pointerLockElement) document.exitPointerLock(); }
/* ---------- input: touch ---------- */
const TOUCH = { stick: new THREE.Vector2(), stickMag: 0, stickId: null, sx: 0, sy: 0, lookId: null, lx: 0, ly: 0, ltT: 0, lmoved: 0, useDown: false };
function stickSide(x) { return SET.lefty ? x > vw * 0.5 : x < vw * 0.45; }
canvas.addEventListener('touchstart', e => {
  if (!started) return; e.preventDefault();
  for (const t of e.changedTouches) {
    if (player.focus) { stationPointer('down', t.clientX, t.clientY, 0, t.identifier); continue; }
    if (DLG.active) { dlgAdvance(); continue; }
    if (stickSide(t.clientX) && TOUCH.stickId === null) { TOUCH.stickId = t.identifier; TOUCH.sx = t.clientX; TOUCH.sy = t.clientY; const sb = $('#stickBase'); sb.hidden = false; sb.style.left = t.clientX + 'px'; sb.style.top = t.clientY + 'px'; $('#stickKnob').style.transform = ''; }
    else if (TOUCH.lookId === null) { TOUCH.lookId = t.identifier; TOUCH.lx = t.clientX; TOUCH.ly = t.clientY; TOUCH.ltT = performance.now(); TOUCH.lmoved = 0; }
  }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (player.focus) { stationPointer('move', t.clientX, t.clientY, 0, t.identifier); continue; }
    if (t.identifier === TOUCH.stickId) { let dx = t.clientX - TOUCH.sx, dy = t.clientY - TOUCH.sy; const r = 52, d = Math.hypot(dx, dy); if (d > r) { dx *= r / d; dy *= r / d; } $('#stickKnob').style.transform = `translate(${dx}px,${dy}px)`; TOUCH.stick.set(dx / r, -dy / r); TOUCH.stickMag = Math.min(1, d / r); }
    else if (t.identifier === TOUCH.lookId) { const dx = t.clientX - TOUCH.lx, dy = t.clientY - TOUCH.ly; TOUCH.lx = t.clientX; TOUCH.ly = t.clientY; TOUCH.lmoved += Math.abs(dx) + Math.abs(dy); look.dx += dx * 2.4; look.dy += dy * 2.4; look.lastDx = dx * 2; look.lastDy = dy * 2; }
  }
}, { passive: false });
function touchEnd(e) {
  for (const t of e.changedTouches) {
    if (player.focus) { stationPointer('up', t.clientX, t.clientY, 0, t.identifier); continue; }
    if (t.identifier === TOUCH.stickId) { TOUCH.stickId = null; TOUCH.stick.set(0, 0); TOUCH.stickMag = 0; $('#stickBase').hidden = true; }
    else if (t.identifier === TOUCH.lookId) { TOUCH.lookId = null; if (TOUCH.lmoved < 12 && performance.now() - TOUCH.ltT < 300) tapAt(t.clientX, t.clientY); }
  }
}
canvas.addEventListener('touchend', touchEnd); canvas.addEventListener('touchcancel', touchEnd);
function tapAt(x, y) { const r = findAim(new THREE.Vector2(x / vw * 2 - 1, -(y / vh) * 2 + 1)); if (r) { if (r.hold) toast('Hold the Use button for that.'); else { r.act(); Snd.click(); } } }
$('#btnUse').addEventListener('touchstart', e => { e.preventDefault(); TOUCH.useDown = true; if (DLG.active) { dlgAdvance(); return; } useAim(); }, { passive: false });
$('#btnUse').addEventListener('touchend', e => { e.preventDefault(); TOUCH.useDown = false; if (holdingUse) releaseUse(); }, { passive: false });
$('#btnUse').addEventListener('click', () => { if (!COARSE) useAim(); });
$('#btnAlt').addEventListener('click', () => altAction());
/* ---------- dynamic light manager ---------- */
const DYN_SRC = []; // {pos, col, i, r, on()}
function updateLights() { const cp = camera.position; const act = DYN_SRC.filter(s => !s.on || s.on()).map(s => [s, s.pos.distanceToSquared(cp)]).sort((a, b) => a[1] - b[1]).slice(0, DYN.length); DYN.forEach((l, i) => { const s = act[i]; if (!s) { l.intensity = 0; return; } const src = s[0]; l.position.copy(src.pos); l.color.set(src.col); l.intensity = typeof src.i === 'function' ? src.i() : src.i; l.distance = src.r; }); }
/* ---------- misc living details ---------- */
function updateCity(dt) {
  updateAlley(dt);
  // flicker
  for (const r of CITY.flicker) { const f = Math.sin(time * 37 + r.ph) > 0.93 || (Math.sin(time * 1.3 + r.ph) > 0.97) ? 0.15 : 1; r.mesh.material.color.setScalar(r.base * f); }
  // holo boards at 10 fps
  if (frameN % 6 === 0) for (const hb of CITY.holo) drawHolo(hb, time + hb.t);
  // train
  const tr = CITY.train; if (tr) { tr.t += dt; const period = 90; const ph = mod(tr.t, period); if (ph < 9) { const dir = Math.floor(tr.t / period) % 2 ? -1 : 1; const x = dir > 0 ? lerp(-130, 110, ph / 9) : lerp(130, -110, ph / 9); tr.g.position.x = dir > 0 ? x - tr.len / 2 : x + tr.len / 2 - tr.len; tr.g.visible = true; if (!tr.sounded) { tr.sounded = true; Snd.train(); if (typeof onTrain === 'function') onTrain(); } } else { tr.g.visible = false; tr.sounded = false; } }
  if (REF.clockHands) { const d = new Date(); REF.clockHands.h.rotation.x = -(d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2; REF.clockHands.m.rotation.x = -d.getMinutes() / 60 * Math.PI * 2; }
}
/* ---------- main loop ---------- */
let last = performance.now(), fpsAcc = 0, fpsN = 0, slowT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000; last = now; const dt = Math.min(raw, 0.05);
  if (paused) { composer.render(); return; }
  time += dt; frameN++;
  if (started) { updatePlayer(dt); cheatTick(); if (typeof updateGame === 'function') updateGame(dt * CHEAT.speed); updateHold(dt); }
  updateWeather(dt); updateRain(dt); updateGlass(dt); updateCity(dt);
  updateCamera(dt); updateHands(dt); if (started) updateAim(dt);
  updateLights(); Snd.update(dt);
  gradePass.uniforms.uTime.value = time; gradePass.uniforms.uLens.value = SET.reduce ? 0 : Math.max(0, player.wet - 0.2) * 0.8; WET_U.uTime.value = time; WET_U.uWet.value = 0.5 + WX.rain * 0.5;
  renderer.info.reset();
  syncReflection();
  if (Q.refl && REFL.rt && (tierName === 'high' || (frameN & 1) === 0 || Math.abs(look.lastDx) > 6 || !REFL.cp || REFL.cp.distanceToSquared(camera.position) > 0.09 || REFL.cq.angleTo(camera.quaternion) > 0.15)) renderReflection(); // half-rate on phones, but never stale after a camera jump
  composer.render();
  if (DEBUG) { (window.__calls = window.__calls || []).push(renderer.info.render.calls); if (window.__calls.length > 30) window.__calls.shift(); }
  if (started) updateUI(dt);
  // adaptive quality (drops one tier if consistently slow)
  if (started && !window.__noAdapt && SET.quality === 'auto') { fpsAcc += raw; fpsN++; if (fpsAcc > 4) { const avg = fpsAcc / fpsN * 1000; fpsAcc = 0; fpsN = 0; if (avg > (COARSE ? 28 : 24)) { slowT++; if (slowT >= 2 && tierName !== 'low') { applyTier(tierName === 'high' ? 'medium' : 'low'); slowT = 0; } } else slowT = 0; } }
}
/* ---------- boot ---------- */
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const ps = [['48px "Dela Gothic One"', '茶房雫営業中八番線歩道橋カラオケゲームセンター立入禁止開運薬居酒屋雨宿りラーメン24時間足元注意パチンコカプセルホテル書店そば石川雀荘'], ['32px "DotGothic16"', 'AMAGASE 八番線 0123'], ['32px "Yusei Magic"', 'お品書き煎茶玄米茶玉露抹茶ほうじ茶一期一会¥0123456789雫ブレンド'], ['20px "Zen Kaku Gothic New"', 'Shizuku 雫']];
  await Promise.race([Promise.all(ps.map(p => document.fonts.load(p[0], p[1]).catch(() => { }))), new Promise(r => setTimeout(r, 3500))]);
}
function setLoad(k, msg) { $('#loadBar').style.width = Math.round(k * 100) + '%'; if (msg) $('#loadTxt').textContent = msg; }
async function boot() {
  window.__szBooted = true;
  resize(); addEventListener('resize', resize);
  setLoad(0.05, 'Fetching the signs…'); await loadFonts();
  const sv = loadSave(); if (sv) S = sv;
  setLoad(0.2, 'Raising the street…'); await nextFrame();
  initShelter(); initDripEdges();
  if (typeof preWorld === 'function') preWorld();
  buildCity(); setLoad(0.5, 'Unlocking the building…'); await nextFrame();
  buildShell(); buildBridge(); buildFacade(); buildG0(); if (typeof buildUpper === 'function') buildUpper();
  setLoad(0.75, 'Calling the rain…'); await nextFrame();
  initRain(); initDrips(); initReflection(); buildHands();
  if (typeof initGame === 'function') initGame();
  setLoad(1, 'Ready.'); await nextFrame();
  if (typeof loadingScan === 'function') loadingScan();
  $('#loading').hidden = true;
  if (typeof showTitle === 'function') showTitle(); else { started = true; }
  requestAnimationFrame(frame);
}
if (DEBUG) window.__sz = code => eval(code);
boot();

