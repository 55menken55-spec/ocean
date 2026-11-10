---
name: threejs-r128-procedural-mesh
description: Build dependency-free procedural 3D flora, corals, fish schools, and articulated megafauna for ocean on Three.js r128 with vertex colors, onBeforeCompile GLSL shaders, InstancedMesh pools, and offline build.py compatibility.
metadata:
  project: ocean
  domain: threejs-r128-webgl
---

# Three.js r128 Procedural Mesh & Shader Guide

This skill is the authoritative technical reference for `ocean`'s rendering stack (`three.min.js` **r128**, offline standalone `index.html` compiled by `build.py`).

> **Important:** Do **not** introduce ES module `import` statements, `importmap`, `THREE.Timer`, `WebGPURenderer`, `colorSpace = THREE.SRGBColorSpace`, or `BufferGeometryUtils` imports. `ocean` runs purely via IIFE modules attached to `window.OC` and uses Three.js r128 globals (`T.sRGBEncoding`, `OC.mergeGeometries`, `OC.uTime`).

## 1. Procedural Geometry Pipeline (`src/core/util.js`)

When building any flora/benthos prototype or creature part in `OC.FloraLibrary` or `OC.FaunaEngine`:
1. Construct primitive geometries (`SphereGeometry`, `CylinderGeometry`, `ConeGeometry`, `TorusGeometry`, custom `BufferGeometry`).
2. Strip UVs before merging so attribute sets match across primitives: `OC.geoPrep(geo)` deletes `uv`/`uv2` and computes vertex normals if missing.
3. Apply vertex colors with `OC.paint(geo, fn)` (guards against non-finite vertices).
4. For instanced flora/corals, **every** merged part must carry `aSway` via `OC.withSway(geo, fn)` (`0` for rigid stone corals/sponges, `0..1` height factor for sea fans, soft corals, seagrass, kelp, anemones).
5. Transform parts with `OC.xform(geo, { p, r, s })` and merge safely with `OC.mergeGeometries(list)` (converts indexed geometries via `toNonIndexed()` and pads missing attributes).

## 2. GLSL Shader Patching (`OC.enhanceMaterial` in `src/engine/world.js`)

`OC.enhanceMaterial(mat, opts)` patches `THREE.ShaderLib.standard` via `onBeforeCompile`:
- Options: `{ causticStrength, swayAmp, isTerrain, fishSwim }` + deterministic `mat.customProgramCacheKey`.
- **Mandatory r128 vertex rules**:
  - Replace `#include <begin_vertex>` for `swayAmp > 0` (`aSway` + world-space phase `ocInstOrigin` using `#ifdef USE_INSTANCING`) or `fishSwim` (`aSwim = vec2(phase, speed)` along `-X` tail / `+X` nose).
  - Replace `#include <project_vertex>` cleanly with `#ifdef USE_INSTANCING` support to compute `vCWorld`, `vCNormal` (handling non-uniform instance scaling), `mvPosition`, and `gl_Position`.
- **Mandatory r128 fragment rules**:
  - Inject terrain micro-ripples (`isTerrain`) and dual-layer caustics (`uCausticTex`) **immediately before** `#include <fog_fragment>` — never after fog, or distant caustics will glow unnaturally through deep water fog!
- After modifying `enhanceMaterial`, verify against `THREE.ShaderLib.standard` in `tests/verify.mjs`.

## 3. `InstancedMesh` Rules in Three.js r128

1. **Initialize `instanceColor` at creation time**: In r128, `USE_INSTANCING_COLOR` is only compiled if `mesh.instanceColor` exists at first render. `OC.FloraStreamer` must call `mesh.setColorAt(0, new T.Color(1, 1, 1))` right after `new T.InstancedMesh(...)`.
2. **Disable frustum culling on dynamic pools**: `mesh.frustumCulled = false` (bounding sphere of origin geometry doesn't cover streamed world chunks).
3. **Mark dynamic buffers**: `mesh.instanceMatrix.setUsage(T.DynamicDrawUsage)`.
4. **Tag `userData.key`**: Set `mesh.userData.key = species` (or fauna key) on every raycast-pickable mesh/group, and ensure that key exists in `biome.encyclopedia`.
5. **Pool headroom (`maxInstances`)**: `OC.FloraStreamer` splits `maxInstances` across variants (`perVarMax = Math.ceil(spec.maxInstances / geos.length)`). Always stress-test dense chunks at `Quality.set('ultra')` (`floraDensity = 1.32`) to confirm no pool overflows.

## 4. Fauna Orientation & Triangle Budgets

- **Fish orientation**: Build procedural fish facing **+X** (nose at `+len/2`, tail at `-len/2`) so the `aSwim` vertex shader (`clamp((-transformed.x + 0.18) * 0.85, 0.0, 1.8)`) bends the tail realistically without wobbling the head.
- **Schooling vs Articulated**:
  - Use `InstancedMesh` + `aSwim` for schooling fish (`15–70` individuals, `< 350` triangles per prototype).
  - Use articulated `THREE.Group` hierarchies for solo/megafauna (sharks, manta rays, turtles, dugongs, octopus, humpback whale) animated in CPU `update(dt, time, camPos)` with `540 m` distance culling (`mesh.visible = false`).
- **Build safety**: Avoid literal `</script>` strings inside JS; `build.py` escapes them, and `tests/verify.mjs` parses every module cleanly in Node `vm`.
