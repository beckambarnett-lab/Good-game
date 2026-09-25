// Review Lab #2: the felling minigame (user design). A woodcutter, a tree, and the swinging
// bar: chop in the green, three chops fell the tree, bigger trees swing the bar slower.

import { Mesh, MeshLambertMaterial, Vector3 } from 'three';
import { Rng } from '../../core/rng.ts';
import { type FellingTuning, felling } from '../../data/tuning.ts';
import { SFX_VARIANTS, type SfxId } from '../../dsp/sfx/recipes.ts';
import {
  type FellingState,
  greenWidth,
  pressChop,
  startFelling,
  stepFelling,
} from '../../sim/actions/felling.ts';
import { AudioEngine } from '../../view/audio/AudioEngine.ts';
import { renderSfxBank } from '../../view/audio/FoundryClient.ts';
import { Sfx } from '../../view/audio/Sfx.ts';
import { Chips } from '../../view/fx/Chips.ts';
import { Puffs } from '../../view/fx/Puffs.ts';
import { Snowfall } from '../../view/fx/Snowfall.ts';
import { snowClearing } from '../../view/geo/ground.ts';
import { merge } from '../../view/geo/Joinery.ts';
import { birch, pine } from '../../view/geo/trees.ts';
import { palette } from '../../view/render/palette.ts';
import { Stage } from '../../view/render/Stage.ts';
import { Bar } from './Bar.ts';
import { FellingTree, TREE_SPECS } from './FellingTree.ts';
import { Woodcutter } from './Woodcutter.ts';

type SizeKey = keyof typeof TREE_SPECS;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const tuning: FellingTuning = structuredClone(felling) as FellingTuning;
const AXE_NAMES = ["Hal's old axe", 'Sharpened', "Forester's", 'Longhorn', 'Old Faithful'];

// ---- Scene -----------------------------------------------------------------------------
const stage = new Stage($('scene'));
const rng = new Rng(20260924);
const groundMat = new MeshLambertMaterial({ vertexColors: true });
const ground = new Mesh(snowClearing(40, 16, rng.fork('ground')).toGeometry(), groundMat);
ground.receiveShadow = true;
stage.scene.add(ground);

// A ring of forest around the clearing, merged into one mesh.
{
  const f = rng.fork('forest');
  const parts = [];
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + f.range(-0.04, 0.04);
    const r = f.range(15, 32);
    const h = f.range(8, 17);
    const t = f.chance(0.22) ? birch(h * 0.8, h * 0.014, f) : pine(h, h * 0.017, f);
    const y = Math.max(0, (r / 40 - 0.55) / 0.45) ** 2 * 3.5;
    const whole = merge(t.stump, t.crown.clone().at(0, t.hingeY, 0)).rot(0, f.range(0, 6.3), 0);
    parts.push(whole.at(Math.cos(a) * r, y - 0.1, Math.sin(a) * r));
  }
  const forest = new Mesh(merge(...parts).toGeometry(), new MeshLambertMaterial({ vertexColors: true }));
  forest.castShadow = true;
  stage.scene.add(forest);
}

const snow = new Snowfall(2500);
stage.scene.add(snow.points);
const chips = new Chips();
stage.scene.add(chips.mesh);
const puffs = new Puffs(700);
stage.scene.add(puffs.points);

const cutter = new Woodcutter(rng.fork('cutter'));
const cutterPos = new Vector3(0.2, 0, 1.05);
cutter.root.position.copy(cutterPos);
cutter.root.rotation.y = Math.PI + 0.12;
stage.scene.add(cutter.root);

// ---- Audio -----------------------------------------------------------------------------
let engine: AudioEngine | null = null;
let sfx: Sfx | null = null;
const play = (id: SfxId, opts: Parameters<Sfx['play']>[1] = {}) => sfx?.play(id, opts);

// ---- Felling state ---------------------------------------------------------------------
let sizeKey: SizeKey = 'medium';
let tree: FellingTree;
let state: FellingState;
let oldTree: FellingTree | null = null;
const stats = { chops: 0, perfect: 0, misses: 0 };
let respawnAt = -1;
let clock = 0;
let hitstop = 0;
let trauma = 0;
let fallFocus = 0;
const timers: { at: number; fn: () => void }[] = [];
/** Run `fn` after `seconds` of game time (so slow frames and hit-stop stay in sync). */
const later = (seconds: number, fn: () => void) => timers.push({ at: clock + seconds, fn });

