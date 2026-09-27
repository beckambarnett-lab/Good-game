import * as CANNON from 'cannon-es';
import { G, MASK } from './groups.js';

// Humanoid proportions at scale 1 (metres). Bone origins are body centres.
export function humanDims(s, bulk = 1) {
  const legLen = 0.8 * s;
  const hipY = 0.82 * s;
  const torsoH = 0.62 * s;
  const torsoW = 0.46 * s * bulk;
  const torsoD = 0.3 * s * bulk;
  const torsoY = hipY + torsoH / 2 + 0.02 * s;
  const headR = 0.17 * s;
  return {
    s,
    bulk,
    legLen,
    hipY,
    hipX: 0.12 * s * bulk,
    torsoH,
    torsoW,
    torsoD,
    torsoY,
    shoulderX: torsoW / 2 + 0.07 * s,
    shoulderY: torsoY + torsoH / 2 - 0.07 * s,
    armLen: 0.62 * s,
    armR: 0.075 * s,
    legR: 0.1 * s,
    headR,
    headY: torsoY + torsoH / 2 + headR + 0.03 * s,
  };
}

// Mount proportions. def.mount = { kind: 'beast'|'cart'|'wheel', scale, len, w, h, height, saddle,
// legs, head, wheelR, rider: 'straddle'|'stand' } (all lengths at mount scale 1).
export const MOUNT_PRESETS = {
  beast: { len: 1.5, w: 0.7, h: 0.7, height: 1.05, saddle: 1.45, legs: 4, head: true, rider: 'straddle' },
  cart: { len: 2.0, w: 1.4, h: 0.5, height: 0.62, saddle: 0.95, legs: 0, wheels: 4, wheelR: 0.45, head: false, rider: 'stand' },
  wheel: { len: 0.3, w: 0.3, h: 0.6, height: 1.1, saddle: 1.5, legs: 0, wheels: 1, wheelR: 0.6, head: false, rider: 'straddle' },
};

export function mountDims(m) {
  const P = { ...MOUNT_PRESETS[m.kind || 'beast'], ...m };
  const ms = P.scale || 1;
  return {
    ms,
    kind: P.kind || 'beast',
    bodyLen: P.len * ms,
    bodyW: P.w * ms,
    bodyH: P.h * ms,
    bodyR: (Math.min(P.w, P.h) / 2) * ms,
    bodyY: P.height * ms,
    saddleY: P.saddle * ms,
    legs: P.legs || 0,
    wheels: P.wheels || 0,
    wheelR: (P.wheelR || 0) * ms,
    wheelPos: P.wheelPos ? P.wheelPos.map(([x, z, r]) => [x * ms, z * ms, r * ms]) : null,
    head: !!P.head,
    headR: (P.headR || 0.24) * ms,
    rider: P.rider || 'straddle',
    neck: P.neck ?? 0.35,
    riderZ: (P.riderZ || 0) * ms,
  };
}

function setInertia(body, ix, iy, iz) {
  body.inertia.set(ix, iy, iz);
  body.invInertia.set(ix > 0 ? 1 / ix : 0, iy > 0 ? 1 / iy : 0, iz > 0 ? 1 / iz : 0);
  body.updateInertiaWorld(true);
}

function makeBody(mass, mat, group, mask, damping) {
  const b = new CANNON.Body({
    mass,
    material: mat,
    collisionFilterGroup: group,
    collisionFilterMask: mask,
    linearDamping: damping,
    angularDamping: 0.35,
    allowSleep: false,
    sleepSpeedLimit: 0.25,
    sleepTimeLimit: 1.2,
  });
  return b;
}

const V = (x, y, z) => new CANNON.Vec3(x, y, z);

