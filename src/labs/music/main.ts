// Review Lab #1: the soundtrack. Renders the instrument banks in the browser, then plays
// endless fresh performances of the Wrenhollow Lullaby with live mix controls.

import { director, type Mood, moods } from '../../data/music/director.ts';
import { p01Lullaby } from '../../data/music/pieces/p01Lullaby.ts';
import type { InstrumentBank, InstrumentId } from '../../dsp/bank.ts';
import { type Performance, perform } from '../../music/director.ts';
import { AudioEngine } from '../../view/audio/AudioEngine.ts';
import { renderBanks } from '../../view/audio/FoundryClient.ts';
import { MusicPlayer } from '../../view/audio/MusicPlayer.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const playBtn = $<HTMLButtonElement>('play');
const variationBtn = $<HTMLButtonElement>('variation');
const stopBtn = $<HTMLButtonElement>('stop');
const replayBtn = $<HTMLButtonElement>('replay');
const seedInput = $<HTMLInputElement>('seed');
const statusEl = $('status');
const sectionEl = $('section');
const timeEl = $('time');
const formEl = $('form');
const settingsEl = $('settings');
const restsInput = $<HTMLInputElement>('rests');

const sliders = ['tempo', 'piano', 'pad', 'box', 'reverb', 'volume'] as const;
type SliderId = (typeof sliders)[number];
const value = (id: SliderId) => Number($<HTMLInputElement>(id).value);

let mood: Mood = 'clear';
let seed = 1;
let engine: AudioEngine | null = null;
let player: MusicPlayer | null = null;
let banks: Map<InstrumentId, InstrumentBank> | null = null;
let restTimer: ReturnType<typeof setTimeout> | null = null;
let resting = false;
let programOn = false;

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function currentMix() {
  const m = moods[mood].mix;
  return { piano: m.piano * value('piano'), pad: m.pad * value('pad'), box: m.box * value('box') };
}

function applyMix(): void {
  if (!engine || !player) return;
  player.setMix(currentMix());
  engine.setGain(engine.musicReverbSend.gain, value('reverb'));
  engine.setGain(engine.master.gain, value('volume'));
}

function renderSettings(): void {
  for (const id of sliders) {
    const v = value(id);
    const out = $(`${id}-out`);
    out.textContent = id === 'tempo' ? `${Math.round(v * p01Lullaby.bpm)} bpm` : `${Math.round(v * 100)}%`;
  }
  const lines = [
    `Lab: Wrenhollow Lullaby`,
    `Mood: ${mood}`,
    `Seed: ${seed}`,
    `Tempo: ${Math.round(value('tempo') * p01Lullaby.bpm)} bpm`,
    `Piano ${Math.round(value('piano') * 100)}% · Pad ${Math.round(value('pad') * 100)}% · Music box ${Math.round(value('box') * 100)}%`,
    `Reverb ${Math.round(value('reverb') * 100)}% · Rests ${restsInput.checked ? 'on' : 'off'}`,
  ];
  settingsEl.textContent = lines.join('\n');
}

async function ensureAudio(): Promise<void> {
  if (engine && player) return;
  const ctx = new AudioContext({ latencyHint: 'playback' });
  await ctx.resume();
  engine = new AudioEngine(ctx);
  statusEl.textContent = 'Tuning the instruments…';
  banks = await renderBanks(['feltPiano', 'warmPad', 'musicBox'], 20260924, (done, total) => {
    statusEl.textContent = `Tuning the instruments… ${Math.round((done / total) * 100)}%`;
  });
  player = new MusicPlayer(engine, banks);
  applyMix();
  statusEl.textContent = '';
}

function startPerformance(nextSeed: number, crossfade = 2.5): void {
  if (!player) return;
  if (restTimer) clearTimeout(restTimer);
  resting = false;
  seed = nextSeed;
  seedInput.value = String(seed);
  const perf = perform(p01Lullaby, { seed, mood, tempoScale: value('tempo') });
  player.play(perf, 0.05, crossfade);
  drawForm(perf);
  renderSettings();
  statusEl.textContent = `Form: ${perf.form.map(prettySection).join(' → ')}`;
}

