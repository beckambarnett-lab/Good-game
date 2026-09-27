import * as CANNON from 'cannon-es';
import { addZone } from './zones.js';
import { applyEffect, areaBlast, ballisticRange, fireProjectile, pullToward } from './projectiles.js';

const tH = new CANNON.Vec3();

// Weapon kinds: swing | thrust | slam | projectile | beam | chain | cone | aoePoint | heal |
// healPulse | healPatch | buff | revive | spin | explode | summon.
// Attack lifecycle: windup (pose) -> hit frame (resolve) -> active (beams/cones/spins tick) -> recover.

// Arm poses in torso space (x right, y up, z forward): direction from shoulder to hand.
const POSES = {
  swing: { wind: { r: [0.3, 0.9, -0.45] }, strike: { r: [-0.25, -0.35, 1] } },
  swing2: { wind: { r: [0.3, 0.9, -0.45], l: [-0.3, 0.9, -0.45] }, strike: { r: [-0.1, -0.3, 1], l: [0.1, -0.3, 1] } },
  thrust: { wind: { r: [0.15, -0.1, -1], l: [-0.2, -0.3, 0.6] }, strike: { r: [0, 0.05, 1], l: [-0.1, 0, 1] } },
  throw: { wind: { r: [0.2, 1, -0.7] }, strike: { r: [0, 0.2, 1] } },
  aim: { wind: { r: [0.05, 0.12, 1], l: [-0.05, 0.12, 1] }, strike: { r: [0.05, 0.3, 1], l: [-0.05, 0.2, 1] } },
  bow: { wind: { r: [0.15, 0.1, 0.3], l: [0, 0.12, 1] }, strike: { r: [0.1, 0.12, 1], l: [0, 0.12, 1] } },
  raise: { wind: { r: [0.3, 1, 0.3], l: [-0.3, 1, 0.3] }, strike: { r: [0.2, 0.4, 1], l: [-0.2, 0.4, 1] } },
  slam: { wind: { r: [0.1, 1, -0.2], l: [-0.1, 1, -0.2] }, strike: { r: [0.05, -0.6, 1], l: [-0.05, -0.6, 1] } },
  spin: { wind: { r: [1, 0.1, 0], l: [-1, 0.1, 0] }, strike: { r: [1, 0.15, 0.1], l: [-1, 0.15, -0.1] } },
  heal: { wind: { r: [0.2, 0.5, 1], l: [-0.6, 0.2, 0.3] }, strike: { r: [0.1, 0.3, 1], l: [-0.6, 0.2, 0.3] } },
  lance: { wind: { r: [0.1, 0.05, 1] }, strike: { r: [0, 0, 1] } },
  point: { wind: { r: [0.1, 0.4, 1] }, strike: { r: [0.1, 0.5, 1] } },
  none: { wind: { r: null }, strike: { r: null } },
};

const DEFAULT_ANIM = {
  swing: 'swing',
  thrust: 'thrust',
  slam: 'slam',
  projectile: 'throw',
  beam: 'point',
  chain: 'raise',
  cone: 'raise',
  aoePoint: 'point',
  heal: 'heal',
  healPulse: 'raise',
  healPatch: 'raise',
  buff: 'raise',
  revive: 'heal',
  explode: 'raise',
  spin: 'spin',
  summon: 'raise',
};

const FRIENDLY = new Set(['heal', 'healPulse', 'healPatch', 'buff', 'revive']);
export const isSupportKind = (k) => FRIENDLY.has(k);

// Distance from attacker's base to the target's base, minus the target's radius.
export function gap(u, t) {
  const a = u.base.position;
  const b = t.base.position;
  return Math.hypot(b.x - a.x, b.z - a.z) - t.radius;
}

// Weapon reach, including the high-ground bonus for ranged weapons (+0.5 m per metre, max +4).
export function reach(u, w, t) {
  let r = w.range;
  // a launcher can't shoot further than physics allows (0.95 of flat-ground max range)
  if (w.proj && !w._maxR) w._maxR = ballisticRange(w.proj) * 0.95;
  if (w._maxR) r = Math.min(r, w._maxR);
  if (!t || w.range < 6) return r;
  const dh = u.base.position.y - t.base.position.y;
  return r + Math.min(4, Math.max(0, dh * 0.5));
}

