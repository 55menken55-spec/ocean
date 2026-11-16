/* ============ СТАДИЯ: ФАУНА БЕЗ КРАЯ (все биомы вдали от ядра) ============ */
/* Проверка идёт последней: она копит в origin десятки километров и навсегда
   сдвигает сцену, поэтому любая проверка локальных координат обязана идти до
   неё. Сцена и камера — свои, а не из контекста: стадия одна проходит по всем
   15 биомам и подменяет активный биом.

   Что именно ловится:
   1. Обёртка OC._FaunaSpace — мостик между локальными координатами фауны и
      мировыми координатами рельефа. Без неё рыбы спрашивают дно точкой,
      смещённой на origin, то есть на другом конце света.
   2. Агенты, которые хранят высоту в состоянии и не пересчитывают её от дна
      (метановый планировщик Титана уходил в грунт на 108 м).
   3. Статичные цели сонара, чья позиция считалась один раз при высадке и
      уезжала вместе со сценой (метановые сипы Байкала: −1596 м). */
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC } = ctx;

  /* ---- 1. Вид биома «глазами фауны»: локальные координаты ↔ мировые ----
     Биом-заглушка возвращает саму координату: по ответу видно, что именно и
     с каким сдвигом дошло до настоящего биома. */
  const calls = [];
  const stub = {
    id: 'stub_biome',
    worldRadius: 1200,
    getHeight(x, z) { calls.push(['getHeight', x, z]); return x + z * 0.5; },
    getCeilingHeight(x, z) { calls.push(['getCeilingHeight', x, z]); return -x; },
    isCeilingOpen(x, z) { calls.push(['isCeilingOpen', x, z]); return x > 0; },
    getIceMaskAt(x, z) { calls.push(['getIceMaskAt', x, z]); return z; },
    getZoneAt(x, y, z) { calls.push(['getZoneAt', x, y, z]); return { id: 'z', x, y, z }; },
    getCurrentAt(x, y, z, time) { calls.push(['getCurrentAt', x, y, z, time]); return { x, y, z, time }; }
  };
  assert(OC._FaunaSpace && typeof OC._FaunaSpace.wrap === 'function',
    'OC._FaunaSpace.wrap must exist: fauna lives in scene coordinates, the seabed in world ones');
  const view = OC._FaunaSpace.wrap(stub);
  const o = OC.FloatingOrigin.getOrigin();
  assert(view.isFaunaSpaceView === true, 'A fauna-space view must be marked with isFaunaSpaceView');
  assert(view.id === 'stub_biome' && view.worldRadius === 1200,
    'A fauna-space view must expose the biome fields as-is (prototype, no copying)');
  // Дно: локальная точка (10, 20) — это мировая (10 + o.x, 20 + o.z)
  assert(Math.abs(view.getHeight(10, 20) - ((10 + o.x) + (20 + o.z) * 0.5 - o.y)) < 1e-9,
    'The fauna-space view must ask the seabed at world coordinates and answer in the local vertical');
  assert(Math.abs(view.getCeilingHeight(10, 20) - (-(10 + o.x) - o.y)) < 1e-9,
    'The fauna-space view must translate the cave ceiling between scene and world coordinates');
  assert(view.isCeilingOpen(10, 20) === (10 + o.x > 0), 'isCeilingOpen must be asked at world coordinates');
  assert(Math.abs(view.getIceMaskAt(10, 20) - (20 + o.z)) < 1e-9, 'getIceMaskAt must be asked at world coordinates');
  const z0 = view.getZoneAt(10, 5, 20);
  assert(z0.x === 10 + o.x && z0.y === 5 + o.y && z0.z === 20 + o.z, 'getZoneAt must be asked at world coordinates');
  const c0 = view.getCurrentAt(10, 5, 20, 3);
  assert(c0.x === 10 + o.x && c0.y === 5 + o.y && c0.z === 20 + o.z && c0.time === 3,
    'getCurrentAt must be asked at world coordinates');
  assert(calls.length === 6, `Every coordinate-taking call must reach the biome (got ${calls.length})`);

  /* ---- 2. Все биомы: жизнь вокруг игрока в 3 км от ядра ---- */
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(60, 16 / 9, 0.1, 4000);
  const STEP = 3000; // м за один перенос: дальше любого ядра (worldRadius 400…1200 м)
  let checked = 0;
  let worstGap = 0;
  let minNear = Infinity;
  let totalOrigin = 0;
  for (const b of OC.Biomes.list()) {
    OC.Biomes.setActive(b.id);
    const sp = new T.Vector3(b.spawn.pos[0], b.spawn.pos[1], b.spawn.pos[2]);
    // Фауна обязана запрашивать биом через вид «глазами фауны»
    const realWrap = OC._FaunaSpace.wrap;
    let wrapped = 0;
    OC._FaunaSpace.wrap = function (biome) { wrapped++; return realWrap.call(this, biome); };
    OC.Terrain.init(scene, b, sp);
    const fauna = OC.FaunaEngine.init(scene, b);
    OC._FaunaSpace.wrap = realWrap;
    assert(wrapped > 0, `FaunaEngine must ask biome "${b.id}" through the fauna-space view`);

    camera.position.set(0, sp.y, 0);
    for (let i = 0; i < 30; i++) {
      OC.uTime.value += 0.16;
      fauna.update(0.16, OC.uTime.value, camera.position, 2.0, false);
    }
    const before = fauna.agents.length;

    // Улетаем на 3 км и переносим начало координат
    camera.position.set(STEP, sp.y, STEP);
    OC.FloatingOrigin.update(camera, scene);
    for (let i = 0; i < 60; i++) {
      OC.uTime.value += 0.16;
      fauna.update(0.16, OC.uTime.value, camera.position, 2.0, false);
    }
    const org = OC.FloatingOrigin.getOrigin();
    const ox = org.x, oy = org.y, oz = org.z;
    assert(Math.abs(oy) < 1e-6, `Floating Origin must keep world depth on the vertical axis (${b.id}: ${oy.toFixed(1)} m)`);
    totalOrigin = Math.hypot(ox, oz);

    let near = 0;
    const under = [];
    for (const ag of fauna.agents) {
      const p = ag.getPosition ? ag.getPosition() : null;
      if (!p) continue;
      checked++;
      assert(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
        `Fauna agent ${ag.key || '?'} must stay finite ${(STEP / 1000)} km from spawn (${b.id})`);
      // Высота дна — в мировых координатах: вертикаль origin всегда нулевая
      const floorY = b.getHeight(p.x + ox, p.z + oz);
      const gap = p.y - (floorY - oy);
      if (gap < -2.5) under.push(`${ag.key || '?'}: ${gap.toFixed(1)} m`);
      if (gap < worstGap) worstGap = gap;
      if (Math.hypot(p.x - camera.position.x, p.z - camera.position.z) < 540) near++;
    }
    /* Статичные цели сонара (метановые сипы Байкала) — точки мира, а не
       спутники игрока: их место задано в плане биома и не должно ехать вместе
       со сценой. Раньше локальная позиция считалась один раз при высадке, и
       каждый перенос начала координат уносил сип на километры от своего поля. */
    for (const seep of (b.faunaPlan ? b.faunaPlan.seepTargets || [] : [])) {
      let found = null;
      for (const st of fauna.sonarTargets) {
        const p = st.getPosition ? st.getPosition() : null;
        if (!p) continue;
        if (Math.abs(p.x + ox - seep.x) < 1e-6 && Math.abs(p.z + oz - seep.z) < 1e-6) { found = p; break; }
      }
      assert(found,
        `Sonar target ${seep.x},${seep.z} must stay at its world point far outside the core (${b.id})`);
      assert(Math.abs(found.y + oy - (b.getHeight(seep.x, seep.z) + 1.0)) < 1e-6,
        `Sonar target ${seep.x},${seep.z} must sit on the seabed of its own world point (${b.id}: ${(found.y + oy).toFixed(1)} m)`);
    }

    assert(fauna.agents.length === before,
      `The number of agents must not grow far outside the core (${b.id}: ${before} -> ${fauna.agents.length})`);
    assert(under.length === 0,
      `Fauna must stay above the seabed far outside the core (${b.id}: ${under.slice(0, 3).join(', ')})`);
    assert(near >= 3,
      `Life must surround the player ${(STEP / 1000)} km from the core (${b.id}: ${near} agents within 540 m)`);
    if (near < minNear) minNear = near;
  }

  console.log(`   Fauna without an edge: ${checked} agents over 15 biomes, ${(totalOrigin / 1000).toFixed(0)} km in the origin — none below the seabed (worst gap ${worstGap.toFixed(1)} m), at least ${minNear} of them around the player within 540 m.`);
}
