// A tree that can be chopped and felled: stump + crown pivoting at the notch. Handles the notch
// growing, the shiver on each chop, and the fall itself using the rigid-rod pivot equation
// θ'' = (3g / 2L)·sin θ (slow at first, then fast), with a landing bounce.

import { Group, Mesh, MeshLambertMaterial, Vector3 } from 'three';
import type { Rng } from '../../core/rng.ts';
import type { TreeSize } from '../../data/tuning.ts';
import { birch, notch, pine, type TreeParts } from '../../view/geo/trees.ts';

export interface TreeSpec {
  size: TreeSize;
  kind: 'pine' | 'birch';
  height: number;
  radius: number;
  label: string;
}

export const TREE_SPECS: Record<'small' | 'medium' | 'large', TreeSpec> = {
  small: { size: 'small', kind: 'birch', height: 7, radius: 0.11, label: 'Small birch' },
  medium: { size: 'medium', kind: 'pine', height: 10.5, radius: 0.17, label: 'Medium pine' },
  large: { size: 'large', kind: 'pine', height: 15, radius: 0.26, label: 'Large pine' },
};

type State = 'standing' | 'falling' | 'landed';

export class FellingTree {
  readonly group = new Group();
  readonly spec: TreeSpec;
  readonly parts: TreeParts;
  private readonly pivot = new Group();
  private readonly notchMesh: Mesh;
  private state: State = 'standing';
  /** Direction the tree falls (unit, horizontal). */
  private readonly fallDir = new Vector3();
  private readonly fallAxis = new Vector3();
  private theta = 0;
  private omega = 0;
  private bounced = false;
  private shiverT = 10;
  private shiverAmp = 0;
  private grow = 0;
  onLand: ((impactPoint: Vector3) => void) | null = null;

  constructor(spec: TreeSpec, rng: Rng, facing: Vector3) {
    this.spec = spec;
    this.parts =
      spec.kind === 'pine' ? pine(spec.height, spec.radius, rng) : birch(spec.height, spec.radius, rng);
    const mat = new MeshLambertMaterial({ vertexColors: true });
    const stump = new Mesh(this.parts.stump.toGeometry(), mat);
    stump.castShadow = true;
    stump.receiveShadow = true;
    const crown = new Mesh(this.parts.crown.toGeometry(), mat);
    crown.castShadow = true;
    this.pivot.position.y = this.parts.hingeY;
    this.pivot.add(crown);
    this.group.add(stump, this.pivot);

    // Notch faces the woodcutter; the tree falls away from them.
    this.fallDir.copy(facing).setY(0).normalize().negate();
    this.fallAxis.set(0, 1, 0).cross(this.fallDir).normalize();
    this.notchMesh = new Mesh(notch(spec.radius).toGeometry(), mat);
    this.notchMesh.position.copy(
      facing
        .clone()
        .setY(0)
        .normalize()
        .multiplyScalar(spec.radius * 0.7),
    );
    this.notchMesh.position.y = this.parts.hingeY;
    this.notchMesh.lookAt(this.notchMesh.position.clone().multiplyScalar(2).setY(this.parts.hingeY));
    this.notchMesh.scale.setScalar(0.001);
    this.group.add(this.notchMesh);
  }

  get standing(): boolean {
    return this.state === 'standing';
  }

  get landed(): boolean {
    return this.state === 'landed';
  }

  /** World-space point where chips fly from. */
  notchPoint(): Vector3 {
    return this.notchMesh.getWorldPosition(new Vector3());
  }

  crownCenter(): Vector3 {
    const local = new Vector3(0, this.spec.height * 0.55, 0);
    return this.pivot.localToWorld(local);
  }

  /** Visual response to a chop: notch deepens (progress 0..1) and the crown shivers. */
  chopped(progress: number, strength = 1): void {
    const s = Math.max(0.35, progress);
    this.notchMesh.scale.set(s, 0.6 + 0.4 * s, s);
    this.shiverT = 0;
    this.shiverAmp = 0.012 * strength * (0.8 + 0.4 * (this.spec.radius / 0.2));
  }

  /** A glancing miss: a tiny tremble only. */
  glanced(): void {
    this.shiverT = 0;
    this.shiverAmp = 0.003;
  }

  fall(): void {
    if (this.state !== 'standing') return;
    this.state = 'falling';
    this.theta = 0.035;
    this.omega = 0.12;
  }

  /** Fade-in growth for a fresh tree (0 → 1). */
  sprout(): void {
    this.grow = 0.001;
    this.group.scale.setScalar(0.001);
  }

  update(dt: number): void {
    if (this.grow > 0 && this.grow < 1) {
      this.grow = Math.min(1, this.grow + dt * 1.6);
      const k = this.grow;
      const overshoot = 1 + Math.sin(k * Math.PI) * 0.08;
      this.group.scale.set(1, k * overshoot, 1);
    }
    if (this.state === 'standing') {
      this.shiverT += dt;
      const a = this.shiverAmp * Math.exp(-this.shiverT / 0.35) * Math.sin(this.shiverT * Math.PI * 2 * 3.2);
      this.pivot.setRotationFromAxisAngle(this.fallAxis, a);
      return;
    }
    if (this.state === 'falling') {
      const L = this.spec.height - this.parts.hingeY;
      const g = 9.8;
      // Integrate in small steps for a smooth, stable fall.
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const h = dt / steps;
        this.omega += ((3 * g) / (2 * L)) * Math.sin(this.theta) * h;
        this.theta += this.omega * h;
      }
      const ground = Math.PI / 2 - 0.02;
      if (this.theta >= ground) {
        this.theta = ground;
        if (!this.bounced) {
          this.bounced = true;
          this.omega = -this.omega * 0.12;
          const tip = this.fallDir
            .clone()
            .multiplyScalar(L * 0.6)
            .add(this.group.position);
          this.onLand?.(tip);
        } else {
          this.omega = 0;
          this.state = 'landed';
        }
      }
      this.pivot.setRotationFromAxisAngle(this.fallAxis, this.theta);
    }
  }
}