export function updateCombat(sim, u, dt) {
  const w = u.def.weapon;
  if (!u.alive) return;
  const disabled = u.launched || u.stunT > 0 || (!u.grounded && !w.hop);
  if (disabled) {
    if (u.atk && u.atk.phase === 0) u.atk = null;
    if (!u.atk) u.pose = null;
  }
  const rate = u.rateMul();
  u.cool -= dt * rate;
  u.cool2 -= dt * rate;
  const anim = POSES[w.anim || DEFAULT_ANIM[w.kind]] || POSES.swing;

  if (u.def.charge) chargeCheck(sim, u, dt);
  if (u.def.weapon2 && !disabled) secondary(sim, u);

  if (u.atk) {
    const a = u.atk;
    a.t += dt;
    const wind = w.windup ?? 0.3;
    const rec = w.recover ?? 0.3;
    if (a.phase === 0) {
      u.pose = anim.wind.r ? { r: anim.wind.r, l: anim.wind.l || null, k: 1.2 } : null;
      if (a.target && a.target.alive) faceToward(u, a.target);
      if (a.target && !validTarget(u, w, a.target)) {
        u.atk = null;
        u.pose = null;
        return;
      }
      if (a.t >= wind) {
        a.phase = 1;
        a.t = 0;
        a.tick = 0;
        resolveAttack(sim, u, a, w);
      }
    } else if (a.phase === 1) {
      u.pose = anim.strike.r ? { r: anim.strike.r, l: anim.strike.l || null, k: 3 } : null;
      const dur = activeTime(w);
      if (dur > 0) activeTick(sim, u, a, w, dt);
      if (a.t >= Math.max(w.active ?? 0.12, dur)) {
        a.phase = 2;
        a.t = 0;
      }
    } else {
      u.pose = anim.strike.r ? { r: anim.strike.r, l: anim.strike.l || null, k: 1 } : null;
      if (a.t >= rec) {
        u.atk = null;
        u.pose = null;
        u.cool = w.cooldown * (0.9 + sim.rng.next() * 0.2);
      }
    }
    return;
  }
  // Ranged units hold their aim between shots.
  const t = u.target;
  if (t && t.alive && (w.anim === 'aim' || w.anim === 'bow') && gap(u, t) < reach(u, w, t) + 2) {
    u.pose = { r: anim.wind.r, l: anim.wind.l || null, k: 1 };
  } else u.pose = null;

  if (u.cool > 0 || disabled || !t) return;
  if (!validTarget(u, w, t)) return;
  if (w.kind === 'revive') {
    if (Math.hypot(t.x - u.x, t.z - u.z) > w.range + 1) return;
  } else {
    const g = gap(u, t);
    if (g > reach(u, w, t) || g < (w.minRange || 0)) return;
  }
  if (u.boomOut && w.proj && w.proj.boomerang && sim.time - u.boomOut < 6) return;
  u.atk = { phase: 0, t: 0, target: t, tick: 0 };
  if (w.hop) {
    u.base.velocity.y += w.hop;
    u.base.wakeUp();
  }
  sim.emit('windup', u.pos, { unit: u, kind: w.kind });
}

function validTarget(u, w, t) {
  if (w.kind === 'revive') return !t.alive && canRevive(u, t);
  if (!t.alive) return false;
  if (FRIENDLY.has(w.kind)) {
    if (t.team !== u.team) return false;
    if (w.kind === 'heal' && t.hp >= t.maxHp - 0.5) return false;
    return true;
  }
  return t.team !== u.team;
}

