/* ================= ЭКСПЕДИЦИЯ: НАУЧНЫЕ МИССИИ ПО БИОМАМ ================= */
/* Каталог целей (MISSIONS): что найти, каким ключом вида и в какой точке карты. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

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
    },
    // --- Амазония: Лес Игапо ---
    {
      id: 'amz_discoveries',
      biomeId: 'amazon_igapo',
      title: 'Натуралист Амазонии',
      desc: 'Изучите 6 разных видов флоры, фауны или объектов затопленного леса Рио-Негру.',
      landmarkId: 'igapo_roots',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'amz_boto_echo',
      biomeId: 'amazon_igapo',
      title: 'Розовый дельфин Боуто',
      desc: 'Отсканируйте сонаром (G) или сфотографируйте (P) розового речного дельфина в русле Рио-Негру.',
      landmarkId: 'rio_negro_channel',
      goal: 1,
      progress: (ctx) => ctx.hasPhotoOrPing(['pink_dolphin']) ? 1 : 0
    },
    {
      id: 'amz_confluence',
      biomeId: 'amazon_igapo',
      title: 'Encontro das Águas',
      desc: 'Побудьте в зоне слияния Рио-Негру и Амазонки (whitewater_confluence) и изучите границу течений.',
      landmarkId: 'whitewater_confluence',
      goal: 1,
      progress: (ctx) => ctx.hasZone('whitewater_confluence') ? 1 : 0
    },
    {
      id: 'amz_giants',
      biomeId: 'amazon_igapo',
      title: 'Гиганты и тайны сельвы',
      desc: 'Отсканируйте (G) или снимите (P) гигантскую арапайму, электрического угря, ската моторо или кувшинку Викторию.',
      landmarkId: 'victoria_lagoon',
      goal: 1,
      progress: (ctx) => ctx.hasPhotoOrPing(['arapaima', 'electric_eel', 'river_stingray', 'victoria_lily']) ? 1 : 0
    },
    // --- Байкал: Большой рифт и эндемичные виды ---
    {
      id: 'baik_discoveries',
      biomeId: 'baikal',
      title: 'Натуралист Байкальского рифта',
      desc: 'Изучите 6 видов и геологических объектов озера Байкал.',
      landmarkId: 'baikal_academy_bay',
      goal: 6,
      progress: (ctx) => ctx.discoveredCount
    },
    {
      id: 'baik_nerpa',
      biomeId: 'baikal',
      title: 'Единственный пресноводный тюлень',
      desc: 'Сфотографируйте или обнаружьте сонаром байкальскую нерпу.',
      landmarkId: 'baikal_academy_bay',
      goal: 1,
      progress: (ctx) => ctx.hasPhotoOrPing(['seal_baikal']) ? 1 : 0
    },
    {
      id: 'baik_sponge_reef',
      biomeId: 'baikal',
      title: 'Живой губочный риф',
      desc: 'Найдите сад байкальских губок и зафиксируйте эндемичную Lubomirskia baicalensis.',
      landmarkId: 'baikal_sponge_garden',
      goal: 1,
      progress: (ctx) => ctx.hasZone('baikal_sponge_reef') && ctx.hasPhotoOrPing(['baikal_sponge']) ? 1 : 0
    },
    {
      id: 'baik_rift_depth',
      biomeId: 'baikal',
      title: 'В бездну Большого рифта',
      desc: 'Опуститесь глубже 1 000 м и просканируйте глубоководную голомянку.',
      landmarkId: 'baikal_golomyanka_depth',
      goal: 1,
      progress: (ctx) => ctx.depthM >= 1000 && ctx.hasPhotoOrPing(['fish_golomyanka']) ? 1 : 0
    },
    // --- Красное море: Рас Мохаммед и коралловые рифы ---
    {
      id: 'red_coral_garden',
      biomeId: 'red_sea',
      title: 'Коралловый сад Рас Мохаммед',
      desc: 'Исследуйте коралловый сад и зафиксируйте ветвистые кораллы Acropora.',
      landmarkId: 'sharm_reef',
      goal: 1,
      progress: (ctx) => ctx.hasZone('coral_garden') && ctx.hasPhotoOrPing(['coral_branch', 'coral_table', 'coral_plate']) ? 1 : 0
    },
    {
      id: 'red_clownfish',
      biomeId: 'red_sea',
      title: 'Рыба-клоун в актинии',
      desc: 'Сфотографируйте или обнаружьте сонаром рыбу-клоуна Красного моря в актинии.',
      landmarkId: 'sharm_reef',
      goal: 1,
      progress: (ctx) => ctx.hasPhotoOrPing(['clownfish']) ? 1 : 0
    },
    {
      id: 'red_reef_wall',
      biomeId: 'red_sea',
      title: 'Рифовая стена и мурена',
      desc: 'Опуститесь к рифовой стене (drop-off) и найдите рифовую мурену.',
      landmarkId: 'reef_drop_off',
      goal: 1,
      progress: (ctx) => ctx.hasZone('reef_wall') && ctx.hasPhotoOrPing(['moray']) ? 1 : 0
    },
    {
      id: 'red_dugong',
      biomeId: 'red_sea',
      title: 'Дюгонь в лагуне',
      desc: 'Встретьте дюгоня — «морскую корову» — в мелководье лагуны Красного моря.',
      landmarkId: 'lagoon_shallows',
      goal: 1,
      progress: (ctx) => ctx.hasZone('reef_lagoon') && ctx.hasPhotoOrPing(['dugong', 'turtle']) ? 1 : 0
    },
        // --- Подводные пещеры Флориды ---
    {
      id: 'fl_spring_entrance',
      biomeId: 'florida_caves',
      title: 'Вход в источник Флориды',
      desc: 'Исследуйте бассейн источника и зафиксируйте флоридскую мягкокрылую черепаху.',
      landmarkId: 'spring_entrance',
      goal: 1,
      progress: (ctx) => ctx.hasZone('spring_basin') && ctx.hasPhotoOrPing(['florida_softshell']) ? 1 : 0
    },
    {
      id: 'fl_cavern_hall',
      biomeId: 'florida_caves',
      title: 'Карстовый зал и сталиктиты',
      desc: 'Найдите карстовый зал и осмотрите сталактиты и сталагмиты.',
      landmarkId: 'cavern_ceiling',
      goal: 1,
      progress: (ctx) => ctx.hasZone('cavern_hall') && ctx.hasPhotoOrPing(['stalactite', 'stalagmite']) ? 1 : 0
    },
    {
      id: 'fl_cave_crayfish',
      biomeId: 'florida_caves',
      title: 'Пещерный рак и слепая рыба',
      desc: 'Опуститесь в узкий проход и обнаружьте пещерного рака и слепую пещерную рыбу.',
      landmarkId: 'squeeze_passage',
      goal: 1,
      progress: (ctx) => ctx.hasZone('narrow_passage') && ctx.hasPhotoOrPing(['cave_crayfish', 'blind_cave_fish']) ? 1 : 0
    },
    {
      id: 'fl_manatee',
      biomeId: 'florida_caves',
      title: 'Ламантин у источника',
      desc: 'Встретьте флоридского ламантина у входа в источник.',
      landmarkId: 'spring_entrance',
      goal: 1,
      progress: (ctx) => ctx.hasZone('spring_basin') && ctx.hasPhotoOrPing(['florida_manatee']) ? 1 : 0
    },
    // --- Подлёдный океан Европы: гипотетическая криобиота ---
    {
      id: 'europa_cryoforest',
      biomeId: 'europa_ocean',
      title: 'Хранитель водородного леса',
      desc: 'Исследуйте криолес на склоне серпентинитового хребта и зафиксируйте виды, живущие на водороде.',
      landmarkId: 'cryo_forest_stand',
      goal: 2,
      progress: (ctx) => (ctx.hasPhotoOrPing(['cryo_forest']) ? 1 : 0) + (ctx.hasPhotoOrPing(['cryo_tubeworm', 'chemo_mat']) ? 1 : 0)
    },
    {
      id: 'europa_serpentine',
      biomeId: 'europa_ocean',
      title: 'Холодный огонь Европы',
      desc: 'Найдите поле серпентинитовых труб и сфотографируйте трубу, хемосинтетический мат или сиповую креветку.',
      landmarkId: 'serpentine_field',
      goal: 2,
      progress: (ctx) => (ctx.hasPhotoOrPing(['serpentine_chimney']) ? 1 : 0) + (ctx.hasPhotoOrPing(['cryo_shrimp', 'vent_crab']) ? 1 : 0)
    },
    {
      id: 'europa_hydrogen',
      biomeId: 'europa_ocean',
      title: 'Водородный кран',
      desc: 'Спуститесь к водородному сипу и обнаружьте краба или креветку у выхода флюида.',
      landmarkId: 'hydrogen_vent',
      goal: 1,
      progress: (ctx) => ctx.hasZone('serpentine_field') && ctx.hasPhotoOrPing(['vent_crab', 'cryo_shrimp']) ? 1 : 0
    },
    {
      id: 'europa_brine_tara',
      biomeId: 'europa_ocean',
      title: 'Карман рассола Тары',
      desc: 'Поднимитесь к базальному льду, найдите канал рассола и зафиксируйте рассольный полип или фонарную медузу.',
      landmarkId: 'tara_brine',
      goal: 1,
      progress: (ctx) => ctx.hasZone('basal_ice') && ctx.hasPhotoOrPing(['brine_polyp', 'ice_veil', 'cryo_medusa']) ? 1 : 0
    }
  ];

  OC._ExpMissions = { MISSIONS };
})(window.OC);
