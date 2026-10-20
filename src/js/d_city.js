/* ================= the city ================= */
const CITY = { group: new THREE.Group(), signs: [], holo: [], train: null, flicker: [], lamps: [] };
scene.add(CITY.group);
const SIGN_GROUP = new THREE.Group(); scene.add(SIGN_GROUP);
const NEON = { cyan: 0x33e4ff, mag: 0xff3d9a, vio: 0x8b5cff, amber: 0xffb35c, red: 0xff4a3a, green: 0x5dff9a, white: 0xdfefff, yellow: 0xffe05a };
// place a neon sign + its baked light anchor
function neon(text, x, y, z, ry, hM, col, o, zones) {
  o = o || {}; const hex = typeof col === 'number' ? col : NEON[col]; const css = '#' + new THREE.Color(hex).getHexString();
  const tex = neonTex(text, Object.assign({ col: css }, o)); const m = signMesh(tex, hM, o.k || 2.4, o); m.position.set(x, y, z); m.rotation.y = ry || 0; (o.group || SIGN_GROUP).add(m);
  const a = tex.userData.aspect; const w = hM * a; const nx = Math.sin(ry || 0), nz = Math.cos(ry || 0);
  if (o.thick) { // a real sign box: letters on both faces of a dark cabinet
    m.position.x += nx * o.thick / 2; m.position.z += nz * o.thick / 2;
    const bx = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, hM + 0.1, o.thick * 0.92), new THREE.MeshBasicMaterial({ color: 0x101116, fog: true })); bx.position.set(x, y, z); bx.rotation.y = ry || 0; (o.group || SIGN_GROUP).add(bx);
  }
  const lit = o.lit == null ? 1 : o.lit;
  if (lit > 0) anchor(x + nx * 0.6, y, z + nz * 0.6, hex, 1.6 * lit * Math.min(2.2, Math.max(0.8, Math.sqrt(w * hM))), 4.5 + Math.max(w, hM) * 0.8, zones || ['street', 'far', 'facade', 'alley'], 0.15);
  const rec = { mesh: m, hex, base: o.k || 2.4, flick: !!o.flicker, ph: Math.random() * 10 }; CITY.signs.push(rec); if (o.flicker) CITY.flicker.push(rec);
  return rec;
}
// backing box for a sign
function signBox(ch, x, y, z, w, h, d, col) { ch.box(w, h, d, col || 0x1a1c22, x, y, z); }

/* ---------- generic facade block for neighbours ---------- */
// rain-stained concrete, dark grey (a touch warm, so it stays grey under the blue night fill rather than going violet)
const RUST = 0x5e3c28;
const wallTone = (wall, k) => new THREE.Color(wall).multiplyScalar(k).getHex();
// off-white outdoor AC unit gone grey with grime: grille, bracket shelf, drain hose, rust bleeding down the wall under its feet. zw = wall face
function grimyAC(ch, x, y, zw) {
  const z = zw + 0.17; ch.box(0.8, 0.55, 0.3, spick([0xb2aea2, 0xa6a294, 0xbab6a8]), x, y, z); ch.quad(0.44, 0.44, 0x24262a, x + 0.12, y, z + 0.152);
  for (let i = 0; i < 4; i++) ch.box(0.42, 0.014, 0.014, 0x5a5d62, x + 0.12, y - 0.15 + i * 0.1, z + 0.16);
  ch.quad(0.8, 0.12, 0x7a6a58, x, y - 0.21, z + 0.152); // grime settled along the bottom of the casing
  ch.box(0.86, 0.04, 0.36, 0x3e4044, x, y - 0.3, z); for (const sx of [-0.36, 0.36]) ch.box(0.04, 0.04, 0.36, 0x3e4044, x + sx, y - 0.35, z, 0.5);
  for (const sx of [-0.33, 0.3]) { const L = srange(0.4, 1.3); ch.quad(srange(0.04, 0.09), L, RUST, x + sx, y - 0.34 - L / 2, zw + 0.006); }
  ch.bar([x - 0.38, y - 0.2, z], [x - 0.44, y - 1.3, zw + 0.05], 0.022, 0x1a1b1e);
}
function facadeBlock(ch, em, x0, x1, zf, h, o) {
  o = o || {};
  if (o.face === -1) { // front faces -z (far side of the street): build it facing +z, mirrored about the frontage
    const cx0 = (x0 + x1) / 2, T = new THREE.Matrix4().makeTranslation(cx0, 0, zf).multiply(new THREE.Matrix4().makeRotationY(Math.PI)).multiply(new THREE.Matrix4().makeTranslation(-cx0, 0, -zf));
    const pc = ch.xf, pe = em.xf; ch.xf = pc ? pc.clone().multiply(T) : T; em.xf = pe ? pe.clone().multiply(T) : T;
    facadeBlock(ch, em, x0, x1, zf, h, Object.assign({}, o, { face: 1 })); ch.xf = pc; em.xf = pe; return;
  } const w = x1 - x0, cx = (x0 + x1) / 2, depth = o.depth || 8, flH = o.flH || 3.2, gH = o.gH || 3.6;
  const wall = o.wall || spick([0x58544e, 0x5e5a54, 0x4e4c4a, 0x625b53, 0x534d49]), stain = wallTone(wall, 0.5), band = wallTone(wall, 0.8), sill = wallTone(wall, 1.12);
  ch.box(w, h, depth, wall, cx, h / 2, zf - depth / 2 - 0.02);
  // weathering: grime under the parapet with streaks running down from it, a dirty foot
  ch.quad(w, 0.8, stain, cx, h - 0.4, zf + 0.003); ch.quad(w, 0.5, wallTone(wall, 0.72), cx, 0.25, zf + 0.003);
  for (let x = x0 + srange(0.2, 0.8); x < x1 - 0.1; x += srange(0.5, 1.6)) { const L = srange(0.8, 4.5); ch.quad(srange(0.05, 0.24), L, stain, x, h - 0.8 - L / 2, zf + 0.004); }
  // floor bands
  for (let y = gH; y < h - 0.5; y += flH) ch.box(w + 0.06, 0.12, 0.08, band, cx, y, zf + 0.02);
  ch.box(w + 0.1, 0.3, 0.3, band, cx, h + 0.1, zf - 0.1);
  // windows on upper floors: recessed openings (reveal returns, set-back glass, frame with a centre mullion and a transom);
  // about a third lit warm with curtains or blinds, the rest dark; rain streaks run down from the sills
  const nW = Math.max(1, Math.floor(w / 2.1));
  for (let y = gH + 0.9; y < h - 1.2; y += flH) {
    for (let i = 0; i < nW; i++) {
      const wx = x0 + (i + 0.5) * w / nW, ww = Math.min(1.5, w / nW - 0.5), wh = 1.4, cy = y + wh / 2;
      ch.box(ww + 0.3, 0.14, 0.15, wall, wx, y + wh + 0.07, zf + 0.055); for (const s of [-1, 1]) ch.box(0.15, wh, 0.15, wall, wx + s * (ww / 2 + 0.075), cy, zf + 0.055);
      if (srand() < 0.36) {
        const t = new THREE.Color(spick([0xffbe6a, 0xffcc88, 0xffb45a, 0xffe2b8])).multiplyScalar(srange(0.42, 0.78)); em.quad(ww, wh, t.getHex(), wx, cy, zf + 0.01);
        const cc = t.clone().multiply(new THREE.Color(spick([0xd89a68, 0xc4886a, 0xe6c49a, 0xb0a07a]))).getHex(), k = srand(); // backlit cloth, warmer and dimmer than the room
        if (k < 0.45) { const cw = ww * srange(0.16, 0.3); for (const s of [-1, 1]) em.quad(cw, wh, cc, wx + s * (ww - cw) / 2, cy, zf + 0.018); }
        else if (k < 0.75) { const cw = ww * srange(0.45, 0.7); em.quad(cw, wh, cc, wx + (srand() < 0.5 ? -1 : 1) * (ww - cw) / 2, cy, zf + 0.018); }
        else { const bh = wh * srange(0.3, 0.65); em.quad(ww, bh, cc, wx, y + wh - bh / 2, zf + 0.018); for (let b = 0.08; b < bh; b += 0.08) ch.box(ww, 0.012, 0.01, 0x3a3028, wx, y + wh - b, zf + 0.024); }
      } else {
        ch.quad(ww, wh, spick([0x0b0d12, 0x0f1217, 0x0d1015]), wx, cy, zf + 0.01);
        if (srand() < 0.35) { const cw = ww * srange(0.3, 0.55); ch.quad(cw, wh * 0.96, spick([0x4a4038, 0x3c3a40, 0x56483a]), wx - (ww - cw) / 2, cy, zf + 0.018); }
      }
      ch.box(0.05, wh, 0.05, 0x2c2e32, wx, cy, zf + 0.035); ch.box(ww, 0.04, 0.05, 0x2c2e32, wx, y + wh * 0.74, zf + 0.035); ch.box(ww, 0.05, 0.06, 0x2c2e32, wx, y + 0.025, zf + 0.035);
      ch.box(ww + 0.38, 0.07, 0.22, sill, wx, y - 0.035, zf + 0.1);
      for (const s of [-1, 1]) if (srand() < 0.8) { const L = srange(0.5, flH - wh - 0.3); ch.quad(srange(0.05, 0.14), L, stain, wx + s * (ww / 2 + srange(0, 0.16)), y - 0.07 - L / 2, zf + 0.004); }
      if (srand() < 0.5) { const L = srange(0.3, 1.2); ch.quad(srange(0.1, 0.4), L, stain, wx + srange(-ww / 3, ww / 3), y - 0.07 - L / 2, zf + 0.004); }
      if (srand() < 0.42) grimyAC(ch, Math.min(x1 - 0.55, wx + ww * srange(-0.2, 0.3)), y - 0.62, zf);
      if (srand() < 0.2) { ch.box(ww + 0.3, 0.04, 0.5, 0x3a3c42, wx, y - 0.12, zf + 0.28); P.railing(ch, wx - ww / 2 - 0.15, zf + 0.53, wx + ww / 2 + 0.15, zf + 0.53, y - 0.1, 0.9); }
    }
  }
  // drainpipes with their stains, cable runs up the wall and along the first floor
  for (const px of srand() < 0.5 ? [x0 + 0.15] : [x0 + 0.15, x1 - 0.15]) { P.bracketPipe(ch, px, 0, h, zf + 0.12, 0.05, 0x4a4c50); ch.quad(0.3, h - 1, stain, px, h / 2, zf + 0.004); }
  for (let k = 0; k < 2; k++) ch.bar([x0 + 0.36 + k * 0.07, gH - 0.6, zf + 0.06], [x0 + 0.36 + k * 0.07, h - 0.4, zf + 0.06], 0.035, k ? 0x2a2c30 : 0x3a3a34);
  ch.bar([x0 + 0.3, gH + 0.3, zf + 0.07], [x1 - 0.3, gH + 0.3, zf + 0.07], 0.04, 0x34363a);
  if (o.cables !== false) for (let k = 0; k < 2; k++) ch.cable([x0 + 0.3, h - 0.6 - k * 0.3, zf + 0.15], [x1 - 0.3, h - 0.9 - k * 0.2, zf + 0.15], 0.25, 0.02, 0x1a1a1c, 6);
  // rooftop clutter
  if (o.roof !== false) { const rx = cx + srange(-w / 4, w / 4); ch.cyl(0.8, 0.8, 1.6, 10, 0x8a8e94, rx, h + 1.1, zf - depth * 0.6); for (let k = 0; k < 4; k++) ch.box(0.06, 1.0, 0.06, 0x55595e, rx + (k % 2 ? 0.6 : -0.6), h + 0.3, zf - depth * 0.6 + (k > 1 ? 0.6 : -0.6)); ch.box(0.06, srange(2, 4), 0.06, 0x6a6d72, x0 + 0.6, h + 1.5, zf - 1.2); }
}

