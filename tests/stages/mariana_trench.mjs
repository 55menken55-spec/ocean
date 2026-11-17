// Q) Verify 6th Biome: Mariana Trench & Whale Fall Oasis (mariana_trench, 10,920 m / ~1085+ atm, Osedax, Hadal Sponge, Serpentinite Seeps, Snailfish, Sea Pig)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T, a, fauna, floraProtos, scene } = ctx;
  const mtBiome = OC.Biomes.setActive('mariana_trench');
  assert(mtBiome && mtBiome.noSurface && mtBiome.depthOffset === 10840 && mtBiome.minimapTheme === 'hadal', 'mariana_trench must configure noSurface, 10840 depthOffset & hadal theme');
  for (const spKey of ['osedax_plume', 'hadal_sponge', 'serpentinite_vent']) {
    assert(floraProtos[spKey], `FloraLibrary missing hadal species ${spKey}`);
    assert(mtBiome.encyclopedia[spKey], `mariana_trench encyclopedia missing ${spKey}`);
  }
  for (const fKey of ['whale_fall', 'hadal_snailfish', 'sea_pig', 'amphipod']) {
    assert(mtBiome.encyclopedia[fKey], `mariana_trench encyclopedia missing fauna ${fKey}`);
  }

  const mtSp = new T.Vector3(mtBiome.spawn.pos[0], mtBiome.spawn.pos[1], mtBiome.spawn.pos[2]);
  OC.Terrain.init(scene, mtBiome, mtSp);
  OC.FloraStreamer.init(scene, mtBiome, mtSp);
  const mtFauna = OC.FaunaEngine.init(scene, mtBiome);
  assert.equal(mtFauna.getVesselInfo(), null, 'mariana_trench must not spawn a surface vessel');
  const wfAgent = mtFauna.agents.find((a) => a.key === 'whale_fall');
  const sfAgent = mtFauna.agents.find((a) => a.key === 'hadal_snailfish');
  const spAgent = mtFauna.agents.find((a) => a.key === 'sea_pig');
  assert(wfAgent && sfAgent && spAgent, 'mariana_trench must instantiate whale_fall, hadal_snailfish & sea_pig');

  const mtUltraCounts = {};
  for (let cx = -2; cx <= 2; cx++) {
    for (let cz = -2; cz <= 2; cz++) {
      const items = mtBiome.generateChunkFlora(cx, cz, mtBiome.chunkSize, 1.5, OC.mulberry32(cx * 31 + cz * 97 + 19));
      for (const it of items) mtUltraCounts[it.species] = (mtUltraCounts[it.species] || 0) + 1;
    }
  }
  for (const [spKey, cnt] of Object.entries(mtUltraCounts)) {
    assert(cnt <= floraProtos[spKey].maxInstances, `mariana_trench Ultra 5x5 overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
  }
  assert(mtUltraCounts.osedax_plume >= 10 && mtUltraCounts.hadal_sponge >= 10 && mtUltraCounts.serpentinite_vent >= 3, 'mariana_trench must populate osedax_plume, hadal_sponge & serpentinite_vent');

  const ctdMt = OC.ROV.runCtdCast(mtBiome, mtSp, OC.EcoLab.getState());
  assert(ctdMt && ctdMt.maxDepthM > 10915 && ctdMt.maxPressureAtm > 1080, `Mariana Trench CTD cast must reflect hadal >1080 atm pressure (got ${ctdMt && ctdMt.maxPressureAtm})`);

  OC.Biomes.setActive('great_barrier_reef');
  console.log(`   6th Biome "Марианская впадина" (10,920 м / ${ctdMt.maxPressureAtm} атм, Whale Fall, Osedax, Caulophacus, Serpentinite Seeps, Snailfish & Sea Pig) verified.`);
}
