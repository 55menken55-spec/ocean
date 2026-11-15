// Y) Verify Step 8: Gas Hydrate Plumes, Visible Thermocline Haze & Benthic Silt-Out Plumes
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T, galBiome, gbrBiome, gbrFaunaTest, scene } = ctx;
  const bpHydrateFauna = OC.FaunaEngine.init(scene, OC.Biomes.get('brine_pool'));
  assert(OC.faunaInfo.hydratePlumesActive, 'brine_pool must activate methane gas hydrate bubble plumes');

  // Visible thermocline haze activates near thermocline depth (-24 m in galapagos_upwelling)
  const galThermoFauna = OC.FaunaEngine.init(scene, galBiome);
  galThermoFauna.update(0.05, 2.0, new T.Vector3(0, -24.0, 0), 0.5, false);
  assert(OC.faunaInfo.thermoclineActive && OC.faunaInfo.thermoDepthM === 24, `Thermocline Schlieren haze must activate near -24 m in galapagos_upwelling, got active=${OC.faunaInfo.thermoclineActive}, depth=${OC.faunaInfo.thermoDepthM}`);

  // Fast skimming near seabed or ROV sampling kicks up benthic silt-out cloud
  const floorAtGbr = gbrBiome.getHeight(40, 40);
  gbrFaunaTest.notifySiltKick(new T.Vector3(40, floorAtGbr + 0.6, 40), 1.3);
  gbrFaunaTest.update(0.05, 2.1, new T.Vector3(40, floorAtGbr + 1.2, 40), 4.5, true);
  assert(OC.faunaInfo.siltTurbidity > 0.25 && OC.faunaInfo.siltCount > 0, `Benthic silt-out must generate settling cloud & raise siltTurbidity, got turb=${OC.faunaInfo.siltTurbidity}, count=${OC.faunaInfo.siltCount}`);

  OC.Biomes.setActive('great_barrier_reef');
  console.log(`   Gas Hydrates, Thermocline Schlieren Haze (${OC.faunaInfo.thermoDepthM} m) & Benthic Silt-Out Plumes (${OC.faunaInfo.siltCount} particles, turb=${OC.faunaInfo.siltTurbidity}) verified.`);
}
