/* ================= tests/verify.mjs — РАННЕР ВЕРИФИКАЦИИ ДВИЖКА ================= */
/* Файл разбит (долг 1.4): самые проверки живут в tests/stages/*.mjs, общая
   VM-песочница — в tests/lib/harness.mjs, проверки геометрии — в
   tests/lib/terrain_checks.mjs. Здесь остались только три подготовительных
   шага (синтаксис исходников, собранный index.html, подъём песочницы) и
   порядок вызова стадий.

   Порядок важен и зафиксирован вызовами ниже: стадии пользуются общим ctx,
   куда предыдущие стадии кладут свои результаты (Object.assign). Например,
   cenote_caves публикует ccBiome, который нужен стадии сонара, а Stage 3
   получает FaunaEngine от Stage 2. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHarness, parseAllSources, ROOT } from './lib/harness.mjs';
import { run as runChunkPathParity } from './stages/chunk_path_parity.mjs';
import { run as runAtlasFauna } from './stages/atlas_fauna.mjs';
import { run as runFloatingOrigin } from './stages/floating_origin.mjs';
import { run as runPlanetaryWorld } from './stages/planetary_world.mjs';
import { run as runMultiBiome } from './stages/multi_biome.mjs';
import { run as runBiomeAmazon } from './stages/biome_amazon.mjs';
import { run as runBiomeBaikal } from './stages/biome_baikal.mjs';
import { run as runBiomeEuropa } from './stages/biome_europa.mjs';
import { run as runBiomeTitan } from './stages/biome_titan.mjs';
import { run as runStage2Optics } from './stages/stage2_optics.mjs';
import { run as runStage3Rov } from './stages/stage3_rov.mjs';
import { run as runStage4Report } from './stages/stage4_report.mjs';
import { run as runStage5Visual } from './stages/stage5_visual.mjs';
import { run as runMissions } from './stages/missions.mjs';
import { run as runWeather } from './stages/weather.mjs';
import { run as runAtlasCinema } from './stages/atlas_cinema.mjs';
import { run as runEcosystemAi } from './stages/ecosystem_ai.mjs';
import { run as runWreckAtoll } from './stages/wreck_atoll.mjs';
import { run as runGlobe } from './stages/globe.mjs';
import { run as runEcolab } from './stages/ecolab.mjs';
import { run as runRov } from './stages/rov.mjs';
import { run as runSurfaceWorld } from './stages/surface_world.mjs';
import { run as runMarianaTrench } from './stages/mariana_trench.mjs';
import { run as runBrinePool } from './stages/brine_pool.mjs';
import { run as runCenoteCaves } from './stages/cenote_caves.mjs';
import { run as runGalapagos } from './stages/galapagos.mjs';
import { run as runSonar } from './stages/sonar.mjs';
import { run as runHydrophone } from './stages/hydrophone.mjs';
import { run as runMuseumCycle } from './stages/museum_cycle.mjs';
import { run as runCaustics } from './stages/caustics.mjs';
import { run as runPlumes } from './stages/plumes.mjs';
import { run as runOnboardingCi } from './stages/onboarding_ci.mjs';
import { run as runBathyLandmarks } from './stages/bathy_landmarks.mjs';
import { run as runShaderPatching } from './stages/shader_patching.mjs';
import { run as runEngineCore } from './stages/engine_core.mjs';
import { run as runVentsVolcano } from './stages/vents_volcano.mjs';
import { run as runArcticSea } from './stages/arctic_sea.mjs';
import { run as runBiomeSwitch } from './stages/biome_switch.mjs';
import { run as runPerfGateSelfcheck } from './stages/perf_gate_selfcheck.mjs';
import { run as runFluidPhysics } from './stages/fluid_physics.mjs';

console.log('1) Checking syntax of all source modules...');
const parsedCount = parseAllSources();
console.log('   All', parsedCount, 'JS modules parsed cleanly.');

console.log('2) Checking built index.html...');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(!html.includes('/*__THREE__*/'), 'index.html must replace __THREE__ placeholder');
assert(!html.includes('/*__SRC__*/'), 'index.html must replace __SRC__ placeholder');
assert(html.length > 500000, 'index.html seems unexpectedly small');
for (const domId of [
  'id="sub-hud"', 'id="sonar-box"', 'id="sonar-canvas"', 'id="btn-sub"', 'id="btn-sonar"',
  'id="btn-cam"', 'id="btn-journal"', 'id="cam-hud"', 'id="cam-flash"', 'id="cam-preview"', 'id="journal-modal"', 'id="tele-wp"',
  'id="lens-fx"', 'id="weather-btns"', 'id="tele-weather"',
  'id="atlas-3d"', 'id="atlas-viewer"', 'id="btn-cinema"', 'id="cinema-bars"', 'id="cinema-hud"', 'id="touch-stick"',
  'data-cat="Артефакты"',
  'id="btn-globe"', 'id="globe-modal"', 'id="globe-3d"', 'id="guide-card"', 'id="guide-prev"', 'id="guide-pause"', 'id="guide-next"', 'id="guide-exit"',
  'id="btn-lab"', 'id="lab-panel"', 'id="lab-chart"', 'id="lab-health-num"', 'id="lab-s-temp"', 'id="lab-s-ph"', 'id="lab-s-nutr"', 'id="lab-s-curr"',
  'id="btn-rov"', 'id="rov-panel"', 'id="rov-ctd-chart"', 'id="rov-samples"', 'id="rov-btn-chase"', 'id="rov-btn-currents"', 'id="rov-btn-sample"', 'id="rov-btn-ctd"', 'id="rov-btn-vessel"',
  'id="map-cov"', 'id="map-fog-btn"',
  'id="btn-hydro"', 'id="hydro-box"', 'id="hydro-canvas"', 'id="hydro-db"', 'id="hydro-source"', 'id="hydro-band"', 'id="hydro-listen-btn"',
  'id="rov-btn-museum"', 'data-jtab="museum"'
]) {
  assert(html.includes(domId), `index.html missing required element ${domId}`);
}

