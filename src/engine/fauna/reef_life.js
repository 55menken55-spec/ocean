/* ================= ФАУНА: РИФОВЫЕ БЕСПОЗВОНОЧНЫЕ И РЕПТИЛИИ ================= */
/* Медуза, золотая медуза Палау, морская черепаха, дюгонь, осьминог и мурена. */
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

  OC._FaunaBuilders.makeJelly = makeJelly;
  OC._FaunaBuilders.makeGoldenJelly = makeGoldenJelly;
  OC._FaunaBuilders.makeTurtle = makeTurtle;
  OC._FaunaBuilders.makeDugong = makeDugong;
  OC._FaunaBuilders.makeOctopus = makeOctopus;
  OC._FaunaBuilders.makeMoray = makeMoray;
})(window.OC);
