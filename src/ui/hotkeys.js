/* ================= ГОРЯЧИЕ КЛАВИШИ ================= */
/* Единая таблица горячих клавиш: режимы навигации, прожектор, сонар, гидрофон,
   камера/журнал, погода, оптика, лаборатория, ROV, атлас, глобус и помощь (? / F1).
   Все действия инжектируются из main.js, модуль только разбирает код клавиши. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._Hotkeys = {
    bind(ctx) {
      const toast = ctx.toast;
      const activeBiome = () => ctx.getBiome();
      const syncSound = ctx.syncSound || (() => {});
      const syncFlash = ctx.syncFlash || (() => {});
      const syncSubMode = ctx.syncSubMode || (() => {});
      const isSubMode = ctx.isSubMode || (() => false);
      const syncHydroMode = ctx.syncHydroMode || (() => {});
      const fireSonarPing = ctx.fireSonarPing || (() => {});
      const triggerShutter = ctx.triggerShutter || (() => {});
      const toggleLab = ctx.toggleLab || (() => false);
      const toggleRovChase = ctx.toggleRovChase || (() => {});
      const triggerSampleGrab = ctx.triggerSampleGrab || (() => {});
      const toggleRovPanel = ctx.toggleRovPanel || (() => false);
      const triggerCtdCast = ctx.triggerCtdCast || (() => {});
      const syncCamMode = ctx.syncCamMode || (() => {});
      const toggleJournal = ctx.toggleJournal || (() => {});
      const syncFilterUI = ctx.syncFilterUI || (() => {});
      const toggleHud = ctx.toggleHud || (() => {});
      const updateResBadge = ctx.updateResBadge || (() => {});
      const syncWeatherButtons = ctx.syncWeatherButtons || (() => {});
      const triggerDeployBuoy = ctx.triggerDeployBuoy || (() => {});
      const toggleHelp = ctx.toggleHelp || (() => {});
      const isHelpOpen = ctx.isHelpOpen || (() => false);
      const camFovLabel = ctx.camFovLabel || null;

      function onKeyDown(e) {
        if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
        if (e.code === 'KeyM') { syncSound(OC.sound.toggle()); }
        if (e.code === 'KeyF') {
          const on = OC.toggleFlashlight();
          syncFlash(on);
          toast(on ? 'Прожектор включён' : 'Прожектор выключен');
        }
        if (e.code === 'KeyB') {
          syncSubMode(!isSubMode());
          toast(isSubMode() ? 'Режим батискафа: эхолот и приборы включены' : 'Режим свободного дайвера');
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
        if (e.code === 'KeyR') { OC.Navigation.resetToSpawn(); toast('Возврат к старту: ' + (activeBiome() ? activeBiome().name : 'океан')); }
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
          if (activeBiome() && activeBiome().noSurface) {
            toast('Погода на поверхности недоступна в глубоководной зоне');
          } else {
            OC.Weather.cycleMode();
            syncWeatherButtons();
            toast('Погода: ' + OC.Weather.getLabel(activeBiome()));
          }
        }
        if (e.code === 'Escape') {
          if (isHelpOpen()) toggleHelp(true);
          else if (OC.Globe && OC.Globe.isOpen()) OC.Globe.close();
          else if (OC.Atlas.isOpen()) OC.Atlas.toggle();
          else if (ctx.isJournalOpen()) toggleJournal(true);
          else if (ctx.isLabOpen()) toggleLab(true);
          else if (ctx.isRovOpen()) toggleRovPanel(true);
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
      }

      window.addEventListener('keydown', onKeyDown);

      return { onKeyDown };
    }
  };
})(window.OC);
