/* ================= ПРОЦЕДУРНЫЕ ГЕОМЕТРИИ: ламинария, морская трава и умеренные мелководья ================= */
/* Часть библиотеки OC.FloraLibrary. Каждый builder чистый: (параметры, rng) -> BufferGeometry.
   Материалы и реестр прототипов живут в engine/flora_library.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});

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
  BUILDERS.buildSeagrass = buildSeagrass;

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
  BUILDERS.buildKelp = buildKelp;

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
  BUILDERS.buildIslandPalm = buildIslandPalm;

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
  BUILDERS.buildGiantKelp = buildGiantKelp;

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
  BUILDERS.buildPurpleUrchin = buildPurpleUrchin;

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
  BUILDERS.buildUlvaTurf = buildUlvaTurf;
})(window.OC);
