// Review Lab #4: Valley look. The real valley and the game's own App in two looks: today's (the
// neutral `look` the game draws) and the art plan's proposal (Plan Parts 5.2, 5.9 and 5.10), with
// live sliders on a copy of the proposal, fixed QA views to compare from, and walking from any
// view. Approved values replace `look` in src/data/tuning.ts (Plan Part 8.0).

import { App } from '../../app/App.ts';
import { keyboardBindings } from '../../data/bindings.ts';
import { type ShotDef, shots } from '../../data/shots.ts';
import { type LookTuning, look, proposedLook } from '../../data/tuning.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** The lab's views: QA shots under plain names, the one with cast shadows first. */
const VIEWS: readonly { shot: string; label: string; note: string }[] = [
  { shot: 'S02', label: 'Woodlot', note: 'shadows' },
  { shot: 'S01', label: 'Cabin porch', note: 'open snow' },
  { shot: 'S04', label: 'Main Street bend', note: 'distance' },
  { shot: 'S08', label: 'Lookout', note: 'forest, haze' },
];
/** Lifted shadows lean blue: the lift's red and green as fractions of its blue. */
const LIFT_HUE = [0.2, 0.4, 1] as const;
/** Holding this key shows the other look. */
const FLIP_KEY = 'KeyC';
const MOVE_KEYS = new Set([
  ...keyboardBindings.moveForward,
  ...keyboardBindings.moveBack,
  ...keyboardBindings.moveLeft,
  ...keyboardBindings.moveRight,
]);

const today: LookTuning = structuredClone(look);
const tuned: LookTuning = structuredClone(proposedLook);
/** What the App draws, read every frame: a copy of whichever look is on screen. */
const drawn: LookTuning = structuredClone(proposedLook);
let showing: 'tuned' | 'today' = 'tuned';
let flipped = false;
let view: ShotDef | null = null;

const app = new App($('app'), { look: drawn });

const shotOf = (id: string): ShotDef => {
  const s = shots.find((x) => x.id === id);
  if (!s) throw new Error(`No QA shot ${id}`);
  return s;
};
const onScreen = (): 'tuned' | 'today' => (flipped ? (showing === 'tuned' ? 'today' : 'tuned') : showing);

function applyLook(): void {
  Object.assign(drawn, structuredClone(onScreen() === 'tuned' ? tuned : today));
  $('show-tuned').setAttribute('aria-pressed', String(showing === 'tuned'));
  $('show-m0').setAttribute('aria-pressed', String(showing === 'today'));
  readout();
}

// ---- Which look ----------------------------------------------------------------------------
$('show-tuned').addEventListener('click', () => {
  showing = 'tuned';
  applyLook();
});
$('show-m0').addEventListener('click', () => {
  showing = 'today';
  applyLook();
});
window.addEventListener('keydown', (e) => {
  if (e.code === FLIP_KEY && !e.repeat) {
    flipped = true;
    applyLook();
  }
  // Moving from a fixed view walks on from that spot.
  const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
  if (view && MOVE_KEYS.has(e.code) && !(typing && e.code.startsWith('Arrow'))) walkFromHere();
});
window.addEventListener('keyup', (e) => {
  if (e.code === FLIP_KEY) {
    flipped = false;
    applyLook();
  }
});
window.addEventListener('blur', () => {
  if (!flipped) return;
  flipped = false;
  applyLook();
});

// ---- Views -----------------------------------------------------------------------------------
const viewButtons = new Map<string, HTMLButtonElement>();
for (const v of VIEWS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.shot = v.shot;
  b.innerHTML = `${v.label} <small>${v.note}</small>`;
  b.addEventListener('click', () => hold(shotOf(v.shot)));
  $('views').append(b);
  viewButtons.set(v.shot, b);
}
const walkButton = document.createElement('button');
walkButton.type = 'button';
walkButton.id = 'walk';
walkButton.textContent = 'Walk from here';
walkButton.addEventListener('click', () => walkFromHere());
$('views').append(walkButton);

function hold(shot: ShotDef | null): void {
  view = shot;
  app.holdView(shot);
  document.body.classList.toggle('held', !!shot);
  for (const [id, b] of viewButtons) b.setAttribute('aria-pressed', String(shot?.id === id));
  walkButton.disabled = !shot;
  readout();
}

