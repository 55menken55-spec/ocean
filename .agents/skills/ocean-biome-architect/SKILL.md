---
name: ocean-biome-architect
description: Design, implement, and register new planetary aquatic biomes in ocean via OC.Biomes (src/biomes/), continuous deterministic getHeight(x,z), safeSpotY clearances, optical profiles, chunk flora generation, and build.py integration.
metadata:
  project: ocean
  domain: biome-architecture
---

# Ocean Biome Architect

Use this skill when creating a new aquatic biome (e.g., Mariana Trench, Monterey Kelp Forest, Red Sea Wall, Arctic Pack Ice, Hydrothermal Vents) or modifying `src/core/biome_registry.js` and `src/biomes/*.js`.

## Biome Contract (`OC.Biomes.register`)

Every biome module lives in `src/biomes/<biome_id>.js` wrapped in the project IIFE pattern:

```js
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  // ...
  OC.Biomes.register({ ... });
})(window.OC);
```

Required fields and methods (see `src/core/biome_registry.js`):
- **Metadata**: `id` (snake_case), `name`, `region`, `subtitle` (Russian UI strings).
- **World dimensions**: `worldRadius` (typically `1200` for `2400 × 2400 m`), `chunkSize` (typically `150`, yielding `16 × 16` chunks), `seaLevel: 0`.
- **Spawn & camera routes**:
  - `spawn: { pos: [x, y, z], yaw, pitch }`
  - `zones: [{ id, name, shortName, color, depthLabel, tempC, description }]`
  - `landmarks: [{ id, name, zoneId, x, y, z, yaw, pitch, description }]`
  - `tourLegs: [{ pos: [x, y, z], look: [lx, ly, lz], title, duration }]`
- **Terrain & shading**:
  - `getHeight(x, z) -> number`: `Y = 0` is sea level. Must be **purely deterministic** (only analytic math + `OC.fbm2`, `OC.ridged2`, `OC.noise2`, `OC.smoothstep`, `OC.lerp` — NEVER `Math.random()`). Continuous across chunk boundaries so `OC.Terrain` finite-difference normals remain seamless.
  - `getZoneAt(x, y, z) -> zoneObj`: must always return a valid zone from `zones`.
  - `getTerrainColor(x, y, z, outColor)`: populates `THREE.Color` `outColor` using depth, slope, and deterministic noise (no object allocations inside!).
- **Water optics**:
  - `getOpticalProfile(x, y, z, dayW) -> { aboveWater, fogColor, fogDensity, causticStrength, rayStrength, sunAtten, bioGlow }`.
  - Must handle `y > 0.25` (`aboveWater: true`) smoothly so emerging above `Y = 0` transitions cleanly to aerial atmosphere.
- **Chunk flora scattering**:
  - `generateChunkFlora(cx, cz, chunkSize, density, rng) -> Array<{ species, x, y, z, ry, scale, tint }>`.
  - `species` must match a key registered in `OC.FloraLibrary.create()`.
  - Every `species` and fauna `userData.key` must exist in `encyclopedia`.
- **Encyclopedia**:
  - `encyclopedia: { [key]: [title, latin, category, zoneLabel, depthLabel, desc] }` (plus `'floor'`).

## Critical Safety & Performance Rules

### 1. Clearance Enforcement (`safeSpotY`)
Never hardcode raw `y` values for `spawn`, `landmarks`, or `tourLegs` without clamping against terrain height! Always compute:
```js
function safeSpotY(x, z, desiredY, clearance) {
  return Math.max(desiredY, getHeight(x, z) + (clearance || 3.2));
}
```
Remember `tests/verify.mjs` enforces `spawn > floor + 1.5`, `landmarks > floor + 1.2`, and `tourLegs > floor + 1.2`.

### 2. Zero Allocations in Hot Paths
`getHeight`, `getTerrainColor`, and `getOpticalProfile` run thousands of times per frame/chunk build:
- Reuse module-level `THREE.Color` scratch instances (`_colA`, `_colB`, `_fogCol`) instead of calling `new THREE.Color()` inside loops.
- Approximate slope cheaply inside `generateChunkFlora` via 3–4 `getHeight` samples (`h`, `hR`, `hU`).

### 3. Chunk Flora Density & Pool Budgeting
`OC.FloraStreamer` builds chunks in a `3.5 ms` frame budget and shares fixed `InstancedMesh` pools from `OC.FloraLibrary`:
- Respect `density` (`0.45` Low -> `1.32` Ultra) by scaling sample counts linearly with `density`.
- Verify that the densest `6 × 6` chunk window at `density = 1.32` never exceeds `spec.maxInstances` in `src/engine/flora_library.js` (otherwise distant/later instances clip silently).

### 4. Multi-Biome Switching Readiness
When adding Biome #2+ and a biome switcher:
1. Move biome-specific fauna configurations into `biome.faunaPlan` (schools, solo fish, megafauna definitions) so `OC.FaunaEngine` reads from the active biome rather than assuming GBR coordinates.
2. Add clean `dispose()` / tear-down methods to `OC.Terrain`, `OC.FloraStreamer`, and `OC.FaunaEngine` before re-initializing on `OC.Biomes.setActive(id)`.
3. Register the new `src/biomes/<id>.js` in `build.py` (`ORDER` list) and `tests/verify.mjs` (`SRC_ORDER` list).
4. Ensure `src/ui/atlas.js` `CATEGORY_LANDMARK` or landmark fallback handles zone labels from any biome (`biomeRef.landmarks.find(...) || biomeRef.landmarks[0]`).

## Checklist When Adding a Biome
1. Complete research dossier (`marine-biome-researcher`).
2. Author `src/biomes/<id>.js` implementing the full `OC.Biomes` contract.
3. Add script order entry in `build.py` and `tests/verify.mjs`.
4. Extend `tests/verify.mjs` to validate all zones, depth extrema, landmark/tour clearances, encyclopedia keys, and chunk flora pool bounds for the new biome.
5. Run `python3 build.py && node tests/verify.mjs`.
