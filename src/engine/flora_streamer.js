/* ================= ДИНАМИЧЕСКИЙ ЧАНКОВЫЙ СТРИМИНГ ФЛОРЫ (unbounded world) ================= */
/* Кэш чанков флоры ограничен по размеру (LRU eviction), координаты не привязаны к
   worldRadius биома — можно стримить флору на arbitrarily больших расстояниях. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  let sceneRef = null;
  let biomeRef = null;
  let group = null;
  let chunkSize = 150;

  const chunkFloraCache = new Map(); // "cx,cz" -> Array<{ species, variant, x, y, z, ry, scale, tint }>
  const pools = [];                  // { species, variant, mesh, maxCount, cullDist, count }
  const poolLookup = new Map();      // "species:variant" -> pool

  const lastRebuildPos = new T.Vector3(1e9, 1e9, 1e9);
  const lastCacheCheckPos = new T.Vector3(1e9, 1e9, 1e9);
  let lastDensity = -1;
  let dirtyRebuild = false;
  let lastVolcDmgKey = 'none';
  let cacheComplete = false;
  let totalVisibleInstances = 0;
  let qualityHookBound = false;
  let lastIceOpacity = -1;
  let lastKelpProductivity = -1;
  let frameCounter = 0;

  /* Лимит кэшируемых чанков флоры в памяти (при превышении удаляются давно неиспользуемые) */
  const MAX_CACHED_CHUNKS = 320;
  const CHUNK_IDLE_FRAMES = 240; // ~4 сек без использования -> удалить из кэша

  const _pos = new T.Vector3();
  const _quat = new T.Quaternion();
  const _euler = new T.Euler();
  const _scale = new T.Vector3();
  const _mat4 = new T.Matrix4();
  const _col = new T.Color();
  const _volcDmgColor = new T.Color(0x5a4a3a);

function chunkKey(cx, cz) {
    return cx + ',' + cz;
}

function chunkCacheTouch(key) {
    const rec = chunkFloraCache.get(key);
    if (rec) rec.lastUsed = frameCounter;
}

function getOriginRef() {
    return OC.FloatingOrigin ? OC.FloatingOrigin.getOrigin() : null;
}

  function evictStaleFloraChunks() {
    const toDelete = [];
    chunkFloraCache.forEach((items, key) => {
      if (items.lastUsed < frameCounter - CHUNK_IDLE_FRAMES) {
        toDelete.push(key);
      }
    });
    // Если всё ещё слишком много — удалить старейшие
    if (chunkFloraCache.size - toDelete.length > MAX_CACHED_CHUNKS) {
      const sorted = Array.from(chunkFloraCache.entries()).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      let excess = chunkFloraCache.size - toDelete.length - MAX_CACHED_CHUNKS;
      for (let i = 0; i < sorted.length && excess > 0; i++) {
        const [key] = sorted[i];
        if (!toDelete.includes(key)) {
          toDelete.push(key);
          excess--;
        }
      }
    }
    for (const key of toDelete) {
      chunkFloraCache.delete(key);
    }
  }

  function updateSeasonalAppearance() {
    if (!biomeRef || !OC.Seasons) return;
    const season = OC.Seasons.getState(biomeRef);
    const iceOpacity = biomeRef.id === 'baikal'
      ? 0.04 + season.iceFactor * 0.96
      : 0.82 + season.winterFactor * 0.18;
    if (Math.abs(iceOpacity - lastIceOpacity) > 0.01) {
      for (let i = 0; i < pools.length; i++) {
        const pool = pools[i];
        if (pool.species === 'ice_floe' || pool.species === 'iceberg' || pool.species === 'brinicle') {
          pool.mesh.material.opacity = iceOpacity;
          pool.mesh.visible = pool.count > 0 && iceOpacity > 0.015;
        }
      }
      lastIceOpacity = iceOpacity;
    }
    if (biomeRef.id === 'kelp_forest' && Math.abs(season.productivityFactor - lastKelpProductivity) > 0.01) {
      const factor = season.productivityFactor;
      for (let i = 0; i < pools.length; i++) {
        if (pools[i].species === 'kelp' || pools[i].species === 'kelp_giant') pools[i].mesh.material.color.setScalar(factor);
      }
      lastKelpProductivity = factor;
    }
  }

