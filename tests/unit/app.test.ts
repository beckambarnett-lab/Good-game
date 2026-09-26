import { describe, expect, it } from 'vitest';
import { GameLoop } from '../../src/app/GameLoop.ts';
import { type KeyValueStorage, SETTINGS_KEY, SETTINGS_VERSION, Settings } from '../../src/app/Settings.ts';
import { APP_STATES, type AppState, appTransitions, clockRunsIn } from '../../src/app/states.ts';
import { Visibility } from '../../src/app/Visibility.ts';
import { FixedStepper } from '../../src/core/fixedStep.ts';
import { IllegalTransitionError, StateMachine } from '../../src/core/StateMachine.ts';
import { app as appTuning, sim as simTuning } from '../../src/data/tuning.ts';

describe('app flow', () => {
  it('walks the main path and resumes whatever was paused', () => {
    const fsm = new StateMachine<AppState>('boot', appTransitions);
    for (const s of ['splash', 'title', 'newGame', 'loading', 'playing', 'dialogue', 'paused'] as const)
      fsm.go(s);
    expect(fsm.back()).toBe(true);
    expect(fsm.current).toBe('dialogue');
    fsm.go('playing');
    expect(() => fsm.go('title')).toThrow(IllegalTransitionError);
  });

  it('every state is reachable from boot and can get back to playing or the title', () => {
    const reach = (from: AppState): Set<AppState> => {
      const seen = new Set<AppState>([from]);
      const queue = [from];
      while (queue.length > 0) {
        for (const next of appTransitions[queue.shift() as AppState]) {
          if (!seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      return seen;
    };
    expect([...reach('boot')].sort()).toEqual([...APP_STATES].sort());
    for (const s of APP_STATES) {
      if (s === 'boot' || s === 'splash') continue;
      const r = reach(s);
      expect(r.has('playing') || r.has('title'), s).toBe(true);
    }
  });

  it('the clock freezes where the plan says, and dialogue follows the setting', () => {
    expect(clockRunsIn('playing', false)).toBe(true);
    for (const s of ['paused', 'shop', 'notebook', 'photo', 'cutscene', 'title'] as const) {
      expect(clockRunsIn(s, true), s).toBe(false);
    }
    expect(clockRunsIn('dialogue', false)).toBe(false);
    expect(clockRunsIn('dialogue', true)).toBe(true);
  });
});

/** A display that fires frames at a fixed refresh rate under fake time. */
class FakeDisplay {
  t = 0;
  private cb: ((t: number) => void) | null = null;
  readonly clock = {
    now: () => this.t,
    request: (cb: (t: number) => void) => {
      this.cb = cb;
      return 1;
    },
    cancel: () => {
      this.cb = null;
    },
  };

  run(seconds: number, hz: number): void {
    const frames = Math.round(seconds * hz);
    for (let i = 0; i < frames; i++) {
      this.t += 1000 / hz;
      this.cb?.(this.t);
    }
  }

  stall(ms: number): void {
    this.t += ms;
    this.cb?.(this.t);
  }
}

function loopOn(display: FakeDisplay) {
  const log = { steps: 0, renders: 0, alphas: [] as number[], frameSeconds: [] as number[] };
  const loop = new GameLoop(
    new FixedStepper(1 / simTuning.stepHz, simTuning.maxStepsPerFrame),
    {
      step: () => {
        log.steps++;
      },
      render: (alpha, frameSeconds) => {
        log.renders++;
        log.alphas.push(alpha);
        log.frameSeconds.push(frameSeconds);
      },
    },
    display.clock,
    appTuning.maxRenderDeltaSeconds,
  );
  loop.start();
  return { loop, log };
}

describe('GameLoop', () => {
  it('steps the sim at 60 Hz whatever the display rate', () => {
    for (const hz of [60, 75, 144]) {
      const display = new FakeDisplay();
      const { log } = loopOn(display);
      display.run(2, hz);
      expect(Math.abs(log.steps - 120), `${hz} Hz`).toBeLessThanOrEqual(1);
      expect(log.renders).toBe(2 * hz);
      expect(log.alphas.every((a) => a >= 0 && a < 1)).toBe(true);
    }
  });

  it('honours an fps cap without slowing the sim', () => {
    const display = new FakeDisplay();
    const { loop, log } = loopOn(display);
    loop.fpsCap = 30;
    display.run(2, 60);
    expect(log.renders).toBe(60);
    expect(Math.abs(log.steps - 120)).toBeLessThanOrEqual(1);
  });

  it('pausing stops steps but keeps rendering, and resuming never replays the pause', () => {
    const display = new FakeDisplay();
    const { loop, log } = loopOn(display);
    display.run(1, 60);
    loop.setSimRunning(false);
    const stepsBefore = log.steps;
    display.run(10, 60);
    expect(log.steps).toBe(stepsBefore);
    expect(log.alphas.at(-1)).toBe(1);
    loop.setSimRunning(true);
    display.run(1 / 60, 60);
    expect(log.steps - stepsBefore).toBeLessThanOrEqual(1);
  });

  it('a long stall is capped, counted and clamped for render', () => {
    const display = new FakeDisplay();
    const { loop, log } = loopOn(display);
    display.run(0.5, 60);
    const before = log.steps;
    display.stall(2000);
    expect(log.steps - before).toBe(simTuning.maxStepsPerFrame);
    expect(loop.stats.droppedSeconds).toBeGreaterThan(1.8);
    expect(log.frameSeconds.at(-1)).toBe(appTuning.maxRenderDeltaSeconds);
  });
});

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
}

describe('Settings', () => {
  it('starts from the plan defaults', () => {
    const s = new Settings(new MemoryStorage());
    expect(s.get('graphics', 'fov')).toBe(55);
    expect(s.get('audio', 'musicFrequency')).toBe('sometimes');
    expect(s.get('gameplay', 'timePassesWhileTalking')).toBe(false);
  });

  it('persists changes and reloads them', () => {
    const storage = new MemoryStorage();
    const s = new Settings(storage);
    expect(s.set('graphics', 'fov', 62)).toBe(true);
    expect(s.set('audio', 'spatial', 'stereo')).toBe(true);
    const saved = JSON.parse(storage.getItem(SETTINGS_KEY) ?? '{}');
    expect(saved.version).toBe(SETTINGS_VERSION);
    const again = new Settings(storage);
    expect(again.get('graphics', 'fov')).toBe(62);
    expect(again.get('audio', 'spatial')).toBe('stereo');
  });

  it('clamps and snaps numbers, rejects bad choices', () => {
    const s = new Settings(null);
    s.set('graphics', 'fov', 200);
    expect(s.get('graphics', 'fov')).toBe(75);
    s.set('controls', 'mouseSensitivity', 1.337);
    expect(s.get('controls', 'mouseSensitivity')).toBe(1.35);
    expect(s.set('graphics', 'fpsCap', 'fast' as never)).toBe(false);
    expect(s.get('graphics', 'fpsCap')).toBe('60');
    expect(s.set('audio', 'master', Number.NaN)).toBe(false);
  });

  it('never trusts stored values', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        version: SETTINGS_VERSION,
        values: { graphics: { fov: 'wide', bloom: false, extra: 1 }, audio: { master: 400 }, bogus: {} },
      }),
    );
    const s = new Settings(storage);
    expect(s.get('graphics', 'fov')).toBe(55);
    expect(s.get('graphics', 'bloom')).toBe(false);
    expect(s.get('audio', 'master')).toBe(100);
    storage.setItem(SETTINGS_KEY, '{not json');
    expect(new Settings(storage).get('graphics', 'bloom')).toBe(true);
    storage.setItem(SETTINGS_KEY, JSON.stringify({ version: 99, values: { graphics: { bloom: false } } }));
    expect(new Settings(storage).get('graphics', 'bloom')).toBe(true);
  });

  it('announces real changes only, and resets groups', () => {
    const s = new Settings(null);
    const seen: string[] = [];
    s.onChange((g, k, v) => seen.push(`${g}.${k}=${String(v)}`));
    s.set('graphics', 'bloom', false);
    s.set('graphics', 'bloom', false);
    s.set('audio', 'mono', true);
    s.reset('graphics');
    expect(seen).toEqual(['graphics.bloom=false', 'audio.mono=true', 'graphics.bloom=true']);
    expect(s.get('audio', 'mono')).toBe(true);
  });

  it('keeps working when storage throws', () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const s = new Settings(broken);
    expect(s.set('graphics', 'fov', 60)).toBe(true);
    expect(s.get('graphics', 'fov')).toBe(60);
  });
});

