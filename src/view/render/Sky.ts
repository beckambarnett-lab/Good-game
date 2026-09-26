// Gradient sky dome with a soft sun glow (Plan Part 5.5). Rendered behind everything, fog-free.

import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';

export class Sky extends Mesh<SphereGeometry, ShaderMaterial> {
  constructor(zenith: number, horizon: number, sunColor: number) {
    const material = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        zenith: { value: new Color(zenith) },
        horizon: { value: new Color(horizon) },
        sunColor: { value: new Color(sunColor) },
        sunDir: { value: new Vector3(0.3, 0.25, -0.9).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 zenith; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(horizon, zenith, pow(h, 0.55));
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          col += sunColor * (pow(s, 64.0) * 0.6 + pow(s, 6.0) * 0.12);
          // A little dither kills banding in the soft gradient.
          float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          col += (n - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    super(new SphereGeometry(400, 24, 16), material);
    this.frustumCulled = false;
    this.renderOrder = -1;
  }

  setSunDirection(dir: Vector3): void {
    this.material.uniforms.sunDir?.value.copy(dir).normalize();
  }
}
