/* ================= ПРОЦЕДУРНЫЕ ГЕОМЕТРИИ: арктический лёд, брайниклы и полярный бентос ================= */
/* Часть библиотеки OC.FloraLibrary. Каждый builder чистый: (параметры, rng) -> BufferGeometry.
   Материалы и реестр прототипов живут в engine/flora_library.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});

  function buildIceFloe(rng) {
    const list = [];
    const snowCol = COL(0xf0f7fc);
    const iceMid = COL(0x88d4f2);
    const iceDeep = COL(0x2878b4);

    // Верхняя заснеженная паковая плита (+0.15 .. +1.25 м над водой)
    const r = OC.lerp(7.5, 13.5, rng());
    const topPlate = new T.CylinderGeometry(r * 0.92, r * 1.04, 1.35, 9, 1);
    const tp = topPlate.attributes.position;
    for (let k = 0; k < tp.count; k++) {
      const vx = tp.getX(k), vy = tp.getY(k), vz = tp.getZ(k);
      const a = Math.atan2(vz, vx);
      const j = 1 + 0.22 * Math.sin(a * 3 + 0.8) + 0.14 * Math.cos(a * 5 - 1.2);
      const ridge = vy > 0 ? (0.45 * Math.sin(vx * 0.35 + vz * 0.28) + 0.35) : 0;
      tp.setXYZ(k, vx * j, vy + ridge, vz * j);
    }
    OC.geoPrep(topPlate);
    topPlate.computeVertexNormals();
    OC.paint(topPlate, (x, y, z, c) => c.copy(iceMid).lerp(snowCol, OC.smoothstep(-0.35, 0.45, y)));
    OC.withSway(topPlate, () => 0);
    OC.xform(topPlate, { p: [0, 0.12, 0] });
    list.push(topPlate);
    if (rng() < 0.36) {
      const hole = new T.CylinderGeometry(r * 0.18, r * 0.2, 0.08, 9);
      OC.geoPrep(hole);
      OC.paint(hole, 0x123b4b);
      OC.xform(hole, { p: [0, 0.83, 0] });
      list.push(hole);
    }

    // Подводный ледовый киль (-0.5 .. -4.8 м под водой)
    const keelDepth = OC.lerp(2.6, 5.4, rng());
    const keel = new T.ConeGeometry(r * 0.88, keelDepth, 8);
    keel.rotateX(Math.PI);
    const kp = keel.attributes.position;
    for (let k = 0; k < kp.count; k++) {
      const vx = kp.getX(k), vy = kp.getY(k), vz = kp.getZ(k);
      const a = Math.atan2(vz, vx);
      const w = 1 + 0.20 * Math.sin(a * 4 + vy * 0.9);
      kp.setXYZ(k, vx * w, vy, vz * w);
    }
    OC.geoPrep(keel);
    keel.computeVertexNormals();
    OC.paint(keel, (x, y, z, c) => c.copy(iceDeep).lerp(iceMid, OC.smoothstep(-keelDepth * 0.5, 0.2, y)));
    OC.withSway(keel, () => 0);
    OC.xform(keel, { p: [0, -keelDepth * 0.5 - 0.35, 0] });
    list.push(keel);

    return OC.mergeGeometries(list);
  }
  BUILDERS.buildIceFloe = buildIceFloe;

  function buildIceberg(rng) {
    const list = [];
    const snowCol = COL(0xf4f9ff);
    const glacCol = COL(0x7cd6f5);
    const deepCol = COL(0x1f6ca8);

    const wR = OC.lerp(10.0, 15.5, rng());
    const topH = OC.lerp(9.5, 16.5, rng());
    const keelH = OC.lerp(18.0, 27.0, rng());

    // Два гранёных ледяных шпиля над поверхностью
    for (let s = 0; s < 2; s++) {
      const h = s === 0 ? topH : topH * OC.lerp(0.55, 0.78, rng());
      const r = s === 0 ? wR : wR * 0.72;
      const ox = s === 0 ? 0 : (rng() - 0.5) * wR * 0.9;
      const oz = s === 0 ? 0 : (rng() - 0.5) * wR * 0.9;
      const spire = new T.ConeGeometry(r, h, 7, 2);
      const sp = spire.attributes.position;
      for (let k = 0; k < sp.count; k++) {
        const vx = sp.getX(k), vy = sp.getY(k), vz = sp.getZ(k);
        const a = Math.atan2(vz, vx);
        const facet = 1 + 0.24 * Math.sin(a * 3 + s * 1.4) + 0.14 * Math.cos(vy * 0.45);
        sp.setXYZ(k, vx * facet, vy, vz * facet);
      }
      OC.geoPrep(spire);
      spire.computeVertexNormals();
      OC.paint(spire, (x, y, z, c) => c.copy(glacCol).lerp(snowCol, OC.smoothstep(-h * 0.35, h * 0.28, y)));
      OC.withSway(spire, () => 0);
      OC.xform(spire, { p: [ox, h * 0.45 - 0.6, oz] });
      list.push(spire);
    }

    // Мощный подводный киль айсберга
    const keel = new T.ConeGeometry(wR * 1.18, keelH, 8, 3);
    keel.rotateX(Math.PI);
    const kp = keel.attributes.position;
    for (let k = 0; k < kp.count; k++) {
      const vx = kp.getX(k), vy = kp.getY(k), vz = kp.getZ(k);
      const a = Math.atan2(vz, vx);
      const carv = 1 + 0.24 * Math.sin(a * 4 + vy * 0.22);
      kp.setXYZ(k, vx * carv, vy, vz * carv);
    }
    OC.geoPrep(keel);
    keel.computeVertexNormals();
    OC.paint(keel, (x, y, z, c) => c.copy(deepCol).lerp(glacCol, OC.smoothstep(-keelH * 0.5, keelH * 0.4, y)));
    OC.withSway(keel, () => 0);
    OC.xform(keel, { p: [0, -keelH * 0.5 - 0.2, 0] });
    list.push(keel);

    return OC.mergeGeometries(list);
  }
  BUILDERS.buildIceberg = buildIceberg;

  function buildBrinicle(rng) {
    const list = [];
    const iceTip = COL(0xeaf8ff);
    const iceCore = COL(0x7be0ff);
    const brineCol = COL(0x3696cc);

    const h = OC.lerp(7.5, 13.5, rng());
    const col = new T.CylinderGeometry(0.18, 0.72, h, 8, 4);
    const cp = col.attributes.position;
    for (let k = 0; k < cp.count; k++) {
      const vx = cp.getX(k), vy = cp.getY(k), vz = cp.getZ(k);
      const a = Math.atan2(vz, vx);
      const icicle = 1 + 0.28 * Math.sin(a * 5 + vy * 1.2) + 0.16 * Math.cos(vy * 3.1);
      cp.setXYZ(k, vx * icicle, vy, vz * icicle);
    }
    OC.geoPrep(col);
    col.computeVertexNormals();
    OC.paint(col, (x, y, z, c) => c.copy(iceCore).lerp(iceTip, OC.smoothstep(-h * 0.4, h * 0.4, y)));
    OC.withSway(col, () => 0);
    OC.xform(col, { p: [0, h * 0.5, 0] });
    list.push(col);

    // Замёрзший соляной шлейф на дне у основания брайникла
    const base = new T.ConeGeometry(2.1, 0.7, 9);
    OC.geoPrep(base);
    OC.paint(base, (x, y, z, c) => c.copy(brineCol).lerp(iceTip, OC.smoothstep(-0.2, 0.35, y)));
    OC.withSway(base, () => 0);
    OC.xform(base, { p: [0, 0.3, 0] });
    list.push(base);

    return OC.mergeGeometries(list);
  }
  BUILDERS.buildBrinicle = buildBrinicle;

  function buildArcticKelp(rng) {
    const list = [];
    const cHold = COL(0x3d3320);
    const cLeafA = COL(0x5b4a20);
    const cLeafB = COL(0x9a7b2c);

    const hold = new T.ConeGeometry(0.45, 0.4, 6);
    OC.geoPrep(hold);
    OC.paint(hold, cHold);
    OC.withSway(hold, () => 0);
    hold.translate(0, 0.18, 0);
    list.push(hold);

    const nFronds = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < nFronds; i++) {
      const a = (i / nFronds) * Math.PI * 2 + rng() * 0.5;
      const len = OC.lerp(3.2, 6.2, rng());
      const blade = new T.PlaneGeometry(0.68, len, 3, 7);
      const bp = blade.attributes.position;
      for (let k = 0; k < bp.count; k++) {
        const bx = bp.getX(k), by = bp.getY(k) + len * 0.5;
        const u = OC.clamp(by / len, 0, 1);
        const w = Math.sin(Math.pow(u, 0.6) * Math.PI);
        const ruffle = Math.sin(u * 14.0 + i) * 0.14 * Math.abs(bx * 2.2);
        bp.setXYZ(k, bx * w, by, ruffle + Math.sin(u * 3.1) * 0.25);
      }
      OC.geoPrep(blade);
      blade.computeVertexNormals();
      OC.paint(blade, (x, y, z, c) => c.copy(cLeafA).lerp(cLeafB, OC.clamp(y / len, 0, 1)));
      OC.withSway(blade, (x, y, z) => Math.pow(OC.clamp(y / len, 0, 1), 1.25));
      OC.xform(blade, { r: [0.18, a, 0.1], p: [Math.cos(a) * 0.15, 0.2, Math.sin(a) * 0.15] });
      list.push(blade);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildArcticKelp = buildArcticKelp;

  function buildArcticSoftCoral(rng) {
    const list = [];
    const stalkCol = COL(0xb8465a);
    const tipCol = COL(0xff4a6e);

    const stem = new T.CylinderGeometry(0.14, 0.26, 0.9, 6);
    OC.geoPrep(stem);
    OC.paint(stem, stalkCol);
    OC.withSway(stem, (x, y, z) => OC.clamp(y + 0.45, 0, 1) * 0.35);
    OC.xform(stem, { p: [0, 0.45, 0] });
    list.push(stem);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rng() * 0.4;
      const dist = 0.18 + rng() * 0.32;
      const h = 0.65 + rng() * 0.55;
      const lobe = new T.SphereGeometry(0.24, 6, 5);
      lobe.scale(0.95, 1.35, 0.95);
      OC.geoPrep(lobe);
      OC.paint(lobe, (x, y, z, c) => c.copy(stalkCol).lerp(tipCol, OC.clamp(y + 0.3, 0, 1)));
      OC.withSway(lobe, () => 0.65);
      OC.xform(lobe, { p: [Math.cos(a) * dist, h, Math.sin(a) * dist] });
      list.push(lobe);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildArcticSoftCoral = buildArcticSoftCoral;
})(window.OC);
