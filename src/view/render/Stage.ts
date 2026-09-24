// Stage: renderer, scene, camera, winter lighting, fog and the post-processing chain
// (bloom → neutral tone mapping → vignette), with resize handling and a frame loop.

import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import {
  Color,
  DirectionalLight,
  FogExp2,
  HalfFloatType,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { palette } from './palette.ts';
import { Sky } from './Sky.ts';

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly sun: DirectionalLight;
  readonly hemi: HemisphereLight;
  readonly sky: Sky;
  private readonly composer: EffectComposer;
  private readonly host: HTMLElement;
  private last = performance.now();
  private readonly updaters: ((dt: number, t: number) => void)[] = [];
  private elapsed = 0;

  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);

    this.camera = new PerspectiveCamera(50, 1, 0.1, 900);
    this.scene.background = new Color(palette.skyHorizon);
    this.scene.fog = new FogExp2(palette.skyHorizon, 0.012);

    this.sky = new Sky(palette.skyZenith, palette.skyHorizon, palette.sun);
    this.scene.add(this.sky);

    // Low winter sun, warm; blue-white sky fill; snow bounce from below.
    this.hemi = new HemisphereLight(0xbcd3f0, 0xf1f4f8, 1.35);
    this.scene.add(this.hemi);
    this.sun = new DirectionalLight(palette.sun, 2.4);
    this.sun.position.set(18, 14, -22);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = this.sun.shadow.camera;
    s.left = -18;
    s.right = 18;
    s.top = 18;
    s.bottom = -18;
    s.near = 1;
    s.far = 80;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.sky.setSunDirection(new Vector3().copy(this.sun.position).normalize());

    this.composer = new EffectComposer(this.renderer, { frameBufferType: HalfFloatType, multisampling: 4 });
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new EffectPass(
        this.camera,
        new BloomEffect({
          intensity: 0.45,
          luminanceThreshold: 0.9,
          luminanceSmoothing: 0.2,
          mipmapBlur: true,
        }),
        new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
        new VignetteEffect({ darkness: 0.28, offset: 0.35 }),
      ),
    );

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  onFrame(fn: (dt: number, t: number) => void): void {
    this.updaters.push(fn);
  }

  start(): void {
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.elapsed += dt;
      for (const u of this.updaters) u(dt, this.elapsed);
      this.composer.render(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  resize(): void {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