console.log('3) Executing full engine integration & shader verification in VM...');
const h = createHarness();
const getEl = h.getEl;
const memStorage = h.memStorage;
const sandbox = h.sandbox;
const T = h.T;
const OC = h.OC;
const biome = h.biome;


// Perf-гейт проверяет сам себя: порог, поднятый «чтобы не мешал», ломает прогон
runPerfGateSelfcheck();

// Физика жидкости: гидростатика, плавучесть и акустика воды и неводных сред
runFluidPhysics({ OC });

// A-B) Батиметрия, зоны, маяки и точка спавна активного биома
const { sp } = runBathyLandmarks({ biome });

// C) GLSL-патчинг onBeforeCompile; функция проверки нужна и блоку Option 2
const { checkMaterialShader } = runShaderPatching({ OC, T });

// D-F) Ядро: стриминг террейна, флора, фауна, навигация, течения
const { scene, camera, spawnVec, fauna, floraProtos, worldSrc, faunaSrc } = runEngineCore({ OC, T, biome, getEl, html, checkMaterialShader, sp });

// G) Планетарная платформа: все 14 биомов, горячая смена и качество
runMultiBiome({ T, OC, scene, camera, html, floraProtos, worldSrc });

// Паритет путей постройки чанков: Web Worker против синхронного fallback
runChunkPathParity({ T, OC, h, scene });

// Гидротермальные источники и подводный вулкан (фазы idle -> eruption -> idle)
const { a } = runVentsVolcano({ OC, T, camera });

// Арктика: отрицательная температура, сияние, ледовая флора
const { arcticBiome } = runArcticSea({ OC, floraProtos });

// Возврат на GBR с прогоном всех пресets качества
const { gbrBack, gbrFauna } = runBiomeSwitch({ OC, biome, scene, spawnVec, camera });

const ctx = {
  T, OC, h, sandbox, scene, camera, spawnVec, biome, fauna,
  floraProtos, worldSrc, faunaSrc, html, getEl, memStorage, a,
  gbrBack, gbrFauna, arcticBiome
};

Object.assign(ctx, runMissions(ctx));
Object.assign(ctx, runWeather(ctx));
Object.assign(ctx, runAtlasCinema(ctx));
Object.assign(ctx, runEcosystemAi(ctx));
Object.assign(ctx, runWreckAtoll(ctx));
Object.assign(ctx, runGlobe(ctx));
Object.assign(ctx, runEcolab(ctx));
Object.assign(ctx, runRov(ctx));
Object.assign(ctx, runSurfaceWorld(ctx));
Object.assign(ctx, runMarianaTrench(ctx));
Object.assign(ctx, runBrinePool(ctx));
Object.assign(ctx, runCenoteCaves(ctx));
Object.assign(ctx, runGalapagos(ctx));
Object.assign(ctx, runSonar(ctx));
Object.assign(ctx, runHydrophone(ctx));
Object.assign(ctx, runMuseumCycle(ctx));
Object.assign(ctx, runCaustics(ctx));
Object.assign(ctx, runPlumes(ctx));
Object.assign(ctx, runOnboardingCi(ctx));

/* ---- Биомы-долгожители (Амазония, Байкал, Европа) и Stages 2-5 ----
   Здесь связи явно передаются аргументами, а не через ctx: стадии биомов
   возвращают CTD-зондирования, которые Stage 4 кладёт в научный отчёт. */
const amz = runBiomeAmazon({ T, OC });
const baikal = runBiomeBaikal({ T, OC, scene, amz });
runBiomeEuropa({ T, OC, scene });
runBiomeTitan({ T, OC, scene });
const fx = runStage2Optics({ T, OC, scene, worldSrc });
runStage3Rov({ T, OC, camera, fx });
runStage4Report({ OC, amz, baikal });
runStage5Visual({ T, OC, html, worldSrc });

/* ---- Финальные проверки: Атлас и Floating Origin ----
   Атлас идёт после всех биомов, а Floating Origin — последним: он меняет
   порог сдвига и origin навсегда, поэтому остальные проверки считают
   позиции в локальных координатах. */
runAtlasFauna({ T, OC });
runFloatingOrigin({ T, OC });
/* Планетарный мир — последним: он копит 14 км в origin и навсегда сдвигает
   сцену, поэтому любая проверка локальных координат обязана идти до него. */
runPlanetaryWorld({ T, OC, scene, camera, getEl });

console.log('ALL VERIFICATION CHECKS PASSED!');