export function canRevive(u, c) {
  return (
    !c.alive &&
    !c.removed &&
    !c.frozen &&
    c.team === u.team &&
    !c.revived &&
    !c.summoned &&
    !c.def.mount &&
    c.def.role !== 'legendary' &&
    c.def.weapon.kind !== 'revive' &&
    c.def.cost <= 400 &&
    c.deadT < 12 &&
    c.p.torso.position.y > -2 &&
    (u.revives || 0) < 3 &&
    !u.sim.sudden
  );
}

function activeTime(w) {
  if (w.kind === 'beam') return w.beam ? w.beam.time || 0 : 0;
  if (w.kind === 'cone') return w.cone ? w.cone.time || 2 : 2;
  if (w.kind === 'spin') return w.duration || 1.2;
  return 0;
}

function faceToward(u, t) {
  const a = u.base.position;
  const b = t.base.position;
  u.yawDes = Math.atan2(b.x - a.x, b.z - a.z);
}

// Instant secondary weapon (legendaries): fires when its own cooldown is ready and a target fits.
function secondary(sim, u) {
  const w2 = u.def.weapon2;
  if (u.cool2 > 0) return;
  let t = null;
  if (w2.when === 'crowd') {
    let n = 0;
    for (const e of sim.grid.query(u.x, u.z, w2.range + 1)) if (e.alive && e.team !== u.team && gap(u, e) < w2.range) n++;
    if (n < (w2.crowd || 3)) return;
    t = u.target && u.target.alive && u.target.team !== u.team ? u.target : null;
    if (!t) for (const e of sim.grid.query(u.x, u.z, w2.range + 1)) if (e.alive && e.team !== u.team) t = e;
  } else {
    // nearest enemy within range
    let bd = w2.range;
    for (const e of sim.grid.query(u.x, u.z, w2.range + 3)) {
      if (!e.alive || e.team === u.team) continue;
      const g = gap(u, e);
      if (g < bd && g >= (w2.minRange || 0)) {
        bd = g;
        t = e;
      }
    }
    if (w2.range > 8 && u.target && u.target.alive && u.target.team !== u.team && gap(u, u.target) < w2.range) t = u.target;
  }
  if (!t) return;
  u.cool2 = w2.cooldown * (0.9 + sim.rng.next() * 0.2);
  resolveAttack(sim, u, { target: t, tick: 0, t: 0 }, w2);
}

