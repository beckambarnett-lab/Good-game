// Critically damped spring (smooth, no overshoot) — used for cameras, UI and anything that
// should ease toward a moving target without jitter.

export interface SpringState {
  value: number;
  velocity: number;
}

/** Advance a critically damped spring toward `target` with angular frequency `omega`. */
export function springStep(s: SpringState, target: number, omega: number, dt: number): void {
  const x = s.value - target;
  const exp = Math.exp(-omega * dt);
  const temp = (s.velocity + omega * x) * dt;
  s.value = target + (x + temp) * exp;
  s.velocity = (s.velocity - omega * temp) * exp;
}

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
