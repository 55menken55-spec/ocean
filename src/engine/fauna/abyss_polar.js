/* ================= ФАУНА: АРКТИКА, ПАЛАУ, АБИССАЛЬ, СОЛЯНОЙ БАССЕЙН И СЕНОТЫ ================= */
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
  function makeBeluga(scene, biome, opts, onSplash) {
    const len = opts.len || 4.8;
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 16, 12);
    body.scale(len * 0.145, len * 0.145, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5);
      const taper = t < 0 ? (1 - 0.78 * Math.pow(-t, 1.35)) : (1 - 0.25 * Math.pow(t, 2.2));
      bp.setXYZ(i, x * taper, y * taper, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => c.set(y > -0.1 ? 0xf2f7fa : 0xdde8ef));
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    // Характерный лобный выступ «мелон»
    const melon = new T.SphereGeometry(len * 0.088, 10, 8);
    melon.scale(0.95, 0.92, 1.15);
    OC.geoPrep(melon);
    OC.paint(melon, 0xf6fafd);
    const mMesh = new T.Mesh(melon, OC._FaunaCtx.creatureMat);
    mMesh.position.set(0, len * 0.045, len * 0.36);
    group.add(mMesh);

    const pec = new T.SphereGeometry(1, 8, 6);
    pec.scale(0.55, 0.08, 0.35);
    OC.geoPrep(pec);
    OC.paint(pec, 0xe8f0f5);
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, OC._FaunaCtx.creatureMat);
      pm.position.set(s * 0.65, -0.22, 0.75);
      pm.rotation.y = -s * 0.35;
      pm.rotation.z = -s * 0.22;
      group.add(pm);
    }

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.45);
    const fluke = new T.ConeGeometry(0.75, 0.85, 4);
    fluke.scale(1.4, 1, 0.16);
    fluke.rotateX(Math.PI / 2);
    OC.geoPrep(fluke);
    OC.paint(fluke, 0xd8e4ec);
    const fkM = new T.Mesh(fluke, OC._FaunaCtx.creatureMat);
    fkM.position.set(0, 0, -0.42);
    tailPivot.add(fkM);
    group.add(tailPivot);

    group.scale.setScalar(opts.scale || 1.0);
    group.userData.key = 'beluga';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 40, prevY = -5;
    let porpoising = false;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'beluga',
      isPorpoising: () => porpoising,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 640) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 4.8) / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r;
        const az = opts.cz + Math.sin(ang) * opts.r + Math.sin(ang * 2.0) * 14;
        const bx = opts.cx + Math.cos(ang + 0.1) * opts.r;
        const bz = opts.cz + Math.sin(ang + 0.1) * opts.r + Math.sin((ang + 0.1) * 2.0) * 14;
        const cyc = t % 28.0;
        const clearIce = !biome.getIceMaskAt || biome.getIceMaskAt(ax, az) < 0.35;
        let ay, by;
        if (clearIce && cyc > 22.0 && cyc < 25.2) {
          const u = (cyc - 22.0) / 3.2;
          const arc = Math.sin(u * Math.PI);
          ay = OC.lerp(-2.5, 1.35, arc);
          by = OC.lerp(-2.5, 1.35, Math.sin(Math.min(1, u + 0.08) * Math.PI));
        } else {
          const breath = Math.sin(t * 0.28) > 0.78 ? 1.0 : 0.0;
          ay = Math.min(-1.5, Math.max(OC.lerp(opts.y + Math.sin(t * 0.45) * 3.0, -1.6, breath), biome.getHeight(ax, az) + 2.8));
          by = Math.min(-1.5, Math.max(OC.lerp(opts.y + Math.sin(t * 0.45 + 0.15) * 3.0, -1.6, breath), biome.getHeight(bx, bz) + 2.8));
        }
        a.set(ax, ay, az);
        b.set(bx, by, bz);
        group.position.copy(a);
        group.lookAt(b);
        porpoising = a.y > -0.25;
        if (onSplash) {
          if (prevY <= 0.05 && a.y > 0.05) onSplash(a, 0.38);
          else if (prevY >= 0.05 && a.y < 0.05) onSplash(a, 0.46);
        }
        prevY = a.y;
        tailPivot.rotation.x = Math.sin(time * 2.4 + t) * 0.36;
      }
    };
  }

  /* ---------- Нарвал (Monodon monoceros) с длинным спиральным бивнем ---------- */
  function makeNarwhal(scene, biome, opts) {
    const len = opts.len || 5.0;
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 16, 12);
    body.scale(len * 0.135, len * 0.135, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5);
      const taper = t < 0 ? (1 - 0.80 * Math.pow(-t, 1.35)) : (1 - 0.28 * Math.pow(t, 2.2));
      bp.setXYZ(i, x * taper, y * taper, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => {
      if (y < -0.1) { c.set(0xe4edf2); return; }
      const spot = Math.sin(x * 5.2 + z * 3.1) * Math.cos(z * 4.4);
      c.set(0x4c5d6b).lerp(new T.Color(0xd2dee6), spot > 0.22 ? 0.72 : 0.15);
    });
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    // Знаменитый спиральный бивень-клык нарвала (2.4 м)
    const tusk = new T.ConeGeometry(0.068, 2.5, 8, 6);
    tusk.rotateX(Math.PI / 2);
    const tp = tusk.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const vx = tp.getX(i), vy = tp.getY(i), vz = tp.getZ(i);
      const ang = vz * 8.0;
      const rib = 1 + 0.12 * Math.sin(ang + Math.atan2(vy, vx) * 2.0);
      tp.setXYZ(i, vx * rib, vy * rib, vz);
    }
    OC.geoPrep(tusk);
    tusk.computeVertexNormals();
    OC.paint(tusk, (x, y, z, c) => c.set(0xdfe2d2).lerp(new T.Color(0xf8f9f0), OC.clamp(z * 0.35 + 0.5, 0, 1)));
    const tuskM = new T.Mesh(tusk, OC._FaunaCtx.creatureMat);
    tuskM.position.set(-0.04, 0.04, len * 0.46 + 1.15);
    group.add(tuskM);

    const pec = new T.SphereGeometry(1, 8, 6);
    pec.scale(0.55, 0.08, 0.32);
    OC.geoPrep(pec);
    OC.paint(pec, 0x3f4e5c);
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, OC._FaunaCtx.creatureMat);
      pm.position.set(s * 0.62, -0.2, 0.8);
      pm.rotation.y = -s * 0.35;
      pm.rotation.z = -s * 0.2;
      group.add(pm);
    }

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.45);
    const fluke = new T.ConeGeometry(0.82, 0.9, 4);
    fluke.scale(1.4, 1, 0.16);
    fluke.rotateX(Math.PI / 2);
    OC.geoPrep(fluke);
    OC.paint(fluke, 0x3b4956);
    const fkM = new T.Mesh(fluke, OC._FaunaCtx.creatureMat);
    fkM.position.set(0, 0, -0.45);
    tailPivot.add(fkM);
    group.add(tailPivot);

    group.scale.setScalar(opts.scale || 1.0);
    group.userData.key = 'narwhal';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 40;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'narwhal',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 680) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 4.6) / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r;
        const az = opts.cz + Math.sin(ang) * opts.r * 1.3;
        const bx = opts.cx + Math.cos(ang + 0.09) * opts.r;
        const bz = opts.cz + Math.sin(ang + 0.09) * opts.r * 1.3;
        const ay = Math.max(opts.y + Math.sin(t * 0.24) * 7.0, biome.getHeight(ax, az) + 3.5);
        const by = Math.max(opts.y + Math.sin(t * 0.24 + 0.14) * 7.0, biome.getHeight(bx, bz) + 3.5);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        tailPivot.rotation.x = Math.sin(time * 2.2 + t) * 0.34;
      }
    };
  }

  /* ---------- Волосистая цианея (Cyanea capillata — гигантская арктическая медуза) ---------- */
  function makeArcticJelly(scene, opts) {
    const group = new T.Group();
    const bellGeo = new T.SphereGeometry(1.15, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
    OC.geoPrep(bellGeo);
    const bellMat = new T.MeshStandardMaterial({
      color: 0xc84e24,
      emissive: new T.Color(0x88240c),
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.78,
      roughness: 0.28,
      side: T.DoubleSide
    });
    group.add(new T.Mesh(bellGeo, bellMat));

    const tentMat = new T.MeshBasicMaterial({ color: 0xff9a44, transparent: true, opacity: 0.62 });
    const tents = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 0.35 + (i % 3) * 0.24;
      const pts = [];
      for (let s = 0; s <= 5; s++) {
        const u = s / 5;
        pts.push(new T.Vector3(Math.cos(a) * r * (1 + u * 0.4), -u * 3.8, Math.sin(a) * r * (1 + u * 0.4)));
      }
      const tg = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.032, 4, false);
      const tm = new T.Mesh(tg, tentMat);
      group.add(tm);
      tents.push(tm);
    }

    group.scale.setScalar(opts.scale || 1.25);
    group.position.set(opts.cx, opts.y, opts.cz);
    group.userData.key = 'jelly_arctic';
    scene.add(group);

    const ph = Math.random() * 6.28;
    return {
      key: 'jelly_arctic',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 460) { group.visible = false; return; }
        group.visible = true;
        const pulse = Math.sin(time * 1.45 + ph);
        group.position.x = opts.cx + Math.sin(time * 0.16 + ph) * 8;
        group.position.z = opts.cz + Math.cos(time * 0.14 + ph) * 8;
        group.position.y = opts.y + Math.sin(time * 0.28 + ph) * (opts.amp || 2.8) + pulse * 0.3;
        group.scale.set(
          (opts.scale || 1.25) * (1 - pulse * 0.08),
          (opts.scale || 1.25) * (1 + pulse * 0.11),
          (opts.scale || 1.25) * (1 - pulse * 0.08)
        );
        for (let i = 0; i < tents.length; i++) {
          tents[i].rotation.z = Math.sin(time * 1.2 + i * 0.5) * 0.09;
        }
      }
    };
  }

  /* ---------- Морской ангел (Clione limacina) — светящийся арктический крылоногий моллюск ---------- */
  function makeClione(scene, opts) {
    const group = new T.Group();
    const n = opts.n || 10;
    const bodyMat = new T.MeshBasicMaterial({ color: 0xff8ed4, transparent: true, opacity: 0.72 });
    const coreMat = new T.MeshBasicMaterial({ color: 0xff5a18 });
    const wingGeo = new T.SphereGeometry(0.18, 6, 4);
    wingGeo.scale(1.6, 0.14, 0.8);
    const bodyGeo = new T.ConeGeometry(0.14, 0.62, 8);
    bodyGeo.rotateX(Math.PI);
    const coreGeo = new T.SphereGeometry(0.08, 6, 4);

    const units = [];
    const rng = OC.mulberry32(Math.abs(Math.round(opts.cx * 17 + opts.cz * 31)) + 9);
    for (let i = 0; i < n; i++) {
      const u = new T.Group();
      u.add(new T.Mesh(bodyGeo, bodyMat));
      const cm = new T.Mesh(coreGeo, coreMat);
      cm.position.y = 0.08;
      u.add(cm);
      const lw = new T.Mesh(wingGeo, bodyMat);
      lw.position.set(-0.16, 0.1, 0);
      const rw = new T.Mesh(wingGeo, bodyMat);
      rw.position.set(0.16, 0.1, 0);
      u.add(lw, rw);
      u.scale.setScalar(opts.singlePreview ? 1.5 : OC.lerp(0.85, 1.35, rng()));
      u.userData.key = 'clione_angel';
      group.add(u);
      units.push({
        u, lw, rw, ph: rng() * 6.28,
        ox: opts.singlePreview ? 0 : (rng() - 0.5) * 14,
        oy: opts.singlePreview ? 0 : (rng() - 0.5) * 8,
        oz: opts.singlePreview ? 0 : (rng() - 0.5) * 14
      });
    }
    group.position.set(opts.cx, opts.y, opts.cz);
    group.userData.key = 'clione_angel';
    scene.add(group);

    return {
      key: 'clione_angel',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        for (let i = 0; i < units.length; i++) {
          const it = units[i];
          const flap = Math.sin(time * 5.2 + it.ph) * 0.72;
          it.lw.rotation.z = flap;
          it.rw.rotation.z = -flap;
          it.u.position.set(
            it.ox + Math.sin(time * 0.45 + it.ph) * 2.4,
            it.oy + Math.cos(time * 0.55 + it.ph) * 1.6,
            it.oz + Math.cos(time * 0.42 + it.ph) * 2.4
          );
          it.u.rotation.y = time * 0.35 + it.ph;
        }
      }
    };
  }

  /* ---------- Затонувшее научно-грузовое судно «SS Maru» (Искусственный риф) ---------- */
  function makeShipwreck(scene, biome, opts) {
    const len = opts.len || 66;
    const beam = opts.beam || 10.6;
    const hullH = opts.hullH || 6.6;
    const group = new T.Group();
    const parts = [];

    function paintSteel(g, rustBias) {
      OC.geoPrep(g);
      const rb = rustBias || 0.45;
      OC.paint(g, (x, y, z, c) => {
        const rust = Math.sin(x * 0.65 + y * 1.1 + z * 0.32) * Math.cos(z * 0.48 - y * 0.8) * 0.5 + 0.5;
        const moss = Math.sin(x * 1.3 - z * 0.55) * 0.5 + 0.5;
        c.set(0x28363c).lerp(new T.Color(0x8c3c1e), OC.clamp(rust * rb + 0.15, 0, 0.85));
        if (y > 1.0 && moss > 0.55) c.lerp(new T.Color(0x42664a), 0.36);
      });
      parts.push(g);
      return g;
    }

    // 1. Основной корпус судна с острым форштевнем (нос +Z), поджатой кормой (-Z) и развалом бортов
    const hullGeo = new T.BoxGeometry(beam, hullH, len, 8, 5, 22);
    const hp = hullGeo.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
      const u = OC.clamp(z / (len * 0.5), -1, 1); // -1 корма .. +1 нос
      const v = OC.clamp((y + hullH * 0.5) / hullH, 0, 1); // 0 киль .. 1 палуба
      let wScale = 1.0;
      if (u > 0.28) {
        const bt = OC.clamp((u - 0.28) / 0.72, 0, 1);
        wScale = Math.max(0.03, Math.pow(Math.max(0, 1 - bt), 1.45));
      } else if (u < -0.58) {
        const st = OC.clamp((-u - 0.58) / 0.42, 0, 1);
        wScale = 1 - 0.58 * st * st;
      }
      const flare = 0.62 + 0.38 * Math.pow(v, 0.7);
      // Седловатость (sheer): нос и корма чуть приподняты, центр палубы немного вогнут
      const sheer = (u > 0.3 ? Math.pow((u - 0.3) / 0.7, 2) * 1.85 : 0) + (u < -0.5 ? Math.pow((-u - 0.5) / 0.5, 2) * 0.85 : 0);
      // Углубление открытых грузовых трюмов в мидшипе сверху
      let deckDip = 0;
      if (v > 0.85 && u > -0.18 && u < 0.46 && Math.abs(x) < beam * 0.32) {
        deckDip = -2.2;
      }
      x *= wScale * flare;
      y += sheer * v + deckDip;
      hp.setXYZ(i, x, y, z);
    }
    hullGeo.computeVertexNormals();
    paintSteel(hullGeo, 0.58);

    // 2. Фальшборт и комингс грузового трюма
    for (const s of [-1, 1]) {
      const bulwark = new T.BoxGeometry(0.45, 1.15, len * 0.62, 1, 1, 8);
      OC.xform(paintSteel(bulwark, 0.65), { p: [s * (beam * 0.47), hullH * 0.5 + 0.45, -len * 0.04] });
    }
    const coaming = new T.BoxGeometry(beam * 0.66, 0.9, len * 0.28);
    OC.xform(paintSteel(coaming, 0.72), { p: [0, hullH * 0.5 + 0.35, len * 0.14] });

    // 3. Кормовая капитанская надстройка (мостик, открытые иллюминаторы, крыша)
    const bridgeBase = new T.BoxGeometry(beam * 0.72, 3.8, len * 0.22);
    OC.xform(paintSteel(bridgeBase, 0.38), { p: [0, hullH * 0.5 + 1.85, -len * 0.22] });

    const wheelhouse = new T.BoxGeometry(beam * 0.56, 2.7, len * 0.12);
    OC.xform(paintSteel(wheelhouse, 0.34), { p: [0, hullH * 0.5 + 4.9, -len * 0.20] });

    const wheelRim = new T.TorusGeometry(0.82, 0.09, 6, 12);
    OC.xform(paintSteel(wheelRim, 0.25), { p: [0, hullH * 0.5 + 5.1, -len * 0.135] });

    // 4. Проржавевшая дымовая труба
    const funnel = new T.CylinderGeometry(1.15, 1.38, 6.2, 12);
    OC.xform(paintSteel(funnel, 0.78), { r: [-0.22, 0, 0.08], p: [0, hullH * 0.5 + 6.4, -len * 0.27] });

    // 5. Носовая и кормовая мачты с реями, грузовыми стрелами и вантами
    const masts = [
      { z: len * 0.29, h: 19.5, r: 0.36 },
      { z: -len * 0.08, h: 16.0, r: 0.30 }
    ];
    for (const m of masts) {
      const pole = new T.CylinderGeometry(m.r * 0.45, m.r, m.h, 8);
      OC.xform(paintSteel(pole, 0.55), { r: [0.06, 0, 0.05], p: [0, hullH * 0.5 + m.h * 0.5, m.z] });
      const yard = new T.CylinderGeometry(0.11, 0.14, 9.6, 6);
      OC.xform(paintSteel(yard, 0.62), { r: [0, 0, Math.PI / 2 + 0.08], p: [0, hullH * 0.5 + m.h * 0.68, m.z] });
      const derrick = new T.CylinderGeometry(0.12, 0.18, 12.5, 6);
      OC.xform(paintSteel(derrick, 0.58), { r: [-0.95, 0.24, 0], p: [0.4, hullH * 0.5 + 4.6, m.z - 3.6] });
      for (const s of [-1, 1]) {
        const stay = new T.CylinderGeometry(0.04, 0.04, m.h * 0.9, 4);
        OC.xform(paintSteel(stay, 0.4), { r: [0, 0, s * 0.28], p: [s * 2.4, hullH * 0.5 + m.h * 0.42, m.z] });
      }
    }

    // 6. Массивный бронзовый 4-лопастной гребной винт и перо руля на корме
    const propMat = new T.Color(0x887644);
    const hub = new T.CylinderGeometry(0.45, 0.52, 1.1, 8);
    hub.rotateX(Math.PI / 2);
    OC.geoPrep(hub); OC.paint(hub, propMat);
    OC.xform(hub, { p: [0, -hullH * 0.28, -len * 0.48] });
    parts.push(hub);
    for (let b = 0; b < 4; b++) {
      const ba = (b / 4) * Math.PI * 2;
      const blade = new T.SphereGeometry(1, 8, 5);
      blade.scale(0.55, 1.35, 0.12);
      OC.geoPrep(blade);
      OC.paint(blade, (x, y, z, c) => c.copy(propMat).lerp(new T.Color(0x4b745d), 0.32));
      OC.xform(blade, { r: [0.35, 0, ba], p: [Math.sin(ba) * 1.05, -hullH * 0.28 + Math.cos(ba) * 1.05, -len * 0.48] });
      parts.push(blade);
    }
    const rudder = new T.BoxGeometry(0.32, 3.4, 2.2);
    OC.xform(paintSteel(rudder, 0.65), { p: [0, -hullH * 0.24, -len * 0.505] });

    // 7. Живые кораллово-губковые наросты прямо на остове корабля
    const rng = OC.mulberry32(8421);
    const encColors = [0xe86e44, 0xf2b42e, 0x3eb494, 0xd85a8a];
    for (let i = 0; i < 18; i++) {
      const cz = (rng() - 0.5) * len * 0.76;
      const cx = (rng() < 0.5 ? -1 : 1) * beam * OC.lerp(0.26, 0.46, rng());
      const cy = hullH * 0.5 + OC.lerp(0.1, 1.4, rng());
      const r = OC.lerp(0.45, 1.15, rng());
      const sponge = new T.SphereGeometry(r, 7, 5);
      sponge.scale(1.1, 0.72, 1.0);
      OC.geoPrep(sponge);
      OC.paint(sponge, encColors[i % encColors.length]);
      OC.xform(sponge, { p: [cx, cy, cz] });
      parts.push(sponge);
    }

    const merged = OC.mergeGeometries(parts);
    const mesh = new T.Mesh(merged, OC._FaunaCtx.creatureMat);
    group.add(mesh);

    const floorY = biome && biome.getHeight ? biome.getHeight(opts.x || 0, opts.z || 0) : -24;
    group.position.set(opts.x || 0, floorY + (opts.yOffset !== undefined ? opts.yOffset : 2.1), opts.z || 0);
    group.rotation.set(opts.pitch !== undefined ? opts.pitch : -0.05, opts.yaw !== undefined ? opts.yaw : 0.65, opts.roll !== undefined ? opts.roll : 0.34);
    group.userData.key = 'shipwreck';
    scene.add(group);

    return {
      key: 'shipwreck',
      isWreck: true,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        group.visible = Math.hypot(group.position.x - camPos.x, group.position.z - camPos.z) < 920;
      }
    };
  }

  /* ---------- Гигантская акула-молот (Sphyrna mokarran) ---------- */

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

  OC._FaunaBuilders.makeAnglerfish = makeAnglerfish;
  OC._FaunaBuilders.makeAbyssalSquid = makeAbyssalSquid;
  OC._FaunaBuilders.makeDumboOctopus = makeDumboOctopus;
  OC._FaunaBuilders.makeBeluga = makeBeluga;
  OC._FaunaBuilders.makeNarwhal = makeNarwhal;
  OC._FaunaBuilders.makeArcticJelly = makeArcticJelly;
  OC._FaunaBuilders.makeClione = makeClione;
  OC._FaunaBuilders.makeShipwreck = makeShipwreck;
  OC._FaunaBuilders.makeVentPlume = makeVentPlume;
  OC._FaunaBuilders.makeWhaleFall = makeWhaleFall;
  OC._FaunaBuilders.makeHadalSnailfish = makeHadalSnailfish;
  OC._FaunaBuilders.makeSeaPig = makeSeaPig;
  OC._FaunaBuilders.makeBrineLake = makeBrineLake;
  OC._FaunaBuilders.makeSiphonophore = makeSiphonophore;
  OC._FaunaBuilders.makeOarfish = makeOarfish;
  OC._FaunaBuilders.makeChimaera = makeChimaera;
  OC._FaunaBuilders.makeAriadneGuideline = makeAriadneGuideline;
  OC._FaunaBuilders.makeHaloclineLayer = makeHaloclineLayer;
  OC._FaunaBuilders.makeCaveRemipede = makeCaveRemipede;
  OC._FaunaBuilders.makeBlindBrotula = makeBlindBrotula;
})(window.OC);
