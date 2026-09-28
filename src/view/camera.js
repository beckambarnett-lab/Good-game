import { THREE } from './three.js';

const _v = new THREE.Vector3();
const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _w = new THREE.Vector3();

// Free-fly camera (WASD + drag look, wheel/pinch dolly, two-finger pan), follow-a-unit mode, and an
// over-the-shoulder mode for a possessed unit (mouse/drag turns the view; the unit faces the crosshair).
export class CameraRig {
  constructor(cam, ground) {
    this.cam = cam;
    this.ground = ground;
    this.pos = new THREE.Vector3(0, 24, 46);
    this.yaw = Math.PI;
    this.pitch = -0.5;
    this.keys = new Set();
    this.mode = 'free';
    this.follow = null;
    this.followYaw = 0;
    this.followPitch = 0.35;
    this.followDist = 7;
    this.fpos = new THREE.Vector3();
    this.flook = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.shakeT = 0;
    this.pYaw = 0;
    this.pPitch = 0;
    this.pDist = 5;
    this.pivot = new THREE.Vector3();
    this.sens = 1;
  }

  setGround(g) {
    this.ground = g;
  }

  reset(side = 0) {
    this.mode = 'free';
    this.follow = null;
    const portrait = this.cam.aspect < 0.9;
    const s = side === 0 ? 1 : -1;
    if (portrait) this.pos.set(0, 40, 44 * s);
    else this.pos.set(0, 30, 37 * s);
    this.yaw = side === 0 ? Math.PI : 0;
    this.pitch = portrait ? -0.98 : -0.9;
  }

  rotate(dx, dy) {
    if (this.mode === 'possess') {
      this.pYaw -= dx * 0.0042 * this.sens;
      this.pPitch = Math.max(-0.75, Math.min(0.9, this.pPitch - dy * 0.0036 * this.sens));
      return;
    }
    if (this.mode === 'follow') {
      this.followYaw -= dx * 0.006;
      this.followPitch = Math.max(-0.1, Math.min(1.3, this.followPitch + dy * 0.005));
      return;
    }
    this.yaw -= dx * 0.005;
    this.pitch = Math.max(-1.45, Math.min(0.6, this.pitch - dy * 0.005));
  }

  dolly(d) {
    if (this.mode === 'possess') {
      const s = this.follow ? this.follow.def.scale || 1 : 1;
      this.pDist = Math.max(2 + s, Math.min(14 + 3 * s, this.pDist * (1 + d * 0.1)));
      return;
    }
    if (this.mode === 'follow') {
      this.followDist = Math.max(3, Math.min(30, this.followDist * (1 + d * 0.1)));
      return;
    }
    const f = this.forward();
    this.pos.addScaledVector(f, -d * 2.2);
    this.clamp();
  }

