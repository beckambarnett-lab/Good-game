// Map hazards: lava pools (burn + hot-foot hops) and geysers (telegraphed launches).
// Chasms, holes and ledges kill through the map's killY.
export function updateHazards(sim, dt) {
  const hz = sim.map.hazards;
  if (!hz) return;
  if (!sim.hzT) sim.hzT = new Map();
  for (const h of hz) {
    if (h.type === 'lava') {
      const surf = sim.ground.heightAt(h.x, h.z) + 0.2;
      for (const u of sim.grid.query(h.x, h.z, h.r + 3)) {
        const t = u.p.torso.position;
        if (Math.hypot(t.x - h.x, t.z - h.z) > h.r + 0.3) continue;
        if (t.y > surf + 1.6 * u.D.s + (u.M ? u.M.bodyY : 0)) continue;
        if (!u.alive) {
          // corpses sink into the lava and vanish
          if (!u.sinking) {
            u.sinking = true;
            sim.emit('sizzle', t, { unit: u, big: true });
          }
          continue;
        }
        u.hit(h.dps * dt, 0, 0, 0, null);
        u.burnT = Math.max(u.burnT, h.burnTime || 3);
        u.burnDps = Math.max(u.burnDps, h.burn || 6);
        const k = sim.hzT.get(u) || 0;
        if (sim.time - k > 0.5 && u.alive) {
          sim.hzT.set(u, sim.time);
          const dx = t.x - h.x;
          const dz = t.z - h.z;
          const L = Math.hypot(dx, dz) || 1;
          u.base.applyImpulse({ x: (dx / L) * u.mass * 1.5, y: u.mass * 4, z: (dz / L) * u.mass * 1.5 });
          sim.emit('sizzle', t, { unit: u });
        }
      }
    } else if (h.type === 'geyser') {
      const period = h.period || 8;
      const prev = sim.hzT.get(h) ?? h.offset ?? 0;
      let ph = prev + dt;
      const warn = h.warn || 1.5;
      if (prev < period - warn && ph >= period - warn) sim.emit('geyserWarn', { x: h.x, y: sim.ground.surfaceAt(h.x, h.z), z: h.z }, { r: h.r, time: warn });
      h.warning = ph >= period - warn;
      const fire = ph >= period;
      if (fire) ph -= period;
      sim.hzT.set(h, ph);
      if (!fire) continue;
      sim.emit('geyser', { x: h.x, y: sim.ground.surfaceAt(h.x, h.z), z: h.z }, { r: h.r, mag: h.dvUp });
      for (const u of sim.units) {
        const t = u.p.torso.position;
        const dx = t.x - h.x;
        const dz = t.z - h.z;
        const d = Math.hypot(dx, dz);
        if (d > h.r + u.radius) continue;
        const L = d || 1;
        const m = u.mass;
        if (u.frozen) sim.unfreeze(u); // thaw settled corpses so they get tossed too
        if (u.alive) {
          u.launched = true;
          u.settleT = 0;
          u.hit(h.dmg || 20, 0, 0, 0, null);
          sim.emit('launch', t, { mag: m * h.dvUp, unit: u });
        }
        for (const b of u.rag.list) {
          b.wakeUp();
          b.velocity.y += h.dvUp;
          b.velocity.x += (dx / L) * h.dvOut;
          b.velocity.z += (dz / L) * h.dvOut;
        }
      }
    }
  }
}
