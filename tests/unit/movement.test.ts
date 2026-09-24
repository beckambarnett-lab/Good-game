import { describe, expect, it } from 'vitest';
import { movement as t } from '../../src/data/tuning.ts';
import { SURFACE } from '../../src/data/world/terrain.ts';
import {
  type Collider,
  type MoveIntent,
  type MovementWorld,
  spawnMover,
  stepMover,
} from '../../src/sim/player/Movement.ts';
import { PlayerSystem } from '../../src/sim/player/PlayerSystem.ts';

const DT = 1 / 60;

function world(opts: {
  height?: (x: number, z: number) => number;
  surface?: (x: number, z: number) => number;
  colliders?: Collider[];
}): MovementWorld {
  const h = opts.height ?? (() => 0);
  return {
    halfSize: 256,
    heightAt: h,
    normalAt: (x, z, out) => {
      const e = 0.05;
      const nx = -(h(x + e, z) - h(x - e, z));
      const nz = -(h(x, z + e) - h(x, z - e));
      const ny = 2 * e;
      const l = Math.hypot(nx, ny, nz);
      out.x = nx / l;
      out.y = ny / l;
      out.z = nz / l;
      return out;
    },
    surfaceAt: opts.surface ?? (() => SURFACE.snow),
    collidersNear: (_x, _z, _r, out) => {
      out.length = 0;
      out.push(...(opts.colliders ?? []));
      return out;
    },
  };
}

const go = (x: number, z: number, extra: Partial<MoveIntent> = {}): MoveIntent => ({
  x,
  z,
  jog: false,
  hop: false,
  ...extra,
});
const speed = (s: { vx: number; vz: number }) => Math.hypot(s.vx, s.vz);

