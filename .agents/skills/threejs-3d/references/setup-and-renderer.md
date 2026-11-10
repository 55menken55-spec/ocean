# Setup & Renderer Reference

## Contents

- Import Map (mandatory — never use old CDN)
- Renderer — Full Options
- Critical Renderer Settings (always apply)
- Tone Mapping Options
- Camera Setup
- Animation Loop — setAnimationLoop (mandatory)
- Resize Handler
- Controls
- Scene Setup Helpers
- Vite / Build Tool Setup

Three.js r186+ · WebGLRenderer & WebGPURenderer setup, resize, controls.

---

## Import Map (mandatory — never use old CDN)

```html
<!-- WebGL (default) -->
<script type="importmap">
{
  "imports": {
    "three":         "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/"
  }
}
</script>

<!-- WebGPU + TSL (when using node materials or compute) -->
<script type="importmap">
{
  "imports": {
    "three":         "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.js",
    "three/tsl":     "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/"
  }
}
</script>
```

## Renderer — Full Options

```js
// WebGLRenderer
const renderer = new THREE.WebGLRenderer({
  antialias:       true,              // MSAA; disable on mobile for perf
  alpha:           false,             // transparent canvas; false = opaque
  premultipliedAlpha: true,           // default; change only if blending issues
  preserveDrawingBuffer: false,       // true only if you need canvas.toDataURL()
  powerPreference: 'high-performance',// 'default' | 'high-performance' | 'low-power'
  logarithmicDepthBuffer: false,      // true for huge scenes (0.01 → 100km)
  stencil: false,                     // enable only if using stencil effects
  depth: true,
});

// WebGPURenderer (requires: import * as THREE from 'three' from webgpu build)
const renderer = new THREE.WebGPURenderer({ antialias: true });
await renderer.init();  // MUST await — before any scene operations
```

## Critical Renderer Settings (always apply)

```js
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // never > 2

// Visual quality — always set both:
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // best quality/perf balance (r186+)
// THREE.BasicShadowMap   — fastest, jagged
// THREE.PCFShadowMap     — soft, moderate cost (recommended); tune with light.shadow.radius
// THREE.PCFSoftShadowMap — deprecated r186; WebGL warns and falls back to PCFShadowMap
// THREE.VSMShadowMap     — variance shadow maps, smooth but light bleeding
```

## Tone Mapping Options

```js
THREE.NoToneMapping            // raw, ungraded — avoid for realism
THREE.LinearToneMapping        // simple exposure scale
THREE.ReinhardToneMapping      // classic, gentle highlights
THREE.CineonToneMapping        // filmic highlights
THREE.ACESFilmicToneMapping    // ← recommended — cinematic S-curve
THREE.AgXToneMapping           // Blender's AgX — excellent highlights (r152+)
THREE.NeutralToneMapping       // Khronos neutral reference (r156+)
```

## Camera Setup

```js
// PerspectiveCamera(fov, aspect, near, far)
// Tight near/far = better depth precision (avoid huge ranges)
const camera = new THREE.PerspectiveCamera(
  60,                                    // fov: 50 cinematic | 60 standard | 90 wide
  window.innerWidth / window.innerHeight,
  0.1,                                   // near: ≥ 0.01 recommended
  1000                                   // far: no larger than your scene needs
);
camera.position.set(0, 2, 8);

// Orthographic (2D/isometric views)
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 10;
const orthoCamera = new THREE.OrthographicCamera(
  -frustumSize * aspect / 2,  // left
   frustumSize * aspect / 2,  // right
   frustumSize / 2,           // top
  -frustumSize / 2,           // bottom
  0.1, 1000
);
```

## Animation Loop — setAnimationLoop (mandatory)

```js
const timer = new THREE.Timer();   // r183+: THREE.Clock is deprecated
timer.connect(document);           // Page Visibility API: no delta spike on tab return

// CORRECT
function animate(time) {
  timer.update(time);              // once per frame, before any read
  const delta = timer.getDelta();     // seconds since last frame
  const elapsed = timer.getElapsed(); // seconds since start
  controls.update();
  // update scene...
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Stop the loop (e.g. cleanup)
renderer.setAnimationLoop(null);
timer.dispose();                   // also disconnects the visibility listener

// Optional: also stop rendering while the tab is hidden (timer.connect already
// keeps delta correct; this only saves GPU work)
document.addEventListener('visibilitychange', () => {
  renderer.setAnimationLoop(document.hidden ? null : animate);
});
```

## Resize Handler

```js
// Debounced resize for performance
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, 100);
});

// If using postprocessing composer — also resize it:
// composer.setSize(window.innerWidth, window.innerHeight);
```

## Controls

```js
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { FlyControls }     from 'three/addons/controls/FlyControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

// OrbitControls — most common
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;      // inertia smoothing
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 200;
controls.maxPolarAngle = Math.PI / 2; // prevent underground
controls.target.set(0, 0, 0);       // pivot point
controls.update();                  // call once after setup
// controls.update() MUST be called every frame when damping is on

// TransformControls (gizmo to move/rotate/scale objects)
const gizmo = new TransformControls(camera, renderer.domElement);
gizmo.attach(mesh);
gizmo.setMode('translate'); // 'rotate' | 'scale'
scene.add(gizmo);
// Prevent orbit when using gizmo:
gizmo.addEventListener('dragging-changed', e => { controls.enabled = !e.value; });
```

## Scene Setup Helpers

```js
// Scene background options
scene.background = new THREE.Color(0x111111);          // solid color
scene.background = cubeTexture;                         // cubemap skybox
scene.background = hdrTexture;                          // equirect HDR

// Fog
scene.fog = new THREE.Fog(0x111111, 10, 100);          // linear fog (near, far)
scene.fog = new THREE.FogExp2(0x111111, 0.02);         // exponential fog (density)

// Groups — organize related objects
const group = new THREE.Group();
group.add(meshA, meshB, meshC);
scene.add(group);

// Static objects — disable auto matrix update for perf
staticMesh.matrixAutoUpdate = false;
staticMesh.updateMatrix();
```

## Vite / Build Tool Setup

```js
// vite.config.js
export default {
  optimizeDeps: {
    exclude: ['three']
  }
}

// package.json
{
  "dependencies": {
    "three": "^0.182.0"
  }
}

// In modules (no import map needed with Vite/webpack)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// or: import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
```