/* ================= СТАДИЯ: ПАРИТЕТ ПУТЕЙ ПОСТРОЙКИ ЧАНКОВ ================= */
/* Web Worker и синхронный fallback обязаны выдавать одну и ту же геометрию.
   Исторически это были две независимые копии кода и они расходились: воркерная
   потеряла расчёт градиента высот, из-за чего дно в браузере затенялось иначе,
   чем в тестах. Теперь обе собирают геометрию через assembleChunkMesh, и это
   закреплено проверкой. */
import assert from 'node:assert/strict';
import { snapshotTerrain, compareSnapshots, parityProbe } from '../lib/terrain_checks.mjs';

export function run(ctx) {
  const { T, OC, h, scene } = ctx;
  for (const bId of ['cenote_caves', 'europa_ocean', 'great_barrier_reef']) {
    const parBiome = OC.Biomes.get(bId);
    const parPos = parityProbe(T, bId, parBiome);

    // 1) Чисто синхронный снимок: конструктор воркера падает, поэтому и стартовая
    //    окрестность из init, и все чанки из update строятся синхронно.
    // Воркер мог остаться живым от предыдущего биома, а init создаёт его только
    // если terrainWorker уже пуст — сначала гасим текущий через onerror, которым
    // terrain.js сам сбрасывает terrainWorker в null.
    h.setForceSyncPath(true);
    h.dropWorker('drop worker before sync snapshot');
    OC.Terrain.init(scene, parBiome, parPos);
    assert(!h.getFakeWorker(), `${bId}: при forceSyncPath воркер не должен создаваться`);
    for (let i = 0; i < 4; i++) OC.Terrain.update(parPos);
    const syncSnap = snapshotTerrain(scene);

    // 2) Чисто воркерный снимок: тот же биом, но воркер создаётся и работает.
    h.setForceSyncPath(false);
    OC.Terrain.init(scene, parBiome, parPos);
    assert(h.getFakeWorker(), `${bId}: воркер должен создаваться при init`);
    for (let i = 0; i < 4; i++) OC.Terrain.update(parPos);
    const workerSnap = snapshotTerrain(scene);

    assert(syncSnap.size > 0, `${bId}: не построено ни одного чанка`);
    const ceilKeys = [...workerSnap.keys()].filter((k) => k.endsWith('|c')).length;
    if (parBiome.getCeilingHeight) {
      assert(ceilKeys > 0, `${bId}: потолок должен строиться и на пути Web Worker`);
      if (parBiome.isCeilingOpen) {
        // В кадре должен быть чанк с вырезами в своде: иначе маска не проверяется
        const openNear = parBiome.isCeilingOpen(parPos.x, parPos.z) ||
          parBiome.isCeilingOpen(parPos.x + 90, parPos.z) || parBiome.isCeilingOpen(parPos.x - 90, parPos.z) ||
          parBiome.isCeilingOpen(parPos.x, parPos.z + 90) || parBiome.isCeilingOpen(parPos.x, parPos.z - 90);
        assert(openNear, `${bId}: точка замера паритета должна содержать открытый участок потолка`);
      }
    }
    compareSnapshots(syncSnap, workerSnap, `${bId} worker-vs-sync`);
    console.log(`   ${bId}: worker и синхронный fallback дают identical geometry (${workerSnap.size} мешей, из них потолков ${ceilKeys}).`);
  }
  }
