// Offline audio QA: renders the soundtrack in each mood through the same banks/envelopes the
// game uses, every sound effect variant, and a walk through the valley's footstep system with a
// piano phrase. Writes WAVs + spectrograms + a metrics report to artifacts/audio/, and fails on
// clipping, clicks, DC or uneven variants. (I can't hear; this is how renders are checked before
// the user listens.)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Rng } from '../src/core/rng.ts';
import type { Mood } from '../src/data/music/director.ts';
import { moods } from '../src/data/music/director.ts';
import { p01Lullaby } from '../src/data/music/pieces/p01Lullaby.ts';
import {
  footsteps,
  foundry,
  gait,
  mixLevels,
  movement,
  valleyMusic,
  valleyView,
} from '../src/data/tuning.ts';
import { SURFACE } from '../src/data/world/terrain.ts';
import { analyze, spectralCentroid } from '../src/dsp/analysis.ts';
import { buildBank, type InstrumentBank, type InstrumentId } from '../src/dsp/bank.ts';
import { spectrogram } from '../src/dsp/fft.ts';
import { type Footfall, FootstepPlanner, renderVoices, type StepVoice } from '../src/dsp/footsteps.ts';
import { renderMix } from '../src/dsp/mixer.ts';
import { IMPULSIVE_SFX, renderSfx, SFX_RATE, SFX_VARIANTS, type SfxId } from '../src/dsp/sfx/recipes.ts';
import { dbToGain } from '../src/dsp/util.ts';
import { encodeWav } from '../src/dsp/wav.ts';
import { perform } from '../src/music/director.ts';
import { encodePng } from './png.ts';

const outDir = join(import.meta.dirname, '..', 'artifacts', 'audio');
mkdirSync(outDir, { recursive: true });
const sr = 44100;

const t0 = performance.now();
const banks = new Map<InstrumentId, InstrumentBank>();
for (const id of ['feltPiano', 'warmPad', 'musicBox'] as const)
  banks.set(id, buildBank(id, foundry.bankSeed));
console.log(`Banks rendered in ${(performance.now() - t0).toFixed(0)} ms`);

const seeds = process.argv
  .slice(2)
  .map(Number)
  .filter((n) => Number.isFinite(n));
const seedList = seeds.length > 0 ? seeds : [1, 2];
const report: Record<string, unknown>[] = [];
let failures = 0;

