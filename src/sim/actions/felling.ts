// Felling minigame (user design): a marker sweeps back and forth across a bar with a green
// centre zone. Pressing while the marker is in the green lands a chop; misses cost nothing but a
// short lockout. After `chopsToFell` chops the tree falls. Bigger trees sweep slower.
// Pure logic: the view reads `marker` and reacts to returned outcomes.

import type { FellingTuning, TreeSize } from '../../data/tuning.ts';

export type ChopOutcome = 'chop' | 'perfect' | 'miss' | 'ignored';

export interface FellingState {
  size: TreeSize;
  /** Marker position 0..1 along the bar. */
  marker: number;
  /** +1 moving right, -1 moving left. */
  direction: 1 | -1;
  chops: number;
  /** Seconds remaining in which presses are ignored (after chop or miss). */
  lock: number;
  felled: boolean;
  /** After a chop the marker restarts from an edge, so every chop needs its own timing. */
  restartPending: boolean;
}

export function startFelling(size: TreeSize, startAt = 0): FellingState {
  return { size, marker: startAt, direction: 1, chops: 0, lock: 0, felled: false, restartPending: false };
}

export function greenWidth(t: FellingTuning, axeTier = 0): number {
  return Math.min(0.9, t.greenWidth + (t.axeGreenBonus[axeTier] ?? 0));
}

/** Zone test: where the marker is relative to the centre. */
export function zoneAt(marker: number, t: FellingTuning, axeTier = 0): 'perfect' | 'green' | 'outside' {
  const d = Math.abs(marker - 0.5);
  if (d <= t.perfectWidth / 2) return 'perfect';
  if (d <= greenWidth(t, axeTier) / 2) return 'green';
  return 'outside';
}

/** Advance the marker by dt seconds (ping-pong, constant speed; slower in green when relaxed). */
export function stepFelling(
  s: FellingState,
  dt: number,
  t: FellingTuning,
  relaxed = false,
  axeTier = 0,
): void {
  if (s.felled) return;
  let remaining = dt;
  // After a chop the bar holds still for the swing; spend the hold first, move with the rest.
  if (s.restartPending) {
    const hold = Math.max(0, s.lock - t.missLockout);
    const used = Math.min(hold, remaining);
    s.lock -= used;
    remaining -= used;
    if (s.lock > t.missLockout) return;
    s.restartPending = false;
    s.marker = s.direction > 0 ? 0 : 1;
  }
  s.lock = Math.max(0, s.lock - remaining);
  // Sub-step so relaxed-mode speed changes at the zone edge stay accurate.
  while (remaining > 0) {
    const h = Math.min(remaining, 1 / 240);
    remaining -= h;
    let speed = 1 / t.sweepSeconds[s.size];
    if (relaxed && zoneAt(s.marker, t, axeTier) !== 'outside') speed *= t.relaxedGreenSpeed;
    s.marker += s.direction * speed * h;
    if (s.marker >= 1) {
      s.marker = 2 - s.marker;
      s.direction = -1;
    } else if (s.marker <= 0) {
      s.marker = -s.marker;
      s.direction = 1;
    }
  }
}

/** The player pressed chop. */
export function pressChop(s: FellingState, t: FellingTuning, axeTier = 0): ChopOutcome {
  if (s.felled || s.lock > 0) return 'ignored';
  const zone = zoneAt(s.marker, t, axeTier);
  if (zone === 'outside') {
    s.lock = t.missLockout;
    return 'miss';
  }
  s.chops++;
  s.lock = t.chopRecover + t.missLockout;
  s.restartPending = true;
  if (s.chops >= t.chopsToFell) s.felled = true;
  return zone === 'perfect' ? 'perfect' : 'chop';
}
