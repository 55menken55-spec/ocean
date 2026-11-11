/* ================= ПРОЦЕДУРНЫЕ ГЕОМЕТРИИ: затопленный лес Игапо и чёрные воды Амазонии ================= */
/* Часть библиотеки OC.FloraLibrary. Каждый builder чистый: (параметры, rng) -> BufferGeometry.
   Материалы и реестр прототипов живут в engine/flora_library.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});

  function buildIgapoTree(rng) {
    const list = [];
    const barkDark = COL(0x3a2b1e);
    const barkMoss = COL(0x3d5c33);
    const leafDark = COL(0x1f5927);
    const leafBright = COL(0x529c3a);
    const lianaC = COL(0x4a6b32);

    const trunkH = OC.lerp(7.4, 9.6, rng());
    const trunk = OC.geoPrep(new T.CylinderGeometry(0.32, 0.56, trunkH, 7));
    OC.paint(trunk, (x, y, z, col) => {
      const u = OC.clamp((y + trunkH * 0.5) / trunkH, 0, 1);
      col.copy(barkDark).lerp(barkMoss, u < 0.38 ? 0.52 : 0.14);
    });
    OC.xform(trunk, { p: [0, trunkH * 0.44 - 0.8, 0] });
    OC.withSway(trunk, () => 0);
    list.push(trunk);

    // Мощные досковидные и ходульные корни уходят в тёмную воду
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rng() * 0.4;
      const spread = OC.lerp(1.5, 2.7, rng());
      const hStart = OC.lerp(2.0, 3.6, rng());
      const pts = [
        new T.Vector3(Math.cos(a) * 0.28, hStart, Math.sin(a) * 0.28),
        new T.Vector3(Math.cos(a) * spread * 0.55, hStart * 0.34, Math.sin(a) * spread * 0.55),
        new T.Vector3(Math.cos(a) * spread, -0.9, Math.sin(a) * spread)
      ];
      const rg = OC.geoPrep(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.14, 5, false));
      OC.paint(rg, (x, y, z, c) => c.copy(barkDark).lerp(barkMoss, OC.clamp(1.0 - Math.abs(y) * 0.22, 0, 0.6)));
      OC.withSway(rg, () => 0);
      list.push(rg);
    }

    // Широкая тропическая крона и свисающие лианы
    const crownY = trunkH - 0.7;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rng() * 0.5;
      const r = i === 0 ? 0.25 : OC.lerp(1.4, 2.5, rng());
      const rad = i === 0 ? 2.4 : OC.lerp(1.4, 2.0, rng());
      const lf = OC.geoPrep(new T.IcosahedronGeometry(rad, 1));
      lf.scale(1.22, 0.62, 1.22);
      OC.paint(lf, (x, y, z, c) => c.copy(leafDark).lerp(leafBright, OC.clamp(y * 0.45 + 0.55, 0, 1)));
      OC.withSway(lf, () => 0.16);
      OC.xform(lf, { p: [Math.cos(a) * r, crownY + (rng() - 0.5) * 1.1, Math.sin(a) * r] });
      list.push(lf);
    }
    for (let i = 0; i < 3; i++) {
      const a = rng() * Math.PI * 2;
      const r = OC.lerp(1.2, 2.1, rng());
      const vLen = OC.lerp(2.8, 4.4, rng());
      const vine = OC.geoPrep(new T.CylinderGeometry(0.035, 0.025, vLen, 4));
      OC.paint(vine, lianaC);
      OC.xform(vine, { p: [Math.cos(a) * r, crownY - vLen * 0.52, Math.sin(a) * r] });
      OC.withSway(vine, (x, y) => OC.clamp(crownY - y, 0, 4) * 0.18);
      list.push(vine);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildIgapoTree = buildIgapoTree;

  function buildVictoriaLily(rng) {
    const list = [];
    const cPad = COL(0x3a8c32);
    const cRim = COL(0x8e283b);
    const cPetal = COL(0xfff1f5);
    const cCore = COL(0xffc966);
    const rad = OC.lerp(0.75, 1.08, rng());

    // Плоский лист-блюдце
    const disc = OC.geoPrep(new T.CylinderGeometry(rad, rad * 0.96, 0.045, 16));
    OC.paint(disc, (x, y, z, c) => {
      const rr = Math.hypot(x, z) / rad;
      c.copy(cPad).lerp(cRim, rr > 0.85 ? 0.72 : 0.08);
    });
    OC.xform(disc, { p: [0, 0.02, 0] });
    OC.withSway(disc, () => 0.15);
    list.push(disc);

    // Вертикальный бортик по краю листа
    const rim = OC.geoPrep(new T.CylinderGeometry(rad * 1.01, rad * 0.99, 0.15, 16, 1, true));
    OC.paint(rim, (x, y, z, c) => c.copy(cRim).lerp(cPad, y > 0.02 ? 0.25 : 0.0));
    OC.xform(rim, { p: [0, 0.095, 0] });
    OC.withSway(rim, () => 0.15);
    list.push(rim);

    // Цветок кувшинки
    if (rng() < 0.72) {
      const flX = (rng() - 0.5) * rad * 0.55;
      const flZ = (rng() - 0.5) * rad * 0.55;
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        const pet = OC.geoPrep(new T.ConeGeometry(0.065, 0.18, 4));
        OC.paint(pet, (x, y, z, c) => c.copy(cPetal).lerp(cCore, y < -0.02 ? 0.45 : 0));
        OC.xform(pet, { r: [Math.sin(a) * 0.65, a, -Math.cos(a) * 0.65], p: [flX + Math.cos(a) * 0.06, 0.11, flZ + Math.sin(a) * 0.06] });
        OC.withSway(pet, () => 0.15);
        list.push(pet);
      }
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildVictoriaLily = buildVictoriaLily;

  function buildAmazonSword(rng) {
    const list = [];
    const cBase = COL(0x1f5928);
    const cTip = COL(0x52c44a);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rng() * 0.25;
      const w = OC.lerp(0.11, 0.18, rng());
      const h = OC.lerp(0.55, 1.05, rng());
      const blade = OC.geoPrep(new T.PlaneGeometry(w, h, 2, 5));
      const bp = blade.attributes.position;
      for (let k = 0; k < bp.count; k++) {
        const u = OC.clamp((bp.getY(k) + h * 0.5) / h, 0, 1);
        const taper = Math.sin(Math.pow(u, 0.65) * Math.PI) * 1.15;
        bp.setX(k, bp.getX(k) * Math.max(0.18, taper));
        bp.setZ(k, u * u * 0.28);
      }
      blade.computeVertexNormals();
      OC.paint(blade, (x, y, z, c) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        c.copy(cBase).lerp(cTip, u);
      });
      OC.xform(blade, { r: [0.35, a, 0], p: [Math.cos(a) * 0.1, h * 0.45, Math.sin(a) * 0.1] });
      OC.withSway(blade, (x, y) => Math.max(0, y) * 0.85);
      list.push(blade);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildAmazonSword = buildAmazonSword;

  function buildSunkenLog(rng) {
    const list = [];
    const cWood = COL(0x3c2c1e);
    const cMoss = COL(0x466b32);
    const cSponge = COL(0xa69458);
    const len = OC.lerp(2.6, 3.8, rng());
    const rad = OC.lerp(0.28, 0.44, rng());
    const logG = OC.geoPrep(new T.CylinderGeometry(rad * 0.85, rad, len, 8));
    OC.paint(logG, (x, y, z, c) => c.copy(cWood).lerp(cMoss, z > 0 ? 0.45 : 0.12));
    OC.xform(logG, { r: [0.08 * (rng() - 0.5), 0, Math.PI / 2 + 0.08 * (rng() - 0.5)], p: [0, rad * 0.72, 0] });
    OC.withSway(logG, () => 0);
    list.push(logG);
    for (let i = 0; i < 4; i++) {
      const sp = OC.geoPrep(new T.IcosahedronGeometry(OC.lerp(0.14, 0.24, rng()), 1));
      sp.scale(1.2, 0.65, 1.0);
      OC.paint(sp, cSponge);
      OC.xform(sp, { p: [(rng() - 0.5) * len * 0.7, rad * 1.45, (rng() - 0.5) * rad * 0.6] });
      OC.withSway(sp, () => 0);
      list.push(sp);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildSunkenLog = buildSunkenLog;

  function buildDriftwoodSnag(rng) {
    const list = [];
    const cRoot = COL(0x4a3524);
    const cTip = COL(0x6e543a);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rng() * 0.4;
      const r1 = OC.lerp(0.55, 1.1, rng());
      const h1 = OC.lerp(0.75, 1.45, rng());
      const pts = [
        new T.Vector3(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18),
        new T.Vector3(Math.cos(a + 0.35) * r1 * 0.65, h1 * 0.6, Math.sin(a + 0.35) * r1 * 0.65),
        new T.Vector3(Math.cos(a + 0.5) * r1, h1 * 0.92, Math.sin(a + 0.5) * r1)
      ];
      const rg = OC.geoPrep(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.085, 5, false));
      OC.paint(rg, (x, y, z, c) => c.copy(cRoot).lerp(cTip, OC.clamp(y / h1, 0, 1)));
      OC.withSway(rg, () => 0);
      list.push(rg);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildDriftwoodSnag = buildDriftwoodSnag;
})(window.OC);
