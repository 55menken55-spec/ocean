// Switch back to GBR and verify runtime quality switching
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, biome, scene, spawnVec, camera } = ctx;
  const gbrBack = OC.Biomes.setActive('great_barrier_reef');
  OC.Terrain.init(scene, gbrBack, spawnVec);
  OC.FloraStreamer.init(scene, gbrBack, spawnVec);
  const gbrFauna = OC.FaunaEngine.init(scene, gbrBack);
  OC.Navigation.setBiome(gbrBack);
  OC.Minimap.setBiome(gbrBack);
  OC.Atlas.setBiome(gbrBack);

  for (const qId of ['low', 'medium', 'high', 'ultra']) {
    OC.Quality.set(qId);
    OC.Terrain.update(camera.position);
    OC.FloraStreamer.update(camera.position);
    gbrFauna.update(0.016, OC.uTime.value, camera.position);
  }
  console.log('   Multi-biome hot-switching & runtime quality preset switching (low -> ultra) verified.');

  /* ---- Стадии H-Z вынесены в tests/stages/*.mjs ----
     Общий контекст: движок, сцена, собранные исходники и DOM-заглушки.
     Стадии кладут в него свои результаты через Object.assign, поэтому порядок
     вызовов важен: например, cenote_caves публикует ccBiome для сонара. */
  return { gbrBack, gbrFauna };
}
