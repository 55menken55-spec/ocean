/* ================= ФАУНА: КИТООБРАЗНЫЕ И ЛЕТУЧИЕ РЫБЫ ================= */
/* Стая дельфинов-афалин, косатка, розовый речной дельфин (боуто) и летучие рыбы. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

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

  OC._FaunaBuilders.makeDolphinPod = makeDolphinPod;
  OC._FaunaBuilders.makeOrca = makeOrca;
  OC._FaunaBuilders.makePinkDolphin = makePinkDolphin;
  OC._FaunaBuilders.makeFlyingFishPod = makeFlyingFishPod;
})(window.OC);
