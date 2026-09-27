import * as CANNON from 'cannon-es';
import { TUNING as T } from '../data/tuning.js';
import { think } from './ai.js';
import { updateCombat } from './combat.js';
import { updateHazards } from './hazards.js';
import { areaBlast, updateProjectiles } from './projectiles.js';
import { updatePassives, updateZones } from './zones.js';
import { removeRagdoll, reviveRagdoll } from './ragdoll.js';
import { makeRng } from './rng.js';
import { buildGround } from './terrain.js';
import { Unit, resetUnitIds } from './unit.js';

// Uniform grid over the field for neighbour queries (rebuilt every tick).
class Grid {
  constructor(cell) {
    this.cell = cell;
    this.map = new Map();
    this.out = [];
  }
  clear() {
    for (const v of this.map.values()) v.length = 0;
  }
  key(ix, iz) {
    return ((ix + 512) << 10) | (iz + 512);
  }
  insert(u) {
    const ix = Math.floor(u.x / this.cell);
    const iz = Math.floor(u.z / this.cell);
    const k = this.key(ix, iz);
    let a = this.map.get(k);
    if (!a) {
      a = [];
      this.map.set(k, a);
    }
    a.push(u);
  }
  // Returns a shared array (valid until the next query).
  query(x, z, r) {
    const out = [];
    const c = this.cell;
    const x0 = Math.floor((x - r) / c);
    const x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c);
    const z1 = Math.floor((z + r) / c);
    for (let ix = x0; ix <= x1; ix++)
      for (let iz = z0; iz <= z1; iz++) {
        const a = this.map.get(this.key(ix, iz));
        if (a) for (let i = 0; i < a.length; i++) out.push(a[i]);
      }
    return out;
  }
}

