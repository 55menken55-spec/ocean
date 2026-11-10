# Lighting & Shadows Reference

## Contents

- Light Types
- 3-Point Lighting Setup (professional default)
- Shadow Configuration
- Cascaded Shadow Maps (CSM) — Large Outdoor Scenes
- Baked Lighting (Lightmaps)
- Environment Light (HDRI IBL)
- Light Performance Guide
- Light Helpers (development only)

Three-point lighting, shadow maps, CSM, HDRI, baked lightmaps.

---

## Light Types

```js
// AmbientLight — uniform, no direction, no shadows
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

// HemisphereLight — sky vs ground color gradient (better than pure ambient)
const hemi = new THREE.HemisphereLight(
  0xc8e0ff,  // sky color (top)
  0x553311,  // ground color (bottom)
  0.6        // intensity
);
scene.add(hemi);

// DirectionalLight — parallel rays (sun), casts shadows
const sun = new THREE.DirectionalLight(0xfff5dd, 3);
sun.position.set(5, 10, 7.5);
sun.castShadow = true;
scene.add(sun);

// PointLight — omnidirectional from a point
const point = new THREE.PointLight(0xff8800, 5, 20, 2);
// params: color, intensity, distance, decay
// decay: 2 = physically correct inverse-square falloff
point.position.set(0, 3, 0);
point.castShadow = true;
scene.add(point);

// SpotLight — cone, like a lamp or stage light
const spot = new THREE.SpotLight(0xffffff, 10);
spot.position.set(0, 10, 0);
spot.target.position.set(0, 0, 0); // aim point
spot.angle = Math.PI / 8;          // cone half-angle
spot.penumbra = 0.3;               // 0 = hard edge, 1 = fully soft
spot.decay = 2;
spot.castShadow = true;
scene.add(spot);
scene.add(spot.target);            // REQUIRED: add target to scene

// RectAreaLight — area light (fluorescent tube, monitor glow)
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
RectAreaLightUniformsLib.init(); // REQUIRED once

const rect = new THREE.RectAreaLight(0xffffff, 5, 4, 2); // intensity, width, height
rect.position.set(0, 5, -3);
rect.lookAt(0, 0, 0);
scene.add(rect);
// RectAreaLight does NOT cast shadows
```

---

## 3-Point Lighting Setup (professional default)

```js
function setupThreePointLighting(scene) {
  // Key light — main illumination
  const key = new THREE.DirectionalLight(0xfff5dd, 3);
  key.position.set(5, 8, 5);
  key.castShadow = true;
  configureShadow(key, 10, 2048);
  scene.add(key);

  // Fill light — soften shadows (opposite side, weaker)
  const fill = new THREE.DirectionalLight(0xaaccff, 0.8);
  fill.position.set(-5, 3, 2);
  scene.add(fill);

  // Rim light — edge highlight, separation from background
  const rim = new THREE.DirectionalLight(0xffffff, 1.5);
  rim.position.set(0, 5, -8);
  scene.add(rim);

  // Ambient / hemisphere fill
  const hemi = new THREE.HemisphereLight(0xc8e0ff, 0x664422, 0.4);
  scene.add(hemi);

  return { key, fill, rim, hemi };
}
```

---

## Shadow Configuration

```js
function configureShadow(light, radius = 10, mapSize = 1024) {
  light.castShadow = true;

  // Shadow map resolution (higher = sharper, more memory)
  light.shadow.mapSize.set(mapSize, mapSize);
  // Mobile: 512 | Standard: 1024 | High quality: 2048 | Ultra: 4096

  // Shadow camera — TIGHT fit = better resolution usage
  light.shadow.camera.left   = -radius;
  light.shadow.camera.right  =  radius;
  light.shadow.camera.top    =  radius;
  light.shadow.camera.bottom = -radius;
  light.shadow.camera.near   = 0.5;
  light.shadow.camera.far    = radius * 3;

  // Bias prevents shadow acne (self-shadowing artifacts)
  light.shadow.bias = -0.001;           // tweak until acne disappears
  light.shadow.normalBias = 0.02;       // for thin geometry (grass, leaves)

  // Radius (PCFShadowMap, r186+) — soft shadow edge
  light.shadow.radius = 4;

  light.shadow.camera.updateProjectionMatrix();
}

// Objects must opt-in to casting/receiving shadows
mesh.castShadow    = true;
mesh.receiveShadow = true;

// Small/distant objects: disable for perf
smallDetail.castShadow    = false;
smallDetail.receiveShadow = false;
```

