// Fixed-timestep accumulator (Plan Part 7.3): the sim steps at a fixed rate whatever the display
// refresh, with a cap on catch-up steps so a slow frame can't snowball ("spiral of death"), and an
// interpolation alpha so 120/144 Hz displays render smoothly between steps.

export interface StepPlan {
  /** Fixed steps to run this frame. */
  steps: number;
  /** How far (0–1) the render sits between the last step and the next. */
  alpha: number;
  /** Seconds of backlog discarded because it exceeded the catch-up cap. */
  dropped: number;
}

export class FixedStepper {
  readonly step: number;
  readonly maxSteps: number;
  private accumulator = 0;

  constructor(step: number, maxSteps: number) {
    if (!(step > 0) || !(maxSteps >= 1)) throw new Error('FixedStepper: step > 0 and maxSteps >= 1');
    this.step = step;
    this.maxSteps = maxSteps;
  }

  /** Feeds a frame's real elapsed seconds and plans the steps for it. */
  frame(realSeconds: number): StepPlan {
    this.accumulator += Math.max(0, realSeconds);
    let steps = Math.floor(this.accumulator / this.step);
    let dropped = 0;
    if (steps > this.maxSteps) {
      dropped = (steps - this.maxSteps) * this.step;
      steps = this.maxSteps;
    }
    this.accumulator -= steps * this.step + dropped;
    return { steps, alpha: this.accumulator / this.step, dropped };
  }

  reset(): void {
    this.accumulator = 0;
  }
}
