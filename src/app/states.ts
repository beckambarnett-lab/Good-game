// The app's states and flow (Plan Part 7.3): Boot → Splash (audio unlock) → Title → New game or
// Load → Loading → Playing ⇄ Paused, with in-game overlays. Each state says whether the world keeps
// stepping and whether the game clock runs (Plan Part 2.1: time freezes in menus, the Notebook,
// shops, dialogue unless "Time passes while talking", cutscene beats and photo mode).

import type { Transitions } from '../core/StateMachine.ts';

export const APP_STATES = [
  'boot',
  'splash',
  'title',
  'newGame',
  'load',
  'loading',
  'playing',
  'paused',
  'dialogue',
  'shop',
  'notebook',
  'photo',
  'cutscene',
  'timeSkip',
] as const;
export type AppState = (typeof APP_STATES)[number];

/** States layered over Playing; each can be paused and returns to Playing. */
const OVERLAYS = ['dialogue', 'shop', 'notebook', 'photo', 'cutscene', 'timeSkip'] as const;

export const appTransitions: Transitions<AppState> = {
  boot: ['splash'],
  splash: ['title'],
  // "Continue" goes straight to Loading with the latest autosave.
  title: ['newGame', 'load', 'loading'],
  newGame: ['loading', 'title'],
  load: ['loading', 'title'],
  loading: ['playing', 'title'],
  playing: ['paused', ...OVERLAYS],
  // Resume returns to whatever was paused; quitting goes to the title.
  paused: ['playing', 'dialogue', 'shop', 'notebook', 'photo', 'cutscene', 'title'],
  dialogue: ['playing', 'paused', 'shop', 'cutscene'],
  shop: ['playing', 'paused', 'dialogue'],
  notebook: ['playing', 'paused'],
  photo: ['playing', 'paused'],
  cutscene: ['playing', 'paused', 'dialogue', 'timeSkip'],
  timeSkip: ['playing'],
};

export interface AppStateTraits {
  /** Fixed sim steps run (the world moves: snowfall, NPC steering, physics). */
  simSteps: boolean;
  /** The game clock advances; 'setting' follows "Time passes while talking". */
  clock: boolean | 'setting';
  /** Who gets input: the game (player/camera), the UI, or nobody. */
  input: 'game' | 'ui' | 'none';
}

export const appStateTraits: Readonly<Record<AppState, AppStateTraits>> = {
  boot: { simSteps: false, clock: false, input: 'none' },
  splash: { simSteps: false, clock: false, input: 'ui' },
  title: { simSteps: false, clock: false, input: 'ui' },
  newGame: { simSteps: false, clock: false, input: 'ui' },
  load: { simSteps: false, clock: false, input: 'ui' },
  loading: { simSteps: false, clock: false, input: 'none' },
  playing: { simSteps: true, clock: true, input: 'game' },
  paused: { simSteps: false, clock: false, input: 'ui' },
  dialogue: { simSteps: true, clock: 'setting', input: 'ui' },
  shop: { simSteps: true, clock: false, input: 'ui' },
  notebook: { simSteps: true, clock: false, input: 'ui' },
  // Photo mode freezes time; only the free camera moves (view-side).
  photo: { simSteps: false, clock: false, input: 'game' },
  cutscene: { simSteps: true, clock: false, input: 'none' },
  // Sim.advance does the skipping; no fixed steps meanwhile.
  timeSkip: { simSteps: false, clock: false, input: 'none' },
};

/** Whether the clock runs in a state, given the "Time passes while talking" setting. */
export function clockRunsIn(state: AppState, timePassesWhileTalking: boolean): boolean {
  const c = appStateTraits[state].clock;
  return c === 'setting' ? timePassesWhileTalking : c;
}
