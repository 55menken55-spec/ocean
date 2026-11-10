/* ================= ЧАНКОВЫЙ ЛАНДШАФТ С LOD И ПРОГРЕССИВНОЙ ЗАГРУЗКОЙ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  let sceneRef = null;
  let biomeRef = null;
  let terrainMat = null;
  let group = null;
  const chunks = new Map(); // key "cx,cz" -> { cx, cz, wx, wz, segs, mesh }
  let chunkRadiusCount = 8; // [-8 .. 7] = 16x16 для 2400 м при chunkSize=150
  let chunkSize = 150;
  let initialized = false;

  const _tmpCol = new T.Color();

  function chunkKey(cx, cz) {
    return cx + ',' + cz;
  }

  /* ---- Построение меша одного чанка с юбками по краям (без швов между LOD) ---- */
  function buildChunkGeometry(cx, cz, segs) {
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;
    const n = segs + 1;
    const gridCount = n * n;
    const skirtVerts = n * 4 * 2; // 4 ребра * (верх+низ)
    const totalVerts = gridCount + skirtVerts;

    const pos = new Float32Array(totalVerts * 3);
    const norm = new Float32Array(totalVerts * 3);
    const col = new Float32Array(totalVerts * 3);

    const eps = Math.max(1.2, chunkSize / segs * 0.45);

    for (let iz = 0; iz <= segs; iz++) {
      const z = z0 + (iz / segs) * chunkSize;
      for (let ix = 0; ix <= segs; ix++) {
        const x = x0 + (ix / segs) * chunkSize;
        const y = biomeRef.getHeight(x, z);
        const idx = iz * n + ix;
        const p3 = idx * 3;

        pos[p3] = x;
        pos[p3 + 1] = y;
        pos[p3 + 2] = z;

        // Точные непрерывные нормали из аналитической высоты (без швов между чанками)
        const hL = biomeRef.getHeight(x - eps, z);
        const hR = biomeRef.getHeight(x + eps, z);
        const hD = biomeRef.getHeight(x, z - eps);
        const hU = biomeRef.getHeight(x, z + eps);
        let nx = hL - hR;
        let ny = 2 * eps;
        let nz = hD - hU;
        const len = Math.hypot(nx, ny, nz) || 1;
        norm[p3] = nx / len;
        norm[p3 + 1] = ny / len;
        norm[p3 + 2] = nz / len;

        biomeRef.getTerrainColor(x, y, z, _tmpCol);
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

  function desiredSegs(dist, q) {
    if (dist < q.terrainNearDist) return q.terrainNearSegs;
    if (dist < q.terrainMidDist) return q.terrainMidSegs;
    return q.terrainFarSegs;
  }

  function createOrUpdateChunk(rec, segs) {
    if (rec.segs === segs && rec.mesh) return;
    const geo = buildChunkGeometry(rec.cx, rec.cz, segs);
    if (rec.mesh) {
      rec.mesh.geometry.dispose();
      rec.mesh.geometry = geo;
    } else {
      rec.mesh = new T.Mesh(geo, terrainMat);
      rec.mesh.userData.key = 'floor';
      group.add(rec.mesh);
    }
    rec.segs = segs;
  }

  /* ---- Внешний горизонт дна за пределами детальной карты ---- */
  function buildHorizonApron() {
    const g = new T.PlaneGeometry(5200, 5200, 48, 48);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const c = new Float32Array(p.count * 3);
    const col = new T.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let y = biomeRef.getHeight(x, z);
      // Внутри зоны детальных чанков чуть опускаем фартук, чтобы не было Z-fighting
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
    group.add(apron);
  }

  OC.Terrain = {
    init(scene, biome, spawnPos) {
      sceneRef = scene;
      biomeRef = biome;
      chunkSize = biome.chunkSize || 150;
      chunkRadiusCount = Math.round(biome.worldRadius / chunkSize);

      if (group) {
        group.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
        });
        scene.remove(group);
      }
      if (terrainMat) { terrainMat.dispose(); terrainMat = null; }
      chunks.clear();
      initialized = false;
      group = new T.Group();
      scene.add(group);

      terrainMat = new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.02
      });
      OC.enhanceMaterial(terrainMat, { causticStrength: 1.0, isTerrain: true });

      buildHorizonApron();

      // Регистрируем дескрипторы всех 16x16 чанков
      for (let cz = -chunkRadiusCount; cz < chunkRadiusCount; cz++) {
        for (let cx = -chunkRadiusCount; cx < chunkRadiusCount; cx++) {
          chunks.set(chunkKey(cx, cz), {
            cx,
            cz,
            wx: (cx + 0.5) * chunkSize,
            wz: (cz + 0.5) * chunkSize,
            segs: 0,
            mesh: null
          });
        }
      }

      // Синхронно строим только стартовую окрестность вокруг камеры (~25 чанков, < 20 мс)
      const q = OC.Quality.get();
      const scx = Math.floor(spawnPos.x / chunkSize);
      const scz = Math.floor(spawnPos.z / chunkSize);
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const rec = chunks.get(chunkKey(scx + dx, scz + dz));
          if (!rec) continue;
          const dist = Math.hypot(rec.wx - spawnPos.x, rec.wz - spawnPos.z);
          createOrUpdateChunk(rec, desiredSegs(dist, q));
        }
      }
      initialized = true;
    },

    update(camPos) {
      if (!initialized) return;
      const q = OC.Quality.get();
      const t0 = performance.now();
      const budgetMs = 3.5;

      // Собираем чанки в зоне видимости, требующие создания или обновления LOD
      const candidates = [];
      chunks.forEach((rec) => {
        const dist = Math.hypot(rec.wx - camPos.x, rec.wz - camPos.z);
        if (dist > q.terrainFarDist) {
          if (rec.mesh && rec.mesh.visible) rec.mesh.visible = false;
          return;
        }
        if (rec.mesh && !rec.mesh.visible) rec.mesh.visible = true;
        const target = desiredSegs(dist, q);
        if (rec.segs !== target) {
          // Не перестраиваем мелкую разницу слишком далеко без нужды
          const priority = rec.mesh ? dist + 220 : dist;
          candidates.push({ rec, target, priority });
        }
      });

      if (!candidates.length) return;
      candidates.sort((a, b) => a.priority - b.priority);

      for (let i = 0; i < candidates.length; i++) {
        createOrUpdateChunk(candidates[i].rec, candidates[i].target);
        if (performance.now() - t0 > budgetMs) break;
      }
    },

    getStats() {
      let built = 0, visible = 0;
      chunks.forEach((r) => {
        if (r.mesh) { built++; if (r.mesh.visible) visible++; }
      });
      return { total: chunks.size, built, visible };
    }
  };
})(window.OC);
