// I) Verify Direction 3 (Weather, Volumetric 3D God Rays, Storm Waves, Snell Dispersion, Noctiluca Trail & Thunder)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T, arcticBiome, biome, faunaSrc, gbrBack, gbrFauna, worldSrc } = ctx;
  assert(OC.Weather && typeof OC.Weather.setMode === 'function', 'OC.Weather module required');
  assert(worldSrc.includes('CylinderGeometry') && worldSrc.includes('uWaveAmp') && worldSrc.includes('prismBand'), 'world.js missing 3D God Rays CylinderGeometry, uWaveAmp storm waves or Snell chromatic prismBand');
  assert(worldSrc.includes('uStorm') && worldSrc.includes('uLightning') && worldSrc.includes('uSnowMode'), 'world.js missing storm/lightning sky uniforms or uSnowMode precipitation');
  assert(faunaSrc.includes('makeBiolumTrail') && faunaSrc.includes('aBorn'), 'fauna_engine.js missing Noctiluca bioluminescence trail');
  assert(typeof OC.sound.thunder === 'function', 'OC.sound.thunder required');

  let thunderFired = 0;
  OC.Weather.onThunder(() => { thunderFired++; });
  assert.equal(OC.Weather.setMode('storm'), 'storm');
  const testCamPos = new T.Vector3(0, 2.5, 0);
  let stRes = null;
  for (let step = 0; step < 30; step++) {
    stRes = OC.Weather.update(0.25, 10 + step * 0.25, testCamPos, gbrBack);
  }
  assert(stRes.stormMix > 0.85, `Expected stormMix > 0.85 after storm ramp, got ${stRes.stormMix}`);
  assert(stRes.waveAmp > 1.8, `Expected waveAmp > 1.8 in storm, got ${stRes.waveAmp}`);
  assert(stRes.precip > 0.6, `Expected precip > 0.6 in storm, got ${stRes.precip}`);
  assert(stRes.droplets > 0.25, `Expected surface droplets > 0.25 in storm, got ${stRes.droplets}`);
  assert(thunderFired >= 1, `Expected thunder callback at least once during storm, got ${thunderFired}`);
  assert.equal(OC.Weather.getLabel(arcticBiome), 'Снежный буран');
  assert.equal(OC.Weather.getLabel(gbrBack), 'Шторм и ливень');

  // Abyssal biome suppresses surface storm weather
  const ventsB = OC.Biomes.list().find((b) => b.id === 'hydrothermal_vents');
  const ventWeather = OC.Weather.update(0.5, 40, new T.Vector3(0, -45, 0), ventsB);
  assert.equal(ventWeather.stormMix, 0, 'Abyssal noSurface biome must neutralize stormMix');
  assert.equal(ventWeather.precip, 0, 'Abyssal noSurface biome must neutralize precip');

  assert.equal(OC.Weather.setMode('calm'), 'calm');
  assert.equal(OC.Weather.cycleMode(), 'breeze');
  assert.equal(OC.Weather.cycleMode(), 'storm');
  assert.equal(OC.Weather.cycleMode(), 'auto');

  // Noctiluca bioluminescent trail burst in dark water at swimming speed
  OC.getPalette().dayW = 0.05;
  OC.getPalette().bioGlow = 0.95;
  for (let s = 0; s < 12; s++) {
    OC.uTime.value += 0.08;
    gbrFauna.update(0.08, OC.uTime.value, new T.Vector3(s * 1.2, -12, 0), 7.5, false);
    OC.sound.update(12, 'lagoon', 0.05, 'great_barrier_reef', 0.9);
  }
  console.log('   Direction 3 Graphics, Weather, Volumetric 3D God Rays, Storm Waves, Noctiluca Trail & Thunder verified.');
}
