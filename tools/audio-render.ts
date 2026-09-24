// Offline audio QA: renders the soundtrack in each mood through the same banks/envelopes the
// game uses, writes WAVs + spectrograms + a metrics report to artifacts/audio/, and fails on
// clipping, clicks or DC. (I can't hear; this is how renders are checked before the user listens.)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Mood } from '../src/data/music/director.ts';
import { moods } from '../src/data/music/director.ts';
import { p01Lullaby } from '../src/data/music/pieces/p01Lullaby.ts';
import { analyze } from '../src/dsp/analysis.ts';
import { buildBank, type InstrumentBank, type InstrumentId } from '../src/dsp/bank.ts';
import { spectrogram } from '../src/dsp/fft.ts';
import { renderMix } from '../src/dsp/mixer.ts';
import { encodeWav } from '../src/dsp/wav.ts';
import { perform } from '../src/music/director.ts';
import { encodePng } from './png.ts';

const outDir = join(import.meta.dirname, '..', 'artifacts', 'audio');
mkdirSync(outDir, { recursive: true });
const sr = 44100;

const t0 = performance.now();
const banks = new Map<InstrumentId, InstrumentBank>();
for (const id of ['feltPiano', 'warmPad', 'musicBox'] as const) banks.set(id, buildBank(id, 20260924));
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
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
if (failures > 0) {
  console.error(`${failures} render(s) failed QA`);
  process.exit(1);
}
