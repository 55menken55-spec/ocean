/* ================= ДИНАМИЧЕСКАЯ СИСТЕМА ПОГОДЫ: ШТИЛЬ, ЗЫБЬ, ШТОРМ, ПУРГА И МОЛНИИ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const MODES = {
    auto: { label: 'Авто' },
    calm: { label: 'Штиль' },
    breeze: { label: 'Зыбь' },
    storm: { label: 'Шторм' }
  };

  const PRESETS = {
    calm:   { waveAmp: 0.95, cloudCover: 0.22, stormMix: 0.0, precip: 0.0, turbidity: 0.0 },
    breeze: { waveAmp: 1.65, cloudCover: 0.56, stormMix: 0.22, precip: 0.12, turbidity: 0.18 },
    storm:  { waveAmp: 2.75, cloudCover: 0.94, stormMix: 1.0, precip: 1.0, turbidity: 0.55 }
  };

  const state = {
    mode: 'auto',
    activePhase: 'calm',
    waveAmp: 0.95,
    cloudCover: 0.22,
    stormMix: 0.0,
    precip: 0.0,
    turbidity: 0.0,
    lightning: 0.0,
    droplets: 0.0,
    nextLightningAt: 9.0,
    onThunder: null
  };

  OC.Weather = {
    MODES,
    setMode(m) {
      if (!MODES[m]) return state.mode;
      state.mode = m;
      if (m !== 'auto') state.activePhase = m;
      return state.mode;
    },
    getMode: () => state.mode,
    getPhase: () => state.activePhase,
    getState: () => state,
    cycleMode() {
      const order = ['auto', 'calm', 'breeze', 'storm'];
      const idx = order.indexOf(state.mode);
      return this.setMode(order[(idx + 1) % order.length]);
    },
    getLabel(biome) {
      if (biome && biome.noSurface) return 'Бездна';
      const isArctic = !!(biome && biome.hasAurora);
      if (state.activePhase === 'storm') return isArctic ? 'Снежный буран' : 'Шторм и ливень';
      if (state.activePhase === 'breeze') return isArctic ? 'Зыбь и снег' : 'Зыбь';
      return 'Штиль';
    },
    onThunder(cb) { state.onThunder = cb; },
    triggerLightning() {
      state.lightning = 1.0;
      if (state.onThunder) state.onThunder();
    },

    update(dt, time, camPos, biome) {
      const noSurface = !!(biome && biome.noSurface);
      const isArctic = !!(biome && biome.hasAurora);

      if (noSurface) {
        state.activePhase = 'calm';
        state.waveAmp = 0.0;
        state.cloudCover = 0.0;
        state.stormMix = 0.0;
        state.precip = 0.0;
        state.turbidity = 0.0;
        state.lightning = 0.0;
        state.droplets = Math.max(0, state.droplets - dt * 1.5);
        return state;
      }

      let targetPreset = PRESETS[state.mode];
      if (state.mode === 'auto') {
        // Плавный 120-секундный погодный фронт (старт в ясный штиль, затем зыбь и тропический шторм / пурга)
        const wCycle = (Math.sin(time * 0.052 + (isArctic ? -0.1 : -0.95)) * 0.5 + 0.5);
        if (wCycle < 0.48) {
          state.activePhase = 'calm';
          targetPreset = PRESETS.calm;
        } else if (wCycle < 0.80) {
          state.activePhase = 'breeze';
          targetPreset = PRESETS.breeze;
        } else {
          state.activePhase = 'storm';
          targetPreset = PRESETS.storm;
        }
      } else {
        state.activePhase = state.mode;
      }

      const k = Math.min(1, dt * 0.65);
      const sheltered = !!(biome && biome.shelteredSurface);
      const waveMult = sheltered ? 0.22 : 1.0;
      const turbMult = sheltered ? 0.25 : 1.0;
      state.waveAmp = OC.lerp(state.waveAmp, targetPreset.waveAmp * waveMult, k);
      state.cloudCover = OC.lerp(state.cloudCover, targetPreset.cloudCover, k);
      state.stormMix = OC.lerp(state.stormMix, targetPreset.stormMix, k);
      state.precip = OC.lerp(state.precip, targetPreset.precip, k);
      state.turbidity = OC.lerp(state.turbidity, targetPreset.turbidity * turbMult, k);

      const underCaveRoof = !!(biome && biome.getCeilingHeight && camPos && biome.getCeilingHeight(camPos.x, camPos.z) < 25.0);
      // Вспышки молний в грозу (в неарктических штормовых фронтах и вне пещер)
      if (!isArctic && !underCaveRoof && state.stormMix > 0.62) {
        if (time >= state.nextLightningAt) {
          state.lightning = 1.0;
          state.nextLightningAt = time + 7.5 + (Math.sin(time * 13.7) * 0.5 + 0.5) * 11.0;
          if (state.onThunder && camPos && camPos.y > -24) state.onThunder();
        }
      } else {
        state.nextLightningAt = Math.max(state.nextLightningAt, time + 4.0);
      }
      state.lightning = Math.max(0, state.lightning - dt * 3.8);

      // Капли на объективе / маске при выныривании или под дождём над водой
      if (camPos) {
        if (camPos.y < -0.25) {
          state.droplets = Math.min(1.0, state.droplets + dt * 2.5);
        } else {
          const rainKeep = (!isArctic && !underCaveRoof && state.precip > 0.3) ? state.precip * 0.52 : 0.0;
          state.droplets = Math.max(rainKeep, state.droplets - dt * 0.24);
        }
      }

      return state;
    }
  };
})(window.OC);
