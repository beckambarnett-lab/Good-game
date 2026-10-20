/* ================= prop library ================= */
// palette
const C = {
  cedar: 0x7a5236, cedarD: 0x4a3122, cedarL: 0x9a6c48, oak: 0x8c6a48, walnut: 0x5a3c28, bamboo: 0xb59a5a,
  tatami: 0xb9a26a, tatamiB: 0x2d3a2c, washi: 0xefe4cc, paper: 0xe8dcc0, plaster: 0xcfc3ad, plasterD: 0x9d917e,
  lacquer: 0xc2362b, black: 0x17181c, iron: 0x2a2d33, steel: 0x8b939c, steelD: 0x4d545c, copper: 0xb8743f, brass: 0xc9a24a,
  concrete: 0x6b6f76, concreteD: 0x4a4e56, asphalt: 0x23262d, tileW: 0xd8d4c8, tileT: 0x3f6b66, tileT2: 0x35605b,
  rust: 0x8a4a2a, ceramic: 0xe9e4d8, celadon: 0x9fb8a0, indigo: 0x2c3c6e, red: 0xb83a30, green: 0x4f7d48, leaf: 0x5f9a4a, leafD: 0x3e6e38,
  plastic: 0xd9d9d4, blue: 0x3a6fb0, yellow: 0xe0b53a, orange: 0xd9772e, pink: 0xd77aa0, cardboard: 0xa8865a, vinyl: 0xdfe8ee, soil: 0x3a2a20,
};
// transform scope: run fn with chunk transform x,y,z,ry
function at(ch, x, y, z, ry, fn, s) { const prev = ch.xf; const m = M(x, y, z, 0, ry || 0, 0, s || 1, s || 1, s || 1); ch.xf = prev ? prev.clone().multiply(m) : m; fn(); ch.xf = prev; }
function atR(ch, x, y, z, rx, ry, rz, fn) { const prev = ch.xf; const m = M(x, y, z, rx, ry, rz); ch.xf = prev ? prev.clone().multiply(m) : m; fn(); ch.xf = prev; }

