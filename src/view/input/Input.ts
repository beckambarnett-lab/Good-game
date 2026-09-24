// Browser input devices: keyboard, mouse (under pointer lock, or dragging where a page can't lock
// it), wheel and the first connected gamepad (standard mapping). Collects raw state between polls;
// InputMapper turns it into actions. Keys a focused control uses (typing, sliding a slider) and
// wheels over panels belong to the page, not the game.

import { gamepadBindings, keyboardBindings } from '../../data/bindings.ts';
import { type ActionState, InputMapper, type InputOptions, type RawInput } from './InputMapper.ts';

/** Keys whose browser defaults (focus moves, page scroll) would fight the game. */
const SWALLOWED = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** Keys a focused control uses itself, by kind of control; every other key still plays. */
const CONTROL_KEYS: Readonly<Record<string, ReadonlySet<string>>> = {
  range: new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    'Tab',
  ]),
  toggle: new Set(['Space', 'Tab']),
  press: new Set(['Space', 'Enter', 'Tab']),
};

/** Whether a key belongs to the page (typing in a field, working a slider) rather than the game. */
function pageOwns(e: KeyboardEvent): boolean {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true;
  if (t instanceof HTMLInputElement) {
    if (t.type === 'range') return CONTROL_KEYS.range?.has(e.code) ?? false;
    if (t.type === 'checkbox' || t.type === 'radio') return CONTROL_KEYS.toggle?.has(e.code) ?? false;
    if (t.type === 'button' || t.type === 'submit' || t.type === 'reset')
      return CONTROL_KEYS.press?.has(e.code) ?? false;
    return true; // text-like fields take every key
  }
  if (t.tagName === 'BUTTON' || t.tagName === 'SUMMARY' || t.tagName === 'A') {
    return CONTROL_KEYS.press?.has(e.code) ?? false;
  }
  return false;
}

export class Input {
  readonly mapper = new InputMapper(keyboardBindings, gamepadBindings);
  private readonly keys = new Set<string>();
  private readonly target: HTMLElement;
  private dx = 0;
  private dy = 0;
  private wheel = 0;
  /** A mouse button went down on the game view and hasn't come up: drag-to-look. */
  private dragging = false;
  private readonly cleanups: (() => void)[] = [];

  constructor(target: HTMLElement) {
    this.target = target;
    const on = <K extends keyof WindowEventMap>(
      type: K,
      fn: (e: WindowEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ) => {
      window.addEventListener(type, fn, opts);
      this.cleanups.push(() => window.removeEventListener(type, fn, opts));
    };
    on('keydown', (e) => {
      if (pageOwns(e)) return;
      if (SWALLOWED.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    on('keyup', (e) => this.keys.delete(e.code));
    const down = (e: MouseEvent) => {
      this.keys.add(`Mouse${e.button}`);
      this.dragging = true;
    };
    target.addEventListener('mousedown', down);
    this.cleanups.push(() => target.removeEventListener('mousedown', down));
    on('mouseup', (e) => {
      this.keys.delete(`Mouse${e.button}`);
      if (e.buttons === 0) this.dragging = false;
    });
    on('mousemove', (e) => {
      if (!this.locked && !this.dragging) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    const wheel = (e: WheelEvent) => {
      this.wheel += Math.sign(e.deltaY);
    };
    target.addEventListener('wheel', wheel, { passive: true });
    this.cleanups.push(() => target.removeEventListener('wheel', wheel));
    // Releasing everything on blur keeps keys from sticking when focus leaves mid-press.
    on('blur', () => {
      this.keys.clear();
      this.dragging = false;
    });
    const lock = () => {
      if (this.locked) return;
      // A refused lock (a sandboxed frame, a phone) is fine: dragging still looks around. Newer
      // browsers reject a promise, older ones may throw.
      try {
        const request = target.requestPointerLock?.() as unknown;
        if (request instanceof Promise) request.catch(() => undefined);
      } catch {
        // drag-to-look remains
      }
    };
    target.addEventListener('click', lock);
    this.cleanups.push(() => target.removeEventListener('click', lock));
  }

  get locked(): boolean {
    return document.pointerLockElement === this.target;
  }

  /** Actions since the last poll. */
  poll(dt: number, options: InputOptions): ActionState {
    const pad = navigator.getGamepads?.().find((g) => g?.connected && g.mapping === 'standard') ?? null;
    const raw: RawInput = {
      keys: this.keys,
      mouseDx: this.dx,
      mouseDy: this.dy,
      wheel: this.wheel,
      pad: pad ? { axes: pad.axes, buttons: pad.buttons.map((b) => b.value) } : null,
    };
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
    return this.mapper.map(raw, dt, options);
  }

  dispose(): void {
    for (const c of this.cleanups) c();
  }
}
