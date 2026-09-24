// The app (Plan Part 7.3): the flow state machine, frame loop, settings and page visibility, wired
// to the sim and the view. M0 flow: Boot → Splash (a click, which unlocks audio) → Title →
// Loading → Playing. The title screen and new-game UI arrive in M1, so Title passes straight on.

import { Vector3 } from 'three';
import { FixedStepper } from '../core/fixedStep.ts';
import { StateMachine } from '../core/StateMachine.ts';
import type { ShotDef } from '../data/shots.ts';
import {
  app as appTuning,
  type CameraRigTuning,
  clock as clockTuning,
  type FootstepTuning,
  footsteps as footstepTuning,
  type GaitTuning,
  gait as gaitTuning,
  type MovementTuning,
  movement as movementTuning,
  cameraRig as rigTuning,
  sim as simTuning,
  valleyMusic,
  valleyView,
} from '../data/tuning.ts';
import { wrenhollowForests } from '../data/world/forests.ts';
import { ClockSystem } from '../sim/clock/ClockSystem.ts';
import { PlayerSystem, type Pose } from '../sim/player/PlayerSystem.ts';
import { Sim } from '../sim/Sim.ts';
import { valleyMovementWorld } from '../sim/world/MovementWorld.ts';
import { PlayerAvatar } from '../view/actors/PlayerAvatar.ts';
import { ValleyAudio } from '../view/audio/ValleyAudio.ts';
import { CameraRig } from '../view/camera/CameraRig.ts';
import { generateTerrainInWorker } from '../view/geo/terrain/TerrainClient.ts';
import { Input } from '../view/input/Input.ts';
import type { ActionState, InputOptions } from '../view/input/InputMapper.ts';
import { resolveQuality } from '../view/render/Quality.ts';
import { type PassStats, Stage } from '../view/render/Stage.ts';
import { ValleyScene } from '../view/scenes/ValleyScene.ts';
import { browserFrameClock, GameLoop } from './GameLoop.ts';
import { browserStorage, Settings } from './Settings.ts';
import { type AppState, appStateTraits, appTransitions, clockRunsIn } from './states.ts';
import { Visibility } from './Visibility.ts';

/** Frames rendered at a shot's viewpoint before it is measured and declared ready. */
const SHOT_SETTLE_FRAMES = 4;
const NO_LOOK = { look: { x: 0, y: 0 }, zoom: 0, looking: false };

export interface ShotStatus {
  id: string;
  ready: boolean;
  passes?: PassStats;
  error?: string;
}

const fpsCapOf = (v: '30' | '60' | 'uncapped'): number | null => (v === 'uncapped' ? null : Number(v));

/** Graphics settings that change the quality level (the rest apply on their own). */
const QUALITY_KEYS: ReadonlySet<string> = new Set([
  'preset',
  'renderScaleMode',
  'renderScalePercent',
  'shadows',
  'ambientOcclusion',
  'antiAliasing',
  'bloom',
  'drawDistance',
  'snowDensity',
  'forestDensity',
  'fpsCap',
]);

export interface AppOptions {
  /** Tuning objects, read live (the Winter Walk lab passes copies bound to its sliders). */
  movement?: MovementTuning;
  cameraRig?: CameraRigTuning;
  gait?: GaitTuning;
  footsteps?: FootstepTuning;
  /**
   * Feel-critical sound still in review (Plan Part 8.0): footsteps and the valley's felt-piano
   * phrases play only where asked (the Winter Walk lab) until the user approves them.
   */
  footstepSounds?: boolean;
  valleyPhrases?: boolean;
  /** Air temperature (°C) for the cold squeak, until Weather (M1.7) provides it. */
  airTemperature?: () => number;
}

export class App {
  readonly fsm = new StateMachine<AppState>('boot', appTransitions);
  readonly settings = new Settings(browserStorage());
  readonly visibility = new Visibility(document, window);
  /** Screenshot status for `npm run shots` (only set in shot mode). */
  shot: ShotStatus | null = null;
  private readonly host: HTMLElement;
  private readonly overlay: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private stage: Stage | null = null;
  private valley: ValleyScene | null = null;
  private sim: Sim | null = null;
  private clockSystem: ClockSystem | null = null;
  private player: PlayerSystem | null = null;
  private input: Input | null = null;
  private rig: CameraRig | null = null;
  private avatar: PlayerAvatar | null = null;
  private actions: ActionState | null = null;
  private loop: GameLoop | null = null;
  private shotFrames = 0;
  private readonly pose: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
  private readonly focus = new Vector3();
  private readonly movement: MovementTuning;
  private readonly rigTuning: CameraRigTuning;
  private readonly gait: GaitTuning;
  private readonly options: AppOptions;
  private audioContext: AudioContext | null = null;
  /** The valley's sound, once unlocked and loaded (none in shot mode). */
  audio: ValleyAudio | null = null;
  private wasGrounded = true;

