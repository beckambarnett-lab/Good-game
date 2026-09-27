// The Gauntlet, part 1: headless sim tests (Node + cannon-es). node tools/sim-test.mjs [filter]
// Every battle is checked for invariants: no NaN, no runaway speed, nobody alive below killY,
// few stuck units, and it ends. Scenario list follows docs/design.md 10.1 (G01-G24).
import { mkdirSync, writeFileSync } from 'node:fs';
import { LEVELS, buildEnemyArmy } from '../src/data/campaign.js';
import { MAPS, deployZone } from '../src/data/maps.js';
import { TUNING as T } from '../src/data/tuning.js';
import { FACTIONS, UNITS, UNIT_LIST } from '../src/data/units.js';
import { makeRng } from '../src/sim/rng.js';
import { equalGold, layout, runBattle } from './simlib.mjs';

const filter = process.argv[2] || '';
const results = [];
const has = (id) => !!UNITS[id];

// Run a battle with invariant tracking. Returns { r, inv, ev }.
function battle(opts) {
  const ev = {};
  const inv = { maxSpeed: 0, belowKill: 0, stuckMax: 0, nan: 0, healOver: 0 };
  const track = new Map();
  const map = MAPS[opts.map || 'meadow'];
  const killY = map.killY ?? T.killY;
  const r = runBattle({
    ...opts,
    onStep(sim, n) {
      for (const e of sim.drainEvents()) ev[e.type] = (ev[e.type] || 0) + 1;
      if (opts.onStep) opts.onStep(sim, n, ev);
      if (n % 30 === 0) {
        for (const u of sim.units) {
          for (const b of u.rag.list) {
            const v = b.velocity.length();
            if (!Number.isFinite(v)) inv.nan++;
            else if (v > inv.maxSpeed) inv.maxSpeed = v;
          }
          if (u.alive && u.p.torso.position.y < killY - 1) inv.belowKill++;
        }
      }
      // stuck: moved < 0.5 m in 8 s while wanting to reach a target, not attacking
      if (n % 480 === 0) {
        let stuck = 0;
        let live = 0;
        for (const u of sim.units) {
          if (!u.alive) continue;
          live++;
          const prev = track.get(u);
          const wants = u.target && u.target.alive && u.target.team !== u.team && !u.atk && Math.hypot(u.target.x - u.x, u.target.z - u.z) > u.def.weapon.range + 2;
          if (prev && wants && Math.hypot(u.x - prev.x, u.z - prev.z) < 0.5) stuck++;
          track.set(u, { x: u.x, z: u.z });
        }
        if (live > 4) inv.stuckMax = Math.max(inv.stuckMax, stuck / live);
      }
    },
  });
  inv.nan += r.nan;
  return { r, inv, ev };
}

function checkInv(name, b, extra = {}) {
  const { r, inv } = b;
  const fails = [];
  if (inv.nan) fails.push(`NaN x${inv.nan}`);
  if (inv.maxSpeed > 60) fails.push(`speed ${inv.maxSpeed.toFixed(0)} m/s`);
  if (inv.belowKill) fails.push('alive below killY');
  if (!r.over && !extra.allowUnfinished) fails.push(`did not end (t=${r.time.toFixed(0)})`);
  if (r.time > T.battleHardCap + 1) fails.push('ran past hard cap');
  if (inv.stuckMax > (extra.stuck ?? 0.1)) fails.push(`stuck ${(inv.stuckMax * 100).toFixed(0)}%`);
  return fails;
}

function test(id, desc, fn) {
  if (filter && !id.includes(filter) && !desc.toLowerCase().includes(filter.toLowerCase())) return;
  const t0 = performance.now();
  let fails = [];
  let info = '';
  try {
    const out = fn();
    fails = out.fails || [];
    info = out.info || '';
  } catch (e) {
    fails = [`threw: ${e.stack || e}`];
  }
  const ms = performance.now() - t0;
  results.push({ id, desc, pass: fails.length === 0, fails, info, secs: ms / 1000 });
  console.log(`${fails.length ? 'FAIL' : 'pass'} ${id} ${desc} (${(ms / 1000).toFixed(1)}s)${info ? ` · ${info}` : ''}${fails.length ? `\n     ${fails.join('\n     ')}` : ''}`);
}

const byRole = (role) => UNIT_LIST.filter((u) => u.role === role);
const nOf = (id, gold) => Math.max(1, Math.floor(gold / UNITS[id].cost));

