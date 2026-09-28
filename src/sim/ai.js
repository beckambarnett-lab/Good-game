import { TUNING as T } from '../data/tuning.js';
import { canRevive, gap, isSupportKind, reach } from './combat.js';
import { possessThink } from './possess.js';

// Unit brains: target selection, movement (bridge routing, hazard and edge avoidance), kiting for
// ranged units (time-limited), healers seeking hurt allies, remolders seeking fresh corpses.

export function think(sim, u, dt) {
  if (!u.alive) return;
  if (u.ctrl) return possessThink(sim, u, dt);
  const w = u.def.weapon;
  const ai = u.def.ai || {};
  const support = isSupportKind(w.kind) && !sim.sudden;
  u.retargetT -= dt;
  if (u.kiteCool > 0) u.kiteCool -= dt;
  const stale = !u.target || (w.kind === 'revive' ? !canRevive(u, u.target) && !(u.target.alive && u.target.team !== u.team) : !u.target.alive);
  if (u.retargetT <= 0 || stale) {
    u.retargetT = T.retargetInterval * (0.8 + sim.rng.next() * 0.4);
    const prev = u.target;
    if (support) u.target = pickSupportTarget(sim, u, w, ai);
    else u.target = pickTarget(sim, u, ai.priority);
    u.enemy = nearestEnemy(sim, u, 999);
    if (u.target !== prev && u.atk && u.atk.phase === 0) u.atk = null;
  }

  const bp = u.base.position;
  let tx = bp.x;
  let tz = bp.z;
  let want = 0; // 1 approach, -1 retreat, 0 hold
  let faceX = 0;
  let faceZ = 0;
  const t = u.target;
  const enemy = u.enemy && u.enemy.alive ? u.enemy : null;
  const attacking = !!u.atk;

  if (t && (t.alive || w.kind === 'revive')) {
    const friendly = t.team === u.team;
    const g = friendly ? Math.hypot(t.x - bp.x, t.z - bp.z) - t.radius : gap(u, t);
    const rng = friendly ? w.range : reach(u, w, t);
    const pref = Math.min(ai.range ?? rng * 0.85, rng * 0.95);
    tx = t.x;
    tz = t.z;
    faceX = tx - bp.x;
    faceZ = tz - bp.z;
    if (friendly) {
      if (g > pref) want = 1;
      // keep out of melee: back off when an enemy gets close
      if (enemy && w.kind !== 'revive') {
        const ed = gap(u, enemy);
        if (ed < (ai.flee ?? 3.5) && u.kiteCool <= 0) {
          want = -1;
          tx = enemy.x;
          tz = enemy.z;
          faceX = tx - bp.x;
          faceZ = tz - bp.z;
        }
      }
    } else if (g > pref) want = 1;
    else if (ai.kite && !sim.sudden && g < pref * (ai.kiteFrac ?? 0.55) && u.kiteCool <= 0) want = -1;
    else if (w.minRange && g < w.minRange && u.kiteCool <= 0) want = -1;
  } else if (enemy) {
    tx = enemy.x;
    tz = enemy.z;
    faceX = tx - bp.x;
    faceZ = tz - bp.z;
    want = gap(u, enemy) > 10 ? 1 : 0;
  }

  // Kiting is limited: 2 s of backing off, then 3 s where the unit must stand and shoot.
  if (want < 0) {
    u.kiteT += dt;
    if (u.kiteT > 2) {
      u.kiteT = 0;
      u.kiteCool = 3;
      want = 0;
    }
  } else u.kiteT = Math.max(0, u.kiteT - dt);

  let dx = 0;
  let dz = 0;
  if (want !== 0) {
    let gx = tx;
    let gz = tz;
    if (want > 0 && sim.map.nav) {
      const wp = routeVia(sim, u, tx, tz);
      if (wp) {
        gx = wp.x;
        gz = wp.z;
      }
    }
    dx = gx - bp.x;
    dz = gz - bp.z;
    const L = Math.hypot(dx, dz) || 1;
    dx = (dx / L) * want;
    dz = (dz / L) * want;
    if (want < 0) {
      const home = u.team === 0 ? 1 : -1;
      dz += home * 0.35;
    }
  }

  // Separation from nearby units.
  let sx = 0;
  let sz = 0;
  const near = sim.grid.query(bp.x, bp.z, 3 + u.radius);
  for (let i = 0; i < near.length; i++) {
    const o = near[i];
    if (o === u || !o.alive) continue;
    const ox = bp.x - o.x;
    const oz = bp.z - o.z;
    const d = Math.hypot(ox, oz);
    const min = (u.radius + o.radius) * T.separation + 0.25;
    if (d < min && d > 0.001) {
      const f = (min - d) / min;
      const k = o.team === u.team ? 1.3 : 0.5;
      sx += (ox / d) * f * k;
      sz += (oz / d) * f * k;
    }
  }
  dx += sx;
  dz += sz;

  // Hazard avoidance: probe ahead for lava, active geysers, holes and ledges.
  if (dx || dz) {
    const L = Math.hypot(dx, dz) || 1;
    const avoid = sim.map.avoid;
    if (avoid) {
      const px = bp.x + (dx / L) * 2.5;
      const pz = bp.z + (dz / L) * 2.5;
      for (const hz of avoid) {
        if (hz.active && !hz.active(sim)) continue;
        const hx = px - hz.x;
        const hzz = pz - hz.z;
        const r = hz.r + u.radius + (hz.pad ?? 1);
        if (hx * hx + hzz * hzz < r * r) {
          const cx = bp.x - hz.x;
          const cz = bp.z - hz.z;
          const cl = Math.hypot(cx, cz) || 1;
          const side = (dx / L) * cz - (dz / L) * cx > 0 ? 1 : -1;
          const ndx = (-dz / L) * side * 1.4 + (cx / cl) * 0.6;
          const ndz = (dx / L) * side * 1.4 + (cz / cl) * 0.6;
          dx += ndx;
          dz += ndz;
        }
      }
    }
    if (sim.map.ledges) {
      // edge avoidance: sample ahead at 2 m and 4 m; steer back if the ground drops away
      const gy = sim.ground.surfaceAt(bp.x, bp.z);
      for (const s of [2, 4]) {
        const px = bp.x + (dx / L) * s;
        const pz = bp.z + (dz / L) * s;
        if (sim.ground.surfaceAt(px, pz) < gy - 2) {
          dx -= (dx / L) * 1.6;
          dz -= (dz / L) * 1.6;
          // steer toward the field centre line
          dx += -bp.x * 0.05;
          dz += -bp.z * 0.08;
          break;
        }
      }
    }
  }

  // Field bounds (soft walls).
  const bx = T.fieldHalfX - 2;
  const bz = T.fieldHalfZ - 2;
  if (bp.x > bx) dx -= (bp.x - bx) * 0.8;
  if (bp.x < -bx) dx -= (bp.x + bx) * 0.8;
  if (bp.z > bz) dz -= (bp.z - bz) * 0.8;
  if (bp.z < -bz) dz -= (bp.z + bz) * 0.8;

  // Stuck detection: nudge sideways when we want to move but haven't.
  if (want !== 0 && !attacking) {
    u.stuckT += dt;
    if (u.stuckT > T.stuckTime) {
      const moved = Math.hypot(bp.x - u.lastX, bp.z - u.lastZ);
      if (moved < 0.8) {
        u.unstickT = 1.2;
        const a = sim.rng.next() * Math.PI * 2;
        u.unstickX = Math.cos(a);
        u.unstickZ = Math.sin(a);
      }
      u.stuckT = 0;
      u.lastX = bp.x;
      u.lastZ = bp.z;
    }
  } else {
    u.stuckT = 0;
    u.lastX = bp.x;
    u.lastZ = bp.z;
  }
  if (u.unstickT > 0) {
    u.unstickT -= dt;
    dx = dx * 0.3 + u.unstickX;
    dz = dz * 0.3 + u.unstickZ;
  }

  const L = Math.hypot(dx, dz);
  let sp = u.def.speed * u.speedMul() * sim.speedMul;
  if (u.charging && u.def.charge) sp *= u.def.charge.speedMul || 1.35;
  if (u.atk && u.atk.phase < 2 && w.kind !== 'spin') sp *= w.moveWhileAttacking ?? 0.2;
  if (L > 0.05) {
    const k = Math.min(1, L) / L;
    u.vdx = dx * k * sp;
    u.vdz = dz * k * sp;
  } else {
    u.vdx = 0;
    u.vdz = 0;
  }
  if (u.atk || (t && want <= 0 && (faceX || faceZ))) {
    if ((faceX || faceZ) && !(u.atk && u.atk.phase === 1 && (w.kind === 'beam' || w.kind === 'spin'))) u.yawDes = Math.atan2(faceX, faceZ);
  } else if (L > 0.1) u.yawDes = Math.atan2(u.vdx, u.vdz);
}

