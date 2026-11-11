/* ================= ROV: ПУЗЫРЬКОВЫЙ КИЛЬВАТЕР И 3D-ТРАССЕРЫ ТЕЧЕНИЙ ================= */
/* Пул из 128 всплывающих пузырьков за винтами и 140 линий тока, летящих по полю
   течений биома. Буферы принадлежат rov.js — фабрики и апдейт работают по ссылкам. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const _currTmp = new T.Vector3();

    function buildWakePoints(ctx) {
    const wakePos = ctx.wakePos;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(wakePos, 3));
    const mat = new T.PointsMaterial({
      size: 0.42,
      map: OC.circleTexture(64, false),
      color: 0xe8fbff,
      transparent: true,
      opacity: 0.62,
      blending: T.AdditiveBlending,
      depthWrite: false
    });
    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.rovKey = 'rov_fx';
    pts.raycast = () => {};
    pts.visible = false;
    return pts;
  }

  function buildCurrentStreamlines(ctx) {
    const streamPos = ctx.streamPos;
    const streamCol = ctx.streamCol;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(streamPos, 3));
    geo.setAttribute('color', new T.BufferAttribute(streamCol, 3));
    const mat = new T.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      blending: T.AdditiveBlending,
      depthWrite: false
    });
    const lines = new T.LineSegments(geo, mat);
    lines.frustumCulled = false;
    lines.userData.rovKey = 'rov_fx';
    lines.raycast = () => {};
    lines.visible = false;
    return lines;
  }

  function seedStream(ctx, i, origin, biome, rng) {
    const streamHeadX = ctx.streamHeadX, streamHeadY = ctx.streamHeadY, streamHeadZ = ctx.streamHeadZ, streamAge = ctx.streamAge;
    const STREAM_BOX_XZ = ctx.STREAM_BOX_XZ, STREAM_BOX_Y = ctx.STREAM_BOX_Y;
    const hx = origin.x + (rng() - 0.5) * STREAM_BOX_XZ;
    const hz = origin.z + (rng() - 0.5) * STREAM_BOX_XZ;
    const fl = biome ? biome.getHeight(hx, hz) : -25;
    let maxY = (biome && biome.noSurface) ? Math.min(-3.5, origin.y + 22) : -0.45;
    if (biome && biome.getCeilingHeight) {
      const ch = biome.getCeilingHeight(hx, hz);
      if (ch < 25.0) maxY = Math.min(maxY, ch - 1.2);
    }
    const minY = Math.max(fl + 0.9, origin.y - STREAM_BOX_Y * 0.5);
    const spanY = Math.max(2.0, maxY - minY);
    const hy = minY + rng() * spanY;
    streamHeadX[i] = hx;
    streamHeadY[i] = hy;
    streamHeadZ[i] = hz;
    streamAge[i] = rng() * 3.5;
  }

  function updateCurrents(ctx, dt, time, origin, biome, labState) {
    const currentsMesh = ctx.currentsMesh;
    const streamPos = ctx.streamPos, streamCol = ctx.streamCol;
    const streamHeadX = ctx.streamHeadX, streamHeadY = ctx.streamHeadY, streamHeadZ = ctx.streamHeadZ, streamAge = ctx.streamAge;
    const STREAM_COUNT = ctx.STREAM_COUNT, STREAM_BOX_XZ = ctx.STREAM_BOX_XZ, STREAM_BOX_Y = ctx.STREAM_BOX_Y;
    if (!currentsMesh) return;
    const currentsVisible = !!ctx.currentsVisible;
    currentsMesh.visible = currentsVisible;
    if (!currentsVisible || !biome) return;

    if (!ctx.streamsInited) {
      ctx.streamsInited = true;
      const rng = OC.mulberry32(90210);
      for (let i = 0; i < ctx.STREAM_COUNT; i++) seedStream(ctx, i, origin, biome, rng);
    }

    const mult = labState ? labState.currentMult : 1.0;
    const halfXZ = STREAM_BOX_XZ * 0.5;
    const halfY = STREAM_BOX_Y * 0.5;
    const maxSurf = (biome && biome.noSurface) ? -3.5 : -0.35;

    for (let i = 0; i < STREAM_COUNT; i++) {
      let x = streamHeadX[i];
      let y = streamHeadY[i];
      let z = streamHeadZ[i];
      streamAge[i] += dt;

      if (biome.getCurrentAt) {
        biome.getCurrentAt(x, y, z, time, _currTmp);
        _currTmp.multiplyScalar(mult);
      } else {
        _currTmp.set(0.35 * mult, 0, 0.1 * mult);
      }

      const speed = _currTmp.length();
      const adv = Math.max(0.45, speed * 3.8);
      if (speed > 0.01) {
        x += (_currTmp.x / speed) * adv * dt;
        y += (_currTmp.y / speed) * adv * dt;
        z += (_currTmp.z / speed) * adv * dt;
      }

      // Оборачиваем линии течений вокруг аппарата (zero-GC)
      if (x < origin.x - halfXZ) x += STREAM_BOX_XZ;
      else if (x > origin.x + halfXZ) x -= STREAM_BOX_XZ;
      if (z < origin.z - halfXZ) z += STREAM_BOX_XZ;
      else if (z > origin.z + halfXZ) z -= STREAM_BOX_XZ;

      const fl = biome.getHeight(x, z);
      if (y < fl + 0.65 || y < origin.y - halfY || y > origin.y + halfY || y > maxSurf || streamAge[i] > 4.2) {
        const h1 = OC.hash2(i * 17, Math.floor(time * 7 + i), 313);
        const h2 = OC.hash2(i * 29, Math.floor(time * 5 + i), 773);
        const h3 = OC.hash2(i * 41, Math.floor(time * 3 + i), 991);
        x = origin.x + (h1 - 0.5) * STREAM_BOX_XZ;
        z = origin.z + (h2 - 0.5) * STREAM_BOX_XZ;
        const flN = biome.getHeight(x, z);
        const topY = Math.min(maxSurf, origin.y + halfY);
        const botY = Math.max(flN + 0.9, origin.y - halfY);
        y = botY + h3 * Math.max(1.5, topY - botY);
        streamAge[i] = 0;
      }

      streamHeadX[i] = x;
      streamHeadY[i] = y;
      streamHeadZ[i] = z;

      const streakLen = OC.clamp(0.85 + speed * 2.1, 0.85, 6.2);
      let tx = x - streakLen, ty = y, tz = z;
      if (speed > 0.01) {
        tx = x - (_currTmp.x / speed) * streakLen;
        ty = y - (_currTmp.y / speed) * streakLen;
        tz = z - (_currTmp.z / speed) * streakLen;
      }

      const vi = i * 6;
      streamPos[vi] = tx;
      streamPos[vi + 1] = ty;
      streamPos[vi + 2] = tz;
      streamPos[vi + 3] = x;
      streamPos[vi + 4] = y;
      streamPos[vi + 5] = z;

      const energy = OC.clamp(speed / 1.8, 0, 1);
      // Хвост глубже/темнее, голова яркая бирюзово-мятная при сильном токе
      streamCol[vi] = OC.lerp(0.08, 0.22, energy);
      streamCol[vi + 1] = OC.lerp(0.35, 0.72, energy);
      streamCol[vi + 2] = OC.lerp(0.62, 0.88, energy);
      streamCol[vi + 3] = OC.lerp(0.32, 0.58, energy);
      streamCol[vi + 4] = OC.lerp(0.84, 1.0, energy);
      streamCol[vi + 5] = OC.lerp(0.98, 0.86, energy);
    }

    currentsMesh.geometry.attributes.position.needsUpdate = true;
    currentsMesh.geometry.attributes.color.needsUpdate = true;
  }

  /* Кабель-трос и буи вынесены в rov/tether.js и rov/buoys.js */
  const { buildTetherMesh, updateTether } = OC._RovTether;
  const { buildBuoyMesh, updateBuoys } = OC._RovBuoys;
  function updateWake(ctx, dt, craftPos, speed, chaseActive) {
    const wakePoints = ctx.wakePoints;
    const wakePos = ctx.wakePos, wakeVel = ctx.wakeVel, wakeLife = ctx.wakeLife;
    const WAKE_COUNT = ctx.WAKE_COUNT, rovGroup = ctx.rovGroup(), _worldTmp = ctx._worldTmp;
    if (!wakePoints) return;
    if (!chaseActive) {
      wakePoints.visible = false;
      return;
    }
    wakePoints.visible = true;

    if (!ctx.wakeInited) {
      ctx.wakeInited = true;
      for (let i = 0; i < WAKE_COUNT; i++) {
        wakePos[i * 3] = craftPos.x;
        wakePos[i * 3 + 1] = craftPos.y - 100;
        wakePos[i * 3 + 2] = craftPos.z;
        wakeLife[i] = 0;
      }
    }

    if (speed > 0.65 && rovGroup) {
      ctx.wakeAccum += dt * OC.clamp(speed * 2.4, 8, 38);
      while (ctx.wakeAccum >= 1) {
        ctx.wakeAccum -= 1;
        const side = (ctx.wakeCursor % 2 === 0) ? 0.54 : -0.54;
        _worldTmp.set(side, 0.02, -1.16).applyMatrix4(rovGroup.matrixWorld);
        const idx = ctx.wakeCursor;
        wakePos[idx * 3] = _worldTmp.x + (Math.random() - 0.5) * 0.08;
        wakePos[idx * 3 + 1] = _worldTmp.y + (Math.random() - 0.5) * 0.08;
        wakePos[idx * 3 + 2] = _worldTmp.z + (Math.random() - 0.5) * 0.08;
        wakeVel[idx * 3] = (Math.random() - 0.5) * 0.35;
        wakeVel[idx * 3 + 1] = 0.55 + Math.random() * 0.45;
        wakeVel[idx * 3 + 2] = (Math.random() - 0.5) * 0.35;
        wakeLife[idx] = 1.0;
        ctx.wakeCursor = (ctx.wakeCursor + 1) % WAKE_COUNT;
      }
    }

    for (let i = 0; i < WAKE_COUNT; i++) {
      if (wakeLife[i] <= 0) continue;
      wakeLife[i] -= dt * 0.72;
      if (wakeLife[i] <= 0) {
        wakePos[i * 3 + 1] = craftPos.y - 120;
      } else {
        wakePos[i * 3] += wakeVel[i * 3] * dt;
        wakePos[i * 3 + 1] += wakeVel[i * 3 + 1] * dt;
        wakePos[i * 3 + 2] += wakeVel[i * 3 + 2] * dt;
      }
    }
    wakePoints.geometry.attributes.position.needsUpdate = true;
  }


  OC._RovWake = {
    buildWakePoints, buildCurrentStreamlines, updateCurrents, updateWake
  };
})(window.OC);
