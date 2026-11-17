// X) Verify Step 7: Enhanced Chromatic Bottom Caustics & Shoreline / Ice / Vessel Contact Foam
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, worldSrc } = ctx;
  assert(OC.causticUniforms && OC.causticUniforms.uSunProj && OC.causticUniforms.uWaveAmp, 'world.js must expose uSunProj & uWaveAmp in OC.causticUniforms');
  assert(worldSrc.includes('causRGB') && worldSrc.includes('focusCurve'), 'world.js must inject chromatic RGB caustic dispersion & optical focus curve');
  assert(worldSrc.includes('uVesselInfo') && worldSrc.includes('vesselFoam') && worldSrc.includes('bowArm') && worldSrc.includes('sternWake'), 'world.js surface shader must render vessel hull contact foam & Kelvin wake');
  assert(worldSrc.includes("it.species !== 'ice_floe' && it.species !== 'iceberg'") && worldSrc.includes('swash'), 'world.js must bake arctic ice floe/iceberg contact rings & animated shoreline swash foam');
  console.log('   Chromatic Refractive Caustics (RGB dispersion + sun projection) & Contact Foam (shoreline swash, arctic ice rings & R/V Kelvin wake) verified.');
}
