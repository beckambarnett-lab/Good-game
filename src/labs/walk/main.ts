// Review Lab #3: Winter walk. The real valley and the game's own App (walking, camera, footsteps),
// with live sliders on copies of the movement, gait, camera and footstep tuning, a cold-snap
// switch for the squeak, and the valley's felt-piano phrases. Approved values are frozen into
// src/data/tuning.ts (Plan Part 8.0).

import { App } from '../../app/App.ts';
import { cameraRig, footsteps, gait, type MovementTuning, movement, valleyView } from '../../data/tuning.ts';
import { places } from '../../data/world/places.ts';
import { SURFACE, type SurfaceKind } from '../../data/world/terrain.ts';
import type { MusicFrequency } from '../../view/audio/ValleyMusic.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Air temperature for the cold-snap switch: well below the −15 °C squeak threshold. */
const COLD_SNAP = -18;
/** The lab plays phrases often so a review hears several; the game defaults to Sometimes. */
const LAB_MUSIC_FREQUENCY: MusicFrequency = 'often';

const move: MovementTuning = structuredClone(movement);
const rig = structuredClone(cameraRig);
const walk = structuredClone(gait);
const steps = structuredClone(footsteps);
let cold = false;

const app = new App($('app'), {
  movement: move,
  cameraRig: rig,
  gait: walk,
  footsteps: steps,
  footstepSounds: true,
  valleyPhrases: true,
  airTemperature: () => (cold ? COLD_SNAP : valleyView.airTemperature),
});
app.settings.set('audio', 'musicFrequency', LAB_MUSIC_FREQUENCY);

// ---- Places ------------------------------------------------------------------------------
for (const p of places) {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `${p.label} <small>${p.note}</small>`;
  b.addEventListener('click', () => {
    app.teleport(p.x, p.z, p.yaw);
    b.blur();
  });
  $('places').append(b);
}

// ---- Tuning panel ------------------------------------------------------------------------
interface SliderSpec {
  id: string;
  group: 'walking' | 'camera' | 'sound';
  label: string;
  min: number;
  max: number;
  step: number;
  get: () => number;
  set: (v: number) => void;
  show: (v: number) => string;
}

const perMinute = (speed: number, step: number) => Math.round((speed / step) * 60);
const pct = (v: number) => `${Math.round(v * 100)}%`;

