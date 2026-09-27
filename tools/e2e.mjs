// The Gauntlet, part 3: Playwright checks against the built page (dist/index.html).
// node tools/e2e.mjs  -> artifacts/e2e/*.png + artifacts/gauntlet/e2e.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, preparePage, serve } from './harness.mjs';

const OUT = 'artifacts/e2e';
mkdirSync(OUT, { recursive: true });
const results = [];
const { srv, url } = await serve();
const browser = await launch();

async function check(name, fn) {
  const t0 = Date.now();
  try {
    const info = await fn();
    results.push({ name, pass: true, info: info || '' });
    console.log(`pass ${name}${info ? ` · ${info}` : ''} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    results.push({ name, pass: false, info: String(e.message || e) });
    console.log(`FAIL ${name}: ${e.message || e}`);
  }
}
const assert = (c, msg) => {
  if (!c) throw new Error(msg);
};

async function open(viewport, touch) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: !!touch, isMobile: !!touch });
  const page = await ctx.newPage();
  const errors = await preparePage(page);
  await page.goto(url);
  await page.waitForFunction(() => window.__game && window.__game.mode === 'title', null, { timeout: 90000 });
  return { ctx, page, errors };
}

// world (x, z) -> screen pixel
const toScreen = (page, x, z) =>
  page.evaluate(
    ([x, z]) => {
      const g = window.__game;
      const v = new THREE.Vector3(x, g.groundY(x, z) + 0.3, z).project(g.camera);
      return { x: ((v.x + 1) / 2) * g.canvas.clientWidth, y: ((1 - v.y) / 2) * g.canvas.clientHeight };
    },
    [x, z],
  );
// fast-forward the battle in simulation time
const fastForward = (page, secs) =>
  page.evaluate((secs) => {
    const g = window.__game;
    for (let i = 0; i < secs * 60 && g.sim.phase === 'battle'; i++) g.sim.step();
  }, secs);

// ------------------------------------------------------------------ desktop
const D = await open({ width: 1280, height: 800 });
const P = D.page;

await check('boot: title renders, attract battle runs, no console errors', async () => {
  await P.waitForTimeout(1500);
  const t0 = await P.evaluate(() => window.__game.sim.time);
  await P.waitForTimeout(1500);
  const t1 = await P.evaluate(() => window.__game.sim.time);
  await P.screenshot({ path: `${OUT}/01-title.png` });
  assert(await P.isVisible('#title'), 'title hidden');
  assert(t1 > t0, 'attract battle not advancing');
  assert(D.errors.length === 0, `console errors: ${D.errors.join(' | ')}`);
  return `attract t ${t0.toFixed(1)} -> ${t1.toFixed(1)}`;
});

await check('how to play opens and closes', async () => {
  await P.click('#btn-howto');
  assert(await P.isVisible('#howto'), 'howto not shown');
  await P.screenshot({ path: `${OUT}/02-howto.png` });
  await P.click('#btn-howto-close');
  assert(!(await P.isVisible('#howto')), 'howto still shown');
});

await check('campaign: level grid, L01 place by clicking, gold updates, start, result with stars', async () => {
  await P.click('#btn-campaign');
  await P.waitForSelector('.lvl');
  const n = await P.locator('.lvl').count();
  assert(n >= 15, `only ${n} levels`);
  await P.screenshot({ path: `${OUT}/03-campaign.png` });
  await P.locator('.lvl').first().click();
  await P.waitForFunction(() => window.__game.mode === 'build');
  const gold0 = await P.textContent('#gold-val');
  await P.click('.card >> nth=0');
  for (let i = 0; i < 6; i++) {
    const s = await toScreen(P, -6 + i * 2.4, 12);
    await P.mouse.click(s.x, s.y);
  }
  const placed = await P.evaluate(() => window.__game.army.filter((a) => a.team === 0).length);
  const gold1 = await P.textContent('#gold-val');
  await P.screenshot({ path: `${OUT}/04-build-L01.png` });
  assert(placed === 6, `placed ${placed}/6`);
  assert(gold0 !== gold1, 'gold did not change');
  // eraser removes one and restores gold
  await P.click('#tool-erase');
  const s = await toScreen(P, -6, 12);
  await P.mouse.click(s.x, s.y);
  const placed2 = await P.evaluate(() => window.__game.army.filter((a) => a.team === 0).length);
  assert(placed2 === 5, `eraser: ${placed2} left`);
  await P.click('#tool-erase');
  await P.click('#btn-start');
  await P.waitForFunction(() => window.__game.mode === 'battle');
  await P.waitForTimeout(1200);
  await P.screenshot({ path: `${OUT}/05-battle-L01.png` });
  await fastForward(P, 120);
  await P.waitForFunction(() => window.__game.mode === 'result', null, { timeout: 30000 });
  await P.waitForTimeout(1500);
  await P.screenshot({ path: `${OUT}/06-result.png` });
  const title = await P.textContent('#res-title');
  const stars = await P.locator('#res-stars i.on').count();
  assert(/Victory|Defeat|Draw/.test(title), `result title "${title}"`);
  // retry keeps the army
  await P.click('#res-retry');
  await P.waitForFunction(() => window.__game.mode === 'build');
  const kept = await P.evaluate(() => window.__game.army.filter((a) => a.team === 0).length);
  assert(kept === 5, `retry kept ${kept}`);
  return `${title.trim()} with ${stars} star(s), gold ${gold0} -> ${gold1}`;
});

await check('sandbox: every map loads, both sides placeable, unlimited gold, time controls, follow cam', async () => {
  await P.click('#btn-menu');
  await P.click('#pm-quit');
  await P.click('#btn-sandbox');
  await P.waitForFunction(() => window.__game.mode === 'build');
  const maps = await P.$$eval('#tool-map option', (o) => o.map((x) => x.value));
  for (const m of maps) {
    await P.selectOption('#tool-map', m);
    await P.waitForTimeout(400);
    await P.screenshot({ path: `${OUT}/07-sandbox-${m}.png` });
  }
  await P.selectOption('#tool-map', 'meadow');
  await P.click('#tool-inf');
  assert((await P.textContent('#gold-val')).includes('∞'), 'unlimited gold not shown');
  await P.click('.tab >> nth=1');
  await P.click('.card >> nth=0');
  for (let i = 0; i < 8; i++) {
    const s = await toScreen(P, -10 + i * 2.5, 10);
    await P.mouse.click(s.x, s.y);
  }
  await P.click('#tool-side');
  await P.click('.tab >> nth=0');
  await P.click('.card >> nth=2');
  for (let i = 0; i < 6; i++) {
    const s = await toScreen(P, -8 + i * 3, -10);
    await P.mouse.click(s.x, s.y);
  }
  const counts = await P.evaluate(() => [0, 1].map((t) => window.__game.army.filter((a) => a.team === t).length));
  assert(counts[0] === 8 && counts[1] === 6, `placed ${counts}`);
  await P.click('#btn-start');
  await P.waitForFunction(() => window.__game.mode === 'battle');
  for (const ts of ['0', '0.25', '2', '1']) {
    await P.click(`#time-ctl button[data-ts="${ts}"]`);
    const v = await P.evaluate(() => window.__game.userScale);
    assert(String(v) === ts, `time scale ${v} != ${ts}`);
  }
  await fastForward(P, 4);
  // click a unit to follow it
  const u = await P.evaluate(() => {
    const g = window.__game;
    const x = g.sim.alive[0][0];
    const v = new THREE.Vector3(x.pos.x, x.pos.y, x.pos.z).project(g.camera);
    return { x: ((v.x + 1) / 2) * g.canvas.clientWidth, y: ((1 - v.y) / 2) * g.canvas.clientHeight };
  });
  await P.mouse.click(u.x, u.y);
  await P.waitForTimeout(800);
  const mode = await P.evaluate(() => window.__game.rig.mode);
  await P.screenshot({ path: `${OUT}/08-follow.png` });
  assert(mode === 'follow', `camera mode ${mode}`);
  await P.keyboard.press('Escape');
  const mode2 = await P.evaluate(() => window.__game.rig.mode);
  assert(mode2 === 'free', 'Esc did not exit follow');
  // free-fly with WASD
  const p0 = await P.evaluate(() => window.__game.camera.position.z);
  await P.keyboard.down('KeyW');
  await P.waitForTimeout(600);
  await P.keyboard.up('KeyW');
  const p1 = await P.evaluate(() => window.__game.camera.position.z);
  assert(Math.abs(p1 - p0) > 0.5, 'WASD did not move the camera');
  await fastForward(P, 130);
  await P.waitForFunction(() => window.__game.mode === 'result', null, { timeout: 30000 });
  await P.waitForTimeout(800);
  await P.screenshot({ path: `${OUT}/09-sandbox-result.png` });
  return `${maps.length} maps`;
});

