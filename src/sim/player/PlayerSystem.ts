// The player as a sim system: applies the latest move intent each fixed step, keeps the previous
// step's pose for render interpolation, and saves where the player stands.

import type { MovementTuning } from '../../data/tuning.ts';
import type { SimContext, SimSystem } from '../Sim.ts';
import { type MoveIntent, type MovementWorld, type MoverState, spawnMover, stepMover } from './Movement.ts';

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

interface PlayerSave {
  x: number;
  z: number;
  yaw: number;
}

export class PlayerSystem implements SimSystem {
  readonly id = 'player';
  readonly state: MoverState;
  /** The pose before the latest step; render blends it with `state` by the loop's alpha. */
  readonly prev: Pose;
  private readonly world: MovementWorld;
  private readonly tuning: MovementTuning;
  private readonly intent: MoveIntent = { x: 0, z: 0, jog: false, hop: false };

  constructor(world: MovementWorld, tuning: MovementTuning, spawn: { x: number; z: number; yaw: number }) {
    this.world = world;
    this.tuning = tuning;
    this.state = spawnMover(world, spawn.x, spawn.z, spawn.yaw);
    this.prev = { x: this.state.x, y: this.state.y, z: this.state.z, yaw: this.state.yaw };
  }

  init(_ctx: SimContext): void {}

  /** The latest wish from input; a hop stays pending until a grounded step takes it. */
  setIntent(x: number, z: number, jog: boolean, hop: boolean): void {
    this.intent.x = x;
    this.intent.z = z;
    this.intent.jog = jog;
    this.intent.hop = this.intent.hop || hop;
  }

  fixedUpdate(dt: number): void {
    const s = this.state;
    this.prev.x = s.x;
    this.prev.y = s.y;
    this.prev.z = s.z;
    this.prev.yaw = s.yaw;
    const wasGrounded = s.grounded;
    stepMover(s, this.intent, this.world, this.tuning, dt);
    if (wasGrounded && !s.grounded) this.intent.hop = false;
    if (s.grounded) this.intent.hop = false;
  }

  advance(): void {}

  /** Pose blended between the last two steps (alpha from the frame loop). */
  pose(alpha: number, out: Pose): Pose {
    const s = this.state;
    out.x = this.prev.x + (s.x - this.prev.x) * alpha;
    out.y = this.prev.y + (s.y - this.prev.y) * alpha;
    out.z = this.prev.z + (s.z - this.prev.z) * alpha;
    let dy = s.yaw - this.prev.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    out.yaw = this.prev.yaw + dy * alpha;
    return out;
  }

  serialize(): PlayerSave {
    return { x: this.state.x, z: this.state.z, yaw: this.state.yaw };
  }

  deserialize(data: unknown): void {
    const d = data as Partial<PlayerSave> | null;
    if (!d || ![d.x, d.z, d.yaw].every((v) => typeof v === 'number' && Number.isFinite(v))) {
      throw new Error('PlayerSystem: bad save data');
    }
    Object.assign(this.state, spawnMover(this.world, d.x as number, d.z as number, d.yaw as number));
    this.prev.x = this.state.x;
    this.prev.y = this.state.y;
    this.prev.z = this.state.z;
    this.prev.yaw = this.state.yaw;
  }
}
