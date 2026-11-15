// J) Verify Direction 4 (3D Atlas Previews across all 91 encyclopedia species, Species Voices, Cinema Mode & Filters, Gamepad + Virtual Stick)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T, camera, gbrBack, sandbox } = ctx;
  assert(typeof OC.FaunaEngine.createPreviewMesh === 'function', 'OC.FaunaEngine.createPreviewMesh required');
  assert(typeof OC.sound.playSpeciesVoice === 'function' && typeof OC.sound.getVoiceLabel === 'function', 'OC.sound.playSpeciesVoice & getVoiceLabel required');
  let previewTestedCount = 0;
  const tmpPreviewBox = new T.Box3();
  const tmpPreviewSize = new T.Vector3();
  for (const b of OC.Biomes.list()) {
    for (const k of Object.keys(b.encyclopedia)) {
      const obj = OC.FaunaEngine.createPreviewMesh(k, b);
      assert(obj, `createPreviewMesh returned null for ${b.id}:${k}`);
      obj.traverse((ch) => {
        if (ch.isMesh && ch.geometry) {
          ch.geometry.computeBoundingSphere();
          assert(Number.isFinite(ch.geometry.boundingSphere.radius) && ch.geometry.boundingSphere.radius > 0, `NaN/zero boundingSphere in ${b.id}:${k}`);
        }
      });
      tmpPreviewBox.setFromObject(obj);
      tmpPreviewBox.getSize(tmpPreviewSize);
      assert(
        Number.isFinite(tmpPreviewSize.x) && Number.isFinite(tmpPreviewSize.y) && Number.isFinite(tmpPreviewSize.z) &&
        Math.max(tmpPreviewSize.x, tmpPreviewSize.y, tmpPreviewSize.z) > 0.2,
        `Invalid 3D preview Box3 for ${b.id}:${k}: ${tmpPreviewSize.toArray()}`
      );
      assert(OC.sound.getVoiceLabel(k).length > 2, `Missing voice label for ${k}`);
      previewTestedCount++;
    }
  }
  assert(previewTestedCount >= 90, `Expected >= 90 encyclopedia species 3D previews tested, got ${previewTestedCount}`);

  // Cinema filters
  assert(Array.isArray(OC.Expedition.FILTERS) && OC.Expedition.FILTERS.length >= 5, 'Expected >= 5 camera/cinema color filters');
  assert.equal(OC.Expedition.getFilter().id, 'none');
  const fNext = OC.Expedition.cycleFilter();
  assert.equal(fNext.id, 'natgeo');
  assert.equal(OC.Expedition.setFilter('biolum').id, 'biolum');
  assert.equal(OC.Expedition.setFilter('none').id, 'none');

  // Cinema mode navigation + Virtual stick + Gamepad polling
  OC.Navigation.setBiome(gbrBack);
  OC.Navigation.setMode('cinema');
  assert.equal(OC.Navigation.getMode(), 'cinema');
  const cinemaPos0 = OC.Navigation.getPosition().clone();
  for (let s = 0; s < 10; s++) {
    OC.Navigation.update(0.1, 10 + s * 0.1, camera, false);
  }
  assert(OC.Navigation.getPosition().distanceTo(cinemaPos0) > 0.2, 'Cinema cruise mode must smoothly move camera');
  OC.Navigation.setMode('swim');

  // Test virtual touch joystick & Gamepad API polling
  OC.Navigation.setVirtualInput(0.5, 0.85, -0.3);
  OC.Navigation.update(0.1, 12.0, camera, false);
  assert(OC.Navigation.getSpeed() > 0.5, 'Virtual touch joystick must propel diver');
  OC.Navigation.setVirtualInput(0, 0, 0);

  sandbox.navigator.getGamepads = () => [{
    connected: true,
    axes: [0.4, -0.7, 0.25, -0.15],
    buttons: Array.from({ length: 10 }, (_, idx) => ({ pressed: idx === 0, value: idx === 7 ? 0.5 : (idx === 0 ? 1 : 0) }))
  }];
  OC.Navigation.update(0.1, 12.2, camera, false);
  assert.equal(OC.Navigation.getGamepadActive(), true, 'Gamepad API must detect connected controller');
  sandbox.navigator.getGamepads = () => [];
  OC.Navigation.update(0.05, 12.3, camera, false);
  assert.equal(OC.Navigation.getGamepadActive(), false);

  console.log(`   Direction 4 3D Atlas (${previewTestedCount} species meshes & voices), Cinema mode, 5 color filters, Virtual Stick & Gamepad verified.`);
}