await check('performance: ~110 units battle (sim cost + render fps)', async () => {
  await P.click('#res-menu');
  await P.click('#btn-sandbox');
  await P.waitForFunction(() => window.__game.mode === 'build');
  const n = await P.evaluate(() => {
    const g = window.__game;
    g.session.unlimited = true;
    g.army = [];
    g.buildSim(5);
    const pool = Object.values(g.sim.defs).filter((u) => u.role !== 'legendary' && !u.hidden && u.cost < 250);
    let k = 0;
    for (let team = 0; team < 2; team++) {
      g.placeTeam = team;
      for (let i = 0; i < 56; i++) {
        g.selected = pool[(i * 7 + team * 3) % pool.length];
        const x = -26 + (i % 14) * 4;
        const z = (team === 0 ? 1 : -1) * (7 + Math.floor(i / 14) * 4);
        if (g.tryPlace(x, z, true)) k++;
      }
    }
    return k;
  });
  await P.click('#btn-start');
  await P.waitForFunction(() => window.__game.mode === 'battle');
  // sim cost measured directly (independent of the software rasterizer)
  const sim = await P.evaluate(() => {
    const g = window.__game;
    const t0 = performance.now();
    for (let i = 0; i < 300; i++) g.sim.step();
    return (performance.now() - t0) / 300;
  });
  // render fps under SwiftShader (CPU rasterizer; real GPUs are far faster)
  const fps = await P.evaluate(
    () =>
      new Promise((res) => {
        let f = 0;
        const t0 = performance.now();
        const tick = () => {
          f++;
          if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
          else res((f * 1000) / (performance.now() - t0));
        };
        requestAnimationFrame(tick);
      }),
  );
  await P.screenshot({ path: `${OUT}/10-perf-battle.png` });
  const draw = await P.evaluate(() => window.__game.renderer.r.info.render.calls);
  assert(n >= 100, `only ${n} units placed`);
  assert(sim < 12, `sim step ${sim.toFixed(1)} ms`);
  return `${n} units, sim ${sim.toFixed(2)} ms/step, ${fps.toFixed(1)} fps in SwiftShader, ${draw} draw calls`;
});
await D.ctx.close();

