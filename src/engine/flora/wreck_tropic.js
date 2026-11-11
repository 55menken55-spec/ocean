/* ================= ПРОЦЕДУРНЫЕ ГЕОМЕТРИИ: затонувший корабль и саргассовые заросли атолла ================= */
/* Часть библиотеки OC.FloraLibrary. Каждый builder чистый: (параметры, rng) -> BufferGeometry.
   Материалы и реестр прототипов живут в engine/flora_library.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const COL = (c) => new T.Color(c);
  const BUILDERS = (OC._FloraBuilders = OC._FloraBuilders || {});

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
  BUILDERS.buildSargassum = buildSargassum;

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
  BUILDERS.buildWreckAnchor = buildWreckAnchor;
})(window.OC);
