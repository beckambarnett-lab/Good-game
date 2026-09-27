import { TEAM_COLORS } from './renderer.js';
import { THREE } from './three.js';

// Turns sim events into particles, rings, beams, comic words, screen shake and sounds.
const col = (h) => new THREE.Color(h);
const SPARK = [col('#fff6b0'), col('#ffd23f'), col('#ffffff'), col('#ffae3b')];
const DUST = [col('#c9b08a'), col('#b39a74'), col('#d8c7a6')];
const SNOWDUST = [col('#ffffff'), col('#e6f1f7')];
const FIRE = [col('#ffd23f'), col('#ff9f1c'), col('#ff6a1a'), col('#fff1a0')];
const SMOKE = [col('#6d6a70'), col('#8a8790'), col('#57545c')];
const HEAL = [col('#7dffa8'), col('#c6ffd8'), col('#3ee08a')];
const GOLD = [col('#ffe066'), col('#fff3b0'), col('#ffc23a')];
const WATER = [col('#bfe9ff'), col('#ffffff'), col('#7fc8ee')];
const FROST = [col('#dff6ff'), col('#a8dcff'), col('#ffffff')];
const ZAP = [col('#bfefff'), col('#ffffff'), col('#7fdcff')];
const PURPLE = [col('#c9a4ff'), col('#8e6cf0'), col('#f0d6ff')];
const SPORE = [col('#b6d86a'), col('#8fb34a'), col('#d9f09a')];
const GOO = [col('#b36ad8'), col('#8a4bb0'), col('#d7a4f0')];
const WORDS_HIT = ['BONK!', 'WHAM!', 'POW!', 'THWACK!', 'BOP!'];
const WORD_COL = ['#ffe14d', '#ff8fb8', '#8fe3ff', '#a6ff8f'];

const PROJ_SOUND = {
  arrow: 'shoot_bow',
  bolt: 'shoot_bow',
  spear: 'shoot_throw',
  harpoon: 'shoot_bow',
  fireball: 'shoot_magic',
  orb: 'shoot_magic',
};
const PROJ_HIT = { arrow: 'stab', bolt: 'stab', harpoon: 'stab', spear: 'stab', rivet: 'stab', snowball: 'freeze' };

export class EventFx {
  constructor(game) {
    this.g = game;
    this.zoneVis = [];
    this.slowmoCool = 0;
  }

  get fx() {
    return this.g.fx;
  }

  play(name, e, opt = {}) {
    if (this.g.silent) return;
    this.g.audio.play(name, { x: e.x, y: e.y, z: e.z, ...opt });
  }

