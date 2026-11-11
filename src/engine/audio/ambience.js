/* ================= ЗВУК: ФОНОВЫЕ ШУМЫ СРЕДЫ ================= */
/* Пузырьки, щелчки рачков (snapping shrimp), капель в сеноте, треск пакового льда
   и скрип корпуса затонувшего судна. Все — процедурные, без сэмплов. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const S = OC._SoundState;

  const { rnd, noiseBuffer, loopNoise } = OC._AudioDsp;

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
        } else if (S.currentBiomeId === 'cenote_caves') {
          if (Math.random() < 0.25) S.caveDrip();
        } else if (S.currentDepth < 24 && S.currentZoneId !== 'dropoff' && S.currentBiomeId !== 'hydrothermal_vents' && S.currentBiomeId !== 'mariana_trench' && S.currentBiomeId !== 'brine_pool') {
          S.shrimpSnap();
        }
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

  S.caveDrip = function () {
    const ctx = S.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = 'sine';
    const f0 = rnd(580, 960);
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.65, now + 0.085);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.015, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g);
    if (pan) { pan.pan.value = rnd(-0.85, 0.85); g.connect(pan); pan.connect(S.master); }
    else g.connect(S.master);
    osc.start(now); osc.stop(now + 0.18);
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
})(window.OC);
