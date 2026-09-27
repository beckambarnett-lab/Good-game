import { TUNING as T } from '../data/tuning.js';
import { addZone } from './zones.js';

// Ballistic projectiles: particles with gravity and sphere hits against unit bodies. Launch angles
// come from the real ballistic equation (low or high arc) with target leading and aim error.
// Extras: splash, pierce, bounce, roller (rolls along the ground after landing), boomerang,
// pull (yanks the target toward the shooter), cloud (leaves a lingering damaging zone).

export function solveLaunch(dx, dy, dz, speed, g, high) {
  const x = Math.hypot(dx, dz);
  const v2 = speed * speed;
  const disc = v2 * v2 - g * (g * x * x + 2 * dy * v2);
  let th;
  let ok = true;
  if (x < 0.01) th = 0;
  else if (disc < 0) {
    th = Math.PI / 4;
    ok = false;
  } else {
    const r = Math.sqrt(disc);
    th = Math.atan2(high ? v2 + r : v2 - r, g * x);
  }
  const yaw = Math.atan2(dx, dz);
  const c = Math.cos(th);
  return { vx: Math.sin(yaw) * c * speed, vy: Math.sin(th) * speed, vz: Math.cos(yaw) * c * speed, flight: x / Math.max(0.1, c * speed), ok };
}

// Max range of a launcher on flat ground (used by the AI to know when to close in).
export function ballisticRange(pr) {
  if (pr.flat || pr.boomerang) return Infinity;
  const g = T.projGravity * (pr.gravity ?? 1);
  return (pr.speed * pr.speed) / g;
}

export function fireProjectile(sim, src, target, w, ox, oy, oz) {
  const pr = w.proj;
  const g = pr.flat || pr.boomerang ? 0 : T.projGravity * (pr.gravity ?? 1);
  const high = pr.arc === 'high';
  const count = pr.count || 1;
  const rng = sim.rng;
  const tp = target.p.torso.position;
  const tv = target.base.velocity;
  // Lead the target: iterate the flight time twice.
  let tx = tp.x;
  let tz = tp.z;
  const aimY = tp.y;
  let sol = solveLaunch(tx - ox, aimY - oy, tz - oz, pr.speed, g || 1, high);
  const lead = pr.lead ?? 0.8;
  const minD = Math.max(w.minRange || 0, 4);
  for (let k = 0; k < 2; k++) {
    tx = tp.x + tv.x * sol.flight * lead;
    tz = tp.z + tv.z * sol.flight * lead;
    // don't lead a charging target past the point where it will stop (it can't run through us)
    const dx = tx - ox;
    const dz = tz - oz;
    const d = Math.hypot(dx, dz);
    const d0 = Math.hypot(tp.x - ox, tp.z - oz);
    if (d < minD && d0 > minD) {
      tx = ox + (dx / (d || 1)) * minD;
      tz = oz + (dz / (d || 1)) * minD;
    }
    sol = solveLaunch(tx - ox, aimY - oy, tz - oz, pr.speed, g || 1, high);
  }
  const acc = pr.acc ?? 0.7;
  const dist = Math.hypot(tx - ox, tz - oz);
  const baseYaw = Math.atan2(tx - ox, tz - oz);
  for (let i = 0; i < count; i++) {
    // Aim error: yaw sigma (1-acc)*11deg, pitch sigma (1-acc)*5deg; plus volley spread.
    const spread = count > 1 ? ((i - (count - 1) / 2) / Math.max(1, count - 1)) * ((pr.spread || 0) * Math.PI) / 180 : 0;
    const yawErr = gauss(rng) * (1 - acc) * 0.19 + spread;
    const pitchErr = gauss(rng) * (1 - acc) * 0.087;
    const sp = pr.speed * (1 + rng.range(-0.03, 0.03));
    let vx;
    let vy;
    let vz;
    if (g === 0) {
      const dy = aimY - oy;
      const L = Math.hypot(dist, dy) || 1;
      const h = (dist / L) * sp;
      vx = Math.sin(baseYaw + yawErr) * h;
      vz = Math.cos(baseYaw + yawErr) * h;
      vy = (dy / L) * sp + pitchErr * sp;
    } else {
      const s2 = solveLaunch(tx - ox, aimY - oy, tz - oz, sp, g, high);
      const h = Math.hypot(s2.vx, s2.vz);
      const th = Math.atan2(s2.vy, h) + pitchErr;
      vx = Math.sin(baseYaw + yawErr) * Math.cos(th) * sp;
      vz = Math.cos(baseYaw + yawErr) * Math.cos(th) * sp;
      vy = Math.sin(th) * sp;
    }
    sim.projectiles.push({
      x: ox,
      y: oy,
      z: oz,
      vx,
      vy,
      vz,
      g,
      team: src.team,
      src,
      dmg: w.damage * src.dmgMul(),
      kb: w.knockback || 0,
      splash: pr.splash || 0,
      r: pr.radius || 0.12,
      life: pr.life || 7,
      bounce: pr.bounce || 0,
      pierce: pr.pierce || 0,
      effect: w.effect || null,
      look: pr.look || 'arrow',
      spin: pr.spinRate || 0,
      roll: pr.roll || null,
      rolling: false,
      rollDist: 0,
      cloud: pr.cloud || null,
      pull: pr.pull || 0,
      boom: pr.boomerang ? { outDist: dist + 4, sx: ox, sz: oz, back: false } : null,
      hit: null,
      age: 0,
      id: sim.nextProjId++,
    });
  }
  sim.emit('shoot', { x: ox, y: oy, z: oz }, { unit: src, look: pr.look || 'arrow', sound: w.shootSound });
}