const sliders: SliderSpec[] = [
  {
    id: 'walk-speed',
    group: 'walking',
    label: 'Walking speed',
    min: 2,
    max: 5,
    step: 0.1,
    get: () => move.walkSpeed,
    set: (v) => {
      move.walkSpeed = v;
    },
    show: (v) => `${v.toFixed(1)} m/s`,
  },
  {
    id: 'jog-speed',
    group: 'walking',
    label: 'Jogging speed',
    min: 3.5,
    max: 8,
    step: 0.1,
    get: () => move.jogSpeed,
    set: (v) => {
      move.jogSpeed = v;
    },
    show: (v) => `${v.toFixed(1)} m/s`,
  },
  {
    id: 'accel',
    group: 'walking',
    label: 'Time to get going',
    min: 0.05,
    max: 0.6,
    step: 0.01,
    get: () => move.accelTime,
    set: (v) => {
      move.accelTime = v;
    },
    show: (v) => `${v.toFixed(2)} s`,
  },
  {
    id: 'stop',
    group: 'walking',
    label: 'Time to stop',
    min: 0.05,
    max: 0.6,
    step: 0.01,
    get: () => move.stopTime,
    set: (v) => {
      move.stopTime = v;
    },
    show: (v) => `${v.toFixed(2)} s`,
  },
  {
    id: 'turn',
    group: 'walking',
    label: 'Turn speed',
    min: 180,
    max: 1080,
    step: 10,
    get: () => move.turnRate,
    set: (v) => {
      move.turnRate = v;
    },
    show: (v) => `${v}°/s`,
  },
  {
    id: 'walk-step',
    group: 'walking',
    label: 'Step length, walking',
    min: 0.8,
    max: 2.2,
    step: 0.05,
    get: () => walk.walkStep,
    set: (v) => {
      walk.walkStep = v;
    },
    show: (v) => `${v.toFixed(2)} m · ${perMinute(move.walkSpeed, v)}/min`,
  },
  {
    id: 'jog-step',
    group: 'walking',
    label: 'Step length, jogging',
    min: 1,
    max: 2.8,
    step: 0.05,
    get: () => walk.jogStep,
    set: (v) => {
      walk.jogStep = v;
    },
    show: (v) => `${v.toFixed(2)} m · ${perMinute(move.jogSpeed, v)}/min`,
  },
  {
    id: 'ice-grip',
    group: 'walking',
    label: 'Grip on ice',
    min: 0.1,
    max: 1,
    step: 0.05,
    get: () => move.iceGrip,
    set: (v) => {
      move.iceGrip = v;
    },
    show: pct,
  },
  {
    id: 'hop',
    group: 'walking',
    label: 'Hop height',
    min: 0.2,
    max: 1,
    step: 0.05,
    get: () => move.hopHeight,
    set: (v) => {
      move.hopHeight = v;
    },
    show: (v) => `${v.toFixed(2)} m`,
  },
  {
    id: 'distance',
    group: 'camera',
    label: 'Distance',
    min: rig.minDistance,
    max: rig.maxDistance,
    step: 0.1,
    get: () => rig.distance,
    set: (v) => {
      rig.distance = v;
      app.camera?.setDistance(v);
    },
    show: (v) => `${v.toFixed(1)} m`,
  },
  {
    id: 'follow',
    group: 'camera',
    label: 'Follow tightness',
    min: 2,
    max: 20,
    step: 0.5,
    get: () => rig.followOmega,
    set: (v) => {
      rig.followOmega = v;
    },
    show: (v) => v.toFixed(1),
  },
  {
    id: 'recenter-delay',
    group: 'camera',
    label: 'Swing back after',
    min: 0.5,
    max: 6,
    step: 0.1,
    get: () => rig.recenterDelay,
    set: (v) => {
      rig.recenterDelay = v;
    },
    show: (v) => `${v.toFixed(1)} s`,
  },
  {
    id: 'recenter-rate',
    group: 'camera',
    label: 'Swing-back speed',
    min: 10,
    max: 180,
    step: 5,
    get: () => rig.recenterRate,
    set: (v) => {
      rig.recenterRate = v;
    },
    show: (v) => `${v}°/s`,
  },
  {
    id: 'fov',
    group: 'camera',
    label: 'Field of view',
    min: 45,
    max: 75,
    step: 1,
    get: () => app.settings.get('graphics', 'fov'),
    set: (v) => {
      app.settings.set('graphics', 'fov', v);
    },
    show: (v) => `${v}°`,
  },
  {
    id: 'look',
    group: 'camera',
    label: 'Look sensitivity',
    min: 0.1,
    max: 3,
    step: 0.05,
    get: () => app.settings.get('controls', 'mouseSensitivity'),
    set: (v) => {
      app.settings.set('controls', 'mouseSensitivity', v);
    },
    show: (v) => `${v.toFixed(2)}×`,
  },
  {
    id: 'steps-level',
    group: 'sound',
    label: 'Footsteps',
    min: 0,
    max: footsteps.level * 2,
    step: 0.01,
    get: () => steps.level,
    set: (v) => {
      steps.level = v;
    },
    show: (v) => pct(v / footsteps.level),
  },
  {
    id: 'rustle',
    group: 'sound',
    label: 'Coat rustle',
    min: -30,
    max: -3,
    step: 1,
    get: () => steps.rustleDb,
    set: (v) => {
      steps.rustleDb = v;
    },
    show: (v) => `${v} dB`,
  },
  {
    id: 'music-volume',
    group: 'sound',
    label: 'Music volume',
    min: 0,
    max: 100,
    step: 1,
    get: () => app.settings.get('audio', 'music'),
    set: (v) => {
      app.settings.set('audio', 'music', v);
    },
    show: (v) => `${v}%`,
  },
];

