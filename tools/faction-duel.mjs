// node tools/faction-duel.mjs [gold multiplier] : whole-faction armies (one of each non-legendary unit,
// repeated) fight at equal gold, both sides, 2 seeds. Checks rank progression stays sensible.
import { FACTIONS, UNITS } from '../src/data/units.js';
import { runBattle } from './simlib.mjs';
const pairs = [['grow', 'top'], ['top', 'briny'], ['briny', 'cog'], ['cog', 'moss'], ['moss', 'mitten'], ['mitten', 'noon'], ['noon', 'wax'], ['grow', 'moss'], ['briny', 'wax']];
function army(fid, gold) {
  const f = FACTIONS.find((x) => x.id === fid);
  const roster = f.units.filter((u) => u.role !== 'legendary');
  const out = [];
  let g = gold;
  for (let k = 0; k < 400; k++) {
    const u = roster[k % roster.length];
    if (u.cost > g) break;
    out.push({ id: u.id, n: 1 });
    g -= u.cost;
  }
  return out;
}
for (const [a, b] of pairs) {
  const unitA = FACTIONS.find((x) => x.id === a).units.filter((u) => u.role !== 'legendary');
  const unitB = FACTIONS.find((x) => x.id === b).units.filter((u) => u.role !== 'legendary');
  const avg = [...unitA, ...unitB].reduce((s, u) => s + u.cost, 0) / (unitA.length + unitB.length);
  const G = Math.round(avg * 18);
  let w = 0;
  let n = 0;
  for (const seed of [1, 2]) for (const swap of [false, true]) {
    const A = army(a, G);
    const B = army(b, G);
    const r = runBattle({ blue: swap ? B : A, red: swap ? A : B, seed });
    const aw = swap ? r.winner === 1 : r.winner === 0;
    w += aw ? 1 : r.winner === -1 ? 0.5 : 0;
    n++;
  }
  console.log(`${a} vs ${b} at ${G} gold: ${a} wins ${((w / n) * 100).toFixed(0)}%`);
}
