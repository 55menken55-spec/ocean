/* ================= ФАУНА: СОЛЯНОЕ ОЗЕРО И ГАЛОКЛИН ================= */
/* Плотное рассол-озеро на дне с собственной поверхностью, слой галоклина с облаками
   H2S и нить Ариадны, размечающая путь в карстовых туннелях. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

  function makeBrineLake(scene, biome, opts) {
    opts = opts || {};
    const preview = !!opts.preview;
    const cx = opts.cx || 0;
    const cz = opts.cz || 0;
    const level = preview ? 0 : (opts.level !== undefined ? opts.level : -62.0);
    const baseR = preview ? 4.4 : (opts.r || 68);
    const RINGS = 14;
    const SEGS = 48;

    const group = new T.Group();
    group.position.set(cx, level, cz);
    group.userData.key = 'brine_pool_lake';

    const radiusAt = (ang) => {
      if (!preview && opts.radiusFn) return opts.radiusFn(ang);
      return baseR * (1.0 + 0.12 * Math.sin(ang * 3.0 + 0.6) + 0.07 * Math.cos(ang * 5.0 - 0.4));
    };

    const vertCount = 1 + RINGS * SEGS;
    const pos = new Float32Array(vertCount * 3);
    const edge = new Float32Array(vertCount);
    const uvs = new Float32Array(vertCount * 2);
    const indices = [];

    pos[0] = 0; pos[1] = 0; pos[2] = 0;
    edge[0] = 0;
    uvs[0] = 0.5; uvs[1] = 0.5;

    let ptr = 1;
    for (let r = 1; r <= RINGS; r++) {
      const f = r / RINGS;
      for (let s = 0; s < SEGS; s++) {
        const ang = (s / SEGS) * Math.PI * 2;
        const rr = radiusAt(ang) * f;
        const vx = Math.cos(ang) * rr;
        const vz = Math.sin(ang) * rr;
        pos[ptr * 3] = vx;
        pos[ptr * 3 + 1] = 0;
        pos[ptr * 3 + 2] = vz;
        edge[ptr] = f;
        uvs[ptr * 2] = 0.5 + (vx / (baseR * 2.4));
        uvs[ptr * 2 + 1] = 0.5 + (vz / (baseR * 2.4));
        ptr++;
      }
    }

    for (let s = 0; s < SEGS; s++) {
      const next = (s + 1) % SEGS;
      indices.push(0, 1 + next, 1 + s);
    }
    for (let r = 1; r < RINGS; r++) {
      const r0 = 1 + (r - 1) * SEGS;
      const r1 = 1 + r * SEGS;
      for (let s = 0; s < SEGS; s++) {
        const next = (s + 1) % SEGS;
        indices.push(r0 + s, r0 + next, r1 + s);
        indices.push(r0 + next, r1 + next, r1 + s);
      }
    }

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aEdge', new T.BufferAttribute(edge, 1));
    geo.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      fog: !preview,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTime: OC.uTime,
          uAmp: { value: preview ? 0.04 : 0.24 }
        }
      ]),
      vertexShader: `
        attribute float aEdge;
        uniform float uTime, uAmp;
        varying float vEdge;
        varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main(){
          vEdge = aEdge;
          vec3 p = position;
          float damp = 1.0 - smoothstep(0.74, 1.0, aEdge);
          float w = sin(p.x * 0.16 + uTime * 1.4) * cos(p.z * 0.18 - uTime * 1.15) * 0.55
                  + sin((p.x + p.z) * 0.31 - uTime * 2.1) * 0.45;
          p.y += w * uAmp * damp;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime;
        varying float vEdge;
        varying vec3 vWorld;
        #include <fog_pars_fragment>
        void main(){
          float r1 = sin(vWorld.x * 0.42 + uTime * 1.3) * cos(vWorld.z * 0.38 - uTime * 1.05);
          float r2 = sin((vWorld.x - vWorld.z) * 0.72 + uTime * 1.85);
          float rip = 0.5 + 0.5 * (r1 * 0.6 + r2 * 0.4);
          vec3 toCam = normalize(cameraPosition - vWorld);
          float fresnel = pow(1.0 - abs(toCam.y), 2.2);

          vec3 deepBrine = vec3(0.05, 0.28, 0.34);
          vec3 sheen = vec3(0.24, 0.92, 0.86);
          vec3 rimSalt = vec3(0.84, 0.99, 0.98);

          vec3 col = mix(deepBrine, sheen, clamp(rip * 0.48 + fresnel * 0.65, 0.0, 1.0));
          float shoreBand = smoothstep(0.84, 0.98, vEdge);
          col = mix(col, rimSalt, shoreBand * 0.92);
          float alpha = mix(0.76, 0.94, max(fresnel * 0.5, shoreBand));
          gl_FragColor = vec4(col, alpha);
          #include <fog_fragment>
        }`
    });

    const lakeMesh = new T.Mesh(geo, mat);
    lakeMesh.userData.key = 'brine_pool_lake';
    group.add(lakeMesh);

    // Кристаллическая береговая кромка галита для превью в Атласе
    if (preview) {
      const rimGeo = new T.TorusGeometry(baseR * 0.98, 0.24, 8, 42);
      rimGeo.rotateX(Math.PI / 2);
      OC.geoPrep(rimGeo);
      OC.paint(rimGeo, 0xd8f8fc);
      group.add(new T.Mesh(rimGeo, OC._FaunaCtx.creatureMat));
    }

    let halo = null;
    if (!preview && opts.light !== false) {
      halo = new T.PointLight(0x36f0da, 1.35, baseR * 2.2, 1.4);
      halo.position.set(0, 6.5, 0);
      group.add(halo);
    }

    scene.add(group);
    return {
      key: 'brine_pool_lake',
      sonarLabel: opts.label || 'Подводное соляное озеро (галоклин 230‰)',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (preview) return;
        const d = Math.hypot(cx - camPos.x, cz - camPos.z);
        group.visible = d < 650;
        if (halo) halo.intensity = group.visible ? (1.15 + 0.3 * Math.sin(time * 1.6 + cx * 0.05)) : 0;
      }
    };
  }

  /* ---------- Гигантская биолюминесцентная сифонофора (Praya dubia) ---------- */

  function makeHaloclineLayer(scene, biome, opts) {
    opts = opts || {};
    const preview = !!opts.preview;
    const cx = preview ? 0 : (opts.cx || -210);
    const cz = preview ? 0 : (opts.cz || 130);
    const levelY = preview ? 0.15 : (opts.y || -24.5);
    const rad = preview ? 3.2 : (opts.r || 74);

    const group = new T.Group();
    group.position.set(cx, levelY, cz);
    group.userData.key = 'halocline_layer';

    function makeDiskGeo(rDisk) {
      const rings = 14, segs = 36;
      const pos = [], edge = [], idx = [];
      for (let r = 0; r <= rings; r++) {
        const u = r / rings;
        for (let s = 0; s <= segs; s++) {
          const a = (s / segs) * Math.PI * 2;
          const wobble = 1 + 0.08 * Math.sin(a * 3 + 0.6) + 0.05 * Math.cos(a * 5 - 1.1);
          pos.push(Math.cos(a) * rDisk * u * wobble, 0, Math.sin(a) * rDisk * u * wobble);
          edge.push(u);
        }
      }
      const stride = segs + 1;
      for (let r = 0; r < rings; r++) {
        for (let s = 0; s < segs; s++) {
          const p0 = r * stride + s, p1 = p0 + 1, p2 = (r + 1) * stride + s, p3 = p2 + 1;
          idx.push(p0, p2, p1, p1, p2, p3);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('aEdge', new T.Float32BufferAttribute(edge, 1));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }

    const haloMat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      fog: !preview,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        { uTime: OC.uTime, uAmp: { value: preview ? 0.05 : 0.28 } }
      ]),
      vertexShader: `
        attribute float aEdge;
        uniform float uTime, uAmp;
        varying float vEdge;
        varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main(){
          vEdge = aEdge;
          vec3 p = position;
          float damp = 1.0 - smoothstep(0.72, 1.0, aEdge);
          p.y += (sin(p.x * 0.14 + uTime * 1.1) * cos(p.z * 0.16 - uTime * 0.9) * 0.65
                + sin((p.x - p.z) * 0.26 + uTime * 1.55) * 0.35) * uAmp * damp;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime;
        varying float vEdge;
        varying vec3 vWorld;
        #include <fog_pars_fragment>
        void main(){
          float w = 0.5 + 0.5 * sin(vWorld.x * 0.32 + uTime * 1.2) * cos(vWorld.z * 0.28 - uTime * 0.95);
          vec3 toCam = normalize(cameraPosition - vWorld);
          float fres = pow(1.0 - abs(toCam.y), 1.85);
          vec3 col = mix(vec3(0.28, 0.78, 0.82), vec3(0.84, 0.98, 0.90), clamp(w * 0.52 + fres * 0.65, 0.0, 1.0));
          float edgeFade = 1.0 - smoothstep(0.75, 1.0, vEdge);
          float alpha = mix(0.24, 0.62, fres) * edgeFade;
          gl_FragColor = vec4(col, alpha);
          #include <fog_fragment>
        }`
    });

    const cloudMat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      fog: !preview,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        { uTime: OC.uTime }
      ]),
      vertexShader: `
        attribute float aEdge;
        uniform float uTime;
        varying float vEdge;
        varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main(){
          vEdge = aEdge;
          vec3 p = position;
          p.y += sin(p.x * 0.09 - uTime * 0.6) * cos(p.z * 0.11 + uTime * 0.5) * 0.45 * (1.0 - aEdge);
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime;
        varying float vEdge;
        varying vec3 vWorld;
        #include <fog_pars_fragment>
        void main(){
          float n = 0.5 + 0.5 * sin(vWorld.x * 0.16 + uTime * 0.45 + sin(vWorld.z * 0.14) * 1.6);
          vec3 mistA = vec3(0.58, 0.66, 0.48);
          vec3 mistB = vec3(0.86, 0.90, 0.74);
          vec3 col = mix(mistA, mistB, n);
          float edgeFade = 1.0 - smoothstep(0.68, 1.0, vEdge);
          gl_FragColor = vec4(col, (0.42 + n * 0.26) * edgeFade);
          #include <fog_fragment>
        }`
    });

    const haloDisk = new T.Mesh(makeDiskGeo(rad), haloMat);
    haloDisk.userData.key = 'halocline_layer';
    group.add(haloDisk);

    const cloudDisk = new T.Mesh(makeDiskGeo(rad * 0.94), cloudMat);
    cloudDisk.position.y = preview ? -0.52 : -1.35;
    cloudDisk.userData.key = 'halocline_layer';
    group.add(cloudDisk);

    // Древние затонувшие стволы деревьев Юкатана, выступающие из сероводородного облака Анхелиты
    const logParts = [];
    const logCount = preview ? 3 : 7;
    const rng = OC.mulberry32(7731);
    for (let i = 0; i < logCount; i++) {
      const a = (i / logCount) * Math.PI * 2 + 0.4;
      const dist = preview ? (0.8 + i * 0.55) : (12 + rng() * (rad * 0.58));
      const hLog = preview ? (1.2 + rng() * 0.7) : (5.5 + rng() * 6.5);
      const rLog = preview ? 0.08 : (0.28 + rng() * 0.24);
      const trunk = new T.CylinderGeometry(rLog * 0.52, rLog, hLog, 6);
      OC.geoPrep(trunk);
      OC.paint(trunk, 0x5d4c3b);
      OC.xform(trunk, {
        r: [(rng() - 0.5) * 0.45, rng() * 3.1, (rng() - 0.5) * 0.45],
        p: [Math.cos(a) * dist, preview ? -0.15 : -0.8, Math.sin(a) * dist]
      });
      logParts.push(trunk);

      const branch = new T.CylinderGeometry(rLog * 0.2, rLog * 0.42, hLog * 0.45, 5);
      OC.geoPrep(branch);
      OC.paint(branch, 0x6e5b48);
      OC.xform(branch, {
        r: [0.65, a, 0.42],
        p: [Math.cos(a) * dist + hLog * 0.14, preview ? 0.12 : 0.6, Math.sin(a) * dist]
      });
      logParts.push(branch);
    }
    const deadwood = new T.Mesh(OC.mergeGeometries(logParts), OC._FaunaCtx.creatureMat);
    deadwood.userData.key = 'halocline_layer';
    group.add(deadwood);

    let glow = null;
    if (!preview) {
      glow = new T.PointLight(0x76f0c8, 1.45, rad * 1.6, 1.4);
      glow.position.set(0, 4.2, 0);
      group.add(glow);
    }

    scene.add(group);
    return {
      key: 'halocline_layer',
      sonarLabel: 'Облако галоклина и сероводорода (Анхелита)',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (preview) return;
        const d = Math.hypot(cx - camPos.x, cz - camPos.z);
        group.visible = d < 460;
        if (glow) glow.intensity = group.visible ? (1.25 + 0.28 * Math.sin(time * 1.4)) : 0;
      }
    };
  }

  /* ---------- Слепой пещерный гребненосец (Xibalbanus tulumensis) ---------- */

  function makeAriadneGuideline(scene, biome, opts) {
    opts = opts || {};
    const preview = !!opts.preview;
    const group = new T.Group();
    group.userData.key = 'ariadne_line';

    const ptsRaw = preview
      ? [[-3.2, -0.4, 1.4], [-1.1, 0.2, 0.2], [1.2, 0.1, -0.5], [3.3, 0.5, -1.5]]
      : (opts.waypoints || [[0, -14, -60]]);

    const pts = [];
    for (let i = 0; i < ptsRaw.length; i++) {
      const p = ptsRaw[i];
      if (preview) {
        pts.push(new T.Vector3(p[0], p[1], p[2]));
      } else {
        const fl = biome && biome.getHeight ? biome.getHeight(p[0], p[2]) : -18;
        const ceil = biome && biome.getCeilingHeight ? biome.getCeilingHeight(p[0], p[2]) : 20;
        const y = OC.clamp(p[1] !== undefined ? p[1] : (fl + 1.55), fl + 1.15, ceil < 30 ? ceil - 1.8 : -2.5);
        pts.push(new T.Vector3(p[0], y, p[2]));
      }
    }

    const lineMat = new T.MeshStandardMaterial({
      color: 0xffa82e,
      emissive: new T.Color(0xe66810),
      emissiveIntensity: 0.75,
      roughness: 0.35
    });
    const stakeMat = new T.MeshStandardMaterial({
      color: 0xb6a488,
      roughness: 0.88
    });
    const arrowMat = new T.MeshStandardMaterial({
      color: 0xffe44d,
      emissive: new T.Color(0xc89a14),
      emissiveIntensity: 0.68,
      roughness: 0.32,
      side: T.DoubleSide
    });

    const markers = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      // Известняковый анкерный столбик / обвязка
      const stake = new T.Mesh(new T.CylinderGeometry(preview ? 0.08 : 0.12, preview ? 0.14 : 0.22, preview ? 0.65 : 1.45, 6), stakeMat);
      stake.position.set(p.x, p.y - (preview ? 0.28 : 0.65), p.z);
      stake.userData.key = 'ariadne_line';
      group.add(stake);

      if (i > 0) {
        const a = pts[i - 1];
        const b = p;
        const segVec = new T.Vector3().subVectors(b, a);
        const len = segVec.length();
        if (len > 0.1) {
          const cord = new T.Mesh(
            new T.CylinderGeometry(preview ? 0.036 : 0.055, preview ? 0.036 : 0.055, len, 6),
            lineMat
          );
          cord.position.addVectors(a, b).multiplyScalar(0.5);
          cord.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), segVec.clone().normalize());
          cord.userData.key = 'ariadne_line';
          group.add(cord);

          // Треугольный пещерный маркер-стрелка (указывает в сторону выхода i-1 -> к свету!)
          const steps = preview ? 2 : Math.max(1, Math.floor(len / 34));
          for (let s = 1; s <= steps; s++) {
            const f = s / (steps + 1);
            const arrow = new T.Mesh(
              new T.ConeGeometry(preview ? 0.14 : 0.34, preview ? 0.36 : 0.85, 3),
              arrowMat
            );
            arrow.position.lerpVectors(a, b, f);
            arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), segVec.clone().negate().normalize());
            arrow.userData.key = 'ariadne_line';
            group.add(arrow);
            markers.push(arrow);
          }
        }
      }
    }

    scene.add(group);
    return {
      key: 'ariadne_line',
      sonarLabel: 'Ходовая нить Ариадны (маркер выхода)',
      getPosition: () => pts[0],
      update(dt, time) {
        if (preview) return;
        lineMat.emissiveIntensity = 0.68 + 0.18 * Math.sin(time * 2.2);
      }
    };
  }

  /* ---------- Слой галоклина и сероводородного облака (Сенот Анхелита) ---------- */

  OC._FaunaBuilders.makeBrineLake = makeBrineLake;
  OC._FaunaBuilders.makeHaloclineLayer = makeHaloclineLayer;
  OC._FaunaBuilders.makeAriadneGuideline = makeAriadneGuideline;
})(window.OC);
