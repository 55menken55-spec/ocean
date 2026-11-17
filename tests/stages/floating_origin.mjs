/* ---- Floating Origin: сдвиг сцены не рассинхронизирует рельеф и флору ----
   Тест стоит последним: он навсегда меняет origin и порог сдвига, а остальные
   проверки считают позиции камеры в локальных координатах.

   Идея проверки: сдвиг начала координат не должен менять ИСТИННУЮ мировую
   позицию камеры. Поэтому порог временно ставится в 0 и сдвиг вызывается при
   камере, стоящей на спавне: camera.position уходит в (0,0,0), origin
   накапливает спавн, а мировая точка остаётся той же. Значит и рельеф, и флора
   обязаны остаться на тех же мировых координатах — сравнивать можно поштучно.

   Что здесь ловится (всё проверено откатом правки):
   • terrain.js и flora_streamer.js вычитали delta в слушателях onShift, хотя
     FloatingOrigin.update() уже сдвинул все меши обходом сцены — то есть те же
     меши двигались дважды. Слушатели вдобавокрегистрировались внутри init(), а init
     вызывается при каждой смене биома, поэтому ошибка множилась на число смен.
     Замер до правки: после заплыва на 1100 м все 28 чанков были смещены от
     своего высотного поля ровно на 1100 м.
   • кэш флоры хранил локальные координаты (world − origin на момент постройки
     чанка). После сдвига он оказывался в системе координат прошлого origin,
     и вся флора уезжала от дна на delta до полного вытеснения кэша.
   • InstancedMesh-контейнеры с якорем в (0,0,0) тоже попадали под обход сцены:
     их position уезжал, добавляя второй сдвиг поверх матриц экземпляров. */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/harness.mjs';

