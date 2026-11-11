/* ================= HUD: ПАНЕЛИ ЭКОЛАБОРАТОРИИ И АППАРАТА ROV ================= */
/* Привязка панелей лаборатории и «Наутилуса-IV» к DOM. Всё состояние приходит из главного
   модуля через ctx — панели не тянут глобальное состояние сами. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._HudPanelsRov = {
    bind(ctx) {
      const toast = ctx.toast;
      const renderJournal = ctx.renderJournal;
      const getBiome = ctx.getBiome;
      const getFauna = ctx.getFauna;
      const setJournalTab = ctx.setJournalTab;
      const _fwd = ctx.fwd;
      const activeBiome = () => getBiome();
      const activeFauna = () => getFauna();

      const btnLab = document.getElementById('btn-lab');
      const btnPanel = document.getElementById('btn-panel');
      const btnRov = document.getElementById('btn-rov');
      const journalModal = document.getElementById('journal-modal');
      const journalTabs = document.getElementById('journal-tabs');
      const labChart = document.getElementById('lab-chart');
      const labHealthNum = document.getElementById('lab-health-num');
      const labMBleach = document.getElementById('lab-m-bleach');
      const labMCalc = document.getElementById('lab-m-calc');
      const labMFish = document.getElementById('lab-m-fish');
      const labMO2 = document.getElementById('lab-m-o2');
      const labPanel = document.getElementById('lab-panel');
      const labPresetsEl = document.getElementById('lab-presets');
      const labSCurr = document.getElementById('lab-s-curr');
      const labSNutr = document.getElementById('lab-s-nutr');
      const labSPh = document.getElementById('lab-s-ph');
      const labSTemp = document.getElementById('lab-s-temp');
      const labSpeedEl = document.getElementById('lab-speed-btns');
      const labStatus = document.getElementById('lab-status');
      const labVCurr = document.getElementById('lab-v-curr');
      const labVNutr = document.getElementById('lab-v-nutr');
      const labVPh = document.getElementById('lab-v-ph');
      const labVTemp = document.getElementById('lab-v-temp');
      const panel = document.getElementById('panel');
      const rovBtnBuoy = document.getElementById('rov-btn-buoy');
      const rovBtnBuoyRecall = document.getElementById('rov-btn-buoy-recall');
      const rovBtnBuoyView = document.getElementById('rov-btn-buoy-view');
      const rovBtnChase = document.getElementById('rov-btn-chase');
      const rovBtnCtd = document.getElementById('rov-btn-ctd');
      const rovBtnCurrents = document.getElementById('rov-btn-currents');
      const rovBtnMuseum = document.getElementById('rov-btn-museum');
      const rovBtnSample = document.getElementById('rov-btn-sample');
      const rovBtnVessel = document.getElementById('rov-btn-vessel');
      const rovBuoyStatus = document.getElementById('rov-buoy-status');
      const rovClose = document.getElementById('rov-close');
      const rovCtdChart = document.getElementById('rov-ctd-chart');
      const rovCtdO2 = document.getElementById('rov-ctd-o2');
      const rovCtdPress = document.getElementById('rov-ctd-press');
      const rovCtdTemps = document.getElementById('rov-ctd-temps');
      const rovCtdThermo = document.getElementById('rov-ctd-thermo');
      const rovPanel = document.getElementById('rov-panel');
      const rovSampleCount = document.getElementById('rov-sample-count');
      const rovSamplesClear = document.getElementById('rov-samples-clear');
      const rovSamplesEl = document.getElementById('rov-samples');

    function syncLabControls() {
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

    function updateLabDisplay() {
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
          : (st.dissolvedO2 < 4.5 ? 'Дефицит растворённого O₂' : (activeBiome() ? activeBiome().name : 'Модель среды'));
        labStatus.innerHTML = `${st.statusLabel}<small id="lab-biome-note">${note}</small>`;
      }
      if (labMBleach) labMBleach.textContent = Math.round(st.bleaching * 100) + '%';
      if (labMO2) labMO2.textContent = st.dissolvedO2.toFixed(1) + ' мг/л';
      if (labMCalc) labMCalc.textContent = Math.round(st.calcification) + '%';
      if (labMFish) labMFish.textContent = Math.round(st.fishActivity * 100) + '%';
      if (labChart) OC.EcoLab.drawChart(labChart);
    };

    function toggleLab(forceClose) {
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
    function bindLabSlider(el, key, scale) {
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

    function syncRovButtons() {
      const chaseOn = !!(OC.Navigation.isRovView && OC.Navigation.isRovView());
      const currOn = !!(OC.ROV && OC.ROV.isCurrentsVisible && OC.ROV.isCurrentsVisible());
      const panelOpen = !!(rovPanel && !rovPanel.classList.contains('closed'));
      const vInfo = OC.faunaInfo ? OC.faunaInfo.vessel : null;
      const buoysList = (OC.ROV && OC.ROV.getBuoys) ? OC.ROV.getBuoys() : [];
      if (btnRov) btnRov.classList.toggle('on', panelOpen || chaseOn || currOn);
      if (rovBtnChase) rovBtnChase.classList.toggle('on', chaseOn);
      if (rovBtnCurrents) rovBtnCurrents.classList.toggle('on', currOn);
      if (rovBtnVessel) {
        rovBtnVessel.disabled = !vInfo;
        rovBtnVessel.title = vInfo
          ? ('Всплыть к судну ' + vInfo.name)
          : 'Надводное судно недоступно в глубоководной зоне';
      }
      if (rovBtnBuoyView) rovBtnBuoyView.disabled = buoysList.length === 0;
      if (rovBtnBuoyRecall) rovBtnBuoyRecall.disabled = buoysList.length === 0;
      if (rovBuoyStatus) {
        if (buoysList.length) {
          const lastB = buoysList[buoysList.length - 1];
          rovBuoyStatus.textContent = 'Автономные буи: ' + buoysList.length + ' / 2 (посл. ' + lastB.depthM + ' м)';
        } else {
          rovBuoyStatus.textContent = 'Автономные буи: 0 / 2';
        }
      }
    };

    function updateRovCtdDisplay(castOverride) {
      if (!OC.ROV) return;
      const cast = castOverride || OC.ROV.getLastCtdCast();
      if (!cast) return;
      if (rovCtdThermo) rovCtdThermo.textContent = cast.thermoclineM > cast.minDepthM + 3 ? (cast.thermoclineM + ' м') : 'Однородно';
      if (rovCtdTemps) rovCtdTemps.textContent = cast.bottomTemp.toFixed(1) + ' / ' + cast.surfaceTemp.toFixed(1) + ' °C';
      if (rovCtdO2) rovCtdO2.textContent = cast.minO2.toFixed(1) + ' мг/л';
      if (rovCtdPress) rovCtdPress.textContent = cast.maxPressureAtm.toFixed(1) + ' атм';
      if (rovCtdChart && activeBiome()) {
        const craft = OC.Navigation.getPosition();
        const off = activeBiome().depthOffset || 0;
        const dNow = off + (off > 0 ? -craft.y : Math.max(0, -craft.y));
        OC.ROV.drawCtdChart(rovCtdChart, dNow);
      }
    };

    function renderRovSamples() {
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

    function triggerSampleGrab() {
      if (!OC.ROV || !activeBiome()) return null;
      const pos = OC.Navigation.getPosition();
      OC.Navigation.getForward(_fwd);
      const labSt = OC.EcoLab ? OC.EcoLab.getState() : null;
      const smp = OC.ROV.grabSample(activeBiome(), pos, _fwd, labSt);
      const fauna = activeFauna();
      if (fauna && fauna.notifySiltKick) {
        const fl = activeBiome().getHeight(pos.x, pos.z);
        if (pos.y - fl < 6.0) fauna.notifySiltKick(pos, 1.0);
      }
      renderRovSamples();
      if (smp) toast('Проба взята: ' + smp.title + ' (' + smp.category + (smp.isNewAtlas ? ' · Атлас!' : '') + ')');
      return smp;
    }

    function triggerCtdCast() {
      if (!OC.ROV || !activeBiome()) return null;
      const pos = OC.Navigation.getPosition();
      const labSt = OC.EcoLab ? OC.EcoLab.getState() : null;
      const cast = OC.ROV.runCtdCast(activeBiome(), pos, labSt);
      updateRovCtdDisplay(cast);
      if (cast) {
        toast('CTD-зонд: дно ' + cast.maxDepthM + ' м · ' + cast.bottomTemp + ' °C · мин. O₂ ' + cast.minO2 + ' мг/л');
      }
      return cast;
    }

    function triggerDeployBuoy() {
      if (!OC.ROV || !OC.ROV.deployBuoy || !activeBiome()) return null;
      const pos = OC.Navigation.getPosition();
      const b = OC.ROV.deployBuoy(activeBiome(), pos, OC.Navigation.getYaw());
      syncRovButtons();
      if (b) toast(b.label + ' установлен на глубине ' + b.depthM + ' м (ретрансляция гидрофона)');
      return b;
    }

    function toggleRovChase() {
      if (!OC.Navigation.toggleRovView) return;
      const on = OC.Navigation.toggleRovView();
      syncRovButtons();
      toast(on ? 'Вид от 3-го лица: ROV «Наутилус-IV» (Y)' : 'Вид из кабины / от 1-го лица');
    }

    function toggleRovPanel(forceClose) {
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
    }

    syncRovButtons();
    renderRovSamples();

    return { syncLabControls, updateLabDisplay, toggleLab, syncRovButtons, updateRovCtdDisplay,
      renderRovSamples, toggleRovPanel, toggleRovChase, triggerSampleGrab, triggerCtdCast,
      triggerDeployBuoy };
    }
  };
})(window.OC);
