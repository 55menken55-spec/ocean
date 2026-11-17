// V) Verify Step 5: Hydrophone & Live Waterfall FFT Spectrogram Bioacoustics
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T, a, fauna, galBiome, galFauna, galSp, getEl } = ctx;
  OC.Hydrophone.init(getEl('hydro-canvas'));
  assert(!OC.Hydrophone.isOpen(), 'Hydrophone starts closed by default');
  OC.Hydrophone.setOpen(true);
  assert(OC.Hydrophone.isOpen(), 'Hydrophone opens cleanly');

  // Check acoustic detection in Galapagos Upwelling near orca / penguins / fumaroles
  const galAgent = galFauna.agents.find((a) => a.key === 'orca' || a.key === 'galapagos_penguin' || a.key === 'ocean_sunfish');
  const galListenPos = galAgent && galAgent.getPosition ? galAgent.getPosition().clone().add(new T.Vector3(12, 2, 12)) : galSp;
  const galSources = galFauna.scanAcousticSources(galListenPos, 260);
  assert(galSources.length >= 1, `Galapagos acoustic scanner must find nearby fauna/geo sources, got ${galSources.length}`);

  const hGal = OC.Hydrophone.update(0.06, galBiome, galFauna, galListenPos, 0, 18, 0.25);
  assert(hGal.spectrumBins.length === 64, 'Hydrophone waterfall must compute 64 FFT frequency bins (0-4000 Hz)');
  assert(hGal.dbSPL > 85 && hGal.dbSPL < 175, `Hydrophone sound pressure level must be realistic dB re 1 uPa, got ${hGal.dbSPL}`);
  assert(hGal.dominantLabel && hGal.dominantLabel.length > 3, `Hydrophone must report acoustic label, got ${hGal.dominantLabel}`);

  // Verify active sonar ping spikes the 1340 Hz sonar bin cleanly on the waterfall
  OC.Hydrophone.notifySonarPing();
  const hSonar = OC.Hydrophone.update(0.05, galBiome, galFauna, galListenPos, 0, 18, 0.1);
  const bin1340 = Math.floor(1340 / (4000 / 64));
  assert(hSonar.spectrumBins[bin1340] > 0.75, `Sonar ping must spike 1340 Hz waterfall bin, got ${hSonar.spectrumBins[bin1340].toFixed(2)}`);
  assert(hSonar.dominantLabel.includes('1.34 кГц'), `Hydrophone peak label during sonar ping must reflect 1.34 kHz pulse, got ${hSonar.dominantLabel}`);

  // Let sonar flash decay over 0.5 s cleanly, then check shallow reef snapping shrimp chorus in GBR (< 24m)
  for (let k = 0; k < 6; k++) OC.Hydrophone.update(0.1, galBiome, null, galListenPos, 0, 18, 0.0);
  const gbrBiome = OC.Biomes.get('great_barrier_reef');
  const hShrimp = OC.Hydrophone.update(0.05, gbrBiome, null, new T.Vector3(0, -8, 0), 0, 8, 0.0);
  assert(hShrimp.dominantLabel.includes('щелкунов') || hShrimp.bandLabel.includes('кГц'), `Shallow reef hydrophone without agents must detect snapping shrimp chorus, got ${hShrimp.dominantLabel}`);

  OC.Hydrophone.listenPeak();
  OC.Hydrophone.setOpen(false);
  assert(!OC.Hydrophone.isOpen(), 'Hydrophone closes cleanly');
  console.log(`   Hydrophone & Live Waterfall FFT (${galSources.length} sources, ${hGal.dbSPL} dB, peak ${hGal.peakHz} Hz "${hGal.dominantLabel}") verified.`);
  return { gbrBiome };
}
