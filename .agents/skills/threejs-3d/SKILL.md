---
name: threejs-3d
description: >-
  Builds production-grade Three.js and 3D web experiences with modern r186+ code: correct disposal,
  delta-time animation, import maps and professional visual quality. Covers scenes and renderers,
  GLTF/GLB/OBJ/FBX loading, PBR materials, HDRI lighting and shadows, GLSL and TSL shaders, WebGPU
  and compute, instancing and particles, animation mixers and morph targets, raycasting and
  controls, postprocessing (bloom, depth of field, tone mapping) and React Three Fiber with Drei.
  Use whenever the request involves rendering 3D in the browser, even when three.js is not named.
  Trigger for: "Three.js", "WebGL", "WebGPU", "3D scene", "3D model", "shader", "R3F", "product
  viewer", "configurator", "particle system", "make it look cinematic", "add glow", "add
  reflections", "realistic materials". Not for 2D canvas or SVG charts, or CSS-only animation.
license: MIT
metadata:
  author: tp-job (enhanced by Claude)
  version: "1.2.0"
  source: Three.js r186 source, release notes & best practices (compiled 2026)
---

# Three.js & 3D Web — Professional Skill

> **Project note (`ocean`):** This repository currently targets **Three.js r128** bundled offline in `three.min.js` (`window.OC`, `build.py`, `renderer.outputEncoding = THREE.sRGBEncoding`). Use the project skill **`threejs-r128-procedural-mesh`** for day-to-day rendering, `onBeforeCompile` GLSL patches, and `InstancedMesh` work in `ocean`; consult `threejs-3d` for general 3D architecture patterns or a future r186+ upgrade.

Targets Three.js **r186** (min r183 for `Timer`).

---

## 📋 PM — Scope & Acceptance Criteria

Every output meets all ten. Each one prevents a defect that only shows up later: on a high-DPI phone, after an hour of use, or on a slower frame rate.

|#|Criterion|Owner|
|---|---|---|
|1|Uses import maps (never old CDN `<script src>`)|Frontend|
|2|Uses `renderer.setAnimationLoop()`, not manual RAF|Frontend|
|3|All motion driven by `timer.getDelta()` after `timer.update(time)` (frame-rate independent)|Frontend|
|4|Pixel ratio capped at `Math.min(devicePixelRatio, 2)`|Frontend|
|5|Every created GPU object has an explicit `.dispose()` path|QA|
|6|No heap allocations inside the render loop|QA|
|7|Tone mapping + output color space set on renderer|Design|
|8|Mobile fallback: antialias off + reduced pixel ratio if needed|QA|
|9|Resize handler attached on window|Frontend|
|10|Code is self-contained and runs with no build step (HTML artifact)|PM|

---

## 🗺️ Reference Map — Read the Right File First

| File | Covers |
|---|---|
| [setup-and-renderer](references/setup-and-renderer.md) | Read first for every new scene |
| [geometry-and-instancing](references/geometry-and-instancing.md) | BufferGeometry, InstancedMesh, LOD, particles |
| [materials-and-textures](references/materials-and-textures.md) | PBR, texture config, KTX2, environment maps |
| [lighting-and-shadows](references/lighting-and-shadows.md) | Lights, shadow maps, CSM, baked lighting |
| [animation](references/animation.md) | Keyframes, skeletal, morph targets, mixers |
| [loaders](references/loaders.md) | GLTF/DRACO, OBJ, FBX, HDR, async patterns |
| [shaders-and-tsl](references/shaders-and-tsl.md) | Custom GLSL, onBeforeCompile, TSL/WebGPU |
| [postprocessing](references/postprocessing.md) | Bloom, DOF, FXAA, EffectComposer, tone mapping |
| [performance](references/performance.md) | Profiling, draw calls, mobile, frustum culling |
| [interaction](references/interaction.md) | Raycasting, picking, drag, pointer events |
| [three-fiber](references/three-fiber.md) | React Three Fiber, Drei, Vue integration |
| [memory-and-disposal](references/memory-and-disposal.md) | GPU resource cleanup, `.dispose()` patterns |

---

## 🔀 Decision Tree — Which Files to Read

