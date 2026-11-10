/* ================= БИБЛИОТЕКА ПРОЦЕДУРНЫХ ПРОТОТИПОВ ФЛОРЫ И БЕНТОСА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);

  /* ---- 1. Ветвистая акропора (Staghorn Acropora) ---- */
  function buildStaghorn(hue, rng) {
    const list = [];
    const baseCol = COL().setHSL(hue, 0.82, 0.36);
    const tipCol = COL().setHSL((hue + 0.04) % 1, 0.92, 0.66);
    const tmpQ = new T.Quaternion();
    const up = new T.Vector3(0, 1, 0);

    function branch(p0, dir, len, rad, depth) {
      const p1 = p0.clone().addScaledVector(dir, len);
      const geo = new T.CylinderGeometry(rad * 0.58, rad, len, 5, 1, false);
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

  /* ---- 2. Столовидный коралл (Acropora hyacinthus) ---- */
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

  /* ---- 3. Мозговой коралл (Platygyra) ---- */
  function buildBrain(hue, rng) {
    const g = new T.SphereGeometry(1, 20, 14);
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

  /* ---- 4. Массивный коралл Поритес / Бомми (Porites) ---- */
  function buildBommie(hue, rng) {
    const list = [];
    const c1 = COL().setHSL(hue, 0.52, 0.36);
    const c2 = COL().setHSL((hue + 0.05) % 1, 0.72, 0.55);
    const nLobes = 4;
    for (let i = 0; i < nLobes; i++) {
      const h = i === 0 ? OC.lerp(3.2, 4.4, rng()) : OC.lerp(1.6, 3.0, rng());
      const r = i === 0 ? OC.lerp(1.3, 1.8, rng()) : OC.lerp(0.7, 1.2, rng());
      const g = new T.SphereGeometry(1, 14, 10);
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

  /* ---- 5. Листовой пластинчатый коралл (Montipora / Turbinaria) ---- */
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

  /* ---- 6. Веерная горгонария (Sea Fan) ---- */
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

  /* ---- 7. Мягкий коралл Дендронефтия (Soft Coral) ---- */
  function buildSoftCoral(hue, rng) {
    const list = [];
    const stalkCol = COL().setHSL(hue, 0.45, 0.72);
    const puffCol = COL().setHSL((hue + 0.05) % 1, 0.92, 0.64);
    const nArms = 6;
    for (let i = 0; i < nArms; i++) {
      const a = (i / nArms) * 6.28 + rng() * 0.5;
      const h = OC.lerp(1.4, 2.5, rng());
      const tilt = OC.lerp(0.25, 0.65, rng());
      const st = new T.CylinderGeometry(0.12, 0.24, h, 6);
      OC.geoPrep(st);
      st.translate(0, h * 0.5, 0);
      OC.paint(st, (x, y, z, c) => c.copy(stalkCol).lerp(puffCol, OC.clamp(y / h, 0, 1) * 0.6));
      OC.withSway(st, (x, y) => Math.pow(OC.clamp(y / h, 0, 1), 1.4) * 0.55);
      OC.xform(st, { r: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt] });
      list.push(st);

      const dx = Math.cos(a) * Math.sin(tilt) * h * 0.85;
      const dz = Math.sin(a) * Math.sin(tilt) * h * 0.85;
      const dy = Math.cos(tilt) * h;
      for (let k = 0; k < 3; k++) {
        const pf = new T.IcosahedronGeometry(OC.lerp(0.28, 0.46, rng()), 1);
        OC.geoPrep(pf);
        OC.paint(pf, puffCol);
        OC.withSway(pf, () => 0.55);
        OC.xform(pf, { p: [dx + (rng() - 0.5) * 0.35, dy + (rng() - 0.5) * 0.25, dz + (rng() - 0.5) * 0.35] });
        list.push(pf);
      }
    }
    return OC.mergeGeometries(list);
  }

  /* ---- 8. Чёрный коралл (Antipatharia) ---- */
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

  /* ---- 9. Трубчатая губка (Aplysina) ---- */
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

  /* ---- 10. Гигантская бочковидная губка (Xestospongia) ---- */
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

  /* ---- 11. Актиния (тело + колышущиеся щупальца) ---- */
  function buildAnemone(hueB, hueT, rng) {
    const list = [];
    const baseCol = COL().setHSL(hueB, 0.52, 0.34);
    const tColA = COL().setHSL(hueT, 0.88, 0.58);
    const tColB = COL().setHSL((hueT + 0.09) % 1, 0.95, 0.82);

    const bodyH = 0.85;
    const g = new T.CylinderGeometry(1.05, 0.7, bodyH, 10);
    OC.geoPrep(g);
    g.translate(0, bodyH * 0.5, 0);
    OC.paint(g, baseCol);
    OC.withSway(g, () => 0);
    list.push(g);

    const nT = 28;
    for (let i = 0; i < nT; i++) {
      const a = rng() * 6.28;
      const rr = Math.sqrt(rng()) * 1.05;
      const len = OC.lerp(1.0, 2.1, rng());
      const tg = new T.CylinderGeometry(0.05, 0.1, len, 4, 2);
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

  /* ---- 12. Гигантская тридакна (Tridacna gigas) ---- */
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

  /* ---- 13. Морская трава (Seagrass patch) ---- */
  function buildSeagrass(hue, rng) {
    const list = [];
    const n = 26;
    const c1 = COL().setHSL(hue, 0.62, 0.18);
    const c2 = COL().setHSL(hue + 0.04, 0.78, 0.42);
    for (let i = 0; i < n; i++) {
      const a = rng() * 6.28;
      const rr = Math.sqrt(rng()) * 3.8;
      const h = OC.lerp(1.4, 3.2, rng());
      const w = OC.lerp(0.08, 0.15, rng());
      const segs = 4;
      const pos = [], col = [], sw = [];
      const bend = (rng() - 0.5) * 0.8;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs, t1 = (s + 1) / segs;
        const y0 = h * t0, y1 = h * t1;
        const x0 = bend * t0 * t0 * h * 0.22, x1 = bend * t1 * t1 * h * 0.22;
        const w0 = w * (1 - t0 * 0.75), w1 = w * (1 - t1 * 0.75);
        const quad = [
          [x0 - w0, y0], [x0 + w0, y0], [x1 - w1, y1],
          [x0 + w0, y0], [x1 + w1, y1], [x1 - w1, y1]
        ];
        for (const q of quad) {
          pos.push(q[0], q[1], 0);
          const t = q[1] / h;
          const c = c1.clone().lerp(c2, t);
          col.push(c.r, c.g, c.b);
          sw.push(Math.pow(t, 1.55) * 0.65);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.setAttribute('aSway', new T.Float32BufferAttribute(sw, 1));
      g.computeVertexNormals();
      OC.xform(g, {
        p: [Math.cos(a) * rr, 0, Math.sin(a) * rr],
        r: [(rng() - 0.5) * 0.24, rng() * 6.28, (rng() - 0.5) * 0.24]
      });
      list.push(g);
    }
    return OC.mergeGeometries(list);
  }

  /* ---- 14. Ламинария / Саргассум (Kelp cluster) ---- */
  function buildKelp(hue, rng) {
    const list = [];
    const nStrands = 3;
    const c1 = COL().setHSL(hue, 0.6, 0.14);
    const c2 = COL().setHSL(hue + 0.05, 0.8, 0.36);

    for (let k = 0; k < nStrands; k++) {
      const H = OC.lerp(9, 16, rng());
      const segs = 10;
      const wp = rng() * 6.28;
      const bw = OC.lerp(0.45, 0.75, rng());
      const pos = [], col = [], sw = [];
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs, t1 = (s + 1) / segs;
        const y0 = H * t0, y1 = H * t1;
        const cu0 = Math.sin(t0 * 2.5 + wp) * t0 * 1.2;
        const cu1 = Math.sin(t1 * 2.5 + wp) * t1 * 1.2;
        const w0 = bw * (0.35 + 0.85 * Math.sin(t0 * Math.PI * 0.88));
        const w1 = bw * (0.35 + 0.85 * Math.sin(t1 * Math.PI * 0.88));
        const tw0 = Math.sin(t0 * 4.5 + wp) * 0.45;
        const tw1 = Math.sin(t1 * 4.5 + wp) * 0.45;
        const quad = [
          [cu0 - w0 * Math.cos(tw0), y0, w0 * Math.sin(tw0)],
          [cu0 + w0 * Math.cos(tw0), y0, -w0 * Math.sin(tw0)],
          [cu1 - w1 * Math.cos(tw1), y1, w1 * Math.sin(tw1)],
          [cu0 + w0 * Math.cos(tw0), y0, -w0 * Math.sin(tw0)],
          [cu1 + w1 * Math.cos(tw1), y1, -w1 * Math.sin(tw1)],
          [cu1 - w1 * Math.cos(tw1), y1, w1 * Math.sin(tw1)]
        ];
        for (const q of quad) {
          pos.push(q[0], q[1], q[2]);
          const t = q[1] / H;
          const c = c1.clone().lerp(c2, Math.pow(t, 0.8));
          col.push(c.r, c.g, c.b);
          sw.push(Math.pow(t, 1.45));
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.setAttribute('aSway', new T.Float32BufferAttribute(sw, 1));
      g.computeVertexNormals();
      OC.xform(g, { p: [(rng() - 0.5) * 1.6, 0, (rng() - 0.5) * 1.6], r: [0, rng() * 6.28, 0] });
      list.push(g);
    }
    return OC.mergeGeometries(list);
  }

  /* ---- 15. Красные мангры (Rhizophora — корни в воде + крона над поверхностью) ---- */
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

  /* ---- 16. Морской ёж (Diadema) ---- */
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

  /* ---- 17. Звезда Линкия (Blue Starfish) и Терновый венец (COTS) ---- */
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

  /* ---- 18. Раковина Тритонов рог (Charonia tritonis) ---- */
  function buildTritonShell() {
    const pts = [];
    for (let i = 0; i <= 54; i++) {
      const t = i / 54;
      const a = t * Math.PI * 4.4;
      const r = 0.05 + 0.72 * Math.pow(t, 1.45);
      pts.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, t * 1.15));
    }
    const g = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 64, 0.14, 6, false);
    OC.geoPrep(g);
    OC.paint(g, (x, y, z, c) => {
      const band = Math.sin(Math.atan2(y, x) * 3 + z * 3.5);
      c.setHSL(0.08, 0.45, 0.62 + band * 0.18);
    });
    OC.withSway(g, () => 0);
    OC.xform(g, { r: [-Math.PI / 2, 0, 0], p: [0, 0.12, 0] });
    return g;
  }

  /* ---- 19. Корковый коралл и известковый рифовый подлесок (Montipora / Porolithon) ---- */
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

  /* ---- 20. Морская лилия-криноидея (Comanthina schlegeli) ---- */
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

    const arms = 12;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2 + (rng() - 0.5) * 0.25;
      const len = OC.lerp(0.95, 1.45, rng());
      const pts = [];
      for (let s = 0; s <= 5; s++) {
        const t = s / 5;
        const rad = 0.12 + t * len * 0.72;
        const arch = Math.sin(t * Math.PI * 0.72) * len * 0.85;
        pts.push(new T.Vector3(Math.cos(a) * rad, 0.18 + arch, Math.sin(a) * rad));
      }
      const arm = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 7, 0.035, 4, false);
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

  /* ---- 21. Кокосовая пальма и панданус кораллового островка (Sand Cay) ---- */
  function buildIslandPalm(rng) {
    const list = [];
    const barkA = COL(0x70563f);
    const barkB = COL(0x9a7d5c);
    const leafA = COL(0x287834);
    const leafB = COL(0x5eb348);

    const leanX = (rng() - 0.5) * 1.8;
    const leanZ = (rng() - 0.5) * 1.8;
    const topH = OC.lerp(6.8, 9.2, rng());
    const trunkPts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      trunkPts.push(new T.Vector3(leanX * t * t, t * topH, leanZ * t * t));
    }
    const trunk = new T.TubeGeometry(new T.CatmullRomCurve3(trunkPts), 10, 0.24, 6, false);
    const tp = trunk.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const y = tp.getY(i);
      const t = OC.clamp(y / topH, 0, 1);
      const tap = 1.35 - t * 0.72;
      const cx = leanX * t * t, cz = leanZ * t * t;
      tp.setX(i, cx + (tp.getX(i) - cx) * tap);
      tp.setZ(i, cz + (tp.getZ(i) - cz) * tap);
    }
    OC.geoPrep(trunk);
    trunk.computeVertexNormals();
    OC.paint(trunk, (x, y, z, c) => {
      const ring = Math.sin(y * 6.5) * 0.5 + 0.5;
      c.copy(barkA).lerp(barkB, ring * 0.6);
    });
    OC.withSway(trunk, (x, y, z) => OC.clamp(y / topH, 0, 1) * 0.28);
    list.push(trunk);

    // Кокосы у кроны
    const crownX = leanX, crownY = topH, crownZ = leanZ;
    for (let cIdx = 0; cIdx < 3; cIdx++) {
      const ca = (cIdx / 3) * Math.PI * 2 + rng();
      const nut = new T.SphereGeometry(0.24, 6, 5);
      OC.geoPrep(nut);
      OC.paint(nut, 0x5c3e24);
      OC.withSway(nut, () => 0.28);
      OC.xform(nut, { p: [crownX + Math.cos(ca) * 0.35, crownY - 0.25, crownZ + Math.sin(ca) * 0.35] });
      list.push(nut);
    }

    // 9 дугообразных перистых листьев
    const fronds = 9;
    for (let i = 0; i < fronds; i++) {
      const a = (i / fronds) * Math.PI * 2 + (rng() - 0.5) * 0.22;
      const len = OC.lerp(2.7, 3.8, rng());
      const droop = OC.lerp(0.65, 1.35, rng());
      const blade = new T.PlaneGeometry(0.95, len, 2, 6);
      const bp = blade.attributes.position;
      for (let k = 0; k < bp.count; k++) {
        const bx = bp.getX(k);
        const by = bp.getY(k) + len * 0.5; // 0 .. len
        const u = OC.clamp(by / len, 0, 1);
        const width = Math.sin(Math.pow(u, 0.72) * Math.PI) * 1.15;
        const archY = Math.sin(u * Math.PI * 0.62) * 1.05 - u * u * droop;
        bp.setXYZ(k, bx * width, archY, by);
      }
      OC.geoPrep(blade);
      blade.computeVertexNormals();
      OC.paint(blade, (x, y, z, c) => c.copy(leafA).lerp(leafB, OC.clamp(z / len, 0, 1)));
      OC.withSway(blade, (x, y, z) => 0.32 + OC.clamp(z / len, 0, 1) * 0.68);
      OC.xform(blade, { r: [0, a, 0], p: [crownX, crownY, crownZ] });
      list.push(blade);
    }

    return OC.mergeGeometries(list);
  }

  /* ---------- Реестр прототипов ---------- */
  OC.FloraLibrary = {
    create() {
      const rng = OC.mulberry32(99107);

      const matRigid = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.85, metalness: 0.02, side: T.DoubleSide
      }), { causticStrength: 0.92, swayAmp: 0 });

      const matClam = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.42, metalness: 0.12, side: T.DoubleSide
      }), { causticStrength: 1.0, swayAmp: 0 });

      const matSoft = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.82, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.78, swayAmp: 0.42 });

      const matPlant = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.78, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.88, swayAmp: 0.85 });

      const matFoliage = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.72, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.0, swayAmp: 0.48 });

      const prototypes = {
        coral_staghorn: {
          mat: matRigid, maxInstances: 2000, cullDist: 580,
          geos: [buildStaghorn(0.94, rng), buildStaghorn(0.55, rng), buildStaghorn(0.76, rng), buildStaghorn(0.11, rng)]
        },
        coral_table: {
          mat: matRigid, maxInstances: 1700, cullDist: 640,
          geos: [buildTable(0.09, rng), buildTable(0.44, rng), buildTable(0.86, rng), buildTable(0.96, rng)]
        },
        coral_brain: {
          mat: matRigid, maxInstances: 1600, cullDist: 560,
          geos: [buildBrain(0.14, rng), buildBrain(0.24, rng), buildBrain(0.95, rng)]
        },
        coral_bommie: {
          mat: matRigid, maxInstances: 520, cullDist: 700,
          geos: [buildBommie(0.11, rng), buildBommie(0.48, rng)]
        },
        coral_plate: {
          mat: matRigid, maxInstances: 1050, cullDist: 580,
          geos: [buildPlateCoral(0.08, rng), buildPlateCoral(0.82, rng)]
        },
        coral_crust: {
          mat: matRigid, maxInstances: 2400, cullDist: 340,
          geos: [buildCrustCoral(0.94, rng), buildCrustCoral(0.09, rng), buildCrustCoral(0.76, rng)]
        },
        coral_fan: {
          mat: matSoft, maxInstances: 980, cullDist: 540,
          geos: [buildSeaFan(0.88, rng), buildSeaFan(0.02, rng), buildSeaFan(0.74, rng)]
        },
        coral_soft: {
          mat: matSoft, maxInstances: 980, cullDist: 500,
          geos: [buildSoftCoral(0.91, rng), buildSoftCoral(0.78, rng), buildSoftCoral(0.07, rng)]
        },
        coral_black: {
          mat: matSoft, maxInstances: 650, cullDist: 500,
          geos: [buildBlackCoral(rng), buildBlackCoral(rng)]
        },
        crinoid: {
          mat: matSoft, maxInstances: 1100, cullDist: 300,
          geos: [buildCrinoid(0.11, rng), buildCrinoid(0.96, rng), buildCrinoid(0.78, rng)]
        },
        sponge_tube: {
          mat: matRigid, maxInstances: 700, cullDist: 500,
          geos: [buildTubeSponge(0.05, 0.13, rng), buildTubeSponge(0.78, 0.88, rng)]
        },
        sponge_barrel: {
          mat: matRigid, maxInstances: 650, cullDist: 560,
          geos: [buildBarrelSponge(0.06, rng), buildBarrelSponge(0.84, rng)]
        },
        anemone: {
          mat: matSoft, maxInstances: 900, cullDist: 440,
          geos: [buildAnemone(0.74, 0.92, rng), buildAnemone(0.58, 0.50, rng), buildAnemone(0.95, 0.08, rng)]
        },
        giant_clam: {
          mat: matClam, maxInstances: 760, cullDist: 460,
          geos: [buildGiantClam(0.56, rng), buildGiantClam(0.78, rng)]
        },
        seagrass: {
          mat: matPlant, maxInstances: 2600, cullDist: 450,
          geos: [buildSeagrass(0.24, rng), buildSeagrass(0.28, rng)]
        },
        kelp: {
          mat: matPlant, maxInstances: 520, cullDist: 540,
          geos: [buildKelp(0.14, rng), buildKelp(0.18, rng)]
        },
        mangrove: {
          mat: matSoft, maxInstances: 1150, cullDist: 780,
          geos: [buildMangrove(rng), buildMangrove(rng)]
        },
        island_palm: {
          mat: matFoliage, maxInstances: 180, cullDist: 950,
          geos: [buildIslandPalm(rng), buildIslandPalm(rng)]
        },
        urchin: {
          mat: matRigid, maxInstances: 650, cullDist: 280,
          geos: [buildUrchin()]
        },
        starfish_blue: {
          mat: matRigid, maxInstances: 480, cullDist: 280,
          geos: [buildStarfish(5, 0.58, false)]
        },
        starfish_cots: {
          mat: matRigid, maxInstances: 480, cullDist: 300,
          geos: [buildStarfish(11, 0.94, true)]
        },
        shell_triton: {
          mat: matClam, maxInstances: 440, cullDist: 280,
          geos: [buildTritonShell()]
        }
      };

      return prototypes;
    }
  };
})(window.OC);
