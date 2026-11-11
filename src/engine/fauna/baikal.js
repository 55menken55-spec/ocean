/* ================= ФАУНА БАЙКАЛА: НЕРПА И ГЛУБОКОВОДНЫЕ СООБЩЕСТВА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const B = (OC._FaunaBuilders = OC._FaunaBuilders || {});

  function makeBaikalSeal(scene, biome, opts) {
    const o = Object.assign({ cx: 0, cz: 0, r: 48, y: -12, scale: 1 }, opts || {});
    const pieces = [];
    const addEllipsoid = (radius, scale, position, color) => {
      const g = new T.SphereGeometry(radius, 10, 7);
      g.scale(scale[0], scale[1], scale[2]);
      OC.geoPrep(g);
      OC.paint(g, (x, y, z, c) => {
        const shade = OC.clamp(0.82 + y * 0.18 + Math.sin(x * 5 + z * 4) * 0.07, 0.58, 1.0);
        c.setHex(color).multiplyScalar(shade);
      });
      OC.xform(g, { p: position });
      pieces.push(g);
    };
    // Компактный тюлений силуэт: обтекаемое тело, короткая морда, ласты и пятнистая спина.
    addEllipsoid(1, [2.0, 0.68, 0.72], [0, 0, 0], 0x829296);
    addEllipsoid(0.58, [1.0, 0.78, 0.86], [1.48, 0.12, 0], 0x9ca9a4);
    addEllipsoid(0.34, [1.12, 0.42, 0.48], [1.92, -0.02, 0], 0xb5bdb2);
    addEllipsoid(0.34, [1.6, 0.2, 0.48], [-1.55, 0.02, 0], 0x667b82);
    addEllipsoid(0.42, [0.32, 0.15, 1.0], [-0.12, -0.52, 0.72], 0x617980);
    addEllipsoid(0.42, [0.32, 0.15, 1.0], [-0.12, -0.52, -0.72], 0x617980);
    const body = OC.mergeGeometries(pieces);
    const mesh = new T.Mesh(body, OC._FaunaCtx.creatureMat);
    mesh.scale.setScalar(o.scale);
    mesh.userData.key = 'seal_baikal';
    scene.add(mesh);

    let phase = (o.cx * 0.01 + o.cz * 0.02) % (Math.PI * 2);
    return {
      key: 'seal_baikal',
      getPosition: () => mesh.position,
      update(dt, time, camPos) {
        if (Math.hypot(o.cx - camPos.x, o.cz - camPos.z) > 520) { mesh.visible = false; return; }
        mesh.visible = true;
        phase += dt * 0.16;
        const a = phase + time * 0.045;
        const x = o.cx + Math.cos(a) * o.r;
        const z = o.cz + Math.sin(a) * o.r * 0.62;
        const floor = biome.getHeight(x, z);
        const y = Math.max(floor + 5, o.y + Math.sin(time * 0.42 + phase) * 2.6);
        mesh.position.set(x, y, z);
        mesh.rotation.y = Math.atan2(Math.cos(a) * 0.62, -Math.sin(a));
        mesh.rotation.z = Math.sin(time * 0.6 + phase) * 0.035;
      }
    };
  }
  B.makeBaikalSeal = makeBaikalSeal;
})(window.OC);
