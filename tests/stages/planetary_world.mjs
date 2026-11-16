// AB2) Verify Direction 3.1 (step 1): planetary world — no circular world edge
/* Исторически мир был кругом радиусом worldRadius (1200 м): clampPosition
   зажимал камеру по x/z, а горизонтный фартук дна стоял статичным мешем в
   начале координат. Теперь мир без края: камера уходит на любое расстояние,
   чанки и флора стримятся вокруг игрока, а фартук едет за ним.

   Что здесь ловится (всё проверено откатом правки):
   • clampPosition возвращал камеру на bound = worldRadius − 30, и «заплыть
     за карту» было невозможно — проверяется полёт на 4000 м;
   • фартук строился в мировом начале и оставался там навсегда: уйдя на
     километры, игрок видел на горизонте дно из точки старта — проверяется,
     что центр фартука следует за камерой;
   • сама высота дна на больших координатах обязана оставаться конечной. */
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC, scene, camera, getEl } = ctx;

  // 1. Все биомы — миры без края
  for (const b of OC.Biomes.list()) {
    assert(b.unbounded === true, `Biome ${b.id} must be an unbounded (edgeless) world`);
    assert(OC.Biomes.isUnbounded(b), `OC.Biomes.isUnbounded must accept ${b.id}`);
  }

  const pwScene = new T.Scene();
  const biome = OC.Biomes.get('great_barrier_reef');
  OC.Biomes.setActive('great_barrier_reef');
  const spawn = new T.Vector3(biome.spawn.pos[0], biome.spawn.pos[1], biome.spawn.pos[2]);
  OC.Terrain.init(pwScene, biome, spawn);
  OC.FloraStreamer.init(pwScene, biome, spawn);
  OC.Navigation.setBiome(biome);

  const FAR = 4000; // вдвое дальше старой границы видимого мира (1200 м)
  let cam = new T.Vector3(FAR, -40, FAR);

  // 2. Камера обязана долететь до дальней точки, а не упереться в край карты
  OC.Navigation.flyTo(cam.x, cam.y, cam.z, 0.4, -0.1);
  /* flyTo ставит цель, а летит аппарат с инерцией — даём ему долететь. */
  for (let i = 0; i < 60; i++) {
    OC.uTime.value += 0.16;
    OC.Navigation.update(0.16, OC.uTime.value, camera, false);
  }
  const reached = OC.Navigation.getPosition();
  assert(Math.abs(reached.x - FAR) < 5.0 && Math.abs(reached.z - FAR) < 5.0,
    `Camera must fly beyond the old 1170 m world edge (got ${reached.x.toFixed(0)}, ${reached.z.toFixed(0)})`);

  /* Дальше работаем напрямую с позицией: Navigation.update() пишет в камеру,
     а нам нужен повторяемый прогон без инерции и ввода. */
  cam = new T.Vector3(reached.x, reached.y, reached.z);

  // 3. Рельеф стримится вокруг игрока, а не вокруг точки спавна
  for (let i = 0; i < 60; i++) OC.Terrain.update(cam);
  const tStats = OC.Terrain.getStats();
  assert(tStats.visible > 0, 'Terrain must stream chunks far away from the spawn point');
  let nearestChunk = Infinity;
  pwScene.traverse((o) => {
    if (!o.isMesh || !o.userData.key) return;
    if (!o.visible || !o.geometry || !o.geometry.boundingSphere) return;
    if (o.geometry.boundingSphere.radius > 2000) return; // это фартук, его считаем отдельно
    nearestChunk = Math.min(nearestChunk, Math.hypot(o.position.x - cam.x, o.position.z - cam.z));
  });
  assert(nearestChunk < 400,
    `Terrain must stream chunks around the player, nearest chunk is ${nearestChunk.toFixed(0)} m away`);

  // 4. Флора тоже стримится на новом месте
  for (let i = 0; i < 240; i++) OC.FloraStreamer.update(cam);
  const fStats = OC.FloraStreamer.getStats();
  assert(fStats.cachedChunks > 0 && fStats.activeInstances > 0,
    'Flora must stream around the player on an unbounded world');

  // 5. Горизонтный фартук едет за игроком, а не остаётся у точки старта
  const apron = (() => {
    let found = null;
    pwScene.traverse((o) => {
      if (found || !o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere && o.geometry.boundingSphere.radius > 2000) found = o;
    });
    return found;
  })();
  assert(apron, 'Terrain must build the horizon apron on an unbounded world too');
  assert(apron.visible, 'Horizon apron must stay visible far from spawn');
  const apronWorld = new T.Vector3(
    apron.position.x + OC.FloatingOrigin.getOrigin().x,
    0,
    apron.position.z + OC.FloatingOrigin.getOrigin().z
  );
  const apronOffset = Math.hypot(apronWorld.x - cam.x, apronWorld.z - cam.z);
  assert(apronOffset < 1400,
    `Horizon apron must follow the player: it is ${apronOffset.toFixed(0)} m away from the camera`);
  assert(apron.geometry.boundingSphere.radius > 2000, 'Horizon apron must still reach ~2600 m');

  // 6. Рельеф обязан быть конечным на любом удалении (Floating Origin держит точность)
  for (const [hx, hz] of [[0, 0], [FAR, FAR], [-25000, 25000], [120000, -90000]]) {
    const h = biome.getHeight(hx, hz);
    assert(Number.isFinite(h), `getHeight(${hx}, ${hz}) must stay finite on an edgeless world`);
    assert(h > -300 && h < 60, `getHeight(${hx}, ${hz}) out of plausible range: ${h}`);
  }

  // 7. Долгий заплыв: origin накапливает путь, локальные координаты остаются около нуля
  const originBefore = OC.FloatingOrigin.getOrigin().clone();
  const traveller = cam.clone();
  for (let step = 0; step < 40; step++) {
    traveller.x += 250;
    traveller.z += 250;
    const localPos = new T.Vector3(
      traveller.x - OC.FloatingOrigin.getOrigin().x,
      traveller.y - OC.FloatingOrigin.getOrigin().y,
      traveller.z - OC.FloatingOrigin.getOrigin().z
    );
    camera.position.copy(localPos);
    OC.FloatingOrigin.update(camera, pwScene);
    camera.position.set(0, 0, 0); // после сдвига камера возвращается в начало сцены
  }
  const shiftedBy = Math.hypot(
    OC.FloatingOrigin.getOrigin().x - originBefore.x,
    OC.FloatingOrigin.getOrigin().z - originBefore.z
  );
  assert(shiftedBy > 5000, `A 14 km trip must accumulate in the floating origin (got ${shiftedBy.toFixed(0)} m)`);
  camera.position.set(0, 0, 0);

  // 8. Мини-карта и Fog of War не падают за пределами ядра карты
  OC.Minimap.init(getEl('map-cov'), biome, () => {}, () => {});
  OC.Minimap.update(cam, 0.4);
  const coverage = OC.Minimap.getCoverage();
  assert(Number.isFinite(coverage) && coverage >= 0 && coverage <= 100,
    `Map coverage must stay a sane percentage outside the core area (got ${coverage})`);

  // 9. Регрессия: вертикальный зажим и protection от дна работают как раньше
  OC.Navigation.flyTo(FAR, biome.getHeight(FAR, FAR) - 40, FAR, 0, 0);
  const belowFloor = OC.Navigation.getPosition();
  assert(belowFloor.y >= biome.getHeight(FAR, FAR) + 1.0,
    `Camera must not sink under the seabed (y = ${belowFloor.y.toFixed(1)})`);
  OC.Navigation.flyTo(FAR, 400, FAR, 0, 0);
  const aboveSky = OC.Navigation.getPosition();
  assert(aboveSky.y <= (biome.maxCamY !== undefined ? biome.maxCamY : 16.0) + 0.001,
    `Camera must stay under the surface ceiling (y = ${aboveSky.y.toFixed(1)})`);

  /* 10. Фауна обязана считаться и вдали от ядра: позиции конечны, агенты не
     падают. Населённость мира вне ядра — отдельный подшаг 3.1. */
  const pwFauna = OC.FaunaEngine.init(pwScene, biome);
  const farCamLocal = new T.Vector3(
    cam.x - OC.FloatingOrigin.getOrigin().x,
    -40,
    cam.z - OC.FloatingOrigin.getOrigin().z
  );
  for (let i = 0; i < 12; i++) {
    OC.uTime.value += 0.16;
    pwFauna.update(0.16, OC.uTime.value, farCamLocal, 2.0, true);
  }
  let faunaChecked = 0;
  for (const ag of pwFauna.agents) {
    const p = ag.getPosition ? ag.getPosition() : null;
    if (!p) continue;
    faunaChecked++;
    assert(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
      `Fauna agent ${ag.key || '?'} must stay finite 4 km from spawn`);
  }
  assert(faunaChecked > 0, 'Fauna must expose positioned agents');

  // 11. Ядро мира с достопримечательностями никуда не делось
  assert(biome.landmarks.every((lm) => Math.abs(lm.x) <= biome.worldRadius && Math.abs(lm.z) <= biome.worldRadius),
    'Landmarks must stay inside the core area of the world');

  OC.Biomes.setActive('great_barrier_reef');
  console.log(`   Planetary world (step 1): edge removed — flight to ${FAR} m, terrain & flora stream around the player, horizon apron follows (${apronOffset.toFixed(0)} m), ${faunaChecked} fauna agents finite, origin absorbs ${(shiftedBy / 1000).toFixed(1)} km.`);
}