const P = {
  // ---------- kitchen / tea ----------
  yunomi(ch, x, y, z, col) { ch.cyl(0.036, 0.03, 0.075, 8, col || C.ceramic, x, y + 0.0375, z); ch.cyl(0.03, 0.03, 0.004, 8, 0x5a6a3a, x, y + 0.072, z); },
  cupStack(ch, x, y, z, n, col) { for (let i = 0; i < n; i++) ch.cyl(0.037, 0.031, 0.05, 8, col || C.ceramic, x, y + 0.025 + i * 0.038, z); },
  tin(ch, x, y, z, col, h) { h = h || 0.16; ch.cyl(0.05, 0.05, h, 10, col, x, y + h / 2, z); ch.cyl(0.052, 0.052, 0.03, 10, C.steelD, x, y + h - 0.01, z); ch.cyl(0.051, 0.051, 0.05, 10, C.washi, x, y + h * 0.45, z); },
  jar(ch, x, y, z, col, h) { h = h || 0.22; ch.cyl(0.065, 0.06, h, 10, 0x9ab0b4, x, y + h / 2, z); ch.cyl(0.058, 0.058, h * 0.7, 10, col, x, y + h * 0.36, z); ch.cyl(0.05, 0.05, 0.03, 10, C.cedarD, x, y + h + 0.012, z); },
  bottle(ch, x, y, z, col, h) { h = h || 0.26; ch.cyl(0.035, 0.035, h * 0.65, 8, col, x, y + h * 0.325, z); ch.cyl(0.014, 0.03, h * 0.25, 8, col, x, y + h * 0.77, z); ch.cyl(0.016, 0.016, h * 0.08, 6, C.black, x, y + h * 0.94, z); },
  kyusu(ch, x, y, z, ry, col) { at(ch, x, y, z, ry, () => { ch.ball(0.075, col || 0x7a3f2a, 0, 0.065, 0, 1, 1, 0.8, 1); ch.cyl(0.04, 0.045, 0.02, 10, col || 0x7a3f2a, 0, 0.125, 0); ch.ball(0.014, C.black, 0, 0.145, 0); ch.cyl(0.012, 0.02, 0.08, 6, col || 0x7a3f2a, 0.085, 0.085, 0, 0, 0, -1.0); ch.cyl(0.016, 0.016, 0.13, 6, C.cedarD, 0, 0.07, -0.12, Math.PI / 2, 0, 0); }); },
  board(ch, x, y, z, ry) { at(ch, x, y, z, ry, () => { ch.box(0.36, 0.025, 0.24, C.cedarL, 0, 0.0125, 0); ch.box(0.06, 0.02, 0.02, C.cedarD, 0.15, 0.03, 0); }); },
  cloth(ch, x, y, z, ry, col) { at(ch, x, y, z, ry, () => { ch.box(0.24, 0.012, 0.16, col || C.indigo, 0, 0.006, 0); ch.box(0.24, 0.013, 0.02, C.washi, 0, 0.007, 0.05); }); },
  whisk(ch, x, y, z) { ch.cyl(0.012, 0.012, 0.06, 6, C.bamboo, x, y + 0.03, z); ch.cyl(0.03, 0.016, 0.06, 10, 0xd9c48a, x, y + 0.09, z); },
  register(ch, x, y, z, ry) { // antique brass-trimmed cash register; keys face local +z
    at(ch, x, y, z, ry, () => {
      const B = 0x241a14, Bd = 0x120d0a, br = C.brass, brD = 0x8a6a2a, th = 0.5, sn = Math.sin(th), cs = Math.cos(th);
      // cash drawer base
      ch.box(0.42, 0.1, 0.38, B, 0, 0.05, 0); ch.box(0.44, 0.014, 0.4, brD, 0, 0.007, 0); ch.box(0.36, 0.064, 0.006, Bd, 0, 0.05, 0.19); ch.box(0.1, 0.016, 0.012, br, 0, 0.05, 0.196); ch.box(0.43, 0.012, 0.012, br, 0, 0.1, 0.19);
      for (const sx of [-1, 1]) { ch.box(0.004, 0.07, 0.3, brD, sx * 0.211, 0.05, 0); ch.cyl(0.012, 0.012, 0.32, 6, br, sx * 0.19, 0.26, -0.06); ch.ball(0.016, br, sx * 0.19, 0.43, -0.06); }
      // body + sloped key bed with four stepped rows of round keys
      ch.box(0.4, 0.1, 0.3, B, 0, 0.15, -0.03); ch.box(0.38, 0.03, 0.24, Bd, 0, 0.19, 0.06, th);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const s2 = 0.09 - r * 0.055; const kx = -0.14 + k * 0.056, ky = 0.19 - s2 * sn + 0.03 * cs, kz = 0.06 + s2 * cs + 0.03 * sn;
        ch.cyl(0.004, 0.004, 0.03, 4, C.iron, kx, ky - 0.012, kz, th); ch.cyl(0.016, 0.016, 0.01, 8, r === 3 ? (k % 2 ? 0x5a1a14 : C.black) : 0x4a3e2c, kx, ky + 0.004, kz, th); ch.torus(0.016, 0.004, 8, brD, kx, ky + 0.004, kz, th + Math.PI / 2); } // aged ivory caps in dim brass rims (not glowing)
      // upper cabinet with an embossed brass face plate
      ch.box(0.36, 0.2, 0.14, B, 0, 0.32, -0.11); ch.box(0.3, 0.15, 0.006, brD, 0, 0.32, -0.038);
      for (const sx of [-1, 1]) { ch.torus(0.035, 0.007, 10, br, sx * 0.075, 0.32, -0.033); ch.ball(0.01, br, sx * 0.075, 0.32, -0.032); ch.box(0.004, 0.13, 0.004, br, sx * 0.145, 0.32, -0.033); }
      ch.cyl(0.03, 0.03, 0.01, 8, br, 0, 0.32, -0.033, Math.PI / 2); ch.ball(0.014, 0xe8c870, 0, 0.32, -0.026); ch.box(0.28, 0.008, 0.008, br, 0, 0.25, -0.034); ch.box(0.28, 0.008, 0.008, br, 0, 0.39, -0.034);
      // cornice + flag display + crest
      ch.box(0.4, 0.02, 0.18, br, 0, 0.43, -0.11); ch.box(0.24, 0.08, 0.1, B, 0, 0.48, -0.11); ch.box(0.2, 0.046, 0.004, 0x1c2622, 0, 0.482, -0.058);
      for (let i = 0; i < 4; i++) { ch.box(0.036, 0.034, 0.004, C.washi, -0.06 + i * 0.04, 0.482, -0.055); ch.box(0.008, 0.02, 0.003, i === 0 ? C.lacquer : C.black, -0.06 + i * 0.04, 0.482, -0.052); }
      ch.box(0.26, 0.014, 0.11, br, 0, 0.525, -0.11); ch.torus(0.055, 0.008, 12, br, 0, 0.53, -0.11); ch.ball(0.016, br, 0, 0.6, -0.11);
      // back (customer side, local -z): panelled body, rear flag window, embossed brass plate, rosettes, maker's plaque
      ch.box(0.38, 0.07, 0.006, Bd, 0, 0.05, -0.193); ch.box(0.12, 0.022, 0.004, brD, 0, 0.05, -0.197); ch.box(0.43, 0.012, 0.012, br, 0, 0.1, -0.19);
      ch.box(0.36, 0.08, 0.006, Bd, 0, 0.15, -0.183); for (const sx of [-1, 1]) { ch.box(0.15, 0.06, 0.004, brD, sx * 0.09, 0.15, -0.187); ch.box(0.13, 0.044, 0.004, B, sx * 0.09, 0.15, -0.189); ch.ball(0.009, br, sx * 0.17, 0.15, -0.188); }
      ch.box(0.3, 0.16, 0.006, brD, 0, 0.32, -0.183); ch.box(0.26, 0.12, 0.004, Bd, 0, 0.32, -0.186);
      ch.torus(0.04, 0.006, 12, br, 0, 0.32, -0.189); ch.box(0.016, 0.06, 0.004, br, 0, 0.32, -0.19); for (const sx of [-1, 1]) { ch.torus(0.022, 0.005, 10, br, sx * 0.085, 0.32, -0.189); ch.ball(0.008, br, sx * 0.085, 0.32, -0.19); ch.box(0.004, 0.14, 0.004, br, sx * 0.145, 0.32, -0.188); for (const sy of [0.255, 0.385]) ch.ball(0.009, br, sx * 0.135, sy, -0.189); }
      ch.box(0.2, 0.046, 0.004, 0x1c2622, 0, 0.482, -0.162); for (let i = 0; i < 4; i++) { ch.box(0.036, 0.034, 0.004, 0xb8a888, -0.06 + i * 0.04, 0.482, -0.165); ch.box(0.008, 0.02, 0.003, i === 1 ? 0x5a1a14 : C.black, -0.06 + i * 0.04, 0.482, -0.168); }
      ch.box(0.24, 0.006, 0.006, br, 0, 0.508, -0.163); ch.box(0.24, 0.006, 0.006, br, 0, 0.456, -0.163);
      for (const sx of [-1, 1]) { ch.box(0.004, 0.14, 0.1, brD, sx * 0.182, 0.32, -0.11); ch.box(0.004, 0.11, 0.07, B, sx * 0.184, 0.32, -0.11); ch.box(0.004, 0.06, 0.22, brD, sx * 0.202, 0.15, -0.03); }
      // side crank
      ch.cyl(0.012, 0.012, 0.05, 6, br, 0.225, 0.2, 0.04, 0, 0, Math.PI / 2); ch.box(0.012, 0.1, 0.014, br, 0.25, 0.155, 0.04); ch.cyl(0.014, 0.014, 0.05, 6, C.black, 0.27, 0.11, 0.04, 0, 0, Math.PI / 2);
    });
  },
  tipJar(ch, x, y, z) { ch.cyl(0.06, 0.055, 0.14, 10, 0x9ab0b4, x, y + 0.07, z); ch.cyl(0.05, 0.05, 0.05, 8, C.brass, x, y + 0.03, z); },
  plant(ch, x, y, z, s, kind) {
    s = s || 1; at(ch, x, y, z, srand() * 6, () => {
      ch.cyl(0.12 * s, 0.09 * s, 0.18 * s, 8, kind === 2 ? 0x8a8e94 : C.lacquer, 0, 0.09 * s, 0); ch.cyl(0.11 * s, 0.11 * s, 0.02, 8, C.soil, 0, 0.18 * s, 0);
      const n = kind === 1 ? 9 : 7; for (let i = 0; i < n; i++) { const a = i / n * 6.28 + srand(); const h = srange(0.2, 0.45) * s; ch.box(0.05 * s, h, 0.012, srand() < 0.5 ? C.leaf : C.leafD, Math.cos(a) * 0.05 * s, 0.18 * s + h / 2, Math.sin(a) * 0.05 * s, srange(-0.2, 0.2), a, srange(0.25, 0.6)); ch.box(0.09 * s, 0.07 * s, 0.01, C.leaf, Math.cos(a) * 0.12 * s, 0.18 * s + h, Math.sin(a) * 0.12 * s, 0.6, a, 0.2); }
    });
  },
  pothos(ch, x, y, z, len) { // trailing leaves down from a shelf edge
    let py = y; for (let i = 0; i < len; i++) { const ox = Math.sin(i * 1.3) * 0.05; ch.box(0.07, 0.05, 0.01, i % 2 ? C.leaf : C.leafD, x + ox, py, z, 0.3, srand() * 3, 0.3); py -= 0.07; }
  },
  // ---------- furniture ----------
  stool(ch, x, y, z, h, col) { h = h || 0.72; ch.cyl(0.19, 0.17, 0.06, 12, col || C.cedarL, x, y + h - 0.03, z); ch.cyl(0.165, 0.165, 0.02, 12, 0x8a3a2a, x, y + h + 0.005, z); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6; ch.bar([x + Math.cos(a) * 0.11, y + h - 0.05, z + Math.sin(a) * 0.11], [x + Math.cos(a) * 0.16, y, z + Math.sin(a) * 0.16], 0.025, C.iron); } ch.torus(0.13, 0.012, 12, C.iron, x, y + h * 0.35, z, Math.PI / 2); },
  // diner stool: chrome legs + foot ring, thick glossy red vinyl seat with a chrome skirt (gloss kinds only take effect in a {gloss:true} chunk)
  stoolChrome(ch, x, y, z, h, col) {
    h = h || 0.72; const g0 = ch.gk, chrome = 0x8a9098, top = h - 0.07;
    ch.gk = 3;
    ch.cyl(0.186, 0.186, 0.04, 14, chrome, x, y + h - 0.05, z); ch.cyl(0.09, 0.11, 0.03, 10, chrome, x, y + h - 0.085, z);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ch.bar([x + Math.cos(a) * 0.09, y + top, z + Math.sin(a) * 0.09], [x + Math.cos(a) * 0.175, y + 0.02, z + Math.sin(a) * 0.175], 0.024, chrome, 6); }
    const ry = h * 0.33, rr = 0.09 + 0.085 * (1 - (ry - 0.02) / (top - 0.02)); ch.torus(rr, 0.011, 14, chrome, x, y + ry, z, Math.PI / 2);
    ch.gk = 0; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ch.cyl(0.02, 0.022, 0.025, 6, 0x161616, x + Math.cos(a) * 0.177, y + 0.012, z + Math.sin(a) * 0.177); }
    ch.gk = 2; const red = col || 0x9a1820;
    ch.cyl(0.18, 0.183, 0.055, 14, red, x, y + h - 0.003, z); ch.cyl(0.15, 0.18, 0.022, 14, red, x, y + h + 0.035, z);
    ch.torus(0.168, 0.012, 14, 0xd8505c, x, y + h + 0.024, z, Math.PI / 2); ch.cyl(0.1, 0.1, 0.004, 12, 0xb02a34, x, y + h + 0.047, z);
    ch.gk = g0;
  },
  cushion(ch, x, y, z, col) { ch.box(0.48, 0.07, 0.48, col || 0x6a2f3a, x, y + 0.035, z); ch.box(0.06, 0.02, 0.06, C.brass, x, y + 0.075, z); },
  lowTable(ch, x, y, z, w, d) { w = w || 1.1; d = d || 0.7; ch.box(w, 0.05, d, C.walnut, x, y + 0.33, z); for (const sx of [-1, 1]) for (const sz of [-1, 1]) ch.box(0.06, 0.31, 0.06, C.cedarD, x + sx * (w / 2 - 0.08), y + 0.155, z + sz * (d / 2 - 0.08)); ch.box(w - 0.12, 0.03, 0.04, C.cedarD, x, y + 0.29, z + d / 2 - 0.07); ch.box(w - 0.12, 0.03, 0.04, C.cedarD, x, y + 0.29, z - d / 2 + 0.07); },
  shelf(ch, x, y, z, w, ry) { at(ch, x, y, z, ry, () => { ch.box(w, 0.03, 0.24, C.cedarL, 0, 0, 0); for (const sx of [-1, 1]) { ch.box(0.025, 0.14, 0.03, C.iron, sx * (w / 2 - 0.1), -0.07, -0.1); ch.bar([sx * (w / 2 - 0.1), -0.14, -0.1], [sx * (w / 2 - 0.1), -0.015, 0.08], 0.02, C.iron); } }); },
  crate(ch, x, y, z, ry, col) { at(ch, x, y, z, ry, () => { ch.box(0.5, 0.4, 0.4, col || C.cardboard, 0, 0.2, 0); ch.box(0.5, 0.02, 0.06, 0xc9a77a, 0, 0.405, 0); ch.box(0.2, 0.12, 0.002, C.washi, 0.1, 0.25, 0.201); }); },
  beerCrate(ch, x, y, z, col) { ch.box(0.36, 0.28, 0.36, col || 0xc8402e, x, y + 0.14, z); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ch.cyl(0.03, 0.03, 0.2, 6, 0x6a4020, x - 0.11 + i * 0.11, y + 0.3, z - 0.11 + j * 0.11); },
  bucket(ch, x, y, z, col) { ch.cyl(0.14, 0.11, 0.26, 10, col || C.blue, x, y + 0.13, z); ch.torus(0.14, 0.006, 12, C.steelD, x, y + 0.27, z, Math.PI / 2); },
  umbrellaStand(ch, x, y, z) { ch.cyl(0.12, 0.12, 0.45, 10, C.iron, x, y + 0.225, z); const cols = [0xdfe8ee, C.lacquer, C.indigo, 0xdfe8ee]; cols.forEach((c, i) => { const a = i * 1.6; ch.bar([x + Math.cos(a) * 0.05, y + 0.2, z + Math.sin(a) * 0.05], [x + Math.cos(a) * 0.09, y + 0.95, z + Math.sin(a) * 0.09], 0.05, c); ch.cyl(0.012, 0.012, 0.12, 6, C.cedarD, x + Math.cos(a) * 0.095, y + 1.0, z + Math.sin(a) * 0.095); }); },
  broom(ch, x, y, z, ry) { at(ch, x, y, z, ry, () => { ch.bar([0, 0.25, 0], [0.05, 1.3, -0.25], 0.025, C.bamboo); ch.box(0.32, 0.22, 0.05, 0xb79a5a, 0, 0.12, 0.03, 0.15); }); },
  trashBag(ch, x, y, z, s) { s = s || 1; ch.ball(0.28 * s, 0x1c1d22, x, y + 0.22 * s, z, 1, 1, 0.8, 1); ch.cone(0.06 * s, 0.14 * s, 6, 0x1c1d22, x, y + 0.48 * s, z); },
  cardboard(ch, x, y, z, ry, w, h, d) { at(ch, x, y, z, ry, () => { ch.box(w || 0.5, h || 0.35, d || 0.4, C.cardboard, 0, (h || 0.35) / 2, 0); ch.box((w || 0.5) * 0.98, 0.012, 0.05, 0x8f6f45, 0, (h || 0.35) + 0.006, 0); }); },
  // ---------- building parts ----------
  acUnit(ch, x, y, z, ry) { at(ch, x, y, z, ry, () => { ch.box(0.8, 0.55, 0.3, 0xc9c8c0, 0, 0, 0); ch.cyl(0.21, 0.21, 0.02, 14, 0x3a3d42, 0.12, 0, 0.152, Math.PI / 2); for (let i = 0; i < 5; i++) ch.box(0.4, 0.012, 0.012, 0x6a6d72, 0.12, -0.16 + i * 0.08, 0.165); ch.box(0.16, 0.4, 0.01, 0x9a9890, -0.26, 0, 0.152); ch.box(0.06, 0.06, 0.3, C.steelD, 0.42, -0.2, 0); }); },
  meter(ch, x, y, z, ry) { at(ch, x, y, z, ry, () => { ch.box(0.22, 0.3, 0.1, 0x9aa0a6, 0, 0, 0); ch.cyl(0.07, 0.07, 0.03, 12, 0x2a2e33, 0, 0.04, 0.06, Math.PI / 2); ch.box(0.12, 0.04, 0.01, C.washi, 0, -0.09, 0.052); }); },
  pipe(ch, a, b, r, col) { ch.bar(a, b, r * 2, col || C.steelD, 8); },
  bracketPipe(ch, x, y0, y1, z, r, col) { ch.cyl(r, r, y1 - y0, 8, col || C.steelD, x, (y0 + y1) / 2, z); for (let y = y0 + 0.4; y < y1; y += 1.1) ch.box(r * 2.6, 0.04, r * 2.6, C.iron, x, y, z); },
  conduit(ch, pts, th, col) { for (let i = 1; i < pts.length; i++) ch.bar(pts[i - 1], pts[i], th || 0.035, col || 0x6a6d72); },
  railing(ch, x0, z0, x1, z1, y, h, col) { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 0.12)); ch.bar([x0, y + h, z0], [x1, y + h, z1], 0.045, col || C.iron); ch.bar([x0, y + 0.08, z0], [x1, y + 0.08, z1], 0.03, col || C.iron); for (let i = 0; i <= n; i++) { const t = i / n; ch.bar([lerp(x0, x1, t), y + 0.08, lerp(z0, z1, t)], [lerp(x0, x1, t), y + h, lerp(z0, z1, t)], 0.018, col || C.iron); } },
  window(ch, x0, x1, y0, y1, z, mullV, mullH, col, depth) { // frame + mullions, glass separate
    col = col || C.cedarD; depth = depth || 0.08; const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    ch.box(w + 0.1, 0.07, depth + 0.06, col, cx, y0 - 0.035, z); ch.box(w + 0.1, 0.06, depth, col, cx, y1 + 0.03, z); ch.box(0.06, h, depth, col, x0 - 0.03, cy, z); ch.box(0.06, h, depth, col, x1 + 0.03, cy, z);
    for (let i = 1; i < mullV; i++) ch.box(0.035, h, depth * 0.7, col, x0 + w * i / mullV, cy, z); for (let i = 1; i < mullH; i++) ch.box(w, 0.035, depth * 0.7, col, cx, y0 + h * i / mullH, z);
  },
  // ---------- street ----------
  vending(ch, x, y, z, ry, body, emis) {
    at(ch, x, y, z, ry, () => {
      ch.box(0.95, 1.85, 0.75, body || 0xd8d8d2, 0, 0.925, 0); ch.box(0.9, 0.06, 0.7, 0x2a2d33, 0, 1.88, 0);
      ch.box(0.78, 1.0, 0.02, 0x0e1622, 0, 1.25, 0.376); ch.box(0.6, 0.18, 0.05, 0x22252c, 0, 0.32, 0.36); ch.box(0.12, 0.3, 0.03, 0x666b72, 0.33, 0.75, 0.38);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { ch.cyl(0.035, 0.035, 0.12, 6, spick([0xc23b2b, 0x2e6fb0, 0xe0b53a, 0x3f8a4a, 0xe8e2d4, 0x7a3a8a]), -0.3 + i * 0.12, 0.88 + r * 0.32, 0.33); ch.box(0.07, 0.025, 0.02, 0x20242a, -0.3 + i * 0.12, 0.79 + r * 0.32, 0.385); }
    });
    if (emis) at(emis, x, y, z, ry, () => { emis.box(0.76, 0.98, 0.01, 0xb8d8ff, 0, 1.25, 0.37, 0, 0, 0); for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) emis.box(0.03, 0.012, 0.01, srand() < 0.2 ? 0xff5a5a : 0x7affb0, -0.3 + i * 0.12, 0.79 + r * 0.32, 0.395); });
  },
  bike(ch, x, y, z, ry, col) { at(ch, x, y, z, ry, () => { for (const sx of [-0.52, 0.52]) { ch.torus(0.3, 0.018, 14, 0x1a1a1d, sx, 0.32, 0, 0, 0, 0); ch.cyl(0.02, 0.02, 0.06, 6, C.steel, sx, 0.32, 0, Math.PI / 2); } ch.bar([-0.52, 0.32, 0], [-0.05, 0.62, 0], 0.035, col || 0x2f6f8a); ch.bar([-0.05, 0.62, 0], [0.42, 0.66, 0], 0.035, col || 0x2f6f8a); ch.bar([0, 0.3, 0], [-0.05, 0.62, 0], 0.035, col || 0x2f6f8a); ch.bar([0, 0.3, 0], [-0.52, 0.32, 0], 0.03, col || 0x2f6f8a); ch.bar([0.42, 0.66, 0], [0.52, 0.32, 0], 0.03, col || 0x2f6f8a); ch.box(0.22, 0.05, 0.09, 0x1a1a1d, -0.08, 0.7, 0); ch.bar([0.42, 0.8, -0.25], [0.42, 0.8, 0.25], 0.025, C.steel); ch.bar([0.42, 0.66, 0], [0.42, 0.8, 0], 0.03, C.steel); ch.box(0.3, 0.2, 0.3, 0x8a6a3a, 0.55, 0.72, 0); }); },
  cone(ch, x, y, z) { ch.cone(0.14, 0.5, 8, 0xe0582e, x, y + 0.27, z); ch.box(0.32, 0.03, 0.32, 0x22252b, x, y + 0.015, z); ch.cyl(0.1, 0.09, 0.06, 8, 0xeeeeea, x, y + 0.3, z); },
  bollard(ch, x, y, z) { ch.cyl(0.11, 0.11, 0.04, 12, 0x1a1b1f, x, y + 0.02, z); ch.cyl(0.095, 0.1, 0.86, 12, 0x17181b, x, y + 0.45, z); ch.cyl(0.101, 0.101, 0.07, 12, 0xe8b820, x, y + 0.76, z); ch.cyl(0.099, 0.099, 0.025, 12, 0xe8b820, x, y + 0.66, z); ch.ball(0.095, 0x222428, x, y + 0.88, z, 1, 1, 0.45, 1); },
  drain(ch, x, y, z, w) { ch.box(w || 0.5, 0.02, 0.3, 0x16181c, x, y + 0.005, z); for (let i = 0; i < 6; i++) ch.box(0.025, 0.025, 0.28, 0x3a3e44, x - (w || 0.5) / 2 + 0.05 + i * ((w || 0.5) - 0.1) / 5, y + 0.012, z); },
  manhole(ch, x, y, z) { ch.cyl(0.36, 0.36, 0.02, 16, 0x2e3136, x, y + 0.008, z); ch.torus(0.25, 0.01, 16, 0x41454b, x, y + 0.02, z, Math.PI / 2); ch.torus(0.14, 0.01, 12, 0x41454b, x, y + 0.02, z, Math.PI / 2); },
  hydrant(ch, x, y, z) { ch.cyl(0.11, 0.13, 0.6, 10, 0xc23b2b, x, y + 0.3, z); ch.ball(0.12, 0xc23b2b, x, y + 0.62, z, 0, 1, 0.7, 1); ch.cyl(0.05, 0.05, 0.3, 8, 0xc23b2b, x, y + 0.42, z, 0, 0, Math.PI / 2); },
  dumpster(ch, x, y, z, ry) { at(ch, x, y, z, ry, () => { ch.box(1.6, 1.0, 0.95, 0x2f5a4a, 0, 0.55, 0); ch.box(1.66, 0.06, 1.0, 0x24453a, 0, 1.08, -0.02, -0.08); for (const sx of [-0.7, 0.7]) ch.cyl(0.07, 0.07, 0.05, 8, 0x111111, sx, 0.07, 0.35, 0, 0, Math.PI / 2); ch.box(0.5, 0.25, 0.01, 0xd8d0b0, 0, 0.6, 0.48); }); },
  barrel(ch, x, y, z, col) { ch.cyl(0.32, 0.3, 0.95, 14, col || 0x2f5d8a, x, y + 0.475, z); for (const h of [0.2, 0.75]) ch.torus(0.315, 0.018, 16, 0x1d3a58, x, y + h, z, Math.PI / 2); ch.cyl(0.31, 0.31, 0.03, 14, 0x24486c, x, y + 0.96, z); ch.cyl(0.03, 0.03, 0.1, 6, C.brass, x + 0.3, y + 0.12, z, 0, 0, Math.PI / 2); },
  noren(ch, x, y, z, w, h, col, panels, ry, mon) { at(ch, x, y, z, ry, () => { ch.cyl(0.02, 0.02, w + 0.1, 6, C.cedarD, 0, 0, 0, 0, 0, Math.PI / 2); const n = panels || 3, pw = w / n; const c2 = new THREE.Color(col || C.indigo).multiplyScalar(0.72).getHex();
    for (let i = 0; i < n; i++) { const px = -w / 2 + pw * (i + 0.5), sw = srange(-0.02, 0.02); ch.box(pw - 0.02, h, 0.012, col || C.indigo, px, -h / 2 - 0.02, 0, 0, 0, sw); ch.box(pw - 0.02, 0.06, 0.016, c2, px, -0.05, 0, 0, 0, sw); for (const sx of [-1, 1]) ch.box(0.012, 0.05, 0.018, 0xe8e0d0, px + sx * (pw / 2 - 0.05), -0.05, 0); }
    if (mon) { const my = -h * 0.42; for (const sz of [0.009, -0.009]) { ch.cyl(0.085, 0.085, 0.004, 14, mon, 0, my, sz, Math.PI / 2); ch.cone(0.06, 0.1, 8, mon, 0, my + 0.1, sz); } } }); },
  lantern(ch, x, y, z, col, s) { s = s || 1; ch.cyl(0.14 * s, 0.14 * s, 0.03, 10, C.black, x, y + 0.2 * s, z); ch.cyl(0.14 * s, 0.14 * s, 0.03, 10, C.black, x, y - 0.2 * s, z); ch.cyl(0.006, 0.006, 0.15, 4, C.black, x, y + 0.29 * s, z); },
  lanternGlow(em, x, y, z, col, s) { s = s || 1; em.cyl(0.16 * s, 0.16 * s, 0.36 * s, 12, col || 0xff6040, x, y, z); },
  pole(ch, x, y, z, h) { ch.cyl(0.12, 0.15, h, 10, 0x6d6a64, x, y + h / 2, z); for (const hy of [h - 0.6, h - 1.4]) ch.box(1.4, 0.08, 0.1, 0x4a4844, x, y + hy, z); ch.cyl(0.16, 0.16, 0.5, 10, 0x55595e, x + 0.3, y + h - 2.0, z + 0.2); ch.cyl(0.16, 0.16, 0.5, 10, 0x55595e, x - 0.3, y + h - 2.0, z + 0.2); for (let i = 0; i < 6; i++) ch.cyl(0.02, 0.02, 0.08, 4, 0xdddddd, x - 0.6 + i * 0.24, y + h - 0.55, z); },
  scooter(ch, x, y, z, ry, col) { at(ch, x, y, z, ry, () => { ch.torus(0.2, 0.05, 12, 0x161616, -0.55, 0.22, 0); ch.torus(0.2, 0.05, 12, 0x161616, 0.55, 0.22, 0); ch.box(1.0, 0.28, 0.34, col || 0xd8d4c8, -0.1, 0.48, 0); ch.box(0.5, 0.1, 0.3, 0x22252b, -0.25, 0.66, 0); ch.bar([0.48, 0.3, 0], [0.42, 1.0, 0], 0.06, col || 0xd8d4c8); ch.bar([0.42, 1.0, -0.3], [0.42, 1.0, 0.3], 0.03, C.iron); ch.box(0.16, 0.12, 0.18, col || 0xd8d4c8, 0.5, 0.92, 0); ch.box(0.36, 0.3, 0.32, 0x22252b, -0.48, 0.86, 0); }); },
  nobori(ch, x, y, z, col) { ch.cyl(0.015, 0.015, 2.2, 6, C.steel, x, y + 1.1, z); ch.box(0.36, 1.4, 0.01, col || C.lacquer, x + 0.19, y + 1.45, z); ch.bar([x, y + 2.15, z], [x + 0.38, y + 2.15, z], 0.015, C.steel); },
  aBoard(ch, x, y, z, ry) { at(ch, x, y, z, ry, () => { ch.box(0.55, 0.8, 0.03, C.cedarD, 0, 0.45, 0.12, -0.15); ch.box(0.55, 0.8, 0.03, C.cedarD, 0, 0.45, -0.12, 0.15); ch.box(0.47, 0.66, 0.01, 0x1c2420, 0, 0.47, 0.137, -0.15); }); },
};
// contact shadow blobs (soft dark quads on floors)
const SHADOW_BLOBS = [];
const blobMat = new THREE.MeshBasicMaterial({ map: SOFT_TEX, transparent: true, depthWrite: false, opacity: 0.55, color: 0x000000 });
function blob(group, x, y, z, w, d) { const m = new THREE.Mesh(gPlaneIdx(), blobMat); m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.006, z); m.scale.set(w, d, 1); m.renderOrder = 1; group.add(m); return m; }

