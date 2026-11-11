/* ================= ГЕОМЕТРИИ: ЖЁСТКИЕ КОРАЛЛЫ РИФОВЫХ БИОМОВ ================= */
/* Ветвистые, столовые, мозговые, массивные Porites (бомми), листовые и корковые колонии.
   Часть OC.FloraLibrary: builder → BufferGeometry, материалы живут в flora_library.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});
  function buildStaghorn(hue, rng) {
    const list = [];
    const baseCol = COL().setHSL(hue, 0.82, 0.36);
    const tipCol = COL().setHSL((hue + 0.04) % 1, 0.92, 0.66);
    const tmpQ = new T.Quaternion();
    const up = new T.Vector3(0, 1, 0);

    function branch(p0, dir, len, rad, depth) {
      const p1 = p0.clone().addScaledVector(dir, len);
      const geo = new T.CylinderGeometry(rad * 0.58, rad, len, 4, 1, false);
      geo.translate(0, len * 0.5, 0);
      tmpQ.setFromUnitVectors(up, dir.clone().normalize());
      geo.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(tmpQ));
      geo.translate(p0.x, p0.y, p0.z);
      OC.geoPrep(geo);
      OC.paint(geo, (x, y, z, c) => {
        const t = OC.clamp(y / 4.2, 0, 1);
        c.copy(baseCol).lerp(tipCol, OC.clamp(t * 0.75 + depth * 0.14, 0, 1));
      });
      OC.withSway(geo, () => 0);
      list.push(geo);

      if (depth < 3) {
        const n = depth === 0 ? 4 : 2 + (rng() < 0.38 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.75;
          const tilt = OC.lerp(0.35, 0.85, rng());
          const nd = dir.clone().multiplyScalar(0.55)
            .add(new T.Vector3(Math.cos(ang) * tilt, 0.85, Math.sin(ang) * tilt)).normalize();
          branch(p1, nd, len * OC.lerp(0.62, 0.82, rng()), rad * 0.66, depth + 1);
        }
      }
    }
    branch(new T.Vector3(0, 0, 0), new T.Vector3(0, 1, 0), OC.lerp(1.4, 2.0, rng()), OC.lerp(0.34, 0.48, rng()), 0);
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildStaghorn = buildStaghorn;

  function buildTable(hue, rng) {
    const list = [];
    const discCol = COL().setHSL(hue, 0.74, 0.45);
    const rimCol = COL().setHSL((hue + 0.04) % 1, 0.9, 0.68);
    const stemCol = COL().setHSL(hue, 0.45, 0.30);

    function plate(px, py, pz, r, thick) {
      const g = new T.CylinderGeometry(r, r * 0.86, thick, 18, 1, false);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        const d = Math.hypot(x, z);
        if (d > r * 0.35) {
          const a = Math.atan2(z, x);
          const wav = 1 + 0.15 * Math.sin(a * 5 + py) + 0.07 * Math.sin(a * 9);
          p.setXYZ(i, x * wav, p.getY(i) + (p.getY(i) > 0 ? 0.1 * Math.sin(a * 4) : 0), z * wav);
        }
      }
      OC.geoPrep(g);
      g.computeVertexNormals();
      OC.paint(g, (x, y, z, c) => {
        const d = Math.hypot(x, z) / r;
        c.copy(discCol).lerp(rimCol, OC.smoothstep(0.55, 1, d));
        if (y < 0) c.offsetHSL(0, 0, -0.1);
      });
      OC.withSway(g, () => 0);
      OC.xform(g, { p: [px, py, pz] });
      list.push(g);
    }

    const stem = new T.CylinderGeometry(0.42, 0.72, 2.6, 7);
    OC.geoPrep(stem);
    stem.translate(0, 1.3, 0);
    OC.paint(stem, (x, y, z, c) => c.copy(stemCol).offsetHSL(0, 0, y * 0.02));
    OC.withSway(stem, () => 0);
    list.push(stem);

    plate(0, 2.6, 0, OC.lerp(2.7, 3.6, rng()), 0.28);
    plate(0.4, 3.5, -0.2, OC.lerp(1.5, 2.2, rng()), 0.22);
    plate(-1.4, 1.8, 0.9, OC.lerp(1.1, 1.6, rng()), 0.2);
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildTable = buildTable;

  function buildBrain(hue, rng) {
    const g = new T.SphereGeometry(1, 14, 10);
    const p = g.attributes.position;
    const freq = 8 + Math.floor(rng() * 4);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const th = Math.atan2(z, x);
      const groove = 1 + 0.055 * Math.sin(th * freq + Math.sin(y * 5.2) * 2.4);
      const squash = y < 0 ? 0.5 : 1.0;
      p.setXYZ(i, x * groove * 1.45, y * groove * 1.05 * squash + 0.4, z * groove * 1.45);
    }
    OC.geoPrep(g);
    g.computeVertexNormals();
    const c1 = COL().setHSL(hue, 0.68, 0.38);
    const c2 = COL().setHSL((hue + 0.06) % 1, 0.88, 0.62);
    OC.paint(g, (x, y, z, c) => {
      const ridge = Math.sin(Math.atan2(z, x) * freq + Math.sin(y * 5.2) * 2.4);
      c.copy(c1).lerp(c2, ridge * 0.5 + 0.5);
    });
    OC.withSway(g, () => 0);
    return g;
  }
  BUILDERS.buildBrain = buildBrain;

  function buildBommie(hue, rng) {
    const list = [];
    const c1 = COL().setHSL(hue, 0.52, 0.36);
    const c2 = COL().setHSL((hue + 0.05) % 1, 0.72, 0.55);
    const nLobes = 4;
    for (let i = 0; i < nLobes; i++) {
      const h = i === 0 ? OC.lerp(3.2, 4.4, rng()) : OC.lerp(1.6, 3.0, rng());
      const r = i === 0 ? OC.lerp(1.3, 1.8, rng()) : OC.lerp(0.7, 1.2, rng());
      const g = new T.SphereGeometry(1, 10, 8);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const vx = p.getX(k), vy = p.getY(k), vz = p.getZ(k);
        const bump = 1 + 0.14 * Math.sin(vx * 3.5 + i) * Math.cos(vy * 4.2) + 0.08 * Math.sin(vz * 5.1);
        p.setXYZ(k, vx * r * bump, (vy * 0.5 + 0.5) * h, vz * r * bump);
      }
      OC.geoPrep(g);
      g.computeVertexNormals();
      OC.paint(g, (x, y, z, c) => c.copy(c1).lerp(c2, OC.clamp(y / h, 0, 1)));
      OC.withSway(g, () => 0);
      if (i > 0) {
        const a = (i / (nLobes - 1)) * 6.28 + rng();
        OC.xform(g, { p: [Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1] });
      }
      list.push(g);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildBommie = buildBommie;

  function buildPlateCoral(hue, rng) {
    const list = [];
    const c1 = COL().setHSL(hue, 0.65, 0.34);
    const c2 = COL().setHSL((hue + 0.08) % 1, 0.85, 0.62);
    const tiers = 4;
    for (let i = 0; i < tiers; i++) {
      const r = OC.lerp(1.1, 2.2, rng());
      const g = new T.CylinderGeometry(r, r * 0.6, 0.16, 14, 1, false, 0, Math.PI * 1.45);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), z = p.getZ(k);
        const d = Math.hypot(x, z);
        p.setY(k, p.getY(k) + Math.sin(d * 2.5 + i) * 0.14 + d * 0.12);
      }
      OC.geoPrep(g);
      g.computeVertexNormals();
      OC.paint(g, (x, y, z, c) => {
        c.copy(c1).lerp(c2, OC.smoothstep(0.4 * r, r, Math.hypot(x, z)));
      });
      OC.withSway(g, () => 0);
      OC.xform(g, {
        p: [(rng() - 0.5) * 0.9, 0.35 + i * 0.65, (rng() - 0.5) * 0.9],
        r: [OC.lerp(-0.2, 0.25, rng()), rng() * 6.28, OC.lerp(-0.2, 0.25, rng())]
      });
      list.push(g);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildPlateCoral = buildPlateCoral;

  function buildCrustCoral(hue, rng) {
    const list = [];
    const c1 = COL().setHSL(hue, 0.56, 0.36);
    const c2 = COL().setHSL((hue + 0.06) % 1, 0.78, 0.58);
    const lobes = 4 + Math.floor(rng() * 2);
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 + rng() * 0.5;
      const d = i === 0 ? 0 : OC.lerp(0.65, 1.35, rng());
      const rx = OC.lerp(0.85, 1.45, rng());
      const ry = OC.lerp(0.18, 0.36, rng());
      const g = new T.CylinderGeometry(rx, rx * 0.82, ry, 10, 1);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const vx = p.getX(k), vy = p.getY(k), vz = p.getZ(k);
        const w = 1 + 0.14 * Math.sin(Math.atan2(vz, vx) * 4 + i);
        p.setXYZ(k, vx * w, vy + (vy > 0 ? Math.sin(vx * 2.1 + vz * 2.3) * 0.06 : 0), vz * w);
      }
      OC.geoPrep(g);
      g.computeVertexNormals();
      OC.paint(g, (x, y, z, c) => {
        const r = Math.hypot(x, z) / Math.max(0.5, rx);
        c.copy(c1).lerp(c2, OC.smoothstep(0.35, 1.0, r));
      });
      OC.withSway(g, () => 0);
      OC.xform(g, {
        r: [(rng() - 0.5) * 0.18, rng() * 6.28, (rng() - 0.5) * 0.18],
        p: [Math.cos(a) * d, ry * 0.42 + i * 0.03, Math.sin(a) * d]
      });
      list.push(g);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildCrustCoral = buildCrustCoral;
})(window.OC);
