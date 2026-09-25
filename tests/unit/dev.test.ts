import { describe, expect, it } from 'vitest';
import { clock as clockTuning, frameBudget, renderBudget } from '../../src/data/tuning.ts';
import { places } from '../../src/data/world/places.ts';
import { Cheats } from '../../src/dev/Cheats.ts';
import { budgetRows, type DevReadings } from '../../src/dev/DevOverlay.ts';
import { Clock, MINUTES_PER_DAY } from '../../src/sim/clock/Clock.ts';

const calm: DevReadings = {
  fps: 60,
  frameMs: 16.4,
  gpuMs: 9,
  stepMs: 0.2,
  stepsPerFrame: 1,
  renderMs: 2,
  mainCalls: 40,
  mainTriangles: 150_000,
  shadowCalls: 12,
  shadowTriangles: 40_000,
  postCalls: 20,
  heapMB: 120,
  targetsMB: 60,
  pcmMB: 30,
  renderScale: 1,
  quality: 'medium',
  time: '',
  where: '',
};

describe('dev overlay budgets (Plan Part 7.8)', () => {
  it('rates each reading against its budget', () => {
    const rows = budgetRows(calm, 18);
    const by = (label: string) => rows.find((r) => r.label === label);
    expect(by('Frame')?.status).toBe('near'); // 16.4 of 16.6 ms
    expect(by('Worst frame')?.status).toBe('ok');
    expect(by('Main pass')?.status).toBe('ok');
    expect(by('Main pass')?.budget).toContain(String(renderBudget.mainCalls));
    expect(rows.every((r) => r.value.length > 0 && r.budget.length > 0)).toBe(true);
  });

  it('flags a pass over budget by draws or by triangles, and copes with missing readings', () => {
    const heavy = { ...calm, shadowTriangles: renderBudget.shadowTriangles + 1, gpuMs: null, heapMB: null };
    const rows = budgetRows(heavy, frameBudget.worstFrameMs + 5);
    const by = (label: string) => rows.find((r) => r.label === label);
    expect(by('Shadow pass')?.status).toBe('over');
    expect(by('Worst frame')?.status).toBe('over');
    expect(by('GPU')?.value).toBe('no timer here');
    expect(by('JS heap')?.status).toBe('ok');
  });
});

describe('cheats', () => {
  const setup = () => {
    const clock = new Clock(clockTuning);
    const moves: [number, number, number][] = [];
    const cheats = new Cheats(
      {
        clock,
        advanceMinutes: (m) => clock.advanceMinutes(m),
        teleport: (x, z, yaw) => moves.push([x, z, yaw]),
      },
      places,
    );
    return { clock, cheats, moves };
  };

  it('skips time by the hour and to the next dawn, noon, dusk or night', () => {
    const { clock, cheats } = setup();
    const start = clock.minutes;
    cheats.addHours(1);
    expect(clock.minutes - start).toBe(60);
    cheats.skipTo(7);
    expect(clock.now().hour).toBe(7);
    expect(clock.now().minute).toBe(0);
    const day = clock.now().absoluteDay;
    cheats.skipTo(7); // already 07:00: the next one is tomorrow
    expect(clock.now().absoluteDay).toBe(day + 1);
    expect(clock.minutes % MINUTES_PER_DAY).toBe(7 * 60);
  });

  it('freezes the clock, cycles the pace and teleports to named places only', () => {
    const { clock, cheats, moves } = setup();
    expect(cheats.toggleFreeze()).toBe(true);
    expect(clock.frozen).toBe(true);
    expect(cheats.cyclePace()).toBe('brisk');
    expect(cheats.cyclePace()).toBe('relaxed');
    expect(cheats.goTo('lake')).toBe(true);
    expect(moves[0]).toEqual([232, 40, -Math.PI / 2]);
    expect(cheats.goTo('nowhere')).toBe(false);
    expect(moves.length).toBe(1);
  });
});