// ------------------------------------------------------------------ mobile
await check('mobile 390x844: tap to place, tray collapses, pinch zoom, start', async () => {
  const M = await open({ width: 390, height: 844 }, true);
  const page = M.page;
  await page.screenshot({ path: `${OUT}/11-mobile-title.png` });
  await page.tap('#btn-sandbox');
  await page.waitForFunction(() => window.__game.mode === 'build');
  await page.tap('.card >> nth=0');
  for (let i = 0; i < 4; i++) {
    const s = await toScreen(page, -4 + i * 2.5, 12);
    await page.touchscreen.tap(s.x, s.y);
    await page.waitForTimeout(80);
  }
  const placed = await page.evaluate(() => window.__game.army.length);
  await page.screenshot({ path: `${OUT}/12-mobile-build.png` });
  assert(placed === 4, `placed ${placed}/4 by tapping`);
  // synthesize a two-finger pinch through pointer events
  const z0 = await page.evaluate(() => window.__game.camera.position.distanceTo(new THREE.Vector3(0, 0, 0)));
  await page.evaluate(() => {
    const c = window.__game.canvas;
    const ev = (type, id, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, pointerType: 'touch', bubbles: true, isPrimary: id === 1 }));
    ev('pointerdown', 1, 150, 400);
    ev('pointerdown', 2, 240, 400);
    for (let k = 1; k <= 10; k++) {
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 150 - k * 8, clientY: 400, pointerType: 'touch' }));
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: 240 + k * 8, clientY: 400, pointerType: 'touch' }));
    }
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch' }));
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'touch' }));
  });
  await page.waitForTimeout(300);
  const z1 = await page.evaluate(() => window.__game.camera.position.distanceTo(new THREE.Vector3(0, 0, 0)));
  assert(z1 < z0 - 0.5, `pinch did not zoom (${z0.toFixed(1)} -> ${z1.toFixed(1)})`);
  await page.tap('#tool-hide');
  await page.waitForTimeout(400);
  const collapsed = await page.evaluate(() => document.getElementById('tray').classList.contains('collapsed'));
  assert(collapsed, 'tray did not collapse');
  await page.screenshot({ path: `${OUT}/13-mobile-collapsed.png` });
  await page.tap('#tool-hide');
  await page.tap('#tool-side');
  for (let i = 0; i < 3; i++) {
    const s = await toScreen(page, -3 + i * 3, -10);
    await page.touchscreen.tap(s.x, s.y);
  }
  await page.tap('#btn-start');
  await page.waitForFunction(() => window.__game.mode === 'battle');
  await fastForward(page, 3);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/14-mobile-battle.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!overflow, 'horizontal overflow on phone');
  assert(M.errors.length === 0, `console errors: ${M.errors.join(' | ')}`);
  await M.ctx.close();
  return `${placed} placed by tap, pinch ${z0.toFixed(1)}→${z1.toFixed(1)}`;
});

await browser.close();
srv.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} e2e checks passed`);
mkdirSync('artifacts/gauntlet', { recursive: true });
writeFileSync('artifacts/gauntlet/e2e.json', JSON.stringify(results, null, 1));
process.exit(passed === results.length ? 0 : 1);
