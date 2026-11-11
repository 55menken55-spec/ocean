/* ================= ГЛАВНЫЙ ЦИКЛ, HUD И КООРДИНАЦИЯ МОДУЛЕЙ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const canvas = document.getElementById('scene');
  const hero = document.querySelector('.hero');
  const panel = document.getElementById('panel');
  const btnPanel = document.getElementById('btn-panel');
  const btnSub = document.getElementById('btn-sub');
  const btnSonar = document.getElementById('btn-sonar');
  const btnHydro = document.getElementById('btn-hydro');
  const btnSound = document.getElementById('btn-sound');
  const btnFlash = document.getElementById('btn-flash');
  const btnAtlas = document.getElementById('btn-atlas');
  const btnGlobe = document.getElementById('btn-globe');
  const btnLab = document.getElementById('btn-lab');
  const btnRov = document.getElementById('btn-rov');
  const btnCam = document.getElementById('btn-cam');
  const btnCinema = document.getElementById('btn-cinema');
  const btnJournal = document.getElementById('btn-journal');
  const btnReset = document.getElementById('btn-reset');
  const btnSwim = document.getElementById('btn-mode-swim');
  const btnOrbit = document.getElementById('btn-mode-orbit');
  const btnTour = document.getElementById('btn-explore');
  const btnCinemaMode = document.getElementById('btn-mode-cinema');

  const subHud = document.getElementById('sub-hud');
  const subHorizon = document.getElementById('sub-horizon');
  const subPressure = document.getElementById('sub-pressure');
  const subClearance = document.getElementById('sub-clearance');
  const subSpeedEl = document.getElementById('sub-speed');
  const subCurrentEl = document.getElementById('sub-current');
  const subPhaseEl = document.getElementById('sub-phase');
  const sonarBox = document.getElementById('sonar-box');
  const sonarCanvas = document.getElementById('sonar-canvas');
  const sonarReadout = document.getElementById('sonar-readout');
  const mapCovEl = document.getElementById('map-cov');
  const mapFogBtn = document.getElementById('map-fog-btn');
  const hydroBox = document.getElementById('hydro-box');
  const hydroCanvas = document.getElementById('hydro-canvas');
  const hydroDb = document.getElementById('hydro-db');
  const hydroSource = document.getElementById('hydro-source');
  const hydroBand = document.getElementById('hydro-band');
  const hydroListenBtn = document.getElementById('hydro-listen-btn');
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

  const guideCard = document.getElementById('guide-card');
  const guideStep = document.getElementById('guide-step');
  const guideBiome = document.getElementById('guide-biome');
  const guideTitle = document.getElementById('guide-title');
  const guideFact = document.getElementById('guide-fact');
  const guideProgBar = document.getElementById('guide-prog-bar');
  const guidePrev = document.getElementById('guide-prev');
  const guidePause = document.getElementById('guide-pause');
  const guideNext = document.getElementById('guide-next');
  const guideExit = document.getElementById('guide-exit');

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
  const btnHelp = document.getElementById('btn-help');
  const helpModal = document.getElementById('help-modal');
  const helpClose = document.getElementById('help-close');
  const heroTourBtn = document.getElementById('hero-tour-btn');
  const heroHelpBtn = document.getElementById('hero-help-btn');
  const heroDismiss = document.getElementById('hero-dismiss');
  const _rovScanOut = { kind: 'water', species: '', label: '', latin: '', dist: 0, colorHex: 0x58e0ff };

  let autoCycle = true;
  let hudHidden = false;
  let subMode = false;
  let toastTimer = 0;
  let pickedTime = 0;
  let activeBiome = null;
  let activeFauna = null;
  let uiHandles = null;
  let optHud = null;
  let pendingPhotoCapture = false;
  let previewHideTimer = 0;
  let journalTab = 'missions';
  let lastEvalCtx = { zoneId: '', depthM: 0, currentKnots: 0, dayW: 1.0, flashOn: false };
  let sonarPingState = { t: -10, range: 140, kind: 'none', label: 'Сканер · Чисто', hit: false };
  let lastEcoEvent = null;
  let lastEcoEventAt = -100;
  const ECO_LABELS = OC._HudPanels.ECO_LABELS;
  const _fwd = new T.Vector3();
  const _zeroNdc = new T.Vector2(0, 0);

  function updateLensDroplets(dt, camPos, wState, biome) {
    OC._HudPanels.updateLensDroplets(lensCanvas, dt, camPos, wState, biome);
  }

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raycaster = new T.Raycaster();
  const ndc = new T.Vector2();

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

  function isObjVisible(obj) {
    for (let p = obj; p; p = p.parent) {
      if (!p.visible) return false;
    }
    return true;
  }

  function detectCenterTarget(camera, biome, fauna) {
    if (!camera || !biome) return null;
    camera.getWorldDirection(_fwd);
    let faunaHit = (fauna && fauna.scanCameraTarget) ? fauna.scanCameraTarget(camera.position, _fwd, 95) : null;

    raycaster.setFromCamera(_zeroNdc, camera);
    const hits = raycaster.intersectObjects(OC.getScene().children, true);
    let rayHit = null;
    for (const h of hits) {
      if (!isObjVisible(h.object) || h.distance > 48) continue;
      let o = h.object;
      while (o && !o.userData.key && !o.userData.rovKey) o = o.parent;
      if (o && o.userData.rovKey) continue;
      const key = o && o.userData.key ? o.userData.key : null;
      if (!key || key === 'bubbles' || key === 'plankton' || key === 'marine_snow') continue;
      const enc = biome.encyclopedia[key];
      rayHit = { hit: true, key, label: enc ? enc[0] : key, latin: enc ? enc[1] : '', dist: h.distance, align: 0.92 };
      break;
    }

    if (faunaHit && (!rayHit || rayHit.key === 'floor' || faunaHit.dist <= rayHit.dist + 8)) return faunaHit;
    return rayHit;
  }

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

  function showInfo(key, cx, cy, biome) {
    OC._HudPanels.showInfo(popup, key, cx, cy, biome);
    pickedTime = performance.now();
  }

  function showRovPopup(cx, cy) {
    OC._HudPanels.showRovPopup(popup, cx, cy);
    pickedTime = performance.now();
  }

  function pickAt(cx, cy, biome) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((cx - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((cy - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, OC.getCamera());
    const hits = raycaster.intersectObjects(OC.getScene().children, true);
    for (const h of hits) {
      if (!isObjVisible(h.object)) continue;
      let o = h.object;
      while (o && !o.userData.key && !o.userData.rovKey) o = o.parent;
      if (o && o.userData.rovKey) {
        if (o.userData.rovKey === 'rov_nautilus') {
          showRovPopup(cx, cy);
          return;
        }
        continue;
      }
      const key = o && o.userData.key ? o.userData.key : null;
      if (!key || key === 'bubbles' || key === 'plankton' || key === 'marine_snow') continue;
      showInfo(key, cx, cy, biome);
      return;
    }
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
        if (journalModal) { journalModal.classList.remove('hidden'); renderJournal(); }
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

    const syncSound = (on) => {
      if (!btnSound) return;
      btnSound.classList.toggle('on', on);
      btnSound.title = on ? 'Звук океана включён (M)' : 'Включить звук океана (M)';
      btnSound.setAttribute('aria-pressed', on);
    };
    syncSound(false);
    if (btnSound) {
      btnSound.addEventListener('click', (e) => {
        e.stopPropagation();
        syncSound(OC.sound.toggle());
      });
    }

    const syncFlash = (on) => {
      if (!btnFlash) return;
      btnFlash.classList.toggle('on', on);
      btnFlash.title = on ? 'Прожектор включён (F)' : 'Включить прожектор батискафа (F)';
      btnFlash.setAttribute('aria-pressed', on);
    };
    syncFlash(false);
    if (btnFlash) {
      btnFlash.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = OC.toggleFlashlight();
        syncFlash(on);
        toast(on ? 'Прожектор включён' : 'Прожектор выключен');
      });
    }

    if (btnAtlas) {
      btnAtlas.addEventListener('click', (e) => {
        e.stopPropagation();
        OC.Atlas.toggle();
      });
    }

    if (btnGlobe) {
      btnGlobe.addEventListener('click', (e) => {
        e.stopPropagation();
        if (OC.Globe) {
          OC.Globe.toggle();
          if (OC.sound && OC.sound.globeWhoosh) OC.sound.globeWhoosh();
        }
      });
    }

    const syncGuideCard = (st) => {
      if (!guideCard) return;
      if (!st || !st.active || !st.leg) {
        guideCard.classList.add('hidden');
        return;
      }
      guideCard.classList.remove('hidden');
      if (hero) hero.classList.add('fade');
      if (guideStep) guideStep.textContent = `Этап ${st.idx + 1} / ${st.total}`;
      if (guideBiome) guideBiome.textContent = activeBiome ? activeBiome.name : '';
      if (guideTitle) guideTitle.textContent = st.leg.title || '';
      if (guideFact) guideFact.textContent = st.leg.fact || '';
      if (guideProgBar) guideProgBar.style.width = `${(st.progress * 100).toFixed(1)}%`;
      if (guidePause) {
        guidePause.classList.toggle('on', !st.paused);
        guidePause.innerHTML = st.paused ? '&#9654; Продолжить' : '&#10074;&#10074; Пауза';
      }
    };

    if (guidePrev) guidePrev.addEventListener('click', () => OC.Navigation.stepTour(-1));
    if (guidePause) guidePause.addEventListener('click', () => OC.Navigation.toggleTourPause());
    if (guideNext) guideNext.addEventListener('click', () => OC.Navigation.stepTour(1));
    if (guideExit) guideExit.addEventListener('click', () => OC.Navigation.stopTour());

    const syncSubMode = (on) => {
      subMode = on;
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('sub-on', on);
      }
      if (btnSub) {
        btnSub.classList.toggle('on', on);
        btnSub.setAttribute('aria-pressed', on);
      }
      if (subHud) subHud.classList.toggle('hidden', !on);
      if (sonarBox) sonarBox.classList.toggle('hidden', !on);
      if (OC.setSubViewportOptics) OC.setSubViewportOptics(on);
    };
    syncSubMode(false);
    if (btnSub) {
      btnSub.addEventListener('click', (e) => {
        e.stopPropagation();
        syncSubMode(!subMode);
        toast(subMode ? 'Режим батискафа: эхолот и приборы включены' : 'Режим свободного дайвера');
      });
    }

    const fireSonarPing = () => {
      const cam = OC.getCamera();
      if (!cam || !activeFauna) return;
      OC.Navigation.getForward(_fwd);
      const res = activeFauna.scanForward(cam.position, _fwd, 140);
      sonarPingState = {
        t: OC.uTime.value,
        range: res.range,
        kind: res.kind,
        label: res.label,
        hit: res.hit
      };
      if (OC.Expedition && activeBiome) OC.Expedition.recordSonarPing(activeBiome.id, res);
      if (activeFauna.notifySonarPing) activeFauna.notifySonarPing(cam.position);
      OC.Minimap.triggerPing(cam.position.x, cam.position.z);
      const scanRes = (OC.Sonar && activeBiome) ? OC.Sonar.triggerScan(activeBiome, cam.position, OC.Navigation.getYaw(), 165) : null;
      if (mapCovEl && OC.Minimap.getCoverage) mapCovEl.textContent = OC.Minimap.getCoverage() + '%';
      if (OC.Hydrophone && OC.Hydrophone.notifySonarPing) OC.Hydrophone.notifySonarPing();
      OC.sound.sonarPing(res.range, res.hit);
      if (sonarReadout) {
        sonarReadout.textContent = res.hit
          ? (res.range.toFixed(0) + ' м · ' + res.label)
          : (scanRes ? ('3D-скан ' + scanRes.pointCount + ' тчк') : '165 м · Чистая вода');
      }
      if (btnSonar) {
        btnSonar.classList.add('on');
        setTimeout(() => btnSonar.classList.remove('on'), 650);
      }
      toast(res.hit
        ? ('Сонар: ' + res.range.toFixed(0) + ' м — ' + res.label)
        : ('3D-батиметрия: снято ' + (scanRes ? scanRes.pointCount : 1496) + ' точек рельефа'));
    };

    const syncHydroMode = (on) => {
      const next = (OC.Hydrophone && OC.Hydrophone.setOpen) ? OC.Hydrophone.setOpen(on) : !!on;
      if (btnHydro) {
        btnHydro.classList.toggle('on', next);
        btnHydro.setAttribute('aria-pressed', next);
      }
      if (hydroBox) hydroBox.classList.toggle('hidden', !next);
    };
    syncHydroMode(false);
    if (btnHydro) {
      btnHydro.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = !(OC.Hydrophone && OC.Hydrophone.isOpen && OC.Hydrophone.isOpen());
        syncHydroMode(next);
        toast(next ? 'Гидрофон активен: живая FFT-спектрограмма (0–4 кГц)' : 'Гидрофон свёрнут');
      });
    }
    if (hydroListenBtn) {
      hydroListenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (OC.Hydrophone && OC.Hydrophone.listenPeak) {
          const lbl = OC.Hydrophone.listenPeak();
          toast('Гидрофон: воспроизведение — ' + lbl);
        }
      });
    }
    if (hydroTrackBtn) {
      hydroTrackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!OC.Hydrophone || !OC.Hydrophone.getTrackTarget) return;
        const tgt = OC.Hydrophone.getTrackTarget();
        if (!tgt) {
          toast('Нет активного пеленга на источник звука');
          return;
        }
        const pos = OC.Navigation.getPosition();
        const dx = tgt.x - pos.x;
        const dy = tgt.y - pos.y;
        const dz = tgt.z - pos.z;
        const horiz = Math.max(0.1, Math.hypot(dx, dz));
        const turnYaw = Math.atan2(dx, dz);
        const turnPitch = OC.clamp(Math.atan2(dy, horiz), -0.65, 0.45);
        OC.Navigation.flyTo(pos.x, pos.y, pos.z, turnYaw, turnPitch);
        toast('Курс на пеленг ' + String(tgt.bearingDeg).padStart(3, '0') + '° — ' + tgt.label);
      });
    }

    if (btnSonar) {
      btnSonar.addEventListener('click', (e) => {
        e.stopPropagation();
        fireSonarPing();
      });
    }

    const syncFogButton = () => {
      const fogOn = !(OC.Minimap && OC.Minimap.isFogEnabled && !OC.Minimap.isFogEnabled());
      if (mapFogBtn) {
        mapFogBtn.classList.toggle('off', !fogOn);
        mapFogBtn.textContent = fogOn ? 'Туман' : 'Вся';
      }
      if (mapCovEl && OC.Minimap && OC.Minimap.getCoverage) {
        mapCovEl.textContent = OC.Minimap.getCoverage() + '%';
      }
    };
    syncFogButton();
    if (mapFogBtn) {
      mapFogBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!OC.Minimap || !OC.Minimap.setFogEnabled) return;
        const next = !OC.Minimap.isFogEnabled();
        OC.Minimap.setFogEnabled(next);
        syncFogButton();
        toast(next ? 'Мини-карта: туман войны включён (G — сонар)' : 'Мини-карта: показана полная батиметрия');
      });
    }

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


    function syncModes(mode) {
      if (btnSwim) btnSwim.classList.toggle('on', mode === 'swim');
      if (btnOrbit) btnOrbit.classList.toggle('on', mode === 'orbit');
      if (btnTour) {
        btnTour.classList.toggle('on', mode === 'tour');
        btnTour.innerHTML = mode === 'tour' ? '&#10005; Стоп тур' : '&#9654; Тур по рифу';
      }
      if (typeof setCinemaUI === 'function') setCinemaUI(mode === 'cinema');
    }

    if (btnSwim) btnSwim.addEventListener('click', () => { OC.Navigation.setMode('swim'); toast('Режим свободного плавания (WASD + мышь)'); });
    if (btnOrbit) btnOrbit.addEventListener('click', () => { OC.Navigation.setMode('orbit'); toast('Орбитальный осмотр (перетаскивание + колесо)'); });
    if (btnTour) {
      btnTour.addEventListener('click', () => {
        const next = OC.Navigation.getMode() === 'tour' ? 'swim' : 'tour';
        OC.Navigation.setMode(next);
      });
    }
    if (btnCinemaMode) {
      btnCinemaMode.addEventListener('click', () => {
        const next = OC.Navigation.getMode() === 'cinema' ? 'swim' : 'cinema';
        OC.Navigation.setMode(next);
        toast(next === 'cinema' ? 'Кино-режим: автопролёт и фильтры (N / X)' : 'Свободное плавание');
      });
    }
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        OC.Navigation.resetToSpawn();
        toast('Возврат к старту: ' + (activeBiome ? activeBiome.name : 'океан'));
      });
    }

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


    /* Виртуальный тач-джойстик и вертикальные кнопки */
    const touchStick = document.getElementById('touch-stick');
    const touchKnob = document.getElementById('touch-knob');
    const mUp = document.getElementById('m-up');
    const mDown = document.getElementById('m-down');
    let stickPtrId = null;
    let virtVert = 0;

    if (touchStick && OC.Navigation.setVirtualInput) {
      const resetStick = () => {
        stickPtrId = null;
        if (touchKnob) touchKnob.style.transform = 'translate(0px, 0px)';
        OC.Navigation.setVirtualInput(0, 0, virtVert);
      };
      const updateStick = (clientX, clientY) => {
        const rect = touchStick.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const maxR = Math.max(24, rect.width * 0.38);
        let dx = clientX - cx;
        let dy = clientY - cy;
        const len = Math.hypot(dx, dy);
        if (len > maxR) { dx = (dx / len) * maxR; dy = (dy / len) * maxR; }
        if (touchKnob) touchKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
        OC.Navigation.setVirtualInput(dx / maxR, -dy / maxR, virtVert);
      };
      touchStick.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        stickPtrId = e.pointerId;
        try { touchStick.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        updateStick(e.clientX, e.clientY);
      });
      touchStick.addEventListener('pointermove', (e) => {
        if (stickPtrId !== e.pointerId) return;
        updateStick(e.clientX, e.clientY);
      });
      touchStick.addEventListener('pointerup', (e) => { if (stickPtrId === e.pointerId) resetStick(); });
      touchStick.addEventListener('pointercancel', resetStick);
    }
    const bindVertBtn = (btn, val) => {
      if (!btn || !OC.Navigation.setVirtualInput) return;
      const setV = (v) => { virtVert = v; OC.Navigation.setVirtualInput(0, 0, virtVert); };
      btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); setV(val); });
      btn.addEventListener('pointerup', () => setV(0));
      btn.addEventListener('pointercancel', () => setV(0));
    };
    bindVertBtn(mUp, 1);
    bindVertBtn(mDown, -1);

    /* Сенсорный блок быстрых действий: прожектор, сонар, проба, батискаф, меню */
    const mFlash = document.getElementById('m-flash');
    const mSonar = document.getElementById('m-sonar');
    const mSample = document.getElementById('m-sample');
    const mSub = document.getElementById('m-sub');
    const mMenu = document.getElementById('m-menu');
    const syncTouchQuick = () => {
      if (mFlash) mFlash.classList.toggle('on', !!(OC.isFlashlightOn && OC.isFlashlightOn()));
      if (mSub) mSub.classList.toggle('on', subMode);
      if (mMenu && panel) mMenu.classList.toggle('on', !panel.classList.contains('closed'));
    };
    if (mFlash) {
      mFlash.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = OC.toggleFlashlight();
        syncFlash(on);
        syncTouchQuick();
        toast(on ? 'Прожектор включён' : 'Прожектор выключен');
      });
    }
    if (mSonar) {
      mSonar.addEventListener('click', (e) => {
        e.stopPropagation();
        fireSonarPing();
      });
    }
    if (mSample) {
      mSample.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerSampleGrab();
      });
    }
    if (mSub) {
      mSub.addEventListener('click', (e) => {
        e.stopPropagation();
        syncSubMode(!subMode);
        syncTouchQuick();
        toast(subMode ? 'Режим батискафа включён' : 'Режим свободного дайвера');
      });
    }
    if (mMenu) {
      mMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btnPanel) btnPanel.click();
        syncTouchQuick();
      });
    }
    syncTouchQuick();

    window.addEventListener('gamepadconnected', (e) => {
      const id = e && e.gamepad ? e.gamepad.id.slice(0, 32) : 'Контроллер';
      toast('Геймпад подключён: ' + id);
    });

    /* Горячие клавиши */
    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.code === 'KeyM') { syncSound(OC.sound.toggle()); }
      if (e.code === 'KeyF') {
        const on = OC.toggleFlashlight();
        syncFlash(on);
        toast(on ? 'Прожектор включён' : 'Прожектор выключен');
      }
      if (e.code === 'KeyB') {
        syncSubMode(!subMode);
        toast(subMode ? 'Режим батискафа: эхолот и приборы включены' : 'Режим свободного дайвера');
      }
      if (e.code === 'KeyG') { fireSonarPing(); }
      if (e.code === 'Backquote') {
        const next = !(OC.Hydrophone && OC.Hydrophone.isOpen && OC.Hydrophone.isOpen());
        syncHydroMode(next);
        toast(next ? 'Гидрофон активен: живая FFT-спектрограмма (0–4 кГц)' : 'Гидрофон свёрнут');
      }
      if (e.code === 'KeyV') {
        const next = OC.Navigation.getMode() === 'orbit' ? 'swim' : 'orbit';
        OC.Navigation.setMode(next);
        toast(next === 'orbit' ? 'Режим орбиты' : 'Свободное плавание');
      }
      if (e.code === 'KeyT') {
        const next = OC.Navigation.getMode() === 'tour' ? 'swim' : 'tour';
        OC.Navigation.setMode(next);
      }
      if (e.code === 'KeyR') { OC.Navigation.resetToSpawn(); toast('Возврат к старту: ' + (activeBiome ? activeBiome.name : 'океан')); }
      if (e.code === 'KeyK') { OC.Atlas.toggle(); }
      if (e.code === 'KeyO' && OC.Globe) {
        OC.Globe.toggle();
        if (OC.sound && OC.sound.globeWhoosh) OC.sound.globeWhoosh();
      }
      if (e.code === 'KeyL') { toggleLab(false); }
      if (e.code === 'KeyY') { toggleRovChase(); }
      if (e.code === 'KeyZ') { triggerSampleGrab(); }
      if (e.code === 'KeyI') {
        const opened = toggleRovPanel(false);
        if (opened) triggerCtdCast();
      }
      if (e.code === 'ArrowRight' && OC.Navigation.getMode() === 'tour') { OC.Navigation.stepTour(1); }
      if (e.code === 'ArrowLeft' && OC.Navigation.getMode() === 'tour') { OC.Navigation.stepTour(-1); }
      if (e.code === 'KeyP') {
        const next = !(OC.Expedition && OC.Expedition.isPhotoMode());
        syncCamMode(next);
        toast(next ? 'Фотокамера: наведите и нажмите Enter' : 'Фотокамера закрыта');
      }
      if (e.code === 'KeyJ') { toggleJournal(false); }
      if (e.code === 'Enter' && OC.Expedition && OC.Expedition.isPhotoMode()) {
        e.preventDefault();
        triggerShutter();
      }
      if (e.code === 'BracketRight' && OC.Expedition && OC.Expedition.isPhotoMode()) {
        const fov = OC.Expedition.adjustZoom(-5);
        if (camFovLabel) camFovLabel.textContent = Math.round(fov) + '°';
      }
      if (e.code === 'BracketLeft' && OC.Expedition && OC.Expedition.isPhotoMode()) {
        const fov = OC.Expedition.adjustZoom(5);
        if (camFovLabel) camFovLabel.textContent = Math.round(fov) + '°';
      }
      if (e.code === 'KeyN') {
        const next = OC.Navigation.getMode() === 'cinema' ? 'swim' : 'cinema';
        OC.Navigation.setMode(next);
        toast(next === 'cinema' ? 'Кино-режим: автопролёт и фильтры (N / X)' : 'Свободное плавание');
      }
      if (e.code === 'KeyX' && OC.Expedition && OC.Expedition.cycleFilter) {
        const f = OC.Expedition.cycleFilter();
        syncFilterUI();
        toast('Цветофильтр: ' + f.label);
      }
      if (e.code === 'KeyH') {
        toggleHud();
      }
      // Быстрые горячие клавиши оптики: [ — пиксельный масштаб, ] — профиль качества
      if (e.code === 'BracketLeft' && OC.Quality && OC.Quality.getDynamicResolution) {
        const st = OC.Quality.getDynamicResolution();
        const nextEnable = !st.enabled;
        OC.Quality.setDynamicResolution(nextEnable);
        if (OC.applyPixelScale) OC.applyPixelScale(nextEnable ? OC.Quality.evaluateDynamicResolution(1, 0) : 1.0);
        updateResBadge();
        toast(nextEnable ? 'Динамическое разрешение включено' : 'Динамическое разрешение выключено (100%)');
      }
      if (e.code === 'BracketRight' && OC.Quality && OC.Quality.PRESETS) {
        const tiers = ['low', 'medium', 'high', 'ultra'];
        const idx = tiers.indexOf(OC.Quality.getId());
        const nextId = tiers[(idx + 1) % tiers.length];
        OC.Quality.set(nextId);
        if (OC.Expedition && OC.Expedition.saveQuality) OC.Expedition.saveQuality(nextId);
        updateResBadge();
        toast('Профиль оптики: ' + OC.Quality.PRESETS[nextId].label);
      }
      if (e.code === 'KeyU' && OC.Weather) {
        if (activeBiome && activeBiome.noSurface) {
          toast('Погода на поверхности недоступна в глубоководной зоне');
        } else {
          OC.Weather.cycleMode();
          if (uiHandles && uiHandles.syncWeatherButtons) uiHandles.syncWeatherButtons();
          toast('Погода: ' + OC.Weather.getLabel(activeBiome));
        }
      }
      if (e.code === 'Escape') {
        if (helpModal && !helpModal.classList.contains('hidden')) toggleHelp(true);
        else if (OC.Globe && OC.Globe.isOpen()) OC.Globe.close();
        else if (OC.Atlas.isOpen()) OC.Atlas.toggle();
        else if (journalModal && !journalModal.classList.contains('hidden')) toggleJournal(true);
        else if (labPanel && !labPanel.classList.contains('closed')) toggleLab(true);
        else if (rovPanel && !rovPanel.classList.contains('closed')) toggleRovPanel(true);
        else if (OC.Expedition && OC.Expedition.isPhotoMode()) syncCamMode(false);
        else if (OC.Navigation.getMode() === 'cinema') OC.Navigation.setMode('swim');
        else if (OC.Navigation.getMode() === 'tour') OC.Navigation.stopTour();
      }
      if (e.code === 'Digit9') {
        triggerDeployBuoy();
      }
      if (e.code === 'Slash' || e.code === 'F1') {
        e.preventDefault();
        toggleHelp(false);
      }
    });

    function toggleHelp(forceClose) {
      if (!helpModal) return;
      const shouldOpen = !forceClose && helpModal.classList.contains('hidden');
      helpModal.classList.toggle('hidden', !shouldOpen);
      if (btnHelp) btnHelp.classList.toggle('on', shouldOpen);
      if (shouldOpen && hero) hero.classList.add('fade');
    }
    if (btnHelp) btnHelp.addEventListener('click', () => toggleHelp(false));
    if (helpClose) helpClose.addEventListener('click', () => toggleHelp(true));
    if (helpModal) {
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) toggleHelp(true);
      });
      helpModal.querySelectorAll('[data-help-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.getAttribute('data-help-act');
          toggleHelp(true);
          if (act === 'reset') { OC.Navigation.resetToSpawn(); toast('Возврат к старту'); }
          else if (act === 'orbit') { OC.Navigation.setMode(OC.Navigation.getMode() === 'orbit' ? 'swim' : 'orbit'); }
          else if (act === 'sub') syncSubMode(!subMode);
          else if (act === 'flash') { const on = OC.toggleFlashlight(); syncFlash(on); }
          else if (act === 'sonar') fireSonarPing();
          else if (act === 'hydro') syncHydroMode(!(OC.Hydrophone && OC.Hydrophone.isOpen && OC.Hydrophone.isOpen()));
          else if (act === 'globe' && OC.Globe) OC.Globe.toggle();
          else if (act === 'weather' && OC.Weather && !(activeBiome && activeBiome.noSurface)) {
            OC.Weather.cycleMode(); syncWeatherButtons(); toast('Погода: ' + OC.Weather.getLabel(activeBiome));
          }
          else if (act === 'sample') triggerSampleGrab();
          else if (act === 'rov') { if (toggleRovPanel(false)) triggerCtdCast(); }
          else if (act === 'lab') toggleLab(false);
          else if (act === 'journal') toggleJournal(false);
          else if (act === 'tour') OC.Navigation.setMode(OC.Navigation.getMode() === 'tour' ? 'swim' : 'tour');
          else if (act === 'atlas') OC.Atlas.toggle();
          else if (act === 'cam') syncCamMode(!(OC.Expedition && OC.Expedition.isPhotoMode()));
          else if (act === 'sound') {
            const on = OC.sound.toggle();
            if (btnSound) btnSound.classList.toggle('on', on);
          }
        });
      });
    }

    function dismissHero(persist) {
      if (hero) hero.classList.add('fade');
      if (persist) {
        try { localStorage.setItem('oc_onboard_seen_v1', '1'); } catch (e) {}
      }
    }
    if (hero) {
      let seenBefore = false;
      try { seenBefore = localStorage.getItem('oc_onboard_seen_v1') === '1'; } catch (e) {}
      if (seenBefore) hero.classList.add('fade');
      else setTimeout(() => dismissHero(true), 18000);
    }
    if (heroTourBtn) {
      heroTourBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissHero(true);
        OC.Navigation.setMode('tour');
      });
    }
    if (heroHelpBtn) {
      heroHelpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissHero(true);
        toggleHelp(false);
      });
    }
    if (heroDismiss) {
      heroDismiss.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissHero(true);
      });
    }

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
    if (mapCovEl && OC.Minimap.getCoverage) mapCovEl.textContent = OC.Minimap.getCoverage() + '%';
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
    let time = 0, fpsAcc = 0, fpsFrames = 0, hudTimer = 0, wasInBrine = false, lastBrineToastAt = -100, wasInHalocline = false, lastHaloToastAt = -100, lastTetherWarnAt = -100;

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
        if (OC.Hydrophone && OC.Hydrophone.isOpen && OC.Hydrophone.isOpen()) {
          const hs = OC.Hydrophone.getState();
          if (hydroDb) hydroDb.textContent = hs.dbSPL.toFixed(1) + ' dB';
          if (hydroSource) hydroSource.textContent = hs.dominantLabel;
          if (hydroBand) hydroBand.textContent = hs.bandLabel;
          if (hydroBearingEl) {
            if (hs.targetPos) {
              const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
              const dName = dirs[Math.round(hs.bearingDeg / 45) % 8];
              const relSign = hs.relBearingDeg >= 0 ? ('+' + hs.relBearingDeg) : String(hs.relBearingDeg);
              hydroBearingEl.textContent = String(hs.bearingDeg).padStart(3, '0') + '° (' + dName + ') · курс ' + relSign + '°';
            } else {
              hydroBearingEl.textContent = 'Всенаправленный фон';
            }
          }
          if (hydroTrackBtn) hydroTrackBtn.disabled = !hs.targetPos;
        }
        const biome = activeBiome;
        const zone = biome.getZoneAt(craftPos.x, craftPos.y, craftPos.z);
        const depthOffset = biome.depthOffset || 0;
        const depthM = depthOffset + (depthOffset > 0 ? -craftPos.y : Math.max(0, -craftPos.y));
        const rawTemp = biome.getTemperatureAt
          ? biome.getTemperatureAt(craftPos.x, depthM, zone)
          : (depthOffset > 0 ? zone.tempC : (zone.tempC - Math.max(0, depthM - 15) * 0.065));
        const labState = OC.EcoLab ? OC.EcoLab.getState() : null;
        const adjTemp = labState ? Math.max(-1.9, rawTemp + labState.tempDelta) : rawTemp;
        const tempC = adjTemp.toFixed(1);
        const pal = OC.getPalette();
        const dayW = pal && typeof pal.dayW === 'number' ? pal.dayW : 1.0;
        const curr = OC.Navigation.getCurrent ? OC.Navigation.getCurrent() : null;
        const cKnots = curr ? curr.length() * 1.94384 : 0;

        if (teleZone) teleZone.textContent = zone.shortName;
        if (teleDepth) teleDepth.textContent = (!biome.noSurface && craftPos.y > 0.1) ? ('+' + craftPos.y.toFixed(1) + ' м над водой') : (depthM.toFixed(1) + ' м');
        if (teleTemp) teleTemp.textContent = tempC + ' °C';
        if (teleHeading) teleHeading.textContent = formatHeading(OC.Navigation.getYaw());
        if (teleWeatherWrap && teleWeatherSep && teleWeather && OC.Weather) {
          if (biome.noSurface) {
            teleWeatherSep.classList.add('tele-wp-hide');
            teleWeatherWrap.classList.add('tele-wp-hide');
          } else {
            teleWeatherSep.classList.remove('tele-wp-hide');
            teleWeatherWrap.classList.remove('tele-wp-hide');
            teleWeather.textContent = OC.Weather.getLabel(biome);
          }
        }

        // Навигационный маячок в телеметрии + авто-прибытие
        if (OC.Expedition) {
          const wp = OC.Expedition.getWaypoint(biome.id);
          if (wp) {
            const wpDx = wp.x - craftPos.x;
            const wpDz = wp.z - craftPos.z;
            const wpDist = Math.hypot(wpDx, wpDz);
            if (wpDist < 24) {
              OC.Expedition.clearWaypoint(biome.id);
              toast('Вы прибыли к маячку: ' + wp.label);
              if (teleWpSep) teleWpSep.classList.add('tele-wp-hide');
              if (teleWpWrap) teleWpWrap.classList.add('tele-wp-hide');
            } else {
              const deg = ((Math.round(Math.atan2(wpDx, -wpDz) * 180 / Math.PI) % 360) + 360) % 360;
              const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
              const dStr = dirs[Math.round(deg / 45) % 8];
              if (teleWpSep) teleWpSep.classList.remove('tele-wp-hide');
              if (teleWpWrap) teleWpWrap.classList.remove('tele-wp-hide');
              if (teleWp) teleWp.textContent = Math.round(wpDist) + ' м · ' + dStr;
            }
          } else {
            if (teleWpSep) teleWpSep.classList.add('tele-wp-hide');
            if (teleWpWrap) teleWpWrap.classList.add('tele-wp-hide');
          }

          // Обновление видоискателя фотокамеры и оценка научных миссий
          if (OC.Expedition.isPhotoMode() && camTargetEl) {
            const tgt = detectCenterTarget(camera, biome, activeFauna);
            camTargetEl.textContent = tgt
              ? ('В фокусе: ' + tgt.label + ' (' + tgt.dist.toFixed(0) + ' м)')
              : 'Наведите центр рамки на вид или коралл';
          }

          lastEvalCtx = { zoneId: zone.id, depthM, currentKnots: cKnots, dayW, flashOn };
          const mRes = OC.Expedition.evaluateMissions(biome, lastEvalCtx);
          if (mRes.newlyCompleted.length) {
            if (OC.sound && OC.sound.missionChime) OC.sound.missionChime();
            toast('Миссия выполнена: ' + mRes.newlyCompleted[0].title + '!');
            if (journalModal && !journalModal.classList.contains('hidden')) renderJournal();
          }
        }

        OC.sound.update(depthM, zone.id, dayW, biome.id, wState.stormMix || 0);
        OC.Minimap.update(craftPos, OC.Navigation.getYaw());
        if (mapCovEl && OC.Minimap.getCoverage) mapCovEl.textContent = OC.Minimap.getCoverage() + '%';

        const ecoEv = OC.faunaInfo ? OC.faunaInfo.activeEvent : null;
        if (ecoEv && (ecoEv !== lastEcoEvent || OC.uTime.value - lastEcoEventAt > 20) && OC.uTime.value > 5) {
          lastEcoEvent = ecoEv;
          lastEcoEventAt = OC.uTime.value;
          if (ECO_LABELS[ecoEv]) toast(ECO_LABELS[ecoEv]);
        } else if (!ecoEv) {
          lastEcoEvent = null;
        }

        const inBrineNow = !!(OC.Navigation.isInBrine && OC.Navigation.isInBrine());
        if (inBrineNow && !wasInBrine && time - lastBrineToastAt > 8) {
          lastBrineToastAt = time;
          toast('Галоклин рассола (230‰): архимедова плавучесть выталкивает батискаф!');
        }
        wasInBrine = inBrineNow;

        const inHaloNow = !!(OC.Navigation.isInHalocline && OC.Navigation.isInHalocline());
        if (inHaloNow && !wasInHalocline && time - lastHaloToastAt > 8) {
          lastHaloToastAt = time;
          toast('Галоклин Анхелиты (0‰ / 35‰): пресная вода переходит в облако H₂S!');
        }
        wasInHalocline = inHaloNow;

        if (subMode) {
          const flHere = biome.getHeight(craftPos.x, craftPos.z);
          const clearance = Math.max(0, craftPos.y - flHere);
          const atm = (1 + depthM / 10.08).toFixed(2);
          const knots = (camSpeed * 1.94384).toFixed(1);
          const pitchDeg = OC.Navigation.getPitch() * 180 / Math.PI;
          if (subHorizon) subHorizon.style.transform = 'translateY(' + OC.clamp(-pitchDeg * 1.1, -36, 36).toFixed(1) + 'px)';
          if (subPressure) subPressure.textContent = atm + ' атм';
          if (subClearance) {
            subClearance.textContent = clearance.toFixed(1) + ' м';
            subClearance.classList.toggle('warn', clearance < 3.5);
          }
          if (subSpeedEl) subSpeedEl.textContent = knots + ' уз';
          if (subCurrentEl) {
            subCurrentEl.textContent = cKnots.toFixed(1) + ' уз';
            subCurrentEl.classList.toggle('warn', cKnots > 1.8);
          }
          if (subPhaseEl) {
            const inCaveCeiling = !!(biome.getCeilingHeight && biome.getCeilingHeight(craftPos.x, craftPos.z) < 25.0);
            const fInfo = OC.faunaInfo || {};
            let phaseLabel = dayW < 0.35 ? 'Ночь · Био + DVM' : (dayW < 0.7 ? 'Сумерки' : 'День');
            if (fInfo.siltTurbidity && fInfo.siltTurbidity > 0.35) phaseLabel = 'Взвесь грунта · Silt-out';
            else if (inBrineNow) phaseLabel = 'Галоклин · Рассол 230‰';
            else if (inHaloNow) phaseLabel = 'Галоклин сенота · Облако H₂S';
            else if (fInfo.thermoclineActive) phaseLabel = 'Термоклин · Оптическая дымка';
            else if (inCaveCeiling) phaseLabel = 'Карстовая пещера · Свод';
            else if (biome.noSurface) {
              phaseLabel = biome.id === 'mariana_trench' ? 'Гадальная зона · 10 920 м'
                : (biome.id === 'brine_pool' ? 'Сумеречная толща · 650 м' : 'Абиссаль · 2500 м');
            } else if (fInfo.coralSpawnIntensity > 0.35) phaseLabel = 'Ночь · Нерест кораллов';
            else if (fInfo.dvmPhase === 'dusk_ascent') phaseLabel = 'Сумерки · Миграция DVM';
            else if (biome.hasAurora) {
              phaseLabel = dayW < 0.42 ? 'Полярная ночь · Сияние' : (dayW < 0.72 ? 'Полярные сумерки' : 'Полярный день');
            }
            subPhaseEl.textContent = phaseLabel;
          }
          drawEchosounder(craftPos, OC.Navigation.getYaw(), biome, activeFauna, time);
        }

        if (OC.ROV && OC.ROV.getTetherState) {
          const tSt = OC.ROV.getTetherState();
          if (tSt.active && tSt.tensionPct >= 88 && time - lastTetherWarnAt > 10) {
            lastTetherWarnAt = time;
            toast('Натяжение кабель-троса ' + tSt.tensionPct + '% (' + tSt.lengthM + '/' + tSt.maxLengthM + ' м) — вернитесь ближе к ' + tSt.anchorLabel + '!');
          }
          if (rovPanel && !rovPanel.classList.contains('closed') && rovTetherLabel) {
            if (tSt.active) {
              rovTetherLabel.textContent = 'Кабель (' + tSt.anchorLabel + '): ' + tSt.lengthM + ' / ' + tSt.maxLengthM + ' м · ' + tSt.tensionPct + '% (' + tSt.status + ')';
              rovTetherLabel.classList.toggle('warn', tSt.tensionPct >= 62 && tSt.tensionPct < 88);
              rovTetherLabel.classList.toggle('crit', tSt.tensionPct >= 88);
            } else {
              rovTetherLabel.textContent = 'Кабель-трос: свёрнут (вкл. Y)';
              rovTetherLabel.classList.remove('warn', 'crit');
            }
          }
        }

        if (OC.ROV && rovPanel && !rovPanel.classList.contains('closed')) {
          OC.Navigation.getForward(_fwd);
          OC.ROV.scanTarget(biome, craftPos, _fwd, _rovScanOut);
          if (rovTargetLabel) {
            const distPart = _rovScanOut.dist > 0 ? (' (' + _rovScanOut.dist.toFixed(1) + ' м)') : '';
            rovTargetLabel.textContent = 'Захват: ' + _rovScanOut.label + distPart;
          }
          if (rovFlowLabel) {
            rovFlowLabel.textContent = 'Вектор течения: ' + cKnots.toFixed(2) + ' уз · Глубина ' + depthM.toFixed(1) + ' м';
          }
          if (rovCtdChart) OC.ROV.drawCtdChart(rovCtdChart, depthM);
        }

        const t = OC.getTimeOfDay();
        optHud.syncClock(t, autoCycle);

        const tStats = OC.Terrain.getStats();
        const fStats = OC.FloraStreamer.getStats();
        if (statChunks) statChunks.textContent = tStats.visible + ' / ' + tStats.total;
        if (statCorals) statCorals.textContent = fStats.activeInstances;
        if (statFish && OC.faunaInfo) statFish.textContent = OC.faunaInfo.schoolFish;
        if (statBig && OC.faunaInfo) statBig.textContent = OC.faunaInfo.big;

        if (guideProgBar && OC.Navigation.getMode() === 'tour') {
          const tSt = OC.Navigation.getTourState();
          if (tSt && tSt.active) guideProgBar.style.width = `${(tSt.progress * 100).toFixed(1)}%`;
        }

        if (labState) {
          if (labPanel && !labPanel.classList.contains('closed') && uiHandles && uiHandles.updateLabDisplay) {
            uiHandles.updateLabDisplay();
          }
          if (labState.statusTone !== lastLabTone) {
            if (labState.statusTone === 'crit') {
              toast('Внимание: ' + labState.statusLabel + '!');
            } else if (lastLabTone === 'crit' && labState.statusTone === 'warn') {
              toast('Экосистема начинает восстановление');
            }
            lastLabTone = labState.statusTone;
          }
        }
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

      if (popup && !popup.classList.contains('hidden') && now - pickedTime > 9500) {
        popup.classList.add('hidden');
      }

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
