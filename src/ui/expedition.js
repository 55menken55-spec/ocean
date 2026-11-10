/* ================= ЭКСПЕДИЦИЯ: ФОТОКАМЕРА, НАУЧНЫЕ МИССИИ, МАЯЧКИ И СОХРАНЕНИЕ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const STORAGE_KEY = 'oc_ocean_expedition_v1';

  function loadStore() {
    const empty = { discovered: {}, missionsDone: {}, photos: [], waypoints: {}, quality: null };
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

  /* ---- Научные миссии по 3 биомам Земли ---- */
  const MISSIONS = [
    // 1. Большой Барьерный риф
    {
      id: 'gbr_atlas_6',
      biomeId: 'great_barrier_reef',
      title: 'Хранитель Большого рифа',
      desc: 'Изучите или сфотографируйте 6 разных видов флоры и фауны рифа.',
      landmarkId: 'crest',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'gbr_pass_current',
      biomeId: 'great_barrier_reef',
      title: 'Стремнина Прохода',
      desc: 'Заплывите в Рифовый проход и зафиксируйте приливное течение быстрее 1.5 узлов.',
      landmarkId: 'pass',
      goal: 1,
      progress: (ctx) => (ctx.zoneId === 'slope_hole' && ctx.currentKnots >= 1.5) ? 1 : 0
    },
    {
      id: 'gbr_night_bio',
      biomeId: 'great_barrier_reef',
      title: 'Ночные огни стены',
      desc: 'Ночью или с прожектором (F) на глубине > 35 м снимите или отсканируйте сонаром (G) фонариков или манту.',
      landmarkId: 'dropoff',
      goal: 1,
      progress: (ctx) => (ctx.hasPhotoOrPing(['fish_lantern', 'manta']) && (ctx.dayW < 0.45 || (ctx.flashOn && ctx.depthM > 35))) ? 1 : 0
    },
    {
      id: 'gbr_whale_photo',
      biomeId: 'great_barrier_reef',
      title: 'Портрет океанского гиганта',
      desc: 'Сфотографируйте на подводную камеру (P) горбатого кита или китовую акулу у внешней стены.',
      landmarkId: 'dropoff',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['whale_humpback', 'shark_whale']) ? 1 : 0
    },

    // 2. Лес гигантской ламинарии (Монтерей)
    {
      id: 'kelp_flora_5',
      biomeId: 'kelp_forest',
      title: 'Ботаник залива Монтерей',
      desc: 'Изучите 5 видов калифорнийского шельфа, включая гигантскую ламинарию Macrocystis.',
      landmarkId: 'kelp_heart',
      goal: 5,
      progress: (ctx) => (ctx.hasDiscovered('kelp_giant') ? Math.min(5, ctx.discoveredCount) : Math.min(4, ctx.discoveredCount))
    },
    {
      id: 'kelp_predator_photo',
      biomeId: 'kelp_forest',
      title: 'Охотники среди крон',
      desc: 'Сфотографируйте на камеру (P) калифорнийского морского льва или леопардовую акулу.',
      landmarkId: 'sea_stacks',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['sea_lion', 'shark_leopard']) ? 1 : 0
    },
    {
      id: 'kelp_school_photo',
      biomeId: 'kelp_forest',
      title: 'Серебряный вихрь',
      desc: 'Сделайте снимок косяка северных анчоусов или огненно-оранжевых гарибальди.',
      landmarkId: 'baitball_edge',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['fish_anchovy', 'fish_garibaldi']) ? 1 : 0
    },
    {
      id: 'kelp_canyon_sonar',
      biomeId: 'kelp_forest',
      title: 'Кромка апвеллинга',
      desc: 'Погрузитесь в каньон Монтерей глубже 38 м и выполните активный импульс сонара (G).',
      landmarkId: 'canyon_abyss',
      goal: 1,
      progress: (ctx) => (ctx.depthM >= 38 && ctx.sonarPings > 0) ? 1 : 0
    },

    // 3. Абиссальные чёрные курильщики
    {
      id: 'abyss_deep_sonar',
      biomeId: 'hydrothermal_vents',
      title: 'Предел батискафа',
      desc: 'Опуститесь на глубину 2480+ м (~246 атм) в жёлоб бездны и проведите сканирование сонаром (G).',
      landmarkId: 'deep_trench',
      goal: 1,
      progress: (ctx) => (ctx.depthM >= 2480 && ctx.sonarPings > 0) ? 1 : 0
    },
    {
      id: 'abyss_vent_photo',
      biomeId: 'hydrothermal_vents',
      title: 'Дыхание земной коры',
      desc: 'Сфотографируйте (P) сульфидный «чёрный курильщик» или алых червей Riftia pachyptila.',
      landmarkId: 'central_smoker',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['vent_chimney', 'riftia_worms']) ? 1 : 0
    },
    {
      id: 'abyss_hunter_photo',
      biomeId: 'hydrothermal_vents',
      title: 'Обитатели вечной ночи',
      desc: 'Поймайте в объектив (P) глубоководного морского чёрта, кальмара или осьминога Дамбо.',
      landmarkId: 'deep_trench',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['fish_angler', 'squid_abyssal', 'octopus_dumbo']) ? 1 : 0
    },
    {
      id: 'abyss_atlas_5',
      biomeId: 'hydrothermal_vents',
      title: 'Жизнь без солнца',
      desc: 'Соберите в Атласе 5 разных открытий экосистемы гидротермального рифта.',
      landmarkId: 'riftia_oasis',
      goal: 5,
      progress: (ctx) => ctx.discoveredCount
    }
  ];

  const sessionState = {
    photoMode: false,
    zoomFov: 52,
    sonarPingsByBiome: {},
    pingKeysByBiome: {},
    fullPngCache: {} // id -> full dataURL PNG в оперативной памяти текущей сессии
  };

  function getMissionDoneList(biomeId) {
    if (!store.missionsDone[biomeId]) store.missionsDone[biomeId] = [];
    return store.missionsDone[biomeId];
  }

  function scorePhoto(target, dayW, flashOn, depthM, biome) {
    let score = 64;
    if (target && target.hit && target.key !== 'floor') {
      score += 14;
      const distBonus = target.dist < 18 ? 10 : (target.dist < 42 ? 7 : 3);
      const alignBonus = Math.round((target.align !== undefined ? target.align : 0.7) * 8);
      score += distBonus + alignBonus;
    }
    const lit = (biome && biome.noSurface) ? (flashOn ? 4 : -8) : (dayW > 0.35 || flashOn ? 4 : -5);
    score += lit;
    if (depthM > 35 && flashOn) score += 2;
    return OC.clamp(Math.round(score), 42, 99);
  }

  function renderStampPreview(srcCanvas, stampText) {
    try {
      const w = 640;
      const aspect = (srcCanvas.height || 400) / Math.max(1, srcCanvas.width || 640);
      const h = Math.round(w * aspect);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx || !ctx.drawImage) return '';
      ctx.drawImage(srcCanvas, 0, 0, w, h);
      ctx.fillStyle = 'rgba(3, 14, 26, 0.72)';
      ctx.fillRect(0, h - 28, w, 28);
      ctx.fillStyle = '#8ef0ff';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(stampText, 12, h - 10);
      return c.toDataURL ? c.toDataURL('image/jpeg', 0.8) : '';
    } catch (e) {
      return '';
    }
  }

  function renderFullPng(srcCanvas, stampText) {
    try {
      const w = srcCanvas.width || 1280;
      const h = srcCanvas.height || 720;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx || !ctx.drawImage) return '';
      ctx.drawImage(srcCanvas, 0, 0, w, h);
      ctx.fillStyle = 'rgba(3, 14, 26, 0.72)';
      ctx.fillRect(0, h - 38, w, 38);
      ctx.fillStyle = '#9cf2ff';
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText(stampText, 18, h - 14);
      return c.toDataURL ? c.toDataURL('image/png') : '';
    } catch (e) {
      return srcCanvas.toDataURL ? srcCanvas.toDataURL('image/png') : '';
    }
  }

  OC.Expedition = {
    MISSIONS,

    getSavedDiscovered(biomeId) {
      return Array.isArray(store.discovered[biomeId]) ? store.discovered[biomeId] : ['floor'];
    },

    saveDiscovered(biomeId, setOrArr) {
      store.discovered[biomeId] = Array.from(setOrArr);
      saveStore();
    },

    getSavedQuality() {
      return store.quality || null;
    },

    saveQuality(qId) {
      store.quality = qId;
      saveStore();
    },

    setWaypoint(biomeId, x, z, label) {
      store.waypoints[biomeId] = { x, z, label: label || 'Навигационная метка' };
      saveStore();
      return store.waypoints[biomeId];
    },

    clearWaypoint(biomeId) {
      delete store.waypoints[biomeId];
      saveStore();
    },

    getWaypoint(biomeId) {
      return store.waypoints[biomeId] || null;
    },

    isPhotoMode: () => sessionState.photoMode,
    setPhotoMode(on) {
      sessionState.photoMode = !!on;
      return sessionState.photoMode;
    },
    getZoomFov: () => sessionState.zoomFov,
    adjustZoom(delta) {
      sessionState.zoomFov = OC.clamp(sessionState.zoomFov + delta, 26, 62);
      return sessionState.zoomFov;
    },

    recordSonarPing(biomeId, scanRes) {
      sessionState.sonarPingsByBiome[biomeId] = (sessionState.sonarPingsByBiome[biomeId] || 0) + 1;
      if (scanRes && scanRes.key) {
        if (!sessionState.pingKeysByBiome[biomeId]) sessionState.pingKeysByBiome[biomeId] = [];
        if (!sessionState.pingKeysByBiome[biomeId].includes(scanRes.key)) {
          sessionState.pingKeysByBiome[biomeId].push(scanRes.key);
        }
      }
    },

    recordPhoto(srcCanvas, biome, target, depthM, dayW, flashOn) {
      const key = (target && target.key) ? target.key : 'floor';
      const enc = biome.encyclopedia[key] || biome.encyclopedia.floor;
      const title = enc ? enc[0] : key;
      const latin = enc ? enc[1] : '';
      const score = scorePhoto(target, dayW, flashOn, depthM, biome);
      const distTxt = target && target.dist ? (target.dist.toFixed(1) + ' м · ') : '';
      const stamp = `${biome.name} · ${title} · Глуб. ${depthM.toFixed(0)} м · ${distTxt}Оценка ${score}/100`;

      const id = 'ph_' + Date.now() + '_' + Math.floor(Math.random() * 999);
      const previewUrl = srcCanvas ? renderStampPreview(srcCanvas, stamp) : '';
      const fullPng = srcCanvas ? renderFullPng(srcCanvas, stamp) : '';
      if (fullPng) sessionState.fullPngCache[id] = fullPng;

      const entry = {
        id,
        biomeId: biome.id,
        biomeName: biome.name,
        key,
        title,
        latin,
        score,
        dist: target && target.dist ? Number(target.dist.toFixed(1)) : 0,
        depthM: Number(depthM.toFixed(1)),
        dataUrl: previewUrl,
        ts: Date.now()
      };

      store.photos.unshift(entry);
      if (store.photos.length > 6) store.photos.length = 6;
      saveStore();
      return Object.assign({}, entry, { downloadUrl: fullPng || previewUrl });
    },

    getPhotoDownloadUrl(photoId) {
      if (sessionState.fullPngCache[photoId]) return sessionState.fullPngCache[photoId];
      const found = store.photos.find((p) => p.id === photoId);
      return found ? found.dataUrl : '';
    },

    getPhotos(biomeId) {
      if (!biomeId) return store.photos.slice();
      return store.photos.filter((p) => p.biomeId === biomeId);
    },

    clearPhotos() {
      store.photos = [];
      sessionState.fullPngCache = {};
      saveStore();
    },

    evaluateMissions(biome, stateCtx) {
      if (!biome) return { list: [], newlyCompleted: [] };
      const biomeId = biome.id;
      const doneList = getMissionDoneList(biomeId);
      const discoveredArr = this.getSavedDiscovered(biomeId);
      const discoveredSet = new Set(discoveredArr);
      const photosInBiome = store.photos.filter((p) => p.biomeId === biomeId);
      const pingKeys = sessionState.pingKeysByBiome[biomeId] || [];

      const evalCtx = Object.assign({
        zoneId: '',
        depthM: 0,
        currentKnots: 0,
        dayW: 1.0,
        flashOn: false,
        discoveredCount: discoveredSet.size,
        sonarPings: sessionState.sonarPingsByBiome[biomeId] || 0,
        hasDiscovered: (k) => discoveredSet.has(k),
        hasPhoto: (keys) => photosInBiome.some((p) => keys.includes(p.key)),
        hasPhotoOrPing: (keys) => photosInBiome.some((p) => keys.includes(p.key)) || keys.some((k) => pingKeys.includes(k))
      }, stateCtx || {});

      const list = [];
      const newlyCompleted = [];

      for (const m of MISSIONS) {
        if (m.biomeId !== biomeId) continue;
        const rawCur = m.progress(evalCtx);
        const cur = OC.clamp(rawCur, 0, m.goal);
        let done = doneList.includes(m.id);
        if (!done && cur >= m.goal) {
          done = true;
          doneList.push(m.id);
          newlyCompleted.push(m);
        }
        list.push({
          id: m.id,
          biomeId: m.biomeId,
          title: m.title,
          desc: m.desc,
          landmarkId: m.landmarkId,
          cur: done ? m.goal : cur,
          goal: m.goal,
          done
        });
      }

      if (newlyCompleted.length) saveStore();
      return { list, newlyCompleted };
    },

    getAllSummary() {
      const doneTotal = Object.values(store.missionsDone).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
      return {
        missionsDone: doneTotal,
        missionsTotal: MISSIONS.length,
        photosCount: store.photos.length
      };
    }
  };
})(window.OC);
