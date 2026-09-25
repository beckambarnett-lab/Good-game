// One-shot sound effects: picks a variant (never the same one twice in a row) and adds small
// pitch and gain randomization so repeated actions never sound mechanical. `voice` plays an
// exact, pre-planned variation instead (footsteps plan theirs in pure code; Plan Part 6.8).

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

/** A fully specified playback: which variant, and exactly how. */
export interface SfxVoice {
  id: SfxId;
  variant: number;
  gain: number;
  /** Playback rate (1 = as rendered). */
  rate: number;
  pan: number;
  /** High-shelf boost (dB) at `shelfHz`; 0 for none. */
  shelfDb: number;
  /** Seconds from now. */
  delay: number;
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
    const jitter = (Math.random() * 2 - 1) * (opts.pitchJitter ?? 0.4);
    this.start(list[i], {
      gain: (opts.gain ?? 1) * (0.9 + Math.random() * 0.2),
      rate: 2 ** (((opts.pitch ?? 0) + jitter) / 12),
      pan: opts.pan ?? 0,
      shelfDb: 0,
      delay: opts.delay ?? 0,
      shelfHz: 0,
      to: this.out,
    });
  }

  /** Plays a planned voice into `to` (default: this player's output). */
  voice(v: SfxVoice, shelfHz: number, to: AudioNode = this.out): void {
    this.start(this.buffers.get(v.id)?.[v.variant], { ...v, shelfHz, to });
  }

  private start(
    buffer: AudioBuffer | undefined,
    v: {
      gain: number;
      rate: number;
      pan: number;
      shelfDb: number;
      shelfHz: number;
      delay: number;
      to: AudioNode;
    },
  ): void {
    if (!buffer) return;
    const ctx = this.engine.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = v.rate;
    const g = ctx.createGain();
    g.gain.value = v.gain;
    const p = ctx.createStereoPanner();
    p.pan.value = v.pan;
    const nodes: AudioNode[] = [g, p];
    if (v.shelfDb !== 0) {
      const shelf = ctx.createBiquadFilter();
      shelf.type = 'highshelf';
      shelf.frequency.value = v.shelfHz;
      shelf.gain.value = v.shelfDb;
      nodes.unshift(shelf);
    }
    let tail: AudioNode = src;
    for (const n of nodes) tail = tail.connect(n);
    tail.connect(v.to);
    src.start(ctx.currentTime + v.delay);
    src.onended = () => {
      for (const n of nodes) n.disconnect();
    };
  }
}