const bar = new Bar($('hud'));
$('hud').prepend(bar.root);

function newTree(sprout: boolean): void {
  if (tree) {
    oldTree = tree;
  }
  const spec = TREE_SPECS[sizeKey];
  tree = new FellingTree(spec, rng.fork(`tree${clock}`), new Vector3(0, 0, 1));
  if (sprout) tree.sprout();
  tree.onLand = (tip) => landed(tip);
  stage.scene.add(tree.group);
  state = startFelling(spec.size, Math.random());
  bar.show(true);
  refreshBar();
  fallFocus = 0;
}

function refreshBar(): void {
  bar.setZones(greenWidth(tuning, axeTier()), tuning.perfectWidth);
  bar.setPips(state.chops, tuning.chopsToFell);
}

const axeTier = () => Number($<HTMLInputElement>('axe').value);
const relaxed = () => $<HTMLInputElement>('relaxed').checked;

function press(): void {
  if (!tree || !tree.standing || cutter.busy) return;
  const outcome = pressChop(state, tuning, axeTier());
  if (outcome === 'ignored') return;
  play('whoosh', { gain: 0.5, pitch: outcome === 'miss' ? 1 : 0 });
  const chopsNow = state.chops;
  const felled = state.felled;
  cutter.chop(() => impact(outcome, chopsNow, felled));
}

function impact(outcome: 'chop' | 'perfect' | 'miss', chopsNow: number, felled: boolean): void {
  const spec = tree.spec;
  const notch = tree.notchPoint();
  const toCutter = cutterPos.clone().sub(tree.group.position).setY(0).normalize();
  if (outcome === 'miss') {
    stats.misses++;
    play('miss', { gain: 0.7 });
    tree.glanced();
    bar.flash('miss');
    puffs.emit(notch, 3, { size: 0.12, life: 0.5, up: 0.2 });
    trauma = Math.min(1, trauma + 0.08);
    updateStats();
    return;
  }
  stats.chops++;
  if (outcome === 'perfect') stats.perfect++;
  const sizeId: SfxId =
    spec.size === 'small' ? 'chopSmall' : spec.size === 'medium' ? 'chopMedium' : 'chopLarge';
  play(sizeId, { gain: outcome === 'perfect' ? 1.05 : 0.95, pitchJitter: 0.5 });
  const progress = chopsNow / tuning.chopsToFell;
  tree.chopped(progress, outcome === 'perfect' ? 1.4 : 1);
  const woodColors =
    spec.kind === 'birch'
      ? [palette.birchBark, palette.woodGreen, 0xe2cfa3]
      : [palette.woodGreen, palette.pineBark, 0xe0c48e];
  chips.burst(notch, toCutter, outcome === 'perfect' ? 16 : 10, woodColors);
  puffs.emit(notch, 5, { size: 0.16, life: 0.6, up: 0.3 });
  // Snow shaken from the branches drifts down.
  const crown = tree.crownCenter();
  puffs.emit(crown, outcome === 'perfect' ? 18 : 10, {
    spread: spec.height * 0.25,
    size: 0.4,
    life: 2.2,
    up: -0.4,
    out: 0.3,
  });
  play('snowSift', { gain: 0.35, delay: 0.08 });
  if (chopsNow === tuning.chopsToFell - 1 && tuning.chopsToFell > 1)
    play('creak', { gain: 0.35, delay: 0.25 });
  hitstop = outcome === 'perfect' ? 0.07 : 0.045;
  trauma = Math.min(1, trauma + (outcome === 'perfect' ? 0.22 : 0.14));
  bar.flash(outcome);
  bar.setPips(chopsNow, tuning.chopsToFell);
  updateStats();
  if (felled) {
    bar.show(false);
    play('creak', { gain: 0.55, delay: 0.1 });
    play('crack', { gain: 0.8, delay: 0.55 });
    later(0.55, () => {
      tree.fall();
      play('fallWhoosh', { gain: 0.6, delay: 0.3 });
    });
  }
}

