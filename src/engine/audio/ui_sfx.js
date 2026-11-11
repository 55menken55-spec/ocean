/* ================= ЗВУК: ИНТЕРФЕЙСНЫЕ СИГНАЛЫ ================= */
/* Затвор фотокамеры, аккорд выполненной миссии, перезвон этапа тура, глобус,
   сервопривод ROV и запуск CTD-зонда. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const S = OC._SoundState;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function noiseBuffer(ctx) {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.022 * white) / 1.022;
        d[i] = last * 3.1;
      }
    }
    return buf;
  }

  function loopNoise(ctx, dest, type, freq, gain) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = 0.65;
    const g = ctx.createGain();
    g.gain.value = gain;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05 + Math.random() * 0.05;
    lfoGain.gain.value = gain * 0.45;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    lfo.start();
    src.connect(f); f.connect(g); g.connect(dest);
    src.start();
    return { src, f, g };
  }

  S.shutter = function () {
    if (S.muted) return;
    if (!S.ctx && !S.ensure()) return;
    if (S.ctx.state === 'suspended') S.ctx.resume();
    const ctx = S.ctx;
    const now = ctx.currentTime;
    [0, 0.055].forEach((offset, idx) => {
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(idx === 0 ? 1850 : 1280, now + offset);
      o.frequency.exponentialRampToValueAtTime(320, now + offset + 0.032);
      f.type = 'bandpass';
      f.frequency.value = idx === 0 ? 2200 : 1500;
      f.Q.value = 1.6;
      g.gain.setValueAtTime(0.085, now + offset);
      g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.036);
      o.connect(f); f.connect(g); g.connect(S.master);
      o.start(now + offset); o.stop(now + offset + 0.04);
    });
  };

  S.missionChime = function () {
    if (S.muted) return;
    if (!S.ctx && !S.ensure()) return;
    if (S.ctx.state === 'suspended') S.ctx.resume();
    const ctx = S.ctx;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const t = now + i * 0.075;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g); g.connect(S.master);
      o.start(t); o.stop(t + 0.45);
    });
  };

  S.tourChime = function (stepIdx) {
    if (S.muted || !S.ctx || S.ctx.state !== 'running') return;
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const scale = [392.0, 440.0, 493.88, 523.25, 587.33];
    const base = scale[(stepIdx || 0) % scale.length];
    [base, base * 1.5].forEach((freq, i) => {
      const t = now + i * 0.08;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.036 : 0.024, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g); g.connect(S.master);
      o.start(t); o.stop(t + 0.58);
    });
  };

  S.globeWhoosh = function () {
    if (S.muted) return;
    if (!S.ctx && !S.ensure()) return;
    if (S.ctx.state === 'suspended') S.ctx.resume();
    if (!S.ctx || S.ctx.state !== 'running') return;
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const dur = 0.65;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.sin((i / len) * Math.PI);
      d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(220, now);
    bp.frequency.exponentialRampToValueAtTime(680, now + dur * 0.65);
    bp.frequency.exponentialRampToValueAtTime(320, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(bp); bp.connect(g); g.connect(S.master);
    src.start(now); src.stop(now + dur + 0.04);
  };

  S.rovServo = function (captured) {
    if (S.muted || !S.ctx || S.ctx.state !== 'running') return;
    const ctx = S.ctx;
    const now = ctx.currentTime;
    // Гидравлический привод манипулятора (приглушённый сервомотор под водой)
    const o = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(145, now);
    o.frequency.linearRampToValueAtTime(290, now + 0.22);
    o.frequency.linearRampToValueAtTime(175, now + 0.56);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(520, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.028, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    o.connect(lp); lp.connect(g); g.connect(S.master);
    o.start(now); o.stop(now + 0.65);

    if (captured) {
      [587.33, 880.0].forEach((freq, i) => {
        const t = now + 0.42 + i * 0.09;
        const c = ctx.createOscillator();
        const cg = ctx.createGain();
        c.type = 'sine';
        c.frequency.setValueAtTime(freq, t);
        cg.gain.setValueAtTime(0.0001, t);
        cg.gain.linearRampToValueAtTime(0.038, t + 0.015);
        cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        c.connect(cg); cg.connect(S.master);
        c.start(t); c.stop(t + 0.30);
      });
    }
  };

  S.ctdCast = function () {
    if (S.muted || !S.ctx || S.ctx.state !== 'running') return;
    const ctx = S.ctx;
    const now = ctx.currentTime;
    [980, 1320, 1760].forEach((freq, i) => {
      const t = now + i * 0.075;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 1.08, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.032, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(S.master);
      o.start(t); o.stop(t + 0.24);
    });
  };
})(window.OC);
