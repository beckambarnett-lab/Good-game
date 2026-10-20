// Shared harness plumbing: launch Chromium, serve the built game, load a save state, park the camera.
import { chromium } from 'playwright-core';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
const DIST = process.env.SZ_DIST ? path.resolve(process.env.SZ_DIST) : path.join(ROOT, 'dist/index.html'); // SZ_DIST: shoot another checkout's build (builder worktrees)
const FONT_DIR = path.join(HERE, 'cache/fonts');
const THREE_DIR = path.join(HERE, 'node_modules/three');
const ORIGIN = 'http://shizuku.test/';

export const REF_W = 1672, REF_H = 941; // the reference images' size

// every overlay the game draws over the canvas; hidden for reference captures
const HIDE_UI = '#title,#hud,#teaHud,#orders,#task,#cross,#holdRing,#prompt,#marker,#toast,#lockHint,#touch,#tbtns,#dlg,#phone,#panel,#letter,#card,#pops,#stationUI,#stBack{display:none!important}';

export async function launch() {
  return chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
}

async function routes(page) {
  await page.route(ORIGIN + '**', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: readFileSync(DIST) }));
  await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\//, r => {
    const rel = r.request().url().split('three@0.160.0/')[1].split('?')[0];
    r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(path.join(THREE_DIR, rel)) });
  });
  await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: existsSync(path.join(FONT_DIR, 'fonts.css')) ? readFileSync(path.join(FONT_DIR, 'fonts.css')) : '' }));
  await page.route(/fonts\.gstatic\.com/, r => {
    const f = path.join(FONT_DIR, 'f', createHash('md5').update(r.request().url() + '\n').digest('hex').slice(0, 16));
    if (existsSync(f)) r.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(f) }); else r.fulfill({ status: 404, body: '' });
  });
}

// device: 'desktop' (default) or 'phone' (touch, coarse pointer, 390x844 @3x)
export async function newPage(browser, { device = 'desktop', w = REF_W, h = REF_H } = {}) {
  const ctx = device === 'phone'
    ? await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    : await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(300000); ctx.setDefaultNavigationTimeout(300000); // SwiftShader on a busy shared box
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  await routes(page);
  return page;
}

// load the game with an optional save object, at a quality tier, with debug hooks on and saving off
export async function loadGame(page, { save = null, tier = 'high' } = {}) {
  await page.addInitScript(([sv, t]) => {
    window.__szDebug = true; window.__noSave = true; window.__noAdapt = true; window.__szTier = t;
    try { localStorage.clear(); if (sv) localStorage.setItem('shizuku-save-v1', JSON.stringify(sv)); } catch (e) { }
  }, [save, tier]);
  await page.goto(ORIGIN, { timeout: 300000 });
  await page.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').hidden, null, { timeout: 240000 });
}

export const sz = (page, code) => page.evaluate(c => window.__sz(c), code);

// steady night rain like the references
export async function setWeather(page, w = { rain: 0.8, name: 'Steady rain', mm: 4.5 }) {
  await sz(page, `forceWeather = ${JSON.stringify(w)}; WX.rain = ${w.rain}; WX.target = ${w.rain}; 0`);
}

export async function photo(page, cam) {
  await page.addStyleTag({ content: HIDE_UI }).catch(() => { });
  await page.evaluate(c => { window.__szPhoto = c; }, cam);
}
export async function unphoto(page) { await page.evaluate(() => { window.__szPhoto = null; }); await sz(page, 'hudPass.enabled = true; 0'); }

// let n frames render (headless SwiftShader runs a few fps, so wait on frame count, not time)
export async function frames(page, n = 8) {
  await page.evaluate(n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
}

// SwiftShader frames can take seconds under load: long timeout, one retry
export async function shot(page, file) {
  try { await page.screenshot({ path: file, timeout: 180000 }); }
  catch (e) { await frames(page, 2); await page.screenshot({ path: file, timeout: 300000 }); }
}
