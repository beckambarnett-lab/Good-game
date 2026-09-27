// Clobberfield — synthesized sound effects + a quiet procedural oompah march.
//
// Everything here is generated at runtime with WebAudio (oscillators, one set of
// pre-generated noise buffers, biquad filters and gain envelopes). No samples.
//
//   const audio = createAudio();
//   window.addEventListener('pointerdown', () => audio.unlock());
//   audio.play('bonk', { x, y, z, mag: 1200 });
//
// If WebAudio is unavailable every method is a safe no-op. The AudioContext is
// only created on the first unlock() call.
//
// createAudio(options) also accepts an optional { context, lookahead } for
// testing / offline rendering: `context` is an existing (Offline)AudioContext
// to render into, `lookahead` is the music scheduler horizon in seconds.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const fin = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const NO = {};

// ---- tunables -------------------------------------------------------------
const MAX_VOICES = 24; // concurrent SFX voices
const RATE_LIMIT = 0.035; // s — same name no more often than this (unless louder)
const LOUDER_TO_PASS = 1.25; // a rate-limited repeat must be this much louder
const DIST_REF = 18; // gain = 1 / (1 + d / DIST_REF)
const PAN_MAX = 0.9;
const PAN_NEAR = 3; // pan = lateral / (d + PAN_NEAR): close sounds stay centered
const MIN_GAIN = 0.004; // skip voices quieter than this
const JITTER = 0.06; // ±6 % pitch variation on combat sounds
const MASTER_LEVEL = 0.85;
const MUSIC_LEVEL = 0.02; // music peaks land ≈ -20 dB under typical SFX peaks
const MUSIC_BPM = 116;
const MUSIC_STEPS = 64; // 8 bars of eighth notes
const MUSIC_TICK_MS = 25;
const SLOW_PITCH_MIN = 0.8; // pitch at timeScale → 0+
const SLOW_LP_MIN = 2500; // Hz lowpass at timeScale → 0+
const FAST_PITCH = 0.04; // extra pitch per unit of timeScale above 1
const NOISE_SECONDS = 2;

// ---- music data -------------------------------------------------------------
// [tuba root, tuba fifth, "pah" triad]
const CH_C = [36, 43, [52, 55, 60]];
const CH_G = [43, 38, [50, 55, 59]];
const CH_F = [41, 36, [53, 57, 60]];
const BARS = [CH_C, CH_C, CH_G, CH_C, CH_F, CH_C, CH_G, CH_C];
// [step, midi, length in eighths]
const MELODY = [
  [0, 67, 2], [2, 64, 1], [3, 67, 1], [4, 72, 3],
  [8, 71, 1], [9, 72, 1], [10, 74, 2], [12, 72, 2], [14, 67, 2],
  [16, 65, 2], [18, 69, 1], [19, 67, 1], [20, 65, 2], [22, 62, 2],
  [24, 64, 2], [26, 67, 2], [28, 72, 3],
  [32, 69, 2], [34, 69, 1], [35, 71, 1], [36, 72, 2], [38, 69, 2],
  [40, 67, 2], [42, 64, 1], [43, 67, 1], [44, 72, 4],
  [48, 74, 2], [50, 72, 1], [51, 71, 1], [52, 69, 2], [54, 71, 2],
  [56, 72, 4], [61, 67, 1], [62, 71, 1],
];
const MEL = new Array(MUSIC_STEPS).fill(null);
for (const [s, n, l] of MELODY) MEL[s] = [n, l];

// ---------------------------------------------------------------------------

