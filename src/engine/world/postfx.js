/* ================= МИР: ЭКРАННАЯ ПОСТОБРАБОТКА ================= */
/* Один фулскрин-квад поверх кадра: bloom биолюминесценции, хроматическая аберрация,
   капли на линзе маски, рассеяние Тиндаля у прожектора, виньетка, глубоководный
   сдвиг спектра и киноплёночное зерно. Возвращает объект-состояние для world.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  function createPostFx() {
    const rt = new T.WebGLRenderTarget(512, 512, {
      minFilter: T.LinearFilter,
      magFilter: T.LinearFilter,
      format: T.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false
    });
    rt.texture.encoding = T.sRGBEncoding;
    rt.texture.generateMipmaps = false;

    const scene = new T.Scene();
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new T.ShaderMaterial({
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDiffuse: { value: rt.texture },
        uTexel: { value: new T.Vector2(1 / 512, 1 / 512) },
        uTime: OC.uTime,
        uBloomAmt: { value: 0.22 },
        uChromaAmt: { value: 0.0018 },
        uWetness: { value: 0.0 },
        uVignette: { value: 0.24 },
        uDepthRatio: { value: 0.0 },
        uFlashGlow: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uTexel;
        uniform float uTime, uBloomAmt, uChromaAmt, uWetness, uVignette, uDepthRatio, uFlashGlow;
        varying vec2 vUv;

        float dropLayer(vec2 uv, float scale, float speed, float seed, out vec2 dropGrad) {
          vec2 st = uv * vec2(scale * 1.45, scale);
          st.y += uTime * speed + sin(floor(st.x) * 1.9 + seed) * 0.4;
          vec2 id = floor(st);
          vec2 f = fract(st) - 0.5;
          float h = fract(sin(dot(id + seed, vec2(127.1, 311.7))) * 43758.5453);
          float h2 = fract(sin(dot(id + seed, vec2(269.5, 183.3))) * 19341.123);
          float activeD = smoothstep(0.62, 0.96, h);
          vec2 center = vec2((h2 - 0.5) * 0.46, sin(uTime * 1.6 + h * 6.28) * 0.14);
          vec2 d = (f - center) * vec2(1.15, 0.85);
          float r = length(d);
          float mask = smoothstep(0.32, 0.12, r) * activeD;
          dropGrad = -d * mask * 0.048;
          return mask;
        }

        void main(){
          vec2 uv = vUv;
          float dropSpec = 0.0;
          if (uWetness > 0.01) {
            vec2 g1 = vec2(0.0);
            vec2 g2 = vec2(0.0);
            float m1 = dropLayer(uv, 9.0, 0.24, 1.7, g1);
            float m2 = dropLayer(uv, 15.0, 0.38, 8.3, g2);
            uv = clamp(uv + (g1 + g2 * 0.72) * uWetness, vec2(0.002), vec2(0.998));
            dropSpec = (m1 * 0.14 + m2 * 0.10) * uWetness;
          }

          vec2 dir = uv - vec2(0.5);
          float r2 = dot(dir, dir);
          vec2 caOff = dir * (0.35 + r2 * 2.2) * uChromaAmt;

          float rC = texture2D(tDiffuse, clamp(uv + caOff, vec2(0.001), vec2(0.999))).r;
          vec4 base = texture2D(tDiffuse, uv);
          float bC = texture2D(tDiffuse, clamp(uv - caOff, vec2(0.001), vec2(0.999))).b;
          vec3 col = vec3(rC, base.g, bC);

          if (uBloomAmt > 0.005) {
            vec3 bloom = vec3(0.0);
            vec2 o1 = uTexel * 2.2;
            vec2 o2 = uTexel * 4.4;
            vec3 s0 = texture2D(tDiffuse, clamp(uv + vec2(o1.x, 0.0), 0.001, 0.999)).rgb;
            vec3 s1 = texture2D(tDiffuse, clamp(uv - vec2(o1.x, 0.0), 0.001, 0.999)).rgb;
            vec3 s2 = texture2D(tDiffuse, clamp(uv + vec2(0.0, o1.y), 0.001, 0.999)).rgb;
            vec3 s3 = texture2D(tDiffuse, clamp(uv - vec2(0.0, o1.y), 0.001, 0.999)).rgb;
            vec3 s4 = texture2D(tDiffuse, clamp(uv + o2, 0.001, 0.999)).rgb;
            vec3 s5 = texture2D(tDiffuse, clamp(uv - o2, 0.001, 0.999)).rgb;
            vec3 s6 = texture2D(tDiffuse, clamp(uv + vec2(o2.x, -o2.y), 0.001, 0.999)).rgb;
            vec3 s7 = texture2D(tDiffuse, clamp(uv + vec2(-o2.x, o2.y), 0.001, 0.999)).rgb;

            const vec3 lumaW = vec3(0.299, 0.587, 0.114);
            bloom += s0 * smoothstep(0.66, 1.02, dot(s0, lumaW));
            bloom += s1 * smoothstep(0.66, 1.02, dot(s1, lumaW));
            bloom += s2 * smoothstep(0.66, 1.02, dot(s2, lumaW));
            bloom += s3 * smoothstep(0.66, 1.02, dot(s3, lumaW));
            bloom += s4 * smoothstep(0.66, 1.02, dot(s4, lumaW)) * 0.75;
            bloom += s5 * smoothstep(0.66, 1.02, dot(s5, lumaW)) * 0.75;
            bloom += s6 * smoothstep(0.66, 1.02, dot(s6, lumaW)) * 0.75;
            bloom += s7 * smoothstep(0.66, 1.02, dot(s7, lumaW)) * 0.75;
            col += (bloom * 0.14) * uBloomAmt;
          }

          col += vec3(0.74, 0.92, 1.0) * dropSpec;

          // Рассеяние взвеси Тиндаля вокруг центра луча прожектора на глубине и в темноте
          if (uFlashGlow > 0.01) {
            float coneScatter = exp(-r2 * 4.2) * uFlashGlow * 0.085;
            col += vec3(0.32, 0.74, 0.88) * coneScatter;
          }

          // Лёгкое оптическое виньетирование и глубоководный спектральный сдвиг
          float vig = 1.0 - smoothstep(0.18, 0.85, r2) * uVignette;
          col *= vig;
          if (uDepthRatio > 0.05) {
            col.r *= mix(1.0, 0.91, uDepthRatio);
            col.b *= mix(1.0, 1.05, uDepthRatio);
          }
          // Киноплёночное зерно + дизеринг: убирает полосы на глубоководных градиентах
          float grainH = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 7.0) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
          col += (grainH - 0.5) * (0.012 + uDepthRatio * 0.026);
          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }`
    });
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    scene.add(quad);

    return { rt, scene, cam, mat, quad };

    /* --- экранная постобработка подводной оптики (Bloom биолюминесценции, хроматическая аберрация, капли на линзе) --- */
  }

  /* Подгонка размера RT под drawing buffer (без скачков на retina и при зуме) */
  function resizePostFx(fx, renderer, drawSize) {
    if (!fx || !renderer) return;
    if (typeof renderer.getDrawingBufferSize === 'function') {
      renderer.getDrawingBufferSize(drawSize);
    } else {
      drawSize.set(window.innerWidth || 1024, window.innerHeight || 640);
    }
    const rw = Math.max(64, Math.floor(drawSize.x));
    const rh = Math.max(64, Math.floor(drawSize.y));
    if (fx.rt.width !== rw || fx.rt.height !== rh) fx.rt.setSize(rw, rh);
    fx.mat.uniforms.uTexel.value.set(1 / rw, 1 / rh);
  }

  OC._WorldPostFx = { createPostFx, resizePostFx };
})(window.OC);
