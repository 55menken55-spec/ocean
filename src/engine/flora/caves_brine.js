/* ================= ПРОЦЕДУРНЫЕ ГЕОМЕТРИИ: карст, сеноты, соляные шпили и пресноводные пещеры ================= */
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

  /* ---- Пресноводные карстовые пещеры Флориды (биом florida_caves) ---- */

  /* Водяная лилия Nymphaea odorata: плавающие листья с радиальным разрывом
     и белый цветок. Держится у самой поверхности в бассейне источника. */
  function buildWaterLily(rng) {
    const list = [];
    const cPad = COL(0x2f7a3a);
    const cPadRim = COL(0x8fbf6a);
    const cPetal = COL(0xfffdf2);
    const cCore = COL(0xffd75e);
    const pads = 2 + Math.floor(rng() * 2);

    for (let i = 0; i < pads; i++) {
      const a = (i / pads) * Math.PI * 2 + rng() * 0.7;
      const d = i === 0 ? 0 : OC.lerp(0.45, 0.8, rng());
      const r = i === 0 ? OC.lerp(0.5, 0.68, rng()) : OC.lerp(0.34, 0.5, rng());
      const g = new T.CylinderGeometry(r, r * 0.98, 0.035, 16, 1, false);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        const rr = Math.hypot(x, z);
        if (rr > 1e-5) {
          const ang = Math.atan2(z, x);
          // Лист нимфеи разорван от края к центру — узкий клин у черешка
          const notch = 1 - 0.55 * Math.exp(-Math.abs(Math.sin(ang * 0.5)) * 6);
          const curl = (rr / r) * (rr / r) * 0.09;
          p.setXYZ(k, x * notch, y + curl, z * notch);
        }
      }
      g.computeVertexNormals();
      OC.geoPrep(g);
      OC.paint(g, (x, y, z, c) => {
        const rr = Math.hypot(x, z) / r;
        c.copy(cPad).lerp(cPadRim, OC.smoothstep(0.55, 1.0, rr));
      });
      OC.xform(g, { p: [Math.cos(a) * d, 0.02, Math.sin(a) * d] });
      OC.withSway(g, () => 0.12);
      list.push(g);
    }

    if (rng() < 0.85) {
      const fx = (rng() - 0.5) * 0.45;
      const fz = (rng() - 0.5) * 0.45;
      const petals = 7;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        const pet = new T.ConeGeometry(0.055, 0.19, 4);
        OC.geoPrep(pet);
        OC.paint(pet, (x, y, z, c) => c.copy(cPetal).lerp(cCore, y < -0.02 ? 0.5 : 0));
        OC.xform(pet, { r: [Math.sin(a) * 0.75, a, -Math.cos(a) * 0.75], p: [fx + Math.cos(a) * 0.05, 0.12, fz + Math.sin(a) * 0.05] });
        OC.withSway(pet, () => 0.2);
        list.push(pet);
      }
      const core = new T.SphereGeometry(0.045, 8, 6);
      OC.geoPrep(core);
      OC.paint(core, cCore);
      OC.xform(core, { p: [fx, 0.13, fz] });
      OC.withSway(core, () => 0.2);
      list.push(core);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildWaterLily = buildWaterLily;

  /* Тростник Typha domingensis: пучок изогнутых листьев и 1–2 початка рогоза. */
  function buildReed(rng) {
    const list = [];
    const cBase = COL(0x2f5d2a);
    const cTip = COL(0x9ede6a);
    const cSpike = COL(0x6b4423);
    const n = 7 + Math.floor(rng() * 5);

    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.5;
      const d = rng() * 0.34;
      const h = OC.lerp(1.7, 3.1, rng());
      const w = OC.lerp(0.055, 0.11, rng());
      const blade = new T.PlaneGeometry(w, h, 1, 6);
      const bp = blade.attributes.position;
      for (let k = 0; k < bp.count; k++) {
        const x = bp.getX(k), y = bp.getY(k);
        const t = (y + h * 0.5) / h;
        bp.setXYZ(k, x * (1 - t * 0.55), y, Math.sin(t * 1.6) * 0.22 * t);
      }
      blade.computeVertexNormals();
      OC.geoPrep(blade);
      OC.paint(blade, (x, y, z, c) => {
        const t = OC.clamp((y + h * 0.5) / h, 0, 1);
        c.copy(cBase).lerp(cTip, t * 0.85);
      });
      OC.xform(blade, { r: [0, a + rng(), (rng() - 0.5) * 0.3], p: [Math.cos(a) * d, h * 0.5, Math.sin(a) * d] });
      OC.withSway(blade, (x, y) => Math.max(0, y) * 0.5);
      list.push(blade);
    }

    const spikes = 1 + (rng() < 0.5 ? 1 : 0);
    for (let s = 0; s < spikes; s++) {
      const a = rng() * 6.28;
      const d = rng() * 0.28;
      const h = OC.lerp(2.0, 2.8, rng());
      const stem = new T.CylinderGeometry(0.022, 0.032, h, 5, 1);
      OC.geoPrep(stem);
      OC.paint(stem, cBase);
      OC.xform(stem, { p: [Math.cos(a) * d, h * 0.5, Math.sin(a) * d] });
      OC.withSway(stem, (x, y) => Math.max(0, y) * 0.35);
      list.push(stem);

      const head = new T.CylinderGeometry(0.052, 0.052, 0.34, 7, 2);
      OC.geoPrep(head);
      OC.paint(head, (x, y, z, c) => c.copy(cSpike).offsetHSL(0, 0, OC.clamp((y + 0.17) / 0.34, 0, 1) * 0.12));
      OC.xform(head, { p: [Math.cos(a) * d, h + 0.13, Math.sin(a) * d] });
      OC.withSway(head, () => 0.9);
      list.push(head);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildReed = buildReed;

  /* Известняковый уступ: плоские эродированные плиты со слоистостью. */
  function buildLimestoneLedge(rng) {
    const list = [];
    const cTop = COL(0xd8d2c0);
    const cFace = COL(0xa9a292);
    const cBand = COL(0x8b8378);
    const slabs = 2 + Math.floor(rng() * 2);

    for (let i = 0; i < slabs; i++) {
      const w = i === 0 ? OC.lerp(2.2, 3.4, rng()) : OC.lerp(1.1, 1.9, rng());
      const d = i === 0 ? OC.lerp(1.1, 1.8, rng()) : OC.lerp(0.7, 1.2, rng());
      const h = i === 0 ? OC.lerp(0.42, 0.7, rng()) : OC.lerp(0.28, 0.5, rng());
      const g = new T.BoxGeometry(w, h, d, 5, 2, 4);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
        const rug = 1 + 0.06 * Math.sin(x * 2.2 + z * 1.7) + 0.05 * OC.noise2(x * 1.5 + i * 7, z * 1.5);
        p.setXYZ(k, x * rug, y * (1 + 0.04 * Math.cos(x * 3.1)), z * rug);
      }
      g.computeVertexNormals();
      OC.geoPrep(g);
      OC.paint(g, (x, y, z, c) => {
        const band = 0.5 + 0.5 * Math.sin(y * 9.0 + x * 0.4);
        if (y > h * 0.42) c.copy(cTop).lerp(cFace, 0.25);
        else c.copy(cFace).lerp(cBand, band * 0.6);
      });
      OC.xform(g, {
        r: [(rng() - 0.5) * 0.12, rng() * 6.28, (rng() - 0.5) * 0.12],
        p: [i === 0 ? 0 : (rng() - 0.5) * 1.4, h * 0.46, i === 0 ? 0 : (rng() - 0.5) * 1.0]
      });
      OC.withSway(g, () => 0);
      list.push(g);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildLimestoneLedge = buildLimestoneLedge;

  /* Илистый валун: округлая глыба, присыпанная осадком, с натёком ила у подножия. */
  function buildMudRock(rng) {
    const list = [];
    const cRock = COL(0x4a4a58);
    const cSilt = COL(0x6d6a63);
    const cWet = COL(0x2f3138);
    const sx = OC.lerp(0.78, 1.18, rng());
    const sz = OC.lerp(0.78, 1.18, rng());

    const g = new T.SphereGeometry(1, 14, 10);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const n = OC.fbm2(x * 1.6 + 11, z * 1.6, 3);
      const rug = 1 + 0.18 * n + 0.09 * Math.sin(Math.atan2(z, x) * 3 + y * 2.4);
      p.setXYZ(k, x * rug, Math.max(-0.62, y * 0.72 * rug), z * rug);
    }
    g.computeVertexNormals();
    OC.geoPrep(g);
    OC.paint(g, (x, y, z, c) => {
      const t = OC.clamp((y + 0.6) / 1.3, 0, 1);
      c.copy(cWet).lerp(cRock, OC.smoothstep(0.05, 0.55, t)).lerp(cSilt, OC.smoothstep(0.62, 1.0, t));
    });
    OC.xform(g, { r: [rng() * 0.2, rng() * 6.28, rng() * 0.2], s: [sx, 1, sz] });
    OC.withSway(g, () => 0);
    list.push(g);

    const skirt = new T.CylinderGeometry(1.02, 1.24, 0.16, 14, 1, false);
    const sp = skirt.attributes.position;
    for (let k = 0; k < sp.count; k++) {
      const x = sp.getX(k), z = sp.getZ(k);
      const rug = 1 + 0.12 * OC.noise2(x * 2.2 + 5, z * 2.2);
      sp.setXYZ(k, x * rug, sp.getY(k), z * rug);
    }
    skirt.computeVertexNormals();
    OC.geoPrep(skirt);
    OC.paint(skirt, (x, y, z, c) => c.copy(cSilt).lerp(cWet, OC.clamp((y + 0.08) / 0.16, 0, 1) * 0.45));
    OC.xform(skirt, { s: [sx, 1, sz], p: [0, -0.52, 0] });
    OC.withSway(skirt, () => 0);
    list.push(skirt);
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildMudRock = buildMudRock;

  /* Пещерные водоросли: тонкая биоплёнка пятнами на известняке в зоне рассеянного света. */
  function buildCaveAlgae(rng) {
    const list = [];
    const cDark = COL(0x1f6b46);
    const cLit = COL(0x6ee7b7);
    const patches = 5 + Math.floor(rng() * 4);

    for (let i = 0; i < patches; i++) {
      const a = (i / patches) * Math.PI * 2 + rng() * 0.8;
      const d = OC.lerp(0.05, 0.55, rng());
      const w = OC.lerp(0.34, 0.72, rng());
      const g = new T.PlaneGeometry(w, w * OC.lerp(0.7, 1.2, rng()), 4, 4);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k);
        const rr = Math.min(1, Math.hypot(x, y) / (w * 0.5));
        p.setZ(k, Math.cos(rr * Math.PI * 0.5) * 0.075 + OC.noise2(x * 6 + i, y * 6) * 0.02);
      }
      g.computeVertexNormals();
      OC.geoPrep(g);
      OC.paint(g, (x, y, z, c) => {
        const m = 0.5 + 0.5 * OC.noise2(x * 7.5 + 3, y * 7.5);
        c.copy(cDark).lerp(cLit, OC.smoothstep(0.15, 0.85, m));
      });
      /* Пятно ложится плашмя ещё до поворота: PlaneGeometry стоит в плоскости XY,
         а поворот вокруг Y в xform крутил бы его как флаг, а не раскладывал по дну
         (замер: так пятно получалось высотой 0.72 м вместо 0.07 м). */
      g.rotateX(-Math.PI / 2);
      OC.xform(g, { r: [(rng() - 0.5) * 0.22, a, (rng() - 0.5) * 0.22], p: [Math.cos(a) * d, 0.035, Math.sin(a) * d] });
      OC.withSway(g, () => 0.35);
      list.push(g);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildCaveAlgae = buildCaveAlgae;
})(window.OC);
