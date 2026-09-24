import { describe, expect, it } from 'vitest';
import { p01Lullaby } from '../../src/data/music/pieces/p01Lullaby.ts';
import { perform } from '../../src/music/director.ts';
import { noteToMidi, parseChord, voiceLead } from '../../src/music/theory.ts';

describe('theory', () => {
  it('parses note names', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('F#4')).toBe(66);
    expect(noteToMidi('Bb3')).toBe(58);
  });

  it('parses chords including slash and sus', () => {
    const c = parseChord('A/C#');
    expect(c.root).toBe(9);
    expect(c.bass).toBe(1);
    expect(parseChord('Bm').tones).toEqual([11, 2, 6]);
    expect(parseChord('Asus4').tones).toEqual([9, 2, 4]);
  });

  it('voice leading keeps chord tones in range with small motion', () => {
    const d = voiceLead(null, parseChord('D'), 50, 67, 4);
    const a = voiceLead(d, parseChord('A/C#'), 50, 67, 4);
    for (const n of a) {
      expect(n).toBeGreaterThanOrEqual(50);
      expect(n).toBeLessThanOrEqual(67);
      expect(parseChord('A').tones).toContain(n % 12);
    }
    const motion = a.reduce((s, n, i) => s + Math.abs(n - (d[i] ?? n)), 0);
    expect(motion).toBeLessThanOrEqual(8);
  });
});

describe('director', () => {
  it('is deterministic per seed and mood', () => {
    const a = perform(p01Lullaby, { seed: 11, mood: 'clear' });
    const b = perform(p01Lullaby, { seed: 11, mood: 'clear' });
    expect(a.events).toEqual(b.events);
  });

  it('different seeds give different performances', () => {
    const a = perform(p01Lullaby, { seed: 1, mood: 'clear' });
    const b = perform(p01Lullaby, { seed: 2, mood: 'clear' });
    expect(JSON.stringify(a.events)).not.toBe(JSON.stringify(b.events));
  });

  it('produces sane events in every mood', () => {
    for (const mood of ['clear', 'snow', 'night'] as const) {
      for (let seed = 0; seed < 20; seed++) {
        const p = perform(p01Lullaby, { seed, mood });
        expect(p.events.length).toBeGreaterThan(80);
        expect(p.duration).toBeGreaterThan(40);
        expect(p.duration).toBeLessThan(200);
        for (const e of p.events) {
          expect(e.t).toBeGreaterThanOrEqual(0);
          expect(e.dur).toBeGreaterThan(0);
          expect(e.vel).toBeGreaterThan(0);
          expect(e.vel).toBeLessThanOrEqual(1);
          expect(e.midi).toBeGreaterThanOrEqual(30);
          expect(e.midi).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('the first A section states the theme plainly on piano', () => {
    const p = perform(p01Lullaby, { seed: 5, mood: 'clear' });
    const aStart = p.markers.find((m) => m.label === 'A')?.t ?? 0;
    const firstMelody = p.events.filter((e) => e.t >= aStart - 0.05 && e.midi >= 64 && e.inst !== 'warmPad');
    expect(firstMelody.length).toBeGreaterThan(0);
  });
});
