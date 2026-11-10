# Materials & Textures Reference

## Contents

- Material Selection Guide
- MeshStandardMaterial — Full API
- MeshPhysicalMaterial — Extended PBR
- Texture Loading
- Color Space — Critical Rules
- Texture Configuration
- Environment Maps (IBL — Image-Based Lighting)
- KTX2 Compressed Textures
- onBeforeCompile — Shader Injection
- Transparency Best Practices

PBR materials, texture loading, color space, environment maps, KTX2.

---

## Material Selection Guide

|Material|Cost|Use when|
|---|---|---|
|`MeshBasicMaterial`|Lowest|Unlit, wireframe, debug, UI panels|
|`MeshLambertMaterial`|Low|Simple low-poly, stylized|
|`MeshPhongMaterial`|Low-Med|Legacy specular; prefer Standard instead|
|`MeshStandardMaterial`|Medium|**Default for most 3D work**|
|`MeshPhysicalMaterial`|Med-High|Glass, clearcoat, fabric, iridescence|
|`MeshToonMaterial`|Low|Cel-shading, anime aesthetic|
|`MeshNormalMaterial`|Dev only|Debugging normals|
|`MeshDepthMaterial`|Dev only|Debugging depth|
|`ShaderMaterial`|Varies|Full custom GLSL|
|`RawShaderMaterial`|Varies|Full GLSL, no injected uniforms|
|`SpriteMaterial`|Low|Billboards, HUD icons|

---

## MeshStandardMaterial — Full API

```js
const mat = new THREE.MeshStandardMaterial({
  // Base appearance
  color:              0xffffff,
  roughness:          0.5,         // 0 = mirror | 1 = matte
  metalness:          0.0,         // 0 = dielectric | 1 = metal

  // Texture maps
  map:                albedoTex,       // albedo (SRGBColorSpace)
  normalMap:          normalTex,       // tangent-space normal
  normalScale:        new THREE.Vector2(1, 1),
  roughnessMap:       roughTex,        // R channel
  metalnessMap:       metalTex,        // B channel (same texture common)
  aoMap:              aoTex,           // R channel — needs uv2 on geometry
  aoMapIntensity:     1,
  emissive:           new THREE.Color(0x000000),
  emissiveMap:        emissiveTex,     // (SRGBColorSpace)
  emissiveIntensity:  1,
  displacementMap:    dispTex,         // grayscale height
  displacementScale:  0.1,
  displacementBias:   0,
  alphaMap:           alphaTex,        // grayscale alpha
  envMapIntensity:    1,               // IBL strength

  // Blending / transparency
  transparent:        false,
  opacity:            1,
  alphaTest:          0,               // prefer over transparent when possible
  alphaToCoverage:    false,           // MSAA-based smooth alpha

  // Rendering
  side:               THREE.FrontSide, // FrontSide | BackSide | DoubleSide
  depthWrite:         true,
  depthTest:          true,
  wireframe:          false,
  flatShading:        false,
  fog:                true,
  vertexColors:       false,
});
```

---

## MeshPhysicalMaterial — Extended PBR

```js
const mat = new THREE.MeshPhysicalMaterial({
  ...standardProps,  // all MeshStandardMaterial props apply

  // Clearcoat (car paint, lacquer, nail polish)
  clearcoat:            1.0,
  clearcoatRoughness:   0.1,
  clearcoatMap:         clearcoatTex,
  clearcoatNormalMap:   clearcoatNormalTex,

  // Glass / transmission
  transmission:         1.0,          // 1 = fully transparent glass
  transmissionMap:      transmissionTex,
  thickness:            0.5,          // volume thickness in world units
  ior:                  1.5,          // index of refraction (glass ≈ 1.5)
  attenuationColor:     new THREE.Color(0xffffff),
  attenuationDistance:  Infinity,

  // Fabric / velvet (sheen)
  sheen:                1.0,
  sheenRoughness:       0.5,
  sheenColor:           new THREE.Color(0xffffff),
  sheenColorMap:        sheenTex,

  // Iridescence (soap bubble, beetle wings, CD)
  iridescence:          1.0,
  iridescenceIOR:       1.3,
  iridescenceThicknessRange: [100, 400],

  // Anisotropy (brushed metal)
  anisotropy:           1.0,
  anisotropyRotation:   0,
  anisotropyMap:        anisotropyTex,
});
```

---

## Texture Loading

```js
const loader = new THREE.TextureLoader();

// Callback style
loader.load('albedo.jpg', tex => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  material.map = tex;
  material.needsUpdate = true;
});

// Promise wrapper (preferred)
function loadTexture(url, colorSpace = THREE.LinearSRGBColorSpace) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      tex => { tex.colorSpace = colorSpace; resolve(tex); },
      undefined,
      reject,
    );
  });
}

// Parallel load
const [albedo, normal, roughMetal] = await Promise.all([
  loadTexture('albedo.jpg',    THREE.SRGBColorSpace),
  loadTexture('normal.jpg'),   // linear (default)
  loadTexture('roughMetal.jpg'), // linear (R=rough, G=metal common)
]);
```

