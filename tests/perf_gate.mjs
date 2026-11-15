/* ================= ПРОФИЛИРОВАНИЕ КАК ГЕЙТ СБОРКИ (план 3.3) ================= */
/* Профиль по биомам печатался в E2E, но не ломал сборку: деградация на 40 %
   проходила незамеченной, потому что единственный порог был avgCpuMs < 250 мс
   при реальных 8-50 мс — то есть не ловил ничего.

   Почему здесь нет жёстких абсолютных порогов на время кадра. Замеры одного и
   того же кода на CI-раннере отличались вдвое от прогона к прогону
   (great_barrier_reef: 26.8 -> 42.6 -> 53.5 мс), а SwiftShader в Chromium
   зависит от железа ещё сильнее. Абсолютный порог либо ничего не ловит, либо
   ломает сборку на загруженной машине.

   Поэтому гейт меряет ОТНОШЕНИЯ внутри одного прогона — они не зависят ни от
   железа, ни от нагрузки на раннер:
   1) медиана avg по всем биомам не выше потолка — ловит общую деградацию
      движка (потолок с большим запасом на медленную машину);
   2) ни один биом не тяжелее медианы более чем в N раз — ловит деградацию
      конкретного биома (новый контент, раздутый инстансинг, утечка агентов);
   3) p95 биома не более чем в N раз выше МЕДИАНЫ p95 — ловит «зубья»
      конкретного биома (построение чанка, компиляция шейдера). Сравнивать p95
      с собственным avg нельзя: на SwiftShader первые кадры биома компилируют
      шейдеры и длятся до 1.5 с при avg ~100 мс, то есть p95/avg = 9-10× у
      ВСЕХ биомов — это свойство среды, а не деградация движка. Медиана p95
      эту среду вычитает: все биомы попадают в коридор 0.5-1.4×.
   4) p95/avg (абсолютные зубья) проверяется только там, где среда не шумит —
      в VM-прогоне без GPU (там p95/avg ≈ 2.5 при пороге 4).

   Калибровка: если замедление ожидаемо (добавили тяжёлый биом или контент),
   порог правится здесь, в одном месте, и коммитится вместе с причиной. */
import assert from 'node:assert/strict';

/* Прогон собранного index.html в VM (tests/verify_e2e.mjs): 14 биомов × 100 кадров.
   Медиана avg на CI-раннере — 10-20 мс, потолок 60 мс держит запас ×3. */
export const VM_GATE = {
  maxMedianAvgCpuMs: 60,
  /* Худший биом (great_barrier_reef: 238 draw calls, 2573 flora, 557 fish)
     устойчиво тяжелее медианы в 2.5-3.5 раза на разных прогонах — порог 5×
     оставляет запас на загруженный раннер и ловит настоящую поломку. */
  maxRelativeAvgCpuMs: 5,
  /* В VM-прогоне нет GPU и нет компиляции шейдеров в кадре, поэтому здесь
     абсолютные зубья осмысленны: p95/avg ≈ 2.5, порог 4. */
  maxP95OverAvg: 4,
  maxRelativeP95CpuMs: 5,
  minDraws: 30
};

/* Реальный headless Chromium на SwiftShader (tests/e2e_playwright.mjs).
   Абсолютных порогов времени здесь нет вовсе: скорость SwiftShader зависит от
   железа раннера в разы. Только отношения внутри прогона. */
export const BROWSER_GATE = {
  maxRelativeAvgCpuMs: 5,
  maxRelativeP95CpuMs: 5,
  minDraws: 30
  /* maxP95OverAvg здесь не задан сознательно: SwiftShader компилирует шейдеры
     внутри кадра, и p95/avg = 9-10× у каждого биома. Первый же CI-прогон это
     показал: breach порога 5× дали семь биомов из четырнадцати сразу. */
};

export function median(values) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* Приводит строки профиля к общему виду: поля отличаются между VM-прогоном
   (biome/draws) и браузерным (biomeId/drawCalls). */
export function normalizeRows(rows) {
  return rows.map((r) => ({
    biome: r.biome || r.biomeId,
    avg: Number(r.avgCpuMs),
    p95: Number(r.p95CpuMs),
    draws: Number(r.draws !== undefined ? r.draws : r.drawCalls)
  }));
}

