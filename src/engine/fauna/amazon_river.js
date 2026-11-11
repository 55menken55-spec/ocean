/* ================= ФАУНА: АМАЗОНИЯ (РИО-НЕГРУ) ================= */
/* Арапаима, электрический угорь и речной хвостокол. */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;

  function makeArapaima(scene, biome, opts, emitSplash) {
    opts = opts || {};
    const len = opts.len || 2.85;
    const preview = !!opts.preview;
    const group = new T.Group();

    const bodyG = new T.CylinderGeometry(len * 0.088, len * 0.064, len * 0.78, 12, 1);
    bodyG.rotateX(Math.PI / 2);
    bodyG.scale(0.86, 1.15, 1.0);
    OC.geoPrep(bodyG);
    OC.paint(bodyG, (x, y, z, c) => {
      const u = OC.clamp((z + len * 0.39) / (len * 0.78), 0, 1);
      if (u < 0.38 && y < 0.06) c.setHex(0xd93829);
      else c.setHex(y > 0.04 ? 0x2f4d36 : 0x728a58);
    });
    group.add(new T.Mesh(bodyG, OC._FaunaCtx.creatureMat));

    const headG = new T.SphereGeometry(len * 0.095, 10, 8);
    headG.scale(0.95, 0.78, 1.45);
    OC.geoPrep(headG);
    OC.paint(headG, 0x3a543c);
    const head = new T.Mesh(headG, OC._FaunaCtx.creatureMat);
    head.position.set(0, 0, len * 0.42);
    group.add(head);

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.39);
    const tailG = new T.BoxGeometry(len * 0.028, len * 0.22, len * 0.19);
    OC.geoPrep(tailG);
    OC.paint(tailG, 0xc92c24);
    const tm = new T.Mesh(tailG, OC._FaunaCtx.creatureMat);
    tm.position.set(0, 0, -len * 0.1);
    tailPivot.add(tm);
    group.add(tailPivot);

    group.userData.key = 'arapaima';
    scene.add(group);
    if (preview) return { key: 'arapaima', getPosition: () => group.position, update() {} };

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 32, spd = opts.speed || 2.6;
    const _a = new T.Vector3(), _b = new T.Vector3();
    let ang = opts.phase || 0, prevY = -5;

    return {
      key: 'arapaima',
      getPosition: () => group.position,
      update(dt, time) {
        ang += (spd / Math.max(16, r)) * dt;
        const gulp = Math.sin(time * 0.32 + (opts.phase || 0)) > 0.82 ? OC.smoothstep(0.82, 1.0, Math.sin(time * 0.32 + (opts.phase || 0))) : 0;
        const x = cx + Math.cos(ang) * r;
        const z = cz + Math.sin(ang) * r * 0.85;
        const fl = biome.getHeight(x, z);
        const y = Math.max(fl + 1.2, (opts.y || -4.2) + gulp * 4.1);
        const nx = cx + Math.cos(ang + 0.06) * r;
        const nz = cz + Math.sin(ang + 0.06) * r * 0.85;
        _a.set(x, y, z); _b.set(nx, y, nz);
        group.position.copy(_a);
        group.lookAt(_b);
        tailPivot.rotation.y = Math.sin(time * 3.8 + (opts.phase || 0)) * 0.26;
        if (((prevY < -0.15 && y >= -0.15) || (prevY >= -0.15 && y < -0.15)) && emitSplash) emitSplash(_a, 0.32);
        prevY = y;
      }
    };
  }

  /* ---------- Электрический угорь (Electrophorus voltai) ---------- */

  function makeElectricEel(scene, biome, opts) {
    opts = opts || {};
    const len = opts.len || 2.05;
    const preview = !!opts.preview;
    const group = new T.Group();
    const segs = [];
    const nSeg = 11;

    for (let i = 0; i < nSeg; i++) {
      const u = i / (nSeg - 1);
      const rad = len * 0.044 * (1 - 0.65 * Math.pow(u, 1.4));
      const sg = new T.SphereGeometry(rad, 8, 6);
      sg.scale(0.85, 1.05, 1.65);
      OC.geoPrep(sg);
      OC.paint(sg, (x, y, z, c) => c.setHex(y < 0 && u < 0.32 ? 0xff7a2e : 0x2e2a24));
      const m = new T.Mesh(sg, OC._FaunaCtx.creatureMat);
      m.position.set(0, 0, (0.45 - u) * len * 0.88);
      group.add(m);
      segs.push(m);
    }

    // Биоэлектрический импульсный ореол при разряде
    const sparkMat = new T.MeshBasicMaterial({ color: 0x62f2ff, transparent: true, opacity: 0.0, depthWrite: false, blending: T.AdditiveBlending });
    const spark = new T.Mesh(new T.SphereGeometry(len * 0.34, 12, 8), sparkMat);
    spark.scale.set(0.65, 0.55, 1.7);
    group.add(spark);

    group.userData.key = 'electric_eel';
    scene.add(group);
    if (preview) {
      sparkMat.opacity = 0.25;
      return { key: 'electric_eel', getPosition: () => group.position, update() {} };
    }

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 16, spd = opts.speed || 1.9;
    const _a = new T.Vector3(), _b = new T.Vector3();
    let ang = opts.phase || 0;

    return {
      key: 'electric_eel',
      getPosition: () => group.position,
      update(dt, time) {
        ang += (spd / Math.max(10, r)) * dt;
        const x = cx + Math.cos(ang) * r;
        const z = cz + Math.sin(ang) * r * 0.82;
        const y = biome.getHeight(x, z) + 0.85 + Math.sin(time * 0.9 + (opts.phase || 0)) * 0.35;
        const nx = cx + Math.cos(ang + 0.08) * r;
        const nz = cz + Math.sin(ang + 0.08) * r * 0.82;
        _a.set(x, y, z); _b.set(nx, y, nz);
        group.position.copy(_a);
        group.lookAt(_b);
        for (let i = 1; i < segs.length; i++) {
          segs[i].position.x = Math.sin(time * 6.5 - i * 0.65 + (opts.phase || 0)) * 0.06 * i;
        }
        const burst = Math.max(0, Math.sin(time * 1.1 + (opts.phase || 0)));
        sparkMat.opacity = burst > 0.92 ? (burst - 0.92) * 5.2 : 0.0;
      }
    };
  }

  /* ---------- Речной глазчатый скат моторо (Potamotrygon motoro) ---------- */

  function makeRiverStingray(scene, biome, opts) {
    opts = opts || {};
    const sz = opts.scale || 1.0;
    const preview = !!opts.preview;
    const group = new T.Group();

    const discG = new T.CylinderGeometry(0.68 * sz, 0.72 * sz, 0.08 * sz, 18);
    discG.scale(1.0, 1.0, 1.08);
    OC.geoPrep(discG);
    OC.paint(discG, (x, y, z, c) => {
      const spot = Math.sin(x * 13.0 + z * 9.0) * Math.cos(z * 12.0 - x * 7.0);
      if (y > 0.01 && spot > 0.62) c.setHex(0xff8c28);
      else if (y > 0.01 && spot > 0.42) c.setHex(0x1a1410);
      else c.setHex(y > 0 ? 0x4f3e2e : 0xe3d2bc);
    });
    group.add(new T.Mesh(discG, OC._FaunaCtx.creatureMat));

    const tailG = new T.ConeGeometry(0.055 * sz, 0.95 * sz, 6);
    tailG.rotateX(-Math.PI / 2);
    OC.geoPrep(tailG);
    OC.paint(tailG, 0x3b2e22);
    const tail = new T.Mesh(tailG, OC._FaunaCtx.creatureMat);
    tail.position.set(0, 0, -0.95 * sz);
    group.add(tail);

    group.userData.key = 'river_stingray';
    scene.add(group);
    if (preview) return { key: 'river_stingray', getPosition: () => group.position, update() {} };

    const cx = opts.cx || 0, cz = opts.cz || 0, r = opts.r || 18, spd = opts.speed || 1.8;
    const _a = new T.Vector3(), _b = new T.Vector3();
    let ang = opts.phase || 0;

    return {
      key: 'river_stingray',
      getPosition: () => group.position,
      update(dt, time) {
        ang += (spd / Math.max(10, r)) * dt;
        const x = cx + Math.cos(ang) * r;
        const z = cz + Math.sin(ang) * r * 0.75;
        const y = biome.getHeight(x, z) + 0.45 + Math.sin(time * 2.1 + (opts.phase || 0)) * 0.14;
        const nx = cx + Math.cos(ang + 0.08) * r;
        const nz = cz + Math.sin(ang + 0.08) * r * 0.75;
        _a.set(x, y, z); _b.set(nx, y, nz);
        group.position.copy(_a);
        group.lookAt(_b);
      }
    };
  }

  OC._FaunaBuilders.makeArapaima = makeArapaima;
  OC._FaunaBuilders.makeElectricEel = makeElectricEel;
  OC._FaunaBuilders.makeRiverStingray = makeRiverStingray;
})(window.OC);
