/* ================= audio (all synthesized) ================= */
const Snd = {
  ctx: null, on: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; try { this.ctx = new AC(); } catch (e) { return false; }
    const c = this.ctx; this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22; }
    this.noise = buf; const wb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), wd = wb.getChannelData(0); for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1; this.white = wb;
    this.amb = c.createGain(); this.amb.connect(this.master); this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = 0; this.music.connect(this.master);
    const dl = c.createDelay(1.5); dl.delayTime.value = 0.42; const fb = c.createGain(); fb.gain.value = 0.36; const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1500; const wet = c.createGain(); wet.gain.value = 0.5; this.music.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(wet); wet.connect(this.master);
    const loop = (rate, type, f, q, g0) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; const g = c.createGain(); g.gain.value = g0 || 0; s.connect(fl); fl.connect(g); g.connect(this.amb); s.start(); return { g, fl }; };
    this.rainHi = loop(1, 'highpass', 900); this.rainLo = loop(0.6, 'lowpass', 600); this.city = loop(0.3, 'lowpass', 220); this.hum = (() => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 240; f.Q.value = 6; const g = c.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); g.connect(this.amb); o.start(); return { g }; })();
    this.next = c.currentTime + 0.5; this.nNote = c.currentTime + 2; this.chI = 0; this.applyVol(); return true;
  },
  applyVol() { if (!this.ctx) return; const t = this.ctx.currentTime, m = SET.sound; this.master.gain.setTargetAtTime(m > 0 ? SET.vol : 0, t, 0.3); this.music.gain.setTargetAtTime(m === 2 ? SET.music * 0.7 : 0, t, 0.8); },
  update(dt) {
    if (!this.ctx || SET.sound === 0) return; const c = this.ctx, t = c.currentTime, r = WX.rain, inside = playerIndoors(), roof = player && player.pos.y > 9.5;
    const k = inside ? 0.45 : 1; this.rainHi.g.gain.setTargetAtTime((0.04 + 0.2 * r) * k, t, 0.4); this.rainHi.fl.frequency.setTargetAtTime(inside ? 500 : 900 + 900 * r, t, 0.4); this.rainLo.g.gain.setTargetAtTime((0.05 + 0.3 * r) * (inside ? 0.6 : 1), t, 0.6);
    this.city.g.gain.setTargetAtTime(inside ? 0.05 : (roof ? 0.14 : 0.1), t, 1); this.hum.g.gain.setTargetAtTime(typeof humLevel === 'function' ? humLevel() * 0.012 : 0, t, 0.3);
    // drips on surfaces
    const rate = (2 + 16 * r) * (inside ? 0.6 : 1); if (Math.random() < rate * dt) this.drip(inside ? 'roof' : (umbrellaUp ? 'umb' : 'puddle'));
    if (SET.sound === 2) { while (this.next < t + 0.25) { this.pad(Math.max(this.next, t)); this.next += 8; } while (this.nNote < t + 0.25) { if (Math.random() < 0.6) this.koto(Math.max(this.nNote, t)); this.nNote += pick([0.75, 0.75, 1.5, 0.375, 1.125]); } }
    else { this.next = Math.max(this.next, t); this.nNote = Math.max(this.nNote, t); }
  },
  env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); },
  pan(bus) { const c = this.ctx; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = rand(-0.8, 0.8); p.connect(bus || this.amb); return p; } return bus || this.amb; },
  drip(kind) {
    const c = this.ctx, t = c.currentTime + Math.random() * 0.03, out = this.pan();
    if (kind === 'umb') { const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.white; bp.type = 'bandpass'; bp.frequency.value = rand(2400, 4200); bp.Q.value = 3; this.env(g, t, 0.001, 0.12, 0.03); s.connect(bp); bp.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + 0.06); return; }
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.white; bp.type = 'bandpass'; bp.frequency.value = kind === 'roof' ? rand(500, 900) : rand(900, 1800); bp.Q.value = 3; this.env(g, t, 0.002, kind === 'roof' ? 0.12 : 0.18, 0.05); s.connect(bp); bp.connect(g); g.connect(out); s.start(t, Math.random() * 1.5); s.stop(t + 0.1);
  },
  mf(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  // miyako-bushi on D: D Eb G A Bb
  pad(t) { const CH = [[50, 57, 62, 65, 67], [51, 58, 62, 67, 70], [43, 50, 57, 62, 65], [45, 52, 57, 63, 67]]; const ns = CH[this.chI++ % 4], c = this.ctx; const fl = typeof musicFlavor === 'function' ? musicFlavor() : 0;
    ns.forEach(m => { const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = fl === 2 ? 'sawtooth' : 'triangle'; o.frequency.value = this.mf(m); o.detune.value = rand(-7, 7); lp.type = 'lowpass'; lp.frequency.value = fl === 2 ? 1200 : 800; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(fl === 1 ? 0.012 : 0.02, t + 2.4); g.gain.setValueAtTime(fl === 1 ? 0.012 : 0.02, t + 6); g.gain.exponentialRampToValueAtTime(0.0001, t + 9.5); o.connect(lp); lp.connect(g); g.connect(this.music); o.start(t); o.stop(t + 9.6); });
    if (fl !== 1) { const k = c.createOscillator(), kg = c.createGain(); k.frequency.setValueAtTime(110, t); k.frequency.exponentialRampToValueAtTime(40, t + 0.15); this.env(kg, t, 0.002, 0.18, 0.25); k.connect(kg); kg.connect(this.music); k.start(t); k.stop(t + 0.4); for (const dt2 of [1.66, 3.33, 5.0, 6.66]) { const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.white; bp.type = 'highpass'; bp.frequency.value = 5000; this.env(g, t + dt2, 0.002, 0.03, 0.12); s.connect(bp); bp.connect(g); g.connect(this.music); s.start(t + dt2, Math.random()); s.stop(t + dt2 + 0.2); } }
  },
  koto(t) { const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); const m = pick([62, 63, 67, 69, 70, 74, 75, 79]); o.type = 'triangle'; o.frequency.value = this.mf(m); o2.type = 'sine'; o2.frequency.value = this.mf(m) * 2.01; f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.8); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6); o.connect(f); o2.connect(f); f.connect(g); g.connect(this.music); o.start(t); o2.start(t); o.stop(t + 1.7); o2.stop(t + 1.7); },
  tone(f, type, peak, dec, delay) { if (!this.ctx || SET.sound === 0) return; const c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; this.env(g, t, 0.004, peak, dec); o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dec + 0.06); },
  hit(f, q, peak, dec, delay, rate, type) { if (!this.ctx || SET.sound === 0) return; const c = this.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.white; s.playbackRate.value = rate || 1; bp.type = type || 'bandpass'; bp.frequency.value = f; bp.Q.value = q; this.env(g, t, 0.003, peak, dec); s.connect(bp); bp.connect(g); g.connect(this.sfx); s.start(t, Math.random()); s.stop(t + dec + 0.05); },
  coin() { this.tone(1318, 'sine', 0.05, 0.18); this.tone(1976, 'sine', 0.035, 0.24, 0.06); this.hit(5000, 3, 0.05, 0.05); },
  bell() { [1, 2.76, 5.4].forEach((r, i) => this.tone(1320 * r, 'sine', [0.05, 0.02, 0.01][i], 0.9 - i * 0.2)); this.tone(1760, 'sine', 0.035, 0.6, 0.09); },
  chime() { [1046, 1245, 1568, 2093].forEach((f, i) => this.tone(f, 'sine', 0.045, 0.6, i * 0.08)); },
  build() { [587, 698, 880, 1175].forEach((f, i) => this.tone(f, 'triangle', 0.06, 0.7, i * 0.09)); },
  click() { this.tone(1500, 'sine', 0.025, 0.05); },
  soft() { this.tone(880, 'sine', 0.03, 0.12); },
  miss() { this.tone(233, 'triangle', 0.05, 0.35); this.tone(208, 'triangle', 0.04, 0.4, 0.12); },
  knock() { this.hit(rand(300, 500), 3, 0.35, 0.08); this.tone(rand(140, 180), 'sine', 0.12, 0.09); },
  drill() { if (!this.ctx || SET.sound === 0) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(320, t + 0.3); this.env(g, t, 0.01, 0.04, 0.32); o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 0.4); },
  zap() { this.hit(3000, 1, 0.12, 0.08); this.tone(90, 'square', 0.05, 0.12); },
  step(surf) { const f = { wood: [220, 2, 0.08], tatami: [180, 1.2, 0.04], metal: [900, 6, 0.06], wet: [1300, 1.3, 0.07], stone: [400, 2, 0.06] }[surf] || [300, 2, 0.06]; this.hit(f[0] * rand(0.85, 1.15), f[1], f[2], 0.06, 0, surf === 'wet' ? 0.8 : 1); if (surf === 'metal') this.tone(rand(500, 700), 'sine', 0.012, 0.08); },
  pour() { this.hit(900, 0.8, 0.12, 0.9, 0, 0.7); this.hit(1500, 1.2, 0.06, 0.7, 0.1, 0.9); },
  loopStart(key, f, q, peak) { if (!this.ctx || SET.sound === 0 || this[key]) return; const c = this.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.white; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; g.gain.value = 0.0001; g.gain.setTargetAtTime(peak, c.currentTime, 0.05); s.connect(bp); bp.connect(g); g.connect(this.sfx); s.start(); this[key] = { s, g, bp }; },
  loopStop(key) { const p = this[key]; if (!p) return; const c = this.ctx; p.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.05); p.s.stop(c.currentTime + 0.3); this[key] = null; },
  loopFreq(key, f) { if (this[key]) this[key].bp.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05); },
  whistle() { if (!this.ctx || SET.sound === 0) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1800, t); o.frequency.linearRampToValueAtTime(2300, t + 0.6); this.env(g, t, 0.1, 0.05, 0.9); o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + 1.1); },
  buzz() { if (!this.ctx || SET.sound === 0) return; const c = this.ctx, t = c.currentTime; for (const d of [0, 0.22]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 160; this.env(g, t + d, 0.01, 0.03, 0.15); o.connect(g); g.connect(this.sfx); o.start(t + d); o.stop(t + d + 0.2); } },
  blip() { this.tone(rand(700, 900), 'square', 0.008, 0.03); },
  train() { if (!this.ctx || SET.sound === 0) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; s.loop = true; s.playbackRate.value = 0.5; lp.type = 'lowpass'; lp.frequency.value = 300; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 3.5); g.gain.setValueAtTime(0.5, t + 5); g.gain.exponentialRampToValueAtTime(0.0001, t + 9); s.connect(lp); lp.connect(g); g.connect(this.amb); s.start(t); s.stop(t + 9.2); for (let i = 0; i < 16; i++) this.hit(rand(120, 220), 2, 0.12, 0.08, 3 + i * 0.28, 0.5); },
  thunder(delay) { if (!this.ctx || SET.sound === 0) return; const c = this.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; s.playbackRate.value = 0.35; lp.type = 'lowpass'; lp.frequency.setValueAtTime(420, t); lp.frequency.exponentialRampToValueAtTime(60, t + 3.5); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.1, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 4); s.connect(lp); lp.connect(g); g.connect(this.master); s.start(t); s.stop(t + 4.1); },
  purr() { if (!this.ctx || SET.sound === 0) return; const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); s.buffer = this.noise; lp.type = 'lowpass'; lp.frequency.value = 180; lfo.frequency.value = 24; lg.gain.value = 0.12; lfo.connect(lg); lg.connect(g.gain); g.gain.value = 0.15; s.connect(lp); lp.connect(g); g.connect(this.sfx); s.start(t); lfo.start(t); g.gain.setTargetAtTime(0, t + 1.6, 0.2); s.stop(t + 2.4); lfo.stop(t + 2.4); },
};
function setSound(m) { SET.sound = m; saveSet(); if (m > 0) Snd.init(); Snd.applyVol(); }
document.addEventListener('pointerdown', () => { if (SET.sound > 0 && started) { if (!Snd.ctx) Snd.init(); else if (Snd.ctx.state === 'suspended') Snd.ctx.resume(); Snd.applyVol(); } }, { capture: true });
document.addEventListener('keydown', () => { if (SET.sound > 0 && started && Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume(); }, { capture: true });

