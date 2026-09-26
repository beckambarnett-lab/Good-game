// The clock as a sim system: ticks game time each fixed step, skips time on `advance`, and emits
// an event at every game hour and at the daily rollover (06:00).

import type { EventBus } from '../../core/EventBus.ts';
import type { ClockTuning } from '../../data/tuning.ts';
import type { SimEvents } from '../events.ts';
import type { SimContext, SimSystem } from '../Sim.ts';
import { Clock, type Pace } from './Clock.ts';

interface ClockSave {
  minutes: number;
  pace: Pace;
  frozen: boolean;
}

const PACES: readonly Pace[] = ['relaxed', 'standard', 'brisk'];

export class ClockSystem implements SimSystem {
  readonly id = 'clock';
  readonly clock: Clock;
  private readonly tuning: ClockTuning;
  private events: EventBus<SimEvents> | undefined;
  /** Index of the last game hour announced (minutes / 60, floored). */
  private announcedHour: number;

  constructor(tuning: ClockTuning) {
    this.tuning = tuning;
    this.clock = new Clock(tuning);
    this.announcedHour = Math.floor(this.clock.minutes / 60);
  }

  init(ctx: SimContext): void {
    this.events = ctx.events;
  }

  fixedUpdate(dt: number): void {
    this.clock.tick(dt);
    this.announce();
  }

  advance(gameMinutes: number): void {
    this.clock.advanceMinutes(gameMinutes);
    this.announce();
  }

  serialize(): ClockSave {
    return { minutes: this.clock.minutes, pace: this.clock.pace, frozen: this.clock.frozen };
  }

  deserialize(data: unknown): void {
    const d = data as Partial<ClockSave> | null;
    if (!d || typeof d.minutes !== 'number' || !Number.isFinite(d.minutes) || d.minutes < 0) {
      throw new Error('ClockSystem: bad save data');
    }
    this.clock.minutes = d.minutes;
    this.clock.pace = PACES.includes(d.pace as Pace) ? (d.pace as Pace) : 'standard';
    this.clock.frozen = d.frozen === true;
    this.announcedHour = Math.floor(d.minutes / 60);
  }

  private announce(): void {
    const hourIndex = Math.floor(this.clock.minutes / 60);
    while (this.announcedHour < hourIndex) {
      this.announcedHour++;
      const hour = this.announcedHour % 24;
      const absoluteDay = Math.floor(this.announcedHour / 24) + 1;
      this.events?.emit('clock/hour', { hour, absoluteDay });
      if (hour === this.tuning.rolloverHour) this.events?.emit('clock/rollover', { absoluteDay });
    }
  }
}
