// A) Verify bathymetry & 6 zones
import assert from 'node:assert/strict';

export function run(ctx) {
  const { biome } = ctx;
  const seenZones = new Set();
  let minH = Infinity, maxH = -Infinity;
  for (let x = -1100; x <= 1100; x += 25) {
    for (let z = -600; z <= 600; z += 100) {
      const h = biome.getHeight(x, z);
      assert(Number.isFinite(h), `Height must be finite at (${x}, ${z})`);
      minH = Math.min(minH, h);
      maxH = Math.max(maxH, h);
      const zone = biome.getZoneAt(x, h, z);
      assert(zone && zone.id, `Zone must exist at (${x}, ${z})`);
      seenZones.add(zone.id);
      const opt = biome.getOpticalProfile(x, h + 2, z, 1.0);
      assert(Number.isFinite(opt.fogDensity) && opt.fogDensity > 0, 'fogDensity valid');
    }
  }
  assert.equal(seenZones.size, 6, `Expected all 6 GBR zones, got: ${[...seenZones].join(', ')}`);
  assert(maxH > 1.5, `Expected emergent cay/shore > +1.5 m, got ${maxH}`);
  assert(minH < -130, `Expected abyssal floor < -130 m, got ${minH}`);
  console.log(`   Bathymetry verified: ${minH.toFixed(1)} m .. +${maxH.toFixed(1)} m across ${seenZones.size} zones.`);

  // B) Verify landmarks & tour legs
  const sp = biome.spawn.pos;
  assert(sp[1] > biome.getHeight(sp[0], sp[2]) + 1.5, 'Spawn above floor');
  for (const lm of biome.landmarks) {
    assert(lm.y > biome.getHeight(lm.x, lm.z) + 1.2, `Landmark ${lm.id} above floor`);
  }
  for (let i = 0; i < biome.tourLegs.length; i++) {
    const leg = biome.tourLegs[i];
    assert(leg.pos[1] > biome.getHeight(leg.pos[0], leg.pos[2]) + 1.2, `Tour leg ${i} above floor`);
  }
  return { sp };
}
