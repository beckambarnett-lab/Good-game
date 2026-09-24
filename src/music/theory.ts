// Music theory helpers: note names, chord symbols, and voice leading.

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'F#4' → 66, 'Bb3' → 58. */
export function noteToMidi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note name: ${name}`);
  const base = PC[m[1] as string] ?? 0;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + base + acc;
}

export function pitchClassOf(name: string): number {
  const m = /^([A-G])([#b]?)/.exec(name);
  if (!m) throw new Error(`Bad pitch class: ${name}`);
  return ((PC[m[1] as string] ?? 0) + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}

export interface Chord {
  symbol: string;
  root: number;
  /** Pitch classes of the chord tones, root first. */
  tones: number[];
  /** Pitch class of the bass (slash chords), otherwise the root. */
  bass: number;
}

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  add9: [0, 4, 7, 14],
  '6': [0, 4, 7, 9],
  '69': [0, 4, 7, 9, 14],
  '7sus': [0, 5, 7, 10],
};

/** Parse symbols like 'D', 'Bm', 'A7', 'A/C#', 'Gmaj7', 'Esus4', 'Dadd9'. */
export function parseChord(symbol: string): Chord {
  const [main, slash] = symbol.split('/');
  const m = /^([A-G][#b]?)(.*)$/.exec(main ?? '');
  if (!m) throw new Error(`Bad chord: ${symbol}`);
  const root = pitchClassOf(m[1] as string);
  const intervals = QUALITIES[m[2] ?? ''];
  if (!intervals) throw new Error(`Unknown chord quality in ${symbol}`);
  return {
    symbol,
    root,
    tones: intervals.map((i) => (root + i) % 12),
    bass: slash ? pitchClassOf(slash) : root,
  };
}

/** All MIDI notes in [lo, hi] whose pitch class is in `pcs`. */
export function notesInRange(pcs: readonly number[], lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let n = lo; n <= hi; n++) if (pcs.includes(((n % 12) + 12) % 12)) out.push(n);
  return out;
}

/** Lowest MIDI note >= `lo` with pitch class `pc`. */
export function lowestAtOrAbove(pc: number, lo: number): number {
  let n = lo;
  while (((n % 12) + 12) % 12 !== pc) n++;
  return n;
}

/**
 * Choose `count` chord tones in [lo, hi] that cover the chord's core (root, third or sus, fifth
 * optional) with the least total movement from `prev`. Small search; fine per bar.
 */
export function voiceLead(
  prev: readonly number[] | null,
  chord: Chord,
  lo: number,
  hi: number,
  count: number,
): number[] {
  const candidates = notesInRange(chord.tones, lo, hi);
  const third = chord.tones[1] ?? chord.root;
  let best: number[] = [];
  let bestCost = Infinity;
  const choose = (start: number, picked: number[]) => {
    if (picked.length === count) {
      const pcs = picked.map((n) => n % 12);
      if (!pcs.includes(chord.root % 12) || !pcs.includes(third % 12)) return;
      // Avoid muddy close intervals low down (no seconds below C4).
      for (let i = 1; i < picked.length; i++) {
        const a = picked[i - 1] as number;
        const b = picked[i] as number;
        if (b - a < 3 && a < 60) return;
      }
      let cost = 0;
      if (prev && prev.length === count) {
        for (let i = 0; i < count; i++) cost += Math.abs((picked[i] as number) - (prev[i] as number));
      } else {
        const center = (lo + hi) / 2;
        for (const n of picked) cost += Math.abs(n - center) * 0.5;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = [...picked];
      }
      return;
    }
    for (let i = start; i < candidates.length; i++) {
      const n = candidates[i] as number;
      if (picked.length > 0 && n - (picked[picked.length - 1] as number) > 9) break;
      picked.push(n);
      choose(i + 1, picked);
      picked.pop();
    }
  };
  choose(0, []);
  if (best.length === 0) return candidates.slice(0, count);
  return best;
}