function resolveAttack(sim, u, a, w) {
  const t = a.target;
  const bp = u.base.position;
  const fy = u.facing();
  const fx = Math.sin(fy);
  const fz = Math.cos(fy);
  const dm = u.dmgMul();
  switch (w.kind) {
    case 'swing':
    case 'thrust': {
      const arc = ((w.arc ?? (w.kind === 'thrust' ? 30 : 110)) * Math.PI) / 360;
      const maxT = w.maxTargets ?? (w.kind === 'thrust' ? 1 : 2);
      const cand = sim.grid.query(bp.x, bp.z, w.range + 4);
      const hits = [];
      for (const e of cand) {
        if (!e.alive || e.team === u.team) continue;
        const ep = e.base.position;
        const dx = ep.x - bp.x;
        const dz = ep.z - bp.z;
        const d = Math.hypot(dx, dz);
        if (d - e.radius > w.range + 0.4) continue;
        const cosA = (dx * fx + dz * fz) / (d || 1);
        if (d > u.radius + e.radius + 0.25 && cosA < Math.cos(arc)) continue;
        hits.push({ e, d, dx, dz });
      }
      hits.sort((p, q) => p.d - q.d);
      if (t && t.alive) {
        const i = hits.findIndex((h) => h.e === t);
        if (i > 0) hits.unshift(hits.splice(i, 1)[0]);
      }
      let n = 0;
      u.hand(tH);
      for (const h of hits) {
        if (n >= maxT) break;
        n++;
        const L = h.d || 1;
        const kb = w.knockback || 0;
        applyEffect(sim, h.e, w.effect, u);
        const part = h.e.p.torso;
        const kx = w.kind === 'thrust' ? fx : h.dx / L;
        const kz = w.kind === 'thrust' ? fz : h.dz / L;
        if (kb < 0) pullToward(h.e, u, -kb);
        h.e.hit(w.damage * dm, kx * Math.max(0, kb), Math.max(0, kb) * (w.lift ?? 0.35), kz * Math.max(0, kb), u, part);
        if (w.lifesteal) u.heal(w.damage * dm * w.lifesteal, null);
        sim.emit('hit', { x: part.position.x, y: part.position.y, z: part.position.z }, { mag: Math.abs(kb), dmg: w.damage, kind: w.kind, unit: h.e, src: u, sound: w.sound });
      }
      if (n === 0) sim.emit('whiff', { x: tH.x, y: tH.y, z: tH.z }, { unit: u });
      break;
    }
    case 'slam': {
      const off = w.reach ?? 0;
      const cx = bp.x + fx * off;
      const cz = bp.z + fz * off;
      const cy = sim.ground.surfaceAt(cx, cz);
      areaBlast(sim, cx, cy + 0.6, cz, w.radius || 2.5, w.damage * dm, w.knockback || 0, u.team, u, w.effect, { lift: w.lift ?? 0.9 });
      sim.emit('slam', { x: cx, y: cy, z: cz }, { r: w.radius || 2.5, mag: w.knockback || 0, unit: u, sound: w.sound });
      break;
    }
    case 'projectile':
    case 'boomerang': {
      if (!t || !t.alive) break;
      u.hand(tH);
      const oy = Math.max(tH.y, u.p.torso.position.y + 0.25 * u.D.s);
      const mz = w.muzzle;
      if (mz) {
        // fire from a fixed point on the unit (cart barrels, shoulder cannons)
        const base = mz.bone === 'mount' && u.p.mount ? u.p.mount : u.p.torso;
        base.quaternion.vmult(tH.set(mz.at[0], mz.at[1], mz.at[2]), tH);
        tH.vadd(base.position, tH);
        fireProjectile(sim, u, t, w, tH.x, tH.y, tH.z);
      } else fireProjectile(sim, u, t, w, tH.x, oy, tH.z);
      if (w.proj && w.proj.boomerang) u.boomOut = sim.time || 0.001;
      break;
    }
    case 'beam':
      if (!t || !t.alive) break;
      a.beamYaw = Math.atan2(t.x - bp.x, t.z - bp.z);
      a.beamPitchY = t.p.torso.position.y;
      a.tick = 0;
      if (!(w.beam && w.beam.time)) beamTick(sim, u, a, w, 1);
      break;
    case 'chain': {
      if (!t || !t.alive) break;
      u.hand(tH);
      const pts = [{ x: tH.x, y: tH.y, z: tH.z }];
      let cur = t;
      const hitSet = new Set();
      let dmg = w.damage * dm;
      const ch = w.chain || {};
      for (let i = 0; i <= (ch.jumps ?? 3) && cur; i++) {
        hitSet.add(cur.id);
        const cp = cur.p.torso.position;
        pts.push({ x: cp.x, y: cp.y, z: cp.z });
        const prev = pts[pts.length - 2];
        const dx = cp.x - prev.x;
        const dz = cp.z - prev.z;
        const L = Math.hypot(dx, dz) || 1;
        const kb = w.knockback || 0;
        applyEffect(sim, cur, w.effect, u);
        cur.hit(dmg, (dx / L) * kb, kb * 0.3, (dz / L) * kb, u, cur.p.torso, { ranged: true });
        dmg *= ch.falloff ?? 0.7;
        let best = null;
        let bd = ch.radius || 5;
        for (const e of sim.grid.query(cp.x, cp.z, bd + 1)) {
          if (!e.alive || e.team === u.team || hitSet.has(e.id)) continue;
          const d = Math.hypot(e.x - cp.x, e.z - cp.z);
          if (d < bd) {
            bd = d;
            best = e;
          }
        }
        cur = best;
      }
      sim.emit('beam', pts[0], { pts, color: w.color || '#bfefff', width: w.width || 0.12, unit: u, kind: 'chain', sound: w.sound || 'beam' });
      break;
    }
    case 'cone':
      a.tick = 0;
      break;
    case 'aoePoint': {
      if (!t || !t.alive) break;
      const ao = w.aoe || {};
      const delay = ao.delay ?? 1.5;
      const tv = t.base.velocity;
      const x = t.x + tv.x * delay * (ao.lead ?? 0.5);
      const z = t.z + tv.z * delay * (ao.lead ?? 0.5);
      addZone(sim, { kind: 'telegraph', x, z, r: w.radius || 3, time: delay, delay, damage: w.damage * dm, knockback: w.knockback || 0, lift: ao.lift, team: u.team, src: u, effect: w.effect, look: ao.look || 'sun' });
      u.hand(tH);
      sim.emit('beam', { x: tH.x, y: tH.y, z: tH.z }, { pts: [{ x: tH.x, y: tH.y, z: tH.z }, { x, y: sim.ground.surfaceAt(x, z) + 0.2, z }], color: w.color || '#fff3a0', width: 0.08, unit: u, kind: 'aim' });
      break;
    }
    case 'heal': {
      if (!t || !t.alive) break;
      const r = w.radius || 0;
      if (r > 0) {
        for (const e of sim.grid.query(t.x, t.z, r + 1)) if (e.alive && e.team === u.team && e !== u && Math.hypot(e.x - t.x, e.z - t.z) <= r) e.heal(w.heal, u);
      } else t.heal(w.heal, u);
      if (w.cleanse) {
        t.slowT = 0;
        t.burnT = 0;
      }
      u.hand(tH);
      const tp = t.p.torso.position;
      sim.emit('heal', { x: tp.x, y: tp.y, z: tp.z }, { from: { x: tH.x, y: tH.y, z: tH.z }, r, unit: u, look: w.look });
      break;
    }
    case 'healPulse': {
      const r = w.radius || 6;
      for (const e of sim.grid.query(bp.x, bp.z, r + 1)) if (e.alive && e.team === u.team && e !== u && Math.hypot(e.x - bp.x, e.z - bp.z) <= r) e.heal(w.heal, u);
      sim.emit('healPulse', { x: bp.x, y: sim.ground.surfaceAt(bp.x, bp.z), z: bp.z }, { r, unit: u });
      break;
    }
    case 'healPatch': {
      // densest ally spot near the target ally
      let best = t && t.alive ? t : u;
      let bn = -1;
      for (const e of sim.grid.query(bp.x, bp.z, w.range + 2)) {
        if (!e.alive || e.team !== u.team) continue;
        let n = 0;
        for (const o of sim.grid.query(e.x, e.z, 4)) if (o.alive && o.team === u.team && Math.hypot(o.x - e.x, o.z - e.z) < (w.radius || 4)) n += 1 + (1 - o.hp / o.maxHp) * 2;
        if (n > bn) {
          bn = n;
          best = e;
        }
      }
      addZone(sim, { kind: 'heal', x: best.x, z: best.z, r: w.radius || 4, hps: w.heal, time: w.patchTime || 5, team: u.team, src: u, look: w.look });
      break;
    }
    case 'buff': {
      const r = w.radius || 8;
      const b = w.buff || { kind: 'haste', time: 5 };
      for (const e of sim.grid.query(bp.x, bp.z, r + 1)) {
        if (!e.alive || e.team !== u.team) continue;
        if (Math.hypot(e.x - bp.x, e.z - bp.z) > r) continue;
        if (b.kind === 'haste') e.hasteT = Math.max(e.hasteT, b.time);
        else if (b.kind === 'might') e.mightT = Math.max(e.mightT, b.time);
      }
      sim.emit('buff', { x: bp.x, y: bp.y, z: bp.z }, { r, unit: u, kind: b.kind });
      break;
    }
    case 'revive':
      if (t && canRevive(u, t) && Math.hypot(t.x - u.x, t.z - u.z) < w.range + 1.5) {
        sim.revive(t, w.reviveHp ?? 0.4);
        u.revives = (u.revives || 0) + 1;
        u.hand(tH);
        const tp = t.p.torso.position;
        sim.emit('heal', { x: tp.x, y: tp.y, z: tp.z }, { from: { x: tH.x, y: tH.y, z: tH.z }, r: 1, unit: u, look: 'revive' });
      }
      break;
    case 'explode':
      areaBlast(sim, bp.x, bp.y, bp.z, w.radius || 3, w.damage * dm, w.knockback || 0, u.team, u, w.effect);
      sim.emit('explosion', { x: bp.x, y: bp.y, z: bp.z }, { r: w.radius || 3, mag: w.knockback || 0, unit: u });
      u.hit(99999, 0, (w.knockback || 0) * 0.3, 0, null);
      break;
    case 'spin':
      a.tick = 0;
      break;
  }
}