function priorityScore(sim, u, e, prio) {
  let s = Math.hypot(e.x - u.x, e.z - u.z);
  const r = e.def.role;
  switch (prio) {
    case 'backline':
      if (r === 'ranged' || r === 'siege' || r === 'support') s -= 18;
      break;
    case 'biggest':
    case 'big':
      s -= Math.min(20, e.def.cost / 60);
      break;
    case 'weakest':
    case 'weak':
      s -= (1 - e.hp / e.maxHp) * 10 + (e.hp < 120 ? 6 : 0);
      break;
    case 'cluster': {
      let n = 0;
      for (const o of sim.grid.query(e.x, e.z, 3.5)) if (o.alive && o.team === e.team) n++;
      s -= Math.min(16, n * 2);
      break;
    }
  }
  if (u.target === e) s -= 3;
  return s;
}

export function pickTarget(sim, u, prio) {
  let best = null;
  let bs = Infinity;
  const enemies = sim.alive[1 - u.team];
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive) continue;
    const s = priorityScore(sim, u, e, prio);
    if (s < bs) {
      bs = s;
      best = e;
    }
  }
  return best;
}

function nearestEnemy(sim, u, maxD) {
  let best = null;
  let bd = maxD;
  for (const e of sim.alive[1 - u.team]) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - u.x, e.z - u.z);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

