// O) Verify Direction 9: 3D Research ROV «Наутилус-IV», Manipulator Sampling, CTD Profiler & 3D Current Streamlines
import assert from 'node:assert/strict';
import { makeStubEl } from '../lib/harness.mjs';

export function run(ctx) {
  const { OC, T, camera, scene, stubCanvas, worldSrc } = ctx;
  assert(OC.ROV && typeof OC.ROV.init === 'function' && typeof OC.ROV.grabSample === 'function' && typeof OC.ROV.runCtdCast === 'function', 'OC.ROV API required');
  assert.equal(typeof OC.FloraStreamer.findNearest, 'function', 'OC.FloraStreamer.findNearest required');
  assert.equal(typeof OC.Navigation.isRovView, 'function', 'OC.Navigation.isRovView required');
  assert.equal(typeof OC.Navigation.toggleRovView, 'function', 'OC.Navigation.toggleRovView required');
  assert.equal(typeof OC.sound.rovServo, 'function', 'OC.sound.rovServo required');
  assert.equal(typeof OC.sound.ctdCast, 'function', 'OC.sound.ctdCast required');
  assert(worldSrc.includes('isRovView') && worldSrc.includes('rovChase'), 'world.js must mount headlights on ROV nose in 3rd-person view');
  OC.sound.rovServo(true);
  OC.sound.ctdCast();

  const rovGbr = OC.Biomes.setActive('great_barrier_reef');
  const rovSp = new T.Vector3(rovGbr.spawn.pos[0], rovGbr.spawn.pos[1], rovGbr.spawn.pos[2]);
  OC.Terrain.init(scene, rovGbr, rovSp);
  OC.FloraStreamer.init(scene, rovGbr, rovSp);
  OC.Atlas.setBiome(rovGbr);
  OC.Navigation.init(makeStubEl('scene'), rovGbr, {});
  OC.ROV.init(scene);
  OC.ROV.resetForBiome(rovGbr, rovSp);

  const rovMesh = OC.ROV.getMesh();
  assert(rovMesh && rovMesh.children.length >= 6, 'ROV 3D model must assemble hull, frame, dome, props, strobe, and articulated arm');
  assert.equal(rovMesh.userData.rovKey, 'rov_nautilus', 'ROV mesh must use userData.rovKey');

  // Verify 3rd-person ROV Chase Cam trails behind craft and stays above seafloor
  assert.equal(OC.Navigation.toggleRovView(), true);
  for (let i = 0; i < 8; i++) {
    OC.uTime.value += 0.1;
    OC.Navigation.update(0.1, OC.uTime.value, camera, false);
    const cp = OC.Navigation.getPosition();
    OC.ROV.update(0.1, OC.uTime.value, camera, cp, OC.Navigation.getYaw(), OC.Navigation.getPitch(), 6.5, rovGbr, {
      showCraft: true,
      flashOn: true,
      labState: OC.EcoLab.getState()
    });
  }
  const craftPosNow = OC.Navigation.getPosition();
  const chaseDist = camera.position.distanceTo(craftPosNow);
  assert(chaseDist > 4.5 && chaseDist < 12.0, `3rd-person ROV chase cam distance (${chaseDist.toFixed(2)}) out of bounds`);
  assert(camera.position.y >= rovGbr.getHeight(camera.position.x, camera.position.z) + 0.8, 'Chase cam must not clip below seabed');
  assert.equal(rovMesh.visible, true, 'ROV mesh must be visible when showCraft=true');

  // Verify ROV forward (+Z rotated by YXZ) aligns with Navigation.getForward()
  const navFwd = OC.Navigation.getForward(new T.Vector3());
  const meshFwd = new T.Vector3(0, 0, 1).applyEuler(rovMesh.rotation).normalize();
  assert(navFwd.dot(meshFwd) > 0.96, `ROV nose orientation must match navigation forward (dot=${navFwd.dot(meshFwd).toFixed(3)})`);

  // Verify orbit around ROV preserves craft position at orbitTarget
  const craftBeforeOrbit = craftPosNow.clone();
  OC.Navigation.setMode('orbit');
  OC.Navigation.update(0.1, OC.uTime.value, camera, false);
  assert(OC.Navigation.getPosition().distanceTo(craftBeforeOrbit) < 0.5, 'Orbiting in ROV mode must keep craft centered at orbitTarget');
  assert(camera.position.distanceTo(craftBeforeOrbit) > 7.5, 'Orbit camera must circle outside ROV hull');
  OC.Navigation.setMode('swim');

  // Verify 3D ocean current streamlines update cleanly with finite coordinates
  assert.equal(OC.ROV.toggleCurrents(), true);
  for (let i = 0; i < 4; i++) {
    OC.ROV.update(0.05, OC.uTime.value + i * 0.05, camera, craftPosNow, OC.Navigation.getYaw(), OC.Navigation.getPitch(), 4.0, rovGbr, {
      showCraft: true,
      flashOn: false,
      labState: OC.EcoLab.getState()
    });
  }
  let streamNonZero = 0;
  scene.traverse((o) => {
    if (o.isLineSegments && o.userData && o.userData.rovKey === 'rov_fx') {
      const arr = o.geometry.attributes.position.array;
      for (let k = 0; k < arr.length; k++) {
        assert(Number.isFinite(arr[k]), 'Current streamline coordinate must be finite');
        if (Math.abs(arr[k]) > 0.01) streamNonZero++;
      }
    }
  });
  assert(streamNonZero > 50, '3D current streamlines must populate finite flow vectors');

  // Verify robotic manipulator sampling near coral/flora + EcoLab integration + Atlas discovery
  const nearItem = OC.FloraStreamer.findNearest(craftPosNow, 45);
  assert(nearItem && nearItem.species, 'FloraStreamer.findNearest must locate nearby specimen near GBR spawn');
  const sampleNearPos = new T.Vector3(nearItem.x - navFwd.x * 3.5, Math.max(nearItem.y + 1.5, rovGbr.getHeight(nearItem.x, nearItem.z) + 1.7), nearItem.z - navFwd.z * 3.5);
  const smp1 = OC.ROV.grabSample(rovGbr, sampleNearPos, navFwd, OC.EcoLab.getState());
  assert(smp1 && smp1.title && smp1.chemNote && smp1.depthM >= 0, 'grabSample must capture structured sample record');
  assert(OC.ROV.getSamples().length >= 1, 'ROV sample vault must record grabbed sample');

  // Verify CTD vertical water-column casts across GBR, Arctic & Hydrothermal Vents + chart drawing
  const ctdGbr = OC.ROV.runCtdCast(rovGbr, craftPosNow, OC.EcoLab.getState());
  assert(ctdGbr && ctdGbr.bins.length >= 20 && ctdGbr.maxPressureAtm > 1.2, 'GBR CTD cast must profile surface to seabed');
  OC.ROV.drawCtdChart(stubCanvas, ctdGbr.craftDepthM);

  const rovVents = OC.Biomes.setActive('hydrothermal_vents');
  const ctdVents = OC.ROV.runCtdCast(rovVents, new T.Vector3(rovVents.spawn.pos[0], rovVents.spawn.pos[1], rovVents.spawn.pos[2]), OC.EcoLab.getState());
  assert(ctdVents && ctdVents.maxDepthM > 2400 && ctdVents.maxPressureAtm > 240, 'Hydrothermal CTD cast must reflect abyssal >240 atm pressure');

  const rovArctic = OC.Biomes.setActive('arctic_sea');
  const ctdArctic = OC.ROV.runCtdCast(rovArctic, new T.Vector3(rovArctic.spawn.pos[0], rovArctic.spawn.pos[1], rovArctic.spawn.pos[2]), OC.EcoLab.getState());
  assert(ctdArctic && ctdArctic.surfaceTemp < 0, 'Arctic CTD cast must record sub-zero surface water');

  // Clean restore
  OC.ROV.setCurrentsVisible(false);
  OC.Navigation.setRovView(false);
  OC.Biomes.setActive('great_barrier_reef');

  console.log(`   Direction 9 3D ROV «Наутилус-IV» (3rd-person chase/orbit cam, manipulator sampling, CTD casts & 3D current streamlines) verified.`);
}
