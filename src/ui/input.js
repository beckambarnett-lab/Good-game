// Pointer, touch and keyboard input for placement and cameras.
export class Input {
  constructor(game) {
    this.g = game;
    this.ptrs = new Map();
    this.drag = null;
    const c = game.canvas;
    c.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e, true));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        game.rig.dolly(Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 60));
      },
      { passive: false },
    );
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => {
      game.rig.keys.clear();
      game.pz.keys.clear();
      game.pz.fire = game.pz.fire2 = game.pz.jump = false;
    });
  }

  local(e) {
    const r = this.g.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  down(e) {
    const g = this.g;
    g.unlockAudio();
    const p = this.local(e);
    if (g.pz.active) {
      try {
        g.canvas.setPointerCapture(e.pointerId);
      } catch {}
      g.pz.pointerDown(e, p);
      return;
    }
    this.ptrs.set(e.pointerId, { ...p, sx: p.x, sy: p.y });
    try {
      g.canvas.setPointerCapture(e.pointerId);
    } catch {}
    if (this.ptrs.size === 2) {
      // switch to two-finger camera gesture
      this.drag = { kind: 'multi', ...this.multiState() };
      return;
    }
    if (this.ptrs.size > 2) return;
    const touch = e.pointerType === 'touch';
    const build = g.mode === 'build';
    if (build && e.button === 0 && g.selected && !g.eraser) {
      this.drag = { kind: 'paint', moved: 0, last: null, touch, start: p, placed: false };
      if (!touch) this.paint(p, true);
      else this.drag.pending = true; // wait a moment: this might become a two-finger gesture
    } else if (build && e.button === 0 && g.eraser) {
      this.drag = { kind: 'erase', start: p };
      this.erase(p);
    } else if (e.button === 2 || e.button === 1) {
      this.drag = { kind: 'look', start: p, last: p, moved: 0, right: e.button === 2 };
    } else {
      this.drag = { kind: 'look', start: p, last: p, moved: 0, tap: true };
    }
  }

  multiState() {
    const [a, b] = [...this.ptrs.values()];
    return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  move(e) {
    const g = this.g;
    if (g.pz.active) {
      g.pz.pointerMove(e, this.local(e));
      return;
    }
    if (!this.ptrs.has(e.pointerId)) {
      // hover (mouse): placement ghost
      if (g.mode === 'build' && e.pointerType === 'mouse' && e.target === g.canvas) {
        const gp = g.groundPoint(...Object.values(this.local(e)));
        g.updateGhost(gp ? gp.x : 0, gp ? gp.z : 0, !!gp);
      } else if (e.target !== g.canvas) g.updateGhost(0, 0, false);
      return;
    }
    const p = this.local(e);
    const prev = this.ptrs.get(e.pointerId);
    this.ptrs.set(e.pointerId, { ...prev, x: p.x, y: p.y });
    const d = this.drag;
    if (!d) return;
    if (d.kind === 'multi' && this.ptrs.size >= 2) {
      const s = this.multiState();
      g.rig.pan(s.mx - d.mx, s.my - d.my);
      if (d.dist > 0 && s.dist > 0) g.rig.dolly(Math.log(d.dist / s.dist) * 6);
      let da = s.ang - d.ang;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      g.rig.rotate(-da * 180, 0);
      Object.assign(d, s);
      return;
    }
    if (d.kind === 'paint') {
      if (d.pending) {
        if (Math.hypot(p.x - d.start.x, p.y - d.start.y) > 4) {
          d.pending = false;
          this.paint(d.start, true);
        } else return;
      }
      this.paint(p, false);
      if (e.pointerType === 'mouse') {
        const gp = g.groundPoint(p.x, p.y);
        g.updateGhost(gp ? gp.x : 0, gp ? gp.z : 0, !!gp);
      }
    } else if (d.kind === 'erase') this.erase(p);
    else if (d.kind === 'look') {
      const dx = p.x - d.last.x;
      const dy = p.y - d.last.y;
      d.moved += Math.abs(dx) + Math.abs(dy);
      d.last = p;
      g.rig.rotate(dx, dy);
    }
  }

  up(e, cancel) {
    const g = this.g;
    if (g.pz.active && g.pz.pointerUp(e)) {
      this.ptrs.delete(e.pointerId);
      this.drag = null;
      return;
    }
    const had = this.ptrs.get(e.pointerId);
    this.ptrs.delete(e.pointerId);
    const d = this.drag;
    if (!had || !d) return;
    if (d.kind === 'multi') {
      if (this.ptrs.size === 0) this.drag = null;
      return;
    }
    if (!cancel) {
      if (d.kind === 'paint' && d.pending) this.paint(d.start, true);
      if (d.kind === 'look' && d.moved < 8) {
        const p = this.local(e);
        if (d.right && g.mode === 'build') g.removeNear(...Object.values(this.groundOr(p)));
        else if (g.mode === 'battle' || g.mode === 'result') {
          const u = g.pickUnit(p.x, p.y);
          if (u) g.follow(u);
        } else if (g.mode === 'build' && d.tap && !g.selected) g.ui.toast('Pick a unit from the tray first');
      }
    }
    this.drag = null;
  }

  groundOr(p) {
    const gp = this.g.groundPoint(p.x, p.y);
    return gp ? { x: gp.x, z: gp.z } : { x: 9999, z: 9999 };
  }

  paint(p, first) {
    const g = this.g;
    const gp = g.groundPoint(p.x, p.y);
    if (!gp) return;
    const d = this.drag;
    const def = g.selected;
    const spacing = (def.mount ? Math.max(1.6, (def.mount.len || 1.5) * 0.9) : 0.75 * (def.scale || 1) * (def.bulk || 1)) + 0.35;
    if (!first && d.last && Math.hypot(gp.x - d.last.x, gp.z - d.last.z) < spacing) return;
    if (g.tryPlace(gp.x, gp.z, !first)) d.last = gp;
    else if (first) d.last = gp;
  }

  erase(p) {
    const gp = this.g.groundPoint(p.x, p.y);
    if (gp) this.g.removeNear(gp.x, gp.z, 1.2);
  }

  key(e, down) {
    const g = this.g;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    const code = e.code;
    if (g.pz.key(e, down)) return;
    if (down && code === 'KeyP' && g.mode === 'battle' && g.rig.mode === 'follow') {
      g.pz.start(g.rig.follow);
      return;
    }
    const rigKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyC', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
    if (rigKeys.includes(code)) {
      if (down) g.rig.keys.add(code);
      else g.rig.keys.delete(code);
      if (code.startsWith('Arrow')) e.preventDefault();
      return;
    }
    if (!down) return;
    if (code === 'Space') {
      e.preventDefault();
      if (g.mode === 'build') g.startBattle();
      else if (g.mode === 'battle') g.togglePause();
    } else if (code === 'Escape') {
      if (g.rig.mode === 'follow') {
        g.rig.stopFollow();
        g.ui.hideFollow();
      } else if (!document.getElementById('howto').hidden) g.ui.hideHowto();
    } else if (code === 'KeyR' && (g.mode === 'battle' || g.mode === 'result')) g.resetBattle();
    else if (g.mode === 'battle' && ['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(code)) g.setUserScale([0, 0.25, 1, 2][Number(code.slice(5)) - 1]);
    else if (code === 'KeyX' && g.mode === 'build') {
      g.eraser = !g.eraser;
      g.ui.syncTools();
      g.refreshGhost();
    }
  }
}
