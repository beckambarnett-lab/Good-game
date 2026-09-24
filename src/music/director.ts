// DirectorCore: turns a composed piece into a fresh performance (note events) every time.
// Pure and deterministic for a seed: the same seed and mood always perform identically, so
// performances are reproducible for review ("I liked seed 4817") and testable in Node.

import { Rng } from '../core/rng.ts';
import { director, type Mood, moods } from '../data/music/director.ts';
import type { MelodyBar, PieceDef } from '../data/music/pieces/p01Lullaby.ts';
import type { InstrumentId } from '../dsp/bank.ts';
import { type Chord, lowestAtOrAbove, noteToMidi, parseChord, pitchClassOf, voiceLead } from './theory.ts';

export interface NoteEvent {
  /** Seconds from the start of the performance. */
  t: number;
  dur: number;
  inst: InstrumentId;
  midi: number;
  /** 0..1 */
  vel: number;
  /** -1..1 */
  pan: number;
}

export interface Marker {
  t: number;
  label: string;
}

export interface Performance {
  seed: number;
  mood: Mood;
  form: string[];
  events: NoteEvent[];
  markers: Marker[];
  duration: number;
}

export interface PerformOptions {
  seed: number;
  mood: Mood;
  /** 1 = the piece's own tempo. */
  tempoScale?: number;
}

type KeysPattern = 'waltz' | 'arp6' | 'rolled' | 'sparse' | 'arpUp';

interface Treatment {
  melodyInst: InstrumentId | null;
  ornament: boolean;
  octaveUp: boolean;
  pattern: KeysPattern;
  bass: boolean;
  echo: boolean;
  substitute: boolean;
}

