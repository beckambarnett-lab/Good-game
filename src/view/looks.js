import { humanDims, mountDims } from '../sim/ragdoll.js';
import { THREE } from './three.js';

// A unit's look is a list of primitives attached to bones. Authoring coordinates are at unit
// scale 1 (humanoid bones) or mount scale 1 (mount bones) and relative to the bone origin.
//
// Primitive tuple: [shape, bone, [x,y,z], [sx,sy,sz], color, [rx,ry,rz]?, flags?]
//   shape: box | sphere | cyl | cone | torus
//   bone:  torso | head | armL | armR | handL | handR | legL | legR | mount | mountHead |
//          mLeg0..5 | wheel (mount wheels; prims spin about their own axis)
//   color: '#rrggbb' | 'team' | 'teamDark' | 'skin'
//   flags: { detail: true } (dropped at distance), { glow: true } (unlit-ish bright)

export const SHAPES = ['box', 'sphere', 'cyl', 'cone', 'torus'];

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export function primMatrix(pos, size, rot, scale) {
  _p.set(pos[0] * scale, pos[1] * scale, pos[2] * scale);
  _s.set(size[0] * scale, size[1] * scale, size[2] * scale);
  if (rot) _e.set(rot[0], rot[1], rot[2]);
  else _e.set(0, 0, 0);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

const MOUNT_BONES = new Set(['mount', 'mountHead', 'mLeg0', 'mLeg1', 'mLeg2', 'mLeg3', 'mLeg4', 'mLeg5', 'wheel']);

// Build the full primitive list for a unit def (cached on the def).
export function buildLook(def) {
  if (def._look) return def._look;
  const L = def.look || {};
  const s = def.scale || 1;
  const bulk = def.bulk || 1;
  const D = humanDims(1, bulk);
  const prims = [];
  const add = (shape, bone, pos, size, color, rot, flags) => prims.push([shape, bone, pos, size, color, rot || null, flags || null]);
  const skin = L.skin || '#f1c27d';
  const top = L.top || 'team';
  const arms = L.arms || top;
  const legs = L.legs || '#4b3b2e';
  const feet = L.feet || '#2f2620';
  const hide = new Set(L.hide || []);

  if (!hide.has('torso')) {
    if (L.torso === 'round') add('sphere', 'torso', [0, -0.02, 0], [D.torsoW * 1.25, D.torsoH * 1.12, D.torsoD * 1.9], top);
    else if (L.torso === 'barrel') add('cyl', 'torso', [0, 0, 0], [D.torsoW * 1.1, D.torsoH, D.torsoD * 1.7], top);
    else if (L.torso === 'cone') add('cone', 'torso', [0, 0.02, 0], [D.torsoW * 1.4, D.torsoH * 1.1, D.torsoD * 1.9], top);
    else add('box', 'torso', [0, 0, 0], [D.torsoW, D.torsoH, D.torsoD], top);
    // belt
    if (L.belt !== false) add('box', 'torso', [0, -D.torsoH * 0.36, 0], [D.torsoW * 1.04, 0.07, D.torsoD * 1.06], L.belt || '#3b2a1c', null, { detail: true });
  }
  if (!hide.has('head')) {
    if (L.head === 'box') add('box', 'head', [0, 0, 0], [0.32, 0.34, 0.32], L.headColor || skin);
    else add('sphere', 'head', [0, 0, 0], [0.34, 0.36, 0.34], L.headColor || skin);
    if (L.eyes !== false) {
      const ec = L.eyeColor || '#1b1b1b';
      add('sphere', 'head', [-0.065, 0.03, 0.15], [0.055, 0.07, 0.04], ec, null, { detail: true });
      add('sphere', 'head', [0.065, 0.03, 0.15], [0.055, 0.07, 0.04], ec, null, { detail: true });
    }
  }
  if (!hide.has('arms')) {
    for (const b of ['armL', 'armR']) {
      add('box', b, [0, 0.03, 0], [0.13, 0.58, 0.13], arms);
      add('sphere', b === 'armL' ? 'handL' : 'handR', [0, 0.02, 0], [0.13, 0.13, 0.13], L.hands || skin);
    }
  }
  if (!hide.has('legs')) {
    for (const b of ['legL', 'legR']) {
      add('box', b, [0, 0.03, 0], [0.16, 0.74, 0.17], legs);
      add('box', b, [0, -0.36, 0.04], [0.17, 0.1, 0.27], feet);
    }
  }

  if (def.mount) {
    const M = mountDims({ ...def.mount, scale: 1 });
    const ML = L.mount || {};
    const mc = ML.body || '#8a6a4a';
    const lc = ML.legs || mc;
    if (!ML.noBody) {
      if (M.kind === 'cart') {
        add('box', 'mount', [0, 0, 0], [M.bodyW, M.bodyH, M.bodyLen], mc);
        const t = ML.trim || '#6b4a2c';
        add('box', 'mount', [0, M.bodyH * 0.6, -M.bodyLen / 2 + 0.05], [M.bodyW, M.bodyH * 0.7, 0.1], t, null, { detail: true });
        add('box', 'mount', [-M.bodyW / 2 + 0.04, M.bodyH * 0.6, 0], [0.08, M.bodyH * 0.7, M.bodyLen], t, null, { detail: true });
        add('box', 'mount', [M.bodyW / 2 - 0.04, M.bodyH * 0.6, 0], [0.08, M.bodyH * 0.7, M.bodyLen], t, null, { detail: true });
      } else if (M.kind === 'wheel') {
        add('cyl', 'mount', [0, 0, 0], [0.12, M.bodyH * 1.6, 0.12], ML.frame || '#555a66');
      } else if (ML.shape === 'box') add('box', 'mount', [0, 0, 0], [M.bodyW, M.bodyH, M.bodyLen], mc);
      else add('sphere', 'mount', [0, 0, 0], [M.bodyW * 1.1, M.bodyH * 1.15, M.bodyLen * 1.08], mc);
    }
    if (M.head && !ML.noHead) {
      add('sphere', 'mountHead', [0, 0, 0.04], [M.headR * 1.8, M.headR * 1.8, M.headR * 2.4], ML.head || mc);
      add('sphere', 'mountHead', [-M.headR * 0.5, M.headR * 0.35, M.headR * 1.0], [0.07, 0.08, 0.05], '#111', null, { detail: true });
      add('sphere', 'mountHead', [M.headR * 0.5, M.headR * 0.35, M.headR * 1.0], [0.07, 0.08, 0.05], '#111', null, { detail: true });
      // neck
      add('cyl', 'mount', [0, M.bodyH * 0.45 + M.neck * 0.3, M.bodyLen / 2 - 0.05], [M.headR, M.neck + 0.25, M.headR], ML.head || mc, [0.5, 0, 0]);
    }
    if (M.kind !== 'cart' && !ML.noSaddle) add('box', 'mount', [0, M.bodyH * 0.5, 0], [Math.min(0.6, M.bodyW), 0.1, 0.55], ML.saddle || 'team', null, { detail: true });
    if (M.kind === 'beast' && !ML.noTail) add('cone', 'mount', [0, M.bodyH * 0.2, -M.bodyLen / 2 - 0.15], [0.12, 0.45, 0.12], ML.tail || lc, [-2.2, 0, 0], { detail: true });
    const legs = mountLegs(M);
    for (const g of legs) {
      add('box', g.bone, [0, -g.len / 2, 0], [ML.legW || 0.16, g.len, ML.legW || 0.16], lc);
      if (!ML.noHoof) add('box', g.bone, [0, -g.len + 0.04, 0.02], [0.2, 0.1, 0.24], ML.hoof || '#2b221a', null, { detail: true });
    }
    for (const w of mountWheels(M)) {
      add(ML.wheelShape || 'cyl', 'wheel', [w.x, w.y, w.z], ML.wheelShape === 'torus' ? [w.r * 2.3, w.r * 2.3, w.r * 2.3] : [w.r * 2, 0.12, w.r * 2], ML.wheel || '#4a3726', ML.wheelShape === 'torus' ? [0, Math.PI / 2, 0] : [0, 0, Math.PI / 2]);
      if (ML.wheelShape !== 'torus') add('cyl', 'wheel', [w.x * 1.04, w.y, w.z], [w.r * 0.5, 0.14, w.r * 0.5], ML.hub || '#c9a24a', [0, 0, Math.PI / 2], { detail: true });
    }
  }

  for (const p of L.parts || []) add(p[0], p[1], p[2], p[3], p[4], p[5], p[6]);

  // Compile: per-prim local matrix at the right scale.
  const ms = def.mount ? def.mount.scale || 1 : 1;
  const out = prims.map(([shape, bone, pos, size, color, rot, flags]) => {
    const mount = MOUNT_BONES.has(bone);
    const sc = mount ? ms : s;
    return {
      shape,
      bone,
      local: primMatrix(pos, size, rot, sc),
      color,
      detail: !!(flags && flags.detail),
      glow: !!(flags && flags.glow),
      skin: color === 'skin' ? skin : null,
    };
  });
  def._look = out;
  return out;
}

// Mount leg pivots (mount-local) with gait phase offsets, derived from the mount dims.
export function mountLegs(M) {
  const top = -M.bodyH * 0.25;
  const len = M.bodyY + top;
  const out = [];
  const w = M.bodyW * 0.32;
  const zs = M.legs === 2 ? [0] : M.legs === 6 ? [M.bodyLen * 0.3, 0, -M.bodyLen * 0.3] : [M.bodyLen * 0.3, -M.bodyLen * 0.3];
  let k = 0;
  zs.forEach((z, zi) => {
    for (const sx of [-1, 1]) {
      out.push({ bone: `mLeg${k}`, x: sx * (M.legs === 6 ? M.bodyW * 0.48 : w), y: top, z, len, ph: ((zi + (sx > 0 ? 1 : 0)) % 2) * Math.PI });
      k++;
    }
  });
  return M.legs ? out : [];
}

export function mountWheels(M) {
  if (M.wheelPos) return M.wheelPos.map(([x, z, r]) => ({ x, y: r + 0.06 - M.bodyY, z, r }));
  const y = M.wheelR + 0.06 - M.bodyY;
  if (M.wheels === 1) return [{ x: 0, y, z: 0, r: M.wheelR }];
  if (M.wheels === 2) return [{ x: 0, y, z: M.bodyLen * 0.4, r: M.wheelR }, { x: 0, y, z: -M.bodyLen * 0.4, r: M.wheelR }];
  if (M.wheels >= 4) {
    const o = [];
    for (const sz of [1, -1]) for (const sx of [-1, 1]) o.push({ x: sx * (M.bodyW / 2 + 0.08), y, z: sz * M.bodyLen * 0.32, r: M.wheelR });
    return o;
  }
  return [];
}

export { humanDims, mountDims };
