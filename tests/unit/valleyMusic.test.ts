import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng.ts';
import { valleyMusic } from '../../src/data/tuning.ts';
import type { Performance } from '../../src/music/director.ts';
import type { MusicPlayer } from '../../src/view/audio/MusicPlayer.ts';
import { type MusicFrequency, ValleyMusic } from '../../src/view/audio/ValleyMusic.ts';

/** Stands in for the Web Audio player: a clock and a record of what was started when. */
class FakePlayer {
  now = 0;
  until = 0;
  readonly starts: { at: number; perf: Performance }[] = [];
  isPlaying(): boolean {
    return this.now < this.until;
  }
  play(perf: Performance): void {
    this.starts.push({ at: this.now, perf });
    this.until = this.now + perf.duration;
  }
}

function run(frequency: MusicFrequency, seconds: number) {
  const player = new FakePlayer();
  const music = new ValleyMusic(player as unknown as MusicPlayer, valleyMusic, new Rng(4), () => frequency);
  const dt = 0.25;
  for (let t = 0; t < seconds; t += dt) {
    player.now = t;
    music.update(dt);
  }
  return player.starts;
}

describe('valley music (Plan Part 6.3 rests)', () => {
  it('plays a first phrase soon after arriving, then rests by the Music frequency setting', () => {
    for (const frequency of ['often', 'sometimes', 'rarely'] as const) {
      const starts = run(frequency, 3600);
      expect(starts[0]?.at).toBeCloseTo(valleyMusic.firstAfter, 0);
      const [lo, hi] = valleyMusic.rests[frequency];
      for (let i = 1; i < starts.length; i++) {
        const prev = starts[i - 1] as { at: number; perf: Performance };
        const rest = (starts[i]?.at ?? 0) - (prev.at + prev.perf.duration);
        expect(rest).toBeGreaterThanOrEqual(lo - 0.5);
        expect(rest).toBeLessThanOrEqual(hi + 0.5);
      }
      expect(starts.length).toBeGreaterThan(3600 / (hi + 20) - 1);
      for (const s of starts) expect(s.perf.events.every((e) => e.inst === 'feltPiano')).toBe(true);
    }
  });

  it('stays silent when music is off, and never repeats a performance', () => {
    expect(run('off', 600)).toEqual([]);
    const seeds = run('often', 1800).map((s) => s.perf.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});
