// Art QA shots (Plan Parts 5.13 and 7.10): builds the app, loads every shot from
// src/data/shots.ts in headless Chromium at 1280×720, saves artifacts/shots/<id>.png plus a
// report, and fails on console errors or blown render budgets (Plan Part 7.8).
//   npm run shots            build, then shoot every shot
//   npm run shots -- S04     shoot one shot (still builds unless --no-build)
import { execSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from '@playwright/test';
import { chromiumArgs } from '../playwright.config.ts';
import { shots } from '../src/data/shots.ts';
import { renderBudget } from '../src/data/tuning.ts';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const outDir = join(root, 'artifacts', 'shots');
const PORT = 4190;
const SHOT_TIMEOUT_MS = 180_000;

const args = process.argv.slice(2);
if (!args.includes('--no-build')) execSync('npx vite build', { cwd: root, stdio: 'inherit' });
const wanted = args.filter((a) => !a.startsWith('--'));
const list = wanted.length > 0 ? shots.filter((s) => wanted.includes(s.id)) : shots;
if (list.length === 0) throw new Error(`No shots match ${wanted.join(', ')}`);

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
};
const server = createServer((req, res) => {
  const rel = normalize(decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/'));
  const path = join(dist, rel);
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path;
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(PORT, r));

const local = '/opt/pw-browsers/chromium';
const browser = await chromium.launch({
  args: chromiumArgs,
  ...(existsSync(local) ? { executablePath: local } : {}),
});
mkdirSync(outDir, { recursive: true });

interface Passes {
  mainCalls: number;
  mainTriangles: number;
  shadowCalls: number;
  shadowTriangles: number;
}
interface Row {
  id: string;
  title: string;
  ok: boolean;
  seconds: number;
  passes?: Passes;
  problems: string[];
}
const rows: Row[] = [];
const ignorable = (url: string) => /favicon\.ico/.test(url);

for (const shot of list) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !ignorable(m.location().url)) problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  const t0 = performance.now();
  await page.goto(`http://localhost:${PORT}/index.html?shot=${shot.id}`);
  let passes: Passes | undefined;
  try {
    const status = await page.waitForFunction(
      () => {
        const s = (
          window as unknown as { __hearthwood?: { app?: { shot?: { ready: boolean; error?: string } } } }
        ).__hearthwood?.app?.shot;
        return s && (s.ready || s.error) ? s : null;
      },
      null,
      { timeout: SHOT_TIMEOUT_MS, polling: 250 },
    );
    const s = (await status.jsonValue()) as { ready: boolean; error?: string; passes?: Passes };
    if (s.error) problems.push(`app error: ${s.error}`);
    passes = s.passes;
  } catch (e) {
    problems.push(`timed out waiting for the shot: ${(e as Error).message.split('\n')[0]}`);
  }
  await page.screenshot({ path: join(outDir, `${shot.id}.png`) });
  if (passes) {
    const b = renderBudget;
    if (passes.mainCalls > b.mainCalls) problems.push(`main draws ${passes.mainCalls} > ${b.mainCalls}`);
    if (passes.mainTriangles > b.mainTriangles)
      problems.push(`main tris ${passes.mainTriangles} > ${b.mainTriangles}`);
    if (passes.shadowCalls > b.shadowCalls)
      problems.push(`shadow draws ${passes.shadowCalls} > ${b.shadowCalls}`);
    if (passes.shadowTriangles > b.shadowTriangles) {
      problems.push(`shadow tris ${passes.shadowTriangles} > ${b.shadowTriangles}`);
    }
  }
  const seconds = (performance.now() - t0) / 1000;
  rows.push({
    id: shot.id,
    title: shot.title,
    ok: problems.length === 0,
    seconds,
    ...(passes ? { passes } : {}),
    problems,
  });
  await page.close();
}

await browser.close();
server.close();
writeFileSync(
  join(outDir, 'report.json'),
  `${JSON.stringify({ budget: renderBudget, shots: rows }, null, 2)}\n`,
);
for (const r of rows) {
  const p = r.passes;
  const stats = p
    ? `main ${p.mainCalls} draws / ${(p.mainTriangles / 1000).toFixed(0)}k tris, shadow ${p.shadowCalls} / ${(p.shadowTriangles / 1000).toFixed(0)}k`
    : 'no stats';
  console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id} ${r.title} (${r.seconds.toFixed(1)} s): ${stats}`);
  for (const problem of r.problems) console.log(`       ${problem}`);
}
console.log(`Shots in ${outDir}`);
if (rows.some((r) => !r.ok)) process.exit(1);
