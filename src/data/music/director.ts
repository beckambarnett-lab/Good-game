// Director tuning: how the generative performer arranges a piece. Exposed in the Music Lab.

export type Mood = 'clear' | 'snow' | 'night';

export interface MoodSettings {
  /** Chance a section's melody is carried by the music box instead of the piano. */
  boxMelodyChance: number;
  /** Chance of a music-box echo answering a phrase ending. */
  echoChance: number;
  /** Probability each accompaniment note is kept (density). */
  keysDensity: number;
  /** Chance a section uses a low bass note on beat one. */
  bassChance: number;
  /** Shift of the melody register in semitones (snow sits lower and darker). */
  melodyShift: number;
  /** Velocity scale for everything (quieter, softer touch). */
  touch: number;
  /** Chance of whole-bar melody rests inside non-final phrases (breathing). */
  breathChance: number;
  mix: { piano: number; pad: number; box: number };
}

export const moods: Readonly<Record<Mood, MoodSettings>> = {
  clear: {
    boxMelodyChance: 0.2,
    echoChance: 0.3,
    keysDensity: 0.9,
    bassChance: 0.6,
    melodyShift: 0,
    touch: 1,
    breathChance: 0.1,
    mix: { piano: 1, pad: 0.55, box: 0.45 },
  },
  snow: {
    boxMelodyChance: 0,
    echoChance: 0,
    keysDensity: 0.75,
    bassChance: 0.8,
    melodyShift: -12,
    touch: 0.8,
    breathChance: 0.15,
    mix: { piano: 0.95, pad: 0.8, box: 0 },
  },
  night: {
    boxMelodyChance: 0.55,
    echoChance: 0.5,
    keysDensity: 0.6,
    bassChance: 0.4,
    melodyShift: 0,
    touch: 0.75,
    breathChance: 0.2,
    mix: { piano: 0.85, pad: 0.45, box: 0.8 },
  },
};

export const director = {
  /** Section sequences with weights; A2/A3/B2 are varied repeats. */
  forms: [
    { weight: 3, sections: ['intro', 'A', 'A2', 'B', 'A3', 'outro'] },
    { weight: 2, sections: ['intro', 'A', 'B', 'A2', 'outro'] },
    { weight: 1, sections: ['intro', 'A', 'A2', 'B', 'B2', 'A3', 'outro'] },
  ],
  /** Chance a varied section substitutes a chord where the piece allows it. */
  substitutionChance: 0.45,
  /** Chance a varied section ornaments the melody (grace/passing notes). */
  ornamentChance: 0.5,
  /** Chance a varied section plays the melody an octave up. */
  octaveUpChance: 0.2,
  registers: {
    bassLow: 38,
    bassHigh: 50,
    keysLow: 52,
    keysHigh: 71,
    padLow: 50,
    padHigh: 67,
  },
  humanize: {
    timingMs: 12,
    velocity: 0.08,
    /** Extra length of the last beat of each 4-bar phrase (ritardando), and at the very end. */
    phraseRit: 0.08,
    finalRit: 0.25,
    /** Slow tempo drift amplitude (fraction) and period in bars. */
    driftAmount: 0.03,
    driftBars: 11,
  },
  /** Silence between performances (seconds), before a fresh variation starts. */
  restSeconds: { min: 20, max: 60 },
} as const;
