// node tools/lineup.mjs <factionId> [enemyFactionId]
// Screenshots: artifacts/shots/lineup-<id>-front.png (rest poses, close-up) and -battle.png (mid-fight).
import { mkdirSync } from 'node:fs';
import { launch, preparePage, serve } from './harness.mjs';
const [fid, eid = 'grow'] = process.argv.slice(2);
const { srv, url } = await serve();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
const errors = await preparePage(page);
await page.goto(url + '?nothumbs');
await page.waitForFunction(() => window.__game && window.__game.mode === 'title', null, { timeout: 60000 });
mkdirSync('artifacts/shots', { recursive: true });
const info = await page.evaluate(([fid, eid]) => {
  const g = window.__game;
  g.startSandbox('meadow');
  g.session.unlimited = true;
  const f = g.sim.defs;
  const mine = Object.values(f).filter((u) => u.faction === fid && !u.hidden);
  const theirs = Object.values(f).filter((u) => u.faction === eid && !u.hidden);
  let x = -((mine.length - 1) / 2) * 4.5;
  for (const u of mine) { g.selected = u; g.placeTeam = 1; g.tryPlace(x, -6, true); x += 4.5; }
  document.getElementById('hud').hidden = true;
  g.rig.pos.set(0, 4.5, 8); g.rig.yaw = 0 + Math.PI; g.rig.pitch = -0.18;
  // look from the blue side toward red units' faces
  g.rig.pos.set(0, 4, 4); g.rig.yaw = Math.PI; g.rig.pitch = -0.2;
  window.__lineup = { mine, theirs };
  return mine.map((u) => u.id);
}, [fid, eid]);
console.log('units', info.join(', '));
await page.waitForTimeout(1500);
await page.screenshot({ path: `artifacts/shots/lineup-${fid}-front.png` });
// Battle: faction (red) vs enemy faction (blue), simulated forward quickly, then screenshot.
await page.evaluate(() => {
  const g = window.__game;
  const { theirs } = window.__lineup;
  let x = -((theirs.length - 1) / 2) * 4.5;
  for (const u of theirs) { g.selected = u; g.placeTeam = 0; g.tryPlace(x, 6, true); x += 4.5; }
  g.startBattle();
  for (let i = 0; i < 60 * 4; i++) g.sim.step();
  g.rig.pos.set(0, 9, 16); g.rig.yaw = Math.PI; g.rig.pitch = -0.45;
});
await page.waitForTimeout(700);
await page.screenshot({ path: `artifacts/shots/lineup-${fid}-battle.png` });
await page.evaluate(() => { const g = window.__game; for (let i = 0; i < 60 * 4; i++) g.sim.step(); });
await page.waitForTimeout(500);
await page.screenshot({ path: `artifacts/shots/lineup-${fid}-battle2.png` });
if (errors.length) console.log('PAGE ERRORS:\n' + errors.slice(0, 10).join('\n'));
await browser.close();
srv.close();
