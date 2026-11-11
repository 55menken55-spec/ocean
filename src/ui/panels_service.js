/* ================= СЕРВИСНЫЕ ПАНЕЛИ HUD ================= */
/* Верхние/боковые кнопки: режимы навигации (плавание/орбита/тур/кино), сброс к старту,
   звук, прожектор, атлас, глобус, сонар с 3D-батиметрией, гидрофон (FFT + пеленг),
   туман мини-карты и карточка гида-тура. Состояние (subMode, sonarPingState) живёт
   в main.js и читается через ctx; модуль только вешает обработчики и красит UI. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._HudPanelsService = {
    bind(ctx) {
      const T = THREE;
      const toast = ctx.toast;
      const activeBiome = () => ctx.getBiome();
      const getFauna = () => ctx.getFauna();
      const isSubMode = ctx.isSubMode || (() => false);
      const setSubMode = ctx.setSubMode || (() => {});
      const patchSonarState = ctx.patchSonarState || (() => {});
      const getSonarState = ctx.getSonarState || (() => ({ t: -10, range: 140, kind: 'none', label: 'Сканер · Чисто', hit: false }));
      const getPendingPhotoCapture = ctx.getPendingPhotoCapture || (() => false);
      const setPendingPhotoCapture = ctx.setPendingPhotoCapture || (() => {});

      const _fwd = new T.Vector3();
      const btnSwim = document.getElementById('btn-mode-swim');
      const btnOrbit = document.getElementById('btn-mode-orbit');
      const btnTour = document.getElementById('btn-explore');
      const btnCinemaMode = document.getElementById('btn-mode-cinema');
      const btnReset = document.getElementById('btn-reset');
      const btnSound = document.getElementById('btn-sound');
      const btnFlash = document.getElementById('btn-flash');
      const btnAtlas = document.getElementById('btn-atlas');
      const btnGlobe = document.getElementById('btn-globe');
      const btnSonar = document.getElementById('btn-sonar');
      const btnHydro = document.getElementById('btn-hydro');
      const btnSub = document.getElementById('btn-sub');
      const subHud = document.getElementById('sub-hud');
      const sonarBox = document.getElementById('sonar-box');
      const sonarReadout = document.getElementById('sonar-readout');
      const hydroBox = document.getElementById('hydro-box');
      const hydroListenBtn = document.getElementById('hydro-listen-btn');
      const hydroTrackBtn = document.getElementById('hydro-track-btn');
      const mapCovEl = document.getElementById('map-cov');
      const mapFogBtn = document.getElementById('map-fog-btn');
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

      let setCinemaUI = () => {};

      /* ---------- Звук океана ---------- */
      function syncSound(on) {
        if (!btnSound) return;
        btnSound.classList.toggle('on', on);
        btnSound.title = on ? 'Звук океана включён (M)' : 'Включить звук океана (M)';
        btnSound.setAttribute('aria-pressed', on);
      }
      syncSound(false);
      if (btnSound) {
        btnSound.addEventListener('click', (e) => {
          e.stopPropagation();
          syncSound(OC.sound.toggle());
        });
      }

      /* ---------- Прожектор ---------- */
      function syncFlash(on) {
        if (!btnFlash) return;
        btnFlash.classList.toggle('on', on);
        btnFlash.title = on ? 'Прожектор включён (F)' : 'Включить прожектор батискафа (F)';
        btnFlash.setAttribute('aria-pressed', on);
      }
      syncFlash(false);
      if (btnFlash) {
        btnFlash.addEventListener('click', (e) => {
          e.stopPropagation();
          const on = OC.toggleFlashlight();
          syncFlash(on);
          toast(on ? 'Прожектор включён' : 'Прожектор выключен');
        });
      }

      /* ---------- Атлас и глобус ---------- */
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

      /* ---------- Режим батискафа ---------- */
      function syncSubMode(on) {
        setSubMode(!!on);
        if (typeof document !== 'undefined' && document.body) {
          document.body.classList.toggle('sub-on', !!on);
        }
        if (btnSub) {
          btnSub.classList.toggle('on', !!on);
          btnSub.setAttribute('aria-pressed', !!on);
        }
        if (subHud) subHud.classList.toggle('hidden', !on);
        if (sonarBox) sonarBox.classList.toggle('hidden', !on);
        if (OC.setSubViewportOptics) OC.setSubViewportOptics(!!on);
      }
      syncSubMode(false);
      if (btnSub) {
        btnSub.addEventListener('click', (e) => {
          e.stopPropagation();
          syncSubMode(!isSubMode());
          toast(isSubMode() ? 'Режим батискафа: эхолот и приборы включены' : 'Режим свободного дайвера');
        });
      }

      /* ---------- Сонар: ближний скан фауны + 3D-батиметрия ---------- */
      function fireSonarPing() {
        const cam = OC.getCamera();
        const fauna = getFauna();
        if (!cam || !fauna) return;
        OC.Navigation.getForward(_fwd);
        const res = fauna.scanForward(cam.position, _fwd, 140);
        patchSonarState({ t: OC.uTime.value, range: res.range, kind: res.kind, label: res.label, hit: res.hit });
        if (OC.Expedition && activeBiome()) OC.Expedition.recordSonarPing(activeBiome().id, res);
        if (fauna.notifySonarPing) fauna.notifySonarPing(cam.position);
        OC.Minimap.triggerPing(cam.position.x, cam.position.z);
        const scanRes = (OC.Sonar && activeBiome()) ? OC.Sonar.triggerScan(activeBiome(), cam.position, OC.Navigation.getYaw(), 165) : null;
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
      }
      if (btnSonar) {
        btnSonar.addEventListener('click', (e) => {
          e.stopPropagation();
          fireSonarPing();
        });
      }

      /* ---------- Гидрофон ---------- */
      function syncHydroMode(on) {
        const next = (OC.Hydrophone && OC.Hydrophone.setOpen) ? OC.Hydrophone.setOpen(on) : !!on;
        if (btnHydro) {
          btnHydro.classList.toggle('on', next);
          btnHydro.setAttribute('aria-pressed', next);
        }
        if (hydroBox) hydroBox.classList.toggle('hidden', !next);
      }
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

      /* ---------- Туман войны мини-карты ---------- */
      function syncFogButton() {
        const fogOn = !(OC.Minimap && OC.Minimap.isFogEnabled && !OC.Minimap.isFogEnabled());
        if (mapFogBtn) {
          mapFogBtn.classList.toggle('off', !fogOn);
          mapFogBtn.textContent = fogOn ? 'Туман' : 'Вся';
        }
        if (mapCovEl && OC.Minimap && OC.Minimap.getCoverage) {
          mapCovEl.textContent = OC.Minimap.getCoverage() + '%';
        }
      }
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

      /* ---------- Режимы навигации ---------- */
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
          toast('Возврат к старту: ' + (activeBiome() ? activeBiome().name : 'океан'));
        });
      }

      /* ---------- Карточка гида-тура ---------- */
      function syncGuideCard(st) {
        if (!guideCard) return;
        if (!st || !st.active || !st.leg) {
          guideCard.classList.add('hidden');
          return;
        }
        guideCard.classList.remove('hidden');
        if (ctx.fadeHero) ctx.fadeHero();
        if (guideStep) guideStep.textContent = `Этап ${st.idx + 1} / ${st.total}`;
        if (guideBiome) guideBiome.textContent = activeBiome() ? activeBiome().name : '';
        if (guideTitle) guideTitle.textContent = st.leg.title || '';
        if (guideFact) guideFact.textContent = st.leg.fact || '';
        if (guideProgBar) guideProgBar.style.width = `${(st.progress * 100).toFixed(1)}%`;
        if (guidePause) {
          guidePause.classList.toggle('on', !st.paused);
          guidePause.innerHTML = st.paused ? '&#9654; Продолжить' : '&#10074;&#10074; Пауза';
        }
      }
      if (guidePrev) guidePrev.addEventListener('click', () => OC.Navigation.stepTour(-1));
      if (guidePause) guidePause.addEventListener('click', () => OC.Navigation.toggleTourPause());
      if (guideNext) guideNext.addEventListener('click', () => OC.Navigation.stepTour(1));
      if (guideExit) guideExit.addEventListener('click', () => OC.Navigation.stopTour());

      return {
        syncModes, syncFlash, syncSubMode, syncGuideCard, syncSound, syncHydroMode,
        syncFogButton, fireSonarPing,
        setCinemaUI: (fn) => { setCinemaUI = fn; }
      };
    }
  };
})(window.OC);
