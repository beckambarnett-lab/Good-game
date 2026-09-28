import { TUNING as T } from '../data/tuning.js';
import { canRevive, gap, isSupportKind, reach } from './combat.js';

// Player possession: a unit with `u.ctrl` is driven by the player instead of the AI brain.
// The view layer fills ctrl every frame (all world-space, no DOM here):
//   mx, mz      desired move direction (length <= 1)
//   yaw         aim yaw (the unit faces this)
//   ox..oz      aim ray origin (camera), dx..dz aim ray direction (unit vector)
//   gx, gy, gz  where the aim ray meets the ground (null gx = sky)
//   fire, fire2, jump   buttons held
// possessThink writes ctrl.lock (the soft-locked target) for the HUD reticle.

export function newControl() {
  return { mx: 0, mz: 0, yaw: 0, ox: 0, oy: 0, oz: 0, dx: 0, dy: 0, dz: 1, gx: null, gy: 0, gz: 0, fire: false, fire2: false, jump: false, lock: null, noTargetT: -9 };
}

export function possessThink(sim, u, dt) {
  const c = u.ctrl;
  const w = u.def.weapon;
  c.lock = aimLock(sim, u, w);
  // AI-facing bookkeeping other systems read (arm aim pose, cavalry charge, target markers)
  u.target = c.lock && c.lock.alive && c.lock.team !== u.team ? c.lock : null;
  u.enemy = u.target;
  if (u.jumpCool > 0) u.jumpCool -= dt;

  let dx = c.mx;
  let dz = c.mz;
  const bp = u.base.position;
  // soft field walls, same as the AI's
  const bx = T.fieldHalfX - 2;
  const bz = T.fieldHalfZ - 2;
  if (bp.x > bx) dx -= (bp.x - bx) * 0.8;
  if (bp.x < -bx) dx -= (bp.x + bx) * 0.8;
  if (bp.z > bz) dz -= (bp.z - bz) * 0.8;
  if (bp.z < -bz) dz -= (bp.z + bz) * 0.8;

  let sp = u.def.speed * u.speedMul() * sim.speedMul;
  if (u.charging && u.def.charge) sp *= u.def.charge.speedMul || 1.35;
  if (u.atk && u.atk.phase < 2 && w.kind !== 'spin') sp *= Math.max(0.45, w.moveWhileAttacking ?? 0.2);
  const L = Math.hypot(dx, dz);
  if (L > 0.05) {
    const k = Math.min(1, L) / L;
    u.vdx = dx * k * sp;
    u.vdz = dz * k * sp;
  } else {
    u.vdx = 0;
    u.vdz = 0;
  }
  // Face the crosshair, except while a spin/beam is steering the body itself.
  const steering = u.atk && u.atk.phase === 1 && (w.kind === 'spin' || w.kind === 'beam');
  if (!steering) {
    const L = c.lock;
    u.yawDes = L ? Math.atan2(L.x - u.x, L.z - u.z) : c.yaw;
  }

  if (c.jump && u.grounded && !u.launched && u.stunT <= 0 && !(u.jumpCool > 0)) {
    u.jumpCool = 0.9;
    const v = 5.2;
    for (const b of u.rag.list) {
      b.velocity.y += v;
      b.wakeUp();
    }
    sim.emit('jump', u.pos, { unit: u });
  }
}

// Soft lock: the valid target closest to the crosshair ray (enemies, or allies/corpses for support weapons).
export function aimLock(sim, u, w) {
  const c = u.ctrl;
  const kind = w.kind;
  const friendly = isSupportKind(kind);
  const pool = kind === 'revive' ? sim.units : friendly ? sim.alive[u.team] : sim.alive[1 - u.team];
  if (!pool) return null;
  const maxR = (kind === 'revive' ? w.range : reach(u, w, null)) + 8;
  let best = null;
  let bs = Infinity;
  for (const e of pool) {
    if (e === u) continue;
    if (kind === 'revive') {
      if (!canRevive(u, e)) continue;
    } else if (!e.alive) continue;
    if (friendly && (kind === 'heal' || kind === 'healPatch') && e.hp >= e.maxHp - 0.5) continue;
    if (Math.hypot(e.x - u.x, e.z - u.z) > maxR) continue;
    const tp = e.p.torso.position;
    const vx = tp.x - c.ox;
    const vy = tp.y - c.oy;
    const vz = tp.z - c.oz;
    const along = vx * c.dx + vy * c.dy + vz * c.dz;
    if (along < 0.5) continue;
    const px = vx - c.dx * along;
    const py = vy - c.dy * along;
    const pz = vz - c.dz * along;
    const perp = Math.hypot(px, py, pz);
    // angular miss, forgiving for big targets and close range
    const ang = Math.max(0, perp - e.radius - 0.5) / along;
    if (ang > 0.2) continue;
    const s = ang + along * 0.002;
    if (s < bs) {
      bs = s;
      best = e;
    }
  }
  if (best) return best;
  // Nothing under the crosshair: take the closest target roughly in front and in reach
  // (wide cone for melee, narrow for ranged), so you can just face something and swing.
  const melee = kind !== 'revive' && w.range < 6;
  const cone = melee ? 0.9 : 0.25;
  const fx = Math.sin(c.yaw);
  const fz = Math.cos(c.yaw);
  for (const e of pool) {
    if (e === u) continue;
    if (kind === 'revive') {
      if (!canRevive(u, e)) continue;
    } else if (!e.alive) continue;
    if (friendly && (kind === 'heal' || kind === 'healPatch') && e.hp >= e.maxHp - 0.5) continue;
    const dx = e.x - u.x;
    const dz = e.z - u.z;
    const d = Math.hypot(dx, dz) || 1;
    const lim = kind === 'revive' || friendly ? w.range + 1 : reach(u, w, e) + (melee ? 1.5 : 0);
    if (d - e.radius > lim) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
    if (ang > cone + (melee ? Math.atan2(e.radius, d) : 0)) continue;
    const s = ang * 4 + d * 0.1;
    if (s < bs) {
      bs = s;
      best = e;
    }
  }
  return best;
}

