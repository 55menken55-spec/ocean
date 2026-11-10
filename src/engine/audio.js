/* ================= ПРОЦЕДУРНЫЙ ЗВУК ОКЕАНА (С УЧЁТОМ ЗОНЫ И ГЛУБИНЫ) ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const S = {
    ctx: null, master: null, muted: false, started: false,
    timers: [], deepFilter: null, reefGain: null, abyssGain: null,
    currentZoneId: 'crest', currentDepth: 8, currentDayW: 1.0, currentBiomeId: 'great_barrier_reef'
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

  S.update = function (depth, zoneId, dayW, biomeId, stormMix) {
    S.currentDepth = depth;
    S.currentZoneId = zoneId || 'crest';
    if (biomeId) S.currentBiomeId = biomeId;
    if (typeof dayW === 'number') S.currentDayW = dayW;
    const sm = typeof stormMix === 'number' ? stormMix : 0;
    if (!S.ctx || S.muted) return;
    const now = S.ctx.currentTime;
    const surfBoost = sm * OC.clamp(1 - Math.max(0, depth) / 22, 0, 1);
    const targetFreq = OC.clamp(320 - depth * 2.1 + surfBoost * 240, 95, 580);
    if (S.deepFilter) S.deepFilter.frequency.setTargetAtTime(targetFreq, now, 0.4);
    if (S.reefGain) {
      const flowTarget = ((zoneId === 'crest' || zoneId === 'slope_hole') ? 0.055 : 0.032) + surfBoost * 0.095;
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

  /* Биологический треск рачков-щелкунов на мелководных кораллах или треск пакового льда в Арктике */
  S.scheduleShrimp = function () {
    if (!S.ctx) return;
    const nightBoost = S.currentDayW < 0.45 ? 0.65 : 1.0;
    const t = setTimeout(() => {
      if (!S.muted && S.ctx && S.ctx.state === 'running') {
        if (S.currentBiomeId === 'arctic_sea') {
          if (S.currentDepth < 32 && Math.random() < 0.55) S.iceCrack();
        } else if (S.currentDepth < 24 && S.currentZoneId !== 'dropoff' && S.currentBiomeId !== 'hydrothermal_vents') {
          S.shrimpSnap();
        }
      }
      S.scheduleShrimp();
    }, rnd(220, 1050) * nightBoost);
    S.timers.push(t);
  };

  S.iceCrack = function () {
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const bp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(rnd(420, 980), now);
    osc.frequency.exponentialRampToValueAtTime(rnd(95, 190), now + 0.14);
    bp.type = 'bandpass';
    bp.frequency.value = rnd(580, 1100);
    bp.Q.value = 3.2;
    g.gain.setValueAtTime(0.024, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(bp); bp.connect(g);
    if (pan) { pan.pan.value = rnd(-0.85, 0.85); g.connect(pan); pan.connect(S.master); }
    else g.connect(S.master);
    osc.start(now); osc.stop(now + 0.18);
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
      if (!S.muted && S.ctx && S.ctx.state === 'running') {
        if (S.currentBiomeId === 'arctic_sea') S.belugaCall();
        else if (S.currentBiomeId !== 'hydrothermal_vents') S.whale();
      }
      S.scheduleWhale();
    }, rnd(14000, 32000));
    S.timers.push(t);
  };

  S.belugaCall = function () {
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1450; bp.Q.value = 2.0;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.036, now + 0.14);
    g.gain.linearRampToValueAtTime(0.022, now + 0.65);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
    [980, 1460].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, now);
      o.frequency.exponentialRampToValueAtTime(f * (i === 0 ? 1.48 : 0.82), now + 0.55);
      o.frequency.exponentialRampToValueAtTime(f * 1.15, now + 1.25);
      o.connect(bp);
      o.start(now); o.stop(now + 1.4);
    });
    bp.connect(g);
    if (pan) { pan.pan.value = rnd(-0.75, 0.75); g.connect(pan); pan.connect(S.master); }
    else g.connect(S.master);
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

  S.thunder = function () {
    if (S.muted || !S.ctx || S.ctx.state !== 'running') return;
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const dur = 2.6;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
      d[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(185, now);
    lp.frequency.exponentialRampToValueAtTime(62, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.16);
    g.gain.exponentialRampToValueAtTime(0.075, now + 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(lp); lp.connect(g); g.connect(S.master);
    src.start(now); src.stop(now + dur + 0.05);
  };

  S.getVoiceLabel = function (key) {
    if (!key) return 'Звук среды';
    if (key === 'whale_humpback') return 'Песня горбатого кита';
    if (key === 'beluga') return 'Трель «морской канарейки»';
    if (key === 'narwhal') return 'Эхолокация нарвала';
    if (key === 'sea_lion') return 'Подводный клич сивуча';
    if (key === 'dugong') return 'Свист дюгоня';
    if (key === 'ice_floe' || key === 'iceberg' || key === 'brinicle') return 'Треск пакового льда';
    if (key === 'vent_chimney' || key === 'vent_shrimp' || key === 'riftia_worms' || key === 'vent_mussels') return 'Шум рифта и креветок';
    if (key === 'fish_parrot') return 'Хруст кораллов';
    if (key === 'fish_lantern' || key === 'jelly' || key === 'jelly_deep' || key === 'jelly_arctic' || key === 'clione_angel' || key === 'fish_angler' || key === 'squid_abyssal' || key === 'octopus_dumbo') return 'Био-перелив глубины';
    if (key.startsWith('shark_') || key === 'manta' || key.startsWith('ray_') || key === 'turtle') return 'Гидродинамический импульс';
    return 'Подводный отклик';
  };

  S.playSpeciesVoice = function (key) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      if (!S.ctx) S.ctx = new AC();
      if (S.ctx.state === 'suspended') S.ctx.resume();
      const ctx = S.ctx;
      const now = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.value = 0.72;
      out.connect(S.master && !S.muted ? S.master : ctx.destination);

      if (key === 'whale_humpback') {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 460; lp.Q.value = 1.0;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.11, now + 0.38);
        g.gain.linearRampToValueAtTime(0.06, now + 1.45);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);
        [92, 138, 224].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, now);
          o.frequency.linearRampToValueAtTime(f * 0.76, now + 1.3);
          o.frequency.linearRampToValueAtTime(f * 0.94, now + 2.2);
          const og = ctx.createGain();
          og.gain.value = i === 0 ? 1.0 : 0.45;
          o.connect(og); og.connect(lp);
          o.start(now); o.stop(now + 2.4);
        });
        lp.connect(g); g.connect(out);
      } else if (key === 'beluga') {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1520; bp.Q.value = 2.2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.09, now + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
        [1020, 1580, 2140].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, now + i * 0.14);
          o.frequency.exponentialRampToValueAtTime(f * (i % 2 === 0 ? 1.42 : 0.78), now + i * 0.14 + 0.55);
          o.connect(bp);
          o.start(now + i * 0.14); o.stop(now + 1.32);
        });
        bp.connect(g); g.connect(out);
      } else if (key === 'narwhal') {
        // Эхолокационная трель + полярный гул
        for (let i = 0; i < 8; i++) {
          const t = now + i * 0.09;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(1180 - i * 45, t);
          o.frequency.exponentialRampToValueAtTime(340, t + 0.045);
          g.gain.setValueAtTime(0.085, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
          o.connect(g); g.connect(out);
          o.start(t); o.stop(t + 0.06);
        }
        const hum = ctx.createOscillator();
        const hg = ctx.createGain();
        hum.type = 'sine';
        hum.frequency.setValueAtTime(240, now + 0.2);
        hum.frequency.linearRampToValueAtTime(175, now + 1.4);
        hg.gain.setValueAtTime(0.0001, now + 0.2);
        hg.gain.linearRampToValueAtTime(0.075, now + 0.45);
        hg.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
        hum.connect(hg); hg.connect(out);
        hum.start(now + 0.2); hum.stop(now + 1.55);
      } else if (key === 'sea_lion') {
        for (let i = 0; i < 3; i++) {
          const t = now + i * 0.34;
          const o = ctx.createOscillator();
          const f = ctx.createBiquadFilter();
          const g = ctx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(195 - i * 16, t);
          o.frequency.exponentialRampToValueAtTime(118, t + 0.24);
          f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 1.6;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.09, t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
          o.connect(f); f.connect(g); g.connect(out);
          o.start(t); o.stop(t + 0.28);
        }
      } else if (key === 'dugong') {
        [1420, 1860, 1620].forEach((f, i) => {
          const t = now + i * 0.26;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, t);
          o.frequency.exponentialRampToValueAtTime(f * 1.18, t + 0.18);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.07, t + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
          o.connect(g); g.connect(out);
          o.start(t); o.stop(t + 0.24);
        });
      } else if (key === 'ice_floe' || key === 'iceberg' || key === 'brinicle') {
        const o = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(145, now);
        o.frequency.exponentialRampToValueAtTime(34, now + 1.05);
        lp.type = 'lowpass'; lp.frequency.value = 520;
        g.gain.setValueAtTime(0.14, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
        o.connect(lp); lp.connect(g); g.connect(out);
        o.start(now); o.stop(now + 1.2);
      } else if (key === 'vent_chimney' || key === 'vent_shrimp' || key === 'riftia_worms' || key === 'vent_mussels') {
        const dur = 1.2;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (i % 190 < 8 ? 1.4 : 0.35);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = key === 'vent_shrimp' ? 3200 : 620; bp.Q.value = 1.1;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.11, now + 0.14);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        src.connect(bp); bp.connect(g); g.connect(out);
        src.start(now); src.stop(now + dur + 0.05);
      } else if (key === 'fish_lantern' || key === 'jelly' || key === 'jelly_deep' || key === 'jelly_arctic' || key === 'clione_angel' || key === 'fish_angler' || key === 'squid_abyssal' || key === 'octopus_dumbo') {
        [660, 990, 1320].forEach((f, i) => {
          const t = now + i * 0.14;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, t);
          o.frequency.exponentialRampToValueAtTime(f * 1.06, t + 0.55);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.055, t + 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
          o.connect(g); g.connect(out);
          o.start(t); o.stop(t + 0.68);
        });
      } else if (key === 'fish_parrot') {
        for (let i = 0; i < 4; i++) {
          const t = now + i * 0.16;
          const o = ctx.createOscillator();
          const f = ctx.createBiquadFilter();
          const g = ctx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(520 + i * 65, t);
          o.frequency.exponentialRampToValueAtTime(190, t + 0.04);
          f.type = 'bandpass'; f.frequency.value = 950;
          g.gain.setValueAtTime(0.06, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
          o.connect(f); f.connect(g); g.connect(out);
          o.start(t); o.stop(t + 0.06);
        }
      } else if (key.startsWith('shark_') || key === 'manta' || key.startsWith('ray_') || key === 'turtle') {
        const o = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(98, now);
        o.frequency.exponentialRampToValueAtTime(42, now + 0.65);
        lp.type = 'lowpass'; lp.frequency.value = 210;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.14, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
        o.connect(lp); lp.connect(g); g.connect(out);
        o.start(now); o.stop(now + 0.75);
      } else {
        // Живая серия подводных пузырьков и сонарный пинг открытия
        [440, 620, 810].forEach((f, i) => {
          const t = now + i * 0.09;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, t);
          o.frequency.exponentialRampToValueAtTime(f * 1.95, t + 0.11);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.055, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
          o.connect(g); g.connect(out);
          o.start(t); o.stop(t + 0.15);
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  S.whaleSplash = function (dist) {
    if (S.muted || !S.ctx || S.ctx.state !== 'running') return;
    const atten = OC.clamp(1.0 - (dist || 40) / 360, 0.15, 1.0);
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const dur = 1.9;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.65));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(920, now);
    lp.frequency.exponentialRampToValueAtTime(160, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.18 * atten, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(lp); lp.connect(g); g.connect(S.master);
    src.start(now); src.stop(now + dur + 0.05);
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
