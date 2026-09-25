// Plays Director performances through Web Audio with a lookahead scheduler. Each performance
// has its own fader so variations and mood changes can crossfade instead of cutting.

import { playback, velocityExponent } from '../../data/music/playback.ts';
import { type InstrumentBank, type InstrumentId, pickZone, type Zone } from '../../dsp/bank.ts';
import type { MixGains } from '../../dsp/mixer.ts';
import type { Performance } from '../../music/director.ts';
import type { AudioEngine } from './AudioEngine.ts';

const LOOKAHEAD = 0.5;
const TICK_MS = 50;
const INSTRUMENTS: InstrumentId[] = ['feltPiano', 'warmPad', 'musicBox'];

interface Active {
  perf: Performance;
  start: number;
  next: number;
  faders: Record<InstrumentId, GainNode>;
  sources: Set<AudioBufferSourceNode>;
}

export class MusicPlayer {
  private readonly engine: AudioEngine;
  private readonly banks: ReadonlyMap<InstrumentId, InstrumentBank>;
  private readonly instGains: Record<InstrumentId, GainNode>;
  private readonly buffers = new Map<Zone, AudioBuffer>();
  private readonly active: Active[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(engine: AudioEngine, banks: ReadonlyMap<InstrumentId, InstrumentBank>) {
    this.engine = engine;
    this.banks = banks;
    const ctx = engine.ctx;
    const mk = (): GainNode => {
      const g = ctx.createGain();
      g.connect(engine.buses.music);
      g.connect(engine.musicReverbSend);
      return g;
    };
    this.instGains = { feltPiano: mk(), warmPad: mk(), musicBox: mk() };
  }

  setMix(mix: MixGains): void {
    this.engine.setGain(this.instGains.feltPiano.gain, mix.piano);
    this.engine.setGain(this.instGains.warmPad.gain, mix.pad);
    this.engine.setGain(this.instGains.musicBox.gain, mix.box);
  }

  /** Start a performance now (optionally fading in), crossfading out anything already playing. */
  play(perf: Performance, fadeIn = 0.05, crossfade = 2.5): void {
    for (const a of this.active) this.fadeOut(a, crossfade);
    const ctx = this.engine.ctx;
    const start = ctx.currentTime + 0.15;
    const faders = {} as Record<InstrumentId, GainNode>;
    for (const id of INSTRUMENTS) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(1, start + fadeIn);
      g.connect(this.instGains[id]);
      faders[id] = g;
    }
    this.active.push({ perf, start, next: 0, faders, sources: new Set() });
    this.ensureTimer();
  }

  stop(fade = 1.5): void {
    for (const a of this.active) this.fadeOut(a, fade);
  }

  /** The newest performance's position, for the UI. */
  position(): { perf: Performance; elapsed: number } | null {
    const a = this.active[this.active.length - 1];
    if (!a) return null;
    return { perf: a.perf, elapsed: Math.max(0, this.engine.ctx.currentTime - a.start) };
  }

  isPlaying(): boolean {
    const p = this.position();
    return p !== null && p.elapsed < p.perf.duration;
  }

  private fadeOut(a: Active, seconds: number): void {
    const now = this.engine.ctx.currentTime;
    for (const id of INSTRUMENTS) {
      const g = a.faders[id].gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + seconds);
    }
    a.next = Infinity; // stop scheduling new notes
    setTimeout(
      () => {
        for (const s of a.sources) {
          try {
            s.stop();
          } catch {
            // already stopped
          }
        }
        for (const id of INSTRUMENTS) a.faders[id].disconnect();
        const i = this.active.indexOf(a);
        if (i >= 0) this.active.splice(i, 1);
      },
      (seconds + 0.2) * 1000,
    );
  }

  private ensureTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  private tick(): void {
    const now = this.engine.ctx.currentTime;
    for (const a of this.active) {
      const events = a.perf.events;
      while (a.next < events.length) {
        const e = events[a.next];
        if (!e || a.start + e.t > now + LOOKAHEAD) break;
        if (a.start + e.t >= now - 0.05) this.schedule(a, e.inst, e.midi, e.vel, e.pan, a.start + e.t, e.dur);
        a.next++;
      }
    }
    if (this.active.length === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule(
    a: Active,
    inst: InstrumentId,
    midi: number,
    vel: number,
    pan: number,
    when: number,
    dur: number,
  ): void {
    const bank = this.banks.get(inst);
    if (!bank) return;
    const ctx = this.engine.ctx;
    const zone = pickZone(bank, midi, vel);
    const buffer = this.bufferFor(zone, bank.sampleRate);
    const shape = playback[inst];
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = 2 ** ((midi - zone.midi) / 12);
    const env = ctx.createGain();
    const peak = vel ** velocityExponent * shape.gain;
    const holdEnd = Math.max(dur, shape.minRing);
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + shape.attack);
    env.gain.setValueAtTime(peak, when + holdEnd);
    env.gain.linearRampToValueAtTime(0, when + holdEnd + shape.release);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    src.connect(env).connect(panner).connect(a.faders[inst]);
    src.start(when);
    src.stop(when + holdEnd + shape.release + 0.05);
    a.sources.add(src);
    src.onended = () => {
      a.sources.delete(src);
      panner.disconnect();
      env.disconnect();
    };
  }

  private bufferFor(zone: Zone, sampleRate: number): AudioBuffer {
    let buf = this.buffers.get(zone);
    if (!buf) {
      buf = this.engine.ctx.createBuffer(1, zone.data.length, sampleRate);
      buf.copyToChannel(zone.data as Float32Array<ArrayBuffer>, 0);
      this.buffers.set(zone, buf);
    }
    return buf;
  }
}
