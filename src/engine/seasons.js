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
    baikal: { hemisphere: 'north', amplitudeC: 3.2, depthScaleM: 58, lightAmplitude: 0.11 }
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
    return {
      id: season.id,
      label: season.label,
      icon: season.icon,
      phase,
      localPhase,
      hemisphere: climate.hemisphere,
      warmFactor,
      lightFactor: 1 + warmFactor * climate.lightAmplitude,
      progress: localPhase
    };
  }

  function getTemperatureDelta(biome, depthM) {
    const climate = climateFor(biome);
    const phaseLocal = localPhaseFor(climate);
    const depth = Number.isFinite(depthM) ? Math.abs(depthM) : 0;
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
    getTemperatureDelta
  };
})(window.OC);
