# React & Frameworks Reference

## Contents

- React Three Fiber (R3F) — Recommended for React
- R3F — useFrame (render loop)
- R3F — useGLTF (model loading)
- R3F — Animation with useAnimations
- R3F — useThree (access renderer, scene, camera)
- R3F — Drei Components (common helpers)
- R3F — Postprocessing
- Vanilla Three.js in React (without R3F)
- Vue Integration (vue-three / vanilla)

React Three Fiber (R3F), Drei, Vue, cleanup patterns, component structure.

---

## React Three Fiber (R3F) — Recommended for React

```bash
npm install three @react-three/fiber @react-three/drei
```

```jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useTexture } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';

// Basic scene
export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 60, near: 0.1, far: 1000 }}
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={3}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Environment preset="studio" /> {/* HDRI env map */}
      <OrbitControls enableDamping dampingFactor={0.05} />
      <RotatingBox />
    </Canvas>
  );
}
```

---

## R3F — useFrame (render loop)

```jsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

function RotatingBox() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    // state.clock, state.camera, state.scene, state.gl
    meshRef.current.rotation.y += delta; // delta-time, frame-rate independent
  });

  return (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="steelblue" />
    </mesh>
  );
}
```

---

## R3F — useGLTF (model loading)

```jsx
import { useGLTF } from '@react-three/drei';

function Model({ url }) {
  const { scene, animations } = useGLTF(url);

  // Clone to allow multiple instances
  const cloned = useMemo(() => scene.clone(), [scene]);

  useEffect(() => {
    cloned.traverse(child => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
      }
    });
  }, [cloned]);

  return <primitive object={cloned} />;
}

// Preload outside component (prevents pop-in)
useGLTF.preload('/model.glb');
```

---

## R3F — Animation with useAnimations

```jsx
import { useAnimations } from '@react-three/drei';
import { useEffect } from 'react';

function AnimatedModel({ url }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    actions['Walk']?.play();
    return () => {
      // Automatically cleaned up by R3F
    };
  }, [actions]);

  return <primitive ref={group} object={scene} />;
}
```

---

## R3F — useThree (access renderer, scene, camera)

```jsx
import { useThree } from '@react-three/fiber';

function MyComponent() {
  const { gl, scene, camera, size } = useThree();

  useEffect(() => {
    // Direct Three.js access
    const pmrem = new THREE.PMREMGenerator(gl);
    // ...
    return () => pmrem.dispose();
  }, [gl]);

  return null;
}
```

---

## R3F — Drei Components (common helpers)

```jsx
import {
  OrbitControls,    // camera controls
  Environment,      // HDRI env map: preset="studio"|"sunset"|"city"|...
  ContactShadows,   // fake shadows without shadowMap
  Sky,              // procedural sky
  Stars,            // particle star field
  Loader,           // loading screen
  Html,             // HTML in 3D space
  Text,             // 3D text (troika)
  Line,             // 3D line
  Plane,            // plane with material
  Sphere,           // sphere with material
  Box,              // box with material
  MeshReflectorMaterial, // reflective floor
  MeshWobbleMaterial,    // wobbly shader
  MeshDistortMaterial,   // distortion shader
  useProgress,      // loading progress
  useDetectGPU,     // GPU capability detection
  Preload,          // preload assets
  Float,            // floating animation
  Sparkles,         // particle sparkles
  GradientTexture,  // gradient texture generator
} from '@react-three/drei';

// Example: reflective floor
<Plane args={[20, 20]} rotation-x={-Math.PI / 2}>
  <MeshReflectorMaterial
    blur={[300, 100]}
    resolution={512}
    mixBlur={1}
    mixStrength={50}
    roughness={1}
    depthScale={1.2}
    color="#151515"
    metalness={0.6}
  />
</Plane>
```

---

## R3F — Postprocessing

```bash
npm install @react-three/postprocessing
```

```jsx
import { EffectComposer, Bloom, SMAA, DepthOfField, Vignette } from '@react-three/postprocessing';

function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.8}
        luminanceSmoothing={0.9}
        intensity={1}
      />
      <DepthOfField
        focusDistance={0.01}
        focalLength={0.02}
        bokehScale={2}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  );
}
```

---

## Vanilla Three.js in React (without R3F)

For cases where R3F is not appropriate:

```jsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount  = mountRef.current;
    const width  = mount.clientWidth;
    const height = mount.clientHeight;

    // Setup
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 2, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Create objects
    const geo  = new THREE.BoxGeometry();
    const mat  = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Resize observer
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(mount);

    // Loop
    const timer = new THREE.Timer();
    timer.connect(document);
    renderer.setAnimationLoop((time) => {
      timer.update(time);
      mesh.rotation.y += timer.getDelta();
      renderer.render(scene, camera);
    });

    // Cleanup — CRITICAL for React
    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();

      // Dispose all GPU objects
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
```

---

## Vue Integration (vue-three / vanilla)

```vue
<template>
  <div ref="container" style="width:100%;height:100%;" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

const container = ref(null);
let renderer, timer, animId;

onMounted(() => {
  const mount = container.value;
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
  camera.position.set(0, 2, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const geo  = new THREE.BoxGeometry();
  const mat  = new THREE.MeshStandardMaterial({ color: 0x4488ff });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  timer = new THREE.Timer();
  timer.connect(document);
  renderer.setAnimationLoop((time) => {
    timer.update(time);
    mesh.rotation.y += timer.getDelta();
    renderer.render(scene, camera);
  });
});

onUnmounted(() => {
  renderer?.setAnimationLoop(null);
  renderer?.dispose();
  renderer?.forceContextLoss();
});
</script>
```