for (const mood of Object.keys(moods) as Mood[]) {
  for (const seed of seedList) {
    const perf = perform(p01Lullaby, { seed, mood });
    const [l, r] = renderMix(perf.events, banks, moods[mood].mix, sr, perf.duration);
    const m = analyze([l, r], sr);
    const name = `p01-${mood}-seed${seed}`;
    writeFileSync(join(outDir, `${name}.wav`), encodeWav([l, r], sr));
    const mono = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) mono[i] = ((l[i] ?? 0) + (r[i] ?? 0)) / 2;
    const img = spectrogram(mono, sr, 900, 256);
    writeFileSync(join(outDir, `${name}.png`), encodePng(img.width, img.height, img.rgb));
    const ok = m.peakDb <= -1 && m.clicks === 0 && Math.abs(m.dcOffset) < 0.001 && m.clipped === 0;
    if (!ok) failures++;
    report.push({ name, form: perf.form.join(' '), notes: perf.events.length, ...m, ok });
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(22)} ${m.seconds.toFixed(0)}s  form=${perf.form.join(',')}  ` +
        `peak ${m.peakDb.toFixed(1)} dB  rms ${m.rmsDb.toFixed(1)} dB  loud ${m.loudnessDb.toFixed(1)} dB  clicks ${m.clicks}`,
    );
  }
}
const spectrogramPng = (name: string, mono: Float32Array, sr: number, width: number) => {
  const img = spectrogram(mono, sr, width, 256);
  writeFileSync(join(outDir, `${name}.png`), encodePng(img.width, img.height, img.rgb));
};

// ---- Sound effects: every variant measured; a contact sheet (WAV + spectrogram) per sound. ----
/** Effects may peak just under full scale (the limiter guards the mix); music keeps −1 dB. */
const SFX_PEAK_DB = -0.25;
/** No variant may stand out: loudness spread across a sound's variants (dB). */
const SFX_SPREAD_DB = 4;
const SHEET_GAP = 0.25;
for (const id of Object.keys(SFX_VARIANTS) as SfxId[]) {
  const variants = Array.from({ length: SFX_VARIANTS[id] }, (_, v) => renderSfx(id, v));
  const ms = variants.map((d) => analyze([d], SFX_RATE));
  const louds = ms.map((m) => m.loudnessDb);
  const spread = Math.max(...louds) - Math.min(...louds);
  const peakDb = Math.max(...ms.map((m) => m.peakDb));
  const clicks = IMPULSIVE_SFX.has(id) ? 0 : ms.reduce((n, m) => n + m.clicks, 0);
  const dc = Math.max(...ms.map((m) => Math.abs(m.dcOffset)));
  const clipped = ms.reduce((n, m) => n + m.clipped, 0);
  const centroid = variants.reduce((c, d) => c + spectralCentroid(d, SFX_RATE), 0) / variants.length;
  const ok = peakDb <= SFX_PEAK_DB && clicks === 0 && dc < 0.001 && clipped === 0 && spread <= SFX_SPREAD_DB;
  if (!ok) failures++;
  const gap = Math.round(SHEET_GAP * SFX_RATE);
  const sheet = new Float32Array(variants.reduce((n, d) => n + d.length + gap, 0));
  let at = 0;
  for (const d of variants) {
    sheet.set(d, at);
    at += d.length + gap;
  }
  const name = `sfx-${id}`;
  writeFileSync(join(outDir, `${name}.wav`), encodeWav([sheet], SFX_RATE));
  spectrogramPng(name, sheet, SFX_RATE, Math.min(1200, Math.max(300, Math.round(sheet.length / 200))));
  const meanLoud = louds.reduce((a, b) => a + b, 0) / louds.length;
  report.push({
    name,
    variants: variants.length,
    peakDb,
    meanLoudnessDb: meanLoud,
    spread,
    centroid,
    clicks,
    ok,
  });
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(22)} ${String(variants.length).padStart(2)} variants  peak ${peakDb.toFixed(1)} dB  ` +
      `loud ${meanLoud.toFixed(1)} dB (spread ${spread.toFixed(1)})  centroid ${centroid.toFixed(0)} Hz${IMPULSIVE_SFX.has(id) ? '' : `  clicks ${clicks}`}`,
  );
}

