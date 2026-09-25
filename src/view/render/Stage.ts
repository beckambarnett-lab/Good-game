// Stage: renderer, scene, camera, winter lighting, fog and the post-processing chain
// (bloom → neutral tone mapping → vignette, SMAA on Low), with resize handling and a frame loop.
// Quality presets set the anti-aliasing, shadows, bloom and render scale; dynamic resolution keeps
// the frame rate by stepping the render scale (Plan Part 5.10).

import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
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
  type Material,
  type Mesh,
  PCFShadowMap,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { ShadowSpec } from '../../data/quality.ts';
import { dynamicResolution, postFx } from '../../data/tuning.ts';
import { DynamicResolution } from './DynamicResolution.ts';
import { GpuTimer } from './GpuTimer.ts';
import { palette } from './palette.ts';
import { defaultQuality, pixelRatioFor, type ResolvedQuality } from './Quality.ts';
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
/** Frame-rate target when uncapped (Plan Part 7.8: 60 fps). */
const DEFAULT_TARGET_FPS = 60;
/** A GPU timer that hasn't answered for this long (s) is treated as missing. */
const GPU_TIMER_PATIENCE = 2;

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly sun: DirectionalLight;
  readonly hemi: HemisphereLight;
  readonly sky: Sky;
  private readonly composer: EffectComposer;
  private effectPasses: EffectPass[] = [];
  private quality: ResolvedQuality;
  private readonly dynres: DynamicResolution;
  private readonly gpuTimer: GpuTimer;
  private gpuSilence = 0;
  private unmeasured = 0;
  private targetMs = 1000 / DEFAULT_TARGET_FPS;
  /**
   * The last frame's draw calls and triangles: the main scene pass, the sun's shadow pass and the
   * post-processing passes, for the dev overlay's per-pass budgets (Plan Part 7.8).
   */
  readonly frameInfo = {
    mainCalls: 0,
    mainTriangles: 0,
    shadowCalls: 0,
    shadowTriangles: 0,
    postCalls: 0,
    gpuMs: null as number | null,
  };
  private readonly passCount = { sceneCalls: 0, sceneTriangles: 0, shadowCalls: 0, shadowTriangles: 0 };
  private readonly drawingSize = new Vector2();
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    // Counters span the whole frame (every composer pass), reset in renderFrame.
    this.renderer.info.autoReset = false;
    this.countShadowPass();
    host.appendChild(this.renderer.domElement);
    this.gpuTimer = new GpuTimer(this.renderer.getContext() as WebGL2RenderingContext);
    this.quality = defaultQuality();
    this.dynres = new DynamicResolution(
      dynamicResolution,
      this.quality.autoScaleFloor,
      this.quality.renderScale,
    );

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
    // Map size and box width come from the quality level (applyShadows).
    const s = this.sun.shadow.camera;
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
    this.composer.addPass(this.countScenePass(new RenderPass(this.scene, this.camera)));
    this.buildPost(this.quality);
    this.applyShadows(this.quality.shadow);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  /** The render scale dynamic resolution has settled on (1 = the preset's full resolution). */
  get renderScale(): number {
    return this.dynres.scale;
  }

  /** Whether frame cost comes from the GPU timer (else the frame interval). */
  get gpuTimed(): boolean {
    return this.gpuTimer.available && this.gpuSilence < GPU_TIMER_PATIENCE;
  }

  /**
   * Applies a resolved quality level: anti-aliasing, bloom, shadows and the render scale range.
   * `fpsCap` is the frame-rate target dynamic resolution holds when judging by frame interval.
   */
  setQuality(q: ResolvedQuality, fpsCap: number | null): void {
    const before = this.quality;
    this.quality = q;
    this.targetMs = 1000 / (fpsCap ?? DEFAULT_TARGET_FPS);
    if (before.antiAliasing !== q.antiAliasing || before.bloom !== q.bloom) this.buildPost(q);
    this.applyShadows(q.shadow);
    this.dynres.setRange(q.dynamic ? q.autoScaleFloor : q.renderScale, q.renderScale);
    this.resize();
  }

  /**
   * Compiles every shader the scene needs before play (Plan Part 5.9), then draws one full frame
   * so the shadow depth and post-processing programs compile too. Returns the time taken (ms).
   */
  async prewarm(): Promise<number> {
    const t0 = performance.now();
    await this.renderer.compileAsync(this.scene, this.camera);
    this.composer.render(0);
    return performance.now() - t0;
  }

  private buildPost(q: ResolvedQuality): void {
    for (const pass of this.effectPasses) {
      this.composer.removePass(pass);
      pass.dispose();
    }
    const effects = [];
    if (q.bloom !== 'off') {
      const cheap = q.bloom === 'cheap' ? postFx.cheapBloom : null;
      effects.push(
        new BloomEffect({
          intensity: postFx.bloom.intensity,
          luminanceThreshold: postFx.bloom.threshold,
          luminanceSmoothing: postFx.bloom.smoothing,
          mipmapBlur: true,
          ...(cheap ? { levels: cheap.levels, resolutionScale: cheap.resolutionScale } : {}),
        }),
      );
    }
    effects.push(
      new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      new VignetteEffect({ darkness: postFx.vignette.darkness, offset: postFx.vignette.offset }),
    );
    this.effectPasses = [new EffectPass(this.camera, ...effects)];
    // SMAA works on the finished image, in its own pass after the grade.
    if (q.antiAliasing === 'smaa') this.effectPasses.push(new EffectPass(this.camera, new SMAAEffect()));
    for (const pass of this.effectPasses) this.composer.addPass(pass);
    this.composer.multisampling = q.antiAliasing === 'msaa4' ? 4 : 0;
  }

  /** Shadow map size, box and filter for a quality level (cascades arrive with CSM; ADR 0003). */
  private applyShadows(spec: ShadowSpec | null): void {
    const r = this.renderer;
    const type = spec?.soft === false ? PCFShadowMap : PCFSoftShadowMap;
    const programsChange = r.shadowMap.enabled !== (spec !== null) || r.shadowMap.type !== type;
    r.shadowMap.enabled = spec !== null;
    this.sun.castShadow = spec !== null;
    if (spec) {
      r.shadowMap.type = type;
      const shadow = this.sun.shadow;
      if (shadow.mapSize.x !== spec.mapSize) {
        shadow.mapSize.set(spec.mapSize, spec.mapSize);
        shadow.map?.dispose();
        shadow.map = null;
      }
      const half = spec.distance / 2;
      Object.assign(shadow.camera, { left: -half, right: half, top: half, bottom: -half });
      shadow.camera.updateProjectionMatrix();
    }
    if (programsChange) {
      // Shadow filtering is compiled into every lit material's shader.
      this.scene.traverse((o) => {
        const m = (o as Mesh).material as Material | Material[] | undefined;
        for (const mat of Array.isArray(m) ? m : m ? [m] : []) mat.needsUpdate = true;
      });
    }
  }

  /** Counts what the sun's shadow map draws, which three renders inside the scene pass. */
  private countShadowPass(): void {
    const shadowMap = this.renderer.shadowMap;
    const renderShadows = shadowMap.render.bind(shadowMap);
    const info = this.renderer.info.render;
    shadowMap.render = (...args: Parameters<typeof renderShadows>) => {
      const calls = info.calls;
      const triangles = info.triangles;
      renderShadows(...args);
      this.passCount.shadowCalls += info.calls - calls;
      this.passCount.shadowTriangles += info.triangles - triangles;
    };
  }

  /** Counts the scene pass (main view plus its shadow map); the rest of the frame is post. */
  private countScenePass(pass: RenderPass): RenderPass {
    const renderScene = pass.render.bind(pass);
    const info = this.renderer.info.render;
    pass.render = (...args: Parameters<typeof renderScene>) => {
      const calls = info.calls;
      const triangles = info.triangles;
      renderScene(...args);
      this.passCount.sceneCalls += info.calls - calls;
      this.passCount.sceneTriangles += info.triangles - triangles;
    };
    return pass;
  }

  /** Feeds this frame's cost to dynamic resolution and applies any step. */
  private adaptResolution(dt: number, gpuMs: number | null): void {
    if (!this.quality.dynamic) return;
    this.unmeasured += dt;
    let changed = false;
    if (this.gpuTimed) {
      if (gpuMs === null) {
        this.gpuSilence += dt;
        return;
      }
      this.gpuSilence = 0;
      changed = this.dynres.sample(this.unmeasured, gpuMs, 'gpu', this.targetMs);
    } else {
      changed = this.dynres.sample(dt, dt * 1000, 'interval', this.targetMs);
    }
    this.unmeasured = 0;
    if (changed) this.resize();
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
    const gpuMs = this.gpuTimer.poll();
    const info = this.renderer.info;
    const pc = this.passCount;
    info.reset();
    pc.sceneCalls = pc.sceneTriangles = pc.shadowCalls = pc.shadowTriangles = 0;
    this.gpuTimer.begin();
    this.composer.render(dt);
    this.gpuTimer.end();
    const f = this.frameInfo;
    f.mainCalls = pc.sceneCalls - pc.shadowCalls;
    f.mainTriangles = pc.sceneTriangles - pc.shadowTriangles;
    f.shadowCalls = pc.shadowCalls;
    f.shadowTriangles = pc.shadowTriangles;
    f.postCalls = info.render.calls - pc.sceneCalls;
    if (gpuMs !== null) f.gpuMs = gpuMs;
    this.adaptResolution(dt, gpuMs);
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

  /**
   * Rough GPU memory of the render targets and shadow map (MB), for the dev overlay's budget
   * (Plan 7.8: textures + targets ≤ 160 MB): half-float colour buffers, depth, MSAA storage, the
   * bloom mip chain and the sun's shadow map.
   */
  estimateTargetsMB(): number {
    const size = this.renderer.getDrawingBufferSize(this.drawingSize);
    const px = size.x * size.y;
    const samples = this.composer.multisampling;
    let bytes = px * 4 * 2; // the canvas: colour + depth/stencil
    bytes += px * (8 * 2 + 4); // composer input and output (RGBA16F) and depth
    if (samples > 0) bytes += px * (8 + 4) * samples;
    if (this.quality.bloom !== 'off') bytes += px * 0.25 * 8 * (4 / 3); // half-res mip chain
    if (this.sun.castShadow) bytes += this.sun.shadow.mapSize.x * this.sun.shadow.mapSize.y * 4;
    return bytes / (1024 * 1024);
  }

  /** The preset name shown by the dev overlay. */
  get qualityLabel(): string {
    const q = this.quality;
    return `${q.antiAliasing.toUpperCase()} · shadows ${q.shadow ? `${q.shadow.mapSize}/${q.shadow.distance} m` : 'off'} · bloom ${q.bloom}`;
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
    const q = this.quality;
    this.renderer.setPixelRatio(
      pixelRatioFor(w, h, window.devicePixelRatio, q.maxMegapixels, this.dynres.scale),
    );
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
