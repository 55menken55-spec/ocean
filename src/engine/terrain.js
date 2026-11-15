/* ================= ДИНАМИЧЕСКИЙ ЧАНКОВЫЙ ЛАНДШАФТ С LOD (unbounded world) ================= */
/* Чанки создаются только около камеры и удаляются при удалении (LRU), что позволяет
   ехать на arbitrarily большие расстояния без предварительной регистрации всего мира. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  /* ============ Сборка сетки чанка из решёток высот и цветов ============ */
  /* ЧИСТАЯ функция без замыканий и внешних ссылок: её исходник через toString()
     уходит в Web Worker, поэтому внутри можно пользоваться только Math и
     типизированными массивами. Её же использует синхронный fallback — раньше
     воркер и основной поток содержали две независимые копии этой логики и
     расходились (воркер потерял расчёт градиента затенения, см. PR #4).

     cfg.flip — режим потолка: нормали смотрят вниз, обход граней обратный,
     юбка уходит вверх (в толщу льда/карста), часть квадов вырезается маской. */
  function assembleChunkMesh(cfg) {
    const segs = cfg.segs;
    const step = cfg.step;
    const stride = cfg.stride;
    const h = cfg.heightData;
    const c = cfg.colorData;
    const flip = !!cfg.flip;
    const skirt = cfg.skirt || 4.0;
    const mask = cfg.mask || null;

    const n = segs + 1;
    const gridCount = n * n;
    const skirtVerts = n * 4 * 2; // 4 ребра * (верх + низ)
    const totalVerts = gridCount + skirtVerts;
    const inv2Step = 1 / (2 * step);

    const pos = new Float32Array(totalVerts * 3);
    const norm = new Float32Array(totalVerts * 3);
    const col = new Float32Array(totalVerts * 3);
    const indices = [];

    for (let iz = 0; iz <= segs; iz++) {
      const relZ = iz * step;
      const gRow = (iz + 1) * stride;
      for (let ix = 0; ix <= segs; ix++) {
        const relX = ix * step;
        const gIdx = gRow + (ix + 1);
        const idx = iz * n + ix;
        const p3 = idx * 3;

        pos[p3] = relX;
        pos[p3 + 1] = h[gIdx];
        pos[p3 + 2] = relZ;

        // Нормаль как градиент высот; у потолка она зеркально обращена вниз
        let nx = (h[gIdx - 1] - h[gIdx + 1]) * inv2Step;
        let nz = (h[gIdx - stride] - h[gIdx + stride]) * inv2Step;
        let ny = 1.0;
        if (flip) { nx = -nx; nz = -nz; ny = -1.0; }
        const len = Math.hypot(nx, ny, nz) || 1;
        norm[p3] = nx / len;
        norm[p3 + 1] = ny / len;
        norm[p3 + 2] = nz / len;

        const c3 = gIdx * 3;
        col[p3] = c[c3];
        col[p3 + 1] = c[c3 + 1];
        col[p3 + 2] = c[c3 + 2];
      }
    }

    for (let iz = 0; iz < segs; iz++) {
      for (let ix = 0; ix < segs; ix++) {
        const a = iz * n + ix;
        const b = a + 1;
        const cc = a + n;
        const d = cc + 1;
        if (mask && mask[a] && mask[b] && mask[cc] && mask[d]) continue;
        if (flip) indices.push(a, b, cc, b, d, cc);
        else indices.push(a, cc, b, b, cc, d);
      }
    }

    // Юбки по 4 краям чанка — скрывают любые стыки при смене LOD
    let vPtr = gridCount;
    function addSkirtEdge(getGridIdx, reverse) {
      const startPtr = vPtr;
      for (let k = 0; k < n; k++) {
        const gi = getGridIdx(k);
        const g3 = gi * 3;
        const t3 = vPtr * 3;
        const b3 = (vPtr + 1) * 3;

        pos[t3] = pos[g3]; pos[t3 + 1] = pos[g3 + 1]; pos[t3 + 2] = pos[g3 + 2];
        pos[b3] = pos[g3]; pos[b3 + 1] = pos[g3 + 1] + (flip ? skirt : -skirt); pos[b3 + 2] = pos[g3 + 2];

        norm[t3] = norm[g3]; norm[t3 + 1] = norm[g3 + 1]; norm[t3 + 2] = norm[g3 + 2];
        norm[b3] = norm[g3]; norm[b3 + 1] = norm[g3 + 1]; norm[b3 + 2] = norm[g3 + 2];

        col[t3] = col[g3]; col[t3 + 1] = col[g3 + 1]; col[t3 + 2] = col[g3 + 2];
        col[b3] = col[g3] * 0.85; col[b3 + 1] = col[g3 + 1] * 0.85; col[b3 + 2] = col[g3 + 2] * 0.85;
        vPtr += 2;
      }
      for (let k = 0; k < segs; k++) {
        if (mask && mask[getGridIdx(k)] && mask[getGridIdx(k + 1)]) continue;
        const a = startPtr + k * 2;
        const b = a + 1;
        const cc = a + 2;
        const d = a + 3;
        if (reverse !== flip) indices.push(a, cc, b, b, cc, d);
        else indices.push(a, b, cc, b, d, cc);
      }
    }

    addSkirtEdge((k) => k, false);                   // верхний край (z = 0)
    addSkirtEdge((k) => segs * n + k, true);         // нижний край (z = size)
    addSkirtEdge((k) => k * n, true);                // левый край (x = 0)
    addSkirtEdge((k) => k * n + segs, false);        // правый край (x = size)

    const idxBuf = new Uint32Array(indices);
    return {
      positions: pos, normals: norm, colors: col, indices: idxBuf,
      vertexCount: totalVerts, indexCount: idxBuf.length
    };
  }

  /* ============ Web Worker: постройка геометрии чанка (встроен как строка) ============ */
  /* Выполняется в отдельном потоке, не блокируя основной цикл рендеринга.
     Собирается из исходника assembleChunkMesh, чтобы основной поток и воркер
     всегда строили геометрию одним и тем же кодом. */
  const TERRAIN_WORKER_SRC = `
'use strict';
${assembleChunkMesh.toString()}

self.onmessage = function (e) {
  'use strict';
  const msg = e.data;
  if (!msg || msg.type !== 'buildChunk') return;

  const segs = msg.segs;
  const chunkSize = msg.chunkSize;
  const step = chunkSize / segs;
  const out = { type: 'chunkBuilt', cx: msg.cx, cz: msg.cz, segs: segs };
  const transfer = [];

  function pack(m) {
    const r = {
      positions: m.positions.buffer, normals: m.normals.buffer,
      colors: m.colors.buffer, indices: m.indices.buffer,
      vertexCount: m.vertexCount, indexCount: m.indexCount
    };
    transfer.push(m.positions.buffer, m.normals.buffer, m.colors.buffer, m.indices.buffer);
    return r;
  }

  out.floor = pack(assembleChunkMesh({
    segs: segs, step: step,
    heightData: msg.floor.heightData, colorData: msg.floor.colorData, stride: msg.floor.stride
  }));

  // Потолок (ледяной панцирь / карстовый свод) строится здесь же: раньше он
  // собирался на главном потоке и съедал бюджет кадра в биомах с потолком.
  if (msg.ceiling) {
    out.ceiling = pack(assembleChunkMesh({
      segs: segs, step: step,
      heightData: msg.ceiling.heightData, colorData: msg.ceiling.colorData,
      stride: msg.ceiling.stride, mask: msg.ceiling.mask, flip: true
    }));
  }

  self.postMessage(out, transfer);
};
`;

  let sceneRef = null;
  let biomeRef = null;
  let terrainMat = null;
  let ceilingMat = null;
  let group = null;
  const chunks = new Map(); // key "cx,cz" -> { cx, cz, wx, wz, segs, mesh, ceilMesh, lastUsed }
  let chunkSize = 150;
  let initialized = false;
  let needsRebuildScan = true;
  let lastScanX = 1e9;
  let lastScanZ = 1e9;
  let lastScanQuality = '';
  let heightGridBuf = new Float32Array(64 * 64);
  let horizonApron = null; // ссылка на горизонтный фартук для сдвига при Floating Origin
  let frameCounter = 0;

  /* Лимит чанков в памяти одновременно. При превышении удаляются старейшие невидимые. */
  const MAX_ACTIVE_CHUNKS = 240;
  const CHUNK_IDLE_FRAMES = 180; // ~3 сек без попадания в Visibility -> candidat на удаление

  /* Web Worker управление */
  let terrainWorker = null;
  const workerQueue = [];     // { rec, segs }
  let workerBusy = false;
  const pendingChunkData = new Map(); // key -> { heightData, colorData, stride, segs }

  const _tmpCol = new T.Color();

  function getHeightGridBuf(stride) {
    const need = stride * stride;
    if (heightGridBuf.length < need) heightGridBuf = new Float32Array(need);
    return heightGridBuf;
  }

  function chunkKey(cx, cz) {
    return cx + ',' + cz;
  }

  function getOrCreateChunkRec(cx, cz) {
    const key = chunkKey(cx, cz);
    let rec = chunks.get(key);
    if (!rec) {
      rec = {
        cx, cz,
        wx: cx * chunkSize,      // левый-задний угол чанка, совпадает с x0/z0 в buildChunkGeometry
        wz: cz * chunkSize,
        segs: 0,
        mesh: null,
        ceilMesh: null,
        lastUsed: 0
      };
      chunks.set(key, rec);
    }
    return rec;
  }

  function disposeChunk(rec) {
    if (rec.mesh) {
      if (rec.mesh.geometry) rec.mesh.geometry.dispose();
      group.remove(rec.mesh);
      rec.mesh = null;
    }
    if (rec.ceilMesh) {
      if (rec.ceilMesh.geometry) rec.ceilMesh.geometry.dispose();
      group.remove(rec.ceilMesh);
      rec.ceilMesh = null;
    }
    const key = chunkKey(rec.cx, rec.cz);
    pendingChunkData.delete(key);
  }

  /* ---- Построение меша одного чанка с юбками по краям (без швов между LOD) ---- */
  /* Геометрия строится относительно центра чанка (0,0,0 = угол чанка в мировом пространстве);
     мировая позиция задаётся через mesh.position = worldCenter - origin (Floating Origin). */
  /* ---- Заполнение решёток высот и цветов, общих для воркера и синхронного пути ---- */

  function fillHeightGrid(hBuf, stride, x0, z0, step, heightFn) {
    for (let gz = 0; gz < stride; gz++) {
      const absZ = z0 + (gz - 1) * step;
      const row = gz * stride;
      for (let gx = 0; gx < stride; gx++) {
        hBuf[row + gx] = heightFn(x0 + (gx - 1) * step, absZ);
      }
    }
  }

  /* Цвета вершин считаем в основной поток (нужен градиент высот для затенения
     текстуры), а собирает геометрию уже assembleChunkMesh. */
  function fillColorGrid(colorData, hBuf, stride, segs, x0, z0, step, colorFn) {
    const n = segs + 1;
    const inv2Step = 1 / (2 * step);
    for (let iz = 0; iz <= segs; iz++) {
      const absZ = z0 + iz * step;
      const gRow = (iz + 1) * stride;
      for (let ix = 0; ix <= segs; ix++) {
        const absX = x0 + ix * step;
        const gIdx = gRow + (ix + 1);
        const h = hBuf[gIdx];
        const nx = (hBuf[gIdx - 1] - hBuf[gIdx + 1]) * inv2Step;
        const nz = (hBuf[gIdx - stride] - hBuf[gIdx + stride]) * inv2Step;
        const gradMag = Math.hypot(nx, nz);
        colorFn(absX, h, absZ, _tmpCol, gradMag > 0.0001 ? Math.min(1, gradMag * 0.95) : 0);
        const c3 = gIdx * 3;
        colorData[c3] = _tmpCol.r;
        colorData[c3 + 1] = _tmpCol.g;
        colorData[c3 + 2] = _tmpCol.b;
      }
    }
  }

  function geometryFromMesh(m) {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(m.positions, 3));
    geo.setAttribute('normal', new T.BufferAttribute(m.normals, 3));
    geo.setAttribute('color', new T.BufferAttribute(m.colors, 3));
    geo.setIndex(new T.BufferAttribute(m.indices, 1));
    geo.computeBoundingSphere();
    return geo;
  }

  /* ---- Построение меша одного чанка с юбками по краям (без швов между LOD) ---- */
  /* Геометрия строится относительно угла чанка (0,0,0 = угол чанка в мировом
     пространстве); мировая позиция задаётся через mesh.position (Floating Origin). */
  function buildChunkGeometry(cx, cz, segs) {
    const x0 = cx * chunkSize; // абсолютный угол чанка (для запросов к биому)
    const z0 = cz * chunkSize;
    const step = chunkSize / segs;
    const n = segs + 1;
    const stride = n + 2; // +1 ячейка с каждой стороны для идентичных бесшовных нормалей
    const hBuf = getHeightGridBuf(stride);

    fillHeightGrid(hBuf, stride, x0, z0, step, (x, z) => biomeRef.getHeight(x, z));

    const colorData = new Float32Array(stride * stride * 3);
    fillColorGrid(colorData, hBuf, stride, segs, x0, z0, step, (x, y, z, out, g) => biomeRef.getTerrainColor(x, y, z, out, g));

    return geometryFromMesh(assembleChunkMesh({ segs, step, heightData: hBuf, colorData, stride }));
  }

  /* ---- Потолок: ледяной панцирь Европы или карстовый свод ---- */
  /* Возвращает null, если в этом чанке потолка нет (например, открытый шахтный
     ствол cenote), чтобы не создавать пустой меш. */
  function buildCeilingChunkGeometry(cx, cz, segs) {
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;
    const step = chunkSize / segs;
    const n = segs + 1;
    const stride = n + 2;
    const hBuf = getHeightGridBuf(stride);

    const colorFn = biomeRef.getCeilingColor
      ? (x, y, z, out, g) => biomeRef.getCeilingColor(x, y, z, out)
      : (x, y, z, out, g) => biomeRef.getTerrainColor(x, y, z, out, g);

    // Маска «открытого» потолка: 1 = в этом кваде потолка нет (ствол, разлом).
    // Индексы решётки берём из счётчиков циклов, а не восстанавливаем из x/z —
    // округление плавающей точки на границах ячеек давало бы сбои маски.
    const mask = new Uint8Array(n * n);
    let anyClosed = false;

    for (let gz = 0; gz < stride; gz++) {
      const absZ = z0 + (gz - 1) * step;
      const row = gz * stride;
      for (let gx = 0; gx < stride; gx++) {
        const absX = x0 + (gx - 1) * step;
        const rawY = biomeRef.getCeilingHeight(absX, absZ);
        const y = Math.min(22.0, rawY);
        hBuf[row + gx] = y;
        if (gx >= 1 && gx <= n && gz >= 1 && gz <= n) {
          const isOpen = biomeRef.isCeilingOpen ? biomeRef.isCeilingOpen(absX, absZ) : (rawY > 38.0);
          mask[(gz - 1) * n + (gx - 1)] = isOpen ? 1 : 0;
          if (!isOpen) anyClosed = true;
        }
      }
    }
    if (!anyClosed) return null;

    const colorData = new Float32Array(stride * stride * 3);
    fillColorGrid(colorData, hBuf, stride, segs, x0, z0, step, colorFn);

    const mesh = assembleChunkMesh({
      segs, step, heightData: hBuf, colorData, stride, mask, flip: true
    });
    if (!mesh.indexCount) return null; // весь чанк — открытый ствол
    return geometryFromMesh(mesh);
  }

  function desiredSegs(dist, q) {
    if (dist < q.terrainNearDist) return q.terrainNearSegs;
    if (dist < q.terrainMidDist) return q.terrainMidSegs;
    return q.terrainFarSegs;
  }

  function getOriginRef() {
    return OC.FloatingOrigin ? OC.FloatingOrigin.getOrigin() : null;
}

  /* ---- Асинхронная очередь построения чанков через Web Worker ---- */
  function processWorkerQueue() {
    if (workerBusy || !terrainWorker || workerQueue.length === 0) return;
    const next = workerQueue.shift();
    workerBusy = true;
    const key = chunkKey(next.rec.cx, next.rec.cz);
    // Свои данные для каждой записи очереди: чанк мог быть перезапрошен с другим
    // LOD, и тогда запись в pendingChunkData уже перезаписана.
    const pd = next.pd || pendingChunkData.get(key);
    if (!pd || !pendingChunkData.has(key) || !pd.floor) {
      workerBusy = false;
      processWorkerQueue();
      return;
    }
    // Буферы уходят в worker как Transferable — после передачи они отсоединены,
    // и повторная передача того же буфера бросает DataCloneError
    // («An ArrayBuffer is detached and could not be cloned»).
    const detached = (a) => !a || !a.buffer || a.buffer.byteLength === 0;
    if (detached(pd.floor.heightData) || detached(pd.floor.colorData) ||
        (pd.ceiling && (detached(pd.ceiling.heightData) || detached(pd.ceiling.colorData)))) {
      workerBusy = false;
      processWorkerQueue();
      return;
    }
    // Копируем перед передачей: Transferable отсоединяет источник, а решётки
    // Pending-записи могут понадобиться повторно (тот же чанк, другой LOD).
    const transfer = [];
    const packGrid = (g) => {
      const h = new Float32Array(g.heightData);
      const c = new Float32Array(g.colorData);
      transfer.push(h.buffer, c.buffer);
      const out = { heightData: h, colorData: c, stride: g.stride };
      if (g.mask) {
        const m = new Uint8Array(g.mask);
        transfer.push(m.buffer);
        out.mask = m;
      }
      return out;
    };

    const payload = {
      type: 'buildChunk',
      cx: next.rec.cx,
      cz: next.rec.cz,
      segs: pd.segs,
      chunkSize: chunkSize,
      floor: packGrid(pd.floor)
    };
    if (pd.ceiling) payload.ceiling = packGrid(pd.ceiling);

    terrainWorker.postMessage(payload, transfer);
  }

  /* Геометрия, собранная воркером: остаётся только надеть её на меши. */
  function buildChunkFromWorkerData(rec, segs, msg) {
    const f = msg.floor;
    if (!f) return;
    const floorGeo = new T.BufferGeometry();
    floorGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(f.positions), 3));
    floorGeo.setAttribute('normal', new T.BufferAttribute(new Float32Array(f.normals), 3));
    floorGeo.setAttribute('color', new T.BufferAttribute(new Float32Array(f.colors), 3));
    floorGeo.setIndex(new T.BufferAttribute(new Uint32Array(f.indices), 1));
    floorGeo.computeBoundingSphere();

    let ceilGeo = null;
    const c = msg.ceiling;
    if (c && c.indexCount) {
      ceilGeo = new T.BufferGeometry();
      ceilGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(c.positions), 3));
      ceilGeo.setAttribute('normal', new T.BufferAttribute(new Float32Array(c.normals), 3));
      ceilGeo.setAttribute('color', new T.BufferAttribute(new Float32Array(c.colors), 3));
      ceilGeo.setIndex(new T.BufferAttribute(new Uint32Array(c.indices), 1));
      ceilGeo.computeBoundingSphere();
    }

    applyChunkGeometry(rec, segs, floorGeo, ceilGeo);
  }

  /* Готовит решётки высот/цветов для дна и (если есть) потолка и ставит чанк
     в очередь воркера. Все обращения к биому (getHeight, getTerrainColor,
     getCeilingHeight, isCeilingOpen) делаются здесь, в основном потоке; воркер
     получает уже готовые числа и только собирает геометрию. */
  function queueChunkBuild(rec, segs) {
    const key = chunkKey(rec.cx, rec.cz);
    const x0 = rec.cx * chunkSize;
    const z0 = rec.cz * chunkSize;
    const step = chunkSize / segs;
    const n = segs + 1;
    const stride = n + 2;

    // Для worker-пути нужен ОТДЕЛЬНЫЙ буфер на чанк: общий scratch-буфер
    // отсоединяется после первой передачи в worker и ломает следующий чанк.
    const floor = {
      heightData: new Float32Array(stride * stride),
      colorData: new Float32Array(stride * stride * 3), // паддингованная сетка, как у высот
      stride: stride
    };
    fillHeightGrid(floor.heightData, stride, x0, z0, step, (x, z) => biomeRef.getHeight(x, z));
    fillColorGrid(floor.colorData, floor.heightData, stride, segs, x0, z0, step,
      (x, y, z, out, g) => biomeRef.getTerrainColor(x, y, z, out, g));

    let ceiling = null;
    if (ceilingMat && biomeRef.getCeilingHeight) {
      const hBuf = new Float32Array(stride * stride);
      const mask = new Uint8Array(n * n);
      let anyClosed = false;
      for (let gz = 0; gz < stride; gz++) {
        const absZ = z0 + (gz - 1) * step;
        const row = gz * stride;
        for (let gx = 0; gx < stride; gx++) {
          const absX = x0 + (gx - 1) * step;
          const rawY = biomeRef.getCeilingHeight(absX, absZ);
          const y = Math.min(22.0, rawY);
          hBuf[row + gx] = y;
          if (gx >= 1 && gx <= n && gz >= 1 && gz <= n) {
            const isOpen = biomeRef.isCeilingOpen ? biomeRef.isCeilingOpen(absX, absZ) : (rawY > 38.0);
            mask[(gz - 1) * n + (gx - 1)] = isOpen ? 1 : 0;
            if (!isOpen) anyClosed = true;
          }
        }
      }
      if (anyClosed) {
        ceiling = {
          heightData: hBuf,
          colorData: new Float32Array(stride * stride * 3),
          mask: mask,
          stride: stride
        };
        const colorFn = biomeRef.getCeilingColor
          ? (x, y, z, out, g) => biomeRef.getCeilingColor(x, y, z, out)
          : (x, y, z, out, g) => biomeRef.getTerrainColor(x, y, z, out, g);
        fillColorGrid(ceiling.colorData, hBuf, stride, segs, x0, z0, step, colorFn);
      }
    }

    pendingChunkData.set(key, { floor, ceiling, segs });
    workerQueue.push({ rec, segs, pd: pendingChunkData.get(key) });
    processWorkerQueue();
  }

  /* Надеть готовую геометрию дна и (опционально) потолка на меши чанка. */
  function applyChunkGeometry(rec, segs, floorGeo, ceilingGeo) {
    const origin = getOriginRef();
    const ox = origin ? origin.x : 0;
    const oz = origin ? origin.z : 0;

    if (rec.mesh) {
      rec.mesh.geometry.dispose();
      rec.mesh.geometry = floorGeo;
    } else {
      rec.mesh = new T.Mesh(floorGeo, terrainMat);
      rec.mesh.userData.key = 'floor';
      group.add(rec.mesh);
    }
    rec.mesh.position.set(rec.wx - ox, 0, rec.wz - oz);

    if (ceilingMat && biomeRef.getCeilingHeight) {
      if (ceilingGeo) {
        if (rec.ceilMesh) {
          rec.ceilMesh.geometry.dispose();
          rec.ceilMesh.geometry = ceilingGeo;
          rec.ceilMesh.visible = rec.mesh.visible;
          rec.ceilMesh.position.set(rec.wx - ox, 0, rec.wz - oz);
        } else {
          rec.ceilMesh = new T.Mesh(ceilingGeo, ceilingMat);
          rec.ceilMesh.userData.key = 'floor';
          rec.ceilMesh.visible = rec.mesh.visible;
          rec.ceilMesh.position.set(rec.wx - ox, 0, rec.wz - oz);
          group.add(rec.ceilMesh);
        }
      } else if (rec.ceilMesh) {
        group.remove(rec.ceilMesh);
        rec.ceilMesh.geometry.dispose();
        rec.ceilMesh = null;
      }
    }
    rec.segs = segs;
  }

  function createOrUpdateChunk(rec, segs) {
    if (rec.segs === segs && rec.mesh) return;

    // Если Worker доступен — используем асинхронную постройку
    if (terrainWorker) {
      queueChunkBuild(rec, segs);
      return; // Чанк будет построен асинхронно
    }

    // Fallback: синхронная постройка (если Worker недоступен)
    applyChunkGeometry(rec, segs,
      buildChunkGeometry(rec.cx, rec.cz, segs),
      (ceilingMat && biomeRef.getCeilingHeight) ? buildCeilingChunkGeometry(rec.cx, rec.cz, segs) : null);
  }

  /* ---- Внешний горизонт дна за пределами детальной карты (только для ограниченных миров) ---- */
  /* Чанки стримятся только вокруг камеры (terrainFarDist 660...1180 м), а мир
     ограничен worldRadius 1200 м. Фартук догружает дно до 2600 м, чтобы в
     прозрачных водах (Байкал, fogDensity 0.0012) на горизонте не было видно
     резкого обрыва детальной сетки. Внутри игровой зоны он утоплен на 12 м и
     скрыт под настоящими чанками. Строится в мировом начале координат и вместе
     со сценой сдвигается при Floating Origin. */
  function buildHorizonApron() {
    if (!biomeRef || biomeRef.worldRadius > 4000) return; // для unbounded worlds не строим фартук
    const g = new T.PlaneGeometry(5200, 5200, 48, 48);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const c = new Float32Array(p.count * 3);
    const col = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let y = biomeRef.getHeight(x, z);
      if (Math.abs(x) < biomeRef.worldRadius - 10 && Math.abs(z) < biomeRef.worldRadius - 10) {
        y -= 12.0;
      }
      p.setY(i, y);
      biomeRef.getTerrainColor(x, y, z, col);
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new T.BufferAttribute(c, 3));
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    g.computeBoundingSphere(); // чтобы не считать её на первом же кадре
    const apron = new T.Mesh(g, terrainMat);
    apron.userData.key = 'floor';
    horizonApron = apron;
    group.add(apron);
  }

  OC.Terrain = {
    init(scene, biome, spawnPos) {
      sceneRef = scene;
      biomeRef = biome;
      chunkSize = biome.chunkSize || 150;

      if (group) {
        group.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
        });
        scene.remove(group);
      }
      if (terrainMat) { terrainMat.dispose(); terrainMat = null; }
      if (ceilingMat) { ceilingMat.dispose(); ceilingMat = null; }
      chunks.clear();
      horizonApron = null; // старый меш живёт в удаляемой группе
      workerQueue.length = 0;
      workerBusy = false;
      pendingChunkData.clear();
      initialized = false;
      group = new T.Group();
      scene.add(group);

      // Инициализируем Web Worker для постройки геометрии чанков
      if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && !terrainWorker) {
        try {
          const blob = new Blob([TERRAIN_WORKER_SRC], { type: 'application/javascript' });
          terrainWorker = new Worker(URL.createObjectURL(blob));
          terrainWorker.onmessage = (e) => {
            const msg = e.data;
            if (!msg || msg.type !== 'chunkBuilt') return;
            const key = chunkKey(msg.cx, msg.cz);
            const rec = chunks.get(key);
            // Очередь воркера должна освобождаться даже если чанк успели выбросить
            // (переключение биома): иначе асинхронная постройка встаёт навсегда.
            workerBusy = false;
            processWorkerQueue();
            if (!rec) return;
            buildChunkFromWorkerData(rec, msg.segs, msg);
          };
          terrainWorker.onerror = (err) => {
            console.warn('Terrain worker error:', err);
            terrainWorker = null;
            workerBusy = false;
            processWorkerQueue();
          };
        } catch (err) {
          console.warn('Could not create terrain worker:', err);
          terrainWorker = null;
        }
      }

      /* Сдвиг начала координат (Floating Origin) здесь больше НЕ дублируется.
         OC.FloatingOrigin.update() сам обходит сцену и сдвигает все меши, а
         чанки — обычные меши в group, то есть они уже сдвинуты. Раньше этот
         слушатель вычитал delta ещё раз, и после любого сдвига дальше 1000 м от
         начала координат рельеф уезжал от своего высотного поля ровно на delta
         (замер: 1100 м на всех 28 чанках). Слушатель к тому же копился при
         каждой смене биома, умножая ошибку на число смен. */
      terrainMat = new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.02
      });
      OC.enhanceMaterial(terrainMat, { causticStrength: 1.0, isTerrain: true });

      if (typeof biome.getCeilingHeight === 'function') {
        ceilingMat = new T.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.92,
          metalness: 0.02
        });
        /* Потолок освещён только «земной» полусферой. Под 25 км льда (noSurface)
           она практически чёрная, поэтому ледяной панцирь перестаёт читаться —
           даём ему рассеянный свет, сопоставимый с освещением дна. */
        const ceilGlow = (typeof biome.ceilingGlow === 'number')
          ? biome.ceilingGlow
          : (biome.noSurface ? 0.34 : 0.14);
        OC.enhanceMaterial(ceilingMat, { causticStrength: 0.35, isTerrain: true, ceilGlow });
      }

      // Горизонтный фартук только для ограниченных миров.
      // Он был отключён в PR #4 «для отладки прозрачного дна», но к тому багу
      // (чанки якоря по центру вместо угла) отношения не имел — с тех пор якорь
      // исправлен, и фартук возвращён.
      buildHorizonApron();

      // Синхронно строим только стартовую окрестность вокруг камеры (~25 чанков, < 20 мс)
      const q = OC.Quality.get();
      const scx = Math.floor(spawnPos.x / chunkSize);
      const scz = Math.floor(spawnPos.z / chunkSize);
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const cx = scx + dx;
          const cz = scz + dz;
          const rec = getOrCreateChunkRec(cx, cz);
          const dist = Math.hypot(rec.wx - spawnPos.x, rec.wz - spawnPos.z);
          createOrUpdateChunk(rec, desiredSegs(dist, q));
        }
      }
      initialized = true;
      needsRebuildScan = true;
      lastScanX = 1e9;
      lastScanZ = 1e9;
      lastScanQuality = q.id;
      frameCounter = 0;
    },

    update(camPos, scene) {
      if (!initialized) return;
      frameCounter++;
      const q = OC.Quality.get();
      const origin = getOriginRef();
      const ox = origin ? origin.x : 0;
      const oz = origin ? origin.z : 0;

      // Истинная мировая позиция камеры (локальная + origin)
      const trueCamX = camPos.x + ox;
      const trueCamZ = camPos.z + oz;

      if (!needsRebuildScan && lastScanQuality === q.id) {
        const dx = trueCamX - lastScanX;
        const dz = trueCamZ - lastScanZ;
        if (dx * dx + dz * dz < 100) return; // < 10 м без смены качества: чанки актуальны
      }
      lastScanX = trueCamX;
      lastScanZ = trueCamZ;
      lastScanQuality = q.id;

      const t0 = performance.now();
      const budgetMs = 3.5;

      const camChunkX = Math.floor(trueCamX / chunkSize);
      const camChunkZ = Math.floor(trueCamZ / chunkSize);
      const farDist = q.terrainFarDist;
      const visibilityChunkRadius = Math.ceil(farDist / chunkSize) + 1;

      const touched = new Set();
      const candidates = [];

      // 1. Создаём/обновляем чанки в радиусе видимости около истинной позиции камеры
      for (let cz = camChunkZ - visibilityChunkRadius; cz <= camChunkZ + visibilityChunkRadius; cz++) {
        for (let cx = camChunkX - visibilityChunkRadius; cx <= camChunkX + visibilityChunkRadius; cx++) {
          const wx = cx * chunkSize;
          const wz = cz * chunkSize;
          const dist = Math.hypot(wx - trueCamX, wz - trueCamZ);
          if (dist > farDist) continue;

          const rec = getOrCreateChunkRec(cx, cz);
          rec.lastUsed = frameCounter;
          touched.add(chunkKey(cx, cz));

          if (rec.mesh && !rec.mesh.visible) rec.mesh.visible = true;
          if (rec.ceilMesh && !rec.ceilMesh.visible) rec.ceilMesh.visible = true;

          const target = desiredSegs(dist, q);
          if (rec.segs !== target) {
            const priority = rec.mesh ? dist + 220 : dist;
            candidates.push({ rec, target, priority });
          }
        }
      }

      // 2. Скрыть чанки за пределами видимости
      chunks.forEach((rec) => {
        if (!touched.has(chunkKey(rec.cx, rec.cz))) {
          if (rec.mesh && rec.mesh.visible) rec.mesh.visible = false;
          if (rec.ceilMesh && rec.ceilMesh.visible) rec.ceilMesh.visible = false;
        }
      });

      // 3. LRU eviction: удалить чанки вне visibility и давно неиспользуемые
      const toDelete = [];
      chunks.forEach((rec, key) => {
        if (!touched.has(key) && rec.lastUsed < frameCounter - CHUNK_IDLE_FRAMES) {
          toDelete.push({ key, rec });
        }
      });
      // Если всё ещё слишком много чанков — удалить старейшие невидимые
      if (chunks.size - toDelete.length > MAX_ACTIVE_CHUNKS) {
        const sorted = Array.from(chunks.entries()).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        let excess = chunks.size - toDelete.length - MAX_ACTIVE_CHUNKS;
        for (let i = 0; i < sorted.length && excess > 0; i++) {
          const [key, rec] = sorted[i];
          if (!touched.has(key) && !toDelete.some((d) => d.key === key)) {
            toDelete.push({ key, rec });
            excess--;
          }
        }
      }
      for (const { key, rec } of toDelete) {
        disposeChunk(rec);
        chunks.delete(key);
      }

      // 4. Построение по бюджету времени
      candidates.sort((a, b) => a.priority - b.priority);
      let built = 0;
      for (let i = 0; i < candidates.length; i++) {
        createOrUpdateChunk(candidates[i].rec, candidates[i].target);
        built++;
        if (performance.now() - t0 > budgetMs) break;
      }
      if (built >= candidates.length) needsRebuildScan = false;
    },

    getStats() {
      let built = 0, visible = 0;
      chunks.forEach((r) => {
        if (r.mesh) { built++; if (r.mesh.visible) visible++; }
      });
      return { total: chunks.size, built, visible, max: MAX_ACTIVE_CHUNKS };
    },

    /* Диагностика ледяного/карстового потолка: сколько чанков реально имеют
       ceilMesh и в каком диапазоне высот он построен. Читающий API. */
    getCeilingStats() {
      let meshes = 0, visible = 0, withCeiling = 0;
      let minY = Infinity, maxY = -Infinity;
      chunks.forEach((r) => {
        if (r.mesh) withCeiling += 0;
        if (!r.ceilMesh) return;
        meshes++;
        if (r.ceilMesh.visible) visible++;
        const bb = r.ceilMesh.geometry.boundingSphere;
        if (bb) {
          minY = Math.min(minY, bb.center.y - bb.radius);
          maxY = Math.max(maxY, bb.center.y + bb.radius);
        }
      });
      chunks.forEach((r) => { if (r.mesh) withCeiling++; });
      return {
        material: !!ceilingMat,
        biomeHasCeiling: !!(biomeRef && typeof biomeRef.getCeilingHeight === 'function'),
        floorChunks: withCeiling,
        ceilingMeshes: meshes,
        ceilingVisible: visible,
        minY: Number.isFinite(minY) ? minY : null,
        maxY: Number.isFinite(maxY) ? maxY : null
      };
    },

    /* Положение построенных чанков в мировых координатах — регрессионный
       контроль выравнивания геометрии по сетке чанков (смещение на chunkSize/2
       ломало и текстуру, и коллизию). Читающий API, ничего не меняет. */
    getChunkOrigins() {
      const origin = getOriginRef();
      const ox = origin ? origin.x : 0;
      const oz = origin ? origin.z : 0;
      const list = [];
      chunks.forEach((r) => {
        if (!r.mesh) return;
        list.push({
          cx: r.cx, cz: r.cz, segs: r.segs,
          localX: r.mesh.position.x, localZ: r.mesh.position.z,
          originX: ox, originZ: oz
        });
      });
      return { chunkSize, originX: ox, originZ: oz, chunks: list };
    }
  };
})(window.OC);
