/* ================= ЭКСПЕДИЦИЯ: НАУЧНЫЙ ОТЧЁТ ================= */
/* Сборка отчёта по всем биомам (виды, миссии, CTD, эко-лаб, гидрофон, перф)
   и экспорт в Markdown/JSON. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const { getStore } = OC._ExpStore;

  let lastExportedReport = null;

  function buildReportObj(context) {
    context = context || {};
    const biomes = OC.Biomes && OC.Biomes.list ? OC.Biomes.list() : [];
    const activeBiome = context.biome || (OC.Biomes && OC.Biomes.getActive ? OC.Biomes.getActive() : null);
    const ctdCast = context.ctdCast || (OC.ROV && OC.ROV.getLastCtdCast ? OC.ROV.getLastCtdCast() : null);
    const ecoLab = context.ecoState || (OC.EcoLab && OC.EcoLab.getState ? OC.EcoLab.getState() : null);
    const hydro = context.hydroState || (OC.Hydrophone && OC.Hydrophone.getState ? OC.Hydrophone.getState() : null);
    const perf = context.perfStats || (OC.getPerfStats ? OC.getPerfStats() : null);
    const mapCovPct = typeof context.mapCoveragePct === 'number'
      ? context.mapCoveragePct
      : (OC.Minimap && OC.Minimap.getCoverage ? OC.Minimap.getCoverage() : 0);

    let totalDiscovered = 0;
    let totalSpecies = 0;
    const biomeRows = biomes.map((b) => {
      const sum = OC.Expedition.getBiomeSummary(b);
      totalDiscovered += sum.discovered;
      totalSpecies += sum.speciesTotal;
      return {
        id: b.id,
        name: b.name,
        region: b.region,
        depthRange: b.depthRange,
        discovered: sum.discovered,
        speciesTotal: sum.speciesTotal,
        missionsDone: sum.missionsDone,
        missionsTotal: sum.missionsTotal
      };
    });

    const allSum = OC.Expedition.getAllSummary();
    const samples = OC.Expedition.getSamples();
    const photos = getStore().photos.map((p) => ({
      id: p.id,
      biomeId: p.biomeId,
      biomeName: p.biomeName,
      key: p.key,
      title: p.title,
      latin: p.latin,
      depthM: p.depthM,
      score: p.score
    }));

    return {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      expeditionTitle: 'Научный отчёт экспедиции · Океаны Земли 3D',
      activeBiome: activeBiome ? { id: activeBiome.id, name: activeBiome.name, region: activeBiome.region } : null,
      summary: {
        biomesCount: biomes.length,
        speciesDiscovered: totalDiscovered,
        speciesTotal: totalSpecies,
        missionsDone: allSum.missionsDone,
        missionsTotal: allSum.missionsTotal,
        photosCount: allSum.photosCount,
        samplesCount: allSum.samplesCount,
        mapCoveragePct: mapCovPct
      },
      ctdCast: ctdCast ? {
        biomeName: ctdCast.biomeName,
        zoneName: ctdCast.zoneName,
        minDepthM: ctdCast.minDepthM,
        maxDepthM: ctdCast.maxDepthM,
        surfaceTempC: ctdCast.surfaceTemp,
        bottomTempC: ctdCast.bottomTemp,
        thermoclineM: ctdCast.thermoclineM,
        minO2: ctdCast.minO2,
        maxPressureAtm: ctdCast.maxPressureAtm
      } : null,
      ecoLab: ecoLab ? {
        tempDeltaC: ecoLab.tempDelta,
        pH: ecoLab.pH,
        nutrients: ecoLab.nutrients,
        bleachingPct: Math.round((ecoLab.bleaching || 0) * 100),
        statusLabel: ecoLab.statusLabel
      } : null,
      hydrophone: hydro ? {
        dbSPL: hydro.dbSPL,
        peakHz: hydro.peakHz,
        dominantLabel: hydro.dominantLabel,
        bearingDeg: hydro.bearingDeg
      } : null,
      perf: perf ? {
        fps: perf.fps,
        avgCpuMs: perf.avgCpuMs,
        p95CpuMs: perf.p95CpuMs,
        drawCalls: perf.drawCalls
      } : null,
      biomes: biomeRows,
      samples,
      photos
    };
  }

  function formatMarkdownReport(rep) {
    const lines = [
      '# ' + rep.expeditionTitle,
      '',
      '- **Дата формирования:** ' + rep.generatedAt,
      '- **Активный биом:** ' + (rep.activeBiome ? (rep.activeBiome.name + ' (' + rep.activeBiome.region + ')') : '—'),
      `- **Открыто видов в Атласе:** ${rep.summary.speciesDiscovered} / ${rep.summary.speciesTotal}`,
      `- **Выполнено научных миссий:** ${rep.summary.missionsDone} / ${rep.summary.missionsTotal}`,
      `- **Собрано проб ROV:** ${rep.summary.samplesCount} · **Фотоснимков:** ${rep.summary.photosCount} · **Карта (Fog of War):** ${rep.summary.mapCoveragePct}%`,
      ''
    ];
    if (rep.ctdCast) {
      lines.push('## Последнее зондирование CTD');
      lines.push(`- Зона: **${rep.ctdCast.zoneName}** (${rep.ctdCast.minDepthM}–${rep.ctdCast.maxDepthM} м, до ${rep.ctdCast.maxPressureAtm} атм)`);
      lines.push(`- Температура (поверхн. / дно): **${rep.ctdCast.surfaceTempC} °C / ${rep.ctdCast.bottomTempC} °C** · Термоклин: **${rep.ctdCast.thermoclineM} м** · Мин. O₂: **${rep.ctdCast.minO2} мг/л**`);
      lines.push('');
    }
    if (rep.ecoLab) {
      lines.push('## Эколаборатория');
      lines.push(`- Состояние: **${rep.ecoLab.statusLabel}** · ΔT: ${rep.ecoLab.tempDeltaC >= 0 ? '+' : ''}${rep.ecoLab.tempDeltaC} °C · pH: ${rep.ecoLab.pH} · Обесцвечивание: ${rep.ecoLab.bleachingPct}%`);
      lines.push('');
    }
    lines.push('## Сводка по 10 биомам планеты');
    lines.push('| Биом | Регион | Глубины | Виды | Миссии |');
    lines.push('|---|---|---|---|---|');
    for (const b of rep.biomes) {
      lines.push(`| ${b.name} | ${b.region} | ${b.depthRange} | ${b.discovered}/${b.speciesTotal} | ${b.missionsDone}/${b.missionsTotal} |`);
    }
    lines.push('');
    lines.push('## Музей проб ROV «Наутилус-IV»');
    if (!rep.samples.length) {
      lines.push('_Пробы пока не взяты._');
    } else {
      for (const s of rep.samples) {
        lines.push(`- **${s.title}** (_${s.latin || s.species}_) — ${s.biomeName}, ${s.depthM} м, ${s.tempC} °C, pH ${s.pH}, O₂ ${s.o2} мг/л${s.chemNote ? ' · ' + s.chemNote : ''}`);
      }
    }
    if (rep.photos.length) {
      lines.push('');
      lines.push('## Избранные фотоснимки экспедиции');
      for (const ph of rep.photos.slice(0, 12)) {
        lines.push(`- **${ph.title}** (${ph.biomeName}, ${ph.depthM} м) — оценка **${ph.score}/100**`);
      }
    }
    return lines.join('\n');
  }

  OC.Expedition.buildScientificReport = buildReportObj;
  OC.Expedition.formatReportMarkdown = formatMarkdownReport;
  OC.Expedition.exportReport = function (format, context) {
    const fmt = format === 'json' ? 'json' : 'md';
    const rep = buildReportObj(context);
    const content = fmt === 'json' ? JSON.stringify(rep, null, 2) : formatMarkdownReport(rep);
    const mime = fmt === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8';
    const stamp = rep.generatedAt.slice(0, 10);
    const filename = `ocean_expedition_report_${stamp}.${fmt}`;
    lastExportedReport = { format: fmt, filename, content, report: rep };
    return lastExportedReport;
  };
  OC.Expedition.getLastExport = () => lastExportedReport;
  OC.Expedition._buildReport = buildReportObj;
  OC.Expedition._formatReportMd = formatMarkdownReport;
  OC.Expedition._exportReport = function (format, context) {
    const rep = buildReportObj(context);
    OC.Expedition._lastExport = rep;
    if (format === 'json') return { format: 'json', report: rep, content: JSON.stringify(rep, null, 2) };
    return { format: 'md', report: rep, content: formatMarkdownReport(rep) };
  };
})(window.OC);
