/* ================= the exterior: one restoration, start → final =================
   Every visible part of the shop front is driven by EXT(), which is derived only from the save (flags, chapter, upgrades),
   so any save lands on the right stage. Each exterior upgrade swaps an old feature out for a new one (gauntlet/UPGRADE_MAP.md). */
function EXT() {
  const f = S.flags;
  return {
    open: !!f.shutterUp, lit: !!f.power, noren: !!f.signHung,
    menu: !!lv('menu'), lanterns: !!lv('lanterns'), awning: !!lv('awning'), bench: !!lv('bench'), vending: !!lv('vending'), street: !!lv('neon'), gutter: !!lv('gutter'),
    f2: S.ch >= 2, clad: !!lv('cladding'), planters: !!lv('planters'),
    stall: S.ch >= 3, stallLamp: !!lv('yatainoren'), koi: !!lv('koi'),
    f3: S.ch >= 4, green: !!lv('greenwall'), roof: S.ch >= 5, sign: !!lv('bigsign'),
  };
}
const EXT_TEX = {};
function extTex(key, w, h, draw) { return EXT_TEX[key] || (EXT_TEX[key] = canvasTex(w, h, draw)); }
// organic value-noise fBm for the weathering textures (deterministic per seed)
function extNoise(seed) {
  const hs = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(hs(i, j), hs(i + 1, j), u), lerp(hs(i, j + 1), hs(i + 1, j + 1), u), v); };
  return (x, y, o) => { o = o || 4; let a = 0, s = 0.5, f = 1, t = 0; for (let k = 0; k < o; k++) { a += vn(x * f + k * 17.3, y * f + k * 5.1) * s; t += s; s *= 0.5; f *= 2.03; } return a / t; };
}
// a run of rust or grime: starts at (X, Y) px and trickles down, thinning, fading and wandering a little
function extDrip(x, R, X, Y, len, wd, rgb, a) {
  let cx = X; for (let t = 0; t < len; t += 2) { const k = t / len, ww = Math.max(0.7, wd * (1 - 0.6 * k)); cx += (R() - 0.5) * 0.6; x.fillStyle = `rgba(${rgb},${(a * Math.pow(1 - k, 1.3) * (0.7 + 0.3 * R())).toFixed(3)})`; x.fillRect(cx - ww / 2, Y + t, ww, 2.2); }
}
// a torn, aged paper: jagged outline (jag per side: top, right, bottom, left), yellowed, water-stained, rust bleeding through
function extPaper(x, R, px, py, pw, ph, a, col, jag, fn) {
  x.save(); x.translate(px, py); x.rotate(a); x.beginPath();
  const side = (x0, y0, x1, y1, j) => { for (let i = 0; i < 12; i++) { const t = i / 12; x.lineTo(lerp(x0, x1, t) + (R() - 0.5) * j, lerp(y0, y1, t) + (R() - 0.5) * j); } };
  x.moveTo(-pw / 2, -ph / 2); side(-pw / 2, -ph / 2, pw / 2, -ph / 2, jag[0]); side(pw / 2, -ph / 2, pw / 2, ph / 2, jag[1]); side(pw / 2, ph / 2, -pw / 2, ph / 2, jag[2]); side(-pw / 2, ph / 2, -pw / 2, -ph / 2, jag[3]); x.closePath();
  x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 3; x.shadowOffsetY = 1.5; x.fillStyle = col; x.fill(); x.restore(); x.clip();
  if (fn) fn(-pw / 2, -ph / 2, pw, ph);
  const sg = x.createLinearGradient(0, -ph / 2, 0, ph / 2); sg.addColorStop(0, 'rgba(120,86,36,0.38)'); sg.addColorStop(0.3, 'rgba(150,120,60,0.06)'); sg.addColorStop(0.75, 'rgba(120,96,50,0.12)'); sg.addColorStop(1, 'rgba(60,44,28,0.42)'); x.fillStyle = sg; x.fillRect(-pw, -ph, pw * 2, ph * 2);
  for (let i = 0; i < 7; i++) { const cx = (R() - 0.5) * pw, cy = (R() - 0.5) * ph, r = 3 + R() * pw * 0.35, rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, 'rgba(112,78,36,0.26)'); rg.addColorStop(1, 'rgba(112,78,36,0)'); x.fillStyle = rg; x.fillRect(cx - r, cy - r, r * 2, r * 2); }
  for (let i = 0; i < 5; i++) extDrip(x, R, (R() - 0.5) * pw, -ph / 2 + R() * ph * 0.3, ph * (0.2 + R() * 0.7), 1 + R() * 2.5, '112,62,26', 0.32);
  x.restore();
}
// rusted roll shutter: dark galvanised steel, fine slats, rust worst at upper right; torn posters, the lease notice and a tag
function shutterTex() {
  return extTex('shutter2', 768, 408, (x, w, h) => {
    const R = texRng(1919), N = extNoise(3.1), img = x.createImageData(w, h), d = img.data;
    for (let py = 0; py < h; py++) {
      const sp = py % 6, slat = sp === 0 ? 1.3 : sp === 1 ? 1.12 : sp === 4 ? 0.8 : sp === 5 ? 0.5 : 1.0, v = py / h;
      for (let px = 0; px < w; px++) {
        const u = px / w, mott = N(px / 90, py / 46, 3), rn = N(px / 34 + 9, py / 15, 4);
        const zone = Math.max(smoothstep(0.42, 0.95, u) * smoothstep(0.78, 0.05, v), 0.55 * smoothstep(0.8, 1, v), 0.6 * smoothstep(0.05, 0, u), 0.6 * smoothstep(0.95, 1, u), 0.35 * smoothstep(0.25, 0, v));
        let rust = smoothstep(0.68 - zone * 0.26, 0.8 - zone * 0.26, rn) * (0.25 + 0.6 * zone); if (sp >= 4) rust = Math.min(1, rust * 1.4);
        let r = 96 + mott * 26, g = 90 + mott * 25, b = 84 + mott * 24;
        r = lerp(r, 86 + rn * 30, rust); g = lerp(g, 54 + rn * 12, rust); b = lerp(b, 38 + rn * 6, rust);
        const k = slat * (0.9 + 0.18 * N(px / 300, py / 5, 2)) * (1 - 0.35 * smoothstep(0.78, 1, v));
        const o = (py * w + px) * 4; d[o] = r * k; d[o + 1] = g * k; d[o + 2] = b * k; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    // rust runs: heavy from the head box at upper right, more from slat seams there; thin grime runs elsewhere
    for (let i = 0; i < 140; i++) { const u = Math.pow(R(), 0.5), X = w * (0.25 + 0.75 * u), Y = R() < 0.55 ? R() * 6 : R() * h * 0.55; extDrip(x, R, X, Y, 15 + R() * 190 * u, 1 + R() * 3.5 * u, R() < 0.5 ? '96,54,28' : '74,42,24', 0.22 + R() * 0.38); }
    for (let i = 0; i < 50; i++) extDrip(x, R, R() * w, R() * h * 0.6, 20 + R() * 90, 1 + R() * 2, '34,30,28', 0.1 + R() * 0.14);
    // layered cluster of torn posters, left of centre
    const txt = (X, Y, pw, ph, n, col) => { x.fillStyle = col || 'rgba(50,40,32,0.55)'; for (let i = 0; i < n; i++) x.fillRect(X + pw * 0.12, Y + ph * (0.3 + i * 0.6 / n), pw * (0.35 + R() * 0.45), 2); };
    extPaper(x, R, 168, 196, 78, 104, -0.03, '#c4ab72', [3, 4, 16, 5], (X, Y, pw, ph) => { x.fillStyle = 'rgba(150,52,36,0.6)'; x.fillRect(X + 6, Y + 8, pw - 12, 20); x.fillStyle = 'rgba(60,40,30,0.5)'; x.fillRect(X + 10, Y + 34, pw * 0.5, pw * 0.4); txt(X, Y + 20, pw, ph - 20, 5); });
    extPaper(x, R, 226, 214, 60, 84, 0.05, '#d2bf88', [10, 4, 12, 3], (X, Y, pw, ph) => { x.fillStyle = 'rgba(40,34,30,0.6)'; x.font = `bold 15px ${FONT_BRUSH}`; x.textAlign = 'center'; x.fillText('祭', 0, Y + 24); txt(X, Y + 16, pw, ph - 16, 6); });
    extPaper(x, R, 140, 252, 44, 40, 0.1, '#b89c62', [6, 8, 8, 6], (X, Y, pw, ph) => txt(X, Y, pw, ph, 3));
    extPaper(x, R, 200, 150, 34, 20, -0.18, '#d6caa4', [6, 6, 6, 6]); extPaper(x, R, 252, 262, 24, 18, 0.3, '#c9b88e', [6, 6, 6, 6]); extPaper(x, R, 122, 188, 14, 34, 0, '#c8b68a', [4, 4, 6, 4]);
    x.fillStyle = 'rgba(214,206,178,0.55)'; x.fillRect(150, 141, 30, 7); x.fillRect(236, 168, 24, 6);
    // tan lease notice, centre, taped at the corners
    extPaper(x, R, 403, 200, 92, 110, 0.01, '#c4aa7c', [2, 2, 4, 2], (X, Y, pw, ph) => {
      x.fillStyle = 'rgba(42,32,24,0.82)'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold 22px ${FONT_BRUSH}`; x.fillText('貸店舗', 0, Y + 20); x.font = `8px ${FONT_UI}`; x.fillText('テナント募集', 0, Y + 37);
      txt(X, Y + 26, pw, ph - 46, 6, 'rgba(42,32,24,0.5)'); x.font = `9px ${FONT_DOT}`; x.fillStyle = 'rgba(42,32,24,0.75)'; x.fillText('03-8•••-21••', 0, Y + ph - 12);
    });
    x.fillStyle = 'rgba(222,214,188,0.5)'; for (const [tx, ty] of [[357, 145], [449, 147], [358, 255], [448, 253]]) x.fillRect(tx - 9, ty - 4, 18, 8);
    // black spray tag, lower right, with drips
    x.save(); x.strokeStyle = 'rgba(12,10,12,0.92)'; x.lineCap = 'round'; x.lineJoin = 'round'; x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 3; x.lineWidth = 5;
    x.beginPath(); x.moveTo(574, 272); x.bezierCurveTo(556, 232, 600, 208, 612, 238); x.bezierCurveTo(620, 262, 578, 266, 600, 292); x.stroke();
    x.beginPath(); x.ellipse(642, 250, 18, 27, 0.2, 0, 7); x.stroke(); x.beginPath(); x.moveTo(628, 274); x.quadraticCurveTo(650, 302, 674, 282); x.stroke();
    x.beginPath(); x.moveTo(692, 292); x.bezierCurveTo(660, 252, 680, 214, 702, 240); x.bezierCurveTo(722, 214, 746, 252, 707, 294); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.moveTo(560, 304); x.bezierCurveTo(620, 296, 682, 314, 738, 292); x.stroke(); x.restore();
    for (const [dx, dy] of [[600, 292], [644, 278], [707, 294], [574, 272], [690, 300]]) extDrip(x, R, dx, dy, 8 + R() * 22, 2.2, '12,10,12', 0.85);
    extPaper(x, R, 652, 336, 26, 36, 0.04, '#c8bc98', [4, 3, 8, 3], (X, Y, pw, ph) => txt(X, Y, pw, ph, 3));
    // the wet, dark foot of the shutter
    const bg = x.createLinearGradient(0, h * 0.84, 0, h); bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(8,6,6,0.6)'); x.fillStyle = bg; x.fillRect(0, h * 0.84, w, h * 0.16);
  });
}
// the rusty cream signboard band over the shutter, with the faint ghost of the old shop name
function bandTex() {
  return extTex('band2', 1024, 160, (x, w, h) => {
    const R = texRng(2323), N = extNoise(7.7), img = x.createImageData(w, h), d = img.data;
    const p0 = 0.115 * w, p1 = 0.8 * w, q0 = 0.17 * h, q1 = 0.86 * h;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const inP = px > p0 && px < p1 && py > q0 && py < q1, n = N(px / 46, py / 22, 4), m = N(px / 220, py / 70, 3);
      const edge = inP ? Math.max(smoothstep(18, 0, Math.min(px - p0, p1 - px)), smoothstep(12, 0, Math.min(py - q0, q1 - py))) : 0;
      const rust = smoothstep(0.6, 0.8, n + 0.3 * edge + 0.1 * (py / h) + (inP ? -0.12 : 0.1) + 0.08 * smoothstep(0.5, 1, px / w));
      const gr = 0.8 + 0.32 * m - 0.18 * (py / h);
      let r = inP ? 194 : 78, g = inP ? 190 : 76, b = inP ? 148 : 74; r = lerp(r * gr, 96 + 24 * n, rust); g = lerp(g * gr, 60 + 10 * n, rust); b = lerp(b * gr, 40, rust);
      const o = (py * w + px) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.strokeStyle = 'rgba(28,22,18,0.65)'; x.lineWidth = 3; x.strokeRect(p0, q0, p1 - p0, q1 - q0); x.strokeStyle = 'rgba(230,220,190,0.18)'; x.lineWidth = 1; x.strokeRect(p0 + 3, q0 + 3, p1 - p0 - 6, q1 - q0 - 6);
    for (const sx of [0.88 * w, 0.95 * w]) { x.fillStyle = 'rgba(20,18,16,0.5)'; x.fillRect(sx, 0, 2, h); }
    x.fillStyle = 'rgba(112,100,80,0.26)'; x.font = `bold 60px ${FONT_BRUSH}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('青 山 商 店', (p0 + p1) / 2, (q0 + q1) / 2 + 2);
    for (const [bx, by] of [[p0 + 14, q0 + 12], [p1 - 14, q0 + 12], [p0 + 14, q1 - 12], [p1 - 14, q1 - 12], [(p0 + p1) / 2, q0 + 12], [(p0 + p1) / 2, q1 - 12]]) { x.fillStyle = '#1a1410'; x.beginPath(); x.arc(bx, by, 3.5, 0, 7); x.fill(); extDrip(x, R, bx, by + 3, 25 + R() * 50, 3, '110,54,22', 0.6); }
    for (let i = 0; i < 110; i++) { const X = R() * w, top = R() < 0.6; extDrip(x, R, X, top ? 0 : q0 + R() * 30, 8 + R() * (top ? 120 : 70), 1 + R() * 3, R() < 0.5 ? '96,54,28' : '74,48,30', 0.18 + R() * 0.32); }
    const bg = x.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, 'rgba(0,0,0,0.35)'); bg.addColorStop(0.12, 'rgba(0,0,0,0)'); bg.addColorStop(0.9, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,0.4)'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  });
}
// the old siding's weathering, laid over the corrugation as a transparent decal: rust runs from sills,
// trim bands and the roofline, a few big stains, panel seams; with ply, the boarded 2F openings get their plywood grain and stains
const EXT_HOLES = () => { const F = BLD.F; return [[-1.95, 0.35, F[1] + 0.45, F[1] + 2.55], [0.75, 1.95, F[1], F[1] + 2.35], [-2.25, -0.35, F[2] + 0.75, F[2] + 2.35], [0.35, 2.25, F[2] + 0.75, F[2] + 2.35]]; };
function sidingGrimeTex(ply) {
  return extTex(ply ? 'grimeP' : 'grime', 512, 1048, (x, w, h) => {
    const F = BLD.F, S = w / 5.44, V = h / 11.12, X = m => (m + 2.72) * S, Y = m => (11.12 - m) * V, holes = EXT_HOLES();
    const R = texRng(514), N = extNoise(5.3), img = x.createImageData(w, h), d = img.data;
    const stains = [[-2.25, 9.6, 0.5], [2.2, 7.15, 0.45], [-2.3, 4.7, 0.42], [0.1, 6.4, 0.34], [1.1, 10.55, 0.55], [2.4, 3.95, 0.3], [-1.3, 7.2, 0.3]];
    for (let py = 0; py < h; py++) {
      const my = 11.12 - py / V;
      for (let px = 0; px < w; px++) {
        const mx = px / S - 2.72, n = N(px / 22, py / 34, 4), m = N(px / 110 + 3, py / 170, 3), c = N(px / 40 + 11, py / 90, 3);
        // soot and water-staining (dark), chalky weathered paint (light), corners grimier
        let ag = clamp(0.3 * (0.62 - m) / 0.3, 0, 0.3) + 0.22 * smoothstep(0.3, 0, Math.min(mx + 2.7, 2.7 - mx));
        const al = 0.16 * smoothstep(0.55, 0.75, c) * (1 - ag);
        let ar = 0; for (const [sx, sy, sr] of stains) { const dd = Math.hypot((mx - sx) / sr, (my - sy) / (sr * 1.6)); ar = Math.max(ar, smoothstep(1.0, 0.25, dd + (n - 0.5) * 1.1)); }
        ar *= 0.78;
        // composite: rust over (light weathering over dark grime)
        let a = al + ag * (1 - al), r = (110 * al + 10 * ag * (1 - al)), g = (122 * al + 12 * ag * (1 - al)), b = (134 * al + 16 * ag * (1 - al));
        const rr = lerp(104, 70, n), rg = lerp(58, 40, n), rb = lerp(32, 26, n);
        r = rr * ar + r * (1 - ar); g = rg * ar + g * (1 - ar); b = rb * ar + b * (1 - ar); a = ar + a * (1 - ar);
        const o = (py * w + px) * 4; if (a > 0.001) { d[o] = r / a; d[o + 1] = g / a; d[o + 2] = b / a; } d[o + 3] = a * 255;
      }
    }
    x.putImageData(img, 0, 0);
    // panel seams: every board edge, the overlap side darker
    for (let bx = -2.7, i = 0; bx < 2.7; bx += 0.15, i++) { x.fillStyle = i % 2 === 0 ? 'rgba(8,10,14,0.6)' : 'rgba(8,10,14,0.3)'; x.fillRect(X(bx) - 1, 0, 2, h); if (i % 2 === 0) { x.fillStyle = 'rgba(120,132,146,0.18)'; x.fillRect(X(bx) + 1, 0, 1.5, h); } }
    // rust runs from sills, trims, the roofline and the bracket; grey water runs between them
    const run = (x0, x1, ym, n, lmin, lmax, wmax) => { for (let i = 0; i < n; i++) { const xx = X(lerp(x0, x1, R())), L = lerp(lmin, lmax, Math.pow(R(), 1.7)) * V; extDrip(x, R, xx, Y(ym), L, 1 + R() * wmax, R() < 0.55 ? '112,58,28' : '86,50,32', 0.35 + R() * 0.45); } };
    for (const [a, b, c] of [holes[0], holes[2], holes[3]]) { run(a + 0.05, b - 0.05, c - 0.04, 26, 0.08, 0.7, 3); for (const ex of [a, b]) run(ex - 0.06, ex + 0.06, c - 0.04, 4, 0.4, 1.0, 4); }
    run(-2.68, 2.68, F[2] - 0.17, 46, 0.08, 1.1, 3); run(-2.68, 2.68, F[3] - 0.14, 46, 0.08, 1.1, 3); run(-2.68, 2.68, F[3] + 1.06, 60, 0.1, 1.4, 3.5);
    run(-2.36, -2.24, F[1] + 2.8, 5, 0.3, 0.9, 2.5);
    for (let i = 0; i < 70; i++) extDrip(x, R, X(lerp(-2.68, 2.68, R())), Y([F[2] - 0.17, F[3] - 0.14, F[3] + 1.06][R() * 3 | 0]), (0.3 + R() * 1.6) * V, 1 + R() * 3, '12,14,18', 0.15 + R() * 0.2);
    // keep the openings and the shop front clean
    for (const [a, b, c, e] of holes) x.clearRect(X(a), Y(e), X(b) - X(a), Y(c) - Y(e));
    x.clearRect(X(-2.45), Y(3.5), X(2.45) - X(-2.45), h - Y(3.5)); x.clearRect(0, 0, X(-2.7), h); x.clearRect(X(2.7), 0, w - X(2.7), h);
    if (ply) { // plywood sheets: vertical grain, sheet seams, nail rows, water stains from the top, darker wet foot
      const PN = extNoise(9.1), PR = texRng(77);
      for (const [hi, [a, b, c, e]] of [holes[0], holes[1]].entries()) {
        const X0 = Math.round(X(a)), X1 = Math.round(X(b)), Y0 = Math.round(Y(e)), Y1 = Math.round(Y(c)), pw = X1 - X0, ph = Y1 - Y0, pi = x.createImageData(pw, ph), pd = pi.data;
        for (let py = 0; py < ph; py++) for (let px = 0; px < pw; px++) {
          const v = py / ph, gx = px + PN(px / 9 + hi * 7, py / 70, 3) * 14, gr = 0.5 + 0.5 * Math.sin(gx * 0.85 + Math.sin(py / 23 + gx * 0.05) * 1.6), st = PN(px / 26 + 40, py / 30, 4);
          let k = 0.9 + 0.08 * gr + 0.1 * (PN(px / 60, py / 60, 3) - 0.5); k *= 1 - 0.4 * smoothstep(0.3, 0, v) * smoothstep(0.3, 0.7, st); k *= 1 - 0.3 * smoothstep(0.82, 1, v); k *= 1 - 0.3 * smoothstep(0.62, 0.78, st);
          const o = (py * pw + px) * 4; pd[o] = 40; pd[o + 1] = 26; pd[o + 2] = 14; pd[o + 3] = clamp(1 - k, 0, 1) * 255;
        }
        x.putImageData(pi, X0, Y0);
        x.fillStyle = 'rgba(30,22,16,0.8)'; const seams = hi === 0 ? [1 / 3, 2 / 3] : [0.5]; for (const sf of seams) x.fillRect(X0 + pw * sf - 1, Y0, 2, ph);
        if (hi === 0) x.fillRect(X0, Y0 + ph * 0.42, pw, 2);
        x.fillStyle = 'rgba(20,16,12,0.85)'; for (const sf of [0, 1].concat(seams)) for (let ny = Y0 + 6; ny < Y1 - 4; ny += 11) x.fillRect(X0 + pw * sf + (sf === 1 ? -5 : sf === 0 ? 3 : -4 + (ny % 2) * 6), ny, 1.6, 1.6);
        for (let i = 0; i < 18; i++) extDrip(x, PR, X0 + PR() * pw, Y0, ph * (0.1 + PR() * 0.5), 2 + PR() * 5, '40,28,18', 0.3);
      }
    }
  });
}
// wet sheen on the old siding (additive): broken highlights down the corrugation crests where the rain sheets over them
function sidingSheenTex() {
  return extTex('sheen', 512, 1048, (x, w, h) => {
    const S = w / 5.44, V = h / 11.12, N = extNoise(2.2), img = x.createImageData(w, h), d = img.data, holes = EXT_HOLES();
    for (let py = 0; py < h; py++) {
      const my = 11.12 - py / V;
      for (let px = 0; px < w; px++) {
        const mx = px / S - 2.72, bi = Math.floor((mx + 2.7) / 0.15), f = (mx + 2.7) / 0.15 - bi, ridge = (bi & 1) === 0;
        const prof = ridge ? Math.exp(-Math.pow((f - 0.72) / 0.1, 2)) + 0.35 * Math.exp(-Math.pow((f - 0.2) / 0.08, 2)) : 0.25 * Math.exp(-Math.pow((f - 0.35) / 0.12, 2));
        const s = smoothstep(0.32, 0.78, N(px / 10, py / 200, 3)) * (0.55 + 0.45 * smoothstep(0, 0.35, (my % 3.2) / 3.2));
        let vv = prof * s; if (Math.abs(mx) > 2.7 || (my < 3.5 && Math.abs(mx) < 2.45) || holes.some(hh => mx > hh[0] && mx < hh[1] && my > hh[2] && my < hh[3])) vv = 0;
        const o = (py * w + px) * 4; d[o] = 150 * vv; d[o + 1] = 162 * vv; d[o + 2] = 186 * vv; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
  });
}
// indigo noren with a white water-drop crest
function frontNorenTex() {
  return extTex('fnoren', 256, 192, (x, w, h) => {
    x.fillStyle = '#1a2a5a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)'; x.fillRect(Math.random() * w, Math.random() * h, 1, 3 + Math.random() * 8); }
    x.fillStyle = '#121d42'; x.fillRect(0, 0, w, 16);
    const cx = w / 2, cy = h * 0.5; x.strokeStyle = '#ecebe4'; x.lineWidth = 5; x.beginPath(); x.arc(cx, cy, 44, 0, 7); x.stroke();
    x.fillStyle = '#ecebe4'; x.beginPath(); x.moveTo(cx, cy - 32); x.bezierCurveTo(cx + 10, cy - 16, cx + 24, cy, cx + 22, cy + 12); x.arc(cx, cy + 12, 22, 0, Math.PI); x.bezierCurveTo(cx - 24, cy, cx - 10, cy - 16, cx, cy - 32); x.fill();
    x.fillStyle = '#1a2a5a'; x.beginPath(); x.ellipse(cx - 8, cy + 10, 5, 9, 0.4, 0, 7); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(w / 2 - 1, 16, 2, h);
  });
}
function aBoardTex() {
  return extTex('aboard', 160, 224, (x, w, h) => {
    x.fillStyle = '#1c2622'; x.fillRect(0, 0, w, h); const ch = '#f2efe4', wm = '#ffc98a', pk = '#ff9cc0';
    x.fillStyle = ch; x.font = `bold 22px ${FONT_CHALKJ}`; x.textAlign = 'center'; x.fillText('本日のお茶', w / 2, 30);
    const cup = (cx, cy, col) => { x.strokeStyle = ch; x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx - 16, cy - 12); x.lineTo(cx - 11, cy + 12); x.lineTo(cx + 11, cy + 12); x.lineTo(cx + 16, cy - 12); x.stroke(); x.fillStyle = col; x.fillRect(cx - 14, cy - 10, 28, 6); for (const s of [-6, 0, 6]) { x.beginPath(); x.moveTo(cx + s, cy - 16); x.quadraticCurveTo(cx + s - 5, cy - 24, cx + s, cy - 30); x.stroke(); } };
    cup(46, 76, '#8ccf3c'); cup(112, 76, '#c08a52'); x.font = `15px ${FONT_CHALKJ}`; x.fillStyle = ch; x.fillText('抹茶', 46, 112); x.fillText('ほうじ茶', 112, 112);
    x.fillStyle = wm; x.fillText('¥1200', 46, 130); x.fillText('¥520', 112, 130);
    x.strokeStyle = 'rgba(242,239,228,0.6)'; x.setLineDash([6, 4]); x.beginPath(); x.moveTo(14, 146); x.lineTo(w - 14, 146); x.stroke(); x.setLineDash([]);
    x.fillStyle = pk; x.font = `bold 17px ${FONT_CHALKJ}`; x.fillText('雨の日 サービス', w / 2, 172); x.fillStyle = ch; x.font = `14px ${FONT_CHALKJ}`; x.fillText('どうぞ ごゆっくり', w / 2, 200);
  });
}
function newspaperTex() {
  return extTex('paper', 96, 64, (x, w, h) => { x.fillStyle = '#c8c4b8'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a3836'; x.font = `bold 13px ${FONT_UI}`; x.fillText('甘瀬新聞', 6, 16); for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(40,38,36,0.55)'; x.fillRect(6, 24 + i * 6, 40, 2); x.fillRect(52, 24 + i * 6, 38, 2); } x.fillStyle = 'rgba(80,80,90,0.5)'; x.fillRect(52, 6, 36, 14); });
}
// dusty top-floor glass (before the chapter 4 renovation): dark, reflecting the sky and the towers, streaked by rain; a torn curtain behind one
function glass3Tex(i) {
  return extTex('glass3' + i, 256, 214, (x, w, h) => {
    const R = texRng(91 + i * 13), N = extNoise(11 + i);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3c3656'); g.addColorStop(0.35, '#22223a'); g.addColorStop(1, '#0e1018'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (i === 1) { // torn curtain hanging behind the right window
      x.save(); x.beginPath(); x.moveTo(18, 0); x.lineTo(150, 0); for (let k = 0; k <= 12; k++) x.lineTo(150 - k * 11, 120 + Math.sin(k * 1.7) * 18 + R() * 30 + (k > 6 && k < 9 ? 50 : 0)); x.closePath();
      const cg = x.createLinearGradient(18, 0, 150, 0); for (let k = 0; k <= 8; k++) cg.addColorStop(k / 8, k % 2 ? 'rgba(120,112,100,0.5)' : 'rgba(84,78,70,0.5)'); x.fillStyle = cg; x.fill(); x.restore();
    }
    // reflected towers and their lit windows
    for (let b = 0; b < 7; b++) { const bx = R() * w, bw = 20 + R() * 40, top = h * (0.25 + R() * 0.35); x.fillStyle = 'rgba(10,10,18,0.55)'; x.fillRect(bx, top, bw, h - top); x.fillStyle = R() < 0.5 ? 'rgba(255,200,120,0.35)' : 'rgba(150,170,255,0.3)'; for (let k = 0; k < 14; k++) if (R() < 0.4) x.fillRect(bx + 3 + (k % 4) * (bw / 4), top + 6 + (k >> 2) * 9, 2.5, 3); }
    const hg = x.createLinearGradient(0, 0, w, h); hg.addColorStop(0, 'rgba(170,170,220,0.0)'); hg.addColorStop(0.4, 'rgba(170,170,220,0.12)'); hg.addColorStop(0.55, 'rgba(170,170,220,0.0)'); x.fillStyle = hg; x.fillRect(0, 0, w, h);
    // grime film, thicker toward the bottom corners
    const img = x.getImageData(0, 0, w, h), d = img.data;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) { const o = (py * w + px) * 4, n = N(px / 30, py / 30, 3), k = 0.82 + 0.3 * n - 0.25 * smoothstep(0.6, 1, py / h) * smoothstep(0.3, 0, Math.min(px, w - px) / w); d[o] *= k; d[o + 1] *= k; d[o + 2] *= k; }
    x.putImageData(img, 0, 0);
    // rain running down the glass
    for (let k = 0; k < 70; k++) { const X = R() * w, Y = R() * h * 0.7, L = 10 + R() * 70; x.fillStyle = 'rgba(180,190,225,0.2)'; let cx = X; for (let t = 0; t < L; t += 3) { cx += (R() - 0.5) * 1.2; x.fillRect(cx, Y + t, 1, 3); } x.fillStyle = 'rgba(210,220,255,0.45)'; x.fillRect(cx - 0.5, Y + L, 2, 2.5); }
  });
}
// warm, lived-in room behind the renovated top-floor windows
function room3Tex(i) {
  return extTex('room3' + i, 256, 214, (x, w, h) => {
    const R = texRng(301 + i * 7), lx = i ? 150 : 100;
    const g = x.createRadialGradient(lx, 50, 6, lx, 70, 230); g.addColorStop(0, '#ffe2a8'); g.addColorStop(0.25, '#f2b064'); g.addColorStop(0.7, '#b86a2c'); g.addColorStop(1, '#6a3818'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(90,46,18,0.55)'; x.fillRect(0, 0, w, 16); for (let k = 0; k < 3; k++) x.fillRect(0, 16 + k * 3 + R() * 2, w, 1);
    x.fillStyle = 'rgba(70,36,14,0.6)'; x.fillRect(i ? 18 : 170, 70, 64, 6); for (let k = 0; k < 6; k++) x.fillRect((i ? 22 : 174) + k * 10, 52 + R() * 8, 6, 18 - R() * 6);
    x.fillStyle = 'rgba(255,240,200,0.95)'; x.beginPath(); x.ellipse(lx, 44, 14, 9, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(80,40,16,0.8)'; x.fillRect(lx - 1, 16, 2, 26);
    x.fillStyle = 'rgba(250,226,180,0.55)'; x.fillRect(0, 0, 26, h); x.fillRect(w - 26, 0, 26, h);
    x.fillStyle = 'rgba(80,44,18,0.7)'; x.fillRect(0, h - 26, w, 26);
    for (let k = 0; k < 14; k++) { const px = 10 + R() * (w - 20), py = h - 26 - R() * 34; x.fillStyle = R() < 0.5 ? 'rgba(46,70,30,0.85)' : 'rgba(66,96,40,0.85)'; x.beginPath(); x.ellipse(px, py, 7 + R() * 9, 5 + R() * 7, R() * 3, 0, 7); x.fill(); }
  });
}
// koinobori skin: u runs around the body (0 = the side facing the street), canvas top = the mouth
function koiTex() {
  return extTex('koi2', 256, 512, (x, w, h) => {
    const N = extNoise(4.4), img = x.createImageData(w, h), d = img.data;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const u = px / w, v = py / h, back = Math.cos((u - 0.25) * Math.PI * 2);
      let red = smoothstep(0.4, 0.52, N(px / 46, py / 54, 3) + 0.36 * back + 0.16); if (v < 0.2) red *= smoothstep(0.35, 0.8, back); if (v < 0.035) red = 1;
      const r = lerp(244, lerp(226, 244, v), red), gg = lerp(238, lerp(64, 128, v), red), b = lerp(226, lerp(30, 58, v), red);
      const o = (py * w + px) * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // scales over the body
    x.lineWidth = 2; for (let row = 0; row < 22; row++) for (let c = 0; c < 12; c++) { const cx = c * 22 + (row % 2) * 11, cy = 112 + row * 17; x.strokeStyle = 'rgba(255,236,200,0.55)'; x.beginPath(); x.arc(cx, cy, 11, Math.PI * 0.12, Math.PI * 0.88); x.stroke(); x.strokeStyle = 'rgba(120,30,10,0.22)'; x.beginPath(); x.arc(cx, cy + 2, 11, Math.PI * 0.15, Math.PI * 0.85); x.stroke(); }
    // gill arcs and the eyes, on both sides
    for (const ex of [0, w / 2, w]) {
      x.strokeStyle = 'rgba(170,34,20,0.85)'; x.lineWidth = 4; x.beginPath(); x.arc(ex, 60, 40, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
      x.fillStyle = '#fbf8f0'; x.beginPath(); x.arc(ex, 54, 30, 0, 7); x.fill(); x.fillStyle = '#d8a428'; x.beginPath(); x.arc(ex, 54, 23, 0, 7); x.fill(); x.fillStyle = '#0c0a0e'; x.beginPath(); x.arc(ex, 54, 18, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(ex - 6, 48, 5, 0, 7); x.fill();
    }
    x.fillStyle = '#b8261a'; x.fillRect(0, 0, w, 10);
  });
}
// koinobori tail fin (alpha): forked, red-orange shading to white tips, with fin rays
function koiFinTex() {
  return extTex('koifin', 128, 128, (x, w, h) => {
    x.beginPath(); x.moveTo(44, 0); x.lineTo(84, 0); x.quadraticCurveTo(112, 60, 126, 126); x.quadraticCurveTo(96, 94, 64, 84); x.quadraticCurveTo(32, 94, 2, 126); x.quadraticCurveTo(16, 60, 44, 0); x.closePath();
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e8562a'); g.addColorStop(0.55, '#f28a44'); g.addColorStop(1, '#f6eadc'); x.fillStyle = g; x.fill(); x.save(); x.clip();
    x.strokeStyle = 'rgba(255,240,220,0.6)'; x.lineWidth = 1.5; for (let k = -6; k <= 6; k++) { x.beginPath(); x.moveTo(64, 0); x.lineTo(64 + k * 11, 128); x.stroke(); }
    x.fillStyle = 'rgba(200,40,20,0.7)'; x.beginPath(); x.ellipse(40, 70, 16, 26, 0.4, 0, 7); x.fill(); x.restore();
  });
}
// vertical boards between y0..y1 on the front (z = 0), skipping holes; old = corrugated rusty blue-grey steel, new = dark cedar
function extBoards(ch, x0, x1, y0, y1, holes, clad, R) {
  const bw = 0.15;
  for (let x = x0, i = 0; x < x1 - 0.005; x += bw, i++) {
    const w = Math.min(bw, x1 - x), xc = x + w / 2; let segs = [[y0, y1]];
    for (const h of holes) if (xc > h[0] && xc < h[1]) { const next = []; for (const [a, b] of segs) { if (h[2] > a) next.push([a, Math.min(b, h[2])]); if (h[3] < b) next.push([Math.max(a, h[3]), b]); } segs = next; }
    for (const [a, b] of segs) {
      if (b - a < 0.01) continue;
      if (clad) { const col = new THREE.Color(spick([0x3a2416, 0x45291a, 0x33200f, 0x4a301c, 0x2e1c10])).multiplyScalar(srange(0.85, 1.1)).getHex(); ch.box(w - 0.012, b - a, 0.03, col, xc, (a + b) / 2, 0.016); }
      else { const ridge = i % 2 === 0; const col = new THREE.Color(R ? (ridge ? 0x5a626a : 0x41474e) : (ridge ? 0xa0a670 : 0x72784e)).multiplyScalar(srange(0.95, 1.04)).getHex(); ch.box(w, b - a, ridge ? 0.036 : 0.024, col, xc, (a + b) / 2, ridge ? 0.018 : 0.012); }
    }
  }
}
const EXTB = { extSolids: false };
function buildFacade() {
  clearTag('awningBench'); clearTag('extSolid'); reseed(777); clearAnchors('facade');
  const g = part('facade'); const ch = new Chunk('facade', 'facade'), em = new Chunk('facadeEm', 'facade', { emis: true }), wt = new Chunk('facadeWet', 'street', { wet: true, jit: 0.01 });
  const F = BLD.F, E = EXT(), lit = E.lit, glow = [], pool = []; let greenCh = null; // glow: soft halos (also mirrored in the wet road), pool: light pools on the pavement
  const TRIM = E.clad ? 0x24160c : 0x3e3a36, RUST = 0x5a4a3e;
  // ---------- siding on all three floors + parapet (old corrugated steel → dark cedar)
  const f2h = E.f2 ? [[-1.95, 0.35, F[1] + 0.45, F[1] + 2.55], [0.75, 1.95, F[1], F[1] + 2.35]] : [[-1.95, 0.35, F[1] + 0.45, F[1] + 2.55], [0.75, 1.95, F[1], F[1] + 2.35]];
  const f3h = [[-2.25, -0.35, F[2] + 0.75, F[2] + 2.35], [0.35, 2.25, F[2] + 0.75, F[2] + 2.35]];
  extBoards(ch, -2.7, 2.7, F[1] - 0.1, F[3] + 1.1, f2h.concat(f3h), E.clad, E.street); // the steel's base tint compensates for the street lamps' warm light once they're up
  // ground piers beside the storefront
  for (const [a, b] of [[-2.7, -2.45], [2.45, 2.7]]) extBoards(ch, a, b, 0, 2.62, [], E.clad, E.street);
  // horizontal trim bands
  for (const y of [F[1] - 0.1, F[2] - 0.08, F[3] - 0.05]) ch.box(5.5, 0.18, 0.08, TRIM, 0, y, 0.05);
  // old steel only: rust runs, stains, weathering and seams as a decal over the corrugation, then the wet sheen on the crests
  if (!E.clad) {
    const dm = new THREE.Mesh(gPlaneIdx(), new THREE.MeshBasicMaterial({ map: sidingGrimeTex(!E.f2), transparent: true, depthWrite: false }));
    dm.scale.set(5.44, 11.12, 1); dm.position.set(0, 5.56, 0.042); dm.renderOrder = 1; g.add(dm);
    const sm = new THREE.Mesh(gPlaneIdx(), new THREE.MeshBasicMaterial({ map: sidingSheenTex(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(0.22, 0.22, 0.22) }));
    sm.scale.set(5.44, 11.12, 1); sm.position.set(0, 5.56, 0.043); sm.renderOrder = 2; g.add(sm);
  }
  // parapet coping: rusty, then (roof reno) clean dark steel
  ch.box(5.56, 0.1, 0.34, E.roof ? 0x1e2024 : 0x5a4436, 0, F[3] + 1.12, -0.1); if (!E.roof) for (let i = 0; i < 10; i++) ch.box(srange(0.02, 0.05), srange(0.2, 0.7), 0.004, 0x7a4628, srange(-2.6, 2.6), F[3] + 0.9, 0.035);
  // ---------- ground floor: the rolling shutter (start) or the storefront
  ch.box(5.0, 0.3, 0.36, E.open ? (E.clad ? 0x24160c : 0x3a3632) : 0x4e4840, 0, 2.77, 0.14); // shutter box / head beam
  if (!E.open) {
    const sm = printedMesh(shutterTex(), 4.9, 2.6, false, { k: 0.46 }); sm.position.set(0, 1.31, 0.12); g.add(sm);
    ch.box(5.0, 0.06, 0.1, 0x3a342e, 0, 0.04, 0.12); for (const x of [-2.47, 2.47]) ch.box(0.06, 2.62, 0.12, 0x4a443c, x, 1.31, 0.1); // bottom bar + guide rails
  } else {
    // dark timber storefront: big window, door, sill panel
    ch.box(3.11, 0.85, 0.06, E.clad ? 0x2a190e : 0x34302c, -0.895, 0.43, 0.02); // sill wall under the window (stops at the door post)
    P.window(ch, -2.3, 0.5, 0.85, 2.55, -0.08, 4, 2, 0x22140b, 0.1);
    for (const x of [-2.45, 0.66, 2.02, 2.45]) ch.box(0.12, 2.62, 0.14, 0x22140b, x, 1.31, 0.05);
    // the entrance itself is buildSlideDoor('shop'): a koshi-do pair that slides into the wall as you walk up
    glassPane(g, 2.78, 1.68, -0.9, 1.7, -0.1, 0);
    if (lit) { tagA(anchor(-0.9, 1.4, 1.0, 0xffb06a, 2.4, 5.5, ['street', 'facade'], 0.3), 'facade'); tagA(anchor(1.3, 1.3, 0.8, 0xffb06a, 1.3, 4.0, ['street', 'facade'], 0.3), 'facade'); }
    if (E.noren) { const nm = printedMesh(frontNorenTex(), 1.04, 0.78, false, { k: lit ? 0.85 : 0.45, ds: true }); nm.position.set(1.35, 1.98, 0.09); g.add(nm); ch.cyl(0.015, 0.015, 1.16, 6, 0x22140b, 1.35, 2.38, 0.09, 0, 0, Math.PI / 2); }
  }
  // sign band above the storefront: rusted steel with a faded sign ghost → dark fascia under the awning
  if (!E.awning) { const bm = printedMesh(bandTex(), 5.3, 0.82, false, { k: E.lanterns && lit ? 0.6 : 0.42 }); bm.position.set(0, 3.01, 0.33); g.add(bm); }
  else ch.box(5.4, 0.6, 0.06, E.clad ? 0x22140b : 0x2e2a26, 0, 3.2, 0.05);
  // ---------- lanterns: the neighbour's lone lantern (start) → a row of seven along the shop front
  if (!E.lanterns) { // hung from an iron arm on the neighbour's wall
    const nx = -2.98, nz = 0.44; ch.box(0.035, 0.035, nz + 0.04, 0x1a1412, nx, 2.97, nz / 2 - 0.01); ch.bar([nx, 2.7, 0.0], [nx, 2.96, nz * 0.6], 0.022, 0x1a1412); ch.box(0.1, 0.12, 0.02, 0x1a1412, nx, 2.92, 0.01);
    ch.cyl(0.006, 0.006, 0.17, 4, 0x111111, nx, 2.885, nz); paperLantern(ch, em, glow, nx, 2.6, nz, 0.18, new THREE.Color(1.6, 0.4, 0.1)); tagA(anchor(nx + 0.1, 2.45, 0.9, 0xff6a30, 1.1, 3.2, ['street', 'facade'], 0.3), 'facade');
  } else { // a rail on three brackets from the fascia, seven round lanterns on short cords
    const lz = 0.5, ly = 2.55, r = 0.15; ch.box(5.1, 0.035, 0.035, 0x1a1210, -0.15, 2.93, lz);
    for (const x of [-2.6, -0.15, 2.3]) { ch.box(0.03, 0.03, lz - 0.02, 0x1a1210, x, 2.93, lz / 2 + 0.03); ch.box(0.06, 0.1, 0.02, 0x1a1210, x, 2.93, 0.08); }
    const top = ly + r * 1.12 + 0.02;
    for (let i = 0; i < 7; i++) { const x = -2.25 + i * 0.7; ch.cyl(0.006, 0.006, 2.93 - top, 4, 0x111111, x, (2.93 + top) / 2, lz); paperLantern(ch, em, glow, x, ly, lz, r, new THREE.Color(1.55, 0.46, 0.1)); if (i % 2 === 0) tagA(anchor(x, 2.45, 0.95, 0xff7a34, 1.3, 3.6, ['street', 'facade'], 0.25), 'facade'); } }
  // ---------- awning
  if (E.awning) { const n = 16; for (let i = 0; i < n; i++) { const x = -2.75 + (i + 0.5) * 5.4 / n, col = i % 2 ? 0xe4dfd2 : 0x24468e; ch.box(5.4 / n + 0.002, 0.025, 1.1, col, x, 3.2, 0.58, 0.42); ch.box(5.4 / n + 0.002, 0.22, 0.02, col, x, 2.9, 1.1); }
    for (const x of [-2.72, 2.72]) ch.box(0.03, 0.04, 1.15, 0x8a8e94, x, 3.17, 0.58, 0.42); }
  // ---------- red bench (replaces the crate of tins left out under plastic)
  if (E.bench) awningBench(ch);
  else { at(ch, -1.05, 0, 7.7, 0.3, () => { ch.box(0.62, 0.34, 0.42, 0x6a4a2a, 0, 0.17, 0); for (const y of [0.08, 0.26]) ch.box(0.64, 0.05, 0.43, 0x5a3e24, 0, y, 0); for (let i = 0; i < 6; i++) ch.cyl(0.05, 0.05, 0.12, 8, i % 2 ? 0x3a4a3a : 0x5a5a4a, -0.2 + (i % 3) * 0.2, 0.4, i < 3 ? -0.08 : 0.1); });
    const tarp = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 6, 1, true), new THREE.MeshLambertMaterial({ color: 0xc8d4dc, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); tarp.position.set(-1.05, 0.42, 7.7); tarp.scale.set(1.1, 0.7, 0.9); tarp.rotation.y = 0.5; g.add(tarp); }
  // ---------- chalk A-board by the door (replaces the litter on the street)
  if (E.menu) { at(ch, 0.62, 0.12, 0.72, -0.12, () => { ch.box(0.5, 0.78, 0.03, 0x3a2416, 0, 0.42, 0.11, -0.14); ch.box(0.5, 0.78, 0.03, 0x3a2416, 0, 0.42, -0.11, 0.14); }); const am = printedMesh(aBoardTex(), 0.42, 0.6, false, { k: lit ? 0.8 : 0.5 }); am.position.set(0.62 - 0.015, 0.55, 0.85); am.rotation.set(-0.14, -0.12, 0); g.add(am); }
  else { const np = printedMesh(newspaperTex(), 0.5, 0.34, false, { k: 0.5 }); np.rotation.set(-Math.PI / 2, 0, 0.5); np.position.set(2.1, 0.012, 4.4); g.add(np); ch.box(0.16, 0.004, 0.11, 0xd8d0c0, 0.55, 0.124, 1.25, 0, 0.6, 0); }
  // ---------- vending machines: one scuffed old machine (start) → a bright pair on both sides
  extVending(ch, em, glow, pool, -2.2, 0.62, 0, E.vending ? 'red' : 'old');
  if (E.vending) { extVending(ch, em, glow, pool, 5.02, 0.44, 0, 'white'); solidC(5.02, 0.44, 0.82, 0.66, 0, 2, 'extSolid'); } // against the arcade's corner, across the alley mouth: the alley and the stall stay clear
  solidC(-2.2, 0.62, 1.0, 0.8, 0, 2, 'extSolid');
  // ---------- street: plain stop line (start) → crosswalk + two tall street lamps
  // road paint: thin, opaque, slightly worn white on the asphalt, wet enough to carry the reflections
  const paint = (x0, x1, zc, d, col, wet) => { let x = x0; while (x < x1 - 0.02) { const seg = Math.min(x1 - x, srange(0.35, 0.9)), worn = srand() < 0.2, e = srange(0.01, 0.035);
      wt.box(seg - e, 0.005, d - srange(0, 0.035), worn ? new THREE.Color(col).multiplyScalar(0.62).getHex() : col, x + seg / 2, 0.0025, zc + srange(-0.012, 0.012), 0, srange(-0.008, 0.008), 0, worn ? wet + 0.2 : wet);
      if (d > 0.2) if (srand() < 0.5) wt.box(srange(0.03, 0.08), 0.002, srange(0.015, 0.04), 0x5a5854, x + srange(0.05, seg - 0.05), 0.0055, zc + srange(-d * 0.4, d * 0.4), 0, srange(-0.5, 0.5), 0, 0.8);
      x += seg; } };
  if (E.street) {
    for (let i = 0; i < 8; i++) paint(-1.6, 4.4, 3.42 + i * 0.95, 0.46, 0xa8a398, 0.55);
    const lamp = (x, z, side) => { ch.cyl(0.07, 0.1, 6.2, 8, 0x3a3e44, x, 3.22, z); ch.bar([x, 6.2, z], [x + side * 0.5, 6.55, z + 0.2], 0.07, 0x3a3e44); ch.bar([x + side * 0.5, 6.55, z + 0.2], [x + side * 1.3, 6.5, z + 0.3], 0.07, 0x3a3e44);
      ch.box(0.5, 0.12, 0.28, 0x2a2d33, x + side * 1.4, 6.45, z + 0.3); em.box(0.42, 0.03, 0.22, 0xfff0d0, x + side * 1.4, 6.38, z + 0.3); tagA(anchor(x + side * 1.4, 5.9, z + 0.3, 0xffe0b0, 4.0, 9, ['street', 'facade'], 0.0), 'facade'); solidC(x, z, 0.25, 0.25, 0, 6, 'extSolid'); };
    lamp(-3.45, 2.25, 1); lamp(3.95, 2.25, -1);
  } else { paint(-0.6, 4.6, 5.35, 0.42, 0xa8a398, 0.55); paint(-1.7, 4.5, 3.0, 0.1, 0x9a9890, 0.45); } // stop line + the edge line's stretch in front of the shop
  // ---------- gutter: rusted downpipe (start) → clean dark gutter and pipe
  ch.cyl(0.055, 0.055, F[3] + 0.9, 8, E.gutter ? 0x1c1e22 : 0x6a4a36, 2.64, (F[3] + 0.9) / 2, 0.12); for (let y = 0.6; y < F[3]; y += 1.2) ch.box(0.16, 0.035, 0.1, E.gutter ? 0x2a2c31 : 0x5a3a28, 2.64, y, 0.1);
  if (E.gutter) ch.box(5.5, 0.1, 0.12, 0x1c1e22, 0, F[3] + 0.98, 0.14); else for (let i = 0; i < 5; i++) ch.box(0.04, srange(0.6, 1.8), 0.004, 0x7a4628, 2.52 - i * 0.03, srange(1.2, 8), 0.04);
  // ---------- second floor: plywood (start) → moon window + lit side window
  if (!E.f2) {
    // matte plywood sheets nailed over the openings (grain and stains come from the siding decal), battens and an X brace
    for (const [x, y, w, h] of [[-0.8, F[1] + 1.5, 2.3, 2.1], [1.35, F[1] + 1.15, 1.2, 2.3]]) ch.box(w, h, 0.02, 0xb87838, x, y, 0.02);
    const batten = (a, b, col) => ch.bar([a[0], a[1], 0.05], [b[0], b[1], 0.05], 0.07, col || 0xa87040);
    batten([-1.95, F[1] + 1.35], [0.35, F[1] + 1.35]); batten([-1.85, F[1] + 0.6], [0.2, F[1] + 2.35], 0x98663a);
    batten([0.82, F[1] + 0.1], [1.88, F[1] + 2.2]); batten([1.88, F[1] + 0.1], [0.82, F[1] + 2.2], 0x98663a);
  } else {
    ch.torus(0.98, 0.08, 32, 0x22140b, -0.8, F[1] + 1.5, 0.06); for (let i = -2; i <= 2; i++) { ch.box(0.025, 1.8 - Math.abs(i) * 0.25, 0.03, 0x22140b, -0.8 + i * 0.36, F[1] + 1.5, 0.03); ch.box(1.8 - Math.abs(i) * 0.25, 0.025, 0.03, 0x22140b, -0.8, F[1] + 1.5 + i * 0.36, 0.03); }
    em.ball(0.9, new THREE.Color(0.95, 0.62, 0.3), -0.8, F[1] + 1.5, -0.1, 1, 1, 1, 0.02);
    // bracket lantern beside the balcony door (the door itself is buildSlideDoor('balcony'))
    { const lx = 2.12, ly = F[1] + 1.98, lz = 0.13; ch.box(0.06, 0.12, 0.02, 0x22140b, lx, ly + 0.14, 0.01); ch.box(0.025, 0.025, 0.13, 0x22140b, lx, ly + 0.17, 0.065); ch.box(0.004, 0.06, 0.004, 0x111111, lx, ly + 0.13, lz);
      ch.box(0.15, 0.025, 0.15, 0x22140b, lx, ly + 0.1, lz); ch.box(0.17, 0.02, 0.17, 0x22140b, lx, ly + 0.118, lz); ch.box(0.13, 0.02, 0.13, 0x22140b, lx, ly - 0.1, lz);
      for (const [ox, oz] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) ch.box(0.016, 0.2, 0.016, 0x22140b, lx + ox, ly, lz + oz);
      em.box(0.11, 0.18, 0.11, 0xffc27a, lx, ly, lz); tagA(anchor(lx, ly - 0.1, lz + 0.35, 0xffb468, 0.7, 2.4, ['street', 'facade'], 0.3), 'facade'); }
    tagA(anchor(-0.8, F[1] + 1.5, 1.2, 0xffc890, 1.8, 4.8, ['street', 'facade'], 0.3), 'facade'); tagA(anchor(1.35, F[1] + 1.6, 1.0, 0xffb070, 1.0, 3.2, ['street', 'facade'], 0.3), 'facade');
  }
  // balcony: broken plastic chair + dead plant (start) → planters, bonsai, flowers, herbs
  if (!E.planters) {
    // white monobloc chair, turned toward the street, one back leg snapped
    at(ch, 1.4, F[1], 0.72, -0.3, () => { const W = 0xeeede6, Wd = 0xd2d1ca, tb = (t, dz) => [0.44 + t * 0.98, -0.21 - t * 0.2 + (dz || 0)];
      ch.box(0.48, 0.035, 0.42, W, 0, 0.44, 0); ch.box(0.48, 0.07, 0.035, Wd, 0, 0.42, 0.21);
      for (const sx of [-1, 1]) { ch.bar([sx * 0.22, 0.43, 0.18], [sx * 0.27, 0.0, 0.26], 0.05, Wd); ch.box(0.05, 0.03, 0.46, W, sx * 0.24, 0.63, -0.03); ch.bar([sx * 0.24, 0.63, 0.19], [sx * 0.23, 0.44, 0.2], 0.045, W); }
      ch.bar([0.22, 0.43, -0.18], [0.27, 0.0, -0.27], 0.05, Wd); ch.bar([-0.22, 0.43, -0.18], [-0.25, 0.16, -0.24], 0.05, Wd);
      let [y, z] = tb(0.4); ch.box(0.5, 0.1, 0.035, W, 0, y, z, -0.2); [y, z] = tb(0.07); ch.box(0.46, 0.05, 0.03, W, 0, y, z, -0.2);
      [y, z] = tb(0.22); for (const sx of [-0.215, 0.215]) ch.box(0.045, 0.4, 0.03, W, sx, y, z, -0.2); for (const sx of [-0.11, 0, 0.11]) ch.box(0.055, 0.26, 0.025, W, sx, y, z, -0.2); }, 1.3);
    // the dead potted plant: terracotta pot, dry stems bending over and drooping past the rim, a few shrivelled leaves
    { const px = 2.2, pz = 0.92, py = F[1] + 0.42; ch.box(0.44, 0.42, 0.36, 0x2e3640, px, F[1] + 0.21, pz); ch.box(0.4, 0.03, 0.37, 0x3a4652, px, F[1] + 0.3, pz); ch.box(0.4, 0.03, 0.37, 0x3a4652, px, F[1] + 0.12, pz); // pot on an upturned crate
      ch.cyl(0.18, 0.13, 0.34, 10, 0xb86a3c, px, py + 0.17, pz); ch.torus(0.18, 0.025, 14, 0xc87a4a, px, py + 0.34, pz, Math.PI / 2); ch.cyl(0.16, 0.16, 0.02, 10, 0x2a2018, px, py + 0.32, pz);
      for (let k = 0; k < 11; k++) { const a = k < 7 ? Math.PI / 2 + srange(-1.2, 1.2) : k / 4 * 6.28 + srange(-0.4, 0.4), up = srange(0.18, 0.5), reach = srange(0.14, 0.4), droop = srange(0.45, 0.95); let prev = [px + Math.cos(a) * 0.04, py + 0.33, pz + Math.sin(a) * 0.04];
        for (let t = 1; t <= 7; t++) { const u = t / 7, p = [px + Math.cos(a) * (0.04 + reach * u), py + 0.33 + up * Math.sin(u * Math.PI * 0.85) - droop * u * u * u, pz + Math.sin(a) * (0.04 + reach * u)]; ch.bar(prev, p, 0.014, spick([0xb89a68, 0xc8aa78, 0xa08458])); if (t > 2 && srand() < 0.55) ch.box(0.07, 0.035, 0.008, spick([0x9a7444, 0xa8804a, 0x806040]), p[0], p[1] - 0.03, p[2], 0.2, -a, srange(-1.5, -0.8)); prev = p; } } }
  } else {
    for (let i = 0; i < 4; i++) { const x = -2.0 + i * 1.33; ch.box(1.1, 0.24, 0.26, 0x3a2416, x, F[1] + 0.95, 1.12); P.plant(ch, x - 0.25, F[1] + 1.07, 1.12, 0.6); P.plant(ch, x + 0.22, F[1] + 1.07, 1.12, 0.5, 1); for (let k = 0; k < 4; k++) ch.ball(0.03, spick([0xd77aa0, 0xf2ece0, 0xe8a040]), x + srange(-0.5, 0.5), F[1] + 1.12 + srange(0, 0.12), 1.12 + srange(-0.08, 0.08)); }
    // herbs on the ledge under the moon window
    ch.box(2.4, 0.14, 0.24, 0x2a1a10, -0.8, F[1] + 0.32, 0.16); for (let i = 0; i < 12; i++) P.plant(ch, -1.95 + i * 0.21, F[1] + 0.39, 0.16, srange(0.32, 0.45), i % 3 === 0 ? 1 : 0);
  }
  // ---------- third floor: dark dusty windows (start) → warm, lit multi-pane windows with a railing
  for (const [wi, cx] of [-1.3, 1.3].entries()) {
    if (E.f3) { // multi-pane wooden frames over a warm, lived-in room
      P.window(ch, cx - 0.9, cx + 0.9, F[2] + 0.8, F[2] + 2.3, -0.02, 4, 3, 0x2a180c, 0.08); ch.box(1.8, 0.05, 0.06, 0x2a180c, cx, F[2] + 1.92, 0.0);
      const rm = printedMesh(room3Tex(wi), 1.8, 1.5, false, { k: 1.25 }); rm.position.set(cx, F[2] + 1.55, -0.1); g.add(rm);
      em.ball(0.06, new THREE.Color(2.6, 1.7, 0.8), cx + (wi ? 0.2 : -0.2), F[2] + 2.0, -0.3, 1); tagA(anchor(cx, F[2] + 1.5, 1.2, 0xffb468, 1.6, 4.5, ['street', 'facade'], 0.3), 'facade');
    } else { // aluminium sliding sashes, a light concrete sill, dark rain-streaked glass
      P.window(ch, cx - 0.9, cx + 0.9, F[2] + 0.8, F[2] + 2.3, -0.02, 2, 1, 0x9aa1a8, 0.06); ch.box(0.05, 1.5, 0.03, 0x7c838a, cx + 0.03, F[2] + 1.55, 0.03);
      ch.box(2.0, 0.06, 0.2, 0xc4c0b4, cx, F[2] + 0.74, 0.08); ch.box(2.0, 0.025, 0.18, 0x8e8a80, cx, F[2] + 0.7, 0.07);
      const gm = printedMesh(glass3Tex(wi), 1.8, 1.5, false, { k: 0.85 }); gm.position.set(cx, F[2] + 1.55, -0.04); g.add(gm);
    }
  }
  if (E.f3) { ch.box(5.3, 0.1, 0.5, TRIM, 0, F[2] + 0.7, 0.25); P.railing(ch, -2.6, 0.48, 2.6, 0.48, F[2] + 0.75, 0.75, 0x1a1a1c); }
  // ---------- ivy, vines and wisteria (bare walls → green)
  if (E.green) {
    // ivy grows in runs: climbing from the corners and up the downpipe, matted along every ledge and cascading over it; wisteria hangs at the right.
    // Everything grows from a stem or a ledge (no loose leaves) and stays off the window glass.
    const gc = new Chunk('facadeGreen', 'facade', { ds: true }), GR = [0x2e5420, 0x3f6c26, 0x4f7e2c, 0x5e8e34, 0x365e22, 0x6c9c3c], gN = extNoise(21);
    const glass = (x, y) => Math.hypot(x + 0.8, y - F[1] - 1.5) < 1.02 || (x > 0.66 && x < 2.26 && y > F[1] - 0.05 && y < F[1] + 2.5) || (Math.abs(Math.abs(x) - 1.3) < 0.96 && y > F[2] + 0.77 && y < F[2] + 2.36);
    const leaf = (x, y, z, s) => gc.quad(0.095 * s, 0.08 * s, spick(GR), x, y, z, srange(-0.5, 0.5), srange(-0.5, 0.5), srange(-1.1, 1.1));
    const climb = (x, y0, y1, z, xmin, xmax) => { let px = x, vx = 0, prev = [px, y0, z], n = 0;
      for (let y = y0; y < y1; y += 0.045) { vx = clamp(vx * 0.92 + srange(-0.01, 0.01), -0.018, 0.018); px = clamp(px + vx, xmin, xmax); if (glass(px, y)) { vx = -vx; px = clamp(px + 4 * vx, xmin, xmax); continue; }
        if (++n % 3 === 0) { gc.bar(prev, [px, y, z], 0.014, 0x3a3a22); prev = [px, y, z]; }
        for (let k = 0; k < 2; k++) { const lx = px + srange(-0.07, 0.07), ly = y + srange(-0.03, 0.03); if (!glass(lx, ly)) leaf(lx, ly, z + srange(0, 0.05), srange(0.8, 1.25)); } } };
    const strand = (x, y, z, len) => { for (let t = 0; t < len; t += 0.04) { const px = x + Math.sin(t * 4 + x * 7) * 0.035, py = y - t; if (glass(px, py)) break; leaf(px + (Math.floor(t / 0.04) % 2 ? 0.02 : -0.02), py, z, srange(0.75, 1.1) * (1 - 0.3 * t / len)); } };
    const ledge = (y, z, x0, x1, hang, every) => { for (let x = x0; x < x1; x += 0.028) { const dn = gN(x * 1.6 + y, y); if (dn < 0.3) continue; for (let k = 0; k < 2; k++) leaf(x + srange(-0.02, 0.02), y + srange(-0.08, 0.16) * dn, z + srange(-0.02, 0.06), srange(0.85, 1.3)); }
      for (let x = x0 + srange(0, every); x < x1; x += srange(every * 0.5, every * 1.5)) { const dn = gN(x * 1.6 + y, y); if (dn < 0.35) continue; strand(x, y - 0.04, z + 0.02, hang * Math.pow(srand(), 1.4) * dn * 1.4); } };
    // climbers: the left corner from the balcony to the roof, and up the downpipe from the street
    for (const [x, y0, xmin, xmax] of [[-2.6, F[1] + 0.1, -2.7, -2.38], [-2.5, F[1] + 0.6, -2.7, -2.3], [2.56, 0.3, 2.42, 2.7], [2.62, 2.0, 2.45, 2.72]]) climb(x, y0, F[3] + 1.1, 0.13, xmin, xmax);
    // ledges: under the 2F balcony, the 3F balcony slab (heaviest), the 3F trim, the roofline
    ledge(F[1] - 0.06, 1.27, -2.68, 2.68, 0.35, 0.22); ledge(F[2] + 0.72, 0.52, -2.66, 2.66, 1.4, 0.1); ledge(F[2] + 0.02, 0.12, -2.66, 2.66, 0.3, 0.3); ledge(F[3] - 0.0, 0.12, -2.66, 2.66, 0.55, 0.16); ledge(F[3] + 1.15, 0.09, -2.7, 2.7, 1.0, 0.1);
    // wisteria: racemes under the 3F balcony at the right, among a few compound leaves
    for (let k = 0; k < 16; k++) { const x = k < 12 ? srange(1.45, 2.6) : srange(0.9, 1.4), z = srange(0.45, 0.6), y0 = F[2] + 0.64, L = srange(0.3, 0.65); for (let j = 0, y = y0; y > y0 - L; j++, y -= 0.035) { const t = (y0 - y) / L; gc.ball(0.068 * (1 - 0.6 * t), spick(t > 0.75 ? [0xd8b8f0, 0xc8a2e8] : [0x9a62c0, 0xb07ad0, 0x8a56b4]), x + srange(-0.02, 0.02), y, z, 0, 1, 0.8, 1); }
      for (let j = 0; j < 4; j++) leaf(x + srange(-0.12, 0.12), y0 + srange(-0.08, 0.02), z + 0.03, srange(1.0, 1.3)); }
    for (let i = 0; i < 6; i++) P.plant(ch, -2.2 + i * 0.88, F[2] + 0.76, 0.32, 0.55, i % 2);
    greenCh = gc;
  }
  // ---------- koi windsock on the corner bracket (an empty rusted bracket before)
  const KX = -2.3, KZ = 0.5, KY = F[1] + 2.95;
  ch.box(0.05, 0.05, KZ + 0.06, E.koi ? 0x1a1a1c : 0x6a4632, KX, KY, (KZ + 0.06) / 2); ch.box(0.04, 0.26, 0.04, E.koi ? 0x1a1a1c : 0x6a4632, KX, KY - 0.11, 0.03);
  if (E.koi) { // koinobori, hanging head-up: mouth ring, bridle, scaled body with eyes, forked tail fin (about 1.1 m)
    const prof = [[0.045, -0.84], [0.07, -0.74], [0.1, -0.6], [0.14, -0.44], [0.162, -0.28], [0.168, -0.16], [0.155, -0.06], [0.14, 0]].map(p => new THREE.Vector2(p[0], p[1]));
    const kg = new THREE.LatheGeometry(prof, 20), kp = kg.attributes.position, kc = new Float32Array(kp.count * 3);
    for (let i = 0; i < kp.count; i++) { const sh = 0.6 + 0.4 * Math.max(0, Math.cos(Math.atan2(kp.getX(i), kp.getZ(i)))); kc[i * 3] = kc[i * 3 + 1] = kc[i * 3 + 2] = sh; } kg.setAttribute('color', new THREE.BufferAttribute(kc, 3));
    // body and fin share one transform so the fin stays on the tail; the fin is two crossed planes so it reads from the side too
    const kfish = new THREE.Group(); kfish.position.set(KX, KY - 0.2, KZ); kfish.rotation.set(0.04, -0.15, 0.05); g.add(kfish);
    const km = new THREE.Mesh(kg, new THREE.MeshBasicMaterial({ map: koiTex(), vertexColors: true, side: THREE.DoubleSide, color: new THREE.Color(1.0, 0.95, 0.9) })); km.scale.set(1, 1, 0.7); kfish.add(km);
    for (const ry of [0, Math.PI / 2]) { const fm = printedMesh(koiFinTex(), 0.36, 0.3, false, { alpha: true, ds: true, k: 0.92 }); fm.material.alphaTest = 0.4; fm.position.set(0, -0.84 - 0.15 + 0.02, 0); fm.rotation.y = ry; fm.scale.x = ry ? 0.36 * 0.7 : 0.36; kfish.add(fm); }
    ch.geo(gTorus(18, 0.13), 0xdcd8cc, M(KX, KY - 0.2, KZ, Math.PI / 2 - 0.35, -0.15, 0, 0.29, 0.29 * 0.7, 0.29));
    for (const sx of [-1, 1]) { ch.ball(0.042, 0xf6f2e8, KX + sx * 0.085, KY - 0.33, KZ + 0.075, 1, 1, 1, 0.5); ch.ball(0.026, 0x08080a, KX + sx * 0.088, KY - 0.33, KZ + 0.095, 1, 1, 1, 0.5); } // the big eyes
    ch.bar([KX, KY - 0.02, KZ], [KX - 0.12, KY - 0.2, KZ], 0.006, 0x111111); ch.bar([KX, KY - 0.02, KZ], [KX + 0.12, KY - 0.2, KZ], 0.006, 0x111111);
    tagA(anchor(KX, F[1] + 1.8, 1.2, 0xff8a50, 0.4, 1.4, ['facade'], 0.3), 'facade'); }
  // ---------- alley mouth: orange bunting + dim bare bulb (start) → the tea stall (chapter 3 builds it) and its lantern
  if (!E.stall) { // a cord tied off on hooks in both alley walls, pennants hanging from it
    const bx0 = 2.74, bx1 = 4.57, by = 3.14, bz = -0.18, sag = 0.2; ch.cable([bx0, by, bz], [bx1, by, bz], sag, 0.016, 0x1c1a18, 12);
    for (const x of [bx0, bx1]) { ch.box(0.02, 0.09, 0.07, 0x2a2c31, x, by, bz); ch.ball(0.022, 0x3a3c40, x + (x < 3.5 ? 0.02 : -0.02), by, bz, 0); }
    for (let i = 0; i < 11; i++) { const t = (i + 0.5) / 11, x = lerp(bx0, bx1, t), y = by - Math.sin(t * Math.PI) * sag - 0.006; ch.geo(gCone(3), spick([0xe0662a, 0xeaa032, 0xd2402e, 0xe8822e]), M(x, y - 0.08, bz, Math.PI, 0, 0, 0.13, 0.16, 0.02)); } }
  if (!E.stallLamp) { em.ball(0.04, 0xa88a5a, 4.4, 2.65, 0.05, 1); ch.box(0.02, 0.18, 0.02, 0x2a2c31, 4.4, 2.78, 0.05); tagA(anchor(4.3, 2.5, 0.4, 0xffc088, 0.35, 1.6, ['alley', 'street', 'facade'], 0.3), 'facade'); }
  // ---------- roof: a crooked old TV antenna (start) is replaced by the sign; the rusted coping by the storm-cell bank
  if (!E.sign) { ch.cyl(0.025, 0.03, 2.4, 6, 0x5a5048, 1.6, F[3] + 1.2, -0.9, 0.12, 0, 0.08); for (let i = 0; i < 5; i++) ch.box(0.9 - i * 0.12, 0.025, 0.025, 0x5a5048, 1.6 + 0.12 * 0.5, F[3] + 1.6 + i * 0.22, -0.9 + 0.12 * (0.4 + i * 0.22), 0, 0.3, 0.1 - i * 0.02); }
  if (E.roof) { for (let i = 0; i < 5; i++) { const x = 0.55 + i * 0.36; ch.cyl(0.15, 0.15, 0.62, 12, 0x2a2e34, x, F[3] + 0.31, -0.62); ch.cyl(0.155, 0.155, 0.05, 12, 0x14161a, x, F[3] + 0.6, -0.62); em.cyl(0.152, 0.152, 0.04, 12, new THREE.Color(0.3, 2.0, 2.4), x, F[3] + 0.45, -0.62); em.cyl(0.152, 0.152, 0.02, 12, new THREE.Color(0.2, 1.4, 1.8), x, F[3] + 0.22, -0.62); }
    ch.box(1.95, 0.08, 0.5, 0x1a1c20, 1.27, F[3] + 0.04, -0.62); tagA(anchor(1.27, F[3] + 0.8, 0.0, 0x33e4ff, 1.0, 3.0, ['facade', 'roof'], 0.3), 'facade'); solid(0.35, 2.3, F[3], F[3] + 0.7, -0.9, -0.35, 'extSolid'); }
  // facade-zone fill: the street at night, warmer once the shop is lit
  tagA(anchor(0, 4.5, 6.0, 0x5c6c74, 0.7, 12, ['facade'], 0.0), 'facade'); if (lit) tagA(anchor(0, 1.6, 1.6, 0xff9a4a, 1.0, 4.5, ['facade'], 0.25), 'facade');
  addBuilt(g, ch); addBuilt(g, em); if (greenCh) addBuilt(g, greenCh); const wm = addBuilt(g, wt); if (wm) wm.castShadow = false;
  const gm = extGlowMesh(glow, 'facadeGlow'); if (gm) g.add(gm); const pm = extGlowMesh(pool, 'facadePool'); if (pm) g.add(pm);
}
// soft additive halos and light pools: one merged mesh each (no lights, no per-object draw calls)
const EXT_GLOW_MAT = new THREE.MeshBasicMaterial({ map: GLOW_TEX, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
function extGlowMesh(list, name) {
  if (!list.length) return null; const P3 = [], UV = [], CO = [], uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (const q of list) { const [x, y, z] = q.p, a = q.w / 2, b = q.h / 2, c = q.c;
    const pts = q.flat ? [[x - a, y, z + b], [x + a, y, z + b], [x + a, y, z - b], [x - a, y, z - b]] : [[x - a, y - b, z], [x + a, y - b, z], [x + a, y + b, z], [x - a, y + b, z]];
    for (const i of [0, 1, 2, 0, 2, 3]) { P3.push(...pts[i]); UV.push(...uv[i]); CO.push(c.r, c.g, c.b); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(CO, 3)); geo.computeBoundingSphere();
  const m = new THREE.Mesh(geo, EXT_GLOW_MAT); m.name = name; m.matrixAutoUpdate = false; m.renderOrder = 3; m.castShadow = false; m.receiveShadow = false; return m;
}
// round paper lantern: glowing body with darker ribs, black caps, and a soft halo
function paperLantern(ch, em, glow, x, y, z, r, hot) {
  em.ball(r, hot, x, y, z, 2, 1, 1.12, 1);
  const rib = hot.clone().multiplyScalar(0.45); for (const f of [-0.62, -0.22, 0.22, 0.62]) em.torus(r * Math.sqrt(1 - f * f) + 0.004, 0.005, 14, rib, x, y + f * r * 1.12, z, Math.PI / 2);
  for (const s of [1, -1]) ch.cyl(r * 0.42, r * 0.42, 0.035, 10, 0x1a1210, x, y + s * (r * 1.12 + 0.005), z);
  glow.push({ p: [x, y, z + r + 0.03], w: r * 7.5, h: r * 7.5, c: new THREE.Color(hot.r * 0.22, hot.g * 0.16, hot.b * 0.1) });
}
// vending machine: 'old' scuffed, dirty and stickered red; 'red' restored; 'white'. Always a lit display: three shelves of cans and a glowing top panel.
function extVending(ch, em, glow, pool, x, z, ry, kind) {
  const old = kind === 'old', white = kind === 'white', y = 0.12;
  const W = white ? 0.78 : 0.95, D = white ? 0.62 : 0.75, H = 1.85, F = D / 2, body = old ? 0x8e2a22 : white ? 0xe6e6e0 : 0xd8141e;
  const dw = W - 0.18, d0 = 0.8, d1 = 1.56, dh = d1 - d0, dc = (d0 + d1) / 2;
  const back = old ? new THREE.Color(1.2, 1.18, 1.02) : white ? new THREE.Color(1.3, 1.5, 1.7) : new THREE.Color(1.3, 1.3, 1.32);
  const topC = old ? new THREE.Color(1.15, 1.0, 0.82) : white ? new THREE.Color(1.15, 1.4, 1.8) : new THREE.Color(1.8, 1.7, 1.62);
  const CANS = [0xc23b2b, 0x2e6fb0, 0xe0b53a, 0x3f8a4a, 0xe8e2d4, 0x9a4aaa, 0xe86a2a, 0xd8d8d8];
  at(ch, x, y, z, ry, () => {
    ch.box(W, H, D, body, 0, H / 2, 0); ch.box(W + 0.02, 0.06, D + 0.02, 0x24262b, 0, H + 0.03, 0); ch.box(W + 0.02, 0.07, D + 0.02, 0x18191c, 0, 0.035, 0);
    for (const sx of [-1, 1]) ch.box(0.04, dh + 0.3, 0.07, 0x1c1e22, sx * (dw / 2 + 0.02), dc + 0.12, F + 0.02);
    for (const yy of [d0 - 0.02, d1 + 0.02, d1 + 0.22]) ch.box(dw + 0.08, 0.035, 0.07, 0x1c1e22, 0, yy, F + 0.02);
    for (let r = 0; r < 3; r++) ch.box(dw, 0.016, 0.06, 0x2a2d33, 0, d0 + 0.012 + r * dh / 3, F + 0.03);
    ch.box(W - 0.26, 0.2, 0.04, 0x141518, 0, 0.36, F + 0.01); ch.box(0.15, 0.22, 0.03, old ? 0x55575c : 0x9a9ea4, W / 2 - 0.16, 0.62, F + 0.01); ch.box(0.06, 0.04, 0.03, 0x111214, W / 2 - 0.16, 0.12, F + 0.02);
    if (!old) ch.box(W - 0.04, 0.045, 0.01, white ? 0x2a5aa8 : 0xf2ece4, 0, 0.74, F + 0.004);
    if (old) { // stickers, grime runs, scuffs, smudged glass
      for (let i = 0; i < 16; i++) { const zone = i % 3, sx = zone === 0 ? srange(-W / 2 + 0.03, -dw / 2 - 0.02) : zone === 1 ? srange(dw / 2 + 0.02, W / 2 - 0.03) : srange(-W / 2 + 0.08, W / 2 - 0.08), sy = zone < 2 ? srange(0.5, 1.75) : srange(0.12, 0.74);
        ch.box(srange(0.05, 0.13), srange(0.04, 0.15), 0.006, spick([0xd8d0c0, 0xe8e0b0, 0x2a2420, 0x3a6ab0, 0xf0f0e8, 0xe8c040]), sx, sy, F + 0.004 + i * 0.0004, 0, 0, srange(-0.35, 0.35)); }
      for (let i = 0; i < 10; i++) ch.box(srange(0.015, 0.04), srange(0.15, 0.6), 0.004, spick([0x4a1a14, 0x5a2a1c, 0x3a1810]), srange(-W / 2 + 0.03, W / 2 - 0.03), srange(0.15, 0.6), F + 0.003);
      for (let i = 0; i < 4; i++) ch.box(srange(0.05, 0.12), srange(0.03, 0.07), 0.004, 0x4a4844, srange(-dw / 2 + 0.06, dw / 2 - 0.06), spick([d0 + 0.05, d1 - 0.05]), F + 0.068);
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) ch.box(0.004, srange(0.05, 0.16), srange(0.05, 0.14), spick([0xd8d0c0, 0x5a2a20, 0xe8e0b0]), sx * (W / 2 + 0.002), srange(0.3, 1.6), srange(-F + 0.1, F - 0.1));
    }
  });
  at(em, x, y, z, ry, () => {
    em.box(dw, dh, 0.004, back, 0, dc, F + 0.003); em.box(dw, 0.15, 0.006, topC, 0, d1 + 0.12, F + 0.004);
    const n = white ? 5 : 6, cw = dw / n;
    for (let r = 0; r < 3; r++) for (let i = 0; i < n; i++) { const cx = -dw / 2 + cw * (i + 0.5), ly = d0 + 0.012 + r * dh / 3;
      em.cyl(0.033, 0.033, 0.12, 8, new THREE.Color(spick(CANS)).multiplyScalar(old ? 0.85 : 1.1), cx, ly + 0.07, F + 0.035);
      em.box(0.04, 0.012, 0.006, srand() < 0.25 ? 0xff5a5a : 0x7affb0, cx, ly, F + 0.064); }
  });
  const sn = Math.sin(ry), cs = Math.cos(ry), fx = x + sn * (F + 0.06), fz = z + cs * (F + 0.06);
  glow.push({ p: [fx, y + dc + 0.12, fz], w: 1.3, h: 1.6, c: white ? new THREE.Color(0.05, 0.065, 0.09) : new THREE.Color(0.075, 0.065, 0.06) });
  pool.push({ flat: true, p: [x + sn * (F + 0.6), 0.126, z + cs * (F + 0.6)], w: 1.9, h: 1.3, c: white ? new THREE.Color(0.12, 0.14, 0.18) : new THREE.Color(0.24, 0.09, 0.08) });
  tagA(anchor(x + sn * (F + 0.5), 1.2, z + cs * (F + 0.5), white ? 0xd8ecff : 0xfff2e8, old ? 1.4 : 1.7, 3.8, white ? ['street', 'facade', 'alley'] : ['street', 'facade'], 0.3), 'facade');
  if (!white) tagA(anchor(x + sn * (F + 0.35), 0.5, z + cs * (F + 0.35), 0xff3030, old ? 0.5 : 0.8, 2.2, ['street'], 0.3), 'facade');
}

// long, low red bench under the window: dark lacquered frame and trim, padded red seat and back, a tray of tea.
// Starts clear of the red vending machine (a plant stands in the gap).
function awningBench(ch) {
  const x0 = -1.42, x1 = 0.42, cx = (x0 + x1) / 2, w = x1 - x0, zc = 0.56, y = 0.12, seat = y + 0.44, top = seat + 0.055;
  const FR = 0x22120c, TR = 0x4a2a18, RED = 0xb01a22, REDD = 0x6e0e14;
  for (const x of [x0 + 0.05, cx, x1 - 0.05]) for (const z of [zc - 0.17, zc + 0.17]) ch.box(0.06, seat - y - 0.04, 0.06, FR, x, y + (seat - y - 0.04) / 2, z);
  for (const z of [zc - 0.17, zc + 0.17]) ch.box(w - 0.1, 0.035, 0.035, FR, cx, y + 0.1, z);
  ch.box(w, 0.07, 0.44, FR, cx, seat - 0.07, zc); ch.box(w + 0.02, 0.018, 0.46, TR, cx, seat - 0.03, zc);
  ch.box(w - 0.05, 0.075, 0.41, RED, cx, seat + 0.017, zc); ch.box(w - 0.05, 0.014, 0.014, REDD, cx, seat - 0.016, zc + 0.205);
  for (let i = 0; i < 7; i++) ch.box(0.02, 0.006, 0.02, REDD, x0 + 0.18 + i * (w - 0.36) / 6, top + 0.001, zc);
  ch.box(w, 0.34, 0.05, FR, cx, seat + 0.23, zc - 0.23); ch.box(w + 0.02, 0.025, 0.07, TR, cx, seat + 0.41, zc - 0.23);
  ch.box(w - 0.08, 0.26, 0.06, RED, cx, seat + 0.22, zc - 0.185, -0.1);
  ch.box(0.3, 0.02, 0.2, 0x2a1a14, -0.48, top + 0.01, zc + 0.04); P.yunomi(ch, -0.54, top + 0.02, zc + 0.04, C.celadon); P.yunomi(ch, -0.41, top + 0.02, zc + 0.06, C.ceramic);
  ch.cyl(0.1, 0.08, 0.24, 10, 0x2e2420, x0 - 0.16, y + 0.12, 0.32); P.plant(ch, x0 - 0.16, y + 0.24, 0.32, 0.55, 0);
  solid(x0, x1, y, top + 0.05, zc - 0.26, zc + 0.24, 'awningBench');
}

