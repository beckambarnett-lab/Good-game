// Web Audio engine: one context, category buses, reverb send, glue compressor and limiter.
// The AudioContext must be created/resumed from a user gesture (the splash click).

import { generateIr, type IrSpec, musicHall } from '../../dsp/ir.ts';

export type BusId = 'music' | 'ambience' | 'sfx' | 'voice' | 'ui';

export class AudioEngine {
  readonly ctx: BaseAudioContext;
  readonly master: GainNode;
  readonly buses: Record<BusId, GainNode>;
  /** Music reverb send (wet) and its return level. */
  readonly musicReverbSend: GainNode;
  private readonly reverbReturn: GainNode;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18;
    glue.knee.value = 12;
    glue.ratio.value = 2;
    glue.attack.value = 0.02;
    glue.release.value = 0.25;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.1;
    this.master = ctx.createGain();
    this.master.connect(glue).connect(limiter).connect(ctx.destination);

    const mk = (): GainNode => {
      const g = ctx.createGain();
      g.connect(this.master);
      return g;
    };
    this.buses = { music: mk(), ambience: mk(), sfx: mk(), voice: mk(), ui: mk() };

    this.musicReverbSend = ctx.createGain();
    this.musicReverbSend.gain.value = 0.35;
    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeIr(musicHall);
    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 1;
    this.musicReverbSend.connect(convolver).connect(this.reverbReturn).connect(this.buses.music);
  }

  makeIr(spec: IrSpec): AudioBuffer {
    const [l, r] = generateIr(spec, this.ctx.sampleRate);
    const buf = this.ctx.createBuffer(2, l.length, this.ctx.sampleRate);
    buf.copyToChannel(l as Float32Array<ArrayBuffer>, 0);
    buf.copyToChannel(r as Float32Array<ArrayBuffer>, 1);
    return buf;
  }

  /** Smoothly set a gain param (no zipper noise, no clicks). */
  setGain(param: AudioParam, value: number, seconds = 0.08): void {
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }
}
