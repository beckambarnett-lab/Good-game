// The app (Plan Part 7.3): the flow state machine, frame loop, settings and page visibility, wired
// to the sim and the view. M0 flow: Boot → Splash (a click, which will unlock audio) → Title →
// Loading → Playing. The title screen and new-game UI arrive in M1, so Title passes straight on.

import { Vector3 } from 'three';
import { FixedStepper } from '../core/fixedStep.ts';
import { StateMachine } from '../core/StateMachine.ts';
import type { ShotDef } from '../data/shots.ts';
import {
  app as appTuning,
  clock as clockTuning,
  movement,
  cameraRig as rigTuning,
  sim as simTuning,
  valleyView,
} from '../data/tuning.ts';
import { wrenhollowForests } from '../data/world/forests.ts';
import { ClockSystem } from '../sim/clock/ClockSystem.ts';
import { PlayerSystem, type Pose } from '../sim/player/PlayerSystem.ts';
import { Sim } from '../sim/Sim.ts';
import { valleyMovementWorld } from '../sim/world/MovementWorld.ts';
import { PlayerAvatar } from '../view/actors/PlayerAvatar.ts';
import { CameraRig } from '../view/camera/CameraRig.ts';
import { generateTerrainInWorker } from '../view/geo/terrain/TerrainClient.ts';
import { Input } from '../view/input/Input.ts';
import type { ActionState, InputOptions } from '../view/input/InputMapper.ts';
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

  constructor(host: HTMLElement) {
    this.host = host;
    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';
    this.hint = document.createElement('div');
    this.hint.className = 'hint';
    this.hint.hidden = true;
    this.hint.textContent =
      'Click to look around · WASD to walk · Shift to jog · Space to hop · Wheel to zoom';
    host.append(this.overlay, this.hint);
    this.fsm.onChange(() => this.applyTraits());
    this.visibility.events.on('hidden', () => this.applyTraits());
    this.visibility.events.on('visible', () => this.applyTraits());
    this.settings.onChange((group, key) => {
      if (group === 'gameplay' && key === 'timePassesWhileTalking') this.applyTraits();
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
    const { terrain, sites, ms } = await generateTerrainInWorker();
    console.info(`Valley generated in ${ms.toFixed(0)} ms (${sites.length} trees)`);

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
    this.player = new PlayerSystem(valleyMovementWorld(terrain, sites, wrenhollowForests), movement, spawn);
    this.sim = new Sim(valleyView.seed, simTuning.stepHz, [this.clockSystem, this.player]).init();

    if (!shot) {
      this.input = new Input(stage.renderer.domElement);
      const s = this.player.state;
      this.rig = new CameraRig(rigTuning, (x, z) => valley.groundAt(x, z), movement.capsuleHeight, {
        x: s.x,
        y: s.y,
        z: s.z,
        yaw: s.yaw,
        speed: 0,
      });
      this.rig.setRecenter(this.settings.get('controls', 'cameraRecenter'));
      this.avatar = new PlayerAvatar(valleyView.seed);
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
    if (shot) this.frameShot(shot);
    this.say('');
    this.fsm.go('playing');
    this.loop.start();
  }

  /** Shows a failure where the player can see it. */
  fail(message: string): void {
    this.say(`<p>Something went wrong while loading.</p><p class="quiet">${message}</p>`);
    if (this.shot) this.shot.error = message;
  }

  /** Where the walker stands (for tests and the dev overlay). */
  playerState(): { x: number; y: number; z: number; speed: number } | null {
    const s = this.player?.state;
    return s ? { x: s.x, y: s.y, z: s.z, speed: Math.hypot(s.vx, s.vz) } : null;
  }

  private splash(): Promise<void> {
    this.say('<h1>Hearthwood</h1><p class="quiet">Click anywhere to begin</p>');
    return new Promise((resolve) => {
      const go = () => {
        window.removeEventListener('pointerdown', go);
        window.removeEventListener('keydown', go);
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
      mouseRadiansPerPixel: rigTuning.mouseRadiansPerPixel,
      stickRadiansPerSecond: rigTuning.stickRadiansPerSecond,
      zoomStep: rigTuning.zoomStep,
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

  private frameShot(shot: ShotDef): void {
    if (!this.stage || !this.valley) return;
    const cam = this.stage.camera;
    const [ex, ez, eh] = shot.eye;
    const [tx, tz, th] = shot.target;
    cam.position.set(ex, this.valley.groundAt(ex, ez) + eh, ez);
    cam.lookAt(tx, this.valley.groundAt(tx, tz) + th, tz);
    this.valley.settle(cam);
    this.focus.set(ex, this.valley.groundAt(ex, ez), ez);
  }

  private render(alpha: number, dt: number): void {
    if (!this.stage || !this.valley) return;
    const cam = this.stage.camera;
    if (this.player && this.rig && this.avatar) {
      const p = this.player.pose(alpha, this.pose);
      const s = this.player.state;
      const speed = Math.hypot(s.vx, s.vz);
      this.avatar.update(p.x, p.y, p.z, p.yaw, speed, dt);
      this.rig.update(dt, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, speed }, this.actions ?? NO_LOOK, cam);
      this.actions = null;
      this.focus.set(p.x, p.y, p.z);
    }
    this.valley.update(cam, dt);
    this.stage.followShadow(this.focus);
    this.stage.renderFrame(dt);
    if (this.shot && !this.shot.ready && ++this.shotFrames >= SHOT_SETTLE_FRAMES) {
      this.shot.passes = this.stage.measurePasses();
      this.shot.ready = true;
    }
  }
}
