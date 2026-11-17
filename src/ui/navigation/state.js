/* ================= НАВИГАЦИЯ: ОБЩЕЕ СОСТОЯНИЕ И ГРАНИЦЫ МИРА ================= */
/* Единый объект состояния камеры (режим, позиция, углы, тур, кино, glide),
   разделяемый модулями navigation/*, и удержание камеры в безопасных границах
   биома (дно + запас, брайниклы, свод пещер, границы карты).

   Система координат: state.pos — МИРОВАЯ точка (или координаты сцены, если
   аппарат ещё ни разу не уплывал далеко и origin нулевой). Камера же всегда
   стоит в локальных координатах сцены: Floating Origin держит её у начала,
   чтобы float32 не терял точность на километрах. Поэтому камера — величина
   производная: camera.position = state.pos − origin. Раньше было наоборот
   (state.pos считался локальным), и ежекадровый сдвиг origins раскручивал
   origin по километру за кадр: навигация перезаписывала camera.position из
   state.pos, а Floating Origin — сбрасывал его в ноль, не трогая state.pos.
   Мир при этом полз под игроком, а все запросы к биому (дно, зона, свод)
   уходили в точку старта. */
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

  /* Мировая точка → локальная (точка сцены). Камера, lookAt и любые объекты
     сцены обязаны стоять в локальных координатах: их переносит Floating
     Origin. state.pos и всё, что с ней сравнивается (маяки, зоны, карта), —
     в мировых. */
  function toLocal(p, out) {
    const o = (OC.FloatingOrigin && OC.FloatingOrigin.getOrigin) ? OC.FloatingOrigin.getOrigin() : null;
    if (!o) return out.copy(p);
    return out.set(p.x - o.x, p.y - o.y, p.z - o.z);
  }

  /* Планетарный мир: горизонтальный зажим по кругу worldRadius снят. Дальность
     обеспечивает Floating Origin (камера всегда около начала координат), а
     рельеф, флора и чанки стримятся вокруг игрока, поэтому край карты больше
     не останавливает аппарат — как в настоящем море.
     Ограничение остаётся только численным: координаты обязаны быть конечными,
     иначе сломаются матрицы, мини-карта и сохранение. */
  const COORD_LIMIT = 1.0e6; // 1000 км — заведомо дальше любого разумного заплыва

  function clampPosition(p) {
    if (!biomeRef.unbounded) {
      const bound = (biomeRef.worldRadius || 1200) - 30;
      p.x = OC.clamp(p.x, -bound, bound);
      p.z = OC.clamp(p.z, -bound, bound);
    } else {
      if (!Number.isFinite(p.x)) p.x = 0;
      if (!Number.isFinite(p.z)) p.z = 0;
      p.x = OC.clamp(p.x, -COORD_LIMIT, COORD_LIMIT);
      p.z = OC.clamp(p.z, -COORD_LIMIT, COORD_LIMIT);
    }
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
    _gpOut, _tourStateOut, getBiome, setBiomeRef, getCanvas, setCanvas, clampPosition,
    toLocal
  };
})(window.OC);
