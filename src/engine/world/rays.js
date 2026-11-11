/* ================= МИР: ОБЪЁМНЫЕ СОЛНЕЧНЫЕ ЛУЧИ (GOD RAYS) ================= */
/* Конусы бимов с шейдером мерцания. Группа живёт в сцене мира; позиция и наклон
   обновляются каждый кадр в world.js по преломлённому солнцу (закон Снеллиуса). */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

    /* ---------- Объёмные 3D-конусы солнечных лучей (Volumetric God Rays) ---------- */
  function buildRays(state, count) {
    const scene = state.scene;
    if (state.raysGroup) {
      state.raysGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      scene.remove(state.raysGroup);
    }
    const raysGroup = new T.Group();
    const rayMats = [];
    const rayMeshes = [];
    const rng = OC.mulberry32(5522);
    for (let i = 0; i < count; i++) {
      const rTop = OC.lerp(1.4, 3.6, rng());
      const rBot = rTop * OC.lerp(2.4, 3.8, rng());
      const h = OC.lerp(46, 76, rng());
      const geo = new T.CylinderGeometry(rTop, rBot, h, 14, 1, true);
      const mat = new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        side: T.DoubleSide, fog: false,
        uniforms: {
          uIntensity: { value: 0.35 },
          uColor: { value: new T.Color(0xbfefff) },
          uTime: OC.uTime,
          uSeed: { value: rng() * 12 },
          uWaveAmp: { value: 1.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldP;
          varying vec3 vNormW;
          void main(){
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldP = wp.xyz;
            vNormW = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: `
          varying vec2 vUv;
          varying vec3 vWorldP;
          varying vec3 vNormW;
          uniform float uIntensity, uTime, uSeed, uWaveAmp;
          uniform vec3 uColor;
          void main(){
            vec3 toCam = normalize(cameraPosition - vWorldP);
            float rim = pow(abs(dot(normalize(vNormW), toCam)), 1.42);
            float vert = smoothstep(0.0, 0.38, vUv.y) * smoothstep(1.0, 0.68, vUv.y);
            float shimmer = 0.58 + 0.42 * sin(vUv.x * 18.85 + uTime * (0.65 + uWaveAmp * 0.45) + uSeed * 5.0);
            float flick = 0.76 + 0.24 * sin(uTime * 0.32 + uSeed + vUv.y * 5.0);
            float a = rim * vert * shimmer * flick * uIntensity * 0.26;
            if (a < 0.002) discard;
            gl_FragColor = vec4(uColor, a);
          }`
      });
      rayMats.push(mat);
      const m = new T.Mesh(geo, mat);
      m.position.set(OC.lerp(-145, 145, rng()), -h * 0.48 - 1.2, OC.lerp(-145, 145, rng()));
      m.rotation.y = rng() * Math.PI * 2;
      raysGroup.add(m);
      rayMeshes.push(m);
    }
    scene.add(raysGroup);
    state.raysGroup = raysGroup;
    state.rayMats = rayMats;
    state.rayMeshes = rayMeshes;
  }

  OC._WorldRays = { buildRays };
})(window.OC);
