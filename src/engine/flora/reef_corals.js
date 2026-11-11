/* ================= ПРОЦЕДУРНЫЕ ГЕОМЕТРИИ: кораллы, губки, иглокожие и мангры рифовых биомов ================= */
/* Часть библиотеки OC.FloraLibrary. Каждый builder чистый: (параметры, rng) -> BufferGeometry.
   Материалы и реестр прототипов живут в engine/flora_library.js. */
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

  function buildSeaFan(hue, rng) {
    const list = [];
    const R = OC.lerp(2.4, 3.8, rng());
    const c1 = COL().setHSL(hue, 0.78, 0.40);
    const c2 = COL().setHSL((hue + 0.06) % 1, 0.92, 0.62);
    const SEG_A = 20, SEG_R = 8, SPREAD = 1.12;
    const pos = [], col = [], swy = [];
    const grid = [];

    for (let i = 0; i <= SEG_A; i++) {
      grid[i] = [];
      const a = -SPREAD + (i / SEG_A) * SPREAD * 2;
      for (let j = 0; j <= SEG_R; j++) {
        const t = j / SEG_R;
        const r = R * t * (0.72 + 0.28 * Math.pow(t, 1.7));
        const wob = 1 + 0.06 * Math.sin(i * 1.7 + t * 8);
        grid[i][j] = [Math.sin(a) * r * wob, Math.cos(a) * r * wob, Math.sin(t * 5 + i * 0.7) * 0.12, t];
      }
    }
    for (let i = 0; i < SEG_A; i++) {
      for (let j = 0; j < SEG_R; j++) {
        if (((i * 5 + j * 3) % 10) < 3) continue;
        const q = [grid[i][j], grid[i + 1][j], grid[i][j + 1], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
        for (const v of q) {
          pos.push(v[0], v[1] + 0.4, v[2]);
          const c = c1.clone().lerp(c2, v[3] * 0.9);
          col.push(c.r, c.g, c.b);
          swy.push(Math.pow(v[3], 1.5) * 0.45);
        }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setAttribute('aSway', new T.Float32BufferAttribute(swy, 1));
    g.computeVertexNormals();
    list.push(g);

    const stem = new T.CylinderGeometry(0.11, 0.2, 0.7, 5);
    OC.geoPrep(stem);
    stem.translate(0, 0.35, 0);
    OC.paint(stem, c1);
    OC.withSway(stem, () => 0);
    list.push(stem);
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildSeaFan = buildSeaFan;

  function buildSoftCoral(hue, rng) {
    const list = [];
    const stalkCol = COL().setHSL(hue, 0.45, 0.72);
    const puffCol = COL().setHSL((hue + 0.05) % 1, 0.92, 0.64);
    const nArms = 5;
    for (let i = 0; i < nArms; i++) {
      const a = (i / nArms) * 6.28 + rng() * 0.5;
      const h = OC.lerp(1.4, 2.5, rng());
      const tilt = OC.lerp(0.25, 0.65, rng());
      const st = new T.CylinderGeometry(0.12, 0.24, h, 5);
      OC.geoPrep(st);
      st.translate(0, h * 0.5, 0);
      OC.paint(st, (x, y, z, c) => c.copy(stalkCol).lerp(puffCol, OC.clamp(y / h, 0, 1) * 0.6));
      OC.withSway(st, (x, y) => Math.pow(OC.clamp(y / h, 0, 1), 1.4) * 0.55);
      OC.xform(st, { r: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt] });
      list.push(st);

      const dx = Math.cos(a) * Math.sin(tilt) * h * 0.85;
      const dz = Math.sin(a) * Math.sin(tilt) * h * 0.85;
      const dy = Math.cos(tilt) * h;
      for (let k = 0; k < 2; k++) {
        const pf = new T.IcosahedronGeometry(OC.lerp(0.32, 0.5, rng()), 0);
        OC.geoPrep(pf);
        OC.paint(pf, puffCol);
        OC.withSway(pf, () => 0.55);
        OC.xform(pf, { p: [dx + (rng() - 0.5) * 0.35, dy + (rng() - 0.5) * 0.25, dz + (rng() - 0.5) * 0.35] });
        list.push(pf);
      }
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildSoftCoral = buildSoftCoral;

  function buildBlackCoral(rng) {
    const list = [];
    const baseC = COL(0x14171f);
    const tipC = COL(0x4f5a75);
    const nWhips = 7;
    for (let i = 0; i < nWhips; i++) {
      const pts = [];
      const a = (i / nWhips) * 6.28 + rng() * 0.4;
      const h = OC.lerp(2.2, 4.2, rng());
      for (let s = 0; s <= 5; s++) {
        const t = s / 5;
        pts.push(new T.Vector3(
          Math.cos(a) * t * 1.4 + Math.sin(t * 5 + i) * 0.2,
          t * h,
          Math.sin(a) * t * 1.4 + Math.cos(t * 4 + i) * 0.2
        ));
      }
      const curve = new T.CatmullRomCurve3(pts);
      const tg = new T.TubeGeometry(curve, 10, 0.055, 4, false);
      OC.geoPrep(tg);
      OC.paint(tg, (x, y, z, c) => c.copy(baseC).lerp(tipC, OC.clamp(y / h, 0, 1)));
      OC.withSway(tg, (x, y) => Math.pow(OC.clamp(y / h, 0, 1), 1.5) * 0.45);
      list.push(tg);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildBlackCoral = buildBlackCoral;

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

  function buildWhipCoral(hue, rng) {
    const list = [];
    const baseCol = COL().setHSL(hue, 0.85, 0.42);
    const tipCol = COL().setHSL((hue + 0.08) % 1, 0.95, 0.68);
    const nWhips = 3;
    for (let w = 0; w < nWhips; w++) {
      const ox = (w - 1) * 0.28 + (rng() - 0.5) * 0.14;
      const oz = (rng() - 0.5) * 0.28;
      const h = OC.lerp(2.6, 4.4, rng());
      const pts = [];
      const turns = 2.6 + rng() * 1.4;
      const ph = rng() * 6.28;
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const rad = 0.08 + t * 0.36;
        pts.push(new T.Vector3(
          ox + Math.cos(t * turns * Math.PI * 2 + ph) * rad,
          t * h,
          oz + Math.sin(t * turns * Math.PI * 2 + ph) * rad
        ));
      }
      const whip = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 22, 0.048, 5, false);
      OC.geoPrep(whip);
      OC.paint(whip, (x, y, z, c) => c.copy(baseCol).lerp(tipCol, OC.clamp(y / h, 0, 1)));
      OC.withSway(whip, (x, y) => Math.pow(OC.clamp(y / h, 0, 1), 1.4) * 0.72);
      list.push(whip);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildWhipCoral = buildWhipCoral;

  function buildGoldSeaFan(rng) {
    const list = [];
    const cStem = COL(0xb87212);
    const cFan = COL(0xf4ba2c);
    const stem = new T.CylinderGeometry(0.08, 0.14, 0.65, 6);
    OC.geoPrep(stem);
    OC.paint(stem, cStem);
    OC.withSway(stem, () => 0);
    OC.xform(stem, { p: [0, 0.32, 0] });
    list.push(stem);

    const nRibs = 13;
    for (let i = 0; i < nRibs; i++) {
      const u = (i / (nRibs - 1)) * 2 - 1;
      const ang = u * 1.05;
      const len = OC.lerp(2.1, 3.0, Math.cos(u * 1.1)) * OC.lerp(0.9, 1.12, rng());
      const rib = new T.CylinderGeometry(0.025, 0.055, len, 4);
      OC.geoPrep(rib);
      rib.translate(0, len * 0.5, 0);
      OC.paint(rib, (x, y, z, c) => c.copy(cStem).lerp(cFan, OC.clamp(y / 2.8, 0, 1)));
      OC.withSway(rib, (x, y) => Math.pow(OC.clamp(y / 3.0, 0, 1), 1.2) * 0.45);
      OC.xform(rib, { r: [(rng() - 0.5) * 0.08, 0, -ang], p: [0, 0.55, 0] });
      list.push(rib);
    }
    for (let ring = 1; ring <= 4; ring++) {
      const r = ring * 0.58;
      const arc = new T.TorusGeometry(r, 0.022, 4, 14, Math.PI * 0.78);
      OC.geoPrep(arc);
      OC.paint(arc, cFan);
      OC.withSway(arc, () => Math.pow(ring / 4, 1.2) * 0.42);
      OC.xform(arc, { r: [0, 0, Math.PI * 0.11], p: [0, 0.55, 0] });
      list.push(arc);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildGoldSeaFan = buildGoldSeaFan;

  function buildTubastraeaCoral(rng) {
    const list = [];
    const cBase = COL(0x7c2a12);
    const cOrange = COL(0xf46818);
    const cGold = COL(0xffc938);

    const mound = OC.geoPrep(new T.SphereGeometry(0.42, 8, 6));
    mound.scale(1.15, 0.62, 1.15);
    OC.paint(mound, cBase);
    OC.xform(mound, { p: [0, 0.14, 0] });
    OC.withSway(mound, () => 0);
    list.push(mound);

    const nCups = 9;
    for (let i = 0; i < nCups; i++) {
      const a = (i / nCups) * Math.PI * 2 + rng() * 0.4;
      const r = i === 0 ? 0.04 : OC.lerp(0.18, 0.36, rng());
      const cupH = OC.lerp(0.18, 0.34, rng());
      const cup = OC.geoPrep(new T.CylinderGeometry(0.11, 0.055, cupH, 7));
      OC.paint(cup, (x, y, z, col) => {
        const u = OC.clamp((y + cupH * 0.5) / cupH, 0, 1);
        col.copy(cBase).lerp(cOrange, OC.smoothstep(0.15, 0.72, u)).lerp(cGold, OC.smoothstep(0.76, 1.0, u));
      });
      const tilt = i === 0 ? 0 : 0.48;
      OC.xform(cup, { r: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt], p: [Math.cos(a) * r, 0.28, Math.sin(a) * r] });
      OC.withSway(cup, () => 0);
      list.push(cup);
    }
    return OC.mergeGeometries(list);
  }
  BUILDERS.buildTubastraeaCoral = buildTubastraeaCoral;

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
