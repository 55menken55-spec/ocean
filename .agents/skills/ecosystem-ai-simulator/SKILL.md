---
name: ecosystem-ai-simulator
description: Design and implement real-time marine ecosystem behaviors in OC.FaunaEngine including spatial-hash Boids schooling, predator-prey evasion, diver/submersible reactions, cleaning stations, and day/night ecological cycles.
metadata:
  project: ocean
  domain: simulation-ai
---

# Ecosystem AI Simulator

Use this skill when upgrading `src/engine/fauna_engine.js` (and biome `faunaPlan` data) from orbital pathing to interactive living marine behaviors while keeping 60 FPS across `low`–`ultra` quality presets.

## Core Constraints

1. **Zero per-frame heap allocations**: Pre-allocate `Float32Array` position/velocity buffers and module-level scratch `THREE.Vector3` / `THREE.Matrix4` / `THREE.Quaternion` objects. Never call `new THREE.Vector3()` or `Array.map()` inside `agent.update(dt, time, camPos)`.
2. **Quality preset parity**: Every school must preserve `setQualityScale(preset.fishScale)` (`mesh.count` clamped cleanly to `maxN`) and update `OC.faunaInfo.schoolFish`.
3. **Distance throttling**: Keep the `540 m` outer visibility cull (`mesh.visible = false`) and optionally degrade distant (`220–540 m`) AI tick rates to every 2nd/3rd frame while updating near-camera schools every frame.

## Architecture Patterns

### 1. Spatial-Hash Boids for Reef Schools
Instead of O(N²) pairwise neighbor checks:
- Maintain a lightweight flat or bucketed spatial hash keyed by integer grid coordinates `(ix, iy, iz)` with cell size `~6–8 m` (reusing pre-allocated cell arrays).
- Apply weighted steering forces per fish `i`:
  - **Separation**: push away from neighbors `< 1.8 m` (stronger near coral bommies).
  - **Alignment + Cohesion**: steer toward local cell average heading and center within `7–10 m`.
  - **Home Anchor**: gentle spring toward school's habitat zone/bommie `(cx, yDepth, cz)` so schools stay in their ecological niche.
  - **Seabed & Surface Clamp**: evaluate `OC.floorH(x, z)` and repel vertically before hitting the seafloor (`y >= floor + 1.4`) or breaching water (`y <= -1.0`).

### 2. Predator-Prey & Diver/Submersible Interaction
Expose lightweight hazard/stimulus lists updated once per frame:
- **Predators** (`shark_reef`, `fish_barracuda`, `lionfish` at night): emit a short-range repulsion sphere (`18–26 m`). Prey schools (`fish_silver`, `fish_chromis`, `fish_blue`) trigger a burst speed boost (`1.8×`) and tighten cohesion ("baitball" / dart into staghorn coral cover).
- **Camera / Bathyscaphe**:
  - Curious species (`angelfish`, `fish_butterfly`, `fish_parrot`, `manta`) gently orbit or inspect within `10–25 m` if camera speed is low.
  - Shy species (`fish_silver`, `fish_chromis`, `dugong`) scatter or increase standoff distance when the player sprints (`Shift`) or shines the spotlight (`OC.isFlashlightOn()`).

### 3. Day/Night Ecological Cycles (`pal.dayW` & `OC.getTimeOfDay()`)
Use `OC.getPalette().dayW` (`1` = bright day, `0` = midnight) and `pal.bioGlow`:
- **Diurnal planktivores & herbivores** (`fish_chromis`, `fish_parrot`, `fish_butterfly`, `fish_yellow`): tighten around reef cover and slow down as `dayW < 0.25`.
- **Nocturnal & crepuscular predators** (`lionfish`, `moray`, `shark_reef`, `urchin`): widen patrol radii and raise speed/foraging activity when `dayW < 0.4`.
- **Bioluminescence**: drive emissive/additive glow intensity on deep jellyfish (`jelly_deep`), plankton, and future deep-sea lanternfish from `pal.bioGlow` and flashlight cone overlap.

### 4. Cleaning Stations & Micro-Habitats
Bind selected `manta`, `turtle`, or `shark_reef` patrol loops to slow circular passes over designated reef bommie "cleaning stations", attracting small cleaner/butterflyfish orbits when the megafauna enters within `14 m`.

## Verification Checklist
- Run `python3 build.py && node tests/verify.mjs` after any `fauna_engine.js` change.
- Verify no `NaN` positions/quaternions occur when two fish overlap at identical coordinates (guard `lenSq < 1e-6` before `.normalize()`).
- Verify all `userData.key` tags remain registered in `biome.encyclopedia`.