function landed(tip: Vector3): void {
  play('thud', { gain: 1 });
  trauma = 1;
  const dir = tip.clone().sub(tree.group.position).setY(0).normalize();
  const len = tree.spec.height;
  for (let i = 1; i <= 8; i++) {
    const p = tree.group.position.clone().addScaledVector(dir, (len * i) / 9);
    puffs.emit(p.setY(0.3), 14, { spread: 1.2, size: 0.7, life: 2.4, up: 0.9, out: 1.4 });
  }
  respawnAt = clock + 3.2;
}

function updateStats(): void {
  $('stats').textContent = `Chops ${stats.chops} · Perfect ${stats.perfect} · Misses ${stats.misses}`;
}

// ---- Camera ----------------------------------------------------------------------------
const camPos = new Vector3();
const camLook = new Vector3();
function updateCamera(dt: number, t: number): void {
  const h = tree.spec.height;
  // Over the woodcutter's shoulder, far enough to see boots, notch and most of the tree.
  const standPos = new Vector3(4.2 + h * 0.12, 2.0 + h * 0.06, 7.2 + h * 0.3);
  const standLook = new Vector3(-0.2, 1.3 + h * 0.08, -0.3);
  // As it falls, pull back and look along the fall line so the whole tree lands in frame.
  const fallPos = new Vector3(9 + h * 0.45, 3.5 + h * 0.25, 5 + h * 0.25);
  const fallLook = new Vector3(0, 0.8, -h * 0.45);
  const target = fallFocus > 0 ? standPos.clone().lerp(fallPos, fallFocus) : standPos;
  const look = fallFocus > 0 ? standLook.clone().lerp(fallLook, fallFocus) : standLook;
  const k = 1 - Math.exp(-dt * 3);
  if (camPos.lengthSq() === 0) {
    camPos.copy(target);
    camLook.copy(look);
  }
  camPos.lerp(target, k);
  camLook.lerp(look, k);
  const shake = trauma * trauma;
  const sx = (Math.sin(t * 37.1) + Math.sin(t * 23.7)) * 0.5 * shake * 0.06;
  const sy = (Math.sin(t * 31.3) + Math.sin(t * 19.1)) * 0.5 * shake * 0.05;
  stage.camera.position.set(camPos.x + sx, camPos.y + sy, camPos.z);
  stage.camera.lookAt(camLook);
}

// ---- Frame loop ------------------------------------------------------------------------
stage.onFrame((rawDt, t) => {
  let dt = rawDt;
  if (hitstop > 0) {
    hitstop -= rawDt;
    dt = rawDt * 0.05;
  }
  clock += dt;
  for (let i = timers.length - 1; i >= 0; i--) {
    const timer = timers[i];
    if (timer && clock >= timer.at) {
      timers.splice(i, 1);
      timer.fn();
    }
  }
  trauma = Math.max(0, trauma - rawDt * 1.6);
  if (tree.standing) stepFelling(state, dt, tuning, relaxed(), axeTier());
  bar.setMarker(state.marker);
  cutter.update(dt);
  tree.update(dt);
  oldTree?.update(dt);
  if (!tree.standing) fallFocus = Math.min(1, fallFocus + rawDt * 0.9);
  chips.update(dt, () => 0.02);
  puffs.update(dt);
  snow.update(t, stage.camera.position);
  updateCamera(rawDt, t);
  if (respawnAt > 0 && clock >= respawnAt) {
    respawnAt = -1;
    if (oldTree) stage.scene.remove(oldTree.group);
    stage.scene.remove(tree.group);
    oldTree = null;
    newTree(true);
  }
});

// ---- Controls --------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if ((e.target as HTMLElement).tagName === 'INPUT' && e.code !== 'Space') return;
    e.preventDefault();
    press();
  }
});
$('scene').addEventListener('pointerdown', () => press());

for (const b of document.querySelectorAll<HTMLButtonElement>('#trees button')) {
  b.addEventListener('click', () => {
    sizeKey = b.dataset.size as SizeKey;
    for (const o of document.querySelectorAll<HTMLButtonElement>('#trees button')) {
      o.setAttribute('aria-pressed', String(o === b));
    }
    if (oldTree) stage.scene.remove(oldTree.group);
    stage.scene.remove(tree.group);
    oldTree = null;
    respawnAt = -1;
    newTree(true);
    b.blur();
  });
}

