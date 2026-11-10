/* ================= БИОМ: АТОЛЛ ПАЛАУ И ЗАТОНУВШИЙ КОРАБЛЬ ================= */
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

  const ZONES = [
    {
      id: 'atoll_islands',
      name: 'Грибовидные острова атолла',
      shortName: 'Острова атолла',
      color: '#5ec9a8',
      depthLabel: '0 – 8 м',
      tempC: 28.9,
      description: 'Известняковые островки Палау с подмытыми водой гротами, кокосовыми пальмами и бирюзовой каймой рифа.'
    },
    {
      id: 'sargassum_lagoon',
      name: 'Лагуна и саргассовы сады',
      shortName: 'Лагуна саргасса',
      color: '#d4a63a',
      depthLabel: '5 – 19 м',
      tempC: 28.2,
      description: 'Укрытая солнечная лагуна с золотыми медузами Палау, садами бурого саргасса и песчаными дюнами.'
    },
    {
      id: 'wreck_reef',
      name: 'Искусственный риф «SS Maru»',
      shortName: 'Затонувший корабль',
      color: '#d8764a',
      depthLabel: '16 – 30 м',
      tempC: 27.1,
      description: '68-метровый остов затонувшего судна, обросший золотыми веерами, хлыстовыми кораллами и бочковидными губками.'
    },
    {
      id: 'blue_corner_wall',
      name: 'Пролив «Синий угол» и бездна',
      shortName: 'Синий угол',
      color: '#1b6ca8',
      depthLabel: '28 – 96 м',
      tempC: 24.4,
      description: 'Легендарный отвесный свал атолла в Тихом океане с сильным течением, стаями каранксов, мантами и акулами-молотами.'
    }
  ];

  // Грибовидные известняковые островки (Rock Islands of Palau)
  const ROCK_ISLANDS = [
    { x: -340, z: -260, r: 78, h: 6.2 },
    { x: -480, z: 185, r: 66, h: 5.6 },
    { x: -135, z: 425, r: 70, h: 5.9 },
    { x: 220, z: -435, r: 60, h: 5.1 }
  ];

  const WRECK_POS = { x: 148, z: -42 };

  function wallCurveOffset(z) {
    return Math.sin(z * 0.0026 + 0.4) * 85 + Math.cos(z * 0.0058) * 34;
  }

  function getHeight(x, z) {
    const wx = x - wallCurveOffset(z);

    // Внешний кольцевой барьер атолла разделяет западную лагуну и восточный обрыв «Синий угол»
    let h = -12.5;
    if (wx < -520) {
      // Внешняя западная отмель атолла переходит в коралловую гряду
      const t = OC.smoothstep(-960, -520, wx);
      h = OC.lerp(-24.0, -11.5, t);
    } else if (wx < 85) {
      // Солнечная лагуна (-10 .. -18 м)
      const bowl = OC.smoothstep(-520, -150, wx) * OC.smoothstep(95, -80, wx);
      h = -11.0 - bowl * 5.2;
    } else if (wx < 295) {
      // Широкая песчаная банка крушения (-21 .. -26 м) перед кромкой обрыва
      const t = OC.smoothstep(85, 295, wx);
      h = OC.lerp(-16.0, -26.5, t);
    } else if (wx < 560) {
      // Отвесный свал «Синий угол» (-26.5 м -> -84 м)
      const t = OC.smoothstep(295, 560, wx);
      const ledge = Math.sin(t * Math.PI * 4) * 1.4 * Math.sin(t * Math.PI);
      h = OC.lerp(-26.5, -84.0, t) + ledge;
    } else {
      // Глубокая тихоокеанская бездна (-84 .. -96 м)
      const t = OC.smoothstep(560, 1150, wx);
      h = OC.lerp(-84.0, -96.0, t);
    }

    // Органический микрорельеф известняка и песчаные волны
    const dunes = Math.sin(x * 0.055 + z * 0.032) * 0.48;
    const mesorelief = OC.fbm2(x * 0.006, z * 0.006, 3) * 3.1 + OC.fbm2(x * 0.025, z * 0.025, 2) * 0.95;
    h += mesorelief + dunes;

    // Неглубокий коралловый гребень на западной кромке лагуны (-560..-420) и у атолла
    const rimDist = Math.abs(wx + 470);
    if (rimDist < 95) {
      h += OC.smoothstep(95, 18, rimDist) * 5.5;
    }

    // Ровная посадочная банка под киль 68-метрового судна «SS Maru»
    const dw = Math.hypot(x - WRECK_POS.x, z - WRECK_POS.z);
    if (dw < 68) {
      const flat = OC.smoothstep(68, 28, dw);
      h = OC.lerp(h, -23.8 + OC.noise2(x * 0.05, z * 0.05) * 0.45, flat);
    }

    // Грибовидные известняковые островки Палау
    for (let i = 0; i < ROCK_ISLANDS.length; i++) {
      const isl = ROCK_ISLANDS[i];
      const d = Math.hypot(x - isl.x, z - isl.z);
      if (d < isl.r * 1.9) {
        const shelf = OC.smoothstep(isl.r * 1.85, isl.r * 0.72, d);
        h = OC.lerp(h, -3.2, shelf * 0.85);
        const peak = OC.smoothstep(isl.r * 0.92, isl.r * 0.18, d);
        const crag = 0.88 + 0.24 * OC.ridged2(x * 0.032 + i, z * 0.032, 2);
        h = Math.max(h, -3.6 + (isl.h + 3.6) * peak * crag);
      }
    }

    return OC.clamp(h, -96.0, 6.4);
  }

  function safeSpotY(x, z, desiredY, clearance) {
    return Math.max(desiredY, getHeight(x, z) + (clearance || 3.4));
  }

  function getZoneAt(x, y, z) {
    const wx = x - wallCurveOffset(z);
    const fl = getHeight(x, z);
    for (let i = 0; i < ROCK_ISLANDS.length; i++) {
      const isl = ROCK_ISLANDS[i];
      if (Math.hypot(x - isl.x, z - isl.z) < isl.r * 1.55) return ZONES[0]; // atoll_islands
    }
    if (fl > -7.2) return ZONES[0];
    if (Math.hypot(x - WRECK_POS.x, z - WRECK_POS.z) < 135 || (wx >= 70 && wx < 280)) return ZONES[2]; // wreck_reef
    if (wx >= 280 || fl < -29.0) return ZONES[3]; // blue_corner_wall
    return ZONES[1]; // sargassum_lagoon
  }

  function getTerrainColor(x, y, z, out) {
    const n = OC.clamp(OC.fbm2(x * 0.04, z * 0.04, 2) * 0.75 + 0.5, 0, 1);
    const dw = Math.hypot(x - WRECK_POS.x, z - WRECK_POS.z);

    if (y > 0.9) {
      // Тропическая зелень наверху грибовидных известняковых островов
      _colA.set(0x3a6e38);
      _colB.set(0x7c8470);
      out.copy(_colB).lerp(_colA, OC.smoothstep(0.9, 2.8, y));
    } else if (y > -1.8) {
      // Светлый коралловый пляж и подмытый известняк
      out.set(0xebdcb8).lerp(_colA.set(0xbba886), n * 0.35);
    } else if (dw < 76) {
      // Песок вокруг крушения с лёгкой ржавой патиной и ракушечником
      out.set(0xc9b892).lerp(_colA.set(0x8e563a), OC.smoothstep(76, 18, dw) * 0.38);
    } else if (y > -24.0) {
      // Тёплый песок лагуны с водорослевыми островками
      _colA.set(0xdfd0a8);
      _colB.set(0x8a8e4c);
      out.copy(_colA).lerp(_colB, OC.smoothstep(0.55, 0.88, n) * 0.45);
    } else {
      // Синеватый известняк обрыва «Синий угол»
      out.set(0x526470).lerp(_colC.set(0x848f82), n * 0.42);
    }
    return out;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const above = y > 0.25;
    if (above) {
      _fogCol.set(0xc2ebfa).lerp(_colA.set(0x0c1b2e), 1 - dayW);
      _waterCol.set(0x19a8b8);
      _skyTop.set(0x3898dc);
      _skyBot.set(0xbbe8fb);
      _aboveHoriz.set(0xd2f2ff).lerp(_colA.set(0x15273e), 1 - dayW);
      return {
        aboveWater: true,
        fogColor: _fogCol,
        fogDensity: 0.0004,
        causticStrength: 0,
        rayStrength: 0,
        sunAtten: 1.0,
        bioGlow: 0,
        waterColor: _waterCol,
        aboveHoriz: _aboveHoriz
      };
    }

    const depth = Math.max(0, -y);
    const wx = x - wallCurveOffset(z);
    const dropW = OC.smoothstep(180, 440, wx);
    const lagW = 1 - dropW;
    const atten = Math.exp(-depth * 0.025);

    // Прозрачная бирюза в лагуне саргасса, королевский сапфир на стене «Синий угол»
    _colA.set(0x18a69e).lerp(_colB.set(0x0d5898), dropW);
    _colA.lerp(_colC.set(0x041834), OC.clamp(depth / 85, 0, 0.88));
    _fogCol.copy(_colA).multiplyScalar(0.16 + 0.84 * dayW);

    _waterCol.set(0x32d4c2).lerp(_colB.set(0x186bb2), dropW);
    _skyTop.set(0x66e8d4).lerp(_colB.set(0x174878), 1 - dayW);
    _skyBot.set(0x03182e);
    _aboveHoriz.set(0xb6eafa).lerp(_colB.set(0x142640), 1 - dayW);

    const fogDensity = OC.lerp(0.0052, 0.0094, OC.clamp(depth / 75, 0, 1)) * OC.lerp(0.95, 1.08, lagW);
    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity,
      causticStrength: OC.clamp(atten * 0.96 * dayW, 0, 1.0),
      rayStrength: OC.clamp(Math.exp(-depth * 0.036) * 1.08 * dayW, 0, 1.0),
      sunAtten: atten,
      bioGlow: OC.clamp((1 - dayW) * 0.9 + OC.smoothstep(38, 82, depth) * 0.55, 0, 1),
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz,
      fillAColor: _colB.set(0x46dfc8),
      fillBColor: _colC.set(0xefc074)
    };
  }

  /* ---- Приливное течение пролива «Синий угол» (+Z / -Z и турбулентность у остова) ---- */
  function getCurrentAt(x, y, z, time, out) {
    if (!out) out = new T.Vector3();
    out.set(0, 0, 0);
    if (y > 0.25) return out;

    const wx = x - wallCurveOffset(z);
    const fl = getHeight(x, z);
    const clearance = Math.max(0, y - fl);
    const shelter = OC.smoothstep(0.6, 4.8, clearance);

    // Мощный океанический поток вдоль стены Синего угла
    const wallJet = OC.smoothstep(230, 420, wx) * (1.55 + 0.35 * Math.sin(time * 0.12));
    out.z += wallJet;
    out.x += Math.sin(z * 0.02 + time * 0.3) * 0.22 * OC.smoothstep(240, 400, wx);

    // Мягкий приливный дрейф в лагуне и вихревое обтекание остова судна
    const dw = Math.hypot(x - WRECK_POS.x, z - WRECK_POS.z);
    if (dw < 90) {
      out.z += 0.38;
      out.y += Math.sin(x * 0.08 + time * 0.4) * 0.14;
    }

    out.multiplyScalar(shelter);
    return out;
  }

  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const items = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;
    const midX = x0 + chunkSize * 0.5;
    const midZ = z0 + chunkSize * 0.5;
    const hMid = getHeight(midX, midZ);
    if (hMid < -72) return items;

    function add(species, x, z, scale, tint) {
      const y = getHeight(x, z);
      items.push({ species, x, y: y - 0.08, z, ry: rng() * 6.283, scale, tint: tint || 0xffffff });
    }

    // 1. Пальмы и мангры на грибовидных островках Палау
    for (let i = 0; i < ROCK_ISLANDS.length; i++) {
      const isl = ROCK_ISLANDS[i];
      if (isl.x >= x0 - 95 && isl.x <= x0 + chunkSize + 95 && isl.z >= z0 - 95 && isl.z <= z0 + chunkSize + 95) {
        const pCount = Math.round(6 * density);
        for (let k = 0; k < pCount; k++) {
          const a = rng() * 6.283;
          const r = rng() * isl.r * 0.52;
          const px = isl.x + Math.cos(a) * r;
          const pz = isl.z + Math.sin(a) * r;
          if (px >= x0 && px < x0 + chunkSize && pz >= z0 && pz < z0 + chunkSize && getHeight(px, pz) > 1.2) {
            add('island_palm', px, pz, OC.lerp(0.85, 1.35, rng()));
          }
        }
      }
    }

    // 2. Якори крушения рядом с «SS Maru» и на песчаных отмелях (жёстко ограничено, чтобы не переполнить пул 160)
    const distChunkWreck = Math.hypot(midX - WRECK_POS.x, midZ - WRECK_POS.z);
    if (distChunkWreck < 240) {
      const aCount = distChunkWreck < 120 ? 3 : 1;
      for (let i = 0; i < aCount; i++) {
        const ax = x0 + (0.2 + 0.6 * rng()) * chunkSize;
        const az = z0 + (0.2 + 0.6 * rng()) * chunkSize;
        const ay = getHeight(ax, az);
        if (ay > -34 && ay < -8) {
          add('wreck_anchor', ax, az, OC.lerp(0.85, 1.35, rng()));
        }
      }
    }

    // 3. Саргассовы сады в солнечной лагуне + кораллово-губковая зона крушения и стены
    const floraSlots = Math.round(32 * density);
    for (let i = 0; i < floraSlots; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const y = getHeight(x, z);
      const dw = Math.hypot(x - WRECK_POS.x, z - WRECK_POS.z);
      const wx = x - wallCurveOffset(z);

      if (y > 0.1 && y < 1.8 && rng() < 0.25) {
        add('mangrove', x, z, OC.lerp(0.7, 1.1, rng()));
        continue;
      }
      if (y < -62 || y > -1.0) continue;

      if (dw < 92) {
        // Обрастание зоны крушения: золотые веера, хлыстовые кораллы, бочковидные губки
        const r = rng();
        if (r < 0.28) add('seafan_gold', x, z, OC.lerp(0.8, 1.4, rng()));
        else if (r < 0.56) add('coral_whip', x, z, OC.lerp(0.8, 1.35, rng()));
        else if (r < 0.78) add('sponge_barrel', x, z, OC.lerp(0.75, 1.3, rng()));
        else add('coral_table', x, z, OC.lerp(0.75, 1.2, rng()));
      } else if (wx < 120 && y > -19.5) {
        // Солнечная лагуна и саргассовы луга
        const patch = OC.fbm2(x * 0.012 + 4.1, z * 0.012 - 2.3, 2);
        const r = rng();
        if (patch > -0.15 && r < 0.45) add('sargassum', x, z, OC.lerp(0.78, 1.28, rng()));
        else if (r < 0.65) add('seagrass', x, z, OC.lerp(0.85, 1.3, rng()));
        else if (r < 0.80) add('giant_clam', x, z, OC.lerp(0.7, 1.2, rng()));
        else if (r < 0.91) add('coral_staghorn', x, z, OC.lerp(0.7, 1.25, rng()));
        else add('coral_brain', x, z, OC.lerp(0.7, 1.15, rng()));
      } else if (y < -30) {
        // Глубокий склон «Синего угла»: хлыстовые кораллы, чёрные кораллы, золотые веера, криноидеи
        const r = rng();
        if (r < 0.34) add('coral_whip', x, z, OC.lerp(0.85, 1.4, rng()));
        else if (r < 0.62) add('seafan_gold', x, z, OC.lerp(0.85, 1.35, rng()));
        else if (r < 0.84) add('coral_black', x, z, OC.lerp(0.75, 1.25, rng()));
        else add('crinoid', x, z, OC.lerp(0.8, 1.3, rng()));
      } else {
        // Кромка рифа между лагуной и обрывом
        const r = rng();
        if (r < 0.25) add('coral_table', x, z, OC.lerp(0.8, 1.3, rng()));
        else if (r < 0.48) add('coral_staghorn', x, z, OC.lerp(0.8, 1.25, rng()));
        else if (r < 0.68) add('coral_soft', x, z, OC.lerp(0.8, 1.2, rng()));
        else if (r < 0.84) add('coral_fan', x, z, OC.lerp(0.85, 1.35, rng()));
        else add('sponge_barrel', x, z, OC.lerp(0.8, 1.25, rng()));
      }
    }

    return items;
  }

  const _lmRaw = [
    {
      id: 'sunken_ship',
      name: 'Затонувший «SS Maru»',
      zoneId: 'wreck_reef',
      x: WRECK_POS.x - 42,
      y: -14.5,
      z: WRECK_POS.z + 24,
      yaw: 2.38,
      pitch: -0.14,
      clearance: 4.0,
      description: '68-метровый остов судна «SS Maru» с открытым трюмом, мостиком, мачтами и бронзовым винтом.'
    },
    {
      id: 'rock_islands',
      name: 'Грибовидные острова',
      zoneId: 'atoll_islands',
      x: ROCK_ISLANDS[0].x + 92,
      y: -3.2,
      z: ROCK_ISLANDS[0].z + 18,
      yaw: 1.45,
      pitch: 0.04,
      clearance: 3.0,
      description: 'Живописные известняковые скалы Палау с пальмами, мангровыми отмелями и гротами под водой.'
    },
    {
      id: 'jellyfish_lagoon',
      name: 'Лагуна золотых медуз',
      zoneId: 'sargassum_lagoon',
      x: -210,
      y: -7.5,
      z: 95,
      yaw: 0.75,
      pitch: -0.05,
      clearance: 3.5,
      description: 'Солнечная бухта атолла, где в тёплой воде парят тысячи нежалящих золотых медуз Mastigias papua.'
    },
    {
      id: 'sargassum_gardens',
      name: 'Саргассовы сады',
      zoneId: 'sargassum_lagoon',
      x: -35,
      y: -10.5,
      z: 210,
      yaw: -0.65,
      pitch: -0.10,
      clearance: 3.5,
      description: 'Золотистые поля саргассовых водорослей и коралловых тридакн в сердце микронезийской лагуны.'
    },
    {
      id: 'blue_corner',
      name: 'Стена «Синий угол»',
      zoneId: 'blue_corner_wall',
      x: 410,
      y: -25.0,
      z: -20,
      yaw: -1.48,
      pitch: -0.18,
      clearance: 5.0,
      description: 'Знаменитый отвесный обрыв Палау: станция чистки мант, вихри каранксов и охота акул-молотов.'
    }
  ];

  const landmarks = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: Math.min(2.0, safeSpotY(lm.x, lm.z, lm.y, lm.clearance))
  }));

  const spawnX = landmarks[0].x;
  const spawnZ = landmarks[0].z;
  const spawnY = Math.min(-3.5, safeSpotY(spawnX, spawnZ, -14.5, 4.0));

  const _tourRaw = [
    { x: spawnX, y: -14.5, z: spawnZ, lx: WRECK_POS.x, ly: -20, lz: WRECK_POS.z, title: 'Затонувший корабль «SS Maru»', duration: 10 },
    { x: landmarks[1].x, y: -3.2, z: landmarks[1].z, lx: ROCK_ISLANDS[0].x, ly: 2.0, lz: ROCK_ISLANDS[0].z, title: 'Грибовидные острова Палау', duration: 9 },
    { x: landmarks[2].x, y: -7.5, z: landmarks[2].z, lx: landmarks[2].x + 25, ly: -7.5, lz: landmarks[2].z + 18, title: 'Лагуна золотых медуз', duration: 9 },
    { x: landmarks[3].x, y: -10.5, z: landmarks[3].z, lx: landmarks[3].x - 30, ly: -13, lz: landmarks[3].z - 25, title: 'Золотистые саргассовы сады', duration: 8 },
    { x: landmarks[4].x, y: -25.0, z: landmarks[4].z, lx: 495, ly: -38, lz: -20, title: 'Пролив «Синий угол» и акулы-молоты', duration: 10 }
  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, Math.min(2.0, safeSpotY(leg.x, leg.z, leg.y, 3.8)), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    floor: ['Известняковый шельф Палау', 'Архипелаг Палау', 'Геология', 'Все зоны', '0 – 96 м',
      'Древний коралловый известняк и светлый арагонитовый песок атолла, образующий грибовидные острова, лагуну и крутую стену пролива.'],
    shipwreck: ['Затонувшее судно «SS Maru»', 'Искусственный риф (68 м)', 'Артефакты', 'Затонувший корабль', '16 – 28 м',
      'Лежащий с креном 68-метровый стальной корпус судна с открытым грузовым трюмом, капитанским мостиком, мачтами и бронзовым винтом — центр жизни рифа.'],
    wreck_anchor: ['Кованый адмиралтейский якорь', 'Якорь и цепь крушения', 'Артефакты', 'Затонувший корабль', '12 – 34 м',
      'Массивный железный якорь с поперечиной-штоком, покрытый ржавчиной, патиной и наростами рифовых кораллов.'],
    sargassum: ['Саргассовы водоросли', 'Sargassum polycystum', 'Флора', 'Лагуна саргасса', '2 – 20 м',
      'Золотисто-оливковые бурые водоросли с миниатюрными газовыми пузырьками-ягодками, создающие густые подводные луга в лагуне.'],
    coral_whip: ['Спиральный хлыстовой коралл', 'Cirrhipathes spiralis', 'Кораллы', 'Затонувший корабль', '15 – 75 м',
      'Яркие оранжево-золотые неветвящиеся горгонарии, закручивающиеся тугой спиралью на течении вдоль стенок корабля и обрыва.'],
    seafan_gold: ['Золотой веер крушений', 'Annella mollis', 'Кораллы', 'Затонувший корабль', '14 – 60 м',
      'Гигантский кружевной горгонариевый веер шафранового оттенка, фильтрующий планктон перпендикулярно потоку воды.'],
    island_palm: ['Островная кокосовая пальма', 'Cocos nucifera', 'Флора', 'Острова атолла', '+1 – +6 м',
      'Изогнутые приморские пальмы на известняковых шапках грибовидных островков Микронезии.'],
    mangrove: ['Береговая ризофора', 'Rhizophora stylosa', 'Флора', 'Острова атолла', '0 – 3 м',
      'Солеустойчивые мангры по берегам скальных островков Палау, укрывающие молодь луцианов и платаксов.'],
    coral_staghorn: ['Ветвистая акропора', 'Acropora cervicornis', 'Кораллы', 'Лагуна саргасса', '2 – 22 м',
      'Хрупкие кусты известкового коралла на коралловой гряде атолла.'],
    coral_table: ['Столовидный коралл', 'Acropora hyacinthus', 'Кораллы', 'Затонувший корабль', '4 – 28 м',
      'Широкие ярусные коралловые столики, обжившие палубу и проломленные борта «SS Maru».'],
    coral_brain: ['Мозговой коралл', 'Platygyra daedalea', 'Кораллы', 'Лагуна саргасса', '3 – 24 м',
      'Массивные шаровидные колонии с лабиринтовыми бороздками на кромке лагуны.'],
    coral_soft: ['Мягкий коралл дендронефтия', 'Dendronephthya', 'Кораллы', 'Синий угол', '10 – 45 м',
      'Пышные розово-пурпурные мягкие кораллы, раскрывающиеся на стремительном течении пролива.'],
    coral_fan: ['Горгонариевый веер', 'Gorgonia', 'Кораллы', 'Затонувший корабль', '10 – 42 м',
      'Тонкие сетчатые кораллы, обрастающие поручни и грузовые стрелы затонувшего судна.'],
    coral_black: ['Чёрный коралл обрыва', 'Antipathes', 'Кораллы', 'Синий угол', '28 – 85 м',
      'Глубоководный гибкий коралл внешней стенки атолла с золотисто-зелёными полипами.'],
    sponge_barrel: ['Гигантская бочковидная губка', 'Xestospongia testudinaria', 'Беспозвоночные', 'Затонувший корабль', '12 – 45 м',
      'Массивные губки-«вулканы» до 1.5 м высотой, поселившиеся на палубе и корме затонувшего корабля.'],
    giant_clam: ['Гигантская тридакна', 'Tridacna gigas', 'Беспозвоночные', 'Лагуна саргасса', '3 – 20 м',
      'Самый крупный двустворчатый моллюск планеты с радужной бирюзовой мантией.'],
    seagrass: ['Тропическая морская трава', 'Enhalus acoroides', 'Флора', 'Лагуна саргасса', '2 – 18 м',
      'Пышные зелёные ленты в песчаной лагуне, служащие пастбищем для морских черепах.'],
    crinoid: ['Морская лилия-криноидея', 'Comaster schlegelii', 'Беспозвоночные', 'Синий угол', '12 – 55 м',
      'Яркие перьевые звёзды, цепляющиеся за горгонарии и борт судна в ожидании планктона.'],
    fish_batfish: ['Длиннопёрый платакс', 'Platax teira', 'Рыбы', 'Затонувший корабль', '5 – 32 м',
      'Любопытные серебристо-чёрные рыбы с высокими серповидными плавниками — верные стражи затонувших кораблей.'],
    fish_snapper: ['Синеполосый луциан', 'Lutjanus kasmira', 'Рыбы', 'Затонувший корабль', '6 – 40 м',
      'Золотисто-лимонные стайные рыбы с четырьмя яркими голубыми полосами, заполняющие трюмы и тень мостика «SS Maru».'],
    fish_jack: ['Большеглазый каранкс', 'Caranx sexfasciatus', 'Рыбы', 'Синий угол', '10 – 55 м',
      'Огромные вращающиеся торнадо из сотен серебристых каранксов над краем течения «Синего угла».'],
    fish_barracuda: ['Большая барракуда', 'Sphyraena barracuda', 'Рыбы', 'Синий угол', '5 – 55 м',
      'Стремительный серебристый хищник с мощными челюстями, атакующий косяки луцианов и каранксов.'],
    fish_lantern: ['Рифовая рыба-фонарик', 'Photoblepharon palpebratum', 'Рыбы', 'Синий угол', '18 – 75 м',
      'Ночные обитатели гротов и глубокого трюма корабля с подглазным биолюминесцентным органом.'],
    shark_hammerhead: ['Гигантская акула-молот', 'Sphyrna mokarran', 'Мегафауна', 'Синий угол', '14 – 80 м',
      'Узнаваемый океанический хищник с широкой Т-образной головой-цефалофойлом и высоким серповидным плавником.'],
    shark_reef: ['Серая рифовая акула', 'Carcharhinus amblyrhynchos', 'Мегафауна', 'Синий угол', '10 – 65 м',
      'Быстрый и грациозный патрульный хищник внешнего склона и проливов Палау.'],
    manta: ['Океаническая манта', 'Mobula birostris', 'Мегафауна', 'Синий угол', '8 – 55 м',
      'Величественные скаты с размахом крыльев до 5.5 м, приплывающие на станцию чистки у обрыва.'],
    turtle: ['Зелёная морская черепаха', 'Chelonia mydas', 'Мегафауна', 'Лагуна саргасса', '2 – 35 м',
      'Морские черепахи, отдыхающие среди губок на палубе корабля и пасущиеся в лагуне саргасса.'],
    jelly_golden: ['Золотая медуза Палау', 'Mastigias papua', 'Беспозвоночные', 'Лагуна саргасса', '1 – 16 м',
      'Знаменитая нежалящая янтарная медуза озёр и лагун Палау, питающаяся за счёт фотосинтеза своих водорослей-симбионтов.'],
    lionfish: ['Индийская крылатка-зебра', 'Pterois volitans', 'Рыбы', 'Затонувший корабль', '6 – 35 м',
      'Ядовитый ночной охотник с веером полосатых плавников, скрывающийся внутри трюма и арок судна.'],
    octopus: ['Индо-тихоокеанский осьминог', 'Octopus cyanea', 'Беспозвоночные', 'Затонувший корабль', '5 – 35 м',
      'Мастер маскировки среди ржавых обломков, якорей и коралловых ниш.'],
    moray: ['Гигантская мурена', 'Gymnothorax javanicus', 'Рыбы', 'Затонувший корабль', '8 – 42 м',
      'Крупная мурена, выглядывающая из пробоин в обшивке судна «SS Maru».']
  };

  const FAUNA_PLAN = {
    cleaningStations: [
      { x: 400, y: -26, z: -15, radius: 24, name: 'Станция чистки «Синего угла»' },
      { x: WRECK_POS.x + 12, y: -19, z: WRECK_POS.z + 10, radius: 18, name: 'Рифовая чистка у кормы «SS Maru»' }
    ],
    wrecks: [
      { x: WRECK_POS.x, z: WRECK_POS.z, len: 68, beam: 11.2, hullH: 6.8, yaw: 0.68, roll: 0.32, pitch: -0.04, yOffset: 2.4 }
    ],
    schools: [
      { key: 'fish_batfish', n: 26, cx: WRECK_POS.x - 8, cz: WRECK_POS.z + 6, radius: 24, yDepth: -14, yAmp: 3.5, spread: 7.5, speed: 4.0, scale: 0.85, diel: 'diurnal', shyness: 0.2, curious: 0.85,
        geoOpts: { len: 1.0, height: 1.05, width: 0.14, colA: 0xc2cbd4, colB: 0x1b2530, finCol: 0x35424e, stripes: 0.65 } },
      { key: 'fish_snapper', n: 88, cx: WRECK_POS.x + 12, cz: WRECK_POS.z - 10, radius: 32, yDepth: -18, yAmp: 4, spread: 9, speed: 6.4, scale: 0.54, diel: 'diurnal', shyness: 0.72,
        geoOpts: { len: 1.15, height: 0.44, width: 0.20, colA: 0xf4c424, colB: 0x3aa8ff, finCol: 0xffd844, stripes: 0.5 } },
      { key: 'fish_snapper', n: 56, cx: landmarks[3].x, cz: landmarks[3].z, radius: 28, yDepth: -11, yAmp: 3, spread: 8, speed: 6.0, scale: 0.52, diel: 'diurnal', shyness: 0.7,
        geoOpts: { len: 1.15, height: 0.44, width: 0.20, colA: 0xf4c424, colB: 0x3aa8ff, finCol: 0xffd844, stripes: 0.5 } },
      { key: 'fish_jack', n: 120, cx: 405, cz: -10, radius: 42, yDepth: -24, yAmp: 7, spread: 12, speed: 9.8, scale: 0.62, diel: 'diurnal', shyness: 0.45, curious: 0.4,
        geoOpts: { len: 1.25, height: 0.42, width: 0.19, colA: 0x628ea8, colB: 0xeaf4fa, finCol: 0x9bb7c7 } },
      { key: 'fish_jack', n: 90, cx: 385, cz: 190, radius: 36, yDepth: -28, yAmp: 6, spread: 11, speed: 9.2, scale: 0.60, diel: 'diurnal', shyness: 0.45,
        geoOpts: { len: 1.25, height: 0.42, width: 0.19, colA: 0x628ea8, colB: 0xeaf4fa, finCol: 0x9bb7c7 } },
      { key: 'fish_barracuda', n: 24, cx: 345, cz: 45, radius: 48, yDepth: -20, yAmp: 5, spread: 13, speed: 8.8, scale: 0.92, predator: true, diel: 'crepuscular', shyness: 0.15, curious: 0.35,
        geoOpts: { len: 1.85, height: 0.22, width: 0.14, colA: 0x5c7b8c, colB: 0xdfe9ef, finCol: 0x7b98a6, stripes: 0.45 } },
      { key: 'fish_lantern', n: 46, cx: WRECK_POS.x + 2, cz: WRECK_POS.z - 2, radius: 20, yDepth: -21, yAmp: 3, spread: 7, speed: 4.8, scale: 0.48, diel: 'nocturnal', biolum: true, shyness: 0.45,
        geoOpts: { len: 0.85, height: 0.34, width: 0.15, colA: 0x162f48, colB: 0x5df2ff, finCol: 0x3ed9ec, eyeScale: 1.4 } }
    ],
    hammerheads: [
      { cx: 425, cz: -30, r: 74, y: -27, speed: 5.8, len: 4.9 },
      { cx: 445, cz: 210, r: 82, y: -32, speed: 5.4, len: 4.6 }
    ],
    sharks: [
      { speciesKey: 'shark_reef', cx: WRECK_POS.x + 40, cz: WRECK_POS.z + 30, r: 58, y: -18, speed: 5.6 },
      { speciesKey: 'shark_reef', cx: 390, cz: -180, r: 66, y: -26, speed: 5.8 }
    ],
    mantas: [
      { cx: 398, cz: -14, r: 62, y: -23, span: 11.5, speed: 4.4 },
      { cx: 380, cz: 160, r: 70, y: -26, span: 10.2, speed: 4.2 }
    ],
    turtles: [
      { cx: -140, cz: 150, r: 44, y: -9, speed: 2.0, size: 1.05 },
      { cx: WRECK_POS.x - 18, cz: WRECK_POS.z + 18, r: 34, y: -16, speed: 1.9, size: 1.0 }
    ],
    goldenJellies: [
      { cx: landmarks[2].x - 14, cz: landmarks[2].z + 10, y: -6.5, amp: 1.8, scale: 1.05 },
      { cx: landmarks[2].x + 12, cz: landmarks[2].z - 16, y: -8.0, amp: 2.1, scale: 0.92 },
      { cx: landmarks[2].x + 28, cz: landmarks[2].z + 18, y: -7.0, amp: 1.7, scale: 1.12 },
      { cx: landmarks[2].x - 32, cz: landmarks[2].z - 14, y: -6.0, amp: 1.9, scale: 0.88 },
      { cx: -165, cz: 55, y: -7.5, amp: 2.0, scale: 1.0 }
    ],
    lionfish: [
      { cx: WRECK_POS.x - 6, cz: WRECK_POS.z - 8, r: 10, y: -20, scale: 1.0 },
      { cx: WRECK_POS.x + 14, cz: WRECK_POS.z + 6, r: 11, y: -21, scale: 0.95 }
    ],
    octopus: [
      { x: WRECK_POS.x - 24, z: WRECK_POS.z + 14, scale: 1.15 },
      { x: landmarks[3].x + 14, z: landmarks[3].z - 12, scale: 1.05 }
    ],
    moray: [
      { x: WRECK_POS.x + 8, z: WRECK_POS.z - 14, scale: 1.2 },
      { x: 320, z: -55, scale: 1.15 }
    ]
  };

  OC.Biomes.register({
    id: 'wreck_atoll',
    name: 'Атолл и Затонувший корабль',
    region: 'Архипелаг Палау, Микронезия',
    subtitle: 'Тихий океан · 2.4 × 2.4 км · 0–96 м',
    worldRadius: 1200,
    chunkSize: 150,
    seaLevel: 0,
    minimapTheme: 'atoll',
    spawn: {
      pos: [spawnX, spawnY, spawnZ],
      yaw: 2.38,
      pitch: -0.14
    },
    zones: ZONES,
    landmarks,
    tourLegs,
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