// Creates all physics bodies and joints for one unit. Positions are placed around (x, z) with
// facing `yaw`. Returns a parts object; bodies are already added to the world.
export function createRagdoll(world, mats, def, x, groundY, z, yaw) {
  const s = def.scale || 1;
  const D = humanDims(s, def.bulk || 1);
  const mTotal = def.mass;
  const mountKind = def.mount ? def.mount.kind : null;
  const M = mountKind ? mountDims(def.mount) : null;
  const riderMass = mountKind ? mTotal * 0.35 : mTotal;
  const mountMass = mountKind ? mTotal - riderMass : 0;

  const q = new CANNON.Quaternion();
  q.setFromEuler(0, yaw, 0);
  const place = (body, lx, ly, lz) => {
    const p = q.vmult(V(lx, ly, lz));
    body.position.set(x + p.x, groundY + p.y, z + p.z);
    body.quaternion.copy(q);
    body.previousPosition.copy(body.position);
    body.interpolatedPosition.copy(body.position);
    body.initPosition.copy(body.position);
  };

  const parts = {};
  const constraints = [];
  const riderBase = M ? M.saddleY - D.hipY + 0.05 * s : 0; // lift the rider onto the saddle (hips at saddle)

  // Torso: two stacked spheres.
  const torso = makeBody(riderMass * 0.5, mats.body, G.TORSO, MASK.TORSO, 0.08);
  const tr = Math.max(D.torsoW, D.torsoD * 1.4) * 0.5;
  torso.addShape(new CANNON.Sphere(tr), V(0, D.torsoH * 0.22, 0));
  torso.addShape(new CANNON.Sphere(tr), V(0, -D.torsoH * 0.22, 0));
  {
    const m = torso.mass;
    const w = D.torsoW;
    const h = D.torsoH;
    const d = D.torsoD;
    setInertia(torso, (m * (h * h + d * d)) / 12, (m * (w * w + d * d)) / 12, (m * (w * w + h * h)) / 12);
  }
  const rz = M ? M.riderZ : 0;
  place(torso, 0, riderBase + D.torsoY, rz);
  parts.torso = torso;

  const head = makeBody(riderMass * 0.1, mats.body, G.TORSO, MASK.TORSO, 0.1);
  head.addShape(new CANNON.Sphere(D.headR));
  {
    const i = 0.4 * head.mass * D.headR * D.headR;
    setInertia(head, i, i, i);
  }
  place(head, 0, riderBase + D.headY, rz);
  parts.head = head;

  const neck = new CANNON.ConeTwistConstraint(torso, head, {
    pivotA: V(0, D.torsoH / 2 + 0.015 * s, 0),
    pivotB: V(0, -D.headR - 0.015 * s, 0),
    axisA: V(0, 1, 0),
    axisB: V(0, 1, 0),
    angle: 0.55,
    twistAngle: 0.6,
  });
  constraints.push(neck);

  for (const side of [-1, 1]) {
    const arm = makeBody(riderMass * 0.075, mats.limb, G.LIMB, MASK.LIMB, 0.1);
    arm.addShape(new CANNON.Sphere(D.armR * 1.2), V(0, -D.armLen / 2 + D.armR, 0));
    {
      const m = arm.mass;
      const L = D.armLen;
      setInertia(arm, (m * L * L) / 12, m * D.armR * D.armR, (m * L * L) / 12);
    }
    place(arm, side * D.shoulderX, riderBase + D.shoulderY - D.armLen / 2, rz);
    const c = new CANNON.ConeTwistConstraint(torso, arm, {
      pivotA: V(side * D.shoulderX, D.shoulderY - D.torsoY, 0),
      pivotB: V(0, D.armLen / 2, 0),
      axisA: V(0, -1, 0),
      axisB: V(0, -1, 0),
      angle: 2.6,
      twistAngle: 0.5,
    });
    constraints.push(c);
    parts[side < 0 ? 'armL' : 'armR'] = arm;

    const leg = makeBody(riderMass * 0.125, mats.limb, G.LIMB, MASK.LIMB, 0.1);
    leg.addShape(new CANNON.Sphere(D.legR), V(0, -D.legLen / 2 + D.legR, 0));
    {
      const m = leg.mass;
      const L = D.legLen;
      setInertia(leg, (m * L * L) / 12, m * D.legR * D.legR, (m * L * L) / 12);
    }
    place(leg, side * D.hipX, riderBase + D.hipY - D.legLen / 2, rz);
    const lc = new CANNON.ConeTwistConstraint(torso, leg, {
      pivotA: V(side * D.hipX, D.hipY - D.torsoY, 0),
      pivotB: V(0, D.legLen / 2, 0),
      axisA: V(0, -1, 0),
      axisB: V(0, -1, 0),
      angle: 1.3,
      twistAngle: 0.3,
    });
    constraints.push(lc);
    parts[side < 0 ? 'legL' : 'legR'] = leg;
  }

  if (M) {
    const mount = makeBody(mountMass * (M.head ? 0.85 : 1), mats.body, G.TORSO, MASK.TORSO, 0.08);
    if (M.wheels) {
      // Wheel spheres sit just above the ground at hover height so they only touch when knocked over.
      const wr = M.wheelR;
      const wy = wr + 0.06 - M.bodyY;
      if (M.wheelPos) for (const [x, z, r] of M.wheelPos) mount.addShape(new CANNON.Sphere(r), V(x, r + 0.06 - M.bodyY, z));
      else if (M.wheels === 1) mount.addShape(new CANNON.Sphere(wr), V(0, wy, 0));
      else if (M.wheels === 2) for (const sz of [-1, 1]) mount.addShape(new CANNON.Sphere(wr), V(0, wy, sz * M.bodyLen * 0.4));
      else
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) mount.addShape(new CANNON.Sphere(wr), V(sx * M.bodyW * 0.42, wy, sz * M.bodyLen * 0.32));
      mount.addShape(new CANNON.Sphere(Math.max(0.2, M.bodyR)), V(0, 0, 0));
    } else {
      const r = M.bodyR;
      const n = M.bodyLen > r * 3 ? 2 : 1;
      if (n === 1) mount.addShape(new CANNON.Sphere(Math.max(r, M.bodyLen / 2)), V(0, 0, 0));
      else {
        mount.addShape(new CANNON.Sphere(r), V(0, 0, M.bodyLen / 2 - r));
        mount.addShape(new CANNON.Sphere(r), V(0, 0, -M.bodyLen / 2 + r));
      }
    }
    {
      const m = mount.mass;
      const L = M.bodyLen;
      const w = M.bodyW;
      const h = Math.max(M.bodyH, M.bodyY * 0.8);
      setInertia(mount, (m * (L * L + h * h)) / 12, (m * (L * L + w * w)) / 12, (m * (w * w + h * h)) / 12);
    }
    place(mount, 0, M.bodyY, 0);
    parts.mount = mount;

    const saddle = new CANNON.PointToPointConstraint(
      mount,
      V(0, M.saddleY - M.bodyY, M.riderZ),
      torso,
      V(0, D.hipY - D.torsoY, 0),
    );
    constraints.push(saddle);
    parts.saddle = saddle;

    if (M.head) {
      const mh = makeBody(mountMass * 0.15, mats.body, G.TORSO, MASK.TORSO, 0.1);
      mh.addShape(new CANNON.Sphere(M.headR));
      const i = 0.4 * mh.mass * M.headR * M.headR;
      setInertia(mh, i, i, i);
      const hy = M.bodyH * 0.5 + M.neck * M.ms;
      const hz = M.bodyLen / 2 + M.headR * 0.6;
      place(mh, 0, M.bodyY + hy, hz);
      const nc = new CANNON.ConeTwistConstraint(mount, mh, {
        pivotA: V(0, hy - M.headR * 0.9, hz - M.headR * 0.4),
        pivotB: V(0, -M.headR * 0.9, -M.headR * 0.4),
        axisA: V(0, 0.7, 0.7),
        axisB: V(0, 0.7, 0.7),
        angle: 0.5,
        twistAngle: 0.4,
      });
      constraints.push(nc);
      parts.mountHead = mh;
    }
  }

  const list = [];
  for (const k of ['torso', 'head', 'armL', 'armR', 'legL', 'legR', 'mount', 'mountHead']) {
    if (parts[k]) {
      world.addBody(parts[k]);
      list.push(parts[k]);
    }
  }
  for (const c of constraints) {
    for (const eq of c.equations) eq.setSpookParams(1e7, 4, 1 / 60);
    world.addConstraint(c);
  }
  return { parts, list, constraints, D, M, riderMass, mountMass };
}