function activeTick(sim, u, a, w, dt) {
  a.tick -= dt;
  if (w.kind === 'spin') {
    u.yawDes += dt * (w.spinRate || 12);
    if (a.tick > 0) return;
    a.tick = w.tick || 0.3;
    const bp = u.base.position;
    const r = w.radius || 2;
    let any = false;
    for (const e of sim.grid.query(bp.x, bp.z, r + 1.5)) {
      if (!e.alive || e.team === u.team) continue;
      const dx = e.x - bp.x;
      const dz = e.z - bp.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d - e.radius > r) continue;
      const kb = w.knockback || 0;
      applyEffect(sim, e, w.effect, u);
      e.hit(w.damage * u.dmgMul(), (dx / d) * kb - (dz / d) * kb * 0.6, kb * 0.3, (dz / d) * kb + (dx / d) * kb * 0.6, u, e.p.torso);
      const p = e.p.torso.position;
      sim.emit('hit', { x: p.x, y: p.y, z: p.z }, { mag: kb, dmg: w.damage, kind: 'spin', unit: e, src: u, sound: w.sound });
      any = true;
    }
    if (any) sim.emit('spin', { x: bp.x, y: bp.y, z: bp.z }, { unit: u });
    return;
  }
  if (w.kind === 'beam') {
    if (a.tick > 0) return;
    const b = w.beam;
    const tick = b.tick || 0.1;
    a.tick = tick;
    beamTick(sim, u, a, w, tick / b.time);
    return;
  }
  if (w.kind === 'cone') {
    if (a.tick > 0) return;
    const c = w.cone || {};
    a.tick = 0.2;
    const bp = u.base.position;
    const fy = u.facing();
    const half = ((c.angle || 60) * Math.PI) / 360;
    const len = c.len || w.range;
    for (const e of sim.grid.query(bp.x + Math.sin(fy) * len * 0.5, bp.z + Math.cos(fy) * len * 0.5, len * 0.6 + 2)) {
      if (!e.alive || e.team === u.team) continue;
      const dx = e.x - bp.x;
      const dz = e.z - bp.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d - e.radius > len) continue;
      let ang = Math.atan2(dx, dz) - fy;
      while (ang > Math.PI) ang -= 2 * Math.PI;
      while (ang < -Math.PI) ang += 2 * Math.PI;
      if (Math.abs(ang) > half + 0.15) continue;
      applyEffect(sim, e, w.effect, u);
      const push = c.push || 0;
      e.hit(w.damage * u.dmgMul() * 0.2, (dx / d) * push, push * 0.2, (dz / d) * push, u, e.p.torso, { ranged: true });
    }
    u.hand(tH);
    sim.emit('cone', { x: tH.x, y: tH.y, z: tH.z }, { yaw: fy, len, angle: c.angle || 60, unit: u, look: c.look || 'frost' });
  }
}

