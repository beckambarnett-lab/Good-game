import { newControl } from '../sim/possess.js';
import { THREE } from '../view/three.js';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();
const _d = new THREE.Vector3();

// Player control of one unit during battle.
// Desktop: WASD moves (camera-relative), the mouse turns the view (pointer lock when the page allows
// it; otherwise the cursor is the crosshair and pushing it to a screen edge turns), left button
// attacks, right button / F fires the skill, Space jumps, Esc releases.
// Touch: left thumb is a floating joystick, right thumb drags the view, on-screen buttons attack,
// fire the skill and jump.
export class Possession {
  constructor(game) {
    this.g = game;
    this.u = null;
    this.fire = false;
    this.fire2 = false;
    this.jump = false;
    this.keys = new Set();
    this.cursor = null;
    this.joy = null; // {id, x0, y0, x, y}
    this.look = null; // {id, x, y}
    this.locked = false;
    this.lockFailed = false;
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === game.canvas;
      this.syncKeys();
    });
    document.addEventListener('pointerlockerror', () => {
      // sandboxed pages may refuse pointer lock: stay in cursor-aim mode for good
      this.locked = false;
      this.lockFailed = true;
      this.syncKeys();
    });
    const hold = (id, on, off) => {
      const b = $(id);
      const dn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        b.classList.add('held');
        on();
      };
      const up = (e) => {
        e.preventDefault();
        b.classList.remove('held');
        off();
      };
      b.addEventListener('pointerdown', dn);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    };
    hold('pz-b-atk', () => (this.fire = true), () => (this.fire = false));
    hold('pz-b-skill', () => (this.fire2 = true), () => (this.fire2 = false));
    hold('pz-b-jump', () => (this.jump = true), () => (this.jump = false));
    $('pz-exit').addEventListener('click', () => this.release());
  }

  get active() {
    return !!this.u;
  }

  // Campaign: only your own (blue) units. Sandbox: either side.
  canPossess(u) {
    const g = this.g;
    return !!u && u.alive && g.mode === 'battle' && (g.session.kind === 'sandbox' || u.team === 0);
  }

  start(u) {
    const g = this.g;
    if (!this.canPossess(u)) {
      g.ui.toast(u && u.alive ? 'You can only possess your own units' : 'That unit is down');
      return;
    }
    if (this.u) this.u.ctrl = null;
    this.u = u;
    u.ctrl = newControl();
    this.fire = this.fire2 = this.jump = false;
    this.joy = this.look = null;
    this.keys.clear();
    g.rig.keys.clear();
    g.rig.startPossess(u);
    g.ui.hideFollow();
    g.ui.hint('');
    const touch = g.mobile;
    $('possess').hidden = false;
    $('possess').classList.toggle('touch', touch);
    $('pz-name').textContent = u.def.name;
    $('pz-name').style.color = u.team === 0 ? '#8db4ff' : '#ff9a92';
    $('pz-skill-w').hidden = !u.def.weapon2;
    $('pz-b-skill').hidden = !u.def.weapon2;
    $('pz-charge-w').hidden = !u.def.charge;
    this.syncKeys();
    if (!touch) this.requestLock();
    g.audio.play('summon', { vol: 0.6 });
    g.ui.fight('POSSESSED!', false, true);
  }

  requestLock() {
    const c = this.g.canvas;
    if (!c.requestPointerLock) return;
    try {
      const p = c.requestPointerLock();
      if (p && p.catch)
        p.catch(() => {
          this.lockFailed = true;
          this.syncKeys();
        });
    } catch {
      this.lockFailed = true;
    }
  }

  // quiet: no camera handoff/feedback (battle reset, menu)
  release(quiet) {
    const g = this.g;
    const u = this.u;
    if (!u) return;
    u.ctrl = null;
    u.target = null;
    u.atk = null;
    u.pose = null;
    this.u = null;
    this.fire = this.fire2 = this.jump = false;
    this.joy = this.look = null;
    $('possess').hidden = true;
    $('pz-joy').hidden = true;
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
    if (quiet) {
      g.rig.stopFollow();
      return;
    }
    // hand back to the follow cam on the same unit
    g.follow(u);
  }

  syncKeys() {
    const k = $('pz-keys');
    if (!k) return;
    k.textContent = this.locked
      ? 'WASD move · Mouse aim · Click attack · Right-click / F skill · Space jump · Esc release'
      : `WASD move · Aim with the cursor (screen edges turn) · Click attack · Right-click / F skill · Space jump · Esc release${this.lockFailed ? '' : ' · Click to lock the mouse'}`;
  }

  // ---------------------------------------------------------------- input hooks (return true = handled)
  pointerDown(e, p) {
    if (!this.u) return false;
    const g = this.g;
    if (e.pointerType === 'touch') {
      const w = g.canvas.clientWidth;
      if (p.x < w * 0.45 && !this.joy) {
        this.joy = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y };
        const j = $('pz-joy');
        j.hidden = false;
        j.style.left = `${p.x}px`;
        j.style.top = `${p.y}px`;
        j.firstElementChild.style.transform = '';
      } else if (!this.look) this.look = { id: e.pointerId, x: p.x, y: p.y };
      return true;
    }
    this.cursor = p;
    if (e.button === 0) {
      this.fire = true;
      // a click while unlocked asks for the lock again (it needs a user gesture)
      if (!this.locked && !this.lockFailed) this.requestLock();
    } else if (e.button === 2) this.fire2 = true;
    else if (e.button === 1) this.rightLook = { x: p.x, y: p.y };
    return true;
  }

  pointerMove(e, p) {
    if (!this.u) return false;
    const g = this.g;
    if (e.pointerType === 'touch') {
      if (this.joy && e.pointerId === this.joy.id) {
        this.joy.x = p.x;
        this.joy.y = p.y;
        let dx = p.x - this.joy.x0;
        let dy = p.y - this.joy.y0;
        const L = Math.hypot(dx, dy);
        if (L > 40) {
          dx *= 40 / L;
          dy *= 40 / L;
        }
        $('pz-joy').firstElementChild.style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (this.look && e.pointerId === this.look.id) {
        g.rig.rotate((p.x - this.look.x) * 1.5, (p.y - this.look.y) * 1.5);
        this.look.x = p.x;
        this.look.y = p.y;
      }
      return true;
    }
    if (this.locked) g.rig.rotate(e.movementX || 0, e.movementY || 0);
    else {
      this.cursor = p;
      if (this.rightLook) {
        g.rig.rotate(p.x - this.rightLook.x, p.y - this.rightLook.y);
        this.rightLook = { x: p.x, y: p.y };
      }
    }
    return true;
  }

  pointerUp(e) {
    if (!this.u) return false;
    if (e.pointerType === 'touch') {
      if (this.joy && e.pointerId === this.joy.id) {
        this.joy = null;
        $('pz-joy').hidden = true;
      }
      if (this.look && e.pointerId === this.look.id) this.look = null;
      return true;
    }
    if (e.button === 0) this.fire = false;
    else if (e.button === 2) this.fire2 = false;
    else if (e.button === 1) this.rightLook = null;
    return true;
  }

  key(e, down) {
    if (!this.u) return false;
    const code = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      if (down) this.keys.add(code);
      else this.keys.delete(code);
      e.preventDefault();
      return true;
    }
    if (code === 'Space') {
      this.jump = down;
      e.preventDefault();
      return true;
    }
    if (code === 'KeyF' || code === 'KeyE') {
      this.fire2 = down;
      return true;
    }
    if (code === 'Escape' && down) {
      this.release();
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const u = this.u;
    if (!u) return;
    const g = this.g;
    if (g.mode !== 'battle') return this.release(true);
    if (!u.alive) {
      g.ui.toast(`Your ${u.def.name} is down!`);
      this.release();
      return;
    }
    const rig = g.rig;
    const c = u.ctrl;
    const w = g.canvas.clientWidth;
    const h = g.canvas.clientHeight;

    // cursor mode: pushing the cursor to a side edge turns the view
    if (!this.locked && !g.mobile && this.cursor && !this.rightLook) {
      const ex = (this.cursor.x / w - 0.5) * 2;
      if (Math.abs(ex) > 0.72) rig.pYaw -= Math.sign(ex) * ((Math.abs(ex) - 0.72) / 0.28) * dt * 2.6;
    }

    // movement, relative to the view
    const K = this.keys;
    let f = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0);
    let s = (K.has('KeyD') || K.has('ArrowRight') ? 1 : 0) - (K.has('KeyA') || K.has('ArrowLeft') ? 1 : 0);
    if (this.joy) {
      const jx = (this.joy.x - this.joy.x0) / 40;
      const jy = (this.joy.y - this.joy.y0) / 40;
      const L = Math.hypot(jx, jy);
      if (L > 0.15) {
        const k = Math.min(1, L) / L;
        s += jx * k;
        f -= jy * k;
      }
    }
    const yaw = rig.pYaw;
    let mx = Math.sin(yaw) * f - Math.cos(yaw) * s;
    let mz = Math.cos(yaw) * f + Math.sin(yaw) * s;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) {
      mx /= ml;
      mz /= ml;
    }
    c.mx = mx;
    c.mz = mz;

    // aim ray through the crosshair
    const cx = this.locked || g.mobile || !this.cursor ? w / 2 : this.cursor.x;
    const cy = this.locked || g.mobile || !this.cursor ? h / 2 : this.cursor.y;
    const cam = g.camera;
    _v.set((cx / w) * 2 - 1, -(cy / h) * 2 + 1, 0.5).unproject(cam);
    _d.copy(_v).sub(cam.position).normalize();
    c.ox = cam.position.x;
    c.oy = cam.position.y;
    c.oz = cam.position.z;
    c.dx = _d.x;
    c.dy = _d.y;
    c.dz = _d.z;
    const gp = g.groundPoint(cx, cy);
    c.gx = gp ? gp.x : null;
    c.gz = gp ? gp.z : 0;

    // aim yaw: toward the point under the crosshair, else along the view
    if (gp && Math.hypot(gp.x - u.x, gp.z - u.z) > 2) c.yaw = Math.atan2(gp.x - u.x, gp.z - u.z);
    else c.yaw = Math.atan2(_d.x, _d.z);

    c.fire = this.fire;
    c.fire2 = this.fire2;
    c.jump = this.jump;
    this.hud(cx, cy);
  }

  hud(cx, cy) {
    const u = this.u;
    const g = this.g;
    const c = u.ctrl;
    const cross = $('pz-cross');
    cross.style.left = `${cx}px`;
    cross.style.top = `${cy}px`;
    const L = c.lock;
    const lock = $('pz-lock');
    const ally = L && L.team === u.team;
    cross.classList.toggle('hot', !!L && !ally);
    cross.classList.toggle('ally', !!ally);
    if (L) {
      const p = L.p.torso.position;
      _v.set(p.x, p.y, p.z).project(g.camera);
      if (_v.z < 1) {
        lock.hidden = false;
        lock.style.left = `${((_v.x + 1) / 2) * g.canvas.clientWidth}px`;
        lock.style.top = `${((1 - _v.y) / 2) * g.canvas.clientHeight}px`;
        lock.classList.toggle('ally', !!ally);
      } else lock.hidden = true;
    } else lock.hidden = true;
    $('pz-nope').classList.toggle('show', g.sim.time - c.noTargetT < 0.6);
    $('pz-hp').style.width = `${Math.max(0, (u.hp / u.maxHp) * 100)}%`;
    const w = u.def.weapon;
    const cd = (el, frac) => {
      el.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
      el.parentElement.classList.toggle('ready', frac >= 1);
    };
    cd($('pz-cd-atk'), u.atk ? 0 : 1 - Math.max(0, u.cool) / (w.cooldown || 1));
    if (u.def.weapon2) {
      const f2 = 1 - Math.max(0, u.cool2) / (u.def.weapon2.cooldown || 1);
      cd($('pz-cd-skill'), f2);
      $('pz-b-skill').classList.toggle('cool', f2 < 1);
    }
    if (u.def.charge) cd($('pz-cd-charge'), u.charge);
  }
}
