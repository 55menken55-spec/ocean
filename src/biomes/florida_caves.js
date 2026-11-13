/* ================= БИОМ: ПОДВОДНЫЕ ПЕЩЕРЫ ФЛОРИДЫ (США · 0–60 М) ================= */
/* Известняковые карстовые пещеры Флоридского аквифера: кристально чистая пресная вода,
   галереи, сифоны и источники. Реальная система: окрестности Окала и Джейксвилля. */
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

  /* Зоны подводной пещерной системы */
  const ZONES = [
    {
      id: 'spring_basin',
      name: 'Бассейн источника (Spring Basin)',
      shortName: 'Источник',
      color: '#6ee7b7',
      depthLabel: '0 – 8 м',
      tempC: 22.0,
      description: 'Вход в подводную систему: кристально чистая пресная вода бьёт из известнякового источника на поверхность.'
    },
    {
      id: 'cavern_hall',
      name: 'Карстовый зал',
      shortName: 'Зал пещеры',
      color: '#38bdf8',
      depthLabel: '8 – 25 м',
      tempC: 21.5,
      description: 'Просторный известняковый зал со сталактитами, торосами и хорошо освещённой водой у входа.'
    },
    {
      id: 'narrow_passage',
      name: 'Узкий проход (Squeeze)',
      shortName: 'Узкий проход',
      color: '#1d4ed8',
      depthLabel: '25 – 45 м',
      tempC: 21.0,
      description: 'Тесные известняковые коридоры с низкой освещённостью — зона для опытных пещерных дайверов.'
    },
    {
      id: 'deep_siphon',
      name: 'Глубокий сифон',
      shortName: 'Сифон',
      color: '#1e3a8a',
      depthLabel: '45 – 60 м',
      tempC: 20.5,
      description: 'Глубокая затопленная caverna с илистым дном, где аквифер уходит в неизвестность.'
    }
  ];

  function caveAxisX(z) {
    return Math.sin(z * 0.004) * 60 + Math.cos(z * 0.009) * 25;
  }

  function getHeight(x, z) {
    // Общий склон дна от берега к центру карты: у берега -6 м, к центру -48 м
    let h = OC.lerp(-6.0, -46.0, OC.smoothstep(-900, 900, x));
    h += OC.fbm2(x * 0.012, z * 0.012, 3) * 2.8;
    h += OC.fbm2(x * 0.05, z * 0.05, 2) * 1.2;

    // Повышение известнякового плато в центре (потолок пещеры выше)
    const ax = Math.abs(x - caveAxisX(z));
    const plateauRise = OC.smoothstep(120, 500, ax) * 34.0;
    h += plateauRise;

    // Каменные торосы и сталагмиты на дне
    const bumps = (OC.ridged2(x * 0.018, z * 0.018, 2) - 0.4) * 4.5 * OC.smoothstep(60, 400, ax);
    h += bumps;

    // Падение в глубокий сифон у стен плато
    const sinkhole = OC.smoothstep(500, 860, ax) * 22.0;
    h -= sinkhole;

    // Илистая рябь на глубоком дне
    h += OC.fbm2(x * 0.03, z * 0.03, 2) * 2.0;

    return OC.clamp(h, -60.0, 4.0);
  }

  function safeSpotY(x, z, desiredY, clearance) {
    return Math.max(desiredY, getHeight(x, z) + (clearance || 3.0));
  }

  function getZoneAt(x, y, z) {
    const ax = Math.abs(x - caveAxisX(z));
    if (y > -8.0 && ax > 160) return ZONES[0]; // spring_basin
    if (y > -25.0 && ax > 100) return ZONES[1]; // cavern_hall
    if (y > -45.0) return ZONES[2]; // narrow_passage
    return ZONES[3]; // deep_siphon
  }

  function getTerrainColor(x, y, z, out) {
    const ax = Math.abs(x - caveAxisX(z));
    const nearCave = OC.smoothstep(160, 80, ax);
    const n = OC.clamp(OC.fbm2(x * 0.07, z * 0.07, 2) * 0.6 + 0.4, 0, 1);

    _colA.set(0xe3f2fd); // светлый известняковый песок источника
    _colB.set(0x7a9e8f); // известняк карстовых стен
    _colC.set(0x2d3a5c); // тёмный илистый осадок сифона

    out.copy(_colA).lerp(_colB, nearCave * (0.45 + n * 0.3));

    // Илистый дно глубокого сифона
    if (ax > 500 && y < -35.0) {
      out.lerp(_colC, OC.smoothstep(860, 500, ax) * 0.65);
    }
    // Бирюзовый окрас мелководья источника
    if (y > -6.0) {
      out.lerp(_colA.set(0x7fffd4), OC.smoothstep(-6.0, -1.0, y) * 0.5);
    }
    return out;
  }

  function getTemperatureAt(x, depthM, zone) {
    // Подземная вода Флориды почти не меняет температуры с глубиной (~21 °C круглый год)
    let t = 21.5 - Math.max(0, depthM) * 0.015;
    if (zone) {
      if (zone.id === 'spring_basin') t = 22.2;
      else if (zone.id === 'cavern_hall') t = 21.6;
      else if (zone.id === 'narrow_passage') t = 21.0;
      else if (zone.id === 'deep_siphon') t = 20.4;
    }
    return t;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const dayLum = (dayW !== undefined ? dayW : 1.0);
    const shallow = y > -10.0;
    const caveProx = OC.smoothstep(200, 60, Math.abs(x - caveAxisX(z)));

    // Пресная чистая вода, высокая прозрачность, голубоватый оттенок извне
    _fogCol.set(0x0a1f33)
      .lerp(_colA.set(0x1e5f8a), dayLum * 0.6)
      .lerp(_colB.set(0x0b2e4a), caveProx * 0.45);

    _waterCol.set(0x4fd1c5)
      .lerp(_colA.set(0x6ee7b7), shallow ? 0.7 : 0.0)
      .lerp(_colB.set(0x38bdf8), caveProx * 0.55);

    _skyTop.set(0x0f2540).lerp(_colA.set(0x2e86c1), dayLum * 0.88);
    _skyBot.set(0x081528).lerp(_colB.set(0x1e5f8a), dayLum * 0.65);
    _aboveHoriz.set(0x0c223a);

    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity: shallow ? 0.006 : OC.lerp(0.009, 0.018, caveProx),
      causticStrength: shallow ? 0.85 : 0.15,
      rayStrength: shallow ? 0.8 : 0.2,
      sunAtten: 0.88 * dayLum,
      bioGlow: OC.lerp(0.35, 1.0, dayLum),
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz,
      fillAColor: _colB.set(0x6ee7b7),
      fillAMult: 0.55 + shallow * 0.35,
      fillBColor: _colC.set(0x38bdf8),
      fillBMult: 0.25 + caveProx * 0.45
    };
  }

  function getCurrentAt(x, y, z, time, out) {
    if (!out) out = new T.Vector3();
    // Ток источника наружу от плато к берегу
    out.set(0.14 + Math.sin(time * 0.09 + x * 0.007) * 0.05, 0, -0.16 + Math.cos(time * 0.07 + z * 0.005) * 0.04);
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

    // 1. Водяные лилии и тростник у входа в источник
    const basinSlots = Math.round(20 * density);
    for (let i = 0; i < basinSlots; i++) {
      const px = x0 + rng() * chunkSize;
      const pz = z0 + rng() * chunkSize;
      const y = getHeight(px, pz);
      if (y > -9.0 && y < 0.0) {
        const r = rng();
        if (r < 0.5) add('water_lily', px, pz, OC.lerp(0.7, 1.3, rng()), 0xffffff);
        else add('reed', px, pz, OC.lerp(0.8, 1.5, rng()), 0x8ee08a);
      }
    }

    // 2. Известняковые торосы и сталиктиты в зале пещеры
    const hallSlots = Math.round(24 * density);
    for (let i = 0; i < hallSlots; i++) {
      const px = x0 + rng() * chunkSize;
      const pz = z0 + rng() * chunkSize;
      const y = getHeight(px, pz);
      if (y > -35.0 && y < -2.0) {
        const r = rng();
        if (r < 0.4) add('stalactite', px, pz, OC.lerp(0.9, 1.8, rng()), 0xc9d6df);
        else if (r < 0.7) add('stalagmite', px, pz, OC.lerp(0.8, 1.5, rng()), 0xb9c4cc);
        else add('limestone_ledge', px, pz, OC.lerp(0.7, 1.4, rng()), 0xd9e2e8);
      }
    }

    // 3. Илистые валуны и водоросли в узких проходах
    const passageSlots = Math.round(18 * density);
    for (let i = 0; i < passageSlots; i++) {
      const px = x0 + rng() * chunkSize;
      const pz = z0 + rng() * chunkSize;
      const y = getHeight(px, pz);
      if (y > -50.0 && y < -20.0) {
        const r = rng();
        if (r < 0.5) add('mud_rock', px, pz, OC.lerp(0.6, 1.2, rng()), 0x5a5a6e);
        else add('cave_algae', px, pz, OC.lerp(0.5, 1.0, rng()), 0x6ee7b7);
      }
    }

    // 4. Глубоководные губки и иловая растительность в сифоне
    const siphonSlots = Math.round(12 * density);
    for (let i = 0; i < siphonSlots; i++) {
      const px = x0 + rng() * chunkSize;
      const pz = z0 + rng() * chunkSize;
      const y = getHeight(px, pz);
      if (y > -60.0 && y < -40.0 && rng() < 0.35) {
        add('sponge_tube', px, pz, OC.lerp(0.7, 1.3, rng()), 0xa8e6cf);
      }
    }

    return items;
  }

  const _lmRaw = [
    {
      id: 'spring_entrance',
      name: 'Вход в источник (Spring Entrance)',
      zoneId: 'spring_basin',
      x: -150,
      y: -2.0,
      z: 60,
      yaw: 0.8,
      pitch: -0.05,
      clearance: 2.5,
      description: 'Вход в подводную систему: кристально чистая пресная вода Флоридского аквифера бьёт из известняка.'
    },
    {
      id: 'cavern_ceiling',
      name: 'Свод карстового зала',
      zoneId: 'cavern_hall',
      x: 40,
      y: -18.0,
      z: -30,
      yaw: -1.2,
      pitch: -0.18,
      clearance: 3.5,
      description: 'Зал известняковой пещеры с зависшими сталактитами и отражённой светящейся водой.'
    },
    {
      id: 'squeeze_passage',
      name: 'Узкий проход',
      zoneId: 'narrow_passage',
      x: 120,
      y: -38.0,
      z: -80,
      yaw: 2.1,
      pitch: -0.25,
      clearance: 4.0,
      description: 'Тесный известняковый коридор — классический "squeeze" для пещерных дайверов.'
    },
    {
      id: 'deep_siphon_wall',
      name: 'Стена глубокого сифона',
      zoneId: 'deep_siphon',
      x: 220,
      y: -52.0,
      z: -40,
      yaw: 0.4,
      pitch: -0.15,
      clearance: 5.0,
      description: 'Глубокая затопленная caverna — куда уходит аквифер в неведомые глубины.'
    }
  ];

  const landmarks = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: safeSpotY(lm.x, lm.z, lm.y, lm.clearance)
  }));

  const spawnX = landmarks[0].x;
  const spawnZ = landmarks[0].z;
  const spawnY = safeSpotY(spawnX, spawnZ, -6.0, 4.0);

  const _tourRaw = [
    { x: spawnX, y: -6.0, z: spawnZ, lx: landmarks[1].x, ly: -18.0, lz: landmarks[1].z, title: 'Бассейн источника', duration: 10, fact: 'Флоридский аквифер — одна из крупнейших водоносных систем в мире, питание которой идёт из известняковых пород.' },
    { x: landmarks[1].x, y: -18.0, z: landmarks[1].z, lx: landmarks[2].x, ly: -38.0, lz: landmarks[2].z, title: 'Карстовый зал и сталиктиты', duration: 10, fact: 'Известняковые залы 형성овались тысячелетиями под действием弱кислой дождевой воды, растворяющей камень.' },
    { x: landmarks[2].x, y: -38.0, z: landmarks[2].z, lx: landmarks[3].x, ly: -52.0, lz: landmarks[3].z, title: 'Узкий проход и сифон', duration: 10, fact: 'Подводные пещеры Флориды популярны среди пещерных дайверов благодаря кристальной прозрачности воды.' },
    { x: landmarks[3].x, y: -52.0, z: landmarks[3].z, lx: -80, ly: -4.0, lz: 120, title: 'Обратный путь к свету', duration: 10, fact: 'Вoda в аквифере Флориды почти не меняет температуры круглый год — около 21–22 °C.' }
  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, safeSpotY(leg.x, leg.z, leg.y, 4.0), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    fact: leg.fact,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    water_lily: ['Водяная лилия', 'Nymphaea odorata', 'Растения', 'Бассейн источника', '0 – 8 м', 'Белоцветущая лилия на поверхности пресноводных источников Флориды.'],
    reed: ['Тростник прибрежный', 'Typha domingensis', 'Растения', 'Бассейн источника', '0 – 4 м', 'Тростник на мелководье у входа в пещерную систему, укрытие для молодняка рыб.'],
    stalactite: ['Сталактит из известняка', 'Calcite speleothem', 'Геология', 'Карстовый зал', '8 – 25 м', 'Каменная игла, свисающая с потолка пещеры, образованная из капель известковой воды.'],
    stalagmite: ['Сталагмит из известняка', 'Calcite speleothem', 'Геология', 'Карстовый зал', '8 – 25 м', 'Каменный столб, растущий из дна навстречу свисающему сталоактиту.'],
    limestone_ledge: ['Известняковый уступ', 'Limestone formation', 'Геология', 'Карстовый зал / проход', '5 – 40 м', 'Плоский известняковый уступ, сформированный эрозией подземных вод аквифера.'],
    mud_rock: ['Одиночный илистый валун', 'Sedimentary boulder', 'Геология', 'Узкий проход', '25 – 50 м', 'Закруглённый валун, покрытый слоем илистого осадка сифона.'],
    cave_algae: ['Пещерные водоросли', 'Cave biofilm algae', 'Водоросли', 'Узкий проход', '20 – 45 м', 'Тонкие biofilms водорослей на известняковых стенах в_zone с рассеянным светом.'],
    sponge_tube: ['Трубчатая губка сифона', 'Freshwater sponges', 'Беспозвоночные', 'Глубокий сифон', '45 – 60 м', 'Пресноводная глубоководная губка на илистом дне сифона, фильтрующая воду аквифера.'],
    florida_softshell: ['Флоридская мягкокрылая черепаха', 'Apalone ferox', 'Рептилии', 'Бассейн источника', '0 – 10 м', 'Пресноводная черепаха с мягким панцирем, обитает в Sources и медленных реках Флориды.'],
    florida_gar: ['Флоридская игла (иголоzub)', 'Lepisosteus platyrhincus', 'Рыбы', 'Бассейн источника / зал', '1 – 20 м', 'Древняя костяная рыба с длинной челюстью и алмазной чешуей, живое окаменелое существо.'],
    american_alligator: ['Американский аллигатор', 'Alligator mississippiensis', 'Рептилии', 'Бассейн источника', '0 – 5 м', 'Крупный хищник у входа в источник, может заходить в пресную воду аквифера на корм.'],
    cave_crayfish: ['Пещерный рак', 'Procambarus pallidus', 'Беспозвоночные', 'Узкий проход / сифон', '20 – 60 м', 'Бесцветный пещерный рак без глаз, адаптированный к жизни в темноте подземных вод.' ],
    blind_cave_fish: ['Слепая пещерная рыба', 'Typhlichthys subterraneus', 'Рыбы', 'Глубокий сифон', '40 – 60 м', 'Беспигментная рыба без глаз, ориентируется по боковой линии в темноте сифона.' ],
    florida_bass: ['Флоридский окунь', 'Micropterus floridanus', 'Рыбы', 'Бассейн источника', '1 – 15 м', 'Крупный пресноводный окунь, популярная спортивная рыба Sources и озёр Флориды.' ],
    bluegill: ['Голубая солнцепёк (солнечная рыбка)', 'Lepomis macrochirus', 'Рыбы', 'Бассейн источника', '0 – 10 м', 'Яркая пресноводная рыбка в прибрежных зарослях Sources и медленных рек.' ],
    florida_manatee: ['Флоридский ламантин', 'Trichechus manatus latirostris', 'Мегафауна', 'Бассейн источника', '0 – 6 м', 'Крупное травоядное млекопитающее "морская корова", зимой заходит в тёплые Sources Флориды.' ]
  };

  const FAUNA_PLAN = {
    cleaningStations: [
      { cx: -140, cz: 70, r: 22, y: -4, label: 'Станция чистки у входа в источник' },
      { cx: 30, cz: -40, r: 28, y: -18, label: 'Станция чистки в карстовом зале' }
    ],
    schools: [
      { key: 'florida_bass', n: 26, cx: -130, cz: 80, radius: 20, yDepth: -6, yAmp: 2.0, spread: 8, speed: 5.2, scale: 0.45, diel: 'day', biolum: false, isPrey: true, shyness: 0.4, geoOpts: { len: 0.8, height: 0.3, width: 0.12, colA: 0x2e86c1, colB: 0x4fd1c5, finCol: 0x8ee08a, eyeScale: 1.3 } },
      { key: 'bluegill', n: 38, cx: -110, cz: 60, radius: 18, yDepth: -4, yAmp: 1.5, spread: 7, speed: 4.4, scale: 0.4, diel: 'day', biolum: false, isPrey: true, shyness: 0.45, geoOpts: { len: 0.55, height: 0.25, width: 0.1, colA: 0x38bdf8, colB: 0x6ee7b7, finCol: 0x4ade80, eyeScale: 1.4 } }
    ],
    predators: [
      { key: 'florida_gar', cx: -100, cz: 50, radius: 16, y: -8, speed: 2.8, scale: 1.0 },
      { key: 'american_alligator', cx: -160, cz: 40, radius: 24, y: -3, speed: 1.6, scale: 1.8 }
    ],
    megafauna: [
      { key: 'florida_softshell', cx: -120, cz: 90, radius: 26, y: -5, speed: 2.2, scale: 1.1 },
      { key: 'florida_manatee', cx: -180, cz: 110, radius: 32, y: -2, speed: 1.4, scale: 1.6 }
    ],
    eels: [],
    jellies: [],
    crustaceans: [
      { key: 'cave_crayfish', cx: 90, cz: -70, radius: 22, y: -42, speed: 1.2, scale: 0.8 },
      { key: 'blind_cave_fish', cx: 140, cz: -50, radius: 28, y: -50, speed: 1.8, scale: 0.7 }
    ]
  };

  OC.Biomes.register({
    id: 'florida_caves',
    name: 'Подводные пещеры Флориды',
    region: 'Флоридский аквифер · США',
    subtitle: 'Карстовые пещеры · пресная вода · 0–60 м',
    globe: {
      lat: 29.0, lon: -82.5, coordLabel: '29.0° с.ш., 82.5° з.д.',
      ocean: 'Флоридский аквифер · США', depthSpan: '0 – 60 м', tempSpan: '20 – 22 °C', color: '#6ee7b7',
      country: 'США (Флорида)', waterType: 'cave', protectionStatus: 'Государственные парки источников',
      notableFor: 'кристально чистая пресная вода, известняковые карстовые пещеры, аквифер Флориды',
      summary: 'Подводная карстовая система Флоридского аквифера: галереи, сифоны и источники с кристально чистой пресной водой (~21 °C круглый год).'
    },
    worldRadius: 1200,
    chunkSize: 150,
    seaLevel: 0,
    spawn: {
      pos: [spawnX, spawnY, spawnZ],
      yaw: 0.8,
      pitch: -0.05
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
