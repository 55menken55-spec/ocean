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
  const btnSound = document.getElementById('btn-sound');
  const btnFlash = document.getElementById('btn-flash');
  const btnAtlas = document.getElementById('btn-atlas');
  const btnReset = document.getElementById('btn-reset');
  const btnSwim = document.getElementById('btn-mode-swim');
  const btnOrbit = document.getElementById('btn-mode-orbit');
  const btnTour = document.getElementById('btn-explore');
  const btnAuto = document.getElementById('btn-auto');
  const timeSlider = document.getElementById('time-slider');
  const timeLabel = document.getElementById('time-label');
  const zoneChipsEl = document.getElementById('zone-chips');
  const qualityBtnsEl = document.getElementById('quality-btns');

  const teleZone = document.getElementById('tele-zone');
  const teleDepth = document.getElementById('tele-depth');
  const teleTemp = document.getElementById('tele-temp');
  const teleHeading = document.getElementById('tele-heading');

  const statChunks = document.getElementById('stat-chunks');
  const statCorals = document.getElementById('stat-corals');
  const statFish = document.getElementById('stat-fish');
  const statBig = document.getElementById('stat-big');

  const fpsEl = document.getElementById('fps');
  const loading = document.getElementById('loading');
  const loadingBar = document.getElementById('loading-bar');
  const toastEl = document.getElementById('toast');
  const popup = document.getElementById('fish-popup');

  let autoCycle = true;
  let hudHidden = false;
  let toastTimer = 0;
  let pickedTime = 0;

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

  function pickAt(cx, cy, biome) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((cx - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((cy - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, OC.getCamera());
    const hits = raycaster.intersectObjects(OC.getScene().children, true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      let o = h.object;
      while (o && !o.userData.key) o = o.parent;
      const key = o && o.userData.key ? o.userData.key : null;
      if (!key || key === 'bubbles' || key === 'plankton') continue;
      showInfo(key, cx, cy, biome);
      return;
    }
  }

  function bindUI(biome) {
    if (window.innerWidth < 1100 && panel) panel.classList.add('closed');
    if (btnPanel && panel) {
      btnPanel.classList.toggle('open', !panel.classList.contains('closed'));
      btnPanel.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('closed');
        btnPanel.classList.toggle('open', !panel.classList.contains('closed'));
      });
    }

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

    function syncModes(mode) {
      if (btnSwim) btnSwim.classList.toggle('on', mode === 'swim');
      if (btnOrbit) btnOrbit.classList.toggle('on', mode === 'orbit');
      if (btnTour) {
        btnTour.classList.toggle('on', mode === 'tour');
        btnTour.innerHTML = mode === 'tour' ? '&#10005; Стоп тур' : '&#9654; Тур по рифу';
      }
    }

    if (btnSwim) btnSwim.addEventListener('click', () => { OC.Navigation.setMode('swim'); toast('Режим свободного плавания (WASD + мышь)'); });
    if (btnOrbit) btnOrbit.addEventListener('click', () => { OC.Navigation.setMode('orbit'); toast('Орбитальный осмотр (перетаскивание + колесо)'); });
    if (btnTour) {
      btnTour.addEventListener('click', () => {
        const next = OC.Navigation.getMode() === 'tour' ? 'swim' : 'tour';
        OC.Navigation.setMode(next);
      });
    }
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        OC.Navigation.resetToSpawn();
        toast('Возврат к центру Большого Барьерного рифа');
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

    /* Кнопки быстрого перемещения по зонам рифа */
    if (zoneChipsEl && biome.landmarks) {
      zoneChipsEl.innerHTML = '';
      biome.landmarks.forEach((lm) => {
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
        renderQualityButtons();
        toast('Качество графики: ' + p.label);
      });
      renderQualityButtons();
    }

    /* Мобильные кнопки движения */
    const mFwd = document.getElementById('m-fwd');
    const mBack = document.getElementById('m-back');
    if (mFwd) mFwd.addEventListener('click', () => OC.Navigation.nudgeForward(16));
    if (mBack) mBack.addEventListener('click', () => OC.Navigation.nudgeForward(-14));

    /* Горячие клавиши */
    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.code === 'KeyM') { syncSound(OC.sound.toggle()); }
      if (e.code === 'KeyF') {
        const on = OC.toggleFlashlight();
        syncFlash(on);
        toast(on ? 'Прожектор включён' : 'Прожектор выключен');
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
      if (e.code === 'KeyR') { OC.Navigation.resetToSpawn(); toast('Возврат к центру рифа'); }
      if (e.code === 'KeyK') { OC.Atlas.toggle(); }
      if (e.code === 'KeyH') {
        hudHidden = !hudHidden;
        hudEls.forEach((el) => el.classList.toggle('hud-hidden', hudHidden));
      }
      if (e.code === 'Escape' && OC.Atlas.isOpen()) OC.Atlas.toggle();
    });

    if (hero) {
      hero.addEventListener('click', () => hero.classList.add('fade'));
      setTimeout(() => hero.classList.add('fade'), 13000);
    }

    return { syncModes };
  }

  function boot() {
    try {
      const biome = OC.Biomes.getActive();
      setBar(0.25);
      const init = OC.initWorld(canvas);
      const renderer = init.renderer;
      const scene = init.scene;
      const camera = init.camera;

      const sp = new T.Vector3(biome.spawn.pos[0], biome.spawn.pos[1], biome.spawn.pos[2]);

      setBar(0.5);
      OC.Terrain.init(scene, biome, sp);

      setBar(0.72);
      OC.FloraStreamer.init(scene, biome, sp);

      setBar(0.88);
      const fauna = OC.FaunaEngine.init(scene, biome);

      let uiRefs = null;
      OC.Navigation.init(canvas, biome, {
        onPick: (cx, cy) => pickAt(cx, cy, biome),
        onModeChange: (m) => { if (uiRefs) uiRefs.syncModes(m); },
        onTourToast: (title) => toast('Тур: ' + title)
      });

      OC.Minimap.init(document.getElementById('minimap'), biome, (x, y, z, yaw, pitch, label) => {
        OC.Navigation.flyTo(x, y, z, yaw, pitch);
        if (label) toast('Переход: ' + label);
      });

      OC.Atlas.init(biome, (lm) => {
        OC.Navigation.flyTo(lm.x, lm.y, lm.z, lm.yaw, lm.pitch);
        toast('Курс на зону: ' + lm.name);
      });

      uiRefs = bindUI(biome);
      uiRefs.syncModes(OC.Navigation.getMode());

      setBar(1.0);
      setTimeout(() => {
        if (loading) {
          loading.classList.add('hidden');
          setTimeout(() => loading.remove(), 800);
        }
      }, 280);

      runLoop(renderer, scene, camera, biome, fauna);
    } catch (e) {
      console.error(e);
      if (loading) {
        loading.innerHTML = '<div style="color:#fff;font:500 16px system-ui;padding:24px;max-width:520px;text-align:center">Не удалось инициализировать WebGL.<br><span style="opacity:.7;font-size:13px">' + (e && e.message ? e.message : e) + '</span></div>';
      }
    }
  }

  function runLoop(renderer, scene, camera, biome, fauna) {
    let last = performance.now();
    let time = 0, fpsAcc = 0, fpsFrames = 0, hudTimer = 0;

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fauna.setScale(h / 900);
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

      OC.updateWorld(dt, time, camPos, autoCycle);
      OC.Terrain.update(camPos);
      OC.FloraStreamer.update(camPos);
      fauna.update(dt, time, camPos);

      hudTimer += rawDt;
      if (hudTimer > 0.14) {
        hudTimer = 0;
        const zone = biome.getZoneAt(camPos.x, camPos.y, camPos.z);
        const depthM = Math.max(0, -camPos.y);
        const tempC = (zone.tempC - Math.max(0, depthM - 15) * 0.065).toFixed(1);

        if (teleZone) teleZone.textContent = zone.shortName;
        if (teleDepth) teleDepth.textContent = camPos.y > 0.1 ? ('+' + camPos.y.toFixed(1) + ' м над водой') : (depthM.toFixed(1) + ' м');
        if (teleTemp) teleTemp.textContent = tempC + ' °C';
        if (teleHeading) teleHeading.textContent = formatHeading(OC.Navigation.getYaw());

        OC.sound.update(depthM, zone.id);
        OC.Minimap.update(camPos, OC.Navigation.getYaw());

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

      renderer.render(scene, camera);
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
