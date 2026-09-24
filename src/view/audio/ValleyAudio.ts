// The valley scene's sound: the engine (unlocked by the splash click), footsteps and the valley's
// music. Footsteps load with the terrain; the piano renders in the background afterwards, and
// the first phrase simply waits for it.

import { Rng } from '../../core/rng.ts';
import { type FootstepTuning, foundry, mixLevels, type ValleyMusicTuning } from '../../data/tuning.ts';
import type { Footfall } from '../../dsp/footsteps.ts';
import { FOOTSTEP_SFX } from '../../dsp/sfx/recipes.ts';
import { dbToGain } from '../../dsp/util.ts';
import { AudioEngine, type BusId } from './AudioEngine.ts';
import { Footsteps } from './Footsteps.ts';
import { renderBanks, renderSfxBank } from './FoundryClient.ts';
import { MusicPlayer } from './MusicPlayer.ts';
import { Sfx } from './Sfx.ts';
import { type MusicFrequency, ValleyMusic } from './ValleyMusic.ts';

export interface ValleyAudioOptions {
  seed: number;
  walkSpeed: number;
  /** Footsteps with this tuning, or none. */
  footsteps: FootstepTuning | null;
  /** The valley's phrases with this tuning, or none. */
  music: ValleyMusicTuning | null;
  musicFrequency: () => MusicFrequency;
}

/** The player's volume settings (0–1) for the master and each bus. */
export type Volumes = Readonly<Record<'master' | BusId, number>>;

export class ValleyAudio {
  readonly engine: AudioEngine;
  footsteps: Footsteps | null = null;
  /** Null until the piano has rendered (or when the valley has no music). */
  music: ValleyMusic | null = null;
  private readonly rng: Rng;

  private constructor(ctx: BaseAudioContext, seed: number) {
    this.engine = new AudioEngine(ctx);
    this.rng = new Rng(seed).fork('valleyAudio');
  }

  static async create(ctx: BaseAudioContext, o: ValleyAudioOptions): Promise<ValleyAudio> {
    const audio = new ValleyAudio(ctx, o.seed);
    if (o.footsteps) {
      const sfx = new Sfx(audio.engine, await renderSfxBank(FOOTSTEP_SFX));
      audio.footsteps = new Footsteps(audio.engine, sfx, o.footsteps, o.walkSpeed, audio.rng.fork('steps'));
    }
    const music = o.music;
    if (music) {
      void renderBanks(['feltPiano'], foundry.bankSeed).then((banks) => {
        const player = new MusicPlayer(audio.engine, banks);
        audio.music = new ValleyMusic(player, music, audio.rng.fork('music'), o.musicFrequency);
      });
    }
    return audio;
  }

  footfall(f: Footfall): void {
    this.footsteps?.footfall(f);
  }

  update(dt: number): void {
    this.music?.update(dt);
  }

  /** Applies the player's volumes on top of the mix's bus reference levels. */
  setVolumes(v: Volumes): void {
    const e = this.engine;
    e.setGain(e.master.gain, v.master);
    for (const bus of Object.keys(e.buses) as BusId[]) {
      e.setGain(e.buses[bus].gain, v[bus] * dbToGain(mixLevels[bus]));
    }
  }
}
