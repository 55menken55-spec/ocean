/* ================= ДЫМКА ТЕРМОКЛИНА, МУТЬ И ГИДРАТНЫЕ СИПЫ ================= */
/* Объёмная дымка на границе термоклина/галоклина, взвесь бентоса и струи
   метановых гидратов у холодных сипов. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

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
    const hasHydrates = (id === 'brine_pool' || id === 'mariana_trench' || id === 'baikal');
    if (!hasHydrates) {
      return { hasHydrates: false, update() {}, setScale() {} };
    }

    // Выбираем детерминированные очаги гидратов / сипов из зон биома
    const sources = [];
    if (id === 'brine_pool') {
      sources.push([-140, -110], [190, 120], [-20, 200], [110, -210], [-250, 50]);
    } else if (id === 'baikal') {
      sources.push([130, 170], [-110, 280], [235, -310]);
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
          uColor: { value: new T.Color(id === 'brine_pool' ? 0xb4f2ff : (id === 'baikal' ? 0x82d8d0 : 0x8effd8)) },
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
    pts.userData.key = id === 'brine_pool' ? 'methane_hydrate' : (id === 'baikal' ? 'methane_seep_baikal' : 'serpentinite_vent');
    scene.add(pts);

    return {
      hasHydrates: true,
      sourceCount: sources.length,
      update() {},
      setScale(s) { mat.uniforms.uScale.value = s; }
    };
  };

  OC._FaunaSystems = Object.assign(OC._FaunaSystems || {}, {
    makeThermoclineHaze,
    makeBenthicSiltSystem,
    makeHydratePlumeSystem,
  });
})(window.OC);
