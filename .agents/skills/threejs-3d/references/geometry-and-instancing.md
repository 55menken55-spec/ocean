# Geometry & Instancing Reference

## Contents

- Built-in Geometries
- Custom BufferGeometry
- InstancedMesh — Thousands of Identical Objects
- Merge Static Geometries — Reduce Draw Calls
- Level of Detail (LOD)
- GPU Particles — Points
- Dynamic Geometry Updates
- Typed Array Reference

BufferGeometry, instancing, merging, LOD, particles, procedural geometry.

---

## Built-in Geometries

All are `BufferGeometry`. Never use legacy `Geometry` (removed r125).

```js
// Core primitives
new THREE.BoxGeometry(w=1, h=1, d=1, segW=1, segH=1, segD=1)
new THREE.SphereGeometry(r=1, widthSegs=32, heightSegs=16, phiStart, phiLen, thetaStart, thetaLen)
new THREE.PlaneGeometry(w=1, h=1, segW=1, segH=1)
new THREE.CylinderGeometry(rTop=1, rBot=1, h=1, radSegs=32, hSegs=1, openEnded=false)
new THREE.ConeGeometry(r=1, h=1, radSegs=32)
new THREE.TorusGeometry(r=1, tube=0.4, radSegs=16, tubSegs=100)
new THREE.TorusKnotGeometry(r=1, tube=0.4, tubSegs=64, radSegs=8, p=2, q=3)
new THREE.RingGeometry(innerR=0.5, outerR=1, thetaSegs=32)
new THREE.CircleGeometry(r=1, segs=32)
new THREE.TubeGeometry(curve, tubSegs=64, r=1, radSegs=8, closed=false)
new THREE.LatheGeometry(points, segs=12, phiStart=0, phiLen=Math.PI*2)
new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled, bevelSize, bevelThickness, steps })
new THREE.ShapeGeometry(shape)
new THREE.EdgesGeometry(geo, thresholdAngle=1)   // outline only
new THREE.WireframeGeometry(geo)

// Smooth sphere alternatives (less poles artifact)
new THREE.IcosahedronGeometry(r=1, detail=0)   // detail 0=20 faces, 4=1280 faces
new THREE.OctahedronGeometry(r=1, detail=0)
```

**Segment count guide:**

|Surface type|Segments|Why|
|---|---|---|
|Flat plane (no displacement)|1×1|Minimum needed — 4 verts|
|Gently curved|8–16|Smooth enough for viewport|
|Highly detailed sphere|32–64|Per-pixel shading hides geometry|
|Displacement mapped terrain|128–512|Enough vertices for height detail|

---

## Custom BufferGeometry

```js
const geo = new THREE.BufferGeometry();

// Positions — required
geo.setAttribute('position', new THREE.Float32BufferAttribute([
  0, 0, 0,
  1, 0, 0,
  0.5, 1, 0,
], 3));

// Normals — for lighting
geo.setAttribute('normal', new THREE.Float32BufferAttribute([
  0, 0, 1,
  0, 0, 1,
  0, 0, 1,
], 3));

// UVs — for textures
geo.setAttribute('uv', new THREE.Float32BufferAttribute([
  0, 0,
  1, 0,
  0.5, 1,
], 2));

// Custom attributes (e.g. per-vertex color, size, ID)
geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colorArray, 3));
geo.setAttribute('aSize',  new THREE.Float32BufferAttribute(sizeArray, 1));

// Indexed (shares vertices — always prefer when possible)
geo.setIndex([0, 1, 2]);

// Auto-compute normals (after positions are set)
geo.computeVertexNormals();

// Bounding sphere (required for frustum culling to work)
geo.computeBoundingSphere();
geo.computeBoundingBox();
```

---

## InstancedMesh — Thousands of Identical Objects

Single draw call regardless of instance count. Use for ≥ 50 identical meshes.

