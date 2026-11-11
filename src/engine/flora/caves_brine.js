/* ================= ПРОЦЕДУРНЫЕ ГЕОМЕТРИИ: карст, сеноты и соляные шпили ================= */
/* Часть библиотеки OC.FloraLibrary. Каждый builder чистый: (параметры, rng) -> BufferGeometry.
   Материалы и реестр прототипов живут в engine/flora_library.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});

  function buildHaliteSpire(rng) {
    const list = [];
    const cSaltA = COL(0xdbf6fa);
    const cSaltB = COL(0x74d8dc);
    const cBase = COL(0x6b828d);
    const cnt = 5;
    for (let i = 0; i < cnt; i++) {
      const h = i === 0 ? OC.lerp(1.4, 2.2, rng()) : OC.lerp(0.65, 1.35, rng());
      const w = i === 0 ? OC.lerp(0.62, 0.88, rng()) : OC.lerp(0.32, 0.55, rng());
      const ox = i === 0 ? 0 : Math.cos(i * 1.45) * OC.lerp(0.35, 0.75, rng());
      const oz = i === 0 ? 0 : Math.sin(i * 1.45) * OC.lerp(0.35, 0.75, rng());
      const box = OC.geoPrep(new T.BoxGeometry(w, h, w * OC.lerp(0.82, 1.18, rng())));
      OC.paint(box, (x, y, z, col) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        col.copy(cBase).lerp(cSaltB, OC.smoothstep(0.05, 0.45, u)).lerp(cSaltA, OC.smoothstep(0.55, 1.0, u));
      });
      OC.xform(box, {
        r: [(rng() - 0.5) * 0.25, rng() * 1.5, (rng() - 0.5) * 0.25],
        p: [ox, h * 0.46, oz]
      });
      OC.withSway(box, () => 0);
      list.push(box);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildHaliteSpire = buildHaliteSpire;

  function buildStalactite(rng) {
    const list = [];
    const cTop = COL(0x7c6a56);
    const cMid = COL(0xcab490);
    const cTip = COL(0xeadac0);

    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const h = i === 0 ? OC.lerp(2.6, 4.2, rng()) : OC.lerp(1.2, 2.3, rng());
      const rTop = i === 0 ? OC.lerp(0.46, 0.72, rng()) : OC.lerp(0.22, 0.36, rng());
      const ox = i === 0 ? 0 : Math.cos(i * 2.4 + rng()) * OC.lerp(0.32, 0.62, rng());
      const oz = i === 0 ? 0 : Math.sin(i * 2.4 + rng()) * OC.lerp(0.32, 0.62, rng());
      const cone = new T.CylinderGeometry(rTop, 0.04, h, 8, 5);
      const cp = cone.attributes.position;
      for (let k = 0; k < cp.count; k++) {
        const vx = cp.getX(k), vy = cp.getY(k), vz = cp.getZ(k);
        const a = Math.atan2(vz, vx);
        const flute = 1 + 0.22 * Math.sin(a * 5 + vy * 1.4) + 0.12 * Math.cos(vy * 3.8);
        cp.setXYZ(k, vx * flute, vy, vz * flute);
      }
      OC.geoPrep(cone);
      cone.computeVertexNormals();
      OC.paint(cone, (x, y, z, col) => {
        const u = OC.clamp((h * 0.5 - y) / h, 0, 1); // 0 у потолка -> 1 на острие внизу
        col.copy(cTop).lerp(cMid, OC.smoothstep(0.08, 0.65, u)).lerp(cTip, OC.smoothstep(0.72, 1.0, u));
      });
      OC.withSway(cone, () => 0);
      OC.xform(cone, { p: [ox, -h * 0.48, oz] });
      list.push(cone);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildStalactite = buildStalactite;

  function buildStalagmite(rng) {
    const list = [];
    const cBase = COL(0x5e5346);
    const cMid = COL(0xb59c78);
    const cCap = COL(0xdfd0b4);

    const h = OC.lerp(2.1, 3.6, rng());
    const colGeo = new T.CylinderGeometry(0.18, 0.64, h, 9, 6);
    const cp = colGeo.attributes.position;
    for (let k = 0; k < cp.count; k++) {
      const vx = cp.getX(k), vy = cp.getY(k), vz = cp.getZ(k);
      const u = OC.clamp((vy + h * 0.5) / h, 0, 1);
      const terrace = 1 + 0.16 * Math.sin(u * 16.0) + 0.14 * Math.sin(Math.atan2(vz, vx) * 4.0);
      cp.setXYZ(k, vx * terrace, vy, vz * terrace);
    }
    OC.geoPrep(colGeo);
    colGeo.computeVertexNormals();
    OC.paint(colGeo, (x, y, z, col) => {
      const u = OC.clamp((y + h * 0.5) / h, 0, 1);
      col.copy(cBase).lerp(cMid, OC.smoothstep(0.1, 0.68, u)).lerp(cCap, OC.smoothstep(0.76, 1.0, u));
    });
    OC.withSway(colGeo, () => 0);
    OC.xform(colGeo, { p: [0, h * 0.48, 0] });
    list.push(colGeo);

    const side = new T.ConeGeometry(0.42, h * 0.48, 7);
    OC.geoPrep(side);
    OC.paint(side, (x, y, z, col) => col.copy(cBase).lerp(cMid, OC.smoothstep(-0.3, 0.5, y)));
    OC.withSway(side, () => 0);
    OC.xform(side, { p: [OC.lerp(-0.42, 0.42, rng()), h * 0.22, OC.lerp(-0.42, 0.42, rng())] });
    list.push(side);
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildStalagmite = buildStalagmite;

  function buildCenoteVine(rng) {
    const list = [];
    const cBark = COL(0x5a432b);
    const cRoot = COL(0x886b45);
    const cLeaf = COL(0x3b8c42);

    const nStrands = 3;
    for (let s = 0; s < nStrands; s++) {
      const len = OC.lerp(7.5, 11.8, rng());
      const ox = (s - 1) * 0.28;
      const oz = Math.sin(s * 2.1) * 0.25;
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        pts.push(new T.Vector3(
          ox + Math.sin(t * 5.2 + s * 1.4) * 0.18 * t,
          -t * len,
          oz + Math.cos(t * 4.4 + s) * 0.16 * t
        ));
      }
      const strand = OC.geoPrep(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 12, s === 1 ? 0.065 : 0.042, 5, false));
      OC.paint(strand, (x, y, z, col) => {
        const u = OC.clamp(-y / len, 0, 1);
        col.copy(cBark).lerp(cRoot, u);
      });
      OC.withSway(strand, (x, y) => OC.clamp(-y / len, 0, 1) * 0.52);
      list.push(strand);
    }

    // Несколько тропических листьев в верхней части лианы у края провала
    for (let i = 0; i < 6; i++) {
      const ly = -OC.lerp(0.6, 3.6, rng());
      const la = i * 1.05 + rng() * 0.5;
      const leaf = OC.geoPrep(new T.PlaneGeometry(0.42, 0.78, 2, 2));
      OC.paint(leaf, (x, y, z, col) => col.copy(cLeaf).offsetHSL(0, 0, y * 0.12));
      OC.withSway(leaf, () => 0.22);
      OC.xform(leaf, { r: [0.45, la, 0.2], p: [Math.cos(la) * 0.24, ly, Math.sin(la) * 0.24] });
      list.push(leaf);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildCenoteVine = buildCenoteVine;

  function buildVolcanicFumarole(rng) {
    const list = [];
    const cBasalt = COL(0x1f1e24);
    const cRust = COL(0x523726);
    const cSulfur = COL(0xdcb428);

    const nCones = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < nCones; i++) {
      const h = i === 0 ? OC.lerp(1.4, 2.3, rng()) : OC.lerp(0.7, 1.3, rng());
      const rBot = i === 0 ? OC.lerp(0.75, 1.05, rng()) : OC.lerp(0.38, 0.58, rng());
      const rTop = rBot * 0.34;
      const ox = i === 0 ? 0 : Math.cos(i * 2.2) * 0.65;
      const oz = i === 0 ? 0 : Math.sin(i * 2.2) * 0.65;
      const vent = new T.CylinderGeometry(rTop, rBot, h, 8, 4, true);
      const vp = vent.attributes.position;
      for (let k = 0; k < vp.count; k++) {
        const vx = vp.getX(k), vy = vp.getY(k), vz = vp.getZ(k);
        const rug = 1 + 0.22 * Math.sin(Math.atan2(vz, vx) * 4 + vy * 3.1);
        vp.setXYZ(k, vx * rug, vy, vz * rug);
      }
      OC.geoPrep(vent);
      vent.computeVertexNormals();
      OC.paint(vent, (x, y, z, col) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        col.copy(cBasalt).lerp(cRust, OC.smoothstep(0.35, 0.78, u)).lerp(cSulfur, OC.smoothstep(0.76, 1.0, u));
      });
      OC.xform(vent, { p: [ox, h * 0.45, oz] });
      OC.withSway(vent, () => 0);
      list.push(vent);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildVolcanicFumarole = buildVolcanicFumarole;
})(window.OC);