  pan(dx, dy) {
    if (this.mode !== 'free') return;
    const r = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw)); // screen-right
    const f = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const k = Math.max(0.02, this.pos.y * 0.0025);
    this.pos.addScaledVector(r, -dx * k * 1.6);
    this.pos.addScaledVector(f, dy * k * 1.6);
    this.clamp();
  }

  forward() {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
  }

  startFollow(u) {
    this.mode = 'follow';
    this.follow = u;
    this.followYaw = 0;
    this.followDist = 3.2 + 2.2 * (u.def.scale || 1) + (u.def.mount ? 2 : 0);
    this.followPitch = 0.3;
    this.fpos.copy(this.cam.position);
  }

  startPossess(u) {
    this.mode = 'possess';
    this.follow = u;
    const s = u.def.scale || 1;
    this.pYaw = u.facing();
    this.pPitch = -0.2;
    this.pDist = 2.6 + 1.9 * s + (u.def.mount ? 2.2 : 0);
    this.pivot.copy(u.p.torso.position);
    this.fpos.copy(this.cam.position);
  }

  // Unit vector the possessed view is looking along.
  aimDir(out) {
    const cp = Math.cos(this.pPitch);
    return out.set(Math.sin(this.pYaw) * cp, Math.sin(this.pPitch), Math.cos(this.pYaw) * cp);
  }

  stopFollow() {
    if (this.mode !== 'follow' && this.mode !== 'possess') return;
    this.mode = 'free';
    // hand the current view back to the free camera
    this.pos.copy(this.cam.position);
    const d = new THREE.Vector3();
    this.cam.getWorldDirection(d);
    this.yaw = Math.atan2(d.x, d.z);
    this.pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
    this.follow = null;
  }

  clamp() {
    const p = this.pos;
    p.x = Math.max(-90, Math.min(90, p.x));
    p.z = Math.max(-90, Math.min(90, p.z));
    const gy = this.ground ? this.ground.heightAt(p.x, p.z) : 0;
    p.y = Math.max(gy + 1.5, Math.min(95, p.y));
  }

  update(dt, shake) {
    const cam = this.cam;
    if (this.mode === 'possess' && this.follow) {
      const u = this.follow;
      const s = u.def.scale || 1;
      const t = u.p.torso.position;
      // smooth the pivot so ragdoll wobble doesn't shake the view
      this.pivot.lerp(_v.set(t.x, t.y + 0.45 * s + (u.def.mount ? 0.4 : 0), t.z), 1 - Math.exp(-dt * 14));
      const f = this.aimDir(_f);
      const r = _r.set(-Math.cos(this.pYaw), 0, Math.sin(this.pYaw)); // screen-right
      const side = 0.55 + 0.3 * s;
      const want = _w.copy(this.pivot).addScaledVector(f, -this.pDist).addScaledVector(r, side);
      want.y += 0.35;
      const gy = this.ground ? this.ground.heightAt(want.x, want.z) : 0;
      want.y = Math.max(want.y, gy + 0.6);
      this.fpos.lerp(want, 1 - Math.exp(-dt * 20));
      cam.position.copy(this.fpos);
      cam.lookAt(this.fpos.x + f.x, this.fpos.y + f.y, this.fpos.z + f.z);
      this.flook.copy(this.fpos).addScaledVector(f, 10);
      this.pos.copy(this.fpos);
    } else if (this.mode === 'follow' && this.follow) {
      const u = this.follow;
      const t = u.p.torso.position;
      const face = u.alive ? u.facing() : this.lastFace || 0;
      this.lastFace = face;
      const yaw = face + Math.PI + this.followYaw;
      const d = this.followDist;
      const target = new THREE.Vector3(t.x + Math.sin(yaw) * d * Math.cos(this.followPitch), t.y + d * Math.sin(this.followPitch) + 1, t.z + Math.cos(yaw) * d * Math.cos(this.followPitch));
      const gy = this.ground ? this.ground.heightAt(target.x, target.z) : 0;
      target.y = Math.max(target.y, gy + 1.2);
      const k = 1 - Math.exp(-dt * 5);
      this.fpos.lerp(target, k);
      this.flook.lerp(new THREE.Vector3(t.x, t.y + 0.5, t.z), 1 - Math.exp(-dt * 10));
      cam.position.copy(this.fpos);
      cam.lookAt(this.flook);
    } else {
      const f = this.forward();
      const r = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw)); // screen-right
      const acc = new THREE.Vector3();
      const K = this.keys;
      if (K.has('KeyW') || K.has('ArrowUp')) acc.add(f);
      if (K.has('KeyS') || K.has('ArrowDown')) acc.sub(f);
      if (K.has('KeyA') || K.has('ArrowLeft')) acc.sub(r);
      if (K.has('KeyD') || K.has('ArrowRight')) acc.add(r);
      if (K.has('KeyE') || K.has('Space')) acc.y += 1;
      if (K.has('KeyQ') || K.has('KeyC')) acc.y -= 1;
      const speed = K.has('ShiftLeft') || K.has('ShiftRight') ? 42 : 18;
      if (acc.lengthSq() > 0) acc.normalize().multiplyScalar(speed);
      this.vel.lerp(acc, 1 - Math.exp(-dt * 8));
      this.pos.addScaledVector(this.vel, dt);
      this.clamp();
      cam.position.copy(this.pos);
      cam.lookAt(this.pos.x + f.x, this.pos.y + f.y, this.pos.z + f.z);
      this.flook.copy(this.pos).add(f.multiplyScalar(10));
      this.fpos.copy(this.pos);
    }
    if (shake > 0) {
      this.shakeT += dt * 40;
      const a = shake * shake * 0.45;
      cam.position.x += Math.sin(this.shakeT * 1.3) * a;
      cam.position.y += Math.sin(this.shakeT * 1.7 + 1) * a;
      cam.position.z += Math.sin(this.shakeT * 1.1 + 2) * a;
    }
  }
}