  constructor(host: HTMLElement, options: AppOptions = {}) {
    this.options = options;
    this.movement = options.movement ?? movementTuning;
    this.rigTuning = options.cameraRig ?? rigTuning;
    this.gait = options.gait ?? gaitTuning;
    this.host = host;
    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';
    this.hint = document.createElement('div');
    this.hint.className = 'hint';
    this.hint.hidden = true;
    this.hint.textContent =
      'Click or drag to look around · WASD to walk · Shift to jog · Space to hop · Wheel to zoom';
    host.append(this.overlay, this.hint);
    this.fsm.onChange(() => this.applyTraits());
    this.visibility.events.on('hidden', () => this.applyTraits());
    this.visibility.events.on('visible', () => this.applyTraits());
    this.settings.onChange((group, key) => {
      if (group === 'gameplay' && key === 'timePassesWhileTalking') this.applyTraits();
      if (group === 'graphics' && QUALITY_KEYS.has(key)) this.applyQuality();
      if (group === 'graphics' && key === 'fpsCap' && this.loop) {
        this.loop.fpsCap = fpsCapOf(this.settings.get('graphics', 'fpsCap'));
      }
      if (group === 'graphics' && key === 'fov' && this.stage) {
        this.stage.camera.fov = this.settings.get('graphics', 'fov');
        this.stage.camera.updateProjectionMatrix();
      }
      if (group === 'controls' && key === 'cameraRecenter') {
        this.rig?.setRecenter(this.settings.get('controls', 'cameraRecenter'));
      }
      if (group === 'audio') this.applyVolumes();
    });
  }

  /** Runs the flow; with a shot, skips the splash and holds the shot's viewpoint. */
  async start(shot?: ShotDef): Promise<void> {
    this.fsm.go('splash');
    if (shot) {
      this.shot = { id: shot.id, ready: false };
    } else {
      await this.splash();
    }
    this.fsm.go('title');
    this.fsm.go('loading');
    this.say('<p class="quiet">Laying the snow…</p>');
    const [{ terrain, sites, ms }, audio] = await Promise.all([generateTerrainInWorker(), this.loadAudio()]);
    console.info(`Valley generated in ${ms.toFixed(0)} ms (${sites.length} trees)`);
    this.audio = audio;
    this.applyVolumes();

    const stage = new Stage(this.host, {
      fogDensity: valleyView.fogDensity,
      far: valleyView.far,
      exposure: valleyView.exposure,
    });
    this.stage = stage;
    stage.camera.fov = this.settings.get('graphics', 'fov');
    stage.camera.updateProjectionMatrix();
    const valley = new ValleyScene(stage, terrain, sites);
    this.valley = valley;
    this.clockSystem = new ClockSystem(clockTuning);
    const spawn = { x: valleyView.spawnX, z: valleyView.spawnZ, yaw: valleyView.spawnYaw };
    this.player = new PlayerSystem(
      valleyMovementWorld(terrain, sites, wrenhollowForests),
      this.movement,
      spawn,
    );
    this.sim = new Sim(valleyView.seed, simTuning.stepHz, [this.clockSystem, this.player]).init();

    if (!shot) {
      this.input = new Input(stage.renderer.domElement);
      const s = this.player.state;
      this.rig = new CameraRig(this.rigTuning, (x, z) => valley.groundAt(x, z), this.movement.capsuleHeight, {
        x: s.x,
        y: s.y,
        z: s.z,
        yaw: s.yaw,
        speed: 0,
      });
      this.rig.setRecenter(this.settings.get('controls', 'cameraRecenter'));
      this.avatar = new PlayerAvatar(valleyView.seed, this.gait, this.movement);
      this.avatar.onFootfall = (side) => this.footfall(side, false);
      stage.scene.add(this.avatar.root);
    }
    this.loop = new GameLoop(
      new FixedStepper(1 / simTuning.stepHz, simTuning.maxStepsPerFrame),
      {
        input: (dt) => this.readInput(dt),
        step: () => this.sim?.step(),
        render: (alpha, dt) => this.render(alpha, dt),
      },
      browserFrameClock,
      appTuning.maxRenderDeltaSeconds,
    );
    this.loop.fpsCap = shot ? null : fpsCapOf(this.settings.get('graphics', 'fpsCap'));
    this.applyQuality();
    // Frame the first view, then compile every shader it needs before play starts.
    if (shot) this.frameShot(shot);
    else this.frameStart();
    const warm = await stage.prewarm();
    console.info(`Shaders pre-warmed in ${warm.toFixed(0)} ms`);
    this.say('');
    this.fsm.go('playing');
    this.loop.start();
  }

