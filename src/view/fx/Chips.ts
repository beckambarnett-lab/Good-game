// Wood chips: small instanced blocks thrown by each chop. Ballistic flight, one damped bounce on
// the snow, then they rest (and slowly sink) so a worked tree is surrounded by chips.

import {
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { box } from '../geo/Joinery.ts';

interface Chip {
  pos: Vector3;
  vel: Vector3;
  rot: Quaternion;
  spin: Vector3;
  age: number;
  resting: boolean;
  scale: number;
}

const GRAVITY = -9.8;
const LIFETIME = 14;

export class Chips {
  readonly mesh: InstancedMesh;
  private readonly chips: (Chip | null)[];
  private next = 0;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly s = new Vector3();

  constructor(capacity = 240) {
    const geo = box(0.06, 0.015, 0.035, 0xffffff).toGeometry();
    this.mesh = new InstancedMesh(geo, new MeshLambertMaterial({ vertexColors: false }), capacity);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.chips = new Array(capacity).fill(null);
    for (let i = 0; i < capacity; i++) {
      this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
      this.mesh.setColorAt(i, new Color(0xffffff));
    }
  }

  /** Throw `count` chips from `origin` roughly along `dir` (unit, horizontal). */
  burst(origin: Vector3, dir: Vector3, count: number, colors: readonly number[]): void {
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % this.chips.length;
      const spread = new Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6);
      const vel = dir
        .clone()
        .multiplyScalar(1.2 + Math.random() * 2.2)
        .add(spread)
        .setY(1.2 + Math.random() * 2.4);
      this.chips[i] = {
        pos: origin.clone().add(new Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0)),
        vel,
        rot: new Quaternion().random(),
        spin: new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(25),
        age: 0,
        resting: false,
        scale: 0.6 + Math.random() * 0.9,
      };
      this.mesh.setColorAt(i, new Color(colors[Math.floor(Math.random() * colors.length)] ?? 0xd8a96e));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number, groundY: (x: number, z: number) => number): void {
    for (let i = 0; i < this.chips.length; i++) {
      const c = this.chips[i];
      if (!c) continue;
      c.age += dt;
      if (c.age > LIFETIME) {
        this.chips[i] = null;
        this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
        continue;
      }
      if (!c.resting) {
        c.vel.y += GRAVITY * dt;
        c.pos.addScaledVector(c.vel, dt);
        const ang = c.spin.length() * dt;
        if (ang > 0) c.rot.multiply(this.q.setFromAxisAngle(c.spin.clone().normalize(), ang));
        const gy = groundY(c.pos.x, c.pos.z) + 0.01;
        if (c.pos.y <= gy) {
          c.pos.y = gy;
          if (Math.abs(c.vel.y) > 1.2) {
            c.vel.y *= -0.25;
            c.vel.x *= 0.4;
            c.vel.z *= 0.4;
            c.spin.multiplyScalar(0.4);
          } else {
            c.resting = true;
          }
        }
      } else if (c.age > LIFETIME - 5) {
        // Settle into the snow before disappearing.
        c.pos.y -= dt * 0.012;
      }
      const shrink = c.age > LIFETIME - 1 ? Math.max(0, LIFETIME - c.age) : 1;
      this.s.setScalar(c.scale * shrink);
      this.mesh.setMatrixAt(i, this.m.compose(c.pos, c.rot, this.s));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
