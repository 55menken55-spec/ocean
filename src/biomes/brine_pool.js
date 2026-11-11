/* ================= БИОМ: СОЛЯНОЙ БАССЕЙН И СУМЕРЕЧНАЯ ПЕЛАГИАЛЬ (МЕКСИКАНСКИЙ ЗАЛИВ · 650 М) ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const _colA = new T.Color();
  const _colB = new T.Color();
  const _colC = new T.Color();
  const _fogCol = new T.Color();
  const _waterCol = new T.Color();
  const _skyTop = new T.Color();
  const _skyBot = new T.Color();
  const _aboveHoriz = new T.Color();

  // Сдвиг глубины континентального склона Луизианы: -10 м -> 620 м, -82 м -> 692 м (~68 атм)
  const DEPTH_OFFSET = 610;

  // Два подводных соляных озера со сверхплотным рассолом (~230‰, плотность 1.22 г/см3)
  const MAIN_POOL = { id: 'despair_basin', x: 0, z: -24, r: 68, level: -62.0, floorDepth: -73.0 };
  const ORCA_POOL = { id: 'orca_cascade', x: -205, z: 175, r: 44, level: -48.0, floorDepth: -57.0 };

  const HYDRATE_MOUNDS = [
    { x: 92, z: -96, r: 42 },
    { x: -96, z: 46, r: 38 },
    { x: -145, z: 145, r: 34 }
  ];

  const DIAPIR_DOMES = [
    { x: 245, z: -215, r: 120, peakH: -21.0 },
    { x: -285, z: -135, r: 110, peakH: -23.0 }
  ];

  const ZONES = [
    {
      id: 'brine_lake',
      name: 'Соляной бассейн Отчаяния (Brine Pool)',
      shortName: 'Соляное озеро',
      color: '#45f2c8',
      depthLabel: '658 – 682 м',
      tempC: 7.4,
      description: 'Сверхсолёное подводное озеро рассола (230‰) с чётким зеркалом галоклина, волнами и архимедовой выталкивающей силой.'
    },
    {
      id: 'mussel_shore',
      name: 'Мидиевые берега и Газовые гидраты',
      shortName: 'Мидиевый берег',
      color: '#f2b84b',
      depthLabel: '648 – 676 м',
      tempC: 6.8,
      description: 'Береговой вал соляного озера, покрытый плотными колониями мидий Bathymodiolus, червями Lamellibrachia и друзами метанового гидрата.'
    },
    {
      id: 'salt_terrace',
      name: 'Соляные диапиры и Каскад Орка',
      shortName: 'Соляные уступы',
      color: '#9ee8ff',
      depthLabel: '630 – 666 м',
      tempC: 6.4,
      description: 'Тектонические купола юрской каменной соли с кристаллическими шпилями галита и верхним каскадным соляным бассейном Орка.'
    },
    {
      id: 'twilight_pelagic',
      name: 'Сумеречная пелагиаль (Мезопелагиаль)',
      shortName: 'Сумеречная толща',
      color: '#6e7eff',
      depthLabel: '612 – 695 м',
      tempC: 5.9,
      description: 'Прозрачная мезопелагиаль Мексиканского залива, где днём сверху пробиваются остатки синего света, а ночью мигрируют миктофиды и гигантские сифонофоры.'
    }
  ];

  function wavyPoolRadius(baseR, ang) {
    return baseR * (1.0 + 0.12 * Math.sin(ang * 3.0 + 0.6) + 0.07 * Math.cos(ang * 5.0 - 0.4));
  }

  function getBrineSurfaceAt(x, z) {
    const pools = [MAIN_POOL, ORCA_POOL];
    for (let i = 0; i < pools.length; i++) {
      const p = pools[i];
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > p.r * 1.25) continue;
      const ang = Math.atan2(dz, dx);
      const rad = wavyPoolRadius(p.r, ang);
      if (d <= rad) {
        return { id: p.id, level: p.level, radius: rad, shoreDist: rad - d };
      }
    }
    return null;
  }

  function poolShoreMetrics(x, z, pool) {
    const dx = x - pool.x;
    const dz = z - pool.z;
    const d = Math.hypot(dx, dz);
    const ang = Math.atan2(dz, dx);
    const rad = wavyPoolRadius(pool.r, ang);
    return { d, rad, signed: d - rad }; // < 0 внутри озера, > 0 снаружи
  }

  function nearestHydrateDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < HYDRATE_MOUNDS.length; i++) {
      const d = Math.hypot(x - HYDRATE_MOUNDS[i].x, z - HYDRATE_MOUNDS[i].z);
      if (d < best) best = d;
    }
    return best;
  }

  function nearestDiapirDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < DIAPIR_DOMES.length; i++) {
      const d = Math.hypot(x - DIAPIR_DOMES[i].x, z - DIAPIR_DOMES[i].z);
      if (d < best) best = d;
    }
    return best;
  }

  function getHeight(x, z) {
    // Пологий континентальный склон Луизианы: с запада (-38 м) к востоку (-76 м)
    let h = OC.lerp(-42.0, -76.0, OC.smoothstep(-900, 900, x));
    h += OC.fbm2(x * 0.008, z * 0.008, 3) * 8.5;
    h += OC.fbm2(x * 0.032, z * 0.032, 2) * 2.1;

    // Соляные диапировые купола на окраинах
    for (let i = 0; i < DIAPIR_DOMES.length; i++) {
      const dm = DIAPIR_DOMES[i];
      const d = Math.hypot(x - dm.x, z - dm.z);
      if (d < dm.r * 1.4) {
        const u = OC.smoothstep(dm.r * 1.35, 18, d);
        const ridge = (OC.ridged2(x * 0.025, z * 0.025, 2) - 0.3) * 5.0;
        h = OC.lerp(h, dm.peakH + ridge, u * 0.88);
      }
    }

    // Береговой вал и глубокая чаша главного соляного бассейна Отчаяния
    const mMain = poolShoreMetrics(x, z, MAIN_POOL);
    if (mMain.d < MAIN_POOL.r * 2.1) {
      const rimBump = Math.exp(-Math.pow((mMain.signed - 7.5) / 14.0, 2)) * 6.5;
      const outerBlend = OC.smoothstep(MAIN_POOL.r * 2.0, MAIN_POOL.r + 10.0, mMain.d);
      h = OC.lerp(h, MAIN_POOL.level + 4.8 + rimBump, outerBlend * 0.72);
      if (mMain.signed < 6.0) {
        const inner = OC.smoothstep(6.0, -18.0, mMain.signed);
        h = OC.lerp(h, MAIN_POOL.floorDepth + OC.noise2(x * 0.06, z * 0.06) * 1.4, inner);
      }
    }

    // Береговой вал и чаша верхнего каскадного бассейна Орка
    const mOrca = poolShoreMetrics(x, z, ORCA_POOL);
    if (mOrca.d < ORCA_POOL.r * 2.1) {
      const rimBump = Math.exp(-Math.pow((mOrca.signed - 6.0) / 11.0, 2)) * 5.2;
      const outerBlend = OC.smoothstep(ORCA_POOL.r * 2.0, ORCA_POOL.r + 8.0, mOrca.d);
      h = OC.lerp(h, ORCA_POOL.level + 4.4 + rimBump, outerBlend * 0.72);
      if (mOrca.signed < 5.0) {
        const inner = OC.smoothstep(5.0, -14.0, mOrca.signed);
        h = OC.lerp(h, ORCA_POOL.floorDepth + OC.noise2(x * 0.06, z * 0.06) * 1.1, inner);
      }
    }

    return OC.clamp(h, -88.0, -14.0);
  }

  function safeSpotY(x, z, desiredY, clearance) {
    let minY = getHeight(x, z) + (clearance || 4.0);
    const brine = getBrineSurfaceAt(x, z);
    if (brine) minY = Math.max(minY, brine.level + 2.2);
    return Math.max(desiredY, minY);
  }

  function getZoneAt(x, y, z) {
    const mMain = poolShoreMetrics(x, z, MAIN_POOL);
    const mOrca = poolShoreMetrics(x, z, ORCA_POOL);
    const nearEdge = Math.min(mMain.signed, mOrca.signed);
    if (nearEdge <= 6.5 && y < -40.0) return ZONES[0]; // brine_lake
    if ((mMain.signed <= 48.0 || nearestHydrateDist(x, z) < 46.0) && y < -36.0) return ZONES[1]; // mussel_shore
    if (nearestDiapirDist(x, z) < 120.0) return ZONES[2]; // salt_terrace
    if (y > -34.0 || x > 320 || z < -360) return ZONES[3]; // twilight_pelagic
    return ZONES[2]; // salt_terrace
  }

  function getTerrainColor(x, y, z, out) {
    const mMain = poolShoreMetrics(x, z, MAIN_POOL);
    const mOrca = poolShoreMetrics(x, z, ORCA_POOL);
    const nearEdge = Math.min(mMain.signed, mOrca.signed);
    const hd = nearestHydrateDist(x, z);
    const n = OC.clamp(OC.fbm2(x * 0.05, z * 0.05, 2) * 0.8 + 0.5, 0, 1);

    _colA.set(0x3a3446); // тёмный мезопелагический ил склона
    _colB.set(0xc9f2f6); // кристаллические соляные корки галита у берега
    _colC.set(0x2d2834); // плотный слой мидий / чёрный восстановительный осадок

    out.copy(_colA).lerp(_colC, n * 0.55);

    // Светлая кайма галита и оранжевых бактериальных матов прямо на урезе соляных озёр
    if (Math.abs(nearEdge) < 18.0) {
      const band = 1.0 - OC.smoothstep(0.0, 18.0, Math.abs(nearEdge));
      out.lerp(_colB, band * (0.62 + n * 0.28));
    }
    if (hd < 44.0) {
      out.lerp(_colC.set(0x9a7842), OC.smoothstep(44.0, 8.0, hd) * 0.58);
    }
    if (y > -32.0) {
      // Светло-голубоватый диапировый гипс и карбонат на вершинах куполов
      out.lerp(_colB.set(0x7488a2), OC.smoothstep(-32.0, -18.0, y) * 0.65);
    }
    return out;
  }

  function getTemperatureAt(x, depthM, zone) {
    // Геотермальные соляные купола слегка подогревают придонный рассол до +7.4..+8.2 °C
    let t = 6.2 - Math.max(0, (650 - depthM) * 0.012);
    if (zone && zone.id === 'brine_lake') t = 7.6 + OC.clamp((depthM - 670) * 0.04, 0, 0.8);
    else if (zone && zone.id === 'mussel_shore') t = 6.9;
    else if (zone && zone.id === 'twilight_pelagic') t = 5.9;
    return t;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const brine = getBrineSurfaceAt(x, z);
    const inHalocline = !!(brine && y <= brine.level + 0.45);
    const mMain = poolShoreMetrics(x, z, MAIN_POOL);
    const lakeProx = OC.smoothstep(95, 5, Math.max(0, mMain.signed));
    const hd = nearestHydrateDist(x, z);
    const seepGlow = OC.smoothstep(65, 10, hd);
    const twilightElev = OC.smoothstep(-74, -14, y);
    const dayLum = (dayW !== undefined ? dayW : 1.0) * twilightElev;

    // Сумеречная мезопелагиаль: днём слабая сине-фиолетовая дымка сверху, ночью тёмный космос с биолюминесценцией
    _fogCol.set(0x040718)
      .lerp(_colA.set(0x0e2a5c), dayLum * 0.72)
      .lerp(_colB.set(0x0a2d36), lakeProx * 0.52)
      .lerp(_colC.set(0x1b4648), inHalocline ? 0.75 : 0.0);

    _waterCol.set(0x1e589e)
      .lerp(_colA.set(0x2ae8cf), lakeProx * 0.58)
      .lerp(_colB.set(0xf0b848), seepGlow * 0.25);

    _skyTop.set(0x03081a).lerp(_colA.set(0x123e88), dayLum * 0.82);
    _skyBot.set(0x020612).lerp(_colB.set(0x082336), lakeProx * 0.4);
    _aboveHoriz.set(0x06132c);

    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity: inHalocline ? 0.026 : OC.lerp(0.0105, 0.0155, Math.max(lakeProx, seepGlow)),
      causticStrength: 0,
      rayStrength: 0,
      sunAtten: 0.22 * dayLum,
      bioGlow: OC.lerp(1.0, 0.58, dayLum),
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz,
      fillAColor: _colB.set(0x36f0da),
      fillAMult: 0.45 + lakeProx * 0.65,
      fillBColor: _colC.set(0xffb44c),
      fillBMult: 0.22 + seepGlow * 0.72
    };
  }

  function getCurrentAt(x, y, z, time, out) {
    if (!out) out = new T.Vector3();
    out.set(0.18 + Math.sin(time * 0.16 + z * 0.01) * 0.1, 0, -0.22);

    // Восходящие пузырьковые потоки над газовыми гидратами
    for (let i = 0; i < HYDRATE_MOUNDS.length; i++) {
      const hm = HYDRATE_MOUNDS[i];
      const d = Math.hypot(x - hm.x, z - hm.z);
      if (d < hm.r) {
        const above = Math.max(0, y - getHeight(x, z));
        if (above < 36) {
          const core = OC.smoothstep(hm.r, 5, d) * OC.smoothstep(36, 4, above);
          out.y += core * 1.45;
        }
      }
    }
    return out;
  }

  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const items = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;

    function add(species, x, z, scale, tint) {
      if (getBrineSurfaceAt(x, z)) return; // внутри мёртвого токсичного рассола флора не растёт — только на берегах!
      const y = getHeight(x, z);
      items.push({ species, x, y: y - 0.08, z, ry: rng() * 6.283, scale, tint: tint || 0xffffff });
    }

    // 1. Плотные береговые кольца мидий Bathymodiolus, соляных шпилей галита и трубчатых червей вдоль обоих озёр
    const pools = [MAIN_POOL, ORCA_POOL];
    for (let p = 0; p < pools.length; p++) {
      const pl = pools[p];
      if (pl.x + pl.r + 45 < x0 || pl.x - pl.r - 45 > x0 + chunkSize ||
          pl.z + pl.r + 45 < z0 || pl.z - pl.r - 45 > z0 + chunkSize) continue;
      const ringN = Math.round((p === 0 ? 52 : 34) * density);
      for (let i = 0; i < ringN; i++) {
        const ang = (i / Math.max(1, ringN)) * 6.283 + (rng() - 0.5) * 0.16;
        const shoreR = wavyPoolRadius(pl.r, ang);
        const offset = OC.lerp(2.2, 22.0, rng());
        const px = pl.x + Math.cos(ang) * (shoreR + offset);
        const pz = pl.z + Math.sin(ang) * (shoreR + offset);
        if (px < x0 || px >= x0 + chunkSize || pz < z0 || pz >= z0 + chunkSize) continue;
        const r = rng();
        if (offset < 8.5 && r < 0.62) {
          add('vent_mussels', px, pz, OC.lerp(0.9, 1.45, rng()), 0xc8c0a8);
        } else if (offset < 13.0 && r < 0.82) {
          add('halite_spire', px, pz, OC.lerp(0.75, 1.35, rng()));
        } else {
          add('cold_tubeworm', px, pz, OC.lerp(0.85, 1.35, rng()));
        }
      }
    }

    // 2. Поля метановых гидратов и кустов Lamellibrachia
    for (let h = 0; h < HYDRATE_MOUNDS.length; h++) {
      const hm = HYDRATE_MOUNDS[h];
      if (hm.x + 55 < x0 || hm.x - 55 > x0 + chunkSize || hm.z + 55 < z0 || hm.z - 55 > z0 + chunkSize) continue;
      const nH = Math.round(14 * density);
      for (let i = 0; i < nH; i++) {
        const a = rng() * 6.283;
        const rr = OC.lerp(2, hm.r * 0.9, rng());
        const px = hm.x + Math.cos(a) * rr;
        const pz = hm.z + Math.sin(a) * rr;
        if (px < x0 || px >= x0 + chunkSize || pz < z0 || pz >= z0 + chunkSize) continue;
        add(rng() < 0.55 ? 'methane_hydrate' : 'cold_tubeworm', px, pz, OC.lerp(0.8, 1.4, rng()));
      }
    }

    // 3. Соляные торосы, чёрные кораллы и глубоководные губки на соляных уступах
    const slots = Math.round(22 * density);
    for (let i = 0; i < slots; i++) {
      const px = x0 + rng() * chunkSize;
      const pz = z0 + rng() * chunkSize;
      if (getBrineSurfaceAt(px, pz)) continue;
      const y = getHeight(px, pz);
      const r = rng();
      if (y > -38 && r < 0.42) {
        add('halite_spire', px, pz, OC.lerp(0.75, 1.3, rng()));
      } else if (r < 0.72) {
        add('coral_black', px, pz, OC.lerp(0.8, 1.3, rng()));
      } else {
        add('sponge_tube', px, pz, OC.lerp(0.75, 1.25, rng()), 0xa8d8e8);
      }
    }

    return items;
  }

  const _lmRaw = [
    {
      id: 'despair_basin',
      name: 'Бассейн Отчаяния (Подводное озеро)',
      zoneId: 'brine_lake',
      isHot: true,
      x: 18,
      y: -52.0,
      z: 62,
      yaw: 2.86,
      pitch: -0.22,
      clearance: 5.5,
      description: 'Изумрудно-ртутная гладь подводного соляного озера (230‰) с волнами галоклина, кристаллами галита и выталкивающей силой рассола.'
    },
    {
      id: 'mussel_hydrates',
      name: 'Мидиевые берега и Газовые гидраты',
      zoneId: 'mussel_shore',
      isHot: true,
      x: HYDRATE_MOUNDS[0].x - 24,
      y: -54.0,
      z: HYDRATE_MOUNDS[0].z + 24,
      yaw: -0.78,
      pitch: -0.18,
      clearance: 4.5,
      description: 'Живые береговые рифы из хемосинтетических мидий Bathymodiolus, вековых червей Lamellibrachia и жёлтого «горящего льда» метана.'
    },
    {
      id: 'orca_cascade',
      name: 'Верхний каскад Орка',
      zoneId: 'salt_terrace',
      x: ORCA_POOL.x + 56,
      y: -38.0,
      z: ORCA_POOL.z - 34,
      yaw: 2.15,
      pitch: -0.20,
      clearance: 5.0,
      description: 'Верхний террасный соляной бассейн на склоне диапира Луизианы, окружённый кристаллическими башнями соли.'
    },
    {
      id: 'twilight_column',
      name: 'Сумеречная толща и Сифонофоры',
      zoneId: 'twilight_pelagic',
      x: -24,
      y: -22.0,
      z: -32,
      yaw: 0.35,
      pitch: -0.24,
      clearance: 6.0,
      description: 'Верхний горизонт мезопелагиали (632 м), где сверху струятся сумерки залива, а в толще парят сельдяной король, миктофиды и 14-метровые сифонофоры.'
    },
    {
      id: 'salt_diapir',
      name: 'Соляной купол и Химеры',
      zoneId: 'salt_terrace',
      x: 205,
      y: -26.0,
      z: -165,
      yaw: -0.68,
      pitch: -0.18,
      clearance: 5.0,
      description: 'Выдавленный тектоникой купол древней каменной соли с чёрными кораллами и глубоководными химерами Hydrolagus.'
    }
  ];

  const landmarks = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: Math.min(-6.0, safeSpotY(lm.x, lm.z, lm.y, lm.clearance))
  }));

  const spawnX = landmarks[0].x;
  const spawnZ = landmarks[0].z;
  const spawnY = Math.min(-6.0, safeSpotY(spawnX, spawnZ, -51.0, 5.0));

  const _tourRaw = [
    { x: spawnX, y: -51.0, z: spawnZ, lx: MAIN_POOL.x, ly: MAIN_POOL.level, lz: MAIN_POOL.z, title: 'Озеро на дне океана: Бассейн Отчаяния (672 м)', duration: 10,
      fact: 'Рассол в подводном озере в 4–5 раз солонее морской воды (~230‰). Из-за огромной плотности батискаф буквально плавает на его зеркале, не проваливаясь на дно!' },
    { x: landmarks[1].x, y: -54.0, z: landmarks[1].z, lx: HYDRATE_MOUNDS[0].x, ly: -62.0, lz: HYDRATE_MOUNDS[0].z, title: 'Берег из мидий и «горящий лёд» CH₄', duration: 9,
      fact: 'Пучки трубчатых червей Lamellibrachia у метановых гидратов растут крайне медленно и доживают до 250 лет — это одни из самых долгоживущих беспозвоночных планеты.' },
    { x: landmarks[2].x, y: -38.0, z: ORCA_POOL.z - 34, lx: ORCA_POOL.x, ly: ORCA_POOL.level, lz: ORCA_POOL.z, title: 'Террасный соляной бассейн Орка', duration: 9,
      fact: 'Под дном Мексиканского залива залегают километровые пласты юрской соли. Выдавливаясь вверх в виде диапиров, соль растворяется в воде и стекает в кратеры.' },
    { x: landmarks[3].x, y: -22.0, z: landmarks[3].z, lx: 15, ly: -32.0, lz: -10, title: 'Сумеречная пелагиаль и Сифонофора', duration: 10,
      fact: 'Ночью миллионы миктофид поднимаются из сумеречной зоны ближе к поверхности — это самая масштабная ежедневная миграция животных на Земле (DVM).' },
    { x: landmarks[4].x, y: -26.0, z: landmarks[4].z, lx: 245, ly: -28.0, lz: -215, title: 'Сельдяной король и Глубоководная химера', duration: 10,
      fact: 'Сельдяной король (Regalecus glesne) достигает 8–11 м в длину и вдохновил легенды о морских змеях, а химера Hydrolagus ориентируется с помощью электрорецепторов.' }
  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, Math.min(-6.0, safeSpotY(leg.x, leg.z, leg.y, 4.5)), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    fact: leg.fact,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    floor: ['Соляно-карбонатный ил склона Луизианы', 'Мексиканский залив', 'Геология', 'Все зоны', '612 – 710 м',
      'Тёмный мезопелагический ил с прослоями юрской каменной соли, сульфидными матами и береговыми валами соляных озёр.'],
    brine_pool_lake: ['Подводное соляное озеро (галоклин 230‰)', 'Brine Pool / Halocline Basin', 'Экспедиция', 'Соляное озеро', '658 – 682 м',
      'Устойчивое озеро сверхплотного рассола на морском дне с собственными волнами, чётким берегом и архимедовой выталкивающей силой (~1.22 г/см³).'],
    methane_hydrate: ['Кристаллы газового гидрата («горящий лёд»)', 'Methane Clathrate (CH₄·5.75H₂O)', 'Геология', 'Мидиевый берег', '650 – 676 м',
      'Плотные янтарно-ледяные друзы замёрзшего метана и воды, стабильные под высоким давлением склона и питающие местную хемосинтетическую фауну.'],
    cold_tubeworm: ['Вестиментифера холодных сипов', 'Lamellibrachia luymesi', 'Беспозвоночные', 'Мидиевый берег', '648 – 678 м',
      'Колониальный червь в длинных хитиновых трубках; живёт до 250 лет, поглощая сероводород «корнями» из осадка вокруг соляных озёр.'],
    halite_spire: ['Кристаллический соляной торос галита', 'Halite / Evaporite NaCl', 'Геология', 'Соляные уступы', '630 – 675 м',
      'Бело-бирюзовые кристаллические наросты каменной соли, выпадающие по краям диапиров и вдоль береговой линии рассола.'],
    vent_mussels: ['Береговая мидия холодных сипов', 'Bathymodiolus childressi', 'Беспозвоночные', 'Мидиевый берег', '654 – 680 м',
      'Живые «береговые рифы» по кромке токсичного рассола; содержат в жабрах метанокислящих бактерий и выдерживают экстремальную солёность.'],
    coral_black: ['Чёрный коралл соляных уступов', 'Leiopathes / Antipatharia', 'Кораллы', 'Соляные уступы', '626 – 668 м',
      'Долгоживущие тёмные роговые кораллы на карбонатных крышах соляных куполов, процеживающие сумеречный морской снег.'],
    sponge_tube: ['Стеклянная трубка мезопелагиали', 'Hexactinellida', 'Беспозвоночные', 'Соляные уступы', '628 – 670 м',
      'Изящные кремниевые бокалы губок на твёрдых диапировых уступах, защищённых от плотного рассола.'],
    siphonophore: ['Гигантская биолюминесцентная сифонофора', 'Praya dubia', 'Мегафауна', 'Сумеречная толща', '615 – 665 м',
      '14-метровая колониальная цепь из двойного плавательного колокола и сотен светящихся циано-фиолетовых зооидов со смертоносной сетью нитей.'],
    oarfish: ['Сельдяной король (Ремнеры)', 'Regalecus glesne', 'Рыбы', 'Сумеречная толща', '612 – 660 м',
      'Легендарная серебристая ленточная рыба длиной до 8–11 м с алой короной спинных лучей, парящая волнами сквозь сумеречную зону.'],
    chimaera: ['Глубоководная химера (Рыба-кролик)', 'Hydrolagus alberti', 'Мегафауна', 'Соляные уступы', '630 – 678 м',
      'Древний родственник акул с изумрудно-зеркальными глазами и крыловидными плавниками, патрулирующий берега соляного озера в поисках моллюсков.'],
    myctophid: ['Светящийся анчоус (Миктофида)', 'Myctophum punctatum', 'Рыбы', 'Сумеречная толща', '612 – 658 м',
      'Самая многочисленная рыба сумеречной зоны с рядами светящихся брюшных фотофоров; ночью поднимается на 15+ м вверх в рамках суточной миграции.'],
    hatchetfish: ['Глубоководный топорник', 'Argyropelecus aculeatus', 'Рыбы', 'Сумеречная толща', '616 – 662 м',
      'Плоская зеркальная рыбка с телескопическими глазами, смотрящими вверх, и светящимся брюхом для маскировки контуром (контриллюминация).'],
    squid_abyssal: ['Глубоководный сумеречный кальмар', 'Histioteuthis / Vampyroteuthis', 'Мегафауна', 'Сумеречная толща', '620 – 670 м',
      'Парящий в мезопелагиали головоногий хищник с переливающимися фотофорами щупалец.'],
    jelly_deep: ['Корономедуза сумеречной зоны', 'Atolla / Periphylla', 'Беспозвоночные', 'Сумеречная толща', '615 – 672 м',
      'Биолюминесцентный «колокольчик» сумеречной воды, вспыхивающий голубовато-сиреневыми импульсами над поверхностью рассола.']
  };

  const FAUNA_PLAN = {
    cleaningStations: [],
    brineLakes: [
      {
        cx: MAIN_POOL.x, cz: MAIN_POOL.z, r: MAIN_POOL.r, level: MAIN_POOL.level,
        radiusFn: (ang) => wavyPoolRadius(MAIN_POOL.r, ang),
        label: 'Бассейн Отчаяния (галоклин 230‰)', light: true
      },
      {
        cx: ORCA_POOL.x, cz: ORCA_POOL.z, r: ORCA_POOL.r, level: ORCA_POOL.level,
        radiusFn: (ang) => wavyPoolRadius(ORCA_POOL.r, ang),
        label: 'Каскадное соляное озеро Орка', light: true
      }
    ],
    siphonophores: [
      { cx: MAIN_POOL.x, cz: MAIN_POOL.z, r: 44, y: -32, speed: 1.75, scale: 1.15 },
      { cx: -115, cz: 85, r: 48, y: -26, speed: 1.55, scale: 1.05 }
    ],
    oarfishes: [
      { cx: 18, cz: -15, r: 58, y: -28, speed: 2.9, scale: 1.12 },
      { cx: -145, cz: 110, r: 52, y: -24, speed: 2.7, scale: 1.02 }
    ],
    chimaeras: [
      { cx: MAIN_POOL.x, cz: MAIN_POOL.z, r: 86, speed: 2.1, scale: 1.2 },
      { cx: 205, cz: -180, r: 54, speed: 2.0, scale: 1.1 },
      { cx: ORCA_POOL.x, cz: ORCA_POOL.z, r: 58, speed: 1.9, scale: 1.08 }
    ],
    ventPlumes: [
      { x: HYDRATE_MOUNDS[0].x, z: HYDRATE_MOUNDS[0].z, chimneyH: 1.2, height: 28, n: 150, light: true, coldSeep: true, key: 'methane_hydrate' },
      { x: HYDRATE_MOUNDS[1].x, z: HYDRATE_MOUNDS[1].z, chimneyH: 1.2, height: 26, n: 130, light: false, coldSeep: true, key: 'methane_hydrate' },
      { x: HYDRATE_MOUNDS[2].x, z: HYDRATE_MOUNDS[2].z, chimneyH: 1.2, height: 24, n: 120, light: false, coldSeep: true, key: 'methane_hydrate' }
    ],
    schools: [
      { key: 'myctophid', n: 56, cx: 12, cz: -18, radius: 52, yDepth: -36, yAmp: 4.5, spread: 14, speed: 6.2, scale: 0.42, diel: 'nocturnal', dvmAmp: 13.0, biolum: true, isPrey: true, shyness: 0.35,
        geoOpts: { len: 0.72, height: 0.22, width: 0.14, colA: 0x1e385c, colB: 0x62f4ff, finCol: 0x8cd2ff, eyeScale: 1.4 } },
      { key: 'hatchetfish', n: 40, cx: -68, cz: 25, radius: 44, yDepth: -38, yAmp: 4.0, spread: 11, speed: 4.4, scale: 0.40, diel: 'nocturnal', dvmAmp: 11.0, biolum: true, shyness: 0.30,
        geoOpts: { len: 0.56, height: 0.42, width: 0.08, colA: 0x9eb8d6, colB: 0x9cf8ff, finCol: 0x52c4e8, eyeScale: 1.55 } },
      { key: 'myctophid', n: 46, cx: -190, cz: 160, radius: 46, yDepth: -30, yAmp: 4.0, spread: 12, speed: 5.8, scale: 0.40, diel: 'nocturnal', dvmAmp: 12.0, biolum: true, isPrey: true, shyness: 0.35,
        geoOpts: { len: 0.72, height: 0.22, width: 0.14, colA: 0x1e385c, colB: 0x62f4ff, finCol: 0x8cd2ff, eyeScale: 1.4 } }
    ],
    squids: [
      { cx: 120, cz: -45, r: 58, y: -38, speed: 2.9, scale: 1.15 },
      { cx: -125, cz: -75, r: 56, y: -36, speed: 2.7, scale: 1.1 }
    ],
    jellies: [
      { x: 24, y: -48, z: -18, deep: true, size: 1.35 },
      { x: -32, y: -44, z: -48, deep: true, size: 1.25 },
      { x: -195, y: -34, z: 170, deep: true, size: 1.3 }
    ]
  };

  OC.Biomes.register({
    id: 'brine_pool',
    name: 'Соляной бассейн',
    region: 'Мексиканский залив · 650 м',
    subtitle: 'Сумеречная пелагиаль · 612–710 м · 68 атм',
    globe: {
      lat: 27.78, lon: -91.22, coordLabel: '27.8° с.ш., 91.2° з.д.',
      ocean: 'Мексиканский залив · Склон Луизианы', depthSpan: '612 – 710 м', tempSpan: '5.8 – 8.2 °C', color: '#45f2c8',
      summary: 'Подводные соляные озёра с зеркалом галоклина (230‰) и архимедовой плавучестью, берега мидий и метановых гидратов, сифонофоры и сельдяной король.'
    },
    worldRadius: 1200,
    chunkSize: 150,
    seaLevel: 0,
    depthOffset: DEPTH_OFFSET,
    noSurface: true,
    twilightSurface: true,
    maxCamY: -4.0,
    minimapTheme: 'brine',
    spawn: {
      pos: [spawnX, spawnY, spawnZ],
      yaw: 2.86,
      pitch: -0.22
    },
    zones: ZONES,
    landmarks,
    tourLegs,
    getHeight,
    getBrineSurfaceAt,
    getZoneAt,
    getTerrainColor,
    getTemperatureAt,
    getOpticalProfile,
    getCurrentAt,
    generateChunkFlora,
    faunaPlan: FAUNA_PLAN,
    encyclopedia: ENCYCLOPEDIA
  });
})(window.OC);
