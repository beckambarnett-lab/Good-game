// Soak test (Plan Part 7.10), M0 skeleton: runs the real sim headless for many in-game days with a
// random-but-sane walker and checks what long play can break:
// - no exceptions and no NaNs;
// - the walker never leaves the world or sinks into the ground;
// - each day's save round-trips byte-stable, and a restored world runs on identically (saves stand
//   the walker at rest, since a load never resumes mid-stride, so the walker settles first);
// - the sim step stays well inside its CPU budget (Plan 7.8: 2.5 ms, with 4× headroom in Node);
// - memory stays flat (run with --expose-gc).
// NPC routines and lateness join the checks with the townsfolk (M1.10).
// Usage: npm run soak [days] (default 30). Writes artifacts/soak/report.json.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Rng } from '../src/core/rng.ts';
import {
  clock as clockTuning,
  frameBudget,
  movement,
  sim as simTuning,
  valleyView,
} from '../src/data/tuning.ts';
import { wrenhollowForests } from '../src/data/world/forests.ts';
import { places } from '../src/data/world/places.ts';
import { wrenhollowTerrain } from '../src/data/world/terrain.ts';
import { ClockSystem } from '../src/sim/clock/ClockSystem.ts';
import type { MovementWorld, MoverState } from '../src/sim/player/Movement.ts';
import { PlayerSystem } from '../src/sim/player/PlayerSystem.ts';
import { Sim } from '../src/sim/Sim.ts';
import { buildSave, restoreSave, type SaveMeta } from '../src/sim/save/SaveModel.ts';
import { decodeSave, encodeSave } from '../src/sim/save/Serializer.ts';
import { valleyMovementWorld } from '../src/sim/world/MovementWorld.ts';
import { generateSites } from '../src/sim/world/Sites.ts';
import { generateTerrain } from '../src/sim/world/TerrainGen.ts';

const DAYS = Number(process.argv[2] ?? 30);
const BOT_SEED = 20260925;
/** The walker: how close counts as arrived (m), how long without progress means stuck (s). */
const ARRIVE_M = 3;
const STUCK_SECONDS = 25;
const PROGRESS_M = 0.5;
/** Half its trips go to a named place; the rest wander this far (m). Pauses on arrival (s). */
const WANDER_M = 80;
const PAUSE: readonly [number, number] = [2, 8];
const JOG_CHANCE = 0.3;
const HOP_EVERY_STEPS = 900;
/** Tolerances: a grounded walker sits on the ground; nobody sinks below it (m). */
const GROUND_TOLERANCE = 0.05;
/** Node runs the step with this much headroom against the browser budget (Plan 7.8). */
const CPU_HEADROOM = 4;
/** Heap growth allowed between the first and last day (MB). */
const HEAP_GROWTH_MB = 32;
/** Steps both worlds run after a restore, to prove they carry on identically. */
const DIVERGENCE_STEPS = 120;
/** Longest the walker may take to come to rest before a save (s). */
const SETTLE_SECONDS = 5;
const MAX_REPORTED = 10;

const outDir = join(import.meta.dirname, '..', 'artifacts', 'soak');
mkdirSync(outDir, { recursive: true });

const t0 = performance.now();
const terrain = generateTerrain(wrenhollowTerrain);
const sites = generateSites(wrenhollowTerrain, wrenhollowForests, terrain);
const world: MovementWorld = valleyMovementWorld(terrain, sites, wrenhollowForests);
console.log(`World generated in ${((performance.now() - t0) / 1000).toFixed(1)} s (${sites.length} trees)`);

const spawn = { x: valleyView.spawnX, z: valleyView.spawnZ, yaw: valleyView.spawnYaw };
const makeWorld = () => {
  const clock = new ClockSystem(clockTuning);
  const player = new PlayerSystem(world, movement, spawn);
  const sim = new Sim(valleyView.seed, simTuning.stepHz, [clock, player]).init();
  return { sim, clock, player };
};
const meta: SaveMeta = { gameVersion: 'soak', createdAt: 'soak', savedAt: 'soak', playSeconds: 0 };