  handle(events, quiet) {
    const fx = this.fx;
    for (const e of events) {
      switch (e.type) {
        case 'hit': {
          const mag = e.mag || 0;
          const n = Math.min(18, 4 + mag / 140);
          fx.burst(e.x, e.y, e.z, n, { colors: SPARK, speed: 3 + mag / 300, life: 0.35, s0: 0.35, s1: 0.05, shape: 'star', grav: 6, up: 0.2 });
          if (e.kind === 'charge' || mag > 700) fx.burst(e.x, e.y - 0.8, e.z, 6, { colors: this.dustCols(), speed: 2, life: 0.8, s0: 0.5, s1: 1.2, grav: -0.5, up: 0.1, drag: 2 });
          if (mag > 800 && Math.random() < 0.35) fx.word(WORDS_HIT[(Math.random() * WORDS_HIT.length) | 0], e.x, e.y, e.z, WORD_COL[(Math.random() * 4) | 0], 0.8 + Math.min(0.6, mag / 3000));
          if (mag > 1100) fx.addShake(Math.min(0.35, mag / 6000));
          if (!quiet) {
            let s = e.sound;
            if (!s) s = e.kind === 'thrust' ? 'stab' : e.kind === 'spin' ? 'slash' : e.kind === 'proj' ? PROJ_HIT[e.look] || 'bonk' : 'bonk';
            this.play(s, e, { mag });
          }
          break;
        }
        case 'launch':
          if (!quiet) this.play('launch', e, { mag: e.mag });
          if (Math.random() < 0.15) fx.word('YEET!', e.x, e.y, e.z, '#8fe3ff', 0.9);
          break;
        case 'bighit':
          this.g.onBigHit(e);
          break;
        case 'death': {
          const u = e.unit;
          const tc = TEAM_COLORS[u.team][0];
          fx.burst(e.x, e.y + 0.3, e.z, 10, { colors: [tc, col('#ffffff'), col('#ffe066')], speed: 3, life: 0.9, s0: 0.3, s1: 0.1, shape: 'square', grav: 7, up: 0.6 });
          if (!quiet) this.play('death', e);
          break;
        }
        case 'slam':
          fx.ring(e.x, e.y, e.z, 0.4, e.r * 1.1, 0.45, '#fff2d0', 0.9);
          fx.burst(e.x, e.y + 0.2, e.z, 18 + e.r * 4, { colors: this.dustCols(), speed: e.r * 2.2, life: 0.9, s0: 0.6, s1: 1.6, grav: -0.3, up: 0.05, drag: 2.5 });
          fx.addShake(Math.min(0.6, 0.15 + (e.mag || 0) / 4000));
          if (!quiet) this.play('slam', e, { mag: e.mag });
          break;
        case 'explosion': {
          const r = e.r || 2;
          const fire = e.look === 'snowball' || e.look === 'snowboulder' ? FROST : e.look === 'goo' ? GOO : e.look === 'seedpod' ? SPORE : e.look === 'sun' ? GOLD : FIRE;
          fx.burst(e.x, e.y + 0.3, e.z, 16 + r * 6, { colors: fire, speed: r * 2.6, life: 0.55, s0: 0.9, s1: 0.2, grav: 1, up: 0.5, drag: 2 });
          fx.burst(e.x, e.y + 0.5, e.z, 8 + r * 2, { colors: fire === FIRE ? SMOKE : fire, speed: r * 1.1, life: 1.4, s0: 0.8, s1: 2.2, grav: -1.2, up: 0.6, drag: 1.5 });
          fx.ring(e.x, this.g.groundY(e.x, e.z), e.z, 0.3, r * 1.25, 0.4, fire === FIRE ? '#ffd9a0' : '#ffffff', 0.85);
          fx.addShake(Math.min(0.8, 0.15 + r * 0.08 + (e.mag || 0) / 5000));
          if (r >= 3 && Math.random() < 0.4) fx.word('KA-BOOM!', e.x, e.y + 0.5, e.z, '#ffb347', 1.1);
          if (!quiet) this.play(fire === FROST ? 'freeze' : 'explosion', e, { mag: (e.mag || 300) + r * 200 });
          break;
        }
        case 'shoot': {
          const s = e.sound || PROJ_SOUND[e.look] || (e.unit && e.unit.def.role === 'siege' ? 'shoot_cannon' : 'shoot_throw');
          if (s === 'shoot_cannon') fx.burst(e.x, e.y, e.z, 8, { colors: SMOKE, speed: 1.5, life: 0.9, s0: 0.5, s1: 1.3, grav: -1, up: 0.5, drag: 2 });
          if (!quiet) this.play(s, e);
          break;
        }
        case 'thud':
          fx.burst(e.x, e.y + 0.05, e.z, 4, { colors: this.dustCols(), speed: 1.4, life: 0.6, s0: 0.3, s1: 0.7, grav: 1, up: 0.5, drag: 2 });
          if (e.stick && (e.look === 'arrow' || e.look === 'bolt' || e.look === 'spear' || e.look === 'harpoon')) fx.stick(e);
          if (!quiet && Math.random() < 0.5) this.play('thud', e, { vol: 0.5 });
          break;
        case 'beam': {
          const pts = e.pts;
          for (let i = 0; i < pts.length - 1; i++) fx.beam(pts[i], pts[i + 1], e.color, e.width || 0.12, e.life || 0.22);
          const end = pts[pts.length - 1];
          if (e.kind !== 'aim') fx.burst(end.x, end.y, end.z, e.kind === 'chain' ? 5 : 3, { colors: e.kind === 'chain' ? ZAP : [col(e.color), col('#ffffff')], speed: 3, life: 0.3, s0: 0.35, s1: 0.05, shape: 'star', grav: 3 });
          if (!quiet && e.sound) this.play(e.sound, e);
          break;
        }
        case 'heal': {
          const from = e.from;
          if (from) fx.beam(from, e, e.look === 'revive' ? '#ffe066' : '#7dffa8', 0.06, 0.3);
          fx.burst(e.x, e.y, e.z, e.look === 'revive' ? 22 : 8, { colors: e.look === 'revive' ? GOLD : HEAL, speed: 1.2, life: 0.9, s0: 0.35, s1: 0.2, shape: 'plus', grav: -2.5, up: 0.8, jitter: 0.6 });
          if (!quiet) this.play(e.look === 'revive' ? 'summon' : 'heal', e, { vol: 0.7 });
          break;
        }
        case 'healTick':
          fx.burst(e.x, e.y, e.z, 2, { colors: HEAL, speed: 0.6, life: 0.8, s0: 0.3, s1: 0.15, shape: 'plus', grav: -2, up: 0.9, jitter: 0.6 });
          break;
        case 'healPulse':
          fx.ring(e.x, e.y, e.z, 0.4, e.r, 0.7, '#7dffa8', 0.8);
          fx.burst(e.x, e.y + 0.5, e.z, 14, { colors: HEAL, speed: e.r * 0.8, life: 0.9, s0: 0.35, s1: 0.15, shape: 'plus', grav: -1.5, up: 0.3, drag: 1.5 });
          if (!quiet) this.play('heal', e, { vol: 0.7 });
          break;
        case 'buff':
          fx.ring(e.x, this.g.groundY(e.x, e.z), e.z, 0.4, e.r, 0.6, '#ffe066', 0.8);
          fx.burst(e.x, e.y + 0.6, e.z, 12, { colors: GOLD, speed: 2, life: 0.8, s0: 0.3, s1: 0.1, shape: 'star', grav: -1, up: 0.4 });
          if (!quiet) this.play('buff', e, { vol: 0.7 });
          break;
        case 'block':
          fx.burst(e.x, e.y, e.z, 5, { colors: [col('#ffffff'), col('#ffe066')], speed: 2.5, life: 0.25, s0: 0.3, s1: 0.05, shape: 'star', grav: 2 });
          if (!quiet && Math.random() < 0.5) this.play('stab', e, { vol: 0.5, pitch: 1.6 });
          break;
        case 'charge':
          fx.burst(e.x, e.y - 0.5, e.z, 12, { colors: this.dustCols(), speed: 3, life: 0.8, s0: 0.5, s1: 1.3, grav: -0.5, up: 0.2, drag: 2 });
          if (!quiet) this.play('charge', e);
          break;
        case 'geyserWarn':
          this.zoneVis.push({ kind: 'steam', x: e.x, y: e.y, z: e.z, r: e.r, t: 0, time: e.time || 1.5 });
          break;
        case 'geyser':
          fx.burst(e.x, e.y + 0.2, e.z, 60, { colors: WATER, speed: 4, vyMul: 4, life: 1.4, s0: 0.6, s1: 0.2, grav: 12, up: 0.85, jitter: e.r });
          fx.ring(e.x, e.y, e.z, 0.5, e.r * 1.6, 0.5, '#ffffff', 0.8);
          fx.addShake(0.25);
          if (!quiet) this.play('geyser', e);
          break;
        case 'sizzle':
          fx.burst(e.x, e.y - 0.4, e.z, e.big ? 16 : 6, { colors: FIRE, speed: 1.5, life: 0.6, s0: 0.4, s1: 0.05, grav: -3, up: 0.8, jitter: 0.4 });
          if (!quiet && Math.random() < 0.4) this.play('sizzle', e, { vol: 0.6 });
          break;
        case 'ignite':
          fx.burst(e.x, e.y, e.z, 6, { colors: FIRE, speed: 1.5, life: 0.5, s0: 0.35, s1: 0.05, grav: -3, up: 0.8 });
          break;
        case 'fall':
          if (this.g.map.water || this.g.map.holes) {
            const wy = this.g.map.water ? this.g.map.water.y : -1;
            fx.burst(e.x, wy + 0.2, e.z, 20, { colors: WATER, speed: 3, vyMul: 2, life: 1, s0: 0.4, s1: 0.15, grav: 10, up: 0.8 });
            if (!quiet) this.play('splash', e);
          } else if (!quiet) this.play('whoosh', e, { mag: 1500 });
          break;
        case 'summon':
          fx.burst(e.x, e.y, e.z, 20, { colors: PURPLE.concat(SPORE), speed: 2.5, life: 0.9, s0: 0.5, s1: 1.1, grav: -1, up: 0.4, drag: 2 });
          if (!quiet) this.play('summon', e);
          break;
        case 'revive':
          fx.ring(e.x, this.g.groundY(e.x, e.z), e.z, 0.2, 2, 0.6, '#ffe066', 0.9);
          break;
        case 'spin':
          fx.burst(e.x, e.y, e.z, 6, { colors: this.dustCols(), speed: 4, life: 0.4, s0: 0.4, s1: 0.8, grav: 0, up: 0.1, drag: 3 });
          if (!quiet && Math.random() < 0.5) this.play('spin', e);
          break;
        case 'cone': {
          const cols = e.look === 'fire' ? FIRE : FROST;
          const half = ((e.angle || 60) * Math.PI) / 360;
          for (let i = 0; i < 10; i++) {
            const a = e.yaw + (Math.random() * 2 - 1) * half;
            const sp = (e.len || 10) * (0.8 + Math.random() * 0.6);
            fx.spawn(e.x, e.y, e.z, Math.sin(a) * sp, (Math.random() - 0.4) * 2, Math.cos(a) * sp, 0.8, 0.3, 1.6, cols[(Math.random() * cols.length) | 0], 0, -0.5, 1.2);
          }
          if (!quiet && Math.random() < 0.25) this.play('freeze', e, { vol: 0.6 });
          break;
        }
        case 'zone':
          this.zoneVis.push({ kind: e.kind, x: e.x, y: e.y, z: e.z, r: e.r, t: 0, time: e.time, team: e.team, look: e.look });
          if (e.kind === 'telegraph' && !quiet) this.play('shoot_magic', e, { pitch: 0.6, vol: 0.5 });
          break;
        case 'windup':
          if (!quiet && e.unit.def.role === 'legendary') this.play('whoosh', e, { mag: 2500 });
          break;
        case 'whiff':
          if (!quiet && Math.random() < 0.3) this.play('whoosh', e, { mag: 300, vol: 0.5 });
          break;
        case 'sudden':
          this.g.onSudden();
          break;
        case 'over':
          break;
      }
    }
  }

