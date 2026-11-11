# Postprocessing Reference

## Contents

- EffectComposer Setup
- Bloom (UnrealBloomPass)
- FXAA (Fast Anti-Aliasing)
- SMAA (Better Anti-Aliasing)
- Depth of Field (BokehPass)
- SSAO (Ambient Occlusion)
- Color Grading (Custom ShaderPass)
- OutputPass (mandatory — always last)
- TSL Postprocessing (WebGPU)
- Pass Order Best Practices

EffectComposer, RenderPass, bloom, DOF, FXAA/SMAA, custom passes.

---

## EffectComposer Setup

```js
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass }        from 'three/addons/postprocessing/SMAAPass.js';

// 1. Create composer
const composer = new EffectComposer(renderer);

// 2. Always start with RenderPass
composer.addPass(new RenderPass(scene, camera));

// 3. Add effect passes
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength (0.3–1.5 typical)
  0.4,   // radius
  0.85,  // threshold — only pixels brighter than this bloom
);
composer.addPass(bloom);

// 4. SMAA anti-aliasing (better than FXAA for postprocessing pipeline)
composer.addPass(new SMAAPass(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio(),
));

// 5. OutputPass must be LAST — converts to sRGB for display
composer.addPass(new OutputPass());

// 6. Use composer instead of renderer in loop
renderer.setAnimationLoop(() => {
  controls.update();
  composer.render();          // ← not renderer.render()!
});

// 7. Resize composer with window
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);  // ← important!
});
```

---

## Bloom (UnrealBloomPass)

```js
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  strength:  1.0,   // 0 = off | 1 = medium | 2+ = heavy
  radius:    0.4,   // spread of bloom
  threshold: 0.8,   // luminance cutoff — below this = no bloom
);

// Bloom only selected objects (selective bloom pattern)
// 1. Render scene with bloom-eligible objects to bloom layer
// 2. Render rest without bloom
// 3. Composite

// Selective bloom via layers
const BLOOM_LAYER = 1;
glowingMesh.layers.enable(BLOOM_LAYER);

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(new RenderPass(scene, camera));
bloomComposer.addPass(bloom);

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(new RenderPass(scene, camera));

// Mix bloom + original via ShaderPass
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const mixPass = new ShaderPass(new THREE.ShaderMaterial({
  uniforms: {
    baseTexture:  { value: null },
    bloomTexture: { value: bloomComposer.renderTarget2.texture },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
    }
  `,
}), 'baseTexture');
finalComposer.addPass(mixPass);
finalComposer.addPass(new OutputPass());
```

---

## FXAA (Fast Anti-Aliasing)

Faster than SMAA, lower quality. Good for mobile.

```js
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader }  from 'three/addons/shaders/FXAAShader.js';

const fxaa = new ShaderPass(FXAAShader);
// Must update resolution uniform on resize
fxaa.material.uniforms.resolution.value.set(
  1 / (innerWidth  * renderer.getPixelRatio()),
  1 / (innerHeight * renderer.getPixelRatio()),
);
composer.addPass(fxaa);

// On resize:
fxaa.material.uniforms.resolution.value.set(
  1 / (innerWidth  * renderer.getPixelRatio()),
  1 / (innerHeight * renderer.getPixelRatio()),
);
```

---

## SMAA (Better Anti-Aliasing)

Higher quality than FXAA — preferred for desktop.

```js
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const smaa = new SMAAPass(
  innerWidth  * renderer.getPixelRatio(),
  innerHeight * renderer.getPixelRatio(),
);
composer.addPass(smaa);

// On resize:
smaa.setSize(innerWidth * devicePixelRatio, innerHeight * devicePixelRatio);
```

---

## Depth of Field (BokehPass)

```js
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const dof = new BokehPass(scene, camera, {
  focus:    5.0,    // focal distance in world units
  aperture: 0.025,  // 0 = no blur | 0.1 = strong blur
  maxblur:  0.01,   // maximum blur radius (0.01–0.02 typical)
});
composer.addPass(dof);

// Animate focus distance
renderer.setAnimationLoop(() => {
  // Raycast to subject, update focus distance
  dof.uniforms['focus'].value = distanceToSubject;
  composer.render();
});
```

---

## SSAO (Ambient Occlusion)

```js
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';

const ssao = new SSAOPass(scene, camera, innerWidth, innerHeight);
ssao.kernelRadius = 16;   // sampling radius (8–32)
ssao.minDistance  = 0.005;
ssao.maxDistance  = 0.1;
composer.addPass(ssao);
```

---

## Color Grading (Custom ShaderPass)

```js
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const colorGradeShader = {
  uniforms: {
    tDiffuse:   { value: null },
    uSaturation:{ value: 1.2 },
    uContrast:  { value: 1.1 },
    uVignette:  { value: 0.4 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    varying vec2 vUv;

    vec3 adjustSaturation(vec3 col, float s) {
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      return mix(vec3(lum), col, s);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col   = texel.rgb;

      // Saturation
      col = adjustSaturation(col, uSaturation);

      // Contrast
      col = (col - 0.5) * uContrast + 0.5;

      // Vignette
      vec2 uv2    = vUv * 2.0 - 1.0;
      float vign  = 1.0 - dot(uv2, uv2) * uVignette;
      col        *= clamp(vign, 0.0, 1.0);

      gl_FragColor = vec4(col, texel.a);
    }
  `,
};

composer.addPass(new ShaderPass(colorGradeShader));
```

---

## OutputPass (mandatory — always last)

```js
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// OutputPass converts linear → sRGB and applies tone mapping
// It replaces the need to set renderer.toneMapping when using composer
composer.addPass(new OutputPass());

// Tone mapping via OutputPass:
renderer.toneMapping = THREE.ACESFilmicToneMapping; // still set on renderer
// OutputPass reads it automatically
```

---

## TSL Postprocessing (WebGPU)

```js
import * as THREE from 'three'; // webgpu build
import { pass, bloom, fxaa, smaa, ao, dof, grayscale } from 'three/tsl';

const postProcessing = new THREE.PostProcessing(renderer);
const scenePass      = pass(scene, camera);
const beauty         = scenePass.getTextureNode();

// Chain effects
postProcessing.outputNode = bloom(beauty, 1.0, 0.4, 0.85);

// DOF
const depth = scenePass.getDepthNode();
postProcessing.outputNode = dof(beauty, depth, 5, 0.025, 0.01);

// Update in loop
renderer.setAnimationLoop(async () => {
  controls.update();
  await postProcessing.renderAsync();
});
```

---

## Pass Order Best Practices

```
RenderPass         ← always first
SSAOPass           ← before bloom
UnrealBloomPass    ← before AA
BokehPass (DOF)    ← before AA
Color grading      ← before AA
SMAAPass / FXAAPass ← near last
OutputPass         ← MUST BE LAST
```