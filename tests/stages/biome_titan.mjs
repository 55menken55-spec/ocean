// AA3) Verify 15th Biome: Kraken Mare on Titan (titan_kraken, liquid methane, −179.6 °C, 4 atm at 320 m)
/* Кракеново море — первая в симуляторе среда, где растворитель не вода. Здесь
   проверяется не только сам биом, но и то, что физика жидкости (OC.Fluid)
   действительно подхватывается всеми потребителями: CTD-зондом, гидрофоном,
   манометром и Атласом. Земные биомы проверяются здесь же на регрессию —
   вода обязана остаться водой.                                                */
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC, scene } = ctx;
  const titan = OC.Biomes.get('titan_kraken');
  assert(titan, 'Biome titan_kraken must be registered');

  /* ---- 1. Среда: не вода, и это заявлено во всех метаданных ---- */
  assert(titan.fluid && titan.fluid.kind === 'methane', 'Titan must declare a methane sea via biome.fluid');
  assert(titan.isTitan === true && titan.minimapTheme === 'titan', 'Titan must carry its own minimap theme and flag');
  assert(titan.globe.world === 'titan' && titan.globe.waterType === 'methane', 'Titan must publish a planet-aware beacon with methane water type');
  const titanFluid = OC.Fluid.of(titan);
  assert.equal(titanFluid.id, 'methane', 'OC.Fluid must resolve the Titan biome to the methane medium');
  assert(titanFluid.density === 660 && titanFluid.soundSpeed === 1420, 'Titan sea: 660 kg/m³ and 1420 m/s (Younglove & Ely, 1987)');
  assert(titanFluid.polar === false, 'Liquid methane is a non-polar solvent - no pH, no conductivity');
  assert(Math.abs(titanFluid.gravity - 1.352) < 1e-9, 'Titan gravity must be 1.352 m/s²');
  // 300 м метана — это 4,09 атм против 31 атм в земном океане на той же глубине
  const atm300 = OC.Fluid.pressureAtmAt(titan, 300);
  assert(Math.abs(atm300 - 4.09) < 0.05, `300 m of methane must give ~4.09 atm, got ${atm300.toFixed(2)}`);
  assert(Math.abs(OC.Fluid.pressureAtmAt(titan, 0) - 1.45) < 1e-9, 'Titan surface pressure must stay 1.45 atm (Huygens)');
  // Плавучесть: 660 кг/м³ при 1,352 м/с² — около 9 % земной
  const buoy = OC.Fluid.buoyancyRatio(titan);
  assert(buoy > 0.08 && buoy < 0.10, `Titan buoyancy must be ~8.9 % of Earth's, got ${(buoy * 100).toFixed(1)} %`);
  // Скорость звука: в метане 1420 м/с против 1500 м/с в воде — задержка больше
  const delayMethane = OC.Fluid.delayMs(titan, 1000);
  const delayWater = OC.Fluid.delayMs(OC.Biomes.get('kelp_forest'), 1000);
  assert(Math.abs(delayMethane - 704.2) < 1.0, `Sound must cross 1 km of methane in ~704 ms, got ${delayMethane.toFixed(1)}`);
  assert(delayMethane > delayWater, 'Methane is slower than water: the hydrophone delay must be longer');

  /* ---- 2. Рельеф: ледяной берег на западе, шельф, эстуарий, котловина ---- */
  assert(titan.getHeight(-900, -60) > 8, 'Titan must have a water-ice shore rising above sea level in the west');
  const spawnFloor = titan.getHeight(titan.spawn.pos[0], titan.spawn.pos[2]);
  assert(spawnFloor < -4 && spawnFloor > -30, `Spawn must sit over the shelf (got ${spawnFloor.toFixed(1)} m)`);
  assert(titan.spawn.pos[1] < 0 && titan.spawn.pos[1] > spawnFloor + 1.5, 'Spawn must be underwater but clear of the floor');
  assert(titan.getHeight(-180, 620) < -60, 'Moray Sinus estuary must be scoured to ~85 m');
  assert(titan.getHeight(520, 40) < -300, `Kraken basin must be deeper than 300 m (got ${titan.getHeight(520, 40).toFixed(1)} m)`);
  assert(titan.zones.length === 5 && titan.landmarks.length === 5 && titan.tourLegs.length === 5, 'Titan must expose 5 zones, 5 landmarks and 5 guided tour legs');
  for (const lm of titan.landmarks) {
    const floor = titan.getHeight(lm.x, lm.z);
    assert(lm.y < 0, `Landmark ${lm.id} must be underwater (y = ${lm.y.toFixed(1)})`);
    assert(lm.y > floor + 1.5, `Landmark ${lm.id} must clear the floor (y = ${lm.y.toFixed(1)} vs floor ${floor.toFixed(1)})`);
  }
  for (const leg of titan.tourLegs) {
    assert(leg.fact && leg.fact.length > 20, `Tour leg "${leg.title}" (Titan) missing scientific fact`);
    assert(leg.pos[1] < 0 && leg.pos[1] > titan.getHeight(leg.pos[0], leg.pos[2]) + 1.5, `Tour leg "${leg.title}" must fly inside the sea`);
  }
  assert.equal(titan.getZoneAt(-600, -2, -60).id, 'ice_shore', 'The ice shore zone must cover the surf line');
  assert.equal(titan.getZoneAt(-180, -60, 620).id, 'estuary_channel', 'Moray Sinus must resolve to the estuary zone');
  assert.equal(titan.getZoneAt(520, -300, 40).id, 'abyssal_basin', 'The Kraken deep must resolve to the abyssal zone');

  /* ---- 3. Оптика и физика среды ---- */
  const titanDeepOpt = titan.getOpticalProfile(520, -300, 40, 0.6);
  const titanShelfOpt = titan.getOpticalProfile(-420, -14, 220, 0.6);
  assert(titanDeepOpt.causticStrength === 0 && titanDeepOpt.rayStrength < 0.1, 'No sunlight reaches the 300 m floor of Kraken Mare');
  assert(titanShelfOpt.fogDensity > 0.004 && titanDeepOpt.fogDensity > titanShelfOpt.fogDensity, 'Fog must thicken with depth in the hydrocarbon sea');
  for (const d of [0, 40, 160, 320]) {
    const tC = titan.getTemperatureAt(520, d, titan.getZoneAt(520, -d, 40));
    assert(tC < -178.5 && tC > -180.5, `Titan sea must stay cryogenic at ${d} m (got ${tC.toFixed(2)} °C)`);
  }
  const titanCur = titan.getCurrentAt(520, -300, 40, 0.6, new T.Vector3());
  assert(Number.isFinite(titanCur.length()) && titanCur.length() < 1.2, `Titan currents must stay gentle (got ${titanCur.length().toFixed(2)} m/s)`);

  /* ---- 4. Донные отложения: все виды реально высаживаются стримером ---- */
  const TITAN_FLORA = ['organic_silt', 'ice_boulder', 'tholin_dune', 'evaporite_crust', 'nitrile_drift', 'shoreline_ice'];
  const seen = Object.create(null);
  for (let cz = -4; cz <= 4; cz++) {
    for (let cx = -6; cx <= 4; cx++) {
      const items = titan.generateChunkFlora(cx, cz, titan.chunkSize, 1.35, OC.mulberry32(((cx * 73856093) ^ (cz * 19348663) ^ 0x7a11) >>> 0));
      for (const it of items) {
        assert(titan.encyclopedia[it.species], `Titan flora species ${it.species} missing from encyclopedia`);
        assert(OC.FloraLibrary.getPreviewGeo(it.species), `FloraLibrary missing Titan species ${it.species}`);
        seen[it.species] = (seen[it.species] || 0) + 1;
      }
    }
  }
  for (const k of TITAN_FLORA) assert(seen[k] > 0, `Titan flora stream must seed ${k}`);

  /* ---- 5. Гипотетическая фауна: высаживается, видна сонаром, не NaN ---- */
  const titanFauna = OC.FaunaEngine.init(new T.Scene(), titan);
  for (const k of ['azotosome_drifter', 'nitrile_motile', 'methane_glider', 'nitrogen_bubble']) {
    assert(titanFauna.agents.some((a) => a.key === k), `Titan fauna engine must spawn ${k}`);
    assert(titanFauna.sonarTargets.some((a) => a.key === k), `${k} must be scannable with the multibeam sonar`);
    assert(OC.sound.getVoiceLabel(k).length > 4, `Titan acoustic label missing for ${k}`);
    assert(OC.Hydrophone.getAcousticProfile(k).label.length > 4, `Titan hydrophone profile missing for ${k}`);
    const preview = OC.FaunaEngine.createPreviewMesh(k, titan);
    assert(preview && preview.children.length > 0, `Titan Atlas preview missing for ${k}`);
    const gp = preview.children[0].geometry && preview.children[0].geometry.parameters;
    assert(!(gp && gp.radius === 0.8 && gp.widthSegments === 48), `Titan Atlas entry "${k}" falls back to the placeholder sphere`);
  }
  assert(titanFauna.agents.filter((a) => a.key === 'methane_glider').length === 2, 'Two methane gliders must patrol the basin');
  const titanSpawnVec = new T.Vector3(titan.spawn.pos[0], titan.spawn.pos[1], titan.spawn.pos[2]);
  for (let f = 0; f < 8; f++) {
    OC.uTime.value += 0.16;
    titanFauna.update(0.16, OC.uTime.value, titanSpawnVec, 2.0, true);
  }
  for (const a of titanFauna.agents) {
    const p = a.getPosition();
    assert(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z), `Titan agent ${a.key} drifted to a non-finite position`);
  }
  // Метановое море: никакой земной записи в энциклопедии не выдаётся за открытие
  for (const k of ['azotosome_drifter', 'nitrile_motile', 'methane_glider']) {
    assert(/ГИПОТЕЗА/.test(titan.encyclopedia[k][5]), `Titan entry "${k}" must be explicitly labelled a hypothesis`);
  }

  /* ---- 6. CTD-зонд: неводная среда обязана выглядеть неводной ---- */
  const titanDeepVec = new T.Vector3(520, -240, 40);
  const ctdTitan = OC.ROV.runCtdCast(titan, titanDeepVec, OC.EcoLab.getState());
  assert.equal(ctdTitan.waterType, 'methane', 'Titan CTD must identify a methane sea');
  assert.equal(ctdTitan.pH, null, 'pH is undefined in a non-polar solvent: the cast must report null, not 8.1');
  assert(ctdTitan.bottomTemp < -178, `Titan CTD must report cryogenic bottom water (got ${ctdTitan.bottomTemp} °C)`);
  assert(ctdTitan.bins.every((b) => b.o2 <= 0.4), 'Titan oxygen must stay at trace level (no photosynthesis in a methane sea)');
  assert(ctdTitan.conductivityUSCm !== null && ctdTitan.conductivityUSCm < 1, 'Liquid methane is an insulator: conductivity must be ~0');
  assert(ctdTitan.tdsMgL === 0 && ctdTitan.mineralizationPpt === 0, 'TDS and mineralization are meaningless in a non-polar medium and must stay 0');
  assert(ctdTitan.fluid && ctdTitan.fluid.kind === 'methane' && ctdTitan.fluid.soundSpeed === 1420, 'The CTD cast must carry the medium it was taken in');
  assert(ctdTitan.maxDepthM > 300 && ctdTitan.maxPressureAtm < 5 && ctdTitan.maxPressureAtm > 4,
    `320 m of methane must read ~4.3 atm, got ${ctdTitan.maxPressureAtm} atm`);

  /* ---- 7. Регрессия: земная вода не превратилась в метан ---- */
  const kelp = OC.Biomes.get('kelp_forest');
  assert.equal(OC.Fluid.of(kelp).id, 'water', 'Earth biomes must still resolve to the water medium');
  const kelpVec = new T.Vector3(kelp.spawn.pos[0], kelp.spawn.pos[1], kelp.spawn.pos[2]);
  const ctdKelp = OC.ROV.runCtdCast(kelp, kelpVec, OC.EcoLab.getState());
  assert.equal(ctdKelp.fluid.kind, 'water', 'Earth CTD casts must still carry the water medium');
  assert(ctdKelp.waterType !== 'methane' && typeof ctdKelp.pH === 'number', 'Earth CTD must keep a numeric pH and a water type');
  assert(OC.Fluid.pressureAtmAt(kelp, 300) > atm300 * 5,
    'Regression: at the same depth water is still ~7x higher pressure than methane');
  assert(Math.abs(OC.Fluid.pressureAtmAt(kelp, 100) - 10.92) < 0.05, 'Water hydrostatic regression: 100 m ≈ 10.9 atm');

  /* ---- 8. Экспедиция: 4 миссии, существующие маяки, своя планета глобуса ---- */
  const titanMissions = OC.Expedition.MISSIONS.filter((m) => m.biomeId === 'titan_kraken');
  assert.equal(titanMissions.length, 4, 'Titan must provide four expedition goals');
  for (const m of titanMissions) {
    assert(titan.landmarks.some((l) => l.id === m.landmarkId), `Titan mission ${m.id} references unknown landmark ${m.landmarkId}`);
    assert(titan.encyclopedia[m.landmarkId] === undefined || m.goal > 0, `Titan mission ${m.id} must have a positive goal`);
  }
  const titanBeacon = OC.Globe.getBeacons().find((b) => b.id === 'titan_kraken');
  assert(titanBeacon && titanBeacon.world === 'titan', 'Titan must publish a planet-aware beacon (globe.world = titan)');
  assert(titanBeacon.lat > 60, `Kraken Mare must sit in the north polar region (got ${titanBeacon.lat}°)`);
  assert.equal(OC.sound.getVoiceLabel('nitrogen_bubble').includes('азота'), true, 'Nitrogen bubble fields must have their own acoustic label');

  OC.Biomes.setActive('great_barrier_reef');
  console.log('   15th Biome "Кракеново море" (Titan: liquid CH₄ at −179.6 °C, 4.3 atm at 320 m, c = 1420 m/s, 8.9 % buoyancy, 4 missions) verified.');
}
