/* ================= ПРОСТРАНСТВО ФАУНЫ: ЛОКАЛЬНЫЕ КООРДИНАТЫ ↔ МИРОВЫЕ ================= */
/* Фауна считает себя в координатах сцены: Floating Origin держит камеру в
   начале координат, а рыбы лежат в instanceMatrix стай, которые не участвуют
   в переносе (userData.noFloatingOrigin). Рельеф же описывается в мировых
   координатах. Пока мир был кругом радиусом 1200 м, origin смещался редко и
   незаметно; в мире без края origin копит километры, и прямой вызов
   biome.getHeight(x, z) локальной точкой спрашивает дно на другом конце
   карты — рыбы повисают в сотнях метров над грунтом или уходят под него.

   Обёртка — это вид биома «глазами фауны»: все запросы с координатами
   переводятся из локальных в мировые, а высота дна возвращается в локальной
   вертикали (мировая минус origin.y). Остальные поля биома (id, глубина,
   энциклопедия, план фауны) читаются с прототипа без копирования. */
window.OC = window.OC || {};
OC._FaunaSpace = (function (OC) {
  'use strict';

  function originOrNull() {
    return (OC.FloatingOrigin && OC.FloatingOrigin.getOrigin) ? OC.FloatingOrigin.getOrigin() : null;
  }

  /* Возвращает объект, который отвечает на все запросы биома, но получает
     координаты в системе сцены. */
  function wrap(biome) {
    if (!biome) return biome;
    const view = Object.create(biome);

    view.getHeight = function (x, z) {
      const o = originOrNull();
      if (!o) return biome.getHeight(x, z);
      return biome.getHeight(x + o.x, z + o.z) - o.y;
    };

    if (typeof biome.getCeilingHeight === 'function') {
      view.getCeilingHeight = function (x, z) {
        const o = originOrNull();
        if (!o) return biome.getCeilingHeight(x, z);
        return biome.getCeilingHeight(x + o.x, z + o.z) - o.y;
      };
    }

    if (typeof biome.isCeilingOpen === 'function') {
      view.isCeilingOpen = function (x, z) {
        const o = originOrNull();
        if (!o) return biome.isCeilingOpen(x, z);
        return biome.isCeilingOpen(x + o.x, z + o.z);
      };
    }

    if (typeof biome.getIceMaskAt === 'function') {
      view.getIceMaskAt = function (x, z) {
        const o = originOrNull();
        if (!o) return biome.getIceMaskAt(x, z);
        return biome.getIceMaskAt(x + o.x, z + o.z);
      };
    }

    if (typeof biome.getZoneAt === 'function') {
      view.getZoneAt = function (x, y, z) {
        const o = originOrNull();
        if (!o) return biome.getZoneAt(x, y, z);
        return biome.getZoneAt(x + o.x, y + o.y, z + o.z);
      };
    }

    if (typeof biome.getCurrentAt === 'function') {
      view.getCurrentAt = function (x, y, z, time, out) {
        const o = originOrNull();
        if (!o) return biome.getCurrentAt(x, y, z, time, out);
        return biome.getCurrentAt(x + o.x, y + o.y, z + o.z, time, out);
      };
    }

    /* Признак вида: по нему тесты и отладка отличают обёртку от биома. */
    view.isFaunaSpaceView = true;
    return view;
  }

  return { wrap };
})(window.OC);
