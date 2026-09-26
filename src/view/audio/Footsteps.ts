// The footstep player (Plan Part 6.8): each footfall is planned in pure code (surface, layers,
// variation) and played through Sfx on its own fader.

import type { Rng } from '../../core/rng.ts';
import type { FootstepTuning } from '../../data/tuning.ts';
import { type Footfall, FootstepPlanner, type StepVoice } from '../../dsp/footsteps.ts';
import type { SfxId } from '../../dsp/sfx/recipes.ts';
import type { AudioEngine } from './AudioEngine.ts';
import type { Sfx } from './Sfx.ts';

export class Footsteps {
  readonly out: GainNode;
  /** Voices played so far, by sound (for the lab's readout and its automated check). */
  readonly counts = new Map<SfxId, number>();
  private readonly sfx: Sfx;
  private readonly t: FootstepTuning;
  private readonly planner: FootstepPlanner;
  private readonly voices: StepVoice[] = [];

  constructor(engine: AudioEngine, sfx: Sfx, t: FootstepTuning, walkSpeed: number, rng: Rng) {
    this.sfx = sfx;
    this.t = t;
    this.planner = new FootstepPlanner(t, walkSpeed, rng);
    this.out = engine.ctx.createGain();
    this.out.connect(engine.buses.sfx);
  }

  footfall(f: Footfall): void {
    for (const v of this.planner.plan(f, this.voices)) {
      this.sfx.voice(v, this.t.jogShelfHz, this.out);
      this.counts.set(v.id, (this.counts.get(v.id) ?? 0) + 1);
    }
  }
}
