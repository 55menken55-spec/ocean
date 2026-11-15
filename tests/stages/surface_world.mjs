// P) Verify Direction 10: Surface World & Expedition Mother-Ship (Research Vessel, Seabirds, Dolphins, Flying Fish)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, a, biome, camera, scene } = ctx;
  const surfBiomes = ['great_barrier_reef', 'kelp_forest', 'arctic_sea', 'wreck_atoll', 'galapagos_upwelling'];
  for (const bId of surfBiomes) {
    const sb = OC.Biomes.setActive(bId);
    assert(sb.encyclopedia.research_vessel, `${bId} missing encyclopedia.research_vessel`);
    assert(sb.encyclopedia.seabird, `${bId} missing encyclopedia.seabird`);
    assert(sb.encyclopedia.dolphin, `${bId} missing encyclopedia.dolphin`);
    if (bId === 'great_barrier_reef' || bId === 'wreck_atoll') {
      assert(sb.encyclopedia.flying_fish, `${bId} missing encyclopedia.flying_fish`);
    }
    const f = OC.FaunaEngine.init(scene, sb);
    const vInfo = f.getVesselInfo();
    assert(vInfo && Number.isFinite(vInfo.x) && Number.isFinite(vInfo.z) && vInfo.deckPos && vInfo.deckPos[1] > 0, `${bId} getVesselInfo must return valid surface deck vantage`);
    assert(sb.getHeight(vInfo.x, vInfo.z) < -12, `${bId} research vessel must anchor in deep water (< -12 m), got ${sb.getHeight(vInfo.x, vInfo.z)}`);

    OC.Navigation.setBiome(sb);
    OC.Navigation.flyTo(vInfo.deckPos[0], vInfo.deckPos[1], vInfo.deckPos[2], vInfo.deckYaw, -0.09);
    for (let s = 0; s < 14; s++) {
      OC.uTime.value += 0.16;
      OC.Navigation.update(0.16, OC.uTime.value, camera, false);
      f.update(0.16, OC.uTime.value, camera.position, 2.0, false);
    }
    assert(camera.position.y > 0.5, `${bId} surface jump to Mother-Ship must climb above sea surface (got y=${camera.position.y.toFixed(2)})`);
  }

  // Hydrothermal vents (abyssal biome) must NOT spawn surface vessels
  const abyssVents = OC.Biomes.setActive('hydrothermal_vents');
  const ventsFauna = OC.FaunaEngine.init(scene, abyssVents);
  assert.equal(ventsFauna.getVesselInfo(), null, 'Deep hydrothermal_vents biome must not have a surface vessel');

  // Verify distinctive bioacoustic voice labels for surface species
  for (const k of ['research_vessel', 'seabird', 'dolphin', 'flying_fish']) {
    assert.notEqual(OC.sound.getVoiceLabel(k), 'Подводный отклик', `Surface key ${k} needs dedicated bioacoustic voice label`);
    OC.sound.playSpeciesVoice(k);
  }
  OC.Biomes.setActive('great_barrier_reef');
  console.log('   Direction 10 Surface World & Expedition Mother-Ship (R/V vessels, seabirds, dolphins, flying fish, surface jump & voices) verified.');
}
