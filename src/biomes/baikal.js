/* ================= БИОМ 11: ОЗЕРО БАЙКАЛ — РИФТОВАЯ ПРЕСНОВОДНАЯ БЕЗДНА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const _a = new T.Color();
  const _b = new T.Color();
  const _c = new T.Color();
  const _fog = new T.Color();
  const _water = new T.Color();
  const _skyTop = new T.Color();
  const _skyBot = new T.Color();
  const _horizon = new T.Color();

  const ZONES = [
    { id: 'baikal_littoral', name: 'Мелководья и бухта Академическая', shortName: 'Прибрежье', color: '#7fd9cf', depthLabel: '0 – 25 м', tempC: 9.5,
      description: 'Прозрачное прибрежье с зарослями харовых водорослей, валунами и зарождающимися колониями байкальских губок.' },
    { id: 'baikal_sponge_reef', name: 'Подводные губочные рифы', shortName: 'Губочные рифы', color: '#56b8a9', depthLabel: '8 – 120 м', tempC: 4.2,
      description: 'Древовидные пресноводные губки Lubomirskia baicalensis фильтруют холодную воду на скальных уступах.' },
    { id: 'baikal_shelf', name: 'Ступени Большого Байкальского рифта', shortName: 'Рифтовый склон', color: '#4789b5', depthLabel: '120 – 700 м', tempC: 3.5,
      description: 'Крутые уступы разлома, обвальные осыпи и глубокие каньоны, ведущие к центральной котловине.' },
    { id: 'baikal_abyss', name: 'Центральная котловина', shortName: 'Байкальская бездна', color: '#304b84', depthLabel: '700 – 1 642 м', tempC: 3.4,
      description: 'Тектоническая впадина глубиной более полутора километров с холодной прозрачной водой, голомянкой и глубоководными бокоплавами.' },
    { id: 'baikal_seep', name: 'Метановые сипы и грязевые вулканы', shortName: 'Метановые сипы', color: '#82c7dc', depthLabel: '850 – 1 450 м', tempC: 3.6,
      description: 'Пузырьковые выходы газа отмечают активные разломы и поддерживают локальные сообщества микроорганизмов.' }
  ];

  function riftAxisX(z) { return Math.sin(z * 0.0027 + 0.4) * 38 + Math.sin(z * 0.006) * 12; }
  function getRiftDistance(x, z) { return Math.abs(x - riftAxisX(z)); }

  function getHeight(x, z) {
    const d = getRiftDistance(x, z);
    const basin = 790 + 850 * Math.exp(-Math.pow((z - 80) / 480, 2));
    const riftMask = 1 - OC.smoothstep(68, 610, d);
    let h = -2.5 - (basin - 2.5) * riftMask;
    const ridges = OC.fbm2(x * 0.006, z * 0.006, 4) * 26 + OC.ridged2(x * 0.017, z * 0.017, 3) * 10;
    const shelf = OC.smoothstep(600, 390, d);
    h += ridges * shelf;

    // Береговые террасы, моренные гряды и обвальные конусы у склона рифта.
    const shelfNoise = OC.fbm2(x * 0.012, z * 0.012, 3) * 7;
    if (d > 450) h += OC.smoothstep(450, 720, d) * (1.8 + shelfNoise);
    const canyonX = riftAxisX(z) - 155 + Math.sin(z * 0.012) * 28;
    const canyonD = Math.abs(x - canyonX);
    if (canyonD < 95 && d > 170) h -= (1 - OC.smoothstep(12, 95, canyonD)) * 95;

    // Пологое мелководье залива у северо-западной экспедиционной стоянки.
    const bayD = Math.hypot(x + 520, z + 420);
    if (bayD < 190) h = OC.lerp(h, -5.5 + OC.fbm2(x * 0.025, z * 0.025, 2) * 1.3, OC.smoothstep(215, 105, bayD));
    return OC.clamp(h, -1642, 3.2);
  }

  function safeY(x, z, wantedY, clearance) {
    return Math.max(wantedY, getHeight(x, z) + (clearance || 3));
  }

  function getZoneAt(x, y, z) {
    const d = getRiftDistance(x, z);
    const depth = Math.max(0, -y);
    if (depth > 820 && (Math.hypot(x - 130, z - 170) < 125 || Math.hypot(x + 110, z - 280) < 95)) return ZONES[4];
    if (depth < 24 && d > 450) return ZONES[0];
    if (depth < 145 && d > 320) return ZONES[1];
    if (depth > 700) return ZONES[3];
    return ZONES[2];
  }

  function getTemperatureAt(x, depthM, zone) {
    const depth = Math.max(0, depthM);
    const nearSurface = 9.8 * (1 - OC.smoothstep(16, 95, depth));
    const seasonal = Math.sin(x * 0.001) * 0.35;
    return OC.clamp(3.35 + nearSurface + seasonal, 3.2, 12.2);
  }

  function getCurrentAt(x, y, z, time, out) {
    const d = getRiftDistance(x, z);
    const along = 0.12 + 0.28 * (1 - OC.smoothstep(80, 580, d));
    const eddy = Math.sin(z * 0.008 + x * 0.003) * 0.12;
    return out.set(along + eddy, Math.sin(time * 0.13 + z * 0.02) * 0.018, Math.cos(x * 0.009 - z * 0.004) * 0.17);
  }

  function getTerrainColor(x, y, z, out) {
    const d = getRiftDistance(x, z);
    const depth = OC.clamp(-y / 1642, 0, 1);
    _a.setHex(0x52685b); // glacial moraine and rocky shallows
    _b.setHex(0x827b68); // sedimented shelf
    _c.setHex(0x252e40); // dark rift basalt
    out.copy(_a).lerp(_b, OC.smoothstep(90, 580, d) * 0.66).lerp(_c, depth * 0.8);
    out.offsetHSL(0.015, 0.08, (OC.noise2(x * 0.045, z * 0.045) - 0.5) * 0.11);
    return out;
  }

  function getOpticalProfile(x, y, z, dayW) {
    const day = OC.clamp(dayW, 0, 1);
    const depth = Math.max(0, -y);
    const d = OC.clamp(depth / 1642, 0, 1);
    if (y > 0.15) {
      _skyTop.setHex(0x4f9db7).lerp(new T.Color(0x0b1a2b), 1 - day);
      _skyBot.setHex(0xc6e5e8).lerp(new T.Color(0x162c43), 1 - day);
      _horizon.setHex(0xb4d4d5).lerp(new T.Color(0x10253b), 1 - day);
      _water.setHex(0x78c8cf);
      return { aboveWater: true, fogColor: _horizon, fogDensity: 0.0011, waterColor: _water, skyTop: _skyTop, skyBot: _skyBot,
        causticStrength: 0, rayStrength: 0, sunAtten: 1, bioGlow: 0 };
    }
    _fog.setHex(0x398b9f).lerp(new T.Color(0x07152e), OC.clamp(d * 1.25, 0, 1));
    _fog.multiplyScalar(0.22 + day * 0.78);
    _water.setHex(0x2e90a8).lerp(new T.Color(0x101d43), d * 0.86);
    const clarity = Math.exp(-depth * 0.0042);
    return { aboveWater: false, fogColor: _fog, fogDensity: 0.0012 + d * 0.0045, waterColor: _water,
      causticStrength: OC.clamp(day * clarity * 0.82, 0, 0.82), rayStrength: OC.clamp(day * clarity * 0.72, 0, 0.72),
      sunAtten: OC.clamp(clarity * day, 0.025, 1), bioGlow: OC.clamp((1 - day) * 0.38 + d * 0.24, 0, 0.62) };
  }

  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const items = [];
    const x0 = cx * chunkSize, z0 = cz * chunkSize;
    const add = (species, x, y, z, scale, tint) => items.push({ species, x, y, z, ry: rng() * Math.PI * 2, scale, tint });
    for (let i = 0, n = Math.round(13 * density); i < n; i++) {
      const x = x0 + rng() * chunkSize, z = z0 + rng() * chunkSize;
      const h = getHeight(x, z), d = getRiftDistance(x, z), depth = -h;
      if (depth > 5 && depth < 165 && d > 250 && d < 655) {
        add('baikal_sponge', x, h - 0.12, z, OC.lerp(0.68, 1.55, rng()), rng() < 0.5 ? 0xb8c5a4 : 0x718e8a);
      } else if (depth > 0.6 && depth < 18 && d > 475) {
        add('charophyte_bed', x, h - 0.08, z, OC.lerp(0.72, 1.45, rng()), 0x9ebd72);
      }
    }
    return items;
  }

  const spawn = { pos: [-620, safeY(-620, -420, -2.5, 2.5), -420], yaw: 0.25, pitch: 0.02 };
  const landmarks = [
    { id: 'baikal_academy_bay', name: 'Бухта Академическая', zoneId: 'baikal_littoral', x: -520, y: safeY(-520, -420, -2.5, 3), z: -420, yaw: 0.3, pitch: 0.02,
      description: 'Светлое прибрежье Байкала: гладкие гранитные валуны, харовые луга и первые пресноводные губки на камнях.' },
    { id: 'baikal_sponge_garden', name: 'Сады байкальских губок', zoneId: 'baikal_sponge_reef', x: -560, y: safeY(-560, -180, -45, 4), z: -180, yaw: 0.55, pitch: -0.12,
      description: 'Зелёные древовидные колонии Lubomirskia baicalensis фильтруют чистую холодную воду над каменистой террасой.' },
    { id: 'baikal_olkhon_gate', name: 'Ольхонские ворота', zoneId: 'baikal_shelf', x: -330, y: safeY(-330, 60, -480, 18), z: 60, yaw: 1.1, pitch: -0.18,
      description: 'Сужение между скальными стенами и осыпями, где склон обрывается в центральный рифт.' },
    { id: 'baikal_fault_canyon', name: 'Каньон Большого Байкальского разлома', zoneId: 'baikal_shelf', x: -370, y: safeY(-370, 300, -760, 22), z: 300, yaw: 0.85, pitch: -0.3,
      description: 'Ступенчатый сброс с обвальными конусами и холодной пелагической водой, уходящей в темноту.' },
    { id: 'baikal_golomyanka_depth', name: 'Центральная котловина', zoneId: 'baikal_abyss', x: 0, y: -1120, z: 80, yaw: 0.2, pitch: -0.28,
      description: 'Открытая глубоководная толща над дном Байкала: здесь держатся пелагическая голомянка и прозрачные рачки-бокоплавы.' },
    { id: 'baikal_methane_seep', name: 'Метановые сипы Посольской банки', zoneId: 'baikal_seep', x: 130, y: -840, z: 170, yaw: -0.5, pitch: -0.15,
      description: 'Тихие струи газа поднимаются из осадков вдоль активного разлома, отмечая молодую тектоническую впадину.' }
  ];
  const tourLegs = landmarks.map((lm, i) => ({
    pos: [lm.x, lm.y, lm.z], look: [lm.x + (i % 2 ? -24 : 24), lm.y - 12, lm.z + 18], duration: 8,
    title: lm.name,
    fact: [
      'Байкал содержит около пятой части мировых запасов незамёрзшей поверхностной пресной воды и остаётся самым глубоким озером планеты.',
      'Байкальские губки — эндемики озера; их разветвлённые колонии живут в прозрачной холодной воде и фильтруют взвесь.',
      'Ольхонские ворота лежат среди активной рифтовой системы, где земная кора растягивается и формирует озёрную котловину.',
      'Склоны Байкальского рифта состоят из ступенчатых тектонических уступов и осыпей, а не из единого плавного конуса.',
      'Голомянка — живородящая полупрозрачная рыба, приспособленная к холодной воде и большому диапазону глубин.',
      'Газовые сипы под Байкалом связаны с геологически активными осадками и локальными сообществами микробов.'
    ][i]
  }));

  const ENCYCLOPEDIA = {
    floor: ['Ил и обломки Большого Байкальского рифта', 'Baikal Rift Sediment', 'Геология', 'Рифтовый склон', '0 – 1 642 м',
      'Ледниковые валуны, тонкий диатомовый ил и осыпи гранитно-гнейсовых склонов в тектонической котловине.' ],
    baikal_sponge: ['Байкальская губка', 'Lubomirskia baicalensis', 'Беспозвоночные', 'Губочные рифы', '5 – 160 м',
      'Эндемичная пресноводная губка, образующая зелёные ветвистые колонии на каменистых склонах и фильтрующая воду.' ],
    charophyte_bed: ['Харовые водоросли Байкала', 'Chara baicalensis', 'Флора', 'Прибрежье', '1 – 18 м',
      'Подводные луга холодноводных харовых водорослей на светлых прибрежных террасах.' ],
    fish_omul: ['Байкальский омуль', 'Coregonus migratorius', 'Рыбы', 'Прибрежье и котловина', '10 – 500 м',
      'Эндемичный сиг Байкала, совершающий сезонные кормовые перемещения между прибрежными и глубокими водами.' ],
    fish_golomyanka: ['Большая голомянка', 'Comephorus baikalensis', 'Рыбы', 'Центральная котловина', '50 – 1 200 м',
      'Полупрозрачная живородящая рыба с высоким содержанием жира, важная добыча байкальской нерпы.' ],
    fish_grayling: ['Байкальский хариус', 'Thymallus baicalensis', 'Рыбы', 'Прибрежье', '2 – 80 м',
      'Холодноводная рыба каменистых берегов и притоков с высоким спинным плавником.' ],
    seal_baikal: ['Байкальская нерпа', 'Pusa sibirica', 'Млекопитающие', 'Бухты и центральная котловина', '0 – 500 м',
      'Единственный пресноводный тюлень, полностью живущий во внутренних водах; охотится преимущественно на голомянку и бычков.' ],
    methane_seep_baikal: ['Метановый сип', 'Baikal gas seep', 'Геология', 'Метановые сипы', '850 – 1 450 м',
      'Пузырьковый выход газа из донных осадков вдоль активных разломов Байкальского рифта.' ],
    research_vessel: ['НИС «Академик Коптюг»', 'R/V Akademik Koptyug', 'Экспедиция', 'Бухта Академическая', '+18 .. -3 м',
      'Байкальское научно-исследовательское судно для лимнологических наблюдений, отбора проб и картирования рифтового дна.' ]
  };

  const FAUNA_PLAN = {
    cleaningStations: [],
    schools: [
      { key: 'fish_omul', n: 54, cx: -470, cz: -345, radius: 34, yDepth: -12, yAmp: 8, spread: 12, speed: 5.2, scale: 0.72, diel: 'cathemeral', shyness: 0.58,
        geoOpts: { len: 1.4, height: 0.55, width: 0.24, colA: 0x718b8b, colB: 0xc2d9cf, finCol: 0x506a70, stripes: 0.2 } },
      { key: 'fish_omul', n: 42, cx: -360, cz: -90, radius: 42, yDepth: -65, yAmp: 18, spread: 14, speed: 6.1, scale: 0.76, diel: 'cathemeral', shyness: 0.62,
        geoOpts: { len: 1.4, height: 0.55, width: 0.24, colA: 0x718b8b, colB: 0xc2d9cf, finCol: 0x506a70, stripes: 0.2 } },
      { key: 'fish_golomyanka', n: 62, cx: -70, cz: 70, radius: 54, yDepth: -420, yAmp: 170, dvmAmp: 105, spread: 18, speed: 4.5, scale: 0.54, diel: 'nocturnal', shyness: 0.42,
        geoOpts: { len: 1.15, height: 0.48, width: 0.18, colA: 0x8db6c5, colB: 0xe2f0ef, finCol: 0x7cabbc } },
      { key: 'fish_grayling', n: 30, cx: -500, cz: -560, radius: 30, yDepth: -6, yAmp: 2.4, spread: 8, speed: 4.4, scale: 0.65, diel: 'diurnal', shyness: 0.38,
        geoOpts: { len: 1.15, height: 0.5, width: 0.22, colA: 0x546b74, colB: 0xb7c5b3, finCol: 0x667d88, stripes: 0.18 } }
    ],
    baikalSeals: [
      { cx: -455, cz: -290, r: 52, y: -12, scale: 1.0 },
      { cx: -40, cz: 80, r: 82, y: -360, scale: 1.18 }
    ],
    seepTargets: [{ x: 130, z: 170 }, { x: -110, z: 280 }, { x: 235, z: -310 }],
    vessels: [{ x: -615, z: -408, yaw: 0.25, variant: 'expedition', name: 'НИС «Академик Коптюг»' }]
  };

  OC.Biomes.register({
    id: 'baikal', name: 'Озеро Байкал: Большой рифт', region: 'Южная Сибирь · Россия',
    subtitle: 'Пресноводная рифтовая бездна · 0 – 1 642 м', worldRadius: 1200, chunkSize: 150,
    noSurface: false, seaLevel: 0, depthOffset: 0, minimapTheme: 'baikal',
    globe: { lat: 53.5, lon: 108.0, coordLabel: '53.5° с.ш., 108.0° в.д.', ocean: 'Озеро Байкал · Восточная Сибирь', depthSpan: '0 – 1 642 м', tempSpan: '3.2 – 12.2 °C', color: '#56c7d4',
      summary: 'Прозрачная пресная вода, подводные губочные рифы, эндемичные омуль и голомянка, байкальская нерпа и ступенчатые склоны активного рифта.' },
    spawn, zones: ZONES, landmarks, tourLegs, faunaPlan: FAUNA_PLAN, encyclopedia: ENCYCLOPEDIA,
    getHeight, getZoneAt, getTemperatureAt, getCurrentAt, getTerrainColor, getOpticalProfile, generateChunkFlora
  });
})(window.OC);
