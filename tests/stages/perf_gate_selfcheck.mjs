/* ---- Самопроверка perf-гейта ----
   Гейт, который нельзя проверить на реальной деградации в каждом прогоне, легко
   вырождается в плацебо: достаточно один раз поднять порог — и он перестаёт что
   либо ловить. Здесь логика гейта проверяется на синтетических профилях:
   тяжёлый биом, абсолютные и относительные зубья p95, пустая сцена, общая
   деградация движка. */
import assert from 'node:assert/strict';
import { VM_GATE, BROWSER_GATE, checkPerfRows, normalizeRows, median } from '../perf_gate.mjs';

export function run() {

  const rows = [
    { biome: 'a', avgCpuMs: 10, p95CpuMs: 20, draws: 100 },
    { biome: 'b', avgCpuMs: 12, p95CpuMs: 24, draws: 110 },
    { biome: 'spiky', avgCpuMs: 11, p95CpuMs: 70, draws: 90 },
    { biome: 'heavy', avgCpuMs: 60, p95CpuMs: 100, draws: 120 },
    { biome: 'empty', avgCpuMs: 9, p95CpuMs: 18, draws: 3 }
  ];

  // 1) Зубья: p95/avg = 6.36 > 4
  let r = checkPerfRows(rows, VM_GATE, 'unit');
  assert(r.violations.some((v) => v.includes('spiky') && v.includes('p95')), `зубья не пойманы: ${r.violations}`);
  // 2) Тяжёлый биом: 60 / медиана 11 = 5.45×
  assert(r.violations.some((v) => v.includes('heavy') && v.includes('медианы')), `тяжёлый биом не пойман: ${r.violations}`);
  // 3) Пустая сцена по draw calls
  assert(r.violations.some((v) => v.includes('empty') && v.includes('draw calls')), `пустая сцена не поймана: ${r.violations}`);
  // 4) Зубья на фоне остальных биомов: p95 70 против медианы p95 24 = 2.9× — ниже
  //    рабочего порога 5, но при пороге 2.5 гейт обязан среагировать
  assert.equal(checkPerfRows(rows, { maxRelativeAvgCpuMs: 99, maxRelativeP95CpuMs: 2.5 }, 'unit').violations.some((v) => v.includes('spiky') && v.includes('медианы p95')), true, 'относительные зубья не отлавливаются');
  // 5) Здоровый профиль проходит
  const healthy = [
    { biomeId: 'a', avgCpuMs: 30, p95CpuMs: 60, drawCalls: 200 },
    { biomeId: 'b', avgCpuMs: 32, p95CpuMs: 70, drawCalls: 210 },
    { biomeId: 'c', avgCpuMs: 31, p95CpuMs: 65, drawCalls: 190 }
  ];
  assert.equal(checkPerfRows(healthy, BROWSER_GATE, 'unit').violations.length, 0, 'здоровый браузерный профиль не должен ломать гейт');
  // 6) Потолок медианы (общая деградация движка)
  const slow = healthy.map((r2) => ({ ...r2, avgCpuMs: r2.avgCpuMs * 4, p95CpuMs: r2.p95CpuMs * 4 }));
  assert(checkPerfRows(slow, VM_GATE, 'unit').violations.some((v) => v.includes('медиана avg')), 'потолок медианы не сработал');
  // 7) Нормализация + медиана
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.deepEqual(normalizeRows([{ biomeId: 'x', avgCpuMs: '5', p95CpuMs: '9', drawCalls: '7' }]), [{ biome: 'x', avg: 5, p95: 9, draws: 7 }]);
  console.log('   Perf gate самотест: 7 сценариев деградации отлавливаются.');
}
