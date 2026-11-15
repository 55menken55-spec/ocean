/* ================= ПРОВЕРКИ ГЕОМЕТРИИ ТЕРРЕЙНА ================= */
/* Общие для tests/verify.mjs: поиск группы чанков в сцене и проверка атрибутов
   на NaN, плюс снимки геометрии для сравнения путей постройки (воркер/синхронный). */
import assert from 'node:assert/strict';

/* Корень группы террейна: сцена одна на все биомы, поэтому ищем группу чанков. */
export function terrainRoot(sc) {
  if (!sc) return null;
  let found = null;
  for (const c of sc.children) {
    if (c.type !== 'Group') continue;
    let hasFloor = false;
    c.traverse((o) => { if (o.isMesh && o.userData && o.userData.key === 'floor') hasFloor = true; });
    if (hasFloor) { found = c; break; }
  }
  return found;
}

/* Ни один атрибут построенной геометрии не должен содержать NaN/Infinity.
   NaN в цвете вершины гасит треугольник до чёрного — именно так выглядела
   ошибка размера буфера цветов на пути Web Worker. */
export function assertNoNaNGeometry(label, root, attrs) {
  assert(root, `${label}: terrain group not found`);
  const wanted = attrs.split('|');
  let checked = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    for (const a of wanted) {
      const at = o.geometry.attributes[a];
      if (!at) continue;
      const arr = at.array;
      for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) {
          assert.fail(`${label}: attribute "${a}" of a chunk mesh contains ${arr[i]} at index ${i} (${checked} components checked)`);
        }
      }
      checked += arr.length;
    }
  });
  assert(checked > 0, `${label}: no geometry attributes to check`);
}

export function snapshotTerrain(scene) {
  const root = terrainRoot(scene);
  const out = new Map();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const nrm = o.geometry.attributes.normal;
    if (!nrm || !nrm.count) return;
    const isCeil = nrm.getY(0) < 0; // у потолка нормали смотрят вниз
    const k = `${Math.round(o.position.x)}|${Math.round(o.position.z)}|${isCeil ? 'c' : 'f'}`;
    out.set(k, {
      position: o.geometry.attributes.position.array,
      normal: nrm.array,
      color: o.geometry.attributes.color ? o.geometry.attributes.color.array : null,
      index: o.geometry.index ? o.geometry.index.array : null
    });
  });
  return out;
}

export function compareSnapshots(a, b, label) {
  const keysA = [...a.keys()].sort();
  const keysB = [...b.keys()].sort();
  assert.deepEqual(keysA, keysB, `${label}: набор чанков (дно + потолок) должен совпадать`);
  for (const k of keysA) {
    const gA = a.get(k), gB = b.get(k);
    for (const attr of ['position', 'normal', 'color', 'index']) {
      const arrA = gA[attr], arrB = gB[attr];
      assert(arrA && arrB, `${label}: чанк ${k} без атрибута ${attr}`);
      assert.equal(arrA.length, arrB.length, `${label}: чанк ${k} атрибут ${attr} разной длины`);
      for (let i = 0; i < arrA.length; i++) {
        if (attr === 'index') {
          assert.equal(arrA[i], arrB[i], `${label}: чанк ${k} индекс ${i} расходится`);
        } else {
          const d = Math.abs(arrA[i] - arrB[i]);
          assert(d < 1e-4, `${label}: чанк ${k} атрибут ${attr} расходится в ${i} (${arrA[i]} vs ${arrB[i]})`);
        }
      }
    }
  }
}

/* Точка замера подбирается так, чтобы в кадр попадали и дно, и потолок, и —
   для cenote — ОТКРЫТЫЕ участки свода (стволы шахт), иначе маска потолка в
   тесте не участвует и расхождение путей остаётся незамеченным. */

/* Точка замера подбирается так, чтобы в кадр попадали и дно, и потолок, и —
   для cenote — ОТКРЫТЫЕ участки свода (стволы шахт), иначе маска потолка в
   тесте не участвует и расхождение путей остаётся незамеченным. */
export function parityProbe(T, bId, b) {
  if (bId === 'cenote_caves') return new T.Vector3(0, b.getHeight(0, -60) + 3.0, -60);
  if (bId === 'europa_ocean') return new T.Vector3(-68, b.getHeight(-68, 214) + 4.0, 214);
  return new T.Vector3(b.spawn.pos[0], b.spawn.pos[1], b.spawn.pos[2]);
}
