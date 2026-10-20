// Gauntlet capture tool. Build first (node build.mjs), then:
//   node shoot.mjs refs  --round N [--stages 0,1,final] [--angles street,high] [--tier high]
//        every stage x every reference angle → gauntlet/captures/round_N/stage_<id>/<angle>.png, plus compare sheets
//   node shoot.mjs cam   --stage ID --pos x,y,z --at x,y,z [--fov 70] [--ref file.png] --out file.png
//        one camera, optionally side by side with a reference (for calibration and quick builder checks)
//   node shoot.mjs sheets --round N   (progression and continuity sheets from a finished refs round)
//   node shoot.mjs multi --stage ID --list cams.json   ([{ ref, pos, at, fov, out }], one game load)
//   node shoot.mjs seq   --stage ID --angle A --do "<js run in game scope>" [--frames 24] [--every 6] --out dir
//        a frame sequence while something happens (reveals, upgrade installs). --start begins play (HUD on); --auto clicks through
//        dialogue and finishes install jobs. --stage pre3 is the end of Chapter 2 with the gate met: --do 'renovate(2)' records the unlock
//   node shoot.mjs walk  --stage ID [--device desktop|phone] --out dir
//        a scripted player walk up the far stairs, across the bridge and back, with HUD visible
// --stages accepts ids or 'final' (the last stage); default is every stage.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { launch, newPage, loadGame, setWeather, photo, unphoto, frames, shot, sz, ROOT, REF_W, REF_H } from './lib.mjs';
import { probe, stageList } from './stages.mjs';
import { ANGLES } from './angles.mjs';

const args = Object.fromEntries(process.argv.slice(3).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]]) : a), []));
const cmd = process.argv[2];
const v3 = s => s.split(',').map(Number);
const REFS = path.join(ROOT, 'references');

async function stagesWanted(browser) {
  const all = stageList(await probe(browser));
  if (!args.stages) return all;
  const want = String(args.stages).split(',').map(s => (s === 'final' ? all[all.length - 1].id : +s));
  return all.filter(s => want.includes(s.id));
}
function stageById(all, id) { return id === 'final' ? all[all.length - 1] : id === 'pre3' ? all.pre3 : all.find(s => s.id === +id); }

async function openStage(browser, stage, opts = {}) {
  if (args.w && !opts.device) Object.assign(opts, { w: +args.w, h: +(args.h || Math.round(+args.w * REF_H / REF_W)) }); // --w 836: half-size for sequences
  const page = await newPage(browser, opts);
  await loadGame(page, { save: stage.save, tier: args.tier || opts.tier || 'high' });
  await setWeather(page);
  return page;
}

// side-by-side sheet rendered by the browser itself (no image libraries needed)
async function sheet(browser, panes, out, title = '') {
  const page = await newPage(browser, { w: 1700, h: 400 });
  const img = f => 'data:image/png;base64,' + readFileSync(f).toString('base64');
  const cols = panes.length <= 2 ? panes.length : Math.min(3, panes.length);
  await page.setContent(`<body style="margin:0;background:#111;color:#eee;font:15px sans-serif"><div style="padding:6px 10px">${title}</div><div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;padding:6px">${panes.map(p => `<figure style="margin:0"><img src="${img(p.file)}" style="width:100%;display:block"><figcaption style="padding:3px 2px">${p.label}</figcaption></figure>`).join('')}</div></body>`);
  await page.waitForFunction(() => [...document.images].every(i => i.complete));
  await page.screenshot({ path: out, fullPage: true });
  await page.context().close();
}

async function captureAngles(browser, stage, angles, dir) {
  mkdirSync(dir, { recursive: true });
  const page = await openStage(browser, stage);
  await frames(page, 14); // weather is set directly; reflections and bloom settle
  for (const a of angles) {
    await photo(page, ANGLES[a].cam); await frames(page, 5);
    await shot(page, path.join(dir, a + '.png'));
  }
  const errs = page.errors.slice(); await page.context().close();
  return errs;
}