export function run(ctx) {
  const { T, OC } = ctx;

    const foSrc = fs.readFileSync(path.join(ROOT, 'src/engine/floating_origin.js'), 'utf8');
    assert(foSrc.includes('noFloatingOrigin'), 'FloatingOrigin must honour the userData.noFloatingOrigin opt-out');
    assert(/onShift\(cb\)\s*\{[^}]*return function offShift/.test(foSrc), 'FloatingOrigin.onShift must return an unsubscribe function');

    const foScene = new T.Scene();
    const foBiome = OC.Biomes.get('great_barrier_reef');
    const foPos = new T.Vector3(foBiome.spawn.pos[0], foBiome.spawn.pos[1], foBiome.spawn.pos[2]);
    OC.Terrain.init(foScene, foBiome, foPos);
    OC.FloraStreamer.init(foScene, foBiome, foPos);
    /* Прогреваем кэш до стабильности: флора достраивает чанки порциями по кадрам,
       а порядок инстансов внутри пула идёт по чанкам — пока какой-то чанк не
       достроен, состав и порядок инстансов меняются от кадра к кадру. */
    let foStable = 0;
    let foPrevChunks = -1;
    for (let i = 0; i < 240 && foStable < 4; i++) {
      OC.Terrain.update(foPos);
      OC.FloraStreamer.update(foPos);
      const n = OC.FloraStreamer.getStats().cachedChunks;
      foStable = n === foPrevChunks ? foStable + 1 : 0;
      foPrevChunks = n;
    }
    assert(foStable >= 4, `Flora chunk cache must settle before the shift test (${foPrevChunks} chunks, ${foStable} stable frames)`);

    // Горизонтный фартук: дно за пределами стримящихся чанков, утопленное под ними
    const apron = (() => {
      let found = null;
      foScene.traverse((o) => {
        if (found || !o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        if (o.geometry.boundingSphere && o.geometry.boundingSphere.radius > 2000) found = o;
      });
      return found;
    })();
    assert(apron, 'Terrain must build the horizon apron (seabed beyond the streamed chunk radius)');
    assert(apron.geometry.boundingSphere.radius > 2000, `Horizon apron must cover ~2600 m, got r=${apron.geometry.boundingSphere.radius.toFixed(0)}`);
    assert(apron.visible, 'Horizon apron must be visible');

    /* Мировые позиции экземпляров: матрица инстанса + позиция контейнера + origin.
       Матрицы хранят локальные координаты сцены, поэтому origin текущего снимка
       обязательно добавлять — иначе сравниваются числа из разных систем. */
    function floraWorldSamples(root) {
      const o3 = OC.FloatingOrigin.getOrigin();
      const out = new Map();
      root.traverse((o) => {
        if (!o.isInstancedMesh || !o.instanceMatrix) return;
        const m = o.instanceMatrix.array;
        const n = Math.min(o.count, 4);
        const arr = [];
        for (let i = 0; i < n; i++) {
          arr.push([o.position.x + m[i * 16 + 12] + o3.x, o.position.y + m[i * 16 + 13] + o3.y, o.position.z + m[i * 16 + 14] + o3.z]);
        }
        out.set(o, arr);
      });
      return out;
    }

    const floraBefore = floraWorldSamples(foScene);
    assert(floraBefore.size > 0, 'FloraStreamer must place instanced flora before the shift test');
    const foInfoBefore = OC.Terrain.getChunkOrigins();
    assert(foInfoBefore.chunks.length > 0, 'Terrain must build chunks before the shift test');

    // Порог в 0: сдвиг произойдёт при любом ненулевом удалении камеры от начала
    OC.FloatingOrigin.setThreshold(0);
    const foCam = new T.PerspectiveCamera(60, 1.6, 0.25, 2200);
    foCam.position.copy(foPos);
    const didShift = OC.FloatingOrigin.update(foCam, foScene);
    assert(didShift, 'FloatingOrigin must shift the scene when the camera passes the threshold');
    /* Сдвиг только по горизонтали: вертикаль остаётся мировой, иначе локальная
       поверхность воды уезжает на −origin.y и вся фауна оказывается под дном. */
    assert(Math.hypot(foCam.position.x, foCam.position.z) < 1e-9, 'FloatingOrigin must reset the camera horizontally');
    assert(Math.abs(foCam.position.y - foPos.y) < 1e-6, 'FloatingOrigin must keep the world depth on the vertical axis');
    const foOrigin = OC.FloatingOrigin.getOrigin();
    assert(Math.abs(foOrigin.x - foPos.x) < 1e-6 && Math.abs(foOrigin.z - foPos.z) < 1e-6,
      `FloatingOrigin must accumulate the travelled offset, got (${foOrigin.x.toFixed(1)}, ${foOrigin.z.toFixed(1)})`);
    assert(Math.abs(foOrigin.y) < 1e-6, `FloatingOrigin must not accumulate the vertical offset, got ${foOrigin.y.toFixed(1)}`);

    // Кадр после сдвига — как в main.js: сначала origin, потом стримеры
    const cp = foCam.position;
    OC.Terrain.update(cp);
    OC.FloraStreamer.update(cp);

    // Рельеф: мировая позиция чанка обязана остаться на угле своей сетки
    const foInfo = OC.Terrain.getChunkOrigins();
    // Число чанков может подрасти (достраивается очередь воркера), но не упасть
    assert(foInfo.chunks.length >= foInfoBefore.chunks.length,
      `Terrain must keep its chunks across a Floating Origin shift (${foInfoBefore.chunks.length} -> ${foInfo.chunks.length})`);
    for (const c of foInfo.chunks) {
      const wx = c.localX + c.originX;
      const wz = c.localZ + c.originZ;
      const dx = wx - c.cx * foInfo.chunkSize;
      const dz = wz - c.cz * foInfo.chunkSize;
      assert(Math.abs(dx) < 0.5 && Math.abs(dz) < 0.5,
        `Terrain chunk ${c.cx},${c.cz} desynced by (${dx.toFixed(1)}, ${dz.toFixed(1)}) m after a Floating Origin shift`);
    }

    // Флора: мировая позиция каждого инстанса обязана остаться прежней
    const floraAfter = floraWorldSamples(foScene);
    let foFloraCompared = 0;
    for (const [mesh, before] of floraBefore) {
      const after = floraAfter.get(mesh);
      assert(after, 'Flora pool must survive a Floating Origin shift');
      assert.equal(after.length, before.length, 'Flora pool instance count must not change across a zero-travel shift');
      for (let i = 0; i < before.length; i++) {
        const d = Math.hypot(after[i][0] - before[i][0], after[i][1] - before[i][1], after[i][2] - before[i][2]);
        foFloraCompared++;
        assert(d < 0.01, `Flora instance ${i} moved ${d.toFixed(2)} m in world space after a Floating Origin shift (${before[i]} -> ${after[i]})`);
      }
      // Якорь контейнера обязан остаться в нуле: позиции лежат в instanceMatrix
      assert(mesh.position.length() < 1e-9, 'InstancedMesh container must stay at its anchor (0,0,0) across a shift');
      assert(mesh.userData.noFloatingOrigin === true, 'InstancedMesh containers must opt out of Floating Origin position shifting');
    }
    assert(foFloraCompared >= 4, `Floating Origin shift test must keep at least 4 comparable flora instances, got ${foFloraCompared}`);

    const schoolsSrc = fs.readFileSync(path.join(ROOT, 'src/engine/fauna/schools.js'), 'utf8');
    assert(schoolsSrc.includes('noFloatingOrigin'), 'Fish school InstancedMesh must opt out of Floating Origin shifting (positions live in instanceMatrix)');

    console.log(`   Floating Origin shift keeps terrain and flora in sync (${foInfo.chunks.length} chunks, ${foFloraCompared} flora instances, origin ${foOrigin.x.toFixed(0)} m); horizon apron r=${apron.geometry.boundingSphere.radius.toFixed(0)} m.`);

}
