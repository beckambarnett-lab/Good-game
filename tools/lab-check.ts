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
const shot = (suffix: string) =>
  page.screenshot({ path: join(root, 'artifacts', 'labs', `${name}${suffix}.png`), fullPage: true });
if (name === 'felling') {
  type Hook = { inGreen(): boolean; chops(): number; standing(): boolean; landed(): boolean; press(): void };
  await page.click('#begin');
  await page.waitForFunction(() => document.getElementById('start')?.hidden === true, null, {
    timeout: 60_000,
  });
  await page.waitForTimeout(1500);
  await shot('-1-ready');
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => (window as unknown as { __felling: Hook }).__felling.inGreen(), null, {
      timeout: 20_000,
      polling: 5,
    });
    await page.evaluate(() => (window as unknown as { __felling: Hook }).__felling.press());
    await page.waitForTimeout(i === 0 ? 120 : 700);
    if (i === 0) await shot('-2-chop');
  }
  const chops = await page.evaluate(() => (window as unknown as { __felling: Hook }).__felling.chops());
  console.log('Chops landed:', chops);
  ok = chops === 3;
  await page.waitForTimeout(1300);
  await shot('-3-falling');
  await page.waitForFunction(() => (window as unknown as { __felling: Hook }).__felling.landed(), null, {
    timeout: 90_000,
  });
  await page.waitForTimeout(250);
  await shot('-4-landed');
}
if (name === 'walk') {
  type Pos = { x: number; z: number; speed: number; surface: number };
  type Walk = {
    app: { fsm: { current: string }; playerState(): Pos | null };
    move: { walkSpeed: number };
    counts(): Record<string, number>;
    musicReady(): boolean;
    musicPlaying(): boolean;
  };
  // Page-side code can't see Node's closures, so each callback reaches the lab hook itself.
  type Win = { __walk: Walk };
  const walkAtLeast = async (metres: number) => {
    const from = await page.evaluate(() => (window as unknown as Win).__walk.app.playerState());
    await page.keyboard.down('KeyW');
    await page.waitForFunction(
      ([f, m]) => {
        const p = (window as unknown as Win).__walk.app.playerState();
        return !!p && !!f && Math.hypot(p.x - f.x, p.z - f.z) > m;
      },
      [from, metres] as const,
      { timeout: 90_000 },
    );
    await page.keyboard.up('KeyW');
  };
  const counts = () => page.evaluate(() => (window as unknown as Win).__walk.counts());
  const goTo = async (label: string) => {
    await page.locator('#places').getByRole('button', { name: label }).click();
    await page.waitForTimeout(600);
  };

  await page.click('#begin');
  await page.waitForFunction(() => (window as unknown as Win).__walk.app.fsm.current === 'playing', null, {
    timeout: 120_000,
  });
  await page.waitForTimeout(1500);
  await shot('-1-cabin');
  await walkAtLeast(4);
  const powder = await counts();
  console.log('Powder:', powder);
  await shot('-2-powder');

  await page.click('#cold');
  await goTo('Main Street');
  await walkAtLeast(4);
  const road = await counts();
  console.log('Main Street, cold snap:', road);
  await shot('-3-street');

  await goTo('Lake');
  await walkAtLeast(4);
  const lake = await counts();
  console.log('Lake:', lake);
  await shot('-4-lake');

  // A slider really changes the walk: 2 m/s, measured on the walker.
  await page.$eval('#walk-speed', (el) => {
    (el as HTMLInputElement).value = '2';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await goTo('Cabin');
  await page.keyboard.down('KeyW');
  const slowed = await page
    .waitForFunction(
      () => Math.abs(((window as unknown as Win).__walk.app.playerState()?.speed ?? 0) - 2) < 0.05,
      null,
      {
        timeout: 60_000,
      },
    )
    .then(() => true)
    .catch(() => false);
  await page.keyboard.up('KeyW');
  console.log('Walking speed slider takes effect:', slowed);

  await page.waitForFunction(() => (window as unknown as Win).__walk.musicReady(), null, { timeout: 90_000 });
  await page.click('#play-phrase');
  const phrase = await page
    .waitForFunction(() => (window as unknown as Win).__walk.musicPlaying(), null, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  console.log('Piano phrase plays:', phrase);

  ok =
    (powder.stepSnow ?? 0) > 0 &&
    (powder.rustle ?? 0) > 0 &&
    (road.stepPacked ?? 0) > 0 &&
    (road.stepSqueak ?? 0) > 0 &&
    (lake.stepIce ?? 0) > 0 &&
    slowed &&
    phrase;
}
await shot('');
await browser.close();
server.close();

if (errors.length > 0) {
  console.error(`Console errors:\n${errors.join('\n')}`);
  process.exit(1);
}
if (!ok) {
  console.error(
    `Lab check failed: ${name === 'walk' ? 'a footstep, slider or phrase check' : 'playback did not advance'}.`,
  );
  process.exit(1);
}
console.log(`Lab "${name}" check passed.`);
