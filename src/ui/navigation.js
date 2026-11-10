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

  const state = {
    mode: 'swim', // 'swim' | 'orbit' | 'tour'
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
    // Плавный перелёт к точке (Minimap / Landmark)
    glide: null,
    // Ввод
    dragging: false,
    lastX: 0,
    lastY: 0,
    pointerMoved: 0,
    pinchDist: 0,
    onPick: null,
    onModeChange: null,
    onTourToast: null
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

  function clampPosition(p) {
    const bound = (biomeRef.worldRadius || 1200) - 30;
    p.x = OC.clamp(p.x, -bound, bound);
    p.z = OC.clamp(p.z, -bound, bound);
    const fl = biomeRef.getHeight(p.x, p.z);
    p.y = OC.clamp(p.y, fl + 1.65, 16.0); // Можно всплыть до +16 м над островком!
  }

  OC.Navigation = {
    init(canvas, biome, callbacks) {
      canvasRef = canvas;
      biomeRef = biome;
      callbacks = callbacks || {};
      state.onPick = callbacks.onPick || null;
      state.onModeChange = callbacks.onModeChange || null;
      state.onTourToast = callbacks.onTourToast || null;

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
    getMode: () => state.mode,
    getPosition: () => state.pos,
    getYaw: () => state.yaw,
    getPitch: () => state.pitch,
    getVelocity: () => state.vel,
    getSpeed: () => state.vel.length(),
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
      const kLook = Math.min(1, dt * 8.5);
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
        // Свободное плавание (Diver Free-Swim)
        const boost = (keys.ShiftLeft || keys.ShiftRight) ? 2.65 : 1.0;
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

        if (_move.lengthSq() > 0.001) {
          _move.normalize();
          state.vel.addScaledVector(_move, accel * dt);
        }
        // Водное сопротивление / инерция
        const damp = Math.exp(-3.4 * dt);
        state.vel.multiplyScalar(damp);
        state.pos.addScaledVector(state.vel, dt);
        clampPosition(state.pos);
      }

      const bob = reduced || state.pos.y > -0.2 ? 0 : Math.sin(time * 0.65) * 0.14;
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
