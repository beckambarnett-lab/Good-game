// P01 — "Wrenhollow Lullaby", the main theme (Plan Part 6.4). D major, 3/4, 66 BPM.
// Melody notes are [beat offset within bar, note, length in beats].

export type MelodyBar = readonly (readonly [number, string, number])[];

export interface SectionDef {
  chords: readonly string[];
  melody: readonly MelodyBar[];
  /** Harmless substitutions the Director may use in variations, per bar index. */
  substitutions?: Readonly<Record<number, readonly string[]>>;
}

export interface PieceDef {
  id: string;
  title: string;
  tonic: string;
  beatsPerBar: number;
  bpm: number;
  sections: Readonly<Record<'A' | 'B', SectionDef>>;
}

export const p01Lullaby: PieceDef = {
  id: 'P01',
  title: 'Wrenhollow Lullaby',
  tonic: 'D',
  beatsPerBar: 3,
  bpm: 66,
  sections: {
    A: {
      chords: ['D', 'A/C#', 'G', 'A', 'D', 'Bm', 'A', 'D'],
      melody: [
        [
          [0, 'F#4', 1],
          [1, 'A4', 1],
          [2, 'D5', 1],
        ],
        [
          [0, 'C#5', 2],
          [2, 'B4', 1],
        ],
        [
          [0, 'A4', 1],
          [1, 'F#4', 1],
          [2, 'G4', 1],
        ],
        [[0, 'A4', 3]],
        [
          [0, 'F#4', 1],
          [1, 'A4', 1],
          [2, 'D5', 1],
        ],
        [
          [0, 'E5', 2],
          [2, 'D5', 1],
        ],
        [
          [0, 'C#5', 1],
          [1, 'B4', 1],
          [2, 'C#5', 1],
        ],
        [[0, 'D5', 3]],
      ],
      substitutions: { 0: ['Dadd9', 'D6'], 2: ['Gmaj7'], 3: ['Asus4'], 5: ['Bm7'], 7: ['Dadd9'] },
    },
    B: {
      chords: ['Bm', 'G', 'A', 'D/F#', 'Em', 'A/C#', 'A7', 'D'],
      melody: [
        [
          [0, 'B4', 1],
          [1, 'D5', 1],
          [2, 'F#5', 1],
        ],
        [
          [0, 'E5', 2],
          [2, 'D5', 1],
        ],
        [
          [0, 'C#5', 1],
          [1, 'A4', 1],
          [2, 'B4', 1],
        ],
        [
          [0, 'A4', 2],
          [2, 'F#4', 1],
        ],
        [
          [0, 'G4', 1],
          [1, 'B4', 1],
          [2, 'E5', 1],
        ],
        [
          [0, 'D5', 2],
          [2, 'C#5', 1],
        ],
        [
          [0, 'E4', 1],
          [1, 'G4', 1],
          [2, 'C#5', 1],
        ],
        [[0, 'D5', 3]],
      ],
      substitutions: { 0: ['Bm7'], 1: ['Gmaj7'], 4: ['Em7'], 7: ['Dadd9', 'D6'] },
    },
  },
};