function buildChunkData(cx, cz, density) {
    const seed = ((cx * 73856093) ^ (cz * 19349663) ^ 0x5f3759df) >>> 0;
    const rng = OC.mulberry32(seed);
    const raw = biomeRef.generateChunkFlora(cx, cz, chunkSize, density, rng);
    const items = [];
    const origin = getOriginRef();
    const ox = origin ? origin.x : 0;
    const oz = origin ? origin.z : 0;

    for (let i = 0; i < raw.length; i++) {
      const it = raw[i];
      const basePool = poolLookup.get(it.species + ':0');
      const vCount = basePool ? basePool.variantCount : 1;
      const variant = Math.floor(rng() * vCount);
      items.push({
        species: it.species,
        variant,
        x: it.x - ox, // относительно начала координат (Floating Origin)
        y: it.y,
        z: it.z - oz, // относительно начала координат (Floating Origin)
        ry: it.ry,
        scale: it.scale,
        tint: it.tint || 0xffffff
      });
    }
    items.lastUsed = frameCounter;
    return items;
}

  function rebuildActiveInstances(camPos) {
    const q = OC.Quality.get();
    const activeR = q.floraActiveRadius;
    const activeR2 = activeR * activeR;
    const origin = getOriginRef();
    const ox = origin ? origin.x : 0;
    const oz = origin ? origin.z : 0;

    // Истинная мировая позиция камеры (локальная + origin)
    const trueCamX = camPos.x + ox;
    const trueCamZ = camPos.z + oz;

    // Потолочное отсечение для пещерных биомов:
    // если камера под сводом, объекты над сводом в своей точке за потолком — не рисуем
    const hasCeiling = biomeRef && typeof biomeRef.getCeilingHeight === 'function';
    const camY = camPos.y + (origin ? origin.y : 0);
    let camCeilY = null;
    if (hasCeiling) {
      camCeilY = biomeRef.getCeilingHeight(trueCamX, trueCamZ);
    }

    for (let i = 0; i < pools.length; i++) pools[i].count = 0;

    // Радиус кэша не ограничен chunkHalfCount — берём из истинных координат камеры
    const minCx = Math.floor((trueCamX - activeR) / chunkSize);
    const maxCx = Math.floor((trueCamX + activeR) / chunkSize);
    const minCz = Math.floor((trueCamZ - activeR) / chunkSize);
    const maxCz = Math.floor((trueCamZ + activeR) / chunkSize);

    let total = 0;

    for (let cz = minCz; cz <= maxCz; cz++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const wx = (cx + 0.5) * chunkSize;
        const wz = (cz + 0.5) * chunkSize;
        const dxC = wx - trueCamX;
        const dzC = wz - trueCamZ;
        if (dxC * dxC + dzC * dzC > (activeR + chunkSize * 0.8) ** 2) continue;

        const items = chunkFloraCache.get(chunkKey(cx, cz));
        if (!items) continue;
        chunkCacheTouch(chunkKey(cx, cz));

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const dx = it.x - camPos.x;
          const dz = it.z - camPos.z;
          const d2 = dx * dx + dz * dz;
          if (d2 > activeR2) continue;

          // Потолочное отсечение: объект над сводом пещеры, камера под сводом — объект за потолком
          if (hasCeiling && camCeilY !== null && camY < camCeilY) {
            const objWorldX = it.x + ox;
            const objWorldZ = it.z + oz;
            const objCeilY = biomeRef.getCeilingHeight(objWorldX, objWorldZ);
            if (it.y > objCeilY) continue;
          }

          const pool = poolLookup.get(it.species + ':' + it.variant);
          if (!pool) continue;
          const cull = Math.min(activeR, pool.cullDist);
          if (d2 > cull * cull) continue;
          if (pool.cullDist <= 340 && (i & 1) === 1 && d2 > (cull * 0.58) ** 2) continue;
          if (pool.count >= pool.maxCount) continue;

          let dmg = 0;
          if (OC.Volcano && OC.Volcano.getDamageFactor) {
            dmg = OC.Volcano.getDamageFactor(it.x, it.z);
          }
          const idx = pool.count++;
          _pos.set(it.x, it.y, it.z);
          _euler.set(0, it.ry, 0);
          _quat.setFromEuler(_euler);
          _scale.setScalar(it.scale * (1 - dmg * 0.45));
          _mat4.compose(_pos, _quat, _scale);
          pool.mesh.setMatrixAt(idx, _mat4);
          _col.setHex(it.tint);
          if (dmg > 0) _col.lerp(_volcDmgColor, dmg * 0.7);
          pool.mesh.setColorAt(idx, _col);
          total++;
        }
      }
    }

    for (let i = 0; i < pools.length; i++) {
      const p = pools[i];
      p.mesh.count = p.count;
      p.mesh.visible = p.count > 0;
      if (p.count > 0) {
        p.mesh.instanceMatrix.needsUpdate = true;
        if (p.mesh.instanceColor) p.mesh.instanceColor.needsUpdate = true;
      }
      p.prevCount = p.count;
    }

    totalVisibleInstances = total;
    lastRebuildPos.copy(camPos);
    dirtyRebuild = false;
  }

  OC.FloraStreamer = {
    init(scene, biome, spawnPos) {
      sceneRef = scene;
      biomeRef = biome;
      lastIceOpacity = -1;
      lastKelpProductivity = -1;
      chunkSize = biome.chunkSize || 150;

      if (group) {
        const disposedGeos = new Set();
        const disposedMats = new Set();
        group.traverse((o) => {
          if (o.geometry && !disposedGeos.has(o.geometry)) {
            o.geometry.dispose();
            disposedGeos.add(o.geometry);
          }
          if (o.material && !disposedMats.has(o.material)) {
            o.material.dispose();
            disposedMats.add(o.material);
          }
        });
        scene.remove(group);
      }
      pools.length = 0;
      poolLookup.clear();
      chunkFloraCache.clear();
      dirtyRebuild = false;
      cacheComplete = false;
      lastCacheCheckPos.set(1e9, 1e9, 1e9);

      // При сдвиге начала координат (Floating Origin) сдвигаем все пулы инстансов
      OC.FloatingOrigin.onShift((delta) => {
        for (let i = 0; i < pools.length; i++) {
          pools[i].mesh.position.sub(delta);
          if (pools[i].mesh.instanceMatrix) pools[i].mesh.instanceMatrix.needsUpdate = true;
        }
      });

      group = new T.Group();
      scene.add(group);

      const prototypes = OC.FloraLibrary.create();
      for (const species in prototypes) {
        const spec = prototypes[species];
        const vCount = spec.geos.length;
        const perVarMax = Math.max(40, Math.ceil(spec.maxInstances / vCount));

        for (let v = 0; v < vCount; v++) {
          const mesh = new T.InstancedMesh(spec.geos[v], spec.mat, perVarMax);
          // InstancedMesh хранит все экземпляры в одном меше в (0,0,0). При
          // frustumCulled = true Three.js отсекает ВЕСЬ InstancedMesh целиком,
          // если его единый bounding box попадает за視русна — и вся флора
          // исчезает при повороте камеры. Точное отсечение каждой особи
          // выполняется вручную в rebuildActiveInstances (по дистанции до
          // камеры), поэтому здесь frustumCulled выключен.
          mesh.frustumCulled = false;
          mesh.userData.key = species;
          mesh.count = 0;
          mesh.setColorAt(0, new T.Color(1, 1, 1));
          mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
          group.add(mesh);

          const pObj = {
            species,
            variant: v,
            variantCount: vCount,
            mesh,
            maxCount: perVarMax,
            cullDist: spec.cullDist || 500,
            count: 0,
            prevCount: 0
          };
          pools.push(pObj);
          poolLookup.set(species + ':' + v, pObj);
        }
      }

      const q = OC.Quality.get();
      lastDensity = q.floraDensity;

      // Синхронно заполняем стартовые 3x3 чанка вокруг спавна (< 25 мс)
      const scx = Math.floor(spawnPos.x / chunkSize);
      const scz = Math.floor(spawnPos.z / chunkSize);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = scx + dx, cz = scz + dz;
          chunkFloraCache.set(chunkKey(cx, cz), buildChunkData(cx, cz, q.floraDensity));
        }
      }

      rebuildActiveInstances(spawnPos);

      if (!qualityHookBound) {
        qualityHookBound = true;
        OC.Quality.onChange((preset) => {
          if (Math.abs(preset.floraDensity - lastDensity) > 0.05) {
            chunkFloraCache.clear();
            lastDensity = preset.floraDensity;
          }
          cacheComplete = false;
          dirtyRebuild = true;
        });
      }
      frameCounter = 0;
    },

    update(camPos) {
      if (!biomeRef) return;
      frameCounter++;
      updateSeasonalAppearance();
      if (OC.Volcano && OC.Volcano.getDamageState) {
        const vs = OC.Volcano.getDamageState();
        const key = vs.active ? vs.f.toFixed(2) : 'off';
        if (key !== lastVolcDmgKey) { lastVolcDmgKey = key; dirtyRebuild = true; }
      }
      const q = OC.Quality.get();
      const cacheMoved = Math.hypot(camPos.x - lastCacheCheckPos.x, camPos.z - lastCacheCheckPos.z);

      if (!cacheComplete || cacheMoved > 18) {
        const t0 = performance.now();
        const budgetMs = 3.5;

        const cacheR = q.floraCacheRadius;
        // Радиус кэша не ограничен chunkHalfCount — бери из координат камеры
        const minCx = Math.floor((camPos.x - cacheR) / chunkSize);
        const maxCx = Math.floor((camPos.x + cacheR) / chunkSize);
        const minCz = Math.floor((camPos.z - cacheR) / chunkSize);
        const maxCz = Math.floor((camPos.z + cacheR) / chunkSize);

        const missing = [];
        for (let cz = minCz; cz <= maxCz; cz++) {
          for (let cx = minCx; cx <= maxCx; cx++) {
            const k = chunkKey(cx, cz);
            if (chunkFloraCache.has(k)) continue;
            const wx = (cx + 0.5) * chunkSize;
            const wz = (cz + 0.5) * chunkSize;
            const d2 = (wx - camPos.x) ** 2 + (wz - camPos.z) ** 2;
            if (d2 <= cacheR * cacheR) missing.push({ cx, cz, d2 });
          }
        }

        if (missing.length) {
          missing.sort((a, b) => a.d2 - b.d2);
          let builtCount = 0;
          for (let i = 0; i < missing.length; i++) {
            const m = missing[i];
            chunkFloraCache.set(chunkKey(m.cx, m.cz), buildChunkData(m.cx, m.cz, q.floraDensity));
            builtCount++;
            if (performance.now() - t0 > budgetMs) break;
          }
          if (builtCount > 0) dirtyRebuild = true;
          cacheComplete = builtCount >= missing.length;
        } else {
          cacheComplete = true;
        }
        lastCacheCheckPos.copy(camPos);
      }

      evictStaleFloraChunks();

      const movedDist = Math.hypot(camPos.x - lastRebuildPos.x, camPos.z - lastRebuildPos.z);
      if (dirtyRebuild || movedDist > 34) {
        rebuildActiveInstances(camPos);
      }
    },

    findNearest(pos, maxDist, out) {
      if (!pos || !biomeRef) return null;
      const maxD = maxDist || 16;
      const maxD2 = maxD * maxD;
      const scx = Math.floor(pos.x / chunkSize);
      const scz = Math.floor(pos.z / chunkSize);
      let best = null;
      let bestD2 = maxD2;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = scx + dx;
          const cz = scz + dz;
          const items = chunkFloraCache.get(chunkKey(cx, cz));
          if (!items) continue;
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const ddx = it.x - pos.x;
            const ddy = it.y - pos.y;
            const ddz = it.z - pos.z;
            const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
            if (d2 < bestD2) {
              bestD2 = d2;
              best = it;
            }
          }
        }
      }
      if (!best) return null;
      const dst = out || {};
      dst.species = best.species;
      dst.x = best.x;
      dst.y = best.y;
      dst.z = best.z;
      dst.scale = best.scale;
      dst.tint = best.tint;
      dst.dist = Math.sqrt(bestD2);
      return dst;
    },

    getStats() {
      return {
        cachedChunks: chunkFloraCache.size,
        activeInstances: totalVisibleInstances,
        maxCached: MAX_CACHED_CHUNKS
      };
    }
  };
})(window.OC);
