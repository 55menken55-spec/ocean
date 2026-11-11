/* ================= ФАУНА: СОЛЯНОЙ БАССЕЙН И КАРСТОВЫЕ ПЕЩЕРЫ ================= */
/* Соляное озеро, сифонофора, сельдяной король, химера, нить Ариадны, слой галоклина,
   слепой рачок-ремипеда и слепая бросатula. */
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

  function makeSiphonophore(scene, biome, opts) {
    opts = opts || {};
    const preview = !!opts.preview;
    const group = new T.Group();
    group.userData.key = 'siphonophore';

    const nSeg = 18;
    const segs = [];
    const bellMat = new T.MeshStandardMaterial({
      color: 0xa6f4ff,
      emissive: new T.Color(0x28c8ff),
      emissiveIntensity: 0.72,
      transparent: true,
      opacity: 0.66,
      roughness: 0.18
    });
    const coreMat = new T.MeshStandardMaterial({
      color: 0xff9ef6,
      emissive: new T.Color(0xc84eff),
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.85,
      roughness: 0.28
    });
    const tentMat = new T.MeshBasicMaterial({
      color: 0x62f4ff,
      transparent: true,
      opacity: 0.45
    });

    const bellGeo = new T.SphereGeometry(0.42, 10, 8);
    bellGeo.scale(0.95, 0.88, 1.35);
    const bodyGeo = new T.SphereGeometry(0.24, 8, 6);
    bodyGeo.scale(0.8, 0.8, 1.55);
    const tentGeo = new T.CylinderGeometry(0.012, 0.004, 1.65, 4);

    for (let i = 0; i < nSeg; i++) {
      const sg = new T.Group();
      if (i < 2) {
        const bL = new T.Mesh(bellGeo, bellMat);
        bL.position.set(-0.22, 0, -i * 0.45);
        const bR = new T.Mesh(bellGeo, bellMat);
        bR.position.set(0.22, 0, -i * 0.45);
        sg.add(bL, bR);
      } else {
        const f = 1.0 - (i / nSeg) * 0.58;
        const m = new T.Mesh(bodyGeo, i % 2 === 0 ? coreMat : bellMat);
        m.scale.setScalar(f);
        sg.add(m);
        if (i % 2 === 0) {
          const t = new T.Mesh(tentGeo, tentMat);
          t.position.y = -0.82 * f;
          t.scale.setScalar(f);
          sg.add(t);
        }
      }
      sg.userData.key = 'siphonophore';
      group.add(sg);
      segs.push(sg);
    }

    const scale = opts.scale || 1.1;
    group.scale.setScalar(scale);
    scene.add(group);

    if (preview) {
      for (let i = 0; i < segs.length; i++) {
        segs[i].position.set(Math.sin(i * 0.42) * 0.65, Math.cos(i * 0.35) * 0.38, (nSeg * 0.25) - i * 0.52);
      }
      return { key: 'siphonophore', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 0;
    const cz = opts.cz || 0;
    const r = opts.r || 42;
    const yBase = opts.y || -36;
    const spd = opts.speed || 1.65;
    let ang = Math.random() * 6.28;
    const headPos = new T.Vector3();
    const lookPos = new T.Vector3();
    return {
      key: 'siphonophore',
      sonarLabel: 'Гигантская сифонофора (Praya dubia)',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 460) { group.visible = false; return; }
        group.visible = true;
        ang += (spd / Math.max(12, r)) * dt;
        const hx = cx + Math.cos(ang) * r;
        const hz = cz + Math.sin(ang) * r * 0.82;
        const hy = Math.max(yBase + Math.sin(time * 0.32 + ang) * 5.0, biome.getHeight(hx, hz) + 6.5);
        const nx = cx + Math.cos(ang + 0.08) * r;
        const nz = cz + Math.sin(ang + 0.08) * r * 0.82;
        const ny = Math.max(yBase + Math.sin(time * 0.32 + ang + 0.08) * 5.0, biome.getHeight(nx, nz) + 6.5);
        headPos.set(hx, hy, hz);
        lookPos.set(nx, ny, nz);
        group.position.copy(headPos);
        group.lookAt(lookPos);

        for (let i = 0; i < segs.length; i++) {
          const ph = time * 2.1 - i * 0.44;
          segs[i].position.set(Math.sin(ph) * (0.16 + i * 0.045), Math.cos(ph * 0.8) * (0.08 + i * 0.025), -i * 0.58);
          segs[i].rotation.y = Math.cos(ph) * 0.25;
        }
      }
    };
  }

  /* ---------- Сельдяной король / Ремнеры (Regalecus glesne) ---------- */

  function makeOarfish(scene, biome, opts) {
    opts = opts || {};
    const preview = !!opts.preview;
    const group = new T.Group();
    group.userData.key = 'oarfish';

    const nSeg = 12;
    const segs = [];
    const silverMat = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.22,
      metalness: 0.58,
      side: T.DoubleSide
    });
    const crestMat = new T.MeshStandardMaterial({
      color: 0xe62434,
      emissive: new T.Color(0x520810),
      emissiveIntensity: 0.38,
      roughness: 0.42,
      side: T.DoubleSide
    });

    for (let i = 0; i < nSeg; i++) {
      const sg = new T.Group();
      const f = 1.0 - (i / nSeg) * 0.65;
      const bodyG = new T.BoxGeometry(0.11 * f, 0.52 * f, 0.72);
      OC.geoPrep(bodyG);
      OC.paint(bodyG, (x, y, z, c) => c.set(Math.abs(y) < 0.14 ? 0xedf6ff : 0x9bb4cf));
      sg.add(new T.Mesh(bodyG, silverMat));

      // Непрерывный алый спинной плавник вдоль всей ленты
      const finG = new T.PlaneGeometry(0.72, 0.36 * f);
      finG.rotateY(Math.PI / 2);
      const finM = new T.Mesh(finG, crestMat);
      finM.position.y = 0.40 * f;
      sg.add(finM);

      if (i === 0) {
        // Знаменитый алый головной гребень + два длинных брюшных «весла»
        for (let c = 0; c < 4; c++) {
          const cr = new T.CylinderGeometry(0.014, 0.025, 1.05 - c * 0.12, 5);
          const cm = new T.Mesh(cr, crestMat);
          cm.position.set(0, 0.65 - c * 0.05, 0.12 - c * 0.1);
          cm.rotation.x = -0.35 - c * 0.14;
          sg.add(cm);
        }
        const eyeGeo = new T.SphereGeometry(0.068, 8, 6);
        const eyeMat = new T.MeshBasicMaterial({ color: 0xffe488 });
        for (const s of [-1, 1]) {
          const em = new T.Mesh(eyeGeo, eyeMat);
          em.position.set(s * 0.065, 0.06, 0.22);
          sg.add(em);

          const oar = new T.CylinderGeometry(0.012, 0.008, 1.35, 5);
          const om = new T.Mesh(oar, crestMat);
          om.position.set(s * 0.09, -0.58, -0.05);
          om.rotation.x = 0.72;
          om.rotation.z = -s * 0.28;
          sg.add(om);
        }
      }

      sg.userData.key = 'oarfish';
      group.add(sg);
      segs.push(sg);
    }

    const scale = opts.scale || 1.05;
    group.scale.setScalar(scale);
    scene.add(group);

    if (preview) {
      for (let i = 0; i < segs.length; i++) {
        segs[i].position.set(Math.sin(i * 0.55) * 0.42, 0, (nSeg * 0.3) - i * 0.65);
        segs[i].rotation.y = Math.cos(i * 0.55) * 0.26;
      }
      return { key: 'oarfish', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 0;
    const cz = opts.cz || 0;
    const r = opts.r || 55;
    const yBase = opts.y || -32;
    const spd = opts.speed || 2.8;
    let ang = Math.random() * 6.28;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'oarfish',
      sonarLabel: 'Сельдяной король (Regalecus glesne)',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 480) { group.visible = false; return; }
        group.visible = true;
        ang += (spd / Math.max(18, r)) * dt;
        const ax = cx + Math.cos(ang) * r;
        const az = cz + Math.sin(ang) * r;
        const ay = Math.max(yBase + Math.sin(time * 0.38 + ang) * 7.5, biome.getHeight(ax, az) + 6.0);
        const bx = cx + Math.cos(ang + 0.07) * r;
        const bz = cz + Math.sin(ang + 0.07) * r;
        const by = Math.max(yBase + Math.sin(time * 0.38 + ang + 0.07) * 7.5, biome.getHeight(bx, bz) + 6.0);
        a.set(ax, Math.min(-6, ay), az);
        b.set(bx, Math.min(-6, by), bz);
        group.position.copy(a);
        group.lookAt(b);

        for (let i = 0; i < segs.length; i++) {
          const ph = time * 3.4 - i * 0.58;
          segs[i].position.set(Math.sin(ph) * (0.08 + i * 0.042), 0, -i * 0.66);
          segs[i].rotation.y = Math.cos(ph) * 0.28;
        }
      }
    };
  }

  /* ---------- Глубоководная химера / Рыба-кролик (Hydrolagus) ---------- */

  function makeChimaera(scene, biome, opts) {
    opts = opts || {};
    const group = new T.Group();
    const parts = [];

    const body = new T.SphereGeometry(0.45, 14, 10);
    body.scale(0.85, 0.92, 1.95);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const z = bp.getZ(i);
      const taper = z < 0 ? OC.clamp(1.0 + z * 0.72, 0.12, 1.0) : (1.0 - Math.pow(z, 1.8) * 0.22);
      bp.setX(i, bp.getX(i) * taper);
      bp.setY(i, bp.getY(i) * taper);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => c.set(y > 0 ? 0x6f6282 : 0xb8b2c4));
    parts.push(body);

    const dorsal = new T.ConeGeometry(0.18, 0.78, 5);
    dorsal.scale(0.32, 1, 1.35);
    OC.geoPrep(dorsal);
    OC.paint(dorsal, 0x524564);
    OC.xform(dorsal, { r: [-0.25, 0, 0], p: [0, 0.48, 0.14] });
    parts.push(dorsal);

    const whip = new T.ConeGeometry(0.085, 1.55, 6);
    whip.rotateX(-Math.PI / 2);
    OC.geoPrep(whip);
    OC.paint(whip, 0x8e869c);
    OC.xform(whip, { p: [0, -0.02, -1.45] });
    parts.push(whip);

    group.add(new T.Mesh(OC.mergeGeometries(parts), OC._FaunaCtx.creatureMat));

    // Огромные изумрудно-отражающие глаза химеры
    const eyeMat = new T.MeshBasicMaterial({ color: 0x64ffbe });
    const eyeGeo = new T.SphereGeometry(0.11, 8, 6);
    for (const s of [-1, 1]) {
      const em = new T.Mesh(eyeGeo, eyeMat);
      em.position.set(s * 0.28, 0.11, 0.45);
      group.add(em);
    }

    // Широкие крыловидные грудные плавники
    const wingGeo = new T.ConeGeometry(0.56, 0.96, 4);
    wingGeo.scale(0.14, 1.0, 0.75);
    wingGeo.rotateZ(Math.PI / 2);
    OC.geoPrep(wingGeo);
    OC.paint(wingGeo, 0x7b6c92);
    const wings = [];
    for (const s of [-1, 1]) {
      const wPiv = new T.Group();
      wPiv.position.set(s * 0.28, -0.08, 0.22);
      const wm = new T.Mesh(wingGeo, OC._FaunaCtx.creatureMat);
      wm.position.set(s * 0.42, 0, -0.06);
      if (s < 0) wm.rotation.y = Math.PI;
      wPiv.add(wm);
      group.add(wPiv);
      wings.push({ piv: wPiv, side: s });
    }

    group.scale.setScalar(opts.scale || 1.15);
    group.userData.key = 'chimaera';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 30;
    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 42;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'chimaera',
      sonarLabel: 'Глубоководная химера (Hydrolagus)',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 2.1) / Math.max(10, r)) * dt;
        const ax = cx + Math.cos(ang) * r;
        const az = cz + Math.sin(ang) * r;
        const bx = cx + Math.cos(ang + 0.09) * r;
        const bz = cz + Math.sin(ang + 0.09) * r;
        const ay = biome.getHeight(ax, az) + 2.4 + Math.sin(t * 0.9) * 0.75;
        const by = biome.getHeight(bx, bz) + 2.4 + Math.sin(t * 0.9 + 0.14) * 0.75;
        a.set(ax, ay, az);
        b.set(bx, by, bz);
        group.position.copy(a);
        group.lookAt(b);
        const flap = Math.sin(time * 3.1 + t) * 0.34;
        wings[0].piv.rotation.z = flap;
        wings[1].piv.rotation.z = -flap;
      }
    };
  }

  /* ---------- Ходовая нить Ариадны для пещерного дайвинга (Ariadne Guideline) ---------- */

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

  function makeCaveRemipede(scene, biome, opts) {
    opts = opts || {};
    const preview = !!opts.preview;
    const group = new T.Group();
    group.userData.key = 'cave_remipede';

    const segs = [];
    const nSeg = 16;
    const bodyMat = new T.MeshStandardMaterial({
      color: 0xf4ece2,
      emissive: new T.Color(0x3a6a70),
      emissiveIntensity: 0.24,
      roughness: 0.32,
      transparent: true,
      opacity: 0.88
    });

    for (let i = 0; i < nSeg; i++) {
      const sg = new T.Group();
      const f = i === 0 ? 1.05 : (1.0 - (i / nSeg) * 0.42);
      const torso = new T.SphereGeometry(0.14 * f, 8, 6);
      torso.scale(1.15, 0.55, 1.45);
      sg.add(new T.Mesh(torso, bodyMat));

      if (i === 0) {
        for (const s of [-1, 1]) {
          const ant = new T.CylinderGeometry(0.008, 0.018, 0.72, 4);
          const am = new T.Mesh(ant, bodyMat);
          am.position.set(s * 0.16, 0.04, 0.36);
          am.rotation.x = Math.PI * 0.46;
          am.rotation.z = -s * 0.42;
          sg.add(am);
        }
      } else {
        for (const s of [-1, 1]) {
          const leg = new T.BoxGeometry(0.32 * f, 0.025, 0.08);
          const lm = new T.Mesh(leg, bodyMat);
          lm.position.set(s * 0.22 * f, -0.02, 0);
          lm.rotation.y = s * 0.28;
          sg.add(lm);
        }
      }
      sg.userData.key = 'cave_remipede';
      group.add(sg);
      segs.push(sg);
    }

    group.scale.setScalar(opts.scale || (preview ? 0.95 : 1.15));
    scene.add(group);

    if (preview) {
      for (let i = 0; i < segs.length; i++) {
        segs[i].position.set(Math.sin(i * 0.46) * 0.36, 0, (nSeg * 0.13) - i * 0.22);
        segs[i].rotation.y = Math.cos(i * 0.46) * 0.25;
      }
      return { key: 'cave_remipede', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || -200, cz = opts.cz || 126, r = opts.r || 16, yBase = opts.y || -22.5;
    let ang = Math.random() * 6.28;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'cave_remipede',
      sonarLabel: 'Пещерный гребненосец (Xibalbanus tulumensis)',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 280) { group.visible = false; return; }
        group.visible = true;
        ang += ((opts.speed || 1.35) / Math.max(8, r)) * dt;
        const ax = cx + Math.cos(ang) * r;
        const az = cz + Math.sin(ang) * r * 0.85;
        const bx = cx + Math.cos(ang + 0.09) * r;
        const bz = cz + Math.sin(ang + 0.09) * r * 0.85;
        const flA = biome.getHeight(ax, az);
        const ceilA = biome.getCeilingHeight ? biome.getCeilingHeight(ax, az) : 20;
        const ay = OC.clamp(yBase + Math.sin(time * 0.7 + ang) * 1.4, flA + 1.8, ceilA < 25 ? ceilA - 1.6 : -2.0);
        const by = OC.clamp(yBase + Math.sin(time * 0.7 + ang + 0.09) * 1.4, biome.getHeight(bx, bz) + 1.8, ceilA < 25 ? ceilA - 1.6 : -2.0);
        a.set(ax, ay, az);
        b.set(bx, by, bz);
        group.position.copy(a);
        group.lookAt(b);
        for (let i = 0; i < segs.length; i++) {
          const ph = time * 4.8 - i * 0.55;
          segs[i].position.set(Math.sin(ph) * (0.04 + i * 0.015), 0, -i * 0.21);
          segs[i].rotation.y = Math.cos(ph) * 0.26;
        }
      }
    };
  }

  /* ---------- Юкатанская слепая бротула / Белая дама пещер (Typhliasina pearsei) ---------- */

  function makeBlindBrotula(scene, biome, opts) {
    opts = opts || {};
    const preview = !!opts.preview;
    const group = new T.Group();
    group.userData.key = 'blind_brotula';

    const nSeg = 9;
    const segs = [];
    const paleMat = new T.MeshStandardMaterial({
      vertexColors: true,
      emissive: new T.Color(0x285660),
      emissiveIntensity: 0.28,
      roughness: 0.36,
      side: T.DoubleSide
    });

    for (let i = 0; i < nSeg; i++) {
      const sg = new T.Group();
      const f = Math.max(0.22, 1.0 - (i / nSeg) * 0.78);
      const segG = new T.SphereGeometry(0.18 * f, 8, 6);
      segG.scale(0.85, 1.05, 1.55);
      OC.geoPrep(segG);
      OC.paint(segG, (x, y, z, c) => c.set(y > 0 ? 0xf6efe6 : 0xe8b8c0));
      sg.add(new T.Mesh(segG, paleMat));

      if (i > 0) {
        const finG = new T.PlaneGeometry(0.42, 0.22 * f);
        finG.rotateY(Math.PI / 2);
        OC.geoPrep(finG);
        OC.paint(finG, 0xfdf8f2);
        const fm = new T.Mesh(finG, paleMat);
        fm.position.y = 0.20 * f;
        sg.add(fm);
      } else {
        for (const s of [-1, 1]) {
          const pFin = new T.ConeGeometry(0.08, 0.28, 4);
          OC.geoPrep(pFin);
          OC.paint(pFin, 0xf2d4da);
          const pm = new T.Mesh(pFin, paleMat);
          pm.position.set(s * 0.16, -0.05, -0.04);
          pm.rotation.z = s * 1.15;
          sg.add(pm);
        }
      }
      sg.userData.key = 'blind_brotula';
      group.add(sg);
      segs.push(sg);
    }

    group.scale.setScalar(opts.scale || (preview ? 1.0 : 1.18));
    scene.add(group);

    if (preview) {
      for (let i = 0; i < segs.length; i++) {
        segs[i].position.set(Math.sin(i * 0.55) * 0.26, 0, 1.2 - i * 0.32);
        segs[i].rotation.y = Math.cos(i * 0.55) * 0.24;
      }
      return { key: 'blind_brotula', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 180, cz = opts.cz || 210, r = opts.r || 24, yBase = opts.y || -40;
    let ang = Math.random() * 6.28;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'blind_brotula',
      sonarLabel: 'Слепая бротула — Белая дама пещер (Typhliasina)',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 320) { group.visible = false; return; }
        group.visible = true;
        ang += ((opts.speed || 1.75) / Math.max(10, r)) * dt;
        const ax = cx + Math.cos(ang) * r;
        const az = cz + Math.sin(ang) * r;
        const bx = cx + Math.cos(ang + 0.08) * r;
        const bz = cz + Math.sin(ang + 0.08) * r;
        const flA = biome.getHeight(ax, az);
        const ceilA = biome.getCeilingHeight ? biome.getCeilingHeight(ax, az) : 20;
        const ay = OC.clamp(yBase + Math.sin(time * 0.55 + ang) * 2.2, flA + 1.8, ceilA < 25 ? ceilA - 1.8 : -2.0);
        const by = OC.clamp(yBase + Math.sin(time * 0.55 + ang + 0.08) * 2.2, biome.getHeight(bx, bz) + 1.8, ceilA < 25 ? ceilA - 1.8 : -2.0);
        a.set(ax, ay, az);
        b.set(bx, by, bz);
        group.position.copy(a);
        group.lookAt(b);
        for (let i = 0; i < segs.length; i++) {
          const ph = time * 3.6 - i * 0.52;
          segs[i].position.set(Math.sin(ph) * (0.04 + i * 0.025), 0, -i * 0.30);
          segs[i].rotation.y = Math.cos(ph) * 0.22;
        }
      }
    };
  }

  /* ---------- Надводное научно-исследовательское судно (Mother-Ship НИС) ---------- */

  OC._FaunaBuilders.makeBrineLake = makeBrineLake;
  OC._FaunaBuilders.makeSiphonophore = makeSiphonophore;
  OC._FaunaBuilders.makeOarfish = makeOarfish;
  OC._FaunaBuilders.makeChimaera = makeChimaera;
  OC._FaunaBuilders.makeAriadneGuideline = makeAriadneGuideline;
  OC._FaunaBuilders.makeHaloclineLayer = makeHaloclineLayer;
  OC._FaunaBuilders.makeCaveRemipede = makeCaveRemipede;
  OC._FaunaBuilders.makeBlindBrotula = makeBlindBrotula;
})(window.OC);
