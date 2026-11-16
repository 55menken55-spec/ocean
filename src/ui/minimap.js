/* ================= БАТИМЕТРИЧЕСКАЯ МИНИ-КАРТА И ТЕЛЕПОРТ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  let canvas = null;
  let ctx = null;
  let biomeRef = null;
  let pingState = null; // { x, z, startMs }
  const SIZE = 184;
  /* Размер окна карты: ±viewRadius вокруг центра окна. В мире без края центр
     едет за игроком, поэтому «весь мир» на карте не помещается — карта всегда
     показывает окрестность аппарата, как в навигаторе. */
  const viewRadius = 1200;
  const MAP_RECENTER = 300;   // сдвигать окно, когда игрок ушёл дальше (м)
  const MAP_FILL_BUDGET_MS = 3.0; // сколько миллисекунд в кадр тратить на дорисовку карты
  const FOG_N = 64;           // пикселей тумана на окно карты
  /* Туман войны больше не одна сетка на весь мир: мир без края, и клетки
     хранятся разрежённо — чанками карты. Ячейка осталась прежней (37.5 м),
     просто чанк покрывает 1200 м, а сетка чанка — 32×32. */
  const FOG_CHUNK = 1200;
  const FOG_CN = 32;
  const FOG_CELL = FOG_CHUNK / FOG_CN; // 37.5 м
  const FOG_CELLS = FOG_CN * FOG_CN;
  const MAX_FOG_CHUNKS = 512;          // 512 × 1 КБ = 512 КБ на биом
  const FOG_SAVE_CHUNKS = 32;          // столько чанков уходит в localStorage
  const HEX = '0123456789abcdef';      // упаковка 4 клеток (2 бита) в один байт
  const fogByBiome = new Map();
  let fogEntry = null;    // { chunks: Map<"cx,cz", {grid, t}>, cnt }
  let fogEnabled = true;
  let fogCanvas = null;
  let fogCtx = null;
  let fogImg = null;
  let fogDirty = true;
  let revealedCells = 0;
  let lastPassiveX = 99999;
  let lastPassiveZ = 99999;
  let lastSaveMs = 0;
  let fogClock = 0;       // счётчик обращений для LRU чанков
  let covCacheKey = -1;   // кэш процента: пересчёт только при новых клетках
  let covCacheVal = 0;
  let covCacheBiome = null;

  // Центр окна карты (мировые координаты) — едет за игроком
  let mapCx = 0;
  let mapCz = 0;

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
    if (theme === 'baikal') {
      if (y > -8) return [103, 191, 171];       // прибрежные террасы и бухты
      if (y > -45) return [62, 156, 157];      // харовые луга и губочные сады
      if (y > -260) return [42, 124, 158];     // верх рифтового склона
      if (y > -700) return [31, 80, 137];     // ступени Большого рифта
      if (y > -1250) return [21, 48, 105];    // глубокая котловина
      return [10, 22, 62];                    // ось Байкальской бездны
    }
    if (theme === 'europa') {
      if (y > -54) return [146, 198, 226];  // ледяные купола панциря и верх хребта
      if (y > -68) return [78, 152, 186];   // криолес на склонах хребта
      if (y > -84) return [122, 112, 112];  // серпентинитовые трубы и тёплые поля
      if (y > -102) return [46, 60, 94];    // базальтовая равнина
      return [22, 32, 62];                  // глубокая океаническая котловина Европы
    }
    if (theme === 'titan') {
      if (y > 0.05) return [214, 201, 168];  // берег водяного льда и галечник толинов
      if (y > -8) return [176, 128, 68];     // прибойная полоса Кракенова моря
      if (y > -45) return [136, 96, 50];     // шельф с органическим илом
      if (y > -95) return [104, 70, 36];     // эстуарий Морей-Синус и бровка
      if (y > -180) return [70, 48, 26];     // континентальный склон
      return [40, 27, 15];                   // котловина Кракена
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

  /* Мир без края: карта показывает окно ±viewRadius вокруг mapCx/mapCz, а не
     весь круг ядра. Координаты считаются от центра окна, поэтому телепорт и
     вехи работают на любом удалении от точки старта. */
  function worldToMap(x, z) {
    return [
      (((x - mapCx) / viewRadius) * 0.5 + 0.5) * SIZE,
      (((z - mapCz) / viewRadius) * 0.5 + 0.5) * SIZE
    ];
  }

  function mapToWorld(px, py) {
    return [
      ((px / SIZE) * 2 - 1) * viewRadius + mapCx,
      ((py / SIZE) * 2 - 1) * viewRadius + mapCz
    ];
  }

  /* ---- Батиметрия: скроллящееся окно вокруг аппарата ----
     Считать всё окно целиком — это SIZE² вызовов getHeight, то есть сотни
     миллисекунд на кадр. OC.GridWindow переезжает готовыми пикселями и
     досчитывает только открывшуюся полосу, порциями по бюджету времени. */
  let bathyWin = null;
  let bathyCanvas = null;
  let bathyCtx = null;
  let bathyImg = null;

  function ensureBathyCanvas() {
    if (bathyCanvas) return true;
    if (typeof document === 'undefined' || !document.createElement) return false;
    bathyCanvas = document.createElement('canvas');
    bathyCanvas.width = SIZE;
    bathyCanvas.height = SIZE;
    bathyCtx = bathyCanvas.getContext('2d');
    if (bathyCtx && bathyCtx.createImageData) bathyImg = bathyCtx.createImageData(SIZE, SIZE);
    return !!(bathyCtx && bathyImg);
  }

  function bathyFillRow(data, j, i0, i1, cx, cz, cell) {
    const half = SIZE / 2;
    const wz = cz + (j + 0.5 - half) * cell;
    for (let i = i0; i < i1; i++) {
      const wx = cx + (i + 0.5 - half) * cell;
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
      const idx = (j * SIZE + i) * 4;
      data[idx] = Math.min(255, rgb[0] * contour);
      data[idx + 1] = Math.min(255, rgb[1] * contour);
      data[idx + 2] = Math.min(255, rgb[2] * contour);
      data[idx + 3] = 255;
    }
  }

  function ensureBathyWindow(centerX, centerZ) {
    if (!biomeRef || !OC.GridWindow || !ensureBathyCanvas()) return null;
    if (!bathyWin) {
      bathyWin = OC.GridWindow.create({
        size: SIZE,
        span: viewRadius * 2,
        fillRow: bathyFillRow,
        unknown: [7, 17, 30, 255] // «необследованная вода» на краю окна
      });
    } else {
      bathyWin.clear();
    }
    bathyWin.resetCenter(centerX, centerZ);
    /* Первый кадр биома считаем целиком: это та же стоимость, что и раньше при
       смене биома, зато карта сразу готова. Дальше досчитываются только полосы. */
    bathyWin.flush();
    uploadBathy();
    mapCx = bathyWin.centerX();
    mapCz = bathyWin.centerZ();
    return bathyWin;
  }

  /* Векторный слой поверх батиметрии: сетка координат и ходовые нити
     Ариадны. Раньше он впечатывался в растр, но растр теперь живёт и
     прокручивается между перерисовками, поэтому линии рисуются каждый кадр. */
  function drawMapOverlay(c) {
    // Ходовые нити Ариадны в пещерном биоме
    if (biomeRef.ariadnePaths && biomeRef.ariadnePaths.length) {
      c.save();
      c.strokeStyle = 'rgba(255, 168, 46, 0.85)';
      c.lineWidth = 1.6;
      c.setLineDash([3, 2]);
      for (const path of biomeRef.ariadnePaths) {
        c.beginPath();
        for (let i = 0; i < path.length; i++) {
          const mp = worldToMap(path[i][0], path[i][2]);
          if (i === 0) c.moveTo(mp[0], mp[1]);
          else c.lineTo(mp[0], mp[1]);
        }
        c.stroke();
      }
      c.restore();
    }

    // Сетка координат
    c.strokeStyle = 'rgba(180,235,255,0.08)';
    c.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      const p = (SIZE / 4) * k;
      c.beginPath(); c.moveTo(p, 0); c.lineTo(p, SIZE); c.stroke();
      c.beginPath(); c.moveTo(0, p); c.lineTo(SIZE, p); c.stroke();
    }
  }

  /* Выгрузить посчитанные пиксели в канвас карты. */
  function uploadBathy() {
    if (!bathyWin || !bathyImg) return false;
    if (!bathyWin.consumeChanged()) return false;
    bathyImg.data.set(bathyWin.data);
    bathyCtx.putImageData(bathyImg, 0, 0);
    return true;
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

  const fogKey = (cx, cz) => cx + ',' + cz;

  /* Чанк тумана создаётся лениво: мир бесконечен, и держать сетку на весь мир
     нельзя. При переполнении вытесняются давно не использованные чанки — их
     содержимое теряется только если игрок ушёл очень далеко надолго. */
  function getFogChunk(cx, cz, create) {
    if (!fogEntry) return null;
    const k = fogKey(cx, cz);
    let rec = fogEntry.chunks.get(k);
    if (rec) return rec;
    if (!create) return null;
    if (fogEntry.chunks.size >= MAX_FOG_CHUNKS) {
      let oldestKey = null;
      let oldestT = Infinity;
      fogEntry.chunks.forEach((r, key) => {
        if (r.t < oldestT) { oldestT = r.t; oldestKey = key; }
      });
      if (oldestKey) fogEntry.chunks.delete(oldestKey);
    }
    rec = { grid: new Uint8Array(FOG_CELLS), t: ++fogClock };
    fogEntry.chunks.set(k, rec);
    return rec;
  }

  /* Формат: "v3|cx,cz,<512 hex-символов>;..." — чанк карты упакован по 4
     клетки в байт (2 бита на клетку), то есть 512 символов вместо 1024.
     В мире без края исследованных чанков сколько угодно, поэтому хранятся
     только самые свежие FOG_SAVE_CHUNKS штук, а остальное живёт в памяти. */
  function encodeChunk(rec) {
    let out = '';
    for (let i = 0; i < FOG_CELLS; i += 4) {
      const b = (rec.grid[i] & 3)
        | ((rec.grid[i + 1] & 3) << 2)
        | ((rec.grid[i + 2] & 3) << 4)
        | ((rec.grid[i + 3] & 3) << 6);
      out += HEX[(b >> 4) & 15] + HEX[b & 15];
    }
    return out;
  }

  function decodeChunk(data, rec) {
    let cnt = 0;
    for (let i = 0, n = 0; i < data.length - 1; i += 2, n += 4) {
      const hi = parseInt(data[i], 16);
      const lo = parseInt(data[i + 1], 16);
      if (!Number.isFinite(hi) || !Number.isFinite(lo)) return cnt;
      const b = (hi << 4) | lo;
      for (let k = 0; k < 4; k++) {
        const v = (b >> (k * 2)) & 3;
        if (v === 1 || v === 2) { rec.grid[n + k] = v; cnt++; }
      }
    }
    return cnt;
  }

  function encodeFog() {
    if (!fogEntry) return 'v3|';
    const list = Array.from(fogEntry.chunks.entries());
    list.sort((a, b) => b[1].t - a[1].t);
    const take = list.slice(0, FOG_SAVE_CHUNKS);
    let out = 'v3|';
    for (let n = 0; n < take.length; n++) {
      const [key, rec] = take[n];
      let any = false;
      for (let i = 0; i < FOG_CELLS; i++) { if (rec.grid[i]) { any = true; break; } }
      if (!any) continue; // пустой чанк не храним
      out += key + ',' + encodeChunk(rec) + ';';
    }
    return out;
  }

  function decodeFog(str) {
    if (!fogEntry) return 0;
    if (typeof str !== 'string' || str.indexOf('v3|') !== 0) return 0;
    let cnt = 0;
    const parts = str.slice(3).split(';');
    for (let p = 0; p < parts.length; p++) {
      if (!parts[p]) continue;
      // Ключ — это два индекса через запятую, а сами данные запятых не несут
      const c1 = parts[p].indexOf(',');
      const c2 = c1 < 0 ? -1 : parts[p].indexOf(',', c1 + 1);
      if (c1 < 0 || c2 < 0) continue;
      const cx = parseInt(parts[p].slice(0, c1), 10);
      const cz = parseInt(parts[p].slice(c1 + 1, c2), 10);
      const data = parts[p].slice(c2 + 1);
      if (data.length !== (FOG_CELLS / 4) * 2) continue;
      if (!Number.isFinite(cx) || !Number.isFinite(cz)) continue;
      const rec = getFogChunk(cx, cz, true);
      if (!rec) continue;
      cnt += decodeChunk(data, rec);
    }
    return cnt;
  }

  function persistFog(force) {
    if (!biomeRef || !fogEntry || !OC.Expedition || !OC.Expedition.setFogGrid) return;
    const now = Date.now();
    if (!force && now - lastSaveMs < 2400) return;
    lastSaveMs = now;
    OC.Expedition.setFogGrid(biomeRef.id, encodeFog());
  }

  function loadFogForBiome(biome) {
    if (!biome) return;
    let entry = fogByBiome.get(biome.id);
    if (!entry) {
      entry = { chunks: new Map(), cnt: 0 };
      fogByBiome.set(biome.id, entry);
    }
    fogEntry = entry;
    if (entry.cnt === 0 && OC.Expedition && OC.Expedition.getFogGrid) {
      entry.cnt = decodeFog(OC.Expedition.getFogGrid(biome.id));
    }
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
    if (!fogEntry) return;
    fogEntry.cnt = revealedCells;
  }

  /* Штамп в мировых координатах: проходит по всем чанкам, которых касается
     круг, и пишет в локальные сетки. За пределами одного чанка код тот же,
     что и раньше, — изменилась только адресация. */
  function stampCircle(wx, wz, radius, level) {
    if (!biomeRef || !fogEntry) return 0;
    const cMinX = Math.floor((wx - radius) / FOG_CHUNK);
    const cMaxX = Math.floor((wx + radius) / FOG_CHUNK);
    const cMinZ = Math.floor((wz - radius) / FOG_CHUNK);
    const cMaxZ = Math.floor((wz + radius) / FOG_CHUNK);
    const rCells = radius / FOG_CELL;
    const r2 = rCells * rCells;
    let newlyRevealed = 0;
    let changed = false;

    for (let cz = cMinZ; cz <= cMaxZ; cz++) {
      for (let cx = cMinX; cx <= cMaxX; cx++) {
        const rec = getFogChunk(cx, cz, true);
        if (!rec) continue;
        rec.t = ++fogClock;
        const grid = rec.grid;
        const cX = (wx - cx * FOG_CHUNK) / FOG_CELL;
        const cZ = (wz - cz * FOG_CHUNK) / FOG_CELL;
        const minI = Math.max(0, Math.floor(cX - rCells));
        const maxI = Math.min(FOG_CN - 1, Math.ceil(cX + rCells));
        const minJ = Math.max(0, Math.floor(cZ - rCells));
        const maxJ = Math.min(FOG_CN - 1, Math.ceil(cZ + rCells));
        for (let j = minJ; j <= maxJ; j++) {
          const dz = (j + 0.5) - cZ;
          for (let i = minI; i <= maxI; i++) {
            const dx = (i + 0.5) - cX;
            if (dx * dx + dz * dz > r2) continue;
            const idx = j * FOG_CN + i;
            if (grid[idx] < level) {
              if (grid[idx] === 0) { revealedCells++; newlyRevealed++; }
              grid[idx] = level;
              changed = true;
            }
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

  /* Мультилучевой веер сонара: ближнее ядро 55 м плюс направленный конус. */
  function stampSwath(wx, wz, yaw, radius, halfAngle) {
    if (!biomeRef || !fogEntry) return 0;
    const cMinX = Math.floor((wx - radius) / FOG_CHUNK);
    const cMaxX = Math.floor((wx + radius) / FOG_CHUNK);
    const cMinZ = Math.floor((wz - radius) / FOG_CHUNK);
    const cMaxZ = Math.floor((wz + radius) / FOG_CHUNK);
    const rCells = radius / FOG_CELL;
    const r2 = rCells * rCells;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const cosMin = Math.cos(halfAngle || 0.92);
    let newlyRevealed = 0;
    let changed = false;

    for (let cz = cMinZ; cz <= cMaxZ; cz++) {
      for (let cx = cMinX; cx <= cMaxX; cx++) {
        const rec = getFogChunk(cx, cz, true);
        if (!rec) continue;
        rec.t = ++fogClock;
        const grid = rec.grid;
        const cX = (wx - cx * FOG_CHUNK) / FOG_CELL;
        const cZ = (wz - cz * FOG_CHUNK) / FOG_CELL;
        const minI = Math.max(0, Math.floor(cX - rCells));
        const maxI = Math.min(FOG_CN - 1, Math.ceil(cX + rCells));
        const minJ = Math.max(0, Math.floor(cZ - rCells));
        const maxJ = Math.min(FOG_CN - 1, Math.ceil(cZ + rCells));
        for (let j = minJ; j <= maxJ; j++) {
          const dz = (j + 0.5) - cZ;
          for (let i = minI; i <= maxI; i++) {
            const dx = (i + 0.5) - cX;
            const d2 = dx * dx + dz * dz;
            if (d2 > r2) continue;
            const d = Math.sqrt(d2);
            const insideCone = d < (55 / FOG_CELL) || ((dx * fx + dz * fz) / Math.max(0.001, d)) >= cosMin;
            if (!insideCone) continue;
            const idx = j * FOG_CN + i;
            if (grid[idx] < 2) {
              if (grid[idx] === 0) { revealedCells++; newlyRevealed++; }
              grid[idx] = 2;
              changed = true;
            }
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

  /* Значение клетки в мировых координатах: 0 — туман, 1 — пассивная разведка,
     2 — чистый скан сонара. Чанк создаётся лениво, поэтому «ещё не бывали»
     и «ещё не открыли» — одно и то же состояние. */
  function fogValueAt(wx, wz) {
    if (!biomeRef || !fogEntry) return 0;
    const cx = Math.floor(wx / FOG_CHUNK);
    const cz = Math.floor(wz / FOG_CHUNK);
    const rec = getFogChunk(cx, cz, false);
    if (!rec) return 0;
    const i = OC.clamp(Math.floor((wx - cx * FOG_CHUNK) / FOG_CELL), 0, FOG_CN - 1);
    const j = OC.clamp(Math.floor((wz - cz * FOG_CHUNK) / FOG_CELL), 0, FOG_CN - 1);
    return rec.grid[j * FOG_CN + i];
  }

  function isCellRevealed(wx, wz) {
    if (!fogEnabled || !biomeRef || !fogEntry) return true;
    return fogValueAt(wx, wz) > 0;
  }

  /* Слой тумана собирается по пикселям текущего окна карты: для каждого
     пикселя считаются мировые координаты и читается свой чанк. Окно 2400 м
     при 64×64 даёт ту же детальность, что и прежняя карта на весь мир. */
  function redrawFogCanvas() {
    ensureFogCanvas();
    if (!fogCtx || !fogImg || !fogEntry) return;
    const d = fogImg.data;
    const cell = (viewRadius * 2) / FOG_N;
    const x0 = mapCx - viewRadius;
    const z0 = mapCz - viewRadius;
    for (let j = 0; j < FOG_N; j++) {
      const wz = z0 + (j + 0.5) * cell;
      for (let i = 0; i < FOG_N; i++) {
        const wx = x0 + (i + 0.5) * cell;
        const p = (j * FOG_N + i) * 4;
        const v = fogValueAt(wx, wz);
        d[p] = 4; d[p + 1] = 13; d[p + 2] = 26;
        // 0: плотный туман неисследованного океана, 1: полу-ясная пассивная
        // разведка, 2: кристально чистый скан сонара
        d[p + 3] = v === 0 ? 226 : (v === 1 ? 26 : 0);
      }
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
      const sp = (biome && biome.spawn && biome.spawn.pos) ? biome.spawn.pos : [0, 0, 0];
      ensureBathyWindow(sp[0], sp[2]);
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

    /* Процент исследованности считается по ядру карты (круг worldRadius, где
       стоят маяки и миссии): внешний мир бесконечен, и доля «от всего мира»
       для него всегда была бы нулём. */
    getCoverage() {
      if (!biomeRef || !fogEntry) return 0;
      if (covCacheKey === revealedCells && covCacheBiome === biomeRef.id) return covCacheVal;
      const R = biomeRef.worldRadius || 1200;
      const total = (Math.PI * R * R) / (FOG_CELL * FOG_CELL);
      const cMinX = Math.floor(-R / FOG_CHUNK), cMaxX = Math.floor(R / FOG_CHUNK);
      const cMinZ = Math.floor(-R / FOG_CHUNK), cMaxZ = Math.floor(R / FOG_CHUNK);
      let cnt = 0;
      for (let cz = cMinZ; cz <= cMaxZ; cz++) {
        for (let cx = cMinX; cx <= cMaxX; cx++) {
          const rec = getFogChunk(cx, cz, false);
          if (!rec) continue;
          for (let j = 0; j < FOG_CN; j++) {
            const wz = cz * FOG_CHUNK + (j + 0.5) * FOG_CELL;
            for (let i = 0; i < FOG_CN; i++) {
              if (!rec.grid[j * FOG_CN + i]) continue;
              const wx = cx * FOG_CHUNK + (i + 0.5) * FOG_CELL;
              if (wx * wx + wz * wz <= R * R) cnt++;
            }
          }
        }
      }
      covCacheVal = Math.max(0, Math.min(100, Math.round((cnt / total) * 100)));
      covCacheKey = revealedCells;
      covCacheBiome = biomeRef.id;
      return covCacheVal;
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
      covCacheKey = -1;
      if (OC.Expedition && OC.Expedition.clearFogGrid) OC.Expedition.clearFogGrid(biomeId);
      if (biomeRef) loadFogForBiome(biomeRef);
    },

    setBiome(biome) {
      biomeRef = biome;
      pingState = null;
      covCacheKey = -1;
      fogDirty = true;
      const sp = (biome && biome.spawn && biome.spawn.pos) ? biome.spawn.pos : [0, 0, 0];
      ensureBathyWindow(sp[0], sp[2]);
      loadFogForBiome(biome);
    },

    /* Центр окна карты — для тестов и отладки */
    getViewCenter() {
      return { x: mapCx, z: mapCz, radius: viewRadius };
    },

    /* Открыта ли точка карты (для тестов и подсказок миссий) */
    isRevealed(x, z) {
      return isCellRevealed(x, z);
    },

    /* Готова ли батиметрия окна (для тестов) */
    isMapComplete() {
      return !bathyWin || bathyWin.isComplete();
    },

    samplePixel(x, z) {
      return bathyWin ? bathyWin.pixelAt(x, z) : null;
    },


    update(camPos, yaw) {
      if (!ctx || !biomeRef) return;
      if (!bathyWin) {
        ensureBathyWindow(camPos.x, camPos.z);
        if (!bathyWin) return;
      }

      /* Окно карты едет за аппаратом: в мире без края карта всегда показывает
         окрестность игрока, а не фиксированный круг старта. Готовые пиксели
         переезжают на новые места, открывшаяся полоса досчитывается порциями,
         чтобы карта не стоила сотен миллисекунд на кадр. */
      if (Math.hypot(camPos.x - mapCx, camPos.z - mapCz) > MAP_RECENTER) {
        bathyWin.setCenter(camPos.x, camPos.z);
        mapCx = bathyWin.centerX();
        mapCz = bathyWin.centerZ();
        fogDirty = true;
      }
      /* Бюджет на дорисовку: пока открылась только полоса, хватает двух
         миллисекунд; после телепорта окно пустое и можно тратить больше —
         карта всё равно обновляется несколько раз в секунду. */
      const fillBudget = bathyWin.pendingRows() > SIZE / 2 ? MAP_FILL_BUDGET_MS * 3 : MAP_FILL_BUDGET_MS;
      bathyWin.tick(fillBudget);
      uploadBathy();

      // Пассивное картографирование окружающей области при плавании
      if (Math.hypot(camPos.x - lastPassiveX, camPos.z - lastPassiveZ) > 14) {
        lastPassiveX = camPos.x;
        lastPassiveZ = camPos.z;
        if (stampCircle(camPos.x, camPos.z, 118, 1) > 0) {
          persistFog(false);
        }
      }

      ctx.clearRect(0, 0, SIZE, SIZE);
      if (bathyCanvas) ctx.drawImage(bathyCanvas, 0, 0);
      drawMapOverlay(ctx);

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
