// Global tunables. Unit stats live in src/data/factions/*.js.
export const TUNING = {
  dt: 1 / 60,
  gravity: -18,
  projGravity: 9.82, // projectiles fly on real-world gravity (scaled per weapon)
  solverIterations: 7,
  solverIterationsLow: 5,
  manyUnits: 90, // above this many live units the solver drops to solverIterationsLow

  // Field
  fieldHalfX: 36,
  fieldHalfZ: 30,
  spawnNear: 4, // min |z| of a spawn zone
  spawnFar: 26, // max |z| of a spawn zone
  killY: -12,

  // Balance controller (per unit, scaled by mass/inertia)
  hoverK: 70,
  hoverC: 13,
  uprightKp: 200,
  uprightKd: 21,
  yawKp: 110,
  yawKd: 16,
  limbKp: 150,
  limbKd: 12,
  headKp: 90,
  headKd: 8,
  accel: 7, // m/s^2 per m/s of velocity error
  maxAccel: 14,
  launchDv: 6, // velocity change from a single hit that sends a unit flying
  maxDvH: 12, // per-hit velocity change caps
  maxDvV: 9,
  healCap: 25, // max HP/s any unit can receive from all heal sources
  hasteSpeed: 0.4,
  hasteRate: 0.35,
  mightDmg: 0.3,
  mightArmor: 0.25,
  allyKnock: 0.5, // splash/slam knockback applied to allies (no damage)
  staggerTime: 0.45,
  recoverTime: 0.9,

  // Battle
  tiredHealersTime: 60, // healing x0.5 after this
  battleTime: 90, // sudden death: no healing, everyone drains, AI charges
  battleHardCap: 120, // then the side with more remaining value wins
  suddenDrain: 0.03, // fraction of max HP lost per second in sudden death (legendaries half)
  stalemate: 15, // no damage for this long before 90 s starts sudden death early

  maxCorpses: 70,

  // AI
  retargetInterval: 0.45,
  separation: 1.1,
  stuckTime: 3.5,

  // Juice
  bigHitImpulse: 900,
};
