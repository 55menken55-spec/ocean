import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();

/* Порядок модулей живёт в build.py (единственный источник правды).
   Здесь он только читается, чтобы сборка и верификация не разъезжались. */
const MODULE_ORDER = JSON.parse(execFileSync('python3', [path.join(ROOT, 'build.py'), '--list'], { encoding: 'utf8' }));
assert(MODULE_ORDER.length > 0, 'build.py --list вернул пустой порядок модулей');
const SRC_ORDER = MODULE_ORDER.map((rel) => path.join('src', rel));

/* Склеивает исходники группы по префиксу из общего порядка модулей:
   новые файлы группы подхватываются автоматически, список не надо править. */
function groupSource(prefix) {
  const files = MODULE_ORDER.filter((rel) => rel.startsWith(prefix));
  assert(files.length > 0, `groupSource: в ORDER нет модулей с префиксом ${prefix}`);
  return files.map((rel) => fs.readFileSync(path.join(ROOT, 'src', rel), 'utf8')).join('\n');
}

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
  'id="btn-rov"', 'id="rov-panel"', 'id="rov-ctd-chart"', 'id="rov-samples"', 'id="rov-btn-chase"', 'id="rov-btn-currents"', 'id="rov-btn-sample"', 'id="rov-btn-ctd"', 'id="rov-btn-vessel"',
  'id="map-cov"', 'id="map-fog-btn"',
  'id="btn-hydro"', 'id="hydro-box"', 'id="hydro-canvas"', 'id="hydro-db"', 'id="hydro-source"', 'id="hydro-band"', 'id="hydro-listen-btn"',
  'id="rov-btn-museum"', 'data-jtab="museum"'
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
  if ((opts.causticStrength === undefined || opts.causticStrength > 0)) {
    assert(sh.fragmentShader.includes('uSunProj') && sh.fragmentShader.includes('causRGB'), `${label} missing chromatic sun-projected caustics`);
  }
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

// G) Verify Multi-Biome Planetary Platform (Kelp Forest, Hydrothermal Vents, Arctic Sea, Wreck Atoll, Mariana Trench, Brine Pool, Cenote Caves & Galapagos Upwelling) & clean switching
const allBiomes = OC.Biomes.list();
assert(allBiomes.length === 13, `Expected 13 registered aquatic biomes, got ${allBiomes.length}`);
assert(html.includes('id="biome-bar"') && html.includes('id="biome-btns"'), 'index.html missing multi-biome expedition selector');
assert(worldSrc.includes('uAurora'), 'world.js missing uAurora northern lights shader');

for (const bId of ['kelp_forest', 'hydrothermal_vents', 'arctic_sea', 'wreck_atoll', 'mariana_trench', 'brine_pool', 'cenote_caves', 'galapagos_upwelling']) {
  const b = OC.Biomes.setActive(bId);
  assert(b && b.id === bId, `Failed to activate biome ${bId}`);
  assert(b.zones && b.zones.length >= 4, `${bId} needs >= 4 ecological zones`);
  assert(b.landmarks && b.landmarks.length >= 4, `${bId} needs >= 4 landmarks`);
  assert(typeof b.getCurrentAt === 'function', `${bId} needs getCurrentAt`);

  const bSpawn = b.spawn.pos;
  assert(bSpawn[1] > b.getHeight(bSpawn[0], bSpawn[2]) + 1.5, `${bId} spawn must clear terrain`);
  if (b.getCeilingHeight) {
    assert(bSpawn[1] < b.getCeilingHeight(bSpawn[0], bSpawn[2]) - 1.5, `${bId} spawn must clear cave ceiling`);
  }
  for (const lm of b.landmarks) {
    assert(lm.y > b.getHeight(lm.x, lm.z) + 1.2, `${bId} landmark ${lm.id} must clear terrain`);
    if (b.getCeilingHeight) {
      assert(lm.y < b.getCeilingHeight(lm.x, lm.z) - 1.5, `${bId} landmark ${lm.id} must clear cave ceiling`);
    }
  }
  for (const leg of b.tourLegs) {
    assert(leg.pos[1] > b.getHeight(leg.pos[0], leg.pos[2]) + 1.2, `${bId} tour leg "${leg.title}" must clear terrain`);
    if (b.getCeilingHeight) {
      assert(leg.pos[1] < b.getCeilingHeight(leg.pos[0], leg.pos[2]) - 1.5, `${bId} tour leg "${leg.title}" must clear cave ceiling`);
    }
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

// Verify submarine volcano prototype: rare warning events (seismic, turbidity, gas, currents)
assert(OC.Volcano && typeof OC.Volcano.init === 'function', 'OC.Volcano prototype must be loaded');
assert(ventBiome.encyclopedia.volcanic_fumarole && ventBiome.encyclopedia.submarine_volcano,
  'hydrothermal_vents encyclopedia must include volcanic_fumarole & submarine_volcano');
const vSite = OC.Volcano.SITE;
const vCrater = ventBiome.getHeight(vSite.x, vSite.z);
assert(vCrater < -20, `Volcano crater floor expected < -20 m, got ${vCrater}`);
const vOn = ventBiome.getHeight(vSite.x + 40, vSite.z);
const vOff = ventBiome.getHeight(vSite.x + 140, vSite.z);
assert(vOn > vOff + 5, `Volcano cone must rise above the surrounding plain (${vOn} vs ${vOff})`);
assert(ventBiome.getZoneAt(vSite.x, -20, vSite.z).id === 'volcano_seamount', 'Volcano must own a dedicated zone');
const vLm = ventBiome.landmarks.find((l) => l.id === 'submarine_volcano');
assert(vLm && vLm.y > ventBiome.getHeight(vLm.x, vLm.z) + 1.2, 'Volcano landmark must clear terrain');
const vVolcItems = ventBiome.generateChunkFlora(Math.floor(vSite.x / 150), Math.floor(vSite.z / 150), 150, 1.0, OC.mulberry32(4242));
assert(vVolcItems.some((it) => it.species === 'volcanic_fumarole'), 'hydrothermal_vents must spawn volcanic_fumarole near the volcano');

// Drive the event machine: idle → seismic → eruption → cooling → idle
const vScene = new T.Scene();
const vCam = new T.Vector3(vSite.x, -18, vSite.z);
const vfx = OC.Volcano.init(vScene, ventBiome, { silt: null, texSoft: OC.circleTexture(64, false), texHard: OC.circleTexture(64, true) });
assert(vfx && OC.Volcano.getState().phase === 'idle', 'Volcano must start idle');
OC.Volcano._forcePhase('seismic');
OC.Volcano.update(31, 100.0, vCam); // exceed 30s herald → eruption
assert(OC.Volcano.getState().phase === 'eruption', 'Seismic herald must transition to eruption');
const _vCur = new T.Vector3();
ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur);
assert(_vCur.y > 1.5, `Volcano eruption updraft expected > 1.5 m/s, got ${_vCur.y.toFixed(2)}`);
const vTremor = OC.Volcano.getTremor();
assert(vTremor.active && vTremor.strength > 0.5, 'Eruption must expose acoustic tremor');
OC.Volcano.update(15, 115.0, vCam); // exceed 14s → cooling
assert(OC.Volcano.getState().phase === 'cooling', 'Eruption must transition to cooling');
OC.Volcano.update(17, 132.0, vCam); // exceed 16s → idle
assert(OC.Volcano.getState().phase === 'idle', 'Volcano must return to idle after cooling');
const _vCur2 = new T.Vector3();
ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur2);
assert(Math.abs(_vCur2.y) < 0.5, 'Volcano must be quiet when idle');

// Dynamic currents: eruption upwelling bursts, vortex swirl around the cone, pulses on seismic
const _vCur3 = new T.Vector3();
OC.Volcano._forcePhase('seismic');
OC.Volcano.update(0.5, 0, camera.position); // mid-progress pulse phase
ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur3);
const seisUp = _vCur3.y;
OC.Volcano._forcePhase('eruption');
ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur3);
const erupUp = _vCur3.y;
assert(erupUp > 1.5 && erupUp > seisUp, `Eruption upwelling burst expected >1.5 m/s & exceed seismic, got ${erupUp.toFixed(2)} vs ${seisUp.toFixed(2)}`);
ventBiome.getCurrentAt(vSite.x + 130, vCrater, vSite.z, 1.0, _vCur3);
const erupX = _vCur3.x, erupZ = _vCur3.z;
const erupHoriz = Math.hypot(erupX, erupZ);
const a = Math.atan2(0, 130); // angle from site to sample
const tang = -Math.sin(a), tang2 = Math.cos(a);
const swirlComp = Math.hypot(erupX * tang + erupZ * tang2, erupX * tang2 - erupZ * tang) / erupHoriz;
assert(swirlComp > 0.3, `Eruption must add vortex swirl tangential component, got ${swirlComp.toFixed(2)} of ${erupHoriz.toFixed(2)}`);
OC.Volcano._forcePhase('seismic');
OC.Volcano.update(0.25, 0, camera.position);
const c1 = ventBiome.getCurrentAt(vSite.x + 150, vCrater, vSite.z, 1.0, new T.Vector3());
OC.Volcano.update(0.42, 0, camera.position);
const c2 = ventBiome.getCurrentAt(vSite.x + 150, vCrater, vSite.z, 1.0, new T.Vector3());
assert(Math.hypot(c1.x, c1.z) !== Math.hypot(c2.x, c2.z), 'Seismic currents must pulse with progress');
OC.Volcano._forcePhase('idle');
ventBiome.getCurrentAt(vSite.x + 130, vCrater, vSite.z, 1.0, _vCur3);
assert(Math.abs(_vCur3.y) < 0.5, `Volcano must be quiet when idle, got ${_vCur3.y.toFixed(2)}`);

