/* ================= ГЕОМЕТРИИ: МЯГКИЕ КОРАЛЛЫ И ГОРГОНАРИИ ================= */
/* Веера, мягкие и чёрные кораллы, хлыстовики, золотые веера и тубастреи — фильтраторы
   поперёк течения. Часть OC.FloraLibrary. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});
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
})(window.OC);
