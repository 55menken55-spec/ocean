// AD) Verify Stage 4 Scientific Report Export (.MD & .JSON) & Adaptive Auto-LOD Controller
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, amz, baikal } = ctx; // amz/baikal — данные CTD-зондирований из стадий 10-го и 11-го биомов
  assert(typeof OC.Expedition.buildScientificReport === 'function' && typeof OC.Expedition.exportReport === 'function', 'OC.Expedition must expose scientific report builder & exporter');
  const repMd = OC.Expedition.exportReport('md', { biome: amz.biome, ctdCast: amz.ctd, ecoState: OC.EcoLab.getState(), mapCoveragePct: 42 });
  assert(repMd && repMd.filename.endsWith('.md') && repMd.content.includes('Амазония') && repMd.content.includes('Сводка по 14 биомам'), 'Markdown report must summarize all 14 biomes & CTD data');
  const repJson = OC.Expedition.exportReport('json', { biome: amz.biome, ctdCast: amz.ctd, ecoState: OC.EcoLab.getState(), mapCoveragePct: 42 });
  const baikalReportMd = OC.Expedition.exportReport('md', { biome: baikal.biome, ctdCast: baikal.ctd });
  const baikalReportJson = OC.Expedition.exportReport('json', { biome: baikal.biome, ctdCast: baikal.ctd });
  const baikalReportData = JSON.parse(baikalReportJson.content);
  assert(baikalReportMd.content.includes('Пресноводная химия') && baikalReportMd.content.includes('Кислородный профиль'), `Baikal Markdown report must include freshwater chemistry and oxygen profile: ${baikalReportMd.content.slice(0, 1200)}`);
  assert.equal(baikalReportData.ctdCast.conductivityUSCm, baikal.ctd.conductivityUSCm, 'JSON report must preserve Baikal conductivity');
  assert.equal(baikalReportData.ctdCast.oxygenProfile.length, baikal.ctd.bins.length, 'JSON report must export every CTD oxygen-depth sample');
  assert.equal(baikalReportData.ctdCast.profile[0].conductivityUSCm, baikal.ctd.bins[0].conductivityUSCm, 'JSON report must retain the conductivity/TDS vertical profile');
  const parsedRep = JSON.parse(repJson.content);
  assert.equal(parsedRep.biomes.length, 14, 'JSON scientific report must contain all 14 biomes');
  /* Число записей Атласа считаем из самих биомов, а не константой: иначе любая
     новая запись энциклопедии (например, документирование вида, который биом
     генерировал без записи) ломает отчёт экспедиции. */
  const atlasTotal = OC.Biomes.list().reduce((n, bm) => n + Object.keys(bm.encyclopedia || {}).length, 0);
  assert(parsedRep.summary.missionsTotal === 56 && parsedRep.summary.speciesTotal === atlasTotal,
    `Report summary totals mismatch: ${JSON.stringify(parsedRep.summary)} (ожидалось ${atlasTotal} записей Атласа)`);

  assert(typeof OC.Quality.evaluateAutoLod === 'function' && typeof OC.Quality.setAutoLod === 'function' && typeof OC.Quality.getAutoLodState === 'function', 'OC.Quality must expose adaptive Auto-LOD controller');
  OC.Quality.set('high');
  assert.equal(OC.Quality.isAutoLod(), false, 'Manual preset selection must pause Auto-LOD');
  OC.Quality.setAutoLod(true);
  assert.equal(OC.Quality.isAutoLod(), true, 'setAutoLod(true) must enable adaptive Auto-LOD');
  for (let step = 0; step < 3; step++) OC.Quality.evaluateAutoLod(48.5, 1.0);
  assert.equal(OC.Quality.getId(), 'medium', 'Sustained p95 > 30ms must step Auto-LOD down from high -> medium');
  // Fast recovery only occurs after cooldown + sustained under-budget window
  for (let step = 0; step < 12; step++) OC.Quality.evaluateAutoLod(9.2, 1.0);
  assert.equal(OC.Quality.getId(), 'high', 'Sustained p95 < 13.5ms must recover Auto-LOD back to high');
  OC.Quality.set('high');
  console.log(`   Stage 4 Scientific Report Export (${parsedRep.biomes.length} biomes, ${parsedRep.summary.speciesTotal} species .MD/.JSON) & Adaptive Auto-LOD verified.`);

}
