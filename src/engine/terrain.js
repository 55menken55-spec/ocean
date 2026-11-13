/* ================= ДИНАМИЧЕСКИЙ ЧАНКОВЫЙ ЛАНДШАФТ С LOD (unbounded world) ================= */
/* Чанки создаются только около камеры и удаляются при удалении (LRU), что позволяет
   ехать на arbitrarily большие расстояния без предварительной регистрации всего мира. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  /* ============ Web Worker: постройка геометрии чанка (встроен как строка) ============ */
  /* Выполняется в отдельном потоке, не блокируя основной цикл рендеринга. */
  const TERRAIN_WORKER_SRC = `
self.onmessage = function (e) {
  'use strict';
  const msg = e.data;
  if (!msg || msg.type !== 'buildChunk') return;

  const { cx, cz, segs, chunkSize, heightData, colorData, stride } = msg;
  const n = segs + 1;
  const gridCount = n * n;
  const skirtVerts = n * 4 * 2;
  const totalVerts = gridCount + skirtVerts;

  const x0 = cx * chunkSize;
  const z0 = cz * chunkSize;
  const step = chunkSize / segs;
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
      const h = heightData[gIdx];
      const idx = iz * n + ix;
      const p3 = idx * 3;

      pos[p3] = relX;
      pos[p3 + 1] = h;
      pos[p3 + 2] = relZ;

      const hL = heightData[gIdx - 1];
      const hR = heightData[gIdx + 1];
      const hD = heightData[gIdx - stride];
      const hU = heightData[gIdx + stride];
      const nx = (hL - hR) * inv2Step;
      const ny = 1.0;
      const nz = (hD - hU) * inv2Step;
      const gradMag = Math.hypot(nx, nz);
      const len = Math.hypot(gradMag, ny) || 1;
      norm[p3] = nx / len;
      norm[p3 + 1] = ny / len;
      norm[p3 + 2] = nz / len;

      const c3 = gIdx * 3;
      col[p3] = colorData[c3];
      col[p3 + 1] = colorData[c3 + 1];
      col[p3 + 2] = colorData[c3 + 2];
    }
  }

  for (let iz = 0; iz < segs; iz++) {
    for (let ix = 0; ix < segs; ix++) {
      const a = iz * n + ix;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  let vPtr = gridCount;
  function addSkirtEdge(getGridIdx, reverse) {
    const startPtr = vPtr;
    for (let k = 0; k < n; k++) {
      const gi = getGridIdx(k);
      const g3 = gi * 3;
      const t3 = vPtr * 3;
      const b3 = (vPtr + 1) * 3;

      pos[t3] = pos[g3]; pos[t3 + 1] = pos[g3 + 1]; pos[t3 + 2] = pos[g3 + 2];
      pos[b3] = pos[g3]; pos[b3 + 1] = pos[g3 + 1] - 4.0; pos[b3 + 2] = pos[g3 + 2];

      norm[t3] = norm[g3]; norm[t3 + 1] = norm[g3 + 1]; norm[t3 + 2] = norm[g3 + 2];
      norm[b3] = norm[g3]; norm[b3 + 1] = norm[g3 + 1]; norm[b3 + 2] = norm[g3 + 2];

      col[t3] = col[g3]; col[t3 + 1] = col[g3 + 1]; col[t3 + 2] = col[g3 + 2];
      col[b3] = col[g3] * 0.85; col[b3 + 1] = col[g3 + 1] * 0.85; col[b3 + 2] = col[g3 + 2] * 0.85;
      vPtr += 2;
    }
    for (let k = 0; k < segs; k++) {
      const a = startPtr + k * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      if (reverse) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }

  addSkirtEdge((k) => k, false);
  addSkirtEdge((k) => segs * n + k, true);
  addSkirtEdge((k) => k * n, true);
  addSkirtEdge((k) => k * n + segs, false);

  const idxBuf = new Uint32Array(indices);

  self.postMessage({
    type: 'chunkBuilt',
    cx, cz, segs,
    positions: pos.buffer,
    normals: norm.buffer,
    colors: col.buffer,
    indices: idxBuf.buffer,
    vertexCount: totalVerts,
    indexCount: idxBuf.length
  }, [pos.buffer, norm.buffer, col.buffer, idxBuf.buffer]);
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
        wx: (cx + 0.5) * chunkSize,
        wz: (cz + 0.5) * chunkSize,
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
  function buildChunkGeometry(cx, cz, segs) {
    const x0 = cx * chunkSize; // абсолютный угол чанка (для запросов к биому)
    const z0 = cz * chunkSize; // абсолютный угол чанка (для запросов к биому)
    const step = chunkSize / segs;
    const inv2Step = 1 / (2 * step);
    const n = segs + 1;
    const stride = n + 2; // +1 ячейка с каждой стороны для идентичных бесшовных нормалей
    const hBuf = getHeightGridBuf(stride);

    for (let gz = 0; gz < stride; gz++) {
      const absZ = z0 + (gz - 1) * step;
      const row = gz * stride;
      for (let gx = 0; gx < stride; gx++) {
        const absX = x0 + (gx - 1) * step;
        hBuf[row + gx] = biomeRef.getHeight(absX, absZ);
      }
    }

    const gridCount = n * n;
    const skirtVerts = n * 4 * 2; // 4 ребра * (верх+низ)
    const totalVerts = gridCount + skirtVerts;

    const pos = new Float32Array(totalVerts * 3);
    const norm = new Float32Array(totalVerts * 3);
    const col = new Float32Array(totalVerts * 3);

    for (let iz = 0; iz <= segs; iz++) {
      const absZ = z0 + iz * step;
      const relZ = absZ - z0; // относительно угла чанка
      const gRow = (iz + 1) * stride;
      for (let ix = 0; ix <= segs; ix++) {
        const absX = x0 + ix * step;
        const relX = absX - x0; // относительно угла чанка
        const gIdx = gRow + (ix + 1);
        const y = hBuf[gIdx];
        const idx = iz * n + ix;
        const p3 = idx * 3;

        pos[p3] = relX;
        pos[p3 + 1] = y;
        pos[p3 + 2] = relZ;

        const hL = hBuf[gIdx - 1];
        const hR = hBuf[gIdx + 1];
        const hD = hBuf[gIdx - stride];
        const hU = hBuf[gIdx + stride];
        const nx = (hL - hR) * inv2Step;
        const ny = 1.0;
        const nz = (hD - hU) * inv2Step;
        const gradMag = Math.hypot(nx, nz);
        const len = Math.hypot(gradMag, ny) || 1;
        norm[p3] = nx / len;
        norm[p3 + 1] = ny / len;
        norm[p3 + 2] = nz / len;

        biomeRef.getTerrainColor(absX, y, absZ, _tmpCol, gradMag > 0.0001 ? Math.min(1, gradMag * 0.95) : 0);
        col[p3] = _tmpCol.r;
        col[p3 + 1] = _tmpCol.g;
        col[p3 + 2] = _tmpCol.b;
      }
    }

    const indices = [];
    for (let iz = 0; iz < segs; iz++) {
      for (let ix = 0; ix < segs; ix++) {
        const a = iz * n + ix;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    // Юбки по 4 краям чанка (скрывают любые стыки при смене LOD)
    let vPtr = gridCount;
    function addSkirtEdge(getGridIdx, reverse) {
      const startPtr = vPtr;
      for (let k = 0; k < n; k++) {
        const gi = getGridIdx(k);
        const g3 = gi * 3;
        const t3 = vPtr * 3;
        const b3 = (vPtr + 1) * 3;

        pos[t3] = pos[g3]; pos[t3 + 1] = pos[g3 + 1]; pos[t3 + 2] = pos[g3 + 2];
        pos[b3] = pos[g3]; pos[b3 + 1] = pos[g3 + 1] - 4.0; pos[b3 + 2] = pos[g3 + 2];

        norm[t3] = norm[g3]; norm[t3 + 1] = norm[g3 + 1]; norm[t3 + 2] = norm[g3 + 2];
        norm[b3] = norm[g3]; norm[b3 + 1] = norm[g3 + 1]; norm[b3 + 2] = norm[g3 + 2];

        col[t3] = col[g3]; col[t3 + 1] = col[g3 + 1]; col[t3 + 2] = col[g3 + 2];
        col[b3] = col[g3] * 0.85; col[b3 + 1] = col[g3 + 1] * 0.85; col[b3 + 2] = col[g3 + 2] * 0.85;
        vPtr += 2;
      }
      for (let k = 0; k < segs; k++) {
        const a = startPtr + k * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        if (reverse) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }

    addSkirtEdge((k) => k, false);                      // верхний край (z = z0)
    addSkirtEdge((k) => segs * n + k, true);            // нижний край (z = z0 + size)
    addSkirtEdge((k) => k * n, true);                   // левый край (x = x0)
    addSkirtEdge((k) => k * n + segs, false);           // правый край (x = x0 + size)

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(norm, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    return geo;
  }

  function buildCeilingChunkGeometry(cx, cz, segs) {
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;
    const step = chunkSize / segs;
    const inv2Step = 1 / (2 * step);
    const n = segs + 1;
    const stride = n + 2;
    const hBuf = getHeightGridBuf(stride);
    const gridCount = n * n;
    const skirtVerts = n * 4 * 2;
    const totalVerts = gridCount + skirtVerts;

    const pos = new Float32Array(totalVerts * 3);
    const norm = new Float32Array(totalVerts * 3);
    const col = new Float32Array(totalVerts * 3);
    const openMask = new Uint8Array(gridCount);

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
          openMask[(gz - 1) * n + (gx - 1)] = isOpen ? 1 : 0;
          if (!isOpen) anyClosed = true;
        }
      }
    }

    if (!anyClosed) return null;

    for (let iz = 0; iz <= segs; iz++) {
      const absZ = z0 + iz * step;
      const relZ = absZ - z0;
      const gRow = (iz + 1) * stride;
      for (let ix = 0; ix <= segs; ix++) {
        const absX = x0 + ix * step;
        const relX = absX - x0;
        const gIdx = gRow + (ix + 1);
        const y = hBuf[gIdx];
        const idx = iz * n + ix;
        const p3 = idx * 3;

        pos[p3] = relX;
        pos[p3 + 1] = y;
        pos[p3 + 2] = relZ;

        const hL = hBuf[gIdx - 1];
        const hR = hBuf[gIdx + 1];
        const hD = hBuf[gIdx - stride];
        const hU = hBuf[gIdx + stride];
        const nx = (hR - hL) * inv2Step;
        const ny = -1.0;
        const nz = (hU - hD) * inv2Step;
        const len = Math.hypot(nx, ny, nz) || 1;
        norm[p3] = nx / len;
        norm[p3 + 1] = ny / len;
        norm[p3 + 2] = nz / len;

        if (biomeRef.getCeilingColor) biomeRef.getCeilingColor(absX, y, absZ, _tmpCol);
        else biomeRef.getTerrainColor(absX, y, absZ, _tmpCol);
        col[p3] = _tmpCol.r;
        col[p3 + 1] = _tmpCol.g;
        col[p3 + 2] = _tmpCol.b;
      }
    }

    const indices = [];
    for (let iz = 0; iz < segs; iz++) {
      for (let ix = 0; ix < segs; ix++) {
        const a = iz * n + ix;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        if (openMask[a] && openMask[b] && openMask[c] && openMask[d]) continue;
        indices.push(a, b, c, b, d, c);
      }
    }
    if (!indices.length) return null;

    // Юбки потолка уходят вверх (+4 м в толщу карста), чтобы скрывать переходы LOD
    let vPtr = gridCount;
    function addCeilSkirtEdge(getGridIdx, reverse) {
      const startPtr = vPtr;
      for (let k = 0; k < n; k++) {
        const gi = getGridIdx(k);
        const g3 = gi * 3;
        const t3 = vPtr * 3;
        const b3 = (vPtr + 1) * 3;

        pos[t3] = pos[g3]; pos[t3 + 1] = pos[g3 + 1]; pos[t3 + 2] = pos[g3 + 2];
        pos[b3] = pos[g3]; pos[b3 + 1] = pos[g3 + 1] + 4.0; pos[b3 + 2] = pos[g3 + 2];

        norm[t3] = norm[g3]; norm[t3 + 1] = norm[g3 + 1]; norm[t3 + 2] = norm[g3 + 2];
        norm[b3] = norm[g3]; norm[b3 + 1] = norm[g3 + 1]; norm[b3 + 2] = norm[g3 + 2];

        col[t3] = col[g3]; col[t3 + 1] = col[g3 + 1]; col[t3 + 2] = col[g3 + 2];
        col[b3] = col[g3] * 0.85; col[b3 + 1] = col[g3 + 1] * 0.85; col[b3 + 2] = col[g3 + 2] * 0.85;
        vPtr += 2;
      }
      for (let k = 0; k < segs; k++) {
        if (openMask[getGridIdx(k)] && openMask[getGridIdx(k + 1)]) continue;
        const a = startPtr + k * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        if (reverse) indices.push(a, b, c, b, d, c);
        else indices.push(a, c, b, b, c, d);
      }
    }

    addCeilSkirtEdge((k) => k, false);
    addCeilSkirtEdge((k) => segs * n + k, true);
    addCeilSkirtEdge((k) => k * n, true);
    addCeilSkirtEdge((k) => k * n + segs, false);

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(norm, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    return geo;
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
    const pd = pendingChunkData.get(key);
    if (!pd) {
      workerBusy = false;
      processWorkerQueue();
      return;
    }
    // Копируем буферы перед передачей в Worker, чтобы не нейтрализовать
    // общий heightGridBuf (getHeightGridBuf переиспользует один буфер).
    // Transferable переносит владение буфером — после этого источник становится
    // неиспользуемым (detached), и все следующие чанки получают нулевые высоты.
    const hCopy = new Float32Array(pd.heightData);
    const cCopy = new Float32Array(pd.colorData);
    terrainWorker.postMessage({
      type: 'buildChunk',
      cx: next.rec.cx,
      cz: next.rec.cz,
      segs: pd.segs,
      chunkSize: chunkSize,
      heightData: hCopy,
      colorData: cCopy,
      stride: pd.stride
    }, [hCopy.buffer, cCopy.buffer]);
  }

  function buildChunkFromWorkerData(rec, segs, positions, normals, colors, indices, vertexCount, indexCount) {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(normals), 3));
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array(colors), 3));
    geo.setIndex(new T.BufferAttribute(new Uint32Array(indices), 1));
    geo.computeBoundingSphere();

    const origin = getOriginRef();
    const ox = origin ? origin.x : 0;
    const oz = origin ? origin.z : 0;

    if (rec.mesh) {
      rec.mesh.geometry.dispose();
      rec.mesh.geometry = geo;
    } else {
      rec.mesh = new T.Mesh(geo, terrainMat);
      rec.mesh.userData.key = 'floor';
      group.add(rec.mesh);
    }
    rec.mesh.position.set(rec.wx - ox, 0, rec.wz - oz);

    if (ceilingMat && biomeRef.getCeilingHeight) {
      const cGeo = buildCeilingChunkGeometry(rec.cx, rec.cz, segs);
      if (cGeo) {
        if (rec.ceilMesh) {
          rec.ceilMesh.geometry.dispose();
          rec.ceilMesh.geometry = cGeo;
          rec.ceilMesh.visible = rec.mesh.visible;
          rec.ceilMesh.position.set(rec.wx - ox, 0, rec.wz - oz);
        } else {
          rec.ceilMesh = new T.Mesh(cGeo, ceilingMat);
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
    const key = chunkKey(rec.cx, rec.cz);

    // Синхронная постройка чанка (Worker отключён для отладки прозрачного дна)
    const geo = buildChunkGeometry(rec.cx, rec.cz, segs);
    if (rec.mesh) {
      rec.mesh.geometry.dispose();
      rec.mesh.geometry = geo;
    } else {
      rec.mesh = new T.Mesh(geo, terrainMat);
      rec.mesh.userData.key = 'floor';
      group.add(rec.mesh);
    }
    const origin = getOriginRef();
    const ox = origin ? origin.x : 0;
    const oz = origin ? origin.z : 0;
    rec.mesh.position.set(rec.wx - ox, 0, rec.wz - oz);

    if (ceilingMat && biomeRef.getCeilingHeight) {
      const cGeo = buildCeilingChunkGeometry(rec.cx, rec.cz, segs);
      if (cGeo) {
        if (rec.ceilMesh) {
          rec.ceilMesh.geometry.dispose();
          rec.ceilMesh.geometry = cGeo;
          rec.ceilMesh.visible = rec.mesh.visible;
          rec.ceilMesh.position.set(rec.wx - ox, 0, rec.wz - oz);
        } else {
          rec.ceilMesh = new T.Mesh(cGeo, ceilingMat);
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

  /* ---- Внешний горизонт дна за пределами детальной карты (только для ограниченных миров) ---- */
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
            const { type, cx, cz, segs, positions, normals, colors, indices, vertexCount, indexCount } = e.data;
            if (type !== 'chunkBuilt') return;
            const key = chunkKey(cx, cz);
            const rec = chunks.get(key);
            if (!rec) return;
            workerBusy = false;
            processWorkerQueue();
            buildChunkFromWorkerData(rec, segs, positions, normals, colors, indices, vertexCount, indexCount);
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

      // При сдвиге начала координат (Floating Origin) перепозиционируем все меши чанков
      OC.FloatingOrigin.onShift((delta) => {
        chunks.forEach((rec) => {
          if (rec.mesh) rec.mesh.position.sub(delta);
          if (rec.ceilMesh) rec.ceilMesh.position.sub(delta);
        });
        if (horizonApron) horizonApron.position.sub(delta);
      });

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
        OC.enhanceMaterial(ceilingMat, { causticStrength: 0.35, isTerrain: true });
      }

      // Горизонтный фартук только для ограниченных миров
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
          const wx = (cx + 0.5) * chunkSize;
          const wz = (cz + 0.5) * chunkSize;
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
    }
  };
})(window.OC);
