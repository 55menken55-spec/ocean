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

  /* ---- 22. Гигантская калифорнийская ламинария (Macrocystis pyrifera) ---- */
  function buildGiantKelp(hueShift, rng) {
    const list = [];
    const cHold = COL(0x5a4c28);
    const cStipe = COL().setHSL(0.11 + hueShift, 0.56, 0.34);
    const cBlade = COL().setHSL(0.12 + hueShift, 0.72, 0.44);
    const cBladder = COL().setHSL(0.14 + hueShift, 0.78, 0.52);

    // Конический ризоид-прикрепитель к гранитному дну
    const hold = new T.ConeGeometry(0.85, 0.75, 7);
    OC.geoPrep(hold);
    OC.paint(hold, cHold);
    OC.withSway(hold, () => 0);
    hold.translate(0, 0.35, 0);
    list.push(hold);

    const tall = OC.lerp(13.5, 19.5, rng());
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const ph = (sIdx / 3) * Math.PI * 2 + rng();
      const swayX = OC.lerp(0.55, 1.35, rng());
      const pts = [];
      for (let k = 0; k <= 7; k++) {
        const t = k / 7;
        const rad = 0.28 + Math.sin(t * Math.PI * 2.5 + ph) * 0.52 * t;
        pts.push(new T.Vector3(Math.cos(ph + t * 2.2) * rad * swayX, 0.3 + t * tall, Math.sin(ph + t * 2.2) * rad * swayX));
      }
      const stipe = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 14, 0.065, 5, false);
      OC.geoPrep(stipe);
      OC.paint(stipe, cStipe);
      OC.withSway(stipe, (x, y, z) => Math.pow(OC.clamp(y / tall, 0, 1), 1.35));
      list.push(stipe);

      // Поплавки-пневматоцисты и длинные гофрированные пластины вдоль стебля
      const leafSteps = 7;
      for (let li = 1; li <= leafSteps; li++) {
        const lt = li / (leafSteps + 0.5);
        const ly = 0.8 + lt * (tall - 1.2);
        const ang = ph + lt * 4.5 + li * 1.1;
        const lx = Math.cos(ph + lt * 2.2) * (0.28 + Math.sin(lt * Math.PI * 2.5 + ph) * 0.52 * lt) * swayX;
        const lz = Math.sin(ph + lt * 2.2) * (0.28 + Math.sin(lt * Math.PI * 2.5 + ph) * 0.52 * lt) * swayX;
        const sw = Math.pow(OC.clamp(ly / tall, 0, 1), 1.35);

        const bulb = new T.SphereGeometry(0.11, 5, 4);
        OC.geoPrep(bulb);
        OC.paint(bulb, cBladder);
        OC.withSway(bulb, () => sw);
        OC.xform(bulb, { p: [lx + Math.cos(ang) * 0.14, ly, lz + Math.sin(ang) * 0.14] });
        list.push(bulb);

        const blLen = OC.lerp(1.4, 2.5, rng()) * (0.7 + 0.45 * lt);
        const blade = new T.PlaneGeometry(0.46, blLen, 2, 4);
        const bp = blade.attributes.position;
        for (let k = 0; k < bp.count; k++) {
          const bx = bp.getX(k), by = bp.getY(k) + blLen * 0.5;
          const u = OC.clamp(by / blLen, 0, 1);
          const w = Math.sin(Math.pow(u, 0.65) * Math.PI);
          bp.setXYZ(k, bx * w, -u * 0.35 + Math.sin(u * 6.0) * 0.08, by);
        }
        OC.geoPrep(blade);
        blade.computeVertexNormals();
        OC.paint(blade, (x, y, z, c) => c.copy(cStipe).lerp(cBlade, OC.clamp(z / blLen, 0, 1)));
        OC.withSway(blade, () => sw + 0.18);
        OC.xform(blade, { r: [0.22, ang, 0], p: [lx, ly, lz] });
        list.push(blade);
      }
    }
    return OC.mergeGeometries(list);
  }

  /* ---- 23. Фиолетовый морской ёж и охристая звезда Монтерея ---- */
  function buildPurpleUrchin() {
    const list = [];
    const body = new T.SphereGeometry(0.42, 8, 6);
    body.scale(1, 0.72, 1);
    OC.geoPrep(body);
    OC.paint(body, 0x4b1d6b);
    OC.withSway(body, () => 0);
    list.push(body);
    for (let i = 0; i < 28; i++) {
      const dir = OC.fibDir(i, 28);
      const len = 0.42 + (i % 3) * 0.12;
      const sp = new T.ConeGeometry(0.036, len, 4);
      OC.geoPrep(sp);
      sp.translate(0, len * 0.5, 0);
      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      sp.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q));
      sp.translate(dir.x * 0.32, dir.y * 0.24, dir.z * 0.32);
      OC.paint(sp, 0x7b33a8);
      OC.withSway(sp, () => 0);
      list.push(sp);
    }
    return OC.mergeGeometries(list);
  }

  /* ---- 24. Гидротермальная сульфидная труба («чёрный курильщик») ---- */
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

  /* ---- 25. Гигантские трубчатые черви рифтии (Riftia pachyptila) ---- */
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

  /* ---- 26. Колония глубоководных мидий Bathymodiolus ---- */
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

  /* ---- 27. Арктический паковый лёд и подлёдный ледовый киль (ставится на y = 0) ---- */
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

  /* ---- 28. Арктический айсберг (надводная башня + глубокий сапфировый киль, y = 0) ---- */
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

  /* ---- 29. Брайникл («ледяной палец смерти» под молодым паковым льдом) ---- */
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

  /* ---- 30. Сахарная арктическая ламинария (Saccharina latissima) ---- */
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

  /* ---- 31. Арктический мягкий коралл «морская клубника» (Gersemia rubiformis) ---- */
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

  /* ---- 36. Золотистые саргассовы водоросли (Sargassum) ---- */
  function buildSargassum(rng) {
    const list = [];
    const stemCol = COL(0x5d4416);
    const leafCol = COL(0xb98c24);
    const tipCol = COL(0xe2b638);
    const bladderCol = COL(0xdfb842);

    const hold = new T.ConeGeometry(0.45, 0.35, 7);
    OC.geoPrep(hold);
    OC.paint(hold, stemCol);
    OC.withSway(hold, () => 0);
    OC.xform(hold, { p: [0, 0.16, 0] });
    list.push(hold);

    const nFronds = 5;
    for (let f = 0; f < nFronds; f++) {
      const a = (f / nFronds) * Math.PI * 2 + rng() * 0.6;
      const h = OC.lerp(2.6, 4.4, rng());
      const pts = [];
      for (let k = 0; k <= 5; k++) {
        const t = k / 5;
        pts.push(new T.Vector3(Math.cos(a + t * 0.9) * t * 0.75, 0.15 + t * h, Math.sin(a + t * 0.9) * t * 0.75));
      }
      const stipe = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, 0.036, 4, false);
      OC.geoPrep(stipe);
      OC.paint(stipe, stemCol);
      OC.withSway(stipe, (x, y) => Math.pow(OC.clamp(y / h, 0, 1), 1.3));
      list.push(stipe);

      for (let li = 1; li <= 5; li++) {
        const lt = li / 5.5;
        const lx = Math.cos(a + lt * 0.9) * lt * 0.75;
        const lz = Math.sin(a + lt * 0.9) * lt * 0.75;
        const ly = 0.25 + lt * h;
        const sw = Math.pow(OC.clamp(ly / h, 0, 1), 1.3) + 0.15;

        const leaf = new T.PlaneGeometry(0.32, 0.92, 2, 3);
        const lp = leaf.attributes.position;
        for (let k = 0; k < lp.count; k++) {
          const vx = lp.getX(k), vy = lp.getY(k) + 0.46;
          const u = OC.clamp(vy / 0.92, 0, 1);
          lp.setXYZ(k, vx * Math.sin(u * Math.PI) * (1 + 0.22 * Math.sin(u * 14)), Math.sin(u * 7) * 0.06, vy);
        }
        OC.geoPrep(leaf);
        leaf.computeVertexNormals();
        OC.paint(leaf, (x, y, z, c) => c.copy(leafCol).lerp(tipCol, OC.clamp(z, 0, 1)));
        OC.withSway(leaf, () => sw);
        OC.xform(leaf, { r: [0.35, a + li * 1.1, 0], p: [lx, ly, lz] });
        list.push(leaf);

        const bulb = new T.SphereGeometry(0.085, 5, 4);
        OC.geoPrep(bulb);
        OC.paint(bulb, bladderCol);
        OC.withSway(bulb, () => sw);
        OC.xform(bulb, { p: [lx + Math.cos(a + li) * 0.14, ly + 0.08, lz + Math.sin(a + li) * 0.14] });
        list.push(bulb);
      }
    }
    return OC.mergeGeometries(list);
  }

  /* ---- 37. Кованый адмиралтейский якорь и цепь крушения ---- */
  function buildWreckAnchor(rng) {
    const list = [];
    const ironCol = COL(0x3a2a24);
    const rustCol = COL(0x8e4222);
    const patinaCol = COL(0x4b745d);

    function paintRust(g) {
      OC.geoPrep(g);
      OC.paint(g, (x, y, z, c) => {
        const w = Math.sin(x * 3.1 + y * 4.4 + z * 2.7) * 0.5 + 0.5;
        c.copy(ironCol).lerp(rustCol, w * 0.72).lerp(patinaCol, y > 1.3 ? 0.38 : 0.12);
      });
      OC.withSway(g, () => 0);
      return g;
    }

    // Веретено якоря, слегка наклонённое в грунт
    const shank = new T.CylinderGeometry(0.11, 0.15, 2.7, 8);
    OC.xform(paintRust(shank), { r: [0.18, 0, 0.12], p: [0, 1.35, 0] });
    list.push(shank);

    // Изогнутые рога и лапы
    const armsCurve = new T.CatmullRomCurve3([
      new T.Vector3(-0.98, 0.78, 0),
      new T.Vector3(-0.62, 0.24, 0),
      new T.Vector3(0, 0.08, 0),
      new T.Vector3(0.62, 0.24, 0),
      new T.Vector3(0.98, 0.78, 0)
    ]);
    const arms = new T.TubeGeometry(armsCurve, 12, 0.11, 6, false);
    OC.xform(paintRust(arms), { r: [0.18, 0, 0.12] });
    list.push(arms);

    for (const s of [-1, 1]) {
      const fluke = new T.ConeGeometry(0.26, 0.52, 4);
      fluke.scale(0.35, 1, 1.0);
      OC.xform(paintRust(fluke), { r: [0, 0, -s * 0.42], p: [s * 0.96, 0.86, 0.14] });
      list.push(fluke);
    }

    // Шток (поперечина) и кольцо-рым
    const stock = new T.CylinderGeometry(0.08, 0.08, 1.65, 6);
    OC.xform(paintRust(stock), { r: [Math.PI / 2, 0, 0.15], p: [0, 2.28, 0.34] });
    list.push(stock);

    const ring = new T.TorusGeometry(0.22, 0.05, 6, 10);
    OC.xform(paintRust(ring), { r: [0.2, 0.4, 0], p: [0.14, 2.74, 0.44] });
    list.push(ring);

    // Коралловые наросты на якоре
    for (let i = 0; i < 3; i++) {
      const enc = new T.SphereGeometry(0.18 + rng() * 0.12, 6, 5);
      OC.geoPrep(enc);
      OC.paint(enc, i === 0 ? 0xe07842 : 0x62b888);
      OC.withSway(enc, () => 0);
      OC.xform(enc, { p: [(rng() - 0.5) * 0.9, 0.35 + rng() * 1.4, (rng() - 0.5) * 0.35] });
      list.push(enc);
    }
    return OC.mergeGeometries(list);
  }

  /* ---- 38. Спиральный хлыстовой коралл (Cirrhipathes) ---- */
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

  /* ---- 39. Золотой веер крушений (Annella mollis) ---- */
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

  /* ---- 37. Черви-костоеды Osedax («зомби-черви» китового падения) ---- */
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

  /* ---- 38. Ультраабиссальная стебельчатая стеклянная губка Caulophacus ---- */
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

  /* ---- 39. Серпентинитовый карбонатный столб (холодные щелочные сипы Сирена) ---- */
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

  /* ---- 40. Газовый гидрат метана («горящий лёд» CH4) ---- */
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

  /* ---- 41. Вестиментифера холодных сипов (Lamellibrachia luymesi) ---- */
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

  /* ---- 42. Соляной кристалл галита / береговой торос (Halite Spire) ---- */
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

  /* ---- 43. Карстовый сталактит (свисает со свода пещеры вниз) ---- */
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

  /* ---- 44. Карстовый сталагмит / кальцитовая колонна (растёт вверх со дна) ---- */
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

  /* ---- 45. Воздушные корни и лианы сенота (Ficus / Philodendron) ---- */
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

  /* ---- 46. Вулканическая CO2-фумарола (Рока Редонда) ---- */
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

  /* ---- 47. Неоново-оранжевый коралл-чашечка (Tubastraea coccinea) ---- */
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

  /* ---- 48. Вулканический морской жёлудь (Megabalanus galapaganus) ---- */
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

  /* ---- 49. Лавовый ковёр морского салата Ульва (Ulva lobata) ---- */
  function buildUlvaTurf(rng) {
    const list = [];
    const cGreen = COL(0x3cb846);
    const cBright = COL(0x76e054);
    const cRedTurf = COL(0x8c243a);
    const isRed = rng() < 0.28;

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rng() * 0.4;
      const dist = OC.lerp(0.06, 0.36, rng());
      const bw = OC.lerp(0.24, 0.42, rng());
      const bh = OC.lerp(0.38, 0.72, rng());
      const leaf = OC.geoPrep(new T.PlaneGeometry(bw, bh, 3, 4));
      const lp = leaf.attributes.position;
      for (let k = 0; k < lp.count; k++) {
        const lx = lp.getX(k), ly = lp.getY(k);
        const ruffle = Math.sin(ly * 7.5 + i * 1.3) * 0.08 + Math.cos(lx * 8.0) * 0.05;
        lp.setZ(k, ruffle);
      }
      leaf.computeVertexNormals();
      OC.paint(leaf, (x, y, z, col) => {
        const u = OC.clamp((y + bh * 0.5) / bh, 0, 1);
        if (isRed) col.copy(cRedTurf).offsetHSL(0, 0, u * 0.14);
        else col.copy(cGreen).lerp(cBright, u);
      });
      OC.xform(leaf, { r: [0.32 * (rng() - 0.3), a, 0.25], p: [Math.cos(a) * dist, bh * 0.44, Math.sin(a) * dist] });
      OC.withSway(leaf, (x, y) => Math.max(0, y) * 0.65);
      list.push(leaf);
    }
    return OC.mergeGeometries(list);
  }

  /* ---------- Реестр прототипов ---------- */
  let previewCache = null;

  OC.FloraLibrary = {
    create(skipEnhance) {
      const rng = OC.mulberry32(99107);
      const enh = (!skipEnhance && OC.enhanceMaterial) ? OC.enhanceMaterial : ((m) => m);

      const matRigid = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.85, metalness: 0.02, side: T.DoubleSide
      }), { causticStrength: 0.92, swayAmp: 0 });

      const matCoralRigid = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.85, metalness: 0.02, side: T.DoubleSide
      }), { causticStrength: 0.92, swayAmp: 0, bleachable: true });

      const matChimney = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.72, metalness: 0.28, side: T.DoubleSide
      }), { causticStrength: 0.0, swayAmp: 0 });

      const matHydrate = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.28, metalness: 0.06,
        emissive: new T.Color(0x4a3108), emissiveIntensity: 0.42, side: T.DoubleSide
      }), { causticStrength: 0.0, swayAmp: 0 });

      const matClam = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.42, metalness: 0.12, side: T.DoubleSide
      }), { causticStrength: 1.0, swayAmp: 0 });

      const matSoft = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.82, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.78, swayAmp: 0.42 });

      const matCoralSoft = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.82, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.78, swayAmp: 0.42, bleachable: true });

      const matPlant = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.78, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.88, swayAmp: 0.85 });

      const matFoliage = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.72, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.0, swayAmp: 0.48 });

      const matIce = enh(new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.34,
        metalness: 0.08,
        emissive: new T.Color(0x0c3452),
        emissiveIntensity: 0.38,
        side: T.DoubleSide
      }), { causticStrength: 0.52, swayAmp: 0 });

      const prototypes = {
        coral_staghorn: {
          mat: matCoralRigid, maxInstances: 2000, cullDist: 580,
          geos: [buildStaghorn(0.94, rng), buildStaghorn(0.55, rng), buildStaghorn(0.76, rng), buildStaghorn(0.11, rng)]
        },
        coral_table: {
          mat: matCoralRigid, maxInstances: 1700, cullDist: 640,
          geos: [buildTable(0.09, rng), buildTable(0.44, rng), buildTable(0.86, rng), buildTable(0.96, rng)]
        },
        coral_brain: {
          mat: matCoralRigid, maxInstances: 1600, cullDist: 560,
          geos: [buildBrain(0.14, rng), buildBrain(0.24, rng), buildBrain(0.95, rng)]
        },
        coral_bommie: {
          mat: matCoralRigid, maxInstances: 520, cullDist: 700,
          geos: [buildBommie(0.11, rng), buildBommie(0.48, rng)]
        },
        coral_plate: {
          mat: matCoralRigid, maxInstances: 1050, cullDist: 580,
          geos: [buildPlateCoral(0.08, rng), buildPlateCoral(0.82, rng)]
        },
        coral_crust: {
          mat: matCoralRigid, maxInstances: 2400, cullDist: 340,
          geos: [buildCrustCoral(0.94, rng), buildCrustCoral(0.09, rng), buildCrustCoral(0.76, rng)]
        },
        coral_fan: {
          mat: matCoralSoft, maxInstances: 980, cullDist: 540,
          geos: [buildSeaFan(0.88, rng), buildSeaFan(0.02, rng), buildSeaFan(0.74, rng)]
        },
        coral_soft: {
          mat: matCoralSoft, maxInstances: 980, cullDist: 500,
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
          mat: matCoralSoft, maxInstances: 900, cullDist: 440,
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
        },
        kelp_giant: {
          mat: matPlant, maxInstances: 1100, cullDist: 640,
          geos: [buildGiantKelp(0.0, rng), buildGiantKelp(0.03, rng)]
        },
        urchin_purple: {
          mat: matRigid, maxInstances: 800, cullDist: 300,
          geos: [buildPurpleUrchin()]
        },
        starfish_ochre: {
          mat: matRigid, maxInstances: 520, cullDist: 300,
          geos: [buildStarfish(5, 0.07, false), buildStarfish(5, 0.82, false)]
        },
        anemone_giant_green: {
          mat: matCoralSoft, maxInstances: 620, cullDist: 380,
          geos: [buildAnemone(0.38, 0.28, rng), buildAnemone(0.44, 0.34, rng)]
        },
        vent_chimney: {
          mat: matChimney, maxInstances: 320, cullDist: 620,
          geos: [buildVentChimney(rng), buildVentChimney(rng)]
        },
        riftia_worms: {
          mat: matSoft, maxInstances: 960, cullDist: 420,
          geos: [buildRiftiaWorms(rng), buildRiftiaWorms(rng)]
        },
        vent_mussels: {
          mat: matRigid, maxInstances: 880, cullDist: 360,
          geos: [buildVentMussels(rng)]
        },
        ice_floe: {
          mat: matIce, maxInstances: 520, cullDist: 920,
          geos: [buildIceFloe(rng), buildIceFloe(rng), buildIceFloe(rng)]
        },
        iceberg: {
          mat: matIce, maxInstances: 160, cullDist: 1080,
          geos: [buildIceberg(rng), buildIceberg(rng)]
        },
        brinicle: {
          mat: matIce, maxInstances: 220, cullDist: 440,
          geos: [buildBrinicle(rng), buildBrinicle(rng)]
        },
        kelp_arctic: {
          mat: matPlant, maxInstances: 1400, cullDist: 460,
          geos: [buildArcticKelp(rng), buildArcticKelp(rng)]
        },
        coral_arctic_soft: {
          mat: matCoralSoft, maxInstances: 900, cullDist: 360,
          geos: [buildArcticSoftCoral(rng), buildArcticSoftCoral(rng)]
        },
        anemone_arctic: {
          mat: matCoralSoft, maxInstances: 620, cullDist: 360,
          geos: [buildAnemone(0.02, 0.96, rng), buildAnemone(0.06, 0.92, rng)]
        },
        sargassum: {
          mat: matPlant, maxInstances: 1500, cullDist: 520,
          geos: [buildSargassum(rng), buildSargassum(rng)]
        },
        wreck_anchor: {
          mat: matRigid, maxInstances: 160, cullDist: 540,
          geos: [buildWreckAnchor(rng), buildWreckAnchor(rng)]
        },
        coral_whip: {
          mat: matCoralSoft, maxInstances: 900, cullDist: 460,
          geos: [buildWhipCoral(0.07, rng), buildWhipCoral(0.13, rng)]
        },
        seafan_gold: {
          mat: matCoralSoft, maxInstances: 700, cullDist: 520,
          geos: [buildGoldSeaFan(rng), buildGoldSeaFan(rng)]
        },
        osedax_plume: {
          mat: matSoft, maxInstances: 960, cullDist: 420,
          geos: [buildOsedaxPlume(rng), buildOsedaxPlume(rng)]
        },
        hadal_sponge: {
          mat: matSoft, maxInstances: 780, cullDist: 440,
          geos: [buildHadalSponge(rng), buildHadalSponge(rng)]
        },
        serpentinite_vent: {
          mat: matChimney, maxInstances: 320, cullDist: 620,
          geos: [buildSerpentiniteVent(rng), buildSerpentiniteVent(rng)]
        },
        methane_hydrate: {
          mat: matHydrate, maxInstances: 520, cullDist: 500,
          geos: [buildMethaneHydrate(rng), buildMethaneHydrate(rng)]
        },
        cold_tubeworm: {
          mat: matSoft, maxInstances: 960, cullDist: 440,
          geos: [buildColdTubeworm(rng), buildColdTubeworm(rng)]
        },
        halite_spire: {
          mat: matIce, maxInstances: 540, cullDist: 560,
          geos: [buildHaliteSpire(rng), buildHaliteSpire(rng)]
        },
        stalactite: {
          mat: matRigid, maxInstances: 1100, cullDist: 460,
          geos: [buildStalactite(rng), buildStalactite(rng), buildStalactite(rng)]
        },
        stalagmite: {
          mat: matRigid, maxInstances: 1000, cullDist: 460,
          geos: [buildStalagmite(rng), buildStalagmite(rng), buildStalagmite(rng)]
        },
        cenote_vine: {
          mat: matSoft, maxInstances: 320, cullDist: 520,
          geos: [buildCenoteVine(rng), buildCenoteVine(rng)]
        },
        volcanic_fumarole: {
          mat: matChimney, maxInstances: 260, cullDist: 560,
          geos: [buildVolcanicFumarole(rng), buildVolcanicFumarole(rng)]
        },
        tubastraea_coral: {
          mat: matCoralRigid, maxInstances: 1000, cullDist: 440,
          geos: [buildTubastraeaCoral(rng), buildTubastraeaCoral(rng)]
        },
        galapagos_barnacle: {
          mat: matClam, maxInstances: 900, cullDist: 400,
          geos: [buildGalapagosBarnacle(rng), buildGalapagosBarnacle(rng)]
        },
        ulva_turf: {
          mat: matPlant, maxInstances: 1400, cullDist: 420,
          geos: [buildUlvaTurf(rng), buildUlvaTurf(rng)]
        }
      };

      return prototypes;
    },

    getPreviewGeo(key) {
      if (!previewCache) previewCache = this.create(true);
      const p = previewCache[key];
      if (!p || !p.geos || !p.geos.length) return null;
      p.geos[0].userData.sharedPreview = true;
      return {
        geo: p.geos[0],
        roughness: p.mat ? p.mat.roughness : 0.72,
        metalness: p.mat ? p.mat.metalness : 0.05,
        emissive: p.mat && p.mat.emissive ? p.mat.emissive.getHex() : 0x000000,
        emissiveIntensity: p.mat ? (p.mat.emissiveIntensity || 0) : 0
      };
    }
  };
})(window.OC);
