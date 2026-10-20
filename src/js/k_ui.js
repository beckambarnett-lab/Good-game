/* ================= UI ================= */
const UI = { modal: false, yenShown: 0, task: '', taskTarget: null, toastQ: [], toastT: 0 };
// ---------- toasts & pops ----------
function toast(msg) { if (UI.toastQ.includes(msg) || ($('#toast').textContent === msg && UI.toastT > 0)) return; UI.toastQ.push(msg); if (UI.toastQ.length > 3) UI.toastQ.shift(); }
const POPS = [];
function popAt(p, text, cls) { const el = document.createElement('div'); el.className = 'pop ' + (cls || ''); el.textContent = text; $('#pops').appendChild(el); POPS.push({ el, p: p.clone(), age: 0 }); if (POPS.length > 14) { const o = POPS.shift(); o.el.remove(); } }
const _pv = new THREE.Vector3();
function project(p) { _pv.copy(p).project(camera); if (_pv.z > 1) return null; return { x: (_pv.x * 0.5 + 0.5) * vw, y: (-_pv.y * 0.5 + 0.5) * vh }; }
function updatePops(dt) { for (let i = POPS.length - 1; i >= 0; i--) { const o = POPS[i]; o.age += dt; if (o.age > 1.6) { o.el.remove(); POPS.splice(i, 1); continue; } _pv.copy(o.p); _pv.y += o.age * 0.5; const s = project(_pv); if (!s) { o.el.style.opacity = 0; continue; } o.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-50%)`; o.el.style.opacity = String(1 - Math.pow(o.age / 1.6, 2)); } }
function updateToast(dt) { const el = $('#toast'); if (UI.toastT > 0) { UI.toastT -= dt; if (UI.toastT <= 0) el.classList.remove('show'); } else if (UI.toastQ.length) { el.textContent = UI.toastQ.shift(); el.classList.add('show'); UI.toastT = Math.max(3, el.textContent.length * 0.055); } }
// ---------- HUD ----------
function setTask(text, target) { UI.task = text || ''; UI.taskTarget = target || null; $('#task').hidden = !text; $('#taskText').textContent = text || ''; $('#taskTag').textContent = S.ch === 0 ? 'MOVE-IN' : CHAPTERS[Math.min(S.ch, 6)].kick; }
const ORD_PLACE = { g0: 'counter', out: 'bench', f2: '2F', terrace: 'terrace', togo: 'cart', roof: 'roof' };
let ordT = 0;
function updateOrdersBar(dt) {
  const el = $('#orders'); ordT -= dt; if (ordT > 0) return; ordT = 0.4; tickOrderTablet(0.5); // wall tablet at the brewing bench shows the same open orders
  const show = SET.ordersBar !== false && started && S.ch >= 1 && !player.focus && !UI.modal && !DLG.active;
  const g = {}; if (show) for (const c of CUST) { if (c.state !== 'order') continue; const k = c.rid; const o = g[k] = g[k] || { n: 0, coming: 0, places: new Set(), u: 0 }; o.n++; if (c.claimed) o.coming++; o.places.add(ORD_PLACE[c.seat.sp] || c.seat.sp); o.u = Math.max(o.u, c.patMax && !c.noPat ? c.pat / c.patMax : 0); }
  const keys = Object.keys(g).sort((a, b) => g[b].u - g[a].u);
  if (!keys.length) { if (!el.hidden) el.hidden = true; return; }
  el.hidden = false; el.innerHTML = keys.map(k => { const o = g[k], R = RECIPES[k]; return `<div class="oc ${o.u > 0.7 ? 'hot' : o.u > 0.4 ? 'mid' : ''}"><b>${R.icon}</b><span>${R.name} ×${o.n}</span><em>${[...o.places].join(' · ')}${o.coming ? ` · ${o.coming} on the way` : ''}</em><i style="width:${Math.round((1 - o.u) * 100)}%"></i></div>`; }).join('');
}
function updateUI(dt) {
  updateOrdersBar(dt);
  { const tk = $('#task'), to = $('#toast'), rs = $('#res'); if (tk && rs && !$('#hud').hidden) { const want = Math.max(64, rs.getBoundingClientRect().bottom + 8) + 'px'; if (tk.style.top !== want) tk.style.top = want; } { const od = $('#orders'); if (od && !od.hidden) { const r = (tk && !tk.hidden && tk.textContent) ? tk.getBoundingClientRect() : rs.getBoundingClientRect(); const want = (r.bottom + 6) + 'px'; if (od.style.top !== want) od.style.top = want; } } if (tk && to) { const r = tk.getBoundingClientRect(); const top = (tk.hidden || !tk.textContent || getComputedStyle(tk).opacity === '0') ? 0 : r.bottom + 8; const od2 = $('#orders'); const top2 = od2 && !od2.hidden ? Math.max(top, od2.getBoundingClientRect().bottom + 8) : top; const want = top2 ? top2 + 'px' : ''; if (to.style.top !== want) to.style.top = want; } }
  UI.yenShown = Math.abs(UI.yenShown - S.yen) < 1 ? S.yen : lerp(UI.yenShown, S.yen, 1 - Math.exp(-dt * 8));
  $('#rYen').textContent = fmt(UI.yenShown); $('#rLeaf').textContent = fmt(S.leaves); $('#rWater').textContent = S.water.toFixed(0) + '/' + capWater() + ' L';
  $('#rChargeWrap').hidden = S.ch < 2; $('#rCharge').textContent = S.charge.toFixed(1) + '/' + capCharge().toFixed(1);
  $('#wxName').textContent = WX.name; $('#wxRate').textContent = WX.mm.toFixed(1) + ' mm/h';
  updateToast(dt); updatePops(dt);
  // objective marker
  const mk = $('#marker'); const tgt = UI.taskTarget && (typeof UI.taskTarget === 'function' ? UI.taskTarget() : UI.taskTarget);
  if (tgt && !player.focus && !DLG.active && !PHONE.open && !UI.modal) {
    const d = tgt.distanceTo(player.pos); _pv.copy(tgt).project(camera); const on = _pv.z < 1 && Math.abs(_pv.x) < 0.9 && Math.abs(_pv.y) < 0.85;
    if (!on || d > 6) { let x = _pv.x, y = _pv.y; if (_pv.z > 1) { x = -x; y = -y; } const m = Math.max(Math.abs(x) / 0.88, Math.abs(y) / 0.8, on ? 0 : 1); if (!on) { x /= m; y /= m; } mk.hidden = false; mk.style.left = ((x * 0.5 + 0.5) * vw) + 'px'; mk.style.top = ((-y * 0.5 + 0.5) * vh) + 'px'; $('#markerD').textContent = Math.round(d) + ' m' + (Math.abs(tgt.y - player.pos.y) > 2 ? (tgt.y > player.pos.y ? ' ↑' : ' ↓') : ''); }
    else mk.hidden = true;
  } else mk.hidden = true;
  $('#task').style.opacity = (DLG.active || player.focus || PHONE.open) ? 0.0 : 1;
  updateLockHint();
  if (typeof updateTickets === 'function') updateTickets(dt);
}
// ---------- dialogue ----------
const DLG = { active: false, q: [], cur: null, shown: 0, t: 0, done: null, typing: false };
const SPEAKERS = { mako: ['Mako', '#33e4ff'], gen: ['Gen-san', '#ffcf8f'], tomo: ['Tomo', '#ffb35c'], rin: ['Rin', '#ff7aa8'], kenta: ['Kenta', '#7fd8c8'], yui: ['Yui', '#ffd86a'], sora: ['Sora', '#b8a0ff'], hana: ['Hana', '#8fd16a'], oda: ['Mrs. Oda', '#d8b4ff'], kuroda: ['Kuroda', '#ff3d9a'], you: ['You', '#ede6d7'], sato: ['Mr. Sato', '#c8b48a'], aiko: ['Aiko', '#9fd0c8'], k7: ['K-7', '#7ad8ff'], yume: ['Yume', '#ffb0d8'], twins: ['The Okada twins', '#e0b53a'], narr: ['', '#a9b0bd'], cust: ['Customer', '#ede6d7'] };
function say(lines, done, lookFn) { DLG.q = lines.slice(); DLG.done = done || null; DLG.lookFn = lookFn || null; DLG.active = true; releasePointer(); $('#dlg').hidden = false; nextLine(); }
function nextLine() {
  const l = DLG.q.shift(); if (!l) { endDialogue(); return; }
  DLG.cur = l; DLG.shown = 0; DLG.typing = true; const sp = SPEAKERS[l.w] || [l.w, '#ede6d7'];
  $('#dlgName').textContent = l.name || sp[0]; $('#dlgName').style.color = sp[1]; $('#dlgText').textContent = ''; $('#dlgCh').innerHTML = ''; $('#dlgMore').hidden = true;
  dialogLook = l.at ? (typeof l.at === 'function' ? l.at() : l.at) : (DLG.lookFn ? DLG.lookFn(l.w) : null);
  if (l.fx) l.fx();
}
function dlgAdvance() {
  if (!DLG.active || !DLG.cur) return; if (DLG.cur.ch && !DLG.typing) return;
  if (DLG.typing) { DLG.shown = DLG.cur.t.length; return; }
  nextLine();
}
function endDialogue() { DLG.active = false; DLG.cur = null; $('#dlg').hidden = true; dialogLook = null; const d = DLG.done; DLG.done = null; if (d) d(); }
function updateDialogue(dt) {
  if (!DLG.active || !DLG.cur) return; const l = DLG.cur;
  if (DLG.typing) { DLG.shown += dt * 55 * (SET.text >= 1.25 ? 1 : 1); const n = Math.min(l.t.length, Math.floor(DLG.shown)); $('#dlgText').textContent = l.t.slice(0, n); if (frameN % 4 === 0 && n < l.t.length) Snd.blip(); if (n >= l.t.length) { DLG.typing = false; DLG.t = 0; if (l.ch) { $('#dlgCh').innerHTML = l.ch.map((c, i) => `<button data-i="${i}">${c[0]}</button>`).join(''); } else $('#dlgMore').hidden = false; } }
  else if (SET.autoAdv && !l.ch) { DLG.t += dt; if (DLG.t > 1.4 + l.t.length * 0.03) nextLine(); }
}
$('#dlg').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b && DLG.cur && DLG.cur.ch) { const c = DLG.cur.ch[+b.dataset.i]; Snd.click(); if (c[1]) DLG.q.unshift(...c[1]); nextLine(); return; } if (!COARSE) dlgAdvance(); });
$('#dlg').addEventListener('touchstart', e => { const b = e.target.closest('button'); if (b) return; e.preventDefault(); dlgAdvance(); }, { passive: false });
// ---------- phone ----------
const PHONE = { open: false, app: 'home' };
function togglePhone(v) { const open = v === undefined ? !PHONE.open : v; if (open === PHONE.open) return; PHONE.open = open; $('#phone').classList.toggle('off', !open); if (open) { releasePointer(); renderPhone('home'); Snd.soft(); } else { Snd.soft(); } }
$('#btnPhone').addEventListener('click', () => { if (started && !DLG.active && !player.focus) togglePhone(); });
$('#phClose').addEventListener('click', () => togglePhone(false));
$('#phBack').addEventListener('click', () => { if (PHONE.app === 'home') togglePhone(false); else renderPhone('home'); });
const APPS = [
  { id: 'supply', name: 'Kumo Supply', ic: '雲', bg: 'linear-gradient(135deg,#ffb35c,#d9772e)' },
  { id: 'crew', name: 'Crew', ic: '人', bg: 'linear-gradient(135deg,#ff7aa8,#b83a6a)' },
  { id: 'msgs', name: 'Messages', ic: '話', bg: 'linear-gradient(135deg,#33e4ff,#2a6ab0)' },
  { id: 'recipes', name: 'Recipes', ic: '茶', bg: 'linear-gradient(135deg,#8fbf3f,#3f6b3a)' },
  { id: 'map', name: 'Building', ic: '建', bg: 'linear-gradient(135deg,#8b5cff,#3a2a8a)' },
  { id: 'settings', name: 'Settings', ic: '⚙', bg: 'linear-gradient(135deg,#6f7787,#2a2c33)' },
];
function phoneBadges() { return { supply: availableUpgrades().filter(u => canPay(u.cost)).length + (S.leaves < 5 && S.flags.supply ? 1 : 0), msgs: S.unread || 0, crew: STAFF.filter(s => s.ch <= S.ch && !S.staff[s.id] && (s.auto || S.flags['meet_' + s.id])).length }; }
function renderPhone(app) {
  PHONE.app = app; const b = $('#phBody'); const a = APPS.find(x => x.id === app); $('#phTitle').textContent = a ? a.name : 'Shizuku'; $('#phBack').textContent = app === 'home' ? '✕' : '‹';
  const d = new Date(); $('#phTime').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  if (app === 'home') { const bd = phoneBadges(); b.innerHTML = `<div class="card" style="margin-top:2px"><h3>${yen(S.yen)}</h3><p>${S.ch === 0 ? 'Move-in day.' : CHAPTERS[S.ch].kick + ' · ' + CHAPTERS[S.ch].title} · ${S.stats.served} cups served</p></div><div class="apps">` + APPS.map(x => `<button class="app" data-app="${x.id}"><span class="ic" style="background:${x.bg}">${x.ic}</span>${x.name}${bd[x.id] ? `<span class="bd">${bd[x.id]}</span>` : ''}</button>`).join('') + '</div>'; }
  else if (app === 'supply') renderSupply(b);
  else if (app === 'crew') renderCrew(b);
  else if (app === 'msgs') { S.unread = 0; const ms = (S.msgs || []).slice().reverse(); b.innerHTML = ms.length ? ms.map(m => { const sp = SPEAKERS[m.w] || [m.w, '#aaa']; return `<div class="msg"><div class="av" style="background:${sp[1]}">${sp[0][0]}</div><div><div class="who">${sp[0]}</div><div class="bub">${m.t}</div></div></div>`; }).join('') : '<p class="card">No messages yet.</p>'; }
  else if (app === 'recipes') { b.innerHTML = '<div class="sec">Your menu</div>' + unlockedRecipes().map(r => { const m = S.mastery[r.id] || 0; return `<div class="card"><h3>${r.jp} ${r.name} <span class="price" style="float:right">${yen(r.price)}</span></h3><p>${r.st === 'kettle' ? `${r.temp}°C · steep ${fmtTea(r.steep)}${r.rice ? ' · add roasted rice' : ''}${r.cool ? ' · cool in the bowl first' : ''}` : r.st === 'matcha' ? 'Sift, add 80°C water, whisk to a foam, present.' : r.st === 'shaker' ? 'Ice, pour, cap, shake to the beat.' : ''}</p><div class="row"><span class="mast">${Array.from({ length: MASTER_N }, (_, i) => `<i class="${i < m ? 'f' : ''}"></i>`).join('')}</span><span style="font-size:12px;color:var(--ink2)">${m >= MASTER_N ? 'Mastered' : `${m}/${MASTER_N} three-star brews`}</span></div></div>`; }).join(''); }
  else if (app === 'map') renderBuilding(b);
  else if (app === 'settings') renderSettings(b);
  b.scrollTop = 0;
}
function fmtTea(m) { const mm = Math.floor(m), ss = Math.round((m - mm) * 60); return `${mm}:${String(ss).padStart(2, '0')}`; }
$('#phBody').addEventListener('click', e => {
  const ap = e.target.closest('[data-app]'); if (ap) { Snd.click(); renderPhone(ap.dataset.app); return; }
  const by = e.target.closest('[data-buy]'); if (by) { buyUpgrade(by.dataset.buy); renderPhone('supply'); return; }
  const hr = e.target.closest('[data-hire]'); if (hr) { hireStaff(hr.dataset.hire); renderPhone('crew'); return; }
  const st = e.target.closest('[data-set]'); if (st) { applySetting(st.dataset.set, st.dataset.v); renderPhone('settings'); return; }
});
$('#phBody').addEventListener('input', e => { const r = e.target.closest('input[type=range]'); if (r) { SET[r.dataset.k] = +r.value; saveSet(); Snd.applyVol(); if (r.dataset.k === 'fov') resize(); } });
function renderSupply(b) {
  const av = availableUpgrades(); const owned = UPG.filter(u => lv(u.id) && (!u.max || lv(u.id) >= u.max));
  let h = `<p style="font-size:13px;color:var(--ink2);margin:2px 2px 6px">Tomo drops every order at the alley door in about 20 seconds. Carry it to its glowing outline and install it.</p>`;
  h += `<div class="sec">Supplies</div>` + [['leaves', 'Tea leaves ×10', 600], ['leaves50', 'Tea leaves ×50 (bulk)', 2700]].map(([id, nm, c]) => `<div class="card"><h3>${nm}</h3><p>On the shelf right away. You have ${S.leaves} portion${S.leaves === 1 ? '' : 's'}.</p><div class="row"><span class="price">${yen(c)}</span><button class="btn" data-buy="${id}" ${canPay(c) ? '' : 'disabled'}>${canPay(c) ? 'Buy' : 'Not enough'}</button></div></div>`).join('');
  if (S.crates.length) h += `<div class="card" style="border-color:rgba(255,179,92,.4)"><h3>Waiting at the alley door</h3><p>${S.crates.map(c => (UID[c] ? UID[c].name : c)).join(', ')}</p></div>`;
  const spaces = { facade: 'Outside the shop', street: 'Outside the shop', alley: 'Alley', ground: 'Ground floor', f2: 'Tatami room', terrace: 'Terrace', f3: 'Garden floor', roof: 'Roof' };
  let lastSp = '';
  for (const u of av) { const sp = spaces[u.space]; if (sp !== lastSp) { h += `<div class="sec">${sp}</div>`; lastSp = sp; } const ordered = S.crates.includes(u.id) || (S.pending || []).some(p => p.id === u.id); h += `<div class="card"><h3>${u.name}${u.max ? ` <span style="color:var(--ink3);font-weight:400">${lv(u.id)}/${u.max}</span>` : ''}</h3><p>${u.fx}</p><div class="row"><span class="price">${yen(u.cost)} · ${{ bolt: 'Bolt it', wire: 'Wire it', align: 'Align it', hang: 'Hang it', place: 'Place it' }[u.job]}</span><button class="btn" data-buy="${u.id}" ${ordered || !canPay(u.cost) ? 'disabled' : ''}>${ordered ? 'Ordered' : 'Order'}</button></div></div>`; }
  if (!av.length) h += '<div class="card"><p>Nothing new to order right now. More arrives as the shop grows.</p></div>';
  if (owned.length) h += `<div class="sec">Installed</div><p style="font-size:12.5px;color:var(--ink3);margin:4px 2px">${owned.map(u => u.name).join(' · ')}</p>`;
  b.innerHTML = h;
}
function renderCrew(b) {
  let h = ''; for (const s of STAFF) { if (s.ch > S.ch || !(s.auto || S.flags['meet_' + s.id])) { h += `<div class="card" style="opacity:.45"><h3>???</h3><p>Someone you haven't met yet.</p></div>`; continue; } const hired = S.staff[s.id]; h += `<div class="card"><h3 style="color:${s.col}">${s.name} <span style="color:var(--ink2);font-weight:400">· ${s.role}</span></h3><p>${s.what}</p><div class="row"><span class="price">${hired ? `Wage ${yen(s.wage)}/min` : `${yen(s.cost)} to hire · ${yen(s.wage)}/min`}</span>${hired ? '<span style="color:var(--good);font-size:13px">On shift</span>' : `<button class="btn" data-hire="${s.id}" ${canPay(s.cost) ? '' : 'disabled'}>Hire</button>`}</div></div>`; }
  b.innerHTML = h;
}
function renderBuilding(b) {
  const rows = [['roof', 'Roof', 5], ['f3', 'Floor 3 · garden', 4], ['f2', 'Floor 2 · tatami room', 2], ['out', 'Yatai and terrace', 3], ['g0', 'Ground floor · counter', 0]];
  b.innerHTML = rows.map(([id, n, ch]) => `<div class="card" style="${S.ch >= ch ? '' : 'opacity:.5'}"><h3>${n}</h3><p>${S.ch >= ch ? 'Open' : `Opens in ${CHAPTERS[ch].kick.toLowerCase()}`}</p></div>`).join('') + `<div class="card"><h3>Next renovation</h3><p>${nextGateText()}</p></div><p style="font-size:12.5px;color:var(--ink3)">Start renovations at the holo-model table in the back room.</p>`;
}
function renderSettings(b) {
  const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-set="${k}" data-v="${v}" aria-pressed="${String(SET[k]) === String(v)}">${l}</button>`).join('')}</div>`;
  b.innerHTML = `<div class="set">Sound ${seg('sound', [[0, 'Off'], [1, 'Ambience'], [2, '+ Music']])}</div>
  <div class="set">Volume <input type="range" min="0" max="1" step="0.05" value="${SET.vol}" data-k="vol"></div>
  <div class="set">Music <input type="range" min="0" max="1" step="0.05" value="${SET.music}" data-k="music"></div>
  <div class="set">Look speed <input type="range" min="0.3" max="2.5" step="0.05" value="${SET.sens}" data-k="sens"></div>
  <div class="set">Field of view <input type="range" min="-15" max="20" step="1" value="${SET.fov}" data-k="fov"></div>
  <div class="set">Invert look ${seg('invert', [[false, 'Off'], [true, 'On']])}</div>
  <div class="set">Quality ${seg('quality', [['auto', 'Auto'], ['low', 'Low'], ['medium', 'Med'], ['high', 'High']])}</div>
  <div class="set">Reduced motion ${seg('reduce', [[false, 'Off'], [true, 'On']])}</div>
  <div class="set">No flashing ${seg('noflash', [[false, 'Off'], [true, 'On']])}</div>
  <div class="set">Relaxed mode ${seg('relaxed', [[false, 'Off'], [true, 'On']])}</div>
  <div class="set">Orders bar ${seg('ordersBar', [[true, 'On'], [false, 'Off']])}</div>
  <div class="set">Carried tea HUD ${seg('teaHud', [[true, 'On'], [false, 'Off']])}</div>
  <div class="set">Holds become taps ${seg('holdToggle', [[false, 'Off'], [true, 'On']])}</div>
  <div class="set">Text size ${seg('text', [[1, '100%'], [1.25, '125%'], [1.5, '150%']])}</div>
  <div class="set">Auto-advance dialogue ${seg('autoAdv', [[false, 'Off'], [true, 'On']])}</div>
  <div class="set">Left-handed touch ${seg('lefty', [[false, 'Off'], [true, 'On']])}</div>
  <p style="font-size:12px;color:var(--ink3);margin-top:12px">Quality now: ${Q.name}. Saved automatically.</p>`;
}
function applySetting(k, v) {
  const val = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; SET[k] = val; saveSet(); Snd.click();
  if (k === 'sound') setSound(val); if (k === 'quality') applyTier(val === 'auto' ? autoTier() : val); if (k === 'text') document.documentElement.style.fontSize = (16 * val) + 'px', $('#dlg').style.fontSize = val + 'em';
  if (k === 'reduce') applyTier(tierName);
}
// ---------- panels ----------
function openPanel(html, mount) { UI.modal = true; releasePointer(); $('#panel').hidden = false; $('#panelBox').innerHTML = html; if (mount) mount($('#panelBox')); }
function closePanel() { UI.modal = false; $('#panel').hidden = true; if (UI.onClose) { const f = UI.onClose; UI.onClose = null; f(); } }
$('#panel').addEventListener('click', e => { if (e.target.id === 'panel') closePanel(); });
function openPause() {
  paused = true; releasePointer();
  openPanel(`<h2>Paused</h2><p class="sub">${S.ch === 0 ? 'Move-in day' : CHAPTERS[S.ch].kick + ' · ' + CHAPTERS[S.ch].title}. Your progress saves automatically.</p>
  <div style="display:flex;flex-direction:column;gap:8px"><button class="btn" id="pResume">Resume</button><button class="btn ghost" id="pSettings">Settings</button><button class="btn ghost" id="pControls">Controls</button><button class="btn ghost" id="pNew" style="color:#ff9a9a">New game…</button></div>`, box => {
    box.querySelector('#pResume').onclick = () => closePanel();
    box.querySelector('#pSettings').onclick = () => { closePanel(); togglePhone(true); renderPhone('settings'); };
    box.querySelector('#pControls').onclick = () => { closePanel(); showControls(); };
    box.querySelector('#pNew').onclick = () => { box.innerHTML = '<h2>Start over?</h2><p class="sub">This erases your shop, your money and your story progress. It can\'t be undone.</p><div style="display:flex;gap:8px"><button class="btn" id="pYes" style="background:#ff7a7a">Erase and start over</button><button class="btn ghost" id="pNo">Keep playing</button></div>'; box.querySelector('#pYes').onclick = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } window.__noSave = true; location.reload(); }; box.querySelector('#pNo').onclick = () => closePanel(); };
  });
  UI.onClose = () => { paused = false; };
}
$('#btnPause').addEventListener('click', () => { if (started && !UI.modal) openPause(); });
function showControls() {
  openPanel(COARSE ? `<h2>Controls</h2><p class="sub">Drag on the left to walk. Drag on the right to look. Tap things to use them, or press <b>Use</b>. Hold <b>Use</b> for hold actions. The phone button opens your phone.</p><button class="btn" id="cOk">Got it</button>` :
    `<h2>Controls</h2><p class="sub"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk · <kbd>Shift</kbd> run · mouse to look<br><kbd>E</kbd> or left click: use · hold <kbd>E</kbd> for hold actions<br><kbd>Q</kbd> or right click: put down / step back<br><kbd>Tab</kbd> phone · <kbd>Esc</kbd> pause<br>At a station, use the mouse on the objects and <kbd>Space</kbd> for timing.</p><button class="btn" id="cOk">Got it</button>`, box => { box.querySelector('#cOk').onclick = () => closePanel(); });
}
// ---------- cards / letters / fades ----------
function showCard(kick, title, dur) { $('#cardKick').textContent = kick; $('#cardTitle').textContent = title; $('#card').classList.add('show'); setTimeout(() => $('#card').classList.remove('show'), (dur || 3.2) * 1000); }
function fadeTo(v, cb, ms) { const f = $('#fade'); f.style.transition = `opacity ${ms || 500}ms`; f.style.opacity = v; if (cb) setTimeout(cb, (ms || 500) + 30); }
function showLetter(text, done) { UI.modal = true; releasePointer(); $('#letterText').innerHTML = text.split('\n').map(p => `<p>${p}</p>`).join(''); $('#letter').hidden = false; $('#letterClose').onclick = () => { $('#letter').hidden = true; UI.modal = false; if (done) done(); }; }
function addMsg(w, t) { S.msgs = S.msgs || []; S.msgs.push({ w, t }); S.unread = (S.unread || 0) + 1; Snd.buzz(); const b = $('#phBadge'); toast(`New message from ${(SPEAKERS[w] || [w])[0]}.`); }
function onResizeUI() { }

