/* ================= ГИБРИДНАЯ НАВИГАЦИЯ: СВОБОДНОЕ ПЛАВАНИЕ + ОРБИТА + АВТО-ТУР ================= */
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
  const _gpOut = { moveX: 0, moveY: 0, vertZ: 0, boost: false };

  const state = {
    mode: 'swim', // 'swim' | 'orbit' | 'tour' | 'cinema'
    pos: new T.Vector3(),
    vel: new T.Vector3(),
    yaw: 2.25,
    pitch: -0.14,
    targetYaw: 2.25,
    targetPitch: -0.14,
    swimSpeed: 18,
    // Орбита
    orbitTarget: new T.Vector3(),
    orbitDist: 42,
    orbitTargetDist: 42,
    // Авто-тур
    tourIdx: 0,
    tourT: 0,
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
    onGamepadAction: null
  };

  let biomeRef = null;
  let canvasRef = null;

  function setMode(m) {
    if (state.mode === m) return;
    if (m === 'orbit') {
      // Ставим центр орбиты впереди камеры на ~36 м
      _fwd.set(
        Math.sin(state.yaw) * Math.cos(state.pitch),
        Math.sin(state.pitch),
        Math.cos(state.yaw) * Math.cos(state.pitch)
      ).normalize();
      state.orbitTarget.copy(state.pos).addScaledVector(_fwd, 34);
      const fl = biomeRef.getHeight(state.orbitTarget.x, state.orbitTarget.z);
      state.orbitTarget.y = Math.max(state.orbitTarget.y, fl + 1.5);
      state.orbitDist = 34;
      state.orbitTargetDist = 34;
      // В орбите камера смотрит НА target, поэтому разворачиваем yaw
      state.yaw = Math.atan2(state.pos.x - state.orbitTarget.x, state.pos.z - state.orbitTarget.z);
      state.targetYaw = state.yaw;
      state.pitch = Math.asin(OC.clamp((state.pos.y - state.orbitTarget.y) / 34, -0.85, 0.85));
      state.targetPitch = state.pitch;
    } else if (m === 'cinema') {
      _fwd.set(
        Math.sin(state.yaw) * Math.cos(state.pitch),
        Math.sin(state.pitch),
        Math.cos(state.yaw) * Math.cos(state.pitch)
      ).normalize();
      state.cinemaCenter.copy(state.pos).addScaledVector(_fwd, 28);
      const fl = biomeRef ? biomeRef.getHeight(state.cinemaCenter.x, state.cinemaCenter.z) : -10;
      state.cinemaCenter.y = Math.max(state.cinemaCenter.y, fl + 3.0);
      state.cinemaPhase = Math.atan2(state.pos.z - state.cinemaCenter.z, state.pos.x - state.cinemaCenter.x);
      state.cinemaYawOffset = 0;
      state.cinemaPitchOffset = 0;
    } else if (state.mode === 'orbit' && m === 'swim') {
      // При выходе из орбиты сохраняем направление взгляда на target
      const dx = state.orbitTarget.x - state.pos.x;
      const dy = state.orbitTarget.y - state.pos.y;
      const dz = state.orbitTarget.z - state.pos.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      state.yaw = Math.atan2(dx, dz);
      state.targetYaw = state.yaw;
      state.pitch = Math.asin(OC.clamp(dy / d, -0.9, 0.9));
      state.targetPitch = state.pitch;
      state.vel.set(0, 0, 0);
    }

    state.mode = m;
    state.glide = null;
    if (m === 'tour') {
      state.tourIdx = 0;
      state.tourT = 0;
      if (state.onTourToast && biomeRef.tourLegs[0]) {
        state.onTourToast(biomeRef.tourLegs[0].title);
      }
    }
    if (state.onModeChange) state.onModeChange(m);
  }

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

  function clampPosition(p) {
    const bound = (biomeRef.worldRadius || 1200) - 30;
    p.x = OC.clamp(p.x, -bound, bound);
    p.z = OC.clamp(p.z, -bound, bound);
    const fl = biomeRef.getHeight(p.x, p.z);
    const maxY = (biomeRef && biomeRef.maxCamY !== undefined) ? biomeRef.maxCamY : 16.0;
    p.y = OC.clamp(p.y, fl + 1.65, maxY);
  }

  OC.Navigation = {
    init(canvas, biome, callbacks) {
      canvasRef = canvas;
      biomeRef = biome;
      callbacks = callbacks || {};
      state.onPick = callbacks.onPick || null;
      state.onModeChange = callbacks.onModeChange || null;
      state.onTourToast = callbacks.onTourToast || null;
      state.onGamepadAction = callbacks.onGamepadAction || null;

      this.resetToSpawn();

      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        state.dragging = true;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.pointerMoved = 0;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      });

      canvas.addEventListener('pointermove', (e) => {
        if (!state.dragging) return;
        const dx = e.clientX - state.lastX;
        const dy = e.clientY - state.lastY;
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.pointerMoved += Math.abs(dx) + Math.abs(dy);
        if (state.mode === 'tour') setMode('swim');
        state.glide = null;

        if (state.mode === 'orbit') {
          state.targetYaw -= dx * 0.0046;
          state.targetPitch = OC.clamp(state.targetPitch + dy * 0.0036, -0.78, 0.88);
        } else if (state.mode === 'cinema') {
          state.cinemaYawOffset -= dx * 0.0034;
          state.cinemaPitchOffset = OC.clamp(state.cinemaPitchOffset - dy * 0.0028, -0.65, 0.65);
        } else {
          state.targetYaw -= dx * 0.0042;
          state.targetPitch = OC.clamp(state.targetPitch - dy * 0.0034, -1.25, 1.25);
        }
      });

      const endDrag = (e) => {
        if (!state.dragging) return;
        state.dragging = false;
        if (state.pointerMoved < 7 && state.onPick) state.onPick(e.clientX, e.clientY);
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
      };
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', () => { state.dragging = false; });

      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (state.mode === 'orbit') {
          state.orbitTargetDist = OC.clamp(state.orbitTargetDist * Math.exp(e.deltaY * 0.0012), 10, 140);
        } else {
          // В свободном плавании скролл плавно подталкивает вперёд/назад
          _fwd.set(
            Math.sin(state.yaw) * Math.cos(state.pitch),
            Math.sin(state.pitch),
            Math.cos(state.yaw) * Math.cos(state.pitch)
          ).normalize();
          state.vel.addScaledVector(_fwd, -Math.sign(e.deltaY) * 14);
        }
      }, { passive: false });

      canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
          const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (state.pinchDist > 0) {
            const delta = d - state.pinchDist;
            if (state.mode === 'orbit') {
              state.orbitTargetDist = OC.clamp(state.orbitTargetDist - delta * 0.25, 10, 140);
            } else {
              _fwd.set(
                Math.sin(state.yaw) * Math.cos(state.pitch),
                Math.sin(state.pitch),
                Math.cos(state.yaw) * Math.cos(state.pitch)
              ).normalize();
              state.vel.addScaledVector(_fwd, delta * 0.45);
            }
          }
          state.pinchDist = d;
        }
      }, { passive: true });
      canvas.addEventListener('touchend', () => { state.pinchDist = 0; });

      window.addEventListener('keydown', (e) => {
        if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
        keys[e.code] = true;
      });
      window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
      });
      window.addEventListener('blur', () => {
        for (const k in keys) keys[k] = false;
      });
    },

    setMode,
    setBiome(biome) {
      biomeRef = biome;
      state.mode = 'swim';
      state.glide = null;
      state.vel.set(0, 0, 0);
      _curr.set(0, 0, 0);
      this.resetToSpawn();
      if (state.onModeChange) state.onModeChange('swim');
    },
    getMode: () => state.mode,
    getPosition: () => state.pos,
    getYaw: () => state.yaw,
    getPitch: () => state.pitch,
    getVelocity: () => state.vel,
    getSpeed: () => state.vel.length(),
    getCurrent: () => _curr,
    getGamepadActive: () => state.gamepadActive,
    setVirtualInput(vx, vy, vz) {
      state.virtX = OC.clamp(vx || 0, -1, 1);
      state.virtY = OC.clamp(vy || 0, -1, 1);
      state.virtZ = OC.clamp(vz || 0, -1, 1);
    },
    getForward(out) {
      out = out || new T.Vector3();
      return out.set(
        Math.sin(state.yaw) * Math.cos(state.pitch),
        Math.sin(state.pitch),
        Math.cos(state.yaw) * Math.cos(state.pitch)
      ).normalize();
    },

    resetToSpawn() {
      const sp = biomeRef.spawn;
      state.pos.set(sp.pos[0], sp.pos[1], sp.pos[2]);
      state.vel.set(0, 0, 0);
      state.yaw = sp.yaw;
      state.targetYaw = sp.yaw;
      state.pitch = sp.pitch;
      state.targetPitch = sp.pitch;
      state.glide = null;
      setMode('swim');
    },

    flyTo(x, y, z, yaw, pitch) {
      if (state.mode === 'tour') setMode('swim');
      const safeY = Math.max(y, biomeRef.getHeight(x, z) + 2.4);
      const dist = Math.hypot(x - state.pos.x, safeY - state.pos.y, z - state.pos.z);

      // Если точка далеко (> 380 м), телепортируемся в окрестность с коротким плавным подлётом
      if (dist > 380) {
        const dirX = (state.pos.x - x) / dist;
        const dirZ = (state.pos.z - z) / dist;
        state.pos.set(x + dirX * 55, Math.max(safeY + 4, biomeRef.getHeight(x + dirX * 55, z + dirZ * 55) + 3), z + dirZ * 55);
      }

      const endYaw = yaw !== undefined ? yaw : Math.atan2(x - state.pos.x, z - state.pos.z);
      const endPitch = pitch !== undefined ? pitch : -0.1;

      state.glide = {
        startPos: state.pos.clone(),
        endPos: new T.Vector3(x, safeY, z),
        startYaw: state.yaw,
        endYaw,
        startPitch: state.pitch,
        endPitch,
        t: 0,
        dur: 1.6
      };
      if (state.mode === 'orbit') setMode('swim');
    },

    /* Виртуальный импульс для мобильных кнопок */
    nudgeForward(amount) {
      _fwd.set(
        Math.sin(state.yaw) * Math.cos(state.pitch),
        Math.sin(state.pitch),
        Math.cos(state.yaw) * Math.cos(state.pitch)
      ).normalize();
      state.vel.addScaledVector(_fwd, amount);
    },

    update(dt, time, camera, reduced) {
      pollGamepad(dt, _gpOut);
      const gpOut = _gpOut;
      const kLook = Math.min(1, dt * (state.mode === 'cinema' ? 2.6 : 8.5));
      state.yaw += (state.targetYaw - state.yaw) * kLook;
      state.pitch += (state.targetPitch - state.pitch) * kLook;

      if (state.glide) {
        state.glide.t += dt;
        const u = OC.smoothstep(0, state.glide.dur, state.glide.t);
        state.pos.lerpVectors(state.glide.startPos, state.glide.endPos, u);
        const dyaw = ((((state.glide.endYaw - state.glide.startYaw) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        state.yaw = state.glide.startYaw + dyaw * u;
        state.targetYaw = state.yaw;
        state.pitch = OC.lerp(state.glide.startPitch, state.glide.endPitch, u);
        state.targetPitch = state.pitch;
        if (state.glide.t >= state.glide.dur) state.glide = null;
      } else if (state.mode === 'cinema') {
        // Плавный кинематографический облёт вокруг текущей локации
        state.cinemaPhase += dt * 0.14;
        const radX = 32 + Math.sin(state.cinemaPhase * 0.7) * 8;
        const radZ = 28 + Math.cos(state.cinemaPhase * 0.5) * 8;
        const cx = state.cinemaCenter.x + Math.cos(state.cinemaPhase) * radX;
        const cz = state.cinemaCenter.z + Math.sin(state.cinemaPhase) * radZ;
        const baseFl = biomeRef ? biomeRef.getHeight(cx, cz) : -20;
        const maxCamY = (biomeRef && biomeRef.maxCamY !== undefined) ? biomeRef.maxCamY : 16.0;
        const cy = OC.clamp(state.cinemaCenter.y + Math.sin(state.cinemaPhase * 1.4) * 3.5, baseFl + 2.8, maxCamY - 0.5);
        _cinemaTarget.set(cx, cy, cz);
        state.pos.lerp(_cinemaTarget, Math.min(1, dt * 1.8));
        clampPosition(state.pos);
        const dx = state.cinemaCenter.x - state.pos.x;
        const dy = state.cinemaCenter.y - state.pos.y;
        const dz = state.cinemaCenter.z - state.pos.z;
        const d = Math.hypot(dx, dy, dz) || 1;
        state.targetYaw = Math.atan2(dx, dz) + state.cinemaYawOffset;
        state.targetPitch = OC.clamp(Math.asin(OC.clamp(dy / d, -0.9, 0.9)) + state.cinemaPitchOffset, -1.1, 1.1);
      } else if (state.mode === 'tour') {
        const legs = biomeRef.tourLegs;
        if (legs && legs.length) {
          const cur = legs[state.tourIdx % legs.length];
          const prev = legs[(state.tourIdx - 1 + legs.length) % legs.length];
          state.tourT += dt;
          const dur = cur.duration || 9;
          const u = OC.smoothstep(0, dur - 1.2, state.tourT);
          state.pos.set(
            OC.lerp(prev.pos[0], cur.pos[0], u),
            OC.lerp(prev.pos[1], cur.pos[1], u),
            OC.lerp(prev.pos[2], cur.pos[2], u)
          );
          _lookAt.set(
            OC.lerp(prev.look[0], cur.look[0], u),
            OC.lerp(prev.look[1], cur.look[1], u),
            OC.lerp(prev.look[2], cur.look[2], u)
          );
          const dx = _lookAt.x - state.pos.x;
          const dy = _lookAt.y - state.pos.y;
          const dz = _lookAt.z - state.pos.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          state.yaw = Math.atan2(dx, dz);
          state.targetYaw = state.yaw;
          state.pitch = Math.asin(OC.clamp(dy / d, -0.95, 0.95));
          state.targetPitch = state.pitch;
          if (state.tourT >= dur) {
            state.tourT = 0;
            state.tourIdx = (state.tourIdx + 1) % legs.length;
            const nextLeg = legs[state.tourIdx];
            if (state.onTourToast && nextLeg) state.onTourToast(nextLeg.title);
          }
        }
      } else if (state.mode === 'orbit') {
        state.orbitDist += (state.orbitTargetDist - state.orbitDist) * Math.min(1, dt * 6);
        const panSpeed = 24 * (keys.ShiftLeft || keys.ShiftRight ? 2.4 : 1);
        _fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw)).normalize();
        _right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw)).normalize();
        if (keys.KeyW || keys.ArrowUp) state.orbitTarget.addScaledVector(_fwd, panSpeed * dt);
        if (keys.KeyS || keys.ArrowDown) state.orbitTarget.addScaledVector(_fwd, -panSpeed * dt);
        if (keys.KeyD || keys.ArrowRight) state.orbitTarget.addScaledVector(_right, panSpeed * dt);
        if (keys.KeyA || keys.ArrowLeft) state.orbitTarget.addScaledVector(_right, -panSpeed * dt);
        if (keys.KeyE || keys.Space) state.orbitTarget.y += panSpeed * 0.6 * dt;
        if (keys.KeyQ || keys.KeyC) state.orbitTarget.y -= panSpeed * 0.6 * dt;
        clampPosition(state.orbitTarget);

        const cp = Math.cos(state.pitch);
        state.pos.set(
          state.orbitTarget.x + Math.sin(state.yaw) * cp * state.orbitDist,
          state.orbitTarget.y + Math.sin(state.pitch) * state.orbitDist,
          state.orbitTarget.z + Math.cos(state.yaw) * cp * state.orbitDist
        );
        clampPosition(state.pos);
        camera.position.copy(state.pos);
        camera.lookAt(state.orbitTarget);
        return;
      } else {
        // Свободное плавание (Diver Free-Swim + Геймпад + Виртуальный тач-джойстик)
        const boost = (keys.ShiftLeft || keys.ShiftRight || gpOut.boost) ? 2.65 : 1.0;
        const accel = state.swimSpeed * boost * 3.8;

        _fwd.set(
          Math.sin(state.yaw) * Math.cos(state.pitch),
          Math.sin(state.pitch),
          Math.cos(state.yaw) * Math.cos(state.pitch)
        ).normalize();
        _right.set(-Math.cos(state.yaw), 0, Math.sin(state.yaw)).normalize();

        _move.set(0, 0, 0);
        if (keys.KeyW || keys.ArrowUp) _move.add(_fwd);
        if (keys.KeyS || keys.ArrowDown) _move.sub(_fwd);
        if (keys.KeyD || keys.ArrowRight) _move.add(_right);
        if (keys.KeyA || keys.ArrowLeft) _move.sub(_right);
        if (keys.KeyE || keys.Space) _move.y += 0.85;
        if (keys.KeyQ || keys.KeyC) _move.y -= 0.85;

        const axFwd = OC.clamp(gpOut.moveY + state.virtY, -1, 1);
        const axStrafe = OC.clamp(gpOut.moveX + state.virtX, -1, 1);
        const axVert = OC.clamp(gpOut.vertZ + state.virtZ, -1, 1);
        if (Math.abs(axFwd) > 0.01) _move.addScaledVector(_fwd, axFwd);
        if (Math.abs(axStrafe) > 0.01) _move.addScaledVector(_right, axStrafe);
        if (Math.abs(axVert) > 0.01) _move.y += axVert * 0.85;

        if (_move.lengthSq() > 0.001) {
          if (_move.lengthSq() > 1.0) _move.normalize();
          state.vel.addScaledVector(_move, accel * dt);
        }

        // Приливные и прибойные течения океана (сносят батискаф в Проходе и над Гребнем)
        if (!reduced && biomeRef && biomeRef.getCurrentAt && (state.pos.y < -0.25 || biomeRef.noSurface)) {
          biomeRef.getCurrentAt(state.pos.x, state.pos.y, state.pos.z, time, _curr);
          state.vel.addScaledVector(_curr, 1.45 * dt);
        } else {
          _curr.set(0, 0, 0);
        }

        // Водное сопротивление / инерция
        const damp = Math.exp(-3.4 * dt);
        state.vel.multiplyScalar(damp);
        state.pos.addScaledVector(state.vel, dt);
        clampPosition(state.pos);
      }

      const bob = reduced || (!biomeRef.noSurface && state.pos.y > -0.2) ? 0 : Math.sin(time * 0.65) * 0.14;
      camera.position.set(state.pos.x, state.pos.y + bob, state.pos.z);

      _fwd.set(
        Math.sin(state.yaw) * Math.cos(state.pitch),
        Math.sin(state.pitch),
        Math.cos(state.yaw) * Math.cos(state.pitch)
      ).normalize();
      _lookAt.copy(camera.position).add(_fwd);
      camera.lookAt(_lookAt);
    }
  };
})(window.OC);
