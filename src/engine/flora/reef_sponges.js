/* ================= ГЕОМЕТРИИ: ГУБКИ, АКТИНИИ И ТРИДАКНЫ ================= */
/* Трубчатые и бочкообразные губки, анемоны с щупальцами и гигантский моллюск Tridacna.
   Часть OC.FloraLibrary. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});
  function buildTubeSponge(hueA, hueB, rng) {
    const list = [];
    const n = 5 + Math.floor(rng() * 4);
    const colA = COL().setHSL(hueA, 0.85, 0.34);
    const colB = COL().setHSL(hueB, 0.95, 0.62);
    for (let i = 0; i < n; i++) {
      const h = OC.lerp(1.5, 4.0, rng());
      const r = OC.lerp(0.24, 0.48, rng());
      const g = new T.CylinderGeometry(r * 0.68, r * 1.05, h, 9, 2, false);
      OC.geoPrep(g);
      g.computeVertexNormals();
      OC.paint(g, (x, y, z, c) => {
        const t = OC.clamp((y + h * 0.5) / h, 0, 1);
        c.copy(colA).lerp(colB, Math.pow(t, 1.4));
        if (Math.hypot(x, z) < r * 0.48 && t > 0.92) c.multiplyScalar(0.2);
      });
      OC.withSway(g, () => 0);
      const a = (i / n) * 6.28 + (rng() - 0.5) * 0.6;
      const rad = OC.lerp(0.25, 1.2, rng());
      OC.xform(g, {
        p: [Math.cos(a) * rad, h * 0.5, Math.sin(a) * rad],
        r: [(rng() - 0.5) * 0.35, 0, (rng() - 0.5) * 0.35]
      });
      list.push(g);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildTubeSponge = buildTubeSponge;

  function buildBarrelSponge(hue, rng) {
    const h = OC.lerp(2.2, 3.2, rng());
    const r = OC.lerp(1.0, 1.45, rng());
    const pts = [
      new T.Vector2(r * 0.65, 0),
      new T.Vector2(r * 1.05, h * 0.42),
      new T.Vector2(r * 0.92, h * 0.94),
      new T.Vector2(r * 0.76, h),
      new T.Vector2(r * 0.58, h * 0.88),
      new T.Vector2(r * 0.42, h * 0.25),
      new T.Vector2(0.01, h * 0.22)
    ];
    const g = new T.LatheGeometry(pts, 14);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(z, x);
      const rib = 1 + 0.08 * Math.sin(a * 9 + y * 2.2);
      p.setXYZ(i, x * rib, y, z * rib);
    }
    OC.geoPrep(g);
    g.computeVertexNormals();
    const c1 = COL().setHSL(hue, 0.62, 0.26);
    const c2 = COL().setHSL((hue + 0.04) % 1, 0.78, 0.52);
    OC.paint(g, (x, y, z, c) => {
      const t = OC.clamp(y / h, 0, 1);
      c.copy(c1).lerp(c2, t);
      if (Math.hypot(x, z) < r * 0.62 && y > h * 0.2 && y < h * 0.95) c.multiplyScalar(0.45);
    });
    OC.withSway(g, () => 0);
    return g;
  }
  BUILDERS.buildBarrelSponge = buildBarrelSponge;

  function buildAnemone(hueB, hueT, rng) {
    const list = [];
    const baseCol = COL().setHSL(hueB, 0.52, 0.34);
    const tColA = COL().setHSL(hueT, 0.88, 0.58);
    const tColB = COL().setHSL((hueT + 0.09) % 1, 0.95, 0.82);

    const bodyH = 0.85;
    const g = new T.CylinderGeometry(1.05, 0.7, bodyH, 8);
    OC.geoPrep(g);
    g.translate(0, bodyH * 0.5, 0);
    OC.paint(g, baseCol);
    OC.withSway(g, () => 0);
    list.push(g);

    const nT = 18;
    for (let i = 0; i < nT; i++) {
      const a = rng() * 6.28;
      const rr = Math.sqrt(rng()) * 1.05;
      const len = OC.lerp(1.0, 2.1, rng());
      const tg = new T.CylinderGeometry(0.06, 0.12, len, 4, 1);
      OC.geoPrep(tg);
      tg.translate(0, len * 0.5, 0);
      OC.paint(tg, (x, y, z, c) => c.copy(tColA).lerp(tColB, OC.clamp(y / len, 0, 1)));
      OC.withSway(tg, (x, y) => Math.pow(OC.clamp(y / len, 0, 1), 1.45) * 0.6);
      OC.xform(tg, {
        p: [Math.cos(a) * rr, bodyH * 0.85, Math.sin(a) * rr],
        r: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]
      });
      list.push(tg);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildAnemone = buildAnemone;

  function buildGiantClam(mantleHue, rng) {
    const list = [];
    const shellCol = COL(0xd5ccb8);
    const mantleA = COL().setHSL(mantleHue, 0.95, 0.32);
    const mantleB = COL().setHSL((mantleHue + 0.08) % 1, 1.0, 0.62);

    // Две ребристые створки
    for (const sign of [-1, 1]) {
      const sh = new T.SphereGeometry(1.3, 12, 8, 0, Math.PI, 0, Math.PI * 0.55);
      const p = sh.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const flute = 1 + 0.14 * Math.sin(Math.atan2(y, x) * 9);
        p.setXYZ(i, x * 1.35 * flute, y * flute, z * 0.55);
      }
      OC.geoPrep(sh);
      sh.computeVertexNormals();
      OC.paint(sh, (x, y, z, c) => c.copy(shellCol).offsetHSL(0, 0, (rng() - 0.5) * 0.04 - y * 0.05));
      OC.withSway(sh, () => 0);
      OC.xform(sh, {
        p: [0, 0.15, sign * 0.15],
        r: [sign * 0.55, sign > 0 ? 0 : Math.PI, 0]
      });
      list.push(sh);
    }

    // Иридисцентная мясистая мантия внутри
    const mantle = new T.CylinderGeometry(1.05, 0.75, 0.55, 14, 1);
    const mp = mantle.attributes.position;
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i);
      const wave = 1 + 0.12 * Math.sin(x * 5);
      mp.setXYZ(i, x * 1.4, y + (y > 0 ? 0.15 * Math.sin(x * 4) : 0), z * 0.52 * wave);
    }
    OC.geoPrep(mantle);
    mantle.computeVertexNormals();
    OC.paint(mantle, (x, y, z, c) => {
      const spot = Math.sin(x * 7 + z * 9) * 0.5 + 0.5;
      c.copy(mantleA).lerp(mantleB, spot);
    });
    OC.withSway(mantle, () => 0);
    OC.xform(mantle, { p: [0, 0.65, 0] });
    list.push(mantle);
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildGiantClam = buildGiantClam;
})(window.OC);
