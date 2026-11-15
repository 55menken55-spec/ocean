// H) Verify Direction 1 + All 10 Biome Missions (Camera, 40 Scientific Missions, Minimap Waypoints, Persistence)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, arcticBiome, biome, camera, gbrBack, gbrFauna, getEl, memStorage, scene } = ctx;
  assert(OC.Expedition && Array.isArray(OC.Expedition.MISSIONS), 'OC.Expedition module required');
  assert.equal(OC.Expedition.MISSIONS.length, 56, `Expected 56 missions (4 per biome), got ${OC.Expedition.MISSIONS.length}`);
  for (const b of OC.Biomes.list()) {
    const bMissions = OC.Expedition.MISSIONS.filter((m) => m.biomeId === b.id);
    assert.equal(bMissions.length, 4, `Expected 4 missions for ${b.id}, got ${bMissions.length}`);
    for (const m of bMissions) {
      assert(b.landmarks.some((l) => l.id === m.landmarkId), `Mission ${m.id} references unknown landmark ${m.landmarkId}`);
    }
  }

  // Photo mode, FOV zoom & camera autofocus targeting
  assert.equal(OC.Expedition.isPhotoMode(), false);
  assert.equal(OC.Expedition.setPhotoMode(true), true);
  const zoomedFov = OC.Expedition.adjustZoom(-20);
  assert(zoomedFov < 60 && zoomedFov >= 24, `Zoomed FOV out of range: ${zoomedFov}`);
  assert.equal(typeof gbrFauna.scanCameraTarget, 'function', 'FaunaEngine.scanCameraTarget required');
  assert.equal(typeof OC.sound.shutter, 'function', 'OC.sound.shutter required');
  assert.equal(typeof OC.sound.missionChime, 'function', 'OC.sound.missionChime required');

  // Recording photo updates gallery, Atlas discovery, and mission progression
  const stubCanvas = getEl('scene');
  const photoWhale = OC.Expedition.recordPhoto(stubCanvas, gbrBack, { hit: true, key: 'whale_humpback', label: 'Горбатый кит', latin: 'Megaptera novaeangliae', dist: 14, align: 0.96 }, 18.2, 1.0, false);
  assert(photoWhale && photoWhale.key === 'whale_humpback' && photoWhale.score >= 70, 'recordPhoto must compute high score for close centered whale');
  const photoLantern = OC.Expedition.recordPhoto(stubCanvas, gbrBack, { hit: true, key: 'fish_lantern', label: 'Рыба-фонарик', latin: 'Anomalopidae', dist: 11, align: 0.9 }, 58.0, 0.1, true);
  assert(OC.Expedition.getPhotos().some((p) => p.id === photoWhale.id), 'Recorded photo must appear in gallery');
  const resGbr = OC.Expedition.evaluateMissions(gbrBack, { zoneId: 'dropoff', depthM: 64, currentKnots: 0.4, dayW: 0.1, flashOn: true });
  assert(resGbr.list.find((m) => m.id === 'gbr_whale_photo').done, 'Mission gbr_whale_photo must complete after photographing whale_humpback');
  assert(resGbr.list.find((m) => m.id === 'gbr_night_bio').done, 'Mission gbr_night_bio must complete in deep night with fish_lantern & flashlight');
  const photoNarwhal = OC.Expedition.recordPhoto(stubCanvas, arcticBiome, { hit: true, key: 'narwhal', label: 'Нарвал', latin: 'Monodon monoceros', dist: 12, align: 0.94 }, 15.0, 0.8, false);
  assert(photoNarwhal && photoNarwhal.key === 'narwhal', 'recordPhoto must log Arctic narwhal');
  const resArc = OC.Expedition.evaluateMissions(arcticBiome, { zoneId: 'iceberg_alley', depthM: 15, currentKnots: 0.5, dayW: 0.8, flashOn: false });
  assert(resArc.list.find((m) => m.id === 'arc_narwhal_photo').done, 'Mission arc_narwhal_photo must complete after photographing narwhal');
  OC.Expedition.clearPhotos();
  assert.equal(OC.Expedition.getPhotos().length, 0);

  // Waypoints set/get/clear & localStorage persistence
  const wp = OC.Expedition.setWaypoint('kelp_forest', -40, 85, 'Каньон');
  assert(wp && wp.x === -40 && wp.z === 85, 'setWaypoint must store coordinates');
  assert.equal(OC.Expedition.getWaypoint('kelp_forest').label, 'Каньон');
  OC.Expedition.clearWaypoint('kelp_forest');
  assert.equal(OC.Expedition.getWaypoint('kelp_forest'), null);
  assert(memStorage.has('oc_ocean_expedition_v1'), 'Expedition state must persist into localStorage');
  OC.Expedition.saveQuality('high');
  assert.equal(OC.Expedition.getSavedQuality(), 'high');
  OC.Expedition.setPhotoMode(false);
  console.log(`   Direction 1 Explorer Gameplay & Missions (Photo camera, ${OC.Expedition.MISSIONS.length} total missions, waypoints & localStorage persistence) verified.`);
  return { stubCanvas };
}
