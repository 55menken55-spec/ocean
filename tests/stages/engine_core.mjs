// D) Verify Terrain + FloraStreamer + FaunaEngine + Navigation + Minimap + Atlas end-to-end
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { groupSource, ROOT, makeStubEl } from '../lib/harness.mjs';

export function run(ctx) {
  const { OC, T, biome, getEl, html, checkMaterialShader, sp } = ctx;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(60, 1.6, 0.25, 2200);
  const spawnVec = new T.Vector3(sp[0], sp[1], sp[2]);

  OC.Terrain.init(scene, biome, spawnVec);
  OC.FloraStreamer.init(scene, biome, spawnVec);
  const fauna = OC.FaunaEngine.init(scene, biome);

  // Verify all 22 FloraLibrary prototypes have finite bounding spheres & encyclopedia entries
  const floraProtos = OC.FloraLibrary.create();
  for (const spKey of ['island_palm', 'coral_crust', 'crinoid']) {
    assert(floraProtos[spKey], `FloraLibrary missing new species ${spKey}`);
    assert(biome.encyclopedia[spKey], `Encyclopedia missing new species ${spKey}`);
  }
  for (const spKey in floraProtos) {
    for (let vi = 0; vi < floraProtos[spKey].geos.length; vi++) {
      const g = floraProtos[spKey].geos[vi];
      g.computeBoundingSphere();
      assert(Number.isFinite(g.boundingSphere.radius) && g.boundingSphere.radius > 0, `Invalid NaN/zero boundingSphere for ${spKey}[${vi}]`);
    }
  }

  // Verify world.js water foam + volumetric beam + marine snow contracts exist
  const worldSrc = groupSource('engine/world')
  assert(worldSrc.includes('uFoamTex') && worldSrc.includes('flashBeamMat'), 'world.js missing uFoamTex surf foam or flashBeamMat cone');
  const faunaSrc = groupSource('engine/fauna')
  assert(faunaSrc.includes('marine_snow'), 'fauna_engine.js missing marine_snow deep particle layer');

  // Verify all placed visible fauna/flora objects have encyclopedia keys
  scene.traverse((obj) => {
    if (obj.visible && (obj.count === undefined || obj.count > 0) && obj.userData && obj.userData.key && obj.userData.key !== 'bubbles' && obj.userData.key !== 'plankton' && obj.userData.key !== 'marine_snow') {
      assert(biome.encyclopedia[obj.userData.key], `Fauna/Flora object key "${obj.userData.key}" missing from encyclopedia!`);
    }
  });

  OC.Navigation.init(getEl('scene'), biome, {});
  OC.Minimap.init(getEl('minimap'), biome, () => {});
  OC.Atlas.init(biome, () => {});

  // Simulate swimming to every landmark and stepping Terrain, FloraStreamer, FaunaEngine, Navigation
  for (const lm of biome.landmarks) {
    OC.Navigation.flyTo(lm.x, lm.y, lm.z, lm.yaw, lm.pitch);
    for (let step = 0; step < 12; step++) {
      OC.uTime.value += 0.16;
      OC.Navigation.update(0.16, OC.uTime.value, camera, false);
      OC.Terrain.update(camera.position);
      OC.FloraStreamer.update(camera.position);
      fauna.update(0.16, OC.uTime.value, camera.position);
      OC.Minimap.update(camera.position, OC.Navigation.getYaw());
    }
    const fStats = OC.FloraStreamer.getStats();
    const tStats = OC.Terrain.getStats();
    assert(tStats.visible > 0, `Terrain must have visible chunks near ${lm.id}`);
    assert(fStats.cachedChunks > 0, `FloraStreamer must cache chunks near ${lm.id}`);
  }
  console.log('   End-to-end streaming simulation passed across all', biome.landmarks.length, 'Great Barrier Reef landmarks.');

  // Chunk alignment: every built chunk must sit exactly on its grid corner.
  // A half-chunk offset (centre vs corner of the chunk) desyncs the rendered
  // seafloor from the collision/heightfield — the "transparent bottom" bug.
  const chunkOrigins = OC.Terrain.getChunkOrigins();
  assert(chunkOrigins.chunks.length > 0, 'Terrain must expose built chunk origins for the alignment check');
  for (const c of chunkOrigins.chunks) {
    const worldX = c.localX + c.originX;
    const worldZ = c.localZ + c.originZ;
    const expX = c.cx * chunkOrigins.chunkSize;
    const expZ = c.cz * chunkOrigins.chunkSize;
    assert(Math.abs(worldX - expX) < 0.5,
      `Terrain chunk ${c.cx},${c.cz} is offset in X by ${(worldX - expX).toFixed(2)} m — geometry and collision are desynced`);
    assert(Math.abs(worldZ - expZ) < 0.5,
      `Terrain chunk ${c.cx},${c.cz} is offset in Z by ${(worldZ - expZ).toFixed(2)} m — geometry and collision are desynced`);
  }
  console.log(`   Terrain chunk alignment verified (${chunkOrigins.chunks.length} chunks on the ${chunkOrigins.chunkSize} m grid).`);

  // E) Stage 2 verification: faunaPlan, nocturnal fish_lantern, Boids, Navigation vectors, Sonar scan, Audio & Minimap
  assert(biome.faunaPlan && Array.isArray(biome.faunaPlan.schools) && biome.faunaPlan.schools.length >= 16, 'biome.faunaPlan.schools must have >= 16 schools');
  assert(Array.isArray(biome.faunaPlan.cleaningStations) && biome.faunaPlan.cleaningStations.length >= 2, 'biome.faunaPlan.cleaningStations must exist');
  assert(biome.encyclopedia.fish_lantern, 'fish_lantern species must be registered in encyclopedia');
  assert(biome.faunaPlan.schools.some((s) => s.key === 'fish_lantern' && s.biolum), 'faunaPlan must contain bioluminescent fish_lantern school');

  // Navigation vectors & speed
  assert(typeof OC.Navigation.getPitch === 'function', 'Navigation.getPitch required');
  assert(typeof OC.Navigation.getSpeed === 'function', 'Navigation.getSpeed required');
  assert(typeof OC.Navigation.getVelocity === 'function', 'Navigation.getVelocity required');
  const fwd = OC.Navigation.getForward(new T.Vector3());
  assert(Math.abs(fwd.length() - 1) < 1e-4, 'Navigation.getForward must return unit vector');

  // Sonar scanForward against seabed & open water
  const blueHoleLm = biome.landmarks.find((l) => l.id === 'blue_hole');
  const originTest = new T.Vector3(blueHoleLm.x, -10, blueHoleLm.z);
  const downDir = new T.Vector3(0, -1, 0);
  const hitBottom = fauna.scanForward(originTest, downDir, 140);
  assert(hitBottom.hit && hitBottom.kind === 'terrain' && hitBottom.range > 5 && hitBottom.range < 140, 'scanForward must hit seafloor looking downward');
  const upDir = new T.Vector3(0, 1, 0);
  const hitSky = fauna.scanForward(originTest, upDir, 140);
  assert(hitSky.kind === 'none', 'scanForward looking straight up must report none');

  // Nocturnal vs diurnal fauna AI updates + flashlight & diver speed reaction + minimap/audio triggers
  OC.Minimap.triggerPing(blueHoleLm.x, blueHoleLm.z);
  OC.sound.sonarPing(hitBottom.range, hitBottom.hit);
  for (const dayVal of [0.05, 0.5, 0.95]) {
    OC.getPalette().dayW = dayVal;
    OC.getPalette().bioGlow = 1 - dayVal;
    for (let s = 0; s < 10; s++) {
      OC.uTime.value += 0.05;
      fauna.update(0.05, OC.uTime.value, originTest, s % 2 === 0 ? 11.5 : 1.0, dayVal < 0.3);
      OC.sound.update(55, 'blue_hole', dayVal);
      OC.Minimap.update(originTest, OC.Navigation.getYaw());
    }
  }
  console.log('   Stage 2 Boids, faunaPlan, fish_lantern, Navigation, Sonar scanForward, Audio & Minimap verified.');

  // F) Option 2 verification: Tidal currents, upwelling, flow advection, uCurrent coral sway & smart megafauna
  assert(typeof biome.getCurrentAt === 'function', 'biome.getCurrentAt current vector field required');
  assert(typeof OC.Navigation.getCurrent === 'function', 'Navigation.getCurrent required');
  const passLm = biome.landmarks.find((l) => l.id === 'pass');
  const lagoonLm = biome.landmarks.find((l) => l.id === 'bommies');
  const cPass = biome.getCurrentAt(passLm.x, -10, passLm.z, 1.5, new T.Vector3());
  const cLagoon = biome.getCurrentAt(lagoonLm.x, -8, lagoonLm.z, 1.5, new T.Vector3());
  assert(cPass.length() > cLagoon.length() * 2.0 && cPass.length() > 1.0, `Reef Pass current (${cPass.length().toFixed(2)}) must exceed sheltered lagoon (${cLagoon.length().toFixed(2)})`);
  assert(worldSrc.includes('uCurrent') && faunaSrc.includes('uFlowOffset'), 'world.js uCurrent coral lean & fauna_engine.js uFlowOffset advection required');
  assert(biome.faunaPlan.schools.some((s) => s.key === 'fish_orange' && s.hostAnemone), 'Clownfish school must anchor to hostAnemone');
  assert(faunaSrc.includes('breathPhase') && faunaSrc.includes('inspectBlend') && faunaSrc.includes('retract'), 'Megafauna smart AI (turtle breath, shark inspect, moray retract) missing');
  const subHtml = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
  assert(subHtml.includes('id="sub-current"'), 'template.html missing #sub-current HUD readout');
  checkMaterialShader({ causticStrength: 0.78, swayAmp: 0.42 }, 'coralSoftCurrent');
  console.log('   Option 2 ocean currents, particle/sway advection, #sub-current HUD & smart megafauna verified.');
  return { scene, camera, spawnVec, fauna, floraProtos, worldSrc, faunaSrc };
}
