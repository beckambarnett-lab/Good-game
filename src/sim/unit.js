import * as CANNON from 'cannon-es';
import { TUNING as T } from '../data/tuning.js';
import { createRagdoll, killRagdoll } from './ragdoll.js';

const tA = new CANNON.Vec3();
const tB = new CANNON.Vec3();
const tC = new CANNON.Vec3();
const tD = new CANNON.Vec3();
const tE = new CANNON.Vec3();

let nextId = 1;
export function resetUnitIds() {
  nextId = 1;
}

export class Unit {
  constructor(sim, def, team, x, z, yaw) {
    this.id = nextId++;
    this.sim = sim;
    this.def = def;
    this.team = team;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.alive = true;
    this.deadT = 0;
    const gy = sim.ground.surfaceAt(x, z);
    this.rag = createRagdoll(sim.world, sim.mats, def, x, gy, z, yaw);
    this.p = this.rag.parts;
    this.D = this.rag.D;
    this.M = this.rag.M;
    this.base = this.p.mount || this.p.torso; // body that hovers and is pushed around
    this.hoverH = this.M ? this.M.bodyY : this.D.torsoY;
    this.mass = def.mass;
    this.radius = this.M ? this.M.bodyLen * 0.45 : 0.35 * this.D.s * (def.bulk || 1);
    this.yawDes = yaw;
    this.vdx = 0;
    this.vdz = 0;
    this.gait = sim.rng.next() * 6.28;
    this.launched = false;
    this.settleT = 0;
    this.staggerT = 0;
    this.recoverT = 0;
    this.airT = 0;
    this.grounded = true;
    this.stunT = 0;
    this.slowT = 0;
    this.slowMul = 1;
    this.burnT = 0;
    this.burnDps = 0;
    this.buffT = 0;
    this.buffDmg = 1;
    this.buffSpeed = 1;
    this.flash = 0;
    this.pose = null; // arm pose set by combat: {r:[x,y,z], l:[x,y,z]|null, k:gainMul}
    this.target = null;
    this.retargetT = sim.rng.next() * T.retargetInterval;
    this.cool = 0.3 + sim.rng.next() * 0.6;
    this.atk = null; // current attack {phase, t, target}
    this.charge = 1; // cavalry charge readiness 0..1 (starts ready for the opening charge)
    this.stuckT = 0;
    this.lastX = x;
    this.lastZ = z;
    this.unstickT = 0;
    this.unstickX = 0;
    this.unstickZ = 0;
    this.waypoint = null;
    this.dmgDealt = 0;
    this.healDone = 0;
    this.lastHitBy = null;
    this.spin = 0;
    this.cool2 = 1 + sim.rng.next();
    this.healBucket = T.healCap * (def.rankMul || 1);
    this.hasteT = 0;
    this.mightT = 0;
    this.slowAmt = 0;
    this.summonT = def.passive && def.passive.summon ? def.passive.summon.every * 0.5 : 0;
    this.kiteT = 0;
    this.kiteCool = 0;
    this.revived = false;
    this.value = def.cost;
  }

  get x() {
    return this.base.position.x;
  }
  get z() {
    return this.base.position.z;
  }
  get y() {
    return this.base.position.y;
  }
  get pos() {
    return this.p.torso.position;
  }

  // Current facing from the base body.
  facing() {
    this.base.quaternion.vmult(tA.set(0, 0, 1), tA);
    return Math.atan2(tA.x, tA.z);
  }

  speedMul() {
    const slow = this.slowT > 0 ? Math.max(0.5, 1 - this.slowAmt) : 1;
    const haste = this.hasteT > 0 ? 1 + T.hasteSpeed : 1;
    return slow * haste * this.sim.map.speedAt(this.x, this.z);
  }

  // Attack-rate multiplier (cooldowns are divided by this).
  rateMul() {
    const slow = this.slowT > 0 ? 1 - this.slowAmt / 2 : 1;
    const haste = this.hasteT > 0 ? 1 + T.hasteRate : 1;
    return slow * haste;
  }

  dmgMul() {
    return (this.mightT > 0 ? 1 + T.mightDmg : 1) * (this.buffT > 0 ? this.buffDmg : 1);
  }

  balance() {
    if (this.launched || !this.alive) return 0;
    let b = 1;
    if (this.recoverT > 0) b = Math.max(0.12, 1 - this.recoverT / T.recoverTime);
    if (this.staggerT > 0) b *= 0.35;
    if (this.stunT > 0) b *= 0.55;
    return b;
  }

