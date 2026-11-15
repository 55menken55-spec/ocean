/* ================= ЭКОЛОГИЧЕСКАЯ ЛАБОРАТОРИЯ: СТРЕСС-ТЕСТ РИФА И БИОДИНАМИКА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const HIST_LEN = 80;
  const histHealth = new Float32Array(HIST_LEN);
  const histBleach = new Float32Array(HIST_LEN);
  let histHead = 0;
  let histCount = 0;
  let sampleAccum = 0;

  const PRESETS = [
    {
      id: 'norm',
      label: 'Норма (Баланс)',
      tempDelta: 0.0,
      pH: 8.10,
      nutrients: 0.18,
      currentMult: 1.0
    },
    {
      id: 'heatwave',
      label: 'Тепловая волна',
      tempDelta: 3.2,
      pH: 8.00,
      nutrients: 0.24,
      currentMult: 0.5
    },
    {
      id: 'acid_hypoxia',
      label: 'Закисление и Гипоксия',
      tempDelta: 1.8,
      pH: 7.62,
      nutrients: 0.88,
      currentMult: 0.35
    },
    {
      id: 'upwelling',
      label: 'Апвеллинг (Охлаждение)',
      tempDelta: -1.1,
      pH: 8.20,
      nutrients: 0.10,
      currentMult: 1.85
    }
  ];

  const controls = {
    tempDelta: 0.0,     // -2.0 .. +4.5 °C
    pH: 8.10,           // 7.55 .. 8.25
    nutrients: 0.18,    // 0.0 .. 1.0 (эвтрофикация и цветение)
    currentMult: 1.0,   // 0.2 .. 3.0 x
    timeScale: 1,       // 1 | 5 | 20
    presetId: 'norm'
  };

  const state = {
    tempDelta: 0.0,
    pH: 8.10,
    nutrients: 0.18,
    currentMult: 1.0,
    timeScale: 1,
    presetId: 'norm',
    dhw: 0.0,             // Накопленный тепловой стресс (Degree Heating Weeks усл.)
    bleaching: 0.0,       // 0..1 степень обесцвечивания кораллов
    dissolvedO2: 7.2,     // мг/л
    calcification: 100,   // % скорости роста карбонатного скелета
    fishActivity: 1.0,    // 0.28..1.30 множитель бодрости стай
    turbidityAdd: 0.0,    // добавочная плотность подводного тумана
    algalTint: 0.0,       // 0..1 зеленоватый сдвиг цветения
    clarityBonus: 0.0,    // 0..0.002 просветление в олиготрофной воде
    healthIndex: 96,      // 0..100
    statusLabel: 'Баланс экосистемы',
    statusTone: 'ok'      // 'ok' | 'warn' | 'crit'
  };

  function resetHistory(healthVal, bleachVal) {
    histHealth.fill(healthVal);
    histBleach.fill(bleachVal);
    histHead = 0;
    histCount = 1;
    sampleAccum = 0;
  }
  resetHistory(96, 0);

  function pushSample(health, bleach) {
    histHead = (histHead + 1) % HIST_LEN;
    histHealth[histHead] = health;
    histBleach[histHead] = bleach;
    if (histCount < HIST_LEN) histCount++;
  }

  function resolveBiomeBaseline(biome) {
    if (!biome) return { baseTemp: 25.0, heatTolerance: 1.2, hasCorals: true, isAbyss: false };
    if (biome.id === 'arctic_sea') return { baseTemp: -1.3, heatTolerance: 1.4, hasCorals: false, isAbyss: false };
    if (biome.id === 'kelp_forest') return { baseTemp: 11.5, heatTolerance: 1.4, hasCorals: false, isAbyss: false };
    if (biome.id === 'hydrothermal_vents') return { baseTemp: 2.8, heatTolerance: 2.2, hasCorals: false, isAbyss: true };
    if (biome.id === 'mariana_trench') return { baseTemp: 2.1, heatTolerance: 2.4, hasCorals: false, isAbyss: true };
    if (biome.id === 'brine_pool') return { baseTemp: 6.8, heatTolerance: 1.8, hasCorals: false, isAbyss: true };
    if (biome.id === 'cenote_caves') return { baseTemp: 25.4, heatTolerance: 1.8, hasCorals: false, isAbyss: false };
    if (biome.id === 'galapagos_upwelling') return { baseTemp: 19.6, heatTolerance: 1.5, hasCorals: true, isAbyss: false };
    // Подлёдный океан Европы: ни кораллов, ни солнечного света — только хемосинтез
    if (biome.id === 'europa_ocean') return { baseTemp: -1.6, heatTolerance: 3.2, hasCorals: false, isAbyss: true };
    return { baseTemp: 27.0, heatTolerance: 1.1, hasCorals: true, isAbyss: false };
  }

  function stepBioModel(dt, biome, dayW) {
    const simDt = Math.min(0.25, dt || 0.016) * controls.timeScale;
    const base = resolveBiomeBaseline(biome);

    // Охлаждающее влияние апвеллинга/течения снижает эффективный тепловой стресс
    const coolingRelief = Math.max(0, (controls.currentMult - 1.0) * 0.45);
    const effHeatOver = Math.max(0, controls.tempDelta - base.heatTolerance - coolingRelief);

    // Накопление и спад теплового стресса DHW
    const targetDhw = effHeatOver * 4.2;
    const dhwRate = targetDhw > state.dhw ? 0.55 : 0.28;
    state.dhw += (targetDhw - state.dhw) * Math.min(1, simDt * dhwRate);

    // Обесцвечивание кораллов (ускоряется также при сильном закислении pH < 7.85)
    const acidBleachBoost = Math.max(0, (7.90 - controls.pH) * 0.65);
    const targetBleach = OC.clamp((state.dhw / 7.5) + acidBleachBoost * 0.45, 0, 1);
    const bleachRate = targetBleach > state.bleaching
      ? 0.24
      : (0.14 + Math.max(0, (controls.pH - 8.0) * 0.25) + Math.max(0, (controls.currentMult - 1.0) * 0.08));
    state.bleaching += (targetBleach - state.bleaching) * Math.min(1, simDt * bleachRate);
    state.bleaching = OC.clamp(state.bleaching, 0, 1);

    // Растворённый кислород O2 (мг/л): закон Генри (холодная вода держит больше O2) + цветение + течение + фотосинтез
    const waterTemp = Math.max(-1.8, base.baseTemp + controls.tempDelta);
    const henrySat = OC.clamp(11.4 - waterTemp * 0.165, 5.2, 11.4);
    const eutrophicHypoxia = Math.pow(OC.clamp((controls.nutrients - 0.22) / 0.78, 0, 1), 1.35) * 4.2;
    const flowAeration = (controls.currentMult - 1.0) * 0.55;
    const photoBonus = base.isAbyss ? 0 : ((dayW !== undefined ? dayW : 1.0) - 0.5) * 0.45 * (1 - state.bleaching * 0.5);
    const targetO2 = OC.clamp(henrySat - eutrophicHypoxia + flowAeration + photoBonus, 1.8, 12.2);
    state.dissolvedO2 += (targetO2 - state.dissolvedO2) * Math.min(1, simDt * 0.65);

    // Кальцификация рифа (%): падает при закислении и при потере симбионтов (обесцвечивании)
    const phFactor = OC.clamp((controls.pH - 7.50) / 0.62, 0.12, 1.15);
    const targetCalc = OC.clamp(phFactor * (1.0 - state.bleaching * 0.62) * 100, 4, 118);
    state.calcification += (targetCalc - state.calcification) * Math.min(1, simDt * 0.7);

    // Активность стайных рыб: угнетается при гипоксии (O2 < 4.8) и экстремальном перегреве/шторме течений
    const o2Penalty = OC.smoothstep(2.0, 5.2, state.dissolvedO2);
    const heatPenalty = 1.0 - OC.clamp((controls.tempDelta - 2.4) / 3.5, 0, 0.42);
    const flowBonus = controls.currentMult > 2.3 ? 0.85 : (1.0 + (controls.currentMult - 1.0) * 0.12);
    state.fishActivity = OC.clamp(OC.lerp(0.32, 1.05, o2Penalty) * heatPenalty * flowBonus, 0.28, 1.32);

    // Водная оптика: цветение фитопланктона при эвтрофикации (nutrients > 0.2)
    const bloom = OC.clamp((controls.nutrients - 0.20) / 0.80, 0, 1);
    state.turbidityAdd = bloom * bloom * 0.0115;
    state.algalTint = OC.clamp(bloom * 0.82, 0, 0.82);
    state.clarityBonus = controls.nutrients < 0.18 ? (0.18 - controls.nutrients) * 0.008 : 0.0;

    // Интегральный индекс здоровья экосистемы (0..100)
    const bleachPen = state.bleaching * (base.hasCorals ? 48 : 26);
    const phPen = Math.max(0, (8.05 - controls.pH) * 52);
    const hypPen = Math.max(0, (5.5 - state.dissolvedO2) * 10.5);
    const bloomPen = bloom * 18;
    const rawHealth = 100 - bleachPen - phPen - hypPen - bloomPen + Math.min(6, Math.max(0, (controls.currentMult - 1.0) * 4));
    const targetHealth = OC.clamp(Math.round(rawHealth), 4, 100);
    state.healthIndex += (targetHealth - state.healthIndex) * Math.min(1, simDt * 0.9);

    const hi = Math.round(state.healthIndex);
    if (state.bleaching > 0.65) {
      state.statusLabel = 'Критическое обесцвечивание';
      state.statusTone = 'crit';
    } else if (state.dissolvedO2 < 4.2) {
      state.statusLabel = 'Гипоксия и цветение воды';
      state.statusTone = 'crit';
    } else if (state.bleaching > 0.22 || hi < 62) {
      state.statusLabel = targetBleach < state.bleaching ? 'Восстановление рифа' : 'Экологический стресс';
      state.statusTone = 'warn';
    } else if (hi >= 86 && controls.currentMult >= 1.2 && controls.tempDelta <= 0.2) {
      state.statusLabel = 'Высокая продуктивность';
      state.statusTone = 'ok';
    } else {
      state.statusLabel = 'Баланс экосистемы';
      state.statusTone = 'ok';
    }

    state.tempDelta = controls.tempDelta;
    state.pH = controls.pH;
    state.nutrients = controls.nutrients;
    state.currentMult = controls.currentMult;
    state.timeScale = controls.timeScale;
    state.presetId = controls.presetId;

    sampleAccum += simDt;
    if (sampleAccum >= 0.45) {
      sampleAccum = 0;
      pushSample(state.healthIndex, state.bleaching * 100);
    }
    return state;
  }

  function drawChart(canvas) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width || 298;
    const h = canvas.height || 72;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(3, 14, 26, 0.82)';
    ctx.fillRect(0, 0, w, h);

    // Горизонтальная сетка 25%, 50%, 75%
    ctx.strokeStyle = 'rgba(130, 222, 255, 0.11)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const gy = (h * i) / 4;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    const n = histCount;
    if (n < 2) return;

    // Кривая обесцвечивания (бледно-янтарная пунктиром)
    ctx.strokeStyle = 'rgba(255, 181, 116, 0.78)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const idx = (histHead - n + 1 + i + HIST_LEN) % HIST_LEN;
      const x = (i / (HIST_LEN - 1)) * w;
      const y = h - 4 - (OC.clamp(histBleach[idx], 0, 100) / 100) * (h - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Кривая индекса здоровья (цвет зависит от текущего состояния)
    const toneCol = state.statusTone === 'crit' ? '#ff6b6b' : (state.statusTone === 'warn' ? '#ffb574' : '#5be8b0');
    ctx.strokeStyle = toneCol;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const idx = (histHead - n + 1 + i + HIST_LEN) % HIST_LEN;
      const x = (i / (HIST_LEN - 1)) * w;
      const y = h - 4 - (OC.clamp(histHealth[idx], 0, 100) / 100) * (h - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function syncControlsToState() {
    state.tempDelta = controls.tempDelta;
    state.pH = controls.pH;
    state.nutrients = controls.nutrients;
    state.currentMult = controls.currentMult;
    state.timeScale = controls.timeScale;
    state.presetId = controls.presetId;
  }

  OC.EcoLab = {
    getPresets: () => PRESETS,
    getState: () => state,
    getControls: () => controls,
    setParam(key, value) {
      if (key === 'tempDelta') controls.tempDelta = OC.clamp(Number(value) || 0, -2.0, 4.5);
      else if (key === 'pH') controls.pH = OC.clamp(Number(value) || 8.1, 7.55, 8.25);
      else if (key === 'nutrients') controls.nutrients = OC.clamp(Number(value) || 0, 0, 1.0);
      else if (key === 'currentMult') controls.currentMult = OC.clamp(Number(value) || 1.0, 0.2, 3.0);
      else if (key === 'timeScale') controls.timeScale = OC.clamp(Math.round(Number(value) || 1), 1, 20);
      if (key !== 'timeScale') controls.presetId = 'custom';
      syncControlsToState();
      return controls;
    },
    applyPreset(id) {
      const p = PRESETS.find((x) => x.id === id);
      if (!p) return null;
      controls.tempDelta = p.tempDelta;
      controls.pH = p.pH;
      controls.nutrients = p.nutrients;
      controls.currentMult = p.currentMult;
      controls.presetId = p.id;
      syncControlsToState();
      return p;
    },
    reset() {
      this.applyPreset('norm');
      controls.timeScale = 1;
      syncControlsToState();
      state.dhw = 0;
      state.bleaching = 0;
      state.dissolvedO2 = 7.2;
      state.calcification = 100;
      state.fishActivity = 1.0;
      state.turbidityAdd = 0;
      state.algalTint = 0;
      state.clarityBonus = 0;
      state.healthIndex = 96;
      state.statusLabel = 'Баланс экосистемы';
      state.statusTone = 'ok';
      resetHistory(96, 0);
      return state;
    },
    update: stepBioModel,
    drawChart,
    getHistoryCount: () => histCount
  };
})(window.OC);
