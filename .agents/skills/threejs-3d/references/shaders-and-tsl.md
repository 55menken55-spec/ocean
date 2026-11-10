# Shaders & TSL Reference

## Contents

- When to Use What
- ShaderMaterial — Full Custom GLSL
- RawShaderMaterial — Bare GLSL
- onBeforeCompile — Extend Built-in Materials
- GLSL Best Practices
- TSL — Three.js Shading Language (WebGPU)

Custom GLSL (ShaderMaterial), onBeforeCompile injection, TSL (Three.js Shading Language) for WebGPU.

---

## When to Use What

|Approach|When|Pros/Cons|
|---|---|---|
|`onBeforeCompile`|Extend built-in materials|Easy; keeps PBR/lights; WebGL only|
|`ShaderMaterial`|Full GLSL control, WebGL|Maximum control; must handle all uniforms|
|`RawShaderMaterial`|Bare GLSL, no Three.js injection|Most control; write everything yourself|
|TSL `NodeMaterial`|WebGPU or portable shaders|Works on WebGL+WebGPU; composable; future-proof|

---

## ShaderMaterial — Full Custom GLSL

```js
const mat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:   { value: 0 },
    uColor:  { value: new THREE.Color(0x4488ff) },
    uTex:    { value: myTexture },
  },

  vertexShader: /* glsl */`
    uniform float uTime;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      vUv      = uv;
      vNormal  = normalize(normalMatrix * normal);
      vec4 wp  = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;

      // Vertex displacement
      vec3 displaced = position;
      displaced.y += sin(position.x * 3.0 + uTime * 2.0) * 0.1;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform vec3 uColor;
    uniform sampler2D uTex;

    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec4 texColor = texture2D(uTex, vUv);
      float light   = dot(vNormal, normalize(vec3(1.0, 2.0, 1.0))) * 0.5 + 0.5;
      gl_FragColor  = vec4(uColor * texColor.rgb * light, texColor.a);

      // Required for correct sRGB output
      #include <colorspace_fragment>
    }
  `,

  transparent: false,
  side: THREE.FrontSide,
  // depthWrite, depthTest, blending, etc.
});

// Update uniforms in render loop
renderer.setAnimationLoop(() => {
  mat.uniforms.uTime.value = timer.getElapsed();
  renderer.render(scene, camera);
});
```

---

## RawShaderMaterial — Bare GLSL

```js
const mat = new THREE.RawShaderMaterial({
  uniforms: {
    uProjectionMatrix: { value: camera.projectionMatrix },
    uModelViewMatrix:  { value: camera.matrixWorldInverse },
    uTime:             { value: 0 },
  },
  vertexShader: /* glsl */`
    precision mediump float;

    attribute vec3 position;
    attribute vec2 uv;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelViewMatrix;
    uniform float uTime;

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    precision mediump float;

    varying vec2 vUv;
    uniform float uTime;

    void main() {
      gl_FragColor = vec4(vUv, sin(uTime) * 0.5 + 0.5, 1.0);
    }
  `,
});
```

---

## onBeforeCompile — Extend Built-in Materials

Best approach for adding effects to PBR materials without losing lighting.

```js
const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, metalness: 0.5, roughness: 0.3 });

mat.onBeforeCompile = shader => {
  // Inject uniforms
  shader.uniforms.uTime  = { value: 0 };
  shader.uniforms.uWaveA = { value: 0.1 };

  // Vertex — wave displacement
  shader.vertexShader = /* glsl */`
    uniform float uTime;
    uniform float uWaveA;
  ` + shader.vertexShader.replace(
    '#include <begin_vertex>',
    /* glsl */`
    #include <begin_vertex>
    float wave = sin(position.x * 4.0 + uTime * 2.0) * uWaveA
               + cos(position.z * 3.0 + uTime * 1.5) * uWaveA;
    transformed.y += wave;
    `
  );

  // Fragment — fresnel rim effect
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <output_fragment>',
    /* glsl */`
    #include <output_fragment>
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(-vViewPosition))), 3.0);
    gl_FragColor.rgb += fresnel * vec3(0.3, 0.6, 1.0);
    `
  );

  mat.userData.shader = shader;
};

// Mark for recompile if uniforms change structure
mat.needsUpdate = true;

// Loop update
renderer.setAnimationLoop(() => {
  if (mat.userData.shader) {
    mat.userData.shader.uniforms.uTime.value = timer.getElapsed();
  }
  renderer.render(scene, camera);
});
```

