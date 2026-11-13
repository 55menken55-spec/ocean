/* ================= БИОМ 10: АМАЗОНИЯ — ЗАТОПЛЕННЫЙ ЛЕС ИГАПО (РИО-НЕГРУ) ================= */
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
      id: 'igapo_roots',
      name: 'Корни затопленного леса Игапо',
      shortName: 'Затопленный лес',
      color: '#d98a36',
      depthLabel: '0 – 11 м',
      tempC: 28.5,
      description: 'Подводные арки досковидных корней гигантских деревьев Macrolobium в тёплой янтарно-чайной воде под пологом джунглей.'
    },
    {
      id: 'victoria_lagoon',
      name: 'Заводь кувшинок Victoria amazonica',
      shortName: 'Заводь кувшинок',
      color: '#4eb862',
      depthLabel: '0 – 8 м',
      tempC: 29.2,
      description: 'Спокойная старица, укрытая гигантскими плавающими листьями кувшинки Виктории амазонской и коврами эхинодорусов.'
    },
    {
      id: 'rio_negro_channel',
      name: 'Русло Чёрной воды Рио-Негру',
      shortName: 'Чёрная вода',
      color: '#a35828',
      depthLabel: '8 – 28 м',
      tempC: 27.1,
      description: 'Глубокий таниновый фарватер Рио-Негру с затонувшими стволами сельвы, электрическими угрями и розовыми речными дельфинами.'
    },
    {
      id: 'whitewater_confluence',
      name: 'Слияние вод · Encontro das Águas',
      shortName: 'Слияние вод',
      color: '#d4b26a',
      depthLabel: '4 – 24 м',
      tempC: 26.4,
      description: 'Знаменитая граница, где тёмная кислая вода Рио-Негру бок о бок встречается со светлой глинистой взвесью Амазонки (Солимойнс).'
    },
    {
      id: 'cathedral_canopy',
      name: 'Затопленная роща гигантских сейб',
      shortName: 'Роща сейб',
      color: '#349876',
      depthLabel: '0 – 14 м',
      tempC: 28.0,
      description: 'Собор из затопленных стволов и свисающих лиан, где между корнями сверкают стаи неоновых тетр и парят скалярии.'
    }
  ];

  // Изгиб основного фарватера Рио-Негру и границы слияния вод (x > +175 м)
  function channelCenterZ(x) {
    return Math.sin(x * 0.0045 + 0.6) * 85 + Math.cos(x * 0.009) * 32;
  }

  function getConfluenceBlend(x, z) {
    const u = x + Math.sin(z * 0.008) * 58;
    return OC.smoothstep(130, 320, u);
  }

  function getHeight(x, z) {
    const cz = channelCenterZ(x);
    const distToChan = Math.abs(z - cz);

    // Главный фарватер (-26..-28 м) -> затопленная пойма (-5..-11 м) -> лесные гривки (+0.2..-2.2 м)
    const chanMask = 1.0 - OC.smoothstep(28, 125, distToChan);
    let h = OC.lerp(-6.2, -26.4, chanMask);

    // Заводь гигантских кувшинок на северо-западе (-210, -140)
    const dLagoon = Math.hypot(x + 210, z + 140);
    if (dLagoon < 145) {
      const lag = OC.smoothstep(145, 50, dLagoon);
      h = OC.lerp(h, -5.2, lag * 0.85);
    }

    // Невысокие затопленные гривки леса с торчащими над водой корнями деревьев
    const hummock = OC.fbm2(x * 0.0065, z * 0.0065, 3);
    const micro = OC.fbm2(x * 0.028, z * 0.028, 2) * 0.75;
    h += hummock * 3.8 + micro;

    if (distToChan > 135 && dLagoon > 95) {
      const bankLift = OC.smoothstep(135, 340, distToChan) * OC.smoothstep(0.16, 0.52, hummock);
      h = Math.max(h, OC.lerp(-4.8, 1.85, bankLift));
    }

    // В зоне слияния (x > 220) широкое ровное песчано-глинистое русло
    const confW = getConfluenceBlend(x, z);
    if (confW > 0.05) {
      h = OC.lerp(h, -15.5 - OC.smoothstep(200, 600, x) * 7.5 + micro * 0.8, confW * 0.7);
    }

    return OC.clamp(h, -28.0, 2.2);
  }

  function safeSpotY(x, z, desiredY, clearance) {
    return Math.max(desiredY, getHeight(x, z) + (clearance || 2.8));
  }

  function getZoneAt(x, y, z) {
    if (getConfluenceBlend(x, z) > 0.52) return ZONES[3];
    if (Math.hypot(x + 210, z + 140) < 125) return ZONES[1];
    if (Math.hypot(x + 115, z - 125) < 115) return ZONES[4];
    const cz = channelCenterZ(x);
    if (Math.abs(z - cz) < 62) return ZONES[2];
    return ZONES[0];
  }

  function getCurrentAt(x, y, z, time, out) {
    const t = Number.isFinite(time) ? time : 0;
    const conf = getConfluenceBlend(x, z);
    const cz = channelCenterZ(x);
    const inChan = 1.0 - OC.smoothstep(30, 145, Math.abs(z - cz));
    const vx = 0.28 + 0.72 * inChan + 0.45 * conf + Math.sin(t * 0.07 + z * 0.013) * 0.055;
    const vz = Math.cos(x * 0.0045 + 0.6) * 0.32 + Math.sin(z * 0.02 + x * 0.01 + t * 0.04) * 0.08;
    const vy = Math.sin(x * 0.025 + z * 0.02 + t * 0.03) * 0.03;
    return out.set(vx, vy, vz);
  }

  function getTemperatureAt(x, y, zone) {
    const base = zone ? zone.tempC : 28.0;
    return OC.clamp(base - Math.max(0, -y) * 0.075, 25.4, 29.8);
  }

  function getTerrainColor(x, y, z, outColor) {
    const conf = getConfluenceBlend(x, z);
    const leaf = OC.fbm2(x * 0.055, z * 0.055, 2) * 0.5 + 0.5;
    // Тёмный листовой опад и торф Игапо -> охристый речной ил на слиянии вод -> светлый песок отмелей
    _colA.setHex(0x3b2616); // тёмный торф и листья
    _colB.setHex(0x6e4f30); // речной песок под таниновой водой
    _colC.setHex(0xb89358); // светлый ил Солимойнс
    outColor.copy(_colA).lerp(_colB, leaf * 0.78).lerp(_colC, conf * 0.85);
    if (y > -0.25) {
      _colA.setHex(0x2e4a22); // замшелые корни и берег джунглей
      outColor.lerp(_colA, OC.smoothstep(-0.25, 0.75, y) * 0.72);
    }
    return outColor;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const d = OC.clamp(dayW, 0, 1);
    const conf = getConfluenceBlend(x, z);

    if (y > 0.25) {
      _skyTop.setHex(0x165e78).lerp(new T.Color(0x061420), 1 - d);
      _skyBot.setHex(0x98d8c4).lerp(new T.Color(0x142c38), 1 - d);
      _aboveHoriz.setHex(0xa8d6b8).lerp(new T.Color(0x0b1c26), 1 - d);
      _waterCol.setHex(0x3a2410).lerp(new T.Color(0x9c7c48), conf);
      return {
        aboveWater: true,
        fogColor: _aboveHoriz,
        fogDensity: 0.0014,
        waterColor: _waterCol,
        skyTop: _skyTop,
        skyBot: _skyBot,
        causticStrength: 0.0,
        rayStrength: 0.0,
        sunAtten: 1.0,
        bioGlow: 0.0
      };
    }

    const depth = Math.max(0, -y);
    const deepT = OC.clamp(depth / 26.0, 0, 1);
    // Таниновая «чайная» вода Рио-Негру (тёплый янтарно-красноватый) переходит в золотисто-охристую воду Солимойнс
    const teaShallow = _colA.setHex(0x4f2c0d);
    const teaDeep = _colB.setHex(0x120903);
    const whiteWater = _colC.setHex(0x7c6434);
    _fogCol.copy(teaShallow).lerp(whiteWater, conf * 0.78).lerp(teaDeep, deepT * 0.84);
    _fogCol.multiplyScalar(0.18 + 0.82 * d);

    _waterCol.setHex(0x4a2a0e).lerp(new T.Color(0x8e7242), conf);
    const fogDensity = OC.lerp(0.0155, 0.0255, conf) + deepT * 0.0065;
    const sunAtten = OC.clamp(Math.exp(-depth * 0.14) * (0.14 + 0.86 * d), 0.05, 1.0);
    const causticStrength = OC.clamp((1.0 - deepT * 0.9) * (1.0 - conf * 0.65) * d * 0.72, 0.0, 0.8);
    const rayStrength = OC.clamp((1.0 - deepT * 0.85) * d * 0.64, 0.0, 0.72);
    const bioGlow = OC.clamp((1.0 - d) * 0.7 + deepT * 0.3, 0, 1.0);

    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity,
      waterColor: _waterCol,
      causticStrength,
      rayStrength,
      sunAtten,
      bioGlow
    };
  }

  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const items = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;

    const add = (species, x, y, z, scale, tint) => {
      items.push({
        species,
        x, y, z,
        ry: rng() * 6.28318,
        scale,
        tint
      });
    };

    // 1. Затопленные деревья Игапо (выступают кроной над водой)
    const nTrees = Math.round(9 * density);
    for (let i = 0; i < nTrees; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const h = getHeight(x, z);
      const conf = getConfluenceBlend(x, z);
      if (conf < 0.65 && h > -6.8 && h < 1.9) {
        add('igapo_tree', x, Math.min(0.15, h + 0.2), z, OC.lerp(0.85, 1.38, rng()), 0xffffff);
      }
    }

    // 2. Плавающие кувшинки Victoria amazonica в заводях и у корней
    const nLilies = Math.round(14 * density);
    for (let i = 0; i < nLilies; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const h = getHeight(x, z);
      const dLag = Math.hypot(x + 210, z + 140);
      if (h < -0.6 && h > -13.0 && (dLag < 170 || rng() < 0.22)) {
        add('victoria_lily', x, 0.02, z, OC.lerp(0.85, 1.35, rng()), 0xffffff);
      }
    }

    // 3. Затопленные брёвна, коряги и эхинодорусы на дне
    const nFloor = Math.round(38 * density);
    for (let i = 0; i < nFloor; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const h = getHeight(x, z);
      if (h >= -0.35) continue;
      const r = rng();
      if (r < 0.14) {
        add('sunken_log', x, h - 0.05, z, OC.lerp(0.8, 1.35, rng()), 0xffffff);
      } else if (r < 0.30) {
        add('driftwood_snag', x, h - 0.05, z, OC.lerp(0.85, 1.35, rng()), 0xffffff);
      } else if (r < 0.72) {
        add('amazon_sword', x, h - 0.04, z, OC.lerp(0.75, 1.35, rng()), 0xffffff);
      } else {
        add('seagrass', x, h - 0.03, z, OC.lerp(0.7, 1.25, rng()), 0x8ac964);
      }
    }

    return items;
  }

  const spawnPos = [-20, safeSpotY(-20, 45, -4.5, 2.8), 45];
  const spawn = { pos: spawnPos, yaw: 0.45, pitch: -0.06 };

  const landmarks = [
    {
      id: 'igapo_roots',
      name: 'Затопленный лес Игапо',
      zoneId: 'igapo_roots',
      x: -20, y: safeSpotY(-20, 45, -4.2, 2.6), z: 45,
      yaw: 0.45, pitch: -0.05,
      description: 'Лабиринт подводных стволов и корней в прозрачной таниновой воде Рио-Негру среди стай неоновых тетр и пираний.'
    },
    {
      id: 'victoria_lagoon',
      name: 'Заводь кувшинок Виктория',
      zoneId: 'victoria_lagoon',
      x: -205, y: safeSpotY(-205, -135, -3.2, 2.2), z: -135,
      yaw: -0.6, pitch: 0.16,
      description: 'Тихая старица под полутораметровыми блюдцами кувшинок Victoria amazonica, где дышат воздухом гигантские арапаимы.'
    },
    {
      id: 'rio_negro_channel',
      name: 'Фарватер Рио-Негру',
      zoneId: 'rio_negro_channel',
      x: 15, y: safeSpotY(15, 2, -13.5, 3.2), z: 2,
      yaw: 1.4, pitch: -0.1,
      description: 'Тёмный глубокий канал реки с розовыми дельфинами боуто, затонувшими деревьями и электрическими угрями у дна.'
    },
    {
      id: 'whitewater_confluence',
      name: 'Слияние вод · Encontro das Águas',
      zoneId: 'whitewater_confluence',
      x: 225, y: safeSpotY(225, -20, -6.5, 3.0), z: -20,
      yaw: -1.5, pitch: 0.02,
      description: 'Резкая граница встречи двух великих рек — янтарно-чёрной Рио-Негру и жёлто-песчаной Амазонки.'
    },
    {
      id: 'cathedral_canopy',
      name: 'Роща гигантских сейб',
      zoneId: 'cathedral_canopy',
      x: -115, y: safeSpotY(-115, 125, -4.5, 2.4), z: 125,
      yaw: 0.85, pitch: 0.08,
      description: 'Собор из затопленных исполинов сельвы, корней и скатов моторо, скользящих по слою опавших листьев.'
    }
  ];

  const tourLegs = [
    {
      pos: [landmarks[0].x, landmarks[0].y, landmarks[0].z],
      look: [landmarks[0].x + 28, -3.2, landmarks[0].z - 22],
      title: 'Подводный лес Игапо', duration: 8,
      fact: 'Во время сезона дождей в Амазонии вода поднимается на 10–14 метров, затапливая сотни тысяч квадратных километров тропического леса.'
    },
    {
      pos: [landmarks[1].x, landmarks[1].y, landmarks[1].z],
      look: [landmarks[1].x - 18, -0.6, landmarks[1].z - 16],
      title: 'Кувшинки Victoria amazonica', duration: 8,
      fact: 'Лист Виктории амазонской достигает двух метров в диаметре и способен выдержать вес до 40 килограммов благодаря решётке ребер снизу.'
    },
    {
      pos: [landmarks[2].x, landmarks[2].y, landmarks[2].z],
      look: [landmarks[2].x + 35, -12.0, landmarks[2].z + 18],
      title: 'Розовый дельфин Боуто и Арапаима', duration: 9,
      fact: 'Амазонский боуто (Inia geoffrensis) не имеет сросшихся шейных позвонков и может поворачивать голову на 90°, маневрируя между стволами деревьев.'
    },
    {
      pos: [landmarks[3].x, landmarks[3].y, landmarks[3].z],
      look: [landmarks[3].x + 45, -7.5, landmarks[3].z + 12],
      title: 'Слияние Рио-Негру и Солимойнс', duration: 8,
      fact: 'Разница температуры, скорости и плотности не даёт чёрной воде Рио-Негру и жёлтой воде Солимойнс полностью смешаться на протяжении 6 километров.'
    },
    {
      pos: [landmarks[4].x, landmarks[4].y, landmarks[4].z],
      look: [landmarks[4].x + 22, -5.2, landmarks[4].z - 20],
      title: 'Симфония пресноводного биома', duration: 8,
      fact: 'Электрический угорь Electrophorus voltai генерирует разряды свыше 800 вольт для охоты и навигации в мутной воде затопленного леса.'
    }
  ];

  const ENCYCLOPEDIA = {
    floor: ['Торф и листовой опад Игапо', 'Rio Negro Alluvium', 'География', 'Русло и пойма', '0 – 28 м',
      'Богатый танинами слой затопленных листьев джунглей и кварцевого речного песка, сменяющийся светлым илом в русле Амазонки.'],
    igapo_tree: ['Затопленное дерево игапо', 'Macrolobium acaciifolium', 'Флора', 'Затопленный лес', '0 – 10 м',
      'Деревья амазонской поймы с мощными досковидными корнями и лианами, способные месяцами стоять наполовину под водой.'],
    victoria_lily: ['Виктория амазонская', 'Victoria amazonica', 'Флора', 'Заводь кувшинок', '0 – 1 м',
      'Крупнейшая в мире кувшинка с загнутым бортиком и шиповатыми рёбрами на нижней стороне гигантского плавающего листа.'],
    amazon_sword: ['Эхинодорус амазонский', 'Echinodorus amazonicus', 'Флора', 'Затопленный лес', '0.5 – 12 м',
      'Сочные розетки длинных мечевидных подводных листьев — убежище для мальков тетр и скалярий.'],
    sunken_log: ['Затопленный ствол с губками', 'Drulia browni', 'Флора', 'Чёрная вода', '3 – 26 м',
      'Упавший ствол тропического дерева, обросший пресноводными кремниевыми губками и мхом.'],
    driftwood_snag: ['Коряга и корневище сельвы', 'Rhizosphere snag', 'Флора', 'Роща сейб', '2 – 22 м',
      'Подводные деревянные арки из переплетённых корней — охотничья засада для электрических угрей и хищных сомов.'],
    seagrass: ['Речной валлиснериевый луг', 'Vallisneria spiralis', 'Флора', 'Заводь кувшинок', '1 – 9 м',
      'Лентовидные травы отмелей, насыщающие тёплую речную воду кислородом.'],
    piranha: ['Краснобрюхая пиранья', 'Pygocentrus nattereri', 'Рыбы', 'Чёрная вода', '1 – 18 м',
      'Стайная хищная рыба с рубиновым брюхом и бритвенными зубами; в стае общается барабанными звуками плавательного пузыря.'],
    neon_tetra: ['Голубой неон', 'Paracheirodon innesi', 'Рыбы', 'Роща сейб', '0.5 – 10 м',
      'Яркая переливающаяся полоса неона служит оптическим маяком в тёмной янтарной воде, позволяя стае держаться вместе.'],
    angelfish: ['Амазонская скалярия', 'Pterophyllum scalare', 'Рыбы', 'Затопленный лес', '1 – 12 м',
      'Высокотелая полосатая рыба, идеально маскирующаяся в вертикальных тенях стеблей и корней игапо.'],
    pink_dolphin: ['Розовый речной дельфин (Боуто)', 'Inia geoffrensis', 'Мегафауна', 'Чёрная вода', '0 – 25 м',
      'Крупнейший речной дельфин Земли с гибкой шеей, выпуклым сонарным лбом и розовой окраской; свободно плавает среди стволов деревьев.'],
    arapaima: ['Гигантская арапаима', 'Arapaima gigas', 'Мегафауна', 'Заводь кувшинок', '0 – 16 м',
      'Одна из крупнейших пресноводных рыб мира (до 3 м), дышащая атмосферным воздухом каждые 15 минут у поверхности воды.'],
    electric_eel: ['Электрический угорь', 'Electrophorus voltai', 'Рыбы', 'Роща сейб', '1 – 20 м',
      'Длинный темнотелый нож-рыба с оранжевым горлом, способный вырабатывать высоковольтные электрические импульсы.'],
    river_stingray: ['Глазчатый речной скат моторо', 'Potamotrygon motoro', 'Мегафауна', 'Роща сейб', '2 – 24 м',
      'Пресноводный скат, покрытый оранжевыми «глазками» в тёмной окантовке, охотящийся на моллюсков и рачков в листовом опаде.'],
    turtle: ['Южноамериканская речная черепаха тартаруга', 'Podocnemis expansa', 'Мегафауна', 'Заводь кувшинок', '0 – 18 м',
      'Крупнейшая пресноводная бокошейная черепаха Амазонии, питающаяся упавшими плодами затопленного леса.'],
    seabird: ['Большая белая цапля Амазонии', 'Ardea alba', 'Птицы', 'Над водой', '+2 .. +24 м',
      'Грациозные белые цапли, парящие над пологом затопленного леса и высматривающие рыбу среди гигантских кувшинок.']
  };

  const FAUNA_PLAN = {
    pinkDolphins: [
      { cx: 12, cz: 15, r: 44, speed: 4.4, len: 2.6, phase: 0.2 },
      { cx: 195, cz: -25, r: 52, speed: 4.8, len: 2.45, phase: 2.4 }
    ],
    arapaimas: [
      { cx: -195, cz: -125, r: 34, y: -3.2, speed: 2.5, len: 2.9, phase: 0.5 },
      { cx: -32, cz: 38, r: 38, y: -5.2, speed: 2.7, len: 2.75, phase: 3.1 }
    ],
    electricEels: [
      { cx: -112, cz: 118, r: 16, speed: 1.85, len: 2.15, phase: 0.4 },
      { cx: 24, cz: -12, r: 18, speed: 1.95, len: 1.95, phase: 2.6 }
    ],
    riverStingrays: [
      { cx: -118, cz: 132, r: 18, speed: 1.75, scale: 1.05, phase: 0.9 },
      { cx: 215, cz: -10, r: 22, speed: 1.85, scale: 1.15, phase: 3.4 }
    ],
    turtles: [
      { cx: -190, cz: -145, r: 26, y: -3.2, speed: 1.7, size: 1.0 },
      { cx: -40, cz: 55, r: 28, y: -4.6, speed: 1.8, size: 0.95 }
    ],
    seabirds: [
      { cx: -120, cz: -40, r: 75, y: 12.5, count: 6, speed: 10.5, variant: 'tropical' }
    ],
    schools: [
      { key: 'neon_tetra', n: 120, cx: -110, cz: 122, radius: 22, yDepth: -3.8, yAmp: 1.8, seasonalDepth: 1.2, spread: 5.5, speed: 5.4, scale: 0.28, biolum: true, diel: 'diurnal', shyness: 0.75,
        geoOpts: { len: 0.72, height: 0.24, width: 0.12, colA: 0x16c8ff, colB: 0xff2e3b, finCol: 0x80eaff, stripes: 0.4 } },
      { key: 'neon_tetra', n: 95, cx: -22, cz: 46, radius: 24, yDepth: -4.0, yAmp: 1.9, seasonalDepth: 1.5, spread: 5.2, speed: 5.2, scale: 0.28, biolum: true, diel: 'diurnal', shyness: 0.75,
        geoOpts: { len: 0.72, height: 0.24, width: 0.12, colA: 0x16c8ff, colB: 0xff2e3b, finCol: 0x80eaff, stripes: 0.4 } },
      { key: 'piranha', n: 48, cx: 18, cz: 8, radius: 34, yDepth: -8.5, yAmp: 3.2, spread: 7.8, speed: 7.4, scale: 0.56, predator: true, diel: 'diurnal', shyness: 0.25,
        geoOpts: { len: 0.88, height: 0.52, width: 0.18, colA: 0x627278, colB: 0xd93022, finCol: 0xff5a36 } },
      { key: 'angelfish', n: 34, cx: -202, cz: -136, radius: 18, yDepth: -2.8, yAmp: 1.4, spread: 4.5, speed: 3.4, scale: 0.52, diel: 'diurnal', shyness: 0.45,
        geoOpts: { len: 0.76, height: 0.96, width: 0.11, colA: 0xe8edf0, colB: 0x1a1e24, finCol: 0x9aa4ab, stripes: 0.95, streamer: true } }
    ]
  };

  OC.Biomes.register({
    id: 'amazon_igapo',
    name: 'Амазония: Лес Игапо',
    subtitle: 'Затопленная сельва, Рио-Негру и Слияние вод · 0 – 28 м',
    region: 'Амазония (Бразилия)',
    worldRadius: 1200,
    chunkSize: 150,
    noSurface: false,
    seaLevel: 0,
    depthOffset: 0,
    minimapTheme: 'amazon',
    globe: {
      lat: -3.14,
      lon: -60.02,
      coordLabel: '3.1° S, 60.0° W',
      ocean: 'Бассейн Амазонки · Рио-Негру',
      depthSpan: '0 – 28 м',
      tempSpan: '26.4 – 29.2 °C',
      color: '#f59e0b',
      country: 'Бразилия', waterType: 'river', protectionStatus: 'не охраняется',
      notableFor: 'затопленный лес, розовые дельфины боуто, арапаимы, электрические угри',
      summary: 'Затопленный тропический лес в янтарной воде Рио-Негру и граница Encontro das Águas: розовые дельфины боуто, арапаимы, электрические угри и кувшинки Виктория.'
    },
    zones: ZONES,
    landmarks,
    tourLegs,
    spawn,
    encyclopedia: ENCYCLOPEDIA,
    faunaPlan: FAUNA_PLAN,
    getHeight,
    getZoneAt,
    getCurrentAt,
    getTemperatureAt,
    getTerrainColor,
    getOpticalProfile,
    generateChunkFlora
  });
})(window.OC);