export function createAudio(options) {
  const opt = options || NO;
  let AC = null;
  try {
    AC = opt.context ? null : globalThis.AudioContext || globalThis.webkitAudioContext || null;
  } catch {
    AC = null;
  }

  let ctx = null;
  let offline = false;
  let failed = false;
  let primed = false;
  let master, comp, sfxBus, slowLP, musicBus;
  let noiseBuf, pinkBuf, crackBuf;

  let muted = false;
  let timeScale = 1;
  let lx = 0, ly = 0, lz = 0, rx = 1, rz = 0; // listener position + right vector

  const active = []; // live SFX voices
  const last = new Map(); // name -> { t, g } for rate limiting

  let musicWanted = false;
  let musicTimer = null;
  let musicStep = 0;
  let musicNext = 0;
  let musicPass = 0;
  const lookahead = fin(opt.lookahead, 0.15);
  const STEP = 60 / MUSIC_BPM / 2;

  // ---- setup ----------------------------------------------------------------
  function init() {
    if (ctx) return true;
    if (failed) return false;
    try {
      if (opt.context) {
        ctx = opt.context;
        offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
      } else {
        if (!AC) {
          failed = true;
          return false;
        }
        try {
          ctx = new AC({ latencyHint: 'interactive' });
        } catch {
          ctx = new AC();
        }
      }
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 10;
      comp.ratio.value = 5;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER_LEVEL;
      slowLP = ctx.createBiquadFilter();
      slowLP.type = 'lowpass';
      slowLP.frequency.value = 20000;
      slowLP.Q.value = 0.5;
      sfxBus = ctx.createGain();
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      sfxBus.connect(slowLP);
      musicBus.connect(slowLP);
      slowLP.connect(master);
      // Soft safety clip after the compressor: transparent below ~-2 dBFS, rounds off
      // the rare transient that slips past the compressor's attack in huge pile-ups.
      const pre = ctx.createGain();
      pre.gain.value = 0.5;
      const clip = ctx.createWaveShaper();
      clip.curve = softClipCurve();
      master.connect(comp);
      comp.connect(pre);
      pre.connect(clip);
      clip.connect(ctx.destination);
      makeBuffers();
      applyTimeScale();
      return true;
    } catch {
      ctx = null;
      failed = true;
      return false;
    }
  }

  // Shaper input is pre-scaled by 0.5, so u ∈ [-1, 1] stands for a signal of ±2.
  function softClipCurve() {
    const n = 2048;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = ((i / (n - 1)) * 2 - 1) * 2;
      const a = Math.abs(s);
      c[i] = a < 0.8 ? s : Math.sign(s) * (0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2));
    }
    return c;
  }

  function makeBuffers() {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * NOISE_SECONDS);
    noiseBuf = ctx.createBuffer(1, len, sr);
    pinkBuf = ctx.createBuffer(1, len, sr);
    crackBuf = ctx.createBuffer(1, len, sr);
    const w = noiseBuf.getChannelData(0);
    const p = pinkBuf.getChannelData(0);
    const c = crackBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const x = Math.random() * 2 - 1;
      w[i] = x;
      // Paul Kellet's pink noise filter
      b0 = 0.99886 * b0 + x * 0.0555179;
      b1 = 0.99332 * b1 + x * 0.0750759;
      b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856;
      b4 = 0.55 * b4 + x * 0.5329522;
      b5 = -0.7616 * b5 - x * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11;
      b6 = x * 0.115926;
    }
    // sparse little clicks: crackle / sizzle / ice
    const k = sr / 48000;
    let i = 0;
    while (i < len) {
      i += Math.floor(rnd(60, 900) * k);
      const amp = rnd(0.3, 1) * (Math.random() < 0.5 ? -1 : 1);
      const L = Math.floor(rnd(8, 40) * k) + 1;
      for (let j = 0; j < L && i + j < len; j++) {
        c[i + j] += amp * Math.exp(-j / (L * 0.3)) * (j & 1 ? -1 : 1);
      }
    }
  }

  function setParam(param, value, tc) {
    const now = ctx.currentTime;
    try {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.setTargetAtTime(value, now, tc);
    } catch {
      param.value = value;
    }
  }

  function slowPitch() {
    if (timeScale <= 0) return 1;
    if (timeScale < 1) return SLOW_PITCH_MIN + (1 - SLOW_PITCH_MIN) * timeScale;
    return 1 + Math.min(timeScale - 1, 1) * FAST_PITCH;
  }

  function applyTimeScale() {
    if (!ctx) return;
    const s = timeScale;
    const lp = s > 0 && s < 1 ? Math.min(20000, SLOW_LP_MIN * Math.pow(8, s)) : 20000;
    setParam(slowLP.frequency, lp, 0.08);
    setParam(musicBus.gain, musicTimer && s > 0 ? MUSIC_LEVEL : 0, 0.08);
  }

  // ---- voice plumbing -------------------------------------------------------
  function finish(v) {
    if (v.done) return;
    v.done = true;
    for (let i = 0; i < v.nodes.length; i++) {
      try {
        v.nodes[i].disconnect();
      } catch {
        /* already gone */
      }
    }
    v.nodes.length = 0;
    v.srcs.length = 0;
    if (v.onDone) v.onDone(v);
  }

  function src(v, node, st, sp, off) {
    v.pending++;
    v.srcs.push(node);
    node.onended = () => {
      if (--v.pending <= 0) finish(v);
    };
    if (off) node.start(st, off);
    else node.start(st);
    node.stop(sp);
  }

  function env(param, st, a, g, hold, D) {
    param.setValueAtTime(0, st);
    param.linearRampToValueAtTime(g, st + a);
    if (hold > 0) param.setValueAtTime(g, st + a + hold);
    param.exponentialRampToValueAtTime(0.0005, st + Math.max(D, a + hold + 0.005));
  }

  // filter spec: { type, f, f1, f2, t, q, lfo: [rateHz, depthHz] } or an array of them
  function filt(v, spec, st, D, head) {
    if (Array.isArray(spec)) {
      for (const s of spec) head = filt(v, s, st, D, head);
      return head;
    }
    const bq = ctx.createBiquadFilter();
    bq.type = spec.type || 'lowpass';
    const fq = bq.frequency;
    fq.setValueAtTime(spec.f, st);
    if (spec.f1) {
      fq.exponentialRampToValueAtTime(spec.f1, st + (spec.t != null ? spec.t * v.d : D));
      if (spec.f2) fq.exponentialRampToValueAtTime(spec.f2, st + D);
    }
    bq.Q.value = spec.q != null ? spec.q : 1;
    if (spec.lfo) {
      const l = ctx.createOscillator();
      l.frequency.value = spec.lfo[0];
      const lg = ctx.createGain();
      lg.gain.value = spec.lfo[1];
      l.connect(lg);
      lg.connect(fq);
      v.nodes.push(l, lg);
      src(v, l, st, st + D + 0.03);
    }
    v.nodes.push(bq);
    head.connect(bq);
    return bq;
  }

  // Oscillator voice. o: { a, hold, gt (glide time), f2 (second glide target), lin,
  //   vib: [rate, depthFrac, delay, decayTo], fm: [ratio, index], filt, dest }
  function tone(v, type, f0, f1, t, dur, g, o) {
    o = o || NO;
    const st = v.t + t * v.d;
    const D = Math.max(0.01, dur * v.d);
    const a0 = f0 * v.p;
    const osc = ctx.createOscillator();
    osc.type = type;
    const fr = osc.frequency;
    fr.setValueAtTime(a0, st);
    const gt = st + (o.gt ? o.gt * v.d : D);
    if (f1 && f1 !== f0) {
      if (o.lin) fr.linearRampToValueAtTime(f1 * v.p, gt);
      else fr.exponentialRampToValueAtTime(f1 * v.p, gt);
      if (o.f2) fr.exponentialRampToValueAtTime(o.f2 * v.p, st + D);
    }
    const amp = ctx.createGain();
    env(amp.gain, st, o.a != null ? o.a : 0.004, g, o.hold ? o.hold * v.d : 0, D);
    v.nodes.push(osc, amp);
    const head = o.filt ? filt(v, o.filt, st, D, osc) : osc;
    head.connect(amp);
    amp.connect(o.dest || v.out);
    const sp = st + D + 0.03;
    if (o.vib) {
      const [rate, depth, delay, decay] = o.vib;
      const l = ctx.createOscillator();
      l.frequency.value = rate;
      const lg = ctx.createGain();
      const dz = depth * a0;
      if (delay) {
        lg.gain.setValueAtTime(0, st);
        lg.gain.linearRampToValueAtTime(dz, st + delay * v.d);
      } else lg.gain.setValueAtTime(dz, st);
      if (decay) lg.gain.exponentialRampToValueAtTime(dz * decay, st + D);
      l.connect(lg);
      lg.connect(fr);
      v.nodes.push(l, lg);
      src(v, l, st, sp);
    }
    if (o.fm) {
      const [ratio, index] = o.fm;
      const m = ctx.createOscillator();
      m.frequency.setValueAtTime(a0 * ratio, st);
      if (f1 && f1 !== f0) m.frequency.exponentialRampToValueAtTime(f1 * v.p * ratio, gt);
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(index * a0, st);
      mg.gain.exponentialRampToValueAtTime(index * a0 * 0.2, st + D);
      m.connect(mg);
      mg.connect(fr);
      v.nodes.push(m, mg);
      src(v, m, st, sp);
    }
    src(v, osc, st, sp);
    return amp;
  }

  // Noise voice. o: { a, hold, buf: 'white'|'pink'|'crackle', rate, dest }
  function noise(v, t, dur, g, f, o) {
    o = o || NO;
    const st = v.t + t * v.d;
    const D = Math.max(0.01, dur * v.d);
    const s = ctx.createBufferSource();
    s.buffer = o.buf === 'pink' ? pinkBuf : o.buf === 'crackle' ? crackBuf : noiseBuf;
    s.loop = true;
    s.playbackRate.value = (o.rate || 1) * v.p;
    const amp = ctx.createGain();
    env(amp.gain, st, o.a != null ? o.a : 0.003, g, o.hold ? o.hold * v.d : 0, D);
    v.nodes.push(s, amp);
    const head = f ? filt(v, f, st, D, s) : s;
    head.connect(amp);
    amp.connect(o.dest || v.out);
    src(v, s, st, st + D + 0.03, Math.random() * (NOISE_SECONDS - 0.5));
    return amp;
  }

  // ---- instruments ---------------------------------------------------------
  function ping(v, f, t, dur, g) {
    tone(v, 'sine', f, 0, t, dur, g, { a: 0.003 });
    tone(v, 'sine', f * 2, 0, t, dur * 0.5, g * 0.12, { a: 0.003 });
    tone(v, 'sine', f * 2.76, 0, t, dur * 0.35, g * 0.18, { a: 0.002 });
  }
  function kazoo(v, f, t, dur, g, vib) {
    const hold = dur * 0.65;
    tone(v, 'sawtooth', f, 0, t, dur, g, {
      a: 0.02, hold, vib: vib || [5.5, 0.012, 0.05],
      filt: { type: 'bandpass', f: 1100, q: 1.3 },
    });
    tone(v, 'square', f * 1.004, 0, t, dur, g * 0.3, {
      a: 0.02, hold, filt: { type: 'bandpass', f: 2300, q: 3 },
    });
  }
  function tuba(v, f, t, dur, g) {
    const hold = dur * 0.35;
    tone(v, 'sawtooth', f * 0.94, f, t, dur, g, {
      a: 0.012, gt: 0.04, hold, filt: { f: 260, f1: 650, t: 0.035, f2: 320, q: 2 },
    });
    tone(v, 'sine', f, 0, t, dur, g * 0.6, { a: 0.012, hold });
  }
  function snare(v, t, g) {
    noise(v, t, 0.13, g, { type: 'bandpass', f: 1900, q: 0.8 });
    tone(v, 'triangle', 200, 150, t, 0.06, g * 0.5);
  }
  function kick(v, t, g) {
    tone(v, 'sine', 110, 48, t, 0.16, g, { a: 0.002 });
  }
  function trombone(v, f, t, dur, g, last) {
    const o = {
      a: 0.03, hold: dur * 0.55,
      filt: { f: 350, f1: 1300, t: 0.12, f2: 650, q: 2 },
      vib: last ? [5, 0.025, 0.3] : null,
    };
    const f1 = f * (last ? 0.93 : 0.975);
    tone(v, 'sawtooth', f, f1, t, dur, g, o);
    tone(v, 'sawtooth', f * 1.006, f1 * 1.006, t, dur, g * 0.5, o);
  }

  // ---- recipes --------------------------------------------------------------
  // g: base gain; ui: centered, no jitter, bypasses slow-mo; prio: stealing priority;
  // loud(m): extra gain from normalized magnitude; m0: default magnitude (0..1).
  const R = {
    bonk: {
      g: 0.6, loud: (m) => 0.45 + 0.55 * Math.sqrt(m), m0: 0.25,
      fn(v, m) {
        const k = 1 - 0.35 * m;
        tone(v, 'sine', 190 * k, 58 * k, 0, 0.14 + 0.12 * m, 1, { a: 0.002 });
        tone(v, 'triangle', 640 * k, 470 * k, 0, 0.06, 0.4, { a: 0.001, gt: 0.03 });
        tone(v, 'square', 340 * k, 250 * k, 0, 0.09, 0.12, { a: 0.002, filt: { f: 1400 } });
        noise(v, 0, 0.03, 0.45, { type: 'bandpass', f: 1900 * k, q: 1.6 });
      },
    },
    slash: {
      g: 0.6,
      fn(v) {
        noise(v, 0, 0.13, 0.55, { type: 'bandpass', f: 1100, f1: 5200, q: 1.3 }, { a: 0.02 });
        tone(v, 'sine', 2450, 2380, 0.02, 0.28, 0.12, { a: 0.001 });
        tone(v, 'sine', 3710, 0, 0.02, 0.18, 0.06, { a: 0.001 });
        tone(v, 'sine', 160, 80, 0.02, 0.07, 0.35);
      },
    },
    stab: {
      g: 0.55,
      fn(v) {
        tone(v, 'sine', 950, 280, 0, 0.045, 0.35, { a: 0.001 });
        tone(v, 'sine', 150, 60, 0.01, 0.13, 0.9);
        noise(v, 0, 0.05, 0.3, { f: 1600 });
      },
    },
    whoosh: {
      g: 0.55, m0: 0.3,
      fn(v, m) {
        const L = 0.24 + 0.2 * m;
        noise(v, 0, L, 0.6, { type: 'bandpass', f: 350, f1: 1800, f2: 700, t: L * 0.55, q: 2.2 }, { a: L * 0.45 });
      },
    },
    shoot_bow: {
      g: 0.8,
      fn(v) {
        tone(v, 'triangle', 440, 196, 0, 0.24, 0.45, { a: 0.001, gt: 0.035, filt: { f: 3000, f1: 900 } });
        tone(v, 'sawtooth', 441, 197, 0, 0.24, 0.12, { a: 0.001, gt: 0.035, filt: { f: 2200, f1: 600 } });
        noise(v, 0, 0.035, 0.25, { type: 'bandpass', f: 3200, q: 1.5 });
        noise(v, 0.02, 0.16, 0.12, { type: 'bandpass', f: 2200, f1: 900, q: 2 }, { a: 0.03 });
      },
    },
    shoot_throw: {
      g: 0.7,
      fn(v) {
        tone(v, 'sine', 280, 720, 0, 0.15, 0.3, { a: 0.02 });
        noise(v, 0, 0.17, 0.3, { type: 'bandpass', f: 500, f1: 1600, q: 1.8 }, { a: 0.05 });
      },
    },
    shoot_cannon: {
      g: 0.65,
      fn(v) {
        tone(v, 'sine', 115, 36, 0, 0.5, 1, { a: 0.003, gt: 0.25 });
        noise(v, 0, 0.38, 0.75, { f: 2200, f1: 180 }, { buf: 'pink' });
        tone(v, 'triangle', 220, 80, 0, 0.09, 0.3);
        noise(v, 0.03, 0.35, 0.12, { type: 'bandpass', f: 600, f1: 250, q: 0.8 }, { a: 0.05 });
      },
    },
    shoot_magic: {
      g: 0.9,
      fn(v) {
        tone(v, 'sine', 620, 1900, 0, 0.22, 0.28, { a: 0.005, fm: [1.5, 1.1] });
        for (let i = 0; i < 3; i++) {
          tone(v, 'sine', (2100 + i * 550) * rnd(0.92, 1.08), 0, 0.04 + i * 0.05, 0.09, 0.08, { a: 0.002 });
        }
      },
    },
    shoot_squirt: {
      g: 0.6,
      fn(v) {
        tone(v, 'sine', 380, 950, 0, 0.08, 0.3, { a: 0.004, vib: [32, 0.2] });
        tone(v, 'sine', 520, 1250, 0.07, 0.07, 0.22, { a: 0.004, vib: [36, 0.2] });
        noise(v, 0, 0.12, 0.18, { type: 'bandpass', f: 1600, q: 3 }, { a: 0.01 });
      },
    },
    beam: {
      g: 1.2,
      fn(v) {
        tone(v, 'sawtooth', 95, 120, 0, 0.34, 0.22, { a: 0.01, fm: [3.3, 3], filt: { type: 'bandpass', f: 1400, q: 1.4 } });
        noise(v, 0, 0.34, 0.9, { type: 'bandpass', f: 3000, q: 0.9 }, { buf: 'crackle' });
        tone(v, 'square', 1700, 320, 0, 0.12, 0.06, { filt: { f: 3200 } });
      },
    },
    explosion: {
      g: 0.75, loud: (m) => 0.6 + 0.4 * m, m0: 0.35,
      fn(v, m) {
        const k = 1 - 0.3 * m;
        const L = Math.min(0.8, 0.45 + 0.35 * m);
        noise(v, 0, L, 0.9, { f: 3000 * k, f1: 140 }, { buf: 'pink', a: 0.004 });
        tone(v, 'sine', 95 * k, 30, 0, L, 1, { a: 0.003, gt: L * 0.6 });
        noise(v, 0, 0.06, 0.35, { type: 'bandpass', f: 1400, q: 0.8 });
        noise(v, 0.04, L, 0.25, { type: 'bandpass', f: 520, f1: 200, q: 0.9 }, { a: 0.06 });
        tone(v, 'triangle', 180 * k, 60, 0, 0.12, 0.3);
      },
    },
    slam: {
      g: 0.7, loud: (m) => 0.6 + 0.4 * m, m0: 0.4,
      fn(v) {
        tone(v, 'sine', 72, 34, 0, 0.5, 1, { a: 0.004, gt: 0.3 });
        tone(v, 'triangle', 150, 60, 0, 0.12, 0.45);
        noise(v, 0, 0.6, 0.6, { f: 380, f1: 110 }, { buf: 'pink', a: 0.02 });
        noise(v, 0.02, 0.16, 0.16, { type: 'bandpass', f: 900, q: 1 });
      },
    },
    thud: {
      g: 0.6,
      fn(v) {
        tone(v, 'sine', 125, 55, 0, 0.12, 0.6);
        noise(v, 0, 0.09, 0.35, { f: 900, f1: 300 });
      },
    },
    death: {
      g: 0.5,
      fn(v) {
        // vowel formants: oo, ah, oh, eh, uh
        const VOW = [[300, 870], [700, 1150], [500, 900], [560, 1700], [420, 1000]];
        const [F1, F2] = VOW[(Math.random() * VOW.length) | 0];
        const f = rnd(170, 400);
        const fall = rnd(0.5, 0.78);
        const dur = rnd(0.24, 0.45);
        const wah = Math.random() < 0.4;
        const hold = dur * 0.35;
        const vib = [rnd(6, 9), 0.03];
        tone(v, 'sawtooth', f, f * fall, 0, dur, 0.9, {
          a: 0.02, hold, vib,
          filt: wah ? { type: 'bandpass', f: F1 * 0.55, f1: F1, t: dur * 0.4, q: 4 } : { type: 'bandpass', f: F1, q: 4 },
        });
        tone(v, 'square', f * 1.003, f * fall * 1.003, 0, dur, 0.4, {
          a: 0.02, hold, filt: { type: 'bandpass', f: F2, q: 5 },
        });
        tone(v, 'sine', f, f * fall, 0, dur, 0.15, { a: 0.02, hold });
      },
    },
    launch: {
      g: 0.5,
      fn(v) {
        tone(v, 'triangle', 170, 480, 0, 0.5, 0.45, { a: 0.005, gt: 0.35, vib: [13, 0.3, 0, 0.08] });
        tone(v, 'sine', 340, 960, 0, 0.35, 0.15, { a: 0.005, gt: 0.3, vib: [13, 0.3, 0, 0.08] });
        noise(v, 0.03, 0.3, 0.18, { type: 'bandpass', f: 700, f1: 2600, q: 1.6 }, { a: 0.08 });
      },
    },
    heal: {
      g: 0.5,
      fn(v) {
        const notes = [523, 659, 784, 1047];
        for (let i = 0; i < notes.length; i++) ping(v, notes[i], i * 0.075, 0.42, 0.22);
      },
    },
    buff: {
      g: 0.5,
      fn(v) {
        noise(v, 0, 0.36, 0.4, { type: 'bandpass', f: 500, f1: 4200, q: 1.6 }, { a: 0.16 });
        tone(v, 'triangle', 440, 880, 0, 0.3, 0.1, { a: 0.05 });
        ping(v, 1319, 0.18, 0.38, 0.16);
        ping(v, 1976, 0.25, 0.4, 0.12);
      },
    },
    charge: {
      g: 0.4,
      fn(v) {
        const T = [0, 0.075, 0.15, 0.32, 0.395, 0.47];
        for (let i = 0; i < T.length; i++) {
          const a = i % 3 === 2 ? 1 : 0.7;
          tone(v, 'sine', 115, 52, T[i], 0.09, 0.55 * a);
          noise(v, T[i], 0.05, 0.22 * a, { f: 800 });
        }
        kazoo(v, mtof(67), 0, 0.12, 0.3);
        kazoo(v, mtof(72), 0.13, 0.22, 0.3);
      },
    },
    splash: {
      g: 0.7,
      fn(v) {
        tone(v, 'sine', 320, 140, 0, 0.08, 0.35);
        noise(v, 0, 0.1, 0.35, { f: 600 });
        noise(v, 0.01, 0.38, 0.55, { type: 'bandpass', f: 2600, f1: 700, q: 1 }, { a: 0.01 });
        for (const t of [0.06, 0.13, 0.21]) {
          const f = rnd(500, 900);
          tone(v, 'sine', f, f * 2.2, t, 0.05, 0.1, { a: 0.002 });
        }
      },
    },
    sizzle: {
      g: 0.4,
      fn(v) {
        noise(v, 0, 0.5, 0.3, { type: 'bandpass', f: 5200, f1: 4200, q: 0.8 }, { a: 0.03, hold: 0.15 });
        noise(v, 0, 0.45, 0.7, { type: 'bandpass', f: 2600, q: 0.9 }, { buf: 'crackle' });
      },
    },
    geyser: {
      g: 0.5,
      fn(v) {
        noise(v, 0, 0.78, 0.5, { type: 'bandpass', f: 280, f1: 2600, t: 0.5, q: 1.2 }, { a: 0.22 });
        noise(v, 0, 0.7, 0.35, { f: 420 }, { buf: 'pink', a: 0.08 });
        tone(v, 'sine', 55, 95, 0, 0.6, 0.35, { a: 0.08 });
        noise(v, 0.1, 0.6, 0.15, { type: 'bandpass', f: 6000, q: 0.7 }, { a: 0.15 });
      },
    },
    place: {
      g: 0.8, ui: true,
      fn(v) {
        tone(v, 'sine', 540, 230, 0, 0.1, 0.55, { a: 0.002, gt: 0.06 });
        tone(v, 'triangle', 1050, 0, 0, 0.035, 0.12, { a: 0.001 });
        noise(v, 0, 0.03, 0.12, { f: 1400 });
      },
    },
    remove: {
      g: 0.45, ui: true,
      fn(v) {
        tone(v, 'sine', 230, 720, 0, 0.09, 0.45, { a: 0.06 });
        noise(v, 0.075, 0.025, 0.22, { type: 'bandpass', f: 2200, q: 1.2 });
        tone(v, 'sine', 900, 1400, 0.075, 0.04, 0.15, { a: 0.001 });
      },
    },
    click: {
      g: 0.9, ui: true,
      fn(v) {
        tone(v, 'sine', 1900, 1200, 0, 0.035, 0.35, { a: 0.001 });
        tone(v, 'triangle', 820, 0, 0, 0.025, 0.12, { a: 0.001 });
      },
    },
    error: {
      g: 0.5, ui: true,
      fn(v) {
        const buzz = (f, t, d) => {
          tone(v, 'square', f, f * 0.97, t, d, 0.16, { a: 0.01, hold: d * 0.5, filt: { f: 900 } });
          tone(v, 'sawtooth', f * 1.01, f * 0.98, t, d, 0.1, { a: 0.01, hold: d * 0.5, filt: { f: 1100 } });
        };
        buzz(233, 0, 0.12);
        buzz(185, 0.14, 0.2);
      },
    },
    start: {
      g: 0.45, ui: true, prio: 2,
      fn(v) {
        tone(v, 'sine', 2350, 0, 0, 0.3, 0.13, { a: 0.01, hold: 0.2, vib: [26, 0.035] });
        noise(v, 0, 0.3, 0.04, { type: 'bandpass', f: 2400, q: 4 }, { a: 0.01, hold: 0.2 });
        for (const f of [262, 330, 392, 523]) {
          tone(v, 'sawtooth', f * 0.985, f, 0.3, 0.42, 0.13, {
            a: 0.03, gt: 0.04, hold: 0.12, filt: { f: 500, f1: 2600, t: 0.06, f2: 900 },
          });
        }
        tone(v, 'sine', 150, 55, 0.3, 0.28, 0.75, { a: 0.002 });
        noise(v, 0.3, 0.14, 0.35, { type: 'bandpass', f: 1700, q: 0.9 });
        noise(v, 0.3, 0.35, 0.08, { type: 'highpass', f: 6000 });
      },
    },
    victory: {
      g: 0.4, ui: true, prio: 3,
      fn(v) {
        const mel = [
          [0, 67, 0.12], [0.14, 72, 0.12], [0.28, 76, 0.12], [0.42, 79, 0.26], [0.7, 76, 0.12],
          [0.84, 79, 0.5], [1.4, 77, 0.12], [1.54, 76, 0.12], [1.68, 74, 0.12], [1.82, 72, 0.62],
        ];
        for (let i = 0; i < mel.length; i++) {
          const [t, n, d] = mel[i];
          kazoo(v, mtof(n), t, d, 0.32, i === mel.length - 1 ? [6, 0.025, 0.15] : null);
        }
        kazoo(v, mtof(76), 1.82, 0.62, 0.16, [6, 0.025, 0.15]);
        const bass = [[0, 48, 0.3], [0.42, 43, 0.3], [0.84, 48, 0.4], [1.4, 41, 0.26], [1.68, 43, 0.14], [1.82, 36, 0.62]];
        for (const [t, n, d] of bass) tuba(v, mtof(n), t, d, 0.4);
        for (const t of [0, 0.42, 0.84, 1.4, 1.82]) kick(v, t, 0.5);
        for (const t of [0.7, 1.54]) snare(v, t, 0.3);
        for (const t of [1.68, 1.72, 1.76]) snare(v, t, 0.18);
        noise(v, 1.82, 0.6, 0.12, { type: 'highpass', f: 5000 });
      },
    },
    defeat: {
      g: 0.45, ui: true, prio: 3,
      fn(v) {
        const notes = [55, 54, 53, 52];
        for (let i = 0; i < 4; i++) {
          const lastNote = i === 3;
          trombone(v, mtof(notes[i]), i * 0.42, lastNote ? 0.85 : 0.36, 0.35, lastNote);
        }
      },
    },
    star: {
      g: 0.8, ui: true,
      fn(v) {
        ping(v, 1175, 0, 0.55, 0.3);
        tone(v, 'sine', 2350, 0, 0, 0.25, 0.08, { a: 0.002 });
        noise(v, 0, 0.2, 0.05, { type: 'bandpass', f: 8000, q: 1 }, { a: 0.01 });
      },
    },
    coin: {
      g: 0.6, ui: true,
      fn(v) {
        tone(v, 'square', 988, 0, 0, 0.07, 0.16, { a: 0.001, hold: 0.05, filt: { f: 3500 } });
        tone(v, 'square', 1319, 0, 0.065, 0.28, 0.16, { a: 0.001, hold: 0.04, filt: { f: 3500 } });
      },
    },
    squeak: {
      g: 0.7,
      fn(v) {
        const o = { a: 0.01, gt: 0.07, f2: 1150, vib: [22, 0.06] };
        tone(v, 'sine', 850, 1650, 0, 0.18, 0.35, o);
        tone(v, 'triangle', 850, 1650, 0, 0.18, 0.1, o);
      },
    },
    spin: {
      g: 0.6,
      fn(v) {
        noise(v, 0, 0.6, 0.5, { type: 'bandpass', f: 1100, q: 2.5, lfo: [11, 700] }, { a: 0.12 });
        tone(v, 'sine', 300, 500, 0, 0.55, 0.06, { a: 0.1, vib: [11, 0.2] });
      },
    },
    summon: {
      g: 0.9,
      fn(v) {
        noise(v, 0, 0.42, 0.45, { type: 'bandpass', f: 900, f1: 260, q: 0.9 }, { a: 0.012 });
        tone(v, 'sine', 1200, 2500, 0, 0.45, 0.1, { a: 0.02, fm: [1.5, 0.8] });
        for (const t of [0.06, 0.13, 0.2, 0.28]) tone(v, 'sine', rnd(2200, 4200), 0, t, 0.08, 0.06, { a: 0.002 });
      },
    },
    freeze: {
      g: 0.7,
      fn(v) {
        noise(v, 0, 0.4, 0.7, { type: 'bandpass', f: 4200, q: 1 }, { buf: 'crackle' });
        tone(v, 'sine', 2637, 0, 0, 0.42, 0.14, { a: 0.002 });
        tone(v, 'sine', 3520, 0, 0.06, 0.36, 0.1, { a: 0.002 });
        tone(v, 'sine', 1760, 0, 0.03, 0.4, 0.08, { a: 0.002 });
        noise(v, 0, 0.3, 0.1, { type: 'bandpass', f: 7500, q: 1 }, { a: 0.05 });
      },
    },
  };

  // ---- playback ---------------------------------------------------------------
  function spatial(o) {
    if (o.x == null && o.y == null && o.z == null) return null;
    const dx = fin(o.x, lx) - lx;
    const dy = fin(o.y, ly) - ly;
    const dz = fin(o.z, lz) - lz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const lat = dx * rx + dz * rz;
    return [1 / (1 + d / DIST_REF), clamp((lat / (d + PAN_NEAR)) * PAN_MAX, -PAN_MAX, PAN_MAX)];
  }

  function removeActive(v) {
    const i = active.indexOf(v);
    if (i >= 0) active.splice(i, 1);
  }

  function steal(v, now) {
    removeActive(v);
    v.onDone = null;
    try {
      const g = v.out.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + 0.03);
    } catch {
      /* ignore */
    }
    for (let i = 0; i < v.srcs.length; i++) {
      try {
        v.srcs[i].stop(now + 0.04);
      } catch {
        /* ignore */
      }
    }
  }

  function play(name, opts) {
    if (!ctx || muted) return;
    if (!offline && ctx.state !== 'running') return;
    const o = opts || NO;
    let rec = R[name];
    if (!rec) {
      name = 'bonk';
      rec = R.bonk;
    }
    const sp = rec.ui ? null : spatial(o);
    const att = sp ? sp[0] : 1;
    const pan = sp ? sp[1] : 0;
    const m = o.mag == null ? rec.m0 || 0.3 : clamp(fin(o.mag, 0) / 3000, 0, 1);
    const vol = o.vol == null ? 1 : Math.max(0, fin(o.vol, 1));
    const gain = rec.g * vol * att * (rec.loud ? rec.loud(m) : 1);
    if (!(gain > MIN_GAIN)) return;

    const now = ctx.currentTime;
    const L = last.get(name);
    if (L && now - L.t < RATE_LIMIT && gain <= L.g * LOUDER_TO_PASS) return;

    const prio = rec.prio || (rec.ui ? 2 : 1);
    if (active.length >= MAX_VOICES) {
      let victim = null;
      for (let i = 0; i < active.length; i++) {
        const a = active[i];
        if (!victim || a.prio < victim.prio || (a.prio === victim.prio && a.g < victim.g)) victim = a;
      }
      if (!victim || victim.prio > prio || (victim.prio === prio && victim.g >= gain)) return;
      steal(victim, now);
    }

    const pitch = o.pitch > 0 ? o.pitch : 1;
    const sPitch = rec.ui ? 1 : slowPitch();
    const v = {
      t: now + 0.005,
      p: pitch * sPitch * (rec.ui ? 1 : 1 + (Math.random() * 2 - 1) * JITTER),
      d: sPitch < 1 ? 1 / sPitch : 1,
      out: ctx.createGain(),
      nodes: [],
      srcs: [],
      pending: 0,
      done: false,
      g: gain,
      prio,
      onDone: removeActive,
    };
    v.out.gain.value = gain;
    v.nodes.push(v.out);
    const bus = rec.ui ? master : sfxBus;
    if (pan && ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = pan;
      v.out.connect(pn);
      pn.connect(bus);
      v.nodes.push(pn);
    } else v.out.connect(bus);
    active.push(v);
    try {
      rec.fn(v, m);
    } catch {
      finish(v);
      return;
    }
    if (v.pending === 0) finish(v);
    if (L) {
      L.t = now;
      L.g = gain;
    } else last.set(name, { t: now, g: gain });
  }

  // ---- music ------------------------------------------------------------------
  function musicStepAt(step, T) {
    const v = { t: T, p: 1, d: 1, out: musicBus, nodes: [], srcs: [], pending: 0, done: false, onDone: null };
    const bar = step >> 3;
    const pos = step & 7;
    const ch = BARS[bar];
    if (pos === 0) {
      tuba(v, mtof(ch[0]), 0, STEP * 1.7, 0.5);
      kick(v, 0, 0.35);
    } else if (pos === 4) {
      tuba(v, mtof(ch[1]), 0, STEP * 1.7, 0.45);
      kick(v, 0, 0.3);
    } else if (pos === 2 || pos === 6) {
      for (const n of ch[2]) tone(v, 'triangle', mtof(n), 0, 0, 0.12, 0.07, { a: 0.005 });
      snare(v, 0, 0.32);
    }
    if (bar === 7 && pos >= 5) {
      snare(v, pos === 6 ? STEP / 2 : 0, 0.16);
      if (pos === 7) snare(v, STEP / 2, 0.2);
    }
    if (pos & 1) noise(v, 0, 0.04, 0.06, { type: 'highpass', f: 6500 });
    const mel = MEL[step];
    if (mel) {
      const f = mtof(mel[0]);
      const d = mel[1] * STEP * 0.92;
      if (musicPass % 2 === 0) kazoo(v, f, 0, d, 0.22);
      else tone(v, 'sine', f * 2, 0, 0, d, 0.1, { a: 0.02, hold: d * 0.6, vib: [6, 0.012, 0.08] });
    }
  }

  function musicTick() {
    if (!ctx || !musicTimer) return;
    const now = ctx.currentTime;
    if (musicNext < now - 0.25) musicNext = now + 0.05; // fell behind (hidden tab): resync
    while (musicNext < now + lookahead) {
      if (!muted && timeScale > 0) {
        try {
          musicStepAt(musicStep, musicNext);
        } catch {
          /* never let music break the game */
        }
      }
      musicStep = (musicStep + 1) % MUSIC_STEPS;
      if (musicStep === 0) musicPass++;
      musicNext += STEP;
    }
  }

  function startMusic() {
    if (!ctx || musicTimer) return;
    musicStep = 0;
    musicPass = 0;
    musicNext = ctx.currentTime + 0.1;
    musicTimer = setInterval(musicTick, MUSIC_TICK_MS);
    applyTimeScale();
    musicTick();
  }

  function stopMusic() {
    if (!ctx || !musicTimer) return;
    clearInterval(musicTimer);
    musicTimer = null;
    setParam(musicBus.gain, 0, 0.08);
  }

  // ---- public API -------------------------------------------------------------
  const audio = {
    unlock() {
      try {
        if (!init()) return;
        if (!offline && ctx.state !== 'running' && ctx.resume) {
          const p = ctx.resume();
          if (p && p.catch) p.catch(() => {});
        }
        if (!primed && !offline) {
          primed = true; // iOS: a silent buffer inside the gesture fully unlocks output
          const b = ctx.createBufferSource();
          b.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
          b.connect(ctx.destination);
          b.onended = () => b.disconnect();
          b.start();
        }
        if (musicWanted) startMusic();
      } catch {
        /* no-op */
      }
    },
    play(name, opts) {
      try {
        play(name, opts);
      } catch {
        /* never throw from gameplay code paths */
      }
    },
    setListener(pos, yaw) {
      if (pos) {
        lx = fin(pos.x, lx);
        ly = fin(pos.y, ly);
        lz = fin(pos.z, lz);
      }
      if (typeof yaw === 'number' && Number.isFinite(yaw)) {
        rx = Math.cos(yaw);
        rz = -Math.sin(yaw);
      }
    },
    setMuted(b) {
      muted = !!b;
      if (ctx) {
        try {
          setParam(master.gain, muted ? 0 : MASTER_LEVEL, 0.03);
        } catch {
          /* no-op */
        }
      }
    },
    get muted() {
      return muted;
    },
    set muted(b) {
      audio.setMuted(b);
    },
    setTimeScale(s) {
      timeScale = clamp(fin(Number(s), 1), 0, 2);
      try {
        applyTimeScale();
      } catch {
        /* no-op */
      }
    },
    music(on) {
      musicWanted = !!on;
      try {
        if (!ctx) return;
        if (musicWanted) startMusic();
        else stopMusic();
      } catch {
        /* no-op */
      }
    },
    stats() {
      return { voices: active.length, music: !!musicTimer, state: ctx ? ctx.state : 'none' };
    },
    names: Object.keys(R),
  };
  return audio;
}
