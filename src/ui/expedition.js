/* ================= ЭКСПЕДИЦИЯ: ФОТОКАМЕРА, НАУЧНЫЕ МИССИИ, МАЯЧКИ И СОХРАНЕНИЕ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const STORAGE_KEY = 'oc_ocean_expedition_v1';

  function loadStore() {
    const empty = { discovered: {}, missionsDone: {}, photos: [], samples: [], waypoints: {}, fogMaps: {}, quality: null };
    try {
      if (typeof localStorage === 'undefined') return empty;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return empty;
      const parsed = JSON.parse(raw);
      return Object.assign(empty, parsed || {});
    } catch (e) {
      return empty;
    }
  }

  let store = loadStore();

  function saveStore() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      // Если превышена квота из-за снимков — сжимаем галерею и сохраняем прогресс Атласа/миссий
      try {
        if (store.photos.length > 2) store.photos = store.photos.slice(0, 2);
        else store.photos.forEach((p) => { p.dataUrl = ''; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      } catch (e2) { /* noop */ }
    }
  }

  /* ---- Научные миссии по 3 биомам Земли ---- */
  const MISSIONS = [
    // 1. Большой Барьерный риф
    {
      id: 'gbr_atlas_6',
      biomeId: 'great_barrier_reef',
      title: 'Хранитель Большого рифа',
      desc: 'Изучите или сфотографируйте 6 разных видов флоры и фауны рифа.',
      landmarkId: 'crest',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'gbr_pass_current',
      biomeId: 'great_barrier_reef',
      title: 'Стремнина Прохода',
      desc: 'Заплывите в Рифовый проход и зафиксируйте приливное течение быстрее 1.5 узлов.',
      landmarkId: 'pass',
      goal: 1,
      progress: (ctx) => (ctx.zoneId === 'slope_hole' && ctx.currentKnots >= 1.5) ? 1 : 0
    },
    {
      id: 'gbr_night_bio',
      biomeId: 'great_barrier_reef',
      title: 'Ночные огни стены',
      desc: 'Ночью или с прожектором (F) на глубине > 35 м снимите или отсканируйте сонаром (G) фонариков или манту.',
      landmarkId: 'dropoff',
      goal: 1,
      progress: (ctx) => (ctx.hasPhotoOrPing(['fish_lantern', 'manta']) && (ctx.dayW < 0.45 || (ctx.flashOn && ctx.depthM > 35))) ? 1 : 0
    },
    {
      id: 'gbr_whale_photo',
      biomeId: 'great_barrier_reef',
      title: 'Портрет океанского гиганта',
      desc: 'Сфотографируйте на подводную камеру (P) горбатого кита или китовую акулу у внешней стены.',
      landmarkId: 'dropoff',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['whale_humpback', 'shark_whale']) ? 1 : 0
    },

    // 2. Лес гигантской ламинарии (Монтерей)
    {
      id: 'kelp_flora_5',
      biomeId: 'kelp_forest',
      title: 'Ботаник залива Монтерей',
      desc: 'Изучите 5 видов калифорнийского шельфа, включая гигантскую ламинарию Macrocystis.',
      landmarkId: 'kelp_heart',
      goal: 5,
      progress: (ctx) => (ctx.hasDiscovered('kelp_giant') ? Math.min(5, ctx.discoveredCount) : Math.min(4, ctx.discoveredCount))
    },
    {
      id: 'kelp_predator_photo',
      biomeId: 'kelp_forest',
      title: 'Охотники среди крон',
      desc: 'Сфотографируйте на камеру (P) калифорнийского морского льва или леопардовую акулу.',
      landmarkId: 'sea_stacks',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['sea_lion', 'shark_leopard']) ? 1 : 0
    },
    {
      id: 'kelp_school_photo',
      biomeId: 'kelp_forest',
      title: 'Серебряный вихрь',
      desc: 'Сделайте снимок косяка северных анчоусов или огненно-оранжевых гарибальди.',
      landmarkId: 'baitball_edge',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['fish_anchovy', 'fish_garibaldi']) ? 1 : 0
    },
    {
      id: 'kelp_canyon_sonar',
      biomeId: 'kelp_forest',
      title: 'Кромка апвеллинга',
      desc: 'Погрузитесь в каньон Монтерей глубже 38 м и выполните активный импульс сонара (G).',
      landmarkId: 'canyon_abyss',
      goal: 1,
      progress: (ctx) => (ctx.depthM >= 38 && ctx.sonarPings > 0) ? 1 : 0
    },

    // 3. Абиссальные чёрные курильщики
    {
      id: 'abyss_deep_sonar',
      biomeId: 'hydrothermal_vents',
      title: 'Предел батискафа',
      desc: 'Опуститесь на глубину 2480+ м (~246 атм) в жёлоб бездны и проведите сканирование сонаром (G).',
      landmarkId: 'deep_trench',
      goal: 1,
      progress: (ctx) => (ctx.depthM >= 2480 && ctx.sonarPings > 0) ? 1 : 0
    },
    {
      id: 'abyss_vent_photo',
      biomeId: 'hydrothermal_vents',
      title: 'Дыхание земной коры',
      desc: 'Сфотографируйте (P) сульфидный «чёрный курильщик» или алых червей Riftia pachyptila.',
      landmarkId: 'central_smoker',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['vent_chimney', 'riftia_worms']) ? 1 : 0
    },
    {
      id: 'abyss_hunter_photo',
      biomeId: 'hydrothermal_vents',
      title: 'Обитатели вечной ночи',
      desc: 'Поймайте в объектив (P) глубоководного морского чёрта, кальмара или осьминога Дамбо.',
      landmarkId: 'deep_trench',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['fish_angler', 'squid_abyssal', 'octopus_dumbo']) ? 1 : 0
    },
    {
      id: 'abyss_atlas_5',
      biomeId: 'hydrothermal_vents',
      title: 'Жизнь без солнца',
      desc: 'Соберите в Атласе 5 разных открытий экосистемы гидротермального рифта.',
      landmarkId: 'riftia_oasis',
      goal: 5,
      progress: (ctx) => ctx.discoveredCount
    },

    // 4. Полярное море / Подо льдом Арктики
    {
      id: 'arc_atlas_6',
      biomeId: 'arctic_sea',
      title: 'Полярный натуралист',
      desc: 'Откройте или сфотографируйте 6 объектов Арктики (льдины, айсберг, фауна или бентос).',
      landmarkId: 'ice_cathedral',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'arc_narwhal_photo',
      biomeId: 'arctic_sea',
      title: 'Единорог полярных вод',
      desc: 'Сфотографируйте на подводную камеру (P) нарвала со спиральным бивнем или белуху.',
      landmarkId: 'iceberg_alley',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['narwhal', 'beluga']) ? 1 : 0
    },
    {
      id: 'arc_brinicle_photo',
      biomeId: 'arctic_sea',
      title: 'Ледяной палец смерти',
      desc: 'Найдите и сфотографируйте (P) брайникл подо льдом или гигантскую медузу цианею.',
      landmarkId: 'brinicle_garden',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['brinicle', 'jelly_arctic']) ? 1 : 0
    },
    {
      id: 'arc_trench_shark',
      biomeId: 'arctic_sea',
      title: 'Легенда ледяного жёлоба',
      desc: 'Погрузитесь глубже 55 м в Полярный жёлоб и снимите или отсканируйте сонаром (G) гренландскую акулу или морского ангела.',
      landmarkId: 'baffin_trench',
      goal: 1,
      progress: (ctx) => (ctx.depthM >= 55 && ctx.hasPhotoOrPing(['shark_greenland', 'clione_angel'])) ? 1 : 0
    },

    // 5. Атолл Палау и Затонувший корабль
    {
      id: 'wreck_atlas_6',
      biomeId: 'wreck_atoll',
      title: 'Археолог и рифолог Палау',
      desc: 'Изучите или сфотографируйте 6 разных объектов атолла (артефакты крушения, кораллы, саргасс и фауну).',
      landmarkId: 'sunken_ship',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'wreck_ship_photo',
      biomeId: 'wreck_atoll',
      title: 'Тайна «SS Maru»',
      desc: 'Сфотографируйте на камеру (P) затонувший 68-метровый корабль «SS Maru» или адмиралтейский якорь.',
      landmarkId: 'sunken_ship',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['shipwreck', 'wreck_anchor']) ? 1 : 0
    },
    {
      id: 'wreck_hammer_photo',
      biomeId: 'wreck_atoll',
      title: 'Хищник «Синего угла»',
      desc: 'Сфотографируйте (P) гигантскую акулу-молота или океаническую манту на течении внешнего обрыва.',
      landmarkId: 'blue_corner',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['shark_hammerhead', 'manta']) ? 1 : 0
    },
    {
      id: 'wreck_jelly_lagoon',
      biomeId: 'wreck_atoll',
      title: 'Танец золотых медуз',
      desc: 'Откройте в лагуне саргасса и снимите или просканируйте сонаром (G) золотую медузу Палау или платакса.',
      landmarkId: 'jellyfish_lagoon',
      goal: 1,
      progress: (ctx) => ctx.hasPhotoOrPing(['jelly_golden', 'fish_batfish', 'sargassum']) ? 1 : 0
    },

    // 6. Марианская впадина и Оазис китового падения (10 920 м)
    {
      id: 'mt_atlas_6',
      biomeId: 'mariana_trench',
      title: 'Пионер Бездны Челленджера',
      desc: 'Откройте 6 видов, губок или геологических объектов в Марианском жёлобе (10 920 м).',
      landmarkId: 'challenger_deep',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'mt_whale_fall',
      biomeId: 'mariana_trench',
      title: 'Хроника китового падения',
      desc: 'Сфотографируйте на камеру (P) скелет синего кита или червей-костоедов Osedax в оазисе дна.',
      landmarkId: 'whale_fall_oasis',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['whale_fall', 'osedax_plume']) ? 1 : 0
    },
    {
      id: 'mt_serpentinite_seep',
      biomeId: 'mariana_trench',
      title: 'Щелочные сипы Сирена',
      desc: 'Доплывите до серпентинитовых сипов Сирена и снимите или просканируйте сонаром (G) карбонатный шпиль.',
      landmarkId: 'sirena_seeps',
      goal: 1,
      progress: (ctx) => ctx.hasZone('serpentinite_seeps') && ctx.hasPhotoOrPing(['serpentinite_vent', 'hadal_sponge']) ? 1 : 0
    },
    {
      id: 'mt_challenger_snailfish',
      biomeId: 'mariana_trench',
      title: 'Глубочайшая рыба Земли',
      desc: 'Погрузитесь на 10 915+ м в Бездне Челленджера и зафиксируйте (P/G) морского слизня Pseudoliparis или морскую свинку.',
      landmarkId: 'hadal_escarpment',
      goal: 1,
      progress: (ctx) => (ctx.depthM >= 10915 && ctx.hasPhotoOrPing(['hadal_snailfish', 'sea_pig', 'amphipod'])) ? 1 : 0
    },

    // 7. Соляной бассейн Орка и Сумеречная пелагиаль (Мексиканский залив, 650 м)
    {
      id: 'bp_atlas_6',
      biomeId: 'brine_pool',
      title: 'Океанолог галоклина',
      desc: 'Откройте 6 видов, минералов или явлений соляных озёр и сумеречной пелагиали Мексиканского залива.',
      landmarkId: 'despair_basin',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'bp_brine_lake',
      biomeId: 'brine_pool',
      title: 'Зеркало «Бассейна Отчаяния»',
      desc: 'Сфотографируйте на камеру (P) или просканируйте сонаром (G) подводное соляное озеро или соляной шпиль галита.',
      landmarkId: 'despair_basin',
      goal: 1,
      progress: (ctx) => ctx.hasPhotoOrPing(['brine_pool_lake', 'halite_spire']) ? 1 : 0
    },
    {
      id: 'bp_hydrate_seep',
      biomeId: 'brine_pool',
      title: 'Берег мидий и «горящего льда»',
      desc: 'Посетите Мидиевые берега (mussel_shore) и зафиксируйте (P/G) газовые гидраты метана или вестиментифер Lamellibrachia.',
      landmarkId: 'mussel_hydrates',
      goal: 1,
      progress: (ctx) => ctx.hasZone('mussel_shore') && ctx.hasPhotoOrPing(['methane_hydrate', 'cold_tubeworm', 'vent_mussels']) ? 1 : 0
    },
    {
      id: 'bp_twilight_giant',
      biomeId: 'brine_pool',
      title: 'Легенды сумеречной зоны',
      desc: 'Сфотографируйте (P) гигантскую сифонофору, сельдяного короля, глубоководную химеру или мигрирующих миктофид.',
      landmarkId: 'twilight_column',
      goal: 1,
      progress: (ctx) => ctx.hasPhoto(['siphonophore', 'oarfish', 'chimaera', 'myctophid', 'hatchetfish']) ? 1 : 0
    },

    // 8. Подводные карстовые пещеры и сеноты Юкатана (Сак-Актун, 0–58 м)
    {
      id: 'cc_atlas_6',
      biomeId: 'cenote_caves',
      title: 'Спелеодайвер Юкатана',
      desc: 'Откройте 6 карстовых образований или стигобионтов системы Сак-Актун.',
      landmarkId: 'cenote_portal',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'cc_ariadne_stalactite',
      biomeId: 'cenote_caves',
      title: 'Нить Ариадны и свод сталактитов',
      desc: 'Войдите в Галерею сталактитов (stalactite_gallery) и снимите или просканируйте сонаром (G) сталактит, сталагмит или нить Ариадны.',
      landmarkId: 'stalactite_cathedral',
      goal: 1,
      progress: (ctx) => ctx.hasZone('stalactite_gallery') && ctx.hasPhotoOrPing(['stalactite', 'stalagmite', 'ariadne_line']) ? 1 : 0
    },
    {
      id: 'cc_angelita_halocline',
      biomeId: 'cenote_caves',
      title: 'Призрачная река Анхелиты',
      desc: 'Доплывите до облака галоклина и сероводорода (halocline_cloud) и снимите (P) галоклин или гребненосца Xibalbanus.',
      landmarkId: 'angelita_halocline',
      goal: 1,
      progress: (ctx) => ctx.hasZone('halocline_cloud') && ctx.hasPhotoOrPing(['halocline_layer', 'cave_remipede', 'cave_shrimp']) ? 1 : 0
    },
    {
      id: 'cc_el_pit_blind',
      biomeId: 'cenote_caves',
      title: 'Белая дама бездны Эль-Пит',
      desc: 'Погрузитесь в колодец Эль-Пит на 38+ м и сфотографируйте (P) слепую бротулу или слепую мексиканскую тетру.',
      landmarkId: 'el_pit_depth',
      goal: 1,
      progress: (ctx) => (ctx.depthM >= 38 && ctx.hasPhoto(['blind_brotula', 'blind_tetra', 'cave_remipede'])) ? 1 : 0
    },

    // 9. Галапагосский апвеллинг и Арка Дарвина (Восточная Пацифика, 0–132 м)
    {
      id: 'gal_atlas_6',
      biomeId: 'galapagos_upwelling',
      title: 'Дарвиновский натуралист',
      desc: 'Откройте 6 эндемиков, вулканических объектов или пелагических хищников Галапагосов в Атласе.',
      landmarkId: 'darwins_arch',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'gal_iguana_penguin',
      biomeId: 'galapagos_upwelling',
      title: 'Дракон и пингвин экватора',
      desc: 'Исследуйте Лавовую бухту (lava_shallows) и сфотографируйте (P) морскую игуану, галапагосского пингвина или фумаролу.',
      landmarkId: 'lava_cove',
      goal: 1,
      progress: (ctx) => ctx.hasZone('lava_shallows') && ctx.hasPhoto(['marine_iguana', 'galapagos_penguin', 'volcanic_fumarole']) ? 1 : 0
    },
    {
      id: 'gal_sunfish_mobula',
      biomeId: 'galapagos_upwelling',
      title: 'Гиганты течения Кромвеля',
      desc: 'Посетите Стену апвеллинга (upwelling_wall) и сфотографируйте (P) луну-рыбу Mola mola, ската мобула или китовую акулу.',
      landmarkId: 'sunfish_cleaning',
      goal: 1,
      progress: (ctx) => ctx.hasZone('upwelling_wall') && ctx.hasPhoto(['ocean_sunfish', 'mobula_ray', 'shark_whale']) ? 1 : 0
    },
    {
      id: 'gal_orca_arch',
      biomeId: 'galapagos_upwelling',
      title: 'Косатки и Арка Дарвина',
      desc: 'Отсканируйте сонаром (G) или снимите (P) косатку, галапагосскую акулу, акулу-молота или Арку Дарвина.',
      landmarkId: 'wolf_orca_shelf',
      goal: 1,
      progress: (ctx) => ctx.hasPhotoOrPing(['orca', 'galapagos_shark', 'shark_hammerhead', 'darwins_arch']) ? 1 : 0
    }
  ];

  const FILTERS = [
    { id: 'none', label: 'Естеств.', css: '' },
    { id: 'natgeo', label: 'NatGeo', css: 'contrast(1.14) saturate(1.24) brightness(1.03)' },
    { id: 'abyss', label: 'Абиссаль', css: 'contrast(1.25) saturate(0.72) hue-rotate(-8deg) brightness(0.92)' },
    { id: 'cousteau', label: 'Кусто 16мм', css: 'sepia(0.22) contrast(1.08) saturate(1.15) brightness(1.02)' },
    { id: 'biolum', label: 'Неон Био', css: 'contrast(1.18) saturate(1.48) hue-rotate(8deg) brightness(1.06)' }
  ];

  const sessionState = {
    photoMode: false,
    cinemaMode: false,
    filterId: 'none',
    zoomFov: 52,
    sonarPingsByBiome: {},
    pingKeysByBiome: {},
    visitedZonesByBiome: {},
    fullPngCache: {} // id -> full dataURL PNG в оперативной памяти текущей сессии
  };

  function getMissionDoneList(biomeId) {
    if (!store.missionsDone[biomeId]) store.missionsDone[biomeId] = [];
    return store.missionsDone[biomeId];
  }

  function scorePhoto(target, dayW, flashOn, depthM, biome) {
    let score = 64;
    if (target && target.hit && target.key !== 'floor') {
      score += 14;
      const distBonus = target.dist < 18 ? 10 : (target.dist < 42 ? 7 : 3);
      const alignBonus = Math.round((target.align !== undefined ? target.align : 0.7) * 8);
      score += distBonus + alignBonus;
    }
    const lit = (biome && biome.noSurface) ? (flashOn ? 4 : -8) : (dayW > 0.35 || flashOn ? 4 : -5);
    score += lit;
    if (depthM > 35 && flashOn) score += 2;
    return OC.clamp(Math.round(score), 42, 99);
  }

  function getActiveFilterCss() {
    const f = FILTERS.find((x) => x.id === sessionState.filterId);
    return f ? f.css : '';
  }

  function renderStampPreview(srcCanvas, stampText) {
    try {
      const w = 640;
      const aspect = (srcCanvas.height || 400) / Math.max(1, srcCanvas.width || 640);
      const h = Math.round(w * aspect);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx || !ctx.drawImage) return '';
      const fCss = getActiveFilterCss();
      if (fCss && 'filter' in ctx) ctx.filter = fCss;
      ctx.drawImage(srcCanvas, 0, 0, w, h);
      if ('filter' in ctx) ctx.filter = 'none';
      ctx.fillStyle = 'rgba(3, 14, 26, 0.72)';
      ctx.fillRect(0, h - 28, w, 28);
      ctx.fillStyle = '#8ef0ff';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(stampText, 12, h - 10);
      return c.toDataURL ? c.toDataURL('image/jpeg', 0.8) : '';
    } catch (e) {
      return '';
    }
  }

  function renderFullPng(srcCanvas, stampText) {
    try {
      const w = srcCanvas.width || 1280;
      const h = srcCanvas.height || 720;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx || !ctx.drawImage) return '';
      const fCss = getActiveFilterCss();
      if (fCss && 'filter' in ctx) ctx.filter = fCss;
      ctx.drawImage(srcCanvas, 0, 0, w, h);
      if ('filter' in ctx) ctx.filter = 'none';
      ctx.fillStyle = 'rgba(3, 14, 26, 0.72)';
      ctx.fillRect(0, h - 38, w, 38);
      ctx.fillStyle = '#9cf2ff';
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.fillText(stampText, 18, h - 14);
      return c.toDataURL ? c.toDataURL('image/png') : '';
    } catch (e) {
      return srcCanvas.toDataURL ? srcCanvas.toDataURL('image/png') : '';
    }
  }

  OC.Expedition = {
    MISSIONS,
    FILTERS,

    isCinemaMode: () => sessionState.cinemaMode,
    setCinemaMode(on) {
      sessionState.cinemaMode = !!on;
      return sessionState.cinemaMode;
    },
    getFilters: () => FILTERS,
    getFilter() {
      return FILTERS.find((x) => x.id === sessionState.filterId) || FILTERS[0];
    },
    setFilter(id) {
      const f = FILTERS.find((x) => x.id === id);
      if (f) sessionState.filterId = f.id;
      return this.getFilter();
    },
    cycleFilter() {
      const idx = FILTERS.findIndex((x) => x.id === sessionState.filterId);
      const next = FILTERS[(idx + 1) % FILTERS.length];
      sessionState.filterId = next.id;
      return next;
    },

    getSavedDiscovered(biomeId) {
      return Array.isArray(store.discovered[biomeId]) ? store.discovered[biomeId] : ['floor'];
    },

    saveDiscovered(biomeId, setOrArr) {
      store.discovered[biomeId] = Array.from(setOrArr);
      saveStore();
    },

    getSavedQuality() {
      return store.quality || null;
    },

    saveQuality(qId) {
      store.quality = qId;
      saveStore();
    },

    setWaypoint(biomeId, x, z, label) {
      store.waypoints[biomeId] = { x, z, label: label || 'Навигационная метка' };
      saveStore();
      return store.waypoints[biomeId];
    },

    clearWaypoint(biomeId) {
      delete store.waypoints[biomeId];
      saveStore();
    },

    getWaypoint(biomeId) {
      return store.waypoints[biomeId] || null;
    },

    isPhotoMode: () => sessionState.photoMode,
    setPhotoMode(on) {
      sessionState.photoMode = !!on;
      return sessionState.photoMode;
    },
    getZoomFov: () => sessionState.zoomFov,
    adjustZoom(delta) {
      sessionState.zoomFov = OC.clamp(sessionState.zoomFov + delta, 26, 62);
      return sessionState.zoomFov;
    },

    recordSonarPing(biomeId, scanRes) {
      sessionState.sonarPingsByBiome[biomeId] = (sessionState.sonarPingsByBiome[biomeId] || 0) + 1;
      if (scanRes && scanRes.key) {
        if (!sessionState.pingKeysByBiome[biomeId]) sessionState.pingKeysByBiome[biomeId] = [];
        if (!sessionState.pingKeysByBiome[biomeId].includes(scanRes.key)) {
          sessionState.pingKeysByBiome[biomeId].push(scanRes.key);
        }
      }
    },

    recordPhoto(srcCanvas, biome, target, depthM, dayW, flashOn) {
      const key = (target && target.key) ? target.key : 'floor';
      const enc = biome.encyclopedia[key] || biome.encyclopedia.floor;
      const title = enc ? enc[0] : key;
      const latin = enc ? enc[1] : '';
      const score = scorePhoto(target, dayW, flashOn, depthM, biome);
      const distTxt = target && target.dist ? (target.dist.toFixed(1) + ' м · ') : '';
      const stamp = `${biome.name} · ${title} · Глуб. ${depthM.toFixed(0)} м · ${distTxt}Оценка ${score}/100`;

      const id = 'ph_' + Date.now() + '_' + Math.floor(Math.random() * 999);
      const previewUrl = srcCanvas ? renderStampPreview(srcCanvas, stamp) : '';
      const fullPng = srcCanvas ? renderFullPng(srcCanvas, stamp) : '';
      if (fullPng) sessionState.fullPngCache[id] = fullPng;

      const entry = {
        id,
        biomeId: biome.id,
        biomeName: biome.name,
        key,
        title,
        latin,
        score,
        dist: target && target.dist ? Number(target.dist.toFixed(1)) : 0,
        depthM: Number(depthM.toFixed(1)),
        dataUrl: previewUrl,
        ts: Date.now()
      };

      store.photos.unshift(entry);
      if (store.photos.length > 6) store.photos.length = 6;
      saveStore();
      return Object.assign({}, entry, { downloadUrl: fullPng || previewUrl });
    },

    getPhotoDownloadUrl(photoId) {
      if (sessionState.fullPngCache[photoId]) return sessionState.fullPngCache[photoId];
      const found = store.photos.find((p) => p.id === photoId);
      return found ? found.dataUrl : '';
    },

    getPhotos(biomeId) {
      if (!biomeId) return store.photos.slice();
      return store.photos.filter((p) => p.biomeId === biomeId);
    },

    clearPhotos() {
      store.photos = [];
      sessionState.fullPngCache = {};
      saveStore();
    },

    evaluateMissions(biome, stateCtx) {
      if (!biome) return { list: [], newlyCompleted: [] };
      const biomeId = biome.id;
      const doneList = getMissionDoneList(biomeId);
      const discoveredArr = this.getSavedDiscovered(biomeId);
      const discoveredSet = new Set(discoveredArr);
      const photosInBiome = store.photos.filter((p) => p.biomeId === biomeId);
      const pingKeys = sessionState.pingKeysByBiome[biomeId] || [];
      if (!sessionState.visitedZonesByBiome[biomeId]) sessionState.visitedZonesByBiome[biomeId] = [];
      const visitedZones = sessionState.visitedZonesByBiome[biomeId];
      if (stateCtx && stateCtx.zoneId && !visitedZones.includes(stateCtx.zoneId)) {
        visitedZones.push(stateCtx.zoneId);
      }

      const evalCtx = Object.assign({
        zoneId: '',
        depthM: 0,
        currentKnots: 0,
        dayW: 1.0,
        flashOn: false,
        discoveredCount: discoveredSet.size,
        sonarPings: sessionState.sonarPingsByBiome[biomeId] || 0,
        hasZone: (zId) => visitedZones.includes(zId) || evalCtx.zoneId === zId,
        hasDiscovered: (k) => discoveredSet.has(k),
        hasPhoto: (keys) => photosInBiome.some((p) => keys.includes(p.key)),
        hasPhotoOrPing: (keys) => photosInBiome.some((p) => keys.includes(p.key)) || keys.some((k) => pingKeys.includes(k))
      }, stateCtx || {});

      const list = [];
      const newlyCompleted = [];

      for (const m of MISSIONS) {
        if (m.biomeId !== biomeId) continue;
        const rawCur = m.progress(evalCtx);
        const cur = OC.clamp(rawCur, 0, m.goal);
        let done = doneList.includes(m.id);
        if (!done && cur >= m.goal) {
          done = true;
          doneList.push(m.id);
          newlyCompleted.push(m);
        }
        list.push({
          id: m.id,
          biomeId: m.biomeId,
          title: m.title,
          desc: m.desc,
          landmarkId: m.landmarkId,
          cur: done ? m.goal : cur,
          goal: m.goal,
          done
        });
      }

      if (newlyCompleted.length) saveStore();
      return { list, newlyCompleted };
    },

    getAllSummary() {
      const doneTotal = Object.values(store.missionsDone).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
      return {
        missionsDone: doneTotal,
        missionsTotal: MISSIONS.length,
        photosCount: store.photos.length,
        samplesCount: Array.isArray(store.samples) ? store.samples.length : 0
      };
    },

    addSample(entry) {
      if (!entry) return null;
      if (!Array.isArray(store.samples)) store.samples = [];
      const existingIdx = store.samples.findIndex((s) => s.biomeId === entry.biomeId && s.species === entry.species);
      if (existingIdx >= 0) store.samples.splice(existingIdx, 1);
      store.samples.unshift(entry);
      if (store.samples.length > 36) store.samples.length = 36;
      saveStore();
      return entry;
    },

    getSamples(biomeId) {
      const list = Array.isArray(store.samples) ? store.samples : [];
      if (!biomeId) return list.slice();
      return list.filter((s) => s.biomeId === biomeId);
    },

    clearSamples(biomeId) {
      if (!Array.isArray(store.samples)) store.samples = [];
      if (biomeId) store.samples = store.samples.filter((s) => s.biomeId !== biomeId);
      else store.samples = [];
      saveStore();
    },

    getBiomeSummary(biome) {
      if (!biome) return { discovered: 0, speciesTotal: 0, missionsDone: 0, missionsTotal: 0 };
      const encKeys = biome.encyclopedia ? Object.keys(biome.encyclopedia) : [];
      const saved = this.getSavedDiscovered(biome.id);
      const discCount = saved.length || (biome.defaultDiscovered ? biome.defaultDiscovered.length : 1);
      const missionsTotal = MISSIONS.filter((m) => m.biomeId === biome.id).length;
      const doneArr = store.missionsDone[biome.id];
      return {
        discovered: Math.min(encKeys.length, discCount),
        speciesTotal: encKeys.length,
        missionsDone: Array.isArray(doneArr) ? doneArr.length : 0,
        missionsTotal
      };
    },

    getFogGrid(biomeId) {
      if (!biomeId || !store.fogMaps) return '';
      return store.fogMaps[biomeId] || '';
    },

    setFogGrid(biomeId, encoded) {
      if (!biomeId) return;
      if (!store.fogMaps) store.fogMaps = {};
      store.fogMaps[biomeId] = encoded || '';
      saveStore();
    },

    clearFogGrid(biomeId) {
      if (!store.fogMaps) return;
      if (biomeId) delete store.fogMaps[biomeId];
      else store.fogMaps = {};
      saveStore();
    }
  };
})(window.OC);
