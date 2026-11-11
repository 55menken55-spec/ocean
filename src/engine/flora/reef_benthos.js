/* ================= ГЕОМЕТРИИ: МАНГРЫ, ИГЛОКОЖИЕ И БЕНТОС ================= */
/* Ходульные корни мангров, ежи, морские звёзды, тритоны, морские лилии и галапагосские
   балянусы. Часть OC.FloraLibrary. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});
  function buildMangrove(rng) {
    const list = [];
    const barkC = COL(0x5a4232);
    const rootC = COL(0x463a2b);
    const leafA = COL(0x2d6b34);
    const leafB = COL(0x529c46);

    // Ствол
    const trunk = new T.CylinderGeometry(0.24, 0.34, 4.2, 6);
    OC.geoPrep(trunk);
    trunk.translate(0, 3.3, 0);
    OC.paint(trunk, barkC);
    OC.withSway(trunk, () => 0);
    list.push(trunk);

    // Ходульные воздушные корни (Prop roots) уходят под воду
    const nRoots = 9;
    for (let i = 0; i < nRoots; i++) {
      const a = (i / nRoots) * 6.28 + rng() * 0.4;
      const spread = OC.lerp(1.4, 2.7, rng());
      const hStart = OC.lerp(1.5, 2.7, rng());
      const pts = [
        new T.Vector3(0, hStart, 0),
        new T.Vector3(Math.cos(a) * spread * 0.65, hStart * 0.48, Math.sin(a) * spread * 0.65),
        new T.Vector3(Math.cos(a) * spread, -0.45, Math.sin(a) * spread)
      ];
      const curve = new T.CatmullRomCurve3(pts);
      const rg = new T.TubeGeometry(curve, 8, 0.085, 4, false);
      OC.geoPrep(rg);
      OC.paint(rg, (x, y, z, c) => c.copy(rootC).lerp(barkC, OC.clamp(y / 2.2, 0, 1)));
      OC.withSway(rg, () => 0);
      list.push(rg);
    }

    // Лиственная крона над водой
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.28 + rng();
      const rr = i === 0 ? 0.2 : OC.lerp(1.1, 2.2, rng());
      const rad = i === 0 ? 2.1 : OC.lerp(1.2, 1.8, rng());
      const lf = new T.IcosahedronGeometry(rad, 1);
      lf.scale(1.15, 0.68, 1.15);
      OC.geoPrep(lf);
      OC.paint(lf, (x, y, z, c) => c.copy(leafA).lerp(leafB, OC.clamp(y + 0.5, 0, 1)));
      OC.withSway(lf, () => 0.14);
      OC.xform(lf, { p: [Math.cos(a) * rr, 5.1 + (rng() - 0.5) * 1.1, Math.sin(a) * rr] });
      list.push(lf);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildMangrove = buildMangrove;

  function buildUrchin() {
    const list = [];
    const body = new T.SphereGeometry(0.48, 9, 7);
    body.scale(1, 0.72, 1);
    OC.geoPrep(body);
    OC.paint(body, 0x160f24);
    OC.withSway(body, () => 0);
    list.push(body);
    for (let i = 0; i < 34; i++) {
      const dir = OC.fibDir(i, 34);
      const len = 0.8 + (i % 3) * 0.2;
      const sp = new T.CylinderGeometry(0.012, 0.04, len, 3);
      OC.geoPrep(sp);
      sp.translate(0, len * 0.5, 0);
      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      sp.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q));
      sp.translate(dir.x * 0.35, dir.y * 0.25, dir.z * 0.35);
      OC.paint(sp, 0x261d38);
      OC.withSway(sp, () => 0);
      list.push(sp);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildUrchin = buildUrchin;

  function buildStarfish(arms, hue, spiky) {
    const list = [];
    const c1 = COL().setHSL(hue, 0.86, 0.42);
    const c2 = COL().setHSL((hue + 0.04) % 1, 0.92, 0.62);
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2;
      const arm = new T.ConeGeometry(spiky ? 0.22 : 0.32, spiky ? 1.55 : 1.75, 5);
      OC.geoPrep(arm);
      arm.translate(0, 0.8, 0);
      OC.paint(arm, (x, y, z, c) => c.copy(c1).lerp(c2, OC.clamp(y / 1.6, 0, 1)));
      OC.withSway(arm, () => 0);
      OC.xform(arm, { r: [0, 0, -Math.PI / 2] });
      OC.xform(arm, { r: [0, -a, 0], p: [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3] });
      list.push(arm);
    }
    const core = new T.SphereGeometry(0.52, 8, 6);
    OC.geoPrep(core);
    OC.paint(core, c1);
    OC.withSway(core, () => 0);
    list.push(core);
    const merged = OC.mergeGeometries(list);
    merged.scale(1, spiky ? 0.35 : 0.24, 1);
    merged.translate(0, 0.08, 0);
    return merged;
  }
  BUILDERS.buildStarfish = buildStarfish;

  function buildTritonShell() {
    const pts = [];
    for (let i = 0; i <= 54; i++) {
      const t = i / 54;
      const a = t * Math.PI * 4.4;
      const r = 0.05 + 0.72 * Math.pow(t, 1.45);
      pts.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, t * 1.15));
    }
    const g = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 28, 0.15, 5, false);
    OC.geoPrep(g);
    OC.paint(g, (x, y, z, c) => {
      const band = Math.sin(Math.atan2(y, x) * 3 + z * 3.5);
      c.setHSL(0.08, 0.45, 0.62 + band * 0.18);
    });
    OC.withSway(g, () => 0);
    OC.xform(g, { r: [-Math.PI / 2, 0, 0], p: [0, 0.12, 0] });
    return g;
  }
  BUILDERS.buildTritonShell = buildTritonShell;

  function buildCrinoid(hue, rng) {
    const list = [];
    const c1 = COL().setHSL(hue, 0.78, 0.42);
    const c2 = COL().setHSL((hue + 0.06) % 1, 0.94, 0.66);

    const calyx = new T.SphereGeometry(0.24, 7, 5);
    OC.geoPrep(calyx);
    OC.paint(calyx, c1);
    OC.withSway(calyx, () => 0);
    calyx.translate(0, 0.14, 0);
    list.push(calyx);

    const arms = 9;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2 + (rng() - 0.5) * 0.25;
      const len = OC.lerp(0.95, 1.45, rng());
      const pts = [];
      for (let s = 0; s <= 4; s++) {
        const t = s / 4;
        const rad = 0.12 + t * len * 0.72;
        const arch = Math.sin(t * Math.PI * 0.72) * len * 0.85;
        pts.push(new T.Vector3(Math.cos(a) * rad, 0.18 + arch, Math.sin(a) * rad));
      }
      const arm = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 5, 0.038, 3, false);
      OC.geoPrep(arm);
      OC.paint(arm, (x, y, z, c) => c.copy(c1).lerp(c2, OC.clamp(y / 1.2, 0, 1)));
      OC.withSway(arm, (x, y, z) => OC.clamp((y - 0.12) / 1.2, 0, 1));
      list.push(arm);

      // Перистая веточка на середине луча
      const frond = new T.ConeGeometry(0.14, len * 0.72, 3);
      OC.geoPrep(frond);
      frond.scale(0.16, 1, 1);
      OC.paint(frond, c2);
      OC.withSway(frond, () => 0.75);
      OC.xform(frond, {
        r: [0, -a, -0.78],
        p: [Math.cos(a) * len * 0.48, 0.62, Math.sin(a) * len * 0.48]
      });
      list.push(frond);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildCrinoid = buildCrinoid;

  function buildGalapagosBarnacle(rng) {
    const list = [];
    const cShell = COL(0xdfd3c8);
    const cRidge = COL(0x9b5a68);
    const cDark = COL(0x3a2a30);

    const nShells = 6;
    for (let i = 0; i < nShells; i++) {
      const a = i === 0 ? 0 : (i / (nShells - 1)) * Math.PI * 2 + rng() * 0.35;
      const dist = i === 0 ? 0 : OC.lerp(0.24, 0.42, rng());
      const h = i === 0 ? OC.lerp(0.55, 0.82, rng()) : OC.lerp(0.28, 0.52, rng());
      const rB = i === 0 ? 0.28 : OC.lerp(0.14, 0.22, rng());
      const cone = OC.geoPrep(new T.CylinderGeometry(rB * 0.46, rB, h, 7));
      OC.paint(cone, (x, y, z, col) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        const rib = Math.sin(Math.atan2(z, x) * 6.0);
        col.copy(cShell).lerp(cRidge, rib > 0.2 ? 0.55 : 0.15).lerp(cDark, u > 0.86 ? 0.75 : 0);
      });
      OC.xform(cone, { r: [(rng() - 0.5) * 0.22, rng() * 2, (rng() - 0.5) * 0.22], p: [Math.cos(a) * dist, h * 0.44, Math.sin(a) * dist] });
      OC.withSway(cone, () => 0);
      list.push(cone);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildGalapagosBarnacle = buildGalapagosBarnacle;
})(window.OC);
