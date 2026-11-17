/* ================= НАВИГАЦИЯ: ЯДРО МИРА И КУРС ДОМОЙ ================= */
/* Мир без края: рельеф, флора и фауна стримятся вокруг игрока на любом
   удалении, а маяки, миссии и процент исследования живут в ядре — круге
   worldRadius вокруг мирового начала. Мини-карта показывает окно ±1200 м
   вокруг аппарата, поэтому стоит уплыть на пару километров — и ядро уезжает
   за её край: непонятно ни где оно, ни как далеко, ни как вернуться.

   Модуль отвечает на три вопроса и не знает ни про DOM, ни про сцену:
   где ядро, как далеко его край и куда лежит курс на ближайший маяк. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const DIRS = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];

  /* Название румба по пеленгу в градусах (0° — север, сторона −Z). */
  function compassName(deg) {
    const d = ((deg % 360) + 360) % 360;
    return DIRS[Math.round(d / 45) % 8];
  }

  /* Пеленг из мировой точки pos на мировую точку (x, z). */
  function bearingTo(pos, x, z) {
    const deg = Math.atan2(x - pos.x, -(z - pos.z)) * 180 / Math.PI;
    return ((Math.round(deg) % 360) + 360) % 360;
  }

  /* Ближайший ориентир ядра: это и есть цель возврата — маяк, у которого
     есть своя глубина, курс и название для подсказки. */
  function nearestLandmark(biome, pos, out) {
    const list = (biome && biome.landmarks) || [];
    if (!list.length) return null;
    let best = null;
    for (const lm of list) {
      const d = Math.hypot(lm.x - pos.x, lm.z - pos.z);
      if (!best || d < best.d) best = { lm, d };
    }
    if (!best) return null;
    const o = out || {};
    o.id = best.lm.id;
    o.name = best.lm.name;
    o.x = best.lm.x;
    o.y = best.lm.y;
    o.z = best.lm.z;
    o.yaw = best.lm.yaw;
    o.pitch = best.lm.pitch;
    o.distM = best.d;
    o.bearingDeg = bearingTo(pos, best.lm.x, best.lm.z);
    return o;
  }

  /* Ядро — круг worldRadius вокруг мирового начала. edgeM — сколько ещё
     плыть до его границы; у самого начала координат это ноль. */
  function info(biome, pos, out) {
    /* Свежий объект, если вызывающий не дал свой: результат живёт дольше
       вызова (его читают и в HUD, и в мини-карте), а общий синглтон
       перезаписывался бы следующим запросом. */
    const o = out || {};
    const R = (biome && biome.worldRadius) || 1200;
    const centerM = Math.hypot(pos.x, pos.z);
    o.centerM = centerM;
    o.edgeM = Math.max(0, centerM - R);
    o.outside = centerM > R;
    o.bearingDeg = bearingTo(pos, 0, 0);
    o.nearest = nearestLandmark(biome, pos);
    return o;
  }

  /* Строка для телеметрии: «4.2 км · СЗ» или короткое «в ядре». */
  function format(o) {
    if (!o || !o.outside) return 'в ядре';
    const dist = o.edgeM >= 1000 ? ((o.edgeM / 1000).toFixed(1) + ' км') : (Math.round(o.edgeM) + ' м');
    return dist + ' · ' + compassName(o.bearingDeg);
  }

  /* Цель кнопки «К ядру»: ближайший ориентир, а если их нет — точка старта.
     Возвращает объект, готовый для Navigation.flyTo. */
  function homeTarget(biome, pos, out) {
    const lm = nearestLandmark(biome, pos, out);
    if (lm) return lm;
    const sp = (biome && biome.spawn && biome.spawn.pos) ? biome.spawn.pos : [0, -8, 0];
    const o = out || {};
    o.id = 'spawn';
    o.name = 'точка старта';
    o.x = sp[0];
    o.y = sp[1];
    o.z = sp[2];
    o.yaw = (biome && biome.spawn && biome.spawn.yaw) || 0;
    o.pitch = (biome && biome.spawn && biome.spawn.pitch) || 0;
    o.distM = Math.hypot(o.x - pos.x, o.z - pos.z);
    o.bearingDeg = bearingTo(pos, o.x, o.z);
    return o;
  }

  OC._NavCore = { info, format, compassName, bearingTo, nearestLandmark, homeTarget };
})(window.OC);
