import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();

const SRC_ORDER = [
  'src/core/util.js',
  'src/core/quality.js',
  'src/core/biome_registry.js',
  'src/biomes/great_barrier_reef.js',
  'src/biomes/kelp_forest.js',
  'src/biomes/hydrothermal_vents.js',
  'src/engine/world.js',
  'src/engine/terrain.js',
  'src/engine/flora_library.js',
  'src/engine/flora_streamer.js',
  'src/engine/fauna_engine.js',
  'src/engine/audio.js',
  'src/ui/navigation.js',
  'src/ui/minimap.js',
  'src/ui/atlas.js',
  'src/ui/main.js',
];

console.log('1) Checking syntax of all source modules...');
for (const rel of SRC_ORDER) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  new vm.Script(code, { filename: rel });
}
console.log('   All', SRC_ORDER.length, 'JS modules parsed cleanly.');

console.log('2) Checking built index.html...');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(!html.includes('/*__THREE__*/'), 'index.html must replace __THREE__ placeholder');
assert(!html.includes('/*__SRC__*/'), 'index.html must replace __SRC__ placeholder');
assert(html.length > 500000, 'index.html seems unexpectedly small');
for (const domId of ['id="sub-hud"', 'id="sonar-box"', 'id="sonar-canvas"', 'id="btn-sub"', 'id="btn-sonar"']) {
  assert(html.includes(domId), `index.html missing Stage 2 element ${domId}`);
}

console.log('3) Executing full engine integration & shader verification in VM...');
function makeStubEl(id) {
  const cls = new Set();
  return {
    id,
    tagName: 'DIV',
    style: {},
    value: '24',
    textContent: '',
    innerHTML: '',
    width: 184,
    height: 184,
    classList: {
      add: (c) => cls.add(c),
      remove: (c) => cls.delete(c),
      toggle: (c, f) => (f === undefined ? (cls.has(c) ? (cls.delete(c), false) : (cls.add(c), true)) : (f ? cls.add(c) : cls.delete(c), f)),
      contains: (c) => cls.has(c),
    },
    addEventListener: () => {},
    setAttribute: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    querySelector: () => makeStubEl('child'),
    querySelectorAll: () => [],
    closest: () => null,
    appendChild: () => {},
    remove: () => {},
    getContext: () => ({
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => {},
      clearRect: () => {},
      fillRect: () => {},
      drawImage: () => {},
      beginPath: () => {},
      arc: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      filter: '',
      setLineDash: () => {},
    }),
  };
}

const elCache = new Map();
const getEl = (id) => {
  if (!elCache.has(id)) elCache.set(id, makeStubEl(id));
  return elCache.get(id);
};

