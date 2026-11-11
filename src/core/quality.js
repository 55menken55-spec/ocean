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

  let currentId = detectDefault();
  const listeners = [];

  OC.Quality = {
    PRESETS,
    presets: PRESETS,
    getId: () => currentId,
    get: () => PRESETS[currentId],
    set: (id) => {
      if (!PRESETS[id] || id === currentId) return PRESETS[currentId];
      currentId = id;
      for (const fn of listeners) fn(PRESETS[id]);
      return PRESETS[id];
    },
    onChange: (fn) => {
      listeners.push(fn);
    }
  };
})(window.OC);
