/* ================= ROV: АВТОНОМНЫЕ ДОННЫЕ БУИ-СТАНЦИИ ================= */
/* Модель буя (поплавок, трипод, балласт, мачта), проблесковый маяк и гидрофонный
   стакан. Ведёт пул мешей и анимацию мигания; сами данные буёв — в rov.js. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

    function buildBuoyMesh() {
    const g = new T.Group();
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.28 });

    const parts = [];
    // Жёлтый синтактический поплавок буя-станции
    const collar = new T.CylinderGeometry(0.46, 0.38, 0.42, 14);
    OC.geoPrep(collar);
    OC.xform(collar, { p: [0, 0.35, 0] });
    OC.paint(collar, 0xf6c945);
    parts.push(collar);

    // Титановая рама-трипод и донный балласт
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new T.CylinderGeometry(0.036, 0.042, 1.35, 6);
      OC.geoPrep(leg);
      OC.xform(leg, { r: [0.22, 0, 0], p: [0, -0.35, 0.36] });
      OC.xform(leg, { r: [0, a, 0] });
      OC.paint(leg, 0x384b5c);
      parts.push(leg);
    }
    const ballast = new T.CylinderGeometry(0.55, 0.62, 0.14, 14);
    OC.geoPrep(ballast);
    OC.xform(ballast, { p: [0, -0.98, 0] });
    OC.paint(ballast, 0x26323d);
    parts.push(ballast);

    // Мачта проблескового маяка и гидрофонный стакан
    const mast = new T.CylinderGeometry(0.03, 0.035, 0.72, 8);
    OC.geoPrep(mast);
    OC.xform(mast, { p: [0, 0.90, 0] });
    OC.paint(mast, 0xc7d6e4);
    parts.push(mast);

    g.add(new T.Mesh(OC.mergeGeometries(parts), mat));

    // Проблесковый маяк и оптика гидрофона/камеры
    const strobeM = new T.MeshStandardMaterial({
      color: 0xff9f43,
      emissive: new T.Color(0xff7722),
      emissiveIntensity: 1.8,
      roughness: 0.2
    });
    const strobe = new T.Mesh(new T.SphereGeometry(0.11, 10, 8), strobeM);
    strobe.position.set(0, 1.28, 0);
    g.add(strobe);

    const hydroM = new T.MeshStandardMaterial({
      color: 0x58e0ff,
      emissive: new T.Color(0x2ce8ff),
      emissiveIntensity: 1.1,
      roughness: 0.18
    });
    const hydroDome = new T.Mesh(new T.SphereGeometry(0.14, 12, 10), hydroM);
    hydroDome.position.set(0, -0.05, 0);
    g.add(hydroDome);

    g.userData.strobeMat = strobeM;
    g.userData.hydroMat = hydroM;
    g.visible = false;
    return g;
  }


  /* Анимация пула: позиция по данным буёв + проблеск маяка */
  function updateBuoys(buoyMeshes, buoys, time) {
    for (let i = 0; i < buoyMeshes.length; i++) {
      const bm = buoyMeshes[i];
      const b = buoys[i];
      if (!b) {
        bm.visible = false;
        continue;
      }
      bm.visible = true;
      bm.position.set(b.x, b.y + Math.sin(time * 1.4 + i * 1.7) * 0.04, b.z);
      if (bm.userData.strobeMat) {
        const p = Math.pow(Math.max(0, Math.sin(time * 3.1 + i * 2.0)), 14);
        bm.userData.strobeMat.emissiveIntensity = 0.25 + p * 3.4;
      }
    }
  }

  OC._RovBuoys = { buildBuoyMesh, updateBuoys };
})(window.OC);
