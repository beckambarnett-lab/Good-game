import { describe, expect, it } from 'vitest';
import { type LightPoolTuning, lightPool } from '../../src/data/tuning.ts';
import {
  assignSlots,
  fadeSlots,
  type LightEmitter,
  LightPool,
  rankEmitters,
  type Slot,
} from '../../src/view/render/LightPool.ts';

const t: LightPoolTuning = { maxDistance: 60, fireRange: 20, fadeSeconds: 0.4, rankHz: 10 };
const ORIGIN = { x: 0, y: 0, z: 0 };
let ids = 0;
const emitter = (kind: LightEmitter['kind'], x: number, on = true): LightEmitter => ({
  id: ++ids,
  kind,
  x,
  y: 0,
  z: 0,
  color: 0xffcf8a,
  intensity: 10,
  range: 12,
  on,
});

describe('light pool ranking (Plan Part 5.3)', () => {
  it('puts the lantern first, then fires within reach, then the rest by distance', () => {
    const lamp = emitter('lamp', 3);
    const nearFire = emitter('fire', 15);
    const farFire = emitter('fire', 25);
    const lantern = emitter('lantern', 40);
    const farLamp = emitter('lamp', 30);
    const ranked = rankEmitters([lamp, nearFire, farFire, lantern, farLamp], ORIGIN, 5, t);
    expect(ranked).toEqual([lantern.id, nearFire.id, lamp.id, farFire.id, farLamp.id]);
  });

  it('skips emitters that are off or out of reach, and keeps to the pool size', () => {
    const off = emitter('lamp', 1, false);
    const beyond = emitter('lamp', 61);
    const a = emitter('lamp', 5);
    const b = emitter('lamp', 6);
    const c = emitter('lamp', 7);
    expect(rankEmitters([off, beyond, c, b, a], ORIGIN, 2, t)).toEqual([a.id, b.id]);
  });
});

describe('light pool slots', () => {
  const slotsOf = (n: number): Slot[] => Array.from({ length: n }, () => ({ emitter: null, weight: 0 }));

  it('keeps an emitter in its slot when the ranking reorders', () => {
    const slots = slotsOf(3);
    assignSlots(slots, [1, 2, 3]);
    expect(slots.map((s) => s.emitter)).toEqual([1, 2, 3]);
    assignSlots(slots, [3, 1, 2]);
    expect(slots.map((s) => s.emitter)).toEqual([1, 2, 3]);
  });

  it('fades a light out before its slot takes the next emitter, then fades that one in', () => {
    const slots = slotsOf(1);
    assignSlots(slots, [1]);
    fadeSlots(slots, new Set([1]), 1, t.fadeSeconds);
    expect(slots[0]).toEqual({ emitter: 1, weight: 1 });

    // Emitter 2 now matters more: 1 fades out first.
    const wanted = new Set([2]);
    assignSlots(slots, [2]);
    expect(slots[0]?.emitter).toBe(1);
    fadeSlots(slots, wanted, t.fadeSeconds / 2, t.fadeSeconds);
    expect(slots[0]?.weight).toBeCloseTo(0.5, 9);
    fadeSlots(slots, wanted, t.fadeSeconds / 2, t.fadeSeconds);
    expect(slots[0]?.weight).toBe(0);
    assignSlots(slots, [2]);
    expect(slots[0]).toEqual({ emitter: 2, weight: 0 });
    fadeSlots(slots, wanted, t.fadeSeconds, t.fadeSeconds);
    expect(slots[0]).toEqual({ emitter: 2, weight: 1 });
  });

  it('fades back in an emitter that is wanted again before it has gone', () => {
    const slots = slotsOf(1);
    assignSlots(slots, [1]);
    fadeSlots(slots, new Set([1]), 1, t.fadeSeconds);
    assignSlots(slots, []);
    fadeSlots(slots, new Set(), t.fadeSeconds / 4, t.fadeSeconds);
    assignSlots(slots, [1]);
    fadeSlots(slots, new Set([1]), t.fadeSeconds / 4, t.fadeSeconds);
    expect(slots[0]).toEqual({ emitter: 1, weight: 1 });
  });
});

describe('LightPool', () => {
  it('holds a fixed number of lights that stay visible, lit only by emitters', () => {
    const pool = new LightPool(3, lightPool);
    expect(pool.size).toBe(3);
    expect(pool.group.children.every((c) => c.visible)).toBe(true);
    pool.update(ORIGIN, 1 / 60);
    expect(pool.inUse).toBe(0);
    expect(pool.group.children.every((c) => (c as unknown as { intensity: number }).intensity === 0)).toBe(
      true,
    );
  });

  it('lights an emitter, fades it in, and fades it out after it is removed', () => {
    const pool = new LightPool(2, t);
    const lamp = pool.add({
      kind: 'lamp',
      x: 4,
      y: 3,
      z: 0,
      color: 0xffcf8a,
      intensity: 8,
      range: 12,
      on: true,
    });
    const lights = pool.group.children as unknown as {
      intensity: number;
      distance: number;
      position: { x: number };
    }[];
    for (let i = 0; i < 30; i++) pool.update(ORIGIN, 1 / 60); // 0.5 s: fully in
    expect(pool.inUse).toBe(1);
    const lit = lights.find((l) => l.intensity > 0);
    expect(lit?.intensity).toBeCloseTo(8, 9);
    expect(lit?.distance).toBe(12);
    expect(lit?.position.x).toBe(4);

    pool.remove(lamp);
    pool.update(ORIGIN, t.fadeSeconds / 2);
    expect(lit?.intensity).toBeCloseTo(4, 6);
    pool.update(ORIGIN, t.fadeSeconds / 2);
    expect(lit?.intensity).toBe(0);
    pool.update(ORIGIN, 1 / 60);
    expect(pool.inUse).toBe(0);
  });

  it('changes its size for a new quality level', () => {
    const pool = new LightPool(6, t);
    pool.resize(3);
    expect(pool.size).toBe(3);
    expect(pool.group.children).toHaveLength(3);
  });
});
