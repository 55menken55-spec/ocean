/**
 * Full Production Bundle (index.html) End-to-End Boot, WebGL Shader Spy,
 * Hotkey/UI Simulation & 9-Biome 900-Frame CPU Profiler.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Extract exact Three.js + concatenated OC application bundle from built index.html
const scripts = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html)) !== null) {
  if (m[1].trim().length > 100) scripts.push(m[1]);
}
assert.equal(scripts.length, 2, `Expected 2 inline <script> blocks in built index.html, got ${scripts.length}`);
const threeBundle = scripts[0];
const appBundle = scripts[1];

console.log('1) Booting production index.html script bundle inside DOM + WebGL Spy harness...');

// Capture every GLSL shader compiled by Three.js across all 9 biomes
const compiledShaders = [];
const shaderTypes = new Map();
const glErrors = [];

function createWebGLSpy() {
  const noop = () => {};
  const ctx = {
    canvas: null,
    drawingBufferWidth: 1280,
    drawingBufferHeight: 720,
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_INT: 5125,
    UNSIGNED_BYTE: 5121,
    RGBA: 6408,
    RGB: 6407,
    TEXTURE_2D: 3553,
    TEXTURE0: 33984,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_MIN_FILTER: 10241,
    CLAMP_TO_EDGE: 33071,
    REPEAT: 10497,
    LINEAR: 9729,
    NEAREST: 9728,
    LINEAR_MIPMAP_LINEAR: 9987,
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    MAX_TEXTURE_IMAGE_UNITS: 34930,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
    MAX_TEXTURE_SIZE: 3379,
    MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
    MAX_VERTEX_ATTRIBS: 34921,
    MAX_VARYING_VECTORS: 36348,
    MAX_VERTEX_UNIFORM_VECTORS: 36347,
    MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
    HIGH_FLOAT: 36338,
    MEDIUM_FLOAT: 36337,
    LOW_FLOAT: 36336,
    HIGH_INT: 36341,
    MEDIUM_INT: 36340,
    LOW_INT: 36339,
    DEPTH_TEST: 2929,
    CULL_FACE: 2884,
    BLEND: 3042,
    SCISSOR_TEST: 3089,
    STENCIL_TEST: 2960,
    POLYGON_OFFSET_FILL: 32823,
    SAMPLE_ALPHA_TO_COVERAGE: 32926,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    STENCIL_BUFFER_BIT: 1024,
    TRIANGLES: 4,
    LINES: 1,
    POINTS: 0,
    FRONT: 1028,
    BACK: 1029,
    CCW: 2305,
    CW: 2304,
    LEQUAL: 515,
    FUNC_ADD: 32774,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    ONE: 1,
    ZERO: 0,
    VERSION: 7938,
    SHADING_LANGUAGE_VERSION: 35724,
    VENDOR: 7936,
    RENDERER: 7937,
    getExtension: (name) => {
      if (name === 'OES_element_index_uint') return {};
      if (name === 'ANGLE_instanced_arrays') return { drawArraysInstancedANGLE: noop, drawElementsInstancedANGLE: noop, vertexAttribDivisorANGLE: noop };
      if (name === 'OES_texture_float') return {};
      if (name === 'OES_texture_half_float') return {};
      if (name === 'OES_standard_derivatives') return {};
      if (name === 'EXT_shader_texture_lod') return {};
      if (name === 'EXT_blend_minmax') return { MIN_EXT: 32775, MAX_EXT: 32776 };
      if (name === 'OES_vertex_array_object') return { createVertexArrayOES: () => ({}), deleteVertexArrayOES: noop, isVertexArrayOES: () => true, bindVertexArrayOES: noop };
      return null;
    },
    getParameter: (p) => {
      if (p === 7938) return 'WebGL 1.0 (E2E Shader Spy)';
      if (p === 35724) return 'WebGL GLSL ES 1.00';
      if (p === 3379) return 4096;
      if (p === 34076) return 4096;
      if (p === 34930 || p === 35660) return 16;
      if (p === 35661) return 32;
      if (p === 34921) return 16;
      if (p === 36348) return 15;
      if (p === 36347 || p === 36349) return 1024;
      return 16;
    },
    getShaderPrecisionFormat: () => ({ rangeMin: 127, rangeMax: 127, precision: 23 }),
    getContextAttributes: () => ({ alpha: true, antialias: true, depth: true, stencil: true, premultipliedAlpha: true }),
    createBuffer: () => ({}),
    bindBuffer: noop,
    bufferData: noop,
    bufferSubData: noop,
    deleteBuffer: noop,
    createTexture: () => ({}),
    activeTexture: noop,
    bindTexture: noop,
    texParameteri: noop,
    texImage2D: noop,
    generateMipmap: noop,
    pixelStorei: noop,
    deleteTexture: noop,
    createFramebuffer: () => ({}),
    bindFramebuffer: noop,
    framebufferTexture2D: noop,
    createRenderbuffer: () => ({}),
    bindRenderbuffer: noop,
    renderbufferStorage: noop,
    framebufferRenderbuffer: noop,
    checkFramebufferStatus: () => 36053,
    deleteFramebuffer: noop,
    deleteRenderbuffer: noop,
    createProgram: () => ({}),
    attachShader: noop,
    linkProgram: noop,
    useProgram: noop,
    deleteProgram: noop,
    getProgramParameter: (p, pname) => (pname === 35714 ? true : 0),
    getProgramInfoLog: () => '',
    createShader: (type) => {
      const sh = { type };
      shaderTypes.set(sh, type);
      return sh;
    },
    shaderSource: (sh, src) => {
      sh.src = src;
      compiledShaders.push({ type: shaderTypes.get(sh) === 35633 ? 'vert' : 'frag', src });
    },
    compileShader: (sh) => {
      if (!sh.src || !sh.src.includes('void main')) {
        glErrors.push('Shader missing void main()');
      }
      // Basic brace balance check across every Three.js & custom GLSL shader
      let bal = 0;
      for (let i = 0; i < sh.src.length; i++) {
        if (sh.src[i] === '{') bal++;
        else if (sh.src[i] === '}') bal--;
        if (bal < 0) { glErrors.push('Unbalanced } in compiled GLSL shader'); break; }
      }
      if (bal !== 0) glErrors.push(`Unbalanced shader braces (${bal})`);
    },
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    deleteShader: noop,
    getUniformLocation: () => ({}),
    getAttribLocation: () => 0,
    enableVertexAttribArray: noop,
    disableVertexAttribArray: noop,
    vertexAttribPointer: noop,
    uniform1i: noop, uniform1f: noop, uniform2f: noop, uniform3f: noop, uniform4f: noop,
    uniform1iv: noop, uniform1fv: noop, uniform2fv: noop, uniform3fv: noop, uniform4fv: noop,
    uniformMatrix3fv: noop, uniformMatrix4fv: noop,
    enable: noop, disable: noop, depthFunc: noop, depthMask: noop, colorMask: noop,
    blendFunc: noop, blendEquation: noop, blendFuncSeparate: noop, blendEquationSeparate: noop,
    cullFace: noop, frontFace: noop, viewport: noop, scissor: noop,
    clearColor: noop, clearDepth: noop, clearStencil: noop, clear: noop,
    drawArrays: noop, drawElements: noop, polygonOffset: noop, lineWidth: noop,
    isContextLost: () => false
  };
  return ctx;
}

const elCache = new Map();
const winListeners = {};
function makeStubEl(id, tag = 'DIV') {
  const cls = new Set();
  const attrs = new Map();
  const listeners = {};
  if (id === 'lab-panel' || id === 'rov-panel') cls.add('closed');
  if (id === 'sub-hud' || id === 'sonar-box' || id === 'hydro-box' || id === 'cam-hud' || id === 'atlas-modal' || id === 'globe-modal' || id === 'journal-modal' || id === 'help-modal') {
    cls.add('hidden');
  }
  const el = {
    id,
    tagName: tag.toUpperCase(),
    style: {},
    value: '24',
    textContent: '',
    innerHTML: '',
    width: 300,
    height: 200,
    clientWidth: 1280,
    clientHeight: 720,
    className: '',
    classList: {
      add: (...c) => c.forEach((x) => cls.add(x)),
      remove: (...c) => c.forEach((x) => cls.delete(x)),
      toggle: (c, f) => (f === undefined ? (cls.has(c) ? (cls.delete(c), false) : (cls.add(c), true)) : (f ? cls.add(c) : cls.delete(c), f)),
      contains: (c) => cls.has(c),
    },
    addEventListener: (ev, fn) => {
      if (!listeners[ev]) listeners[ev] = [];
      listeners[ev].push(fn);
    },
    dispatchEvent: (ev) => {
      const list = listeners[ev.type] || [];
      for (const fn of list) fn(ev);
    },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => attrs.get(k) || null,
    toDataURL: (mime) => `data:${mime || 'image/png'};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk`,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    querySelector: () => makeStubEl(id + '_q', 'DIV'),
    querySelectorAll: () => [],
    closest: () => null,
    appendChild: () => {},
    remove: () => {},
    getContext: (kind) => {
      if (kind === 'webgl' || kind === 'experimental-webgl' || kind === 'webgl2') {
        const gl = createWebGLSpy();
        gl.canvas = el;
        return gl;
      }
      return {
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
        setLineDash: () => {},
        fillStyle: '',
        strokeStyle: '',
        font: '',
        lineWidth: 1,
        lineJoin: 'round',
        filter: '',
      };
    }
  };
  return el;
}

const getEl = (id) => {
  if (!elCache.has(id)) elCache.set(id, makeStubEl(id, id === 'scene' ? 'CANVAS' : 'DIV'));
  return elCache.get(id);
};

// Pre-seed DOM ids from built index.html so document.getElementById matches realistic IDs
for (const mId of html.matchAll(/id="([^"]+)"/g)) getEl(mId[1]);

let rafQueue = [];
const realOriginMs = performance.now();
let simOffsetMs = 0;
const pageErrors = [];
const memStorage = new Map();

const sandbox = {
  window: null,
  self: null,
  globalThis: null,
  document: {
    body: makeStubEl('body'),
    getElementById: getEl,
    querySelector: (sel) => makeStubEl('sel_' + sel),
    querySelectorAll: () => [],
    createElement: (tag) => makeStubEl('dyn_' + tag, tag),
  },
  localStorage: {
    getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null),
    setItem: (k, v) => memStorage.set(k, String(v)),
    removeItem: (k) => memStorage.delete(k),
  },
  navigator: { maxTouchPoints: 0, hardwareConcurrency: 8, getGamepads: () => [] },
  performance: { now: () => simOffsetMs + (performance.now() - realOriginMs) },
  requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
  cancelAnimationFrame: () => {},
  addEventListener: (ev, fn) => {
    if (!winListeners[ev]) winListeners[ev] = [];
    winListeners[ev].push(fn);
  },
  removeEventListener: () => {},
  setTimeout,
  clearTimeout,
  console: {
    log: (...a) => console.log('   [app]', ...a),
    warn: (...a) => console.warn('   [app warn]', ...a),
    error: (...a) => {
      const msg = a.map((x) => (x && x.message ? x.message : String(x))).join(' ');
      const bId = sandbox.OC && sandbox.OC.Biomes ? sandbox.OC.Biomes.getActive().id : 'boot';
      const st = new Error().stack.split('\n').slice(1, 5).map((l) => l.trim()).join(' <- ');
      pageErrors.push(`[${bId}] ${msg} (${st})`);
    },
  },
  Math, Date, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Uint8ClampedArray, Int32Array,
  Set, Map, Error, Object, Array, Number, String, Boolean, JSON,
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(threeBundle, sandbox, { filename: 'three.min.js (bundled)' });
vm.runInContext(appBundle, sandbox, { filename: 'ocean.js (bundled)' });

const OC = sandbox.OC;
assert(OC && typeof OC.getPerfStats === 'function' && typeof OC.switchBiome === 'function', 'Main app bundle failed to expose OC.getPerfStats & OC.switchBiome');

function stepFrames(count, dtMs = 16.67) {
  for (let i = 0; i < count; i++) {
    simOffsetMs += dtMs;
    const nowStamp = simOffsetMs + (performance.now() - realOriginMs);
    const batch = rafQueue.splice(0, rafQueue.length);
    for (const fn of batch) fn(nowStamp);
  }
}

function pressKey(code) {
  const list = winListeners.keydown || [];
  const ev = { code, target: { tagName: 'BODY' }, preventDefault: () => {} };
  for (const fn of list) fn(ev);
}

console.log('2) Exercising initial boot & all interactive hotkeys across full render loop...');
stepFrames(2);
await new Promise((r) => setTimeout(r, 80));
assert.equal(pageErrors.length, 0, `Boot logged errors:\n${pageErrors.join('\n')}`);
assert(rafQueue.length > 0, 'runLoop must schedule requestAnimationFrame after boot()');
stepFrames(28);

for (const code of ['KeyB', 'KeyF', 'KeyG', 'Backquote', 'KeyZ', 'KeyI', 'KeyI', 'KeyL', 'KeyL', 'KeyO', 'Escape', 'KeyK', 'Escape', 'KeyP', 'Enter', 'KeyP', 'KeyN', 'KeyX', 'KeyN', 'Slash', 'Escape']) {
  pressKey(code);
  stepFrames(4);
}
assert(getEl('help-modal').classList.contains('hidden'), 'Escape must close Quick-Help modal after Slash toggled it');
pressKey('Slash');
stepFrames(2);
assert(!getEl('help-modal').classList.contains('hidden'), 'Slash (?) must open Quick-Help modal');
pressKey('Escape');
stepFrames(2);
assert(OC.Hydrophone.isOpen(), 'Backquote (~) hotkey must open Hydrophone FFT');
assert(OC.Minimap.getCoverage() > 0, 'Minimap Fog of War must show initial charted %');

console.log('3) Profiling 9 biomes × 100 continuous frames (900 frames + 3D Multibeam Sonar scans)...');
const biomeList = OC.Biomes.list();
assert.equal(biomeList.length, 9, 'All 9 biomes must be registered in production bundle');

const perfTable = [];
for (const b of biomeList) {
  OC.switchBiome(b.id);
  stepFrames(35); // Complete progressive LOD chunk & flora streaming warmup
  pressKey('KeyG'); // Fire 3D Multibeam Sonar scan in every biome!
  stepFrames(65);
  const st = OC.getPerfStats();
  perfTable.push({
    biome: b.id,
    avgCpuMs: st.avgCpuMs,
    p95CpuMs: st.p95CpuMs,
    maxCpuMs: st.maxCpuMs,
    chunks: st.chunksVisible,
    flora: st.floraInstances,
    fish: st.schoolFish,
    draws: st.drawCalls
  });
}

console.table(perfTable);
for (const row of perfTable) {
  assert(Number.isFinite(row.avgCpuMs) && row.avgCpuMs < 250, `Biome ${row.biome} CPU frame time budget exceeded: ${row.avgCpuMs} ms`);
}
assert.equal(pageErrors.length, 0, `Production bundle logged runtime errors:\n${pageErrors.join('\n')}`);
assert.equal(glErrors.length, 0, `WebGL shader compilation errors:\n${glErrors.join('\n')}`);
assert(compiledShaders.length >= 10, `Expected >= 10 compiled GLSL shaders captured by WebGL spy, got ${compiledShaders.length}`);
console.log(`ALL E2E PRODUCTION BUNDLE CHECKS PASSED! (${compiledShaders.length} GLSL shaders validated, 0 runtime errors across 900 frames).`);