  dustCols() {
    const th = this.g.map.theme;
    return th && th.ice ? SNOWDUST : DUST;
  }

  // Ambient + lingering visuals that need per-frame updates.
  update(dt, sim) {
    const fx = this.fx;
    for (let i = this.zoneVis.length - 1; i >= 0; i--) {
      const z = this.zoneVis[i];
      z.t += dt;
      if (z.t > z.time) {
        this.zoneVis.splice(i, 1);
        continue;
      }
      const k = dt * 60;
      if (z.kind === 'steam') {
        if (Math.random() < 0.5 * k) fx.burst(z.x, z.y + 0.1, z.z, 2, { colors: WATER, speed: 0.6, life: 0.9, s0: 0.4, s1: 0.9, grav: -2, up: 0.9, jitter: z.r });
      } else if (z.kind === 'cloud') {
        const cols = z.look === 'goo' ? GOO : SPORE;
        if (Math.random() < 0.6 * k) fx.burst(z.x, z.y + 0.4, z.z, 2, { colors: cols, speed: 0.4, life: 1.4, s0: 0.8, s1: 1.4, grav: -0.2, up: 0.5, jitter: z.r * 1.4 });
      } else if (z.kind === 'heal') {
        if (Math.random() < 0.4 * k) fx.burst(z.x, z.y + 0.2, z.z, 1, { colors: HEAL, speed: 0.4, life: 1.2, s0: 0.3, s1: 0.15, shape: 'plus', grav: -1.5, up: 0.9, jitter: z.r * 1.4 });
        if (Math.random() < 0.05 * k) fx.ring(z.x, z.y, z.z, z.r * 0.6, z.r, 0.8, '#7dffa8', 0.4);
      } else if (z.kind === 'telegraph') {
        const f = z.t / z.time;
        if (Math.random() < 0.25 * k) fx.ring(z.x, z.y, z.z, z.r, z.r * (0.2 + 0.1 * f), 0.35, f > 0.7 ? '#ff5a4e' : '#ffe066', 0.9);
        if (Math.random() < 0.3 * k) fx.burst(z.x, z.y + 6, z.z, 1, { colors: GOLD, speed: 0.2, vyMul: -1, life: 0.5, s0: 0.3, s1: 0.1, grav: 20, up: -1, jitter: z.r });
      }
    }
    if (!sim) return;
    // burning, slowed and fast units
    for (const u of sim.units) {
      if (!u.alive) continue;
      const p = u.p.torso.position;
      if (u.burnT > 0 && Math.random() < dt * 14) fx.spawn(p.x + (Math.random() - 0.5) * 0.4, p.y + 0.2, p.z + (Math.random() - 0.5) * 0.4, 0, 1.8, 0, 0.5, 0.35, 0.05, FIRE[(Math.random() * 4) | 0], 0, -2, 0.5);
      if (u.slowT > 0 && Math.random() < dt * 4) fx.spawn(p.x + (Math.random() - 0.5) * 0.6, p.y, p.z + (Math.random() - 0.5) * 0.6, 0, 0.3, 0, 0.6, 0.2, 0.05, FROST[(Math.random() * 3) | 0], 1, 1, 0.5);
      if ((u.hasteT > 0 || u.mightT > 0) && Math.random() < dt * 3) fx.spawn(p.x + (Math.random() - 0.5) * 0.6, p.y + 0.4, p.z + (Math.random() - 0.5) * 0.6, 0, 0.8, 0, 0.6, 0.22, 0.05, GOLD[(Math.random() * 3) | 0], 1, -0.5, 0.5);
      const v = u.base.velocity;
      const sp = v.x * v.x + v.z * v.z;
      if (sp > 25 && u.grounded && Math.random() < dt * 12) {
        const b = u.base.position;
        fx.spawn(b.x, this.g.groundY(b.x, b.z) + 0.1, b.z, -v.x * 0.1, 0.4, -v.z * 0.1, 0.7, 0.35, 0.9, this.dustCols()[0], 0, -0.3, 2);
      }
    }
    // ambient: lava embers, snow
    const map = this.g.map;
    if (map.hazards) {
      for (const h of map.hazards) {
        if (h.type === 'lava' && Math.random() < dt * 6) {
          const a = Math.random() * 6.28;
          const r = Math.random() * h.r;
          fx.spawn(h.x + Math.cos(a) * r, this.g.groundY(h.x, h.z) + 0.2, h.z + Math.sin(a) * r, 0, 1.5 + Math.random() * 2, 0, 1.2, 0.25, 0.05, FIRE[(Math.random() * 4) | 0], 0, 1, 0.3);
        }
      }
    }
    if (map.theme && map.theme.ice && Math.random() < dt * 20) {
      const c = this.g.camera.position;
      fx.spawn(c.x + (Math.random() - 0.5) * 40, c.y + 10, c.z + (Math.random() - 0.5) * 40, 0.5, -1.5, 0.2, 7, 0.18, 0.18, SNOWDUST[0], 0, 0, 0);
    }
  }
}
