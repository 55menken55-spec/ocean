/* ================= ПРОЦЕДУРНЫЙ ЗВУК ОКЕАНА (С УЧЁТОМ ЗОНЫ И ГЛУБИНЫ) ================= */
/* Точка входа: шина OС.sound создаётся в audio/core.js, синтез разложен по группам —
   audio/core.js (контекст, микс, мьют), audio/ambience.js (шум среды),
   audio/calls.js (мегафауна и гроза), audio/ui_sfx.js (сигналы интерфейса),
   audio/species_voice.js (голоса 221 вида). */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  OC.sound = OC._SoundState;
})(window.OC);
