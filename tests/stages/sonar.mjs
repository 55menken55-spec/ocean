// U) Verify Step 4: Multibeam 3D Sonar Bathymetry Scan & Minimap Fog of War
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T, biome, ccBiome, galBiome, getEl, scene } = ctx;
  OC.Minimap.resetFog();
  OC.Minimap.init(getEl('minimap'), galBiome, () => {}, () => {});
  OC.Sonar.init(scene);

  const covSpawn = OC.Minimap.getCoverage();
  assert(covSpawn > 0 && covSpawn < 35, `Initial Fog of War coverage around spawn should be partial (>0%, <35%), got ${covSpawn}%`);

  // Passive movement outside spawn reveals new cells
  OC.Minimap.update(new T.Vector3(360, -24, -120), 0.7);
  const covAfterSwim = OC.Minimap.getCoverage();
  assert(covAfterSwim > covSpawn, `Passive swim must expand revealed Fog of War (${covSpawn}% -> ${covAfterSwim}%)`);

  // Active 3D Multibeam Sonar scan in galapagos_upwelling generates 1496 terrain points & expands swath
  const galScan = OC.Sonar.triggerScan(galBiome, new T.Vector3(-240, -18, 280), 0.4, 165);
  assert(galScan && galScan.pointCount === 1496 && !galScan.hasCeiling, `Open-water multibeam scan must emit 1496 seabed points without ceiling, got ${galScan && galScan.pointCount}`);
  const sState0 = OC.Sonar.getState();
  assert(sState0.active && sState0.pointCount === 1496, 'Sonar state must be active immediately after triggerScan');
  OC.Sonar.update(0.6);
  const sStateMid = OC.Sonar.getState();
  assert(sStateMid.active && sStateMid.waveRadius > 60, `Sonar wave must advance across swath, got ${sStateMid.waveRadius.toFixed(1)} m`);
  const covAfterSonar = OC.Minimap.getCoverage();
  assert(covAfterSonar > covAfterSwim, `Multibeam sonar scan must reveal swath on minimap (${covAfterSwim}% -> ${covAfterSonar}%)`);

  // Dual-pass Multibeam scan inside cenote_caves scans both karst floor AND cave ceiling
  const cenScan = OC.Sonar.triggerScan(ccBiome, new T.Vector3(60, -14, -40), 1.2, 165);
  assert(cenScan && cenScan.hasCeiling && cenScan.pointCount > 1496, `Cenote cave multibeam scan must capture floor + ceiling (>1496 pts), got ${cenScan && cenScan.pointCount}`);

  // Sonar fades cleanly after full duration (~8.5 s)
  for (let k = 0; k < 10; k++) OC.Sonar.update(1.0);
  assert(!OC.Sonar.getState().active, 'Multibeam sonar must deactivate cleanly after duration');

  // Toggle Fog of War flag & persist coverage across biome switches
  OC.Minimap.setFogEnabled(false);
  assert(!OC.Minimap.isFogEnabled(), 'Minimap Fog of War must toggle OFF cleanly');
  OC.Minimap.setFogEnabled(true);
  assert(OC.Minimap.isFogEnabled(), 'Minimap Fog of War must toggle ON cleanly');

  OC.Minimap.setBiome(ccBiome);
  const ccCov = OC.Minimap.getCoverage();
  assert(ccCov > 0 && ccCov < 35, `Each biome maintains independent Fog of War grid (cenote=${ccCov}%)`);
  OC.Minimap.setBiome(galBiome);
  assert.equal(OC.Minimap.getCoverage(), covAfterSonar, 'Returning to galapagos_upwelling must restore exact persisted Fog of War coverage');

  OC.Sonar.clear();
  OC.Biomes.setActive('great_barrier_reef');
  OC.Minimap.setBiome(OC.Biomes.getActive());
  console.log(`   Multibeam 3D Sonar (1496 seabed / ${cenScan.pointCount} cave floor+ceiling pts) & Minimap Fog of War (${covSpawn}% -> ${covAfterSonar}% charted) verified.`);
}