- New 3D scene from scratch → always: [setup-and-renderer](references/setup-and-renderer.md) + [memory-and-disposal](references/memory-and-disposal.md)
- Geometry / mesh / procedural shape / particles → [geometry-and-instancing](references/geometry-and-instancing.md)
- Load model (GLTF / OBJ / FBX / STL) → [loaders](references/loaders.md) [+ [animation](references/animation.md) if model has animations]
- Materials / textures / PBR / looks realistic → [materials-and-textures](references/materials-and-textures.md) + [lighting-and-shadows](references/lighting-and-shadows.md)
- Lighting / shadows / environment / HDRI → [lighting-and-shadows](references/lighting-and-shadows.md) + [materials-and-textures](references/materials-and-textures.md) (env maps)
- Animate objects / play GLTF animations / morph / blend → [animation](references/animation.md)
- Custom shader / GLSL / TSL / vertex displacement → [shaders-and-tsl](references/shaders-and-tsl.md)
- Postprocessing / glow / bloom / cinematic → [postprocessing](references/postprocessing.md) + [lighting-and-shadows](references/lighting-and-shadows.md)
- Click / hover / pick / drag objects in 3D → [interaction](references/interaction.md)
- React / Next.js / Vue / R3F / Drei → [three-fiber](references/three-fiber.md)
- Performance / FPS drops / mobile / too slow → [performance](references/performance.md) + [geometry-and-instancing](references/geometry-and-instancing.md)
- Debug / memory leak / renderer info / visual artifacts → [memory-and-disposal](references/memory-and-disposal.md)

---

## ⚡ Scene Bootstrap — Canonical Modern Pattern

Always start new scenes from this template. Read [setup-and-renderer](references/setup-and-renderer.md) for full options.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Three.js Scene</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { overflow: hidden; background: #000; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
<script type="importmap">
{
  "imports": {
    "three":          "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js",
    "three/addons/":  "https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ── Scene ─────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);

/* ── Camera ─────────────────────────────────────────────── */
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 2, 8);

/* ── Renderer ───────────────────────────────────────────── */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;   // r186+: PCFSoftShadowMap removed
renderer.toneMapping = THREE.ACESFilmicToneMapping;  // ← cinematic look
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

/* ── Controls ───────────────────────────────────────────── */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 200;

/* ── Lighting ───────────────────────────────────────────── */
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff0dd, 3);
sun.position.set(5, 10, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 50;
sun.shadow.camera.left = sun.shadow.camera.bottom = -10;
sun.shadow.camera.right = sun.shadow.camera.top = 10;
sun.shadow.bias = -0.001;
scene.add(sun);

/* ── Resize ─────────────────────────────────────────────── */
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

/* ── Render loop (delta-time driven) ───────────────────── */
const timer = new THREE.Timer();   // r183+: THREE.Clock is deprecated
timer.connect(document);           // freezes delta while the tab is hidden
renderer.setAnimationLoop((time) => {
  timer.update(time);              // must run first, once per frame
  const delta = timer.getDelta();
  controls.update();
  // ← put your per-frame updates here, always using delta
  renderer.render(scene, camera);
});
</script>
</body>
</html>
```

---

## 🚫 Non-Negotiable Rules

|Rule|Wrong|Right|
|---|---|---|
|Imports|`<script src="cdn.../three.min.js">`|import maps + `type="module"`|
|Loop|`requestAnimationFrame(animate)`|`renderer.setAnimationLoop(fn)`|
|Motion speed|`mesh.rotation.y += 0.01`|`mesh.rotation.y += speed * delta`|
|Pixel ratio|`setPixelRatio(devicePixelRatio)`|`setPixelRatio(Math.min(dpr, 2))`|
|Many objects|1000 individual `Mesh`|`InstancedMesh`|
|Loop alloc|`new Vector3()` inside animate|pre-allocate outside loop|
|Remove mesh|`scene.remove(mesh)` only|`.dispose()` geometry + material|
|Texture dims|600×800 (non-POT)|512×1024 (power-of-two)|
|Color maps|no colorSpace set|`tex.colorSpace = SRGBColorSpace`|
|Renderer|no tone mapping|`ACESFilmicToneMapping` + `SRGBColorSpace`|

---

## 🎨 Design Quality Standards

When creating any 3D scene, apply these by default:

```js
// Cinematic tone mapping (always)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Soft shadows (always when shadows are needed) — soften further with light.shadow.radius
renderer.shadowMap.type = THREE.PCFShadowMap;

// Environment-based reflections (for any metallic/glossy surface)
// → see materials-and-textures.md: PMREMGenerator

// Hemisphere light for natural sky/ground ambient
const hemi = new THREE.HemisphereLight(0xc8e0ff, 0x553311, 0.6);
scene.add(hemi);
```

Visual quality checklist before delivery:

- [ ] Tone mapping applied (no blown-out whites)
- [ ] PBR materials use correct color space on albedo maps
- [ ] Shadows have appropriate bias (no acne, no peter-panning)
- [ ] Scene has 3-point lighting or HDRI environment
- [ ] Fog or background set (no default grey void)
- [ ] Camera FOV appropriate to use case (50–75° typical)