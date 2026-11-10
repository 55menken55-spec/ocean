/* ================= ПАССИВНЫЙ ГИДРОФОН И ЖИВАЯ FFT-СПЕКТРОГРАММА («ВОДОПАД») ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const BINS = 64;          // Частотные полосы 0 .. 4000 Гц (62.5 Гц на бин)
  const MAX_HZ = 4000;
  const HZ_PER_BIN = MAX_HZ / BINS;
  const SPEC_W = 228;       // Ширина буфера водопада (px)
  const CANVAS_W = 272;
  const CANVAS_H = 94;

  let canvas = null;
  let ctx = null;
  let wfCanvas = null;
  let wfCtx = null;
  let colImg = null;
  let open = false;
  let simTime = 0;
  let scrollAccum = 0;
  let sonarFlash = 0;

  const bins = new Float32Array(BINS);
  const lut = new Uint8Array(256 * 3);

  const state = {
    open: false,
    dbSPL: 92.0,
    peakHz: 180,
    bandLabel: '40–320 Гц',
    dominantKey: null,
    dominantLabel: 'Фоновый шум океана',
    dominantDist: 0,
    bearingDeg: 0,
    sources: [],
    spectrumBins: bins
  };

  // Предвычисленная палитра спектрограммы (глубокий синий -> бирюзовый -> золотой -> белый)
  (function buildPalette() {
    const stops = [
      [0.00, 2, 12, 24],
      [0.24, 10, 48, 86],
      [0.48, 28, 168, 198],
      [0.72, 91, 232, 176],
      [0.88, 255, 190, 72],
      [1.00, 255, 252, 240]
    ];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let s0 = stops[0], s1 = stops[stops.length - 1];
      for (let k = 0; k < stops.length - 1; k++) {
        if (t >= stops[k][0] && t <= stops[k + 1][0]) {
          s0 = stops[k];
          s1 = stops[k + 1];
          break;
        }
      }
      const f = s1[0] > s0[0] ? (t - s0[0]) / (s1[0] - s0[0]) : 0;
      lut[i * 3] = Math.round(s0[1] + (s1[1] - s0[1]) * f);
      lut[i * 3 + 1] = Math.round(s0[2] + (s1[2] - s0[2]) * f);
      lut[i * 3 + 2] = Math.round(s0[3] + (s1[3] - s0[3]) * f);
    }
  })();

  function ensureWaterfallBuffer() {
    if (wfCanvas) return;
    if (typeof document === 'undefined' || !document.createElement) return;
    wfCanvas = document.createElement('canvas');
    wfCanvas.width = SPEC_W;
    wfCanvas.height = BINS;
    wfCtx = wfCanvas.getContext ? wfCanvas.getContext('2d') : null;
    if (wfCtx) {
      wfCtx.fillStyle = '#020c18';
      wfCtx.fillRect(0, 0, SPEC_W, BINS);
      if (wfCtx.createImageData) colImg = wfCtx.createImageData(2, BINS);
    }
  }

  function addGaussianBand(centerHz, sigmaHz, amp) {
    if (amp <= 0.005) return;
    const minB = Math.max(0, Math.floor((centerHz - sigmaHz * 2.5) / HZ_PER_BIN));
    const maxB = Math.min(BINS - 1, Math.ceil((centerHz + sigmaHz * 2.5) / HZ_PER_BIN));
    for (let b = minB; b <= maxB; b++) {
      const hz = (b + 0.5) * HZ_PER_BIN;
      const d = (hz - centerHz) / sigmaHz;
      bins[b] = Math.min(1.0, bins[b] + amp * Math.exp(-0.5 * d * d));
    }
  }

  function getAcousticProfile(key) {
    if (key === 'whale_humpback') return { mode: 'whale', minHz: 85, maxHz: 380, label: 'Песня горбатого кита' };
    if (key === 'orca') return { mode: 'orca', minHz: 580, maxHz: 2350, label: 'Позывные стаи косаток' };
    if (key === 'beluga' || key === 'narwhal') return { mode: 'whistle', minHz: 950, maxHz: 3150, label: key === 'beluga' ? 'Трели белухи' : 'Эхолокация нарвала' };
    if (key === 'dolphin' || key === 'pink_dolphin') return { mode: 'clicks', minHz: 1150, maxHz: 3450, label: key === 'pink_dolphin' ? 'Эхолокация речного дельфина боуто' : 'Эхолокация дельфинов' };
    if (key === 'electric_eel') return { mode: 'eel', minHz: 260, maxHz: 920, label: 'Разряд электрического угря' };
    if (key === 'piranha') return { mode: 'pulse', minHz: 110, maxHz: 340, label: 'Барабанный стук стаи пираний' };
    if (key === 'arapaima' || key === 'river_stingray') return { mode: 'swim', minHz: 80, maxHz: 360, label: key === 'arapaima' ? 'Глоток воздуха арапаимы' : 'Скольжение ската моторо' };
    if (key === 'galapagos_penguin' || key === 'sea_lion' || key === 'dugong') return { mode: 'pulse', minHz: 320, maxHz: 1450, label: key === 'galapagos_penguin' ? 'Треск погони пингвина' : 'Подводный клич' };
    if (key === 'vent_chimney' || key === 'volcanic_fumarole' || key === 'serpentinite_vent' || key === 'methane_hydrate' || key === 'brine_pool_lake' || key === 'halocline_layer') {
      return { mode: 'rumble', minHz: 40, maxHz: 260, label: key === 'volcanic_fumarole' ? 'Кипение фумарол' : 'Гул сипа / термоисточника' };
    }
    if (key === 'ice_floe' || key === 'iceberg' || key === 'brinicle') return { mode: 'ice', minHz: 190, maxHz: 1580, label: 'Треск пакового льда' };
    if (key === 'shipwreck' || key === 'research_vessel') return { mode: 'vessel', minHz: 55, maxHz: 310, label: key === 'research_vessel' ? 'Шум винта и эхолот НИС' : 'Скрип подводного остова' };
    if (key === 'stalactite' || key === 'stalagmite' || key === 'ariadne_line') return { mode: 'drip', minHz: 520, maxHz: 1050, label: 'Резонанс карстовой пещеры' };
    if (key.startsWith('shark_') || key === 'manta' || key === 'mobula_ray' || key === 'ocean_sunfish' || key === 'oarfish' || key === 'galapagos_shark') {
      return { mode: 'swim', minHz: 90, maxHz: 420, label: 'Гидродинамика крупного вида' };
    }
    return { mode: 'bio', minHz: 240, maxHz: 1100, label: 'Подводный био-отклик' };
  }

  function injectSourceSignature(src, t) {
    const p = getAcousticProfile(src.key);
    const a = OC.clamp(src.amp, 0.08, 1.0);
    if (p.mode === 'whale') {
      const phase = (t * 0.42 + (src.dist % 7)) % 1;
      const f0 = 115 + 165 * Math.sin(phase * Math.PI);
      addGaussianBand(f0, 48, 0.72 * a);
      addGaussianBand(f0 * 1.95, 58, 0.36 * a);
    } else if (p.mode === 'orca') {
      const burst = Math.sin(t * 7.5 + src.bearingDeg) > 0.15 ? 1.0 : 0.18;
      const f0 = 780 + 440 * Math.sin(t * 3.1);
      addGaussianBand(f0, 95, 0.65 * a * burst);
      addGaussianBand(f0 * 2.0, 120, 0.42 * a * burst);
    } else if (p.mode === 'whistle') {
      const f0 = 1550 + 950 * Math.sin(t * 4.8 + src.dist);
      addGaussianBand(f0, 110, 0.68 * a);
    } else if (p.mode === 'clicks') {
      const click = Math.pow(Math.max(0, Math.sin(t * 14.0)), 4);
      addGaussianBand(1950 + 600 * Math.sin(t * 2.7), 160, 0.58 * a);
      addGaussianBand(2950, 260, 0.54 * a * click);
    } else if (p.mode === 'pulse') {
      const beat = Math.pow(Math.max(0, Math.sin(t * 8.2)), 2);
      addGaussianBand(540 + 280 * beat, 95, 0.52 * a);
    } else if (p.mode === 'rumble') {
      addGaussianBand(95 + 35 * Math.sin(t * 1.9), 75, 0.78 * a);
      addGaussianBand(210, 70, 0.38 * a);
    } else if (p.mode === 'ice') {
      const crack = Math.pow(Math.max(0, Math.sin(t * 5.7 + src.dist)), 6);
      addGaussianBand(380, 130, 0.32 * a);
      addGaussianBand(960, 280, 0.64 * a * crack);
    } else if (p.mode === 'vessel') {
      const prop = 0.65 + 0.35 * Math.sin(t * 11.0);
      addGaussianBand(110, 52, 0.68 * a * prop);
      addGaussianBand(220, 62, 0.36 * a * prop);
    } else if (p.mode === 'drip') {
      const drop = Math.pow(Math.max(0, Math.sin(t * 3.4)), 8);
      addGaussianBand(720 + 180 * drop, 70, 0.48 * a * drop);
    } else if (p.mode === 'eel') {
      const zap = Math.pow(Math.max(0, Math.sin(t * 2.2)), 10);
      addGaussianBand(380, 95, 0.36 * a + 0.65 * a * zap);
      addGaussianBand(760, 125, 0.58 * a * zap);
    } else if (p.mode === 'swim') {
      addGaussianBand(160, 75, 0.38 * a * (0.7 + 0.3 * Math.sin(t * 4.0)));
    } else {
      addGaussianBand(480, 140, 0.25 * a);
    }
    return p;
  }

  function renderWaterfall() {
    if (!canvas || !ctx) return;
    ensureWaterfallBuffer();
    if (wfCtx && colImg) {
      // Сдвигаем спектрограмму влево на 2 пикселя
      wfCtx.drawImage(wfCanvas, 2, 0, SPEC_W - 2, BINS, 0, 0, SPEC_W - 2, BINS);
      const d = colImg.data;
      for (let row = 0; row < BINS; row++) {
        // row=0 верх (4000 Гц), row=BINS-1 низ (0 Гц)
        const b = BINS - 1 - row;
        const val = Math.min(255, Math.max(0, Math.round(bins[b] * 255)));
        const r = lut[val * 3];
        const g = lut[val * 3 + 1];
        const bl = lut[val * 3 + 2];
        for (let cx = 0; cx < 2; cx++) {
          const p = (row * 2 + cx) * 4;
          d[p] = r;
          d[p + 1] = g;
          d[p + 2] = bl;
          d[p + 3] = 255;
        }
      }
      wfCtx.putImageData(colImg, SPEC_W - 2, 0);
    }

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (wfCanvas) {
      ctx.drawImage(wfCanvas, 0, 0, SPEC_W, BINS, 0, 0, SPEC_W, CANVAS_H);
    }

    // Правая шкала мгновенного спектра (228..272) + частотная линейка
    ctx.fillStyle = 'rgba(4,16,30,0.92)';
    ctx.fillRect(SPEC_W, 0, CANVAS_W - SPEC_W, CANVAS_H);
    ctx.strokeStyle = 'rgba(88,224,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(SPEC_W + 0.5, 0);
    ctx.lineTo(SPEC_W + 0.5, CANVAS_H);
    ctx.stroke();

    // Столбики живого FFT справа
    for (let b = 0; b < BINS; b += 2) {
      const y = CANVAS_H - ((b + 1.5) / BINS) * CANVAS_H;
      const e = Math.max(bins[b], bins[Math.min(BINS - 1, b + 1)]);
      const w = Math.max(1, e * (CANVAS_W - SPEC_W - 6));
      ctx.fillStyle = e > 0.65 ? '#ffd17a' : (e > 0.35 ? '#5be8b0' : '#38b6ff');
      ctx.fillRect(SPEC_W + 3, y - 1.2, w, 2.2);
    }

    // Горизонтальные частотные метки
    ctx.fillStyle = 'rgba(190,235,250,0.62)';
    ctx.font = '8.5px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText('3.5k', 4, 11);
    ctx.fillText('2.0k', 4, CANVAS_H * 0.5 + 3);
    ctx.fillText('250 Гц', 4, CANVAS_H - 5);
  }

  OC.Hydrophone = {
    init(canvasEl) {
      canvas = canvasEl || null;
      if (canvas) {
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        ctx = canvas.getContext('2d');
      }
      ensureWaterfallBuffer();
      bins.fill(0.06);
      renderWaterfall();
    },

    setOpen(flag) {
      open = !!flag;
      state.open = open;
      return open;
    },

    isOpen() {
      return open;
    },

    toggle() {
      return this.setOpen(!open);
    },

    notifySonarPing() {
      sonarFlash = 1.0;
    },

    listenPeak() {
      if (state.dominantKey && OC.sound && OC.sound.playSpeciesVoice) {
        OC.sound.playSpeciesVoice(state.dominantKey);
        return state.dominantLabel;
      }
      if (OC.sound && OC.sound.sonarPing) OC.sound.sonarPing(65, true);
      return state.dominantLabel;
    },

    update(dt, biome, fauna, camPos, yaw, depthM, stormMix) {
      const safeDt = Math.max(0.01, Math.min(0.1, dt || 0.03));
      simTime += safeDt;
      if (sonarFlash > 0) sonarFlash = Math.max(0, sonarFlash - safeDt * 2.1);

      // 1. Базовый гидродинамический шум среды (волнение, ветер, течение)
      const sm = typeof stormMix === 'number' ? stormMix : 0;
      const d = Math.max(0, depthM || 0);
      const surfAtten = OC.clamp(1.0 - d / 32, 0.15, 1.0);
      for (let b = 0; b < BINS; b++) {
        const hz = (b + 0.5) * HZ_PER_BIN;
        const pink = Math.exp(-hz / 420) * (0.14 + sm * 0.28 * surfAtten);
        const ripple = 0.03 * (0.5 + 0.5 * Math.sin(simTime * (2.3 + b * 0.13) + b));
        bins[b] = Math.min(1.0, pink + ripple);
      }

      // 2. Реальные FFT-бины WebAudio AnalyserNode (если звук включён)
      const liveFft = OC.sound && OC.sound.getSpectrumData ? OC.sound.getSpectrumData() : null;
      if (liveFft && OC.sound.getSampleRate) {
        const sr = OC.sound.getSampleRate();
        const binHz = sr / (liveFft.length * 2);
        for (let b = 0; b < BINS; b++) {
          const hz = (b + 0.5) * HZ_PER_BIN;
          const idx = Math.min(liveFft.length - 1, Math.floor(hz / binHz));
          const val = liveFft[idx] / 255;
          bins[b] = Math.min(1.0, Math.max(bins[b], val * 0.92));
        }
      }

      // 3. Рачки-щелкуны на мелководных рифах (< 24 м)
      const hasShrimp = biome && !biome.noSurface && biome.id !== 'arctic_sea' && biome.id !== 'cenote_caves' && d < 24;
      if (hasShrimp) {
        const clickHz = 1900 + ((Math.sin(simTime * 37.7) * 0.5 + 0.5) * 1750);
        addGaussianBand(clickHz, 190, 0.34 * surfAtten);
      }

      // 4. Активные биоакустические и геологические источники из FaunaEngine
      const sources = (fauna && fauna.scanAcousticSources && camPos)
        ? fauna.scanAcousticSources(camPos, 260)
        : [];
      state.sources = sources;

      let bestProfile = null;
      let bestSource = null;
      for (let i = 0; i < sources.length; i++) {
        const prof = injectSourceSignature(sources[i], simTime);
        if (i === 0) {
          bestSource = sources[i];
          bestProfile = prof;
        }
      }

      // 5. Импульс 3D-сонара 1340 Гц на водопаде
      if (sonarFlash > 0.02) {
        addGaussianBand(1340, 85, 0.95 * sonarFlash);
      }

      // Расчёт пика энергии и уровня звукового давления (dB re 1 µPa)
      let totalE = 0;
      let peakBin = 0;
      let peakVal = -1;
      for (let b = 0; b < BINS; b++) {
        totalE += bins[b];
        if (bins[b] > peakVal) { peakVal = bins[b]; peakBin = b; }
      }
      const meanE = totalE / BINS;
      state.dbSPL = Math.round((86 + meanE * 54 + peakVal * 26) * 10) / 10;
      state.peakHz = Math.round((peakBin + 0.5) * HZ_PER_BIN);

      if (sonarFlash > 0.4) {
        state.dominantKey = null;
        state.dominantLabel = 'Импульс сонара 1.34 кГц';
        state.dominantDist = 0;
        state.bandLabel = '1280–1420 Гц';
      } else if (bestSource && bestProfile) {
        state.dominantKey = bestSource.key;
        state.dominantLabel = bestProfile.label + ' (' + Math.round(bestSource.dist) + ' м)';
        state.dominantDist = Math.round(bestSource.dist);
        state.bearingDeg = Math.round(bestSource.bearingDeg);
        state.bandLabel = bestProfile.minHz + '–' + bestProfile.maxHz + ' Гц';
      } else if (hasShrimp) {
        state.dominantKey = null;
        state.dominantLabel = 'Хор рачков-щелкунов рифа';
        state.dominantDist = 12;
        state.bandLabel = '1.8–3.8 кГц';
      } else {
        state.dominantKey = null;
        state.dominantLabel = sm > 0.45 ? 'Шум штормовой зыби' : 'Фоновый шум океана';
        state.dominantDist = 0;
        state.bandLabel = '40–320 Гц';
      }

      scrollAccum += safeDt;
      if (open && scrollAccum >= 0.045) {
        scrollAccum = 0;
        renderWaterfall();
      }
      return state;
    },

    getState() {
      return state;
    }
  };
})(window.OC);
