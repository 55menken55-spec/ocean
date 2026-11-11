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
  let pyro = null;       // пирокластические потоки по склонам (Points, 1 draw call)
  let shocks = null;     // всплески давления: расширяющиеся кольца (preallocated pool)
  let craterLight = null;
  let rimMesh = null;
  let flashT = 0;        // возраст вспышки кратера (затухает ~2 сек)
  let dustAccum = 0;
  let turbAccum = 0;
  let pyroAccum = 0;
  let debrisAccum = 0;
  let damageState = 0;      // 0 = нет damage, 1 = damage
  let damageValue = 0;      // текущее damage (0..1), recovery на cooling
  let damageDirty = false;  // флаг для re-tint флоры
  let debris = null;        // оползни: камнепады по склонам (Points, 1 draw call)

  const _flow = new T.Vector3();
  const _shakeTmp = { x: 0, y: 0, z: 0 };
  const _tremorTmp = { active: false, strength: 0, x: 0, y: 0, z: 0 };
  const _infTmp = { active: false, x: 0, z: 0, r: 0, panic: 0, strength: 0 };

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

  /* ---------- Всплески давления: расширяющиеся кольца (preallocated pool, 1 draw call/ring) ---------- */
  function makeShockwaves(scene, tex) {
    const MAX = 6;
    const geo = new T.RingGeometry(0.82, 1.0, 48);
    geo.rotateX(-Math.PI / 2);
    const rings = [];
    for (let i = 0; i < MAX; i++) {
      const mat = new T.ShaderMaterial({
        transparent: true, depthWrite: false, fog: true,
        blending: T.AdditiveBlending,
        uniforms: T.UniformsUtils.merge([
          T.UniformsLib.fog,
          { uAlpha: { value: 0 } }
        ]),
        vertexShader: `
          #include <fog_pars_vertex>
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: `
          uniform float uAlpha;
          #include <fog_pars_fragment>
          void main() {
            if (uAlpha < 0.01) discard;
            gl_FragColor = vec4(0.72, 0.85, 1.0, uAlpha * 0.45);
            #include <fog_fragment>
          }`
      });
      const m = new T.Mesh(geo, mat);
      m.frustumCulled = false;
      m.visible = false;
      m.userData = { life: 0, maxLife: 0, radius: 0, vx: 0, vz: 0, mat };
      scene.add(m);
      rings.push(m);
    }
    const cursor = { v: 0 };
    let active = 0;
    function emit(count) {
      for (let k = 0; k < count; k++) {
        const m = rings[cursor.v];
        cursor.v = (cursor.v + 1) % MAX;
        m.visible = true;
        m.scale.set(1, 1, 1);
        m.position.set(SITE.x, biome.getHeight(SITE.x, SITE.z) - SITE.craterD + 1.5, SITE.z);
        m.userData.life = 1.8;
        m.userData.maxLife = 1.8;
        m.userData.radius = 8;
        // Волны идут наружу со скоростью ~60 м/с + легкий дрейф
        const drift = biome.getCurrentAt ? biome.getCurrentAt(SITE.x, m.position.y, SITE.z, OC.uTime ? OC.uTime.value : 0, _flow) : _flow;
        m.userData.vx = drift.x * 0.25;
        m.userData.vz = drift.z * 0.25;
      }
    }
    function update(dt) {
      active = 0;
      for (let i = 0; i < MAX; i++) {
        const m = rings[i];
        if (!m.visible) continue;
        const ud = m.userData;
        ud.life -= dt;
        if (ud.life <= 0) { m.visible = false; continue; }
        const frac = ud.life / ud.maxLife;
        ud.radius += dt * 55.0;
        m.position.x += ud.vx * dt;
        m.position.z += ud.vz * dt;
        const s = ud.radius;
        m.scale.set(s, s, s);
        ud.mat.uniforms.uAlpha.value = frac * 0.9;
        active++;
      }
      return active;
    }
    return { emit, update, getActive: () => active, rings };
  }

  /* ---------- Пирокластические потоки: яркие частички по склонам конуса (Points, 1 draw call) ---------- */
  function makePyroclasticFlow(scene, n, tex) {
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
      transparent: true, depthWrite: false, fog: true,
      blending: T.AdditiveBlending,
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
          gl_FragColor = vec4(vec3(1.0, 0.55, 0.22), tx.a * vAlpha * 0.9);
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
        const r = SITE.craterR + Math.random() * 10;
        const i3 = i * 3;
        pos[i3] = SITE.x + Math.cos(ang) * r;
        pos[i3 + 1] = fl + 1.5;
        pos[i3 + 2] = SITE.z + Math.sin(ang) * r;
        // Поток спускается по склону конуса: вниз + наружу по ребру terrain
        const spd = 3.0 + Math.random() * 3.5;
        vel[i3] = Math.cos(ang) * spd * 0.55;
        vel[i3 + 1] = -spd * 0.85;
        vel[i3 + 2] = Math.sin(ang) * spd * 0.55;
        const ml = 4.5 + Math.random() * 3.5;
        life[i] = ml;
        maxLife[i] = ml;
        size[i] = 2.2 + Math.random() * 3.0;
        alpha[i] = 0.6;
      }
      pts.visible = true;
    }

    function update(dt, camPos) {
      const fl = biome.getHeight(SITE.x, SITE.z) - SITE.craterD;
      const camD = Math.hypot(camPos.x - SITE.x, camPos.z - SITE.z);
      pts.visible = pts.visible && camD < 420;
      if (!pts.visible) return 0;
      let alive = 0;
      for (let i = 0; i < n; i++) {
        const l = life[i];
        if (l <= 0) { alpha[i] = 0; continue; }
        const nl = l - dt;
        life[i] = nl;
        if (nl <= 0) { alpha[i] = 0; continue; }
        const i3 = i * 3;
        // Притяжение к ребру конуса + оседание по склону
        const dx = pos[i3] - SITE.x;
        const dz = pos[i3 + 2] - SITE.z;
        const d = Math.hypot(dx, dz);
        if (d < 240) {
          const tgtR = 60 + (240 - d) * 0.45; // стремимся к склону, не убегая
          vel[i3] += ((dx / d) * tgtR - d) * 0.12 * dt;
          vel[i3 + 2] += ((dz / d) * tgtR - d) * 0.12 * dt;
        }
        vel[i3 + 1] *= 0.99;
        pos[i3] += vel[i3] * dt;
        pos[i3 + 1] += vel[i3 + 1] * dt;
        pos[i3 + 2] += vel[i3 + 2] * dt;
        // Поддержка над дном (частицы ложатся на склон)
        const floor = biome.getHeight(pos[i3], pos[i3 + 2]) + 1.0;
        if (pos[i3 + 1] < floor) {
          pos[i3 + 1] = floor;
          vel[i3 + 1] = 0;
          vel[i3] *= 0.7;
          vel[i3 + 2] *= 0.7;
        }
        size[i] += dt * 0.8;
        const frac = nl / maxLife[i];
        alpha[i] = Math.min(0.9, frac * 1.5) * OC.smoothstep(1.0, 0.85, frac);
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
    if (phase === 'eruption') {
      // Вспышка кратера + пирокластические лавины + всплески давления
      flashT = 0;
      if (pyro) pyro.emit(24);
      if (shocks) shocks.emit(2);
    }
  }

  function endEvent() {
    state.phase = 'idle';
    state.timer = 0;
    state.progress = 0;
    state.intensity = 0;
    state.shake = 0;
    flashT = 0;
    pyroAccum = 0;
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

    // Сейсмическая активность: выбросы пыли + оползни по склонам конуса
    if (state.phase === 'seismic') {
      dustAccum += dt;
      debrisAccum += dt;
      if (dustAccum >= 1.3) {
        dustAccum = 0;
        const ang = state.rng() * 6.283;
        const r = 28 + state.rng() * 52;
        const px = SITE.x + Math.cos(ang) * r;
        const pz = SITE.z + Math.sin(ang) * r;
        const fx = fxRef;
        if (fx && fx.silt) fx.silt.kick({ x: px, y: biome.getHeight(px, pz) - 0.5, z: pz }, 0.3 + 0.3 * state.intensity);
      }
      if (debrisAccum >= 2.2) {
        debrisAccum = 0;
        if (debris) debris.emit(state.intensity > 0.6 ? 4 : 2);
      }
    } else if (state.phase === 'eruption') {
      // Мутный шлейф: взлёт взвеси из кратера + регулярные kicks + сильные оползни
      turbAccum += dt;
      debrisAccum += dt;
      if (turbAccum >= 0.35) {
        turbAccum = 0;
        if (turb) turb.emit(9);
        if (fxRef && fxRef.silt) fxRef.silt.kick({ x: SITE.x, y: biome.getHeight(SITE.x, SITE.z) - SITE.craterD, z: SITE.z }, 0.9);
      }
      if (debrisAccum >= 0.6) {
        debrisAccum = 0;
        if (debris) debris.emit(8);
      }
    } else if (state.phase === 'cooling') {
      // Оползни затухают
      debrisAccum += dt;
      if (debrisAccum >= 1.5 && debris) { debrisAccum = 0; debris.emit(2); }
    }

    // Пирокластические потоки: регулярные лавины по склонам + шок-волны в начале извержения
    if (state.phase === 'eruption') {
      pyroAccum += dt;
      if (pyroAccum >= 0.9) {
        pyroAccum = 0;
        if (pyro) pyro.emit(8);
        if (shocks) shocks.emit(1);
      }
    }

    // Вспышка кратера: затухающий peak в первые ~2 сек извержения
    if (flashT > 0) flashT += dt;

    // Газовые выбросы: шлейф + пульсация кратера
    if (gasPlume) {
      gasPlume.update(dt, time, camPos);
      const phaseActive = state.phase !== 'idle';
      const gasFade = !(state.phase === 'cooling' && state.progress > 0.35);
      if (gasPlume.pts) gasPlume.pts.visible = phaseActive && gasFade;
      if (craterLight) {
        const flash = flashT > 0 && flashT < 2.0 ? Math.max(0, 1 - flashT / 2.0) * 3.2 : 0;
        const target = state.phase === 'eruption' ? 2.2 + 0.9 * Math.sin(time * 7.3) + flash
          : (state.phase === 'seismic' ? 0.7 + 0.5 * state.intensity : 0);
        craterLight.intensity = OC.lerp(craterLight.intensity, target, dt * 4);
      }
    }

    if (turb) turb.update(dt, time, camPos);
    if (pyro) pyro.update(dt, camPos);
    if (shocks) shocks.update(dt);
    if (debris) debris.update(dt, camPos);

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

  /* Влияние событий вулкана на фауну (стаи удирают, креветки нервничают) —
     читается в цикле Boids через ctx.volcano, без новых draw calls. */
  function getInfluence() {
    const ph = state.phase;
    if (ph === 'idle') {
      _infTmp.active = false;
      return _infTmp;
    }
    _infTmp.active = true;
    _infTmp.x = SITE.x;
    _infTmp.z = SITE.z;
    _infTmp.r = ph === 'eruption' ? 240 : 190;
    if (ph === 'seismic') {
      // Предвестник: стаи нервничают (ускорение), но не бегут
      _infTmp.panic = 0.55 + 0.35 * state.progress;
      _infTmp.strength = 6.0 + 4.0 * state.progress;
    } else if (ph === 'eruption') {
      _infTmp.panic = 1.75;
      _infTmp.strength = 16.0;
    } else {
      // Остывание: затухающее бегство
      _infTmp.panic = Math.max(0, 1.2 * (1 - state.progress));
      _infTmp.strength = 10.0 * (1 - state.progress);
    }
    return _infTmp;
  }

  function getCurrentBoost(x, y, z, out) {
    const ph = state.phase;
    if (ph === 'idle') return out;
    let inten = ph === 'eruption' ? 1.0
      : (ph === 'seismic' ? 0.3 + 0.4 * state.progress : Math.max(0, (1 - state.progress) * 0.8));
    // Пульсация интенсивности (всплески): сильна на сейсмике, слаба на извержении
    const pulse = ph === 'seismic' ? 1 + 0.45 * Math.sin(state.progress * Math.PI * 6)
      : (ph === 'cooling' ? 1 + 0.25 * Math.sin(state.progress * Math.PI * 3) : 1.05);
    inten *= pulse;
    const dx = x - SITE.x;
    const dz = z - SITE.z;
    const d = Math.hypot(dx, dz);
    if (d > 260) return out;
    const fl = biome.getHeight(x, z);
    const above = Math.max(0, y - fl);
    const a = Math.atan2(dz, dx);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    if (d < 70) {
      // Конвективная струя над кратером + радиальный вынос
      const core = OC.smoothstep(70, 7, d) * OC.smoothstep(75, 9, above);
      out.y += core * (ph === 'eruption' ? 4.2 : 1.2 + 1.6 * inten) * pulse;
      out.x += ca * core * 0.85 * inten;
      out.z += sa * core * 0.85 * inten;
    } else {
      const edge = OC.smoothstep(260, 130, d);
      // Радиальный вынос + вихревой свёртывание (вращение вокруг конуса)
      const swirl = ph === 'eruption' ? 0.9 * inten
        : (ph === 'seismic' ? 0.35 * inten : Math.max(0, (1 - state.progress) * 0.5));
      out.x += ca * edge * 0.6 * inten;
      out.z += sa * edge * 0.6 * inten;
      out.x += -sa * edge * swirl;
      out.z += ca * edge * swirl;
    }
    return out;
  }

  let fxRef = null;

  /* Damage-зона вулкана: флора вымирает в радиусе по фазам, восстанавливается на остывании.
     Читается в hook flora_streamer (редко, при смене damage), без allocations. */
  function getDamageFactor(x, z) {
    const ph = state.phase;
    if (ph === 'idle') return 0;
    const dx = x - SITE.x;
    const dz = z - SITE.z;
    const d = Math.hypot(dx, dz);
    const R = ph === 'eruption' ? SITE.r * 0.85 : SITE.r * 1.4;
    if (d > R) return 0;
    const edge = OC.smoothstep(R, R * 0.5, d);
    let f;
    if (ph === 'eruption') f = 1.0;
    else if (ph === 'seismic') f = (0.2 + 0.45 * state.progress) * edge;
    else f = Math.max(0, (1 - state.progress) * 0.7) * edge; // остывание: recovery
    return f;
  }

  /* Состояние damage для hook flora_streamer: (active, radius, factor) */
  const _dmgTmp = { active: false, x: 0, z: 0, r: 0, f: 0 };
  function getDamageState() {
    const ph = state.phase;
    if (ph === 'idle') {
      _dmgTmp.active = false;
      return _dmgTmp;
    }
    _dmgTmp.active = true;
    _dmgTmp.x = SITE.x;
    _dmgTmp.z = SITE.z;
    _dmgTmp.r = ph === 'eruption' ? SITE.r * 0.85 : SITE.r * 1.4;
    _dmgTmp.f = ph === 'eruption' ? 1.0 : (ph === 'seismic' ? 0.2 + 0.45 * state.progress : Math.max(0, (1 - state.progress) * 0.7));
    return _dmgTmp;
  }

  /* Оползни: камнепады по склонам конуса (Points, 1 draw call, как pyroclastic) */
  function makeDebrisFlow(scene, n, tex) {
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
      transparent: true, depthWrite: false, fog: true, blending: T.NormalBlending,
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
          gl_FragColor = vec4(vec3(0.32, 0.30, 0.29), tx.a * vAlpha * 0.7);
          #include <fog_fragment>
        }`
    });
    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.visible = false;
    scene.add(pts);
    let cursor = 0;
    function emit(count) {
      for (let k = 0; k < count; k++) {
        const i = cursor;
        cursor = (cursor + 1) % n;
        const ang = Math.random() * 6.28318;
        const r = SITE.craterR + Math.random() * 26;
        const i3 = i * 3;
        pos[i3] = SITE.x + Math.cos(ang) * r;
        pos[i3 + 1] = biome.getHeight(SITE.x, SITE.z) - SITE.craterD + 2 + Math.random() * 2;
        pos[i3 + 2] = SITE.z + Math.sin(ang) * r;
        const spd = 2.5 + Math.random() * 3.5;
        vel[i3] = Math.cos(ang) * spd * 0.6;
        vel[i3 + 1] = -spd * 0.8;
        vel[i3 + 2] = Math.sin(ang) * spd * 0.6;
        const ml = 6.0 + Math.random() * 4.0;
        life[i] = ml;
        maxLife[i] = ml;
        size[i] = 2.0 + Math.random() * 3.0;
        alpha[i] = 0.5;
      }
      pts.visible = true;
    }
    function update(dt, camPos) {
      const camD = Math.hypot(camPos.x - SITE.x, camPos.z - SITE.z);
      pts.visible = pts.visible && camD < 420;
      if (!pts.visible) return 0;
      let alive = 0;
      for (let i = 0; i < n; i++) {
        const l = life[i];
        if (l <= 0) { alpha[i] = 0; continue; }
        const nl = l - dt;
        life[i] = nl;
        if (nl <= 0) { alpha[i] = 0; continue; }
        const i3 = i * 3;
        vel[i3 + 1] -= 9.8 * dt;
        pos[i3] += vel[i3] * dt;
        pos[i3 + 1] += vel[i3 + 1] * dt;
        pos[i3 + 2] += vel[i3 + 2] * dt;
        // Скольжение по склону: притяжение к ребру конуса
        const dx = pos[i3] - SITE.x;
        const dz = pos[i3 + 2] - SITE.z;
        const d = Math.hypot(dx, dz);
        if (d > 240) { vel[i3] *= 0.98; vel[i3 + 2] *= 0.98; }
        // Поддержка над дном
        const floor = biome.getHeight(pos[i3], pos[i3 + 2]) + 0.5;
        if (pos[i3 + 1] < floor) {
          pos[i3 + 1] = floor;
          vel[i3 + 1] = 0;
          vel[i3] *= 0.65;
          vel[i3 + 2] *= 0.65;
        }
        size[i] += dt * 0.5;
        const frac = nl / maxLife[i];
        alpha[i] = Math.min(0.7, frac * 1.2) * OC.smoothstep(1.0, 0.8, frac);
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

    // Пирокластические потоки + всплески давления + оползни
    pyro = makePyroclasticFlow(scene, Math.max(80, Math.round(160 * Math.min(1.3, nScale))), fx && fx.texSoft);
    pyro.pts.visible = false;
    shocks = makeShockwaves(scene);
    debris = makeDebrisFlow(scene, Math.max(60, Math.round(120 * Math.min(1.3, nScale))), fx && fx.texSoft);
    debris.pts.visible = false;

    // Свет кратера (пульсирует во время событий)
    craterLight = new T.PointLight(0xff6a22, 0, 80, 1.6);
    craterLight.position.set(SITE.x, craterY + 1.5, SITE.z);
    group.add(craterLight);

    return {
      update,
      dispose,
      getState: () => state,
      getSite: () => SITE,
      setScale(s) { if (turb) turb.setScale(s); if (pyro) pyro.setScale(s); if (debris) debris.setScale(s); }
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
    if (pyro && pyro.pts) {
      scene.remove(pyro.pts);
      if (pyro.pts.geometry) pyro.pts.geometry.dispose();
      if (pyro.pts.material) pyro.pts.material.dispose();
    }
    if (shocks) {
      for (let i = 0; i < shocks.rings.length; i++) {
        const m = shocks.rings[i];
        if (m.parent) m.parent.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      }
    }
    if (debris && debris.pts) {
      scene.remove(debris.pts);
      if (debris.pts.geometry) debris.pts.geometry.dispose();
      if (debris.pts.material) debris.pts.material.dispose();
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
    pyro = null;
    shocks = null;
    debris = null;
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
    getInfluence,
    getDamageFactor,
    getDamageState,
    isActive: () => state.phase !== 'idle',
    getSite: () => SITE,
    /* Тест- hook: принудительная фаза машины событий (tests/verify.mjs) */
    _forcePhase(phase) {
      if (phase === 'idle') {
        state.phase = 'idle';
        state.timer = 0;
        state.progress = 0;
      } else if (DURATIONS[phase]) {
        state.phase = phase;
        state.timer = DURATIONS[phase];
        state.progress = 0;
      }
      return state;
    }
  };
})(window.OC);
