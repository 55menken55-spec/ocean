/* ================= ЗВУК: ЯДРО WEBAUDIO ================= */
/* Контекст, мастер-шина с анализатором, плавные фейды, микс по глубине/зоне/погоде,
   мьют и спектр для гидрофона и полосы-индикатора. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  /* Общий DSP-слой: буфер шума и зацикленный шумовой слой с LFO.
     Живёт здесь, чтобы не дублировать его в каждом audio/* модуле. */
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

  OC._AudioDsp = { rnd, noiseBuffer, loopNoise };

  /* Состояние звуковой шины: единственная точка правды для всех audio/* модулей */
  const S = OC._SoundState = OC._SoundState || {
    ctx: null, master: null, muted: false, started: false,
    timers: [], deepFilter: null, reefGain: null, abyssGain: null,
    currentZoneId: 'crest', currentDepth: 8, currentDayW: 1.0, currentBiomeId: 'great_barrier_reef'
  };
  OC.sound = S;

  S.ensure = function () {
    if (S.ctx) { if (S.ctx.state === 'suspended') S.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0;
      if (ctx.createAnalyser) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        master.connect(analyser);
        analyser.connect(ctx.destination);
        S.analyser = analyser;
        S.freqData = new Uint8Array(analyser.frequencyBinCount);
      } else {
        master.connect(ctx.destination);
      }
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

  S.toggle = function () {
    if (!S.ctx) { const ok = S.ensure(); if (!ok) return false; return true; }
    S.muted = !S.muted;
    S.fade(1, 0.5);
    return !S.muted;
  };

  S.getSpectrumData = function () {
    if (!S.analyser || !S.freqData || S.muted || !S.ctx || S.ctx.state !== 'running') return null;
    S.analyser.getByteFrequencyData(S.freqData);
    return S.freqData;
  };

  S.getSampleRate = () => (S.ctx ? S.ctx.sampleRate : 44100);

  S.isOn = () => S.started && !S.muted;
})(window.OC);