// Turn a living ragdoll into a limp corpse.
export function killRagdoll(world, rag) {
  const { parts } = rag;
  if (parts.saddle) {
    world.removeConstraint(parts.saddle);
    parts.saddle = null;
  }
  for (const b of rag.list) {
    const limb = b.collisionFilterGroup === G.LIMB;
    b.collisionFilterGroup = limb ? G.LIMB : G.CORPSE;
    b.collisionFilterMask = limb ? MASK.CORPSE_LIMB : MASK.CORPSE;
    b.linearDamping = 0.25;
    b.angularDamping = 0.5;
    b.allowSleep = true;
    b.wakeUp();
  }
}

export function removeRagdoll(world, rag) {
  for (const c of rag.constraints) if (c) world.removeConstraint(c);
  for (const b of rag.list) world.removeBody(b);
}

export function reviveRagdoll(world, rag) {
  for (const b of rag.list) {
    const limb = b.collisionFilterGroup === G.LIMB;
    b.collisionFilterGroup = limb ? G.LIMB : G.TORSO;
    b.collisionFilterMask = limb ? MASK.LIMB : MASK.TORSO;
    b.linearDamping = limb ? 0.1 : 0.08;
    b.angularDamping = 0.35;
    b.allowSleep = false;
    b.wakeUp();
  }
}
