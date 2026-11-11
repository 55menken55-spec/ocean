/* ================= ББР: БАТИМЕТРИЯ, ЗОНЫ И ОПТИКА ================= */
/* Геометрия шельфа (getHeight), карта зон, цвет дна, оптический профиль воды,
   поле течений и хелпер safeSpotY. Общий фундамент для flora/tour/fauna_plan. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;


  const WORLD_RADIUS = 1200; // 2400 × 2400 м
  const CHUNK_SIZE = 150;    // 16 × 16 чанков

  /* ---- Органический изгиб шельфа вдоль оси Z ---- */
  function shelfOffset(z) {
    return OC.fbm2(z * 0.0011, 2.7, 3) * 180 + Math.sin(z * 0.0029) * 65;
  }

  /* ---- Центр Рифового прохода (каньона течений) ---- */
  function passCenterZ(x) {
    return 240 + Math.sin(x * 0.0042) * 58 + OC.noise2(x * 0.005, 9.1) * 28;
  }

  /* ---- Ключевые точки геологии ---- */
  const BLUE_HOLE_Z = -280;
  const BLUE_HOLE_X = 365 + shelfOffset(BLUE_HOLE_Z);

  const CAY_Z = -160;
  const CAY_X = -225 + shelfOffset(CAY_Z);

  /* ---- Детерминированные лагунные бомми (коралловые башни Porites) ---- */
  const BOMMIES = [];
  (function initBommies() {
    const rng = OC.mulberry32(42077);
    let tries = 0;
    while (BOMMIES.length < 18 && tries < 300) {
      tries++;
      const bz = OC.lerp(-920, 920, rng());
      const u = OC.lerp(-370, 15, rng());
      const bx = u + shelfOffset(bz);
      // не перекрывать островок и рифовый проход
      if (Math.hypot(bx - CAY_X, bz - CAY_Z) < 135) continue;
      if (Math.abs(bz - passCenterZ(bx)) < 85) continue;
      let ok = true;
      for (const b of BOMMIES) {
        if ((b.x - bx) ** 2 + (b.z - bz) ** 2 < 78 * 78) { ok = false; break; }
      }
      if (!ok) continue;
      BOMMIES.push({
        x: bx,
        z: bz,
        r: OC.lerp(11, 19, rng()),
        h: OC.lerp(9.5, 16.5, rng())
      });
    }
  })();

  /* ---- Расчётная батиметрия (Y = 0 — уровень моря) ---- */
  function getHeight(x, z) {
    const bend = shelfOffset(z);
    const u = x - bend;

    // 1. Базовый профиль континентального шельфа (Запад -> Восток)
    let h;
    if (u < -720) {
      // Прибрежная зона и мангровая отмель (+1.9 м на берегу -> -4.8 м)
      const t = OC.smoothstep(-1080, -720, u);
      h = OC.lerp(1.9, -4.8, t);
      h += Math.sin(z * 0.025 + u * 0.015) * 0.55 * (1 - t * 0.5);
    } else if (u < -420) {
      // Луга морской травы (-4.8 м -> -12.5 м)
      const t = OC.smoothstep(-720, -420, u);
      h = OC.lerp(-4.8, -12.5, t);
    } else if (u < 35) {
      // Внутренняя лагуна (-12.5 м -> -21.5 м, затем подъём к тылу гребня)
      const t1 = OC.smoothstep(-420, -180, u);
      const t2 = OC.smoothstep(-60, 35, u);
      h = OC.lerp(-12.5, -21.5, t1);
      h = OC.lerp(h, -9.0, t2);
    } else if (u < 125) {
      // Гребень рифа (Reef Flat & Crest: -2.4 м .. -5.5 м)
      const t1 = OC.smoothstep(35, 78, u);
      const t2 = OC.smoothstep(95, 125, u);
      h = OC.lerp(-9.0, -3.1, t1);
      h = OC.lerp(h, -5.2, t2);
    } else if (u < 320) {
      // Зона прибойных желобов и контрфорсов (Spur-and-Groove: -5.2 м -> -23 м)
      const t = OC.smoothstep(125, 320, u);
      h = OC.lerp(-5.2, -23.0, t);
      const spurPhase = (z - u * 0.14) * 0.155 + OC.noise2(x * 0.02, z * 0.02) * 1.45;
      const spurWave = Math.sin(spurPhase);
      const spurMask = Math.sin(t * Math.PI);
      h += spurWave * 4.4 * spurMask;
    } else if (u < 530) {
      // Внешний склон рифа (-23 м -> -44 м с террасами)
      const t = OC.smoothstep(320, 530, u);
      h = OC.lerp(-23.0, -44.0, t);
      h += Math.sin(u * 0.085) * 1.4;
    } else if (u < 770) {
      // Отвесная стена внешнего барьера (-44 м -> -144 м)
      const t = OC.smoothstep(530, 770, u);
      const terrace = Math.sin(t * Math.PI * 6) * 1.8 * Math.sin(t * Math.PI);
      h = OC.lerp(-44.0, -144.0, t) + terrace;
    } else {
      // Бездна Кораллового моря (-144 м -> -168 м)
      const t = OC.smoothstep(770, 1250, u);
      h = OC.lerp(-144.0, -168.0, t);
    }

    // 2. Естественный микро- и мезорельеф дна
    const nLarge = OC.fbm2(x * 0.0045, z * 0.0045, 3) * 4.2;
    const nMid = OC.fbm2(x * 0.022, z * 0.022, 2) * 1.35;
    const sandDune = Math.sin(x * 0.16 + z * 0.11) * 0.22;
    h += nLarge * OC.smoothstep(-1050, -500, u) + nMid + sandDune;

    // 3. Песчаный коралловый островок (Coral Sand Cay) в лагуне
    const dc = Math.hypot(x - CAY_X, z - CAY_Z);
    if (dc < 115) {
      const flat = OC.smoothstep(115, 48, dc);
      const peak = OC.smoothstep(56, 10, dc);
      h = OC.lerp(h, -2.2, flat);
      h = OC.lerp(h, 2.75 + OC.noise2(x * 0.08, z * 0.08) * 0.35, peak);
    }

    // 4. Лагунные коралловые бомми (высокие известняковые столбы)
    for (let i = 0; i < BOMMIES.length; i++) {
      const b = BOMMIES[i];
      const dx = x - b.x, dz = z - b.z;
      const d2 = dx * dx + dz * dz;
      const maxR = b.r * 1.85;
      if (d2 < maxR * maxR) {
        const d = Math.sqrt(d2);
        const shape = OC.smoothstep(maxR, b.r * 0.45, d);
        const crag = 1 + 0.16 * OC.noise2(x * 0.18 + i, z * 0.18);
        h += b.h * shape * crag;
      }
    }

    // 5. Рифовый проход (глубокий канал сквозь гребень и склон)
    if (u > 10 && u < 560) {
      const pz = passCenterZ(x);
      const dz = Math.abs(z - pz);
      if (dz < 68) {
        const across = OC.smoothstep(68, 16, dz);
        const along = OC.smoothstep(10, 85, u) * OC.smoothstep(560, 470, u);
        const targetD = OC.lerp(-23, -38, OC.smoothstep(40, 480, u));
        h = OC.lerp(h, Math.min(h, targetD), across * along * 0.92);
      }
    }

    // 6. Голубая дыра (Great Blue Hole, -88 м карстовый провал)
    const dh = Math.hypot(x - BLUE_HOLE_X, z - BLUE_HOLE_Z);
    if (dh < 84) {
      const rim = Math.exp(-((dh - 58) ** 2) / 140) * 3.8;
      const wall = OC.smoothstep(56, 22, dh);
      const ledge = Math.sin(wall * Math.PI * 3) * 1.6 * Math.sin(wall * Math.PI);
      h += rim;
      h = OC.lerp(h, -88.0 + OC.noise2(x * 0.08, z * 0.08) * 1.2, wall) + ledge;
    }

    return h;
  }

  /* ---- Определение текущей зоны ---- */
  const ZONES = [
    {
      id: 'mangroves',
      name: 'Мангровые отмели',
      shortName: 'Мангровая кромка',
      color: '#469e7d',
      depthLabel: '0–5 м',
      tempC: 28.4,
      description: 'Прибрежные заросли красных мангров (Rhizophora) — природный «детский сад» для мальков рифовых рыб.'
    },
    {
      id: 'seagrass',
      name: 'Луга морской травы',
      shortName: 'Морская трава',
      color: '#5ab878',
      depthLabel: '4–12 м',
      tempC: 27.8,
      description: 'Солнечные песчаные отмели с коврами морской травы, где пасутся дюгони и зелёные черепахи.'
    },
    {
      id: 'lagoon',
      name: 'Внутренняя лагуна и Бомми',
      shortName: 'Лагуна и Островок',
      color: '#34d1d8',
      depthLabel: '0–22 м',
      tempC: 27.3,
      description: 'Бирюзовая лагуна с песчаным островком и гигантскими коралловыми башнями-бомми из массивов Porites.'
    },
    {
      id: 'crest',
      name: 'Гребень рифа и желоба прибоя',
      shortName: 'Гребень рифа',
      color: '#ff966b',
      depthLabel: '2–20 м',
      tempC: 26.8,
      description: 'Зона максимального биоразнообразия: контрфорсы и песчаные желоба прибоя (spur-and-groove), столовидные и ветвистые акропоры.'
    },
    {
      id: 'slope_hole',
      name: 'Внешний склон и Голубая дыра',
      shortName: 'Склон и Голубая дыра',
      color: '#3282e6',
      depthLabel: '22–88 м',
      tempC: 24.1,
      description: 'Склоны с веерами горгонарий, глубокий Рифовый проход и карстовый провал Голубой дыры глубиной 88 м.'
    },
    {
      id: 'dropoff',
      name: 'Стена барьера и Коралловое море',
      shortName: 'Обрыв в бездну',
      color: '#204498',
      depthLabel: '40–168 м',
      tempC: 19.6,
      description: 'Отвесный известняковый обрыв внешнего барьера в тёмную бездну Кораллового моря — царство акул, мант и горбатых китов.'
    }
  ];

  const ZONE_MAP = {};
  ZONES.forEach((z) => (ZONE_MAP[z.id] = z));

  function getZoneAt(x, y, z) {
    const dh = Math.hypot(x - BLUE_HOLE_X, z - BLUE_HOLE_Z);
    if (dh < 65) return ZONE_MAP.slope_hole;

    const u = x - shelfOffset(z);
    if (u < -720) return ZONE_MAP.mangroves;
    if (u < -420) return ZONE_MAP.seagrass;
    if (u < 40) return ZONE_MAP.lagoon;
    if (u < 290) return ZONE_MAP.crest;
    if (u < 530) return ZONE_MAP.slope_hole;
    return ZONE_MAP.dropoff;
  }

  /* ---- Цвет морского дна по зоне, глубине и уклону ---- */
  const _cSand = new T.Color(0xe6dcc2);
  const _cMud = new T.Color(0x6d6146);
  const _cSeagrassFloor = new T.Color(0x7c865b);
  const _cRock = new T.Color(0x6c6566);
  const _cCoralline = new T.Color(0x9b6b7a);
  const _cDeepLimestone = new T.Color(0x283a4d);
  const _cCaySand = new T.Color(0xf4ead2);

  function getTerrainColor(x, y, z, out, slopeHint) {
    const u = x - shelfOffset(z);
    const ripple = Math.sin(x * 0.52 + z * 0.31) * 0.5 + Math.sin(z * 0.77 - x * 0.24) * 0.5;
    const micro = OC.noise2(x * 0.06, z * 0.06);

    // Проверка на крутизну (из предвычисленной сетки террейна или через локальный градиент)
    let slope = slopeHint;
    if (slope === undefined) {
      const dh = Math.abs(getHeight(x + 2.5, z) - getHeight(x - 2.5, z)) +
                 Math.abs(getHeight(x, z + 2.5) - getHeight(x, z - 2.5));
      slope = OC.clamp(dh * 0.22, 0, 1);
    } else {
      slope = OC.clamp(slope * 1.15, 0, 1);
    }

    if (y > 0.15) {
      // Надводная часть: коралловый островок или мангровый берег
      if (u < -700) {
        out.copy(_cMud).offsetHSL(0, 0, micro * 0.05);
      } else {
        out.copy(_cCaySand).offsetHSL(0, 0, micro * 0.03);
      }
      return out;
    }

    if (u < -720) {
      out.copy(_cMud).lerp(_cSeagrassFloor, OC.smoothstep(-900, -720, u));
    } else if (u < -420) {
      out.copy(_cSeagrassFloor).lerp(_cSand, 0.42 + micro * 0.2);
    } else if (u < 40) {
      out.copy(_cSand).offsetHSL(0, 0, ripple * 0.022 + micro * 0.03);
      out.lerp(_cCoralline, slope * 0.72);
    } else if (u < 320) {
      // Гребень и Spur-and-Groove: гребни розовато-каменистые, канавы светло-песчаные
      const ridge = OC.clamp((y + 13) / 9, 0, 1);
      out.copy(_cSand).lerp(_cCoralline, OC.clamp(slope * 0.6 + ridge * 0.45, 0, 0.85));
      out.offsetHSL(0, 0, ripple * 0.018);
    } else if (u < 540) {
      out.copy(_cSand).lerp(_cRock, OC.clamp(0.45 + slope * 0.55, 0, 1));
      out.lerp(_cDeepLimestone, OC.smoothstep(-25, -65, y) * 0.65);
    } else {
      out.copy(_cRock).lerp(_cDeepLimestone, OC.smoothstep(-35, -120, y));
      if (slope > 0.35) out.lerp(_cCoralline, 0.22);
    }

    // Дно Голубой дыры
    const dHole = Math.hypot(x - BLUE_HOLE_X, z - BLUE_HOLE_Z);
    if (dHole < 60) {
      out.lerp(_cDeepLimestone, OC.smoothstep(60, 26, dHole) * 0.8);
    }

    return out;
  }

  /* ---- Оптический профиль воды (цвет тумана, прозрачность, каустика по глубине и зоне) ---- */
  const _fogDayShallow = new T.Color(0x0b7394);
  const _fogDayMangrove = new T.Color(0x166d66);
  const _fogDayCrest = new T.Color(0x0d7da4);
  const _fogDayDeep = new T.Color(0x04284e);
  const _fogDayAbyss = new T.Color(0x021229);
  const _fogNight = new T.Color(0x021022);
  const _fogAbove = new T.Color(0x8cd9ef);
  const _tmpFog = new T.Color();

  function getOpticalProfile(x, y, z, dayW) {
    const depth = Math.max(0, -y);
    const u = x - shelfOffset(z);
    const dHole = Math.hypot(x - BLUE_HOLE_X, z - BLUE_HOLE_Z);

    if (y > 0.25) {
      // Над водой
      _tmpFog.copy(_fogAbove).lerp(_fogNight, (1 - dayW) * 0.78);
      return {
        aboveWater: true,
        fogColor: _tmpFog,
        fogDensity: 0.00075,
        causticStrength: 0.7 * dayW,
        rayStrength: 0.0,
        sunAtten: 1.0,
        bioGlow: 1 - dayW
      };
    }

    // Базовый цвет воды по зоне
    const mangroveW = 1 - OC.smoothstep(-780, -450, u);
    const crestW = OC.smoothstep(-100, 120, u) * (1 - OC.smoothstep(380, 620, u));
    _tmpFog.copy(_fogDayShallow)
      .lerp(_fogDayMangrove, mangroveW * 0.8)
      .lerp(_fogDayCrest, crestW * 0.55);

    // Поглощение света и сдвиг спектра на глубине
    const deepT = OC.smoothstep(18, 72, depth);
    const abyssT = OC.smoothstep(65, 138, depth);
    _tmpFog.lerp(_fogDayDeep, deepT * 0.88);
    _tmpFog.lerp(_fogDayAbyss, abyssT * 0.92);

    // Голубая дыра ощущается глубже и сапфировее
    if (dHole < 65) {
      const holeT = OC.smoothstep(65, 28, dHole) * OC.smoothstep(5, 35, depth);
      _tmpFog.lerp(_fogDayAbyss, holeT * 0.55);
    }

    // Ночь / сумерки
    _tmpFog.lerp(_fogNight, (1 - dayW) * 0.85);

    // Прозрачность: в манграх чуть мутнее, на внешнем рифе прозрачнее, в бездне плотный мрак
    const baseDen = OC.lerp(0.0068, 0.0112, mangroveW) * (1 - crestW * 0.16);
    const fogDensity = baseDen + abyssT * 0.0045 + (1 - dayW) * 0.0022;

    const sunAtten = Math.exp(-depth * 0.026) * (0.28 + 0.72 * dayW);
    const causticStrength = OC.clamp(Math.exp(-depth * 0.036) * (0.25 + 0.85 * dayW), 0, 1.1);
    const rayStrength = OC.clamp((1 - OC.smoothstep(24, 65, depth)) * (0.3 + 0.7 * dayW), 0, 1);
    const bioGlow = OC.clamp((1 - dayW) * 0.85 + OC.smoothstep(26, 75, depth) * 0.75, 0, 1);

    return {
      aboveWater: false,
      fogColor: _tmpFog,
      fogDensity,
      causticStrength,
      rayStrength,
      sunAtten,
      bioGlow
    };
  }

  /* ---- Векторные приливные и прибойные течения шельфа (м/с) ---- */
  function getCurrentAt(x, y, z, time, out) {
    out = out || new T.Vector3();
    if (y > 0.1) return out.set(0, 0, 0);

    const u = x - shelfOffset(z);
    const floor = getHeight(x, z);
    const clearance = Math.max(0, y - floor);
    // У самого дна в расщелинах течение затихает (пограничный слой)
    const shelter = OC.smoothstep(0.4, 4.2, clearance);
    const t = time || 0;

    let vx = 0, vy = 0, vz = 0;

    // 1. Приливная струя Рифового прохода (сильный поток через канал)
    if (u > -10 && u < 580) {
      const pz = passCenterZ(x);
      const dz = Math.abs(z - pz);
      if (dz < 88) {
        const across = OC.smoothstep(88, 18, dz);
        const along = OC.smoothstep(-10, 80, u) * OC.smoothstep(580, 450, u);
        const tidePhase = Math.sin(t * 0.045); // медленный прилив/отлив
        const dir = tidePhase >= 0 ? -1 : 1;
        const mag = (1.15 + 1.15 * Math.abs(tidePhase)) * across * along;
        // Касательная канала passCenterZ(x)
        const dpz = passCenterZ(x + 4) - passCenterZ(x - 4);
        const tx = 8, tz = dpz;
        const tlen = Math.hypot(tx, tz) || 1;
        vx += (tx / tlen) * dir * mag;
        vz += (tz / tlen) * dir * mag;
      }
    }

    // 2. Волновой накат над гребнем и spur-and-groove (направлен на запад к лагуне)
    if (u > 25 && u < 310 && y > -16) {
      const crestMask = OC.smoothstep(25, 75, u) * OC.smoothstep(310, 210, u);
      const depthFade = OC.smoothstep(-16, -2.5, y);
      const surge = 0.55 + 0.35 * Math.sin(t * 0.85 + x * 0.045);
      vx -= surge * crestMask * depthFade;
      vy += Math.sin(t * 0.85 + x * 0.045) * 0.14 * crestMask * depthFade;
    }

    // 3. Восточно-Австралийское течение и апвеллинг вдоль внешней стены барьера
    if (u > 500) {
      const wallMask = OC.smoothstep(500, 620, u);
      const upMask = OC.smoothstep(500, 580, u) * OC.smoothstep(840, 650, u);
      vz += 0.62 * wallMask;
      vx -= 0.12 * wallMask;
      vy += 0.22 * upMask * OC.smoothstep(-110, -25, y);
    }

    // 4. Лёгкий фоновый дрейф в лагуне
    if (u >= -450 && u <= 30) {
      vx += Math.sin(t * 0.12 + z * 0.01) * 0.14;
      vz += 0.18 + Math.cos(t * 0.1 + x * 0.01) * 0.1;
    }

    return out.set(vx * shelter, vy * shelter, vz * shelter);
  }

  function safeSpotY(x, z, desiredY, minClearance) {
    const floor = getHeight(x, z);
    return Math.max(desiredY, floor + (minClearance || 2.8));
  }
  /* Публичный фундамент биома для flora/tour/fauna_plan и регистрации */
  OC._GbrBase = {
    WORLD_RADIUS, CHUNK_SIZE, shelfOffset, passCenterZ,
    BLUE_HOLE_X, BLUE_HOLE_Z, CAY_X, CAY_Z, BOMMIES,
    ZONES, safeSpotY, getHeight, getZoneAt, getTerrainColor,
    getOpticalProfile, getCurrentAt
  };
})(window.OC);
