// AB) Verify 11th Biome: Lake Baikal's clear-water rift, endemic fauna, and sponge reefs
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC, scene, amz } = ctx; // amz — результат стадии 10-го биома (Амазония), нужен для сезонного цикла
  const baikal = OC.Biomes.setActive('baikal');
  assert(OC.Seasons && OC.Seasons.YEAR_SECONDS === 1200, 'The continuous annual season cycle must be available');
  const savedSeasonPhase = OC.Seasons.getPhase();
  OC.Seasons.setPhase(0);
  const baikalWinterTemp = baikal.getTemperatureAt(0, 0, baikal.getZoneAt(0, 0, 0));
  const reef = OC.Biomes.get('great_barrier_reef');
  const reefSouthernSummerDelta = OC.Seasons.getTemperatureDelta(reef, 0);
  OC.Seasons.setPhase(0.5);
  const baikalSummerTemp = baikal.getTemperatureAt(0, 0, baikal.getZoneAt(0, 0, 0));
  const reefSouthernWinterDelta = OC.Seasons.getTemperatureDelta(reef, 0);
  assert(baikalSummerTemp - baikalWinterTemp > 6 && reefSouthernSummerDelta > reefSouthernWinterDelta, 'Seasonal water temperatures must follow hemisphere and smoothly vary with the annual cycle');
  OC.Seasons.setPhase(0.249);
  const springBefore = baikal.getTemperatureAt(0, 0, baikal.getZoneAt(0, 0, 0));
  OC.Seasons.setPhase(0.251);
  const springAfter = baikal.getTemperatureAt(0, 0, baikal.getZoneAt(0, 0, 0));
  assert(Math.abs(springAfter - springBefore) < 0.1, 'Seasonal temperature transitions must be continuous, without boundary jumps');
  OC.Seasons.setPhase(0.0);
  const baikalIceWinter = OC.Seasons.getState(baikal).iceFactor;
  const arcticIceWinter = OC.Seasons.getState(OC.Biomes.get('arctic_sea')).iceFactor;
  const galapagosColdUpwelling = OC.Seasons.getState(OC.Biomes.get('galapagos_upwelling')).upwellingFactor;
  const deepVents = OC.Biomes.get('hydrothermal_vents');
  const deepWinterActivity = OC.Seasons.getState(deepVents).faunaActivity;
  const deepWinterDelta = OC.Seasons.getTemperatureDelta(deepVents, 2500);
  OC.Seasons.setPhase(0.5);
  const baikalIceSummer = OC.Seasons.getState(baikal).iceFactor;
  const arcticIceSummer = OC.Seasons.getState(OC.Biomes.get('arctic_sea')).iceFactor;
  const galapagosWarmUpwelling = OC.Seasons.getState(OC.Biomes.get('galapagos_upwelling')).upwellingFactor;
  const deepSummerActivity = OC.Seasons.getState(deepVents).faunaActivity;
  const deepSummerDelta = OC.Seasons.getTemperatureDelta(deepVents, 2500);
  assert(baikalIceWinter > 0.99 && baikalIceSummer < 0.01 && arcticIceWinter > arcticIceSummer, 'Seasonal ice cover must recede on Baikal while remaining perennial but variable in Arctic waters');
  assert(galapagosColdUpwelling > galapagosWarmUpwelling && Math.abs(deepSummerDelta - deepWinterDelta) < 0.0001 && deepSummerActivity === deepWinterActivity, 'Cold-season upwelling must strengthen while abyssal temperature and fauna activity stay stable');
  OC.Seasons.setPhase(0.84);
  const amazonFlood = OC.Seasons.getState(amz.biome);
  OC.Seasons.setPhase(0.34);
  const amazonLowWater = OC.Seasons.getState(amz.biome);
  assert(amazonFlood.waterLevelM > amazonLowWater.waterLevelM && amazonFlood.turbidityAdd > amazonLowWater.turbidityAdd, 'Amazon seasonal flood must raise water and softly increase suspended sediment');
  OC.Seasons.setPhase(0.5);
  const kelpSummerProductivity = OC.Seasons.getState(OC.Biomes.get('kelp_forest')).productivityFactor;
  OC.Seasons.setPhase(0.0);
  const kelpWinterProductivity = OC.Seasons.getState(OC.Biomes.get('kelp_forest')).productivityFactor;
  assert(kelpSummerProductivity > kelpWinterProductivity, 'Kelp forest productivity should peak in the warm season');
  OC.Seasons.setPhase(0.5);
  assert(OC.Seasons.selectSeason('winter', baikal) && !OC.Seasons.isAutoAdvance(), 'Selecting a season must pause the annual cycle for manual control');
  for (let seasonStep = 0; seasonStep < 7; seasonStep++) OC.Seasons.update(0.25);
  assert(OC.Seasons.getPhase() > 0.05 && OC.Seasons.getPhase() < 0.45, 'Manual season selection must transition gradually rather than jump');
  for (let seasonStep = 0; seasonStep < 7; seasonStep++) OC.Seasons.update(0.25);
  assert.equal(OC.Seasons.getState(baikal).id, 'winter', 'Manual season selection must reach the requested local season');
  OC.Seasons.setAutoAdvance(true);
  OC.Seasons.setPhase(savedSeasonPhase);
  assert(baikal && baikal.minimapTheme === 'baikal' && baikal.noSurface === false, 'Baikal must register as a surface freshwater biome with its own minimap theme');
  assert(baikal.zones.length === 5 && baikal.landmarks.length === 6 && baikal.tourLegs.length === 6, 'Baikal must expose 5 zones, 6 landmarks and 6 guided tour legs');
  assert(baikal.getHeight(0, 80) < -1500 && baikal.getHeight(-520, -420) > -15, 'Baikal bathymetry must include both the deep rift and shallow Academy Bay');
  let baikalSeasonalIceCount = 0;
  for (let cz = -8; cz < 8; cz++) {
    for (let cx = -8; cx < 8; cx++) {
      const items = baikal.generateChunkFlora(cx, cz, 150, 1, OC.mulberry32(((cx * 73856093) ^ (cz * 19349663) ^ 0x51a7) >>> 0));
      baikalSeasonalIceCount += items.filter((item) => item.species === 'ice_floe').length;
    }
  }
  assert(baikalSeasonalIceCount > 0, 'Baikal shoreline flora stream must seed seasonal ice floes');
  const baikalShallowOptics = baikal.getOpticalProfile(-520, -8, -420, 1);
  const baikalDeepOptics = baikal.getOpticalProfile(0, -900, 80, 1);
  assert(baikalShallowOptics.fogDensity < baikalDeepOptics.fogDensity && baikalShallowOptics.causticStrength > baikalDeepOptics.causticStrength, 'Baikal clear-water optics must fade with depth');
  for (const k of ['baikal_sponge', 'charophyte_bed', 'fish_omul', 'fish_golomyanka', 'fish_grayling', 'seal_baikal', 'methane_seep_baikal']) {
    assert(baikal.encyclopedia[k], `Baikal encyclopedia missing key ${k}`);
    assert(OC.sound.getVoiceLabel(k).length > 4, `Baikal acoustic label missing for ${k}`);
    const preview = OC.FaunaEngine.createPreviewMesh(k, baikal);
    assert(preview && preview.children.length > 0, `Baikal Atlas preview missing for ${k}`);
  }
  const ctdBaikal = OC.ROV.runCtdCast(baikal, new T.Vector3(0, -900, 80), OC.EcoLab.getState());
  assert(ctdBaikal && ctdBaikal.maxDepthM > 1500 && ctdBaikal.bottomTemp >= 3.2 && ctdBaikal.bottomTemp < 4.0, `Baikal CTD profile mismatch: ${JSON.stringify(ctdBaikal)}`);
  assert.equal(ctdBaikal.waterType, 'freshwater', 'Baikal CTD must identify freshwater');
  assert(ctdBaikal.conductivityUSCm >= 105 && ctdBaikal.conductivityUSCm <= 158 && ctdBaikal.tdsMgL > 0 && ctdBaikal.mineralizationPpt < 0.2, 'Baikal CTD must report low freshwater conductivity, TDS and mineralization');
  assert(ctdBaikal.bins.length >= 20 && ctdBaikal.bins.every((bin) => bin.o2 > 7 && bin.o2 < 14), 'Baikal oxygen profile must remain well-oxygenated from surface to bottom');
  assert(ctdBaikal.pH > 6 && ctdBaikal.pH < 9, 'Baikal CTD must include measured water pH');
  const baikalFauna = OC.FaunaEngine.init(scene, baikal);
  assert(baikalFauna.agents.some((a) => a.key === 'seal_baikal') && baikalFauna.agents.some((a) => a.key === 'fish_golomyanka') && baikalFauna.agents.some((a) => a.key === 'methane_seep_baikal'), 'Baikal fauna plan must include nerpa, golomyanka and scannable seep locations');
  const golomyankaPlan = baikal.faunaPlan.schools.find((school) => school.key === 'fish_golomyanka');
  assert(golomyankaPlan && golomyankaPlan.diel === 'nocturnal' && golomyankaPlan.dvmAmp >= 100 && golomyankaPlan.seasonalDepth === 24, 'Golomyanka must combine nocturnal DVM with a seasonal depth migration');
  assert(OC.Biomes.get('arctic_sea').faunaPlan.schools.some((school) => school.key === 'fish_arctic_cod' && school.seasonalDepth > 0), 'Arctic cod schools must migrate with seasonal ice and temperature');
  assert(OC.Biomes.get('amazon_igapo').faunaPlan.schools.some((school) => school.key === 'neon_tetra' && school.seasonalDepth > 0), 'Amazon fish must respond to seasonal flood levels');
  assert(OC.Biomes.get('galapagos_upwelling').faunaPlan.schools.some((school) => school.key === 'sardine_baitball' && school.seasonalDepth > 0), 'Galapagos baitballs must shift depth with seasonal upwelling');
  baikalFauna.update(1 / 60, OC.uTime.value, new T.Vector3(baikal.spawn.pos[0], baikal.spawn.pos[1], baikal.spawn.pos[2]), 0, false);
  assert(OC.faunaInfo.hydratePlumesActive, 'Baikal methane seeps must activate the existing low-cost gas plume system');
  const testSeal = OC._FaunaBuilders.makeBaikalSeal(scene, baikal, { cx: -40, cz: 80, r: 0, y: -360, scale: 1 });
  testSeal.update(0, 0, new T.Vector3(-40, -360, 80), { preyCenters: [] });
  let golomyankaPredationCount = 0;
  const testGolomyanka = testSeal.getPosition().clone();
  testGolomyanka.schoolKey = 'fish_golomyanka';
  testGolomyanka.applyPredation = () => { golomyankaPredationCount++; };
  let huntTime = 0;
  while (!testSeal.isHunting() && huntTime < 30) {
    testSeal.update(0.5, huntTime, new T.Vector3(-40, -360, 80), { preyCenters: [testGolomyanka] });
    huntTime += 0.5;
  }
  assert(testSeal.isHunting(), 'Baikal nerpa must enter a hunting lunge when it finds a golomyanka school');
  for (let huntStep = 0; huntStep < 60; huntStep++) testSeal.update(0.1, huntTime + huntStep * 0.1, new T.Vector3(-40, -360, 80), { preyCenters: [testGolomyanka] });
  assert(golomyankaPredationCount > 0, 'Baikal nerpa lunge must apply predation to a golomyanka school');
  assert.equal(OC.Expedition.MISSIONS.filter((m) => m.biomeId === 'baikal').length, 4, 'Baikal must provide four expedition goals');
  OC.Biomes.setActive('great_barrier_reef');
  console.log('   11th Biome "Озеро Байкал" (1,642 m rift, clear-water optics, Baikal sponge, omul, golomyanka, nerpa, methane seeps, CTD and 4 missions) verified.');

  return { biome: baikal, ctd: ctdBaikal };
}
