// Sample banks: the Foundry renders every instrument at a set of pitches/velocities once, then
// playback picks the nearest zone and pitch-shifts it slightly. Pure, runs in workers and Node.

import { Rng } from '../core/rng.ts';
import { feltPiano, musicBox, warmPad } from '../data/music/instruments.ts';
import { renderFeltPianoNote } from './instruments/feltPiano.ts';
import { renderMusicBoxNote } from './instruments/musicBox.ts';
import { renderWarmPadNote } from './instruments/warmPad.ts';
import { normalizePeak } from './util.ts';

export type InstrumentId = 'feltPiano' | 'warmPad' | 'musicBox';

export interface Zone {
  midi: number;
  velocity: number;
  data: Float32Array;
}

export interface InstrumentBank {
  id: InstrumentId;
  sampleRate: number;
  /** True if the sample is a steady tone that needs a playback envelope (pads). */
  sustained: boolean;
  zones: Zone[];
}

export interface ZoneJob {
  instrument: InstrumentId;
  midi: number;
  velocity: number;
  seed: number;
}

/** Enumerate every zone an instrument needs; each job is independent so workers can share them. */
export function zoneJobs(instrument: InstrumentId, seed: number): ZoneJob[] {
  const jobs: ZoneJob[] = [];
  const add = (lo: number, hi: number, step: number, velocities: readonly number[]) => {
    for (let m = lo; m <= hi; m += step) {
      for (const v of velocities) {
        jobs.push({ instrument, midi: m, velocity: v, seed: (seed + m * 131 + Math.round(v * 1000)) >>> 0 });
      }
    }
  };
  if (instrument === 'feltPiano')
    add(feltPiano.lowMidi, feltPiano.highMidi, feltPiano.stepSemitones, feltPiano.velocityLayers);
  if (instrument === 'warmPad') add(warmPad.lowMidi, warmPad.highMidi, warmPad.stepSemitones, [1]);
  if (instrument === 'musicBox') add(musicBox.lowMidi, musicBox.highMidi, musicBox.stepSemitones, [1]);
  return jobs;
}

export function sampleRateOf(instrument: InstrumentId): number {
  if (instrument === 'feltPiano') return feltPiano.sampleRate;
  if (instrument === 'warmPad') return warmPad.sampleRate;
  return musicBox.sampleRate;
}

/** Render one zone; peak levels are fixed per instrument so playback gains are comparable. */
export function renderZone(job: ZoneJob): Float32Array {
  const rng = new Rng(job.seed);
  let data: Float32Array;
  if (job.instrument === 'feltPiano') {
    data = renderFeltPianoNote(feltPiano, job.midi, job.velocity, rng);
    normalizePeak(data, 0.9);
  } else if (job.instrument === 'warmPad') {
    data = renderWarmPadNote(warmPad, job.midi, rng);
    normalizePeak(data, 0.5);
  } else {
    data = renderMusicBoxNote(musicBox, job.midi, rng);
    normalizePeak(data, 0.7);
  }
  return data;
}

export function buildBank(instrument: InstrumentId, seed: number): InstrumentBank {
  const zones = zoneJobs(instrument, seed).map((j) => ({
    midi: j.midi,
    velocity: j.velocity,
    data: renderZone(j),
  }));
  return { id: instrument, sampleRate: sampleRateOf(instrument), sustained: instrument === 'warmPad', zones };
}

/** Nearest zone by pitch, then by velocity. */
export function pickZone(bank: InstrumentBank, midi: number, velocity: number): Zone {
  let best: Zone | undefined;
  let bestScore = Infinity;
  for (const z of bank.zones) {
    const score = Math.abs(z.midi - midi) * 10 + Math.abs(z.velocity - velocity);
    if (score < bestScore) {
      bestScore = score;
      best = z;
    }
  }
  if (!best) throw new Error(`Empty bank ${bank.id}`);
  return best;
}
