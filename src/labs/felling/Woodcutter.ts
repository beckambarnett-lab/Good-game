// Placeholder woodcutter for the felling lab: a chunky low-poly figure with a two-handed axe
// swing. Swing phases: quick wind-up (anticipation), fast strike, impact, follow-through
// recovery. The real character arrives later from the Blender kit (Plan Part 5.6).

import { Group, Mesh, MeshLambertMaterial } from 'three';
import type { Rng } from '../../core/rng.ts';
import { blob, box, cylinder, merge } from '../../view/geo/Joinery.ts';
import { palette } from '../../view/render/palette.ts';

const WINDUP = 0.13;
const STRIKE = 0.09;
const RECOVER = 0.38;

type Phase = 'idle' | 'windup' | 'strike' | 'recover';

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class Woodcutter {
  readonly root = new Group();
  private readonly torso = new Group();
  private readonly swing = new Group();
  private phase: Phase = 'idle';
  private t = 0;
  private onImpact: (() => void) | null = null;
  private breath = 0;

  // Swing angles (radians around the swing group's X axis).
  private readonly guard = -0.35;
  private readonly raised = -2.35;
  private readonly impact = 0.55;

  constructor(rng: Rng) {
    const mat = new MeshLambertMaterial({ vertexColors: true });
    const legs = merge(
      box(0.17, 0.78, 0.2, palette.navy).at(-0.12, 0.39, 0),
      box(0.17, 0.78, 0.2, palette.navy).at(0.12, 0.39, 0),
      box(0.2, 0.14, 0.32, palette.boot).at(-0.12, 0.07, 0.05),
      box(0.2, 0.14, 0.32, palette.boot).at(0.12, 0.07, 0.05),
    );
    const legsMesh = new Mesh(legs.toGeometry(), mat);
    legsMesh.castShadow = true;
    this.root.add(legsMesh);

    this.torso.position.y = 0.78;
    const coat = merge(
      cylinder(0.3, 0.26, 0.62, 7, palette.barnRed).tint(0.03, rng),
      box(0.56, 0.06, 0.4, palette.plaidDark).at(0, 0.2, 0),
      box(0.56, 0.06, 0.4, palette.plaidDark).at(0, 0.42, 0),
      cylinder(0.27, 0.27, 0.08, 7, palette.boot).at(0, 0.02, 0),
      blob(0.17, palette.skin, 1).at(0, 0.84, 0),
      cylinder(0.19, 0.05, 0.22, 7, palette.mustard).at(0, 0.93, 0),
      blob(0.07, palette.cream).at(0, 1.16, 0),
      box(0.3, 0.08, 0.1, palette.cream).at(0, 0.64, 0.12),
    );
    const torsoMesh = new Mesh(coat.toGeometry(), mat);
    torsoMesh.castShadow = true;
    this.torso.add(torsoMesh);
    this.root.add(this.torso);

    // Arms + axe pivot at the shoulders, tilted for a diagonal chopping plane.
    this.swing.position.set(0, 0.55, 0.05);
    this.swing.rotation.z = -0.55;
    const armsAndAxe = merge(
      box(0.13, 0.13, 0.5, palette.barnRed).at(-0.14, 0, 0.25),
      box(0.13, 0.13, 0.5, palette.barnRed).at(0.14, 0, 0.25),
      blob(0.075, palette.mustard).at(0, 0, 0.52),
      cylinder(0.025, 0.022, 0.85, 6, palette.handle)
        .rot(Math.PI / 2, 0, 0)
        .at(0, 0, 0.45),
      box(0.04, 0.2, 0.14, palette.steel).at(0, -0.06, 1.26),
      box(0.02, 0.22, 0.04, 0xdfe6ee).at(0, -0.06, 1.34),
    );
    const armsMesh = new Mesh(armsAndAxe.toGeometry(), mat);
    armsMesh.castShadow = true;
    this.swing.add(armsMesh);
    this.torso.add(this.swing);
    this.setSwing(this.guard);
  }

  /** Start a swing; `impact` fires at the moment the axe meets the trunk. */
  chop(impact: () => void): boolean {
    if (this.phase === 'windup' || this.phase === 'strike') return false;
    this.phase = 'windup';
    this.t = 0;
    this.onImpact = impact;
    return true;
  }

  get busy(): boolean {
    return this.phase === 'windup' || this.phase === 'strike';
  }

  update(dt: number): void {
    this.breath += dt;
    this.t += dt;
    switch (this.phase) {
      case 'idle':
        this.setSwing(this.guard + Math.sin(this.breath * 1.6) * 0.03);
        this.torso.rotation.x = Math.sin(this.breath * 1.6) * 0.015;
        break;
      case 'windup': {
        const k = easeOut(Math.min(1, this.t / WINDUP));
        this.setSwing(this.guard + (this.raised - this.guard) * k);
        this.torso.rotation.x = -0.12 * k;
        if (this.t >= WINDUP) {
          this.phase = 'strike';
          this.t = 0;
        }
        break;
      }
      case 'strike': {
        const k = easeIn(Math.min(1, this.t / STRIKE));
        this.setSwing(this.raised + (this.impact - this.raised) * k);
        this.torso.rotation.x = -0.12 + 0.3 * k;
        if (this.t >= STRIKE) {
          this.phase = 'recover';
          this.t = 0;
          this.onImpact?.();
          this.onImpact = null;
        }
        break;
      }
      case 'recover': {
        const k = easeInOut(Math.min(1, this.t / RECOVER));
        // A tiny rebound off the wood, then back to guard.
        const rebound = Math.sin(Math.min(1, this.t / 0.12) * Math.PI) * -0.18;
        this.setSwing(this.impact + (this.guard - this.impact) * k + rebound * (1 - k));
        this.torso.rotation.x = 0.18 * (1 - k);
        if (this.t >= RECOVER) this.phase = 'idle';
        break;
      }
    }
  }

  private setSwing(angle: number): void {
    this.swing.rotation.x = angle;
  }
}
