/* ================= НАВИГАЦИЯ: АВТО-ТУР ПО ОСТАНОВКАМ БИОМА ================= */
/* Состояние тура (шаг, прогресс, пауза), плавный переход между ногами маршрута
   и уведомления UI. Работает с общим состоянием из navigation/state.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const T = THREE;
  const { state, getBiome, _fwd, _tourStateOut } = OC._NavState;

  function buildTourState() {
    const legs = (getBiome() && getBiome().tourLegs) || [];
    const total = legs.length;
    const idx = total ? (state.tourIdx % total) : 0;
    const leg = total ? legs[idx] : null;
    const dur = (leg && leg.duration) || 9;
    _tourStateOut.active = state.mode === 'tour' && total > 0;
    _tourStateOut.paused = !!state.tourPaused;
    _tourStateOut.idx = idx;
    _tourStateOut.total = total;
    _tourStateOut.progress = total ? OC.clamp(state.tourT / dur, 0, 1) : 0;
    _tourStateOut.leg = leg;
    return _tourStateOut;
  }

  function emitTourChange() {
    if (state.onTourChange) state.onTourChange(buildTourState());
  }

  function captureTourOrigin() {
    state.tourFromPos.copy(state.pos);
    _fwd.set(
      Math.sin(state.yaw) * Math.cos(state.pitch),
      Math.sin(state.pitch),
      Math.cos(state.yaw) * Math.cos(state.pitch)
    ).normalize();
    state.tourFromLook.copy(state.pos).addScaledVector(_fwd, 28);
  }

  function startTourStep(idx, fromCurrent) {
    const legs = (getBiome() && getBiome().tourLegs) || [];
    if (!legs.length) return;
    const n = legs.length;
    const nextIdx = ((idx % n) + n) % n;
    if (fromCurrent) {
      captureTourOrigin();
    } else {
      const prev = legs[(nextIdx - 1 + n) % n];
      state.tourFromPos.set(prev.pos[0], prev.pos[1], prev.pos[2]);
      state.tourFromLook.set(prev.look[0], prev.look[1], prev.look[2]);
    }
    state.tourIdx = nextIdx;
    state.tourT = 0;
    const leg = legs[nextIdx];
    if (state.onTourToast && leg) state.onTourToast(leg.title);
    emitTourChange();
  }

  OC._NavTour = { buildTourState, emitTourChange, captureTourOrigin, startTourStep };
})(window.OC);
