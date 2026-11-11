/* ================= HUD: ВРЕМЯ СУТОК, ПОГОДА, ОПТИКА И ВИДИМОСТЬ HUD ================= */
/* Слайдер суточного цикла с пресетами рассвет/полдень/закат/ночь, кнопки погоды,
   профили качества с Auto-LOD, индикатор динамического разрешения и кнопка «глаз».
   Состояние (autoCycle, hudHidden, активный биом) живёт в main.js и приходит через ctx. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._HudPanelsOptions = {
    bind(ctx) {
      const toast = ctx.toast;
      const activeBiome = () => ctx.getBiome();
      const isHudHidden = ctx.isHudHidden || (() => false);
      const setHudHidden = ctx.setHudHidden || (() => {});
      const isAutoCycle = ctx.isAutoCycle || (() => true);
      const setAutoCycle = ctx.setAutoCycle || (() => {});

      const hudEls = document.querySelectorAll('.hud-hideable');
      const btnAuto = document.getElementById('btn-auto');
      const timeSlider = document.getElementById('time-slider');
      const timeLabel = document.getElementById('time-label');
      const weatherBtnsEl = document.getElementById('weather-btns');
      const weatherGroupEl = document.getElementById('weather-group');
      const qualityBtnsEl = document.getElementById('quality-btns');
      const resBadgeEl = document.getElementById('res-badge');
      const resScaleEl = document.getElementById('res-scale');
      const resQualityEl = document.getElementById('res-quality');
      const hudToggleEl = document.getElementById('hud-toggle');

    function syncAuto() {
      if (!btnAuto) return;
      btnAuto.classList.toggle('on', isAutoCycle());
      btnAuto.textContent = isAutoCycle() ? '⟳ Суточный цикл: Вкл' : '⟳ Суточный цикл: Пауза';
    };
    syncAuto();
    if (btnAuto) {
      btnAuto.addEventListener('click', () => {
        setAutoCycle(!isAutoCycle());
        syncAuto();
      });
    }

    function setTOD(val, label) {
      OC.setTimeOfDay(val);
      if (timeSlider) timeSlider.value = Math.round(val * 100);
      setAutoCycle(false);
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
        setAutoCycle(false);
        syncAuto();
      });
    }

    /* Кнопки управления погодой (Авто / Штиль / Зыбь / Шторм) */
    function syncWeatherButtons() {
      if (!weatherBtnsEl || !OC.Weather) return;
      const m = OC.Weather.getMode();
      weatherBtnsEl.querySelectorAll('button[data-w]').forEach((b) => {
        b.classList.toggle('on', b.getAttribute('data-w') === m);
      });
      if (weatherGroupEl) {
        const bNow = activeBiome();
        weatherGroupEl.style.opacity = (bNow && bNow.noSurface) ? '0.45' : '1';
      }
    };
    if (weatherBtnsEl && OC.Weather) {
      weatherBtnsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-w]');
        if (!btn) return;
        const m = btn.getAttribute('data-w');
        OC.Weather.setMode(m);
        syncWeatherButtons();
        toast('Погода: ' + OC.Weather.getLabel(activeBiome()));
      });
      syncWeatherButtons();
    }

    /* Кнопки выбора качества графики и адаптивного Auto-LOD */
    const btnAutoLod = document.getElementById('btn-auto-lod');
    const qualityLodStatus = document.getElementById('quality-lod-status');
    function renderQualityButtons() {
      const activeId = OC.Quality.getId();
      if (qualityBtnsEl) {
        qualityBtnsEl.querySelectorAll('button[data-q]').forEach((b) => {
          b.classList.toggle('on', b.getAttribute('data-q') === activeId);
        });
      }
      const autoOn = !!(OC.Quality.isAutoLod && OC.Quality.isAutoLod());
      if (btnAutoLod) {
        btnAutoLod.classList.toggle('on', autoOn);
        btnAutoLod.textContent = autoOn ? 'Авто-LOD: Вкл' : 'Авто-LOD: Выкл';
      }
      if (qualityLodStatus) {
        const al = OC.Quality.getAutoLodState ? OC.Quality.getAutoLodState() : null;
        const p95Txt = al && al.p95CpuMs > 0 ? (' · p95 ' + al.p95CpuMs.toFixed(1) + ' мс') : '';
        qualityLodStatus.textContent = (autoOn ? 'Авто: ' : 'Ручной: ') + OC.Quality.get().label + p95Txt;
      }
    };
    if (qualityBtnsEl) {
      qualityBtnsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-q]');
        if (!btn) return;
        const id = btn.getAttribute('data-q');
        const p = OC.Quality.set(id);
        if (OC.Expedition && OC.Expedition.saveQuality) OC.Expedition.saveQuality(id);
        renderQualityButtons();
        toast('Качество графики: ' + p.label + ' (ручной профиль)');
      });
    }
    if (btnAutoLod) {
      btnAutoLod.addEventListener('click', () => {
        if (!OC.Quality.setAutoLod) return;
        const next = OC.Quality.setAutoLod(!OC.Quality.isAutoLod());
        renderQualityButtons();
        toast(next ? 'Адаптивный Auto-LOD включён (по p95 кадра)' : 'Адаптивный Auto-LOD выключен');
      });
    }
    OC.Quality.onChange(() => renderQualityButtons());
    renderQualityButtons();

    /* Индикатор оптики: профиль качества, динамическое разрешение и масштаб пикселей */
    function updateResBadge() {
      if (!resBadgeEl) return;
      const qLabel = OC.Quality && OC.Quality.get ? OC.Quality.get().label : '—';
      const st = (OC.Quality && OC.Quality.getDynamicResolution) ? OC.Quality.getDynamicResolution() : null;
      const scalePct = st ? Math.round(st.scale * 100) : 100;
      if (resScaleEl) resScaleEl.textContent = scalePct + '%';
      if (resQualityEl) resQualityEl.textContent = qLabel;
      resBadgeEl.classList.toggle('low', scalePct < 80);
    };
    updateResBadge();
    if (OC.Quality && OC.Quality.onChange) OC.Quality.onChange(() => updateResBadge());

    /* Кнопка «глаз»: показать/скрыть весь HUD на сенсорных экранах */
    function syncHudToggle() {
      if (!hudToggleEl) return;
      hudToggleEl.classList.toggle('on', isHudHidden());
      hudToggleEl.setAttribute('aria-pressed', isHudHidden() ? 'true' : 'false');
    }
    function toggleHud() {
      setHudHidden(!isHudHidden());
      hudEls.forEach((el) => el.classList.toggle('hud-hidden', isHudHidden()));
      syncHudToggle();
      if (hudToggleEl) hudToggleEl.classList.toggle('show', isHudHidden());
    }
    if (hudToggleEl) {
      hudToggleEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleHud();
      });
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) hudToggleEl.classList.add('show');
    }
    syncHudToggle();

    function syncTimeSlider(pct) {
      if (timeSlider) timeSlider.value = pct;
    }

    function syncClock(t, auto) {
      if (auto) syncTimeSlider(Math.round(t * 100));
      if (!timeLabel) return;
      const hrs = (t * 24) % 24;
      timeLabel.textContent = String(Math.floor(hrs)).padStart(2, '0') + ':' + String(Math.floor((hrs % 1) * 60)).padStart(2, '0');
    }

    return { syncAuto, setTOD, syncWeatherButtons, renderQualityButtons, updateResBadge,
      syncHudToggle, toggleHud, syncClock };
    }
  };
})(window.OC);
