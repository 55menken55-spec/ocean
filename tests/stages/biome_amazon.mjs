// AA) Verify 10th Biome: Amazonia Flooded Forest Igapo (Rio Negro & Encontro das Aguas)
import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC } = ctx;
  const amzBiome = OC.Biomes.setActive('amazon_igapo');
  assert(amzBiome && !amzBiome.noSurface && amzBiome.minimapTheme === 'amazon', 'amazon_igapo biome must configure surface & amazon minimap theme');
  assert(amzBiome.zones.length === 5 && amzBiome.landmarks.length === 5 && amzBiome.tourLegs.length === 5, 'amazon_igapo must expose 5 zones, 5 landmarks and 5 tourLegs');
  const optBlack = amzBiome.getOpticalProfile(-40, -4, 40, 1.0);
  const optWhite = amzBiome.getOpticalProfile(360, -4, 0, 1.0);
  assert(optBlack.fogColor.r > optBlack.fogColor.b && optWhite.fogDensity > optBlack.fogDensity, 'amazon_igapo must contrast tannin Rio Negro blackwater vs turbid Solimoes whitewater confluence');
  const amzPrevList = ['pink_dolphin', 'arapaima', 'electric_eel', 'river_stingray', 'piranha', 'neon_tetra', 'angelfish', 'igapo_tree', 'victoria_lily', 'amazon_sword', 'sunken_log', 'driftwood_snag'];
  for (const k of amzPrevList) {
    assert(amzBiome.encyclopedia[k], `amazon_igapo encyclopedia missing key ${k}`);
    const pm = OC.FaunaEngine.createPreviewMesh(k, amzBiome);
    assert(pm && pm.children.length > 0, `amazon_igapo preview mesh failed for ${k}`);
    assert(OC.sound.getVoiceLabel(k).length > 4, `amazon_igapo voice label missing for ${k}`);
    OC.sound.playSpeciesVoice(k);
  }
  const ctdAmz = OC.ROV.runCtdCast(amzBiome, new T.Vector3(15, -10, 2), OC.EcoLab.getState());
  assert(ctdAmz && ctdAmz.surfaceTemp > 26 && ctdAmz.maxDepthM <= 30, `Amazon CTD cast mismatch: ${JSON.stringify(ctdAmz)}`);
  const resAmz = OC.Expedition.evaluateMissions(amzBiome, { zoneId: 'whitewater_confluence', depthM: 6, currentKnots: 0.9, dayW: 0.9, flashOn: false });
  assert(resAmz.list.find((m) => m.id === 'amz_confluence').done, 'amz_confluence mission must complete inside whitewater_confluence zone');
  console.log('   10th Biome "Амазония: Лес Игапо" (Rio Negro blackwater, Encontro das Aguas, Pink Dolphin, Arapaima, Electric Eel, Victoria amazonica) verified.');

  return { biome: amzBiome, ctd: ctdAmz };
}
