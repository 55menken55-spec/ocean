/* ---- Физика жидкости (план 2.2: Титан) ----
   Пока движок знал только воду, плотность, тяжесть, скорость звука и
   поверхностное давление были размазаны по формулам CTD, телеметрии и
   гидрофона — и «другая жидкость» означала бы правку каждого места вручную.
   Здесь проверяется, что OC.Fluid считает гидростатику, плавучесть и акустику
   по среде, а устоявшиеся отсчёты воды и Европы не поехали. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { groupSource, ROOT } from '../lib/harness.mjs';

export function run(ctx) {
  const { OC } = ctx;
  const F = OC.Fluid;
  assert(F && typeof F.of === 'function', 'OC.Fluid must expose the fluid registry');

  // Вода осталась эталоном движка: 1 атм у поверхности, 10.08 м на атмосферу
  const water = F.of({});
  assert.equal(water.id, 'water', 'Unknown biome must fall back to water');
  assert(Math.abs(F.pressureAtmAt({}, 0) - 1) < 1e-9, 'Water pressure at the surface must be 1 atm');
  assert(Math.abs(F.pressureAtmAt({}, 10.08) - 2) < 1e-6, `10.08 m of water must read 2 atm, got ${F.pressureAtmAt({}, 10.08)}`);

  /* Жидкие углеводороды Титана: 70 % CH₄ / 16 % N₂ / 14 % C₂H₆ при 94 К.
     Числа — Younglove & Ely (1987) и Poggiali et al. (JGR 2020). */
  const titan = { fluid: { kind: 'methane' } };
  const m = F.of(titan);
  assert.equal(m.id, 'methane', 'fluid.kind must select the methane profile');
  assert.equal(m.density, 660, 'Kraken Mare mixture density must be 660 kg/m3');
  assert.equal(m.soundSpeed, 1420, 'Sound speed in Titan lake liquid must be 1420 m/s at 94 K');
  assert.equal(m.surfacePressureAtm, 1.45, 'Titan surface pressure must be 1.45 atm');
  assert.equal(m.polar, false, 'Liquid hydrocarbons are a non-polar solvent: pH is meaningless there');

  // Гидростатика: у поверхности уже 1.45 атм, а градиент в 11 раз слабее воды
  assert(Math.abs(F.pressureAtmAt(titan, 0) - 1.45) < 1e-9, 'Methane sea must read 1.45 atm at the surface');
  const at300 = F.pressureAtmAt(titan, 300);
  assert(Math.abs(at300 - (1.45 + 300 / 113.6)) < 1e-6, `300 m of methane must read ~4.09 atm, got ${at300}`);
  assert(at300 < F.pressureAtmAt({}, 300) / 7,
    `Methane hydrostatic gradient must be far weaker than water (${at300.toFixed(2)} vs ${F.pressureAtmAt({}, 300).toFixed(2)} atm)`);

  // Плавучесть: при той же массе сила Архимеда в метане почти вдвое ниже,
  // а с учётом тяжести Титана — на порядок ниже земной
  const buoy = F.buoyancyRatio(titan);
  assert(Math.abs(buoy - (660 * 1.352) / (1025 * 9.81)) < 1e-9, `Buoyancy ratio mismatch: ${buoy}`);
  assert(buoy < 0.1 && buoy > 0.05, `Titan buoyancy must be about 9 % of Earth ocean, got ${buoy.toFixed(3)}`);
  assert(Math.abs(F.buoyancyRatio({}) - 1) < 1e-9, 'Water buoyancy ratio must be exactly 1');

  // Акустика: скорость звука и задержка прихода
  assert.equal(F.soundSpeedOf(titan), 1420);
  assert(Math.abs(F.delayMs(titan, 1420) - 1000) < 1e-6, '1420 m of methane must delay sound by exactly 1000 ms');
  assert(F.delayMs(titan, 500) > F.delayMs({}, 500), 'Slower medium must delay sound longer');

  /* Регрессия: Европа считалась через pressureScale и обязана считать так же.
     На 25 км разница в третьем знаке даёт единицы атмосфер. */
  const europa = OC.Biomes.get('europa_ocean');
  const expectedEuropa = 1 + (25000 / 10.08) * europa.pressureScale;
  assert(Math.abs(F.pressureAtmAt(europa, 25000) - expectedEuropa) < 1e-6,
    `Europa hydrostatic scale must survive the Fluid refactor (${F.pressureAtmAt(europa, 25000)} vs ${expectedEuropa})`);

  /* Страховка от отката: формулы давления обязаны читать среду из OC.Fluid,
     иначе Титан снова начнёт считать как вода. */
  const samplesSrc = fs.readFileSync(path.join(ROOT, 'src', 'engine', 'rov', 'samples.js'), 'utf8');
  const telemetrySrc = fs.readFileSync(path.join(ROOT, 'src', 'ui', 'telemetry.js'), 'utf8');
  assert(samplesSrc.includes('OC.Fluid.pressureAtmAt'), 'CTD water column must take pressure from OC.Fluid');
  assert(telemetrySrc.includes('OC.Fluid.pressureAtmAt'), 'Sub HUD pressure readout must take pressure from OC.Fluid');
  assert(samplesSrc.includes("waterType: isMethane ? 'methane'"), 'CTD must classify a methane sea as non-water');
  assert(groupSource('engine/').includes('1025'), 'Water reference values must stay documented in the fluid registry');

  console.log(`   Fluid physics: вода 10.08 м/атм, метан Титана 113.6 м/атм (300 м → ${at300.toFixed(2)} атм), плавучесть ${(buoy * 100).toFixed(1)} % земной, c = ${m.soundSpeed} м/с.`);
}
