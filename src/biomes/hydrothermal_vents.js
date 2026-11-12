/* ================= БИОМ: АБИССАЛЬНЫЕ ЧЁРНЫЕ КУРИЛЬЩИКИ (ВОСТОЧНО-ТИХООКЕАНСКОЕ ПОДНЯТИЕ) ================= */
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

  const DEPTH_OFFSET = 2420; // Сдвиг реальной глубины: -18 м -> 2438 м, -118 м -> 2538 м

  const ZONES = [
    {
      id: 'smoker_field',
      name: 'Долина чёрных курильщиков',
      shortName: 'Курильщики',
      color: '#ff7d42',
      depthLabel: '2440 – 2475 м',
      tempC: 14.2,
      description: 'Активная рифтовая ось со столбами сульфидного дыма до +350 °C, перегревающими придонную воду.'
    },
    {
      id: 'riftia_garden',
      name: 'Сады гигантских рифтий',
      shortName: 'Сады рифтий',
      color: '#d94854',
      depthLabel: '2450 – 2495 м',
      tempC: 5.4,
      description: 'Хемосинтетический оазис алых трубчатых червей Riftia pachyptila и золотистых мидий Bathymodiolus без солнечного света.'
    },
    {
      id: 'fault_walls',
      name: 'Базальтовые уступы разлома',
      shortName: 'Разлом базальта',
      color: '#4f5d7a',
      depthLabel: '2434 – 2485 м',
      tempC: 2.3,
      description: 'Отвесные тектонические стены подушечных лав, ограничивающие осевой грабен океанического хребта.'
    },
    {
      id: 'abyssal_plain',
      name: 'Абиссальный жёлоб бездны',
      shortName: 'Абиссаль',
      color: '#182442',
      depthLabel: '2490 – 2538 м',
      tempC: 1.8,
      description: 'Вечный мрак батипелагиали (250 атм), где охотятся удильщики с биолюминесцентной приманкой и кальмары.'
    },
    {
      id: 'volcano_seamount',
      name: 'Подводный вулкан-сеаунд',
      shortName: 'Вулкан',
      color: '#b8863c',
      depthLabel: '2438 – 2478 м',
      tempC: 3.4,
      description: 'Спящий океанический вулкан: раз в несколько минут просыпаются редкие события — сейсмическая активность, мутный шлейф, газовые выбросы и локальные изменения течений.'
    }
  ];

  // Пять активных гидротермальных полей вдоль осевого разлома
  const VENT_FIELDS = [
    { x: -10, z: 15, r: 62, peakY: -26.0 },
    { x: 42, z: -210, r: 58, peakY: -31.0 },
    { x: -55, z: 245, r: 66, peakY: -28.0 },
    { x: 25, z: -480, r: 55, peakY: -35.0 },
    { x: -30, z: 510, r: 60, peakY: -33.0 }
  ];

  /* Подводный вулкан-сеаунд (редкие события с предвестниками, см. engine/volcano.js):
     спящий конус далеко от полей курильщиков с вершинным кратером. */
  const VOLCANO = { x: -360, z: 180, r: 92, peakY: -18.5, craterR: 15, craterD: 5.5 };

  function riftAxisX(z) {
    return Math.sin(z * 0.0028) * 70 + Math.cos(z * 0.0062) * 26;
  }

  function nearestVentDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < VENT_FIELDS.length; i++) {
      const d = Math.hypot(x - VENT_FIELDS[i].x, z - VENT_FIELDS[i].z);
      if (d < best) best = d;
    }
    return best;
  }

  function getHeight(x, z) {
    const rx = x - riftAxisX(z);
    const ax = Math.abs(rx);

    // Осевой вулканический хребет (|rx| < 180) + глубокие грабеновые рвы по бокам + базальтовые уступы сброса
    let h = -58.0;

    // Неовулканический вал по оси разлома
    const axisRidge = Math.exp(-(ax * ax) / (155 * 155)) * 18.0;
    h += axisRidge;

    // Глубокие рвы (axial troughs) по обе стороны от вала (ax ~ 220..360)
    const troughDist = Math.abs(ax - 280);
    const trough = Math.exp(-(troughDist * troughDist) / (130 * 130)) * 34.0;
    h -= trough;

    // Ступенчатые сбросовые стены разлома (ax ~ 380..720)
    const wallRise = OC.smoothstep(340, 560, ax) * OC.smoothstep(940, 680, ax) * 44.0;
    h += wallRise;

    // Внешняя абиссальная равнина за уступами (ax > 760)
    const outerDrop = OC.smoothstep(680, 1080, ax) * 46.0;
    h -= outerDrop;

    // Подушечные лавы (pillow basalt) и тектонические уступы
    const basaltCrags = (OC.ridged2(x * 0.011, z * 0.011, 3) - 0.5) * 9.5;
    const pillow = OC.fbm2(x * 0.036, z * 0.036, 3) * 4.2;
    h += basaltCrags + pillow;

    // Сульфидные холмы вокруг активных курильщиков
    for (let i = 0; i < VENT_FIELDS.length; i++) {
      const vf = VENT_FIELDS[i];
      const d = Math.hypot(x - vf.x, z - vf.z);
      if (d < vf.r * 1.9) {
        const mound = OC.smoothstep(vf.r * 1.6, 8.0, d);
        h = OC.lerp(h, vf.peakY + (OC.noise2(x * 0.08, z * 0.08) - 0.5) * 2.5, mound * 0.88);
      }
    }

    // Подводный вулкан-сеаунд: конус + вершинный кратер (детерминированно, без Math.random)
    const vdV = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
    if (vdV < VOLCANO.r * 1.25) {
      const cone = OC.smoothstep(VOLCANO.r, 8.0, vdV);
      h = OC.lerp(h, VOLCANO.peakY + (OC.noise2(x * 0.06, z * 0.06) - 0.5) * 2.2, cone * 0.92);
      const crater = OC.smoothstep(VOLCANO.craterR, 3.0, vdV);
      h -= crater * VOLCANO.craterD;
    }

    return OC.clamp(h, -118.0, -12.0);
  }

  function safeSpotY(x, z, desiredY, clearance) {
    return Math.max(desiredY, getHeight(x, z) + (clearance || 4.0));
  }

  function getZoneAt(x, y, z) {
    if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < VOLCANO.r) return ZONES[4]; // volcano_seamount
    const vd = nearestVentDist(x, z);
    if (vd < 54) return ZONES[0]; // smoker_field
    if (vd < 115) return ZONES[1]; // riftia_garden
    const rx = Math.abs(x - riftAxisX(z));
    const fl = getHeight(x, z);
    if (rx > 340 && rx < 820 && fl > -52) return ZONES[2]; // fault_walls
    return ZONES[3]; // abyssal_plain
  }

  function getTerrainColor(x, y, z, out) {
    const vd = nearestVentDist(x, z);
    const n = OC.clamp(OC.fbm2(x * 0.055, z * 0.055, 2) * 0.8 + 0.5, 0, 1);

    _colA.set(0x161922); // чёрный океанический базальт
    _colB.set(0x3a2a24); // железистые сульфидные отложения
    _colC.set(0x7c441c); // ржаво-медная корка у жерл

    out.copy(_colA).lerp(_colB, n * 0.45);

    if (vd < 95) {
      const halo = OC.smoothstep(95, 14, vd);
      out.lerp(_colC, halo * (0.45 + n * 0.45));
      // Тонкие раскалённые магматические трещины на дне у центральных курильщиков
      const crack = OC.ridged2(x * 0.085, z * 0.085, 2);
      if (vd < 42 && crack > 0.78) {
        const glow = OC.smoothstep(0.78, 0.96, crack) * OC.smoothstep(42, 8, vd);
        out.lerp(_colC.set(0xd94e14), glow * 0.85);
      }
    } else if (y < -76) {
      // Светловатый пелагический ил в глубоких жёлобах
      out.lerp(_colB.set(0x232a36), OC.smoothstep(-76, -108, y) * 0.65);
    }
    return out;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const vd = nearestVentDist(x, z);
    const ventWarm = OC.smoothstep(130, 18, vd);

    // В абиссали (2500 м) вечная ночь: солнечный свет = 0, биолюминесценция = 1
    _fogCol.set(0x03070e).lerp(_colA.set(0x140907), ventWarm * 0.65);
    _waterCol.set(0x0a1c2e).lerp(_colA.set(0x3a2216), ventWarm * 0.45);
    _skyTop.set(0x010307);
    _skyBot.set(0x03070f);
    _aboveHoriz.set(0x050a14);

    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity: OC.lerp(0.0145, 0.0225, ventWarm),
      causticStrength: 0,
      rayStrength: 0,
      sunAtten: 0.0,
      bioGlow: 1.0,
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz,
      fillAColor: _colB.set(0x186688),
      fillAMult: 0.42,
      fillBColor: _colC.set(0xff6b26),
      fillBMult: 0.25 + ventWarm * 1.45
    };
  }

  /* ---- Восходящие термальные плюмы над курильщиками (+Y) и придонный дрейф ---- */
  function getCurrentAt(x, y, z, time, out) {
    if (!out) out = new T.Vector3();
    out.set(0.18 + Math.sin(time * 0.14 + z * 0.01) * 0.1, 0, 0.22);

    // Мощная конвекционная восходящая струя прямо над активными чёрными курильщиками
    for (let i = 0; i < VENT_FIELDS.length; i++) {
      const vf = VENT_FIELDS[i];
      const d = Math.hypot(x - vf.x, z - vf.z);
      if (d < 46) {
        const fl = getHeight(x, z);
        const above = Math.max(0, y - fl);
        if (above < 48) {
          const core = OC.smoothstep(46, 6, d) * OC.smoothstep(48, 8, above);
          out.y += core * 2.65;
          out.x += Math.sin(time * 0.8 + y * 0.15) * core * 0.65;
          out.z += Math.cos(time * 0.7 + y * 0.15) * core * 0.65;
        }
      }
    }

    // Локальные изменения течений от подводного вулкана (редкие события, см. engine/volcano.js)
    if (OC.Volcano && OC.Volcano.getCurrentBoost) {
      OC.Volcano.getCurrentBoost(x, y, z, out);
    }
    return out;
  }

  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const items = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;

    function add(species, x, z, scale, tint) {
      const y = getHeight(x, z);
      items.push({ species, x, y: y - 0.1, z, ry: rng() * 6.283, scale, tint: tint || 0xffffff });
    }

    // 1. Сульфидные башни «чёрных курильщиков» на гидротермальных полях
    for (let v = 0; v < VENT_FIELDS.length; v++) {
      const vf = VENT_FIELDS[v];
      if (vf.x + 70 < x0 || vf.x - 70 > x0 + chunkSize || vf.z + 70 < z0 || vf.z - 70 > z0 + chunkSize) continue;
      const spires = Math.round(7 * density);
      for (let i = 0; i < spires; i++) {
        const a = (i / Math.max(1, spires)) * 6.28 + rng() * 0.5;
        const r = i === 0 ? rng() * 5 : OC.lerp(7, 34, rng());
        const px = vf.x + Math.cos(a) * r;
        const pz = vf.z + Math.sin(a) * r;
        if (px >= x0 && px < x0 + chunkSize && pz >= z0 && pz < z0 + chunkSize) {
          add('vent_chimney', px, pz, i === 0 ? 1.25 : OC.lerp(0.65, 1.15, rng()));
        }
      }
    }

    // 1b. Подводный вулкан: фумаролы на склонах конуса и хемосинтетические оазисы в тёплом гало
    if (Math.abs(VOLCANO.x - x0) < VOLCANO.r * 1.4 && Math.abs(VOLCANO.z - z0) < VOLCANO.r * 1.4) {
      const vSlots = Math.round(14 * density);
      for (let i = 0; i < vSlots; i++) {
        const x = x0 + rng() * chunkSize;
        const z = z0 + rng() * chunkSize;
        const vd = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
        if (vd > VOLCANO.r * 1.25) continue;
        if (vd > VOLCANO.craterR * 1.5 && rng() < 0.6) {
          add('volcanic_fumarole', x, z, OC.lerp(0.8, 1.4, rng()));
        } else if (rng() < 0.5) {
          add('riftia_worms', x, z, OC.lerp(0.75, 1.2, rng()));
        } else {
          add('vent_mussels', x, z, OC.lerp(0.8, 1.3, rng()));
        }
      }
    }

    // 2. Сады гигантских рифтий, мидий Bathymodiolus, чёрных кораллов и стеклянных губок
    const slots = Math.round(28 * density);
    for (let i = 0; i < slots; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const vd = nearestVentDist(x, z);
      const y = getHeight(x, z);

      if (vd < 96) {
        if (rng() < 0.58) add('riftia_worms', x, z, OC.lerp(0.75, 1.38, rng()));
        else add('vent_mussels', x, z, OC.lerp(0.8, 1.45, rng()));
      } else if (y > -64 && rng() < 0.42) {
        if (rng() < 0.62) add('coral_black', x, z, OC.lerp(0.75, 1.35, rng()));
        else add('sponge_tube', x, z, OC.lerp(0.65, 1.15, rng()), 0xc8d8e6);
      }
    }

    return items;
  }

  const _lmRaw = [
    {
      id: 'central_smoker',
      name: 'Чёрный курильщик',
      zoneId: 'smoker_field',
      isHot: true,
      x: VENT_FIELDS[0].x + 28,
      y: -18.0,
      z: VENT_FIELDS[0].z + 32,
      yaw: 2.35,
      pitch: -0.18,
      clearance: 4.5,
      description: 'Центральный гидротермальный шпиль, извергающий облака перегретых сульфидов железа на глубине 2440 метров.'
    },
    {
      id: 'riftia_oasis',
      name: 'Сад рифтий',
      zoneId: 'riftia_garden',
      isHot: true,
      x: VENT_FIELDS[2].x + 42,
      y: -25.0,
      z: VENT_FIELDS[2].z - 36,
      yaw: -0.85,
      pitch: -0.18,
      clearance: 4.5,
      description: 'Хемосинтетический оазис алых трубчатых червей Riftia pachyptila, процветающих без единого фотона солнца.'
    },
    {
      id: 'east_fault',
      name: 'Базальтовый разлом',
      zoneId: 'fault_walls',
      x: 420,
      y: -22.0,
      z: -45,
      yaw: 1.5,
      pitch: -0.14,
      clearance: 5.0,
      description: 'Крутая стена подушечных базальтовых лав, окаймляющая ось срединно-океанического рифта.'
    },
    {
      id: 'deep_trench',
      name: 'Жёлоб бездны',
      zoneId: 'abyssal_plain',
      x: -255,
      y: -66.0,
      z: -140,
      yaw: -1.2,
      pitch: -0.16,
      clearance: 5.5,
      description: 'Холодная тьма глубинного рва (2500+ м): охотничьи угодья удильщиков и глубоководных кальмаров.'
    },
    {
      id: 'submarine_volcano',
      name: 'Подводный вулкан',
      zoneId: 'volcano_seamount',
      x: VOLCANO.x,
      y: -13.0,
      z: VOLCANO.z,
      yaw: 0.6,
      pitch: -0.32,
      clearance: 6.0,
      description: 'Спящий подводный вулкан-сеаунд: раз в несколько минут просыпаются сейсмические толчки, мутные шлейфы и газовые выбросы с предвестниками.'
    }
  ];

  const landmarks = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: Math.min(8.0, safeSpotY(lm.x, lm.z, lm.y, lm.clearance))
  }));

  const spawnX = landmarks[0].x;
  const spawnZ = landmarks[0].z;
  const spawnY = Math.min(6.0, safeSpotY(spawnX, spawnZ, -18.0, 4.5));

  const _tourRaw = [
    { x: spawnX, y: -17.0, z: spawnZ, lx: VENT_FIELDS[0].x, ly: -22.0, lz: VENT_FIELDS[0].z, title: 'Главный чёрный курильщик (2440 м)', duration: 10,
      fact: 'Вода температурой до +380 °C не закипает здесь из-за чудовищного давления ~250 атмосфер и выносит облака сульфидов железа.' },
    { x: landmarks[1].x, y: -23.0, z: landmarks[1].z, lx: VENT_FIELDS[2].x, ly: -28.0, lz: VENT_FIELDS[2].z, title: 'Хемосинтетический сад гигантских рифтий', duration: 10,
      fact: 'У алых червей Riftia вообще нет рта и желудка: их питают триллионы бактерий-симбионтов, получающих энергию из сероводорода без солнца!' },
    { x: landmarks[2].x, y: -20.0, z: landmarks[2].z, lx: 500, ly: -24.0, lz: -45, title: 'Базальтовые уступы океанического разлома', duration: 9,
      fact: 'Подушечные базальтовые лавы формируют молодую земную кору вдоль Восточно-Тихоокеанского поднятия и порождают стеклянные губки.' },
    { x: landmarks[3].x, y: -62.0, z: landmarks[3].z, lx: -220, ly: -74.0, lz: -110, title: 'Жёлоб бездны и биолюминесценция', duration: 10,
      fact: 'В вечной темноте 2500 м глубин свет рождается химически: морской чёрт манит добычу светящейся эской, а кальмар выпускает сияние.' },    { x: landmarks[4].x, y: -12.0, z: landmarks[4].z, lx: VOLCANO.x, ly: -22.0, lz: VOLCANO.z, title: 'Подводный вулкан-сеаунд', duration: 10,
      fact: 'Спящий океанический вулкан просыпается раз в несколько минут: сейсмические толчки, мутный шлейф, газовые выбросы и локальные изменения течений — с предвестниками, без анонсов.' }

  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, Math.min(8.0, safeSpotY(leg.x, leg.z, leg.y, 4.2)), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    fact: leg.fact,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    floor: ['Срединно-океанический базальтовый рифт', 'Восточно-Тихоокеанское поднятие', 'Геология', 'Все зоны', '2432 – 2538 м',
      'Остывшие подушечные лавы молодой океанической коры, рассечённые тектоническими сбросами и сульфидными холмами курильщиков.'],
    vent_chimney: ['Сульфидный «чёрный курильщик»', 'Hydrothermal Vent Chimney', 'Геология', 'Курильщики', '2440 – 2475 м',
      'Природная труба из сульфидов железа, меди и цинка, выбрасывающая минерализованный флюид температурой +300…+380 °C.'],
    riftia_worms: ['Гигантская рифтия', 'Riftia pachyptila', 'Беспозвоночные', 'Сады рифтий', '2450 – 2490 м',
      'Бескишечные трубчатые черви до 2.4 м длиной, живущие за счёт симбиотических бактерий, окисляющих сероводород без солнца.'],
    vent_mussels: ['Термальные мидии батимодиолусы', 'Bathymodiolus thermophilus', 'Беспозвоночные', 'Сады рифтий', '2450 – 2495 м',
      'Плотные колонии золотистых моллюсков, чьи жабры населены метанокисляющими и сероокисляющими бактериями.'],
    coral_black: ['Абиссальный антипатарий', 'Bathypathes patula', 'Кораллы', 'Разлом базальта', '2434 – 2490 м',
      'Медленнорастущие глубоководные кораллы с прочным хитиновым скелетом на базальтовых стенах разлома.'],
    sponge_tube: ['Абиссальная стеклянная губка', 'Hexactinellida', 'Беспозвоночные', 'Разлом базальта', '2440 – 2520 м',
      'Изящные кремниевые губки-шестилучевики со скелетом из чистого биогенного кварца, живущие тысячелетиями.'],
    vent_shrimp: ['Слепая гидротермальная креветка', 'Rimicaris exoculata', 'Беспозвоночные', 'Курильщики', '2440 – 2480 м',
      'Тысячные рои бледных креветок с термочувствительным спинным «глазом» для ориентации у инфракрасного свечения жерл.'],
    fish_lantern: ['Абиссальный долгохвост / фонарик', 'Coryphaenoides / Myctophidae', 'Рыбы', 'Абиссаль', '2460 – 2535 м',
      'Экономичные глубоководные рыбы со световыми фотофорами, патрулирующие границы термальных шлейфов.'],
    fish_angler: ['Глубоководный морской чёрт', 'Melanocetus johnsonii', 'Рыбы', 'Абиссаль', '2465 – 2535 м',
      'Хищник-засадчик вечной тьмы, приманивающий добычу светящейся бактериальной эской на подвижном иллиции.'],
    squid_abyssal: ['Глубоководный кальмар-вампир', 'Vampyroteuthis / Histioteuthis', 'Мегафауна', 'Абиссаль', '2450 – 2525 м',
      'Багровый обитатель глубин с рядами голубых фотофоров, экономично парящий за счёт желатинозной мантии.'],
    octopus_dumbo: ['Осьминог Дамбо (Гримпотевтис)', 'Grimpoteuthis bathynectes', 'Мегафауна', 'Разлом базальта', '2440 – 2530 м',
      'Миниатюрный глубоководный осьминог, грациозно взмахивающий парными плавниками-«ушками» над лавовыми подушками.'],
    jelly: ['Абиссальная светящаяся медуза', 'Atolla wyvillei', 'Беспозвоночные', 'Абиссаль', '2435 – 2530 м',
      'Глубоководная корономедуза с тревожным кольцом голубой биолюминесценции для отпугивания хищников.'],
    volcanic_fumarole: ['Вулканическая CO₂-фумарола', 'Submarine Fumarole', 'Геология', 'Вулкан', '2438 – 2478 м',
      'Трещины базальтового конуса, через которые выходит перегретый CO₂ и водяной пар — спутник сейсмической активности вулкана.'],
    submarine_volcano: ['Подводный вулкан-сеаунд', 'Submarine Seamount Volcano', 'Геология', 'Вулкан', '2438 – 2478 м',
      'Спящий океанический вулкан: раз в несколько минут просыпаются редкие события — сейсмическая активность, мутный шлейф, газовые выбросы и локальные изменения течений.']
  };

  const FAUNA_PLAN = {
    cleaningStations: [],
    ventPlumes: [
      { x: VENT_FIELDS[0].x, z: VENT_FIELDS[0].z, chimneyH: 6.5, height: 36, n: 220, light: true },
      { x: VENT_FIELDS[1].x, z: VENT_FIELDS[1].z, chimneyH: 6.0, height: 34, n: 180, light: true },
      { x: VENT_FIELDS[2].x, z: VENT_FIELDS[2].z, chimneyH: 6.5, height: 36, n: 200, light: true },
      { x: VENT_FIELDS[3].x, z: VENT_FIELDS[3].z, chimneyH: 5.5, height: 30, n: 150, light: false },
      { x: VENT_FIELDS[4].x, z: VENT_FIELDS[4].z, chimneyH: 5.5, height: 32, n: 150, light: false }
    ],
    schools: [
      { key: 'vent_shrimp', n: 65, cx: VENT_FIELDS[0].x, cz: VENT_FIELDS[0].z, radius: 14, yDepth: -20, yAmp: 4, spread: 7, speed: 4.8, scale: 0.44, diel: 'cathemeral', biolum: false, shyness: 0.25, curious: 0.35,
        geoOpts: { len: 0.72, height: 0.24, width: 0.20, colA: 0xe8d9ce, colB: 0xfff5ec, finCol: 0xffcfb0, eyeScale: 0.3 } },
      { key: 'vent_shrimp', n: 55, cx: VENT_FIELDS[2].x, cz: VENT_FIELDS[2].z, radius: 15, yDepth: -22, yAmp: 4, spread: 7, speed: 4.6, scale: 0.44, diel: 'cathemeral', biolum: false, shyness: 0.25,
        geoOpts: { len: 0.72, height: 0.24, width: 0.20, colA: 0xe8d9ce, colB: 0xfff5ec, finCol: 0xffcfb0, eyeScale: 0.3 } },
      { key: 'vent_shrimp', n: 42, cx: VOLCANO.x, cz: VOLCANO.z, radius: 11, yDepth: -17, yAmp: 3.5, spread: 6, speed: 5.0, scale: 0.44, diel: 'cathemeral', biolum: false, shyness: 0.25, curious: 0.35,
        geoOpts: { len: 0.72, height: 0.24, width: 0.20, colA: 0xe8d9ce, colB: 0xfff5ec, finCol: 0xffcfb0, eyeScale: 0.3 } },
      { key: 'fish_lantern', n: 22, cx: VOLCANO.x + 70, cz: VOLCANO.z - 50, radius: 26, yDepth: -40, yAmp: 7, spread: 9, speed: 5.4, scale: 0.54, diel: 'nocturnal', biolum: true, shyness: 0.4,
        geoOpts: { len: 1.05, height: 0.36, width: 0.16, colA: 0x162840, colB: 0x58e8ff, finCol: 0x36c4e8, eyeScale: 1.45 } },
      { key: 'fish_lantern', n: 32, cx: -180, cz: -120, radius: 48, yDepth: -54, yAmp: 8, spread: 14, speed: 5.2, scale: 0.56, diel: 'nocturnal', biolum: true, shyness: 0.4,
        geoOpts: { len: 1.05, height: 0.36, width: 0.16, colA: 0x162840, colB: 0x58e8ff, finCol: 0x36c4e8, eyeScale: 1.45 } },
      { key: 'fish_lantern', n: 28, cx: 160, cz: 190, radius: 46, yDepth: -48, yAmp: 7, spread: 13, speed: 5.0, scale: 0.54, diel: 'nocturnal', biolum: true, shyness: 0.4,
        geoOpts: { len: 1.05, height: 0.36, width: 0.16, colA: 0x162840, colB: 0x58e8ff, finCol: 0x36c4e8, eyeScale: 1.45 } }
    ],
    anglers: [
      { cx: -215, cz: -135, r: 42, y: -56, speed: 1.3, scale: 1.35 },
      { cx: 145, cz: 90, r: 38, y: -48, speed: 1.2, scale: 1.25 },
      { cx: 65, cz: -280, r: 44, y: -42, speed: 1.4, scale: 1.3 }
    ],
    squids: [
      { cx: -190, cz: -160, r: 58, y: -46, speed: 3.1, scale: 1.15 },
      { cx: 130, cz: 210, r: 62, y: -44, speed: 2.8, scale: 1.05 },
      { cx: 15, cz: -40, r: 68, y: -14, speed: 2.6, scale: 1.1 }
    ],
    dumbos: [
      { x: 380, z: -30, scale: 1.15 },
      { x: -340, z: 140, scale: 1.05 },
      { x: 75, z: -180, scale: 1.2 }
    ],
    jellies: [
      { cx: -20, cz: 60, y: -12, amp: 2.5, spd: 0.25, scale: 1.3 },
      { cx: -220, cz: -100, y: -45, amp: 3.0, spd: 0.22, scale: 1.4 },
      { cx: 210, cz: -80, y: -34, amp: 2.8, spd: 0.24, scale: 1.35 }
    ]
  };

  OC.Biomes.register({
    id: 'hydrothermal_vents',
    name: 'Чёрные курильщики бездны',
    region: 'Восточно-Тихоокеанское поднятие',
    subtitle: 'Абиссальный рифт · 2420–2538 м',
    globe: {
      lat: 9.8, lon: -104.3, coordLabel: '9.8° с.ш., 104.3° з.д.',
      ocean: 'Вост.-Тихоокеанское поднятие', depthSpan: '2420 – 2538 м', tempSpan: '1.9 – 380 °C', color: '#ff8a42',
      country: 'международные воды (Тихий океан)', waterType: 'ocean', protectionStatus: 'не охраняется',
      notableFor: 'чёрные курильщики, хемосинтетические экосистемы, термофильная фауна',
      summary: 'Хемосинтетический мир на глубине 2.5 км без единого луча солнца: перегретые сульфидные шпили, сады рифтий и морские черти.'
    },
    worldRadius: 1200,
    chunkSize: 150,
    seaLevel: 0,
    depthOffset: DEPTH_OFFSET,
    noSurface: true,
    maxCamY: 12.0,
    minimapTheme: 'abyss',
    spawn: {
      pos: [spawnX, spawnY, spawnZ],
      yaw: 2.35,
      pitch: -0.18
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
