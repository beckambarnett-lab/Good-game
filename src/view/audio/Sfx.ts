// One-shot sound effects: picks a variant (never the same one twice in a row) and adds small
// pitch and gain randomization so repeated actions never sound mechanical.

import { SFX_RATE, type SfxId } from '../../dsp/sfx/recipes.ts';
import type { AudioEngine } from './AudioEngine.ts';

export interface SfxPlay {
  gain?: number;
  /** Semitone offset (e.g. deeper for bigger trees). */
  pitch?: number;
  /** Random pitch spread in semitones (±). */
  pitchJitter?: number;
  pan?: number;
  /** Seconds from now. */
  delay?: number;
}

export class Sfx {
  private readonly engine: AudioEngine;
  private readonly buffers = new Map<SfxId, AudioBuffer[]>();
  private readonly last = new Map<SfxId, number>();
  readonly out: GainNode;

  constructor(engine: AudioEngine, variants: ReadonlyMap<SfxId, Float32Array[]>) {
    this.engine = engine;
    const ctx = engine.ctx;
    this.out = ctx.createGain();
    this.out.connect(engine.buses.sfx);
    for (const [id, list] of variants) {
      this.buffers.set(
        id,
        list.map((d) => {
          const b = ctx.createBuffer(1, d.length, SFX_RATE);
          b.copyToChannel(d as Float32Array<ArrayBuffer>, 0);
          return b;
        }),
      );
    }
  }

  play(id: SfxId, opts: SfxPlay = {}): void {
    const list = this.buffers.get(id);
    if (!list || list.length === 0) return;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this.last.get(id)) i = (i + 1) % list.length;
    this.last.set(id, i);
    const ctx = this.engine.ctx;
    const when = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = list[i] ?? null;
    const jitter = (Math.random() * 2 - 1) * (opts.pitchJitter ?? 0.4);
    src.playbackRate.value = 2 ** (((opts.pitch ?? 0) + jitter) / 12);
    const g = ctx.createGain();
    g.gain.value = (opts.gain ?? 1) * (0.9 + Math.random() * 0.2);
    const p = ctx.createStereoPanner();
    p.pan.value = opts.pan ?? 0;
    src.connect(g).connect(p).connect(this.out);
    src.start(when);
    src.onended = () => {
      p.disconnect();
      g.disconnect();
    };
  }
}
