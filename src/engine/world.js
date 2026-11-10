/* ================= МИР: РЕНДЕР, СВЕТ, ВОДА, КАУСТИКА, ПРОЖЕКТОР ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  OC.uTime = { value: 0 };

  const KEY_DAY = {
    skyTop: 0x7ce6ff, skyMid: 0x1076a6, skyBot: 0x021d36,
    aboveTop: 0x3b9ae0, aboveHoriz: 0xcbeeff,
    sunCol: 0xfff3da, sunI: 2.15,
    hemiSky: 0x8be2ff, hemiGround: 0x164255, hemiI: 0.72,
    fillA: 0x38d4ff, fillAI: 0.34, fillB: 0xffa064, fillBI: 0.20,
    water: 0x8eeaff, caustic: 0.92, rays: 0.68, exposure: 1.06
  };
  const KEY_NIGHT = {
    skyTop: 0x154166, skyMid: 0x061f3a, skyBot: 0x010914,
    aboveTop: 0x08162c, aboveHoriz: 0x183254,
    sunCol: 0x9ecbff, sunI: 0.62,
    hemiSky: 0x265b88, hemiGround: 0x061c2c, hemiI: 0.32,
    fillA: 0x1b79b8, fillAI: 0.18, fillB: 0x7a5cff, fillBI: 0.14,
    water: 0x3f84b8, caustic: 0.25, rays: 0.22, exposure: 0.92
  };

  const colA = {}, colB = {};
  Object.keys(KEY_DAY).forEach((k) => {
    if (typeof KEY_DAY[k] === 'number' && k !== 'sunI' && k !== 'hemiI' && k !== 'fillAI' && k !== 'fillBI' && k !== 'caustic' && k !== 'rays' && k !== 'exposure') {
      colA[k] = new T.Color(KEY_DAY[k]);
      colB[k] = new T.Color(KEY_NIGHT[k]);
    }
  });

  const pal = {
    skyTop: new T.Color(), skyMid: new T.Color(), skyBot: new T.Color(),
    aboveTop: new T.Color(), aboveHoriz: new T.Color(),
    sunCol: new T.Color(), sunI: 1,
    hemiSky: new T.Color(), hemiGround: new T.Color(), hemiI: 1,
    fillA: new T.Color(), fillAI: 0.3, fillB: new T.Color(), fillBI: 0.2,
    fogCol: new T.Color(0x0b7394), fogDen: 0.0068,
    water: new T.Color(), caustic: 0.8, rays: 0.6, exposure: 1.0,
    dayW: 1, bioGlow: 0, sunAtten: 1
  };

  let renderer, scene, camera, hemi, sun, fillA, fillB, flashlight, flashTarget;
  let skyMat, skySphere, sunSprite, surfaceMat, surfacePlane, raysGroup, rayMats = [];
  let flashlightOn = false;
  let timeOfDay = 0.24; // приятное утро / яркий день

  const sunDir = new T.Vector3(0.4, 0.85, 0.3).normalize();
  const camFwd = new T.Vector3();

  const causticU = {
    uTime: OC.uTime,
    uCausticTex: { value: null },
    uCausticI: { value: 0.9 },
    uCausticCol: { value: new T.Color(0xc2f5ff) }
  };
  OC.causticUniforms = causticU;

  /* ---------- Улучшение стандартных материалов (каустика, колыхание, анимация рыб) ---------- */
  OC.enhanceMaterial = function (mat, opts) {
    opts = opts || {};
    const cStr = opts.causticStrength !== undefined ? opts.causticStrength : 0.85;
    const swayAmp = opts.swayAmp || 0;
    const isTerrain = !!opts.isTerrain;
    const fishSwim = !!opts.fishSwim;

    const cacheKey = [
      'oc',
      cStr.toFixed(2),
      swayAmp.toFixed(2),
      isTerrain ? 'T' : '0',
      fishSwim ? 'F' : '0'
    ].join('_');

    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = causticU.uTime;
      sh.uniforms.uCausticTex = causticU.uCausticTex;
      sh.uniforms.uCausticI = causticU.uCausticI;
      sh.uniforms.uCausticCol = causticU.uCausticCol;
      sh.uniforms.uCStrength = { value: cStr };
      sh.uniforms.uSwayAmp = { value: swayAmp };

      let vPre = 'varying vec3 vCWorld;\nvarying vec3 vCNormal;\nuniform float uTime;\n';
      if (swayAmp > 0) vPre += 'attribute float aSway;\nuniform float uSwayAmp;\n';
      if (fishSwim) vPre += 'attribute vec2 aSwim;\n';

      let vBegin = '#include <begin_vertex>\n';
      if (swayAmp > 0) {
        vBegin += `
          vec3 ocInstOrigin = vec3(0.0);
          #ifdef USE_INSTANCING
            ocInstOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #else
            ocInstOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #endif
          float ocPh = ocInstOrigin.x * 0.14 + ocInstOrigin.z * 0.11 + transformed.x * 0.25 + transformed.z * 0.22;
          float ocW1 = sin(uTime * 1.18 + ocPh);
          float ocW2 = cos(uTime * 0.86 + ocPh * 1.37);
          transformed.x += ocW1 * uSwayAmp * aSway * 1.75;
          transformed.z += ocW2 * uSwayAmp * aSway * 1.25;
          transformed.y += sin(uTime * 1.65 + ocPh * 1.9) * uSwayAmp * aSway * 0.16;
        `;
      }
      if (fishSwim) {
        vBegin += `
          float ocTailW = clamp((-transformed.x + 0.18) * 0.85, 0.0, 1.8);
          float ocSwimPh = uTime * aSwim.y + aSwim.x - transformed.x * 2.8;
          transformed.z += sin(ocSwimPh) * 0.11 * pow(ocTailW, 1.35);
        `;
      }

      const vProj = `
        vec4 mvPosition = vec4( transformed, 1.0 );
        vec4 ocWorldPos = mvPosition;
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          ocWorldPos = instanceMatrix * ocWorldPos;
        #endif
        vCWorld = (modelMatrix * ocWorldPos).xyz;
        vec3 ocNorm = objectNormal;
        #ifdef USE_INSTANCING
          mat3 ocInstM = mat3( instanceMatrix );
          ocNorm /= vec3( dot( ocInstM[0], ocInstM[0] ), dot( ocInstM[1], ocInstM[1] ), dot( ocInstM[2], ocInstM[2] ) );
          ocNorm = ocInstM * ocNorm;
        #endif
        vCNormal = normalize( mat3( modelMatrix ) * ocNorm );
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
      `;

      sh.vertexShader = vPre + sh.vertexShader
        .replace('#include <begin_vertex>', vBegin)
        .replace('#include <project_vertex>', vProj);

      const fPre = `
        varying vec3 vCWorld;
        varying vec3 vCNormal;
        uniform sampler2D uCausticTex;
        uniform float uTime;
        uniform float uCausticI;
        uniform float uCStrength;
        uniform vec3 uCausticCol;
      `;

      let fInject = '';
      if (isTerrain) {
        fInject += `
          float sandRip = sin(vCWorld.x * 2.2 + vCWorld.z * 1.3 + sin(vCWorld.z * 0.6) * 1.4);
          float shallowMask = smoothstep(-32.0, -4.0, vCWorld.y) * smoothstep(0.6, -0.4, vCWorld.y);
          gl_FragColor.rgb *= 1.0 + sandRip * 0.032 * shallowMask * clamp(vCNormal.y, 0.0, 1.0);
        `;
      }
      if (cStr > 0) {
        fInject += `
          float upMask = clamp(vCNormal.y * 0.85 + 0.15, 0.0, 1.0);
          float underwaterMask = smoothstep(0.35, -0.35, vCWorld.y);
          float depthFade = exp(-max(0.0, -vCWorld.y) * 0.036);
          vec2 cuv = vCWorld.xz * 0.022;
          float c1 = texture2D(uCausticTex, cuv + vec2(uTime * 0.013, uTime * 0.009)).r;
          float c2 = texture2D(uCausticTex, cuv * 1.62 - vec2(uTime * 0.008, uTime * 0.014)).r;
          float caus = c1 * c2 * 2.8;
          gl_FragColor.rgb += uCausticCol * caus * upMask * underwaterMask * depthFade * uCStrength * uCausticI * 0.58;
        `;
      }
      fInject += '\n#include <fog_fragment>';

      sh.fragmentShader = fPre + sh.fragmentShader.replace('#include <fog_fragment>', fInject);
    };
    mat.customProgramCacheKey = () => cacheKey;
    return mat;
  };

  /* ---------- Текстуры каустики и ряби ---------- */
  function causticTexture(seedPts) {
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S, S);
    const rng = OC.mulberry32(7331);
    const pts = [];
    for (let i = 0; i < seedPts; i++) pts.push([rng() * S, rng() * S]);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let f1 = 1e9, f2 = 1e9;
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          let dx = Math.abs(x - p[0]); dx = Math.min(dx, S - dx);
          let dy = Math.abs(y - p[1]); dy = Math.min(dy, S - dy);
          const d = dx * dx + dy * dy;
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
        const e = Math.sqrt(f2) - Math.sqrt(f1);
        let v = Math.exp(-e * e / 26);
        v = Math.pow(v, 1.35);
        const idx = (y * S + x) * 4;
        img.data[idx] = 255 * v;
        img.data[idx + 1] = 255 * v;
        img.data[idx + 2] = 255 * v;
        img.data[idx + 3] = 255 * v;
      }
    }
    ctx.putImageData(img, 0, 0);
    const cv2 = document.createElement('canvas');
    cv2.width = cv2.height = S;
    const ctx2 = cv2.getContext('2d');
    ctx2.filter = 'blur(1.2px)';
    ctx2.drawImage(cv, 0, 0);
    const tex = new T.CanvasTexture(cv2);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    return tex;
  }

  function rippleTexture() {
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    const rng = OC.mulberry32(1945);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    for (let i = 0; i < 28; i++) {
      ctx.lineWidth = 1 + rng() * 2.8;
      ctx.beginPath();
      const y0 = rng() * S;
      for (let x = 0; x <= S; x += 8) {
        const y = y0 + Math.sin((x / S) * Math.PI * 4 + i) * 6 + Math.sin((x / S) * Math.PI * 10 + i * 1.7) * 3;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const cv2 = document.createElement('canvas');
    cv2.width = cv2.height = S;
    const ctx2 = cv2.getContext('2d');
    ctx2.filter = 'blur(1.4px)';
    ctx2.drawImage(cv, 0, 0);
    const tex = new T.CanvasTexture(cv2);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    return tex;
  }

  /* ---------- Солнечные лучи ---------- */
  function buildRays(count) {
    if (raysGroup) scene.remove(raysGroup);
    raysGroup = new T.Group();
    rayMats = [];
    const rng = OC.mulberry32(5522);
    for (let i = 0; i < count; i++) {
      const w = OC.lerp(5, 16, rng());
      const h = OC.lerp(42, 72, rng());
      const mat = new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        side: T.DoubleSide, fog: false,
        uniforms: {
          uIntensity: { value: 0.35 },
          uColor: { value: new T.Color(0xbfefff) },
          uTime: OC.uTime,
          uSeed: { value: rng() * 12 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uIntensity; uniform vec3 uColor; uniform float uTime; uniform float uSeed;
          void main(){
            float edge = smoothstep(0.0, 0.48, vUv.x) * smoothstep(1.0, 0.52, vUv.x);
            float vert = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
            float streak = 0.6 + 0.4 * sin(vUv.y * 12.0 + uTime * 0.42 + uSeed * 5.0);
            float flick = 0.78 + 0.22 * sin(uTime * 0.26 + uSeed);
            float a = edge * vert * streak * flick * uIntensity * 0.32;
            gl_FragColor = vec4(uColor, a);
          }`
      });
      rayMats.push(mat);
      const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
      m.position.set(OC.lerp(-140, 140, rng()), -h * 0.5 - 1.5, OC.lerp(-140, 140, rng()));
      m.rotation.y = rng() * Math.PI * 2;
      m.rotation.z = OC.lerp(-0.18, 0.18, rng());
      raysGroup.add(m);
    }
    scene.add(raysGroup);
  }

  /* ---------- Инициализация сцены ---------- */
  OC.initWorld = function (canvas) {
    const q = OC.Quality.get();
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatioMax));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x0b7394, 0.0068);

    camera = new T.PerspectiveCamera(60, 1, 0.25, 2200);

    hemi = new T.HemisphereLight(0x8be2ff, 0x164255, 0.75);
    scene.add(hemi);

    sun = new T.DirectionalLight(0xfff3da, 2.1);
    sun.position.copy(sunDir).multiplyScalar(300);
    scene.add(sun);

    fillA = new T.PointLight(0x38d4ff, 0.35, 320, 1.5);
    scene.add(fillA);
    fillB = new T.PointLight(0xffa064, 0.22, 300, 1.5);
    scene.add(fillB);

    /* --- прожектор дайвера / батискафа (F) --- */
    flashlight = new T.SpotLight(0xfff3df, 0.0, 130, 0.52, 0.72, 1.25);
    flashTarget = new T.Object3D();
    scene.add(flashlight);
    scene.add(flashTarget);
    flashlight.target = flashTarget;

    /* --- подводный и надводный купол неба --- */
    const skyGeo = new T.SphereGeometry(1600, 32, 24);
    skyMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uTop: { value: new T.Color() },
        uMid: { value: new T.Color() },
        uBot: { value: new T.Color() },
        uAboveTop: { value: new T.Color() },
        uAboveHoriz: { value: new T.Color() },
        uSunCol: { value: new T.Color() },
        uSunI: { value: 1 },
        uSunDir: { value: sunDir.clone() },
        uAboveMix: { value: 0 },
        uTime: OC.uTime
      },
      vertexShader: `
        varying vec3 vDir;
        void main(){
          vDir = normalize((modelMatrix * vec4(position,1.0)).xyz - cameraPosition);
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform vec3 uTop, uMid, uBot, uAboveTop, uAboveHoriz, uSunCol;
        uniform float uSunI, uAboveMix, uTime;
        uniform vec3 uSunDir;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 uwCol = mix(uBot, uMid, smoothstep(0.12, 0.50, h));
          uwCol = mix(uwCol, uTop, smoothstep(0.52, 0.94, h));
          float ang = atan(d.z, d.x);
          float st = 0.5 + 0.5 * sin(ang * 28.0 + d.y * 8.0 + uTime * 0.14);
          uwCol += uTop * st * 0.04 * smoothstep(0.55, 1.0, h);

          vec3 skyCol = mix(uAboveHoriz, uAboveTop, smoothstep(0.0, 0.65, max(0.0, d.y)));
          vec3 col = mix(uwCol, skyCol, uAboveMix);

          float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
          float s = pow(sunDot, mix(24.0, 96.0, uAboveMix));
          col += uSunCol * s * uSunI * mix(0.85, 1.35, uAboveMix);
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    skySphere = new T.Mesh(skyGeo, skyMat);
    skySphere.renderOrder = -10;
    skySphere.frustumCulled = false;
    scene.add(skySphere);

    /* --- солнечное гало --- */
    const sunTex = OC.circleTexture(128);
    sunSprite = new T.Sprite(new T.SpriteMaterial({
      map: sunTex, color: 0xfff3d8, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.75
    }));
    sunSprite.scale.setScalar(220);
    scene.add(sunSprite);

    /* --- каустика --- */
    const ct = causticTexture(54);
    causticU.uCausticTex.value = ct;

    /* --- водная поверхность (Y = 0) с окном Снеллиуса и волнами --- */
    const rp = rippleTexture();
    surfaceMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
      uniforms: {
        uTex: { value: rp },
        uTime: OC.uTime,
        uWaterCol: { value: new T.Color(0x6edcf5) },
        uSkyCol: { value: new T.Color(0x88d8ff) },
        uSunCol: { value: new T.Color(0xfff2d2) },
        uSunDir: { value: sunDir.clone() },
        uDayW: { value: 1.0 },
        uCamY: { value: -6.0 }
      },
      vertexShader: `
        varying vec3 vWorld;
        uniform float uTime;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          wp.y += sin(wp.x * 0.08 + uTime * 1.1) * 0.14 + cos(wp.z * 0.09 - uTime * 0.9) * 0.12;
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        varying vec3 vWorld;
        uniform sampler2D uTex;
        uniform float uTime, uDayW, uCamY;
        uniform vec3 uWaterCol, uSkyCol, uSunCol, uSunDir;
        void main(){
          vec2 cuv = vWorld.xz * 0.016;
          float r1 = texture2D(uTex, cuv + vec2(uTime * 0.018, uTime * 0.011)).r;
          float r2 = texture2D(uTex, cuv * 1.65 - vec2(uTime * 0.012, uTime * 0.016)).r;
          float rip = r1 * 0.65 + r2 * 0.45;

          vec3 toEye = normalize(cameraPosition - vWorld);
          float dist = length(cameraPosition - vWorld);
          float fade = smoothstep(1350.0, 120.0, dist);

          // Волновая нормаль для бликов
          vec3 n = normalize(vec3((r1 - 0.5) * 0.25, 1.0, (r2 - 0.5) * 0.25));
          vec3 sunH = normalize(normalize(uSunDir) + toEye);
          float spec = pow(max(dot(n, sunH), 0.0), 42.0) * uDayW;

          if (uCamY < 0.0) {
            // Вид снизу: Окно Снеллиуса (~48.6 град => cos ~ 0.66)
            float cosA = abs(dot(toEye, n));
            float snell = smoothstep(0.58, 0.78, cosA);
            vec3 reflectCol = uWaterCol * (0.28 + rip * 0.45);
            vec3 windowCol = mix(uWaterCol, uSkyCol, 0.75) * (0.55 + rip * 0.35) + uSunCol * spec * 1.1;
            vec3 col = mix(reflectCol, windowCol, snell);
            float alpha = mix(0.32 + rip * 0.24, 0.62 + rip * 0.2, snell) * fade * (0.35 + 0.65 * uDayW);
            gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.88));
          } else {
            // Вид сверху над поверхностью
            float fresnel = pow(1.0 - max(dot(toEye, n), 0.0), 3.0);
            vec3 col = mix(uWaterCol * 0.75, uSkyCol, clamp(fresnel * 0.85 + 0.15, 0.0, 1.0));
            col += uSunCol * spec * 1.25;
            float alpha = mix(0.42, 0.86, fresnel) * fade;
            gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.9));
          }
        }`
    });
    surfacePlane = new T.Mesh(new T.PlaneGeometry(2800, 2800, 64, 64), surfaceMat);
    surfacePlane.rotation.x = -Math.PI / 2;
    surfacePlane.position.y = 0;
    surfacePlane.frustumCulled = false;
    scene.add(surfacePlane);

    buildRays(q.rayCount);

    OC.Quality.onChange((preset) => {
      if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.pixelRatioMax));
      buildRays(preset.rayCount);
    });

    return { renderer, scene, camera };
  };

  /* ---------- Палитра по времени суток ---------- */
  function updateBasePalette(t) {
    // 0.0 = полночь, 0.25 = утро, 0.5 = полдень, 0.75 = закат
    const dayRaw = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
    const dayW = OC.smoothstep(0.08, 0.92, dayRaw);
    const nightW = 1 - dayW;

    for (const k in colA) {
      pal[k].copy(colA[k]).lerp(colB[k], nightW);
    }
    pal.sunI = OC.lerp(KEY_DAY.sunI, KEY_NIGHT.sunI, nightW);
    pal.hemiI = OC.lerp(KEY_DAY.hemiI, KEY_NIGHT.hemiI, nightW);
    pal.fillAI = OC.lerp(KEY_DAY.fillAI, KEY_NIGHT.fillAI, nightW);
    pal.fillBI = OC.lerp(KEY_DAY.fillBI, KEY_NIGHT.fillBI, nightW);
    pal.caustic = OC.lerp(KEY_DAY.caustic, KEY_NIGHT.caustic, nightW);
    pal.rays = OC.lerp(KEY_DAY.rays, KEY_NIGHT.rays, nightW);
    pal.exposure = OC.lerp(KEY_DAY.exposure, KEY_NIGHT.exposure, nightW);
    pal.dayW = dayW;
    pal.time = t;
  }

  OC.getPalette = () => pal;
  OC.getTimeOfDay = () => timeOfDay;
  OC.setTimeOfDay = (t) => { timeOfDay = ((t % 1) + 1) % 1; };
  OC.isFlashlightOn = () => flashlightOn;
  OC.setFlashlight = (on) => { flashlightOn = !!on; return flashlightOn; };
  OC.toggleFlashlight = () => { flashlightOn = !flashlightOn; return flashlightOn; };
  OC.getScene = () => scene;
  OC.getCamera = () => camera;
  OC.getRenderer = () => renderer;

  /* ---------- Обновление мира на каждом кадре ---------- */
  OC.updateWorld = function (dt, time, camPos, autoCycle) {
    if (autoCycle) timeOfDay = (timeOfDay + dt / 150) % 1;
    updateBasePalette(timeOfDay);

    const biome = OC.Biomes.getActive();
    const opt = biome
      ? biome.getOpticalProfile(camPos.x, camPos.y, camPos.z, pal.dayW)
      : {
          aboveWater: camPos.y > 0.25,
          fogColor: pal.skyMid,
          fogDensity: 0.007,
          causticStrength: pal.caustic,
          rayStrength: pal.rays,
          sunAtten: 1.0,
          bioGlow: 1 - pal.dayW
        };

    pal.fogCol.copy(opt.fogColor);
    pal.fogDen = opt.fogDensity;
    pal.bioGlow = opt.bioGlow;
    pal.sunAtten = opt.sunAtten;

    scene.fog.color.copy(opt.fogColor);
    scene.fog.density = opt.fogDensity;
    renderer.toneMappingExposure = pal.exposure * (opt.aboveWater ? 1.02 : OC.lerp(0.82, 1.06, opt.sunAtten));

    hemi.color.copy(pal.hemiSky);
    hemi.groundColor.copy(pal.hemiGround);
    hemi.intensity = pal.hemiI * (0.35 + 0.65 * opt.sunAtten);

    sun.color.copy(pal.sunCol);
    sun.intensity = pal.sunI * (0.22 + 0.78 * opt.sunAtten);

    const ang = timeOfDay * Math.PI * 2 - Math.PI * 0.5;
    sunDir.set(Math.cos(ang) * 0.52, Math.max(0.18, Math.sin(ang) * 0.85 + 0.28), 0.34).normalize();
    sun.position.copy(sunDir).multiplyScalar(420);
    sunSprite.position.copy(camPos).addScaledVector(sunDir, 900);
    sunSprite.material.opacity = (0.35 + 0.55 * pal.dayW) * (opt.aboveWater ? 0.9 : opt.sunAtten);
    sunSprite.material.color.copy(pal.sunCol);

    fillA.position.set(camPos.x - 65, camPos.y + 18, camPos.z + 50);
    fillB.position.set(camPos.x + 70, camPos.y + 24, camPos.z - 55);
    fillA.color.copy(pal.fillA);
    fillA.intensity = pal.fillAI * (0.3 + 0.7 * opt.sunAtten);
    fillB.color.copy(pal.fillB);
    fillB.intensity = pal.fillBI * (0.3 + 0.7 * opt.sunAtten);

    /* прожектор дайвера */
    const targetFlashI = flashlightOn ? 3.4 : 0.0;
    flashlight.intensity = OC.lerp(flashlight.intensity, targetFlashI, Math.min(1, dt * 10));
    flashlight.position.copy(camPos);
    camera.getWorldDirection(camFwd);
    flashTarget.position.copy(camPos).addScaledVector(camFwd, 30);

    /* купол неба */
    const aboveMix = OC.smoothstep(-0.3, 0.5, camPos.y);
    skyMat.uniforms.uTop.value.copy(pal.skyTop);
    skyMat.uniforms.uMid.value.copy(opt.fogColor);
    skyMat.uniforms.uBot.value.copy(pal.skyBot);
    skyMat.uniforms.uAboveTop.value.copy(pal.aboveTop);
    skyMat.uniforms.uAboveHoriz.value.copy(pal.aboveHoriz);
    skyMat.uniforms.uSunCol.value.copy(pal.sunCol);
    skyMat.uniforms.uSunI.value = pal.sunI;
    skyMat.uniforms.uSunDir.value.copy(sunDir);
    skyMat.uniforms.uAboveMix.value = aboveMix;
    skySphere.position.copy(camPos);

    /* каустика */
    causticU.uCausticI.value = opt.causticStrength;
    causticU.uCausticCol.value.copy(pal.water);

    /* поверхность воды привязана к сетке вокруг камеры, чтобы волны не «плыли» */
    const snap = 44;
    surfacePlane.position.x = Math.round(camPos.x / snap) * snap;
    surfacePlane.position.z = Math.round(camPos.z / snap) * snap;
    surfaceMat.uniforms.uWaterCol.value.copy(pal.water);
    surfaceMat.uniforms.uSkyCol.value.copy(pal.aboveHoriz);
    surfaceMat.uniforms.uSunCol.value.copy(pal.sunCol);
    surfaceMat.uniforms.uSunDir.value.copy(sunDir);
    surfaceMat.uniforms.uDayW.value = pal.dayW;
    surfaceMat.uniforms.uCamY.value = camPos.y;

    /* солнечные лучи в верхних слоях */
    raysGroup.visible = camPos.y < 0.2 && opt.rayStrength > 0.02;
    if (raysGroup.visible) {
      raysGroup.position.x = Math.round(camPos.x / 60) * 60;
      raysGroup.position.z = Math.round(camPos.z / 60) * 60;
      for (const m of rayMats) {
        m.uniforms.uIntensity.value = opt.rayStrength * (0.45 + 0.55 * Math.abs(Math.sin(time * 0.14 + m.uniforms.uSeed.value)));
        m.uniforms.uColor.value.copy(pal.water);
      }
    }
  };
})(window.OC);
