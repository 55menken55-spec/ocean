/* ================= ФАУНА: НАДВОДНЫЙ МИР И МОРСКИЕ ПТИЦЫ ================= */
/* НИС «Океан-1» (корпус, надстройка, радар, лебёдка) и стая олуш/крачек над судном. */
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

  OC._FaunaBuilders.makeResearchVessel = makeResearchVessel;
  OC._FaunaBuilders.makeSeabirdFlock = makeSeabirdFlock;
})(window.OC);
