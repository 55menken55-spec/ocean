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

  let renderer, scene, camera, hemi, sun, fillA, fillB, flashlight, flashTarget, flashBeam, flashBeamMat;
  let skyMat, skySphere, sunSprite, surfaceMat, surfacePlane, raysGroup, rayMats = [], rayMeshes = [];
  let precipPts, precipMat;
  let flashlightOn = false;
  let timeOfDay = 0.24; // приятное утро / яркий день

  const sunDir = new T.Vector3(0.4, 0.85, 0.3).normalize();
  const _refractRayDir = new T.Vector3();
  const _upAxis = new T.Vector3(0, 1, 0);
  const _rayQuat = new T.Quaternion();
  const camFwd = new T.Vector3();
  const camRight = new T.Vector3();
  const _beamTint = new T.Color(0xeefaff);
  const _worldCurr = new T.Vector3();
  const _stormCol = new T.Color(0x283848);
  const _lightCol = new T.Color(0xdcf0ff);

  const causticU = {
    uTime: OC.uTime,
    uCausticTex: { value: null },
    uCausticI: { value: 0.9 },
    uCausticCol: { value: new T.Color(0xc2f5ff) },
    uCurrent: { value: new T.Vector2(0, 0) }
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
      sh.uniforms.uCurrent = causticU.uCurrent;
      sh.uniforms.uCStrength = { value: cStr };
      sh.uniforms.uSwayAmp = { value: swayAmp };

      let vPre = 'varying vec3 vCWorld;\nvarying vec3 vCNormal;\nuniform float uTime;\n';
      if (swayAmp > 0) vPre += 'attribute float aSway;\nuniform float uSwayAmp;\nuniform vec2 uCurrent;\n';
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
          float ocUnderW = smoothstep(0.25, -0.25, ocInstOrigin.y);
          transformed.x += (ocW1 * 1.75 + uCurrent.x * 0.42 * ocUnderW) * uSwayAmp * aSway;
          transformed.z += (ocW2 * 1.25 + uCurrent.y * 0.42 * ocUnderW) * uSwayAmp * aSway;
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
          float detDist = length(cameraPosition - vCWorld);
          float detFade = 1.0 - smoothstep(16.0, 95.0, detDist);
          float slopeW = smoothstep(0.84, 0.42, clamp(vCNormal.y, 0.0, 1.0));
          float flatW = 1.0 - slopeW;

          // Микро-рябь песка и зернистость карбонатного грунта вблизи
          float sandRip = sin(vCWorld.x * 2.2 + vCWorld.z * 1.3 + sin(vCWorld.z * 0.6) * 1.4);
          float grain = sin(vCWorld.x * 11.7 + vCWorld.z * 7.3) * cos(vCWorld.z * 10.9 - vCWorld.x * 6.1);
          float shallowMask = smoothstep(-36.0, -4.0, vCWorld.y) * smoothstep(0.7, -0.35, vCWorld.y);

          // Слоистость известняка и каверны на крутых стенах (бомми, Голубая дыра, обрыв)
          float strata = sin(vCWorld.y * 3.4 + sin(vCWorld.x * 0.38 + vCWorld.z * 0.34) * 2.1);
          float crag = sin(vCWorld.x * 3.1 - vCWorld.z * 2.7) * cos(vCWorld.y * 2.4 + vCWorld.x * 1.3);

          // Мокрый песок у самой кромки прибоя (-0.25 .. +0.5 м)
          float wetShore = smoothstep(-0.3, 0.05, vCWorld.y) * smoothstep(0.6, 0.08, vCWorld.y);

          gl_FragColor.rgb *= 1.0
            + sandRip * 0.042 * shallowMask * flatW
            + grain * 0.048 * detFade * flatW
            + (strata * 0.085 + crag * 0.055) * detFade * slopeW
            - wetShore * 0.16;
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

  /* ---------- Текстура мелководья и зоны прибойной пены из батиметрии ---------- */
  function buildBathymetryFoamTex(biome) {
    const S = 160;
    const data = new Uint8Array(S * S * 4);
    const R = biome ? (biome.worldRadius || 1200) : 1200;
    for (let iz = 0; iz < S; iz++) {
      const wz = ((iz / (S - 1)) * 2 - 1) * R;
      for (let ix = 0; ix < S; ix++) {
        const wx = ((ix / (S - 1)) * 2 - 1) * R;
        const h = biome ? biome.getHeight(wx, wz) : -12;
        const depthNorm = OC.clamp(-h / 45.0, 0, 1);
        // Пена прибоя над очень мелким гребнем (-3.6 .. +0.25 м) и берегом
        const crestFoam = OC.smoothstep(-3.9, -1.5, h) * OC.smoothstep(0.55, -0.3, h);
        const shoreFoam = OC.smoothstep(-0.9, 0.05, h) * OC.smoothstep(0.45, 0.0, h);
        const idx = (iz * S + ix) * 4;
        data[idx] = Math.round(depthNorm * 255);
        data[idx + 1] = Math.round(crestFoam * 255);
        data[idx + 2] = Math.round(shoreFoam * 255);
        data[idx + 3] = 255;
      }
    }
    const tex = new T.DataTexture(data, S, S, T.RGBAFormat);
    tex.magFilter = T.LinearFilter;
    tex.minFilter = T.LinearFilter;
    tex.wrapS = T.ClampToEdgeWrapping;
    tex.wrapT = T.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  /* ---------- Объёмные 3D-конусы солнечных лучей (Volumetric God Rays) ---------- */
  function buildRays(count) {
    if (raysGroup) {
      raysGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      scene.remove(raysGroup);
    }
    raysGroup = new T.Group();
    rayMats = [];
    rayMeshes = [];
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
  }

  /* ---------- Надводные GPU-осадки: тропический ливень или арктическая метель ---------- */
  function buildPrecip(count) {
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
    precipMat = new T.ShaderMaterial({
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
    precipPts = new T.Points(geo, precipMat);
    precipPts.frustumCulled = false;
    precipPts.visible = false;
    scene.add(precipPts);
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

    /* --- прожектор дайвера / батискафа (F) и объёмный конус света --- */
    flashlight = new T.SpotLight(0xfff3df, 0.0, 155, 0.54, 0.72, 1.18);
    flashTarget = new T.Object3D();
    scene.add(flashlight);
    scene.add(flashTarget);
    flashlight.target = flashTarget;

    const beamGeo = new T.ConeGeometry(14.5, 68, 28, 1, true);
    beamGeo.translate(0, -34, 0);
    beamGeo.rotateX(-Math.PI / 2);
    flashBeamMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
      uniforms: {
        uIntensity: { value: 0.0 },
        uColor: { value: new T.Color(0xcdf4ff) },
        uTime: OC.uTime,
        uNoSurface: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vWorldP;
        varying vec3 vNormW;
        varying float vDist;
        void main(){
          vDist = position.z;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldP = wp.xyz;
          vNormW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        varying vec3 vWorldP;
        varying vec3 vNormW;
        varying float vDist;
        uniform float uIntensity, uTime, uNoSurface;
        uniform vec3 uColor;
        void main(){
          if (uIntensity < 0.01) discard;
          vec3 toCam = normalize(cameraPosition - vWorldP);
          float rim = pow(abs(dot(normalize(vNormW), toCam)), 1.75);
          float axial = smoothstep(1.2, 8.5, vDist) * smoothstep(68.0, 10.0, vDist);
          float dust = 0.86 + 0.14 * sin(vWorldP.x * 0.45 + uTime * 0.9) * cos(vWorldP.z * 0.42 - uTime * 0.7);
          float belowW = max(uNoSurface, smoothstep(0.1, -0.4, vWorldP.y));
          float a = rim * axial * dust * belowW * uIntensity * 0.145;
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor, a);
        }`
    });
    flashBeam = new T.Mesh(beamGeo, flashBeamMat);
    flashBeam.frustumCulled = false;
    flashBeam.visible = false;
    scene.add(flashBeam);

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
        uAurora: { value: 0 },
        uDayW: { value: 1 },
        uStorm: { value: 0 },
        uLightning: { value: 0 },
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
        uniform float uSunI, uAboveMix, uAurora, uDayW, uStorm, uLightning, uTime;
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
          // Мягкие пассатные или грозовые тучи над водой
          float clMask = smoothstep(0.01, 0.14, d.y) * smoothstep(0.95 - uStorm * 0.25, 0.12, d.y) * uAboveMix;
          float clPatt = 0.5 + 0.5 * sin(ang * 9.0 + uTime * (0.03 + uStorm * 0.09)) * cos(d.y * 26.0 - ang * 3.0);
          float clThresh = mix(0.56, 0.22, uStorm);
          float clouds = smoothstep(clThresh, 0.88, clPatt) * clMask;
          vec3 cloudBright = mix(mix(uSunCol, vec3(1.0), 0.55), vec3(0.20, 0.26, 0.34), uStorm);
          skyCol = mix(skyCol, vec3(0.14, 0.20, 0.28), uStorm * 0.62 * uAboveMix);
          skyCol = mix(skyCol, cloudBright, clouds * mix(0.42, 0.86, uStorm));

          // Вспышки молний внутри штормовых облаков
          if (uLightning > 0.01) {
            vec3 boltCol = vec3(0.75, 0.88, 1.0) * uLightning * (0.45 + 0.85 * clouds);
            skyCol += boltCol * uAboveMix;
            uwCol += boltCol * 0.32;
          }

          // Северное сияние (Aurora Borealis) для арктического биома в сумерках и полярной ночью
          if (uAurora > 0.01 && d.y > 0.01) {
            float nightVis = (1.0 - smoothstep(0.25, 0.82, uDayW)) * uAurora * (1.0 - uStorm * 0.55);
            float ribbon1 = sin(ang * 3.2 + sin(d.y * 5.0 + uTime * 0.22) * 1.4 + uTime * 0.12);
            float ribbon2 = sin(ang * 5.7 - cos(d.y * 7.0 - uTime * 0.18) * 1.1 - uTime * 0.09);
            float curtain = pow(max(0.0, ribbon1 * 0.62 + ribbon2 * 0.38), 2.2);
            float altMask = smoothstep(0.05, 0.28, d.y) * smoothstep(0.92, 0.34, d.y);
            vec3 aurCol = mix(vec3(0.14, 0.96, 0.62), vec3(0.62, 0.32, 0.98), clamp(d.y * 1.5 - 0.18, 0.0, 1.0));
            skyCol += aurCol * curtain * altMask * nightVis * 0.95;
            uwCol += aurCol * curtain * altMask * nightVis * 0.22;
          }

          vec3 col = mix(uwCol, skyCol, uAboveMix);

          float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
          float s = pow(sunDot, mix(24.0, 96.0, uAboveMix));
          col += uSunCol * s * uSunI * mix(0.85, 1.35, uAboveMix) * (1.0 - uStorm * 0.82);
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

    /* --- водная поверхность (Y = 0) с окном Снеллиуса, волнами и пеной прибоя --- */
    const rp = rippleTexture();
    const activeBiome = OC.Biomes.getActive();
    const foamTex = buildBathymetryFoamTex(activeBiome);
    surfaceMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
      uniforms: {
        uTex: { value: rp },
        uFoamTex: { value: foamTex },
        uWorldSpan: { value: (activeBiome ? activeBiome.worldRadius : 1200) * 2.0 },
        uTime: OC.uTime,
        uWaterCol: { value: new T.Color(0x6edcf5) },
        uSkyCol: { value: new T.Color(0x88d8ff) },
        uSunCol: { value: new T.Color(0xfff2d2) },
        uSunDir: { value: sunDir.clone() },
        uDayW: { value: 1.0 },
        uCamY: { value: -6.0 },
        uWaveAmp: { value: 1.0 },
        uStorm: { value: 0.0 },
        uLightning: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vWorld;
        varying float vCrest;
        uniform float uTime, uWaveAmp;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float w1 = sin(wp.x * 0.075 + uTime * 1.25) * 0.24;
          float w2 = cos(wp.z * 0.088 - uTime * 0.98) * 0.21;
          float w3 = sin((wp.x * 0.68 + wp.z * 0.74) * 0.12 + uTime * 1.85) * 0.11;
          float w4 = cos((wp.x * 0.55 - wp.z * 0.82) * 0.22 - uTime * 2.25) * 0.06;
          float wave = (w1 + w2 + w3 + w4) * uWaveAmp;
          wp.y += wave;
          vCrest = clamp(wave / max(0.35, 0.55 * uWaveAmp), 0.0, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        varying vec3 vWorld;
        varying float vCrest;
        uniform sampler2D uTex, uFoamTex;
        uniform float uTime, uDayW, uCamY, uWorldSpan, uStorm, uLightning;
        uniform vec3 uWaterCol, uSkyCol, uSunCol, uSunDir;
        void main(){
          vec2 cuv = vWorld.xz * 0.016;
          float r1 = texture2D(uTex, cuv + vec2(uTime * 0.018, uTime * 0.011)).r;
          float r2 = texture2D(uTex, cuv * 1.65 - vec2(uTime * 0.012, uTime * 0.016)).r;
          float rip = r1 * 0.65 + r2 * 0.45;

          // Выборка глубины и мелководной пены прибоя по координатам карты
          vec2 mapUv = clamp(vWorld.xz / uWorldSpan + 0.5, 0.002, 0.998);
          vec4 bathy = texture2D(uFoamTex, mapUv);
          float depthT = bathy.r;
          float crestSurf = bathy.g;
          float shoreSurf = bathy.b;

          float foamNoise = smoothstep(0.32, 0.86, r1 * 0.55 + r2 * 0.62);
          float surge = 0.55 + 0.45 * sin(vWorld.x * 0.18 - uTime * 1.85 + r1 * 3.0);
          float whitecap = smoothstep(0.42, 0.92, vCrest) * uStorm * 0.95;
          float foam = clamp((crestSurf * 0.72 * surge + shoreSurf * 1.15 + whitecap) * foamNoise, 0.0, 0.95);

          vec3 toEye = normalize(cameraPosition - vWorld);
          float dist = length(cameraPosition - vWorld);
          float fade = smoothstep(1350.0, 120.0, dist);

          // Волновая нормаль для бликов
          vec3 n = normalize(vec3((r1 - 0.5) * (0.28 + uStorm * 0.24), 1.0, (r2 - 0.5) * (0.28 + uStorm * 0.24)));
          vec3 sunH = normalize(normalize(uSunDir) + toEye);
          float spec = pow(max(dot(n, sunH), 0.0), 48.0) * uDayW * (1.0 - uStorm * 0.65);
          vec3 foamCol = mix(vec3(0.45, 0.72, 0.85), vec3(0.95, 0.99, 1.0), 0.25 + 0.75 * uDayW);

          // Оттенок воды меняется от бирюзового мелководья к глубокому кобальту Кораллового моря
          vec3 deepCol = mix(uWaterCol, vec3(0.03, 0.22, 0.45) * (0.25 + 0.75 * uDayW), depthT * 0.82);

          if (uCamY < 0.0) {
            // Вид снизу: Окно Снеллиуса (~48.6 град => cos ~ 0.66) + хроматическая радужная кайма + буруны прибоя
            float cosA = abs(dot(toEye, n));
            float snell = smoothstep(0.58, 0.78, cosA);
            float prismBand = smoothstep(0.54, 0.67, cosA) * (1.0 - smoothstep(0.67, 0.82, cosA));
            vec3 prismCol = vec3(0.28, 0.88, 1.0) * prismBand * 0.45 * uDayW;
            vec3 reflectCol = deepCol * (0.28 + rip * 0.45);
            vec3 windowCol = mix(deepCol, uSkyCol, 0.75) * (0.55 + rip * 0.35) + uSunCol * spec * 1.1;
            vec3 col = mix(reflectCol, windowCol, snell) + prismCol;
            col = mix(col, foamCol * 0.82, foam * 0.58);
            float alpha = mix(0.32 + rip * 0.24, 0.62 + rip * 0.2, snell) * fade * (0.35 + 0.65 * uDayW);
            alpha = clamp(alpha + foam * 0.26 * fade, 0.0, 0.94);
            gl_FragColor = vec4(col, alpha);
          } else {
            // Вид сверху: Френель + просвет бирюзовых лагун + штормовые барашки + отблеск молнии
            float fresnel = pow(1.0 - max(dot(toEye, n), 0.0), 3.0);
            vec3 shallowTint = mix(vec3(0.28, 0.86, 0.88), deepCol, depthT) * (0.22 + 0.78 * uDayW);
            vec3 skyRefl = mix(uSkyCol, vec3(0.18, 0.25, 0.34), uStorm * 0.75);
            vec3 col = mix(shallowTint, skyRefl, clamp(fresnel * 0.82 + 0.12, 0.0, 1.0));
            col += uSunCol * spec * 1.35 + vec3(0.68, 0.86, 1.0) * uLightning * 0.65 * fresnel;
            col = mix(col, foamCol, foam);
            float alpha = mix(0.46 + (1.0 - depthT) * 0.08, 0.90, fresnel) * fade;
            alpha = clamp(alpha + foam * 0.45 * fade, 0.0, 0.97);
            gl_FragColor = vec4(col, alpha);
          }
        }`
    });
    surfacePlane = new T.Mesh(new T.PlaneGeometry(2800, 2800, 96, 96), surfaceMat);
    surfacePlane.rotation.x = -Math.PI / 2;
    surfacePlane.position.y = 0;
    surfacePlane.frustumCulled = false;
    scene.add(surfacePlane);

    buildRays(q.rayCount);
    buildPrecip(Math.round(1450 * q.particlesScale));

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
  OC.setWorldParticleScale = (s) => {
    if (precipMat) precipMat.uniforms.uScale.value = s;
  };
  OC.refreshWorldForBiome = function (biome) {
    if (!surfaceMat || !biome) return;
    if (surfaceMat.uniforms.uFoamTex.value) surfaceMat.uniforms.uFoamTex.value.dispose();
    surfaceMat.uniforms.uFoamTex.value = buildBathymetryFoamTex(biome);
    surfaceMat.uniforms.uWorldSpan.value = (biome.worldRadius || 1200) * 2.0;
    if (surfacePlane) surfacePlane.visible = !biome.noSurface;
    if (sunSprite) sunSprite.visible = !biome.noSurface;
  };

  /* ---------- Обновление мира на каждом кадре ---------- */
  OC.updateWorld = function (dt, time, camPos, autoCycle) {
    if (autoCycle) timeOfDay = (timeOfDay + dt / 150) % 1;
    updateBasePalette(timeOfDay);

    const biome = OC.Biomes.getActive();
    const wState = OC.Weather ? OC.Weather.update(dt, time, camPos, biome) : { waveAmp: 1.0, stormMix: 0.0, precip: 0.0, turbidity: 0.0, lightning: 0.0 };
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

    const stormAtten = 1.0 - wState.stormMix * 0.42;
    const shallowTurb = (biome && biome.noSurface) ? 0.0 : wState.turbidity * OC.smoothstep(-22.0, -0.5, camPos.y);

    pal.fogCol.copy(opt.fogColor);
    if (wState.stormMix > 0.02 && !(biome && biome.noSurface)) {
      pal.fogCol.lerp(_stormCol, wState.stormMix * (opt.aboveWater ? 0.52 : 0.24));
    }
    if (wState.lightning > 0.02) {
      pal.fogCol.lerp(_lightCol, wState.lightning * (opt.aboveWater ? 0.45 : 0.16));
    }
    pal.fogDen = opt.fogDensity + shallowTurb * 0.0045;
    pal.bioGlow = opt.bioGlow;
    pal.sunAtten = opt.sunAtten * stormAtten;
    if (opt.aboveTop) pal.aboveTop.copy(opt.aboveTop);
    if (opt.waterColor) pal.water.copy(opt.waterColor);
    if (opt.skyTop) pal.skyTop.copy(opt.skyTop);
    if (opt.skyBot) pal.skyBot.copy(opt.skyBot);
    if (opt.aboveHoriz) pal.aboveHoriz.copy(opt.aboveHoriz);
    if (opt.fillAColor) pal.fillA.copy(opt.fillAColor);
    if (opt.fillBColor) pal.fillB.copy(opt.fillBColor);

    scene.fog.color.copy(pal.fogCol);
    scene.fog.density = pal.fogDen;
    renderer.toneMappingExposure = pal.exposure * (opt.aboveWater ? (1.02 - wState.stormMix * 0.14) : OC.lerp(0.82, 1.06, pal.sunAtten));

    hemi.color.copy(pal.hemiSky);
    hemi.groundColor.copy(pal.hemiGround);
    hemi.intensity = pal.hemiI * (biome && biome.noSurface ? 0.14 : (0.35 + 0.65 * pal.sunAtten));

    sun.color.copy(pal.sunCol);
    sun.intensity = pal.sunI * (biome && biome.noSurface ? 0.03 : (0.22 + 0.78 * pal.sunAtten)) + wState.lightning * 1.45;

    const ang = timeOfDay * Math.PI * 2 - Math.PI * 0.5;
    const sunElev = (biome && biome.hasAurora) ? Math.max(0.10, Math.sin(ang) * 0.42 + 0.18) : Math.max(0.18, Math.sin(ang) * 0.85 + 0.28);
    sunDir.set(Math.cos(ang) * 0.52, sunElev, 0.34).normalize();
    sun.position.copy(sunDir).multiplyScalar(420);
    sunSprite.position.copy(camPos).addScaledVector(sunDir, 900);
    sunSprite.visible = !(biome && biome.noSurface);
    sunSprite.material.opacity = (0.35 + 0.55 * pal.dayW) * (opt.aboveWater ? 0.9 : opt.sunAtten);
    sunSprite.material.color.copy(pal.sunCol);

    fillA.position.set(camPos.x - 65, camPos.y + 18, camPos.z + 50);
    fillB.position.set(camPos.x + 70, camPos.y + 24, camPos.z - 55);
    fillA.color.copy(pal.fillA);
    fillA.intensity = pal.fillAI * (opt.fillAMult !== undefined ? opt.fillAMult : (0.3 + 0.7 * opt.sunAtten));
    fillB.color.copy(pal.fillB);
    fillB.intensity = pal.fillBI * (opt.fillBMult !== undefined ? opt.fillBMult : (0.3 + 0.7 * opt.sunAtten));

    /* прожектор дайвера и объёмный луч в воде */
    const targetFlashI = flashlightOn ? 4.2 : 0.0;
    flashlight.intensity = OC.lerp(flashlight.intensity, targetFlashI, Math.min(1, dt * 10));
    flashlight.position.copy(camPos);
    camera.getWorldDirection(camFwd);
    flashTarget.position.copy(camPos).addScaledVector(camFwd, 32);

    if (flashBeam && flashBeamMat) {
      const beamStrength = (flashlight.intensity / 4.2) * OC.lerp(1.15, 0.42, pal.dayW * opt.sunAtten);
      flashBeam.visible = beamStrength > 0.02 && (biome && biome.noSurface ? true : camPos.y < 1.5);
      if (flashBeam.visible) {
        camRight.crossVectors(camFwd, camera.up).normalize();
        flashBeam.position.copy(camPos).addScaledVector(camera.up, -0.55).addScaledVector(camRight, 0.25);
        flashBeam.lookAt(flashTarget.position);
        flashBeamMat.uniforms.uIntensity.value = beamStrength;
        flashBeamMat.uniforms.uNoSurface.value = (biome && biome.noSurface) ? 1.0 : 0.0;
        flashBeamMat.uniforms.uColor.value.copy(pal.water).lerp(_beamTint, 0.68);
      }
    }

    /* купол неба */
    const aboveMix = (biome && biome.noSurface) ? 0.0 : OC.smoothstep(-0.3, 0.5, camPos.y);
    skyMat.uniforms.uTop.value.copy(pal.skyTop);
    skyMat.uniforms.uMid.value.copy(opt.fogColor);
    skyMat.uniforms.uBot.value.copy(pal.skyBot);
    skyMat.uniforms.uAboveTop.value.copy(pal.aboveTop);
    skyMat.uniforms.uAboveHoriz.value.copy(pal.aboveHoriz);
    skyMat.uniforms.uSunCol.value.copy(pal.sunCol);
    skyMat.uniforms.uSunI.value = pal.sunI;
    skyMat.uniforms.uSunDir.value.copy(sunDir);
    skyMat.uniforms.uAboveMix.value = aboveMix;
    skyMat.uniforms.uAurora.value = (biome && biome.hasAurora) ? 1.0 : 0.0;
    skyMat.uniforms.uDayW.value = pal.dayW;
    skyMat.uniforms.uStorm.value = wState.stormMix;
    skyMat.uniforms.uLightning.value = wState.lightning;
    skySphere.position.copy(camPos);

    /* каустика и наклон кораллов по течению */
    causticU.uCausticI.value = opt.causticStrength * (1.0 - wState.stormMix * 0.55);
    causticU.uCausticCol.value.copy(pal.water);
    if (biome && biome.getCurrentAt) {
      biome.getCurrentAt(camPos.x, camPos.y, camPos.z, time, _worldCurr);
      causticU.uCurrent.value.set(_worldCurr.x, _worldCurr.z);
    }

    /* поверхность воды привязана к сетке вокруг камеры, чтобы волны не «плыли» */
    surfacePlane.visible = !(biome && biome.noSurface);
    if (surfacePlane.visible) {
      const snap = 44;
      surfacePlane.position.x = Math.round(camPos.x / snap) * snap;
      surfacePlane.position.z = Math.round(camPos.z / snap) * snap;
      surfaceMat.uniforms.uWaterCol.value.copy(pal.water);
      surfaceMat.uniforms.uSkyCol.value.copy(pal.aboveHoriz);
      surfaceMat.uniforms.uSunCol.value.copy(pal.sunCol);
      surfaceMat.uniforms.uSunDir.value.copy(sunDir);
      surfaceMat.uniforms.uDayW.value = pal.dayW;
      surfaceMat.uniforms.uCamY.value = camPos.y;
      surfaceMat.uniforms.uWaveAmp.value = wState.waveAmp;
      surfaceMat.uniforms.uStorm.value = wState.stormMix;
      surfaceMat.uniforms.uLightning.value = wState.lightning;
    }

    /* объёмные 3D-конусы солнечных лучей, ориентированные по преломлённому солнцу */
    const rayIntensity = opt.rayStrength * (1.0 - wState.stormMix * 0.65);
    raysGroup.visible = !(biome && biome.noSurface) && camPos.y < 0.2 && rayIntensity > 0.02;
    if (raysGroup.visible) {
      raysGroup.position.x = Math.round(camPos.x / 60) * 60;
      raysGroup.position.z = Math.round(camPos.z / 60) * 60;
      // Закон Снеллиуса сжимает наклон луча в воде (~0.75 от горизонтального отклонения)
      _refractRayDir.set(sunDir.x * 0.68, Math.max(0.45, sunDir.y), sunDir.z * 0.68).normalize();
      _rayQuat.setFromUnitVectors(_upAxis, _refractRayDir);
      for (let i = 0; i < rayMeshes.length; i++) rayMeshes[i].quaternion.copy(_rayQuat);
      for (const m of rayMats) {
        m.uniforms.uIntensity.value = rayIntensity * (0.45 + 0.55 * Math.abs(Math.sin(time * 0.14 + m.uniforms.uSeed.value)));
        m.uniforms.uWaveAmp.value = wState.waveAmp;
        m.uniforms.uColor.value.copy(pal.water);
      }
    }

    /* надводные осадки (штормовой дождь / арктический снегопад) */
    if (precipPts && precipMat) {
      precipPts.visible = !(biome && biome.noSurface) && wState.precip > 0.03 && camPos.y > -12.0;
      if (precipPts.visible) {
        precipMat.uniforms.uCamPos.value.copy(camPos);
        precipMat.uniforms.uPrecip.value = wState.precip;
        precipMat.uniforms.uSnowMode.value = (biome && biome.hasAurora) ? 1.0 : 0.0;
      }
    }
  };
})(window.OC);
