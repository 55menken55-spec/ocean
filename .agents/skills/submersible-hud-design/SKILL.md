---
name: submersible-hud-design
description: Design and refine the deep-ocean glassmorphic HUD, bathyscaphe/submersible instrument mode, bathymetric minimap, species encyclopedia Atlas, and responsive Russian UI in template.html and src/ui/*.
metadata:
  project: ocean
  domain: ui-hud-design
---

# Submersible HUD & Atlas Design

Use this skill when modifying `template.html` or `src/ui/{main,navigation,minimap,atlas}.js` — including Stage 2 bathyscaphe instruments (echosounder, pressure/depth gauges, cockpit reticle, biome switcher) and Atlas upgrades.

## Design System Tokens (`template.html`)

Preserve the deep-ocean dark-glass aesthetic without blocking the live 3D ocean canvas:
- `--glass: rgba(6, 22, 38, 0.64)`
- `--glass-strong: rgba(5, 18, 32, 0.88)`
- `--glass-brd: rgba(130, 222, 255, 0.2)`
- `--ink: #ecf8ff` (primary readable ink)
- `--dim: #8bb4c8` (secondary labels)
- `--accent: #58e0ff` (bioluminescent cyan active/interactive signal)
- `--accent2: #ffb574` (warm coral/landmark highlight)
- `--ok: #5be8b0` (discovered species / active systems)

## Core Layout & Viewport Rules

1. **Viewport First**: `#scene` stays full-bleed (`position: fixed; inset: 0; touch-action: none`). Informational overlays (`.brand`, `.telemetry`, `.hero`, `.status`, `.popup`) must keep `pointer-events: none` so dragging/picking on the reef always works.
2. **Toggleable Immersion (`H`)**: Every non-modal HUD panel must carry `.hud-hideable` so pressing `H` hides all chrome cleanly for pure ocean observation/screenshots.
3. **Tabular Precision**: Live numbers (depth in meters, temperature in °C, compass heading `С 000°`, pressure in `bar`/`atm`, time `HH:MM`, FPS, instance counts) must use `font-variant-numeric: tabular-nums` so digits never jitter horizontally.
4. **Russian UI & Accessibility**:
   - All visible HUD copy, tooltips, ARIA labels, and Atlas descriptions are in clean, natural Russian.
   - Modal dialogs (`#atlas-modal`) require `role="dialog"`, `aria-modal="true"`, backdrop click close, and `Escape` close.
   - Toggle icon buttons (`#btn-flash`, `#btn-sound`) sync `aria-pressed`.
   - Respect `prefers-reduced-motion: reduce` (already tracked in `src/ui/main.js`).

## Key Subsystems & Extension Guidelines

### 1. Bathymetric Minimap (`src/ui/minimap.js`)
- Pre-renders `184 × 184` bathymetry image once per biome using `biome.getHeight(wx, wz)` and contour rings (`15 m` steps), then redraws view cone + player heading arrow + landmark dots each HUD tick (`~7 Hz`).
- Clicking within `10 px` of a landmark teleports cleanly to `(lm.x, lm.y, lm.z, lm.yaw, lm.pitch)`; clicking elsewhere computes safe floor clearance.

### 2. Species Atlas (`src/ui/atlas.js`)
- Tracks `discovered` keys (species clicked in 3D via `Raycaster`), displays progress `found / total`, filters by category tabs, and offers one-click `Нырнуть туда →` navigation to the matching landmark.
- When adding a new biome, add a biome switcher or ensure `CATEGORY_LANDMARK` gracefully falls back to `biomeRef.landmarks[0]`.

### 3. Stage 2 Submersible / Bathyscaphe Mode
When implementing a full bathyscaphe instrument view:
- Make it an explicit toggleable mode/overlay (e.g. key `B` or HUD button) rather than permanently narrowing FOV with thick dark borders.
- Keep instruments functional and compact:
  - **Altitude / Clearance above seabed**: `Math.max(0, camPos.y - OC.floorH(camPos.x, camPos.z))` (`Клиренс`).
  - **Hydrostatic pressure**: `(1 + Math.max(0, -camPos.y) * 0.1).toFixed(1) + ' атм'`.
  - **Forward Echosounder / Terrain Profile**: sample `OC.floorH` along `5–12` steps ahead along the camera forward vector (`0..120 m`) and render a clean cyan depth profile trace on a small `<canvas>` gauge.
  - **Spotlight + Sonar Ping triggers**: tie directly to `OC.toggleFlashlight()` and `OC.sound` sonar pulse.

### 4. Responsive & Mobile Discipline
- Keep breakpoints (`<= 960px`, `<= 720px`) preventing overlap between `.telemetry`, `.topright`, `.panel`, and `.touch-nav`.
- Keep all DOM element IDs referenced by `src/ui/*.js` and `tests/verify.mjs` (`scene`, `minimap`, `panel`, `atlas-modal`, `atlas-grid`, etc.) intact or update `tests/verify.mjs` stubs alongside changes.
