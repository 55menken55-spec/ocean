/* ================= БИОМ: ЛЕС ГИГАНТСКОЙ ЛАМИНАРИИ (МОНТЕРЕЙ, КАЛИФОРНИЯ) ================= */
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
      id: 'rocky_shore',
      name: 'Прибойные скалы и кекуры',
      shortName: 'Скалы прибоя',
      color: '#5fa4a0',
      depthLabel: '0 – 9 м',
      tempC: 12.8,
      description: 'Волнорезная гранитная гряда с кекурами, укрытыми охристыми звёздами Pisaster и зелёными актиниями.'
    },
    {
      id: 'kelp_cathedral',
      name: 'Собор гигантской ламинарии',
      shortName: 'Лес ламинарии',
      color: '#2c9b78',
      depthLabel: '9 – 22 м',
      tempC: 11.6,
      description: 'Двадцатиметровые башни макроцистиса Macrocystis pyrifera с воздушными пузырями и золотыми лучами света.'
    },
    {
      id: 'granite_reef',
      name: 'Гранитные рифы и уступы',
      shortName: 'Гранитный риф',
      color: '#2a7c8c',
      depthLabel: '14 – 32 м',
      tempC: 10.6,
      description: 'Террасы трещиноватого гранита с фиолетовыми ежами, красными рыбами-гарибальди и леопардовыми акулами.'
    },
    {
      id: 'monterey_canyon',
      name: 'Склон каньона Монтерей',
      shortName: 'Каньон Монтерей',
      color: '#124a6e',
      depthLabel: '30 – 74 м',
      tempC: 8.2,
      description: 'Крутой подводный каньон с холодным калифорнийским апвеллингом, вихрями анчоусов и глубокими сумерками.'
    }
  ];

  // Гранитные кекуры и скальные выходы вдоль берега (-X)
  const SEA_STACKS = [
    { x: -740, z: -210, r: 58, h: 6.2 },
    { x: -710, z: 145, r: 66, h: 5.8 },
    { x: -780, z: 430, r: 72, h: 6.8 },
    { x: -640, z: -460, r: 52, h: 4.5 }
  ];

  function shelfOffset(z) {
    return Math.sin(z * 0.0024) * 95 + Math.cos(z * 0.0055 + 0.8) * 38;
  }

  function getHeight(x, z) {
    const sx = x - shelfOffset(z);

    // Базовый профиль от западного скалистого берега (-1200) к восточному подводному каньону (+1200)
    let h = -16.0;
    const shoreRise = OC.smoothstep(-480, -920, sx) * 14.5;
    h += shoreRise;

    // Гранитные ступени-террасы под лесом ламинарии (-520 .. +180)
    const terraceWave = Math.sin(sx * 0.016 + OC.noise2(x * 0.006, z * 0.006) * 2.2) * 2.2;
    h += terraceWave * OC.smoothstep(240, 40, sx) * OC.smoothstep(-850, -520, sx);

    // Спуск к подводному каньону Монтерей на востоке (sx > +170)
    const canyonDrop = OC.smoothstep(160, 740, sx) * 52.0;
    h -= canyonDrop;

    // Изрезанная канавка подводного притока каньона в центральной части (z ~ -120..+140, x > 140)
    const gulchDist = Math.abs(z - Math.sin(x * 0.004) * 110);
    const gulch = Math.exp(-(gulchDist * gulchDist) / (155 * 155)) * OC.smoothstep(40, 380, sx);
    h -= gulch * 14.0;

    // Трещиноватый гранит (гряды и валуны)
    const graniteRidges = (OC.ridged2(x * 0.009, z * 0.009, 3) - 0.5) * 4.8 * OC.smoothstep(650, -450, sx);
    const fineRock = OC.fbm2(x * 0.028, z * 0.028, 3) * 2.6;
    h += graniteRidges + fineRock;

    // Прибойные гранитные кекуры у западного берега
    for (let i = 0; i < SEA_STACKS.length; i++) {
      const st = SEA_STACKS[i];
      const d = Math.hypot(x - st.x, z - st.z);
      if (d < st.r * 1.8) {
        const w = OC.smoothstep(st.r * 1.45, st.r * 0.25, d);
        const crag = 0.8 + 0.35 * OC.ridged2(x * 0.035, z * 0.035, 2);
        h = Math.max(h, -3.5 + (st.h + 3.5) * w * crag);
      }
    }

    return OC.clamp(h, -76.0, 6.8);
  }

  function safeSpotY(x, z, desiredY, clearance) {
    return Math.max(desiredY, getHeight(x, z) + (clearance || 3.2));
  }

  function getZoneAt(x, y, z) {
    const sx = x - shelfOffset(z);
    const fl = getHeight(x, z);
    if (sx < -490 || fl > -7.0) return ZONES[0]; // rocky_shore
    if (sx > 210 || fl < -29.0) return ZONES[3]; // monterey_canyon
    // Чередование плотных коридоров ламинарии и открытых гранитных рифов
    const clearing = OC.fbm2(x * 0.005 + 14.2, z * 0.005 - 6.8, 2);
    if (clearing > 0.22 || fl < -22.5) return ZONES[2]; // granite_reef
    return ZONES[1]; // kelp_cathedral
  }

  function getTerrainColor(x, y, z, out) {
    const n = OC.clamp(OC.fbm2(x * 0.045, z * 0.045, 2) * 0.8 + 0.5, 0, 1);
    const algaePatch = OC.smoothstep(-0.12, 0.30, OC.fbm2(x * 0.018 + 3.1, z * 0.018 - 1.9, 2));

    _colA.set(0x6c6e6a); // сухой прибрежный гранит
    _colB.set(0x3a483c); // обросший водорослями и кораллинами гранит
    _colC.set(0x888472); // крупный ракушечный песок в промоинах

    if (y > -1.0) {
      out.copy(_colA).lerp(_colC, 0.25 + n * 0.25);
      if (y < 0.8) out.multiplyScalar(0.76); // мокрый пояс прилива
    } else if (y > -26.0) {
      out.copy(_colC).lerp(_colB, 0.45 + algaePatch * 0.48);
      // Розовые корковые кораллиновые водоросли (Lithothamnion) на валунах
      if (n > 0.68) out.lerp(_colA.set(0x7c485e), 0.36);
    } else {
      out.set(0x28353d).lerp(_colC.set(0x465258), n * 0.45);
    }
    return out;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const above = y > 0.25;
    if (above) {
      _fogCol.set(0x9fb8c2).lerp(_colA.set(0x101c28), 1 - dayW);
      _waterCol.set(0x1c7a74);
      _skyTop.set(0x4a82a4);
      _skyBot.set(0x98b9c8);
      _aboveHoriz.set(0xb2cad4).lerp(_colA.set(0x152538), 1 - dayW);
      return {
        aboveWater: true,
        fogColor: _fogCol,
        fogDensity: 0.00055,
        causticStrength: 0,
        rayStrength: 0,
        sunAtten: 1.0,
        bioGlow: 0,
        waterColor: _waterCol,
        aboveHoriz: _aboveHoriz
      };
    }

    const depth = Math.max(0, -y);
    const sx = x - shelfOffset(z);
    const canyonW = OC.smoothstep(120, 520, sx);
    const atten = Math.exp(-depth * 0.036);

    // Изумрудно-оливковая вода Калифорнийского залива днем и глубокая индиго в каньоне
    _colA.set(0x146e66).lerp(_colB.set(0x0c3d58), canyonW * 0.72);
    _colA.lerp(_colC.set(0x051822), OC.clamp(depth / 64, 0, 0.88));
    _fogCol.copy(_colA).multiplyScalar(0.18 + 0.82 * dayW);

    _waterCol.set(0x228e80).lerp(_colB.set(0x124d66), canyonW * 0.65);
    _skyTop.set(0x4cb89f).lerp(_colB.set(0x123850), 1 - dayW);
    _skyBot.set(0x031820);
    _aboveHoriz.set(0x9ec4ce).lerp(_colB.set(0x142436), 1 - dayW);

    const fogDensity = OC.lerp(0.0095, 0.0145, OC.clamp(depth / 55, 0, 1));
    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity,
      causticStrength: OC.clamp(atten * 0.85 * dayW, 0, 1.0),
      rayStrength: OC.clamp(Math.exp(-depth * 0.048) * 1.1 * dayW, 0, 1.0),
      sunAtten: atten,
      bioGlow: OC.clamp((1 - dayW) * 0.82 + OC.smoothstep(28, 60, depth) * 0.68, 0, 1),
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz,
      fillAColor: _colB.set(0x2eb89e),
      fillBColor: _colC.set(0x649688)
    };
  }

  /* ---- Холодное Калифорнийское течение (+Z) и накат прибоя ---- */
  function getCurrentAt(x, y, z, time, out) {
    if (!out) out = new T.Vector3();
    out.set(0, 0, 0);
    if (y > 0.25) return out;

    const sx = x - shelfOffset(z);
    const fl = getHeight(x, z);
    const clearance = Math.max(0, y - fl);
    const bottomShelter = OC.smoothstep(0.6, 5.0, clearance);

    // Калифорнийское течение на юг (+Z) вдоль кромки каньона
    const canyonJet = OC.smoothstep(80, 360, sx) * 1.45;
    out.z += canyonJet;

    // Волновой прибойный накат у скалистого берега (-X)
    if (sx < -360 && y > -11.0) {
      const surge = Math.sin(time * 0.95 + z * 0.03) * 1.1 * OC.smoothstep(-340, -680, sx);
      out.x += surge;
    }

    // Приглушение течения внутри плотного леса ламинарии (уменьшение гидродинамики кронами)
    const kelpCanopy = OC.smoothstep(180, -40, sx) * OC.smoothstep(-540, -280, sx);
    const canopyBrake = OC.lerp(1.0, 0.42, kelpCanopy);
    out.multiplyScalar(bottomShelter * canopyBrake);
    return out;
  }

  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const items = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;
    const midX = x0 + chunkSize * 0.5;
    const midZ = z0 + chunkSize * 0.5;
    const hMid = getHeight(midX, midZ);
    if (hMid < -62) return items;

    function add(species, x, z, scale, tint) {
      const y = getHeight(x, z);
      items.push({ species, x, y: y - 0.08, z, ry: rng() * 6.283, scale, tint: tint || 0xffffff });
    }

    // 1. Башни гигантской ламинарии (Macrocystis pyrifera) — образуют солнечный подводный собор
    const kelpSlots = Math.round(22 * density);
    for (let i = 0; i < kelpSlots; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const y = getHeight(x, z);
      if (y > -26.0 && y < -5.0) {
        const sx = x - shelfOffset(z);
        const grove = OC.fbm2(x * 0.008 + 7.4, z * 0.008 - 3.2, 2);
        // Оставляем выразительные светлые просеки между колоннадами ламинарии
        if (sx > -560 && sx < 220 && grove > -0.14) {
          const reach = OC.clamp((-y - 1.2) / 16.5, 0.52, 1.32);
          add('kelp_giant', x, z, reach * OC.lerp(0.88, 1.18, rng()), rng() < 0.3 ? 0xe8d9a8 : 0xffffff);
        }
      }
    }

    // 2. Нижний ярус бурой ламинарии, фиолетовых ежей, охристых звёзд и зелёных актиний
    const reefSlots = Math.round(28 * density);
    for (let i = 0; i < reefSlots; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const y = getHeight(x, z);
      if (y > -32 && y < -0.5) {
        const r = rng();
        if (r < 0.24 && y < -3.0) add('kelp', x, z, OC.lerp(0.65, 1.15, rng()));
        else if (r < 0.56) add('urchin_purple', x, z, OC.lerp(0.55, 1.05, rng()));
        else if (r < 0.76) add('starfish_ochre', x, z, OC.lerp(0.55, 0.95, rng()));
        else if (r < 0.92) add('anemone_giant_green', x, z, OC.lerp(0.75, 1.3, rng()));
        else add('sponge_tube', x, z, OC.lerp(0.65, 1.1, rng()), 0xe8c97a);
      } else if (y >= -0.5 && y < 1.2 && rng() < 0.35) {
        // Приливно-отливные звёзды и ежи на мокрых гранитных скалах
        add(rng() < 0.55 ? 'starfish_ochre' : 'urchin_purple', x, z, OC.lerp(0.5, 0.85, rng()));
      }
    }

    return items;
  }

  const _lmRaw = [
    {
      id: 'kelp_heart',
      name: 'Собор ламинарии',
      zoneId: 'kelp_cathedral',
      x: -220 + shelfOffset(30),
      y: -11.5,
      z: 30,
      yaw: 2.1,
      pitch: -0.06,
      clearance: 3.5,
      description: 'Центр подводного леса Macrocystis pyrifera: двадцатиметровые стебли уходят к солнцу сквозь изумрудную толщу.'
    },
    {
      id: 'sea_stacks',
      name: 'Кекуры прибоя',
      zoneId: 'rocky_shore',
      x: -635,
      y: -4.2,
      z: 140,
      yaw: 1.55,
      pitch: -0.08,
      clearance: 3.0,
      description: 'Гранитные скалы тихоокеанского прибоя с морскими львами, охристыми звёздами и зелёными актиниями.'
    },
    {
      id: 'urchin_terrace',
      name: 'Гранитный риф',
      zoneId: 'granite_reef',
      x: -45 + shelfOffset(-180),
      y: -17.0,
      z: -180,
      yaw: -0.95,
      pitch: -0.14,
      clearance: 3.5,
      description: 'Гранитные уступы с коврами фиолетовых ежей, ярко-оранжевыми гарибальди и леопардовыми акулами.'
    },
    {
      id: 'baitball_edge',
      name: 'Вихрь анчоусов',
      zoneId: 'monterey_canyon',
      x: 240 + shelfOffset(80),
      y: -21.0,
      z: 80,
      yaw: -1.4,
      pitch: -0.12,
      clearance: 4.5,
      description: 'Серебристые вихри северных анчоусов на границе холодного течения и подводного обрыва.'
    },
    {
      id: 'canyon_abyss',
      name: 'Каньон Монтерей',
      zoneId: 'monterey_canyon',
      x: 470 + shelfOffset(-60),
      y: -44.0,
      z: -60,
      yaw: -1.55,
      pitch: -0.22,
      clearance: 5.5,
      description: 'Отвесный склон глубокого каньона Монтерей, уходящего в ледяной тихоокеанский сумрак.'
    }
  ];

  const landmarks = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: Math.min(2.0, safeSpotY(lm.x, lm.z, lm.y, lm.clearance))
  }));

  const spawnX = landmarks[0].x;
  const spawnZ = landmarks[0].z;
  const spawnY = Math.min(-3.5, safeSpotY(spawnX, spawnZ, -11.5, 4.0));

  const _tourRaw = [
    { x: spawnX, y: -11.5, z: spawnZ, lx: spawnX + 35, ly: -8, lz: spawnZ + 22, title: 'Собор гигантской ламинарии', duration: 9,
      fact: 'Гигантская бурая водоросль Macrocystis вырастает до 50 см в сутки, удерживаясь вертикально за счёт крошечных поплавков-пневматоцистов.' },
    { x: -620, y: -4.5, z: 120, lx: -700, ly: -1, lz: 145, title: 'Кекуры прибоя и морские львы', duration: 9,
      fact: 'Калифорнийские морские львы лавируют среди стеблей ламинарии на скорости до 40 км/ч и игриво выпрыгивают из прибойной волны.' },
    { x: landmarks[2].x, y: -16.5, z: landmarks[2].z, lx: landmarks[2].x + 25, ly: -20, lz: landmarks[2].z + 18, title: 'Гранитные рифы и звёзды Pisaster', duration: 9,
      fact: 'Охристые морские звёзды и леопардовые акулы обитают среди гранитных террас, покрытых фиолетовыми ежами и зелёными актиниями.' },
    { x: landmarks[3].x, y: -20.5, z: landmarks[3].z, lx: landmarks[3].x + 50, ly: -22, lz: landmarks[3].z - 15, title: 'Кромка каньона и косяки анчоусов', duration: 9,
      fact: 'Подъём ледяной воды из глубин (апвеллинг) насыщает кромку каньона питательными солями и собирает огромные вихри анчоусов.' },
    { x: landmarks[4].x, y: -42.0, z: landmarks[4].z, lx: landmarks[4].x + 90, ly: -58, lz: landmarks[4].z, title: 'Бездна каньона Монтерей', duration: 9,
      fact: 'Подводный каньон Монтерей по глубине и масштабу не уступает Большому каньону Колорадо — здесь ночью всплывают светящиеся рыбы-миктофы.' }
  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, Math.min(2.5, safeSpotY(leg.x, leg.z, leg.y, 3.8)), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    fact: leg.fact,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    floor: ['Гранитный шельф Монтерей', 'Залив Монтерей', 'Геология', 'Все зоны', '0 – 74 м',
      'Кристаллический гранитный фундамент калифорнийского берега, покрытый известковыми кораллиновыми водорослями и уходящий в глубокий подводный каньон.'],
    kelp_giant: ['Гигантская ламинария', 'Macrocystis pyrifera', 'Флора', 'Лес ламинарии', '6 – 26 м',
      'Крупнейшая бурая водоросль Земли, вырастающая до 45 м в длину со скоростью до 50 см в сутки благодаря газовым пузырям-пневматоцистам.'],
    kelp: ['Бурая ламинария и нериоцистис', 'Nereocystis / Laminaria', 'Флора', 'Лес ламинарии', '4 – 24 м',
      'Нижний ярус бурых водорослей, смягчающий энергию тихоокеанских волн и дающий укрытие малькам морских окуней.'],
    urchin_purple: ['Фиолетовый морской ёж', 'Strongylocentrotus purpuratus', 'Беспозвоночные', 'Гранитный риф', '0 – 32 м',
      'Колючий фиолетовый иглокожий травоядный, выгрызающий углубления в граните и регулирующий плотность лесов ламинарии.'],
    starfish_ochre: ['Охристая морская звезда', 'Pisaster ochraceus', 'Беспозвоночные', 'Скалы прибоя', '0 – 28 м',
      'Знаковый «ключевой» вид литорали и гранитных рифов Калифорнии, крепко удерживающийся на скалах под ударами прибоя.'],
    anemone_giant_green: ['Гигантская зелёная актиния', 'Anthopleura xanthogrammica', 'Беспозвоночные', 'Скалы прибоя', '0 – 25 м',
      'Крупная изумрудная актиния холодных вод, чей цвет обусловлен симбиозом с одноклеточными зоохлореллами и зооксантеллами.'],
    sponge_tube: ['Калифорнийская трубчатая губка', 'Polymastia / Aplysina', 'Беспозвоночные', 'Гранитный риф', '10 – 40 м',
      'Холодноводные кремниевые губки-фильтраторы, образующие яркие жёлто-золотистые колонии на отвесных уступах.'],
    fish_garibaldi: ['Гарибальди', 'Hypsypops rubicundus', 'Рыбы', 'Гранитный риф', '3 – 28 м',
      'Огненно-оранжевая территориальная рыба-девушка и официальная морская рыба штата Калифорния.'],
    fish_rockfish: ['Окунь-ёрш ламинариевый', 'Sebastes atrovirens', 'Рыбы', 'Лес ламинарии', '4 – 35 м',
      'Пятнистый буро-оливковый морской окунь, зависающий вертикально среди стеблей макроцистиса в ожидании добычи.'],
    fish_anchovy: ['Северный анчоус', 'Engraulis mordax', 'Рыбы', 'Каньон Монтерей', '5 – 48 м',
      'Серебристые пелагические стаи, скручивающиеся в плотные защитные торнадо над кромкой холодного апвеллинга.'],
    fish_lantern: ['Калифорнийский миктоф (фонарик)', 'Stenobrachius leucopsarus', 'Рыбы', 'Каньон Монтерей', '25 – 74 м',
      'Глубоководные светящиеся анчоусы каньона Монтерей, совершающие суточные вертикальные миграции к поверхности ночью.'],
    sea_lion: ['Калифорнийский морской лев', 'Zalophus californianus', 'Мегафауна', 'Скалы прибоя', '1 – 45 м',
      'Быстрые и игривые ушастые тюлени, виртуозно маневрирующие среди зарослей ламинарии на скорости до 40 км/ч.'],
    shark_leopard: ['Калифорнийская леопардовая акула', 'Triakis semifasciata', 'Мегафауна', 'Гранитный риф', '4 – 36 м',
      'Безопасная для дайверов изящная донная акула с характерными тёмными сёдлами и пятнами по золотисто-бронзовой спине.'],
    shark_reef: ['Тихоокеанская суповая / синяя акула', 'Galeorhinus / Prionace', 'Мегафауна', 'Каньон Монтерей', '18 – 70 м',
      'Стремительный пелагический хищник кромки каньона, идущий вдоль полосы холодного подъёма глубинных вод.'],
    octopus: ['Гигантский тихоокеанский осьминог', 'Enteroctopus dofleini', 'Беспозвоночные', 'Гранитный риф', '12 – 60 м',
      'Крупнейший осьминог планеты с размахом щупалец до 4–5 м и удивительным интеллектом, охотящийся среди расщелин.'],
    jelly: ['Тихоокеанская морская крапива', 'Chrysaora fuscescens', 'Беспозвоночные', 'Каньон Монтерей', '2 – 45 м',
      'Полупрозрачная золотисто-янтарная медуза с длинными спиральными ротовыми лопастями, парящая в течениях каньона.'],
    research_vessel: ['НИС «Монтерейский Первопроходец»', 'Monterey R/V (48 м)', 'Экспедиция', 'Кромка залива Монтерей', '+18 .. -3 м',
      'Тихоокеанское судно мониторинга апвеллинга и лесов ламинарии с глубоководной лебёдкой и кормовым А-краном ROV.'],
    seabird: ['Черноногий альбатрос', 'Phoebastria nigripes', 'Птицы', 'Небо над заливом Монтерей', '+1 .. +22 м',
      'Океанический планер с 2-метровым размахом крыльев, скользящий в восходящих потоках ветра над холодными волнами.'],
    dolphin: ['Тихоокеанский белобокий дельфин', 'Lagenorhynchus obliquidens', 'Мегафауна', 'Кромка каньона', '+2.5 .. -8 м',
      'Стремительные стайные дельфины с белыми боками, охотящиеся на северного анчоуса у границы каньона.']
  };

  const FAUNA_PLAN = {
    cleaningStations: [],
    schools: [
      { key: 'fish_garibaldi', n: 28, cx: landmarks[2].x, cz: landmarks[2].z, radius: 26, yDepth: -14, yAmp: 3, spread: 8, speed: 4.5, scale: 0.62, diel: 'diurnal', shyness: 0.45, curious: 0.25,
        geoOpts: { len: 0.95, height: 0.56, width: 0.22, colA: 0xff5a12, colB: 0xff8a24, finCol: 0xff6b1a } },
      { key: 'fish_rockfish', n: 36, cx: spawnX + 35, cz: spawnZ - 25, radius: 34, yDepth: -12, yAmp: 4.5, spread: 10, speed: 4.8, scale: 0.68, diel: 'diurnal', shyness: 0.55,
        geoOpts: { len: 1.15, height: 0.48, width: 0.22, colA: 0x5c5b34, colB: 0x9b8e58, finCol: 0x454428, stripes: 0.35 } },
      { key: 'fish_rockfish', n: 32, cx: -320, cz: -120, radius: 32, yDepth: -10, yAmp: 4, spread: 9, speed: 5.0, scale: 0.65, diel: 'diurnal', shyness: 0.55,
        geoOpts: { len: 1.15, height: 0.48, width: 0.22, colA: 0x705638, colB: 0xb28f60, finCol: 0x55402a, stripes: 0.4 } },
      { key: 'fish_anchovy', n: 105, cx: landmarks[3].x, cz: landmarks[3].z, radius: 38, yDepth: -19, yAmp: 6, spread: 12, speed: 9.8, scale: 0.42, diel: 'diurnal', shyness: 0.95,
        geoOpts: { len: 1.0, height: 0.24, width: 0.10, colA: 0x5f889e, colB: 0xeaf4fa, finCol: 0xb8d4e3 } },
      { key: 'fish_anchovy', n: 85, cx: -140, cz: 210, radius: 34, yDepth: -11, yAmp: 4, spread: 10, speed: 9.2, scale: 0.40, diel: 'diurnal', shyness: 0.95,
        geoOpts: { len: 1.0, height: 0.24, width: 0.10, colA: 0x5f889e, colB: 0xeaf4fa, finCol: 0xb8d4e3 } },
      { key: 'fish_lantern', n: 48, cx: landmarks[4].x, cz: landmarks[4].z, radius: 42, yDepth: -38, yAmp: 9, spread: 12, speed: 6.4, scale: 0.48, diel: 'nocturnal', biolum: true, shyness: 0.5,
        geoOpts: { len: 0.85, height: 0.34, width: 0.15, colA: 0x163858, colB: 0x5cf5ff, finCol: 0x3ad9ee, eyeScale: 1.4 } }
    ],
    seaLions: [
      { cx: spawnX + 20, cz: spawnZ + 10, r: 44, y: -9.5, speed: 6.2, scale: 1.05 },
      { cx: -610, cz: 120, r: 42, y: -5.0, speed: 6.8, scale: 0.95 },
      { cx: -260, cz: -190, r: 48, y: -11.0, speed: 5.8, scale: 1.0 }
    ],
    sharks: [
      { speciesKey: 'shark_leopard', cx: landmarks[2].x + 15, cz: landmarks[2].z + 25, r: 46, y: -18, speed: 4.0 },
      { speciesKey: 'shark_leopard', cx: -140, cz: 140, r: 42, y: -14, speed: 4.2 },
      { cx: landmarks[4].x + 20, cz: landmarks[4].z, r: 78, y: -36, speed: 6.0 }
    ],
    octopus: [
      { x: landmarks[2].x - 18, z: landmarks[2].z + 12, scale: 1.25 },
      { x: -340, z: 65, scale: 1.1 }
    ],
    jellies: [
      { cx: landmarks[3].x - 10, cz: landmarks[3].z + 20, y: -14, amp: 2.2, spd: 0.3, scale: 1.2 },
      { cx: landmarks[4].x - 20, cz: landmarks[4].z - 35, y: -28, amp: 2.6, spd: 0.28, scale: 1.35 },
      { cx: spawnX - 18, cz: spawnZ + 32, y: -9, amp: 1.8, spd: 0.32, scale: 1.0 }
    ],
    vessels: [
      { x: 150, z: -95, yaw: 0.72, variant: 'coastal', name: 'НИС «Монтерейский Первопроходец»' }
    ],
    seabirds: [
      { cx: 150, cz: -95, r: 78, y: 13.5, speed: 13.2, count: 6, variant: 'albatross' },
      { cx: -610, cz: 120, r: 66, y: 10.5, speed: 12.0, count: 6, variant: 'albatross' }
    ],
    dolphins: [
      { cx: 195, cz: -15, r: 72, speed: 8.2, count: 4, variant: 'pacific' },
      { cx: landmarks[3].x, cz: landmarks[3].z + 35, r: 60, speed: 7.9, count: 3, variant: 'pacific' }
    ]
  };

  OC.Biomes.register({
    id: 'kelp_forest',
    name: 'Лес гигантской ламинарии',
    region: 'Залив Монтерей, Калифорния',
    subtitle: 'Тихий океан · 2.4 × 2.4 км · 0–74 м',
    globe: {
      lat: 36.8, lon: -121.9, coordLabel: '36.8° с.ш., 121.9° з.д.',
      ocean: 'Залив Монтерей · Калифорния', depthSpan: '0 – 74 м', tempSpan: '8 – 13 °C', color: '#42d896',
      summary: 'Изумрудные соборы 20-метровой ламинарии, гранитные кекуры с морскими львами и холодный апвеллинг глубокого каньона.'
    },
    worldRadius: 1200,
    chunkSize: 150,
    seaLevel: 0,
    minimapTheme: 'kelp',
    spawn: {
      pos: [spawnX, spawnY, spawnZ],
      yaw: 2.1,
      pitch: -0.06
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