/* ---------- skyline: merged towers with window texture ---------- */
// window atlas: 2 facade styles side by side (256 px each, 32 bays). One cell = 8x8 px = 1.0 m x 2.6 m (one window bay, one floor);
// 64 floors, repeating up taller towers. 0 residential (punched windows, lit per two-bay flat), 1 office (wide glazing, mullion pairs).
// Every window has a frame against a slightly lighter spandrel grid so dark floors still read; about a third are lit, warm amber or white.
const WIN_TEX = canvasTex(512, 512, (x, w, h) => {
  let sd = 4177; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const pk = a => a[Math.floor(rr() * a.length)];
  const WARM = ['#ffbe62', '#ffcb7e', '#ffd99e', '#ffb04e', '#ffc470'], WHITE = ['#fff0d6', '#f4efe4', '#ffe6bc'], DARK = ['#080a11', '#0a0d15', '#0c0f18', '#0b0e17'];
  x.fillStyle = '#1b1f2b'; x.fillRect(0, 0, w, h);
  for (let z = 0; z < 2; z++) {
    const X0 = z * 256;
    for (let r = 0; r < 64; r++) {
      const py = r * 8; x.globalAlpha = 1; x.fillStyle = '#12151e'; x.fillRect(X0, py + 7, 256, 1); // slab line
      const fk = rr() < 0.12 ? 0.15 : 0.55 + rr() * 0.9; let lit = false;
      for (let c = 0; c < 32; c++) {
        const px = X0 + c * 8; if (z === 1 || c % 2 === 0) lit = rr() < 0.34 * fk; // a flat (two bays) shares its light
        const col = lit ? pk(rr() < 0.78 ? WARM : WHITE) : pk(DARK); x.globalAlpha = lit ? 0.55 + rr() * 0.45 : 1; x.fillStyle = col;
        if (z === 0) { x.fillRect(px + 2, py + 2, 4, 4); if (lit && rr() < 0.4) { x.globalAlpha = 0.5; x.fillStyle = '#5a3a24'; x.fillRect(px + 2, py + 2, rr() < 0.5 ? 1 : 2, 4); } } // half-drawn curtain
        else { x.fillRect(px + 1, py + 1, 7, 5); x.globalAlpha = 1; x.fillStyle = '#161922'; x.fillRect(px + 4, py + 1, 1, 5); if (lit && rr() < 0.3) { x.globalAlpha = 0.45; x.fillStyle = '#2a2420'; x.fillRect(px + 1, py + 1, 7, 2); } } // blinds part-down
      }
    }
  }
  x.globalAlpha = 1; x.fillStyle = '#090c16'; x.fillRect(0, h - 8, w, 8); // bottom row stays dark: roofs sample it
}, { repeat: true });
WIN_TEX.anisotropy = 1; // distant, mostly face-on: anisotropic taps on a sky-filling atlas cost more than they show
// distant haze: the skyline gets its own, thinner fog toward a blue-grey rain mist, plus a low glow band around the tower bases
const SKY_HAZE = { col: { value: new THREE.Color(0x2c333c) }, k: { value: 0.6 } };
function hazeMat(o) {
  const m = new THREE.MeshBasicMaterial(Object.assign({ vertexColors: true, fog: true }, o));
  m.onBeforeCompile = sh => {
    sh.uniforms.uHaze = SKY_HAZE.col; sh.uniforms.uHazeK = SKY_HAZE.k;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHY;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvHY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHY; uniform vec3 uHaze; uniform float uHazeK;').replace('#include <fog_fragment>', `#ifdef USE_FOG
      float hd = fogDensity * uHazeK * vFogDepth; float hz = 1.0 - exp(-hd * hd);
      hz = max(hz, (1.0 - smoothstep(-5.0, 75.0, vHY)) * 0.55 * smoothstep(25.0, 110.0, vFogDepth));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, hz);
    #endif`);
  };
  m.customProgramCacheKey = () => 'skyHaze' + (o && o.map ? 'm' : '');
  return m;
}
function skyline() {
  const pos = [], uv = [], col = []; const UPM = 8 / 1.0 / 512, VPM = 8 / 2.6 / 512;
  // one box; side faces map into the atlas column `zone` starting at cell u0 / floor v0 so windows line up with the edges
  const box = (cx, y0, cz, w, d, h, zone, u0, v0, tint) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(cx, y0 + h / 2, cz); const p = g.attributes.position.array, u = g.attributes.uv.array, nr = g.attributes.normal.array;
    for (let i = 0; i < p.length / 3; i++) {
      pos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); const ny = nr[i * 3 + 1], nx = nr[i * 3]; const sw = Math.abs(nx) > 0.5 ? d : w;
      if (Math.abs(ny) > 0.5 || zone < 0) uv.push(0.003, 0.002); else uv.push(zone * 0.5 + u0 / 64 + u[i * 2] * sw * UPM, v0 / 64 + u[i * 2 + 1] * h * VPM);
      col.push(tint.r, tint.g, tint.b);
    }
  };
  const em = new Chunk('skyEm', 'far', { emis: true });
  reseed(77);
  const tint = () => { const k = srange(0.85, 1.1); return new THREE.Color().setRGB(k * srange(0.96, 1.04), k, k * srange(0.97, 1.05)); };
  // a tower: main shaft, sometimes a setback crown and a mast; red aviation lights on top, now and then a purple or pink neon edge strip
  const tower = (cx, cz, w, d, h, face) => {
    const zone = Math.floor(srand() * 2), cells = Math.ceil(Math.max(w, d)), u0 = Math.floor(srand() * Math.max(1, 32 - cells)), v0 = Math.floor(srand() * 64);
    const tn = tint();
    box(cx, -2, cz, w, d, h, zone, u0, v0, tn); let top = h - 2, tw = w, td = d;
    if (srand() < 0.5) { const k = srange(0.55, 0.8), hh = h * srange(0.1, 0.22); tw = w * k; td = d * k; box(cx, top, cz, tw, td, hh, zone, u0 + Math.round((w - tw) / 2), v0 + Math.round(h / 2.6), tn); top += hh; }
    if (srand() < 0.3) { box(cx, top, cz, 0.5, 0.5, srange(6, 16), -1, 0, 0, tn); }
    if (srand() < 0.55) { em.ball(0.5, 0xff2418, cx - tw / 2 + 0.3, top + 0.3, cz + face * (td / 2 - 0.3), 0); em.ball(0.5, 0xff2418, cx + tw / 2 - 0.3, top + 0.3, cz + face * (td / 2 - 0.3), 0); }
    const r = srand();
    if (r < 0.16) { const c = spick([0x8b5cff, 0xff3da8, 0xa05cff]), sh = h * srange(0.25, 0.6), sx = srand() < 0.5 ? -1 : 1; em.box(0.28, sh, 0.28, c, cx + sx * (w / 2 + 0.1), h - 2 - sh / 2 - srange(0, 4), cz + face * (d / 2 + 0.1)); }
    else if (r < 0.22) { em.box(tw * 0.8, 0.3, 0.2, 0xffdca8, cx, top - 1.2, cz + face * (td / 2 + 0.1)); }
    return top;
  };
  // behind the shop (the exterior cams look this way): tall, slender towers that rise and converge over the street
  // in three depth layers, spread evenly across so sky shows between them (stratified x, jittered)
  for (const [z0, z1, n, span, h0, h1] of [[34, 52, 7, 70, 110, 190], [58, 90, 11, 110, 130, 220], [95, 150, 15, 170, 150, 260]]) for (let i = 0; i < n; i++) { const cx = -span / 2 + span * (i + srange(0.15, 0.85)) / n; tower(cx, -srange(z0, z1), srange(8, 14), srange(8, 13), srange(h0, h1), 1); }
  // two very tall towers each side just behind the block, rising past the top corners of the street view
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) tower(sx * srange(24 + i * 14, 32 + i * 14), -srange(26, 34) - i * 6, srange(9, 13), srange(9, 12), srange(200, 250), 1);
  // across the street, behind the far side and the viaduct
  for (const [z0, z1, n, span, h0, h1] of [[36, 60, 9, 100, 80, 160], [65, 140, 16, 200, 110, 230]]) for (let i = 0; i < n; i++) { const cx = -span / 2 + span * (i + srange(0.15, 0.85)) / n; tower(cx, srange(z0, z1), srange(8, 15), srange(8, 14), srange(h0, h1), -1); }
  // far down the street both ways: behind the low blocks that line it, never across it, so the street reads as a long corridor
  for (let i = 0; i < 22; i++) { const sx = i % 2 ? -1 : 1, near = srand() < 0.5; tower(sx * srange(90, 190), near ? -srange(26, 50) : srange(42, 66), srange(9, 18), srange(9, 18), srange(60, 140), near ? 1 : -1); }
  // the slim spire seen over the shop roof from the street: a tower with a lattice mast and red lights up it
  { const sx = -128, sz = -66, top = tower(sx, sz, 11, 11, 112, 1);
    box(sx, top, sz, 2.2, 2.2, 6, -1, 0, 0, tint()); for (let k = 0; k < 3; k++) box(sx, top + 6 + k * 9, sz, 1.1 - k * 0.3, 1.1 - k * 0.3, 9, -1, 0, 0, tint());
    for (const y of [top + 14, top + 24]) em.ball(0.45, 0xff2418, sx, y, sz + 0.6, 0); em.ball(0.8, 0xff3020, sx, top + 33.4, sz, 0); }
  // the street itself runs on past the last neighbours (x ±60): low blocks with lit windows on both sides and cross streets
  // between them, vertical neon blades, lamps along both kerbs and a red signal, all in this mesh so the skyline haze fades them
  for (const sx of [-1, 1]) for (const far of [0, 1]) {
    let x = 60.4;
    while (x < 235) {
      if (x > 70 && srand() < 0.2) { x += srange(8, 11); continue; } // cross street
      const w = srange(7, 15), h = srange(11, 24) + (x - 60) * 0.1, d = 14, cz = far ? 14.5 + d / 2 + srange(0, 1.2) : -d / 2 - srange(0, 1.2), cx = sx * (x + w / 2);
      box(cx, -0.2, cz, w, d, h, Math.floor(srand() * 2), Math.floor(srand() * (32 - Math.ceil(w))), Math.floor(srand() * 64), tint());
      if (srand() < (far ? 0.15 : 0.4)) { // vertical neon blade standing out from the front, its face looking down the street
        const c = far ? spick([0xff3da8, 0x8b5cff]) : spick([0x9a5cff, 0x4dff8a, 0x9a5cff, 0x5dff9a, 0xff3da8]), bh = srange(3, 6.5), by = srange(4, 9);
        const bx = cx + sx * srange(-w / 3, w / 3), bz = far ? 14.0 : 0.55; box(bx, by - 0.15, bz, 0.3, 1.1, bh + 0.3, -1, 0, 0, tint()); em.box(0.34, bh, 0.85, c, bx, by + bh / 2, bz);
      }
      x += w + srange(0.2, 1.0);
    }
    for (let lx = 66; lx < 232; lx += 16) for (const [lz, s] of [[2.3, 1], [11.8, -1]]) { box(sx * lx, 0, lz, 0.2, 0.2, 6.6, -1, 0, 0, tint()); em.box(1.3, 0.3, 0.8, 0xf0f4ff, sx * lx, 6.5, lz + s * 1.1); }
  }
  // a signal at the second crossing down the street: arm over the road, red lamp facing back up the street
  for (const sx of [-1, 1]) { const x = sx * 88; box(x, 0, 12.0, 0.25, 0.25, 6.2, -1, 0, 0, tint()); box(x, 5.7, 10.2, 0.14, 3.8, 0.14, -1, 0, 0, tint()); box(x, 5.5, 9.0, 0.32, 1.3, 0.42, -1, 0, 0, tint()); em.ball(0.4, 0xff2a1a, x - sx * 0.2, 5.71, 8.62, 1); em.ball(0.2, 0x1a2a1a, x - sx * 0.2, 5.71, 9.42, 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, hazeMat({ map: WIN_TEX, color: new THREE.Color(CITY.skyK, CITY.skyK, CITY.skyK) })); m.name = 'skyline'; m.matrixAutoUpdate = false; CITY.group.add(m);
  const me = em.build(); if (me) { me.material = hazeMat({ color: new THREE.Color(2.4, 2.4, 2.4) }); CITY.group.add(me); }
}
CITY.skyK = 1.25;

