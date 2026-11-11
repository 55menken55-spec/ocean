/* ================= ФАУНА: АБИССАЛЬ, ГИДРОТЕРМЫ И WHALE-FALL ================= */
/* Удильщик, абиссальный кальмар, осьминог-думбо, плюмы курильщиков, китовое падение,
   хадальная рыба-улитка и морская свинья. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

  function makeAnglerfish(scene, biome, opts) {
    const group = new T.Group();
    const body = new T.SphereGeometry(0.75, 14, 10);
    body.scale(0.82, 0.88, 1.18);
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.set(y > 0 ? 0x1a151c : 0x2c2228));
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    // Огромная нижняя челюсть с зубами
    const jaw = new T.TorusGeometry(0.45, 0.08, 5, 10, Math.PI);
    OC.geoPrep(jaw);
    OC.paint(jaw, 0x352a32);
    const jawM = new T.Mesh(jaw, OC._FaunaCtx.creatureMat);
    jawM.position.set(0, -0.22, 0.64);
    jawM.rotation.x = Math.PI * 0.65;
    group.add(jawM);

    // Иллиций (удочка) и биолюминесцентная приманка-эска
    const rodPts = [new T.Vector3(0, 0.55, 0.35), new T.Vector3(0, 1.05, 0.95), new T.Vector3(0, 0.42, 1.38)];
    const rod = new T.TubeGeometry(new T.CatmullRomCurve3(rodPts), 8, 0.025, 5, false);
    OC.geoPrep(rod);
    OC.paint(rod, 0x3a3542);
    group.add(new T.Mesh(rod, OC._FaunaCtx.creatureMat));

    const lureMat = new T.MeshBasicMaterial({ color: 0x62fff0 });
    const lure = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), lureMat);
    lure.position.set(0, 0.4, 1.38);
    group.add(lure);

    const tail = new T.ConeGeometry(0.35, 0.72, 4);
    tail.scale(0.24, 1, 1);
    tail.rotateX(-Math.PI / 2);
    OC.geoPrep(tail);
    OC.paint(tail, 0x241d26);
    const tM = new T.Mesh(tail, OC._FaunaCtx.creatureMat);
    tM.position.set(0, 0, -1.05);
    group.add(tM);

    group.scale.setScalar(opts.scale || 1.25);
    group.userData.key = 'fish_angler';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 40;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'fish_angler',
      isActivePredator: true,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 480) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 1.2) / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r, az = opts.cz + Math.sin(ang) * opts.r;
        const bx = opts.cx + Math.cos(ang + 0.1) * opts.r, bz = opts.cz + Math.sin(ang + 0.1) * opts.r;
        const ay = Math.max(opts.y + Math.sin(t * 0.4) * 2.5, biome.getHeight(ax, az) + 2.6);
        const by = Math.max(opts.y + Math.sin(t * 0.4 + 0.2) * 2.5, biome.getHeight(bx, bz) + 2.6);
        a.set(ax, ay, az);
        b.set(bx, by, bz);
        group.position.copy(a);
        group.lookAt(b);
        lure.position.y = 0.4 + Math.sin(time * 3.1) * 0.08;
        lureMat.color.setHSL(0.47, 0.95, 0.56 + 0.22 * Math.sin(time * 4.5));
        tM.rotation.y = Math.sin(time * 2.4) * 0.3;
      }
    };
  }

  /* ---------- Глубоководный абиссальный кальмар ---------- */

  function makeAbyssalSquid(scene, biome, opts) {
    const group = new T.Group();
    const mantle = new T.ConeGeometry(0.46, 2.2, 10);
    mantle.rotateX(Math.PI / 2);
    OC.geoPrep(mantle);
    OC.paint(mantle, (x, y, z, c) => c.set(z > 0 ? 0x691828 : 0x451220));
    group.add(new T.Mesh(mantle, OC._FaunaCtx.creatureMat));

    const fins = new T.ConeGeometry(0.75, 0.95, 4);
    fins.scale(1.1, 0.12, 1);
    fins.rotateX(-Math.PI / 2);
    OC.geoPrep(fins);
    OC.paint(fins, 0x8c283c);
    const finM = new T.Mesh(fins, OC._FaunaCtx.creatureMat);
    finM.position.set(0, 0, -0.82);
    group.add(finM);

    const armsPivot = new T.Group();
    armsPivot.position.set(0, 0, 1.05);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const arm = new T.ConeGeometry(0.065, i < 2 ? 1.9 : 1.1, 4);
      arm.rotateX(Math.PI / 2);
      OC.geoPrep(arm);
      OC.paint(arm, 0x721c2e);
      const am = new T.Mesh(arm, OC._FaunaCtx.creatureMat);
      am.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, i < 2 ? 0.85 : 0.45);
      armsPivot.add(am);
    }
    group.add(armsPivot);

    // Светящиеся фотофоры вдоль мантии
    const photMat = new T.MeshBasicMaterial({ color: 0x4df4ff });
    for (const s of [-1, 1]) {
      const dot = new T.Mesh(new T.SphereGeometry(0.06, 5, 4), photMat);
      dot.position.set(s * 0.28, 0.12, 0.1);
      group.add(dot);
    }

    group.scale.setScalar(opts.scale || 1.1);
    group.userData.key = 'squid_abyssal';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 60;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'squid_abyssal',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 2.8) / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r, az = opts.cz + Math.sin(ang) * opts.r;
        const bx = opts.cx + Math.cos(ang + 0.1) * opts.r, bz = opts.cz + Math.sin(ang + 0.1) * opts.r;
        const ay = Math.max(opts.y + Math.sin(t * 0.35) * 5, biome.getHeight(ax, az) + 4);
        const by = Math.max(opts.y + Math.sin(t * 0.35 + 0.2) * 5, biome.getHeight(bx, bz) + 4);
        a.set(ax, ay, az);
        b.set(bx, by, bz);
        group.position.copy(a);
        group.lookAt(b);
        finM.rotation.z = Math.sin(time * 2.6) * 0.28;
        armsPivot.rotation.x = Math.sin(time * 2.0) * 0.14;
      }
    };
  }

  /* ---------- Гримпотевтис / осьминог Дамбо (Grimpoteuthis) ---------- */

  function makeDumboOctopus(scene, biome, opts) {
    const group = new T.Group();
    const bell = new T.SphereGeometry(0.65, 12, 10);
    bell.scale(0.9, 1.15, 0.9);
    OC.geoPrep(bell);
    OC.paint(bell, (x, y, z, c) => c.set(y > 0 ? 0xd9a8c4 : 0xbd7fa8));
    const bM = new T.Mesh(bell, OC._FaunaCtx.creatureMat);
    bM.position.y = 0.25;
    group.add(bM);

    const ears = [];
    const earG = new T.SphereGeometry(0.32, 7, 5);
    earG.scale(1.6, 0.2, 0.75);
    OC.geoPrep(earG);
    OC.paint(earG, 0xe8bcd4);
    for (const s of [-1, 1]) {
      const em = new T.Mesh(earG, OC._FaunaCtx.creatureMat);
      em.position.set(s * 0.62, 0.55, 0);
      group.add(em);
      ears.push({ em, s });
    }

    const skirt = new T.ConeGeometry(0.68, 0.55, 8);
    OC.geoPrep(skirt);
    OC.paint(skirt, 0xc789b0);
    const skM = new T.Mesh(skirt, OC._FaunaCtx.creatureMat);
    skM.position.y = -0.22;
    group.add(skM);

    group.scale.setScalar(opts.scale || 1.1);
    group.userData.key = 'octopus_dumbo';
    scene.add(group);

    let t = Math.random() * 40;
    return {
      key: 'octopus_dumbo',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.x - camPos.x, opts.z - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        const wx = opts.x + Math.sin(t * 0.28) * 5.5;
        const wz = opts.z + Math.cos(t * 0.24) * 5.5;
        const wy = biome.getHeight(wx, wz) + 2.2 + Math.sin(t * 0.8) * 1.4;
        group.position.set(wx, wy, wz);
        group.rotation.y = t * 0.35;
        const flap = Math.sin(time * 2.1);
        for (const e of ears) e.em.rotation.z = e.s * flap * 0.55;
      }
    };
  }

  /* ---------- Белуха (Delphinapterus leucas) ---------- */

  function makeVentPlume(scene, biome, tex, opts) {
    const n = opts.n || 180;
    const hMax = opts.height || 34;
    const coldSeep = !!opts.coldSeep;
    const key = opts.key || (coldSeep ? 'serpentinite_vent' : 'vent_chimney');
    const baseY = biome.getHeight(opts.x, opts.z) + (opts.chimneyH || 6.5);
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    const sz = new Float32Array(n);
    const rng = OC.mulberry32(Math.abs(Math.round(opts.x * 13 + opts.z * 29)) + 77);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * 1.4;
      pos[i * 3 + 1] = rng() * hMax;
      pos[i * 3 + 2] = (rng() - 0.5) * 1.4;
      ph[i] = rng() * 100;
      sz[i] = OC.lerp(1.4, 3.6, rng());
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.NormalBlending, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: tex },
          uTime: OC.uTime,
          uHMax: { value: hMax },
          uCold: { value: coldSeep ? 1.0 : 0.0 }
        }
      ]),
      vertexShader: `
        attribute float aPhase, aSize;
        uniform float uTime, uHMax;
        varying float vLife;
        varying float vHeat;
        #include <fog_pars_vertex>
        void main(){
          float y = mod(position.y + uTime * 3.8 + aPhase, uHMax);
          float life = y / uHMax;
          vLife = life;
          vHeat = smoothstep(0.24, 0.0, life);
          float billow = 0.8 + life * 6.2;
          vec3 p = vec3(
            position.x * billow + sin(uTime * 0.9 + aPhase + life * 4.0) * (0.6 + life * 2.2),
            y,
            position.z * billow + cos(uTime * 0.75 + aPhase * 1.3 + life * 4.0) * (0.6 + life * 2.2)
          );
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * (1.0 + life * 2.4) * (240.0 / max(1.5, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform float uCold;
        varying float vLife, vHeat;
        #include <fog_pars_fragment>
        void main(){
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.03) discard;
          vec3 soot = mix(vec3(0.11, 0.12, 0.14), vec3(0.45, 0.72, 0.82), uCold);
          vec3 ember = mix(vec3(0.92, 0.36, 0.08), vec3(0.72, 0.95, 1.0), uCold);
          vec3 col = mix(soot, ember, vHeat * (0.72 - uCold * 0.15));
          float alpha = tx.a * (1.0 - smoothstep(0.45, 1.0, vLife)) * smoothstep(0.0, 0.05, vLife) * (0.68 - uCold * 0.22);
          gl_FragColor = vec4(col, alpha);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.position.set(opts.x, baseY, opts.z);
    pts.userData.key = key;
    scene.add(pts);

    let light = null;
    if (opts.light) {
      light = new T.PointLight(coldSeep ? 0x6ce8ff : 0xff5e1a, coldSeep ? 1.8 : 2.6, 52, 1.4);
      light.position.set(opts.x, baseY + 1.5, opts.z);
      scene.add(light);
    }

    return {
      key,
      getPosition: () => pts.position,
      update(dt, time, camPos) {
        const d = Math.hypot(opts.x - camPos.x, opts.z - camPos.z);
        const vis = d < 520;
        pts.visible = vis;
        if (light) light.intensity = vis ? ((coldSeep ? 1.6 : 2.2) + 0.55 * Math.sin(time * 4.4 + opts.x)) : 0;
      }
    };
  }

  /* ---------- Оазис китового падения: 24-метровый скелет синего кита в Марианской впадине ---------- */

  function makeWhaleFall(scene, biome, opts) {
    opts = opts || {};
    const group = new T.Group();
    const parts = [];
    const len = opts.len || 24;
    const boneA = 0xddd6c6;
    const boneB = 0xa89f8e;
    const matCol = 0xe8d89e;
    const osedaxCol = 0xd93664;

    function paintBone(g) {
      OC.geoPrep(g);
      OC.paint(g, (x, y, z, c) => {
        const n = Math.sin(x * 1.9 + z * 0.7) * 0.5 + 0.5;
        c.set(boneA).lerp(new T.Color(boneB), n * 0.45);
      });
      parts.push(g);
      return g;
    }

    // 1. Череп и верхняя челюсть синего кита (спереди +Z)
    const cranium = new T.SphereGeometry(1.65, 12, 8);
    cranium.scale(1.15, 0.72, 1.45);
    OC.xform(paintBone(cranium), { p: [0, 0.95, len * 0.34] });

    for (const s of [-1, 1]) {
      const jaw = new T.CylinderGeometry(0.16, 0.38, 4.8, 7);
      jaw.rotateX(Math.PI / 2);
      OC.xform(paintBone(jaw), { r: [0.06, s * 0.22, 0], p: [s * 0.78, 0.58, len * 0.44] });
    }
    const vomer = new T.ConeGeometry(0.45, 4.9, 6);
    vomer.scale(0.85, 1.0, 0.45);
    vomer.rotateX(Math.PI / 2);
    OC.xform(paintBone(vomer), { p: [0, 0.88, len * 0.45] });

    // 2. Позвоночный столб (22 массивных позвонка с остистыми отростками по S-дуге)
    for (let i = 0; i < 22; i++) {
      const u = i / 21;
      const vz = len * 0.28 - u * len * 0.76;
      const vx = Math.sin(u * 3.1) * 1.35;
      const vy = 0.52 + (1 - u) * 0.22 + Math.sin(u * Math.PI) * 0.25;
      const rad = OC.lerp(0.46, 0.16, u * u);

      const centrum = new T.CylinderGeometry(rad, rad * 1.04, 0.52, 8);
      centrum.rotateX(Math.PI / 2);
      OC.xform(paintBone(centrum), { r: [0, Math.cos(u * 3.1) * 0.24, 0], p: [vx, vy, vz] });

      const spine = new T.BoxGeometry(0.12, OC.lerp(1.15, 0.26, u), 0.26);
      OC.xform(paintBone(spine), { r: [-0.22, Math.cos(u * 3.1) * 0.24, 0], p: [vx, vy + rad + 0.36, vz] });
    }

    // 3. Свод рёберной клетки (14 пар изогнутых рёбер + лопатки)
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      const vz = len * 0.22 - u * len * 0.36;
      const vxBase = Math.sin(((len * 0.28 - vz) / (len * 0.76)) * 3.1) * 1.35;
      const span = 1.65 + Math.sin(u * Math.PI) * 1.15;
      for (const s of [-1, 1]) {
        const rib = new T.TorusGeometry(span, 0.105, 5, 10, Math.PI * 0.78);
        OC.xform(paintBone(rib), {
          r: [0.18, s * 0.15, s * 0.38 - Math.PI * 0.12],
          p: [vxBase + s * 0.35, 0.18, vz]
        });
      }
    }

    // 4. Бактериальные сульфидные маты и гроздья костоедов Osedax прямо на костях
    const rng = OC.mulberry32(9904);
    for (let i = 0; i < 24; i++) {
      const pz = OC.lerp(-len * 0.42, len * 0.42, rng());
      const px = OC.lerp(-2.2, 2.2, rng());
      const patch = new T.SphereGeometry(OC.lerp(0.26, 0.55, rng()), 6, 4);
      patch.scale(1.3, 0.42, 1.1);
      OC.geoPrep(patch);
      OC.paint(patch, i % 2 === 0 ? osedaxCol : matCol);
      OC.xform(patch, { p: [px, OC.lerp(0.18, 1.15, rng()), pz] });
      parts.push(patch);
    }

    const merged = OC.mergeGeometries(parts);
    group.add(new T.Mesh(merged, OC._FaunaCtx.creatureMat));

    // Лёгкое биолюминесцентное свечение бактериальных матов у падения кита в гадальной тьме
    const matSpot = new T.MeshBasicMaterial({ color: 0xffe49c, transparent: true, opacity: 0.72 });
    const osMat = new T.MeshBasicMaterial({ color: 0xff4c7c, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 6; i++) {
      const m = new T.Mesh(new T.SphereGeometry(0.22, 6, 4), i % 2 === 0 ? osMat : matSpot);
      m.position.set(Math.sin(i * 1.7) * 1.35, 0.45 + (i % 3) * 0.32, (i - 2.5) * 3.1);
      group.add(m);
    }

    let halo = null;
    if (!opts.preview && biome && biome.getHeight) {
      const fl = biome.getHeight(opts.x || 0, opts.z || 0);
      group.position.set(opts.x || 0, fl - 0.12, opts.z || 0);
      group.rotation.y = opts.yaw || 0.45;
      halo = new T.PointLight(0xff7aa8, 1.4, 38, 1.5);
      halo.position.set(opts.x || 0, fl + 3.2, opts.z || 0);
      scene.add(halo);
    } else {
      group.position.set(0, 0, 0);
    }

    group.userData.key = 'whale_fall';
    scene.add(group);

    return {
      key: 'whale_fall',
      sonarLabel: 'Оазис китового падения (Whale Fall)',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (opts.preview) return;
        const d = Math.hypot(group.position.x - camPos.x, group.position.z - camPos.z);
        group.visible = d < 620;
        if (halo) halo.intensity = group.visible ? (1.1 + 0.35 * Math.sin(time * 1.8)) : 0;
      }
    };
  }

  /* ---------- Марианский морской слизень (Pseudoliparis swirei, глубочайшая рыба Земли) ---------- */

  function makeHadalSnailfish(scene, biome, opts) {
    opts = opts || {};
    const group = new T.Group();
    const parts = [];

    // Широкая голова и полупрозрачное жемчужно-розовое тело без чешуи, плавно сужающееся в длинный хвост
    const body = new T.SphereGeometry(0.26, 12, 8);
    body.scale(0.95, 0.85, 2.35);
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.set(z > 0.15 ? 0xf2c8d8 : 0xe4e8f4));
    parts.push(body);

    const head = new T.SphereGeometry(0.27, 10, 8);
    head.scale(1.12, 0.82, 1.0);
    OC.geoPrep(head); OC.paint(head, 0xf6d4e0);
    OC.xform(head, { p: [0, -0.02, 0.34] });
    parts.push(head);

    // Веерообразные полупрозрачные грудные плавники
    for (const s of [-1, 1]) {
      const pec = new T.ConeGeometry(0.16, 0.38, 4);
      pec.scale(0.14, 1.0, 1.25);
      pec.rotateZ(-s * Math.PI / 2);
      OC.geoPrep(pec); OC.paint(pec, 0xffeaf2);
      OC.xform(pec, { r: [0, -s * 0.25, 0], p: [s * 0.25, -0.06, 0.22] });
      parts.push(pec);
    }

    // Крошечные тёмные глаза
    for (const s of [-1, 1]) {
      const eye = new T.SphereGeometry(0.032, 6, 4);
      OC.geoPrep(eye); OC.paint(eye, 0x121622);
      OC.xform(eye, { p: [s * 0.16, 0.08, 0.48] });
      parts.push(eye);
    }

    const mainMat = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.04,
      emissive: new T.Color(0x6e4a62),
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.88,
      side: T.DoubleSide
    });
    group.add(new T.Mesh(OC.mergeGeometries(parts), mainMat));

    // Лентовидный хвост с волнистой спинно-анальной каймой
    const tailGroup = new T.Group();
    tailGroup.position.set(0, 0, -0.45);
    const tailFin = new T.ConeGeometry(0.18, 0.82, 4);
    tailFin.scale(0.16, 1.0, 1.0);
    tailFin.rotateX(-Math.PI / 2);
    OC.geoPrep(tailFin); OC.paint(tailFin, 0xf2dae4);
    OC.xform(tailFin, { p: [0, 0, -0.38] });
    tailGroup.add(new T.Mesh(tailFin, mainMat));
    group.add(tailGroup);

    group.scale.setScalar(opts.scale || 1.25);
    group.userData.key = 'hadal_snailfish';
    scene.add(group);

    let ang = Math.random() * 6.28;
    const _a = new T.Vector3(), _b = new T.Vector3();
    return {
      key: 'hadal_snailfish',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot((opts.cx || 0) - camPos.x, (opts.cz || 0) - camPos.z) > 460) { group.visible = false; return; }
        group.visible = true;
        ang += ((opts.speed || 1.6) / (opts.r || 26)) * dt;
        const ax = (opts.cx || 0) + Math.cos(ang) * (opts.r || 26);
        const az = (opts.cz || 0) + Math.sin(ang) * (opts.r || 26);
        const bx = (opts.cx || 0) + Math.cos(ang + 0.12) * (opts.r || 26);
        const bz = (opts.cz || 0) + Math.sin(ang + 0.12) * (opts.r || 26);
        const ay = biome.getHeight(ax, az) + 2.4 + Math.sin(time * 0.7 + az) * 0.9;
        const by = biome.getHeight(bx, bz) + 2.4 + Math.sin(time * 0.7 + bz) * 0.9;
        _a.set(ax, ay, az); _b.set(bx, by, bz);
        group.position.copy(_a);
        group.lookAt(_b);
        tailGroup.rotation.y = Math.sin(time * 4.6 + ang) * 0.35;
      }
    };
  }

  /* ---------- Глубоководная голотурия «морская свинка» (Scotoplanes globosa) ---------- */

  function makeSeaPig(scene, biome, opts) {
    opts = opts || {};
    const preview = !!opts.singlePreview;
    const count = preview ? 1 : (opts.count || 5);
    const group = new T.Group();
    group.userData.key = 'sea_pig';

    const members = [];
    const rng = OC.mulberry32(Math.abs(Math.round((opts.cx || 9) * 17 + (opts.cz || 5) * 37)) + 412);

    function buildSinglePig() {
      const pRoot = new T.Group();
      const parts = [];
      const body = new T.SphereGeometry(0.24, 10, 8);
      body.scale(0.88, 0.82, 1.55);
      OC.geoPrep(body);
      OC.paint(body, (x, y, z, c) => c.set(y > 0 ? 0xdca0c4 : 0xc482a8));
      parts.push(body);

      // Парные ножки-трубки по бокам брюха и спинные антенны-папиллы
      for (let leg = 0; leg < 5; leg++) {
        const lz = -0.22 + leg * 0.11;
        for (const s of [-1, 1]) {
          const tube = new T.CylinderGeometry(0.025, 0.018, 0.15, 5);
          OC.geoPrep(tube); OC.paint(tube, 0xe4b8d2);
          OC.xform(tube, { r: [0, 0, s * 0.42], p: [s * 0.19, -0.14, lz] });
          parts.push(tube);
        }
      }
      for (const s of [-1, 1]) {
        const ant = new T.ConeGeometry(0.028, 0.24, 5);
        OC.geoPrep(ant); OC.paint(ant, 0xf2bfd8);
        OC.xform(ant, { r: [0.18, 0, -s * 0.22], p: [s * 0.09, 0.24, 0.08] });
        parts.push(ant);
      }

      const pigMat = new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.36,
        metalness: 0.04,
        emissive: new T.Color(0x522a44),
        emissiveIntensity: 0.35
      });
      pRoot.add(new T.Mesh(OC.mergeGeometries(parts), pigMat));
      pRoot.userData.key = 'sea_pig';
      return pRoot;
    }

    for (let i = 0; i < count; i++) {
      const m = buildSinglePig();
      const sc = preview ? 1.5 : OC.lerp(0.9, 1.25, rng());
      m.scale.setScalar(sc);
      group.add(m);
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + rng() * 0.5;
      const rr = preview ? 0 : OC.lerp(2.2, opts.r || 12, rng());
      members.push({
        root: m,
        ang,
        rr,
        spd: OC.lerp(0.25, 0.45, rng()),
        phase: rng() * 6.28
      });
    }

    scene.add(group);
    if (preview) {
      return { key: 'sea_pig', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 0;
    const cz = opts.cz || 0;
    return {
      key: 'sea_pig',
      getPosition: () => members[0].root.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        for (let i = 0; i < members.length; i++) {
          const m = members[i];
          m.ang += (m.spd / Math.max(2.5, m.rr)) * dt;
          const px = cx + Math.cos(m.ang) * m.rr;
          const pz = cz + Math.sin(m.ang) * m.rr;
          const py = biome.getHeight(px, pz) + 0.16;
          m.root.position.set(px, py, pz);
          m.root.rotation.y = -m.ang;
          m.root.position.y += Math.sin(time * 2.2 + m.phase) * 0.015;
        }
      }
    };
  }

  /* ---------- Подводное соляное озеро с галоклином (Brine Pool) ---------- */

  OC._FaunaBuilders.makeAnglerfish = makeAnglerfish;
  OC._FaunaBuilders.makeAbyssalSquid = makeAbyssalSquid;
  OC._FaunaBuilders.makeDumboOctopus = makeDumboOctopus;
  OC._FaunaBuilders.makeVentPlume = makeVentPlume;
  OC._FaunaBuilders.makeWhaleFall = makeWhaleFall;
  OC._FaunaBuilders.makeHadalSnailfish = makeHadalSnailfish;
  OC._FaunaBuilders.makeSeaPig = makeSeaPig;
})(window.OC);
