/* ================= МОДАЛКА ПОМОЩИ И ОНБОРДИНГ-ГЕРОЙ ================= */
/* Экран первого запуска (тур / помощь / закрыть) и модальное окно быстрой помощи
   с кнопками-действиями data-help-act. Все действия выполняет main.js через ctx. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._HudPanelsGuide = {
    bind(ctx) {
      const toast = ctx.toast;
      const activeBiome = () => ctx.getBiome();
      const doSubMode = () => ctx.syncSubMode(!ctx.isSubMode());
      const syncFlash = ctx.syncFlash || (() => {});
      const syncHydroMode = ctx.syncHydroMode || (() => {});
      const fireSonarPing = ctx.fireSonarPing || (() => {});
      const triggerSampleGrab = ctx.triggerSampleGrab || (() => {});
      const triggerCtdCast = ctx.triggerCtdCast || (() => {});
      const toggleRovPanel = ctx.toggleRovPanel || (() => false);
      const toggleLab = ctx.toggleLab || (() => false);
      const toggleJournal = ctx.toggleJournal || (() => {});
      const syncCamMode = ctx.syncCamMode || (() => {});
      const syncWeatherButtons = ctx.syncWeatherButtons || (() => {});
      const syncSoundButton = ctx.syncSoundButton || (() => {});

      const hero = document.querySelector('.hero');
      const helpModal = document.getElementById('help-modal');
      const btnHelp = document.getElementById('btn-help');
      const helpClose = document.getElementById('help-close');
      const btnSound = document.getElementById('btn-sound');
      const heroTourBtn = document.getElementById('hero-tour-btn');
      const heroHelpBtn = document.getElementById('hero-help-btn');
      const heroDismiss = document.getElementById('hero-dismiss');

    function toggleHelp(forceClose) {
      if (!helpModal) return;
      const shouldOpen = !forceClose && helpModal.classList.contains('hidden');
      helpModal.classList.toggle('hidden', !shouldOpen);
      if (OC.UI && OC.UI.Rail) OC.UI.Rail.setModalOpen('help', shouldOpen);
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
          else if (act === 'sub') doSubMode();
          else if (act === 'flash') { const on = OC.toggleFlashlight(); syncFlash(on); }
          else if (act === 'sonar') fireSonarPing();
          else if (act === 'hydro') syncHydroMode(!(OC.Hydrophone && OC.Hydrophone.isOpen && OC.Hydrophone.isOpen()));
          else if (act === 'globe' && OC.Globe) OC.Globe.toggle();
          else if (act === 'weather' && OC.Weather && !(activeBiome() && activeBiome().noSurface)) {
            OC.Weather.cycleMode(); syncWeatherButtons(); toast('Погода: ' + OC.Weather.getLabel(activeBiome()));
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
            syncSoundButton(on);
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

      return { toggleHelp, dismissHero, isHelpOpen: () => !!(helpModal && !helpModal.classList.contains('hidden')) };
    }
  };
})(window.OC);