## Color Space — Critical Rules

|Map|colorSpace|Wrong value causes|
|---|---|---|
|Albedo / emissive|`SRGBColorSpace`|Washed-out / over-bright colors|
|Normal / roughness / metalness / AO / displacement|`LinearSRGBColorSpace` (default)|Incorrect lighting|

```js
// Always set explicitly on albedo:
tex.colorSpace = THREE.SRGBColorSpace;

// Never set on data maps (let default apply):
// normalTex.colorSpace = THREE.LinearSRGBColorSpace; // this is the default
```

---

## Texture Configuration

```js
// Wrapping
tex.wrapS = THREE.RepeatWrapping;      // ClampToEdgeWrapping | RepeatWrapping | MirroredRepeatWrapping
tex.wrapT = THREE.RepeatWrapping;
tex.repeat.set(2, 2);                  // tile count
tex.offset.set(0, 0);                  // UV offset (0–1)
tex.rotation = Math.PI / 4;            // rotation in radians
tex.center.set(0.5, 0.5);             // pivot for rotation

// Filtering
tex.minFilter = THREE.LinearMipmapLinearFilter; // best quality with mipmaps (default)
tex.magFilter = THREE.LinearFilter;             // magnification (default)

// Pixel art / nearest-neighbor
tex.minFilter = THREE.NearestFilter;
tex.magFilter = THREE.NearestFilter;
tex.generateMipmaps = false;

// Anisotropy (critical for floor/wall textures)
tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // max = 16 on most GPUs
// Use 4 or 8 for a balance of quality vs perf

// Texture must be power-of-two for mipmaps:
// VALID:   64, 128, 256, 512, 1024, 2048, 4096 (can be non-square: 512×1024)
// INVALID: 600, 900, 1000 → no mipmaps, potential artifacts
```

---

## Environment Maps (IBL — Image-Based Lighting)

IBL provides physically correct ambient lighting and reflections for PBR materials.

```js
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// 1. Load HDR
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader().load('environment.hdr', hdrTex => {
  const envMap = pmremGenerator.fromEquirectangular(hdrTex).texture;

  scene.environment = envMap;    // affects ALL PBR materials
  scene.background  = envMap;   // show as skybox (optional)

  hdrTex.dispose();              // dispose original HDR data
  pmremGenerator.dispose();      // dispose generator
});

// 2. Control per-material
material.envMapIntensity = 1.5;  // 0 = no IBL | >1 = brighter reflections
material.envMap = envMap;        // explicit per-material (if not using scene.environment)

// 3. Background blur (r163+)
scene.backgroundBlurriness = 0.1;  // 0 = sharp | 1 = fully blurred skybox
scene.backgroundIntensity  = 0.8;  // darken/brighten background independently
```

---

## KTX2 Compressed Textures

4–8× less GPU memory than JPEG/PNG. Use in production.

```js
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const ktx2 = new KTX2Loader()
  .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/libs/basis/')
  .detectSupport(renderer);  // detects GPU format support (ETC1S, UASTC, etc.)

ktx2.load('texture.ktx2', tex => {
  // Texture arrives already in the optimal GPU format for this device
  material.map = tex;
  material.needsUpdate = true;
});
```

---

## onBeforeCompile — Shader Injection

Modify built-in materials without full custom ShaderMaterial:

```js
const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff });

mat.onBeforeCompile = shader => {
  // Inject custom uniforms
  shader.uniforms.uTime  = { value: 0 };
  shader.uniforms.uWaveH = { value: 0.2 };

  // Add to vertex shader
  shader.vertexShader = `
    uniform float uTime;
    uniform float uWaveH;
  ` + shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     transformed.y += sin(position.x * 4.0 + uTime * 2.0) * uWaveH;`,
  );

  // Store for loop updates
  mat.userData.shader = shader;
};

// Update uniforms in render loop
renderer.setAnimationLoop(() => {
  if (mat.userData.shader) {
    mat.userData.shader.uniforms.uTime.value = timer.getElapsed();
  }
  renderer.render(scene, camera);
});
```

---

## Transparency Best Practices

```js
// 1. alphaTest — cheapest (no sorting, no depth issues)
mat.alphaTest = 0.5;

// 2. Full transparency — requires sorting (slower)
mat.transparent = true;
mat.opacity = 0.5;
mat.depthWrite = false;  // prevents z-fighting with other transparent objects

// 3. Additive blending (fire, glow, particles)
mat.blending = THREE.AdditiveBlending;
mat.transparent = true;
mat.depthWrite = false;

// 4. renderOrder — force draw order
particleMesh.renderOrder = 999;  // draw last

// 5. alphaToCoverage (r139+) — MSAA-smooth edges without full transparency
mat.alphaToCoverage = true;  // requires renderer antialias: true
```