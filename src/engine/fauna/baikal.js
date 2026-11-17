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
    let huntTimer = 0;
    let huntCooldown = 10 + Math.abs(o.cx + o.cz) % 9;
    let huntTarget = null;
    let huntHit = false;
    return {
      key: 'seal_baikal',
      isHunting: () => huntTimer > 0,
      getPosition: () => mesh.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(o.cx - camPos.x, o.cz - camPos.z) > 520) { mesh.visible = false; return; }
        mesh.visible = true;
        phase += dt * 0.16;
        const a = phase + time * 0.045;

        if (huntTimer > 0) {
          huntTimer = Math.max(0, huntTimer - dt);
          if (huntTarget && !huntHit && mesh.position.distanceTo(huntTarget) < 23) {
            if (huntTarget.applyPredation) huntTarget.applyPredation();
            huntHit = true;
          }
          if (huntTimer <= 0) {
            huntTarget = null;
            huntCooldown = 18 + Math.abs(o.cx - o.cz) % 9;
          }
        } else {
          huntCooldown -= dt;
          if (huntCooldown <= 0 && ctx && ctx.preyCenters) {
            let bestD = 190;
            for (let i = 0; i < ctx.preyCenters.length; i++) {
              const prey = ctx.preyCenters[i];
              if (prey.schoolKey !== 'fish_golomyanka') continue;
              const d = Math.hypot(prey.x - mesh.position.x, prey.z - mesh.position.z);
              if (d < bestD && Math.abs(prey.y - mesh.position.y) < 210) {
                bestD = d;
                huntTarget = prey;
              }
            }
            if (huntTarget) {
              huntTimer = 4.2;
              huntHit = false;
            } else {
              huntCooldown = 6;
            }
          }
        }

        const patrolX = o.cx + Math.cos(a) * o.r;
        const patrolZ = o.cz + Math.sin(a) * o.r * 0.62;
        const floor = biome.getHeight(patrolX, patrolZ);
        const seasonState = OC.Seasons ? OC.Seasons.getState(biome) : null;
        const winterSurfaceY = seasonState && o.y > -50 ? OC.lerp(o.y, -3.5, seasonState.iceFactor * 0.72) : o.y;
        const patrolY = Math.max(floor + 5, winterSurfaceY + Math.sin(time * 0.42 + phase) * 2.6);
        const lunge = huntTarget && huntTimer > 0 ? 1 - OC.clamp(huntTimer / 4.2, 0, 1) : 0;
        const x = huntTarget && huntTimer > 0 ? OC.lerp(patrolX, huntTarget.x, lunge) : patrolX;
        const z = huntTarget && huntTimer > 0 ? OC.lerp(patrolZ, huntTarget.z, lunge) : patrolZ;
        const y = Math.max(biome.getHeight(x, z) + 5, huntTarget && huntTimer > 0 ? OC.lerp(patrolY, huntTarget.y, lunge) : patrolY);
        mesh.position.set(x, y, z);
        mesh.rotation.y = lunge > 0.22 && huntTarget
          ? Math.atan2(huntTarget.x - x, -(huntTarget.z - z))
          : Math.atan2(Math.cos(a) * 0.62, -Math.sin(a));
        mesh.rotation.z = Math.sin(time * 0.6 + phase) * 0.035;
      }
    };
  }
  B.makeBaikalSeal = makeBaikalSeal;

  /* ---------- Метановый сип Байкала ---------- */
  /* Запись Атласа baikal: пузырьковый выход газа из донных осадков вдоль
     активных разломов рифта. В мире сип виден как поток пузырей (engine/fauna/haze.js)
     и как цель гидрофона/сонара; здесь — объёмная модель для 3D-студии Атласа. */
  B.makeMethaneSeep = function makeMethaneSeep(scene, biome, opts) {
    const group = new T.Group();
    const rng = OC.mulberry32((opts && opts.seed) || 5150);
    const cMud = new T.Color(0x4a4335);
    const cSilt = new T.Color(0x6d6552);
    const cCrust = new T.Color(0xc9d6da); // газовая гидраты-корка
    const cBubble = new T.Color(0xdff6ff);

    // Плоский осадочный бугор с впадиной в центре
    const mound = new T.SphereGeometry(1, 22, 12);
    const mp = mound.attributes.position;
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i);
      const d = Math.hypot(x, z);
      const n = OC.fbm2 ? OC.fbm2(x * 2.2 + 3, z * 2.2, 3) : 0;
      // Воронка сипа: центр проседает, вокруг — невысокий вал
      const dip = 1 - 0.5 * Math.exp(-d * d * 6);
      const yv = y > 0 ? (0.22 + 0.1 * n) * dip : -0.06;
      mp.setXYZ(i, x * 1.55, yv, z * 1.55);
    }
    mound.computeVertexNormals();
    OC.geoPrep(mound);
    OC.paint(mound, (x, y, z, c) => {
      const d = Math.hypot(x, z) / 1.55;
      c.copy(cMud).lerp(cSilt, OC.smoothstep(0.25, 1.0, d)).lerp(cCrust, OC.smoothstep(0.0, 0.3, d) * 0.35);
    });
    group.add(new T.Mesh(mound, OC._FaunaCtx.creatureMat));

    // Гидратная корка вокруг жерла — неровные белёсые пластины
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rng() * 0.5;
      const d = OC.lerp(0.28, 0.46, rng());
      const plate = new T.SphereGeometry(1, 8, 6);
      plate.scale(OC.lerp(0.12, 0.2, rng()), 0.05, OC.lerp(0.1, 0.16, rng()));
      OC.geoPrep(plate);
      OC.paint(plate, (x, y, z, c) => c.copy(cCrust).lerp(cSilt, OC.clamp(-y * 3, 0, 0.5)));
      const pm = new T.Mesh(plate, OC._FaunaCtx.creatureMat);
      pm.position.set(Math.cos(a) * d, 0.1 + rng() * 0.04, Math.sin(a) * d);
      pm.rotation.y = a + rng();
      group.add(pm);
    }

    // Струя пузырей: снизу вверх с расширением факела
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const a = rng() * Math.PI * 2;
      const spread = 0.05 + t * 0.24;
      const r = OC.lerp(0.022, 0.05, rng()) * (0.7 + t * 0.7);
      const bub = new T.SphereGeometry(r, 7, 5);
      OC.geoPrep(bub);
      OC.paint(bub, (x, y, z, c) => c.copy(cBubble).lerp(new T.Color(0x9fd6e8), OC.clamp(-y * 6, 0, 0.6)));
      const bm = new T.Mesh(bub, OC._FaunaCtx.creatureMat);
      const rr = Math.sqrt(rng()) * spread;
      bm.position.set(Math.cos(a) * rr, 0.06 + t * 1.85, Math.sin(a) * rr);
      group.add(bm);
    }

    group.userData.key = 'methane_seep_baikal';
    scene.add(group);
    return { key: 'methane_seep_baikal', getPosition: () => group.position, update() {} };
  };
})(window.OC);
