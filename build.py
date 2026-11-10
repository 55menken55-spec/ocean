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
    'engine/world.js',
    'engine/terrain.js',
    'engine/flora_library.js',
    'engine/flora_streamer.js',
    'engine/fauna_engine.js',
    'engine/audio.js',
    'ui/navigation.js',
    'ui/expedition.js',
    'ui/minimap.js',
    'ui/atlas.js',
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