describe('movement', () => {
  it('reaches walking pace in 0.18 s and stops in 0.12 s', () => {
    const w = world({});
    const s = spawnMover(w, 0, 0, 0);
    for (let i = 0; i < 10; i++) stepMover(s, go(0, 1), w, t, DT);
    expect(speed(s)).toBeLessThan(t.walkSpeed);
    stepMover(s, go(0, 1), w, t, DT);
    expect(speed(s)).toBeCloseTo(t.walkSpeed, 6);
    for (let i = 0; i < 6; i++) stepMover(s, go(0, 0), w, t, DT);
    expect(speed(s)).toBeGreaterThan(0);
    for (let i = 0; i < 2; i++) stepMover(s, go(0, 0), w, t, DT);
    expect(speed(s)).toBe(0);
  });

  it('jogs at 5.2 m/s, and a half-pushed stick walks at half pace', () => {
    const w = world({});
    const jog = spawnMover(w, 0, 0, 0);
    const half = spawnMover(w, 0, 0, 0);
    for (let i = 0; i < 120; i++) {
      stepMover(jog, go(1, 0, { jog: true }), w, t, DT);
      stepMover(half, go(0.5, 0), w, t, DT);
    }
    expect(speed(jog)).toBeCloseTo(t.jogSpeed, 6);
    expect(speed(half)).toBeCloseTo(t.walkSpeed / 2, 6);
  });

  it('slides gently on ice', () => {
    const w = world({ surface: () => SURFACE.lakeIce });
    const s = spawnMover(w, 0, 0, 0);
    for (let i = 0; i < 11; i++) stepMover(s, go(0, 1), w, t, DT);
    expect(speed(s)).toBeLessThan(t.walkSpeed * 0.45);
    for (let i = 0; i < 120; i++) stepMover(s, go(0, 1), w, t, DT);
    expect(speed(s)).toBeCloseTo(t.walkSpeed * t.iceSpeed, 6);
    for (let i = 0; i < 8; i++) stepMover(s, go(0, 0), w, t, DT);
    expect(speed(s)).toBeGreaterThan(1); // still gliding after 0.13 s
  });

  it('won’t climb ground steeper than the walkable slope, but can walk along it', () => {
    // A 50° wall rising toward +z beyond z = 5.
    const tan50 = Math.tan((50 * Math.PI) / 180);
    const w = world({ height: (_x, z) => Math.max(0, z - 5) * tan50 });
    const s = spawnMover(w, 0, 0, 0);
    for (let i = 0; i < 600; i++) stepMover(s, go(0, 1), w, t, DT);
    expect(s.y).toBeLessThan(0.6);
    const along = spawnMover(w, 0, 4.9, 0);
    for (let i = 0; i < 120; i++) stepMover(along, go(1, 0), w, t, DT);
    expect(along.x).toBeGreaterThan(5);
  });

  it('walks up the plan’s 14° farm ramp', () => {
    const tan14 = Math.tan((14 * Math.PI) / 180);
    const w = world({ height: (_x, z) => Math.max(0, z) * tan14 });
    const s = spawnMover(w, 0, -2, 0);
    for (let i = 0; i < 300; i++) stepMover(s, go(0, 1), w, t, DT);
    expect(s.y).toBeGreaterThan(3);
  });

  it('slides around a trunk instead of passing through it', () => {
    const trunk = { x: 0, z: 5, r: 0.25 };
    const w = world({ colliders: [trunk] });
    const s = spawnMover(w, 0.05, 0, 0);
    let closest = Infinity;
    for (let i = 0; i < 240; i++) {
      stepMover(s, go(0, 1), w, t, DT);
      closest = Math.min(closest, Math.hypot(s.x - trunk.x, s.z - trunk.z));
    }
    expect(closest).toBeGreaterThanOrEqual(trunk.r + t.capsuleRadius - 1e-9);
    expect(s.z).toBeGreaterThan(7); // it got past
  });

  it('hops 0.45 m and lands', () => {
    const w = world({});
    const s = spawnMover(w, 0, 0, 0);
    stepMover(s, go(0, 0, { hop: true }), w, t, DT);
    let peak = 0;
    let landed = false;
    for (let i = 0; i < 120; i++) {
      stepMover(s, go(0, 0), w, t, DT);
      peak = Math.max(peak, s.y);
      if (s.grounded) landed = true;
    }
    expect(peak).toBeGreaterThan(t.hopHeight * 0.9);
    expect(peak).toBeLessThan(t.hopHeight * 1.05);
    expect(landed).toBe(true);
  });

  it('turns at no more than 600°/s', () => {
    const w = world({});
    const s = spawnMover(w, 0, 0, 0);
    for (let i = 0; i < 12; i++) stepMover(s, go(0, 1), w, t, DT);
    const before = s.yaw;
    stepMover(s, go(0, -1), w, t, DT);
    const turned = Math.abs(Math.atan2(Math.sin(s.yaw - before), Math.cos(s.yaw - before)));
    expect((turned * 180) / Math.PI).toBeLessThanOrEqual(t.turnRate * DT + 1e-6);
  });

  it('stays inside the world', () => {
    const w = world({});
    const s = spawnMover(w, 245, 0, 0);
    for (let i = 0; i < 240; i++) stepMover(s, go(1, 0, { jog: true }), w, t, DT);
    expect(s.x).toBeLessThanOrEqual(256 - t.worldMargin);
  });
});

describe('PlayerSystem', () => {
  it('interpolates between steps and restores from a save', () => {
    const w = world({});
    const p = new PlayerSystem(w, t, { x: 1, z: 2, yaw: 0.5 });
    p.setIntent(0, 1, false, false);
    for (let i = 0; i < 30; i++) p.fixedUpdate(DT);
    const mid = p.pose(0.5, { x: 0, y: 0, z: 0, yaw: 0 });
    expect(mid.z).toBeGreaterThan(p.prev.z);
    expect(mid.z).toBeLessThan(p.state.z);
    const q = new PlayerSystem(w, t, { x: 0, z: 0, yaw: 0 });
    q.deserialize(JSON.parse(JSON.stringify(p.serialize())));
    expect([q.state.x, q.state.z, q.state.yaw]).toEqual([p.state.x, p.state.z, p.state.yaw]);
  });
});
