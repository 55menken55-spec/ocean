# Performance Reference

## Contents

- Profiling First — Measure Before Optimizing
- Draw Call Reduction
- Memory Management (GPU)
- Render Loop Optimizations
- Texture Optimization
- Mobile Optimization
- Geometry Optimization
- Scene Graph
- Performance Checklist

Profiling, draw call reduction, GPU memory, mobile optimization, frustum culling, static optimization.

---

## Profiling First — Measure Before Optimizing

```js
import Stats from 'three/addons/libs/stats.module.js';

const stats = new Stats();
stats.showPanel(0); // 0: fps | 1: ms/frame | 2: MB memory
document.body.appendChild(stats.dom);

renderer.setAnimationLoop(() => {
  stats.begin();
  // ... render ...
  stats.end();
});

// renderer.info — draw call audit
console.log(renderer.info.render);
// {
//   calls: 42,         ← draw calls (target < 100 for mobile, < 1000 desktop)
//   triangles: 58000,  ← total triangles
//   points: 0,
//   lines: 0
// }
console.log(renderer.info.memory);
// {
//   geometries: 14,    ← GPU buffer objects
//   textures: 28       ← GPU textures
// }

// Reset counters per frame (for per-frame accuracy)
renderer.info.autoReset = true;
```

---

## Draw Call Reduction

Draw calls are the #1 bottleneck on mobile.

|Technique|When|Draw call reduction|
|---|---|---|
|`InstancedMesh`|≥50 identical meshes|N → 1|
|`mergeGeometries`|Static meshes, same material|N → 1|
|Material reuse|Multiple meshes, same look|Reduces state changes|
|Texture atlas|Multiple small textures|Reduces texture binds|
|LOD|Detailed models at distance|Reduces triangle count|
|`mesh.visible = false`|Toggle visibility|Skips render entirely|
|`mesh.frustumCulled = true`|On by default|Skips off-screen objects|

```js
// Check current draw call count per frame
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  if (renderer.info.render.calls > 200) {
    console.warn('Draw calls:', renderer.info.render.calls);
  }
});
```

---

## Memory Management (GPU)

```js
// Dispose pattern — always call when removing objects
function disposeObject3D(obj) {
  obj.traverse(child => {
    if (!child.isMesh && !child.isLine && !child.isPoints) return;

    child.geometry?.dispose();

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(mat => {
      const keys = [
        'map','lightMap','bumpMap','normalMap','specularMap','envMap',
        'alphaMap','aoMap','displacementMap','emissiveMap','gradientMap',
        'metalnessMap','roughnessMap','clearcoatMap','clearcoatNormalMap',
        'transmissionMap','thicknessMap',
      ];
      keys.forEach(k => mat[k]?.dispose());
      mat.dispose();
    });
  });
  obj.parent?.remove(obj);
}

// Monitor memory leaks
setInterval(() => {
  console.log(
    'Geometries:', renderer.info.memory.geometries,
    'Textures:',  renderer.info.memory.textures,
  );
}, 5000);
```

---

## Render Loop Optimizations

```js
// 1. Pre-allocate — never new inside loop
const _v3   = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _box  = new THREE.Box3();

// 2. Cache expensive computations
let cachedCenter = new THREE.Vector3();
function updateCenter() {  // call only when model changes
  new THREE.Box3().setFromObject(model).getCenter(cachedCenter);
}

// 3. On-demand rendering — for static/interactive scenes
let needsRender = true;
function requestRender() { needsRender = true; }
controls.addEventListener('change', requestRender);

renderer.setAnimationLoop(() => {
  if (!needsRender) return;
  needsRender = false;
  renderer.render(scene, camera);
});

// 4. Frustum culling (on by default — don't disable unless needed)
mesh.frustumCulled = true;  // default
skinnedMesh.frustumCulled = false;  // disable for animated meshes (safe)

// 5. Static objects — disable matrix auto-update
staticMesh.matrixAutoUpdate = false;
staticMesh.updateMatrix();  // call once after positioning

// 6. Visibility over add/remove
object.visible = false;  // O(1), stays in scene graph
// vs scene.remove(object)  // O(n) traversal
```

