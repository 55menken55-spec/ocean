/* ================= БИОМ 9: ГАЛАПАГОССКИЙ АПВЕЛЛИНГ И АРКА ДАРВИНА ================= */
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
      id: 'lava_shallows',
      name: 'Лавовая бухта и фумаролы',
      shortName: 'Лавовая бухта',
      color: '#52c288',
      depthLabel: '0 – 17 м',
      tempC: 23.4,
      description: 'Чёрные базальтовые рифы и вулканические пузырьковые фумаролы, где пасутся морские игуаны и охотятся галапагосские пингвины.'
    },
    {
      id: 'darwins_arch',
      name: 'Арка Дарвина и базальтовые пинакли',
      shortName: 'Арка Дарвина',
      color: '#e8a238',
      depthLabel: '0 – 36 м',
      tempC: 21.8,
      description: 'Монументальная природная базальтовая арка посреди Тихого океана — магнит для акул-молотов, галапагосских акул и морских львов.'
    },
    {
      id: 'upwelling_wall',
      name: 'Стена апвеллинга Кромвеля',
      shortName: 'Стена апвеллинга',
      color: '#28a99e',
      depthLabel: '18 – 78 м',
      tempC: 17.6,
      description: 'Отвесный вулканический свал, куда поднимается холодное глубинное течение Кромвеля, питающее лун-рыб Mola mola, скатов мобула и косяки сардин.'
    },
    {
      id: 'pelagic_abyss',
      name: 'Пелагиаль островов Вольфа и Дарвина',
      shortName: 'Пелагиаль Вольфа',
      color: '#1b649c',
      depthLabel: '65 – 132 м',
      tempC: 15.2,
      description: 'Богатые планктоном экваториальные глубины вдоль вулканического хребта, где патрулируют стаи косаток, китовые акулы и тунцы.'
    }
  ];

  // Вулканические островки и базальтовые пинакли западной бухты (чистая вода вокруг судна НИС и центрального прохода арки)
  const VOLCANIC_ISLETS = [
    { x: -245, z: -140, r: 58, h: 5.2 },
    { x: -290, z: 165, r: 52, h: 4.8 },
    { x: -95, z: -265, r: 48, h: 4.4 },
    // Опоры Арки Дарвина строго по бокам (-26 и +26), оставляя чистый проход (-22 м) посередине (0,0)
    { x: -26, z: 0, r: 10, h: 2.2 },
    { x: 26, z: 0, r: 10, h: 2.2 }
  ];

  const ARCH_POS = { x: 0, z: 0 };
  const VESSEL_POS = { x: 265, z: -145 };

  function wallCurve(z) {
    return Math.sin(z * 0.0028 + 0.5) * 65 + Math.cos(z * 0.0052) * 26;
  }

  function getHeight(x, z) {
    const wx = x - wallCurve(z);

    // Западно-восточный профиль: лавовая отмель (-8..-17 м) -> плато Арки (-22 м) -> свал апвеллинга (-24 -> -122 м)
    let h = -22.0;
    if (wx < -120) {
      const t = OC.smoothstep(-480, -120, wx);
      h = OC.lerp(-8.2, -16.5, t);
    } else if (wx < 95) {
      const t = OC.smoothstep(-120, 95, wx);
      h = OC.lerp(-16.5, -22.5, t);
    } else if (wx < 340) {
      const t = OC.smoothstep(95, 340, wx);
      const terrace = Math.sin(t * Math.PI * 3.0) * 1.6 * Math.sin(t * Math.PI);
      h = OC.lerp(-22.5, -88.0, t) + terrace;
    } else {
      const t = OC.smoothstep(340, 1050, wx);
      h = OC.lerp(-88.0, -132.0, t);
    }

    // Ребристая фактура застывшей базальтовой лавы
    const basaltRidges = Math.sin(x * 0.048 + z * 0.036) * 0.65;
    const fbm = OC.fbm2(x * 0.0065, z * 0.0065, 3) * 3.2 + OC.fbm2(x * 0.026, z * 0.026, 2) * 1.1;
    h += basaltRidges + fbm;

    // Сглаженная площадка точно под пролётом Арки Дарвина (-22 м), чтобы ничто не перекрывало арку
    const dArchCenter = Math.hypot(x - ARCH_POS.x, z - ARCH_POS.z);
    if (dArchCenter < 22) {
      const clear = OC.smoothstep(22, 10, dArchCenter);
      h = OC.lerp(h, -22.0 + OC.noise2(x * 0.08, z * 0.08) * 0.5, clear);
    }

    // Вулканические островки и базальтовые опоры Арки Дарвина
    for (let i = 0; i < VOLCANIC_ISLETS.length; i++) {
      const isl = VOLCANIC_ISLETS[i];
      const d = Math.hypot(x - isl.x, z - isl.z);
      if (d < isl.r * 2.1) {
        const shelf = OC.smoothstep(isl.r * 2.0, isl.r * 0.72, d);
        const peak = OC.smoothstep(isl.r * 0.95, 0, d);
        const rock = isl.h + OC.fbm2(x * 0.08, z * 0.08, 2) * 1.2;
        h = Math.max(h, OC.lerp(-14.0, rock, Math.max(shelf * 0.48, peak)));
      }
    }

    // Подводная кальдера вокруг судна НИС «Beagle II» всегда глубокая
    const dv = Math.hypot(x - VESSEL_POS.x, z - VESSEL_POS.z);
    if (dv < 90) {
      h = Math.min(h, -48.0);
    }

    return h;
  }

  function safeSpotY(x, z, desiredY, minClearance) {
    const fl = getHeight(x, z);
    return Math.max(desiredY, fl + (minClearance || 2.8));
  }

  function getZoneAt(x, y, z) {
    const dArch = Math.hypot(x - ARCH_POS.x, z - ARCH_POS.z);
    if (dArch < 92 && y > -38) return ZONES[1]; // darwins_arch
    if (x >= 285 || y <= -66) return ZONES[3]; // pelagic_abyss
    if (x < -75 || y > -17.5) return ZONES[0]; // lava_shallows
    return ZONES[2]; // upwelling_wall
  }

  function getCurrentAt(x, y, z, time, out) {
    const wx = x - wallCurve(z);
    // Глубинное экваториальное течение Кромвеля ударяется о склон и мощно устремляется вверх (апвеллинг)
    const onWall = OC.smoothstep(-40, 120, wx) * OC.smoothstep(380, 150, wx);
    const upSurge = onWall * (0.42 + 0.35 * Math.sin(time * 0.4 + z * 0.015));
    const vx = 0.55 + 0.32 * onWall + Math.sin(time * 0.25 + z * 0.01) * 0.14;
    const vz = 0.38 + Math.cos(time * 0.22 + x * 0.01) * 0.18;
    const vy = upSurge - (y > -3.0 ? 0.18 : 0.0);
    out.set(vx, vy, vz);
    return out;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const above = y > 0.25;
    if (above) {
      _fogCol.set(0xbde4f4).lerp(_colA.set(0x0c1b2e), 1 - dayW);
      _waterCol.set(0x168ea0);
      _skyTop.set(0x2e82cb);
      _skyBot.set(0xb2dff2);
      _aboveHoriz.set(0xcbeafa).lerp(_colA.set(0x14263c), 1 - dayW);
      return {
        aboveWater: true,
        fogColor: _fogCol,
        fogDensity: 0.0005,
        causticStrength: 0,
        rayStrength: 0,
        sunAtten: 1.0,
        bioGlow: 0,
        waterColor: _waterCol,
        aboveHoriz: _aboveHoriz
      };
    }

    const depth = Math.max(0, -y);
    const wx = x - wallCurve(z);
    const pelagicW = OC.smoothstep(95, 340, wx);
    const atten = Math.exp(-depth * 0.028);

    // Богатый изумруд планктонного апвеллинга -> глубокий тихоокеанский кобальт у Вольфа
    _colA.set(0x148288).lerp(_colB.set(0x0c4c86), pelagicW);
    _colA.lerp(_colC.set(0x041428), OC.clamp(depth / 110, 0, 0.9));
    _fogCol.copy(_colA).multiplyScalar(0.15 + 0.85 * dayW);

    _waterCol.set(0x22a69c).lerp(_colB.set(0x145a9a), pelagicW);
    _skyTop.set(0x4fd4c6).lerp(_colB.set(0x164470), 1 - dayW);
    _skyBot.set(0x031426);
    _aboveHoriz.set(0xb0e2f4).lerp(_colB.set(0x122238), 1 - dayW);

    const fogDensity = OC.lerp(0.0066, 0.0112, OC.clamp(depth / 95, 0, 1));
    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity,
      causticStrength: OC.clamp(atten * 0.92 * dayW, 0, 1.0),
      rayStrength: OC.clamp(Math.exp(-depth * 0.04) * 1.02 * dayW, 0, 1.0),
      sunAtten: atten,
      bioGlow: OC.clamp((1 - dayW) * 0.82 + OC.smoothstep(45, 95, depth) * 0.48, 0, 1),
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz,
      fillAColor: _colB.set(0x3ecfc0),
      fillBColor: _colC.set(0x5292d4)
    };
  }

  function getTerrainColor(x, y, z, outColor) {
    const n = OC.noise2(x * 0.09, z * 0.09);
    // Чёрный вулканический базальт, оливковая трава в зоне прибоя и глубокие синие пески склона
    _colA.setHex(0x1b1a20);
    _colB.setHex(0x3b3d35);
    outColor.copy(_colA).lerp(_colB, OC.clamp(n * 0.5 + 0.45, 0, 1));

    if (y > -10 && y < 2.5) {
      _colC.setHex(0x3f613c);
      outColor.lerp(_colC, OC.smoothstep(-10, -2, y) * 0.45);
    }
    if (y < -48) {
      _colC.setHex(0x131922);
      outColor.lerp(_colC, OC.smoothstep(-48, -95, y) * 0.7);
    }
    return outColor;
  }

  function generateChunkFlora(cx, cz, chunkSize, densityScale, rng) {
    const items = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;
    const scale = densityScale || 1.0;

    // 1. Плотный ковёр водоросли Ульва и морские жёлуди в мелководных лавовых бухтах (y: -18..-1)
    const countShallows = Math.round(16 * scale);
    for (let i = 0; i < countShallows; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const y = getHeight(x, z);
      if (y > -18 && y < -0.7) {
        const sp = rng() < 0.62 ? 'ulva_turf' : 'galapagos_barnacle';
        items.push({
          species: sp, x, y, z,
          ry: rng() * Math.PI * 2,
          scale: OC.lerp(0.85, 1.45, rng()),
          tint: OC.lerp(0.85, 1.15, rng())
        });
      }
    }

    // 2. Неоново-оранжевые чашечки Tubastraea и чёрные кораллы на стене апвеллинга и опорах арки (-62..-8 м)
    const countWall = Math.round(18 * scale);
    for (let i = 0; i < countWall; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const y = getHeight(x, z);
      if (y > -64 && y < -8) {
        const sp = y < -30 && rng() < 0.36 ? 'coral_black' : 'tubastraea_coral';
        items.push({
          species: sp, x, y, z,
          ry: rng() * Math.PI * 2,
          scale: OC.lerp(0.9, 1.55, rng()),
          tint: OC.lerp(0.88, 1.16, rng())
        });
      }
    }

    // 3. Вулканические CO2-фумаролы вокруг западной бухты (-18..-5 м)
    if (x0 < -40 && x0 + chunkSize > -280 && z0 < 60 && z0 + chunkSize > -180) {
      const nFum = Math.round(3 * scale);
      for (let i = 0; i < nFum; i++) {
        const x = x0 + rng() * chunkSize;
        const z = z0 + rng() * chunkSize;
        const y = getHeight(x, z);
        if (y > -18 && y < -3.5) {
          items.push({
            species: 'volcanic_fumarole', x, y, z,
            ry: rng() * Math.PI * 2,
            scale: OC.lerp(0.95, 1.4, rng()),
            tint: OC.lerp(0.88, 1.12, rng())
          });
        }
      }
    }

    // 4. Фиолетовые морские ежи на каменистом лавовом грунте
    const countUrchins = Math.round(5 * scale);
    for (let i = 0; i < countUrchins; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const y = getHeight(x, z);
      if (y > -24 && y < -1.5) {
        items.push({
          species: 'urchin_purple', x, y, z,
          ry: rng() * Math.PI * 2,
          scale: OC.lerp(0.8, 1.3, rng()),
          tint: 1.0
        });
      }
    }

    return items;
  }

  const landmarks = [
    { id: 'darwins_arch', name: 'Арка Дарвина', zoneId: 'darwins_arch', x: 0, z: 42, y: safeSpotY(0, 42, -11.5, 3.0), look: [0, -8, 0] },
    { id: 'lava_cove', name: 'Лавовая бухта игуан и пингвинов', zoneId: 'lava_shallows', x: -145, z: -68, y: safeSpotY(-145, -68, -6.5, 2.5), look: [-140, -10, -80] },
    { id: 'upwelling_wall', name: 'Стена апвеллинга Кромвеля', zoneId: 'upwelling_wall', x: 165, z: -48, y: safeSpotY(165, -48, -26.0, 4.0), look: [190, -28, -20] },
    { id: 'sunfish_cleaning', name: 'Станция чистки Mola mola', zoneId: 'upwelling_wall', x: 195, z: 120, y: safeSpotY(195, 120, -22.0, 4.0), look: [210, -24, 105] },
    { id: 'wolf_orca_shelf', name: 'Пелагиаль косаток и китовых акул', zoneId: 'pelagic_abyss', x: 375, z: -85, y: safeSpotY(375, -85, -32.0, 5.0), look: [330, -24, -100] }
  ];

  const spawn = {
    pos: [landmarks[0].x, landmarks[0].y, landmarks[0].z],
    yaw: 3.14,
    pitch: -0.04
  };

  const _tourRaw = [
    { x: 0, y: -11.5, z: 42, lx: 0, ly: -7.5, lz: 0, title: 'Арка Дарвина и акулы-молоты', duration: 10,
      fact: 'Знаменитая базальтовая арка острова Дарвина стоит на пути экваториальных течений, собирая стаи акул-молотов и китовых акул.' },
    { x: -145, y: -6.5, z: -68, lx: -140, ly: -9.5, lz: -80, title: 'Морские игуаны и вулканические фумаролы', duration: 9,
      fact: 'Галапагосская морская игуана — единственная в мире ящерица, ныряющая в океан за зелёными водорослями ульва и согревающаяся затем на чёрной лаве.' },
    { x: -165, y: -5.0, z: 25, lx: -145, ly: -4.5, lz: 8, title: 'Экваториальные пингвины и голубоногие олуши', duration: 9,
      fact: 'Благодаря холодному течению Кромвеля галапагосский пингвин — единственный вид пингвинов, живущий и охотящийся прямо на экваторе.' },
    { x: 195, y: -22.0, z: 120, lx: 215, ly: -23.0, lz: 110, title: 'Океаническая луна-рыба Mola mola и мобулы', duration: 10,
      fact: 'Крупнейшая костная рыба планеты — Mola mola — поднимается из глубин к тёплым скалам, чтобы королевские рыбы-ангелы очистили её от паразитов.' },
    { x: 375, y: -32.0, z: -85, lx: 330, ly: -20.0, lz: -105, title: 'Апвеллинг Кромвеля и охота косаток', duration: 10,
      fact: 'Подъём богатых нитратами холодных вод вдоль вулканических островов создаёт мощнейшие косяки сардин, привлекающие стаи косаток и китов.' }
  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, Math.min(2.0, safeSpotY(leg.x, leg.z, leg.y, 3.2)), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    fact: leg.fact,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    floor: ['Вулканический базальт Галапагосов', 'Шельф Дарвина и Вольфа', 'Геология', 'Все зоны', '0 – 132 м',
      'Тёмная застывшая базальтовая лава подводных щитовых вулканов Наска, богатая железом и оливковым песком.'],
    darwins_arch: ['Арка Дарвина', 'Вулканическая базальтовая арка (48 м)', 'Геология', 'Арка Дарвина', '0 – 22 м',
      'Монументальная природная арка из слоистого вулканического туфа, возвышающаяся над проходом между островами Дарвина и Вольфа.'],
    volcanic_fumarole: ['Вулканическая CO₂-фумарола', 'Субмаринная фумарола Рока Редонда', 'Геология', 'Лавовая бухта', '4 – 18 м',
      'Подводные трещины лавы с кристаллами серы, непрерывно выделяющие струи вулканического углекислого газа.'],
    tubastraea_coral: ['Оранжевый коралл-чашечка', 'Tubastraea coccinea', 'Кораллы', 'Стена апвеллинга', '6 – 60 м',
      'Азооксантеллатный ярко-оранжевый коралл, плотно покрывающий затенённые базальтовые стены течения Кромвеля.'],
    galapagos_barnacle: ['Вулканический морской жёлудь', 'Megabalanus galapaganus', 'Беспозвоночные', 'Лавовая бухта', '0 – 16 м',
      'Крупный эндемичный усоногий рачок с полосатыми известковыми домиками на прибойных лавовых камнях.'],
    ulva_turf: ['Лавовый морской салат Ульва', 'Ulva lobata', 'Флора', 'Лавовая бухта', '0 – 16 м',
      'Яркий ковёр зелёных и красных морских водорослей на омываемом прибоем базальте — главный рацион морских игуан.'],
    coral_black: ['Эндемичный чёрный коралл', 'Antipathes galapagensis', 'Кораллы', 'Стена апвеллинга', '18 – 72 м',
      'Кустистые тёмно-золотые колонии глубоководных горгонарий на прохладной отвесной стене апвеллинга.'],
    urchin_purple: ['Тихоокеанский ёж-карандаш', 'Eucidaris galapagensis', 'Беспозвоночные', 'Лавовая бухта', '1 – 22 м',
      'Толстоиглый ёж лавовых рифов, выедающий водоросли и формирующий корку кальциевого песка.'],
    ocean_sunfish: ['Океаническая луна-рыба', 'Mola mola', 'Мегафауна', 'Стена апвеллинга', '8 – 90 м',
      'Гигантская дискообразная костная рыба весом до 2 тонн, приплывающая из глубин на станции чистки у островов Исабела и Дарвина.'],
    marine_iguana: ['Галапагосская морская игуана', 'Amblyrhynchus cristatus', 'Мегафауна', 'Лавовая бухта', '0 – 15 м',
      'Уникальная морская рептилия-ныряльщик с плоским плавательным хвостом, соскребающая ульву с вулканических валунов.'],
    galapagos_penguin: ['Галапагосский пингвин', 'Spheniscus mendiculus', 'Птицы', 'Лавовая бухта', '+1 .. -16 м',
      'Самый северный и единственный экваториальный пингвин планеты, стремительно преследующий сардин в холодных струях апвеллинга.'],
    orca: ['Косатка экваториальной Пацифики', 'Orcinus orca', 'Мегафауна', 'Пелагиаль Вольфа', '0 – 95 м',
      'Могучий черно-белый хищник вершин пищевой пирамиды, охотящийся группами вдоль свала вулканических островов.'],
    mobula_ray: ['Эскадра скатов мобула', 'Mobula munkiana', 'Мегафауна', 'Стена апвеллинга', '0 – 50 м',
      'Синхронные стаи крылатых дьяволовых скатов с головными рожками, фильтрующие планктон и взлетающие над волнами.'],
    galapagos_shark: ['Галапагосская акула', 'Carcharhinus galapagensis', 'Мегафауна', 'Арка Дарвина', '5 – 85 м',
      'Крупная океаническая серая акула-хозяин вулканических пинаклей и обрывов островов Дарвина и Вольфа.'],
    shark_hammerhead: ['Зубчатая акула-молот', 'Sphyrna lewini', 'Мегафауна', 'Арка Дарвина', '8 – 85 м',
      'Огромные скопления акул-молотов, патрулирующие сильные течения перед Аркой Дарвина.'],
    shark_whale: ['Беременная самка китовой акулы', 'Rhincodon typus', 'Мегафауна', 'Стена апвеллинга', '6 – 95 м',
      'Гигантские 12-метровые китовые акулы, мигрирующие каждый сезон мимо Арки Дарвина в водах апвеллинга.'],
    sea_lion: ['Галапагосский морской лев', 'Zalophus wollebaeki', 'Мегафауна', 'Арка Дарвина', '+2 .. -35 м',
      'Игривые эндемичные ушастые тюлени, кружащие акробатические петли вокруг дайверов и Арки Дарвина.'],
    turtle: ['Чёрная галапагосская черепаха', 'Chelonia mydas agassizii', 'Мегафауна', 'Лавовая бухта', '2 – 35 м',
      'Меланистическая тихоокеанская зелёная черепаха с тёмным карапаксом, пасущаяся среди вулканических камней.'],
    sardine_baitball: ['Мега-косяк сардин', 'Sardinops sagax', 'Рыбы', 'Стена апвеллинга', '3 – 45 м',
      'Плотное мерцающее облако из сотен сардин, сжимающееся в оборонительный шар под атакой акул, пингвинов и олуш.'],
    tuna_yellowfin: ['Желтопёрый тунец', 'Thunnus albacares', 'Рыбы', 'Пелагиаль Вольфа', '8 – 110 м',
      'Стремительный океанический спринтер с ярко-жёлтыми серповидными плавниками на границе холодного апвеллинга.'],
    king_angelfish: ['Королевский ангел-чистильщик', 'Holacanthus passer', 'Рыбы', 'Стена апвеллинга', '6 – 45 м',
      'Пёстрый тёмно-синий ангел с белой полосой и огненным хвостом, очищающий Mola mola и акул-молотов от паразитов.'],
    research_vessel: ['НИС «Beagle II»', 'Чарльз-Дарвиновский НИС (48 м)', 'Экспедиция', 'Пелагиаль Вольфа', '+18 .. -3 м',
      'Экспедиционное судно океанологов станции Чарльза Дарвина, отслеживающее апвеллинг Кромвеля и пути миграции китовых акул.'],
    seabird: ['Голубоногая олуша', 'Sula nebouxii', 'Птицы', 'Небо над Аркой Дарвина', '+1 .. +22 м',
      'Знаменитая морская птица Галапагосов с бирюзовыми лапами, пикирующая стрелой вертикально в кипящие косяки сардин.'],
    dolphin: ['Тропический дельфин-афалина', 'Tursiops truncatus', 'Мегафауна', 'Пролив у Вольфа', '+2.5 .. -10 м',
      'Быстрые стаи дельфинов, рассекающие изумрудные волны экваториального апвеллинга рядом с НИС.'],
    whale_humpback: ['Экваториальный горбатый кит', 'Megaptera novaeangliae', 'Мегафауна', 'Пелагиаль Вольфа', '0 – 85 м',
      'Приходящие к тёплым берегам Эквадора и Галапагосов киты-великаны с эффектными прыжками над поверхностью.']
  };

  const FAUNA_PLAN = {
    cleaningStations: [
      { x: 195, y: -22, z: 120, radius: 24, name: 'Станция чистки Mola mola' },
      { x: 14, y: -16, z: -12, radius: 22, name: 'Рифовая чистка у Арки Дарвина' }
    ],
    darwinsArches: [
      { x: ARCH_POS.x, z: ARCH_POS.z }
    ],
    fumaroles: [
      { x: -140, z: -80 },
      { x: -188, z: -42 }
    ],
    sunfishes: [
      { cx: 198, cz: 112, r: 26, y: -23, speed: 1.55, scale: 1.45, phase: 0.4 },
      { cx: 162, cz: -52, r: 30, y: -28, speed: 1.45, scale: 1.28, phase: 2.3 }
    ],
    marineIguanas: [
      { cx: -145, cz: -65, r: 16, y: -6.2, speed: 1.4, scale: 1.25, phase: 0.1 },
      { cx: -178, cz: -38, r: 18, y: -5.8, speed: 1.5, scale: 1.15, phase: 1.9 },
      { cx: -120, cz: -95, r: 14, y: -6.5, speed: 1.35, scale: 1.20, phase: 3.4 }
    ],
    penguins: [
      { cx: -155, cz: 14, r: 22, y: -4.2, speed: 4.8, scale: 1.05, phase: 0.2 },
      { cx: -135, cz: 32, r: 18, y: -5.0, speed: 5.1, scale: 0.98, phase: 2.1 },
      { cx: -168, cz: -8, r: 24, y: -3.6, speed: 4.6, scale: 1.1, phase: 4.2 }
    ],
    orcas: [
      { cx: 365, cz: -82, r: 68, y: -24, speed: 5.6, len: 7.4, phase: 0.0 },
      { cx: 382, cz: -70, r: 64, y: -22, speed: 5.5, len: 6.2, phase: 0.35 }
    ],
    mobulas: [
      { cx: 165, cz: -35, r: 48, y: -19, speed: 4.4, count: 5 },
      { cx: 95, cz: 95, r: 54, y: -15, speed: 4.2, count: 5 }
    ],
    hammerheads: [
      { cx: 15, cz: -10, r: 46, y: -14, speed: 5.2, len: 4.4 },
      { cx: 170, cz: -45, r: 64, y: -28, speed: 5.6, len: 4.7 }
    ],
    sharks: [
      { speciesKey: 'galapagos_shark', cx: 22, cz: 18, r: 52, y: -15, speed: 5.4 },
      { speciesKey: 'galapagos_shark', cx: 185, cz: 45, r: 62, y: -25, speed: 5.7 },
      { speciesKey: 'shark_whale', cx: 145, cz: -15, r: 85, y: -22, speed: 3.1, whaleShark: true }
    ],
    seaLions: [
      { cx: -15, cz: 22, r: 26, y: -8, speed: 4.4, scale: 1.05 },
      { cx: -130, cz: -45, r: 24, y: -6, speed: 4.6, scale: 1.0 }
    ],
    turtles: [
      { cx: -148, cz: -72, r: 28, y: -7.5, speed: 1.9, size: 1.05 },
      { cx: 20, cz: 40, r: 36, y: -11, speed: 2.0, size: 1.0 }
    ],
    whales: [
      { cx: 410, cz: 110, r: 115, y: -22, speed: 4.1 }
    ],
    vessels: [
      { x: VESSEL_POS.x, z: VESSEL_POS.z, yaw: 0.45, variant: 'galapagos' }
    ],
    seabirds: [
      { cx: 0, cz: 0, r: 62, y: 12.0, count: 8, speed: 12.5, variant: 'booby' },
      { cx: -150, cz: 0, r: 52, y: 10.5, count: 7, speed: 11.8, variant: 'booby' }
    ],
    dolphins: [
      { cx: 285, cz: -45, r: 72, y: -4.5, count: 5, speed: 7.4, variant: 'spinner' }
    ],
    schools: [
      { key: 'sardine_baitball', n: 180, cx: 145, cz: -25, radius: 34, yDepth: -14, yAmp: 4.5, spread: 7.5, speed: 7.8, scale: 0.36, diel: 'diurnal', shyness: 0.85,
        geoOpts: { len: 0.92, height: 0.24, width: 0.13, colA: 0x3b6c94, colB: 0xdff2fb, finCol: 0x90b8cc } },
      { key: 'sardine_baitball', n: 140, cx: -145, cz: 12, radius: 24, yDepth: -6, yAmp: 2.4, spread: 6.2, speed: 7.2, scale: 0.35, diel: 'diurnal', shyness: 0.85,
        geoOpts: { len: 0.92, height: 0.24, width: 0.13, colA: 0x3b6c94, colB: 0xdff2fb, finCol: 0x90b8cc } },
      { key: 'tuna_yellowfin', n: 32, cx: 340, cz: -65, radius: 52, yDepth: -24, yAmp: 6, spread: 13, speed: 10.6, scale: 0.82, predator: true, diel: 'diurnal', shyness: 0.2,
        geoOpts: { len: 1.55, height: 0.48, width: 0.24, colA: 0x22385c, colB: 0xe6eff6, finCol: 0xf6c924 } },
      { key: 'king_angelfish', n: 36, cx: 195, cz: 120, radius: 18, yDepth: -21, yAmp: 3, spread: 5.5, speed: 3.8, scale: 0.54, cleaner: true, diel: 'diurnal', shyness: 0.2,
        geoOpts: { len: 0.95, height: 0.85, width: 0.14, colA: 0x1a3472, colB: 0xf4f8fc, finCol: 0xf4681c, stripes: 0.8 } }
    ]
  };

  OC.Biomes.register({
    id: 'galapagos_upwelling',
    name: 'Галапагосы: Апвеллинг',
    subtitle: 'Арка Дарвина и макро-фауна экватора · 0 – 132 м',
    region: 'Восточная Пацифика (Экватор)',
    worldRadius: 1200,
    chunkSize: 150,
    noSurface: false,
    seaLevel: 0,
    depthOffset: 0,
    minimapTheme: 'galapagos',
    globe: {
      lat: -0.22,
      lon: -91.42,
      coordLabel: '0.2° S, 91.4° W',
      ocean: 'Экваториальная Пацифика',
      depthSpan: '0 – 132 м',
      tempSpan: '15.2 – 23.8 °C',
      color: '#34d399',
      summary: 'Столкновение тёплого течения и холодного глубинного апвеллинга Кромвеля у вулканической Арки Дарвина: морские игуаны, экваториальные пингвины, Mola mola и косатки.'
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
    getTerrainColor,
    getOpticalProfile,
    generateChunkFlora
  });
})(window.OC);
