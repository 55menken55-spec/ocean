/* ================= ФАУНА ПОДЛЁДНОГО ОКЕАНА ЕВРОПЫ: КРИОБИОТА ================= */
/* Гипотетические существа глобального океана Европы. Ни одно из них не имеет
   земного аналога: плоские «планеры», крио-криль, панцирный хищник и фонарная медуза. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
  const B = window.OC._FaunaBuilders;
  const GEO = (B.geoBuilders = B.geoBuilders || {});

  const COL = (hex) => new T.Color(hex);

  /* ---------- Геометрии для стай (инстансинг) ---------- */

  /* Ледяной планер: плоское полупрозрачное тело с длинными «крыльями» */
  function buildCryoGliderGeo() {
    const parts = [];
    const cBody = COL(0xbfe6f2);
    const cBelly = COL(0x6fa7c4);
    const cFin = COL(0xd9f4ff);

    const body = new T.SphereGeometry(1, 18, 10);
    body.scale(0.52, 0.11, 0.19);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = OC.clamp(x / 0.52, -1, 1);
      const taper = 1 - 0.55 * Math.pow(OC.clamp(-t, 0, 1), 1.5);
      bp.setXYZ(i, x * (t > 0 ? 1 - 0.25 * t * t : 1), y * taper, z * taper);
    }
    body.computeVertexNormals();
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => {
      const t = OC.clamp(x / 0.52, -1, 1);
      c.copy(cBelly).lerp(cBody, OC.smoothstep(-0.7, 0.9, t));
    });
    parts.push(body);

    // Крылья-«плавники»: широкие, полупрозрачные, слегка загнуты вниз
    for (const s of [-1, 1]) {
      const wing = new T.PlaneGeometry(0.92, 0.62, 3, 2);
      const wp = wing.attributes.position;
      for (let i = 0; i < wp.count; i++) {
        const u = OC.clamp(wp.getX(i) / 0.92 + 0.5, 0, 1);
        const v = OC.clamp(wp.getY(i) / 0.62 + 0.5, 0, 1);
        wp.setXYZ(i, wp.getX(i) * (1 - v * 0.35), wp.getY(i), wp.getZ(i) - Math.sin(u * Math.PI) * 0.09 - v * 0.05);
      }
      wing.computeVertexNormals();
      OC.geoPrep(wing);
      OC.paint(wing, (x, y, z, c) => c.copy(cFin).lerp(cBody, 0.35 + Math.sin(y * 6.0) * 0.12));
      OC.xform(wing, { r: [Math.PI / 2, 0, 0], p: [-0.08, 0.01, s * 0.31] });
      parts.push(wing);
    }

    // Хвостовые нити-сенсоры
    for (const s of [-1, 1]) {
      const tail = new T.ConeGeometry(0.022, 0.5, 5);
      OC.geoPrep(tail);
      OC.paint(tail, cFin);
      OC.xform(tail, { r: [0, 0, Math.PI / 2 + 0.2], s: [1, 1, 0.5], p: [-0.62, 0, s * 0.07] });
      parts.push(tail);
    }

    // Светящиеся сенсорные узлы вместо глаз
    for (const s of [-1, 1]) {
      const node = new T.SphereGeometry(0.045, 7, 5);
      OC.geoPrep(node);
      OC.paint(node, 0x9ef0ff);
      OC.xform(node, { p: [0.34, 0.02, s * 0.1] });
      parts.push(node);
    }

    return OC.mergeGeometries(parts);
  }
  GEO.cryo_glider = buildCryoGliderGeo;

  /* Крио-криль: крошечный прозрачный рачок, живущий под базальным льдом */
  function buildCryoKrillGeo() {
    const parts = [];
    const cBody = COL(0xf2f8ff);
    const cCore = COL(0xa9d8ea);

    const body = new T.SphereGeometry(1, 12, 8);
    body.scale(0.13, 0.055, 0.05);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const t = OC.clamp(bp.getX(i) / 0.13, -1, 1);
      bp.setXYZ(i, bp.getX(i), bp.getY(i) * (1 - 0.5 * Math.pow(OC.clamp(-t, 0, 1), 1.4)), bp.getZ(i) * (1 - 0.4 * Math.pow(OC.clamp(-t, 0, 1), 1.4)));
    }
    body.computeVertexNormals();
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.copy(cCore).lerp(cBody, OC.clamp(x / 0.13 * 0.5 + 0.5, 0, 1)));
    parts.push(body);

    // Усики
    for (const s of [-1, 1]) {
      const ant = new T.ConeGeometry(0.012, 0.24, 4);
      OC.geoPrep(ant);
      OC.paint(ant, cBody);
      OC.xform(ant, { r: [0, 0, Math.PI / 2 - 0.5], p: [0.2, 0.02, s * 0.03] });
      parts.push(ant);
    }
    // Светящаяся точка на спине
    const dot = new T.SphereGeometry(0.022, 6, 5);
    OC.geoPrep(dot);
    OC.paint(dot, 0x9ef0ff);
    OC.xform(dot, { p: [0.02, 0.05, 0] });
    parts.push(dot);
    return OC.mergeGeometries(parts);
  }
  GEO.cryo_krill = buildCryoKrillGeo;

  /* Сиповая креветка: крупная донная ракообразная возле серпентинитовых труб */
  function buildCryoShrimpGeo() {
    const parts = [];
    const cBody = COL(0xe6d3bd);
    const cBack = COL(0xb08a6e);
    const cGlow = COL(0xffb066);

    const body = new T.SphereGeometry(1, 14, 9);
    body.scale(0.3, 0.09, 0.08);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const t = OC.clamp(bp.getX(i) / 0.3, -1, 1);
      const seg = 1 - 0.28 * Math.abs(Math.sin(t * 5.0));
      bp.setXYZ(i, bp.getX(i), bp.getY(i) * seg, bp.getZ(i) * seg);
    }
    body.computeVertexNormals();
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => {
      const t = OC.clamp(x / 0.3, -1, 1);
      c.copy(cBack).lerp(cBody, OC.smoothstep(-0.8, 0.9, t));
    });
    parts.push(body);

    // Головной щит и «усы» с фотофорами
    const head = new T.SphereGeometry(0.085, 9, 7);
    head.scale(1.15, 0.85, 1);
    OC.geoPrep(head);
    OC.paint(head, cBody);
    OC.xform(head, { p: [0.3, 0.01, 0] });
    parts.push(head);

    for (const s of [-1, 1]) {
      const ant = new T.ConeGeometry(0.018, 0.4, 5);
      OC.geoPrep(ant);
      OC.paint(ant, cGlow);
      OC.xform(ant, { r: [0, 0, Math.PI / 2 - 0.35], p: [0.48, 0.02, s * 0.05] });
      parts.push(ant);
    }
    // Брюшные лапки
    for (let i = 0; i < 4; i++) {
      const x = 0.06 - i * 0.1;
      for (const s of [-1, 1]) {
        const leg = new T.ConeGeometry(0.016, 0.16, 4);
        OC.geoPrep(leg);
        OC.paint(leg, cBack);
        OC.xform(leg, { r: [0, 0, s * 1.05], p: [x, -0.06, s * 0.07] });
        parts.push(leg);
      }
    }
    // Хвостовые лопасти
    const tail = new T.ConeGeometry(0.07, 0.18, 5);
    OC.geoPrep(tail);
    OC.paint(tail, cBody);
    OC.xform(tail, { r: [0, 0, Math.PI / 2], s: [1, 1, 0.25], p: [-0.36, 0, 0] });
    parts.push(tail);
    return OC.mergeGeometries(parts);
  }
  GEO.cryo_shrimp = buildCryoShrimpGeo;

  /* ---------- Ледяной скат: крупный «планер» с машущими крыльями ---------- */
  function makeCryoRay(scene, biome, opts) {
    opts = opts || {};
    const group = new T.Group();
    group.userData.key = 'cryo_ray';

    const cBody = COL(0xbfe6f2);
    const cBelly = COL(0x5f8fae);
    const cFin = COL(0xdff6ff);

    const parts = [];
    const body = new T.SphereGeometry(1, 20, 12);
    body.scale(1.15, 0.22, 0.62);
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.copy(cBelly).lerp(cBody, OC.clamp(y * 2.2 + 0.55, 0, 1)));
    parts.push(body);

    const tail = new T.ConeGeometry(0.11, 1.5, 6);
    OC.geoPrep(tail);
    OC.paint(tail, cFin);
    OC.xform(tail, { r: [0, 0, Math.PI / 2], s: [1, 1, 0.4], p: [-1.5, 0, 0] });
    parts.push(tail);
    for (const s of [-1, 1]) {
      const horn = new T.ConeGeometry(0.05, 0.55, 5);
      OC.geoPrep(horn);
      OC.paint(horn, cFin);
      OC.xform(horn, { r: [0, 0, Math.PI / 2 + 0.4], p: [1.0, 0.05, s * 0.22] });
      parts.push(horn);
    }
    const core = new T.Mesh(OC.mergeGeometries(parts), OC._FaunaCtx.creatureMat || new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.05 }));
    group.add(core);

    // Крылья
    const wings = [];
    for (const s of [-1, 1]) {
      const wparts = [];
      const wing = new T.PlaneGeometry(2.1, 1.35, 4, 3);
      const wp = wing.attributes.position;
      for (let i = 0; i < wp.count; i++) {
        const u = OC.clamp(wp.getX(i) / 2.1 + 0.5, 0, 1);
        const v = OC.clamp(wp.getY(i) / 1.35 + 0.5, 0, 1);
        wp.setXYZ(i, wp.getX(i) * (1 - v * 0.3), wp.getY(i), wp.getZ(i) - Math.sin(u * Math.PI) * 0.16 - v * 0.1);
      }
      wing.computeVertexNormals();
      OC.geoPrep(wing);
      OC.paint(wing, (x, y, z, c) => c.copy(cFin).lerp(cBody, 0.3 + Math.sin(y * 5.0) * 0.14));
      wparts.push(wing);
      const wg = new T.Mesh(OC.mergeGeometries(wparts), OC._FaunaCtx.creatureMat || core.material);
      wg.position.set(-0.1, 0.02, s * 0.62);
      wg.rotation.x = Math.PI / 2;
      group.add(wg);
      wings.push(wg);
    }

    const scale = opts.scale || 1.0;
    group.scale.setScalar(scale);
    scene.add(group);

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 60, speed = opts.speed || 2.0;
    const ang0 = Math.random() * 6.28;
    const baseY = opts.y || -40;

    return {
      key: 'cryo_ray',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 460) { group.visible = false; return; }
        group.visible = true;
        const ang = ang0 + time * speed / Math.max(8, r);
        group.position.set(cx + Math.cos(ang) * r, baseY + Math.sin(time * 0.5 + ang0) * 2.4, cz + Math.sin(ang) * r);
        group.rotation.y = -ang + Math.PI / 2;
        const flap = Math.sin(time * 1.35 + ang0) * 0.42;
        wings[0].rotation.x = Math.PI / 2 + flap;
        wings[1].rotation.x = Math.PI / 2 - flap;
      }
    };
  }
  B.makeCryoRay = makeCryoRay;

  /* ---------- Броненосец: крупный панцирный хищник глубокой равнины ---------- */
  function makeArmoredSwimmer(scene, biome, opts) {
    opts = opts || {};
    const group = new T.Group();
    group.userData.key = 'armored_swimmer';

    const cShell = COL(0x6b7488);
    const cRidge = COL(0xb9c6da);
    const cGlow = COL(0x7fe6ff);

    const parts = [];
    // Сегментированный конический панцирь
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const u = i / (segs - 1);
      const r = OC.lerp(1.15, 0.28, u);
      const len = 0.62;
      const ring = new T.CylinderGeometry(r * 0.86, r, len, 10, 1, true);
      OC.geoPrep(ring);
      OC.paint(ring, (x, y, z, c) => c.copy(cShell).lerp(cRidge, OC.clamp(0.35 + Math.sin(y * 6.0 + i) * 0.28, 0, 1)));
      OC.xform(ring, { r: [0, 0, Math.PI / 2], p: [0.9 - i * len, 0, 0] });
      parts.push(ring);
      // Гребень на спине
      const crest = new T.ConeGeometry(r * 0.26, 0.5, 5);
      OC.geoPrep(crest);
      OC.paint(crest, cRidge);
      OC.xform(crest, { r: [0, 0, Math.PI / 2], p: [0.9 - i * len, r * 0.92, 0] });
      parts.push(crest);
    }
    // Хвостовой веер
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const fin = new T.ConeGeometry(0.1, 0.7, 4);
      OC.geoPrep(fin);
      OC.paint(fin, cShell);
      OC.xform(fin, { r: [0, 0, Math.PI / 2 - 0.25], p: [-2.9, Math.sin(a) * 0.3, Math.cos(a) * 0.3] });
      parts.push(fin);
    }
    // Боковые плавники
    for (const s of [-1, 1]) {
      const fin = new T.PlaneGeometry(1.3, 0.6, 3, 1);
      const fp = fin.attributes.position;
      for (let i = 0; i < fp.count; i++) fp.setZ(i, fp.getZ(i) - Math.sin((fp.getX(i) / 1.3 + 0.5) * Math.PI) * 0.12);
      fin.computeVertexNormals();
      OC.geoPrep(fin);
      OC.paint(fin, cShell);
      OC.xform(fin, { r: [Math.PI / 2, 0, 0], p: [0.3, -0.1, s * 0.8] });
      parts.push(fin);
    }
    // Глазные узлы (светящиеся)
    for (const s of [-1, 1]) {
      const eye = new T.SphereGeometry(0.12, 8, 6);
      OC.geoPrep(eye);
      OC.paint(eye, cGlow);
      OC.xform(eye, { p: [1.15, 0.18, s * 0.3] });
      parts.push(eye);
    }

    const mesh = new T.Mesh(OC.mergeGeometries(parts), OC._FaunaCtx.creatureMat || new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1 }));
    group.add(mesh);
    const scale = opts.scale || 1.0;
    group.scale.setScalar(scale);
    scene.add(group);

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 100, speed = opts.speed || 1.5;
    const ang0 = Math.random() * 6.28;
    const baseY = opts.y || -70;
    let lungeTimer = 0;
    let lungeCooldown = 16 + Math.random() * 14;
    let lungeTarget = null;
    let lungeBlend = 0;

    return {
      key: 'armored_swimmer',
      isNocturnalPredator: true,
      isActivePredator: true,
      isHunting: () => lungeTimer > 0,
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 520) { group.visible = false; return; }
        group.visible = true;

        // Охотничий бросок на стаю крио-планеров или крио-креветок
        const preyCenters = ctx ? ctx.preyCenters : null;
        if (preyCenters && preyCenters.length) {
          if (lungeTimer > 0) {
            lungeTimer -= dt;
            if (lungeTarget && group.position.distanceTo(lungeTarget) < 9.0) {
              lungeTimer = 0;
              lungeCooldown = 20 + Math.random() * 14;
            }
          } else {
            lungeCooldown -= dt;
            if (lungeCooldown <= 0) {
              let bestD = 150;
              let bestP = null;
              for (let p = 0; p < preyCenters.length; p++) {
                const pr = preyCenters[p];
                const d = Math.hypot(pr.x - group.position.x, pr.z - group.position.z);
                if (d < bestD) { bestD = d; bestP = pr; }
              }
              if (bestP) {
                lungeTarget = bestP;
                lungeTimer = 5.2;
                if (bestP.applyPredation) bestP.applyPredation();
              }
              lungeCooldown = 22 + Math.random() * 16;
            }
          }
        }
        lungeBlend += ((lungeTimer > 0 && lungeTarget ? 1 : 0) - lungeBlend) * Math.min(1, dt * 2.0);

        const speedMult = lungeTimer > 0 ? 2.1 : 1.0;
        const ang = ang0 + time * speed * speedMult / Math.max(10, r);
        const rad = r * (0.75 + 0.25 * Math.sin(time * 0.21 + ang0));
        const px = cx + Math.cos(ang) * rad;
        const pz = cz + Math.sin(ang) * rad;
        const py = baseY + Math.sin(time * 0.31 + ang0) * 5.5;
        group.position.set(
          OC.lerp(px, lungeTarget ? lungeTarget.x : px, lungeBlend * 0.75),
          py,
          OC.lerp(pz, lungeTarget ? lungeTarget.z : pz, lungeBlend * 0.75)
        );
        group.rotation.y = -ang + Math.PI / 2;
        group.rotation.z = Math.sin(time * 0.42 + ang0) * 0.12;
      }
    };
  }
  B.makeArmoredSwimmer = makeArmoredSwimmer;

  /* ---------- Фонарная медуза: единственный «маяк» океана Европы ---------- */
  function makeCryoMedusa(scene, opts) {
    opts = opts || {};
    const group = new T.Group();
    group.userData.key = 'cryo_medusa';

    const bellGeo = new T.SphereGeometry(0.95, 16, 11, 0, Math.PI * 2, 0, Math.PI * 0.62);
    OC.geoPrep(bellGeo);
    const bellMat = new T.MeshStandardMaterial({
      color: 0xb4405a,
      emissive: new T.Color(0x5c0d22),
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.74,
      roughness: 0.3,
      side: T.DoubleSide
    });
    const bell = new T.Mesh(bellGeo, bellMat);
    group.add(bell);

    // Кольцо холодных фотофоров
    const nodeMat = new T.MeshBasicMaterial({ color: 0x8ff0ff });
    const nodes = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const node = new T.Mesh(new T.SphereGeometry(0.075, 6, 5), nodeMat);
      node.position.set(Math.cos(a) * 0.9, 0.06, Math.sin(a) * 0.9);
      group.add(node);
      nodes.push(node);
    }

    // Щупальца
    const tentMat = new T.MeshBasicMaterial({ color: 0xff7aa0, transparent: true, opacity: 0.55 });
    const tents = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const pts = [];
      for (let s = 0; s <= 5; s++) {
        const u = s / 5;
        pts.push(new T.Vector3(Math.cos(a) * (0.45 + u * 0.55), -u * 3.4, Math.sin(a) * (0.45 + u * 0.55)));
      }
      const tg = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.028, 4, false);
      const tm = new T.Mesh(tg, tentMat);
      group.add(tm);
      tents.push(tm);
    }

    const scale = opts.scale || 1.2;
    group.scale.setScalar(scale);
    group.position.set(opts.x || 0, opts.y || -30, opts.z || 0);
    scene.add(group);

    const ph = Math.random() * 6.28;
    const bx = opts.x || 0, bz = opts.z || 0;

    return {
      key: 'cryo_medusa',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(bx - camPos.x, bz - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        const pulse = Math.sin(time * 1.25 + ph);
        group.position.x = bx + Math.sin(time * 0.14 + ph) * 7;
        group.position.z = bz + Math.cos(time * 0.12 + ph) * 7;
        group.position.y = (opts.y || -30) + Math.sin(time * 0.26 + ph) * 2.6 + pulse * 0.3;
        group.scale.set(
          scale * (1 - pulse * 0.09),
          scale * (1 + pulse * 0.13),
          scale * (1 - pulse * 0.09)
        );
        // Фотофоры вспыхивают по краю купола
        const flash = 0.35 + 0.65 * Math.pow(OC.clamp(pulse * 0.5 + 0.5, 0, 1), 2.5);
        nodeMat.color.setRGB(0.35 * flash + 0.2, 0.9 * flash, 1.0);
        for (let i = 0; i < tents.length; i++) tents[i].rotation.z = Math.sin(time * 1.05 + i * 0.6) * 0.1;
      }
    };
  }
  B.makeCryoMedusa = makeCryoMedusa;

  /* ---------- Сип-краб: донный краулер возле серпентинитовых труб ---------- */
  function makeVentCrab(scene, biome, opts) {
    opts = opts || {};
    const group = new T.Group();
    group.userData.key = 'vent_crab';

    const cShell = COL(0xc07a4e);
    const cDark = COL(0x6d3d26);
    const cGlow = COL(0xffcf8a);

    const parts = [];
    const shell = new T.SphereGeometry(0.52, 14, 9);
    shell.scale(1.15, 0.5, 0.95);
    OC.geoPrep(shell);
    OC.paint(shell, (x, y, z, c) => c.copy(cDark).lerp(cShell, OC.clamp(y * 1.8 + 0.55, 0, 1)));
    parts.push(shell);

    // Глаза на стебельках
    for (const s of [-1, 1]) {
      const eye = new T.SphereGeometry(0.08, 7, 6);
      OC.geoPrep(eye);
      OC.paint(eye, cGlow);
      OC.xform(eye, { p: [0.34, 0.3, s * 0.13] });
      parts.push(eye);
    }
    // Клешни
    for (const s of [-1, 1]) {
      const claw = new T.SphereGeometry(0.16, 8, 6);
      claw.scale(1.5, 0.6, 0.9);
      OC.geoPrep(claw);
      OC.paint(claw, cShell);
      OC.xform(claw, { r: [0, 0, s * 0.3], p: [0.55, -0.05, s * 0.34] });
      parts.push(claw);
    }
    const mesh = new T.Mesh(OC.mergeGeometries(parts), OC._FaunaCtx.creatureMat || new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 }));
    group.add(mesh);

    // Ноги — отдельные меши, чтобы шевелить
    const legs = [];
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? -1 : 1;
      const idx = i % 3;
      const leg = new T.Group();
      const lgeo = new T.CylinderGeometry(0.035, 0.05, 0.62, 5);
      OC.geoPrep(lgeo);
      OC.paint(lgeo, cDark);
      const lm = new T.Mesh(lgeo, OC._FaunaCtx.creatureMat || mesh.material);
      lm.position.set(0, -0.31, 0);
      leg.add(lm);
      leg.position.set(-0.22 + idx * 0.22, -0.02, s * 0.34);
      group.add(leg);
      legs.push(leg);
    }

    const scale = opts.scale || 1.0;
    group.scale.setScalar(scale);
    scene.add(group);

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 16, speed = opts.speed || 0.8;
    const ang0 = Math.random() * 6.28;
    const baseY = opts.y || -70;

    return {
      key: 'vent_crab',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 380) { group.visible = false; return; }
        group.visible = true;
        const ang = ang0 + time * speed / Math.max(4, r);
        const px = cx + Math.cos(ang) * r;
        const pz = cz + Math.sin(ang) * r;
        const floor = biome && biome.getHeight ? biome.getHeight(px, pz) : baseY;
        group.position.set(px, floor + 0.28, pz);
        group.rotation.y = -ang + Math.PI / 2;
        for (let i = 0; i < legs.length; i++) {
          legs[i].rotation.x = Math.sin(time * 2.6 + i * 1.1) * 0.35;
        }
      }
    };
  }
  B.makeVentCrab = makeVentCrab;
})(window.OC);