function gauss(rng) {
  return (rng.next() + rng.next() + rng.next() - 1.5) * 1.15;
}

export function updateProjectiles(sim, dt) {
  const list = sim.projectiles;
  let w = 0;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (stepProjectile(sim, p, dt)) list[w++] = p;
  }
  list.length = w;
}

function stepProjectile(sim, p, dt) {
  p.age += dt;
  if (p.rolling) return stepRoller(sim, p, dt);
  if (p.boom) steerBoomerang(sim, p, dt);
  p.vy -= p.g * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.z += p.vz * dt;
  if (p.age > p.life || p.y < T.killY) {
    if (p.boom && p.src) p.src.boomOut = 0;
    return false;
  }

  // Unit hits (enemies only).
  const cand = sim.grid.query(p.x, p.z, 2.5 + p.r);
  for (let k = 0; k < cand.length; k++) {
    const u = cand[k];
    if (!u.alive || u.team === p.team) continue;
    if (p.hit && p.hit.includes(u.id)) continue;
    if (!hitsUnit(u, p)) continue;
    if (p.splash > 0 && !p.roll) {
      explode(sim, p);
      return false;
    }
    const sp = Math.hypot(p.vx, p.vy, p.vz) || 1;
    applyEffect(sim, u, p.effect, p.src);
    if (p.pull) {
      pullToward(u, p.src, p.pull);
      u.hit(p.dmg, 0, 0, 0, p.src, u.p.torso, RANGED);
    } else {
      const k2 = p.kb / sp;
      u.hit(p.dmg, p.vx * k2, Math.abs(p.vy * k2) * 0.3 + p.kb * 0.25, p.vz * k2, p.src, u.p.torso, RANGED);
    }
    sim.emit('hit', { x: p.x, y: p.y, z: p.z }, { mag: p.kb, dmg: p.dmg, kind: 'proj', look: p.look, unit: u, pull: !!p.pull, src: p.src });
    if (p.pierce > 0 || p.boom) {
      if (!p.boom) p.pierce--;
      if (!p.hit) p.hit = [];
      p.hit.push(u.id);
      continue;
    }
    if (p.roll) {
      startRolling(sim, p);
      return true;
    }
    if (p.cloud) spawnCloud(sim, p);
    return false;
  }
  if (p.boom) {
    if (p.done && p.src) p.src.boomOut = 0;
    return !p.done;
  }

  // Ground (terrain + bridges).
  const gy = sim.ground.surfaceAt(p.x, p.z);
  if (p.y <= gy + p.r) {
    if (p.roll) {
      if (p.splash > 0) blast(sim, p, 0.6);
      p.y = gy + p.r;
      startRolling(sim, p);
      return true;
    }
    if (p.bounce > 0) {
      p.bounce--;
      p.y = gy + p.r;
      p.vy = Math.abs(p.vy) * 0.45;
      p.vx *= 0.75;
      p.vz *= 0.75;
      p.hit = null;
      sim.emit('thud', { x: p.x, y: gy, z: p.z }, { mag: 40, look: p.look });
      return true;
    }
    if (p.splash > 0) {
      explode(sim, p);
      return false;
    }
    if (p.cloud) spawnCloud(sim, p);
    sim.emit('thud', { x: p.x, y: gy, z: p.z }, { mag: 20, look: p.look, stick: true, vx: p.vx, vy: p.vy, vz: p.vz });
    return false;
  }
  return true;
}

