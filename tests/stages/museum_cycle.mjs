// W) Verify Step 6: Expedition Sample Museum & Full Day/Night Ecosystem Cycle (Coral Spawning, Nocturnal Predators, DVM)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T, galBiome, gbrBiome, scene } = ctx;
  OC.ROV.clearSamples();
  const smpGbr = OC.ROV.grabSample(gbrBiome, new T.Vector3(0, -10, 0), new T.Vector3(0, 0, 1), OC.EcoLab.getState());
  const smpGal = OC.ROV.grabSample(galBiome, new T.Vector3(165, -24, -48), new T.Vector3(0, 0, 1), OC.EcoLab.getState());
  assert(smpGbr && smpGal, 'ROV grabSample must archive samples into persistent Expedition Museum');
  const museumAll = OC.Expedition.getSamples();
  assert.equal(museumAll.length, 2, `Expedition Sample Museum must retain 2 distinct samples across biomes, got ${museumAll.length}`);
  assert.equal(OC.Expedition.getAllSummary().samplesCount, 2, 'Expedition allSummary.samplesCount must reflect Museum count');

  // Day/Night Ecosystem Cycle on Great Barrier Reef:
  // Noon -> DVM plankton sinks deeper, coral spawning = 0, nocturnal predators dormant
  const prevTod = OC.getTimeOfDay();
  OC.setTimeOfDay(0.5);
  const gbrDaySp = new T.Vector3(gbrBiome.spawn.pos[0], gbrBiome.spawn.pos[1], gbrBiome.spawn.pos[2]);
  const gbrFaunaTest = OC.FaunaEngine.init(scene, gbrBiome);
  gbrFaunaTest.update(0.05, 1.0, gbrDaySp, 0, false);
  const infoDay = Object.assign({}, OC.faunaInfo);
  assert.equal(infoDay.dvmPhase, 'day_deep', `Noon must set dvmPhase=day_deep, got ${infoDay.dvmPhase}`);
  assert.equal(infoDay.coralSpawnIntensity, 0, 'Coral spawning must be dormant at noon');
  assert.equal(infoDay.nocturnalPredators, 0, 'Nocturnal reef predators must stay dormant at noon');

  // Dusk ascent -> Deep Scattering Layer begins ascending
  OC.setTimeOfDay(0.76);
  gbrFaunaTest.update(0.05, 1.2, gbrDaySp, 0, false);
  assert(OC.faunaInfo.dvmPhase === 'dusk_ascent' || OC.faunaInfo.dvmPhase === 'night_surface', `Evening must trigger DVM ascent, got ${OC.faunaInfo.dvmPhase}`);

  // Midnight -> Full Coral Mass Spawning + Nocturnal Predators Active + Positive DVM Upward Shift
  OC.setTimeOfDay(0.02);
  gbrFaunaTest.update(0.05, 1.4, gbrDaySp, 0, true);
  const infoNight = OC.faunaInfo;
  assert(infoNight.coralSpawnIntensity > 0.7, `Midnight on GBR must activate mass coral spawning (>0.7), got ${infoNight.coralSpawnIntensity}`);
  assert(infoNight.dvmShiftM > 4.0, `Midnight DVM must shift plankton upward (> +4.0 m), got ${infoNight.dvmShiftM}`);
  assert(infoNight.nocturnalPredators >= 1, `Midnight must activate nocturnal predators (>=1), got ${infoNight.nocturnalPredators}`);

  // Restore clean default state
  OC.setTimeOfDay(prevTod);
  OC.ROV.clearSamples();
  console.log(`   Expedition Sample Museum (${museumAll.length} persisted samples) & Day/Night Ecosystem Cycle (DVM ${infoDay.dvmPhase} -> ${infoNight.dvmPhase}, coralSpawn=${infoNight.coralSpawnIntensity}, noctPred=${infoNight.nocturnalPredators}) verified.`);
  return { gbrFaunaTest };
}