// ---------------------------------------------------------------- scenarios
test('G01', '1 v 1 Hoe Hand duel ends cleanly', () => {
  const b = battle({ blue: [{ id: 'grow_hoer', n: 1 }], red: [{ id: 'grow_hoer', n: 1 }], seed: 1 });
  return { fails: checkInv('G01', b), info: `winner ${b.r.winner} in ${b.r.time.toFixed(1)}s` };
});

test('G02', '10 v 10 mirrored Hoe Hands, 20 seeds: no side bias', () => {
  let blue = 0;
  const fails = [];
  for (let s = 1; s <= 20; s++) {
    const b = battle({ blue: [{ id: 'grow_hoer', n: 10 }], red: [{ id: 'grow_hoer', n: 10 }], seed: s });
    fails.push(...checkInv('G02', b).map((f) => `seed ${s}: ${f}`));
    if (b.r.winner === 0) blue++;
    else if (b.r.winner === -1) blue += 0.5;
  }
  if (blue < 7 || blue > 13) fails.push(`blue won ${blue}/20 (want 7-13)`);
  return { fails, info: `blue won ${blue}/20` };
});

test('G03', 'every melee unit vs a tank at equal gold lands hits', () => {
  const fails = [];
  const tank = has('briny_anchor') ? 'briny_anchor' : 'grow_bale';
  for (const u of byRole('melee')) {
    const b = battle({ ...equalGold(u.id, tank, 800), seed: 3 });
    fails.push(...checkInv('G03', b).map((f) => `${u.id}: ${f}`));
    if (!b.ev.hit) fails.push(`${u.id}: no hits`);
  }
  return { fails, info: `${byRole('melee').length} units vs ${tank}` };
});

test('G04', 'every ranged unit fires at melee and kites', () => {
  const fails = [];
  for (const u of byRole('ranged')) {
    let kited = false;
    const b = battle({
      ...equalGold(u.id, 'grow_hoer', 700),
      seed: 4,
      onStep(sim) {
        for (const x of sim.alive[0]) if (x.vdx * x.vdx + x.vdz * x.vdz > 0.5 && x.target && x.target.alive && (x.vdz > 0.3)) kited = true;
      },
    });
    fails.push(...checkInv('G04', b).map((f) => `${u.id}: ${f}`));
    if (!b.ev.shoot && !b.ev.beam) fails.push(`${u.id}: never fired`);
    if (u.ai && u.ai.kite && !kited) fails.push(`${u.id}: never kited`);
  }
  return { fails, info: `${byRole('ranged').length} ranged units` };
});

test('G05', 'every cavalry charges into a line of slingers', () => {
  const fails = [];
  for (const u of byRole('cavalry')) {
    let charges = 0;
    const b = battle({
      blue: [{ id: u.id, n: 2 }],
      red: [{ id: 'grow_spud', n: 10 }],
      seed: 5,
      onStep(sim, n, ev) {
        charges = ev.charge || 0;
      },
    });
    fails.push(...checkInv('G05', b).map((f) => `${u.id}: ${f}`));
    if (!charges && u.charge) fails.push(`${u.id}: no charge hits`);
  }
  return { fails, info: `${byRole('cavalry').length} cavalry` };
});

test('G06', 'every siege unit splashes a crowd without hurting itself', () => {
  const fails = [];
  const crowd = has('moss_twig') ? 'moss_twig' : 'grow_hoer';
  const dmgs = [];
  for (const u of byRole('siege')) {
    let selfHits = 0;
    const b = battle({
      blue: [{ id: u.id, n: 2 }],
      red: [{ id: crowd, n: 20 }],
      seed: 6,
      onStep(sim) {
        for (const x of sim.alive[0]) if (x.lastHitBy && x.lastHitBy.team === 0 && x.lastHitBy !== x) selfHits++;
      },
    });
    fails.push(...checkInv('G06', b).map((f) => `${u.id}: ${f}`));
    const dealt = b.r.sim.units.filter((x) => x.team === 0 && x.def.id === u.id).reduce((a, x) => a + x.dmgDealt, 0);
    if (!b.ev.explosion && !b.ev.beam && !b.ev.hit) fails.push(`${u.id}: no impacts`);
    if (dealt < 200) fails.push(`${u.id}: only ${dealt | 0} damage dealt`);
    if (selfHits) fails.push(`${u.id}: friendly damage`);
    dmgs.push(`${u.id.split('_')[1]} ${dealt | 0}`);
  }
  return { fails, info: dmgs.join(', ') };
});