// Fauna response: per-phase influence (agitation during precursor, flee during eruption)
const schoolsSrc = groupSource('engine/fauna');
assert(schoolsSrc.includes('ctx.volcano') && schoolsSrc.includes('volcInf'), 'schools.js must react to volcano influence via ctx.volcano');
assert(!OC.Volcano.getInfluence().active, 'Volcano influence must be inactive when idle');
OC.Volcano._forcePhase('seismic');
const vInfSeis = OC.Volcano.getInfluence();
assert(vInfSeis.active && vInfSeis.panic > 0.4 && vInfSeis.panic < 1.2, 'Seismic precursor must agitate schools without full panic');
OC.Volcano._forcePhase('eruption');
const vInfErup = OC.Volcano.getInfluence();
assert(vInfErup.active && vInfErup.panic > 1.5 && vInfErup.strength > 12, 'Eruption must drive strong radial flee');
OC.Volcano._forcePhase('cooling');
assert(OC.Volcano.getInfluence().panic <= 1.2, 'Cooling must decay flee');
// Seismic aftermath + flora damage system
const schoolsSrc2 = groupSource('engine/flora');
assert(schoolsSrc2.includes('getDamageFactor') && schoolsSrc2.includes('_volcDmgColor'),
  'flora_streamer.js must apply volcano damage tint via getDamageFactor');
OC.Volcano._forcePhase('idle');
assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) === 0, 'Volcano damage must be 0 when idle');
OC.Volcano._forcePhase('seismic');
assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) >= 0.2 && OC.Volcano.getDamageFactor(vSite.x, vSite.z) < 0.6,
  'Seismic phase must damage flora near crater (0.2..0.6)');
OC.Volcano._forcePhase('eruption');
assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) === 1.0, 'Eruption must fully damage flora at crater');
const farDmg = OC.Volcano.getDamageFactor(vSite.x + 250, vSite.z);
assert(farDmg === 0, 'Damage must be zero outside influence radius');
OC.Volcano._forcePhase('cooling');
assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) <= 0.7, 'Cooling must restore flora (damage decay)');
OC.Volcano._forcePhase('idle');
OC.Volcano.update(0.1, 0, camera.position);
assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) === 0, 'Damage must clear after event');

// Eruption FX: crater flash spike, shockwave rings, pyroclastic flow
OC.Volcano._forcePhase('eruption');
OC.Volcano.update(0.1, 0, camera.position);
const _vCur4 = new T.Vector3();
ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur4);
const flashPeak = _vCur4.y;
assert(flashPeak > 1.8, `Eruption flash upwelling burst expected >1.8 m/s, got ${flashPeak.toFixed(2)}`);
OC.Volcano.update(0.1, 0.1, camera.position);
OC.Volcano.update(0.1, 0.2, camera.position);
// Shockwave rings active after eruption start
OC.Volcano.update(0.15, 0.3, camera.position);
OC.Volcano._forcePhase('cooling');
OC.Volcano.update(0.5, 1.0, camera.position);
OC.Volcano._forcePhase('idle');
OC.Volcano.update(0.5, 2.0, camera.position);
const _vCur5 = new T.Vector3();
ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur5);
assert(Math.abs(_vCur5.y) < 0.5, `Volcano must be quiet after cooling, got ${_vCur5.y.toFixed(2)}`);

OC.Volcano._forcePhase('idle');
assert(!OC.Volcano.getInfluence().active, 'Influence must deactivate after the event');
assert(ventBiome.faunaPlan.schools.some((s) => s.key === 'vent_shrimp' && Math.abs(s.cx - vSite.x) < 5 && Math.abs(s.cz - vSite.z) < 5),
  'Vent shrimp school must swarm above the volcano crater');
assert(ventBiome.faunaPlan.schools.some((s) => s.key === 'fish_lantern' && Math.abs(s.cx - vSite.x) < 100 && Math.abs(s.cz - vSite.z) < 100),
  'Fish lantern school must patrol volcano flanks');
OC.Volcano.dispose();
console.log('   Submarine volcano: terrain, zones, flora, event machine, currents & fauna response verified.');

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

// H) Verify Direction 1 + All 10 Biome Missions (Camera, 40 Scientific Missions, Minimap Waypoints, Persistence)
assert(OC.Expedition && Array.isArray(OC.Expedition.MISSIONS), 'OC.Expedition module required');
assert.equal(OC.Expedition.MISSIONS.length, 52, `Expected 52 missions (4 per biome), got ${OC.Expedition.MISSIONS.length}`);
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
assert(faunaSrc.includes('makeSplashSystem') && faunaSrc.includes('lungeTimer') && faunaSrc.includes('notifySonarPing') && faunaSrc.includes('cleanClients'), 'fauna_engine modules missing Direction 5 ecosystem AI features');
const mainSrc = fs.readFileSync(path.join(ROOT, 'src/ui/main.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src/ui/hud_panels.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src/ui/panels_service.js'), 'utf8');
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

// M) Verify Direction 7: Interactive 3D Planet Globe & Guided Scientific Tours (47 stages across 9 biomes)
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
assert.equal(beacons.length, 13, '3D Globe must expose 13 expedition beacons');
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
assert(totalTourStages === 67, `Expected 67 total guided tour stages across 13 biomes, got ${totalTourStages}`);

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
const surfBiomes = ['great_barrier_reef', 'kelp_forest', 'arctic_sea', 'wreck_atoll', 'galapagos_upwelling'];
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

// S) Verify 8th Biome: Underwater Karst Caves & Yucatan Cenotes (cenote_caves, 0-58 m, Analytical Cave Ceiling, Halocline & H2S Cloud, Ariadne Guideline, Stalactites/Stalagmites/Vines, Blind Cave Fauna)
const ccBiome = OC.Biomes.setActive('cenote_caves');
assert(ccBiome && ccBiome.shelteredSurface && !ccBiome.noSurface && ccBiome.minimapTheme === 'cenote', 'cenote_caves must expose shelteredSurface & cenote theme');
assert.equal(typeof ccBiome.getCeilingHeight, 'function', 'cenote_caves must expose getCeilingHeight');
assert.equal(typeof ccBiome.isCeilingOpen, 'function', 'cenote_caves must expose isCeilingOpen');
assert.equal(typeof ccBiome.getHaloclineAt, 'function', 'cenote_caves must expose getHaloclineAt');

for (const spKey of ['stalactite', 'stalagmite', 'cenote_vine', 'seagrass']) {
  assert(floraProtos[spKey], `FloraLibrary missing cenote_caves species ${spKey}`);
  assert(ccBiome.encyclopedia[spKey], `cenote_caves encyclopedia missing ${spKey}`);
}
for (const fKey of ['ariadne_line', 'halocline_layer', 'blind_tetra', 'cenote_molly', 'cave_remipede', 'blind_brotula', 'cave_shrimp']) {
  assert(ccBiome.encyclopedia[fKey], `cenote_caves encyclopedia missing fauna/feature ${fKey}`);
}

// Verify open cenote skylights vs submerged karst ceiling and guaranteed navigable clearance >= 7.0 m map-wide
assert.equal(ccBiome.isCeilingOpen(0, 0), true, 'Main cenote sinkhole center must be open to the sky');
assert.equal(ccBiome.isCeilingOpen(210, -185), true, 'Secondary cenote skylight must be open to the sky');
assert.equal(ccBiome.isCeilingOpen(-95, 58), false, 'Stalactite cathedral must be beneath limestone cave ceiling');
assert(ccBiome.getCeilingHeight(-95, 58) < -4.0, 'Stalactite cathedral ceiling must be submerged (< -4 m)');

let minCaveClearance = Infinity;
for (let x = -960; x <= 960; x += 80) {
  for (let z = -960; z <= 960; z += 80) {
    const gap = ccBiome.getCeilingHeight(x, z) - ccBiome.getHeight(x, z);
    if (gap < minCaveClearance) minCaveClearance = gap;
  }
}
assert(minCaveClearance >= 7.0, `cenote_caves minimum ceiling-floor clearance must be >= 7.0 m everywhere (got ${minCaveClearance.toFixed(2)} m)`);

