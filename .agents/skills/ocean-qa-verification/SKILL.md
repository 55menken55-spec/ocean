---
name: ocean-qa-verification
description: Build, test, and verify changes to ocean using build.py, Node VM integration suite tests/verify.mjs, GLSL shader checks, InstancedMesh pool capacity stress tests, and headless runtime smoke checks.
metadata:
  project: ocean
  domain: verification-and-qa
---

# Ocean QA Verification

Use this skill after **every** code change to `src/`, `template.html`, `build.py`, or `package.json`, and always before committing or reporting work complete.

## Standard Verification Pipeline

Run from `/home/user/ocean`:
```bash
python3 build.py && node tests/verify.mjs
```

What this guarantees right out of the box:
1. **Bundle build (`build.py`)**: Concatenates `three.min.js` + all 14 ordered modules in `src/` into standalone `index.html`, escaping `</script>` tokens safely.
2. **Syntax check**: Parses every JS module cleanly with `node:vm` `vm.Script`.
3. **Standalone HTML check**: Confirms `/*__THREE__*/` and `/*__SRC__*/` placeholders are replaced and `index.html` is non-truncated.
4. **Bathymetry & zones check**: Samples `biome.getHeight(x, z)`, `biome.getZoneAt`, and `biome.getOpticalProfile` across `[-1100..1100]` ensuring finite numbers, valid optical profiles, and all expected zones hit.
5. **Clearance assertions**: Confirms `spawn`, every `landmarks[]` item, and every `tourLegs[]` item sits safely above the seabed (`> floor + 1.2 m`).
6. **GLSL `onBeforeCompile` shader check**: Patches `THREE.ShaderLib.standard` across terrain, rigid coral, swaying flora (`aSway`), and GPU fish (`aSwim`) ensuring `vCWorld`, `vCNormal`, `#include <project_vertex>` replacement, and `#include <fog_fragment>` ordering (caustics strictly before fog).
7. **End-to-end streaming simulation**: Initializes `Terrain`, `FloraStreamer`, `FaunaEngine`, `Navigation`, `Minimap`, and `Atlas` in Node VM, swims through every landmark (`flyTo` + 12 simulation ticks), verifies visible terrain chunks + cached flora chunks, confirms every scene `userData.key` exists in `biome.encyclopedia`, and toggles quality presets `low` -> `medium` -> `high` -> `ultra`.

## Additional Mandatory Checks by Change Type

### When Adding or Adjusting Flora / Benthos Density (`flora_library.js`, `biomes/*.js`)
Run an Ultra-density (`density = 1.32`) stress test across dense `6 × 6` chunk neighborhoods (reef crest, lagoon, mangrove/seagrass edge) to verify **no species approaches or exceeds `maxInstances`** in `OC.FloraLibrary.create()`:
```bash
node -e '
const fs=require("fs"),vm=require("vm");
// Load three.min.js + util/quality/biome_registry/biome/world/flora_library
// Sum generateChunkFlora counts over 6x6 dense windows at density=1.32
// Assert every species count <= prototype.maxInstances
'
```

### When Changing Shaders, Renderer, or HUD (`world.js`, `template.html`, `src/ui/*`)
1. If adding new DOM element IDs in `template.html` or `src/ui/*`, ensure `tests/verify.mjs` `makeStubEl` handles any new DOM methods/properties safely.
2. Serve locally via `python3 -m http.server 8080 --bind 0.0.0.0` (or `start_process` preview) and verify `HTTP 200 OK` on `/`.
3. When Chromium/Playwright is available, run `webapp-testing` against the running server to verify zero uncaught `console.error` / `pageerror` exceptions, non-blank WebGL canvas pixels, and responsive layout across `1440×900` and `390×844`.

### When Adding New Modules or Biomes
- Confirm new files appear in **both** `build.py` `ORDER` and `tests/verify.mjs` `SRC_ORDER` in identical dependency order.
- Extend `tests/verify.mjs` to iterate over `OC.Biomes.list()` (or test the newly added biome) so multi-biome regressions are caught automatically.
