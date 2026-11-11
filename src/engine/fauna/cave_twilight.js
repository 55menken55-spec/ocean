/* ================= ФАУНА: СУМЕРЕЧНЫЕ ОБИТАТЕЛИ БЕЗДНЫ И ПЕЩЕР ================= */
/* Сифонофора, сельдяной король (oarfish), химера, слепой рачок-ремипеда и слепая
   бросатula (Lucifuga) — жители галоклина, пещерных залов и сумеречной толщи. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

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

  OC._FaunaBuilders.makeSiphonophore = makeSiphonophore;
  OC._FaunaBuilders.makeOarfish = makeOarfish;
  OC._FaunaBuilders.makeChimaera = makeChimaera;
  OC._FaunaBuilders.makeCaveRemipede = makeCaveRemipede;
  OC._FaunaBuilders.makeBlindBrotula = makeBlindBrotula;
})(window.OC);
