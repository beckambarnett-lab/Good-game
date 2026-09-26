// The point-light pool (Plan Part 5.3). The scene holds a fixed number of PointLights (the quality
// preset's count), so a lamp coming into view never recompiles a shader. Emitters (the player's
// lantern, fires, lamps) register with the pool, and each moment the ones that matter most get a
// light: the lantern first, then fires within reach, then the rest by distance. A light that
// changes hands fades out before its slot takes the next emitter, so nothing pops.

import { Group, PointLight } from 'three';
import type { LightPoolTuning } from '../../data/tuning.ts';

export type LightKind = 'lantern' | 'fire' | 'lamp';

export interface LightEmitter {
  readonly id: number;
  kind: LightKind;
  x: number;
  y: number;
  z: number;
  /** sRGB hex, like the palette. */
  color: number;
  /** Physically based intensity (cd). */
  intensity: number;
  /** Reach (m): the light falls to nothing here. */
  range: number;
  on: boolean;
}

/** An emitter's rank tier: lower comes first. */
function tierOf(kind: LightKind, distance: number, t: LightPoolTuning): number {
  if (kind === 'lantern') return 0;
  if (kind === 'fire' && distance <= t.fireRange) return 1;
  return 2;
}

/**
 * The emitters that should hold lights, best first: switched on, within `maxDistance` of the
 * focus, ranked by tier and then distance (ties by id, so the order is stable). Pure, so it's tested.
 */
export function rankEmitters(
  emitters: Iterable<LightEmitter>,
  focus: { x: number; y: number; z: number },
  count: number,
  t: LightPoolTuning,
): number[] {
  const scored: { id: number; tier: number; distance: number }[] = [];
  for (const e of emitters) {
    if (!e.on) continue;
    const distance = Math.hypot(e.x - focus.x, e.y - focus.y, e.z - focus.z);
    if (distance > t.maxDistance) continue;
    scored.push({ id: e.id, tier: tierOf(e.kind, distance, t), distance });
  }
  scored.sort((a, b) => a.tier - b.tier || a.distance - b.distance || a.id - b.id);
  return scored.slice(0, count).map((s) => s.id);
}

export interface Slot {
  /** The emitter this light shows, or null when free. */
  emitter: number | null;
  /** How far it has faded in (0–1). */
  weight: number;
}

/**
 * Hands slots to the wanted emitters. An emitter keeps the slot it has; a slot whose emitter is no
 * longer wanted is freed once it has faded out; free slots take wanted emitters that have none,
 * best first.
 */
export function assignSlots(slots: Slot[], wanted: readonly number[]): void {
  const want = new Set(wanted);
  const held = new Set<number>();
  for (const s of slots) {
    if (s.emitter !== null && !want.has(s.emitter) && s.weight <= 0) s.emitter = null;
    if (s.emitter !== null) held.add(s.emitter);
  }
  let next = 0;
  for (const s of slots) {
    if (s.emitter !== null) continue;
    while (next < wanted.length && held.has(wanted[next] as number)) next++;
    if (next >= wanted.length) return;
    s.emitter = wanted[next++] as number;
    s.weight = 0;
  }
}

/** Fades each slot toward full while its emitter is wanted, and toward nothing when it isn't. */
export function fadeSlots(slots: Slot[], wanted: ReadonlySet<number>, dt: number, fadeSeconds: number): void {
  const step = fadeSeconds > 0 ? dt / fadeSeconds : 1;
  for (const s of slots) {
    const on = s.emitter !== null && wanted.has(s.emitter);
    s.weight = on ? Math.min(1, s.weight + step) : Math.max(0, s.weight - step);
  }
}

export class LightPool {
  readonly group = new Group();
  private readonly t: LightPoolTuning;
  private lights: PointLight[] = [];
  private slots: Slot[] = [];
  /** Each slot's emitter intensity when last seen, so a light whose emitter is gone can fade out. */
  private bases: number[] = [];
  private readonly emitters = new Map<number, LightEmitter>();
  private nextId = 1;
  private sinceRank = Number.POSITIVE_INFINITY;
  private wanted: number[] = [];
  private wantedSet = new Set<number>();

  constructor(size: number, t: LightPoolTuning) {
    this.t = t;
    this.group.name = 'light-pool';
    this.resize(size);
  }

  /** How many lights the pool holds. */
  get size(): number {
    return this.lights.length;
  }

  /** Lights showing an emitter right now (faded in at all). */
  get inUse(): number {
    let n = 0;
    for (const s of this.slots) if (s.emitter !== null && s.weight > 0) n++;
    return n;
  }

  /** Sets how many lights there are (a quality change); shaders recompile once for the new count. */
  resize(size: number): void {
    if (size === this.lights.length) return;
    for (const light of this.lights) {
      this.group.remove(light);
      light.dispose();
    }
    this.lights = [];
    this.slots = [];
    this.bases = [];
    for (let i = 0; i < size; i++) {
      // Always visible: three sizes its shaders by visible lights, so a spare light only dims.
      const light = new PointLight(0xffffff, 0);
      light.name = `pool-light-${i}`;
      this.lights.push(light);
      this.group.add(light);
      this.slots.push({ emitter: null, weight: 0 });
      this.bases.push(0);
    }
    this.sinceRank = Number.POSITIVE_INFINITY;
  }

  /** Registers an emitter; move it or switch it by changing the returned object. */
  add(e: Omit<LightEmitter, 'id'>): LightEmitter {
    const emitter: LightEmitter = { ...e, id: this.nextId++ };
    this.emitters.set(emitter.id, emitter);
    this.sinceRank = Number.POSITIVE_INFINITY;
    return emitter;
  }

  remove(e: LightEmitter): void {
    this.emitters.delete(e.id);
    this.sinceRank = Number.POSITIVE_INFINITY;
  }

  /** Ranks (at `rankHz`), hands out and fades the lights, and moves them onto their emitters. */
  update(focus: { x: number; y: number; z: number }, dt: number): void {
    this.sinceRank += dt;
    if (this.sinceRank >= 1 / this.t.rankHz) {
      this.sinceRank = 0;
      this.wanted = rankEmitters(this.emitters.values(), focus, this.lights.length, this.t);
      this.wantedSet = new Set(this.wanted);
    }
    assignSlots(this.slots, this.wanted);
    fadeSlots(this.slots, this.wantedSet, dt, this.t.fadeSeconds);
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i] as Slot;
      const light = this.lights[i] as PointLight;
      const e = slot.emitter !== null ? this.emitters.get(slot.emitter) : undefined;
      if (e) {
        light.position.set(e.x, e.y, e.z);
        light.color.setHex(e.color);
        light.distance = e.range;
        this.bases[i] = e.intensity;
      }
      light.intensity = slot.emitter === null ? 0 : slot.weight * (this.bases[i] as number);
    }
  }
}
