/* ================= БИОМ: БОЛЬШОЙ БАРЬЕРНЫЙ РИФ (2.4 × 2.4 КМ) ================= */
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

  function getTerrainColor(x, y, z, out) {
    const u = x - shelfOffset(z);
    const ripple = Math.sin(x * 0.52 + z * 0.31) * 0.5 + Math.sin(z * 0.77 - x * 0.24) * 0.5;
    const micro = OC.noise2(x * 0.06, z * 0.06);

    // Проверка на крутизну (скалы / рифовые уступы / стенки бомми и обрыва)
    const dh = Math.abs(getHeight(x + 2.5, z) - getHeight(x - 2.5, z)) +
               Math.abs(getHeight(x, z + 2.5) - getHeight(x, z - 2.5));
    const slope = OC.clamp(dh * 0.22, 0, 1);

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

  /* ---- Размещение флоры в чанке (детерминированное, зонально-реалистичное) ---- */
  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;
    const out = [];

    // Основная сетка кандидатов: шаг адаптируется от плотности
    const step = OC.clamp(12.5 / Math.sqrt(Math.max(0.25, density)), 8.5, 22);
    const cols = Math.floor(chunkSize / step);

    for (let iz = 0; iz < cols; iz++) {
      for (let ix = 0; ix < cols; ix++) {
        const x = x0 + (ix + 0.15 + rng() * 0.7) * step;
        const z = z0 + (iz + 0.15 + rng() * 0.7) * step;
        const y = getHeight(x, z);
        const u = x - shelfOffset(z);
        const dHole = Math.hypot(x - BLUE_HOLE_X, z - BLUE_HOLE_Z);

        // Выше уровня моря + 0.35 м (сухой островок или мангровый берег)
        if (y > 0.35) {
          if (u < -760 && y < 1.35 && rng() < 0.42) {
            out.push({
              species: 'mangrove',
              x, y: y - 0.3, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.85, 1.45, rng()),
              tint: 0xffffff
            });
          } else if (u >= -760 && y > 0.55 && rng() < 0.85) {
            out.push({
              species: 'island_palm',
              x, y: y - 0.22, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.72, 1.28, rng()),
              tint: rng() < 0.5 ? 0xf6fff2 : 0xe4f5dc
            });
            if (y > 1.25 && rng() < 0.6) {
              const px2 = x + (rng() - 0.5) * 6.0;
              const pz2 = z + (rng() - 0.5) * 6.0;
              const py2 = getHeight(px2, pz2);
              if (py2 > 0.5) {
                out.push({
                  species: 'island_palm',
                  x: px2, y: py2 - 0.22, z: pz2,
                  ry: rng() * 6.28,
                  scale: OC.lerp(0.62, 1.12, rng()),
                  tint: 0xecfbe2
                });
              }
            }
          }
          continue;
        }

        const hx = getHeight(x + 2, z) - getHeight(x - 2, z);
        const hz = getHeight(x, z + 2) - getHeight(x, z - 2);
        const slope = Math.hypot(hx, hz) * 0.25;

        // 1) Прибрежная зона: мангры на мелководье (-2.2 .. +0.35 м)
        if (u < -735 && y > -2.3 && y <= 0.35) {
          if (rng() < 0.58) {
            out.push({
              species: 'mangrove',
              x, y: y - 0.15, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.9, 1.55, rng()),
              tint: 0xffffff
            });
          }
          continue;
        }

        // 2) Луга морской травы
        if (u >= -740 && u < -390) {
          if (rng() < 0.72) {
            out.push({
              species: 'seagrass',
              x, y: y - 0.04, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.85, 1.45, rng()),
              tint: 0xdff5c8
            });
          } else if (rng() < 0.25) {
            out.push({
              species: rng() < 0.5 ? 'starfish_blue' : 'shell_triton',
              x, y: y + 0.12, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.8, 1.25, rng()),
              tint: 0xffffff
            });
          }
          continue;
        }

        // 3) Внутренняя лагуна (песчаные поля, бомми, островок)
        if (u >= -390 && u < 40) {
          const dc = Math.hypot(x - CAY_X, z - CAY_Z);
          if (dc < 52) continue; // не загромождаем чистый пляж островка

          // На верхушках и склонах бомми (y > -13 или высокий склон) — богатые кораллы!
          if (y > -13.5 || slope > 0.28) {
            const r = rng();
            let sp = 'coral_staghorn';
            if (r < 0.25) sp = 'coral_brain';
            else if (r < 0.48) sp = 'coral_table';
            else if (r < 0.65) sp = 'coral_staghorn';
            else if (r < 0.78) sp = 'coral_bommie';
            else if (r < 0.89) sp = 'anemone';
            else sp = 'giant_clam';
            out.push({
              species: sp,
              x, y: y - 0.15, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.75, 1.35, rng()),
              tint: 0xffffff
            });
            // Нижний ярус коркового коралла / криноидеи на бомми
            if (rng() < 0.52) {
              out.push({
                species: rng() < 0.72 ? 'coral_crust' : 'crinoid',
                x: x + (rng() - 0.5) * 4.5,
                y: y - 0.12,
                z: z + (rng() - 0.5) * 4.5,
                ry: rng() * 6.28,
                scale: OC.lerp(0.75, 1.25, rng()),
                tint: 0xffffff
              });
            }
          } else {
            // Песчаное дно лагуны: трава, ежи, звёзды, тридакны, раковины
            const r = rng();
            if (r < 0.28) {
              out.push({ species: 'seagrass', x, y: y - 0.04, z, ry: rng() * 6.28, scale: OC.lerp(0.8, 1.2, rng()), tint: 0xd8f0c8 });
            } else if (r < 0.42) {
              out.push({ species: 'coral_brain', x, y: y - 0.1, z, ry: rng() * 6.28, scale: OC.lerp(0.7, 1.15, rng()), tint: 0xffffff });
            } else if (r < 0.52) {
              out.push({ species: 'giant_clam', x, y: y - 0.05, z, ry: rng() * 6.28, scale: OC.lerp(0.8, 1.35, rng()), tint: 0xffffff });
            } else if (r < 0.64) {
              out.push({ species: rng() < 0.5 ? 'urchin' : 'starfish_blue', x, y: y + 0.1, z, ry: rng() * 6.28, scale: OC.lerp(0.8, 1.3, rng()), tint: 0xffffff });
            } else if (r < 0.70) {
              out.push({ species: 'shell_triton', x, y: y + 0.12, z, ry: rng() * 6.28, scale: OC.lerp(0.85, 1.35, rng()), tint: 0xffffff });
            }
          }
          continue;
        }

        // 4) Гребень рифа и Spur-and-Groove
        if (u >= 40 && u < 305) {
          // В глубоких песчаных желобах между контрфорсами (y < -14) оставляем песок и редкие ежи/траву
          if (y < -15.5 && slope < 0.22) {
            if (rng() < 0.35) {
              out.push({
                species: rng() < 0.6 ? 'urchin' : 'starfish_cots',
                x, y: y + 0.12, z,
                ry: rng() * 6.28,
                scale: OC.lerp(0.85, 1.25, rng()),
                tint: 0xffffff
              });
            }
            continue;
          }
          // На гребнях (spurs) — максимальная плотность кораллов!
          const r = rng();
          let sp = 'coral_staghorn';
          if (r < 0.30) sp = 'coral_staghorn';
          else if (r < 0.54) sp = 'coral_table';
          else if (r < 0.70) sp = 'coral_brain';
          else if (r < 0.80) sp = 'anemone';
          else if (r < 0.88) sp = 'coral_fan';
          else if (r < 0.94) sp = 'giant_clam';
          else sp = 'starfish_cots';

          out.push({
            species: sp,
            x, y: y - 0.15, z,
            ry: rng() * 6.28,
            scale: OC.lerp(0.82, 1.48, rng()),
            tint: 0xffffff
          });
          // Плотное покрытие гребня вторым ярусом (корковые кораллы, криноидеи, мелкие ветви)
          if (rng() < 0.72) {
            const subR = rng();
            const subSp = subR < 0.62 ? 'coral_crust' : (subR < 0.84 ? 'crinoid' : 'coral_staghorn');
            out.push({
              species: subSp,
              x: x + (rng() - 0.5) * 4.8,
              y: y - 0.12,
              z: z + (rng() - 0.5) * 4.8,
              ry: rng() * 6.28,
              scale: OC.lerp(0.7, 1.25, rng()),
              tint: 0xffffff
            });
          }
          continue;
        }

        // 5) Внешний склон, Рифовый проход и Голубая дыра
        if (u >= 305 && u < 545) {
          if (dHole < 48 && y < -45) {
            // Глубина Голубой дыры: губки и редкие чёрные кораллы на уступах
            if (slope > 0.22 && rng() < 0.45) {
              out.push({
                species: rng() < 0.5 ? 'coral_black' : 'sponge_tube',
                x, y: y - 0.1, z,
                ry: rng() * 6.28,
                scale: OC.lerp(0.9, 1.4, rng()),
                tint: 0xffffff
              });
            }
            continue;
          }
          const r = rng();
          let sp = 'coral_fan';
          if (r < 0.22) sp = 'coral_fan';
          else if (r < 0.38) sp = 'sponge_tube';
          else if (r < 0.52) sp = 'sponge_barrel';
          else if (r < 0.66) sp = 'coral_plate';
          else if (r < 0.78) sp = 'coral_soft';
          else if (r < 0.88) sp = 'crinoid';
          else if (r < 0.94) sp = 'kelp';
          else sp = 'coral_brain';
          out.push({
            species: sp,
            x, y: y - 0.18, z,
            ry: rng() * 6.28,
            scale: OC.lerp(0.9, 1.5, rng()),
            tint: 0xffffff
          });
          continue;
        }

        // 6) Отвесная стена и Бездна Кораллового моря
        if (u >= 545) {
          if (y > -92 && (slope > 0.25 || u < 740)) {
            const r = rng();
            let sp = 'coral_plate';
            if (y < -52) {
              if (r < 0.36) sp = 'coral_black';
              else if (r < 0.68) sp = 'coral_soft';
              else if (r < 0.88) sp = 'sponge_barrel';
              else sp = 'coral_fan';
            } else {
              if (r < 0.34) sp = 'coral_plate';
              else if (r < 0.58) sp = 'coral_fan';
              else if (r < 0.78) sp = 'coral_soft';
              else sp = 'sponge_tube';
            }
            if (rng() < 0.68) {
              out.push({
                species: sp,
                x, y: y - 0.2, z,
                ry: rng() * 6.28,
                scale: OC.lerp(0.95, 1.65, rng()),
                tint: 0xffffff
              });
            }
          } else if (y <= -92 && rng() < 0.08) {
            // Редкие глубоководные губки и чёрные кораллы на дне Кораллового моря
            out.push({
              species: rng() < 0.5 ? 'coral_black' : 'sponge_barrel',
              x, y: y - 0.1, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.9, 1.4, rng()),
              tint: 0xaab8d8
            });
          }
        }
      }
    }

    return out;
  }

  function safeSpotY(x, z, desiredY, minClearance) {
    const floor = getHeight(x, z);
    return Math.max(desiredY, floor + (minClearance || 2.8));
  }

  /* ---- Знаковые ориентиры (Landmarks) ---- */
  const _lmRaw = [
    {
      id: 'mangroves',
      name: 'Мангровые отмели',
      zoneId: 'mangroves',
      x: -775 + shelfOffset(-120),
      y: -1.6,
      z: -120,
      yaw: 1.48,
      pitch: -0.05,
      clearance: 2.2,
      description: 'Западная береговая кромка с корнями красных мангров в тёплом изумрудном мелководье.'
    },
    {
      id: 'seagrass',
      name: 'Луга морской травы',
      zoneId: 'seagrass',
      x: -555 + shelfOffset(90),
      y: -4.5,
      z: 90,
      yaw: 0.75,
      pitch: -0.14,
      clearance: 3.2,
      description: 'Ковры морской травы Halophila и Zostera — место кормления дюгоней и морских черепах.'
    },
    {
      id: 'sand_cay',
      name: 'Коралловый островок',
      zoneId: 'lagoon',
      x: CAY_X + 74,
      y: 2.2,
      z: CAY_Z + 56,
      yaw: 2.32,
      pitch: -0.08,
      clearance: 3.5,
      description: 'Солнечный песчаный островок (Sand Cay) посреди лазурной лагуны Большого Барьерного рифа.'
    },
    {
      id: 'bommies',
      name: 'Коралловые бомми',
      zoneId: 'lagoon',
      x: (BOMMIES[0] ? BOMMIES[0].x : -140) + 32,
      y: -8.0,
      z: (BOMMIES[0] ? BOMMIES[0].z : 60) + 26,
      yaw: 2.28,
      pitch: -0.06,
      clearance: 3.5,
      description: 'Гигантские известняковые башни-бомми из колоний Porites, окружённые стаями рифовых рыб.'
    },
    {
      id: 'crest',
      name: 'Гребень и желоба',
      zoneId: 'crest',
      x: 155 + shelfOffset(20),
      y: -6.5,
      z: 20,
      yaw: -1.35,
      pitch: -0.18,
      clearance: 4.5,
      description: 'Живой гребень барьера с параллельными коралловыми контрфорсами и песчаными желобами прибоя.'
    },
    {
      id: 'pass',
      name: 'Рифовый проход',
      zoneId: 'slope_hole',
      x: 340 + shelfOffset(250),
      y: -17.5,
      z: passCenterZ(340 + shelfOffset(250)),
      yaw: -1.55,
      pitch: -0.08,
      clearance: 5.0,
      description: 'Глубокий приливный канал через рифовый щит: здесь кружат стаи барракуд и парят пятнистые орляки.'
    },
    {
      id: 'blue_hole',
      name: 'Голубая дыра',
      zoneId: 'slope_hole',
      x: BLUE_HOLE_X + 28,
      y: -22.0,
      z: BLUE_HOLE_Z + 24,
      yaw: 2.35,
      pitch: -0.45,
      clearance: 6.0,
      description: 'Затопленный карстовый провал диаметром ~110 м, уходящий отвесными уступами на глубину 88 метров.'
    },
    {
      id: 'dropoff',
      name: 'Стена в бездну',
      zoneId: 'dropoff',
      x: 645 + shelfOffset(-60),
      y: -34.0,
      z: -60,
      yaw: 1.55,
      pitch: -0.12,
      clearance: 8.0,
      description: 'Внешняя стена Большого Барьерного рифа — вертикальный обрыв в глубины Кораллового моря.'
    }
  ];

  const LANDMARKS = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: safeSpotY(lm.x, lm.z, lm.y, lm.clearance)
  }));

  const SPAWN_X = -45 + shelfOffset(35);
  const SPAWN_Z = 35;
  const SPAWN_Y = safeSpotY(SPAWN_X, SPAWN_Z, -7.2, 5.5);

  /* ---- Энциклопедия видов и геологии ---- */
  const ENCYCLOPEDIA = {
    // География
    floor: ['Морское дно и рельеф рифа', 'Bathymetry / Benthos', 'Геология', 'Все зоны', '0–168 м', 'Карбонатные пески, известняковые плиты, контрфорсы прибоя (spur-and-groove) и отвесный склон шельфа Кораллового моря.'],
    mangrove: ['Красные мангры', 'Rhizophora stylosa', 'Флора', 'Мангровые отмели', '0–3 м', 'Деревья с арочными ходульными корнями, фильтрующие сток суши и дающие укрытие малькам рифовых рыб и крабов.'],
    island_palm: ['Пальмы кораллового острова', 'Cocos nucifera', 'Флора', 'Коралловый островок', '+1–10 м', 'Тропические кокосовые пальмы и прибрежные кустарники песчаного островка (Sand Cay), удерживающие коралловый песок корнями от ветровой и волновой эрозии.'],
    seagrass: ['Морская трава', 'Zostera / Halophila', 'Флора', 'Луга морской травы', '3–14 м', 'Единственные цветковые растения, полностью адаптированные к морской воде. Основная пища дюгоней и зелёных черепах.'],
    kelp: ['Саргассовые и бурые водоросли', 'Sargassum / Laminariales', 'Флора', 'Внешний склон', '15–42 м', 'Крупные бурые водоросли прохладных течений внешнего склона с газовыми пузырьками-поплавками.'],

    // Кораллы и беспозвоночные
    coral_staghorn: ['Ветвистая акропора (Оленерогий коралл)', 'Acropora cervicornis', 'Кораллы', 'Гребень и Лагуна', '2–18 м', 'Быстрорастущие хрупкие ветвистые кораллы со светлыми зонами роста на кончиках; создают главный 3D-каркас рифа.'],
    coral_table: ['Столовидная акропора', 'Acropora hyacinthus', 'Кораллы', 'Гребень рифа', '2–16 м', 'Широкие горизонтальные тарелки-террасы, улавливающие максимум солнечного света для симбиотических водорослей зооксантелл.'],
    coral_brain: ['Мозговой коралл', 'Platygyra / Diploria', 'Кораллы', 'Лагуна и Гребень', '3–25 м', 'Прочные сферические колонии с лабиринтовыми бороздами; выдерживают сильные штормовые волны и живут столетиями.'],
    coral_bommie: ['Массивный коралл Поритес (Бомми)', 'Porites lutea', 'Кораллы', 'Внутренняя лагуна', '4–22 м', 'Колоссальные известняковые башни («бомми»), формирующиеся тысячелетиями из миллионов крошечных полипов.'],
    coral_plate: ['Листовой коралл Монтипора', 'Montipora / Turbinaria', 'Кораллы', 'Склон и Стена', '22–65 м', 'Черепитчатые пластины на крутых склонах, адаптированные к слабому рассеянному свету больших глубин.'],
    coral_crust: ['Корковый коралл и литотамний', 'Montipora / Porolithon', 'Кораллы', 'Гребень и Бомми', '1–22 м', 'Стелющиеся корковые кораллы и известковые водоросли, цементирующие каркас рифа и заполняющие пространство между крупными колониями.'],
    coral_fan: ['Веерная горгонария', 'Gorgonia / Melithaea', 'Кораллы', 'Склон и Проход', '14–55 м', 'Ажурные мягкие кораллы-веера, разворачивающиеся поперёк течения для фильтрации зоопланктона.'],
    coral_soft: ['Мягкий коралл Дендронефтия', 'Dendronephthya', 'Кораллы', 'Склон и Обрыв', '25–90 м', 'Яркие пастельно-розовые и фиолетовые кусты без жёсткого известкового скелета; надуваются водой в сильном течении.'],
    coral_black: ['Чёрный коралл', 'Antipatharia', 'Кораллы', 'Голубая дыра и Бездна', '38–145 м', 'Глубоководные веерные и кнутообразные кораллы сумеречной зоны без зооксантелл, растущие всего по несколько миллиметров в год.'],
    crinoid: ['Морская лилия (Криноидея)', 'Comanthina schlegeli', 'Беспозвоночные', 'Гребень и Склон', '3–55 м', 'Древнее иглокожее с венчиком перистых лучей; цепляется за вершины кораллов и губок, процеживая планктон из течения.'],
    sponge_tube: ['Трубчатая губка', 'Aplysina fistularis', 'Беспозвоночные', 'Склон и Стена', '15–60 м', 'Колонии вертикальных пористых трубок, непрерывно прокачивающих и очищающих тысячи литров морской воды в сутки.'],
    sponge_barrel: ['Гигантская бочковидная губка', 'Xestospongia testudinaria', 'Беспозвоночные', 'Внешний склон', '20–85 м', '«Красное дерево рифа» — ребристые бочки до 2 м в высоту, способные прожить более тысячи лет.'],
    anemone: ['Величественная актиния', 'Heteractis magnifica', 'Беспозвоночные', 'Лагуна и Гребень', '2–18 м', 'Хищный полип со стрекательными щупальцами. Надёжный дом для рыб-клоунов, обладающих иммунной слизью.'],
    giant_clam: ['Гигантская тридакна', 'Tridacna gigas', 'Беспозвоночные', 'Лагуна и Гребень', '2–20 м', 'Крупнейший двустворчатый моллюск планеты (до 1.2 м и 250 кг). Иридисцентная мантия сияет благодаря симбиотическим водорослям.'],
    urchin: ['Длинноиглый морской ёж', 'Diadema setosum', 'Беспозвоночные', 'Лагуна и Желоба', '2–28 м', 'Ночной пастбищник рифа: соскребает нитчатые водоросли с камней, расчищая место для оседания молодых кораллов.'],
    starfish_blue: ['Голубая морская звезда Линкия', 'Linckia laevigata', 'Беспозвоночные', 'Лагуна и Трава', '1–18 м', 'Ярко-кобальтовая звезда мелководья, питающаяся бактериальной плёнкой и детритом на поверхности кораллов.'],
    starfish_cots: ['Терновый венец', 'Acanthaster planci', 'Беспозвоночные', 'Гребень рифа', '4–30 м', 'Крупная многолучевая ядовитая звезда, питающаяся живыми полипами кораллов — естественный, но опасный при вспышках хищник.'],
    shell_triton: ['Гигантский тритонов рог', 'Charonia tritonis', 'Беспозвоночные', 'Лагуна и Склон', '4–35 м', 'Редкий крупный хищный моллюск — главный природный враг морских звёзд «терновый венец», защищающий риф.'],

    // Рыбы
    fish_blue: ['Голубой хирург', 'Paracanthurus / Acanthurus', 'Рыбы', 'Гребень и Бомми', '2–24 м', 'Стайный санитар рифа. Выедает водоросли-конкуренты, поддерживая здоровье молодых кораллов.'],
    fish_yellow: ['Жёлтая зебрасома (Танг)', 'Zebrasoma flavescens', 'Рыбы', 'Гребень рифа', '2–22 м', 'Ярко-жёлтая дисковидная рыба с острым хвостовым шипом для защиты от хищников.'],
    fish_silver: ['Серебряная сардинелла', 'Sardinella gibbosa', 'Рыбы', 'Лагуна и Проход', '3–35 м', 'Огромные мерцающие стаи («baitballs»), совершающие молниеносные синхронные манёвры при приближении хищников.'],
    fish_chromis: ['Зелёно-голубой хромис', 'Chromis viridis', 'Рыбы', 'Гребень и Бомми', '1–15 м', 'Изумрудные облака крошечных рыбок, мгновенно ныряющих внутрь ветвей акропор при любой угрозе.'],
    fish_orange: ['Оранжевый амфиприон (Рыба-клоун)', 'Amphiprion ocellaris', 'Рыбы', 'Лагуна и Гребень', '2–16 м', 'Живёт семьями в щупальцах актиний; обменивается защитой от хищников на очистку и питание для актинии.'],
    fish_butterfly: ['Нитеносная рыба-бабочка', 'Chaetodon auriga', 'Рыбы', 'Лагуна и Гребень', '2–20 м', 'Узнаваема по яркой полосатой окраске и ложному «глазку» у хвоста, отвлекающему атаку хищников.'],
    fish_idol: ['Мавританский идол', 'Zanclus cornutus', 'Рыбы', 'Гребень и Склон', '3–35 м', 'Изящная контрастная рыба с длинным белым вымпелом спинного плавника; питается губками в расщелинах.'],
    fish_barracuda: ['Большая барракуда', 'Sphyraena barracuda', 'Рыбы', 'Рифовый проход и Обрыв', '10–60 м', 'Серебристые торпедовидные хищники, образующие гипнотические кружащиеся вихри в глубоких проходах рифа.'],
    fish_parrot: ['Зелёная рыба-попугай', 'Scarus frenatus', 'Рыбы', 'Гребень и Бомми', '2–22 м', 'Клювовидными челюстями соскребает водоросли с мёртвого коралла и перетирает камень в мелкий белый песок острова.'],
    angelfish: ['Императорский ангел', 'Pomacanthus imperator', 'Рыбы', 'Бомми и Склон', '4–35 м', 'Величественная одиночная рыба с сине-золотыми полосами, охраняющая свой участок рифовой стены.'],
    lionfish: ['Крылатка-зебра', 'Pterois volitans', 'Рыбы', 'Голубая дыра и Склон', '12–55 м', 'Эффектный ночной хищник с веером ядовитых полосатых плавников, загоняющий добычу под карстовые карнизы.'],
    moray: ['Гигантская мурена', 'Gymnothorax javanicus', 'Рыбы', 'Голубая дыра и Склон', '8–50 м', 'Крупнейшая мурена Индо-Пацифики длиной до 3 м. Прячется в расщелинах днём и охотится ночью.'],
    fish_lantern: ['Рыба-фонарик (Фонареглаз)', 'Photoblepharon palpebratum', 'Рыбы', 'Голубая дыра и Склон', '15–65 м', 'Ночная рифовая рыба с биолюминесцентными подглазничными органами; днём прячется в гротах, а ночью поднимается на охоту вдоль склонов и Голубой дыры.'],

    // Мегафауна и необычные существа
    octopus: ['Дневной рифовый осьминог', 'Octopus cyanea', 'Мегафауна', 'Лагуна и Склон', '4–32 м', 'Интеллектуал рифа, способный мгновенно менять цвет и текстуру кожи, сливаясь с кораллами.'],
    ray_spotted: ['Синепятнистый хвостокол', 'Taeniura lymma', 'Мегафауна', 'Лагуна и Трава', '2–20 м', 'Скат с электрически-синими пятнами, скользящий над самым песком в поисках моллюсков и червей.'],
    ray_eagle: ['Пятнистый орляк', 'Aetobatus narinari', 'Мегафауна', 'Рифовый проход', '10–45 м', 'Элегантный пелагический скат с длинным хвостом и острыми крыльями, «летящий» сквозь течения прохода.'],
    dugong: ['Дюгонь', 'Dugong dugon', 'Мегафауна', 'Луга морской травы', '3–12 м', 'Уникальное морское млекопитающее («морская корова») с мягкой губой-хоботком; проводит день на лугах морской травы.'],
    turtle: ['Зелёная морская черепаха', 'Chelonia mydas', 'Мегафауна', 'Трава и Лагуна', '1–25 м', 'Древний рептильный странник океана, регулярно всплывающий за воздухом и пасущийся на мелководье.'],
    shark_reef: ['Темнопёрая рифовая акула', 'Carcharhinus amblyrhynchos', 'Мегафауна', 'Внешний склон и Обрыв', '18–75 м', 'Стремительный хищник патрулирует границу внешнего барьера и вход в Голубую дыру, поддерживая баланс экосистемы.'],
    manta: ['Гигантский океанический манта', 'Mobula alfredi / birostris', 'Мегафауна', 'Стена внешнего барьера', '8–65 м', 'Безопасный планктонофаг с размахом крыльев до 6–7 м; парит в восходящих потоках вдоль отвесной стены.'],
    shark_whale: ['Китовая акула', 'Rhincodon typus', 'Мегафауна', 'Бездна Кораллового моря', '15–80 м', 'Крупнейшая рыба планеты (до 12 м), медленно фильтрующая планктон и личинки кораллов вдоль внешнего обрыва.'],
    whale_humpback: ['Горбатый кит', 'Megaptera novaeangliae', 'Мегафауна', 'Коралловое море', '20–90 м', 'Зимой мигрирует из Антарктики в тёплые воды Большого Барьерного рифа; знаменит сложными подводными песнями.'],
    jelly: ['Ушастая медуза', 'Aurelia aurita', 'Мегафауна', 'Лагуна и Толща воды', '2–35 м', 'Пульсирующий полупрозрачный купол дрейфует в толще воды, собирая микроскопический планктон.'],
    jelly_deep: ['Биолюминесцентная медуза бездны', 'Chrysaora / Deep Medusae', 'Мегафауна', 'Голубая дыра и Обрыв', '30–140 м', 'Светится холодным неоново-лиловым и лазурным светом в сумраке глубин и по ночам.'],
    research_vessel: ['НИС «Коралловый Исследователь»', 'Oceanographic R/V (50 м)', 'Экспедиция', 'Поверхность Кораллового моря', '+18 .. -3 м', 'Плавучая научная база с вертолётной палубой, лабораториями и кормовым А-краном спуска ROV и зондов CTD.'],
    seabird: ['Тропическая фаэтонка / Олуша', 'Phaethon / Sula leucogaster', 'Птицы', 'Небо над лагуной и островком', '+1 .. +20 м', 'Морские птицы Кораллового моря, парящие в пассатах и пикирующие в стаи сардин у гребня рифа.'],
    dolphin: ['Длиннорылый продельфин', 'Stenella longirostris', 'Мегафауна', 'Поверхность лагуны и прохода', '+2.5 .. -8 м', 'Быстрые акробаты тропических вод, выпрыгивающие каскадами из волны у борта научного судна.'],
    flying_fish: ['Тропическая летучая рыба', 'Exocoetus volitans', 'Рыбы', 'Поверхность открытого прохода', '+1.5 .. -2 м', 'Выпрыгивает из-под волны и планирует до 200 метров над водой на широких переливающихся грудных плавниках-крыльях.']
  };

  /* ---- Сценарий автоматического тура по всему Большому Барьерному рифу ---- */
  const _tourRaw = [
    { pos: [-775 + shelfOffset(-120), -1.8, -110], look: [-855 + shelfOffset(-120), -1.2, -135], title: 'Мангровые отмели побережья', duration: 9,
      fact: 'Арочные корни красных мангров опресняют морскую воду, задерживают ил с берега и укрывают миллионы мальков рифовых рыб.' },
    { pos: [-535 + shelfOffset(85), -4.5, 95], look: [-585 + shelfOffset(85), -7.5, 70], title: 'Луга морской травы и дюгони', duration: 9,
      fact: 'Морская трава — единственные цветковые растения океана. Один взрослый дюгонь съедает до 40 кг её сочных побегов за сутки.' },
    { pos: [CAY_X + 76, 1.8, CAY_Z + 62], look: [CAY_X, 0.4, CAY_Z], title: 'Песчаный островок и бирюзовая лагуна', duration: 9,
      fact: 'Белоснежный коралловый песок на этом островке в значительной мере переработан рыбами-попугаями, дробящими старый известняк.' },
    { pos: [(BOMMIES[0] ? BOMMIES[0].x : -140) + 34, -8.5, (BOMMIES[0] ? BOMMIES[0].z : 60) + 26], look: [BOMMIES[0] ? BOMMIES[0].x : -140, -10.5, BOMMIES[0] ? BOMMIES[0].z : 60], title: 'Коралловые бомми лагуны', duration: 9,
      fact: 'Массивные башни Porites растут всего на 1 см в год — перед вами живые карбонатные соборы возрастом более 600 лет.' },
    { pos: [148 + shelfOffset(20), -5.8, 22], look: [205 + shelfOffset(20), -11.5, -5], title: 'Гребень рифа и желоба прибоя', duration: 9,
      fact: 'Глубокие желоба spur-and-groove рассеивают разрушительную энергию тихоокеанского наката, спасая хрупкую лагуну.' },
    { pos: [345 + shelfOffset(245), -18.5, passCenterZ(345 + shelfOffset(245)) + 16], look: [430 + shelfOffset(245), -24.0, passCenterZ(430 + shelfOffset(245))], title: 'Рифовый проход и вихрь барракуд', duration: 9,
      fact: 'Стремительные приливы прогоняют через проход миллионы тонн планктона, притягивая барракуд, орляков и манту.' },
    { pos: [BLUE_HOLE_X + 26, -18.0, BLUE_HOLE_Z + 22], look: [BLUE_HOLE_X, -54.0, BLUE_HOLE_Z], title: 'Погружение в Голубую дыру (-88 м)', duration: 10,
      fact: 'Этот 88-метровый карстовый провал возник как известняковая пещера во время Ледникового периода, когда океан был на 120 м ниже.' },
    { pos: [655 + shelfOffset(-60), -34.0, -65], look: [565 + shelfOffset(-60), -46.0, -60], title: 'Отвесная стена в бездну Кораллового моря', duration: 10,
      fact: 'Внешний барьер обрывается в абиссаль Кораллового моря; зимой вдоль этой стены мигрируют горбатые киты и китовые акулы.' }
  ];

  const TOUR_LEGS = _tourRaw.map((leg) => ({
    pos: [leg.pos[0], safeSpotY(leg.pos[0], leg.pos[2], leg.pos[1], 3.2), leg.pos[2]],
    look: leg.look,
    title: leg.title,
    fact: leg.fact,
    duration: leg.duration
  }));

  /* ---- Экологический план фауны биома (для OC.FaunaEngine) ---- */
  const bom0 = BOMMIES[0] || { x: -140, z: 60 };
  const bom1 = BOMMIES[1] || { x: -195, z: -85 };
  const CLEANING_STATIONS = [
    { id: 'bommie_station', x: bom0.x + 12, y: -6.5, z: bom0.z - 8, radius: 20 },
    { id: 'crest_station', x: 155 + shelfOffset(20), y: -6.0, z: 20, radius: 22 }
  ];

  const FAUNA_PLAN = {
    cleaningStations: CLEANING_STATIONS,
    schools: [
      { key: 'fish_blue', n: 38, cx: -60 + shelfOffset(40), cz: 40, radius: 34, yDepth: -7, spread: 10, speed: 6.5, diel: 'diurnal', shyness: 0.9,
        geoOpts: { len: 1.15, height: 0.56, width: 0.2, colA: 0x1d7ed8, colB: 0x72c8ff, finCol: 0xffe44d, tailH: 0.72 } },
      { key: 'fish_blue', n: 42, cx: 145 + shelfOffset(-40), cz: -40, radius: 42, yDepth: -6, spread: 12, speed: 7.2, diel: 'diurnal', shyness: 0.9,
        geoOpts: { len: 1.15, height: 0.56, width: 0.2, colA: 0x1d7ed8, colB: 0x72c8ff, finCol: 0xffe44d, tailH: 0.72 } },
      { key: 'fish_yellow', n: 32, cx: 95 + shelfOffset(120), cz: 120, radius: 36, yDepth: -5.5, spread: 9, speed: 5.5, diel: 'diurnal', shyness: 0.65,
        geoOpts: { len: 1.25, height: 0.88, width: 0.2, colA: 0xffc61a, colB: 0xfff3a8, finCol: 0xffa800, tailH: 0.52 } },
      { key: 'fish_yellow', n: 28, cx: 180 + shelfOffset(-190), cz: -190, radius: 32, yDepth: -8, spread: 9, speed: 5.8, diel: 'diurnal', shyness: 0.65,
        geoOpts: { len: 1.25, height: 0.88, width: 0.2, colA: 0xffc61a, colB: 0xfff3a8, finCol: 0xffa800, tailH: 0.52 } },
      { key: 'fish_silver', n: 75, cx: 345 + shelfOffset(245), cz: passCenterZ(345 + shelfOffset(245)), radius: 28, yDepth: -14, spread: 11, speed: 9.5, scale: 0.85, diel: 'cathemeral', shyness: 1.35,
        geoOpts: { len: 0.95, height: 0.32, width: 0.14, colA: 0x90b4c8, colB: 0xedf8ff, finCol: 0xb2cbd9, tailH: 0.85 } },
      { key: 'fish_silver', n: 65, cx: -120 + shelfOffset(-120), cz: -120, radius: 44, yDepth: -9, spread: 13, speed: 8.8, scale: 0.85, diel: 'cathemeral', shyness: 1.35,
        geoOpts: { len: 0.95, height: 0.32, width: 0.14, colA: 0x90b4c8, colB: 0xedf8ff, finCol: 0xb2cbd9, tailH: 0.85 } },
      { key: 'fish_chromis', n: 55, cx: 80 + shelfOffset(10), cz: 10, radius: 18, yDepth: -4.2, spread: 7, speed: 4.5, scale: 0.65, diel: 'diurnal', shyness: 1.15, cleaner: true,
        geoOpts: { len: 0.85, height: 0.4, width: 0.16, colA: 0x38d8c8, colB: 0xb8fff6, finCol: 0x6ce8dc } },
      { key: 'fish_chromis', n: 48, cx: bom0.x, cz: bom0.z, radius: 20, yDepth: -6.5, spread: 7, speed: 4.2, scale: 0.65, diel: 'diurnal', shyness: 1.15, cleaner: true,
        geoOpts: { len: 0.85, height: 0.4, width: 0.16, colA: 0x38d8c8, colB: 0xb8fff6, finCol: 0x6ce8dc } },
      { key: 'fish_orange', n: 16, cx: -20 + shelfOffset(45), cz: 45, radius: 9, yDepth: -7.5, spread: 3.6, speed: 3.4, scale: 0.85, diel: 'diurnal', curious: 0.55, hostAnemone: true,
        geoOpts: { len: 0.95, height: 0.52, width: 0.22, colA: 0xff5a1f, colB: 0xffffff, finCol: 0xff8a30, stripes: 1.0 } },
      { key: 'fish_orange', n: 14, cx: CAY_X + 88, cz: CAY_Z + 40, radius: 8, yDepth: -3.5, spread: 3.4, speed: 3.2, scale: 0.85, diel: 'diurnal', curious: 0.55, hostAnemone: true,
        geoOpts: { len: 0.95, height: 0.52, width: 0.22, colA: 0xff5a1f, colB: 0xffffff, finCol: 0xff8a30, stripes: 1.0 } },
      { key: 'fish_butterfly', n: 18, cx: 110 + shelfOffset(50), cz: 50, radius: 26, yDepth: -5.5, spread: 9, speed: 4.2, scale: 0.9, diel: 'diurnal', curious: 0.65, cleaner: true,
        geoOpts: { len: 1.0, height: 0.85, width: 0.16, colA: 0xffe44d, colB: 0x1a1a22, finCol: 0xffffff, stripes: 1.0 } },
      { key: 'fish_idol', n: 14, cx: 210 + shelfOffset(-40), cz: -40, radius: 30, yDepth: -9.5, spread: 8, speed: 4.8, scale: 1.0, diel: 'diurnal', curious: 0.5,
        geoOpts: { len: 1.05, height: 0.88, width: 0.16, colA: 0x181c24, colB: 0xffdc4d, finCol: 0xffffff, stripes: 1.0, streamer: true } },
      { key: 'fish_barracuda', n: 28, cx: 440 + shelfOffset(240), cz: passCenterZ(440 + shelfOffset(240)), radius: 22, yDepth: -22, spread: 8, speed: 7.5, scale: 1.35, diel: 'cathemeral', isPredator: true,
        geoOpts: { len: 2.3, height: 0.36, width: 0.24, colA: 0x5c7382, colB: 0xdcebf2, finCol: 0x455866, tailH: 0.9 } },
      { key: 'fish_parrot', n: 16, cx: 135 + shelfOffset(15), cz: 15, radius: 28, yDepth: -6.5, spread: 10, speed: 4.6, scale: 1.15, diel: 'diurnal', curious: 0.4,
        geoOpts: { len: 1.5, height: 0.62, width: 0.28, colA: 0x26c6a8, colB: 0xff7aa8, finCol: 0x52e0c4, tailH: 0.6 } },
      { key: 'fish_lantern', n: 36, cx: BLUE_HOLE_X + 4, cz: BLUE_HOLE_Z - 4, radius: 24, yDepth: -38, spread: 9, speed: 4.8, scale: 0.88, diel: 'nocturnal', biolum: true, shyness: 0.75,
        geoOpts: { len: 0.9, height: 0.38, width: 0.16, colA: 0x162844, colB: 0x5af5ff, finCol: 0x3ad4ff, eyeScale: 1.45 } },
      { key: 'fish_lantern', n: 32, cx: 585 + shelfOffset(-65), cz: -65, radius: 34, yDepth: -46, spread: 11, speed: 5.0, scale: 0.9, diel: 'nocturnal', biolum: true, shyness: 0.75,
        geoOpts: { len: 0.9, height: 0.38, width: 0.16, colA: 0x162844, colB: 0x5af5ff, finCol: 0x3ad4ff, eyeScale: 1.45 } }
    ],
    soloFish: [0, 1, 2, 3, 4, 5].map((i) => {
      const z = -300 + i * 120;
      return {
        key: 'angelfish', cx: 60 + shelfOffset(z), cz: z, r: 16 + (i % 3) * 5, y: -7 - (i % 3) * 3, speed: 2.2, scale: 1.1,
        diel: 'diurnal', curious: true,
        geoOpts: { len: 1.8, height: 0.92, width: 0.3, colA: 0x2255c8, colB: 0xffe14d, finCol: 0x55aaff, stripes: 1.0 }
      };
    }),
    lionfish: [
      { cx: BLUE_HOLE_X + 28, cz: BLUE_HOLE_Z - 16, r: 9, y: -26, scale: 1.15 },
      { cx: BLUE_HOLE_X - 24, cz: BLUE_HOLE_Z + 22, r: 10, y: -38, scale: 1.1 },
      { cx: 420 + shelfOffset(120), cz: 120, r: 12, y: -25, scale: 1.1 }
    ],
    octopus: [
      { x: -110 + shelfOffset(60), z: 60, scale: 1.05 },
      { x: 185 + shelfOffset(-85), z: -85, scale: 1.15 },
      { x: 375 + shelfOffset(210), z: passCenterZ(375 + shelfOffset(210)) + 26, scale: 1.1 }
    ],
    moray: [
      { x: BLUE_HOLE_X + 36, z: BLUE_HOLE_Z + 18 },
      { x: 320 + shelfOffset(-60), z: -60 },
      { x: bom1.x + 10, z: bom1.z - 8 }
    ],
    jellies: (function () {
      const list = [];
      const jHues = [0.82, 0.74, 0.91, 0.62, 0.87, 0.70, 0.78, 0.94];
      for (let i = 0; i < 10; i++) {
        const z = -420 + i * 95;
        const x = (-180 + (i % 4) * 130) + shelfOffset(z);
        list.push({ x, z, y: -5 - (i % 4) * 3.5, hue: jHues[i % jHues.length], size: 0.95 + (i % 3) * 0.25, deep: false });
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28;
        list.push({
          x: BLUE_HOLE_X + Math.cos(a) * 18, z: BLUE_HOLE_Z + Math.sin(a) * 18,
          y: -26 - i * 8, hue: 0.76 + (i % 3) * 0.08, size: 1.2 + (i % 2) * 0.35, deep: true
        });
      }
      for (let i = 0; i < 4; i++) {
        const z = -220 + i * 160;
        list.push({ x: 640 + shelfOffset(z), z, y: -42 - i * 10, hue: 0.56 + i * 0.1, size: 1.4, deep: true });
      }
      return list;
    })(),
    dugongs: [
      { cx: -555 + shelfOffset(90), cz: 90, r: 28, scale: 1.15 },
      { cx: -595 + shelfOffset(-140), cz: -140, r: 34, scale: 1.0 }
    ],
    turtles: [
      { cx: -520 + shelfOffset(60), cz: 60, r: 35, y: -5.5, size: 0.8 },
      { cx: CAY_X + 65, cz: CAY_Z + 45, r: 28, y: -3.2, size: 0.75 },
      { cx: 115 + shelfOffset(20), cz: 20, r: 38, y: -5.5, size: 0.85 },
      { cx: -150 + shelfOffset(-220), cz: -220, r: 42, y: -9.0, size: 0.65 }
    ],
    rays: [
      { cx: -480 + shelfOffset(120), cz: 120, r: 24, speed: 2.0, eagle: false },
      { cx: -180 + shelfOffset(150), cz: 150, r: 32, speed: 2.2, eagle: false },
      { cx: CAY_X + 95, cz: CAY_Z - 55, r: 22, speed: 1.9, eagle: false },
      { cx: 360 + shelfOffset(245), cz: passCenterZ(360 + shelfOffset(245)), r: 28, y: -15, speed: 3.4, eagle: true },
      { cx: 470 + shelfOffset(230), cz: passCenterZ(470 + shelfOffset(230)), r: 32, y: -20, speed: 3.8, eagle: true }
    ],
    mantas: [
      { cx: 615 + shelfOffset(-40), cz: -40, r: 58, y: -26, span: 11, size: 0.75, speed: 4.2 },
      { cx: 645 + shelfOffset(180), cz: 180, r: 52, y: -32, span: 9.5, size: 0.7, speed: 4.6 },
      { cx: 380 + shelfOffset(245), cz: passCenterZ(380 + shelfOffset(245)), r: 45, y: -16, span: 9, size: 0.68, speed: 4.0 }
    ],
    sharks: [
      { cx: BLUE_HOLE_X, cz: BLUE_HOLE_Z, r: 54, y: -18, speed: 4.8 },
      { cx: 590 + shelfOffset(-120), cz: -120, r: 65, y: -32, speed: 5.2 },
      { cx: 625 + shelfOffset(140), cz: 140, r: 62, y: -38, speed: 5.5 },
      { cx: 390 + shelfOffset(240), cz: passCenterZ(390 + shelfOffset(240)), r: 44, y: -22, speed: 4.9 },
      { cx: 700 + shelfOffset(-40), cz: -40, r: 95, y: -36, speed: 3.2, whaleShark: true }
    ],
    whales: [
      { cx: 840 + shelfOffset(20), cz: 20, r: 145, y: -48, speed: 3.6 }
    ],
    vessels: [
      { x: 320 + shelfOffset(-65), z: -65, yaw: 0.62, variant: 'tropical', name: 'НИС «Коралловый Исследователь»' }
    ],
    seabirds: [
      { cx: CAY_X, cz: CAY_Z, r: 72, y: 11.5, speed: 11.8, count: 8, variant: 'tropical' },
      { cx: 320 + shelfOffset(-65), cz: -65, r: 58, y: 14.5, speed: 10.6, count: 6, variant: 'tropical' }
    ],
    dolphins: [
      { cx: 340 + shelfOffset(110), cz: 110, r: 85, speed: 7.8, count: 4, variant: 'spinner' },
      { cx: CAY_X + 125, cz: CAY_Z + 80, r: 64, speed: 7.4, count: 3, variant: 'spinner' }
    ],
    flyingFish: [
      { cx: 380 + shelfOffset(-120), cz: -120, r: 44, speed: 9.6, count: 8 },
      { cx: 520 + shelfOffset(90), cz: 90, r: 48, speed: 9.8, count: 7 }
    ]
  };

  OC.Biomes.register({
    id: 'great_barrier_reef',
    name: 'Большой Барьерный риф',
    region: 'Тихий океан · Коралловое море',
    subtitle: 'Реалистичная география шельфа от мангров до бездны · 2.4 × 2.4 км',
    globe: {
      lat: -16.8, lon: 146.2, coordLabel: '16.8° ю.ш., 146.2° в.д.',
      ocean: 'Коралловое море · Австралия', depthSpan: '0 – 168 м', tempSpan: '21 – 29 °C', color: '#45e0d4',
      summary: 'Крупнейшая живая структура Земли: мангры, песчаный островок, 88-метровая Голубая дыра и миграции горбатых китов.'
    },
    worldRadius: WORLD_RADIUS,
    chunkSize: CHUNK_SIZE,
    seaLevel: 0,
    spawn: {
      pos: [SPAWN_X, SPAWN_Y, SPAWN_Z],
      yaw: 2.25,
      pitch: -0.14
    },
    zones: ZONES,
    landmarks: LANDMARKS,
    tourLegs: TOUR_LEGS,
    bommies: BOMMIES,
    blueHole: { x: BLUE_HOLE_X, z: BLUE_HOLE_Z, depth: -88, radius: 52 },
    sandCay: { x: CAY_X, z: CAY_Z },
    shelfOffset,
    passCenterZ,
    getHeight,
    getZoneAt,
    getTerrainColor,
    getOpticalProfile,
    getCurrentAt,
    generateChunkFlora,
    faunaPlan: FAUNA_PLAN,
    encyclopedia: ENCYCLOPEDIA
  });
})(window.OC);