// A stand-in target at a ground point, so aimed weapons (projectiles, beams, strikes) can fire at nothing.
export function pointTarget(x, y, z) {
  const pos = { x, y, z };
  return { alive: true, team: -1, x, z, radius: 0.3, hp: 1, maxHp: 1, base: { position: pos, velocity: { x: 0, y: 0, z: 0 } }, p: { torso: { position: pos } } };
}

const AIMABLE = new Set(['projectile', 'beam', 'aoePoint']);

// Pick what a player-fired weapon hits. Returns undefined if the weapon can't fire now.
export function playerTarget(sim, u, w, lock) {
  const kind = w.kind;
  const friendly = isSupportKind(kind);
  if (lock) {
    if (kind === 'revive') {
      if (Math.hypot(lock.x - u.x, lock.z - u.z) <= w.range + 1) return lock;
    } else if (friendly) {
      if (Math.hypot(lock.x - u.x, lock.z - u.z) - lock.radius <= w.range + 1) return lock;
    } else if (lock.alive && lock.team !== u.team) {
      const g = gap(u, lock);
      if (g <= reach(u, w, lock) + (w.range < 6 ? 1.5 : 0) && g >= (w.minRange || 0)) return lock;
    }
  }
  // Self-centred and arc weapons swing whether or not anything is there.
  if (['swing', 'thrust', 'slam', 'spin', 'cone', 'explode', 'healPulse', 'buff', 'summon'].includes(kind)) return null;
  if (kind === 'healPatch') return lock || u;
  if (AIMABLE.has(kind)) return aimPoint(sim, u, w);
  // chain / heal / revive: fall back to the best thing in range in front of us
  return nearestInFront(sim, u, w);
}

function aimPoint(sim, u, w) {
  const c = u.ctrl;
  const r = Math.max(2, reach(u, w, null));
  let x;
  let z;
  if (c.gx !== null && c.gx !== undefined) {
    x = c.gx;
    z = c.gz;
  } else {
    x = u.x + Math.sin(c.yaw) * r;
    z = u.z + Math.cos(c.yaw) * r;
  }
  const dx = x - u.x;
  const dz = z - u.z;
  const d = Math.hypot(dx, dz);
  const min = Math.max(1.5, w.minRange || 0);
  const k = d > r ? r / d : d < min ? min / (d || 1) : 1;
  x = u.x + (d ? dx : Math.sin(c.yaw)) * k;
  z = u.z + (d ? dz : Math.cos(c.yaw)) * k;
  return pointTarget(x, sim.ground.surfaceAt(x, z) + 0.9, z);
}

function nearestInFront(sim, u, w) {
  const kind = w.kind;
  const yaw = u.ctrl.yaw;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  let best;
  let bs = Infinity;
  const pool = kind === 'revive' ? sim.units : isSupportKind(kind) ? sim.alive[u.team] : sim.alive[1 - u.team];
  for (const e of pool) {
    if (e === u) continue;
    if (kind === 'revive' ? !canRevive(u, e) : !e.alive) continue;
    if (kind === 'heal' && e.hp >= e.maxHp - 0.5) continue;
    const dx = e.x - u.x;
    const dz = e.z - u.z;
    const d = Math.hypot(dx, dz) || 1;
    const lim = kind === 'revive' ? w.range + 1 : isSupportKind(kind) ? w.range + 1 : reach(u, w, e);
    if (d - e.radius > lim) continue;
    const cos = (dx * fx + dz * fz) / d;
    if (cos < 0.3) continue;
    const s = d * (1.6 - cos) - (kind === 'heal' ? (1 - e.hp / e.maxHp) * 20 : 0);
    if (s < bs) {
      bs = s;
      best = e;
    }
  }
  return best;
}
