// Gentle falling snow: a box of flakes around the camera, animated entirely in the vertex
// shader (no per-flake CPU work). Plan Part 2.4 describes the full weather-driven version.

import { BufferAttribute, BufferGeometry, Points, ShaderMaterial, type Vector3 } from 'three';

export class Snowfall {
  readonly points: Points;
  private readonly material: ShaderMaterial;

  constructor(count = 3000, size = new Float32Array([40, 20, 40])) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = Math.random() * (size[0] ?? 40);
      pos[i * 3 + 1] = Math.random() * (size[1] ?? 20);
      pos[i * 3 + 2] = Math.random() * (size[2] ?? 40);
      seed[i] = Math.random();
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('seed', new BufferAttribute(seed, 1));
    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        box: { value: [size[0], size[1], size[2]] },
        center: { value: [0, 0, 0] },
        fall: { value: 0.9 },
        wind: { value: [0.35, 0.1] },
      },
      vertexShader: /* glsl */ `
        attribute float seed;
        uniform float time; uniform vec3 box; uniform vec3 center; uniform float fall; uniform vec2 wind;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float t = time * (0.7 + seed * 0.6);
          p.y -= t * fall;
          p.x += t * wind.x + sin(t * 1.3 + seed * 30.0) * 0.35;
          p.z += t * wind.y + cos(t * 1.1 + seed * 20.0) * 0.35;
          p = mod(p - center + box * 0.5, box) + center - box * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.5 + seed * 2.5) * 60.0 / -mv.z;
          vAlpha = smoothstep(0.0, 4.0, -mv.z) * 0.85;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, smoothstep(0.5, 0.15, r) * vAlpha);
        }`,
    });
    this.points = new Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  update(t: number, center: Vector3): void {
    const u = this.material.uniforms;
    if (u.time) u.time.value = t;
    if (u.center) u.center.value = [center.x, center.y, center.z];
  }
}