function prettySection(s: string): string {
  if (s === 'intro') return 'Intro';
  if (s === 'outro') return 'Outro';
  return s.replace(/(\d)$/, (n) => '′'.repeat(Number(n) - 1));
}

function drawForm(perf: Performance): void {
  formEl.replaceChildren(
    ...perf.markers.map(() => {
      const s = document.createElement('span');
      s.append(document.createElement('i'));
      return s;
    }),
  );
}

function updateNowPlaying(): void {
  if (!player) return;
  const pos = player.position();
  if (!pos || resting) {
    sectionEl.textContent = resting ? 'Resting…' : 'Ready';
    return;
  }
  const { perf, elapsed } = pos;
  const markers = perf.markers;
  let idx = 0;
  for (let i = 0; i < markers.length; i++) if ((markers[i]?.t ?? 0) <= elapsed) idx = i;
  sectionEl.textContent = elapsed >= perf.duration ? 'Fading…' : (markers[idx]?.label ?? '');
  timeEl.textContent = `${fmt(Math.min(elapsed, perf.duration))} / ${fmt(perf.duration)}`;
  const cells = formEl.children;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i] as HTMLElement;
    const start = markers[i]?.t ?? 0;
    const end = markers[i + 1]?.t ?? perf.duration;
    cell.className = elapsed >= end ? 'done' : '';
    const fill = cell.firstElementChild as HTMLElement | null;
    if (fill)
      fill.style.width =
        elapsed > start && elapsed < end ? `${((elapsed - start) / (end - start)) * 100}%` : '0';
  }
  if (programOn && elapsed >= perf.duration && !resting) {
    if (restsInput.checked) {
      resting = true;
      const r = director.restSeconds;
      const wait = r.min + Math.random() * (r.max - r.min);
      statusEl.textContent = `A quiet rest (${Math.round(wait)} s) before the next variation, as in the game.`;
      restTimer = setTimeout(() => startPerformance(seed + 1, 0.1), wait * 1000);
    } else {
      startPerformance(seed + 1, 0.1);
    }
  }
}

playBtn.addEventListener('click', async () => {
  playBtn.disabled = true;
  try {
    await ensureAudio();
    programOn = true;
    startPerformance(Number(seedInput.value) || seed, 0.1);
    variationBtn.disabled = false;
    stopBtn.disabled = false;
    replayBtn.disabled = false;
  } catch (err) {
    statusEl.textContent = `Sound could not start: ${(err as Error).message}. Try reloading the page.`;
    playBtn.disabled = false;
  }
});

variationBtn.addEventListener('click', () => startPerformance(seed + 1));
replayBtn.addEventListener('click', () =>
  startPerformance(Math.max(1, Math.floor(Number(seedInput.value) || 1))),
);
stopBtn.addEventListener('click', () => {
  programOn = false;
  if (restTimer) clearTimeout(restTimer);
  resting = false;
  player?.stop(1.5);
  playBtn.disabled = false;
  statusEl.textContent = 'Stopped.';
});

for (const btn of document.querySelectorAll<HTMLButtonElement>('#moods button')) {
  btn.addEventListener('click', () => {
    mood = btn.dataset.mood as Mood;
    for (const b of document.querySelectorAll<HTMLButtonElement>('#moods button')) {
      b.setAttribute('aria-pressed', String(b === btn));
    }
    applyMix();
    // Same seed in the new mood, crossfaded, so moods can be compared directly.
    if (programOn) startPerformance(seed);
    renderSettings();
  });
}

for (const id of sliders) {
  $<HTMLInputElement>(id).addEventListener('input', () => {
    applyMix();
    renderSettings();
  });
}
$<HTMLInputElement>('tempo').addEventListener('change', () => {
  if (programOn) startPerformance(seed);
});
restsInput.addEventListener('change', renderSettings);

$<HTMLButtonElement>('copy').addEventListener('click', async () => {
  const status = $('copy-status');
  try {
    await navigator.clipboard.writeText(settingsEl.textContent ?? '');
    status.textContent = 'Copied. Paste it in our chat with any notes.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(settingsEl);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    status.textContent = 'Selected. Copy it with Ctrl/Cmd+C.';
  }
});

renderSettings();
setInterval(updateNowPlaying, 200);
