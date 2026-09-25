// Dev cheats (Plan Part 7.3, M0): skip time and teleport. Weather and coin cheats join when the
// Environment (M1.7) and the economy (M1.9) exist. Time jumps go through the sim's coarse
// `advance`, the same path sleeping will use, so they exercise real code.

import type { Place } from '../data/world/places.ts';
import type { Clock, Pace } from '../sim/clock/Clock.ts';

export interface CheatTarget {
  readonly clock: Clock;
  /** Skips game time through every system's coarse advance. */
  advanceMinutes(minutes: number): void;
  teleport(x: number, z: number, yaw: number): void;
}

const PACES: readonly Pace[] = ['relaxed', 'standard', 'brisk'];

export class Cheats {
  private readonly target: CheatTarget;
  private readonly places: readonly Place[];

  constructor(target: CheatTarget, places: readonly Place[]) {
    this.target = target;
    this.places = places;
  }

  addHours(hours: number): void {
    this.target.advanceMinutes(Math.round(hours * 60));
  }

  /** Skips ahead to the next time the clock reads `hour`:00. */
  skipTo(hour: number): void {
    this.target.advanceMinutes(this.target.clock.minutesUntil(hour));
  }

  toggleFreeze(): boolean {
    const clock = this.target.clock;
    clock.frozen = !clock.frozen;
    return clock.frozen;
  }

  cyclePace(): Pace {
    const clock = this.target.clock;
    clock.pace = PACES[(PACES.indexOf(clock.pace) + 1) % PACES.length] ?? 'standard';
    return clock.pace;
  }

  /** Teleports to a named place; false if there's no such place. */
  goTo(placeId: string): boolean {
    const p = this.places.find((place) => place.id === placeId);
    if (!p) return false;
    this.target.teleport(p.x, p.z, p.yaw);
    return true;
  }
}
