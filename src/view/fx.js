import { THREE } from './three.js';

// Particles (one Points draw call), shock rings, beams, comic words, stuck arrows, screen shake.
const MAXP = 5000;
const SHAPE = { soft: 0, star: 1, square: 2, plus: 3 };

export class Fx {
  constructor(scene, renderer, mobile) {
    this.scene = scene;
    this.renderer = renderer;
    this.mobile = mobile;
    this.max = mobile ? 2500 : MAXP;
    const n = this.max;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.shape = new Float32Array(n);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    this.s0 = new Float32Array(n);
    this.s1 = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.rot = new Float32Array(n);
    this.count = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('shape', new THREE.BufferAttribute(this.shape, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { scale: { value: 400 } },
      vertexShader: `attribute float size; attribute float alpha; attribute float shape; attribute float rot; attribute vec3 color;
        varying vec3 vC; varying float vA; varying float vS; varying float vR;
        uniform float scale;
        void main(){ vC = color; vA = alpha; vS = shape; vR = rot; vec4 mv = modelViewMatrix*vec4(position,1.0);
          gl_PointSize = min(160.0, size * scale / max(0.5, -mv.z)); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; varying float vS; varying float vR;
        void main(){ vec2 p = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR); p = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
          float a = 0.0; float r = length(p);
          if (vS < 0.5) a = smoothstep(0.5, 0.15, r);
          else if (vS < 1.5) { float ang = atan(p.y,p.x); float star = 0.28 + 0.2*cos(ang*5.0); a = smoothstep(star+0.04, star-0.04, r); }
          else if (vS < 2.5) a = step(abs(p.x),0.32)*step(abs(p.y),0.2);
          else a = max(step(abs(p.x),0.12)*step(abs(p.y),0.4), step(abs(p.y),0.12)*step(abs(p.x),0.4));
          if (a < 0.02) discard; gl_FragColor = vec4(vC, a*vA); }`,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.mat = mat;

    // Shock rings
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.85, 1, 40);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.visible = false;
      m.renderOrder = 4;
      scene.add(m);
      this.rings.push({ m, t: 0, life: 0, r0: 0, r1: 0 });
    }
    // Beams
    this.beams = [];
    const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    beamGeo.translate(0, 0.5, 0);
    beamGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.visible = false;
      m.renderOrder = 4;
      scene.add(m);
      this.beams.push({ m, t: 0, life: 0, w: 0 });
    }
    // Comic words
    this.words = [];
    this.wordTex = {};
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
      s.visible = false;
      s.renderOrder = 10;
      scene.add(s);
      this.words.push({ s, t: 0, life: 0 });
    }
    this.stuck = [];
    this.shake = 0;
    this.wordCool = 0;
    this.flashT = 0;
  }

  setViewport(h) {
    this.mat.uniforms.scale.value = h * 0.9;
  }

  clear() {
    this.count = 0;
    this.stuck.length = 0;
    for (const r of this.rings) r.m.visible = false;
    for (const b of this.beams) b.m.visible = false;
    for (const w of this.words) w.s.visible = false;
  }

  spawn(x, y, z, vx, vy, vz, life, s0, s1, color, shape = 0, grav = 0, drag = 0) {
    let i = this.count;
    if (i >= this.max) {
      // overwrite a random old particle
      i = (Math.random() * this.max) | 0;
    } else this.count++;
    const i3 = i * 3;
    this.pos[i3] = x;
    this.pos[i3 + 1] = y;
    this.pos[i3 + 2] = z;
    this.vel[i3] = vx;
    this.vel[i3 + 1] = vy;
    this.vel[i3 + 2] = vz;
    this.col[i3] = color.r;
    this.col[i3 + 1] = color.g;
    this.col[i3 + 2] = color.b;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.s0[i] = s0;
    this.s1[i] = s1;
    this.size[i] = s0;
    this.alpha[i] = 1;
    this.shape[i] = shape;
    this.grav[i] = grav;
    this.drag[i] = drag;
    this.rot[i] = Math.random() * 6.28;
  }

  burst(x, y, z, n, opt) {
    const c = opt.colors;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const up = opt.up ?? 0.5;
      const sp = opt.speed * (0.4 + Math.random() * 0.8);
      const vy = (up + Math.random() * (1 - up)) * sp * (opt.vyMul ?? 1);
      const h = Math.sqrt(Math.max(0, 1 - up * up)) * sp;
      const col = c[(Math.random() * c.length) | 0];
      this.spawn(
        x + (Math.random() - 0.5) * (opt.jitter || 0),
        y + (Math.random() - 0.5) * (opt.jitter || 0) * 0.5,
        z + (Math.random() - 0.5) * (opt.jitter || 0),
        Math.cos(a) * h + (opt.vx || 0),
        vy,
        Math.sin(a) * h + (opt.vz || 0),
        opt.life * (0.6 + Math.random() * 0.8),
        opt.s0 * (0.7 + Math.random() * 0.6),
        opt.s1,
        col,
        SHAPE[opt.shape || 'soft'],
        opt.grav ?? 0,
        opt.drag ?? 1,
      );
    }
  }

  ring(x, y, z, r0, r1, life, color, opacity = 0.8) {
    const r = this.rings.find((q) => !q.m.visible) || this.rings[0];
    r.m.visible = true;
    r.m.position.set(x, y + 0.08, z);
    r.m.material.color.set(color);
    r.t = 0;
    r.life = life;
    r.r0 = r0;
    r.r1 = r1;
    r.op = opacity;
  }

  beam(a, b, color, width, life = 0.22) {
    const bm = this.beams.find((q) => !q.m.visible) || this.beams[0];
    const m = bm.m;
    m.visible = true;
    m.position.set(a.x, a.y, a.z);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const L = Math.hypot(dx, dy, dz) || 0.01;
    m.lookAt(b.x, b.y, b.z);
    m.scale.set(width, width, L);
    m.material.color.set(color);
    bm.t = 0;
    bm.life = life;
    bm.w = width;
  }

  word(text, x, y, z, color = '#ffe14d', scale = 1) {
    if (this.wordCool > 0) return;
    this.wordCool = 0.25;
    const key = text + color;
    if (!this.wordTex[key]) this.wordTex[key] = makeWordTexture(text, color);
    const w = this.words.find((q) => !q.s.visible) || this.words[0];
    w.s.material.map = this.wordTex[key];
    w.s.material.needsUpdate = true;
    w.s.visible = true;
    w.s.position.set(x, y + 1.2, z);
    w.t = 0;
    w.life = 0.8;
    w.base = 2.6 * scale;
    w.rot = (Math.random() - 0.5) * 0.4;
  }

  stick(ev) {
    if (this.stuck.length > 220) this.stuck.shift();
    const L = Math.hypot(ev.vx, ev.vy, ev.vz) || 1;
    this.stuck.push({ x: ev.x - (ev.vx / L) * 0.25, y: ev.y + 0.02, z: ev.z - (ev.vz / L) * 0.25, vx: ev.vx, vy: ev.vy, vz: ev.vz, look: ev.look, age: 0, spin: 0 });
  }

  addShake(a) {
    this.shake = Math.min(1.4, this.shake + a);
  }

  update(dt, cam) {
    this.wordCool -= dt;
    this.shake = Math.max(0, this.shake - dt * 2.2);
    // particles
    let n = this.count;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        n--;
        this.copy(n, i);
        i--;
        continue;
      }
      const i3 = i * 3;
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= dr;
      this.vel[i3 + 1] = this.vel[i3 + 1] * dr - this.grav[i] * dt;
      this.vel[i3 + 2] *= dr;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const f = 1 - this.life[i] / this.maxLife[i];
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * f;
      this.alpha[i] = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3;
      this.rot[i] += dt * 3;
    }
    this.count = n;
    this.geo.setDrawRange(0, n);
    for (const k of ['position', 'color', 'size', 'alpha', 'shape', 'rot']) this.geo.attributes[k].needsUpdate = true;

    for (const r of this.rings) {
      if (!r.m.visible) continue;
      r.t += dt;
      const f = r.t / r.life;
      if (f >= 1) {
        r.m.visible = false;
        continue;
      }
      const e = 1 - (1 - f) * (1 - f);
      const rr = r.r0 + (r.r1 - r.r0) * e;
      r.m.scale.set(rr, 1, rr);
      r.m.material.opacity = r.op * (1 - f);
    }
    for (const b of this.beams) {
      if (!b.m.visible) continue;
      b.t += dt;
      const f = b.t / b.life;
      if (f >= 1) {
        b.m.visible = false;
        continue;
      }
      b.m.material.opacity = 1 - f;
      const w = b.w * (1 - f * 0.6);
      b.m.scale.x = w;
      b.m.scale.y = w;
    }
    for (const w of this.words) {
      if (!w.s.visible) continue;
      w.t += dt;
      const f = w.t / w.life;
      if (f >= 1) {
        w.s.visible = false;
        continue;
      }
      const pop = f < 0.15 ? f / 0.15 : 1 + 0.08 * Math.sin(f * 20) * (1 - f);
      const s = w.base * pop;
      w.s.scale.set(s, s * 0.5, 1);
      w.s.material.rotation = w.rot;
      w.s.material.opacity = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3;
      w.s.position.y += dt * 1.2;
    }
    for (let i = this.stuck.length - 1; i >= 0; i--) {
      const s = this.stuck[i];
      s.age += dt;
      if (s.age > 8) this.stuck.splice(i, 1);
    }
  }

  copy(from, to) {
    if (from === to) return;
    const f3 = from * 3;
    const t3 = to * 3;
    for (let k = 0; k < 3; k++) {
      this.pos[t3 + k] = this.pos[f3 + k];
      this.vel[t3 + k] = this.vel[f3 + k];
      this.col[t3 + k] = this.col[f3 + k];
    }
    this.size[to] = this.size[from];
    this.alpha[to] = this.alpha[from];
    this.shape[to] = this.shape[from];
    this.life[to] = this.life[from];
    this.maxLife[to] = this.maxLife[from];
    this.s0[to] = this.s0[from];
    this.s1[to] = this.s1[from];
    this.grav[to] = this.grav[from];
    this.drag[to] = this.drag[from];
    this.rot[to] = this.rot[from];
  }
}

function makeWordTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.translate(256, 128);
  // starburst
  g.beginPath();
  const spikes = 14;
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 ? 90 : 120;
    g.lineTo(Math.cos(a) * r * 1.9, Math.sin(a) * r * 0.95);
  }
  g.closePath();
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = '#1b1b2a';
  g.stroke();
  g.font = '900 86px "Bowlby One", "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 16;
  g.strokeStyle = '#1b1b2a';
  g.strokeText(text, 0, 6);
  g.fillStyle = color;
  g.fillText(text, 0, 6);
  const t = new THREE.CanvasTexture(c);

  return t;
}

export const C = (hex) => new THREE.Color(hex);
