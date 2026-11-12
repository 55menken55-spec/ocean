/* ================= БИОМ: МАРИАНСКАЯ ВПАДИНА И ОАЗИС КИТОВОГО ПАДЕНИЯ (10 920 М) ================= */
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

  // Сдвиг реальной глубины Бездны Челленджера: -20 м -> 10860 м, -108 м -> 10948 м (~1090 атм)
  const DEPTH_OFFSET = 10840;

  const WHALE_FALL_POS = { x: -18, z: 24, yaw: 0.56 };
  const WHALE_FALL_SOUTH = { x: 75, z: -310, yaw: -0.78 };

  const SEEP_FIELDS = [
    { x: 34, z: -145, r: 58, peakY: -78.0 },
    { x: -72, z: 225, r: 52, peakY: -80.0 },
    { x: 115, z: 385, r: 48, peakY: -82.0 }
  ];

  const ZONES = [
    {
      id: 'whale_fall',
      name: 'Оазис китового падения (Whale Fall)',
      shortName: 'Китовое падение',
      color: '#ff6e9c',
      depthLabel: '10 905 – 10 936 м',
      tempC: 2.4,
      description: 'Автономная экосистема на гигантском 24-метровом скелете синего кита: черви-костоеды Osedax, супер-амфиподы и морские свинки.'
    },
    {
      id: 'serpentinite_seeps',
      name: 'Серпентинитовые сипы Сирена',
      shortName: 'Сипы Сирена',
      color: '#62e0ff',
      depthLabel: '10 900 – 10 932 м',
      tempC: 3.6,
      description: 'Холодные щелочные брусит-карбонатные трубы в зоне субдукции, выделяющие струи метана и водорода.'
    },
    {
      id: 'subduction_walls',
      name: 'Утёсы субдукции Тихоокеанской плиты',
      shortName: 'Стены жёлоба',
      color: '#6e7ca8',
      depthLabel: '10 852 – 10 912 м',
      tempC: 1.8,
      description: 'Грандиозные ступенчатые разломы погружения океанической литосферы со стебельчатыми стеклянными губками Caulophacus.'
    },
    {
      id: 'challenger_floor',
      name: 'Дно Бездны Челленджера',
      shortName: 'Бездна Челленджера',
      color: '#2d3b70',
      depthLabel: '10 918 – 10 948 м',
      tempC: 2.1,
      description: 'Глубочайший известный участок Мирового океана (давление ~1090 атм), покрытый диатомовым илом и населённый морскими слизнями.'
    }
  ];

  function trenchAxisX(z) {
    return Math.sin(z * 0.0024) * 95 + Math.cos(z * 0.0055) * 32;
  }

  function nearestSeepDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < SEEP_FIELDS.length; i++) {
      const d = Math.hypot(x - SEEP_FIELDS[i].x, z - SEEP_FIELDS[i].z);
      if (d < best) best = d;
    }
    return best;
  }

  function getHeight(x, z) {
    const rx = x - trenchAxisX(z);
    const ax = Math.abs(rx);

    // Плоское илистое дно жёлоба (-96 м = 10 936 м), ступенчатые стены субдукции (-96 .. -18 м), внешний край плиты
    let h = -96.0;

    // Плавный подъём крутых ступенчатых уступов субдукции (210 .. 760 м от оси)
    const wallSlope = OC.smoothstep(185, 660, ax) * 72.0;
    const stepTerraces = Math.sin(ax * 0.032) * 3.4 * OC.smoothstep(200, 620, ax) * OC.smoothstep(860, 640, ax);
    h += wallSlope + stepTerraces;

    // Слабый тектонический вал по внешней бровке
    const outerSlope = OC.smoothstep(760, 1140, ax) * 14.0;
    h -= outerSlope;

    // Ребристые разломы, гадальные валуны и мягкая рябь илистого дна
    const faults = (OC.ridged2(x * 0.009, z * 0.009, 3) - 0.5) * 8.5 * OC.smoothstep(120, 480, ax);
    const mudWaves = OC.fbm2(x * 0.028, z * 0.028, 3) * 2.6;
    h += faults + mudWaves;

    // Локальные серпентинитовые грязевые холмы у сипов Сирена
    for (let i = 0; i < SEEP_FIELDS.length; i++) {
      const sf = SEEP_FIELDS[i];
      const d = Math.hypot(x - sf.x, z - sf.z);
      if (d < sf.r * 1.65) {
        const m = OC.smoothstep(sf.r * 1.5, 6.0, d);
        h = OC.lerp(h, sf.peakY + (OC.noise2(x * 0.07, z * 0.07) - 0.5) * 1.8, m * 0.85);
      }
    }

    // Ровная иловая площадка под главным скелетом синего кита
    const wfDist = Math.hypot(x - WHALE_FALL_POS.x, z - WHALE_FALL_POS.z);
    if (wfDist < 36) {
      h = OC.lerp(h, -92.5, OC.smoothstep(36, 12, wfDist) * 0.9);
    }

    return OC.clamp(h, -108.0, -14.0);
  }

  function safeSpotY(x, z, desiredY, clearance) {
    return Math.max(desiredY, getHeight(x, z) + (clearance || 4.2));
  }

  function getZoneAt(x, y, z) {
    const wfDist = Math.min(
      Math.hypot(x - WHALE_FALL_POS.x, z - WHALE_FALL_POS.z),
      Math.hypot(x - WHALE_FALL_SOUTH.x, z - WHALE_FALL_SOUTH.z)
    );
    if (wfDist < 68) return ZONES[0]; // whale_fall
    if (nearestSeepDist(x, z) < 76) return ZONES[1]; // serpentinite_seeps
    const rx = Math.abs(x - trenchAxisX(z));
    if (rx > 240) return ZONES[2]; // subduction_walls
    return ZONES[3]; // challenger_floor
  }

  function getTerrainColor(x, y, z, out) {
    const wfDist = Math.hypot(x - WHALE_FALL_POS.x, z - WHALE_FALL_POS.z);
    const sd = nearestSeepDist(x, z);
    const n = OC.clamp(OC.fbm2(x * 0.048, z * 0.048, 2) * 0.8 + 0.5, 0, 1);

    _colA.set(0x282c36); // глубоководный радиоляриевый/диатомовый ил
    _colB.set(0x181c24); // тёмные габбро-перидотитовые осыпи
    _colC.set(0x6d8492); // светлый карбонат-бруситовый налёт у сипов

    out.copy(_colA).lerp(_colB, n * 0.55);

    if (y > -64) {
      // На уступах субдукции виден тёмно-синеватый серпентинит и базальты
      out.lerp(_colB.set(0x323b4c), OC.smoothstep(-64, -22, y) * (0.45 + n * 0.35));
    }
    if (sd < 72) {
      out.lerp(_colC, OC.smoothstep(72, 10, sd) * (0.55 + n * 0.35));
    }
    if (wfDist < 42) {
      // Светло-кремовые сернистые бактериальные маты вокруг костей кита
      out.lerp(_colC.set(0x7c745c), OC.smoothstep(42, 8, wfDist) * 0.52);
    }
    return out;
  }

  function getTemperatureAt(x, depthM, zone) {
    // Адиабатическое сжатие на глубинах ~10 900 м удерживает воду около +2.1 °C (чуть выше, чем на 4000 м!)
    let t = zone && zone.id === 'subduction_walls' ? 1.85 : 2.15;
    if (zone && zone.id === 'serpentinite_seeps') t = 3.4;
    else if (zone && zone.id === 'whale_fall') t = 2.45;
    t += Math.max(0, (depthM - 10880) * 0.004);
    return t;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const wfDist = Math.hypot(x - WHALE_FALL_POS.x, z - WHALE_FALL_POS.z);
    const sd = nearestSeepDist(x, z);
    const oasisGlow = OC.smoothstep(70, 12, wfDist);
    const seepGlow = OC.smoothstep(85, 14, sd);

    _fogCol.set(0x02050c)
      .lerp(_colA.set(0x0b0612), oasisGlow * 0.55)
      .lerp(_colB.set(0x04121b), seepGlow * 0.48);
    _waterCol.set(0x061024).lerp(_colA.set(0x102838), seepGlow * 0.45);
    _skyTop.set(0x010206);
    _skyBot.set(0x020610);
    _aboveHoriz.set(0x040814);

    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity: OC.lerp(0.0135, 0.0185, Math.max(oasisGlow, seepGlow)),
      causticStrength: 0,
      rayStrength: 0,
      sunAtten: 0.0,
      bioGlow: 1.0,
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz,
      fillAColor: _colB.set(0x2e7cb8),
      fillAMult: 0.48 + seepGlow * 0.42,
      fillBColor: _colC.set(0xe8568e),
      fillBMult: 0.18 + oasisGlow * 0.92
    };
  }

  function getCurrentAt(x, y, z, time, out) {
    if (!out) out = new T.Vector3();
    out.set(0.12 + Math.sin(time * 0.12 + z * 0.008) * 0.08, 0, 0.24);

    // Восходящие холодные шлейфы метана и водорода над серпентинитовыми сипами
    for (let i = 0; i < SEEP_FIELDS.length; i++) {
      const sf = SEEP_FIELDS[i];
      const d = Math.hypot(x - sf.x, z - sf.z);
      if (d < 42) {
        const fl = getHeight(x, z);
        const above = Math.max(0, y - fl);
        if (above < 40) {
          const core = OC.smoothstep(42, 6, d) * OC.smoothstep(40, 6, above);
          out.y += core * 1.85;
          out.x += Math.sin(time * 0.65 + y * 0.14) * core * 0.42;
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
      const y = getHeight(x, z);
      items.push({ species, x, y: y - 0.08, z, ry: rng() * 6.283, scale, tint: tint || 0xffffff });
    }

    // 1. Карбонатные серпентинитовые столбы на полях сипов Сирена
    for (let s = 0; s < SEEP_FIELDS.length; s++) {
      const sf = SEEP_FIELDS[s];
      if (sf.x + 65 < x0 || sf.x - 65 > x0 + chunkSize || sf.z + 65 < z0 || sf.z - 65 > z0 + chunkSize) continue;
      const spires = Math.round(6 * density);
      for (let i = 0; i < spires; i++) {
        const a = (i / Math.max(1, spires)) * 6.28 + rng() * 0.5;
        const r = i === 0 ? rng() * 4 : OC.lerp(6, 30, rng());
        const px = sf.x + Math.cos(a) * r;
        const pz = sf.z + Math.sin(a) * r;
        if (px >= x0 && px < x0 + chunkSize && pz >= z0 && pz < z0 + chunkSize) {
          add('serpentinite_vent', px, pz, i === 0 ? 1.25 : OC.lerp(0.68, 1.15, rng()));
        }
      }
    }

    // 2. Черви-костоеды Osedax вокруг обоих оазисов китового падения
    const whaleCenters = [WHALE_FALL_POS, WHALE_FALL_SOUTH];
    for (let w = 0; w < whaleCenters.length; w++) {
      const wc = whaleCenters[w];
      if (wc.x + 55 < x0 || wc.x - 55 > x0 + chunkSize || wc.z + 55 < z0 || wc.z - 55 > z0 + chunkSize) continue;
      const nOs = Math.round(14 * density);
      for (let i = 0; i < nOs; i++) {
        const a = rng() * 6.283;
        const r = OC.lerp(5, 28, rng());
        const px = wc.x + Math.cos(a) * r;
        const pz = wc.z + Math.sin(a) * r;
        if (px >= x0 && px < x0 + chunkSize && pz >= z0 && pz < z0 + chunkSize) {
          add('osedax_plume', px, pz, OC.lerp(0.85, 1.45, rng()));
        }
      }
    }

    // 3. Ультраабиссальные стебельчатые губки Caulophacus, чёрные кораллы и стеклянные губки на уступах и в жёлобе
    const slots = Math.round(24 * density);
    for (let i = 0; i < slots; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const rx = Math.abs(x - trenchAxisX(z));
      const sd = nearestSeepDist(x, z);

      if (sd < 60 && rng() < 0.5) {
        add('osedax_plume', x, z, OC.lerp(0.72, 1.25, rng()));
      } else if (rx > 210) {
        const r = rng();
        if (r < 0.48) add('hadal_sponge', x, z, OC.lerp(0.82, 1.45, rng()));
        else if (r < 0.80) add('coral_black', x, z, OC.lerp(0.75, 1.35, rng()));
        else add('sponge_tube', x, z, OC.lerp(0.7, 1.2, rng()), 0xc8dff0);
      } else if (rng() < 0.28) {
        add('hadal_sponge', x, z, OC.lerp(0.75, 1.25, rng()));
      }
    }

    return items;
  }

  const _lmRaw = [
    {
      id: 'challenger_deep',
      name: 'Бездна Челленджера (-10 920 м)',
      zoneId: 'challenger_floor',
      x: WHALE_FALL_POS.x + 12,
      y: -82.0,
      z: WHALE_FALL_POS.z + 24,
      yaw: 2.55,
      pitch: -0.20,
      clearance: 5.5,
      description: 'Дно глубочайшей точки Мирового океана под давлением почти 1100 атмосфер: ровный радиоляриевый ил и первые огни оазиса.'
    },
    {
      id: 'whale_fall_oasis',
      name: 'Оазис китового падения',
      zoneId: 'whale_fall',
      isHot: true,
      x: WHALE_FALL_POS.x - 16,
      y: -85.0,
      z: WHALE_FALL_POS.z - 14,
      yaw: -0.78,
      pitch: -0.18,
      clearance: 5.0,
      description: '24-метровый скелет синего кита стал оазисом жизни в пустыне гадали: кости расщепляют черви Osedax и рои гигантских амфипод.'
    },
    {
      id: 'sirena_seeps',
      name: 'Серпентинитовые сипы Сирена',
      zoneId: 'serpentinite_seeps',
      isHot: true,
      x: SEEP_FIELDS[0].x + 26,
      y: -66.0,
      z: SEEP_FIELDS[0].z + 28,
      yaw: 2.38,
      pitch: -0.18,
      clearance: 5.0,
      description: 'Светлые карбонатно-бруситовые шпили в зоне субдукции, питаемые холодным щелочным флюидом с метаном и водородом.'
    },
    {
      id: 'hadal_escarpment',
      name: 'Стена субдукции Тихоокеанской плиты',
      zoneId: 'subduction_walls',
      x: 345,
      y: -48.0,
      z: -35,
      yaw: 1.48,
      pitch: -0.14,
      clearance: 5.5,
      description: 'Крутые тектонические уступы погружающейся океанической плиты, усеянные стебельчатыми стеклянными губками Caulophacus.'
    },
    {
      id: 'trench_rim',
      name: 'Бровка ультраглубоководного обрыва',
      zoneId: 'subduction_walls',
      x: -410,
      y: -36.0,
      z: 145,
      yaw: -1.32,
      pitch: -0.22,
      clearance: 5.5,
      description: 'Кромка спуска в Марианский жёлоб, откуда открывается обзор на 11-километровую глубину и светящиеся корономедузы.'
    }
  ];

  const landmarks = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: Math.min(8.0, safeSpotY(lm.x, lm.z, lm.y, lm.clearance))
  }));

  const spawnX = landmarks[0].x;
  const spawnZ = landmarks[0].z;
  const spawnY = Math.min(6.0, safeSpotY(spawnX, spawnZ, -82.0, 5.0));

  const _tourRaw = [
    { x: spawnX, y: -82.0, z: spawnZ, lx: WHALE_FALL_POS.x, ly: -90.5, lz: WHALE_FALL_POS.z, title: 'Погружение на дно Бездны Челленджера (-10 920 м)', duration: 10,
      fact: 'На дне Марианской впадины вода сжимается примерно на 5% от своего объёма, а давление в ~1090 атмосфер раздавило бы любой обычный корпус.' },
    { x: landmarks[1].x, y: -84.0, z: landmarks[1].z, lx: WHALE_FALL_POS.x, ly: -90.5, lz: WHALE_FALL_POS.z, title: 'Оазис китового падения и черви Osedax', duration: 10,
      fact: 'Погибший синий кит кормит целую экосистему до 50–100 лет: черви Osedax растворяют кости кислотой ради липидов с помощью бактерий-симбионтов.' },
    { x: landmarks[2].x, y: -66.0, z: landmarks[2].z, lx: SEEP_FIELDS[0].x, ly: -74.0, lz: SEEP_FIELDS[0].z, title: 'Серпентинитовые сипы Сирена', duration: 9,
      fact: 'В отличие от горячих курильщиков ВТП (+380 °C), серпентинитовые сипы выделяют холодные щелочные воды с водородом и метаном — колыбель хемосинтеза.' },
    { x: landmarks[3].x, y: -48.0, z: landmarks[3].z, lx: 430, ly: -46.0, lz: -35, title: 'Стены субдукции и губки Caulophacus', duration: 9,
      fact: 'Здесь Тихоокеанская тектоническая плита возрастом ~170 млн лет уходит в мантию Земли, а на её уступах цветут кремниевые губки на длинных стеблях.' },
    { x: landmarks[4].x, y: -36.0, z: landmarks[4].z, lx: -240, ly: -74.0, lz: 110, title: 'Край ультраабиссали и морские слизни', duration: 10,
      fact: 'Марианский морской слизень Pseudoliparis обходится без жёстких костей и плавательного пузыря, выдерживая рекордное давление за счёт осмолита TMAO.' }
  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, Math.min(8.0, safeSpotY(leg.x, leg.z, leg.y, 4.5)), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    fact: leg.fact,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    floor: ['Гадальный ил Бездны Челленджера', 'Марианский жёлоб', 'Геология', 'Все зоны', '10 848 – 10 948 м',
      'Тонкий радиоляриево-диатомовый ил и серпентинитовые осыпи глубочайшей тектонической впадины Земли под давлением 1090 атм.'],
    whale_fall: ['Оазис китового падения (скелет синего кита)', 'Whale Fall (Balaenoptera musculus)', 'Экспедиция', 'Китовое падение', '10 925 м',
      '24-метровый остов синего кита на дне жёлоба, ставший многолетним хемосинтетическим оазисом для костоедных червей, амфипод и голотурий.'],
    serpentinite_vent: ['Серпентинитовый карбонатный шпиль', 'Serpentinite / Brucite Chimney', 'Геология', 'Сипы Сирена', '10 900 – 10 932 м',
      'Светлая пористая труба из брусита и арагонита, образующаяся при взаимодействии мантийных перидотитов с морской водой.'],
    osedax_plume: ['Костоедный червь Osedax («зомби-червь»)', 'Osedax mucofloris / rubiplumus', 'Беспозвоночные', 'Китовое падение', '10 920 – 10 936 м',
      'Лишённый рта и кишечника червь с красными перистыми жабрами; «корни» червя растворяют костный коллаген кита с помощью симбионтов.'],
    hadal_sponge: ['Стебельчатая стеклянная губка Caulophacus', 'Caulophacus / Hexactinellida', 'Беспозвоночные', 'Стены жёлоба', '10 855 – 10 925 м',
      'Ультраглубоководная кремниевая губка на гибком длинном стебле, поднимающем фильтрующий диск над придонным слоем ила.'],
    coral_black: ['Ультраабиссальный чёрный коралл', 'Bathypathes / Antipatharia', 'Кораллы', 'Стены жёлоба', '10 852 – 10 910 м',
      'Тёмно-коричневый роговой скелет медленно растущих глубоководных кораллов на базальтовых уступах зоны субдукции.'],
    sponge_tube: ['Абиссальная трубчатая губка', 'Hexactinellida', 'Беспозвоночные', 'Стены жёлоба', '10 860 – 10 915 м',
      'Хрупкие кремниевые трубки, процеживающие мельчайший «морской снег» с верхних горизонтов Тихого океана.'],
    hadal_snailfish: ['Марианский морской слизень', 'Pseudoliparis swirei', 'Рыбы', 'Бездна Челленджера', '10 885 – 10 945 м',
      'Самая глубоководная рыба планеты: полупрозрачное тело без чешуи и костных плавников защищено высокой концентрацией белка-осмолита TMAO.'],
    sea_pig: ['Глубоководная морская свинка', 'Scotoplanes globosa', 'Беспозвоночные', 'Китовое падение', '10 915 – 10 945 м',
      'Полупрозрачная розовая голотурия с 6 парами «ножек»-амбулакральных трубок, стадами бредущая по илу в поисках органики китового падения.'],
    amphipod: ['Гигантский гадальный супер-амфипод', 'Alicella gigantea / Hirondellea', 'Беспозвоночные', 'Китовое падение', '10 880 – 10 945 м',
      'Крупные глубоководные рачки-падальщики (до 28 см!), мгновенно собирающиеся стаями у остатков кита с помощью алюминиевого «геля» панциря.'],
    fish_angler: ['Ультраабиссальный удильщик', 'Melanocetus / Caulophryne', 'Рыбы', 'Стены жёлоба', '10 870 – 10 938 м',
      'Засадный хищник вечной гадальной тьмы со светящейся бактериальной приманкой и длинными чувствительными нитями.'],
    squid_abyssal: ['Глубоководный адский кальмар-вампир', 'Vampyroteuthis infernalis', 'Мегафауна', 'Стены жёлоба', '10 860 – 10 932 м',
      'Древний реликтовый головоногий, парящий в бескислородном слое глубин за счёт нейтральной плавучести и светящихся фотофоров.'],
    octopus_dumbo: ['Гримпотевтис (Осьминог Дамбо)', 'Grimpoteuthis', 'Мегафауна', 'Стены жёлоба', '10 860 – 10 925 м',
      'Мирный плавниковый осьминог ультраглубин, взмахивающий большими ушными плавниками над базальтовыми уступами.'],
    jelly_deep: ['Гадальная корономедуза Atolla', 'Atolla wyvillei', 'Беспозвоночные', 'Бездна Челленджера', '10 855 – 10 935 м',
      'Вспыхивает сине-лиловым биолюминесцентным «маяком тревоги» по краю купола при любом прикосновении в кромешной тьме.']
  };

  const FAUNA_PLAN = {
    cleaningStations: [],
    whaleFalls: [
      { x: WHALE_FALL_POS.x, z: WHALE_FALL_POS.z, yaw: WHALE_FALL_POS.yaw, len: 24 },
      { x: WHALE_FALL_SOUTH.x, z: WHALE_FALL_SOUTH.z, yaw: WHALE_FALL_SOUTH.yaw, len: 18 }
    ],
    snailfishes: [
      { cx: WHALE_FALL_POS.x + 8, cz: WHALE_FALL_POS.z - 6, r: 24, speed: 1.7, scale: 1.35 },
      { cx: SEEP_FIELDS[0].x - 10, cz: SEEP_FIELDS[0].z + 12, r: 28, speed: 1.5, scale: 1.2 },
      { cx: WHALE_FALL_SOUTH.x, cz: WHALE_FALL_SOUTH.z, r: 22, speed: 1.6, scale: 1.25 }
    ],
    seaPigs: [
      { cx: WHALE_FALL_POS.x + 14, cz: WHALE_FALL_POS.z + 10, r: 10, count: 6 },
      { cx: WHALE_FALL_POS.x - 18, cz: WHALE_FALL_POS.z - 8, r: 12, count: 5 },
      { cx: WHALE_FALL_SOUTH.x + 12, cz: WHALE_FALL_SOUTH.z + 10, r: 10, count: 5 }
    ],
    ventPlumes: [
      { x: SEEP_FIELDS[0].x, z: SEEP_FIELDS[0].z, chimneyH: 5.5, height: 32, n: 190, light: true, coldSeep: true, key: 'serpentinite_vent' },
      { x: SEEP_FIELDS[1].x, z: SEEP_FIELDS[1].z, chimneyH: 5.0, height: 28, n: 160, light: true, coldSeep: true, key: 'serpentinite_vent' },
      { x: SEEP_FIELDS[2].x, z: SEEP_FIELDS[2].z, chimneyH: 5.0, height: 26, n: 140, light: false, coldSeep: true, key: 'serpentinite_vent' }
    ],
    schools: [
      { key: 'amphipod', n: 56, cx: WHALE_FALL_POS.x, cz: WHALE_FALL_POS.z, radius: 14, yDepth: -88, yAmp: 3.5, spread: 8, speed: 5.4, scale: 0.44, diel: 'cathemeral', biolum: true, shyness: 0.15, curious: 0.45,
        geoOpts: { len: 0.68, height: 0.24, width: 0.22, colA: 0xf4e4d6, colB: 0xffeef8, finCol: 0xffb8cf, eyeScale: 0.4 } },
      { key: 'amphipod', n: 44, cx: WHALE_FALL_SOUTH.x, cz: WHALE_FALL_SOUTH.z, radius: 13, yDepth: -88, yAmp: 3, spread: 7, speed: 5.2, scale: 0.42, diel: 'cathemeral', biolum: true, shyness: 0.15, curious: 0.45,
        geoOpts: { len: 0.68, height: 0.24, width: 0.22, colA: 0xf4e4d6, colB: 0xffeef8, finCol: 0xffb8cf, eyeScale: 0.4 } }
    ],
    anglers: [
      { cx: 145, cz: -45, r: 46, y: -74, speed: 1.25, scale: 1.35 },
      { cx: -165, cz: 95, r: 44, y: -78, speed: 1.3, scale: 1.3 }
    ],
    squids: [
      { cx: 210, cz: 40, r: 62, y: -56, speed: 2.8, scale: 1.2 },
      { cx: -220, cz: -110, r: 58, y: -60, speed: 2.6, scale: 1.15 }
    ],
    dumbos: [
      { x: 325, z: -20, scale: 1.2 },
      { x: -375, z: 120, scale: 1.15 }
    ],
    jellies: [
      { x: WHALE_FALL_POS.x + 28, y: -76, z: WHALE_FALL_POS.z - 22, deep: true, size: 1.35 },
      { x: -195, y: -54, z: 85, deep: true, size: 1.45 },
      { x: 180, y: -62, z: -95, deep: true, size: 1.3 }
    ]
  };

  OC.Biomes.register({
    id: 'mariana_trench',
    name: 'Марианская впадина',
    region: 'Бездна Челленджера · Тихий океан',
    subtitle: 'Гадальная зона · 10 845–10 948 м · 1090 атм',
    globe: {
      lat: 11.37, lon: 142.59, coordLabel: '11.4° с.ш., 142.6° в.д.',
      ocean: 'Марианский жёлоб · Тихий океан', depthSpan: '10 845 – 10 948 м', tempSpan: '1.8 – 3.6 °C', color: '#7a9cff',
      country: 'микронезия / США (ближайшая земля — Гуам)', waterType: 'ocean', protectionStatus: 'национальный монумент Marianas Trench',
      notableFor: 'глубочайшая точка Земли (Челленджер), китовое падение, Osedax',
      summary: 'Глубочайшая бездна Земли (~10.9 км): 24-метровый скелет китового падения с червями Osedax, серпентинитовые сипы и морские слизни.'
    },
    worldRadius: 1200,
    chunkSize: 150,
    seaLevel: 0,
    depthOffset: DEPTH_OFFSET,
    noSurface: true,
    maxCamY: 12.0,
    minimapTheme: 'hadal',
    spawn: {
      pos: [spawnX, spawnY, spawnZ],
      yaw: 2.55,
      pitch: -0.20
    },
    zones: ZONES,
    landmarks,
    tourLegs,
    getHeight,
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
