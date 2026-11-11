/* ================= ЭКСПЕДИЦИЯ: ПРОГРЕСС, СОХРАНЕНИЕ И КЭШ СЕССИИ ================= */
/* Единое хранилище localStorage (открытия, миссии, фото, пробы, маячки, туман карты),
   устойчивое к переполнению квоты, плюс эфемерное состояние сессии.
   Остальные модули экспедиции работают с ним только через OC._ExpStore. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const STORAGE_KEY = 'oc_ocean_expedition_v1';

  function loadStore() {
    const empty = { discovered: {}, missionsDone: {}, photos: [], samples: [], waypoints: {}, fogMaps: {}, quality: null };
    try {
      if (typeof localStorage === 'undefined') return empty;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return empty;
      const parsed = JSON.parse(raw);
      return Object.assign(empty, parsed || {});
    } catch (e) {
      return empty;
    }
  }

  let store = loadStore();

  function saveStore() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      // Если превышена квота из-за снимков — сжимаем галерею и сохраняем прогресс Атласа/миссий
      try {
        if (store.photos.length > 2) store.photos = store.photos.slice(0, 2);
        else store.photos.forEach((p) => { p.dataUrl = ''; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      } catch (e2) { /* noop */ }
    }
  }

  /* ---- Состояние текущей сессии (фильтры, режимы, зум, кэш PNG) ---- */
  const sessionState = {
    photoMode: false,
    cinemaMode: false,
    filterId: 'none',
    zoomFov: 52,
    sonarPingsByBiome: {},
    pingKeysByBiome: {},
    visitedZonesByBiome: {},
    fullPngCache: {} // id -> full dataURL PNG в оперативной памяти текущей сессии
  };

  OC._ExpStore = {
    getStore: () => store,
    saveStore,
    sessionState
  };
})(window.OC);