test('G07', 'tanks + healers only: sudden death ends it, heal cap holds', () => {
  const tank = has('noon_shield') ? 'noon_shield' : 'grow_bale';
  const healer = has('mitten_cocoa') ? 'mitten_cocoa' : 'grow_soup';
  let over = 0;
  const b = battle({
    blue: [{ id: tank, n: 4 }, { id: healer, n: 3 }],
    red: [{ id: tank, n: 4 }, { id: healer, n: 3 }],
    seed: 7,
    onStep(sim) {
      for (const u of sim.units) if (u.healBucket < -0.01) over++;
    },
  });
  const fails = checkInv('G07', b);
  if (over) fails.push('heal cap exceeded');
  return { fails, info: `ended at ${b.r.time.toFixed(0)}s${b.r.sudden ? ' (sudden death)' : ''}` };
});

test('G08', 'revive loops are bounded', () => {
  if (!has('wax_remold')) return { fails: [], info: 'skipped (wax_remold missing)' };
  let late = 0;
  let revives = 0;
  const b = battle({
    blue: [{ id: 'wax_remold', n: 10 }, { id: 'grow_hoer', n: 10 }],
    red: [{ id: 'wax_remold', n: 10 }, { id: 'grow_hoer', n: 10 }],
    seed: 8,
    onStep(sim, n, ev) {
      if ((ev.revive || 0) > revives) {
        if (sim.time > T.battleTime) late++;
        revives = ev.revive;
      }
    },
  });
  const fails = checkInv('G08', b);
  if (revives > 60) fails.push(`${revives} revives`);
  if (late) fails.push('revive after sudden death');
  return { fails, info: `${revives} revives` };
});

test('G09', 'every legendary vs equal gold of swarms and of shooters', () => {
  const fails = [];
  const info = [];
  for (const L of byRole('legendary')) {
    for (const foe of ['grow_hoer', has('noon_lens') ? 'noon_lens' : 'grow_spud']) {
      const b = battle({ blue: [{ id: L.id, n: 1 }], red: [{ id: foe, n: nOf(foe, L.cost) }], seed: 9 });
      fails.push(...checkInv('G09', b, { stuck: 0.25 }).map((f) => `${L.id} v ${foe}: ${f}`));
      info.push(`${L.id.split('_')[1]}${b.r.winner === 0 ? '✓' : '✗'}${foe.split('_')[1]}`);
    }
  }
  return { fails, info: info.join(' ') };
});

test('G10', 'gorge melee brawl uses the bridges', () => {
  let reached = new Set();
  let falls = 0;
  const b = battle({
    map: 'gorge',
    blue: [{ id: 'grow_hoer', n: 20 }],
    red: [{ id: 'grow_hoer', n: 20 }],
    seed: 10,
    onStep(sim, n, ev) {
      falls = ev.fall || 0;
      for (const u of sim.units) if (Math.abs(u.z) < 6 && u.y > -1) reached.add(u.id);
    },
  });
  const fails = checkInv('G10', b, { stuck: 0.15 });
  if (reached.size < 40 * 0.7) fails.push(`only ${reached.size}/40 reached a bridge`);
  return { fails, info: `${reached.size}/40 crossed or fought on bridges, ${falls} falls, ${b.r.time.toFixed(0)}s` };
});

test('G11', 'gorge ranged vs ranged across the chasm ends', () => {
  const b = battle({ map: 'gorge', blue: [{ id: 'grow_spud', n: 10 }], red: [{ id: 'grow_spud', n: 10 }], seed: 11 });
  return { fails: checkInv('G11', b), info: `${b.r.time.toFixed(0)}s${b.r.sudden ? ' (sudden)' : ''}` };
});

test('G12', 'caldera: geysers launch, lava cooks, corpses sink', () => {
  const pool = UNIT_LIST.filter((u) => u.role !== 'legendary' && u.role !== 'siege');
  const rng = makeRng(12);
  const pick = () => ({ id: rng.pick(pool).id, n: 1 });
  const blue = Array.from({ length: 30 }, pick);
  const red = Array.from({ length: 30 }, pick);
  let lavaLong = 0;
  const inLava = new Map();
  const b = battle({
    map: 'caldera',
    blue,
    red,
    seed: 12,
    onStep(sim) {
      for (const u of sim.units) {
        if (!u.alive) continue;
        const lava = sim.map.hazards.some((h) => h.type === 'lava' && Math.hypot(u.x - h.x, u.z - h.z) < h.r);
        const t = lava ? (inLava.get(u) || 0) + 1 / 60 : 0;
        inLava.set(u, t);
        if (t > 3) lavaLong++;
      }
    },
  });
  const fails = checkInv('G12', b, { stuck: 0.15 });
  if (!b.ev.geyser) fails.push('no geyser eruptions');
  if (lavaLong) fails.push('a unit survived >3 s in lava');
  return { fails, info: `${b.ev.geyser || 0} eruptions, ${b.ev.launch || 0} launches, ${b.r.time.toFixed(0)}s` };
});

