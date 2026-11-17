/* ============ СТАДИЯ: ЛИДАР КАК ЗАПАСНОЙ КАНАЛ ИЗОБРАЖЕНИЯ ============ */
/* Прожектор — не вечный прибор: давление, взвесь, извержение и удары о грунт
   его убивают. Без канала изображения аппарат в темноте слепнет, поэтому
   лидар подхватывает картинку: он светит сам и не зависит от подсветки сцены.

   Здесь проверяется именно физика прибора, а не зелёный фильтр поверх кадра:
   дальность выводится из прозрачности воды (луч гаснет на оба конца), а
   каждая точка облака — это возврат от настоящей поверхности: дна, свода
   пещеры, рыбы или взвеси. */
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC, worldSrc } = ctx;

  /* ---- 1. Дальность прибора: её ставит вода, а не настройка качества ----
     Луч идёт до цели и обратно, поэтому предел там, где exp(-2·c·d)/d²
     опускается ниже порога приёма. В брайниковом рассоле лидар слепнет. */
  const rangeOf = OC.Lidar._detectionRange;
  const rClear = rangeOf(0.0005);   // апвеллинг Галапагоса, Байкал
  const rTurbid = rangeOf(0.0060);  // флоридские пещеры
  const rSoup = rangeOf(0.0220);    // брайниковый рассол, шлейф источника
  assert(rClear > 90, `Clear water must give the lidar its full reach (got ${rClear.toFixed(1)} m)`);
  assert(rTurbid > 35 && rTurbid < rClear, `Cave water must cut the range to tens of metres (got ${rTurbid.toFixed(1)} m)`);
  assert(rSoup < 20, `Brine-like water must blind the lidar (got ${rSoup.toFixed(1)} m)`);
  assert(rSoup <= rTurbid && rTurbid <= rClear, 'Lidar range must fall monotonically with water attenuation');
  /* Мутность должна менять дальность на порядок, а не на проценты: иначе
     лидар не чувствует разницы между Байкалом и брайниковым рассолом. */
  assert(rClear / rSoup > 6, `Attenuation must dominate the range (clear ${rClear.toFixed(0)} m vs brine ${rSoup.toFixed(0)} m)`);
  const rBaikal = rangeOf(0.0012);
  assert(rBaikal > 60 && rBaikal <= rClear, `Baikal water must sit between the extremes (got ${rBaikal.toFixed(1)} m)`);

  /* ---- 2. Облако точек: возвраты от настоящего дна ---- */
  const scene = new T.Scene();
  const pts = OC.Lidar.init(scene);
  assert(pts && pts.isPoints, 'OC.Lidar.init must return the point cloud added to the scene');

  const biome = OC.Biomes.get('great_barrier_reef');
  OC.Biomes.setActive(biome.id);
  const camera = new T.PerspectiveCamera(60, 16 / 9, 0.1, 4000);
  camera.position.set(biome.spawn.pos[0], biome.spawn.pos[1], biome.spawn.pos[2]);

  // Смотрим вниз и чуть в сторону: так луч упирается в дно, а не в толщу воды
  camera.rotation.set(-Math.PI / 3, 0.4, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  OC.Lidar.setActive(true);
  assert(OC.Lidar.isActive(), 'OC.Lidar must report the active state');
  // Полный проход развёртки: 64 столбца по 3 за кадр
  for (let i = 0; i < 30; i++) OC.Lidar.update(1 / 60, camera, biome, {});

  const st = OC.Lidar.getState();
  assert(st.active, 'OC.Lidar.getState must report an active scan');
  assert(st.points > 200, `The seafloor must fill the cloud with returns (got ${st.points})`);
  assert(st.rangeM > 0 && st.rangeM < 100, `Scan range must be a sane distance (got ${st.rangeM})`);
  assert(st.atten > 0, 'The lidar must publish the water attenuation it measured');

  const posAttr = pts.geometry.attributes.position.array;
  const distAttr = pts.geometry.attributes.aDist.array;
  const kindAttr = pts.geometry.attributes.aKind.array;
  const cam = camera.position;
  let floorPts = 0;
  let tooFar = 0;
  let underFloor = 0;
  for (let i = 0; i < distAttr.length; i++) {
    const d = distAttr[i];
    if (d <= 0) continue;
    if (d > st.rangeM + 1.5) tooFar++;
    const x = posAttr[i * 3];
    const y = posAttr[i * 3 + 1];
    const z = posAttr[i * 3 + 2];
    // Точка обязана лежать в воронке обзора: перед сенсором, а не за спиной
    const travelled = Math.hypot(x - cam.x, y - cam.y, z - cam.z);
    assert(Math.abs(travelled - d) < 0.01, 'A cloud point must sit exactly at its reported range');
    if (kindAttr[i] !== 0) continue; // свод, объект и взвесь проверяем отдельно
    floorPts++;
    const floorH = biome.getHeight(x, z);
    if (y < floorH - 0.05) underFloor++;
    assert(y - floorH < 1.4,
      `A bottom return must stop at the seafloor, not above it (got ${(y - floorH).toFixed(2)} m over the floor)`);
  }
  assert(floorPts > 100, `Looking down must return the seafloor (got ${floorPts} bottom points)`);
  assert(tooFar === 0, 'No return may exceed the detection range of the water');
  assert(underFloor === 0, 'A bottom return may never sink under the terrain surface');

  /* ---- 3. Свод пещеры: лидар видит и потолок, а не только дно ---- */
  const caves = OC.Biomes.get('cenote_caves');
  OC.Biomes.setActive(caves.id);
  const cam2 = new T.PerspectiveCamera(60, 16 / 9, 0.1, 4000);
  // Точка пещеры с низким сводом: у спавна сенот открыт, свода там нет
  const caveX = 47.1, caveZ = 121.2;
  cam2.position.set(caveX, caves.getCeilingHeight(caveX, caveZ) - 6, caveZ);
  cam2.rotation.set(Math.PI / 2.4, 0, 0); // смотрим вверх, в свод
  cam2.updateMatrixWorld(true);
  cam2.updateProjectionMatrix();
  for (let i = 0; i < 30; i++) OC.Lidar.update(1 / 60, cam2, caves, {});
  const st2 = OC.Lidar.getState();
  let ceilPts = 0;
  const kind2 = pts.geometry.attributes.aKind.array;
  const pos2 = pts.geometry.attributes.position.array;
  for (let i = 0; i < kind2.length; i++) {
    if (kind2[i] !== 1) continue;
    ceilPts++;
    const y = pos2[i * 3 + 1];
    const ch = caves.getCeilingHeight(pos2[i * 3], pos2[i * 3 + 2]);
    assert(y > ch - 1.4 && y < ch + 1.4,
      `A ceiling return must stop at the cave roof (point ${y.toFixed(1)} m, roof ${ch.toFixed(1)} m)`);
  }
  assert(ceilPts > 0, `Looking up in a cave must return the roof (got ${ceilPts} ceiling points of ${st2.points})`);

  /* ---- 4. Перенос начала координат не уносит облако ----
     Облако рисуется в локальных координатах сцены и помечено
     noFloatingOrigin: при сдвиге весь мир уезжает, и буфер обязан уехать
     вместе с ним, иначе картинка останется там, где была. */
  const oBefore = OC.FloatingOrigin.getOrigin().clone();
  const worldBefore = [];
  const distSnap = pts.geometry.attributes.aDist.array;
  const posSnap = pts.geometry.attributes.position.array;
  for (let i = 0; i < distSnap.length; i++) {
    if (distSnap[i] <= 0) continue;
    worldBefore.push([posSnap[i * 3] + oBefore.x, posSnap[i * 3 + 1] + oBefore.y, posSnap[i * 3 + 2] + oBefore.z]);
  }
  assert(worldBefore.length > 100, 'The scan must have points to shift');

  const prevThreshold = OC.FloatingOrigin.getThreshold();
  OC.FloatingOrigin.setThreshold(100);
  const shifted = OC.FloatingOrigin.update(cam2, scene);
  const oAfter = OC.FloatingOrigin.getOrigin().clone();
  assert(shifted && Math.hypot(oAfter.x - oBefore.x, oAfter.z - oBefore.z) > 100,
    'The floating origin must actually shift at a 100 m threshold far from the spawn');

  const posAfter = pts.geometry.attributes.position.array;
  let k = 0;
  for (let i = 0; i < distSnap.length; i++) {
    if (distSnap[i] <= 0) continue;
    const wx = posAfter[i * 3] + oAfter.x;
    const wz = posAfter[i * 3 + 2] + oAfter.z;
    const want = worldBefore[k++];
    assert(Math.hypot(wx - want[0], wz - want[2]) < 1e-3,
      'The cloud must ride along with the world when the floating origin shifts');
  }
  assert(k === worldBefore.length, 'The shifted cloud must keep every return');

  /* Origin — общий для всех стадий: возвращаем его туда, где он был. Для этого
     камеру ставят в минус-дельту — update снова доведёт origin до исходного. */
  cam2.position.set(oBefore.x - oAfter.x, cam2.position.y, oBefore.z - oAfter.z);
  OC.FloatingOrigin.update(cam2, scene);
  OC.FloatingOrigin.setThreshold(prevThreshold);
  const oBack = OC.FloatingOrigin.getOrigin();
  assert(Math.hypot(oBack.x - oBefore.x, oBack.z - oBefore.z) < 1e-6,
    'The lidar stage must leave the floating origin where it found it');

  /* ---- 5. Отказ прожектора: прибор ломается, лидар остаётся ---- */
  assert(typeof OC.damageFlashlight === 'function' && typeof OC.getFlashlightStatus === 'function',
    'The world must expose the flashlight health API the lidar relies on');
  OC.repairFlashlight(1);
  assert(OC.isFlashlightBroken() === false, 'A repaired flashlight must not stay broken');
  OC.damageFlashlight(1.0, 'depth');
  assert(OC.isFlashlightBroken(), 'Spent health must break the flashlight');
  let fst = OC.getFlashlightStatus();
  assert(fst.broken && fst.repairS > 0, `A broken flashlight must schedule a repair (got ${fst.repairS} s left)`);
  assert(OC.getFlashlightReasonText().length > 0, 'The failure must have a readable cause');
  // Сломанный прибор не тратит ресурс повторно и не чинится сам собой
  OC.damageFlashlight(1.0, 'silt');
  assert(OC.getFlashlightHealth() === 0, 'A broken flashlight must not wear out twice');
  OC.repairFlashlight(0.6);
  assert(OC.isFlashlightBroken() === false, 'Repairing must clear the broken flag');
  assert(OC.getFlashlightHealth() > 0.5, `Repair must restore health (got ${OC.getFlashlightHealth()})`);

  /* ---- 6. Модель износа считает давление, взвесь, вулкан и грунт ---- */
  for (const frag of [
    'depthM - 1500',      // давление: ниже полутора километров ресурс тает
    'siltTurbidity',      // взвесь абразит оптику
    'OC.Volcano.isActive',// извержение бьёт по прибору теплом и химией
    'bottomHitCd',        // касание грунта — разовый удар, а не непрерывный износ
    'REPAIR_S',           // самовосстановление по таймеру
    'DOCK_RADIUS',        // полный ремонт — только у судна обеспечения
    'flashFlicker'        // предотказное мерцание, а не мгновенная смерть
  ]) {
    assert(worldSrc.includes(frag), `world.js must model the flashlight wear source: ${frag}`);
  }
  assert(/const targetFlashI = \(flashlightOn && !flashBroken\)/.test(worldSrc),
    'A broken flashlight must emit no light even while the toggle stays on');

  /* ---- 7. Собранная страница: прибор, кнопка и подсказка ---- */
  assert(ctx.html.includes('id="lidar-box"'), 'index.html must contain the lidar instrument panel');
  assert(ctx.html.includes('id="btn-lidar"'), 'index.html must contain the lidar toolbar button');
  assert(ctx.html.includes('Shift+F'), 'index.html must document the lidar hotkey');

  // Возвращаем биом и выключаем прибор: стадия не должна менять мир для соседей
  OC.Lidar.setActive(false);
  assert(!OC.Lidar.isActive(), 'OC.Lidar must switch off on demand');
  OC.Biomes.setActive(biome.id);
  OC.repairFlashlight(1);

  console.log(`   Lidar: range ${rClear.toFixed(0)} m clear / ${rSoup.toFixed(0)} m brine · ` +
    `${st.points} pts over the reef floor · ${ceilPts} ceiling returns · wear + repair modelled`);
  return { lidarRangeClear: rClear, lidarRangeBrine: rSoup };
}
