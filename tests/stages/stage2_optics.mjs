// AB) Verify Stage 2 Underwater Optical Shader FX (WebGLRenderTarget Post-Processing, Chromatic Aberration, Lens Wetness & Overhead Shadows)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC, scene, worldSrc } = ctx;
  assert(typeof OC.renderWorld === 'function' && typeof OC.resizeWorld === 'function' && typeof OC.getPostFxState === 'function', 'world.js must expose OC.renderWorld, OC.resizeWorld & OC.getPostFxState');
  assert(typeof OC.setPostFxEnabled === 'function' && typeof OC.setSubViewportOptics === 'function', 'world.js must expose OC.setPostFxEnabled & OC.setSubViewportOptics');
  assert.equal(OC.Quality.PRESETS.low.postFx, false, 'Low quality preset must disable postFx FBO pass');
  assert.equal(OC.Quality.PRESETS.high.postFx, true, 'High quality preset must enable postFx FBO pass');

  const shShadowMat = new T.MeshStandardMaterial({ vertexColors: true });
  OC.enhanceMaterial(shShadowMat, { isTerrain: true, causticStrength: 0.9 });
  const shShadow = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
  shShadowMat.onBeforeCompile(shShadow);
  assert(shShadow.uniforms.uShadowA && shShadow.uniforms.uShadowB, 'enhanceMaterial must bind uShadowA & uShadowB uniforms');
  assert(shShadow.fragmentShader.includes('ocShadow') && shShadow.fragmentShader.includes('uShadowA') && shShadow.fragmentShader.includes('uShadowB'), 'Terrain fragment shader must compute overhead ship & megafauna shadows');

  const worldFxSrc = worldSrc;
  assert(worldFxSrc.includes('WebGLRenderTarget') && worldFxSrc.includes('dropLayer') && worldFxSrc.includes('uBloomAmt') && worldFxSrc.includes('uChromaAmt'), 'world.js must compile WebGLRenderTarget post-FX shader (Bloom, Chromatic Aberration, Water Droplets)');
  const gbrFxFauna = OC.FaunaEngine.init(scene, OC.Biomes.get('great_barrier_reef'));
  assert(OC.faunaInfo && OC.faunaInfo.shadowCaster && typeof OC.faunaInfo.shadowCaster === 'object', 'OC.faunaInfo must expose zero-GC shadowCaster slot');
  const wPos = OC.faunaInfo.whale ? OC.faunaInfo.whale.getPosition() : new T.Vector3(0, -8, 0);
  gbrFxFauna.update(0.05, 1.5, wPos, 2.0, false);
  assert(OC.faunaInfo.shadowCaster.active && OC.faunaInfo.shadowCaster.radius >= 2.0, 'OC.faunaInfo.shadowCaster must track nearby megafauna for seafloor shadow projection');
  const pfxInit = OC.getPostFxState();
  assert(typeof pfxInit.enabled === 'boolean' && typeof pfxInit.bloom === 'number' && typeof pfxInit.chroma === 'number', 'OC.getPostFxState must return structured optical telemetry');
  console.log('   Stage 2 Underwater WebGL Shader FX (FBO Bloom, Chromatic Aberration, Surfacing Droplets & Dynamic Overhead Shadows) verified.');

  return { gbrFxFauna, wPos };
}
