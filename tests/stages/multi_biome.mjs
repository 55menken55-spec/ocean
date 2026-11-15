/* ================= СТАДИЯ G: ПЛАНЕТАРНАЯ ПЛАТФОРМА ВСЕХ БИОМОВ ================= */
/* Горячая смена биома: стриминг террейна, прототипы флоры, энциклопедия,
   навигация по маякам и отсутствие NaN в геометрии чанков — для каждого биома. */
import assert from 'node:assert/strict';
import { terrainRoot, assertNoNaNGeometry } from '../lib/terrain_checks.mjs';

export function run(ctx) {
  const { T, OC, scene, camera, html, floraProtos, worldSrc } = ctx;
  const allBiomes = OC.Biomes.list();
  assert(allBiomes.length >= 14, `Expected at least 14 registered aquatic biomes, got ${allBiomes.length}`);
  assert(html.includes('id="biome-bar"') && html.includes('id="biome-btns"'), 'index.html missing multi-biome expedition selector');
  assert(worldSrc.includes('uAurora'), 'world.js missing uAurora northern lights shader');

  /* Обход идёт по реестру, а не по списку id: четыре биома заморского
     пополнения (red_sea, florida_caves, amazon_igapo, baikal) раньше в него не
     попадали вовсе — стриминг, атлас и навигация по ним не проверялись ничем,
     из-за чего они генерировали виды флоры без прототипов в FloraLibrary, а те
     молча выбрасывались при раскладке. Новый биом подхватывается автоматически. */
  for (const b of allBiomes) {
    const bId = b.id;
    const activated = OC.Biomes.setActive(bId);
    assert(activated && activated.id === bId, `Failed to activate biome ${bId}`);
    assert(b.zones && b.zones.length >= 4, `${bId} needs >= 4 ecological zones`);
    assert(b.landmarks && b.landmarks.length >= 4, `${bId} needs >= 4 landmarks`);
    assert(typeof b.getCurrentAt === 'function', `${bId} needs getCurrentAt`);

    const bSpawn = b.spawn.pos;
    assert(bSpawn[1] > b.getHeight(bSpawn[0], bSpawn[2]) + 1.5, `${bId} spawn must clear terrain`);
    if (b.getCeilingHeight) {
      assert(bSpawn[1] < b.getCeilingHeight(bSpawn[0], bSpawn[2]) - 1.5, `${bId} spawn must clear cave ceiling`);
    }
    for (const lm of b.landmarks) {
      assert(lm.y > b.getHeight(lm.x, lm.z) + 1.2, `${bId} landmark ${lm.id} must clear terrain`);
      if (b.getCeilingHeight) {
        assert(lm.y < b.getCeilingHeight(lm.x, lm.z) - 1.5, `${bId} landmark ${lm.id} must clear cave ceiling`);
      }
    }
    for (const leg of b.tourLegs) {
      assert(leg.pos[1] > b.getHeight(leg.pos[0], leg.pos[2]) + 1.2, `${bId} tour leg "${leg.title}" must clear terrain`);
      if (b.getCeilingHeight) {
        assert(leg.pos[1] < b.getCeilingHeight(leg.pos[0], leg.pos[2]) - 1.5, `${bId} tour leg "${leg.title}" must clear cave ceiling`);
      }
    }

    // Test hot-swapping engine modules to the biome
    const bSpVec = new T.Vector3(bSpawn[0], bSpawn[1], bSpawn[2]);
    OC.Terrain.init(scene, b, bSpVec);
    OC.FloraStreamer.init(scene, b, bSpVec);
    const bFauna = OC.FaunaEngine.init(scene, b);
    OC.Navigation.setBiome(b);
    OC.Minimap.setBiome(b);
    OC.Atlas.setBiome(b);

    // Verify every placed visible fauna/flora key in scene belongs to biome's encyclopedia
    scene.traverse((obj) => {
      if (obj.visible && (obj.count === undefined || obj.count > 0) && obj.userData && obj.userData.key && obj.userData.key !== 'bubbles' && obj.userData.key !== 'plankton' && obj.userData.key !== 'marine_snow') {
        assert(b.encyclopedia[obj.userData.key], `${bId} scene key "${obj.userData.key}" missing from encyclopedia!`);
      }
    });

    /* Проверяем генератор флоры по сетке чанков вокруг спавна, а не только на
       чанках маяков: виды жёстко привязаны к диапазонам глубин, и на одних только
       маяках половина зон не попадается. Так и жили незамеченными coral_branch и
       sea_lily (red_sea), water_lily, reed, limestone_ledge, mud_rock, cave_algae
       (florida_caves): генератор их выдавал, прототипа в FloraLibrary не было, и
       FloraStreamer молча выбрасывал вид при раскладке инстансов — 27,7 % и 55,3 %
       флоры этих биомов были невидимы в мире и показывались серой сферой в Атласе. */
    const rngB = OC.mulberry32(4242);
    const spCx = Math.floor(b.spawn.pos[0] / b.chunkSize);
    const spCz = Math.floor(b.spawn.pos[2] / b.chunkSize);
    const floraProbes = [];
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) floraProbes.push([spCx + dx, spCz + dz]);
    }
    for (const lm of b.landmarks) floraProbes.push([Math.floor(lm.x / b.chunkSize), Math.floor(lm.z / b.chunkSize)]);
    for (const [pcx, pcz] of floraProbes) {
      const items = b.generateChunkFlora(pcx, pcz, b.chunkSize, 1.32, rngB);
      for (const it of items) {
        assert(floraProtos[it.species], `${bId} generated unknown flora species ${it.species}`);
        assert(b.encyclopedia[it.species], `${bId} flora species ${it.species} missing from encyclopedia`);
      }
    }
    for (const lm of b.landmarks) {
      OC.Navigation.flyTo(lm.x, lm.y, lm.z, lm.yaw, lm.pitch);
      for (let s = 0; s < 6; s++) {
        OC.uTime.value += 0.16;
        OC.Navigation.update(0.16, OC.uTime.value, camera, false);
        OC.Terrain.update(camera.position);
        OC.FloraStreamer.update(camera.position);
        bFauna.update(0.16, OC.uTime.value, camera.position, 2.0, true);
        OC.Minimap.update(camera.position, OC.Navigation.getYaw());
      }
    }
    assert(OC.Terrain.getStats().visible > 0, `${bId} must stream terrain chunks`);
    assert(OC.FloraStreamer.getStats().cachedChunks > 0, `${bId} must cache flora chunks`);
    assertNoNaNGeometry(`${bId} terrain`, terrainRoot(scene), 'position|normal|color');
    console.log(`   Biome "${b.name}" (${b.landmarks.length} landmarks, encyclopedia & streaming) verified.`);
  }
}
