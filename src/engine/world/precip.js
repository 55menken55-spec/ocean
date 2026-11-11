/* ================= МИР: НАДВОДНЫЕ ОСАДКИ (ДОЖДЬ / МЕТЕЛЬ) ================= */
/* GPU-частицы в коробке вокруг камеры: вертикальный снос, ветровой сдвиг и режим
   снега. Возвращает Points и материал — world.js управляет видимостью по погоде. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

    /* ---------- Надводные GPU-осадки: тропический ливень или арктическая метель ---------- */
  function buildPrecip(scene, count) {
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    const sz = new Float32Array(count);
    const rng = OC.mulberry32(91827);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rng() - 0.5) * 140;
      pos[i * 3 + 1] = rng() * 72;
      pos[i * 3 + 2] = (rng() - 0.5) * 140;
      ph[i] = rng() * 6.283;
      sz[i] = OC.lerp(1.4, 3.6, rng());
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));

    const tex = OC.circleTexture(64, false);
    const precipMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
      uniforms: {
        uTex: { value: tex },
        uTime: OC.uTime,
        uCamPos: { value: new T.Vector3() },
        uPrecip: { value: 0.0 },
        uSnowMode: { value: 0.0 },
        uScale: { value: 1.0 }
      },
      vertexShader: `
        attribute float aPhase, aSize;
        uniform float uTime, uPrecip, uSnowMode, uScale;
        uniform vec3 uCamPos;
        varying float vAlpha;
        void main(){
          vec3 box = vec3(140.0, 72.0, 140.0);
          float fallSpd = mix(36.0, 7.2, uSnowMode);
          vec3 p = position;
          p.y -= uTime * fallSpd * (0.85 + 0.3 * fract(aPhase));
          p.x += uTime * mix(6.5, 4.2, uSnowMode) + sin(uTime * 1.4 + aPhase) * mix(0.2, 2.4, uSnowMode);
          p.z += cos(uTime * 1.1 + aPhase) * mix(0.2, 2.1, uSnowMode);
          vec3 rel = mod(p - uCamPos + box * 0.5, box) - box * 0.5;
          vec3 worldP = uCamPos + rel;
          float aboveWater = step(0.15, worldP.y);
          vec4 mvPosition = modelViewMatrix * vec4(worldP, 1.0);
          gl_PointSize = aboveWater * aSize * uScale * mix(95.0, 165.0, uSnowMode) / max(1.5, -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = aboveWater * uPrecip * mix(0.46, 0.72, uSnowMode);
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform float uSnowMode;
        varying float vAlpha;
        void main(){
          if (vAlpha < 0.01) discard;
          vec2 uv = gl_PointCoord;
          if (uSnowMode < 0.5) {
            // Вытянутая наклонная капля дождя
            uv.x = (uv.x - 0.5) * 3.4 + 0.5;
          }
          vec4 tx = texture2D(uTex, clamp(uv, 0.0, 1.0));
          if (tx.a < 0.04) discard;
          vec3 col = mix(vec3(0.76, 0.88, 0.98), vec3(0.96, 0.99, 1.0), uSnowMode);
          gl_FragColor = vec4(col, tx.a * vAlpha);
        }`
    });
    const precipPts = new T.Points(geo, precipMat);
    precipPts.frustumCulled = false;
    precipPts.visible = false;
    scene.add(precipPts);
    return { points: precipPts, mat: precipMat };
  }

  OC._WorldPrecip = { buildPrecip };
})(window.OC);
