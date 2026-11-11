/* ================= ПРОФИЛИ КАЧЕСТВА И ПРОИЗВОДИТЕЛЬНОСТЬ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const PRESETS = {
    low: {
      id: 'low',
      label: 'Низкое',
      pixelRatioMax: 1.15,
      terrainNearDist: 260,
      terrainMidDist: 620,
      terrainFarDist: 1150,
      terrainNearSegs: 18,
      terrainMidSegs: 10,
      terrainFarSegs: 5,
      floraActiveRadius: 270,
      floraCacheRadius: 420,
      floraDensity: 0.45,
      fishScale: 0.55,
      particlesScale: 0.5,
      rayCount: 10,
      caustics: true,
      postFx: false,
      bloomScale: 0.0
    },
    medium: {
      id: 'medium',
      label: 'Среднее',
      pixelRatioMax: 1.5,
      terrainNearDist: 360,
      terrainMidDist: 780,
      terrainFarDist: 1450,
      terrainNearSegs: 26,
      terrainMidSegs: 14,
      terrainFarSegs: 7,
      floraActiveRadius: 400,
      floraCacheRadius: 580,
      floraDensity: 0.78,
      fishScale: 0.8,
      particlesScale: 0.8,
      rayCount: 16,
      caustics: true,
      postFx: true,
      bloomScale: 0.72
    },
    high: {
      id: 'high',
      label: 'Высокое',
      pixelRatioMax: 2.0,
      terrainNearDist: 460,
      terrainMidDist: 960,
      terrainFarDist: 1700,
      terrainNearSegs: 34,
      terrainMidSegs: 18,
      terrainFarSegs: 9,
      floraActiveRadius: 540,
      floraCacheRadius: 740,
      floraDensity: 1.0,
      fishScale: 1.0,
      particlesScale: 1.0,
      rayCount: 22,
      caustics: true,
      postFx: true,
      bloomScale: 1.0
    },
    ultra: {
      id: 'ultra',
      label: 'Ультра',
      pixelRatioMax: 2.0,
      terrainNearDist: 600,
      terrainMidDist: 1180,
      terrainFarDist: 1950,
      terrainNearSegs: 42,
      terrainMidSegs: 22,
      terrainFarSegs: 10,
      floraActiveRadius: 680,
      floraCacheRadius: 900,
      floraDensity: 1.32,
      fishScale: 1.3,
      particlesScale: 1.35,
      rayCount: 28,
      caustics: true,
      postFx: true,
      bloomScale: 1.28
    }
  };

  function detectDefault() {
    const isSmall = window.innerWidth < 820 || (navigator.maxTouchPoints > 1 && window.innerWidth < 1100);
    const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    if (isSmall || lowCores) return 'medium';
    return 'high';
  }

  const TIERS = ['low', 'medium', 'high', 'ultra'];
  let currentId = detectDefault();
  let initialCeilingId = currentId;
  const listeners = [];

  const autoLod = {
    enabled: true,
    cooldownSec: 0,
    overBudgetSec: 0,
    underBudgetSec: 0,
    lastP95Ms: 0,
    adjustments: 0,
    lastReason: 'инициализация'
  };

  function applyPreset(id, fromAuto) {
    if (!PRESETS[id] || id === currentId) return PRESETS[id];
    currentId = id;
    if (!fromAuto) {
      initialCeilingId = id;
      autoLod.overBudgetSec = 0;
      autoLod.underBudgetSec = 0;
    }
    for (const fn of listeners) fn(PRESETS[id]);
    return PRESETS[id];
  }

  OC.Quality = {
    PRESETS,
    presets: PRESETS,
    getId: () => currentId,
    get: () => PRESETS[currentId],
    set: (id, opts) => {
      const fromAuto = !!(opts && opts.fromAuto);
      if (!fromAuto) autoLod.enabled = !!(opts && opts.keepAuto);
      return applyPreset(id, fromAuto);
    },
    setAutoLod: (on) => {
      autoLod.enabled = !!on;
      autoLod.overBudgetSec = 0;
      autoLod.underBudgetSec = 0;
      autoLod.cooldownSec = 0;
      if (autoLod.enabled) autoLod.lastReason = 'включён';
      else autoLod.lastReason = 'ручной режим';
      return autoLod.enabled;
    },
    isAutoLod: () => autoLod.enabled,
    getAutoLodState: () => ({
      enabled: autoLod.enabled,
      currentId,
      p95CpuMs: autoLod.lastP95Ms,
      adjustments: autoLod.adjustments,
      lastReason: autoLod.lastReason
    }),
    evaluateAutoLod: (p95CpuMs, dt, opts) => {
      if (!Number.isFinite(p95CpuMs) || p95CpuMs <= 0) return currentId;
      autoLod.lastP95Ms = Math.round(p95CpuMs * 100) / 100;
      if (!autoLod.enabled) return currentId;
      const stepDt = Math.max(0.01, Math.min(2.0, dt || 0.2));
      if (autoLod.cooldownSec > 0) autoLod.cooldownSec = Math.max(0, autoLod.cooldownSec - stepDt);

      const downMs = (opts && opts.downMs) || 30.0;
      const upMs = (opts && opts.upMs) || 13.5;
      const tierIdx = TIERS.indexOf(currentId);
      const maxIdx = Math.max(TIERS.indexOf(initialCeilingId), 2); // максимум 'high' или выбранный ручной потолок

      if (p95CpuMs > downMs) {
        autoLod.overBudgetSec += stepDt;
        autoLod.underBudgetSec = 0;
        if (autoLod.overBudgetSec >= 2.0 && autoLod.cooldownSec <= 0 && tierIdx > 0) {
          const nextId = TIERS[tierIdx - 1];
          autoLod.overBudgetSec = 0;
          autoLod.cooldownSec = 5.0;
          autoLod.adjustments++;
          autoLod.lastReason = 'снижено (' + p95CpuMs.toFixed(1) + ' мс > ' + downMs + ')';
          applyPreset(nextId, true);
        }
      } else if (p95CpuMs < upMs) {
        autoLod.underBudgetSec += stepDt;
        autoLod.overBudgetSec = 0;
        if (autoLod.underBudgetSec >= 5.5 && autoLod.cooldownSec <= 0 && tierIdx < maxIdx) {
          const nextId = TIERS[tierIdx + 1];
          autoLod.underBudgetSec = 0;
          autoLod.cooldownSec = 6.0;
          autoLod.adjustments++;
          autoLod.lastReason = 'повышено (' + p95CpuMs.toFixed(1) + ' мс < ' + upMs + ')';
          applyPreset(nextId, true);
        }
      } else {
        autoLod.overBudgetSec = Math.max(0, autoLod.overBudgetSec - stepDt * 0.5);
        autoLod.underBudgetSec = Math.max(0, autoLod.underBudgetSec - stepDt * 0.5);
      }
      return currentId;
    },
    onChange: (fn) => {
      listeners.push(fn);
    }
  };
})(window.OC);
