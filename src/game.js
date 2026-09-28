import { createAudio } from './audio/sfx.js';
import { LEVELS, buildEnemyArmy, levelUnlocked, starsFor, totalStars } from './data/campaign.js';
import { MAPS, MAP_LIST, deployZone } from './data/maps.js';
import { TUNING as T } from './data/tuning.js';
import { FACTIONS, UNITS, UNIT_LIST } from './data/units.js';
import { makeRng } from './sim/rng.js';
import { Sim } from './sim/world.js';
import { Input } from './ui/input.js';
import { Possession } from './ui/possess.js';
import { UI } from './ui/ui.js';
import { CameraRig } from './view/camera.js';
import { EventFx } from './view/events.js';
import { Fx } from './view/fx.js';
import { registerProjLooks } from './view/projlooks.js';
import { Renderer, buildStaticModel, makeGeometries } from './view/renderer.js';
import { THREE } from './view/three.js';
import { makeThumbs } from './view/thumbs.js';

const SAVE_KEY = 'clobberfield.v1';
const MAX_UNITS = 200; // total on the field, for performance
const SIDE_CAP = 100;

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.mobile = opts.mobile;
    this.test = opts.test || {};
    for (const f of FACTIONS) if (f.projLooks) registerProjLooks(f.projLooks);
    this.renderer = new Renderer(canvas, { mobile: this.mobile });
    this.camera = this.renderer.camera;
    this.fx = new Fx(this.renderer.scene, this.renderer, this.mobile);
    this.rig = new CameraRig(this.camera, null);
    this.audio = createAudio();
    this.efx = new EventFx(this);
    this.mode = 'loading';
    this.sim = null;
    this.map = MAPS.meadow;
    this.mapId = null;
    this.timeScale = 1;
    this.userScale = 1;
    this.slowmo = 0;
    this.acc = 0;
    this.army = []; // [{ id, team, x, z, fixed }]
    this.session = null;
    this.selected = null;
    this.eraser = false;
    this.placeTeam = 0;
    this.silent = true;
    this.quality = this.mobile ? 'low' : 'high';
    this.progress = this.loadProgress();
    this.frameMs = 16;
    this.perf = { fps: 60, step: 0, frames: 0, t: 0 };
    this.ghost = null;
    this.ghostOk = false;
    this.hover = null;
    this.last = performance.now();
    this.hudT = 0;
    this.shotT = 0;
    this.overT = 0;
    this.result = null;
    this.geos = makeGeometries();
  }

  // ------------------------------------------------------------------ boot
  async boot(onProgress) {
    onProgress?.('Carving soldiers out of primitives…');
    await frame();
    this.thumbs = this.test.noThumbs ? {} : makeThumbs(UNIT_LIST, this.mobile ? 96 : 128);
    onProgress?.('Teaching them to stand up…');
    await frame();
    this.ui = new UI(this);
    this.pz = new Possession(this);
    this.input = new Input(this);
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.applyQuality();
    requestAnimationFrame((t) => this.loop(t));
    this.goTitle();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.resize(w, h);
    this.fx.setViewport(h * Math.min(window.devicePixelRatio || 1, 2));
  }

  applyQuality() {
    const low = this.quality === 'low';
    const r = this.renderer.r;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 2));
    r.shadowMap.enabled = true;
    this.renderer.sun.castShadow = !low || !this.mobile;
    this.renderer.lodDist = low ? 28 : 48;
    this.resize();
  }

  unlockAudio() {
    this.audio.unlock();
    if (!this.musicStarted && this.progress.settings.music !== false) {
      this.musicStarted = true;
      this.audio.music(true);
    }
  }

  // ------------------------------------------------------------------ persistence
  loadProgress() {
    const base = { stars: {}, spent: {}, settings: {} };
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return { ...base, ...JSON.parse(raw) };
    } catch {}
    return base;
  }

  saveProgress() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.progress));
    } catch {}
  }

  // ------------------------------------------------------------------ sims
  setMap(id) {
    this.map = MAPS[id];
    if (this.mapId !== id) {
      this.mapId = id;
      this.mapDirty = true;
    }
  }

  buildSim(seed) {
    if (this.pz) this.pz.release(true);
    if (this.sim) this.disposeSim();
    this.sim = new Sim({ map: this.map, seed: seed ?? 1 + ((Math.random() * 1e6) | 0), defs: UNITS, lowPower: this.mobile });
    if (this.mapDirty || !this.renderer.terrain) {
      this.renderer.loadMap(this.map, this.sim.ground);
      this.mapDirty = false;
    }
    this.rig.setGround(this.sim.ground);
    this.fx.clear();
    this.efx.zoneVis.length = 0;
    for (const a of this.army) {
      const u = this.sim.addUnit(UNITS[a.id], a.team, a.x, a.z);
      a.unit = u;
    }
    this.sim.drainEvents();
    this.acc = 0;
  }

  disposeSim() {
    this.sim = null;
  }

  groundY(x, z) {
    return this.sim ? this.sim.ground.surfaceAt(x, z) : 0;
  }

  // ------------------------------------------------------------------ flows
  goTitle() {
    this.mode = 'title';
    this.session = { kind: 'attract' };
    this.silent = true;
    this.rig.stopFollow();
    this.startAttract();
    this.renderer.setZones(false);
    this.ui.show('title');
  }

  startAttract() {
    const rng = makeRng((Math.random() * 1e9) | 0);
    const ids = MAP_LIST.filter((m) => m !== 'gorge');
    this.setMap(this.test.map || rng.pick(ids));
    this.army = [];
    const pool = UNIT_LIST.filter((u) => u.role !== 'legendary' && u.role !== 'siege');
    const legends = UNIT_LIST.filter((u) => u.role === 'legendary');
    for (let team = 0; team < 2; team++) {
      const zone = deployZone(this.map, team);
      // unit slots rather than gold: faction ranks make prices vary 25x
      let slots = 18;
      if (legends.length && rng.next() < 0.5) {
        const L = rng.pick(legends);
        this.army.push({ id: L.id, team, x: rng.range(-8, 8), z: team === 0 ? 18 : -18 });
        slots -= 8;
      }
      let tries = 0;
      while (slots > 0 && tries++ < 60) {
        const d = rng.pick(pool);
        if (!d) break;
        const x = rng.range(zone.x0 * 0.6, zone.x1 * 0.6);
        const z = rng.range(zone.z0 + 4, zone.z1 - 4) * (team === 0 ? 1 : 1);
        if (this.map.noDeploy && this.map.noDeploy(x, z)) continue;
        this.army.push({ id: d.id, team, x, z });
        slots--;
      }
    }
    this.buildSim();
    this.sim.start();
    this.attractT = 0;
    this.rig.mode = 'orbit';
  }

  openCampaign() {
    this.mode = 'campaign';
    this.ui.show('campaign');
    this.ui.renderCampaign();
  }

  startLevel(i) {
    const L = LEVELS[i];
    this.session = { kind: 'campaign', index: i, level: L, budget: L.budget, unlimited: false, factions: L.factions, legendary: L.legendary || 0 };
    this.setMap(L.map);
    const zone = deployZone(this.map, 1);
    const enemy = buildEnemyArmy(L, UNITS, this.map, makeRng(1000 + i), zone);
    this.army = enemy.map((e) => ({ id: e.id, team: 1, x: e.x, z: e.z, fixed: true }));
    this.placeTeam = 0;
    this.enterBuild();
  }

  startSandbox(mapId) {
    const prev = this.session && this.session.kind === 'sandbox' ? this.session : null;
    this.session = { kind: 'sandbox', budget: prev ? prev.budget : 20000, unlimited: prev ? prev.unlimited : false, factions: null, legendary: 99 };
    this.setMap(mapId || (prev ? this.mapId : 'meadow'));
    if (!prev) this.army = [];
    this.placeTeam = 0;
    this.enterBuild();
  }

  enterBuild() {
    this.mode = 'build';
    this.silent = false;
    this.timeScale = 1;
    this.userScale = 1;
    this.slowmo = 0;
    this.result = null;
    for (const a of this.army) a.unit = null;
    this.buildSim(1234);
    this.rig.reset(0);
    this.renderer.setZones(true, this.session.kind === 'sandbox' ? 0.35 : 0.16);
    this.ui.show('build');
    this.ui.enterBuild();
    if (!this.selected || !this.canUseUnit(this.selected)) this.selected = this.firstUsableUnit();
    this.ui.renderTray();
    this.refreshGhost();
    this.ui.updateGold();
  }

  canUseUnit(def) {
    const s = this.session;
    if (!s) return false;
    if (s.factions && !s.factions.includes(def.faction)) return false;
    if (def.role === 'legendary' && !s.legendary) return false;
    return true;
  }

  firstUsableUnit() {
    return UNIT_LIST.find((u) => this.canUseUnit(u)) || null;
  }

  spent(team) {
    let g = 0;
    for (const a of this.army) if (a.team === team && !a.fixed) g += UNITS[a.id].cost;
    return g;
  }

  teamCost(team) {
    let g = 0;
    for (const a of this.army) if (a.team === team) g += UNITS[a.id].cost;
    return g;
  }

  goldLeft(team = this.placeTeam) {
    if (this.session.unlimited) return Infinity;
    return this.session.budget - this.spent(team);
  }

  legendCount(team) {
    return this.army.filter((a) => a.team === team && UNITS[a.id].role === 'legendary' && !a.fixed).length;
  }

  // Can a unit of `def` stand at (x, z) for `team`?
  placementOk(def, x, z, team) {
    const zone = deployZone(this.map, team);
    if (x < zone.x0 || x > zone.x1 || z < zone.z0 || z > zone.z1) return 'zone';
    if (this.map.noDeploy && this.map.noDeploy(x, z)) return 'zone';
    const gy = this.groundY(x, z);
    if (gy < -1.5) return 'zone';
    const r = unitRadius(def);
    for (const a of this.army) {
      const d2 = UNITS[a.id];
      if (Math.hypot(a.x - x, a.z - z) < (r + unitRadius(d2)) * 0.85) return 'crowded';
    }
    return null;
  }

  tryPlace(x, z, quietFail) {
    const def = this.selected;
    if (!def || this.mode !== 'build') return false;
    const team = this.session.kind === 'sandbox' ? this.placeTeam : 0;
    const why = this.placementOk(def, x, z, team);
    if (why) {
      if (!quietFail && why === 'zone') this.ui.toast(team === 0 ? 'Place units inside the blue zone' : 'Place units inside the red zone');
      return false;
    }
    if (this.goldLeft(team) < def.cost) {
      if (!quietFail) {
        this.ui.toast('Not enough gold');
        this.ui.goldBroke();
        this.audio.play('error');
      }
      return false;
    }
    if (def.role === 'legendary' && this.session.kind === 'campaign' && this.legendCount(team) >= this.session.legendary) {
      if (!quietFail) {
        this.ui.toast('Only one legendary allowed here');
        this.audio.play('error');
      }
      return false;
    }
    if (this.army.length >= MAX_UNITS || this.army.filter((a) => a.team === team).length >= SIDE_CAP) {
      if (!quietFail) this.ui.toast(`Unit limit reached (${SIDE_CAP} per side)`);
      return false;
    }
    const a = { id: def.id, team, x, z };
    this.army.push(a);
    a.unit = this.sim.addUnit(def, team, x, z);
    const gy = this.groundY(x, z);
    this.fx.burst(x, gy + 0.2, z, 8, { colors: [new THREE.Color('#ffffff'), new THREE.Color(team === 0 ? '#8db4ff' : '#ff9a92')], speed: 2, life: 0.5, s0: 0.35, s1: 0.1, shape: 'star', grav: 4, up: 0.7 });
    this.audio.play('place', { pitch: 0.9 + Math.random() * 0.25 });
    this.ui.updateGold(true);
    return true;
  }

  removeNear(x, z, radius = 1.4) {
    if (this.mode !== 'build') return false;
    let best = -1;
    let bd = radius;
    for (let i = 0; i < this.army.length; i++) {
      const a = this.army[i];
      if (a.fixed) continue;
      if (this.session.kind === 'campaign' && a.team !== 0) continue;
      const u = a.unit;
      const ux = u ? u.x : a.x;
      const uz = u ? u.z : a.z;
      const d = Math.hypot(ux - x, uz - z) - unitRadius(UNITS[a.id]) * 0.5;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    if (best < 0) return false;
    const a = this.army[best];
    this.army.splice(best, 1);
    if (a.unit) {
      const p = a.unit.p.torso.position;
      this.fx.burst(p.x, p.y, p.z, 10, { colors: [new THREE.Color('#ffffff'), new THREE.Color('#ffd23f')], speed: 2.5, life: 0.5, s0: 0.4, s1: 0.1, grav: 3, up: 0.5 });
      this.sim.removeUnit(a.unit);
    }
    this.audio.play('remove');
    this.ui.updateGold(true);
    return true;
  }

  clearArmy() {
    const s = this.session;
    const keep = (a) => a.fixed || (s.kind === 'sandbox' ? a.team !== this.placeTeam : a.team !== 0);
    for (const a of this.army) if (!keep(a) && a.unit) this.sim.removeUnit(a.unit);
    this.army = this.army.filter(keep);
    this.audio.play('remove');
    this.ui.updateGold(true);
  }

  select(def) {
    this.selected = def;
    this.eraser = false;
    this.refreshGhost();
  }

  refreshGhost() {
    const sc = this.renderer.scene;
    if (this.ghost) {
      sc.remove(this.ghost);
      this.ghost.traverse((o) => o.material && o.material.dispose());
      this.ghost = null;
    }
    if (!this.selected || this.eraser || this.mode !== 'build') return;
    const team = this.session.kind === 'sandbox' ? this.placeTeam : 0;
    this.ghost = buildStaticModel(this.selected, team, { geos: this.geos, ghost: true });
    this.ghost.visible = false;
    this.ghost.rotation.y = team === 0 ? Math.PI : 0;
    sc.add(this.ghost);
  }

  updateGhost(x, z, visible) {
    if (!this.ghost) return;
    this.ghost.visible = visible;
    if (!visible) return;
    const team = this.session.kind === 'sandbox' ? this.placeTeam : 0;
    this.ghost.position.set(x, this.groundY(x, z), z);
    const ok = !this.placementOk(this.selected, x, z, team) && this.goldLeft(team) >= this.selected.cost;
    if (ok !== this.ghostOk) {
      this.ghostOk = ok;
      this.ghost.traverse((o) => {
        if (!o.material) return;
        if (!o.material.userData.base) o.material.userData.base = o.material.color.clone();
        o.material.color.copy(ok ? o.material.userData.base : new THREE.Color('#ff4040'));
        o.material.opacity = ok ? 0.6 : 0.35;
      });
    }
  }

  startBattle() {
    if (this.mode !== 'build') return;
    const blue = this.army.filter((a) => a.team === 0).length;
    const red = this.army.filter((a) => a.team === 1).length;
    if (!blue || !red) {
      this.ui.toast(!blue ? 'Place at least one blue unit first' : 'Place at least one red unit first');
      this.audio.play('error');
      return;
    }
    this.unlockAudio();
    this.snapshot = this.army.map((a) => ({ id: a.id, team: a.team, x: a.x, z: a.z, fixed: a.fixed }));
    this.goldSpent = this.spent(0);
    // Rebuild so the battle starts from the exact placements, seeded for reproducibility.
    this.army = this.snapshot.map((a) => ({ ...a }));
    this.buildSim(this.battleSeed || 1 + ((Math.random() * 1e6) | 0));
    this.sim.start();
    this.mode = 'battle';
    this.silent = false;
    this.userScale = 1;
    this.renderer.setZones(false);
    this.refreshGhost();
    this.ui.enterBattle();
    // swoop the free camera down to a lower, closer angle for the fight
    if (this.rig.mode === 'free') {
      const portrait = this.camera.aspect < 0.9;
      this.rig.pos.set(0, portrait ? 19 : 11, portrait ? 30 : 24);
      this.rig.yaw = Math.PI;
      this.rig.pitch = portrait ? -0.62 : -0.42;
    }
    this.audio.play('start');
    this.ui.fight('FIGHT!');
  }

  resetBattle() {
    if (!this.snapshot) return this.enterBuild();
    this.army = this.snapshot.map((a) => ({ ...a }));
    this.rig.stopFollow();
    this.ui.hideResult();
    this.enterBuild();
  }

  setUserScale(s) {
    this.userScale = s;
    this.ui.setTimeButtons(s);
  }

  togglePause() {
    if (this.mode !== 'battle') return;
    this.setUserScale(this.userScale === 0 ? 1 : 0);
  }

  onBigHit(e) {
    this.fx.addShake(0.45);
    if (this.efx.slowmoCool <= 0 && this.mode === 'battle' && this.progress.settings.slowmo !== false) {
      this.slowmo = 0.55;
      this.efx.slowmoCool = 4;
    }
  }

  onSudden() {
    if (this.mode !== 'battle') return;
    this.ui.fight('SUDDEN DEATH!', true);
    this.audio.play('start', { pitch: 0.7 });
  }

  endBattle() {
    const sim = this.sim;
    const won = sim.winner === 0;
    const s = this.session;
    let stars = 0;
    let prevBest = 0;
    if (s.kind === 'campaign') {
      const L = s.level;
      stars = starsFor(L, won, this.goldSpent);
      prevBest = this.progress.stars[L.id] || 0;
      if (stars > prevBest) this.progress.stars[L.id] = stars;
      if (won) this.progress.spent[L.id] = Math.min(this.progress.spent[L.id] ?? Infinity, this.goldSpent);
      this.saveProgress();
    }
    const alive = [sim.alive[0].length, sim.alive[1].length];
    let mvp = null;
    for (const u of sim.units) if (u.team === (won ? 0 : 1) && (!mvp || u.dmgDealt + u.healDone > mvp.dmgDealt + mvp.healDone)) mvp = u;
    this.result = { won, winner: sim.winner, stars, prevBest, alive, mvp, time: sim.time, spent: this.goldSpent, timeout: sim.time > T.battleHardCap };
    this.audio.play(sim.winner === 0 || (s.kind === 'sandbox' && sim.winner >= 0) ? 'victory' : 'defeat');
    if (won || (s.kind === 'sandbox' && sim.winner >= 0)) {
      const tc = sim.winner === 0 ? '#8db4ff' : '#ff9a92';
      const c = this.camera.position;
      const f = new THREE.Vector3();
      this.camera.getWorldDirection(f);
      const cx = c.x + f.x * 12;
      const cy = c.y + f.y * 12;
      const cz = c.z + f.z * 12;
      this.fx.burst(cx, cy + 3, cz, 120, { colors: [new THREE.Color('#ffe066'), new THREE.Color('#ff7eb6'), new THREE.Color('#7dffa8'), new THREE.Color(tc), new THREE.Color('#ffffff')], speed: 7, life: 2.6, s0: 0.35, s1: 0.3, shape: 'square', grav: 5, up: 0.6, drag: 1.2, jitter: 4 });
    }
    this.ui.showResult(this.result);
    for (let i = 0; i < stars; i++) setTimeout(() => this.audio.play('star', { pitch: [1, 1.26, 1.5][i] }), 450 + i * 280);
  }

  nextLevel() {
    const i = this.session.index + 1;
    this.ui.hideResult();
    if (i < LEVELS.length && levelUnlocked(this.progress, i)) this.startLevel(i);
    else this.openCampaign();
  }

  // Pick the unit under a screen point (for follow cam).
  pickUnit(sx, sy) {
    if (!this.sim) return null;
    const v = new THREE.Vector3();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    let best = null;
    let bd = this.mobile ? 44 : 30;
    for (const u of this.sim.units) {
      if (!u.alive) continue;
      const p = u.p.torso.position;
      v.set(p.x, p.y, p.z).project(this.camera);
      if (v.z > 1) continue;
      const px = ((v.x + 1) / 2) * w;
      const py = ((1 - v.y) / 2) * h;
      const d = Math.hypot(px - sx, py - sy);
      if (d < bd) {
        bd = d;
        best = u;
      }
    }
    return best;
  }

  follow(u) {
    if (!u) return;
    this.rig.startFollow(u);
    this.ui.showFollow(u);
    this.audio.play('click');
  }

  possess(u) {
    this.pz.start(u || this.rig.follow);
  }

  cycleFollow(dir) {
    const cur = this.rig.follow;
    const team = cur ? cur.team : 0;
    const list = this.sim.units.filter((u) => u.alive && u.team === team);
    if (!list.length) return;
    let i = list.indexOf(cur);
    i = (i + dir + list.length) % list.length;
    this.follow(list[i]);
  }

  // Ray from the camera through a screen point onto the ground.
  groundPoint(sx, sy) {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ndc = new THREE.Vector3((sx / w) * 2 - 1, -(sy / h) * 2 + 1, 0.5);
    ndc.unproject(this.camera);
    const o = this.camera.position.clone();
    const d = ndc.sub(o).normalize();
    if (d.y > -0.01) return null;
    let t = 0;
    let prev = 0;
    for (let i = 0; i < 400; i++) {
      t += 0.5;
      const y = o.y + d.y * t;
      const gy = this.groundY(o.x + d.x * t, o.z + d.z * t);
      if (y <= gy) {
        // bisect
        let a = prev;
        let b = t;
        for (let k = 0; k < 10; k++) {
          const m = (a + b) / 2;
          if (o.y + d.y * m <= this.groundY(o.x + d.x * m, o.z + d.z * m)) b = m;
          else a = m;
        }
        return { x: o.x + d.x * b, z: o.z + d.z * b };
      }
      prev = t;
    }
    return null;
  }

  // ------------------------------------------------------------------ loop
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 1 / 60;
    dt = Math.min(dt, 0.1);
    this.frameMs = this.frameMs * 0.95 + dt * 1000 * 0.05;
    this.tick(dt);
  }

  tick(dt) {
    const sim = this.sim;
    this.efx.slowmoCool -= dt;
    if (this.slowmo > 0) this.slowmo -= dt;
    let ts = 1;
    if (this.mode === 'battle') {
      ts = this.userScale;
      if (this.slowmo > 0 && ts > 0) ts = Math.min(ts, 0.3);
    } else if (this.mode === 'result') ts = this.watching ? this.userScale : 0.6;
    this.timeScale = ts;
    this.audio.setTimeScale(this.mode === 'title' ? 1 : ts);

    this.pz.update(dt);
    if (sim && ts > 0) {
      const simDt = ts < 1 ? T.dt * ts : T.dt;
      this.acc += Math.min(dt, 0.05) * ts;
      let n = 0;
      const maxSteps = ts > 1 ? 5 : 3;
      const t0 = performance.now();
      while (this.acc >= simDt - 1e-9 && n < maxSteps) {
        sim.step(simDt);
        this.acc -= simDt;
        n++;
      }
      if (n >= maxSteps) this.acc = 0;
      const ms = performance.now() - t0;
      this.perf.step = this.perf.step * 0.9 + (n ? ms / n : 0) * 0.1;
      // adaptive physics quality: slow devices drop to fewer solver iterations
      if (this.perf.step > 9 && !sim.lowPower) {
        sim.lowPower = true;
        sim.world.solver.iterations = T.solverIterationsLow;
      }
    }
    if (sim) {
      const quiet = this.mode === 'title' || this.silent;
      this.efx.handle(sim.drainEvents(), quiet);
      if (this.mode === 'battle' && sim.phase === 'over') {
        this.overT += dt;
        if (this.overT > 1.4) {
          this.overT = 0;
          this.mode = 'result';
          this.watching = false;
          this.endBattle();
        }
      }
      if (this.mode === 'title') {
        this.attractT += dt;
        if (sim.phase === 'over' || this.attractT > 70) {
          this.attractOver = (this.attractOver || 0) + dt;
          if (this.attractOver > 3) {
            this.attractOver = 0;
            this.startAttract();
          }
        }
      }
    }

    // camera
    if (this.rig.mode === 'orbit') {
      this.orbitA = (this.orbitA || 0) + dt * 0.06;
      const r = 42;
      this.camera.position.set(Math.sin(this.orbitA) * r, 16 + Math.sin(this.orbitA * 0.7) * 3, Math.cos(this.orbitA) * r);
      this.camera.lookAt(0, 1, 0);
    } else this.rig.update(dt, this.fx.shake);
    const c = this.camera.position;
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    this.audio.setListener({ x: c.x, y: c.y, z: c.z }, Math.atan2(fwd.x, fwd.z));

    // draw
    const R = this.renderer;
    R.update(dt);
    R.beginFrame();
    if (sim) {
      const fol = this.rig.mode === 'follow' || this.rig.mode === 'possess' ? this.rig.follow : null;
      for (const u of sim.units) {
        // in follow cam, don't let units right in front of the lens block the view
        if (fol && u !== fol) {
          const tp = u.p.torso.position;
          if (Math.hypot(tp.x - c.x, tp.y - c.y, tp.z - c.z) < 1.2 + 1.3 * (u.def.scale || 1)) continue;
        }
        R.drawUnit(u, c);
      }
      for (const p of sim.projectiles) R.drawProjectile(p);
    }
    for (const s of this.fx.stuck) R.drawProjectile(s);
    R.endFrame();
    this.efx.update(dt, sim);
    this.fx.update(dt, this.camera);
    R.render();

    // HUD
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      this.ui.updateHud(dt);
      this.perf.fps = 1000 / this.frameMs;
    }
  }
}

function unitRadius(def) {
  if (def.mount) return Math.max(0.7, (def.mount.len || 1.5) * (def.mount.scale || 1) * 0.45);
  return 0.35 * (def.scale || 1) * (def.bulk || 1);
}

function frame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

export { LEVELS, levelUnlocked, totalStars, FACTIONS, UNITS, UNIT_LIST, MAPS, MAP_LIST };
