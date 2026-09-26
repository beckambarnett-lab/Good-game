// Uniforms every weather-aware material shares (Plan Part 7.9): one object, so the Environment
// system (M1) updates wind, gusts and time in one place and every shader sees it.

import { Vector2 } from 'three';

export const shared = {
  /** Seconds since the stage started. */
  uTime: { value: 0 },
  /** Wind direction on the ground plane (unit). */
  uWind: { value: new Vector2(0.8, 0.6).normalize() },
};
