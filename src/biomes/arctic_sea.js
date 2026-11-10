/* ================= БИОМ: ПОЛЯРНОЕ МОРЕ / ПОДО ЛЬДОМ АРКТИКИ (БАФФИНОВ ЗАЛИВ, 74° N) ================= */
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
  const _aboveTop = new T.Color();
  const _aboveHoriz = new T.Color();

  const ZONES = [
    {
      id: 'pack_ice',
      name: 'Кромка пакового припая и полынья',
      shortName: 'Паковый лёд',
      color: '#9ce2ff',
      depthLabel: '0 – 22 м',
      tempC: -1.5,
      description: 'Многолетние ледяные поля с резными подводными килями и бирюзовыми разводьями полыней под северным сиянием.'
    },
    {
      id: 'iceberg_alley',
      name: 'Аллея айсбергов и брайниклов',
      shortName: 'Аллея айсбергов',
      color: '#4ebae8',
      depthLabel: '18 – 48 м',
      tempC: -1.7,
      description: 'Величественные айсберги с 25-метровыми подводными килями, ледяные сталактиты-брайниклы и стаи белух.'
    },
    {
      id: 'arctic_shelf',
      name: 'Моренный шельф и арктическая ламинария',
      shortName: 'Арктический риф',
      color: '#2c8fa3',
      depthLabel: '14 – 42 м',
      tempC: -1.3,
      description: 'Ледниковые валуны с розовой кораллиной, сахарной ламинарией, малиновой «морской клубникой» и нарвалами.'
    },
    {
      id: 'polar_trench',
      name: 'Полярная бездна Баффина',
      shortName: 'Полярный жёлоб',
      color: '#113a66',
      depthLabel: '42 – 142 м',
      tempC: -1.8,
      description: 'Ледяной глубоководный жёлоб с гренландскими полярными акулами, гигантскими цианеями и светящимися морскими ангелами.'
    }
  ];

  // Полыньи — открытые разводья во льду, пропускающие солнечные лучи и северное сияние
  const POLYNYAS = [
    { x: -360, z: 20, r: 95 },
    { x: -490, z: -260, r: 85 },
    { x: -240, z: 320, r: 80 }
  ];

  function shelfOffset(z) {
    return Math.sin(z * 0.0022) * 110 + Math.cos(z * 0.005 + 0.6) * 42;
  }

  function isPolynya(x, z) {
    for (let i = 0; i < POLYNYAS.length; i++) {
      const p = POLYNYAS[i];
      if (Math.hypot(x - p.x, z - p.z) < p.r) return true;
    }
    const lead = Math.abs(Math.sin(x * 0.0045 + z * 0.0032));
    return lead < 0.14;
  }

  function getHeight(x, z) {
    const sx = x - shelfOffset(z);

    // Мелководный арктический припайный шельф на западе (-1200 .. -240), бухта айсбергов (-240 .. +250) и жёлоб Баффина (> +250)
    let h = -24.0;
    const westRise = OC.smoothstep(-260, -880, sx) * 16.5;
    h += westRise;

    // Свал к глубокому жёлобу Баффина на востоке
    const trenchDrop = OC.smoothstep(180, 760, sx) * 98.0;
    h -= trenchDrop;

    // Ледниковые моренные борозды и каменные банки
    const moraine = (OC.ridged2(x * 0.007, z * 0.007, 3) - 0.5) * 7.2 * OC.smoothstep(650, -550, sx);
    const rough = OC.fbm2(x * 0.024, z * 0.024, 3) * 3.8;
    h += moraine + rough;

    // Углублённая ледниковая промоина на Аллее айсбергов (-240 .. +180)
    const alleyFactor = OC.smoothstep(-320, -140, sx) * OC.smoothstep(280, 120, sx);
    h -= alleyFactor * 11.0;

    return OC.clamp(h, -142.0, -3.5);
  }

  function safeSpotY(x, z, desiredY, clearance) {
    return Math.max(desiredY, getHeight(x, z) + (clearance || 3.5));
  }

  function getZoneAt(x, y, z) {
    const sx = x - shelfOffset(z);
    const fl = getHeight(x, z);
    if (sx < -245 || fl > -17.5) return ZONES[0]; // pack_ice
    if (sx > 255 || fl < -48.0) return ZONES[3]; // polar_trench
    const shelfPatch = OC.fbm2(x * 0.0048 + 9.2, z * 0.0048 - 4.7, 2);
    if (shelfPatch > 0.05) return ZONES[2]; // arctic_shelf
    return ZONES[1]; // iceberg_alley
  }

  function getTerrainColor(x, y, z, out) {
    const n = OC.clamp(OC.fbm2(x * 0.042, z * 0.042, 2) * 0.8 + 0.5, 0, 1);
    const coralline = OC.smoothstep(0.10, 0.42, OC.fbm2(x * 0.022 + 5.1, z * 0.022 - 3.3, 2));

    _colA.set(0x636c74); // ледниковая галька и гнейс
    _colB.set(0x414e56); // тёмный базальтово-сланцевый ил
    _colC.set(0x88546a); // розовая арктическая кораллина Lithothamnion

    if (y > -28.0) {
      out.copy(_colA).lerp(_colB, n * 0.48);
      if (coralline > 0.25) out.lerp(_colC, coralline * 0.55);
    } else if (y > -65.0) {
      out.set(0x3a4752).lerp(_colA, n * 0.32);
    } else {
      out.set(0x1e2834).lerp(_colB, n * 0.45);
    }
    return out;
  }

  function getTemperatureAt(x, depthM, zone) {
    // Полярная солёная вода держится ниже 0 °C (от -1.3 °C на шельфе до -1.85 °C в жёлобе)
    const base = zone ? zone.tempC : -1.5;
    const drop = OC.clamp(depthM / 140.0, 0, 1) * 0.35;
    return OC.clamp(base - drop, -1.9, -1.1);
  }

  function getOpticalProfile(x, y, z, dayW) {
    const above = y > 0.25;
    if (above) {
      _fogCol.set(0xaecce0).lerp(_colA.set(0x0c1728), 1 - dayW);
      _waterCol.set(0x1f6d8c);
      _skyTop.set(0x3b76a6).lerp(_colA.set(0x060f1e), 1 - dayW);
      _skyBot.set(0xb4d6ea);
      _aboveTop.set(0x2d6496).lerp(_colA.set(0x050d1c), 1 - dayW);
      _aboveHoriz.set(0xc8e4f5).lerp(_colA.set(0x0e1c30), 1 - dayW);
      return {
        aboveWater: true,
        fogColor: _fogCol,
        fogDensity: 0.00055,
        causticStrength: 0,
        rayStrength: 0,
        sunAtten: 1.0,
        bioGlow: 1 - dayW,
        waterColor: _waterCol,
        skyTop: _skyTop,
        skyBot: _skyBot,
        aboveTop: _aboveTop,
        aboveHoriz: _aboveHoriz
      };
    }

    const depth = Math.max(0, -y);
    const inIceShelf = getZoneAt(x, y, z).id === 'pack_ice' && !isPolynya(x, z);
    // Подо льдом свет голубее и мягче, в полынье и на аллее — прозрачная ледниковая кристальность до 40+ м!
    const iceShade = inIceShelf ? 0.62 : 1.0;
    const sunAtten = Math.exp(-depth * 0.025) * iceShade;

    if (depth < 24) {
      _fogCol.set(0x147094).lerp(_colA.set(0x0b4c72), depth / 24);
      _waterCol.set(0x7ae2ff);
    } else if (depth < 60) {
      _fogCol.set(0x0b4c72).lerp(_colA.set(0x062344), (depth - 24) / 36);
      _waterCol.set(0x3fa8d4);
    } else {
      _fogCol.set(0x062344).lerp(_colA.set(0x020c1c), Math.min(1, (depth - 60) / 70));
      _waterCol.set(0x1e6694);
    }

    // В полярную ночь под водой темнее, но остаётся отражённое сияние от неба и льда
    _fogCol.lerp(_colB.set(0x030b18), (1 - dayW) * 0.72);
    const fogDensity = (inIceShelf ? 0.0086 : 0.0068) + Math.min(0.011, depth * 0.00010);

    _skyTop.set(0x88e6ff).lerp(_colA.set(0x164468), 1 - dayW);
    _skyBot.set(0x03182c);
    _aboveHoriz.set(0xb8dcf0).lerp(_colA.set(0x0c1b2e), 1 - dayW);

    return {
      aboveWater: false,
      fogColor: _fogCol,
      fogDensity,
      causticStrength: (inIceShelf ? 0.16 : 0.75) * dayW * Math.exp(-depth * 0.042),
      rayStrength: (inIceShelf ? 0.14 : 0.68) * dayW * Math.exp(-depth * 0.045),
      sunAtten,
      bioGlow: OC.clamp((1 - dayW) * 0.75 + OC.smoothstep(34, 88, depth) * 0.85, 0, 1),
      waterColor: _waterCol,
      skyTop: _skyTop,
      skyBot: _skyBot,
      aboveHoriz: _aboveHoriz
    };
  }

  function getCurrentAt(x, y, z, time, out) {
    out = out || new T.Vector3();
    if (y > 0.25) return out.set(0, 0, 0);
    const sx = x - shelfOffset(z);
    // Течение вдоль Баффинова пролива к югу (+Z) с завихрениями на кромке айсбергов и припая
    const surge = Math.sin(time * 0.5 + x * 0.03) * 0.18;
    const stream = OC.smoothstep(-350, 350, sx) * 1.15 + 0.35;
    const eddyX = Math.sin(z * 0.014 + time * 0.18) * 0.42;
    const depthFade = OC.smoothstep(-130, -5, y);
    return out.set((eddyX + surge) * depthFade, 0, stream * depthFade);
  }

  const _lmRaw = [
    {
      id: 'ice_cathedral',
      name: 'Полынья и Ледяной свод',
      zoneId: 'pack_ice',
      x: -360,
      y: -10.5,
      z: 20,
      yaw: 2.35,
      pitch: 0.06,
      clearance: 3.8,
      description: 'Разводье среди пакового льда: лучи полярного солнца пробивают воду, а рядом спускаются ледяные кили.'
    },
    {
      id: 'iceberg_alley',
      name: 'Аллея айсбергов',
      zoneId: 'iceberg_alley',
      x: -40,
      y: -15.5,
      z: -80,
      yaw: 1.85,
      pitch: -0.04,
      clearance: 4.5,
      description: 'Исполинские бирюзовые ледяные кили уходят на 25 м вглубь, а между ними кружат стаи белух.'
    },
    {
      id: 'brinicle_garden',
      name: 'Сад брайниклов',
      zoneId: 'pack_ice',
      x: -185,
      y: -14.0,
      z: 210,
      yaw: 0.75,
      pitch: -0.08,
      clearance: 3.8,
      description: 'Редкое природное явление — «ледяные пальцы смерти», растущие от кромки льда до самого дна.'
    },
    {
      id: 'kelp_moraine',
      name: 'Моренный риф ламинарии',
      zoneId: 'arctic_shelf',
      x: 90,
      y: -18.5,
      z: 165,
      yaw: -1.1,
      pitch: -0.1,
      clearance: 4.0,
      description: 'Каменистые банки с сахарной ламинарией, малиновой «морской клубникой» и нарвалами.'
    },
    {
      id: 'baffin_trench',
      name: 'Полярная бездна Баффина',
      zoneId: 'polar_trench',
      x: 560,
      y: -64.0,
      z: -40,
      yaw: -1.55,
      pitch: -0.16,
      clearance: 5.5,
      description: 'Глубокий ледяной жёлоб с температурой -1.8 °C, где скользят гренландские акулы и светятся морские ангелы.'
    }
  ];

  const landmarks = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: Math.min(-3.0, safeSpotY(lm.x, lm.z, lm.y, lm.clearance))
  }));

  const spawnX = landmarks[0].x;
  const spawnZ = landmarks[0].z;
  const spawnY = Math.min(-3.5, safeSpotY(spawnX, spawnZ, -10.5, 4.0));

  function nearLandmark(x, z, minD) {
    for (let i = 0; i < landmarks.length; i++) {
      if (Math.hypot(x - landmarks[i].x, z - landmarks[i].z) < minD) return true;
    }
    return false;
  }

  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const out = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;
    const midX = x0 + chunkSize * 0.5;
    const midZ = z0 + chunkSize * 0.5;
    const sxMid = midX - shelfOffset(midZ);

    // 1. Паковые льдины на поверхности (y = 0) в западной и центральной зонах (кроме полыней!)
    if (sxMid < 260) {
      const iceAttempts = Math.round(7 * density);
      for (let i = 0; i < iceAttempts; i++) {
        const x = x0 + rng() * chunkSize;
        const z = z0 + rng() * chunkSize;
        const sx = x - shelfOffset(z);
        if (sx > 210 || isPolynya(x, z)) continue;
        // Оставляем свободный край у спавна и в центре ориентиров
        if (nearLandmark(x, z, 28)) continue;
        const fl = getHeight(x, z);
        if (fl > -7.0) continue; // не сажаем ледяной киль в слишком мелкий грунт
        const iceProb = sx < -120 ? 0.78 : 0.42;
        if (rng() > iceProb) continue;
        out.push({
          species: 'ice_floe',
          x,
          y: 0,
          z,
          ry: rng() * 6.283,
          scale: OC.lerp(0.82, 1.35, rng()),
          tint: rng() < 0.5 ? 0xf6fbff : 0xe4f4ff
        });
      }
    }

    // 2. Гигантские айсберги (y = 0) преимущественно в Аллее айсбергов и кромке жёлоба
    if (sxMid > -290 && sxMid < 480) {
      const bergAttempts = Math.max(1, Math.round(2 * density));
      for (let i = 0; i < bergAttempts; i++) {
        if (rng() > 0.52) continue;
        const x = x0 + 25 + rng() * (chunkSize - 50);
        const z = z0 + 25 + rng() * (chunkSize - 50);
        if (isPolynya(x, z) || nearLandmark(x, z, 36)) continue;
        const fl = getHeight(x, z);
        if (fl > -22.0) continue; // киль айсберга до 25 м требует глубины
        out.push({
          species: 'iceberg',
          x,
          y: 0,
          z,
          ry: rng() * 6.283,
          scale: fl < -30 ? OC.lerp(0.9, 1.32, rng()) : OC.lerp(0.65, 0.85, rng()),
          tint: rng() < 0.5 ? 0xf2f9ff : 0xdaf0ff
        });
      }
    }

    // 3. Арктический бентос: сахарная ламинария, морская клубника, актинии, брайниклы и ежи
    const attempts = Math.round(24 * density);
    for (let i = 0; i < attempts; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const h = getHeight(x, z);
      const zone = getZoneAt(x, h, z);
      const sx = x - shelfOffset(z);

      const hR = getHeight(x + 3.5, z);
      const hU = getHeight(x, z + 3.5);
      const slope = Math.hypot(hR - h, hU - h) / 3.5;

      // Брайниклы («ледяные пальцы смерти») тянутся от кромки льда до самого дна (-13.5 .. -30 м)
      if ((zone.id === 'pack_ice' || zone.id === 'iceberg_alley') && h < -13.5 && h > -30 && !isPolynya(x, z) && rng() < 0.16) {
        out.push({
          species: 'brinicle',
          x,
          y: h - 0.1,
          z,
          ry: rng() * 6.283,
          scale: OC.clamp(Math.abs(h + 2.0) / 13.5, 0.6, 1.22),
          tint: 0xe6f8ff
        });
        continue;
      }

      if (zone.id === 'polar_trench' || h < -52) {
        if (slope < 0.8 && rng() < 0.32) {
          out.push({
            species: rng() < 0.55 ? 'coral_arctic_soft' : 'anemone_arctic',
            x,
            y: h - 0.08,
            z,
            ry: rng() * 6.283,
            scale: OC.lerp(0.85, 1.35, rng()),
            tint: 0xffc6d4
          });
        }
        continue;
      }

      if (slope > 0.72) continue;

      const r = rng();
      if (h < -6.8 && h > -36 && r < 0.44) {
        out.push({
          species: 'kelp_arctic',
          x,
          y: h - 0.12,
          z,
          ry: rng() * 6.283,
          scale: OC.lerp(0.8, 1.45, rng()),
          tint: rng() < 0.5 ? 0xffffff : 0xe8d9aa
        });
      } else if (r < 0.68) {
        out.push({
          species: 'coral_arctic_soft',
          x,
          y: h - 0.08,
          z,
          ry: rng() * 6.283,
          scale: OC.lerp(0.85, 1.4, rng()),
          tint: rng() < 0.5 ? 0xffffff : 0xffb8ca
        });
      } else if (r < 0.86) {
        out.push({
          species: 'anemone_arctic',
          x,
          y: h - 0.08,
          z,
          ry: rng() * 6.283,
          scale: OC.lerp(0.8, 1.3, rng()),
          tint: 0xffd2b8
        });
      } else if (sx < 200) {
        out.push({
          species: 'urchin_purple',
          x,
          y: h - 0.04,
          z,
          ry: rng() * 6.283,
          scale: OC.lerp(0.75, 1.15, rng()),
          tint: 0x86c89c
        });
      }
    }

    return out;
  }

  const _tourRaw = [
    { x: spawnX, y: -10.5, z: spawnZ, lx: spawnX + 35, ly: -4, lz: spawnZ + 30, title: 'Полынья и ледяной припай', duration: 9 },
    { x: landmarks[1].x, y: -14.5, z: landmarks[1].z, lx: landmarks[1].x + 30, ly: -8, lz: landmarks[1].z - 25, title: 'Аллея айсбергов и белухи', duration: 9 },
    { x: landmarks[2].x, y: -13.5, z: landmarks[2].z, lx: landmarks[2].x + 25, ly: -15, lz: landmarks[2].z + 15, title: 'Сад брайниклов подо льдом', duration: 9 },
    { x: landmarks[3].x, y: -18.0, z: landmarks[3].z, lx: landmarks[3].x + 35, ly: -19, lz: landmarks[3].z - 15, title: 'Моренный риф и нарвалы', duration: 9 },
    { x: landmarks[4].x, y: -62.0, z: landmarks[4].z, lx: landmarks[4].x + 70, ly: -78, lz: landmarks[4].z + 20, title: 'Полярная бездна Баффина', duration: 9 }
  ];

  const tourLegs = _tourRaw.map((leg) => ({
    pos: [leg.x, Math.min(-3.0, safeSpotY(leg.x, leg.z, leg.y, 4.0)), leg.z],
    look: [leg.lx, leg.ly, leg.lz],
    title: leg.title,
    duration: leg.duration
  }));

  const ENCYCLOPEDIA = {
    floor: ['Ледниково-моренный грунт Арктики', 'Залив Баффина', 'Геология', 'Все зоны', '5 – 142 м',
      'Окатанные древними ледниками гнейсовые валуны и галька, местами покрытые розовой известковой корочкой водорослей Lithothamnion.'],
    ice_floe: ['Паковый морской лёд', 'Glacies marina', 'Геология', 'Паковый лёд', '0 – 6 м',
      'Многолетние ледяные поля с заснеженной поверхностью и резными голубыми подводными килями, под которыми укрываются косяки сайки.'],
    iceberg: ['Гренландский айсберг', 'Moles glacialis', 'Геология', 'Аллея айсбергов', '+16 .. -28 м',
      'Отколовшийся пресноводный гигант возрастом в тысячи лет: около 85% массы ледяной горы скрыто под водой сапфировым килем.'],
    brinicle: ['Брайникл («палец смерти»)', 'Stalactites salis', 'Геология', 'Паковый лёд', '2 – 28 м',
      'Хрупкая ледяная трубка, растущая вниз при стекании сверхсолёного переохлаждённого рассола из молодого морского льда к дну.'],
    kelp_arctic: ['Сахарная арктическая ламинария', 'Saccharina latissima', 'Флора', 'Арктический риф', '4 – 30 м',
      'Холодолюбивая бурая водоросль с длинными волнистыми лентами, выживающая при полярной ночи благодаря запасам маннита и ламинарина.'],
    coral_arctic_soft: ['Морская клубника (коралл)', 'Gersemia rubiformis', 'Кораллы', 'Арктический риф', '10 – 65 м',
      'Пушистый холодноводный мягкий коралл малинового цвета, фильтрующий полярный планктон в тёмных ледяных водах без солнечных симбионтов.'],
    anemone_arctic: ['Северная пёстрая актиния', 'Urticina felina', 'Беспозвоночные', 'Арктический риф', '2 – 55 м',
      'Крупная багрово-оранжевая арктическая актиния, цепляющаяся за валуны в холодных течениях и ловящая донных беспозвоночных.'],
    urchin_purple: ['Зелёный полярный морской ёж', 'Strongylocentrotus droebachiensis', 'Беспозвоночные', 'Арктический риф', '0 – 45 м',
      'Холодноводный арктический морской ёж, пасущийся на кораллиновых корках и нижнем ярусе бурых водорослей.'],
    fish_arctic_cod: ['Сайка (полярная треска)', 'Boreogadus saida', 'Рыбы', 'Паковый лёд', '0 – 85 м',
      'Ключевой вид пищевой цепи Арктики: плавает прямо в ледовых кавернах, защищаясь от мороза белками-антифризами в крови.'],
    fish_sculpin: ['Арктический керчак (бычок)', 'Myoxocephalus scorpius', 'Рыбы', 'Арктический риф', '4 – 50 м',
      'Колючая донная полярная рыба с маскировочным окрасом и широкими грудными плавниками для опоры на холодные валуны.'],
    fish_lantern: ['Полярный бентозема-фонарик', 'Benthosema glaciale', 'Рыбы', 'Полярный жёлоб', '40 – 142 м',
      'Мезопелагическая светящаяся рыба холодных вод Баффинова залива, зажигающая ряды голубых фотофоров в глубинной тьме.'],
    beluga: ['Белуха (полярный кит)', 'Delphinapterus leucas', 'Мегафауна', 'Аллея айсбергов', '0 – 60 м',
      'Белоснежный безспинноплавниковый кит, прозванный «морской канарейкой» за богатый репертуар свистов, трелей и эхолокации подо льдом.'],
    narwhal: ['Нарвал («морской единорог»)', 'Monodon monoceros', 'Мегафауна', 'Аллея айсбергов', '2 – 120 м',
      'Арктический кит, чьи самцы несут 2.5-метровый спиральный чувствительный бивень — видоизменённый левый верхний клык.'],
    shark_greenland: ['Гренландская полярная акула', 'Somniosus microcephalus', 'Мегафауна', 'Полярный жёлоб', '35 – 142 м',
      'Долгожительница среди позвоночных (живёт 300–400 лет!): медлительный гигант ледяной бездны, двигающийся плавно ради экономии энергии при -1.8 °C.'],
    jelly_arctic: ['Волосистая цианея («львиная грива»)', 'Cyanea capillata', 'Беспозвоночные', 'Аллея айсбергов', '1 – 80 м',
      'Крупнейшая медуза холодных морей с золотисто-рубиновым куполом и десятками нитевидных жгучих щупалец.'],
    clione_angel: ['Арктический морской ангел', 'Clione limacina', 'Беспозвоночные', 'Полярный жёлоб', '5 – 120 м',
      'Полупрозрачный крылоногий моллюск с ярко-оранжевым «сердечком», порхающий в ледяной воде подобно сказочной бабочке.']
  };

  const FAUNA_PLAN = {
    cleaningStations: [],
    schools: [
      { key: 'fish_arctic_cod', n: 75, cx: spawnX + 30, cz: spawnZ - 15, radius: 34, yDepth: -6.5, yAmp: 3, spread: 9, speed: 5.8, scale: 0.56, diel: 'cathemeral', shyness: 0.72,
        geoOpts: { len: 1.05, height: 0.34, width: 0.16, colA: 0x455c72, colB: 0xd6e6f2, finCol: 0x8ea6ba } },
      { key: 'fish_arctic_cod', n: 65, cx: landmarks[1].x - 20, cz: landmarks[1].z + 30, radius: 38, yDepth: -11, yAmp: 4, spread: 10, speed: 6.0, scale: 0.58, diel: 'cathemeral', shyness: 0.72,
        geoOpts: { len: 1.05, height: 0.34, width: 0.16, colA: 0x455c72, colB: 0xd6e6f2, finCol: 0x8ea6ba } },
      { key: 'fish_sculpin', n: 26, cx: landmarks[3].x, cz: landmarks[3].z, radius: 26, yDepth: -20, yAmp: 2, spread: 8, speed: 3.4, scale: 0.72, diel: 'cathemeral', shyness: 0.4,
        geoOpts: { len: 1.0, height: 0.44, width: 0.28, colA: 0x4d4338, colB: 0x9c8266, finCol: 0x73624d, stripes: 0.45 } },
      { key: 'fish_lantern', n: 54, cx: landmarks[4].x, cz: landmarks[4].z, radius: 44, yDepth: -58, yAmp: 12, spread: 12, speed: 6.2, scale: 0.48, diel: 'cathemeral', biolum: true, shyness: 0.5,
        geoOpts: { len: 0.85, height: 0.32, width: 0.14, colA: 0x163858, colB: 0x5ceeff, finCol: 0x3ad9ee, eyeScale: 1.4 } }
    ],
    belugas: [
      { cx: landmarks[1].x + 25, cz: landmarks[1].z - 15, r: 52, y: -9.5, speed: 4.8, scale: 1.05 },
      { cx: spawnX + 45, cz: spawnZ + 55, r: 46, y: -8.0, speed: 4.5, scale: 0.92 }
    ],
    narwhals: [
      { cx: landmarks[1].x - 30, cz: landmarks[1].z + 40, r: 58, y: -15.5, speed: 4.7, scale: 1.04 },
      { cx: landmarks[3].x + 35, cz: landmarks[3].z - 25, r: 62, y: -21.0, speed: 4.9, scale: 1.0 }
    ],
    sharks: [
      { speciesKey: 'shark_greenland', cx: landmarks[4].x, cz: landmarks[4].z, r: 72, y: -64, speed: 2.6 },
      { speciesKey: 'shark_greenland', cx: 340, cz: 190, r: 64, y: -48, speed: 2.4 }
    ],
    arcticJellies: [
      { cx: landmarks[1].x - 15, cz: landmarks[1].z - 28, y: -12, amp: 2.4, scale: 1.25 },
      { cx: landmarks[2].x + 20, cz: landmarks[2].z - 15, y: -11, amp: 2.0, scale: 1.15 },
      { cx: landmarks[4].x - 40, cz: landmarks[4].z + 35, y: -42, amp: 3.2, scale: 1.4 }
    ],
    cliones: [
      { cx: landmarks[0].x + 18, cz: landmarks[0].z - 12, y: -9.5, n: 10 },
      { cx: landmarks[4].x - 25, cz: landmarks[4].z - 20, y: -52.0, n: 12 }
    ]
  };

  OC.Biomes.register({
    id: 'arctic_sea',
    name: 'Арктика: Подо льдом',
    region: 'Залив Баффина · 74° с.ш.',
    subtitle: 'Полярное море · 2.4 × 2.4 км · 0–142 м',
    worldRadius: 1200,
    chunkSize: 150,
    seaLevel: 0,
    hasAurora: true,
    minimapTheme: 'arctic',
    spawn: {
      pos: [spawnX, spawnY, spawnZ],
      yaw: 2.35,
      pitch: 0.04
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
