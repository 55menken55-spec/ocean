/* ================= ЧАСТИЦЫ СРЕДЫ: ПЛАНКТОН, СНЕГ, ПУЗЫРЬКИ, НЕРЕСТ КОРАЛЛОВ ================= */
/* Камера-относительные поля частиц (планктон, морской снег, пузырьки) и ночной
   нерест коралловых полипов с синхронизацией по лунному циклу. */
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

  OC._FaunaSystems = Object.assign(OC._FaunaSystems || {}, {
    createCameraRelativeParticles,
    createCoralSpawningSystem,
  });
})(window.OC);
