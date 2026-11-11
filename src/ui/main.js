/* ================= ГЛАВНЫЙ ЦИКЛ, HUD И КООРДИНАЦИЯ МОДУЛЕЙ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const canvas = document.getElementById('scene');
  const hero = document.querySelector('.hero');
  const panel = document.getElementById('panel');
  const btnPanel = document.getElementById('btn-panel');
  const btnLab = document.getElementById('btn-lab');
  const btnRov = document.getElementById('btn-rov');
  const btnCam = document.getElementById('btn-cam');
  const btnCinema = document.getElementById('btn-cinema');
  const btnJournal = document.getElementById('btn-journal');

  const subHorizon = document.getElementById('sub-horizon');
  const subPressure = document.getElementById('sub-pressure');
  const subClearance = document.getElementById('sub-clearance');
  const subSpeedEl = document.getElementById('sub-speed');
  const subCurrentEl = document.getElementById('sub-current');
  const subPhaseEl = document.getElementById('sub-phase');
  const sonarCanvas = document.getElementById('sonar-canvas');
  const sonarReadout = document.getElementById('sonar-readout');
  const hydroCanvas = document.getElementById('hydro-canvas');
  const hydroDb = document.getElementById('hydro-db');
  const hydroSource = document.getElementById('hydro-source');
  const hydroBand = document.getElementById('hydro-band');
  const hydroTrackBtn = document.getElementById('hydro-track-btn');
  const hydroBearingEl = document.getElementById('hydro-bearing');

  const teleZone = document.getElementById('tele-zone');
  const teleDepth = document.getElementById('tele-depth');
  const teleTemp = document.getElementById('tele-temp');
  const teleHeading = document.getElementById('tele-heading');
  const teleWeatherSep = document.getElementById('tele-weather-sep');
  const teleWeatherWrap = document.getElementById('tele-weather-wrap');
  const teleWeather = document.getElementById('tele-weather');
  const teleWpSep = document.getElementById('tele-wp-sep');
  const teleWpWrap = document.getElementById('tele-wp-wrap');
  const teleWp = document.getElementById('tele-wp');
  const lensCanvas = document.getElementById('lens-fx');

  const camHud = document.getElementById('cam-hud');
  const camTargetEl = document.getElementById('cam-target');
  const camFovLabel = document.getElementById('cam-fov-label');
  const btnCamFilter = document.getElementById('btn-cam-filter');
  const camFlash = document.getElementById('cam-flash');
  const camPreview = document.getElementById('cam-preview');
  const camPreviewImg = document.getElementById('cam-preview-img');
  const camPreviewMeta = document.getElementById('cam-preview-meta');
  const camDownload = document.getElementById('cam-download');
  const cinemaBars = document.getElementById('cinema-bars');
  const cinemaHud = document.getElementById('cinema-hud');
  const cinemaFiltersEl = document.getElementById('cinema-filters');

  const journalModal = document.getElementById('journal-modal');
  const journalTitle = document.getElementById('journal-title');
  const journalSummary = document.getElementById('journal-summary');
  const journalGrid = document.getElementById('journal-grid');
  const journalTabs = document.getElementById('journal-tabs');

  const statChunks = document.getElementById('stat-chunks');
  const statCorals = document.getElementById('stat-corals');
  const statFish = document.getElementById('stat-fish');
  const statBig = document.getElementById('stat-big');

  const fpsEl = document.getElementById('fps');
  const loading = document.getElementById('loading');
  const loadingBar = document.getElementById('loading-bar');
  const toastEl = document.getElementById('toast');
  const popup = document.getElementById('fish-popup');

  const guideProgBar = document.getElementById('guide-prog-bar');

  const labPanel = document.getElementById('lab-panel');
  const labHealthNum = document.getElementById('lab-health-num');
  const labStatus = document.getElementById('lab-status');
  const labMBleach = document.getElementById('lab-m-bleach');
  const labMO2 = document.getElementById('lab-m-o2');
  const labMCalc = document.getElementById('lab-m-calc');
  const labMFish = document.getElementById('lab-m-fish');
  const labChart = document.getElementById('lab-chart');
  const labPresetsEl = document.getElementById('lab-presets');
  const labSpeedEl = document.getElementById('lab-speed-btns');
  const labSTemp = document.getElementById('lab-s-temp');
  const labVTemp = document.getElementById('lab-v-temp');
  const labSPh = document.getElementById('lab-s-ph');
  const labVPh = document.getElementById('lab-v-ph');
  const labSNutr = document.getElementById('lab-s-nutr');
  const labVNutr = document.getElementById('lab-v-nutr');
  const labSCurr = document.getElementById('lab-s-curr');
  const labVCurr = document.getElementById('lab-v-curr');
  let lastLabTone = 'ok';

  const rovPanel = document.getElementById('rov-panel');
  const rovClose = document.getElementById('rov-close');
  const rovBtnChase = document.getElementById('rov-btn-chase');
  const rovBtnCurrents = document.getElementById('rov-btn-currents');
  const rovBtnSample = document.getElementById('rov-btn-sample');
  const rovBtnCtd = document.getElementById('rov-btn-ctd');
  const rovBtnVessel = document.getElementById('rov-btn-vessel');
  const rovBtnBuoy = document.getElementById('rov-btn-buoy');
  const rovBtnBuoyView = document.getElementById('rov-btn-buoy-view');
  const rovBtnBuoyRecall = document.getElementById('rov-btn-buoy-recall');
  const rovTargetLabel = document.getElementById('rov-target-label');
  const rovFlowLabel = document.getElementById('rov-flow-label');
  const rovTetherLabel = document.getElementById('rov-tether-label');
  const rovBuoyStatus = document.getElementById('rov-buoy-status');
  const rovCtdChart = document.getElementById('rov-ctd-chart');
  const rovCtdThermo = document.getElementById('rov-ctd-thermo');
  const rovCtdTemps = document.getElementById('rov-ctd-temps');
  const rovCtdO2 = document.getElementById('rov-ctd-o2');
  const rovCtdPress = document.getElementById('rov-ctd-press');
  const rovSampleCount = document.getElementById('rov-sample-count');
  const rovSamplesEl = document.getElementById('rov-samples');
  const rovBtnMuseum = document.getElementById('rov-btn-museum');
  const rovSamplesClear = document.getElementById('rov-samples-clear');
  const _rovScanOut = { kind: 'water', species: '', label: '', latin: '', dist: 0, colorHex: 0x58e0ff };

  let autoCycle = true;
  let hudHidden = false;
  let subMode = false;
  let toastTimer = 0;
  let activeBiome = null;
  let activeFauna = null;
  let uiHandles = null;
  let optHud = null;
  let pendingPhotoCapture = false;
  let previewHideTimer = 0;
  let journalTab = 'missions';
  let lastEvalCtx = { zoneId: '', depthM: 0, currentKnots: 0, dayW: 1.0, flashOn: false };
  let sonarPingState = { t: -10, range: 140, kind: 'none', label: 'Сканер · Чисто', hit: false };
  const _fwd = new T.Vector3();

  function updateLensDroplets(dt, camPos, wState, biome) {
    OC._HudPanels.updateLensDroplets(lensCanvas, dt, camPos, wState, biome);
  }

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setBar(p) {
    if (loadingBar) loadingBar.style.width = (p * 100).toFixed(0) + '%';
  }

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  function formatHeading(yawRad) {
    return OC._HudPanels.formatHeading(yawRad);
  }

  /* Пикинг сцены и карточки видов — ui/picking.js */
  const picking = OC._ScenePicking.bind({
    getScene: () => OC.getScene(),
    getCamera: () => OC.getCamera(),
    getCanvas: () => canvas,
    toast
  });
  const detectCenterTarget = picking.detectCenterTarget;
  const pickAt = picking.pickAt;
  const showInfo = picking.showInfo;
  const showRovPopup = picking.showRovPopup;

  function renderJournal() {
    OC._HudPanels.renderJournal({
      journalGrid,
      journalTitle,
      journalSummary,
      journalModal,
      journalTab,
      activeBiome,
      lastEvalCtx,
      switchBiome,
      toast
    });
  }

  function drawEchosounder(camPos, yaw, biome, fauna, time) {
    OC._HudPanels.drawEchosounder(sonarCanvas, subMode, camPos, yaw, biome, time, sonarPingState);
  }

  function bindUI() {
    if (window.innerWidth < 1100 && panel) panel.classList.add('closed');
    if (btnPanel && panel) {
      btnPanel.classList.toggle('open', !panel.classList.contains('closed'));
      btnPanel.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('closed');
        const isOpen = !panel.classList.contains('closed');
        btnPanel.classList.toggle('open', isOpen);
        if (isOpen && labPanel) {
          labPanel.classList.add('closed');
          if (btnLab) btnLab.classList.remove('on');
        }
        if (isOpen && rovPanel) {
          rovPanel.classList.add('closed');
          if (btnRov) btnRov.classList.toggle('on', !!(OC.Navigation.isRovView && OC.Navigation.isRovView()));
        }
      });
    }

    /* Панели эколаборатории и ROV вынесены в ui/panels_rov.js */
    const rovHud = OC._HudPanelsRov.bind({
      toast,
      renderJournal,
      getBiome: () => activeBiome,
      getFauna: () => activeFauna,
      setJournalTab: (t) => { journalTab = t; },
      fwd: _fwd
    });
    const syncLabControls = rovHud.syncLabControls;
    const updateLabDisplay = rovHud.updateLabDisplay;
    const syncRovButtons = rovHud.syncRovButtons;
    const toggleLab = rovHud.toggleLab;
    const toggleRovPanel = rovHud.toggleRovPanel;
    const toggleRovChase = rovHud.toggleRovChase;
    const updateRovCtdDisplay = rovHud.updateRovCtdDisplay;
    const renderRovSamples = rovHud.renderRovSamples;
    const triggerSampleGrab = rovHud.triggerSampleGrab;
    const triggerCtdCast = rovHud.triggerCtdCast;
    const triggerDeployBuoy = rovHud.triggerDeployBuoy;



    if (btnRov) {
      btnRov.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleRovPanel(false);
      });
    }
    if (rovClose) rovClose.addEventListener('click', () => toggleRovPanel(true));
    if (rovBtnChase) rovBtnChase.addEventListener('click', toggleRovChase);
    if (rovBtnCurrents) {
      rovBtnCurrents.addEventListener('click', () => {
        if (!OC.ROV) return;
        const on = OC.ROV.toggleCurrents();
        syncRovButtons();
        toast(on ? '3D-трассеры океанических течений включены' : '3D-трассеры течений скрыты');
      });
    }
    if (rovBtnSample) rovBtnSample.addEventListener('click', triggerSampleGrab);
    if (rovBtnCtd) rovBtnCtd.addEventListener('click', triggerCtdCast);
    if (rovBtnBuoy) rovBtnBuoy.addEventListener('click', triggerDeployBuoy);
    if (rovBtnBuoyView) {
      rovBtnBuoyView.addEventListener('click', () => {
        if (!OC.ROV || !OC.ROV.getBuoys) return;
        const list = OC.ROV.getBuoys();
        if (!list.length) { toast('Сначала сбросьте автономный буй (9)'); return; }
        const b = list[list.length - 1];
        OC.Navigation.flyTo(b.x - 3.6, b.y + 1.8, b.z - 3.6, Math.atan2(3.6, 3.6), -0.22);
        toast('Переход к камере ' + b.label);
      });
    }
    if (rovBtnBuoyRecall) {
      rovBtnBuoyRecall.addEventListener('click', () => {
        if (!OC.ROV || !OC.ROV.recallBuoys) return;
        const n = OC.ROV.recallBuoys();
        syncRovButtons();
        toast(n > 0 ? ('Свёрнуто автономных буёв: ' + n) : 'Нет развёрнутых буёв');
      });
    }
    if (rovBtnVessel) {
      rovBtnVessel.addEventListener('click', () => {
        const vInfo = OC.faunaInfo ? OC.faunaInfo.vessel : null;
        if (!vInfo) {
          toast('В этой глубоководной зоне нет надводного судна');
          return;
        }
        OC.Navigation.flyTo(vInfo.deckPos[0], vInfo.deckPos[1], vInfo.deckPos[2], vInfo.deckYaw, -0.09);
        if (OC.sound && OC.sound.missionChime) OC.sound.missionChime();
        toast('Всплытие на поверхность к ' + vInfo.name);
      });
    }
    if (rovBtnMuseum) {
      rovBtnMuseum.addEventListener('click', (e) => {
        e.stopPropagation();
        journalTab = 'museum';
        if (journalTabs) journalTabs.querySelectorAll('button[data-jtab]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-jtab') === 'museum'));
        if (journalModal) {
          journalModal.classList.remove('hidden');
          if (OC.UI && OC.UI.Rail) OC.UI.Rail.setModalOpen('journal', true);
          renderJournal();
        }
      });
    }
    if (rovSamplesClear) {
      rovSamplesClear.addEventListener('click', () => {
        if (!OC.ROV) return;
        OC.ROV.clearSamples();
        renderRovSamples();
        toast('Отсек проб очищен');
      });
    }
    syncRovButtons();
    renderRovSamples();

    /* Сервисные панели: свет, звук, атлас, глобус, сонар, гидрофон, режимы — ui/panels_service.js */
    const svcHud = OC._HudPanelsService.bind({
      toast,
      getBiome: () => activeBiome,
      getFauna: () => activeFauna,
      isSubMode: () => subMode,
      setSubMode: (v) => { subMode = v; },
      getSonarState: () => sonarPingState,
      patchSonarState: (patch) => { sonarPingState = Object.assign({}, sonarPingState, patch); },
      getPendingPhotoCapture: () => pendingPhotoCapture,
      setPendingPhotoCapture: (v) => { pendingPhotoCapture = v; },
      fadeHero: () => { if (hero) hero.classList.add('fade'); }
    });
    const syncModes = svcHud.syncModes;
    const syncFlash = svcHud.syncFlash;
    const syncSubMode = svcHud.syncSubMode;
    const syncGuideCard = svcHud.syncGuideCard;
    const syncSound = svcHud.syncSound;
    const syncHydroMode = svcHud.syncHydroMode;
    const syncFogButton = svcHud.syncFogButton;
    const fireSonarPing = svcHud.fireSonarPing;


    /* Фотокамера, кино-режим и журнал вынесены в ui/panels_camera.js */
    const camHudBind = OC._HudPanelsCamera.bind({
      toast,
      renderJournal,
      getBiome: () => activeBiome,
      setJournalTab: (t) => { journalTab = t; },
      isHudHidden: () => hudHidden,
      setPendingPhotoCapture: (v) => { pendingPhotoCapture = v; }
    });
    const syncCamMode = camHudBind.syncCamMode;
    const setCinemaUI = camHudBind.setCinemaUI;
    const triggerShutter = camHudBind.triggerShutter;
    const syncFilterUI = camHudBind.syncFilterUI;
    const toggleJournal = camHudBind.toggleJournal;
    const downloadExpeditionReport = camHudBind.downloadExpeditionReport;



    /* Время суток, погода, профили оптики и кнопка HUD — ui/panels_options.js */
    optHud = OC._HudPanelsOptions.bind({
      toast,
      getBiome: () => activeBiome,
      isHudHidden: () => hudHidden,
      setHudHidden: (v) => { hudHidden = v; },
      isAutoCycle: () => autoCycle,
      setAutoCycle: (v) => { autoCycle = v; }
    });
    const syncAuto = optHud.syncAuto;
    const syncWeatherButtons = optHud.syncWeatherButtons;
    const renderQualityButtons = optHud.renderQualityButtons;
    const updateResBadge = optHud.updateResBadge;
    const syncHudToggle = optHud.syncHudToggle;
    const toggleHud = optHud.toggleHud;

    /* Переключатель биомов и чипы локаций — ui/panels_biomes.js */
    const bioHud = OC._HudPanelsBiomes.bind({
      toast,
      getBiome: () => activeBiome,
      switchBiome: (id) => switchBiome(id)
    });
    const renderBiomeUI = bioHud.renderBiomeUI;
    const renderZoneChips = bioHud.renderZoneChips;


    /* Тач-джойстик и быстрые действия — ui/panels_touch.js */
    const touchHud = OC._HudPanelsTouch.bind({
      toast,
      isFlashOn: () => !!(OC.isFlashlightOn && OC.isFlashlightOn()),
      isSubMode: () => subMode,
      isPanelOpen: () => !!(panel && !panel.classList.contains('closed')),
      toggleFlash: () => OC.toggleFlashlight(),
      syncFlash: (on) => syncFlash(on),
      syncSubMode: (on) => syncSubMode(on),
      fireSonarPing: () => fireSonarPing(),
      triggerSampleGrab: () => triggerSampleGrab(),
      togglePanel: () => { if (btnPanel) btnPanel.click(); }
    });
    const syncTouchQuick = touchHud.syncTouchQuick;

    window.addEventListener('gamepadconnected', (e) => {
      const id = e && e.gamepad ? e.gamepad.id.slice(0, 32) : 'Контроллер';
      toast('Геймпад подключён: ' + id);
    });

    /* Горячие клавиши — ui/hotkeys.js */
    const keyMap = OC._Hotkeys.bind({
      toast,
      getBiome: () => activeBiome,
      syncSound: (on) => syncSound(on),
      syncFlash: (on) => syncFlash(on),
      syncSubMode: (on) => syncSubMode(on),
      isSubMode: () => subMode,
      syncHydroMode: (on) => syncHydroMode(on),
      fireSonarPing: () => fireSonarPing(),
      triggerShutter: () => triggerShutter(),
      toggleLab: (f) => toggleLab(f),
      toggleRovChase: () => toggleRovChase(),
      triggerSampleGrab: () => triggerSampleGrab(),
      toggleRovPanel: (f) => toggleRovPanel(f),
      triggerCtdCast: () => triggerCtdCast(),
      syncCamMode: (on) => syncCamMode(on),
      toggleJournal: (f) => toggleJournal(f),
      syncFilterUI: () => syncFilterUI(),
      toggleHud: () => toggleHud(),
      updateResBadge: () => updateResBadge(),
      syncWeatherButtons: () => syncWeatherButtons(),
      triggerDeployBuoy: () => triggerDeployBuoy(),
      toggleHelp: (f) => toggleHelp(f),
      isHelpOpen: () => isHelpOpen(),
      isJournalOpen: () => !!(journalModal && !journalModal.classList.contains('hidden')),
      isLabOpen: () => !!(labPanel && !labPanel.classList.contains('closed')),
      isRovOpen: () => !!(rovPanel && !rovPanel.classList.contains('closed')),
      camFovLabel
    });

    /* Модалка помощи и онбординг-герой — ui/panels_guide.js */
    const guideHud = OC._HudPanelsGuide.bind({
      toast,
      getBiome: () => activeBiome,
      syncSubMode: (on) => syncSubMode(on),
      isSubMode: () => subMode,
      syncFlash: (on) => syncFlash(on),
      syncHydroMode: (on) => syncHydroMode(on),
      fireSonarPing: () => fireSonarPing(),
      triggerSampleGrab: () => triggerSampleGrab(),
      triggerCtdCast: () => triggerCtdCast(),
      toggleRovPanel: (f) => toggleRovPanel(f),
      toggleLab: (f) => toggleLab(f),
      toggleJournal: (f) => toggleJournal(f),
      syncCamMode: (on) => syncCamMode(on),
      syncWeatherButtons: () => syncWeatherButtons(),
      syncSoundButton: (on) => syncSound(on)
    });
    const toggleHelp = guideHud.toggleHelp;
    const isHelpOpen = guideHud.isHelpOpen;
    const dismissHero = guideHud.dismissHero;

    return { syncModes, syncFlash, syncCamMode, syncSubMode, syncGuideCard, updateLabDisplay, syncLabControls, updateRovCtdDisplay, syncRovButtons, fireSonarPing, triggerShutter, syncWeatherButtons, renderQualityButtons, renderBiomeUI, renderZoneChips, updateResBadge, syncTouchQuick, syncHudToggle, toggleHud };
  }

  function switchBiome(id) {
    const prevBiome = activeBiome;
    const next = OC.Biomes.setActive(id);
    if (!next) return;
    activeBiome = next;
    const scene = OC.getScene();
    const sp = new T.Vector3(next.spawn.pos[0], next.spawn.pos[1], next.spawn.pos[2]);

    if (popup) popup.classList.add('hidden');
    if (camPreview) camPreview.classList.add('hidden');
    if (uiHandles && uiHandles.syncCamMode) uiHandles.syncCamMode(false);
    sonarPingState = { t: -10, range: 140, kind: 'none', label: 'Сканер · Чисто', hit: false };
    if (sonarReadout) sonarReadout.textContent = 'Сканер · Чисто';

    OC.refreshWorldForBiome(next);
    OC.Terrain.init(scene, next, sp);
    OC.FloraStreamer.init(scene, next, sp);
    activeFauna = OC.FaunaEngine.init(scene, next);
    activeFauna.setScale(window.innerHeight / 900);

    OC.Navigation.setBiome(next);
    OC.Minimap.setBiome(next);
    if (OC.Sonar) OC.Sonar.clear();
    const covEl = document.getElementById('map-cov');
    if (covEl && OC.Minimap.getCoverage) covEl.textContent = OC.Minimap.getCoverage() + '%';
    OC.Atlas.setBiome(next);
    if (OC.ROV) OC.ROV.resetForBiome(next, sp);

    const wasAbyss = prevBiome && prevBiome.noSurface;
    if (next.noSurface && !OC.isFlashlightOn()) {
      OC.setFlashlight(true);
      if (uiHandles) uiHandles.syncFlash(true);
    } else if (!next.noSurface && wasAbyss && OC.isFlashlightOn()) {
      OC.setFlashlight(false);
      if (uiHandles) uiHandles.syncFlash(false);
    }
    if (uiHandles) {
      uiHandles.renderBiomeUI();
      uiHandles.renderZoneChips();
      if (uiHandles.syncWeatherButtons) uiHandles.syncWeatherButtons();
      if (uiHandles.updateLabDisplay) uiHandles.updateLabDisplay();
      if (uiHandles.updateRovCtdDisplay) uiHandles.updateRovCtdDisplay();
      if (uiHandles.syncRovButtons) uiHandles.syncRovButtons();
    }
    if (journalModal && !journalModal.classList.contains('hidden')) renderJournal();
    toast(next.noSurface
      ? (next.name + ' · Глубина ' + (next.depthOffset ? Math.round(next.depthOffset + 18) : 2440) + '+ м, прожектор включён (F)')
      : (next.name + ' · ' + next.region));
  }
  OC.switchBiome = switchBiome;

  const PERF_WIN = 120;
  const cpuMsRing = new Float32Array(PERF_WIN);
  const cpuMsSorted = new Float32Array(PERF_WIN);
  let perfCursor = 0;
  let perfCount = 0;
  let perfFps = 0;
  let lastRendererRef = null;

  OC.getPerfStats = function () {
    const n = Math.min(perfCount, PERF_WIN);
    let sum = 0, max = 0;
    for (let i = 0; i < n; i++) {
      const v = cpuMsRing[i];
      sum += v;
      if (v > max) max = v;
      cpuMsSorted[i] = v;
    }
    let p95 = 0;
    if (n > 0) {
      const slice = cpuMsSorted.subarray(0, n).sort();
      p95 = slice[Math.min(n - 1, Math.floor(n * 0.95))];
    }
    const rInfo = lastRendererRef && lastRendererRef.info ? lastRendererRef.info : null;
    const lr = OC.getLastRenderStats ? OC.getLastRenderStats() : null;
    const tSt = OC.Terrain && OC.Terrain.getStats ? OC.Terrain.getStats() : null;
    const fSt = OC.FloraStreamer && OC.FloraStreamer.getStats ? OC.FloraStreamer.getStats() : null;
    return {
      biomeId: activeBiome ? activeBiome.id : '',
      fps: perfFps,
      sampleCount: n,
      avgCpuMs: n ? Math.round((sum / n) * 100) / 100 : 0,
      p95CpuMs: Math.round(p95 * 100) / 100,
      maxCpuMs: Math.round(max * 100) / 100,
      drawCalls: (lr && lr.calls) ? lr.calls : (rInfo && rInfo.render ? rInfo.render.calls : 0),
      triangles: (lr && lr.triangles) ? lr.triangles : (rInfo && rInfo.render ? rInfo.render.triangles : 0),
      geometries: rInfo && rInfo.memory ? rInfo.memory.geometries : 0,
      textures: rInfo && rInfo.memory ? rInfo.memory.textures : 0,
      chunksVisible: tSt ? tSt.visible : 0,
      floraInstances: fSt ? fSt.activeInstances : 0,
      schoolFish: OC.faunaInfo ? OC.faunaInfo.schoolFish : 0,
      qualityId: OC.Quality.getId ? OC.Quality.getId() : 'high'
    };
  };
  OC.switchBiome = switchBiome;

  function boot() {
    try {
      const savedQ = OC.Expedition && OC.Expedition.getSavedQuality ? OC.Expedition.getSavedQuality() : null;
      if (savedQ && OC.Quality.PRESETS && OC.Quality.PRESETS[savedQ]) OC.Quality.set(savedQ);

      activeBiome = OC.Biomes.getActive();
      if (OC.Weather && OC.Weather.onThunder) {
        OC.Weather.onThunder(() => {
          if (OC.sound && OC.sound.thunder) OC.sound.thunder();
        });
      }
      setBar(0.25);
      const init = OC.initWorld(canvas);
      const renderer = init.renderer;
      const scene = init.scene;
      const camera = init.camera;

      const sp = new T.Vector3(activeBiome.spawn.pos[0], activeBiome.spawn.pos[1], activeBiome.spawn.pos[2]);

      setBar(0.5);
      OC.Terrain.init(scene, activeBiome, sp);
      if (OC.Sonar) OC.Sonar.init(scene);

      setBar(0.72);
      OC.FloraStreamer.init(scene, activeBiome, sp);

      setBar(0.88);
      activeFauna = OC.FaunaEngine.init(scene, activeBiome);
      if (OC.ROV) {
        OC.ROV.init(scene);
        OC.ROV.resetForBiome(activeBiome, sp);
      }
      if (OC.Hydrophone) OC.Hydrophone.init(hydroCanvas);

      OC.Navigation.init(canvas, activeBiome, {
        onPick: (cx, cy) => pickAt(cx, cy, activeBiome),
        onModeChange: (m) => { if (uiHandles) uiHandles.syncModes(m); },
        onTourToast: (title) => {
          const st = OC.Navigation.getTourState ? OC.Navigation.getTourState() : null;
          if (OC.sound && OC.sound.tourChime) OC.sound.tourChime(st ? st.idx : 0);
          toast('Гид-тур: ' + title);
        },
        onTourChange: (st) => {
          if (uiHandles && uiHandles.syncGuideCard) uiHandles.syncGuideCard(st);
        },
        onGamepadAction: (action) => {
          if (!uiHandles) return;
          if (action === 'flashlight') {
            const on = OC.toggleFlashlight();
            uiHandles.syncFlash(on);
            toast(on ? 'Прожектор включён' : 'Прожектор выключен');
          } else if (action === 'sonar') {
            uiHandles.fireSonarPing();
          } else if (action === 'sub') {
            uiHandles.syncSubMode(!subMode);
            toast(subMode ? 'Режим батискафа включён' : 'Режим свободного дайвера');
          } else if (action === 'cinema') {
            const next = OC.Navigation.getMode() === 'cinema' ? 'swim' : 'cinema';
            OC.Navigation.setMode(next);
          } else if (action === 'photo' && OC.Expedition && (OC.Expedition.isPhotoMode() || OC.Expedition.isCinemaMode())) {
            uiHandles.triggerShutter();
          }
        }
      });

      OC.Minimap.init(document.getElementById('minimap'), activeBiome, (x, y, z, yaw, pitch, label) => {
        OC.Navigation.flyTo(x, y, z, yaw, pitch);
        if (label) toast('Переход: ' + label);
      }, (wp) => {
        toast(wp ? ('Маяк установлен: ' + wp.label) : 'Маяк снят');
      });

      OC.Atlas.init(activeBiome, (lm) => {
        OC.Navigation.flyTo(lm.x, lm.y, lm.z, lm.yaw, lm.pitch);
        toast('Курс на зону: ' + lm.name);
      });

      if (OC.Globe) {
        OC.Globe.init({
          getActiveBiomeId: () => (activeBiome ? activeBiome.id : null),
          getProgress: (biomeId) => {
            const b = OC.Biomes.get(biomeId);
            return (OC.Expedition && OC.Expedition.getBiomeSummary && b) ? OC.Expedition.getBiomeSummary(b) : null;
          },
          onSelectBiome: (id, startTour) => {
            if (!activeBiome || activeBiome.id !== id) switchBiome(id);
            if (startTour) OC.Navigation.setMode('tour');
          }
        });
      }

      /* Рейл иконок и скрытие HUD под модалками — ui/rails.js */
      if (OC.UI && OC.UI.Rail) OC.UI.Rail.init();

      uiHandles = bindUI();
      uiHandles.syncModes(OC.Navigation.getMode());
      uiHandles.syncGuideCard(OC.Navigation.getTourState());

      // Мобильный старт: сразу удерживаем целевой FPS динамическим разрешением
      if (OC.Quality && OC.Quality.isMobile && OC.Quality.isMobile()) {
        const dyn = OC.Quality.getDynamicResolution ? OC.Quality.getDynamicResolution() : null;
        if (dyn && dyn.enabled && OC.applyPixelScale) OC.applyPixelScale(dyn.scale);
        document.body.classList.add('coarse-pointer');
        if (uiHandles.updateResBadge) uiHandles.updateResBadge();
      }
      // Реакция на смену ориентации/размера: пересчёт буфера и компактного HUD
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          if (OC.applyPixelScale) OC.applyPixelScale();
          if (renderer && renderer.setSize) {
            renderer.setSize(window.innerWidth, window.innerHeight, false);
          }
        }, 220);
      });

      setBar(1.0);
      setTimeout(() => {
        if (loading) {
          loading.classList.add('hidden');
          setTimeout(() => loading.remove(), 800);
        }
      }, 280);

      runLoop(renderer, scene, camera);
    } catch (e) {
      console.error(e);
      if (loading) {
        loading.innerHTML = '<div style="color:#fff;font:500 16px system-ui;padding:24px;max-width:520px;text-align:center">Не удалось инициализировать WebGL.<br><span style="opacity:.7;font-size:13px">' + (e && e.message ? e.message : e) + '</span></div>';
      }
    }
  }

  function runLoop(renderer, scene, camera) {
    lastRendererRef = renderer;
    let last = performance.now();
    let time = 0, fpsAcc = 0, fpsFrames = 0, hudTimer = 0;

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      if (OC.resizeWorld) OC.resizeWorld(w, h);
      else renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (lensCanvas) {
        lensCanvas.width = w;
        lensCanvas.height = h;
      }
      if (activeFauna) activeFauna.setScale(h / 900);
      if (OC.setWorldParticleScale) OC.setWorldParticleScale(h / 900);
    }
    window.addEventListener('resize', resize);
    resize();

    /* Энергосбережение: на скрытой вкладке цикл рендера замирает и не жжёт GPU */
    let hiddenPaused = false;
    if (document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        hiddenPaused = !!document.hidden;
        if (!hiddenPaused) last = performance.now();
      });
    }

    /* Телеметрия HUD — ui/telemetry.js */
    const telemetry = OC._HudTelemetry.bind({
      toast,
      getBiome: () => activeBiome,
      getFauna: () => activeFauna,
      isSubMode: () => subMode,
      formatHeading: (yaw) => formatHeading(yaw),
      drawEchosounder: (p, y, b, f, t) => drawEchosounder(p, y, b, f, t),
      detectCenterTarget: (c, b, f) => detectCenterTarget(c, b, f),
      onMissionsEvaluated: (biome, evalCtx) => {
        lastEvalCtx = evalCtx;
        const mRes = OC.Expedition.evaluateMissions(biome, lastEvalCtx);
        if (mRes.newlyCompleted.length) {
          if (OC.sound && OC.sound.missionChime) OC.sound.missionChime();
          toast('Миссия выполнена: ' + mRes.newlyCompleted[0].title + '!');
          if (journalModal && !journalModal.classList.contains('hidden')) renderJournal();
        }
      },
      syncClock: (t) => { if (optHud) optHud.syncClock(t, autoCycle); },
      onLabUpdate: (labState, panelOpen) => {
        if (panelOpen && uiHandles && uiHandles.updateLabDisplay) uiHandles.updateLabDisplay();
        if (labState.statusTone !== lastLabTone) {
          if (labState.statusTone === 'crit') toast('Внимание: ' + labState.statusLabel + '!');
          else if (lastLabTone === 'crit' && labState.statusTone === 'warn') toast('Экосистема начинает восстановление');
          lastLabTone = labState.statusTone;
        }
      }
    });

    function frame(now) {
      requestAnimationFrame(frame);
      if (hiddenPaused) { last = now; return; }
      const cpuT0 = performance.now();
      const rawDt = Math.min(0.05, (now - last) / 1000) || 0.016;
      last = now;
      const dt = reduced ? rawDt * 0.5 : rawDt;
      time += dt;
      OC.uTime.value = time;

      OC.Navigation.update(dt, time, camera, reduced);
      const camPos = camera.position;
      const craftPos = OC.Navigation.getPosition ? OC.Navigation.getPosition() : camPos;

      OC.updateWorld(dt, time, camPos, autoCycle);
      OC.Terrain.update(camPos);
      OC.FloraStreamer.update(camPos);
      if (OC.Sonar) OC.Sonar.update(dt);
      const camSpeed = OC.Navigation.getSpeed();
      const flashOn = OC.isFlashlightOn();
      if (OC.ROV) {
        const photoOn = !!(OC.Expedition && OC.Expedition.isPhotoMode && OC.Expedition.isPhotoMode());
        const navMode = OC.Navigation.getMode();
        const showCraft = !!(OC.Navigation.isRovView && OC.Navigation.isRovView() && (navMode === 'swim' || navMode === 'orbit') && !photoOn);
        OC.ROV.update(dt, time, camera, craftPos, OC.Navigation.getYaw(), OC.Navigation.getPitch(), camSpeed, activeBiome, {
          showCraft,
          flashOn,
          labState: OC.EcoLab ? OC.EcoLab.getState() : null
        });
      }
      if (activeFauna) activeFauna.update(dt, time, camPos, camSpeed, flashOn);
      const wState = OC.Weather ? OC.Weather.getState() : { stormMix: 0, droplets: 0 };
      updateLensDroplets(rawDt, camPos, wState, activeBiome);

      if (OC.Hydrophone && OC.Hydrophone.isOpen && OC.Hydrophone.isOpen() && activeBiome) {
        const hOffset = activeBiome.depthOffset || 0;
        const hDepth = hOffset + (hOffset > 0 ? -craftPos.y : Math.max(0, -craftPos.y));
        OC.Hydrophone.update(rawDt, activeBiome, activeFauna, craftPos, OC.Navigation.getYaw(), hDepth, wState.stormMix || 0);
      }

      hudTimer += rawDt;
      if (hudTimer > 0.14 && activeBiome) {
        hudTimer = 0;
        telemetry.update(time, craftPos, camSpeed, flashOn);
      }

      fpsAcc += rawDt;
      fpsFrames++;
      if (fpsAcc > 0.5) {
        perfFps = Math.round(fpsFrames / fpsAcc);
        if (fpsEl) fpsEl.textContent = perfFps + ' FPS';
        if (time >= 6.0 && perfCount >= 32 && OC.Quality && OC.Quality.evaluateAutoLod) {
          const prevQId = OC.Quality.getId();
          const stNow = OC.getPerfStats();
          const nextQId = OC.Quality.evaluateAutoLod(stNow.p95CpuMs, fpsAcc);
          if (nextQId !== prevQId) {
            toast('Адаптивный LOD: ' + OC.Quality.PRESETS[prevQId].label + ' -> ' + OC.Quality.PRESETS[nextQId].label + ' (p95 ' + stNow.p95CpuMs.toFixed(1) + ' мс)');
          } else if (uiHandles && uiHandles.renderQualityButtons) {
            uiHandles.renderQualityButtons();
          }
          // Динамическое разрешение: независимая от профиля тонкая подстройка пиксельной плотности
          if (OC.Quality.evaluateDynamicResolution) {
            const prevScale = OC.getPixelScale ? OC.getPixelScale() : 1.0;
            const nextScale = OC.Quality.evaluateDynamicResolution(stNow.p95CpuMs, fpsAcc);
            if (Math.abs(nextScale - prevScale) > 0.015 && OC.applyPixelScale) {
              OC.applyPixelScale(nextScale);
              if (uiHandles && uiHandles.updateResBadge) uiHandles.updateResBadge();
            }
          }
        }
        fpsAcc = 0;
        fpsFrames = 0;
      }

      picking.autoHidePopup(now);

      // Плавный оптический зум объектива в режиме фотокамеры
      const wantFov = (OC.Expedition && OC.Expedition.isPhotoMode()) ? OC.Expedition.getZoomFov() : 60;
      if (Math.abs(camera.fov - wantFov) > 0.08) {
        camera.fov = OC.lerp(camera.fov, wantFov, Math.min(1, rawDt * 12));
        camera.updateProjectionMatrix();
      }

      if (OC.renderWorld) OC.renderWorld(scene, camera);
      else renderer.render(scene, camera);

      const cpuMs = performance.now() - cpuT0;
      cpuMsRing[perfCursor] = cpuMs;
      perfCursor = (perfCursor + 1) % PERF_WIN;
      if (perfCount < PERF_WIN) perfCount++;

      if (pendingPhotoCapture && activeBiome && OC.Expedition) {
        pendingPhotoCapture = false;
        if (OC.sound && OC.sound.shutter) OC.sound.shutter();
        if (camFlash) {
          camFlash.classList.add('bang');
          setTimeout(() => camFlash.classList.remove('bang'), 35);
        }
        const palSnap = OC.getPalette();
        const daySnap = palSnap && typeof palSnap.dayW === 'number' ? palSnap.dayW : 1.0;
        const depthSnap = (activeBiome.depthOffset || 0) + ((activeBiome.depthOffset || 0) > 0 ? -camPos.y : Math.max(0, -camPos.y));
        const tgt = detectCenterTarget(camera, activeBiome, activeFauna);
        const ph = OC.Expedition.recordPhoto(canvas, activeBiome, tgt, depthSnap, daySnap, flashOn);
        const isNewAtlas = OC.Atlas.discover(ph.key);
        if (camPreview && camPreviewImg && camPreviewMeta && camDownload) {
          if (ph.dataUrl) camPreviewImg.src = ph.dataUrl;
          camPreviewMeta.innerHTML = '<b>' + ph.title + '</b><small>Оценка кадра: ' + ph.score + '/100' + (isNewAtlas ? ' · Открыто в Атласе!' : '') + '</small>';
          if (ph.downloadUrl) {
            camDownload.href = ph.downloadUrl;
            camDownload.download = ph.key + '_' + ph.depthM + 'm.png';
          }
          camPreview.classList.remove('hidden');
          clearTimeout(previewHideTimer);
          previewHideTimer = setTimeout(() => camPreview.classList.add('hidden'), 8000);
        }
        toast('Снимок: ' + ph.title + ' · ' + ph.score + '/100');
      }
    }

    requestAnimationFrame(frame);
  }

  setBar(0.1);
  let kicked = false;
  const kick = () => {
    if (kicked) return;
    kicked = true;
    setTimeout(boot, 20);
  };
  requestAnimationFrame(kick);
  setTimeout(kick, 350);
})(window.OC);
