/* ================= ЛИДАР: ЗАПАСНОЙ КАНАЛ ИЗОБРАЖЕНИЯ ================= */
/* Подводный сканирующий лидар (532 нм — зелёное окно прозрачности воды).
   Он нужен там, где прожектор больше не светит: прибор строит изображение
   сам, не требуя подсветки сцены.

   Устройство настоящее, а не «зелёный фильтр поверх кадра»: сканирующее
   зеркало за проход обновляет несколько столбцов сетки, луч уходит в воду и
   возвращается первой же поверхностью — дном, сводом пещеры, ледовым
   панцирем, рыбой. Поэтому лидар видит именно то, что перед аппаратом, а не
   яркость уже нарисованной картинки.

   Дальность прибора определяется водой: луч гаснет на оба конца (туда и
   обратно), поэтому предел там, где exp(-2·c·d)/d² опускается ниже порога
   приёма. В прозрачном Байкале это десятки метров, в брайниковом рассоле —
   считанные.

   Координаты: облако стоит в локальных координатах сцены (как рельеф и
   флора), сам объект помечен noFloatingOrigin, а при переносе начала
   координат буфер сдвигается на дельту — иначе всё облако уехало бы вместе
   со сценой. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  /* Сетка развёртки. Полный проход — COLS / COLS_PER_FRAME кадров, то есть
     около четверти секунды: это и есть частота обновления облака. */
  const COLS = 64;
  const ROWS = 26;
  const CELLS = COLS * ROWS;
  const COLS_PER_FRAME = 3;
  /* Порог приёма: возврат exp(-2·c·d)/d² — ослабление на оба конца (туда и
     обратно) плюс геометрический спад плотности потока. Ниже порога сигнал
     теряется в помехе. */
  const NOISE_FLOOR = 1.9e-5;
  /* Помеха — обратное рассеяние импульса самой толщей воды: она растёт с
     мутностью и именно она (а не шум приёмника) слепит лидар в мути. */
  const BACKSCATTER_C = 0.004;
  const BACKSCATTER_EXP = 2.4;
  /* Потолок — энергия импульса компактного прибора: в самой прозрачной воде
     лазер упирается уже не в воду, а в собственный бюджет. */
  const RANGE_CAP = 120;
  const MIN_RANGE = 4;

  let sceneRef = null;
  let points = null;
  let geo = null;
  let mat = null;
  let shiftOff = null;
  let active = false;

  const pos = new Float32Array(CELLS * 3);
  const aDist = new Float32Array(CELLS);
  const aKind = new Float32Array(CELLS);
  const aFresh = new Float32Array(CELLS);
  const cellDist = new Float32Array(CELLS); // 0 — возврата нет
  const cellKind = new Uint8Array(CELLS);   // 0 дно · 1 свод · 2 объект · 3 взвесь

  let cursorCol = 0;
  let rangeM = 40;
  let lastAtten = 0.007;
  let rangeTimer = 0;
  let lastPointCount = 0;

  const _dir = new T.Vector3();
  const _inv = new T.Quaternion();
  const _local = new T.Vector3();
  let _hitD = 0;
  let _hitKind = 0;

  /* Предельная дальность: самая далёкая дистанция, на которой контраст
     возврата ещё выше помехи. В прозрачной воде прибор упирается в энергию
     импульса, в мутной — в собственное обратное рассеяние. */
  function detectionRange(atten) {
    const c = Math.max(0.0002, atten || 0.007);
    const noise = NOISE_FLOOR * Math.pow(1 + c / BACKSCATTER_C, BACKSCATTER_EXP);
    let best = MIN_RANGE;
    for (let d = MIN_RANGE; d <= 240; d += 1) {
      if (Math.exp(-2 * c * d) / (d * d) >= noise) best = d;
      else break;
    }
    return Math.min(RANGE_CAP, best);
  }

  /* Один луч: грубый марш, затем половинное деление. Возвращает true, если
     луч встретил поверхность; результат кладётся в _hitD / _hitKind. */
  function marchRay(camPos, dir, biome, ox, oy, oz, range, hasCeil) {
    const steps = 18;
    const step = range / steps;
    for (let i = 1; i <= steps; i++) {
      const d = step * i;
      const wx = camPos.x + dir.x * d + ox;
      const wy = camPos.y + dir.y * d + oy;
      const wz = camPos.z + dir.z * d + oz;
      let kind = -1;
      if (wy <= biome.getHeight(wx, wz)) kind = 0;
      else if (hasCeil) {
        const ch = biome.getCeilingHeight(wx, wz);
        if (ch < 30.0 && wy >= ch) kind = 1;
      }
      if (kind < 0) continue;

      // Половинное деление: четыре итерации дают точность step/16
      let a = d - step;
      let b = d;
      for (let k = 0; k < 4; k++) {
        const m = (a + b) * 0.5;
        const mx = camPos.x + dir.x * m + ox;
        const my = camPos.y + dir.y * m + oy;
        const mz = camPos.z + dir.z * m + oz;
        const inside = kind === 0
          ? (my <= biome.getHeight(mx, mz))
          : (my >= biome.getCeilingHeight(mx, mz));
        if (inside) b = m; else a = m;
      }
      /* Небольшой отступ к сенсору: точка не должна тонуть в той самой
         геометрии, которую она описывает, иначе depth-тест её срежет. */
      _hitD = Math.max(1.2, b - 0.25);
      _hitKind = kind;
      return true;
    }
    return false;
  }

  function dirFor(col, row, tanX, tanY, quat) {
    const u = ((col + 0.5) / COLS) * 2 - 1;
    const v = ((row + 0.5) / ROWS) * 2 - 1;
    return _dir.set(u * tanX, v * tanY, -1).normalize().applyQuaternion(quat);
  }

  function writeCell(idx, camPos, dir, d, kind) {
    cellDist[idx] = d;
    cellKind[idx] = kind;
    const i3 = idx * 3;
    pos[i3] = camPos.x + dir.x * d;
    pos[i3 + 1] = camPos.y + dir.y * d;
    pos[i3 + 2] = camPos.z + dir.z * d;
    aFresh[idx] = 1;
  }

  function buildMaterial() {
    return new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: T.AdditiveBlending,
      uniforms: {
        uRange: { value: 40 },
        uSize: { value: 1.0 },
        uAlpha: { value: 1.0 }
      },
      vertexShader: `
        attribute float aDist;
        attribute float aKind;
        attribute float aFresh;
        uniform float uRange;
        uniform float uSize;
        varying vec3 vCol;
        varying float vA;
        void main() {
          if (aDist <= 0.0) {
            // Пустая ячейка: уводим точку за пределы экрана
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            vCol = vec3(0.0);
            vA = 0.0;
            return;
          }
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          /* Подтягиваем точку к сенсору в NDC: на касательных лучах отступа
             по лучу не хватает, и возврат начинает мигать в z-fighting. */
          gl_Position.z -= 0.0008 * gl_Position.w;

          /* Палитра дальности: близкий возврат почти белый, средний —
             изумрудный (рабочая длина волны 532 нм), дальний — тёмно-зелёный. */
          float t = clamp(aDist / uRange, 0.0, 1.0);
          vec3 nearC = vec3(0.80, 1.00, 0.98);
          vec3 midC  = vec3(0.34, 1.00, 0.62);
          vec3 farC  = vec3(0.08, 0.58, 0.40);
          vec3 col = t < 0.5 ? mix(nearC, midC, t * 2.0) : mix(midC, farC, (t - 0.5) * 2.0);
          if (aKind > 1.5 && aKind < 2.5) col = vec3(1.00, 0.82, 0.38);  // объект: тёплый возврат
          else if (aKind > 2.5) col = vec3(0.42, 0.66, 0.62);            // взвесь: тусклый

          // Ослабление на трассе «туда-обратно»: дальние возвраты гаснут
          float atten = exp(-2.4 * t);
          /* Свежие столбцы развёртки светятся — видно, где сейчас луч. Старые
             возвраты остаются в облаке призрачной памятью и гаснут за полторы секунды. */
          float sweep = 0.35 + 0.90 * aFresh;
          vCol = col * (0.30 + 0.70 * atten) * sweep;
          vA = (0.26 + 0.74 * atten) * (0.12 + 0.88 * aFresh);
          gl_PointSize = clamp(uSize * 190.0 / max(3.0, -mv.z), 1.6, 6.4) * (0.85 + 0.5 * aFresh);
        }
      `,
      fragmentShader: `
        uniform float uAlpha;
        varying vec3 vCol;
        varying float vA;
        void main() {
          if (vA < 0.01) discard;
          vec2 uv = gl_PointCoord - vec2(0.5);
          float r2 = dot(uv, uv);
          if (r2 > 0.25) discard;
          float core = smoothstep(0.25, 0.02, r2);
          gl_FragColor = vec4(vCol, uAlpha * vA * core);
        }
      `
    });
  }

  function onShift(delta) {
    if (!geo) return;
    const o = pos;
    for (let i = 0; i < CELLS; i++) {
      const i3 = i * 3;
      o[i3] -= delta.x;
      o[i3 + 2] -= delta.z;
    }
    geo.attributes.position.needsUpdate = true;
  }

  OC.Lidar = {
    init(scene) {
      if (shiftOff) { shiftOff(); shiftOff = null; }
      if (points && sceneRef) {
        sceneRef.remove(points);
        if (geo) geo.dispose();
        if (mat) mat.dispose();
      }
      sceneRef = scene || null;
      geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('aDist', new T.BufferAttribute(aDist, 1));
      geo.setAttribute('aKind', new T.BufferAttribute(aKind, 1));
      geo.setAttribute('aFresh', new T.BufferAttribute(aFresh, 1));
      geo.setDrawRange(0, CELLS);
      mat = buildMaterial();
      points = new T.Points(geo, mat);
      points.frustumCulled = false;
      /* Облако стоит в локальных координатах сцены: перенос начала координат
         обрабатываем сами (сдвиг буфера), а не обходом сцены. */
      points.userData.noFloatingOrigin = true;
      points.visible = false;
      for (let i = 0; i < CELLS; i++) { cellDist[i] = 0; cellKind[i] = 0; aFresh[i] = 0; }
      if (scene) scene.add(points);
      shiftOff = (OC.FloatingOrigin && OC.FloatingOrigin.onShift) ? OC.FloatingOrigin.onShift(onShift) : null;
      return points;
    },

    isActive: () => active,

    setActive(on) {
      active = !!on;
      if (points) points.visible = active;
      return active;
    },

    toggle() {
      return this.setActive(!active);
    },

    /* Развёртка и пересчёт облака. Вызывается каждый кадр, пока лидар включён.
       fauna — активная фауна: её агенты попадают в облако как объекты. */
    update(dt, camera, biome, opts) {
      opts = opts || {};
      if (!active || !biome || !geo || !camera) return;
      const camPos = camera.position; // локальные координаты сцены
      const o = OC.FloatingOrigin ? OC.FloatingOrigin.getOrigin() : null;
      const ox = o ? o.x : 0;
      const oy = o ? o.y : 0;
      const oz = o ? o.z : 0;

      /* 1. Дальность прибора: вода меняется от биома и от погоды, но
         пересчитывать предел каждый кадр незачем. */
      rangeTimer -= dt;
      if (rangeTimer <= 0) {
        rangeTimer = 0.4;
        const prof = biome.getOpticalProfile
          ? biome.getOpticalProfile(camPos.x + ox, camPos.y + oy, camPos.z + oz, OC.getTimeOfDay ? OC.getTimeOfDay() : 0.5)
          : null;
        lastAtten = (prof && Number.isFinite(prof.fogDensity)) ? prof.fogDensity : 0.007;
        rangeM = detectionRange(lastAtten);
      }
      if (mat) mat.uniforms.uRange.value = rangeM;

      const hasCeil = !!biome.getCeilingHeight;
      const tanY = Math.tan((camera.fov || 60) * Math.PI / 360);
      const tanX = tanY * (camera.aspect || 1.7);
      const quat = camera.quaternion;

      /* 2. Свежесть: столбцы, обновлённые в этом кадре, светятся, остальные
         гаснут — так видна развёртка. */
      const decay = Math.exp(-dt * 2.1);
      for (let i = 0; i < CELLS; i++) aFresh[i] *= decay;

      /* 3. Развёртка: несколько столбцов за кадр */
      const from = cursorCol;
      for (let c = 0; c < COLS_PER_FRAME; c++) {
        const col = (cursorCol + c) % COLS;
        for (let row = 0; row < ROWS; row++) {
          const idx = col * ROWS + row;
          dirFor(col, row, tanX, tanY, quat);
          if (marchRay(camPos, _dir, biome, ox, oy, oz, rangeM, hasCeil)) {
            writeCell(idx, camPos, _dir, _hitD, _hitKind);
          } else {
            cellDist[idx] = 0;
            aFresh[idx] = 1;
          }
        }
      }
      cursorCol = (cursorCol + COLS_PER_FRAME) % COLS;

      /* 4. Объекты: агенты фауны проецируются в сетку, но попадают в облако
         только когда развёртка дошла до их столбца — иначе рыба появлялась бы
         раньше луча. */
      const fauna = opts.fauna;
      if (fauna && fauna.agents) {
        _inv.copy(quat).invert();
        for (let i = 0; i < fauna.agents.length; i++) {
          const ag = fauna.agents[i];
          if (!ag || !ag.getPosition) continue;
          const p = ag.getPosition();
          if (!p) continue;
          _local.set(p.x - camPos.x, p.y - camPos.y, p.z - camPos.z);
          const dist = _local.length();
          if (dist > rangeM || dist < 1.0) continue;
          _local.applyQuaternion(_inv);
          if (_local.z > -0.5) continue; // позади сенсора: в камере вперёд это -Z
          const u = (_local.x / -_local.z) / tanX;
          const v = (_local.y / -_local.z) / tanY;
          if (u < -1 || u > 1 || v < -1 || v > 1) continue;
          const col = Math.min(COLS - 1, Math.max(0, Math.floor((u + 1) * 0.5 * COLS)));
          const row = Math.min(ROWS - 1, Math.max(0, Math.floor((v + 1) * 0.5 * ROWS)));
          if (!refreshed(col, from)) continue;
          const idx = col * ROWS + row;
          if (cellDist[idx] === 0 || dist < cellDist[idx]) {
            cellDist[idx] = dist;
            cellKind[idx] = 2;
            const i3 = idx * 3;
            pos[i3] = p.x;
            pos[i3 + 1] = p.y;
            pos[i3 + 2] = p.z;
            aFresh[idx] = 1;
          }
        }
      }

      /* 5. Объёмное рассеяние: взвесь и «морской снег» дают ближние ложные
         возвраты — чем мутнее вода, тем их больше. Настоящий прибор именно
         так и «слепнет» в мути. */
      const noiseN = Math.round(OC.lerp(3, 24, OC.clamp((lastAtten - 0.002) / 0.018, 0, 1)));
      for (let i = 0; i < noiseN; i++) {
        const col = (from + Math.floor(Math.random() * COLS_PER_FRAME)) % COLS;
        const row = Math.floor(Math.random() * ROWS);
        const idx = col * ROWS + row;
        if (cellDist[idx] > 0 && Math.random() < 0.65) continue;
        const d = 1.5 + Math.random() * rangeM * 0.45;
        dirFor(col, row, tanX, tanY, quat);
        writeCell(idx, camPos, _dir, d, 3);
      }

      /* 6. Выгрузка в буферы */
      let n = 0;
      for (let i = 0; i < CELLS; i++) {
        aDist[i] = cellDist[i];
        aKind[i] = cellKind[i];
        if (cellDist[i] > 0) n++;
      }
      lastPointCount = n;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aDist.needsUpdate = true;
      geo.attributes.aKind.needsUpdate = true;
      geo.attributes.aFresh.needsUpdate = true;
    },

    /* Размер точек и яркость — под профиль качества и размер экрана. */
    setQuality(scale) {
      if (mat) mat.uniforms.uSize.value = scale || 1.0;
    },

    getState() {
      return {
        active,
        rangeM,
        points: lastPointCount,
        cells: CELLS,
        atten: lastAtten,
        sweep: cursorCol / COLS
      };
    },

    /* Только для тестов: предел дальности по коэффициенту ослабления воды. */
    _detectionRange: detectionRange
  };

  function refreshed(col, from) {
    for (let c = 0; c < COLS_PER_FRAME; c++) {
      if (((from + c) % COLS) === col) return true;
    }
    return false;
  }
})(window.OC);
