// Offline mixer: renders a performance to stereo using the same zones, envelopes and velocity
// curve as the browser player (reverb excluded). Used by QA tools and tests in Node.

import { playback, velocityExponent } from '../data/music/playback.ts';
import type { NoteEvent } from '../music/director.ts';
import { type InstrumentBank, type InstrumentId, pickZone } from './bank.ts';

export interface MixGains {
  piano: number;
  pad: number;
  box: number;
}

export function instrumentGain(inst: InstrumentId, mix: MixGains): number {
  if (inst === 'feltPiano') return mix.piano;
  if (inst === 'warmPad') return mix.pad;
  return mix.box;
}

export function renderMix(
  events: readonly NoteEvent[],
  banks: ReadonlyMap<InstrumentId, InstrumentBank>,
  mix: MixGains,
  sampleRate: number,
  seconds: number,
): [Float32Array, Float32Array] {
  const len = Math.ceil(seconds * sampleRate);
  const left = new Float32Array(len);
  const right = new Float32Array(len);
  for (const e of events) {
    const bank = banks.get(e.inst);
    if (!bank) continue;
    const zone = pickZone(bank, e.midi, e.vel);
    const shape = playback[e.inst];
    const rate = 2 ** ((e.midi - zone.midi) / 12) * (bank.sampleRate / sampleRate);
    const gain = e.vel ** velocityExponent * shape.gain * instrumentGain(e.inst, mix);
    if (gain <= 0) continue;
    const angle = ((e.pan + 1) * Math.PI) / 4;
    const gl = Math.cos(angle) * gain;
    const gr = Math.sin(angle) * gain;
    const start = Math.floor(e.t * sampleRate);
    const holdEnd = Math.max(e.dur, shape.minRing);
    const total = Math.floor((holdEnd + shape.release) * sampleRate);
    const src = zone.data;
    for (let i = 0; i < total; i++) {
      const pos = i * rate;
      const i0 = Math.floor(pos);
      if (i0 + 1 >= src.length) break;
      const out = start + i;
      if (out >= len) break;
      const t = i / sampleRate;
      let env = 1;
      if (t < shape.attack) env = t / shape.attack;
      if (t > holdEnd) env *= Math.max(0, 1 - (t - holdEnd) / shape.release);
      const s = ((src[i0] ?? 0) + ((src[i0 + 1] ?? 0) - (src[i0] ?? 0)) * (pos - i0)) * env;
      left[out] = (left[out] ?? 0) + s * gl;
      right[out] = (right[out] ?? 0) + s * gr;
    }
  }
  return [left, right];
}
