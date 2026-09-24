// The app (Plan Part 7.3): the flow state machine, frame loop, settings and page visibility, wired
// to the sim and the view. M0 flow: Boot → Splash (a click, which will unlock audio) → Title →
// Loading → Playing. The title screen and new-game UI arrive in M1, so Title passes straight on.

import { Vector3 } from 'three';
import { FixedStepper } from '../core/fixedStep.ts';
import { StateMachine } from '../core/StateMachine.ts';
import type { ShotDef } from '../data/shots.ts';
import { app as appTuning, clock as clockTuning, sim as simTuning, valleyView } from '../data/tuning.ts';
import { ClockSystem } from '../sim/clock/ClockSystem.ts';
import { Sim } from '../sim/Sim.ts';
import { generateTerrainInWorker } from '../view/geo/terrain/TerrainClient.ts';
import { type PassStats, Stage } from '../view/render/Stage.ts';
import { ValleyScene } from '../view/scenes/ValleyScene.ts';
import { browserFrameClock, GameLoop } from './GameLoop.ts';
import { browserStorage, Settings } from './Settings.ts';
import { type AppState, appStateTraits, appTransitions, clockRunsIn } from './states.ts';
import { Visibility } from './Visibility.ts';

/** Frames rendered at a shot's viewpoint before it is measured and declared ready. */
const SHOT_SETTLE_FRAMES = 4;
/** Where the idle camera circles, and what the shadow box follows until the player exists. */
const CABIN = { x: -175, z: -25 };

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
  private stage: Stage | null = null;
  private valley: ValleyScene | null = null;
  private sim: Sim | null = null;
  private clockSystem: ClockSystem | null = null;
  private loop: GameLoop | null = null;
  private shotDef: ShotDef | null = null;
  private shotFrames = 0;
  private orbitAngle = 0;
  private readonly focus = new Vector3();

  constructor(host: HTMLElement) {
    this.host = host;
    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';
    host.appendChild(this.overlay);
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
    });
  }

  /** Runs the flow; with a shot, skips the splash and holds the shot's viewpoint. */
  async start(shot?: ShotDef): Promise<void> {
    this.fsm.go('splash');
    if (shot) {
      this.shotDef = shot;
      this.shot = { id: shot.id, ready: false };
    } else {
      await this.splash();
    }
    this.fsm.go('title');
    this.fsm.go('loading');
    this.say('<p class="quiet">Laying the snow…</p>');
    const { terrain, sites, ms } = await generateTerrainInWorker();
    console.info(`Valley generated in ${ms.toFixed(0)} ms (${sites.length} trees)`);

    this.stage = new Stage(this.host, {
      fogDensity: valleyView.fogDensity,
      far: valleyView.far,
      exposure: valleyView.exposure,
    });
    this.stage.camera.fov = this.settings.get('graphics', 'fov');
    this.stage.camera.updateProjectionMatrix();
    this.valley = new ValleyScene(this.stage, terrain, sites);
    this.clockSystem = new ClockSystem(clockTuning);
    this.sim = new Sim(valleyView.seed, simTuning.stepHz, [this.clockSystem]).init();
    this.loop = new GameLoop(
      new FixedStepper(1 / simTuning.stepHz, simTuning.maxStepsPerFrame),
      { step: () => this.sim?.step(), render: (_alpha, dt) => this.render(dt) },
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

  private render(dt: number): void {
    if (!this.stage || !this.valley) return;
    const cam = this.stage.camera;
    if (!this.shotDef) {
      // Idle orbit around the cabin until the CameraRig and the player arrive (M0 task 6).
      this.orbitAngle += valleyView.orbitSpeed * dt;
      const x = CABIN.x + Math.cos(this.orbitAngle) * valleyView.orbitRadius;
      const z = CABIN.z + Math.sin(this.orbitAngle) * valleyView.orbitRadius;
      cam.position.set(x, this.valley.groundAt(x, z) + valleyView.orbitHeight, z);
      this.focus.set(CABIN.x, this.valley.groundAt(CABIN.x, CABIN.z), CABIN.z);
      cam.lookAt(this.focus);
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