export class Sim {
  constructor({ map, seed = 1, defs = {}, lowPower = false }) {
    resetUnitIds();
    const grip = map.grip ?? 1;
    this.map = { gripAt: () => grip, speedAt: () => 1, kbAt: null, ...map, grip };
    this.defs = defs;
    this.rng = makeRng(seed);
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, T.gravity, 0) });
    // Broadphase that also drops pairs from the same unit. That lets every joint use
    // collideConnected = true, which skips cannon's O(constraints x pairs) filtering loop.
    const bp = new CANNON.SAPBroadphase(this.world);
    const pairs = bp.collisionPairs.bind(bp);
    bp.collisionPairs = (world, p1, p2) => {
      pairs(world, p1, p2);
      let w = 0;
      for (let i = 0; i < p1.length; i++) {
        const a = p1[i].owner;
        if (a !== undefined && a === p2[i].owner) continue;
        p1[w] = p1[i];
        p2[w] = p2[i];
        w++;
      }
      p1.length = w;
      p2.length = w;
    };
    this.world.broadphase = bp;
    this.world.allowSleep = true;
    // cannon's ArrayCollisionMatrix is O(bodies^2) per step and only feeds contact events,
    // which we don't use. A no-op matrix removes ~20% of the step cost at 100+ units.
    const noMatrix = { get: () => true, set() {}, reset() {}, setNumObjects() {} };
    this.world.collisionMatrix = noMatrix;
    this.world.collisionMatrixPrevious = noMatrix;
    this.world.solver.tolerance = 1e-4;
    this.lowPower = lowPower;
    this.world.solver.iterations = lowPower ? T.solverIterationsLow : T.solverIterations;
    this.world.defaultContactMaterial.friction = 0.3;
    this.world.defaultContactMaterial.restitution = 0.05;
    const ground = new CANNON.Material('ground');
    const body = new CANNON.Material('body');
    const limb = new CANNON.Material('limb');
    this.mats = { ground, body, limb };
    const g0 = map.friction ?? Math.min(1, grip);
    this.world.addContactMaterial(new CANNON.ContactMaterial(ground, body, { friction: 0.5 * g0, restitution: 0.1 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(ground, limb, { friction: 0.8 * g0, restitution: 0.05 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(body, body, { friction: 0.1, restitution: 0.15 }));
    this.ground = buildGround(this.world, this.map, ground);
    this.units = [];
    this.alive = [[], []];
    this.projectiles = [];
    this.zones = [];
    this.healMul = 1;
    this.lastDamageT = 0;
    this.sudden = false;
    this.corpses = 0;
    this.nextProjId = 1;
    this.events = [];
    this.grid = new Grid(4);
    this.time = 0; // battle time
    this.tick = 0;
    this.phase = 'build';
    this.winner = -1;
    this.damageMul = 1;
    this.speedMul = 1;
    this.hazardT = 0;
    this.stats = { stepMs: 0 };
    this.eventsEnabled = true;
  }

  emit(type, pos, data) {
    if (!this.eventsEnabled) return;
    this.events.push({ type, x: pos.x, y: pos.y, z: pos.z, ...data });
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  addUnit(def, team, x, z) {
    const yaw = team === 0 ? Math.PI : 0;
    const u = new Unit(this, def, team, x, z, yaw);
    this.units.push(u);
    this.alive[team].push(u);
    this.grid.insert(u);
    return u;
  }

  freeze(u) {
    u.frozen = true;
    removeRagdoll(this.world, u.rag);
  }

  removeUnit(u) {
    if (!u.frozen) removeRagdoll(this.world, u.rag);
    const i = this.units.indexOf(u);
    if (i >= 0) this.units.splice(i, 1);
    const a = this.alive[u.team];
    const j = a.indexOf(u);
    if (j >= 0) a.splice(j, 1);
    u.alive = false;
    u.removed = true;
  }

  start() {
    this.phase = 'battle';
    this.time = 0;
    this.emit('start', { x: 0, y: 0, z: 0 }, {});
  }

  teamValue(team) {
    let v = 0;
    for (const u of this.alive[team]) if (u.alive && !u.summoned) v += u.value * (u.hp / u.maxHp);
    return v;
  }

  deathBlast(u, db) {
    const p = u.p.torso.position;
    areaBlast(this, p.x, p.y, p.z, db.r, db.damage, db.knockback, u.team, u, null);
    this.emit('explosion', { x: p.x, y: p.y, z: p.z }, { r: db.r, mag: db.knockback, unit: u });
  }

  // Bring a corpse back to life (Wax Remolder). The ragdoll gets up by itself.
  revive(u, frac) {
    if (u.alive || u.removed || u.frozen) return false;
    u.alive = true;
    u.revived = true;
    u.hp = u.maxHp * frac;
    u.value = u.def.cost * 0.5;
    u.deadT = 0;
    u.launched = true;
    u.settleT = 0;
    u.atk = null;
    u.target = null;
    reviveRagdoll(this.world, u.rag);
    this.alive[u.team].push(u);
    this.emit('revive', u.pos, { unit: u });
    return true;
  }

  step(dt = T.dt) {
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const battle = this.phase === 'battle';
    this.grid.clear();
    for (const u of this.units) if (u.alive) this.grid.insert(u);

    for (const u of this.units) {
      if (!u.alive) continue;
      if (battle) think(this, u, dt);
      else {
        u.vdx = 0;
        u.vdz = 0;
      }
    }
    for (const u of this.units) {
      if (!u.alive) continue;
      if (battle) updateCombat(this, u, dt);
      u.control(dt);
    }
    if (battle) {
      updateProjectiles(this, dt);
      updateZones(this, dt);
      updatePassives(this, dt);
      updateHazards(this, dt);
      if (this.sudden) {
        for (const u of this.units) {
          if (!u.alive) continue;
          const f = u.def.role === 'legendary' ? T.suddenDrain / 2 : T.suddenDrain;
          u.hp -= u.maxHp * f * dt;
          if (u.hp <= 0) u.die();
        }
      }
    }
    this.world.step(dt);

    // Post: deaths from falling, NaN guards, corpse cleanup.
    for (const u of this.units) {
      const p = u.p.torso.position;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
        this.nanCount = (this.nanCount || 0) + 1;
        this.resetUnitBodies(u);
      }
      if (u.alive && p.y < (this.map.killY ?? T.killY)) {
        this.emit('fall', p, { unit: u });
        u.die();
      }
      if (!u.alive) {
        u.deadT += dt;
        // Settled corpses leave the physics world; the renderer keeps drawing their last pose.
        if (!u.frozen && u.deadT > 1.5 && (u.deadT > 8 || u.rag.list.every((b) => b.sleepState === 2))) this.freeze(u);
      }
    }
    // Corpse cap: the oldest corpses sink into the ground and leave the physics world.
    if (this.tick % 30 === 0) {
      let dead = 0;
      for (const u of this.units) if (!u.alive && !u.fading) dead++;
      if (dead > T.maxCorpses) {
        const old = this.units.filter((u) => !u.alive && !u.fading).sort((a, b) => b.deadT - a.deadT);
        for (let i = 0; i < dead - T.maxCorpses; i++) {
          old[i].fading = true;
          old[i].fadeT = 0;
        }
      }
    }
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.sinking || u.fading) {
        u.fadeT = (u.fadeT || 0) + dt;
        if (u.fadeT > 2.5) this.removeUnit(u);
      }
    }
    for (let t = 0; t < 2; t++) {
      const a = this.alive[t];
      let w = 0;
      for (let i = 0; i < a.length; i++) if (a[i].alive) a[w++] = a[i];
      a.length = w;
    }

    if (this.tick % 60 === 0 && !this.lowPower) {
      const live = this.alive[0].length + this.alive[1].length;
      this.world.solver.iterations = live > T.manyUnits ? T.solverIterationsLow : T.solverIterations;
    }
    if (battle) {
      this.time += dt;
      this.healMul = this.sudden ? 0 : this.time > T.tiredHealersTime ? 0.5 : 1;
      if (!this.sudden && (this.time > T.battleTime || this.time - this.lastDamageT > T.stalemate)) {
        this.sudden = true;
        this.speedMul = 1.15;
        this.emit('sudden', { x: 0, y: 0, z: 0 }, {});
      }
      const a0 = this.alive[0].length;
      const a1 = this.alive[1].length;
      if (a0 === 0 || a1 === 0 || this.time > T.battleHardCap) {
        this.phase = 'over';
        if (a0 === 0 && a1 === 0) this.winner = -1;
        else if (a0 === 0) this.winner = 1;
        else if (a1 === 0) this.winner = 0;
        else {
          const v0 = this.teamValue(0);
          const v1 = this.teamValue(1);
          this.winner = v0 > v1 ? 0 : v1 > v0 ? 1 : -1;
        }
        this.emit('over', { x: 0, y: 0, z: 0 }, { winner: this.winner, timeout: a0 > 0 && a1 > 0 });
      }
    }
    this.tick++;
    if (t0) this.stats.stepMs = this.stats.stepMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  resetUnitBodies(u) {
    // Last-resort recovery from a numerical blow-up: freeze the ragdoll where it was.
    for (const b of u.rag.list) {
      if (!Number.isFinite(b.position.x + b.position.y + b.position.z)) b.position.set(u.lastX || 0, 2, u.lastZ || 0);
      b.velocity.set(0, 0, 0);
      b.angularVelocity.set(0, 0, 0);
      if (!Number.isFinite(b.quaternion.x + b.quaternion.y + b.quaternion.z + b.quaternion.w)) b.quaternion.set(0, 0, 0, 1);
    }
  }
}
