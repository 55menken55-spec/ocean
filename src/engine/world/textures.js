/* ================= МИР: ПРОЦЕДУРНЫЕ ТЕКСТУРЫ ================= */
/* Каустика (ячейки Вороного), рябь на воде и карта мелководья/прибоя/кромки льда.
   Чистые функции: на входе — биом, на выходе — готовые THREE-текстуры. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

    /* ---------- Текстуры каустики и ряби ---------- */
  function causticTexture(seedPts) {
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S, S);
    const rng = OC.mulberry32(7331);
    const pts = [];
    for (let i = 0; i < seedPts; i++) pts.push([rng() * S, rng() * S]);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let f1 = 1e9, f2 = 1e9;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          let dx = Math.abs(x - p[0]); dx = Math.min(dx, S - dx);
          let dy = Math.abs(y - p[1]); dy = Math.min(dy, S - dy);
          const d = dx * dx + dy * dy;
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
        const e = Math.sqrt(f2) - Math.sqrt(f1);
        let v = Math.exp(-e * e / 26);
        v = Math.pow(v, 1.35);
        const idx = (y * S + x) * 4;
        img.data[idx] = 255 * v;
        img.data[idx + 1] = 255 * v;
        img.data[idx + 2] = 255 * v;
        img.data[idx + 3] = 255 * v;
      }
    }
    ctx.putImageData(img, 0, 0);
    const cv2 = document.createElement('canvas');
    cv2.width = cv2.height = S;
    const ctx2 = cv2.getContext('2d');
    ctx2.filter = 'blur(1.2px)';
    ctx2.drawImage(cv, 0, 0);
    const tex = new T.CanvasTexture(cv2);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    return tex;
  }

  function rippleTexture() {
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    const rng = OC.mulberry32(1945);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    for (let i = 0; i < 28; i++) {
      ctx.lineWidth = 1 + rng() * 2.8;
      ctx.beginPath();
      const y0 = rng() * S;
      for (let x = 0; x <= S; x += 8) {
        const y = y0 + Math.sin((x / S) * Math.PI * 4 + i) * 6 + Math.sin((x / S) * Math.PI * 10 + i * 1.7) * 3;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const cv2 = document.createElement('canvas');
    cv2.width = cv2.height = S;
    const ctx2 = cv2.getContext('2d');
    ctx2.filter = 'blur(1.4px)';
    ctx2.drawImage(cv, 0, 0);
    const tex = new T.CanvasTexture(cv2);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    return tex;
  }

  /* ---------- Текстура мелководья, берегового прибоя и кромки пакового льда ----------
     В мире без края текстура не может быть снята один раз с круга worldRadius:
     игрок уходит на километры, а под ним продолжается процедурный рельеф со
     своими берегами и отмелями (в Титане вне ядра встречается суша до +22 м).
     Поэтому это скроллящееся окно вокруг аппарата: готовые пиксели переезжают,
     открывшаяся полоса досчитывается порциями по бюджету времени. */
  const FOAM_S = 128;
  const FOAM_SPAN = 3000;   // метров поперёк окна (шаг ячейки 23.4 м)
  const FLORA_CACHE_MAX = 512;

  function createFoamWindow(biome) {
    const S = FOAM_S;
    const SPAN = FOAM_SPAN;
    const floraCache = new Map();

    /* Флора чанка нужна только ради ледяной пены в Арктике; считаем лениво и
       держим ограниченный кэш — окно проезжает много чанков за сеанс. */
    function floraChunk(cx, cz) {
      const key = cx + ',' + cz;
      let items = floraCache.get(key);
      if (items !== undefined) return items;
      const cSz = biome.chunkSize || 150;
      let out = [];
      try {
        out = biome.generateChunkFlora(cx, cz, cSz, 1.0, OC.mulberry32(((cx * 9187) ^ (cz * 3571)) >>> 0)) || [];
      } catch (e) {
        out = [];
      }
      if (floraCache.size >= FLORA_CACHE_MAX) {
        const first = floraCache.keys().next().value;
        floraCache.delete(first);
      }
      floraCache.set(key, out);
      return out;
    }

    /* Контактная ледяная пена вокруг льдин (ice_floe) и айсбергов (iceberg):
       впечатывается в ту же строку, что и батиметрия, поэтому остаётся на
       своих мировых координатах при прокрутке окна. */
    function imprintIceRow(data, j, i0, i1, cx, cz, cell) {
      const half = S / 2;
      const wz = cz + (j + 0.5 - half) * cell;
      const wx0 = cx + (i0 + 0.5 - half) * cell;
      const wx1 = cx + (i1 - 1 + 0.5 - half) * cell;
      const cSz = biome.chunkSize || 150;
      const fcz0 = Math.floor((wz - 40) / cSz);
      const fcz1 = Math.floor((wz + 40) / cSz);
      const fcx0 = Math.floor((Math.min(wx0, wx1) - 40) / cSz);
      const fcx1 = Math.floor((Math.max(wx0, wx1) + 40) / cSz);

      for (let fcz = fcz0; fcz <= fcz1; fcz++) {
        for (let fcx = fcx0; fcx <= fcx1; fcx++) {
          const items = floraChunk(fcx, fcz);
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it.species !== 'ice_floe' && it.species !== 'iceberg') continue;
            const rad = (it.species === 'iceberg' ? 23.0 : 13.5) * (it.scale || 1.0);
            if (Math.abs(it.z - wz) > rad + 8.0) continue;
            const cX = (it.x - (cx - SPAN / 2)) / cell;
            const cZ = (it.z - (cz - SPAN / 2)) / cell;
            const rPx = (rad + 8.0) / cell;
            const minX = Math.max(i0, Math.floor(cX - rPx));
            const maxX = Math.min(i1 - 1, Math.ceil(cX + rPx));
            for (let px = minX; px <= maxX; px++) {
              const dwx = (px - cX) * cell;
              const dwz = (j - cZ) * cell;
              const d = Math.hypot(dwx, dwz);
              const ring = OC.smoothstep(rad - 5.5, rad - 1.0, d) * OC.smoothstep(rad + 7.5, rad + 1.5, d);
              if (ring <= 0.02) continue;
              const idx = (j * S + px) * 4;
              const addVal = Math.round(ring * 240);
              if (addVal > data[idx + 2]) data[idx + 2] = addVal;
              const crest = Math.round(addVal * 0.7);
              if (crest > data[idx + 1]) data[idx + 1] = crest;
            }
          }
        }
      }
    }

    function fillRow(data, j, i0, i1, cx, cz, cell) {
      const half = S / 2;
      const wz = cz + (j + 0.5 - half) * cell;
      for (let i = i0; i < i1; i++) {
        const wx = cx + (i + 0.5 - half) * cell;
        const h = biome ? biome.getHeight(wx, wz) : -12;
        const depthNorm = OC.clamp(-h / 45.0, 0, 1);
        // Пена прибоя над очень мелким гребнем (-3.9 .. +0.55 м) и кромкой берега/скал/колонн
        const crestFoam = OC.smoothstep(-3.9, -1.4, h) * OC.smoothstep(0.55, -0.3, h);
        const shoreFoam = OC.smoothstep(-1.45, 0.06, h) * OC.smoothstep(0.62, 0.02, h);
        const idx = (j * S + i) * 4;
        data[idx] = Math.round(depthNorm * 255);
        data[idx + 1] = Math.round(crestFoam * 255);
        data[idx + 2] = Math.round(shoreFoam * 255);
        data[idx + 3] = 255;
      }
      if (biome && biome.hasAurora && biome.generateChunkFlora) imprintIceRow(data, j, i0, i1, cx, cz, cell);
    }

    const win = OC.GridWindow.create({
      size: S,
      span: SPAN,
      fillRow: fillRow,
      unknown: [0, 0, 0, 255] // вне окна — открытая вода без пены
    });
    const tex = new T.DataTexture(win.data, S, S, T.RGBAFormat);
    tex.magFilter = T.LinearFilter;
    tex.minFilter = T.LinearFilter;
    tex.wrapS = T.ClampToEdgeWrapping;
    tex.wrapT = T.ClampToEdgeWrapping;
    tex.needsUpdate = true;

    return {
      texture: tex,
      size: S,
      span: SPAN,
      centerX() { return win.centerX(); },
      centerZ() { return win.centerZ(); },
      isComplete() { return win.isComplete(); },
      pendingRows() { return win.pendingRows(); },
      /* Значение окна в мировых координатах — для тестов. */
      pixelAt(wx, wz) { return win.pixelAt(wx, wz); },
      setCenter(x, z) {
        const moved = win.setCenter(x, z);
        if (moved) tex.needsUpdate = true;
        return moved;
      },
      /* Досчитать открывшуюся полосу, уложившись в бюджет кадра. */
      tick(budgetMs) {
        const more = win.tick(budgetMs);
        if (win.consumeChanged()) tex.needsUpdate = true;
        return more;
      },
      /* Целиком (смена биома): текстура прибоя нужна сразу. */
      flush() {
        win.flush();
        tex.needsUpdate = true;
      },
      dispose() {
        floraCache.clear();
        if (tex.dispose) tex.dispose();
      }
    };
  }

  OC._WorldTextures = { causticTexture, rippleTexture, createFoamWindow, FOAM_SPAN };
})(window.OC);