const ccZoneHits = new Set([
  ccBiome.getZoneAt(0, -11, 0).id,
  ccBiome.getZoneAt(-95, -14, 58).id,
  ccBiome.getZoneAt(-210, -22, 130).id,
  ccBiome.getZoneAt(180, -42, 210).id
]);
assert.equal(ccZoneHits.size, 4, `Expected all 4 cenote_caves zones reachable, got ${[...ccZoneHits].join(', ')}`);

const ccSp = new T.Vector3(ccBiome.spawn.pos[0], ccBiome.spawn.pos[1], ccBiome.spawn.pos[2]);
OC.Terrain.init(scene, ccBiome, ccSp);
const ccTStats = OC.Terrain.getStats();
assert(ccTStats.built >= 9, 'cenote_caves terrain chunks (floor + cave ceiling) must build around spawn');
OC.FloraStreamer.init(scene, ccBiome, ccSp);
const ccFauna = OC.FaunaEngine.init(scene, ccBiome);
assert.equal(ccFauna.getVesselInfo(), null, 'cenote_caves must not spawn an ocean research vessel');
const ariadneAgent = ccFauna.agents.find((a) => a.key === 'ariadne_line');
const haloAgent = ccFauna.agents.find((a) => a.key === 'halocline_layer');
const remAgent = ccFauna.agents.find((a) => a.key === 'cave_remipede');
const brotAgent = ccFauna.agents.find((a) => a.key === 'blind_brotula');
assert(ariadneAgent && haloAgent && remAgent && brotAgent, 'cenote_caves must instantiate ariadne_line, halocline_layer, cave_remipede & blind_brotula');

// Verify Navigation clamps smoothly under cave ceiling while allowing surfacing in sunlit cenote, plus halocline detection
OC.Navigation.init(makeStubEl('scene'), ccBiome, {});
OC.Navigation.getPosition().set(-95, -2.0, 58);
OC.Navigation.update(0.05, 1.0, camera, false);
const caveCeilAtCathedral = ccBiome.getCeilingHeight(-95, 58);
assert(OC.Navigation.getPosition().y <= caveCeilAtCathedral - 1.7, `Navigation must clamp craft below cave ceiling (${caveCeilAtCathedral.toFixed(1)} m), got y=${OC.Navigation.getPosition().y.toFixed(2)}`);

OC.Navigation.getPosition().set(0, 4.0, 0);
OC.Navigation.update(0.05, 1.05, camera, false);
assert(OC.Navigation.getPosition().y > 2.5, 'Navigation must allow surfacing up inside open cenote shaft');

OC.Navigation.getPosition().set(-210, -24.5, 130);
OC.Navigation.update(0.05, 1.1, camera, false);
assert.equal(OC.Navigation.isInHalocline(), true, 'OC.Navigation.isInHalocline() must trigger in Angelita halocline cloud');

