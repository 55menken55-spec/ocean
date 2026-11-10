/* ================= ФАУНА: СТАИ С GPU-АНИМАЦИЕЙ, ХИЩНИКИ, МЕГАФАУНА, ПЛАНКТОН ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  let fishMatInstanced = null;
  let creatureMat = null;

  /* ---------- Процедурная форма рыбы (нос +X, хвост -X) ---------- */
  function makeFishGeo(opts) {
    const o = Object.assign({
      len: 1.2, height: 0.45, width: 0.18,
      colA: 0xff8c42, colB: 0xffe0b2, finCol: 0xffb74d,
      tailH: 0.65, dorsal: true, streamer: false, stripes: 0, eyeScale: 1
    }, opts);

    const list = [];
    const body = new T.SphereGeometry(1, 12, 9);
    body.scale(o.len * 0.5, o.height * 0.5, o.width * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = x / (o.len * 0.5); // -1 хвост ... +1 нос
      const taper = 1 - 0.62 * Math.pow(OC.clamp(-t, 0, 1), 1.65);
      const fat = Math.pow(Math.abs(t), 3) * 0.28 + 1;
      bp.setXYZ(i, x, y * taper * fat, z * taper * fat);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => {
      const t = OC.clamp(x / (o.len * 0.5), -1, 1);
      c.set(o.colA).lerp(new T.Color(o.colB), OC.smoothstep(-0.25, 0.85, t) * 0.85);
      if (o.stripes > 0) {
        const s = Math.sin(t * 11 + Math.abs(y) * 2.5);
        if (s > 0.25) c.lerp(new T.Color(o.colB), 0.72 * OC.clamp(o.stripes, 0, 1));
      }
      c.offsetHSL(0, 0, -OC.clamp(Math.abs(y) / o.height - 0.15, 0, 0.35) * 0.22);
    });
    list.push(body);

    /* хвост */
    const tail = new T.ConeGeometry(o.height * o.tailH, o.len * 0.36, 4);
    OC.xform(tail, { r: [0, Math.PI / 4, Math.PI / 2], s: [0.22, 1, 1], p: [-o.len * 0.56, 0, 0] });
    OC.geoPrep(tail);
    OC.paint(tail, o.finCol);
    list.push(tail);

    /* грудные плавники */
    const fin = new T.ConeGeometry(o.height * 0.22, o.len * 0.28, 3);
    OC.xform(fin, { r: [Math.PI / 2, 0, 0.42], s: [0.2, 1, 1], p: [o.len * 0.22, -o.height * 0.08, o.width * 0.58] });
    OC.geoPrep(fin);
    OC.paint(fin, o.finCol);
    list.push(fin);

    const fin2 = fin.clone();
    OC.xform(fin2, { p: [0, 0, -o.width * 1.16] });
    list.push(fin2);

    if (o.dorsal) {
      const d = new T.ConeGeometry(o.height * 0.28, o.len * 0.35, 3);
      OC.xform(d, { r: [0, 0, Math.PI / 2 - 0.35], s: [0.14, 1, 1], p: [-o.len * 0.04, o.height * 0.58, 0] });
      OC.geoPrep(d);
      OC.paint(d, o.finCol);
      list.push(d);
    }

    if (o.streamer) {
      const st = new T.ConeGeometry(o.height * 0.14, o.len * 0.95, 3);
      OC.xform(st, { r: [0, 0, Math.PI / 2 + 0.55], s: [0.15, 1, 1], p: [-o.len * 0.22, o.height * 0.85, 0] });
      OC.geoPrep(st);
      OC.paint(st, 0xffffff);
      list.push(st);
    }

    /* глаза */
    const eyeG = new T.SphereGeometry(o.height * 0.085 * o.eyeScale, 6, 5);
    OC.geoPrep(eyeG);
    OC.paint(eyeG, 0x0a0a0a);
    const e1 = eyeG.clone(); OC.xform(e1, { p: [o.len * 0.33, o.height * 0.12, o.width * 0.40] });
    const e2 = eyeG.clone(); OC.xform(e2, { p: [o.len * 0.33, o.height * 0.12, -o.width * 0.40] });
    list.push(e1, e2);

    return OC.mergeGeometries(list);
  }

  /* ---------- Стая рыб (GPU-изгиб + обтекание дна и камеры) ---------- */
  function makeSchool(scene, biome, opts) {
    const baseN = opts.n || 32;
    const maxN = Math.max(8, Math.round(baseN * 1.35));
    let n = Math.max(6, Math.round(baseN * OC.Quality.get().fishScale));
    const spread = opts.spread || 10;
    const speed = opts.speed || 6;
    const scale = opts.scale || 1;
    const cx = opts.cx || 0;
    const cz = opts.cz || 0;
    const radius = opts.radius || 35;
    const yDepth = opts.yDepth || -8;
    const yAmp = opts.yAmp || 3.5;

    const geo = makeFishGeo(opts.geoOpts || {});
    const swimAttr = new Float32Array(maxN * 2);
    for (let i = 0; i < maxN; i++) {
      swimAttr[i * 2] = Math.random() * 6.28;
      swimAttr[i * 2 + 1] = (7.5 + Math.random() * 4.5) * (speed * 0.16);
    }
    geo.setAttribute('aSwim', new T.InstancedBufferAttribute(swimAttr, 2));

    const mesh = new T.InstancedMesh(geo, fishMatInstanced, maxN);
    mesh.count = n;
    mesh.frustumCulled = false;
    mesh.userData.key = opts.key || 'fish_blue';
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    scene.add(mesh);

    const offs = [];
    const phase = [];
    for (let i = 0; i < maxN; i++) {
      offs.push(OC.fibDir(i, maxN).multiplyScalar(spread * (0.45 + Math.random() * 0.55)));
      phase.push(Math.random() * 6.28);
    }

    const pos = new T.Vector3(cx + radius, yDepth, cz);
    const prev = pos.clone();
    const dummy = new T.Object3D();
    const wp = new T.Vector3();
    const look = new T.Vector3();
    const forward = new T.Vector3(1, 0, 0);
    const side = new T.Vector3();
    const up = new T.Vector3();
    const worldUp = new T.Vector3(0, 1, 0);

    let ang = Math.random() * 6.28;
    const angDir = Math.random() < 0.5 ? 1 : -1;
    let t = Math.random() * 100;

    return {
      mesh,
      baseN,
      setQualityScale(mult) {
        n = OC.clamp(Math.round(baseN * mult), 6, maxN);
        mesh.count = n;
      },
      getCount: () => n,
      center: new T.Vector3(cx, yDepth, cz),
      cullRadius: radius + spread + 380,
      update(dt, time, camPos) {
        // Дистанционное отключение CPU-пересчёта для очень далёких стай
        const distCam = Math.hypot(pos.x - camPos.x, pos.z - camPos.z);
        if (distCam > 540) {
          mesh.visible = false;
          return;
        }
        mesh.visible = true;

        t += dt;
        ang += (speed / Math.max(12, radius)) * angDir * dt;
        const r = radius + Math.sin(t * 0.16) * (radius * 0.18);
        const nx = cx + Math.cos(ang) * r;
        const nz = cz + Math.sin(ang) * r;
        const floorC = biome.getHeight(nx, nz);
        const ny = OC.clamp(yDepth + Math.sin(t * 0.25) * yAmp, floorC + 2.4, -1.5);

        pos.set(nx, ny, nz);
        forward.subVectors(pos, prev);
        if (forward.lengthSq() < 1e-6) forward.set(1, 0, 0);
        forward.normalize();
        prev.copy(pos);

        side.crossVectors(forward, worldUp);
        if (side.lengthSq() < 1e-5) side.set(0, 0, 1);
        side.normalize();
        up.crossVectors(side, forward).normalize();

        for (let i = 0; i < n; i++) {
          const o = offs[i];
          const ph = phase[i];
          wp.copy(pos)
            .addScaledVector(side, o.x * (1 + 0.16 * Math.sin(t * 0.8 + ph)))
            .addScaledVector(up, o.y * (1 + 0.14 * Math.cos(t * 0.7 + ph)))
            .addScaledVector(forward, o.z + Math.sin(t * 1.4 + ph) * 0.65);

          // Мягкое отступление стаи от дайвера при слишком близком подплытии
          const dxC = wp.x - camPos.x, dyC = wp.y - camPos.y, dzC = wp.z - camPos.z;
          const d2C = dxC * dxC + dyC * dyC + dzC * dzC;
          if (d2C < 121 && d2C > 0.01) {
            const dC = Math.sqrt(d2C);
            const push = (11 - dC) * 0.45;
            wp.x += (dxC / dC) * push;
            wp.y += (dyC / dC) * push * 0.5;
            wp.z += (dzC / dC) * push;
          }

          const fl = biome.getHeight(wp.x, wp.z);
          wp.y = OC.clamp(wp.y, fl + 1.2, -0.9);

          dummy.position.copy(wp);
          look.copy(wp).add(forward).addScaledVector(side, Math.sin(t * 1.8 + ph) * 0.07);
          dummy.lookAt(look);
          dummy.rotateY(-Math.PI / 2);
          dummy.scale.setScalar(scale);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    };
  }

  /* ---------- Одиночные крупные рыбы (императорский ангел, крылатка) ---------- */
  function makeSoloFish(scene, biome, opts) {
    const geo = makeFishGeo(opts.geoOpts);
    const mesh = new T.Mesh(geo, creatureMat);
    mesh.scale.setScalar(opts.scale || 1);
    mesh.userData.key = opts.key || 'angelfish';
    scene.add(mesh);

    const cx = opts.cx, cz = opts.cz, r = opts.r || 16, yBase = opts.y || -8, speed = opts.speed || 1.6;
    let ang = Math.random() * 6.28, t = Math.random() * 80;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 480) { mesh.visible = false; return; }
        mesh.visible = true;
        t += dt;
        ang += (speed / r) * dir * dt;
        const rr = r + Math.sin(t * 0.35) * 2.5;
        const ax = cx + Math.cos(ang) * rr, az = cz + Math.sin(ang) * rr;
        const ay = Math.max(yBase + Math.sin(t * 0.5) * 1.8, biome.getHeight(ax, az) + 1.8);
        const ah = ang + 0.14 * dir;
        const bx = cx + Math.cos(ah) * rr, bz = cz + Math.sin(ah) * rr;
        const by = Math.max(yBase + Math.sin(t * 0.5 + 0.35) * 1.8, biome.getHeight(bx, bz) + 1.8);
        a.set(ax, Math.min(-1.0, ay), az);
        b.set(bx, Math.min(-1.0, by), bz);
        mesh.position.copy(a);
        mesh.lookAt(b);
        mesh.rotateY(-Math.PI / 2);
        mesh.rotateZ(Math.sin(time * 5 + t) * 0.09);
      }
    };
  }

  /* ---------- Крылатка-зебра (Pterois volitans) ---------- */
  function makeLionfish(scene, biome, opts) {
    const group = new T.Group();
    const bodyG = makeFishGeo({ len: 1.6, height: 0.65, width: 0.35, colA: 0xb02820, colB: 0xfff0e0, finCol: 0xd94838, stripes: 1.4 });
    group.add(new T.Mesh(bodyG, creatureMat));

    // Веер длинных ядовитых лучей
    for (let i = 0; i < 12; i++) {
      const sp = new T.CylinderGeometry(0.015, 0.045, 1.35, 4);
      OC.geoPrep(sp);
      OC.paint(sp, i % 2 === 0 ? 0xffebe0 : 0x8f1d18);
      const m = new T.Mesh(sp, creatureMat);
      const a = (i / 11 - 0.5) * 1.4;
      m.position.set(0.05 - i * 0.04, 0.45, 0);
      m.rotation.z = -a * 0.65;
      m.rotation.x = (i % 2 === 0 ? 0.18 : -0.18);
      group.add(m);
    }
    group.scale.setScalar(opts.scale || 1.15);
    group.userData.key = 'lionfish';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 50;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += (0.8 / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r;
        const az = opts.cz + Math.sin(ang) * opts.r;
        const ay = Math.max(opts.y + Math.sin(t * 0.6) * 1.2, biome.getHeight(ax, az) + 1.4);
        const bx = opts.cx + Math.cos(ang + 0.15) * opts.r;
        const bz = opts.cz + Math.sin(ang + 0.15) * opts.r;
        a.set(ax, ay, az);
        b.set(bx, ay, bz);
        group.position.copy(a);
        group.lookAt(b);
        group.rotateY(-Math.PI / 2);
      }
    };
  }

  /* ---------- Медуза (обычная и биолюминесцентная) ---------- */
  function makeJelly(scene, opts) {
    const hue = opts.hue;
    const deep = !!opts.deep;
    const group = new T.Group();

    const bellGeo = new T.SphereGeometry(1, 18, 11, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const bp = bellGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const scallop = 1 + 0.06 * Math.sin(Math.atan2(z, x) * 8) * (1 - y);
      bp.setXYZ(i, x * scallop, y, z * scallop);
    }
    bellGeo.computeVertexNormals();
    bellGeo.deleteAttribute('uv');
    const bellMat = new T.MeshStandardMaterial({
      color: new T.Color().setHSL(hue, 0.78, 0.66),
      emissive: new T.Color().setHSL(hue, 0.9, deep ? 0.55 : 0.28),
      emissiveIntensity: deep ? 1.5 : 0.7,
      roughness: 0.22, transparent: true, opacity: 0.58,
      side: T.DoubleSide, depthWrite: false
    });
    const bell = new T.Mesh(bellGeo, bellMat);

    const innerMat = new T.MeshStandardMaterial({
      color: new T.Color().setHSL((hue + 0.05) % 1, 0.9, 0.72),
      emissive: new T.Color().setHSL((hue + 0.05) % 1, 1.0, 0.45),
      emissiveIntensity: deep ? 2.0 : 1.1,
      transparent: true, opacity: 0.85, roughness: 0.35
    });
    const inner = new T.Mesh(new T.SphereGeometry(0.52, 10, 8), innerMat);
    inner.position.y = 0.08;
    group.add(bell, inner);

    const tent = [];
    const nT = 8;
    for (let i = 0; i < nT; i++) {
      const a = (i / nT) * Math.PI * 2;
      const pts = [];
      for (let s = 0; s <= 4; s++) {
        const t = s / 4;
        pts.push(new T.Vector3(
          Math.cos(a) * 0.68 * (1 - t * 0.22),
          -t * (1.6 + (i % 3) * 0.55),
          Math.sin(a) * 0.68 * (1 - t * 0.22)
        ));
      }
      const tg = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 6, 0.032, 3, false);
      OC.geoPrep(tg);
      OC.paint(tg, new T.Color().setHSL(hue, 0.75, 0.62));
      tent.push(tg);
    }
    const tentMat = new T.MeshStandardMaterial({
      color: new T.Color().setHSL(hue, 0.82, 0.64),
      emissive: new T.Color().setHSL(hue, 0.92, deep ? 0.45 : 0.22),
      transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide
    });
    const tentMesh = new T.Mesh(OC.mergeGeometries(tent), tentMat);
    group.add(tentMesh);

    group.scale.setScalar(opts.size || 1.1);
    group.userData.key = deep ? 'jelly_deep' : 'jelly';
    scene.add(group);

    let pulse = Math.random() * 6.28, t = Math.random() * 100;
    const baseX = opts.x, baseY = opts.y, baseZ = opts.z;

    return {
      update(dt, time, camPos) {
        if (Math.hypot(baseX - camPos.x, baseZ - camPos.z) > 460) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        pulse += dt * 2.1;
        const p = (Math.sin(pulse) + 1) * 0.5;
        bell.scale.set(1 + p * 0.2, 1 - p * 0.24, 1 + p * 0.2);
        inner.scale.setScalar(0.95 + p * 0.14);
        group.position.set(
          baseX + Math.sin(t * 0.22) * 8,
          Math.min(-1.8, baseY + Math.sin(t * 0.5) * 3.5),
          baseZ + Math.cos(t * 0.19) * 8
        );
        group.rotation.y = t * 0.12;
        tentMesh.rotation.y = Math.sin(t * 0.75) * 0.15;
        const bio = OC.getPalette().bioGlow;
        const glowBoost = deep ? (1.2 + bio * 1.4) : (0.4 + bio * 1.5);
        innerMat.emissiveIntensity = glowBoost * (0.9 + p * 0.45);
        bellMat.emissiveIntensity = glowBoost * 0.48;
      }
    };
  }

  /* ---------- Синепятнистый хвостокол и Пятнистый орляк ---------- */
  function makeRay(scene, biome, opts) {
    const isEagle = !!opts.eagle;
    const span = isEagle ? 3.8 : 2.1;
    const group = new T.Group();

    const disc = new T.SphereGeometry(1, 14, 10);
    disc.scale(span * 0.5, 0.16, span * (isEagle ? 0.34 : 0.54));
    OC.geoPrep(disc);
    OC.paint(disc, (x, y, z, c) => {
      if (y < 0) { c.set(0xedf2f4); return; }
      if (isEagle) {
        const spot = Math.sin(x * 7) * Math.sin(z * 7);
        c.set(0x1f2d3d).lerp(new T.Color(0xdcebf5), spot > 0.45 ? 0.9 : 0);
      } else {
        const spot = Math.sin(x * 8.5) * Math.cos(z * 8.5);
        c.set(0xaa864a).lerp(new T.Color(0x28b8ff), spot > 0.52 ? 0.95 : 0);
      }
    });
    group.add(new T.Mesh(disc, creatureMat));

    const tail = new T.CylinderGeometry(0.02, 0.12, span * (isEagle ? 1.25 : 0.85), 5);
    tail.rotateX(Math.PI / 2);
    OC.geoPrep(tail);
    OC.paint(tail, isEagle ? 0x1f2d3d : 0x7d6238);
    const tailM = new T.Mesh(tail, creatureMat);
    tailM.position.set(0, 0, -span * (isEagle ? 0.85 : 0.72));
    group.add(tailM);

    group.scale.setScalar(opts.scale || 1);
    group.userData.key = isEagle ? 'ray_eagle' : 'ray_spotted';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 60;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 500) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += (opts.speed / opts.r) * dt;
        const rr = opts.r + Math.sin(t * 0.25) * 6;
        const ax = opts.cx + Math.cos(ang) * rr, az = opts.cz + Math.sin(ang) * rr;
        const bx = opts.cx + Math.cos(ang + 0.14) * rr, bz = opts.cz + Math.sin(ang + 0.14) * rr;
        const flA = biome.getHeight(ax, az);
        const flB = biome.getHeight(bx, bz);
        const ay = isEagle ? Math.max(opts.y + Math.sin(t * 0.4) * 3, flA + 4) : flA + 1.35 + Math.sin(t * 0.8) * 0.3;
        const by = isEagle ? Math.max(opts.y + Math.sin(t * 0.4 + 0.2) * 3, flB + 4) : flB + 1.35 + Math.sin(t * 0.8 + 0.2) * 0.3;

        a.set(ax, Math.min(-1.4, ay), az);
        b.set(bx, Math.min(-1.4, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        group.rotation.z = Math.sin(time * (isEagle ? 2.4 : 3.2)) * 0.08;
      }
    };
  }

  /* ---------- Гигантский скат-манта (Mobula birostris) ---------- */
  function makeManta(scene, biome, opts) {
    const span = opts.span || 11;
    const group = new T.Group();

    function wingGeom(sign) {
      const NX = 14, NZ = 10;
      const pos = [], col = [], idx = [];
      const cTop = new T.Color(0x1f2d3a);
      const cBot = new T.Color(0xe6f0f4);
      for (let iz = 0; iz <= NZ; iz++) {
        for (let ix = 0; ix <= NX; ix++) {
          const u = ix / NX, v = iz / NZ;
          const x = sign * u * span * 0.5;
          const chord = (1 - u * 0.78) * (1 - 0.55 * Math.pow(Math.max(0, u - 0.35) / 0.65, 2));
          const z = (0.5 - v) * span * 0.62 * chord * 1.5;
          const y = sign * (0.3 * Math.sin(u * Math.PI) * (v - 0.4)) - u * u * 0.45;
          pos.push(x, y, z);
          const c = cTop.clone().lerp(cBot, v > 0.82 ? 0.85 : v * 0.22);
          col.push(c.r, c.g, c.b);
        }
      }
      for (let iz = 0; iz < NZ; iz++) {
        for (let ix = 0; ix < NX; ix++) {
          const a = iz * (NX + 1) + ix, b = a + NX + 1;
          if (sign > 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
          else idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }

    const body = new T.SphereGeometry(1, 14, 10);
    body.scale(2.1, 0.52, 3.0);
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.set(y > 0 ? 0x22323f : 0xe4eef2));
    group.add(new T.Mesh(body, creatureMat));

    const wingL = new T.Mesh(wingGeom(1), creatureMat);
    const wingR = new T.Mesh(wingGeom(-1), creatureMat);
    group.add(wingL, wingR);

    const tailG = new T.CylinderGeometry(0.05, 0.28, 5.2, 5);
    tailG.rotateX(Math.PI / 2);
    OC.geoPrep(tailG);
    OC.paint(tailG, 0x22323f);
    const tail = new T.Mesh(tailG, creatureMat);
    tail.position.set(0, 0, -5.2);
    group.add(tail);

    group.scale.setScalar(opts.size || 0.72);
    group.userData.key = 'manta';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 80;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 720) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 4.2) / opts.r) * dt;
        const rr = opts.r + Math.sin(t * 0.2) * 14;
        const ax = opts.cx + Math.cos(ang) * rr, az = opts.cz + Math.sin(ang) * rr;
        const bx = opts.cx + Math.cos(ang + 0.1) * rr, bz = opts.cz + Math.sin(ang + 0.1) * rr;
        const ay = Math.max(opts.y + Math.sin(t * 0.3) * 6, biome.getHeight(ax, az) + 5);
        const by = Math.max(opts.y + Math.sin(t * 0.3 + 0.3) * 6, biome.getHeight(bx, bz) + 5);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        group.rotateZ(Math.sin(t * 0.3) * 0.16);
        const flap = Math.sin(time * 1.25);
        wingL.rotation.z = flap * 0.32;
        wingR.rotation.z = -flap * 0.32;
      }
    };
  }

  /* ---------- Зелёная морская черепаха ---------- */
  function makeTurtle(scene, biome, opts) {
    const group = new T.Group();
    const shell = new T.SphereGeometry(1, 16, 12);
    shell.scale(2.4, 0.92, 2.9);
    OC.geoPrep(shell);
    OC.paint(shell, (x, y, z, c) => {
      const scute = Math.sin(x * 2.5) * Math.sin(z * 2.5) * Math.sin(y * 3.0);
      c.setHSL(0.16, 0.42, y > 0 ? 0.28 + scute * 0.06 : 0.7);
    });
    group.add(new T.Mesh(shell, creatureMat));

    const head = new T.SphereGeometry(0.58, 10, 8);
    head.scale(0.95, 0.85, 1.25);
    OC.geoPrep(head);
    OC.paint(head, 0x5c6e46);
    const headM = new T.Mesh(head, creatureMat);
    headM.position.set(0, 0.1, 2.85);
    group.add(headM);

    const flippers = [];
    const flGeo = new T.SphereGeometry(1, 9, 6);
    flGeo.scale(1.65, 0.12, 0.56);
    OC.geoPrep(flGeo);
    OC.paint(flGeo, 0x556640);
    for (let i = 0; i < 4; i++) {
      const f = new T.Mesh(flGeo, creatureMat);
      const front = i < 2, sign = i % 2 === 0 ? 1 : -1;
      f.position.set(sign * (front ? 1.9 : 1.3), -0.08, front ? 1.75 : -2.15);
      f.scale.setScalar(front ? 1.0 : 0.6);
      group.add(f);
      flippers.push({ mesh: f, sign, front });
    }
    group.scale.setScalar(opts.size || 0.72);
    group.userData.key = 'turtle';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 70;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += (2.1 / opts.r) * dt;
        const rr = opts.r + Math.sin(t * 0.19) * 10;
        const ax = opts.cx + Math.cos(ang) * rr, az = opts.cz + Math.sin(ang) * rr;
        const bx = opts.cx + Math.cos(ang + 0.14) * rr, bz = opts.cz + Math.sin(ang + 0.14) * rr;
        const ay = Math.max(opts.y + Math.sin(t * 0.3) * 3.5, biome.getHeight(ax, az) + 2.2);
        const by = Math.max(opts.y + Math.sin(t * 0.3 + 0.3) * 3.5, biome.getHeight(bx, bz) + 2.2);
        a.set(ax, Math.min(-1.4, ay), az);
        b.set(bx, Math.min(-1.4, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        const stroke = Math.sin(time * 1.15);
        for (const f of flippers) {
          if (f.front) f.mesh.rotation.z = f.sign * stroke * 0.58;
          else { f.mesh.rotation.z = f.sign * Math.sin(time * 1.15 + 1.1) * 0.28; f.mesh.rotation.y = f.sign * 0.4; }
        }
        headM.rotation.y = Math.sin(time * 0.5) * 0.18;
      }
    };
  }

  /* ---------- Дюгонь (Dugong dugon) ---------- */
  function makeDugong(scene, biome, opts) {
    const group = new T.Group();
    const body = new T.SphereGeometry(1, 16, 12);
    body.scale(0.85, 0.78, 2.35);
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.setHSL(0.56, 0.12, y > 0 ? 0.48 : 0.62));
    group.add(new T.Mesh(body, creatureMat));

    const snout = new T.CylinderGeometry(0.42, 0.55, 0.9, 10);
    snout.rotateX(Math.PI * 0.65);
    OC.geoPrep(snout);
    OC.paint(snout, 0x7b8990);
    const snM = new T.Mesh(snout, creatureMat);
    snM.position.set(0, -0.22, 2.25);
    group.add(snM);

    // Плавники
    const fl = new T.SphereGeometry(1, 8, 6);
    fl.scale(0.75, 0.12, 0.35);
    OC.geoPrep(fl);
    OC.paint(fl, 0x6f7d84);
    for (const s of [-1, 1]) {
      const m = new T.Mesh(fl, creatureMat);
      m.position.set(s * 0.95, -0.35, 1.0);
      m.rotation.z = -s * 0.35;
      group.add(m);
    }

    // Хвостовой стебель и лопасть дюгоня
    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -2.1);
    const fluke = new T.ConeGeometry(0.95, 1.2, 4);
    fluke.scale(1.3, 1, 0.18);
    fluke.rotateX(Math.PI / 2);
    OC.geoPrep(fluke);
    OC.paint(fluke, 0x647279);
    const fkM = new T.Mesh(fluke, creatureMat);
    fkM.position.set(0, 0, -0.75);
    tailPivot.add(fkM);
    group.add(tailPivot);

    group.scale.setScalar(opts.scale || 1.05);
    group.userData.key = 'dugong';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 80;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += (1.7 / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r, az = opts.cz + Math.sin(ang) * opts.r;
        const bx = opts.cx + Math.cos(ang + 0.12) * opts.r, bz = opts.cz + Math.sin(ang + 0.12) * opts.r;
        const ay = Math.max(biome.getHeight(ax, az) + 1.8 + Math.sin(t * 0.4) * 0.7, -11);
        const by = Math.max(biome.getHeight(bx, bz) + 1.8 + Math.sin(t * 0.4 + 0.2) * 0.7, -11);
        a.set(ax, Math.min(-1.8, ay), az);
        b.set(bx, Math.min(-1.8, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        tailPivot.rotation.x = Math.sin(time * 1.8) * 0.35;
      }
    };
  }

  /* ---------- Рифовая акула и Китовая акула ---------- */
  function makeShark(scene, biome, opts) {
    const isWhale = !!opts.whaleShark;
    const len = isWhale ? 11.5 : 4.2;
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 18, 12);
    body.scale(len * 0.13, len * 0.14, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5); // -1 хвост .. +1 нос
      const taper = t < 0 ? (1 - 0.78 * Math.pow(-t, 1.3)) : (1 - 0.32 * Math.pow(t, 2));
      const wideHead = isWhale && t > 0.5 ? 1.25 : 1.0;
      bp.setXYZ(i, x * taper * wideHead, y * taper * (isWhale ? 0.88 : 1), z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => {
      if (isWhale) {
        if (y < -0.1) { c.set(0xe4edf2); return; }
        const spot = Math.sin(x * 4.5) * Math.cos(z * 2.2);
        c.set(0x2a4054).lerp(new T.Color(0xddecf5), spot > 0.48 ? 0.92 : 0);
      } else {
        c.set(y > -0.05 ? 0x5d6e7a : 0xdde6ea);
      }
    });
    group.add(new T.Mesh(body, creatureMat));

    // Спинной плавник
    const dorsal = new T.ConeGeometry(len * 0.11, len * 0.24, 4);
    dorsal.scale(0.25, 1, 1.1);
    OC.geoPrep(dorsal);
    OC.paint(dorsal, isWhale ? 0x2c4257 : 0x455661);
    const dorM = new T.Mesh(dorsal, creatureMat);
    dorM.position.set(0, len * 0.15, len * 0.04);
    dorM.rotation.x = -0.35;
    group.add(dorM);

    // Грудные плавники
    const pec = new T.ConeGeometry(len * 0.09, len * 0.28, 4);
    pec.scale(0.22, 1, 1);
    OC.geoPrep(pec);
    OC.paint(pec, isWhale ? 0x2a4054 : 0x52626d);
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, creatureMat);
      pm.position.set(s * len * 0.17, -len * 0.05, len * 0.12);
      pm.rotation.z = -s * 1.25;
      pm.rotation.y = s * 0.25;
      group.add(pm);
    }

    // Шарнирный хвост
    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.42);
    const tailTop = new T.ConeGeometry(len * 0.08, len * 0.34, 4);
    tailTop.scale(0.2, 1, 0.9);
    OC.geoPrep(tailTop);
    OC.paint(tailTop, isWhale ? 0x2a4054 : 0x28323a);
    const ttM = new T.Mesh(tailTop, creatureMat);
    ttM.position.set(0, len * 0.08, -len * 0.14);
    ttM.rotation.x = -0.6;
    const tailBot = new T.ConeGeometry(len * 0.06, len * 0.22, 4);
    tailBot.scale(0.2, 1, 0.8);
    OC.geoPrep(tailBot);
    OC.paint(tailBot, isWhale ? 0x2a4054 : 0x455661);
    const tbM = new T.Mesh(tailBot, creatureMat);
    tbM.position.set(0, -len * 0.05, -len * 0.1);
    tbM.rotation.x = 2.4;
    tailPivot.add(ttM, tbM);
    group.add(tailPivot);

    group.userData.key = isWhale ? 'shark_whale' : 'shark_reef';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 100;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 760) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += (opts.speed / opts.r) * dir * dt;
        const rr = opts.r + Math.sin(t * 0.18) * 14;
        const ax = opts.cx + Math.cos(ang) * rr, az = opts.cz + Math.sin(ang) * rr;
        const bx = opts.cx + Math.cos(ang + 0.1 * dir) * rr, bz = opts.cz + Math.sin(ang + 0.1 * dir) * rr;
        const ay = Math.max(opts.y + Math.sin(t * 0.24) * 5, biome.getHeight(ax, az) + 4);
        const by = Math.max(opts.y + Math.sin(t * 0.24 + 0.2) * 5, biome.getHeight(bx, bz) + 4);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        const wagFreq = isWhale ? 1.5 : 3.2;
        tailPivot.rotation.y = Math.sin(time * wagFreq + t) * 0.34;
        group.rotation.y += Math.sin(time * wagFreq + t) * 0.04;
      }
    };
  }

  /* ---------- Горбатый кит (Megaptera novaeangliae) ---------- */
  function makeHumpbackWhale(scene, biome, opts) {
    const len = 15.5;
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 20, 14);
    body.scale(len * 0.15, len * 0.14, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5);
      const taper = t < 0 ? (1 - 0.82 * Math.pow(-t, 1.4)) : (1 - 0.25 * Math.pow(t, 2.2));
      bp.setXYZ(i, x * taper, y * taper, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => c.set(y > -0.15 ? 0x1d2b3a : 0xdce6ec));
    group.add(new T.Mesh(body, creatureMat));

    // Длинные белые грудные плавники горбача (до трети длины тела)
    const pec = new T.SphereGeometry(1, 10, 8);
    pec.scale(2.9, 0.14, 0.72);
    OC.geoPrep(pec);
    OC.paint(pec, (x, y, z, c) => c.set(y > 0 ? 0x3b4d5e : 0xeff5f8));
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, creatureMat);
      pm.position.set(s * 3.1, -0.5, 2.2);
      pm.rotation.y = -s * 0.38;
      pm.rotation.z = -s * 0.18;
      group.add(pm);
    }

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.45);
    const fluke = new T.ConeGeometry(2.3, 2.6, 4);
    fluke.scale(1.4, 1, 0.16);
    fluke.rotateX(Math.PI / 2);
    OC.geoPrep(fluke);
    OC.paint(fluke, 0x223040);
    const fkM = new T.Mesh(fluke, creatureMat);
    fkM.position.set(0, 0, -1.3);
    tailPivot.add(fkM);
    group.add(tailPivot);

    group.userData.key = 'whale_humpback';
    scene.add(group);

    let ang = 0.6, t = 0;
    const a = new T.Vector3(), b = new T.Vector3();

    return {
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 950) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += (opts.speed / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r, az = opts.cz + Math.sin(ang) * opts.r;
        const bx = opts.cx + Math.cos(ang + 0.08) * opts.r, bz = opts.cz + Math.sin(ang + 0.08) * opts.r;
        const ay = Math.max(opts.y + Math.sin(t * 0.14) * 10, biome.getHeight(ax, az) + 10);
        const by = Math.max(opts.y + Math.sin(t * 0.14 + 0.2) * 10, biome.getHeight(bx, bz) + 10);
        a.set(ax, Math.min(-6.0, ay), az);
        b.set(bx, Math.min(-6.0, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        tailPivot.rotation.x = Math.sin(time * 0.95) * 0.34;
      }
    };
  }

  /* ---------- Осьминог и Гигантская мурена ---------- */
  function makeOctopus(scene, biome, opts) {
    const group = new T.Group();
    const head = new T.SphereGeometry(0.62, 12, 10);
    head.scale(0.88, 1.25, 1.0);
    OC.geoPrep(head);
    OC.paint(head, 0x9b4d3f);
    const hM = new T.Mesh(head, creatureMat);
    hM.position.y = 0.55;
    group.add(hM);

    const arms = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.28;
      const pts = [];
      for (let s = 0; s <= 5; s++) {
        const t = s / 5;
        pts.push(new T.Vector3(Math.cos(a) * (0.25 + t * 1.15), 0.15 - Math.sin(t * 3.1) * 0.25 - t * 0.25, Math.sin(a) * (0.25 + t * 1.15)));
      }
      const ag = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.1, 5, false);
      OC.geoPrep(ag);
      OC.paint(ag, 0x8f4336);
      const am = new T.Mesh(ag, creatureMat);
      group.add(am);
      arms.push(am);
    }
    group.scale.setScalar(opts.scale || 0.95);
    group.userData.key = 'octopus';
    scene.add(group);

    let t = Math.random() * 50;
    const baseY = biome.getHeight(opts.x, opts.z) + 0.55;
    return {
      update(dt, time, camPos) {
        if (Math.hypot(opts.x - camPos.x, opts.z - camPos.z) > 400) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        group.position.set(opts.x + Math.sin(t * 0.4) * 1.8, baseY + Math.abs(Math.sin(t * 0.9)) * 0.9, opts.z + Math.cos(t * 0.35) * 1.8);
        group.rotation.y = t * 0.3;
        for (let i = 0; i < arms.length; i++) {
          arms[i].rotation.z = Math.sin(time * 2.5 + i) * 0.12;
        }
      }
    };
  }

  function makeMoray(scene, biome, opts) {
    const group = new T.Group();
    const segs = 10;
    const segMeshes = [];
    for (let i = 0; i < segs; i++) {
      const r = 0.26 * (1 - (i / segs) * 0.65);
      const g = new T.SphereGeometry(r, 8, 6);
      g.scale(1, 1.15, 1.8);
      OC.geoPrep(g);
      OC.paint(g, i === 0 ? 0x5c7238 : 0x4c612f);
      const m = new T.Mesh(g, creatureMat);
      m.position.z = -i * 0.42;
      group.add(m);
      segMeshes.push(m);
    }
    group.userData.key = 'moray';
    scene.add(group);

    const baseY = biome.getHeight(opts.x, opts.z) + 0.65;
    let ang = Math.random() * 6.28, t = Math.random() * 50;
    return {
      update(dt, time, camPos) {
        if (Math.hypot(opts.x - camPos.x, opts.z - camPos.z) > 400) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += 0.25 * dt;
        group.position.set(opts.x + Math.cos(ang) * 4, baseY, opts.z + Math.sin(ang) * 4);
        group.rotation.y = -ang;
        for (let i = 0; i < segMeshes.length; i++) {
          segMeshes[i].position.x = Math.sin(time * 3.5 - i * 0.55) * 0.18;
        }
      }
    };
  }

  /* ---------- Бесконечные пузыри и биолюминесцентный планктон вокруг камеры ---------- */
  function createCameraRelativeParticles(scene, n, tex, isPlankton) {
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    const sz = new Float32Array(n);
    const spd = new Float32Array(n);
    const rng = OC.mulberry32(isPlankton ? 8812 : 4409);

    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * 180;
      pos[i * 3 + 1] = (rng() - 0.5) * 110;
      pos[i * 3 + 2] = (rng() - 0.5) * 180;
      ph[i] = rng() * 100;
      sz[i] = isPlankton ? OC.lerp(0.35, 1.35, rng()) : OC.lerp(0.45, 1.4, rng());
      spd[i] = isPlankton ? OC.lerp(0.2, 0.7, rng()) : OC.lerp(1.6, 4.4, rng());
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));
    geo.setAttribute('aSpeed', new T.BufferAttribute(spd, 1));

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: tex },
          uTime: OC.uTime,
          uCamPos: { value: new T.Vector3() },
          uColor: { value: new T.Color(isPlankton ? 0x7ef2ff : 0xc6f2ff) },
          uBio: { value: 0.4 },
          uScale: { value: 1.0 }
        }
      ]),
      vertexShader: `
        attribute float aPhase, aSize, aSpeed;
        uniform float uTime, uScale, uBio;
        uniform vec3 uCamPos;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main(){
          vec3 box = vec3(180.0, 110.0, 180.0);
          vec3 p = position;
          ${isPlankton
            ? `p.x += sin(uTime * 0.16 + aPhase) * 3.5;
               p.y += cos(uTime * 0.21 + aPhase * 1.3) * 2.2;
               p.z += cos(uTime * 0.14 + aPhase * 0.7) * 3.5;`
            : `p.y += uTime * aSpeed;
               p.x += sin(uTime * 0.75 + aPhase) * 1.1;
               p.z += cos(uTime * 0.6 + aPhase) * 1.1;`}
          vec3 rel = mod(p - uCamPos + box * 0.5, box) - box * 0.5;
          vec3 worldP = uCamPos + rel;
          // Не вылетаем над поверхностью моря (Y = 0)
          float belowWater = step(worldP.y, -0.35);
          vec4 mvPosition = modelViewMatrix * vec4(worldP, 1.0);
          gl_PointSize = belowWater * aSize * uScale * (${isPlankton ? '135.0' : '115.0'} / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          float blink = ${isPlankton
            ? '0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.7 + fract(aPhase) * 1.3) + aPhase), 2.0)'
            : '0.85'};
          vAlpha = belowWater * blink * ${isPlankton ? '(0.28 + uBio * 0.72)' : '0.52'};
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex; uniform vec3 uColor;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main(){
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.02 || vAlpha < 0.01) discard;
          gl_FragColor = vec4(uColor, tx.a * vAlpha);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.key = isPlankton ? 'plankton' : 'bubbles';
    scene.add(pts);
    return mat;
  }

  /* ---------- Сборка всей фауны Большого Барьерного рифа ---------- */
  OC.FaunaEngine = {
    init(scene, biome) {
      fishMatInstanced = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.48, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: 0.45, fishSwim: true });

      creatureMat = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.52, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: 0.55 });

      const agents = [];
      const so = biome.shelfOffset;
      const pz = biome.passCenterZ;
      const bh = biome.blueHole;
      const cay = biome.sandCay;

      // ---- Стаи рыб по экологическим зонам ----
      const schoolsSpec = [
        // Голубые хирурги
        { key: 'fish_blue', n: 38, cx: -60 + so(40), cz: 40, radius: 34, yDepth: -7, spread: 10, speed: 6.5,
          geoOpts: { len: 1.15, height: 0.56, width: 0.2, colA: 0x1d7ed8, colB: 0x72c8ff, finCol: 0xffe44d, tailH: 0.72 } },
        { key: 'fish_blue', n: 42, cx: 145 + so(-40), cz: -40, radius: 42, yDepth: -6, spread: 12, speed: 7.2,
          geoOpts: { len: 1.15, height: 0.56, width: 0.2, colA: 0x1d7ed8, colB: 0x72c8ff, finCol: 0xffe44d, tailH: 0.72 } },
        // Жёлтые танги
        { key: 'fish_yellow', n: 32, cx: 95 + so(120), cz: 120, radius: 36, yDepth: -5.5, spread: 9, speed: 5.5,
          geoOpts: { len: 1.25, height: 0.88, width: 0.2, colA: 0xffc61a, colB: 0xfff3a8, finCol: 0xffa800, tailH: 0.52 } },
        { key: 'fish_yellow', n: 28, cx: 180 + so(-190), cz: -190, radius: 32, yDepth: -8, spread: 9, speed: 5.8,
          geoOpts: { len: 1.25, height: 0.88, width: 0.2, colA: 0xffc61a, colB: 0xfff3a8, finCol: 0xffa800, tailH: 0.52 } },
        // Серебряные сардины (плотные шары в лагуне и проходе)
        { key: 'fish_silver', n: 75, cx: 345 + so(245), cz: pz(345 + so(245)), radius: 28, yDepth: -14, spread: 11, speed: 9.5, scale: 0.85,
          geoOpts: { len: 0.95, height: 0.32, width: 0.14, colA: 0x90b4c8, colB: 0xedf8ff, finCol: 0xb2cbd9, tailH: 0.85 } },
        { key: 'fish_silver', n: 65, cx: -120 + so(-120), cz: -120, radius: 44, yDepth: -9, spread: 13, speed: 8.8, scale: 0.85,
          geoOpts: { len: 0.95, height: 0.32, width: 0.14, colA: 0x90b4c8, colB: 0xedf8ff, finCol: 0xb2cbd9, tailH: 0.85 } },
        // Зелёные хромисы над гребнем и бомми
        { key: 'fish_chromis', n: 55, cx: 80 + so(10), cz: 10, radius: 18, yDepth: -4.2, spread: 7, speed: 4.5, scale: 0.65,
          geoOpts: { len: 0.85, height: 0.4, width: 0.16, colA: 0x38d8c8, colB: 0xb8fff6, finCol: 0x6ce8dc } },
        { key: 'fish_chromis', n: 48, cx: biome.bommies[0].x, cz: biome.bommies[0].z, radius: 20, yDepth: -6.5, spread: 7, speed: 4.2, scale: 0.65,
          geoOpts: { len: 0.85, height: 0.4, width: 0.16, colA: 0x38d8c8, colB: 0xb8fff6, finCol: 0x6ce8dc } },
        // Рыбы-клоуны
        { key: 'fish_orange', n: 16, cx: -20 + so(45), cz: 45, radius: 12, yDepth: -7.5, spread: 4.5, speed: 3.4, scale: 0.85,
          geoOpts: { len: 0.95, height: 0.52, width: 0.22, colA: 0xff5a1f, colB: 0xffffff, finCol: 0xff8a30, stripes: 1.0 } },
        { key: 'fish_orange', n: 14, cx: cay.x + 88, cz: cay.z + 40, radius: 10, yDepth: -3.5, spread: 4, speed: 3.2, scale: 0.85,
          geoOpts: { len: 0.95, height: 0.52, width: 0.22, colA: 0xff5a1f, colB: 0xffffff, finCol: 0xff8a30, stripes: 1.0 } },
        // Рыбы-бабочки и мавританские идолы
        { key: 'fish_butterfly', n: 18, cx: 110 + so(50), cz: 50, radius: 26, yDepth: -5.5, spread: 9, speed: 4.2, scale: 0.9,
          geoOpts: { len: 1.0, height: 0.85, width: 0.16, colA: 0xffe44d, colB: 0x1a1a22, finCol: 0xffffff, stripes: 1.0 } },
        { key: 'fish_idol', n: 14, cx: 210 + so(-40), cz: -40, radius: 30, yDepth: -9.5, spread: 8, speed: 4.8, scale: 1.0,
          geoOpts: { len: 1.05, height: 0.88, width: 0.16, colA: 0x181c24, colB: 0xffdc4d, finCol: 0xffffff, stripes: 1.0, streamer: true } },
        // Барракуды в Проходе и у Обрыва
        { key: 'fish_barracuda', n: 28, cx: 440 + so(240), cz: pz(440 + so(240)), radius: 22, yDepth: -22, spread: 8, speed: 7.5, scale: 1.35,
          geoOpts: { len: 2.3, height: 0.36, width: 0.24, colA: 0x5c7382, colB: 0xdcebf2, finCol: 0x455866, tailH: 0.9 } },
        // Рыбы-попугаи
        { key: 'fish_parrot', n: 16, cx: 135 + so(15), cz: 15, radius: 28, yDepth: -6.5, spread: 10, speed: 4.6, scale: 1.15,
          geoOpts: { len: 1.5, height: 0.62, width: 0.28, colA: 0x26c6a8, colB: 0xff7aa8, finCol: 0x52e0c4, tailH: 0.6 } }
      ];

      const schools = [];
      for (const s of schoolsSpec) {
        const sch = makeSchool(scene, biome, s);
        schools.push(sch);
        agents.push(sch);
      }

      // ---- Одиночные рифовые рыбы, крылатки, осьминоги, мурены ----
      for (let i = 0; i < 6; i++) {
        const z = -300 + i * 120;
        agents.push(makeSoloFish(scene, biome, {
          key: 'angelfish', cx: 60 + so(z), cz: z, r: 16 + (i % 3) * 5, y: -7 - (i % 3) * 3, speed: 2.2, scale: 1.1,
          geoOpts: { len: 1.8, height: 0.92, width: 0.3, colA: 0x2255c8, colB: 0xffe14d, finCol: 0x55aaff, stripes: 1.0 }
        }));
      }

      // Крылатки у Голубой дыры и внешнего склона
      agents.push(makeLionfish(scene, biome, { cx: bh.x + 28, cz: bh.z - 16, r: 9, y: -26, scale: 1.15 }));
      agents.push(makeLionfish(scene, biome, { cx: bh.x - 24, cz: bh.z + 22, r: 10, y: -38, scale: 1.1 }));
      agents.push(makeLionfish(scene, biome, { cx: 420 + so(120), cz: 120, r: 12, y: -25, scale: 1.1 }));

      // Осьминоги и мурены
      agents.push(makeOctopus(scene, biome, { x: -110 + so(60), z: 60, scale: 1.05 }));
      agents.push(makeOctopus(scene, biome, { x: 185 + so(-85), z: -85, scale: 1.15 }));
      agents.push(makeOctopus(scene, biome, { x: 375 + so(210), z: pz(375 + so(210)) + 26, scale: 1.1 }));

      agents.push(makeMoray(scene, biome, { x: bh.x + 36, z: bh.z + 18 }));
      agents.push(makeMoray(scene, biome, { x: 320 + so(-60), z: -60 }));
      agents.push(makeMoray(scene, biome, { x: biome.bommies[1].x + 10, z: biome.bommies[1].z - 8 }));

      // ---- Медузы (лагуна + биолюминесцентные в Голубой дыре и на обрыве) ----
      const jHues = [0.82, 0.74, 0.91, 0.62, 0.87, 0.70, 0.78, 0.94];
      for (let i = 0; i < 10; i++) {
        const z = -420 + i * 95;
        const x = (-180 + (i % 4) * 130) + so(z);
        agents.push(makeJelly(scene, {
          x, z, y: -5 - (i % 4) * 3.5, hue: jHues[i % jHues.length], size: 0.95 + (i % 3) * 0.25, deep: false
        }));
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28;
        agents.push(makeJelly(scene, {
          x: bh.x + Math.cos(a) * 18, z: bh.z + Math.sin(a) * 18,
          y: -26 - i * 8, hue: 0.76 + (i % 3) * 0.08, size: 1.2 + (i % 2) * 0.35, deep: true
        }));
      }
      for (let i = 0; i < 4; i++) {
        const z = -220 + i * 160;
        agents.push(makeJelly(scene, {
          x: 640 + so(z), z, y: -42 - i * 10, hue: 0.56 + i * 0.1, size: 1.4, deep: true
        }));
      }

      // ---- Дюгони на лугах морской травы ----
      agents.push(makeDugong(scene, biome, { cx: -555 + so(90), cz: 90, r: 28, scale: 1.15 }));
      agents.push(makeDugong(scene, biome, { cx: -595 + so(-140), cz: -140, r: 34, scale: 1.0 }));

      // ---- Черепахи ----
      agents.push(makeTurtle(scene, biome, { cx: -520 + so(60), cz: 60, r: 35, y: -5.5, size: 0.8 }));
      agents.push(makeTurtle(scene, biome, { cx: cay.x + 65, cz: cay.z + 45, r: 28, y: -3.2, size: 0.75 }));
      agents.push(makeTurtle(scene, biome, { cx: 115 + so(20), cz: 20, r: 38, y: -5.5, size: 0.85 }));
      agents.push(makeTurtle(scene, biome, { cx: -150 + so(-220), cz: -220, r: 42, y: -9.0, size: 0.65 }));

      // ---- Скаты-хвостоколы, орляки и гигантские манты ----
      agents.push(makeRay(scene, biome, { cx: -480 + so(120), cz: 120, r: 24, speed: 2.0, eagle: false }));
      agents.push(makeRay(scene, biome, { cx: -180 + so(150), cz: 150, r: 32, speed: 2.2, eagle: false }));
      agents.push(makeRay(scene, biome, { cx: cay.x + 95, cz: cay.z - 55, r: 22, speed: 1.9, eagle: false }));

      agents.push(makeRay(scene, biome, { cx: 360 + so(245), cz: pz(360 + so(245)), r: 28, y: -15, speed: 3.4, eagle: true }));
      agents.push(makeRay(scene, biome, { cx: 470 + so(230), cz: pz(470 + so(230)), r: 32, y: -20, speed: 3.8, eagle: true }));

      agents.push(makeManta(scene, biome, { cx: 615 + so(-40), cz: -40, r: 58, y: -26, span: 11, size: 0.75, speed: 4.2 }));
      agents.push(makeManta(scene, biome, { cx: 645 + so(180), cz: 180, r: 52, y: -32, span: 9.5, size: 0.7, speed: 4.6 }));
      agents.push(makeManta(scene, biome, { cx: 380 + so(245), cz: pz(380 + so(245)), r: 45, y: -16, span: 9, size: 0.68, speed: 4.0 }));

      // ---- Рифовые акулы ----
      agents.push(makeShark(scene, biome, { cx: bh.x, cz: bh.z, r: 54, y: -18, speed: 4.8 }));
      agents.push(makeShark(scene, biome, { cx: 590 + so(-120), cz: -120, r: 65, y: -32, speed: 5.2 }));
      agents.push(makeShark(scene, biome, { cx: 625 + so(140), cz: 140, r: 62, y: -38, speed: 5.5 }));
      agents.push(makeShark(scene, biome, { cx: 390 + so(240), cz: pz(390 + so(240)), r: 44, y: -22, speed: 4.9 }));

      // ---- Китовая акула и Горбатый кит в Коралловом море ----
      agents.push(makeShark(scene, biome, { cx: 700 + so(-40), cz: -40, r: 95, y: -36, speed: 3.2, whaleShark: true }));
      const whale = makeHumpbackWhale(scene, biome, { cx: 840 + so(20), cz: 20, r: 145, y: -48, speed: 3.6 });
      agents.push(whale);

      // ---- Пузыри и планктон (бесконечные вокруг камеры) ----
      const pCountMult = OC.Quality.get().particlesScale;
      const texSoft = OC.circleTexture(64, false);
      const texHard = OC.circleTexture(64, true);
      const bubbleMat = createCameraRelativeParticles(scene, Math.round(900 * pCountMult), texHard, false);
      const planktonMat = createCameraRelativeParticles(scene, Math.round(1500 * pCountMult), texSoft, true);

      const bioPlanktonCol = new T.Color(0x52f2ff);
      const dayPlanktonCol = new T.Color(0x9be8ff);

      function refreshFaunaCounts() {
        let total = 0;
        for (const sch of schools) total += sch.getCount();
        OC.faunaInfo.schoolFish = total;
      }

      OC.faunaInfo = {
        schoolFish: 0,
        schools: schools.length,
        big: agents.length - schools.length,
        whale
      };
      refreshFaunaCounts();

      OC.Quality.onChange((preset) => {
        for (const sch of schools) sch.setQualityScale(preset.fishScale);
        refreshFaunaCounts();
      });

      return {
        agents,
        whale,
        update(dt, time, camPos) {
          for (let i = 0; i < agents.length; i++) agents[i].update(dt, time, camPos);
          bubbleMat.uniforms.uCamPos.value.copy(camPos);
          planktonMat.uniforms.uCamPos.value.copy(camPos);
          const pal = OC.getPalette();
          planktonMat.uniforms.uBio.value = pal.bioGlow;
          planktonMat.uniforms.uColor.value.copy(pal.bioGlow > 0.45 ? bioPlanktonCol : dayPlanktonCol);
        },
        setScale(s) {
          bubbleMat.uniforms.uScale.value = s;
          planktonMat.uniforms.uScale.value = s;
        }
      };
    }
  };
})(window.OC);
