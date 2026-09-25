// Dynamic resolution (Plan Part 5.10): watches frame cost and steps the render scale between the
// preset's floor and ceiling. Steps are small (0.05) and at most one per averaging window, so a
// change is never visible as a pop and the render targets are rebuilt rarely. Pure: it only
// decides the scale; the Stage applies it.

import type { DynamicResolutionTuning } from '../../data/tuning.ts';

/** Where a frame's cost came from: the GPU timer (ms of GPU work) or the frame interval. */
export type CostSource = 'gpu' | 'interval';

const EPSILON = 1e-9;

export class DynamicResolution {
  /** The current render scale. */
  scale: number;
  private readonly t: DynamicResolutionTuning;
  private floor: number;
  private ceiling: number;
  private windowMs = 0;
  private windowFrames = 0;
  private windowTime = 0;
  private calm = 0;
  private recoverAfter: number;
  private clock = 0;
  private lastRaise = Number.NEGATIVE_INFINITY;
  private settle: number;

  constructor(t: DynamicResolutionTuning, floor: number, ceiling: number) {
    this.t = t;
    this.floor = floor;
    this.ceiling = ceiling;
    this.scale = ceiling;
    this.recoverAfter = t.recoverAfter;
    this.settle = t.settleSeconds;
  }

  /** A new range (quality changed): starts at the ceiling and settles again before judging. */
  setRange(floor: number, ceiling: number): void {
    this.floor = floor;
    this.ceiling = ceiling;
    this.scale = ceiling;
    this.recoverAfter = this.t.recoverAfter;
    this.settle = this.t.settleSeconds;
    this.resetWindow();
    this.calm = 0;
  }

  /**
   * Feeds one frame: `seconds` of wall time it covered and its cost in ms from `source`.
   * `targetMs` is the frame-rate target's interval (16.7 ms at 60 fps). Returns true when the
   * scale changed.
   */
  sample(seconds: number, costMs: number, source: CostSource, targetMs: number): boolean {
    this.clock += seconds;
    if (this.settle > 0) {
      this.settle -= seconds;
      return false;
    }
    this.windowMs += costMs;
    this.windowFrames++;
    this.windowTime += seconds;
    if (this.windowTime < this.t.windowSeconds) return false;
    const average = this.windowMs / this.windowFrames;
    const window = this.windowTime;
    this.resetWindow();
    const t = this.t;
    const drop = source === 'gpu' ? t.dropAboveMs : targetMs * t.intervalDropRatio;
    const fine = source === 'gpu' ? t.recoverBelowMs : targetMs * t.intervalRecoverRatio;
    if (average > drop) {
      this.calm = 0;
      if (this.clock - this.lastRaise <= t.retreatWindow) {
        this.recoverAfter = Math.min(t.maxRecoverAfter, this.recoverAfter * 2);
      }
      if (this.scale > this.floor + EPSILON) {
        this.scale = round(Math.max(this.floor, this.scale - t.step));
        return true;
      }
      return false;
    }
    if (average < fine) {
      this.calm += window;
      if (this.calm >= this.recoverAfter - EPSILON && this.scale < this.ceiling - EPSILON) {
        this.scale = round(Math.min(this.ceiling, this.scale + t.step));
        this.calm = 0;
        this.lastRaise = this.clock;
        return true;
      }
      return false;
    }
    this.calm = 0;
    return false;
  }

  private resetWindow(): void {
    this.windowMs = 0;
    this.windowFrames = 0;
    this.windowTime = 0;
  }
}

/** Keeps scales on the 0.05 grid despite float drift. */
const round = (v: number) => Math.round(v * 1000) / 1000;