function pickSupportTarget(sim, u, w, ai) {
  const allies = sim.alive[u.team];
  if (w.kind === 'revive') {
    let best = null;
    let bd = 30;
    for (const c of sim.units) {
      if (!canRevive(u, c)) continue;
      const d = Math.hypot(c.x - u.x, c.z - u.z);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best) return best;
  }
  if (w.kind === 'heal' || (w.kind === 'healPatch' && ai.priority === 'allyLowest')) {
    let best = null;
    let bs = Infinity;
    for (const a of allies) {
      if (!a.alive || a === u) continue;
      const missing = a.maxHp - a.hp;
      if (missing < Math.min(10, a.maxHp * 0.05)) continue;
      const d = Math.hypot(a.x - u.x, a.z - u.z);
      const s = d * 0.5 - (missing / a.maxHp) * 30;
      if (s < bs) {
        bs = s;
        best = a;
      }
    }
    if (best) return best;
  }
  // Pulse healers, buffers, idle healers: follow the ally closest to the enemy (the front).
  let best = null;
  let bd = Infinity;
  for (const a of allies) {
    if (!a.alive || a === u || isSupportKind(a.def.weapon.kind)) continue;
    const e = nearestEnemy(sim, a, 999);
    if (!e) continue;
    const d = Math.hypot(e.x - a.x, e.z - a.z);
    if (d < bd) {
      bd = d;
      best = a;
    }
  }
  return best || u;
}

// Chasm navigation: if the target is across a gap, walk to the best bridge first.
function routeVia(sim, u, tx, tz) {
  const nav = sim.map.nav;
  const bp = u.base.position;
  const s0 = nav.side(bp.x, bp.z);
  const s1 = nav.side(tx, tz);
  if (s0 === s1 || s1 === 0) return null;
  // Ranged units don't route if they can already shoot across.
  if (u.target && u.target.alive && u.def.weapon.range > 6 && gap(u, u.target) < reach(u, u.def.weapon, u.target)) return null;
  let best = null;
  let bc = Infinity;
  for (const br of nav.bridges) {
    const lo = Math.min(br.z0, br.z1);
    const hi = Math.max(br.z0, br.z1);
    if (s0 === 0) {
      // on (or near) a bridge: cross it toward the target's side
      if (Math.abs(bp.x - br.x) < br.halfW + 0.5 && bp.z > lo - 1 && bp.z < hi + 1) return { x: br.x, z: s1 > 0 ? hi + 2 : lo - 2 };
      continue;
    }
    const nearZ = s0 > 0 ? hi + 1.5 : lo - 1.5;
    const farZ = s0 > 0 ? lo - 1.5 : hi + 1.5;
    const c = Math.abs(br.x - bp.x) + Math.abs(nearZ - bp.z) * 0.5 + Math.abs(tx - br.x) + (br.cost || 0) + (sim.bridgeLoad ? sim.bridgeLoad(br) : 0);
    if (c < bc) {
      bc = c;
      best = { x: br.x, z: nearZ, far: farZ, br };
    }
  }
  if (!best) {
    if (s0 === 0) return null;
    return null;
  }
  const lined = Math.abs(bp.x - best.x) < best.br.halfW * 0.7;
  if (lined && Math.abs(bp.z - best.z) < 3) return { x: best.x, z: best.far };
  // approach the entry from straight ahead so we don't clip the rails
  if (!lined && Math.abs(bp.z - best.z) < 3) return { x: best.x, z: best.z + (s0 > 0 ? 1.5 : -1.5) };
  return best;
}
