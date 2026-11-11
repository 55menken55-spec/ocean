#!/usr/bin/env python3
"""Собирает автономный index.html: Three.js + модульная архитектура движка и биомов."""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

ORDER = [
    'core/util.js',
    'core/quality.js',
    'core/biome_registry.js',
    'biomes/great_barrier_reef.js',
    'biomes/kelp_forest.js',
    'biomes/hydrothermal_vents.js',
    'biomes/arctic_sea.js',
    'biomes/wreck_atoll.js',
    'biomes/mariana_trench.js',
    'biomes/brine_pool.js',
    'biomes/cenote_caves.js',
    'biomes/galapagos_upwelling.js',
    'biomes/amazon_igapo.js',
    'engine/weather.js',
    'engine/eco_lab.js',
    'engine/world.js',
    'engine/terrain.js',
    'engine/flora/reef_corals.js',
    'engine/flora/temperate_kelp.js',
    'engine/flora/vents_abyss.js',
    'engine/flora/arctic_ice.js',
    'engine/flora/wreck_tropic.js',
    'engine/flora/caves_brine.js',
    'engine/flora/amazon_igapo.js',
    'engine/flora_library.js',
    'engine/flora_streamer.js',
    'engine/fauna/schools.js',
    'engine/fauna/pelagic.js',
    'engine/fauna/abyss_polar.js',
    'engine/fauna/surface_expedition.js',
    'engine/fauna_engine.js',
    'engine/audio.js',
    'engine/rov.js',
    'engine/sonar.js',
    'engine/hydrophone.js',
    'ui/navigation.js',
    'ui/expedition.js',
    'ui/minimap.js',
    'ui/atlas.js',
    'ui/globe.js',
    'ui/hud_panels.js',
    'ui/panels_rov.js',
    'ui/panels_camera.js',
    'ui/panels_options.js',
    'ui/panels_biomes.js',
    'ui/main.js',
]

with open(os.path.join(ROOT, 'three.min.js'), encoding='utf-8') as f:
    three = f.read().replace('</script>', '<\\/script>')

chunks = []
for rel in ORDER:
    p = os.path.join(SRC, rel)
    with open(p, encoding='utf-8') as f:
        chunks.append(f'// === {rel} ===\n' + f.read())

src = '\n'.join(chunks).replace('</script>', '<\\/script>')

with open(os.path.join(ROOT, 'template.html'), encoding='utf-8') as f:
    tpl = f.read()

out = tpl.replace('/*__THREE__*/', three).replace('/*__SRC__*/', src)
out_path = os.path.join(ROOT, 'index.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(out)

print(f'OK -> {out_path} ({round(len(out) / 1024)} KB, {len(ORDER)} modules)')
