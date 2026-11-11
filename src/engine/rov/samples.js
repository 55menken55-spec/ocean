/* ================= ROV: МАНИПУЛЯТОР, ПРОБЫ И ВОДНАЯ ТОЛЩА (CTD) ================= */
/* Наведение манипулятора, классификация научных проб (кораллы, гидротермы, лёд,
   карст, вулканиты, обломки, флора) и профиль водной толщи: температура, солёность,
   O₂, давление по бинам глубины. Чистые функции без состояния сцены. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const _nearOut = { species: '', x: 0, y: 0, z: 0, scale: 1, tint: 0xffffff, dist: 999 };
  const _probe = new T.Vector3();

    // Цвета и классификация научных проб
  const CORAL_SPECIES = new Set([
    'coral_staghorn', 'coral_table', 'coral_brain', 'coral_plate', 'coral_crust',
    'coral_boulder', 'coral_pillar', 'coral_seafan', 'coral_soft', 'coral_whip',
    'seafan_gold', 'black_coral', 'anemone', 'arctic_soft_coral', 'tubastraea_coral'
  ]);
  const VENT_SPECIES = new Set(['smoker_chimney', 'vent_chimney', 'tube_worm', 'riftia_worms', 'vent_mussel', 'vent_mussels', 'serpentinite_vent', 'osedax_plume', 'methane_hydrate', 'cold_tubeworm', 'volcanic_fumarole']);
  const ICE_SPECIES = new Set(['ice_floe', 'iceberg', 'brinicle', 'halite_spire']);
  const KARST_SPECIES = new Set(['stalactite', 'stalagmite']);
  const VOLCANIC_SPECIES = new Set(['galapagos_barnacle', 'darwins_arch']);
  const WRECK_SPECIES = new Set(['wreck_anchor']);
  const FLORA_SPECIES = new Set(['seagrass', 'kelp_giant', 'sargassum', 'arctic_kelp', 'kelp_arctic', 'mangrove', 'island_palm', 'cenote_vine', 'ulva_turf', 'igapo_tree', 'victoria_lily', 'amazon_sword', 'sunken_log', 'driftwood_snag', 'charophyte_bed']);


    function scanManipulatorTarget(biome, pos, fwd, out) {
    out = out || {};
    out.kind = 'water';
    out.species = '';
    out.label = 'Толща воды (батометр Нискина)';
    out.latin = 'Водная проба · eDNA и газы';
    out.dist = 0;
    out.colorHex = 0x58e0ff;

    if (!biome) return out;
    _probe.copy(pos).addScaledVector(fwd, 3.6);

    const nearFlora = OC.FloraStreamer && OC.FloraStreamer.findNearest
      ? OC.FloraStreamer.findNearest(_probe, 14.5, _nearOut)
      : null;

    if (nearFlora && nearFlora.species) {
      const enc = biome.encyclopedia && biome.encyclopedia[nearFlora.species];
      out.kind = 'flora';
      out.species = nearFlora.species;
      out.label = enc ? enc[0] : nearFlora.species;
      out.latin = enc ? enc[1] : '';
      out.dist = Math.max(0.8, Math.hypot(nearFlora.x - pos.x, nearFlora.y - pos.y, nearFlora.z - pos.z));
      out.colorHex = nearFlora.tint || (CORAL_SPECIES.has(nearFlora.species) ? 0xff8a7a : 0x5be8b0);
      return out;
    }

    const fl = biome.getHeight(_probe.x, _probe.z);
    const clearance = pos.y - fl;
    if (clearance < 16.5) {
      const floorEnc = biome.encyclopedia && biome.encyclopedia.floor;
      out.kind = 'floor';
      out.species = 'floor';
      out.label = floorEnc ? floorEnc[0] : 'Донный осадок';
      out.latin = floorEnc ? floorEnc[1] : 'Керн морского дна';
      out.dist = Math.max(1.0, clearance);
      out.colorHex = biome.id === 'hydrothermal_vents' ? 0x6a5c54 : (biome.id === 'arctic_sea' ? 0x99d6e8 : (biome.id === 'amazon_igapo' ? 0x8f5b2a : (biome.id === 'baikal' ? 0x71857d : 0xe8d9b5)));
      return out;
    }

    return out;
  }

  function classifySample(target, biome, depthM, labState, atPos, seq) {
    const pos = atPos || (target && target.pos) || _probe;
    const tempBase = biome.getTemperatureAt
      ? biome.getTemperatureAt(pos.x, depthM, biome.getZoneAt(pos.x, pos.y, pos.z))
      : (biome.getZoneAt(pos.x, pos.y, pos.z).tempC || 18);
    const delta = labState ? labState.tempDelta : 0;
    const waterTemp = Math.max(-1.9, tempBase + delta);
    const pH = labState ? labState.pH : 8.10;
    const o2 = labState ? labState.dissolvedO2 : 7.2;
    const bleachPct = labState ? Math.round(labState.bleaching * 100) : 0;
    const calcPct = labState ? Math.round(labState.calcification) : 100;

    let category = 'Проба воды';
    let chemNote = `O₂ ${o2.toFixed(1)} мг/л · ${pH.toFixed(2)} pH`;
    let colorHex = target.colorHex || 0x58e0ff;

    if (target.kind === 'flora') {
      const sp = target.species;
      if (CORAL_SPECIES.has(sp)) {
        category = 'Коралловый керн';
        const symPct = Math.max(0, 100 - bleachPct);
        chemNote = `Зооксантеллы ${symPct}% · CaCO₃ ${calcPct}%`;
        colorHex = bleachPct > 55 ? 0xf2f0eb : 0xff8570;
      } else if (VENT_SPECIES.has(sp)) {
        if (sp === 'serpentinite_vent') {
          category = 'Щелочной сип';
          chemNote = `Брусит-арагонит pH 9.8 · H₂ + CH₄`;
          colorHex = 0x70e4ff;
        } else if (sp === 'osedax_plume') {
          category = 'Био-оазис глубин';
          chemNote = `Хемосинтез Osedax · Коллаген костей`;
          colorHex = 0xe84a76;
        } else if (sp === 'methane_hydrate') {
          category = 'Газовый гидрат';
          chemNote = `CH₄·5.75H₂O · ~67 атм · Крио-клатрат`;
          colorHex = 0xf4cf76;
        } else if (sp === 'cold_tubeworm') {
          category = 'Био-оазис сипа';
          chemNote = `Хемосинтез Lamellibrachia · До 250 лет`;
          colorHex = 0xd92658;
        } else if (sp === 'volcanic_fumarole') {
          category = 'Вулканическая проба';
          chemNote = `CO₂-фумарола и сера · ${waterTemp.toFixed(1)} °C`;
          colorHex = 0xdcb428;
        } else {
          category = 'Сульфидная проба';
          chemNote = `H₂S-хемосинтез · ${(waterTemp + (sp === 'smoker_chimney' || sp === 'vent_chimney' ? 140 : 12)).toFixed(0)} °C очаг`;
          colorHex = 0xd68c45;
        }
      } else if (ICE_SPECIES.has(sp)) {
        if (sp === 'halite_spire') {
          category = 'Эвапорит галита';
          chemNote = `Кристалл NaCl · Рассол 230‰`;
          colorHex = 0x74e8ec;
        } else {
          category = 'Крио-керн';
          chemNote = `Рассол 42‰ · ${waterTemp.toFixed(1)} °C`;
          colorHex = 0x8ae8ff;
        }
      } else if (KARST_SPECIES.has(sp)) {
        category = 'Карстовый спелеотем';
        chemNote = sp === 'stalactite' ? 'Кальцит CaCO₃ · Рост ~0.1 мм/год' : 'Травертин CaCO₃ · Климатическая запись';
        colorHex = 0xe4d4b8;
      } else if (VOLCANIC_SPECIES.has(sp)) {
        category = 'Вулканический базальт';
        chemNote = 'Лава Наска и панцири Megabalanus';
        colorHex = 0x78767e;
      } else if (WRECK_SPECIES.has(sp)) {
        category = 'Архео-фрагмент';
        chemNote = `Патина бронзы и карбонат`;
        colorHex = 0xc29b61;
      } else if (FLORA_SPECIES.has(sp)) {
        category = 'Ботаническая проба';
        chemNote = `Фотосинтез · O₂ ${o2.toFixed(1)} мг/л`;
        colorHex = 0x5be8b0;
      } else if (sp === 'baikal_sponge') {
        category = 'Пресноводный губочный био-риф';
        chemNote = 'Кремнистый скелет · эндемик Байкала · пресная вода';
        colorHex = 0x88b89b;
      } else {
        category = 'Образец бентоса';
        chemNote = sp === 'hadal_sponge'
          ? `Биогенный кремний SiO₂ · ~1090 атм`
          : `${pH.toFixed(2)} pH · ${waterTemp.toFixed(1)} °C`;
      }
    } else if (target.kind === 'floor') {
      category = 'Керн грунта';
      chemNote = biome.id === 'mariana_trench'
        ? `Радиоляриевый ил · ${depthM.toFixed(0)} м`
        : (biome.id === 'brine_pool'
          ? `Рассол 230‰ и карбонатный ил · ${depthM.toFixed(0)} м`
          : (biome.id === 'cenote_caves'
            ? `Карстовый известняк · ${depthM.toFixed(0)} м`
            : (biome.id === 'galapagos_upwelling'
              ? `Базальт и оливковый песок · ${depthM.toFixed(0)} м`
              : (biome.id === 'hydrothermal_vents'
                ? `Базальт и Fe-Mn корки · ${depthM.toFixed(0)} м`
                : (biome.id === 'arctic_sea'
                  ? `Полярный ил · ${waterTemp.toFixed(1)} °C`
                  : (biome.id === 'baikal' ? `Диатомовый ил рифта · ${depthM.toFixed(0)} м · пресная вода` : `Карбонатный ил · ${pH.toFixed(2)} pH`))))));
    }

    return {
      id: 'smp_' + Date.now() + '_' + ((seq || 0) + 1),
      biomeId: biome.id,
      biomeName: biome.name,
      species: target.species,
      title: target.label,
      latin: target.latin,
      category,
      depthM: Number(depthM.toFixed(1)),
      tempC: Number(waterTemp.toFixed(1)),
      pH: Number(pH.toFixed(2)),
      o2: Number(o2.toFixed(1)),
      bleachPct,
      chemNote,
      colorHex,
      ts: Date.now()
    };
  }

  function computeWaterColumn(biome, x, z, craftDepthM, labState) {
    const fl = biome.getHeight(x, z);
    const off = biome.depthOffset || 0;
    const minDepthM = off > 0 ? off : 0;
    const maxDepthM = Math.max(minDepthM + 10, off + (off > 0 ? -fl : Math.max(4, -fl)));
    const binsCount = 24;
    const deltaT = labState ? labState.tempDelta : 0;
    const labO2 = labState ? labState.dissolvedO2 : 7.2;
    const nutrients = labState ? labState.nutrients : 0.18;

    const bins = [];
    let thermoclineM = 0;
    let maxSlope = -1;
    let prevT = null;
    let minO2 = 99;

    for (let i = 0; i < binsCount; i++) {
      const f = i / (binsCount - 1);
      const d = OC.lerp(minDepthM, maxDepthM, f);
      const yAtD = off > 0 ? -(d - off) : -d;
      const zone = biome.getZoneAt(x, yAtD, z);
      const baseT = biome.getTemperatureAt
        ? biome.getTemperatureAt(x, d, zone)
        : (off > 0 ? zone.tempC : (zone.tempC - Math.max(0, d - 16) * 0.07));

      // Термоклин / галоклин / придонный подогрев у курильщиков
      let Tval = baseT + deltaT;
      if (biome.id === 'cenote_caves') {
        // Инверсия галоклина сенотов: прохладная пресная вода сверху, теплее под галоклином (24+ м)
        Tval += OC.smoothstep(22, 28, d) * 0.6;
      } else if (biome.id === 'galapagos_upwelling') {
        // Холодный глубинный апвеллинг Кромвеля: резкий экваториальный термоклин
        Tval -= OC.smoothstep(14, 52, d) * 5.8;
      } else if (biome.id === 'amazon_igapo') {
        // Пресноводная пойма Амазонии: слабый прогрев у поверхности и постепенное снижение на дне канала
        Tval -= OC.smoothstep(2, 26, d) * 1.9;
      } else if (biome.id === 'baikal') {
        // Байкал использует собственный сезонный профиль getTemperatureAt и холодную изотерму глубин.
      } else if (!biome.noSurface && !biome.hasAurora) {
        const thermoDrop = OC.smoothstep(18, 65, d) * 3.8;
        Tval -= thermoDrop;
      } else if (biome.hasAurora) {
        // В Арктике: поверхностное распреснение -1.8°C, тёплая атлантическая прослойка ниже 65 м
        Tval += OC.smoothstep(55, 115, d) * 1.4;
      } else if (biome.id === 'hydrothermal_vents') {
        // Ближе ко дну рифта тепловой фон повышается
        Tval += Math.pow(f, 3) * 3.4;
      } else if (biome.id === 'brine_pool') {
        // Придонный геотермальный галоклин соляного озера слегка теплее
        Tval += OC.smoothstep(0.76, 1.0, f) * 1.4;
      }
      Tval = Math.max(-1.9, Tval);

      // Байкал остаётся хорошо насыщенным кислородом до глубины; морская OMZ-модель к нему не применяется.
      let o2Val = labO2;
      if (biome.id === 'baikal') {
        o2Val = OC.clamp(labO2 + 1.8 + OC.smoothstep(35, 160, d) * 1.0 - OC.smoothstep(1320, 1640, d) * 0.25, 7.5, 13.5);
      } else if (!biome.noSurface) {
        const surfBoost = (1 - OC.smoothstep(0, 28, d)) * 0.7;
        const omzDip = OC.smoothstep(24, 95, d) * (0.9 + nutrients * 1.6);
        o2Val = OC.clamp(labO2 + surfBoost - omzDip, 1.4, 12.6);
      } else {
        o2Val = OC.clamp(labO2 * 0.65 - f * 0.6, 1.8, 7.5);
      }
      if (o2Val < minO2) minO2 = o2Val;

      let conductivityUSCm = null, tdsMgL = null, mineralizationPpt = null;
      if (biome.id === 'baikal') {
        let seepInfluence = 0;
        const seeps = [[130, 170], [-110, 280], [235, -310]];
        for (let si = 0; si < seeps.length; si++) {
          const sd = Math.hypot(x - seeps[si][0], z - seeps[si][1]);
          seepInfluence = Math.max(seepInfluence, Math.exp(-sd / 115));
        }
        conductivityUSCm = OC.clamp(122 + d * 0.008 + seepInfluence * 20, 105, 158);
        tdsMgL = conductivityUSCm * 0.68;
        mineralizationPpt = tdsMgL / 1000;
      }

      if (prevT !== null) {
        const slope = Math.abs(Tval - prevT);
        if (slope > maxSlope) {
          maxSlope = slope;
          thermoclineM = d;
        }
      }
      prevT = Tval;
      bins.push({ depthM: d, tempC: Tval, o2: o2Val, conductivityUSCm, tdsMgL, mineralizationPpt });
    }

    const surfaceTemp = bins[0].tempC;
    const bottomTemp = bins[bins.length - 1].tempC;
    const bottomBin = bins[bins.length - 1];
    const maxPressureAtm = 1 + maxDepthM / 10.08;

    return {
      biomeId: biome.id,
      biomeName: biome.name,
      zoneName: biome.getZoneAt(x, off > 0 ? -(craftDepthM - off) : -craftDepthM, z).shortName,
      x: Number(x.toFixed(0)),
      z: Number(z.toFixed(0)),
      minDepthM: Number(minDepthM.toFixed(1)),
      maxDepthM: Number(maxDepthM.toFixed(1)),
      craftDepthM: Number(craftDepthM.toFixed(1)),
      surfaceTemp: Number(surfaceTemp.toFixed(1)),
      bottomTemp: Number(bottomTemp.toFixed(1)),
      thermoclineM: Number(thermoclineM.toFixed(0)),
      minO2: Number(minO2.toFixed(1)),
      waterType: biome.id === 'baikal' || biome.id === 'amazon_igapo' ? 'freshwater' : (biome.id === 'brine_pool' ? 'brine' : 'marine'),
      pH: labState ? Number(labState.pH.toFixed(2)) : 8.1,
      conductivityUSCm: bottomBin.conductivityUSCm === null ? null : Number(bottomBin.conductivityUSCm.toFixed(0)),
      tdsMgL: bottomBin.tdsMgL === null ? null : Number(bottomBin.tdsMgL.toFixed(0)),
      mineralizationPpt: bottomBin.mineralizationPpt === null ? null : Number(bottomBin.mineralizationPpt.toFixed(3)),
      maxPressureAtm: Number(maxPressureAtm.toFixed(1)),
      bins
    };
  }


  OC._RovSamples = { scanManipulatorTarget, classifySample, computeWaterColumn };
})(window.OC);