function steerBoomerang(sim, p, dt) {
  const b = p.boom;
  if (!b.back) {
    if (Math.hypot(p.x - b.sx, p.z - b.sz) >= b.outDist) {
      b.back = true;
      p.hit = null;
    }
    return;
  }
  const s = p.src;
  if (!s || !s.alive) {
    p.done = p.age > 1;
    b.back = false;
    b.outDist = 1e9;
    p.life = Math.min(p.life, p.age + 1.5);
    return;
  }
  const t = s.p.torso.position;
  const dx = t.x - p.x;
  const dy = t.y + 0.5 - p.y;
  const dz = t.z - p.z;
  const d = Math.hypot(dx, dy, dz);
  if (d < 1.2 + s.radius) {
    p.done = true;
    // the throw's cooldown starts on the catch
    s.cool = Math.max(s.cool, Math.min(4, s.def.weapon.cooldown * 0.5));
    s.boomOut = 0;
    sim.emit('catch', t, { unit: s });
    return;
  }
  const sp = 22;
  p.vx += ((dx / d) * sp - p.vx) * Math.min(1, dt * 4);
  p.vy += ((dy / d) * sp - p.vy) * Math.min(1, dt * 4);
  p.vz += ((dz / d) * sp - p.vz) * Math.min(1, dt * 4);
}

function startRolling(sim, p) {
  p.rolling = true;
  p.hit = null;
  const h = Math.hypot(p.vx, p.vz) || 1;
  const sp = p.roll.speed;
  p.vx = (p.vx / h) * sp;
  p.vz = (p.vz / h) * sp;
  p.vy = 0;
  p.dmg = p.roll.damage;
  p.kb = p.roll.knockback;
  p.rollDist = 0;
  sim.emit('thud', { x: p.x, y: p.y, z: p.z }, { mag: 60, look: p.look });
}

function stepRoller(sim, p, dt) {
  const sp = Math.hypot(p.vx, p.vz);
  const nsp = sp - 1.2 * dt;
  if (nsp < 2 || p.rollDist > p.roll.dist) return false;
  p.vx *= nsp / sp;
  p.vz *= nsp / sp;
  p.x += p.vx * dt;
  p.z += p.vz * dt;
  p.rollDist += nsp * dt;
  const gy = sim.ground.surfaceAt(p.x, p.z);
  if (gy < p.y - p.r - 3) return false; // rolled off a ledge
  p.y = gy + p.r;
  p.spin = nsp / p.r;
  for (const u of sim.grid.query(p.x, p.z, p.r + 1.5)) {
    if (!u.alive || u.team === p.team) continue;
    if (p.hit && p.hit.includes(u.id)) continue;
    if (Math.hypot(u.x - p.x, u.z - p.z) > p.r + u.radius + 0.3) continue;
    if (!p.hit) p.hit = [];
    p.hit.push(u.id);
    const L = nsp || 1;
    applyEffect(sim, u, p.effect, p.src);
    u.hit(p.dmg, (p.vx / L) * p.kb, p.kb * 0.5, (p.vz / L) * p.kb, p.src, u.p.torso, RANGED);
    sim.emit('hit', { x: u.x, y: u.p.torso.position.y, z: u.z }, { mag: p.kb, dmg: p.dmg, kind: 'roll', look: p.look, unit: u, src: p.src });
  }
  return true;
}

const RANGED = { ranged: true };

