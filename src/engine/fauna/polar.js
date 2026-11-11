/* ================= ФАУНА: АРКТИКА И ПОЛЯРНЫЕ ВИДЫ ================= */
/* Белуха, нарвал, арктическая медуза, крылоногий моллюск Clione и затонувший транспорт. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

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

  OC._FaunaBuilders.makeBeluga = makeBeluga;
  OC._FaunaBuilders.makeNarwhal = makeNarwhal;
  OC._FaunaBuilders.makeArcticJelly = makeArcticJelly;
  OC._FaunaBuilders.makeClione = makeClione;
  OC._FaunaBuilders.makeShipwreck = makeShipwreck;
})(window.OC);
