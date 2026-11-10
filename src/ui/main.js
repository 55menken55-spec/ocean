/* ================= ГЛАВНЫЙ ЦИКЛ, HUD И КООРДИНАЦИЯ МОДУЛЕЙ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const canvas = document.getElementById('scene');
  const hero = document.querySelector('.hero');
  const hudEls = document.querySelectorAll('.hud-hideable');
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
  const btnAuto = document.getElementById('btn-auto');
  const timeSlider = document.getElementById('time-slider');
  const timeLabel = document.getElementById('time-label');
  const zoneChipsEl = document.getElementById('zone-chips');
  const qualityBtnsEl = document.getElementById('quality-btns');
  const biomeBarEl = document.getElementById('biome-bar');
  const biomeBtnsEl = document.getElementById('biome-btns');
  const brandTitleEl = document.getElementById('brand-title');
  const brandSubEl = document.getElementById('brand-sub');
  const statusRegionEl = document.getElementById('status-region');

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
  const weatherBtnsEl = document.getElementById('weather-btns');
  const weatherGroupEl = document.getElementById('weather-group');
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
  const rovTargetLabel = document.getElementById('rov-target-label');
  const rovFlowLabel = document.getElementById('rov-flow-label');
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
  let pickedTime = 0;
  let activeBiome = null;
  let activeFauna = null;
  let uiHandles = null;
  let pendingPhotoCapture = false;
  let previewHideTimer = 0;
  let journalTab = 'missions';
  let lastEvalCtx = { zoneId: '', depthM: 0, currentKnots: 0, dayW: 1.0, flashOn: false };
  let sonarPingState = { t: -10, range: 140, kind: 'none', label: 'Сканер · Чисто', hit: false };
  let lensDirty = false;
  let lastEcoEvent = null;
  let lastEcoEventAt = -100;
  const ECO_LABELS = {
    breach: 'Наблюдение: горбатый кит выпрыгивает из воды!',
    hunt: 'Наблюдение: хищник атакует косяк!',
    baitball: 'Наблюдение: стая сжалась в защитный шар (baitball)!',
    cleaning: 'Наблюдение: симбиоз — чистильщики обслуживают гиганта',
    porpoising: 'Наблюдение: морские млекопитающие выпрыгивают у поверхности',
    coral_spawn: 'Ночное явление: массовый нерест кораллов — гаметы поднимаются к поверхности!',
    dvm: 'Суточная вертикальная миграция (DVM): глубоководный планктон поднимается наверх!',
    silt_out: 'Донная муть (Silt-out): движители подняли облако осадка со дна!'
  };
  const _fwd = new T.Vector3();
  const _zeroNdc = new T.Vector2(0, 0);

  // Капли воды на стекле маски при выныривании или шторме (fixed pool, без GC)
  const LENS_DROPS = (() => {
    const rng = OC.mulberry32(4242);
    const arr = [];
    for (let i = 0; i < 34; i++) {
      arr.push({
        x: rng(),
        y: rng(),
        r: OC.lerp(4.5, 13.5, rng()),
        vy: OC.lerp(0.014, 0.048, rng()),
        drift: OC.lerp(-0.005, 0.005, rng())
      });
    }
    return arr;
  })();

  function updateLensDroplets(dt, camPos, wState, biome) {
    if (!lensCanvas) return;
    const ctx = lensCanvas.getContext('2d');
    if (!ctx) return;
    const strength = (biome && biome.noSurface) ? 0 : (wState ? wState.droplets : 0);
    if (strength <= 0.02 || camPos.y < -0.1) {
      if (lensDirty) {
        ctx.clearRect(0, 0, lensCanvas.width, lensCanvas.height);
        lensDirty = false;
      }
      return;
    }
    lensDirty = true;
    const w = lensCanvas.width, h = lensCanvas.height;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < LENS_DROPS.length; i++) {
      const d = LENS_DROPS[i];
      d.y += d.vy * dt * (0.65 + strength * 0.9);
      d.x += d.drift * dt;
      if (d.y > 1.05) { d.y = -0.05; d.x = ((d.x + 0.37) % 1 + 1) % 1; }
      const cx = d.x * w;
      const cy = d.y * h;
      const rr = d.r * (0.8 + strength * 0.35);
      const a = Math.min(0.45, strength * 0.42);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(205, 240, 255, ' + (a * 0.28).toFixed(3) + ')';
      ctx.fill();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = 'rgba(235, 250, 255, ' + (a * 0.65).toFixed(3) + ')';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - rr * 0.3, cy - rr * 0.3, Math.max(1.2, rr * 0.26), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (a * 0.9).toFixed(3) + ')';
      ctx.fill();
    }
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
    // 0 yaw смотрит на +Z (Юг), PI на -Z (Север)
    const deg = ((Math.round((180 - yawRad * 180 / Math.PI)) % 360) + 360) % 360;
    const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const dName = dirs[Math.round(deg / 45) % 8];
    return dName + ' ' + String(deg).padStart(3, '0') + '°';
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
    if (!journalGrid || !activeBiome || !OC.Expedition) return;
    const res = OC.Expedition.evaluateMissions(activeBiome, lastEvalCtx);
    const sum = OC.Expedition.getAllSummary();
    if (journalTitle) journalTitle.textContent = 'Экспедиция · ' + activeBiome.name;
    if (journalSummary) {
      journalSummary.textContent = 'Миссий: ' + sum.missionsDone + ' / ' + sum.missionsTotal +
        ' · Снимков: ' + sum.photosCount +
        ' · Проб в музее: ' + (sum.samplesCount || 0);
    }

    journalGrid.innerHTML = '';
    if (journalTab === 'missions') {
      for (const m of res.list) {
        const card = document.createElement('div');
        card.className = 'mission-card' + (m.done ? ' done' : '');
        const pct = Math.round((m.cur / Math.max(1, m.goal)) * 100);
        const badge = m.done ? '<span class="atlas-badge ok">Выполнено ✓</span>' : '<span class="atlas-badge">' + m.cur + ' / ' + m.goal + '</span>';
        card.innerHTML =
          '<div class="atlas-top"><span>Научная задача</span>' + badge + '</div>' +
          '<div class="atlas-name">' + m.title + '</div>' +
          '<div class="atlas-desc">' + m.desc + '</div>' +
          '<div class="mission-prog"><i style="width:' + pct + '%"></i></div>' +
          '<div class="atlas-foot"><span>' + (m.done ? 'Задание засчитано' : 'В процессе') + '</span><button class="atlas-go">Поставить маяк →</button></div>';
        const btn = card.querySelector('.atlas-go');
        btn.addEventListener('click', () => {
          const lm = activeBiome.landmarks.find((l) => l.id === m.landmarkId) || activeBiome.landmarks[0];
          if (lm) {
            OC.Expedition.setWaypoint(activeBiome.id, lm.x, lm.z, lm.name);
            toast('Маяк поставлен: ' + lm.name);
            if (journalModal) journalModal.classList.add('hidden');
          }
        });
        journalGrid.appendChild(card);
      }
    } else if (journalTab === 'museum') {
      const samplesList = OC.Expedition.getSamples ? OC.Expedition.getSamples() : [];
      if (!samplesList.length) {
        journalGrid.innerHTML = '<div style="grid-column:1/-1;color:var(--dim);font-size:13px;padding:18px 0">Музей экспедиционных проб пока пуст. Откройте панель ROV (<b>I</b>), наведите манипулятор на коралл, курильщик, гидрат, сталактит или вулканический базальт и нажмите <b>Z</b>!</div>';
        return;
      }
      for (const s of samplesList) {
        const card = document.createElement('div');
        card.className = 'mission-card';
        const colCss = '#' + (s.colorHex || 0x58e0ff).toString(16).padStart(6, '0');
        const hasEnc = !!(activeBiome && activeBiome.encyclopedia && s.species && activeBiome.encyclopedia[s.species] && s.biomeId === activeBiome.id);
        card.innerHTML =
          '<div class="atlas-top"><span style="display:inline-flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:50%;display:inline-block;background:' + colCss + ';box-shadow:0 0 8px ' + colCss + '"></i>' + s.category + ' · ' + s.biomeName + '</span><span class="atlas-badge ok">' + s.depthM + ' м</span></div>' +
          '<div class="atlas-name">' + s.title + '</div>' +
          '<div class="atlas-latin">' + (s.latin || s.chemNote) + '</div>' +
          '<div class="atlas-desc">' + s.chemNote + ' · T=' + s.tempC + '°C · ' + s.pH + ' pH · O₂ ' + s.o2 + ' мг/л' + (s.bleachPct > 0 ? (' · обесцв. ' + s.bleachPct + '%') : '') + '</div>' +
          '<div class="atlas-foot"><span>' + new Date(s.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span>' +
          (hasEnc ? '<button class="atlas-go">3D-Атлас →</button>' : '<button class="atlas-go">В биом →</button>') + '</div>';
        const btn = card.querySelector('.atlas-go');
        btn.addEventListener('click', () => {
          if (journalModal) journalModal.classList.add('hidden');
          if (s.biomeId !== activeBiome.id) {
            switchBiome(s.biomeId);
            return;
          }
          if (hasEnc && OC.Atlas && OC.Atlas.selectSpecies) {
            if (!OC.Atlas.isOpen()) OC.Atlas.toggle();
            OC.Atlas.selectSpecies(s.species, false);
          }
        });
        journalGrid.appendChild(card);
      }
    } else {
      const photos = OC.Expedition.getPhotos();
      if (!photos.length) {
        journalGrid.innerHTML = '<div style="grid-column:1/-1;color:var(--dim);font-size:13px;padding:18px 0">Пока нет подводных снимков. Нажмите <b>P</b> (или значок камеры), наведите видоискатель на обитателя или коралл и нажмите <b>Enter</b>!</div>';
        return;
      }
      for (const ph of photos) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        const dlUrl = OC.Expedition.getPhotoDownloadUrl(ph.id);
        card.innerHTML =
          (ph.dataUrl ? '<img src="' + ph.dataUrl + '" alt="' + ph.title + '">' : '') +
          '<div class="atlas-top"><span>' + ph.biomeName + ' · ' + ph.depthM + ' м</span><span class="atlas-badge ok">' + ph.score + '/100</span></div>' +
          '<div class="atlas-name">' + ph.title + '</div>' +
          '<div class="atlas-latin">' + ph.latin + (ph.dist ? (' · ' + ph.dist + ' м') : '') + '</div>' +
          '<div class="atlas-foot"><span>' + new Date(ph.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span>' +
          (dlUrl ? '<a class="atlas-go" style="text-decoration:none" href="' + dlUrl + '" download="' + ph.key + '.png">Скачать PNG</a>' : '') + '</div>';
        journalGrid.appendChild(card);
      }
    }
  }

  function showInfo(key, cx, cy, biome) {
    const info = biome.encyclopedia[key] || biome.encyclopedia.floor;
    if (!info) return;
    const isNew = OC.Atlas.discover(key);
    popup.innerHTML =
      '<div class="popup-head"><span>' + info[2] + ' · ' + info[4] + '</span>' +
      (isNew ? '<span class="popup-new">Открыто в Атласе!</span>' : '') + '</div>' +
      '<div class="popup-title">' + info[0] + '</div>' +
      '<div class="popup-latin">' + info[1] + '</div>' +
      '<div class="popup-desc">' + info[5] + '</div>';
    popup.classList.remove('hidden');
    const x = Math.min(cx, window.innerWidth - 305);
    const y = Math.min(cy, window.innerHeight - 210);
    popup.style.left = Math.max(12, x + 14) + 'px';
    popup.style.top = Math.max(12, y + 10) + 'px';
    pickedTime = performance.now();
  }

  function showRovPopup(cx, cy) {
    if (!popup) return;
    const cnt = OC.ROV ? OC.ROV.getSamples().length : 0;
    popup.innerHTML =
      '<div class="popup-head"><span>Аппарат · Проб: ' + cnt + '</span><span class="popup-new">ROV «Наутилус-IV»</span></div>' +
      '<div class="popup-title">Исследовательский ROV</div>' +
      '<div class="popup-latin">Глубоководный аппарат до 4000 м</div>' +
      '<div class="popup-desc">Оснащён 3-звенным манипулятором (Z), вертикальным CTD-зондом (I), 4K-камерой, двойными прожекторами (F) и трассерами течений.</div>';
    popup.classList.remove('hidden');
    const x = Math.min(cx, window.innerWidth - 305);
    const y = Math.min(cy, window.innerHeight - 210);
    popup.style.left = Math.max(12, x + 14) + 'px';
    popup.style.top = Math.max(12, y + 10) + 'px';
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
    if (!sonarCanvas || !subMode) return;
    const ctx = sonarCanvas.getContext('2d');
    if (!ctx) return;
    const w = sonarCanvas.width, h = sonarCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Сетка глубин и дистанции (0..140 м вперёд)
    ctx.fillStyle = 'rgba(2,14,26,0.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(88,224,255,0.12)';
    ctx.lineWidth = 1;
    for (let gx = 49; gx < w; gx += 49) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    for (let gy = 25; gy < h; gy += 25) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const maxRange = 140;
    const steps = 28;
    const maxDepthVis = Math.max(45, Math.min(180, -camPos.y + 42));
    const yToPx = (yVal) => {
      const depth = Math.max(0, -yVal);
      return 6 + (depth / maxDepthVis) * (h - 12);
    };

    // Линия поверхности воды
    ctx.strokeStyle = 'rgba(130,225,255,0.32)';
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(w, 6); ctx.stroke();

    // Профиль рельефа по курсу
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * maxRange;
      const sx = camPos.x + fwdX * dist;
      const sz = camPos.z + fwdZ * dist;
      const fl = biome.getHeight(sx, sz);
      const px = (i / steps) * w;
      const py = Math.min(h - 2, Math.max(6, yToPx(fl)));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(30, 125, 165, 0.34)';
    ctx.fill();

    ctx.strokeStyle = '#58e0ff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * maxRange;
      const fl = biome.getHeight(camPos.x + fwdX * dist, camPos.z + fwdZ * dist);
      const px = (i / steps) * w;
      const py = Math.min(h - 2, Math.max(6, yToPx(fl)));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Позиция батискафа и луч вперёд
    const subPy = Math.min(h - 6, Math.max(6, yToPx(camPos.y)));
    ctx.strokeStyle = 'rgba(91, 232, 176, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(8, subPy); ctx.lineTo(w - 6, subPy); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#5be8b0';
    ctx.beginPath(); ctx.arc(8, subPy, 3.5, 0, Math.PI * 2); ctx.fill();

    // Импульс сонара, если недавно запущен
    const pingAge = time - sonarPingState.t;
    if (pingAge >= 0 && pingAge < 2.6) {
      const waveX = Math.min(w, (pingAge / 1.1) * w);
      ctx.strokeStyle = 'rgba(130, 250, 255, ' + (1 - pingAge / 2.6).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(waveX, 0); ctx.lineTo(waveX, h); ctx.stroke();

      if (sonarPingState.hit) {
        const tx = Math.min(w - 6, Math.max(12, (sonarPingState.range / maxRange) * w));
        ctx.fillStyle = sonarPingState.kind === 'fauna' ? '#ffb574' : '#5be8b0';
        ctx.beginPath(); ctx.arc(tx, subPy, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
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

    const syncLabControls = () => {
      if (!OC.EcoLab) return;
      const c = OC.EcoLab.getControls();
      if (labSTemp) labSTemp.value = c.tempDelta.toFixed(1);
      if (labVTemp) labVTemp.textContent = (c.tempDelta >= 0 ? '+' : '') + c.tempDelta.toFixed(1) + ' °C';
      if (labSPh) labSPh.value = c.pH.toFixed(2);
      if (labVPh) labVPh.textContent = c.pH.toFixed(2) + ' pH';
      if (labSNutr) labSNutr.value = Math.round(c.nutrients * 100);
      if (labVNutr) labVNutr.textContent = Math.round(c.nutrients * 100) + '%';
      if (labSCurr) labSCurr.value = c.currentMult.toFixed(2);
      if (labVCurr) labVCurr.textContent = c.currentMult.toFixed(2).replace(/0$/, '') + '×';
      if (labPresetsEl) {
        labPresetsEl.querySelectorAll('button[data-preset]').forEach((b) => {
          b.classList.toggle('on', b.getAttribute('data-preset') === c.presetId);
        });
      }
      if (labSpeedEl) {
        labSpeedEl.querySelectorAll('button[data-ts]').forEach((b) => {
          b.classList.toggle('on', Number(b.getAttribute('data-ts')) === c.timeScale);
        });
      }
    };

    const updateLabDisplay = () => {
      if (!OC.EcoLab) return;
      const st = OC.EcoLab.getState();
      const hi = Math.round(st.healthIndex);
      if (labHealthNum) {
        labHealthNum.className = 'lab-health' + (st.statusTone !== 'ok' ? (' ' + st.statusTone) : '');
        labHealthNum.innerHTML = `${hi}<span style="font-size:12px;color:var(--dim);font-weight:500"> / 100</span>`;
      }
      if (labStatus) {
        const note = st.bleaching > 0.35
          ? 'Кораллы теряют зооксантеллы'
          : (st.dissolvedO2 < 4.5 ? 'Дефицит растворённого O₂' : (activeBiome ? activeBiome.name : 'Модель среды'));
        labStatus.innerHTML = `${st.statusLabel}<small id="lab-biome-note">${note}</small>`;
      }
      if (labMBleach) labMBleach.textContent = Math.round(st.bleaching * 100) + '%';
      if (labMO2) labMO2.textContent = st.dissolvedO2.toFixed(1) + ' мг/л';
      if (labMCalc) labMCalc.textContent = Math.round(st.calcification) + '%';
      if (labMFish) labMFish.textContent = Math.round(st.fishActivity * 100) + '%';
      if (labChart) OC.EcoLab.drawChart(labChart);
    };

    const toggleLab = (forceClose) => {
      if (!labPanel) return;
      const opening = forceClose ? false : labPanel.classList.contains('closed');
      labPanel.classList.toggle('closed', !opening);
      if (btnLab) btnLab.classList.toggle('on', opening);
      if (opening) {
        if (panel) panel.classList.add('closed');
        if (btnPanel) btnPanel.classList.remove('open');
        if (rovPanel) rovPanel.classList.add('closed');
        if (btnRov) btnRov.classList.toggle('on', !!(OC.Navigation.isRovView && OC.Navigation.isRovView()));
        syncLabControls();
        updateLabDisplay();
      }
    };

    if (btnLab) {
      btnLab.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLab(false);
      });
    }
    const labCloseBtn = document.getElementById('lab-close');
    if (labCloseBtn) labCloseBtn.addEventListener('click', () => toggleLab(true));
    const labResetBtn = document.getElementById('lab-reset');
    if (labResetBtn) {
      labResetBtn.addEventListener('click', () => {
        if (!OC.EcoLab) return;
        OC.EcoLab.reset();
        syncLabControls();
        updateLabDisplay();
        toast('Параметры эколаборатории сброшены к норме');
      });
    }
    if (labPresetsEl && OC.EcoLab) {
      labPresetsEl.innerHTML = '';
      for (const pr of OC.EcoLab.getPresets()) {
        const b = document.createElement('button');
        b.className = 'btn chip';
        b.setAttribute('data-preset', pr.id);
        b.textContent = pr.label;
        b.addEventListener('click', () => {
          OC.EcoLab.applyPreset(pr.id);
          syncLabControls();
          updateLabDisplay();
          toast('Сценарий: ' + pr.label);
        });
        labPresetsEl.appendChild(b);
      }
    }
    if (labSpeedEl && OC.EcoLab) {
      labSpeedEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-ts]');
        if (!btn) return;
        OC.EcoLab.setParam('timeScale', Number(btn.getAttribute('data-ts')));
        syncLabControls();
      });
    }
    const bindLabSlider = (el, key, scale) => {
      if (!el || !OC.EcoLab) return;
      el.addEventListener('input', () => {
        OC.EcoLab.setParam(key, parseFloat(el.value) / (scale || 1));
        syncLabControls();
        updateLabDisplay();
      });
    };
    bindLabSlider(labSTemp, 'tempDelta', 1);
    bindLabSlider(labSPh, 'pH', 1);
    bindLabSlider(labSNutr, 'nutrients', 100);
    bindLabSlider(labSCurr, 'currentMult', 1);
    syncLabControls();

    const syncRovButtons = () => {
      const chaseOn = !!(OC.Navigation.isRovView && OC.Navigation.isRovView());
      const currOn = !!(OC.ROV && OC.ROV.isCurrentsVisible && OC.ROV.isCurrentsVisible());
      const panelOpen = !!(rovPanel && !rovPanel.classList.contains('closed'));
      const vInfo = OC.faunaInfo ? OC.faunaInfo.vessel : null;
      if (btnRov) btnRov.classList.toggle('on', panelOpen || chaseOn || currOn);
      if (rovBtnChase) rovBtnChase.classList.toggle('on', chaseOn);
      if (rovBtnCurrents) rovBtnCurrents.classList.toggle('on', currOn);
      if (rovBtnVessel) {
        rovBtnVessel.disabled = !vInfo;
        rovBtnVessel.title = vInfo
          ? ('Всплыть к судну ' + vInfo.name)
          : 'Надводное судно недоступно в глубоководной зоне';
      }
    };

    const updateRovCtdDisplay = (castOverride) => {
      if (!OC.ROV) return;
      const cast = castOverride || OC.ROV.getLastCtdCast();
      if (!cast) return;
      if (rovCtdThermo) rovCtdThermo.textContent = cast.thermoclineM > cast.minDepthM + 3 ? (cast.thermoclineM + ' м') : 'Однородно';
      if (rovCtdTemps) rovCtdTemps.textContent = cast.bottomTemp.toFixed(1) + ' / ' + cast.surfaceTemp.toFixed(1) + ' °C';
      if (rovCtdO2) rovCtdO2.textContent = cast.minO2.toFixed(1) + ' мг/л';
      if (rovCtdPress) rovCtdPress.textContent = cast.maxPressureAtm.toFixed(1) + ' атм';
      if (rovCtdChart && activeBiome) {
        const craft = OC.Navigation.getPosition();
        const off = activeBiome.depthOffset || 0;
        const dNow = off + (off > 0 ? -craft.y : Math.max(0, -craft.y));
        OC.ROV.drawCtdChart(rovCtdChart, dNow);
      }
    };

    const renderRovSamples = () => {
      if (!OC.ROV || !rovSamplesEl) return;
      const list = OC.ROV.getSamples();
      if (rovSampleCount) rovSampleCount.textContent = String(list.length);
      if (!list.length) {
        rovSamplesEl.innerHTML = '<div style="font-size:11px;color:var(--dim);padding:6px 0">Наведите аппарат на коралл, курильщик, лёд или дно и нажмите <b>Z</b>, чтобы взять научную пробу.</div>';
        return;
      }
      rovSamplesEl.innerHTML = '';
      for (const s of list) {
        const item = document.createElement('div');
        item.className = 'rov-sample-item';
        const colCss = '#' + (s.colorHex >>> 0).toString(16).padStart(6, '0');
        item.innerHTML =
          '<span class="rov-sample-dot" style="color:' + colCss + ';background:' + colCss + '"></span>' +
          '<div class="rov-sample-body">' +
            '<div class="rov-sample-title">' + s.title + '</div>' +
            '<div class="rov-sample-meta">' + s.category + ' · ' + s.depthM + ' м · ' + s.tempC + ' °C</div>' +
            '<div class="rov-sample-chem">' + s.chemNote + '</div>' +
          '</div>';
        rovSamplesEl.appendChild(item);
      }
    };

    const toggleRovPanel = (forceClose) => {
      if (!rovPanel) return false;
      const opening = forceClose ? false : rovPanel.classList.contains('closed');
      rovPanel.classList.toggle('closed', !opening);
      if (opening) {
        if (panel) panel.classList.add('closed');
        if (btnPanel) btnPanel.classList.remove('open');
        if (labPanel) labPanel.classList.add('closed');
        if (btnLab) btnLab.classList.remove('on');
        updateRovCtdDisplay();
        renderRovSamples();
      }
      syncRovButtons();
      return opening;
    };

    const toggleRovChase = () => {
      if (!OC.Navigation.toggleRovView) return;
      const on = OC.Navigation.toggleRovView();
      syncRovButtons();
      toast(on ? 'Вид от 3-го лица: ROV «Наутилус-IV» (Y)' : 'Вид из кабины / от 1-го лица');
    };

    const triggerSampleGrab = () => {
      if (!OC.ROV || !activeBiome) return null;
      const pos = OC.Navigation.getPosition();
      OC.Navigation.getForward(_fwd);
      const labSt = OC.EcoLab ? OC.EcoLab.getState() : null;
      const smp = OC.ROV.grabSample(activeBiome, pos, _fwd, labSt);
      if (activeFauna && activeFauna.notifySiltKick) {
        const fl = activeBiome.getHeight(pos.x, pos.z);
        if (pos.y - fl < 6.0) activeFauna.notifySiltKick(pos, 1.0);
      }
      renderRovSamples();
      if (smp) {
        toast('Проба взята: ' + smp.title + ' (' + smp.category + (smp.isNewAtlas ? ' · Атлас!' : '') + ')');
      }
      return smp;
    };

    const triggerCtdCast = () => {
      if (!OC.ROV || !activeBiome) return null;
      const pos = OC.Navigation.getPosition();
      const labSt = OC.EcoLab ? OC.EcoLab.getState() : null;
      const cast = OC.ROV.runCtdCast(activeBiome, pos, labSt);
      updateRovCtdDisplay(cast);
      if (cast) {
        toast('CTD-зонд: дно ' + cast.maxDepthM + ' м · ' + cast.bottomTemp + ' °C · мин. O₂ ' + cast.minO2 + ' мг/л');
      }
      return cast;
    };

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

    const syncCamMode = (on) => {
      if (!OC.Expedition) return;
      const next = OC.Expedition.setPhotoMode(on);
      if (btnCam) btnCam.classList.toggle('on', next);
      if (camHud) camHud.classList.toggle('hidden', !next);
      if (!next && camPreview) camPreview.classList.add('hidden');
      if (camFovLabel) camFovLabel.textContent = Math.round(OC.Expedition.getZoomFov()) + '°';
    };
    if (btnCam) {
      btnCam.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = !(OC.Expedition && OC.Expedition.isPhotoMode());
        syncCamMode(next);
        toast(next ? 'Фотокамера: наведите и нажмите Enter' : 'Фотокамера закрыта');
      });
    }
    const camCloseBtn = document.getElementById('cam-close');
    if (camCloseBtn) camCloseBtn.addEventListener('click', () => syncCamMode(false));
    const camZoomIn = document.getElementById('cam-zoom-in');
    const camZoomOut = document.getElementById('cam-zoom-out');
    if (camZoomIn) camZoomIn.addEventListener('click', () => {
      if (!OC.Expedition) return;
      const fov = OC.Expedition.adjustZoom(-6);
      if (camFovLabel) camFovLabel.textContent = Math.round(fov) + '°';
    });
    if (camZoomOut) camZoomOut.addEventListener('click', () => {
      if (!OC.Expedition) return;
      const fov = OC.Expedition.adjustZoom(6);
      if (camFovLabel) camFovLabel.textContent = Math.round(fov) + '°';
    });
    const camSnap = document.getElementById('cam-snap');
    const triggerShutter = () => {
      if (!OC.Expedition || (!OC.Expedition.isPhotoMode() && !OC.Expedition.isCinemaMode())) return;
      pendingPhotoCapture = true;
    };
    if (camSnap) camSnap.addEventListener('click', triggerShutter);

    /* Цветофильтры камеры и кино-режима */
    const syncFilterUI = () => {
      if (!OC.Expedition || !OC.Expedition.getFilter) return;
      const f = OC.Expedition.getFilter();
      if (canvas) canvas.style.filter = f.css || '';
      if (btnCamFilter) btnCamFilter.textContent = 'Фильтр: ' + f.label;
      if (cinemaFiltersEl) {
        cinemaFiltersEl.querySelectorAll('button[data-flt]').forEach((b) => {
          b.classList.toggle('on', b.getAttribute('data-flt') === f.id);
        });
      }
    };
    if (cinemaFiltersEl && OC.Expedition && OC.Expedition.getFilters) {
      cinemaFiltersEl.innerHTML = '';
      for (const flt of OC.Expedition.getFilters()) {
        const b = document.createElement('button');
        b.className = 'btn';
        b.setAttribute('data-flt', flt.id);
        b.textContent = flt.label;
        b.addEventListener('click', () => {
          OC.Expedition.setFilter(flt.id);
          syncFilterUI();
          toast('Цветофильтр: ' + flt.label);
        });
        cinemaFiltersEl.appendChild(b);
      }
    }
    if (btnCamFilter) {
      btnCamFilter.addEventListener('click', () => {
        if (!OC.Expedition) return;
        const f = OC.Expedition.cycleFilter();
        syncFilterUI();
        toast('Цветофильтр: ' + f.label);
      });
    }
    syncFilterUI();

    /* Кинематографический режим (CineCam 2.39:1 + плавный пролёт) */
    const setCinemaUI = (on) => {
      if (OC.Expedition && OC.Expedition.setCinemaMode) OC.Expedition.setCinemaMode(on);
      if (btnCinema) btnCinema.classList.toggle('on', on);
      if (btnCinemaMode) btnCinemaMode.classList.toggle('on', on);
      if (cinemaBars) cinemaBars.classList.toggle('active', on);
      if (cinemaHud) cinemaHud.classList.toggle('hidden', !on);
      hudEls.forEach((el) => el.classList.toggle('hud-hidden', on || hudHidden));
    };
    if (btnCinema) {
      btnCinema.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = OC.Navigation.getMode() !== 'cinema';
        OC.Navigation.setMode(next ? 'cinema' : 'swim');
        toast(next ? 'Кино-режим: автопролёт и фильтры (N / X)' : 'Возврат к свободному плаванию');
      });
    }
    const cSnapBtn = document.getElementById('cinema-snap');
    if (cSnapBtn) cSnapBtn.addEventListener('click', triggerShutter);
    const cCloseBtn = document.getElementById('cinema-close');
    if (cCloseBtn) cCloseBtn.addEventListener('click', () => OC.Navigation.setMode('swim'));
    const camOpenJournal = document.getElementById('cam-open-journal');
    if (camOpenJournal) camOpenJournal.addEventListener('click', () => {
      syncCamMode(false);
      journalTab = 'photos';
      if (journalTabs) journalTabs.querySelectorAll('button[data-jtab]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-jtab') === 'photos'));
      if (journalModal) { journalModal.classList.remove('hidden'); renderJournal(); }
    });

    const toggleJournal = (forceClose) => {
      if (!journalModal) return;
      const opening = forceClose ? false : journalModal.classList.contains('hidden');
      journalModal.classList.toggle('hidden', !opening);
      if (opening) renderJournal();
    };
    if (btnJournal) btnJournal.addEventListener('click', (e) => { e.stopPropagation(); toggleJournal(false); });
    const jClose = document.getElementById('journal-close');
    if (jClose) jClose.addEventListener('click', () => toggleJournal(true));
    if (journalModal) journalModal.addEventListener('click', (e) => { if (e.target === journalModal) toggleJournal(true); });
    if (journalTabs) {
      journalTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-jtab]');
        if (!btn) return;
        journalTab = btn.getAttribute('data-jtab');
        journalTabs.querySelectorAll('button[data-jtab]').forEach((b) => b.classList.toggle('on', b === btn));
        renderJournal();
      });
    }
    const clearWpBtn = document.getElementById('journal-clear-wp');
    if (clearWpBtn) clearWpBtn.addEventListener('click', () => {
      if (OC.Expedition && activeBiome) OC.Expedition.clearWaypoint(activeBiome.id);
      toast('Навигационный маяк снят');
    });

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

    const syncAuto = () => {
      if (!btnAuto) return;
      btnAuto.classList.toggle('on', autoCycle);
      btnAuto.textContent = autoCycle ? '⟳ Суточный цикл: Вкл' : '⟳ Суточный цикл: Пауза';
    };
    syncAuto();
    if (btnAuto) {
      btnAuto.addEventListener('click', () => {
        autoCycle = !autoCycle;
        syncAuto();
      });
    }

    const setTOD = (val, label) => {
      OC.setTimeOfDay(val);
      if (timeSlider) timeSlider.value = Math.round(val * 100);
      autoCycle = false;
      syncAuto();
      toast(label);
    };
    const bDawn = document.getElementById('btn-dawn');
    const bDay = document.getElementById('btn-day');
    const bDusk = document.getElementById('btn-dusk');
    const bNight = document.getElementById('btn-night');
    if (bDawn) bDawn.addEventListener('click', () => setTOD(0.24, 'Тропический рассвет'));
    if (bDay) bDay.addEventListener('click', () => setTOD(0.48, 'Яркий полдень над рифом'));
    if (bDusk) bDusk.addEventListener('click', () => setTOD(0.74, 'Закат над Коралловым морем'));
    if (bNight) bNight.addEventListener('click', () => setTOD(0.98, 'Ночь: биолюминесценция и прожектор (F)'));

    if (timeSlider) {
      timeSlider.addEventListener('input', () => {
        OC.setTimeOfDay(parseFloat(timeSlider.value) / 100);
        autoCycle = false;
        syncAuto();
      });
    }

    const BIOME_SHORT = {
      great_barrier_reef: 'Риф ББР',
      kelp_forest: 'Ламинария',
      hydrothermal_vents: 'Курильщики 2500м',
      arctic_sea: 'Арктика',
      wreck_atoll: 'Атолл и Корабль',
      mariana_trench: 'Марианская 10920м',
      brine_pool: 'Соляной бассейн',
      cenote_caves: 'Сеноты Юкатана',
      galapagos_upwelling: 'Галапагосы'
    };
    const BIOME_REGION = {
      great_barrier_reef: 'GBR · Тихий океан',
      kelp_forest: 'Монтерей · Калифорния',
      hydrothermal_vents: 'ВТП · Абиссаль 2500 м',
      arctic_sea: 'Баффин · 74° с.ш.',
      wreck_atoll: 'Палау · Микронезия',
      mariana_trench: 'Челленджер · 10 920 м',
      brine_pool: 'Мексиканский залив · 650 м',
      cenote_caves: 'Юкатан · Сак-Актун 58 м',
      galapagos_upwelling: 'Эквадор · Апвеллинг'
    };

    function renderBiomeUI() {
      const list = OC.Biomes.list();
      const curId = activeBiome ? activeBiome.id : '';
      if (brandTitleEl && activeBiome) {
        const parts = activeBiome.name.split(' ');
        brandTitleEl.innerHTML = parts.length > 1
          ? (parts[0] + ' <span>' + parts.slice(1).join(' ') + '</span>')
          : activeBiome.name;
      }
      if (brandSubEl && activeBiome) brandSubEl.textContent = activeBiome.subtitle || activeBiome.region;
      if (statusRegionEl) statusRegionEl.textContent = BIOME_REGION[curId] || (activeBiome ? activeBiome.region : 'Океан');

      if (biomeBarEl) {
        biomeBarEl.innerHTML = '';
        list.forEach((b) => {
          const pill = document.createElement('button');
          pill.className = 'biome-pill' + (b.id === curId ? ' on' : '');
          pill.textContent = BIOME_SHORT[b.id] || b.name;
          pill.title = b.name + ' · ' + b.region;
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            if (b.id !== curId) switchBiome(b.id);
          });
          biomeBarEl.appendChild(pill);
        });
      }
      if (biomeBtnsEl) {
        biomeBtnsEl.innerHTML = '';
        list.forEach((b) => {
          const btn = document.createElement('button');
          btn.className = 'btn chip' + (b.id === curId ? ' on' : '');
          btn.textContent = BIOME_SHORT[b.id] || b.name;
          btn.title = b.name + ' (' + b.region + ')';
          btn.addEventListener('click', () => {
            if (b.id !== curId) switchBiome(b.id);
          });
          biomeBtnsEl.appendChild(btn);
        });
      }
    }

    function renderZoneChips() {
      if (!zoneChipsEl || !activeBiome || !activeBiome.landmarks) return;
      zoneChipsEl.innerHTML = '';
      activeBiome.landmarks.forEach((lm) => {
        const b = document.createElement('button');
        b.className = 'btn chip';
        b.textContent = lm.name;
        b.title = lm.description;
        b.addEventListener('click', () => {
          OC.Navigation.flyTo(lm.x, lm.y, lm.z, lm.yaw, lm.pitch);
          toast(lm.name + ' · ' + lm.description);
        });
        zoneChipsEl.appendChild(b);
      });
    }

    renderBiomeUI();
    renderZoneChips();

    /* Кнопки управления погодой (Авто / Штиль / Зыбь / Шторм) */
    const syncWeatherButtons = () => {
      if (!weatherBtnsEl || !OC.Weather) return;
      const m = OC.Weather.getMode();
      weatherBtnsEl.querySelectorAll('button[data-w]').forEach((b) => {
        b.classList.toggle('on', b.getAttribute('data-w') === m);
      });
      if (weatherGroupEl && activeBiome) {
        weatherGroupEl.style.opacity = activeBiome.noSurface ? '0.45' : '1';
      }
    };
    if (weatherBtnsEl && OC.Weather) {
      weatherBtnsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-w]');
        if (!btn) return;
        const m = btn.getAttribute('data-w');
        OC.Weather.setMode(m);
        syncWeatherButtons();
        toast('Погода: ' + OC.Weather.getLabel(activeBiome));
      });
      syncWeatherButtons();
    }

    /* Кнопки выбора качества графики */
    if (qualityBtnsEl) {
      const renderQualityButtons = () => {
        const activeId = OC.Quality.getId();
        qualityBtnsEl.querySelectorAll('button[data-q]').forEach((b) => {
          b.classList.toggle('on', b.getAttribute('data-q') === activeId);
        });
      };
      qualityBtnsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-q]');
        if (!btn) return;
        const id = btn.getAttribute('data-q');
        const p = OC.Quality.set(id);
        if (OC.Expedition && OC.Expedition.saveQuality) OC.Expedition.saveQuality(id);
        renderQualityButtons();
        toast('Качество графики: ' + p.label);
      });
      renderQualityButtons();
    }

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
        hudHidden = !hudHidden;
        hudEls.forEach((el) => el.classList.toggle('hud-hidden', hudHidden));
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
        if (OC.Globe && OC.Globe.isOpen()) OC.Globe.close();
        else if (OC.Atlas.isOpen()) OC.Atlas.toggle();
        else if (journalModal && !journalModal.classList.contains('hidden')) toggleJournal(true);
        else if (labPanel && !labPanel.classList.contains('closed')) toggleLab(true);
        else if (rovPanel && !rovPanel.classList.contains('closed')) toggleRovPanel(true);
        else if (OC.Expedition && OC.Expedition.isPhotoMode()) syncCamMode(false);
        else if (OC.Navigation.getMode() === 'cinema') OC.Navigation.setMode('swim');
        else if (OC.Navigation.getMode() === 'tour') OC.Navigation.stopTour();
      }
    });

    if (hero) {
      hero.addEventListener('click', () => hero.classList.add('fade'));
      setTimeout(() => hero.classList.add('fade'), 13000);
    }

    return { syncModes, syncFlash, syncCamMode, syncSubMode, syncGuideCard, updateLabDisplay, syncLabControls, updateRovCtdDisplay, syncRovButtons, fireSonarPing, triggerShutter, syncWeatherButtons, renderBiomeUI, renderZoneChips };
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

  function boot() {
    try {
      const savedQ = OC.Expedition && OC.Expedition.getSavedQuality ? OC.Expedition.getSavedQuality() : null;
      if (savedQ && OC.Quality.presets && OC.Quality.presets[savedQ]) OC.Quality.set(savedQ);

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
    let last = performance.now();
    let time = 0, fpsAcc = 0, fpsFrames = 0, hudTimer = 0, wasInBrine = false, lastBrineToastAt = -100, wasInHalocline = false, lastHaloToastAt = -100;

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
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

    function frame(now) {
      requestAnimationFrame(frame);
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
        if (autoCycle && timeSlider) timeSlider.value = Math.round(t * 100);
        if (timeLabel) {
          const hrs = (t * 24) % 24;
          timeLabel.textContent = String(Math.floor(hrs)).padStart(2, '0') + ':' + String(Math.floor((hrs % 1) * 60)).padStart(2, '0');
        }

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
        if (fpsEl) fpsEl.textContent = Math.round(fpsFrames / fpsAcc) + ' FPS';
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

      renderer.render(scene, camera);

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
