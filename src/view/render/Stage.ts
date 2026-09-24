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
import { shared } from './sharedUniforms.ts';

export interface StageOptions {
  /** Exponential fog density (FogExp2); the valley needs far thinner fog than a clearing. */
  fogDensity?: number;
  /** Camera far plane (m). */
  far?: number;
  /** Scales every light: snow under three's physically based lighting needs ~1.6 to read white. */
  exposure?: number;
}

/** Draw calls and triangles of one render, split into the main and shadow passes. */
export interface PassStats {
  mainCalls: number;
  mainTriangles: number;
  shadowCalls: number;
  shadowTriangles: number;
}

const DEFAULT_FOG_DENSITY = 0.012;
const DEFAULT_FAR = 900;

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
  /** Sun position relative to what it lights; the shadow camera follows a focus point. */
  private readonly sunOffset = new Vector3(18, 14, -22);
  private readonly lightDir = new Vector3();
  private readonly lightRight = new Vector3();
  private readonly lightUp = new Vector3();
  private readonly snapped = new Vector3();

  constructor(host: HTMLElement, options: StageOptions = {}) {
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

    this.camera = new PerspectiveCamera(50, 1, 0.1, options.far ?? DEFAULT_FAR);
    this.scene.background = new Color(palette.skyHorizon);
    this.scene.fog = new FogExp2(palette.skyHorizon, options.fogDensity ?? DEFAULT_FOG_DENSITY);

    this.sky = new Sky(palette.skyZenith, palette.skyHorizon, palette.sun);
    this.scene.add(this.sky);

    // Low winter sun, warm; blue-white sky fill; snow bounce from below.
    const exposure = options.exposure ?? 1;
    this.hemi = new HemisphereLight(0xbcd3f0, 0xf1f4f8, 1.35 * exposure);
    this.scene.add(this.hemi);
    this.sun = new DirectionalLight(palette.sun, 2.4 * exposure);
    this.sun.position.copy(this.sunOffset);
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
    this.sky.setSunDirection(new Vector3().copy(this.sunOffset).normalize());
    // Light-space basis for texel snapping (the sun direction is fixed until Environment lands).
    this.lightDir.copy(this.sunOffset).normalize();
    this.lightRight.crossVectors(new Vector3(0, 1, 0), this.lightDir).normalize();
    this.lightUp.crossVectors(this.lightDir, this.lightRight);

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

  /** Runs the per-frame updaters and draws one frame through the post chain. */
  renderFrame(dt: number): void {
    this.elapsed += dt;
    shared.uTime.value = this.elapsed;
    for (const u of this.updaters) u(dt, this.elapsed);
    this.sky.position.copy(this.camera.position);
    this.composer.render(dt);
  }

  /** Stand-alone loop for Labs; the game drives `renderFrame` from its own GameLoop. */
  start(): void {
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.renderFrame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /**
   * Centres the sun's shadow box on `focus` (Plan Part 7.9), snapped to whole shadow-map texels in
   * light space so shadows don't shimmer as the focus moves.
   */
  followShadow(focus: Vector3): void {
    const cam = this.sun.shadow.camera;
    const texel = (cam.right - cam.left) / this.sun.shadow.mapSize.x;
    const r = Math.round(focus.dot(this.lightRight) / texel) * texel;
    const u = Math.round(focus.dot(this.lightUp) / texel) * texel;
    const d = focus.dot(this.lightDir);
    this.snapped
      .copy(this.lightRight)
      .multiplyScalar(r)
      .addScaledVector(this.lightUp, u)
      .addScaledVector(this.lightDir, d);
    this.sun.target.position.copy(this.snapped);
    this.sun.position.copy(this.snapped).add(this.sunOffset);
  }

  /** Renders the scene directly (no post) to count the main and shadow passes separately. */
  measurePasses(): PassStats {
    const r = this.renderer;
    const autoReset = r.info.autoReset;
    r.info.autoReset = false;
    const shadowAuto = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false;
    r.shadowMap.needsUpdate = false;
    r.info.reset();
    r.render(this.scene, this.camera);
    const mainCalls = r.info.render.calls;
    const mainTriangles = r.info.render.triangles;
    r.shadowMap.autoUpdate = true;
    r.info.reset();
    r.render(this.scene, this.camera);
    const stats = {
      mainCalls,
      mainTriangles,
      shadowCalls: r.info.render.calls - mainCalls,
      shadowTriangles: r.info.render.triangles - mainTriangles,
    };
    r.shadowMap.autoUpdate = shadowAuto;
    r.info.autoReset = autoReset;
    r.info.reset();
    return stats;
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
