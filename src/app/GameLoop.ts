// The frame loop (Plan Part 7.3): requestAnimationFrame drives rendering; a FixedStepper turns
// real time into fixed 60 Hz sim steps (capped catch-up) plus an interpolation alpha for render.
// The frame clock is injected so the loop runs under fake time in Node tests.

import type { FixedStepper } from '../core/fixedStep.ts';

export interface FrameClock {
  /** Milliseconds, monotonic. */
  now(): number;
  request(cb: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

export const browserFrameClock: FrameClock = {
  now: () => performance.now(),
  request: (cb) => requestAnimationFrame(cb),
  cancel: (h) => cancelAnimationFrame(h),
};

export interface LoopHooks {
  /** One fixed simulation step of `dt` seconds. */
  step(dt: number): void;
  /** Draws a frame: `alpha` interpolates between the last two sim states; `frameSeconds` is clamped. */
  render(alpha: number, frameSeconds: number): void;
}

export interface LoopStats {
  /** Smoothed frame interval (ms) and rate. */
  frameMs: number;
  fps: number;
  stepsLastFrame: number;
  /** Total seconds of sim backlog dropped by the catch-up cap. */
  droppedSeconds: number;
}

/** A capped frame may arrive this early (ms) and still count, so vsync jitter doesn't halve the rate. */
const CAP_SLACK_MS = 1.5;
/** Weight of the newest frame in the smoothed stats. */
const STATS_SMOOTHING = 0.1;

export class GameLoop {
  /** Frames per second to render at most (null = every display frame). */
  fpsCap: number | null = null;
  readonly stats: LoopStats = { frameMs: 0, fps: 0, stepsLastFrame: 0, droppedSeconds: 0 };
  private readonly stepper: FixedStepper;
  private readonly hooks: LoopHooks;
  private readonly clock: FrameClock;
  private readonly maxRenderDelta: number;
  private simOn = true;
  private handle: number | null = null;
  private lastFrameMs = 0;

  constructor(stepper: FixedStepper, hooks: LoopHooks, clock: FrameClock, maxRenderDeltaSeconds: number) {
    this.stepper = stepper;
    this.hooks = hooks;
    this.clock = clock;
    this.maxRenderDelta = maxRenderDeltaSeconds;
  }

  get running(): boolean {
    return this.handle !== null;
  }

  get simRunning(): boolean {
    return this.simOn;
  }

  start(): void {
    if (this.handle !== null) return;
    this.lastFrameMs = this.clock.now();
    this.stepper.reset();
    this.handle = this.clock.request(this.tick);
  }

  stop(): void {
    if (this.handle === null) return;
    this.clock.cancel(this.handle);
    this.handle = null;
  }

  /** Pauses or resumes sim steps. Resuming never replays the paused time. */
  setSimRunning(on: boolean): void {
    if (on && !this.simOn) this.stepper.reset();
    this.simOn = on;
  }

  private readonly tick = (timeMs: number): void => {
    this.handle = this.clock.request(this.tick);
    const elapsedMs = timeMs - this.lastFrameMs;
    if (this.fpsCap !== null && elapsedMs < 1000 / this.fpsCap - CAP_SLACK_MS) return;
    this.lastFrameMs = timeMs;
    const elapsed = Math.max(0, elapsedMs / 1000);

    let alpha = 1;
    let steps = 0;
    if (this.simOn) {
      const plan = this.stepper.frame(elapsed);
      for (let i = 0; i < plan.steps; i++) this.hooks.step(this.stepper.step);
      steps = plan.steps;
      alpha = plan.alpha;
      this.stats.droppedSeconds += plan.dropped;
    }
    this.hooks.render(alpha, Math.min(elapsed, this.maxRenderDelta));

    this.stats.stepsLastFrame = steps;
    const ms = elapsed * 1000;
    this.stats.frameMs =
      this.stats.frameMs === 0 ? ms : this.stats.frameMs + (ms - this.stats.frameMs) * STATS_SMOOTHING;
    this.stats.fps = this.stats.frameMs > 0 ? 1000 / this.stats.frameMs : 0;
  };
}