/** Wanders between named places and nearby spots, pausing now and then, like an idle player. */
class WalkerBot {
  arrivals = 0;
  givenUp = 0;
  private readonly rng: Rng;
  private target: { x: number; z: number } | null = null;
  private jog = false;
  private pause = 0;
  private best = Number.POSITIVE_INFINITY;
  private sinceProgress = 0;
  private steps = 0;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  drive(s: MoverState, player: PlayerSystem, dt: number): void {
    this.steps++;
    if (this.pause > 0) {
      this.pause -= dt;
      player.setIntent(0, 0, false, false);
      return;
    }
    const target = this.target ?? this.pick(s);
    const dx = target.x - s.x;
    const dz = target.z - s.z;
    const d = Math.hypot(dx, dz);
    if (d < ARRIVE_M) {
      this.arrivals++;
      this.next(true);
      return;
    }
    if (d < this.best - PROGRESS_M) {
      this.best = d;
      this.sinceProgress = 0;
    } else {
      this.sinceProgress += dt;
      if (this.sinceProgress > STUCK_SECONDS) {
        this.givenUp++;
        this.next(false);
        return;
      }
    }
    player.setIntent(dx / d, dz / d, this.jog, this.steps % HOP_EVERY_STEPS === 0);
  }

  private pick(s: MoverState): { x: number; z: number } {
    const limit = world.halfSize - movement.worldMargin - ARRIVE_M;
    const clamp = (v: number) => Math.max(-limit, Math.min(limit, v));
    const place = this.rng.chance(0.5) ? this.rng.pick(places) : null;
    this.target = place
      ? { x: place.x, z: place.z }
      : {
          x: clamp(s.x + this.rng.range(-WANDER_M, WANDER_M)),
          z: clamp(s.z + this.rng.range(-WANDER_M, WANDER_M)),
        };
    this.jog = this.rng.chance(JOG_CHANCE);
    this.best = Number.POSITIVE_INFINITY;
    this.sinceProgress = 0;
    return this.target;
  }

  private next(arrived: boolean): void {
    this.target = null;
    if (arrived) this.pause = this.rng.range(PAUSE[0], PAUSE[1]);
  }
}

const problems: string[] = [];
const problem = (message: string) => {
  if (problems.length < MAX_REPORTED) problems.push(message);
  else if (problems.length === MAX_REPORTED) problems.push('… more problems not listed');
};

function checkState(s: MoverState, step: number): void {
  const values = [s.x, s.y, s.z, s.vx, s.vy, s.vz, s.yaw];
  if (!values.every(Number.isFinite)) {
    problem(`step ${step}: walker state is not finite (${values.join(', ')})`);
    return;
  }
  const limit = world.halfSize - movement.worldMargin + 0.01;
  if (Math.abs(s.x) > limit || Math.abs(s.z) > limit)
    problem(`step ${step}: walker left the world at ${s.x}, ${s.z}`);
  const ground = world.heightAt(s.x, s.z);
  if (s.y < ground - GROUND_TOLERANCE)
    problem(`step ${step}: walker sank ${(ground - s.y).toFixed(3)} m below ground`);
  if (s.grounded && Math.abs(s.y - ground) > GROUND_TOLERANCE) {
    problem(`step ${step}: grounded walker ${(s.y - ground).toFixed(3)} m off the ground`);
  }
}

/** Brings the walker to rest on the ground, as a player standing still to save. */
function settle(sim: Sim, p: PlayerSystem): boolean {
  for (let i = 0; i < SETTLE_SECONDS * simTuning.stepHz; i++) {
    const s = p.state;
    if (s.grounded && s.vx === 0 && s.vz === 0 && s.vy === 0) return true;
    p.setIntent(0, 0, false, false);
    sim.step();
  }
  return false;
}

