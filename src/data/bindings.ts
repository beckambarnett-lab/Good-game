// Default controls (Plan Part 2.3). Keyboard codes are `KeyboardEvent.code`; mouse buttons are
// `Mouse0` (left), `Mouse1` (middle), `Mouse2` (right); gamepad buttons and axes use the standard
// mapping. Every binding is rebindable in Settings → Controls (M1).

export type ButtonAction =
  | 'jog'
  | 'use'
  | 'secondary'
  | 'interact'
  | 'drink'
  | 'lantern'
  | 'notebook'
  | 'jump'
  | 'pause'
  | 'toolRadial'
  | 'photo'
  | 'devOverlay';

export interface KeyboardBindings {
  moveForward: readonly string[];
  moveBack: readonly string[];
  moveLeft: readonly string[];
  moveRight: readonly string[];
  buttons: Readonly<Record<ButtonAction, readonly string[]>>;
}

export interface GamepadBindings {
  /** Axis indices: left stick (move), right stick (look). */
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  buttons: Readonly<Partial<Record<ButtonAction, readonly number[]>>>;
}

export const keyboardBindings: KeyboardBindings = {
  moveForward: ['KeyW', 'ArrowUp'],
  moveBack: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  buttons: {
    jog: ['ShiftLeft', 'ShiftRight'],
    use: ['Mouse0'],
    secondary: ['Mouse2'],
    interact: ['KeyE'],
    drink: ['KeyQ'],
    lantern: ['KeyF'],
    notebook: ['Tab'],
    jump: ['Space'],
    pause: ['Escape'],
    toolRadial: ['KeyR'],
    photo: ['KeyP'],
    devOverlay: ['F3'],
  },
};

/** Standard mapping: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 View, 9 Start, 10 L3, 11 R3, 12–15 D-pad. */
export const gamepadBindings: GamepadBindings = {
  moveX: 0,
  moveY: 1,
  lookX: 2,
  lookY: 3,
  buttons: {
    jog: [10],
    use: [7],
    interact: [0],
    drink: [2],
    notebook: [3],
    lantern: [12],
    toolRadial: [14],
    pause: [9],
  },
};
