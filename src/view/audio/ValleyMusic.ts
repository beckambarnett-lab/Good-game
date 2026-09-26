// The valley's M0 music (Plan Part 6.3): now and then a single felt-piano phrase of the main
// theme, performed fresh by the Director each time, with rests between set by the Music
// frequency setting. The full Director (pieces by zone, hour and weather) replaces it in M1.

import type { Rng } from '../../core/rng.ts';
import { p01Lullaby } from '../../data/music/pieces/p01Lullaby.ts';
import type { ValleyMusicTuning } from '../../data/tuning.ts';
import { type Performance, perform } from '../../music/director.ts';
import type { MusicPlayer } from './MusicPlayer.ts';

export type MusicFrequency = 'often' | 'sometimes' | 'rarely' | 'off';

/** While the setting is Off, look again this often (s) in case it changes. */
const OFF_RECHECK = 2;

export class ValleyMusic {
  private readonly player: MusicPlayer;
  private readonly t: ValleyMusicTuning;
  private readonly rng: Rng;
  private readonly frequency: () => MusicFrequency;
  private wait: number;

  constructor(player: MusicPlayer, t: ValleyMusicTuning, rng: Rng, frequency: () => MusicFrequency) {
    this.player = player;
    this.t = t;
    this.rng = rng;
    this.frequency = frequency;
    this.wait = t.firstAfter;
  }

  /** Counts the rest down while nothing plays; starts the next phrase when it runs out. */
  update(dt: number): void {
    if (this.player.isPlaying()) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    if (this.frequency() === 'off') {
      this.wait = OFF_RECHECK;
      return;
    }
    this.playNow();
  }

  /** Plays a phrase at once (the lab's button) and schedules the rest after it. */
  playNow(): Performance {
    const { section, index } = this.rng.pick(this.t.phrases);
    const perf = perform(p01Lullaby, {
      seed: this.rng.int(1, 0x7fffffff),
      mood: 'clear',
      phrase: { section, index },
      only: ['feltPiano'],
    });
    this.player.play(perf, this.t.fadeIn);
    const f = this.frequency();
    const [lo, hi] = this.t.rests[f === 'off' ? 'rarely' : f];
    this.wait = this.rng.range(lo, hi);
    return perf;
  }

  /** Seconds until the next phrase, once the current one ends. */
  get restLeft(): number {
    return Math.max(0, this.wait);
  }

  get playing(): boolean {
    return this.player.isPlaying();
  }
}
