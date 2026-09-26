// Player movement (Plan Part 2.3): a kinematic capsule on the heightfield, stepped at the fixed
// rate. Walk and jog with the planned acceleration and stopping, turn toward the heading at a
// capped rate, slide gently on ice, refuse ground steeper than the walkable slope, slide around
// tree trunks, stay inside the world, and hop for fun. Pure: the view turns input into intents.

import type { MovementTuning } from '../../data/tuning.ts';
import { SURFACE } from '../../data/world/terrain.ts';

export interface MoveIntent {
  /** Wanted direction on the ground (world x, z), length 0–1 (analog sticks give less than 1). */
  x: number;
  z: number;
  jog: boolean;
  /** Hop on the next grounded step. */
  hop: boolean;
}

/** A vertical cylinder the capsule can't enter (tree trunks, stumps). */
export interface Collider {
  x: number;
  z: number;
  r: number;
}

export interface MovementWorld {
  heightAt(x: number, z: number): number;
  /** Unit ground normal. */
  normalAt(
    x: number,
    z: number,
    out: { x: number; y: number; z: number },
  ): { x: number; y: number; z: number };
  surfaceAt(x: number, z: number): number;
  /** Colliders within `radius` of (x, z). */
  collidersNear(x: number, z: number, radius: number, out: Collider[]): Collider[];
  /** Half the world's edge length (m). */
  halfSize: number;
}

export interface MoverState {
  x: number;
  y: number;
  z: number;
  /** Horizontal velocity (m/s). */
  vx: number;
  vz: number;
  /** Vertical velocity while airborne (m/s). */
  vy: number;
  /** Facing (rad): 0 faces +z, and the facing vector is (sin yaw, cos yaw). */
  yaw: number;
  grounded: boolean;
  surface: number;
}

const DEG = Math.PI / 180;
/** Passes of trunk push-out per step (two settle a capsule wedged between trees). */
const COLLISION_PASSES = 2;
/** Below this speed (m/s) the heading stops following the velocity. */
const TURN_MIN_SPEED = 0.1;

export function spawnMover(world: MovementWorld, x: number, z: number, yaw: number): MoverState {
  return {
    x,
    y: world.heightAt(x, z),
    z,
    vx: 0,
    vz: 0,
    vy: 0,
    yaw,
    grounded: true,
    surface: world.surfaceAt(x, z),
  };
}

const scratchNormal = { x: 0, y: 1, z: 0 };
const scratchColliders: Collider[] = [];

export function stepMover(
  s: MoverState,
  intent: MoveIntent,
  world: MovementWorld,
  t: MovementTuning,
  dt: number,
): void {
  const onIce = s.surface === SURFACE.lakeIce || s.surface === SURFACE.creekIce;
  const grip = onIce ? t.iceGrip : 1;

  // Target velocity from the intent (analog magnitude kept, capped at 1).
  let ix = intent.x;
  let iz = intent.z;
  const mag = Math.hypot(ix, iz);
  if (mag > 1) {
    ix /= mag;
    iz /= mag;
  }
  const top = (intent.jog ? t.jogSpeed : t.walkSpeed) * (onIce ? t.iceSpeed : 1);
  const tx = ix * top;
  const tz = iz * top;

  // Accelerate toward it: speeding up takes accelTime to reach walking pace, stopping takes stopTime.
  const dx = tx - s.vx;
  const dz = tz - s.vz;
  const dist = Math.hypot(dx, dz);
  const speedingUp = Math.hypot(tx, tz) >= Math.hypot(s.vx, s.vz);
  const rate = (t.walkSpeed / (speedingUp ? t.accelTime : t.stopTime)) * grip * dt;
  if (dist <= rate) {
    s.vx = tx;
    s.vz = tz;
  } else {
    s.vx += (dx / dist) * rate;
    s.vz += (dz / dist) * rate;
  }

  // No walking up ground steeper than maxSlope: drop the uphill part of the velocity.
  const ahead = world.normalAt(s.x + s.vx * dt, s.z + s.vz * dt, scratchNormal);
  if (Math.acos(Math.min(1, ahead.y)) > t.maxSlope * DEG) {
    const ux = -ahead.x;
    const uz = -ahead.z;
    const ul = Math.hypot(ux, uz);
    if (ul > 1e-6) {
      const up = (s.vx * ux + s.vz * uz) / ul;
      if (up > 0) {
        s.vx -= (up * ux) / ul;
        s.vz -= (up * uz) / ul;
      }
    }
  }

  let nx = s.x + s.vx * dt;
  let nz = s.z + s.vz * dt;

  // Slide around trunks.
  const reach = t.capsuleRadius + 1;
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    for (const c of world.collidersNear(nx, nz, reach, scratchColliders)) {
      const ox = nx - c.x;
      const oz = nz - c.z;
      const d = Math.hypot(ox, oz);
      const min = c.r + t.capsuleRadius;
      if (d >= min) continue;
      const ux = d > 1e-6 ? ox / d : 1;
      const uz = d > 1e-6 ? oz / d : 0;
      nx = c.x + ux * min;
      nz = c.z + uz * min;
      const into = s.vx * ux + s.vz * uz;
      if (into < 0) {
        s.vx -= into * ux;
        s.vz -= into * uz;
      }
    }
  }

  // Stay inside the world.
  const limit = world.halfSize - t.worldMargin;
  if (Math.abs(nx) > limit) {
    nx = Math.sign(nx) * limit;
    s.vx = 0;
  }
  if (Math.abs(nz) > limit) {
    nz = Math.sign(nz) * limit;
    s.vz = 0;
  }
  s.x = nx;
  s.z = nz;

  // Vertical: follow the ground, or fly the hop and land.
  const ground = world.heightAt(s.x, s.z);
  if (s.grounded && intent.hop) {
    s.vy = Math.sqrt(2 * t.gravity * t.hopHeight);
    s.grounded = false;
  }
  if (s.grounded) {
    s.y = ground;
  } else {
    s.vy -= t.gravity * dt;
    s.y += s.vy * dt;
    if (s.y <= ground) {
      s.y = ground;
      s.vy = 0;
      s.grounded = true;
    }
  }

  // Turn toward the heading at a capped rate.
  if (Math.hypot(s.vx, s.vz) > TURN_MIN_SPEED) {
    const want = Math.atan2(s.vx, s.vz);
    let delta = want - s.yaw;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    const maxTurn = t.turnRate * DEG * dt;
    s.yaw += Math.max(-maxTurn, Math.min(maxTurn, delta));
    s.yaw = Math.atan2(Math.sin(s.yaw), Math.cos(s.yaw));
  }
  s.surface = world.surfaceAt(s.x, s.z);
}
