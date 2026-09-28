// node tools/duel.mjs <unitA> <unitB> [gold=600] [seeds=4] [map=meadow]
// Equal-gold fights with sides swapped each seed. Prints A's win rate and battle stats.
import { UNITS } from '../src/data/units.js';
import { equalGold, runBattle } from './simlib.mjs';
const [a, b, gold = 600, seeds = 4, map = 'meadow'] = process.argv.slice(2);
if (!UNITS[a] || !UNITS[b]) { console.log('unknown unit', !UNITS[a] ? a : b); process.exit(1); }
let wins = 0, n = 0;
for (let s = 1; s <= Number(seeds); s++) {
  for (const swap of [false, true]) {
    const m = equalGold(a, b, Number(gold));
    const r = runBattle({ map, blue: swap ? m.red : m.blue, red: swap ? m.blue : m.red, seed: s });
    const aWon = swap ? r.winner === 1 : r.winner === 0;
    if (aWon) wins++;
    else if (r.winner === -1) wins += 0.5;
    n++;
    console.log(`seed ${s}${swap ? ' swapped' : ''}: ${aWon ? a : r.winner === -1 ? 'draw' : b} wins in ${r.time.toFixed(1)}s, left ${swap ? r.alive[1] + ' vs ' + r.alive[0] : r.alive[0] + ' vs ' + r.alive[1]}${r.sudden ? ' (sudden death)' : ''}, ${r.msPerStep.toFixed(2)} ms/step${r.nan ? ' NaN!' : ''}`);
  }
}
console.log(`${a} win rate vs ${b} at ${gold} gold: ${((wins / n) * 100).toFixed(0)}%`);
