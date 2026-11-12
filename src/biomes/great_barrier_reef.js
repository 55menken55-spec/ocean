/* ================= БИОМ: БОЛЬШОЙ БАРЬЕРНЫЙ РИФ (2.4 × 2.4 КМ) ================= */
/* Регистрация биома. Числовая геометрия и оптика — biomes/great_barrier_reef/base.js,
   флора — flora.js, энциклопедия — encyclopedia.js, тур — tour.js, фауна — fauna_plan.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const {
    WORLD_RADIUS, CHUNK_SIZE, shelfOffset, passCenterZ,
    BLUE_HOLE_X, BLUE_HOLE_Z, CAY_X, CAY_Z, BOMMIES, safeSpotY,
    ZONES, getHeight, getZoneAt, getTerrainColor,
    getOpticalProfile, getCurrentAt
  } = OC._GbrBase;
  const { generateChunkFlora } = OC._GbrFlora;
  const { ENCYCLOPEDIA } = OC._GbrEncyclopedia;
  const { TOUR_LEGS } = OC._GbrTour;
  const { FAUNA_PLAN } = OC._GbrFaunaPlan;

  /* ---- Знаковые ориентиры (Landmarks) ---- */
  const _lmRaw = [
    {
      id: 'mangroves',
      name: 'Мангровые отмели',
      zoneId: 'mangroves',
      x: -775 + shelfOffset(-120),
      y: -1.6,
      z: -120,
      yaw: 1.48,
      pitch: -0.05,
      clearance: 2.2,
      description: 'Западная береговая кромка с корнями красных мангров в тёплом изумрудном мелководье.'
    },
    {
      id: 'seagrass',
      name: 'Луга морской травы',
      zoneId: 'seagrass',
      x: -555 + shelfOffset(90),
      y: -4.5,
      z: 90,
      yaw: 0.75,
      pitch: -0.14,
      clearance: 3.2,
      description: 'Ковры морской травы Halophila и Zostera — место кормления дюгоней и морских черепах.'
    },
    {
      id: 'sand_cay',
      name: 'Коралловый островок',
      zoneId: 'lagoon',
      x: CAY_X + 74,
      y: 2.2,
      z: CAY_Z + 56,
      yaw: 2.32,
      pitch: -0.08,
      clearance: 3.5,
      description: 'Солнечный песчаный островок (Sand Cay) посреди лазурной лагуны Большого Барьерного рифа.'
    },
    {
      id: 'bommies',
      name: 'Коралловые бомми',
      zoneId: 'lagoon',
      x: (BOMMIES[0] ? BOMMIES[0].x : -140) + 32,
      y: -8.0,
      z: (BOMMIES[0] ? BOMMIES[0].z : 60) + 26,
      yaw: 2.28,
      pitch: -0.06,
      clearance: 3.5,
      description: 'Гигантские известняковые башни-бомми из колоний Porites, окружённые стаями рифовых рыб.'
    },
    {
      id: 'crest',
      name: 'Гребень и желоба',
      zoneId: 'crest',
      x: 155 + shelfOffset(20),
      y: -6.5,
      z: 20,
      yaw: -1.35,
      pitch: -0.18,
      clearance: 4.5,
      description: 'Живой гребень барьера с параллельными коралловыми контрфорсами и песчаными желобами прибоя.'
    },
    {
      id: 'pass',
      name: 'Рифовый проход',
      zoneId: 'slope_hole',
      x: 340 + shelfOffset(250),
      y: -17.5,
      z: passCenterZ(340 + shelfOffset(250)),
      yaw: -1.55,
      pitch: -0.08,
      clearance: 5.0,
      description: 'Глубокий приливный канал через рифовый щит: здесь кружат стаи барракуд и парят пятнистые орляки.'
    },
    {
      id: 'blue_hole',
      name: 'Голубая дыра',
      zoneId: 'slope_hole',
      x: BLUE_HOLE_X + 28,
      y: -22.0,
      z: BLUE_HOLE_Z + 24,
      yaw: 2.35,
      pitch: -0.45,
      clearance: 6.0,
      description: 'Затопленный карстовый провал диаметром ~110 м, уходящий отвесными уступами на глубину 88 метров.'
    },
    {
      id: 'dropoff',
      name: 'Стена в бездну',
      zoneId: 'dropoff',
      x: 645 + shelfOffset(-60),
      y: -34.0,
      z: -60,
      yaw: 1.55,
      pitch: -0.12,
      clearance: 8.0,
      description: 'Внешняя стена Большого Барьерного рифа — вертикальный обрыв в глубины Кораллового моря.'
    }
  ];

  const LANDMARKS = _lmRaw.map((lm) => Object.assign({}, lm, {
    y: safeSpotY(lm.x, lm.z, lm.y, lm.clearance)
  }));

  const SPAWN_X = -45 + shelfOffset(35);
  const SPAWN_Z = 35;
  const SPAWN_Y = safeSpotY(SPAWN_X, SPAWN_Z, -7.2, 5.5);

  OC.Biomes.register({
    id: 'great_barrier_reef',
    name: 'Большой Барьерный риф',
    region: 'Тихий океан · Коралловое море',
    subtitle: 'Реалистичная география шельфа от мангров до бездны · 2.4 × 2.4 км',
    globe: {
      lat: -16.8, lon: 146.2, coordLabel: '16.8° ю.ш., 146.2° в.д.',
      ocean: 'Коралловое море · Австралия', depthSpan: '0 – 168 м', tempSpan: '21 – 29 °C', color: '#45e0d4',
      country: 'Австралия (Квинсленд)', waterType: 'sea', protectionStatus: 'Всемирное наследие UNESCO',
      notableFor: 'крупнейшая живая структура Земли, коралловые рифы, Голубая дыра',
      summary: 'Крупнейшая живая структура Земли: мангры, песчаный островок, 88-метровая Голубая дыра и миграции горбатых китов.'
    },
    worldRadius: WORLD_RADIUS,
    chunkSize: CHUNK_SIZE,
    seaLevel: 0,
    spawn: {
      pos: [SPAWN_X, SPAWN_Y, SPAWN_Z],
      yaw: 2.25,
      pitch: -0.14
    },
    zones: ZONES,
    landmarks: LANDMARKS,
    tourLegs: TOUR_LEGS,
    bommies: BOMMIES,
    blueHole: { x: BLUE_HOLE_X, z: BLUE_HOLE_Z, depth: -88, radius: 52 },
    sandCay: { x: CAY_X, z: CAY_Z },
    shelfOffset,
    passCenterZ,
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
