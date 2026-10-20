// Gameplay regression checks for the bridge (run after every build): node check.mjs
// - every stage's save loads with no page errors
// - from the Chapter 3 unlock, installing each bridge upgrade in order (the real applyUpgrade path) throws nothing, and a second
//   rebuild leaves anchor / collision / sign counts unchanged (rebuilds are idempotent)
// - the deck is walkable end to end at every stage; the shop end is closed before Chapter 3 and open after
// - terrace seats exist from the unlock on; the far stairs ramp is walkable
// - a mid-chapter-2 save (no bridge state at all) lands on stage 0
import { launch, newPage, loadGame, sz } from './lib.mjs';
import { probe, stageList } from './stages.mjs';

const fails = [];
const ok = (c, msg) => { if (!c) fails.push(msg); console.log((c ? '  ok   ' : '  FAIL ') + msg); };
const browser = await launch();
const all = stageList(await probe(browser));

async function open(save) { const p = await newPage(browser, { w: 480, h: 270 }); await loadGame(p, { save, tier: 'low' }); return p; }
const walk = `(() => { const pts = []; for (let z = 1.3; z < 13.7; z += 0.4) pts.push(supportAt(-5.2, z, 3.6)); return pts.every(h => h !== null && Math.abs(h - 3.6) < 0.05); })()`;
const counts = `JSON.stringify({ a: ANCHORS.length, wz: WZ.length, sol: SOL.length, signs: CITY.signs.length })`;

for (const st of [all[0], all[1], all[all.length - 1]]) {
  console.log(`stage ${st.id} (${st.label})`);
  const p = await open(st.save);
  ok(await sz(p, `bridgeStage() === ${st.id}`), `stage ${st.id}: bridgeStage() is ${await sz(p, 'bridgeStage()')}`);
  ok(await sz(p, walk), `stage ${st.id}: deck walkable z 1.3..13.7`);
  ok(await sz(p, `(() => { const h = supportAt(-1.0, 13.27, 2.0); return h !== null && h > 0.5 && h < 3.2; })()`), `stage ${st.id}: far stairs walkable`);
  const shopEndClosed = await sz(p, `!!blockedAt(-5.2, 0.95, 3.6, 0.2) && !!blockedAt(-4.6, 0.95, 3.6, 0.2)`);
  ok(st.id === 0 ? shopEndClosed : !shopEndClosed, `stage ${st.id}: shop end ${st.id === 0 ? 'closed' : 'open'}`);
  if (st.id > 0) ok(await sz(p, `SEATS.filter(s => s.sp === 'terrace').length >= 6`), `stage ${st.id}: terrace seats (${await sz(p, "SEATS.filter(s => s.sp === 'terrace').length")})`);
  ok(!p.errors.length, `stage ${st.id}: no page errors ${p.errors.join(' | ')}`);
  await p.context().close();
}

console.log('installing every bridge upgrade from the unlock');
{
  const p = await open(all[1].save);
  const ids = JSON.parse(await sz(p, 'JSON.stringify(UPG.filter(u => u.bridge).sort((a, b) => a.bridge - b.bridge).map(u => u.id))'));
  for (const id of ids) {
    const r = await sz(p, `(() => { try { S.ch = Math.max(S.ch, UID['${id}'].ch); S.up['${id}'] = 1; applyUpgrade('${id}'); return 'ok'; } catch (e) { return e.message; } })()`);
    ok(r === 'ok', `apply ${id}: ${r}`);
  }
  const c1 = await sz(p, counts); await sz(p, 'rebuildBridge(); buildFacade(); 0'); const c2 = await sz(p, counts);
  ok(c1 === c2, `rebuild is idempotent ${c1} vs ${c2}`);
  ok(await sz(p, walk), 'all upgrades: deck walkable');
  ok(await sz(p, `bridgeStage() === ${all.length - 1}`), `all upgrades: bridgeStage() ${await sz(p, 'bridgeStage()')}`);
  ok(!p.errors.length, `no page errors ${p.errors.join(' | ')}`);
  await p.context().close();
}

console.log('old save: chapter 2 in progress');
{
  const sv = { ...all[1].save, ch: 2, beat: 'c2_open', up: {} }; delete sv.flags.renoOut; delete sv.flags.popup;
  const p = await open(sv);
  ok(await sz(p, 'bridgeStage() === 0'), 'chapter 2 save lands on stage 0');
  ok(!p.errors.length, `no page errors ${p.errors.join(' | ')}`);
  await p.context().close();
}
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