// ---- Tuning panel ----------------------------------------------------------------------
const sliderIds = ['green', 'perfect', 'small', 'medium', 'large', 'chops', 'axe', 'volume'] as const;
function syncFromTuning(): void {
  $<HTMLInputElement>('green').value = String(tuning.greenWidth);
  $<HTMLInputElement>('perfect').value = String(tuning.perfectWidth);
  $<HTMLInputElement>('small').value = String(tuning.sweepSeconds.small);
  $<HTMLInputElement>('medium').value = String(tuning.sweepSeconds.medium);
  $<HTMLInputElement>('large').value = String(tuning.sweepSeconds.large);
  $<HTMLInputElement>('chops').value = String(tuning.chopsToFell);
}
function readTuning(): void {
  tuning.greenWidth = Number($<HTMLInputElement>('green').value);
  tuning.perfectWidth = Math.min(Number($<HTMLInputElement>('perfect').value), tuning.greenWidth);
  tuning.sweepSeconds.small = Number($<HTMLInputElement>('small').value);
  tuning.sweepSeconds.medium = Number($<HTMLInputElement>('medium').value);
  tuning.sweepSeconds.large = Number($<HTMLInputElement>('large').value);
  tuning.chopsToFell = Number($<HTMLInputElement>('chops').value);
  if (engine) engine.setGain(engine.master.gain, Number($<HTMLInputElement>('volume').value));
}
function renderSettings(): void {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  $('green-out').textContent = pct(greenWidth(tuning, axeTier()));
  $('perfect-out').textContent = pct(tuning.perfectWidth);
  $('small-out').textContent = `${tuning.sweepSeconds.small.toFixed(2)} s per sweep`;
  $('medium-out').textContent = `${tuning.sweepSeconds.medium.toFixed(2)} s per sweep`;
  $('large-out').textContent = `${tuning.sweepSeconds.large.toFixed(2)} s per sweep`;
  $('chops-out').textContent = String(tuning.chopsToFell);
  $('axe-out').textContent = AXE_NAMES[axeTier()] ?? '';
  $('volume-out').textContent = pct(Number($<HTMLInputElement>('volume').value));
  $('settings').textContent = [
    'Lab: Felling minigame',
    `Green zone: ${pct(tuning.greenWidth)} (+${pct(tuning.axeGreenBonus[axeTier()] ?? 0)} with ${AXE_NAMES[axeTier()]})`,
    `Perfect band: ${pct(tuning.perfectWidth)}`,
    `Sweep: small ${tuning.sweepSeconds.small.toFixed(2)} s · medium ${tuning.sweepSeconds.medium.toFixed(2)} s · large ${tuning.sweepSeconds.large.toFixed(2)} s`,
    `Chops to fell: ${tuning.chopsToFell}`,
    `Relaxed mode: ${relaxed() ? 'on' : 'off'}`,
  ].join('\n');
}
for (const id of sliderIds) {
  $<HTMLInputElement>(id).addEventListener('input', () => {
    readTuning();
    if (tree?.standing) refreshBar();
    renderSettings();
  });
}
$<HTMLInputElement>('relaxed').addEventListener('change', renderSettings);
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

// ---- Start -----------------------------------------------------------------------------
syncFromTuning();
readTuning();
renderSettings();
newTree(false);
stage.start();

$<HTMLButtonElement>('begin').addEventListener('click', async () => {
  const btn = $<HTMLButtonElement>('begin');
  btn.disabled = true;
  btn.textContent = 'Sharpening the axe…';
  try {
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    await ctx.resume();
    engine = new AudioEngine(ctx);
    const ids = Object.keys(SFX_VARIANTS) as SfxId[];
    sfx = new Sfx(engine, await renderSfxBank(ids));
    readTuning();
  } catch {
    // The game still works silently if audio can't start.
  }
  $('start').hidden = true;
  $('scene').focus();
});

// Debug hook for the automated lab check (not a player-facing API).
(window as unknown as { __felling: unknown }).__felling = {
  marker: () => state.marker,
  inGreen: () =>
    state.lock === 0 &&
    !cutter.busy &&
    Math.abs(state.marker - 0.5) < greenWidth(tuning, axeTier()) / 2 - 0.02,
  chops: () => state.chops,
  standing: () => tree.standing,
  landed: () => tree.landed,
  press,
};