// One tick of a (possibly sweeping, possibly piercing) beam; frac is the damage fraction per tick.
function beamTick(sim, u, a, w, frac) {
  const b = w.beam || {};
  u.hand(tH);
  const ox = tH.x;
  const oy = tH.y;
  const oz = tH.z;
  const dur = b.time || 0;
  const sweep = ((b.sweep || 0) * Math.PI) / 180;
  const k = dur > 0 ? Math.min(1, a.t / dur) : 0.5;
  const yaw = a.beamYaw + (k - 0.5) * sweep;
  u.yawDes = yaw;
  const len = w.range + 3;
  const dx = Math.sin(yaw);
  const dz = Math.cos(yaw);
  const ty = a.beamPitchY ?? oy;
  const slope = (ty - oy) / Math.max(1, w.range * 0.8);
  const width = (b.width || 0.3) / 2;
  const hits = [];
  // walk the grid along the beam
  const seen = new Set();
  for (let s = 0; s <= len; s += 3) {
    for (const e of sim.grid.query(ox + dx * s, oz + dz * s, 3)) {
      if (seen.has(e.id) || !e.alive || e.team === u.team) continue;
      seen.add(e.id);
      const ex = e.x - ox;
      const ez = e.z - oz;
      const along = ex * dx + ez * dz;
      if (along < 0 || along > len) continue;
      const perp = Math.abs(ex * dz - ez * dx);
      if (perp > width + e.radius + 0.1) continue;
      hits.push({ e, along });
    }
  }
  hits.sort((p, q) => p.along - q.along);
  const list = b.pierce ? hits : hits.slice(0, 1);
  const dmg = w.damage * u.dmgMul() * frac;
  const kb = (w.knockback || 0) * (dur > 0 ? Math.max(frac * 3, 0.3) : 1);
  for (const h of list) {
    applyEffect(sim, h.e, w.effect, u);
    h.e.hit(dmg, dx * kb, kb * 0.3, dz * kb, u, h.e.p.torso, { ranged: true });
  }
  const end = !b.pierce && list.length ? list[0].along : len;
  const pts = [
    { x: ox, y: oy, z: oz },
    { x: ox + dx * end, y: oy + slope * end, z: oz + dz * end },
  ];
  if (!b.pierce && list.length) {
    const tp = list[0].e.p.torso.position;
    pts[1] = { x: tp.x, y: tp.y, z: tp.z };
  }
  sim.emit('beam', pts[0], { pts, color: w.color || '#fff3a0', width: b.width || 0.3, unit: u, kind: 'beam', life: dur > 0 ? 0.12 : 0.25, hit: list.length > 0, sound: a.soundDone ? null : w.sound || 'beam' });
  a.soundDone = true;
}

