// Verify Arctic Sea specifics: polar temperature < -1.0C, aurora, ice_floe/iceberg/brinicle/kelp_arctic & Ultra 5x5 capacity
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, floraProtos } = ctx;
  const arcticBiome = OC.Biomes.get('arctic_sea');
  assert(arcticBiome && arcticBiome.hasAurora, 'arctic_sea must configure hasAurora');
  assert(arcticBiome.getTemperatureAt(0, 65, arcticBiome.zones[3]) < -1.0, 'arctic_sea polar temperature must be sub-zero');
  assert(typeof OC.sound.belugaCall === 'function' && typeof OC.sound.iceCrack === 'function', 'Arctic sound effects belugaCall & iceCrack required');
  for (const spKey of ['ice_floe', 'iceberg', 'brinicle', 'kelp_arctic', 'coral_arctic_soft', 'anemone_arctic']) {
    assert(floraProtos[spKey], `FloraLibrary missing Arctic species ${spKey}`);
    assert(arcticBiome.encyclopedia[spKey], `arctic_sea encyclopedia missing ${spKey}`);
  }
  const arcUltraCounts = {};
  for (let cz = -2; cz <= 2; cz++) {
    for (let cx = -2; cx <= 2; cx++) {
      const items = arcticBiome.generateChunkFlora(cx, cz, 150, 1.32, OC.mulberry32(((cx * 73856093) ^ (cz * 19349663)) >>> 0));
      for (const it of items) arcUltraCounts[it.species] = (arcUltraCounts[it.species] || 0) + 1;
    }
  }
  for (const [spKey, cnt] of Object.entries(arcUltraCounts)) {
    assert(cnt <= floraProtos[spKey].maxInstances, `Arctic Ultra 5x5 pool overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
  }
  assert(arcUltraCounts.ice_floe > 10 && arcUltraCounts.kelp_arctic > 15, 'arctic_sea must generate ice_floe and kelp_arctic');
  console.log('   Arctic Sea polar fauna, Aurora Borealis, negative water temp & Ultra 5x5 flora pools verified.');
  return { arcticBiome };
}
