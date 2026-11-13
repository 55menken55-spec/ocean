/* ================= СЕЗОННЫЙ ЦИКЛ ПЛАНЕТАРНЫХ ВОДНЫХ БИОМОВ ================= */
/* Непрерывный годовой цикл: температура зависит от широты региона и глубины,
   а не переключается скачком между четырьмя состояниями. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const YEAR_SECONDS = 1200;
  const TAU = Math.PI * 2;
  const SEASONS = [
    { id: 'winter', label: 'Зима', icon: '❄' },
    { id: 'spring', label: 'Весна', icon: '🌱' },
    { id: 'summer', label: 'Лето', icon: '☀' },
    { id: 'autumn', label: 'Осень', icon: '🍂' }
  ];
  const CLIMATES = {
    great_barrier_reef: { hemisphere: 'south', amplitudeC: 0.8, depthScaleM: 72, lightAmplitude: 0.035 },
    kelp_forest: { hemisphere: 'north', amplitudeC: 1.8, depthScaleM: 95, lightAmplitude: 0.075 },
    hydrothermal_vents: { hemisphere: 'north', amplitudeC: 0.05, depthScaleM: 260, lightAmplitude: 0.0 },
    arctic_sea: { hemisphere: 'north', amplitudeC: 0.12, depthScaleM: 65, lightAmplitude: 0.13 },
    wreck_atoll: { hemisphere: 'north', amplitudeC: 0.45, depthScaleM: 55, lightAmplitude: 0.025 },
    mariana_trench: { hemisphere: 'north', amplitudeC: 0.04, depthScaleM: 300, lightAmplitude: 0.0 },
    brine_pool: { hemisphere: 'north', amplitudeC: 0.08, depthScaleM: 240, lightAmplitude: 0.0 },
    cenote_caves: { hemisphere: 'north', amplitudeC: 1.1, depthScaleM: 28, lightAmplitude: 0.035 },
    galapagos_upwelling: { hemisphere: 'equatorial', amplitudeC: 0.35, depthScaleM: 85, lightAmplitude: 0.015 },
    amazon_igapo: { hemisphere: 'south', amplitudeC: 0.8, depthScaleM: 32, lightAmplitude: 0.025 },
    baikal: { hemisphere: 'north', amplitudeC: 3.2, depthScaleM: 58, lightAmplitude: 0.11 },
    /* Европа: ось наклонена на 0,1°, год — это 3,53-летний оборот вокруг Юпитера.
       Сезонных температурных контрастов нет: цикл задаёт приливной нагрев и
       интенсивность серпентинитового флюида, поэтому амплитуда минимальна. */
    europa_ocean: { hemisphere: 'equatorial', amplitudeC: 0.15, depthScaleM: 40, lightAmplitude: 0.0 }
  };

  let phase = 0.5; // Стартовая экспедиция: лето в северном полушарии.
  let autoAdvance = true;
  let transition = null;

  function climateFor(biome) {
    return CLIMATES[biome && biome.id] || { hemisphere: 'north', amplitudeC: 0.6, depthScaleM: 80, lightAmplitude: 0.025 };
  }

  function localPhaseFor(climate) {
    return (phase + (climate.hemisphere === 'south' ? 0.5 : 0)) % 1;
  }

  function getState(biome) {
    const climate = climateFor(biome);
    const localPhase = localPhaseFor(climate);
    const sector = Math.floor((((localPhase + 0.125) % 1) * 4));
    const season = SEASONS[sector];
    const warmFactor = -Math.cos(localPhase * TAU);
    const winterFactor = 0.5 + 0.5 * Math.cos(localPhase * TAU);
    const isAmazon = biome && biome.id === 'amazon_igapo';
    const isGalapagos = biome && biome.id === 'galapagos_upwelling';
    const isBaikal = biome && biome.id === 'baikal';
    const isArctic = biome && biome.id === 'arctic_sea';
    const isKelp = biome && biome.id === 'kelp_forest';
    const isEuropa = biome && biome.id === 'europa_ocean';
    const isDeep = biome && (biome.id === 'hydrothermal_vents' || biome.id === 'mariana_trench' || biome.id === 'brine_pool');
    const floodFactor = isAmazon ? 0.5 + 0.5 * Math.cos((localPhase - 0.34) * TAU) : 0;
    const upwellingFactor = isGalapagos ? 1.0 - warmFactor * 0.28 : 1.0;
    const iceFactor = isBaikal ? winterFactor : (isArctic ? 0.68 + winterFactor * 0.32 : (isEuropa ? 1.0 : 0));
    const currentFactor = isGalapagos
      ? 0.78 + upwellingFactor * 0.22
      : (isAmazon ? 0.84 + floodFactor * 0.28 : (isKelp ? 1.0 + warmFactor * 0.1 : (isEuropa ? 0.94 + warmFactor * 0.08 : (biome && biome.id === 'great_barrier_reef' ? 1.0 + warmFactor * 0.045 : 1.0))));
    const faunaActivity = isGalapagos
      ? 0.82 + upwellingFactor * 0.2
      : (isKelp ? 0.92 + warmFactor * 0.08 : (isAmazon ? 0.92 + floodFactor * 0.12 : (isEuropa ? 0.9 + warmFactor * 0.1 : (isDeep ? 1.0 : 1.0 + warmFactor * 0.035))));
    const productivityFactor = isKelp
      ? 0.88 + (0.5 + 0.5 * warmFactor) * 0.24
      : (isEuropa ? 0.86 + (0.5 + 0.5 * warmFactor) * 0.24 : 1.0);
    return {
      id: season.id,
      label: season.label,
      icon: season.icon,
      phase,
      localPhase,
      hemisphere: climate.hemisphere,
      warmFactor,
      winterFactor,
      iceFactor,
      floodFactor,
      waterLevelM: isAmazon ? (floodFactor - 0.5) * 2.2 : 0,
      turbidityAdd: isAmazon ? 0.0003 + floodFactor * 0.0016 : 0,
      waterTint: isAmazon ? floodFactor * 0.08 : 0,
      upwellingFactor,
      currentFactor,
      faunaActivity,
      productivityFactor,
      lightFactor: 1 + warmFactor * climate.lightAmplitude,
      progress: localPhase
    };
  }

  function getUpwellingFactor(biome) {
    const id = typeof biome === 'string' ? biome : (biome && biome.id);
    if (id !== 'galapagos_upwelling') return 1.0;
    return 1.0 + Math.cos(phase * TAU) * 0.28;
  }

  function getTemperatureDelta(biome, depthM) {
    const climate = climateFor(biome);
    const phaseLocal = localPhaseFor(climate);
    const isEuropa = biome && biome.id === 'europa_ocean';
    // У Европы «поверхность» воды — основание ледяного панциря на 25 км глубже,
    // поэтому глубину считаем от основания панциря, а не от поверхности спутника.
    const depth = isEuropa
      ? Math.max(0, Math.abs(Number.isFinite(depthM) ? depthM : 0) - (biome.depthOffset || 0))
      : (Number.isFinite(depthM) ? Math.abs(depthM) : 0);
    const surfaceInfluence = Math.exp(-Math.max(0, depth) / climate.depthScaleM);
    return climate.amplitudeC * -Math.cos(phaseLocal * TAU) * surfaceInfluence;
  }

  OC.Seasons = {
    YEAR_SECONDS,
    update(dt) {
      const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.25) : 0;
      if (autoAdvance) {
        phase = (phase + step / YEAR_SECONDS) % 1;
      } else if (transition && step > 0) {
        transition.elapsed = Math.min(transition.duration, transition.elapsed + step);
        const t = transition.elapsed / transition.duration;
        const eased = t * t * (3 - 2 * t);
        phase = ((transition.from + transition.delta * eased) % 1 + 1) % 1;
        if (transition.elapsed >= transition.duration) {
          phase = transition.to;
          transition = null;
        }
      }
      return phase;
    },
    getPhase: () => phase,
    setPhase(value) {
      if (!Number.isFinite(value)) return phase;
      phase = ((value % 1) + 1) % 1;
      transition = null;
      return phase;
    },
    setAutoAdvance(value) {
      autoAdvance = !!value;
      if (autoAdvance) transition = null;
      return autoAdvance;
    },
    isAutoAdvance: () => autoAdvance,
    selectSeason(id, biome) {
      const index = SEASONS.findIndex((season) => season.id === id);
      if (index < 0) return false;
      autoAdvance = false;
      const climate = climateFor(biome);
      const localTarget = index * 0.25;
      const target = ((localTarget - (climate.hemisphere === 'south' ? 0.5 : 0)) % 1 + 1) % 1;
      let delta = target - phase;
      if (delta > 0.5) delta -= 1;
      else if (delta < -0.5) delta += 1;
      transition = { from: phase, to: target, delta, elapsed: 0, duration: 3.5 };
      return true;
    },
    getState,
    getTemperatureDelta,
    getUpwellingFactor
  };
})(window.OC);
