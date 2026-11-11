/* ================= ФАУНА: ГАЛАПАГОСЫ ================= */
/* Луна-рыба Mola mola, морская игуана, пингвин, мобула, Арка Дарвина и фумаролы. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

  function makeOceanSunfish(scene, biome, opts) {
    opts = opts || {};
    const sz = opts.scale || 1.35;
    const group = new T.Group();
    const parts = [];

    // Дискообразное сплющенное с боков тело с волнистым клавусом (Mola mola)
    const body = new T.SphereGeometry(1.0, 20, 14);
    body.scale(0.19 * sz, 0.96 * sz, 1.08 * sz);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      let x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const zn = z / (1.08 * sz);
      if (zn < -0.58) {
        const sc = 0.08 * Math.sin((y / sz) * 9.0);
        z += sc * sz;
        x *= 0.65;
      }
      bp.setXYZ(i, x, y, z);
    }
    body.computeVertexNormals();
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => {
      const mottle = Math.sin(z * 4.2 + y * 3.8) * 0.07;
      if (y > 0.25 * sz) c.set(0x525e66).offsetHSL(0, 0, mottle);
      else if (y < -0.22 * sz) c.set(0xdde6ea).offsetHSL(0, 0, mottle * 0.5);
      else c.set(0x8e9da5).offsetHSL(0, 0, mottle);
    });
    parts.push(body);

    // Характерная вытянутая пасть и крупные глаза
    const mouth = new T.TorusGeometry(0.11 * sz, 0.045 * sz, 6, 12);
    OC.geoPrep(mouth);
    OC.paint(mouth, 0x9aa6ad);
    OC.xform(mouth, { p: [0, 0.02 * sz, 1.07 * sz] });
    parts.push(mouth);

    for (const s of [-1, 1]) {
      const eye = new T.SphereGeometry(0.085 * sz, 8, 6);
      OC.geoPrep(eye);
      OC.paint(eye, 0x121820);
      OC.xform(eye, { p: [s * 0.14 * sz, 0.24 * sz, 0.66 * sz] });
      parts.push(eye);
    }

    const baseMesh = new T.Mesh(OC.mergeGeometries(parts), OC._FaunaCtx.creatureMat);
    group.add(baseMesh);

    // Высокий спинной и анальный плавники (машут синхронно, как крылья)
    const finDGeo = new T.ConeGeometry(0.24 * sz, 1.28 * sz, 5);
    finDGeo.scale(0.18, 1.0, 1.0);
    OC.geoPrep(finDGeo);
    OC.paint(finDGeo, 0x455058);
    const dorsalPivot = new T.Group();
    dorsalPivot.position.set(0, 0.85 * sz, -0.35 * sz);
    const dorM = new T.Mesh(finDGeo, OC._FaunaCtx.creatureMat);
    dorM.position.set(0, 0.54 * sz, -0.1 * sz);
    dorM.rotation.x = -0.28;
    dorsalPivot.add(dorM);
    group.add(dorsalPivot);

    const finAGeo = finDGeo.clone();
    const analPivot = new T.Group();
    analPivot.position.set(0, -0.85 * sz, -0.35 * sz);
    const anaM = new T.Mesh(finAGeo, OC._FaunaCtx.creatureMat);
    anaM.position.set(0, -0.54 * sz, -0.1 * sz);
    anaM.rotation.x = Math.PI + 0.28;
    analPivot.add(anaM);
    group.add(analPivot);

    // Боковые округлые грудные плавники
    const pecGeo = new T.SphereGeometry(0.22 * sz, 8, 6);
    pecGeo.scale(0.14, 0.85, 0.85);
    OC.geoPrep(pecGeo);
    OC.paint(pecGeo, 0x76858f);
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pecGeo, OC._FaunaCtx.creatureMat);
      pm.position.set(s * 0.21 * sz, -0.05 * sz, 0.26 * sz);
      pm.rotation.y = s * 0.45;
      group.add(pm);
    }

    group.userData.key = 'ocean_sunfish';
    scene.add(group);

    if (opts.preview) {
      return { key: 'ocean_sunfish', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 0, cz = opts.cz || 0, rad = opts.r || 24, baseY = opts.y || -26;
    let ang = Math.random() * 6.28;
    const _a = new T.Vector3(), _b = new T.Vector3();

    return {
      key: 'ocean_sunfish',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 640) { group.visible = false; return; }
        group.visible = true;
        ang += ((opts.speed || 1.65) / rad) * dt;
        const flap = Math.sin(time * 2.4 + (opts.phase || 0)) * 0.42;
        dorsalPivot.rotation.z = flap;
        analPivot.rotation.z = -flap;

        const x = cx + Math.cos(ang) * rad;
        const z = cz + Math.sin(ang) * rad;
        const x2 = cx + Math.cos(ang + 0.06) * rad;
        const z2 = cz + Math.sin(ang + 0.06) * rad;
        const y = Math.min(-4.2, Math.max((biome ? biome.getHeight(x, z) : -35) + 4.2, baseY + Math.sin(time * 0.55) * 2.2));
        _a.set(x, y, z);
        _b.set(x2, y, z2);
        group.position.copy(_a);
        group.lookAt(_b);
        // Солнечное прогревание — лёгкий крен боком, как у настоящей Mola mola
        group.rotateZ(Math.sin(time * 0.35 + (opts.phase || 0)) * 0.32);

        const cleanClients = ctx ? ctx.cleanClients : null;
        if (cleanClients && y > -38) cleanClients.push(group.position);
      }
    };
  }

  function makeMarineIguana(scene, biome, opts) {
    opts = opts || {};
    const sz = opts.scale || 1.15;
    const group = new T.Group();
    const parts = [];

    // Мощное приземистое тело вулканической ящерицы
    const torso = new T.SphereGeometry(0.24 * sz, 10, 8);
    torso.scale(0.95, 0.72, 2.35);
    OC.geoPrep(torso);
    OC.paint(torso, (x, y, z, c) => {
      const band = Math.sin(z * 9.0) * 0.5 + 0.5;
      c.set(y > 0.02 ? 0x1c1e20 : 0x3b403c).lerp(new T.Color(0x28645c), band * 0.38);
    });
    parts.push(torso);

    // Тупая морда для соскабливания водорослей и соляная «корона» на голове
    const head = new T.SphereGeometry(0.18 * sz, 9, 7);
    head.scale(0.92, 0.76, 1.18);
    OC.geoPrep(head);
    OC.paint(head, (x, y, z, c) => c.set(y > 0.08 * sz ? 0xd8dcd4 : 0x222526));
    OC.xform(head, { p: [0, 0.06 * sz, 0.62 * sz] });
    parts.push(head);

    // Зубчатый спинной гребень шипов
    for (let i = 0; i < 8; i++) {
      const spH = (0.13 - Math.abs(i - 3) * 0.015) * sz;
      const sp = new T.ConeGeometry(0.032 * sz, spH, 4);
      OC.geoPrep(sp);
      OC.paint(sp, i < 3 ? 0x3f8c7a : 0x26292c);
      OC.xform(sp, { r: [-0.25, 0, 0], p: [0, 0.19 * sz, (0.48 - i * 0.14) * sz] });
      parts.push(sp);
    }

    // Четыре когтистые лапы
    for (const sx of [-1, 1]) {
      for (const fz of [0.32, -0.28]) {
        const limb = new T.CylinderGeometry(0.042 * sz, 0.032 * sz, 0.34 * sz, 5);
        OC.geoPrep(limb);
        OC.paint(limb, 0x1e2022);
        OC.xform(limb, { r: [0.35, sx * 0.4, sx * 1.05], p: [sx * 0.24 * sz, -0.06 * sz, fz * sz] });
        parts.push(limb);
      }
    }

    group.add(new T.Mesh(OC.mergeGeometries(parts), OC._FaunaCtx.creatureMat));

    // Сильный плоский плавательный хвост из двух сегментов
    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0.02 * sz, -0.52 * sz);
    const tailGeo = new T.ConeGeometry(0.11 * sz, 1.15 * sz, 6);
    tailGeo.scale(0.45, 1.0, 0.9);
    tailGeo.rotateX(-Math.PI / 2);
    OC.geoPrep(tailGeo);
    OC.paint(tailGeo, (x, y, z, c) => c.set(z < -0.5 * sz ? 0x151719 : 0x2a312f));
    const tailM = new T.Mesh(tailGeo, OC._FaunaCtx.creatureMat);
    tailM.position.set(0, 0, -0.52 * sz);
    tailPivot.add(tailM);
    group.add(tailPivot);

    group.userData.key = 'marine_iguana';
    scene.add(group);

    if (opts.preview) {
      return { key: 'marine_iguana', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || -145, cz = opts.cz || -55, rad = opts.r || 16;
    let ang = Math.random() * 6.28;
    const _a = new T.Vector3(), _b = new T.Vector3();

    return {
      key: 'marine_iguana',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        ang += ((opts.speed || 1.45) / rad) * dt;
        const x = cx + Math.cos(ang) * rad;
        const z = cz + Math.sin(ang) * rad;
        const x2 = cx + Math.cos(ang + 0.08) * rad;
        const z2 = cz + Math.sin(ang + 0.08) * rad;
        const fl = biome ? biome.getHeight(x, z) : -35;
        // Чередует пастьбу у дна с подплывом к поверхности за воздухом
        const cycle = Math.sin(time * 0.25 + (opts.phase || 0));
        const targetY = cycle > 0.45 ? -1.4 : Math.max(fl + 0.42, (opts.y || -6.5) + Math.sin(time * 0.9) * 1.1);
        const y = Math.min(-0.65, targetY);
        const y2 = Math.min(-0.65, Math.max((biome ? biome.getHeight(x2, z2) : -35) + 0.42, y));
        _a.set(x, y, z);
        _b.set(x2, y2, z2);
        group.position.copy(_a);
        group.lookAt(_b);
        tailPivot.rotation.y = Math.sin(time * 7.2 + (opts.phase || 0)) * 0.48;
      }
    };
  }

  function makeGalapagosPenguin(scene, biome, opts, emitSplash) {
    opts = opts || {};
    const sz = opts.scale || 1.05;
    const group = new T.Group();
    const parts = [];

    const body = new T.SphereGeometry(0.21 * sz, 12, 9);
    body.scale(0.86, 0.82, 2.05);
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => {
      // Белое брюхо, чёрная спинка и белая дуга вдоль боков шеи
      const horseshoe = Math.abs(x) > 0.1 * sz && y > -0.02 && y < 0.09 * sz && z > 0.06 * sz;
      if (horseshoe || y < -0.02 * sz) c.set(0xf2f6f9);
      else c.set(0x161b22);
    });
    parts.push(body);

    const head = new T.SphereGeometry(0.145 * sz, 10, 8);
    head.scale(0.88, 0.9, 1.05);
    OC.geoPrep(head);
    OC.paint(head, (x, y, z, c) => {
      if (y < -0.04 * sz || (Math.abs(x) > 0.08 * sz && y < 0.04 * sz)) c.set(0xf2f6f9);
      else c.set(0x14181e);
    });
    OC.xform(head, { p: [0, 0.03 * sz, 0.44 * sz] });
    parts.push(head);

    const beak = new T.ConeGeometry(0.042 * sz, 0.16 * sz, 6);
    beak.rotateX(Math.PI / 2);
    OC.geoPrep(beak);
    OC.paint(beak, (x, y, z, c) => c.set(y < 0 ? 0xf29688 : 0x202226));
    OC.xform(beak, { p: [0, 0.01 * sz, 0.61 * sz] });
    parts.push(beak);

    group.add(new T.Mesh(OC.mergeGeometries(parts), OC._FaunaCtx.creatureMat));

    const wings = [];
    for (const s of [-1, 1]) {
      const wPivot = new T.Group();
      wPivot.position.set(s * 0.17 * sz, 0.01 * sz, 0.16 * sz);
      const wingGeo = new T.ConeGeometry(0.075 * sz, 0.34 * sz, 5);
      wingGeo.scale(0.32, 1.0, 0.88);
      wingGeo.rotateZ(-s * Math.PI / 2);
      OC.geoPrep(wingGeo);
      OC.paint(wingGeo, 0x1a2028);
      const wm = new T.Mesh(wingGeo, OC._FaunaCtx.creatureMat);
      wm.position.set(s * 0.16 * sz, 0, -0.05 * sz);
      wPivot.add(wm);
      group.add(wPivot);
      wings.push(wPivot);
    }

    group.userData.key = 'galapagos_penguin';
    scene.add(group);

    if (opts.preview) {
      return { key: 'galapagos_penguin', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 0, cz = opts.cz || 0, rad = opts.r || 19, baseY = opts.y || -4.5;
    let ang = Math.random() * 6.28;
    let prevY = baseY;
    const _a = new T.Vector3(), _b = new T.Vector3();

    return {
      key: 'galapagos_penguin',
      isPorpoising: () => group.position.y > -0.15,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 560) { group.visible = false; return; }
        group.visible = true;
        ang += ((opts.speed || 4.8) / rad) * dt;
        const waveY = Math.sin(time * 1.15 + (opts.phase || 0));
        const x = cx + Math.cos(ang) * rad;
        const z = cz + Math.sin(ang) * rad;
        const x2 = cx + Math.cos(ang + 0.08) * rad;
        const z2 = cz + Math.sin(ang + 0.08) * rad;
        const y = Math.max((biome ? biome.getHeight(x, z) : -35) + 0.8, baseY + waveY * 4.2 + (waveY > 0.72 ? 2.2 : 0));
        const y2 = Math.max((biome ? biome.getHeight(x2, z2) : -35) + 0.8, baseY + Math.sin((time + 0.08) * 1.15 + (opts.phase || 0)) * 4.2);
        _a.set(x, y, z);
        _b.set(x2, y2, z2);
        group.position.copy(_a);
        group.lookAt(_b);
        const flap = Math.sin(time * 9.5 + (opts.phase || 0)) * 0.62;
        wings[0].rotation.z = flap;
        wings[1].rotation.z = -flap;
        if (((prevY < 0 && y >= 0) || (prevY >= 0 && y < 0)) && emitSplash) emitSplash(_a, 0.35);
        prevY = y;
      }
    };
  }

  function makeMobulaRay(scene, biome, opts, emitSplash) {
    opts = opts || {};
    const preview = !!opts.preview;
    const count = preview ? 1 : (opts.count || 5);
    const group = new T.Group();
    const rays = [];

    function buildSingleMobula() {
      const rRoot = new T.Group();
      const parts = [];

      const disk = new T.SphereGeometry(0.65, 12, 8);
      disk.scale(0.82, 0.14, 0.96);
      OC.geoPrep(disk);
      OC.paint(disk, (x, y, z, c) => c.set(y > 0.0 ? 0x1e2b42 : 0xedf3f8));
      parts.push(disk);

      // Головные плавники-рожки (Mobula munkiana)
      for (const s of [-1, 1]) {
        const lobe = new T.ConeGeometry(0.06, 0.32, 5);
        lobe.rotateX(Math.PI / 2);
        OC.geoPrep(lobe);
        OC.paint(lobe, 0x253550);
        OC.xform(lobe, { r: [0, s * 0.2, 0], p: [s * 0.18, 0, 0.62] });
        parts.push(lobe);
      }

      const tail = new T.ConeGeometry(0.032, 0.95, 5);
      tail.rotateX(-Math.PI / 2);
      OC.geoPrep(tail);
      OC.paint(tail, 0x1b2638);
      OC.xform(tail, { p: [0, 0, -0.95] });
      parts.push(tail);

      rRoot.add(new T.Mesh(OC.mergeGeometries(parts), OC._FaunaCtx.creatureMat));

      const wings = [];
      for (const s of [-1, 1]) {
        const wP = new T.Group();
        wP.position.set(s * 0.42, 0, 0.05);
        const wG = new T.ConeGeometry(0.38, 1.08, 4);
        wG.scale(1.0, 0.14, 0.95);
        wG.rotateZ(-s * Math.PI / 2);
        OC.geoPrep(wG);
        OC.paint(wG, (x, y, z, c) => c.set(y > 0.0 ? 0x24334d : 0xf0f6fa));
        const wm = new T.Mesh(wG, OC._FaunaCtx.creatureMat);
        wm.position.set(s * 0.48, 0, -0.08);
        wP.add(wm);
        rRoot.add(wP);
        wings.push(wP);
      }
      rRoot.userData.key = 'mobula_ray';
      return { root: rRoot, wingL: wings[0], wingR: wings[1], phase: Math.random() * 6.28 };
    }

    for (let i = 0; i < count; i++) {
      const m = buildSingleMobula();
      const row = Math.ceil(i / 2);
      const side = i === 0 ? 0 : (i % 2 === 1 ? -1 : 1);
      m.ox = side * row * 2.4;
      m.oz = -row * 1.9;
      m.oy = (i % 2 === 0 ? 0.35 : -0.35);
      group.add(m.root);
      rays.push(m);
    }

    group.userData.key = 'mobula_ray';
    scene.add(group);

    if (preview) {
      rays[0].wingL.rotation.z = -0.18;
      rays[0].wingR.rotation.z = 0.18;
      return { key: 'mobula_ray', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 65, cz = opts.cz || -38, rad = opts.r || 42, baseY = opts.y || -18;
    let ang = Math.random() * 6.28;
    let prevY = baseY;
    const _a = new T.Vector3(), _b = new T.Vector3();

    return {
      key: 'mobula_ray',
      isPorpoising: () => group.position.y > -0.2,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 680) { group.visible = false; return; }
        group.visible = true;
        ang += ((opts.speed || 4.2) / rad) * dt;
        const x = cx + Math.cos(ang) * rad;
        const z = cz + Math.sin(ang) * rad;
        const x2 = cx + Math.cos(ang + 0.06) * rad;
        const z2 = cz + Math.sin(ang + 0.06) * rad;
        const y = Math.max((biome ? biome.getHeight(x, z) : -35) + 3.2, baseY + Math.sin(time * 0.48) * 5.2);
        const y2 = Math.max((biome ? biome.getHeight(x2, z2) : -35) + 3.2, baseY + Math.sin((time + 0.06) * 0.48) * 5.2);
        _a.set(x, y, z);
        _b.set(x2, y2, z2);
        group.position.copy(_a);
        group.lookAt(_b);
        for (let i = 0; i < rays.length; i++) {
          const r = rays[i];
          r.root.position.set(r.ox, r.oy + Math.sin(time * 1.4 + i) * 0.25, r.oz);
          const fl = Math.sin(time * 3.1 + r.phase) * 0.36;
          r.wingL.rotation.z = fl;
          r.wingR.rotation.z = -fl;
        }
        if (((prevY < 0 && y >= 0) || (prevY >= 0 && y < 0)) && emitSplash) emitSplash(_a, 0.42);
        prevY = y;
      }
    };
  }

  /* ---------- Амазонский розовый дельфин боуто (Inia geoffrensis) ---------- */

  function makeDarwinsArch(scene, biome, opts) {
    opts = opts || {};
    const ax = opts.x || 0, az = opts.z || 0;
    const preview = !!opts.preview;
    const group = new T.Group();
    const parts = [];

    const cBasalt = new T.Color(0x1f1e22);
    const cTuff = new T.Color(0x3a3734);
    const cZone = new T.Color(0x526444);

    // Монументальная сводчатая вулканическая арка Дарвина из базальтовых сегментов (свободный проход под сводом)
    const spanX = 48;
    const nSeg = 18;
    for (let i = 0; i <= nSeg; i++) {
      const u = i / nSeg;
      const a = u * Math.PI;
      const sx = -Math.cos(a) * (spanX * 0.5);
      const sy = -22.5 + Math.sin(a) * 28.5; // от -22.5 м до +6.0 м над водой
      const thick = 3.8 + (1 - Math.sin(a)) * 2.6 + Math.sin(i * 1.9) * 0.5;
      const seg = new T.DodecahedronGeometry(thick, 1);
      seg.scale(1.15, 1.32, 1.38);
      const sp = seg.attributes.position;
      for (let v = 0; v < sp.count; v++) {
        const vx = sp.getX(v), vy = sp.getY(v), vz = sp.getZ(v);
        const rug = 1 + 0.16 * Math.sin(vx * 1.2 + vy * 0.9) * Math.cos(vz * 1.1);
        sp.setXYZ(v, vx * rug, vy * rug, vz * rug);
      }
      seg.computeVertexNormals();
      OC.geoPrep(seg);
      OC.paint(seg, (px, py, pz, col) => {
        const wy = py + sy;
        col.copy(cBasalt).lerp(cTuff, wy > -2.5 ? 0.55 : 0.18);
        if (wy > -3.5 && wy < 1.2) col.lerp(cZone, 0.32);
      });
      OC.xform(seg, { r: [i * 0.25, i * 0.4, 0], p: [sx, sy, Math.sin(i * 0.9) * 1.1] });
      parts.push(seg);
    }

    const archGeo = OC.mergeGeometries(parts);
    const archMesh = new T.Mesh(archGeo, OC._FaunaCtx.creatureMat);
    group.add(archMesh);
    group.userData.key = 'darwins_arch';
    if (!preview) group.position.set(ax, 0, az);
    else group.scale.setScalar(0.08);
    scene.add(group);

    return {
      key: 'darwins_arch',
      getPosition: () => group.position,
      update() {}
    };
  }

  function makeFumaroleVents(scene, biome, opts) {
    opts = opts || {};
    const vx = opts.x || -140, vz = opts.z || -80;
    const vy = opts.y !== undefined ? opts.y : (biome ? biome.getHeight(vx, vz) : -12) + 0.8;
    const N = 95;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const ph = new Float32Array(N);
    const rng = OC.mulberry32(Math.abs(Math.round(vx * 17 + vz * 31)) + 77);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rng() - 0.5) * 4.5;
      pos[i * 3 + 1] = rng() * 14.0;
      pos[i * 3 + 2] = (rng() - 0.5) * 4.5;
      ph[i] = rng() * 6.28;
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const mat = new T.PointsMaterial({
      color: 0xdff8ff,
      size: 0.42,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    const pts = new T.Points(geo, mat);
    pts.position.set(vx, vy, vz);
    pts.userData.key = 'volcanic_fumarole';
    scene.add(pts);

    return {
      key: 'volcanic_fumarole',
      getPosition: () => pts.position,
      update(dt, time, camPos) {
        if (Math.hypot(vx - camPos.x, vz - camPos.z) > 480) { pts.visible = false; return; }
        pts.visible = true;
        const arr = geo.attributes.position.array;
        for (let i = 0; i < N; i++) {
          let y = arr[i * 3 + 1] + dt * (2.6 + (i % 5) * 0.45);
          if (y > 14.0 || vy + y > -0.4) y = 0.05;
          arr[i * 3 + 1] = y;
          arr[i * 3] += Math.sin(time * 2.5 + ph[i]) * dt * 0.22;
        }
        geo.attributes.position.needsUpdate = true;
      }
    };
  }

  /* ---------- Сборка фауны по экологическому плану биома (biome.faunaPlan) ---------- */

  OC._FaunaBuilders.makeOceanSunfish = makeOceanSunfish;
  OC._FaunaBuilders.makeMarineIguana = makeMarineIguana;
  OC._FaunaBuilders.makeGalapagosPenguin = makeGalapagosPenguin;
  OC._FaunaBuilders.makeMobulaRay = makeMobulaRay;
  OC._FaunaBuilders.makeDarwinsArch = makeDarwinsArch;
  OC._FaunaBuilders.makeFumaroleVents = makeFumaroleVents;
})(window.OC);