/* ---------- holographic billboards (animated canvas) ---------- */
function holoBoard(x, y, z, ry, w, h, kind) {
  const W = 256, H = Math.round(256 * h / w); const tex = canvasTex(W, H, () => { }); const ctx = tex.userData.ctx;
  const m = new THREE.Mesh(gPlaneIdx(), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.8, 1.8, 1.8), side: THREE.DoubleSide, fog: true }));
  m.position.set(x, y, z); m.rotation.y = ry; m.scale.set(w, h, 1); m.layers.enable(1); SIGN_GROUP.add(m);
  const col = { kaiun: '#ff3d9a', noodle: '#ffb35c', city: '#33e4ff', cat: '#8b5cff' }[kind];
  anchor(x + Math.sin(ry) * 1.5, y, z + Math.cos(ry) * 1.5, new THREE.Color(col).getHex(), 1.6, 9 + w * 0.6, ['street', 'far', 'facade', 'alley'], 0.2);
  CITY.holo.push({ tex, ctx, W, H, kind, col, t: Math.random() * 10, mesh: m });
}
function drawHolo(hb, t) {
  const x = hb.ctx, W = hb.W, H = hb.H; x.globalAlpha = 1; x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  x.strokeStyle = hb.col; x.lineWidth = 3; x.globalAlpha = 0.8; x.strokeRect(4, 4, W - 8, H - 8); x.globalAlpha = 1;
  x.fillStyle = hb.col; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = hb.col; x.shadowBlur = 12;
  if (hb.kind === 'kaiun') { x.font = `${Math.round(H * 0.24)}px ${FONT_SIGN}`; x.fillText('KAIUN BREW', W / 2, H * 0.36); x.font = `${Math.round(H * 0.12)}px ${FONT_UI}`; x.fillText('開運ブリュー · ¥99 COFFEE', W / 2, H * 0.62); const p = (t * 0.6) % 1; x.fillRect(W * 0.1, H * 0.78, W * 0.8 * p, 4); }
  else if (hb.kind === 'noodle') { x.font = `${Math.round(H * 0.3)}px ${FONT_SIGN}`; x.fillText('ラーメン', W / 2, H * 0.4); const k = Math.floor(t * 2) % 2; x.font = `${Math.round(H * 0.13)}px ${FONT_DOT}`; x.fillText(k ? '24時間 OPEN' : '替玉 無料', W / 2, H * 0.72); }
  else if (hb.kind === 'city') { x.font = `${Math.round(H * 0.13)}px ${FONT_DOT}`; const msgs = ['AMAGASE WEATHER  ·  RAIN 100%', 'TYPHOON SEASON  ·  STAY DRY', '8 LINE  ·  NEXT TRAIN 01:30']; const s = msgs[Math.floor(t / 4) % 3]; const off = (t * 60) % (W * 2); x.fillText(s, W * 1.5 - off, H * 0.5); x.globalAlpha = 0.3; for (let yy = 0; yy < H; yy += 4) x.fillRect(0, yy, W, 1); }
  else { x.font = `${Math.round(H * 0.42)}px ${FONT_SIGN}`; const b = Math.sin(t * 3) * 6; x.fillText('ねこ', W / 2, H * 0.45 + b); x.font = `${Math.round(H * 0.12)}px ${FONT_DOT}`; x.fillText('NEKO CAFÉ  2F', W / 2, H * 0.82); }
  x.shadowBlur = 0; x.globalAlpha = 1; hb.tex.needsUpdate = true;
}

