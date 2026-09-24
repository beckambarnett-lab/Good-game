// Browser input devices: keyboard, mouse under pointer lock, wheel and the first connected
// gamepad (standard mapping). Collects raw state between polls; InputMapper turns it into actions.

import { gamepadBindings, keyboardBindings } from '../../data/bindings.ts';
import { type ActionState, InputMapper, type InputOptions, type RawInput } from './InputMapper.ts';

/** Keys whose browser defaults (focus moves, page scroll) would fight the game. */
const SWALLOWED = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class Input {
  readonly mapper = new InputMapper(keyboardBindings, gamepadBindings);
  private readonly keys = new Set<string>();
  private readonly target: HTMLElement;
  private dx = 0;
  private dy = 0;
  private wheel = 0;
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
      if (SWALLOWED.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    on('keyup', (e) => this.keys.delete(e.code));
    on('mousedown', (e) => this.keys.add(`Mouse${e.button}`));
    on('mouseup', (e) => this.keys.delete(`Mouse${e.button}`));
    on('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    on(
      'wheel',
      (e) => {
        this.wheel += Math.sign(e.deltaY);
      },
      { passive: true },
    );
    // Releasing everything on blur keeps keys from sticking when focus leaves mid-press.
    on('blur', () => this.keys.clear());
    const lock = () => {
      if (this.locked) return;
      // Newer browsers return a promise that rejects when the lock is refused; that's not an error.
      const request = target.requestPointerLock?.() as unknown;
      if (request instanceof Promise) request.catch(() => undefined);
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