class FakeDoc {
  visibilityState = 'visible';
  private readonly fns = new Map<string, Set<() => void>>();
  addEventListener(type: string, fn: () => void): void {
    if (!this.fns.has(type)) this.fns.set(type, new Set());
    this.fns.get(type)?.add(fn);
  }
  removeEventListener(type: string, fn: () => void): void {
    this.fns.get(type)?.delete(fn);
  }
  fire(type: string): void {
    for (const fn of this.fns.get(type) ?? []) fn();
  }
  count(type: string): number {
    return this.fns.get(type)?.size ?? 0;
  }
}

describe('Visibility', () => {
  it('reports hide and show transitions once each, and page hide', () => {
    const doc = new FakeDoc();
    const v = new Visibility(doc, doc);
    const seen: string[] = [];
    v.events.on('hidden', () => seen.push('hidden'));
    v.events.on('visible', () => seen.push('visible'));
    v.events.on('pagehide', () => seen.push('pagehide'));
    doc.visibilityState = 'hidden';
    doc.fire('visibilitychange');
    doc.fire('visibilitychange');
    doc.fire('pagehide');
    doc.visibilityState = 'visible';
    doc.fire('visibilitychange');
    expect(seen).toEqual(['hidden', 'pagehide', 'visible']);
    expect(v.hidden).toBe(false);
    v.dispose();
    expect(doc.count('visibilitychange') + doc.count('pagehide')).toBe(0);
  });
});
