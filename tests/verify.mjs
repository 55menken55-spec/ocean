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
  'src/biomes/arctic_sea.js',
  'src/biomes/wreck_atoll.js',
  'src/biomes/mariana_trench.js',
  'src/biomes/brine_pool.js',
  'src/engine/weather.js',
  'src/engine/eco_lab.js',
  'src/engine/world.js',
  'src/engine/terrain.js',
  'src/engine/flora_library.js',
  'src/engine/flora_streamer.js',
  'src/engine/fauna_engine.js',
  'src/engine/audio.js',
  'src/engine/rov.js',
  'src/ui/expedition.js',
  'src/ui/navigation.js',
  'src/ui/minimap.js',
  'src/ui/atlas.js',
  'src/ui/globe.js',
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
for (const domId of [
  'id="sub-hud"', 'id="sonar-box"', 'id="sonar-canvas"', 'id="btn-sub"', 'id="btn-sonar"',
  'id="btn-cam"', 'id="btn-journal"', 'id="cam-hud"', 'id="cam-flash"', 'id="cam-preview"', 'id="journal-modal"', 'id="tele-wp"',
  'id="lens-fx"', 'id="weather-btns"', 'id="tele-weather"',
  'id="atlas-3d"', 'id="atlas-viewer"', 'id="btn-cinema"', 'id="cinema-bars"', 'id="cinema-hud"', 'id="touch-stick"',
  'data-cat="Артефакты"',
  'id="btn-globe"', 'id="globe-modal"', 'id="globe-3d"', 'id="guide-card"', 'id="guide-prev"', 'id="guide-pause"', 'id="guide-next"', 'id="guide-exit"',
  'id="btn-lab"', 'id="lab-panel"', 'id="lab-chart"', 'id="lab-health-num"', 'id="lab-s-temp"', 'id="lab-s-ph"', 'id="lab-s-nutr"', 'id="lab-s-curr"',
  'id="btn-rov"', 'id="rov-panel"', 'id="rov-ctd-chart"', 'id="rov-samples"', 'id="rov-btn-chase"', 'id="rov-btn-currents"', 'id="rov-btn-sample"', 'id="rov-btn-ctd"', 'id="rov-btn-vessel"'
]) {
  assert(html.includes(domId), `index.html missing required element ${domId}`);
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
    toDataURL: (mime) => `data:${mime || 'image/png'};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk`,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    querySelector: () => makeStubEl('child'),
    querySelectorAll: () => [],
    closest: () => null,
    appendChild: () => {},
    remove: () => {},
    getContext: () => ({
      createLinearGradient: () => ({ addColorStop: () => {} }),
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
      fillText: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      fillStyle: '',
      strokeStyle: '',
      font: '',
      lineWidth: 1,
      lineJoin: 'round',
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

const memStorage = new Map();
const sandbox = {
  window: null,
  document: {
    body: makeStubEl('body'),
    getElementById: getEl,
    querySelector: () => makeStubEl('q'),
    querySelectorAll: () => [],
    createElement: (tag) => makeStubEl(tag),
  },
  localStorage: {
    getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null),
    setItem: (k, v) => memStorage.set(k, String(v)),
    removeItem: (k) => memStorage.delete(k),
  },
  navigator: { maxTouchPoints: 0, hardwareConcurrency: 8 },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
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
  if (opts.bleachable) {
    assert(sh.fragmentShader.includes('uBleachable') && sh.fragmentShader.includes('uBleach'), `${label} missing coral bleaching GLSL uniforms`);
  }
  assert(sh.fragmentShader.includes('#include <fog_fragment>'), `${label} fragment must preserve fog_fragment after caustics`);
  assert(sh.fragmentShader.indexOf('uCausticTex') < sh.fragmentShader.indexOf('#include <fog_fragment>'), `${label} caustics must run before fog`);
}

checkMaterialShader({ causticStrength: 1.0, isTerrain: true }, 'terrain');
checkMaterialShader({ causticStrength: 0.92, swayAmp: 0, bleachable: true }, 'coralRigid');
checkMaterialShader({ causticStrength: 0.78, swayAmp: 0.42, bleachable: true }, 'coralSoftSway');
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

// G) Verify Multi-Biome Planetary Platform (Kelp Forest, Hydrothermal Vents, Arctic Sea, Wreck Atoll, Mariana Trench & Brine Pool) & clean switching
const allBiomes = OC.Biomes.list();
assert(allBiomes.length === 7, `Expected 7 registered ocean biomes, got ${allBiomes.length}`);
assert(html.includes('id="biome-bar"') && html.includes('id="biome-btns"'), 'index.html missing multi-biome expedition selector');
assert(worldSrc.includes('uAurora'), 'world.js missing uAurora northern lights shader');

for (const bId of ['kelp_forest', 'hydrothermal_vents', 'arctic_sea', 'wreck_atoll', 'mariana_trench', 'brine_pool']) {
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

// Verify Arctic Sea specifics: polar temperature < -1.0C, aurora, ice_floe/iceberg/brinicle/kelp_arctic & Ultra 5x5 capacity
const arcticBiome = OC.Biomes.get('arctic_sea');
assert(arcticBiome && arcticBiome.hasAurora, 'arctic_sea must configure hasAurora');
assert(arcticBiome.getTemperatureAt(0, 65, arcticBiome.zones[3]) < -1.0, 'arctic_sea polar temperature must be sub-zero');
assert(typeof OC.sound.belugaCall === 'function' && typeof OC.sound.iceCrack === 'function', 'Arctic sound effects belugaCall & iceCrack required');
for (const spKey of ['ice_floe', 'iceberg', 'brinicle', 'kelp_arctic', 'coral_arctic_soft', 'anemone_arctic']) {
  assert(floraProtos[spKey], `FloraLibrary missing Arctic species ${spKey}`);
  assert(arcticBiome.encyclopedia[spKey], `arctic_sea encyclopedia missing ${spKey}`);
}
const arcUltraCounts = {};
for (let cz = -2; cz <= 2; cz++) {
  for (let cx = -2; cx <= 2; cx++) {
    const items = arcticBiome.generateChunkFlora(cx, cz, 150, 1.32, OC.mulberry32(((cx * 73856093) ^ (cz * 19349663)) >>> 0));
    for (const it of items) arcUltraCounts[it.species] = (arcUltraCounts[it.species] || 0) + 1;
  }
}
for (const [spKey, cnt] of Object.entries(arcUltraCounts)) {
  assert(cnt <= floraProtos[spKey].maxInstances, `Arctic Ultra 5x5 pool overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
}
assert(arcUltraCounts.ice_floe > 10 && arcUltraCounts.kelp_arctic > 15, 'arctic_sea must generate ice_floe and kelp_arctic');
console.log('   Arctic Sea polar fauna, Aurora Borealis, negative water temp & Ultra 5x5 flora pools verified.');

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

// H) Verify Direction 1 + Arctic + Wreck Atoll + Mariana Trench + Brine Pool Missions (Camera, 28 Scientific Missions, Minimap Waypoints, Persistence)
assert(OC.Expedition && Array.isArray(OC.Expedition.MISSIONS), 'OC.Expedition module required');
assert.equal(OC.Expedition.MISSIONS.length, 28, `Expected 28 missions (4 per biome), got ${OC.Expedition.MISSIONS.length}`);
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
console.log('   Direction 1 Explorer Gameplay & Arctic Missions (Photo camera, 16 missions, waypoints & localStorage persistence) verified.');

// I) Verify Direction 3 (Weather, Volumetric 3D God Rays, Storm Waves, Snell Dispersion, Noctiluca Trail & Thunder)
assert(OC.Weather && typeof OC.Weather.setMode === 'function', 'OC.Weather module required');
assert(worldSrc.includes('CylinderGeometry') && worldSrc.includes('uWaveAmp') && worldSrc.includes('prismBand'), 'world.js missing 3D God Rays CylinderGeometry, uWaveAmp storm waves or Snell chromatic prismBand');
assert(worldSrc.includes('uStorm') && worldSrc.includes('uLightning') && worldSrc.includes('uSnowMode'), 'world.js missing storm/lightning sky uniforms or uSnowMode precipitation');
assert(faunaSrc.includes('makeBiolumTrail') && faunaSrc.includes('aBorn'), 'fauna_engine.js missing Noctiluca bioluminescence trail');
assert(typeof OC.sound.thunder === 'function', 'OC.sound.thunder required');

let thunderFired = 0;
OC.Weather.onThunder(() => { thunderFired++; });
assert.equal(OC.Weather.setMode('storm'), 'storm');
const testCamPos = new T.Vector3(0, 2.5, 0);
let stRes = null;
for (let step = 0; step < 30; step++) {
  stRes = OC.Weather.update(0.25, 10 + step * 0.25, testCamPos, gbrBack);
}
assert(stRes.stormMix > 0.85, `Expected stormMix > 0.85 after storm ramp, got ${stRes.stormMix}`);
assert(stRes.waveAmp > 1.8, `Expected waveAmp > 1.8 in storm, got ${stRes.waveAmp}`);
assert(stRes.precip > 0.6, `Expected precip > 0.6 in storm, got ${stRes.precip}`);
assert(stRes.droplets > 0.25, `Expected surface droplets > 0.25 in storm, got ${stRes.droplets}`);
assert(thunderFired >= 1, `Expected thunder callback at least once during storm, got ${thunderFired}`);
assert.equal(OC.Weather.getLabel(arcticBiome), 'Снежный буран');
assert.equal(OC.Weather.getLabel(gbrBack), 'Шторм и ливень');

// Abyssal biome suppresses surface storm weather
const ventsB = OC.Biomes.list().find((b) => b.id === 'hydrothermal_vents');
const ventWeather = OC.Weather.update(0.5, 40, new T.Vector3(0, -45, 0), ventsB);
assert.equal(ventWeather.stormMix, 0, 'Abyssal noSurface biome must neutralize stormMix');
assert.equal(ventWeather.precip, 0, 'Abyssal noSurface biome must neutralize precip');

assert.equal(OC.Weather.setMode('calm'), 'calm');
assert.equal(OC.Weather.cycleMode(), 'breeze');
assert.equal(OC.Weather.cycleMode(), 'storm');
assert.equal(OC.Weather.cycleMode(), 'auto');

// Noctiluca bioluminescent trail burst in dark water at swimming speed
OC.getPalette().dayW = 0.05;
OC.getPalette().bioGlow = 0.95;
for (let s = 0; s < 12; s++) {
  OC.uTime.value += 0.08;
  gbrFauna.update(0.08, OC.uTime.value, new T.Vector3(s * 1.2, -12, 0), 7.5, false);
  OC.sound.update(12, 'lagoon', 0.05, 'great_barrier_reef', 0.9);
}
console.log('   Direction 3 Graphics, Weather, Volumetric 3D God Rays, Storm Waves, Noctiluca Trail & Thunder verified.');

// J) Verify Direction 4 (3D Atlas Previews across all 91 encyclopedia species, Species Voices, Cinema Mode & Filters, Gamepad + Virtual Stick)
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

// K) Verify Direction 5 (Living Ecosystem AI: Predator Lunges, Baitball Panic, Whale Breaching & Splash GPU Pool, Porpoising, Cleaning Symbiosis, Phototaxis, Active Sonar Reaction)
assert(faunaSrc.includes('makeSplashSystem') && faunaSrc.includes('lungeTimer') && faunaSrc.includes('notifySonarPing') && faunaSrc.includes('cleanClients'), 'fauna_engine.js missing Direction 5 ecosystem AI features');
const mainSrc = fs.readFileSync(path.join(ROOT, 'src/ui/main.js'), 'utf8');
assert(mainSrc.includes('notifySonarPing') && mainSrc.includes('ECO_LABELS'), 'main.js missing sonar pulse propagation or ecosystem observer HUD labels');
assert(typeof OC.sound.whaleSplash === 'function', 'OC.sound.whaleSplash required');
OC.sound.whaleSplash(45);

assert.equal(typeof gbrFauna.notifySonarPing, 'function', 'fauna.notifySonarPing required');
assert.equal(typeof gbrFauna.getSplashCount, 'function', 'fauna.getSplashCount required');
assert.equal(typeof gbrFauna.getActiveEvent, 'function', 'fauna.getActiveEvent required');

OC.getPalette().dayW = 0.95;
OC.getPalette().bioGlow = 0.05;
const whalePos0 = gbrFauna.whale.getPosition().clone();
const ecoCam = whalePos0.clone().add(new T.Vector3(25, 0, 25));
gbrFauna.notifySonarPing(ecoCam);

let maxWhaleY = -999;
let sawSplash = false;
const sawEvents = new Set();
for (let step = 0; step < 120; step++) {
  OC.uTime.value += 0.15;
  gbrFauna.update(0.15, OC.uTime.value, ecoCam, 2.0, false);
  const wy = gbrFauna.whale.getPosition().y;
  if (wy > maxWhaleY) maxWhaleY = wy;
  if (gbrFauna.getSplashCount() > 0) sawSplash = true;
  const ev = gbrFauna.getActiveEvent();
  if (ev) sawEvents.add(ev);
}
assert(maxWhaleY > 0.5, `Expected humpback whale breach above surface (y > 0.5), got maxWhaleY=${maxWhaleY.toFixed(2)}`);
assert(sawSplash, 'Expected GPU splash particles after whale breach');

// Verify all agent positions and school instance matrices stay finite (zero NaN/Infinity)
for (const ag of gbrFauna.agents) {
  if (ag.getPosition) {
    const p = ag.getPosition();
    assert(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z), `Non-finite position on agent ${ag.key}`);
  }
  if (ag.mesh && ag.mesh.isInstancedMesh) {
    const arr = ag.mesh.instanceMatrix.array;
    for (let k = 0; k < Math.min(arr.length, 64); k++) {
      assert(Number.isFinite(arr[k]), `Non-finite instanceMatrix element in school ${ag.key}`);
    }
  }
}

// Verify porpoising / nocturnal phototaxis across Arctic & Kelp Forest
const kelpB2 = OC.Biomes.setActive('kelp_forest');
const kelpFauna2 = OC.FaunaEngine.init(scene, kelpB2);
OC.getPalette().dayW = 0.15;
for (let step = 0; step < 60; step++) {
  OC.uTime.value += 0.2;
  kelpFauna2.update(0.2, OC.uTime.value, new T.Vector3(0, -10, 0), 2.5, true);
}
for (const ag of kelpFauna2.agents) {
  if (ag.getPosition) {
    const p = ag.getPosition();
    assert(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z), `Non-finite position in kelp_forest ${ag.key}`);
  }
}

// Restore GBR as active biome at end of verification
const restoreGbr = OC.Biomes.setActive('great_barrier_reef');
OC.FaunaEngine.init(scene, restoreGbr);
OC.Atlas.setBiome(restoreGbr);

console.log(`   Direction 5 Living Ecosystem AI (whale breach maxY=${maxWhaleY.toFixed(2)} m, splashes=${sawSplash}, sonar ping, predator lunges, cleaning & events=[${[...sawEvents].join(',')}]) verified.`);

// L) Verify 5th Biome: Palau Atoll & Sunken Shipwreck (wreck_atoll, 68m SS Maru, Hammerhead, Golden Jellyfish & 4 new flora prototypes)
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

// M) Verify Direction 7: Interactive 3D Planet Globe & Guided Scientific Tours (37 stages across 7 biomes)
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
assert.equal(beacons.length, 7, '3D Globe must expose 7 expedition beacons');
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
assert(totalTourStages === 37, `Expected 37 total guided tour stages across 7 biomes, got ${totalTourStages}`);

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

// N) Verify Direction 8: Ecological Lab & Reef Stress-Test (Coral Bleaching GLSL, Acidification, Eutrophication, Currents & Recovery)
assert(OC.EcoLab && typeof OC.EcoLab.applyPreset === 'function' && typeof OC.EcoLab.update === 'function', 'OC.EcoLab API required');
assert(floraProtos.coral_staghorn.mat && floraProtos.coral_staghorn.mat !== floraProtos.wreck_anchor.mat, 'Corals and non-living artifacts must use separate materials (bleachable vs non-bleachable)');
assert.equal(OC.EcoLab.getPresets().length, 4, 'EcoLab must expose 4 presets');

const labGbr = OC.Biomes.setActive('great_barrier_reef');
OC.EcoLab.reset();
let labSt = OC.EcoLab.getState();
assert(labSt.healthIndex > 90 && labSt.bleaching < 0.05, 'Initial EcoLab state must be healthy');

// Trigger El Nino heatwave at 20x timelapse and observe bleaching + health decline
OC.EcoLab.applyPreset('heatwave');
OC.EcoLab.setParam('timeScale', 20);
for (let i = 0; i < 40; i++) labSt = OC.EcoLab.update(0.1, labGbr, 0.95);
assert(labSt.bleaching > 0.55, `Expected significant coral bleaching under heatwave, got ${labSt.bleaching.toFixed(2)}`);
assert(labSt.healthIndex < 72, `Expected healthIndex drop under heatwave, got ${labSt.healthIndex.toFixed(1)}`);
assert(OC.EcoLab.getHistoryCount() > 5, 'EcoLab circular history buffer must accumulate samples');

// Switch to upwelling recovery and verify coral pigment recovery
const bleachPeak = labSt.bleaching;
OC.EcoLab.applyPreset('upwelling');
for (let i = 0; i < 65; i++) labSt = OC.EcoLab.update(0.1, labGbr, 0.95);
assert(labSt.bleaching < bleachPeak - 0.35, `Expected coral recovery under upwelling, peak=${bleachPeak.toFixed(2)} now=${labSt.bleaching.toFixed(2)}`);
assert(labSt.healthIndex > 85, `Expected healthIndex recovery > 85, got ${labSt.healthIndex.toFixed(1)}`);

// Test acidification + algal bloom hypoxia preset
OC.EcoLab.applyPreset('acid_hypoxia');
for (let i = 0; i < 35; i++) labSt = OC.EcoLab.update(0.1, labGbr, 0.4);
assert(labSt.turbidityAdd > 0.005 && labSt.algalTint > 0.4, 'acid_hypoxia must increase water turbidity & algal tint');
assert(labSt.dissolvedO2 < 5.5 && labSt.calcification < 55 && labSt.fishActivity < 0.95, 'acid_hypoxia must suppress O2, calcification & fishActivity');

// Test EcoLab chart rendering & clean reset
OC.EcoLab.drawChart(stubCanvas);
OC.EcoLab.reset();
assert(OC.EcoLab.getState().bleaching === 0 && OC.EcoLab.getState().currentMult === 1.0, 'EcoLab.reset() must restore baseline');

console.log(`   Direction 8 Ecological Lab (coral bleaching peak=${bleachPeak.toFixed(2)}, upwelling recovery, hypoxia/algal optics & chart) verified.`);

// O) Verify Direction 9: 3D Research ROV «Наутилус-IV», Manipulator Sampling, CTD Profiler & 3D Current Streamlines
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

// P) Verify Direction 10: Surface World & Expedition Mother-Ship (Research Vessel, Seabirds, Dolphins, Flying Fish)
const surfBiomes = ['great_barrier_reef', 'kelp_forest', 'arctic_sea', 'wreck_atoll'];
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

// Q) Verify 6th Biome: Mariana Trench & Whale Fall Oasis (mariana_trench, 10,920 m / ~1085+ atm, Osedax, Hadal Sponge, Serpentinite Seeps, Snailfish, Sea Pig)
const mtBiome = OC.Biomes.setActive('mariana_trench');
assert(mtBiome && mtBiome.noSurface && mtBiome.depthOffset === 10840 && mtBiome.minimapTheme === 'hadal', 'mariana_trench must configure noSurface, 10840 depthOffset & hadal theme');
for (const spKey of ['osedax_plume', 'hadal_sponge', 'serpentinite_vent']) {
  assert(floraProtos[spKey], `FloraLibrary missing hadal species ${spKey}`);
  assert(mtBiome.encyclopedia[spKey], `mariana_trench encyclopedia missing ${spKey}`);
}
for (const fKey of ['whale_fall', 'hadal_snailfish', 'sea_pig', 'amphipod']) {
  assert(mtBiome.encyclopedia[fKey], `mariana_trench encyclopedia missing fauna ${fKey}`);
}

const mtSp = new T.Vector3(mtBiome.spawn.pos[0], mtBiome.spawn.pos[1], mtBiome.spawn.pos[2]);
OC.Terrain.init(scene, mtBiome, mtSp);
OC.FloraStreamer.init(scene, mtBiome, mtSp);
const mtFauna = OC.FaunaEngine.init(scene, mtBiome);
assert.equal(mtFauna.getVesselInfo(), null, 'mariana_trench must not spawn a surface vessel');
const wfAgent = mtFauna.agents.find((a) => a.key === 'whale_fall');
const sfAgent = mtFauna.agents.find((a) => a.key === 'hadal_snailfish');
const spAgent = mtFauna.agents.find((a) => a.key === 'sea_pig');
assert(wfAgent && sfAgent && spAgent, 'mariana_trench must instantiate whale_fall, hadal_snailfish & sea_pig');

const mtUltraCounts = {};
for (let cx = -2; cx <= 2; cx++) {
  for (let cz = -2; cz <= 2; cz++) {
    const items = mtBiome.generateChunkFlora(cx, cz, mtBiome.chunkSize, 1.5, OC.mulberry32(cx * 31 + cz * 97 + 19));
    for (const it of items) mtUltraCounts[it.species] = (mtUltraCounts[it.species] || 0) + 1;
  }
}
for (const [spKey, cnt] of Object.entries(mtUltraCounts)) {
  assert(cnt <= floraProtos[spKey].maxInstances, `mariana_trench Ultra 5x5 overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
}
assert(mtUltraCounts.osedax_plume >= 10 && mtUltraCounts.hadal_sponge >= 10 && mtUltraCounts.serpentinite_vent >= 3, 'mariana_trench must populate osedax_plume, hadal_sponge & serpentinite_vent');

const ctdMt = OC.ROV.runCtdCast(mtBiome, mtSp, OC.EcoLab.getState());
assert(ctdMt && ctdMt.maxDepthM > 10915 && ctdMt.maxPressureAtm > 1080, `Mariana Trench CTD cast must reflect hadal >1080 atm pressure (got ${ctdMt && ctdMt.maxPressureAtm})`);

OC.Biomes.setActive('great_barrier_reef');
console.log(`   6th Biome "Марианская впадина" (10,920 м / ${ctdMt.maxPressureAtm} атм, Whale Fall, Osedax, Caulophacus, Serpentinite Seeps, Snailfish & Sea Pig) verified.`);

// R) Verify 7th Biome: Brine Pool & Twilight Zone (brine_pool, 650 m / ~68 atm, Halocline Lake, Archimedean Buoyancy, Methane Hydrates, Lamellibrachia, Halite, Siphonophore, Oarfish, Chimaera)
const bpBiome = OC.Biomes.setActive('brine_pool');
assert(bpBiome && bpBiome.noSurface && bpBiome.twilightSurface && bpBiome.depthOffset === 610 && bpBiome.minimapTheme === 'brine', 'brine_pool must configure twilightSurface, 610 depthOffset & brine theme');
assert.equal(typeof bpBiome.getBrineSurfaceAt, 'function', 'brine_pool must expose getBrineSurfaceAt');
for (const spKey of ['methane_hydrate', 'cold_tubeworm', 'halite_spire', 'vent_mussels']) {
  assert(floraProtos[spKey], `FloraLibrary missing brine_pool species ${spKey}`);
  assert(bpBiome.encyclopedia[spKey], `brine_pool encyclopedia missing ${spKey}`);
}
for (const fKey of ['brine_pool_lake', 'siphonophore', 'oarfish', 'chimaera', 'myctophid', 'hatchetfish']) {
  assert(bpBiome.encyclopedia[fKey], `brine_pool encyclopedia missing fauna ${fKey}`);
}

const bpZoneHits = new Set([
  bpBiome.getZoneAt(0, -60, -24).id,
  bpBiome.getZoneAt(90, -58, -94).id,
  bpBiome.getZoneAt(205, -26, -165).id,
  bpBiome.getZoneAt(-24, -22, -32).id
]);
assert.equal(bpZoneHits.size, 4, `Expected all 4 brine_pool zones reachable, got ${[...bpZoneHits].join(', ')}`);

const bpSp = new T.Vector3(bpBiome.spawn.pos[0], bpBiome.spawn.pos[1], bpBiome.spawn.pos[2]);
OC.Terrain.init(scene, bpBiome, bpSp);
OC.FloraStreamer.init(scene, bpBiome, bpSp);
const bpFauna = OC.FaunaEngine.init(scene, bpBiome);
assert.equal(bpFauna.getVesselInfo(), null, 'brine_pool must not spawn a surface vessel');
const blAgent = bpFauna.agents.find((a) => a.key === 'brine_pool_lake');
const sphAgent = bpFauna.agents.find((a) => a.key === 'siphonophore');
const oarAgent = bpFauna.agents.find((a) => a.key === 'oarfish');
const chiAgent = bpFauna.agents.find((a) => a.key === 'chimaera');
assert(blAgent && sphAgent && oarAgent && chiAgent, 'brine_pool must instantiate brine_pool_lake, siphonophore, oarfish & chimaera');

// Verify Archimedean Brine Pool Buoyancy prevents sinking to the lake floor (-73 m) and sets isInBrine()
const brineSurface = bpBiome.getBrineSurfaceAt(0, -24);
assert(brineSurface && Math.abs(brineSurface.level - (-62.0)) < 0.2, 'Main brine lake surface must be at -62.0 m');
OC.Navigation.init(makeStubEl('scene'), bpBiome, {});
OC.Navigation.getPosition().set(0, -64.5, -24);
for (let s = 0; s < 12; s++) {
  OC.uTime.value += 0.08;
  OC.Navigation.update(0.08, OC.uTime.value, camera, false);
}
const buoyPos = OC.Navigation.getPosition();
assert(buoyPos.y >= brineSurface.level - 1.15 && buoyPos.y <= brineSurface.level + 0.8, `Brine pool buoyancy must float craft near halocline (${brineSurface.level} m), got y=${buoyPos.y.toFixed(2)}`);
assert.equal(OC.Navigation.isInBrine(), true, 'OC.Navigation.isInBrine() must be true on brine lake surface');

// Verify Ultra 5x5 flora pools for brine_pool never overflow maxInstances
const bpUltraCounts = {};
for (let cx = -2; cx <= 2; cx++) {
  for (let cz = -2; cz <= 2; cz++) {
    const items = bpBiome.generateChunkFlora(cx, cz, bpBiome.chunkSize, 1.5, OC.mulberry32(cx * 31 + cz * 97 + 23));
    for (const it of items) {
      assert(!bpBiome.getBrineSurfaceAt(it.x, it.z), `brine_pool flora ${it.species} must only spawn outside brine lake`);
      bpUltraCounts[it.species] = (bpUltraCounts[it.species] || 0) + 1;
    }
  }
}
for (const [spKey, cnt] of Object.entries(bpUltraCounts)) {
  assert(cnt <= floraProtos[spKey].maxInstances, `brine_pool Ultra 5x5 overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
}
assert(bpUltraCounts.methane_hydrate >= 8 && bpUltraCounts.cold_tubeworm >= 12 && bpUltraCounts.halite_spire >= 10, 'brine_pool must populate methane_hydrate, cold_tubeworm & halite_spire');

const ctdBp = OC.ROV.runCtdCast(bpBiome, bpSp, OC.EcoLab.getState());
assert(ctdBp && ctdBp.maxDepthM > 640 && ctdBp.maxDepthM < 720 && ctdBp.maxPressureAtm > 64 && ctdBp.maxPressureAtm < 75, `Brine Pool CTD cast must reflect ~68 atm pressure (got ${ctdBp && ctdBp.maxPressureAtm})`);

OC.Biomes.setActive('great_barrier_reef');
console.log(`   7th Biome "Соляной бассейн" (650 м / ${ctdBp.maxPressureAtm} атм, Halocline Buoyancy, Hydrates, Lamellibrachia, Siphonophore, Oarfish & Chimaera) verified.`);
console.log('ALL VERIFICATION CHECKS PASSED!');
