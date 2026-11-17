/* ================= ФАУНА: ПРЕСНОВОДНЫЕ ИСТОЧНИКИ ФЛОРИДЫ ================= */
/* Флоридская игла (gar), американский аллигатор и мягкокрылая черепаха.
   Все три описаны в faunaPlan биома florida_caves, но до этой правки не
   высаживались: spawn.js не читал массивы predators и megafauna (кроме
   florida_manatee), поэтому в мире их просто не было — только записи в Атласе. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

  /* ---------- Флоридская игла (Lepisosteus platyrhincus) ---------- */
  /* Древняя костяная рыба: удлинённое тело в алмазной ганоидной чешуе,
     длинные челюсти с игольчатыми зубами, плавники отодвинуты к хвосту. */
  function makeFloridaGar(scene, biome, opts) {
    const group = new T.Group();
    const L = 2.0;

    const body = new T.SphereGeometry(1, 22, 14);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z;                                   // -1 хвост .. +1 нос
      const taper = t < 0 ? (1 - 0.86 * Math.pow(-t, 1.5)) : (1 - 0.42 * Math.pow(t, 2.4));
      bp.setXYZ(i, x * 0.19 * L * taper, y * 0.24 * L * taper, z * 0.95 * L);
    }
    body.computeVertexNormals();
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => {
      // Алмазная сетка ганоидной чешуи
      const dia = Math.abs(Math.sin(z * 7.5) + Math.cos(y * 9.5));
      if (y < -0.1) { c.set(0xd8d3b4); return; }     // светлое брюхо
      c.set(0x5d6038).lerp(new T.Color(0x2f3320), OC.clamp(dia * 0.5, 0, 0.55));
      if (z < -0.2) c.lerp(new T.Color(0x33361f), 0.25); // тёмные пятна на хвостовом стебле
    });
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    // Длинные челюсти с зубами
    for (const s of [-1, 1]) {
      const jaw = new T.ConeGeometry(0.085, 0.86, 5);
      jaw.scale(1.0, 1.0, 0.42);
      OC.geoPrep(jaw);
      OC.paint(jaw, (x, y, z, c) => c.set(0x4a4d2c).lerp(new T.Color(0x2b2e1a), OC.clamp(-z * 1.6, 0, 0.6)));
      const jm = new T.Mesh(jaw, OC._FaunaCtx.creatureMat);
      jm.position.set(0, s * 0.045, 1.86);
      jm.rotation.x = Math.PI / 2;
      group.add(jm);

      for (let i = 0; i < 6; i++) {
        const tooth = new T.ConeGeometry(0.012, 0.07, 3);
        OC.geoPrep(tooth);
        OC.paint(tooth, 0xf2efe0);
        const tm = new T.Mesh(tooth, OC._FaunaCtx.creatureMat);
        tm.position.set(s < 0 ? -0.03 : 0.03, s * 0.02, 1.55 + i * 0.12);
        tm.rotation.x = s < 0 ? -Math.PI / 2 : Math.PI / 2;
        tm.rotation.z = s < 0 ? Math.PI : 0;
        group.add(tm);
      }
    }

    // Спинной и анальный плавники отодвинуты назад — как у всех панцирников
    for (const s of [1, -1]) {
      const fin = new T.ConeGeometry(0.16, 0.52, 4);
      fin.scale(0.16, 1, 1);
      OC.geoPrep(fin);
      OC.paint(fin, 0x464a2b);
      const fm = new T.Mesh(fin, OC._FaunaCtx.creatureMat);
      fm.position.set(0, s * 0.3, -1.05);
      fm.rotation.x = s > 0 ? -0.35 : Math.PI + 0.35;
      group.add(fm);
    }

    // Округлый хвост
    const tail = new T.ConeGeometry(0.34, 0.5, 5);
    tail.scale(0.14, 1, 1);
    OC.geoPrep(tail);
    OC.paint(tail, (x, y, z, c) => c.set(0x4a4d2c).lerp(new T.Color(0x1f2113), OC.clamp(-y * 1.2, 0, 0.5)));
    const tm2 = new T.Mesh(tail, OC._FaunaCtx.creatureMat);
    tm2.position.set(0, 0.02, -1.72);
    tm2.rotation.x = -Math.PI / 2;
    group.add(tm2);

    // Грудные плавники
    for (const s of [-1, 1]) {
      const pec = new T.ConeGeometry(0.09, 0.4, 4);
      pec.scale(0.18, 1, 1);
      OC.geoPrep(pec);
      OC.paint(pec, 0x565a33);
      const pm = new T.Mesh(pec, OC._FaunaCtx.creatureMat);
      pm.position.set(s * 0.16, -0.06, 0.86);
      pm.rotation.z = -s * 1.15;
      group.add(pm);
    }

    group.scale.setScalar(opts.scale || 1.0);
    group.userData.key = 'florida_gar';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 30;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'florida_gar',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        const cx = opts.cx || 0, cz = opts.cz || 0;
        const r = opts.r || opts.radius || 18;
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 420) { group.visible = false; return; }
        const camFwdX = ctx ? ctx.camFwdX : 0;
        const camFwdZ = ctx ? ctx.camFwdZ : -1;
        if ((cx - camPos.x) * camFwdX + (cz - camPos.z) * camFwdZ < -6) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        // Панцирник подолгу висит в толще и редко делает короткий бросок
        const act = OC.lerp(0.45, 1.0, dayW);
        t += dt * act;
        const dash = 1 + 1.9 * Math.max(0, Math.sin(t * 0.31) - 0.72);
        ang += ((opts.speed || 2.6) * act * dash / r) * dir * dt;
        const ax = cx + Math.cos(ang) * r;
        const az = cz + Math.sin(ang) * r;
        const ay = Math.max((opts.y || -8) + Math.sin(t * 0.42) * 1.6, biome.getHeight(ax, az) + 1.6);
        const ah = ang + 0.14 * dir;
        a.set(ax, ay, az);
        b.set(cx + Math.cos(ah) * r, ay, cz + Math.sin(ah) * r);
        group.position.copy(a);
        group.lookAt(b);
        group.rotateY(-Math.PI / 2);
        group.rotateY(Math.sin(time * (0.9 + dash) + t) * 0.05);
      }
    };
  }
  OC._FaunaBuilders.makeFloridaGar = makeFloridaGar;

  /* ---------- Американский аллигатор (Alligator mississippiensis) ---------- */
  function makeAlligator(scene, biome, opts) {
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 24, 16);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z;                                   // -1 хвост .. +1 морда
      const taper = t < 0 ? (1 - 0.8 * Math.pow(-t, 1.3)) : (1 - 0.5 * Math.pow(t, 1.8));
      bp.setXYZ(i, x * 0.42 * taper, y * 0.3 * taper, z * 1.25);
    }
    body.computeVertexNormals();
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => {
      if (y < -0.12) { c.set(0xa8a986); return; }    // светлое брюхо
      c.set(0x39412c).offsetHSL(0, 0, 0.05 * Math.sin(z * 8 + x * 6));
    });
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    // Широкая плоская морда с зубным рядом
    const snout = new T.BoxGeometry(0.34, 0.16, 0.78, 3, 1, 4);
    const sp = snout.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), z = sp.getZ(i);
      const w = 1 - 0.42 * Math.max(0, z / 0.39);
      sp.setXYZ(i, x * w, sp.getY(i), z);
    }
    snout.computeVertexNormals();
    OC.geoPrep(snout);
    OC.paint(snout, 0x333b27);
    const sm = new T.Mesh(snout, OC._FaunaCtx.creatureMat);
    sm.position.set(0, -0.02, 1.42);
    group.add(sm);
    for (let i = 0; i < 8; i++) {
      const tooth = new T.ConeGeometry(0.022, 0.075, 3);
      OC.geoPrep(tooth);
      OC.paint(tooth, 0xf0ecd8);
      const tm = new T.Mesh(tooth, OC._FaunaCtx.creatureMat);
      tm.position.set((i % 2 === 0 ? -1 : 1) * 0.13, -0.075, 1.12 + i * 0.085);
      tm.rotation.x = Math.PI;
      group.add(tm);
    }

    // Глаза и ноздри на верхней плоскости головы
    for (const s of [-1, 1]) {
      const eye = new T.SphereGeometry(0.062, 10, 8);
      OC.geoPrep(eye);
      OC.paint(eye, 0xd8c24a);
      const em = new T.Mesh(eye, OC._FaunaCtx.creatureMat);
      em.position.set(s * 0.17, 0.16, 1.06);
      group.add(em);
    }

    // Два ряда спинных щитков (остеодерм)
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 11; i++) {
        const t = i / 10;
        const sc = new T.ConeGeometry(0.055, 0.13, 4);
        OC.geoPrep(sc);
        OC.paint(sc, 0x2b3222);
        const scm = new T.Mesh(sc, OC._FaunaCtx.creatureMat);
        scm.position.set((row === 0 ? 1 : -1) * (0.13 - t * 0.05), 0.28 - t * 0.07, 0.9 - t * 1.9);
        scm.rotation.x = -0.18;
        group.add(scm);
      }
    }

    // Мощный уплощённый хвост на шарнире
    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -1.05);
    const tail = new T.ConeGeometry(0.3, 1.5, 6);
    const tp = tail.attributes.position;
    for (let i = 0; i < tp.count; i++) tp.setXYZ(i, tp.getX(i) * 0.55, tp.getY(i) * 0.9, tp.getZ(i));
    tail.computeVertexNormals();
    OC.geoPrep(tail);
    OC.paint(tail, (x, y, z, c) => c.set(0x333b27).offsetHSL(0, 0, OC.clamp(-z * 0.35, 0, 0.18)));
    const tam = new T.Mesh(tail, OC._FaunaCtx.creatureMat);
    tam.position.set(0, 0, -0.72);
    tam.rotation.x = Math.PI / 2;
    tailPivot.add(tam);
    group.add(tailPivot);

    // Короткие лапы: передние по две, задние крупнее
    for (const s of [-1, 1]) {
      for (const front of [true, false]) {
        const leg = new T.ConeGeometry(0.085, 0.42, 5);
        leg.scale(1, 1, 0.6);
        OC.geoPrep(leg);
        OC.paint(leg, 0x3b422c);
        const lm = new T.Mesh(leg, OC._FaunaCtx.creatureMat);
        lm.position.set(s * (front ? 0.34 : 0.36), -0.2, front ? 0.72 : -0.62);
        lm.rotation.z = s * (front ? 1.05 : 0.85);
        lm.rotation.x = front ? 0.3 : -0.3;
        group.add(lm);
      }
    }

    group.scale.setScalar((opts.scale || 1.6) * 0.85);
    group.userData.key = 'american_alligator';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 20;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'american_alligator',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        const cx = opts.cx || 0, cz = opts.cz || 0;
        const r = opts.r || opts.radius || 22;
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 460) { group.visible = false; return; }
        const camFwdX = ctx ? ctx.camFwdX : 0;
        const camFwdZ = ctx ? ctx.camFwdZ : -1;
        if ((cx - camPos.x) * camFwdX + (cz - camPos.z) * camFwdZ < -6) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const act = OC.lerp(0.6, 1.25, dayW);
        t += dt * act;
        ang += ((opts.speed || 1.6) * act / r) * dir * dt;
        const ax = cx + Math.cos(ang) * (r + Math.sin(t * 0.2) * 3);
        const az = cz + Math.sin(ang) * (r + Math.sin(t * 0.2) * 3);
        // Держится у дна, изредка всплывает к поверхности источника
        const floor = biome.getHeight(ax, az);
        const surfW = OC.clamp(Math.sin(t * 0.12) * 1.4, 0, 1);
        const cruise = Math.max((opts.y || -3) + Math.sin(t * 0.4) * 0.8, floor + 1.2);
        const ay = OC.lerp(cruise, Math.min(-0.6, cruise + 3.5), surfW);
        const ah = ang + 0.2 * dir;
        a.set(ax, ay, az);
        b.set(cx + Math.cos(ah) * r, ay, cz + Math.sin(ah) * r);
        group.position.copy(a);
        group.lookAt(b);
        group.rotateY(-Math.PI / 2);
        // Хвост работает из стороны в сторону — основной движитель крокодила
        tailPivot.rotation.y = Math.sin(time * 1.1 + t) * 0.22;
      }
    };
  }
  OC._FaunaBuilders.makeAlligator = makeAlligator;

  /* ---------- Флоридская мягкокрылая черепаха (Apalone ferox) ---------- */
  /* Панцирь без роговых щитков: гладкий кожистый, с длинной шеей и трубчатым носом. */
  function makeSoftshellTurtle(scene, biome, opts) {
    const group = new T.Group();

    const shell = new T.SphereGeometry(1, 26, 16);
    const sp = shell.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i);
      const rr = Math.hypot(x, z);
      const t = z;
      // Плоский овал с чуть приподнятым центром
      const dome = y > 0 ? 1 + 0.18 * (1 - Math.min(1, rr)) : 0.42;
      sp.setXYZ(i, x * 1.55 * (1 - 0.22 * Math.abs(t)), y * 0.5 * dome, z * 2.05);
    }
    shell.computeVertexNormals();
    OC.geoPrep(shell);
    OC.paint(shell, (x, y, z, c) => {
      const spot = Math.sin(x * 5.5) * Math.cos(z * 4.5);
      if (y < -0.1) { c.set(0xe6e2cd); return; }     // светлый пластрон
      c.set(0x6b6b4a).lerp(new T.Color(0x3a3a28), spot > 0.32 ? 0.5 : 0);
    });
    group.add(new T.Mesh(shell, OC._FaunaCtx.creatureMat));

    // Мягкий кожистый край панциря
    const rim = new T.SphereGeometry(1, 20, 10);
    rim.scale(1.62, 0.16, 2.12);
    OC.geoPrep(rim);
    OC.paint(rim, 0x565638);
    group.add(new T.Mesh(rim, OC._FaunaCtx.creatureMat));

    // Длинная шея и трубчатый нос — отличает мягкокрылых черепах
    const neck = new T.CylinderGeometry(0.17, 0.22, 0.9, 10);
    OC.geoPrep(neck);
    OC.paint(neck, 0x7c7c58);
    const nm = new T.Mesh(neck, OC._FaunaCtx.creatureMat);
    nm.position.set(0, 0.02, 2.05);
    nm.rotation.x = Math.PI / 2 - 0.18;
    group.add(nm);

    const head = new T.SphereGeometry(0.24, 14, 10);
    head.scale(0.8, 0.72, 1.5);
    OC.geoPrep(head);
    OC.paint(head, 0x8a8a62);
    const hm = new T.Mesh(head, OC._FaunaCtx.creatureMat);
    hm.position.set(0, 0.08, 2.72);
    group.add(hm);

    const snout = new T.CylinderGeometry(0.055, 0.085, 0.34, 8);
    OC.geoPrep(snout);
    OC.paint(snout, 0x9a9a72);
    const snm = new T.Mesh(snout, OC._FaunaCtx.creatureMat);
    snm.position.set(0, 0.06, 3.02);
    snm.rotation.x = Math.PI / 2;
    group.add(snm);
    for (const s of [-1, 1]) {
      const eye = new T.SphereGeometry(0.045, 8, 6);
      OC.geoPrep(eye);
      OC.paint(eye, 0x1a1a12);
      const em = new T.Mesh(eye, OC._FaunaCtx.creatureMat);
      em.position.set(s * 0.13, 0.16, 2.78);
      group.add(em);
    }

    // Перепончатые лапы
    for (let i = 0; i < 4; i++) {
      const front = i < 2;
      const s = (i % 2 === 0) ? 1 : -1;
      const flip = new T.SphereGeometry(1, 14, 9);
      flip.scale(front ? 0.62 : 0.5, 0.09, 0.34);
      OC.geoPrep(flip);
      OC.paint(flip, 0x6e6e4c);
      const fm = new T.Mesh(flip, OC._FaunaCtx.creatureMat);
      fm.position.set(s * (front ? 1.35 : 1.15), -0.06, front ? 1.05 : -1.35);
      fm.rotation.y = s * (front ? 0.35 : -0.3);
      group.add(fm);
    }

    group.scale.setScalar((opts.scale || 1.1) * 0.52);
    group.userData.key = 'florida_softshell';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 24;
    let breathPhase = Math.random() * 22;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'florida_softshell',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        const cx = opts.cx || 0, cz = opts.cz || 0;
        const r = opts.r || opts.radius || 24;
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 460) { group.visible = false; return; }
        const camFwdX = ctx ? ctx.camFwdX : 0;
        const camFwdZ = ctx ? ctx.camFwdZ : -1;
        if ((cx - camPos.x) * camFwdX + (cz - camPos.z) * camFwdZ < -6) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const act = OC.lerp(0.6, 1.15, dayW);
        t += dt * act;
        breathPhase += dt;
        ang += ((opts.speed || 2.0) * act / r) * dir * dt;
        const ax = cx + Math.cos(ang) * (r + Math.sin(t * 0.19) * 4);
        const az = cz + Math.sin(ang) * (r + Math.sin(t * 0.19) * 4);
        // Мягкокрылые черепахи дышат чаще морских: цикл ~22 с
        const cyc = breathPhase % 22.0;
        let surfW = 0;
        if (cyc > 17.0 && cyc < 21.5) surfW = Math.sin(((cyc - 17.0) / 4.5) * Math.PI);
        const grazeY = Math.max((opts.y || -5) + Math.sin(t * 0.3) * 2.0, biome.getHeight(ax, az) + 1.4);
        const ay = Math.min(-0.4, OC.lerp(grazeY, -0.5, surfW));
        const ah = ang + 0.16 * dir;
        a.set(ax, ay, az);
        b.set(cx + Math.cos(ah) * r, ay, cz + Math.sin(ah) * r);
        group.position.copy(a);
        group.lookAt(b);
        group.rotateY(-Math.PI / 2);
        // Гребля передними лапами
        group.rotateZ(Math.sin(time * 2.2 + t) * 0.06);
      }
    };
  }
  OC._FaunaBuilders.makeSoftshellTurtle = makeSoftshellTurtle;
})(window.OC);