```js
const COUNT = 10_000;
const geo = new THREE.SphereGeometry(0.3, 8, 6);
const mat = new THREE.MeshStandardMaterial({ color: 0x88ccff });

const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
mesh.castShadow    = true;
mesh.receiveShadow = true;
scene.add(mesh);

// --- Set per-instance transforms ---
const dummy = new THREE.Object3D(); // helper (reuse, don't alloc in loop)

for (let i = 0; i < COUNT; i++) {
  dummy.position.set(
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 100,
  );
  dummy.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0);
  dummy.scale.setScalar(0.5 + Math.random() * 1.5);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;

// --- Per-instance color ---
for (let i = 0; i < COUNT; i++) {
  mesh.setColorAt(i, new THREE.Color().setHSL(i / COUNT, 0.8, 0.6));
}
mesh.instanceColor.needsUpdate = true;

// --- Animate instances (pre-alloc outside loop!) ---
const _m4  = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _rot = new THREE.Quaternion();
const _scl = new THREE.Vector3();

renderer.setAnimationLoop(() => {
  const t = timer.getElapsed();
  for (let i = 0; i < COUNT; i++) {
    mesh.getMatrixAt(i, _m4);
    _m4.decompose(_pos, _rot, _scl);
    _pos.y = Math.sin(t + i * 0.05) * 10;
    _m4.compose(_pos, _rot, _scl);
    mesh.setMatrixAt(i, _m4);
  }
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
});
```

---

## Merge Static Geometries — Reduce Draw Calls

One material = one draw call after merge.

```js
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const base = new THREE.BoxGeometry(1, 1, 1);
const geos = [];

for (let i = 0; i < 500; i++) {
  const g = base.clone();
  g.applyMatrix4(new THREE.Matrix4().makeTranslation(
    (Math.random() - 0.5) * 100,
    Math.random() * 20,
    (Math.random() - 0.5) * 100,
  ));
  geos.push(g);
}

// false = single group (1 draw call); true = preserve groups (N draw calls)
const merged = mergeGeometries(geos, false);
scene.add(new THREE.Mesh(merged, new THREE.MeshStandardMaterial()));

// Clean up source geometries
geos.forEach(g => g.dispose());
base.dispose();
```

---

## Level of Detail (LOD)

```js
import * as THREE from 'three';

function makeSphereMesh(segs, mat) {
  return new THREE.Mesh(new THREE.SphereGeometry(1, segs, segs), mat);
}

const mat = new THREE.MeshStandardMaterial({ color: 0x44aaff });
const lod = new THREE.LOD();

lod.addLevel(makeSphereMesh(32, mat), 0);    // high — 0 to 20 units
lod.addLevel(makeSphereMesh(12, mat), 20);   // medium — 20 to 60
lod.addLevel(makeSphereMesh(5, mat), 60);    // low — 60 to 120
lod.addLevel(new THREE.Object3D(), 120);     // invisible beyond 120

scene.add(lod);
// LOD auto-updates based on camera distance in renderer's render()
```

---

## GPU Particles — Points

```js
const COUNT = 50_000;
const positions = new Float32Array(COUNT * 3);
const colors    = new Float32Array(COUNT * 3);
const sizes     = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
  positions[i * 3]     = (Math.random() - 0.5) * 200;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

  const c = new THREE.Color().setHSL(Math.random(), 0.8, 0.7);
  colors[i * 3]     = c.r;
  colors[i * 3 + 1] = c.g;
  colors[i * 3 + 2] = c.b;

  sizes[i] = Math.random() * 3 + 1;
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

// PointsMaterial — simple
const mat = new THREE.PointsMaterial({
  size:         0.5,
  sizeAttenuation: true,   // perspective size (smaller = farther)
  vertexColors: true,
  map:          particleTexture,  // round sprite texture
  transparent:  true,
  depthWrite:   false,     // prevents z-sorting artifacts
  blending:     THREE.AdditiveBlending,
});

const particles = new THREE.Points(geo, mat);
scene.add(particles);
```

---

## Dynamic Geometry Updates

```js
// Update positions every frame (e.g. fluid simulation)
const positions = geo.attributes.position;

for (let i = 0; i < positions.count; i++) {
  positions.setXYZ(
    i,
    Math.cos(elapsed + i * 0.1) * 5,
    Math.sin(elapsed + i * 0.07) * 3,
    Math.sin(elapsed * 0.5 + i * 0.05) * 5,
  );
}

positions.needsUpdate = true;        // REQUIRED — triggers GPU upload
geo.computeVertexNormals();          // only if lighting depends on normals
geo.computeBoundingSphere();         // only if frustum culling is needed
```

---

## Typed Array Reference

|Data|Type|Notes|
|---|---|---|
|position, normal, uv|`Float32Array`|Always|
|Albedo colors (8-bit precision ok)|`Uint8Array`|set `normalized: true`|
|Indices ≤ 65 535 verts|`Uint16Array`|Saves GPU bandwidth|
|Indices > 65 535 verts|`Uint32Array`||
|Per-vertex integers|`Int32Array`||
|Boolean flags|`Uint8Array`|0 or 1|