if (cmd === 'refs') {
  const browser = await launch();
  const stages = await stagesWanted(browser), all = stageList(await probe(browser));
  const angles = args.angles ? String(args.angles).split(',') : Object.keys(ANGLES);
  const base = path.join(ROOT, 'gauntlet/captures', 'round_' + (args.round ?? 'x'));
  const manifest = { stages: all.map(s => ({ id: s.id, label: s.label })), final: all[all.length - 1].id, angles: Object.fromEntries(angles.map(a => [a, ANGLES[a]])), errors: {} };
  // --jobs N stages render concurrently (SwiftShader is CPU-bound: 2 suits a 4-core box)
  const queue = stages.filter(st => !args.missing || angles.some(a => !existsSync(path.join(base, 'stage_' + st.id, a + '.png')))), jobs = +(args.jobs || 2);
  await Promise.all(Array.from({ length: jobs }, async () => { for (let st; (st = queue.shift());) {
    const errs = await captureAngles(browser, st, angles, path.join(base, 'stage_' + st.id));
    if (errs.length) manifest.errors[st.id] = errs;
    console.log('stage', st.id, st.label, errs.length ? 'ERRORS: ' + errs.join(' | ') : 'ok');
  } }));
  // compare sheets: reference vs capture for stage 0 (before) and the final stage (after)
  const cmpDir = path.join(base, 'compare'); mkdirSync(cmpDir, { recursive: true });
  for (const a of angles) for (const [which, sid] of [['before', 0], ['after', manifest.final]]) {
    const ref = ANGLES[a].refs[which], cap = path.join(base, 'stage_' + sid, a + '.png');
    if (ref && existsSync(cap)) await sheet(browser, [{ file: path.join(REFS, ref), label: 'reference: ' + ref }, { file: cap, label: `game: stage ${sid}, ${a}` }], path.join(cmpDir, `${a}_${which}.png`), `${a} — ${which}`);
  }
  writeFileSync(path.join(base, 'manifest.json'), JSON.stringify(manifest, null, 1));
  await browser.close();
} else if (cmd === 'cam') {
  const browser = await launch(); const all = stageList(await probe(browser)); const st = stageById(all, args.stage ?? 0);
  const page = await openStage(browser, st); await frames(page, 30);
  await photo(page, { pos: v3(args.pos), at: v3(args.at), fov: +(args.fov || 70) }); await frames(page, 6);
  const out = path.resolve(args.out || 'cam.png'); mkdirSync(path.dirname(out), { recursive: true });
  if (args.ref) { const tmp = out.replace(/\.png$/, '.raw.png'); await shot(page, tmp); await sheet(browser, [{ file: path.join(REFS, args.ref), label: args.ref }, { file: tmp, label: `stage ${st.id} pos ${args.pos} at ${args.at} fov ${args.fov || 70}` }], out); }
  else await shot(page, out);
  if (page.errors.length) console.log('ERRORS:', page.errors.join(' | '));
  await browser.close(); console.log(out);
} else if (cmd === 'sheets') {
  // node shoot.mjs sheets --round N : progression_<angle>.png (every stage in order, numbered only) and continuity_<stage>.png (every angle at one stage)
  const base = path.join(ROOT, 'gauntlet/captures', 'round_' + args.round), man = JSON.parse(readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  const browser = await launch(); const out = path.join(base, 'sheets'); mkdirSync(out, { recursive: true });
  const angles = Object.keys(man.angles);
  for (const a of angles) { const panes = man.stages.map(s => ({ file: path.join(base, 'stage_' + s.id, a + '.png'), label: String(s.id) })).filter(p => existsSync(p.file)); if (panes.length) await sheet(browser, panes, path.join(out, `progression_${a}.png`), `${a}: stages in order`); }
  for (const s of man.stages) { const panes = angles.map(a => ({ file: path.join(base, 'stage_' + s.id, a + '.png'), label: a })).filter(p => existsSync(p.file)); if (panes.length) await sheet(browser, panes, path.join(out, `continuity_stage_${s.id}.png`), `stage ${s.id}: every angle`); }
  await browser.close(); console.log(out);
} else if (cmd === 'multi') {
  // node shoot.mjs multi --stage ID --list cams.json : [{ ref, pos, at, fov, out }] all shot from one game load
  const browser = await launch(); const all = stageList(await probe(browser)); const st = stageById(all, args.stage ?? 0);
  const list = JSON.parse(readFileSync(path.resolve(String(args.list)), 'utf8'));
  const page = await openStage(browser, st); await frames(page, 30);
  for (const c of list) {
    await photo(page, { pos: c.pos, at: c.at, fov: c.fov || 70 }); await frames(page, 6);
    const out = path.resolve(c.out); mkdirSync(path.dirname(out), { recursive: true });
    if (c.ref) { const tmp = out.replace(/\.png$/, '.raw.png'); await shot(page, tmp); await sheet(browser, [{ file: path.join(REFS, c.ref), label: c.ref }, { file: tmp, label: `stage ${st.id} pos ${c.pos} at ${c.at} fov ${c.fov || 70}` }], out); }
    else await shot(page, out);
    console.log(out);
  }
  if (page.errors.length) console.log('ERRORS:', page.errors.join(' | '));
  await browser.close();
} else if (cmd === 'seq') {
  const browser = await launch(); const all = stageList(await probe(browser)); const st = stageById(all, args.stage ?? 0);
  const page = await openStage(browser, st); await frames(page, 30);
  if (args.start) { await page.evaluate(() => { const b = document.querySelector('#tCont') || document.querySelector('#tQuiet') || document.querySelector('#tNew'); b && b.click(); }); await frames(page, 10); await sz(page, 'DLG.active && dlgAdvance(); S.flags.noSpawn = 1; 0'); }
  if (args.angle) await photo(page, ANGLES[args.angle].cam);
  const out = path.resolve(args.out || 'seq'); mkdirSync(out, { recursive: true });
  if (args.do) await sz(page, String(args.do));
  const n = +(args.frames || 24), every = +(args.every || 6);
  // --auto: click through dialogue and finish install jobs, so story sequences play out hands-free
  for (let i = 0; i < n; i++) { await frames(page, every); if (args.auto) await sz(page, "if (DLG.active) dlgAdvance(); if (ST.cur && ST.cur.id === 'job') cheatFinishBrew(); 0"); await shot(page, path.join(out, String(i).padStart(3, '0') + '.png')); }
  if (page.errors.length) console.log('ERRORS:', page.errors.join(' | '));
  await browser.close();
} else if (cmd === 'walk') {
  const browser = await launch(); const all = stageList(await probe(browser)); const st = stageById(all, args.stage ?? 0);
  const device = args.device || 'desktop';
  const page = await openStage(browser, st, { device, tier: device === 'phone' ? 'medium' : 'high' });
  // start the game (Continue on a save, quiet new game otherwise), then walk a fixed route by setting the player's heading and holding W / the stick
  await page.evaluate(() => { const b = document.querySelector('#tCont') || document.querySelector('#tQuiet') || document.querySelector('#tNew'); b && b.click(); });
  await frames(page, 20);
  await sz(page, 'DLG.active = false; S.flags.noSpawn = 0; player.pos.set(1.6, 0.12, 13.3); player.yaw = Math.PI / 2; player.pitch = 0.05; 0');
  const out = path.resolve(args.out || 'walk'); mkdirSync(out, { recursive: true });
  const legs = [[Math.PI / 2, 40], [Math.PI, 0], [0, 70], [Math.PI, 30]]; // west up the stairs, turn to face the shop, cross, look back
  let k = 0;
  for (const [yaw, steps] of legs) {
    await sz(page, `player.yaw = ${yaw}; 0`);
    if (device === 'phone') await sz(page, 'TOUCH.stick.set(0, 1); TOUCH.stickMag = 0.8; 0'); else await page.keyboard.down('KeyW');
    for (let i = 0; i < steps; i += 10) { await frames(page, 10); await shot(page, path.join(out, String(k++).padStart(3, '0') + '.png')); }
    if (device === 'phone') await sz(page, 'TOUCH.stick.set(0, 0); TOUCH.stickMag = 0; 0'); else await page.keyboard.up('KeyW');
    await frames(page, 4); await shot(page, path.join(out, String(k++).padStart(3, '0') + '.png'));
  }
  console.log('player ended at', await sz(page, 'player.pos.toArray().map(v => v.toFixed(2)).join(",")'));
  if (page.errors.length) console.log('ERRORS:', page.errors.join(' | '));
  await browser.close();
} else {
  console.log('usage: node shoot.mjs refs|cam|seq|walk [options] (see the header of this file)');
}
