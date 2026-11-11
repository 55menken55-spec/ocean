/* ================= ПРОЦЕДУРНАЯ ФЛОРА: БАЙКАЛЬСКИЕ ГУБКИ И ХАРОВЫЕ ЛУГА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const B = (OC._FloraBuilders = OC._FloraBuilders || {});

  function buildBaikalSponge(rng) {
    const parts = [];
    const dark = new T.Color(0x3c7068);
    const light = new T.Color(0xb2c394);
    const stems = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < stems; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * 0.58;
      const h = 0.7 + rng() * 1.65;
      const tube = new T.CylinderGeometry(0.075 + rng() * 0.035, 0.18 + rng() * 0.08, h, 7, 3, true);
      const pos = tube.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const yy = pos.getY(j) / h + 0.5;
        const bend = Math.sin(yy * 2.3 + a) * yy * 0.22;
        pos.setX(j, pos.getX(j) + bend);
        pos.setZ(j, pos.getZ(j) + Math.cos(yy * 2.1 + a) * yy * 0.16);
      }
      tube.computeVertexNormals();
      OC.geoPrep(tube);
      OC.paint(tube, (x, y, z, c) => c.copy(dark).lerp(light, OC.clamp((y / h) * 0.55 + 0.35 + rng() * 0.08, 0, 1)));
      OC.xform(tube, { p: [Math.cos(a) * r, h * 0.5, Math.sin(a) * r] });
      parts.push(tube);
      const cap = new T.SphereGeometry(0.11, 7, 5);
      OC.geoPrep(cap);
      OC.paint(cap, light);
      OC.xform(cap, { s: [1, 0.52, 1], p: [Math.cos(a) * r, h + 0.45, Math.sin(a) * r] });
      parts.push(cap);
    }
    return OC.mergeGeometries(parts);
  }
  B.buildBaikalSponge = buildBaikalSponge;

  function buildCharophyteBed(rng) {
    const parts = [];
    const dark = new T.Color(0x486b4d);
    const bright = new T.Color(0xa3be79);
    for (let i = 0; i < 16; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 1.25;
      const h = 0.35 + rng() * 0.8;
      const stem = new T.CylinderGeometry(0.018, 0.035, h, 4, 4);
      OC.geoPrep(stem);
      OC.paint(stem, (x, y, z, c) => c.copy(dark).lerp(bright, OC.clamp(y / h + 0.5, 0, 1)));
      OC.xform(stem, { r: [(rng() - 0.5) * 0.35, a, (rng() - 0.5) * 0.35], p: [Math.cos(a) * r, h * 0.5, Math.sin(a) * r] });
      parts.push(stem);
      for (let j = 0; j < 3; j++) {
        const branch = new T.ConeGeometry(0.025, 0.28 + rng() * 0.12, 4);
        OC.geoPrep(branch);
        OC.paint(branch, bright);
        const y = h * (0.25 + j * 0.22);
        OC.xform(branch, { r: [0.35, a + j * 2.1, 0.42], p: [Math.cos(a) * r, y, Math.sin(a) * r] });
        parts.push(branch);
      }
    }
    return OC.mergeGeometries(parts);
  }
  B.buildCharophyteBed = buildCharophyteBed;
})(window.OC);
