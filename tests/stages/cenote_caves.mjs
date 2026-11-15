// S) Verify 8th Biome: Underwater Karst Caves & Yucatan Cenotes (cenote_caves, 0-58 m, Analytical Cave Ceiling, Halocline & H2S Cloud, Ariadne Guideline, Stalactites/Stalagmites/Vines, Blind Cave Fauna)
import assert from 'node:assert/strict';
import { makeStubEl } from '../lib/harness.mjs';

export function run(ctx) {
  const { OC, T, a, camera, fauna, floraProtos, scene } = ctx;
  const ccBiome = OC.Biomes.setActive('cenote_caves');
  assert(ccBiome && ccBiome.shelteredSurface && !ccBiome.noSurface && ccBiome.minimapTheme === 'cenote', 'cenote_caves must expose shelteredSurface & cenote theme');
  assert.equal(typeof ccBiome.getCeilingHeight, 'function', 'cenote_caves must expose getCeilingHeight');
  assert.equal(typeof ccBiome.isCeilingOpen, 'function', 'cenote_caves must expose isCeilingOpen');
  assert.equal(typeof ccBiome.getHaloclineAt, 'function', 'cenote_caves must expose getHaloclineAt');

  for (const spKey of ['stalactite', 'stalagmite', 'cenote_vine', 'seagrass']) {
    assert(floraProtos[spKey], `FloraLibrary missing cenote_caves species ${spKey}`);
    assert(ccBiome.encyclopedia[spKey], `cenote_caves encyclopedia missing ${spKey}`);
  }
  for (const fKey of ['ariadne_line', 'halocline_layer', 'blind_tetra', 'cenote_molly', 'cave_remipede', 'blind_brotula', 'cave_shrimp']) {
    assert(ccBiome.encyclopedia[fKey], `cenote_caves encyclopedia missing fauna/feature ${fKey}`);
  }

  // Verify open cenote skylights vs submerged karst ceiling and guaranteed navigable clearance >= 7.0 m map-wide
  assert.equal(ccBiome.isCeilingOpen(0, 0), true, 'Main cenote sinkhole center must be open to the sky');
  assert.equal(ccBiome.isCeilingOpen(210, -185), true, 'Secondary cenote skylight must be open to the sky');
  assert.equal(ccBiome.isCeilingOpen(-95, 58), false, 'Stalactite cathedral must be beneath limestone cave ceiling');
  assert(ccBiome.getCeilingHeight(-95, 58) < -4.0, 'Stalactite cathedral ceiling must be submerged (< -4 m)');

  let minCaveClearance = Infinity;
  for (let x = -960; x <= 960; x += 80) {
    for (let z = -960; z <= 960; z += 80) {
      const gap = ccBiome.getCeilingHeight(x, z) - ccBiome.getHeight(x, z);
      if (gap < minCaveClearance) minCaveClearance = gap;
    }
  }
  assert(minCaveClearance >= 7.0, `cenote_caves minimum ceiling-floor clearance must be >= 7.0 m everywhere (got ${minCaveClearance.toFixed(2)} m)`);

  const ccZoneHits = new Set([
    ccBiome.getZoneAt(0, -11, 0).id,
    ccBiome.getZoneAt(-95, -14, 58).id,
    ccBiome.getZoneAt(-210, -22, 130).id,
    ccBiome.getZoneAt(180, -42, 210).id
  ]);
  assert.equal(ccZoneHits.size, 4, `Expected all 4 cenote_caves zones reachable, got ${[...ccZoneHits].join(', ')}`);

  const ccSp = new T.Vector3(ccBiome.spawn.pos[0], ccBiome.spawn.pos[1], ccBiome.spawn.pos[2]);
  OC.Terrain.init(scene, ccBiome, ccSp);
  const ccTStats = OC.Terrain.getStats();
  assert(ccTStats.built >= 9, 'cenote_caves terrain chunks (floor + cave ceiling) must build around spawn');
  OC.FloraStreamer.init(scene, ccBiome, ccSp);
  const ccFauna = OC.FaunaEngine.init(scene, ccBiome);
  assert.equal(ccFauna.getVesselInfo(), null, 'cenote_caves must not spawn an ocean research vessel');
  const ariadneAgent = ccFauna.agents.find((a) => a.key === 'ariadne_line');
  const haloAgent = ccFauna.agents.find((a) => a.key === 'halocline_layer');
  const remAgent = ccFauna.agents.find((a) => a.key === 'cave_remipede');
  const brotAgent = ccFauna.agents.find((a) => a.key === 'blind_brotula');
  assert(ariadneAgent && haloAgent && remAgent && brotAgent, 'cenote_caves must instantiate ariadne_line, halocline_layer, cave_remipede & blind_brotula');

  // Verify Navigation clamps smoothly under cave ceiling while allowing surfacing in sunlit cenote, plus halocline detection
  OC.Navigation.init(makeStubEl('scene'), ccBiome, {});
  OC.Navigation.getPosition().set(-95, -2.0, 58);
  OC.Navigation.update(0.05, 1.0, camera, false);
  const caveCeilAtCathedral = ccBiome.getCeilingHeight(-95, 58);
  assert(OC.Navigation.getPosition().y <= caveCeilAtCathedral - 1.7, `Navigation must clamp craft below cave ceiling (${caveCeilAtCathedral.toFixed(1)} m), got y=${OC.Navigation.getPosition().y.toFixed(2)}`);

  OC.Navigation.getPosition().set(0, 4.0, 0);
  OC.Navigation.update(0.05, 1.05, camera, false);
  assert(OC.Navigation.getPosition().y > 2.5, 'Navigation must allow surfacing up inside open cenote shaft');

  OC.Navigation.getPosition().set(-210, -24.5, 130);
  OC.Navigation.update(0.05, 1.1, camera, false);
  assert.equal(OC.Navigation.isInHalocline(), true, 'OC.Navigation.isInHalocline() must trigger in Angelita halocline cloud');

  // Verify Ultra 5x5 flora pools for cenote_caves never overflow maxInstances
  const ccUltraCounts = {};
  for (let cx = -2; cx <= 2; cx++) {
    for (let cz = -2; cz <= 2; cz++) {
      const items = ccBiome.generateChunkFlora(cx, cz, ccBiome.chunkSize, 1.5, OC.mulberry32(cx * 41 + cz * 83 + 17));
      for (const it of items) ccUltraCounts[it.species] = (ccUltraCounts[it.species] || 0) + 1;
    }
  }
  for (const [spKey, cnt] of Object.entries(ccUltraCounts)) {
    assert(cnt <= floraProtos[spKey].maxInstances, `cenote_caves Ultra 5x5 overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
  }
  assert(ccUltraCounts.stalactite >= 15 && ccUltraCounts.stalagmite >= 15 && ccUltraCounts.cenote_vine >= 8, 'cenote_caves must populate stalactite, stalagmite & cenote_vine');

  // Verify CTD cast at El Pit captures depth & coastal Yucatan halocline temperature inversion
  const ctdCc = OC.ROV.runCtdCast(ccBiome, new T.Vector3(180, -42, 210), OC.EcoLab.getState());
  assert(ctdCc && ctdCc.maxDepthM > 52 && ctdCc.maxDepthM < 64 && ctdCc.bottomTemp > ctdCc.surfaceTemp, `Cenote El Pit CTD cast must capture ~58 m depth & thermal inversion (surf=${ctdCc && ctdCc.surfaceTemp}, bot=${ctdCc && ctdCc.bottomTemp})`);

  OC.Biomes.setActive('great_barrier_reef');
  console.log(`   8th Biome "Юкатанские пещеры и Сеноты" (${ctdCc.maxDepthM} м, Cave Ceiling, Halocline & H₂S Cloud, Ariadne Line, Stalactites & Blind Cave Fauna) verified.`);
  return { ccBiome };
}
