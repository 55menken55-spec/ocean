/* ================= ФАУНА: КИТЫ И ЛАСТОНОГИЕ ================= */
/* Горбатый кит (выпрыги, хвост, пение) и морской лев с выпрыгиванием у поверхности. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

  function makeHumpbackWhale(scene, biome, opts, onSplash) {
    const len = 15.5;
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 20, 14);
    body.scale(len * 0.15, len * 0.14, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5);
      const taper = t < 0 ? (1 - 0.82 * Math.pow(-t, 1.4)) : (1 - 0.25 * Math.pow(t, 2.2));
      bp.setXYZ(i, x * taper, y * taper, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => c.set(y > -0.15 ? 0x1d2b3a : 0xdce6ec));
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    // Длинные белые грудные плавники горбача (до трети длины тела)
    const pec = new T.SphereGeometry(1, 10, 8);
    pec.scale(2.9, 0.14, 0.72);
    OC.geoPrep(pec);
    OC.paint(pec, (x, y, z, c) => c.set(y > 0 ? 0x3b4d5e : 0xeff5f8));
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, OC._FaunaCtx.creatureMat);
      pm.position.set(s * 3.1, -0.5, 2.2);
      pm.rotation.y = -s * 0.38;
      pm.rotation.z = -s * 0.18;
      group.add(pm);
    }

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.45);
    const fluke = new T.ConeGeometry(2.3, 2.6, 4);
    fluke.scale(1.4, 1, 0.16);
    fluke.rotateX(Math.PI / 2);
    OC.geoPrep(fluke);
    OC.paint(fluke, 0x223040);
    const fkM = new T.Mesh(fluke, OC._FaunaCtx.creatureMat);
    fkM.position.set(0, 0, -1.3);
    tailPivot.add(fkM);
    group.add(tailPivot);

    group.userData.key = 'whale_humpback';
    scene.add(group);

    let ang = 0.6, t = 28.0; // начинает ближе к циклу зрелищного выпрыгивания
    let prevY = -12;
    let breachingNow = false;
    const a = new T.Vector3(), b = new T.Vector3();

    function whalePos(angVal, tVal, out) {
      // Длинный эллиптический ход вдоль внешней стены + периодическое всплытие и выпрыгивание (breach)
      const ax = opts.cx + Math.cos(angVal) * opts.r * 0.65;
      const az = opts.cz + Math.sin(angVal) * opts.r * 1.45;
      const cyc = tVal % 58.0;
      const deepY = Math.max(opts.y + Math.sin(tVal * 0.14) * 10, biome.getHeight(ax, az) + 12);
      let y;
      if (cyc > 34.0 && cyc < 41.5) {
        // Мощный разгон и выпрыг над водной гладью (+7.8 м)
        const u = (cyc - 34.0) / 7.5;
        const arc = Math.sin(u * Math.PI);
        y = OC.lerp(Math.min(-18, deepY), 7.8, arc * arc * 0.85 + arc * 0.15);
      } else if (cyc > 46.0 && cyc < 56.0) {
        const breathRise = Math.sin(((cyc - 46.0) / 10.0) * Math.PI);
        y = Math.min(-3.4, OC.lerp(deepY, -3.8, breathRise));
      } else {
        y = Math.min(-3.4, deepY);
      }
      return out.set(ax, y, az);
    }

    return {
      key: 'whale_humpback',
      isBreaching: () => breachingNow || group.position.y > -0.6,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 950) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        const cyc = t % 58.0;
        const inBreach = cyc > 34.0 && cyc < 41.5;
        ang += ((opts.speed * (inBreach ? 1.45 : 1.0)) / opts.r) * dt;
        whalePos(ang, t, a);
        whalePos(ang + 0.08, t + 1.0, b);
        group.position.copy(a);
        group.lookAt(b);
        if (inBreach && a.y > -2.5) {
          const u = OC.clamp((cyc - 34.0) / 7.5, 0, 1);
          group.rotateZ(u * Math.PI * 1.45); // зрелищный разворот туловища в воздухе
          breachingNow = a.y > 0.0;
        } else {
          breachingNow = false;
        }
        if (onSplash) {
          if (prevY <= 0.15 && a.y > 0.15) onSplash(a, 0.7);
          else if (prevY >= 0.15 && a.y < 0.15) onSplash(a, 1.0);
        }
        prevY = a.y;
        tailPivot.rotation.x = Math.sin(time * (inBreach ? 1.85 : 0.95)) * 0.34;
      }
    };
  }

  /* ---------- Осьминог и Гигантская мурена ---------- */

  function makeSeaLion(scene, biome, opts, onSplash) {
    const group = new T.Group();
    const body = new T.SphereGeometry(1, 14, 10);
    body.scale(0.46, 0.44, 1.55);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / 1.55;
      const tap = t < 0 ? (1 - 0.65 * Math.pow(-t, 1.4)) : (1 - 0.42 * Math.pow(t, 2));
      bp.setXYZ(i, x * tap, y * tap, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => c.set(y > -0.05 ? 0x6c4c34 : 0x9b7552));
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    const snout = new T.ConeGeometry(0.24, 0.62, 8);
    snout.rotateX(Math.PI / 2);
    OC.geoPrep(snout);
    OC.paint(snout, 0x5c3e28);
    const snM = new T.Mesh(snout, OC._FaunaCtx.creatureMat);
    snM.position.set(0, 0.08, 1.62);
    group.add(snM);

    const fFlips = [];
    const fg = new T.SphereGeometry(1, 8, 5);
    fg.scale(0.75, 0.08, 0.28);
    OC.geoPrep(fg);
    OC.paint(fg, 0x422d1d);
    for (const s of [-1, 1]) {
      const m = new T.Mesh(fg, OC._FaunaCtx.creatureMat);
      m.position.set(s * 0.62, -0.15, 0.48);
      group.add(m);
      fFlips.push({ m, s });
    }
    const hind = new T.ConeGeometry(0.32, 0.78, 4);
    hind.scale(1.1, 1, 0.25);
    hind.rotateX(-Math.PI / 2);
    OC.geoPrep(hind);
    OC.paint(hind, 0x422d1d);
    const hindM = new T.Mesh(hind, OC._FaunaCtx.creatureMat);
    hindM.position.set(0, 0, -1.68);
    group.add(hindM);

    group.scale.setScalar(opts.scale || 1.0);
    group.userData.key = 'sea_lion';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 60, prevY = -4;
    let porpoising = false;
    const a = new T.Vector3(), b = new T.Vector3();
    function posAt(angV, tV, out) {
      const rr = opts.r + Math.sin(tV * 0.55) * 9;
      const x = opts.cx + Math.cos(angV) * rr;
      const z = opts.cz + Math.sin(angV) * rr + Math.sin(angV * 2.0) * 6;
      const cyc = tV % 22.0;
      let y;
      if (!biome.noSurface && cyc > 16.5 && cyc < 20.5) {
        const u = (cyc - 16.5) / 4.0;
        const jump = Math.sin(u * Math.PI);
        y = OC.lerp(Math.max(opts.y, biome.getHeight(x, z) + 2.4), 1.45, jump);
      } else {
        y = Math.min(-1.0, Math.max(opts.y + Math.sin(tV * 0.85) * 4.5, biome.getHeight(x, z) + 2.4));
      }
      return out.set(x, y, z);
    }

    return {
      key: 'sea_lion',
      isPorpoising: () => porpoising,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 5.2) / opts.r) * dt;
        posAt(ang, t, a);
        posAt(ang + 0.14, t + 0.25, b);
        group.position.copy(a);
        group.lookAt(b);
        porpoising = a.y > -0.25;
        if (onSplash) {
          if (prevY <= 0.05 && a.y > 0.05) onSplash(a, 0.35);
          else if (prevY >= 0.05 && a.y < 0.05) onSplash(a, 0.42);
        }
        prevY = a.y;
        group.rotateZ(Math.sin(t * 0.9) * 0.42); // игривые бочки между ламинарией
        const stroke = Math.sin(time * 4.2);
        for (const f of fFlips) f.m.rotation.z = f.s * stroke * 0.65;
        hindM.rotation.x = Math.sin(time * 4.2 + 0.8) * 0.35;
      }
    };
  }

  /* ---------- Глубоководный морской чёрт (Melanocetus) ---------- */

  OC._FaunaBuilders.makeHumpbackWhale = makeHumpbackWhale;
  OC._FaunaBuilders.makeSeaLion = makeSeaLion;
})(window.OC);
