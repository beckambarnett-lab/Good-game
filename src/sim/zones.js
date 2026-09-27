import { TUNING as T } from '../data/tuning.js';
import { applyEffect, areaBlast } from './projectiles.js';

// Lingering ground effects: spore/goo clouds, heal patches and telegraphed strikes.
export function addZone(sim, z) {
  sim.zones.push({ t: 0, tick: 0, ...z });
  sim.emit('zone', { x: z.x, y: sim.ground.surfaceAt(z.x, z.z), z: z.z }, { kind: z.kind, r: z.r, time: z.time, team: z.team, look: z.look });
}

export function updateZones(sim, dt) {
  const list = sim.zones;
  let w = 0;
  for (let i = 0; i < list.length; i++) {
    const z = list[i];
    z.t += dt;
    z.tick -= dt;
    if (z.kind === 'telegraph') {
      if (z.t >= z.delay) {
        const y = sim.ground.surfaceAt(z.x, z.z);
        areaBlast(sim, z.x, y + 0.4, z.z, z.r, z.damage, z.knockback, z.team, z.src, z.effect, { lift: z.lift ?? 1.4 });
        sim.emit('explosion', { x: z.x, y, z: z.z }, { r: z.r, mag: z.knockback, look: z.look || 'sun' });
        continue;
      }
    } else if (z.tick <= 0) {
      z.tick = 0.25;
      for (const u of sim.grid.query(z.x, z.z, z.r + 1.5)) {
        if (!u.alive) continue;
        if (Math.hypot(u.x - z.x, u.z - z.z) > z.r + u.radius * 0.5) continue;
        if (z.kind === 'cloud' && u.team !== z.team) {
          applyEffect(sim, u, z.effect, z.src);
          u.hit(z.dps * 0.25, 0, 0, 0, z.src && z.src.alive ? z.src : null, null);
        } else if (z.kind === 'heal' && u.team === z.team) {
          const h = u.heal(z.hps * 0.25, z.src);
          if (h > 0.5 && sim.rng.next() < 0.3) sim.emit('healTick', u.pos, { unit: u });
        }
      }
    }
    if (z.t < z.time) list[w++] = z;
  }
  list.length = w;
}

// Auras, periodic summons.
export function updatePassives(sim, dt) {
  sim.auraT = (sim.auraT || 0) - dt;
  const auraTick = sim.auraT <= 0;
  if (auraTick) sim.auraT = 0.5;
  for (const u of sim.units) {
    if (!u.alive) continue;
    const pas = u.def.passive;
    if (!pas) continue;
    if (pas.aura && auraTick) {
      const a = pas.aura;
      for (const e of sim.grid.query(u.x, u.z, a.r + 1)) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - u.x, e.z - u.z) > a.r) continue;
        if (a.kind === 'slowEnemies' && e.team !== u.team) applyEffect(sim, e, { slow: a.amt, slowTime: 0.7 }, u);
        else if (a.kind === 'might' && e.team === u.team) e.mightT = Math.max(e.mightT, 0.7);
        else if (a.kind === 'haste' && e.team === u.team) e.hasteT = Math.max(e.hasteT, 0.7);
        else if (a.kind === 'burn' && e.team !== u.team) applyEffect(sim, e, { burn: a.amt, burnTime: 1 }, u);
      }
    }
    if (pas.summon && !sim.sudden) {
      u.summonT -= dt;
      if (u.summonT <= 0) {
        const sm = pas.summon;
        u.summonT = sm.every;
        const def = sim.defs[sm.id];
        if (!def) continue;
        let own = 0;
        for (const e of sim.alive[u.team]) if (e.summoner === u && e.alive) own++;
        const fy = u.facing();
        let made = 0;
        for (let i = 0; i < sm.count && own + i < sm.max; i++) {
          const ang = fy + (i - (sm.count - 1) / 2) * 0.8;
          const d = u.radius + 1.2;
          const s = sim.addUnit(def, u.team, u.x + Math.sin(ang) * d, u.z + Math.cos(ang) * d);
          s.summoner = u;
          s.summoned = true;
          s.value = 0;
          s.yawDes = fy;
          made++;
        }
        if (made) sim.emit('summon', u.pos, { unit: u });
      }
    }
  }
}

export { T };
