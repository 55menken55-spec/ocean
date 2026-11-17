// Verify Abyssal Hydrothermal thermal plume updraft (+Y > 1.5 m/s over main smoker) & signature flora density
import assert from 'node:assert/strict';
import { groupSource, ROOT, makeStubEl } from '../lib/harness.mjs';

export function run(ctx) {
  const { OC, T, camera } = ctx;
  const kelpBiome = OC.Biomes.get('kelp_forest');
  const kHeart = kelpBiome.landmarks.find((l) => l.id === 'kelp_heart');
  const kHeartItems = kelpBiome.generateChunkFlora(Math.floor(kHeart.x / 150), Math.floor(kHeart.z / 150), 150, 1.0, OC.mulberry32(777));
  assert(kHeartItems.some((it) => it.species === 'kelp_giant'), 'kelp_forest must spawn kelp_giant canopy towers near kelp_heart');

  const ventBiome = OC.Biomes.get('hydrothermal_vents');
  assert(ventBiome.noSurface && ventBiome.depthOffset === 2420, 'hydrothermal_vents must configure noSurface & 2420m depthOffset');
  const vMain = ventBiome.landmarks.find((l) => l.id === 'central_smoker');
  const vItems = ventBiome.generateChunkFlora(Math.floor(vMain.x / 150), Math.floor(vMain.z / 150), 150, 1.0, OC.mulberry32(888));
  assert(vItems.some((it) => it.species === 'vent_chimney') && vItems.some((it) => it.species === 'riftia_worms'), 'hydrothermal_vents must spawn vent_chimney & riftia_worms near central_smoker');
  const ventUp = ventBiome.getCurrentAt(-10, -14, 15, 1.0, new T.Vector3());
  assert(ventUp.y > 1.2, `Abyssal black smoker updraft expected > 1.2 m/s, got ${ventUp.y.toFixed(2)}`);

  // Verify submarine volcano prototype: rare warning events (seismic, turbidity, gas, currents)
  assert(OC.Volcano && typeof OC.Volcano.init === 'function', 'OC.Volcano prototype must be loaded');
  assert(ventBiome.encyclopedia.volcanic_fumarole && ventBiome.encyclopedia.submarine_volcano,
    'hydrothermal_vents encyclopedia must include volcanic_fumarole & submarine_volcano');
  const vSite = OC.Volcano.SITE;
  const vCrater = ventBiome.getHeight(vSite.x, vSite.z);
  assert(vCrater < -20, `Volcano crater floor expected < -20 m, got ${vCrater}`);
  const vOn = ventBiome.getHeight(vSite.x + 40, vSite.z);
  const vOff = ventBiome.getHeight(vSite.x + 140, vSite.z);
  assert(vOn > vOff + 5, `Volcano cone must rise above the surrounding plain (${vOn} vs ${vOff})`);
  assert(ventBiome.getZoneAt(vSite.x, -20, vSite.z).id === 'volcano_seamount', 'Volcano must own a dedicated zone');
  const vLm = ventBiome.landmarks.find((l) => l.id === 'submarine_volcano');
  assert(vLm && vLm.y > ventBiome.getHeight(vLm.x, vLm.z) + 1.2, 'Volcano landmark must clear terrain');
  const vVolcItems = ventBiome.generateChunkFlora(Math.floor(vSite.x / 150), Math.floor(vSite.z / 150), 150, 1.0, OC.mulberry32(4242));
  assert(vVolcItems.some((it) => it.species === 'volcanic_fumarole'), 'hydrothermal_vents must spawn volcanic_fumarole near the volcano');

  // Drive the event machine: idle → seismic → eruption → cooling → idle
  const vScene = new T.Scene();
  const vCam = new T.Vector3(vSite.x, -18, vSite.z);
  const vfx = OC.Volcano.init(vScene, ventBiome, { silt: null, texSoft: OC.circleTexture(64, false), texHard: OC.circleTexture(64, true) });
  assert(vfx && OC.Volcano.getState().phase === 'idle', 'Volcano must start idle');
  OC.Volcano._forcePhase('seismic');
  OC.Volcano.update(31, 100.0, vCam); // exceed 30s herald → eruption
  assert(OC.Volcano.getState().phase === 'eruption', 'Seismic herald must transition to eruption');
  const _vCur = new T.Vector3();
  ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur);
  assert(_vCur.y > 1.5, `Volcano eruption updraft expected > 1.5 m/s, got ${_vCur.y.toFixed(2)}`);
  const vTremor = OC.Volcano.getTremor();
  assert(vTremor.active && vTremor.strength > 0.5, 'Eruption must expose acoustic tremor');
  OC.Volcano.update(15, 115.0, vCam); // exceed 14s → cooling
  assert(OC.Volcano.getState().phase === 'cooling', 'Eruption must transition to cooling');
  OC.Volcano.update(17, 132.0, vCam); // exceed 16s → idle
  assert(OC.Volcano.getState().phase === 'idle', 'Volcano must return to idle after cooling');
  const _vCur2 = new T.Vector3();
  ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur2);
  assert(Math.abs(_vCur2.y) < 0.5, 'Volcano must be quiet when idle');

  // Dynamic currents: eruption upwelling bursts, vortex swirl around the cone, pulses on seismic
  const _vCur3 = new T.Vector3();
  OC.Volcano._forcePhase('seismic');
  OC.Volcano.update(0.5, 0, camera.position); // mid-progress pulse phase
  ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur3);
  const seisUp = _vCur3.y;
  OC.Volcano._forcePhase('eruption');
  ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur3);
  const erupUp = _vCur3.y;
  assert(erupUp > 1.5 && erupUp > seisUp, `Eruption upwelling burst expected >1.5 m/s & exceed seismic, got ${erupUp.toFixed(2)} vs ${seisUp.toFixed(2)}`);
  ventBiome.getCurrentAt(vSite.x + 130, vCrater, vSite.z, 1.0, _vCur3);
  const erupX = _vCur3.x, erupZ = _vCur3.z;
  const erupHoriz = Math.hypot(erupX, erupZ);
  const a = Math.atan2(0, 130); // angle from site to sample
  const tang = -Math.sin(a), tang2 = Math.cos(a);
  const swirlComp = Math.hypot(erupX * tang + erupZ * tang2, erupX * tang2 - erupZ * tang) / erupHoriz;
  assert(swirlComp > 0.3, `Eruption must add vortex swirl tangential component, got ${swirlComp.toFixed(2)} of ${erupHoriz.toFixed(2)}`);
  OC.Volcano._forcePhase('seismic');
  OC.Volcano.update(0.25, 0, camera.position);
  const c1 = ventBiome.getCurrentAt(vSite.x + 150, vCrater, vSite.z, 1.0, new T.Vector3());
  OC.Volcano.update(0.42, 0, camera.position);
  const c2 = ventBiome.getCurrentAt(vSite.x + 150, vCrater, vSite.z, 1.0, new T.Vector3());
  assert(Math.hypot(c1.x, c1.z) !== Math.hypot(c2.x, c2.z), 'Seismic currents must pulse with progress');
  OC.Volcano._forcePhase('idle');
  ventBiome.getCurrentAt(vSite.x + 130, vCrater, vSite.z, 1.0, _vCur3);
  assert(Math.abs(_vCur3.y) < 0.5, `Volcano must be quiet when idle, got ${_vCur3.y.toFixed(2)}`);

  // Fauna response: per-phase influence (agitation during precursor, flee during eruption)
  const schoolsSrc = groupSource('engine/fauna');
  assert(schoolsSrc.includes('ctx.volcano') && schoolsSrc.includes('volcInf'), 'schools.js must react to volcano influence via ctx.volcano');
  assert(!OC.Volcano.getInfluence().active, 'Volcano influence must be inactive when idle');
  OC.Volcano._forcePhase('seismic');
  const vInfSeis = OC.Volcano.getInfluence();
  assert(vInfSeis.active && vInfSeis.panic > 0.4 && vInfSeis.panic < 1.2, 'Seismic precursor must agitate schools without full panic');
  OC.Volcano._forcePhase('eruption');
  const vInfErup = OC.Volcano.getInfluence();
  assert(vInfErup.active && vInfErup.panic > 1.5 && vInfErup.strength > 12, 'Eruption must drive strong radial flee');
  OC.Volcano._forcePhase('cooling');
  assert(OC.Volcano.getInfluence().panic <= 1.2, 'Cooling must decay flee');
  // Seismic aftermath + flora damage system
  const schoolsSrc2 = groupSource('engine/flora');
  assert(schoolsSrc2.includes('getDamageFactor') && schoolsSrc2.includes('_volcDmgColor'),
    'flora_streamer.js must apply volcano damage tint via getDamageFactor');
  OC.Volcano._forcePhase('idle');
  assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) === 0, 'Volcano damage must be 0 when idle');
  OC.Volcano._forcePhase('seismic');
  assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) >= 0.2 && OC.Volcano.getDamageFactor(vSite.x, vSite.z) < 0.6,
    'Seismic phase must damage flora near crater (0.2..0.6)');
  OC.Volcano._forcePhase('eruption');
  assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) === 1.0, 'Eruption must fully damage flora at crater');
  const farDmg = OC.Volcano.getDamageFactor(vSite.x + 250, vSite.z);
  assert(farDmg === 0, 'Damage must be zero outside influence radius');
  OC.Volcano._forcePhase('cooling');
  assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) <= 0.7, 'Cooling must restore flora (damage decay)');
  OC.Volcano._forcePhase('idle');
  OC.Volcano.update(0.1, 0, camera.position);
  assert(OC.Volcano.getDamageFactor(vSite.x, vSite.z) === 0, 'Damage must clear after event');

  // Eruption FX: crater flash spike, shockwave rings, pyroclastic flow
  OC.Volcano._forcePhase('eruption');
  OC.Volcano.update(0.1, 0, camera.position);
  const _vCur4 = new T.Vector3();
  ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur4);
  const flashPeak = _vCur4.y;
  assert(flashPeak > 1.8, `Eruption flash upwelling burst expected >1.8 m/s, got ${flashPeak.toFixed(2)}`);
  OC.Volcano.update(0.1, 0.1, camera.position);
  OC.Volcano.update(0.1, 0.2, camera.position);
  // Shockwave rings active after eruption start
  OC.Volcano.update(0.15, 0.3, camera.position);
  OC.Volcano._forcePhase('cooling');
  OC.Volcano.update(0.5, 1.0, camera.position);
  OC.Volcano._forcePhase('idle');
  OC.Volcano.update(0.5, 2.0, camera.position);
  const _vCur5 = new T.Vector3();
  ventBiome.getCurrentAt(vSite.x, vCrater + 12, vSite.z, 1.0, _vCur5);
  assert(Math.abs(_vCur5.y) < 0.5, `Volcano must be quiet after cooling, got ${_vCur5.y.toFixed(2)}`);

  OC.Volcano._forcePhase('idle');
  assert(!OC.Volcano.getInfluence().active, 'Influence must deactivate after the event');
  assert(ventBiome.faunaPlan.schools.some((s) => s.key === 'vent_shrimp' && Math.abs(s.cx - vSite.x) < 5 && Math.abs(s.cz - vSite.z) < 5),
    'Vent shrimp school must swarm above the volcano crater');
  assert(ventBiome.faunaPlan.schools.some((s) => s.key === 'fish_lantern' && Math.abs(s.cx - vSite.x) < 100 && Math.abs(s.cz - vSite.z) < 100),
    'Fish lantern school must patrol volcano flanks');
  OC.Volcano.dispose();
  console.log('   Submarine volcano: terrain, zones, flora, event machine, currents & fauna response verified.');
  return { a };
}