---

## Cascaded Shadow Maps (CSM) — Large Outdoor Scenes

Built-in DirectionalLight shadows break down in large scenes. CSM partitions the frustum into cascades.

```js
import { CSM } from 'three/addons/csm/CSM.js';
import { CSMHelper } from 'three/addons/csm/CSMHelper.js';

const csm = new CSM({
  maxFar:        500,
  cascades:      4,
  shadowMapSize: 1024,
  lightDirection: new THREE.Vector3(-1, -1, -1).normalize(),
  lightIntensity: 3,
  lightColor:     new THREE.Color(0xfff5dd),
  camera:        camera,
  parent:        scene,
  mode:          'practical',  // 'uniform' | 'logarithmic' | 'practical' | 'custom'
  fade:          true,
});

// Apply CSM to materials that receive shadows
csm.setupMaterial(groundMat);
csm.setupMaterial(treeMat);

// Debug helper (remove in production)
const csmHelper = new CSMHelper(csm);
scene.add(csmHelper);

// Update in render loop
renderer.setAnimationLoop(() => {
  csm.update();
  // csmHelper.update(); // if using helper
  renderer.render(scene, camera);
});

// Cleanup
csm.dispose();
```

---

## Baked Lighting (Lightmaps)

Pre-computed lighting is essentially free at runtime — ideal for static scenes.

```js
// Lightmaps use UV channel 1 (not the default UV0)
// Your geometry needs a second UV set (usually exported from Blender)

const lightMap = new THREE.TextureLoader().load('lightmap.png');
lightMap.colorSpace = THREE.SRGBColorSpace;

const mat = new THREE.MeshStandardMaterial({
  map:               albedoTex,
  lightMap:          lightMap,
  lightMapIntensity: 1,
});

// Ensure geometry has uv1 attribute
// (glTF exports: "Export > UV Maps" checkbox)
// If geometry only has uv, copy it:
geo.setAttribute('uv1', geo.attributes.uv.clone());
```

---

## Environment Light (HDRI IBL)

Best ambient lighting for PBR materials — see materials-and-textures.md for full setup.

```js
// Quick recipe
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

new RGBELoader().load('studio.hdr', hdr => {
  const env = pmrem.fromEquirectangular(hdr).texture;
  scene.environment = env;          // IBL for all PBR materials
  scene.background  = env;          // skybox
  scene.backgroundBlurriness = 0.05; // slight blur (r163+)
  hdr.dispose();
  pmrem.dispose();
});
```

---

## Light Performance Guide

|Light type|Shadow support|Relative cost|Notes|
|---|---|---|---|
|AmbientLight|No|Lowest|Use HemisphereLight instead|
|HemisphereLight|No|Very low|Great ambient fill|
|DirectionalLight|Yes|Low-Med|One per scene ideally|
|PointLight|Yes (cubemap!)|High|Limit to 2–3|
|SpotLight|Yes|Med-High|Cheaper than PointLight|
|RectAreaLight|No|Med|Requires RectAreaLightUniformsLib|

**Rules:**

- Keep total lights ≤ 4–6 for mobile
- Each shadow-casting light = 1 or 6 (PointLight!) shadow map render passes
- Prefer baked lighting for static scenes
- Use HDRI env map instead of many ambient/hemisphere lights
- `AmbientLight` alone looks flat — use `HemisphereLight` for ground/sky variation

---

## Light Helpers (development only)

```js
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';

// Remove ALL helpers before production
const helpers = [
  new THREE.DirectionalLightHelper(sun, 1),
  new THREE.PointLightHelper(point, 0.5),
  new THREE.SpotLightHelper(spot),
  new THREE.CameraHelper(sun.shadow.camera),   // visualize shadow frustum
  new RectAreaLightHelper(rect),
];
helpers.forEach(h => scene.add(h));
```