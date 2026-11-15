/* ================= ОБЩАЯ ПЕСОЧНИЦА ДЛЯ ТЕСТОВ (tests/verify*.mjs) ================= */
/* Поднимает DOM-заглушки, загружает three.min.js и все модули src/ в VM-контекст,
   плюс фейковый Web Worker для террейна. Раньше этот код жил в начале монолитного
   tests/verify.mjs (долг 1.4: файл разбит на модули, песочница одна на всех). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

export const ROOT = process.cwd();

/* Порядок модулей живёт в build.py (единственный источник правды).
   Здесь он только читается, чтобы сборка и верификация не разъезжались. */
export const MODULE_ORDER = JSON.parse(execFileSync('python3', [path.join(ROOT, 'build.py'), '--list'], { encoding: 'utf8' }));
assert(MODULE_ORDER.length > 0, 'build.py --list вернул пустой порядок модулей');
export const SRC_ORDER = MODULE_ORDER.map((rel) => path.join('src', rel));

/* Склеивает исходники группы по префиксу из общего порядка модулей:
   новые файлы группы подхватываются автоматически, список не надо править. */
export function groupSource(prefix) {
  const files = MODULE_ORDER.filter((rel) => rel.startsWith(prefix));
  assert(files.length > 0, `groupSource: в ORDER нет модулей с префиксом ${prefix}`);
  return files.map((rel) => fs.readFileSync(path.join(ROOT, 'src', rel), 'utf8')).join('\n');
}

/* Проверяет синтаксис всех модулей src/ и возвращает их число. */
export function parseAllSources() {
  for (const rel of SRC_ORDER) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    new vm.Script(code, { filename: rel });
  }
  return SRC_ORDER.length;
}

export function makeStubEl(id) {
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

/* Поднимает песочницу и загружает в неё движок. Возвращает объект с T/OC и
   управлением фейковым воркером террейна. */
export function createHarness() {
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
    Uint8Array,
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

  /* ---- Фейковый Web Worker для террейна ----
     Без него проверялся только синхронный fallback: `typeof Worker` в песочнице
     всегда undefined, то есть основной (и единственный в браузере) путь постройки
     чанков оставался непроверенным. Именно так незамеченной прошла ошибка размера
     буфера цветов: синхронный путь считает цвета на месте и корректен, а воркерный
     читал за границей буфера и получал undefined -> NaN-цвета вершин.
     Воркер выполняется синхронно в том же контексте, поэтому детерминирован. */
  /* Исходник воркера забираем из Blob, который создаёт сам terrain.js: так в
     песочницу попадает ровно тот текст, что уходит в настоящий Worker (включая
     подставленный через toString() исходник assembleChunkMesh), а не шаблонная
     строка до подстановки. */
  let fakeWorkerInstance = null;
  let fakeBlobInstance = null;
  sandbox.Blob = class { constructor(parts) { this.parts = parts; fakeBlobInstance = this; } };
  sandbox.URL = { createObjectURL: () => 'blob:terrain-worker', revokeObjectURL: () => {} };
  let forceSyncPath = false; // заставляет конструктор падать, чтобы terrain.js ушёл в синхронный fallback
  sandbox.Worker = class FakeWorker {
    constructor() {
      // Если флаг взведён — бросаем: terrain.js перехватывает ошибку создания
      // воркера и строит чанки синхронно. Так получается «чистый» синхронный снимок.
      if (forceSyncPath) { fakeWorkerInstance = null; throw new Error('forced sync fallback'); }
      this.onmessage = null;
      this.onerror = null;
      fakeWorkerInstance = this;
    }
    postMessage(msg) {
      assert(fakeBlobInstance && fakeBlobInstance.parts[0], 'terrain.js must create the worker from a Blob');
      const self = { onmessage: null, postMessage: (r) => { if (this.onmessage) this.onmessage({ data: r }); } };
      vm.runInNewContext(fakeBlobInstance.parts[0],
        { self, Math, Float32Array, Uint32Array, Uint8Array, console },
        { filename: 'terrain-worker.js' });
      if (self.onmessage) self.onmessage({ data: msg });
    }
    terminate() {}
  };

  vm.createContext(sandbox);
  const threeCode = fs.readFileSync(path.join(ROOT, 'three.min.js'), 'utf8');
  vm.runInContext(threeCode, sandbox, { filename: 'three.min.js' });

  // Загружаем все модули, кроме main.js (он автозапускается и требует настоящего DOM)
  for (const rel of SRC_ORDER.slice(0, -1)) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    vm.runInContext(code, sandbox, { filename: rel });
  }

  const T = sandbox.THREE;
  const OC = sandbox.OC;
  const biome = OC.Biomes.getActive();
  assert(biome && biome.id === 'great_barrier_reef', 'Active biome must be great_barrier_reef');

  return {
    assert, fs, path, vm, ROOT, MODULE_ORDER, SRC_ORDER, groupSource,
    sandbox, T, OC, biome, getEl, memStorage,
    /* Прямой доступ к песочнице нужен редко: например, чтобы подменить
       navigator.getGamepads для проверки геймпада. */
    setForceSyncPath(v) { forceSyncPath = !!v; },
    getForceSyncPath() { return forceSyncPath; },
    getFakeWorker() { return fakeWorkerInstance; },
    /* Гасим живой воркер через onerror — тем же способом terrain.js сам
       сбрасывает terrainWorker в null после ошибки создания. */
    dropWorker(message) {
      if (fakeWorkerInstance) fakeWorkerInstance.onerror(new Error(message || 'drop worker'));
      return fakeWorkerInstance;
    }
  };
}
