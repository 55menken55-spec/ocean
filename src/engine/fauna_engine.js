/* ================= ФАУНА: ЭКОСИСТЕМНЫЙ ИИ (BOIDS), ДЕНЬ/НОЧЬ, МЕГАФАУНА, ПЛАНКТОН ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  let fishMatInstanced = null;
  let fishMatBiolum = null;
  let creatureMat = null;
  let faunaGroup = null;
  let activeSchoolsRef = [];
  let qualityHookBound = false;

  /* ---------- Процедурная форма рыбы (нос +X, хвост -X) ---------- */
  OC._FaunaCtx = OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
  OC._FaunaBuilders = OC._FaunaBuilders || {};

  function createCameraRelativeParticles(scene, n, tex, mode, noSurface) {
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
  }

  /* ---------- Ночной массовый нерест кораллов (поднимающиеся гаметы) ---------- */
  function createCoralSpawningSystem(scene, n, tex) {
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
  }

  /* ---------- Система водных брызг (выпрыги китов, белух и морских львов) ---------- */
  function makeSplashSystem(scene, texHard) {
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
  }

  /* ---------- Биолюминесцентный след ночесветок (Noctiluca) при движении дайвера ---------- */
  function makeBiolumTrail(scene, tex, noSurface) {
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
  }

  /* ---------- Видимая оптическая дымка термоклина / галоклина (Schlieren haze veil) ---------- */
  function makeThermoclineHaze(scene, biome) {
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
  }

  /* ---------- Дно-подъёмные мутьевые шлейфы (Benthic Silt-Out Plumes) ---------- */
  function makeBenthicSiltSystem(scene, biome, texSoft) {
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
  }

  /* ---------- Шлейфы пузырьков газовых гидратов и холодных метановых сипов ---------- */
  function makeHydratePlumeSystem(scene, biome, texHard) {
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
  }

  /* ---------- Галапагосы: Океаническая луна-рыба (Mola mola), Морская игуана, Пингвин, Косатка, Мобула, Арка Дарвина, Фумаролы ---------- */

  function disposeFaunaGroup(scene) {
    if (!faunaGroup) return;
    const dGeos = new Set();
    const dMats = new Set();
    faunaGroup.traverse((o) => {
      if (o.geometry && !dGeos.has(o.geometry)) { o.geometry.dispose(); dGeos.add(o.geometry); }
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (m && !dMats.has(m)) { m.dispose(); dMats.add(m); }
        }
      }
    });
    scene.remove(faunaGroup);
    faunaGroup = null;
  }

  OC.FaunaEngine = {
    init(scene, biome) {
      disposeFaunaGroup(scene);
      faunaGroup = new T.Group();
      scene.add(faunaGroup);

      fishMatInstanced = OC._FaunaCtx.fishMatInstanced = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.48, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: biome.noSurface ? 0.0 : 0.56, fishSwim: true });

      fishMatBiolum = OC._FaunaCtx.fishMatBiolum = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true,
        emissive: new T.Color(0x2ce8ff),
        emissiveIntensity: 0.45,
        roughness: 0.42,
        metalness: 0.08,
        side: T.DoubleSide
      }), { causticStrength: biome.noSurface ? 0.0 : 0.34, fishSwim: true });

      creatureMat = OC._FaunaCtx.creatureMat = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.52, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: biome.noSurface ? 0.0 : 0.64 });

      const plan = biome.faunaPlan || {};
      const agents = [];
      const schools = [];
      const predatorAgents = [];
      const preySchools = [];
      const sonarTargets = [];
      const texSoft = OC.circleTexture(64, false);
      const texHard = OC.circleTexture(64, true);
      const splashSystem = makeSplashSystem(faunaGroup, texHard);
      const lastCamPos = new T.Vector3();

      const _splashTmp = new T.Vector3();
      function emitSplash(worldPos, intensity, zOpt) {
        let wp = worldPos;
        let inten = intensity;
        if (typeof worldPos === 'number') {
          _splashTmp.set(worldPos, 0, intensity || 0);
          wp = _splashTmp;
          inten = zOpt;
        }
        if (!wp || !Number.isFinite(wp.x) || !Number.isFinite(wp.z)) return;
        splashSystem.emit(wp, inten);
        if ((inten || 0) >= 0.6 && OC.sound && OC.sound.whaleSplash) {
          const d = Math.hypot(wp.x - lastCamPos.x, (wp.y || 0) - lastCamPos.y, wp.z - lastCamPos.z);
          if (d < 360) OC.sound.whaleSplash(d);
        }
      }

      const schoolsSpec = plan.schools || [];
      for (const s of schoolsSpec) {
        const sch = OC._FaunaBuilders.makeSchool(faunaGroup, biome, s);
        schools.push(sch);
        agents.push(sch);
        if (sch.isPredator) predatorAgents.push(sch);
        else if (sch.isPrey) preySchools.push(sch);
        sonarTargets.push(sch);
      }

      for (const sf of (plan.soloFish || [])) {
        const a = OC._FaunaBuilders.makeSoloFish(faunaGroup, biome, sf);
        agents.push(a);
      }

      for (const lf of (plan.lionfish || [])) {
        const a = OC._FaunaBuilders.makeLionfish(faunaGroup, biome, lf);
        agents.push(a);
        predatorAgents.push(a);
        sonarTargets.push(a);
      }

      for (const oct of (plan.octopus || [])) {
        agents.push(OC._FaunaBuilders.makeOctopus(faunaGroup, biome, oct));
      }

      for (const mor of (plan.moray || [])) {
        agents.push(OC._FaunaBuilders.makeMoray(faunaGroup, biome, mor));
      }

      for (const j of (plan.jellies || [])) {
        agents.push(OC._FaunaBuilders.makeJelly(faunaGroup, j));
      }

      for (const dg of (plan.dugongs || [])) {
        const a = OC._FaunaBuilders.makeDugong(faunaGroup, biome, dg);
        agents.push(a);
        sonarTargets.push(a);
      }

      const surfaceJumpers = [];
      for (const sl of (plan.seaLions || [])) {
        const a = OC._FaunaBuilders.makeSeaLion(faunaGroup, biome, sl, emitSplash);
        agents.push(a);
        surfaceJumpers.push(a);
        sonarTargets.push(a);
      }

      for (const tu of (plan.turtles || [])) {
        const a = OC._FaunaBuilders.makeTurtle(faunaGroup, biome, tu);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const ry of (plan.rays || [])) {
        const a = OC._FaunaBuilders.makeRay(faunaGroup, biome, ry);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const mn of (plan.mantas || [])) {
        const a = OC._FaunaBuilders.makeManta(faunaGroup, biome, mn);
        agents.push(a);
        sonarTargets.push(a);
      }

      const huntingAgents = [];
      for (const sh of (plan.sharks || [])) {
        const a = OC._FaunaBuilders.makeShark(faunaGroup, biome, sh);
        agents.push(a);
        if (a.isActivePredator) {
          predatorAgents.push(a);
          huntingAgents.push(a);
        }
        sonarTargets.push(a);
      }

      for (const angF of (plan.anglers || [])) {
        const a = OC._FaunaBuilders.makeAnglerfish(faunaGroup, biome, angF);
        agents.push(a);
        predatorAgents.push(a);
        sonarTargets.push(a);
      }

      for (const sq of (plan.squids || [])) {
        const a = OC._FaunaBuilders.makeAbyssalSquid(faunaGroup, biome, sq);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const db of (plan.dumbos || [])) {
        agents.push(OC._FaunaBuilders.makeDumboOctopus(faunaGroup, biome, db));
      }

      for (const bl of (plan.belugas || [])) {
        const a = OC._FaunaBuilders.makeBeluga(faunaGroup, biome, bl, emitSplash);
        agents.push(a);
        surfaceJumpers.push(a);
        sonarTargets.push(a);
      }

      for (const nw of (plan.narwhals || [])) {
        const a = OC._FaunaBuilders.makeNarwhal(faunaGroup, biome, nw);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const aj of (plan.arcticJellies || [])) {
        agents.push(OC._FaunaBuilders.makeArcticJelly(faunaGroup, aj));
      }

      for (const cl of (plan.cliones || [])) {
        agents.push(OC._FaunaBuilders.makeClione(faunaGroup, cl));
      }

      for (const wr of (plan.wrecks || [])) {
        const a = OC._FaunaBuilders.makeShipwreck(faunaGroup, biome, wr);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const hm of (plan.hammerheads || [])) {
        const a = OC._FaunaBuilders.makeHammerhead(faunaGroup, biome, hm);
        agents.push(a);
        predatorAgents.push(a);
        huntingAgents.push(a);
        sonarTargets.push(a);
      }

      for (const gj of (plan.goldenJellies || [])) {
        agents.push(OC._FaunaBuilders.makeGoldenJelly(faunaGroup, gj));
      }

      let whale = null;
      const whalesList = [];
      for (const wh of (plan.whales || [])) {
        const w = OC._FaunaBuilders.makeHumpbackWhale(faunaGroup, biome, wh, emitSplash);
        if (!whale) whale = w;
        whalesList.push(w);
        agents.push(w);
        sonarTargets.push(w);
      }

      let primaryVessel = null;
      for (const vs of (plan.vessels || [])) {
        const v = OC._FaunaBuilders.makeResearchVessel(faunaGroup, biome, vs);
        if (!primaryVessel) primaryVessel = v;
        agents.push(v);
        sonarTargets.push(v);
      }

      for (const sb of (plan.seabirds || [])) {
        agents.push(OC._FaunaBuilders.makeSeabirdFlock(faunaGroup, biome, sb, emitSplash));
      }

      for (const dl of (plan.dolphins || [])) {
        const d = OC._FaunaBuilders.makeDolphinPod(faunaGroup, biome, dl, emitSplash);
        agents.push(d);
        surfaceJumpers.push(d);
        sonarTargets.push(d);
      }

      for (const ff of (plan.flyingFish || [])) {
        agents.push(OC._FaunaBuilders.makeFlyingFishPod(faunaGroup, biome, ff, emitSplash));
      }

      for (const wf of (plan.whaleFalls || [])) {
        const wfo = OC._FaunaBuilders.makeWhaleFall(faunaGroup, biome, wf);
        agents.push(wfo);
        sonarTargets.push(wfo);
      }

      for (const sf of (plan.snailfishes || [])) {
        const sfo = OC._FaunaBuilders.makeHadalSnailfish(faunaGroup, biome, sf);
        agents.push(sfo);
        sonarTargets.push(sfo);
      }

      for (const sp of (plan.seaPigs || [])) {
        agents.push(OC._FaunaBuilders.makeSeaPig(faunaGroup, biome, sp));
      }

      for (const bl of (plan.brineLakes || [])) {
        const blo = OC._FaunaBuilders.makeBrineLake(faunaGroup, biome, bl);
        agents.push(blo);
        sonarTargets.push(blo);
      }

      for (const sph of (plan.siphonophores || [])) {
        const spho = OC._FaunaBuilders.makeSiphonophore(faunaGroup, biome, sph);
        agents.push(spho);
        sonarTargets.push(spho);
      }

      for (const orf of (plan.oarfishes || [])) {
        const orfo = OC._FaunaBuilders.makeOarfish(faunaGroup, biome, orf);
        agents.push(orfo);
        sonarTargets.push(orfo);
      }

      for (const ch of (plan.chimaeras || [])) {
        const cho = OC._FaunaBuilders.makeChimaera(faunaGroup, biome, ch);
        agents.push(cho);
        sonarTargets.push(cho);
      }

      for (const al of (plan.ariadneLines || [])) {
        const alo = OC._FaunaBuilders.makeAriadneGuideline(faunaGroup, biome, al);
        agents.push(alo);
        sonarTargets.push(alo);
      }

      for (const hc of (plan.haloclines || [])) {
        const hco = OC._FaunaBuilders.makeHaloclineLayer(faunaGroup, biome, hc);
        agents.push(hco);
        sonarTargets.push(hco);
      }

      for (const rm of (plan.remipedes || [])) {
        const rmo = OC._FaunaBuilders.makeCaveRemipede(faunaGroup, biome, rm);
        agents.push(rmo);
        sonarTargets.push(rmo);
      }

      for (const br of (plan.blindBrotulas || [])) {
        const bro = OC._FaunaBuilders.makeBlindBrotula(faunaGroup, biome, br);
        agents.push(bro);
        sonarTargets.push(bro);
      }

      for (const sf of (plan.sunfishes || [])) {
        const sfo = OC._FaunaBuilders.makeOceanSunfish(faunaGroup, biome, sf);
        agents.push(sfo);
        sonarTargets.push(sfo);
      }

      for (const ig of (plan.marineIguanas || [])) {
        const igo = OC._FaunaBuilders.makeMarineIguana(faunaGroup, biome, ig);
        agents.push(igo);
        sonarTargets.push(igo);
      }

      for (const pg of (plan.penguins || [])) {
        const pgo = OC._FaunaBuilders.makeGalapagosPenguin(faunaGroup, biome, pg, emitSplash);
        agents.push(pgo);
        surfaceJumpers.push(pgo);
        sonarTargets.push(pgo);
      }

      for (const oc of (plan.orcas || [])) {
        const oco = OC._FaunaBuilders.makeOrca(faunaGroup, biome, oc, emitSplash);
        agents.push(oco);
        predatorAgents.push(oco);
        surfaceJumpers.push(oco);
        sonarTargets.push(oco);
      }

      for (const mb of (plan.mobulas || [])) {
        const mbo = OC._FaunaBuilders.makeMobulaRay(faunaGroup, biome, mb, emitSplash);
        agents.push(mbo);
        surfaceJumpers.push(mbo);
        sonarTargets.push(mbo);
      }

      for (const pd of (plan.pinkDolphins || [])) {
        const pdo = OC._FaunaBuilders.makePinkDolphin(faunaGroup, biome, pd, emitSplash);
        agents.push(pdo);
        surfaceJumpers.push(pdo);
        sonarTargets.push(pdo);
      }

      for (const ar of (plan.arapaimas || [])) {
        const aro = OC._FaunaBuilders.makeArapaima(faunaGroup, biome, ar, emitSplash);
        agents.push(aro);
        sonarTargets.push(aro);
      }

      for (const ee of (plan.electricEels || [])) {
        const eeo = OC._FaunaBuilders.makeElectricEel(faunaGroup, biome, ee);
        agents.push(eeo);
        sonarTargets.push(eeo);
      }

      for (const rs of (plan.riverStingrays || [])) {
        const rso = OC._FaunaBuilders.makeRiverStingray(faunaGroup, biome, rs);
        agents.push(rso);
        sonarTargets.push(rso);
      }

      for (const da of (plan.darwinsArches || [])) {
        const dao = OC._FaunaBuilders.makeDarwinsArch(faunaGroup, biome, da);
        agents.push(dao);
        sonarTargets.push(dao);
      }

      for (const fm of (plan.fumaroles || [])) {
        const fmo = OC._FaunaBuilders.makeFumaroleVents(faunaGroup, biome, fm);
        agents.push(fmo);
      }

      // ---- Пузыри, планктон, морской снег и шлейфы курильщиков ----
      const pCountMult = OC.Quality.get().particlesScale;
      for (const vp of (plan.ventPlumes || [])) {
        agents.push(OC._FaunaBuilders.makeVentPlume(faunaGroup, biome, texSoft, vp));
      }
      const noSurf = !!biome.noSurface;
      const bubbleMat = createCameraRelativeParticles(faunaGroup, noSurf ? 80 : Math.round(900 * pCountMult), texHard, 'bubbles', noSurf);
      const planktonMat = createCameraRelativeParticles(faunaGroup, Math.round(1500 * pCountMult), texSoft, 'plankton', noSurf);
      const snowMat = createCameraRelativeParticles(faunaGroup, Math.round((noSurf ? 1400 : 1050) * pCountMult), texSoft, 'snow', noSurf);
      const isCoralBiome = (biome.id === 'great_barrier_reef' || biome.id === 'wreck_atoll' || biome.id === 'galapagos_upwelling');
      const coralSpawnSys = isCoralBiome ? createCoralSpawningSystem(faunaGroup, Math.round(340 * pCountMult), texSoft) : null;
      const thermoHaze = makeThermoclineHaze(faunaGroup, biome);
      const benthicSilt = makeBenthicSiltSystem(faunaGroup, biome, texSoft);
      const hydratePlumes = makeHydratePlumeSystem(faunaGroup, biome, texHard);
      const biolumTrail = makeBiolumTrail(faunaGroup, texSoft, noSurf);

      const bioPlanktonCol = new T.Color(0x52f2ff);
      const dayPlanktonCol = new T.Color(0x9be8ff);

      const predatorsBuf = [];
      const preyCentersBuf = [];
      const cleanClientsBuf = [];
      const sonarOrigin = new T.Vector3();
      const updateCtx = {
        dayW: 1.0,
        camSpeed: 0,
        flashOn: false,
        fishActivity: 1.0,
        predators: predatorsBuf,
        preyCenters: preyCentersBuf,
        cleanClients: cleanClientsBuf,
        cleaningStations: plan.cleaningStations || [],
        sonarOrigin,
        sonarPulseAge: 99,
        frameIdx: 0
      };
      const _scanSample = new T.Vector3();
      const _toTarget = new T.Vector3();
      const _currFlow = new T.Vector3();
      const _flowAccum = new T.Vector3();

      function refreshFaunaCounts() {
        let total = 0;
        for (const sch of activeSchoolsRef) total += sch.getCount();
        OC.faunaInfo.schoolFish = total;
      }

      const _shadowCaster = { active: false, x: 0, y: 0, z: 0, radius: 4.5, key: '' };
      const SHADOW_RADII = {
        whale_humpback: 10.5, shark_whale: 7.8, orca: 5.8, manta: 4.6, mobula_ray: 4.2,
        shark_hammerhead: 3.6, galapagos_shark: 3.4, shark_tiger: 3.6, ocean_sunfish: 3.2,
        pink_dolphin: 3.1, arapaima: 3.2, narwhal: 3.5, beluga: 3.4, turtle: 2.4, dugong: 2.8, sea_lion: 2.3
      };

      activeSchoolsRef = schools;
      OC.faunaInfo = {
        schoolFish: 0,
        schools: schools.length,
        big: agents.length - schools.length,
        whale,
        vessel: primaryVessel ? primaryVessel.shipInfo : null,
        shadowCaster: _shadowCaster,
        activeEvent: null,
        dvmPhase: 'day_deep',
        dvmShiftM: -5.5,
        coralSpawnIntensity: 0,
        nocturnalPredators: 0,
        thermoclineActive: false,
        thermoDepthM: thermoHaze.enabled ? Math.abs(thermoHaze.thermoY) : 0,
        siltTurbidity: 0,
        siltCount: 0,
        hydratePlumesActive: !!hydratePlumes.hasHydrates
      };
      refreshFaunaCounts();

      if (!qualityHookBound) {
        qualityHookBound = true;
        OC.Quality.onChange((preset) => {
          for (const sch of activeSchoolsRef) sch.setQualityScale(preset.fishScale);
          refreshFaunaCounts();
        });
      }

      return {
        agents,
        whale,
        getVesselInfo: () => (primaryVessel ? primaryVessel.shipInfo : null),
        notifySonarPing(origin) {
          if (origin) sonarOrigin.copy(origin);
          updateCtx.sonarPulseAge = 0;
        },
        notifySiltKick(origin, strength) {
          if (benthicSilt && origin) benthicSilt.kick(origin, strength || 1.0);
        },
        getSplashCount: () => splashSystem.getActiveCount(),
        getActiveEvent: () => OC.faunaInfo.activeEvent,
        update(dt, time, camPos, camSpeed, flashOn) {
          const pal = OC.getPalette();
          const dayW = pal && typeof pal.dayW === 'number' ? pal.dayW : 1.0;

          lastCamPos.copy(camPos);
          updateCtx.dayW = dayW;
          updateCtx.camSpeed = camSpeed || 0;
          updateCtx.flashOn = !!flashOn;
          const ecoState = OC.EcoLab ? OC.EcoLab.getState() : null;
          updateCtx.fishActivity = ecoState ? ecoState.fishActivity : 1.0;
          updateCtx.frameIdx++;
          if (updateCtx.sonarPulseAge < 90) updateCtx.sonarPulseAge += dt;

          // Собираем активных хищников и косяки жертв в переиспользуемые массивы (без GC аллокаций)
          predatorsBuf.length = 0;
          let noctCount = 0;
          for (let i = 0; i < predatorAgents.length; i++) {
            const pa = predatorAgents[i];
            if (pa.isNocturnalPredator && dayW > 0.55) continue;
            if (pa.isNocturnalPredator) noctCount++;
            const p = pa.getPosition ? pa.getPosition() : null;
            if (p) predatorsBuf.push(p);
          }
          OC.faunaInfo.nocturnalPredators = noctCount;

          preyCentersBuf.length = 0;
          for (let i = 0; i < preySchools.length; i++) {
            const ps = preySchools[i];
            if (ps.mesh && ps.mesh.visible && ps.center) preyCentersBuf.push(ps.center);
          }

          // Клиенты станций чистки и выбор ближайшей мегафауны для тени на мелководном дне
          _shadowCaster.active = false;
          let bestShadowScore = 1e9;
          for (let i = 0; i < agents.length; i++) {
            const ag = agents[i];
            if (!ag || !ag.key || !ag.getPosition) continue;
            const sr = SHADOW_RADII[ag.key];
            if (!sr) continue;
            const ap = ag.getPosition();
            const dCam = Math.hypot(ap.x - camPos.x, ap.z - camPos.z);
            if (dCam < 135 && dCam - sr * 4 < bestShadowScore) {
              bestShadowScore = dCam - sr * 4;
              _shadowCaster.active = true;
              _shadowCaster.x = ap.x;
              _shadowCaster.y = ap.y;
              _shadowCaster.z = ap.z;
              _shadowCaster.radius = sr;
              _shadowCaster.key = ag.key;
            }
          }

          // Клиенты станций чистки заполняются агентами в этом кадре (если остаются рядом — используются в следующем)
          cleanClientsBuf.length = 0;

          if (fishMatBiolum) {
            fishMatBiolum.emissiveIntensity = OC.lerp(1.45, 0.25, dayW) + (pal.bioGlow || 0) * 0.45;
          }

          for (let i = 0; i < agents.length; i++) {
            agents[i].update(dt, time, camPos, updateCtx);
          }
          splashSystem.update(dt);

          // Классифицируем ключевое природное событие в радиусе видимости
          let ev = null;
          for (let i = 0; i < whalesList.length; i++) {
            if (whalesList[i].isBreaching()) {
              const p = whalesList[i].getPosition();
              if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 420) { ev = 'breach'; break; }
            }
          }
          if (!ev) {
            for (let i = 0; i < huntingAgents.length; i++) {
              if (huntingAgents[i].isHunting()) {
                const p = huntingAgents[i].getPosition();
                if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 160) { ev = 'hunt'; break; }
              }
            }
          }
          if (!ev) {
            for (let i = 0; i < preySchools.length; i++) {
              if (preySchools[i].getPanic && preySchools[i].getPanic() > 0.5) {
                const p = preySchools[i].center;
                if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 140) { ev = 'baitball'; break; }
              }
            }
          }
          if (!ev && cleanClientsBuf.length > 0) {
            for (let i = 0; i < cleanClientsBuf.length; i++) {
              const p = cleanClientsBuf[i];
              if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 120) { ev = 'cleaning'; break; }
            }
          }
          if (!ev) {
            for (let i = 0; i < surfaceJumpers.length; i++) {
              if (surfaceJumpers[i].isPorpoising && surfaceJumpers[i].isPorpoising()) {
                const p = surfaceJumpers[i].getPosition();
                if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 190) { ev = 'porpoising'; break; }
              }
            }
          }
          // Суточный цикл экосистемы: вертикальная миграция планктона (DVM) и ночной нерест кораллов
          const tod = OC.getTimeOfDay ? OC.getTimeOfDay() : 0.5;
          const dvmShift = noSurf ? 0 : OC.lerp(6.5, -5.5, dayW);
          const dvmPhase = noSurf
            ? 'abyss_constant'
            : (dayW > 0.68 ? 'day_deep' : (dayW < 0.26 ? 'night_surface' : (tod > 0.5 ? 'dusk_ascent' : 'dawn_descent')));
          const coralSpawnIntensity = isCoralBiome ? OC.clamp((0.38 - dayW) / 0.28, 0, 1) : 0;
          OC.faunaInfo.dvmPhase = dvmPhase;
          OC.faunaInfo.dvmShiftM = Math.round(dvmShift * 10) / 10;
          OC.faunaInfo.coralSpawnIntensity = Math.round(coralSpawnIntensity * 100) / 100;

          if (!ev && coralSpawnIntensity > 0.35 && camPos.y > -34) {
            ev = 'coral_spawn';
          } else if (!ev && !noSurf && (dvmPhase === 'dusk_ascent' || (dvmPhase === 'night_surface' && !isCoralBiome))) {
            ev = 'dvm';
          }
          OC.faunaInfo.activeEvent = ev;

          bubbleMat.uniforms.uCamPos.value.copy(camPos);
          planktonMat.uniforms.uCamPos.value.copy(camPos);
          planktonMat.uniforms.uDvmShift.value = dvmShift;
          snowMat.uniforms.uCamPos.value.copy(camPos);

          if (coralSpawnSys) {
            coralSpawnSys.pts.visible = coralSpawnIntensity > 0.02;
            coralSpawnSys.mat.uniforms.uCamPos.value.copy(camPos);
            coralSpawnSys.mat.uniforms.uIntensity.value = coralSpawnIntensity;
          }

          // Плавная адвекция планктона, пузырей и морского снега по локальному течению
          if (biome.getCurrentAt && (biome.noSurface || camPos.y < 1.5)) {
            biome.getCurrentAt(camPos.x, camPos.y, camPos.z, time, _currFlow);
            const flowMult = ecoState ? ecoState.currentMult : 1.0;
            _flowAccum.addScaledVector(_currFlow, dt * 1.35 * flowMult);
            _flowAccum.x = ((_flowAccum.x % 180) + 180) % 180;
            _flowAccum.y = ((_flowAccum.y % 110) + 110) % 110;
            _flowAccum.z = ((_flowAccum.z % 180) + 180) % 180;
            bubbleMat.uniforms.uFlowOffset.value.copy(_flowAccum);
            planktonMat.uniforms.uFlowOffset.value.copy(_flowAccum);
            snowMat.uniforms.uFlowOffset.value.copy(_flowAccum);
            if (coralSpawnSys) coralSpawnSys.mat.uniforms.uFlowOffset.value.copy(_flowAccum);
          }

          planktonMat.uniforms.uBio.value = pal.bioGlow;
          planktonMat.uniforms.uColor.value.copy(pal.bioGlow > 0.45 ? bioPlanktonCol : dayPlanktonCol);
          snowMat.uniforms.uBio.value = flashOn ? 1.0 : 0.15;
          thermoHaze.update(camPos, dayW);
          OC.faunaInfo.thermoclineActive = !!(thermoHaze.enabled && Math.abs(camPos.y - thermoHaze.thermoY) < 3.6);
          const siltSt = benthicSilt.update(dt, time, camPos, camSpeed || 0);
          OC.faunaInfo.siltTurbidity = Math.round(siltSt.turbidity * 100) / 100;
          OC.faunaInfo.siltCount = siltSt.active;
          if (!ev && siltSt.turbidity > 0.38) OC.faunaInfo.activeEvent = 'silt_out';
          biolumTrail.update(dt, time, camPos, camSpeed || 0, pal.bioGlow || 0, !!flashOn);
        },
        setScale(s) {
          bubbleMat.uniforms.uScale.value = s;
          planktonMat.uniforms.uScale.value = s;
          snowMat.uniforms.uScale.value = s;
          if (coralSpawnSys) coralSpawnSys.mat.uniforms.uScale.value = s;
          benthicSilt.setScale(s);
          hydratePlumes.setScale(s);
          biolumTrail.setScale(s);
          splashSystem.setScale(s);
        },
        /* Активное сонарное сканирование вперёд по курсу (рельеф + крупная фауна/стаи) */
        scanForward(origin, dir, maxRange) {
          const maxR = maxRange || 140;
          let bestDist = Infinity;
          let bestKind = 'none';
          let bestLabel = 'Чистая вода';

          // 1. Проверяем пересечение с рельефом дна / стеной
          const step = 4.0;
          for (let d = 6; d <= maxR; d += step) {
            _scanSample.copy(origin).addScaledVector(dir, d);
            const fl = biome.getHeight(_scanSample.x, _scanSample.z);
            if (_scanSample.y <= fl + 0.6) {
              // Уточняем расстояние половинным делением
              let lo = d - step, hi = d;
              for (let k = 0; k < 3; k++) {
                const mid = (lo + hi) * 0.5;
                _scanSample.copy(origin).addScaledVector(dir, mid);
                if (_scanSample.y <= biome.getHeight(_scanSample.x, _scanSample.z) + 0.6) hi = mid;
                else lo = mid;
              }
              bestDist = hi;
              bestKind = 'terrain';
              const zHit = biome.getZoneAt(_scanSample.x, _scanSample.y, _scanSample.z);
              bestLabel = 'Рельеф · ' + (zHit ? zHit.shortName : 'дно');
              break;
            }
          }

          // 2. Проверяем попадание живых объектов в передний конус ~16 градусов (cos > 0.96)
          let bestKey = null;
          for (let i = 0; i < sonarTargets.length; i++) {
            const tgt = sonarTargets[i];
            const pos = tgt.getPosition ? tgt.getPosition() : null;
            if (!pos) continue;
            _toTarget.subVectors(pos, origin);
            const dist = _toTarget.length();
            if (dist < 4 || dist > maxR || dist >= bestDist) continue;
            const dot = _toTarget.dot(dir) / dist;
            if (dot > 0.945) {
              bestDist = dist;
              bestKind = 'fauna';
              bestKey = tgt.key || null;
              const enc = biome.encyclopedia[tgt.key];
              bestLabel = enc ? enc[0] : (tgt.key || 'Морской объект');
            }
          }

          return {
            hit: bestDist <= maxR,
            range: bestDist <= maxR ? bestDist : maxR,
            kind: bestKind,
            key: bestKey,
            label: bestLabel
          };
        },
        /* Фокусный сканер подводной фотокамеры по всем существам в кадре */
        scanCameraTarget(origin, dir, maxRange) {
          const maxR = maxRange || 95;
          let bestScore = -1;
          let best = null;
          for (let i = 0; i < agents.length; i++) {
            const tgt = agents[i];
            const pos = tgt.getPosition ? tgt.getPosition() : null;
            if (!pos) continue;
            _toTarget.subVectors(pos, origin);
            const dist = _toTarget.length();
            if (dist < 1.5 || dist > maxR) continue;
            const dot = _toTarget.dot(dir) / dist;
            if (dot < 0.89) continue; // ~27° конус видоискателя
            // Ближние и хорошо отцентрированные цели получают более высокий приоритет
            const score = (dot - 0.88) * 12.0 + (1.0 - dist / maxR) * 1.4;
            if (score > bestScore) {
              bestScore = score;
              const enc = biome.encyclopedia[tgt.key];
              best = {
                hit: true,
                key: tgt.key,
                label: enc ? enc[0] : tgt.key,
                latin: enc ? enc[1] : '',
                dist,
                align: OC.clamp((dot - 0.89) / 0.11, 0, 1)
              };
            }
          }
          return best;
        },
        /* Пассивный гидроакустический сканер всех звучащих существ и гео-источников вокруг */
        scanAcousticSources(origin, maxRange) {
          const maxR = maxRange || 260;
          const out = [];
          for (let i = 0; i < agents.length; i++) {
            const tgt = agents[i];
            const pos = tgt.getPosition ? tgt.getPosition() : null;
            if (!pos) continue;
            const dx = pos.x - origin.x;
            const dy = pos.y - origin.y;
            const dz = pos.z - origin.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist > maxR) continue;
            const enc = biome.encyclopedia && biome.encyclopedia[tgt.key];
            const amp = Math.pow(1.0 - dist / maxR, 1.35);
            const bearingDeg = ((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360;
            out.push({
              key: tgt.key,
              label: enc ? enc[0] : (tgt.key || 'Акустический объект'),
              dist,
              bearingDeg,
              amp,
              x: pos.x,
              y: pos.y,
              z: pos.z
            });
          }
          // Геоакустические ориентиры (чёрные курильщики, фумаролы, метановые сипы, ледяные сталактиты)
          if (biome && Array.isArray(biome.landmarks)) {
            for (let i = 0; i < biome.landmarks.length; i++) {
              const lm = biome.landmarks[i];
              if (!lm) continue;
              const lid = (lm.id || '').toLowerCase();
              let geoKey = null;
              if (lid.includes('smoker') || lid.includes('vent')) geoKey = 'vent_chimney';
              else if (lid.includes('fumarole')) geoKey = 'volcanic_fumarole';
              else if (lid.includes('hydrate') || lid.includes('seep') || lid.includes('brine')) geoKey = 'methane_hydrate';
              else if (lid.includes('brinicle') || lid.includes('ice')) geoKey = 'brinicle';
              if (!geoKey) continue;
              const ly = lm.y - 3.0;
              const dx = lm.x - origin.x;
              const dy = ly - origin.y;
              const dz = lm.z - origin.z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist > maxR) continue;
              const amp = Math.pow(1.0 - dist / maxR, 1.4) * 0.72;
              const bearingDeg = ((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360;
              out.push({
                key: geoKey,
                label: lm.name || 'Геоакустический источник',
                dist,
                bearingDeg,
                amp,
                x: lm.x,
                y: ly,
                z: lm.z
              });
            }
          }
          out.sort((a, b) => b.amp - a.amp);
          return out.slice(0, 6);
        }
      };
    },

    /* Генератор изолированной 3D-модели любого вида или объекта для Атласа */
    createPreviewMesh(key, biome) {
      const dummyBiome = { getHeight: () => -30 };
      const tmpGroup = new T.Group();
      const previewMat = new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.44, metalness: 0.08, side: T.DoubleSide
      });
      const previewBiolumMat = new T.MeshStandardMaterial({
        vertexColors: true,
        emissive: new T.Color(0x2ce8ff),
        emissiveIntensity: 0.55,
        roughness: 0.36,
        metalness: 0.08,
        side: T.DoubleSide
      });
      const savedMat = OC._FaunaCtx.creatureMat;
      let built = null;

      try {
        OC._FaunaCtx.creatureMat = previewMat;

        if (key === 'floor') {
          const g = new T.PlaneGeometry(14, 14, 16, 16);
          g.rotateX(-Math.PI / 2);
          const pos = g.attributes.position;
          const colors = new Float32Array(pos.count * 3);
          const c = new T.Color();
          const bId = biome ? biome.id : 'great_barrier_reef';
          const ox = bId === 'great_barrier_reef' ? 80 : 0;
          const oz = 0;
          let sumY = 0;
          for (let i = 0; i < pos.count; i++) {
            const wx = pos.getX(i) + ox;
            const wz = pos.getZ(i) + oz;
            const y = biome && biome.getHeight ? biome.getHeight(wx, wz) : Math.sin(wx * 0.4) * 0.6;
            pos.setY(i, y);
            sumY += y;
          }
          const avgY = sumY / pos.count;
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            pos.setY(i, (y - avgY) * 0.85);
            if (bId === 'hydrothermal_vents') {
              c.setHex(0x24262e).offsetHSL(0, 0, Math.sin(x * 0.7 + z * 0.5) * 0.05);
            } else if (bId === 'kelp_forest') {
              c.setHex(0x52554c).offsetHSL(0.02, 0.05, Math.cos(x * 0.5) * 0.06);
            } else if (bId === 'arctic_sea') {
              c.setHex(0x4b5c69).lerp(new T.Color(0x88b4cc), OC.clamp((y - avgY) * 0.25 + 0.3, 0, 0.7));
            } else if (bId === 'wreck_atoll') {
              c.setHex(0xe5d7b4).lerp(new T.Color(0x8ab894), Math.sin(x * 0.38 + z * 0.42) * 0.35 + 0.35);
            } else if (bId === 'mariana_trench') {
              c.setHex(0x282c36).lerp(new T.Color(0x6d8492), Math.sin(x * 0.45 + z * 0.35) * 0.25 + 0.25);
            } else if (bId === 'brine_pool') {
              c.setHex(0x3a3248).lerp(new T.Color(0x8cd2d8), Math.sin(x * 0.42 + z * 0.42) * 0.32 + 0.35);
            } else if (bId === 'cenote_caves') {
              c.setHex(0x8e836e).lerp(new T.Color(0xcab999), Math.sin(x * 0.44 + z * 0.4) * 0.38 + 0.4);
            } else if (bId === 'galapagos_upwelling') {
              c.setHex(0x232228).lerp(new T.Color(0x4c5840), Math.sin(x * 0.4 + z * 0.4) * 0.3 + 0.3);
            } else if (bId === 'amazon_igapo') {
              c.setHex(0x4a331d).lerp(new T.Color(0x8e6b42), Math.sin(x * 0.42 + z * 0.38) * 0.35 + 0.35);
            } else {
              c.setHex(0xdbc9a4).lerp(new T.Color(0xc49c76), Math.sin(x * 0.45 + z * 0.45) * 0.5 + 0.5);
            }
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
          }
          g.setAttribute('color', new T.BufferAttribute(colors, 3));
          g.computeVertexNormals();
          built = new T.Mesh(g, previewMat);
        } else if (key === 'lionfish') {
          OC._FaunaBuilders.makeLionfish(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'moray') {
          OC._FaunaBuilders.makeMoray(tmpGroup, dummyBiome, { x: 0, z: 0 });
        } else if (key === 'octopus') {
          OC._FaunaBuilders.makeOctopus(tmpGroup, dummyBiome, { x: 0, z: 0, scale: 1 });
        } else if (key === 'ray_spotted' || key === 'ray_eagle') {
          OC._FaunaBuilders.makeRay(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, speed: 2, eagle: key === 'ray_eagle', scale: 1 });
        } else if (key === 'manta') {
          OC._FaunaBuilders.makeManta(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, span: 10, size: 1 });
        } else if (key === 'turtle') {
          OC._FaunaBuilders.makeTurtle(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, size: 1 });
        } else if (key === 'dugong') {
          OC._FaunaBuilders.makeDugong(tmpGroup, dummyBiome, { cx: 0, cz: 0, r: 10, scale: 1 });
        } else if (key === 'shark_reef' || key === 'shark_whale' || key === 'shark_leopard' || key === 'shark_greenland' || key === 'galapagos_shark') {
          OC._FaunaBuilders.makeShark(tmpGroup, dummyBiome, {
            cx: 0, cz: 0, y: 0, r: 10, speed: 2,
            speciesKey: key, whaleShark: key === 'shark_whale'
          });
        } else if (key === 'whale_humpback') {
          OC._FaunaBuilders.makeHumpbackWhale(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 20 });
        } else if (key === 'jelly' || key === 'jelly_deep') {
          OC._FaunaBuilders.makeJelly(tmpGroup, { cx: 0, cz: 0, y: 0, r: 2, hue: key === 'jelly_deep' ? 0.56 : 0.85, deep: key === 'jelly_deep', scale: 1 });
        } else if (key === 'sea_lion') {
          OC._FaunaBuilders.makeSeaLion(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'fish_angler') {
          OC._FaunaBuilders.makeAnglerfish(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'squid_abyssal') {
          OC._FaunaBuilders.makeAbyssalSquid(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'octopus_dumbo') {
          OC._FaunaBuilders.makeDumboOctopus(tmpGroup, dummyBiome, { x: 0, z: 0, scale: 1 });
        } else if (key === 'beluga') {
          OC._FaunaBuilders.makeBeluga(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, len: 4.8, scale: 1 });
        } else if (key === 'narwhal') {
          OC._FaunaBuilders.makeNarwhal(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, len: 5.0, scale: 1 });
        } else if (key === 'jelly_arctic') {
          OC._FaunaBuilders.makeArcticJelly(tmpGroup, { cx: 0, cz: 0, y: 0, scale: 1 });
        } else if (key === 'clione_angel') {
          OC._FaunaBuilders.makeClione(tmpGroup, { cx: 0, cz: 0, y: 0, n: 1, singlePreview: true });
        } else if (key === 'shipwreck') {
          OC._FaunaBuilders.makeShipwreck(tmpGroup, dummyBiome, { x: 0, z: 0, yOffset: 0, pitch: 0, yaw: 0, roll: 0 });
        } else if (key === 'shark_hammerhead') {
          OC._FaunaBuilders.makeHammerhead(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, len: 4.8 });
        } else if (key === 'jelly_golden') {
          OC._FaunaBuilders.makeGoldenJelly(tmpGroup, { cx: 0, cz: 0, y: 0, scale: 1 });
        } else if (key === 'research_vessel') {
          const bId = biome ? biome.id : 'great_barrier_reef';
          const vVariant = bId === 'arctic_sea' ? 'polar' : bId === 'kelp_forest' ? 'coastal' : bId === 'wreck_atoll' ? 'expedition' : (bId === 'galapagos_upwelling' ? 'galapagos' : 'tropical');
          OC._FaunaBuilders.makeResearchVessel(tmpGroup, dummyBiome, { x: 0, z: 0, yaw: 0, variant: vVariant, preview: true });
        } else if (key === 'seabird') {
          const bId = biome ? biome.id : 'great_barrier_reef';
          const sVariant = bId === 'arctic_sea' ? 'arctic' : bId === 'kelp_forest' ? 'albatross' : (bId === 'galapagos_upwelling' ? 'booby' : 'tropical');
          OC._FaunaBuilders.makeSeabirdFlock(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, singlePreview: true, variant: sVariant });
        } else if (key === 'dolphin') {
          const bId = biome ? biome.id : 'great_barrier_reef';
          const dVariant = bId === 'arctic_sea' ? 'arctic' : bId === 'kelp_forest' ? 'pacific' : 'spinner';
          OC._FaunaBuilders.makeDolphinPod(tmpGroup, dummyBiome, { cx: 0, cz: 0, r: 10, singlePreview: true, variant: dVariant });
        } else if (key === 'flying_fish') {
          OC._FaunaBuilders.makeFlyingFishPod(tmpGroup, dummyBiome, { cx: 0, cz: 0, r: 10, singlePreview: true });
        } else if (key === 'whale_fall') {
          OC._FaunaBuilders.makeWhaleFall(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'hadal_snailfish') {
          OC._FaunaBuilders.makeHadalSnailfish(tmpGroup, dummyBiome, { cx: 0, cz: 0, scale: 1.5 });
        } else if (key === 'sea_pig') {
          OC._FaunaBuilders.makeSeaPig(tmpGroup, dummyBiome, { cx: 0, cz: 0, singlePreview: true });
        } else if (key === 'brine_pool_lake') {
          OC._FaunaBuilders.makeBrineLake(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'siphonophore') {
          OC._FaunaBuilders.makeSiphonophore(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'oarfish') {
          OC._FaunaBuilders.makeOarfish(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'chimaera') {
          OC._FaunaBuilders.makeChimaera(tmpGroup, dummyBiome, { cx: 0, cz: 0, scale: 1.25 });
        } else if (key === 'ariadne_line') {
          OC._FaunaBuilders.makeAriadneGuideline(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'halocline_layer') {
          OC._FaunaBuilders.makeHaloclineLayer(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'cave_remipede') {
          OC._FaunaBuilders.makeCaveRemipede(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'blind_brotula') {
          OC._FaunaBuilders.makeBlindBrotula(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'ocean_sunfish') {
          OC._FaunaBuilders.makeOceanSunfish(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'marine_iguana') {
          OC._FaunaBuilders.makeMarineIguana(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'galapagos_penguin') {
          OC._FaunaBuilders.makeGalapagosPenguin(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'orca') {
          OC._FaunaBuilders.makeOrca(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'mobula_ray') {
          OC._FaunaBuilders.makeMobulaRay(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'darwins_arch') {
          OC._FaunaBuilders.makeDarwinsArch(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'pink_dolphin') {
          OC._FaunaBuilders.makePinkDolphin(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'arapaima') {
          OC._FaunaBuilders.makeArapaima(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'electric_eel') {
          OC._FaunaBuilders.makeElectricEel(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'river_stingray') {
          OC._FaunaBuilders.makeRiverStingray(tmpGroup, dummyBiome, { preview: true });
        } else {
          // Ищем либо параметры стаи / одиночной рыбы в фауне биомов, либо прототип из FloraLibrary
          let fishSpec = null;
          const allBiomes = biome ? [biome, ...OC.Biomes.list()] : OC.Biomes.list();
          for (const b of allBiomes) {
            const p = b && b.faunaPlan;
            if (!p) continue;
            const sc = (p.schools || []).find((s) => s.key === key);
            if (sc) { fishSpec = sc; break; }
            const sl = (p.soloFish || []).find((s) => s.key === key);
            if (sl) { fishSpec = sl; break; }
          }
          if (fishSpec) {
            const fg = OC._FaunaBuilders.makeFishGeo(fishSpec.geoOpts || {});
            built = new T.Mesh(fg, fishSpec.biolum ? previewBiolumMat : previewMat);
          } else if (OC.FloraLibrary && OC.FloraLibrary.getPreviewGeo) {
            const fl = OC.FloraLibrary.getPreviewGeo(key);
            if (fl) {
              const fMat = new T.MeshStandardMaterial({
                vertexColors: true,
                roughness: fl.roughness !== undefined ? fl.roughness : 0.72,
                metalness: fl.metalness !== undefined ? fl.metalness : 0.05,
                emissive: fl.emissive ? new T.Color(fl.emissive) : new T.Color(0x000000),
                emissiveIntensity: fl.emissiveIntensity || 0,
                side: T.DoubleSide
              });
              built = new T.Mesh(fl.geo, fMat);
            }
          }
        }

        if (!built && tmpGroup.children.length > 0) {
          built = tmpGroup.children[0];
          tmpGroup.remove(built);
        }
        if (!built) {
          built = new T.Mesh(new T.SphereGeometry(0.8, 12, 8), previewMat);
        }

        // Обнуляем возможный сдвиг (напр. позиция группы в мировой точке) и приводим к единому масштабу 2.6 м
        built.position.set(0, 0, 0);
        built.rotation.set(0, 0, 0);
        built.scale.set(1, 1, 1);
        built.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(built);
        const size = new T.Vector3();
        const center = new T.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxDim = Math.max(0.05, size.x, size.y, size.z);
        const s = 2.65 / maxDim;

        const wrapper = new T.Group();
        built.position.sub(center);
        wrapper.add(built);
        wrapper.scale.setScalar(s);
        wrapper.updateMatrixWorld(true);
        return wrapper;
      } finally {
        OC._FaunaCtx.creatureMat = savedMat;
      }
    }
  };
})(window.OC);
