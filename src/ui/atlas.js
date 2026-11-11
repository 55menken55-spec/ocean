/* ================= ИНТЕРАКТИВНЫЙ 3D-АТЛАС ВИДОВ, ГОЛОСОВ И ГЕОГРАФИИ ОКЕАНА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const discoveredByBiome = new Map();
  let modalEl = null;
  let gridEl = null;
  let countEl = null;
  let titleEl = null;
  let currentCat = 'Все';
  let selectedKey = null;
  let biomeRef = null;
  let onDiveCallback = null;

  // Элементы 3D-студии
  let stageCanvas = null;
  let lightBtn = null;
  let vCatEl = null;
  let vBadgeEl = null;
  let vNameEl = null;
  let vLatinEl = null;
  let vDescEl = null;
  let vZoneEl = null;
  let vVoiceBtn = null;
  let vDiveBtn = null;

  // 3D-сцена единственного оффскрин-превью рендерера
  let pRenderer = null;
  let pScene = null;
  let pCamera = null;
  let pHemi = null;
  let pDirA = null;
  let pDirB = null;
  let pModel = null;
  let pRaf = 0;
  let pNightMode = false;
  let stageFailed = false;

  let dragActive = false;
  let dragLastX = 0;
  let dragLastY = 0;
  let modelYaw = 0.6;
  let modelPitch = 0.14;
  let autoSpin = true;

  const CATEGORY_LANDMARK = {
    'Мангровые отмели': 'mangroves',
    'Луга морской травы': 'seagrass',
    'Внутренняя лагуна': 'bommies',
    'Коралловый островок': 'sand_cay',
    'Лагуна и Трава': 'seagrass',
    'Лагуна и Гребень': 'crest',
    'Гребень и Лагуна': 'crest',
    'Гребень и Бомми': 'crest',
    'Гребень рифа': 'crest',
    'Лагуна и Желоба': 'crest',
    'Лагуна и Толща воды': 'bommies',
    'Лагуна и Проход': 'pass',
    'Лагуна и Склон': 'pass',
    'Склон и Проход': 'pass',
    'Склон и Стена': 'dropoff',
    'Внешний склон': 'pass',
    'Внешний склон и Обрыв': 'dropoff',
    'Склон и Обрыв': 'dropoff',
    'Бомми и Склон': 'bommies',
    'Гребень и Склон': 'crest',
    'Рифовый проход': 'pass',
    'Рифовый проход и Обрыв': 'pass',
    'Голубая дыра и Склон': 'blue_hole',
    'Голубая дыра и Обрыв': 'blue_hole',
    'Голубая дыра и Бездна': 'blue_hole',
    'Стена внешнего барьера': 'dropoff',
    'Бездна Кораллового моря': 'dropoff',
    'Коралловое море': 'dropoff',
    'Затонувший корабль': 'sunken_ship',
    'Острова атолла': 'rock_islands',
    'Лагуна саргасса': 'jellyfish_lagoon',
    'Синий угол': 'blue_corner',
    'Портал сенота': 'cenote_portal',
    'Зал сталактитов': 'stalactite_cathedral',
    'Галоклин Анхелиты': 'angelita_halocline',
    'Бездна Эль-Пит': 'el_pit_depth',
    'Арка Дарвина': 'darwins_arch',
    'Лавовая бухта': 'lava_cove',
    'Стена апвеллинга': 'upwelling_wall',
    'Пелагиаль Вольфа': 'wolf_orca_shelf',
    'Небо над Аркой Дарвина': 'darwins_arch',
    'Пролив у Вольфа': 'wolf_orca_shelf',
    'Затопленный лес': 'igapo_roots',
    'Заводь кувшинок': 'victoria_lagoon',
    'Чёрная вода': 'rio_negro_channel',
    'Слияние вод': 'whitewater_confluence',
    'Роща сейб': 'cathedral_canopy',
    'Русло и пойма': 'rio_negro_channel',
    'Все зоны': 'crest'
  };

  function getDiscoveredSet() {
    const id = biomeRef ? biomeRef.id : 'default';
    let s = discoveredByBiome.get(id);
    if (!s) {
      const saved = OC.Expedition && OC.Expedition.getSavedDiscovered ? OC.Expedition.getSavedDiscovered(id) : ['floor'];
      s = new Set(saved && saved.length ? saved : ['floor']);
      discoveredByBiome.set(id, s);
    }
    return s;
  }

  function resolveLandmark(zoneLabel) {
    if (!biomeRef || !biomeRef.landmarks || !biomeRef.landmarks.length) return null;
    const mapped = CATEGORY_LANDMARK[zoneLabel];
    if (mapped) {
      const hit = biomeRef.landmarks.find((l) => l.id === mapped);
      if (hit) return hit;
    }
    const lbl = (zoneLabel || '').toLowerCase();
    for (const lm of biomeRef.landmarks) {
      const n = (lm.name || '').toLowerCase();
      if (lbl && (n.includes(lbl) || lbl.includes(n.split(' ')[0]))) return lm;
    }
    if (biomeRef.zones) {
      for (const z of biomeRef.zones) {
        const zn = (z.shortName || '').toLowerCase();
        if (zn && lbl.includes(zn.split(' ')[0])) {
          const hit = biomeRef.landmarks.find((l) => l.zoneId === z.id);
          if (hit) return hit;
        }
      }
    }
    return biomeRef.landmarks[0];
  }

  function disposePreviewObject(obj) {
    if (!obj) return;
    const geos = new Set();
    const mats = new Set();
    obj.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) if (m) mats.add(m);
      }
    });
    for (const m of mats) m.dispose();
    // Не диспоузим общие кэшированные геометрии флоры
    for (const g of geos) {
      if (!g.userData || !g.userData.sharedPreview) g.dispose();
    }
  }

  function syncStageLighting() {
    if (!pHemi || !pDirA || !pDirB) return;
    if (pNightMode) {
      pHemi.color.setHex(0x28629a);
      pHemi.groundColor.setHex(0x06101c);
      pHemi.intensity = 0.55;
      pDirA.color.setHex(0x4ae8ff);
      pDirA.intensity = 1.45;
      pDirB.color.setHex(0x9a5eff);
      pDirB.intensity = 0.9;
      if (lightBtn) lightBtn.innerHTML = '&#10022; Ночь Био';
    } else {
      pHemi.color.setHex(0xa8ecff);
      pHemi.groundColor.setHex(0x164258);
      pHemi.intensity = 1.05;
      pDirA.color.setHex(0xfff5e0);
      pDirA.intensity = 1.75;
      pDirB.color.setHex(0x4ad4ff);
      pDirB.intensity = 0.65;
      if (lightBtn) lightBtn.innerHTML = '&#9728; День';
    }
  }

  function ensureStage() {
    if (pRenderer || stageFailed || !stageCanvas) return !!pRenderer;
    try {
      pRenderer = new T.WebGLRenderer({ canvas: stageCanvas, alpha: true, antialias: true });
      pRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      pRenderer.setSize(310, 208, false);
      pRenderer.outputEncoding = T.sRGBEncoding;

      pScene = new T.Scene();
      pCamera = new T.PerspectiveCamera(40, 310 / 208, 0.1, 40);
      pCamera.position.set(0, 0.45, 4.15);
      pCamera.lookAt(0, 0, 0);

      pHemi = new T.HemisphereLight(0xa8ecff, 0x164258, 1.05);
      pDirA = new T.DirectionalLight(0xfff5e0, 1.75);
      pDirA.position.set(3.5, 4.2, 4.0);
      pDirB = new T.DirectionalLight(0x4ad4ff, 0.65);
      pDirB.position.set(-4.0, -2.0, -3.0);
      pScene.add(pHemi, pDirA, pDirB);
      syncStageLighting();
      return true;
    } catch (e) {
      stageFailed = true;
      return false;
    }
  }

  function renderStageFrame() {
    pRaf = 0;
    if (!modalEl || modalEl.classList.contains('hidden')) return;
    if (pModel && pRenderer && pScene && pCamera) {
      if (autoSpin && !dragActive) modelYaw += 0.009;
      pModel.rotation.y = modelYaw;
      pModel.rotation.x = modelPitch;
      pRenderer.render(pScene, pCamera);
    }
    pRaf = requestAnimationFrame(renderStageFrame);
  }

  function startStageLoop() {
    if (!pRaf && modalEl && !modalEl.classList.contains('hidden')) {
      pRaf = requestAnimationFrame(renderStageFrame);
    }
  }

  function stopStageLoop() {
    if (pRaf) {
      cancelAnimationFrame(pRaf);
      pRaf = 0;
    }
  }

  function selectSpecies(key, playAudio) {
    if (!biomeRef || !biomeRef.encyclopedia) return;
    const keys = Object.keys(biomeRef.encyclopedia);
    if (!key || !biomeRef.encyclopedia[key]) key = keys[0];
    selectedKey = key;

    const item = biomeRef.encyclopedia[key];
    const [title, latin, cat, zoneLabel, depthLabel, desc] = item;
    const discovered = getDiscoveredSet();
    const isFound = discovered.has(key);

    if (vCatEl) vCatEl.textContent = cat + ' · ' + depthLabel;
    if (vBadgeEl) {
      vBadgeEl.textContent = isFound ? 'Изучено' : 'Не изучено';
      vBadgeEl.className = 'atlas-badge' + (isFound ? ' ok' : '');
    }
    if (vNameEl) vNameEl.textContent = title;
    if (vLatinEl) vLatinEl.textContent = latin;
    if (vDescEl) vDescEl.textContent = desc;
    if (vZoneEl) vZoneEl.textContent = 'Среда обитания: ' + zoneLabel;

    if (vVoiceBtn && OC.sound && OC.sound.getVoiceLabel) {
      vVoiceBtn.innerHTML = '&#128266; ' + OC.sound.getVoiceLabel(key);
    }

    if (gridEl) {
      gridEl.querySelectorAll('.atlas-card').forEach((c) => {
        c.classList.toggle('selected', c.getAttribute('data-key') === key);
      });
    }

    if (OC.FaunaEngine && OC.FaunaEngine.createPreviewMesh && ensureStage()) {
      if (pModel) {
        pScene.remove(pModel);
        disposePreviewObject(pModel);
      }
      pModel = OC.FaunaEngine.createPreviewMesh(key, biomeRef);
      if (pModel) {
        pScene.add(pModel);
        modelYaw = 0.62;
        modelPitch = 0.14;
        autoSpin = true;
      }
      if (pRenderer && pScene && pCamera) pRenderer.render(pScene, pCamera);
    }

    if (playAudio && OC.sound && OC.sound.playSpeciesVoice) {
      OC.sound.playSpeciesVoice(key);
    }
  }

  function render() {
    if (!gridEl || !biomeRef) return;
    const enc = biomeRef.encyclopedia;
    const keys = Object.keys(enc);
    const discovered = getDiscoveredSet();
    if (titleEl) titleEl.textContent = 'Атлас · ' + biomeRef.name;
    if (countEl) countEl.textContent = discovered.size + ' / ' + keys.length;

    const visibleKeys = [];
    gridEl.innerHTML = '';
    for (const key of keys) {
      const item = enc[key];
      const [title, latin, cat, zoneLabel, depthLabel, desc] = item;
      if (currentCat !== 'Все' && cat !== currentCat) continue;
      visibleKeys.push(key);

      const isFound = discovered.has(key);
      const card = document.createElement('div');
      card.className = 'atlas-card' + (isFound ? ' found' : '') + (selectedKey === key ? ' selected' : '');
      card.setAttribute('data-key', key);

      const badge = isFound ? '<span class="atlas-badge ok">Изучено</span>' : '<span class="atlas-badge">Не изучено</span>';
      card.innerHTML =
        '<div class="atlas-top"><span class="atlas-cat">' + cat + ' · ' + depthLabel + '</span>' + badge + '</div>' +
        '<div class="atlas-name">' + title + '</div>' +
        '<div class="atlas-latin">' + latin + '</div>' +
        '<div class="atlas-desc">' + desc + '</div>' +
        '<div class="atlas-foot"><span>' + zoneLabel + '</span><button class="atlas-go">Нырнуть туда →</button></div>';

      card.addEventListener('click', (e) => {
        if (e.target && e.target.closest('.atlas-go')) return;
        selectSpecies(key, false);
      });

      const goBtn = card.querySelector('.atlas-go');
      goBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lm = resolveLandmark(zoneLabel);
        if (lm && onDiveCallback) {
          onDiveCallback(lm);
          thisClose();
        }
      });
      gridEl.appendChild(card);
    }

    if (!selectedKey || !visibleKeys.includes(selectedKey)) {
      selectSpecies(visibleKeys[0] || keys[0], false);
    }
  }

  /* Модалка сообщает о себе UI-слою: пока она открыта, HUD скрыт */
  function notifyModal(open) {
    if (OC.UI && OC.UI.Rail) OC.UI.Rail.setModalOpen('atlas', open);
  }

  function thisClose() {
    if (modalEl) modalEl.classList.add('hidden');
    notifyModal(false);
    stopStageLoop();
  }

  OC.Atlas = {
    init(biome, onDive) {
      biomeRef = biome;
      onDiveCallback = onDive;
      modalEl = document.getElementById('atlas-modal');
      gridEl = document.getElementById('atlas-grid');
      countEl = document.getElementById('atlas-count');
      titleEl = document.getElementById('atlas-title');
      stageCanvas = document.getElementById('atlas-3d');
      lightBtn = document.getElementById('atlas-light-btn');
      vCatEl = document.getElementById('atlas-v-cat');
      vBadgeEl = document.getElementById('atlas-v-badge');
      vNameEl = document.getElementById('atlas-v-name');
      vLatinEl = document.getElementById('atlas-v-latin');
      vDescEl = document.getElementById('atlas-v-desc');
      vZoneEl = document.getElementById('atlas-v-zone');
      vVoiceBtn = document.getElementById('atlas-v-voice');
      vDiveBtn = document.getElementById('atlas-v-dive');

      const closeBtn = document.getElementById('atlas-close');
      const tabsEl = document.getElementById('atlas-tabs');

      if (closeBtn) closeBtn.addEventListener('click', thisClose);
      if (modalEl) {
        modalEl.addEventListener('click', (e) => {
          if (e.target === modalEl) thisClose();
        });
      }
      if (tabsEl) {
        tabsEl.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-cat]');
          if (!btn) return;
          currentCat = btn.getAttribute('data-cat');
          tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
          render();
        });
      }

      if (stageCanvas) {
        stageCanvas.addEventListener('pointerdown', (e) => {
          dragActive = true;
          autoSpin = false;
          dragLastX = e.clientX;
          dragLastY = e.clientY;
        });
        window.addEventListener('pointermove', (e) => {
          if (!dragActive) return;
          modelYaw += (e.clientX - dragLastX) * 0.012;
          modelPitch = OC.clamp(modelPitch + (e.clientY - dragLastY) * 0.01, -1.1, 1.1);
          dragLastX = e.clientX;
          dragLastY = e.clientY;
        });
        window.addEventListener('pointerup', () => { dragActive = false; });
      }

      if (lightBtn) {
        lightBtn.addEventListener('click', () => {
          pNightMode = !pNightMode;
          syncStageLighting();
        });
      }

      if (vVoiceBtn) {
        vVoiceBtn.addEventListener('click', () => {
          if (selectedKey && OC.sound && OC.sound.playSpeciesVoice) {
            OC.sound.playSpeciesVoice(selectedKey);
          }
        });
      }

      if (vDiveBtn) {
        vDiveBtn.addEventListener('click', () => {
          if (!selectedKey || !biomeRef || !biomeRef.encyclopedia[selectedKey]) return;
          const zoneLabel = biomeRef.encyclopedia[selectedKey][3];
          const lm = resolveLandmark(zoneLabel);
          if (lm && onDiveCallback) {
            onDiveCallback(lm);
            thisClose();
          }
        });
      }

      render();
    },

    setBiome(biome) {
      biomeRef = biome;
      currentCat = 'Все';
      selectedKey = null;
      const tabsEl = document.getElementById('atlas-tabs');
      if (tabsEl) {
        tabsEl.querySelectorAll('button[data-cat]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-cat') === 'Все'));
      }
      render();
    },

    discover(key) {
      const discovered = getDiscoveredSet();
      if (!key || discovered.has(key)) return false;
      if (biomeRef && biomeRef.encyclopedia[key]) {
        discovered.add(key);
        selectedKey = key;
        if (OC.Expedition && OC.Expedition.saveDiscovered) {
          OC.Expedition.saveDiscovered(biomeRef.id, discovered);
        }
        render();
        return true;
      }
      return false;
    },

    selectSpecies,

    toggle() {
      if (!modalEl) return;
      const opening = modalEl.classList.contains('hidden');
      modalEl.classList.toggle('hidden');
      notifyModal(opening);
      if (opening) {
        render();
        selectSpecies(selectedKey, false);
        startStageLoop();
      } else {
        stopStageLoop();
      }
    },

    isOpen() {
      return modalEl && !modalEl.classList.contains('hidden');
    }
  };
})(window.OC);