---

## GLSL Best Practices

```glsl
// Precision — use mediump in fragment (highp where needed)
precision mediump float;
precision highp float; // vertex shader usually fine

// Avoid branching — GPU cores execute both paths
// BAD
if (uv.x > 0.5) { color = texA; } else { color = texB; }
// GOOD — branchless
float t = step(0.5, uv.x);
vec4 color = mix(texB, texA, t);

// Precompute on CPU when possible
// BAD: computing in shader every frame
vec3 dir = vec3(cos(uTime), sin(uTime), 0.0);
// GOOD: compute on CPU, pass as uniform
// mat.uniforms.uDir.value.set(Math.cos(t), Math.sin(t), 0);

// Avoid discard — prevents early-Z optimization
// BAD: if (alpha < 0.5) discard;
// GOOD: use material.alphaTest = 0.5;

// Pack multiple values in one texture (r=rough, g=metal, b=ao)
float roughness = texture2D(ormTex, vUv).r;
float metalness = texture2D(ormTex, vUv).g;
float ao        = texture2D(ormTex, vUv).b;
```

---

## TSL — Three.js Shading Language (WebGPU)

TSL works on both WebGL and WebGPU via compilation. Use with `three/webgpu` build.

```html
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

```js
import * as THREE from 'three';
import {
  // Types
  float, vec2, vec3, vec4, color, bool,
  // Inputs
  uniform, texture, uv, attribute,
  // Scene / position
  positionLocal, positionWorld, positionView,
  normalLocal, normalWorld, normalView,
  // Camera
  cameraPosition,
  // Time
  time, deltaTime,
  // Math
  sin, cos, abs, floor, fract, mix, step, smoothstep,
  normalize, dot, cross, length, pow, max, min, clamp,
  // Conditionals
  select, If,
  // Functions
  Fn,
} from 'three/tsl';

// WebGPU init
const renderer = new THREE.WebGPURenderer({ antialias: true });
await renderer.init();
```

### TSL Node Material Examples

```js
// Color from time
const mat = new THREE.MeshStandardNodeMaterial();
mat.colorNode = vec3(
  sin(time).mul(0.5).add(0.5),
  cos(time.mul(1.3)).mul(0.5).add(0.5),
  float(0.8),
);

// Texture with custom UVs
const myTex = new THREE.TextureLoader().load('texture.jpg');
mat.colorNode = texture(myTex, uv().mul(vec2(4, 4)));

// Vertex displacement
mat.positionNode = positionLocal.add(
  vec3(0, sin(time.mul(2).add(positionLocal.x.mul(5))).mul(0.1), 0)
);

// Fresnel rim
const fresnel = float(1).sub(
  dot(normalView, positionView.negate().normalize()).abs()
).pow(3);
mat.colorNode = mix(color(0x001144), color(0x4488ff), fresnel);
```

### TSL Fn() — Reusable Functions

```js
const remap = Fn(([value, inMin, inMax, outMin, outMax]) =>
  outMin.add(
    value.sub(inMin).div(inMax.sub(inMin)).mul(outMax.sub(outMin))
  )
);

const oscillate = Fn(([freq = float(1), amp = float(1), offset = float(0)]) =>
  sin(time.mul(freq).add(offset)).mul(amp).mul(0.5).add(0.5)
);

mat.colorNode = vec3(oscillate(2, 1), oscillate(3, 1, 1.5), oscillate(1.5, 1, 3));
```

### GLSL → TSL Quick Reference

|GLSL|TSL|
|---|---|
|`position`|`positionGeometry`|
|`transformed`|`positionLocal`|
|`vWorldPosition`|`positionWorld`|
|`vUv`|`uv()`|
|`vNormal`|`normalView`|
|`gl_FragColor`|`mat.fragmentNode`|
|`diffuseColor.rgb`|`mat.colorNode`|
|`sin(time) * 0.5 + 0.5`|`sin(time).mul(0.5).add(0.5)`|
|`mix(a, b, t)`|`mix(a, b, t)`|
|`texture2D(tex, uv)`|`texture(tex, uv())`|