---

## Texture Optimization

```js
// Power-of-two dimensions ONLY
// Valid:   64, 128, 256, 512, 1024, 2048, 4096 (non-square OK: 512×2048)
// Invalid: 600, 800, 1000 → broken mipmaps, browser warnings

// Cap texture size based on device
const maxTexSize = renderer.capabilities.maxTextureSize;
// Mobile: typically 4096 | Desktop: 8192–16384

// Compress textures for production
// KTX2 with Basis compression = 4–8× smaller GPU footprint
// Use: npx ktx2-compress input.png output.ktx2

// Mipmaps — always enabled for textures viewed at distance
tex.generateMipmaps = true;
tex.minFilter = THREE.LinearMipmapLinearFilter;

// Anisotropy — floor/wall textures at oblique angles
tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
```

---

## Mobile Optimization

```js
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,  // disable MSAA on mobile
});

renderer.setPixelRatio(isMobile
  ? Math.min(devicePixelRatio, 1.5)  // lower on mobile
  : Math.min(devicePixelRatio, 2)    // cap at 2 on desktop
);

// Mobile shadow quality
if (isMobile) {
  sun.shadow.mapSize.set(512, 512);
  renderer.shadowMap.type = THREE.BasicShadowMap;
}

// Reduce particle count on mobile
const COUNT = isMobile ? 1_000 : 10_000;

// Simpler materials on mobile
const mat = new THREE.MeshStandardMaterial({
  envMapIntensity: isMobile ? 0.5 : 1.0,
});

// Power management
renderer = new THREE.WebGLRenderer({ powerPreference: 'low-power' }); // mobile
renderer = new THREE.WebGLRenderer({ powerPreference: 'high-performance' }); // desktop
```

---

## Geometry Optimization

```js
// Merge static draw calls
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// InstancedMesh for repeated objects
const mesh = new THREE.InstancedMesh(geo, mat, count);

// LOD for distance scaling
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);
lod.addLevel(lowDetailMesh, 50);
lod.addLevel(new THREE.Object3D(), 150); // invisible

// Use indices (shared vertices)
geo.setIndex(indices);  // saves bandwidth + improves cache

// Minimize vertex count
new THREE.SphereGeometry(1, 8, 6);   // 54 verts — for distant objects
new THREE.SphereGeometry(1, 32, 24); // 792 verts — close up
```

---

## Scene Graph

```js
// Group related objects — transforms hierarchy
const car = new THREE.Group();
car.add(body, wheels, windows);
scene.add(car);

// Use layers for selective rendering
const BLOOM_LAYER = 1;
const UI_LAYER    = 2;
mesh.layers.set(BLOOM_LAYER);

// Disable invisible group traversal
group.visible = false;  // Three.js skips entire subtree
```

---

## Performance Checklist

**Before every production deployment:**

- [ ] `renderer.info.render.calls` < 100 (mobile) / < 500 (desktop)
- [ ] All textures are power-of-two dimensions
- [ ] Large geometry files use DRACO compression
- [ ] Textures ≥ 512px use KTX2 compression
- [ ] No `new THREE.Vector3()` / `new THREE.Color()` inside `setAnimationLoop()`
- [ ] All removed objects call `.dispose()` on geo + material + textures
- [ ] `Stats.js` removed (or gated by `DEBUG` flag)
- [ ] Helper meshes removed (`AxesHelper`, `GridHelper`, etc.)
- [ ] Shadow maps sized appropriately (512–1024 mobile, 1024–2048 desktop)
- [ ] `renderer.setPixelRatio(Math.min(dpr, 2))` applied
- [ ] Mobile tested on real device (not just browser emulation)
- [ ] Memory stable over time (no growing `renderer.info.memory.geometries`)