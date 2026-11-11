/* ================= ROV: 3D-МОДЕЛЬ АППАРАТА И РУКА ОТ ПЕРВОГО ЛИЦА ================= */
/* Корпус «Наутилус-IV» (поплавок, рама, винты, фары, манипулятор, лазер, капсула
   пробы) и рука от первого лица для режима захвата. Подвижные узлы возвращаются
   наружу объектом nodes — rov.js анимирует их каждый кадр. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

    function makePropeller(mat) {
    const parts = [];
    const hub = new T.CylinderGeometry(0.055, 0.055, 0.14, 10);
    OC.geoPrep(hub);
    OC.xform(hub, { r: [Math.PI / 2, 0, 0] });
    OC.paint(hub, 0xd8a846);
    parts.push(hub);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const blade = new T.BoxGeometry(0.04, 0.19, 0.02);
      OC.geoPrep(blade);
      OC.xform(blade, { r: [0.38, 0, a], p: [Math.sin(a) * 0.10, Math.cos(a) * 0.10, 0] });
      OC.paint(blade, 0xf2c864);
      parts.push(blade);
    }
    const g = OC.mergeGeometries(parts);
    return new T.Mesh(g, mat);
  }

  function buildRovModel() {
    const nodes = {};
    let ledMat, strobeMat, propL, propR, propV, armShoulder, armUpper, armForearm, armWrist;
    let clawL, clawR, sampleOrb, laserBeam;
    const g = new T.Group();
    g.userData.rovKey = 'rov_nautilus';

    const bodyMat = OC.enhanceMaterial(new T.MeshStandardMaterial({
      vertexColors: true, roughness: 0.42, metalness: 0.24
    }), { causticStrength: 0.48 });
    const metalMat = OC.enhanceMaterial(new T.MeshStandardMaterial({
      vertexColors: true, roughness: 0.34, metalness: 0.68
    }), { causticStrength: 0.36 });

    // 1) Верхний поплавковый модуль (синтактическая жёлтая пена + оранжевая полоса безопасности)
    const hullParts = [];
    const mainFoam = new T.BoxGeometry(1.18, 0.48, 1.82);
    OC.geoPrep(mainFoam);
    OC.xform(mainFoam, { p: [0, 0.28, -0.05] });
    OC.paint(mainFoam, (x, y, z, c) => {
      if (y > 0.44 && Math.abs(x) < 0.38) c.setHex(0xe85828);
      else if (Math.abs(z - 0.1) < 0.16 && y > 0.2) c.setHex(0x1f2b36);
      else c.setHex(0xf4b926);
    });
    hullParts.push(mainFoam);

    const noseCap = new T.CylinderGeometry(0.42, 0.56, 0.34, 14);
    OC.geoPrep(noseCap);
    OC.xform(noseCap, { r: [Math.PI / 2, 0, 0], s: [1.05, 1.0, 0.66], p: [0, 0.26, 0.94] });
    OC.paint(noseCap, (x, y, z, c) => c.setHex(y > 0.32 ? 0xe85828 : 0xf4b926));
    hullParts.push(noseCap);

    const tailCap = new T.BoxGeometry(0.92, 0.38, 0.32);
    OC.geoPrep(tailCap);
    OC.xform(tailCap, { p: [0, 0.26, -1.04] });
    OC.paint(tailCap, 0xd89e1c);
    hullParts.push(tailCap);

    // Боковые защитные бамперы
    for (let s = -1; s <= 1; s += 2) {
      const bumper = new T.CylinderGeometry(0.075, 0.075, 1.56, 8);
      OC.geoPrep(bumper);
      OC.xform(bumper, { r: [Math.PI / 2, 0, 0], p: [s * 0.62, 0.12, -0.02] });
      OC.paint(bumper, 0x222e3a);
      hullParts.push(bumper);
    }

    const hullMesh = new T.Mesh(OC.mergeGeometries(hullParts), bodyMat);
    g.add(hullMesh);

    // 2) Нижняя титановая рама, полозья, прочный корпус электроники и насадки винтов
    const frameParts = [];
    for (let s = -1; s <= 1; s += 2) {
      const skid = new T.CylinderGeometry(0.048, 0.048, 1.98, 8);
      OC.geoPrep(skid);
      OC.xform(skid, { r: [Math.PI / 2, 0, 0], p: [s * 0.52, -0.44, 0.02] });
      OC.paint(skid, 0x354554);
      frameParts.push(skid);

      for (const zp of [-0.58, 0.52]) {
        const strut = new T.CylinderGeometry(0.036, 0.036, 0.54, 7);
        OC.geoPrep(strut);
        OC.xform(strut, { r: [0, 0, s * -0.18], p: [s * 0.48, -0.18, zp] });
        OC.paint(strut, 0x26323e);
        frameParts.push(strut);
      }

      // Насадка кормового движителя (Kort nozzle)
      const shroud = new T.TorusGeometry(0.24, 0.042, 8, 18);
      OC.geoPrep(shroud);
      OC.xform(shroud, { p: [s * 0.54, 0.02, -1.06] });
      OC.paint(shroud, 0x1b242d);
      frameParts.push(shroud);

      const pylon = new T.BoxGeometry(0.18, 0.07, 0.12);
      OC.geoPrep(pylon);
      OC.xform(pylon, { p: [s * 0.42, 0.06, -1.02] });
      OC.paint(pylon, 0x2c3a47);
      frameParts.push(pylon);
    }

    // Поперечины полозьев
    for (const zp of [-0.62, 0.0, 0.58]) {
      const bar = new T.CylinderGeometry(0.032, 0.032, 1.04, 7);
      OC.geoPrep(bar);
      OC.xform(bar, { r: [0, 0, Math.PI / 2], p: [0, -0.42, zp] });
      OC.paint(bar, 0x2b3844);
      frameParts.push(bar);
    }

    // Прочный титановый цилиндр электроники и вертикальный движитель
    const pressureTube = new T.CylinderGeometry(0.21, 0.21, 1.25, 14);
    OC.geoPrep(pressureTube);
    OC.xform(pressureTube, { r: [Math.PI / 2, 0, 0], p: [0, -0.11, -0.08] });
    OC.paint(pressureTube, 0x45586b);
    frameParts.push(pressureTube);

    const vertShroud = new T.TorusGeometry(0.21, 0.038, 8, 16);
    OC.geoPrep(vertShroud);
    OC.xform(vertShroud, { r: [Math.PI / 2, 0, 0], p: [0, 0.54, -0.18] });
    OC.paint(vertShroud, 0x1f2b36);
    frameParts.push(vertShroud);

    // Мачта проблескового маячка и сонара
    const mast = new T.CylinderGeometry(0.025, 0.035, 0.34, 8);
    OC.geoPrep(mast);
    OC.xform(mast, { p: [0.28, 0.66, -0.62] });
    OC.paint(mast, 0x354554);
    frameParts.push(mast);

    // Отражатели передних фар
    for (let s = -1; s <= 1; s += 2) {
      const lampBody = new T.CylinderGeometry(0.085, 0.075, 0.16, 10);
      OC.geoPrep(lampBody);
      OC.xform(lampBody, { r: [Math.PI / 2, 0, 0], p: [s * 0.48, 0.22, 0.96] });
      OC.paint(lampBody, 0x1d2630);
      frameParts.push(lampBody);
    }

    const frameMesh = new T.Mesh(OC.mergeGeometries(frameParts), metalMat);
    g.add(frameMesh);

    // 3) Акриловый иллюминатор с внутренней 4K-камерой
    const domeGeo = new T.SphereGeometry(0.32, 16, 12);
    const domeMat = new T.MeshStandardMaterial({
      color: 0x8be9ff, roughness: 0.08, metalness: 0.18,
      transparent: true, opacity: 0.38
    });
    const dome = new T.Mesh(domeGeo, domeMat);
    dome.position.set(0, -0.02, 0.72);
    dome.scale.set(1.05, 0.92, 1.05);
    g.add(dome);

    const camEyeMat = new T.MeshStandardMaterial({
      color: 0x111a22, emissive: 0x34d8ff, emissiveIntensity: 0.9, roughness: 0.25
    });
    const camEye = new T.Mesh(new T.CylinderGeometry(0.11, 0.13, 0.22, 12), camEyeMat);
    camEye.rotation.x = Math.PI / 2;
    camEye.position.set(0, -0.02, 0.68);
    g.add(camEye);

    // 4) Светодиодные фары и строб-маяк
    ledMat = new T.MeshStandardMaterial({
      color: 0xe6fbff, emissive: 0x9ef4ff, emissiveIntensity: 0.55, roughness: 0.2
    });
    for (let s = -1; s <= 1; s += 2) {
      const lens = new T.Mesh(new T.CircleGeometry(0.068, 12), ledMat);
      lens.position.set(s * 0.48, 0.22, 1.045);
      g.add(lens);
    }

    strobeMat = new T.MeshStandardMaterial({
      color: 0xffb347, emissive: 0xff8c1a, emissiveIntensity: 0.35, roughness: 0.2
    });
    const strobe = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), strobeMat);
    strobe.position.set(0.28, 0.85, -0.62);
    g.add(strobe);

    // 5) Вращающиеся гребные винты
    propL = makePropeller(metalMat);
    propL.position.set(0.54, 0.02, -1.06);
    g.add(propL);

    propR = makePropeller(metalMat);
    propR.position.set(-0.54, 0.02, -1.06);
    g.add(propR);

    propV = makePropeller(metalMat);
    propV.rotation.x = Math.PI / 2;
    propV.position.set(0, 0.54, -0.18);
    g.add(propV);

    // 6) Шарнирный 3-звенный роботизированный манипулятор (правый борт, -X)
    armShoulder = new T.Group();
    armShoulder.position.set(-0.34, -0.30, 0.52);
    g.add(armShoulder);

    armUpper = new T.Group();
    armShoulder.add(armUpper);
    const uGeo = new T.CylinderGeometry(0.042, 0.048, 0.48, 8);
    OC.geoPrep(uGeo);
    OC.xform(uGeo, { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.24] });
    OC.paint(uGeo, 0xf0b528);
    armUpper.add(new T.Mesh(uGeo, bodyMat));

    armForearm = new T.Group();
    armForearm.position.set(0, 0, 0.48);
    armUpper.add(armForearm);
    const fGeo = new T.CylinderGeometry(0.036, 0.040, 0.46, 8);
    OC.geoPrep(fGeo);
    OC.xform(fGeo, { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.23] });
    OC.paint(fGeo, 0x3b4d5e);
    armForearm.add(new T.Mesh(fGeo, metalMat));

    armWrist = new T.Group();
    armWrist.position.set(0, 0, 0.46);
    armForearm.add(armWrist);

    const jGeoL = new T.BoxGeometry(0.026, 0.042, 0.17);
    OC.geoPrep(jGeoL);
    OC.xform(jGeoL, { p: [0, 0, 0.08] });
    OC.paint(jGeoL, 0xcfdde8);
    clawL = new T.Mesh(jGeoL, metalMat);
    clawL.position.set(0.045, 0, 0);
    armWrist.add(clawL);

    clawR = new T.Mesh(jGeoL.clone(), metalMat);
    clawR.position.set(-0.045, 0, 0);
    armWrist.add(clawR);

    sampleOrb = new T.Mesh(
      new T.SphereGeometry(0.075, 10, 8),
      new T.MeshStandardMaterial({ color: 0xff8a7a, emissive: 0x331810, emissiveIntensity: 0.4, roughness: 0.4 })
    );
    sampleOrb.position.set(0, 0, 0.12);
    sampleOrb.visible = false;
    sampleOrb.raycast = () => {};
    armWrist.add(sampleOrb);

    const laserGeo = new T.CylinderGeometry(0.008, 0.008, 1.35, 6);
    OC.geoPrep(laserGeo);
    OC.xform(laserGeo, { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.68] });
    laserBeam = new T.Mesh(
      laserGeo,
      new T.MeshBasicMaterial({ color: 0x58f7ff, transparent: true, opacity: 0.65, blending: T.AdditiveBlending, depthWrite: false })
    );
    laserBeam.visible = false;
    laserBeam.raycast = () => {};
    armWrist.add(laserBeam);

    Object.assign(nodes, {
      propL, propR, propV, strobeMat, ledMat, armShoulder, armUpper, armForearm,
      armWrist, clawL, clawR, sampleOrb, laserBeam
    });
    return { group: g, nodes };
  }

  function buildFirstPersonArm() {
    const nodes = {};
    let fpUpper, fpForearm, fpClawL, fpClawR, fpOrb;
    const g = new T.Group();
    g.userData.rovKey = 'rov_fx';
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.55 });

    fpUpper = new T.Group();
    fpUpper.position.set(0.46, -0.44, -0.35);
    g.add(fpUpper);

    const seg1 = new T.CylinderGeometry(0.038, 0.045, 0.55, 8);
    OC.geoPrep(seg1);
    OC.xform(seg1, { r: [Math.PI / 2, 0, 0], p: [0, 0, -0.275] });
    OC.paint(seg1, 0xf2b724);
    fpUpper.add(new T.Mesh(seg1, mat));

    fpForearm = new T.Group();
    fpForearm.position.set(0, 0, -0.55);
    fpUpper.add(fpForearm);

    const seg2 = new T.CylinderGeometry(0.030, 0.036, 0.45, 8);
    OC.geoPrep(seg2);
    OC.xform(seg2, { r: [Math.PI / 2, 0, 0], p: [0, 0, -0.225] });
    OC.paint(seg2, 0x3b4d5e);
    fpForearm.add(new T.Mesh(seg2, mat));

    const jawGeo = new T.BoxGeometry(0.022, 0.038, 0.16);
    OC.geoPrep(jawGeo);
    OC.xform(jawGeo, { p: [0, 0, -0.08] });
    OC.paint(jawGeo, 0xd4e2ee);

    fpClawL = new T.Mesh(jawGeo, mat);
    fpClawL.position.set(-0.042, 0, -0.45);
    fpForearm.add(fpClawL);

    fpClawR = new T.Mesh(jawGeo.clone(), mat);
    fpClawR.position.set(0.042, 0, -0.45);
    fpForearm.add(fpClawR);

    fpOrb = new T.Mesh(
      new T.SphereGeometry(0.068, 10, 8),
      new T.MeshStandardMaterial({ color: 0x5be8b0, emissive: 0x16382b, emissiveIntensity: 0.5, roughness: 0.38 })
    );
    fpOrb.position.set(0, 0, -0.54);
    fpOrb.visible = false;
    fpForearm.add(fpOrb);

    g.traverse((o) => { o.raycast = () => {}; });
    g.visible = false;
    Object.assign(nodes, { fpUpper, fpForearm, fpClawL, fpClawR, fpOrb });
    return { group: g, nodes };
  }


  OC._RovModel = { buildRovModel, buildFirstPersonArm, makePropeller };
})(window.OC);