interface BarPlan {
  section: string;
  index: number;
  chord: Chord;
  /** Beat to switch from a sus4 chord to its resolution, if any. */
  resolveAt: number | null;
  resolution: Chord | null;
  melody: MelodyBar | null;
  treatment: Treatment;
  phraseEnd: boolean;
  finalBar: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export function perform(piece: PieceDef, opts: PerformOptions): Performance {
  const rng = new Rng(opts.seed);
  const mood = moods[opts.mood];
  const tempoScale = opts.tempoScale ?? 1;
  const beats = piece.beatsPerBar;
  const tonicPc = pitchClassOf(piece.tonic);
  const scale = MAJOR.map((i) => (i + tonicPc) % 12);

  // 1. Form.
  const formChoice =
    director.forms[rng.weightedIndex(director.forms.map((f) => f.weight))] ?? director.forms[0];
  const form = [...formChoice.sections];

  // 2. Bar plans.
  const bars: BarPlan[] = [];
  const tonicChord = parseChord(piece.tonic);
  for (const section of form) {
    if (section === 'intro') {
      const t = makeTreatment(rng, mood, false, true);
      bars.push(plan('intro', 0, tonicChord, null, t, false));
      bars.push(plan('intro', 1, parseChord(dominantOf(piece.tonic)), null, t, true));
      continue;
    }
    if (section === 'outro') {
      const t = makeTreatment(rng, mood, false, true);
      t.melodyInst = null;
      const outroChords = [subdominantOf(piece.tonic), dominantOf(piece.tonic), piece.tonic];
      outroChords.forEach((c, i) => {
        bars.push(plan('outro', i, parseChord(c), null, t, i === outroChords.length - 1));
      });
      continue;
    }
    const key = section.startsWith('A') ? 'A' : 'B';
    const def = piece.sections[key];
    const varied = section.length > 1;
    const t = makeTreatment(rng, mood, varied, false);
    for (let i = 0; i < def.chords.length; i++) {
      let symbol = def.chords[i] as string;
      const subs = def.substitutions?.[i];
      if (t.substitute && subs && subs.length > 0 && rng.chance(director.substitutionChance))
        symbol = rng.pick(subs);
      const melody = def.melody[i] ?? null;
      bars.push(plan(section, i, parseChord(symbol), melody, t, i % 4 === 3));
    }
  }
  const last = bars[bars.length - 1];
  if (last) last.finalBar = true;

  // 3. Timing: per-beat durations with slow drift, phrase ritardandi and a final slow-down.
  const baseBeat = 60 / (piece.bpm * tempoScale);
  const h = director.humanize;
  const driftPhase = rng.next() * Math.PI * 2;
  const barStarts: number[] = [];
  const beatLens: number[][] = [];
  let cursor = 0;
  bars.forEach((b, bi) => {
    barStarts.push(cursor);
    const drift = 1 + h.driftAmount * Math.sin(driftPhase + (bi / h.driftBars) * Math.PI * 2);
    const lens: number[] = [];
    for (let k = 0; k < beats; k++) {
      let len = baseBeat * drift;
      if (b.phraseEnd && k === beats - 1) len *= 1 + h.phraseRit;
      if (b.finalBar) len *= 1 + h.finalRit * ((k + 1) / beats);
      lens.push(len);
      cursor += len;
    }
    beatLens.push(lens);
  });
  const timeAt = (bi: number, beat: number): number => {
    const lens = beatLens[bi] ?? [];
    let t = barStarts[bi] ?? 0;
    const whole = Math.floor(beat);
    for (let k = 0; k < whole && k < lens.length; k++) t += lens[k] ?? 0;
    const frac = beat - whole;
    if (frac > 0) t += (lens[Math.min(whole, lens.length - 1)] ?? baseBeat) * frac;
    return t;
  };
  const span = (bi: number, beat: number, length: number): number => {
    // Length in seconds of `length` beats from (bar, beat), crossing bar lines if needed.
    let remaining = length;
    let b = bi;
    let at = beat;
    let secs = 0;
    while (remaining > 1e-6) {
      const lens = beatLens[b] ?? [baseBeat, baseBeat, baseBeat];
      const k = Math.floor(at);
      if (k >= lens.length) {
        b++;
        at = 0;
        if (b >= bars.length) {
          secs += remaining * baseBeat;
          break;
        }
        continue;
      }
      const inBeat = Math.min(remaining, k + 1 - at);
      secs += inBeat * (lens[k] ?? baseBeat);
      remaining -= inBeat;
      at += inBeat;
    }
    return secs;
  };
  const jitter = () => (rng.next() * 2 - 1) * (h.timingMs / 1000);
  const humanVel = (v: number) => clamp01(v * mood.touch * (1 + (rng.next() * 2 - 1) * h.velocity));

  const events: NoteEvent[] = [];
  const markers: Marker[] = [];
  const add = (e: NoteEvent) => {
    if (e.vel > 0.01 && e.dur > 0.02) events.push({ ...e, t: Math.max(0, e.t) });
  };

  let prevKeys: number[] | null = null;
  let prevPad: number[] | null = null;
  let padStart = -1;
  let padVoicing: number[] = [];
  let padChordSymbol = '';
  const flushPad = (endT: number) => {
    if (padStart < 0) return;
    padVoicing.forEach((m, i) => {
      add({
        t: padStart,
        dur: Math.min(8.5, endT - padStart + 0.25),
        inst: 'warmPad',
        midi: m,
        vel: humanVel(0.5),
        pan: i % 2 === 0 ? -0.25 : 0.25,
      });
    });
    padStart = -1;
  };

  bars.forEach((b, bi) => {
    const barT = barStarts[bi] ?? 0;
    const barLen = span(bi, 0, beats);
    if (b.index === 0) markers.push({ t: barT, label: sectionLabel(b.section) });

    // Pad: hold across bars with the same chord; re-voice with minimal motion on changes.
    if (b.chord.symbol !== padChordSymbol || padStart < 0 || barT - padStart > 7.5) {
      flushPad(barT);
      padVoicing = voiceLead(prevPad, b.chord, director.registers.padLow, director.registers.padHigh, 4);
      prevPad = padVoicing;
      padStart = barT;
      padChordSymbol = b.chord.symbol;
    }

    // Keys accompaniment.
    const keysHigh = Math.min(director.registers.keysHigh, melodyFloor(b.melody, mood.melodyShift) - 2);
    const voicing = voiceLead(prevKeys, b.chord, director.registers.keysLow, Math.max(keysHigh, 62), 3);
    prevKeys = voicing;
    const bassNote = lowestAtOrAbove(b.chord.bass, director.registers.bassLow);
    const resolutionVoicing = b.resolution
      ? voiceLead(voicing, b.resolution, director.registers.keysLow, Math.max(keysHigh, 62), 3)
      : null;
    for (const hit of keysPattern(b.treatment.pattern, voicing, beats)) {
      const notes = [...hit.notes];
      if (hit.beat === 0 && b.treatment.bass) notes.unshift(bassNote);
      const useVoicing = resolutionVoicing && b.resolveAt !== null && hit.beat >= b.resolveAt;
      notes.forEach((n, i) => {
        const midi = useVoicing ? (resolutionVoicing?.[voicing.indexOf(n)] ?? n) : n;
        if (hit.beat > 0 && !rng.chance(mood.keysDensity)) return;
        add({
          t: timeAt(bi, hit.beat) + jitter() + i * (hit.roll ?? 0),
          dur: span(bi, hit.beat, hit.len),
          inst: 'feltPiano',
          midi,
          vel: humanVel(midi === bassNote ? hit.vel * 1.1 : hit.vel),
          pan: pianoPan(midi),
        });
      });
    }

    // Melody.
    if (b.melody && b.treatment.melodyInst) {
      const skipForBreath = !b.phraseEnd && b.index % 4 !== 0 && rng.chance(mood.breathChance);
      if (!skipForBreath) {
        const inst = b.treatment.melodyInst;
        // The music box already sounds an octave up; it never also takes the octave-up variation.
        const shift = mood.melodyShift + (inst === 'musicBox' ? 12 : b.treatment.octaveUp ? 12 : 0);
        let notes = b.melody.map(([beat, name, len]) => ({ beat, midi: noteToMidi(name) + shift, len }));
        if (notes.some((n) => n.midi > 94)) notes = notes.map((n) => ({ ...n, midi: n.midi - 12 }));
        const shaped = b.treatment.ornament ? ornament(notes, scale, rng) : notes;
        shaped.forEach((n, i) => {
          const isLast = i === shaped.length - 1;
          const accent = n.beat === 0 ? 0.06 : 0;
          const hold = b.phraseEnd && isLast ? 1.25 : 0.96;
          add({
            t: timeAt(bi, n.beat) + jitter(),
            dur: span(bi, n.beat, n.len) * hold,
            inst,
            midi: n.midi,
            vel: humanVel((inst === 'musicBox' ? 0.5 : 0.62) + accent + phraseContour(b.index)),
            pan: inst === 'musicBox' ? 0.3 : pianoPan(n.midi),
          });
        });
      }
    }

    // Echo: the music box answers the end of a phrase with the previous bar's figure.
    if (b.phraseEnd && b.treatment.echo && b.treatment.melodyInst === 'feltPiano') {
      const prevBar = bars[bi - 1]?.melody;
      if (prevBar) {
        prevBar.forEach(([beat, name], i) => {
          add({
            t: timeAt(bi, 1 + beat * 0.5) + jitter(),
            dur: 0.6,
            inst: 'musicBox',
            midi: noteToMidi(name) + 12 + mood.melodyShift,
            vel: humanVel(0.34 - i * 0.04),
            pan: 0.35,
          });
        });
      }
    }

    // Outro: a final music-box figure of the home motif (M1) over the last chord.
    if (b.section === 'outro' && b.finalBar) {
      const tonic = lowestAtOrAbove(tonicPc, 74);
      [tonic - 8, tonic - 5, tonic].forEach((m, i) => {
        add({
          t: timeAt(bi, i * 0.75) + jitter(),
          dur: 2.5,
          inst: 'musicBox',
          midi: m,
          vel: humanVel(0.4),
          pan: 0.3,
        });
      });
    }
    if (b.finalBar) flushPad(barT + barLen + 1.5);
  });
  flushPad(cursor);

  events.sort((a, b) => a.t - b.t);
  const duration = events.reduce((m, e) => Math.max(m, e.t + e.dur), 0) + 2;
  return { seed: opts.seed, mood: opts.mood, form, events, markers, duration };

  function plan(
    section: string,
    index: number,
    chord: Chord,
    melody: MelodyBar | null,
    treatment: Treatment,
    phraseEnd: boolean,
  ): BarPlan {
    let resolveAt: number | null = null;
    let resolution: Chord | null = null;
    if (chord.symbol.endsWith('sus4')) {
      resolveAt = 2;
      resolution = parseChord(chord.symbol.replace('sus4', ''));
    }
    return { section, index, chord, resolveAt, resolution, melody, treatment, phraseEnd, finalBar: false };
  }
}

function makeTreatment(rng: Rng, mood: (typeof moods)[Mood], varied: boolean, frame: boolean): Treatment {
  const patterns: KeysPattern[] = frame
    ? ['rolled', 'sparse']
    : varied
      ? ['arp6', 'waltz', 'arpUp', 'rolled']
      : ['waltz', 'arp6'];
  return {
    melodyInst: rng.chance(varied ? mood.boxMelodyChance : mood.boxMelodyChance * 0.3)
      ? 'musicBox'
      : 'feltPiano',
    ornament: varied && rng.chance(director.ornamentChance),
    octaveUp: varied && rng.chance(director.octaveUpChance),
    pattern: rng.pick(patterns),
    bass: rng.chance(mood.bassChance),
    echo: rng.chance(mood.echoChance),
    substitute: varied,
  };
}

interface Hit {
  beat: number;
  notes: number[];
  len: number;
  vel: number;
  roll?: number;
}

function keysPattern(p: KeysPattern, v: number[], beats: number): Hit[] {
  const [a = 0, b = a, c = b] = v;
  const lastBeat = beats - 1;
  switch (p) {
    case 'waltz':
      return [
        { beat: 0, notes: [], len: 1.5, vel: 0.5 },
        { beat: 1, notes: [b, c], len: 0.9, vel: 0.36 },
        { beat: 2, notes: [b, c], len: 0.9, vel: 0.31 },
      ];
    case 'arp6':
      return [
        { beat: 0, notes: [a], len: 2.5, vel: 0.46 },
        { beat: 0.5, notes: [b], len: 2, vel: 0.34 },
        { beat: 1, notes: [c], len: 1.5, vel: 0.37 },
        { beat: 1.5, notes: [b], len: 1, vel: 0.31 },
        { beat: 2, notes: [a], len: 1, vel: 0.33 },
        { beat: 2.5, notes: [b], len: 0.6, vel: 0.28 },
      ];
    case 'arpUp':
      return [
        { beat: 0, notes: [a], len: 2.5, vel: 0.45 },
        { beat: 1, notes: [b], len: 1.8, vel: 0.35 },
        { beat: 1.5, notes: [c], len: 1.3, vel: 0.33 },
        { beat: lastBeat, notes: [b], len: 1, vel: 0.3 },
      ];
    case 'rolled':
      return [{ beat: 0, notes: [a, b, c], len: beats, vel: 0.4, roll: 0.035 }];
    case 'sparse':
      return [
        { beat: 0, notes: [a], len: 2.5, vel: 0.42 },
        { beat: lastBeat, notes: [c], len: 1, vel: 0.28 },
      ];
  }
}

/** Passing tones between wide quarter-note steps, and the occasional grace note. */
function ornament(notes: { beat: number; midi: number; len: number }[], scale: number[], rng: Rng) {
  const out: { beat: number; midi: number; len: number }[] = [];
  notes.forEach((n, i) => {
    const next = notes[i + 1];
    if (next && n.len === 1 && Math.abs(next.midi - n.midi) >= 3 && rng.chance(0.35)) {
      const dir = Math.sign(next.midi - n.midi);
      let passing = n.midi + dir;
      while (!scale.includes(((passing % 12) + 12) % 12)) passing += dir;
      out.push({ beat: n.beat, midi: n.midi, len: 0.5 });
      out.push({ beat: n.beat + 0.5, midi: passing, len: 0.5 });
      return;
    }
    if (n.len >= 2 && rng.chance(0.2)) {
      let upper = n.midi + 1;
      while (!scale.includes(((upper % 12) + 12) % 12)) upper++;
      out.push({ beat: Math.max(0, n.beat - 0.12), midi: upper, len: 0.12 });
    }
    out.push(n);
  });
  return out;
}

function melodyFloor(bar: MelodyBar | null, shift: number): number {
  if (!bar) return 76;
  let lo = 127;
  for (const [, name] of bar) lo = Math.min(lo, noteToMidi(name) + shift);
  return lo;
}

/** Phrases swell toward their third bar and settle at the end. */
function phraseContour(index: number): number {
  return [0, 0.04, 0.07, -0.02][index % 4] ?? 0;
}

function pianoPan(midi: number): number {
  return Math.max(-0.35, Math.min(0.35, (midi - 64) / 60));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function dominantOf(tonic: string): string {
  return transposeName(tonic, 7);
}

function subdominantOf(tonic: string): string {
  return transposeName(tonic, 5);
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function transposeName(tonic: string, semis: number): string {
  return SHARP_NAMES[(pitchClassOf(tonic) + semis) % 12] as string;
}

function sectionLabel(section: string): string {
  if (section === 'intro') return 'Intro';
  if (section === 'outro') return 'Outro';
  return section.replace(/^([AB])(\d)$/, (_, s: string, n: string) => `${s}${"'".repeat(Number(n) - 1)}`);
}