/** Saves, loads into a fresh world, compares bytes, then runs both on and compares again. */
async function roundTrip(sim: Sim, original: PlayerSystem, day: number): Promise<boolean> {
  if (!settle(sim, original)) {
    problem(`day ${day}: the walker didn't come to rest within ${SETTLE_SECONDS} s`);
    return false;
  }
  const save = buildSave(sim, meta);
  const encoded = await encodeSave(save);
  const loaded = await decodeSave(encoded.gz, encoded);
  const copy = makeWorld();
  restoreSave(copy.sim, loaded);
  const a = JSON.stringify(save);
  const b = JSON.stringify(buildSave(copy.sim, meta));
  if (a !== b) {
    problem(`day ${day}: the save did not round-trip byte-stable`);
    return false;
  }
  // Both worlds must carry on identically from here (this also moves the soak's own walker on).
  for (let i = 0; i < DIVERGENCE_STEPS; i++) {
    for (const p of [original, copy.player]) p.setIntent(0.6, 0.8, i % 40 < 20, i === 30);
    sim.step();
    copy.sim.step();
  }
  if (JSON.stringify(buildSave(sim, meta)) !== JSON.stringify(buildSave(copy.sim, meta))) {
    problem(`day ${day}: a restored world diverged from the original`);
    return false;
  }
  return true;
}

const { sim, clock, player } = makeWorld();
const bot = new WalkerBot(new Rng(BOT_SEED));
const dt = 1 / simTuning.stepHz;
const heap: number[] = [];
const gc = (globalThis as { gc?: () => void }).gc;
let steps = 0;
let stepMs = 0;
let slowestBatchMs = 0;
let roundTrips = 0;
const started = performance.now();
const BATCH = 1000;

try {
  for (let day = 1; day <= DAYS; day++) {
    const today = clock.clock.now().absoluteDay;
    while (clock.clock.now().absoluteDay === today) {
      const b0 = performance.now();
      for (let i = 0; i < BATCH; i++) {
        bot.drive(player.state, player, dt);
        sim.step();
        steps++;
      }
      const batch = performance.now() - b0;
      stepMs += batch;
      slowestBatchMs = Math.max(slowestBatchMs, batch / BATCH);
      checkState(player.state, steps);
    }
    if (await roundTrip(sim, player, day)) roundTrips++;
    gc?.();
    heap.push(process.memoryUsage().heapUsed / (1024 * 1024));
    const c = clock.clock.now();
    console.log(
      `day ${String(day).padStart(2)}: ${c.weekday} · arrivals ${bot.arrivals} · gave up ${bot.givenUp} · ` +
        `heap ${Math.round(heap[heap.length - 1] ?? 0)} MB`,
    );
  }
} catch (e) {
  problem(`exception at step ${steps}: ${e instanceof Error ? e.stack : String(e)}`);
}

const meanStepMs = stepMs / Math.max(1, steps);
const stepBudget = frameBudget.simStepMs / CPU_HEADROOM;
if (meanStepMs > stepBudget) {
  problem(
    `mean sim step ${meanStepMs.toFixed(4)} ms is over ${stepBudget} ms (2.5 ms budget / ${CPU_HEADROOM})`,
  );
}
const growth = heap.length > 1 ? (heap[heap.length - 1] ?? 0) - (heap[0] ?? 0) : 0;
if (gc && growth > HEAP_GROWTH_MB) problem(`heap grew ${growth.toFixed(1)} MB over ${DAYS} days`);
if (bot.arrivals === 0) problem('the walker never arrived anywhere');

const report = {
  days: DAYS,
  steps,
  /** Hours of real-time play the steps stand for. */
  playHours: steps / simTuning.stepHz / 3600,
  wallSeconds: (performance.now() - started) / 1000,
  meanStepMs,
  slowestBatchStepMs: slowestBatchMs,
  arrivals: bot.arrivals,
  givenUp: bot.givenUp,
  roundTrips,
  heapMB: heap.map((h) => Math.round(h)),
  heapChecked: !!gc,
  problems,
  ok: problems.length === 0,
};
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(
  `${report.ok ? 'ok  ' : 'FAIL'} ${DAYS} days · ${steps} steps in ${report.wallSeconds.toFixed(1)} s · ` +
    `step ${(meanStepMs * 1000).toFixed(1)} µs mean · round trips ${roundTrips}/${DAYS} · ` +
    `heap ${gc ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)} MB` : 'unchecked (no --expose-gc)'}`,
);
for (const p of problems) console.error(`  ${p}`);
process.exit(report.ok ? 0 : 1);
