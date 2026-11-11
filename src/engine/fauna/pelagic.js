/* ================= ФАУНА: ПЕЛАГИЧЕСКИЕ И РИФОВЫЕ МЕГАФАУНА И БЕСПОЗВОНОЧНЫЕ ================= */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

  function makeJelly(scene, opts) {
    const hue = opts.hue;
    const deep = !!opts.deep;
    const group = new T.Group();

    const bellGeo = new T.SphereGeometry(1, 18, 11, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const bp = bellGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const scallop = 1 + 0.06 * Math.sin(Math.atan2(z, x) * 8) * (1 - y);
      bp.setXYZ(i, x * scallop, y, z * scallop);
    }
    bellGeo.computeVertexNormals();
    bellGeo.deleteAttribute('uv');
    const bellMat = new T.MeshStandardMaterial({
      color: new T.Color().setHSL(hue, 0.78, 0.66),
      emissive: new T.Color().setHSL(hue, 0.9, deep ? 0.55 : 0.28),
      emissiveIntensity: deep ? 1.5 : 0.7,
      roughness: 0.22, transparent: true, opacity: 0.58,
      side: T.DoubleSide, depthWrite: false
    });
    const bell = new T.Mesh(bellGeo, bellMat);

    const innerMat = new T.MeshStandardMaterial({
      color: new T.Color().setHSL((hue + 0.05) % 1, 0.9, 0.72),
      emissive: new T.Color().setHSL((hue + 0.05) % 1, 1.0, 0.45),
      emissiveIntensity: deep ? 2.0 : 1.1,
      transparent: true, opacity: 0.85, roughness: 0.35
    });
    const inner = new T.Mesh(new T.SphereGeometry(0.52, 10, 8), innerMat);
    inner.position.y = 0.08;
    group.add(bell, inner);

    const tent = [];
    const nT = 8;
    for (let i = 0; i < nT; i++) {
      const a = (i / nT) * Math.PI * 2;
      const pts = [];
      for (let s = 0; s <= 4; s++) {
        const t = s / 4;
        pts.push(new T.Vector3(
          Math.cos(a) * 0.68 * (1 - t * 0.22),
          -t * (1.6 + (i % 3) * 0.55),
          Math.sin(a) * 0.68 * (1 - t * 0.22)
        ));
      }
      const tg = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 6, 0.032, 3, false);
      OC.geoPrep(tg);
      OC.paint(tg, new T.Color().setHSL(hue, 0.75, 0.62));
      tent.push(tg);
    }
    const tentMat = new T.MeshStandardMaterial({
      color: new T.Color().setHSL(hue, 0.82, 0.64),
      emissive: new T.Color().setHSL(hue, 0.92, deep ? 0.45 : 0.22),
      transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide
    });
    const tentMesh = new T.Mesh(OC.mergeGeometries(tent), tentMat);
    group.add(tentMesh);

    group.scale.setScalar(opts.size || 1.1);
    group.userData.key = deep ? 'jelly_deep' : 'jelly';
    scene.add(group);

    let pulse = Math.random() * 6.28, t = Math.random() * 100;
    const baseX = opts.x, baseY = opts.y, baseZ = opts.z;

    return {
      update(dt, time, camPos) {
        if (Math.hypot(baseX - camPos.x, baseZ - camPos.z) > 460) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        pulse += dt * 2.1;
        const p = (Math.sin(pulse) + 1) * 0.5;
        bell.scale.set(1 + p * 0.2, 1 - p * 0.24, 1 + p * 0.2);
        inner.scale.setScalar(0.95 + p * 0.14);
        group.position.set(
          baseX + Math.sin(t * 0.22) * 8,
          Math.min(-1.8, baseY + Math.sin(t * 0.5) * 3.5),
          baseZ + Math.cos(t * 0.19) * 8
        );
        group.rotation.y = t * 0.12;
        tentMesh.rotation.y = Math.sin(t * 0.75) * 0.15;
        const bio = OC.getPalette().bioGlow;
        const glowBoost = deep ? (1.2 + bio * 1.4) : (0.4 + bio * 1.5);
        innerMat.emissiveIntensity = glowBoost * (0.9 + p * 0.45);
        bellMat.emissiveIntensity = glowBoost * 0.48;
      }
    };
  }

  /* ---------- Синепятнистый хвостокол и Пятнистый орляк ---------- */
  function makeRay(scene, biome, opts) {
    const isEagle = !!opts.eagle;
    const span = isEagle ? 3.8 : 2.1;
    const group = new T.Group();

    const disc = new T.SphereGeometry(1, 14, 10);
    disc.scale(span * 0.5, 0.16, span * (isEagle ? 0.34 : 0.54));
    OC.geoPrep(disc);
    OC.paint(disc, (x, y, z, c) => {
      if (y < 0) { c.set(0xedf2f4); return; }
      if (isEagle) {
        const spot = Math.sin(x * 7) * Math.sin(z * 7);
        c.set(0x1f2d3d).lerp(new T.Color(0xdcebf5), spot > 0.45 ? 0.9 : 0);
      } else {
        const spot = Math.sin(x * 8.5) * Math.cos(z * 8.5);
        c.set(0xaa864a).lerp(new T.Color(0x28b8ff), spot > 0.52 ? 0.95 : 0);
      }
    });
    group.add(new T.Mesh(disc, OC._FaunaCtx.creatureMat));

    const tail = new T.CylinderGeometry(0.02, 0.12, span * (isEagle ? 1.25 : 0.85), 5);
    tail.rotateX(Math.PI / 2);
    OC.geoPrep(tail);
    OC.paint(tail, isEagle ? 0x1f2d3d : 0x7d6238);
    const tailM = new T.Mesh(tail, OC._FaunaCtx.creatureMat);
    tailM.position.set(0, 0, -span * (isEagle ? 0.85 : 0.72));
    group.add(tailM);

    group.scale.setScalar(opts.scale || 1);
    group.userData.key = isEagle ? 'ray_eagle' : 'ray_spotted';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 60;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      key: isEagle ? 'ray_eagle' : 'ray_spotted',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 500) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += (opts.speed / opts.r) * dt;
        const rr = opts.r + Math.sin(t * 0.25) * 6;
        const ax = opts.cx + Math.cos(ang) * rr, az = opts.cz + Math.sin(ang) * rr;
        const bx = opts.cx + Math.cos(ang + 0.14) * rr, bz = opts.cz + Math.sin(ang + 0.14) * rr;
        const flA = biome.getHeight(ax, az);
        const flB = biome.getHeight(bx, bz);
        const ay = isEagle ? Math.max(opts.y + Math.sin(t * 0.4) * 3, flA + 4) : flA + 1.35 + Math.sin(t * 0.8) * 0.3;
        const by = isEagle ? Math.max(opts.y + Math.sin(t * 0.4 + 0.2) * 3, flB + 4) : flB + 1.35 + Math.sin(t * 0.8 + 0.2) * 0.3;

        a.set(ax, Math.min(-1.4, ay), az);
        b.set(bx, Math.min(-1.4, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        group.rotation.z = Math.sin(time * (isEagle ? 2.4 : 3.2)) * 0.08;
      }
    };
  }

  /* ---------- Гигантский скат-манта (Mobula birostris) ---------- */
  function makeManta(scene, biome, opts) {
    const span = opts.span || 11;
    const group = new T.Group();

    function wingGeom(sign) {
      const NX = 14, NZ = 10;
      const pos = [], col = [], idx = [];
      const cTop = new T.Color(0x1f2d3a);
      const cBot = new T.Color(0xe6f0f4);
      for (let iz = 0; iz <= NZ; iz++) {
        for (let ix = 0; ix <= NX; ix++) {
          const u = ix / NX, v = iz / NZ;
          const x = sign * u * span * 0.5;
          const chord = (1 - u * 0.78) * (1 - 0.55 * Math.pow(Math.max(0, u - 0.35) / 0.65, 2));
          const z = (0.5 - v) * span * 0.62 * chord * 1.5;
          const y = sign * (0.3 * Math.sin(u * Math.PI) * (v - 0.4)) - u * u * 0.45;
          pos.push(x, y, z);
          const c = cTop.clone().lerp(cBot, v > 0.82 ? 0.85 : v * 0.22);
          col.push(c.r, c.g, c.b);
        }
      }
      for (let iz = 0; iz < NZ; iz++) {
        for (let ix = 0; ix < NX; ix++) {
          const a = iz * (NX + 1) + ix, b = a + NX + 1;
          if (sign > 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
          else idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }

    const body = new T.SphereGeometry(1, 14, 10);
    body.scale(2.1, 0.52, 3.0);
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.set(y > 0 ? 0x22323f : 0xe4eef2));
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    const wingL = new T.Mesh(wingGeom(1), OC._FaunaCtx.creatureMat);
    const wingR = new T.Mesh(wingGeom(-1), OC._FaunaCtx.creatureMat);
    group.add(wingL, wingR);

    const tailG = new T.CylinderGeometry(0.05, 0.28, 5.2, 5);
    tailG.rotateX(Math.PI / 2);
    OC.geoPrep(tailG);
    OC.paint(tailG, 0x22323f);
    const tail = new T.Mesh(tailG, OC._FaunaCtx.creatureMat);
    tail.position.set(0, 0, -5.2);
    group.add(tail);

    group.scale.setScalar(opts.size || 0.72);
    group.userData.key = 'manta';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 80;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      key: 'manta',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 720) { group.visible = false; return; }
        group.visible = true;
        // Манты притормаживают и зависают на станциях чистки
        let spd = opts.speed || 4.2;
        let nearStation = false;
        const stations = ctx ? ctx.cleaningStations : null;
        if (stations) {
          for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            if (Math.hypot(group.position.x - st.x, group.position.z - st.z) < st.radius * 1.65) {
              spd *= 0.56;
              nearStation = true;
              break;
            }
          }
        }
        t += dt;
        ang += (spd / opts.r) * dt;
        // Фигура-восьмёрка вдоль стенки обрыва + выраженный крен в виражах
        const rr = opts.r + Math.sin(t * 0.22) * 18;
        const ax = opts.cx + Math.cos(ang) * rr * 0.78;
        const az = opts.cz + Math.sin(ang) * rr + Math.sin(ang * 2.0) * 14;
        const bx = opts.cx + Math.cos(ang + 0.12) * rr * 0.78;
        const bz = opts.cz + Math.sin(ang + 0.12) * rr + Math.sin((ang + 0.12) * 2.0) * 14;
        const ay = Math.max(opts.y + Math.sin(t * 0.3) * 6, biome.getHeight(ax, az) + 5);
        const by = Math.max(opts.y + Math.sin(t * 0.3 + 0.3) * 6, biome.getHeight(bx, bz) + 5);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        if (nearStation && ctx && ctx.cleanClients) ctx.cleanClients.push(group.position);
        group.lookAt(b);
        group.rotateZ(Math.cos(ang) * 0.22 + Math.sin(t * 0.3) * 0.12);
        const flap = Math.sin(time * 1.25);
        wingL.rotation.z = flap * 0.32;
        wingR.rotation.z = -flap * 0.32;
      }
    };
  }

  /* ---------- Зелёная морская черепаха ---------- */
  function makeTurtle(scene, biome, opts) {
    const group = new T.Group();
    const shell = new T.SphereGeometry(1, 16, 12);
    shell.scale(2.4, 0.92, 2.9);
    OC.geoPrep(shell);
    OC.paint(shell, (x, y, z, c) => {
      const scute = Math.sin(x * 2.5) * Math.sin(z * 2.5) * Math.sin(y * 3.0);
      c.setHSL(0.16, 0.42, y > 0 ? 0.28 + scute * 0.06 : 0.7);
    });
    group.add(new T.Mesh(shell, OC._FaunaCtx.creatureMat));

    const head = new T.SphereGeometry(0.58, 10, 8);
    head.scale(0.95, 0.85, 1.25);
    OC.geoPrep(head);
    OC.paint(head, 0x5c6e46);
    const headM = new T.Mesh(head, OC._FaunaCtx.creatureMat);
    headM.position.set(0, 0.1, 2.85);
    group.add(headM);

    const flippers = [];
    const flGeo = new T.SphereGeometry(1, 9, 6);
    flGeo.scale(1.65, 0.12, 0.56);
    OC.geoPrep(flGeo);
    OC.paint(flGeo, 0x556640);
    for (let i = 0; i < 4; i++) {
      const f = new T.Mesh(flGeo, OC._FaunaCtx.creatureMat);
      const front = i < 2, sign = i % 2 === 0 ? 1 : -1;
      f.position.set(sign * (front ? 1.9 : 1.3), -0.08, front ? 1.75 : -2.15);
      f.scale.setScalar(front ? 1.0 : 0.6);
      group.add(f);
      flippers.push({ mesh: f, sign, front });
    }
    group.scale.setScalar(opts.size || 0.72);
    group.userData.key = 'turtle';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 70;
    let breathPhase = Math.random() * 34;
    const a = new T.Vector3(), b = new T.Vector3();

    function turtlePos(angVal, tVal, bPhase, out) {
      const rr = opts.r + Math.sin(tVal * 0.19) * 10;
      const x = opts.cx + Math.cos(angVal) * rr;
      const z = opts.cz + Math.sin(angVal) * rr + Math.sin(angVal * 2.0) * 8;
      // Периодическое всплытие на поверхность за воздухом (цикл ~34 с)
      const cyc = bPhase % 34.0;
      let surfW = 0;
      if (cyc > 26.0 && cyc < 33.5) {
        surfW = Math.sin(((cyc - 26.0) / 7.5) * Math.PI);
      }
      const grazeY = Math.max(opts.y + Math.sin(tVal * 0.3) * 3.5, biome.getHeight(x, z) + 2.2);
      const y = Math.min(-0.45, OC.lerp(grazeY, -0.5, surfW));
      return out.set(x, y, z);
    }

    return {
      key: 'turtle',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        let spd = OC.lerp(1.4, 2.2, dayW);
        let atClean = false;
        const stations = ctx ? ctx.cleaningStations : null;
        if (stations && dayW > 0.32) {
          for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            if (Math.hypot(group.position.x - st.x, group.position.z - st.z) < st.radius * 1.45) {
              spd *= 0.68;
              atClean = true;
              break;
            }
          }
        }
        t += dt;
        breathPhase += dt;
        ang += (spd / opts.r) * dt;
        turtlePos(ang, t, breathPhase, a);
        turtlePos(ang + 0.14, t + 0.4, breathPhase + 0.4, b);
        group.position.copy(a);
        if (atClean && ctx && ctx.cleanClients) ctx.cleanClients.push(group.position);
        group.lookAt(b);
        const stroke = Math.sin(time * 1.15);
        for (const f of flippers) {
          if (f.front) f.mesh.rotation.z = f.sign * stroke * 0.58;
          else { f.mesh.rotation.z = f.sign * Math.sin(time * 1.15 + 1.1) * 0.28; f.mesh.rotation.y = f.sign * 0.4; }
        }
        headM.rotation.y = Math.sin(time * 0.5) * 0.18;
      }
    };
  }

  /* ---------- Дюгонь (Dugong dugon) ---------- */
  function makeDugong(scene, biome, opts) {
    const group = new T.Group();
    const body = new T.SphereGeometry(1, 16, 12);
    body.scale(0.85, 0.78, 2.35);
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.setHSL(0.56, 0.12, y > 0 ? 0.48 : 0.62));
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    const snout = new T.CylinderGeometry(0.42, 0.55, 0.9, 10);
    snout.rotateX(Math.PI * 0.65);
    OC.geoPrep(snout);
    OC.paint(snout, 0x7b8990);
    const snM = new T.Mesh(snout, OC._FaunaCtx.creatureMat);
    snM.position.set(0, -0.22, 2.25);
    group.add(snM);

    // Плавники
    const fl = new T.SphereGeometry(1, 8, 6);
    fl.scale(0.75, 0.12, 0.35);
    OC.geoPrep(fl);
    OC.paint(fl, 0x6f7d84);
    for (const s of [-1, 1]) {
      const m = new T.Mesh(fl, OC._FaunaCtx.creatureMat);
      m.position.set(s * 0.95, -0.35, 1.0);
      m.rotation.z = -s * 0.35;
      group.add(m);
    }

    // Хвостовой стебель и лопасть дюгоня
    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -2.1);
    const fluke = new T.ConeGeometry(0.95, 1.2, 4);
    fluke.scale(1.3, 1, 0.18);
    fluke.rotateX(Math.PI / 2);
    OC.geoPrep(fluke);
    OC.paint(fluke, 0x647279);
    const fkM = new T.Mesh(fluke, OC._FaunaCtx.creatureMat);
    fkM.position.set(0, 0, -0.75);
    tailPivot.add(fkM);
    group.add(tailPivot);

    group.scale.setScalar(opts.scale || 1.05);
    group.userData.key = 'dugong';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 80;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      key: 'dugong',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += (1.7 / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r, az = opts.cz + Math.sin(ang) * opts.r;
        const bx = opts.cx + Math.cos(ang + 0.12) * opts.r, bz = opts.cz + Math.sin(ang + 0.12) * opts.r;
        const ay = Math.max(biome.getHeight(ax, az) + 1.8 + Math.sin(t * 0.4) * 0.7, -11);
        const by = Math.max(biome.getHeight(bx, bz) + 1.8 + Math.sin(t * 0.4 + 0.2) * 0.7, -11);
        a.set(ax, Math.min(-1.8, ay), az);
        b.set(bx, Math.min(-1.8, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        tailPivot.rotation.x = Math.sin(time * 1.8) * 0.35;
      }
    };
  }

  /* ---------- Рифовая, китовая, леопардовая и гренландская полярная акулы ---------- */
  function makeShark(scene, biome, opts) {
    const isWhale = !!opts.whaleShark;
    const isLeopard = opts.speciesKey === 'shark_leopard';
    const isGreenland = opts.speciesKey === 'shark_greenland';
    const isGalapagos = opts.speciesKey === 'galapagos_shark';
    const len = isWhale ? 11.5 : (isGreenland ? 5.4 : (isLeopard ? 2.4 : (isGalapagos ? 3.8 : 4.2)));
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 18, 12);
    body.scale(len * (isGreenland ? 0.15 : 0.13), len * (isGreenland ? 0.16 : 0.14), len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5); // -1 хвост .. +1 нос
      const taper = t < 0 ? (1 - 0.78 * Math.pow(-t, 1.3)) : (1 - (isGreenland ? 0.22 : 0.32) * Math.pow(t, 2));
      const wideHead = (isWhale || isGreenland) && t > 0.5 ? 1.25 : 1.0;
      bp.setXYZ(i, x * taper * wideHead, y * taper * (isWhale ? 0.88 : 1), z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => {
      if (isWhale) {
        if (y < -0.1) { c.set(0xe4edf2); return; }
        const spot = Math.sin(x * 4.5) * Math.cos(z * 2.2);
        c.set(0x2a4054).lerp(new T.Color(0xddecf5), spot > 0.48 ? 0.92 : 0);
      } else if (isLeopard) {
        if (y < -0.06) { c.set(0xddd2b8); return; }
        const saddle = Math.sin(z * 5.2) * Math.cos(x * 5.5);
        c.set(0x9a8454).lerp(new T.Color(0x2d2416), saddle > 0.38 ? 0.85 : 0);
      } else if (isGreenland) {
        const mott = Math.sin(z * 3.1 + x * 4.2) * 0.06;
        c.set(y > -0.1 ? 0x3b3838 : 0x565252).offsetHSL(0, 0, mott);
      } else if (isGalapagos) {
        c.set(y > -0.05 ? 0x484b44 : 0xe4e5de);
      } else {
        c.set(y > -0.05 ? 0x5d6e7a : 0xdde6ea);
      }
    });
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    // Спинной плавник
    const dorsal = new T.ConeGeometry(len * (isGreenland ? 0.07 : 0.11), len * (isGreenland ? 0.16 : (isGalapagos ? 0.28 : 0.24)), 4);
    dorsal.scale(0.25, 1, 1.1);
    OC.geoPrep(dorsal);
    OC.paint(dorsal, isWhale ? 0x2c4257 : (isLeopard ? 0x7a663e : (isGreenland ? 0x343131 : (isGalapagos ? 0x3e413b : 0x455661))));
    const dorM = new T.Mesh(dorsal, OC._FaunaCtx.creatureMat);
    dorM.position.set(0, len * 0.14, isGreenland ? -len * 0.04 : len * 0.04);
    dorM.rotation.x = -0.35;
    group.add(dorM);

    // Грудные плавники
    const pec = new T.ConeGeometry(len * 0.09, len * (isGreenland ? 0.20 : 0.28), 4);
    pec.scale(0.22, 1, 1);
    OC.geoPrep(pec);
    OC.paint(pec, isWhale ? 0x2a4054 : (isLeopard ? 0x857046 : (isGreenland ? 0x383535 : 0x52626d)));
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, OC._FaunaCtx.creatureMat);
      pm.position.set(s * len * 0.17, -len * 0.05, len * 0.12);
      pm.rotation.z = -s * 1.25;
      pm.rotation.y = s * 0.25;
      group.add(pm);
    }

    // Шарнирный хвост
    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.42);
    const tailTop = new T.ConeGeometry(len * 0.08, len * 0.34, 4);
    tailTop.scale(0.2, 1, 0.9);
    OC.geoPrep(tailTop);
    OC.paint(tailTop, isWhale ? 0x2a4054 : (isLeopard ? 0x524229 : (isGreenland ? 0x2e2a2a : 0x28323a)));
    const ttM = new T.Mesh(tailTop, OC._FaunaCtx.creatureMat);
    ttM.position.set(0, len * 0.08, -len * 0.14);
    ttM.rotation.x = -0.6;
    const tailBot = new T.ConeGeometry(len * 0.06, len * 0.22, 4);
    tailBot.scale(0.2, 1, 0.8);
    OC.geoPrep(tailBot);
    OC.paint(tailBot, isWhale ? 0x2a4054 : (isLeopard ? 0x7c6840 : (isGreenland ? 0x3b3737 : 0x455661)));
    const tbM = new T.Mesh(tailBot, OC._FaunaCtx.creatureMat);
    tbM.position.set(0, -len * 0.05, -len * 0.1);
    tbM.rotation.x = 2.4;
    tailPivot.add(ttM, tbM);
    group.add(tailPivot);

    const sKey = opts.speciesKey || (isWhale ? 'shark_whale' : 'shark_reef');
    group.userData.key = sKey;
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 100;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = new T.Vector3(), b = new T.Vector3();
    let inspectBlend = 0;
    let lungeTimer = 0;
    let lungeCooldown = 12 + Math.random() * 12;
    let lungeTarget = null;
    let lungeBlend = 0;

    return {
      key: sKey,
      isActivePredator: !isWhale,
      isHunting: () => lungeTimer > 0,
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 760) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const flashOn = ctx ? ctx.flashOn : false;
        const preyCenters = ctx ? ctx.preyCenters : null;
        const stations = ctx ? ctx.cleaningStations : null;
        const cleanClients = ctx ? ctx.cleanClients : null;
        const nightBoost = isWhale ? 1.0 : OC.lerp(1.22, 1.0, dayW);
        t += dt;

        // Охотничьи броски акул (рифовой, леопардовой, гренландской) на косяки рыб
        if (!isWhale && preyCenters && preyCenters.length) {
          if (lungeTimer > 0) {
            lungeTimer -= dt;
            if (lungeTarget && group.position.distanceTo(lungeTarget) < 6.5) {
              lungeTimer = 0;
              lungeCooldown = 18 + Math.random() * 12;
            }
          } else {
            lungeCooldown -= dt;
            if (lungeCooldown <= 0) {
              let bestD = 138;
              let bestP = null;
              for (let p = 0; p < preyCenters.length; p++) {
                const pr = preyCenters[p];
                if (pr.y > -2.5) continue;
                const d = Math.hypot(pr.x - group.position.x, pr.z - group.position.z);
                if (d < bestD) { bestD = d; bestP = pr; }
              }
              if (bestP) {
                lungeTarget = bestP;
                lungeTimer = 4.6;
              }
              lungeCooldown = (dayW < 0.45 ? 10 : 16) + Math.random() * 12;
            }
          }
        }
        lungeBlend += ((lungeTimer > 0 && lungeTarget ? 1 : 0) - lungeBlend) * Math.min(1, dt * 2.4);

        // Любопытный осмотр дайвера, если нет активного броска на косяк
        const dCam = Math.hypot(camPos.x - opts.cx, camPos.z - opts.cz);
        const wantInspect = !isWhale && lungeTimer <= 0 && dCam < opts.r + 36 && camPos.y < -3.0;
        inspectBlend += ((wantInspect ? (flashOn ? 0.55 : 0.35) : 0) - inspectBlend) * Math.min(1, dt * 1.2);

        // Станция чистки для рифовых акул
        let atClean = false;
        if (!isWhale && lungeTimer <= 0 && stations && dayW > 0.32) {
          for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            if (Math.hypot(group.position.x - st.x, group.position.z - st.z) < st.radius * 1.35) {
              atClean = true;
              if (cleanClients) cleanClients.push(group.position);
              break;
            }
          }
        }

        const speedMult = (lungeTimer > 0 ? 2.15 : (atClean ? 0.65 : 1.0)) * nightBoost;
        ang += ((opts.speed * speedMult) / opts.r) * dir * dt;

        let patCx = OC.lerp(opts.cx, camPos.x, inspectBlend);
        let patCz = OC.lerp(opts.cz, camPos.z, inspectBlend);
        let patR = OC.lerp(opts.r + Math.sin(t * 0.18) * 14, 18.0, inspectBlend);
        if (lungeBlend > 0.02 && lungeTarget) {
          patCx = OC.lerp(patCx, lungeTarget.x, lungeBlend);
          patCz = OC.lerp(patCz, lungeTarget.z, lungeBlend);
          patR = OC.lerp(patR, 5.5, lungeBlend);
        }

        const ax = patCx + Math.cos(ang) * patR * 0.85;
        const az = patCz + Math.sin(ang) * patR + Math.sin(ang * 2.0) * (isWhale ? 16 : 10) * (1 - Math.max(inspectBlend, lungeBlend));
        const bx = patCx + Math.cos(ang + 0.1 * dir) * patR * 0.85;
        const bz = patCz + Math.sin(ang + 0.1 * dir) * patR + Math.sin((ang + 0.1 * dir) * 2.0) * (isWhale ? 16 : 10) * (1 - Math.max(inspectBlend, lungeBlend));
        let baseY = OC.lerp(opts.y + Math.sin(t * 0.24) * 5, Math.min(-4, camPos.y + 1.5), inspectBlend);
        if (lungeBlend > 0.02 && lungeTarget) {
          baseY = OC.lerp(baseY, lungeTarget.y, lungeBlend);
        }
        const ay = Math.max(baseY, biome.getHeight(ax, az) + 4);
        const by = Math.max(baseY + Math.sin(t * 0.24 + 0.2) * 1.5, biome.getHeight(bx, bz) + 4);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        const wagFreq = (isWhale ? 1.5 : (isGreenland ? 1.65 : 3.2)) * (lungeTimer > 0 ? 1.75 : 1.0);
        tailPivot.rotation.y = Math.sin(time * wagFreq + t) * 0.34;
        group.rotation.y += Math.sin(time * wagFreq + t) * 0.04;
      }
    };
  }

  /* ---------- Горбатый кит (Megaptera novaeangliae) с эффектным выпрыгом (breach) ---------- */
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
  function makeOctopus(scene, biome, opts) {
    const group = new T.Group();
    const head = new T.SphereGeometry(0.62, 12, 10);
    head.scale(0.88, 1.25, 1.0);
    OC.geoPrep(head);
    OC.paint(head, 0x9b4d3f);
    const hM = new T.Mesh(head, OC._FaunaCtx.creatureMat);
    hM.position.y = 0.55;
    group.add(hM);

    const arms = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.28;
      const pts = [];
      for (let s = 0; s <= 5; s++) {
        const t = s / 5;
        pts.push(new T.Vector3(Math.cos(a) * (0.25 + t * 1.15), 0.15 - Math.sin(t * 3.1) * 0.25 - t * 0.25, Math.sin(a) * (0.25 + t * 1.15)));
      }
      const ag = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.1, 5, false);
      OC.geoPrep(ag);
      OC.paint(ag, 0x8f4336);
      const am = new T.Mesh(ag, OC._FaunaCtx.creatureMat);
      group.add(am);
      arms.push(am);
    }
    group.scale.setScalar(opts.scale || 0.95);
    group.userData.key = 'octopus';
    scene.add(group);

    let t = Math.random() * 50;
    let spook = 0;
    return {
      key: 'octopus',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.x - camPos.x, opts.z - camPos.z) > 400) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const camSpeed = ctx ? ctx.camSpeed : 0;
        const dCam = Math.hypot(group.position.x - camPos.x, group.position.z - camPos.z);
        if (dCam < 8.5 && camSpeed > 4.0) spook = Math.min(1, spook + dt * 3.0);
        else spook = Math.max(0, spook - dt * 0.6);

        t += dt * OC.lerp(1.25, 0.9, dayW) * (1 + spook * 1.8);
        const wx = opts.x + Math.sin(t * 0.42) * 3.4 + Math.cos(t * 0.19) * 1.5;
        const wz = opts.z + Math.cos(t * 0.36) * 3.4 + Math.sin(t * 0.23) * 1.5;
        const wy = biome.getHeight(wx, wz) + 0.55 + Math.abs(Math.sin(t * (0.9 + spook))) * (0.7 + spook * 1.1);
        group.position.set(wx, wy, wz);
        group.rotation.y = t * (0.3 + spook * 0.4);
        for (let i = 0; i < arms.length; i++) {
          arms[i].rotation.z = Math.sin(time * (2.5 + spook * 4.0) + i) * (0.12 + spook * 0.14);
        }
      }
    };
  }

  function makeMoray(scene, biome, opts) {
    const group = new T.Group();
    const segs = 10;
    const segMeshes = [];
    for (let i = 0; i < segs; i++) {
      const r = 0.26 * (1 - (i / segs) * 0.65);
      const g = new T.SphereGeometry(r, 8, 6);
      g.scale(1, 1.15, 1.8);
      OC.geoPrep(g);
      OC.paint(g, i === 0 ? 0x5c7238 : 0x4c612f);
      const m = new T.Mesh(g, OC._FaunaCtx.creatureMat);
      m.position.z = -i * 0.42;
      group.add(m);
      segMeshes.push(m);
    }
    group.userData.key = 'moray';
    scene.add(group);

    const baseY = biome.getHeight(opts.x, opts.z) + 0.65;
    let ang = Math.random() * 6.28, t = Math.random() * 50, retract = 0;
    return {
      key: 'moray',
      isNocturnalPredator: true,
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.x - camPos.x, opts.z - camPos.z) > 400) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const camSpeed = ctx ? ctx.camSpeed : 0;
        const flashOn = ctx ? ctx.flashOn : false;
        const dCam = Math.hypot(opts.x - camPos.x, opts.z - camPos.z);
        const threat = dCam < 9.5 && (camSpeed > 3.5 || flashOn || dCam < 5.5);
        retract += ((threat ? 1 : 0) - retract) * Math.min(1, dt * 3.5);

        const act = OC.lerp(1.5, 0.72, dayW);
        const orbitR = OC.lerp(5.2, 2.2, dayW) * (1 - retract * 0.85);
        t += dt * act;
        ang += 0.28 * act * dt;
        group.position.set(opts.x + Math.cos(ang) * orbitR, baseY - retract * 0.48, opts.z + Math.sin(ang) * orbitR);
        group.rotation.y = -ang;
        for (let i = 0; i < segMeshes.length; i++) {
          segMeshes[i].position.x = Math.sin(time * 3.5 - i * 0.55) * 0.18 * (1 - retract * 0.5);
        }
      }
    };
  }

  /* ---------- Калифорнийский морской лев (Zalophus californianus) ---------- */
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

  function makeHammerhead(scene, biome, opts) {
    const len = opts.len || 4.8;
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 16, 12);
    body.scale(len * 0.115, len * 0.135, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = OC.clamp(z / (len * 0.5), -1, 1);
      const taper = t < 0 ? (1 - 0.85 * Math.pow(Math.max(0, -t), 1.45)) : (1 - 0.25 * Math.pow(Math.max(0, t), 2.2));
      bp.setXYZ(i, x * taper, y * taper, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => c.set(y > -0.04 ? 0x625a4c : 0xe4e8ea));
    group.add(new T.Mesh(body, OC._FaunaCtx.creatureMat));

    // Характерный широкий цефалофойл («молот») с глазами по краям
    const hammer = new T.SphereGeometry(1, 14, 8);
    hammer.scale(len * 0.29, 0.13, 0.36);
    OC.geoPrep(hammer);
    OC.paint(hammer, (x, y, z, c) => c.set(y > -0.02 ? 0x5c5448 : 0xdde2e4));
    const hamM = new T.Mesh(hammer, OC._FaunaCtx.creatureMat);
    hamM.position.set(0, 0.04, len * 0.45);
    group.add(hamM);

    const eyeGeo = new T.SphereGeometry(0.065, 6, 5);
    OC.geoPrep(eyeGeo);
    OC.paint(eyeGeo, 0x0b0e12);
    for (const s of [-1, 1]) {
      const em = new T.Mesh(eyeGeo, OC._FaunaCtx.creatureMat);
      em.position.set(s * len * 0.275, 0.04, len * 0.48);
      group.add(em);
    }

    // Высокий серповидный спинной плавник Sphyrna mokarran
    const dorsal = new T.ConeGeometry(0.32, 1.32, 4);
    dorsal.scale(0.24, 1, 1.15);
    OC.geoPrep(dorsal);
    OC.paint(dorsal, 0x544d40);
    const dM = new T.Mesh(dorsal, OC._FaunaCtx.creatureMat);
    dM.position.set(0, len * 0.135 + 0.42, 0.12);
    dM.rotation.x = -0.32;
    group.add(dM);

    const pec = new T.ConeGeometry(0.32, 1.15, 4);
    pec.scale(0.18, 1, 0.68);
    OC.geoPrep(pec);
    OC.paint(pec, 0x585042);
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, OC._FaunaCtx.creatureMat);
      pm.position.set(s * 0.48, -0.22, 0.58);
      pm.rotation.z = s * 1.18;
      pm.rotation.x = -0.35;
      group.add(pm);
    }

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.44);
    const tUp = new T.ConeGeometry(0.34, 1.48, 4);
    tUp.scale(0.16, 1, 0.9);
    OC.geoPrep(tUp);
    OC.paint(tUp, 0x524b3f);
    const tUpM = new T.Mesh(tUp, OC._FaunaCtx.creatureMat);
    tUpM.position.set(0, 0.38, -0.34);
    tUpM.rotation.x = -0.78;
    const tDn = new T.ConeGeometry(0.22, 0.72, 4);
    tDn.scale(0.16, 1, 0.8);
    OC.geoPrep(tDn);
    OC.paint(tDn, 0x6c6556);
    const tDnM = new T.Mesh(tDn, OC._FaunaCtx.creatureMat);
    tDnM.position.set(0, -0.22, -0.22);
    tDnM.rotation.x = -2.35;
    tailPivot.add(tUpM, tDnM);
    group.add(tailPivot);

    group.userData.key = 'shark_hammerhead';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 100;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = new T.Vector3(), b = new T.Vector3();
    let lungeTimer = 0;
    let lungeCooldown = 14 + Math.random() * 12;
    let lungeTarget = null;
    let lungeBlend = 0;

    return {
      key: 'shark_hammerhead',
      isActivePredator: true,
      isHunting: () => lungeTimer > 0,
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 760) { group.visible = false; return; }
        group.visible = true;
        const preyCenters = ctx ? ctx.preyCenters : null;
        t += dt;
        if (preyCenters && preyCenters.length) {
          if (lungeTimer > 0) {
            lungeTimer -= dt;
            if (lungeTarget && group.position.distanceTo(lungeTarget) < 6.8) {
              lungeTimer = 0;
              lungeCooldown = 18 + Math.random() * 10;
            }
          } else {
            lungeCooldown -= dt;
            if (lungeCooldown <= 0) {
              let bestD = 145, bestP = null;
              for (let p = 0; p < preyCenters.length; p++) {
                const pr = preyCenters[p];
                if (pr.y > -2.5) continue;
                const d = Math.hypot(pr.x - group.position.x, pr.z - group.position.z);
                if (d < bestD) { bestD = d; bestP = pr; }
              }
              if (bestP) { lungeTarget = bestP; lungeTimer = 4.6; }
              lungeCooldown = 16 + Math.random() * 10;
            }
          }
        }
        lungeBlend += ((lungeTimer > 0 && lungeTarget ? 1 : 0) - lungeBlend) * Math.min(1, dt * 2.5);

        const spd = (opts.speed || 5.4) * (lungeTimer > 0 ? 2.1 : 1.0);
        ang += (spd / opts.r) * dir * dt;
        const patCx = lungeBlend > 0.02 && lungeTarget ? OC.lerp(opts.cx, lungeTarget.x, lungeBlend) : opts.cx;
        const patCz = lungeBlend > 0.02 && lungeTarget ? OC.lerp(opts.cz, lungeTarget.z, lungeBlend) : opts.cz;
        const patR = OC.lerp(opts.r + Math.sin(t * 0.2) * 14, 6.0, lungeBlend);
        const ax = patCx + Math.cos(ang) * patR * 0.9;
        const az = patCz + Math.sin(ang) * patR + Math.sin(ang * 2.0) * 12 * (1 - lungeBlend);
        const bx = patCx + Math.cos(ang + 0.1 * dir) * patR * 0.9;
        const bz = patCz + Math.sin(ang + 0.1 * dir) * patR + Math.sin((ang + 0.1 * dir) * 2.0) * 12 * (1 - lungeBlend);
        const baseY = lungeBlend > 0.02 && lungeTarget ? OC.lerp(opts.y + Math.sin(t * 0.25) * 4, lungeTarget.y, lungeBlend) : (opts.y + Math.sin(t * 0.25) * 4);
        const ay = Math.max(baseY, biome.getHeight(ax, az) + 4.2);
        const by = Math.max(baseY, biome.getHeight(bx, bz) + 4.2);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        const wag = lungeTimer > 0 ? 5.6 : 3.4;
        tailPivot.rotation.y = Math.sin(time * wag + t) * 0.34;
        // Характерное покачивание головы-молота при сканировании дна
        group.rotation.y += Math.sin(time * wag + t) * 0.08;
      }
    };
  }

  /* ---------- Золотая медуза Палау (Mastigias papua) ---------- */
  function makeGoldenJelly(scene, opts) {
    const group = new T.Group();
    const bellGeo = new T.SphereGeometry(0.88, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const bellMat = new T.MeshStandardMaterial({
      color: new T.Color(0xf6b93b),
      emissive: new T.Color(0xd98018),
      emissiveIntensity: 0.72,
      roughness: 0.26,
      transparent: true,
      opacity: 0.72,
      side: T.DoubleSide,
      depthWrite: false
    });
    const bell = new T.Mesh(bellGeo, bellMat);
    group.add(bell);

    // Характерные светлые пятна и медовые ротовые лопасти без жгучих нитей
    const spotMat = new T.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.85 });
    const spotGeo = new T.SphereGeometry(0.085, 6, 4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sm = new T.Mesh(spotGeo, spotMat);
      sm.position.set(Math.cos(a) * 0.62, 0.42 + (i % 2) * 0.16, Math.sin(a) * 0.62);
      group.add(sm);
    }

    const armsMat = new T.MeshStandardMaterial({
      color: 0xd47a14,
      emissive: 0x8c4208,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.86,
      roughness: 0.45
    });
    const armGeo = new T.ConeGeometry(0.16, 1.15, 6);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const am = new T.Mesh(armGeo, armsMat);
      am.position.set(Math.cos(a) * 0.28, -0.58, Math.sin(a) * 0.28);
      am.rotation.x = Math.PI;
      group.add(am);
    }

    group.scale.setScalar(opts.scale || 0.95);
    group.position.set(opts.cx, opts.y, opts.cz);
    group.userData.key = 'jelly_golden';
    scene.add(group);

    const ph = Math.random() * 6.28;
    const baseS = opts.scale || 0.95;
    return {
      key: 'jelly_golden',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        const pulse = Math.sin(time * 2.1 + ph);
        group.position.x = opts.cx + Math.sin(time * 0.24 + ph) * 7.5;
        group.position.z = opts.cz + Math.cos(time * 0.21 + ph) * 7.5;
        group.position.y = Math.min(-1.0, opts.y + Math.sin(time * 0.42 + ph) * (opts.amp || 2.2) + pulse * 0.24);
        group.scale.set(baseS * (1 - pulse * 0.08), baseS * (1 + pulse * 0.12), baseS * (1 - pulse * 0.08));
      }
    };
  }

  /* ---------- Шлейфы чёрных курильщиков и серпентинитовых сипов ---------- */

  OC._FaunaBuilders.makeJelly = makeJelly;
  OC._FaunaBuilders.makeRay = makeRay;
  OC._FaunaBuilders.makeManta = makeManta;
  OC._FaunaBuilders.makeTurtle = makeTurtle;
  OC._FaunaBuilders.makeDugong = makeDugong;
  OC._FaunaBuilders.makeShark = makeShark;
  OC._FaunaBuilders.makeHumpbackWhale = makeHumpbackWhale;
  OC._FaunaBuilders.makeOctopus = makeOctopus;
  OC._FaunaBuilders.makeMoray = makeMoray;
  OC._FaunaBuilders.makeSeaLion = makeSeaLion;
  OC._FaunaBuilders.makeHammerhead = makeHammerhead;
  OC._FaunaBuilders.makeGoldenJelly = makeGoldenJelly;
})(window.OC);
