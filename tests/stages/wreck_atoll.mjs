// L) Verify 5th Biome: Palau Atoll & Sunken Shipwreck (wreck_atoll, 68m SS Maru, Hammerhead, Golden Jellyfish & 4 new flora prototypes)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T, a, biome, floraProtos, restoreGbr, scene, stubCanvas } = ctx;
  const wreckB = OC.Biomes.setActive('wreck_atoll');
  assert(wreckB && wreckB.id === 'wreck_atoll' && wreckB.minimapTheme === 'atoll', 'wreck_atoll biome must configure atoll theme');
  for (const spKey of ['sargassum', 'wreck_anchor', 'coral_whip', 'seafan_gold']) {
    assert(floraProtos[spKey], `FloraLibrary missing Direction 6 prototype ${spKey}`);
    assert(wreckB.encyclopedia[spKey], `wreck_atoll encyclopedia missing ${spKey}`);
  }

  const wreckZoneSet = new Set();
  let wMinH = Infinity, wMaxH = -Infinity;
  for (let x = -700; x <= 800; x += 60) {
    for (let z = -500; z <= 500; z += 80) {
      const h = wreckB.getHeight(x, z);
      wMinH = Math.min(wMinH, h);
      wMaxH = Math.max(wMaxH, h);
      wreckZoneSet.add(wreckB.getZoneAt(x, h, z).id);
    }
  }
  assert.equal(wreckZoneSet.size, 4, `Expected all 4 wreck_atoll zones, got ${[...wreckZoneSet].join(', ')}`);
  assert(wMaxH > 2.0 && wMinH < -75, `Expected wreck_atoll relief span (+2.. -75 m), got ${wMinH.toFixed(1)} .. +${wMaxH.toFixed(1)}`);

  const wUltraCounts = {};
  for (let cz = -2; cz <= 2; cz++) {
    for (let cx = -2; cx <= 2; cx++) {
      const items = wreckB.generateChunkFlora(cx, cz, 150, 1.32, OC.mulberry32(((cx * 9187) ^ (cz * 3571)) >>> 0));
      for (const it of items) wUltraCounts[it.species] = (wUltraCounts[it.species] || 0) + 1;
    }
  }
  for (const [spKey, cnt] of Object.entries(wUltraCounts)) {
    assert(cnt <= floraProtos[spKey].maxInstances, `wreck_atoll Ultra 5x5 overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
  }
  assert(wUltraCounts.sargassum > 8 && wUltraCounts.seafan_gold > 4, 'wreck_atoll must populate sargassum & seafan_gold');

  const wreckFauna = OC.FaunaEngine.init(scene, wreckB);
  const shipAgent = wreckFauna.agents.find((a) => a.key === 'shipwreck');
  const hammerAgent = wreckFauna.agents.find((a) => a.key === 'shark_hammerhead');
  const gJellyAgent = wreckFauna.agents.find((a) => a.key === 'jelly_golden');
  assert(shipAgent && hammerAgent && gJellyAgent, 'wreck_atoll must instantiate shipwreck, shark_hammerhead & jelly_golden');

  // Camera / Sonar focus & voice check for shipwreck
  const shipAimPos = shipAgent.getPosition().clone().add(new T.Vector3(-18, 4, 0));
  const shipAimDir = shipAgent.getPosition().clone().sub(shipAimPos).normalize();
  const camHitShip = wreckFauna.scanCameraTarget(shipAimPos, shipAimDir, 90);
  assert(camHitShip && camHitShip.hit, 'scanCameraTarget must lock onto wreck_atoll targets near SS Maru');
  assert.equal(OC.sound.getVoiceLabel('shipwreck'), 'Скрип подводного остова');

  // Photo mission verification for Palau Atoll
  const photoShip = OC.Expedition.recordPhoto(stubCanvas, wreckB, { hit: true, key: 'shipwreck', label: 'Затонувшее судно «SS Maru»', latin: 'Искусственный риф', dist: 19, align: 0.94 }, 18.0, 0.9, false);
  assert(photoShip && photoShip.key === 'shipwreck');
  const resWreck = OC.Expedition.evaluateMissions(wreckB, { zoneId: 'wreck_reef', depthM: 18, currentKnots: 0.4, dayW: 0.9, flashOn: false });
  assert(resWreck.list.find((m) => m.id === 'wreck_ship_photo').done, 'Mission wreck_ship_photo must complete after photographing shipwreck');
  OC.Expedition.clearPhotos();

  // Restore GBR cleanly
  OC.Biomes.setActive('great_barrier_reef');
  OC.FaunaEngine.init(scene, restoreGbr);
  OC.Atlas.setBiome(restoreGbr);

  console.log(`   5th Biome "Атолл Палау и Затонувший корабль" (SS Maru 68m, Hammerhead, Golden Jellyfish, 4 new flora prototypes, ${OC.Expedition.MISSIONS.length} total missions) verified.`);
}
