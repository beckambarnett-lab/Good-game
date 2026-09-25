// How sampled instruments are played: envelopes and the velocity curve. Shared by the browser
// MusicPlayer and the offline mixer so what the QA tools measure matches what players hear.

import type { InstrumentId } from '../../dsp/bank.ts';

export interface PlaybackShape {
  /** Attack ramp (s) applied at note start (pads fade in; struck instruments start at once). */
  attack: number;
  /** Release (s) applied after the note's duration ends (dampers, pad fade-out). */
  release: number;
  /** Minimum ring time (s) before release, for instruments that shouldn't be choked early. */
  minRing: number;
  /** Output gain before the mix bus. */
  gain: number;
}

export const playback: Readonly<Record<InstrumentId, PlaybackShape>> = {
  feltPiano: { attack: 0.002, release: 0.45, minRing: 0.25, gain: 0.55 },
  warmPad: { attack: 1.4, release: 2.2, minRing: 0, gain: 0.3 },
  musicBox: { attack: 0.001, release: 0.9, minRing: 1.2, gain: 0.45 },
};

/** Perceptual velocity curve: soft notes get quieter faster than linearly. */
export const velocityExponent = 1.6;