/* Проверяет профиль и возвращает разбор. Ничего не бросает: решение — за
   вызывающим тестом, чтобы сообщение можно было дополнить таблицей. */
export function checkPerfRows(rows, gate, label) {
  const norm = normalizeRows(rows);
  assert(norm.length >= 2, `${label}: профиль должен содержать несколько биомов, got ${norm.length}`);
  const medAvg = median(norm.map((r) => r.avg));
  assert(Number.isFinite(medAvg) && medAvg > 0, `${label}: медиана avgCpuMs не определена`);

  const violations = [];
  if (gate.maxMedianAvgCpuMs && medAvg > gate.maxMedianAvgCpuMs) {
    violations.push(`медиана avg ${medAvg.toFixed(2)} мс выше потолка ${gate.maxMedianAvgCpuMs} мс — движок в целом стал тяжелее`);
  }
  const medP95 = median(norm.map((r) => r.p95));
  let worst = norm[0];
  let worstSpike = norm[0];
  for (const r of norm) {
    const rel = r.avg / medAvg;
    if (rel > (worst.avg / medAvg)) worst = r;
    const spikeRel = medP95 > 0 ? r.p95 / medP95 : 0;
    if (spikeRel > (worstSpike.p95 / medP95)) worstSpike = r;
    if (gate.maxRelativeAvgCpuMs && rel > gate.maxRelativeAvgCpuMs) {
      violations.push(`${r.biome}: avg ${r.avg.toFixed(2)} мс = ${rel.toFixed(2)}× медианы (${medAvg.toFixed(2)} мс), порог ${gate.maxRelativeAvgCpuMs}×`);
    }
    const spikes = r.p95 / r.avg;
    if (gate.maxP95OverAvg && spikes > gate.maxP95OverAvg) {
      violations.push(`${r.biome}: p95 ${r.p95.toFixed(2)} мс = ${spikes.toFixed(2)}× собственного avg (${r.avg.toFixed(2)} мс), порог ${gate.maxP95OverAvg}× — в кадр попадает тяжёлая работа`);
    }
    if (gate.maxRelativeP95CpuMs && spikeRel > gate.maxRelativeP95CpuMs) {
      violations.push(`${r.biome}: p95 ${r.p95.toFixed(2)} мс = ${spikeRel.toFixed(2)}× медианы p95 (${medP95.toFixed(2)} мс), порог ${gate.maxRelativeP95CpuMs}× — биом даёт кадровые зубья на фоне остальных`);
    }
    if (gate.minDraws && !(r.draws >= gate.minDraws)) {
      violations.push(`${r.biome}: ${r.draws} draw calls, ожидалось >= ${gate.minDraws} — сцена почти пустая`);
    }
  }
  return {
    medAvg,
    medP95,
    worst: { biome: worst.biome, rel: worst.avg / medAvg },
    worstSpike: { biome: worstSpike.biome, spikes: worstSpike.p95 / worstSpike.avg, rel: medP95 > 0 ? worstSpike.p95 / medP95 : 0 },
    violations
  };
}

/* Печатает итог гейта и ломает прогон при нарушениях. */
export function assertPerfGate(rows, gate, label) {
  const res = checkPerfRows(rows, gate, label);
  const worstRel = res.worst.rel;
  if (res.violations.length) {
    assert.fail(`${label}: профиль не уложился в бюджет:\n  - ` +
      res.violations.join('\n  - ') +
      `\n  (медиана avg ${res.medAvg.toFixed(2)} мс; если замедление ожидаемо — поправь порог в tests/perf_gate.mjs)`);
  }
  const spikePart = gate.maxP95OverAvg
    ? `p95/avg ${res.worstSpike.spikes.toFixed(2)}× (порог ${gate.maxP95OverAvg}×)`
    : `p95 ${res.worstSpike.rel.toFixed(2)}× медианы p95 (порог ${gate.maxRelativeP95CpuMs}×)`;
  console.log(`   Perf gate: медиана avg ${res.medAvg.toFixed(2)} мс, худший биом ${res.worst.biome} ${worstRel.toFixed(2)}× медианы (порог ${gate.maxRelativeAvgCpuMs}×), худшие зубья ${res.worstSpike.biome} ${spikePart}.`);
  return res;
}
