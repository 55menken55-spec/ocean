/* ================= БАТИМЕТРИЧЕСКАЯ МИНИ-КАРТА И ТЕЛЕПОРТ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  let canvas = null;
  let ctx = null;
  let bgImage = null;
  let biomeRef = null;
  let pingState = null; // { x, z, startMs }
  const SIZE = 184;
  const FOG_N = 64;
  const FOG_LEN = FOG_N * FOG_N;
  const fogByBiome = new Map();
  let fogGrid = null;
  let fogEnabled = true;
  let fogCanvas = null;
  let fogCtx = null;
  let fogImg = null;
  let fogDirty = true;
  let revealedCells = 0;
  let lastPassiveX = 99999;
  let lastPassiveZ = 99999;
  let lastSaveMs = 0;

  function depthToRGB(y) {
    const theme = biomeRef && biomeRef.minimapTheme;
    if (theme === 'kelp') {
      if (y > 0.1) return [152, 154, 150]; // прибойные гранитные кекуры
      if (y > -8) return [58, 168, 150];
      if (y > -18) return [32, 128, 124];
      if (y > -34) return [20, 92, 108];
      if (y > -55) return [14, 56, 82];
      return [8, 28, 52];
    }
    if (theme === 'abyss') {
      if (y > -20) return [72, 74, 92]; // верх базальтового уступа
      if (y > -32) return [124, 72, 52]; // гидротермальные поля
      if (y > -48) return [54, 54, 74];
      if (y > -78) return [26, 30, 50];
      return [10, 14, 28];
    }
    if (theme === 'hadal') {
      if (y > -32) return [82, 92, 128];   // бровка зоны субдукции
      if (y > -62) return [50, 62, 102];   // ступенчатые уступы плиты
      if (y > -82) return [36, 76, 108];   // серпентинитовые сипы Сирена
      if (y > -95) return [24, 34, 68];    // равнина и оазис китового падения
      return [12, 16, 40];                 // глубочайшая ось Бездны Челленджера
    }
    if (theme === 'brine') {
      if (y > -32) return [106, 124, 152]; // соляные диапиры
      if (y > -48) return [72, 74, 104];   // склоны каскада Орка
      if (y > -60) return [54, 50, 74];    // мидиевые берега и гидраты
      if (y > -72) return [34, 32, 52];    // котловина рассола
      return [18, 18, 34];                 // глубокий континентальный склон
    }
    if (theme === 'cenote') {
      if (y > -22) return [64, 176, 154];
      if (y > -29) return [42, 106, 108];  // карстовые залы
      if (y > -40) return [28, 72, 86];    // галоклин Анхелиты
      return [12, 32, 56];                 // глубокий колодец Эль-Пит
    }
    if (theme === 'galapagos') {
      if (y > 0.1) return [56, 62, 54];    // чёрные базальтовые острова и опоры Арки Дарвина
      if (y > -17) return [52, 168, 134];  // изумрудные лавовые бухты игуан и ульвы
      if (y > -34) return [32, 128, 136];  // плато Арки Дарвина
      if (y > -66) return [22, 90, 128];   // стена апвеллинга Кромвеля
      return [10, 38, 76];                 // глубокая тихоокеанская пелагиаль
    }
    if (theme === 'amazon') {
      if (y > 0.08) return [52, 138, 62];  // кроны затопленной сельвы и береговые гривки
      if (y > -6) return [186, 132, 62];   // янтарно-медовые отмели Игапо и заводи кувшинок
      if (y > -14) return [132, 78, 36];   // затопленный лес и корни
      if (y > -22) return [84, 48, 22];    // тёмная таниновая вода Рио-Негру
      return [48, 28, 14];                 // глубокий фарватер канала
    }
    if (theme === 'arctic') {
      if (y > -11) return [218, 240, 252]; // кромка пакового припая
      if (y > -18) return [134, 206, 236]; // бирюзовые ледяные поля и полыньи
      if (y > -34) return [52, 138, 186];  // аллея айсбергов
      if (y > -56) return [24, 78, 134];   // моренный склон
      if (y > -92) return [13, 44, 96];    // полярный жёлоб
      return [6, 20, 54];
    }
    if (theme === 'atoll') {
      if (y > 1.2) return [72, 148, 86];   // зелёные шапки известняковых островков
      if (y > 0.05) return [236, 222, 184]; // песчаные пляжи атолла
      if (y > -10) return [54, 208, 198];  // бирюзовая лагуна золотых медуз
      if (y > -20) return [36, 166, 168];  // луга саргасса
      if (y > -30) return [32, 124, 152];  // терраса крушения «SS Maru»
      if (y > -64) return [18, 78, 136];   // стена «Синий угол»
      return [8, 32, 76];
    }
    if (y > 0.1) return [242, 228, 194]; // суша / островок
    if (y > -3.5) return [88, 212, 206];
    if (y > -12) return [36, 172, 194];
    if (y > -24) return [22, 130, 174];
    if (y > -46) return [18, 88, 152];
    if (y > -92) return [12, 48, 110];
    return [7, 22, 58]; // бездна
  }

  function renderBathymetry() {
    if (!biomeRef) return;
    const off = document.createElement('canvas');
    off.width = off.height = SIZE;
    const octx = off.getContext('2d');
    const img = octx.createImageData(SIZE, SIZE);
    const R = biomeRef.worldRadius || 1200;

    for (let py = 0; py < SIZE; py++) {
      const wz = ((py / (SIZE - 1)) * 2 - 1) * R;
      for (let px = 0; px < SIZE; px++) {
        const wx = ((px / (SIZE - 1)) * 2 - 1) * R;
        const y = biomeRef.getHeight(wx, wz);
        let rgb = depthToRGB(y);
        const brine = biomeRef.getBrineSurfaceAt ? biomeRef.getBrineSurfaceAt(wx, wz) : null;
        if (brine) {
          rgb = brine.shoreDist < 4.5 ? [208, 250, 246] : [38, 218, 202];
        } else if (biomeRef.isCeilingOpen && biomeRef.getCeilingHeight) {
          if (biomeRef.isCeilingOpen(wx, wz)) {
            rgb = [48, 224, 204];
          } else {
            const ch = biomeRef.getCeilingHeight(wx, wz);
            if (ch < -10.5) rgb = [Math.round(rgb[0] * 0.54), Math.round(rgb[1] * 0.56), Math.round(rgb[2] * 0.62)];
            else if (ch > 0) rgb = [164, 154, 126];
          }
        }
        // Лёгкая изогипса каждые 15 м
        const contour = (!brine && y < 0 && Math.abs(y % 15) < 1.0) ? 1.08 : 1.0;
        const idx = (py * SIZE + px) * 4;
        img.data[idx] = Math.min(255, rgb[0] * contour);
        img.data[idx + 1] = Math.min(255, rgb[1] * contour);
        img.data[idx + 2] = Math.min(255, rgb[2] * contour);
        img.data[idx + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);

    // Ходовые нити Ариадны в пещерном биоме
    if (biomeRef.ariadnePaths && biomeRef.ariadnePaths.length) {
      octx.save();
      octx.strokeStyle = 'rgba(255, 168, 46, 0.85)';
      octx.lineWidth = 1.6;
      octx.setLineDash([3, 2]);
      for (const path of biomeRef.ariadnePaths) {
        octx.beginPath();
        for (let i = 0; i < path.length; i++) {
          const mp = worldToMap(path[i][0], path[i][2]);
          if (i === 0) octx.moveTo(mp[0], mp[1]);
          else octx.lineTo(mp[0], mp[1]);
        }
        octx.stroke();
      }
      octx.restore();
    }

    // Сетка координат
    octx.strokeStyle = 'rgba(180,235,255,0.08)';
    octx.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      const p = (SIZE / 4) * k;
      octx.beginPath(); octx.moveTo(p, 0); octx.lineTo(p, SIZE); octx.stroke();
      octx.beginPath(); octx.moveTo(0, p); octx.lineTo(SIZE, p); octx.stroke();
    }

    bgImage = off;
  }

  function worldToMap(x, z) {
    const R = biomeRef.worldRadius || 1200;
    return [
      ((x / R) * 0.5 + 0.5) * SIZE,
      ((z / R) * 0.5 + 0.5) * SIZE
    ];
  }

  function mapToWorld(px, py) {
    const R = biomeRef.worldRadius || 1200;
    return [
      ((px / SIZE) * 2 - 1) * R,
      ((py / SIZE) * 2 - 1) * R
    ];
  }

  function ensureFogCanvas() {
    if (fogCanvas) return;
    if (typeof document === 'undefined' || !document.createElement) return;
    fogCanvas = document.createElement('canvas');
    fogCanvas.width = FOG_N;
    fogCanvas.height = FOG_N;
    fogCtx = fogCanvas.getContext ? fogCanvas.getContext('2d') : null;
    if (fogCtx && fogCtx.createImageData) fogImg = fogCtx.createImageData(FOG_N, FOG_N);
  }

  function encodeFog(arr) {
    let s = '';
    for (let i = 0; i < FOG_LEN; i++) s += String(arr[i] || 0);
    return s;
  }

  function decodeFog(str, out) {
    out.fill(0);
    let cnt = 0;
    if (typeof str === 'string' && str.length === FOG_LEN) {
      for (let i = 0; i < FOG_LEN; i++) {
        const v = str.charCodeAt(i) - 48;
        if (v === 1 || v === 2) { out[i] = v; cnt++; }
      }
    }
    return cnt;
  }

  function persistFog(force) {
    if (!biomeRef || !fogGrid || !OC.Expedition || !OC.Expedition.setFogGrid) return;
    const now = Date.now();
    if (!force && now - lastSaveMs < 2400) return;
    lastSaveMs = now;
    OC.Expedition.setFogGrid(biomeRef.id, encodeFog(fogGrid));
  }

  function loadFogForBiome(biome) {
    if (!biome) return;
    let entry = fogByBiome.get(biome.id);
    if (!entry) {
      const grid = new Uint8Array(FOG_LEN);
      let cnt = 0;
      if (OC.Expedition && OC.Expedition.getFogGrid) {
        cnt = decodeFog(OC.Expedition.getFogGrid(biome.id), grid);
      }
      entry = { grid, cnt };
      fogByBiome.set(biome.id, entry);
    }
    fogGrid = entry.grid;
    revealedCells = entry.cnt;
    lastPassiveX = 99999;
    lastPassiveZ = 99999;
    fogDirty = true;
    // Гарантируем открытую стартовую зону вокруг точки погружения
    if (biome.spawn && biome.spawn.pos) {
      stampCircle(biome.spawn.pos[0], biome.spawn.pos[2], 150, 1);
    }
  }

  function syncEntryCount() {
    if (!biomeRef || !fogGrid) return;
    const entry = fogByBiome.get(biomeRef.id);
    if (entry) entry.cnt = revealedCells;
  }

  function stampCircle(wx, wz, radius, level) {
    if (!biomeRef || !fogGrid) return 0;
    const R = biomeRef.worldRadius || 1200;
    const cellW = (2 * R) / FOG_N;
    const cX = ((wx / R) * 0.5 + 0.5) * FOG_N;
    const cZ = ((wz / R) * 0.5 + 0.5) * FOG_N;
    const rCells = Math.ceil(radius / cellW);
    const r2 = (radius / cellW) * (radius / cellW);
    const minI = Math.max(0, Math.floor(cX - rCells));
    const maxI = Math.min(FOG_N - 1, Math.ceil(cX + rCells));
    const minJ = Math.max(0, Math.floor(cZ - rCells));
    const maxJ = Math.min(FOG_N - 1, Math.ceil(cZ + rCells));
    let newlyRevealed = 0;
    let changed = false;

    for (let j = minJ; j <= maxJ; j++) {
      const dz = (j + 0.5) - cZ;
      for (let i = minI; i <= maxI; i++) {
        const dx = (i + 0.5) - cX;
        if (dx * dx + dz * dz <= r2) {
          const idx = j * FOG_N + i;
          if (fogGrid[idx] < level) {
            if (fogGrid[idx] === 0) { revealedCells++; newlyRevealed++; }
            fogGrid[idx] = level;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      fogDirty = true;
      syncEntryCount();
    }
    return newlyRevealed;
  }

  function stampSwath(wx, wz, yaw, radius, halfAngle) {
    if (!biomeRef || !fogGrid) return 0;
    const R = biomeRef.worldRadius || 1200;
    const cellW = (2 * R) / FOG_N;
    const cX = ((wx / R) * 0.5 + 0.5) * FOG_N;
    const cZ = ((wz / R) * 0.5 + 0.5) * FOG_N;
    const rCells = Math.ceil(radius / cellW);
    const r2 = (radius / cellW) * (radius / cellW);
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const cosMin = Math.cos(halfAngle || 0.92);
    const minI = Math.max(0, Math.floor(cX - rCells));
    const maxI = Math.min(FOG_N - 1, Math.ceil(cX + rCells));
    const minJ = Math.max(0, Math.floor(cZ - rCells));
    const maxJ = Math.min(FOG_N - 1, Math.ceil(cZ + rCells));
    let newlyRevealed = 0;
    let changed = false;

    for (let j = minJ; j <= maxJ; j++) {
      const dz = (j + 0.5) - cZ;
      for (let i = minI; i <= maxI; i++) {
        const dx = (i + 0.5) - cX;
        const d2 = dx * dx + dz * dz;
        if (d2 > r2) continue;
        // Ближнее ядро 55 м открывается вокруг аппарата, далее — направленный мультилучевой веер
        const d = Math.sqrt(d2);
        const insideCone = d < (55 / cellW) || ((dx * fx + dz * fz) / Math.max(0.001, d)) >= cosMin;
        if (insideCone) {
          const idx = j * FOG_N + i;
          if (fogGrid[idx] < 2) {
            if (fogGrid[idx] === 0) { revealedCells++; newlyRevealed++; }
            fogGrid[idx] = 2;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      fogDirty = true;
      syncEntryCount();
      persistFog(true);
    }
    return newlyRevealed;
  }

  function isCellRevealed(wx, wz) {
    if (!fogEnabled || !biomeRef || !fogGrid) return true;
    const R = biomeRef.worldRadius || 1200;
    const i = OC.clamp(Math.floor(((wx / R) * 0.5 + 0.5) * FOG_N), 0, FOG_N - 1);
    const j = OC.clamp(Math.floor(((wz / R) * 0.5 + 0.5) * FOG_N), 0, FOG_N - 1);
    return fogGrid[j * FOG_N + i] > 0;
  }

  function redrawFogCanvas() {
    ensureFogCanvas();
    if (!fogCtx || !fogImg || !fogGrid) return;
    const d = fogImg.data;
    for (let i = 0; i < FOG_LEN; i++) {
      const v = fogGrid[i];
      const p = i * 4;
      d[p] = 4;
      d[p + 1] = 13;
      d[p + 2] = 26;
      // 0: плотный туман неисследованного океана, 1: полу-ясная пассивная разведка, 2: кристально чистый скан сонара
      d[p + 3] = v === 0 ? 226 : (v === 1 ? 26 : 0);
    }
    fogCtx.putImageData(fogImg, 0, 0);
    fogDirty = false;
  }

  OC.Minimap = {
    init(canvasEl, biome, onTeleport, onWaypoint) {
      canvas = canvasEl;
      if (!canvas) return;
      canvas.width = SIZE;
      canvas.height = SIZE;
      ctx = canvas.getContext('2d');
      biomeRef = biome;
      renderBathymetry();
      loadFogForBiome(biome);

      function toggleWaypointAt(px, py) {
        if (!OC.Expedition || !biomeRef) return;
        const curWp = OC.Expedition.getWaypoint(biomeRef.id);
        if (curWp) {
          const [wpx, wpy] = worldToMap(curWp.x, curWp.z);
          if (Math.hypot(wpx - px, wpy - py) < 12) {
            OC.Expedition.clearWaypoint(biomeRef.id);
            if (onWaypoint) onWaypoint(null);
            return;
          }
        }
        for (const lm of biomeRef.landmarks) {
          const mp = worldToMap(lm.x, lm.z);
          if (Math.hypot(mp[0] - px, mp[1] - py) < 11) {
            const wp = OC.Expedition.setWaypoint(biomeRef.id, lm.x, lm.z, lm.name);
            if (onWaypoint) onWaypoint(wp);
            return;
          }
        }
        const [wx, wz] = mapToWorld(px, py);
        const z = biomeRef.getZoneAt(wx, biomeRef.getHeight(wx, wz) + 2, wz);
        const wp = OC.Expedition.setWaypoint(biomeRef.id, wx, wz, z ? z.shortName : 'Метка');
        if (onWaypoint) onWaypoint(wp);
      }

      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * SIZE;
        const py = ((e.clientY - rect.top) / rect.height) * SIZE;

        if (e.shiftKey) {
          toggleWaypointAt(px, py);
          return;
        }

        // Проверяем клик по судну НИС на поверхности
        const vInfo = OC.faunaInfo ? OC.faunaInfo.vessel : null;
        if (vInfo) {
          const vp = worldToMap(vInfo.x, vInfo.z);
          if (Math.hypot(vp[0] - px, vp[1] - py) < 10) {
            if (onTeleport) onTeleport(vInfo.deckPos[0], vInfo.deckPos[1], vInfo.deckPos[2], vInfo.deckYaw, -0.09, vInfo.name);
            return;
          }
        }

        // Проверяем клик по ориентиру (landmark)
        for (const lm of biomeRef.landmarks) {
          const mp = worldToMap(lm.x, lm.z);
          if (Math.hypot(mp[0] - px, mp[1] - py) < 10) {
            stampCircle(lm.x, lm.z, 130, 1);
            if (onTeleport) onTeleport(lm.x, lm.y, lm.z, lm.yaw, lm.pitch, lm.name);
            return;
          }
        }
        const [wx, wz] = mapToWorld(px, py);
        const fl = biomeRef.getHeight(wx, wz);
        const targetY = Math.min(-3.0, Math.max(fl + 5.5, -28));
        stampCircle(wx, wz, 130, 1);
        if (onTeleport) onTeleport(wx, targetY, wz, undefined, -0.14, null);
      });

      canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * SIZE;
        const py = ((e.clientY - rect.top) / rect.height) * SIZE;
        toggleWaypointAt(px, py);
      });
    },

    triggerPing(x, z) {
      pingState = { x, z, startMs: Date.now() };
    },

    revealRadius(x, z, radius) {
      return stampCircle(x, z, radius || 120, 1);
    },

    revealSwath(x, z, yaw, radius, halfAngle) {
      return stampSwath(x, z, yaw, radius || 195, halfAngle || 0.92);
    },

    getCoverage() {
      return Math.round((revealedCells / FOG_LEN) * 100);
    },

    setFogEnabled(on) {
      fogEnabled = !!on;
    },

    isFogEnabled() {
      return fogEnabled;
    },

    resetFog(biomeId) {
      if (biomeId) fogByBiome.delete(biomeId);
      else fogByBiome.clear();
      if (OC.Expedition && OC.Expedition.clearFogGrid) OC.Expedition.clearFogGrid(biomeId);
      if (biomeRef) loadFogForBiome(biomeRef);
    },

    setBiome(biome) {
      biomeRef = biome;
      pingState = null;
      if (canvas) renderBathymetry();
      loadFogForBiome(biome);
    },

    update(camPos, yaw) {
      if (!ctx || !bgImage || !biomeRef) return;

      // Пассивное картографирование окружающей области при плавании
      if (Math.hypot(camPos.x - lastPassiveX, camPos.z - lastPassiveZ) > 14) {
        lastPassiveX = camPos.x;
        lastPassiveZ = camPos.z;
        if (stampCircle(camPos.x, camPos.z, 118, 1) > 0) {
          persistFog(false);
        }
      }

      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(bgImage, 0, 0);

      // Слой тумана войны ("Картография экспедиции")
      if (fogEnabled) {
        if (fogDirty) redrawFogCanvas();
        if (fogCanvas) {
          ctx.save();
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(fogCanvas, 0, 0, SIZE, SIZE);
          ctx.restore();
        }
      }

      // Активный импульс сонара на карте
      if (pingState) {
        const age = (Date.now() - pingState.startMs) / 1000;
        if (age > 2.2) {
          pingState = null;
        } else {
          const [px, pz] = worldToMap(pingState.x, pingState.z);
          const prog = age / 2.2;
          const r = 4 + prog * 46;
          ctx.save();
          ctx.strokeStyle = 'rgba(88,224,255,' + ((1 - prog) * 0.85).toFixed(2) + ')';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(px, pz, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Ориентиры (полностью яркие на открытой карте, слабый радиомаячок в тумане)
      for (const lm of biomeRef.landmarks) {
        const [mx, my] = worldToMap(lm.x, lm.z);
        const rev = isCellRevealed(lm.x, lm.z);
        if (rev) {
          ctx.fillStyle = lm.id === 'blue_hole' || lm.id === 'canyon_abyss' ? '#38b6ff' : (lm.isHot ? '#ff7d45' : '#ffd17a');
          ctx.beginPath();
          ctx.arc(mx, my, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(2,14,28,0.85)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(255, 209, 122, 0.36)';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(mx, my, 2.8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Надводное экспедиционное судно НИС (если есть в биоме)
      const vInfo = OC.faunaInfo ? OC.faunaInfo.vessel : null;
      if (vInfo) {
        const [vx, vz] = worldToMap(vInfo.x, vInfo.z);
        ctx.save();
        ctx.translate(vx, vz);
        ctx.rotate(-vInfo.yaw + Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ff6b4a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(3.2, -1.5);
        ctx.lineTo(3.0, 5.5);
        ctx.lineTo(-3.0, 5.5);
        ctx.lineTo(-3.2, -1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Конус обзора и позиция камеры
      const [cx, cz] = worldToMap(camPos.x, camPos.z);

      // Активный навигационный маячок (Waypoint) и пунктирный курс к нему
      const wp = OC.Expedition && OC.Expedition.getWaypoint ? OC.Expedition.getWaypoint(biomeRef.id) : null;
      if (wp) {
        const [wx, wz] = worldToMap(wp.x, wp.z);
        ctx.save();
        ctx.strokeStyle = 'rgba(91, 232, 176, 0.65)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cz);
        ctx.lineTo(wx, wz);
        ctx.stroke();
        ctx.setLineDash([]);

        const pulse = 5 + Math.sin(Date.now() * 0.006) * 2.2;
        ctx.strokeStyle = 'rgba(91, 232, 176, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(wx, wz, pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#5be8b0';
        ctx.beginPath();
        ctx.arc(wx, wz, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Автономные буи-гидрофоны ROV на карте
      if (OC.ROV && OC.ROV.getBuoys) {
        const buoys = OC.ROV.getBuoys();
        for (let i = 0; i < buoys.length; i++) {
          const b = buoys[i];
          if (!b || (biomeRef && b.biomeId !== biomeRef.id)) continue;
          const [bx, bz] = worldToMap(b.x, b.z);
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 209, 122, 0.78)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(bx, bz, 5.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#58e0ff';
          ctx.beginPath();
          ctx.moveTo(bx, bz - 3.6);
          ctx.lineTo(bx + 3.4, bz);
          ctx.lineTo(bx, bz + 3.6);
          ctx.lineTo(bx - 3.4, bz);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.save();
      ctx.translate(cx, cz);
      // В Three.js forward = (sin(yaw), cos(yaw)), на карте X вправо, Z вниз
      const mapAngle = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      ctx.rotate(-mapAngle + Math.PI);

      // Конус обзора
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      grad.addColorStop(0, 'rgba(88,224,255,0.45)');
      grad.addColorStop(1, 'rgba(88,224,255,0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 26, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
      ctx.closePath();
      ctx.fill();

      // Стрелка игрока
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#062033';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.2, 4.5);
      ctx.lineTo(0, 2.2);
      ctx.lineTo(-4.2, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };
})(window.OC);
