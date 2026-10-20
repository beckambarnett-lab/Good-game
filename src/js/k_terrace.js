/* ================= 雫テラス: the footbridge's stages (gauntlet/BRIDGE_UPGRADE_MAP.md) ================= */
// Stage 0 until the Chapter 3 unlock, stage 1 at the unlock, then one more per bridge upgrade (UPG entries with `bridge: n`).
// buildBridge() (e_building.js) draws the structure for stage 0 / stage 1+; buildTerrace() (k_ch3.js) the opened deck, tables
// and the older heaters / strings; each later upgrade draws its own pieces here, in its own function, into the 'terraceFx' part.
function bridgeOpen() { return S.ch >= 3; }
function bup(id) { return S.ch >= 3 && lv(id) > 0; }
function bridgeStage() { return S.ch < 3 ? 0 : 1 + UPG.filter(u => u.bridge && lv(u.id)).length; }
function rebuildBridge() { buildBridge(); buildTerrace(); buildTerraceFx(); rebakeStreet(); refreshSeats(); }

// one function per upgrade: (ch, em, g) are the solid chunk, the emissive chunk and the part group; collision uses the upgrade id as its tag
const TERRACE_FX = {
  tstreet(ch, em, g) { },
  tstairs(ch, em, g) { },
  tlanterns(ch, em, g) { },
  tplanters(ch, em, g) { },
  tunder(ch, em, g) { },
  tneon(ch, em, g) { },
  tcanopy(ch, em, g) { },
  tbamboo(ch, em, g) { },
  twisteria(ch, em, g) { },
};
function buildTerraceFx() {
  reseed(3203); clearAnchors('terraceFx'); for (const id in TERRACE_FX) clearTag(id); const g = part('terraceFx'); if (!bridgeOpen()) return;
  const a0 = ANCHORS.length, ch = new Chunk('terraceFx', 'street'), em = new Chunk('terraceFxEm', 'street', { emis: true });
  for (const id in TERRACE_FX) if (bup(id)) TERRACE_FX[id](ch, em, g);
  addBuilt(g, ch); addBuilt(g, em);
  for (let i = a0; i < ANCHORS.length; i++) ANCHORS[i].tag = ANCHORS[i].tag || 'terraceFx';
}
HOOK.upper.push(buildTerraceFx);
HOOK.apply.push(id => { if (UID[id] && UID[id].bridge) rebuildBridge(); });
// where each bridge upgrade is installed (the crate's ghost and the install camera)
HOOK.upos.push(id => {
  const out = (spot, stand, size, axis) => ({ spot, cam: { pos: stand.clone().add(Vv(0, 1.55, 0)), at: spot }, size, axis });
  return ({
    tstreet: out(Vv(1.4, 0.4, 12.4), Vv(2.4, 0.12, 11.9), [1.2, 0.8, 0.6]),
    tstairs: out(Vv(-1.2, 1.9, 13.27), Vv(2.2, 0.12, 12.4), [3.0, 0.3, 1.2], Vv(1, 0, 0)),
    tlanterns: out(Vv(-6.3, F2 + 1.3, 6.0), Vv(-5.2, F2, 6.0), [0.3, 0.5, 3.0]),
    tplanters: out(Vv(-4.1, F2 + 1.15, 8.0), Vv(-5.2, F2, 8.0), [0.35, 0.4, 3.0]),
    tunder: out(Vv(-5.2, F2 - 0.6, 7.0), Vv(-2.6, 0, 7.0), [2.2, 0.1, 4.0]),
    tneon: out(Vv(-3.95, F2 - 0.1, 9.5), Vv(-1.6, 0, 9.5), [0.1, 0.8, 1.4], Vv(0, 1, 0)),
    tcanopy: out(Vv(-5.2, F2 + 2.45, 7.0), Vv(-5.2, F2, 5.4), [2.4, 0.1, 3.0]),
    tbamboo: out(Vv(-6.3, F2 + 1.0, 2.0), Vv(-5.2, F2, 2.8), [0.4, 1.8, 1.0]),
    twisteria: out(Vv(-4.0, F2 + 0.6, 6.0), Vv(-5.0, F2, 6.0), [0.3, 1.2, 3.0]),
  })[id] || null;
});
