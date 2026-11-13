/* ================= БИОМ: ПОДЛЁДНЫЙ ОКЕАН ЕВРОПЫ (ЛУНА ЮПИТЕРА) =================
   Локация построена по реальным данным: ледяной панцирь Европы (NASA: 15–25 км;
   Juno, 2026: ~29 км в исследованном регионе), глобальный солёный океан 60–150 км
   (≈ 3 млрд км³ воды — вдвое больше всех океанов Земли), температура океана ~0 °C
   (до −13 °C при высокой солёности), давление у дна 110–360 МПа (g Европы = 1,315 м/с²),
   серпентинизация перидотита как источник H₂/CH₄ и тепла, приливный насос в пористой коре.
   Вертикальный масштаб сильно сжат: показаны верхние ~100 м океана у самого основания
   ледяного панциря и нижние 25 км (толщина льда) над ними.
   Флора и фауна — гипотетические, построенные по аналогии с земными гидротермальными
   и ледовыми экосистемами: ничего из перечисленного на Земле не существует.            */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  /* Нижняя граница ледяного панциря: 25 000 м под поверхностью Европы.
     Сцена охватывает верхние ~100 м океана (y = +18 … −118), глубина пересчитывается
     как depthOffset − y (см. OC.Telemetry и ROV CTD).                                */
  const ICE_SHELL_DEPTH = 25000;
  const GRAVITY_SCALE = 0.136; // 1/7 земного тяготения: 25 км → ~272 атм вместо ~2000

  const _colA = new T.Color();
  const _colB = new T.Color();
  const _colC = new T.Color();
  const _fogCol = new T.Color();
  const _waterCol = new T.Color();
  const _skyTop = new T.Color();
  const _skyBot = new T.Color();
  const _aboveHoriz = new T.Color();

  /* Поля холодных серпентинитовых источников на дне океана */
  const VENT_SITES = [
    { x: -292, z: 138, r: 74, peak: -76.5 },
    { x: -146, z: 262, r: 58, peak: -78.0 },
    { x: -392, z: -48, r: 64, peak: -75.0 }
  ];

  /* Каналы рассола, спускающиеся из панциря (аналог хаос-террен Тары) */
  const BRINE_CHANNELS = [
    { x: 74, z: -126, r: 46, bottom: 2.2, name: 'karma' },
    { x: -68, z: 214, r: 38, bottom: 3.0, name: 'tara' },
    { x: 196, z: 268, r: 42, bottom: 1.6, name: 'powys' }
  ];

  /* Зоны экологии (от базального льда к глубоководной равнине) */
  const ZONES = [
    {
      id: 'basal_ice',
      name: 'Нижняя граница ледяного панциря',
      shortName: 'Базальный лёд',
      color: '#bfe9ff',
      depthLabel: '24 982 – 24 992 м',
      tempC: -1.4,
      description: 'Ледяной «потолок» океана: базальный слой льда с карманами рассола, ледяными каналами и зарослями криовеима, свисающими вниз. Солнечного света здесь нет уже 25 километров.'
    },
    {
      id: 'pelagic_dust',
      name: 'Верхний пелагиал: ледяная пыль',
      shortName: 'Ледяная пыль',
      color: '#7fb8d8',
      depthLabel: '24 992 – 25 020 м',
      tempC: -1.7,
      description: 'Бесконечный «снег» из ледяной пыли, сорванной приливным изгибанием панциря. Это единственный источник органики: ею питаются планктонные крошки и крио-криль.'
    },
    {
      id: 'ridge_flank',
      name: 'Серпентинитовый хребет',
      shortName: 'Хребет',
      color: '#4fa3a8',
      depthLabel: '25 020 – 25 058 м',
      tempC: -0.6,
      description: 'Гряда базальтовых уступов под ледяным панцирем. Склоны заросли бледным криолесом, который живёт на водороде из серпентинизации мантийного перидотита.'
    },
    {
      id: 'serpentine_field',
      name: 'Поле серпентинитовых источников',
      shortName: 'Серпентинитовое поле',
      color: '#ffb35c',
      depthLabel: '25 058 – 25 080 м',
      tempC: 2.6,
      description: 'Холодные щелочные трубы высотой до 9 метров: вода реагирует с перидотитом, выделяя водород, метан и тепло. Здесь живёт вся самая обильная жизнь океана Европы.'
    },
    {
      id: 'basal_plain',
      name: 'Глубинная океаническая равнина',
      shortName: 'Равнина',
      color: '#243a52',
      depthLabel: '25 080 – 25 118 м',
      tempC: -2.1,
      description: 'Базальтовая равнина под толщей океана в сто километров. Здесь нет ни света, ни тепла — только холод, давление в 350 атмосфер и бесконечный снег из пыли.'
    }
  ];

  /* Ось хребта: инвертированные линии Европы на поверхности продолжаются в океан */
  function ridgeAxisX(z) {
    return Math.sin(z * 0.00215) * 205 + Math.cos(z * 0.00092) * 85;
  }

  function basinCenter() {
    return { x: 392, z: -338 };
  }

  function nearestVentDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < VENT_SITES.length; i++) {
      const d = Math.hypot(x - VENT_SITES[i].x, z - VENT_SITES[i].z);
      if (d < best) best = d;
    }
    return best;
  }

  function nearestBrineDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < BRINE_CHANNELS.length; i++) {
      const d = Math.hypot(x - BRINE_CHANNELS[i].x, z - BRINE_CHANNELS[i].z);
      if (d < best) best = d;
    }
    return best;
  }

  function getHeight(x, z) {
    // Базальтовая равнина океанического дна Европы
    let h = -97.5 + OC.fbm2(x * 0.0041 + 1.7, z * 0.0041 - 2.4, 3) * 4.6;

    // Серпентинитовый хребет — подводное продолжение «великих линий» Европы
    const ax = Math.abs(x - ridgeAxisX(z));
    const ridge = OC.smoothstep(430, 55, ax) * 33.5;
    h += ridge;

    // Ступенчатые уступы хребта
    const terraces = Math.sin(ax * 0.0235) * 2.6 * OC.smoothstep(520, 130, ax) * OC.smoothstep(70, 150, ax);
    h += terraces;

    // Трещины и разломы на склонах
    const faults = (OC.ridged2(x * 0.0095, z * 0.0095, 3) - 0.5) * 6.2 * OC.smoothstep(160, 460, ax);
    h += faults;

    // Вулканические холмы и жилы серпентинитового поля
    for (let i = 0; i < VENT_SITES.length; i++) {
      const s = VENT_SITES[i];
      const d = Math.hypot(x - s.x, z - s.z);
      if (d < s.r * 1.7) {
        const w = OC.smoothstep(s.r * 1.6, 8.0, d);
        h = OC.lerp(h, s.peak + (OC.noise2(x * 0.062, z * 0.062) - 0.5) * 2.6, w * 0.9);
      }
    }

    // Глубокая океаническая котловина
    const bc = basinCenter();
    const basin = OC.smoothstep(300, 0, Math.hypot(x - bc.x, z - bc.z));
    h -= basin * 17.5;

    // Мелкая рябь базальтового ила
    h += OC.fbm2(x * 0.031 + 5.1, z * 0.031 - 3.3, 2) * 1.5;

    return OC.clamp(h, -119.0, -52.0);
  }

  function getCeilingHeight(x, z) {
    // Нижняя поверхность ледяного панциря (базальный лёд)
    let ceil = 15.2 + OC.fbm2(x * 0.0053 + 3.3, z * 0.0053 - 1.7, 3) * 3.2;

    // Над хребтом лёд тоньше и прогибается
    const ax = Math.abs(x - ridgeAxisX(z));
    ceil -= OC.smoothstep(400, 70, ax) * 5.4;

    // Над глубокой котловиной — толстый «двойной слой» льда
    const bc = basinCenter();
    ceil += OC.smoothstep(260, 0, Math.hypot(x - bc.x, z - bc.z)) * 5.2;

    // Ледяные «купола» и хаос-блоки
    const dome = OC.fbm2(x * 0.0132 - 4.4, z * 0.0132 + 2.6, 2) * 2.4;
    ceil += dome;

    // Каналы рассола: вода из океана замерзает в панцире и стекает вниз тяжёлым рассолом
    for (let i = 0; i < BRINE_CHANNELS.length; i++) {
      const b = BRINE_CHANNELS[i];
      const d = Math.hypot(x - b.x, z - b.z);
      if (d < b.r * 1.25) {
        const w = OC.smoothstep(b.r * 1.2, b.r * 0.22, d);
        ceil = OC.lerp(ceil, b.bottom, w * 0.94);
      }
    }

    return OC.clamp(ceil, 1.2, 21.5);
  }

  function getCeilingColor(x, y, z, out) {
    const n = OC.fbm2(x * 0.021 + 9.1, z * 0.021 - 5.4, 2) * 0.5 + 0.5;
    // Бледно-голубой базальный лёд
    out.setHex(0x9fd4ea).lerp(_colB.set(0xd8f2ff), n * 0.85);

    // Прожилки облучённых солей (lineae) — красно-бурый оттенок
    const vein = OC.fbm2(x * 0.055 - 2.2, z * 0.055 + 6.6, 2);
    if (vein > 0.14) {
      out.lerp(_colC.set(0x8d4a46), OC.smoothstep(0.14, 0.42, vein) * 0.62);
    }
    // Тёмные участки над карманами рассола
    const bd = nearestBrineDist(x, z);
    if (bd < 70) {
      out.lerp(_colC.set(0x2b4f6b), OC.smoothstep(70, 12, bd) * 0.55);
    }
    return out;
  }

  function safeSpotY(x, z, desiredY, clearance) {
    const floor = getHeight(x, z);
    const ceil = getCeilingHeight(x, z);
    const y = Math.max(desiredY, floor + (clearance || 4.2));
    return Math.min(y, ceil - 2.6);
  }

  function getZoneAt(x, y, z) {
    const vd = nearestVentDist(x, z);
    if (vd < 96 && y < -60) return ZONES[3]; // serpentine_field
    if (y > -13) return ZONES[0]; // basal_ice
    if (y > -42) return ZONES[1]; // pelagic_dust
    if (y > -74) return ZONES[2]; // ridge_flank
    return ZONES[4]; // basal_plain
  }

  function getTerrainColor(x, y, z, out) {
    const n = OC.fbm2(x * 0.043 + 7.7, z * 0.043 - 2.2, 2) * 0.5 + 0.5;
    const vd = nearestVentDist(x, z);
    const bd = nearestBrineDist(x, z);

    // Базальтовый ил с серпентинитовой крошкой
    out.setHex(0x2b3140).lerp(_colB.set(0x424a5c), n * 0.8);

    // Светлые сульфатные корки (Kargel et al., 2000: сульфатные осадки на дне Европы)
    if (y < -92) {
      out.lerp(_colC.set(0x6d7183), OC.smoothstep(-92.0, -110.0, y) * (0.30 + n * 0.35));
    }
    // Тёмные свежие базальтовые лавы у подножия хребта
    const ax = Math.abs(x - ridgeAxisX(z));
    if (ax > 120 && ax < 330 && y > -88) {
      out.lerp(_colB.set(0x171b24), OC.smoothstep(330, 150, ax) * 0.35);
    }
    // Тёплый серпентинитовый налёт вокруг труб
    if (vd < 90) {
      out.lerp(_colC.set(0x6a5a48), OC.smoothstep(90, 12, vd) * (0.45 + n * 0.4));
    }
    // Осадочные «соляные» пятна под каналами рассола
    if (bd < 80) {
      out.lerp(_colC.set(0x8a5348), OC.smoothstep(80, 14, bd) * 0.38);
    }
    return out;
  }

  function getTemperatureAt(x, depthM, zone) {
    // Океан Европы: ~0 °C у основания панциря, ниже нуля в глубоком бассейне,
    // локально до +2…+4 °C у серпентинитовых источников (тепло водно-каменной реакции).
    let t = -1.6;
    if (zone && zone.id === 'basal_ice') t = -1.35;
    else if (zone && zone.id === 'pelagic_dust') t = -1.75;
    else if (zone && zone.id === 'ridge_flank') t = -0.65;
    else if (zone && zone.id === 'basal_plain') t = -2.15;
    else if (zone && zone.id === 'serpentine_field') t = 2.6;
    return t;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const vd = nearestVentDist(x, z);
    const bd = nearestBrineDist(x, z);
    const ventGlow = OC.smoothstep(120, 18, vd);
    const brineGlow = OC.smoothstep(90, 16, bd);

    // Под 25 км льда света нет вообще: только биолюминесценция и прожектор
    _fogCol.setHex(0x03070f)
      .lerp(_colA.set(0x0a1a26), brineGlow * 0.55)
      .lerp(_colB.set(0x241a10), ventGlow * 0.62);
    _waterCol.setHex(0x050d16).lerp(_colA.set(0x0d2430), brineGlow * 0.4);
    _skyTop.setHex(0x02060c);
    _skyBot.setHex(0x040d16);
    _aboveHoriz.setHex(0x06131f);

    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity: OC.lerp(0.0142, 0.0108, ventGlow * 0.6 + brineGlow * 0.25),
      causticStrength: 0,
      rayStrength: 0,
      sunAtten: 0.0,
      bioGlow: 1.0,
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz,
      fillAColor: _colA.set(0x2f6f96),
      fillAMult: 0.28 + brineGlow * 0.22,
      fillBColor: _colB.set(0xff8a3c),
      fillBMult: 0.10 + ventGlow * 0.85
    };
  }

  function getCurrentAt(x, y, z, time, out) {
    if (!out) out = new T.Vector3();
    // Приливное изгибание панциря Европы (период 3,55 суток) гонит океанские воды
    const tide = Math.sin(time * 0.09 + z * 0.004) * 0.16;
    out.set(0.10 + tide, Math.sin(time * 0.13 + x * 0.006) * 0.03, -0.06 + Math.cos(time * 0.07 - x * 0.004) * 0.12);

    // Восходящие струи над серпентинитовыми трубами (H₂/CH₄-флюид)
    const vd = nearestVentDist(x, z);
    if (vd < 46) {
      const core = OC.smoothstep(46, 6, vd);
      out.y += core * 1.55;
      out.x += Math.sin(time * 0.7 + y * 0.15) * core * 0.34;
    }

    // Тяжёлый рассол стекает по ледяным каналам вниз
    const bd = nearestBrineDist(x, z);
    if (bd < 40) {
      const core = OC.smoothstep(40, 8, bd);
      out.y -= core * 0.95;
      out.z -= core * 0.22;
    }
    return out;
  }

  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const items = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;

    function add(species, x, z, scale, tint, yOverride) {
      const y = (yOverride !== undefined) ? yOverride : (getHeight(x, z) - 0.08);
      items.push({ species, x, y, z, ry: rng() * 6.283, scale, tint: tint || 0xffffff });
    }

    // 1. Криолес — бледные «водоросли», живущие на водороде серпентинизации
    const forestSlots = Math.round(16 * density);
    for (let i = 0; i < forestSlots; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const fl = getHeight(x, z);
      const vd = nearestVentDist(x, z);
      if (fl < -60 && fl > -104 && vd > 34) {
        add('cryo_forest', x, z, OC.lerp(0.8, 1.45, rng()), 0xdff2ff);
      }
    }

    // 2. Ледяные занавеси, свисающие с базального льда
    const veilSlots = Math.round(9 * density);
    for (let i = 0; i < veilSlots; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const ceil = getCeilingHeight(x, z);
      const fl = getHeight(x, z);
      if (ceil - fl > 12 && rng() < 0.82) {
        add('ice_veil', x, z, OC.lerp(0.85, 1.5, rng()), 0xcfe9ff, ceil - 0.55);
      }
    }

    // 3. Серпентинитовые трубы и колонии у их подножия
    for (let s = 0; s < VENT_SITES.length; s++) {
      const site = VENT_SITES[s];
      if (site.x + 80 < x0 || site.x - 80 > x0 + chunkSize || site.z + 80 < z0 || site.z - 80 > z0 + chunkSize) continue;
      const chimneys = Math.round(5 * density);
      for (let i = 0; i < chimneys; i++) {
        const a = (i / Math.max(1, chimneys)) * 6.28 + rng() * 0.6;
        const r = i === 0 ? rng() * 5 : OC.lerp(9, 40, rng());
        const px = site.x + Math.cos(a) * r;
        const pz = site.z + Math.sin(a) * r;
        if (px >= x0 && px < x0 + chunkSize && pz >= z0 && pz < z0 + chunkSize) {
          add('serpentine_chimney', px, pz, i === 0 ? 1.35 : OC.lerp(0.7, 1.15, rng()));
        }
      }
      const worms = Math.round(13 * density);
      for (let i = 0; i < worms; i++) {
        const a = rng() * 6.283;
        const r = OC.lerp(7, 46, rng());
        const px = site.x + Math.cos(a) * r;
        const pz = site.z + Math.sin(a) * r;
        if (px >= x0 && px < x0 + chunkSize && pz >= z0 && pz < z0 + chunkSize) {
          add('cryo_tubeworm', px, pz, OC.lerp(0.85, 1.5, rng()), 0xfff1d8);
        }
      }
      const mats = Math.round(8 * density);
      for (let i = 0; i < mats; i++) {
        const a = rng() * 6.283;
        const r = OC.lerp(4, 34, rng());
        const px = site.x + Math.cos(a) * r;
        const pz = site.z + Math.sin(a) * r;
        if (px >= x0 && px < x0 + chunkSize && pz >= z0 && pz < z0 + chunkSize) {
          add('chemo_mat', px, pz, OC.lerp(0.9, 1.6, rng()), 0xffe9a8);
        }
      }
    }

    // 4. Рассольные полипы у подножия ледяных каналов
    for (let b = 0; b < BRINE_CHANNELS.length; b++) {
      const ch = BRINE_CHANNELS[b];
      if (ch.x + 70 < x0 || ch.x - 70 > x0 + chunkSize || ch.z + 70 < z0 || ch.z - 70 > z0 + chunkSize) continue;
      const polyps = Math.round(10 * density);
      for (let i = 0; i < polyps; i++) {
        const a = rng() * 6.283;
        const r = OC.lerp(6, 44, rng());
        const px = ch.x + Math.cos(a) * r;
        const pz = ch.z + Math.sin(a) * r;
        if (px >= x0 && px < x0 + chunkSize && pz >= z0 && pz < z0 + chunkSize) {
          add('brine_polyp', px, pz, OC.lerp(0.8, 1.45, rng()), 0xff9a7a);
        }
      }
    }

    // 5. Редкие сульфатные корки на глубокой равнине
    const crustSlots = Math.round(6 * density);
    for (let i = 0; i < crustSlots; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const fl = getHeight(x, z);
      if (fl < -96) add('sulfate_crust', x, z, OC.lerp(0.9, 1.5, rng()), 0xd7e2ef);
    }

    return items;
  }

  const _lmRaw = [
    {
      id: 'basal_ice_view',
      name: 'Нижняя граница ледяного панциря',
      zoneId: 'basal_ice',
      x: 74, z: -96,
      y: -7,
      yaw: 2.05, pitch: 0.42, clearance: 5.0,
      description: 'Потолок из базального льда: над вами 25 километров сплошного льда, а внизу — тёмная вода океана. Здесь начинается жизнь, которой нет на Земле.'
    },
    {
      id: 'cryo_forest_stand',
      name: 'Криолес: лес на водороде',
      zoneId: 'ridge_flank',
      x: -34, z: 42,
      y: -52,
      yaw: 0.62, pitch: -0.16, clearance: 5.5,
      description: 'Бледные ленточные «водоросли», растущие без солнечного света: их протонные насосы питаются водородом, который выделяет серпентинизация мантийного камня.'
    },
    {
      id: 'serpentine_field',
      name: 'Поле серпентинитовых труб',
      zoneId: 'serpentine_field',
      x: -292, z: 138,
      y: -68,
      yaw: 1.22, pitch: -0.12, clearance: 5.0,
      description: 'Холодные щелочные трубы высотой с девятиэтажный дом: они не кипят, но выбрасывают в океан водород, метан и тёплый флюид — главный источник энергии здесь.'
    },
    {
      id: 'hydrogen_vent',
      name: 'Водородный сип',
      zoneId: 'serpentine_field',
      x: -146, z: 262,
      y: -68,
      yaw: 2.86, pitch: -0.18, clearance: 5.0,
      description: 'Главный «водородный кран» Европы: поток газа поднимается из пористой коры и питает колонии криотрубчатых червей.'
    },
    {
      id: 'tara_brine',
      name: 'Карман рассола Тары',
      zoneId: 'basal_ice',
      x: -68, z: 214,
      y: -12,
      yaw: 0.18, pitch: 0.30, clearance: 5.0,
      description: 'Канал, где океанская вода замерзает в панцире, а солёный рассол стекает вниз. Здесь JWST и «Юнона» нашли на поверхности поваренную соль океана Европы.'
    },
    {
      id: 'basal_plain_floor',
      name: 'Дно глубоководной равнины',
      zoneId: 'basal_plain',
      x: 392, z: -338,
      y: -100,
      yaw: 3.42, pitch: -0.10, clearance: 5.5,
      description: 'Базальтовое дно под толщей океана в сто километров. Давление 350 атмосфер, температура −2 °C, и ни одного луча света — за всю историю Вселенной.'
    }
  ];

  const landmarks = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: safeSpotY(lm.x, lm.z, lm.y, lm.clearance)
  }));

  const spawnX = landmarks[1].x;
  const spawnZ = landmarks[1].z;
  const spawnY = safeSpotY(spawnX, spawnZ, -46, 5.5);

  const _tourRaw = [
    { x: landmarks[0].x, y: -18, z: landmarks[0].z, lx: 74, ly: 12.0, lz: -126, title: 'Потолок изо льда: нижняя граница панциря Европы', duration: 10,
      fact: 'Между вами и Солнцем — 25 километров сплошного льда. Солнечный свет физически не может попасть сюда: вся жизнь океана Европы должна быть хемосинтетической.' },
    { x: landmarks[1].x, y: -44, z: landmarks[1].z, lx: -34, ly: -74, lz: 42, title: 'Криолес: лес, живущий на водороде', duration: 10,
      fact: 'Когда океанская вода встречается с мантийным перидотитом, происходит серпентинизация: выделяются тепло, водород и метан — готовая химическая энергия для жизни без солнца.' },
    { x: landmarks[2].x, y: -70, z: landmarks[2].z, lx: -292, ly: -76, lz: 138, title: 'Поле серпентинитовых труб', duration: 9,
      fact: 'В отличие от земных чёрных курильщиков, температура здесь никогда не выше +100 °C: серпентинизация — «холодный» источник энергии, но её поток на единицу площади вчетверо больше земного.' },
    { x: landmarks[3].x, y: -68, z: landmarks[3].z, lx: -146, ly: -74, lz: 262, title: 'Водородный сип и колонии червей', duration: 9,
      fact: 'Водород — самый бедный из газов, но для микробов он как топливо из чистого золота: окисляя H₂, они дышат без кислорода и растут быстрее, чем на Земле при том же свете.' },
    { x: landmarks[4].x, y: -16, z: landmarks[4].z, lx: -68, ly: 6.0, lz: 214, title: 'Карман рассола Тары', duration: 9,
      fact: 'JWST (2025) нашёл в хаос-террен Тары кристаллический лёд прямо на поверхности, а вместе с ним — хлорид натрия и углекислый газ: океанская вода поднимается сквозь панцирь.' },
    { x: landmarks[5].x, y: -100, z: landmarks[5].z, lx: 392, ly: -112, lz: -338, title: 'Дно океана: сто километров ниже', duration: 10,
      fact: 'Гравитация Европы — 1,315 м/с², поэтому на глубине 25 км давление здесь около 270 атмосфер, а не две тысячи. Океан Европы глубже земного и содержит вдвое больше воды.' }
  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, safeSpotY(leg.x, leg.z, leg.y, 4.5), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    fact: leg.fact,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    floor: ['Базальтовое дно океана Европы', 'Europa Oceanic Basalt', 'Геология', 'Все зоны', '25 080 – 25 118 м',
      'Тёмный базальт с сульфатными корками. Реальное дно Европы лежит примерно на 100 км ниже, но мы находимся у верхней кромки океана, прямо под ледяным панцирем — вертикальный масштаб сильно сжат.'],
    basal_ice: ['Базальный слой ледяного панциря', 'Europa Basal Ice Layer', 'Геология', 'Базальный лёд', '24 982 – 24 992 м',
      'Нижняя граница ледяной оболочки Европы толщиной 15–25 км. «Юнона» в январе 2026 года измерила среднюю толщину панциря около 29 км в исследованном регионе.'],
    brine_channel: ['Канал рассола под панцирем', 'Brine Channel (Tara Regio)', 'Геология', 'Карман рассола Тары', '24 990 – 25 010 м',
      'Тяжёлый солёный рассол стекает вниз, пока более лёгкий рассол замерзает в панцире. На поверхности Европы в хаос-террен Тары найдены хлорид натрия и CO₂ — следы океанской воды.'],
    cryo_forest: ['Криолес Европы', 'Cryophyton europaeum (hypothetical)', 'Флора', 'Серпентинитовый хребет', '25 020 – 25 060 м',
      'Ленточные бледно-голубые «водоросли», растущие на склонах хребта. Не фотосинтез, а окисление водорода из серпентинизации питает их протонные насосы — аналог земных сероводородных бактерий.'],
    ice_veil: ['Ледяные занавеси', 'Cryovelum basale (hypothetical)', 'Флора', 'Базальный лёд', '24 984 – 25 000 м',
      'Прозрачные нити, свисающие с нижней поверхности льда. Они живут в «двойном слое» — между базальным льдом и верхним слоем океана есть тонкий второй ледяной слой.'],
    serpentine_chimney: ['Серпентинитовая труба', 'Serpentinite Chimney (Europa)', 'Геология', 'Серпентинитовое поле', '25 060 – 25 080 м',
      'Холодная щелочная постройка высотой до 9 м: брусит и карбонат, растущие вокруг жилы, по которой поднимается водородно-метановый флюид.'],
    cryo_tubeworm: ['Криотрубчатый червь', 'Cryotubicola europaea (hypothetical)', 'Беспозвоночные', 'Серпентинитовое поле', '25 060 – 25 078 м',
      'Белые известковые трубки, растущие на склонах серпентинитовых труб. Внутри — симбионты, окисляющие водород: по аналогии с земными Riftia, но без кислорода и без солнца.'],
    chemo_mat: ['Хемосинтетический мат', 'H₂-Sulfide Mat', 'Кораллы', 'Серпентинитовое поле', '25 058 – 25 080 м',
      'Кремнисто-желтёные бактериальные плёнки, растущие на базальте у выходов флюида. Это «луг» океана Европы — единственный источник первичной продукции.'],
    brine_polyp: ['Рассольный полип', 'Halopolypus europaeus (hypothetical)', 'Беспозвоночные', 'Карман рассола Тары', '24 992 – 25 020 м',
      'Коралловидные колонии, растущие на дне под каналами рассола. Их красный цвет даёт окисленное железо, вынесенное из базальта рассолом.'],
    sulfate_crust: ['Сульфатная корка', 'Europa Sulfate Crust', 'Геология', 'Глубинная океаническая равнина', '25 080 – 25 118 м',
      'Плотный слой сульфатных осадков, который, по расчётам, может покрывать дно океана Европы на километры — минеральный «снег» застывшей морской воды.'],
    cryo_glider: ['Ледяной планер', 'Cryoplanus europaeus (hypothetical)', 'Рыбы', 'Серпентинитовый хребет', '25 015 – 25 045 м',
      'Плоское полупрозрачное тело с длинными лучами-«крыльями». Парит над хребтом в толще ледяной пыли, фильтруя её щупальцами-воронками.'],
    cryo_krill: ['Крио-криль', 'Cryokrillia europaea (hypothetical)', 'Беспозвоночные', 'Верхний пелагиал', '24 992 – 25 020 м',
      'Крошечные (2–4 см) прозрачные рачки, объединяющиеся в стаи прямо под базальным льдом. Единственный «пастбищный» вид — он ест ледяную пыль, падающую с панциря.'],
    cryo_shrimp: ['Сиповая креветка', 'Serpentina natantium (hypothetical)', 'Беспозвоночные', 'Серпентинитовое поле', '25 060 – 25 080 м',
      'Крупные (до 20 см) креветки, кишащие вокруг выходов флюида. По земной аналогии — детритные падальщики возле гидротерм, только в холодной и щелочной воде.'],
    cryo_ray: ['Ледяной скат', 'Cryobatis gelida (hypothetical)', 'Мегафауна', 'Серпентинитовый хребет', '25 010 – 25 050 м',
      'Плоское «планерное» животное с размахом крыльев до 6 метров, скользящее над хребтом и ловящее крио-криль. На Земле аналогов нет.'],
    armored_swimmer: ['Броненосец', 'Cryocetus loricatus (hypothetical)', 'Мегафауна', 'Глубинокая океаническая равнина', '25 050 – 25 090 м',
      'Крупный (8–12 м) хищник с коническим панцирем из минерального композита. Охотится на крио-планеров и крио-креветок, приходя к серпентинитовым полям на «перекус».'],
    cryo_medusa: ['Фонарная медуза', 'Lanternomedusa europaea (hypothetical)', 'Беспозвоночные', 'Верхний пелагиал', '24 992 – 25 060 м',
      'Красноватая медуза с цепочкой холодных голубых фотофоров. Вспышкивает по краю купола, когда к ней приближается хищник, — единственный «маяк» в океане Европы.'],
    vent_crab: ['Сип-краб', 'Cryopus europaeus (hypothetical)', 'Беспозвоночные', 'Серпентинитовое поле', '25 058 – 25 080 м',
      'Панцирный краулер, медленно обходящий подножие серпентинитовых труб в холодной щелочной воде. Как и земные крабы у источников, он живёт за счёт хемосинтетической микрофлоры, а не от добычи на свету.']
  };

  const FAUNA_PLAN = {
    cleaningStations: [],
    schools: [
      { key: 'cryo_glider', n: 44, cx: -34, cz: 42, radius: 46, yDepth: -52, yAmp: 7.0, spread: 22, speed: 3.4, scale: 1.0,
        geoKey: 'cryo_glider', diel: 'cathemeral', biolum: true, shyness: 0.25, curious: 0.55, dvmAmp: 9 },
      { key: 'cryo_glider', n: 34, cx: 120, cz: -180, radius: 38, yDepth: -38, yAmp: 6.0, spread: 18, speed: 3.0, scale: 0.9,
        geoKey: 'cryo_glider', diel: 'cathemeral', biolum: true, shyness: 0.3, curious: 0.5, dvmAmp: 9 },
      { key: 'cryo_krill', n: 76, cx: 74, cz: -96, radius: 34, yDepth: -22, yAmp: 4.0, spread: 16, speed: 2.2, scale: 0.7,
        geoKey: 'cryo_krill', diel: 'cathemeral', biolum: true, shyness: 0.05, curious: 0.25, dvmAmp: 5 },
      { key: 'cryo_krill', n: 62, cx: -68, cz: 214, radius: 30, yDepth: -26, yAmp: 3.4, spread: 14, speed: 2.0, scale: 0.66,
        geoKey: 'cryo_krill', diel: 'cathemeral', biolum: true, shyness: 0.05, curious: 0.25, dvmAmp: 5 },
      { key: 'cryo_shrimp', n: 58, cx: -292, cz: 138, radius: 26, yDepth: -70, yAmp: 3.0, spread: 12, speed: 3.0, scale: 0.85,
        geoKey: 'cryo_shrimp', diel: 'cathemeral', biolum: true, shyness: 0.12, curious: 0.6, dvmAmp: 2 },
      { key: 'cryo_shrimp', n: 46, cx: -146, cz: 262, radius: 22, yDepth: -72, yAmp: 2.6, spread: 10, speed: 2.8, scale: 0.8,
        geoKey: 'cryo_shrimp', diel: 'cathemeral', biolum: true, shyness: 0.12, curious: 0.6, dvmAmp: 2 }
    ],
    cryoRays: [
      { cx: -60, cz: 70, r: 70, y: -48, speed: 2.1, scale: 1.15 },
      { cx: 210, cz: -240, r: 82, y: -40, speed: 1.9, scale: 1.0 }
    ],
    armoredSwimmers: [
      { cx: -180, cz: 40, r: 120, y: -66, speed: 1.6, scale: 1.25 },
      { cx: 300, cz: -280, r: 140, y: -84, speed: 1.4, scale: 1.1 }
    ],
    cryoMedusae: [
      { x: -20, y: -26, z: -40, scale: 1.25 },
      { x: 150, y: -34, z: 120, scale: 1.4 },
      { x: -220, y: -30, z: 260, scale: 1.15 },
      { x: 320, y: -46, z: -160, scale: 1.3 }
    ],
    ventCrabs: [
      { cx: -282, cz: 128, r: 16, y: -74, speed: 0.8, scale: 1.0 },
      { cx: -304, cz: 152, r: 14, y: -74, speed: 0.7, scale: 0.9 },
      { cx: -138, cz: 254, r: 15, y: -76, speed: 0.75, scale: 0.95 }
    ],
    ventPlumes: [
      { x: -292, z: 138, chimneyH: 9.0, height: 34, n: 170, light: true, coldSeep: true, key: 'serpentine_chimney' },
      { x: -146, z: 262, chimneyH: 8.0, height: 30, n: 150, light: true, coldSeep: true, key: 'serpentine_chimney' },
      { x: -392, z: -48, chimneyH: 7.5, height: 26, n: 130, light: false, coldSeep: true, key: 'serpentine_chimney' }
    ]
  };

  OC.Biomes.register({
    id: 'europa_ocean',
    name: 'Океан Европы',
    region: 'Луна Европы · орбита Юпитера · подлёдный океан',
    subtitle: 'Лёд 25 км · Океан 60–150 км · 272 атм · −1,6 °C',
    globe: {
      world: 'europa',
      lat: 14.2, lon: -142.1,
      coordLabel: '14,2° с.ш., 142,1° з.д. (система Европы)',
      ocean: 'Подлёдный океан Европы · базальный лёд',
      depthSpan: '24 982 – 25 118 м',
      tempSpan: '−2,1 … +2,6 °C',
      color: '#7fd4ff',
      country: 'Европа — спутник Юпитера (СП)',
      waterType: 'subglacial',
      protectionStatus: 'объект будущих миссий Europa Clipper и JUICE',
      notableFor: 'глобальный океан под 25 км льда, серпентинитовые источники, криолес, H₂-экосистемы',
      summary: 'Верхние 100 метров глобального океана Европы прямо под ледяным панцирем: криолес, живущий на водороде, холодные серпентинитовые трубы и уникальная биолюминесцентная фауна, которой нет на Земле.'
    },
    worldRadius: 1200,
    chunkSize: 150,
    seaLevel: 0,
    depthOffset: ICE_SHELL_DEPTH,
    pressureScale: GRAVITY_SCALE,
    noSurface: true,
    maxCamY: 16.0,
    minimapTheme: 'europa',
    spawn: {
      pos: [spawnX, spawnY, spawnZ],
      yaw: 0.62,
      pitch: -0.16
    },
    zones: ZONES,
    landmarks,
    tourLegs,
    getHeight,
    getCeilingHeight,
    getCeilingColor,
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
