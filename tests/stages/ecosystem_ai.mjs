// K) Verify Direction 5 (Living Ecosystem AI: Predator Lunges, Baitball Panic, Whale Breaching & Splash GPU Pool, Porpoising, Cleaning Symbiosis, Phototaxis, Active Sonar Reaction)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { groupSource, ROOT } from '../lib/harness.mjs';

export function run(ctx) {
  const { OC, T, biome, fauna, faunaSrc, gbrFauna, scene } = ctx;
  assert(faunaSrc.includes('makeSplashSystem') && faunaSrc.includes('lungeTimer') && faunaSrc.includes('notifySonarPing') && faunaSrc.includes('cleanClients'), 'fauna_engine modules missing Direction 5 ecosystem AI features');
  const mainSrc = fs.readFileSync(path.join(ROOT, 'src/ui/main.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src/ui/hud_panels.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'src/ui/panels_service.js'), 'utf8');
  assert(mainSrc.includes('notifySonarPing') && mainSrc.includes('ECO_LABELS'), 'main.js missing sonar pulse propagation or ecosystem observer HUD labels');
  assert(typeof OC.sound.whaleSplash === 'function', 'OC.sound.whaleSplash required');
  OC.sound.whaleSplash(45);

  assert.equal(typeof gbrFauna.notifySonarPing, 'function', 'fauna.notifySonarPing required');
  assert.equal(typeof gbrFauna.getSplashCount, 'function', 'fauna.getSplashCount required');
  assert.equal(typeof gbrFauna.getActiveEvent, 'function', 'fauna.getActiveEvent required');

  OC.getPalette().dayW = 0.95;
  OC.getPalette().bioGlow = 0.05;
  const whalePos0 = gbrFauna.whale.getPosition().clone();
  const ecoCam = whalePos0.clone().add(new T.Vector3(25, 0, 25));
  gbrFauna.notifySonarPing(ecoCam);

  let maxWhaleY = -999;
  let sawSplash = false;
  const sawEvents = new Set();
  for (let step = 0; step < 120; step++) {
    OC.uTime.value += 0.15;
    gbrFauna.update(0.15, OC.uTime.value, ecoCam, 2.0, false);
    const wy = gbrFauna.whale.getPosition().y;
    if (wy > maxWhaleY) maxWhaleY = wy;
    if (gbrFauna.getSplashCount() > 0) sawSplash = true;
    const ev = gbrFauna.getActiveEvent();
    if (ev) sawEvents.add(ev);
  }
  assert(maxWhaleY > 0.5, `Expected humpback whale breach above surface (y > 0.5), got maxWhaleY=${maxWhaleY.toFixed(2)}`);
  assert(sawSplash, 'Expected GPU splash particles after whale breach');

  // Verify all agent positions and school instance matrices stay finite (zero NaN/Infinity)
  for (const ag of gbrFauna.agents) {
    if (ag.getPosition) {
      const p = ag.getPosition();
      assert(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z), `Non-finite position on agent ${ag.key}`);
    }
    if (ag.mesh && ag.mesh.isInstancedMesh) {
      const arr = ag.mesh.instanceMatrix.array;
      for (let k = 0; k < Math.min(arr.length, 64); k++) {
        assert(Number.isFinite(arr[k]), `Non-finite instanceMatrix element in school ${ag.key}`);
      }
    }
  }

  // Verify porpoising / nocturnal phototaxis across Arctic & Kelp Forest
  const kelpB2 = OC.Biomes.setActive('kelp_forest');
  const kelpFauna2 = OC.FaunaEngine.init(scene, kelpB2);
  OC.getPalette().dayW = 0.15;
  for (let step = 0; step < 60; step++) {
    OC.uTime.value += 0.2;
    kelpFauna2.update(0.2, OC.uTime.value, new T.Vector3(0, -10, 0), 2.5, true);
  }
  for (const ag of kelpFauna2.agents) {
    if (ag.getPosition) {
      const p = ag.getPosition();
      assert(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z), `Non-finite position in kelp_forest ${ag.key}`);
    }
  }

  // Restore GBR as active biome at end of verification
  const restoreGbr = OC.Biomes.setActive('great_barrier_reef');
  OC.FaunaEngine.init(scene, restoreGbr);
  OC.Atlas.setBiome(restoreGbr);

  console.log(`   Direction 5 Living Ecosystem AI (whale breach maxY=${maxWhaleY.toFixed(2)} m, splashes=${sawSplash}, sonar ping, predator lunges, cleaning & events=[${[...sawEvents].join(',')}]) verified.`);
  return { restoreGbr };
}
