// Loads a built Lab (dist-lab/<name>/index.html) in headless Chromium, runs a scripted check,
// saves a screenshot to artifacts/labs/<name>.png and fails on console errors.
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { chromium } from '@playwright/test';
import { chromiumArgs } from '../playwright.config.ts';

const name = process.argv[2] ?? 'music';
const root = join(import.meta.dirname, '..');
const dir = join(root, 'dist-lab', name);
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer((req, res) => {
  const path = join(dir, decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/'));
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path;
  if (!existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(4180, r));

const local = '/opt/pw-browsers/chromium';
const browser = await chromium.launch({
  args: chromiumArgs,
  ...(existsSync(local) ? { executablePath: local } : {}),
});
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const errors: string[] = [];
// Fonts (blocked by the container's proxy CA) and the favicon are environment noise, not page bugs.
const ignorable = (url: string) => /fonts\.(googleapis|gstatic)\.com|favicon\.ico/.test(url);
page.on('console', (m) => {
  if (m.type() === 'error' && !ignorable(m.location().url)) errors.push(`${m.text()} (${m.location().url})`);
});
page.on('requestfailed', (r) => {
  if (!ignorable(r.url())) errors.push(`request failed: ${r.url()}`);
});
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4180/index.html');

let ok = true;
if (name === 'music') {
  await page.click('#play');
  await page.waitForFunction(
    () => document.getElementById('status')?.textContent?.startsWith('Form:'),
    null,
    {
      timeout: 60_000,
    },
  );
  await page.waitForTimeout(6000);
  const state = await page.evaluate(() => ({
    section: document.getElementById('section')?.textContent,
    time: document.getElementById('time')?.textContent,
    status: document.getElementById('status')?.textContent,
  }));
  console.log('Music lab state:', state);
  ok = !!state.time && !state.time.startsWith('0:00 /');
  await page.click('#moods button[data-mood="night"]');
  await page.waitForTimeout(1500);
}

mkdirSync(join(root, 'artifacts', 'labs'), { recursive: true });
await page.screenshot({ path: join(root, 'artifacts', 'labs', `${name}.png`), fullPage: true });
await browser.close();
server.close();

if (errors.length > 0) {
  console.error(`Console errors:\n${errors.join('\n')}`);
  process.exit(1);
}
if (!ok) {
  console.error('Lab check failed: playback did not advance.');
  process.exit(1);
}
console.log(`Lab "${name}" check passed.`);
