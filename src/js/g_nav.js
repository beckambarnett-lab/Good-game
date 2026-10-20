/* ================= collision zones, solids, waypoint graph ================= */
const WZ = [];   // walkable zones
const SOL = [];  // solid boxes
function zoneFlat(x0, x1, z0, z1, y, tag) { WZ.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y, tag: tag || '' }); }
function zoneRamp(x0, x1, z0, z1, axis, a0, a1, y0, y1, tag) { WZ.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), ramp: { axis, a0, a1, y0, y1 }, tag: tag || '' }); }
function solid(x0, x1, y0, y1, z0, z1, tag) { SOL.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), tag: tag || '' }); }
function solidC(cx, cz, w, d, y0, y1, tag) { solid(cx - w / 2, cx + w / 2, y0, y1, cz - d / 2, cz + d / 2, tag); }
function clearTag(tag) { for (let i = WZ.length - 1; i >= 0; i--) if (WZ[i].tag === tag) WZ.splice(i, 1); for (let i = SOL.length - 1; i >= 0; i--) if (SOL[i].tag === tag) SOL.splice(i, 1); }
function zoneHeight(zn, x, z) { if (!zn.ramp) return zn.y; const r = zn.ramp; const v = r.axis === 'x' ? x : z; const t = clamp((v - r.a0) / (r.a1 - r.a0), 0, 1); return lerp(r.y0, r.y1, t); }
function supportAt(x, z, y) { let best = null; for (const zn of WZ) { if (x < zn.x0 || x > zn.x1 || z < zn.z0 || z > zn.z1) continue; const h = zoneHeight(zn, x, z); if (h <= y + 0.42 && h >= y - 0.75 && (best === null || h > best)) best = h; } return best; }
// climbable solids (terrace stools): the player may clamber over one while its seat is empty (CLIMB_OK is set only around player moves)
let CLIMB_OK = false;
const seatFree = id => { const st = typeof SEATS !== 'undefined' && SEATS.find(q => q.id === id); return !st || !st.occ; };
function climbAt(x, z, r) { for (const s of SOL) { if (!s.seat || !seatFree(s.seat)) continue; const cx = clamp(x, s.x0, s.x1), cz = clamp(z, s.z0, s.z1); if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true; } return false; }
function blockedAt(x, z, y, r) { for (const s of SOL) { if (s.y1 <= y + 0.28 || s.y0 >= y + 1.75) continue; if (s.seat && CLIMB_OK && seatFree(s.seat)) continue; const cx = x < s.x0 ? s.x0 : x > s.x1 ? s.x1 : x, cz = z < s.z0 ? s.z0 : z > s.z1 ? s.z1 : z; const dx = x - cx, dz = z - cz; if (dx * dx + dz * dz < r * r) return true; } return false; }
const PR = 0.27;
// move a body (pos: Vector3 feet). returns true if moved
function moveBody(pos, dx, dz) {
  const d = Math.hypot(dx, dz); if (d < 1e-6) return false; const n = Math.max(1, Math.ceil(d / 0.08)); let moved = false;
  for (let i = 0; i < n; i++) {
    const sx = dx / n, sz = dz / n;
    // try full, then slide on each axis
    for (const [ax, az] of [[sx, sz], [sx, 0], [0, sz]]) {
      if (ax === 0 && az === 0) continue; const nx = pos.x + ax, nz = pos.z + az; const h = supportAt(nx, nz, pos.y); if (h === null) continue;
      if (blockedAt(nx, nz, h, PR)) continue; pos.x = nx; pos.z = nz; pos.y = h; moved = true; break;
    }
  }
  return moved;
}
function groundUnder(x, z, y) { const h = supportAt(x, z, y); return h === null ? y : h; }

/* ---------- waypoint graph for people ---------- */
const WP = {};
function wp(id, x, y, z) { WP[id] = { id, p: new THREE.Vector3(x, y, z), n: new Set() }; return WP[id]; }
function link(...ids) { for (let i = 1; i < ids.length; i++) { const a = WP[ids[i - 1]], b = WP[ids[i]]; if (!a || !b) { console.warn('bad link', ids[i - 1], ids[i]); continue; } a.n.add(b.id); b.n.add(a.id); } }
function unlinkTag(prefix) { for (const k of Object.keys(WP)) if (k.startsWith(prefix)) { for (const o of WP[k].n) WP[o] && WP[o].n.delete(k); delete WP[k]; } }
function wpPath(a, b) {
  if (!WP[a] || !WP[b]) return null; if (a === b) return [WP[a].p.clone()];
  const dist = { [a]: 0 }, prev = {}, open = new Set([a]), done = new Set();
  while (open.size) { let u = null, ud = Infinity; for (const k of open) if (dist[k] < ud) { ud = dist[k]; u = k; } open.delete(u); if (u === b) break; done.add(u);
    for (const v of WP[u].n) { if (done.has(v)) continue; const nd = ud + WP[u].p.distanceTo(WP[v].p); if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prev[v] = u; open.add(v); } } }
  if (dist[b] === undefined) return null; const out = []; let c = b; while (c) { out.unshift(WP[c].p.clone()); c = prev[c]; } return out;
}
function nearestWp(pos, filter) { let best = null, bd = Infinity; for (const k in WP) { if (filter && !filter(k)) continue; const p = WP[k].p; if (Math.abs(p.y - pos.y) > 1.2) continue; const d = p.distanceToSquared(pos); if (d < bd) { bd = d; best = k; } } return best; }
function hasTagSolid(tag) { for (const s of SOL) if (s.tag === tag) return true; return false; }
// unstick: if the player ends up inside something (a fresh build, a spawned crate) or off the walkable floor,
// find the nearest free spot on the same floor and glide them out to it
const UNSTICK = { t: 0, to: null };
function freeSpotNear(pos) {
  for (let r = 0.12; r <= 3.0; r += 0.12) { let best = null, bd = 1e9; const n = Math.max(12, Math.round(r * 24));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = pos.x + Math.cos(a) * r, z = pos.z + Math.sin(a) * r; const h = supportAt(x, z, pos.y); if (h === null || Math.abs(h - pos.y) > 0.45 || blockedAt(x, z, h, PR + 0.03)) continue; const d = Math.hypot(x - pos.x, z - pos.z); if (d < bd) { bd = d; best = new THREE.Vector3(x, h, z); } }
    if (best) return best; }
  return null;
}
function updateUnstick(dt, pos) {
  if (UNSTICK.to) { const k = 1 - Math.exp(-dt * 12); pos.x = lerp(pos.x, UNSTICK.to.x, k); pos.z = lerp(pos.z, UNSTICK.to.z, k); pos.y = lerp(pos.y, UNSTICK.to.y, k); if (Math.hypot(pos.x - UNSTICK.to.x, pos.z - UNSTICK.to.z) < 0.02) { pos.copy(UNSTICK.to); UNSTICK.to = null; } return; }
  UNSTICK.t -= dt; if (UNSTICK.t > 0) return; UNSTICK.t = 0.2;
  const h = supportAt(pos.x, pos.z, pos.y); if (h !== null && !blockedAt(pos.x, pos.z, h, PR - 0.04)) return;
  const spot = freeSpotNear(pos); if (spot) UNSTICK.to = spot;
}

