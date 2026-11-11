/* ================= HUD: ФОТОКАМЕРА, КИНО-РЕЖИМ И ЖУРНАЛ ЭКСПЕДИЦИИ ================= */
/* Видоискатель, цветофильтры, CineCam 2.39:1 и журнал миссий/фото/музея.
   Экспорт научного отчёта .MD/.JSON тоже здесь. Состояние приходит через ctx. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._HudPanelsCamera = {
    bind(ctx) {
      const toast = ctx.toast;
      const renderJournal = ctx.renderJournal;
      const getBiome = ctx.getBiome;
      const setJournalTab = ctx.setJournalTab;
      const isHudHidden = ctx.isHudHidden || (() => false);
      const setPendingPhotoCapture = ctx.setPendingPhotoCapture || (() => {});
      const hudEls = document.querySelectorAll('.hud-hideable');
      const activeBiome = () => getBiome();

      const canvas = document.getElementById('scene');
      const btnCam = document.getElementById('btn-cam');
      const btnCamFilter = document.getElementById('btn-cam-filter');
      const btnCinema = document.getElementById('btn-cinema');
      const btnCinemaMode = document.getElementById('btn-mode-cinema');
      const btnJournal = document.getElementById('btn-journal');
      const camHud = document.getElementById('cam-hud');
      const camFovLabel = document.getElementById('cam-fov-label');
      const camPreview = document.getElementById('cam-preview');
      const camFlash = document.getElementById('cam-flash');
      const cinemaBars = document.getElementById('cinema-bars');
      const cinemaHud = document.getElementById('cinema-hud');
      const cinemaFiltersEl = document.getElementById('cinema-filters');
      const journalModal = document.getElementById('journal-modal');
      const journalTabs = document.getElementById('journal-tabs');

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
      setPendingPhotoCapture(true);
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
      hudEls.forEach((el) => el.classList.toggle('hud-hidden', on || isHudHidden()));
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
      setJournalTab('photos');
      if (journalTabs) journalTabs.querySelectorAll('button[data-jtab]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-jtab') === 'photos'));
      if (journalModal) { journalModal.classList.remove('hidden'); renderJournal(); }
    });
    function toggleJournal(forceClose) {
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
        setJournalTab(btn.getAttribute('data-jtab'));
        journalTabs.querySelectorAll('button[data-jtab]').forEach((b) => b.classList.toggle('on', b === btn));
        renderJournal();
      });
    }
    const clearWpBtn = document.getElementById('journal-clear-wp');
    if (clearWpBtn) clearWpBtn.addEventListener('click', () => {
      if (OC.Expedition && activeBiome()) OC.Expedition.clearWaypoint(activeBiome().id);
      toast('Навигационный маяк снят');
    });

    function downloadExpeditionReport(fmt) {
      if (!OC.Expedition || !OC.Expedition.exportReport) return null;
      const exp = OC.Expedition.exportReport(fmt, {
        biome: activeBiome(),
        ctdCast: OC.ROV && OC.ROV.getLastCtdCast ? OC.ROV.getLastCtdCast() : null,
        ecoState: OC.EcoLab && OC.EcoLab.getState ? OC.EcoLab.getState() : null,
        hydroState: OC.Hydrophone && OC.Hydrophone.getState ? OC.Hydrophone.getState() : null,
        mapCoveragePct: OC.Minimap && OC.Minimap.getCoverage ? OC.Minimap.getCoverage() : 0,
        perfStats: OC.getPerfStats ? OC.getPerfStats() : null
      });
      if (!exp) return null;
      try {
        if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
          const blob = new Blob([exp.content], { type: fmt === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = exp.filename;
          if (document.body && document.body.appendChild) document.body.appendChild(a);
          if (typeof a.click === 'function') a.click();
          if (a.parentNode) a.parentNode.removeChild(a);
          setTimeout(() => { try { URL.revokeObjectURL(url); } catch (err) {} }, 2500);
        }
      } catch (e) {}
      toast('Научный отчёт экспортирован: ' + exp.filename);
      return exp;
    };
    const exportMdBtn = document.getElementById('journal-export-md');
    const exportJsonBtn = document.getElementById('journal-export-json');
    if (exportMdBtn) exportMdBtn.addEventListener('click', () => downloadExpeditionReport('md'));
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => downloadExpeditionReport('json'));

      return { syncCamMode, setCinemaUI, triggerShutter, syncFilterUI, toggleJournal, downloadExpeditionReport };
    }
  };
})(window.OC);
