// AC) Verify Stage 3 ROV & Marine Science (Physical Umbilical Tether, Autonomous Buoys & Acoustic Bearing Compass)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC, camera, fx } = ctx; // fx — результат стадии Stage 2 ( FaunaEngine GBR и позиция кита )
  assert(typeof OC.ROV.getTetherState === 'function' && typeof OC.ROV.deployBuoy === 'function' && typeof OC.ROV.recallBuoys === 'function' && typeof OC.ROV.getBuoys === 'function', 'OC.ROV must expose tether & autonomous buoy API');
  assert(typeof OC.Hydrophone.getTrackTarget === 'function', 'OC.Hydrophone must expose getTrackTarget for acoustic bearing navigation');

  const gbrS3 = OC.Biomes.get('great_barrier_reef');
  OC.ROV.resetForBiome(gbrS3, new T.Vector3(0, -10, 0));
  const shipRef = OC.faunaInfo && OC.faunaInfo.vessel ? OC.faunaInfo.vessel : { x: 0, z: 0 };
  OC.ROV.update(0.05, 2.0, camera, new T.Vector3(shipRef.x + 24, -12, shipRef.z + 12), 0, 0, 2.0, gbrS3, { showCraft: true, flashOn: true });
  const tNear = OC.ROV.getTetherState();
  assert(tNear.active && tNear.lengthM > 0 && tNear.tensionPct < 62 && tNear.status === 'норма', `Expected normal umbilical tether near ship/mooring, got ${JSON.stringify(tNear)}`);

  OC.ROV.update(0.05, 2.1, camera, new T.Vector3(shipRef.x + 1140, -20, shipRef.z), 0, 0, 3.0, gbrS3, { showCraft: true, flashOn: false });
  const tCrit = OC.ROV.getTetherState();
  assert(tCrit.active && tCrit.tensionPct >= 88 && tCrit.status === 'предел', `Expected critical umbilical tension at extreme range, got ${JSON.stringify(tCrit)}`);

  const b1 = OC.ROV.deployBuoy(gbrS3, new T.Vector3(-18, -9, 14), 0.5);
  const b2 = OC.ROV.deployBuoy(gbrS3, new T.Vector3(160, -18, 22), 1.2);
  const b3 = OC.ROV.deployBuoy(gbrS3, new T.Vector3(240, -12, -30), 2.1);
  assert(b1 && b2 && b3 && OC.ROV.getBuoys().length === 2, 'Autonomous benthic buoys must cap cleanly at MAX_BUOYS = 2');

  // Deploy buoy right next to a whale/orca/hydrothermal vent and listen from far away via remote buoy telemetry
  OC.Hydrophone.setOpen(true);
  for (let s = 0; s < 6; s++) OC.Hydrophone.update(0.1, gbrS3, fx.gbrFxFauna, new T.Vector3(-420, -10, -420), Math.PI, 10, 0.0);
  OC.ROV.deployBuoy(gbrS3, fx.wPos, 0.0);
  const hRelay = OC.Hydrophone.update(0.08, gbrS3, fx.gbrFxFauna, new T.Vector3(-420, -10, -420), Math.PI * 0.5, 10, 0.0);
  assert(hRelay.sources.some((s) => s.viaBuoy), 'Hydrophone must relay remote acoustic signatures from deployed ROV buoy');
  const track = OC.Hydrophone.getTrackTarget();
  assert(track && track.active && Number.isFinite(track.bearingDeg) && Number.isFinite(track.relBearingDeg) && track.relBearingDeg >= -180 && track.relBearingDeg <= 180, `Hydrophone bearing compass target invalid: ${JSON.stringify(track)}`);

  assert.equal(OC.ROV.recallBuoys(), 2, 'recallBuoys must retrieve all active buoys');
  assert.equal(OC.ROV.getBuoys().length, 0, 'Buoy array must be empty after recall');
  OC.Hydrophone.setOpen(false);
  console.log(`   Stage 3 ROV & Marine Science (Umbilical Tether ${tNear.lengthM}m -> ${tCrit.tensionPct}%, Autonomous Buoys & Hydrophone Bearing ${track.bearingDeg}°) verified.`);

}
