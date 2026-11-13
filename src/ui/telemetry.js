/* ================= ПЕРИОДИЧЕСКОЕ ОБНОВЛЕНИЕ HUD (ТЕЛЕМЕТРИЯ) ================= */
/* Раз в ~0.14 с: приборы батискафа (горизонт, атмосферы, клиренс, фаза воды),
   телеметрия зоны/глубины/температуры/курса/погоды, маячок и авто-прибытие,
   статусы гидрофона, троса и захвата ROV, счётчики потоковых чанков, прогресс
   гида и тосты галоклина. Состояние экосистемы и миссии остаются в main.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._HudTelemetry = {
    bind(ctx) {
      const toast = ctx.toast;
      const getBiome = ctx.getBiome;
      const getFauna = ctx.getFauna;
      const isSubMode = ctx.isSubMode || (() => false);
      const formatHeading = ctx.formatHeading || ((y) => String(y));
      const drawEchosounder = ctx.drawEchosounder || (() => {});
      const detectCenterTarget = ctx.detectCenterTarget || (() => null);
      const onMissionsEvaluated = ctx.onMissionsEvaluated || (() => {});
      const onLabUpdate = ctx.onLabUpdate || (() => {});

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
      const subHorizon = document.getElementById('sub-horizon');
      const subPressure = document.getElementById('sub-pressure');
      const subClearance = document.getElementById('sub-clearance');
      const subSpeedEl = document.getElementById('sub-speed');
      const subCurrentEl = document.getElementById('sub-current');
      const subPhaseEl = document.getElementById('sub-phase');
      const hydroDb = document.getElementById('hydro-db');
      const hydroSource = document.getElementById('hydro-source');
      const hydroBand = document.getElementById('hydro-band');
      const hydroBearingEl = document.getElementById('hydro-bearing');
      const hydroTrackBtn = document.getElementById('hydro-track-btn');
      const statChunks = document.getElementById('stat-chunks');
      const statCorals = document.getElementById('stat-corals');
      const statFish = document.getElementById('stat-fish');
      const statBig = document.getElementById('stat-big');
      const rovPanel = document.getElementById('rov-panel');
      const rovTetherLabel = document.getElementById('rov-tether-label');
      const rovTargetLabel = document.getElementById('rov-target-label');
      const rovFlowLabel = document.getElementById('rov-flow-label');
      const rovCtdChart = document.getElementById('rov-ctd-chart');
      const camTargetEl = document.getElementById('cam-target');
      const labPanel = document.getElementById('lab-panel');
      const guideProgBar = document.getElementById('guide-prog-bar');
      const mapCovEl = document.getElementById('map-cov');

      let wasInBrine = false;
      let lastBrineToastAt = -100;
      let wasInHalocline = false;
      let lastHaloToastAt = -100;
      let lastTetherWarnAt = -100;
      const _fwd = new THREE.Vector3();
      const _rovScanOut = { kind: 'water', species: '', label: '', latin: '', dist: 0, colorHex: 0x58e0ff };

      /* Сбрасываем «пороговые» тосты при смене биома */
      function resetThresholds() {
        wasInBrine = false;
        wasInHalocline = false;
        lastBrineToastAt = -100;
        lastHaloToastAt = -100;
        lastTetherWarnAt = -100;
      }

      /* Один тик HUD: main.js вызывает его не чаще раза в ~0.14 с */
      function update(time, craftPos, camSpeed, flashOn) {
        const biome = getBiome();
        if (!biome) return null;
        const zone = biome.getZoneAt(craftPos.x, craftPos.y, craftPos.z);
        const depthOffset = biome.depthOffset || 0;
        const seasonWaterLevel = (Number.isFinite(biome.seaLevel) ? biome.seaLevel : 0) + (OC.Seasons ? OC.Seasons.getState(biome).waterLevelM : 0);
        const depthM = depthOffset + (depthOffset > 0 ? -craftPos.y : Math.max(0, seasonWaterLevel - craftPos.y));
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
        const wStateNow = OC.Weather ? OC.Weather.getState() : { stormMix: 0 };

        /* --- Гидрофон: dB, доминирующий источник, полоса, пеленг --- */
        if (OC.Hydrophone && OC.Hydrophone.isOpen && OC.Hydrophone.isOpen()) {
          const hs = OC.Hydrophone.getState();
          if (hydroDb) hydroDb.textContent = hs.dbSPL.toFixed(1) + ' dB';
          if (hydroSource) hydroSource.textContent = hs.dominantLabel;
          if (hydroBand) hydroBand.textContent = hs.bandLabel;
          if (hydroBearingEl) {
            if (hs.targetPos) {
              const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
              const dName = dirs[Math.round(hs.bearingDeg / 45) % 8];
              const relSign = hs.relBearingDeg >= 0 ? ('+' + hs.relBearingDeg) : String(hs.relBearingDeg);
              hydroBearingEl.textContent = String(hs.bearingDeg).padStart(3, '0') + '° (' + dName + ') · курс ' + relSign + '°';
            } else {
              hydroBearingEl.textContent = 'Всенаправленный фон';
            }
          }
          if (hydroTrackBtn) hydroTrackBtn.disabled = !hs.targetPos;
        }

        /* --- Телеметрия зоны и глубины --- */
        if (teleZone) teleZone.textContent = zone.shortName;
        if (teleDepth) teleDepth.textContent = (!biome.noSurface && craftPos.y > seasonWaterLevel + 0.1) ? ('+' + (craftPos.y - seasonWaterLevel).toFixed(1) + ' м над водой') : (depthM.toFixed(1) + ' м');
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

        /* --- Навигационный маячок + авто-прибытие --- */
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

          /* Видоискатель фотокамеры */
          if (OC.Expedition.isPhotoMode() && camTargetEl) {
            const tgt = detectCenterTarget(OC.getCamera(), biome, getFauna());
            camTargetEl.textContent = tgt
              ? ('В фокусе: ' + tgt.label + ' (' + tgt.dist.toFixed(0) + ' м)')
              : 'Наведите центр рамки на вид или коралл';
          }
          onMissionsEvaluated(biome, { zoneId: zone.id, depthM, currentKnots: cKnots, dayW, flashOn });
        }

        /* --- Звук океана, мини-карта и часы суточного цикла --- */
        OC.sound.update(depthM, zone.id, dayW, biome.id, wStateNow.stormMix || 0);
        OC.Minimap.update(craftPos, OC.Navigation.getYaw());
        if (mapCovEl && OC.Minimap.getCoverage) mapCovEl.textContent = OC.Minimap.getCoverage() + '%';
        if (ctx.syncClock) ctx.syncClock(OC.getTimeOfDay());

        /* --- Пороговые тосты: рассол и галоклин сенота --- */
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

        /* --- Приборы батискафа --- */
        if (isSubMode()) {
          const flHere = biome.getHeight(craftPos.x, craftPos.z);
          const clearance = Math.max(0, craftPos.y - flHere);
          // Гидростатическое давление: масштаб силы тяжести планеты (Европа — 1/7 земной)
          const pScale = biome.pressureScale || 1;
          const atm = (1 + (depthM / 10.08) * pScale).toFixed(2);
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
            const vInfo = OC.volcanoInfo || {};
            if (vInfo.phase && vInfo.phase !== 'idle') phaseLabel = 'Вулкан · ' + vInfo.label;
            if (fInfo.siltTurbidity && fInfo.siltTurbidity > 0.35) phaseLabel = 'Взвесь грунта · Silt-out';
            else if (inBrineNow) phaseLabel = 'Галоклин · Рассол 230‰';
            else if (inHaloNow) phaseLabel = 'Галоклин сенота · Облако H₂S';
            else if (fInfo.thermoclineActive) phaseLabel = 'Термоклин · Оптическая дымка';
            else if (inCaveCeiling) phaseLabel = 'Карстовая пещера · Свод';
            else if (biome.noSurface) {
              phaseLabel = biome.id === 'mariana_trench' ? 'Гадальная зона · 10 920 м'
                : (biome.id === 'brine_pool' ? 'Сумеречная толща · 650 м'
                  : (biome.id === 'europa_ocean' ? 'Подлёдный океан · 25 000 м' : 'Абиссаль · 2500 м'));
            } else if (fInfo.coralSpawnIntensity > 0.35) phaseLabel = 'Ночь · Нерест кораллов';
            else if (fInfo.dvmPhase === 'dusk_ascent') phaseLabel = 'Сумерки · Миграция DVM';
            else if (biome.hasAurora) {
              phaseLabel = dayW < 0.42 ? 'Полярная ночь · Сияние' : (dayW < 0.72 ? 'Полярные сумерки' : 'Полярный день');
            }
            subPhaseEl.textContent = phaseLabel;
          }
          drawEchosounder(craftPos, OC.Navigation.getYaw(), biome, getFauna(), time);
        }

        /* --- Кабель-трос ROV --- */
        if (OC.ROV && OC.ROV.getTetherState) {
          const tSt = OC.ROV.getTetherState();
          if (tSt.active && tSt.tensionPct >= 88 && time - lastTetherWarnAt > 10) {
            lastTetherWarnAt = time;
            toast('Натяжение кабель-троса ' + tSt.tensionPct + '% (' + tSt.lengthM + '/' + tSt.maxLengthM + ' м) — вернитесь ближе к ' + tSt.anchorLabel + '!');
          }
          if (rovPanel && !rovPanel.classList.contains('closed') && rovTetherLabel) {
            if (tSt.active) {
              rovTetherLabel.textContent = 'Кабель (' + tSt.anchorLabel + '): ' + tSt.lengthM + ' / ' + tSt.maxLengthM + ' м · ' + tSt.tensionPct + '% (' + tSt.status + ')';
              rovTetherLabel.classList.toggle('warn', tSt.tensionPct >= 62 && tSt.tensionPct < 88);
              rovTetherLabel.classList.toggle('crit', tSt.tensionPct >= 88);
            } else {
              rovTetherLabel.textContent = 'Кабель-трос: свёрнут (вкл. Y)';
              rovTetherLabel.classList.remove('warn', 'crit');
            }
          }
        }

        /* --- Панель ROV: захват, течение, CTD --- */
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

        /* --- Счётчики потоковой генерации --- */
        const tStats = OC.Terrain.getStats();
        const fStats = OC.FloraStreamer.getStats();
        if (statChunks) statChunks.textContent = tStats.visible + ' / ' + tStats.total;
        if (statCorals) statCorals.textContent = fStats.activeInstances;
        if (statFish && OC.faunaInfo) statFish.textContent = OC.faunaInfo.schoolFish;
        if (statBig && OC.faunaInfo) statBig.textContent = OC.faunaInfo.big;

        /* --- Прогресс гида-тура --- */
        if (guideProgBar && OC.Navigation.getMode() === 'tour') {
          const tSt = OC.Navigation.getTourState();
          if (tSt && tSt.active) guideProgBar.style.width = `${(tSt.progress * 100).toFixed(1)}%`;
        }

        if (labState) onLabUpdate(labState, !!(labPanel && !labPanel.classList.contains('closed')));

        return { biome, zone, depthM, dayW, cKnots, labState, stormMix: wStateNow.stormMix || 0 };
      }

      return { update, resetThresholds };
    }
  };
})(window.OC);
