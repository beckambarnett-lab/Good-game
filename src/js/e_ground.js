/* ================= ground floor interior ================= */
const SIDE_DOOR_OPEN = -1.62;
function updateSideDoor(dt) { const d = REF.sideDoor; if (!d) return; const tgt = S.flags.alleyOpen ? SIDE_DOOR_OPEN : 0; REF.sideDoorA = lerp(REF.sideDoorA || 0, tgt, 1 - Math.exp(-dt * 2.2)); d.rotation.y = REF.sideDoorA; if (S.flags.alleyOpen && !hasTagSolid('sideDoorOpen')) { clearTag('sideDoor'); solid(1.85, 2.5, 0, 2.2, -4.78, -4.56, 'sideDoorOpen'); } }
const MENU_TEX = {};
// chalk / wall-paper fonts: web fonts first, then the CJK system fonts headless Chromium actually has
const FONT_CHALKJ = '"Yusei Magic","Zen Kaku Gothic New","Noto Sans CJK JP","Noto Sans JP","Hiragino Sans",sans-serif';
const FONT_BRUSH = '"Noto Serif CJK JP","Noto Serif JP","Hiragino Mincho ProN","Yu Mincho",serif';
// tiny seeded PRNG for texture noise (keeps the wall art stable between rebuilds)
function texRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function chalkBlossom(x, cx, cy, r, col) { x.save(); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = Math.max(2, r * 0.12); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; x.beginPath(); const px = cx + Math.cos(a) * r * 0.55, py = cy + Math.sin(a) * r * 0.55; x.ellipse(px, py, r * 0.42, r * 0.3, a, 0, Math.PI * 2); x.globalAlpha = 0.35; x.fill(); x.globalAlpha = 0.9; x.stroke(); } x.globalAlpha = 1; x.beginPath(); x.arc(cx, cy, r * 0.13, 0, 7); x.fill(); x.restore(); }
function menuBoardTex() {
  // 1.4 m x 1.0 m blackboard: お品書き + tea list, then 季節のおすすめ
  return panelTex(1024, 732, (x, w, h) => {
    const R = texRng(77);
    const g = x.createRadialGradient(w * 0.45, h * 0.4, 60, w / 2, h / 2, w * 0.7); g.addColorStop(0, '#2c3a34'); g.addColorStop(1, '#18211d'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    // old erased chalk smears
    x.globalAlpha = 0.07; x.fillStyle = '#e8ecea'; for (let i = 0; i < 26; i++) { x.beginPath(); x.ellipse(R() * w, R() * h, 40 + R() * 120, 10 + R() * 30, R() * 3, 0, 7); x.fill(); } x.globalAlpha = 1;
    const chalk = '#f4f1e6', warm = '#ffc98a', pink = '#ff9cc0';
    x.textBaseline = 'alphabetic'; x.shadowColor = 'rgba(255,255,255,0.35)'; x.shadowBlur = 3;
    x.fillStyle = chalk; x.font = `bold 74px ${FONT_CHALKJ}`; x.textAlign = 'left'; x.fillText('お品書き', 56, 96);
    x.strokeStyle = chalk; x.lineWidth = 4; x.beginPath(); x.moveTo(56, 116); x.quadraticCurveTo(300, 108, 520, 118); x.stroke();
    chalkBlossom(x, 900, 74, 34, pink); chalkBlossom(x, 960, 132, 22, pink); chalkBlossom(x, 850, 136, 16, pink);
    x.strokeStyle = '#c9a07a'; x.lineWidth = 4; x.beginPath(); x.moveTo(760, 40); x.quadraticCurveTo(850, 60, 990, 30); x.stroke();
    const base = RECIPES.filter(r => r.ch <= Math.max(2, S.ch)).map(r => [r.jp, r.price]);
    const extra = [['ほうじ茶', 550], ['季節の上生菓子', 750]];
    const rows = base.concat(extra.filter(e => !base.some(b => b[0] === e[0]))).slice(0, 6);
    x.font = `50px ${FONT_CHALKJ}`;
    rows.forEach((r, i) => { const y = 180 + i * 58; x.fillStyle = chalk; x.textAlign = 'left'; x.fillText(r[0], 70, y); x.fillStyle = warm; x.textAlign = 'right'; x.fillText('¥' + r[1], w - 290, y); });
    // dotted leaders
    x.fillStyle = 'rgba(244,241,230,0.4)'; rows.forEach((r, i) => { const y = 168 + i * 58; for (let dx = 330; dx < w - 440; dx += 16) x.fillRect(dx, y, 5, 4); });
    // divider + seasonal section
    const sy = 180 + rows.length * 58 + 6;
    x.strokeStyle = 'rgba(244,241,230,0.7)'; x.lineWidth = 3; x.setLineDash([18, 10]); x.beginPath(); x.moveTo(50, sy - 24); x.lineTo(w - 50, sy - 24); x.stroke(); x.setLineDash([]);
    x.fillStyle = pink; x.font = `bold 52px ${FONT_CHALKJ}`; x.textAlign = 'left'; x.fillText('季節のおすすめ', 56, sy + 40);
    chalkBlossom(x, 470, sy + 22, 20, pink);
    const sea = [['桜ラテ', 680], ['柚子ほうじ茶', 650], ['苺の和菓子セット', 920]];
    x.font = `44px ${FONT_CHALKJ}`;
    sea.forEach((r, i) => { const y = sy + 98 + i * 52; x.fillStyle = chalk; x.textAlign = 'left'; x.fillText(r[0], 80, y); x.fillStyle = warm; x.textAlign = 'right'; x.fillText('¥' + r[1], w - 290, y); });
    x.shadowBlur = 0;
    // right column doodles: teacup with steam, blossom branch, a small cat
    x.strokeStyle = chalk; x.lineWidth = 5; x.lineCap = 'round';
    x.beginPath(); x.moveTo(800, 300); x.lineTo(820, 380); x.quadraticCurveTo(860, 400, 900, 380); x.lineTo(920, 300); x.closePath(); x.stroke();
    x.beginPath(); x.ellipse(860, 300, 60, 10, 0, 0, 7); x.stroke();
    for (const sx of [835, 860, 885]) { x.beginPath(); x.moveTo(sx, 280); x.bezierCurveTo(sx - 14, 260, sx + 14, 245, sx, 222); x.stroke(); }
    x.strokeStyle = '#c9a07a'; x.lineWidth = 5; x.beginPath(); x.moveTo(990, 470); x.quadraticCurveTo(900, 520, 790, 600); x.moveTo(900, 520); x.lineTo(880, 470); x.stroke();
    chalkBlossom(x, 880, 466, 18, pink); chalkBlossom(x, 820, 585, 22, pink); chalkBlossom(x, 940, 500, 15, pink); chalkBlossom(x, 970, 610, 12, pink);
    x.strokeStyle = chalk; x.lineWidth = 4; x.beginPath(); x.arc(890, 680, 26, Math.PI, 0); x.moveTo(866, 668); x.lineTo(870, 640); x.lineTo(882, 656); x.moveTo(914, 668); x.lineTo(910, 640); x.lineTo(898, 656); x.stroke();
    x.fillStyle = chalk; x.fillRect(880, 670, 4, 4); x.fillRect(896, 670, 4, 4);
    x.font = `30px ${FONT_CHALKJ}`; x.textAlign = 'right'; x.fillStyle = 'rgba(244,241,230,0.8)'; x.fillText('本日もありがとう', w - 50, h - 30);
    // chalk dust + streaks
    x.globalAlpha = 0.16; x.fillStyle = '#fff'; for (let i = 0; i < 140; i++) x.fillRect(R() * w, R() * h, 2 + R() * 30, 1.5); x.globalAlpha = 1;
  });
}
// ---- all flat paper things on the x=-2.5 wall share ONE canvas mapped to wall coordinates (one draw call)
const MW = { z0: 0, z1: -5.4, y0: 0.95, y1: 3.15, ppm: 320 };
function menuWallArt(g, ch, em, lit) {
  const W = Math.round((MW.z0 - MW.z1) * MW.ppm), H = Math.round((MW.y1 - MW.y0) * MW.ppm);
  const PX = z => (MW.z0 - z) * MW.ppm, PY = y => (MW.y1 - y) * MW.ppm;
  const items = []; // {zc,yc,w,h,d,rot,draw}
  const add = (zc, yc, w, h, d, rot, draw) => items.push({ zc, yc, w, h, d, rot: rot || 0, draw });
  const R = texRng(4242);
  const tape = (x, cx, cy, a) => { x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = 'rgba(232,222,190,0.85)'; x.fillRect(-16, -6, 32, 12); x.restore(); };
  const lines = (x, X, Y, w, h, n, col) => { x.strokeStyle = col || 'rgba(40,34,30,0.75)'; x.lineWidth = 2; for (let i = 0; i < n; i++) { const y = Y + h * (0.22 + i * 0.62 / Math.max(1, n - 1)); x.beginPath(); x.moveTo(X + w * 0.12, y); x.lineTo(X + w * (0.5 + R() * 0.38), y + (R() - 0.5) * 2); x.stroke(); } };
  const note = (zc, yc, w, h, col, rot) => add(zc, yc, w, h, 0.012, rot, (x, X, Y, ww, hh) => { x.fillStyle = col; x.fillRect(X, Y, ww, hh); x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(X, Y + hh - 4, ww, 4); lines(x, X, Y, ww, hh, 4); if (R() < 0.5) { x.fillStyle = '#c2362b'; x.beginPath(); x.arc(X + ww * 0.78, Y + hh * 0.78, ww * 0.09, 0, 7); x.fill(); } tape(x, X + ww / 2, Y + 2, (R() - 0.5) * 0.4); });
  const ofuda = (zc, yc, txt, rot) => add(zc, yc, 0.075, 0.24, 0.012, rot, (x, X, Y, ww, hh) => {
    x.fillStyle = '#f3ecd8'; x.fillRect(X, Y, ww, hh); x.fillStyle = '#b8302a'; x.fillRect(X, Y, ww, hh * 0.09); x.strokeStyle = '#b8302a'; x.lineWidth = 2; x.strokeRect(X + 3, Y + 3, ww - 6, hh - 6);
    x.fillStyle = '#1c1814'; x.textAlign = 'center'; x.textBaseline = 'middle'; const fs = Math.min(ww * 0.62, hh * 0.78 / txt.length); x.font = `bold ${fs}px ${FONT_BRUSH}`; [...txt].forEach((c, i) => x.fillText(c, X + ww / 2, Y + hh * 0.17 + fs * 0.5 + i * fs * 1.02));
    x.fillStyle = 'rgba(200,40,30,0.85)'; x.fillRect(X + ww * 0.3, Y + hh * 0.84, ww * 0.4, ww * 0.4); tape(x, X + ww / 2, Y + 2, 0);
  });
  // -- front corner: old festival poster under the lantern
  add(-0.43, 1.72, 0.3, 0.42, 0.01, 0.02, (x, X, Y, w, h) => {
    x.fillStyle = '#d8cfb6'; x.fillRect(X, Y, w, h); x.fillStyle = '#c2362b'; x.beginPath(); x.arc(X + w / 2, Y + h * 0.36, w * 0.3, 0, 7); x.fill();
    x.fillStyle = '#1b1b1b'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${w * 0.28}px ${FONT_BRUSH}`; x.fillText('雨', X + w / 2, Y + h * 0.37);
    x.font = `${w * 0.075}px ${FONT_UI}`; x.fillText('AMAGASE TEA FESTIVAL', X + w / 2, Y + h * 0.74); x.fillText('1987', X + w / 2, Y + h * 0.83);
    tape(x, X + 8, Y + 6, -0.6); tape(x, X + w - 8, Y + 6, 0.6);
  });
  // -- talismans + notes around the cyber panel / menu
  ofuda(-0.78, 1.43, '商売繁盛', -0.03); ofuda(-1.02, 1.38, '火廼要慎', 0.02); note(-1.28, 1.42, 0.13, 0.15, '#f1e7c4', 0.06);
  note(-1.48, 2.62, 0.11, 0.1, '#f7d6dc', -0.08); note(-2.75, 2.6, 0.12, 0.11, '#efe4cc', 0.05); note(-2.05, 2.62, 0.1, 0.09, '#e8f0c8', -0.03);
  ofuda(-3.52, 2.2, '家内安全', 0.02); ofuda(-4.32, 2.22, '茶祖', -0.03); // 千客万来 scroll, 茶 neon and the order tablet beside the brewing bench: buildBrewWall
  // -- 茶 calligraphy scroll (kakejiku) above the neon
  add(-3.2, 2.72, 0.26, 0.5, 0.012, 0, (x, X, Y, w, h) => {
    x.fillStyle = '#5a6a3a'; x.fillRect(X, Y, w, h); x.fillStyle = '#7a5a2a'; x.fillRect(X, Y + h * 0.04, w, h * 0.03); x.fillRect(X, Y + h * 0.93, w, h * 0.03);
    x.fillStyle = '#efe6cf'; x.fillRect(X + w * 0.1, Y + h * 0.12, w * 0.8, h * 0.76);
    x.fillStyle = '#141210'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 ${w * 0.62}px ${FONT_BRUSH}`; x.fillText('茶', X + w / 2, Y + h * 0.42);
    x.font = `${w * 0.1}px ${FONT_BRUSH}`; x.fillText('一服', X + w * 0.75, Y + h * 0.72);
    x.fillStyle = '#c2302a'; x.fillRect(X + w * 0.66, Y + h * 0.78, w * 0.12, w * 0.12);
  });
  // -- landscape painting: tea hills at dusk
  add(-3.95, 2.2, 0.44, 0.3, 0.035, 0, (x, X, Y, w, h) => {
    const sg = x.createLinearGradient(0, Y, 0, Y + h); sg.addColorStop(0, '#e9b48a'); sg.addColorStop(0.5, '#f2d6a8'); sg.addColorStop(1, '#a8b878'); x.fillStyle = sg; x.fillRect(X, Y, w, h);
    x.fillStyle = '#8a8aa6'; x.beginPath(); x.moveTo(X, Y + h * 0.55); x.lineTo(X + w * 0.25, Y + h * 0.25); x.lineTo(X + w * 0.45, Y + h * 0.45); x.lineTo(X + w * 0.7, Y + h * 0.2); x.lineTo(X + w, Y + h * 0.5); x.lineTo(X + w, Y + h); x.lineTo(X, Y + h); x.fill();
    x.fillStyle = '#5f8a46'; x.beginPath(); x.moveTo(X, Y + h * 0.7); x.quadraticCurveTo(X + w * 0.4, Y + h * 0.48, X + w, Y + h * 0.66); x.lineTo(X + w, Y + h); x.lineTo(X, Y + h); x.fill();
    x.strokeStyle = '#3e6a32'; x.lineWidth = 3; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(X, Y + h * (0.76 + i * 0.05)); x.quadraticCurveTo(X + w * 0.5, Y + h * (0.6 + i * 0.06), X + w, Y + h * (0.72 + i * 0.05)); x.stroke(); }
    x.fillStyle = '#f7f0d8'; x.beginPath(); x.arc(X + w * 0.78, Y + h * 0.16, w * 0.05, 0, 7); x.fill();
    x.fillStyle = '#4a3a2a'; x.fillRect(X + w * 0.2, Y + h * 0.58, w * 0.06, h * 0.07); x.fillStyle = '#7a3a2a'; x.beginPath(); x.moveTo(X + w * 0.185, Y + h * 0.59); x.lineTo(X + w * 0.23, Y + h * 0.53); x.lineTo(X + w * 0.275, Y + h * 0.59); x.fill();
  });
  // -- portrait (sepia photo of the founder)
  add(-4.55, 2.28, 0.22, 0.3, 0.035, 0, (x, X, Y, w, h) => {
    const pg = x.createRadialGradient(X + w / 2, Y + h * 0.45, 4, X + w / 2, Y + h / 2, w * 0.8); pg.addColorStop(0, '#d8c49a'); pg.addColorStop(1, '#6a5438'); x.fillStyle = pg; x.fillRect(X, Y, w, h);
    x.fillStyle = '#2e2418'; x.beginPath(); x.moveTo(X + w * 0.12, Y + h); x.quadraticCurveTo(X + w * 0.2, Y + h * 0.58, X + w / 2, Y + h * 0.56); x.quadraticCurveTo(X + w * 0.8, Y + h * 0.58, X + w * 0.88, Y + h); x.fill();
    x.fillStyle = '#e8dcc0'; x.beginPath(); x.moveTo(X + w * 0.42, Y + h * 0.6); x.lineTo(X + w / 2, Y + h * 0.8); x.lineTo(X + w * 0.58, Y + h * 0.6); x.fill();
    x.fillStyle = '#c8a880'; x.beginPath(); x.ellipse(X + w / 2, Y + h * 0.4, w * 0.15, h * 0.13, 0, 0, 7); x.fill();
    x.fillStyle = '#3a3026'; x.beginPath(); x.ellipse(X + w / 2, Y + h * 0.3, w * 0.17, h * 0.07, 0, Math.PI, 0); x.fill(); x.fillRect(X + w * 0.33, Y + h * 0.27, w * 0.34, h * 0.05);
    x.fillStyle = '#3a3026'; x.fillRect(X + w * 0.42, Y + h * 0.39, w * 0.04, 3); x.fillRect(X + w * 0.54, Y + h * 0.39, w * 0.04, 3);
  });
  // -- cork board with pinned notes, a photo and a cat drawing
  add(-3.98, 1.6, 0.56, 0.38, 0.03, 0, (x, X, Y, w, h) => {
    x.fillStyle = '#b08850'; x.fillRect(X, Y, w, h); for (let i = 0; i < 900; i++) { x.fillStyle = R() < 0.5 ? 'rgba(90,60,30,0.35)' : 'rgba(230,200,150,0.3)'; x.fillRect(X + R() * w, Y + R() * h, 2, 2); }
    const pin = (px, py, c) => { x.fillStyle = c; x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(px - 2, py - 3, 2, 2); };
    const paper = (px, py, pw, ph, a, c, fn) => { x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-pw / 2 + 3, -ph / 2 + 4, pw, ph); x.fillStyle = c; x.fillRect(-pw / 2, -ph / 2, pw, ph); if (fn) fn(-pw / 2, -ph / 2, pw, ph); x.restore(); };
    paper(X + w * 0.17, Y + h * 0.3, w * 0.24, h * 0.42, -0.06, '#f4efe0', (a, b, pw, ph) => lines(x, a, b, pw, ph, 5)); pin(X + w * 0.17, Y + h * 0.12, '#d0302a');
    // cat drawing
    paper(X + w * 0.47, Y + h * 0.5, w * 0.27, h * 0.6, 0.04, '#fbf8ee', (a, b, pw, ph) => {
      const cx = a + pw / 2, cy = b + ph * 0.55; x.fillStyle = '#f0a050'; x.beginPath(); x.ellipse(cx, cy, pw * 0.3, ph * 0.22, 0, 0, 7); x.fill();
      x.beginPath(); x.moveTo(cx - pw * 0.28, cy - ph * 0.08); x.lineTo(cx - pw * 0.2, cy - ph * 0.34); x.lineTo(cx - pw * 0.06, cy - ph * 0.18); x.fill(); x.beginPath(); x.moveTo(cx + pw * 0.28, cy - ph * 0.08); x.lineTo(cx + pw * 0.2, cy - ph * 0.34); x.lineTo(cx + pw * 0.06, cy - ph * 0.18); x.fill();
      x.strokeStyle = '#3a2a1a'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(cx, cy, pw * 0.3, ph * 0.22, 0, 0, 7); x.stroke(); x.fillStyle = '#2a1a10'; x.beginPath(); x.arc(cx - pw * 0.1, cy - ph * 0.03, 3.5, 0, 7); x.arc(cx + pw * 0.1, cy - ph * 0.03, 3.5, 0, 7); x.fill();
      x.beginPath(); x.moveTo(cx - 5, cy + ph * 0.06); x.quadraticCurveTo(cx, cy + ph * 0.1, cx + 5, cy + ph * 0.06); x.stroke(); for (const sd of [-1, 1]) for (const k of [-1, 1]) { x.beginPath(); x.moveTo(cx + sd * pw * 0.14, cy + ph * 0.04); x.lineTo(cx + sd * pw * 0.4, cy + ph * 0.04 + k * 5); x.stroke(); }
      x.fillStyle = '#3a2a1a'; x.font = `${pw * 0.14}px ${FONT_CHALKJ}`; x.textAlign = 'center'; x.fillText('たま', cx, b + ph * 0.92);
    }); pin(X + w * 0.47, Y + h * 0.24, '#2a6ad0');
    // polaroid
    paper(X + w * 0.78, Y + h * 0.32, w * 0.2, h * 0.44, 0.09, '#f2f2ea', (a, b, pw, ph) => { const pg = x.createLinearGradient(0, b, 0, b + ph * 0.7); pg.addColorStop(0, '#3a4a7a'); pg.addColorStop(1, '#d8705a'); x.fillStyle = pg; x.fillRect(a + 5, b + 5, pw - 10, ph * 0.72); }); pin(X + w * 0.78, Y + h * 0.12, '#e0c030');
    paper(X + w * 0.8, Y + h * 0.8, w * 0.22, h * 0.26, -0.05, '#f8e070', (a, b, pw, ph) => lines(x, a, b, pw, ph, 3)); pin(X + w * 0.8, Y + h * 0.7, '#30a050');
    paper(X + w * 0.17, Y + h * 0.82, w * 0.2, h * 0.24, 0.07, '#f7c6d0', (a, b, pw, ph) => lines(x, a, b, pw, ph, 3)); pin(X + w * 0.17, Y + h * 0.72, '#d0302a');
  });
  // -- wall calendar: picture, month, grid with red X over the days gone by
  add(-4.62, 1.6, 0.3, 0.46, 0.012, 0, (x, X, Y, w, h) => {
    x.fillStyle = '#f6f2e6'; x.fillRect(X, Y, w, h); x.fillStyle = '#2a2a2a'; x.fillRect(X, Y, w, 5);
    const ph = h * 0.36; const sg = x.createLinearGradient(0, Y, 0, Y + ph); sg.addColorStop(0, '#9ac0e0'); sg.addColorStop(1, '#f0e0c8'); x.fillStyle = sg; x.fillRect(X + 6, Y + 8, w - 12, ph);
    x.fillStyle = '#6a7a9a'; x.beginPath(); x.moveTo(X + 6, Y + ph + 8); x.lineTo(X + w * 0.5, Y + ph * 0.35); x.lineTo(X + w - 6, Y + ph + 8); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(X + w * 0.42, Y + ph * 0.52); x.lineTo(X + w * 0.5, Y + ph * 0.35); x.lineTo(X + w * 0.58, Y + ph * 0.52); x.fill();
    chalkBlossom(x, X + w * 0.2, Y + ph * 0.4, 8, '#f08aa8'); chalkBlossom(x, X + w * 0.82, Y + ph * 0.55, 6, '#f08aa8');
    x.fillStyle = '#c2302a'; x.font = `bold ${w * 0.16}px ${FONT_UI}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('10', X + 10, Y + ph + 30); x.fillStyle = '#2a2a2a'; x.font = `${w * 0.08}px ${FONT_UI}`; x.fillText('月  OCTOBER', X + w * 0.36, Y + ph + 32);
    const gx = X + 8, gy = Y + ph + 52, cw = (w - 16) / 7, rh = (h - ph - 60) / 5;
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1; for (let r = 0; r <= 5; r++) { x.beginPath(); x.moveTo(gx, gy + r * rh); x.lineTo(gx + cw * 7, gy + r * rh); x.stroke(); }
    x.font = `${rh * 0.42}px ${FONT_UI}`; x.textAlign = 'left';
    for (let d = 1; d <= 31; d++) { const c = (d + 2) % 7, r = Math.floor((d + 2) / 7); x.fillStyle = c === 0 ? '#c2302a' : '#2a2a2a'; x.fillText(String(d), gx + c * cw + 2, gy + r * rh + rh * 0.35); if (d < 17) { x.strokeStyle = '#d0201a'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(gx + c * cw + 3, gy + r * rh + 3); x.lineTo(gx + (c + 1) * cw - 3, gy + (r + 1) * rh - 3); x.moveTo(gx + (c + 1) * cw - 3, gy + r * rh + 3); x.lineTo(gx + c * cw + 3, gy + (r + 1) * rh - 3); x.stroke(); } }
  });
  // paint the atlas
  const tex = panelTex(W, H, (x) => { x.clearRect(0, 0, W, H); for (const it of items) { const X = PX(it.zc) - it.w * MW.ppm / 2, Y = PY(it.yc) - it.h * MW.ppm / 2; x.save(); x.translate(X + it.w * MW.ppm / 2, Y + it.h * MW.ppm / 2); x.rotate(it.rot); x.translate(-(X + it.w * MW.ppm / 2), -(Y + it.h * MW.ppm / 2)); it.draw(x, X, Y, it.w * MW.ppm, it.h * MW.ppm); x.restore(); } });
  // one quad per item (quad grows to fit the rotated paper), all in one geometry
  const pos = [], uv = [], idx = [];
  for (const it of items) {
    const c = Math.abs(Math.cos(it.rot)), sn = Math.abs(Math.sin(it.rot)); const hw = (it.w * c + it.h * sn) / 2 + 0.01, hh = (it.w * sn + it.h * c) / 2 + 0.01;
    const za = it.zc + hw, zb = it.zc - hw, ya = it.yc - hh, yb = it.yc + hh, xx = -2.5 + it.d; const n = pos.length / 3;
    for (const [z, y] of [[za, ya], [zb, ya], [zb, yb], [za, yb]]) { pos.push(xx, y, z); uv.push((MW.z0 - z) / (MW.z0 - MW.z1), (y - MW.y0) / (MW.y1 - MW.y0)); }
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const k = lit ? 1 : 0.45; const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.35, color: new THREE.Color(0.8 * k, 0.7 * k, 0.56 * k) });
  g.add(new THREE.Mesh(geo, mat));
  return items;
}
function cyberPanelTex() {
  // tall glowing panel: glyph rain in cyan/magenta, big vertical また、どこかで
  return panelTex(320, 440, (x, w, h) => {
    const R = texRng(909);
    const bg = x.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0a0620'); bg.addColorStop(1, '#06121c'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(80,120,255,0.18)'; x.lineWidth = 1; for (let i = 0; i < w; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let i = 0; i < h; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    x.font = `14px ${FONT_DOT}`; x.textAlign = 'center'; const gl = 'アイウエオカキクケコサシスセソ茶雨夜光0123456789';
    for (let c = 0; c < 12; c++) { const len = 6 + Math.floor(R() * 18), y0 = R() * h; for (let i = 0; i < len; i++) { x.fillStyle = R() < 0.55 ? `rgba(51,228,255,${0.15 + i / len * 0.6})` : `rgba(255,61,154,${0.15 + i / len * 0.6})`; x.fillText(gl[Math.floor(R() * gl.length)], 18 + c * 15, (y0 + i * 16) % h); } }
    for (let i = 0; i < 14; i++) { x.fillStyle = R() < 0.5 ? 'rgba(255,61,154,0.55)' : 'rgba(51,228,255,0.5)'; x.fillRect(R() * w * 0.6, R() * h, 8 + R() * 50, 3 + R() * 6); }
    x.fillStyle = 'rgba(255,61,154,0.8)'; x.fillRect(20, 30, 8, 240); x.fillStyle = 'rgba(139,92,255,0.8)'; x.fillRect(34, 60, 4, 160);
    // vertical text
    const txt = [...'また、どこかで']; x.font = `bold 44px ${FONT_CHALKJ}`; x.textBaseline = 'middle';
    txt.forEach((ch, i) => { const y = 40 + i * 52, cx = w - 62; x.shadowColor = '#33e4ff'; x.shadowBlur = 18; x.fillStyle = '#7ff0ff'; x.fillText(ch, cx, y); x.shadowBlur = 4; x.fillStyle = '#ffffff'; x.fillText(ch, cx, y); });
    x.shadowBlur = 0; x.fillStyle = '#e0302a'; x.fillRect(w - 80, h - 50, 34, 34); x.fillStyle = '#ffe0e0'; x.font = `bold 16px ${FONT_BRUSH}`; x.fillText('雫', w - 63, h - 33);
    x.strokeStyle = '#ff3d9a'; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8);
  });
}
function buildMenuWall(g, ch, em, lit, f) {
  const X = -2.5;
  const frame = (zc, yc, w, h, t, d, col, back) => { if (back != null) ch.box(d * 0.6, h, w, back, X + d * 0.3, yc, zc); ch.box(d, t, w + t, col, X + d / 2, yc + h / 2, zc); ch.box(d, t, w + t, col, X + d / 2, yc - h / 2, zc); ch.box(d, h + t, t, col, X + d / 2, yc, zc + w / 2); ch.box(d, h + t, t, col, X + d / 2, yc, zc - w / 2); };
  // -- chalk menu board (1.4 x 1.0), wooden frame + chalk tray; self-lit so the chalk always reads
  const MZ = -2.3, MY = 1.95;
  if (lit || f.crew) { const mt = menuBoardTex(); MENU_TEX.g0 = mt; const mb = printedMesh(mt, 1.4, 1.0, false, { k: lit ? 0.92 : 0.5 }); mb.position.set(X + 0.046, MY, MZ); mb.rotation.y = Math.PI / 2; g.add(mb); }
  else ch.box(0.02, 1.0, 1.4, 0x1b2420, X + 0.035, MY, MZ);
  frame(MZ, MY, 1.4, 1.0, 0.07, 0.07, 0x5a3a24, 0x2a1e16);
  ch.box(0.08, 0.025, 1.3, 0x6a4a30, X + 0.1, MY - 0.53, MZ); for (const [dz, c] of [[0.3, 0xf4f1e6], [0.22, 0xf0a0c0], [-0.4, 0xffc98a]]) ch.cyl(0.008, 0.008, 0.07, 6, c, X + 0.1, MY - 0.51, MZ + dz, Math.PI / 2, 0, 0);
  ch.box(0.06, 0.12, 0.18, 0xd8d0c0, X + 0.1, MY - 0.5, MZ - 0.55); // eraser
  // -- glowing pink neon お茶 next to the board, tinting the wall
  const NZ = -3.2, NY = 1.98;
  ch.box(0.03, 0.56, 0.36, 0x14121a, X + 0.015, NY, NZ);
  if (lit) {
    neon('お茶', X + 0.04, NY, NZ, Math.PI / 2, 0.52, 'mag', { vertical: true, border: true, px: 96, k: 2.2, lit: 0, group: g });
    tagA(anchor(X + 0.35, NY, NZ, 0xff3d9a, 1.1, 2.0, ['g0'], 0.35), 'g0');
  }
  // -- 茶 scroll: rollers + hanging cord (the paper is in the atlas)
  ch.cyl(0.012, 0.012, 0.3, 6, 0x3a2418, X + 0.02, 2.98, NZ, Math.PI / 2, 0, 0); ch.cyl(0.016, 0.016, 0.32, 6, 0x2a1a10, X + 0.025, 2.46, NZ, Math.PI / 2, 0, 0);
  ch.bar([X + 0.01, 3.1, NZ], [X + 0.015, 2.98, NZ + 0.12], 0.006, 0xc9a24a); ch.bar([X + 0.01, 3.1, NZ], [X + 0.015, 2.98, NZ - 0.12], 0.006, 0xc9a24a); ch.box(0.02, 0.02, 0.02, C.brass, X + 0.01, 3.1, NZ);
  // -- frames for the pictures and the cork board
  frame(-3.95, 2.2, 0.44, 0.3, 0.035, 0.045, 0x3a2418, 0x2a1e16);
  frame(-4.55, 2.28, 0.22, 0.3, 0.03, 0.045, 0x8a6a3a, 0x2a1e16);
  frame(-3.98, 1.6, 0.56, 0.38, 0.03, 0.04, 0x9a6c48, 0x6a4a30);
  ch.cyl(0.006, 0.006, 0.03, 4, C.iron, X + 0.015, 1.86, -4.62, 0, 0, Math.PI / 2); // calendar nail
  // -- clock face details (clock itself is the existing disc)
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ch.box(0.006, i % 3 ? 0.012 : 0.025, 0.012, 0x1a1a1a, -2.44, 2.75 + Math.cos(a) * 0.115, -3.6 + Math.sin(a) * 0.115, a); }
  ch.box(0.006, 0.08, 0.012, 0x1a1a1a, -2.437, 2.78, -3.585, 0.5); ch.box(0.006, 0.11, 0.008, 0x1a1a1a, -2.436, 2.75 + 0.04, -3.6 - 0.035, -0.9);
  // -- tall cyber-neon panel near the front (z -0.65..-1.45, y 1.8..2.9)
  const CZ = -1.05, CY = 2.35;
  frame(CZ, CY, 0.8, 1.1, 0.05, 0.08, 0x1a1c22, 0x0c0d12);
  if (lit) {
    const cp = printedMesh(cyberPanelTex(), 0.8, 1.1, false, { k: 1.45 }); cp.position.set(X + 0.056, CY, CZ); cp.rotation.y = Math.PI / 2; cp.layers.enable(1); g.add(cp);
    tagA(anchor(X + 0.4, CY + 0.2, CZ + 0.15, 0x33e4ff, 0.7, 1.9, ['g0'], 0.35), 'g0'); tagA(anchor(X + 0.4, CY - 0.3, CZ - 0.25, 0xff3d9a, 0.55, 1.7, ['g0'], 0.35), 'g0');
  } else ch.box(0.02, 1.1, 0.8, 0x0a0c12, X + 0.05, CY, CZ);
  // -- paper lantern with a crest, glowing in the upper front corner
  const LZ = -0.45, LY = 2.78, LX = X + 0.17;
  ch.bar([X + 0.01, LY + 0.32, LZ], [LX, LY + 0.32, LZ], 0.02, C.iron); ch.box(0.02, 0.1, 0.06, C.iron, X + 0.01, LY + 0.3, LZ);
  P.lantern(ch, LX, LY, LZ, 0, 0.72); P.lanternGlow(em, LX, LY, LZ, lit ? 0xfff0d6 : 0x8a8478, 0.72);
  for (const [dx, dz, ry] of [[0.117, 0, Math.PI / 2], [0, -0.117, 0], [0, 0.117, 0]]) at(ch, LX + dx, LY, LZ + dz, ry, () => { ch.cyl(0.045, 0.045, 0.004, 10, 0x1a1414, 0, 0, 0, Math.PI / 2); for (let i = 0; i < 3; i++) ch.box(0.016, 0.03, 0.006, 0xd8d0c0, Math.cos(i * 2.094) * 0.018, Math.sin(i * 2.094) * 0.018, 0.003, 0, 0, i * 2.094); });
  if (lit) tagA(anchor(LX + 0.15, LY - 0.1, LZ - 0.1, 0xffd8a8, 0.9, 2.4, ['g0'], 0.3), 'g0');
  // -- all the paper (poster, notes, ofuda, scroll, paintings, cork board, calendar)
  menuWallArt(g, ch, em, lit || f.crew);
  // coat hooks between the cork board and the calendar (the brewing wall's tablet/neon/scroll own z -4.75..-5.4)
  for (let i = 0; i < 2; i++) ch.cyl(0.012, 0.012, 0.1, 6, C.brass, -2.44, 1.9, -4.31 - i * 0.11, 0, 0, Math.PI / 2);
}
function posterTex(kind) {
  return panelTex(256, 360, (x, w, h) => {
    if (kind === 0) { x.fillStyle = '#d8cfb6'; x.fillRect(0, 0, w, h); x.fillStyle = '#c2362b'; x.beginPath(); x.arc(w / 2, 130, 70, 0, 7); x.fill(); x.fillStyle = '#1b1b1b'; x.font = `56px ${FONT_SIGN}`; x.textAlign = 'center'; x.fillText('雨', w / 2, 150); x.font = `20px ${FONT_UI}`; x.fillText('AMAGASE TEA FESTIVAL', w / 2, 260); x.fillText('1987', w / 2, 290); }
    else if (kind === 1) { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a1a3a'); g.addColorStop(1, '#0a1a2a'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#33e4ff'; x.font = `40px ${FONT_DOT}`; x.textAlign = 'center'; x.fillText('八番線', w / 2, 70); x.font = `16px ${FONT_DOT}`; for (let i = 0; i < 9; i++) x.fillText(['甘瀬', '中央', '八番', '港', '雨宮', '北'][i % 6] + '  ' + (i * 4 + 2) + ' min', w / 2, 120 + i * 24); }
    else { x.fillStyle = '#efe4cc'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a2118'; x.lineWidth = 3; x.strokeRect(14, 14, w - 28, h - 28); x.fillStyle = '#2a2118'; x.font = `30px ${FONT_CHALK}`; x.textAlign = 'center'; x.fillText('一期一会', w / 2, 70); x.font = `16px ${FONT_UI}`; x.fillText('one time, one meeting', w / 2, 100); x.fillStyle = '#7fae5a'; x.beginPath(); x.ellipse(w / 2, 220, 60, 34, 0.3, 0, 7); x.fill(); }
    x.globalAlpha = 0.12; x.fillStyle = '#000'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * w, Math.random() * h, 3, 3); x.globalAlpha = 1;
  });
}
// soft additive halo around a lit bulb (one sprite = one draw call); lives in the g0 group so rebuilds clear it
function bulbGlow(g, x, y, z, size, op) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: 0xffa860, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); sp.position.set(x, y, z); sp.scale.set(size, size, 1); sp.renderOrder = 3; sp.userData.keepGeo = true; g.add(sp); return sp; }
// back wall shelving above the two work benches (z -5.25), either side of the noren doorway.
// Four tiers per side, two rows deep, crammed with glass tea jars, tins, pots, bowls, teapots, sake;
// warm LED strip under every shelf lip + small baked anchors so contents and tiles glow.
function buildBackShelves(ch, em, lit) {
  const sv = seedS; reseed(5250);
  const TY = [1.65, 2.05, 2.45, 2.85], ZB = -5.3, ZF = -5.195, SIDES = [[-2.5, -0.6], [0.6, 2.5]];
  const GLASS = [0x9fb6b2, 0x93aaa8, 0xa8bcb6, 0x8ea6a4], LEAF = [0x3d4a1e, 0x2a3418, 0x5a4022, 0x6a7a2a, 0x4a3020, 0x8a6a3a, 0x50622a, 0x33401c];
  const TINC = [0x2a4a3a, 0xa83a2a, 0x2a3a5a, 0x8a6a2a, 0x1a1a1a, C.brass, 0x5a2a3a, 0x3a5a5a, 0x6a6e5a];
  const POT = [C.ceramic, C.celadon, 0x6a3a2a, 0x2a3a4a, 0x8a5a3a, 0x3a3430, 0xd8cfb6, 0x4a5a6a];
  const LAB = [C.washi, 0xd8c8a0, 0xe8d8b0];
  const label = (x, y, z, w, h) => { ch.box(w, h, 0.004, spick(LAB), x, y, z); ch.box(w * 0.22, h * 0.6, 0.002, srand() < 0.3 ? C.lacquer : 0x1e1a16, x, y, z + 0.003); };
  const glassJar = (x, y, z, h, r) => { // pale glass shell above a darker leaf fill, cork/steel lid, front highlight
    const fh = (h - 0.014) * srange(0.62, 0.88), gh = h - 0.014 - fh, gc = spick(GLASS);
    ch.cyl(r, r, 0.014, 8, gc, x, y + 0.007, z); ch.cyl(r * 0.96, r * 0.96, fh, 8, spick(LEAF), x, y + 0.014 + fh / 2, z);
    ch.cyl(r, r, gh, 8, gc, x, y + 0.014 + fh + gh / 2, z); ch.cyl(r * 0.8, r, 0.022, 8, gc, x, y + h + 0.011, z);
    ch.cyl(r * 0.78, r * 0.78, 0.03, 8, spick([C.cedarD, C.steel, 0xb08a5a, C.black, 0xb08a5a]), x, y + h + 0.035, z);
    ch.box(0.01, h * 0.8, 0.004, 0xeaf6f2, x - r * 0.45, y + h * 0.52, z + r * 0.9); ch.box(r * 2.02, 0.006, r * 1.6, 0xc4d6d2, x, y + 0.014 + fh, z); // highlight + fill line
    if (srand() < 0.45) label(x, y + fh * 0.5, z + r * 0.97, r * 1.1, Math.min(0.05, fh * 0.5));
  };
  const tin = (x, y, z, h, r, col) => { ch.cyl(r, r, h, 8, col, x, y + h / 2, z); ch.cyl(r * 1.04, r * 1.04, 0.025, 8, spick([C.steelD, C.brass, col, C.steel]), x, y + h - 0.008, z); if (srand() < 0.75) label(x, y + h * 0.45, z + r * 0.99, r * 1.15, h * 0.35); };
  const teaBox = (x, y, z, w, h, col) => { ch.box(w, h, w * 0.8, col, x, y + h / 2, z); ch.box(w * 1.04, 0.025, w * 0.84, spick([C.steelD, col, C.brass]), x, y + h - 0.01, z); label(x, y + h * 0.45, z + w * 0.4 + 0.002, w * 0.6, h * 0.45); };
  const bottle = (x, y, z, h, col) => { P.bottle(ch, x, y, z, col, h); ch.box(0.05, h * 0.3, 0.004, spick(LAB), x, y + h * 0.33, z + 0.036); ch.box(0.012, h * 0.2, 0.002, 0x1a1a1a, x, y + h * 0.33, z + 0.039); };
  const sake = (x, y, z, h, col, lab, seal) => { ch.cyl(0.044, 0.044, h * 0.6, 8, col, x, y + h * 0.3, z); ch.cyl(0.017, 0.044, h * 0.2, 8, col, x, y + h * 0.7, z); ch.cyl(0.017, 0.017, h * 0.14, 6, col, x, y + h * 0.87, z); ch.cyl(0.02, 0.02, h * 0.06, 6, seal, x, y + h * 0.97, z);
    ch.box(0.07, h * 0.36, 0.004, lab, x, y + h * 0.33, z + 0.044); ch.box(0.016, h * 0.26, 0.003, 0x141210, x + 0.005, y + h * 0.35, z + 0.047); ch.box(0.014, 0.014, 0.003, C.lacquer, x - 0.022, y + h * 0.2, z + 0.047); };
  const vase = (x, y, z, r, col) => { ch.ball(r, col, x, y + r * 0.9, z, 1, 1, 0.9, 1); ch.cyl(r * 0.38, r * 0.5, r * 0.55, 8, col, x, y + r * 1.85, z); ch.cyl(r * 0.45, r * 0.4, r * 0.12, 8, col, x, y + r * 2.15, z); };
  const bowls = (x, y, z, r, n) => { const c0 = spick(POT), c1 = spick(POT); for (let i = 0; i < n; i++) ch.cyl(r, r * 0.58, 0.042, 8, i % 2 && srand() < 0.6 ? c1 : c0, x, y + 0.021 + i * 0.03, z); };
  const tetsubin = (x, y, z) => at(ch, x, y, z, srange(-0.5, 0.5), () => { ch.ball(0.075, 0x2a2c30, 0, 0.058, 0, 1, 1, 0.75, 1); ch.cyl(0.032, 0.038, 0.02, 8, 0x22242a, 0, 0.11, 0); ch.ball(0.012, 0x22242a, 0, 0.125, 0); ch.cyl(0.009, 0.017, 0.07, 6, 0x2a2c30, 0.08, 0.075, 0, 0, 0, -0.95); ch.torus(0.055, 0.005, 10, 0x1a1c20, 0, 0.11, 0); });
  // one item starting at x; returns width used. big = back row (taller)
  const place = (kind, x, y, z, big) => {
    switch (kind) {
      case 'jar': { const r = big ? srange(0.05, 0.072) : srange(0.04, 0.058), h = big ? srange(0.15, 0.25) : srange(0.08, 0.13); glassJar(x + r, y, z, h, r); return 2 * r; }
      case 'tin': { const r = big ? srange(0.042, 0.062) : srange(0.035, 0.05), h = big ? srange(0.12, 0.24) : srange(0.06, 0.11); tin(x + r, y, z, h, r, spick(TINC)); return 2 * r; }
      case 'box': { const w = srange(0.08, 0.12); teaBox(x + w / 2, y, z, w, srange(0.12, 0.22), spick(TINC)); return w; }
      case 'bottle': { bottle(x + 0.036, y, z, srange(0.2, 0.28), spick([0x2a5a3a, 0x5a2a1a, 0x9ab0b4, 0x3a2a1a, 0x1e3a2a])); return 0.072; }
      case 'pot': { const r = big ? srange(0.05, 0.075) : srange(0.035, 0.045); vase(x + r, y, z, r, spick(POT)); return 2 * r; }
      case 'bowls': { const r = srange(0.055, 0.075); bowls(x + r, y, z, r, 2 + Math.floor(srand() * (big ? 4 : 3))); return 2 * r; }
      case 'cups': P.cupStack(ch, x + 0.038, y, z, 1 + Math.floor(srand() * (big ? 4 : 3)), spick(POT)); return 0.076;
      case 'kyusu': P.kyusu(ch, x + 0.15, y, z, spick([1.57, -1.57]) + srange(-0.3, 0.3), spick([0x7a3f2a, 0x3a3430, C.celadon, 0x8a5a3a])); return 0.3;
      case 'tetsubin': tetsubin(x + 0.1, y, z); return 0.2;
      case 'plate': { const r = srange(0.07, 0.1); ch.cyl(r, r, 0.016, 10, spick(POT), x + r, y + r + 0.005, -5.355, Math.PI / 2 - 0.14); ch.cyl(r * 0.6, r * 0.6, 0.004, 10, spick([0x2a3a5a, 0x6a3a2a, C.celadon]), x + r, y + r + 0.005, -5.346, Math.PI / 2 - 0.14); return 2 * r; }
    }
    return 0.05;
  };
  // per-shelf mix [back row kinds, front row kinds, reserved back ranges, reserved front ranges]
  const MIX = {
    'L0': [[], [], [], []], // hand-placed: buildBrewShelves
    'L1': [[], [], [], []],
    'L2': [['jar', 'jar', 'jar', 'jar', 'tin', 'tin', 'tin', 'box', 'pot'], ['jar', 'cups', 'bowls', 'tin'], [], []],
    'L3': [['tin', 'tin', 'tin', 'tin', 'box', 'box', 'pot', 'pot', 'jar', 'bottle'], ['bowls', 'cups', 'pot', 'tin'], [], []],
    'R0': [['jar', 'jar', 'jar', 'jar', 'bowls', 'pot', 'tin', 'plate'], ['jar', 'cups', 'bowls', 'jar', 'kyusu'], [[0.6, 0.9]], [[2.1, 2.3]]],
    'R1': [['jar', 'jar', 'jar', 'jar', 'jar', 'jar', 'tin', 'pot'], ['jar', 'jar', 'cups', 'tin'], [[2.12, 2.36]], [[2.12, 2.36]]],
    'R2': [['tin', 'tin', 'tin', 'jar', 'jar', 'jar', 'bowls', 'box'], ['jar', 'cups', 'bowls', 'tin'], [[1.5, 1.95]], [[1.5, 1.95]]],
    'R3': [['tin', 'tin', 'tin', 'pot', 'pot', 'box', 'jar'], ['bowls', 'cups', 'pot'], [[0.8, 1.45], [1.78, 2.5]], [[0.8, 1.45], [1.78, 2.5]]],
  };
  const inR = (x, w, rs) => rs.some(([a, b]) => x + w > a && x < b);
  SIDES.forEach(([x0, x1], si) => TY.forEach((y, ti) => {
    const cx = (x0 + x1) / 2, w = x1 - x0, ys = y + 0.015, [kb, kf, rb, rf] = MIX[(si ? 'R' : 'L') + ti];
    if (!si && ti < 2) { // brewing wall: two heavy dark-wood planks on iron brackets (contents: buildBrewShelves)
      ch.box(w - 0.06, 0.05, 0.27, 0x3a2416, cx, y, -5.25); ch.box(w - 0.06, 0.006, 0.27, 0x5a3a22, cx, y + 0.026, -5.25);
      for (const sx of [-1, 1]) { ch.box(0.03, 0.18, 0.03, C.iron, cx + sx * (w / 2 - 0.12), y - 0.1, -5.37); ch.bar([cx + sx * (w / 2 - 0.12), y - 0.18, -5.37], [cx + sx * (w / 2 - 0.12), y - 0.025, -5.15], 0.022, C.iron); }
    } else P.shelf(ch, cx, y, -5.25, w - 0.1);
    ch.box(w - 0.1, 0.03, 0.012, C.cedarD, cx, y - 0.018, -5.124); // lip / LED channel
    em.box(w - 0.16, 0.012, 0.018, lit ? 0xffc47a : 0x3a342c, cx, y - 0.039, -5.14); // warm LED strip under the lip
    for (const [rows, z, big, rs, gap] of [[kb, ZB, true, rb, 0.08], [kf, ZF, false, rf, 0.45]]) {
      let x = x0 + 0.1;
      while (rows.length && x < x1 - 0.12) {
        if (inR(x, 0.08, rs)) { x += 0.04; continue; }
        if (srand() < gap * 0.25) { x += srange(0.03, 0.09); continue; }
        const k = spick(rows); if (inR(x, k === 'kyusu' ? 0.3 : 0.15, rs) || x + (k === 'kyusu' ? 0.3 : 0.1) > x1 - 0.08) { x += 0.04; continue; }
        x += place(k, x, ys, z + srange(-0.012, 0.012), big) + srange(0.004, big ? 0.02 : 0.05);
      }
    }
    if (lit) for (const fx of [0.27, 0.73]) tagA(anchor(x0 + w * fx, y - 0.07, -5.08, 0xffb466, ti === 0 ? 1.1 : 0.9, ti === 0 ? 1.0 : 0.8, ['g0'], 0.45), 'g0');
  }));
  if (lit) for (const x of [-1.55, 1.55]) tagA(anchor(x, 3.15, -5.05, 0xffc488, 0.35, 0.9, ['g0'], 0.3), 'g0'); // spill onto the top tier
  // --- specials
  // lucky cat (left, 2nd tier, front, between the canisters and the radio)
  at(ch, -1.1, 2.075, ZF + 0.02, -0.15, () => {
    ch.ball(0.06, 0xf0ece0, 0, 0.062, 0, 1, 1, 1.1, 0.9); ch.ball(0.046, 0xf0ece0, 0, 0.16, 0.005, 1);
    for (const s of [-1, 1]) ch.cone(0.014, 0.03, 4, 0xf0ece0, s * 0.026, 0.205, 0); ch.box(0.02, 0.06, 0.02, 0xf0ece0, 0.05, 0.16, 0.02, 0, 0, -0.5);
    ch.torus(0.034, 0.006, 10, C.lacquer, 0, 0.118, 0.008, Math.PI / 2 - 0.2); ch.cyl(0.016, 0.016, 0.004, 8, C.brass, 0, 0.1, 0.058, Math.PI / 2); ch.box(0.04, 0.025, 0.012, C.brass, -0.02, 0.06, 0.05);
  });
  // photo of Chiyo, leaning against the wall (right, bottom tier)
  atR(ch, 0.75, 1.665 + 0.11, -5.34, -0.12, 0, 0, () => { ch.box(0.18, 0.23, 0.02, C.cedarD, 0, 0, 0); ch.box(0.14, 0.18, 0.004, 0xb8a888, 0, 0, 0.011); ch.ball(0.025, 0x5a4a38, 0, 0.025, 0.014, 0, 1, 1.2, 0.3); ch.box(0.07, 0.06, 0.004, 0x5a4a38, 0, -0.04, 0.013); });
  // chopstick / spatula cup (right, bottom tier, front)
  ch.cyl(0.04, 0.035, 0.1, 8, C.ceramic, 2.2, 1.715, ZF); for (let i = 0; i < 7; i++) ch.box(0.008, 0.2, 0.008, i % 3 ? C.bamboo : 0xc8b07a, 2.2 + (i - 3) * 0.008, 1.8, ZF + srange(-0.015, 0.015), srange(-0.1, 0.1), 0, (i - 3) * 0.05);
  // tetsubin on the right 2nd tier
  tetsubin(2.24, 2.065, -5.27);
  // vintage radio (right, 3rd tier) with a glowing dial
  { const rx = 1.72, ry = 2.465, rz = -5.27; ch.box(0.34, 0.2, 0.13, 0x6a4a2a, rx, ry + 0.1, rz); ch.box(0.35, 0.02, 0.14, 0x4a3122, rx, ry + 0.205, rz); ch.box(0.35, 0.015, 0.14, 0x4a3122, rx, ry + 0.007, rz);
    ch.box(0.14, 0.13, 0.004, 0xb8a888, rx + 0.08, ry + 0.1, rz + 0.066); for (let i = 0; i < 5; i++) ch.box(0.13, 0.007, 0.004, 0x3a2a1a, rx + 0.08, ry + 0.05 + i * 0.024, rz + 0.069);
    em.box(0.12, 0.045, 0.004, lit ? 0xffb050 : 0x3a2a1a, rx - 0.08, ry + 0.13, rz + 0.067); ch.box(0.004, 0.04, 0.003, 0xc23b2b, rx - 0.09, ry + 0.13, rz + 0.07);
    for (const d of [-0.12, -0.04]) ch.cyl(0.016, 0.016, 0.02, 8, 0x2a2420, rx + d, ry + 0.06, rz + 0.072, Math.PI / 2);
    ch.bar([rx - 0.1, ry + 0.21, rz], [rx - 0.06, ry + 0.25, rz], 0.012, 0x2a2420); ch.bar([rx - 0.06, ry + 0.25, rz], [rx + 0.06, ry + 0.25, rz], 0.012, 0x2a2420); ch.bar([rx + 0.06, ry + 0.25, rz], [rx + 0.1, ry + 0.21, rz], 0.012, 0x2a2420);
    if (lit) tagA(anchor(rx - 0.08, ry + 0.13, rz + 0.15, 0xffa040, 0.3, 0.4, ['g0'], 0.3), 'g0'); }
  // labelled sake bottles (top right)
  [[1.86, 0x2a4a2a, C.washi, C.lacquer], [1.96, 0x1a1a1a, 0xe8d8b0, C.brass], [2.06, 0x5a2a1a, C.washi, 0x1a1a1a], [2.16, 0x2a3a5a, 0xefe4cc, C.lacquer]].forEach(([x, col, lab, seal], i) => sake(x, 2.865, ZB + (i % 2) * 0.03, srange(0.27, 0.33), col, lab, seal));
  P.cupStack(ch, 2.21, 2.865, ZF, 2, C.ceramic);
  // bowls under the herb bundles (top right, kept low)
  bowls(0.92, 2.865, ZB, 0.07, 3); bowls(1.1, 2.865, ZF, 0.06, 2); tin(1.26, 2.865, ZB, 0.09, 0.045, 0x2a4a3a); P.cupStack(ch, 1.38, 2.865, ZF, 2, C.celadon); P.cupStack(ch, 1.4, 2.865, ZB, 3, 0x6a3a2a);
  // potted pothos on the top right corner, trailing down the right shelf column
  ch.cyl(0.07, 0.055, 0.11, 8, 0xd8cfb6, 2.4, 2.92, -5.24); ch.cyl(0.065, 0.065, 0.01, 8, C.soil, 2.4, 2.97, -5.24);
  for (let i = 0; i < 6; i++) { const a = i * 1.05; ch.box(0.07, 0.05, 0.01, i % 2 ? C.leaf : C.leafD, 2.4 + Math.cos(a) * 0.06, 3.0 + srange(0, 0.05), -5.24 + Math.sin(a) * 0.06, 0.4, a, 0.3); }
  P.pothos(ch, 2.44, 2.95, -5.1, 19); P.pothos(ch, 2.34, 2.9, -5.11, 11); P.pothos(ch, 2.22, 2.88, -5.115, 5); P.pothos(ch, 2.46, 2.1, -5.105, 6);
  P.pothos(ch, -0.66, 2.43, -5.12, 6); // small vine on the left column by the doorway
  // dried herb bundles hanging from a bamboo rod (top right)
  ch.cyl(0.01, 0.01, 0.72, 6, C.bamboo, 1.12, 3.18, -5.07, 0, 0, Math.PI / 2); for (const x of [0.82, 1.42]) ch.cyl(0.004, 0.004, 0.13, 4, 0x111111, x, 3.245, -5.07);
  [[0.92, 0x7a7a3a, 0.2], [1.12, 0x8a6a3a, 0.24], [1.32, 0x6a6a4a, 0.19]].forEach(([x, col, h]) => {
    const top = 3.14; ch.cyl(0.003, 0.003, 0.04, 4, C.bamboo, x, top + 0.02, -5.07); ch.cyl(0.016, 0.016, 0.025, 6, 0xb08a5a, x, top - 0.01, -5.07); ch.cyl(0.008, 0.014, 0.04, 6, 0x6a5a3a, x, top + 0.0, -5.07);
    ch.cone(0.07, h, 7, col, x, top - 0.02 - h / 2, -5.07); ch.cyl(0.07, 0.05, 0.03, 7, col, x, top - 0.02 - h - 0.012, -5.07);
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + srand(); ch.box(0.02, h * srange(0.7, 1.0), 0.012, spick([col, 0x5a5a2a, 0x9a7a4a, 0x7a5a6a]), x + Math.cos(a) * 0.035, top - 0.04 - h * 0.5, -5.07 + Math.sin(a) * 0.035, Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); }
  });
  seedS = sv;
}
/* ---------- brewing wall: everything above/beside the left back bench (x -2.5..-0.6) ----------
   heavy shelves with big labelled canisters, glass jars that show their leaf, glossy tiles with dark grout,
   the taped brew chart (the in-game guide, drawn from RECIPES), notes, and on the side wall an order tablet,
   a 千客万来 scroll, a pink 茶 neon and a trailing pothos. All printed paper shares one atlas texture. */
const BW = { chart: null, tab: null, tabKey: '' };
function bwAtlas(W, H) { // simple row packer over one canvas; draws happen in tex()
  const items = []; let x = 0, y = 0, rh = 0;
  return {
    W, H,
    add(pw, ph, draw) { pw = Math.round(pw); ph = Math.round(ph); if (x + pw > W) { x = 0; y += rh + 4; rh = 0; } const r = { x, y, w: pw, h: ph, draw }; items.push(r); x += pw + 4; rh = Math.max(rh, ph); return r; },
    tex() { return canvasTex(W, H, c => { c.clearRect(0, 0, W, H); for (const r of items) { c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip(); r.draw(c, r.x, r.y, r.w, r.h); c.restore(); } }); },
  };
}
// textured quads -> one mesh. q: { r: atlas rect (null = whole texture), p: [x,y,z] centre, w, h, face: 'z' (faces +z) | 'x' (faces +x), rot, cr: wrap round a can of radius cr }
function bwMesh(qs, tex, W, H, tint) {
  const pos = [], uv = [], idx = [];
  for (const q of qs) {
    const n = q.cr ? 6 : 1, base = pos.length / 3, r = q.r || { x: 0, y: 0, w: W, h: H }, c = Math.cos(q.rot || 0), s = Math.sin(q.rot || 0);
    for (let j = 0; j <= 1; j++) for (let i = 0; i <= n; i++) {
      const lu = (i / n - 0.5) * q.w, lv = (j - 0.5) * q.h; let a = lu * c - lv * s, d = 0; const b = lu * s + lv * c;
      if (q.cr) { const ang = a / q.cr; d = (Math.cos(ang) - 1) * q.cr; a = Math.sin(ang) * q.cr; }
      if (q.face === 'x') pos.push(q.p[0] + d, q.p[1] + b, q.p[2] - a); else pos.push(q.p[0] + a, q.p[1] + b, q.p[2] + d);
      uv.push((r.x + i / n * r.w) / W, 1 - (r.y + (1 - j) * r.h) / H);
    }
    for (let i = 0; i < n; i++) { const a0 = base + i, b0 = base + n + 1 + i; idx.push(a0, a0 + 1, b0 + 1, a0, b0 + 1, b0); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.3, color: tint }));
}
// aged paper fill + speckle + darker edges
function bwPaper(c, X, Y, w, h, col, R) {
  c.fillStyle = col; c.fillRect(X, Y, w, h);
  const g = c.createRadialGradient(X + w / 2, Y + h / 2, Math.min(w, h) * 0.2, X + w / 2, Y + h / 2, Math.max(w, h) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,60,20,0.35)'); c.fillStyle = g; c.fillRect(X, Y, w, h);
  for (let i = 0; i < w * h / 180; i++) { c.fillStyle = R() < 0.6 ? 'rgba(110,80,40,0.18)' : 'rgba(255,250,235,0.25)'; c.fillRect(X + R() * w, Y + R() * h, 1 + R() * 2, 1 + R() * 2); }
}
function bwVText(c, txt, cx, y0, y1, fs, col, font) { const ch = [...txt], step = Math.min(fs * 1.06, (y1 - y0) / ch.length), f = Math.min(fs, step / 1.02); c.font = `${font || ''} ${f}px ${FONT_BRUSH}`; c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; ch.forEach((k, i) => c.fillText(k, cx, y0 + step * (i + 0.5))); }
function bwTape(c, cx, cy, a, w) { c.save(); c.translate(cx, cy); c.rotate(a); c.fillStyle = 'rgba(236,226,196,0.82)'; c.fillRect(-(w || 34) / 2, -8, w || 34, 16); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-(w || 34) / 2, -8, w || 34, 3); c.restore(); }
// steep time in tea-minutes -> 1分 / 30秒 / 1分30秒
function bwSteep(m) { const s = Math.round(m * 60); return s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}分${s % 60}秒` : `${s / 60}分`) : `${s}秒`; }
// the handwritten brewing chart taped left of the tap. It IS the in-game guide: rows come straight from RECIPES.
// Call again whenever recipes change (new tea unlocked, values tuned) - it redraws the same canvas.
function brewChartTex() {
  if (!BW.chart) BW.chart = canvasTex(440, 520, () => { });
  const t = BW.chart, c = t.userData.ctx, W = 440, H = 520, R = texRng(707);
  c.clearRect(0, 0, W, H);
  c.save(); c.translate(W / 2, H / 2); c.rotate(-0.012); c.translate(-W / 2, -H / 2);
  bwPaper(c, 10, 12, W - 20, H - 24, '#eadfc2', R);
  c.strokeStyle = 'rgba(120,90,50,0.25)'; c.lineWidth = 1; for (let y = 104; y < H - 90; y += 64) { c.beginPath(); c.moveTo(26, y + 34); c.lineTo(W - 26, y + 34); c.stroke(); } // ruled lines
  c.fillStyle = '#2a2018'; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.font = `40px ${FONT_CHALKJ}`; c.fillText('お茶の淹れ方', 30, 66);
  c.font = `20px ${FONT_CHALKJ}`; c.fillStyle = '#6a3a2a'; c.fillText('温度 · 時間', W - 128, 96);
  const show = RECIPES.filter(r => r.st === 'kettle' || r.st === 'matcha').filter(r => r.id !== 'blend' || (typeof S !== 'undefined' && S.ch >= 4)).slice(0, 6);
  const rh = Math.min(64, (H - 170) / Math.max(1, show.length));
  show.forEach((r, i) => {
    const y = 136 + i * rh + rh * 0.45, j = (R() - 0.5) * 3;
    c.fillStyle = '#1e1812'; c.font = `${rh * 0.62}px ${FONT_CHALKJ}`; c.textAlign = 'left'; c.font = `${rh * (r.jp.length > 3 ? 0.46 : 0.58)}px ${FONT_CHALKJ}`; c.fillText(r.jp, 24 + j, y);
    c.fillStyle = '#26303a'; c.font = `${rh * 0.52}px ${FONT_CHALKJ}`; c.fillText(`${r.temp}°C`, 170 + j, y);
    const tail = r.st === 'matcha' ? `${r.scoops || 2}杓 ${r.ml || 70}ml` : bwSteep(r.steep);
    c.fillStyle = '#1e1812'; c.font = `${rh * (tail.length > 4 ? 0.36 : 0.52)}px ${FONT_CHALKJ}`; c.fillText(tail, 284 + j, y);
  });
  // a little kyusu doodle + a coffee-ring stain
  c.strokeStyle = 'rgba(40,30,20,0.7)'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(W - 70, H - 52, 26, 18, 0, 0, 7); c.stroke(); c.beginPath(); c.moveTo(W - 96, H - 56); c.lineTo(W - 116, H - 66); c.stroke(); c.beginPath(); c.moveTo(W - 58, H - 70); c.lineTo(W - 40, H - 96); c.stroke();
  c.strokeStyle = 'rgba(140,100,50,0.25)'; c.lineWidth = 5; c.beginPath(); c.arc(90, H - 70, 34, 0.4, 5.6); c.stroke();
  c.restore();
  bwTape(c, 40, 20, -0.5); bwTape(c, W - 40, 22, 0.45); bwTape(c, 36, H - 18, 0.5); bwTape(c, W - 42, H - 20, -0.4);
  t.needsUpdate = true; return t;
}
// order tablet on the side wall: 注文 + the real open orders. list = [{ rid, n }] (or omitted: read CUST)
function bwOrders() { const g = {}; for (const c of (typeof CUST !== 'undefined' ? CUST : [])) if (c.state === 'order' && RECIPES[c.rid]) g[c.rid] = (g[c.rid] || 0) + 1; return Object.keys(g).map(k => ({ rid: +k, n: g[k] })).sort((a, b) => b.n - a.n || a.rid - b.rid); }
function drawOrderTablet(list) {
  if (!BW.tab) return; list = list || bwOrders();
  const key = list.map(o => o.rid + ':' + o.n).join(','); if (key === BW.tabKey && BW.tab.userData.drawn) return; BW.tabKey = key; BW.tab.userData.drawn = 1;
  const c = BW.tab.userData.ctx, W = 256, H = 384;
  const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#16202a'); bg.addColorStop(1, '#0c1218'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
  c.fillStyle = '#1f2c38'; c.fillRect(0, 0, W, 54); c.fillStyle = '#e8f4ff'; c.font = `bold 30px ${FONT_UI}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('注文', 16, 28);
  c.fillStyle = '#7fd8ff'; c.font = `18px ${FONT_UI}`; c.textAlign = 'right'; c.fillText(list.reduce((a, o) => a + o.n, 0) + ' 件', W - 14, 29);
  if (!list.length) { c.fillStyle = 'rgba(200,220,235,0.55)'; c.font = `22px ${FONT_UI}`; c.textAlign = 'center'; c.fillText('— 注文なし —', W / 2, H / 2); }
  list.slice(0, 7).forEach((o, i) => {
    const y = 84 + i * 42, R = RECIPES[o.rid];
    c.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)'; c.fillRect(8, y - 19, W - 16, 38);
    c.fillStyle = '#' + new THREE.Color(R.liq).getHexString(); c.fillRect(12, y - 12, 5, 24);
    c.fillStyle = '#eef6ff'; c.font = `22px ${FONT_UI}`; c.textAlign = 'left'; c.fillText(R.jp, 26, y);
    c.fillStyle = '#ffd27a'; c.font = `bold 24px ${FONT_UI}`; c.textAlign = 'right'; c.fillText(String(o.n), W - 18, y);
  });
  c.fillStyle = 'rgba(127,216,255,0.5)'; c.fillRect(W / 2 - 20, H - 14, 40, 4);
  BW.tab.needsUpdate = true;
}
let bwTabT = 0;
function tickOrderTablet(dt) { bwTabT -= dt; if (bwTabT > 0 || !BW.tab) return; bwTabT = 0.5; drawOrderTablet(); }
// glossy backsplash tiles on the left bench: per-tile glaze variation, wide dark grout, grime low down, one cracked tile
function buildBrewTiles(ch, gl) {
  const x0 = -2.5, x1 = -0.6, y0 = 0.95, y1 = 2.025, PT = 0.15, T = 0.132;
  ch.box(x1 - x0, y1 - y0, 0.008, 0x1e1a15, (x0 + x1) / 2, (y0 + y1) / 2, -5.394); // grout bed
  const GL = [0x3a6c5c, 0x356456, 0x407262, 0x30594d, 0x447866, 0x386a5a];
  gl.gk = 1;
  for (let x = x0; x < x1 - 0.01; x += PT) for (let y = y0; y < y1 - 0.02; y += PT) {
    const h = Math.min(T, y1 - y - 0.012), k = (y < 1.12 ? srange(0.7, 0.85) : srange(0.88, 1.08)), col = new THREE.Color(spick(GL)).multiplyScalar(k).getHex();
    gl.box(T, h, 0.012, col, x + PT / 2, y + 0.011 + h / 2, -5.383);
  }
  gl.gk = 0;
  // cracked tile right of the tap (x -1.25, y 1.40): dark crack line + a chipped corner
  const cx = -1.225, cy = 1.475, z = -5.3765; let p = [cx - 0.06, cy + 0.05, z];
  for (const q of [[cx - 0.025, cy + 0.02], [cx - 0.01, cy - 0.01], [cx + 0.03, cy - 0.02], [cx + 0.06, cy - 0.055]]) { const n = [q[0], q[1], z]; ch.bar(p, n, 0.0035, 0x0a0806); p = n; }
  ch.bar([cx - 0.01, cy - 0.01, z], [cx - 0.005, cy - 0.06, z], 0.003, 0x0a0806);
  ch.box(0.03, 0.022, 0.006, 0x1a1612, cx + 0.05, cy + 0.052, -5.379, 0, 0, 0.5);
}
// shelf contents + printed paper for the brewing wall
function buildBrewWall(g, ch, em, lit) {
  const sv = seedS; reseed(5390);
  const A = bwAtlas(1024, 1024), PPM = 900, q = [], R = texRng(5391);
  const label = (txt, w, h, opt) => A.add(w * PPM, h * PPM, (c, X, Y, ww, hh) => {
    bwPaper(c, X, Y, ww, hh, (opt && opt.bg) || '#e9dcb8', R);
    c.strokeStyle = (opt && opt.ink2) || '#7a3a26'; c.lineWidth = 2; c.strokeRect(X + 5, Y + 5, ww - 10, hh - 10);
    bwVText(c, txt, X + ww / 2, Y + hh * 0.08, Y + hh * ((opt && opt.end) || 0.84), ww * 0.62, (opt && opt.ink) || '#17120e', 'bold');
    if (!opt || opt.seal !== false) { c.fillStyle = 'rgba(190,40,30,0.88)'; c.fillRect(X + ww / 2 - ww * 0.12, Y + hh * 0.86, ww * 0.24, ww * 0.24); }
  });
  const T0 = 2.075, T1 = 1.675, ZB = -5.29, ZF = -5.2;
  // ---------- top shelf: pothos pot, white bowls, four big canisters, lucky cat (buildBackShelves), radio
  ch.cyl(0.055, 0.045, 0.1, 10, 0xd8cfb6, -2.4, T0 + 0.05, -5.22); ch.cyl(0.05, 0.05, 0.01, 10, C.soil, -2.4, T0 + 0.098, -5.22);
  for (let i = 0; i < 7; i++) { const a = i * 0.9; ch.box(0.07, 0.05, 0.01, i % 2 ? C.leaf : C.leafD, -2.4 + Math.cos(a) * 0.05, T0 + 0.13 + srange(0, 0.05), -5.22 + Math.sin(a) * 0.05, 0.4, a, 0.3); }
  P.pothos(ch, -2.42, T0 - 0.04, -5.1, 13); P.pothos(ch, -2.35, T0 - 0.05, -5.105, 8); P.pothos(ch, -2.47, T0 + 0.05, -5.16, 5);
  for (let i = 0; i < 4; i++) ch.cyl(0.078, 0.046, 0.05, 12, i === 3 ? 0xd8d2c4 : C.ceramic, -2.22, T0 + 0.025 + i * 0.034, ZB + 0.02); // stacked white bowls
  for (let i = 0; i < 3; i++) ch.cyl(0.062, 0.038, 0.042, 12, C.ceramic, -2.2, T0 + 0.021 + i * 0.03, ZF + 0.06);
  [['抹茶', 0x1f3a2a, C.brass], ['玉露', 0x1d4a4a, 0x2a2c30], ['玄米茶', 0x4a3020, C.steelD], ['煎茶', 0x18191c, C.brass]].forEach(([jp, col, lid], i) => {
    const x = -1.98 + i * 0.23, r = 0.09, h = 0.27, z = -5.25;
    ch.cyl(r, r, h, 16, col, x, T0 + h / 2, z); ch.cyl(r * 1.03, r * 1.03, 0.04, 16, lid, x, T0 + h - 0.02, z); ch.cyl(r * 1.03, r * 1.03, 0.012, 16, lid, x, T0 + 0.006, z);
    ch.cyl(r * 0.5, r * 0.6, 0.012, 12, lid, x, T0 + h + 0.006, z); ch.box(0.006, h * 0.86, 0.004, 0xffffff, x - r * 0.55, T0 + h * 0.48, z + r * 0.84, 0, -0.6, 0); // knob + glint
    q.push({ r: label(jp, 0.105, 0.16, { end: jp.length > 2 ? 0.84 : 0.8 }), p: [x, T0 + h * 0.47, z + r + 0.002], w: 0.105, h: 0.16, cr: r + 0.002 });
  });
  // vintage radio, right end, warm dial
  { const rx = -0.82, ry = T0, rz = -5.26; ch.box(0.3, 0.19, 0.13, 0x6a4024, rx, ry + 0.095, rz); ch.box(0.31, 0.02, 0.14, 0x3e2616, rx, ry + 0.195, rz); ch.box(0.31, 0.015, 0.14, 0x3e2616, rx, ry + 0.007, rz);
    ch.box(0.12, 0.12, 0.004, 0xb8a888, rx + 0.07, ry + 0.095, rz + 0.066); for (let i = 0; i < 5; i++) ch.box(0.11, 0.006, 0.004, 0x3a2a1a, rx + 0.07, ry + 0.045 + i * 0.023, rz + 0.069);
    em.box(0.11, 0.045, 0.004, lit ? 0xffb050 : 0x3a2a1a, rx - 0.075, ry + 0.125, rz + 0.067); ch.box(0.004, 0.04, 0.003, 0xc23b2b, rx - 0.08, ry + 0.125, rz + 0.07);
    for (const d of [-0.11, -0.04]) ch.cyl(0.016, 0.016, 0.02, 8, 0x2a2420, rx + d, ry + 0.055, rz + 0.072, Math.PI / 2);
    ch.bar([rx + 0.08, ry + 0.2, rz - 0.03], [rx + 0.16, ry + 0.34, rz - 0.04], 0.006, C.steel);
    if (lit) tagA(anchor(rx - 0.07, ry + 0.13, rz + 0.17, 0xffa040, 0.45, 0.55, ['g0'], 0.3), 'g0'); }
  // ---------- middle shelf: glass jars that show their leaf, ほうじ茶 box, plates, sake 山田, cups, bowls, dried flowers
  const jar = (x, r, h, kind) => {
    const z = -5.25, fh = h * 0.72, gc = 0xa8bcb8, fill = kind === 'genmai' ? 0xb08a50 : kind === 'gyokuro' ? 0x2a4a1c : 0x3a4a1e;
    ch.cyl(r, r, 0.012, 14, gc, x, T1 + 0.006, z); ch.cyl(r * 0.95, r * 0.95, fh, 14, fill, x, T1 + 0.012 + fh / 2, z);
    ch.cyl(r, r, h - fh - 0.012, 14, 0xb8ccc8, x, T1 + 0.012 + fh + (h - fh - 0.012) / 2, z); ch.cyl(r * 0.82, r, 0.02, 14, gc, x, T1 + h + 0.01, z);
    ch.cyl(r * 0.84, r * 0.84, 0.035, 14, kind === 'genmai' ? 0xb08a5a : C.steel, x, T1 + h + 0.037, z);
    for (let i = 0; i < 26; i++) { const a = srange(-1.1, 1.1), yy = T1 + 0.02 + srand() * (fh - 0.02), px = x + Math.sin(a) * r * 0.955, pz = z + Math.cos(a) * r * 0.955;
      if (kind === 'genmai' && i % 2) ch.ball(0.009, srand() < 0.6 ? 0xf2ead6 : 0xd8b070, px, yy, pz, 0); // popped rice
      else ch.box(srange(0.012, 0.022), 0.005, 0.004, spick(kind === 'genmai' ? [0x4a5a22, 0x6a7a2a, 0x8a6a30] : [0x52682a, 0x2a3a16, 0x6a8a32, 0x3e5220]), px, yy, pz, 0, a, srange(-0.8, 0.8)); }
    ch.box(0.008, h * 0.75, 0.004, 0xeef8f6, x - r * 0.5, T1 + h * 0.5, z + r * 0.88, 0, -0.5, 0); ch.box(0.006, h * 0.5, 0.004, 0xdcecea, x + r * 0.6, T1 + h * 0.45, z + r * 0.8, 0, 0.6, 0); // glints
  };
  jar(-2.34, 0.072, 0.22, 'sencha'); jar(-2.16, 0.075, 0.2, 'genmai'); jar(-1.995, 0.056, 0.16, 'gyokuro');
  // ほうじ茶 wooden box
  { const x = -1.8, w = 0.17, h = 0.21, d = 0.15, z = -5.26; ch.box(w, h, d, 0x6a4528, x, T1 + h / 2, z); ch.box(w + 0.008, 0.025, d + 0.008, 0x4a2e1a, x, T1 + h - 0.0125, z);
    for (const sx of [-1, 1]) ch.box(0.012, h, 0.004, 0x4a2e1a, x + sx * (w / 2 - 0.006), T1 + h / 2, z + d / 2 + 0.002);
    q.push({ r: label('ほうじ茶', 0.075, 0.15, { bg: '#efe4c8', end: 0.86 }), p: [x, T1 + h * 0.46, z + d / 2 + 0.003], w: 0.075, h: 0.15 }); }
  for (let i = 0; i < 6; i++) ch.cyl(0.1, 0.085, 0.012, 16, i % 3 === 2 ? C.celadon : 0xece6d8, -1.58, T1 + 0.006 + i * 0.013, -5.27); // stacked plates
  P.cupStack(ch, -1.58, T1 + 0.08, -5.27, 2, 0x2a3a4a);
  // sake 山田
  { const x = -1.38, z = -5.25, h = 0.33, col = 0x1e3a24; ch.cyl(0.045, 0.045, h * 0.6, 14, col, x, T1 + h * 0.3, z); ch.cyl(0.017, 0.045, h * 0.18, 14, col, x, T1 + h * 0.69, z); ch.cyl(0.016, 0.017, h * 0.16, 10, col, x, T1 + h * 0.86, z); ch.cyl(0.019, 0.019, h * 0.06, 10, 0xc9a24a, x, T1 + h * 0.96, z);
    ch.box(0.006, h * 0.5, 0.004, 0x6a9a7a, x - 0.026, T1 + h * 0.32, z + 0.036, 0, -0.6, 0);
    q.push({ r: label('山田', 0.06, 0.12, { bg: '#f1e8d2', seal: false, end: 0.9 }), p: [x, T1 + h * 0.3, z + 0.0455], w: 0.06, h: 0.12, cr: 0.0455 }); }
  P.cupStack(ch, -1.22, T1, -5.22, 3, C.ceramic); P.cupStack(ch, -1.24, T1, -5.31, 2, 0x7a3a2a);
  for (let i = 0; i < 3; i++) ch.cyl(0.078, 0.048, 0.055, 12, [0x7a2a1e, 0x3a2a24, 0x9a3a28][i], -1.06, T1 + 0.0275 + i * 0.038, -5.26);
  for (let i = 0; i < 2; i++) ch.cyl(0.06, 0.036, 0.04, 12, C.celadon, -0.9, T1 + 0.02 + i * 0.03, -5.22); P.cupStack(ch, -0.9, T1, -5.32, 3, 0xd8cfb6);
  // dried flowers in a stoneware vase, right end, reaching up toward the top shelf
  { const x = -0.72, z = -5.25; ch.ball(0.05, 0x5a4a3e, x, T1 + 0.05, z, 1, 1, 1.1, 1); ch.cyl(0.022, 0.03, 0.05, 10, 0x5a4a3e, x, T1 + 0.11, z);
    for (let i = 0; i < 11; i++) { const a = i * 0.57, lean = srange(0.08, 0.3), L = srange(0.2, 0.32), tx = x + Math.cos(a) * lean * L, ty = T1 + 0.12 + L * Math.cos(lean), tz = z + Math.sin(a) * lean * L * 0.6;
      ch.bar([x, T1 + 0.12, z], [tx, ty, tz], 0.004, spick([0x8a7a4a, 0x6a6038, 0x9a8a5a]));
      for (let k = 0; k < 4; k++) ch.ball(0.011, spick([0xb06a8a, 0xc890a8, 0x8a5a7a, 0xd8c8a0, 0xa04a5a]), tx + srange(-0.015, 0.015), ty - k * 0.018, tz + srange(-0.012, 0.012), 0); } }
  // ---------- backsplash paper: two vertical notes right of this bench (the brew chart is its own texture)
  q.push({ r: A.add(0.085 * PPM, 0.27 * PPM, (c, X, Y, w, h) => { bwPaper(c, X + 3, Y + 6, w - 6, h - 8, '#ece3cc', R); bwVText(c, '水は大切に', X + w / 2, Y + h * 0.08, Y + h * 0.8, w * 0.55, '#1e1814'); c.strokeStyle = '#3a2a20'; c.lineWidth = 2; c.beginPath(); c.ellipse(X + w / 2, Y + h * 0.89, w * 0.18, h * 0.03, 0, 0, 7); c.stroke(); bwTape(c, X + w / 2, Y + 6, 0.1, 30); }), p: [-0.99, 1.34, -5.374], w: 0.085, h: 0.27, rot: 0.02 });
  q.push({ r: A.add(0.16 * PPM, 0.22 * PPM, (c, X, Y, w, h) => {
    bwPaper(c, X + 3, Y + 6, w - 6, h - 8, '#f0e8d4', R);
    [['美味しい', 0.8], ['お茶で', 0.5], ['よい一日を', 0.2]].forEach(([t, fx]) => bwVText(c, t, X + w * fx, Y + h * 0.07, Y + h * (t.length > 4 ? 0.86 : t.length > 3 ? 0.66 : 0.52), w * 0.24, '#1e1814'));
    c.strokeStyle = '#4a6a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(X + w * 0.55, Y + h * 0.9); c.quadraticCurveTo(X + w * 0.7, Y + h * 0.8, X + w * 0.85, Y + h * 0.9); c.stroke(); bwTape(c, X + w * 0.25, Y + 6, -0.3, 30); bwTape(c, X + w * 0.78, Y + 6, 0.3, 30);
  }), p: [-0.78, 1.3, -5.374], w: 0.16, h: 0.22, rot: -0.03 });
  // ---------- side wall (x -2.5): 千客万来 scroll, order tablet on an arm, pink 茶 neon
  const X = -2.5, SZ = -4.74, SY = 2.25;
  q.push({ r: A.add(0.15 * PPM, 0.56 * PPM, (c, X0, Y0, w, h) => {
    c.fillStyle = '#4a3a2a'; c.fillRect(X0, Y0, w, h); c.fillStyle = '#8a6a3a'; c.fillRect(X0, Y0 + h * 0.05, w, 4); c.fillRect(X0, Y0 + h * 0.93, w, 4);
    bwPaper(c, X0 + w * 0.1, Y0 + h * 0.09, w * 0.8, h * 0.82, '#efe6cf', R); bwVText(c, '千客万来', X0 + w / 2, Y0 + h * 0.12, Y0 + h * 0.8, w * 0.6, '#141210', '900');
    c.fillStyle = '#c2302a'; c.fillRect(X0 + w * 0.6, Y0 + h * 0.82, w * 0.14, w * 0.14);
  }), p: [X + 0.014, SY, SZ], w: 0.15, h: 0.56, face: 'x' });
  ch.cyl(0.011, 0.011, 0.19, 8, 0x2a1a10, X + 0.025, SY + 0.29, SZ, Math.PI / 2); ch.cyl(0.014, 0.014, 0.19, 8, 0x2a1a10, X + 0.028, SY - 0.29, SZ, Math.PI / 2);
  ch.bar([X + 0.012, SY + 0.4, SZ], [X + 0.02, SY + 0.29, SZ + 0.08], 0.004, 0xc9a24a); ch.bar([X + 0.012, SY + 0.4, SZ], [X + 0.02, SY + 0.29, SZ - 0.08], 0.004, 0xc9a24a); ch.box(0.016, 0.016, 0.016, C.brass, X + 0.008, SY + 0.4, SZ);
  // tablet: wall plate -> two-link arm -> tablet turned toward the bench and the room
  { const tx = -2.35, ty = 1.5, tz = -4.98, th = Math.PI / 2 - 0.55;
    ch.box(0.012, 0.09, 0.06, 0x2a2c31, X + 0.006, ty, tz - 0.06); ch.bar([X + 0.01, ty, tz - 0.06], [X + 0.08, ty - 0.01, tz - 0.05], 0.018, 0x3a3e46); ch.bar([X + 0.08, ty - 0.01, tz - 0.05], [tx - 0.03, ty, tz - 0.02], 0.016, 0x3a3e46); ch.ball(0.014, 0x2a2c31, X + 0.08, ty - 0.01, tz - 0.05, 1);
    at(ch, tx, ty, tz, th, () => { ch.box(0.2, 0.29, 0.014, 0x111316, 0, 0, 0); ch.box(0.05, 0.04, 0.02, 0x2a2c31, 0, 0, -0.012); });
    if (!BW.tab) BW.tab = canvasTex(256, 384, () => { }); BW.tabKey = ''; BW.tab.userData.drawn = 0; drawOrderTablet();
    const sc = printedMesh(BW.tab, 0.18, 0.27, false, { k: lit ? 1.5 : 0.25 }); sc.position.set(tx + Math.sin(th) * 0.0075, ty, tz + Math.cos(th) * 0.0075); sc.rotation.y = th; sc.layers.enable(1); g.add(sc);
    if (lit) tagA(anchor(tx + 0.12, ty, tz + 0.06, 0x7fd0ff, 0.3, 0.6, ['g0'], 0.3), 'g0'); }
  // pink 茶 neon on a dark backer, spilling pink over the corner
  { const NZ = -5.0, NY = 2.2; ch.box(0.025, 0.3, 0.28, 0x14121a, X + 0.0125, NY, NZ);
    if (lit) { neon('茶', X + 0.03, NY, NZ, Math.PI / 2, 0.26, 'mag', { vertical: true, border: true, px: 110, k: 2.3, lit: 0, group: g }); tagA(anchor(X + 0.4, NY - 0.1, NZ - 0.1, 0xff3d9a, 1.0, 1.8, ['g0'], 0.35), 'g0'); }
    else ch.box(0.004, 0.22, 0.2, 0x3a2030, X + 0.027, NY, NZ); }
  // ---------- one mesh for every label/note/scroll, one for the live brew chart
  const k = lit ? 1 : 0.45;
  g.add(bwMesh(q, A.tex(), A.W, A.H, new THREE.Color(0.86 * k, 0.78 * k, 0.64 * k)));
  g.add(bwMesh([{ p: [-1.612, 1.36, -5.375], w: 0.21, h: 0.248, rot: 0.015 }], brewChartTex(), 440, 520, new THREE.Color(0.9 * k, 0.82 * k, 0.68 * k)));
  seedS = sv;
}
function both0(ch, em, x, y, z, ry, fn) { at(ch, x, y, z, ry, () => at(em, x, y, z, ry, fn)); }
function calendarTex() {
  return panelTex(200, 280, (x, w, h) => {
    x.fillStyle = '#efe6d2'; x.fillRect(0, 0, w, h); x.fillStyle = '#b83a30'; x.fillRect(0, 0, w, 64); x.fillStyle = '#fff4e0'; x.font = `bold 44px ${FONT_UI}`; x.textAlign = 'center'; x.fillText('11', w / 2, 48);
    x.fillStyle = '#2a2118'; x.font = `13px ${FONT_UI}`; ['日', '月', '火', '水', '木', '金', '土'].forEach((d, i) => { x.fillStyle = i === 0 ? '#b83a30' : '#2a2118'; x.fillText(d, 18 + i * 27, 86); });
    x.font = `14px ${FONT_UI}`; for (let d = 1; d <= 30; d++) { const c = (d + 2) % 7, r = Math.floor((d + 2) / 7); const px = 18 + c * 27, py = 112 + r * 32; x.fillStyle = c === 0 ? '#b83a30' : '#2a2118'; x.fillText(String(d), px, py);
      if (d < 18) { x.strokeStyle = '#c23b2b'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(px - 9, py - 14); x.lineTo(px + 9, py + 4); x.moveTo(px + 9, py - 14); x.lineTo(px - 9, py + 4); x.stroke(); } }
    x.strokeStyle = '#8a7a60'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
  });
}
// ---- +x side wall: floor-to-ceiling tea shelving (tins, jars, pots), kamidana, lucky cat, calendar
function buildXWall(ch, em, g, lit) {
  const TINS = [0x2a4a3a, 0xa83a2a, 0x2a3a5a, 0x8a6a2a, 0x1c1c1e, 0x6a2a3a, 0xc8b890, 0x3a6a5a, 0xb8902a, 0x4a3a6a, 0x7a8a8a, 0x2a5a4a];
  const LABEL = [C.washi, 0xf4ead2, 0xe8d8a8, 0xd8c8a8, 0xefe0c0];
  const LEAF = [0x5f7d38, 0x8a5a2a, 0xc8a050, 0x3a5a2a, 0x6a4a2a, 0x9a8a40];
  const POT = [C.ceramic, C.celadon, 0x6a3a2a, 0x2a3a4a, 0xa89878, 0x3a2a24];
  const glyph = (x, y, z, h) => { ch.box(0.012, h, 0.003, 0x2a2018, x, y, z); if (srand() < 0.6) ch.box(0.024, 0.006, 0.003, 0x2a2018, x, y + h * 0.2, z); };
  // one item at local (x, y) on a shelf whose front is at local z = d; returns its footprint width
  const item = (x, y, d) => { const z = d * 0.5, r = srand();
    if (r < 0.3) { const h = srange(0.1, 0.2), col = spick(TINS); ch.cyl(0.045, 0.045, h, 8, col, x, y + h / 2, z); ch.cyl(0.047, 0.047, 0.025, 8, srand() < 0.5 ? C.steelD : C.brass, x, y + h - 0.01, z); const lc = spick(LABEL); ch.box(0.06, h * 0.5, 0.006, lc, x, y + h * 0.48, z + 0.044); glyph(x, y + h * 0.48, z + 0.048, h * 0.3); return 0.1; }
    if (r < 0.5) { const h = srange(0.12, 0.22), col = spick(TINS); ch.box(0.08, h, 0.08, col, x, y + h / 2, z); ch.box(0.084, 0.02, 0.084, C.steelD, x, y + h - 0.008, z); ch.box(0.06, h * 0.55, 0.005, spick(LABEL), x, y + h * 0.48, z + 0.042); glyph(x, y + h * 0.48, z + 0.046, h * 0.32); return 0.1; }
    if (r < 0.7) { const h = srange(0.16, 0.24); P.jar(ch, x, y, z, spick(LEAF), h); if (srand() < 0.6) ch.box(0.05, 0.04, 0.005, spick(LABEL), x, y + h * 0.5, z + 0.066); return 0.14; }
    if (r < 0.84) { const col = spick(POT), h = srange(0.08, 0.13); ch.cyl(0.04, 0.055, h, 8, col, x, y + h / 2, z); ch.cyl(0.042, 0.042, 0.018, 8, col, x, y + h + 0.009, z); ch.ball(0.012, col, x, y + h + 0.024, z); if (srand() < 0.5) ch.box(0.07, 0.008, 0.006, 0x2a3a4a, x, y + h * 0.6, z + 0.05); return 0.12; }
    if (r < 0.93) { P.cupStack(ch, x, y, z, 2 + Math.floor(srand() * 3), spick([C.ceramic, C.celadon, 0x6a4a3a])); return 0.09; }
    P.bottle(ch, x, y, z, spick([0x2a5a3a, 0x5a2a1a, 0x9ab0b4, 0x3a2a1a]), srange(0.18, 0.26)); return 0.08;
  };
  const fill = (w, y, d, x0, x1) => { let x = (x0 == null ? -w / 2 : x0) + 0.06; const xe = (x1 == null ? w / 2 : x1) - 0.06; while (x < xe - 0.03) { const ww = item(x, y, d); x += ww * 0.5 + srange(0.06, 0.1); } };
  const bonsai = (x, y, z) => { ch.box(0.16, 0.05, 0.1, 0x3a4a5a, x, y + 0.025, z); ch.box(0.15, 0.01, 0.09, C.soil, x, y + 0.05, z); ch.bar([x, y + 0.05, z], [x - 0.03, y + 0.12, z], 0.022, 0x5a4030); ch.bar([x - 0.03, y + 0.12, z], [x + 0.03, y + 0.18, z], 0.018, 0x5a4030);
    for (const [ox, oy, rr] of [[-0.06, 0.15, 0.05], [0.05, 0.2, 0.055], [-0.01, 0.23, 0.045], [0.08, 0.15, 0.035]]) ch.ball(rr, srand() < 0.5 ? C.leafD : 0x4a7a3a, x + ox, y + oy, z, 0, 1, 0.6, 1); };
  const neko = (x, y, z, s) => { const W = 0xf2eee4; ch.box(0.1 * s, 0.02 * s, 0.07 * s, C.lacquer, x, y + 0.01 * s, z); ch.ball(0.042 * s, W, x, y + 0.06 * s, z, 1, 1, 1.1, 0.9); ch.ball(0.038 * s, W, x, y + 0.13 * s, z + 0.005 * s, 1);
    for (const sx of [-1, 1]) { ch.cone(0.013 * s, 0.03 * s, 4, W, x + sx * 0.022 * s, y + 0.168 * s, z); ch.box(0.008 * s, 0.006 * s, 0.003, C.black, x + sx * 0.014 * s, y + 0.137 * s, z + 0.04 * s); }
    ch.torus(0.03 * s, 0.006 * s, 10, C.lacquer, x, y + 0.095 * s, z, Math.PI / 2); ch.ball(0.009 * s, C.brass, x, y + 0.09 * s, z + 0.035 * s); ch.box(0.016 * s, 0.05 * s, 0.016 * s, W, x + 0.04 * s, y + 0.15 * s, z + 0.01 * s); ch.ball(0.011 * s, W, x + 0.04 * s, y + 0.178 * s, z + 0.012 * s); ch.box(0.04 * s, 0.03 * s, 0.006, 0xd8b040, x, y + 0.05 * s, z + 0.038 * s); };
  // shelf case in local frame (wall at z 0, open toward +z); tiers = shelf heights; cab = closed base height
  const caseUnit = (w, d, top, tiers, cab, bottom) => { const b = bottom || 0;
    ch.box(w, top - b, 0.02, 0x3a281c, 0, (top + b) / 2, 0.01);
    for (const sx of [-1, 1]) ch.box(0.04, top - b, d, C.cedarD, sx * (w / 2 - 0.02), (top + b) / 2, d / 2);
    ch.box(w + 0.04, 0.05, d + 0.04, C.cedarD, 0, top, d / 2 + 0.01);
    if (cab) { ch.box(w - 0.04, 0.08, d - 0.02, C.cedarD, 0, 0.04, d / 2); const n = w > 0.7 ? 2 : 1; for (let i = 0; i < n; i++) { const dw = (w - 0.08) / n, cx = -w / 2 + 0.04 + dw * (i + 0.5); ch.box(dw - 0.01, cab - 0.1, 0.02, C.cedar, cx, 0.08 + (cab - 0.1) / 2, d - 0.01); ch.box(dw - 0.06, cab - 0.18, 0.004, 0x6e4a30, cx, 0.08 + (cab - 0.1) / 2, d + 0.001); ch.box(0.06, 0.012, 0.016, C.brass, cx, cab - 0.08, d + 0.006); } }
    for (const y of tiers) { ch.box(w - 0.06, 0.03, d - 0.02, C.cedar, 0, y, d / 2); ch.box(w - 0.06, 0.045, 0.016, C.cedarD, 0, y - 0.006, d - 0.008); if (lit) em.box(w - 0.14, 0.008, 0.01, 0xffc27a, 0, y - 0.024, d - 0.04); }
  };
  const both = (x, y, z, ry, fn) => both0(ch, em, x, y, z, ry, fn);
  // -- corner unit on the front wall (x 1.96..2.5), faces -z: tins below, kamidana on the top tier
  { const w = 0.54, d = 0.28, tiers = [0.85, 1.25, 1.65, 2.05, 2.45];
    both(2.23, 0, -0.2, Math.PI, () => {
      caseUnit(w, d, 2.88, tiers, 0.85);
      fill(w, 0.865, d); neko(-0.14, 1.265, d * 0.55, 1.25); fill(w, 1.265, d, -0.06); fill(w, 1.665, d); bonsai(0.12, 2.065, d * 0.5); fill(w, 2.065, d, null, 0.02);
      // kamidana: little shrine, sakaki vases, shimenawa rope, two lanterns
      const y = 2.465, z = d * 0.45; ch.box(0.36, 0.02, 0.2, 0xd8c8a0, 0, y + 0.01, z); ch.box(0.2, 0.025, 0.14, 0xc8b890, 0, y + 0.032, z);
      ch.box(0.14, 0.12, 0.1, 0xd8c8a0, 0, y + 0.105, z); ch.box(0.07, 0.09, 0.006, 0xb89a68, 0, y + 0.1, z + 0.052); ch.ball(0.012, C.brass, 0, y + 0.13, z + 0.056);
      for (const sx of [-1, 1]) { ch.box(0.2, 0.012, 0.09, 0x3a3028, 0, y + 0.18 + 0.02, z + sx * 0.04, sx * 0.5); ch.box(0.008, 0.06, 0.008, 0x3a3028, sx * 0.08, y + 0.24, z, 0, 0, sx * 0.5); }
      ch.box(0.2, 0.014, 0.014, 0x3a3028, 0, y + 0.225, z); ch.cyl(0.012, 0.012, 0.38, 6, 0xc8b070, 0, y - 0.03, d + 0.005, 0, 0, Math.PI / 2);
      for (const sx of [-0.12, -0.04, 0.04, 0.12]) { ch.box(0.016, 0.02, 0.003, 0xf6f2ea, sx, y - 0.055, d + 0.012, 0, 0, 0.3); ch.box(0.016, 0.02, 0.003, 0xf6f2ea, sx + 0.004, y - 0.075, d + 0.012, 0, 0, -0.3); }
      for (const sx of [-1, 1]) { ch.cyl(0.014, 0.012, 0.05, 6, C.ceramic, sx * 0.1, y + 0.07, z + 0.03); for (let i = 0; i < 3; i++) ch.box(0.03, 0.04, 0.008, C.leafD, sx * 0.1 + (i - 1) * 0.012, y + 0.11, z + 0.03, 0, i, (i - 1) * 0.5);
        const lx = sx * 0.2; ch.cyl(0.03, 0.03, 0.012, 8, C.black, lx, y + 0.17, z + 0.02); ch.cyl(0.026, 0.03, 0.012, 8, C.black, lx, y + 0.026, z + 0.02); ch.cyl(0.004, 0.004, 0.04, 4, C.black, lx, y + 0.19, z + 0.02);
        em.cyl(0.026, 0.026, 0.12, 10, lit ? 0xffa850 : 0x6a3a20, lx, y + 0.095, z + 0.02); }
    });
    solid(1.96, 2.5, 0, 2.9, -0.5, -0.2, 'g0furn');
  }
  // -- side-wall run on x = 2.5 (faces -x): two full-height bays with a hung bridge over the dumbwaiter hatch (z -1.85..-2.55)
  const side = (z0, z1, fn) => both(2.5, 0, (z0 + z1) / 2, -Math.PI / 2, () => fn(Math.abs(z1 - z0)));
  const d = 0.3;
  for (const [z0, z1] of [[-0.8, -1.82], [-2.58, -3.6]]) {
    side(z0, z1, (w) => { const tiers = [0.78, 1.2, 1.6, 2.0, 2.4]; caseUnit(w, d, 2.86, tiers, 0.78); for (const y of tiers) fill(w, y + 0.015, d); });
    solid(2.18, 2.5, 0, 2.9, Math.min(z0, z1), Math.max(z0, z1), 'g0furn');
  }
  // plants: a potted one on the first bay, trailing pothos from the bridge
  side(-1.82, -2.58, (w) => { caseUnit(w, d, 2.86, [1.82, 2.25], 0, 1.8); fill(w, 1.835, d, null, 0.1); P.plant(ch, 0.24, 2.265, d * 0.5, 0.6, 1); fill(w, 2.265, d, null, 0.05); P.pothos(ch, -0.2, 1.78, d - 0.02, 5); });
  solid(2.18, 2.5, 1.78, 2.9, -2.58, -1.82, 'g0furn');
  // the calendar between the corner unit and the first bay
  const cm = printedMesh(calendarTex(), 0.22, 0.31, true); cm.position.set(2.485, 1.72, -0.65); cm.rotation.y = -Math.PI / 2; g.add(cm);
  ch.cyl(0.004, 0.004, 0.01, 4, C.iron, 2.49, 1.9, -0.65, 0, 0, Math.PI / 2);
  if (lit) { tagA(anchor(1.95, 2.3, -0.75, 0xffb066, 1.0, 2.2, ['g0'], 0.25), 'g0'); tagA(anchor(1.85, 2.2, -2.2, 0xffb066, 1.1, 2.8, ['g0'], 0.25), 'g0'); tagA(anchor(2.0, 2.8, -0.4, 0xffa850, 0.6, 1.0, ['g0'], 0.3), 'g0'); }
}
// back-doorway noren: deep navy cloth, a large white family crest (a leaf inside a ring) printed across the two panels
let NOREN_TEX = null;
function norenTex() {
  if (NOREN_TEX) return NOREN_TEX;
  NOREN_TEX = panelTex(256, 384, (x, w, h) => {
    x.fillStyle = '#16203e'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.06)'; x.fillRect(Math.random() * w, Math.random() * h, 1, 4 + Math.random() * 10); }
    x.fillStyle = '#0d1428'; x.fillRect(0, 0, w, 22); x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(0, 22, w, 2);
    const vg = x.createLinearGradient(0, h * 0.75, 0, h); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)'); x.fillStyle = vg; x.fillRect(0, h * 0.75, w, h * 0.25);
    const cx = w / 2, cy = h * 0.4, R = w * 0.33, ink = '#ece6d6', nav = '#16203e';
    x.strokeStyle = ink; x.lineWidth = 9; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
    // leaf: pointed tip up, heart-shaped base, stem down to the ring
    const top = cy - R * 0.72, bot = cy + R * 0.42;
    x.fillStyle = ink; x.beginPath(); x.moveTo(cx, top);
    x.bezierCurveTo(cx + R * 0.32, top + R * 0.25, cx + R * 0.62, cy - R * 0.05, cx + R * 0.5, cy + R * 0.3);
    x.bezierCurveTo(cx + R * 0.4, bot + R * 0.08, cx + R * 0.12, bot + R * 0.05, cx, bot - R * 0.06);
    x.bezierCurveTo(cx - R * 0.12, bot + R * 0.05, cx - R * 0.4, bot + R * 0.08, cx - R * 0.5, cy + R * 0.3);
    x.bezierCurveTo(cx - R * 0.62, cy - R * 0.05, cx - R * 0.32, top + R * 0.25, cx, top); x.fill();
    x.strokeStyle = ink; x.lineWidth = 6; x.beginPath(); x.moveTo(cx, bot - R * 0.1); x.lineTo(cx, cy + R * 0.97); x.stroke();
    x.strokeStyle = nav; x.lineWidth = 3.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, bot - R * 0.12); x.lineTo(cx, top + R * 0.16); x.stroke();
    for (let i = 0; i < 4; i++) { const yy = bot - R * 0.2 - i * R * 0.24, sp = R * (0.36 - i * 0.07); x.lineWidth = 2.5; x.beginPath(); x.moveTo(cx, yy); x.quadraticCurveTo(cx + sp * 0.6, yy - R * 0.06, cx + sp, yy - R * 0.2); x.moveTo(cx, yy); x.quadraticCurveTo(cx - sp * 0.6, yy - R * 0.06, cx - sp, yy - R * 0.2); x.stroke(); }
    // print wear on the crest
    for (let i = 0; i < 160; i++) { const a = Math.random() * 6.283, r = Math.random() * R * 1.05; x.fillStyle = 'rgba(22,32,62,0.35)'; x.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2); }
  });
  return NOREN_TEX;
}
// the back doorway (x -0.5..0.5, z -5.4): dark timber frame, navy crest noren to ~70% of the opening,
// and behind it the warm-lit foot of the stairs to 2F with slippers left at the threshold
function buildDoorway(g, ch, em, lit, f) {
  const FR = 0x22160e;
  for (const sx of [-1, 1]) { ch.box(0.08, 2.27, 0.05, FR, sx * 0.56, 1.135, -5.375); ch.box(0.02, 2.2, 0.04, 0x3a2516, sx * 0.515, 1.1, -5.37); }
  ch.box(1.2, 0.1, 0.06, FR, 0, 2.215, -5.37); ch.box(1.04, 0.02, 0.05, 0x3a2516, 0, 2.16, -5.37);
  ch.box(1.0, 0.025, 0.24, 0x2a1a10, 0, 0.0125, -5.5); // threshold sill
  if (f.noren) {
    ch.cyl(0.016, 0.016, 1.1, 8, 0x3a2516, 0, 2.1, -5.355, 0, 0, Math.PI / 2); for (const sx of [-0.52, 0.52]) ch.box(0.03, 0.05, 0.04, 0x1a120c, sx, 2.115, -5.37);
    const tex = norenTex(), k = lit ? 0.44 : 0.22, NH = 1.42;
    [-1, 1].forEach((sx, i) => { const t = tex.clone(); t.repeat.set(0.5, 1); t.offset.set(i * 0.5, 0); t.needsUpdate = true;
      const m = printedMesh(t, 0.47, NH, false, { k, ds: true }); m.position.set(sx * 0.262, 2.085 - NH / 2, -5.362); m.rotation.set(0.015, sx * 0.03, sx * 0.012); g.add(m); }); // parted a little at the centre
    for (const sx of [-1, 1]) for (const ox of [-0.17, 0.17]) ch.box(0.03, 0.035, 0.008, 0x0e1424, sx * 0.262 + ox, 2.085, -5.356); // sleeve loops
  }
  // foot of the stairs, seen through the doorway: tread/riser/stringer facings and a back-wall skin that take the warm stair light in the bake
  for (let i = 0; i < 11; i++) { const x = -1.6 + 0.2 * (i + 0.5), y = 0.2 * (i + 1); ch.box(0.245, 0.05, 0.87, i % 2 ? 0x8a5c3a : 0x82563a, x, y - 0.022, -7.35); ch.box(0.024, 0.2, 0.85, 0x4a3122, x - 0.1, y - 0.1, -7.35); ch.box(0.25, 0.012, 0.03, 0xa87850, x + 0.005, y + 0.003, -6.925); }
  { const len = Math.hypot(3.6, 3.6), ang = Math.PI / 4; ch.box(len, 0.25, 0.055, 0x3c2819, 0.2, 1.7, -6.92, 0, 0, ang); }
  ch.box(2.4, 3.3, 0.02, 0xc8b89a, -0.4, 1.65, -7.765);
  // warm wall lamp over the stairs
  ch.box(0.05, 0.05, 0.08, 0x1a1a1a, -0.7, 2.2, -7.73); ch.cyl(0.07, 0.09, 0.16, 10, 0xe8dcc0, -0.7, 2.1, -7.66);
  em.cyl(0.062, 0.08, 0.13, 10, lit ? new THREE.Color(2.6, 1.7, 0.85) : 0x2a2420, -0.7, 2.1, -7.655);
  if (lit) { bulbGlow(g, -0.7, 2.1, -7.6, 0.5, 0.35); tagA(anchor(-0.6, 1.95, -7.35, 0xffaa60, 2.2, 2.6, ['g0'], 0.3), 'g0'); tagA(anchor(-0.1, 1.2, -6.2, 0xff9a50, 0.7, 1.8, ['g0'], 0.4), 'g0'); }
  // two pairs of slippers just inside the doorway, toes pointing out to the kitchen
  const slipper = (x, z, ry, col, band) => at(ch, x, 0, z, ry, () => { ch.box(0.095, 0.018, 0.25, 0x2a2420, 0, 0.009, 0); ch.box(0.088, 0.008, 0.24, col, 0, 0.021, 0); ch.box(0.1, 0.035, 0.11, band, 0, 0.03, 0.06); ch.cyl(0.05, 0.05, 0.035, 8, band, 0, 0.03, 0.115, 0, 0, 0); });
  slipper(-0.32, -5.78, 0.08, 0x8a7a62, 0x3a2a22); slipper(-0.2, -5.8, -0.04, 0x8a7a62, 0x3a2a22);
  slipper(0.12, -5.84, 0.12, 0x6a6a78, 0x1c2848); slipper(0.24, -5.8, 0.02, 0x6a6a78, 0x1c2848);
}
// right prep bench (x 0.6..2.5): brushed stainless cabinets, sink with gooseneck tap, wall dish rack, matcha bowls,
// rice cooker, order tablet, utensil rail, taped tickets and an anti-fatigue mat. The staff burner (x 0.95), timers, scales,
// big pot and second burner (j_staff buildKitchens) keep their spots; the sink stays centred on its interaction point.
function buildPrepBench(g, ch, em, lit) {
  const ST = 0xa7adb3, STL = 0xbfc4c9, STD = 0x5c6268, SEAM = 0x2a2d32;
  ch.box(1.9, 0.04, 0.62, 0xc6cace, 1.55, 0.925, -5.1); ch.box(1.9, 0.07, 0.02, STL, 1.55, 0.91, -4.785);
  ch.box(1.9, 0.82, 0.56, 0x7e8489, 1.55, 0.49, -5.12); ch.box(1.88, 0.08, 0.5, 0x1c1e22, 1.55, 0.04, -5.15);
  for (let i = 0; i < 3; i++) { const cx = 0.915 + i * 0.635;
    ch.box(0.615, 0.13, 0.02, STL, cx, 0.815, -4.83); ch.box(0.615, 0.62, 0.02, ST, cx, 0.43, -4.83);
    ch.box(0.6, 0.006, 0.022, SEAM, cx, 0.746, -4.828); ch.box(0.32, 0.016, 0.02, 0xdde0e3, cx, 0.82, -4.812);
    ch.box(0.016, 0.24, 0.02, 0xdde0e3, cx + (i === 1 ? -0.24 : 0.24), 0.6, -4.812);
    for (const sy of [-1, 1]) ch.box(0.5, 0.004, 0.021, 0x9aa0a6, cx, 0.43 + sy * 0.22, -4.829); // brushed panel pressings
  }
  for (const x of [1.2325, 1.8675]) ch.box(0.012, 0.76, 0.024, SEAM, x, 0.49, -4.828);
  // taped notes on the doors
  for (const [x, y, w, h, col] of [[0.78, 0.62, 0.1, 0.13, 0xf0ead8], [1.44, 0.66, 0.09, 0.09, 0xf0d860], [1.62, 0.52, 0.11, 0.14, 0xeae4d2], [2.36, 0.6, 0.1, 0.12, 0xf0ead8]]) {
    ch.box(w, h, 0.003, col, x, y, -4.818, 0, 0, srange(-0.08, 0.08)); ch.box(0.04, 0.012, 0.004, 0xd8cc9a, x, y + h / 2, -4.816); for (let k = 0; k < 3; k++) ch.box(w * 0.7, 0.004, 0.004, 0x5a5a62, x, y + h * 0.25 - k * h * 0.2, -4.816); }
  solid(0.6, 2.5, 0, 0.95, -5.45, -4.79, 'g0furn');
  // sink: inset bowl with a rolled rim; gooseneck tap behind it
  const sx = 1.3, sz = -5.06;
  ch.box(0.38, 0.006, 0.32, 0x30363c, sx, 0.946, sz); ch.box(0.3, 0.004, 0.24, 0x4a5258, sx, 0.947, sz); ch.cyl(0.025, 0.025, 0.004, 8, 0x1a1c20, sx, 0.949, sz);
  for (const [w, d, x, z] of [[0.42, 0.02, sx, sz - 0.17], [0.42, 0.02, sx, sz + 0.17], [0.02, 0.32, sx - 0.2, sz], [0.02, 0.32, sx + 0.2, sz]]) ch.box(w, 0.01, d, 0xd4d8dc, x, 0.95, z);
  ch.cyl(0.03, 0.03, 0.025, 8, C.steel, sx, 0.957, -5.31); ch.cyl(0.013, 0.013, 0.36, 8, 0xc8ccd0, sx, 1.15, -5.31);
  { let prev = [sx, 1.33, -5.31]; for (let i = 1; i <= 6; i++) { const a = Math.PI * i / 6, r = 0.5 - 0.5 * Math.cos(a), p = [sx - r * 0.09, 1.33 + Math.sin(a) * 0.09, -5.31 + r * 0.15]; ch.bar(prev, p, 0.024, 0xc8ccd0, 6); prev = p; } ch.bar(prev, [sx - 0.09, 1.28, -5.16], 0.024, 0xc8ccd0, 6); }
  ch.bar([sx, 1.0, -5.31], [sx + 0.08, 1.05, -5.31], 0.014, 0xd4d8dc);
  // wall-mounted wire dish rack full of upturned cups (clear of the big pot / second burner)
  const RX = 2.0, RW = 0.44;
  ch.box(RW, 0.012, 0.15, 0x9aa0a6, RX, 1.12, -5.3); for (const y of [1.18, 1.3, 1.4]) { ch.box(RW, 0.008, 0.008, 0xc0c4c8, RX, y, -5.225); } for (let i = 0; i <= 6; i++) ch.box(0.006, 0.3, 0.006, 0xc0c4c8, RX - RW / 2 + i * RW / 6, 1.27, -5.225);
  for (const sxx of [-1, 1]) ch.box(0.008, 0.3, 0.15, 0xc0c4c8, RX + sxx * RW / 2, 1.27, -5.3);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) ch.cyl(0.031, 0.037, 0.06, 8, spick([C.ceramic, C.celadon, 0xe0d8c4, 0x6a4a3a]), RX - 0.17 + i * 0.085, 1.16 + r * 0.12, -5.31 + r * 0.05);
  // order tickets taped to the tiles
  for (const [x, y, rz] of [[1.55, 1.42, 0.05], [1.66, 1.38, -0.06], [2.36, 1.4, 0.04], [2.47 - 0.03, 1.33, -0.03]]) { ch.box(0.075, 0.12, 0.003, 0xf4efe2, x, y, -5.374, 0, 0, rz); ch.box(0.035, 0.012, 0.004, 0xd8cc9a, x, y + 0.06, -5.372); for (let k = 0; k < 4; k++) ch.box(0.05 - (k % 2) * 0.015, 0.004, 0.004, 0x3a3a42, x, y + 0.03 - k * 0.02, -5.371); }
  // utensil rail above the burner: ladle, spatula, slotted spoon, tea strainer
  ch.cyl(0.008, 0.008, 0.46, 6, 0xc0c4c8, 0.88, 1.52, -5.34, 0, 0, Math.PI / 2); for (const x of [0.66, 1.1]) ch.box(0.015, 0.03, 0.04, 0x9aa0a6, x, 1.52, -5.36);
  [[0.72, 0], [0.82, 1], [0.92, 2], [1.02, 3]].forEach(([x, k]) => { ch.torus(0.012, 0.003, 6, 0xc0c4c8, x, 1.508, -5.34, 0, Math.PI / 2, 0); ch.bar([x, 1.5, -5.335], [x, 1.32, -5.335], 0.008, k === 1 ? 0x6a4a2a : 0xc0c4c8);
    if (k === 0) ch.ball(0.035, 0xc0c4c8, x, 1.3, -5.33, 0, 1, 0.6, 1); else if (k === 1) ch.box(0.06, 0.07, 0.006, 0x3a3a3a, x, 1.29, -5.335); else if (k === 2) ch.box(0.045, 0.08, 0.01, 0xb0b4b8, x, 1.29, -5.335); else ch.torus(0.035, 0.005, 10, 0x9a8a5a, x, 1.29, -5.335); });
  // row of matcha bowls along the front edge, chasen on its stand
  [[1.6, 0x9fb8a0], [1.73, 0x2a2624], [1.86, 0xd8ccb0], [1.99, 0x7a4a32]].forEach(([x, col]) => { ch.cyl(0.058, 0.04, 0.055, 10, col, x, 0.973, -4.9); ch.cyl(0.05, 0.05, 0.004, 10, 0x6a8a3a, x, 0.996, -4.9); });
  ch.cyl(0.022, 0.03, 0.06, 8, 0xe8e2d4, 2.12, 0.975, -4.9); ch.ball(0.026, 0xe8e2d4, 2.12, 1.01, -4.9); ch.cyl(0.032, 0.018, 0.065, 10, 0xd9c48a, 2.12, 1.045, -4.9); ch.cyl(0.013, 0.013, 0.05, 6, C.bamboo, 2.12, 1.1, -4.9);
  // rice cooker at the right end
  ch.cyl(0.13, 0.12, 0.17, 14, 0xd4d4ce, 2.33, 1.03, -5.17); ch.ball(0.13, 0xc8c8c2, 2.33, 1.115, -5.17, 1, 1, 0.42, 1); ch.cyl(0.13, 0.13, 0.012, 14, 0x8a8e94, 2.33, 1.115, -5.17);
  ch.bar([2.25, 1.18, -5.17], [2.41, 1.18, -5.17], 0.018, 0x3a3d42); ch.box(0.1, 0.06, 0.02, 0x2a2c31, 2.33, 1.0, -5.045);
  em.box(0.05, 0.02, 0.004, lit ? 0xff9a3a : 0x2a1a10, 2.33, 1.005, -5.033); em.box(0.012, 0.012, 0.004, lit ? 0x7fd88f : 0x1a2a1a, 2.29, 1.005, -5.033);
  // order tablet on a stand, facing the cook
  { const th = -0.4; ch.cyl(0.045, 0.05, 0.012, 10, 0x2a2c31, 2.36, 0.951, -4.9); ch.box(0.02, 0.1, 0.015, 0x3a3e46, 2.36, 1.0, -4.92, -0.2);
    ch.box(0.2, 0.14, 0.012, 0x131518, 2.36, 1.1, -4.91, th); em.box(0.18, 0.12, 0.002, lit ? 0x1a9a7a : 0x0a2a24, 2.36, 1.1 + 0.0025, -4.904, th);
    for (let i = 0; i < 3; i++) em.box(0.14, 0.014, 0.002, lit ? (i ? 0x8affd8 : 0xffe08a) : 0x0a2a24, 2.36, 1.135 - i * 0.028, -4.9015 - i * 0.011, th); }
  // black anti-fatigue mat in front (clear of the side door's swing)
  ch.box(1.0, 0.012, 0.44, 0x0e0f11, 1.3, 0.006, -4.52); for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) ch.box(0.045, 0.004, 0.06, 0x1e2024, 0.85 + i * 0.082, 0.0125, -4.68 + j * 0.105);
  if (lit) { tagA(anchor(1.6, 1.3, -4.7, 0xffb468, 0.6, 1.4, ['g0'], 0.35), 'g0'); }
}
// depth-only stand-ins for the ground-floor shell, seen only by the planar reflection camera (layer 1),
// so emissive things behind walls (holo table, alley neon) don't leak into the floor reflection
const REFL_OCC_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
function buildReflOccluders(g, f) {
  const oc = new Chunk('reflOcc', 'g0', { emis: true });
  wallPanel(oc, 'x', -0.2, -2.5, 2.5, 0, 3.4, 0.08, [{ a0: -2.3, a1: 0.5, y0: 0.85, y1: 2.55 }, { a0: 0.8, a1: 1.9, y0: 0, y1: 2.4 }], 0);
  oc.box(0.08, 3.4, 7.8, 0, -2.53, 1.7, -3.9); wallPanel(oc, 'z', 2.53, -7.8, -0.2, 0, 3.4, 0.08, [{ a0: -4.6, a1: -3.8, y0: 0, y1: 2.2 }], 0);
  oc.box(5.1, 3.4, 0.08, 0, 0, 1.7, -7.83); wallPanel(oc, 'x', -5.5, -2.5, 2.5, 0, 3.4, 0.2, [{ a0: -0.5, a1: 0.5, y0: 0, y1: 2.15 }], 0);
  oc.box(5.1, 0.06, 7.8, 0, 0, 3.37, -3.9);
  oc.box(1.9, 0.95, 0.62, 0, -1.55, 0.475, -5.1); oc.box(1.9, 0.95, 0.62, 0, 1.55, 0.475, -5.1);
  if (f.counterBuilt) oc.box(3.4, 1.0, 0.68, 0, -0.8, 0.5, -3.0);
  const m = oc.build(); if (!m) return; m.material = REFL_OCC_MAT; m.layers.set(1); m.renderOrder = -5; m.castShadow = false; g.add(m);
}
// ground-floor ceiling (front room, z -0.2..-5.4): weathered timber boards, beams, joists and two girders, sagging cable runs,
// conduit, CCTV domes, a wall AC unit, paper lanterns, three green enamel pendants over the counter and a pink neon ring lamp.
// Everything goes into the shared ch/em chunks (no extra draw calls apart from the glow sprites). Returns the ring lamp position.
function buildG0Ceiling(g, ch, em, lit) {
  const sv = seedS; reseed(3300);
  const Z0 = -0.2, Z1 = -5.4, YC = 3.35, WOOD = [0x5a3a24, 0x4e321f, 0x66432a, 0x46301e, 0x5e3c22], BEAM = [0x6e4628, 0x623e24, 0x7a4e2c, 0x58381f];
  const tone = (arr, k) => new THREE.Color(spick(arr)).multiplyScalar(srange(0.85, 1.12) * (k || 1)).getHex();
  // warm fill aimed up at the structure: tight anchors just below the beams (they barely reach the room below)
  if (lit) {
    for (const x of [-1.9, -0.7, 0.5, 1.7]) for (const z of [-0.75, -1.85, -2.6, -3.4, -4.4]) {
      const hot = x < 1 && (z === -2.6 || z === -3.4); tagA(anchor(x, 2.88, z, 0xff9448, hot ? 3.2 : 2.3, 1.3, ['g0'], 0.05), 'g0');
    }
  }
  // boards (short pieces so the bake has vertices to shade), main beams over the old ones, joists between, girders, wall plates
  for (let x = -2.5; x < 2.49; x += 0.192) { let z = Z0, first = 1; while (z > Z1 + 0.01) { const z2 = Math.max(Z1, z - (first ? srange(0.12, 0.52) : 0.52)); first = 0; ch.box(0.186, 0.03, z - z2, tone(WOOD), x + 0.096, YC - 0.015, (z + z2) / 2); z = z2; } }
  for (const z of [-0.6, -1.7, -2.8, -3.9, -5.0]) for (let i = 0; i < 5; i++) { ch.box(1.0, 0.22, 0.15, tone(BEAM), -2.0 + i, 3.215, z); ch.box(1.0, 0.012, 0.02, tone(BEAM, 1.35), -2.0 + i, 3.105, z + 0.066); }
  for (const z of [-1.15, -2.25, -3.35, -4.45]) for (let i = 0; i < 5; i++) ch.box(1.0, 0.12, 0.08, tone(BEAM, 0.9), -2.0 + i, 3.27, z);
  for (const x of [-1.3, 1.3]) for (let z = Z0; z > Z1 + 0.01; z -= 0.52) { const z2 = Math.max(Z1, z - 0.52); ch.box(0.2, 0.18, z - z2, tone(BEAM, 0.95), x, 3.015, (z + z2) / 2); }
  for (const x of [-2.43, 2.43]) for (let z = Z0; z > Z1 + 0.01; z -= 0.52) { const z2 = Math.max(Z1, z - 0.52); ch.box(0.14, 0.24, z - z2, tone(BEAM, 0.85), x, 3.2, (z + z2) / 2); }
  for (const x of [-1.3, 1.3]) for (const z of [-0.6, -1.7, -2.8, -3.9, -5.0]) ch.box(0.22, 0.03, 0.2, 0x1c1410, x, 2.93, z); // iron straps
  // cables: red/pink and black runs sagging between beams, along girders and across
  const RED = 0x6a1820, PINKC = 0x8a3052, BLK = 0x121214, BEAMZ = [-0.6, -1.7, -2.8, -3.9, -5.0];
  for (const gx of [-1.3, 1.3]) for (let i = 0; i < BEAMZ.length - 1; i++) {
    ch.cable([gx + 0.075, 2.915, BEAMZ[i]], [gx + 0.075, 2.915, BEAMZ[i + 1]], srange(0.06, 0.12), 0.014, gx < 0 ? RED : PINKC, 6);
    ch.cable([gx - 0.07, 2.915, BEAMZ[i]], [gx - 0.07, 2.915, BEAMZ[i + 1]], srange(0.1, 0.18), 0.012, BLK, 6);
  }
  for (const [z, col, dz] of [[-1.7, PINKC, 0.09], [-3.9, RED, -0.09], [-0.6, BLK, -0.09], [-2.8, BLK, 0.09]]) {
    const xs = [-2.4, -1.3, 1.3, 2.4]; for (let i = 0; i < 3; i++) ch.cable([xs[i], 3.09, z + dz], [xs[i + 1], 3.09, z + dz], i === 1 ? srange(0.16, 0.24) : srange(0.06, 0.1), 0.013, col, i === 1 ? 10 : 6);
  }
  ch.cable([-2.4, 3.1, -2.25], [1.3, 2.93, -4.45], 0.32, 0.012, RED, 12); ch.cable([-1.3, 2.92, -1.15], [2.4, 3.1, -0.35], 0.28, 0.011, PINKC, 12);
  ch.cable([-2.4, 3.1, -3.0], [0.5, 3.1, -3.0], 0.08, 0.012, BLK, 10); // pendant feed
  // conduit along the +x wall with clips, a junction box and a drop to the AC
  P.conduit(ch, [[2.36, 3.02, -0.3], [2.36, 3.02, -5.3], [0.55, 3.02, -5.3]], 0.04, 0x7a7d82);
  for (let z = -0.6; z > -5.3; z -= 0.55) ch.box(0.06, 0.03, 0.03, 0x4a4d52, 2.36, 3.02, z);
  ch.box(0.14, 0.14, 0.08, 0x6a6d72, 2.36, 3.02, -2.1); ch.box(0.1, 0.1, 0.01, 0x8a8d92, 2.36, 3.02, -2.055);
  P.conduit(ch, [[-2.38, 3.04, -0.3], [-2.38, 3.04, -0.45], [-2.38, 2.95, -0.45]], 0.03, 0x7a7d82);
  // CCTV domes on wall brackets (front corner of the menu wall, and further back)
  for (const [z, y] of [[-0.45, 2.88], [-4.5, 3.0]]) at(ch, -2.47, y, z, Math.PI / 2, () => at(em, -2.47, y, z, Math.PI / 2, () => {
    ch.box(0.12, 0.12, 0.02, 0xd8d8d0, 0, 0, 0.01); ch.box(0.04, 0.04, 0.12, 0xc8c8c0, 0, 0, 0.08); ch.cyl(0.08, 0.08, 0.04, 12, 0xe2e2dc, 0, -0.02, 0.17);
    ch.ball(0.07, 0x18191d, 0, -0.045, 0.17, 1, 1, 0.75, 1); ch.ball(0.025, 0x05060a, 0.01, -0.07, 0.2); em.ball(0.008, lit ? 0xff2020 : 0x401010, 0.05, -0.02, 0.25);
  }));
  // wall AC unit high above the back doorway, pipes up into the ceiling
  at(ch, 0, 2.93, -5.29, 0, () => at(em, 0, 2.93, -5.29, 0, () => {
    ch.box(0.88, 0.27, 0.2, 0xd8d6cc, 0, 0, 0); ch.box(0.88, 0.05, 0.05, 0xc8c6bc, 0, -0.115, 0.085, -0.5); ch.box(0.8, 0.028, 0.01, 0x2a2c31, 0, -0.095, 0.103);
    ch.box(0.78, 0.012, 0.06, 0xbab8ae, 0, -0.12, 0.11, 0.55); for (let i = 0; i < 9; i++) ch.box(0.004, 0.014, 0.14, 0xa8a69c, -0.36 + i * 0.09, 0.136, 0);
    ch.box(0.86, 0.004, 0.004, 0xb8b6ac, 0, 0.03, 0.101); em.box(0.012, 0.012, 0.004, lit ? 0x3aff8a : 0x1a3a2a, 0.34, -0.06, 0.102); em.box(0.012, 0.012, 0.004, lit ? 0x4ab0ff : 0x1a2a3a, 0.31, -0.06, 0.102);
    ch.bar([0.46, -0.05, -0.05], [0.55, -0.05, -0.05], 0.035, 0xc8c6bc); ch.cable([0.4, -0.13, 0.0], [0.55, -0.9, 0.0], 0.0, 0.016, 0x8a8a84, 3);
  }));
  // paper lanterns in the upper corners: glowing washi with a black family crest facing the room
  const LGLOW = lit ? new THREE.Color(1.15, 0.88, 0.56) : 0x6a6050, LRIB = lit ? new THREE.Color(0.7, 0.47, 0.27) : 0x4a4038;
  for (const [x, y, z] of [[-2.16, 2.68, -0.72], [2.14, 2.68, -0.66], [2.14, 2.72, -4.86]]) {
    const ry = Math.atan2(-0.4 - x, -2.6 - z);
    at(ch, x, y, z, ry, () => at(em, x, y, z, ry, () => {
      em.cyl(0.19, 0.19, 0.26, 12, LGLOW, 0, 0, 0); em.cyl(0.13, 0.19, 0.07, 12, LGLOW, 0, 0.165, 0); em.cyl(0.19, 0.13, 0.07, 12, LGLOW, 0, -0.165, 0);
      for (const yy of [-0.09, 0, 0.09]) em.torus(0.19, 0.004, 12, LRIB, 0, yy, 0, Math.PI / 2);
      ch.cyl(0.125, 0.125, 0.045, 10, C.black, 0, 0.215, 0); ch.cyl(0.125, 0.125, 0.045, 10, C.black, 0, -0.215, 0); ch.cyl(0.006, 0.006, 3.36 - y - 0.24, 4, C.black, 0, (3.36 - y + 0.24) / 2, 0);
      for (const s of [1, -1]) { // crest on front and back
        em.cyl(0.085, 0.085, 0.004, 12, 0x140c08, 0, 0, s * 0.19, Math.PI / 2); em.cyl(0.07, 0.07, 0.004, 12, LGLOW, 0, 0, s * 0.193, Math.PI / 2);
        for (let k = 0; k < 3; k++) { const a = k * 2.094 + Math.PI / 2; em.box(0.03, 0.05, 0.004, 0x140c08, Math.cos(a) * 0.03, Math.sin(a) * 0.03, s * 0.196, 0, 0, a + Math.PI / 2); }
        em.box(0.012, 0.012, 0.004, 0x140c08, 0, 0, s * 0.197);
      }
    }));
    if (lit) { tagA(anchor(x * 0.9, y, z, 0xffc078, 1.2, 1.4, ['g0'], 0.35), 'g0'); bulbGlow(g, x, y, z, 0.8, 0.18); }
  }
  // three dark-green enamel cone pendants over the counter: white enamel inside, exposed warm bulb
  const BULB = new THREE.Color(3.2, 2.0, 0.95), CORE = new THREE.Color(7, 5.2, 3.0);
  [-1.9, -0.7, 0.5].forEach((x, i) => {
    ch.cyl(0.006, 0.006, 0.8, 4, 0x111111, x, 2.94, -3.0); ch.cyl(0.05, 0.05, 0.025, 8, 0x22382c, x, 3.32, -3.0);
    ch.cyl(0.032, 0.045, 0.07, 8, 0x22382c, x, 2.535, -3.0); ch.cone(0.28, 0.22, 12, 0x24432f, x, 2.39, -3.0); ch.torus(0.28, 0.014, 12, 0x1e3428, x, 2.282, -3.0, Math.PI / 2);
    em.cyl(0.24, 0.24, 0.004, 12, lit ? new THREE.Color(0.55, 0.47, 0.36) : 0x4a4840, x, 2.277, -3.0); em.cyl(0.14, 0.14, 0.004, 12, lit ? new THREE.Color(0.85, 0.68, 0.46) : 0x4a4840, x, 2.274, -3.0);
    ch.cyl(0.026, 0.026, 0.05, 8, 0x1a1a1a, x, 2.255, -3.0); em.ball(0.06, lit ? BULB : 0x2a2420, x, 2.2, -3.0, 1);
    const L = PEND[i]; L.position.set(x, 2.26, -3.0); L.target.position.set(x, 0, -3.0); L.target.updateMatrixWorld(); L.intensity = lit ? 5.5 : 0;
    if (lit) { em.ball(0.04, CORE, x, 2.195, -3.0); bulbGlow(g, x, 2.2, -3.0, 0.46, 0.38); }
  });
  // pink neon ring lamp near the middle of the room, in front of the window
  const RING = [-0.1, 2.5, -1.8], PINK = lit ? new THREE.Color(1.9, 0.28, 1.0) : 0x3a2030, [rx, ry2, rz] = RING;
  ch.cyl(0.006, 0.006, 3.35 - ry2 - 0.12, 4, 0x111111, rx, (3.35 + ry2 + 0.12) / 2, rz); ch.cyl(0.02, 0.03, 0.04, 8, 0x2a1a22, rx, ry2 + 0.13, rz);
  ch.cone(0.13, 0.12, 10, 0x4a1a30, rx, ry2 + 0.06, rz); em.torus(0.165, 0.016, 16, PINK, rx, ry2 - 0.005, rz, Math.PI / 2);
  em.cyl(0.12, 0.12, 0.004, 10, lit ? new THREE.Color(0.8, 0.4, 0.55) : 0x3a2a30, rx, ry2 - 0.003, rz); em.ball(0.034, lit ? new THREE.Color(2.0, 1.3, 0.7) : 0x2a2420, rx, ry2 - 0.035, rz, 1);
  if (lit) { tagA(anchor(rx, ry2 - 0.15, rz, 0xff3a9a, 1.0, 1.6, ['g0'], 0.3), 'g0'); tagA(anchor(rx, 2.95, rz, 0xff4aa0, 1.0, 1.0, ['g0'], 0.05), 'g0'); const sp = bulbGlow(g, rx, ry2 - 0.01, rz, 0.5, 0.22); sp.material.color.set(0xff4aa8); }
  seedS = sv;
  return RING;
}
// left back bench (kettle station, x -2.5..-0.6, top y 0.945): dark distressed wood cabinet with a thick lacquered
// plank worktop (gloss chunk), frame-and-panel doors with long brass bars, a checked towel on the right bar, a folded
// linen towel and a few stray leaves on the top; floor clutter at its left end (mat, 茶葉 sack, packet bin, pet bowl).
// Station lighting: amber key raking from front-left + a real cool-white LED strip under the lowest shelf.
const SACK_TEX = (() => { let t = null; return () => t || (t = canvasTex(128, 192, (x, w, h) => {
  x.fillStyle = '#8a7350'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '40,28,14' : '200,176,130'},${0.08 + Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, Math.random() < 0.5 ? 3 : 1, Math.random() < 0.5 ? 1 : 3); }
  for (let y = 0; y < h; y += 3) { x.fillStyle = 'rgba(30,20,10,0.10)'; x.fillRect(0, y, w, 1); } for (let X = 0; X < w; X += 3) { x.fillStyle = 'rgba(30,20,10,0.07)'; x.fillRect(X, 0, 1, h); }
  x.globalAlpha = 0.82; x.fillStyle = '#2a1d12'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 46px ${FONT_BRUSH}`; x.fillText('茶', w / 2, h * 0.3); x.fillText('葉', w / 2, h * 0.56);
  x.fillStyle = '#3a4a24'; for (const s of [-1, 1]) { x.save(); x.translate(w / 2 + s * 12, h * 0.8); x.rotate(s * 0.6); x.beginPath(); x.ellipse(0, 0, 7, 15, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
  x.globalAlpha = 1;
})); })();
function buildStationBench(g, ch, em, lit, f) {
  const sv = seedS; reseed(6101);
  const bk = new Chunk('g0bench', 'g0', { gloss: true, jit: 0.015 });
  const X0 = -2.5, X1 = -0.6, TOP = 0.945, ZF = -4.77, ZB = -5.41;
  const WOOD = [0x46200f, 0x3c1b0c, 0x4e2612, 0x401e0e], WEAR = [0x7a4a2a, 0x6a3e22, 0x8a5a34];
  // carcass + toe kick (matte, very dark)
  ch.box(X1 - X0, 0.8, 0.54, 0x1a0e08, (X0 + X1) / 2, 0.485, -5.12); ch.box(X1 - X0 - 0.02, 0.085, 0.04, 0x080605, (X0 + X1) / 2, 0.0425, -4.9);
  // worktop: dark under-slab (shows in the seams), four long boards with butt joints, cut in short pieces so the bake stays local
  ch.box(X1 - X0, 0.03, ZF - ZB, 0x0a0503, (X0 + X1) / 2, 0.905, (ZF + ZB) / 2);
  bk.gk = 1; const BD = (ZF - ZB) / 4;
  for (let i = 0; i < 4; i++) {
    const zc = ZB + BD * (i + 0.5), col0 = spick(WOOD), joint = srange(-2.1, -1.0), cuts = [X0, joint, X1];
    for (let s = 0; s < 2; s++) { const a = cuts[s] + (s ? 0.0015 : 0), b = cuts[s + 1] - (s ? 0 : 0.0015), col = s ? spick(WOOD) : col0, n = Math.max(1, Math.round((b - a) / 0.24)), L = (b - a) / n;
      for (let k = 0; k < n; k++) bk.box(L, 0.05, BD - 0.004, col, a + L * (k + 0.5), TOP - 0.025, zc); }
  }
  // front edge band, worn lighter along the top arris and at the corners
  for (let x = X0; x < X1 - 0.01; x += 0.19) bk.box(Math.min(0.19, X1 - x), 0.056, 0.012, 0x24120a, x + Math.min(0.19, X1 - x) / 2, TOP - 0.028, ZF + 0.004);
  for (let x = X0 + 0.02; x < X1 - 0.03;) { const L = srange(0.03, 0.16); if (srand() < 0.55) bk.box(Math.min(L, X1 - 0.02 - x), 0.005, 0.008, spick(WEAR), x + Math.min(L, X1 - 0.02 - x) / 2, TOP - 0.002, ZF + 0.008); x += L + srange(0.02, 0.12); }
  for (const x of [X0 + 0.015, X1 - 0.015]) bk.box(0.03, 0.05, 0.03, spick(WEAR), x, TOP - 0.026, ZF + 0.012);
  for (let i = 0; i < 7; i++) bk.box(srange(0.05, 0.22), 0.0015, 0.004, 0x5a321c, srange(X0 + 0.15, X1 - 0.15), TOP + 0.0006, srange(ZF - 0.12, ZF - 0.02), 0, srange(-0.15, 0.15), 0); // scratches
  // face frame: top rail, bottom rail, stiles (distressed wood)
  const DW = [0x4a2614, 0x42200f, 0x502a16], FZ = -4.83;
  for (let x = X0; x < X1 - 0.01; x += 0.19) ch.box(Math.min(0.19, X1 - x), 0.05, 0.03, spick(DW), x + Math.min(0.19, X1 - x) / 2, 0.86, FZ);
  for (let x = X0; x < X1 - 0.01; x += 0.19) ch.box(Math.min(0.19, X1 - x), 0.035, 0.03, spick(DW), x + Math.min(0.19, X1 - x) / 2, 0.1, FZ);
  const DOORS = [[-2.47, -1.865], [-1.835, -1.23], [-1.2, -0.63]];
  for (const xs of [X0 + 0.015, -1.85, -1.215, X1 - 0.015]) for (let y = 0.12; y < 0.84; y += 0.18) ch.box(0.03, 0.18, 0.03, spick(DW), xs, y + 0.09, FZ);
  // frame-and-panel doors: stiles + rails proud, a recessed fielded panel, long brass bar handle near the top
  DOORS.forEach(([a, b], di) => {
    const cx = (a + b) / 2, w = b - a, y0 = 0.125, y1 = 0.83, h = y1 - y0, cy = (y0 + y1) / 2, dz = -4.805, col = spick(DW);
    for (let y = y0; y < y1 - 0.01; y += 0.177) for (const sx of [a + 0.03, b - 0.03]) ch.box(0.06, Math.min(0.177, y1 - y), 0.024, col, sx, y + Math.min(0.177, y1 - y) / 2, dz);
    for (const ry of [y0 + 0.035, y1 - 0.035, cy + 0.12]) ch.box(w - 0.12, 0.07, 0.024, col, cx, ry, dz);
    for (const [p0, p1] of [[y0 + 0.07, cy + 0.085], [cy + 0.155, y1 - 0.07]]) { const ph = p1 - p0; for (let y = p0; y < p1 - 0.01; y += 0.17) { const hh = Math.min(0.17, p1 - y); ch.box(w - 0.13, hh, 0.012, spick(DW), cx, y + hh / 2, dz - 0.008); } ch.box(w - 0.16, 0.004, 0.013, 0x120804, cx, p0 + 0.004, dz - 0.007); ch.box(w - 0.16, ph - 0.03, 0.004, col, cx, (p0 + p1) / 2, dz - 0.001); }
    // edge wear: pale rubbed patches on the stiles near the handle and the kick
    for (let i = 0; i < 5; i++) { const sx = srand() < 0.5 ? a + 0.008 : b - 0.008; ch.box(0.012, srange(0.03, 0.14), 0.026, spick(WEAR), sx, srange(y0 + 0.03, y1 - 0.05), dz + 0.0005); }
    for (let i = 0; i < 3; i++) ch.box(srange(0.04, 0.12), 0.01, 0.026, spick(WEAR), srange(a + 0.08, b - 0.08), y0 + 0.006, dz + 0.0005);
    for (let i = 0; i < 4; i++) ch.box(0.0015, srange(0.04, 0.12), 0.002, 0x5a3420, srange(a + 0.1, b - 0.1), srange(y0 + 0.1, y1 - 0.1), dz + 0.0125, 0, 0, srange(-0.5, 0.5)); // scratches
    ch.box(0.004, h, 0.024, 0x0c0604, di ? a + 0.002 : a + 0.002, cy, dz - 0.004);
    // brass bar handle
    const hx = cx + (di === 2 ? 0.02 : 0), hy = y1 - 0.075, hw = w * 0.55;
    ch.cyl(0.009, 0.009, hw, 8, 0xb08a42, hx, hy, -4.763, 0, 0, Math.PI / 2); for (const s of [-1, 1]) ch.cyl(0.007, 0.007, 0.04, 6, 0x8a6a30, hx + s * (hw / 2 - 0.02), hy, -4.78, Math.PI / 2);
    for (const s of [-1, 1]) ch.ball(0.011, 0xc8a050, hx + s * hw / 2, hy, -4.763);
    if (di === 2) { // checked tea towel draped over the bar: thin flap over the top, the front hanging in loose folds
      const TW = 0.2, CL = 0.025, rows = 16, cols = 8, tx = hx + 0.05;
      ch.box(TW, 0.022, 0.026, 0xd2ccbe, tx, hy + 0.006, -4.763);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const sc = c % 4 === 1, sr = r % 4 === 1, sc2 = c % 4 === 2, colr = sc && sr ? 0x3e4a5c : (sc || sr) ? 0x6c7888 : (sc2 && r % 4 === 2) ? 0x9aa2ac : 0xd6d0c2;
        const fold = Math.sin(c * 1.9 + 0.4) * 0.004 + r * 0.0006;
        ch.box(CL, CL, 0.003, colr, tx - TW / 2 + CL * (c + 0.5), hy - 0.004 - CL * (r + 0.5), -4.749 + fold, -0.025, 0, 0);
      }
      for (let c = 0; c < cols; c += 2) ch.box(0.004, 0.012, 0.003, 0xc8c2b4, tx - TW / 2 + CL * (c + 0.5), hy - 0.01 - CL * rows, -4.747 + rows * 0.0006); // fringe
    }
  });
  // folded linen towel at the front-right of the worktop + a few stray tea leaves
  at(ch, -0.82, TOP, -4.9, 0.22, () => { ch.box(0.2, 0.012, 0.15, 0xcfc8b8, 0, 0.006, 0); ch.box(0.195, 0.011, 0.145, 0xd8d2c4, 0.003, 0.0175, 0.002); ch.box(0.19, 0.01, 0.14, 0xc6bfae, 0.001, 0.028, 0.004); ch.box(0.19, 0.003, 0.012, 0x8a8478, 0.001, 0.034, 0.05); ch.cyl(0.011, 0.011, 0.19, 6, 0xd2ccbe, 0.001, 0.017, 0.074, 0, 0, Math.PI / 2); });
  const leaf = (x, y, z) => ch.box(srange(0.008, 0.016), 0.0018, srange(0.003, 0.005), spick([0x3a4a1a, 0x2a3814, 0x4a5a22, 0x55602a]), x, y + 0.001, z, 0, srand() * 3.14, 0);
  for (let i = 0; i < 9; i++) leaf(srange(-2.25, -2.0), TOP, srange(-4.92, -4.8));
  for (let i = 0; i < 8; i++) leaf(srange(-1.15, -0.95), TOP, srange(-4.9, -4.79));
  for (let i = 0; i < 6; i++) leaf(srange(-2.45, -0.7), TOP, srange(-5.0, -4.79));
  bk.gk = 0;
  // the old blue cloth is replaced by the linen towel; keep the bench collision + top height
  solid(X0, X1, 0, 0.95, -5.45, -4.79, 'g0furn');
  if (f.counterBuilt) {
    // black anti-fatigue mat with rows of drainage holes
    const MX0 = -1.62, MX1 = -0.66, MZ0 = -4.76, MZ1 = -4.42, mcx = (MX0 + MX1) / 2, mcz = (MZ0 + MZ1) / 2;
    ch.box(MX1 - MX0, 0.012, MZ1 - MZ0, 0x161618, mcx, 0.006, mcz); ch.box(MX1 - MX0 - 0.04, 0.003, MZ1 - MZ0 - 0.04, 0x222225, mcx, 0.0135, mcz);
    for (let r = 0, z = MZ0 + 0.04; z < MZ1 - 0.03; z += 0.036, r++) for (let x = MX0 + 0.045 + (r % 2) * 0.022; x < MX1 - 0.04; x += 0.044) ch.box(0.026, 0.002, 0.011, 0x020202, x, 0.0152, z);
    for (let i = 0; i < 4; i++) leaf(srange(MX0 + 0.1, MX1 - 0.1), 0.014, srange(MZ0 + 0.05, MZ1 - 0.05));
    // burlap sack printed 茶葉, slumped against the cabinet, tied neck
    at(ch, -1.98, 0, -4.63, -0.12, () => {
      ch.box(0.26, 0.3, 0.19, 0x7e6846, 0, 0.15, 0, 0, 0, 0.02); ch.box(0.24, 0.07, 0.17, 0x86704c, 0.006, 0.33, 0, 0.1, 0, -0.05);
      ch.box(0.14, 0.05, 0.1, 0x7a6442, 0.01, 0.39, 0, 0, 0.3, 0); ch.cyl(0.04, 0.05, 0.03, 6, 0x5a4428, 0.01, 0.42, 0); ch.cone(0.07, 0.07, 6, 0x86704c, 0.012, 0.47, 0, 0, 0, 0.2);
      for (let i = 0; i < 4; i++) ch.box(0.27, 0.004, 0.2, 0x6e5a3a, 0, 0.04 + i * 0.07, 0, 0, 0, 0.02);
    });
    { const sm = printedMesh(SACK_TEX(), 0.2, 0.28, true); sm.position.set(-1.98 - 0.096 * Math.sin(-0.12) + 0.003, 0.17, -4.63 + 0.096 * Math.cos(-0.12) + 0.002); sm.rotation.set(0, -0.12, 0.02); g.add(sm); }
    solidC(-1.98, -4.63, 0.28, 0.22, 0, 0.5, 'g0furn');
    // bin of tea packets (open black bin, foil/kraft/green sachets poking out)
    { const bx = -1.73, bz = -4.66; ch.cyl(0.115, 0.1, 0.3, 12, 0x141416, bx, 0.15, bz); ch.torus(0.112, 0.008, 14, 0x232327, bx, 0.3, bz, Math.PI / 2); ch.cyl(0.1, 0.1, 0.01, 10, 0x0a0a0b, bx, 0.26, bz);
      for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = srange(0.02, 0.07); ch.box(srange(0.05, 0.07), srange(0.08, 0.11), 0.012, spick([0x9aa0a8, 0xb8bcc2, 0x3a6a3a, 0x2a5030, 0xd8d2c4, 0x8a6a40, 0x6a2a2a]), bx + Math.cos(a) * rr, 0.3 + srange(-0.01, 0.03), bz + Math.sin(a) * rr, srange(-0.4, 0.4), a, srange(-0.35, 0.35)); }
      solidC(bx, bz, 0.24, 0.24, 0, 0.36, 'g0furn'); }
    // pet water bowl with a paw print, tucked into the far-left corner
    { const px = -2.33, pz = -4.33; ch.cyl(0.075, 0.064, 0.05, 14, 0xd6d0c4, px, 0.025, pz); ch.cyl(0.062, 0.062, 0.004, 14, 0x9a958c, px, 0.049, pz); ch.cyl(0.06, 0.06, 0.004, 14, 0x34495a, px, 0.042, pz);
      ch.cyl(0.011, 0.011, 0.002, 8, 0x4a4650, px, 0.022, pz + 0.071, Math.PI / 2 - 0.2); for (const [dx, dy] of [[-0.014, 0.012], [-0.005, 0.017], [0.005, 0.017], [0.014, 0.012]]) ch.cyl(0.0042, 0.0042, 0.002, 6, 0x4a4650, px + dx, 0.022 + dy, pz + 0.07 - dy * 0.2, Math.PI / 2 - 0.2);
      solidC(px, pz, 0.16, 0.16, 0, 0.06, 'g0furn'); }
    blob(g, -1.85, 0, -4.64, 0.7, 0.32);
  }
  // ---- station lighting (left bench only; the right bench keeps the generic set in buildG0)
  if (lit) {
    // warm amber key raking across the worktop from the front-left (low and to the side, so the top gets a falloff not a wash)
    tagA(anchor(-2.45, 1.32, -4.38, 0xff8a38, 2.4, 1.9, ['g0'], 0.05), 'g0'); tagA(anchor(-1.25, 1.35, -4.45, 0xff9a48, 0.45, 1.15, ['g0'], 0.15), 'g0');
    // cool-white LED strip under the lowest shelf: a dense row of small anchors raking down the tiles onto the worktop
    for (let x = -2.4; x <= -0.69; x += 0.17) tagA(anchor(x, 1.575, -5.2, 0xcfe2ff, 0.26, 1.15, ['g0'], 0.12), 'g0');
    // the strip itself: a brighter cool tube laid over the shelf's warm one
    em.box(1.78, 0.016, 0.022, new THREE.Color(1.5, 1.72, 2.0), -1.55, 1.611, -5.14);
  }
  addBuilt(g, bk);
  seedS = sv;
}
function buildG0() {
  reseed(1001); clearAnchors('g0');
  const g = part('g0'); const ch = new Chunk('g0furn', 'g0'), em = new Chunk('g0Em', 'g0', { emis: true }), gl = new Chunk('g0gloss', 'g0', { gloss: true });
  const f = S.flags, lit = !!f.power;
  if (S.ch >= 1 || ['counter', 'wire', 'plumb', 'noren', 'kettleBox', 'brewCrew', 'serveCrew', 'breaker', 'outside'].includes(S.beat)) f.alleyOpen = 1;
  clearTag('g0furn');
  // ---- lighting anchors
  if (lit) {
    // pendants: the per-pixel pools come from the PEND spots; the bake adds a tight warm halo around each shade + counter
    for (const x of [-1.9, -0.7, 0.5]) { tagA(anchor(x, 2.1, -3.0, 0xff9a48, 1.5, 2.3, ['g0'], 0.1), 'g0'); tagA(anchor(x, 1.25, -3.0, 0xffa050, 0.9, 1.1, ['g0'], 0.3), 'g0'); }
    // back benches + shelves: warm under-shelf glow on the worktop and backsplash
    // (the left bench's worktop/cabinet light is set in buildStationBench: amber key + cool LED strip, deep blacks below)
    for (const x of [-1.55, 1.55]) { tagA(anchor(x, 1.95, -4.85, 0xffa858, 1.9, 2.3, ['g0'], 0.15), 'g0'); if (x > 0) { tagA(anchor(x, 1.25, -4.95, 0xffb060, 1.0, 1.3, ['g0'], 0.3), 'g0'); tagA(anchor(x, 0.7, -4.3, 0xff9a50, 0.35, 1.3, ['g0'], 0.4), 'g0'); } }
    tagA(anchor(-1.0, 2.45, -1.2, 0xffa058, 1.5, 3.3, ['g0'], 0.25), 'g0'); tagA(anchor(-0.9, 1.6, -0.9, 0xff9a50, 0.6, 1.6, ['g0'], 0.4), 'g0'); tagA(anchor(0.4, 2.4, -6.6, 0xffb070, 0.9, 2.6, ['g0'], 0.2), 'g0');
    tagA(anchor(1.55, 1.2, -6.3, 0x33e4ff, 0.7, 2.0, ['g0'], 0.3), 'g0');
  } else {
    if (f.crew) tagA(anchor(-0.6, 1.4, -2.4, 0xdfeeff, 2.2, 5.5, ['g0'], 0.2), 'g0');
    tagA(anchor(-0.5, 0.6, -6.6, 0x6070a0, 0.4, 3, ['g0'], 0.5), 'g0');
  }
  tagA(anchor(-0.9, 1.7, 0.9, 0x9a88d8, f.shutterUp ? 0.75 : 0.12, 3.6, ['g0'], 0.3), 'g0'); // street light through the window
  // ---- counter
  if (f.counterBuilt) {
    // body: vertical slats on the customer side, tiles on the inner face
    // varnished walnut top (gloss chunk): four boards with staggered butt joints, a dark edge band and a raised front lip
    gl.gk = 1; ch.box(3.4, 0.03, 0.68, 0x1c100a, -0.8, 0.975, -3.0);
    for (let i = 0; i < 4; i++) { const zc = -3.31 + 0.0775 + i * 0.155; let x = -2.475; const joint = -1.6 + i * 0.55 + srange(-0.2, 0.2);
      for (const x1 of [joint, 0.875]) { gl.box(x1 - x - 0.004, 0.05, 0.151, spick([0x4a2a18, 0x42251a, 0x54301c, 0x3e2214]), (x + x1) / 2, 1.01, zc); x = x1; } }
    gl.box(3.4, 0.08, 0.035, 0x2a160c, -0.8, 0.995, -2.6775); gl.box(3.4, 0.004, 0.012, 0x6a3c22, -0.8, 1.037, -2.684); // front lip + worn top edge
    gl.box(3.4, 0.07, 0.03, 0x2a160c, -0.8, 1.0, -3.325); for (const x of [-2.4875, 0.8875]) gl.box(0.025, 0.07, 0.68, 0x2a160c, x, 1.0, -3.0);
    ch.box(3.42, 0.03, 0.7, C.cedarD, -0.8, 0.965, -3.0); gl.gk = 0;
    for (let x = -2.48; x < 0.9; x += 0.09) ch.box(0.08, 0.9, 0.04, srand() < 0.5 ? C.cedar : 0x6e4a30, x + 0.04, 0.48, -2.7);
    ch.box(0.04, 0.95, 0.6, C.cedarD, 0.88, 0.48, -3.0);
    ch.cyl(0.02, 0.02, 3.3, 8, C.brass, -0.8, 0.22, -2.6, 0, 0, Math.PI / 2); for (const x of [-2.3, -1.2, -0.1, 0.8]) ch.box(0.03, 0.04, 0.12, C.brass, x, 0.22, -2.65);
    // staff-side face (open cubby with cups/bowls/cloths) + all the counter-top clutter: j_tea.js
    buildCounterDressing(g, ch, em, gl, lit);
    // counter top dressing (customer side)
    P.register(ch, 0.2, 1.035, -3.08, Math.PI);
    // tablet POS on a stand beside the register, screen tilted toward the staff side
    { const th = -0.35, sn = Math.sin(th), cs = Math.cos(th), cy = 0.23, sp = (dx, dv, dn) => [dx, cy + dv * cs + dn * -sn, dv * sn + dn * cs];
      both0(ch, em, -0.2, 1.035, -3.14, Math.PI, () => {
        ch.cyl(0.06, 0.065, 0.014, 10, 0x2a2c31, 0, 0.007, 0); ch.box(0.024, 0.16, 0.018, 0x3a3e46, 0, 0.09, -0.03, -0.12); ch.box(0.05, 0.03, 0.03, 0x2a2c31, 0, 0.18, -0.02, th);
        ch.box(0.23, 0.17, 0.014, 0x131518, 0, cy, 0, th);
        let p = sp(0, 0, 0.0075); em.box(0.204, 0.144, 0.002, lit ? 0x1aa8c0 : 0x0a2a30, p[0], p[1], p[2], th);
        p = sp(0, 0.015, 0.009); em.torus(0.032, 0.005, 12, lit ? 0xbff8ff : 0x1a4a50, p[0], p[1], p[2], th);
        p = sp(0, 0.015, 0.009); em.box(0.028, 0.004, 0.002, lit ? 0xbff8ff : 0x1a4a50, p[0], p[1], p[2], th, 0, 0.6);
        for (let i = 0; i < 3; i++) { p = sp(-0.05 + i * 0.05, -0.05, 0.009); em.box(0.04, 0.018, 0.002, lit ? (i === 2 ? 0x4affc8 : 0x0f6a7a) : 0x0a2a30, p[0], p[1], p[2], th); }
        p = sp(0, 0.062, 0.009); em.box(0.18, 0.008, 0.002, lit ? 0x0f6a7a : 0x0a2a30, p[0], p[1], p[2], th);
      }); }
    if (lit) tagA(anchor(-0.2, 1.3, -3.3, 0x33e4ff, 0.45, 0.9, ['g0'], 0.3), 'g0'); P.tipJar(ch, 0.1, 1.035, -2.8);
    // ticket rail (brass bar) above the counter
    ch.cyl(0.012, 0.012, 3.0, 6, 0x6a5228, -0.8, 2.05, -2.74, 0, 0, Math.PI / 2); for (const x of [-2.2, 0.6]) ch.cyl(0.006, 0.006, 1.06, 4, C.iron, x, 2.58, -2.74); // dull aged brass, hung in front of the pendant line so it doesn't sit inside their bake halo
    // flap/gate at the end of the counter
    ch.box(0.06, 0.9, 0.06, C.cedarD, 0.9, 0.45, -2.72);
    solid(-2.5, 0.92, 0, 1.05, -3.34, -2.66, 'g0furn');
  } else if (f.crew) {
    // the counter carcass: inner face, end panels and three cross frames are up; the top is still boards
    ch.box(3.4, 0.9, 0.04, 0x3a2a20, -0.8, 0.48, -3.3); ch.box(0.04, 0.95, 0.6, C.cedarD, 0.88, 0.48, -3.0); ch.box(0.04, 0.95, 0.6, C.cedarD, -2.48, 0.48, -3.0);
    for (const x of [-1.9, -0.8, 0.3]) { ch.box(0.06, 0.9, 0.06, C.cedarD, x, 0.48, -2.72); ch.box(0.06, 0.06, 0.58, C.cedarD, x, 0.93, -3.0); }
    ch.box(3.36, 0.06, 0.06, C.cedarD, -0.8, 0.93, -2.72);
    if (f.counterLaid) { // boards laid across the frame, not yet bolted: slight gaps and skew
      for (let i = 0; i < 3; i++) ch.box(3.38, 0.07, 0.22, i % 2 ? C.cedar : C.cedarL, -0.8 + srange(-0.02, 0.02), 1.0, -2.78 - i * 0.225, 0, srange(-0.008, 0.008), 0);
    } else { // board stack on two sawhorses by the window
      for (let i = 0; i < 6; i++) ch.box(2.4, 0.05, 0.22, C.cedarL, -0.6, 0.62 + i * 0.052, -1.25 + srange(-0.02, 0.02), 0, srange(-0.03, 0.03), 0);
      for (const x of [-1.5, 0.3]) { for (const z of [-1.1, -1.4]) ch.box(0.06, 0.58, 0.06, C.cedarD, x, 0.29, z, 0.12 * (z < -1.25 ? 1 : -1)); ch.box(0.08, 0.06, 0.42, C.cedarD, x, 0.58, -1.25); }
      solid(-1.8, 0.6, 0, 1.0, -1.45, -1.05, 'g0furn');
    }
    solid(-2.5, 0.92, 0, 1.05, -3.34, -2.66, 'g0furn');
  } else {
    ch.box(3.4, 0.9, 0.04, 0x3a2a20, -0.8, 0.48, -3.3); solid(-2.5, 0.92, 0, 1.0, -3.34, -3.26, 'g0furn');
  }
  // ---- customer stools (built with the counter)
  if (f.counterBuilt) for (const x of [-2.0, -1.3, -0.6, 0.1]) { P.stoolChrome(gl, x, 0, -2.3, 0.72); solidC(x, -2.3, 0.32, 0.32, 0, 0.7, 'g0furn'); }
  // ---- window counter + stools
  gl.gk = 1; for (let i = 0; i < 3; i++) gl.box(2.7, 0.06, 0.124, spick([0x4a2a18, 0x42251a, 0x54301c]), -0.9, 1.0, -0.42 - 0.127 + i * 0.127); gl.box(2.7, 0.07, 0.02, 0x2a160c, -0.9, 0.995, -0.62); gl.gk = 0; for (const x of [-2.15, 0.35]) ch.box(0.06, 1.0, 0.3, C.cedarD, x, 0.5, -0.42);
  ch.box(2.7, 0.04, 0.04, C.cedarD, -0.9, 0.96, -0.25);
  solid(-2.3, 0.45, 0, 1.03, -0.62, -0.2, 'g0furn');
  if (f.counterBuilt) { const ws = lv('stools') ? [-1.95, -1.3, -0.65, 0.0] : [-1.6, -0.4]; for (const x of ws) { P.stoolChrome(gl, x, 0, -0.95, 0.72); solidC(x, -0.95, 0.3, 0.3, 0, 0.7, 'g0furn'); } }
  else if (!f.crew) { P.stool(ch, -1.6, 0, -1.2, 0.72); ch.box(0.36, 0.06, 0.36, C.cedarL, 0.4, 0.03, -1.6, 0.1, 0.4, 1.4); }
  else P.stool(ch, 1.0, 0, -2.55, 0.72);
  // ---- back benches (work area)
  buildStationBench(g, ch, em, lit, f); // right bench: buildPrepBench (end of buildG0)
  // tiles above the benches (backsplash)
  buildBrewTiles(ch, gl); // left bench: glossy tiles, wide grout, cracked tile
  for (const [x0, x1] of [[0.6, 2.5]]) for (let x = x0; x < x1 - 0.01; x += 0.15) for (let y = 0.95; y < 1.55; y += 0.15) ch.box(0.14, 0.14, 0.015, srand() < 0.5 ? C.tileT : C.tileT2, x + 0.075, y + 0.075, -5.385);
  // shelves above benches: four crammed tiers per side, LED strips, radio, lucky cat, photo, vines, herbs
  buildBackShelves(ch, em, lit);
  // left bench worktop props (induction plate, board, cloth, tools) are built with the kettle station: buildKettleStation()
  // the lowest left shelf's warm under-lip anchors give way to the station's cool-white LED strip (buildStationBench)
  for (let i = ANCHORS.length - 1; i >= 0; i--) { const a = ANCHORS[i]; if (a.tag === 'g0' && a.p[0] < -0.6 && Math.abs(a.p[1] - 1.58) < 0.005 && Math.abs(a.p[2] + 5.08) < 0.005) ANCHORS.splice(i, 1); }
  buildBrewWall(g, ch, em, lit); // brewing wall: canisters, jars, brew chart, notes, order tablet, scroll, 茶 neon
  // ---- left wall: menu board, posters, clock, coat hooks
  buildMenuWall(g, ch, em, lit, f);
  const pz = printedMesh(posterTex(2), 0.36, 0.5, true); pz.position.set(0.0, 1.8, -7.76); g.add(pz);
  ch.cyl(0.16, 0.16, 0.04, 16, C.cedarD, -2.47, 2.75, -3.6, 0, 0, Math.PI / 2); ch.cyl(0.14, 0.14, 0.01, 16, C.washi, -2.445, 2.75, -3.6, 0, 0, Math.PI / 2);
  REF.clock = new THREE.Vector3(-2.43, 2.75, -3.6);
  P.umbrellaStand(ch, 2.25, 0, -0.64); solidC(2.25, -0.64, 0.3, 0.3, 0, 1, 'g0furn');
  buildXWall(ch, em, g, lit);
  // ---- ceiling: exposed timber structure, cables, conduit, CCTV, AC, lanterns, pendants
  const RING = buildG0Ceiling(g, ch, em, lit);
  // ---- back room: holo table, stock, breaker panel, stair sign
  ch.box(1.2, 0.06, 0.6, 0x2a2c31, 1.2, 0.86, -6.35); ch.box(1.1, 0.8, 0.5, 0x1a1c22, 1.2, 0.43, -6.35); em.quad(1.0, 0.45, lit ? 0x0a4a5a : 0x0a0e14, 1.2, 0.892, -6.35, -Math.PI / 2);
  for (let i = 0; i < 6; i++) ch.box(0.02, 0.012, 0.5, lit ? 0x2a8aa0 : 0x1a1c22, 0.75 + i * 0.18, 0.893, -6.35);
  solid(0.6, 1.8, 0, 0.9, -6.62, -6.08, 'g0furn');
  for (let i = 0; i < 4; i++) P.cardboard(ch, -2.2 + (i % 2) * 0.5, (i > 1 ? 0.35 : 0), -5.95, srange(-0.1, 0.1), 0.48, 0.35, 0.42);
  solid(-2.5, -1.75, 0, 0.75, -6.2, -5.65, 'g0furn');
  for (let i = 0; i < 3; i++) at(ch, 0.75 + i * 0.52, 0, -7.38 + srange(-0.06, 0.06), srange(-0.25, 0.25), () => { const tone = new THREE.Color(0xb09a78).multiplyScalar(srange(0.85, 1.05)).getHex(); ch.box(0.48, 0.34, 0.36, tone, 0, 0.17, 0); ch.box(0.42, 0.08, 0.3, tone, 0, 0.37, 0, 0, 0, srange(-0.06, 0.06)); ch.cyl(0.05, 0.08, 0.1, 6, tone, 0, 0.45, 0); ch.box(0.1, 0.015, 0.015, 0x6a5038, 0, 0.47, 0); ch.box(0.24, 0.14, 0.004, 0x2a5a3a, 0.02, 0.2, 0.181); ch.box(0.14, 0.03, 0.005, 0xd8c8a0, 0.02, 0.22, 0.184); }); // sacks of tea under the stairs
  ch.box(0.5, 0.6, 0.12, 0x6a6e74, 2.0, 1.6, -5.68); ch.box(0.44, 0.5, 0.02, f.power ? 0x2a5a3a : 0x3a3e46, 2.0, 1.6, -5.75); for (let i = 0; i < 6; i++) ch.box(0.04, 0.08, 0.03, f.power ? 0x3aff8a : (f.wired ? 0xffb35c : 0x5a2a2a), 1.85 + (i % 3) * 0.15, 1.5 + Math.floor(i / 3) * 0.18, -5.77);
  ch.box(0.08, 0.12, 0.05, f.power ? 0x2a2c31 : 0xc23b2b, 2.18, 1.82, -5.77);
  REF.fuse = new THREE.Vector3(2.0, 1.6, -5.7);
  neon('足元注意', -1.9, 1.75, -6.88, 0, 0.12, 'yellow', { px: 48, k: lit ? 1.8 : 0.5, lit: 0, group: g });
  ch.box(0.32, 0.13, 0.05, 0xd8d8d0, 0.0, 2.36, -5.36); em.box(0.26, 0.08, 0.01, 0x168a46, 0.0, 2.36, -5.33); em.box(0.04, 0.05, 0.012, 0xe8ffe8, -0.07, 2.36, -5.326); // emergency exit sign
  // ---- Tomo's delivery crate (prologue): breaker panel, rope, the lucky noren
  if (f.crateDown && !f.power) { at(ch, 2.15, 0, -1.3, 0.25, () => { ch.box(0.62, 0.36, 0.42, 0xa8885a, 0, 0.18, 0); for (const y of [0.06, 0.3]) ch.box(0.63, 0.05, 0.43, 0x7a5a3a, 0, y, 0); if (!f.wired) ch.box(0.4, 0.5, 0.1, 0x6a6e74, -0.08, 0.5, 0.05, 0.12); if (!f.noren) ch.box(0.3, 0.06, 0.22, C.indigo, 0.14, 0.39, -0.02); ch.torus(0.09, 0.025, 8, 0xb8a070, 0.16, 0.42, 0.08, Math.PI / 2); }); solidC(2.15, -1.3, 0.62, 0.5, 0, 0.6, 'g0furn'); }
  // ---- derelict dressing (prologue before clean-up)
  if (!f.cleaned) {
    for (let i = 0; i < 5; i++) ch.box(srange(0.6, 1.4), 0.004, srange(0.4, 1.0), 0x5a5048, srange(-2, 2), 0.003, srange(-4.5, -1), 0, srand() * 3, 0);
    ch.box(0.9, 0.7, 0.72, 0xd8cdb4, 2.02, 0.35, -2.12); ch.box(0.98, 0.04, 0.8, 0xd8cdb4, 2.02, 0.71, -2.12, 0.05, 0, 0.06); for (const x of [1.58, 2.46]) ch.box(0.02, 0.5, 0.78, 0xc8bda4, x, 0.45, -2.12, 0, 0, x < 2 ? -0.08 : 0.08); // dust sheet over a box, pushed against the wall
    P.bucket(ch, -0.4, 0, -4.0, 0x8a8e94); REF.leakBucket = new THREE.Vector3(-0.4, 0.26, -4.0);
    solidC(2.02, -2.12, 0.9, 0.72, 0, 0.8, 'g0furn');
  }
  // ---- alley-side door: steel, hinged at z -4.6, swings inward against the right bench
  { const dc = new Chunk('sideDoor', 'g0'); const hx = 2.62, hz = -4.58;
    dc.box(0.05, 2.14, 0.76, 0x46505a, hx, 1.08, hz + 0.39); dc.box(0.055, 2.0, 0.66, 0x3a434c, hx, 1.08, hz + 0.39);
    dc.box(0.06, 0.32, 0.24, 0x8fb0c0, hx, 1.62, hz + 0.39); dc.box(0.062, 0.34, 0.02, 0x2a2c31, hx, 1.62, hz + 0.26); dc.box(0.062, 0.34, 0.02, 0x2a2c31, hx, 1.62, hz + 0.52);
    for (let i = 0; i < 4; i++) dc.box(0.063, 0.006, 0.24, 0x5a6066, hx, 1.5 + i * 0.08, hz + 0.39);
    dc.box(0.06, 0.18, 0.7, 0x6a7078, hx, 0.12, hz + 0.39); dc.box(0.09, 0.03, 0.14, C.steel, hx, 1.02, hz + 0.68); dc.box(0.1, 0.06, 0.04, C.steel, hx, 1.02, hz + 0.72);
    dc.box(0.064, 0.09, 0.2, 0xefe4cc, hx - 0.002, 1.3, hz + 0.39); // 勝手口 plate
    const dm = dc.build(); const piv = new THREE.Group(); piv.position.set(hx, 0, hz); if (dm) { dm.position.set(-hx, 0, -hz); piv.add(dm); } g.add(piv);
    REF.sideDoor = piv; piv.rotation.y = S.flags.alleyOpen ? SIDE_DOOR_OPEN : 0; REF.sideDoorA = piv.rotation.y;
    // frame
    ch.box(0.2, 0.06, 0.9, 0x2a2c31, 2.6, 2.21, -4.2); ch.box(0.2, 2.2, 0.05, 0x2a2c31, 2.6, 1.1, -4.62); ch.box(0.2, 2.2, 0.05, 0x2a2c31, 2.6, 1.1, -3.78);
    clearTag('sideDoor'); if (!S.flags.alleyOpen) solid(2.5, 2.75, 0, 2.2, -4.6, -3.8, 'sideDoor'); else solid(1.85, 2.5, 0, 2.2, -4.78, -4.56, 'sideDoorOpen');
  }
  // rain barrel under the downspout (outside, against the alley wall); the lower spout section is the prologue job
  const ab = new Chunk('alleyBarrel', 'alley'); P.barrel(ab, 3.08, 0.06, -6.2); if (lv('barrel2')) { ab.cyl(0.3, 0.32, 0.5, 14, 0x3a8ab0, 3.08, 1.27, -6.2); ab.torus(0.31, 0.016, 14, 0x24486c, 3.08, 1.4, -6.2, Math.PI / 2); ab.cyl(0.29, 0.29, 0.03, 14, 0x24486c, 3.08, 1.53, -6.2); }
  if (f.plumbed) { ab.bar([2.86, 2.42, -6.2], [2.86, 1.42, -6.2], 0.12, 0x5a5e66, 8); ab.bar([2.86, 1.42, -6.2], [3.02, 1.14, -6.2], 0.12, 0x5a5e66, 8); ab.cyl(0.085, 0.085, 0.06, 8, 0x3a3d42, 2.86, 1.45, -6.2); }
  else { ab.cyl(0.07, 0.07, 0.02, 8, 0x111111, 2.86, 2.37, -6.2); }
  solidC(3.06, -6.2, 0.6, 0.6, 0, 1, 'g0furn');
  REF.spoutOpen = !f.plumbed;
  if (!f.plumbed) { const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.3, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x9ab8d8, transparent: true, opacity: 0.32, depthWrite: false })); sm.position.set(2.86, 1.22, -6.2); sm.userData.keepGeo = false; g.add(sm); REF.spoutStream = sm;
    const pd = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: 0x0c1018, transparent: true, opacity: 0.55, depthWrite: false })); pd.rotation.x = -Math.PI / 2; pd.position.set(2.98, 0.065, -6.15); g.add(pd); } else REF.spoutStream = null;
  addBuilt(g, ab);
  // ---- contact shadows
  if (f.counterBuilt) for (const x of [-2.0, -1.3, -0.6, 0.1]) blob(g, x, 0, -2.3, 0.55, 0.55);
  blob(g, -0.8, 0, -3.0, 3.6, 1.1); blob(g, -1.55, 0, -5.1, 2.1, 0.8); blob(g, 1.55, 0, -5.1, 2.1, 0.8); blob(g, 1.55, 0, -6.3, 1.4, 0.9);
  // gloss highlights: the three counter pendants + the pink ring lamp (material only; the baked light anchors are above)
  { const lp = [[-1.9, 2.24, -3.0], [-0.7, 2.24, -3.0], [0.5, 2.24, -3.0], [RING[0], RING[1] - 0.05, RING[2]]]; lp.forEach((p, i) => { GLOSS_U.uLP.value[i].set(p[0], p[1], p[2]); if (i < 3) GLOSS_U.uLC.value[i].set(1.0, 0.62, 0.3).multiplyScalar(lit ? 1 : 0); else GLOSS_U.uLC.value[i].set(1.0, 0.3, 0.62).multiplyScalar(lit ? 0.9 : 0); }); }
  // station: the LED-lit tiles reflected in the lacquered worktop (two points just behind the backsplash, so from the station cameras the sheen lands mid-worktop) + the amber key
  { const lp = [[-2.0, 1.2, -5.42, 0.17, 0.22, 0.26], [-1.0, 1.2, -5.42, 0.17, 0.22, 0.26], [-2.45, 1.32, -4.38, 0.45, 0.24, 0.09]]; lp.forEach((p, i) => { GLOSS_U.uLP.value[4 + i].set(p[0], p[1], p[2]); GLOSS_U.uLC.value[4 + i].set(p[3], p[4], p[5]).multiplyScalar(lit ? 1 : 0); }); }
  // right prep bench, back doorway/noren/stairs, reflection occluders (own seed so they stay stable)
  reseed(5207); buildPrepBench(g, ch, em, lit); buildDoorway(g, ch, em, lit, f); buildReflOccluders(g, f);
  addBuilt(g, ch); addBuilt(g, em); addBuilt(g, gl);
  buildTeaCounter();
  // key light position (shadow casting) above counter
  keyLight.intensity = lit ? 7 : (f.crew ? 2.4 : 0); keyLight.color.set(lit ? 0xff9e52 : 0xdfeeff);
  keyLight.angle = lit ? 0.78 : 0.95; keyLight.penumbra = lit ? 0.5 : 0.65; keyLight.distance = lit ? 6 : 0;
  keyLight.position.set(-0.7, 3.15, lit ? -3.25 : -2.2); keyLight.target.position.set(-0.7, 0, lit ? -2.75 : -2.8);
}

