---
name: marine-biome-researcher
description: Research and verify real-world marine geography, bathymetry, thermocline optics, flora, and fauna (Latin taxonomy, authentic body sizes, depth strata, diel activity, and bioluminescence) before designing or expanding any ocean biome in the ocean repository.
metadata:
  project: ocean
  domain: marine-biology-and-oceanography
---

# Marine Biome Researcher

Use this skill **before writing code** for any new ocean biome (`src/biomes/<biome>.js`) or adding new species to `OC.FloraLibrary`, `OC.FaunaEngine`, and `biome.encyclopedia`. Every biome in `ocean` aims for authentic geography and biodiversity rather than generic fantasy reefs.

## Research Workflow

### Step 1: Establish the Real-World Bathymetric Cross-Section
Document a continuous profile anchored to sea level (`Y = 0`, underwater heights negative in meters) across the biome footprint (`worldRadius = 1200`, `2400 × 2400 m` standard):
1. **Zones & depth bands** (4–7 ecologically distinct zones): e.g., intertidal/mangrove/ice-edge, shallow flats/kelp bed, lagoon/shelf, crest/wall, outer slope/canyon/vent field, abyssal basin.
2. **Real bathymetry numbers**: min/max depths in meters, slope gradients, signature geological features (bommies, spur-and-groove channels, karst blue holes, hydrothermal chimneys, brine pools, sea mounts, glacial shelves).
3. **Substrate transitions**: carbonate coral sand, calcareous limestone/basalt, seagrass silt, anoxic mud, sulfide chimneys — translated into `getTerrainColor(x, y, z, outColor)`.

### Step 2: Water Column Physics & Optics
Record realistic physical parameters per zone and depth:
- **Surface temperature (`tempC`) & thermocline**: note surface °C and vertical drop rate (in `src/ui/main.js`, default drop is `0.065 °C/m` below 15 m; flag steeper thermoclines if the biome requires custom `getTemperatureAt` later).
- **Visibility & spectral absorption**:
  - `fogColor` (hex/RGB): turquoise-cyan in oligotrophic tropical shelves, emerald-olive in temperate upwelling kelp forests, cobalt-indigo on steep drop-offs, near-black slate at bathypelagic depths.
  - `fogDensity`: `0.004–0.007` (clear tropical waters), `0.010–0.016` (productive temperate/kelp waters), `0.018–0.030+` (deep trenches, vents, turbid estuaries).
  - `causticStrength` & `rayStrength`: strong in clear euphotic zone (`0..-25 m`), attenuated exponentially below `30–40 m`, zero in aphotic depths (`< -100 m`).
  - `bioGlow`: bioluminescent intensity in twilight/aphotic zones (`< -45 m`) or at night (`dayW -> 0`).

### Step 3: Curate Verified Flora & Fauna Dossier
Use `openalex-database`, `literature-review`, and `scientific-critical-thinking` (or `web_search` when available) to verify every candidate species before coding:

| Field | Requirement |
|---|---|
| Russian common name | Accurate scientific/naturalist Russian name (`Голубой хирург`, `Гигантский тихоокеанский осьминог`) |
| Latin binomial | Verified accepted species or genus (`Paracanthurus hepatus`, `Macrocystis pyrifera`) — never invent Latin names |
| Category | One of the Atlas tabs: `Геология`, `Кораллы`, `Флора`, `Беспозвоночные`, `Рыбы`, `Мегафауна` (extend tabs only deliberately) |
| Depth & zone binding | Exact depth range in meters (`2–24 м`) and substrate/zone (`Лагуна и Гребень`, `Склон и Стена`, `Пелагиаль`) |
| Realistic scale | Authentic length/height so procedural meshes keep believable relative proportions (e.g., chromis ~0.2–0.5 scene units, manta ~4–7 m span, humpback whale ~14–16 m) |
| Diel activity | `diurnal`, `nocturnal`, `crepuscular`, or `cathemeral`; note night coloration/sheltering vs active foraging |
| Bioluminescence | True photophore/mucus/symbiont glow vs reflected iridescence |

### Step 4: Output a Structured Biome Dossier
Before editing `src/`, produce a concise checklist covering:
1. **Cross-section map** (west-to-east or center-to-rim depth curve in meters).
2. **Zone table** (`id`, Russian `name`/`shortName`, `depthLabel`, `tempC`, substrate, optical character).
3. **Flora/Benthos list** mapped to existing `OC.FloraLibrary` prototypes vs new procedural species needed.
4. **Fauna list** split into GPU-instanced schools vs articulated solo/megafauna, with realistic counts and zone placement.
5. **Russian `ENCYCLOPEDIA` draft** matching the tuple format `[title, latin, category, zoneLabel, depthLabel, desc]`.

## Anti-Patterns to Avoid
- Mixing incompatible biogeographic realms (e.g., Atlantic elkhorn corals with Indo-Pacific clownfish/dugongs, or polar narwhals in tropical reefs) unless building an explicit multi-region showcase.
- Placing photosynthetic reef-building `Acropora` corals in aphotic depths (`< -45 m`) or cold subpolar kelp at `+28 °C`.
- Guessing taxonomy or depth limits when a quick verification query takes seconds.