/* ---------- the 8 Line train ---------- */
function makeTrain() {
  const g = new THREE.Group(); const ch = new Chunk('train', 'far', { jit: 0.01 }); const em = new Chunk('trainEm', 'far', { emis: true });
  for (let c = 0; c < 4; c++) { const cx = c * 20.4; ch.box(20, 3.0, 3.0, 0xbfc4ca, cx, 1.5, 0); ch.box(20.02, 0.35, 3.02, 0x2a8aa0, cx, 0.9, 0); ch.box(20.02, 0.1, 3.02, 0x18383f, cx, 0.65, 0); ch.box(19.6, 0.3, 2.6, 0x55595e, cx, 3.1, 0); for (let i = 0; i < 9; i++) { em.box(1.4, 0.9, 0.02, 0xfff0d0, cx - 8.6 + i * 2.15, 1.85, 1.51); em.box(1.4, 0.9, 0.02, 0xfff0d0, cx - 8.6 + i * 2.15, 1.85, -1.51); } for (const sx of [-6, 6]) { ch.box(1.4, 0.4, 2.6, 0x2a2d33, cx + sx, 0.2, 0); } }
  em.box(0.05, 0.3, 1.8, 0xffffff, 81.4 - 10.2, 1.4, 0); ch.box(1.0, 0.6, 0.1, 0x111111, 81.4 - 10.2, 2.0, 0);
  const a = ch.build(), b = em.build(); g.add(a, b); b.material = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.4, 2.4, 2.4) });
  g.position.set(-200, 11.3, 13.6); CITY.group.add(g);
  CITY.train = { g, t: -30, dir: 1, len: 82 };
}

