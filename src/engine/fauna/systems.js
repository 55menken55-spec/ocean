/* ================= ФАУНА: ЭКОСИСТЕМНЫЕ СИСТЕМЫ ЧАСТИЦ И ЭФФЕКТОВ ================= */
/* Пузырьки/планктон/снег, ночной нерест кораллов, брызги выпрыгивающих китов,
   биолюминесцентный след Noctiluca, дымка термоклина/галоклина, мутьевые шлейфы
   бентоса и струи гидратных сипов. Чистые фабрики: сцена + текстура на входе. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const createCameraRelativeParticles = function (scene, n, tex, mode, noSurface) {
    const kind = mode === true ? 'plankton' : (mode === false ? 'bubbles' : mode);
    const isPlankton = kind === 'plankton';
    const isSnow = kind === 'snow';
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    const sz = new Float32Array(n);
    const spd = new Float32Array(n);
    const rng = OC.mulberry32(isPlankton ? 8812 : (isSnow ? 6147 : 4409));

    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * 180;
      pos[i * 3 + 1] = (rng() - 0.5) * 110;
      pos[i * 3 + 2] = (rng() - 0.5) * 180;
      ph[i] = rng() * 100;
      sz[i] = isPlankton ? OC.lerp(0.35, 1.35, rng()) : (isSnow ? OC.lerp(0.55, 1.65, rng()) : OC.lerp(0.45, 1.4, rng()));
      spd[i] = isPlankton ? OC.lerp(0.2, 0.7, rng()) : (isSnow ? OC.lerp(0.25, 0.72, rng()) : OC.lerp(1.6, 4.4, rng()));
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));
    geo.setAttribute('aSpeed', new T.BufferAttribute(spd, 1));

    const motionGLSL = isPlankton
      ? `p.x += sin(uTime * 0.16 + aPhase) * 3.5;
         p.y += cos(uTime * 0.21 + aPhase * 1.3) * 2.2;
         p.z += cos(uTime * 0.14 + aPhase * 0.7) * 3.5;`
      : (isSnow
        ? `p.y -= uTime * aSpeed;
           p.x += sin(uTime * 0.32 + aPhase) * 2.2;
           p.z += cos(uTime * 0.27 + aPhase * 1.2) * 2.2;`
        : `p.y += uTime * aSpeed;
           p.x += sin(uTime * 0.75 + aPhase) * 1.1;
           p.z += cos(uTime * 0.6 + aPhase) * 1.1;`);

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: tex },
          uTime: OC.uTime,
          uCamPos: { value: new T.Vector3() },
          uFlowOffset: { value: new T.Vector3() },
          uColor: { value: new T.Color(isPlankton ? 0x7ef2ff : (isSnow ? 0xd9edf7 : 0xc6f2ff)) },
          uBio: { value: 0.4 },
          uDvmShift: { value: 0.0 },
          uScale: { value: 1.0 },
          uNoSurface: { value: noSurface ? 1.0 : 0.0 }
        }
      ]),
      vertexShader: `
        attribute float aPhase, aSize, aSpeed;
        uniform float uTime, uScale, uBio, uDvmShift, uNoSurface;
        uniform vec3 uCamPos, uFlowOffset;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main(){
          vec3 box = vec3(180.0, 110.0, 180.0);
          vec3 p = position + uFlowOffset;
          ${motionGLSL}
          vec3 rel = mod(p - uCamPos + box * 0.5, box) - box * 0.5;
          vec3 worldP = uCamPos + rel;
          worldP.y += ${isPlankton ? 'uDvmShift' : '0.0'};
          // Не вылетаем над поверхностью моря (Y = 0), кроме абиссального рифта
          float belowWater = max(uNoSurface, step(worldP.y, -0.35));
          vec4 mvPosition = modelViewMatrix * vec4(worldP, 1.0);
          gl_PointSize = belowWater * aSize * uScale * (${isPlankton ? '135.0' : (isSnow ? '105.0' : '115.0')} / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          float blink = ${isPlankton
            ? '0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.7 + fract(aPhase) * 1.3) + aPhase), 2.0)'
            : (isSnow ? '(0.28 + 0.72 * smoothstep(-6.0, -28.0, worldP.y))' : '0.85')};
          vAlpha = belowWater * blink * ${isPlankton ? '(0.28 + uBio * 0.72)' : (isSnow ? '(0.36 + uBio * 0.35)' : '0.52')};
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex; uniform vec3 uColor;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main(){
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.02 || vAlpha < 0.01) discard;
          gl_FragColor = vec4(uColor, tx.a * vAlpha);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.key = isPlankton ? 'plankton' : (isSnow ? 'marine_snow' : 'bubbles');
    scene.add(pts);
    return mat;
  };

  /* ---------- Ночной массовый нерест кораллов (поднимающиеся гаметы) ---------- */
  const createCoralSpawningSystem = function (scene, n, tex) {
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    const spd = new Float32Array(n);
    const sz = new Float32Array(n);
    const rng = OC.mulberry32(9421);
    const c1 = new T.Color(0xff92c2);
    const c2 = new T.Color(0xffcfa0);
    const _c = new T.Color();

    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * 140;
      pos[i * 3 + 1] = -28 + rng() * 27.5;
      pos[i * 3 + 2] = (rng() - 0.5) * 140;
      ph[i] = rng() * 62.8;
      spd[i] = OC.lerp(0.45, 1.15, rng());
      sz[i] = OC.lerp(0.65, 1.55, rng());
      _c.copy(c1).lerp(c2, rng());
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
    geo.setAttribute('aSpeed', new T.BufferAttribute(spd, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));

    const mat = new T.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: tex },
          uTime: OC.uTime,
          uCamPos: { value: new T.Vector3() },
          uFlowOffset: { value: new T.Vector3() },
          uIntensity: { value: 0.0 },
          uScale: { value: 1.0 }
        }
      ]),
      vertexShader: `
        attribute float aPhase, aSpeed, aSize;
        uniform float uTime, uIntensity, uScale;
        uniform vec3 uCamPos, uFlowOffset;
        varying float vAlpha;
        varying vec3 vColor;
        #include <fog_pars_vertex>
        void main(){
          vColor = color;
          vec3 box = vec3(140.0, 30.0, 140.0);
          vec3 p = position + uFlowOffset;
          p.y += uTime * aSpeed;
          p.x += sin(uTime * 0.55 + aPhase) * 1.4;
          p.z += cos(uTime * 0.48 + aPhase) * 1.4;
          vec2 relXZ = mod(p.xz - uCamPos.xz + box.xz * 0.5, box.xz) - box.xz * 0.5;
          float relY = mod(p.y + 28.0, box.y) - 28.5;
          vec3 worldP = vec3(uCamPos.x + relXZ.x, relY, uCamPos.z + relXZ.y);
          float belowWater = step(worldP.y, -0.35);
          vec4 mvPosition = modelViewMatrix * vec4(worldP, 1.0);
          gl_PointSize = belowWater * aSize * uScale * (145.0 / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          float pulse = 0.6 + 0.4 * sin(uTime * 1.8 + aPhase);
          vAlpha = belowWater * uIntensity * pulse * smoothstep(-28.0, -21.0, worldP.y);
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vAlpha;
        varying vec3 vColor;
        #include <fog_pars_fragment>
        void main(){
          if (vAlpha < 0.01) discard;
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.02) discard;
          gl_FragColor = vec4(vColor, tx.a * vAlpha * 0.85);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.visible = false;
    pts.userData.key = 'coral_spawn';
    scene.add(pts);
    return { pts, mat };
  };

  /* ---------- Система водных брызг (выпрыги китов, белух и морских львов) ---------- */
  const makeSplashSystem = function (scene, texHard) {
    const N = 420;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const life = new Float32Array(N);
    const maxLife = new Float32Array(N);
    const alpha = new Float32Array(N);
    const size = new Float32Array(N);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aAlpha', new T.BufferAttribute(alpha, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(size, 1));

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        { uTex: { value: texHard }, uScale: { value: 1.0 } }
      ]),
      vertexShader: `
        attribute float aAlpha, aSize;
        uniform float uScale;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main(){
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aAlpha > 0.01 ? aSize * uScale * (185.0 / max(1.0, -mvPosition.z)) : 0.0;
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = aAlpha;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main(){
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.03 || vAlpha < 0.01) discard;
          gl_FragColor = vec4(vec3(0.92, 0.98, 1.0), tx.a * vAlpha);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.visible = false;
    pts.userData.key = 'bubbles';
    scene.add(pts);

    let cursor = 0;
    let activeCount = 0;

    return {
      emit(worldPos, intensity) {
        const k = Math.max(18, Math.min(84, Math.round(74 * (intensity || 0.7))));
        const spread = 1.6 + 2.8 * (intensity || 0.7);
        for (let m = 0; m < k; m++) {
          const i = cursor;
          cursor = (cursor + 1) % N;
          const a = Math.random() * 6.28318;
          const r = Math.random() * spread;
          const i3 = i * 3;
          pos[i3]     = worldPos.x + Math.cos(a) * r;
          pos[i3 + 1] = 0.15 + Math.random() * 0.45;
          pos[i3 + 2] = worldPos.z + Math.sin(a) * r;
          const outV = (1.5 + Math.random() * 5.2) * (0.55 + (intensity || 0.7) * 0.65);
          vel[i3]     = Math.cos(a) * outV;
          vel[i3 + 1] = (4.8 + Math.random() * 9.5) * (0.5 + (intensity || 0.7) * 0.65);
          vel[i3 + 2] = Math.sin(a) * outV;
          const ml = 0.85 + Math.random() * 0.95;
          life[i] = ml;
          maxLife[i] = ml;
          alpha[i] = 0.9;
          size[i] = (0.7 + Math.random() * 1.15) * (0.65 + (intensity || 0.7) * 0.65);
        }
        activeCount = N;
        pts.visible = true;
      },
      update(dt) {
        if (activeCount === 0) return;
        let alive = 0;
        for (let i = 0; i < N; i++) {
          const l = life[i];
          if (l <= 0) { alpha[i] = 0; continue; }
          const nl = l - dt;
          life[i] = nl;
          if (nl <= 0) { alpha[i] = 0; continue; }
          const i3 = i * 3;
          vel[i3 + 1] -= 13.8 * dt;
          pos[i3]     += vel[i3] * dt;
          pos[i3 + 1] += vel[i3 + 1] * dt;
          pos[i3 + 2] += vel[i3 + 2] * dt;
          if (pos[i3 + 1] < -0.2) {
            life[i] = 0;
            alpha[i] = 0;
            continue;
          }
          const frac = nl / maxLife[i];
          alpha[i] = Math.min(0.92, frac * 1.35);
          alive++;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aAlpha.needsUpdate = true;
        geo.attributes.aSize.needsUpdate = true;
        if (alive === 0) { activeCount = 0; pts.visible = false; }
      },
      setScale(s) { mat.uniforms.uScale.value = s; },
      getActiveCount: () => activeCount
    };
  };

  /* ---------- Биолюминесцентный след ночесветок (Noctiluca) при движении дайвера ---------- */
  const makeBiolumTrail = function (scene, tex, noSurface) {
    const N = 180;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const born = new Float32Array(N);
    const sz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      born[i] = -999;
      sz[i] = 1.6 + (i % 5) * 0.45;
    }
    const posAttr = new T.BufferAttribute(pos, 3);
    const bornAttr = new T.BufferAttribute(born, 1);
    posAttr.setUsage(T.DynamicDrawUsage);
    bornAttr.setUsage(T.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aBorn', bornAttr);
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: tex },
          uTime: OC.uTime,
          uScale: { value: 1.0 }
        }
      ]),
      vertexShader: `
        attribute float aBorn, aSize;
        uniform float uTime, uScale;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main(){
          float age = uTime - aBorn;
          float alive = step(0.0, age) * step(age, 2.5);
          vec3 p = position + vec3(sin(uTime * 1.4 + position.z) * 0.18, age * 0.22, cos(uTime * 1.2 + position.x) * 0.18);
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = alive * aSize * uScale * (145.0 / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = alive * smoothstep(0.0, 0.14, age) * (1.0 - smoothstep(0.45, 2.5, age));
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main(){
          if (vAlpha < 0.01) discard;
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.02) discard;
          gl_FragColor = vec4(0.24, 0.96, 1.0, tx.a * vAlpha * 0.92);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.key = 'plankton';
    scene.add(pts);

    let cursor = 0;
    let spawnAcc = 0;
    return {
      mat,
      update(dt, time, camPos, camSpeed, bioGlow, flashOn) {
        if ((bioGlow > 0.28 || flashOn) && (camSpeed > 1.8) && (noSurface || camPos.y < -0.35)) {
          spawnAcc += dt * Math.min(4.0, camSpeed * 0.35);
          let dirty = false;
          while (spawnAcc >= 0.055) {
            spawnAcc -= 0.055;
            const i = cursor;
            cursor = (cursor + 1) % N;
            const a = cursor * 2.39996;
            const r = 1.4 + ((cursor * 17) % 10) * 0.36;
            pos[i * 3] = camPos.x + Math.cos(a) * r;
            pos[i * 3 + 1] = camPos.y + Math.sin(a * 1.3) * 1.6 - 0.35;
            pos[i * 3 + 2] = camPos.z + Math.sin(a) * r;
            born[i] = time;
            dirty = true;
          }
          if (dirty) {
            posAttr.needsUpdate = true;
            bornAttr.needsUpdate = true;
          }
        }
      },
      setScale(s) {
        mat.uniforms.uScale.value = s;
      }
    };
  };

  /* ---------- Видимая оптическая дымка термоклина / галоклина (Schlieren haze veil) ---------- */
  const makeThermoclineHaze = function (scene, biome) {
    const id = biome ? biome.id : '';
    let thermoY = -22.0;
    let enabled = true;
    let tintHex = 0x76e8ff;
    if (id === 'galapagos_upwelling') { thermoY = -24.0; tintHex = 0x4ee2c8; }
    else if (id === 'arctic_sea') { thermoY = -28.0; tintHex = 0x9adfff; }
    else if (id === 'brine_pool') { thermoY = -26.0; tintHex = 0x5c9eff; }
    else if (id === 'cenote_caves' || id === 'hydrothermal_vents' || id === 'mariana_trench') {
      enabled = false; // в сенотах уже есть облако Анхелиты, в абиссали нет солнечного термоклина
    }

    const geo = new T.PlaneGeometry(180, 180, 28, 28);
    geo.rotateX(-Math.PI / 2);
    const mat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.NormalBlending,
      fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTime: OC.uTime,
          uColor: { value: new T.Color(tintHex) },
          uCamPos: { value: new T.Vector3() },
          uThermoY: { value: thermoY },
          uOpacity: { value: 0.0 }
        }
      ]),
      vertexShader: `
        uniform float uTime, uThermoY;
        varying vec3 vWorldP;
        varying float vWave;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float w = sin(wp.x * 0.08 + uTime * 0.72) * 0.55 + cos(wp.z * 0.09 - uTime * 0.58) * 0.48;
          wp.y = uThermoY + w * 0.65;
          vWorldP = wp.xyz;
          vWave = w;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime, uOpacity;
        uniform vec3 uColor, uCamPos;
        varying vec3 vWorldP;
        varying float vWave;
        #include <fog_pars_fragment>
        void main() {
          if (uOpacity < 0.01) discard;
          vec3 toCam = normalize(uCamPos - vWorldP);
          float dist = length(uCamPos - vWorldP);
          // Эффект Шлирена: усиливается под скользящим углом взгляда вдоль термоклина
          float grazing = 1.0 - abs(toCam.y);
          float bands = 0.5 + 0.5 * sin(vWorldP.x * 0.22 + vWorldP.z * 0.17 + uTime * 0.95 + vWave * 2.4);
          float radial = smoothstep(88.0, 18.0, dist);
          float alpha = uOpacity * (0.14 + 0.44 * pow(grazing, 1.35)) * (0.58 + 0.42 * bands) * radial;
          if (alpha < 0.005) discard;
          gl_FragColor = vec4(uColor * (0.85 + 0.3 * bands), alpha);
          #include <fog_fragment>
        }`
    });

    const mesh = new T.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);

    return {
      thermoY,
      enabled,
      update(camPos, dayW) {
        if (!enabled) { mesh.visible = false; return false; }
        const distY = Math.abs(camPos.y - thermoY);
        const vis = distY < 18.0 && (biome.noSurface || camPos.y < -1.0);
        mesh.visible = vis;
        if (vis) {
          mesh.position.set(Math.round(camPos.x / 16) * 16, 0, Math.round(camPos.z / 16) * 16);
          mat.uniforms.uCamPos.value.copy(camPos);
          mat.uniforms.uOpacity.value = (1.0 - OC.smoothstep(2.5, 18.0, distY)) * (0.35 + 0.45 * (dayW || 1));
        }
        return distY < 3.6;
      }
    };
  };

  /* ---------- Дно-подъёмные мутьевые шлейфы (Benthic Silt-Out Plumes) ---------- */
  const makeBenthicSiltSystem = function (scene, biome, texSoft) {
    const N = 240;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const life = new Float32Array(N);
    const maxLife = new Float32Array(N);
    const size = new Float32Array(N);
    const alpha = new Float32Array(N);

    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new T.BufferAttribute(size, 1));
    geo.setAttribute('aAlpha', new T.BufferAttribute(alpha, 1));

    const id = biome ? biome.id : '';
    const siltColorHex = (id === 'hydrothermal_vents' || id === 'galapagos_upwelling') ? 0x625d54
      : (id === 'mariana_trench' || id === 'brine_pool' ? 0x747b74
        : (id === 'arctic_sea' ? 0x8d9aa4 : 0xd9d1bc));

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.NormalBlending, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: texSoft },
          uColor: { value: new T.Color(siltColorHex) },
          uScale: { value: 1.0 }
        }
      ]),
      vertexShader: `
        attribute float aSize, aAlpha;
        uniform float uScale;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main() {
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale * (380.0 / max(1.5, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform vec3 uColor;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main() {
          if (vAlpha < 0.01) discard;
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.02) discard;
          gl_FragColor = vec4(uColor, tx.a * vAlpha * 0.44);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.visible = false;
    scene.add(pts);

    let cursor = 0;
    let activeCount = 0;
    let emitAccum = 0;
    let localTurbidity = 0;
    const _flow = new T.Vector3();

    function spawnBurst(worldPos, count, strength) {
      const k = Math.max(8, Math.min(48, count));
      const fl = biome ? biome.getHeight(worldPos.x, worldPos.z) : worldPos.y - 1.5;
      for (let m = 0; m < k; m++) {
        const i = cursor;
        cursor = (cursor + 1) % N;
        const ang = Math.random() * 6.28318;
        const r = 0.4 + Math.random() * 2.2 * strength;
        const i3 = i * 3;
        pos[i3] = worldPos.x + Math.cos(ang) * r;
        pos[i3 + 1] = Math.max(fl + 0.15, worldPos.y - 0.8 + Math.random() * 0.65);
        pos[i3 + 2] = worldPos.z + Math.sin(ang) * r;
        const spd = (0.65 + Math.random() * 1.45) * strength;
        vel[i3] = Math.cos(ang) * spd;
        vel[i3 + 1] = 0.45 + Math.random() * 0.95 * strength;
        vel[i3 + 2] = Math.sin(ang) * spd;
        const ml = 3.8 + Math.random() * 2.8;
        life[i] = ml;
        maxLife[i] = ml;
        size[i] = 1.6 + Math.random() * 1.8;
        alpha[i] = 0.05;
      }
      activeCount = N;
      pts.visible = true;
      localTurbidity = Math.min(1.0, localTurbidity + 0.28 * strength);
    }

    return {
      kick: (worldPos, strength) => spawnBurst(worldPos, Math.round(28 * (strength || 1.0)), strength || 1.0),
      update(dt, time, camPos, camSpeed) {
        const fl = biome ? biome.getHeight(camPos.x, camPos.z) : -99;
        const clearance = camPos.y - fl;
        if (clearance >= -0.5 && clearance < 4.2 && camSpeed > 1.75) {
          emitAccum += dt * (camSpeed * 0.45) * (1.0 - clearance / 4.2);
          if (emitAccum > 0.22) {
            emitAccum = 0;
            spawnBurst(camPos, 10, OC.clamp(camSpeed / 6.0, 0.5, 1.35));
          }
        }
        localTurbidity = Math.max(0, localTurbidity - dt * 0.14);

        if (activeCount === 0) return { active: 0, turbidity: localTurbidity };
        if (biome && biome.getCurrentAt) biome.getCurrentAt(camPos.x, camPos.y, camPos.z, time, _flow);
        else _flow.set(0.15, 0, 0.05);

        let alive = 0;
        for (let i = 0; i < N; i++) {
          const l = life[i];
          if (l <= 0) { alpha[i] = 0; continue; }
          const nl = l - dt;
          life[i] = nl;
          if (nl <= 0) { alpha[i] = 0; continue; }
          const i3 = i * 3;
          vel[i3] = vel[i3] * 0.96 + _flow.x * 0.18 * dt;
          vel[i3 + 1] = vel[i3 + 1] * 0.94 - 0.14 * dt; // взвесь медленно оседает обратно на дно
          vel[i3 + 2] = vel[i3 + 2] * 0.96 + _flow.z * 0.18 * dt;
          pos[i3] += vel[i3] * dt;
          pos[i3 + 1] += vel[i3 + 1] * dt;
          pos[i3 + 2] += vel[i3 + 2] * dt;
          size[i] += dt * 1.45;
          const frac = nl / maxLife[i];
          const fadeIn = OC.smoothstep(1.0, 0.84, frac);
          alpha[i] = Math.min(0.85, frac * 1.25) * fadeIn;
          alive++;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aSize.needsUpdate = true;
        geo.attributes.aAlpha.needsUpdate = true;
        if (alive === 0) { activeCount = 0; pts.visible = false; }
        return { active: alive, turbidity: localTurbidity };
      },
      setScale(s) { mat.uniforms.uScale.value = s; },
      getTurbidity: () => localTurbidity
    };
  };

  /* ---------- Шлейфы пузырьков газовых гидратов и холодных метановых сипов ---------- */
  const makeHydratePlumeSystem = function (scene, biome, texHard) {
    const id = biome ? biome.id : '';
    const hasHydrates = (id === 'brine_pool' || id === 'mariana_trench');
    if (!hasHydrates) {
      return { hasHydrates: false, update() {}, setScale() {} };
    }

    // Выбираем детерминированные очаги гидратов / сипов из зон биома
    const sources = [];
    if (id === 'brine_pool') {
      sources.push([-140, -110], [190, 120], [-20, 200], [110, -210], [-250, 50]);
    } else {
      sources.push([-80, 120], [160, -140], [-220, -60], [60, 230]);
    }

    const N = sources.length * 42;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    const sz = new Float32Array(N);
    const rng = OC.mulberry32(7109);

    for (let s = 0; s < sources.length; s++) {
      const sx = sources[s][0], sz0 = sources[s][1];
      const sy = biome ? biome.getHeight(sx, sz0) : -35;
      for (let k = 0; k < 42; k++) {
        const i = s * 42 + k;
        pos[i * 3] = sx + (rng() - 0.5) * 4.5;
        pos[i * 3 + 1] = sy + 0.4 + rng() * 26.0;
        pos[i * 3 + 2] = sz0 + (rng() - 0.5) * 4.5;
        seed[i] = rng() * 50.0;
        sz[i] = OC.lerp(0.55, 1.35, rng());
      }
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new T.BufferAttribute(seed, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: texHard },
          uTime: OC.uTime,
          uColor: { value: new T.Color(id === 'brine_pool' ? 0xb4f2ff : 0x8effd8) },
          uScale: { value: 1.0 }
        }
      ]),
      vertexShader: `
        attribute float aSeed, aSize;
        uniform float uTime, uScale;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main() {
          vec3 p = position;
          float cyc = mod(uTime * 1.45 + aSeed, 24.0);
          p.y = position.y - mod(position.y, 1.0) + cyc;
          p.x += sin(uTime * 2.2 + aSeed + cyc * 0.4) * 0.55;
          p.z += cos(uTime * 1.9 + aSeed + cyc * 0.35) * 0.55;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * uScale * (115.0 / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = smoothstep(0.0, 2.5, cyc) * smoothstep(24.0, 16.0, cyc) * 0.78;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform vec3 uColor;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main() {
          if (vAlpha < 0.01) discard;
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.02) discard;
          gl_FragColor = vec4(uColor, tx.a * vAlpha);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.key = id === 'brine_pool' ? 'methane_hydrate' : 'serpentinite_vent';
    scene.add(pts);

    return {
      hasHydrates: true,
      sourceCount: sources.length,
      update() {},
      setScale(s) { mat.uniforms.uScale.value = s; }
    };
  };


  OC._FaunaSystems = {
    createCameraRelativeParticles,
    createCoralSpawningSystem,
    makeSplashSystem,
    makeBiolumTrail,
    makeThermoclineHaze,
    makeBenthicSiltSystem,
    makeHydratePlumeSystem
  };
})(window.OC);
