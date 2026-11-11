/* ================= ВСПЛЕСКИ И БИОЛЮМИНЕСЦЕНТНЫЙ СЛЕД ================= */
/* Брызги выпрыгивающих китов и дельфинов у поверхности и след Noctiluca —
   светящийся шлейф за движущимся объектом. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

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

  OC._FaunaSystems = Object.assign(OC._FaunaSystems || {}, {
    makeSplashSystem,
    makeBiolumTrail,
  });
})(window.OC);
