/* ================= cheat menu: press ` (backquote) or F8, or tap the money pill 3 times ================= */
const CHEAT = { inf: false, speed: 1, run: 1, perfect: false, open: false, fly: false };
function cheatTick() {
  if (!CHEAT.inf || !S) return;
  if (S.yen < 9999999) S.yen = 9999999; S.leaves = Math.max(S.leaves, 999); S.roasted = Math.max(S.roasted || 0, 999);
  S.water = capWater(); S.charge = capCharge();
}
function cheatReload(mut) { mut(); window.__noSave = false; save(); location.reload(); }
const CHEAT_FLAGS = { shutterUp: 1, crew: 1, cleaned: 1, counterBuilt: 1, wired: 1, signHung: 1, plumbed: 1, noren: 1, kettle: 1, power: 1, open: 1, alleyOpen: 1, letter0: 1, titleShown: 1, c1sato: 1, supply: 1, ctlShown: 1, lookSaid: 1, aiko1: 1, meet_rin: 1, kuroda1: 1, sato2: 1, letter1: 1, letter2: 1, odaService: 1, battery: 1, kuroda2: 1, kuroda3: 1, kuroda5: 1, meet_hana: 1, renoF2: 1 };
const CHEATS = [
  ['Resources', [
    ['Infinite everything', () => CHEAT.inf ? 'ON' : 'off', () => { CHEAT.inf = !CHEAT.inf; cheatTick(); }],
    ['+ ¥100,000', null, () => { S.yen += 100000; }],
    ['Fill leaves, water, roast, charge', null, () => { S.leaves += 500; S.roasted = (S.roasted || 0) + 200; S.water = capWater(); S.charge = capCharge(); }],
  ]],
  ['Brewing', [
    ['Every brew is perfect (3★)', () => CHEAT.perfect ? 'ON' : 'off', () => { CHEAT.perfect = !CHEAT.perfect; }],
    ['Finish current brew now (3★)', null, () => cheatFinishBrew()],
    ['Master every tea', null, () => { for (const r of RECIPES) S.mastery[r.id] = MASTER_N; }],
    ['Fill every tea-counter section', null, () => { const st = teaStore(); for (const rid of teaSlots()) { st[rid] = st[rid] || []; while (st[rid].length < teaCap()) st[rid].push({ stars: 3 }); } refreshTeaCups(); }],
    ['Give me a full tray of the most-wanted tea', null, () => { const c = CUST.find(q => q.state === 'order'); const rid = c ? c.rid : RID.sencha; holdItem({ kind: 'tray', n: 6, rid, stars: 3 }); }],
  ]],
  ['Customers', [
    ['Serve everyone waiting (3★)', null, () => { let n = 0; for (const c of CUST.slice()) { if (c.state !== 'order') continue; holdItem({ kind: 'tray', n: 1, rid: c.rid, stars: 3 }); serveCustomer(c); n++; } holdItem(null); toast(`Served ${n}.`); }],
    ['Spawn a customer', null, () => { S.flags.noSpawn = 0; for (const s of SEATS) { if (s.occ) continue; if (spawnCustomer({ seat: s.id })) return; } toast('No free seats.'); }],
    ['Stop / allow customers', () => S.flags.noSpawn ? 'stopped' : 'allowed', () => { S.flags.noSpawn = S.flags.noSpawn ? 0 : 1; }],
  ]],
  ['Shop', [
    ['Install every upgrade', null, () => cheatReload(() => { for (const u of UPG) S.up[u.id] = u.max || 1; S.crates = []; S.pending = []; })],
    ['Hire every staff member', null, () => cheatReload(() => { for (const s of STAFF) S.staff[s.id] = 1; })],
  ]],
  ['Chapter (reloads)', [1, 2, 3, 4, 5].map(n => [`Jump to chapter ${n}`, () => S.ch === n ? 'current' : '', () => cheatReload(() => { S.ch = n; S.beat = `c${n}_open`; Object.assign(S.flags, CHEAT_FLAGS); for (let k = 2; k <= n; k++) S.flags[`c${k}base`] = S.stats.served; })])],
  ['World', [
    ['Weather: clear', null, () => { forceWeather = { rain: 0, name: 'Clear', mm: 0 }; }],
    ['Weather: steady rain', null, () => { forceWeather = { rain: 1, name: 'Steady rain', mm: 4.5 }; }],
    ['Weather: thunderstorm', null, () => { forceWeather = { rain: 1, storm: true, name: 'Thunderstorm', mm: 18 }; }],
    ['Weather: back to normal', null, () => { forceWeather = null; }],
    ['Game speed', () => CHEAT.speed + '×', () => { CHEAT.speed = CHEAT.speed >= 4 ? 1 : CHEAT.speed * 2; }],
    ['Walk speed', () => CHEAT.run + '×', () => { CHEAT.run = CHEAT.run >= 3 ? 1 : CHEAT.run + 1; }],
    ['Flight (no walls; Space up, C down, look to steer)', () => CHEAT.fly ? 'ON' : 'off', () => { CHEAT.fly = !CHEAT.fly; player.vel.set(0, 0); if (!CHEAT.fly) { const h = supportAt(player.pos.x, player.pos.z, player.pos.y); if (h !== null) player.pos.y = h; } toast(CHEAT.fly ? 'Flight on. Look where you want to go; Space rises, C sinks, Shift is fast.' : 'Flight off. Back on your feet.'); }],
  ]],
  ['Teleport', [
    ['Ground floor', null, () => cheatTp(0, 0, -1.6)], ['Brewing bench', null, () => cheatTp(-1.45, 0, -4.2)], ['Second floor', null, () => cheatTp(0.2, 3.6, -3.0)],
    ['Third floor', null, () => cheatTp(0.2, 6.8, -3.0)], ['Roof', null, () => cheatTp(0.2, 10, -3.0)], ['Street', null, () => cheatTp(0.6, 0.12, 4.0)], ['Alley', null, () => cheatTp(3.6, 0.06, -6.0)],
  ]],
];
function cheatTp(x, y, z) { player.pos.set(x, y, z); player.vel.set(0, 0); closePanel(); }
function cheatFinishBrew() { const st = ST.cur; if (!st) { toast('Start a brew first.'); return; } if (st.id === 'kettle') endStation({ rid: st.rid, n: potCups(), stars: 3 }); else if (st.id === 'matcha') endStation({ stars: 3 }); else endStation(st.id === 'job' ? true : { stars: 3 }); closePanel(); }
function openCheats() {
  if (!started) return;
  const html = `<h2>Cheats</h2><p class="sub">Backquote / F8, or tap the money 3×. Changes save with your game.</p><div style="display:flex;flex-direction:column;gap:10px;max-height:62vh;overflow:auto">` +
    CHEATS.map(([sec, items], si) => `<div><div style="font-size:12px;letter-spacing:.08em;opacity:.7;margin:2px 0 6px">${sec.toUpperCase()}</div><div style="display:flex;flex-wrap:wrap;gap:6px">` +
      items.map(([label, state], ii) => { const s = state ? state() : ''; return `<button class="btn ghost" data-c="${si}.${ii}" style="flex:1 1 46%;min-height:44px;display:flex;justify-content:space-between;gap:8px;text-align:left"><span>${label}</span>${s ? `<b style="opacity:.8">${s}</b>` : ''}</button>`; }).join('') + `</div></div>`).join('') +
    `</div><div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn" data-x>Close</button></div>`;
  CHEAT.open = true; UI.onClose = () => { CHEAT.open = false; };
  openPanel(html, box => {
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-x')) { closePanel(); return; }
      const [si, ii] = b.dataset.c.split('.').map(Number); const it = CHEATS[si][1][ii];
      try { it[2](); Snd.soft(); } catch (err) { toast('Cheat failed: ' + err.message); }
      if (CHEAT.open && !$('#panel').hidden) openCheats(); updateUI(0);
    });
  });
}
addEventListener('keydown', e => { if (e.code === 'Backquote' || e.code === 'F8') { e.preventDefault(); if (CHEAT.open) closePanel(); else openCheats(); } });
{ let taps = [], el = $('#res'); if (el) el.addEventListener('pointerdown', () => { const t = performance.now(); taps = taps.filter(q => t - q < 700); taps.push(t); if (taps.length >= 3) { taps = []; openCheats(); } }); }

