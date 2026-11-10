/* ================= 3D-МУЛЬТИЛУЧЕВОЙ БАТИМЕТРИЧЕСКИЙ СОНАР И ПОЛЕ ОТРАЖЕНИЯ ДНА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const BEAMS = 34;
  const RINGS = 44;
  const MAX_GRID_PTS = BEAMS * RINGS; // 1496 точек дна (+ до 1496 точек свода пещеры)
  const MAX_PTS = MAX_GRID_PTS * 2;
  // Соединительные линии: вдоль лучей (BEAMS * (RINGS - 1)) + дуги по дальности ((BEAMS - 1) * RINGS)
  const MAX_SEGS = BEAMS * (RINGS - 1) + (BEAMS - 1) * RINGS;
  const SCAN_DURATION = 8.4;
  const SWEEP_TIME = 1.15;
  const HALF_FOV = 0.88; // ~50° в каждую сторону (ширина полосы 100°)

  let sceneRef = null;
  let rootGroup = null;
  let ptsMesh = null;
  let linesMesh = null;
  let fanMesh = null;
  let ptsGeo = null;
  let linesGeo = null;
  let fanGeo = null;

  let active = false;
  let scanAge = 0;
  let maxRangeRef = 165;
  let lastPointCount = 0;
  let hasCeilingScan = false;

  const originUniform = new T.Vector3();
  const waveUniform = { value: 0 };
  const alphaUniform = { value: 0 };

  const _col = new T.Color();
  const _colShallow = new T.Color(0x5be8b0);
  const _colMid = new T.Color(0x38d8ff);
  const _colDeep = new T.Color(0x3a64e8);
  const _colAbyss = new T.Color(0xa25bff);
  const _colCeil = new T.Color(0xffb454);

  function hypsometricColor(relY, out) {
    // Градиент глубины относительно сенсора/дна для мгновенного чтения рельефа
    const t = OC.clamp((-relY - 4) / 72, 0, 1);
    if (t < 0.34) out.copy(_colShallow).lerp(_colMid, t / 0.34);
    else if (t < 0.72) out.copy(_colMid).lerp(_colDeep, (t - 0.34) / 0.38);
    else out.copy(_colDeep).lerp(_colAbyss, (t - 0.72) / 0.28);
    return out;
  }

  function createScanMaterials() {
    const commonVert = `
      uniform vec3 uOrigin;
      uniform float uWave;
      varying float vReveal;
      varying vec3 vColor;
      varying float vDist;
      void main() {
        vColor = color;
        float d = length(position.xz - uOrigin.xz);
        vDist = d;
        // Плавная вспышка при прохождении фронта звуковой волны
        vReveal = 1.0 - smoothstep(uWave - 6.0, uWave + 1.5, d);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(240.0 / max(4.0, -mv.z), 2.5, 6.8) * vReveal;
        gl_Position = projectionMatrix * mv;
      }
    `;

    const ptsMat = new T.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: {
        uOrigin: { value: originUniform },
        uWave: waveUniform,
        uAlpha: alphaUniform
      },
      vertexShader: commonVert,
      fragmentShader: `
        uniform float uWave;
        uniform float uAlpha;
        varying float vReveal;
        varying vec3 vColor;
        varying float vDist;
        void main() {
          if (vReveal < 0.02 || uAlpha < 0.01) discard;
          vec2 uv = gl_PointCoord - vec2(0.5);
          float r2 = dot(uv, uv);
          if (r2 > 0.25) discard;
          float core = smoothstep(0.25, 0.02, r2);
          float ringBoost = exp(-pow((vDist - uWave) * 0.16, 2.0)) * 0.85;
          vec3 col = mix(vColor, vec3(0.85, 1.0, 1.0), clamp(ringBoost, 0.0, 0.75));
          float a = uAlpha * vReveal * core * (0.85 + ringBoost);
          gl_FragColor = vec4(col, a);
        }
      `
    });

    const lineMat = new T.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: {
        uOrigin: { value: originUniform },
        uWave: waveUniform,
        uAlpha: alphaUniform
      },
      vertexShader: commonVert,
      fragmentShader: `
        uniform float uWave;
        uniform float uAlpha;
        varying float vReveal;
        varying vec3 vColor;
        varying float vDist;
        void main() {
          if (vReveal < 0.02 || uAlpha < 0.01) discard;
          float ringBoost = exp(-pow((vDist - uWave) * 0.14, 2.0)) * 0.65;
          vec3 col = mix(vColor, vec3(0.75, 0.98, 1.0), clamp(ringBoost, 0.0, 0.7));
          gl_FragColor = vec4(col, uAlpha * vReveal * (0.34 + ringBoost * 0.45));
        }
      `
    });

    const fanMat = new T.MeshBasicMaterial({
      color: 0x58e8ff,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide
    });

    return { ptsMat, lineMat, fanMat };
  }

  function disposeGroup() {
    if (!rootGroup) return;
    if (ptsGeo) ptsGeo.dispose();
    if (linesGeo) linesGeo.dispose();
    if (fanGeo) fanGeo.dispose();
    if (ptsMesh && ptsMesh.material) ptsMesh.material.dispose();
    if (linesMesh && linesMesh.material) linesMesh.material.dispose();
    if (fanMesh && fanMesh.material) fanMesh.material.dispose();
    if (sceneRef) sceneRef.remove(rootGroup);
    rootGroup = null;
    ptsMesh = null;
    linesMesh = null;
    fanMesh = null;
    ptsGeo = null;
    linesGeo = null;
    fanGeo = null;
  }

  OC.Sonar = {
    init(scene) {
      disposeGroup();
      sceneRef = scene;
      rootGroup = new T.Group();
      rootGroup.visible = false;

      const mats = createScanMaterials();

      // 1. Буфер точек батиметрической решётки (дно + свод пещеры при наличии)
      ptsGeo = new T.BufferGeometry();
      ptsGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(MAX_PTS * 3), 3));
      ptsGeo.setAttribute('color', new T.BufferAttribute(new Float32Array(MAX_PTS * 3), 3));
      ptsGeo.setDrawRange(0, 0);
      ptsMesh = new T.Points(ptsGeo, mats.ptsMat);
      ptsMesh.frustumCulled = false;
      rootGroup.add(ptsMesh);

      // 2. Буфер каркасных изогипс и лучей мультилуча
      linesGeo = new T.BufferGeometry();
      linesGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(MAX_SEGS * 6), 3));
      linesGeo.setAttribute('color', new T.BufferAttribute(new Float32Array(MAX_SEGS * 6), 3));
      linesGeo.setDrawRange(0, 0);
      linesMesh = new T.LineSegments(linesGeo, mats.lineMat);
      linesMesh.frustumCulled = false;
      rootGroup.add(linesMesh);

      // 3. Передний конус-веер мультилучевого сканирования (Fan Swath)
      fanGeo = new T.BufferGeometry();
      fanGeo.setAttribute('position', new T.BufferAttribute(new Float32Array((BEAMS + 1) * 3), 3));
      const fanIdx = [];
      for (let b = 1; b < BEAMS; b++) {
        fanIdx.push(0, b, b + 1);
      }
      fanGeo.setIndex(fanIdx);
      fanMesh = new T.Mesh(fanGeo, mats.fanMat);
      fanMesh.frustumCulled = false;
      rootGroup.add(fanMesh);

      scene.add(rootGroup);
      active = false;
      scanAge = 0;
      return rootGroup;
    },

    triggerScan(biome, originPos, yaw, maxRange) {
      if (!biome || !originPos) return null;
      maxRangeRef = maxRange || 165;
      originUniform.copy(originPos);
      scanAge = 0;
      waveUniform.value = 2.0;
      alphaUniform.value = 1.0;
      active = true;
      hasCeilingScan = false;

      // Сразу открываем полосу на мини-карте ("Туман войны")
      if (OC.Minimap && OC.Minimap.revealSwath) {
        OC.Minimap.revealSwath(originPos.x, originPos.z, yaw, maxRangeRef * 1.15, HALF_FOV + 0.08);
      }

      if (!rootGroup || !ptsGeo || !linesGeo || !fanGeo) {
        return { pointCount: MAX_GRID_PTS, range: maxRangeRef };
      }

      const pPos = ptsGeo.attributes.position.array;
      const pCol = ptsGeo.attributes.color.array;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);

      // Временная сетка координат рельефа без выделения объектов (zero-GC)
      let pIdx = 0;
      for (let b = 0; b < BEAMS; b++) {
        const u = (b / (BEAMS - 1)) * 2 - 1;
        const ang = u * HALF_FOV;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const dx = fx * ca + rx * sa;
        const dz = fz * ca + rz * sa;

        for (let r = 0; r < RINGS; r++) {
          const dist = 10 + (r / (RINGS - 1)) * (maxRangeRef - 10);
          const wx = originPos.x + dx * dist;
          const wz = originPos.z + dz * dist;
          const wy = biome.getHeight(wx, wz) + 0.22;

          const i3 = pIdx * 3;
          pPos[i3] = wx;
          pPos[i3 + 1] = wy;
          pPos[i3 + 2] = wz;

          hypsometricColor(wy, _col);
          pCol[i3] = _col.r;
          pCol[i3 + 1] = _col.g;
          pCol[i3 + 2] = _col.b;
          pIdx++;
        }
      }

      // При наличии пещерного свода (cenote_caves) второй проход сканирует потолок янтарно-золотыми точками
      if (biome.getCeilingHeight) {
        for (let b = 0; b < BEAMS; b++) {
          const u = (b / (BEAMS - 1)) * 2 - 1;
          const ang = u * HALF_FOV;
          const dx = fx * Math.cos(ang) + rx * Math.sin(ang);
          const dz = fz * Math.cos(ang) + rz * Math.sin(ang);
          for (let r = 0; r < RINGS; r++) {
            const dist = 10 + (r / (RINGS - 1)) * (maxRangeRef - 10);
            const wx = originPos.x + dx * dist;
            const wz = originPos.z + dz * dist;
            const ch = biome.getCeilingHeight(wx, wz);
            if (ch < 20.0) {
              hasCeilingScan = true;
              const i3 = pIdx * 3;
              pPos[i3] = wx;
              pPos[i3 + 1] = ch - 0.18;
              pPos[i3 + 2] = wz;
              pCol[i3] = _colCeil.r;
              pCol[i3 + 1] = _colCeil.g;
              pCol[i3 + 2] = _colCeil.b;
              pIdx++;
            }
          }
        }
      }

      lastPointCount = pIdx;
      ptsGeo.setDrawRange(0, pIdx);
      ptsGeo.attributes.position.needsUpdate = true;
      ptsGeo.attributes.color.needsUpdate = true;

      // Построение каркасной батиметрической сетки (продольные лучи + поперечные дуги)
      const lPos = linesGeo.attributes.position.array;
      const lCol = linesGeo.attributes.color.array;
      let seg = 0;

      // Лучи по дальности
      for (let b = 0; b < BEAMS; b++) {
        for (let r = 0; r < RINGS - 1; r++) {
          const a = (b * RINGS + r) * 3;
          const c = (b * RINGS + r + 1) * 3;
          const s6 = seg * 6;
          lPos[s6] = pPos[a]; lPos[s6 + 1] = pPos[a + 1]; lPos[s6 + 2] = pPos[a + 2];
          lPos[s6 + 3] = pPos[c]; lPos[s6 + 4] = pPos[c + 1]; lPos[s6 + 5] = pPos[c + 2];
          lCol[s6] = pCol[a]; lCol[s6 + 1] = pCol[a + 1]; lCol[s6 + 2] = pCol[a + 2];
          lCol[s6 + 3] = pCol[c]; lCol[s6 + 4] = pCol[c + 1]; lCol[s6 + 5] = pCol[c + 2];
          seg++;
        }
      }

      // Дуги через соседние лучи (каждые 2 кольца — чёткая топографическая читаемость)
      for (let r = 0; r < RINGS; r += 2) {
        for (let b = 0; b < BEAMS - 1; b++) {
          const a = (b * RINGS + r) * 3;
          const c = ((b + 1) * RINGS + r) * 3;
          const s6 = seg * 6;
          lPos[s6] = pPos[a]; lPos[s6 + 1] = pPos[a + 1]; lPos[s6 + 2] = pPos[a + 2];
          lPos[s6 + 3] = pPos[c]; lPos[s6 + 4] = pPos[c + 1]; lPos[s6 + 5] = pPos[c + 2];
          lCol[s6] = pCol[a]; lCol[s6 + 1] = pCol[a + 1]; lCol[s6 + 2] = pCol[a + 2];
          lCol[s6 + 3] = pCol[c]; lCol[s6 + 4] = pCol[c + 1]; lCol[s6 + 5] = pCol[c + 2];
          seg++;
        }
      }

      linesGeo.setDrawRange(0, seg * 2);
      linesGeo.attributes.position.needsUpdate = true;
      linesGeo.attributes.color.needsUpdate = true;

      // Веер-конус луча от аппарата к дуге
      const fPos = fanGeo.attributes.position.array;
      fPos[0] = originPos.x;
      fPos[1] = originPos.y - 0.35;
      fPos[2] = originPos.z;
      for (let b = 0; b < BEAMS; b++) {
        const lastIdx = (b * RINGS + (RINGS - 1)) * 3;
        const f3 = (b + 1) * 3;
        fPos[f3] = pPos[lastIdx];
        fPos[f3 + 1] = pPos[lastIdx + 1] + 0.45;
        fPos[f3 + 2] = pPos[lastIdx + 2];
      }
      fanGeo.attributes.position.needsUpdate = true;
      fanMesh.visible = true;
      fanMesh.material.opacity = 0.16;

      rootGroup.visible = true;
      return { pointCount: lastPointCount, range: maxRangeRef, hasCeiling: hasCeilingScan };
    },

    update(dt) {
      if (!active) return;
      scanAge += Math.max(0, dt || 0.016);
      if (scanAge >= SCAN_DURATION) {
        active = false;
        waveUniform.value = 0;
        alphaUniform.value = 0;
        if (rootGroup) rootGroup.visible = false;
        return;
      }

      const sweepT = OC.clamp(scanAge / SWEEP_TIME, 0, 1);
      waveUniform.value = 4 + sweepT * maxRangeRef;

      // Секторный луч ярко светится во время импульса (~1.8 с), а облако рельефа держится 8.4 с
      if (fanMesh && fanMesh.material) {
        const fanAlpha = scanAge < 1.9 ? (1.0 - OC.smoothstep(0.6, 1.9, scanAge)) * 0.18 : 0.0;
        fanMesh.material.opacity = fanAlpha;
        fanMesh.visible = fanAlpha > 0.005;
      }

      const fadeOut = 1.0 - OC.smoothstep(SCAN_DURATION - 2.6, SCAN_DURATION, scanAge);
      alphaUniform.value = fadeOut;
    },

    clear() {
      active = false;
      scanAge = 0;
      waveUniform.value = 0;
      alphaUniform.value = 0;
      if (rootGroup) rootGroup.visible = false;
    },

    getState() {
      return {
        active,
        scanAge,
        waveRadius: waveUniform.value,
        lastRange: maxRangeRef,
        pointCount: lastPointCount,
        hasCeiling: hasCeilingScan
      };
    }
  };
})(window.OC);
