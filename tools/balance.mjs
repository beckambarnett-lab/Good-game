// The Gauntlet, part 2: equal-gold balance tournament. node tools/balance.mjs [seeds=2] [unitFilter]
// Every unit fights 6 reference armies at (near) equal gold, both sides, several seeds.
// Supports are measured by their marginal value: (escort + unit) vs (escort + reference).
// A unit's score is its average win rate over the references; the required band is 20-80%.
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

if (!isMainThread) {
  const { runBattle } = await import('./simlib.mjs');
  parentPort.on('message', (job) => {
    if (!job) return process.exit(0);
    const r = runBattle({ map: job.map || 'meadow', blue: job.blue, red: job.red, seed: job.seed, maxT: 125 });
    parentPort.postMessage({ key: job.key, swap: job.swap, winner: r.winner, time: r.time, value: r.value, ms: r.msPerStep });
  });
} else {
  const { UNITS, UNIT_LIST } = await import('../src/data/units.js');
  const seeds = Number(process.argv[2] || 2);
  const filter = process.argv[3] || '';
  const REFS = [
    { id: 'ref_melee', label: 'Hoe Hands', groups: [['grow_hoer', 1]] },
    { id: 'ref_ranged', label: 'Snowball Pelters', groups: [['mitten_pelter', 1]] },
    { id: 'ref_tank', label: 'Anchor Haulers', groups: [['briny_anchor', 1]] },
    { id: 'ref_cav', label: 'Thistle Stags', groups: [['moss_stag', 1]] },
    { id: 'ref_siege', label: 'Barrel Mortars + Hoe Hands', groups: [['briny_barrel', 0.5], ['grow_hoer', 0.5]] },
    { id: 'ref_support', label: 'Oilcans + Hoe Hands', groups: [['cog_oilcan', 0.25], ['grow_hoer', 0.75]] },
  ].filter((r) => r.groups.every(([id]) => UNITS[id]));

  // Pick an army budget in [1000, 1600] that wastes the least gold for this unit.
  const budgetFor = (cost) => {
    if (cost >= 1000) return cost;
    let best = 1200;
    let bw = 1;
    for (let G = 1000; G <= 1600; G += 10) {
      const waste = (G - Math.floor(G / cost) * cost) / G;
      if (waste < bw - 1e-9) {
        bw = waste;
        best = G;
      }
    }
    return best;
  };
  const army = (groups, G) =>
    groups.map(([id, frac]) => ({ id, n: Math.max(1, Math.round((G * frac) / UNITS[id].cost)) })).filter((g) => g.n > 0);

  const jobs = [];
  const units = UNIT_LIST.filter((u) => !filter || u.id.includes(filter) || u.faction === filter);
  for (const u of units) {
    const G = budgetFor(u.cost);
    const support = u.role === 'support';
    for (const ref of REFS) {
      let mine = [{ id: u.id, n: Math.max(1, Math.floor(G / u.cost)) }];
      let theirs = army(ref.groups, G);
      if (support) {
        // marginal value: both sides get the same Hoe Hand escort
        const esc = { id: 'grow_hoer', n: Math.round((G * 0.6) / UNITS.grow_hoer.cost) };
        mine = [esc, { id: u.id, n: Math.max(1, Math.floor((G * 0.4) / u.cost)) }];
        theirs = [esc, ...army(ref.groups, G * 0.4)];
      }
      for (let s = 1; s <= seeds; s++) {
        const key = `${u.id}|${ref.id}`;
        jobs.push({ key, swap: false, blue: mine, red: theirs, seed: s * 101 + jobs.length });
        jobs.push({ key, swap: true, blue: theirs, red: mine, seed: s * 101 + jobs.length });
      }
    }
  }
  // Legendaries also fight each other.
  const legends = units.filter((u) => u.role === 'legendary');
  for (const a of legends)
    for (const b of UNIT_LIST.filter((x) => x.role === 'legendary' && x !== a)) {
      const G = Math.max(a.cost, b.cost);
      const key = `${a.id}|${b.id}`;
      for (let s = 1; s <= seeds; s++) {
        jobs.push({ key, swap: false, blue: [{ id: a.id, n: 1 }], red: [{ id: b.id, n: 1 }], seed: s * 131 });
        jobs.push({ key, swap: true, blue: [{ id: b.id, n: 1 }], red: [{ id: a.id, n: 1 }], seed: s * 131 });
      }
      void G;
    }

  const nW = Math.max(1, Math.min(cpus().length, Number(process.env.WORKERS || cpus().length)));
  console.log(`${jobs.length} battles on ${nW} workers, ${seeds} seed(s) x 2 sides`);
  const res = new Map();
  let done = 0;
  const t0 = Date.now();
  await new Promise((resolve) => {
    let next = 0;
    let alive = nW;
    for (let i = 0; i < nW; i++) {
      const w = new Worker(new URL(import.meta.url), { workerData: {} });
      const feed = () => {
        if (next < jobs.length) w.postMessage(jobs[next++]);
        else {
          w.postMessage(null);
          if (--alive === 0) resolve();
        }
      };
      w.on('message', (m) => {
        const k = res.get(m.key) || { games: 0, wins: 0, time: 0 };
        k.games++;
        const aWon = m.swap ? m.winner === 1 : m.winner === 0;
        if (aWon) k.wins++;
        else if (m.winner === -1) k.wins += 0.5;
        k.time += m.time;
        res.set(m.key, k);
        done++;
        if (done % 50 === 0) process.stdout.write(`\r${done}/${jobs.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
        feed();
      });
      w.on('error', (e) => {
        console.error(e);
        feed();
      });
      feed();
    }
  });
  console.log('');

  // Summaries
  const rows = [];
  const csv = ['unit,opponent,games,winrate,avgTime'];
  for (const [key, k] of res) {
    const [u, o] = key.split('|');
    csv.push(`${u},${o},${k.games},${(k.wins / k.games).toFixed(3)},${(k.time / k.games).toFixed(1)}`);
  }
  for (const u of units) {
    const per = REFS.map((r) => res.get(`${u.id}|${r.id}`)).filter(Boolean);
    let wr = per.reduce((a, k) => a + k.wins / k.games, 0) / Math.max(1, per.length);
    if (u.role === 'legendary') {
      const lp = [...res.entries()].filter(([k]) => k.startsWith(`${u.id}|`) && !k.includes('|ref_')).map(([, k]) => k.wins / k.games);
      const lw = lp.length ? lp.reduce((a, b) => a + b, 0) / lp.length : null;
      rows.push({ id: u.id, role: u.role, cost: u.cost, wr, legendWr: lw, per: per.map((k) => k.wins / k.games) });
    } else rows.push({ id: u.id, role: u.role, cost: u.cost, wr, per: per.map((k) => k.wins / k.games) });
  }
  rows.sort((a, b) => b.wr - a.wr);
  const out = rows.map((r) => {
    const flag = r.wr > 0.8 ? 'HIGH' : r.wr < 0.2 ? 'LOW' : '';
    return `${flag.padEnd(4)} ${r.id.padEnd(16)} ${r.role.padEnd(9)} ${String(r.cost).padStart(5)}g  ${(r.wr * 100).toFixed(0).padStart(3)}%  [${r.per.map((x) => (x * 100).toFixed(0).padStart(3)).join(' ')}]${r.legendWr != null ? `  vs legends ${(r.legendWr * 100).toFixed(0)}%` : ''}`;
  });
  console.log(`refs: ${REFS.map((r) => r.label).join(' | ')}`);
  console.log(out.join('\n'));
  const outBand = rows.filter((r) => r.wr > 0.8 || r.wr < 0.2);
  console.log(`\n${outBand.length} unit(s) outside the 20-80% band. ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  mkdirSync('artifacts/gauntlet', { recursive: true });
  writeFileSync('artifacts/gauntlet/balance.csv', csv.join('\n'));
  writeFileSync('artifacts/gauntlet/balance.json', JSON.stringify({ refs: REFS.map((r) => r.label), rows, seeds }, null, 1));
  process.exit(0);
}
