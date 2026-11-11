/* ================= ФАУНА: СКАТЫ И АКУЛЫ ================= */
/* Хвостокол, манта, тигровая/рифовая акула и акула-молот с электролокацией. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

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

  OC._FaunaBuilders.makeRay = makeRay;
  OC._FaunaBuilders.makeManta = makeManta;
  OC._FaunaBuilders.makeShark = makeShark;
  OC._FaunaBuilders.makeHammerhead = makeHammerhead;
})(window.OC);
