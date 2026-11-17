// N) Verify Direction 8: Ecological Lab & Reef Stress-Test (Coral Bleaching GLSL, Acidification, Eutrophication, Currents & Recovery)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, floraProtos, stubCanvas } = ctx;
  assert(OC.EcoLab && typeof OC.EcoLab.applyPreset === 'function' && typeof OC.EcoLab.update === 'function', 'OC.EcoLab API required');
  assert(floraProtos.coral_staghorn.mat && floraProtos.coral_staghorn.mat !== floraProtos.wreck_anchor.mat, 'Corals and non-living artifacts must use separate materials (bleachable vs non-bleachable)');
  assert.equal(OC.EcoLab.getPresets().length, 4, 'EcoLab must expose 4 presets');

  const labGbr = OC.Biomes.setActive('great_barrier_reef');
  OC.EcoLab.reset();
  let labSt = OC.EcoLab.getState();
  assert(labSt.healthIndex > 90 && labSt.bleaching < 0.05, 'Initial EcoLab state must be healthy');

  // Trigger El Nino heatwave at 20x timelapse and observe bleaching + health decline
  OC.EcoLab.applyPreset('heatwave');
  OC.EcoLab.setParam('timeScale', 20);
  for (let i = 0; i < 40; i++) labSt = OC.EcoLab.update(0.1, labGbr, 0.95);
  assert(labSt.bleaching > 0.55, `Expected significant coral bleaching under heatwave, got ${labSt.bleaching.toFixed(2)}`);
  assert(labSt.healthIndex < 72, `Expected healthIndex drop under heatwave, got ${labSt.healthIndex.toFixed(1)}`);
  assert(OC.EcoLab.getHistoryCount() > 5, 'EcoLab circular history buffer must accumulate samples');

  // Switch to upwelling recovery and verify coral pigment recovery
  const bleachPeak = labSt.bleaching;
  OC.EcoLab.applyPreset('upwelling');
  for (let i = 0; i < 65; i++) labSt = OC.EcoLab.update(0.1, labGbr, 0.95);
  assert(labSt.bleaching < bleachPeak - 0.35, `Expected coral recovery under upwelling, peak=${bleachPeak.toFixed(2)} now=${labSt.bleaching.toFixed(2)}`);
  assert(labSt.healthIndex > 85, `Expected healthIndex recovery > 85, got ${labSt.healthIndex.toFixed(1)}`);

  // Test acidification + algal bloom hypoxia preset
  OC.EcoLab.applyPreset('acid_hypoxia');
  for (let i = 0; i < 35; i++) labSt = OC.EcoLab.update(0.1, labGbr, 0.4);
  assert(labSt.turbidityAdd > 0.005 && labSt.algalTint > 0.4, 'acid_hypoxia must increase water turbidity & algal tint');
  assert(labSt.dissolvedO2 < 5.5 && labSt.calcification < 55 && labSt.fishActivity < 0.95, 'acid_hypoxia must suppress O2, calcification & fishActivity');

  // Test EcoLab chart rendering & clean reset
  OC.EcoLab.drawChart(stubCanvas);
  OC.EcoLab.reset();
  assert(OC.EcoLab.getState().bleaching === 0 && OC.EcoLab.getState().currentMult === 1.0, 'EcoLab.reset() must restore baseline');

  console.log(`   Direction 8 Ecological Lab (coral bleaching peak=${bleachPeak.toFixed(2)}, upwelling recovery, hypoxia/algal optics & chart) verified.`);
}
