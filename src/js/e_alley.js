/* ================= 雨横丁 Ame-yokochō: the alley beside the shop =================
   x 2.73 (shop / apartment wall) .. 4.6 (arcade / izakaya wall), z +0.3 (street) .. -18.5 (end wall)
   The alley turns right at the end into a gated cross-passage lit from around the corner. */
const AL = { x0: 2.73, x1: 4.6, zEnd: -18.5, zTurn: -17.2, steam: [], flick: [] };
// window set into a wall facing +x (side 1, wall at x) or -x (side -1)
function wallWin(ch, em, side, x, zc, y0, y1, w, o) {
  o = o || {}; const ry = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  at(ch, x, 0, zc, ry, () => {
    P.window(ch, -w / 2, w / 2, y0, y1, 0.02, o.mv == null ? 1 : o.mv, o.mh == null ? 0 : o.mh, o.frame || 0x2a2c31, 0.06);
    ch.box(w + 0.12, 0.05, 0.14, 0x55595e, 0, y0 - 0.03, 0.05); // sill
    if (o.bars) for (let i = 0; i < 5; i++) ch.box(0.018, y1 - y0 + 0.06, 0.018, 0x1e2024, -w / 2 + w * (i + 0.5) / 5, (y0 + y1) / 2, 0.11);
    if (o.curtain) ch.box(w * 0.42, (y1 - y0) * 0.92, 0.01, o.curtain, -w * 0.26, (y0 + y1) / 2, -0.01);
  });
  const glassCol = o.lit ? new THREE.Color(o.lit).multiplyScalar(0.5).getHex() : 0x0b0d14;
  at(em, x + side * 0.012, 0, zc, ry, () => em.quad(w - 0.06, y1 - y0 - 0.06, glassCol, 0, (y0 + y1) / 2, 0.0));
  if (o.lit && o.glow !== false) anchor(x + side * 0.5, (y0 + y1) / 2, zc, o.lit, o.glowI || 0.7, 2.6, ['alley'], 0.3);
}
function buildAlley(wet) {
  reseed(3131);
  const ch = new Chunk('alley', 'alley'), em = new Chunk('alleyEm', 'alley', { emis: true }), far = new Chunk('alleyBack', 'alley');
  const { x0, x1, zEnd, zTurn } = AL, xm = (x0 + x1) / 2;
  // ---- floor: worn concrete slabs, kerb strips along the walls, a central drain channel with grates
  for (let z = 0.6; z > zEnd + 0.001; z -= 0.6) for (const [a, b] of [[x0, xm - 0.15], [xm + 0.15, x1]]) { const dd = Math.min(0.6, z - zEnd); wet.box(b - a - 0.02, 0.06, dd - 0.02, new THREE.Color(0x55575c).multiplyScalar(srange(0.78, 1.04)).getHex(), (a + b) / 2, 0.03, z - dd / 2, 0, 0, 0, 0.6); }
  wet.box(0.3, 0.05, -zEnd + 0.6, 0x3a3c42, xm, 0.025, (0.6 + zEnd) / 2, 0, 0, 0, 0.9); // channel bed
  wet.box(0.16, 0.052, -zEnd + 0.6, 0x1c1f26, xm, 0.026, (0.6 + zEnd) / 2, 0, 0, 0, 0.4); // water in the channel
  for (let z = -1.2; z > zEnd + 0.5; z -= 2.4) { ch.box(0.34, 0.012, 0.5, 0x2a2c31, xm, 0.062, z); for (let i = 0; i < 6; i++) ch.box(0.3, 0.014, 0.025, 0x4a4e56, xm, 0.064, z - 0.2 + i * 0.08); }
  for (const x of [x0 + 0.07, x1 - 0.07]) ch.box(0.14, 0.09, -zEnd + 0.3, 0x4a4c52, x, 0.045, (0.3 + zEnd) / 2);
  P.manhole(ch, x0 + 0.5, 0.06, -13.7);
  // cross-passage floor (behind the gate)
  for (let x = x1; x < 12; x += 0.6) wet.box(0.58, 0.06, zTurn - zEnd - 0.02, new THREE.Color(0x4f5156).multiplyScalar(srange(0.8, 1.0)).getHex(), x + 0.3, 0.03, (zTurn + zEnd) / 2, 0, 0, 0, 0.6);
  // dark ground under everything out of reach, so nothing ever shows the sky below the horizon
  far.box(40, 0.1, 40, 0x101116, 4, -0.08, -24);

  // ---- the arcade's flank (x = 4.6, z 0 .. -10): panel seams, exit door, fan, tube lamp, conduit
  const AX = x1 - 0.01;
  for (let z = -0.6; z > -10; z -= 1.2) ch.box(0.02, 10.4, 0.03, 0x24262c, AX, 5.2, z);
  for (const y of [3.4, 6.9]) ch.box(0.04, 0.12, 10, 0x34363c, AX, y, -5.0);
  // emergency exit (steel door, green sign)
  ch.box(0.06, 2.1, 0.92, 0x5a5e66, AX - 0.02, 1.08, -3.1); ch.box(0.07, 2.18, 0.06, 0x2a2c31, AX - 0.02, 1.09, -2.62); ch.box(0.07, 2.18, 0.06, 0x2a2c31, AX - 0.02, 1.09, -3.58); ch.box(0.07, 0.06, 1.0, 0x2a2c31, AX - 0.02, 2.18, -3.1);
  ch.box(0.1, 0.05, 0.5, C.steel, AX - 0.06, 1.0, -3.1); ch.box(0.065, 0.2, 0.86, 0x6a6e74, AX - 0.03, 0.14, -3.1);
  em.box(0.03, 0.16, 0.42, 0x2aff7a, AX - 0.04, 2.42, -3.1); anchor(AX - 0.5, 2.4, -3.1, 0x2aff7a, 0.35, 2.0, ['alley'], 0.3);
  ch.box(0.16, 0.32, 0.22, 0xc23b2b, AX - 0.08, 1.3, -2.25); // extinguisher box
  // exhaust fan + vents
  at(ch, AX, 3.3, -6.4, -Math.PI / 2, () => { ch.box(0.9, 0.9, 0.12, 0x3a3c42, 0, 0, 0.06); ch.cyl(0.38, 0.38, 0.05, 16, 0x1a1b1f, 0, 0, 0.1, Math.PI / 2); for (let i = 0; i < 5; i++) ch.box(0.74, 0.03, 0.03, 0x55595e, 0, -0.3 + i * 0.15, 0.13, 0, 0, 0.35); });
  em.box(0.02, 0.04, 0.04, 0xff2a2a, AX - 0.14, 3.72, -6.0);
  for (const z of [-1.8, -8.6]) at(ch, AX, 2.6, z, -Math.PI / 2, () => { ch.box(0.5, 0.3, 0.06, 0x4a4e56, 0, 0, 0.03); for (let i = 0; i < 5; i++) ch.box(0.44, 0.02, 0.04, 0x2a2c31, 0, -0.1 + i * 0.05, 0.06); });
  // cold tube lamp (flickers)
  ch.box(0.08, 0.06, 1.25, 0x2a2c31, AX - 0.06, 2.95, -7.6); em.box(0.04, 0.035, 1.15, 0xcfefff, AX - 0.1, 2.91, -7.6);
  anchor(AX - 0.6, 2.7, -7.6, 0xbfe6ff, 1.0, 4.2, ['alley'], 0.25);
  // conduit bundle + junction boxes along the arcade wall
  for (let k = 0; k < 3; k++) ch.bar([AX - 0.05 - k * 0.045, 3.6 + k * 0.03, 0.2], [AX - 0.05 - k * 0.045, 3.6 + k * 0.03, -9.9], 0.035, k === 1 ? 0x3a3a30 : 0x2a2c31);
  for (const z of [-2.0, -5.5, -9.0]) ch.box(0.12, 0.26, 0.2, 0x6a6e74, AX - 0.08, 3.6, z);
  // barred upper windows (dark), and the old AC units
  for (const y of [4.6, 8.0]) for (const z of [-2.2, -5.0, -8.6]) wallWin(ch, em, -1, AX, z, y, y + 1.0, 0.9, { bars: true, lit: y === 4.6 && z === -5.0 ? 0x5a3a7a : null, glowI: 0.3 });
  P.acUnit(ch, x1 - 0.3, 3.0, -1.0, -Math.PI / 2); P.acUnit(ch, x1 - 0.3, 6.2, -3.6, -Math.PI / 2); P.acUnit(ch, x1 - 0.3, 6.2, -7.2, -Math.PI / 2);
  P.bracketPipe(ch, x1 - 0.16, 0, 10.5, -0.8, 0.06); P.bracketPipe(ch, x1 - 0.16, 0, 10.5, -9.8, 0.07);
  // roof-access ladder cage high on the arcade wall
  for (let y = 3.0; y < 10.4; y += 0.32) ch.box(0.04, 0.03, 0.46, 0x3a3c42, x1 - 0.28, y, -9.25);
  for (const z of [-9.02, -9.48]) ch.box(0.045, 7.6, 0.045, 0x3a3c42, x1 - 0.28, 6.7, z);
  for (let y = 4.2; y < 10.4; y += 1.1) ch.torus(0.32, 0.02, 10, 0x3a3c42, x1 - 0.4, y, -9.25, Math.PI / 2);

  // ---- the shop's own alley wall (x 2.73): caged bulb over the side door, Chiyo's pots
  at(ch, x0, 2.48, -4.2, Math.PI / 2, () => { ch.box(0.12, 0.08, 0.06, 0x2a2c31, 0, 0, 0.03); ch.box(0.02, 0.02, 0.16, 0x2a2c31, 0, -0.02, 0.1); for (let i = 0; i < 4; i++) ch.box(0.012, 0.16, 0.012, 0x2a2c31, Math.cos(i * 1.57) * 0.06, -0.12, 0.2 + Math.sin(i * 1.57) * 0.06); });
  em.ball(0.04, 0xffd08a, x0 + 0.2, 2.36, -4.2, 1); anchor(x0 + 0.45, 2.3, -4.2, 0xffb468, 1.25, 4.2, ['alley'], 0.3);
  for (const [z, s] of [[-3.55, 0.75], [-4.88, 0.6]]) { ch.cyl(0.17, 0.13, 0.3, 10, 0x8a4a2a, x0 + 0.24, 0.21, z); ch.cyl(0.15, 0.15, 0.02, 10, C.soil, x0 + 0.24, 0.35, z); P.plant(ch, x0 + 0.24, 0.36, z, s, z < -4 ? 1 : 0); }
  solidC(x0 + 0.24, -3.55, 0.36, 0.36, 0, 0.5, 'alley'); solidC(x0 + 0.24, -4.88, 0.36, 0.36, 0, 0.5, 'alley');

  // ---- apartment block behind the shop (Harada-sō), alley face x 2.73, z -8.15 .. -18.5
  const AZ0 = -8.15, AH = 12.6;
  far.box(8.8, AH, 10.3, 0x5c5a58, x0 - 4.4, AH / 2, (AZ0 + zEnd) / 2 - 0.0); // the block itself
  for (let y = 0.0; y < AH; y += 3.1) ch.box(0.06, 0.12, -zEnd + AZ0, 0x46443f, x0 + 0.02, y + 3.0, (AZ0 + zEnd) / 2);
  for (let z = AZ0 - 0.6; z > zEnd; z -= 0.9) ch.box(0.015, AH, 0.02, 0x4e4c48, x0 + 0.01, AH / 2, z); // tile seams
  // snack-bar back door with a pink vertical sign
  ch.box(0.06, 2.08, 0.9, 0x7a2a3a, x0 + 0.02, 1.07, -12.0); ch.box(0.07, 2.16, 1.02, 0x2a2c31, x0 + 0.01, 1.08, -12.0); ch.box(0.08, 0.04, 0.16, C.brass, x0 + 0.06, 1.02, -12.33); ch.box(0.08, 0.3, 0.3, 0xefe4cc, x0 + 0.05, 1.6, -11.7);
  ch.box(0.4, 0.04, 1.1, 0x3a3c42, x0 + 0.2, 2.28, -12.0, 0, 0, -0.12); // tin awning
  ch.box(0.08, 0.08, 0.5, 0x2a2c31, x0 + 0.2, 2.75, -11.25); neon('スナック夜', x0 + 0.42, 2.75, -11.25, 0, 1.25, 'mag', { vertical: true, px: 90, ds: true, thick: 0.12, k: 2.2, lit: 0.8 }, ['alley']);
  // windows on every floor (some lit), a frosted bathroom window, gas meters, laundry pole
  wallWin(ch, em, 1, x0, -14.6, 1.2, 1.9, 0.6, { bars: true, lit: 0xffd8a8, glowI: 0.55 });
  for (const [y, z, lit, cur] of [[3.9, -10.2, 0xffb070, 0x8a3a3a], [3.9, -14.6, null, null], [7.0, -10.2, null, 0x3a5a8a], [7.0, -14.6, 0x9ad8ff, null], [10.1, -10.2, 0xffc890, 0x6a5a3a], [10.1, -14.6, null, null]]) { wallWin(ch, em, 1, x0, z, y, y + 1.3, 1.3, { lit, curtain: cur, glowI: 0.45 }); P.acUnit(ch, x0 + 0.2, y - 0.35, z - 1.15, Math.PI / 2); }
  for (const z of [-9.3, -9.6]) P.meter(ch, x0 + 0.06, 1.5, z, Math.PI / 2);
  ch.bar([x0 + 0.05, 5.9, -9.4], [x0 + 0.05, 5.9, -11.2], 0.03, C.steel); ch.bar([x0 + 0.05, 5.6, -9.4], [x0 + 0.45, 5.9, -9.4], 0.025, C.steel); ch.bar([x0 + 0.05, 5.6, -11.2], [x0 + 0.45, 5.9, -11.2], 0.025, C.steel);
  ch.bar([x0 + 0.45, 5.92, -9.4], [x0 + 0.45, 5.92, -11.2], 0.025, C.steel);
  for (const [z, col, h] of [[-9.6, 0xd8d0c0, 0.55], [-9.95, 0x3a6f8a, 0.42], [-10.3, 0xc8402e, 0.5], [-10.7, 0xe8e4dc, 0.6], [-11.0, 0x2a2c31, 0.38]]) ch.box(0.02, h, 0.3, col, x0 + 0.45, 5.92 - h / 2 - 0.02, z, 0, 0, srange(-0.05, 0.05));
  P.bracketPipe(ch, x0 + 0.12, 0, AH, -8.5, 0.06); P.bracketPipe(ch, x0 + 0.12, 0, AH, -17.9, 0.06);
  // the resident's bicycle, leaning on the wall
  P.bike(ch, x0 + 0.3, 0.06, -10.9, Math.PI / 2, 0x7a8a6a); solid(x0, x0 + 0.5, 0, 1.0, -11.7, -10.1, 'alley');
  // an old washing machine with a stray cat on it
  at(ch, x0 + 0.36, 0.06, -15.9, Math.PI / 2, () => { ch.box(0.6, 0.85, 0.58, 0xd8d6cc, 0, 0.425, 0); ch.cyl(0.19, 0.19, 0.03, 16, 0x4a5058, 0, 0.42, 0.29, Math.PI / 2); ch.cyl(0.14, 0.14, 0.035, 16, 0x1a1c22, 0, 0.42, 0.295, Math.PI / 2); ch.box(0.56, 0.08, 0.04, 0x9a9890, 0, 0.78, 0.28); ch.box(0.62, 0.02, 0.6, 0xc8c6bc, 0, 0.86, 0);
    // cat: loaf pose
    ch.box(0.26, 0.14, 0.17, 0x2a2826, 0, 0.94, 0.02); ch.box(0.12, 0.11, 0.11, 0x2a2826, 0, 1.0, 0.15); ch.cone(0.03, 0.06, 4, 0x2a2826, -0.035, 1.075, 0.15); ch.cone(0.03, 0.06, 4, 0x2a2826, 0.035, 1.075, 0.15); ch.bar([0.12, 0.89, -0.06], [0.2, 0.88, 0.1], 0.03, 0x2a2826); });
  em.box(0.012, 0.014, 0.012, 0xb8ff6a, x0 + 0.36 + 0.21, 1.02, -15.9 + 0.03); em.box(0.012, 0.014, 0.012, 0xb8ff6a, x0 + 0.36 + 0.21, 1.02, -15.9 - 0.03);
  solidC(x0 + 0.36, -15.9, 0.64, 0.64, 0, 1.0, 'alley');

  // ---- izakaya kitchen behind the arcade (x 4.6 .., z -10.1 .. zTurn)
  const IZ0 = -10.1, IH = 8.2;
  far.box(7.4, IH, -zTurn + IZ0, 0x4e4a46, x1 + 3.7, IH / 2, (IZ0 + zTurn) / 2);
  for (let z = IZ0 - 0.5; z > zTurn; z -= 0.75) ch.box(0.02, 3.0, 0.03, 0x3e3a36, x1 - 0.005, 1.5, z); // board-formed concrete
  ch.box(0.05, 0.1, -zTurn + IZ0, 0x2a2826, x1 - 0.02, 3.05, (IZ0 + zTurn) / 2);
  // kitchen door ajar: warm light, short white noren
  ch.box(0.07, 2.12, 0.06, 0x2a2420, x1 - 0.02, 1.06, -12.05); ch.box(0.07, 2.12, 0.06, 0x2a2420, x1 - 0.02, 1.06, -12.95); ch.box(0.07, 0.07, 0.96, 0x2a2420, x1 - 0.02, 2.13, -12.5);
  em.box(0.02, 2.0, 0.84, 0xb06a2a, x1 - 0.012, 1.02, -12.5); ch.box(0.04, 2.02, 0.42, 0x6a5038, x1 - 0.2, 1.02, -12.25, 0, 0.9, 0);
  P.noren(ch, x1 - 0.06, 2.04, -12.5, 0.86, 0.45, 0xe8e4dc, 2, Math.PI / 2);
  anchor(x1 - 0.7, 1.4, -12.5, 0xffa860, 1.4, 4.0, ['alley'], 0.3);
  // exhaust hood + duct to the roof, frosted window with steam
  ch.box(0.5, 0.42, 0.7, 0x8a8e94, x1 - 0.25, 2.75, -13.6); for (let i = 0; i < 5; i++) ch.box(0.02, 0.03, 0.62, 0x4a4e56, x1 - 0.51, 2.6 + i * 0.07, -13.6); ch.box(0.32, IH - 2.9, 0.32, 0x7a7e84, x1 - 0.18, (IH + 2.9) / 2, -13.6);
  wallWin(ch, em, -1, x1, -15.2, 1.15, 2.0, 0.9, { lit: 0xfff0d8, glowI: 0.6 });
  AL.steam.length = 0; AL.steam.push({ p: V3(x1 - 0.55, 2.55, -13.6), n: 5 }, { p: V3(x1 - 0.2, 2.1, -15.2), n: 3 });
  // crates, propane, oil drum, mop: the kitchen's back-door life
  for (const [x, y, z, c] of [[x1 - 0.25, 0.06, -13.15, 0xc8402e], [x1 - 0.25, 0.34, -13.15, 0x2e6fb0], [x1 - 0.25, 0.62, -13.15, 0xe0b53a], [x1 - 0.25, 0.06, -11.7, 0x2e6fb0], [x1 - 0.62, 0.06, -13.15, 0xc8402e]]) P.beerCrate(ch, x, y, z, c);
  for (const z of [-14.25, -14.55]) { ch.cyl(0.13, 0.13, 0.9, 10, 0x8a9298, x1 - 0.2, 0.51, z); ch.ball(0.13, 0x8a9298, x1 - 0.2, 0.96, z, 1, 1, 0.6, 1); ch.box(0.27, 0.06, 0.27, 0xc23b2b, x1 - 0.2, 0.75, z); ch.cyl(0.04, 0.04, 0.08, 6, C.brass, x1 - 0.2, 1.06, z); }
  ch.bar([x1 - 0.06, 0.8, -14.1], [x1 - 0.06, 0.8, -14.7], 0.012, 0x6a6e74);
  ch.cyl(0.29, 0.29, 0.88, 12, 0x3a4a3a, x1 - 0.32, 0.5, -16.4); ch.torus(0.29, 0.015, 14, 0x2a362a, x1 - 0.32, 0.3, -16.4, Math.PI / 2); ch.torus(0.29, 0.015, 14, 0x2a362a, x1 - 0.32, 0.7, -16.4, Math.PI / 2);
  P.bucket(ch, x1 - 0.3, 0.06, -15.7, 0x5a7a9a); P.broom(ch, x1 - 0.1, 0.06, -15.35, -0.25);
  solid(x1 - 0.45, x1, 0, 1.2, -13.35, -11.5, 'alley'); solid(x1 - 0.82, x1, 0, 1.2, -13.35, -12.95, 'alley'); solid(x1 - 0.36, x1, 0, 1.2, -14.75, -14.05, 'alley'); solid(x1 - 0.62, x1, 0, 1.0, -16.7, -15.45, 'alley');
  // upper floor of the izakaya: dark windows with grilles
  for (const z of [-11.4, -15.0]) wallWin(ch, em, -1, x1, z, 4.4, 5.6, 1.1, { bars: true });
  // cardboard stack flattened against the apartment wall
  for (let i = 0; i < 5; i++) ch.box(0.04, 0.9 - i * 0.05, 0.75, i % 2 ? C.cardboard : 0x9a7a4e, x0 + 0.06 + i * 0.035, 0.5, -17.0, 0, 0, -0.1 + i * 0.02);

  // ---- end of the alley: back wall, the gated cross-passage with light around the corner
  far.box(12, 9.0, 0.4, 0x4a4c50, 6.4, 4.5, zEnd - 0.2);
  for (let x = x0 + 0.4; x < 11; x += 1.3) ch.box(0.02, 9.0, 0.03, 0x3a3c40, x, 4.5, zEnd + 0.005);
  for (const [x, col] of [[3.2, 0xd8cfb6], [3.75, 0x3a8a8a], [4.2, 0xc8402e]]) ch.box(0.4, 0.56, 0.01, col, x, 1.6 + srange(-0.1, 0.1), zEnd + 0.01, 0, 0, srange(-0.05, 0.05));
  P.bracketPipe(ch, 3.6, 0, 9, zEnd + 0.12, 0.05); P.meter(ch, 2.95, 1.5, zEnd + 0.06, 0);
  // the passage: the far wall beyond, a lit vending machine and a sodium lamp around the corner
  P.vending(ch, 8.4, 0.06, zEnd + 0.42, 0, 0x2a6ab0, em); anchor(8.4, 1.3, zEnd + 1.2, 0xbfe6ff, 1.2, 3.6, ['alley'], 0.3);
  ch.box(0.06, 0.3, 0.06, 0x2a2c31, 6.8, 2.8, zEnd + 0.15); ch.box(0.4, 0.1, 0.22, 0x2a2c31, 6.8, 2.7, zEnd + 0.3); em.box(0.32, 0.03, 0.16, 0xffb050, 6.8, 2.64, zEnd + 0.3);
  anchor(6.6, 2.4, (zTurn + zEnd) / 2, 0xff9a3a, 2.2, 6.0, ['alley'], 0.3);
  P.bike(ch, 10.2, 0.06, zEnd + 0.4, Math.PI / 2, 0x2f6f8a);
  // chain-link gate across the passage
  for (const z of [zTurn - 0.05, zEnd + 0.05]) ch.box(0.06, 2.1, 0.06, 0x6a6e74, x1 + 0.15, 1.05, z);
  ch.box(0.04, 0.04, zTurn - zEnd, 0x6a6e74, x1 + 0.15, 2.08, (zTurn + zEnd) / 2); ch.box(0.04, 0.04, zTurn - zEnd, 0x6a6e74, x1 + 0.15, 0.12, (zTurn + zEnd) / 2);
  for (let z = zTurn - 0.12; z > zEnd + 0.05; z -= 0.12) { ch.bar([x1 + 0.15, 0.14, z], [x1 + 0.15, 2.06, z - 0.12], 0.008, 0x8a8e94); ch.bar([x1 + 0.15, 0.14, z - 0.12], [x1 + 0.15, 2.06, z], 0.008, 0x8a8e94); }
  ch.box(0.08, 0.1, 0.06, C.brass, x1 + 0.2, 1.1, zTurn - 0.3); ch.box(0.03, 0.24, 0.2, 0xd8b53a, x1 + 0.12, 1.4, (zTurn + zEnd) / 2);
  solid(x1, x1 + 0.25, 0, 2.2, zEnd, zTurn, 'alley');

  // ---- mouth: lantern string, the shrine (moved out of the cart's way), the 雨横丁 sign
  for (let i = 0; i < 6; i++) { const z = -0.6 - i * 1.0, y = 3.25 - Math.sin((i + 0.5) / 6 * Math.PI) * 0.18; P.lantern(ch, xm, y - 0.05, z, 0xd8402e, 0.55); P.lanternGlow(em, xm, y - 0.05, z, 0xff4a2a, 0.55); }
  ch.cable([x0, 3.32, -0.3], [x1, 3.32, -0.3], 0.05, 0.012, 0x15161a, 4); ch.cable([xm, 3.32, -0.3], [xm, 3.3, -6.0], 0.22, 0.012, 0x15161a, 10);
  anchor(xm, 2.9, -1.6, 0xff5a3a, 0.9, 3.4, ['alley'], 0.3); anchor(xm, 2.9, -4.4, 0xff5a3a, 0.8, 3.2, ['alley'], 0.3);
  shrine(ch, em, x1 - 0.32, 0.06, -5.05); solidC(x1 - 0.32, -5.05, 0.6, 0.8, 0, 1.2, 'alley');
  neon('雨横丁', x1 - 0.12, 4.3, -0.4, -Math.PI / 2, 1.9, 'vio', { vertical: true, px: 90 }, ['alley', 'street']);
  // dumpster against the arcade wall, bags beside it
  P.dumpster(ch, x1 - 0.5, 0.06, -9.35, Math.PI / 2); P.trashBag(ch, x1 - 0.35, 0.06, -10.55, 0.9); P.trashBag(ch, x1 - 0.75, 0.06, -10.4, 0.75); P.trashBag(ch, x1 - 0.3, 0.06, -8.25, 0.7);
  solid(x1 - 1.0, x1, 0, 1.2, -10.2, -8.5, 'alley');
  // a dead crane-game cabinet the arcade put out
  at(ch, x1 - 0.34, 0.06, -6.95, -Math.PI / 2, () => { ch.box(0.7, 0.9, 0.62, 0xe8e4dc, 0, 0.45, 0); ch.box(0.7, 0.7, 0.62, 0x2a3a5a, 0, 1.25, 0); ch.box(0.62, 0.62, 0.02, 0x16233a, 0, 1.25, 0.31); ch.box(0.72, 0.16, 0.64, 0xd8402e, 0, 1.68, 0); for (let i = 0; i < 5; i++) ch.ball(0.07, spick([0xffb0c8, 0xfff0a0, 0xa0e0ff, 0xc8ffb0]), -0.2 + i * 0.1, 0.98, srange(-0.15, 0.15), 1); ch.box(0.2, 0.08, 0.1, 0x2a2c31, 0.12, 0.92, 0.33); ch.cyl(0.02, 0.02, 0.1, 6, 0x2a2c31, 0.12, 1.0, 0.33); });
  solidC(x1 - 0.34, -6.95, 0.62, 0.7, 0, 1.8, 'alley');
  // overhead: cable bundles between the walls
  for (let k = 0; k < 12; k++) { const za = srange(-17, -1), zb = za + srange(-1.5, 1.5); ch.cable([x0, srange(4.2, 9.5), za], [x1, srange(4.2, 9.5), zb], srange(0.08, 0.35), srange(0.014, 0.026), 0x15161a, 6); }

  // ---- collision + walkable floor
  zoneFlat(x0 + 0.02, x1 - 0.02, zEnd + 0.1, 0.1, 0.06, 'alley');
  solid(x1, x1 + 0.2, 0, 9, zTurn, 0, 'alley'); solid(x0 - 0.2, x0, 0, 9, zEnd, -8.1, 'alley'); solid(x0, x1, 0, 9, zEnd - 0.3, zEnd, 'alley');
  for (const c of [ch, far]) { const m = c.build(); if (m) CITY.group.add(m); }
  const me = em.build(); if (me) CITY.group.add(me);
  // steam puffs (kitchen hood, window)
  AL.steamS = []; for (const s of AL.steam) for (let i = 0; i < s.n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: 0x8a909c, transparent: true, opacity: 0, depthWrite: false })); sp.position.copy(s.p); scene.add(sp); AL.steamS.push({ sp, s, t: Math.random() * 3 }); }
}
function updateAlley(dt) {
  if (!AL.steamS) return; const near = camera.position.x > 1 && camera.position.x < 13 && camera.position.z < 1;
  for (const q of AL.steamS) { q.sp.visible = near; if (!near) continue; q.t += dt; const life = 3.2, k = (q.t % life) / life; q.sp.position.set(q.s.p.x - k * 0.5, q.s.p.y + k * 1.6, q.s.p.z + Math.sin(q.t * 1.3) * 0.15); const sc = 0.35 + k * 0.9; q.sp.scale.set(sc, sc, 1); q.sp.material.opacity = 0.16 * Math.sin(k * Math.PI); }
}

