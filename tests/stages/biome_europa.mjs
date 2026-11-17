// AA2) Verify 14th Biome: Europa's subglacial ocean (europa_ocean, 25,000 m, H2 cryoforest, serpentinite vents, cryobiota)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC, scene } = ctx;
  const europa = OC.Biomes.get('europa_ocean');
  assert(europa && europa.noSurface === true, 'Europa must register as a subglacial (no-surface) biome');
  assert(europa.depthOffset === 25000 && Math.abs(europa.pressureScale - 0.136) < 1e-9, 'Europa must use a 25 km ice-shell depth offset and Europa gravity (1/7 Earth)');
  assert(europa.minimapTheme === 'europa' && europa.globe.world === 'europa' && europa.globe.waterType === 'subglacial', 'Europa must carry its own minimap theme, planet (europa) and water type');
  assert(europa.zones.length === 5 && europa.landmarks.length === 6 && europa.tourLegs.length === 6, 'Europa must expose 5 zones, 6 landmarks and 6 guided tour legs');
  assert(europa.getCeilingHeight(0, 0) > europa.getHeight(0, 0) + 40, 'Europa must have a thick basal ice ceiling above the seafloor');
  assert(europa.getHeight(-292, 138) > -85 && europa.getHeight(392, -338) < -105, 'Europa bathymetry must include the raised serpentinite vent field and the deep oceanic basin');
  const europaVentOptics = europa.getOpticalProfile(-292, -76, 138, 1);
  const europaPlainOptics = europa.getOpticalProfile(392, -110, -338, 1);
  assert(europaVentOptics.causticStrength === 0 && europaVentOptics.rayStrength === 0 && europaVentOptics.bioGlow > 0.5, 'Europa must have no sunlight 25 km below the surface - only bioluminescence');
  assert(europaPlainOptics.fogDensity > 0.005 && europaPlainOptics.fogDensity < europaVentOptics.fogDensity + 0.02, 'Europa fog must stay dense and water-dark across the whole ocean');
  let europaCryoFlora = 0;
  let europaVeilFlora = 0;
  let europaChimneyFlora = 0;
  for (let cz = -3; cz < 3; cz++) {
    for (let cx = -3; cx < 3; cx++) {
      const items = europa.generateChunkFlora(cx, cz, europa.chunkSize, 1.2, OC.mulberry32(((cx * 73856093) ^ (cz * 19348663) ^ 0x2e01) >>> 0));
      for (const it of items) {
        if (it.species === 'cryo_forest') europaCryoFlora++;
        if (it.species === 'ice_veil') europaVeilFlora++;
        if (it.species === 'serpentine_chimney') europaChimneyFlora++;
        assert(europa.encyclopedia[it.species], `Europa flora species ${it.species} missing from encyclopedia`);
      }
    }
  }
  assert(europaCryoFlora > 0 && europaVeilFlora > 0 && europaChimneyFlora > 0, 'Europa flora stream must seed cryoforest, ceiling-hanging ice veils and serpentinite chimneys');

  /* Базальный лёд и канал рассола должны быть различимы и в мире, и в Атласе.
     Ранее воронка рассола была пологой и одного цвета с панцирем, а обе записи
     Атласа не имели своей 3D-модели и показывались чёрным овалом. */
  const BRINE_CHANNELS = [{ x: 74, z: -126 }, { x: -68, z: 214 }, { x: 196, z: 268 }];
  for (const ch of BRINE_CHANNELS) {
    const throatY = europa.getCeilingHeight(ch.x, ch.z);
    const rimY = europa.getCeilingHeight(ch.x + 78, ch.z + 78);
    assert(rimY - throatY >= 8.0,
      `Brine channel at (${ch.x}, ${ch.z}) must cut at least 8 m into the ice shell to be visible (throat ${throatY.toFixed(1)} m vs rim ${rimY.toFixed(1)} m)`);
    const cThroat = europa.getCeilingColor(ch.x, throatY, ch.z, new T.Color());
    const cPlain = europa.getCeilingColor(ch.x + 220, europa.getCeilingHeight(ch.x + 220, ch.z + 220), ch.z + 220, new T.Color());
    const contrast = Math.abs(cThroat.r - cPlain.r) + Math.abs(cThroat.g - cPlain.g) + Math.abs(cThroat.b - cPlain.b);
    assert(contrast > 0.18, `Brine channel throat must contrast with the surrounding ice (got ${contrast.toFixed(3)})`);
  }
  let brineRimVeils = 0;
  for (let cz = -3; cz < 4; cz++) {
    for (let cx = -3; cx < 4; cx++) {
      const items = europa.generateChunkFlora(cx, cz, europa.chunkSize, 1.2, OC.mulberry32(((cx * 40691) ^ (cz * 9137) ^ 0x5a17) >>> 0));
      for (const it of items) {
        if (it.species !== 'ice_veil') continue;
        for (const ch of BRINE_CHANNELS) {
          const d = Math.hypot(it.x - ch.x, it.z - ch.z);
          if (d > 15 && d < 52) brineRimVeils++;
        }
      }
    }
  }
  assert(brineRimVeils >= 12, `Brine channel rims must be outlined by hanging ice (got ${brineRimVeils} veils)`);
  for (const k of ['basal_ice', 'brine_channel']) {
    const preview = OC.FaunaEngine.createPreviewMesh(k, europa);
    assert(preview && preview.children.length > 0, `Europa Atlas preview missing for ${k}`);
    const mesh = preview.children[0];
    const gp = mesh.geometry && mesh.geometry.parameters;
    assert(!(gp && gp.radius === 0.8 && gp.widthSegments === 48),
      `Europa Atlas entry "${k}" falls back to the placeholder sphere and shows as a black oval`);
    assert(!(mesh.material && mesh.material.vertexColors && !mesh.geometry.attributes.color),
      `Europa Atlas entry "${k}" uses vertexColors without a color attribute - it renders pure black`);
  }
  /* Ни одна запись энциклопедии не должна превращаться в чёрный овал: заглушка
     обязана быть видимой, то есть не использовать vertexColors без атрибута color. */
  for (const b of OC.Biomes.list()) {
    for (const k of Object.keys(b.encyclopedia || {})) {
      const preview = OC.FaunaEngine.createPreviewMesh(k, b);
      const mesh = preview && preview.children[0];
      if (!mesh || !mesh.material) continue;
      assert(!(mesh.material.vertexColors && !mesh.geometry.attributes.color),
        `Atlas entry "${k}" of ${b.id} renders black: vertexColors material without a color attribute`);
    }
  }
  for (const k of ['cryo_forest', 'ice_veil', 'serpentine_chimney', 'brine_polyp', 'chemo_mat', 'cryo_tubeworm', 'sulfate_crust', 'cryo_glider', 'cryo_krill', 'cryo_shrimp', 'cryo_ray', 'armored_swimmer', 'cryo_medusa', 'vent_crab']) {
    assert(europa.encyclopedia[k], `Europa encyclopedia missing key ${k}`);
    assert(OC.sound.getVoiceLabel(k).length > 4, `Europa acoustic label missing for ${k}`);
    const preview = OC.FaunaEngine.createPreviewMesh(k, europa);
    assert(preview && preview.children.length > 0, `Europa Atlas preview missing for ${k}`);
  }
  const europaSeason = OC.Seasons.getState(europa);
  assert(europaSeason.hemisphere === 'equatorial' && Math.abs(europaSeason.iceFactor - 1) < 1e-9, 'Europa must have a perpetual ice shell and an equatorial (tilt-free) seasonal profile');
  assert(Math.abs(OC.Seasons.getTemperatureDelta(europa, 25050)) > 0.0001, 'Europa seasonal temperature profile must not collapse to zero delta');
  const europaPlan = europa.faunaPlan;
  assert(europaPlan.cryoRays.length === 2 && europaPlan.armoredSwimmers.length === 2 && europaPlan.cryoMedusae.length === 4 && europaPlan.ventCrabs.length === 3, 'Europa fauna plan must include cryo rays, armored swimmers, lantern medusae and vent crabs');
  assert(europaPlan.schools.every((sc) => sc.geoKey && sc.biolum), 'Europa schools must use their own bioluminescent cryogeometries');
  const europaFauna = OC.FaunaEngine.init(scene, europa);
  for (const k of ['cryo_ray', 'armored_swimmer', 'cryo_medusa', 'vent_crab', 'cryo_glider', 'cryo_krill', 'cryo_shrimp']) {
    assert(europaFauna.agents.some((a) => a.key === k), `Europa fauna engine must spawn ${k}`);
  }
  assert(europaFauna.sonarTargets.some((a) => a.key === 'cryo_ray') && europaFauna.sonarTargets.some((a) => a.key === 'vent_crab'), 'Europa megafauna must be scannable with the multibeam sonar');
  const europaSpawn = new T.Vector3(europa.spawn.pos[0], europa.spawn.pos[1], europa.spawn.pos[2]);
  europaFauna.update(1 / 60, OC.uTime.value, europaSpawn, 0, false);
  const ctdEuropa = OC.ROV.runCtdCast(europa, europaSpawn, OC.EcoLab.getState());
  assert(ctdEuropa && ctdEuropa.waterType === 'subglacial', 'Europa CTD must identify a subglacial ocean');
  assert(ctdEuropa.pH > 10 && ctdEuropa.pH < 13, `Europa CTD must report alkaline serpentinized water (pH ~11): ${ctdEuropa && ctdEuropa.pH}`);
  assert(ctdEuropa.bins.every((bin) => bin.o2 >= 0 && bin.o2 < 1.2), 'Europa oxygen profile must stay anoxic (no photosynthesis under 25 km of ice)');
  assert(ctdEuropa.conductivityUSCm > 100 && ctdEuropa.tdsMgL > 90000 && ctdEuropa.mineralizationPpt > 90, 'Europa CTD must report hypersaline brine (TDS > 90 g/l)');
  const europaExpectedAtm = 1 + (ctdEuropa.maxDepthM / 10.08) * europa.pressureScale;
  assert(Math.abs(ctdEuropa.maxPressureAtm - europaExpectedAtm) < 0.2 && ctdEuropa.maxPressureAtm > 250 && ctdEuropa.maxPressureAtm < 400, `Europa pressure must be scaled by 1/7 Earth gravity (~340 atm): ${ctdEuropa.maxPressureAtm}`);
  assert(ctdEuropa.minDepthM >= 25000 && ctdEuropa.maxDepthM > ctdEuropa.minDepthM + 25 && ctdEuropa.maxDepthM < 25120, 'Europa CTD must sample the full local water column of the 25 km-deep subglacial ocean');
  assert(OC.Hydrophone.getAcousticProfile('serpentine_chimney').label.includes('Гул'), 'Europa serpentinite chimneys must have their own acoustic signature');
  assert.equal(OC.Expedition.MISSIONS.filter((m) => m.biomeId === 'europa_ocean').length, 4, 'Europa must provide four expedition goals');
  const europaBeacon = OC.Globe.getBeacons().find((b) => b.id === 'europa_ocean');
  assert(europaBeacon && europaBeacon.world === 'europa', 'Europa must publish a planet-aware beacon (globe.world = europa)');
  OC.Biomes.setActive('great_barrier_reef');
  console.log('   14th Biome "Океан Европы" (25,000 m subglacial ocean, H2 cryoforest, serpentinite vents, cryobiota, 340 atm CTD and 4 missions) verified.');

}
