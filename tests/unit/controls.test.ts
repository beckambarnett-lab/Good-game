import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { gamepadBindings, keyboardBindings } from '../../src/data/bindings.ts';
import { cameraRig } from '../../src/data/tuning.ts';
import { CameraRig } from '../../src/view/camera/CameraRig.ts';
import {
  applyDeadZone,
  InputMapper,
  type InputOptions,
  type RawInput,
} from '../../src/view/input/InputMapper.ts';

const opts: InputOptions = {
  mouseSensitivity: 1,
  invertY: false,
  stickDeadZone: 0.15,
  jogToggle: false,
  mouseRadiansPerPixel: cameraRig.mouseRadiansPerPixel,
  stickRadiansPerSecond: cameraRig.stickRadiansPerSecond,
  zoomStep: cameraRig.zoomStep,
};
const raw = (over: Partial<RawInput> = {}): RawInput => ({
  keys: new Set(),
  mouseDx: 0,
  mouseDy: 0,
  wheel: 0,
  pad: null,
  ...over,
});
const pad = (axes: number[], buttons: number[] = []) => ({
  axes,
  buttons: Array.from({ length: 17 }, (_, i) => buttons[i] ?? 0),
});

describe('InputMapper', () => {
  it('maps WASD to a normalized move vector and Shift to jog', () => {
    const m = new InputMapper(keyboardBindings, gamepadBindings);
    const a = m.map(raw({ keys: new Set(['KeyW', 'KeyD', 'ShiftLeft']) }), 1 / 60, opts);
    expect(Math.hypot(a.move.x, a.move.y)).toBeCloseTo(1, 9);
    expect(a.move.x).toBeGreaterThan(0);
    expect(a.move.y).toBeGreaterThan(0);
    expect(a.jog).toBe(true);
  });

  it('reports presses once, then holds', () => {
    const m = new InputMapper(keyboardBindings, gamepadBindings);
    const first = m.map(raw({ keys: new Set(['Space']) }), 1 / 60, opts);
    const second = m.map(raw({ keys: new Set(['Space']) }), 1 / 60, opts);
    expect(first.pressed.has('jump')).toBe(true);
    expect(second.pressed.has('jump')).toBe(false);
    expect(second.held.has('jump')).toBe(true);
  });

  it('applies sensitivity and invert-Y to the mouse, and a radial dead zone to sticks', () => {
    const m = new InputMapper(keyboardBindings, gamepadBindings);
    const a = m.map(raw({ mouseDx: 100, mouseDy: 50 }), 1 / 60, {
      ...opts,
      mouseSensitivity: 2,
      invertY: true,
    });
    expect(a.look.x).toBeCloseTo(100 * cameraRig.mouseRadiansPerPixel * 2, 9);
    expect(a.look.y).toBeCloseTo(-50 * cameraRig.mouseRadiansPerPixel * 2, 9);
    expect(applyDeadZone(0.1, 0.05, 0.15)).toEqual({ x: 0, y: 0 });
    const edge = applyDeadZone(1, 0, 0.15);
    expect(edge.x).toBeCloseTo(1, 9);
    const stick = m.map(raw({ pad: pad([0, -1, 0, 0]) }), 1 / 60, opts);
    expect(stick.move.y).toBeCloseTo(1, 9);
    expect(stick.device).toBe('pad');
  });

  it('toggles jog when set to toggle, and lets go when the walker stops', () => {
    const m = new InputMapper(keyboardBindings, gamepadBindings);
    const o = { ...opts, jogToggle: true };
    m.map(raw({ keys: new Set(['KeyW', 'ShiftLeft']) }), 1 / 60, o);
    expect(m.map(raw({ keys: new Set(['KeyW']) }), 1 / 60, o).jog).toBe(true);
    expect(m.map(raw({ keys: new Set() }), 1 / 60, o).jog).toBe(false);
  });
});

describe('CameraRig', () => {
  const still = { look: { x: 0, y: 0 }, zoom: 0, looking: false };
  const target = { x: 0, y: 0, z: 0, yaw: 0, speed: 0 };

  it('clamps pitch and zoom', () => {
    const cam = new PerspectiveCamera();
    const rig = new CameraRig(cameraRig, () => 0, 1.7, target);
    rig.update(1 / 60, target, { look: { x: 0, y: 10 }, zoom: 100, looking: true }, cam);
    expect(rig.pitch).toBe(cameraRig.maxPitch);
    for (let i = 0; i < 600; i++) rig.update(1 / 60, target, still, cam);
    expect(cam.position.distanceTo({ x: 0, y: 1.4, z: 0 } as never)).toBeCloseTo(cameraRig.maxDistance, 1);
  });

  it('stays above a hill behind the walker', () => {
    const cam = new PerspectiveCamera();
    // Ground rising steeply behind (−z) the walker, who looks along +z.
    const ground = (_x: number, z: number) => (z < -1 ? (-1 - z) * 2 : 0);
    const rig = new CameraRig(cameraRig, ground, 1.7, target);
    for (let i = 0; i < 300; i++) rig.update(1 / 60, target, still, cam);
    expect(cam.position.y).toBeGreaterThan(
      ground(cam.position.x, cam.position.z) + cameraRig.groundClearance - 1e-6,
    );
    expect(cam.position.distanceTo({ x: 0, y: 1.4, z: 0 } as never)).toBeLessThan(cameraRig.distance);
  });

  it('eases behind a walker after a quiet spell, at a capped rate', () => {
    const cam = new PerspectiveCamera();
    const rig = new CameraRig(cameraRig, () => 0, 1.7, target);
    const walking = { ...target, yaw: Math.PI / 2, speed: 3 };
    for (let i = 0; i < 60; i++) rig.update(1 / 60, walking, still, cam);
    expect(rig.yaw).toBe(0); // not before the delay
    for (let i = 0; i < 90; i++) rig.update(1 / 60, walking, still, cam);
    expect(rig.yaw).toBeGreaterThan(0);
    expect((rig.yaw * 180) / Math.PI).toBeLessThanOrEqual(cameraRig.recenterRate * 1.0 + 1);
  });
});
