#!/usr/bin/env python3
"""Собирает автономный index.html: Three.js + модульная архитектура движка и биомов.

ORDER — единственный источник правды о порядке модулей. tests/verify.mjs читает
этот же файл (python3 build.py --list), поэтому второй список не дублируется.

    python3 build.py            собрать index.html
    python3 build.py --check    сверить src/ с ORDER (лишние/отсутствующие/дубли)
    python3 build.py --list     напечатать порядок модулей (JSON)
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

ORDER = [
    'core/util.js',
    'core/quality.js',
    'core/biome_registry.js',
    'biomes/great_barrier_reef/base.js',
    'biomes/great_barrier_reef/flora.js',
    'biomes/great_barrier_reef/encyclopedia.js',
    'biomes/great_barrier_reef/tour.js',
    'biomes/great_barrier_reef/fauna_plan.js',
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
    'engine/world/textures.js',
    'engine/world/rays.js',
    'engine/world/precip.js',
    'engine/world/postfx.js',
    'engine/world.js',
    'engine/terrain.js',
    'engine/flora/reef_corals.js',
    'engine/flora/reef_soft.js',
    'engine/flora/reef_sponges.js',
    'engine/flora/reef_benthos.js',
    'engine/flora/temperate_kelp.js',
    'engine/flora/vents_abyss.js',
    'engine/flora/arctic_ice.js',
    'engine/flora/wreck_tropic.js',
    'engine/flora/caves_brine.js',
    'engine/flora/amazon_igapo.js',
    'engine/flora_library.js',
    'engine/flora_streamer.js',
    'engine/fauna/schools.js',
    'engine/fauna/reef_life.js',
    'engine/fauna/rays_sharks.js',
    'engine/fauna/whales.js',
    'engine/fauna/polar.js',
    'engine/fauna/abyss.js',
    'engine/fauna/brine_lake.js',
    'engine/fauna/cave_twilight.js',
    'engine/fauna/brine_cave.js',
    'engine/fauna/surface_birds.js',
    'engine/fauna/cetaceans.js',
    'engine/fauna/galapagos.js',
    'engine/fauna/amazon_river.js',
    'engine/fauna/particles.js',
    'engine/fauna/splash.js',
    'engine/fauna/haze.js',
    'engine/fauna/systems.js',
    'engine/fauna/spawn.js',
    'engine/fauna_engine.js',
    'engine/audio/core.js',
    'engine/audio/ambience.js',
    'engine/audio/calls.js',
    'engine/audio/ui_sfx.js',
    'engine/audio/species_voice.js',
    'engine/audio.js',
    'engine/rov/model.js',
    'engine/rov/tether.js',
    'engine/rov/buoys.js',
    'engine/rov/wake.js',
    'engine/rov/samples.js',
    'engine/rov.js',
    'engine/sonar.js',
    'engine/hydrophone.js',
    'ui/navigation/state.js',
    'ui/navigation/tour.js',
    'ui/navigation/gamepad.js',
    'ui/navigation.js',
    'ui/expedition/store.js',
    'ui/expedition/missions.js',
    'ui/expedition.js',
    'ui/expedition/report.js',
    'ui/minimap.js',
    'ui/atlas.js',
    'ui/globe.js',
    'ui/hud_panels.js',
    'ui/panels_rov.js',
    'ui/panels_camera.js',
    'ui/panels_service.js',
    'ui/picking.js',
    'ui/telemetry.js',
    'ui/panels_options.js',
    'ui/panels_biomes.js',
    'ui/panels_touch.js',
    'ui/panels_guide.js',
    'ui/hotkeys.js',
    'ui/main.js',
]

def list_modules():
    """Порядок модулей в виде JSON — его использует tests/verify.mjs."""
    print(json.dumps(ORDER))


def check(strict=True):
    """Сверяет src/ с ORDER: пропуски, лишние файлы и дубли."""
    problems = []

    seen = set()
    for rel in ORDER:
        if rel in seen:
            problems.append(f'дубль в ORDER: {rel}')
        seen.add(rel)
        if not os.path.isfile(os.path.join(SRC, rel)):
            problems.append(f'в ORDER есть, файла нет: {rel}')

    on_disk = set()
    for root, _, files in os.walk(SRC):
        for f in files:
            if f.endswith('.js'):
                on_disk.add(os.path.relpath(os.path.join(root, f), SRC).replace(os.sep, '/'))
    for rel in sorted(on_disk - seen):
        problems.append(f'файл не попал в ORDER: {rel}')

    if problems:
        print('ORDER рассинхронизирован:')
        for p_ in problems:
            print('  -', p_)
        if strict:
            sys.exit(1)
        return False
    print(f'ORDER ok: {len(ORDER)} модулей, лишних файлов в src/ нет.')
    return True


def main(argv):
    if '--list' in argv:
        list_modules()
        return
    if '--check' in argv:
        check()
        return

    with open(os.path.join(ROOT, 'three.min.js'), encoding='utf-8') as f:
        three = f.read().replace('</script>', '<\\/script>')

    chunks = []
    for rel in ORDER:
        p_ = os.path.join(SRC, rel)
        with open(p_, encoding='utf-8') as f:
            chunks.append(f'// === {rel} ===\n' + f.read())

    src = '\n'.join(chunks).replace('</script>', '<\\/script>')

    with open(os.path.join(ROOT, 'template.html'), encoding='utf-8') as f:
        tpl = f.read()

    out = tpl.replace('/*__THREE__*/', three).replace('/*__SRC__*/', src)
    out_path = os.path.join(ROOT, 'index.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(out)

    print(f'OK -> {out_path} ({round(len(out) / 1024)} KB, {len(ORDER)} modules)')


if __name__ == '__main__':
    main(sys.argv[1:])
