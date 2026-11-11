/* ================= 3D-БАТИСКАФ ROV «НАУТИЛУС-IV», МАНИПУЛЯТОР, CTD И 3D-ТЕЧЕНИЯ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const MAX_SAMPLES = 20;
  const WAKE_COUNT = 128;
  const STREAM_COUNT = 140;
  const TETHER_SEGS = 22;
  const MAX_BUOYS = 2;
  const STREAM_BOX_XZ = 92;
  const STREAM_BOX_Y = 46;

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
  const FLORA_SPECIES = new Set(['seagrass', 'kelp_giant', 'sargassum', 'arctic_kelp', 'kelp_arctic', 'mangrove', 'island_palm', 'cenote_vine', 'ulva_turf', 'igapo_tree', 'victoria_lily', 'amazon_sword', 'sunken_log', 'driftwood_snag']);

  let sceneRef = null;
  let rovGroup = null;
  let fpArmGroup = null;
  let wakePoints = null;
  let currentsMesh = null;
  let tetherLine = null;
  const tetherPos = new Float32Array((TETHER_SEGS + 1) * 3);
  const tetherCol = new Float32Array((TETHER_SEGS + 1) * 3);
  const tetherState = {
    active: false,
    lengthM: 0,
    maxLengthM: 420,
    tensionPct: 0,
    status: 'откл.',
    anchorLabel: 'НИС «Океан-1»',
    anchorX: 0,
    anchorY: 0,
    anchorZ: 0
  };
  const buoys = [];
  const buoyMeshes = [];
  let buoySeq = 0;

  // Подвижные узлы 3D-аппарата (заполняются из rov/model.js)
  const nodes = {};
  const propL = () => nodes.propL;
  const propR = () => nodes.propR;
  const propV = () => nodes.propV;
  const strobeMat = () => nodes.strobeMat;
  const ledMat = () => nodes.ledMat;
  const armShoulder = () => nodes.armShoulder;
  const armUpper = () => nodes.armUpper;
  const armForearm = () => nodes.armForearm;
  const armWrist = () => nodes.armWrist;
  const clawL = () => nodes.clawL;
  const clawR = () => nodes.clawR;
  const sampleOrb = () => nodes.sampleOrb;
  const laserBeam = () => nodes.laserBeam;
  const fpUpper = () => nodes.fpUpper;
  const fpForearm = () => nodes.fpForearm;
  const fpClawL = () => nodes.fpClawL;
  const fpClawR = () => nodes.fpClawR;
  const fpOrb = () => nodes.fpOrb;


  // Состояние анимации и инструментов
  let currentsVisible = false;
  let prevYaw = 0;
  let prevCraftPos = new T.Vector3();
  let rollSmooth = 0;
  let pitchSmooth = 0;
  let propAngle = 0;
  let grabTimer = 0;
  let grabDuration = 1.95;
  let wakeCursor = 0;
  let wakeAccum = 0;
  let wakeInited = false;
  let streamsInited = false;

  const wakePos = new Float32Array(WAKE_COUNT * 3);
  const wakeVel = new Float32Array(WAKE_COUNT * 3);
  const wakeLife = new Float32Array(WAKE_COUNT);

  const streamPos = new Float32Array(STREAM_COUNT * 6);
  const streamCol = new Float32Array(STREAM_COUNT * 6);
  const streamHeadX = new Float32Array(STREAM_COUNT);
  const streamHeadY = new Float32Array(STREAM_COUNT);
  const streamHeadZ = new Float32Array(STREAM_COUNT);
  const streamAge = new Float32Array(STREAM_COUNT);

  const samples = [];
  let lastCtdCast = null;

  // Временные объекты (zero-GC)
  const _fwd = new T.Vector3();
  const _right = new T.Vector3();
  const _up = new T.Vector3(0, 1, 0);
  const _probe = new T.Vector3();
  const _currTmp = new T.Vector3();
  const _worldTmp = new T.Vector3();
  const _nearOut = { species: '', x: 0, y: 0, z: 0, scale: 1, tint: 0xffffff, dist: 999 };

  /* Модель аппарата и рука от первого лица — rov/model.js */
  const { buildRovModel, buildFirstPersonArm } = OC._RovModel;
  function buildWakePoints() {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(wakePos, 3));
    const mat = new T.PointsMaterial({
      size: 0.42,
      map: OC.circleTexture(64, false),
      color: 0xe8fbff,
      transparent: true,
      opacity: 0.62,
      blending: T.AdditiveBlending,
      depthWrite: false
    });
    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.rovKey = 'rov_fx';
    pts.raycast = () => {};
    pts.visible = false;
    return pts;
  }

  function buildCurrentStreamlines() {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(streamPos, 3));
    geo.setAttribute('color', new T.BufferAttribute(streamCol, 3));
    const mat = new T.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      blending: T.AdditiveBlending,
      depthWrite: false
    });
    const lines = new T.LineSegments(geo, mat);
    lines.frustumCulled = false;
    lines.userData.rovKey = 'rov_fx';
    lines.raycast = () => {};
    lines.visible = false;
    return lines;
  }

  function seedStream(i, origin, biome, rng) {
    const hx = origin.x + (rng() - 0.5) * STREAM_BOX_XZ;
    const hz = origin.z + (rng() - 0.5) * STREAM_BOX_XZ;
    const fl = biome ? biome.getHeight(hx, hz) : -25;
    let maxY = (biome && biome.noSurface) ? Math.min(-3.5, origin.y + 22) : -0.45;
    if (biome && biome.getCeilingHeight) {
      const ch = biome.getCeilingHeight(hx, hz);
      if (ch < 25.0) maxY = Math.min(maxY, ch - 1.2);
    }
    const minY = Math.max(fl + 0.9, origin.y - STREAM_BOX_Y * 0.5);
    const spanY = Math.max(2.0, maxY - minY);
    const hy = minY + rng() * spanY;
    streamHeadX[i] = hx;
    streamHeadY[i] = hy;
    streamHeadZ[i] = hz;
    streamAge[i] = rng() * 3.5;
  }

  function updateCurrents(dt, time, origin, biome, labState) {
    if (!currentsMesh) return;
    currentsMesh.visible = currentsVisible;
    if (!currentsVisible || !biome) return;

    if (!streamsInited) {
      streamsInited = true;
      const rng = OC.mulberry32(90210);
      for (let i = 0; i < STREAM_COUNT; i++) seedStream(i, origin, biome, rng);
    }

    const mult = labState ? labState.currentMult : 1.0;
    const halfXZ = STREAM_BOX_XZ * 0.5;
    const halfY = STREAM_BOX_Y * 0.5;
    const maxSurf = (biome && biome.noSurface) ? -3.5 : -0.35;

    for (let i = 0; i < STREAM_COUNT; i++) {
      let x = streamHeadX[i];
      let y = streamHeadY[i];
      let z = streamHeadZ[i];
      streamAge[i] += dt;

      if (biome.getCurrentAt) {
        biome.getCurrentAt(x, y, z, time, _currTmp);
        _currTmp.multiplyScalar(mult);
      } else {
        _currTmp.set(0.35 * mult, 0, 0.1 * mult);
      }

      const speed = _currTmp.length();
      const adv = Math.max(0.45, speed * 3.8);
      if (speed > 0.01) {
        x += (_currTmp.x / speed) * adv * dt;
        y += (_currTmp.y / speed) * adv * dt;
        z += (_currTmp.z / speed) * adv * dt;
      }

      // Оборачиваем линии течений вокруг аппарата (zero-GC)
      if (x < origin.x - halfXZ) x += STREAM_BOX_XZ;
      else if (x > origin.x + halfXZ) x -= STREAM_BOX_XZ;
      if (z < origin.z - halfXZ) z += STREAM_BOX_XZ;
      else if (z > origin.z + halfXZ) z -= STREAM_BOX_XZ;

      const fl = biome.getHeight(x, z);
      if (y < fl + 0.65 || y < origin.y - halfY || y > origin.y + halfY || y > maxSurf || streamAge[i] > 4.2) {
        const h1 = OC.hash2(i * 17, Math.floor(time * 7 + i), 313);
        const h2 = OC.hash2(i * 29, Math.floor(time * 5 + i), 773);
        const h3 = OC.hash2(i * 41, Math.floor(time * 3 + i), 991);
        x = origin.x + (h1 - 0.5) * STREAM_BOX_XZ;
        z = origin.z + (h2 - 0.5) * STREAM_BOX_XZ;
        const flN = biome.getHeight(x, z);
        const topY = Math.min(maxSurf, origin.y + halfY);
        const botY = Math.max(flN + 0.9, origin.y - halfY);
        y = botY + h3 * Math.max(1.5, topY - botY);
        streamAge[i] = 0;
      }

      streamHeadX[i] = x;
      streamHeadY[i] = y;
      streamHeadZ[i] = z;

      const streakLen = OC.clamp(0.85 + speed * 2.1, 0.85, 6.2);
      let tx = x - streakLen, ty = y, tz = z;
      if (speed > 0.01) {
        tx = x - (_currTmp.x / speed) * streakLen;
        ty = y - (_currTmp.y / speed) * streakLen;
        tz = z - (_currTmp.z / speed) * streakLen;
      }

      const vi = i * 6;
      streamPos[vi] = tx;
      streamPos[vi + 1] = ty;
      streamPos[vi + 2] = tz;
      streamPos[vi + 3] = x;
      streamPos[vi + 4] = y;
      streamPos[vi + 5] = z;

      const energy = OC.clamp(speed / 1.8, 0, 1);
      // Хвост глубже/темнее, голова яркая бирюзово-мятная при сильном токе
      streamCol[vi] = OC.lerp(0.08, 0.22, energy);
      streamCol[vi + 1] = OC.lerp(0.35, 0.72, energy);
      streamCol[vi + 2] = OC.lerp(0.62, 0.88, energy);
      streamCol[vi + 3] = OC.lerp(0.32, 0.58, energy);
      streamCol[vi + 4] = OC.lerp(0.84, 1.0, energy);
      streamCol[vi + 5] = OC.lerp(0.98, 0.86, energy);
    }

    currentsMesh.geometry.attributes.position.needsUpdate = true;
    currentsMesh.geometry.attributes.color.needsUpdate = true;
  }

  /* Кабель-трос и буи вынесены в rov/tether.js и rov/buoys.js */
  const { buildTetherMesh, updateTether } = OC._RovTether;
  const { buildBuoyMesh, updateBuoys } = OC._RovBuoys;
  function updateWake(dt, craftPos, speed, chaseActive) {
    if (!wakePoints) return;
    if (!chaseActive) {
      wakePoints.visible = false;
      return;
    }
    wakePoints.visible = true;

    if (!wakeInited) {
      wakeInited = true;
      for (let i = 0; i < WAKE_COUNT; i++) {
        wakePos[i * 3] = craftPos.x;
        wakePos[i * 3 + 1] = craftPos.y - 100;
        wakePos[i * 3 + 2] = craftPos.z;
        wakeLife[i] = 0;
      }
    }

    if (speed > 0.65 && rovGroup) {
      wakeAccum += dt * OC.clamp(speed * 2.4, 8, 38);
      while (wakeAccum >= 1) {
        wakeAccum -= 1;
        const side = (wakeCursor % 2 === 0) ? 0.54 : -0.54;
        _worldTmp.set(side, 0.02, -1.16).applyMatrix4(rovGroup.matrixWorld);
        const idx = wakeCursor;
        wakePos[idx * 3] = _worldTmp.x + (Math.random() - 0.5) * 0.08;
        wakePos[idx * 3 + 1] = _worldTmp.y + (Math.random() - 0.5) * 0.08;
        wakePos[idx * 3 + 2] = _worldTmp.z + (Math.random() - 0.5) * 0.08;
        wakeVel[idx * 3] = (Math.random() - 0.5) * 0.35;
        wakeVel[idx * 3 + 1] = 0.55 + Math.random() * 0.45;
        wakeVel[idx * 3 + 2] = (Math.random() - 0.5) * 0.35;
        wakeLife[idx] = 1.0;
        wakeCursor = (wakeCursor + 1) % WAKE_COUNT;
      }
    }

    for (let i = 0; i < WAKE_COUNT; i++) {
      if (wakeLife[i] <= 0) continue;
      wakeLife[i] -= dt * 0.72;
      if (wakeLife[i] <= 0) {
        wakePos[i * 3 + 1] = craftPos.y - 120;
      } else {
        wakePos[i * 3] += wakeVel[i * 3] * dt;
        wakePos[i * 3 + 1] += wakeVel[i * 3 + 1] * dt;
        wakePos[i * 3 + 2] += wakeVel[i * 3 + 2] * dt;
      }
    }
    wakePoints.geometry.attributes.position.needsUpdate = true;
  }

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
      out.colorHex = biome.id === 'hydrothermal_vents' ? 0x6a5c54 : (biome.id === 'arctic_sea' ? 0x99d6e8 : (biome.id === 'amazon_igapo' ? 0x8f5b2a : 0xe8d9b5));
      return out;
    }

    return out;
  }

  function classifySample(target, biome, depthM, labState) {
    const tempBase = biome.getTemperatureAt
      ? biome.getTemperatureAt(prevCraftPos.x, depthM, biome.getZoneAt(prevCraftPos.x, prevCraftPos.y, prevCraftPos.z))
      : (biome.getZoneAt(prevCraftPos.x, prevCraftPos.y, prevCraftPos.z).tempC || 18);
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
                : (biome.id === 'arctic_sea' ? `Полярный ил · ${waterTemp.toFixed(1)} °C` : `Карбонатный ил · ${pH.toFixed(2)} pH`)))));
    }

    return {
      id: 'smp_' + Date.now() + '_' + (samples.length + 1),
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

      // Профиль кислорода: поверхностный максимум, зона кислородного минимума в толще
      let o2Val = labO2;
      if (!biome.noSurface) {
        const surfBoost = (1 - OC.smoothstep(0, 28, d)) * 0.7;
        const omzDip = OC.smoothstep(24, 95, d) * (0.9 + nutrients * 1.6);
        o2Val = OC.clamp(labO2 + surfBoost - omzDip, 1.4, 12.6);
      } else {
        o2Val = OC.clamp(labO2 * 0.65 - f * 0.6, 1.8, 7.5);
      }
      if (o2Val < minO2) minO2 = o2Val;

      if (prevT !== null) {
        const slope = Math.abs(Tval - prevT);
        if (slope > maxSlope) {
          maxSlope = slope;
          thermoclineM = d;
        }
      }
      prevT = Tval;
      bins.push({ depthM: d, tempC: Tval, o2: o2Val });
    }

    const surfaceTemp = bins[0].tempC;
    const bottomTemp = bins[bins.length - 1].tempC;
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
      maxPressureAtm: Number(maxPressureAtm.toFixed(1)),
      bins
    };
  }

  OC.ROV = {
    init(scene) {
      sceneRef = scene;
      if (rovGroup && rovGroup.parent) rovGroup.parent.remove(rovGroup);
      if (fpArmGroup && fpArmGroup.parent) fpArmGroup.parent.remove(fpArmGroup);
      if (wakePoints && wakePoints.parent) wakePoints.parent.remove(wakePoints);
      if (currentsMesh && currentsMesh.parent) currentsMesh.parent.remove(currentsMesh);
      if (tetherLine && tetherLine.parent) tetherLine.parent.remove(tetherLine);
      while (buoyMeshes.length) {
        const bm = buoyMeshes.pop();
        if (bm && bm.parent) bm.parent.remove(bm);
      }
      buoys.length = 0;

      const rovBuilt = buildRovModel();
      rovGroup = rovBuilt.group;
      rovGroup.rotation.order = 'YXZ';
      rovGroup.visible = false;
      scene.add(rovGroup);
      Object.assign(nodes, rovBuilt.nodes);

      const armBuilt = buildFirstPersonArm();
      fpArmGroup = armBuilt.group;
      scene.add(fpArmGroup);
      Object.assign(nodes, armBuilt.nodes);

      wakePoints = buildWakePoints();
      scene.add(wakePoints);

      currentsMesh = buildCurrentStreamlines();
      scene.add(currentsMesh);

      tetherLine = buildTetherMesh({ tetherPos, tetherCol, TETHER_SEGS });
      scene.add(tetherLine);

      for (let i = 0; i < MAX_BUOYS; i++) {
        const bm = buildBuoyMesh();
        scene.add(bm);
        buoyMeshes.push(bm);
      }

      wakeInited = false;
      streamsInited = false;
      grabTimer = 0;
    },

    resetForBiome(biome, pos) {
      streamsInited = false;
      wakeInited = false;
      grabTimer = 0;
      if (tetherLine) tetherLine.visible = false;
      tetherState.active = false;
      tetherState.tensionPct = 0;
      buoys.length = 0;
      for (let i = 0; i < buoyMeshes.length; i++) buoyMeshes[i].visible = false;
      if (pos) prevCraftPos.copy(pos);
      lastCtdCast = null;
      if (biome && pos) {
        const off = biome.depthOffset || 0;
        const d = off + (off > 0 ? -pos.y : Math.max(0, -pos.y));
        lastCtdCast = computeWaterColumn(biome, pos.x, pos.z, d, OC.EcoLab ? OC.EcoLab.getState() : null);
      }
    },

    setCurrentsVisible(on) {
      currentsVisible = !!on;
      if (currentsMesh) currentsMesh.visible = currentsVisible;
      return currentsVisible;
    },
    isCurrentsVisible: () => currentsVisible,
    toggleCurrents() {
      return this.setCurrentsVisible(!currentsVisible);
    },

    getSamples: () => ((OC.Expedition && OC.Expedition.getSamples) ? OC.Expedition.getSamples() : samples),
    clearSamples() {
      samples.length = 0;
      if (OC.Expedition && OC.Expedition.clearSamples) OC.Expedition.clearSamples();
    },
    getLastCtdCast: () => lastCtdCast,

    runCtdCast(biome, pos, labState) {
      if (!biome || !pos) return null;
      const off = biome.depthOffset || 0;
      const d = off + (off > 0 ? -pos.y : Math.max(0, -pos.y));
      lastCtdCast = computeWaterColumn(biome, pos.x, pos.z, d, labState);
      if (OC.sound && OC.sound.ctdCast) OC.sound.ctdCast();
      return lastCtdCast;
    },

    drawCtdChart(canvas, currentDepthM) {
      if (!canvas || !lastCtdCast) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(2, 13, 24, 0.92)';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(130, 222, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < w; gx += 52) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 22; gy < h; gy += 22) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      const bins = lastCtdCast.bins;
      if (!bins || bins.length < 2) return;
      const minD = lastCtdCast.minDepthM;
      const maxD = Math.max(minD + 5, lastCtdCast.maxDepthM);

      let minT = Infinity, maxT = -Infinity;
      for (let i = 0; i < bins.length; i++) {
        if (bins[i].tempC < minT) minT = bins[i].tempC;
        if (bins[i].tempC > maxT) maxT = bins[i].tempC;
      }
      if (maxT - minT < 3) { minT -= 1.5; maxT += 1.5; }

      const padL = 8, padR = 8, padT = 8, padB = 8;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;
      const yForD = (d) => padT + OC.clamp((d - minD) / (maxD - minD), 0, 1) * plotH;

      // Линия термоклина
      if (lastCtdCast.thermoclineM > minD + 4 && lastCtdCast.thermoclineM < maxD - 4) {
        const ty = yForD(lastCtdCast.thermoclineM);
        ctx.strokeStyle = 'rgba(255, 181, 116, 0.32)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(padL, ty); ctx.lineTo(w - padR, ty); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Кривая O2 (бирюзовая)
      ctx.strokeStyle = '#58e0ff';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      for (let i = 0; i < bins.length; i++) {
        const b = bins[i];
        const x = padL + OC.clamp((b.o2 - 1.0) / 11.5, 0, 1) * plotW;
        const y = yForD(b.depthM);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Кривая температуры (янтарная)
      ctx.strokeStyle = '#ffb574';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let i = 0; i < bins.length; i++) {
        const b = bins[i];
        const x = padL + OC.clamp((b.tempC - minT) / (maxT - minT), 0, 1) * plotW;
        const y = yForD(b.depthM);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Отметка текущей глубины ROV
      const dNow = currentDepthM !== undefined ? currentDepthM : lastCtdCast.craftDepthM;
      const ry = yForD(dNow);
      ctx.strokeStyle = 'rgba(91, 232, 176, 0.72)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(padL, ry); ctx.lineTo(w - padR, ry); ctx.stroke();
      ctx.fillStyle = '#5be8b0';
      ctx.beginPath(); ctx.arc(padL + 6, ry, 3.2, 0, Math.PI * 2); ctx.fill();
    },

    grabSample(biome, pos, fwd, labState) {
      if (!biome || !pos) return null;
      const f = fwd || _fwd.set(0, 0, 1);
      const tgt = scanManipulatorTarget(biome, pos, f, {});
      const off = biome.depthOffset || 0;
      const depthM = off + (off > 0 ? -pos.y : Math.max(0, -pos.y));
      const entry = classifySample(tgt, biome, depthM, labState);

      samples.unshift(entry);
      if (samples.length > MAX_SAMPLES) samples.length = MAX_SAMPLES;
      if (OC.Expedition && OC.Expedition.addSample) OC.Expedition.addSample(entry);

      grabTimer = grabDuration;
      if (sampleOrb() && sampleOrb().material) {
        sampleOrb().material.color.setHex(entry.colorHex);
      }
      if (fpOrb() && fpOrb().material) {
        fpOrb().material.color.setHex(entry.colorHex);
      }
      if (tgt.kind === 'flora' && tgt.species && OC.Atlas && OC.Atlas.discover) {
        entry.isNewAtlas = !!OC.Atlas.discover(tgt.species);
      }
      if (OC.sound && OC.sound.rovServo) OC.sound.rovServo(true);
      return entry;
    },

    scanTarget(biome, pos, fwd, out) {
      return scanManipulatorTarget(biome, pos, fwd, out);
    },

    update(dt, time, camera, craftPos, yaw, pitch, speed, biome, opts) {
      opts = opts || {};
      const showCraft = !!opts.showCraft;
      const flashOn = !!opts.flashOn;
      const labState = opts.labState || null;
      if (craftPos) prevCraftPos.copy(craftPos);

      // Динамика крена и шага винтов
      let dYaw = yaw - prevYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      prevYaw = yaw;
      const turnRate = dt > 0.0001 ? dYaw / dt : 0;
      rollSmooth = OC.lerp(rollSmooth, OC.clamp(-turnRate * 0.22, -0.34, 0.34), Math.min(1, dt * 8));
      pitchSmooth = OC.lerp(pitchSmooth, OC.clamp(-pitch, -0.78, 0.78), Math.min(1, dt * 10));

      if (grabTimer > 0) grabTimer = Math.max(0, grabTimer - dt);
      const gProg = grabTimer > 0 ? 1.0 - (grabTimer / grabDuration) : 0;

      if (rovGroup && craftPos) {
        rovGroup.visible = showCraft;
        if (showCraft) {
          const hoverBob = Math.sin(time * 2.1) * 0.045;
          rovGroup.position.set(craftPos.x, craftPos.y + hoverBob, craftPos.z);
          rovGroup.rotation.set(pitchSmooth, yaw, rollSmooth);

          // Вращение маршевых и вертикального винтов
          const spin = (1.6 + speed * 2.6) * dt * 8.5;
          propAngle = (propAngle + spin) % (Math.PI * 2);
          if (propL()) propL().rotation.z = propAngle;
          if (propR()) propR().rotation.z = -propAngle;
          if (propV()) propV().rotation.y = propAngle * 0.7;

          // Проблесковый маяк и светодиодные фары
          if (strobeMat()) {
            const pulse = Math.pow(Math.max(0, Math.sin(time * 2.8)), 16);
            strobeMat().emissiveIntensity = 0.25 + pulse * 3.2;
          }
          if (ledMat()) {
            ledMat().emissiveIntensity = flashOn ? 2.4 : 0.35;
          }

          // Анимация манипулятора 3-го лица
          if (armUpper() && armForearm() && clawL() && clawR()) {
            const reach = gProg > 0 ? Math.sin(Math.min(1, gProg * 1.15) * Math.PI) : 0;
            const pinch = gProg > 0.42 ? 1.0 : 0.0;
            armUpper().rotation.x = OC.lerp(0.38, 0.06, reach);
            armForearm().rotation.x = OC.lerp(-0.42, -0.02, reach);
            const jawAng = OC.lerp(0.32, 0.03, pinch);
            clawL().rotation.y = -jawAng;
            clawR().rotation.y = jawAng;
            if (sampleOrb()) sampleOrb().visible = gProg > 0.44 && gProg < 0.96;
            if (laserBeam()) laserBeam().visible = gProg > 0.04 && gProg < 0.56;
          }
        }
      }

      // Манипулятор 1-го лица при взятии пробы без переключения на вид ROV
      if (fpArmGroup && camera) {
        const showFp = !!(!showCraft && grabTimer > 0 && camera);
        fpArmGroup.visible = showFp;
        if (showFp) {
          fpArmGroup.position.copy(camera.position);
          fpArmGroup.quaternion.copy(camera.quaternion);
          const reach = Math.sin(Math.min(1, gProg * 1.12) * Math.PI);
          const pinch = gProg > 0.44 ? 1.0 : 0.0;
          fpUpper().position.set(OC.lerp(0.58, 0.24, reach), OC.lerp(-0.58, -0.22, reach), OC.lerp(-0.10, -0.46, reach));
          fpUpper().rotation.set(OC.lerp(-0.22, 0.08, reach), OC.lerp(0.25, 0.16, reach), 0);
          fpForearm().rotation.x = OC.lerp(0.35, -0.04, reach);
          const jawAng = OC.lerp(0.36, 0.04, pinch);
          fpClawL().rotation.y = -jawAng;
          fpClawR().rotation.y = jawAng;
          if (fpOrb()) fpOrb().visible = gProg > 0.45 && gProg < 0.96;
        }
      }

      updateWake(dt, craftPos || camera.position, speed, showCraft);
      updateCurrents(dt, time, craftPos || camera.position, biome, labState);
      updateTether({ tetherLine, tetherState, tetherPos, tetherCol, TETHER_SEGS, _currTmp }, craftPos || (camera ? camera.position : null), biome, time, showCraft, labState);

      updateBuoys(buoyMeshes, buoys, time);
    },

    deployBuoy(biome, pos, yaw) {
      if (!biome || !pos) return null;
      const fl = biome.getHeight(pos.x, pos.z);
      const settledY = Math.max(fl + 1.15, (pos.y - fl > 26 && biome.noSurface) ? (pos.y - 1.5) : (fl + 1.15));
      const off = biome.depthOffset || 0;
      const depthM = Math.max(0, off + (off > 0 ? -settledY : Math.max(0, -settledY)));
      buoySeq++;
      const entry = {
        id: buoySeq,
        slot: buoys.length < MAX_BUOYS ? buoys.length + 1 : 1,
        label: 'Буй-станция №' + buoySeq,
        biomeId: biome.id,
        x: Number(pos.x.toFixed(1)),
        y: Number(settledY.toFixed(1)),
        z: Number(pos.z.toFixed(1)),
        yaw: typeof yaw === 'number' ? yaw : 0,
        depthM: Number(depthM.toFixed(1))
      };
      if (buoys.length >= MAX_BUOYS) buoys.shift();
      buoys.push(entry);
      if (OC.sound && OC.sound.rovServo) OC.sound.rovServo(true);
      return entry;
    },

    recallBuoys() {
      const n = buoys.length;
      buoys.length = 0;
      for (let i = 0; i < buoyMeshes.length; i++) buoyMeshes[i].visible = false;
      if (n > 0 && OC.sound && OC.sound.rovServo) OC.sound.rovServo(false);
      return n;
    },

    getBuoys: () => buoys.slice(),
    getTetherState: () => tetherState,
    getMesh: () => rovGroup,
    getWakeCount: () => WAKE_COUNT,
    getStreamCount: () => STREAM_COUNT
  };
})(window.OC);