function chargeCheck(sim, u, dt) {
  const c = u.def.charge;
  const v = u.base.velocity;
  const sp = Math.hypot(v.x, v.z);
  if (u.charge < 1) u.charge = Math.min(1, u.charge + dt / (c.cooldown || 8));
  u.charging = u.charge >= 1 && u.target && u.target.alive && gap(u, u.target) > 1.5;
  if (u.charge < 1 || sp < u.def.speed * 0.6 || !u.grounded) return;
  const bp = u.base.position;
  const vx = v.x / sp;
  const vz = v.z / sp;
  const rch = u.radius + (c.reach || 1.2);
  let n = 0;
  for (const e of sim.grid.query(bp.x + vx * rch * 0.6, bp.z + vz * rch * 0.6, rch + 1)) {
    if (!e.alive || e.team === u.team) continue;
    const dx = e.x - bp.x;
    const dz = e.z - bp.z;
    const d = Math.hypot(dx, dz);
    if (d - e.radius > rch) continue;
    if ((dx * vx + dz * vz) / (d || 1) < 0.5) continue;
    if (n >= (c.maxTargets || 3)) break;
    const kb = c.knockback * Math.min(1.25, sp / u.def.speed);
    e.hit(c.damage * u.dmgMul(), vx * kb, kb * 0.45, vz * kb, u, e.p.torso);
    const p = e.p.torso.position;
    sim.emit('hit', { x: p.x, y: p.y, z: p.z }, { mag: kb, dmg: c.damage, kind: 'charge', unit: e, src: u });
    n++;
  }
  if (n) {
    u.charge = 0;
    u.charging = false;
    sim.emit('charge', { x: bp.x, y: bp.y, z: bp.z }, { unit: u });
  }
}
