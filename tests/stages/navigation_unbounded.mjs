/* ============ СТАДИЯ: НАВИГАЦИЯ БЕЗ КРАЯ (мировые координаты) ============ */
/* Навигация ведёт аппарат в МИРОВЫХ координатах, а камера стоит в локальных
   (Floating Origin держит её у начала сцены, иначе float32 не выдержит
   километров). Пока state.pos считался локальным, эта пара рассогласовывалась:
   навигация каждый кадр перезаписывала camera.position, Floating Origin
   сбрасывал его в ноль, а state.pos не трогал — и origin уезжал на километр
   за кадр. Мир полз под игроком, телепорт к маяку уносил за сотни километров,
   а зона, дно и карта считались по точке старта.

   Стадия идёт последней: она копит в origin километры пути. */
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC, getEl } = ctx;
  const biome = OC.Biomes.get('great_barrier_reef');
  OC.Biomes.setActive(biome.id);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(60, 16 / 9, 0.1, 4000);
  const sp = new T.Vector3(biome.spawn.pos[0], biome.spawn.pos[1], biome.spawn.pos[2]);
  OC.Terrain.init(scene, biome, sp);
  OC.FloraStreamer.init(scene, biome, sp);
  OC.Navigation.init(getEl('scene'), biome, {});
  OC.Minimap.init(getEl('map-cov'), biome, () => {}, () => {});
  OC.FloatingOrigin.setThreshold(1000);

  /* Один кадр игрового цикла: навигация пишет камеру, Floating Origin копит
     путь. Именно так это происходит в ui/main.js. */
  function frame(n) {
    for (let i = 0; i < n; i++) {
      OC.uTime.value += 0.16;
      OC.Navigation.update(0.16, OC.uTime.value, camera, false);
      OC.FloatingOrigin.update(camera, scene);
      OC.Terrain.update(camera.position);
    }
  }
  const world = () => OC.Navigation.getPosition();
  const local = () => OC.Navigation.getLocalPosition();
  const origin = () => OC.FloatingOrigin.getOrigin();
  const localFromCam = () => camera.position;

  frame(4);

  /* ---- 1. Инвариант: мировая точка = локальная + origin ---- */
  assert(typeof OC.Navigation.getLocalPosition === 'function',
    'Navigation must expose the scene-space position of the craft (getLocalPosition)');
  let inv = local().clone().add(origin());
  assert(Math.hypot(inv.x - world().x, inv.z - world().z) < 1e-6,
    'Navigation must keep the world position equal to the local one plus the floating origin');

  /* ---- 2. Далёкий перелёт: origin копит путь, а не кадры ---- */
  const FAR = 5000;
  OC.Navigation.flyTo(FAR, -40, FAR, 0, 0);
  frame(200);
  const path = Math.hypot(FAR - biome.spawn.pos[0], FAR - biome.spawn.pos[2]);
  const flown = Math.hypot(world().x - biome.spawn.pos[0], world().z - biome.spawn.pos[2]);
  assert(Math.hypot(world().x - FAR, world().z - FAR) < 10,
    `The craft must reach the world point it flew to (got ${world().x.toFixed(0)}, ${world().z.toFixed(0)})`);
  /* Раскрутка давала по километру на кадр: 200 кадров — это 200 км вместо 7.
     Порог в два пути с запасом ловит её и не зависит от порога сдвига. */
  const originLen = Math.hypot(origin().x, origin().z);
  assert(originLen < path * 2,
    `The floating origin must accumulate the travelled path, not one jump per frame (origin ${(originLen / 1000).toFixed(1)} km for a ${(flown / 1000).toFixed(1)} km trip)`);
  assert(originLen > path * 0.5,
    `The floating origin must follow the craft on an edgeless world (origin ${(originLen / 1000).toFixed(1)} km)`);
  // Камера остаётся в начале сцены: иначе точность float32 теряется
  assert(Math.hypot(localFromCam().x, localFromCam().z) < OC.FloatingOrigin.getThreshold() + 50,
    `The camera must stay near the scene origin (${Math.hypot(localFromCam().x, localFromCam().z).toFixed(0)} m)`);

  /* ---- 3. Дно под аппаратом считается по мировой точке ---- */
  const floorWorld = biome.getHeight(world().x, world().z);
  assert(world().y >= floorWorld + 1.0,
    `The craft must stay above the seabed of its own world point (y = ${world().y.toFixed(1)}, floor ${floorWorld.toFixed(1)})`);
  assert(Number.isFinite(floorWorld) && floorWorld < 0,
    'The seabed under the craft far outside the core must be real ocean floor');

  /* ---- 4. Рельеф стримится вокруг мировой точки аппарата ---- */
  let nearestChunk = Infinity;
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.boundingSphere) return;
    if (o.geometry.boundingSphere.radius > 2000) return; // горизонтный фартук
    const cxw = o.position.x + origin().x;
    const czw = o.position.z + origin().z;
    nearestChunk = Math.min(nearestChunk, Math.hypot(cxw - world().x, czw - world().z));
  });
  assert(nearestChunk < 400,
    `Terrain must stream around the world position of the craft (nearest chunk ${nearestChunk.toFixed(0)} m away)`);

  /* ---- 5. Телепорт к маяку приводит ровно в маяк ---- */
  const lm = biome.landmarks[0];
  OC.Navigation.flyTo(lm.x, lm.y, lm.z, lm.yaw, lm.pitch);
  frame(300);
  const landErr = Math.hypot(world().x - lm.x, world().z - lm.z);
  assert(landErr < 12,
    `Flying to a landmark must land on it (${lm.id}: ${landErr.toFixed(0)} m off)`);
  assert(Math.abs(world().y - lm.y) < 12,
    `Flying to a landmark must keep its depth (${lm.id}: y = ${world().y.toFixed(1)})`);

  /* ---- 6. Вертикальный зажим: дно и поверхность по мировой точке ---- */
  OC.Navigation.flyTo(FAR, biome.getHeight(FAR, FAR) - 40, FAR, 0, 0);
  frame(30);
  assert(world().y >= biome.getHeight(world().x, world().z) + 1.0,
    `The craft must not sink under the seabed of its world point (y = ${world().y.toFixed(1)})`);
  OC.Navigation.flyTo(FAR, 400, FAR, 0, 0);
  frame(30);
  assert(world().y <= (biome.maxCamY !== undefined ? biome.maxCamY : 16.0) + 0.001,
    `The craft must stay under the surface ceiling (y = ${world().y.toFixed(1)})`);

  /* ---- 7. Карта и туман войны чертятся вокруг мировой точки ---- */
  OC.Minimap.update(world(), OC.Navigation.getYaw());
  const view = OC.Minimap.getViewCenter();
  assert(Math.hypot(view.x - world().x, view.z - world().z) <= 320,
    `Map window must follow the world position of the craft (centre ${view.x.toFixed(0)},${view.z.toFixed(0)})`);
  OC.Minimap.revealSwath(world().x, world().z, 0.8, 220);
  assert(OC.Minimap.isRevealed(world().x, world().z),
    'Fog of War must chart the world point the craft is at, not its local one');

  /* ---- 8. Ядро: дальность, пеленг и курс домой ----
     За кругом worldRadius нет ни маяков, ни миссий, а карта показывает только
     окно вокруг аппарата. Игрок должен видеть, где ядро и как далеко оно. */
  assert(OC._NavCore, 'OC._NavCore must exist: the core bearing belongs to navigation');
  const CORE_OUT = 12000;
  OC.Navigation.flyTo(CORE_OUT, -40, 0, 0, 0);
  frame(300);
  const core = OC._NavCore.info(biome, world());
  assert(core.outside, 'The craft 12 km from the spawn must be outside the core area');
  assert(Math.abs(core.edgeM - (CORE_OUT - biome.worldRadius)) < 20,
    `The distance to the core must be measured to its edge (got ${core.edgeM.toFixed(0)} m, core radius ${biome.worldRadius})`);
  // Пеленг на мировое начало: аппарат ушёл строго на восток (+X), ядро на западе
  assert(core.bearingDeg === 270,
    `The bearing to the core must point west from a craft on the +X axis (got ${core.bearingDeg}°)`);
  assert(core.nearest && core.nearest.distM > 0 && Number.isFinite(core.nearest.distM),
    'Core info must name the nearest landmark to head for');
  const nearCheck = Math.hypot(core.nearest.x - world().x, core.nearest.z - world().z);
  assert(Math.abs(nearCheck - core.nearest.distM) < 1e-6,
    'The distance to the nearest landmark must match its world position');
  const fmt = OC._NavCore.format(core);
  assert(/ км · [СВЮЗ]/.test(fmt), `The core readout must carry the distance and the bearing (got "${fmt}")`);

  /* Курс домой: кнопка «К ядру» ведёт к ближайшему ориентиру ядра */
  const home = OC._NavCore.homeTarget(biome, world());
  assert(home && home.id === core.nearest.id, 'The "return to core" target must be the nearest landmark');
  OC.Navigation.flyTo(home.x, home.y, home.z, home.yaw, home.pitch);
  frame(300);
  const homeErr = Math.hypot(world().x - home.x, world().z - home.z);
  assert(homeErr < 12, `Returning to the core must land on its landmark (${home.id}: ${homeErr.toFixed(0)} m off)`);
  const coreHome = OC._NavCore.info(biome, world());
  assert(!coreHome.outside, 'After returning to the core the craft must be inside the core area again');
  assert(OC._NavCore.format(coreHome) === 'в ядре', 'Inside the core the readout must say so');

  console.log(`   Navigation without an edge: ${(flown / 1000).toFixed(1)} km trip — origin ${(originLen / 1000).toFixed(1)} km (not ${(200 * 1.0).toFixed(0)} km of runaway), camera ${Math.hypot(localFromCam().x, localFromCam().z).toFixed(0)} m from the scene origin, landmark approach ${landErr.toFixed(1)} m, map window on the craft, core ${(core.edgeM / 1000).toFixed(1)} km away on bearing ${core.bearingDeg}° ("${fmt}"), return to ${home.id} lands ${homeErr.toFixed(1)} m off.`);
}
