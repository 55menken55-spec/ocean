/* ================= ПРОЦЕДУРНЫЙ ЗВУК ОКЕАНА (С УЧЁТОМ ЗОНЫ И ГЛУБИНЫ) ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const S = {
    ctx: null, master: null, muted: false, started: false,
    timers: [], deepFilter: null, reefGain: null, abyssGain: null,
    currentZoneId: 'crest', currentDepth: 8, currentDayW: 1.0
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
      S.scheduleCreak();
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

  S.update = function (depth, zoneId, dayW) {
    S.currentDepth = depth;
    S.currentZoneId = zoneId || 'crest';
    if (typeof dayW === 'number') S.currentDayW = dayW;
    if (!S.ctx || S.muted) return;
    const now = S.ctx.currentTime;
    const targetFreq = OC.clamp(320 - depth * 2.1, 95, 340);
    if (S.deepFilter) S.deepFilter.frequency.setTargetAtTime(targetFreq, now, 0.4);
    if (S.reefGain) {
      const flowTarget = (zoneId === 'crest' || zoneId === 'slope_hole') ? 0.055 : 0.032;
      S.reefGain.gain.setTargetAtTime(flowTarget, now, 0.5);
    }
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

  /* Биологический треск рачков-щелкунов на мелководных кораллах (громче в сумерки/ночью) */
  S.scheduleShrimp = function () {
    if (!S.ctx) return;
    const nightBoost = S.currentDayW < 0.45 ? 0.65 : 1.0;
    const t = setTimeout(() => {
      if (!S.muted && S.ctx && S.ctx.state === 'running' && S.currentDepth < 24 && S.currentZoneId !== 'dropoff') {
        S.shrimpSnap();
      }
      S.scheduleShrimp();
    }, rnd(220, 1050) * nightBoost);
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
    const amp = S.currentDayW < 0.45 ? 0.013 : 0.009;
    g.gain.setValueAtTime(amp, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
    osc.connect(g);
    if (pan) { pan.pan.value = rnd(-0.9, 0.9); g.connect(pan); pan.connect(S.master); }
    else g.connect(S.master);
    osc.start(now); osc.stop(now + 0.03);
  };

  /* Глубоководный скрип корпуса батискафа под высоким давлением (> 48 м) */
  S.scheduleCreak = function () {
    if (!S.ctx) return;
    const t = setTimeout(() => {
      if (!S.muted && S.ctx && S.ctx.state === 'running' && S.currentDepth > 48) {
        S.hullCreak();
      }
      S.scheduleCreak();
    }, rnd(9000, 22000));
    S.timers.push(t);
  };

  S.hullCreak = function () {
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(rnd(72, 96), now);
    osc.frequency.exponentialRampToValueAtTime(rnd(52, 66), now + 0.55);
    bp.type = 'bandpass';
    bp.frequency.value = rnd(140, 210);
    bp.Q.value = 5.5;
    const depthMix = OC.clamp((S.currentDepth - 48) / 80, 0.25, 1.0);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.022 * depthMix, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    osc.connect(bp); bp.connect(g); g.connect(S.master);
    osc.start(now); osc.stop(now + 0.66);
  };

  /* Активный сонар-пинг батискафа + задержка отражённого эха (1480 м/с) */
  S.sonarPing = function (rangeMeters, hasEcho) {
    if (S.muted) return false;
    if (!S.ctx && !S.ensure()) return false;
    if (S.ctx.state === 'suspended') S.ctx.resume();
    const ctx = S.ctx;
    const now = ctx.currentTime;

    function fireTone(startTime, freq, peakGain, dur, lpFreq) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.985, startTime + dur);
      filter.type = lpFreq ? 'lowpass' : 'bandpass';
      filter.frequency.value = lpFreq || freq;
      filter.Q.value = lpFreq ? 0.8 : 7.0;
      g.gain.setValueAtTime(0.0001, startTime);
      g.gain.linearRampToValueAtTime(peakGain, startTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
      osc.connect(filter); filter.connect(g); g.connect(S.master);
      osc.start(startTime); osc.stop(startTime + dur + 0.03);
    }

    fireTone(now, 1340, 0.075, 0.26, 0);
    if (hasEcho && rangeMeters > 3 && rangeMeters < 180) {
      const delay = OC.clamp((2 * rangeMeters) / 1480, 0.04, 0.35);
      const atten = OC.clamp(1.0 - rangeMeters / 210, 0.18, 0.85);
      fireTone(now + delay, 1315, 0.038 * atten, 0.32, 980);
    }
    return true;
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
