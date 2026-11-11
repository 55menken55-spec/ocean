/* ================= ФАУНА: НАДВОДНЫЕ СУДА НИС, ПТИЦЫ, ГАЛАПАГОСЫ И АМАЗОНИЯ ================= */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

  function makeResearchVessel(scene, biome, opts) {
    opts = opts || {};
    const len = opts.len || 48;
    const beam = opts.beam || 10.6;
    const hullH = opts.hullH || 6.0;
    const variant = opts.variant || 'tropical';
    const preview = !!opts.preview;
    const group = new T.Group();
    const parts = [];

    const palettes = {
      polar:      { hull: 0xd63622, lower: 0x161c24, stripe: 0x11161c, deck: 0x2c4b47, crane: 0xf5b624, superCol: 0xf4f8fc },
      tropical:   { hull: 0xedf3f7, lower: 0x163858, stripe: 0x1fa8bc, deck: 0x2f5363, crane: 0xf5b624, superCol: 0xffffff },
      coastal:    { hull: 0x1f3e5a, lower: 0x121e2b, stripe: 0xe59824, deck: 0x364a56, crane: 0xf5b624, superCol: 0xf0f4f8 },
      expedition: { hull: 0x184f62, lower: 0x142632, stripe: 0xeb6a34, deck: 0x374c45, crane: 0xf5b624, superCol: 0xf3f7f9 },
      galapagos:  { hull: 0xf3f7fa, lower: 0x162b42, stripe: 0xd05c26, deck: 0x334d5b, crane: 0xf5b624, superCol: 0xffffff }
    };
    const pal = palettes[variant] || palettes.tropical;

    // 1. Корпус водоизмещающего судна (нос +Z, корма -Z, ватерлиния y = 0)
    const hullGeo = new T.BoxGeometry(beam, hullH, len, 10, 6, 22);
    const hp = hullGeo.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
      const u = OC.clamp(z / (len * 0.5), -1, 1); // -1 корма .. +1 нос
      const v = OC.clamp((y + hullH * 0.5) / hullH, 0, 1); // 0 киль .. 1 верх фальшборта
      let wScale = 1.0;
      if (u > 0.24) {
        const bt = OC.clamp((u - 0.24) / 0.76, 0, 1);
        wScale = Math.max(0.035, Math.pow(Math.max(0, 1 - bt), 1.42));
      } else if (u < -0.62) {
        const st = OC.clamp((-u - 0.62) / 0.38, 0, 1);
        wScale = 1 - 0.34 * st * st;
      }
      // Развал бортов и кормовой подзор
      const flare = 0.66 + 0.34 * Math.pow(v, 0.68);
      // Седловатость (sheer): приподнятый бак спереди
      const sheer = (u > 0.22 ? Math.pow((u - 0.22) / 0.78, 1.85) * 1.95 : 0) + (u < -0.58 ? Math.pow((-u - 0.58) / 0.42, 1.8) * 0.42 : 0);
      x *= wScale * flare;
      // Сдвигаем по Y так, чтобы осадка была -2.35 м, а надводный борт +3.65 м
      y = (y + 0.65) + sheer * v;
      hp.setXYZ(i, x, y, z);
    }
    hullGeo.computeVertexNormals();
    OC.geoPrep(hullGeo);
    const cLower = new T.Color(pal.lower);
    const cStripe = new T.Color(pal.stripe);
    const cHull = new T.Color(pal.hull);
    const cDeck = new T.Color(pal.deck);
    OC.paint(hullGeo, (x, y, z, c) => {
      if (y > 3.25 && Math.abs(x) < beam * 0.43) c.copy(cDeck);
      else if (y < -0.45) c.copy(cLower);
      else if (y < 0.38) c.copy(cStripe);
      else c.copy(cHull);
    });
    parts.push(hullGeo);

    // 2. Бульбообразный носовой обтекатель под водой
    const bulb = new T.SphereGeometry(1.15, 10, 8);
    bulb.scale(0.85, 0.9, 2.3);
    OC.geoPrep(bulb);
    OC.paint(bulb, pal.lower);
    OC.xform(bulb, { p: [0, -1.35, len * 0.47] });
    parts.push(bulb);

    // 3. Передняя вертолётная палуба (Helideck) на полубаке
    const heliRing = new T.CylinderGeometry(3.6, 3.8, 0.32, 18);
    OC.geoPrep(heliRing);
    OC.paint(heliRing, (x, y, z, c) => {
      const r = Math.hypot(x, z);
      if (r > 3.15 && r < 3.45) c.set(0xf5c838);
      else c.set(0x28434a);
    });
    OC.xform(heliRing, { p: [0, 4.35, len * 0.25] });
    parts.push(heliRing);

    const hBarCol = 0xf7d042;
    for (const sx of [-0.95, 0.95]) {
      const hSide = new T.BoxGeometry(0.32, 0.08, 2.35);
      OC.geoPrep(hSide); OC.paint(hSide, hBarCol);
      OC.xform(hSide, { p: [sx, 4.53, len * 0.25] });
      parts.push(hSide);
    }
    const hCross = new T.BoxGeometry(2.0, 0.08, 0.32);
    OC.geoPrep(hCross); OC.paint(hCross, hBarCol);
    OC.xform(hCross, { p: [0, 4.53, len * 0.25] });
    parts.push(hCross);

    // 4. Надстройка лабораторий и ходовой рубки с крыльями мостика
    const labHouse = new T.BoxGeometry(beam * 0.78, 3.2, len * 0.30);
    OC.geoPrep(labHouse); OC.paint(labHouse, pal.superCol);
    OC.xform(labHouse, { p: [0, 5.1, len * 0.01] });
    parts.push(labHouse);

    const bridgeTier = new T.BoxGeometry(beam * 0.66, 2.4, len * 0.16);
    OC.geoPrep(bridgeTier); OC.paint(bridgeTier, pal.superCol);
    OC.xform(bridgeTier, { p: [0, 7.8, len * 0.04] });
    parts.push(bridgeTier);

    const bridgeRoof = new T.BoxGeometry(beam * 0.94, 0.45, len * 0.12);
    OC.geoPrep(bridgeRoof); OC.paint(bridgeRoof, pal.superCol);
    OC.xform(bridgeRoof, { p: [0, 9.15, len * 0.05] });
    parts.push(bridgeRoof);

    // Выдвижные крылья мостика (port / starboard)
    for (const s of [-1, 1]) {
      const wing = new T.BoxGeometry(beam * 0.22, 1.35, len * 0.075);
      OC.geoPrep(wing); OC.paint(wing, pal.superCol);
      OC.xform(wing, { p: [s * beam * 0.41, 8.2, len * 0.05] });
      parts.push(wing);
    }

    // 5. Дымовая труба, спасательный катер RHIB на шлюпбалках и спутниковые обтекатели VSAT
    const funnel = new T.CylinderGeometry(0.95, 1.25, 3.8, 12);
    OC.geoPrep(funnel);
    OC.paint(funnel, (x, y, z, c) => c.set(y > 1.25 ? 0x1c242b : pal.stripe));
    OC.xform(funnel, { r: [-0.14, 0, 0], p: [0, 8.8, -len * 0.09] });
    parts.push(funnel);

    for (const s of [-1, 1]) {
      const dome = new T.SphereGeometry(0.75, 10, 8);
      OC.geoPrep(dome); OC.paint(dome, 0xffffff);
      OC.xform(dome, { p: [s * 2.1, 10.1, len * 0.02] });
      parts.push(dome);
    }

    // Спасательный катер RHIB на правом борту
    const rhib = new T.SphereGeometry(1, 10, 6);
    rhib.scale(0.85, 0.65, 2.5);
    OC.geoPrep(rhib); OC.paint(rhib, 0xf25824);
    OC.xform(rhib, { p: [beam * 0.42, 4.4, -len * 0.06] });
    parts.push(rhib);

    // 6. Решётчатая радиолокационная мачта
    const mast = new T.CylinderGeometry(0.16, 0.44, 8.8, 8);
    OC.geoPrep(mast); OC.paint(mast, pal.superCol);
    OC.xform(mast, { p: [0, 13.4, len * 0.04] });
    parts.push(mast);

    const mastYard = new T.CylinderGeometry(0.08, 0.08, 4.6, 6);
    OC.geoPrep(mastYard); OC.paint(mastYard, pal.superCol);
    OC.xform(mastYard, { r: [0, 0, Math.PI / 2], p: [0, 15.2, len * 0.04] });
    parts.push(mastYard);

    // 7. Кормовой гидравлический А-образный кран для спуска ROV «Наутилус-IV» + лебёдка + трос
    const craneCol = pal.crane;
    for (const s of [-1, 1]) {
      const leg = new T.BoxGeometry(0.48, 8.6, 0.56);
      OC.geoPrep(leg); OC.paint(leg, craneCol);
      OC.xform(leg, { r: [-0.26, 0, s * 0.24], p: [s * 2.35, 7.1, -len * 0.43] });
      parts.push(leg);
    }
    const crossBeam = new T.BoxGeometry(4.4, 0.65, 0.72);
    OC.geoPrep(crossBeam); OC.paint(crossBeam, craneCol);
    OC.xform(crossBeam, { p: [0, 11.1, -len * 0.455] });
    parts.push(crossBeam);

    // Барабан океанографической лебёдки CTD + кабель-трос, уходящий за корму в воду
    const winch = new T.CylinderGeometry(0.95, 0.95, 2.2, 12);
    OC.geoPrep(winch); OC.paint(winch, 0x2a3642);
    OC.xform(winch, { r: [0, 0, Math.PI / 2], p: [0, 4.35, -len * 0.30] });
    parts.push(winch);

    const cable = new T.CylinderGeometry(0.045, 0.045, 14.5, 6);
    OC.geoPrep(cable); OC.paint(cable, 0xf27d24);
    OC.xform(cable, { p: [0, 3.85, -len * 0.455] });
    parts.push(cable);

    // Фальшборт и кормовая научная лаборатория-контейнер
    for (const s of [-1, 1]) {
      const rail = new T.BoxGeometry(0.28, 0.95, len * 0.42);
      OC.geoPrep(rail); OC.paint(rail, pal.hull);
      OC.xform(rail, { p: [s * beam * 0.46, 3.9, -len * 0.25] });
      parts.push(rail);
    }
    const sciContainer = new T.BoxGeometry(3.1, 2.4, 6.2);
    OC.geoPrep(sciContainer); OC.paint(sciContainer, 0xe8eff5);
    OC.xform(sciContainer, { p: [-beam * 0.22, 4.7, -len * 0.22] });
    parts.push(sciContainer);

    // 8. Подводная группа кормы: два бронзовых 4-лопастных гребных винта и рули
    const propCol = 0xc59a45;
    for (const s of [-1, 1]) {
      const rudder = new T.BoxGeometry(0.24, 2.2, 1.5);
      OC.geoPrep(rudder); OC.paint(rudder, pal.lower);
      OC.xform(rudder, { p: [s * 2.0, -1.25, -len * 0.44] });
      parts.push(rudder);

      const hub = new T.CylinderGeometry(0.28, 0.32, 0.85, 8);
      hub.rotateX(Math.PI / 2);
      OC.geoPrep(hub); OC.paint(hub, propCol);
      OC.xform(hub, { p: [s * 2.0, -1.45, -len * 0.40] });
      parts.push(hub);

      for (let b = 0; b < 4; b++) {
        const ba = (b / 4) * Math.PI * 2;
        const blade = new T.SphereGeometry(0.55, 6, 4);
        blade.scale(0.48, 1.0, 0.14);
        OC.geoPrep(blade); OC.paint(blade, propCol);
        OC.xform(blade, { r: [0.35, 0, ba], p: [s * 2.0 + Math.sin(ba) * 0.52, -1.45 + Math.cos(ba) * 0.52, -len * 0.405] });
        parts.push(blade);
      }
    }

    const merged = OC.mergeGeometries(parts);
    const hullMesh = new T.Mesh(merged, OC._FaunaCtx.creatureMat);
    group.add(hullMesh);

    // 9. Анимированный радар, ходовые огни, окна рубки и пенистая полоса у ватерлинии
    const radarBar = new T.Mesh(
      new T.BoxGeometry(2.8, 0.22, 0.32),
      new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.25 })
    );
    radarBar.position.set(0, 17.9, len * 0.04);
    group.add(radarBar);

    const winMat = new T.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.82 });
    const bridgeWin = new T.Mesh(new T.BoxGeometry(beam * 0.67, 0.72, len * 0.145), winMat);
    bridgeWin.position.set(0, 8.25, len * 0.048);
    group.add(bridgeWin);

    const aftWorkLightMat = new T.MeshBasicMaterial({ color: 0xffe4aa, transparent: true, opacity: 0.78 });
    for (const s of [-1, 1]) {
      const workPod = new T.Mesh(new T.BoxGeometry(0.48, 0.26, 0.35), aftWorkLightMat);
      workPod.position.set(s * 2.2, 10.65, -len * 0.44);
      group.add(workPod);
    }

    const navPort = new T.Mesh(new T.SphereGeometry(0.24, 6, 5), new T.MeshBasicMaterial({ color: 0xff3042 }));
    navPort.position.set(-beam * 0.49, 8.8, len * 0.06);
    group.add(navPort);
    const navStbd = new T.Mesh(new T.SphereGeometry(0.24, 6, 5), new T.MeshBasicMaterial({ color: 0x2eff72 }));
    navStbd.position.set(beam * 0.49, 8.8, len * 0.06);
    group.add(navStbd);
    const navMast = new T.Mesh(new T.SphereGeometry(0.26, 6, 5), new T.MeshBasicMaterial({ color: 0xfff8df }));
    navMast.position.set(0, 18.2, len * 0.04);
    group.add(navMast);

    // Водяной бурун / воротник пены вокруг корпуса (только в живом мире)
    let wakeMat = null;
    let wakeMesh = null;
    if (!preview) {
      const wakeGeo = new T.RingGeometry(beam * 0.56, beam * 0.92, 28, 1);
      wakeGeo.rotateX(-Math.PI / 2);
      wakeGeo.scale(1.0, 1.0, len / (beam * 1.12));
      wakeMat = new T.MeshBasicMaterial({
        color: 0xe6f8ff,
        transparent: true,
        opacity: 0.34,
        side: T.DoubleSide,
        depthWrite: false
      });
      wakeMesh = new T.Mesh(wakeGeo, wakeMat);
      wakeMesh.position.y = 0.09;
      group.add(wakeMesh);
    }

    const wx = opts.x || 0;
    const wz = opts.z || 0;
    const wyaw = opts.yaw || 0;
    group.position.set(wx, 0, wz);
    group.rotation.y = wyaw;
    group.userData.key = 'research_vessel';
    scene.add(group);

    // Точка обзора с воздуха у кормового/бортового траверза для кнопки «На борт R/V»
    const cosY = Math.cos(wyaw), sinY = Math.sin(wyaw);
    const fwdDist = -50; // позади кормы
    const sideDist = 26; // с правого борта
    const vx = wx + sinY * fwdDist + cosY * sideDist;
    const vz = wz + cosY * fwdDist - sinY * sideDist;
    const deckPos = [vx, 6.4, vz];
    const deckYaw = Math.atan2(wx - vx, wz - vz);

    return {
      key: 'research_vessel',
      sonarLabel: opts.name || 'Научно-исследовательское судно',
      shipInfo: {
        name: opts.name || 'Научно-исследовательское судно',
        x: wx,
        y: 0,
        z: wz,
        yaw: wyaw,
        deckPos,
        deckYaw
      },
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        const d = Math.hypot(wx - camPos.x, wz - camPos.z);
        if (d > 1150) { group.visible = false; return; }
        group.visible = true;
        radarBar.rotation.y += dt * 1.95;

        const seaAmp = OC.Weather && OC.Weather.getState ? OC.Weather.getState().waveAmp : 1.0;
        const waveScale = 0.55 + seaAmp * 0.48;
        group.position.y = Math.sin(time * 0.85 + wx * 0.01) * 0.24 * waveScale;
        group.rotation.x = Math.sin(time * 0.72 + 1.1) * 0.018 * waveScale;
        group.rotation.z = Math.cos(time * 0.64) * 0.026 * waveScale;

        const dayW = ctx ? ctx.dayW : 1.0;
        const nightBoost = 1.0 - dayW;
        winMat.opacity = 0.36 + nightBoost * 0.58;
        aftWorkLightMat.opacity = 0.24 + nightBoost * 0.72;
        if (wakeMat && wakeMesh) {
          const pulse = 0.5 + 0.5 * Math.sin(time * 2.1);
          wakeMat.opacity = (0.20 + pulse * 0.16) * (0.45 + dayW * 0.55);
          wakeMesh.scale.setScalar(1.0 + pulse * 0.045);
        }
      }
    };
  }

  /* ---------- Морские птицы в небе (фаэтонки, альбатросы и полярные крачки) ---------- */
  function makeSeabirdFlock(scene, biome, opts, emitSplash) {
    opts = opts || {};
    const variant = opts.variant || 'tropical';
    const preview = !!opts.singlePreview;
    const count = preview ? 1 : (opts.count || 7);

    const palMap = {
      tropical:  { body: 0xf7fbff, wing: 0xf2f7fc, tip: 0x1d2530, head: 0xf7fbff, beak: 0xf2a824, tail: 0xffffff, span: 1.55, tailLen: 0.72, fork: false },
      albatross: { body: 0x433b38, wing: 0x2f2926, tip: 0x1b1715, head: 0x5c534e, beak: 0x262426, tail: 0x2e2825, span: 2.35, tailLen: 0.34, fork: false },
      arctic:    { body: 0xf4f9fd, wing: 0xdce8f2, tip: 0x26323d, head: 0x151b22, beak: 0xd92e28, tail: 0xf4f9fd, span: 1.38, tailLen: 0.52, fork: true },
      booby:     { body: 0xf5f8fb, wing: 0x4d3c34, tip: 0x241b17, head: 0xf2f6fa, beak: 0x3eb4e8, tail: 0x42332c, span: 1.68, tailLen: 0.44, fork: false }
    };
    const bp = palMap[variant] || palMap.tropical;

    function buildSingleBird() {
      const bRoot = new T.Group();
      const bodyParts = [];

      const torso = new T.SphereGeometry(0.14, 10, 7);
      torso.scale(0.85, 0.8, 2.75);
      OC.geoPrep(torso);
      OC.paint(torso, (x, y, z, c) => {
        c.set(z > 0.22 ? bp.head : bp.body);
      });
      bodyParts.push(torso);

      const beak = new T.ConeGeometry(0.048, 0.28, 6);
      beak.rotateX(Math.PI / 2);
      OC.geoPrep(beak); OC.paint(beak, bp.beak);
      OC.xform(beak, { p: [0, 0.02, 0.48] });
      bodyParts.push(beak);

      if (bp.fork) {
        for (const s of [-1, 1]) {
          const ft = new T.ConeGeometry(0.045, bp.tailLen, 4);
          ft.rotateX(-Math.PI / 2);
          OC.geoPrep(ft); OC.paint(ft, bp.tail);
          OC.xform(ft, { r: [0, s * 0.24, 0], p: [s * 0.07, 0.02, -0.52] });
          bodyParts.push(ft);
        }
      } else {
        const tail = new T.ConeGeometry(0.085, bp.tailLen, 4);
        tail.scale(1.6, 0.16, 1.0);
        tail.rotateX(-Math.PI / 2);
        OC.geoPrep(tail); OC.paint(tail, bp.tail);
        OC.xform(tail, { p: [0, 0.02, -0.48] });
        bodyParts.push(tail);
      }

      const bodyGeo = OC.mergeGeometries(bodyParts);
      bRoot.add(new T.Mesh(bodyGeo, OC._FaunaCtx.creatureMat));

      const wingHalf = bp.span * 0.5;
      const wings = [];
      for (const s of [-1, 1]) {
        const wPivot = new T.Group();
        wPivot.position.set(s * 0.08, 0.03, 0.04);
        const wParts = [];

        const inner = new T.BoxGeometry(wingHalf * 0.58, 0.032, 0.26);
        OC.geoPrep(inner); OC.paint(inner, bp.wing);
        OC.xform(inner, { r: [0, s * 0.14, 0], p: [s * wingHalf * 0.28, 0, -0.02] });
        wParts.push(inner);

        const outer = new T.ConeGeometry(0.11, wingHalf * 0.56, 4);
        outer.scale(0.18, 1.0, 1.15);
        outer.rotateZ(-s * Math.PI / 2);
        OC.geoPrep(outer);
        OC.paint(outer, (x, y, z, c) => c.set(Math.abs(x) > wingHalf * 0.26 ? bp.tip : bp.wing));
        OC.xform(outer, { r: [0, -s * 0.22, 0], p: [s * wingHalf * 0.74, 0, -0.08] });
        wParts.push(outer);

        const wGeo = OC.mergeGeometries(wParts);
        wPivot.add(new T.Mesh(wGeo, OC._FaunaCtx.creatureMat));
        bRoot.add(wPivot);
        wings.push(wPivot);
      }

      bRoot.userData.key = 'seabird';
      return { root: bRoot, wingL: wings[0], wingR: wings[1] };
    }

    const rootGroup = new T.Group();
    rootGroup.userData.key = 'seabird';
    const members = [];
    const rng = OC.mulberry32(Math.abs(Math.round((opts.cx || 11) * 19 + (opts.cz || 7) * 31)) + 901);

    for (let i = 0; i < count; i++) {
      const b = buildSingleBird();
      const s = preview ? 1.2 : OC.lerp(0.88, 1.18, rng());
      b.root.scale.setScalar(s);
      rootGroup.add(b.root);
      members.push({
        root: b.root,
        wingL: b.wingL,
        wingR: b.wingR,
        ang: (i / count) * Math.PI * 2 + rng() * 0.7,
        rOff: OC.lerp(-14, 16, rng()),
        yOff: OC.lerp(-3.2, 4.4, rng()),
        phase: rng() * 6.28,
        flapSpd: OC.lerp(6.4, 8.6, rng()),
        swoopPhase: rng() * 6.28,
        prevLow: false
      });
    }

    if (preview) {
      members[0].wingL.rotation.z = -0.18;
      members[0].wingR.rotation.z = 0.18;
      rootGroup.rotation.z = 0.14;
      scene.add(rootGroup);
      return { key: 'seabird', getPosition: () => rootGroup.position, update() {} };
    }

    scene.add(rootGroup);
    const cx = opts.cx || 0;
    const cz = opts.cz || 0;
    const baseR = opts.r || 64;
    const baseY = opts.y || 10.5;
    const spd = opts.speed || 11.5;
    const _pos = new T.Vector3();
    const _next = new T.Vector3();

    return {
      key: 'seabird',
      getPosition: () => members[0].root.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 680) { rootGroup.visible = false; return; }
        rootGroup.visible = true;

        for (let i = 0; i < members.length; i++) {
          const m = members[i];
          m.ang += (spd / Math.max(24, baseR + m.rOff)) * dt;
          const rr = Math.max(22, baseR + m.rOff + Math.sin(time * 0.4 + m.phase) * 7.5);
          const bx = cx + Math.cos(m.ang) * rr;
          const bz = cz + Math.sin(m.ang) * rr * 0.84;

          // Периодическое пикирование к гребням волн и набор высоты в потоках ветра
          const swoopCycle = Math.sin(time * 0.38 + m.swoopPhase);
          const diveDrop = swoopCycle < -0.72 ? OC.smoothstep(-0.72, -1.0, swoopCycle) * (baseY + m.yOff - 0.72) : 0;
          const by = Math.max(0.65, baseY + m.yOff + Math.sin(time * 0.75 + m.phase) * 1.4 - diveDrop);

          const angN = m.ang + 0.08;
          const nx = cx + Math.cos(angN) * rr;
          const nz = cz + Math.sin(angN) * rr * 0.84;
          const ny = by;

          _pos.set(bx, by, bz);
          _next.set(nx, ny, nz);
          m.root.position.copy(_pos);
          m.root.lookAt(_next);

          // Чередование машущего полёта и парения в поворотах
          const soarMix = 0.5 + 0.5 * Math.sin(time * 0.62 + m.phase * 1.7);
          const flap = Math.sin(time * m.flapSpd + m.phase) * (1.0 - soarMix * 0.82) * 0.62;
          const dihedral = 0.14 * soarMix;
          m.wingL.rotation.z = flap - dihedral;
          m.wingR.rotation.z = -flap + dihedral;
          m.root.rotateZ(0.28 + Math.sin(time * 0.5 + m.phase) * 0.12);

          const isLow = by < 0.85;
          if (isLow && !m.prevLow && emitSplash) {
            emitSplash(_pos.set(bx, 0, bz), 0.34);
          }
          m.prevLow = isLow;
        }
      }
    };
  }

  /* ---------- Прыгающая стая дельфинов (Stenella / Lagenorhynchus) ---------- */
  function makeDolphinPod(scene, biome, opts, emitSplash) {
    opts = opts || {};
    const preview = !!opts.singlePreview;
    const count = preview ? 1 : (opts.count || 3);
    const variant = opts.variant || 'spinner'; // 'spinner' | 'pacific' | 'arctic'

    function buildSingleDolphin() {
      const dRoot = new T.Group();
      const parts = [];

      const dorsCol = variant === 'arctic' ? 0x1f2833 : variant === 'pacific' ? 0x2a3b4c : 0x35587c;
      const flankCol = variant === 'arctic' ? 0xcbd8e2 : variant === 'pacific' ? 0x8ea4b8 : 0x7b9bb8;
      const bellyCol = 0xedf4fa;

      const body = new T.SphereGeometry(1, 14, 10);
      body.scale(0.32, 0.35, 1.38);
      OC.geoPrep(body);
      OC.paint(body, (x, y, z, c) => {
        if (y > 0.08) c.set(dorsCol);
        else if (y > -0.09) c.set(flankCol);
        else c.set(bellyCol);
      });
      parts.push(body);

      // Клюв-рострум спереди (+Z)
      const beak = new T.ConeGeometry(0.11, 0.56, 8);
      beak.scale(0.85, 0.65, 1.0);
      beak.rotateX(Math.PI / 2);
      OC.geoPrep(beak);
      OC.paint(beak, (x, y, z, c) => c.set(y > 0 ? dorsCol : flankCol));
      OC.xform(beak, { p: [0, -0.04, 1.46] });
      parts.push(beak);

      // Серповидный спинной плавник
      const dorsal = new T.ConeGeometry(0.18, 0.54, 4);
      dorsal.scale(0.24, 1.0, 1.35);
      OC.geoPrep(dorsal); OC.paint(dorsal, dorsCol);
      OC.xform(dorsal, { r: [-0.38, 0, 0], p: [0, 0.44, -0.08] });
      parts.push(dorsal);

      // Грудные ласты
      for (const s of [-1, 1]) {
        const pec = new T.ConeGeometry(0.16, 0.58, 4);
        pec.scale(0.22, 1.0, 1.05);
        OC.geoPrep(pec); OC.paint(pec, dorsCol);
        OC.xform(pec, { r: [-0.36, 0, s * 1.15], p: [s * 0.34, -0.14, 0.34] });
        parts.push(pec);
      }

      const dGeo = OC.mergeGeometries(parts);
      dRoot.add(new T.Mesh(dGeo, OC._FaunaCtx.creatureMat));

      // Горизонтальный хвостовой плавник-лопасть
      const tailPivot = new T.Group();
      tailPivot.position.set(0, 0, -1.24);
      const tFluke = new T.ConeGeometry(0.46, 0.52, 4);
      tFluke.scale(1.65, 0.14, 1.0);
      tFluke.rotateX(-Math.PI / 2);
      OC.geoPrep(tFluke); OC.paint(tFluke, dorsCol);
      OC.xform(tFluke, { p: [0, 0, -0.24] });
      tailPivot.add(new T.Mesh(tFluke, OC._FaunaCtx.creatureMat));
      dRoot.add(tailPivot);

      dRoot.userData.key = 'dolphin';
      return { root: dRoot, tail: tailPivot };
    }

    const podGroup = new T.Group();
    podGroup.userData.key = 'dolphin';
    const members = [];
    for (let i = 0; i < count; i++) {
      const m = buildSingleDolphin();
      const sc = preview ? 1.0 : (opts.scale || 1.0) * (1.0 - i * 0.08);
      m.root.scale.setScalar(sc);
      podGroup.add(m.root);
      members.push({
        root: m.root,
        tail: m.tail,
        delay: i * 0.34,
        sideOff: i === 0 ? 0 : (i % 2 === 1 ? -1 : 1) * (1.7 + i * 0.65),
        prevY: -2.0
      });
    }

    if (preview) {
      members[0].root.rotation.x = -0.18;
      scene.add(podGroup);
      return { key: 'dolphin', getPosition: () => podGroup.position, update() {} };
    }

    scene.add(podGroup);
    const cx = opts.cx || 0;
    const cz = opts.cz || 0;
    const r = opts.r || 68;
    const spd = opts.speed || 7.4;
    let baseAng = Math.random() * 6.28;
    const leapFreq = 0.85;
    let porpoising = false;
    const _cur = new T.Vector3();
    const _nxt = new T.Vector3();

    function samplePath(ang, tVal, sideOff, out) {
      const rx = r + sideOff;
      const rz = (r * 0.88) + sideOff;
      const px = cx + Math.cos(ang) * rx;
      const pz = cz + Math.sin(ang) * rz;
      // Чередование плавания у поверхности и высоких параболических прыжков до +2.6 м
      const arc = Math.sin(tVal * leapFreq);
      const rawY = arc > 0.08 ? Math.pow((arc - 0.08) / 0.92, 0.78) * 2.55 - 0.15 : -2.6 + arc * 1.4;
      const fl = biome && biome.getHeight ? biome.getHeight(px, pz) : -25;
      out.set(px, Math.max(fl + 1.4, rawY), pz);
      return out;
    }

    return {
      key: 'dolphin',
      sonarLabel: 'Стая дельфинов',
      getPosition: () => members[0].root.position,
      isPorpoising: () => porpoising,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 560) {
          podGroup.visible = false;
          porpoising = false;
          return;
        }
        podGroup.visible = true;
        baseAng += (spd / r) * dt;
        porpoising = false;

        for (let i = 0; i < members.length; i++) {
          const m = members[i];
          const mt = time - m.delay;
          const mang = baseAng - m.delay * (spd / r);
          samplePath(mang, mt, m.sideOff, _cur);
          samplePath(mang + 0.055, mt + 0.09, m.sideOff, _nxt);

          m.root.position.copy(_cur);
          m.root.lookAt(_nxt);

          const inAir = _cur.y > 0.05;
          if (inAir) {
            porpoising = true;
            m.tail.rotation.x *= 0.9;
          } else {
            m.tail.rotation.x = Math.sin(mt * 10.5) * 0.36;
          }

          if (((m.prevY < 0 && _cur.y >= 0) || (m.prevY >= 0 && _cur.y < 0)) && emitSplash) {
            emitSplash(_cur, 0.92);
          }
          m.prevY = _cur.y;
        }
      }
    };
  }

  /* ---------- Летучие рыбы над тропическими волнами (Exocoetidae) ---------- */
  function makeFlyingFishPod(scene, biome, opts, emitSplash) {
    opts = opts || {};
    const preview = !!opts.singlePreview;
    const count = preview ? 1 : (opts.count || 7);

    function buildSingleFlyingFish() {
      const fRoot = new T.Group();
      const parts = [];

      const body = new T.SphereGeometry(0.11, 10, 7);
      body.scale(0.68, 0.72, 3.1);
      OC.geoPrep(body);
      OC.paint(body, (x, y, z, c) => c.set(y > 0.01 ? 0x20528a : 0xdff2fa));
      parts.push(body);

      const tail = new T.ConeGeometry(0.11, 0.24, 4);
      tail.scale(0.22, 1.35, 1.0);
      tail.rotateX(Math.PI / 2);
      OC.geoPrep(tail); OC.paint(tail, 0x2e6eb0);
      OC.xform(tail, { p: [0, -0.02, -0.40] });
      parts.push(tail);

      const bGeo = OC.mergeGeometries(parts);
      fRoot.add(new T.Mesh(bGeo, OC._FaunaCtx.creatureMat));

      const wings = [];
      for (const s of [-1, 1]) {
        const wPivot = new T.Group();
        wPivot.position.set(s * 0.05, 0.01, 0.14);
        const wing = new T.ConeGeometry(0.13, 0.44, 4);
        wing.scale(0.16, 1.0, 1.25);
        wing.rotateZ(-s * Math.PI / 2);
        OC.geoPrep(wing);
        OC.paint(wing, (x, y, z, c) => c.set(Math.abs(x) > 0.14 ? 0x6ce8ff : 0x3696cc));
        OC.xform(wing, { r: [0, -s * 0.18, 0], p: [s * 0.22, 0, -0.05] });
        wPivot.add(new T.Mesh(wing, OC._FaunaCtx.creatureMat));
        fRoot.add(wPivot);
        wings.push(wPivot);
      }

      fRoot.userData.key = 'flying_fish';
      return { root: fRoot, wingL: wings[0], wingR: wings[1] };
    }

    const podGroup = new T.Group();
    podGroup.userData.key = 'flying_fish';
    const members = [];
    const rng = OC.mulberry32(Math.abs(Math.round((opts.cx || 5) * 23 + (opts.cz || 3) * 41)) + 313);

    for (let i = 0; i < count; i++) {
      const f = buildSingleFlyingFish();
      f.root.scale.setScalar(preview ? 1.55 : OC.lerp(0.9, 1.2, rng()));
      podGroup.add(f.root);
      members.push({
        root: f.root,
        wingL: f.wingL,
        wingR: f.wingR,
        delay: i * 0.18 + rng() * 0.35,
        radOff: OC.lerp(-3.5, 3.5, rng()),
        prevY: -0.8
      });
    }

    if (preview) {
      members[0].wingL.rotation.z = -0.06;
      members[0].wingR.rotation.z = 0.06;
      scene.add(podGroup);
      return { key: 'flying_fish', getPosition: () => podGroup.position, update() {} };
    }

    scene.add(podGroup);
    const cx = opts.cx || 0;
    const cz = opts.cz || 0;
    const r = opts.r || 42;
    const spd = opts.speed || 9.2;
    let ang = Math.random() * 6.28;
    const _cur = new T.Vector3();
    const _nxt = new T.Vector3();

    return {
      key: 'flying_fish',
      getPosition: () => members[0].root.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 420) { podGroup.visible = false; return; }
        podGroup.visible = true;
        ang += (spd / r) * dt;

        for (let i = 0; i < members.length; i++) {
          const m = members[i];
          const mt = time - m.delay;
          const mang = ang - m.delay * (spd / r);
          const rr = r + m.radOff;
          const phase = ((mt * 0.24) % 1 + 1) % 1;
          // 50% времени скользят под водой, 50% — эффектный планирующий полёт над волнами
          const y = phase < 0.5
            ? Math.sin((phase / 0.5) * Math.PI) * 1.48 - 0.12
            : -0.9 - Math.sin(((phase - 0.5) / 0.5) * Math.PI) * 0.85;

          const x = cx + Math.cos(mang) * rr;
          const z = cz + Math.sin(mang) * rr;
          const nAng = mang + 0.05;
          const nx = cx + Math.cos(nAng) * rr;
          const nz = cz + Math.sin(nAng) * rr;

          _cur.set(x, y, z);
          _nxt.set(nx, y, nz);
          m.root.position.copy(_cur);
          m.root.lookAt(_nxt);

          const gliding = y > 0.02;
          const wingOpen = gliding ? 0.08 + Math.sin(time * 26 + i) * 0.06 : -0.68;
          m.wingL.rotation.z = -wingOpen;
          m.wingR.rotation.z = wingOpen;

          if (((m.prevY < 0 && y >= 0) || (m.prevY >= 0 && y < 0)) && emitSplash) {
            emitSplash(_cur, 0.28);
          }
          m.prevY = y;
        }
      }
    };
  }

  /* ---------- Бесконечные пузыри, биолюминесцентный планктон и глубинный «морской снег» ---------- */

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

  function makeOrca(scene, biome, opts, emitSplash) {
    opts = opts || {};
    const len = opts.len || 7.2;
    const group = new T.Group();
    const parts = [];

    const body = new T.SphereGeometry(1, 20, 14);
    body.scale(len * 0.145, len * 0.16, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5);
      const taper = t < 0 ? (1 - 0.72 * Math.pow(-t, 1.35)) : (1 - 0.35 * Math.pow(t, 2.2));
      bp.setXYZ(i, x * taper, y * taper, z);
    }
    body.computeVertexNormals();
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => {
      const zn = z / (len * 0.5);
      // Классическая чёрно-белая расцветка косатки: белое глазное пятно, серое седло, белое брюхо
      const eyePatch = Math.abs(x) > len * 0.055 && y > 0.02 && zn > 0.42 && zn < 0.68;
      const saddle = y > len * 0.06 && zn < 0.05 && zn > -0.22;
      const belly = y < -len * 0.02 || (zn < -0.15 && zn > -0.5 && Math.abs(x) > len * 0.05 && y < len * 0.04);
      if (eyePatch || belly) c.set(0xf5f9fc);
      else if (saddle) c.set(0x7c868f);
      else c.set(0x11151a);
    });
    parts.push(body);

    // Высокий саблевидный спинной плавник косатки (до 1.4 м)
    const dor = new T.ConeGeometry(len * 0.075, len * 0.24, 5);
    dor.scale(0.24, 1.0, 1.05);
    OC.geoPrep(dor);
    OC.paint(dor, 0x12161b);
    OC.xform(dor, { r: [-0.22, 0, 0], p: [0, len * 0.21, len * 0.04] });
    parts.push(dor);

    // Округлые грудные ласты-вёсла
    const pec = new T.SphereGeometry(len * 0.09, 9, 7);
    pec.scale(0.18, 0.88, 1.08);
    OC.geoPrep(pec);
    OC.paint(pec, 0x12161b);
    for (const s of [-1, 1]) {
      const pm = pec.clone();
      OC.xform(pm, { r: [0.15, s * 0.35, -s * 1.15], p: [s * len * 0.14, -len * 0.05, len * 0.16] });
      parts.push(pm);
    }

    group.add(new T.Mesh(OC.mergeGeometries(parts), OC._FaunaCtx.creatureMat));

    // Горизонтальная хвостовая лопасть
    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.45);
    const fluke = new T.ConeGeometry(len * 0.16, len * 0.18, 5);
    fluke.scale(1.85, 0.18, 1.0);
    fluke.rotateX(-Math.PI / 2);
    OC.geoPrep(fluke);
    OC.paint(fluke, (x, y, z, c) => c.set(y < 0 ? 0xeef4f8 : 0x11151a));
    const flM = new T.Mesh(fluke, OC._FaunaCtx.creatureMat);
    flM.position.set(0, 0, -len * 0.08);
    tailPivot.add(flM);
    group.add(tailPivot);

    group.userData.key = 'orca';
    scene.add(group);

    if (opts.preview) {
      return { key: 'orca', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 180, cz = opts.cz || -120, rad = opts.r || 68, baseY = opts.y || -18;
    let ang = Math.random() * 6.28;
    let prevY = baseY;
    const _a = new T.Vector3(), _b = new T.Vector3();

    return {
      key: 'orca',
      isActivePredator: true,
      isPorpoising: () => group.position.y > -0.25,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 760) { group.visible = false; return; }
        group.visible = true;
        ang += ((opts.speed || 5.4) / rad) * dt;
        const surfWave = Math.sin(time * 0.34 + (opts.phase || 0));
        const x = cx + Math.cos(ang) * rad;
        const z = cz + Math.sin(ang) * rad;
        const x2 = cx + Math.cos(ang + 0.05) * rad;
        const z2 = cz + Math.sin(ang + 0.05) * rad;
        const y = Math.max((biome ? biome.getHeight(x, z) : -35) + 4.5, baseY + surfWave * (Math.abs(baseY) + 3.4));
        const y2 = Math.max((biome ? biome.getHeight(x2, z2) : -35) + 4.5, baseY + Math.sin((time + 0.08) * 0.34 + (opts.phase || 0)) * (Math.abs(baseY) + 3.4));
        _a.set(x, y, z);
        _b.set(x2, y2, z2);
        group.position.copy(_a);
        group.lookAt(_b);
        tailPivot.rotation.x = Math.sin(time * 3.8 + (opts.phase || 0)) * 0.35;
        if (((prevY < 0 && y >= 0) || (prevY >= 0 && y < 0)) && emitSplash) emitSplash(_a, 0.72);
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
  function makePinkDolphin(scene, biome, opts, emitSplash) {
    opts = opts || {};
    const len = opts.len || 2.55;
    const preview = !!opts.preview;
    const group = new T.Group();

    const bodyG = new T.SphereGeometry(len * 0.5, 16, 12);
    bodyG.scale(0.21, 0.23, 1.0);
    const bp = bodyG.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const z = bp.getZ(i);
      const u = z / (len * 0.5); // +1 голова, -1 хвост
      const taper = u > 0.55 ? 0.58 + 0.42 * (1 - (u - 0.55) / 0.45) : (u < -0.2 ? 0.35 + 0.65 * (1 + u) / 0.8 : 1.0);
      bp.setX(i, bp.getX(i) * taper);
      bp.setY(i, bp.getY(i) * taper);
    }
    OC.geoPrep(bodyG);
    bodyG.computeVertexNormals();
    OC.paint(bodyG, (x, y, z, c) => c.setHex(y > 0.04 ? 0xd98fa2 : 0xf4b6c6));
    group.add(new T.Mesh(bodyG, OC._FaunaCtx.creatureMat));

    // Характерный выпуклый сонарный лоб (мелон) и узкий длинный рострум
    const melonG = new T.SphereGeometry(len * 0.088, 10, 8);
    OC.geoPrep(melonG);
    OC.paint(melonG, 0xe89eb0);
    const melon = new T.Mesh(melonG, OC._FaunaCtx.creatureMat);
    melon.position.set(0, len * 0.045, len * 0.38);
    group.add(melon);

    const beakG = new T.CylinderGeometry(len * 0.016, len * 0.036, len * 0.24, 8);
    OC.geoPrep(beakG);
    OC.paint(beakG, 0xf2a7b8);
    const beak = new T.Mesh(beakG, OC._FaunaCtx.creatureMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -len * 0.012, len * 0.54);
    group.add(beak);

    // Широкие гибкие грудные плавники и низкий спинной гребень
    for (const s of [-1, 1]) {
      const pf = new T.BoxGeometry(len * 0.16, len * 0.018, len * 0.13);
      OC.geoPrep(pf);
      OC.paint(pf, 0xe395a8);
      const pm = new T.Mesh(pf, OC._FaunaCtx.creatureMat);
      pm.position.set(s * len * 0.11, -len * 0.05, len * 0.14);
      pm.rotation.set(0.1, s * 0.35, -s * 0.32);
      group.add(pm);
    }
    const ridgeG = new T.BoxGeometry(len * 0.024, len * 0.045, len * 0.24);
    OC.geoPrep(ridgeG);
    OC.paint(ridgeG, 0xcc7b92);
    const ridge = new T.Mesh(ridgeG, OC._FaunaCtx.creatureMat);
    ridge.position.set(0, len * 0.105, -len * 0.06);
    group.add(ridge);

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.44);
    const flukeG = new T.BoxGeometry(len * 0.24, len * 0.018, len * 0.11);
    OC.geoPrep(flukeG);
    OC.paint(flukeG, 0xd88397);
    const fluke = new T.Mesh(flukeG, OC._FaunaCtx.creatureMat);
    fluke.position.set(0, 0, -len * 0.05);
    tailPivot.add(fluke);
    group.add(tailPivot);

    group.userData.key = 'pink_dolphin';
    scene.add(group);
    if (preview) return { key: 'pink_dolphin', getPosition: () => group.position, update() {} };

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 42, spd = opts.speed || 4.8;
    const _a = new T.Vector3(), _b = new T.Vector3();
    let ang = opts.phase || 0, prevY = -4;

    return {
      key: 'pink_dolphin',
      getPosition: () => group.position,
      update(dt, time) {
        ang += (spd / Math.max(18, r)) * dt;
        const surfWave = Math.sin(time * 0.42 + (opts.phase || 0));
        const breathe = surfWave > 0.72 ? OC.smoothstep(0.72, 1.0, surfWave) : 0;
        const x = cx + Math.cos(ang) * r;
        const z = cz + Math.sin(ang) * r * 0.78;
        const fl = biome.getHeight(x, z);
        const y = Math.max(fl + 1.4, -3.8 + breathe * 4.15);

        const ang2 = ang + 0.06;
        const nx = cx + Math.cos(ang2) * r;
        const nz = cz + Math.sin(ang2) * r * 0.78;
        const ny = Math.max(biome.getHeight(nx, nz) + 1.4, -3.8 + breathe * 4.05);

        _a.set(x, y, z); _b.set(nx, ny, nz);
        group.position.copy(_a);
        group.lookAt(_b);
        tailPivot.rotation.x = Math.sin(time * 5.2 + (opts.phase || 0)) * 0.34;
        if (((prevY < 0 && y >= 0) || (prevY >= 0 && y < 0)) && emitSplash) emitSplash(_a, 0.38);
        prevY = y;
      }
    };
  }

  /* ---------- Гигантская арапаима (Arapaima gigas) ---------- */
  function makeArapaima(scene, biome, opts, emitSplash) {
    opts = opts || {};
    const len = opts.len || 2.85;
    const preview = !!opts.preview;
    const group = new T.Group();

    const bodyG = new T.CylinderGeometry(len * 0.088, len * 0.064, len * 0.78, 12, 1);
    bodyG.rotateX(Math.PI / 2);
    bodyG.scale(0.86, 1.15, 1.0);
    OC.geoPrep(bodyG);
    OC.paint(bodyG, (x, y, z, c) => {
      const u = OC.clamp((z + len * 0.39) / (len * 0.78), 0, 1);
      if (u < 0.38 && y < 0.06) c.setHex(0xd93829);
      else c.setHex(y > 0.04 ? 0x2f4d36 : 0x728a58);
    });
    group.add(new T.Mesh(bodyG, OC._FaunaCtx.creatureMat));

    const headG = new T.SphereGeometry(len * 0.095, 10, 8);
    headG.scale(0.95, 0.78, 1.45);
    OC.geoPrep(headG);
    OC.paint(headG, 0x3a543c);
    const head = new T.Mesh(headG, OC._FaunaCtx.creatureMat);
    head.position.set(0, 0, len * 0.42);
    group.add(head);

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.39);
    const tailG = new T.BoxGeometry(len * 0.028, len * 0.22, len * 0.19);
    OC.geoPrep(tailG);
    OC.paint(tailG, 0xc92c24);
    const tm = new T.Mesh(tailG, OC._FaunaCtx.creatureMat);
    tm.position.set(0, 0, -len * 0.1);
    tailPivot.add(tm);
    group.add(tailPivot);

    group.userData.key = 'arapaima';
    scene.add(group);
    if (preview) return { key: 'arapaima', getPosition: () => group.position, update() {} };

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 32, spd = opts.speed || 2.6;
    const _a = new T.Vector3(), _b = new T.Vector3();
    let ang = opts.phase || 0, prevY = -5;

    return {
      key: 'arapaima',
      getPosition: () => group.position,
      update(dt, time) {
        ang += (spd / Math.max(16, r)) * dt;
        const gulp = Math.sin(time * 0.32 + (opts.phase || 0)) > 0.82 ? OC.smoothstep(0.82, 1.0, Math.sin(time * 0.32 + (opts.phase || 0))) : 0;
        const x = cx + Math.cos(ang) * r;
        const z = cz + Math.sin(ang) * r * 0.85;
        const fl = biome.getHeight(x, z);
        const y = Math.max(fl + 1.2, (opts.y || -4.2) + gulp * 4.1);
        const nx = cx + Math.cos(ang + 0.06) * r;
        const nz = cz + Math.sin(ang + 0.06) * r * 0.85;
        _a.set(x, y, z); _b.set(nx, y, nz);
        group.position.copy(_a);
        group.lookAt(_b);
        tailPivot.rotation.y = Math.sin(time * 3.8 + (opts.phase || 0)) * 0.26;
        if (((prevY < -0.15 && y >= -0.15) || (prevY >= -0.15 && y < -0.15)) && emitSplash) emitSplash(_a, 0.32);
        prevY = y;
      }
    };
  }

  /* ---------- Электрический угорь (Electrophorus voltai) ---------- */
  function makeElectricEel(scene, biome, opts) {
    opts = opts || {};
    const len = opts.len || 2.05;
    const preview = !!opts.preview;
    const group = new T.Group();
    const segs = [];
    const nSeg = 11;

    for (let i = 0; i < nSeg; i++) {
      const u = i / (nSeg - 1);
      const rad = len * 0.044 * (1 - 0.65 * Math.pow(u, 1.4));
      const sg = new T.SphereGeometry(rad, 8, 6);
      sg.scale(0.85, 1.05, 1.65);
      OC.geoPrep(sg);
      OC.paint(sg, (x, y, z, c) => c.setHex(y < 0 && u < 0.32 ? 0xff7a2e : 0x2e2a24));
      const m = new T.Mesh(sg, OC._FaunaCtx.creatureMat);
      m.position.set(0, 0, (0.45 - u) * len * 0.88);
      group.add(m);
      segs.push(m);
    }

    // Биоэлектрический импульсный ореол при разряде
    const sparkMat = new T.MeshBasicMaterial({ color: 0x62f2ff, transparent: true, opacity: 0.0, depthWrite: false, blending: T.AdditiveBlending });
    const spark = new T.Mesh(new T.SphereGeometry(len * 0.34, 12, 8), sparkMat);
    spark.scale.set(0.65, 0.55, 1.7);
    group.add(spark);

    group.userData.key = 'electric_eel';
    scene.add(group);
    if (preview) {
      sparkMat.opacity = 0.25;
      return { key: 'electric_eel', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 16, spd = opts.speed || 1.9;
    const _a = new T.Vector3(), _b = new T.Vector3();
    let ang = opts.phase || 0;

    return {
      key: 'electric_eel',
      getPosition: () => group.position,
      update(dt, time) {
        ang += (spd / Math.max(10, r)) * dt;
        const x = cx + Math.cos(ang) * r;
        const z = cz + Math.sin(ang) * r * 0.82;
        const y = biome.getHeight(x, z) + 0.85 + Math.sin(time * 0.9 + (opts.phase || 0)) * 0.35;
        const nx = cx + Math.cos(ang + 0.08) * r;
        const nz = cz + Math.sin(ang + 0.08) * r * 0.82;
        _a.set(x, y, z); _b.set(nx, y, nz);
        group.position.copy(_a);
        group.lookAt(_b);
        for (let i = 1; i < segs.length; i++) {
          segs[i].position.x = Math.sin(time * 6.5 - i * 0.65 + (opts.phase || 0)) * 0.06 * i;
        }
        const burst = Math.max(0, Math.sin(time * 1.1 + (opts.phase || 0)));
        sparkMat.opacity = burst > 0.92 ? (burst - 0.92) * 5.2 : 0.0;
      }
    };
  }

  /* ---------- Речной глазчатый скат моторо (Potamotrygon motoro) ---------- */
  function makeRiverStingray(scene, biome, opts) {
    opts = opts || {};
    const sz = opts.scale || 1.0;
    const preview = !!opts.preview;
    const group = new T.Group();

    const discG = new T.CylinderGeometry(0.68 * sz, 0.72 * sz, 0.08 * sz, 18);
    discG.scale(1.0, 1.0, 1.08);
    OC.geoPrep(discG);
    OC.paint(discG, (x, y, z, c) => {
      const spot = Math.sin(x * 13.0 + z * 9.0) * Math.cos(z * 12.0 - x * 7.0);
      if (y > 0.01 && spot > 0.62) c.setHex(0xff8c28);
      else if (y > 0.01 && spot > 0.42) c.setHex(0x1a1410);
      else c.setHex(y > 0 ? 0x4f3e2e : 0xe3d2bc);
    });
    group.add(new T.Mesh(discG, OC._FaunaCtx.creatureMat));

    const tailG = new T.ConeGeometry(0.055 * sz, 0.95 * sz, 6);
    tailG.rotateX(-Math.PI / 2);
    OC.geoPrep(tailG);
    OC.paint(tailG, 0x3b2e22);
    const tail = new T.Mesh(tailG, OC._FaunaCtx.creatureMat);
    tail.position.set(0, 0, -0.95 * sz);
    group.add(tail);

    group.userData.key = 'river_stingray';
    scene.add(group);
    if (preview) return { key: 'river_stingray', getPosition: () => group.position, update() {} };

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 18, spd = opts.speed || 1.8;
    const _a = new T.Vector3(), _b = new T.Vector3();
    let ang = opts.phase || 0;

    return {
      key: 'river_stingray',
      getPosition: () => group.position,
      update(dt, time) {
        ang += (spd / Math.max(10, r)) * dt;
        const x = cx + Math.cos(ang) * r;
        const z = cz + Math.sin(ang) * r * 0.75;
        const y = biome.getHeight(x, z) + 0.45 + Math.sin(time * 2.1 + (opts.phase || 0)) * 0.14;
        const nx = cx + Math.cos(ang + 0.08) * r;
        const nz = cz + Math.sin(ang + 0.08) * r * 0.75;
        _a.set(x, y, z); _b.set(nx, y, nz);
        group.position.copy(_a);
        group.lookAt(_b);
      }
    };
  }

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

  OC._FaunaBuilders.makeResearchVessel = makeResearchVessel;
  OC._FaunaBuilders.makeSeabirdFlock = makeSeabirdFlock;
  OC._FaunaBuilders.makeDolphinPod = makeDolphinPod;
  OC._FaunaBuilders.makeFlyingFishPod = makeFlyingFishPod;
  OC._FaunaBuilders.makeOceanSunfish = makeOceanSunfish;
  OC._FaunaBuilders.makeMarineIguana = makeMarineIguana;
  OC._FaunaBuilders.makeGalapagosPenguin = makeGalapagosPenguin;
  OC._FaunaBuilders.makeOrca = makeOrca;
  OC._FaunaBuilders.makeMobulaRay = makeMobulaRay;
  OC._FaunaBuilders.makePinkDolphin = makePinkDolphin;
  OC._FaunaBuilders.makeArapaima = makeArapaima;
  OC._FaunaBuilders.makeElectricEel = makeElectricEel;
  OC._FaunaBuilders.makeRiverStingray = makeRiverStingray;
  OC._FaunaBuilders.makeDarwinsArch = makeDarwinsArch;
  OC._FaunaBuilders.makeFumaroleVents = makeFumaroleVents;
})(window.OC);
