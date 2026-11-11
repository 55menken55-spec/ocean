/* ================= НАВИГАЦИЯ: ГЕЙМПАД И МЁРТВЫЕ ЗОНЫ СТИКОВ ================= */
/* Опрос Gamepad API: стики движения/обзора, триггеры вертикали, boost и
   одиночные нажатия кнопок действий (фото, сонар, фонарь, кино). */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const { state } = OC._NavState;

  function deadzone(v, dz) {
    if (!v || Math.abs(v) < dz) return 0;
    return (v - Math.sign(v) * dz) / (1 - dz);
  }

  function pollGamepad(dt, gpOut) {
    gpOut.moveX = 0; gpOut.moveY = 0; gpOut.vertZ = 0; gpOut.boost = false;
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
    const pads = navigator.getGamepads();
    let pad = null;
    if (pads) {
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].connected) { pad = pads[i]; break; }
      }
    }
    if (!pad) {
      state.gamepadActive = false;
      state.gamepadBoost = false;
      return false;
    }
    state.gamepadActive = true;
    const ax = pad.axes || [];
    const btns = pad.buttons || [];

    const lx = deadzone(ax[0] || 0, 0.15);
    const ly = deadzone(ax[1] || 0, 0.15);
    const rx = deadzone(ax[2] || 0, 0.14);
    const ry = deadzone(ax[3] || 0, 0.14);

    if (rx || ry) {
      if (state.mode === 'cinema') {
        state.cinemaYawOffset -= rx * 1.3 * dt;
        state.cinemaPitchOffset = OC.clamp(state.cinemaPitchOffset - ry * 0.95 * dt, -0.7, 0.7);
      } else {
        state.targetYaw -= rx * 2.1 * dt;
        state.targetPitch = OC.clamp(state.targetPitch + (state.mode === 'orbit' ? ry : -ry) * 1.65 * dt, -1.2, 1.2);
      }
    }

    const rTrig = btns[7] ? btns[7].value : 0;
    const lTrig = btns[6] ? btns[6].value : 0;
    const rBump = btns[5] && btns[5].pressed ? 1 : 0;
    const lBump = btns[4] && btns[4].pressed ? 1 : 0;
    gpOut.moveX = lx;
    gpOut.moveY = -ly; // вперёд на стике = отрицательный Y
    gpOut.vertZ = Math.max(rTrig, rBump) - Math.max(lTrig, lBump);
    gpOut.boost = !!(btns[0] && btns[0].pressed);
    state.gamepadBoost = gpOut.boost;

    // Обработка одиночных нажатий кнопок действий (A/B/X/Y/Start)
    const map = [
      [0, 'photo'],
      [1, 'sub'],
      [2, 'sonar'],
      [3, 'flashlight'],
      [9, 'cinema']
    ];
    for (let i = 0; i < map.length; i++) {
      const idx = map[i][0], action = map[i][1];
      const down = !!(btns[idx] && btns[idx].pressed);
      if (down && !state.prevGpBtns[idx] && state.onGamepadAction) {
        state.onGamepadAction(action);
      }
      state.prevGpBtns[idx] = down;
    }
    return true;
  }

  OC._NavGamepad = { deadzone, pollGamepad };
})(window.OC);
