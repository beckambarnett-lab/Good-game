// Snow puffs: soft billboard particles that expand, drift and fade. Used for snow knocked off
// branches, the landing cloud when a tree hits the ground, and small kicks on each chop.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';

interface Puff {
  pos: Vector3;
  vel: Vector3;
  age: number;
  life: number;
  size: number;
  grow: number;
}

export class Puffs {
  readonly points: Points;
  private readonly puffs: (Puff | null)[];
  private readonly positions: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private next = 0;

  constructor(capacity = 600, additive = false) {
    this.puffs = new Array(capacity).fill(null);
    this.positions = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(this.positions, 3));
    geo.setAttribute('size', new BufferAttribute(this.sizes, 1));
    geo.setAttribute('alpha', new BufferAttribute(this.alphas, 1));
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
      uniforms: { scale: { value: 420 } },
      vertexShader: /* glsl */ `
        attribute float size; attribute float alpha; varying float vAlpha; uniform float scale;
        void main() {
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          if (r > 0.5) discard;
          float a = smoothstep(0.5, 0.05, r) * vAlpha;
          gl_FragColor = vec4(vec3(0.97, 0.98, 1.0), a);
        }`,
    });
    this.points = new Points(geo, mat);
    this.points.frustumCulled = false;
  }

  emit(
    origin: Vector3,
    count: number,
    opts: { spread?: number; up?: number; size?: number; life?: number; out?: number } = {},
  ): void {
    const spread = opts.spread ?? 0.3;
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % this.puffs.length;
      const ang = Math.random() * Math.PI * 2;
      const out = (opts.out ?? 0.6) * (0.4 + Math.random());
      this.puffs[i] = {
        pos: origin
          .clone()
          .add(
            new Vector3(
              (Math.random() - 0.5) * spread,
              Math.random() * spread * 0.5,
              (Math.random() - 0.5) * spread,
            ),
          ),
        vel: new Vector3(Math.cos(ang) * out, (opts.up ?? 0.4) * (0.5 + Math.random()), Math.sin(ang) * out),
        age: 0,
        life: (opts.life ?? 1.2) * (0.7 + Math.random() * 0.6),
        size: (opts.size ?? 0.35) * (0.7 + Math.random() * 0.6),
        grow: 1.2 + Math.random(),
      };
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.puffs[i];
      if (!p) {
        this.alphas[i] = 0;
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        this.puffs[i] = null;
        this.alphas[i] = 0;
        continue;
      }
      p.vel.multiplyScalar(1 - dt * 1.8);
      p.vel.y -= dt * 0.25;
      p.pos.addScaledVector(p.vel, dt);
      const t = p.age / p.life;
      this.positions[i * 3] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      this.sizes[i] = p.size * (1 + p.grow * t);
      this.alphas[i] = 0.75 * (1 - t) * Math.min(1, t * 8);
    }
    const g = this.points.geometry;
    (g.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (g.getAttribute('size') as BufferAttribute).needsUpdate = true;
    (g.getAttribute('alpha') as BufferAttribute).needsUpdate = true;
  }
}
