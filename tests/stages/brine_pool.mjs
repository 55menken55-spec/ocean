// R) Verify 7th Biome: Brine Pool & Twilight Zone (brine_pool, 650 m / ~68 atm, Halocline Lake, Archimedean Buoyancy, Methane Hydrates, Lamellibrachia, Halite, Siphonophore, Oarfish, Chimaera)
import assert from 'node:assert/strict';
import { makeStubEl } from '../lib/harness.mjs';

export function run(ctx) {
  const { OC, T, a, camera, fauna, floraProtos, scene } = ctx;
  const bpBiome = OC.Biomes.setActive('brine_pool');
  assert(bpBiome && bpBiome.noSurface && bpBiome.twilightSurface && bpBiome.depthOffset === 610 && bpBiome.minimapTheme === 'brine', 'brine_pool must configure twilightSurface, 610 depthOffset & brine theme');
  assert.equal(typeof bpBiome.getBrineSurfaceAt, 'function', 'brine_pool must expose getBrineSurfaceAt');
  for (const spKey of ['methane_hydrate', 'cold_tubeworm', 'halite_spire', 'vent_mussels']) {
    assert(floraProtos[spKey], `FloraLibrary missing brine_pool species ${spKey}`);
    assert(bpBiome.encyclopedia[spKey], `brine_pool encyclopedia missing ${spKey}`);
  }
  for (const fKey of ['brine_pool_lake', 'siphonophore', 'oarfish', 'chimaera', 'myctophid', 'hatchetfish']) {
    assert(bpBiome.encyclopedia[fKey], `brine_pool encyclopedia missing fauna ${fKey}`);
  }

  const bpZoneHits = new Set([
    bpBiome.getZoneAt(0, -60, -24).id,
    bpBiome.getZoneAt(90, -58, -94).id,
    bpBiome.getZoneAt(205, -26, -165).id,
    bpBiome.getZoneAt(-24, -22, -32).id
  ]);
  assert.equal(bpZoneHits.size, 4, `Expected all 4 brine_pool zones reachable, got ${[...bpZoneHits].join(', ')}`);

  const bpSp = new T.Vector3(bpBiome.spawn.pos[0], bpBiome.spawn.pos[1], bpBiome.spawn.pos[2]);
  OC.Terrain.init(scene, bpBiome, bpSp);
  OC.FloraStreamer.init(scene, bpBiome, bpSp);
  const bpFauna = OC.FaunaEngine.init(scene, bpBiome);
  assert.equal(bpFauna.getVesselInfo(), null, 'brine_pool must not spawn a surface vessel');
  const blAgent = bpFauna.agents.find((a) => a.key === 'brine_pool_lake');
  const sphAgent = bpFauna.agents.find((a) => a.key === 'siphonophore');
  const oarAgent = bpFauna.agents.find((a) => a.key === 'oarfish');
  const chiAgent = bpFauna.agents.find((a) => a.key === 'chimaera');
  assert(blAgent && sphAgent && oarAgent && chiAgent, 'brine_pool must instantiate brine_pool_lake, siphonophore, oarfish & chimaera');

  // Verify Archimedean Brine Pool Buoyancy prevents sinking to the lake floor (-73 m) and sets isInBrine()
  const brineSurface = bpBiome.getBrineSurfaceAt(0, -24);
  assert(brineSurface && Math.abs(brineSurface.level - (-62.0)) < 0.2, 'Main brine lake surface must be at -62.0 m');
  OC.Navigation.init(makeStubEl('scene'), bpBiome, {});
  OC.Navigation.getPosition().set(0, -64.5, -24);
  for (let s = 0; s < 12; s++) {
    OC.uTime.value += 0.08;
    OC.Navigation.update(0.08, OC.uTime.value, camera, false);
  }
  const buoyPos = OC.Navigation.getPosition();
  assert(buoyPos.y >= brineSurface.level - 1.15 && buoyPos.y <= brineSurface.level + 0.8, `Brine pool buoyancy must float craft near halocline (${brineSurface.level} m), got y=${buoyPos.y.toFixed(2)}`);
  assert.equal(OC.Navigation.isInBrine(), true, 'OC.Navigation.isInBrine() must be true on brine lake surface');

  // Verify Ultra 5x5 flora pools for brine_pool never overflow maxInstances
  const bpUltraCounts = {};
  for (let cx = -2; cx <= 2; cx++) {
    for (let cz = -2; cz <= 2; cz++) {
      const items = bpBiome.generateChunkFlora(cx, cz, bpBiome.chunkSize, 1.5, OC.mulberry32(cx * 31 + cz * 97 + 23));
      for (const it of items) {
        assert(!bpBiome.getBrineSurfaceAt(it.x, it.z), `brine_pool flora ${it.species} must only spawn outside brine lake`);
        bpUltraCounts[it.species] = (bpUltraCounts[it.species] || 0) + 1;
      }
    }
  }
  for (const [spKey, cnt] of Object.entries(bpUltraCounts)) {
    assert(cnt <= floraProtos[spKey].maxInstances, `brine_pool Ultra 5x5 overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
  }
  assert(bpUltraCounts.methane_hydrate >= 8 && bpUltraCounts.cold_tubeworm >= 12 && bpUltraCounts.halite_spire >= 10, 'brine_pool must populate methane_hydrate, cold_tubeworm & halite_spire');

  const ctdBp = OC.ROV.runCtdCast(bpBiome, bpSp, OC.EcoLab.getState());
  assert(ctdBp && ctdBp.maxDepthM > 640 && ctdBp.maxDepthM < 720 && ctdBp.maxPressureAtm > 64 && ctdBp.maxPressureAtm < 75, `Brine Pool CTD cast must reflect ~68 atm pressure (got ${ctdBp && ctdBp.maxPressureAtm})`);

  OC.Biomes.setActive('great_barrier_reef');
  console.log(`   7th Biome "Соляной бассейн" (650 м / ${ctdBp.maxPressureAtm} атм, Halocline Buoyancy, Hydrates, Lamellibrachia, Siphonophore, Oarfish & Chimaera) verified.`);
}