// ---- A walk: the footstep system over each surface, as the game plays it, with a phrase. ----
{
  const planner = new FootstepPlanner(footsteps, movement.walkSpeed, new Rng(7));
  const warm = valleyView.airTemperature;
  const segments: { label: string; surface: number; jog: boolean; airC: number; seconds: number }[] = [
    { label: 'powder, walking', surface: SURFACE.snow, jog: false, airC: warm, seconds: 5 },
    { label: 'powder, jogging', surface: SURFACE.snow, jog: true, airC: warm, seconds: 4 },
    { label: 'road, walking', surface: SURFACE.road, jog: false, airC: warm, seconds: 4 },
    { label: 'road at −18 °C (squeak)', surface: SURFACE.road, jog: false, airC: -18, seconds: 4 },
    { label: 'lake ice, walking', surface: SURFACE.lakeIce, jog: false, airC: warm, seconds: 4 },
  ];
  const voices: (StepVoice & { at: number })[] = [];
  let t = 0.5;
  let side: 0 | 1 = 0;
  const cadences: string[] = [];
  for (const seg of segments) {
    const speed = seg.jog ? movement.jogSpeed : movement.walkSpeed;
    const interval = (seg.jog ? gait.jogStep : gait.walkStep) / speed;
    cadences.push(`${seg.label} ${Math.round(60 / interval)}/min`);
    const end = t + seg.seconds;
    for (; t < end; t += interval) {
      const f: Footfall = { surface: seg.surface, side, speed, jog: seg.jog, airC: seg.airC };
      for (const v of planner.plan(f, [])) voices.push({ ...v, at: t });
      side = side === 0 ? 1 : 0;
    }
    t += 0.8; // a pause between surfaces
  }
  // A hop and landing to finish.
  for (const v of planner.plan(
    { surface: SURFACE.snow, side: 0, speed: 0, jog: false, airC: warm, land: true },
    [],
  )) {
    voices.push({ ...v, at: t });
  }
  const seconds = t + 1.5;
  const [sl, sr2] = renderVoices(voices, renderSfx, footsteps.jogShelfHz, SFX_RATE, seconds);
  // The valley's phrase underneath from the second segment on, both at their bus levels (6.10).
  const phrase = perform(p01Lullaby, {
    seed: 11,
    mood: 'clear',
    phrase: valleyMusic.phrases[0],
    only: ['feltPiano'],
  });
  const [ml, mr] = renderMix(phrase.events, banks, moods.clear.mix, SFX_RATE, phrase.duration);
  const musicGain = dbToGain(mixLevels.music);
  const sfxGain = dbToGain(mixLevels.sfx);
  for (const ch of [ml, mr]) for (let i = 0; i < ch.length; i++) ch[i] = (ch[i] ?? 0) * musicGain;
  for (const ch of [sl, sr2]) for (let i = 0; i < ch.length; i++) ch[i] = (ch[i] ?? 0) * sfxGain;
  const offset = Math.round(5.5 * SFX_RATE);
  for (let i = 0; i < ml.length && offset + i < sl.length; i++) {
    sl[offset + i] = (sl[offset + i] ?? 0) + (ml[i] ?? 0);
    sr2[offset + i] = (sr2[offset + i] ?? 0) + (mr[i] ?? 0);
  }
  const m = analyze([sl, sr2], SFX_RATE);
  // Loudness of the steps alone over the first segment (walking in powder), for the balance.
  const firstSegment = Math.round(5 * SFX_RATE);
  const [wl, wr] = renderVoices(voices, renderSfx, footsteps.jogShelfHz, SFX_RATE, seconds);
  const stepsOnly = analyze([wl.subarray(0, firstSegment), wr.subarray(0, firstSegment)], SFX_RATE);
  const phraseOnly = analyze([ml, mr], SFX_RATE);
  const ok = m.peakDb <= -1 && m.clipped === 0 && Math.abs(m.dcOffset) < 0.001;
  if (!ok) failures++;
  writeFileSync(join(outDir, 'walk.wav'), encodeWav([sl, sr2], SFX_RATE));
  const mono = new Float32Array(sl.length);
  for (let i = 0; i < sl.length; i++) mono[i] = ((sl[i] ?? 0) + (sr2[i] ?? 0)) / 2;
  spectrogramPng('walk', mono, SFX_RATE, 1200);
  report.push({
    name: 'walk',
    steps: voices.length,
    cadences,
    ...m,
    stepsLoudnessDb: stepsOnly.loudnessDb,
    phraseLoudnessDb: phraseOnly.loudnessDb,
    ok,
  });
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} walk                   ${m.seconds.toFixed(0)}s  ${voices.length} voices  peak ${m.peakDb.toFixed(1)} dB  ` +
      `steps ${stepsOnly.loudnessDb.toFixed(1)} dB · phrase ${phraseOnly.loudnessDb.toFixed(1)} dB  (${cadences.join(', ')})`,
  );
}

writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
if (failures > 0) {
  console.error(`${failures} render(s) failed QA`);
  process.exit(1);
}
