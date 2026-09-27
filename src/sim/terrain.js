import * as CANNON from 'cannon-es';
import { G } from './groups.js';

// Builds the walkable ground for a MapDef: a sampled height grid (shared by physics, AI and
// rendering), the cannon ground bodies, and static props like bridges.
export function buildGround(world, map, groundMat) {
  const es = map.gridStep || 1;
  const halfW = map.extent[0] / 2;
  const halfD = map.extent[1] / 2;
  const nx = Math.round((halfW * 2) / es) + 1;
  const nz = Math.round((halfD * 2) / es) + 1;
  const flat = !map.height;
  const h = new Float32Array(nx * nz);
  if (!flat) {
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) h[i * nz + j] = map.height(-halfW + i * es, -halfD + j * es);
  }

  const heightAt = (x, z) => {
    if (flat) return 0;
    let fx = (x + halfW) / es;
    let fz = (z + halfD) / es;
    fx = fx < 0 ? 0 : fx > nx - 1.001 ? nx - 1.001 : fx;
    fz = fz < 0 ? 0 : fz > nz - 1.001 ? nz - 1.001 : fz;
    const i = fx | 0;
    const j = fz | 0;
    const tx = fx - i;
    const tz = fz - j;
    const a = h[i * nz + j];
    const b = h[(i + 1) * nz + j];
    const c = h[i * nz + j + 1];
    const d = h[(i + 1) * nz + j + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  };

  const bodies = [];
  if (flat) {
    const plane = new CANNON.Body({ mass: 0, material: groundMat, collisionFilterGroup: G.GROUND });
    plane.addShape(new CANNON.Plane());
    plane.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(plane);
    bodies.push(plane);
  } else {
    // cannon Heightfield: data[i][j] at local (i*es, j*es), height along local +z.
    // Rotated -90deg about X: local x -> world x, local y -> world -z, local z -> world y.
    const data = [];
    for (let i = 0; i < nx; i++) {
      const col = [];
      for (let j = 0; j < nz; j++) col.push(h[i * nz + (nz - 1 - j)]);
      data.push(col);
    }
    const shape = new CANNON.Heightfield(data, { elementSize: es });
    const body = new CANNON.Body({ mass: 0, material: groundMat, collisionFilterGroup: G.GROUND });
    body.addShape(shape);
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    body.position.set(-halfW, 0, halfD);
    world.addBody(body);
    bodies.push(body);
  }

  // Static box props (bridges, rocks, walls). Walkable ones raise surfaceAt.
  const decks = [];
  for (const p of map.props || []) {
    if (p.shape !== 'box' || p.solid === false) continue;
    const body = new CANNON.Body({ mass: 0, material: groundMat, collisionFilterGroup: G.PROP });
    body.addShape(new CANNON.Box(new CANNON.Vec3(p.size[0] / 2, p.size[1] / 2, p.size[2] / 2)));
    body.position.set(p.pos[0], p.pos[1], p.pos[2]);
    if (p.rotY) body.quaternion.setFromEuler(0, p.rotY, 0);
    world.addBody(body);
    bodies.push(body);
    if (p.walkable)
      decks.push({
        x0: p.pos[0] - p.size[0] / 2,
        x1: p.pos[0] + p.size[0] / 2,
        z0: p.pos[2] - p.size[2] / 2,
        z1: p.pos[2] + p.size[2] / 2,
        top: p.pos[1] + p.size[1] / 2,
      });
  }

  const surfaceAt = (x, z) => {
    let y = heightAt(x, z);
    for (let k = 0; k < decks.length; k++) {
      const d = decks[k];
      if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1 && d.top > y) y = d.top;
    }
    return y;
  };

  return { heightAt, surfaceAt, nx, nz, es, halfW, halfD, heights: h, flat, bodies, decks };
}