// Verify Ultra 5x5 flora pools for cenote_caves never overflow maxInstances
const ccUltraCounts = {};
for (let cx = -2; cx <= 2; cx++) {
  for (let cz = -2; cz <= 2; cz++) {
    const items = ccBiome.generateChunkFlora(cx, cz, ccBiome.chunkSize, 1.5, OC.mulberry32(cx * 41 + cz * 83 + 17));
    for (const it of items) ccUltraCounts[it.species] = (ccUltraCounts[it.species] || 0) + 1;
  }
}
for (const [spKey, cnt] of Object.entries(ccUltraCounts)) {
  assert(cnt <= floraProtos[spKey].maxInstances, `cenote_caves Ultra 5x5 overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
}
assert(ccUltraCounts.stalactite >= 15 && ccUltraCounts.stalagmite >= 15 && ccUltraCounts.cenote_vine >= 8, 'cenote_caves must populate stalactite, stalagmite & cenote_vine');

// Verify CTD cast at El Pit captures depth & coastal Yucatan halocline temperature inversion
const ctdCc = OC.ROV.runCtdCast(ccBiome, new T.Vector3(180, -42, 210), OC.EcoLab.getState());
assert(ctdCc && ctdCc.maxDepthM > 52 && ctdCc.maxDepthM < 64 && ctdCc.bottomTemp > ctdCc.surfaceTemp, `Cenote El Pit CTD cast must capture ~58 m depth & thermal inversion (surf=${ctdCc && ctdCc.surfaceTemp}, bot=${ctdCc && ctdCc.bottomTemp})`);

OC.Biomes.setActive('great_barrier_reef');
console.log(`   8th Biome "Юкатанские пещеры и Сеноты" (${ctdCc.maxDepthM} м, Cave Ceiling, Halocline & H₂S Cloud, Ariadne Line, Stalactites & Blind Cave Fauna) verified.`);

// T) Verify 9th Biome: Galapagos Volcanic Upwelling & Darwin's Arch (galapagos_upwelling, 0-132 m, Cromwell Upwelling, Ocean Sunfish, Marine Iguana, Penguin, Orca, Mobula, Blue-footed Booby)
const galBiome = OC.Biomes.setActive('galapagos_upwelling');
assert(galBiome && !galBiome.noSurface && galBiome.minimapTheme === 'galapagos', 'galapagos_upwelling must expose surface ocean & galapagos theme');

for (const spKey of ['volcanic_fumarole', 'tubastraea_coral', 'galapagos_barnacle', 'ulva_turf']) {
  assert(floraProtos[spKey], `FloraLibrary missing galapagos_upwelling species ${spKey}`);
  assert(galBiome.encyclopedia[spKey], `galapagos_upwelling encyclopedia missing ${spKey}`);
}
for (const fKey of ['darwins_arch', 'ocean_sunfish', 'marine_iguana', 'galapagos_penguin', 'orca', 'mobula_ray', 'galapagos_shark', 'sardine_baitball']) {
  assert(galBiome.encyclopedia[fKey], `galapagos_upwelling encyclopedia missing fauna/feature ${fKey}`);
}

const galZoneHits = new Set([
  galBiome.getZoneAt(-145, -6, -68).id,
  galBiome.getZoneAt(0, -11, 42).id,
  galBiome.getZoneAt(165, -26, -48).id,
  galBiome.getZoneAt(375, -32, -85).id
]);
assert.equal(galZoneHits.size, 4, `Expected all 4 galapagos_upwelling zones reachable, got ${[...galZoneHits].join(', ')}`);

// Verify Cromwell Undercurrent upward vertical upwelling flow along volcanic wall
const galCurr = new T.Vector3();
galBiome.getCurrentAt(165, -26, -48, 2.0, galCurr);
assert(galCurr.y > 0.25 && galCurr.length() > 0.6, `Cromwell upwelling must produce strong upward flow along dropoff, got vy=${galCurr.y.toFixed(2)}`);

// Verify central passage under Darwin's Arch (0, 0) stays deep & clear while flank pillars rise
assert(galBiome.getHeight(0, 0) < -18.0, 'Darwin Arch central underwater passage must stay clear (< -18 m)');
assert(galBiome.getHeight(-26, 0) > 0.0 && galBiome.getHeight(26, 0) > 0.0, 'Darwin Arch twin basalt pillars must rise above sea level');

const galSp = new T.Vector3(galBiome.spawn.pos[0], galBiome.spawn.pos[1], galBiome.spawn.pos[2]);
OC.Terrain.init(scene, galBiome, galSp);
OC.FloraStreamer.init(scene, galBiome, galSp);
const galFauna = OC.FaunaEngine.init(scene, galBiome);
assert(galFauna.getVesselInfo() && galFauna.getVesselInfo().deckPos[1] > 0, 'galapagos_upwelling must anchor RV Beagle II safely in deep water');
for (const k of ['darwins_arch', 'ocean_sunfish', 'marine_iguana', 'galapagos_penguin', 'orca', 'mobula_ray', 'galapagos_shark']) {
  assert(galFauna.agents.some((a) => a.key === k), `galapagos_upwelling must instantiate ${k}`);
}

// Verify Ultra 5x5 flora pools for galapagos_upwelling never overflow maxInstances
const galUltraCounts = {};
for (let cx = -2; cx <= 2; cx++) {
  for (let cz = -2; cz <= 2; cz++) {
    const items = galBiome.generateChunkFlora(cx, cz, galBiome.chunkSize, 1.5, OC.mulberry32(cx * 37 + cz * 79 + 11));
    for (const it of items) galUltraCounts[it.species] = (galUltraCounts[it.species] || 0) + 1;
  }
}
for (const [spKey, cnt] of Object.entries(galUltraCounts)) {
  assert(cnt <= floraProtos[spKey].maxInstances, `galapagos_upwelling Ultra 5x5 overflow for ${spKey}: ${cnt} > ${floraProtos[spKey].maxInstances}`);
}
assert(galUltraCounts.tubastraea_coral >= 12 && galUltraCounts.ulva_turf >= 12 && galUltraCounts.galapagos_barnacle >= 8, 'galapagos_upwelling must populate tubastraea_coral, ulva_turf & galapagos_barnacle');

// Verify Cromwell cold subsurface thermocline CTD profile
const ctdGal = OC.ROV.runCtdCast(galBiome, new T.Vector3(240, -55, -40), OC.EcoLab.getState());
assert(ctdGal && ctdGal.surfaceTemp > 21.0 && ctdGal.bottomTemp < 17.5, `Galapagos CTD cast must capture Cromwell thermocline (surf=${ctdGal && ctdGal.surfaceTemp}, bot=${ctdGal && ctdGal.bottomTemp})`);

OC.Biomes.setActive('great_barrier_reef');
console.log(`   9th Biome "Галапагосский апвеллинг" (0–132 м, Cromwell Upwelling, Darwin's Arch, Mola mola, Marine Iguana, Penguin, Orca & Mobula) verified.`);

// U) Verify Step 4: Multibeam 3D Sonar Bathymetry Scan & Minimap Fog of War
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

// V) Verify Step 5: Hydrophone & Live Waterfall FFT Spectrogram Bioacoustics
OC.Hydrophone.init(getEl('hydro-canvas'));
assert(!OC.Hydrophone.isOpen(), 'Hydrophone starts closed by default');
OC.Hydrophone.setOpen(true);
assert(OC.Hydrophone.isOpen(), 'Hydrophone opens cleanly');

// Check acoustic detection in Galapagos Upwelling near orca / penguins / fumaroles
const galAgent = galFauna.agents.find((a) => a.key === 'orca' || a.key === 'galapagos_penguin' || a.key === 'ocean_sunfish');
const galListenPos = galAgent && galAgent.getPosition ? galAgent.getPosition().clone().add(new T.Vector3(12, 2, 12)) : galSp;
const galSources = galFauna.scanAcousticSources(galListenPos, 260);
assert(galSources.length >= 1, `Galapagos acoustic scanner must find nearby fauna/geo sources, got ${galSources.length}`);

const hGal = OC.Hydrophone.update(0.06, galBiome, galFauna, galListenPos, 0, 18, 0.25);
assert(hGal.spectrumBins.length === 64, 'Hydrophone waterfall must compute 64 FFT frequency bins (0-4000 Hz)');
assert(hGal.dbSPL > 85 && hGal.dbSPL < 175, `Hydrophone sound pressure level must be realistic dB re 1 uPa, got ${hGal.dbSPL}`);
assert(hGal.dominantLabel && hGal.dominantLabel.length > 3, `Hydrophone must report acoustic label, got ${hGal.dominantLabel}`);

// Verify active sonar ping spikes the 1340 Hz sonar bin cleanly on the waterfall
OC.Hydrophone.notifySonarPing();
const hSonar = OC.Hydrophone.update(0.05, galBiome, galFauna, galListenPos, 0, 18, 0.1);
const bin1340 = Math.floor(1340 / (4000 / 64));
assert(hSonar.spectrumBins[bin1340] > 0.75, `Sonar ping must spike 1340 Hz waterfall bin, got ${hSonar.spectrumBins[bin1340].toFixed(2)}`);
assert(hSonar.dominantLabel.includes('1.34 кГц'), `Hydrophone peak label during sonar ping must reflect 1.34 kHz pulse, got ${hSonar.dominantLabel}`);

// Let sonar flash decay over 0.5 s cleanly, then check shallow reef snapping shrimp chorus in GBR (< 24m)
for (let k = 0; k < 6; k++) OC.Hydrophone.update(0.1, galBiome, null, galListenPos, 0, 18, 0.0);
const gbrBiome = OC.Biomes.get('great_barrier_reef');
const hShrimp = OC.Hydrophone.update(0.05, gbrBiome, null, new T.Vector3(0, -8, 0), 0, 8, 0.0);
assert(hShrimp.dominantLabel.includes('щелкунов') || hShrimp.bandLabel.includes('кГц'), `Shallow reef hydrophone without agents must detect snapping shrimp chorus, got ${hShrimp.dominantLabel}`);

OC.Hydrophone.listenPeak();
OC.Hydrophone.setOpen(false);
assert(!OC.Hydrophone.isOpen(), 'Hydrophone closes cleanly');
console.log(`   Hydrophone & Live Waterfall FFT (${galSources.length} sources, ${hGal.dbSPL} dB, peak ${hGal.peakHz} Hz "${hGal.dominantLabel}") verified.`);

// W) Verify Step 6: Expedition Sample Museum & Full Day/Night Ecosystem Cycle (Coral Spawning, Nocturnal Predators, DVM)
OC.ROV.clearSamples();
const smpGbr = OC.ROV.grabSample(gbrBiome, new T.Vector3(0, -10, 0), new T.Vector3(0, 0, 1), OC.EcoLab.getState());
const smpGal = OC.ROV.grabSample(galBiome, new T.Vector3(165, -24, -48), new T.Vector3(0, 0, 1), OC.EcoLab.getState());
assert(smpGbr && smpGal, 'ROV grabSample must archive samples into persistent Expedition Museum');
const museumAll = OC.Expedition.getSamples();
assert.equal(museumAll.length, 2, `Expedition Sample Museum must retain 2 distinct samples across biomes, got ${museumAll.length}`);
assert.equal(OC.Expedition.getAllSummary().samplesCount, 2, 'Expedition allSummary.samplesCount must reflect Museum count');

// Day/Night Ecosystem Cycle on Great Barrier Reef:
// Noon -> DVM plankton sinks deeper, coral spawning = 0, nocturnal predators dormant
const prevTod = OC.getTimeOfDay();
OC.setTimeOfDay(0.5);
const gbrDaySp = new T.Vector3(gbrBiome.spawn.pos[0], gbrBiome.spawn.pos[1], gbrBiome.spawn.pos[2]);
const gbrFaunaTest = OC.FaunaEngine.init(scene, gbrBiome);
gbrFaunaTest.update(0.05, 1.0, gbrDaySp, 0, false);
const infoDay = Object.assign({}, OC.faunaInfo);
assert.equal(infoDay.dvmPhase, 'day_deep', `Noon must set dvmPhase=day_deep, got ${infoDay.dvmPhase}`);
assert.equal(infoDay.coralSpawnIntensity, 0, 'Coral spawning must be dormant at noon');
assert.equal(infoDay.nocturnalPredators, 0, 'Nocturnal reef predators must stay dormant at noon');

// Dusk ascent -> Deep Scattering Layer begins ascending
OC.setTimeOfDay(0.76);
gbrFaunaTest.update(0.05, 1.2, gbrDaySp, 0, false);
assert(OC.faunaInfo.dvmPhase === 'dusk_ascent' || OC.faunaInfo.dvmPhase === 'night_surface', `Evening must trigger DVM ascent, got ${OC.faunaInfo.dvmPhase}`);

// Midnight -> Full Coral Mass Spawning + Nocturnal Predators Active + Positive DVM Upward Shift
OC.setTimeOfDay(0.02);
gbrFaunaTest.update(0.05, 1.4, gbrDaySp, 0, true);
const infoNight = OC.faunaInfo;
assert(infoNight.coralSpawnIntensity > 0.7, `Midnight on GBR must activate mass coral spawning (>0.7), got ${infoNight.coralSpawnIntensity}`);
assert(infoNight.dvmShiftM > 4.0, `Midnight DVM must shift plankton upward (> +4.0 m), got ${infoNight.dvmShiftM}`);
assert(infoNight.nocturnalPredators >= 1, `Midnight must activate nocturnal predators (>=1), got ${infoNight.nocturnalPredators}`);

// Restore clean default state
OC.setTimeOfDay(prevTod);
OC.ROV.clearSamples();
console.log(`   Expedition Sample Museum (${museumAll.length} persisted samples) & Day/Night Ecosystem Cycle (DVM ${infoDay.dvmPhase} -> ${infoNight.dvmPhase}, coralSpawn=${infoNight.coralSpawnIntensity}, noctPred=${infoNight.nocturnalPredators}) verified.`);

// X) Verify Step 7: Enhanced Chromatic Bottom Caustics & Shoreline / Ice / Vessel Contact Foam
assert(OC.causticUniforms && OC.causticUniforms.uSunProj && OC.causticUniforms.uWaveAmp, 'world.js must expose uSunProj & uWaveAmp in OC.causticUniforms');
assert(worldSrc.includes('causRGB') && worldSrc.includes('focusCurve'), 'world.js must inject chromatic RGB caustic dispersion & optical focus curve');
assert(worldSrc.includes('uVesselInfo') && worldSrc.includes('vesselFoam') && worldSrc.includes('bowArm') && worldSrc.includes('sternWake'), 'world.js surface shader must render vessel hull contact foam & Kelvin wake');
assert(worldSrc.includes("it.species !== 'ice_floe' && it.species !== 'iceberg'") && worldSrc.includes('swash'), 'world.js must bake arctic ice floe/iceberg contact rings & animated shoreline swash foam');
console.log('   Chromatic Refractive Caustics (RGB dispersion + sun projection) & Contact Foam (shoreline swash, arctic ice rings & R/V Kelvin wake) verified.');

// Y) Verify Step 8: Gas Hydrate Plumes, Visible Thermocline Haze & Benthic Silt-Out Plumes
const bpHydrateFauna = OC.FaunaEngine.init(scene, OC.Biomes.get('brine_pool'));
assert(OC.faunaInfo.hydratePlumesActive, 'brine_pool must activate methane gas hydrate bubble plumes');

// Visible thermocline haze activates near thermocline depth (-24 m in galapagos_upwelling)
const galThermoFauna = OC.FaunaEngine.init(scene, galBiome);
galThermoFauna.update(0.05, 2.0, new T.Vector3(0, -24.0, 0), 0.5, false);
assert(OC.faunaInfo.thermoclineActive && OC.faunaInfo.thermoDepthM === 24, `Thermocline Schlieren haze must activate near -24 m in galapagos_upwelling, got active=${OC.faunaInfo.thermoclineActive}, depth=${OC.faunaInfo.thermoDepthM}`);

// Fast skimming near seabed or ROV sampling kicks up benthic silt-out cloud
const floorAtGbr = gbrBiome.getHeight(40, 40);
gbrFaunaTest.notifySiltKick(new T.Vector3(40, floorAtGbr + 0.6, 40), 1.3);
gbrFaunaTest.update(0.05, 2.1, new T.Vector3(40, floorAtGbr + 1.2, 40), 4.5, true);
assert(OC.faunaInfo.siltTurbidity > 0.25 && OC.faunaInfo.siltCount > 0, `Benthic silt-out must generate settling cloud & raise siltTurbidity, got turb=${OC.faunaInfo.siltTurbidity}, count=${OC.faunaInfo.siltCount}`);

OC.Biomes.setActive('great_barrier_reef');
console.log(`   Gas Hydrates, Thermocline Schlieren Haze (${OC.faunaInfo.thermoDepthM} m) & Benthic Silt-Out Plumes (${OC.faunaInfo.siltCount} particles, turb=${OC.faunaInfo.siltTurbidity}) verified.`);

// Z) Verify Step 10 & CI Stage 5 (Interactive Onboarding, Quick-Help Modal ?/F1, Frame Telemetry & GitHub Actions WebGL CI)
const tplSrc = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
const mainUiSrc = fs.readFileSync(path.join(ROOT, 'src/ui/main.js'), 'utf8');
const ciSrc = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const pwSrc = fs.readFileSync(path.join(ROOT, 'tests', 'e2e_playwright.mjs'), 'utf8');
assert(tplSrc.includes('id="btn-help"') && tplSrc.includes('id="help-modal"') && tplSrc.includes('id="hero-tour-btn"') && tplSrc.includes('id="hero-help-btn"'), 'template.html must contain interactive onboarding & Quick-Help modal markup');
const guideUiSrc = fs.readFileSync(path.join(ROOT, 'src/ui/panels_guide.js'), 'utf8');
const hotkeysSrc = fs.readFileSync(path.join(ROOT, 'src/ui/hotkeys.js'), 'utf8');
assert(hotkeysSrc.includes("e.code === 'Slash'") && mainUiSrc.includes('OC._Hotkeys.bind'), 'src/ui/hotkeys.js must own the Slash/F1 quick-help shortcut, wired from main.js');
assert(mainUiSrc.includes('OC.getPerfStats'), 'src/ui/main.js must wire OC.getPerfStats');
assert(guideUiSrc.includes('oc_onboard_seen_v1') && guideUiSrc.includes('function dismissHero') && mainUiSrc.includes('OC._HudPanelsGuide.bind'), 'src/ui/panels_guide.js must own persisted onboarding dismissal & the help modal');
assert(!ciSrc.includes('\t'), '.github/workflows/ci.yml must not contain raw tab indentation');
assert(ciSrc.includes('build-and-vm-verify') && ciSrc.includes('browser-webgl-e2e') && ciSrc.includes('e2e_playwright.mjs') && ciSrc.includes('verify_e2e.mjs'), 'ci.yml must run build check, verify.mjs, verify_e2e.mjs and browser-webgl-e2e');
assert(pwSrc.includes('swiftshader') && pwSrc.includes('readPixels') && pwSrc.includes('OC_PERF_SUMMARY_MD'), 'e2e_playwright.mjs must verify WebGL SwiftShader pixels & export perf summary');
console.log('   Interactive Onboarding Bar, Quick-Help (? / F1), Frame Telemetry & GitHub Actions WebGL CI verified.');

// AA) Verify 10th Biome: Amazonia Flooded Forest Igapo (Rio Negro & Encontro das Aguas)
const amzBiome = OC.Biomes.setActive('amazon_igapo');
assert(amzBiome && !amzBiome.noSurface && amzBiome.minimapTheme === 'amazon', 'amazon_igapo biome must configure surface & amazon minimap theme');
assert(amzBiome.zones.length === 5 && amzBiome.landmarks.length === 5 && amzBiome.tourLegs.length === 5, 'amazon_igapo must expose 5 zones, 5 landmarks and 5 tourLegs');
const optBlack = amzBiome.getOpticalProfile(-40, -4, 40, 1.0);
const optWhite = amzBiome.getOpticalProfile(360, -4, 0, 1.0);
assert(optBlack.fogColor.r > optBlack.fogColor.b && optWhite.fogDensity > optBlack.fogDensity, 'amazon_igapo must contrast tannin Rio Negro blackwater vs turbid Solimoes whitewater confluence');
const amzPrevList = ['pink_dolphin', 'arapaima', 'electric_eel', 'river_stingray', 'piranha', 'neon_tetra', 'angelfish', 'igapo_tree', 'victoria_lily', 'amazon_sword', 'sunken_log', 'driftwood_snag'];
for (const k of amzPrevList) {
  assert(amzBiome.encyclopedia[k], `amazon_igapo encyclopedia missing key ${k}`);
  const pm = OC.FaunaEngine.createPreviewMesh(k, amzBiome);
  assert(pm && pm.children.length > 0, `amazon_igapo preview mesh failed for ${k}`);
  assert(OC.sound.getVoiceLabel(k).length > 4, `amazon_igapo voice label missing for ${k}`);
  OC.sound.playSpeciesVoice(k);
}
const ctdAmz = OC.ROV.runCtdCast(amzBiome, new T.Vector3(15, -10, 2), OC.EcoLab.getState());
assert(ctdAmz && ctdAmz.surfaceTemp > 26 && ctdAmz.maxDepthM <= 30, `Amazon CTD cast mismatch: ${JSON.stringify(ctdAmz)}`);
const resAmz = OC.Expedition.evaluateMissions(amzBiome, { zoneId: 'whitewater_confluence', depthM: 6, currentKnots: 0.9, dayW: 0.9, flashOn: false });
assert(resAmz.list.find((m) => m.id === 'amz_confluence').done, 'amz_confluence mission must complete inside whitewater_confluence zone');
console.log('   10th Biome "Амазония: Лес Игапо" (Rio Negro blackwater, Encontro das Aguas, Pink Dolphin, Arapaima, Electric Eel, Victoria amazonica) verified.');

// AB) Verify 11th Biome: Lake Baikal's clear-water rift, endemic fauna, and sponge reefs
const baikal = OC.Biomes.setActive('baikal');
assert(OC.Seasons && OC.Seasons.YEAR_SECONDS === 1200, 'The continuous annual season cycle must be available');
const savedSeasonPhase = OC.Seasons.getPhase();
OC.Seasons.setPhase(0);
const baikalWinterTemp = baikal.getTemperatureAt(0, 0, baikal.getZoneAt(0, 0, 0));
const reef = OC.Biomes.get('great_barrier_reef');
const reefSouthernSummerDelta = OC.Seasons.getTemperatureDelta(reef, 0);
OC.Seasons.setPhase(0.5);
const baikalSummerTemp = baikal.getTemperatureAt(0, 0, baikal.getZoneAt(0, 0, 0));
const reefSouthernWinterDelta = OC.Seasons.getTemperatureDelta(reef, 0);
assert(baikalSummerTemp - baikalWinterTemp > 6 && reefSouthernSummerDelta > reefSouthernWinterDelta, 'Seasonal water temperatures must follow hemisphere and smoothly vary with the annual cycle');
OC.Seasons.setPhase(0.249);
const springBefore = baikal.getTemperatureAt(0, 0, baikal.getZoneAt(0, 0, 0));
OC.Seasons.setPhase(0.251);
const springAfter = baikal.getTemperatureAt(0, 0, baikal.getZoneAt(0, 0, 0));
assert(Math.abs(springAfter - springBefore) < 0.1, 'Seasonal temperature transitions must be continuous, without boundary jumps');
OC.Seasons.setPhase(0.0);
const baikalIceWinter = OC.Seasons.getState(baikal).iceFactor;
const arcticIceWinter = OC.Seasons.getState(OC.Biomes.get('arctic_sea')).iceFactor;
const galapagosColdUpwelling = OC.Seasons.getState(OC.Biomes.get('galapagos_upwelling')).upwellingFactor;
const deepVents = OC.Biomes.get('hydrothermal_vents');
const deepWinterActivity = OC.Seasons.getState(deepVents).faunaActivity;
const deepWinterDelta = OC.Seasons.getTemperatureDelta(deepVents, 2500);
OC.Seasons.setPhase(0.5);
const baikalIceSummer = OC.Seasons.getState(baikal).iceFactor;
const arcticIceSummer = OC.Seasons.getState(OC.Biomes.get('arctic_sea')).iceFactor;
const galapagosWarmUpwelling = OC.Seasons.getState(OC.Biomes.get('galapagos_upwelling')).upwellingFactor;
const deepSummerActivity = OC.Seasons.getState(deepVents).faunaActivity;
const deepSummerDelta = OC.Seasons.getTemperatureDelta(deepVents, 2500);
assert(baikalIceWinter > 0.99 && baikalIceSummer < 0.01 && arcticIceWinter > arcticIceSummer, 'Seasonal ice cover must recede on Baikal while remaining perennial but variable in Arctic waters');
assert(galapagosColdUpwelling > galapagosWarmUpwelling && Math.abs(deepSummerDelta - deepWinterDelta) < 0.0001 && deepSummerActivity === deepWinterActivity, 'Cold-season upwelling must strengthen while abyssal temperature and fauna activity stay stable');
OC.Seasons.setPhase(0.84);
const amazonFlood = OC.Seasons.getState(amzBiome);
OC.Seasons.setPhase(0.34);
const amazonLowWater = OC.Seasons.getState(amzBiome);
assert(amazonFlood.waterLevelM > amazonLowWater.waterLevelM && amazonFlood.turbidityAdd > amazonLowWater.turbidityAdd, 'Amazon seasonal flood must raise water and softly increase suspended sediment');
OC.Seasons.setPhase(0.5);
const kelpSummerProductivity = OC.Seasons.getState(OC.Biomes.get('kelp_forest')).productivityFactor;
OC.Seasons.setPhase(0.0);
const kelpWinterProductivity = OC.Seasons.getState(OC.Biomes.get('kelp_forest')).productivityFactor;
assert(kelpSummerProductivity > kelpWinterProductivity, 'Kelp forest productivity should peak in the warm season');
OC.Seasons.setPhase(0.5);
assert(OC.Seasons.selectSeason('winter', baikal) && !OC.Seasons.isAutoAdvance(), 'Selecting a season must pause the annual cycle for manual control');
for (let seasonStep = 0; seasonStep < 7; seasonStep++) OC.Seasons.update(0.25);
assert(OC.Seasons.getPhase() > 0.05 && OC.Seasons.getPhase() < 0.45, 'Manual season selection must transition gradually rather than jump');
for (let seasonStep = 0; seasonStep < 7; seasonStep++) OC.Seasons.update(0.25);
assert.equal(OC.Seasons.getState(baikal).id, 'winter', 'Manual season selection must reach the requested local season');
OC.Seasons.setAutoAdvance(true);
OC.Seasons.setPhase(savedSeasonPhase);
assert(baikal && baikal.minimapTheme === 'baikal' && baikal.noSurface === false, 'Baikal must register as a surface freshwater biome with its own minimap theme');
assert(baikal.zones.length === 5 && baikal.landmarks.length === 6 && baikal.tourLegs.length === 6, 'Baikal must expose 5 zones, 6 landmarks and 6 guided tour legs');
assert(baikal.getHeight(0, 80) < -1500 && baikal.getHeight(-520, -420) > -15, 'Baikal bathymetry must include both the deep rift and shallow Academy Bay');
let baikalSeasonalIceCount = 0;
for (let cz = -8; cz < 8; cz++) {
  for (let cx = -8; cx < 8; cx++) {
    const items = baikal.generateChunkFlora(cx, cz, 150, 1, OC.mulberry32(((cx * 73856093) ^ (cz * 19349663) ^ 0x51a7) >>> 0));
    baikalSeasonalIceCount += items.filter((item) => item.species === 'ice_floe').length;
  }
}
assert(baikalSeasonalIceCount > 0, 'Baikal shoreline flora stream must seed seasonal ice floes');
const baikalShallowOptics = baikal.getOpticalProfile(-520, -8, -420, 1);
const baikalDeepOptics = baikal.getOpticalProfile(0, -900, 80, 1);
assert(baikalShallowOptics.fogDensity < baikalDeepOptics.fogDensity && baikalShallowOptics.causticStrength > baikalDeepOptics.causticStrength, 'Baikal clear-water optics must fade with depth');
for (const k of ['baikal_sponge', 'charophyte_bed', 'fish_omul', 'fish_golomyanka', 'fish_grayling', 'seal_baikal', 'methane_seep_baikal']) {
  assert(baikal.encyclopedia[k], `Baikal encyclopedia missing key ${k}`);
  assert(OC.sound.getVoiceLabel(k).length > 4, `Baikal acoustic label missing for ${k}`);
  const preview = OC.FaunaEngine.createPreviewMesh(k, baikal);
  assert(preview && preview.children.length > 0, `Baikal Atlas preview missing for ${k}`);
}
const ctdBaikal = OC.ROV.runCtdCast(baikal, new T.Vector3(0, -900, 80), OC.EcoLab.getState());
assert(ctdBaikal && ctdBaikal.maxDepthM > 1500 && ctdBaikal.bottomTemp >= 3.2 && ctdBaikal.bottomTemp < 4.0, `Baikal CTD profile mismatch: ${JSON.stringify(ctdBaikal)}`);
assert.equal(ctdBaikal.waterType, 'freshwater', 'Baikal CTD must identify freshwater');
assert(ctdBaikal.conductivityUSCm >= 105 && ctdBaikal.conductivityUSCm <= 158 && ctdBaikal.tdsMgL > 0 && ctdBaikal.mineralizationPpt < 0.2, 'Baikal CTD must report low freshwater conductivity, TDS and mineralization');
assert(ctdBaikal.bins.length >= 20 && ctdBaikal.bins.every((bin) => bin.o2 > 7 && bin.o2 < 14), 'Baikal oxygen profile must remain well-oxygenated from surface to bottom');
assert(ctdBaikal.pH > 6 && ctdBaikal.pH < 9, 'Baikal CTD must include measured water pH');
const baikalFauna = OC.FaunaEngine.init(scene, baikal);
assert(baikalFauna.agents.some((a) => a.key === 'seal_baikal') && baikalFauna.agents.some((a) => a.key === 'fish_golomyanka') && baikalFauna.agents.some((a) => a.key === 'methane_seep_baikal'), 'Baikal fauna plan must include nerpa, golomyanka and scannable seep locations');
const golomyankaPlan = baikal.faunaPlan.schools.find((school) => school.key === 'fish_golomyanka');
assert(golomyankaPlan && golomyankaPlan.diel === 'nocturnal' && golomyankaPlan.dvmAmp >= 100 && golomyankaPlan.seasonalDepth === 24, 'Golomyanka must combine nocturnal DVM with a seasonal depth migration');
assert(OC.Biomes.get('arctic_sea').faunaPlan.schools.some((school) => school.key === 'fish_arctic_cod' && school.seasonalDepth > 0), 'Arctic cod schools must migrate with seasonal ice and temperature');
assert(OC.Biomes.get('amazon_igapo').faunaPlan.schools.some((school) => school.key === 'neon_tetra' && school.seasonalDepth > 0), 'Amazon fish must respond to seasonal flood levels');
assert(OC.Biomes.get('galapagos_upwelling').faunaPlan.schools.some((school) => school.key === 'sardine_baitball' && school.seasonalDepth > 0), 'Galapagos baitballs must shift depth with seasonal upwelling');
baikalFauna.update(1 / 60, OC.uTime.value, new T.Vector3(baikal.spawn.pos[0], baikal.spawn.pos[1], baikal.spawn.pos[2]), 0, false);
assert(OC.faunaInfo.hydratePlumesActive, 'Baikal methane seeps must activate the existing low-cost gas plume system');
const testSeal = OC._FaunaBuilders.makeBaikalSeal(scene, baikal, { cx: -40, cz: 80, r: 0, y: -360, scale: 1 });
testSeal.update(0, 0, new T.Vector3(-40, -360, 80), { preyCenters: [] });
let golomyankaPredationCount = 0;
const testGolomyanka = testSeal.getPosition().clone();
testGolomyanka.schoolKey = 'fish_golomyanka';
testGolomyanka.applyPredation = () => { golomyankaPredationCount++; };
let huntTime = 0;
while (!testSeal.isHunting() && huntTime < 30) {
  testSeal.update(0.5, huntTime, new T.Vector3(-40, -360, 80), { preyCenters: [testGolomyanka] });
  huntTime += 0.5;
}
assert(testSeal.isHunting(), 'Baikal nerpa must enter a hunting lunge when it finds a golomyanka school');
for (let huntStep = 0; huntStep < 60; huntStep++) testSeal.update(0.1, huntTime + huntStep * 0.1, new T.Vector3(-40, -360, 80), { preyCenters: [testGolomyanka] });
assert(golomyankaPredationCount > 0, 'Baikal nerpa lunge must apply predation to a golomyanka school');
assert.equal(OC.Expedition.MISSIONS.filter((m) => m.biomeId === 'baikal').length, 4, 'Baikal must provide four expedition goals');
OC.Biomes.setActive('great_barrier_reef');
console.log('   11th Biome "Озеро Байкал" (1,642 m rift, clear-water optics, Baikal sponge, omul, golomyanka, nerpa, methane seeps, CTD and 4 missions) verified.');

// AB) Verify Stage 2 Underwater Optical Shader FX (WebGLRenderTarget Post-Processing, Chromatic Aberration, Lens Wetness & Overhead Shadows)
assert(typeof OC.renderWorld === 'function' && typeof OC.resizeWorld === 'function' && typeof OC.getPostFxState === 'function', 'world.js must expose OC.renderWorld, OC.resizeWorld & OC.getPostFxState');
assert(typeof OC.setPostFxEnabled === 'function' && typeof OC.setSubViewportOptics === 'function', 'world.js must expose OC.setPostFxEnabled & OC.setSubViewportOptics');
assert.equal(OC.Quality.PRESETS.low.postFx, false, 'Low quality preset must disable postFx FBO pass');
assert.equal(OC.Quality.PRESETS.high.postFx, true, 'High quality preset must enable postFx FBO pass');

const shShadowMat = new T.MeshStandardMaterial({ vertexColors: true });
OC.enhanceMaterial(shShadowMat, { isTerrain: true, causticStrength: 0.9 });
const shShadow = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
shShadowMat.onBeforeCompile(shShadow);
assert(shShadow.uniforms.uShadowA && shShadow.uniforms.uShadowB, 'enhanceMaterial must bind uShadowA & uShadowB uniforms');
assert(shShadow.fragmentShader.includes('ocShadow') && shShadow.fragmentShader.includes('uShadowA') && shShadow.fragmentShader.includes('uShadowB'), 'Terrain fragment shader must compute overhead ship & megafauna shadows');

const worldFxSrc = worldSrc;
assert(worldFxSrc.includes('WebGLRenderTarget') && worldFxSrc.includes('dropLayer') && worldFxSrc.includes('uBloomAmt') && worldFxSrc.includes('uChromaAmt'), 'world.js must compile WebGLRenderTarget post-FX shader (Bloom, Chromatic Aberration, Water Droplets)');
const gbrFxFauna = OC.FaunaEngine.init(scene, OC.Biomes.get('great_barrier_reef'));
assert(OC.faunaInfo && OC.faunaInfo.shadowCaster && typeof OC.faunaInfo.shadowCaster === 'object', 'OC.faunaInfo must expose zero-GC shadowCaster slot');
const wPos = OC.faunaInfo.whale ? OC.faunaInfo.whale.getPosition() : new T.Vector3(0, -8, 0);
gbrFxFauna.update(0.05, 1.5, wPos, 2.0, false);
assert(OC.faunaInfo.shadowCaster.active && OC.faunaInfo.shadowCaster.radius >= 2.0, 'OC.faunaInfo.shadowCaster must track nearby megafauna for seafloor shadow projection');
const pfxInit = OC.getPostFxState();
assert(typeof pfxInit.enabled === 'boolean' && typeof pfxInit.bloom === 'number' && typeof pfxInit.chroma === 'number', 'OC.getPostFxState must return structured optical telemetry');
console.log('   Stage 2 Underwater WebGL Shader FX (FBO Bloom, Chromatic Aberration, Surfacing Droplets & Dynamic Overhead Shadows) verified.');

// AC) Verify Stage 3 ROV & Marine Science (Physical Umbilical Tether, Autonomous Buoys & Acoustic Bearing Compass)
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
for (let s = 0; s < 6; s++) OC.Hydrophone.update(0.1, gbrS3, gbrFxFauna, new T.Vector3(-420, -10, -420), Math.PI, 10, 0.0);
OC.ROV.deployBuoy(gbrS3, wPos, 0.0);
const hRelay = OC.Hydrophone.update(0.08, gbrS3, gbrFxFauna, new T.Vector3(-420, -10, -420), Math.PI * 0.5, 10, 0.0);
assert(hRelay.sources.some((s) => s.viaBuoy), 'Hydrophone must relay remote acoustic signatures from deployed ROV buoy');
const track = OC.Hydrophone.getTrackTarget();
assert(track && track.active && Number.isFinite(track.bearingDeg) && Number.isFinite(track.relBearingDeg) && track.relBearingDeg >= -180 && track.relBearingDeg <= 180, `Hydrophone bearing compass target invalid: ${JSON.stringify(track)}`);

assert.equal(OC.ROV.recallBuoys(), 2, 'recallBuoys must retrieve all active buoys');
assert.equal(OC.ROV.getBuoys().length, 0, 'Buoy array must be empty after recall');
OC.Hydrophone.setOpen(false);
console.log(`   Stage 3 ROV & Marine Science (Umbilical Tether ${tNear.lengthM}m -> ${tCrit.tensionPct}%, Autonomous Buoys & Hydrophone Bearing ${track.bearingDeg}°) verified.`);

// AD) Verify Stage 4 Scientific Report Export (.MD & .JSON) & Adaptive Auto-LOD Controller
assert(typeof OC.Expedition.buildScientificReport === 'function' && typeof OC.Expedition.exportReport === 'function', 'OC.Expedition must expose scientific report builder & exporter');
const repMd = OC.Expedition.exportReport('md', { biome: amzBiome, ctdCast: ctdAmz, ecoState: OC.EcoLab.getState(), mapCoveragePct: 42 });
assert(repMd && repMd.filename.endsWith('.md') && repMd.content.includes('Амазония') && repMd.content.includes('Сводка по 13 биомам'), 'Markdown report must summarize all 13 biomes & CTD data');
const repJson = OC.Expedition.exportReport('json', { biome: amzBiome, ctdCast: ctdAmz, ecoState: OC.EcoLab.getState(), mapCoveragePct: 42 });
const baikalReportMd = OC.Expedition.exportReport('md', { biome: baikal, ctdCast: ctdBaikal });
const baikalReportJson = OC.Expedition.exportReport('json', { biome: baikal, ctdCast: ctdBaikal });
const baikalReportData = JSON.parse(baikalReportJson.content);
assert(baikalReportMd.content.includes('Пресноводная химия') && baikalReportMd.content.includes('Кислородный профиль'), `Baikal Markdown report must include freshwater chemistry and oxygen profile: ${baikalReportMd.content.slice(0, 1200)}`);
assert.equal(baikalReportData.ctdCast.conductivityUSCm, ctdBaikal.conductivityUSCm, 'JSON report must preserve Baikal conductivity');
assert.equal(baikalReportData.ctdCast.oxygenProfile.length, ctdBaikal.bins.length, 'JSON report must export every CTD oxygen-depth sample');
assert.equal(baikalReportData.ctdCast.profile[0].conductivityUSCm, ctdBaikal.bins[0].conductivityUSCm, 'JSON report must retain the conductivity/TDS vertical profile');
const parsedRep = JSON.parse(repJson.content);
assert.equal(parsedRep.biomes.length, 13, 'JSON scientific report must contain all 13 biomes');
assert(parsedRep.summary.missionsTotal === 52 && parsedRep.summary.speciesTotal === 268, `Report summary totals mismatch: ${JSON.stringify(parsedRep.summary)}`);

assert(typeof OC.Quality.evaluateAutoLod === 'function' && typeof OC.Quality.setAutoLod === 'function' && typeof OC.Quality.getAutoLodState === 'function', 'OC.Quality must expose adaptive Auto-LOD controller');
OC.Quality.set('high');
assert.equal(OC.Quality.isAutoLod(), false, 'Manual preset selection must pause Auto-LOD');
OC.Quality.setAutoLod(true);
assert.equal(OC.Quality.isAutoLod(), true, 'setAutoLod(true) must enable adaptive Auto-LOD');
for (let step = 0; step < 3; step++) OC.Quality.evaluateAutoLod(48.5, 1.0);
assert.equal(OC.Quality.getId(), 'medium', 'Sustained p95 > 30ms must step Auto-LOD down from high -> medium');
// Fast recovery only occurs after cooldown + sustained under-budget window
for (let step = 0; step < 12; step++) OC.Quality.evaluateAutoLod(9.2, 1.0);
assert.equal(OC.Quality.getId(), 'high', 'Sustained p95 < 13.5ms must recover Auto-LOD back to high');
OC.Quality.set('high');
console.log(`   Stage 4 Scientific Report Export (${parsedRep.biomes.length} biomes, ${parsedRep.summary.speciesTotal} species .MD/.JSON) & Adaptive Auto-LOD verified.`);

// AE) Verify Stage 5 Visual & Immersion Upgrade (Cinematic Water Optics, Tindall Glow, Entity Shadows, Touch HUD)
const worldV5 = worldSrc;
assert(worldV5.includes('uFlashGlow') && worldV5.includes('coneScatter'), 'world post-FX must add flashlight Tindall scatter (uFlashGlow)');
assert(worldV5.includes('uBedDepth') && worldV5.includes('floorGlow'), 'world.js volumetric flashlight beam must respect seabed contact (uBedDepth)');
assert(worldV5.includes('sparkle') && worldV5.includes('causticBands'), 'world.js water surface must add sun sparkle glitter & underwater caustic bands');
assert(worldV5.includes('currentPixelScale') && worldV5.includes('OC.applyPixelScale'), 'world.js must expose dynamic pixel-scale application');

const shFloraShadow = new T.MeshStandardMaterial({ vertexColors: true });
OC.enhanceMaterial(shFloraShadow, { causticStrength: 0.86, swayAmp: 0.4 });
const shFloraOut = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
shFloraShadow.onBeforeCompile(shFloraOut);
assert(shFloraOut.fragmentShader.includes('ocShadow') && shFloraOut.fragmentShader.includes('uShadowB') && shFloraOut.fragmentShader.includes('counterShade'), 'Flora/coral shaders must receive overhead entity shadows & counter-shading');

assert(typeof OC.ROV.getWakeCount === 'function' && OC.ROV.getWakeCount() >= 96, `ROV wake particle pool must be enlarged for turbulent trails, got ${OC.ROV.getWakeCount()}`);

assert(typeof OC.Quality.getDynamicResolution === 'function' && typeof OC.Quality.evaluateDynamicResolution === 'function' && typeof OC.Quality.setDynamicResolution === 'function' && typeof OC.Quality.isMobile === 'function', 'OC.Quality must expose dynamic resolution controller & mobile detection');
OC.Quality.setDynamicResolution(true);
for (let s = 0; s < 14; s++) OC.Quality.evaluateDynamicResolution(41.0, 1.0);
const dynHeavy = OC.Quality.getDynamicResolution();
assert(dynHeavy.enabled && dynHeavy.scale < 0.9, `Dynamic resolution must step down under frame pressure, got ${JSON.stringify(dynHeavy)}`);
for (let s = 0; s < 24; s++) OC.Quality.evaluateDynamicResolution(6.0, 1.0);
const dynLight = OC.Quality.getDynamicResolution();
assert(dynLight.scale >= dynHeavy.scale && dynLight.scale <= 1.0, `Dynamic resolution must recover toward 100%, got ${JSON.stringify(dynLight)}`);
OC.Quality.setDynamicResolution(false);
assert.equal(OC.Quality.getDynamicResolution().scale, 1.0, 'Disabling dynamic resolution must restore 100% pixel scale');
assert(OC.Quality.getAutoLodState().dynamicResScale !== undefined, 'Auto-LOD telemetry must report dynamic resolution scale');

const tplV5 = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
assert(tplV5.includes('id="touch-actions"') && tplV5.includes('id="m-flash"') && tplV5.includes('id="m-sonar"') && tplV5.includes('id="m-sample"') && tplV5.includes('id="m-sub"'), 'template.html must add the mobile quick-action HUD buttons');
assert(tplV5.includes('id="res-badge"') && tplV5.includes('id="hud-toggle"'), 'template.html must add the optics resolution badge and HUD toggle');

// Рейл иконок: 14 кнопок в 4 логических группах + кнопка сворачивания + скрытие HUD под модалками
const railIds = ['btn-globe','btn-atlas','btn-journal','btn-lab','btn-rov','btn-cam','btn-sonar','btn-hydro',
  'btn-flash','btn-sound','btn-cinema','btn-sub','btn-help','btn-panel'];
for (const id of railIds) {
  assert(tplV5.includes(`id="${id}"`), `template.html lost rail icon #${id}`);
}
assert(tplV5.includes('id="icon-rail"') && tplV5.includes('id="btn-rail-toggle"'), 'template.html must wrap icons in #icon-rail with #btn-rail-toggle');
const railGroupCount = (tplV5.match(/class="icon-group"/g) || []).length;
assert(railGroupCount === 4, `rail must expose 4 logical icon groups, found ${railGroupCount}`);
assert(tplV5.includes('body.modal-open'), 'template.html must hide HUD while a modal is open (body.modal-open)');
const railsSrc = groupSource('ui/rails');
assert(tplV5.includes('--rail-bottom'), 'template.html must expose measured rail height as --rail-bottom');
assert(/\.panel\{[^}]*var\(--rail-bottom\)/.test(tplV5), 'panels must be offset below the icon rail via --rail-bottom');
for (const sel of ['lab-panel', 'rov-panel']) {
  const re = new RegExp('\\.' + sel + '\\{[^}]*var\\(--rail-bottom\\)');
  assert(re.test(tplV5), `panel .${sel} must account for the icon rail height`);
}
assert(railsSrc.includes('syncRailMetrics'), 'ui/rails.js must publish measured rail height');
/* CI: установка Chromium не должна выедать бюджет джоба (15 мин) */
{
  const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  const budgets = [...ci.matchAll(/timeout-minutes:\s*(\d+)/g)].map((m) => Number(m[1]));
  const jobBudget = Math.min(...budgets);
  const cap = Number((ci.match(/timeout (\d+) npx playwright install/) || [])[1] || 0);
  const attempts = Number(((ci.match(/for attempt in 1 (\d+)/) || [])[1]) || 0) + 1;
  assert(cap > 0, 'ci.yml must cap each Chromium install attempt');
  assert(cap * attempts + attempts * 20 < jobBudget * 60,
    `Chromium install budget (${cap}s x ${attempts}) must fit the ${jobBudget}-minute job`);
}
/* Панели-окна должны быть выше HUD-хрома, но ниже модалок */
const panelZ = (tplV5.match(/\.panel\{[^}]*z-index:(\d+)/) || [])[1];
assert(panelZ, '.panel must declare a z-index');
for (const [name, re] of Object.entries({
  rail: /\.topright\{[^}]*z-index:(\d+)/,
  joystick: /\.touch-nav\{[^}]*z-index:(\d+)/,
  touchActions: /\.touch-actions\{[^}]*z-index:(\d+)/,
})) {
  const z = (tplV5.match(re) || [])[1];
  assert(z && Number(z) < Number(panelZ), `HUD ${name} (z=${z}) must stay below panels (z=${panelZ})`);
}
{ const mz = (tplV5.match(/\.atlas-modal\{[^}]*z-index:(\d+)/) || [])[1];
  assert(mz && Number(mz) > Number(panelZ), `modals (z=${mz}) must stay above panels (z=${panelZ})`); }
for (const fn of ['setCollapsed', 'setModalOpen', 'isModalOpen']) {
  assert(railsSrc.includes(fn), `ui/rails.js must expose ${fn}`);
}
for (const src of ['ui/atlas', 'ui/globe', 'ui/panels_guide', 'ui/panels_camera']) {
  assert(groupSource(src).includes('setModalOpen'), `${src} must report its modal state to OC.UI.Rail`);
}
assert(tplV5.includes('env(safe-area-inset-bottom') && tplV5.includes('@media (max-width:430px)') && tplV5.includes('orientation:landscape') && tplV5.includes('pointer:coarse'), 'template.html must ship safe-area, narrow-phone & landscape mobile media rules');
assert(tplV5.includes('touch-action:none') && tplV5.includes('.touch-act'), 'template.html must style touch action buttons with pointer-safe interaction');

const mainV5 = fs.readFileSync(path.join(ROOT, 'src/ui/main.js'), 'utf8');
assert(mainV5.includes('syncTouchQuick') && mainV5.includes('updateResBadge') && mainV5.includes('toggleHud'), 'main.js must wire touch quick actions, resolution badge & HUD toggle');
assert(mainV5.includes('evaluateDynamicResolution') && mainV5.includes('applyPixelScale'), 'main.js frame loop must apply dynamic resolution');
assert(mainV5.includes('orientationchange'), 'main.js must re-scale the render target after device rotation');
console.log(`   Stage 5 Visual & Immersion (Tindall beam glow ${dynHeavy.scale} → ${dynLight.scale} dyn-res, 128 wake particles, flora entity shadows, safe-area touch HUD) verified.`);
console.log('ALL VERIFICATION CHECKS PASSED!');
