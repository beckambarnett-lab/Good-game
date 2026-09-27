// Headless battle runner shared by tests, balance tournament and the duel tool.
import { MAPS, deployZone } from '../src/data/maps.js';
import { UNITS } from '../src/data/units.js';
import { makeRng } from '../src/sim/rng.js';
import { Sim } from '../src/sim/world.js';

// Lay out `n` units of a def in a block inside a team's deploy zone.
export function layout(map, team, groups, rng) {
  const zone = deployZone(map, team);
  const out = [];
  let row = 0;
  for (const g of groups) {
    const def = UNITS[g.id];
    const sp = def.mount ? 2.4 : Math.max(1.2, 1.1 * (def.scale || 1) * (def.bulk || 1));
    const ranged = def.weapon.range > 8 || def.role === 'support';
    const cols = Math.max(1, Math.min(g.n, Math.floor((zone.x1 - zone.x0 - 4) / sp)));
    for (let i = 0; i < g.n; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols) + row;
      const depth = (ranged ? 10 : 5) + r * sp + (def.scale > 2 ? 4 : 0);
      let x = (c - (cols - 1) / 2) * sp + (g.dx || 0) + (rng ? (rng.next() - 0.5) * 0.3 : 0);
      let z = team === 0 ? zone.z0 + depth : zone.z1 - depth;
      z = Math.max(zone.z0 + 0.5, Math.min(zone.z1 - 0.5, z));
      x = Math.max(zone.x0 + 1, Math.min(zone.x1 - 1, x));
      if (map.noDeploy) for (let k = 0; k < 20 && map.noDeploy(x, z); k++) x += 1.3;
      out.push({ id: g.id, team, x, z });
    }
  }
  return out;
}

export function runBattle({ map = 'meadow', blue, red, seed = 1, maxT = 130, onStep, placements }) {
  const M = MAPS[map];
  const sim = new Sim({ map: M, seed, defs: UNITS });
  sim.eventsEnabled = !!onStep;
  const rng = makeRng(seed * 7 + 3);
  const P = placements || [...layout(M, 0, blue, rng), ...layout(M, 1, red, rng)];
  for (const p of P) sim.addUnit(UNITS[p.id], p.team, p.x, p.z);
  sim.start();
  const t0 = performance.now();
  let steps = 0;
  let maxStepMs = 0;
  while (sim.phase === 'battle' && sim.time < maxT) {
    const s0 = performance.now();
    sim.step();
    const ms = performance.now() - s0;
    if (ms > maxStepMs) maxStepMs = ms;
    steps++;
    if (onStep && onStep(sim, steps) === false) break;
    if (sim.events.length > 4000) sim.events.length = 0;
  }
  return {
    sim,
    winner: sim.winner,
    time: sim.time,
    over: sim.phase === 'over',
    alive: [sim.alive[0].length, sim.alive[1].length],
    value: [sim.teamValue(0), sim.teamValue(1)],
    msPerStep: (performance.now() - t0) / Math.max(1, steps),
    maxStepMs,
    nan: sim.nanCount || 0,
    sudden: sim.sudden,
  };
}

// Equal-gold matchup: as many of each as fit in `gold` (at least one).
export function equalGold(a, b, gold) {
  const na = Math.max(1, Math.min(80, Math.floor(gold / UNITS[a].cost)));
  const nb = Math.max(1, Math.min(80, Math.floor(gold / UNITS[b].cost)));
  return { blue: [{ id: a, n: na }], red: [{ id: b, n: nb }] };
}
