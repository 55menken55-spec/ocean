/* ================= ПРОЦЕДУРНЫЙ ЗВУК ОКЕАНА (С УЧЁТОМ ЗОНЫ И ГЛУБИНЫ) ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const S = {
    ctx: null, master: null, muted: false, started: false,
    timers: [], deepFilter: null, reefGain: null, abyssGain: null,
    currentZoneId: 'crest', currentDepth: 8
  };

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

  S.ensure = function () {
    if (S.ctx) { if (S.ctx.state === 'suspended') S.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      S.ctx = ctx; S.master = master;

      /* глубокий океанический гул */
      const deep = loopNoise(ctx, master, 'lowpass', 240, 0.16);
      S.deepFilter = deep.f;
      S.abyssGain = deep.g;

      /* течение над рифом */
      const flow = loopNoise(ctx, master, 'bandpass', 620, 0.045);
      S.reefGain = flow.g;

      /* низкочастотное дыхание толщи воды */
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      og.gain.value = 0.0;
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 0.07;
      lg.gain.value = 0.022;
      lfo.connect(lg); lg.connect(og.gain);
      osc.frequency.value = 52;
      osc.type = 'sine';
      osc.connect(og); og.connect(master);
      osc.start(); lfo.start();

      S.started = true;
      S.fade(1, 2.2);
      S.scheduleBubble();
      S.scheduleShrimp();
      S.scheduleWhale();
      return true;
    } catch (e) {
      return false;
    }
  };

  S.fade = function (target, time) {
    if (!S.ctx) return;
    const g = S.master.gain;
    const now = S.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(S.muted ? 0 : target, now + (time || 0.8));
  };

  S.update = function (depth, zoneId) {
    S.currentDepth = depth;
    S.currentZoneId = zoneId || 'crest';
    if (!S.ctx || S.muted) return;
    const now = S.ctx.currentTime;
    const targetFreq = OC.clamp(320 - depth * 2.1, 95, 340);
    if (S.deepFilter) S.deepFilter.frequency.setTargetAtTime(targetFreq, now, 0.4);
  };

  S.scheduleBubble = function () {
    if (!S.ctx) return;
    const t = setTimeout(() => {
      if (!S.muted && S.ctx && S.ctx.state === 'running') S.bubble();
      S.scheduleBubble();
    }, rnd(500, 2100));
    S.timers.push(t);
  };

  S.bubble = function () {
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = now + i * rnd(0.03, 0.08);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      osc.type = 'sine';
      const f0 = rnd(360, 760);
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * rnd(1.8, 3.0), t + rnd(0.05, 0.12));
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(rnd(0.01, 0.028), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + rnd(0.08, 0.19));
      osc.connect(g);
      if (pan) { pan.pan.value = rnd(-0.8, 0.8); g.connect(pan); pan.connect(S.master); }
      else g.connect(S.master);
      osc.start(t); osc.stop(t + 0.24);
    }
  };

  /* Биологический треск рачков-щелкунов на мелководных кораллах */
  S.scheduleShrimp = function () {
    if (!S.ctx) return;
    const t = setTimeout(() => {
      if (!S.muted && S.ctx && S.ctx.state === 'running' && S.currentDepth < 24 && S.currentZoneId !== 'dropoff') {
        S.shrimpSnap();
      }
      S.scheduleShrimp();
    }, rnd(240, 1100));
    S.timers.push(t);
  };

  S.shrimpSnap = function () {
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(rnd(2200, 3800), now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.018);
    g.gain.setValueAtTime(0.009, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
    osc.connect(g);
    if (pan) { pan.pan.value = rnd(-0.9, 0.9); g.connect(pan); pan.connect(S.master); }
    else g.connect(S.master);
    osc.start(now); osc.stop(now + 0.03);
  };

  S.scheduleWhale = function () {
    if (!S.ctx) return;
    const t = setTimeout(() => {
      if (!S.muted && S.ctx && S.ctx.state === 'running') S.whale();
      S.scheduleWhale();
    }, rnd(14000, 32000));
    S.timers.push(t);
  };

  S.whale = function () {
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.9;
    const g = ctx.createGain();
    const boost = S.currentZoneId === 'dropoff' || S.currentZoneId === 'slope_hole' ? 1.5 : 0.9;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.045 * boost, now + 0.7);
    g.gain.linearRampToValueAtTime(0.03 * boost, now + 2.2);
    g.gain.linearRampToValueAtTime(0.0001, now + 3.5);
    [92, 138, 231].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, now);
      o.frequency.linearRampToValueAtTime(f * 0.78, now + 2.0);
      o.frequency.linearRampToValueAtTime(f * 0.92, now + 3.2);
      const og = ctx.createGain();
      og.gain.value = i === 0 ? 1 : 0.45;
      const vib = ctx.createOscillator();
      const vg = ctx.createGain();
      vib.frequency.value = 4.6 + i;
      vg.gain.value = 2.2;
      vib.connect(vg); vg.connect(o.frequency);
      o.connect(og); og.connect(lp);
      o.start(now); o.stop(now + 3.6);
      vib.start(now); vib.stop(now + 3.6);
    });
    lp.connect(g);
    if (pan) { pan.pan.value = rnd(-0.7, 0.7); g.connect(pan); pan.connect(S.master); }
    else g.connect(S.master);
  };

  S.toggle = function () {
    if (!S.ctx) { const ok = S.ensure(); if (!ok) return false; return true; }
    S.muted = !S.muted;
    S.fade(1, 0.5);
    return !S.muted;
  };

  S.isOn = () => S.started && !S.muted;
  OC.sound = S;
})(window.OC);
