import { LEVELS, levelUnlocked, totalStars } from '../data/campaign.js';
import { MAPS, MAP_LIST } from '../data/maps.js';
import { TUNING as T } from '../data/tuning.js';
import { FACTIONS, ROLE_ORDER, UNITS, UNIT_LIST } from '../data/units.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => (n === Infinity ? '∞' : Math.round(n).toLocaleString('en-US'));
const ROLE_LABEL = { melee: 'Melee', ranged: 'Ranged', tank: 'Tank', cavalry: 'Cavalry', siege: 'Siege', support: 'Support', legendary: 'Legendary' };

export class UI {
  constructor(game) {
    this.g = game;
    this.tab = FACTIONS[0].id;
    this.screens = ['title', 'howto', 'campaign', 'hud', 'result', 'pausemenu', 'loading'];
    this.bind();
  }

  click() {
    this.g.unlockAudio();
    this.g.audio.play('click');
  }

  bind() {
    const g = this.g;
    const on = (id, fn) =>
      $(id).addEventListener('click', (e) => {
        this.click();
        fn(e);
      });
    on('btn-campaign', () => g.openCampaign());
    on('btn-sandbox', () => g.startSandbox('meadow'));
    on('btn-howto', () => this.showHowto());
    on('btn-howto-close', () => this.hideHowto());
    on('btn-camp-back', () => g.goTitle());
    on('btn-start', () => g.startBattle());
    on('btn-reset', () => g.resetBattle());
    on('btn-menu', () => this.openPause());
    $('brief').addEventListener('click', () => ($('brief').hidden = true));
    $('mode-chip').addEventListener('click', () => {
      if (this.g.mode === 'build' && this.g.session.kind === 'campaign') $('brief').hidden = !$('brief').hidden;
    });
    on('pm-resume', () => this.closePause());
    on('pm-howto', () => {
      this.closePause();
      this.showHowto();
    });
    on('pm-quit', () => {
      this.closePause();
      this.hideResult();
      g.goTitle();
    });
    on('pm-sound', () => {
      g.audio.setMuted(!g.audio.muted);
      g.progress.settings.muted = g.audio.muted;
      g.saveProgress();
      this.syncPause();
    });
    on('pm-music', () => {
      const m = g.progress.settings.music === false;
      g.progress.settings.music = m;
      g.audio.music(m);
      g.musicStarted = true;
      g.saveProgress();
      this.syncPause();
    });
    on('pm-quality', () => {
      g.quality = g.quality === 'high' ? 'low' : 'high';
      g.applyQuality();
      this.syncPause();
    });
    for (const b of $('time-ctl').querySelectorAll('button')) {
      b.addEventListener('click', () => {
        this.click();
        g.setUserScale(Number(b.dataset.ts));
      });
    }
    on('tool-erase', () => {
      g.eraser = !g.eraser;
      $('tool-erase').classList.toggle('on', g.eraser);
      g.refreshGhost();
    });
    on('tool-clear', () => g.clearArmy());
    on('tool-hide', () => {
      const c = $('tray').classList.toggle('collapsed');
      $('tool-hide').textContent = c ? '▴ Units' : '▾ Units';
    });
    on('tool-side', () => {
      g.placeTeam = 1 - g.placeTeam;
      this.syncTools();
      g.refreshGhost();
      this.updateGold();
    });
    on('tool-inf', () => {
      g.session.unlimited = !g.session.unlimited;
      this.syncTools();
      this.updateGold();
    });
    const sel = $('tool-map');
    for (const id of MAP_LIST) {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = MAPS[id].name;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      this.click();
      // keep the armies, but pull units out of places the new map forbids
      g.startSandbox(sel.value);
      g.army = g.army.filter((a) => !g.placementOk(UNITS[a.id], a.x, a.z, a.team) || true);
    });
    on('fol-prev', () => g.cycleFollow(-1));
    on('fol-next', () => g.cycleFollow(1));
    on('fol-exit', () => {
      g.rig.stopFollow();
      this.hideFollow();
    });
    on('res-retry', () => g.resetBattle());
    on('res-menu', () => {
      this.hideResult();
      if (g.session.kind === 'campaign') g.openCampaign();
      else g.goTitle();
    });
    on('res-next', () => {
      if (g.session.kind === 'campaign') g.nextLevel();
      else g.resetBattle();
    });
    on('res-watch', () => {
      $('result').hidden = true;
      g.watching = true;
      g.setUserScale(1);
      $('btn-reset').hidden = false;
      this.hint('Watching the aftermath. Press Reset to go again.');
    });
    $('loading').hidden = true;
  }

  show(screen) {
    $('title').hidden = screen !== 'title';
    $('campaign').hidden = screen !== 'campaign';
    $('hud').hidden = screen !== 'build' && screen !== 'battle';
    $('result').hidden = true;
    $('pausemenu').hidden = true;
    if (screen !== 'build' && screen !== 'battle') this.hideFollow();
  }

  showHowto() {
    $('howto').hidden = false;
  }
  hideHowto() {
    $('howto').hidden = true;
  }

  openPause() {
    this.pausedFrom = this.g.userScale;
    if (this.g.mode === 'battle') this.g.setUserScale(0);
    this.syncPause();
    $('pausemenu').hidden = false;
  }
  closePause() {
    $('pausemenu').hidden = true;
    if (this.g.mode === 'battle') this.g.setUserScale(this.pausedFrom || 1);
  }
  syncPause() {
    const g = this.g;
    $('pm-sound').textContent = `Sound: ${g.audio.muted ? 'off' : 'on'}`;
    $('pm-music').textContent = `Music: ${g.progress.settings.music === false ? 'off' : 'on'}`;
    $('pm-quality').textContent = `Quality: ${g.quality}`;
  }

  toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('show'), 1400);
  }

  hint(msg) {
    $('hint').textContent = msg;
  }

  fight(text, warn) {
    const d = document.createElement('div');
    d.className = 'fight';
    d.textContent = text;
    if (warn) d.style.color = '#ff8d86';
    $('app').appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }

  // ------------------------------------------------------------ build
  enterBuild() {
    const g = this.g;
    const s = g.session;
    $('btn-start').hidden = false;
    $('btn-reset').hidden = true;
    $('time-ctl').hidden = true;
    $('strength').hidden = true;
    $('gold').hidden = false;
    $('tray').hidden = false;
    $('tray').classList.remove('collapsed');
    $('tool-hide').textContent = '▾ Units';
    this.hideFollow();
    const sandbox = s.kind === 'sandbox';
    $('mode-chip').textContent = sandbox ? `Sandbox · ${g.map.name}` : `${s.level.id.replace('L', 'Level ')} · ${s.level.name}`;
    const brief = $('brief');
    if (!sandbox) {
      const L = s.level;
      brief.hidden = false;
      brief.innerHTML = `<b>${L.name}</b> · ${g.map.name}<br>${L.hint}<span class="pars">★★ spend ≤ ${fmt(L.par.two)} · ★★★ spend ≤ ${fmt(L.par.three)} · tap to hide</span>`;
      clearTimeout(this.briefT);
      this.briefT = setTimeout(() => (brief.hidden = true), 9000);
    } else brief.hidden = true;
    if (this.tab && !this.factionUsable(this.tab)) this.tab = (FACTIONS.find((f) => this.factionUsable(f.id)) || FACTIONS[0]).id;
    this.syncTools();
    this.hint(sandbox ? (this.g.mobile ? '' : 'Click or drag to place · Right-click removes · Right-drag or WASD moves the camera') : '');
  }

  factionUsable(id) {
    const s = this.g.session;
    return !s.factions || s.factions.includes(id);
  }

  syncTools() {
    const g = this.g;
    const sandbox = g.session.kind === 'sandbox';
    $('tool-side').hidden = !sandbox;
    $('tool-inf').hidden = !sandbox;
    $('tool-map').hidden = !sandbox;
    $('tool-map').value = g.mapId;
    $('tool-side').innerHTML = `Placing: <b>${g.placeTeam === 0 ? 'Blue' : 'Red'}</b>`;
    $('tool-side').classList.toggle('red', g.placeTeam === 1);
    $('tool-inf').textContent = `∞ Gold: ${g.session.unlimited ? 'on' : 'off'}`;
    $('tool-inf').classList.toggle('on', !!g.session.unlimited);
    $('tool-erase').classList.toggle('on', g.eraser);
    $('tool-clear').textContent = sandbox ? `Clear ${g.placeTeam === 0 ? 'Blue' : 'Red'}` : 'Clear';
  }

  renderTray() {
    const g = this.g;
    const tabs = $('tabs');
    tabs.innerHTML = '';
    for (const f of FACTIONS) {
      if (!f.units.length) continue;
      const usable = this.factionUsable(f.id);
      const b = document.createElement('button');
      b.className = `tab${f.id === this.tab ? ' on' : ''}`;
      b.innerHTML = `<i class="dot" style="background:${f.color}"></i>${f.short || f.name}`;
      if (!usable) {
        b.disabled = true;
        b.style.opacity = 0.35;
        b.title = 'Not allowed in this level';
      }
      b.addEventListener('click', () => {
        this.click();
        this.tab = f.id;
        this.renderTray();
      });
      tabs.appendChild(b);
    }
    const cards = $('cards');
    cards.innerHTML = '';
    const f = FACTIONS.find((x) => x.id === this.tab) || FACTIONS[0];
    const list = [...f.units].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
    for (const u of list) {
      const usable = g.canUseUnit(u);
      const c = document.createElement('button');
      c.className = `card${g.selected === u ? ' on' : ''}`;
      c.dataset.id = u.id;
      c.innerHTML = `<span class="role ${u.role}">${ROLE_LABEL[u.role]}</span><img alt="" src="${g.thumbs[u.id] || ''}"><span class="nm">${u.name}</span><span class="cost">${fmt(u.cost)}</span>`;
      if (!usable) {
        c.disabled = true;
        c.style.opacity = 0.35;
      }
      c.addEventListener('click', () => {
        this.click();
        g.select(u);
        $('tool-erase').classList.remove('on');
        for (const k of cards.children) k.classList.toggle('on', k.dataset.id === u.id);
        this.showInfo(u);
        clearTimeout(this.infoT);
        if (g.mobile) this.infoT = setTimeout(() => this.showInfo(null), 2500);
      });
      c.addEventListener('mouseenter', () => this.showInfo(u));
      c.addEventListener('mouseleave', () => this.showInfo(null));
      cards.appendChild(c);
    }
    this.showInfo(null);
    this.updateGold();
  }

  showInfo(u, quiet) {
    const box = $('unit-info');
    if (!u || (quiet && this.g.mobile)) {
      box.hidden = true;
      return;
    }
    const w = u.weapon;
    const dps = w.damage ? (w.damage * (w.proj && w.proj.count ? w.proj.count : 1)) / w.cooldown : 0;
    const bars = [
      ['HP', u.hp, 9000, fmt(u.hp)],
      ['Damage', dps || (w.heal ? w.heal / w.cooldown : 0), 80, w.kind.startsWith('heal') ? `+${fmt(w.heal)} heal` : `${fmt(w.damage)}${w.proj && w.proj.count > 1 ? `×${w.proj.count}` : ''}`],
      ['Speed', u.speed, 9, u.speed.toFixed(1)],
      ['Range', w.range, 50, `${w.range} m`],
      ['Mass', u.mass, 1500, `${u.mass} kg`],
    ];
    box.hidden = false;
    box.innerHTML = `<h3>${u.name} <span style="color:var(--gold);font-size:14px">· ${fmt(u.cost)} gold</span></h3><p>${u.desc || ''}</p><div class="stats">${bars
      .map(([k, v, max, label]) => `<div class="stat">${k} <span>${label}</span><div class="bar"><i style="width:${Math.min(100, Math.max(4, (Math.sqrt(v) / Math.sqrt(max)) * 100))}%"></i></div></div>`)
      .join('')}</div>`;
  }

  updateGold(bump) {
    const g = this.g;
    if (!g.session || g.mode !== 'build') return;
    const team = g.session.kind === 'sandbox' ? g.placeTeam : 0;
    const left = g.goldLeft(team);
    $('gold-val').textContent = fmt(left);
    $('gold-max').textContent = g.session.unlimited ? '' : `/ ${fmt(g.session.budget)}`;
    const pill = $('gold');
    pill.classList.remove('broke');
    if (bump) {
      pill.classList.remove('bump');
      void pill.offsetWidth;
      pill.classList.add('bump');
    }
    for (const c of $('cards').children) {
      const u = UNITS[c.dataset.id];
      if (u) c.classList.toggle('poor', u.cost > left);
    }
  }

  goldBroke() {
    const pill = $('gold');
    pill.classList.remove('broke');
    void pill.offsetWidth;
    pill.classList.add('broke');
    clearTimeout(this.brokeT);
    this.brokeT = setTimeout(() => pill.classList.remove('broke'), 700);
  }

  // ------------------------------------------------------------ battle
  enterBattle() {
    $('btn-start').hidden = true;
    $('btn-reset').hidden = false;
    $('time-ctl').hidden = false;
    $('strength').hidden = false;
    $('gold').hidden = true;
    $('tray').hidden = true;
    $('brief').hidden = true;
    $('unit-info').hidden = true;
    this.setTimeButtons(1);
    this.hint(this.g.mobile ? 'Tap a unit to follow it · Drag to look around' : 'Click a unit to follow it · Drag to look · WASD to fly · Space pauses');
    this.startCounts = [this.g.sim.alive[0].length, this.g.sim.alive[1].length];
    this.startValue = [this.g.sim.teamValue(0), this.g.sim.teamValue(1)];
  }

  setTimeButtons(s) {
    for (const b of $('time-ctl').querySelectorAll('button')) b.classList.toggle('on', Number(b.dataset.ts) === s);
  }

  updateHud() {
    const g = this.g;
    const sim = g.sim;
    if (!sim || (g.mode !== 'battle' && g.mode !== 'result')) return;
    const a0 = sim.alive[0].length;
    const a1 = sim.alive[1].length;
    $('c-blue').textContent = a0;
    $('c-red').textContent = a1;
    const v0 = sim.teamValue(0);
    const v1 = sim.teamValue(1);
    $('s-blue').style.flexGrow = Math.max(0.02, v0);
    $('s-red').style.flexGrow = Math.max(0.02, v1);
    const t = sim.time;
    const timer = $('timer');
    timer.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    timer.classList.toggle('sudden', sim.sudden);
    if (sim.sudden) timer.textContent += ' ☠';
    if (g.rig.mode === 'follow' && g.rig.follow) {
      const u = g.rig.follow;
      $('fol-hp').style.width = `${Math.max(0, (u.hp / u.maxHp) * 100)}%`;
      if (!u.alive) $('fol-name').textContent = `${u.def.name} (down)`;
    }
  }

  showFollow(u) {
    $('follow').hidden = false;
    $('fol-name').textContent = u.def.name;
    $('fol-name').style.color = u.team === 0 ? '#8db4ff' : '#ff9a92';
  }
  hideFollow() {
    $('follow').hidden = true;
  }

  // ------------------------------------------------------------ result
  showResult(r) {
    const g = this.g;
    const s = g.session;
    const sandbox = s.kind === 'sandbox';
    const title = $('res-title');
    if (sandbox) {
      title.textContent = r.winner === 0 ? 'Blue wins!' : r.winner === 1 ? 'Red wins!' : 'Draw!';
      title.classList.toggle('lose', r.winner === 1);
    } else {
      title.textContent = r.won ? 'Victory!' : r.winner === -1 ? 'Draw!' : 'Defeat!';
      title.classList.toggle('lose', !r.won);
    }
    const stars = $('res-stars');
    stars.hidden = sandbox;
    [...stars.children].forEach((st, i) => {
      st.className = '';
      st.style.animationDelay = `${0.35 + i * 0.28}s`;
      if (i < r.stars) st.className = 'on';
    });
    let sub = '';
    if (!sandbox) {
      const L = s.level;
      if (r.won) sub = r.stars < 3 ? `Spend ${fmt(r.stars === 1 ? L.par.two : L.par.three)} gold or less for ${r.stars === 1 ? '★★' : '★★★'}.` : 'Perfect! Maximum stars.';
      else sub = r.timeout ? 'Time ran out and they had more left standing.' : 'Try a different mix. Counters matter.';
    } else sub = r.timeout ? 'Decided on points after the time limit.' : `Battle lasted ${Math.round(r.time)} s.`;
    $('res-sub').textContent = sub;
    const mvp = r.mvp && r.mvp.dmgDealt + r.mvp.healDone > 0 ? `${r.mvp.def.name}` : '—';
    $('res-stats').innerHTML = `<div><span>Time</span><b>${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}</b></div><div><span>Gold spent</span><b>${fmt(r.spent)}</b></div><div><span>Blue left</span><b>${r.alive[0]}</b></div><div><span>Red left</span><b>${r.alive[1]}</b></div><div style="grid-column:1/-1"><span>MVP</span><b>${mvp}</b></div>`;
    const next = $('res-next');
    if (sandbox) {
      next.textContent = 'Edit armies';
      next.hidden = false;
    } else {
      const i = s.index + 1;
      next.textContent = r.won ? 'Next level' : 'Try again';
      next.hidden = r.won && (i >= LEVELS.length || !levelUnlocked(g.progress, i));
      if (!r.won) next.hidden = true;
    }
    $('result').hidden = false;
    $('time-ctl').hidden = true;
  }

  hideResult() {
    $('result').hidden = true;
    this.g.watching = false;
  }

  // ------------------------------------------------------------ campaign
  renderCampaign() {
    const g = this.g;
    const grid = $('camp-grid');
    grid.innerHTML = '';
    $('camp-stars').textContent = `★ ${totalStars(g.progress)} / ${LEVELS.filter((l) => !l.bonus).length * 3}`;
    LEVELS.forEach((L, i) => {
      const open = levelUnlocked(g.progress, i);
      const st = g.progress.stars[L.id] || 0;
      const b = document.createElement('button');
      b.className = `lvl${open ? '' : ' locked'}`;
      const num = L.bonus ? `BONUS · ${L.needStars}★` : `LEVEL ${i + 1}${L.boss ? ' · BOSS' : ''}`;
      const foes = [...new Set(L.enemy.map((e) => UNITS[e.u] && UNITS[e.u].faction).filter(Boolean))];
      const dots = foes.map((f) => `<i class="fdot" style="background:${(FACTIONS.find((x) => x.id === f) || {}).color}"></i>`).join('');
      b.innerHTML = `<span class="num">${num}</span><span class="name">${L.name}</span><span class="meta">${MAPS[L.map].name} · ${fmt(L.budget)} gold${L.legendary ? ' · 1 legendary' : ''}</span><span class="stars">${[0, 1, 2].map((k) => `<i class="star${k < st ? ' on' : ''}"></i>`).join('')}<span class="foes">${dots}</span></span>`;
      b.style.borderTop = `6px solid ${MAPS[L.map].theme.grassA}`;
      b.addEventListener('click', () => {
        if (!open) {
          this.toast(L.bonus ? `Collect ${L.needStars} stars to unlock` : 'Win the previous level first');
          g.audio.play('error');
          return;
        }
        this.click();
        g.startLevel(i);
      });
      grid.appendChild(b);
    });
  }
}

export { UNIT_LIST, T };
