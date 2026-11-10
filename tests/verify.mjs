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

// Verify all placed fauna objects have encyclopedia keys
scene.traverse((obj) => {
  if (obj.userData && obj.userData.key && obj.userData.key !== 'bubbles' && obj.userData.key !== 'plankton') {
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

// F) Verify runtime quality switching
for (const qId of ['low', 'medium', 'high', 'ultra']) {
  OC.Quality.set(qId);
  OC.Terrain.update(camera.position);
  OC.FloraStreamer.update(camera.position);
  fauna.update(0.016, OC.uTime.value, camera.position);
}
console.log('   Runtime quality preset switching (low -> ultra) verified.');
console.log('ALL VERIFICATION CHECKS PASSED!');
