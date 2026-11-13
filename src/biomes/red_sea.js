/* ================= БИОМ: КРАСНОЕ МОРЁ, РАС МОХАММЕД (ЕГИПЕТ · 0–200 М) ================= */
/* Тропическое коралловое море с гиперсолинностью (~40‰), рифовой стеной и ~10% эндемиков. */
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

  /* Рифовая лагуна (0–12 м), коралловый сад (12–35 м), рифовая стена (35–90 м), глубинный склон (90–200 м) */
  const ZONES = [
    {
      id: 'reef_lagoon',
      name: 'Рифовая лагуна Рас Мохаммед',
      shortName: 'Лагуна',
      color: '#3df2a8',
      depthLabel: '0 – 12 м',
      tempC: 27.5,
      description: 'Мелководная лагуна с коралловыми головами, лугами морской травы и учениками рифовых рыб у берега Синая.'
    },
    {
      id: 'coral_garden',
      name: 'Коралловый сад',
      shortName: 'Сад кораллов',
      color: '#4ee0d4',
      depthLabel: '12 – 35 м',
      tempC: 26.0,
      description: 'Плотные колонии ветвистых и плоских кораллов, морские антонии, актинии и рифовые аквариумные рыбки.'
    },
    {
      id: 'reef_wall',
      name: 'Рифовая стена (дроп-офиф)',
      shortName: 'Стена рифа',
      color: '#2da8c8',
      depthLabel: '35 – 90 м',
      tempC: 23.0,
      description: 'Вертикальный обрыв рифового плато с гורגонариями, чёрными кораллами и рифовыми акулами.'
    },
    {
      id: 'deep_slope',
      name: 'Глубинный склон Красного моря',
      shortName: 'Глубинный склон',
      color: '#1e6aa8',
      depthLabel: '90 – 200 м',
      tempC: 21.0,
      description: 'Пологий иловый склон с морскими губками, морскими лилиями и редкими глубоководными видами.'
    }
  ];

  function reefWallX(z) {
    return Math.sin(z * 0.003) * 120 + Math.cos(z * 0.007) * 45;
  }

  function getHeight(x, z) {
    // Общий наклон дна от лагуны к открытому морю: у берега -4 м, к востоку -60 м
    let h = OC.lerp(-4.0, -58.0, OC.smoothstep(-850, 850, x));
    h += OC.fbm2(x * 0.01, z * 0.01, 3) * 3.2;
    h += OC.fbm2(x * 0.04, z * 0.04, 2) * 1.1;

    // Резкая рифовая стена (дроп-офиф) — подъём плато к центру карты
    const ax = Math.abs(x - reefWallX(z));
    const wallRise = OC.smoothstep(150, 520, ax) * 42.0;
    h += wallRise;

    // Коралловые головушки и валуны на плато
    const bumps = (OC.ridged2(x * 0.015, z * 0.015, 2) - 0.45) * 5.5 * OC.smoothstep(80, 450, ax);
    h += bumps;

    // Уступ стены и иловый склон за ней
    const escarpment = OC.smoothstep(520, 900, ax) * 30.0;
    h -= escarpment;

    // Мягкая рябь илистого дна на глубине
    h += OC.fbm2(x * 0.025, z * 0.025, 2) * 2.4;

    return OC.clamp(h, -200.0, 2.0);
  }

  function safeSpotY(x, z, desiredY, clearance) {
    return Math.max(desiredY, getHeight(x, z) + (clearance || 3.0));
  }

  function getZoneAt(x, y, z) {
    const ax = Math.abs(x - reefWallX(z));
    if (y > -12.0 && ax > 220) return ZONES[0]; // reef_lagoon
    if (y > -35.0 && ax > 120) return ZONES[1]; // coral_garden
    if (y > -90.0) return ZONES[2]; // reef_wall
    return ZONES[3]; // deep_slope
  }

  function getTerrainColor(x, y, z, out) {
    const ax = Math.abs(x - reefWallX(z));
    const nearReef = OC.smoothstep(220, 60, ax);
    const n = OC.clamp(OC.fbm2(x * 0.06, z * 0.06, 2) * 0.7 + 0.3, 0, 1);

    _colA.set(0xe0f7fa); // светлый коралловый песок лагуны
    _colB.set(0x2d8a5c); // известняк кораллового плато
    _colC.set(0x1a4a6e); // темный ил глубинного склона

    out.copy(_colA).lerp(_colB, nearReef * (0.5 + n * 0.35));

    // Глубокий ил за стеной рифа
    if (ax > 520 && y < -60.0) {
      out.lerp(_colC, OC.smoothstep(900, 520, ax) * 0.7);
    }
    // Бирюзовый окрас мелководья
    if (y > -10.0) {
      out.lerp(_colA.set(0x6ee7c0), OC.smoothstep(-10.0, -2.0, y) * 0.55);
    }
    return out;
  }

  function getTemperatureAt(x, depthM, zone) {
    // Красное море — тёплое, с轻ким охлаждением на глубине
    let t = 26.5 - Math.max(0, depthM) * 0.028;
    if (zone) {
      if (zone.id === 'reef_lagoon') t = 27.8;
      else if (zone.id === 'coral_garden') t = 26.2;
      else if (zone.id === 'reef_wall') t = 23.0;
      else if (zone.id === 'deep_slope') t = 21.0;
    }
    return t;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const dayLum = (dayW !== undefined ? dayW : 1.0);
    const shallow = y > -15.0;
    const reefProx = OC.smoothstep(300, 100, Math.abs(x - reefWallX(z)));

    // Тёплая прозрачная вода Красного моря, хорошая видимость
    _fogCol.set(0x0b1626)
      .lerp(_colA.set(0x1a4e8a), dayLum * 0.55)
      .lerp(_colB.set(0x0b3d5e), reefProx * 0.4);

    _waterCol.set(0x1e90ff)
      .lerp(_colA.set(0x4ee0d4), shallow ? 0.65 : 0.0)
      .lerp(_colB.set(0x2da8c8), reefProx * 0.5);

    _skyTop.set(0x0a2a4a).lerp(_colA.set(0x2e86c1), dayLum * 0.85);
    _skyBot.set(0x061830).lerp(_colB.set(0x1a4e8a), dayLum * 0.6);
    _aboveHoriz.set(0x0b2a4a);

    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity: shallow ? 0.008 : OC.lerp(0.010, 0.018, reefProx),
      causticStrength: shallow ? 0.8 : 0.2,
      rayStrength: shallow ? 0.75 : 0.25,
      sunAtten: 0.85 * dayLum,
      bioGlow: OC.lerp(0.4, 1.0, dayLum),
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz,
      fillAColor: _colB.set(0x4ee0d4),
      fillAMult: 0.5 + shallow * 0.4,
      fillBColor: _colC.set(0x2da8c8),
      fillBMult: 0.3 + reefProx * 0.4
    };
  }

  function getCurrentAt(x, y, z, time, out) {
    if (!out) out = new T.Vector3();
    // Общее течение Красного моря с севера на юг (восточное прибрежное течение)
    out.set(0.12 + Math.sin(time * 0.1 + x * 0.008) * 0.06, 0, -0.18 + Math.cos(time * 0.08 + z * 0.006) * 0.05);
    return out;
  }

  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const items = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;

    function add(species, x, z, scale, tint) {
      const y = getHeight(x, z);
      items.push({ species, x, y: y - 0.05, z, ry: rng() * 6.283, scale, tint: tint || 0xffffff });
    }

    // 1. Коралловые colonias на рифовом плато
    const reefSlots = Math.round(28 * density);
    for (let i = 0; i < reefSlots; i++) {
      const px = x0 + rng() * chunkSize;
      const pz = z0 + rng() * chunkSize;
      const y = getHeight(px, pz);
      if (y > -35.0 && y < -1.0) {
        const r = rng();
        if (r < 0.32) add('coral_branch', px, pz, OC.lerp(0.9, 1.6, rng()), 0xff6b6b);
        else if (r < 0.58) add('coral_table', px, pz, OC.lerp(0.8, 1.4, rng()), 0x4ecdc4);
        else if (r < 0.78) add('coral_plate', px, pz, OC.lerp(0.7, 1.3, rng()), 0xffe66d);
        else add('coral_fan', px, pz, OC.lerp(0.85, 1.45, rng()), 0xff9ff3);
      }
    }

    // 2. Морские травы и водоросли в лагуне
    const grassSlots = Math.round(22 * density);
    for (let i = 0; i < grassSlots; i++) {
      const px = x0 + rng() * chunkSize;
      const pz = z0 + rng() * chunkSize;
      const y = getHeight(px, pz);
      if (y > -14.0 && y < -1.0 && rng() < 0.5) {
        add('seagrass', px, pz, OC.lerp(0.6, 1.1, rng()), 0x8ee08a);
      }
    }

    // 3. Глубоководные губки и актинии за стеной рифа
    const deepSlots = Math.round(16 * density);
    for (let i = 0; i < deepSlots; i++) {
      const px = x0 + rng() * chunkSize;
      const pz = z0 + rng() * chunkSize;
      const y = getHeight(px, pz);
      if (y > -200.0 && y < -35.0) {
        const r = rng();
        if (r < 0.45) add('sponge_barrel', px, pz, OC.lerp(0.8, 1.5, rng()), 0xa8e6cf);
        else if (r < 0.75) add('anemone', px, pz, OC.lerp(0.7, 1.2, rng()), 0xff8fab);
        else add('sea_lily', px, pz, OC.lerp(0.6, 1.1, rng()), 0xd8b4fe);
      }
    }

    // 4. Чёрные коралла на уступах стены
    const blackCoralSlots = Math.round(10 * density);
    for (let i = 0; i < blackCoralSlots; i++) {
      const px = x0 + rng() * chunkSize;
      const pz = z0 + rng() * chunkSize;
      const y = getHeight(px, pz);
      if (y > -90.0 && y < -35.0 && rng() < 0.4) {
        add('coral_black', px, pz, OC.lerp(0.85, 1.5, rng()), 0x1a1a2e);
      }
    }

    return items;
  }

  const _lmRaw = [
    {
      id: 'sharm_reef',
      name: 'Коралловый риф Шарм-Эль-Шейха',
      zoneId: 'coral_garden',
      x: -120,
      y: -14.0,
      z: 40,
      yaw: 1.2,
      pitch: -0.1,
      clearance: 3.0,
      description: 'Знаковый риф у курорта Шарм-Эль-Шейх с богатой рифовой фауной и прозрачной водой.'
    },
    {
      id: 'reef_drop_off',
      name: 'Рифовая стена (Drop-off)',
      zoneId: 'reef_wall',
      x: 60,
      y: -45.0,
      z: -20,
      yaw: -1.0,
      pitch: -0.25,
      clearance: 4.0,
      description: 'Вертикальный обрыв рифового плато — излюбленное место дайверов с г luoghiями и рифовыми акулами.'
    },
    {
      id: 'lagoon_shallows',
      name: 'Мелководье лагуны',
      zoneId: 'reef_lagoon',
      x: -300,
      y: -3.0,
      z: -150,
      yaw: 0.6,
      pitch: -0.05,
      clearance: 2.0,
      description: 'Мелкая лагуна с морскими травами, где кормятся зелёные черепахи и дюгони.'
    },
    {
      id: 'deep_coral_spire',
      name: 'Глубоководный коралловый шпиль',
      zoneId: 'deep_slope',
      x: 280,
      y: -110.0,
      z: -60,
      yaw: 2.4,
      pitch: -0.15,
      clearance: 5.0,
      description: 'Изолированный глубоководный шпиль с чёрными кораллами и стеклянными губками.'
    }
  ];

  const landmarks = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: safeSpotY(lm.x, lm.z, lm.y, lm.clearance)
  }));

  const spawnX = landmarks[0].x;
  const spawnZ = landmarks[0].z;
  const spawnY = safeSpotY(spawnX, spawnZ, -12.0, 4.0);

  const _tourRaw = [
    { x: spawnX, y: -14.0, z: spawnZ, lx: landmarks[1].x, ly: -45.0, lz: landmarks[1].z, title: 'Коралловый сад Рас Мохаммед', duration: 10, fact: 'Красное море — одно из самых солёных морей мира (~40‰), что способствует уникальному росту кораллов.' },
    { x: landmarks[1].x, y: -45.0, z: landmarks[1].z, lx: landmarks[2].x, ly: -3.0, lz: landmarks[2].z, title: 'Рифовая стена и_drop-off', duration: 10, fact: 'Стена рифа уходит на глубину более 100 м — здесь можно встретить рифовых акул и мурен.' },
    { x: landmarks[2].x, y: -3.0, z: landmarks[2].z, lx: landmarks[3].x, ly: -110.0, lz: landmarks[3].z, title: 'Лагуна и дюгони', duration: 10, fact: 'В мелководье лагуны водятся дюгони и зелёные черепахи, пасущиеся на лугах морской травы.' },
    { x: landmarks[3].x, y: -110.0, z: landmarks[3].z, lx: 120, ly: -180.0, lz: 40, title: 'Глубинный склон и эндемики', duration: 10, fact: 'Около 10% видов фауны Красного моря — эндемики, которые не встречаются нигде больше на Земле.' }
  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, safeSpotY(leg.x, leg.z, leg.y, 4.0), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    fact: leg.fact,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    coral_branch: ['Ветвистый коралл Acropora', 'Acropora spp.', 'Кораллы', 'Коралловый сад', '12 – 35 м', 'Быстрорастущий ветвистый коралл, создающий сложное укрытие для рифовых рыб.'],
    coral_table: ['Столешница коралла', 'Acropora / Echinopora', 'Кораллы', 'Коралловый сад', '10 – 30 м', 'Плоская столешневидная колония коралла, ловящая планктон в течении.'],
    coral_plate: ['Пластинчатый коралл', 'Porites / Montipora', 'Кораллы', 'Коралловый сад', '8 – 25 м', 'Массивные пластинчатые колонии, растущие медленно и достигающие метра в диаметре.'],
    coral_fan: ['Горгониевый веер', 'Gorgonia / Pinnigorgia', 'Кораллы', 'Рифовая стена', '35 – 70 м', 'Гибкий веерообразный коралл, ориентированный навстречу течению для питания планктоном.'],
    coral_black: ['Чёрный коралл', 'Antipatharia', 'Кораллы', 'Рифовая стена / склон', '40 – 200 м', 'Тёмный роговый коралл глубоководья, растёт极其 медленно и живет тысячи лет.'],
    seagrass: ['Морская трава Halophila', 'Halophila stipulacea', 'Водоросли', 'Рифовая лагуна', '0 – 12 м', 'Луга травы в мелководье — место кормления дюгонов и зелёных черепах.'],
    sponge_barrel: ['Бочонковидная губка', 'Xestospongia / Petrosia', 'Беспозвоночные', 'Глубинный склон', '50 – 150 м', 'Крупная фильтрующая губка на илистом склоне Красного моря.'],
    anemone: ['Рифовая актиния', 'Entacmaea / Heteractis', 'Беспозвоночные', 'Коралловый сад', '5 – 25 м', 'Яркая актиния с клоунами-рыбами, живущими среди её щупалец.'],
    sea_lily: ['Морская лилия', 'Crinoidea', 'Беспозвоночные', 'Глубинный склон', '80 – 200 м', 'Изящное иглокожее с перьевидными руками на глубоком склоне.'],
    clownfish: ['Рыба-клоун', 'Amphiprion bicinctus', 'Рыбы', 'Коралловый сад', '5 – 20 м', 'Эндемик Красного моря с белой полосой, живёт в актиниях и защищает их от хищников.'],
    butterflyfish: ['Рыба-бабочка', 'Chaetodon fasciatus', 'Рыбы', 'Коралловый сад', '2 – 30 м', 'Яркая рифовая рыба с длительным хвостовым стеблем, питается коралловыми полипами.'],
    surgeonfish: ['Хирург-рыба', 'Acanthurus sohal', 'Рыбы', 'Коралловый сад', '1 – 40 м', 'Агрессивная территориальная рыба с лезвиеобразным шипом у хвоста.'],
    moray: ['Рифовая мурена', 'Gymnothorax griseus', 'Рыбы', 'Рифовая стена', '10 – 60 м', 'Змееобразный хищник в коралловых норах с острыми зубами и второй парой челюстей.'],
    reef_shark: ['Рифовая акула', 'Carcharhinus melanopterus', 'Мегафауна', 'Рифовая стена', '5 – 100 м', 'Маленькая рифовая акула с чёрными кончиками плавников, патрулирует стенку рифа.'],
    turtle: ['Зелёная черепаха', 'Chelonia mydas', 'Мегафауна', 'Рифовая лагуна', '0 – 30 м', 'Крупная черепаха, пасущаяся на лугах морской травы лагуны Красного моря.'],
    dugong: ['Дюгонь', 'Dugong dugon', 'Мегафауна', 'Рифовая лагуна', '1 – 10 м', 'Травоядное млекопитающее «морская корова», пасущееся на травах в прибрежных лагунах.'],
    napoleon: ['Наполеон-рыба', 'Cheilinus undulatus', 'Рыбы', 'Коралловый сад', '1 – 60 м', 'Крупная рифовая рыба с выпуклым лбом, одна из самых узнаваемых в Красном море.'],
    lionfish: ['Рыба-лев', 'Pterois miles', 'Рыбы', 'Рифовая стена', '1 – 50 м', 'Яркая хищница с ядовитыми шипами, инвазивный вид из Красного моря в другие воды.'],
    octopus: ['Обыкновенный осьминог', 'Octopus vulgaris', 'Беспозвоночные', 'Рифовая стена', '5 – 40 м', 'Умный головоногий мастер камуфляжа, охотится в коралловых расщелинах ночью.'],
    nudibranch: ['Голожаберная улитка', 'Nudibranchia', 'Беспозвоночные', 'Коралловый сад', '2 – 30 м', 'Ярко окрашенная улитка без раковины, часто ядовитая и предупреждающе окрашенная.']
  };

  const FAUNA_PLAN = {
    cleaningStations: [
      { cx: -120, cz: 40, r: 28, y: -14, label: 'Станция чистки кораллового сада' },
      { cx: 60, cz: -20, r: 34, y: -45, label: 'Станция чистки у стены рифа' }
    ],
    schools: [
      { key: 'clownfish', n: 34, cx: -110, cz: 50, radius: 22, yDepth: -12, yAmp: 2.0, spread: 8, speed: 4.2, scale: 0.38, diel: 'day', biolum: false, isPrey: true, shyness: 0.4, geoOpts: { len: 0.55, height: 0.22, width: 0.1, colA: 0xff8c00, colB: 0xffd700, finCol: 0xffb347, eyeScale: 1.3 } },
      { key: 'butterflyfish', n: 28, cx: -90, cz: 30, radius: 26, yDepth: -18, yAmp: 2.5, spread: 9, speed: 5.0, scale: 0.42, diel: 'day', biolum: false, isPrey: true, shyness: 0.35, geoOpts: { len: 0.72, height: 0.3, width: 0.12, colA: 0xff6b6b, colB: 0xffd93d, finCol: 0xffe66d, eyeScale: 1.4 } },
      { key: 'surgeonfish', n: 42, cx: 70, cz: -30, radius: 32, yDepth: -38, yAmp: 3.0, spread: 11, speed: 6.8, scale: 0.5, diel: 'day', biolum: false, isPrey: true, shyness: 0.45, geoOpts: { len: 0.9, height: 0.45, width: 0.14, colA: 0x2da8c8, colB: 0x4ee0d4, finCol: 0x8ee08a, eyeScale: 1.2 } }
    ],
    predators: [
      { key: 'moray', cx: 45, cz: -15, radius: 18, y: -50, speed: 2.2, scale: 1.1 },
      { key: 'lionfish', cx: -100, cz: 60, radius: 14, y: -22, speed: 1.6, scale: 0.85 },
      { key: 'napoleon', cx: -130, cz: 20, radius: 30, y: -25, speed: 3.2, scale: 1.4 }
    ],
    megafauna: [
      { key: 'reef_shark', cx: 80, cz: -40, radius: 58, y: -55, speed: 4.5, scale: 1.2 },
      { key: 'turtle', cx: -280, cz: -140, radius: 42, y: -8, speed: 2.8, scale: 1.1 },
      { key: 'dugong', cx: -320, cz: -160, radius: 48, y: -5, speed: 1.9, scale: 1.3 }
    ],
    eels: [],
    jellies: [],
    crustaceans: []
  };

  OC.Biomes.register({
    id: 'red_sea',
    name: 'Красное море: Рас Мохаммед',
    region: 'Красное море · Синайский полуостров',
    subtitle: 'Коралловое море · 0–200 м · гиперсолинность',
    globe: {
      lat: 27.8, lon: 33.9, coordLabel: '27.8° с.ш., 33.9° в.д.',
      ocean: 'Красное море · Египет / Саудовская Аравия', depthSpan: '0 – 200 м', tempSpan: '21 – 29 °C', color: '#1e90ff',
      country: 'Египет (Синай) / Саудовская Аравия', waterType: 'sea', protectionStatus: 'Национальный парк Рас Мохаммед',
      notableFor: 'коралловые рифы, эндемики (~10% видов), дюгони, рифовые акулы, затонувшие суда',
      summary: 'Тропическое коралловое море с гиперсолинностью (~40‰), рифовой стеной и богатой эндемичной фауной — один из лучших районов для дайвинга в мире.'
    },
    worldRadius: 1200,
    chunkSize: 150,
    seaLevel: 0,
    spawn: {
      pos: [spawnX, spawnY, spawnZ],
      yaw: 1.2,
      pitch: -0.1
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