const inputs = new Map<string, HTMLInputElement>();
const outputs = new Map<string, HTMLOutputElement>();
for (const s of sliders) {
  const label = document.createElement('label');
  label.className = 'slider';
  label.innerHTML = `<div><span>${s.label}</span><output id="${s.id}-out"></output></div>`;
  const input = document.createElement('input');
  Object.assign(input, {
    type: 'range',
    id: s.id,
    min: String(s.min),
    max: String(s.max),
    step: String(s.step),
  });
  label.append(input);
  $(s.group).append(label);
  inputs.set(s.id, input);
  outputs.set(s.id, label.querySelector('output') as HTMLOutputElement);
  input.addEventListener('input', () => {
    s.set(Number(input.value));
    render();
  });
}

function check(group: string, id: string, text: string, get: () => boolean, set: (on: boolean) => void) {
  const label = document.createElement('label');
  label.className = 'check';
  label.htmlFor = id;
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.id = id;
  box.checked = get();
  box.addEventListener('change', () => {
    set(box.checked);
    render();
  });
  label.append(box, text);
  $(group).append(label);
  return box;
}

const recenterBox = check(
  'camera',
  'recenter',
  'Swing the camera back behind me',
  () => app.settings.get('controls', 'cameraRecenter'),
  (on) => app.settings.set('controls', 'cameraRecenter', on),
);
const jogBox = check(
  'walking',
  'jog-toggle',
  'Shift toggles jogging (instead of holding)',
  () => app.settings.get('controls', 'jog') === 'toggle',
  (on) => app.settings.set('controls', 'jog', on ? 'toggle' : 'hold'),
);
const coldBox = check(
  'sound',
  'cold',
  `Cold snap (${COLD_SNAP} °C): packed snow squeaks`,
  () => cold,
  (on) => {
    cold = on;
  },
);

// Music: how often, and a phrase on demand.
{
  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('label');
  label.htmlFor = 'music-frequency';
  label.textContent = 'Piano phrases';
  const select = document.createElement('select');
  select.id = 'music-frequency';
  for (const [value, text] of [
    ['often', 'Often (20–60 s rests)'],
    ['sometimes', 'Sometimes (45–150 s)'],
    ['rarely', 'Rarely (2–5 min)'],
    ['off', 'Off'],
  ] as const) {
    select.add(new Option(text, value));
  }
  select.value = app.settings.get('audio', 'musicFrequency');
  select.addEventListener('change', () => {
    app.settings.set('audio', 'musicFrequency', select.value as MusicFrequency);
    render();
  });
  const play = document.createElement('button');
  play.type = 'button';
  play.id = 'play-phrase';
  play.textContent = 'Play a phrase now';
  play.addEventListener('click', () => app.audio?.music?.playNow());
  row.append(label, select, play);
  $('sound').append(row);
}

function render(): void {
  for (const s of sliders) {
    const input = inputs.get(s.id);
    const out = outputs.get(s.id);
    if (!input || !out) continue;
    if (document.activeElement !== input) input.value = String(s.get());
    out.textContent = s.show(s.get());
  }
  const onOff = (b: boolean) => (b ? 'on' : 'off');
  $('settings').textContent = [
    'Lab: Winter walk',
    `Walk ${move.walkSpeed.toFixed(1)} m/s · jog ${move.jogSpeed.toFixed(1)} m/s · get going ${move.accelTime.toFixed(2)} s · stop ${move.stopTime.toFixed(2)} s · turn ${move.turnRate}°/s`,
    `Steps: walking ${walk.walkStep.toFixed(2)} m (${perMinute(move.walkSpeed, walk.walkStep)}/min) · jogging ${walk.jogStep.toFixed(2)} m (${perMinute(move.jogSpeed, walk.jogStep)}/min)`,
    `Ice grip ${pct(move.iceGrip)} · hop ${move.hopHeight.toFixed(2)} m · jog ${app.settings.get('controls', 'jog')}`,
    `Camera: ${rig.distance.toFixed(1)} m · follow ${rig.followOmega.toFixed(1)} · swing back after ${rig.recenterDelay.toFixed(1)} s at ${rig.recenterRate}°/s (${onOff(app.settings.get('controls', 'cameraRecenter'))}) · FOV ${app.settings.get('graphics', 'fov')}° · look ${app.settings.get('controls', 'mouseSensitivity').toFixed(2)}×`,
    `Sound: footsteps ${pct(steps.level / footsteps.level)} · rustle ${steps.rustleDb} dB · music ${app.settings.get('audio', 'music')}% (${app.settings.get('audio', 'musicFrequency')}) · cold snap ${onOff(cold)}`,
  ].join('\n');
}

