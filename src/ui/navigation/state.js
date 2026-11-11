/* ================= НАВИГАЦИЯ: ОБЩЕЕ СОСТОЯНИЕ И ГРАНИЦЫ МИРА ================= */
/* Единый объект состояния камеры (режим, позиция, углы, тур, кино, glide),
   разделяемый модулями navigation/*, и удержание камеры в безопасных границах
   биома (дно + запас, брайниклы, свод пещер, границы карты). */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const keys = Object.create(null);
  const _fwd = new T.Vector3();
  const _right = new T.Vector3();
  const _move = new T.Vector3();
  const _lookAt = new T.Vector3();
  const _curr = new T.Vector3();
  const _cinemaTarget = new T.Vector3();
  const _chaseGoal = new T.Vector3();
  const _gpOut = { moveX: 0, moveY: 0, vertZ: 0, boost: false };
  const _tourStateOut = { active: false, paused: false, idx: 0, total: 0, progress: 0, leg: null };

  const state = {
    mode: 'swim', // 'swim' | 'orbit' | 'tour' | 'cinema'
    pos: new T.Vector3(),
    vel: new T.Vector3(),
    yaw: 2.25,
    pitch: -0.14,
    targetYaw: 2.25,
    targetPitch: -0.14,
    swimSpeed: 18,
    inBrine: false,
    inHalocline: false,
    // Вид от 3-го лица за аппаратом ROV
    rovView: false,
    chasePos: new T.Vector3(),
    chaseInited: false,
    // Орбита
    orbitTarget: new T.Vector3(),
    orbitDist: 42,
    orbitTargetDist: 42,
    // Авто-тур
    tourIdx: 0,
    tourT: 0,
    tourPaused: false,
    tourFromPos: new T.Vector3(),
    tourFromLook: new T.Vector3(),
    // Кино-режим (круизный пролёт)
    cinemaCenter: new T.Vector3(),
    cinemaPhase: 0,
    cinemaYawOffset: 0,
    cinemaPitchOffset: 0,
    // Плавный перелёт к точке (Minimap / Landmark)
    glide: null,
    // Виртуальный тач-джойстик и геймпад
    virtX: 0,
    virtY: 0,
    virtZ: 0,
    gamepadActive: false,
    gamepadBoost: false,
    prevGpBtns: [false, false, false, false, false, false, false, false, false, false],
    // Ввод
    dragging: false,
    lastX: 0,
    lastY: 0,
    pointerMoved: 0,
    pinchDist: 0,
    onPick: null,
    onModeChange: null,
    onTourToast: null,
    onTourChange: null,
    onGamepadAction: null
  };

  let biomeRef = null;
  let canvasRef = null;
  const getBiome = () => biomeRef;
  const setBiomeRef = (b) => { biomeRef = b; };
  const getCanvas = () => canvasRef;
  const setCanvas = (c) => { canvasRef = c; };

  function clampPosition(p) {
    const bound = (biomeRef.worldRadius || 1200) - 30;
    p.x = OC.clamp(p.x, -bound, bound);
    p.z = OC.clamp(p.z, -bound, bound);
    const fl = biomeRef.getHeight(p.x, p.z);
    let minY = fl + 1.65;
    if (biomeRef && biomeRef.getBrineSurfaceAt) {
      const brine = biomeRef.getBrineSurfaceAt(p.x, p.z);
      if (brine) minY = Math.max(minY, brine.level - 1.1);
    }
    let maxY = (biomeRef && biomeRef.maxCamY !== undefined) ? biomeRef.maxCamY : 16.0;
    if (biomeRef && biomeRef.getCeilingHeight) {
      const ceil = biomeRef.getCeilingHeight(p.x, p.z);
      if (ceil < 35.0) maxY = Math.min(maxY, ceil - 1.75);
    }
    if (maxY < minY) maxY = minY;
    p.y = OC.clamp(p.y, minY, maxY);
  }

  OC._NavState = {
    state, keys, _fwd, _right, _move, _lookAt, _curr, _cinemaTarget, _chaseGoal,
    _gpOut, _tourStateOut, getBiome, setBiomeRef, getCanvas, setCanvas, clampPosition
  };
})(window.OC);