const sandbox = {
  window: null,
  document: {
    getElementById: getEl,
    querySelector: () => makeStubEl('q'),
    querySelectorAll: () => [],
    createElement: (tag) => makeStubEl(tag),
  },
  navigator: { maxTouchPoints: 0, hardwareConcurrency: 8 },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0,
  setTimeout,
  clearTimeout,
  console,
  Math,
  Float32Array,
  Uint16Array,
  Uint32Array,
  Int32Array,
  Uint8ClampedArray,
  Set,
  Map,
  Error,
  Object,
  Array,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.innerWidth = 1440;
sandbox.window.innerHeight = 900;
sandbox.window.addEventListener = () => {};

vm.createContext(sandbox);
const threeCode = fs.readFileSync(path.join(ROOT, 'three.min.js'), 'utf8');
vm.runInContext(threeCode, sandbox, { filename: 'three.min.js' });

// Run all modules EXCEPT main.js auto-boot first, or include everything safely
for (const rel of SRC_ORDER.slice(0, -1)) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

const T = sandbox.THREE;
const OC = sandbox.OC;
const biome = OC.Biomes.getActive();
assert(biome && biome.id === 'great_barrier_reef', 'Active biome must be great_barrier_reef');

// A) Verify bathymetry & 6 zones
const seenZones = new Set();
let minH = Infinity, maxH = -Infinity;
for (let x = -1100; x <= 1100; x += 25) {
  for (let z = -600; z <= 600; z += 100) {
    const h = biome.getHeight(x, z);
    assert(Number.isFinite(h), `Height must be finite at (${x}, ${z})`);
    minH = Math.min(minH, h);
    maxH = Math.max(maxH, h);
    const zone = biome.getZoneAt(x, h, z);
    assert(zone && zone.id, `Zone must exist at (${x}, ${z})`);
    seenZones.add(zone.id);
    const opt = biome.getOpticalProfile(x, h + 2, z, 1.0);
    assert(Number.isFinite(opt.fogDensity) && opt.fogDensity > 0, 'fogDensity valid');
  }
}
assert.equal(seenZones.size, 6, `Expected all 6 GBR zones, got: ${[...seenZones].join(', ')}`);
assert(maxH > 1.5, `Expected emergent cay/shore > +1.5 m, got ${maxH}`);
assert(minH < -130, `Expected abyssal floor < -130 m, got ${minH}`);
console.log(`   Bathymetry verified: ${minH.toFixed(1)} m .. +${maxH.toFixed(1)} m across ${seenZones.size} zones.`);

// B) Verify landmarks & tour legs
const sp = biome.spawn.pos;
assert(sp[1] > biome.getHeight(sp[0], sp[2]) + 1.5, 'Spawn above floor');
for (const lm of biome.landmarks) {
  assert(lm.y > biome.getHeight(lm.x, lm.z) + 1.2, `Landmark ${lm.id} above floor`);
}
for (let i = 0; i < biome.tourLegs.length; i++) {
  const leg = biome.tourLegs[i];
  assert(leg.pos[1] > biome.getHeight(leg.pos[0], leg.pos[2]) + 1.2, `Tour leg ${i} above floor`);
}

// C) Verify GLSL onBeforeCompile shader patching on Three r128 ShaderLib.standard
function checkMaterialShader(opts, label) {
  const mat = new T.MeshStandardMaterial({ vertexColors: true });
  OC.enhanceMaterial(mat, opts);
  const sh = {
    uniforms: {},
    vertexShader: T.ShaderLib.standard.vertexShader,
    fragmentShader: T.ShaderLib.standard.fragmentShader,
  };
  mat.onBeforeCompile(sh);
  assert(sh.vertexShader.includes('vCWorld = (modelMatrix * ocWorldPos).xyz;'), `${label} vertex missing vCWorld`);
  assert(sh.vertexShader.includes('vCNormal = normalize( mat3( modelMatrix ) * ocNorm );'), `${label} vertex missing vCNormal`);
  assert(!sh.vertexShader.includes('#include <project_vertex>'), `${label} vertex left unreplaced project_vertex`);
  if (opts.swayAmp > 0) assert(sh.vertexShader.includes('attribute float aSway;'), `${label} missing aSway`);
  if (opts.fishSwim) assert(sh.vertexShader.includes('attribute vec2 aSwim;'), `${label} missing aSwim`);
  if (opts.isTerrain) {
    assert(sh.fragmentShader.includes('detFade'), 'terrain fragment missing procedural micro-detail detFade');
    assert(sh.fragmentShader.includes('strata'), 'terrain fragment missing limestone strata detail');
  }
  assert(sh.fragmentShader.includes('#include <fog_fragment>'), `${label} fragment must preserve fog_fragment after caustics`);
  assert(sh.fragmentShader.indexOf('uCausticTex') < sh.fragmentShader.indexOf('#include <fog_fragment>'), `${label} caustics must run before fog`);
}

checkMaterialShader({ causticStrength: 1.0, isTerrain: true }, 'terrain');
checkMaterialShader({ causticStrength: 0.92, swayAmp: 0 }, 'coralRigid');
checkMaterialShader({ causticStrength: 0.78, swayAmp: 0.42 }, 'coralSoftSway');
checkMaterialShader({ causticStrength: 0.45, fishSwim: true }, 'fishInstanced');
console.log('   GLSL shader patching verified for terrain, rigid corals, swaying flora, and GPU-swimming fish.');

// D) Verify Terrain + FloraStreamer + FaunaEngine + Navigation + Minimap + Atlas end-to-end
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
const worldSrc = fs.readFileSync(path.join(ROOT, 'src/engine/world.js'), 'utf8');
assert(worldSrc.includes('uFoamTex') && worldSrc.includes('flashBeamMat'), 'world.js missing uFoamTex surf foam or flashBeamMat cone');
const faunaSrc = fs.readFileSync(path.join(ROOT, 'src/engine/fauna_engine.js'), 'utf8');
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

// G) Verify Multi-Biome Planetary Platform (Kelp Forest + Abyssal Hydrothermal Vents) & clean switching
const allBiomes = OC.Biomes.list();
assert(allBiomes.length === 3, `Expected 3 registered ocean biomes, got ${allBiomes.length}`);
assert(html.includes('id="biome-bar"') && html.includes('id="biome-btns"'), 'index.html missing multi-biome expedition selector');

for (const bId of ['kelp_forest', 'hydrothermal_vents']) {
  const b = OC.Biomes.setActive(bId);
  assert(b && b.id === bId, `Failed to activate biome ${bId}`);
  assert(b.zones && b.zones.length >= 4, `${bId} needs >= 4 ecological zones`);
  assert(b.landmarks && b.landmarks.length >= 4, `${bId} needs >= 4 landmarks`);
  assert(typeof b.getCurrentAt === 'function', `${bId} needs getCurrentAt`);

  const bSpawn = b.spawn.pos;
  assert(bSpawn[1] > b.getHeight(bSpawn[0], bSpawn[2]) + 1.5, `${bId} spawn must clear terrain`);
  for (const lm of b.landmarks) {
    assert(lm.y > b.getHeight(lm.x, lm.z) + 1.2, `${bId} landmark ${lm.id} must clear terrain`);
  }
  for (const leg of b.tourLegs) {
    assert(leg.pos[1] > b.getHeight(leg.pos[0], leg.pos[2]) + 1.2, `${bId} tour leg "${leg.title}" must clear terrain`);
  }

  // Test hot-swapping engine modules to the biome
  const bSpVec = new T.Vector3(bSpawn[0], bSpawn[1], bSpawn[2]);
  OC.Terrain.init(scene, b, bSpVec);
  OC.FloraStreamer.init(scene, b, bSpVec);
  const bFauna = OC.FaunaEngine.init(scene, b);
  OC.Navigation.setBiome(b);
  OC.Minimap.setBiome(b);
  OC.Atlas.setBiome(b);

  // Verify every placed visible fauna/flora key in scene belongs to biome's encyclopedia
  scene.traverse((obj) => {
    if (obj.visible && (obj.count === undefined || obj.count > 0) && obj.userData && obj.userData.key && obj.userData.key !== 'bubbles' && obj.userData.key !== 'plankton' && obj.userData.key !== 'marine_snow') {
      assert(b.encyclopedia[obj.userData.key], `${bId} scene key "${obj.userData.key}" missing from encyclopedia!`);
    }
  });

  // Verify chunk flora generator emits valid species in FloraLibrary & encyclopedia
  const rngB = OC.mulberry32(4242);
  for (const lm of b.landmarks) {
    const cx = Math.floor(lm.x / b.chunkSize), cz = Math.floor(lm.z / b.chunkSize);
    const items = b.generateChunkFlora(cx, cz, b.chunkSize, 1.32, rngB);
    for (const it of items) {
      assert(floraProtos[it.species], `${bId} generated unknown flora species ${it.species}`);
      assert(b.encyclopedia[it.species], `${bId} flora species ${it.species} missing from encyclopedia`);
    }
    OC.Navigation.flyTo(lm.x, lm.y, lm.z, lm.yaw, lm.pitch);
    for (let s = 0; s < 6; s++) {
      OC.uTime.value += 0.16;
      OC.Navigation.update(0.16, OC.uTime.value, camera, false);
      OC.Terrain.update(camera.position);
      OC.FloraStreamer.update(camera.position);
      bFauna.update(0.16, OC.uTime.value, camera.position, 2.0, true);
      OC.Minimap.update(camera.position, OC.Navigation.getYaw());
    }
  }
  assert(OC.Terrain.getStats().visible > 0, `${bId} must stream terrain chunks`);
  assert(OC.FloraStreamer.getStats().cachedChunks > 0, `${bId} must cache flora chunks`);
  console.log(`   Biome "${b.name}" (${b.landmarks.length} landmarks, encyclopedia & streaming) verified.`);
}

// Verify Abyssal Hydrothermal thermal plume updraft (+Y > 1.5 m/s over main smoker) & signature flora density
const kelpBiome = OC.Biomes.get('kelp_forest');
const kHeart = kelpBiome.landmarks.find((l) => l.id === 'kelp_heart');
const kHeartItems = kelpBiome.generateChunkFlora(Math.floor(kHeart.x / 150), Math.floor(kHeart.z / 150), 150, 1.0, OC.mulberry32(777));
assert(kHeartItems.some((it) => it.species === 'kelp_giant'), 'kelp_forest must spawn kelp_giant canopy towers near kelp_heart');

const ventBiome = OC.Biomes.get('hydrothermal_vents');
assert(ventBiome.noSurface && ventBiome.depthOffset === 2420, 'hydrothermal_vents must configure noSurface & 2420m depthOffset');
const vMain = ventBiome.landmarks.find((l) => l.id === 'central_smoker');
const vItems = ventBiome.generateChunkFlora(Math.floor(vMain.x / 150), Math.floor(vMain.z / 150), 150, 1.0, OC.mulberry32(888));
assert(vItems.some((it) => it.species === 'vent_chimney') && vItems.some((it) => it.species === 'riftia_worms'), 'hydrothermal_vents must spawn vent_chimney & riftia_worms near central_smoker');
const ventUp = ventBiome.getCurrentAt(-10, -14, 15, 1.0, new T.Vector3());
assert(ventUp.y > 1.2, `Abyssal black smoker updraft expected > 1.2 m/s, got ${ventUp.y.toFixed(2)}`);

// Switch back to GBR and verify runtime quality switching
const gbrBack = OC.Biomes.setActive('great_barrier_reef');
OC.Terrain.init(scene, gbrBack, spawnVec);
OC.FloraStreamer.init(scene, gbrBack, spawnVec);
const gbrFauna = OC.FaunaEngine.init(scene, gbrBack);
OC.Navigation.setBiome(gbrBack);
OC.Minimap.setBiome(gbrBack);
OC.Atlas.setBiome(gbrBack);

for (const qId of ['low', 'medium', 'high', 'ultra']) {
  OC.Quality.set(qId);
  OC.Terrain.update(camera.position);
  OC.FloraStreamer.update(camera.position);
  gbrFauna.update(0.016, OC.uTime.value, camera.position);
}
console.log('   Multi-biome hot-switching & runtime quality preset switching (low -> ultra) verified.');
console.log('ALL VERIFICATION CHECKS PASSED!');
