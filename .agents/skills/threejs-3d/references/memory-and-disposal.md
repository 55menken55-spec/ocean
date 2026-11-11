# Memory Management & Disposal Reference

## Contents

- Core Rule
- Dispose a Single Mesh (standard pattern)
- Recursive Disposal (entire model hierarchy)
- Render Targets
- Renderer Disposal
- React useEffect Cleanup Pattern
- Reuse vs. Create
- Object Pool (spawn-heavy scenarios)
- Loop Allocation Prevention
- Memory Leak Detection

Three.js does NOT garbage-collect GPU resources automatically. Missing `.dispose()` = memory leak = browser crash.

---

## Core Rule

```
scene.remove(mesh)  ≠  GPU memory freed
```

You must explicitly call `.dispose()` on every GPU resource: geometries, materials, textures, render targets, renderers.

---

## Dispose a Single Mesh (standard pattern)

```js
// Full disposal helper — copy this, use everywhere
const TEXTURE_MAP_KEYS = [
  'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap',
  'alphaMap', 'aoMap', 'displacementMap', 'emissiveMap', 'gradientMap',
  'metalnessMap', 'roughnessMap', 'clearcoatMap', 'clearcoatNormalMap',
  'clearcoatRoughnessMap', 'transmissionMap', 'thicknessMap',
  'sheenColorMap', 'sheenRoughnessMap', 'anisotropyMap', 'iridescenceMap',
];

function disposeMaterial(mat) {
  TEXTURE_MAP_KEYS.forEach(key => { if (mat[key]) mat[key].dispose(); });
  mat.dispose();
}

function disposeMesh(mesh, scene) {
  scene?.remove(mesh);
  mesh.geometry?.dispose();

  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach(disposeMaterial);
}
```

---

## Recursive Disposal (entire model hierarchy)

```js
function disposeHierarchy(root, scene) {
  root.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();

    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(disposeMaterial);
    }
  });

  scene?.remove(root);
}

// Usage: loading a new level, removing an entire scene section
disposeHierarchy(oldLevel, scene);
```

---

## Render Targets

```js
const rt = new THREE.WebGLRenderTarget(1024, 1024, {
  format:        THREE.RGBAFormat,
  type:          THREE.FloatType,
  depthBuffer:   true,
  stencilBuffer: false,
});

// When no longer needed:
rt.texture.dispose();
rt.depthTexture?.dispose();
rt.dispose();
```

---

## Renderer Disposal

```js
function destroyRenderer(renderer, container) {
  renderer.setAnimationLoop(null);  // stop loop first
  renderer.dispose();               // free WebGL context resources
  renderer.forceContextLoss();      // force WebGL context loss
  container?.removeChild(renderer.domElement);
  renderer.domElement = null;
}
```

---

## React useEffect Cleanup Pattern

```js
useEffect(() => {
  // Create
  const geo  = new THREE.BoxGeometry();
  const mat  = new THREE.MeshStandardMaterial({ color: 0x4488ff });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // ALWAYS return cleanup
  return () => {
    scene.remove(mesh);
    geo.dispose();
    mat.dispose();
    // Don't forget textures if any:
    // mat.map?.dispose();
  };
}, []); // empty deps = runs once, cleans up on unmount
```

---

## Reuse vs. Create

```js
// BAD — creates new GPU objects every call (60× per second = crash)
renderer.setAnimationLoop(() => {
  const geo = new THREE.BoxGeometry(); // ❌ new buffer every frame
  const mat = new THREE.MeshBasicMaterial(); // ❌
  // ...
});

// GOOD — create once, reuse
const geo = new THREE.BoxGeometry();
const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

function spawnMesh(pos) {
  const mesh = new THREE.Mesh(geo, mat); // ✅ shared GPU objects
  mesh.position.copy(pos);
  return mesh;
}
```

---

## Object Pool (spawn-heavy scenarios)

```js
class MeshPool {
  constructor(geo, mat, size, scene) {
    this.scene  = scene;
    this.pool   = [];
    this.active = new Set();

    for (let i = 0; i < size; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.pool.push(m);
    }
  }

  spawn(position, userData = {}) {
    const mesh = this.pool.pop();
    if (!mesh) return null; // pool exhausted
    mesh.position.copy(position);
    mesh.visible = true;
    mesh.userData = userData;
    this.active.add(mesh);
    return mesh;
  }

  release(mesh) {
    if (!this.active.has(mesh)) return;
    mesh.visible = false;
    this.active.delete(mesh);
    this.pool.push(mesh);
  }

  // Full cleanup (on scene exit)
  dispose() {
    [...this.pool, ...this.active].forEach(m => {
      m.geometry.dispose();
      m.material.dispose();
      this.scene.remove(m);
    });
    this.pool.length = 0;
    this.active.clear();
  }
}

// Usage
const bullets = new MeshPool(
  new THREE.SphereGeometry(0.05, 4, 4),
  new THREE.MeshBasicMaterial({ color: 0xffff00 }),
  100,
  scene,
);

// Spawn
const b = bullets.spawn(gun.position);

// Release (on hit or timeout)
bullets.release(b);
```

---

## Loop Allocation Prevention

```js
// Pre-allocate OUTSIDE the loop (do this once at module level)
const _v3   = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _m4   = new THREE.Matrix4();
const _box  = new THREE.Box3();
const _col  = new THREE.Color();
const _ray  = new THREE.Raycaster();

renderer.setAnimationLoop(() => {
  // GOOD — reuse pre-allocated objects
  _v3.subVectors(target.position, mesh.position);
  _v3.normalize();

  // BAD — allocates every frame
  // const dir = new THREE.Vector3().subVectors(target.position, mesh.position); ❌
});
```

---

## Memory Leak Detection

```js
// Log every 5 seconds — watch for growing counts
setInterval(() => {
  const { geometries, textures } = renderer.info.memory;
  console.log(`GPU: ${geometries} geometries, ${textures} textures`);
}, 5000);

// Expected: stable numbers during steady state
// Warning: count keeps growing = memory leak — check dispose() calls
```