$<HTMLButtonElement>('copy').addEventListener('click', async () => {
  const status = $('copy-status');
  try {
    await navigator.clipboard.writeText($('settings').textContent ?? '');
    status.textContent = 'Copied. Paste it in our chat with any notes.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('settings'));
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
    status.textContent = 'Selected. Copy it with Ctrl/Cmd+C.';
  }
});

$<HTMLButtonElement>('reset').addEventListener('click', () => {
  Object.assign(move, structuredClone(movement));
  Object.assign(rig, structuredClone(cameraRig));
  Object.assign(walk, structuredClone(gait));
  Object.assign(steps, structuredClone(footsteps));
  cold = false;
  app.camera?.setDistance(rig.distance);
  app.settings.reset('controls');
  app.settings.set('graphics', 'fov', 55);
  app.settings.set('audio', 'music', 100);
  app.settings.set('audio', 'musicFrequency', LAB_MUSIC_FREQUENCY);
  $<HTMLSelectElement>('music-frequency').value = LAB_MUSIC_FREQUENCY;
  recenterBox.checked = app.settings.get('controls', 'cameraRecenter');
  jogBox.checked = app.settings.get('controls', 'jog') === 'toggle';
  coldBox.checked = false;
  render();
});

// ---- Readout -----------------------------------------------------------------------------
const surfaceNames: Record<SurfaceKind, string> = {
  snow: 'Fresh powder',
  road: 'Packed snow · road',
  rail: 'Packed snow · rail bed',
  lakeIce: 'Lake ice',
  creekIce: 'Creek ice',
};
const kindOf = new Map((Object.entries(SURFACE) as [SurfaceKind, number][]).map(([k, c]) => [c, k]));

function readout(): void {
  const s = app.playerState();
  if (s) {
    const kind = kindOf.get(s.surface) ?? 'snow';
    const squeak = cold && (kind === 'road' || kind === 'rail') ? ' · squeaks' : '';
    $('surface').textContent = `${surfaceNames[kind]}${squeak}`;
    const jogMix = Math.min(1, Math.max(0, (s.speed - move.walkSpeed) / (move.jogSpeed - move.walkSpeed)));
    const step = walk.walkStep + (walk.jogStep - walk.walkStep) * jogMix;
    $('pace').textContent =
      s.speed < walk.minStepSpeed
        ? 'Standing'
        : `${s.speed.toFixed(1)} m/s · ${perMinute(s.speed, step)} steps/min${s.grounded ? '' : ' · airborne'}`;
  }
  const audio = app.audio;
  const music = audio?.music;
  $('music').textContent = !audio
    ? s
      ? 'Sound is off (the browser did not start audio)'
      : '–'
    : !music
      ? 'Piano: tuning up…'
      : music.playing
        ? 'Piano phrase playing'
        : app.settings.get('audio', 'musicFrequency') === 'off'
          ? 'Piano phrases off'
          : `Next piano phrase in ${Math.ceil(music.restLeft)} s`;
  requestAnimationFrame(readout);
}

// ---- Start -------------------------------------------------------------------------------
// A clicked button gives focus back, so Space hops instead of pressing it again.
document.addEventListener('click', (e) => {
  if (e.target instanceof HTMLElement && e.target.closest('button'))
    (document.activeElement as HTMLElement)?.blur();
});
render();
app.fsm.onChange(() => {
  if (app.fsm.current !== 'splash') $('start').hidden = true;
});
$<HTMLButtonElement>('begin').addEventListener('click', () => {
  // The App's splash takes this same click as its user gesture and unlocks audio.
  $('start').hidden = true;
});
app.start().catch((e: unknown) => app.fail(e instanceof Error ? e.message : String(e)));
requestAnimationFrame(readout);

// Debug hook for the automated lab check (not a player-facing API).
(window as unknown as { __walk: unknown }).__walk = {
  app,
  move,
  walk,
  steps,
  counts: () => Object.fromEntries(app.audio?.footsteps?.counts ?? []),
  musicReady: () => !!app.audio?.music,
  musicPlaying: () => app.audio?.music?.playing ?? false,
};