/* ---------- build ---------- */
function buildCity() {
  reseed(9001);
  const wet = new Chunk('ground', 'street', { wet: true, jit: 0.02 });
  const st = new Chunk('street', 'street');
  const em = new Chunk('streetEm', 'street', { emis: true });
  const far = new Chunk('far', 'far');
  // ---- road + sidewalks (near sidewalk z 0..2.5, road 2.5..11.5, far 11.5..14)
  const X0 = -60, X1 = 60;
  for (let x = X0; x < X1; x += 4) { wet.box(4, 0.1, 9, 0x15171c, x + 2, -0.05, 7, 0, 0, 0, 0.8); } // black wet asphalt
  // lane dashes + edge lines + crosswalk
  for (let x = X0; x < X1; x += 3) { if (x > -2 && x < 6) continue; wet.box(1.6, 0.012, 0.12, 0xb8b8b0, x + 0.8, 0.003, 7, 0, 0, 0, 0.3); }
  wet.box(X1 - X0, 0.006, 0.1, 0x9a9890, 0, 0.003, 11.0, 0, 0, 0, 0.45); for (const [a, b] of [[X0, -1.7], [4.5, X1]]) wet.box(b - a, 0.006, 0.1, 0x9a9890, (a + b) / 2, 0.003, 3.0, 0, 0, 0, 0.45); // near edge line: the shop's stretch is painted by buildFacade (it breaks for the crosswalk)
  // sidewalk slabs
  const slab = (x0, x1, z0, z1) => { for (let x = x0; x < x1 - 0.01; x += 0.6) for (let z = z0; z < z1 - 0.01; z += 0.6) { const ww = Math.min(0.6, x1 - x), dd = Math.min(0.6, z1 - z); wet.box(ww - 0.02, 0.12, dd - 0.02, new THREE.Color(0x6a6c72).multiplyScalar(srange(0.85, 1.08)).getHex(), x + ww / 2, 0.06, z + dd / 2, 0, 0, 0, 0.42); } };
  slab(X0, 2.7, 0, 2.3); slab(4.5, X1, 0, 2.3); slab(2.7, 4.5, 0.6, 2.3);
  slab(X0, X1, 11.7, 14.2);
  // the road runs on down the street past the neighbours (the blocks along it are in skyline()): plain slabs, no tiles
  for (const sx of [-1, 1]) { const cx = sx * 145; wet.box(170, 0.1, 9, 0x15171c, cx, -0.05, 7, 0, 0, 0, 0.8); wet.box(170, 0.12, 2.3, 0x4e5056, cx, 0.06, 1.15, 0, 0, 0, 0.45); wet.box(170, 0.12, 2.5, 0x4e5056, cx, 0.06, 12.95, 0, 0, 0, 0.45);
    st.box(170, 0.16, 0.22, 0x8a8c90, cx, 0.08, 2.4); st.box(170, 0.16, 0.22, 0x8a8c90, cx, 0.08, 11.6); for (let x = 61; x < 228; x += 3) wet.box(1.6, 0.012, 0.12, 0xb8b8b0, sx * (x + 0.8), 0.003, 7, 0, 0, 0, 0.3); }
  // tactile paving strip on the near sidewalk
  for (let x = X0; x < X1; x += 0.3) { if (x > 2.6 && x < 4.6) continue; wet.box(0.29, 0.125, 0.29, 0xd8b53a, x + 0.15, 0.062, 1.65, 0, 0, 0, 0.35); }
  // curbs
  st.box(X1 - X0, 0.16, 0.22, 0x8a8c90, 0, 0.08, 2.4); st.box(X1 - X0, 0.16, 0.22, 0x8a8c90, 0, 0.08, 11.6);
  // puddles (wet = 1, darker)
  const PUD = [[0.2, 1.2, 0.9, 0.45], [-1.6, 3.1, 1.3, 0.6], [-3.6, 4.2, 1.6, 0.7], [1.4, 9.6, 2.2, 0.9], [-11, 6.5, 2.4, 1.0], [7.5, 5.2, 1.4, 0.6], [-7, 1.1, 0.9, 0.5], [3.4, -2.5, 0.8, 1.6], [12, 9.0, 1.8, 0.8], [-1.8, 12.6, 1.4, 0.5], [16, 3.6, 1.2, 0.6]];
  CITY.puddles = PUD.map(p => [p[0], p[1] > 11.5 || (p[1] < 2.4 && p[1] > 0) ? 0.125 : p[1] < 0 ? 0.06 : 0.005, p[1], p[2], p[3]]);
  for (const p of CITY.puddles) { for (let k = 0; k < 3; k++) wet.geo(gCyl(12), 0x30333c, M(p[0] + srange(-0.2, 0.2) * p[3], p[1] + 0.002 + k * 0.0005, p[2] + srange(-0.15, 0.15) * p[4], 0, srand() * 3, 0, p[3] * srange(0.7, 1.1), 0.004, p[4] * srange(0.7, 1.1)), 1.0, 0.01); }
  // drains + manholes
  for (let x = -40; x < 40; x += 7.3) { P.drain(st, x, 0, 2.6, 0.6); P.drain(st, x + 3, 0, 11.4, 0.6); }
  P.manhole(st, -6, 0, 6.2); P.manhole(st, 9, 0, 8); P.manhole(st, 22, 0, 5.5);
  // ---- the alley (x 2.73..4.6) lives in e_alley.js
  buildAlley(wet);
  // ---- left: soba shop (x -8.5..-2.7)
  buildSoba(st, em);
  // ---- further left: Kaiun site (x -17..-8.5)
  buildKaiunSite(st, em);
  // ---- left beyond
  facadeBlock(st, em, -27, -17, 0, 14, { gH: 3.8 }); neon('薬', -18.2, 7.5, 0.4, 0, 1.6, 'green', { vertical: true, px: 120 });
  shopFront(st, em, -27, -17, 0, 0xffe9c8, 'ドラッグ', 'green', 'drug');
  facadeBlock(st, em, -40, -27, 0, 18, {}); shopFront(st, em, -40, -27, 0, 0xffd6a0, '居酒屋', 'red', 'izakaya');
  for (let i = 0; i < 5; i++) P.lantern(st, -37 + i * 1.4, 2.9, 0.6); for (let i = 0; i < 5; i++) P.lanternGlow(em, -37 + i * 1.4, 2.9, 0.6, 0xff4a2a, 1);
  anchor(-34, 2.8, 1.2, 0xff5a3a, 2.4, 7, ['street'], 0.2);
  facadeBlock(st, em, -60, -40, 0, 22, {});
  // ---- right: arcade (x 4.5..13)
  buildArcade(st, em);
  facadeBlock(st, em, 13.2, 22, 0, 15, {}); shopFront(st, em, 13.2, 22, 0, 0xcfe8ff, 'クリーニング', 'cyan', 'cleaning');
  facadeBlock(st, em, 22.2, 34, 0, 20, {}); shopFront(st, em, 22.2, 34, 0, 0xffe0b0, '書店', 'amber', 'books');
  facadeBlock(st, em, 34.2, 60, 0, 13, {});
  // ---- far side (front at z 14.5)
  buildFarSide(far, em);
  // ---- viaduct over the far sidewalk
  buildViaduct(far, em);
  // ---- street furniture
  streetLamps(st, em);
  for (const x of [-12.5, 6, 21]) { P.pole(st, x, 0.12, 2.15, 9.5); }
  // wires across the street (between poles and the far side)
  for (const [x, z] of [[-12.5, 2.15], [6, 2.15], [21, 2.15]]) for (let k = 0; k < 4; k++) st.cable([x - 0.6 + k * 0.4, 8.9, z], [x + srange(-3, 3), srange(7.5, 9.5), 14.4], srange(0.3, 0.8), 0.022, 0x15161a, 10);
  for (let k = 0; k < 5; k++) st.cable([-12.5 - 0.6 + k * 0.3, 8.9, 2.15], [6 - 0.6 + k * 0.3, 8.9, 2.15], srange(0.4, 0.9), 0.022, 0x15161a, 12);
  for (let k = 0; k < 5; k++) st.cable([6 - 0.6 + k * 0.3, 8.9, 2.15], [21 - 0.6 + k * 0.3, 8.9, 2.15], srange(0.4, 0.9), 0.022, 0x15161a, 12);
  P.bike(st, -5.5, 0.12, 1.9, 0.1, 0x2f6f8a); P.bike(st, -6.4, 0.12, 2.0, -0.05, 0xb84a3a); P.scooter(st, 9.2, 0.12, 1.9, 0.2, 0xd8d4c8); P.scooter(st, 15.2, 0.12, 12.5, 3.1, 0x3a6fb0);
  // the tall dark utility pole at the alley mouth (right edge of the street view): wet-dark steel-concrete, a yellow/black guard
  // at its foot, crossarms, a transformer, step bolts, and wires off across the street; a faint sheen line down its lit side
  { const x = 3.3, z = 2.0; st.cyl(0.2, 0.25, 11.6, 14, 0x3a3c40, x, 0.12 + 5.8, z); for (let i = 0; i < 5; i++) st.cyl(0.262, 0.262, 0.2, 14, i % 2 ? 0x141518 : 0xd8a81c, x, 0.22 + i * 0.2, z);
    st.box(1.6, 0.1, 0.12, 0x2a2c30, x, 10.9, z); st.box(1.2, 0.1, 0.12, 0x2a2c30, x, 10.2, z); for (let i = 0; i < 5; i++) st.cyl(0.035, 0.035, 0.12, 6, 0xc8c8c0, x - 0.7 + i * 0.35, 11.0, z);
    st.cyl(0.24, 0.24, 0.75, 10, 0x4a4e54, x + 0.1, 9.1, z + 0.36); st.box(0.08, 0.5, 0.3, 0x2a2c30, x + 0.1, 9.1, z + 0.18);
    for (let y = 2.3; y < 9.6; y += 0.45) st.box(0.26, 0.03, 0.03, 0x34363a, x, y, z, 0, (y * 2.2) % 2 < 1 ? 0 : Math.PI / 2);
    em.box(0.035, 8.6, 0.035, 0x4a5a70, x - 0.17, 5.9, z + 0.12); em.box(0.03, 6, 0.03, 0x2a5a66, x + 0.12, 7.0, z + 0.17); // wet sheen: cool lamp side, cyan sign side
    for (let k = 0; k < 4; k++) st.cable([x - 0.7 + k * 0.45, 10.95, z], [x + srange(-7, 1), srange(7.5, 9.8), 14.4], srange(0.3, 0.8), 0.022, 0x15161a, 10);
    for (let k = 0; k < 3; k++) st.cable([x - 0.4 + k * 0.4, 10.95, z], [6 - 0.4 + k * 0.4, 8.9, 2.15], srange(0.1, 0.3), 0.022, 0x15161a, 6);
    solidC(x, z, 0.52, 0.52, 0, 11, 'street'); }
  P.cone(st, -9.0, 0.12, 2.0); P.cone(st, -9.8, 0.12, 2.05);
  for (const x of [-24, -14, -1.35, 2.4, 14, 26]) P.bollard(st, x, 0.12, 2.15);
  P.hydrant(st, 11.5, 0.12, 2.0);
  // ---- build chunks
  for (const c of [wet, st, far]) { const m = c.build(); if (m) { CITY.group.add(m); if (c === wet) m.castShadow = false; } }
  const me = em.build(); if (me) { CITY.group.add(me); CITY.emisMesh = me; }
  skyline(); makeTrain();
  // holos
  holoBoard(-20, 17, 14.2, Math.PI, 9, 4.5, 'kaiun'); holoBoard(16, 15, 14.2, Math.PI, 7, 4, 'city'); holoBoard(10.2, 13.5, -0.6, 0, 5.5, 3, 'noodle'); holoBoard(-30, 11, 0.4, 0, 6, 3.6, 'cat');
  // world collision: sidewalks, road, alley, bridge stairs
  zoneFlat(-26, 26, 0, 2.5, 0.12, 'street'); zoneFlat(-26, 26, 2.5, 11.5, 0, 'street'); zoneFlat(-26, 26, 11.5, 14.1, 0.12, 'street');
  solid(-30, 30, 0, 6, 14.3, 15, 'street'); solid(-27, -26, 0, 6, -1, 15, 'street'); solid(26, 27, 0, 6, -1, 15, 'street');
  solid(-30, -2.7, 0, 9, -2, -0.02, 'street'); solid(4.5, 30, 0, 9, -2, -0.02, 'street');
  
  for (const x of [-24, -14, -1.0, 2.2, 14, 26]) solidC(x, 2.15, 0.2, 0.2, 0, 1, 'street');
  for (const x of [-12.5, 6, 21]) solidC(x, 2.15, 0.3, 0.3, 0, 9, 'street');
  solidC(-6, 1.95, 1.5, 0.5, 0, 1, 'street'); solidC(-9.4, 2.0, 1.2, 0.4, 0, 0.6, 'street'); solidC(9.2, 1.9, 1.4, 0.5, 0, 1.2, 'street'); solidC(11.5, 2.0, 0.3, 0.3, 0, 0.8, 'street');
}