  /** Shows a failure where the player can see it. */
  fail(message: string): void {
    this.say(`<p>Something went wrong while loading.</p><p class="quiet">${message}</p>`);
    if (this.shot) this.shot.error = message;
  }

  /** Where the walker stands (for tests, the dev overlay and the Winter Walk lab). */
  playerState(): {
    x: number;
    y: number;
    z: number;
    speed: number;
    surface: number;
    grounded: boolean;
  } | null {
    const s = this.player?.state;
    return s
      ? { x: s.x, y: s.y, z: s.z, speed: Math.hypot(s.vx, s.vz), surface: s.surface, grounded: s.grounded }
      : null;
  }

  /** Stands the walker somewhere else and brings the camera along (dev and lab use). */
  teleport(x: number, z: number, yaw: number): void {
    if (!this.player) return;
    this.player.place(x, z, yaw);
    const s = this.player.state;
    this.rig?.snap({ x: s.x, y: s.y, z: s.z, yaw, speed: 0 });
  }

  /** The camera rig, for live tuning (the Winter Walk lab). */
  get camera(): CameraRig | null {
    return this.rig;
  }

  private wantsAudio(): boolean {
    return !!(this.options.footstepSounds || this.options.valleyPhrases);
  }

  /** Creates the valley's sound once the splash click has unlocked an AudioContext. */
  private async loadAudio(): Promise<ValleyAudio | null> {
    const ctx = this.audioContext;
    if (!ctx) return null;
    try {
      return await ValleyAudio.create(ctx, {
        seed: valleyView.seed,
        walkSpeed: this.movement.walkSpeed,
        footsteps: this.options.footstepSounds ? (this.options.footsteps ?? footstepTuning) : null,
        music: this.options.valleyPhrases ? valleyMusic : null,
        musicFrequency: () => this.settings.get('audio', 'musicFrequency'),
      });
    } catch (e) {
      // The valley works silently if audio can't start.
      console.warn('Audio unavailable:', e);
      return null;
    }
  }

  private applyVolumes(): void {
    const pct = (k: 'master' | 'music' | 'ambience' | 'sfx' | 'voices' | 'ui') =>
      this.settings.get('audio', k) / 100;
    this.audio?.setVolumes({
      master: pct('master'),
      music: pct('music'),
      ambience: pct('ambience'),
      sfx: pct('sfx'),
      voice: pct('voices'),
      ui: pct('ui'),
    });
  }

  /** A heel strike (or both feet landing from a hop): the footstep system resolves the rest. */
  private footfall(side: 0 | 1, land: boolean): void {
    const s = this.player?.state;
    if (!s || !this.audio) return;
    const speed = Math.hypot(s.vx, s.vz);
    const m = this.movement;
    this.audio.footfall({
      surface: s.surface,
      side,
      speed,
      jog: speed > (m.walkSpeed + m.jogSpeed) / 2,
      airC: this.options.airTemperature?.() ?? valleyView.airTemperature,
      land,
    });
  }

  private splash(): Promise<void> {
    this.say('<h1>Hearthwood</h1><p class="quiet">Click anywhere to begin</p>');
    return new Promise((resolve) => {
      const go = () => {
        window.removeEventListener('pointerdown', go);
        window.removeEventListener('keydown', go);
        // Audio may only start from a user gesture: this click.
        if (this.wantsAudio() && !this.audioContext) {
          try {
            this.audioContext = new AudioContext({ latencyHint: 'interactive' });
            void this.audioContext.resume();
          } catch {
            this.audioContext = null;
          }
        }
        resolve();
      };
      window.addEventListener('pointerdown', go);
      window.addEventListener('keydown', go);
    });
  }

