/* ================= ПРОФИЛИ КАЧЕСТВА И ПРОИЗВОДИТЕЛЬНОСТЬ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const PRESETS = {
    low: {
      id: 'low',
      label: 'Низкое',
      pixelRatioMax: 1.15,
      terrainNearDist: 220,
      terrainMidDist: 440,
      terrainFarDist: 660,
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
      terrainNearDist: 300,
      terrainMidDist: 560,
      terrainFarDist: 780,
      terrainNearSegs: 26,
      terrainMidSegs: 14,
      terrainFarSegs: 7,
      floraActiveRadius: 380,
      floraCacheRadius: 560,
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
      terrainNearDist: 380,
      terrainMidDist: 680,
      terrainFarDist: 920,
      terrainNearSegs: 34,
      terrainMidSegs: 18,
      terrainFarSegs: 9,
      floraActiveRadius: 480,
      floraCacheRadius: 680,
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
      terrainNearDist: 520,
      terrainMidDist: 880,
      terrainFarDist: 1180,
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

  /* Динамическое разрешение: на мобильных и слабых GPU шаг пикселя плавно
     опускается до 62% от профиля, чтобы удержать 60 FPS без потери HUD-чёткости. */
  const dynRes = {
    enabled: true,
    scale: 1.0,
    lastReason: 'инициализация'
  };

  function isMobileDevice() {
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return !!(coarse || (navigator.maxTouchPoints > 0 && window.innerWidth < 1100));
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
    isMobile: isMobileDevice,
    setDynamicResolution: (on) => {
      dynRes.enabled = !!on;
      if (!dynRes.enabled) dynRes.scale = 1.0;
      dynRes.lastReason = dynRes.enabled ? 'включено' : 'отключено';
      return dynRes.enabled;
    },
    getDynamicResolution: () => ({
      enabled: dynRes.enabled,
      scale: Math.round(dynRes.scale * 1000) / 1000,
      pixelRatio: Math.round(PRESETS[currentId].pixelRatioMax * dynRes.scale * 1000) / 1000,
      lastReason: dynRes.lastReason
    }),
    evaluateDynamicResolution: (p95CpuMs, dt) => {
      if (!dynRes.enabled || !Number.isFinite(p95CpuMs) || p95CpuMs <= 0) return dynRes.scale;
      const stepDt = Math.max(0.01, Math.min(2.0, dt || 0.2));
      // Мобильные профили агрессивнее: целимся в 19 мс на тач-устройствах
      const target = isMobileDevice() ? 19.0 : 22.0;
      const floor = isMobileDevice() ? 0.62 : 0.72;
      let next = dynRes.scale;
      if (p95CpuMs > target * 1.22) {
        next = Math.max(floor, dynRes.scale - stepDt * 0.22);
      } else if (p95CpuMs < target * 0.78) {
        next = Math.min(1.0, dynRes.scale + stepDt * 0.10);
      }
      if (Math.abs(next - dynRes.scale) > 0.004) {
        dynRes.scale = next;
        dynRes.lastReason = 'p95 ' + p95CpuMs.toFixed(1) + ' мс → масштаб ' + Math.round(next * 100) + '%';
      }
      return dynRes.scale;
    },
    getAutoLodState: () => ({
      enabled: autoLod.enabled,
      currentId,
      p95CpuMs: autoLod.lastP95Ms,
      adjustments: autoLod.adjustments,
      lastReason: autoLod.lastReason,
      dynamicResScale: Math.round(dynRes.scale * 1000) / 1000,
      dynamicResEnabled: dynRes.enabled
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
