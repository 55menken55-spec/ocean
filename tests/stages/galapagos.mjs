// T) Verify 9th Biome: Galapagos Volcanic Upwelling & Darwin's Arch (galapagos_upwelling, 0-132 m, Cromwell Upwelling, Ocean Sunfish, Marine Iguana, Penguin, Orca, Mobula, Blue-footed Booby)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T, a, fauna, floraProtos, scene } = ctx;
  const galBiome = OC.Biomes.setActive('galapagos_upwelling');
  assert(galBiome && !galBiome.noSurface && galBiome.minimapTheme === 'galapagos', 'galapagos_upwelling must expose surface ocean & galapagos theme');

  for (const spKey of ['volcanic_fumarole', 'tubastraea_coral', 'galapagos_barnacle', 'ulva_turf']) {
    assert(floraProtos[spKey], `FloraLibrary missing galapagos_upwelling species ${spKey}`);
    assert(galBiome.encyclopedia[spKey], `galapagos_upwelling encyclopedia missing ${spKey}`);
  }
  for (const fKey of ['darwins_arch', 'ocean_sunfish', 'marine_iguana', 'galapagos_penguin', 'orca', 'mobula_ray', 'galapagos_shark', 'sardine_baitball']) {
    assert(galBiome.encyclopedia[fKey], `galapagos_upwelling encyclopedia missing fauna/feature ${fKey}`);
  }

  const galZoneHits = new Set([
    galBiome.getZoneAt(-145, -6, -68).id,
    galBiome.getZoneAt(0, -11, 42).id,
    galBiome.getZoneAt(165, -26, -48).id,
    galBiome.getZoneAt(375, -32, -85).id
  ]);
  assert.equal(galZoneHits.size, 4, `Expected all 4 galapagos_upwelling zones reachable, got ${[...galZoneHits].join(', ')}`);

  // Verify Cromwell Undercurrent upward vertical upwelling flow along volcanic wall
  const galCurr = new T.Vector3();
  galBiome.getCurrentAt(165, -26, -48, 2.0, galCurr);
  assert(galCurr.y > 0.25 && galCurr.length() > 0.6, `Cromwell upwelling must produce strong upward flow along dropoff, got vy=${galCurr.y.toFixed(2)}`);

  // Verify central passage under Darwin's Arch (0, 0) stays deep & clear while flank pillars rise
  assert(galBiome.getHeight(0, 0) < -18.0, 'Darwin Arch central underwater passage must stay clear (< -18 m)');
  assert(galBiome.getHeight(-26, 0) > 0.0 && galBiome.getHeight(26, 0) > 0.0, 'Darwin Arch twin basalt pillars must rise above sea level');

  const galSp = new T.Vector3(galBiome.spawn.pos[0], galBiome.spawn.pos[1], galBiome.spawn.pos[2]);
  OC.Terrain.init(scene, galBiome, galSp);
  OC.FloraStreamer.init(scene, galBiome, galSp);
  const galFauna = OC.FaunaEngine.init(scene, galBiome);
  assert(galFauna.getVesselInfo() && galFauna.getVesselInfo().deckPos[1] > 0, 'galapagos_upwelling must anchor RV Beagle II safely in deep water');
  for (const k of ['darwins_arch', 'ocean_sunfish', 'marine_iguana', 'galapagos_penguin', 'orca', 'mobula_ray', 'galapagos_shark']) {
    assert(galFauna.agents.some((a) => a.key === k), `galapagos_upwelling must instantiate ${k}`);
  }

  // Verify Ultra 5x5 flora pools for galapagos_upwelling never overflow maxInstances
  const galUltraCounts = {};
  for (let cx = -2; cx <= 2; cx++) {
    for (let cz = -2; cz <= 2; cz++) {
      const items = galBiome.generateChunkFlora(cx, cz, galBiome.chunkSize, 1.5, OC.mulberry32(cx * 37 + cz * 79 + 11));
      for (const it of items) galUltraCounts[it.species] = (galUltraCounts[it.species] || 0) + 1;
    }
  }
  for (const [spKey, cnt] of Object.entries(galUltraCounts)) {
    assert(cnt <= floraProtos[spKey].maxInstances, `galapagos_upwelling Ultra 5x5 overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
  }
  assert(galUltraCounts.tubastraea_coral >= 12 && galUltraCounts.ulva_turf >= 12 && galUltraCounts.galapagos_barnacle >= 8, 'galapagos_upwelling must populate tubastraea_coral, ulva_turf & galapagos_barnacle');

  // Verify Cromwell cold subsurface thermocline CTD profile
  const ctdGal = OC.ROV.runCtdCast(galBiome, new T.Vector3(240, -55, -40), OC.EcoLab.getState());
  assert(ctdGal && ctdGal.surfaceTemp > 21.0 && ctdGal.bottomTemp < 17.5, `Galapagos CTD cast must capture Cromwell thermocline (surf=${ctdGal && ctdGal.surfaceTemp}, bot=${ctdGal && ctdGal.bottomTemp})`);

  OC.Biomes.setActive('great_barrier_reef');
  console.log(`   9th Biome "Галапагосский апвеллинг" (0–132 м, Cromwell Upwelling, Darwin's Arch, Mola mola, Marine Iguana, Penguin, Orca & Mobula) verified.`);
  return { galBiome, galFauna, galSp };
}
