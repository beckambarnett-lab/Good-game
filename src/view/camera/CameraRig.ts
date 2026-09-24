// Third-person orbit camera (Plan Part 2.3): yaw free, pitch and zoom clamped, critically damped
// springs for following and zooming, terrain collision that pulls in fast and releases slowly, and
// a lazy recenter behind the walker after a quiet spell. Thin occluders (trunks) will dither-fade
// rather than push the camera (HearthMaterial, M1).

import type { PerspectiveCamera } from 'three';
import { type SpringState, springStep } from '../../core/math/spring.ts';
import type { CameraRigTuning } from '../../data/tuning.ts';

const DEG = Math.PI / 180;
/** Collision probe spacing along the boom (m). */
const PROBE_STEP = 0.25;

export interface RigTarget {
  x: number;
  /** Feet height. */
  y: number;
  z: number;
  /** The walker's heading (rad; facing (sin, cos)). */
  yaw: number;
  /** Ground speed (m/s), for the recenter. */
  speed: number;
}

export interface RigInput {
  look: { x: number; y: number };
  zoom: number;
  looking: boolean;
}

export class CameraRig {
  /** View heading (rad; the camera looks along (sin yaw, cos yaw)). */
  yaw: number;
  /** Degrees above the target's horizon, looking down on it. */
  pitch: number;
  private readonly t: CameraRigTuning;
  private readonly groundAt: (x: number, z: number) => number;
  private readonly headHeight: number;
  private wanted: number;
  private readonly zoom: SpringState;
  private readonly collision: SpringState;
  private readonly fx: SpringState;
  private readonly fy: SpringState;
  private readonly fz: SpringState;
  private quiet = 0;
  private recenter = true;

  constructor(
    t: CameraRigTuning,
    groundAt: (x: number, z: number) => number,
    headHeight: number,
    start: RigTarget,
  ) {
    this.t = t;
    this.groundAt = groundAt;
    this.headHeight = headHeight;
    this.yaw = start.yaw;
    this.pitch = t.startPitch;
    this.wanted = t.distance;
    this.zoom = { value: t.distance, velocity: 0 };
    this.collision = { value: t.maxDistance, velocity: 0 };
    const ty = start.y + headHeight - t.targetDrop;
    this.fx = { value: start.x, velocity: 0 };
    this.fy = { value: ty, velocity: 0 };
    this.fz = { value: start.z, velocity: 0 };
  }

  /** The lazy recenter follows the Controls setting. */
  setRecenter(on: boolean): void {
    this.recenter = on;
  }

  /** Where the camera stands and what it looks at, after `dt` seconds of following `target`. */
  update(dt: number, target: RigTarget, input: RigInput, camera: PerspectiveCamera): void {
    const t = this.t;
    this.yaw += input.look.x;
    this.pitch = Math.min(t.maxPitch, Math.max(t.minPitch, this.pitch + input.look.y / DEG));
    this.wanted = Math.min(t.maxDistance, Math.max(t.minDistance, this.wanted + input.zoom));

    // Lazy recenter: after a quiet spell while walking, ease the view behind the heading.
    this.quiet = input.looking ? 0 : this.quiet + dt;
    if (this.recenter && this.quiet > t.recenterDelay && target.speed > 0.5) {
      let d = target.yaw - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const step = t.recenterRate * DEG * dt;
      this.yaw += Math.max(-step, Math.min(step, d));
    }

    springStep(this.fx, target.x, t.followOmega, dt);
    springStep(this.fy, target.y + this.headHeight - t.targetDrop, t.followOmega, dt);
    springStep(this.fz, target.z, t.followOmega, dt);
    springStep(this.zoom, this.wanted, t.zoomOmega, dt);

    // Boom direction from the target back to the camera.
    const cp = Math.cos(this.pitch * DEG);
    const bx = -Math.sin(this.yaw) * cp;
    const by = Math.sin(this.pitch * DEG);
    const bz = -Math.cos(this.yaw) * cp;

    // Walk out along the boom; stop before the probe would touch the ground.
    let allowed = t.maxDistance;
    for (let d = PROBE_STEP; d <= this.zoom.value; d += PROBE_STEP) {
      const px = this.fx.value + bx * d;
      const py = this.fy.value + by * d;
      const pz = this.fz.value + bz * d;
      if (py - t.probeRadius < this.groundAt(px, pz) + t.groundClearance) {
        allowed = Math.max(t.minDistance * 0.5, d - PROBE_STEP);
        break;
      }
    }
    const omega = allowed < this.collision.value ? t.pullInOmega : t.releaseOmega;
    springStep(this.collision, allowed, omega, dt);
    const dist = Math.min(this.zoom.value, this.collision.value);

    const cx = this.fx.value + bx * dist;
    const cz = this.fz.value + bz * dist;
    const cy = Math.max(this.fy.value + by * dist, this.groundAt(cx, cz) + t.groundClearance);
    camera.position.set(cx, cy, cz);
    camera.lookAt(this.fx.value, this.fy.value, this.fz.value);
  }

  /** Right and forward on the ground for camera-relative movement. */
  groundAxes(): { fx: number; fz: number; rx: number; rz: number } {
    return {
      fx: Math.sin(this.yaw),
      fz: Math.cos(this.yaw),
      rx: -Math.cos(this.yaw),
      rz: Math.sin(this.yaw),
    };
  }
}
