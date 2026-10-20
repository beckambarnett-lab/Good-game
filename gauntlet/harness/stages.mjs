// Bridge stages as save states, derived from the game's own data:
//   stage 0       fresh move-in save (no save at all): the BEFORE references
//   stage 1       the Chapter 3 unlock, no bridge upgrades yet
//   stage k (>1)  stage 1 + the first k-1 bridge upgrades (UPG entries with `bridge: n`, in n order)
// The house rides along: each stage installs every non-bridge upgrade up to that stage's chapter,
// and the last stage is chapter 5 with everything installed (the AFTER references).
import { launch, newPage, loadGame, sz } from './lib.mjs';

const CH_FLAGS = { 2: { renoF2: 1 }, 3: { renoOut: 1, popup: 1 }, 4: { renoF3: 1 }, 5: { meet_mako: 1, meet_tomo: 1 } };

export async function probe(browser) {
  const page = await newPage(browser, { w: 320, h: 200 });
  await loadGame(page, { tier: 'low' });
  const data = await sz(page, 'JSON.stringify({ upg: UPG.map(u => ({ id: u.id, ch: u.ch, max: u.max || 1, bridge: u.bridge || 0, space: u.space })), flags: CHEAT_FLAGS })');
  await page.context().close();
  return JSON.parse(data);
}

export function stageList({ upg, flags }) {
  const bridge = upg.filter(u => u.bridge).sort((a, b) => a.bridge - b.bridge);
  const house = upg.filter(u => !u.bridge);
  const saveFor = (ch, bridgeIds) => {
    const f = { ...flags }; for (let c = 2; c <= ch; c++) Object.assign(f, CH_FLAGS[c] || {});
    const up = {}; for (const u of house) if (u.ch <= ch) up[u.id] = u.max; for (const id of bridgeIds) up[id] = 1;
    return { v: 1, ch, beat: `c${ch}_open`, flags: f, up, yen: 100000, leaves: 60, water: 60, roasted: 40, charge: ch >= 5 ? 2 : 0, sign: 'cyan', staff: {}, crates: [], pending: [], last: Date.now() };
  };
  const stages = [{ id: 0, label: 'move-in (BEFORE)', save: null }];
  const n = bridge.length;
  for (let k = 0; k <= n; k++) {
    const ids = bridge.slice(0, k).map(u => u.id);
    const last = k === n;
    const ch = last ? 5 : Math.max(3, ...bridge.slice(0, k).map(u => u.ch));
    stages.push({ id: k + 1, label: k === 0 ? 'Chapter 3 unlock' : `+ ${bridge[k - 1].id}${last ? ' (final, AFTER)' : ''}`, save: saveFor(ch, ids) });
  }
  // not a bridge stage: end of Chapter 2 with the Chapter 3 gate met, for recording the unlock reveal (renovate(2))
  stages.pre3 = { id: 'pre3', label: 'end of Chapter 2 (gate met)', save: { ...saveFor(2, []), yen: 200000, roasted: 60, flags: { ...saveFor(2, []).flags, odaService: 1 } } };
  return stages;
}

if (process.argv[1] && process.argv[1].endsWith('stages.mjs')) {
  const b = await launch(); const st = stageList(await probe(b)); await b.close();
  for (const s of st) console.log(s.id, s.label, s.save ? `ch${s.save.ch} ups=${Object.keys(s.save.up).length}` : '');
}
