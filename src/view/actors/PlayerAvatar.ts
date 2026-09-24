// Placeholder walker for the M0 valley (the Blender character arrives in M1, Plan Part 5.6): the
// felling lab's woodcutter look, with legs and arms that swing with distance walked, a gentle bob,
// and a footfall callback at each heel strike for footstep sounds.

import { Group, Mesh, MeshLambertMaterial } from 'three';
import { Rng } from '../../core/rng.ts';
import type { GaitTuning, MovementTuning } from '../../data/tuning.ts';
import { blob, box, cylinder, merge } from '../geo/Joinery.ts';
import { palette } from '../render/palette.ts';

/** Standing still, the legs ease back together at this rate per frame. */
const SETTLE = 0.9;
/** Below this speed (m/s) the figure counts as standing still. */
const STILL = 0.05;

export class PlayerAvatar {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly legs: [Group, Group] = [new Group(), new Group()];
  private readonly arms: [Group, Group] = [new Group(), new Group()];
  private phase = 0;
  private breath = 0;
  private readonly gait: GaitTuning;
  private readonly move: MovementTuning;
  onFootfall: ((side: 0 | 1) => void) | null = null;

  /** Both tunings are read every frame, so live-tuned objects take effect at once. */
  constructor(seed: number, gait: GaitTuning, move: MovementTuning) {
    this.gait = gait;
    this.move = move;
    const rng = new Rng(seed).fork('avatar');
    const mat = new MeshLambertMaterial({ vertexColors: true });
    const mesh = (geo: ReturnType<ReturnType<typeof merge>['toGeometry']>) => {
      const m = new Mesh(geo, mat);
      m.castShadow = true;
      return m;
    };
    this.legs.forEach((leg, i) => {
      const side = i === 0 ? -1 : 1;
      leg.position.set(side * 0.12, 0.78, 0);
      leg.add(
        mesh(
          merge(
            box(0.17, 0.78, 0.2, palette.navy).at(0, -0.39, 0),
            box(0.2, 0.14, 0.32, palette.boot).at(0, -0.71, 0.05),
          ).toGeometry(),
        ),
      );
      this.root.add(leg);
    });
    this.body.position.y = 0.78;
    this.body.add(
      mesh(
        merge(
          cylinder(0.3, 0.26, 0.62, 7, palette.barnRed).tint(0.03, rng),
          box(0.56, 0.06, 0.4, palette.plaidDark).at(0, 0.2, 0),
          box(0.56, 0.06, 0.4, palette.plaidDark).at(0, 0.42, 0),
          cylinder(0.27, 0.27, 0.08, 7, palette.boot).at(0, 0.02, 0),
          blob(0.17, palette.skin, 1).at(0, 0.84, 0),
          cylinder(0.19, 0.05, 0.22, 7, palette.mustard).at(0, 0.93, 0),
          blob(0.07, palette.cream).at(0, 1.16, 0),
          box(0.3, 0.08, 0.1, palette.cream).at(0, 0.64, 0.12),
        ).toGeometry(),
      ),
    );
    this.arms.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1;
      arm.position.set(side * 0.36, 0.58, 0);
      arm.add(
        mesh(
          merge(
            box(0.13, 0.52, 0.14, palette.barnRed).at(0, -0.26, 0),
            box(0.14, 0.12, 0.15, palette.plaidDark).at(0, -0.56, 0),
          ).toGeometry(),
        ),
      );
      this.body.add(arm);
    });
    this.root.add(this.body);
  }

  /**
   * Poses the figure at its interpolated position, animating the gait from ground speed. A heel
   * strikes (and `onFootfall` fires) each half gait cycle, only while grounded.
   */
  update(x: number, y: number, z: number, yaw: number, speed: number, grounded: boolean, dt: number): void {
    const g = this.gait;
    const walk = this.move.walkSpeed;
    const jog = this.move.jogSpeed;
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
    const jogMix = Math.min(1, Math.max(0, (speed - walk) / Math.max(0.01, jog - walk)));
    const step = g.walkStep + (g.jogStep - g.walkStep) * jogMix;
    const before = this.phase;
    // One gait cycle (2π) is two steps.
    this.phase += (speed * dt * Math.PI) / step;
    const halfBefore = Math.floor(before / Math.PI);
    const halfNow = Math.floor(this.phase / Math.PI);
    if (halfNow !== halfBefore && grounded && speed > g.minStepSpeed) {
      this.onFootfall?.((halfNow % 2) as 0 | 1);
    }
    if (speed < STILL) this.phase *= SETTLE;

    const amount = Math.min(1, speed / walk);
    const swing = (g.walkSwing + (g.jogSwing - g.walkSwing) * jogMix) * amount;
    const s = Math.sin(this.phase);
    this.legs[0].rotation.x = s * swing;
    this.legs[1].rotation.x = -s * swing;
    this.arms[0].rotation.x = -s * swing * 0.8;
    this.arms[1].rotation.x = s * swing * 0.8;
    this.breath += dt;
    const bob = Math.abs(Math.cos(this.phase)) * g.bob * amount;
    this.body.position.y = 0.78 + bob + Math.sin(this.breath * 1.6) * 0.006;
    this.body.rotation.x = g.jogLean * jogMix;
  }
}
