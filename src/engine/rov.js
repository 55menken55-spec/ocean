/* ================= 3D-БАТИСКАФ ROV «НАУТИЛУС-IV», МАНИПУЛЯТОР, CTD И 3D-ТЕЧЕНИЯ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const MAX_SAMPLES = 20;
  const WAKE_COUNT = 128;
  const STREAM_COUNT = 140;
  const TETHER_SEGS = 22;
  const MAX_BUOYS = 2;
  const STREAM_BOX_XZ = 92;
  const STREAM_BOX_Y = 46;

  let sceneRef = null;
  let rovGroup = null;
  let fpArmGroup = null;
  let wakePoints = null;
  let currentsMesh = null;
  let tetherLine = null;
  const tetherPos = new Float32Array((TETHER_SEGS + 1) * 3);
  const tetherCol = new Float32Array((TETHER_SEGS + 1) * 3);
  const tetherState = {
    active: false,
    lengthM: 0,
    maxLengthM: 420,
    tensionPct: 0,
    status: 'откл.',
    anchorLabel: 'НИС «Океан-1»',
    anchorX: 0,
    anchorY: 0,
    anchorZ: 0
  };
  const buoys = [];
  const buoyMeshes = [];
  let buoySeq = 0;

  // Подвижные узлы 3D-аппарата (заполняются из rov/model.js)
  const nodes = {};
  const propL = () => nodes.propL;
  const propR = () => nodes.propR;
  const propV = () => nodes.propV;
  const strobeMat = () => nodes.strobeMat;
  const ledMat = () => nodes.ledMat;
  const armShoulder = () => nodes.armShoulder;
  const armUpper = () => nodes.armUpper;
  const armForearm = () => nodes.armForearm;
  const armWrist = () => nodes.armWrist;
  const clawL = () => nodes.clawL;
  const clawR = () => nodes.clawR;
  const sampleOrb = () => nodes.sampleOrb;
  const laserBeam = () => nodes.laserBeam;
  const fpUpper = () => nodes.fpUpper;
  const fpForearm = () => nodes.fpForearm;
  const fpClawL = () => nodes.fpClawL;
  const fpClawR = () => nodes.fpClawR;
  const fpOrb = () => nodes.fpOrb;


  // Состояние анимации и инструментов
  let currentsVisible = false;
  let prevYaw = 0;
  let prevCraftPos = new T.Vector3();
  let rollSmooth = 0;
  let pitchSmooth = 0;
  let propAngle = 0;
  let grabTimer = 0;
  let grabDuration = 1.95;
  let wakeCursor = 0;
  let wakeAccum = 0;
  /* Флаги инициализации пулов кильватера/течений живут здесь и передаются в rov/wake.js */

  const wakePos = new Float32Array(WAKE_COUNT * 3);
  const wakeVel = new Float32Array(WAKE_COUNT * 3);
  const wakeLife = new Float32Array(WAKE_COUNT);

  const streamPos = new Float32Array(STREAM_COUNT * 6);
  const streamCol = new Float32Array(STREAM_COUNT * 6);
  const streamHeadX = new Float32Array(STREAM_COUNT);
  const streamHeadY = new Float32Array(STREAM_COUNT);
  const streamHeadZ = new Float32Array(STREAM_COUNT);
  const streamAge = new Float32Array(STREAM_COUNT);

  const samples = [];
  let lastCtdCast = null;

  // Временные объекты (zero-GC)
  const _fwd = new T.Vector3();
  const _right = new T.Vector3();
  const _up = new T.Vector3(0, 1, 0);
  const _probe = new T.Vector3();
  const _currTmp = new T.Vector3();
  const _worldTmp = new T.Vector3();

  const fxCtx = {
    STREAM_COUNT, WAKE_COUNT, STREAM_BOX_XZ, STREAM_BOX_Y,
    wakePos, wakeVel, wakeLife, streamPos, streamCol,
    streamHeadX, streamHeadY, streamHeadZ, streamAge,
    wakeCursor: 0, wakeAccum: 0, wakeInited: false, streamsInited: false, currentsVisible: false,
    _worldTmp, rovGroup: () => rovGroup,
    currentsMesh: null, wakePoints: null
  };

  /* Модель аппарата и рука от первого лица — rov/model.js */
  const { buildRovModel, buildFirstPersonArm } = OC._RovModel;
  /* Кабель-трос, буи, кильватер, течения и пробы — rov/tether.js, buoys.js, wake.js, samples.js */
  const { buildTetherMesh, updateTether } = OC._RovTether;
  const { buildBuoyMesh, updateBuoys } = OC._RovBuoys;
  const { buildWakePoints: buildWakePointsFx, buildCurrentStreamlines: buildCurrentStreamlinesFx, updateCurrents: updateCurrentsFx, updateWake: updateWakeFx } = OC._RovWake;
  const { scanManipulatorTarget, classifySample, computeWaterColumn } = OC._RovSamples;
  OC.ROV = {
    init(scene) {
      sceneRef = scene;
      if (rovGroup && rovGroup.parent) rovGroup.parent.remove(rovGroup);
      if (fpArmGroup && fpArmGroup.parent) fpArmGroup.parent.remove(fpArmGroup);
      if (wakePoints && wakePoints.parent) wakePoints.parent.remove(wakePoints);
      if (currentsMesh && currentsMesh.parent) currentsMesh.parent.remove(currentsMesh);
      if (tetherLine && tetherLine.parent) tetherLine.parent.remove(tetherLine);
      while (buoyMeshes.length) {
        const bm = buoyMeshes.pop();
        if (bm && bm.parent) bm.parent.remove(bm);
      }
      buoys.length = 0;

      const rovBuilt = buildRovModel();
      rovGroup = rovBuilt.group;
      rovGroup.rotation.order = 'YXZ';
      rovGroup.visible = false;
      scene.add(rovGroup);
      Object.assign(nodes, rovBuilt.nodes);

      const armBuilt = buildFirstPersonArm();
      fpArmGroup = armBuilt.group;
      scene.add(fpArmGroup);
      Object.assign(nodes, armBuilt.nodes);

      wakePoints = buildWakePointsFx(fxCtx);
      fxCtx.wakePoints = wakePoints;
      scene.add(wakePoints);

      currentsMesh = buildCurrentStreamlinesFx(fxCtx);
      fxCtx.currentsMesh = currentsMesh;
      scene.add(currentsMesh);

      tetherLine = buildTetherMesh({ tetherPos, tetherCol, TETHER_SEGS });
      scene.add(tetherLine);

      for (let i = 0; i < MAX_BUOYS; i++) {
        const bm = buildBuoyMesh();
        scene.add(bm);
        buoyMeshes.push(bm);
      }

      fxCtx.wakeInited = false;
      fxCtx.streamsInited = false;
      grabTimer = 0;
    },

    resetForBiome(biome, pos) {
      fxCtx.streamsInited = false;
      fxCtx.wakeInited = false;
      grabTimer = 0;
      if (tetherLine) tetherLine.visible = false;
      tetherState.active = false;
      tetherState.tensionPct = 0;
      buoys.length = 0;
      for (let i = 0; i < buoyMeshes.length; i++) buoyMeshes[i].visible = false;
      if (pos) prevCraftPos.copy(pos);
      lastCtdCast = null;
      if (biome && pos) {
        const off = biome.depthOffset || 0;
        const seasonWaterLevel = OC.Seasons ? OC.Seasons.getState(biome).waterLevelM : 0;
        const d = off + (off > 0 ? -pos.y : Math.max(0, seasonWaterLevel - pos.y));
        lastCtdCast = computeWaterColumn(biome, pos.x, pos.z, d, OC.EcoLab ? OC.EcoLab.getState() : null);
      }
    },

    setCurrentsVisible(on) {
      currentsVisible = !!on;
      fxCtx.currentsVisible = currentsVisible;
      if (currentsMesh) currentsMesh.visible = currentsVisible;
      return currentsVisible;
    },
    isCurrentsVisible: () => currentsVisible,
    toggleCurrents() {
      return this.setCurrentsVisible(!currentsVisible);
    },

    getSamples: () => ((OC.Expedition && OC.Expedition.getSamples) ? OC.Expedition.getSamples() : samples),
    clearSamples() {
      samples.length = 0;
      if (OC.Expedition && OC.Expedition.clearSamples) OC.Expedition.clearSamples();
    },
    getLastCtdCast: () => lastCtdCast,

    runCtdCast(biome, pos, labState) {
      if (!biome || !pos) return null;
      const off = biome.depthOffset || 0;
      const seasonWaterLevel = OC.Seasons ? OC.Seasons.getState(biome).waterLevelM : 0;
      const d = off + (off > 0 ? -pos.y : Math.max(0, seasonWaterLevel - pos.y));
      lastCtdCast = computeWaterColumn(biome, pos.x, pos.z, d, labState);
      if (OC.sound && OC.sound.ctdCast) OC.sound.ctdCast();
      return lastCtdCast;
    },

    drawCtdChart(canvas, currentDepthM) {
      if (!canvas || !lastCtdCast) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(2, 13, 24, 0.92)';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(130, 222, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < w; gx += 52) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 22; gy < h; gy += 22) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      const bins = lastCtdCast.bins;
      if (!bins || bins.length < 2) return;
      const minD = lastCtdCast.minDepthM;
      const maxD = Math.max(minD + 5, lastCtdCast.maxDepthM);

      let minT = Infinity, maxT = -Infinity;
      for (let i = 0; i < bins.length; i++) {
        if (bins[i].tempC < minT) minT = bins[i].tempC;
        if (bins[i].tempC > maxT) maxT = bins[i].tempC;
      }
      if (maxT - minT < 3) { minT -= 1.5; maxT += 1.5; }

      const padL = 8, padR = 8, padT = 8, padB = 8;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;
      const yForD = (d) => padT + OC.clamp((d - minD) / (maxD - minD), 0, 1) * plotH;

      // Линия термоклина
      if (lastCtdCast.thermoclineM > minD + 4 && lastCtdCast.thermoclineM < maxD - 4) {
        const ty = yForD(lastCtdCast.thermoclineM);
        ctx.strokeStyle = 'rgba(255, 181, 116, 0.32)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(padL, ty); ctx.lineTo(w - padR, ty); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Кривая O2 (бирюзовая)
      ctx.strokeStyle = '#58e0ff';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      for (let i = 0; i < bins.length; i++) {
        const b = bins[i];
        const x = padL + OC.clamp((b.o2 - 1.0) / 11.5, 0, 1) * plotW;
        const y = yForD(b.depthM);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Кривая температуры (янтарная)
      ctx.strokeStyle = '#ffb574';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let i = 0; i < bins.length; i++) {
        const b = bins[i];
        const x = padL + OC.clamp((b.tempC - minT) / (maxT - minT), 0, 1) * plotW;
        const y = yForD(b.depthM);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Отметка текущей глубины ROV
      const dNow = currentDepthM !== undefined ? currentDepthM : lastCtdCast.craftDepthM;
      const ry = yForD(dNow);
      ctx.strokeStyle = 'rgba(91, 232, 176, 0.72)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(padL, ry); ctx.lineTo(w - padR, ry); ctx.stroke();
      ctx.fillStyle = '#5be8b0';
      ctx.beginPath(); ctx.arc(padL + 6, ry, 3.2, 0, Math.PI * 2); ctx.fill();
    },

    grabSample(biome, pos, fwd, labState) {
      if (!biome || !pos) return null;
      const f = fwd || _fwd.set(0, 0, 1);
      const tgt = scanManipulatorTarget(biome, pos, f, {});
      const off = biome.depthOffset || 0;
      const depthM = off + (off > 0 ? -pos.y : Math.max(0, -pos.y));
      const entry = classifySample(tgt, biome, depthM, labState, prevCraftPos, samples.length);

      samples.unshift(entry);
      if (samples.length > MAX_SAMPLES) samples.length = MAX_SAMPLES;
      if (OC.Expedition && OC.Expedition.addSample) OC.Expedition.addSample(entry);

      grabTimer = grabDuration;
      if (sampleOrb() && sampleOrb().material) {
        sampleOrb().material.color.setHex(entry.colorHex);
      }
      if (fpOrb() && fpOrb().material) {
        fpOrb().material.color.setHex(entry.colorHex);
      }
      if (tgt.kind === 'flora' && tgt.species && OC.Atlas && OC.Atlas.discover) {
        entry.isNewAtlas = !!OC.Atlas.discover(tgt.species);
      }
      if (OC.sound && OC.sound.rovServo) OC.sound.rovServo(true);
      return entry;
    },

    scanTarget(biome, pos, fwd, out) {
      return scanManipulatorTarget(biome, pos, fwd, out);
    },

    update(dt, time, camera, craftPos, yaw, pitch, speed, biome, opts) {
      opts = opts || {};
      const showCraft = !!opts.showCraft;
      const flashOn = !!opts.flashOn;
      const labState = opts.labState || null;
      if (craftPos) prevCraftPos.copy(craftPos);

      // Динамика крена и шага винтов
      let dYaw = yaw - prevYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      prevYaw = yaw;
      const turnRate = dt > 0.0001 ? dYaw / dt : 0;
      rollSmooth = OC.lerp(rollSmooth, OC.clamp(-turnRate * 0.22, -0.34, 0.34), Math.min(1, dt * 8));
      pitchSmooth = OC.lerp(pitchSmooth, OC.clamp(-pitch, -0.78, 0.78), Math.min(1, dt * 10));

      if (grabTimer > 0) grabTimer = Math.max(0, grabTimer - dt);
      const gProg = grabTimer > 0 ? 1.0 - (grabTimer / grabDuration) : 0;

      if (rovGroup && craftPos) {
        rovGroup.visible = showCraft;
        if (showCraft) {
          const hoverBob = Math.sin(time * 2.1) * 0.045;
          rovGroup.position.set(craftPos.x, craftPos.y + hoverBob, craftPos.z);
          rovGroup.rotation.set(pitchSmooth, yaw, rollSmooth);

          // Вращение маршевых и вертикального винтов
          const spin = (1.6 + speed * 2.6) * dt * 8.5;
          propAngle = (propAngle + spin) % (Math.PI * 2);
          if (propL()) propL().rotation.z = propAngle;
          if (propR()) propR().rotation.z = -propAngle;
          if (propV()) propV().rotation.y = propAngle * 0.7;

          // Проблесковый маяк и светодиодные фары
          if (strobeMat()) {
            const pulse = Math.pow(Math.max(0, Math.sin(time * 2.8)), 16);
            strobeMat().emissiveIntensity = 0.25 + pulse * 3.2;
          }
          if (ledMat()) {
            ledMat().emissiveIntensity = flashOn ? 2.4 : 0.35;
          }

          // Анимация манипулятора 3-го лица
          if (armUpper() && armForearm() && clawL() && clawR()) {
            const reach = gProg > 0 ? Math.sin(Math.min(1, gProg * 1.15) * Math.PI) : 0;
            const pinch = gProg > 0.42 ? 1.0 : 0.0;
            armUpper().rotation.x = OC.lerp(0.38, 0.06, reach);
            armForearm().rotation.x = OC.lerp(-0.42, -0.02, reach);
            const jawAng = OC.lerp(0.32, 0.03, pinch);
            clawL().rotation.y = -jawAng;
            clawR().rotation.y = jawAng;
            if (sampleOrb()) sampleOrb().visible = gProg > 0.44 && gProg < 0.96;
            if (laserBeam()) laserBeam().visible = gProg > 0.04 && gProg < 0.56;
          }
        }
      }

      // Манипулятор 1-го лица при взятии пробы без переключения на вид ROV
      if (fpArmGroup && camera) {
        const showFp = !!(!showCraft && grabTimer > 0 && camera);
        fpArmGroup.visible = showFp;
        if (showFp) {
          fpArmGroup.position.copy(camera.position);
          fpArmGroup.quaternion.copy(camera.quaternion);
          const reach = Math.sin(Math.min(1, gProg * 1.12) * Math.PI);
          const pinch = gProg > 0.44 ? 1.0 : 0.0;
          fpUpper().position.set(OC.lerp(0.58, 0.24, reach), OC.lerp(-0.58, -0.22, reach), OC.lerp(-0.10, -0.46, reach));
          fpUpper().rotation.set(OC.lerp(-0.22, 0.08, reach), OC.lerp(0.25, 0.16, reach), 0);
          fpForearm().rotation.x = OC.lerp(0.35, -0.04, reach);
          const jawAng = OC.lerp(0.36, 0.04, pinch);
          fpClawL().rotation.y = -jawAng;
          fpClawR().rotation.y = jawAng;
          if (fpOrb()) fpOrb().visible = gProg > 0.45 && gProg < 0.96;
        }
      }

      updateWakeFx(fxCtx, dt, craftPos || camera.position, speed, showCraft);
      updateCurrentsFx(fxCtx, dt, time, craftPos || camera.position, biome, labState);
      updateTether({ tetherLine, tetherState, tetherPos, tetherCol, TETHER_SEGS, _currTmp }, craftPos || (camera ? camera.position : null), biome, time, showCraft, labState);

      updateBuoys(buoyMeshes, buoys, time);
    },

    deployBuoy(biome, pos, yaw) {
      if (!biome || !pos) return null;
      const fl = biome.getHeight(pos.x, pos.z);
      const settledY = Math.max(fl + 1.15, (pos.y - fl > 26 && biome.noSurface) ? (pos.y - 1.5) : (fl + 1.15));
      const off = biome.depthOffset || 0;
      const depthM = Math.max(0, off + (off > 0 ? -settledY : Math.max(0, -settledY)));
      buoySeq++;
      const entry = {
        id: buoySeq,
        slot: buoys.length < MAX_BUOYS ? buoys.length + 1 : 1,
        label: 'Буй-станция №' + buoySeq,
        biomeId: biome.id,
        x: Number(pos.x.toFixed(1)),
        y: Number(settledY.toFixed(1)),
        z: Number(pos.z.toFixed(1)),
        yaw: typeof yaw === 'number' ? yaw : 0,
        depthM: Number(depthM.toFixed(1))
      };
      if (buoys.length >= MAX_BUOYS) buoys.shift();
      buoys.push(entry);
      if (OC.sound && OC.sound.rovServo) OC.sound.rovServo(true);
      return entry;
    },

    recallBuoys() {
      const n = buoys.length;
      buoys.length = 0;
      for (let i = 0; i < buoyMeshes.length; i++) buoyMeshes[i].visible = false;
      if (n > 0 && OC.sound && OC.sound.rovServo) OC.sound.rovServo(false);
      return n;
    },

    getBuoys: () => buoys.slice(),
    getTetherState: () => tetherState,
    getMesh: () => rovGroup,
    getWakeCount: () => WAKE_COUNT,
    getStreamCount: () => STREAM_COUNT
  };
})(window.OC);
