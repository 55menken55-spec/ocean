// M) Verify Direction 7: Interactive 3D Planet Globe & Guided Scientific Tours (47 stages across 9 biomes)
import assert from 'node:assert/strict';
import { makeStubEl } from '../lib/harness.mjs';

export function run(ctx) {
  const { OC, camera, scene } = ctx;
  assert(OC.Globe && typeof OC.Globe.init === 'function' && typeof OC.Globe.getBeacons === 'function', 'OC.Globe API must be registered');
  assert.equal(typeof OC.sound.tourChime, 'function', 'OC.sound.tourChime required');
  assert.equal(typeof OC.sound.globeWhoosh, 'function', 'OC.sound.globeWhoosh required');
  OC.sound.tourChime(1);
  OC.sound.globeWhoosh();

  let selectedViaGlobe = null;
  OC.Globe.init({
    getActiveBiomeId: () => OC.Biomes.getActive().id,
    getProgress: (id) => OC.Expedition.getBiomeSummary(OC.Biomes.get(id)),
    onSelectBiome: (id, withTour) => { selectedViaGlobe = { id, withTour }; }
  });

  const beacons = OC.Globe.getBeacons();
  assert.equal(beacons.length, 14, '3D Globe must expose 14 expedition beacons');
  let totalTourStages = 0;
  for (const b of OC.Biomes.list()) {
    assert(b.globe && Number.isFinite(b.globe.lat) && Number.isFinite(b.globe.lon), `Biome ${b.id} missing globe coordinates`);
    assert(b.globe.ocean && b.globe.depthSpan && b.globe.tempSpan && b.globe.summary && b.globe.color, `Biome ${b.id} incomplete globe metadata`);
    assert(Array.isArray(b.tourLegs) && b.tourLegs.length >= 4, `Biome ${b.id} must have >= 4 tourLegs`);
    for (const leg of b.tourLegs) {
      assert(leg.title && leg.fact && leg.fact.length > 20, `Tour leg "${leg.title}" in ${b.id} missing scientific fact`);
      assert(Array.isArray(leg.pos) && leg.pos.length === 3 && Array.isArray(leg.look) && leg.look.length === 3, `Invalid coordinates in tour leg ${leg.title}`);
      totalTourStages++;
    }
    const sum = OC.Expedition.getBiomeSummary(b);
    assert(sum.speciesTotal === Object.keys(b.encyclopedia).length && sum.missionsTotal === 4, `getBiomeSummary mismatch for ${b.id}`);
  }
  assert(totalTourStages === 73, `Expected 73 total guided tour stages across 14 biomes, got ${totalTourStages}`);

  for (const bc of beacons) {
    const rad = Math.hypot(bc.x, bc.y, bc.z);
    assert(Math.abs(rad - 1.435) < 0.05, `Beacon ${bc.id} radius out of bounds: ${rad}`);
  }

  OC.Globe.open();
  assert.equal(OC.Globe.isOpen(), true, 'OC.Globe.open() must open modal');
  OC.Globe.focusBiome('wreck_atoll');
  assert.equal(OC.Globe.getSelectedId(), 'wreck_atoll');
  OC.Globe.close();
  assert.equal(OC.Globe.isOpen(), false, 'OC.Globe.close() must close modal');

  // Guided tour navigation controls (stepTour, toggleTourPause, stopTour, getTourState)
  let tourChangeCount = 0;
  const gbrTourB = OC.Biomes.setActive('great_barrier_reef');
  OC.Navigation.init(makeStubEl('scene'), gbrTourB, {
    onTourChange: () => { tourChangeCount++; }
  });
  OC.Navigation.setMode('tour');
  let tState = OC.Navigation.getTourState();
  assert.equal(tState.active, true);
  assert.equal(tState.idx, 0);
  assert.equal(tState.total, gbrTourB.tourLegs.length);
  assert.equal(tState.paused, false);
  assert(tState.leg && tState.leg.fact && tState.leg.fact.length > 20);

  OC.Navigation.update(1.5, 1.5, camera, false);
  const progAfterRun = OC.Navigation.getTourState().progress;
  assert(progAfterRun > 0.05, 'Tour progress must advance while unpaused');

  const nowPaused = OC.Navigation.toggleTourPause();
  assert.equal(nowPaused, true);
  const pBeforePause = OC.Navigation.getTourState().progress;
  OC.Navigation.update(1.5, 3.0, camera, false);
  assert.equal(OC.Navigation.getTourState().progress, pBeforePause, 'Tour progress must freeze while paused');

  OC.Navigation.stepTour(1);
  tState = OC.Navigation.getTourState();
  assert.equal(tState.idx, 1, 'stepTour(1) must advance to leg 1');
  OC.Navigation.stepTour(-1);
  assert.equal(OC.Navigation.getTourState().idx, 0, 'stepTour(-1) must go back to leg 0');

  OC.Navigation.update(0.8, 3.8, camera, false);
  assert(Number.isFinite(camera.position.x) && Number.isFinite(camera.position.y) && Number.isFinite(camera.position.z), 'Tour camera position must stay finite');

  OC.Navigation.stopTour();
  assert.equal(OC.Navigation.getMode(), 'swim');
  assert.equal(OC.Navigation.getTourState().active, false);
  assert(tourChangeCount >= 4, 'onTourChange callback should fire on tour state transitions');

  console.log(`   Direction 7 3D Planet Globe (${beacons.length} beacons, ${totalTourStages} guided tour stages with facts, pause & step controls) verified.`);
}
