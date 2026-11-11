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

  /* ---------- Текстура мелководья, берегового прибоя и кромки пакового льда ---------- */
  function buildBathymetryFoamTex(biome) {
    const S = 192;
    const data = new Uint8Array(S * S * 4);
    const R = biome ? (biome.worldRadius || 1200) : 1200;
    for (let iz = 0; iz < S; iz++) {
      const wz = ((iz / (S - 1)) * 2 - 1) * R;
      for (let ix = 0; ix < S; ix++) {
        const wx = ((ix / (S - 1)) * 2 - 1) * R;
        const h = biome ? biome.getHeight(wx, wz) : -12;
        const depthNorm = OC.clamp(-h / 45.0, 0, 1);
        // Пена прибоя над очень мелким гребнем (-3.9 .. +0.55 м) и кромкой берега/скал/колонн
        const crestFoam = OC.smoothstep(-3.9, -1.4, h) * OC.smoothstep(0.55, -0.3, h);
        const shoreFoam = OC.smoothstep(-1.45, 0.06, h) * OC.smoothstep(0.62, 0.02, h);
        const idx = (iz * S + ix) * 4;
        data[idx] = Math.round(depthNorm * 255);
        data[idx + 1] = Math.round(crestFoam * 255);
        data[idx + 2] = Math.round(shoreFoam * 255);
        data[idx + 3] = 255;
      }
    }

    // В Арктике впечатываем контактную ледяную пену вокруг льдин (ice_floe) и айсбергов (iceberg)
    if (biome && biome.hasAurora && biome.generateChunkFlora) {
      const cSz = biome.chunkSize || 150;
      const cellW = (2 * R) / S;
      for (let cz = -4; cz <= 4; cz++) {
        for (let cx = -4; cx <= 4; cx++) {
          const items = biome.generateChunkFlora(cx, cz, cSz, 1.0, OC.mulberry32(((cx * 9187) ^ (cz * 3571)) >>> 0));
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (it.species !== 'ice_floe' && it.species !== 'iceberg') continue;
            const rad = (it.species === 'iceberg' ? 23.0 : 13.5) * (it.scale || 1.0);
            const cX = ((it.x / R) * 0.5 + 0.5) * (S - 1);
            const cZ = ((it.z / R) * 0.5 + 0.5) * (S - 1);
            const rPx = Math.ceil((rad + 8.0) / cellW);
            const minX = Math.max(0, Math.floor(cX - rPx));
            const maxX = Math.min(S - 1, Math.ceil(cX + rPx));
            const minZ = Math.max(0, Math.floor(cZ - rPx));
            const maxZ = Math.min(S - 1, Math.ceil(cZ + rPx));
            for (let pz = minZ; pz <= maxZ; pz++) {
              const dwz = (pz - cZ) * cellW;
              for (let px = minX; px <= maxX; px++) {
                const dwx = (px - cX) * cellW;
                const d = Math.hypot(dwx, dwz);
                const ring = OC.smoothstep(rad - 5.5, rad - 1.0, d) * OC.smoothstep(rad + 7.5, rad + 1.5, d);
                if (ring > 0.02) {
                  const idx = (pz * S + px) * 4;
                  const addVal = Math.round(ring * 240);
                  if (addVal > data[idx + 2]) data[idx + 2] = addVal;
                  if (addVal * 0.7 > data[idx + 1]) data[idx + 1] = Math.round(addVal * 0.7);
                }
              }
            }
          }
        }
      }
    }

    const tex = new T.DataTexture(data, S, S, T.RGBAFormat);
    tex.magFilter = T.LinearFilter;
    tex.minFilter = T.LinearFilter;
    tex.wrapS = T.ClampToEdgeWrapping;
    tex.wrapT = T.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  OC._WorldTextures = { causticTexture, rippleTexture, buildBathymetryFoamTex };
})(window.OC);