test('G13', 'glazepond cavalry: slides and dunks, no NaN', () => {
  const cav = byRole('cavalry').map((u) => u.id);
  let dunks = 0;
  const fails = [];
  for (let s = 1; s <= 6; s++) {
    const b = battle({ map: 'glaze', blue: cav.slice(0, 4).map((id) => ({ id, n: 2 })), red: cav.slice(-4).map((id) => ({ id, n: 2 })), seed: 130 + s });
    fails.push(...checkInv('G13', b, { stuck: 0.2 }).map((f) => `seed ${s}: ${f}`));
    dunks += b.ev.fall || 0;
  }
  if (!dunks) fails.push('nobody fell through the ice in 6 battles');
  return { fails, info: `${dunks} dunks` };
});

test('G14', 'mesa: units get knocked off the edge', () => {
  const cav = byRole('cavalry').map((u) => u.id);
  let falls = 0;
  const fails = [];
  for (let s = 1; s <= 3; s++) {
    // defenders lined up near the east cliff; attackers come in from the west and shove them out
    const P = [];
    for (let i = 0; i < 12; i++) P.push({ id: 'grow_hoer', team: 1, x: 20 + (i % 2) * 1.5, z: -6 - Math.floor(i / 2) * 2.5 });
    P.push({ id: has('top_bouncer') ? 'top_bouncer' : 'grow_bale', team: 0, x: 4, z: 8 });
    for (let i = 0; i < 4; i++) P.push({ id: cav[(s + i) % cav.length], team: 0, x: -2 + i * 3, z: 12 });
    const b = battle({ map: 'mesa', placements: P, seed: 140 + s });
    fails.push(...checkInv('G14', b, { stuck: 0.25 }).map((f) => `seed ${s}: ${f}`));
    falls += b.ev.fall || 0;
  }
  if (!falls) fails.push('no edge deaths');
  return { fails, info: `${falls} edge deaths` };
});

test('G15', 'hills: ranged on high ground gets bonus range', () => {
  const b = battle({ map: 'hills', blue: [{ id: 'grow_spud', n: 8 }], red: [{ id: 'grow_hoer', n: 10 }], seed: 15 });
  return { fails: checkInv('G15', b), info: `winner ${b.r.winner}, ${b.r.time.toFixed(0)}s` };
});

function autoArmy(gold, rng, pool) {
  const out = [];
  let g = gold;
  for (let k = 0; k < 400 && g > 0; k++) {
    const d = rng.pick(pool);
    if (d.cost <= g) {
      out.push({ id: d.id, n: 1 });
      g -= d.cost;
    }
    if (g < 40) break;
  }
  return out;
}

let stressHash = null;
test('G16', 'stress: 60 v 60 mixed, step cost', () => {
  const pool = UNIT_LIST.filter((u) => u.role !== 'legendary' && u.cost < 250);
  const rng = makeRng(16);
  const pickN = (n) => Array.from({ length: n }, () => ({ id: rng.pick(pool).id, n: 1 }));
  const blue = pickN(60);
  const red = pickN(60);
  const times = [];
  const b = battle({
    blue,
    red,
    seed: 16,
    maxT: 60,
    onStep(sim) {
      times.push(sim.stats.stepMs);
    },
  });
  const sorted = [...times].sort((a, c) => a - c);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const fails = checkInv('G16', b, { allowUnfinished: true, stuck: 0.15 });
  if (b.r.msPerStep > 10) fails.push(`avg step ${b.r.msPerStep.toFixed(2)} ms > 10`);
  stressHash = hashSim(b.r.sim);
  return { fails, info: `avg ${b.r.msPerStep.toFixed(2)} ms/step, max ${b.r.maxStepMs.toFixed(1)} ms, 120 units` };
});

