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
  let subMode = false;
  let toastTimer = 0;
  let pickedTime = 0;
  let sonarPingState = { t: -10, range: 140, kind: 'none', label: 'Сканер · Чисто', hit: false };
  const _fwd = new T.Vector3();

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

  function bindUI(biome, fauna) {
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

    const syncSubMode = (on) => {
      subMode = on;
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
      if (!cam || !fauna) return;
      OC.Navigation.getForward(_fwd);
      const res = fauna.scanForward(cam.position, _fwd, 140);
      sonarPingState = {
        t: OC.uTime.value,
        range: res.range,
        kind: res.kind,
        label: res.label,
        hit: res.hit
      };
      OC.Minimap.triggerPing(cam.position.x, cam.position.z);
      OC.sound.sonarPing(res.range, res.hit);
      if (sonarReadout) {
        sonarReadout.textContent = res.hit
          ? (res.range.toFixed(0) + ' м · ' + res.label)
          : '140 м · Чистая вода';
      }
      if (btnSonar) {
        btnSonar.classList.add('on');
        setTimeout(() => btnSonar.classList.remove('on'), 650);
      }
      toast(res.hit ? ('Сонар: ' + res.range.toFixed(0) + ' м — ' + res.label) : 'Сонар: впереди чисто (140 м)');
    };

    if (btnSonar) {
      btnSonar.addEventListener('click', (e) => {
        e.stopPropagation();
        fireSonarPing();
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
      if (e.code === 'KeyB') {
        syncSubMode(!subMode);
        toast(subMode ? 'Режим батискафа: эхолот и приборы включены' : 'Режим свободного дайвера');
      }
      if (e.code === 'KeyG') { fireSonarPing(); }
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

      uiRefs = bindUI(biome, fauna);
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
      const camSpeed = OC.Navigation.getSpeed();
      const flashOn = OC.isFlashlightOn();
      fauna.update(dt, time, camPos, camSpeed, flashOn);

      hudTimer += rawDt;
      if (hudTimer > 0.14) {
        hudTimer = 0;
        const zone = biome.getZoneAt(camPos.x, camPos.y, camPos.z);
        const depthM = Math.max(0, -camPos.y);
        const tempC = (zone.tempC - Math.max(0, depthM - 15) * 0.065).toFixed(1);
        const pal = OC.getPalette();
        const dayW = pal && typeof pal.dayW === 'number' ? pal.dayW : 1.0;

        if (teleZone) teleZone.textContent = zone.shortName;
        if (teleDepth) teleDepth.textContent = camPos.y > 0.1 ? ('+' + camPos.y.toFixed(1) + ' м над водой') : (depthM.toFixed(1) + ' м');
        if (teleTemp) teleTemp.textContent = tempC + ' °C';
        if (teleHeading) teleHeading.textContent = formatHeading(OC.Navigation.getYaw());

        OC.sound.update(depthM, zone.id, dayW);
        OC.Minimap.update(camPos, OC.Navigation.getYaw());

        if (subMode) {
          const flHere = biome.getHeight(camPos.x, camPos.z);
          const clearance = Math.max(0, camPos.y - flHere);
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
            const curr = OC.Navigation.getCurrent ? OC.Navigation.getCurrent() : null;
            const cKnots = curr ? curr.length() * 1.94384 : 0;
            subCurrentEl.textContent = cKnots.toFixed(1) + ' уз';
            subCurrentEl.classList.toggle('warn', cKnots > 1.8);
          }
          if (subPhaseEl) subPhaseEl.textContent = dayW < 0.35 ? 'Ночь · Био' : (dayW < 0.7 ? 'Сумерки' : 'День');
          drawEchosounder(camPos, OC.Navigation.getYaw(), biome, fauna, time);
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