/** Stands the walker at the held view's eye, facing its way, and follows it from there. */
function walkFromHere(): void {
  if (!view) return;
  const [ex, ez] = view.eye;
  const [tx, tz] = view.target;
  app.teleport(ex, ez, Math.atan2(tx - ex, tz - ez));
  hold(null);
}

function readout(): void {
  if (app.fsm.current !== 'playing') return;
  $('showing').textContent =
    onScreen() === 'tuned' ? 'Proposed look' : 'Today’s look (what the game draws now)';
  const label = VIEWS.find((v) => v.shot === view?.id)?.label;
  $('where').textContent = label
    ? `${label} · fixed view · WASD walks from here`
    : 'Walking · pick a view to hold the camera still';
}

// ---- Tuning panel ----------------------------------------------------------------------------
interface SliderSpec {
  id: string;
  group: 'light' | 'shade' | 'fog' | 'colour';
  label: string;
  min: number;
  max: number;
  step: number;
  get: () => number;
  set: (v: number) => void;
  show: (v: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const fixed = (digits: number) => (v: number) => v.toFixed(digits);
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`;

const sliders: SliderSpec[] = [
  {
    id: 'sun',
    group: 'light',
    label: 'Sun',
    min: 0.5,
    max: 1.8,
    step: 0.05,
    get: () => tuned.sunStrength,
    set: (v) => {
      tuned.sunStrength = v;
    },
    show: pct,
  },
  {
    id: 'sky',
    group: 'light',
    label: 'Sky light (fills the shade)',
    min: 0.5,
    max: 1.6,
    step: 0.05,
    get: () => tuned.skyStrength,
    set: (v) => {
      tuned.skyStrength = v;
    },
    show: pct,
  },
  {
    id: 'wrap-snow',
    group: 'shade',
    label: 'Soft light on snow',
    min: 0,
    max: 0.6,
    step: 0.05,
    get: () => tuned.wrapSnow,
    set: (v) => {
      tuned.wrapSnow = v;
    },
    show: fixed(2),
  },
  {
    id: 'wrap-objects',
    group: 'shade',
    label: 'Soft light on trees',
    min: 0,
    max: 0.6,
    step: 0.05,
    get: () => tuned.wrapObjects,
    set: (v) => {
      tuned.wrapObjects = v;
    },
    show: fixed(2),
  },
  {
    id: 'shade-blue',
    group: 'shade',
    label: 'Blue in the shade',
    min: 0,
    max: 1,
    step: 0.05,
    get: () => tuned.shadowTintStrength,
    set: (v) => {
      tuned.shadowTintStrength = v;
    },
    show: pct,
  },
  {
    id: 'base',
    group: 'shade',
    label: 'Trees darker at the base',
    min: 0,
    max: 0.3,
    step: 0.01,
    get: () => tuned.heightDarken,
    set: (v) => {
      tuned.heightDarken = v;
    },
    show: pct,
  },
  {
    id: 'fog',
    group: 'fog',
    label: 'Fog thickness',
    min: 0.25,
    max: 3,
    step: 0.05,
    get: () => tuned.fogThickness,
    set: (v) => {
      tuned.fogThickness = v;
    },
    show: (v) => `×${v.toFixed(2)}`,
  },
  {
    id: 'fog-low',
    group: 'fog',
    label: 'Fog hugs the valley floor',
    min: 0,
    max: 1,
    step: 0.05,
    get: () => tuned.fogHeightMix,
    set: (v) => {
      tuned.fogHeightMix = v;
    },
    show: pct,
  },
  {
    id: 'fog-height',
    group: 'fog',
    label: 'Low haze depth',
    min: 10,
    max: 150,
    step: 5,
    get: () => tuned.fogFalloff,
    set: (v) => {
      tuned.fogFalloff = v;
    },
    show: (v) => `${v} m`,
  },
  {
    id: 'warmth',
    group: 'colour',
    label: 'Warmth',
    min: -1,
    max: 1,
    step: 0.05,
    get: () => tuned.temperature,
    set: (v) => {
      tuned.temperature = v;
    },
    show: signed,
  },
  {
    id: 'saturation',
    group: 'colour',
    label: 'Colour strength',
    min: 0.6,
    max: 1.4,
    step: 0.01,
    get: () => tuned.saturation,
    set: (v) => {
      tuned.saturation = v;
    },
    show: pct,
  },
  {
    id: 'contrast',
    group: 'colour',
    label: 'Contrast',
    min: 0.8,
    max: 1.3,
    step: 0.01,
    get: () => tuned.contrast,
    set: (v) => {
      tuned.contrast = v;
    },
    show: fixed(2),
  },
  {
    id: 'lift',
    group: 'colour',
    label: 'Lifted, bluer darks',
    min: 0,
    max: 0.06,
    step: 0.002,
    get: () => tuned.lift[2],
    set: (v) => {
      tuned.lift = [LIFT_HUE[0] * v, LIFT_HUE[1] * v, LIFT_HUE[2] * v];
    },
    show: fixed(3),
  },
  {
    id: 'split',
    group: 'colour',
    label: 'Cool shade, warm light',
    min: 0,
    max: 1,
    step: 0.05,
    get: () => tuned.splitAmount,
    set: (v) => {
      tuned.splitAmount = v;
    },
    show: pct,
  },
  {
    id: 'grain',
    group: 'colour',
    label: 'Film grain',
    min: 0,
    max: 0.06,
    step: 0.005,
    get: () => tuned.grain,
    set: (v) => {
      tuned.grain = v;
    },
    show: fixed(3),
  },
  {
    id: 'vignette',
    group: 'colour',
    label: 'Vignette',
    min: 0,
    max: 0.6,
    step: 0.01,
    get: () => tuned.vignette,
    set: (v) => {
      tuned.vignette = v;
    },
    show: fixed(2),
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
    // Tuning always shows what it tunes.
    showing = 'tuned';
    applyLook();
    render();
  });
}

function render(): void {
  for (const s of sliders) {
    const input = inputs.get(s.id);
    const out = outputs.get(s.id);
    if (!input || !out) continue;
    if (document.activeElement !== input) input.value = String(s.get());
    out.textContent = s.show(s.get());
  }
  const t = tuned;
  $('settings').textContent = [
    'Lab: Valley look',
    `Light: sun ${pct(t.sunStrength)} · sky ${pct(t.skyStrength)}`,
    `Shade: soft light on snow ${t.wrapSnow.toFixed(2)} · on trees ${t.wrapObjects.toFixed(2)} · blue in the shade ${pct(t.shadowTintStrength)} · darker base ${pct(t.heightDarken)}`,
    `Fog: thickness ×${t.fogThickness.toFixed(2)} · hugs the floor ${pct(t.fogHeightMix)} · low haze ${t.fogFalloff} m`,
    `Colour: warmth ${signed(t.temperature)} · strength ${pct(t.saturation)} · contrast ${t.contrast.toFixed(2)} · lifted darks ${t.lift[2].toFixed(3)} · cool shade/warm light ${pct(t.splitAmount)} · grain ${t.grain.toFixed(3)} · vignette ${t.vignette.toFixed(2)}`,
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
  Object.assign(tuned, structuredClone(proposedLook));
  applyLook();
  render();
});

// ---- Start -------------------------------------------------------------------------------
// A clicked button gives focus back, so keys go to the valley instead of pressing it again.
document.addEventListener('click', (e) => {
  if (e.target instanceof HTMLElement && e.target.closest('button'))
    (document.activeElement as HTMLElement)?.blur();
});
render();
let firstPlay = true;
app.fsm.onChange(() => {
  if (app.fsm.current !== 'splash') $('start').hidden = true;
  if (app.fsm.current === 'playing' && firstPlay) {
    firstPlay = false;
    hold(shotOf(VIEWS[0]?.shot ?? 'S02'));
  }
});
$<HTMLButtonElement>('begin').addEventListener('click', () => {
  // The App's splash takes this same click as its start.
  $('start').hidden = true;
});
walkButton.disabled = true;
app.start().catch((e: unknown) => app.fail(e instanceof Error ? e.message : String(e)));

// Debug hook for the automated lab check (not a player-facing API).
(window as unknown as { __look: unknown }).__look = {
  app,
  tuned,
  drawn,
  playing: () => app.fsm.current === 'playing',
  heldView: () => view?.id ?? null,
  onScreen,
};
