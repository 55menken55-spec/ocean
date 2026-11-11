/* ================= ЭКСПЕДИЦИЯ: ФОТОКАМЕРА, ФИЛЬТРЫ И ЖУРНАЛ ОТКРЫТИЙ ================= */
/* Режимы съёмки и кино, фильтры, зум, запись сонарных пингов, фото-галерея,
   прогресс миссий, пробы, сводки по биомам и туман карты.
   Хранилище — expedition/store.js, каталог миссий — expedition/missions.js,
   научный отчёт — expedition/report.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const { getStore, saveStore, sessionState } = OC._ExpStore;
  const { MISSIONS } = OC._ExpMissions;

  /* Живая ссылка на хранилище прогресса (мутируется на месте) */
  const storeRef = () => getStore();

  function getActiveFilterCss() {
    const f = FILTERS.find((x) => x.id === sessionState.filterId);
    return f ? f.css : '';
  }

  function getMissionDoneList(biomeId) {
    const st = storeRef();
    if (!st.missionsDone[biomeId]) st.missionsDone[biomeId] = [];
    return st.missionsDone[biomeId];
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
      const fCss = getActiveFilterCss();
      if (fCss && 'filter' in ctx) ctx.filter = fCss;
      ctx.drawImage(srcCanvas, 0, 0, w, h);
      if ('filter' in ctx) ctx.filter = 'none';
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
      const fCss = getActiveFilterCss();
      if (fCss && 'filter' in ctx) ctx.filter = fCss;
      ctx.drawImage(srcCanvas, 0, 0, w, h);
      if ('filter' in ctx) ctx.filter = 'none';
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

  const FILTERS = [
    { id: 'none', label: 'Естеств.', css: '' },
    { id: 'natgeo', label: 'NatGeo', css: 'contrast(1.14) saturate(1.24) brightness(1.03)' },
    { id: 'abyss', label: 'Абиссаль', css: 'contrast(1.25) saturate(0.72) hue-rotate(-8deg) brightness(0.92)' },
    { id: 'cousteau', label: 'Кусто 16мм', css: 'sepia(0.22) contrast(1.08) saturate(1.15) brightness(1.02)' },
    { id: 'biolum', label: 'Неон Био', css: 'contrast(1.18) saturate(1.48) hue-rotate(8deg) brightness(1.06)' }
  ];

  OC.Expedition = {
    MISSIONS,
    FILTERS,

    isCinemaMode: () => sessionState.cinemaMode,
    setCinemaMode(on) {
      sessionState.cinemaMode = !!on;
      return sessionState.cinemaMode;
    },
    getFilters: () => FILTERS,
    getFilter() {
      return FILTERS.find((x) => x.id === sessionState.filterId) || FILTERS[0];
    },
    setFilter(id) {
      const f = FILTERS.find((x) => x.id === id);
      if (f) sessionState.filterId = f.id;
      return this.getFilter();
    },
    cycleFilter() {
      const idx = FILTERS.findIndex((x) => x.id === sessionState.filterId);
      const next = FILTERS[(idx + 1) % FILTERS.length];
      sessionState.filterId = next.id;
      return next;
    },

    getSavedDiscovered(biomeId) {
      return Array.isArray(storeRef().discovered[biomeId]) ? storeRef().discovered[biomeId] : ['floor'];
    },

    saveDiscovered(biomeId, setOrArr) {
      storeRef().discovered[biomeId] = Array.from(setOrArr);
      saveStore();
    },

    getSavedQuality() {
      return storeRef().quality || null;
    },

    saveQuality(qId) {
      storeRef().quality = qId;
      saveStore();
    },

    setWaypoint(biomeId, x, z, label) {
      storeRef().waypoints[biomeId] = { x, z, label: label || 'Навигационная метка' };
      saveStore();
      return storeRef().waypoints[biomeId];
    },

    clearWaypoint(biomeId) {
      delete storeRef().waypoints[biomeId];
      saveStore();
    },

    getWaypoint(biomeId) {
      return storeRef().waypoints[biomeId] || null;
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

      storeRef().photos.unshift(entry);
      if (storeRef().photos.length > 6) storeRef().photos.length = 6;
      saveStore();
      return Object.assign({}, entry, { downloadUrl: fullPng || previewUrl });
    },

    getPhotoDownloadUrl(photoId) {
      if (sessionState.fullPngCache[photoId]) return sessionState.fullPngCache[photoId];
      const found = storeRef().photos.find((p) => p.id === photoId);
      return found ? found.dataUrl : '';
    },

    getPhotos(biomeId) {
      if (!biomeId) return storeRef().photos.slice();
      return storeRef().photos.filter((p) => p.biomeId === biomeId);
    },

    clearPhotos() {
      storeRef().photos = [];
      sessionState.fullPngCache = {};
      saveStore();
    },

    evaluateMissions(biome, stateCtx) {
      if (!biome) return { list: [], newlyCompleted: [] };
      const biomeId = biome.id;
      const doneList = getMissionDoneList(biomeId);
      const discoveredArr = this.getSavedDiscovered(biomeId);
      const discoveredSet = new Set(discoveredArr);
      const photosInBiome = storeRef().photos.filter((p) => p.biomeId === biomeId);
      const pingKeys = sessionState.pingKeysByBiome[biomeId] || [];
      if (!sessionState.visitedZonesByBiome[biomeId]) sessionState.visitedZonesByBiome[biomeId] = [];
      const visitedZones = sessionState.visitedZonesByBiome[biomeId];
      if (stateCtx && stateCtx.zoneId && !visitedZones.includes(stateCtx.zoneId)) {
        visitedZones.push(stateCtx.zoneId);
      }

      const evalCtx = Object.assign({
        zoneId: '',
        depthM: 0,
        currentKnots: 0,
        dayW: 1.0,
        flashOn: false,
        discoveredCount: discoveredSet.size,
        sonarPings: sessionState.sonarPingsByBiome[biomeId] || 0,
        hasZone: (zId) => visitedZones.includes(zId) || evalCtx.zoneId === zId,
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
      const doneTotal = Object.values(storeRef().missionsDone).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
      return {
        missionsDone: doneTotal,
        missionsTotal: MISSIONS.length,
        photosCount: storeRef().photos.length,
        samplesCount: Array.isArray(storeRef().samples) ? storeRef().samples.length : 0
      };
    },

    addSample(entry) {
      if (!entry) return null;
      if (!Array.isArray(storeRef().samples)) storeRef().samples = [];
      const existingIdx = storeRef().samples.findIndex((s) => s.biomeId === entry.biomeId && s.species === entry.species);
      if (existingIdx >= 0) storeRef().samples.splice(existingIdx, 1);
      storeRef().samples.unshift(entry);
      if (storeRef().samples.length > 36) storeRef().samples.length = 36;
      saveStore();
      return entry;
    },

    getSamples(biomeId) {
      const list = Array.isArray(storeRef().samples) ? storeRef().samples : [];
      if (!biomeId) return list.slice();
      return list.filter((s) => s.biomeId === biomeId);
    },

    clearSamples(biomeId) {
      if (!Array.isArray(storeRef().samples)) storeRef().samples = [];
      if (biomeId) storeRef().samples = storeRef().samples.filter((s) => s.biomeId !== biomeId);
      else storeRef().samples = [];
      saveStore();
    },

    getBiomeSummary(biome) {
      if (!biome) return { discovered: 0, speciesTotal: 0, missionsDone: 0, missionsTotal: 0 };
      const encKeys = biome.encyclopedia ? Object.keys(biome.encyclopedia) : [];
      const saved = this.getSavedDiscovered(biome.id);
      const discCount = saved.length || (biome.defaultDiscovered ? biome.defaultDiscovered.length : 1);
      const missionsTotal = MISSIONS.filter((m) => m.biomeId === biome.id).length;
      const doneArr = storeRef().missionsDone[biome.id];
      return {
        discovered: Math.min(encKeys.length, discCount),
        speciesTotal: encKeys.length,
        missionsDone: Array.isArray(doneArr) ? doneArr.length : 0,
        missionsTotal
      };
    },

    getFogGrid(biomeId) {
      if (!biomeId || !storeRef().fogMaps) return '';
      return storeRef().fogMaps[biomeId] || '';
    },

    setFogGrid(biomeId, encoded) {
      if (!biomeId) return;
      if (!storeRef().fogMaps) storeRef().fogMaps = {};
      storeRef().fogMaps[biomeId] = encoded || '';
      saveStore();
    },

    clearFogGrid(biomeId) {
      if (!storeRef().fogMaps) return;
      if (biomeId) delete storeRef().fogMaps[biomeId];
      else storeRef().fogMaps = {};
      saveStore();
    }
  };

  /* ---- Научный отчёт: реализация в expedition/report.js ---- */
  OC.Expedition.buildScientificReport = (context) => OC.Expedition._buildReport(context);
  OC.Expedition.formatReportMarkdown = (rep) => OC.Expedition._formatReportMd(rep);
  OC.Expedition.exportReport = (format, context) => OC.Expedition._exportReport(format, context);
  OC.Expedition.getLastExport = () => OC.Expedition._lastExport || null;
})(window.OC);
