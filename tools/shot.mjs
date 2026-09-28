// Quick screenshots: node tools/shot.mjs <name> [script...]  -- runs JS snippets in the page then screenshots.
import { mkdirSync } from 'node:fs';
import { launch, preparePage, serve } from './harness.mjs';
const [name = 'shot', ...scripts] = process.argv.slice(2);
const { srv, url } = await serve();
const browser = await launch();
const w = Number(process.env.W || 1280), h = Number(process.env.H || 800);
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
const errors = await preparePage(page);
await page.goto(url + (process.env.Q || ''));
await page.waitForFunction(() => window.__game && window.__game.mode !== 'loading', null, { timeout: 60000 });
await page.waitForTimeout(800);
mkdirSync('artifacts/shots', { recursive: true });
let i = 0;
for (const s of scripts) {
  if (s.startsWith('wait:')) { await page.waitForTimeout(Number(s.slice(5))); continue; }
  if (s.startsWith('shot:')) { await page.screenshot({ path: `artifacts/shots/${name}-${s.slice(5)}.png` }); continue; }
  const r = await page.evaluate(s);
  if (r !== undefined) console.log('>', JSON.stringify(r).slice(0, 2000));
  i++;
}
await page.screenshot({ path: `artifacts/shots/${name}.png` });
if (errors.length) console.log('PAGE ERRORS:\n' + errors.slice(0, 10).join('\n'));
await browser.close();
srv.close();
