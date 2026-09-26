// Turns raw device state into game actions (Plan Part 2.3): movement and look vectors, zoom, and
// held/pressed buttons, through the bindings, with a radial stick dead zone, mouse sensitivity,
// invert-Y and hold-or-toggle jog. Pure, so it's tested without a browser.

import type { ButtonAction, GamepadBindings, KeyboardBindings } from '../../data/bindings.ts';

export interface RawInput {
  /** Held keyboard codes and mouse buttons (`Mouse0`–`Mouse2`). */
  keys: ReadonlySet<string>;
  /** Pointer movement (px) and wheel notches (+ = away) since the last poll. */
  mouseDx: number;
  mouseDy: number;
  wheel: number;
  pad: { axes: readonly number[]; buttons: readonly number[] } | null;
}

export interface InputOptions {
  mouseSensitivity: number;
  invertY: boolean;
  stickDeadZone: number;
  jogToggle: boolean;
  mouseRadiansPerPixel: number;
  stickRadiansPerSecond: number;
  zoomStep: number;
}

export interface ActionState {
  /** x = right, y = forward; length ≤ 1. */
  move: { x: number; y: number };
  /** Look this frame (rad): x turns right, y tilts down. */
  look: { x: number; y: number };
  /** Metres to add to the camera distance. */
  zoom: number;
  held: Set<ButtonAction>;
  pressed: Set<ButtonAction>;
  jog: boolean;
  /** Whether anything looked around this frame (lazy recenter waits for quiet). */
  looking: boolean;
  device: 'kbm' | 'pad';
}

/** A button above this value counts as held (triggers are analog). */
const BUTTON_THRESHOLD = 0.5;

/** Radial dead zone: nothing inside it, then rescaled so the edge of the zone reads as 0. */
export function applyDeadZone(x: number, y: number, dz: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len <= dz) return { x: 0, y: 0 };
  const scaled = Math.min(1, (len - dz) / (1 - dz));
  return { x: (x / len) * scaled, y: (y / len) * scaled };
}

export class InputMapper {
  private readonly kb: KeyboardBindings;
  private readonly padBindings: GamepadBindings;
  private previous = new Set<ButtonAction>();
  private jogLatched = false;
  private device: 'kbm' | 'pad' = 'kbm';

  constructor(kb: KeyboardBindings, pad: GamepadBindings) {
    this.kb = kb;
    this.padBindings = pad;
  }

  map(raw: RawInput, dt: number, o: InputOptions): ActionState {
    const has = (codes: readonly string[]) => codes.some((c) => raw.keys.has(c));
    let mx = (has(this.kb.moveRight) ? 1 : 0) - (has(this.kb.moveLeft) ? 1 : 0);
    let my = (has(this.kb.moveForward) ? 1 : 0) - (has(this.kb.moveBack) ? 1 : 0);
    const kbLen = Math.hypot(mx, my);
    if (kbLen > 1) {
      mx /= kbLen;
      my /= kbLen;
    }
    const ySign = o.invertY ? -1 : 1;
    let lx = raw.mouseDx * o.mouseRadiansPerPixel * o.mouseSensitivity;
    let ly = raw.mouseDy * o.mouseRadiansPerPixel * o.mouseSensitivity * ySign;
    let usedPad = false;

    const held = new Set<ButtonAction>();
    for (const [action, codes] of Object.entries(this.kb.buttons) as [ButtonAction, readonly string[]][]) {
      if (has(codes)) held.add(action);
    }
    if (raw.pad) {
      const axis = (i: number) => raw.pad?.axes[i] ?? 0;
      const move = applyDeadZone(
        axis(this.padBindings.moveX),
        -axis(this.padBindings.moveY),
        o.stickDeadZone,
      );
      const look = applyDeadZone(axis(this.padBindings.lookX), axis(this.padBindings.lookY), o.stickDeadZone);
      if (move.x !== 0 || move.y !== 0) {
        mx = move.x;
        my = move.y;
        usedPad = true;
      }
      if (look.x !== 0 || look.y !== 0) {
        lx += look.x * o.stickRadiansPerSecond * o.mouseSensitivity * dt;
        ly += look.y * o.stickRadiansPerSecond * o.mouseSensitivity * dt * ySign;
        usedPad = true;
      }
      for (const [action, buttons] of Object.entries(this.padBindings.buttons) as [
        ButtonAction,
        readonly number[],
      ][]) {
        if (buttons.some((b) => (raw.pad?.buttons[b] ?? 0) > BUTTON_THRESHOLD)) {
          held.add(action);
          usedPad = true;
        }
      }
    }
    if (usedPad) this.device = 'pad';
    else if (kbLen > 0 || raw.mouseDx !== 0 || raw.mouseDy !== 0 || held.size > 0) this.device = 'kbm';

    const pressed = new Set<ButtonAction>();
    for (const a of held) if (!this.previous.has(a)) pressed.add(a);
    this.previous = held;

    // Jog: hold by default; toggle when set, and always a toggle on the gamepad (L3).
    const toggle = o.jogToggle || this.device === 'pad';
    if (toggle) {
      if (pressed.has('jog')) this.jogLatched = !this.jogLatched;
      if (mx === 0 && my === 0) this.jogLatched = false;
    }
    const jog = toggle ? this.jogLatched : held.has('jog');

    return {
      move: { x: mx, y: my },
      look: { x: lx, y: ly },
      zoom: raw.wheel * o.zoomStep,
      held,
      pressed,
      jog,
      looking: lx !== 0 || ly !== 0,
      device: this.device,
    };
  }
}
