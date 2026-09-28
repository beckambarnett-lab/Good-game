// Headless possession check: every unit, driven by a scripted "player", must deal damage (or heal) and stay finite.
import { UNIT_LIST } from '../src/data/units.js';
import { newControl } from '../src/sim/possess.js';
import { runBattle } from './simlib.mjs';

export function drive(sim, u, t) {
  const c = u.ctrl;
  let e = null;
  let bd = Infinity;
  for (const o of sim.alive[1 - u.team]) {
    const d = Math.hypot(o.x - u.x, o.z - u.z);
    if (d < bd) {
      bd = d;
      e = o;
    }
  }
  if (!e) {
    c.fire = c.fire2 = false;
    c.mx = c.mz = 0;
    return;
  }
  const yaw = Math.atan2(e.x - u.x, e.z - u.z);
  c.yaw = yaw;
  const tp = e.p.torso.position;
  c.ox = u.x - Math.sin(yaw) * 4;
  c.oy = u.pos.y + 1.5;
  c.oz = u.z - Math.cos(yaw) * 4;
  const L = Math.hypot(tp.x - c.ox, tp.y - c.oy, tp.z - c.oz);
  c.dx = (tp.x - c.ox) / L;
  c.dy = (tp.y - c.oy) / L;
  c.dz = (tp.z - c.oz) / L;
  c.gx = tp.x;
  c.gy = 0;
  c.gz = tp.z;
  const w = u.def.weapon;
  const want = Math.max(1, Math.min(w.range, 14) * 0.7);
  const go = bd - e.radius > want ? 1 : 0;
  c.mx = Math.sin(yaw) * go;
  c.mz = Math.cos(yaw) * go;
  c.fire = true;
  c.fire2 = true;
  c.jump = t % 7 < 0.05;
}

const only = process.argv[2];
let fails = 0;
for (const def of UNIT_LIST) {
  if (only && !def.id.includes(only)) continue;
  const support = ['heal', 'healPulse', 'healPatch', 'buff', 'revive'].includes(def.weapon.kind);
  let me = null;
  let bad = false;
  const blue = [{ id: def.id, n: 1 }];
  if (support) blue.push({ id: 'grow_hoer', n: 4 });
  const r = runBattle({
    blue,
    red: [{ id: 'grow_hoer', n: support ? 4 : 3 }],
    seed: 3,
    maxT: 30,
    onStep(sim) {
      if (!me) {
        me = sim.units.find((x) => x.def.id === def.id && x.team === 0);
        me.ctrl = newControl();
      }
      if (me.alive) drive(sim, me, sim.time);
      for (const b of me.rag.list) if (!Number.isFinite(b.position.x) || b.velocity.length() > 80) bad = true;
    },
  });
  const out = me.dmgDealt + me.healDone + (me.revives || 0) * 100;
  const buffs = def.weapon.kind === 'buff' || def.weapon.kind === 'healPulse' || def.weapon.kind === 'healPatch';
  const ok = !bad && (out > 0 || buffs);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${def.id.padEnd(16)} ${def.weapon.kind.padEnd(10)} dealt ${Math.round(me.dmgDealt)} healed ${Math.round(me.healDone)} ${me.alive ? 'alive' : 'died'} t=${r.time.toFixed(1)}${bad ? ' UNSTABLE' : ''}`);
}
console.log(fails ? `${fails} failed` : 'all ok');
process.exit(fails ? 1 : 0);
