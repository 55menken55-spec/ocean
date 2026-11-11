/* ================= РЕЕСТР ВОДНЫХ БИОМОВ ПЛАНЕТЫ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const registry = new Map();
  let activeBiome = null;

  OC.Biomes = {
    /**
     * Регистрация нового океанического / водного биома планеты.
     * Контракт биома:
     * - id, name, region, subtitle, worldRadius, chunkSize, seaLevel
     * - spawn: { pos: [x,y,z], yaw, pitch }
     * - zones: [{ id, name, shortName, color, depthLabel, tempC, description }]
     * - landmarks: [{ id, name, zoneId, x, y, z, yaw, pitch, description }]
     * - tourLegs: [{ pos, look, title, duration }]
     * - getHeight(x, z) -> number (Y=0 уровень моря)
     * - getZoneAt(x, y, z) -> zone
     * - getTerrainColor(x, y, z, outColor)
     * - getOpticalProfile(x, y, z, timeOfDay) -> { fogColor, fogDensity, causticStrength, rayStrength, bioGlow }
     * - generateChunkFlora(cx, cz, chunkSize, density, rng) -> Array<PlacementSpec>
     * - faunaPlan: конфигурация стай, хищников и мегафауны
     * - encyclopedia: { [key]: [title, latin, category, zoneLabel, depthLabel, desc] }
     */
    register(def) {
      if (!def || !def.id) throw new Error('Biome definition requires id');
      if (typeof def.getTemperatureAt === 'function' && !def.getTemperatureAt._seasonWrapped) {
        const baseTemperatureAt = def.getTemperatureAt;
        const seasonalTemperatureAt = function (x, depthM, zone) {
          const baseTemp = baseTemperatureAt.call(this, x, depthM, zone);
          const seasonalDelta = OC.Seasons ? OC.Seasons.getTemperatureDelta(this, depthM) : 0;
          return baseTemp + seasonalDelta;
        };
        seasonalTemperatureAt._seasonWrapped = true;
        def.getTemperatureAt = seasonalTemperatureAt;
      }
      registry.set(def.id, def);
      if (!activeBiome) activeBiome = def;
      return def;
    },
    get(id) {
      return registry.get(id) || null;
    },
    list() {
      return Array.from(registry.values());
    },
    setActive(id) {
      const b = registry.get(id);
      if (!b) throw new Error('Unknown biome: ' + id);
      activeBiome = b;
      return b;
    },
    getActive() {
      return activeBiome;
    }
  };

  /* Удобный общий доступ к текущей высоте дна */
  OC.floorH = function (x, z) {
    return activeBiome ? activeBiome.getHeight(x, z) : -20;
  };
})(window.OC);
