/* Диагностика: потолок Европы + предпросмотр Атласа. Временный скрипт. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const MODULE_ORDER = JSON.parse(execFileSync('python3', [path.join(ROOT, 'build.py'), '--list'], { encoding: 'utf8' }));
const SRC_ORDER = MODULE_ORDER.map((rel) => path.join('src', rel));

function makeStubEl(id) {
  const cls = new Set();
  return {
    id, tagName: 'DIV', style: {}, value: '24', textContent: '', innerHTML: '',
    width: 184, height: 184,
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      toggle: (c, f) => (f === undefined ? (cls.has(c) ? (cls.delete(c), false) : (cls.add(c), true)) : (f ? cls.add(c) : (cls.delete(c), f))),
      contains: (c) => cls.has(c),
    },
    addEventListener: () => {}, setAttribute: () => {},
    toDataURL: () => 'data:image/png;base64,x',
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    querySelector: () => makeStubEl('child'), querySelectorAll: () => [], closest: () => null,
    appendChild: () => {}, remove: () => {},
    getContext: () => ({
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => {}, clearRect: () => {}, fillRect: () => {}, drawImage: () => {},
      beginPath: () => {}, arc: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
      fill: () => {}, stroke: () => {}, fillText: () => {}, save: () => {}, restore: () => {},
      translate: () => {}, rotate: () => {}, fillStyle: '', strokeStyle: '', font: '', lineWidth: 1,
      lineJoin: 'round', filter: '', setLineDash: () => {},
    }),
  };
}
const elCache = new Map();
const getEl = (id) => { if (!elCache.has(id)) elCache.set(id, makeStubEl(id)); return elCache.get(id); };
const memStorage = new Map();
const sandbox = {
  window: null,
  document: { body: makeStubEl('body'), getElementById: getEl, querySelector: () => makeStubEl('q'), querySelectorAll: () => [], createElement: (t) => makeStubEl(t) },
  localStorage: { getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null), setItem: (k, v) => memStorage.set(k, String(v)), removeItem: (k) => memStorage.delete(k) },
  navigator: { maxTouchPoints: 0, hardwareConcurrency: 8 },
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  setTimeout, clearTimeout, console, Math,
  Float32Array, Uint16Array, Uint32Array, Int32Array, Uint8ClampedArray, Set, Map, Error, Object, Array,
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
sandbox.window.innerWidth = 1440; sandbox.window.innerHeight = 900;
sandbox.window.addEventListener = () => {};
let USE_FAKE_WORKER = process.env.FAKE_WORKER === '1';
if (USE_FAKE_WORKER) {
  const tsrc = fs.readFileSync(path.join(ROOT, 'src/engine/terrain.js'), 'utf8');
  const m = tsrc.match(/const TERRAIN_WORKER_SRC = `([\s\S]*?)`;/);
  if (!m) throw new Error('TERRAIN_WORKER_SRC not found');
  const WORKER_SRC = m[1];
  sandbox.Worker = class {
    constructor() { this.onmessage = null; this.onerror = null; }
    postMessage(msg) {
      const selfObj = { onmessage: null, postMessage: (r) => { if (this.onmessage) this.onmessage({ data: r }); } };
      vm.runInNewContext(WORKER_SRC, { self: selfObj, Math, Float32Array, Uint32Array, console, postMessage: selfObj.postMessage }, { filename: 'terrain-worker' });
      if (selfObj.onmessage) selfObj.onmessage({ data: msg });
    }
    terminate() {}
  };
  sandbox.Blob = class { constructor() {} };
  sandbox.URL = { createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} };
}
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'three.min.js'), 'utf8'), sandbox, { filename: 'three.min.js' });
for (const rel of SRC_ORDER.slice(0, -1)) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
}
const T = sandbox.THREE;
const OC = sandbox.OC;

// ---------- 1. Ceiling ----------
const biome = OC.Biomes.list().find((b) => b.id === 'europa_ocean');
console.log('FAKE_WORKER =', USE_FAKE_WORKER);
console.log('biome:', biome.id, 'getCeilingHeight?', typeof biome.getCeilingHeight, 'getCeilingColor?', typeof biome.getCeilingColor, 'isCeilingOpen?', typeof biome.isCeilingOpen);
const scene = new T.Scene();
const spawn = new T.Vector3(biome.spawn.pos[0], biome.spawn.pos[1], biome.spawn.pos[2]);
OC.Terrain.init(scene, biome, spawn);
for (let i = 0; i < 6; i++) OC.Terrain.update(spawn, scene);
const origins = OC.Terrain.getChunkOrigins();
let floorCount = 0, ceilCount = 0, ceilVisible = 0;
scene.traverse((o) => {
  if (o.isMesh && o.userData && o.userData.key === 'floor') {
    if (o.material === undefined) return;
  }
});
// count via group children
const grp = scene.children.find((c) => c.type === 'Group');
if (grp) {
  grp.children.forEach((m) => {
    floorCount++;
    if (m.geometry && m.geometry.attributes.normal && m.geometry.attributes.normal.array[1] < -0.5) ceilCount++;
  });
}
console.log('group children (floor+ceiling meshes):', grp ? grp.children.length : 'no group');
console.log('chunk origins:', origins.chunks.length, 'chunkSize', origins.chunkSize);

// direct: instrument buildCeilingChunkGeometry result by checking per-chunk Y extents
let meshesAbove = 0, meshesBelow = 0;
if (grp) {
  grp.children.forEach((m) => {
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox;
    if (bb.min.y > 0) meshesAbove++; else meshesBelow++;
  });
}
console.log('meshes with min.y>0 (ceiling):', meshesAbove, ' meshes below (floor):', meshesBelow);

// ---------- 2. Atlas preview fallback ----------
for (const b of OC.Biomes.list()) {
  const enc = b.encyclopedia || {};
  const bad = [];
  for (const key of Object.keys(enc)) {
    let out = null;
    try { out = OC.FaunaEngine.createPreviewMesh(key, b); } catch (e) { bad.push(key + ' [throw: ' + e.message + ']'); continue; }
    // fallback = sphere radius 0.8 scaled
    let isFallback = false;
    if (out && out.children && out.children.length === 1) {
      const c = out.children[0];
      const gp = c.geometry && c.geometry.parameters;
      if (gp && gp.radius === 0.8 && gp.widthSegments === 48) isFallback = true;
    }
    if (isFallback) bad.push(key + ' [' + enc[key][2] + ']');
  }
  if (bad.length) console.log(b.id, '-> placeholder sphere for:', bad.join(', '));
}