  private say(html: string): void {
    this.overlay.innerHTML = html;
    this.overlay.hidden = html === '';
  }

  private applyTraits(): void {
    const state = this.fsm.current;
    this.loop?.setSimRunning(appStateTraits[state].simSteps && !this.visibility.hidden);
    if (this.clockSystem) {
      const talking = this.settings.get('gameplay', 'timePassesWhileTalking');
      this.clockSystem.clock.frozen = !clockRunsIn(state, talking);
    }
  }

  private inputOptions(): InputOptions {
    return {
      mouseSensitivity: this.settings.get('controls', 'mouseSensitivity'),
      invertY: this.settings.get('controls', 'invertY'),
      stickDeadZone: this.settings.get('controls', 'stickDeadZone'),
      jogToggle: this.settings.get('controls', 'jog') === 'toggle',
      mouseRadiansPerPixel: this.rigTuning.mouseRadiansPerPixel,
      stickRadiansPerSecond: this.rigTuning.stickRadiansPerSecond,
      zoomStep: this.rigTuning.zoomStep,
    };
  }

  /** Samples input and turns it into this frame's camera-relative move intent. */
  private readInput(dt: number): void {
    if (!this.input || !this.rig || !this.player) return;
    this.actions = this.input.poll(dt, this.inputOptions());
    this.hint.hidden = this.input.locked;
    const a = this.actions;
    if (appStateTraits[this.fsm.current].input !== 'game') {
      this.player.setIntent(0, 0, false, false);
      return;
    }
    const axes = this.rig.groundAxes();
    const x = axes.fx * a.move.y + axes.rx * a.move.x;
    const z = axes.fz * a.move.y + axes.rz * a.move.x;
    this.player.setIntent(x, z, a.jog, a.pressed.has('jump'));
  }

  /** Applies the graphics settings' quality level; shots hold a fixed render scale. */
  private applyQuality(): void {
    if (!this.stage) return;
    const q = resolveQuality(this.settings.snapshot().graphics);
    if (this.shot) q.dynamic = false;
    this.stage.setQuality(q, fpsCapOf(this.settings.get('graphics', 'fpsCap')));
  }

  /** Places the camera behind the walker and settles LODs, as the first frame will see them. */
  private frameStart(): void {
    if (!this.stage || !this.valley || !this.player || !this.rig) return;
    const s = this.player.state;
    this.rig.update(0, { x: s.x, y: s.y, z: s.z, yaw: s.yaw, speed: 0 }, NO_LOOK, this.stage.camera);
    this.valley.settle(this.stage.camera);
    this.focus.set(s.x, s.y, s.z);
    this.stage.followShadow(this.focus);
  }

  private frameShot(shot: ShotDef): void {
    if (!this.stage || !this.valley) return;
    const cam = this.stage.camera;
    const [ex, ez, eh] = shot.eye;
    const [tx, tz, th] = shot.target;
    cam.position.set(ex, this.valley.groundAt(ex, ez) + eh, ez);
    cam.lookAt(tx, this.valley.groundAt(tx, tz) + th, tz);
    this.valley.settle(cam);
    this.focus.set(ex, this.valley.groundAt(ex, ez), ez);
    this.stage.followShadow(this.focus);
  }

  private render(alpha: number, dt: number): void {
    if (!this.stage || !this.valley) return;
    const cam = this.stage.camera;
    if (this.player && this.rig && this.avatar) {
      const p = this.player.pose(alpha, this.pose);
      const s = this.player.state;
      const speed = Math.hypot(s.vx, s.vz);
      if (s.grounded && !this.wasGrounded) this.footfall(0, true);
      this.wasGrounded = s.grounded;
      this.avatar.update(p.x, p.y, p.z, p.yaw, speed, s.grounded, dt);
      this.rig.update(dt, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, speed }, this.actions ?? NO_LOOK, cam);
      this.actions = null;
      this.focus.set(p.x, p.y, p.z);
    }
    if (this.fsm.current === 'playing') this.audio?.update(dt);
    this.valley.update(cam, dt);
    this.stage.followShadow(this.focus);
    this.stage.renderFrame(dt);
    if (this.shot && !this.shot.ready && ++this.shotFrames >= SHOT_SETTLE_FRAMES) {
      this.shot.passes = this.stage.measurePasses();
      this.shot.ready = true;
    }
  }
}
