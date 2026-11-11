/* ================= ПРОТОТИП ПОДВОДНОГО ВУЛКАНА: РЕДКИЕ СОБЫТИЯ С ПРЕДВЕСТНИКАМИ ================= */
/* Отличие от чёрных курильщиков: курильщики — постоянно работающие гидротермальные
   шпили с вечными шлейфами. Подводный вулкан-сеаунд — спящий конус, который «просыпается»
   раз в несколько минут: сейсмическая активность (предвестник ~30 с), мутный шлейф,
   газовые выбросы и локальные изменения течений. Без текстовых анонсов — игрок
   замечает предвестники по гидрофону, визуальным намёкам и смене течений (как у
   фаунных herald-событий). Детерминированно через OC.mulberry32. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  /* Сайт вулкана в биоме чёрных курильщиков (далеко от пяти полей курильщиков) */
  const SITE = { x: -360, z: 180, r: 92, peakY: -18.5, craterR: 15, craterD: 5.5 };

  const PHASE_LABELS = {
    idle: '',
    seismic: 'Сейсмическая активность',
    eruption: 'Извержение · шлейф и газ',
    cooling: 'Остывание вулкана'
  };

  const DURATIONS = { seismic: 30, eruption: 14, cooling: 16 };
  const EVENT_TOTAL = DURATIONS.seismic + DURATIONS.eruption + DURATIONS.cooling;

  const state = {
    phase: 'idle',
    timer: 0,
    progress: 0,
    intensity: 0,
    shake: 0,
    cooldownUntil: 0,
    rng: OC.mulberry32(0x5137a1)
  };

  let scene = null;
  let biome = null;
  let group = null;
  let gasPlume = null;   // шлейф газа через makeVentPlume (coldSeep-палитра)
  let turb = null;       // шлейф взвеси (малая CPU-система, 1 draw call)
  let craterLight = null;
  let rimMesh = null;
  let dustAccum = 0;
  let turbAccum = 0;

  const _flow = new T.Vector3();
  const _shakeTmp = { x: 0, y: 0, z: 0 };
  const _tremorTmp = { active: false, strength: 0, x: 0, y: 0, z: 0 };

  OC.volcanoInfo = { phase: 'idle', event: null, progress: 0, intensity: 0, label: '' };

  /* ---------- Малая система шлейфа взвеси: взлёт, разбухание, дрейф по течению ---------- */
  function makeTurbidityPlume(scene, n, tex) {
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const life = new Float32Array(n);
    const maxLife = new Float32Array(n);
    const size = new Float32Array(n);
    const alpha = new Float32Array(n);

    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new T.BufferAttribute(size, 1));
    geo.setAttribute('aAlpha', new T.BufferAttribute(alpha, 1));

    const mat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.NormalBlending,
      fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        { uTex: { value: tex }, uScale: { value: 1.0 } }
      ]),
      vertexShader: `
        attribute float aSize, aAlpha;
        uniform float uScale;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main() {
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale * (430.0 / max(1.5, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main() {
          if (vAlpha < 0.01) discard;
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.02) discard;
          gl_FragColor = vec4(vec3(0.44, 0.42, 0.39), tx.a * vAlpha * 0.5);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.visible = false;
    scene.add(pts);

    let cursor = 0;

    function emit(count) {
      const fl = biome.getHeight(SITE.x, SITE.z) - SITE.craterD;
      for (let k = 0; k < count; k++) {
        const i = cursor;
        cursor = (cursor + 1) % n;
        const ang = Math.random() * 6.28318;
        const r = Math.random() * 6.0;
        const i3 = i * 3;
        pos[i3] = SITE.x + Math.cos(ang) * r;
        pos[i3 + 1] = fl + 0.6;
        pos[i3 + 2] = SITE.z + Math.sin(ang) * r;
        const spd = 1.6 + Math.random() * 2.2;
        vel[i3] = Math.cos(ang) * spd * 0.35;
        vel[i3 + 1] = spd;
        vel[i3 + 2] = Math.sin(ang) * spd * 0.35;
        const ml = 7.0 + Math.random() * 5.0;
        life[i] = ml;
        maxLife[i] = ml;
        size[i] = 1.8 + Math.random() * 2.6;
        alpha[i] = 0.05;
      }
      pts.visible = true;
    }

    function update(dt, time, camPos) {
      const fl = biome.getHeight(SITE.x, SITE.z) - SITE.craterD;
      const camD = Math.hypot(camPos.x - SITE.x, camPos.z - SITE.z);
      pts.visible = pts.visible && camD < 420;
      if (!pts.visible) return 0;
      if (biome.getCurrentAt) biome.getCurrentAt(SITE.x, fl, SITE.z, time, _flow);
      let alive = 0;
      for (let i = 0; i < n; i++) {
        const l = life[i];
        if (l <= 0) { alpha[i] = 0; continue; }
        const nl = l - dt;
        life[i] = nl;
        if (nl <= 0) { alpha[i] = 0; continue; }
        const i3 = i * 3;
        vel[i3] = vel[i3] * 0.97 + _flow.x * 0.22 * dt;
        vel[i3 + 1] = vel[i3 + 1] * 0.985 - 0.05 * dt; // медленно оседает обратно
        vel[i3 + 2] = vel[i3 + 2] * 0.97 + _flow.z * 0.22 * dt;
        pos[i3] += vel[i3] * dt;
        pos[i3 + 1] += vel[i3 + 1] * dt;
        pos[i3 + 2] += vel[i3 + 2] * dt;
        size[i] += dt * 1.1;
        const frac = nl / maxLife[i];
        alpha[i] = Math.min(0.8, frac * 1.3) * OC.smoothstep(1.0, 0.9, frac);
        alive++;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
      return alive;
    }

    return {
      pts,
      emit,
      update,
      setScale(s) { mat.uniforms.uScale.value = s; }
    };
  }

  /* ---------- Обод кратера (merged geometry, 1 draw call) ---------- */
  function buildCraterRim() {
    const list = [];
    const cRim = new T.Color(0xc99a3e);
    const cRock = new T.Color(0x4a3a2c);
    const craterY = biome.getHeight(SITE.x, SITE.z) - SITE.craterD;

    // Неровный обод кратера из сегментов тора
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const seg = new T.TorusGeometry(SITE.craterR, 0.85 + (i % 2 ? 0.2 : 0), 5, 4, (a1 - a0));
      seg.rotateX(Math.PI / 2);
      seg.rotateY(a0);
      OC.geoPrep(seg);
      OC.paint(seg, (x, y, z, c) => {
        const edge = Math.abs(Math.sin((Math.atan2(z, x) - a0) / (a1 - a0) * Math.PI * 0.5));
        c.copy(cRock).lerp(cRim, OC.smoothstep(0.25, 0.95, y + 0.6));
        c.lerp(cRim, edge * 0.3);
      });
      OC.withSway(seg, () => 0);
      OC.xform(seg, { p: [SITE.x, craterY + 0.7, SITE.z] });
      list.push(seg);
    }

    // Два жерла-фумароль на краю кратера
    for (let i = 0; i < 2; i++) {
      const a = i * Math.PI + 0.7;
      const sp = new T.CylinderGeometry(0.34, 0.72, 3.4, 8, 3, true);
      OC.geoPrep(sp);
      OC.paint(sp, (x, y, z, c) => {
        const u = OC.clamp((y + 1.7) / 3.4, 0, 1);
        c.copy(cRock).lerp(cRim, OC.smoothstep(0.4, 0.95, u));
      });
      OC.withSway(sp, () => 0);
      OC.xform(sp, {
        p: [SITE.x + Math.cos(a) * (SITE.craterR - 1.5), craterY + 1.8, SITE.z + Math.sin(a) * (SITE.craterR - 1.5)]
      });
      list.push(sp);
    }

    return OC.mergeGeometries(list);
  }

  /* ----------Машина состояния: idle → seismic → eruption → cooling → idle ---------- */

  function startPhase(phase) {
    state.phase = phase;
    state.timer = DURATIONS[phase];
    state.progress = 0;
    const sound = OC.sound;
    if (sound && typeof sound.volcanoRumble === 'function') {
      sound.volcanoRumble(phase === 'eruption' ? 0.9 : 0.45);
    }
  }

  function endEvent() {
    state.phase = 'idle';
    state.timer = 0;
    state.progress = 0;
    state.intensity = 0;
    state.shake = 0;
  }

  function update(dt, time, camPos) {
    // Проход фаз
    if (state.phase !== 'idle') {
      state.timer -= dt;
      if (state.timer <= 0) {
        state.timer = 0;
        if (state.phase === 'seismic') startPhase('eruption');
        else if (state.phase === 'eruption') startPhase('cooling');
        else if (state.phase === 'cooling') endEvent();
      }
      state.progress = 1.0 - Math.max(0, state.timer) / DURATIONS[state.phase];
    }

    // Запуск редких событий (детерминированно, без анонсов)
    if (state.phase === 'idle' && time >= state.cooldownUntil && state.rng() < 0.0006) {
      state.cooldownUntil = time + EVENT_TOTAL + 150 + state.rng() * 210; // перерыв ~2.5–6 мин
      startPhase('seismic');
    }

    // Интенсивность и дрожание
    if (state.phase === 'seismic') {
      state.intensity = 0.3 + 0.5 * state.progress;
      state.shake = OC.lerp(state.shake, 0.12 + 0.28 * state.progress, dt * 3);
    } else if (state.phase === 'eruption') {
      state.intensity = 0.85 + 0.15 * Math.sin(time * 7.3);
      state.shake = OC.lerp(state.shake, 0.55, dt * 6);
    } else if (state.phase === 'cooling') {
      state.intensity = Math.max(0, 0.7 * (1 - state.progress));
      state.shake = OC.lerp(state.shake, 0, dt * 2);
    } else {
      state.intensity = 0;
    }

    // Сейсмическая активность: выбросы пыли на склонах конуса
    if (state.phase === 'seismic') {
      dustAccum += dt;
      if (dustAccum >= 1.3) {
        dustAccum = 0;
        const ang = state.rng() * 6.283;
        const r = 28 + state.rng() * 52;
        const px = SITE.x + Math.cos(ang) * r;
        const pz = SITE.z + Math.sin(ang) * r;
        const fx = fxRef;
        if (fx && fx.silt) fx.silt.kick({ x: px, y: biome.getHeight(px, pz) - 0.5, z: pz }, 0.3 + 0.3 * state.intensity);
      }
    } else if (state.phase === 'eruption') {
      // Мутный шлейф: взлёт взвеси из кратера + регулярные kicks
      turbAccum += dt;
      if (turbAccum >= 0.35) {
        turbAccum = 0;
        if (turb) turb.emit(9);
        if (fxRef && fxRef.silt) fxRef.silt.kick({ x: SITE.x, y: biome.getHeight(SITE.x, SITE.z) - SITE.craterD, z: SITE.z }, 0.9);
      }
    }

    // Газовые выбросы: шлейф + пульсация кратера
    if (gasPlume) {
      gasPlume.update(dt, time, camPos);
      const phaseActive = state.phase !== 'idle';
      const gasFade = !(state.phase === 'cooling' && state.progress > 0.35);
      if (gasPlume.pts) gasPlume.pts.visible = phaseActive && gasFade;
      if (craterLight) {
        const target = state.phase === 'eruption' ? 2.2 + 0.9 * Math.sin(time * 7.3)
          : (state.phase === 'seismic' ? 0.7 + 0.5 * state.intensity : 0);
        craterLight.intensity = OC.lerp(craterLight.intensity, target, dt * 4);
      }
    }

    if (turb) turb.update(dt, time, camPos);

    // Подпись фазы для HUD/телеметрии
    OC.volcanoInfo.phase = state.phase;
    OC.volcanoInfo.event = state.phase === 'idle' ? null : state.phase;
    OC.volcanoInfo.progress = state.progress;
    OC.volcanoInfo.intensity = state.intensity;
    OC.volcanoInfo.label = PHASE_LABELS[state.phase];
  }

  /* ---------- Подключаемые точки ---------- */

  function getShake(t) {
    if (state.shake <= 0.005) {
      _shakeTmp.x = 0; _shakeTmp.y = 0; _shakeTmp.z = 0;
      return _shakeTmp;
    }
    const amp = state.shake * 0.3;
    _shakeTmp.x = Math.sin(t * 41.3) * amp;
    _shakeTmp.y = Math.sin(t * 37.7 + 1.7) * amp * 0.85;
    _shakeTmp.z = Math.cos(t * 44.1) * amp;
    return _shakeTmp;
  }

  function getTremor() {
    const ph = state.phase;
    _tremorTmp.active = ph === 'seismic' || ph === 'eruption';
    _tremorTmp.strength = ph === 'eruption' ? 1.0 : (ph === 'seismic' ? state.intensity : 0);
    _tremorTmp.x = SITE.x;
    _tremorTmp.y = biome.getHeight(SITE.x, SITE.z) - SITE.craterD + 1.0;
    _tremorTmp.z = SITE.z;
    return _tremorTmp;
  }

  function getCurrentBoost(x, y, z, out) {
    const ph = state.phase;
    if (ph === 'idle') return out;
    const inten = ph === 'eruption' ? 1.0
      : (ph === 'seismic' ? 0.3 + 0.4 * state.progress : Math.max(0, (1 - state.progress) * 0.8));
    const dx = x - SITE.x;
    const dz = z - SITE.z;
    const d = Math.hypot(dx, dz);
    if (d > 260) return out;
    const fl = biome.getHeight(x, z);
    const above = Math.max(0, y - fl);
    if (d < 70) {
      // Конвективная струя над кратером + радиальный вынос
      const core = OC.smoothstep(70, 7, d) * OC.smoothstep(75, 9, above);
      out.y += core * 3.4 * inten;
      const a = Math.atan2(dz, dx);
      out.x += Math.cos(a) * core * 0.85 * inten;
      out.z += Math.sin(a) * core * 0.85 * inten;
    } else {
      const a = Math.atan2(dz, dx);
      const edge = OC.smoothstep(260, 130, d);
      out.x += Math.cos(a) * edge * 0.6 * inten;
      out.z += Math.sin(a) * edge * 0.6 * inten;
    }
    return out;
  }

  let fxRef = null;

  function init(scn, bm, fx) {
    dispose();
    scene = scn;
    biome = bm;
    fxRef = fx || null;
    group = new T.Group();
    scene.add(group);

    const craterY = biome.getHeight(SITE.x, SITE.z) - SITE.craterD;

    // Обод кратера + фумаролы (1 draw call)
    const rimGeo = buildCraterRim();
    const rimMat = new T.MeshStandardMaterial({
      vertexColors: true, roughness: 0.82, metalness: 0.14, side: T.DoubleSide
    });
    rimMesh = new T.Mesh(rimGeo, rimMat);
    group.add(rimMesh);

    // Газовый шлейф (переиспользуем шлейф курильщиков с холодной палитрой)
    gasPlume = OC._FaunaBuilders.makeVentPlume(scene, biome, fx && fx.texSoft, {
      x: SITE.x, z: SITE.z, chimneyH: 5.0, height: 24, n: 140, coldSeep: true, light: false
    });
    if (gasPlume && gasPlume.pts) gasPlume.pts.visible = false;

    // Шлейф взвеси
    const q = OC.Quality.get ? OC.Quality.get() : null;
    const nScale = q && typeof q.particlesScale === 'number' ? q.particlesScale : 1.0;
    turb = makeTurbidityPlume(scene, Math.max(80, Math.round(180 * Math.min(1.3, nScale))), fx && fx.texSoft);

    // Свет кратера (пульсирует во время событий)
    craterLight = new T.PointLight(0xff6a22, 0, 80, 1.6);
    craterLight.position.set(SITE.x, craterY + 1.5, SITE.z);
    group.add(craterLight);

    return {
      update,
      dispose,
      getState: () => state,
      getSite: () => SITE,
      setScale(s) { if (turb) turb.setScale(s); }
    };
  }

  function dispose() {
    if (gasPlume && gasPlume.pts) {
      scene.remove(gasPlume.pts);
      if (gasPlume.pts.geometry) gasPlume.pts.geometry.dispose();
      if (gasPlume.pts.material) gasPlume.pts.material.dispose();
    }
    if (turb && turb.pts) {
      scene.remove(turb.pts);
      if (turb.pts.geometry) turb.pts.geometry.dispose();
      if (turb.pts.material) turb.pts.material.dispose();
    }
    if (group) {
      scene.remove(group);
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (let i = 0; i < ms.length; i++) if (ms[i]) ms[i].dispose();
        }
      });
    }
    gasPlume = null;
    turb = null;
    craterLight = null;
    rimMesh = null;
    group = null;
    scene = null;
    biome = null;
    fxRef = null;
    dustAccum = 0;
    turbAccum = 0;
    endEvent();
  }

  OC.Volcano = {
    SITE,
    init,
    update,
    dispose,
    getState: () => state,
    getShake,
    getTremor,
    getCurrentBoost,
    isActive: () => state.phase !== 'idle',
    getSite: () => SITE,
    /* Тест- hook: принудительная фаза машины событий (tests/verify.mjs) */
    _forcePhase(phase) {
      if (DURATIONS[phase]) {
        state.phase = phase;
        state.timer = DURATIONS[phase];
        state.progress = 0;
      }
      return state;
    }
  };
})(window.OC);
