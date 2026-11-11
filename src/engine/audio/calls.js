/* ================= ЗВУК: ПОЗЫВНЫЕ МЕГАФАУНЫ И ГРОЗА ================= */
/* Сонарный пинг, пение горбатого кита, трель белухи, всплеск выпрыга и раскат грома. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const S = OC._SoundState;

  const { rnd, noiseBuffer, loopNoise } = OC._AudioDsp;

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
        else if (S.currentBiomeId !== 'hydrothermal_vents' && S.currentBiomeId !== 'mariana_trench' && S.currentBiomeId !== 'brine_pool' && S.currentBiomeId !== 'cenote_caves') S.whale();
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

  /* Глухой сейсмический руммер подводного вулкана (толчки + низкочастотный гул) */
  S.volcanoRumble = function (strength) {
    if (S.muted || !S.ctx || S.ctx.state !== 'running') return;
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const dur = 4.5;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.9));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(180, now);
    lp.frequency.linearRampToValueAtTime(60, now + dur);
    const g = ctx.createGain();
    const amp = Math.min(0.22, 0.05 + 0.17 * (strength || 0.5));
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(amp, now + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(lp); lp.connect(g); g.connect(S.master);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(34, now);
    osc.frequency.linearRampToValueAtTime(22, now + 3.2);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, now);
    og.gain.linearRampToValueAtTime(amp * 0.8, now + 0.35);
    og.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(og); og.connect(S.master);
    src.start(now); src.stop(now + dur + 0.05);
    osc.start(now); osc.stop(now + dur + 0.05);
  };
})(window.OC);
