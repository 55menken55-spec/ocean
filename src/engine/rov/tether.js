/* ================= ROV: КАБЕЛЬ-ТРОС И ЕГО НАТЯЖЕНИЕ ================= */
/* Кевларовый трос от лебёдки НИС / депрессора / опорного буя к аппарату: провис,
   снос течением по длине, цветовая шкала натяжения (норма → натянут → предел).
   Возвращает состояние троса для HUD; буферы позиций/цветов принадлежат вызывающему. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  function buildTetherMesh(ctx) {
    const tetherPos = ctx.tetherPos;
    const tetherCol = ctx.tetherCol;
    const TETHER_SEGS = ctx.TETHER_SEGS;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(tetherPos, 3));
    geo.setAttribute('color', new T.BufferAttribute(tetherCol, 3));
    const mat = new T.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92
    });
    const line = new T.Line(geo, mat);
    line.frustumCulled = false;
    line.visible = false;
    return line;
  }

  function updateTether(ctx, craftPos, biome, time, showCraft, labState) {
    const tetherLine = ctx.tetherLine;
    const tetherState = ctx.tetherState;
    const tetherPos = ctx.tetherPos;
    const tetherCol = ctx.tetherCol;
    const TETHER_SEGS = ctx.TETHER_SEGS;
    const _currTmp = ctx._currTmp;
    if (!tetherLine || !craftPos) return;
    if (!showCraft) {
      tetherLine.visible = false;
      tetherState.active = false;
      tetherState.tensionPct = 0;
      tetherState.lengthM = 0;
      tetherState.status = 'свёрнут';
      return;
    }

    const vInfo = OC.faunaInfo ? OC.faunaInfo.vessel : null;
    const noSurf = !!(biome && biome.noSurface);
    let ax = 0, ay = 2.6, az = 0, maxLen = 1200, anchorLabel = 'Буй-лебёдка';
    if (vInfo) {
      const sy = Math.cos(vInfo.yaw || 0);
      const sx = Math.sin(vInfo.yaw || 0);
      ax = vInfo.x - sx * 22.0;
      ay = 2.8;
      az = vInfo.z - sy * 22.0;
      maxLen = 1200;
      anchorLabel = vInfo.name || 'НИС';
    } else if (noSurf) {
      const sp = biome && biome.spawn ? biome.spawn.pos : [0, -18, 0];
      ax = sp[0];
      ay = 72.0;
      az = sp[2];
      maxLen = 1450;
      anchorLabel = 'Депрессор лебёдки';
    } else if (biome && biome.spawn) {
      ax = biome.spawn.pos[0];
      ay = 0.6;
      az = biome.spawn.pos[2];
      maxLen = 1200;
      anchorLabel = 'Опорный буй';
    }

    const rx = craftPos.x;
    const ry = craftPos.y + 0.52;
    const rz = craftPos.z;
    const directDist = Math.hypot(rx - ax, ry - ay, rz - az);
    const ratio = OC.clamp(directDist / maxLen, 0, 1.2);
    const sagAmt = (1.0 - OC.clamp(ratio, 0, 0.96)) * Math.min(24.0, directDist * 0.22 + 3.5);
    const tensionPct = Math.round(ratio * 100);
    const cableLen = Math.round(directDist + sagAmt * 0.42);

    tetherState.active = true;
    tetherState.lengthM = cableLen;
    tetherState.maxLengthM = maxLen;
    tetherState.tensionPct = tensionPct;
    tetherState.anchorLabel = anchorLabel;
    tetherState.anchorX = ax;
    tetherState.anchorY = ay;
    tetherState.anchorZ = az;
    tetherState.status = tensionPct >= 88 ? 'предел' : (tensionPct >= 62 ? 'натянут' : 'норма');

    if (biome && biome.getCurrentAt) {
      biome.getCurrentAt((ax + rx) * 0.5, (ay + ry) * 0.5, (az + rz) * 0.5, time, _currTmp);
      const mult = labState ? labState.currentMult : 1.0;
      _currTmp.multiplyScalar(mult * (1.0 - ratio * 0.72));
    } else {
      _currTmp.set(0, 0, 0);
    }

    // Цвет кабель-троса: жёлтый кевлар -> янтарь -> тревожный красный
    let cr = 0.96, cg = 0.80, cb = 0.26;
    if (tensionPct >= 88) { cr = 1.0; cg = 0.28; cb = 0.34; }
    else if (tensionPct >= 62) { cr = 1.0; cg = 0.62; cb = 0.22; }

    for (let i = 0; i <= TETHER_SEGS; i++) {
      const f = i / TETHER_SEGS;
      const arch = 4.0 * f * (1.0 - f);
      const px = OC.lerp(ax, rx, f) + _currTmp.x * arch * 2.2;
      const py = OC.lerp(ay, ry, f) - sagAmt * arch;
      const pz = OC.lerp(az, rz, f) + _currTmp.z * arch * 2.2;
      const idx = i * 3;
      tetherPos[idx] = px;
      tetherPos[idx + 1] = py;
      tetherPos[idx + 2] = pz;
      tetherCol[idx] = OC.lerp(cr * 0.78, cr, f);
      tetherCol[idx + 1] = OC.lerp(cg * 0.84, cg, f);
      tetherCol[idx + 2] = OC.lerp(cb * 0.84, cb, f);
    }

    tetherLine.geometry.attributes.position.needsUpdate = true;
    tetherLine.geometry.attributes.color.needsUpdate = true;
    tetherLine.visible = true;
  }


  OC._RovTether = { buildTetherMesh, updateTether };
})(window.OC);
