/* ================= storefronts: painted, lit interiors behind framed glass ================= */
const STORE_TEX = {};
function storeTex(kind, wM) {
  const key = kind + '_' + Math.round(wM); if (STORE_TEX[key]) return STORE_TEX[key];
  const H = 192, W = Math.max(192, Math.min(1024, Math.round(wM / 2.2 * H)));
  const t = canvasTex(W, H, (x, w, h) => {
    const r = (a, b) => a + Math.random() * (b - a), pk = a => a[Math.floor(Math.random() * a.length)];
    const grad = (c0, c1) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.fillRect(0, 0, w, h); };
    const lights = (col, n) => { x.fillStyle = col; for (let i = 0; i < n; i++) x.fillRect((i + 0.5) * w / n - 18, 6, 36, 4); };
    const people = (n, col, y0) => { x.fillStyle = col; for (let i = 0; i < n; i++) { const px = r(20, w - 20), s = r(0.85, 1.1); x.beginPath(); x.ellipse(px, y0 - 58 * s, 9 * s, 10 * s, 0, 0, 7); x.fill(); x.fillRect(px - 13 * s, y0 - 48 * s, 26 * s, 48 * s); } };
    const shelves = (y0, y1, rows, palette, bg) => { const rh = (y1 - y0) / rows; for (let k = 0; k < rows; k++) { const yy = y0 + k * rh; x.fillStyle = bg; x.fillRect(0, yy + rh - 4, w, 4); let px = 4; while (px < w - 4) { const pw = r(5, 14), ph = r(rh * 0.35, rh * 0.85); x.fillStyle = pk(palette); x.fillRect(px, yy + rh - 4 - ph, pw, ph); px += pw + r(0.5, 3); } } };
    if (kind === 'konbini') { // ほしマート: cool-white 5000 K, rows of bare tubes, a drinks fridge wall, dense bright gondolas
      grad('#f8fcff', '#dfe9f0'); x.fillStyle = '#ffffff'; for (let i = 0; i < w; i += 64) { x.fillRect(i + 8, 4, 46, 5); x.fillRect(i + 16, 17, 32, 3); x.fillRect(i + 22, 26, 22, 2); }
      x.fillStyle = '#bcd8ea'; x.fillRect(0, 32, w, 24); for (let i = 2; i < w; i += 5) { x.fillStyle = pk(['#e8402e', '#2e7ad8', '#f0c030', '#38a858', '#ffffff', '#ff8a2a', '#30c0c8', '#f2f2ea']); x.fillRect(i, 36, 3, 16); }
      shelves(58, 178, 5, ['#e8402e', '#2e7ad8', '#f0c030', '#38a858', '#ffffff', '#ff8ab0', '#8a5a3a', '#ff8a2a', '#7a4ad8', '#30c0c8', '#ffe070'], '#a8b8c4');
      for (let a = 4; a < w; a += 118) { x.fillStyle = '#eef3f6'; x.fillRect(a, 56, 9, 124); x.fillStyle = '#e8402e'; x.fillRect(a - 2, 80, 13, 7); }
      x.fillStyle = '#e8eef2'; x.fillRect(0, 178, w, 14); people(1, 'rgba(40,48,60,.4)', 190);
    } else if (kind === 'office') { // warm 3000 K office: linear ceiling lights, blinds half down, desks, potted plants at the glass
      grad('#ffdca6', '#9a6a3a'); for (let r = 0; r < 4; r++) { x.fillStyle = r < 2 ? '#fff6dc' : '#ffe8c0'; for (let i = (r % 2) * 50; i < w; i += 120) x.fillRect(i + 10, 5 + r * 8, 92 - r * 16, 3 - (r > 1)); }
      x.fillStyle = '#c89662'; x.fillRect(0, 44, w, 60); for (let i = 20; i < w; i += 96) { x.fillStyle = '#8a6038'; x.fillRect(i, 58, 40, 46); x.fillStyle = '#e8d8b8'; x.fillRect(i + 4, 62, 14, 18); }
      for (let i = 0; i < w; i += 84) { x.fillStyle = '#5a3a20'; x.fillRect(i + 6, 122, 70, 10); x.fillStyle = '#1a1a1c'; x.fillRect(i + 22, 104, 26, 18); x.fillStyle = '#7a8a9a'; x.fillRect(i + 24, 106, 22, 13); x.fillStyle = '#4a3220'; x.fillRect(i + 10, 132, 4, 40); x.fillRect(i + 68, 132, 4, 40); }
      for (let i = 40; i < w; i += 170) { x.fillStyle = '#e4dccc'; x.fillRect(i - 11, 160, 22, 30); x.fillStyle = '#2f5a24'; for (let k = 0; k < 9; k++) { x.beginPath(); x.ellipse(i + r(-16, 16), r(112, 158), r(5, 10), r(9, 16), r(-1, 1), 0, 7); x.fill(); } }
      x.fillStyle = 'rgba(236,214,172,.6)'; for (let y = 0; y < 84; y += 6) x.fillRect(0, y, w, 3); x.fillStyle = 'rgba(120,90,60,.5)'; x.fillRect(0, 84, w, 3);
    } else if (kind === 'arcade') { // warm-lit game floor: crane games full of prizes, a change machine
      grad('#ffc878', '#6a3a1a'); lights('#fff0d0', Math.max(2, Math.round(w / 100)));
      for (let i = 8; i < w; i += 66) { x.fillStyle = '#ffeccc'; x.fillRect(i, 40, 54, 76); for (let k = 0; k < 10; k++) { x.fillStyle = pk(['#ff7ab0', '#ffe060', '#7ad0ff', '#a0ff90', '#ffffff', '#ff9a40']); x.beginPath(); x.ellipse(i + r(8, 46), r(92, 112), r(4, 8), r(4, 7), 0, 0, 7); x.fill(); } x.fillStyle = pk(['#c83a3a', '#2a5aa8', '#e8a020', '#8a3ab0']); x.fillRect(i, 116, 54, 64); x.fillRect(i, 32, 54, 9); }
      people(Math.round(w / 200) + 1, 'rgba(40,20,10,.6)', 190);
    } else if (kind === 'lobby') {
      grad('#7a5228', '#3a2410'); lights('#ffd8a0', Math.max(2, Math.round(w / 120)));
      for (let i = 0; i < w * 0.45; i += 18) for (let j = 0; j < 6; j++) { x.fillStyle = (i + j) % 3 ? '#5a3a1e' : '#6a4a2a'; x.fillRect(10 + i, 40 + j * 18, 16, 16); x.fillStyle = '#d8b880'; x.fillRect(22 + i, 46 + j * 18, 2, 4); }
      x.fillStyle = '#2a1a10'; x.fillRect(w * 0.55, 118, w * 0.35, 60); x.fillStyle = '#ffe0a0'; x.fillRect(w * 0.55, 118, w * 0.35, 4);
      x.fillStyle = '#3a8a8a'; x.fillRect(w * 0.93, 60, 22, 110); people(Math.round(w / 300) + 1, 'rgba(30,20,12,.6)', 186);
    } else if (kind === 'ramen' || kind === 'izakaya') {
      grad(kind === 'ramen' ? '#ffb060' : '#d86a3a', '#5a2a14'); for (let i = 0; i < w; i += 60) { x.fillStyle = '#efe0c0'; x.fillRect(i + 8, 20, 22, 70); x.fillStyle = '#3a2010'; for (let k = 0; k < 4; k++) x.fillRect(i + 15, 28 + k * 15, 8, 9); }
      if (kind === 'izakaya') for (let i = 0; i < w; i += 46) { x.fillStyle = '#ff4a2a'; x.beginPath(); x.ellipse(i + 23, 26, 12, 16, 0, 0, 7); x.fill(); }
      x.fillStyle = '#3a2010'; x.fillRect(0, 112, w, 18); x.fillStyle = '#5a3418'; x.fillRect(0, 130, w, 62);
      for (let i = 30; i < w; i += 56) { x.fillStyle = '#2a140a'; x.fillRect(i - 8, 150, 16, 6); x.fillRect(i - 2, 156, 4, 30); }
      people(Math.round(w / 110), 'rgba(30,14,6,.75)', 160); x.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(r(0, w), r(60, 110), r(10, 24), r(16, 30), 0, 0, 7); x.fill(); }
    } else if (kind === 'pachinko') {
      grad('#2a0a4a', '#120420'); for (let i = 6; i < w; i += 34) { x.fillStyle = '#3a1a5a'; x.fillRect(i, 36, 28, 140); x.fillStyle = pk(['#ff3d9a', '#33e4ff', '#ffe05a', '#7a3aff']); x.fillRect(i + 4, 44, 20, 26); x.fillStyle = '#d8d0e8'; for (let k = 0; k < 9; k++) x.fillRect(i + 4 + r(0, 18), 76 + r(0, 50), 2, 2); x.fillStyle = '#c8a040'; x.fillRect(i + 2, 150, 24, 10); }
      people(Math.round(w / 140), 'rgba(10,4,20,.7)', 190);
    } else if (kind === 'cleaning') {
      grad('#eaf6ff', '#b8d0e0'); lights('#ffffff', Math.max(2, Math.round(w / 100))); x.fillStyle = '#6a7a86'; x.fillRect(0, 40, w, 3);
      for (let i = 4; i < w; i += 9) { x.fillStyle = pk(['#2a3a5a', '#e8e8e0', '#5a2a2a', '#3a5a3a', '#c8b8a0', '#1a1a1c']); x.fillRect(i, 43, 7, r(70, 110)); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(i, 43, 7, 120); }
      x.fillStyle = '#d8e0e8'; x.fillRect(w * 0.1, 140, w * 0.5, 52);
    } else if (kind === 'books') {
      grad('#ffe0b0', '#a87a4a'); lights('#fff0d0', Math.max(2, Math.round(w / 110)));
      shelves(28, 176, 5, ['#8a2a2a', '#2a4a8a', '#3a6a3a', '#d8c8a0', '#6a3a6a', '#c86a2a', '#1a1a1c', '#e8e0d0'], '#5a3a1e');
      x.fillStyle = 'rgba(90,58,30,.85)'; x.fillRect(w * 0.3, 140, w * 0.4, 52); people(Math.round(w / 260) + 1, 'rgba(40,24,10,.55)', 190);
    } else if (kind === 'drug') {
      grad('#f8fff8', '#d0e8d8'); lights('#ffffff', Math.max(3, Math.round(w / 90)));
      shelves(36, 170, 4, ['#ffffff', '#38a858', '#2e7ad8', '#f0c030', '#e8402e', '#ffd8e8'], '#9ab0a0'); x.fillStyle = '#30c070'; x.fillRect(0, 22, w, 8);
    } else { grad('#ffe0b0', '#7a5a3a'); people(2, 'rgba(30,20,10,.6)', 188); }
    // glass sheen + slight vignette at the frame
    const sh = x.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.05)'); x.fillStyle = sh; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 8; x.strokeRect(0, 0, w, h);
  });
  STORE_TEX[key] = t; return t;
}
// a lit storefront: painted interior behind mullioned glass, a door, a sill. face: +1 looks toward +z, -1 toward -z
function storeWindow(ch, x0, x1, zf, y0, y1, kind, face, o) {
  o = o || {}; const w = x1 - x0, cx = (x0 + x1) / 2, h = y1 - y0, s = face || 1, k = o.k || 0.85;
  const m = new THREE.Mesh(gPlaneIdx(), new THREE.MeshBasicMaterial({ map: storeTex(kind, w), color: new THREE.Color(k, k, k), fog: true }));
  m.scale.set(w, h, 1); m.position.set(cx, (y0 + y1) / 2, zf - s * 0.06); if (s < 0) m.rotation.y = Math.PI; m.layers.enable(1); CITY.group.add(m);
  const fz = zf + s * 0.01, col = o.frame || 0x2a2c31;
  ch.box(w + 0.1, 0.08, 0.1, col, cx, y1 + 0.04, fz); ch.box(w + 0.16, 0.1, 0.22, 0x4a4c52, cx, y0 - 0.05, zf + s * 0.06);
  const n = Math.max(1, Math.round(w / 1.3)); for (let i = 0; i <= n; i++) ch.box(0.06, h, 0.08, col, x0 + i * w / n, (y0 + y1) / 2, fz);
  ch.box(w, 0.04, 0.06, col, cx, y0 + h * 0.72, fz);
  if (o.door !== false) { const dx = o.doorX == null ? x0 + w / n * 0.5 : o.doorX; ch.box(0.04, 0.32, 0.04, C.steel, dx + 0.3 * s, y0 + 1.05, zf + s * 0.05); ch.box(0.5, 0.012, 0.3, 0x3a3c42, dx, 0.13, zf + s * 0.2); }
}