function hashSim(sim) {
  let h = 0;
  for (const u of sim.units) {
    const p = u.p.torso.position;
    h += Math.round(p.x * 100) * 3 + Math.round(p.y * 100) * 5 + Math.round(p.z * 100) * 7 + Math.round(u.hp) * 11;
  }
  return h;
}

test('G17', 'determinism: same seed same result, different seed differs', () => {
  const pool = UNIT_LIST.filter((u) => u.role !== 'legendary' && u.cost < 250);
  const mk = () => {
    const rng = makeRng(16);
    const pickN = (n) => Array.from({ length: n }, () => ({ id: rng.pick(pool).id, n: 1 }));
    return { blue: pickN(20), red: pickN(20) };
  };
  const a = battle({ ...mk(), seed: 17, maxT: 20 });
  const b = battle({ ...mk(), seed: 17, maxT: 20 });
  const c = battle({ ...mk(), seed: 18, maxT: 20 });
  const fails = [];
  if (hashSim(a.r.sim) !== hashSim(b.r.sim)) fails.push('same seed diverged');
  if (hashSim(a.r.sim) === hashSim(c.r.sim)) fails.push('different seed identical');
  return { fails, info: `hash ${hashSim(a.r.sim)}` };
});

test('G18', 'timeout: turtles in opposite corners still end by 120 s', () => {
  const tank = has('noon_shield') ? 'noon_shield' : 'grow_bale';
  const healer = has('mitten_cocoa') ? 'mitten_cocoa' : 'grow_soup';
  const P = [];
  for (let i = 0; i < 2; i++) P.push({ id: tank, team: 0, x: -30 + i * 2, z: 25 }, { id: healer, team: 0, x: -30 + i * 2, z: 23 });
  for (let i = 0; i < 2; i++) P.push({ id: tank, team: 1, x: 30 - i * 2, z: -25 }, { id: healer, team: 1, x: 30 - i * 2, z: -23 });
  const b = battle({ placements: P, seed: 18 });
  const fails = checkInv('G18', b);
  return { fails, info: `ended ${b.r.time.toFixed(0)}s` };
});

test('G19', 'empty red side: blue wins immediately', () => {
  const r = runBattle({ blue: [{ id: 'grow_hoer', n: 1 }], red: [], seed: 19 });
  const fails = [];
  if (r.winner !== 0 || r.time > 0.1) fails.push(`winner ${r.winner} at ${r.time}`);
  return { fails };
});

test('G20', 'every unit stands idle for 10 s: upright, no drift, no NaN', () => {
  const fails = [];
  for (const u of UNIT_LIST) {
    const r = runBattle({
      placements: [{ id: u.id, team: 0, x: 0, z: 12 }],
      seed: 20,
      maxT: 0,
    });
    const sim = r.sim;
    sim.phase = 'build';
    const unit = sim.units[0];
    const x0 = unit.x;
    const z0 = unit.z;
    let maxTilt = 0;
    for (let i = 0; i < 600; i++) {
      sim.step();
      if (i > 120) {
        const q = unit.base.quaternion;
        const upY = 1 - 2 * (q.x * q.x + q.z * q.z);
        maxTilt = Math.max(maxTilt, (Math.acos(Math.max(-1, Math.min(1, upY))) * 180) / Math.PI);
      }
    }
    const drift = Math.hypot(unit.x - x0, unit.z - z0);
    if (!Number.isFinite(unit.y) || sim.nanCount) fails.push(`${u.id}: NaN`);
    if (maxTilt > 25) fails.push(`${u.id}: tilt ${maxTilt.toFixed(0)}°`);
    if (drift > 1) fails.push(`${u.id}: drift ${drift.toFixed(2)} m`);
  }
  return { fails, info: `${UNIT_LIST.length} units` };
});

test('G21', 'Big Bouncy Bertram slams twigs: launches, Δv cap', () => {
  if (!has('top_bouncer')) return { fails: [], info: 'skipped' };
  const crowd = has('moss_twig') ? 'moss_twig' : 'grow_hoer';
  const b = battle({ blue: [{ id: 'top_bouncer', n: 1 }], red: [{ id: crowd, n: 10 }], seed: 21 });
  const fails = checkInv('G21', b);
  if (!b.ev.launch) fails.push('no launches');
  return { fails, info: `${b.ev.launch || 0} launches, max speed ${b.inv.maxSpeed.toFixed(1)}` };
});

