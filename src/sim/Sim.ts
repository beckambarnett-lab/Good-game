// The headless world orchestrator (Plan Part 7.3). Owns the ordered list of systems, steps them at
// a fixed rate, skips time coarsely, and serializes everything (including every random stream)
// so a loaded world continues exactly as the saved one would have.

import { EventBus } from '../core/EventBus.ts';
import { Rng } from '../core/rng.ts';
import type { SimEvents } from './events.ts';

export interface SimContext {
  readonly seed: number;
  readonly events: EventBus<SimEvents>;
  /** The random stream for a label: stable per label and saved with the world. */
  rng(label: string): Rng;
  /** Another system by id (systems are initialised in order, so look up in `init`). */
  system<T extends SimSystem>(id: string): T;
}

export interface SimSystem {
  readonly id: string;
  init(ctx: SimContext): void;
  /** One fixed step of `dt` seconds (1/60). */
  fixedUpdate(dt: number): void;
  /** A coarse skip of game minutes (sleep, background, tests, the econ sim). */
  advance(gameMinutes: number): void;
  serialize(): unknown;
  deserialize(data: unknown, saveVersion: number): void;
}

/** Everything the sim needs to resume: the part of a save file the systems own. */
export interface SimSnapshot {
  seed: number;
  steps: number;
  rng: Record<string, number[]>;
  systems: Record<string, unknown>;
}

export class Sim {
  readonly seed: number;
  readonly dt: number;
  readonly events = new EventBus<SimEvents>();
  /** Fixed steps taken since the world began. */
  steps = 0;
  private readonly order: SimSystem[];
  private readonly byId = new Map<string, SimSystem>();
  private readonly root: Rng;
  private readonly streams = new Map<string, Rng>();
  private initialised = false;

  constructor(seed: number, stepHz: number, systems: SimSystem[]) {
    this.seed = seed >>> 0;
    this.dt = 1 / stepHz;
    this.root = new Rng(this.seed);
    this.order = systems;
    for (const s of systems) {
      if (this.byId.has(s.id)) throw new Error(`Sim: duplicate system id '${s.id}'`);
      this.byId.set(s.id, s);
    }
  }

  init(): this {
    if (this.initialised) throw new Error('Sim.init called twice');
    const ctx: SimContext = {
      seed: this.seed,
      events: this.events,
      rng: (label) => this.stream(label),
      system: <T extends SimSystem>(id: string): T => {
        const s = this.byId.get(id);
        if (!s) throw new Error(`Sim: no system '${id}'`);
        return s as T;
      },
    };
    for (const s of this.order) s.init(ctx);
    this.initialised = true;
    return this;
  }

  /** One fixed step through every system, in order. */
  step(): void {
    for (const s of this.order) s.fixedUpdate(this.dt);
    this.steps++;
  }

  /** Coarse time skip, in game minutes. */
  advance(gameMinutes: number): void {
    if (!(gameMinutes > 0)) return;
    for (const s of this.order) s.advance(gameMinutes);
    this.events.emit('sim/advanced', { gameMinutes });
  }

  system<T extends SimSystem>(id: string): T {
    const s = this.byId.get(id);
    if (!s) throw new Error(`Sim: no system '${id}'`);
    return s as T;
  }

  serialize(): SimSnapshot {
    const rng: Record<string, number[]> = {};
    for (const label of [...this.streams.keys()].sort())
      rng[label] = (this.streams.get(label) as Rng).getState();
    const systems: Record<string, unknown> = {};
    for (const s of this.order) systems[s.id] = s.serialize();
    return { seed: this.seed, steps: this.steps, rng, systems };
  }

  /** Restores a snapshot into an initialised sim built with the same seed and systems. */
  deserialize(snap: SimSnapshot, saveVersion: number): void {
    if (!this.initialised) throw new Error('Sim.deserialize before init');
    if (snap.seed >>> 0 !== this.seed) throw new Error('Sim.deserialize: seed mismatch');
    this.steps = snap.steps;
    for (const [label, state] of Object.entries(snap.rng)) this.stream(label).setState(state);
    for (const s of this.order) {
      if (s.id in snap.systems) s.deserialize(snap.systems[s.id], saveVersion);
    }
  }

  private stream(label: string): Rng {
    let r = this.streams.get(label);
    if (!r) {
      // Forked from the untouched root, so a stream depends only on the seed and its label.
      r = this.root.fork(label);
      this.streams.set(label, r);
    }
    return r;
  }
}
