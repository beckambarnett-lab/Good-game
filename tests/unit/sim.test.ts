import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/EventBus.ts';
import { FixedStepper } from '../../src/core/fixedStep.ts';
import { Rng } from '../../src/core/rng.ts';
import { sim as simTuning } from '../../src/data/tuning.ts';
import { Sim } from '../../src/sim/Sim.ts';
import { makeSim, Walker } from '../fixtures/world.ts';

const run = (sim: Sim, steps: number) => {
  for (let i = 0; i < steps; i++) sim.step();
};

describe('FixedStepper', () => {
  it('turns frame time into whole steps plus an interpolation alpha', () => {
    const f = new FixedStepper(1 / 60, 5);
    const p = f.frame((1 / 60) * 2.5);
    expect(p.steps).toBe(2);
    expect(p.alpha).toBeCloseTo(0.5, 9);
    expect(p.dropped).toBe(0);
  });

  it('caps catch-up after a stall and drops the backlog', () => {
    const f = new FixedStepper(1 / 60, 5);
    const p = f.frame(1);
    expect(p.steps).toBe(5);
    expect(p.dropped + p.steps * f.step + p.alpha * f.step).toBeCloseTo(1, 9);
    expect(p.alpha).toBeGreaterThanOrEqual(0);
    expect(p.alpha).toBeLessThan(1);
  });

  it('conserves time across jittery frames', () => {
    const f = new FixedStepper(1 / 60, 5);
    const rng = new Rng(3);
    let total = 0;
    let accounted = 0;
    let alpha = 0;
    for (let i = 0; i < 10000; i++) {
      const dt = rng.range(0.004, 0.03);
      total += dt;
      const p = f.frame(dt);
      accounted += p.steps * f.step + p.dropped;
      alpha = p.alpha;
    }
    expect(total - accounted).toBeCloseTo(alpha * f.step, 6);
  });
});

describe('EventBus', () => {
  it('delivers typed events, supports once and unsubscribing', () => {
    const bus = new EventBus<{ ping: number }>();
    const got: number[] = [];
    const off = bus.on('ping', (n) => got.push(n));
    bus.once('ping', (n) => got.push(n * 10));
    bus.emit('ping', 1);
    bus.emit('ping', 2);
    off();
    bus.emit('ping', 3);
    expect(got).toEqual([1, 10, 2]);
    expect(bus.listenerCount('ping')).toBe(0);
  });

  it('is safe when a listener unsubscribes another mid-emit', () => {
    const bus = new EventBus<{ ping: number }>();
    const got: string[] = [];
    let offB = () => {};
    bus.on('ping', () => {
      got.push('a');
      offB();
    });
    offB = bus.on('ping', () => got.push('b'));
    bus.emit('ping', 0);
    bus.emit('ping', 0);
    expect(got).toEqual(['a', 'b', 'a']);
  });
});

describe('Sim', () => {
  it('rejects duplicate system ids', () => {
    expect(() => new Sim(1, 60, [new Walker(), new Walker()])).toThrow(/duplicate/);
  });

  it('is deterministic for a seed and differs between seeds', () => {
    const a = makeSim(7);
    const b = makeSim(7);
    const c = makeSim(8);
    for (const s of [a, b, c]) run(s, 600);
    expect(JSON.stringify(a.serialize())).toBe(JSON.stringify(b.serialize()));
    expect(JSON.stringify(a.serialize())).not.toBe(JSON.stringify(c.serialize()));
  });

  it('a restored world continues exactly as the original would have', () => {
    const original = makeSim(11);
    run(original, 900);
    original.advance(45);
    const restored = makeSim(11);
    restored.deserialize(original.serialize(), 1);
    run(original, 900);
    run(restored, 900);
    expect(JSON.stringify(restored.serialize())).toBe(JSON.stringify(original.serialize()));
  });

  it('refuses a snapshot from a different world', () => {
    const snap = makeSim(1).serialize();
    expect(() => makeSim(2).deserialize(snap, 1)).toThrow(/seed/);
  });
});

describe('ClockSystem', () => {
  it('announces every game hour and the 06:00 rollover when skipping a day', () => {
    const sim = makeSim(1);
    const hours: number[] = [];
    const rollovers: number[] = [];
    sim.events.on('clock/hour', (e) => hours.push(e.hour));
    sim.events.on('clock/rollover', (e) => rollovers.push(e.absoluteDay));
    sim.advance(24 * 60);
    expect(hours).toHaveLength(24);
    expect(hours[0]).toBe(16);
    expect(hours.at(-1)).toBe(15);
    expect(rollovers).toEqual([2]);
  });

  it('90 real seconds of daytime at 60 Hz is one game hour', () => {
    const sim = makeSim(1);
    const hours: number[] = [];
    sim.events.on('clock/hour', (e) => hours.push(e.hour));
    run(sim, 90 * simTuning.stepHz + 1);
    expect(hours).toEqual([16]);
  });
});