test('G22', 'special weapons smoke test', () => {
  const fails = [];
  const info = [];
  const kinds = {};
  for (const u of UNIT_LIST) {
    for (const w of [u.weapon, u.weapon2]) {
      if (!w) continue;
      let k = w.kind;
      if (w.proj && w.proj.roll) k = 'roller';
      if (w.proj && w.proj.boomerang) k = 'boomerang';
      if (w.proj && w.proj.pull) k = 'pull';
      if (w.proj && w.proj.cloud) k = 'cloud';
      if (!kinds[k]) kinds[k] = u.id;
    }
    if (u.passive && u.passive.deathBlast && !kinds.deathBlast) kinds.deathBlast = u.id;
    if (u.passive && u.passive.summon && !kinds.summon) kinds.summon = u.id;
    if (u.passive && u.passive.block && !kinds.block) kinds.block = u.id;
  }
  for (const [k, id] of Object.entries(kinds)) {
    const def = UNITS[id];
    const support = ['heal', 'healPulse', 'healPatch', 'buff', 'revive'].includes(def.weapon.kind);
    let dmg = 0;
    let summonMax = 0;
    const b = battle({
      blue: support ? [{ id, n: 2 }, { id: 'grow_hoer', n: 6 }] : [{ id, n: Math.max(1, Math.min(4, Math.floor(1200 / def.cost))) }],
      red: [{ id: 'grow_hoer', n: 10 }],
      seed: 22,
      onStep(sim) {
        dmg = 0;
        for (const u of sim.units) if (u.team === 0) dmg += u.dmgDealt + u.healDone;
        let s = 0;
        for (const u of sim.alive[0]) if (u.summoned) s++;
        summonMax = Math.max(summonMax, s);
      },
    });
    fails.push(...checkInv('G22', b, { stuck: 0.2 }).map((f) => `${k} (${id}): ${f}`));
    if (dmg <= 0 && k !== 'block') fails.push(`${k} (${id}): no effect`);
    if (k === 'summon' && summonMax > 6) fails.push(`summons ${summonMax} > 6`);
    info.push(k);
  }
  return { fails, info: info.join(', ') };
});

test('G23', 'every campaign level plays out with an auto-built army at par', () => {
  const fails = [];
  const info = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i];
    const map = MAPS[L.map];
    if (L.enemy.some((g) => !has(g.u))) {
      info.push(`${L.id}?`);
      continue;
    }
    const rng = makeRng(230 + i);
    const enemy = buildEnemyArmy(L, UNITS, map, makeRng(1000 + i), deployZone(map, 1));
    const pool = UNIT_LIST.filter((u) => L.factions.includes(u.faction) && (u.role !== 'legendary' || L.legendary));
    const mine = autoArmy(L.par.two, rng, pool);
    const blueP = layout(map, 0, mine, rng);
    const b = battle({ map: L.map, placements: [...blueP, ...enemy.map((e) => ({ ...e, team: 1 }))], seed: 23 + i });
    fails.push(...checkInv('G23', b, { stuck: 0.2 }).map((f) => `${L.id}: ${f}`));
    info.push(`${L.id}${b.r.winner === 0 ? '✓' : '✗'}`);
  }
  return { fails, info: info.join(' ') };
});

test('G24', 'corpse flood: corpses sleep and get cleaned up', () => {
  const b = battle({ blue: [{ id: 'grow_hoer', n: 100 }], red: [{ id: 'grow_hoer', n: 100 }], seed: 24, maxT: 70, allowUnfinished: true });
  const sim = b.r.sim;
  for (let i = 0; i < 300; i++) sim.step();
  const corpses = sim.units.filter((u) => !u.alive);
  // settled = asleep, or already frozen out of the physics world
  const asleep = corpses.filter((u) => u.frozen || u.rag.list.every((x) => x.sleepState === 2)).length;
  const fails = [];
  if (corpses.length > 80) fails.push(`${corpses.length} corpses kept`);
  if (corpses.length && asleep / corpses.length < 0.7) fails.push(`only ${asleep}/${corpses.length} asleep`);
  return { fails, info: `${corpses.length} corpses, ${asleep} asleep, ${b.r.msPerStep.toFixed(2)} ms/step` };
});

// ---------------------------------------------------------------- summary
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed`);
mkdirSync('artifacts/gauntlet', { recursive: true });
writeFileSync('artifacts/gauntlet/sim-tests.json', JSON.stringify(results, null, 1));
process.exit(passed === results.length ? 0 : 1);
