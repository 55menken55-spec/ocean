/* ================= ПРОЦЕДУРНАЯ ФЛОРА ЕВРОПЫ: КРИОЛЕС, ЗАНАВЕСЫ, СЕРПЕНТИНИТ ================= */
/* Всё здесь — гипотетические организмы подлёдного океана Европы. Ни один вид не имеет
   земного аналога: леса на водороде, нити под базальным льдом, полипы в карманах рассола. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const B = (OC._FloraBuilders = OC._FloraBuilders || {});

  const COL = (hex) => new T.Color(hex);

  /* ---------- Криолес: бледные ленточные «водоросли», живущие на H₂ ---------- */
  function buildCryoForest(rng) {
    const list = [];
    const cRoot = COL(0x3d5a63);
    const cStem = COL(0x9fd6e8);
    const cTip = COL(0xeafaff);

    const stalks = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < stalks; i++) {
      const a = (i / stalks) * 6.283 + rng() * 0.9;
      const dist = rng() * 1.5;
      const h = OC.lerp(3.2, 7.4, rng());
      const rBot = OC.lerp(0.11, 0.19, rng());
      const rTop = rBot * 0.42;
      const ox = Math.cos(a) * dist;
      const oz = Math.sin(a) * dist;
      const bend = (rng() - 0.5) * 0.9;

      const stem = new T.CylinderGeometry(rTop, rBot, h, 7, 6);
      const sp = stem.attributes.position;
      for (let v = 0; v < sp.count; v++) {
        const u = OC.clamp((sp.getY(v) + h * 0.5) / h, 0, 1);
        const sway = bend * u * u * 1.5;
        sp.setXYZ(v, sp.getX(v) + sway, sp.getY(v), sp.getZ(v) + bend * 0.4 * u * u);
      }
      stem.computeVertexNormals();
      OC.geoPrep(stem);
      OC.paint(stem, (x, y, z, c) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        c.copy(cRoot).lerp(cStem, OC.smoothstep(0.0, 0.45, u)).lerp(cTip, OC.smoothstep(0.6, 1.0, u));
      });
      OC.xform(stem, { p: [ox, h * 0.5, oz] });
      OC.withSway(stem, (x, y) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        return Math.pow(u, 1.6) * 0.85;
      });
      list.push(stem);

      // Ленточные «листья» вдоль стебля
      const blades = 3 + Math.floor(rng() * 3);
      for (let b = 0; b < blades; b++) {
        const u = OC.lerp(0.25, 0.9, rng());
        const bl = OC.lerp(1.1, 2.6, rng());
        const ba = rng() * 6.283;
        const blade = new T.PlaneGeometry(bl, OC.lerp(0.16, 0.34, rng()), 3, 1);
        const bp = blade.attributes.position;
        for (let v = 0; v < bp.count; v++) {
          const t = OC.clamp(bp.getX(v) / bl + 0.5, 0, 1);
          bp.setY(v, bp.getY(v) * (1 - t * 0.75));
          bp.setZ(v, bp.getZ(v) + Math.sin(t * 3.2) * 0.18);
        }
        blade.computeVertexNormals();
        OC.geoPrep(blade);
        OC.paint(blade, (x, y, z, c) => c.copy(cStem).lerp(cTip, OC.clamp(u + 0.2, 0, 1)));
        const bx = ox + bend * u * u * 1.5;
        const bz = oz + bend * 0.4 * u * u;
        OC.xform(blade, {
          r: [OC.lerp(-0.4, 0.4, rng()), ba, OC.lerp(0.35, 1.0, rng())],
          p: [bx + Math.cos(ba) * bl * 0.42, u * h, bz + Math.sin(ba) * bl * 0.42]
        });
        OC.withSway(blade, () => Math.pow(u, 1.6) * 1.0);
        list.push(blade);
      }
    }
    return OC.mergeGeometries(list);
  }
  B.buildCryoForest = buildCryoForest;

  /* ---------- Ледяные занавесы: нити, свисающие с базального льда ---------- */
  function buildIceVeil(rng) {
    const list = [];
    const cIce = COL(0xcfeaff);
    const cDeep = COL(0x5f9fc4);

    const threads = 7 + Math.floor(rng() * 6);
    for (let i = 0; i < threads; i++) {
      const a = (i / threads) * 6.283 + rng() * 0.7;
      const dist = rng() * 1.35;
      const len = OC.lerp(3.4, 8.2, rng());
      const r = OC.lerp(0.045, 0.12, rng());
      const ox = Math.cos(a) * dist;
      const oz = Math.sin(a) * dist;
      const curl = (rng() - 0.5) * 1.1;

      const th = new T.CylinderGeometry(r * 0.35, r, len, 5, 6);
      const tp = th.attributes.position;
      for (let v = 0; v < tp.count; v++) {
        const u = OC.clamp((-tp.getY(v) + len * 0.5) / len, 0, 1);
        tp.setX(v, tp.getX(v) + curl * u * u * 1.8);
        tp.setZ(v, tp.getZ(v) + curl * 0.5 * u * u);
      }
      th.computeVertexNormals();
      OC.geoPrep(th);
      OC.paint(th, (x, y, z, c) => {
        const u = OC.clamp((-y + len * 0.5) / len, 0, 1);
        c.copy(cIce).lerp(cDeep, OC.smoothstep(0.25, 1.0, u));
      });
      // Точка привязки — y = 0: занавес растёт вниз от потолка
      OC.xform(th, { p: [ox, -len * 0.5, oz] });
      OC.withSway(th, (x, y) => {
        const u = OC.clamp((-y + len * 0.5) / len, 0, 1);
        return Math.pow(u, 1.5) * 0.7;
      });
      list.push(th);

      // Светящийся узел на конце нити
      if (rng() < 0.55) {
        const bulb = new T.SphereGeometry(r * 2.1, 7, 5);
        OC.geoPrep(bulb);
        OC.paint(bulb, (x, y, z, c) => c.copy(cIce).lerp(COL(0x9fe8ff), 0.6));
        OC.xform(bulb, { p: [ox + curl * 1.8, -len, oz + curl * 0.5] });
        OC.withSway(bulb, () => 0.85);
        list.push(bulb);
      }
    }
    return OC.mergeGeometries(list);
  }
  B.buildIceVeil = buildIceVeil;

  /* ---------- Серпентинитовая труба: холодный щелочной «курильщик» ---------- */
  function buildSerpentineChimney(rng) {
    const list = [];
    const cBase = COL(0x4a3f38);
    const cMid = COL(0x8d6a49);
    const cCrust = COL(0xd8cbb2);
    const cHot = COL(0xffb46a);

    const spires = 2 + (rng() > 0.5 ? 1 : 0);
    for (let i = 0; i < spires; i++) {
      const h = i === 0 ? OC.lerp(6.0, 9.2, rng()) : OC.lerp(2.6, 5.0, rng());
      const rBot = i === 0 ? OC.lerp(0.85, 1.25, rng()) : OC.lerp(0.4, 0.72, rng());
      const rTop = rBot * 0.3;
      const ox = i === 0 ? 0 : Math.cos(i * 2.4) * OC.lerp(0.7, 1.4, rng());
      const oz = i === 0 ? 0 : Math.sin(i * 2.4) * OC.lerp(0.7, 1.4, rng());

      const g = new T.CylinderGeometry(rTop, rBot, h, 8, 7);
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const vx = p.getX(v), vy = p.getY(v), vz = p.getZ(v);
        const lumps = 1.0 + 0.26 * Math.sin(vy * 2.4 + i * 1.7) + 0.12 * Math.cos(vx * 5.1 - vz * 4.3);
        p.setXYZ(v, vx * lumps, vy, vz * lumps);
      }
      g.computeVertexNormals();
      OC.geoPrep(g);
      OC.paint(g, (x, y, z, c) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        c.copy(cBase).lerp(cMid, OC.smoothstep(0.05, 0.55, u)).lerp(cCrust, OC.smoothstep(0.72, 1.0, u));
      });
      OC.xform(g, { p: [ox, h * 0.46, oz] });
      OC.withSway(g, () => 0);
      list.push(g);

      // Тёплое жерло — внутри трубы идёт реакция перидотита с водой
      const mouth = new T.CylinderGeometry(rTop * 1.05, rTop * 0.6, 0.5, 8, 1, true);
      OC.geoPrep(mouth);
      OC.paint(mouth, cHot);
      OC.xform(mouth, { p: [ox, h * 0.92, oz] });
      OC.withSway(mouth, () => 0);
      list.push(mouth);
    }
    return OC.mergeGeometries(list);
  }
  B.buildSerpentineChimney = buildSerpentineChimney;

  /* ---------- Рассольный полип: колония в карманах рассола ---------- */
  function buildBrinePolyp(rng) {
    const list = [];
    const cStem = COL(0x6d2f2a);
    const cBody = COL(0xd4573c);
    const cTip = COL(0xffb27a);

    const polyps = 5 + Math.floor(rng() * 5);
    for (let i = 0; i < polyps; i++) {
      const a = (i / polyps) * 6.283 + rng() * 0.8;
      const dist = rng() * 0.95;
      const h = OC.lerp(0.55, 1.35, rng());
      const bulbR = OC.lerp(0.18, 0.34, rng());
      const ox = Math.cos(a) * dist;
      const oz = Math.sin(a) * dist;

      const stalk = new T.CylinderGeometry(bulbR * 0.42, bulbR * 0.62, h, 6, 2);
      OC.geoPrep(stalk);
      OC.paint(stalk, cStem);
      OC.xform(stalk, { p: [ox, h * 0.5, oz] });
      OC.withSway(stalk, (x, y) => OC.clamp(y / h, 0, 1) * 0.35);
      list.push(stalk);

      const bulb = new T.SphereGeometry(bulbR, 9, 7);
      bulb.scale(1, 1.18, 1);
      OC.geoPrep(bulb);
      OC.paint(bulb, (x, y, z, c) => c.copy(cBody).lerp(cTip, OC.clamp((y / bulbR) * 0.5 + 0.4, 0, 1)));
      OC.xform(bulb, { p: [ox, h + bulbR * 0.6, oz] });
      OC.withSway(bulb, () => 0.45);
      list.push(bulb);
    }
    return OC.mergeGeometries(list);
  }
  B.buildBrinePolyp = buildBrinePolyp;

  /* ---------- Хемосинтетический мат: «луг» на базальте у флюида ---------- */
  function buildChemoMat(rng) {
    const list = [];
    const cMat = COL(0xe8d79a);
    const cEdge = COL(0x9d8a54);
    const cHot = COL(0xfff2c8);

    const patches = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < patches; i++) {
      const r = OC.lerp(0.75, 1.55, rng());
      const ox = (rng() - 0.5) * 1.5;
      const oz = (rng() - 0.5) * 1.5;
      const dome = new T.SphereGeometry(r, 11, 7, 0, Math.PI * 2, 0, Math.PI * 0.5);
      dome.scale(1.15, OC.lerp(0.16, 0.32, rng()), 1.05);
      const p = dome.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const bump = 1 + 0.11 * Math.sin(p.getX(v) * 7.3 + i) * Math.cos(p.getZ(v) * 6.1 - i);
        p.setXYZ(v, p.getX(v) * bump, p.getY(v) * bump, p.getZ(v) * bump);
      }
      dome.computeVertexNormals();
      OC.geoPrep(dome);
      OC.paint(dome, (x, y, z, c) => c.copy(cEdge).lerp(cMat, OC.clamp(y / r * 1.4 + 0.35, 0, 1)).lerp(cHot, OC.clamp(y / r * 1.2 - 0.1, 0, 1) * 0.5));
      OC.xform(dome, { p: [ox, 0.02, oz] });
      OC.withSway(dome, () => 0);
      list.push(dome);
    }
    return OC.mergeGeometries(list);
  }
  B.buildChemoMat = buildChemoMat;

  /* ---------- Криотрубчатый червь: белые трубки с красными плюмами ---------- */
  function buildCryoTubeworm(rng) {
    const list = [];
    const cTube = COL(0xf2ece0);
    const cShade = COL(0xbdb3a4);
    const cPlume = COL(0xd8453c);

    const worms = 6 + Math.floor(rng() * 6);
    for (let i = 0; i < worms; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 0.85;
      const h = OC.lerp(0.9, 2.6, rng());
      const r = OC.lerp(0.05, 0.09, rng());
      const ox = Math.cos(a) * dist;
      const oz = Math.sin(a) * dist;
      const tilt = (rng() - 0.5) * 0.55;

      const tube = new T.CylinderGeometry(r * 0.92, r, h, 6, 3);
      const tp = tube.attributes.position;
      for (let v = 0; v < tp.count; v++) {
        const u = OC.clamp((tp.getY(v) + h * 0.5) / h, 0, 1);
        tp.setX(v, tp.getX(v) + tilt * u * h * 0.35);
      }
      tube.computeVertexNormals();
      OC.geoPrep(tube);
      OC.paint(tube, (x, y, z, c) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        c.copy(cShade).lerp(cTube, OC.smoothstep(0.1, 0.8, u));
      });
      OC.xform(tube, { p: [ox, h * 0.5, oz] });
      OC.withSway(tube, (x, y) => OC.clamp((y + h * 0.5) / h, 0, 1) * 0.28);
      list.push(tube);

      const plume = new T.SphereGeometry(r * 1.5, 7, 6);
      plume.scale(1, 1.5, 1);
      OC.geoPrep(plume);
      OC.paint(plume, cPlume);
      OC.xform(plume, { p: [ox + tilt * h * 0.35, h + r * 0.6, oz] });
      OC.withSway(plume, () => 0.3);
      list.push(plume);
    }
    return OC.mergeGeometries(list);
  }
  B.buildCryoTubeworm = buildCryoTubeworm;

  /* ---------- Сульфатная корка: растрескавшийся минеральный «снег» ---------- */
  function buildSulfateCrust(rng) {
    const list = [];
    const cPale = COL(0xd9e3ef);
    const cDark = COL(0x8d9aab);

    const plates = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < plates; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.2;
      const r = OC.lerp(0.35, 0.78, rng());
      const plate = new T.CylinderGeometry(r, r * 0.92, OC.lerp(0.07, 0.16, rng()), 5 + Math.floor(rng() * 3), 1);
      const p = plate.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const edge = Math.abs(p.getY(v)) < 0.02 ? 1 : 1;
        p.setXYZ(v, p.getX(v) * edge * (1 + 0.08 * Math.sin(p.getX(v) * 9.1 + i)), p.getY(v), p.getZ(v) * edge * (1 + 0.08 * Math.cos(p.getZ(v) * 8.3 - i)));
      }
      plate.computeVertexNormals();
      OC.geoPrep(plate);
      OC.paint(plate, (x, y, z, c) => c.copy(cDark).lerp(cPale, OC.clamp(0.45 + Math.sin(x * 5.2 + z * 4.4) * 0.35, 0, 1)));
      OC.xform(plate, { r: [(rng() - 0.5) * 0.16, rng() * 6.28, (rng() - 0.5) * 0.16], p: [Math.cos(a) * dist, 0.05, Math.sin(a) * dist] });
      OC.withSway(plate, () => 0);
      list.push(plate);
    }
    return OC.mergeGeometries(list);
  }
  B.buildSulfateCrust = buildSulfateCrust;
})(window.OC);