function hitsUnit(u, p) {
  const parts = u.p;
  const r = p.r;
  const t = parts.torso.position;
  const tr = u.D.torsoW * 0.62 + r;
  let dx = t.x - p.x;
  let dy = t.y - p.y;
  let dz = t.z - p.z;
  if (dx * dx + dy * dy + dz * dz < tr * tr) return true;
  const h = parts.head.position;
  const hr = u.D.headR + r;
  dx = h.x - p.x;
  dy = h.y - p.y;
  dz = h.z - p.z;
  if (dx * dx + dy * dy + dz * dz < hr * hr) return true;
  if (parts.mount) {
    const m = parts.mount.position;
    const mr = Math.max(u.M.bodyR, u.M.bodyLen * 0.35) + r;
    dx = m.x - p.x;
    dy = m.y - p.y;
    dz = m.z - p.z;
    if (dx * dx + dy * dy + dz * dz < mr * mr) return true;
  }
  return false;
}

function spawnCloud(sim, p) {
  const c = p.cloud;
  addZone(sim, { kind: 'cloud', x: p.x, z: p.z, r: c.r, dps: c.dps, time: c.time, team: p.team, src: p.src, effect: c.effect || null, look: p.look });
}

function blast(sim, p, mul) {
  areaBlast(sim, p.x, p.y, p.z, p.splash, p.dmg * mul, p.kb * mul, p.team, p.src, p.effect);
  sim.emit('explosion', { x: p.x, y: p.y, z: p.z }, { r: p.splash, mag: p.kb * mul, look: p.look });
}

export function explode(sim, p) {
  blast(sim, p, 1);
  if (p.cloud) spawnCloud(sim, p);
}

// Radial damage + impulse, 100% at the centre falling to 30% at the edge. Enemies of `team` take
// damage; allies only get a gentle shove (team -1 = everyone takes damage).
export function areaBlast(sim, x, y, z, r, dmg, kb, team, src, effect, opts) {
  const lift = opts && opts.lift != null ? opts.lift : 0.8;
  const cand = sim.grid.query(x, z, r + 2);
  for (let k = 0; k < cand.length; k++) {
    const u = cand[k];
    if (!u.alive || u === src) continue;
    const t = u.p.torso.position;
    const dx = t.x - x;
    const dy = t.y - y;
    const dz = t.z - z;
    const d = Math.max(0, Math.hypot(dx, dz) - u.radius * 0.5) + Math.max(0, Math.abs(dy) - 1.5);
    if (d > r) continue;
    const f = 1 - 0.7 * (d / r);
    const L = Math.hypot(dx, dz) || 1;
    const ally = team >= 0 && u.team === team;
    if (ally) {
      const a = T.allyKnock;
      u.hit(0, (dx / L) * kb * f * a, kb * f * lift * a, (dz / L) * kb * f * a, null, u.p.torso);
      continue;
    }
    applyEffect(sim, u, effect, src);
    u.hit(dmg * f, (dx / L) * kb * f, kb * f * lift, (dz / L) * kb * f, src, u.p.torso, RANGED);
  }
}

// Status effects never stack: keep the strongest and refresh the duration.
export function applyEffect(sim, u, e, src) {
  if (!e || !u.alive) return;
  if (e.burn) {
    if (u.burnT <= 0 || e.burn >= u.burnDps) {
      u.burnDps = e.burn;
      u.burnSrc = src && src.alive ? src : null;
    }
    u.burnT = Math.max(u.burnT, e.burnTime || 3);
    if (!u.onFireEmit) {
      u.onFireEmit = true;
      sim.emit('ignite', u.pos, { unit: u });
    }
  }
  if (e.slow) {
    if (u.slowT <= 0 || e.slow >= u.slowAmt) u.slowAmt = e.slow;
    u.slowT = Math.max(u.slowT, e.slowTime || 1.5);
  }
  if (e.stun && !u.def.staggerImmune) u.stunT = Math.max(u.stunT, e.stun);
}

// Pull toward the shooter, capped at 6 m/s of velocity change.
export function pullToward(u, src, amount) {
  if (!src) return;
  const a = u.base.position;
  const b = src.base.position;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const L = Math.hypot(dx, dz) || 1;
  const imp = Math.min(amount, 6 * u.mass);
  u.base.applyImpulse({ x: (dx / L) * imp, y: imp * 0.35, z: (dz / L) * imp });
  if (!u.def.staggerImmune) u.staggerT = Math.max(u.staggerT, 0.6);
}