  // Apply a hit: damage + impulse. opts.ranged marks projectiles/beams (blockable). Returns true if it died.
  hit(dmg, ix, iy, iz, src, part, opts) {
    if (!this.alive) return false;
    const def = this.def;
    let d = dmg * (1 - (def.armor || 0)) * this.sim.damageMul;
    if (this.mightT > 0) d *= 1 - T.mightArmor;
    let kbMul = this.sim.map.kbAt ? this.sim.map.kbAt(this.x, this.z) : 1;
    if (opts && opts.ranged && def.passive && def.passive.block && src) {
      // Shield block: hits arriving from the front arc are mostly absorbed.
      const f = this.facing();
      const dx = src.x - this.x;
      const dz = src.z - this.z;
      const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - f));
      if (ang < (def.passive.block.deg * Math.PI) / 360) {
        d *= 1 - def.passive.block.reduce;
        kbMul = 0;
        this.sim.emit('block', this.pos, { unit: this });
      }
    }
    this.hp -= d;
    this.sim.lastDamageT = this.sim.time;
    if (src && src !== this) {
      src.dmgDealt += d;
      this.lastHitBy = src;
    }
    if (d >= 1) this.flash = Math.min(1, this.flash + 0.5 + d / 80);
    // Velocity-change caps (horizontal 12, vertical 9 m/s), then scale to an impulse.
    let hx = ix * kbMul;
    let hy = iy * kbMul;
    let hz = iz * kbMul;
    const m = this.mass;
    const hh = Math.hypot(hx, hz) / m;
    if (hh > T.maxDvH) {
      hx *= T.maxDvH / hh;
      hz *= T.maxDvH / hh;
    }
    if (hy / m > T.maxDvV) hy = T.maxDvV * m;
    const imag = Math.hypot(hx, hy, hz);
    if (imag > 0) {
      const body = part || this.base;
      tA.set(hx, hy, hz);
      body.applyImpulse(tA);
      body.wakeUp();
      const dv = imag / m;
      const resist = def.stability || 1;
      if (dv > T.launchDv * resist) {
        if (!this.launched) this.sim.emit('launch', this.pos, { mag: imag, unit: this });
        this.launched = true;
        this.settleT = 0;
        if (imag > T.bigHitImpulse) this.sim.emit('bighit', this.pos, { mag: imag, unit: this });
      } else if (dv > 0.8 * resist && !def.staggerImmune) {
        this.staggerT = Math.max(this.staggerT, T.staggerTime * Math.min(1, dv / (T.launchDv * resist)));
      }
    }
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  heal(amount, src) {
    if (!this.alive || this.sim.healMul <= 0) return 0;
    const h = Math.min(amount * this.sim.healMul, this.maxHp - this.hp, this.healBucket);
    if (h <= 0) return 0;
    this.healBucket -= h;
    this.hp += h;
    if (src) src.healDone += h;
    return h;
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.hp = 0;
    this.atk = null;
    this.pose = null;
    killRagdoll(this.sim.world, this.rag);
    this.sim.emit('death', this.pos, { unit: this });
    const db = this.def.passive && this.def.passive.deathBlast;
    if (db) this.sim.deathBlast(this, db);
  }

  // Active-ragdoll controller: hover, upright/yaw torques, locomotion, gait and arm poses.
  control(dt) {
    const sim = this.sim;
    const tor = this.p.torso;
    const base = this.base;
    // Timers
    if (this.staggerT > 0) this.staggerT -= dt;
    if (this.recoverT > 0) this.recoverT -= dt;
    if (this.stunT > 0) this.stunT -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.buffT > 0) this.buffT -= dt;
    if (this.hasteT > 0) this.hasteT -= dt;
    if (this.mightT > 0) this.mightT -= dt;
    const cap = T.healCap * (this.def.rankMul || 1);
    this.healBucket = Math.min(cap, this.healBucket + cap * dt);
    const pas = this.def.passive;
    if (pas && pas.regen && this.hp < this.maxHp) this.heal(pas.regen * dt, null);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 7);
    if (this.burnT <= 0) this.onFireEmit = false;
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.hit(this.burnDps * dt, 0, 0, 0, this.burnSrc || null);
      if (!this.alive) return;
    }

    const bp = base.position;
    const gy = sim.ground.surfaceAt(bp.x, bp.z);
    const h = bp.y - gy;
    const H = this.hoverH;
    const bv = base.velocity;

    if (this.launched) {
      const speed = bv.length();
      if (h < H + 0.4 && h > -0.8 * H && speed < 2.8) {
        this.settleT += dt;
        if (this.settleT > 0.35) {
          this.launched = false;
          this.recoverT = T.recoverTime;
        }
      } else this.settleT = 0;
    }
    const b = this.balance();
    const mT = this.mass;
    const g = -T.gravity;
    this.grounded = h < H + 0.55 * this.D.s && h > -0.7 * H;
    if (this.grounded) this.airT = 0;
    else this.airT += dt;

    if (b > 0 && this.grounded) {
      // Hover spring on the base body (supports the whole unit).
      const hm = this.def.hoverMul || 1;
      let F = mT * (g + T.hoverK * hm * (H - h) - T.hoverC * Math.sqrt(hm) * bv.y);
      F = Math.max(0, Math.min(F, mT * g * 3)) * b;
      base.force.y += F;

      // Locomotion toward the desired velocity.
      const mul = this.stunT > 0 ? 0 : 1;
      const grip = sim.map.gripAt(bp.x, bp.z) * (this.def.grip || 1);
      const ax = (this.vdx * mul - bv.x) * T.accel * grip;
      const az = (this.vdz * mul - bv.z) * T.accel * grip;
      const am = Math.hypot(ax, az);
      const lim = T.maxAccel * grip;
      const k = am > lim ? lim / am : 1;
      base.force.x += mT * ax * k * b;
      base.force.z += mT * az * k * b;
    }

    // Upright + yaw on the base (and on the rider torso when mounted).
    if (b > 0) {
      const sp = Math.hypot(bv.x, bv.z);
      const lean = Math.min(0.18, sp * 0.03);
      const fy = this.yawDes;
      tB.set(Math.sin(fy) * lean, 1, Math.cos(fy) * lean);
      tB.normalize();
      this.upright(base, tB, b, 1.7);
      this.yawTorque(base, b);
      if (base !== tor) {
        tB.set(0, 1, 0);
        this.upright(tor, tB, b, 1.3);
        this.yawTorque(tor, b);
      }
      // Head stays roughly upright while alive.
      tB.set(0, 1, 0);
      this.upright(this.p.head, tB, Math.max(0.4, b), 1, T.headKp, T.headKd);
      if (this.p.mountHead) {
        tB.set(0, 1, 0);
        this.upright(this.p.mountHead, tB, Math.max(0.4, b), 1, T.headKp, T.headKd);
      }
    }

    // Gait phase.
    const hs = Math.hypot(bv.x, bv.z);
    const stride = (this.M ? (this.M.wheels ? this.M.wheelR * 2 : 1.4 * this.M.bodyY) : 1.25 * this.D.s) / Math.PI;
    this.gait += (hs / stride) * dt;
    const topSpeed = Math.max(0.5, this.def.speed);
    const amp = this.grounded ? Math.min(0.65, (hs / topSpeed) * 0.65) : 0.35;

    // Torso frame axes.
    const q = tor.quaternion;
    const up = q.vmult(tC.set(0, 1, 0), tC);
    const fw = q.vmult(tD.set(0, 0, 1), tD);
    const rt = q.vmult(tE.set(1, 0, 0), tE);
    const limbB = Math.max(0.25, b);

    // Legs
    if (this.M && this.M.rider === 'straddle') {
      for (const side of [-1, 1]) {
        const leg = side < 0 ? this.p.legL : this.p.legR;
        tB.set(-up.x * 0.8 + rt.x * side * 0.55 + fw.x * 0.2, -up.y * 0.8 + rt.y * side * 0.55 + fw.y * 0.2, -up.z * 0.8 + rt.z * side * 0.55 + fw.z * 0.2);
        this.driveLimb(leg, tor, tB, limbB, 1);
      }
    } else {
      for (const side of [-1, 1]) {
        const leg = side < 0 ? this.p.legL : this.p.legR;
        const th = Math.sin(this.gait + (side < 0 ? 0 : Math.PI)) * amp;
        const c = Math.cos(th);
        const sn = Math.sin(th);
        tB.set(-up.x * c + fw.x * sn, -up.y * c + fw.y * sn, -up.z * c + fw.z * sn);
        this.driveLimb(leg, tor, tB, limbB, 1);
      }
    }

    // Arms: combat pose or walking swing.
    const pose = this.pose;
    for (const side of [-1, 1]) {
      const arm = side < 0 ? this.p.armL : this.p.armR;
      const pd = pose ? (side < 0 ? pose.l : pose.r) : null;
      if (pd) {
        tB.set(rt.x * pd[0] + up.x * pd[1] + fw.x * pd[2], rt.y * pd[0] + up.y * pd[1] + fw.y * pd[2], rt.z * pd[0] + up.z * pd[1] + fw.z * pd[2]);
        tB.normalize();
        this.driveLimb(arm, tor, tB, limbB, pose.k || 1);
      } else {
        const th = Math.sin(this.gait + (side < 0 ? Math.PI : 0)) * amp * 0.8;
        const c = Math.cos(th);
        const sn = Math.sin(th);
        const out = 0.18 * side;
        tB.set(-up.x * c + fw.x * sn + rt.x * out, -up.y * c + fw.y * sn + rt.y * out, -up.z * c + fw.z * sn + rt.z * out);
        tB.normalize();
        this.driveLimb(arm, tor, tB, limbB * 0.8, 1);
      }
    }
  }

  upright(body, desUp, b, ieMul, kp = T.uprightKp, kd = T.uprightKd) {
    const up = body.quaternion.vmult(tA.set(0, 1, 0), tA);
    // desired angular acceleration: spring toward desUp, damp tilting spin
    const ax = up.y * desUp.z - up.z * desUp.y;
    const ay = up.z * desUp.x - up.x * desUp.z;
    const az = up.x * desUp.y - up.y * desUp.x;
    const w = body.angularVelocity;
    const wd = w.x * desUp.x + w.y * desUp.y + w.z * desUp.z;
    tB.set(kp * ax - kd * (w.x - wd * desUp.x), kp * ay - kd * (w.y - wd * desUp.y), kp * az - kd * (w.z - wd * desUp.z));
    applyAccel(body, tB, ieMul * b);
  }

  yawTorque(body, b) {
    const fw = body.quaternion.vmult(tA.set(0, 0, 1), tA);
    if (fw.x * fw.x + fw.z * fw.z < 0.05) return;
    const cur = Math.atan2(fw.x, fw.z);
    let e = this.yawDes - cur;
    while (e > Math.PI) e -= 2 * Math.PI;
    while (e < -Math.PI) e += 2 * Math.PI;
    if (e > 1.2) e = 1.2;
    if (e < -1.2) e = -1.2;
    tB.set(0, T.yawKp * e - T.yawKd * body.angularVelocity.y, 0);
    applyAccel(body, tB, 1.6 * b);
  }

  driveLimb(limb, parent, des, b, kmul) {
    const cur = limb.quaternion.vmult(tA.set(0, -1, 0), tA);
    const ax = cur.y * des.z - cur.z * des.y;
    const ay = cur.z * des.x - cur.x * des.z;
    const az = cur.x * des.y - cur.y * des.x;
    const wl = limb.angularVelocity;
    const wp = parent.angularVelocity;
    // Relative spin, minus the twist about the limb's own axis (tiny inertia there).
    let rx = wl.x - wp.x;
    let ry = wl.y - wp.y;
    let rz = wl.z - wp.z;
    const tw = rx * cur.x + ry * cur.y + rz * cur.z;
    rx -= tw * cur.x;
    ry -= tw * cur.y;
    rz -= tw * cur.z;
    const I = limb.inertia.x * 3 * b;
    const kp = T.limbKp * kmul;
    const kd = T.limbKd * Math.sqrt(kmul);
    const tx = I * (kp * ax - kd * rx);
    const ty = I * (kp * ay - kd * ry);
    const tz = I * (kp * az - kd * rz);
    limb.torque.x += tx;
    limb.torque.y += ty;
    limb.torque.z += tz;
    parent.torque.x -= tx * 0.3;
    parent.torque.y -= ty * 0.3;
    parent.torque.z -= tz * 0.3;
  }

  // Hand position (end of the right or left arm) into out.
  hand(out, left = false) {
    const arm = left ? this.p.armL : this.p.armR;
    arm.quaternion.vmult(out.set(0, -this.D.armLen / 2, 0), out);
    out.vadd(arm.position, out);
    return out;
  }
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// Torque = R * I_local * R^T * alpha: applying a desired angular acceleration through the body's
// real inertia tensor keeps the PD loops stable on bodies with one tiny axis (narrow mounts).
const _qi = new CANNON.Quaternion();
const _lv = new CANNON.Vec3();
function applyAccel(body, alpha, k) {
  const q = body.quaternion;
  _qi.set(-q.x, -q.y, -q.z, q.w);
  _qi.vmult(alpha, _lv);
  const I = body.inertia;
  _lv.x *= I.x * k;
  _lv.y *= I.y * k;
  _lv.z *= I.z * k;
  q.vmult(_lv, _lv);
  body.torque.x += _lv.x;
  body.torque.y += _lv.y;
  body.torque.z += _lv.z;
}