function shopFront(ch, em, x0, x1, zf, glow, label, col, kind) {
  const w = x1 - x0, cx = (x0 + x1) / 2; ch.box(w - 0.4, 0.3, 0.12, 0x2a2c31, cx, 3.3, zf + 0.06);
  storeWindow(ch, x0 + 0.6, x1 - 0.6, zf + 0.08, 0.25, 2.5, kind || 'shop', 1);
  anchor(cx, 1.4, zf + 1.4, glow, 1.9, 6, ['street'], 0.3);
  if (label) neon(label, cx, 3.75, zf + 0.12, 0, 0.62, col, { px: 72 });
  ch.box(w - 0.6, 0.12, 0.9, 0x3a3c42, cx, 3.05, zf + 0.45);
}
function buildSoba(ch, em) {
  const x0 = -8.5, x1 = -2.7, cx = (x0 + x1) / 2, h = 7.2;
  ch.box(x1 - x0, h, 8, 0x5a4a3e, cx, h / 2, -4.02); ch.box(x1 - x0 + 0.3, 0.25, 0.9, 0x2a2420, cx, 3.25, 0.25, 0.25);
  for (let x = x0; x < x1; x += 0.22) ch.box(0.2, 0.06, 1.0, 0x3a332c, x + 0.11, 3.42, 0.25, 0.28); // tiled awning
  ch.box(x1 - x0 - 0.4, 2.7, 0.1, 0x6a5038, cx, 1.35, 0.05); // wooden front
  for (let x = x0 + 0.5; x < x1 - 0.4; x += 0.5) ch.box(0.04, 2.6, 0.06, 0x4a3828, x, 1.35, 0.12); // lattice
  ch.box(1.4, 2.2, 0.05, 0x2a1e16, -4.3, 1.1, 0.13); // door (closed)
  em.box(1.3, 1.6, 0.02, 0x6a4a28, -4.3, 1.45, 0.11);
  P.noren(ch, -4.3, 2.35, 0.25, 1.4, 0.75, 0x23304a, 3, 0, 0xefe4cc);
  P.lantern(ch, -7.0, 2.4, 0.45); P.lanternGlow(em, -7.0, 2.4, 0.45, 0xff5a30, 1.1);
  anchor(-4.3, 2.4, 1.2, 0xff7a40, 1.6, 5, ['street', 'facade'], 0.25);
  // upstairs: home of Gen-san
  P.window(ch, -7.6, -5.8, 4.4, 5.8, 0.06, 2, 1); em.box(1.8, 1.4, 0.02, 0x7a5228, -6.7, 5.1, 0.03);
  P.window(ch, -5.2, -3.4, 4.4, 5.8, 0.06, 2, 1); ch.box(1.8, 1.4, 0.02, 0x14171d, -4.3, 5.1, 0.03);
  // AC and sign sit above the upstairs windows, clear of the 2F deck that runs along this front from chapter 3
  ch.box(x1 - x0 + 0.4, 0.2, 1.2, 0x2a2420, cx, h + 0.1, -0.2, 0.3); P.acUnit(ch, -3.3, 6.45, 0.18, 0); P.meter(ch, -8.2, 1.6, 0.18, 0);
  neon('そば 石川', -5.9, 6.45, 0.08, 0, 0.5, 'amber', { px: 70, lit: 0.6, k: 1.6 });
  // standing sign
  ch.box(0.32, 0.9, 0.32, 0x2a1e16, -7.8, 0.57, 0.9); em.box(0.26, 0.7, 0.01, 0xffe0b0, -7.8, 0.62, 1.07);
  solid(-8.5, -2.7, 0, 8, -8, 0.15, 'street');
}
function buildKaiunSite(ch, em) {
  const x0 = -17, x1 = -8.6;
  for (let x = x0; x < x1; x += 1.0) { ch.box(0.98, 3.0, 0.08, 0xe8e6e0, x + 0.5, 1.6, 0.3); ch.box(0.98, 0.25, 0.09, 0x2a2c31, x + 0.5, 0.2, 0.31); }
  for (let x = x0 + 0.5; x < x1; x += 2.0) neon('立入禁止', x + 0.5, 2.0, 0.36, 0, 0.32, 'red', { px: 60, lit: 0.25, k: 1.4 });
  neon('開運 KAIUN', (x0 + x1) / 2, 2.9, 0.37, 0, 0.36, 'mag', { px: 64, lit: 0.4, k: 2.2 });
  // scaffold + crane behind
  for (let x = x0 + 0.5; x < x1; x += 1.8) for (let y = 0; y < 18; y += 2) { ch.box(0.06, 2, 0.06, 0x8a8e94, x, y + 1, -1.5); ch.box(1.8, 0.05, 0.05, 0x8a8e94, x + 0.9, y + 2, -1.5); }
  ch.box(x1 - x0, 0.05, 0.5, 0x6a6c70, (x0 + x1) / 2, 6, -1.4); ch.box(x1 - x0, 0.05, 0.5, 0x6a6c70, (x0 + x1) / 2, 12, -1.4);
  // safety mesh panels glowing faintly
  em.box(x1 - x0, 14, 0.02, 0x0a1a2a, (x0 + x1) / 2, 10, -1.2);
  solid(x0, x1, 0, 4, 0.2, 0.45, 'street');
}
function buildArcade(ch, em) {
  const x0 = 4.6, x1 = 13, h = 10.5, cx = (x0 + x1) / 2;
  ch.box(x1 - x0, h, 10, 0x2e3038, cx, h / 2, -5.02);
  // ground floor: warm amber-lit glass onto the crane games
  storeWindow(ch, x0 + 0.15, x1 - 0.2, 0.1, 0.15, 2.75, 'arcade', 1, { frame: 0x1a1b20, doorX: 8.9 }); anchor(6.2, 1.3, 1.4, 0xffb060, 2.2, 6.5, ['street'], 0.3);
  ch.box(x1 - x0, 0.6, 1.2, 0x18191f, cx, 3.2, 0.5);
  neon('ゲームセンター', cx, 3.25, 1.12, 0, 0.55, 'mag', { px: 70 });
  // upper floors: the big cyan GARCADE cabinet sign, its left end overhanging the alley mouth so it glows at the right edge of the street view
  em.box(x1 - x0 - 0.6, 3.2, 0.04, 0x16063a, cx, 6.2, 0.03);
  { const px = 110, hM = 1.0, mc = document.createElement('canvas').getContext('2d'); mc.font = `${px}px ${FONT_SIGN}`; // same measure neonTex uses
    const wM = hM * Math.ceil(mc.measureText('GARCADE').width + 52) / Math.ceil(px * 1.25 + 52), sx = 3.5 + wM / 2;
    neon('GARCADE', sx, 6.6, 0.32, 0, hM, 'cyan', { font: FONT_SIGN, px, thick: 0.3, k: 2.6 }, ['street', 'facade', 'alley']);
    for (const x of [3.6, 4.5]) ch.box(0.08, 0.08, 0.5, 0x2a2c31, x, 6.6, 0.1); ch.box(0.06, 1.1, 0.06, 0x2a2c31, 3.6, 6.6, 0.36); }
  neon('UFO CATCHER', cx + 1.6, 4.55, 0.1, 0, 0.55, 'yellow', { px: 80, flicker: true });
  // the old vertical karaoke / mahjong sign stack on the alley corner is gone (in neither reference). Its pole is still generated
  // into a discarded chunk so the seeded random sequence, and with it every neighbour block built after this, stays put.
  { const gone = new Chunk('gone', 'street'), sx = 4.75, sz = 0.8;
    gone.box(0.2, 7.5, 0.2, 0x2a2c31, sx, 7.0, sz - 0.35); gone.box(0.12, 0.12, 0.8, 0x2a2c31, sx, 9.5, sz - 0.1); gone.box(0.12, 0.12, 0.8, 0x2a2c31, sx, 4.5, sz - 0.1);
    for (let y = 4; y < 10; y += 0.9) gone.cable([sx, y, sz - 0.3], [sx - 0.3, y - 0.3, sz - 0.9], 0.1, 0.015, 0x15161a, 3); }
  // roof: tank, antenna, skybridge landing
  ch.box(x1 - x0, 1.0, 0.2, 0x3a3c42, cx, h + 0.5, -0.1); ch.cyl(1.1, 1.1, 2.2, 12, 0x8a8e94, cx + 2, h + 1.6, -6); ch.box(0.08, 6, 0.08, 0x8a8e94, cx - 2, h + 3, -7);
  em.ball(0.12, 0xff2020, cx - 2, h + 6.1, -7);
  zoneFlat(x0 + 0.1, x1 - 0.2, -9.8, -0.4, h, 'arcadeRoof');
  solid(x0, x1, 0, h - 0.2, -10, 0.05, 'street');
  anchor(cx, 2.0, 2.0, 0xff9a50, 2.4, 8, ['street'], 0.3); anchor(cx - 1.5, 6.5, 2.5, 0x33e4ff, 2.0, 9, ['street', 'facade'], 0.25);
}
function shrine(ch, em, x, y, z) {
  at(ch, x, y, z, -Math.PI / 2, () => {
    ch.box(0.7, 0.5, 0.45, 0x8a8e94, 0, 0.25, 0); ch.box(0.5, 0.45, 0.35, 0xb8352a, 0, 0.72, 0); ch.box(0.62, 0.06, 0.48, 0x2a2420, 0, 0.98, 0, 0.0); ch.box(0.66, 0.05, 0.3, 0x2a2420, 0, 1.0, 0.12, -0.35); ch.box(0.66, 0.05, 0.3, 0x2a2420, 0, 1.0, -0.12, 0.35);
    // tiny torii
    ch.box(0.04, 0.5, 0.04, 0xd8402e, -0.2, 0.25, 0.38); ch.box(0.04, 0.5, 0.04, 0xd8402e, 0.2, 0.25, 0.38); ch.box(0.54, 0.04, 0.06, 0xd8402e, 0, 0.52, 0.38); ch.box(0.46, 0.03, 0.04, 0xd8402e, 0, 0.44, 0.38);
    ch.box(0.1, 0.14, 0.1, 0xefe4cc, -0.15, 0.6, 0.18); ch.box(0.1, 0.14, 0.1, 0xefe4cc, 0.15, 0.6, 0.18); ch.cyl(0.03, 0.03, 0.1, 6, 0x7fae5a, 0, 0.55, 0.2);
  });
  em.box(0.05, 0.05, 0.05, 0xffb050, x - 0.1, y + 0.82, z); anchor(x - 0.4, y + 0.9, z, 0xffa050, 0.8, 2, ['alley', 'street'], 0.3);
}
// textured quads merged into one mesh (one draw call per shared texture): q = [x, y, z, w, h, ry, u0, v0, u1, v1]
const _yAxis = new THREE.Vector3(0, 1, 0);
function uvQuads(tex, qs, k) {
  const pos = [], uv = [], v = new THREE.Vector3();
  for (const [x, y, z, w, h, ry, u0, v0, u1, v1] of qs) for (const [a, b, s, t] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, -1, u0, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
    v.set(a * w / 2, b * h / 2, 0).applyAxisAngle(_yAxis, ry); pos.push(x + v.x, y + v.y, z + v.z); uv.push(s, t); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true, color: new THREE.Color(k || 1, k || 1, k || 1) })); m.matrixAutoUpdate = false; m.layers.enable(1); CITY.group.add(m); return m;
}
// ほしマート: star + name for the fascia (top half of the atlas), and the two drink posters on its glass (bottom right).
// Drawn on first use, after the boot font load, so the lettering gets Dela Gothic rather than a fallback
let HOSHI_TEX = null;
const hoshiTex = () => HOSHI_TEX || (HOSHI_TEX = canvasTex(512, 256, (x, w, h) => {
  x.clearRect(0, 0, w, h);
  const star = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); };
  star(48, 66, 40); x.fillStyle = '#ffc21a'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#f08a12'; x.stroke();
  x.fillStyle = '#0b6670'; x.font = `80px ${FONT_SIGN}`; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText('ほしマート', 100, 68, 404);
  // posters: matcha latte on lilac, iced lemon tea on pale blue (128 x 128 each)
  const poster = (X, bg, cup, top, txt, sub) => {
    x.fillStyle = bg; x.fillRect(X, 128, 128, 128); x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(X + 64, 205, 46, 12, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(240,248,255,.85)'; x.beginPath(); x.moveTo(X + 44, 150); x.lineTo(X + 84, 150); x.lineTo(X + 78, 204); x.lineTo(X + 50, 204); x.closePath(); x.fill();
    x.fillStyle = cup; x.beginPath(); x.moveTo(X + 46, 164); x.lineTo(X + 82, 164); x.lineTo(X + 77, 201); x.lineTo(X + 51, 201); x.closePath(); x.fill(); x.fillStyle = top; x.fillRect(X + 46, 158, 36, 8);
    x.fillStyle = '#2a8a5a'; x.fillRect(X + 70, 136, 4, 24); x.fillStyle = '#1a3a5a'; x.font = `bold 15px ${FONT_UI}`; x.textAlign = 'center'; x.fillText(txt, X + 64, 230); x.font = `11px ${FONT_UI}`; x.fillText(sub, X + 64, 246);
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3; x.strokeRect(X + 2, 130, 124, 124);
  };
  poster(256, '#c8b0e8', '#5aa83a', '#f2ecd8', '抹茶ラテ', 'NEW ¥180'); poster(384, '#bfe4f4', '#f0c040', '#fff6d0', 'レモンティー', '冷たい ¥150');
}));
function konbini(ch, em) {
  // ほしマート: white fascia with a teal frame, orange bands either side of the star logo; tall glass onto a bright cool-white shop
  const X0 = -14, X1 = -3.5, kc = (X0 + X1) / 2, TEAL = 0x10a4b0, ORANGE = 0xff7418, FZ = 14.12;
  ch.box(10.6, 1.4, 0.36, 0xd8dcd8, kc, 3.44, 14.32); for (const x of [X0 + 0.2, X1 - 0.2]) ch.box(0.4, 2.8, 0.3, 0xc8ccc8, x, 1.4, 14.36);
  em.box(10.6, 1.4, 0.02, 0xd4dcda, kc, 3.44, FZ + 0.01); em.box(10.66, 0.13, 0.03, TEAL, kc, 4.09, FZ); em.box(10.66, 0.26, 0.03, TEAL, kc, 2.87, FZ);
  for (const [a, b] of [[X1 - 0.05, -6.15], [-11.05, X0 + 0.05]]) em.box(a - b, 0.27, 0.03, ORANGE, (a + b) / 2, 3.5, FZ);
  uvQuads(hoshiTex(), [[-8.6, 3.5, FZ - 0.02, 4.5, 1.12, Math.PI, 0, 0.5, 1, 1]]);
  storeWindow(ch, -13.6, -3.9, 14.42, 0.15, 2.7, 'konbini', -1, { frame: 0xa8aeb4, k: 1.0, doorX: -5.98 });
  em.box(9.7, 0.08, 0.02, TEAL, kc, 0.15 + 2.55 * 0.72, 14.35); // teal band across the glass at the transom
  // posters on the glass, and the umbrella stand by the door (clear umbrellas in a wire rack)
  uvQuads(hoshiTex(), [[-8.75, 0.8, 14.38, 0.78, 0.78, Math.PI, 0.5, 0, 0.75, 0.5], [-7.36, 0.8, 14.38, 0.78, 0.78, Math.PI, 0.75, 0, 1, 0.5]], 1.1);
  const ux = -4.9, uz = 14.02; ch.box(0.62, 0.05, 0.3, 0x3a3e44, ux, 0.15, uz); for (const sx of [-0.29, 0.29]) ch.box(0.03, 0.75, 0.03, 0x6a6e74, ux + sx, 0.5, uz); ch.box(0.62, 0.03, 0.3, 0x6a6e74, ux, 0.86, uz);
  for (let i = 0; i < 8; i++) { const x = ux - 0.24 + (i % 4) * 0.16, z = uz + (i < 4 ? -0.07 : 0.07), lean = srange(-0.08, 0.08); ch.cone(0.065, 0.78, 6, spick([0xd8e2e8, 0xc8d4dc, 0xe4ecf0]), x, 0.6, z, Math.PI + lean, 0, lean); ch.bar([x, 0.99, z], [x + 0.05, 1.1, z], 0.022, 0x1a1b1e); }
  solidC(ux, uz, 0.66, 0.36, 0, 1.1, 'street');
  // cool-white (5000 K) spill onto the wet sidewalk
  anchor(kc, 1.6, 12.6, 0xe6f0ff, 2.6, 8, ['street', 'far'], 0.3); for (const x of [-12.2, -9.2, -6.2]) anchor(x, 0.7, 13.5, 0xeaf2ff, 1.4, 4.2, ['street', 'far'], 0.3);
}
function buildFarSide(ch, em) {
  // konbini under a residential block
  facadeBlock(ch, em, -14, -3.5, 14.5, 16, { face: -1, depth: 10, wall: 0x56534e, gH: 4.4 }); konbini(ch, em);
  // capsule hotel tower
  facadeBlock(ch, em, -3.4, 8, 14.5, 26, { face: -1,  depth: 12, wall: 0x4e4c49 });
  neon('カプセルホテル', 2.2, 12.5, 14.35, Math.PI, 7.0, 'cyan', { vertical: true, px: 100 }, ['far', 'street', 'facade']);
  ch.box(1.3, 7.6, 0.25, 0x16181e, 2.2, 12.5, 14.4);
  storeWindow(ch, -2.9, 7.5, 14.42, 0.15, 2.7, 'office', -1, { frame: 0x2a2826 }); anchor(2.3, 1.1, 13.3, 0xffc890, 1.8, 6, ['street', 'far'], 0.3); neon('24時間', 5.5, 3.6, 14.18, Math.PI, 0.5, 'amber', { px: 64 });
  // ramen
  facadeBlock(ch, em, 8.2, 16, 14.5, 12, { face: -1,  depth: 9, wall: 0x5e4a40 });
  ch.box(7.0, 0.5, 1.4, 0xc23b2b, 12.1, 3.0, 13.9, 0.2); storeWindow(ch, 8.7, 15.5, 14.42, 0.2, 2.45, 'ramen', -1, { frame: 0x3a2418 });
  P.noren(ch, 12.1, 2.6, 13.4, 3.0, 0.9, 0xc23b2b, 4, 0, 0xf4ece0); for (let i = 0; i < 4; i++) { P.lantern(ch, 9.2 + i * 1.9, 2.55, 13.2); P.lanternGlow(em, 9.2 + i * 1.9, 2.55, 13.2, 0xff5030, 0.9); }
  anchor(12, 2.4, 12.6, 0xff7040, 2.2, 7, ['street', 'far'], 0.3);
  // pachinko / misc
  facadeBlock(ch, em, 16.2, 30, 14.5, 18, { face: -1,  depth: 10 }); storeWindow(ch, 17, 29, 14.42, 0.15, 2.9, 'pachinko', -1); neon('パチンコ', 23, 3.9, 14.18, Math.PI, 0.9, 'mag', { px: 80, flicker: true });
  facadeBlock(ch, em, -26, -14.2, 14.5, 20, { face: -1,  depth: 10 }); storeWindow(ch, -25.2, -14.8, 14.42, 0.2, 2.6, 'izakaya', -1, { frame: 0x3a2418 }); neon('居酒屋 雨宿り', -20, 3.7, 14.18, Math.PI, 0.6, 'red', { px: 70 });
  facadeBlock(ch, em, -60, -26.2, 14.5, 24, { face: -1,  depth: 10 }); facadeBlock(ch, em, 30.2, 60, 14.5, 21, { face: -1,  depth: 10 });
  // far bridge stairs (footbridge in e_building)
}
function buildViaduct(ch, em) {
  // it runs on down the street both ways (it used to stop in mid-air at x ±60, right in the high view's vista)
  const z = 13.4, L = 200;
  for (let x = -L; x < L; x += 6) ch.box(6.02, 1.4, 4.4, 0x5a5e66, x + 3, 10.4, z);
  ch.box(2 * L, 0.5, 0.3, 0x4a4e56, 0, 11.3, z - 2.2); ch.box(2 * L, 0.5, 0.3, 0x4a4e56, 0, 11.3, z + 2.2);
  for (let x = -L; x < L; x += 3) { ch.box(0.08, 0.6, 0.08, 0x3a3e46, x, 11.6, z - 2.2); }
  for (let x = -L; x <= L; x += 16) { // pillars stand at the kerb edge of the far sidewalk, under the deck, clear of the shopfronts
    ch.box(1.0, 9.6, 1.0, 0x6a6e76, x, 4.8, 12.3); ch.box(1.16, 0.3, 1.16, 0x5a5e66, x, 0.27, 12.3); ch.box(1.2, 1.2, 3.4, 0x5a5e66, x, 9.4, 13.1);
    for (const y of [2.2, 5.4]) ch.box(1.04, 0.06, 1.04, 0x55595e, x, y, 12.3); ch.box(0.5, 0.7, 0.02, spick([0xd8cfb6, 0x3a8a8a, 0xc8402e]), x, 1.6, 11.79);
    if (Math.abs(x) < 50) solidC(x, 12.3, 1.0, 1.0, 0, 9.6, 'street'); }
  for (let x = -L; x < L; x += 12) { ch.box(0.15, 4, 0.15, 0x3a3e46, x, 13.4, z + 2.0); ch.box(0.15, 0.15, 4.4, 0x3a3e46, x, 15.3, z); }
  ch.bar([-L, 15.0, z], [L, 15.0, z], 0.03, 0x111111);
  // neon strip under the deck, and the line name
  em.box(2 * L, 0.06, 0.06, 0x33e4ff, 0, 9.66, z - 2.1);
  neon('八番線', -16, 10.4, z - 2.25, Math.PI, 0.9, 'cyan', { px: 90, lit: 0.6 }, ['street', 'far', 'facade']);
  neon('八番線', 16, 10.4, z - 2.25, Math.PI, 0.9, 'cyan', { px: 90, lit: 0.6 }, ['street', 'far', 'facade']);
  for (const x of [-40, -8, 24]) anchor(x, 9.2, 11.5, 0x8fe8ff, 1.2, 6, ['street', 'far'], 0.4);
}
function streetLamps(ch, em) {
  const lamp = (x, z, side) => {
    ch.cyl(0.07, 0.1, 6.2, 8, 0x55595e, x, 3.22, z); ch.bar([x, 6.2, z], [x, 6.6, z + side * 0.6], 0.07, 0x55595e); ch.bar([x, 6.6, z + side * 0.6], [x, 6.55, z + side * 1.5], 0.07, 0x55595e);
    ch.box(0.5, 0.12, 0.26, 0x2a2d33, x, 6.5, z + side * 1.6); em.box(0.42, 0.03, 0.2, 0xe8f6ff, x, 6.43, z + side * 1.6);
    anchor(x, 6.0, z + side * 1.6, 0xb8e0ff, 5.0, 10, ['street', 'far', 'facade'], 0.0);
    CITY.lamps.push([x, 6.4, z + side * 1.6]);
  };
  for (const x of [-22, -10, 9, 22]) lamp(x, 2.2, 1);
  for (const x of [-16, 0, 16]) lamp(x, 11.8, -1);
}

