// Shared test world: the clock plus a system whose state depends on its random stream every step.
import type { Rng } from '../../src/core/rng.ts';
import { clock as clockTuning, sim as simTuning } from '../../src/data/tuning.ts';
import { ClockSystem } from '../../src/sim/clock/ClockSystem.ts';
import { Sim, type SimContext, type SimSystem } from '../../src/sim/Sim.ts';

export class Walker implements SimSystem {
  readonly id = 'walker';
  x = 0;
  private rng!: Rng;

  init(ctx: SimContext): void {
    this.rng = ctx.rng('walker');
  }

  fixedUpdate(dt: number): void {
    this.x += this.rng.range(-1, 1) * dt;
  }

  advance(gameMinutes: number): void {
    for (let i = 0; i < gameMinutes; i++) this.x += this.rng.gaussian();
  }

  serialize(): unknown {
    return { x: this.x };
  }

  deserialize(data: unknown): void {
    this.x = (data as { x: number }).x;
  }
}

export const makeSim = (seed: number): Sim =>
  new Sim(seed, simTuning.stepHz, [new ClockSystem(clockTuning), new Walker()]).init();
