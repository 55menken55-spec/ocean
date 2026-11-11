/* ================= ПРОЦЕДУРНЫЕ ГЕОМЕТРИИ: гидротермальные курильщики, холодные сипы и абиссаль ================= */
/* Часть библиотеки OC.FloraLibrary. Каждый builder чистый: (параметры, rng) -> BufferGeometry.
   Материалы и реестр прототипов живут в engine/flora_library.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});

  function buildVentChimney(rng) {
    const list = [];
    const ironDark = COL(0x1e2024);
    const ironPyrite = COL(0x524634);
    const rust = COL(0x8e421c);
    const ember = COL(0xd96822);

    const h = OC.lerp(5.2, 9.6, rng());
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      const secH = h / segs * 1.25;
      const rBot = OC.lerp(1.55, 0.52, t) * OC.lerp(0.85, 1.18, rng());
      const rTop = rBot * 0.84;
      const cyl = new T.CylinderGeometry(rTop, rBot, secH, 9, 2, true);
      const p = cyl.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const vx = p.getX(k), vy = p.getY(k), vz = p.getZ(k);
        const a = Math.atan2(vz, vx);
        const fluting = 1 + 0.22 * Math.sin(a * 5 + i * 1.4) + 0.12 * Math.cos(vy * 2.5 + a * 3);
        p.setXYZ(k, vx * fluting, vy, vz * fluting);
      }
      OC.geoPrep(cyl);
      cyl.computeVertexNormals();
      OC.paint(cyl, (x, y, z, c) => {
        const band = Math.sin((y + t * h) * 2.4 + Math.atan2(z, x)) * 0.5 + 0.5;
        c.copy(ironDark).lerp(ironPyrite, band * 0.65).lerp(rust, OC.smoothstep(0.45, 0.95, t) * 0.45);
      });
      OC.withSway(cyl, () => 0);
      OC.xform(cyl, { p: [(rng() - 0.5) * 0.22 * (1 - t), t * h + secH * 0.45, (rng() - 0.5) * 0.22 * (1 - t)] });
      list.push(cyl);

      // Минеральный фланец (козырёк) на стыке этажей
      if (i > 0 && i < segs - 1) {
        const flange = new T.ConeGeometry(rBot * 1.38, 0.42, 8);
        OC.geoPrep(flange);
        OC.paint(flange, (x, y, z, c) => c.copy(ironPyrite).lerp(rust, 0.4));
        OC.withSway(flange, () => 0);
        OC.xform(flange, { p: [0, t * h, 0] });
        list.push(flange);
      }
    }

    // Жерло курильщика сверху (тёплый сернисто-пиритовый ободок)
    const rim = new T.TorusGeometry(0.48, 0.16, 5, 9);
    OC.geoPrep(rim);
    OC.paint(rim, ember);
    OC.withSway(rim, () => 0);
    OC.xform(rim, { r: [Math.PI / 2, 0, 0], p: [0, h, 0] });
    list.push(rim);

    return OC.mergeGeometries(list);
  }
  BUILDERS.buildVentChimney = buildVentChimney;

  function buildRiftiaWorms(rng) {
    const list = [];
    const tubeA = COL(0xd9d5c8);
    const tubeB = COL(0xa39f92);
    const plumeA = COL(0xc91a2c);
    const plumeB = COL(0xff4f45);

    const n = 9 + Math.floor(rng() * 5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.35;
      const dist = i === 0 ? 0 : OC.lerp(0.25, 0.95, rng());
      const h = OC.lerp(1.4, 2.85, rng());
      const lean = OC.lerp(0.1, 0.42, rng());
      const pts = [
        new T.Vector3(Math.cos(a) * dist * 0.4, 0, Math.sin(a) * dist * 0.4),
        new T.Vector3(Math.cos(a) * (dist + lean * 0.4), h * 0.55, Math.sin(a) * (dist + lean * 0.4)),
        new T.Vector3(Math.cos(a) * (dist + lean), h, Math.sin(a) * (dist + lean))
      ];
      const tube = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.085, 6, false);
      OC.geoPrep(tube);
      OC.paint(tube, (x, y, z, c) => {
        const ring = Math.sin(y * 9.0) * 0.5 + 0.5;
        c.copy(tubeB).lerp(tubeA, ring * 0.75);
      });
      OC.withSway(tube, (x, y, z) => OC.clamp(y / h, 0, 1) * 0.55);
      list.push(tube);

      const plume = new T.ConeGeometry(0.145, 0.44, 6);
      OC.geoPrep(plume);
      OC.paint(plume, (x, y, z, c) => c.copy(plumeA).lerp(plumeB, OC.clamp(y + 0.25, 0, 1)));
      OC.withSway(plume, () => 0.75);
      OC.xform(plume, { r: [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2], p: [pts[2].x, pts[2].y + 0.16, pts[2].z] });
      list.push(plume);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildRiftiaWorms = buildRiftiaWorms;

  function buildVentMussels(rng) {
    const list = [];
    const shellA = COL(0x7c5522);
    const shellB = COL(0xc48b3b);
    const count = 10 + Math.floor(rng() * 6);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * 1.15;
      const sh = new T.SphereGeometry(0.24, 6, 5);
      sh.scale(1.65, 0.65, 0.92);
      OC.geoPrep(sh);
      OC.paint(sh, (x, y, z, c) => c.copy(shellA).lerp(shellB, OC.clamp(y + 0.25, 0, 1)));
      OC.withSway(sh, () => 0);
      OC.xform(sh, { r: [(rng() - 0.5) * 0.4, a, 0.25], p: [Math.cos(a) * d, 0.12 + rng() * 0.16, Math.sin(a) * d] });
      list.push(sh);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildVentMussels = buildVentMussels;

  function buildOsedaxPlume(rng) {
    const list = [];
    const n = 9;
    const cStem = COL(0xe8ded2);
    const cPlume = COL(0xe23864);
    const cTip = COL(0xff84a8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + OC.lerp(-0.2, 0.2, rng());
      const dist = OC.lerp(0.06, 0.34, rng());
      const h = OC.lerp(0.32, 0.68, rng());
      const tilt = OC.lerp(0.18, 0.45, rng());
      const tube = OC.geoPrep(new T.CylinderGeometry(0.022, 0.032, h, 5));
      OC.paint(tube, cStem);
      OC.xform(tube, {
        r: [Math.sin(a) * tilt, 0, Math.cos(a) * tilt],
        p: [Math.cos(a) * dist, h * 0.45, Math.sin(a) * dist]
      });
      OC.withSway(tube, (x, y) => Math.max(0, y) * 0.4);
      list.push(tube);

      // Перистый малиновый плюмаж на вершине
      const plume = OC.geoPrep(new T.ConeGeometry(0.085, 0.24, 6));
      OC.paint(plume, (px, py, pz, col) => col.copy(py > 0.04 ? cTip : cPlume));
      OC.xform(plume, {
        r: [Math.PI + Math.sin(a) * tilt, 0, Math.cos(a) * tilt],
        p: [Math.cos(a) * (dist + tilt * 0.16), h + 0.06, Math.sin(a) * (dist + tilt * 0.16)]
      });
      OC.withSway(plume, (x, y) => Math.max(0, y) * 0.72);
      list.push(plume);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildOsedaxPlume = buildOsedaxPlume;

  function buildHadalSponge(rng) {
    const list = [];
    const h = OC.lerp(1.4, 2.2, rng());
    const bendX = OC.lerp(-0.22, 0.22, rng());
    const bendZ = OC.lerp(-0.22, 0.22, rng());
    const cStalk = COL(0xb9cfd8);
    const cCup = COL(0xe2f0f5);
    const cRim = COL(0x88b4cc);

    const stalk = OC.geoPrep(new T.CylinderGeometry(0.038, 0.065, h, 7, 5));
    const sp = stalk.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const y = sp.getY(i);
      const u = OC.clamp((y + h * 0.5) / h, 0, 1);
      sp.setX(i, sp.getX(i) + bendX * u * u);
      sp.setZ(i, sp.getZ(i) + bendZ * u * u);
    }
    stalk.computeVertexNormals();
    OC.paint(stalk, (x, y, z, col) => col.copy(cStalk));
    OC.xform(stalk, { p: [0, h * 0.5, 0] });
    OC.withSway(stalk, (x, y) => Math.max(0, y) * 0.32);
    list.push(stalk);

    // Ажурный вогнутый диск-фильтратор на конце стебля
    const cap = OC.geoPrep(new T.ConeGeometry(OC.lerp(0.38, 0.56, rng()), 0.28, 12, 1, true));
    cap.rotateX(Math.PI);
    OC.paint(cap, (x, y, z, col) => col.copy(y > 0.02 ? cRim : cCup));
    OC.xform(cap, { r: [bendZ * 0.85, 0, -bendX * 0.85], p: [bendX, h + 0.08, bendZ] });
    OC.withSway(cap, (x, y) => Math.max(0, y) * 0.36);
    list.push(cap);
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildHadalSponge = buildHadalSponge;

  function buildSerpentiniteVent(rng) {
    const list = [];
    const cBase = COL(0x4b5c64);
    const cBody = COL(0xb8c8cc);
    const cCrest = COL(0xe4eeef);
    const spires = 3 + (rng() > 0.45 ? 1 : 0);
    for (let i = 0; i < spires; i++) {
      const h = i === 0 ? OC.lerp(4.4, 7.2, rng()) : OC.lerp(2.2, 4.0, rng());
      const rBot = i === 0 ? OC.lerp(0.9, 1.35, rng()) : OC.lerp(0.45, 0.78, rng());
      const rTop = rBot * 0.34;
      const ox = i === 0 ? 0 : Math.cos(i * 2.2) * OC.lerp(0.7, 1.35, rng());
      const oz = i === 0 ? 0 : Math.sin(i * 2.2) * OC.lerp(0.7, 1.35, rng());
      const g = OC.geoPrep(new T.CylinderGeometry(rTop, rBot, h, 9, 5));
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const vx = p.getX(v), vy = p.getY(v), vz = p.getZ(v);
        const shelf = 1.0 + 0.24 * Math.sin(vy * 3.1 + i) + 0.14 * Math.cos(vx * 3.4 - vz * 2.8);
        p.setXYZ(v, vx * shelf, vy, vz * shelf);
      }
      g.computeVertexNormals();
      OC.paint(g, (x, y, z, col) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        col.copy(cBase).lerp(cBody, OC.smoothstep(0.1, 0.6, u)).lerp(cCrest, OC.smoothstep(0.7, 1.0, u));
      });
      OC.xform(g, { p: [ox, h * 0.46, oz] });
      OC.withSway(g, () => 0);
      list.push(g);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildSerpentiniteVent = buildSerpentiniteVent;

  function buildMethaneHydrate(rng) {
    const list = [];
    const cBase = COL(0x524c48);
    const cIce = COL(0xf4cf76);
    const cTip = COL(0xfff1c4);
    const mound = OC.geoPrep(new T.DodecahedronGeometry(0.95, 1));
    mound.scale(1.25, 0.55, 1.15);
    OC.paint(mound, (x, y, z, col) => col.copy(y > 0.12 ? cIce : cBase));
    OC.xform(mound, { p: [0, 0.25, 0] });
    OC.withSway(mound, () => 0);
    list.push(mound);

    const nShards = 6;
    for (let i = 0; i < nShards; i++) {
      const a = (i / nShards) * 6.283 + rng() * 0.45;
      const dist = OC.lerp(0.18, 0.68, rng());
      const h = OC.lerp(0.75, 1.55, rng());
      const r = OC.lerp(0.16, 0.34, rng());
      const sh = OC.geoPrep(new T.CylinderGeometry(r * 0.28, r, h, 6, 1));
      OC.paint(sh, (x, y, z, col) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        col.copy(cIce).lerp(cTip, OC.smoothstep(0.35, 1.0, u));
      });
      OC.xform(sh, {
        r: [Math.sin(a) * OC.lerp(0.18, 0.48, rng()), rng() * 1.4, Math.cos(a) * OC.lerp(0.18, 0.48, rng())],
        p: [Math.cos(a) * dist, h * 0.45 + 0.18, Math.sin(a) * dist]
      });
      OC.withSway(sh, () => 0);
      list.push(sh);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildMethaneHydrate = buildMethaneHydrate;

  function buildColdTubeworm(rng) {
    const list = [];
    const n = 10;
    const cBase = COL(0x4a4236);
    const cTube = COL(0xc4b08e);
    const cPlume = COL(0xd92658);
    const cTip = COL(0xff8eb4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + OC.lerp(-0.25, 0.25, rng());
      const dist = OC.lerp(0.06, 0.48, rng());
      const h = OC.lerp(1.1, 2.35, rng());
      const bend = OC.lerp(0.24, 0.56, rng());
      const seg = OC.geoPrep(new T.CylinderGeometry(0.036, 0.055, h, 6, 5));
      const sp = seg.attributes.position;
      for (let v = 0; v < sp.count; v++) {
        const vx = sp.getX(v), vy = sp.getY(v), vz = sp.getZ(v);
        const u = OC.clamp((vy + h * 0.5) / h, 0, 1);
        const curve = Math.sin(u * 2.4 + i) * 0.14 + u * u * bend;
        sp.setXYZ(v, vx + Math.cos(a) * curve, vy, vz + Math.sin(a) * curve);
      }
      seg.computeVertexNormals();
      OC.paint(seg, (x, y, z, col) => {
        const u = OC.clamp((y + h * 0.5) / h, 0, 1);
        col.copy(cBase).lerp(cTube, OC.smoothstep(0.08, 0.72, u));
      });
      OC.xform(seg, { p: [Math.cos(a) * dist * 0.4, h * 0.5, Math.sin(a) * dist * 0.4] });
      OC.withSway(seg, (x, y) => Math.max(0, y) * 0.24);
      list.push(seg);

      const plume = OC.geoPrep(new T.ConeGeometry(0.095, 0.28, 7));
      OC.paint(plume, (x, y, z, col) => col.copy(y > 0.04 ? cTip : cPlume));
      OC.xform(plume, {
        r: [Math.PI + Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35],
        p: [Math.cos(a) * (dist * 0.4 + bend), h + 0.06, Math.sin(a) * (dist * 0.4 + bend)]
      });
      OC.withSway(plume, (x, y) => Math.max(0, y) * 0.35);
      list.push(plume);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildColdTubeworm = buildColdTubeworm;
})(window.OC);
