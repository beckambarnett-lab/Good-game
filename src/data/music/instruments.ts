// Instrument recipes for the Sound Foundry. Every number here shapes a timbre; the Music Lab
// exposes the most important ones so the user can tune them by ear.

export interface FeltPianoParams {
  sampleRate: number;
  /** Lowest and highest sampled MIDI notes, sampled every `stepSemitones`. */
  lowMidi: number;
  highMidi: number;
  stepSemitones: number;
  velocityLayers: readonly number[];
  maxPartials: number;
  /** Inharmonicity coefficient at MIDI 48; doubles every `inharmonicityOctaves * 12` semitones. */
  inharmonicityAt48: number;
  inharmonicityOctaves: number;
  /** Spectral slope exponent for soft and hard hits (amplitude ~ 1/n^p). */
  slopeSoft: number;
  slopeHard: number;
  /** Felt low-pass corner (Hz) for soft and hard hits. */
  feltCornerSoft: number;
  feltCornerHard: number;
  /** Strike position as a fraction of string length; partials near multiples of 1/x are weak. */
  strikePosition: number;
  /** Fundamental slow-decay time (s) at MIDI 36; scales with pitch by `decayPitchExponent`. */
  decayAt36: number;
  decayPitchExponent: number;
  /** Share of energy in the fast "prompt" decay versus the slow "aftersound". */
  promptShare: number;
  promptRatio: number;
  /** Detune between the two unison strings, in cents (gives slow beating). */
  unisonDetuneCents: number;
  attackSoftMs: number;
  attackHardMs: number;
  /** Felt/key thump level relative to the tone. */
  thumpLevel: number;
  minSeconds: number;
  maxSeconds: number;
}

export const feltPiano: FeltPianoParams = {
  sampleRate: 32000,
  lowMidi: 33,
  highMidi: 99,
  stepSemitones: 3,
  velocityLayers: [0.45, 0.85],
  maxPartials: 22,
  inharmonicityAt48: 0.00016,
  inharmonicityOctaves: 1.5,
  slopeSoft: 1.9,
  slopeHard: 1.35,
  feltCornerSoft: 900,
  feltCornerHard: 2600,
  strikePosition: 1 / 7.3,
  decayAt36: 7.5,
  decayPitchExponent: 0.55,
  promptShare: 0.55,
  promptRatio: 0.22,
  unisonDetuneCents: 0.9,
  attackSoftMs: 7,
  attackHardMs: 3,
  thumpLevel: 0.07,
  minSeconds: 2.2,
  maxSeconds: 5,
};

export interface WarmPadParams {
  sampleRate: number;
  lowMidi: number;
  highMidi: number;
  stepSemitones: number;
  seconds: number;
  voices: number;
  detuneCents: number;
  /** Harmonic roll-off corner in Hz (warmth). */
  corner: number;
  maxHarmonicHz: number;
  /** Depth and rate of slow per-voice amplitude drift (breathing). */
  driftDepth: number;
  driftRateHz: number;
  airLevel: number;
}

export const warmPad: WarmPadParams = {
  sampleRate: 32000,
  lowMidi: 36,
  highMidi: 84,
  stepSemitones: 4,
  seconds: 9,
  voices: 5,
  detuneCents: 7,
  corner: 900,
  maxHarmonicHz: 6000,
  driftDepth: 0.18,
  driftRateHz: 0.11,
  airLevel: 0.012,
};

export interface MusicBoxParams {
  sampleRate: number;
  lowMidi: number;
  highMidi: number;
  stepSemitones: number;
  seconds: number;
  /** Tine partial ratios, relative levels and decay times (s). */
  partials: readonly { ratio: number; level: number; decay: number }[];
  clickLevel: number;
}

export const musicBox: MusicBoxParams = {
  sampleRate: 44100,
  lowMidi: 60,
  highMidi: 99,
  stepSemitones: 3,
  seconds: 3.2,
  partials: [
    { ratio: 1, level: 1, decay: 1.6 },
    { ratio: 2.0, level: 0.08, decay: 0.9 },
    { ratio: 5.4, level: 0.22, decay: 0.35 },
    { ratio: 8.93, level: 0.1, decay: 0.16 },
    { ratio: 14.9, level: 0.04, decay: 0.07 },
  ],
  clickLevel: 0.05,
};
