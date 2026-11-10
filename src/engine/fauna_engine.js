/* ================= ФАУНА: ЭКОСИСТЕМНЫЙ ИИ (BOIDS), ДЕНЬ/НОЧЬ, МЕГАФАУНА, ПЛАНКТОН ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  let fishMatInstanced = null;
  let fishMatBiolum = null;
  let creatureMat = null;
  let faunaGroup = null;
  let activeSchoolsRef = [];
  let qualityHookBound = false;

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

  /* ---------- Стая рыб (Spatial-Hash Boids + GPU-изгиб + хищники + день/ночь) ---------- */
  const BOID_HASH_CAP = 512;
  const BOID_CELL_SIZE = 7.0;
  function hashCell(ix, iy, iz) {
    return (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663) ^ Math.imul(iz, 83492791)) & (BOID_HASH_CAP - 1);
  }

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
    const diel = opts.diel || 'diurnal';
    const shyness = opts.shyness !== undefined ? opts.shyness : 0.7;
    const curious = opts.curious || 0;
    const isPredator = !!opts.isPredator;
    const isCleaner = !!opts.cleaner;
    const isBiolum = !!opts.biolum;

    const geo = makeFishGeo(opts.geoOpts || {});
    const swimAttr = new Float32Array(maxN * 2);
    const rng = OC.mulberry32((Math.abs(Math.round(cx * 31 + cz * 17)) ^ (baseN * 977)) >>> 0 || 1337);
    for (let i = 0; i < maxN; i++) {
      swimAttr[i * 2] = rng() * 6.28;
      swimAttr[i * 2 + 1] = (7.5 + rng() * 4.5) * (speed * 0.16);
    }
    geo.setAttribute('aSwim', new T.InstancedBufferAttribute(swimAttr, 2));

    const mat = isBiolum ? fishMatBiolum : fishMatInstanced;
    const mesh = new T.InstancedMesh(geo, mat, maxN);
    mesh.count = n;
    mesh.frustumCulled = false;
    mesh.userData.key = opts.key || 'fish_blue';
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    scene.add(mesh);

    const px = new Float32Array(maxN);
    const py = new Float32Array(maxN);
    const pz = new Float32Array(maxN);
    const vx = new Float32Array(maxN);
    const vy = new Float32Array(maxN);
    const vz = new Float32Array(maxN);
    const floorY = new Float32Array(maxN);
    const phase = new Float32Array(maxN);
    const cellX = new Int32Array(maxN);
    const cellY = new Int32Array(maxN);
    const cellZ = new Int32Array(maxN);
    const next = new Int32Array(maxN);
    const head = new Int32Array(BOID_HASH_CAP);

    let ang = rng() * 6.28;
    const angDir = rng() < 0.5 ? 1 : -1;
    let t = rng() * 100;

    const ax0 = cx + Math.cos(ang) * radius;
    const az0 = cz + Math.sin(ang) * radius;
    const ay0 = Math.max(yDepth, biome.getHeight(ax0, az0) + 2.4);

    for (let i = 0; i < maxN; i++) {
      const off = OC.fibDir(i, maxN).multiplyScalar(spread * (0.35 + rng() * 0.65));
      px[i] = ax0 + off.x;
      pz[i] = az0 + off.z;
      const fl = biome.getHeight(px[i], pz[i]);
      floorY[i] = fl;
      py[i] = OC.clamp(ay0 + off.y * 0.6, fl + 1.4, -1.0);
      const a0 = ang + (rng() - 0.5) * 0.8;
      vx[i] = -Math.sin(a0) * angDir * speed * 0.8;
      vy[i] = (rng() - 0.5) * 0.4;
      vz[i] = Math.cos(a0) * angDir * speed * 0.8;
      phase[i] = rng() * 6.28;
    }

    const anchor = new T.Vector3(ax0, ay0, az0);
    const matArr = mesh.instanceMatrix.array;
    const isHostAnemone = !!opts.hostAnemone;
    const isPrey = !isPredator && !isCleaner && !isHostAnemone && !isBiolum;
    let anemoneHostFloor = biome.getHeight(cx, cz);
    let huntTimer = 0;
    let huntCooldown = 8 + rng() * 14;
    let huntTarget = null;
    let schoolPanic = 0;

    // Если это семья рыб-клоунов, ставим реальную актинию-хозяина прямо на дно в центре территории
    if (isHostAnemone) {
      const anemG = new T.Group();
      const baseM = new T.Mesh(new T.CylinderGeometry(1.05, 1.35, 0.55, 10), creatureMat);
      OC.geoPrep(baseM.geometry);
      OC.paint(baseM.geometry, 0xb84086);
      baseM.position.y = 0.25;
      anemG.add(baseM);
      for (let ti = 0; ti < 10; ti++) {
        const ta = (ti / 10) * Math.PI * 2;
        const tGeo = new T.ConeGeometry(0.16, 1.15, 5);
        OC.geoPrep(tGeo);
        OC.paint(tGeo, (x, y, z, c) => c.set(y > 0.2 ? 0xff7ae0 : 0xa03888));
        const tm = new T.Mesh(tGeo, creatureMat);
        tm.position.set(Math.cos(ta) * 0.58, 0.78, Math.sin(ta) * 0.58);
        tm.rotation.z = -Math.cos(ta) * 0.36;
        tm.rotation.x = Math.sin(ta) * 0.36;
        anemG.add(tm);
      }
      anemG.position.set(cx, anemoneHostFloor - 0.1, cz);
      anemG.userData.key = 'anemone';
      scene.add(anemG);
    }

    return {
      mesh,
      key: opts.key || 'fish_blue',
      baseN,
      isPredator,
      isPrey,
      isHunting: () => huntTimer > 0,
      getPanic: () => schoolPanic,
      center: anchor,
      getPosition: () => anchor,
      setQualityScale(mult) {
        n = OC.clamp(Math.round(baseN * mult), 6, maxN);
        mesh.count = n;
      },
      getCount: () => n,
      update(dt, time, camPos, ctx) {
        const distCam = Math.hypot(anchor.x - camPos.x, anchor.z - camPos.z);
        if (distCam > 540) {
          mesh.visible = false;
          return;
        }
        mesh.visible = true;

        // Вторая ступень LOD: на дистанции > 220 м обновляем физику через кадр с 2x шагом
        const frameIdx = ctx ? ctx.frameIdx : 0;
        const distant = distCam > 220;
        if (distant && (frameIdx & 1) === 1) return;
        const stepDt = distant ? Math.min(0.08, dt * 2) : dt;

        const dayW = ctx ? ctx.dayW : 1.0;
        const camSpeed = ctx ? ctx.camSpeed : 0;
        const flashOn = ctx ? ctx.flashOn : false;
        const predators = ctx ? ctx.predators : null;
        const preyCenters = ctx ? ctx.preyCenters : null;
        const cleanClients = ctx ? ctx.cleanClients : null;
        const stations = ctx ? ctx.cleaningStations : null;
        const sonarPulseAge = ctx ? ctx.sonarPulseAge : 99;
        const sonarOrigin = ctx ? ctx.sonarOrigin : null;

        // Суточный ритм (день / сумерки / ночь)
        let activity = 1.0;
        let depthShift = 0;
        let radiusMult = 1.0;
        if (diel === 'diurnal') {
          activity = OC.lerp(0.52, 1.0, dayW);
          depthShift = OC.lerp(-2.8, 0.0, dayW); // ночью опускаются к коралловому укрытию
          radiusMult = OC.lerp(0.55, 1.0, dayW);
        } else if (diel === 'nocturnal') {
          activity = OC.lerp(1.25, 0.55, dayW);
          depthShift = OC.lerp(4.5, -4.0, dayW); // ночью поднимаются охотиться, днём в тени грота
          radiusMult = OC.lerp(1.25, 0.6, dayW);
        } else {
          activity = OC.lerp(0.85, 1.05, dayW);
        }

        // Охота хищных стай (барракуды) на ближайший косяк жертв
        if (isPredator && preyCenters && preyCenters.length) {
          if (huntTimer > 0) {
            huntTimer -= stepDt;
            activity *= 1.65;
          } else {
            huntCooldown -= stepDt;
            if (huntCooldown <= 0) {
              let bestD = 125;
              let bestP = null;
              for (let p = 0; p < preyCenters.length; p++) {
                const pr = preyCenters[p];
                const d = Math.hypot(pr.x - anchor.x, pr.z - anchor.z);
                if (d < bestD) { bestD = d; bestP = pr; }
              }
              if (bestP) {
                huntTarget = bestP;
                huntTimer = 4.6;
              }
              huntCooldown = 15 + ((frameIdx * 7) % 10);
            }
          }
        }

        t += stepDt;
        let hideInAnemone = false;
        if (isHostAnemone) {
          const dCamHost = Math.hypot(cx - camPos.x, cz - camPos.z);
          if (dCamHost < 15 && (camSpeed > 5.5 || flashOn)) hideInAnemone = true;
        }
        const effRadius = isHostAnemone ? (hideInAnemone ? 1.2 : 4.2) : radius * radiusMult;
        ang += (speed * activity / Math.max(8, effRadius)) * angDir * stepDt;
        const r = effRadius + Math.sin(t * 0.16) * (effRadius * 0.18);
        let ax = cx + Math.cos(ang) * r;
        let az = cz + Math.sin(ang) * r;
        const floorC = isHostAnemone ? anemoneHostFloor : biome.getHeight(ax, az);
        let ay = isHostAnemone
          ? OC.clamp(hideInAnemone ? floorC + 0.95 : floorC + 2.25 + Math.sin(t * 0.6) * 0.55, floorC + 0.75, -1.2)
          : OC.clamp(yDepth + depthShift + Math.sin(t * 0.25) * yAmp, floorC + 2.2, -1.4);

        // Наведение хищной стаи на жертву во время броска
        if (huntTimer > 0 && huntTarget) {
          ax = OC.lerp(ax, huntTarget.x, 0.72);
          az = OC.lerp(az, huntTarget.z, 0.72);
          ay = OC.lerp(ay, huntTarget.y, 0.72);
        }

        // Фототаксис светящихся видов к лучу прожектора в темноте / на глубине
        if (isBiolum && flashOn && (dayW < 0.52 || biome.noSurface)) {
          const dFlash = Math.hypot(camPos.x - ax, camPos.z - az);
          if (dFlash < 44 && dFlash > 6) {
            ax = OC.lerp(ax, camPos.x, 0.36);
            az = OC.lerp(az, camPos.z, 0.36);
            ay = OC.lerp(ay, Math.min(-1.8, camPos.y - 0.5), 0.36);
          }
        }

        anchor.set(ax, ay, az);

        // Определяем активную станцию чистки или присутствующую там мегафауну-клиента
        let stationPullX = 0, stationPullY = 0, stationPullZ = 0, hasStation = false;
        if (isCleaner && dayW > 0.32) {
          if (cleanClients && cleanClients.length) {
            for (let c = 0; c < cleanClients.length; c++) {
              const cl = cleanClients[c];
              if (Math.hypot(cl.x - ax, cl.z - az) < 42) {
                stationPullX = cl.x; stationPullY = cl.y; stationPullZ = cl.z;
                hasStation = true;
                break;
              }
            }
          }
          if (!hasStation && stations && stations.length) {
            for (let s = 0; s < stations.length; s++) {
              const st = stations[s];
              if (Math.hypot(st.x - ax, st.z - az) < st.radius * 2.2) {
                stationPullX = st.x; stationPullY = st.y; stationPullZ = st.z;
                hasStation = true;
                break;
              }
            }
          }
        }

        // Строим пространственный хэш за O(N) без аллокаций (на дистанции <= 185 м)
        const fullBoids = distCam <= 185;
        if (fullBoids) {
          head.fill(-1);
          for (let i = 0; i < n; i++) {
            const gxi = Math.floor(px[i] / BOID_CELL_SIZE) | 0;
            const gyi = Math.floor(py[i] / BOID_CELL_SIZE) | 0;
            const gzi = Math.floor(pz[i] / BOID_CELL_SIZE) | 0;
            cellX[i] = gxi;
            cellY[i] = gyi;
            cellZ[i] = gzi;
            const h = hashCell(gxi, gyi, gzi);
            next[i] = head[h];
            head[h] = i;
          }
        }

        const sepR2 = 5.3;   // ~2.3 м разделение
        const cohR2 = 84.0;  // ~9.2 м выравнивание и сплочение
        const shyR = 10.5 + Math.min(8.5, camSpeed * 0.35) + (flashOn ? 4.0 : 0.0);
        const shyR2 = shyR * shyR;
        const minSpd = speed * 0.42 * activity;
        const maxSpdBase = speed * 1.38 * activity;
        let maxPanicTick = 0;
        const sonarWaveNear = sonarPulseAge < 2.2 && sonarOrigin && Math.hypot(anchor.x - sonarOrigin.x, anchor.z - sonarOrigin.z) < 115;

        for (let i = 0; i < n; i++) {
          const x = px[i], y = py[i], z = pz[i];
          const vxi = vx[i], vyi = vy[i], vzi = vz[i];

          let fx = 0, fy = 0, fz = 0;
          let panic = 1.0;

          if (fullBoids) {
            const gxi = cellX[i], gyi = cellY[i], gzi = cellZ[i];
            let sepX = 0, sepY = 0, sepZ = 0;
            let aliX = 0, aliY = 0, aliZ = 0;
            let cohX = 0, cohY = 0, cohZ = 0;
            let neigh = 0;

            for (let dx = -1; dx <= 1; dx++) {
              const nx = gxi + dx;
              for (let dy = -1; dy <= 1; dy++) {
                const ny = gyi + dy;
                for (let dz = -1; dz <= 1; dz++) {
                  const nz = gzi + dz;
                  let j = head[hashCell(nx, ny, nz)];
                  while (j !== -1) {
                    if (j !== i && cellX[j] === nx && cellY[j] === ny && cellZ[j] === nz) {
                      const ddx = x - px[j];
                      const ddy = y - py[j];
                      const ddz = z - pz[j];
                      const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
                      if (d2 > 0.0004 && d2 < cohR2) {
                        neigh++;
                        aliX += vx[j]; aliY += vy[j]; aliZ += vz[j];
                        cohX += px[j]; cohY += py[j]; cohZ += pz[j];
                        if (d2 < sepR2) {
                          const inv = 1.0 / (d2 + 0.12);
                          sepX += ddx * inv;
                          sepY += ddy * inv;
                          sepZ += ddz * inv;
                        }
                      }
                    }
                    j = next[j];
                  }
                }
              }
            }

            fx += sepX * 9.5;
            fy += sepY * 9.5;
            fz += sepZ * 9.5;

            if (neigh > 0) {
              const invN = 1.0 / neigh;
              const baitMult = schoolPanic > 0.35 ? 1.85 : 1.0;
              fx += (aliX * invN - vxi) * 1.15 * baitMult;
              fy += (aliY * invN - vyi) * 1.15 * baitMult;
              fz += (aliZ * invN - vzi) * 1.15 * baitMult;
              fx += (cohX * invN - x) * 0.65 * baitMult;
              fy += (cohY * invN - y) * 0.55 * baitMult;
              fz += (cohZ * invN - z) * 0.65 * baitMult;
            }
          }

          // Притяжение к патрулируемой точке зоны / клиенту на станции чистки
          const clientPull = hasStation && cleanClients && cleanClients.length ? 0.68 : 0.25;
          const hx = hasStation ? OC.lerp(anchor.x, stationPullX, clientPull) : anchor.x;
          const hy = hasStation ? OC.lerp(anchor.y, stationPullY, clientPull) : anchor.y;
          const hz = hasStation ? OC.lerp(anchor.z, stationPullZ, clientPull) : anchor.z;
          const hdx = hx - x, hdy = hy - y, hdz = hz - z;
          const hd = Math.hypot(hdx, hdy, hdz);
          if (hd > spread * 0.65) {
            const pull = (hd - spread * 0.65) * 0.35;
            fx += (hdx / hd) * pull;
            fy += (hdy / hd) * pull * 0.85;
            fz += (hdz / hd) * pull;
          }

          // Избегание хищников (акулы, барракуды, ночные крылатки) -> волна паники + baitball
          if (fullBoids && !isPredator && predators && predators.length) {
            for (let p = 0; p < predators.length; p++) {
              const pr = predators[p];
              const pdx = x - pr.x, pdy = y - pr.y, pdz = z - pr.z;
              const pd2 = pdx * pdx + pdy * pdy + pdz * pdz;
              if (pd2 < 676 && pd2 > 0.01) { // < 26 м
                const pd = Math.sqrt(pd2);
                const flee = (26 - pd) * (pd < 11 ? 3.4 : 2.15);
                fx += (pdx / pd) * flee;
                fy += (pdy / pd) * flee * 0.65;
                fz += (pdz / pd) * flee;
                panic = Math.max(panic, pd < 11 ? 1.95 : 1.65);
                maxPanicTick = Math.max(maxPanicTick, pd < 11 ? 1.0 : 0.65);
              }
            }
          }

          // Реакция на активный импульс сонара (G)
          if (sonarWaveNear && sonarOrigin) {
            const sdx = x - sonarOrigin.x, sdy = y - sonarOrigin.y, sdz = z - sonarOrigin.z;
            const sd = Math.hypot(sdx, sdy, sdz) || 1;
            const pulse = Math.max(0, 1 - sonarPulseAge / 2.2) * 14.0;
            fx += (sdx / sd) * pulse;
            fy += (sdy / sd) * pulse * 0.5;
            fz += (sdz / sd) * pulse;
            panic = Math.max(panic, 1.55);
            maxPanicTick = Math.max(maxPanicTick, 0.5);
          }

          // Реакция на дайвера / батискаф и прожектор
          if (fullBoids) {
            const cdx = x - camPos.x, cdy = y - camPos.y, cdz = z - camPos.z;
            const cd2 = cdx * cdx + cdy * cdy + cdz * cdz;
            if (!isBiolum && shyness > 0 && cd2 < shyR2 && cd2 > 0.01) {
              const cd = Math.sqrt(cd2);
              const away = (shyR - cd) * 1.45 * shyness;
              fx += (cdx / cd) * away;
              fy += (cdy / cd) * away * 0.55;
              fz += (cdz / cd) * away;
              if (cd < 7) panic = Math.max(panic, 1.35);
            } else if ((curious > 0 || (isBiolum && flashOn)) && camSpeed < 4.5 && cd2 < 529 && cd2 > 28) {
              const cd = Math.sqrt(cd2);
              const pullC = isBiolum && flashOn ? 1.9 : curious;
              fx -= (cdx / cd) * pullC * 1.4;
              fy -= (cdy / cd) * pullC * 0.7;
              fz -= (cdz / cd) * pullC * 1.4;
            }
          }

          // Вертикальная граница дна и поверхности воды (кэшируем высоту дна round-robin по 1/4 рыб за кадр)
          let fl = floorC;
          if (!distant) {
            if (((i + frameIdx) & 3) === 0) floorY[i] = biome.getHeight(x, z);
            fl = floorY[i];
          }
          if (y < fl + 1.9) fy += (fl + 1.9 - y) * 14.0;
          if (y > -1.3) fy -= (y + 1.3) * 10.0;

          // Лёгкое органическое рысканье
          const ph = phase[i];
          fx += Math.sin(t * 1.9 + ph) * 0.55;
          fz += Math.cos(t * 1.7 + ph * 1.3) * 0.55;

          let nvx = vxi + fx * stepDt;
          let nvy = (vyi + fy * stepDt) * 0.96;
          let nvz = vzi + fz * stepDt;

          const spd = Math.hypot(nvx, nvy, nvz);
          const maxSpd = maxSpdBase * panic;
          if (spd > maxSpd && spd > 1e-5) {
            const s = maxSpd / spd;
            nvx *= s; nvy *= s; nvz *= s;
          } else if (spd < minSpd) {
            if (spd > 1e-4) {
              const s = minSpd / spd;
              nvx *= s; nvy *= s; nvz *= s;
            } else {
              nvx = minSpd; nvy = 0; nvz = 0;
            }
          }

          let nx = x + nvx * stepDt;
          let ny = OC.clamp(y + nvy * stepDt, fl + 1.15, -0.85);
          let nz = z + nvz * stepDt;

          px[i] = nx; py[i] = ny; pz[i] = nz;
          vx[i] = nvx; vy[i] = nvy; vz[i] = nvz;

          // Записываем ортонормированную матрицу прямо в буфер InstancedMesh без Object3D/Euler аллокаций
          const fy0 = nvy * 0.7;
          const flen = Math.hypot(nvx, fy0, nvz);
          const off = i << 4;
          if (flen > 1e-4) {
            const invF = 1.0 / flen;
            const fxm = nvx * invF, fym = fy0 * invF, fzm = nvz * invF;
            let zx = -fzm, zz = fxm;
            const zlen = Math.hypot(zx, zz);
            if (zlen > 1e-5) {
              const invZ = 1.0 / zlen;
              zx *= invZ; zz *= invZ;
            } else {
              zx = 1; zz = 0;
            }
            const yx = -zz * fym;
            const yy = zz * fxm - zx * fzm;
            const yz = zx * fym;
            matArr[off]      = fxm * scale; matArr[off + 1]  = fym * scale; matArr[off + 2]  = fzm * scale; matArr[off + 3]  = 0;
            matArr[off + 4]  = yx * scale;  matArr[off + 5]  = yy * scale;  matArr[off + 6]  = yz * scale;  matArr[off + 7]  = 0;
            matArr[off + 8]  = zx * scale;  matArr[off + 9]  = 0;           matArr[off + 10] = zz * scale;  matArr[off + 11] = 0;
          } else {
            matArr[off]      = scale; matArr[off + 1]  = 0;     matArr[off + 2]  = 0;     matArr[off + 3]  = 0;
            matArr[off + 4]  = 0;     matArr[off + 5]  = scale; matArr[off + 6]  = 0;     matArr[off + 7]  = 0;
            matArr[off + 8]  = 0;     matArr[off + 9]  = 0;     matArr[off + 10] = scale; matArr[off + 11] = 0;
          }
          matArr[off + 12] = nx; matArr[off + 13] = ny; matArr[off + 14] = nz; matArr[off + 15] = 1;
        }
        schoolPanic = OC.lerp(schoolPanic, maxPanicTick, Math.min(1, stepDt * 3.5));
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
      key: opts.key || 'angelfish',
      getPosition: () => mesh.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 480) { mesh.visible = false; return; }
        mesh.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const camSpeed = ctx ? ctx.camSpeed : 0;
        const act = OC.lerp(0.55, 1.05, dayW);
        t += dt * act;

        // Любопытство ангелов: при спокойном зависании дайвера подплывают чуть ближе
        const dCam = Math.hypot(cx - camPos.x, cz - camPos.z);
        const curMix = (opts.curious && camSpeed < 4.0 && dCam < 28) ? 0.28 : 0.0;
        const targetCx = OC.lerp(cx, camPos.x, curMix);
        const targetCz = OC.lerp(cz, camPos.z, curMix);

        ang += (speed * act / r) * dir * dt;
        const rr = r + Math.sin(t * 0.35) * 2.5;
        const ax = targetCx + Math.cos(ang) * rr, az = targetCz + Math.sin(ang) * rr;
        const ay = Math.max(yBase + Math.sin(t * 0.5) * 1.8, biome.getHeight(ax, az) + 1.8);
        const ah = ang + 0.14 * dir;
        const bx = targetCx + Math.cos(ah) * rr, bz = targetCz + Math.sin(ah) * rr;
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

  /* ---------- Крылатка-зебра (Pterois volitans — ночной охотник) ---------- */
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
      key: 'lionfish',
      isNocturnalPredator: true,
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const nightAct = OC.lerp(1.55, 0.65, dayW);
        const effR = opts.r * OC.lerp(1.35, 0.75, dayW);
        t += dt * nightAct;
        ang += (0.85 * nightAct / effR) * dt;
        const ax = opts.cx + Math.cos(ang) * effR;
        const az = opts.cz + Math.sin(ang) * effR;
        const ay = Math.max(opts.y + Math.sin(t * 0.6) * 1.2, biome.getHeight(ax, az) + 1.4);
        const bx = opts.cx + Math.cos(ang + 0.15) * effR;
        const bz = opts.cz + Math.sin(ang + 0.15) * effR;
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
      key: isEagle ? 'ray_eagle' : 'ray_spotted',
      getPosition: () => group.position,
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
      key: 'manta',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 720) { group.visible = false; return; }
        group.visible = true;
        // Манты притормаживают и зависают на станциях чистки
        let spd = opts.speed || 4.2;
        let nearStation = false;
        const stations = ctx ? ctx.cleaningStations : null;
        if (stations) {
          for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            if (Math.hypot(group.position.x - st.x, group.position.z - st.z) < st.radius * 1.65) {
              spd *= 0.56;
              nearStation = true;
              break;
            }
          }
        }
        t += dt;
        ang += (spd / opts.r) * dt;
        // Фигура-восьмёрка вдоль стенки обрыва + выраженный крен в виражах
        const rr = opts.r + Math.sin(t * 0.22) * 18;
        const ax = opts.cx + Math.cos(ang) * rr * 0.78;
        const az = opts.cz + Math.sin(ang) * rr + Math.sin(ang * 2.0) * 14;
        const bx = opts.cx + Math.cos(ang + 0.12) * rr * 0.78;
        const bz = opts.cz + Math.sin(ang + 0.12) * rr + Math.sin((ang + 0.12) * 2.0) * 14;
        const ay = Math.max(opts.y + Math.sin(t * 0.3) * 6, biome.getHeight(ax, az) + 5);
        const by = Math.max(opts.y + Math.sin(t * 0.3 + 0.3) * 6, biome.getHeight(bx, bz) + 5);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        if (nearStation && ctx && ctx.cleanClients) ctx.cleanClients.push(group.position);
        group.lookAt(b);
        group.rotateZ(Math.cos(ang) * 0.22 + Math.sin(t * 0.3) * 0.12);
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
    let breathPhase = Math.random() * 34;
    const a = new T.Vector3(), b = new T.Vector3();

    function turtlePos(angVal, tVal, bPhase, out) {
      const rr = opts.r + Math.sin(tVal * 0.19) * 10;
      const x = opts.cx + Math.cos(angVal) * rr;
      const z = opts.cz + Math.sin(angVal) * rr + Math.sin(angVal * 2.0) * 8;
      // Периодическое всплытие на поверхность за воздухом (цикл ~34 с)
      const cyc = bPhase % 34.0;
      let surfW = 0;
      if (cyc > 26.0 && cyc < 33.5) {
        surfW = Math.sin(((cyc - 26.0) / 7.5) * Math.PI);
      }
      const grazeY = Math.max(opts.y + Math.sin(tVal * 0.3) * 3.5, biome.getHeight(x, z) + 2.2);
      const y = Math.min(-0.45, OC.lerp(grazeY, -0.5, surfW));
      return out.set(x, y, z);
    }

    return {
      key: 'turtle',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        let spd = OC.lerp(1.4, 2.2, dayW);
        let atClean = false;
        const stations = ctx ? ctx.cleaningStations : null;
        if (stations && dayW > 0.32) {
          for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            if (Math.hypot(group.position.x - st.x, group.position.z - st.z) < st.radius * 1.45) {
              spd *= 0.68;
              atClean = true;
              break;
            }
          }
        }
        t += dt;
        breathPhase += dt;
        ang += (spd / opts.r) * dt;
        turtlePos(ang, t, breathPhase, a);
        turtlePos(ang + 0.14, t + 0.4, breathPhase + 0.4, b);
        group.position.copy(a);
        if (atClean && ctx && ctx.cleanClients) ctx.cleanClients.push(group.position);
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
      key: 'dugong',
      getPosition: () => group.position,
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

  /* ---------- Рифовая, китовая, леопардовая и гренландская полярная акулы ---------- */
  function makeShark(scene, biome, opts) {
    const isWhale = !!opts.whaleShark;
    const isLeopard = opts.speciesKey === 'shark_leopard';
    const isGreenland = opts.speciesKey === 'shark_greenland';
    const len = isWhale ? 11.5 : (isGreenland ? 5.4 : (isLeopard ? 2.4 : 4.2));
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 18, 12);
    body.scale(len * (isGreenland ? 0.15 : 0.13), len * (isGreenland ? 0.16 : 0.14), len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5); // -1 хвост .. +1 нос
      const taper = t < 0 ? (1 - 0.78 * Math.pow(-t, 1.3)) : (1 - (isGreenland ? 0.22 : 0.32) * Math.pow(t, 2));
      const wideHead = (isWhale || isGreenland) && t > 0.5 ? 1.25 : 1.0;
      bp.setXYZ(i, x * taper * wideHead, y * taper * (isWhale ? 0.88 : 1), z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => {
      if (isWhale) {
        if (y < -0.1) { c.set(0xe4edf2); return; }
        const spot = Math.sin(x * 4.5) * Math.cos(z * 2.2);
        c.set(0x2a4054).lerp(new T.Color(0xddecf5), spot > 0.48 ? 0.92 : 0);
      } else if (isLeopard) {
        if (y < -0.06) { c.set(0xddd2b8); return; }
        const saddle = Math.sin(z * 5.2) * Math.cos(x * 5.5);
        c.set(0x9a8454).lerp(new T.Color(0x2d2416), saddle > 0.38 ? 0.85 : 0);
      } else if (isGreenland) {
        const mott = Math.sin(z * 3.1 + x * 4.2) * 0.06;
        c.set(y > -0.1 ? 0x3b3838 : 0x565252).offsetHSL(0, 0, mott);
      } else {
        c.set(y > -0.05 ? 0x5d6e7a : 0xdde6ea);
      }
    });
    group.add(new T.Mesh(body, creatureMat));

    // Спинной плавник
    const dorsal = new T.ConeGeometry(len * (isGreenland ? 0.07 : 0.11), len * (isGreenland ? 0.16 : 0.24), 4);
    dorsal.scale(0.25, 1, 1.1);
    OC.geoPrep(dorsal);
    OC.paint(dorsal, isWhale ? 0x2c4257 : (isLeopard ? 0x7a663e : (isGreenland ? 0x343131 : 0x455661)));
    const dorM = new T.Mesh(dorsal, creatureMat);
    dorM.position.set(0, len * 0.14, isGreenland ? -len * 0.04 : len * 0.04);
    dorM.rotation.x = -0.35;
    group.add(dorM);

    // Грудные плавники
    const pec = new T.ConeGeometry(len * 0.09, len * (isGreenland ? 0.20 : 0.28), 4);
    pec.scale(0.22, 1, 1);
    OC.geoPrep(pec);
    OC.paint(pec, isWhale ? 0x2a4054 : (isLeopard ? 0x857046 : (isGreenland ? 0x383535 : 0x52626d)));
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
    OC.paint(tailTop, isWhale ? 0x2a4054 : (isLeopard ? 0x524229 : (isGreenland ? 0x2e2a2a : 0x28323a)));
    const ttM = new T.Mesh(tailTop, creatureMat);
    ttM.position.set(0, len * 0.08, -len * 0.14);
    ttM.rotation.x = -0.6;
    const tailBot = new T.ConeGeometry(len * 0.06, len * 0.22, 4);
    tailBot.scale(0.2, 1, 0.8);
    OC.geoPrep(tailBot);
    OC.paint(tailBot, isWhale ? 0x2a4054 : (isLeopard ? 0x7c6840 : (isGreenland ? 0x3b3737 : 0x455661)));
    const tbM = new T.Mesh(tailBot, creatureMat);
    tbM.position.set(0, -len * 0.05, -len * 0.1);
    tbM.rotation.x = 2.4;
    tailPivot.add(ttM, tbM);
    group.add(tailPivot);

    const sKey = opts.speciesKey || (isWhale ? 'shark_whale' : 'shark_reef');
    group.userData.key = sKey;
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 100;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = new T.Vector3(), b = new T.Vector3();
    let inspectBlend = 0;
    let lungeTimer = 0;
    let lungeCooldown = 12 + Math.random() * 12;
    let lungeTarget = null;
    let lungeBlend = 0;

    return {
      key: sKey,
      isActivePredator: !isWhale,
      isHunting: () => lungeTimer > 0,
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 760) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const flashOn = ctx ? ctx.flashOn : false;
        const preyCenters = ctx ? ctx.preyCenters : null;
        const stations = ctx ? ctx.cleaningStations : null;
        const cleanClients = ctx ? ctx.cleanClients : null;
        const nightBoost = isWhale ? 1.0 : OC.lerp(1.22, 1.0, dayW);
        t += dt;

        // Охотничьи броски акул (рифовой, леопардовой, гренландской) на косяки рыб
        if (!isWhale && preyCenters && preyCenters.length) {
          if (lungeTimer > 0) {
            lungeTimer -= dt;
            if (lungeTarget && group.position.distanceTo(lungeTarget) < 6.5) {
              lungeTimer = 0;
              lungeCooldown = 18 + Math.random() * 12;
            }
          } else {
            lungeCooldown -= dt;
            if (lungeCooldown <= 0) {
              let bestD = 138;
              let bestP = null;
              for (let p = 0; p < preyCenters.length; p++) {
                const pr = preyCenters[p];
                if (pr.y > -2.5) continue;
                const d = Math.hypot(pr.x - group.position.x, pr.z - group.position.z);
                if (d < bestD) { bestD = d; bestP = pr; }
              }
              if (bestP) {
                lungeTarget = bestP;
                lungeTimer = 4.6;
              }
              lungeCooldown = 16 + Math.random() * 12;
            }
          }
        }
        lungeBlend += ((lungeTimer > 0 && lungeTarget ? 1 : 0) - lungeBlend) * Math.min(1, dt * 2.4);

        // Любопытный осмотр дайвера, если нет активного броска на косяк
        const dCam = Math.hypot(camPos.x - opts.cx, camPos.z - opts.cz);
        const wantInspect = !isWhale && lungeTimer <= 0 && dCam < opts.r + 36 && camPos.y < -3.0;
        inspectBlend += ((wantInspect ? (flashOn ? 0.55 : 0.35) : 0) - inspectBlend) * Math.min(1, dt * 1.2);

        // Станция чистки для рифовых акул
        let atClean = false;
        if (!isWhale && lungeTimer <= 0 && stations && dayW > 0.32) {
          for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            if (Math.hypot(group.position.x - st.x, group.position.z - st.z) < st.radius * 1.35) {
              atClean = true;
              if (cleanClients) cleanClients.push(group.position);
              break;
            }
          }
        }

        const speedMult = (lungeTimer > 0 ? 2.15 : (atClean ? 0.65 : 1.0)) * nightBoost;
        ang += ((opts.speed * speedMult) / opts.r) * dir * dt;

        let patCx = OC.lerp(opts.cx, camPos.x, inspectBlend);
        let patCz = OC.lerp(opts.cz, camPos.z, inspectBlend);
        let patR = OC.lerp(opts.r + Math.sin(t * 0.18) * 14, 18.0, inspectBlend);
        if (lungeBlend > 0.02 && lungeTarget) {
          patCx = OC.lerp(patCx, lungeTarget.x, lungeBlend);
          patCz = OC.lerp(patCz, lungeTarget.z, lungeBlend);
          patR = OC.lerp(patR, 5.5, lungeBlend);
        }

        const ax = patCx + Math.cos(ang) * patR * 0.85;
        const az = patCz + Math.sin(ang) * patR + Math.sin(ang * 2.0) * (isWhale ? 16 : 10) * (1 - Math.max(inspectBlend, lungeBlend));
        const bx = patCx + Math.cos(ang + 0.1 * dir) * patR * 0.85;
        const bz = patCz + Math.sin(ang + 0.1 * dir) * patR + Math.sin((ang + 0.1 * dir) * 2.0) * (isWhale ? 16 : 10) * (1 - Math.max(inspectBlend, lungeBlend));
        let baseY = OC.lerp(opts.y + Math.sin(t * 0.24) * 5, Math.min(-4, camPos.y + 1.5), inspectBlend);
        if (lungeBlend > 0.02 && lungeTarget) {
          baseY = OC.lerp(baseY, lungeTarget.y, lungeBlend);
        }
        const ay = Math.max(baseY, biome.getHeight(ax, az) + 4);
        const by = Math.max(baseY + Math.sin(t * 0.24 + 0.2) * 1.5, biome.getHeight(bx, bz) + 4);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        const wagFreq = (isWhale ? 1.5 : (isGreenland ? 1.65 : 3.2)) * (lungeTimer > 0 ? 1.75 : 1.0);
        tailPivot.rotation.y = Math.sin(time * wagFreq + t) * 0.34;
        group.rotation.y += Math.sin(time * wagFreq + t) * 0.04;
      }
    };
  }

  /* ---------- Горбатый кит (Megaptera novaeangliae) с эффектным выпрыгом (breach) ---------- */
  function makeHumpbackWhale(scene, biome, opts, onSplash) {
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

    let ang = 0.6, t = 28.0; // начинает ближе к циклу зрелищного выпрыгивания
    let prevY = -12;
    let breachingNow = false;
    const a = new T.Vector3(), b = new T.Vector3();

    function whalePos(angVal, tVal, out) {
      // Длинный эллиптический ход вдоль внешней стены + периодическое всплытие и выпрыгивание (breach)
      const ax = opts.cx + Math.cos(angVal) * opts.r * 0.65;
      const az = opts.cz + Math.sin(angVal) * opts.r * 1.45;
      const cyc = tVal % 58.0;
      const deepY = Math.max(opts.y + Math.sin(tVal * 0.14) * 10, biome.getHeight(ax, az) + 12);
      let y;
      if (cyc > 34.0 && cyc < 41.5) {
        // Мощный разгон и выпрыг над водной гладью (+7.8 м)
        const u = (cyc - 34.0) / 7.5;
        const arc = Math.sin(u * Math.PI);
        y = OC.lerp(Math.min(-18, deepY), 7.8, arc * arc * 0.85 + arc * 0.15);
      } else if (cyc > 46.0 && cyc < 56.0) {
        const breathRise = Math.sin(((cyc - 46.0) / 10.0) * Math.PI);
        y = Math.min(-3.4, OC.lerp(deepY, -3.8, breathRise));
      } else {
        y = Math.min(-3.4, deepY);
      }
      return out.set(ax, y, az);
    }

    return {
      key: 'whale_humpback',
      isBreaching: () => breachingNow || group.position.y > -0.6,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 950) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        const cyc = t % 58.0;
        const inBreach = cyc > 34.0 && cyc < 41.5;
        ang += ((opts.speed * (inBreach ? 1.45 : 1.0)) / opts.r) * dt;
        whalePos(ang, t, a);
        whalePos(ang + 0.08, t + 1.0, b);
        group.position.copy(a);
        group.lookAt(b);
        if (inBreach && a.y > -2.5) {
          const u = OC.clamp((cyc - 34.0) / 7.5, 0, 1);
          group.rotateZ(u * Math.PI * 1.45); // зрелищный разворот туловища в воздухе
          breachingNow = a.y > 0.0;
        } else {
          breachingNow = false;
        }
        if (onSplash) {
          if (prevY <= 0.15 && a.y > 0.15) onSplash(a, 0.7);
          else if (prevY >= 0.15 && a.y < 0.15) onSplash(a, 1.0);
        }
        prevY = a.y;
        tailPivot.rotation.x = Math.sin(time * (inBreach ? 1.85 : 0.95)) * 0.34;
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
    let spook = 0;
    return {
      key: 'octopus',
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.x - camPos.x, opts.z - camPos.z) > 400) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const camSpeed = ctx ? ctx.camSpeed : 0;
        const dCam = Math.hypot(group.position.x - camPos.x, group.position.z - camPos.z);
        if (dCam < 8.5 && camSpeed > 4.0) spook = Math.min(1, spook + dt * 3.0);
        else spook = Math.max(0, spook - dt * 0.6);

        t += dt * OC.lerp(1.25, 0.9, dayW) * (1 + spook * 1.8);
        const wx = opts.x + Math.sin(t * 0.42) * 3.4 + Math.cos(t * 0.19) * 1.5;
        const wz = opts.z + Math.cos(t * 0.36) * 3.4 + Math.sin(t * 0.23) * 1.5;
        const wy = biome.getHeight(wx, wz) + 0.55 + Math.abs(Math.sin(t * (0.9 + spook))) * (0.7 + spook * 1.1);
        group.position.set(wx, wy, wz);
        group.rotation.y = t * (0.3 + spook * 0.4);
        for (let i = 0; i < arms.length; i++) {
          arms[i].rotation.z = Math.sin(time * (2.5 + spook * 4.0) + i) * (0.12 + spook * 0.14);
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
    let ang = Math.random() * 6.28, t = Math.random() * 50, retract = 0;
    return {
      key: 'moray',
      isNocturnalPredator: true,
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.x - camPos.x, opts.z - camPos.z) > 400) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const camSpeed = ctx ? ctx.camSpeed : 0;
        const flashOn = ctx ? ctx.flashOn : false;
        const dCam = Math.hypot(opts.x - camPos.x, opts.z - camPos.z);
        const threat = dCam < 9.5 && (camSpeed > 3.5 || flashOn || dCam < 5.5);
        retract += ((threat ? 1 : 0) - retract) * Math.min(1, dt * 3.5);

        const act = OC.lerp(1.5, 0.72, dayW);
        const orbitR = OC.lerp(5.2, 2.2, dayW) * (1 - retract * 0.85);
        t += dt * act;
        ang += 0.28 * act * dt;
        group.position.set(opts.x + Math.cos(ang) * orbitR, baseY - retract * 0.48, opts.z + Math.sin(ang) * orbitR);
        group.rotation.y = -ang;
        for (let i = 0; i < segMeshes.length; i++) {
          segMeshes[i].position.x = Math.sin(time * 3.5 - i * 0.55) * 0.18 * (1 - retract * 0.5);
        }
      }
    };
  }

  /* ---------- Калифорнийский морской лев (Zalophus californianus) ---------- */
  function makeSeaLion(scene, biome, opts, onSplash) {
    const group = new T.Group();
    const body = new T.SphereGeometry(1, 14, 10);
    body.scale(0.46, 0.44, 1.55);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / 1.55;
      const tap = t < 0 ? (1 - 0.65 * Math.pow(-t, 1.4)) : (1 - 0.42 * Math.pow(t, 2));
      bp.setXYZ(i, x * tap, y * tap, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => c.set(y > -0.05 ? 0x6c4c34 : 0x9b7552));
    group.add(new T.Mesh(body, creatureMat));

    const snout = new T.ConeGeometry(0.24, 0.62, 8);
    snout.rotateX(Math.PI / 2);
    OC.geoPrep(snout);
    OC.paint(snout, 0x5c3e28);
    const snM = new T.Mesh(snout, creatureMat);
    snM.position.set(0, 0.08, 1.62);
    group.add(snM);

    const fFlips = [];
    const fg = new T.SphereGeometry(1, 8, 5);
    fg.scale(0.75, 0.08, 0.28);
    OC.geoPrep(fg);
    OC.paint(fg, 0x422d1d);
    for (const s of [-1, 1]) {
      const m = new T.Mesh(fg, creatureMat);
      m.position.set(s * 0.62, -0.15, 0.48);
      group.add(m);
      fFlips.push({ m, s });
    }
    const hind = new T.ConeGeometry(0.32, 0.78, 4);
    hind.scale(1.1, 1, 0.25);
    hind.rotateX(-Math.PI / 2);
    OC.geoPrep(hind);
    OC.paint(hind, 0x422d1d);
    const hindM = new T.Mesh(hind, creatureMat);
    hindM.position.set(0, 0, -1.68);
    group.add(hindM);

    group.scale.setScalar(opts.scale || 1.0);
    group.userData.key = 'sea_lion';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 60, prevY = -4;
    let porpoising = false;
    const a = new T.Vector3(), b = new T.Vector3();
    function posAt(angV, tV, out) {
      const rr = opts.r + Math.sin(tV * 0.55) * 9;
      const x = opts.cx + Math.cos(angV) * rr;
      const z = opts.cz + Math.sin(angV) * rr + Math.sin(angV * 2.0) * 6;
      const cyc = tV % 22.0;
      let y;
      if (!biome.noSurface && cyc > 16.5 && cyc < 20.5) {
        const u = (cyc - 16.5) / 4.0;
        const jump = Math.sin(u * Math.PI);
        y = OC.lerp(Math.max(opts.y, biome.getHeight(x, z) + 2.4), 1.45, jump);
      } else {
        y = Math.min(-1.0, Math.max(opts.y + Math.sin(tV * 0.85) * 4.5, biome.getHeight(x, z) + 2.4));
      }
      return out.set(x, y, z);
    }

    return {
      key: 'sea_lion',
      isPorpoising: () => porpoising,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 5.2) / opts.r) * dt;
        posAt(ang, t, a);
        posAt(ang + 0.14, t + 0.25, b);
        group.position.copy(a);
        group.lookAt(b);
        porpoising = a.y > -0.25;
        if (onSplash) {
          if (prevY <= 0.05 && a.y > 0.05) onSplash(a, 0.35);
          else if (prevY >= 0.05 && a.y < 0.05) onSplash(a, 0.42);
        }
        prevY = a.y;
        group.rotateZ(Math.sin(t * 0.9) * 0.42); // игривые бочки между ламинарией
        const stroke = Math.sin(time * 4.2);
        for (const f of fFlips) f.m.rotation.z = f.s * stroke * 0.65;
        hindM.rotation.x = Math.sin(time * 4.2 + 0.8) * 0.35;
      }
    };
  }

  /* ---------- Глубоководный морской чёрт (Melanocetus) ---------- */
  function makeAnglerfish(scene, biome, opts) {
    const group = new T.Group();
    const body = new T.SphereGeometry(0.75, 14, 10);
    body.scale(0.82, 0.88, 1.18);
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.set(y > 0 ? 0x1a151c : 0x2c2228));
    group.add(new T.Mesh(body, creatureMat));

    // Огромная нижняя челюсть с зубами
    const jaw = new T.TorusGeometry(0.45, 0.08, 5, 10, Math.PI);
    OC.geoPrep(jaw);
    OC.paint(jaw, 0x352a32);
    const jawM = new T.Mesh(jaw, creatureMat);
    jawM.position.set(0, -0.22, 0.64);
    jawM.rotation.x = Math.PI * 0.65;
    group.add(jawM);

    // Иллиций (удочка) и биолюминесцентная приманка-эска
    const rodPts = [new T.Vector3(0, 0.55, 0.35), new T.Vector3(0, 1.05, 0.95), new T.Vector3(0, 0.42, 1.38)];
    const rod = new T.TubeGeometry(new T.CatmullRomCurve3(rodPts), 8, 0.025, 5, false);
    OC.geoPrep(rod);
    OC.paint(rod, 0x3a3542);
    group.add(new T.Mesh(rod, creatureMat));

    const lureMat = new T.MeshBasicMaterial({ color: 0x62fff0 });
    const lure = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), lureMat);
    lure.position.set(0, 0.4, 1.38);
    group.add(lure);

    const tail = new T.ConeGeometry(0.35, 0.72, 4);
    tail.scale(0.24, 1, 1);
    tail.rotateX(-Math.PI / 2);
    OC.geoPrep(tail);
    OC.paint(tail, 0x241d26);
    const tM = new T.Mesh(tail, creatureMat);
    tM.position.set(0, 0, -1.05);
    group.add(tM);

    group.scale.setScalar(opts.scale || 1.25);
    group.userData.key = 'fish_angler';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 40;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'fish_angler',
      isActivePredator: true,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 480) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 1.2) / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r, az = opts.cz + Math.sin(ang) * opts.r;
        const bx = opts.cx + Math.cos(ang + 0.1) * opts.r, bz = opts.cz + Math.sin(ang + 0.1) * opts.r;
        const ay = Math.max(opts.y + Math.sin(t * 0.4) * 2.5, biome.getHeight(ax, az) + 2.6);
        const by = Math.max(opts.y + Math.sin(t * 0.4 + 0.2) * 2.5, biome.getHeight(bx, bz) + 2.6);
        a.set(ax, ay, az);
        b.set(bx, by, bz);
        group.position.copy(a);
        group.lookAt(b);
        lure.position.y = 0.4 + Math.sin(time * 3.1) * 0.08;
        lureMat.color.setHSL(0.47, 0.95, 0.56 + 0.22 * Math.sin(time * 4.5));
        tM.rotation.y = Math.sin(time * 2.4) * 0.3;
      }
    };
  }

  /* ---------- Глубоководный абиссальный кальмар ---------- */
  function makeAbyssalSquid(scene, biome, opts) {
    const group = new T.Group();
    const mantle = new T.ConeGeometry(0.46, 2.2, 10);
    mantle.rotateX(Math.PI / 2);
    OC.geoPrep(mantle);
    OC.paint(mantle, (x, y, z, c) => c.set(z > 0 ? 0x691828 : 0x451220));
    group.add(new T.Mesh(mantle, creatureMat));

    const fins = new T.ConeGeometry(0.75, 0.95, 4);
    fins.scale(1.1, 0.12, 1);
    fins.rotateX(-Math.PI / 2);
    OC.geoPrep(fins);
    OC.paint(fins, 0x8c283c);
    const finM = new T.Mesh(fins, creatureMat);
    finM.position.set(0, 0, -0.82);
    group.add(finM);

    const armsPivot = new T.Group();
    armsPivot.position.set(0, 0, 1.05);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const arm = new T.ConeGeometry(0.065, i < 2 ? 1.9 : 1.1, 4);
      arm.rotateX(Math.PI / 2);
      OC.geoPrep(arm);
      OC.paint(arm, 0x721c2e);
      const am = new T.Mesh(arm, creatureMat);
      am.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, i < 2 ? 0.85 : 0.45);
      armsPivot.add(am);
    }
    group.add(armsPivot);

    // Светящиеся фотофоры вдоль мантии
    const photMat = new T.MeshBasicMaterial({ color: 0x4df4ff });
    for (const s of [-1, 1]) {
      const dot = new T.Mesh(new T.SphereGeometry(0.06, 5, 4), photMat);
      dot.position.set(s * 0.28, 0.12, 0.1);
      group.add(dot);
    }

    group.scale.setScalar(opts.scale || 1.1);
    group.userData.key = 'squid_abyssal';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 60;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'squid_abyssal',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 540) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 2.8) / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r, az = opts.cz + Math.sin(ang) * opts.r;
        const bx = opts.cx + Math.cos(ang + 0.1) * opts.r, bz = opts.cz + Math.sin(ang + 0.1) * opts.r;
        const ay = Math.max(opts.y + Math.sin(t * 0.35) * 5, biome.getHeight(ax, az) + 4);
        const by = Math.max(opts.y + Math.sin(t * 0.35 + 0.2) * 5, biome.getHeight(bx, bz) + 4);
        a.set(ax, ay, az);
        b.set(bx, by, bz);
        group.position.copy(a);
        group.lookAt(b);
        finM.rotation.z = Math.sin(time * 2.6) * 0.28;
        armsPivot.rotation.x = Math.sin(time * 2.0) * 0.14;
      }
    };
  }

  /* ---------- Гримпотевтис / осьминог Дамбо (Grimpoteuthis) ---------- */
  function makeDumboOctopus(scene, biome, opts) {
    const group = new T.Group();
    const bell = new T.SphereGeometry(0.65, 12, 10);
    bell.scale(0.9, 1.15, 0.9);
    OC.geoPrep(bell);
    OC.paint(bell, (x, y, z, c) => c.set(y > 0 ? 0xd9a8c4 : 0xbd7fa8));
    const bM = new T.Mesh(bell, creatureMat);
    bM.position.y = 0.25;
    group.add(bM);

    const ears = [];
    const earG = new T.SphereGeometry(0.32, 7, 5);
    earG.scale(1.6, 0.2, 0.75);
    OC.geoPrep(earG);
    OC.paint(earG, 0xe8bcd4);
    for (const s of [-1, 1]) {
      const em = new T.Mesh(earG, creatureMat);
      em.position.set(s * 0.62, 0.55, 0);
      group.add(em);
      ears.push({ em, s });
    }

    const skirt = new T.ConeGeometry(0.68, 0.55, 8);
    OC.geoPrep(skirt);
    OC.paint(skirt, 0xc789b0);
    const skM = new T.Mesh(skirt, creatureMat);
    skM.position.y = -0.22;
    group.add(skM);

    group.scale.setScalar(opts.scale || 1.1);
    group.userData.key = 'octopus_dumbo';
    scene.add(group);

    let t = Math.random() * 40;
    return {
      key: 'octopus_dumbo',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.x - camPos.x, opts.z - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        const wx = opts.x + Math.sin(t * 0.28) * 5.5;
        const wz = opts.z + Math.cos(t * 0.24) * 5.5;
        const wy = biome.getHeight(wx, wz) + 2.2 + Math.sin(t * 0.8) * 1.4;
        group.position.set(wx, wy, wz);
        group.rotation.y = t * 0.35;
        const flap = Math.sin(time * 2.1);
        for (const e of ears) e.em.rotation.z = e.s * flap * 0.55;
      }
    };
  }

  /* ---------- Белуха (Delphinapterus leucas) ---------- */
  function makeBeluga(scene, biome, opts, onSplash) {
    const len = opts.len || 4.8;
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 16, 12);
    body.scale(len * 0.145, len * 0.145, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5);
      const taper = t < 0 ? (1 - 0.78 * Math.pow(-t, 1.35)) : (1 - 0.25 * Math.pow(t, 2.2));
      bp.setXYZ(i, x * taper, y * taper, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => c.set(y > -0.1 ? 0xf2f7fa : 0xdde8ef));
    group.add(new T.Mesh(body, creatureMat));

    // Характерный лобный выступ «мелон»
    const melon = new T.SphereGeometry(len * 0.088, 10, 8);
    melon.scale(0.95, 0.92, 1.15);
    OC.geoPrep(melon);
    OC.paint(melon, 0xf6fafd);
    const mMesh = new T.Mesh(melon, creatureMat);
    mMesh.position.set(0, len * 0.045, len * 0.36);
    group.add(mMesh);

    const pec = new T.SphereGeometry(1, 8, 6);
    pec.scale(0.55, 0.08, 0.35);
    OC.geoPrep(pec);
    OC.paint(pec, 0xe8f0f5);
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, creatureMat);
      pm.position.set(s * 0.65, -0.22, 0.75);
      pm.rotation.y = -s * 0.35;
      pm.rotation.z = -s * 0.22;
      group.add(pm);
    }

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.45);
    const fluke = new T.ConeGeometry(0.75, 0.85, 4);
    fluke.scale(1.4, 1, 0.16);
    fluke.rotateX(Math.PI / 2);
    OC.geoPrep(fluke);
    OC.paint(fluke, 0xd8e4ec);
    const fkM = new T.Mesh(fluke, creatureMat);
    fkM.position.set(0, 0, -0.42);
    tailPivot.add(fkM);
    group.add(tailPivot);

    group.scale.setScalar(opts.scale || 1.0);
    group.userData.key = 'beluga';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 40, prevY = -5;
    let porpoising = false;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'beluga',
      isPorpoising: () => porpoising,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 640) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 4.8) / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r;
        const az = opts.cz + Math.sin(ang) * opts.r + Math.sin(ang * 2.0) * 14;
        const bx = opts.cx + Math.cos(ang + 0.1) * opts.r;
        const bz = opts.cz + Math.sin(ang + 0.1) * opts.r + Math.sin((ang + 0.1) * 2.0) * 14;
        const cyc = t % 28.0;
        const clearIce = !biome.getIceMaskAt || biome.getIceMaskAt(ax, az) < 0.35;
        let ay, by;
        if (clearIce && cyc > 22.0 && cyc < 25.2) {
          const u = (cyc - 22.0) / 3.2;
          const arc = Math.sin(u * Math.PI);
          ay = OC.lerp(-2.5, 1.35, arc);
          by = OC.lerp(-2.5, 1.35, Math.sin(Math.min(1, u + 0.08) * Math.PI));
        } else {
          const breath = Math.sin(t * 0.28) > 0.78 ? 1.0 : 0.0;
          ay = Math.min(-1.5, Math.max(OC.lerp(opts.y + Math.sin(t * 0.45) * 3.0, -1.6, breath), biome.getHeight(ax, az) + 2.8));
          by = Math.min(-1.5, Math.max(OC.lerp(opts.y + Math.sin(t * 0.45 + 0.15) * 3.0, -1.6, breath), biome.getHeight(bx, bz) + 2.8));
        }
        a.set(ax, ay, az);
        b.set(bx, by, bz);
        group.position.copy(a);
        group.lookAt(b);
        porpoising = a.y > -0.25;
        if (onSplash) {
          if (prevY <= 0.05 && a.y > 0.05) onSplash(a, 0.38);
          else if (prevY >= 0.05 && a.y < 0.05) onSplash(a, 0.46);
        }
        prevY = a.y;
        tailPivot.rotation.x = Math.sin(time * 2.4 + t) * 0.36;
      }
    };
  }

  /* ---------- Нарвал (Monodon monoceros) с длинным спиральным бивнем ---------- */
  function makeNarwhal(scene, biome, opts) {
    const len = opts.len || 5.0;
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 16, 12);
    body.scale(len * 0.135, len * 0.135, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = z / (len * 0.5);
      const taper = t < 0 ? (1 - 0.80 * Math.pow(-t, 1.35)) : (1 - 0.28 * Math.pow(t, 2.2));
      bp.setXYZ(i, x * taper, y * taper, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => {
      if (y < -0.1) { c.set(0xe4edf2); return; }
      const spot = Math.sin(x * 5.2 + z * 3.1) * Math.cos(z * 4.4);
      c.set(0x4c5d6b).lerp(new T.Color(0xd2dee6), spot > 0.22 ? 0.72 : 0.15);
    });
    group.add(new T.Mesh(body, creatureMat));

    // Знаменитый спиральный бивень-клык нарвала (2.4 м)
    const tusk = new T.ConeGeometry(0.068, 2.5, 8, 6);
    tusk.rotateX(Math.PI / 2);
    const tp = tusk.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const vx = tp.getX(i), vy = tp.getY(i), vz = tp.getZ(i);
      const ang = vz * 8.0;
      const rib = 1 + 0.12 * Math.sin(ang + Math.atan2(vy, vx) * 2.0);
      tp.setXYZ(i, vx * rib, vy * rib, vz);
    }
    OC.geoPrep(tusk);
    tusk.computeVertexNormals();
    OC.paint(tusk, (x, y, z, c) => c.set(0xdfe2d2).lerp(new T.Color(0xf8f9f0), OC.clamp(z * 0.35 + 0.5, 0, 1)));
    const tuskM = new T.Mesh(tusk, creatureMat);
    tuskM.position.set(-0.04, 0.04, len * 0.46 + 1.15);
    group.add(tuskM);

    const pec = new T.SphereGeometry(1, 8, 6);
    pec.scale(0.55, 0.08, 0.32);
    OC.geoPrep(pec);
    OC.paint(pec, 0x3f4e5c);
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, creatureMat);
      pm.position.set(s * 0.62, -0.2, 0.8);
      pm.rotation.y = -s * 0.35;
      pm.rotation.z = -s * 0.2;
      group.add(pm);
    }

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.45);
    const fluke = new T.ConeGeometry(0.82, 0.9, 4);
    fluke.scale(1.4, 1, 0.16);
    fluke.rotateX(Math.PI / 2);
    OC.geoPrep(fluke);
    OC.paint(fluke, 0x3b4956);
    const fkM = new T.Mesh(fluke, creatureMat);
    fkM.position.set(0, 0, -0.45);
    tailPivot.add(fkM);
    group.add(tailPivot);

    group.scale.setScalar(opts.scale || 1.0);
    group.userData.key = 'narwhal';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 40;
    const a = new T.Vector3(), b = new T.Vector3();
    return {
      key: 'narwhal',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 680) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += ((opts.speed || 4.6) / opts.r) * dt;
        const ax = opts.cx + Math.cos(ang) * opts.r;
        const az = opts.cz + Math.sin(ang) * opts.r * 1.3;
        const bx = opts.cx + Math.cos(ang + 0.09) * opts.r;
        const bz = opts.cz + Math.sin(ang + 0.09) * opts.r * 1.3;
        const ay = Math.max(opts.y + Math.sin(t * 0.24) * 7.0, biome.getHeight(ax, az) + 3.5);
        const by = Math.max(opts.y + Math.sin(t * 0.24 + 0.14) * 7.0, biome.getHeight(bx, bz) + 3.5);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        tailPivot.rotation.x = Math.sin(time * 2.2 + t) * 0.34;
      }
    };
  }

  /* ---------- Волосистая цианея (Cyanea capillata — гигантская арктическая медуза) ---------- */
  function makeArcticJelly(scene, opts) {
    const group = new T.Group();
    const bellGeo = new T.SphereGeometry(1.15, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
    OC.geoPrep(bellGeo);
    const bellMat = new T.MeshStandardMaterial({
      color: 0xc84e24,
      emissive: new T.Color(0x88240c),
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.78,
      roughness: 0.28,
      side: T.DoubleSide
    });
    group.add(new T.Mesh(bellGeo, bellMat));

    const tentMat = new T.MeshBasicMaterial({ color: 0xff9a44, transparent: true, opacity: 0.62 });
    const tents = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 0.35 + (i % 3) * 0.24;
      const pts = [];
      for (let s = 0; s <= 5; s++) {
        const u = s / 5;
        pts.push(new T.Vector3(Math.cos(a) * r * (1 + u * 0.4), -u * 3.8, Math.sin(a) * r * (1 + u * 0.4)));
      }
      const tg = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 8, 0.032, 4, false);
      const tm = new T.Mesh(tg, tentMat);
      group.add(tm);
      tents.push(tm);
    }

    group.scale.setScalar(opts.scale || 1.25);
    group.position.set(opts.cx, opts.y, opts.cz);
    group.userData.key = 'jelly_arctic';
    scene.add(group);

    const ph = Math.random() * 6.28;
    return {
      key: 'jelly_arctic',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 460) { group.visible = false; return; }
        group.visible = true;
        const pulse = Math.sin(time * 1.45 + ph);
        group.position.x = opts.cx + Math.sin(time * 0.16 + ph) * 8;
        group.position.z = opts.cz + Math.cos(time * 0.14 + ph) * 8;
        group.position.y = opts.y + Math.sin(time * 0.28 + ph) * (opts.amp || 2.8) + pulse * 0.3;
        group.scale.set(
          (opts.scale || 1.25) * (1 - pulse * 0.08),
          (opts.scale || 1.25) * (1 + pulse * 0.11),
          (opts.scale || 1.25) * (1 - pulse * 0.08)
        );
        for (let i = 0; i < tents.length; i++) {
          tents[i].rotation.z = Math.sin(time * 1.2 + i * 0.5) * 0.09;
        }
      }
    };
  }

  /* ---------- Морской ангел (Clione limacina) — светящийся арктический крылоногий моллюск ---------- */
  function makeClione(scene, opts) {
    const group = new T.Group();
    const n = opts.n || 10;
    const bodyMat = new T.MeshBasicMaterial({ color: 0xff8ed4, transparent: true, opacity: 0.72 });
    const coreMat = new T.MeshBasicMaterial({ color: 0xff5a18 });
    const wingGeo = new T.SphereGeometry(0.18, 6, 4);
    wingGeo.scale(1.6, 0.14, 0.8);
    const bodyGeo = new T.ConeGeometry(0.14, 0.62, 8);
    bodyGeo.rotateX(Math.PI);
    const coreGeo = new T.SphereGeometry(0.08, 6, 4);

    const units = [];
    const rng = OC.mulberry32(Math.abs(Math.round(opts.cx * 17 + opts.cz * 31)) + 9);
    for (let i = 0; i < n; i++) {
      const u = new T.Group();
      u.add(new T.Mesh(bodyGeo, bodyMat));
      const cm = new T.Mesh(coreGeo, coreMat);
      cm.position.y = 0.08;
      u.add(cm);
      const lw = new T.Mesh(wingGeo, bodyMat);
      lw.position.set(-0.16, 0.1, 0);
      const rw = new T.Mesh(wingGeo, bodyMat);
      rw.position.set(0.16, 0.1, 0);
      u.add(lw, rw);
      u.scale.setScalar(opts.singlePreview ? 1.5 : OC.lerp(0.85, 1.35, rng()));
      u.userData.key = 'clione_angel';
      group.add(u);
      units.push({
        u, lw, rw, ph: rng() * 6.28,
        ox: opts.singlePreview ? 0 : (rng() - 0.5) * 14,
        oy: opts.singlePreview ? 0 : (rng() - 0.5) * 8,
        oz: opts.singlePreview ? 0 : (rng() - 0.5) * 14
      });
    }
    group.position.set(opts.cx, opts.y, opts.cz);
    group.userData.key = 'clione_angel';
    scene.add(group);

    return {
      key: 'clione_angel',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        for (let i = 0; i < units.length; i++) {
          const it = units[i];
          const flap = Math.sin(time * 5.2 + it.ph) * 0.72;
          it.lw.rotation.z = flap;
          it.rw.rotation.z = -flap;
          it.u.position.set(
            it.ox + Math.sin(time * 0.45 + it.ph) * 2.4,
            it.oy + Math.cos(time * 0.55 + it.ph) * 1.6,
            it.oz + Math.cos(time * 0.42 + it.ph) * 2.4
          );
          it.u.rotation.y = time * 0.35 + it.ph;
        }
      }
    };
  }

  /* ---------- Затонувшее научно-грузовое судно «SS Maru» (Искусственный риф) ---------- */
  function makeShipwreck(scene, biome, opts) {
    const len = opts.len || 66;
    const beam = opts.beam || 10.6;
    const hullH = opts.hullH || 6.6;
    const group = new T.Group();
    const parts = [];

    function paintSteel(g, rustBias) {
      OC.geoPrep(g);
      const rb = rustBias || 0.45;
      OC.paint(g, (x, y, z, c) => {
        const rust = Math.sin(x * 0.65 + y * 1.1 + z * 0.32) * Math.cos(z * 0.48 - y * 0.8) * 0.5 + 0.5;
        const moss = Math.sin(x * 1.3 - z * 0.55) * 0.5 + 0.5;
        c.set(0x28363c).lerp(new T.Color(0x8c3c1e), OC.clamp(rust * rb + 0.15, 0, 0.85));
        if (y > 1.0 && moss > 0.55) c.lerp(new T.Color(0x42664a), 0.36);
      });
      parts.push(g);
      return g;
    }

    // 1. Основной корпус судна с острым форштевнем (нос +Z), поджатой кормой (-Z) и развалом бортов
    const hullGeo = new T.BoxGeometry(beam, hullH, len, 8, 5, 22);
    const hp = hullGeo.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
      const u = OC.clamp(z / (len * 0.5), -1, 1); // -1 корма .. +1 нос
      const v = OC.clamp((y + hullH * 0.5) / hullH, 0, 1); // 0 киль .. 1 палуба
      let wScale = 1.0;
      if (u > 0.28) {
        const bt = OC.clamp((u - 0.28) / 0.72, 0, 1);
        wScale = Math.max(0.03, Math.pow(Math.max(0, 1 - bt), 1.45));
      } else if (u < -0.58) {
        const st = OC.clamp((-u - 0.58) / 0.42, 0, 1);
        wScale = 1 - 0.58 * st * st;
      }
      const flare = 0.62 + 0.38 * Math.pow(v, 0.7);
      // Седловатость (sheer): нос и корма чуть приподняты, центр палубы немного вогнут
      const sheer = (u > 0.3 ? Math.pow((u - 0.3) / 0.7, 2) * 1.85 : 0) + (u < -0.5 ? Math.pow((-u - 0.5) / 0.5, 2) * 0.85 : 0);
      // Углубление открытых грузовых трюмов в мидшипе сверху
      let deckDip = 0;
      if (v > 0.85 && u > -0.18 && u < 0.46 && Math.abs(x) < beam * 0.32) {
        deckDip = -2.2;
      }
      x *= wScale * flare;
      y += sheer * v + deckDip;
      hp.setXYZ(i, x, y, z);
    }
    hullGeo.computeVertexNormals();
    paintSteel(hullGeo, 0.58);

    // 2. Фальшборт и комингс грузового трюма
    for (const s of [-1, 1]) {
      const bulwark = new T.BoxGeometry(0.45, 1.15, len * 0.62, 1, 1, 8);
      OC.xform(paintSteel(bulwark, 0.65), { p: [s * (beam * 0.47), hullH * 0.5 + 0.45, -len * 0.04] });
    }
    const coaming = new T.BoxGeometry(beam * 0.66, 0.9, len * 0.28);
    OC.xform(paintSteel(coaming, 0.72), { p: [0, hullH * 0.5 + 0.35, len * 0.14] });

    // 3. Кормовая капитанская надстройка (мостик, открытые иллюминаторы, крыша)
    const bridgeBase = new T.BoxGeometry(beam * 0.72, 3.8, len * 0.22);
    OC.xform(paintSteel(bridgeBase, 0.38), { p: [0, hullH * 0.5 + 1.85, -len * 0.22] });

    const wheelhouse = new T.BoxGeometry(beam * 0.56, 2.7, len * 0.12);
    OC.xform(paintSteel(wheelhouse, 0.34), { p: [0, hullH * 0.5 + 4.9, -len * 0.20] });

    const wheelRim = new T.TorusGeometry(0.82, 0.09, 6, 12);
    OC.xform(paintSteel(wheelRim, 0.25), { p: [0, hullH * 0.5 + 5.1, -len * 0.135] });

    // 4. Проржавевшая дымовая труба
    const funnel = new T.CylinderGeometry(1.15, 1.38, 6.2, 12);
    OC.xform(paintSteel(funnel, 0.78), { r: [-0.22, 0, 0.08], p: [0, hullH * 0.5 + 6.4, -len * 0.27] });

    // 5. Носовая и кормовая мачты с реями, грузовыми стрелами и вантами
    const masts = [
      { z: len * 0.29, h: 19.5, r: 0.36 },
      { z: -len * 0.08, h: 16.0, r: 0.30 }
    ];
    for (const m of masts) {
      const pole = new T.CylinderGeometry(m.r * 0.45, m.r, m.h, 8);
      OC.xform(paintSteel(pole, 0.55), { r: [0.06, 0, 0.05], p: [0, hullH * 0.5 + m.h * 0.5, m.z] });
      const yard = new T.CylinderGeometry(0.11, 0.14, 9.6, 6);
      OC.xform(paintSteel(yard, 0.62), { r: [0, 0, Math.PI / 2 + 0.08], p: [0, hullH * 0.5 + m.h * 0.68, m.z] });
      const derrick = new T.CylinderGeometry(0.12, 0.18, 12.5, 6);
      OC.xform(paintSteel(derrick, 0.58), { r: [-0.95, 0.24, 0], p: [0.4, hullH * 0.5 + 4.6, m.z - 3.6] });
      for (const s of [-1, 1]) {
        const stay = new T.CylinderGeometry(0.04, 0.04, m.h * 0.9, 4);
        OC.xform(paintSteel(stay, 0.4), { r: [0, 0, s * 0.28], p: [s * 2.4, hullH * 0.5 + m.h * 0.42, m.z] });
      }
    }

    // 6. Массивный бронзовый 4-лопастной гребной винт и перо руля на корме
    const propMat = new T.Color(0x887644);
    const hub = new T.CylinderGeometry(0.45, 0.52, 1.1, 8);
    hub.rotateX(Math.PI / 2);
    OC.geoPrep(hub); OC.paint(hub, propMat);
    OC.xform(hub, { p: [0, -hullH * 0.28, -len * 0.48] });
    parts.push(hub);
    for (let b = 0; b < 4; b++) {
      const ba = (b / 4) * Math.PI * 2;
      const blade = new T.SphereGeometry(1, 8, 5);
      blade.scale(0.55, 1.35, 0.12);
      OC.geoPrep(blade);
      OC.paint(blade, (x, y, z, c) => c.copy(propMat).lerp(new T.Color(0x4b745d), 0.32));
      OC.xform(blade, { r: [0.35, 0, ba], p: [Math.sin(ba) * 1.05, -hullH * 0.28 + Math.cos(ba) * 1.05, -len * 0.48] });
      parts.push(blade);
    }
    const rudder = new T.BoxGeometry(0.32, 3.4, 2.2);
    OC.xform(paintSteel(rudder, 0.65), { p: [0, -hullH * 0.24, -len * 0.505] });

    // 7. Живые кораллово-губковые наросты прямо на остове корабля
    const rng = OC.mulberry32(8421);
    const encColors = [0xe86e44, 0xf2b42e, 0x3eb494, 0xd85a8a];
    for (let i = 0; i < 18; i++) {
      const cz = (rng() - 0.5) * len * 0.76;
      const cx = (rng() < 0.5 ? -1 : 1) * beam * OC.lerp(0.26, 0.46, rng());
      const cy = hullH * 0.5 + OC.lerp(0.1, 1.4, rng());
      const r = OC.lerp(0.45, 1.15, rng());
      const sponge = new T.SphereGeometry(r, 7, 5);
      sponge.scale(1.1, 0.72, 1.0);
      OC.geoPrep(sponge);
      OC.paint(sponge, encColors[i % encColors.length]);
      OC.xform(sponge, { p: [cx, cy, cz] });
      parts.push(sponge);
    }

    const merged = OC.mergeGeometries(parts);
    const mesh = new T.Mesh(merged, creatureMat);
    group.add(mesh);

    const floorY = biome && biome.getHeight ? biome.getHeight(opts.x || 0, opts.z || 0) : -24;
    group.position.set(opts.x || 0, floorY + (opts.yOffset !== undefined ? opts.yOffset : 2.1), opts.z || 0);
    group.rotation.set(opts.pitch !== undefined ? opts.pitch : -0.05, opts.yaw !== undefined ? opts.yaw : 0.65, opts.roll !== undefined ? opts.roll : 0.34);
    group.userData.key = 'shipwreck';
    scene.add(group);

    return {
      key: 'shipwreck',
      isWreck: true,
      getPosition: () => group.position,
      update(dt, time, camPos) {
        group.visible = Math.hypot(group.position.x - camPos.x, group.position.z - camPos.z) < 920;
      }
    };
  }

  /* ---------- Гигантская акула-молот (Sphyrna mokarran) ---------- */
  function makeHammerhead(scene, biome, opts) {
    const len = opts.len || 4.8;
    const group = new T.Group();

    const body = new T.SphereGeometry(1, 16, 12);
    body.scale(len * 0.115, len * 0.135, len * 0.5);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = OC.clamp(z / (len * 0.5), -1, 1);
      const taper = t < 0 ? (1 - 0.85 * Math.pow(Math.max(0, -t), 1.45)) : (1 - 0.25 * Math.pow(Math.max(0, t), 2.2));
      bp.setXYZ(i, x * taper, y * taper, z);
    }
    OC.geoPrep(body);
    body.computeVertexNormals();
    OC.paint(body, (x, y, z, c) => c.set(y > -0.04 ? 0x625a4c : 0xe4e8ea));
    group.add(new T.Mesh(body, creatureMat));

    // Характерный широкий цефалофойл («молот») с глазами по краям
    const hammer = new T.SphereGeometry(1, 14, 8);
    hammer.scale(len * 0.29, 0.13, 0.36);
    OC.geoPrep(hammer);
    OC.paint(hammer, (x, y, z, c) => c.set(y > -0.02 ? 0x5c5448 : 0xdde2e4));
    const hamM = new T.Mesh(hammer, creatureMat);
    hamM.position.set(0, 0.04, len * 0.45);
    group.add(hamM);

    const eyeGeo = new T.SphereGeometry(0.065, 6, 5);
    OC.geoPrep(eyeGeo);
    OC.paint(eyeGeo, 0x0b0e12);
    for (const s of [-1, 1]) {
      const em = new T.Mesh(eyeGeo, creatureMat);
      em.position.set(s * len * 0.275, 0.04, len * 0.48);
      group.add(em);
    }

    // Высокий серповидный спинной плавник Sphyrna mokarran
    const dorsal = new T.ConeGeometry(0.32, 1.32, 4);
    dorsal.scale(0.24, 1, 1.15);
    OC.geoPrep(dorsal);
    OC.paint(dorsal, 0x544d40);
    const dM = new T.Mesh(dorsal, creatureMat);
    dM.position.set(0, len * 0.135 + 0.42, 0.12);
    dM.rotation.x = -0.32;
    group.add(dM);

    const pec = new T.ConeGeometry(0.32, 1.15, 4);
    pec.scale(0.18, 1, 0.68);
    OC.geoPrep(pec);
    OC.paint(pec, 0x585042);
    for (const s of [-1, 1]) {
      const pm = new T.Mesh(pec, creatureMat);
      pm.position.set(s * 0.48, -0.22, 0.58);
      pm.rotation.z = s * 1.18;
      pm.rotation.x = -0.35;
      group.add(pm);
    }

    const tailPivot = new T.Group();
    tailPivot.position.set(0, 0, -len * 0.44);
    const tUp = new T.ConeGeometry(0.34, 1.48, 4);
    tUp.scale(0.16, 1, 0.9);
    OC.geoPrep(tUp);
    OC.paint(tUp, 0x524b3f);
    const tUpM = new T.Mesh(tUp, creatureMat);
    tUpM.position.set(0, 0.38, -0.34);
    tUpM.rotation.x = -0.78;
    const tDn = new T.ConeGeometry(0.22, 0.72, 4);
    tDn.scale(0.16, 1, 0.8);
    OC.geoPrep(tDn);
    OC.paint(tDn, 0x6c6556);
    const tDnM = new T.Mesh(tDn, creatureMat);
    tDnM.position.set(0, -0.22, -0.22);
    tDnM.rotation.x = -2.35;
    tailPivot.add(tUpM, tDnM);
    group.add(tailPivot);

    group.userData.key = 'shark_hammerhead';
    scene.add(group);

    let ang = Math.random() * 6.28, t = Math.random() * 100;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const a = new T.Vector3(), b = new T.Vector3();
    let lungeTimer = 0;
    let lungeCooldown = 14 + Math.random() * 12;
    let lungeTarget = null;
    let lungeBlend = 0;

    return {
      key: 'shark_hammerhead',
      isActivePredator: true,
      isHunting: () => lungeTimer > 0,
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 760) { group.visible = false; return; }
        group.visible = true;
        const preyCenters = ctx ? ctx.preyCenters : null;
        t += dt;
        if (preyCenters && preyCenters.length) {
          if (lungeTimer > 0) {
            lungeTimer -= dt;
            if (lungeTarget && group.position.distanceTo(lungeTarget) < 6.8) {
              lungeTimer = 0;
              lungeCooldown = 18 + Math.random() * 10;
            }
          } else {
            lungeCooldown -= dt;
            if (lungeCooldown <= 0) {
              let bestD = 145, bestP = null;
              for (let p = 0; p < preyCenters.length; p++) {
                const pr = preyCenters[p];
                if (pr.y > -2.5) continue;
                const d = Math.hypot(pr.x - group.position.x, pr.z - group.position.z);
                if (d < bestD) { bestD = d; bestP = pr; }
              }
              if (bestP) { lungeTarget = bestP; lungeTimer = 4.6; }
              lungeCooldown = 16 + Math.random() * 10;
            }
          }
        }
        lungeBlend += ((lungeTimer > 0 && lungeTarget ? 1 : 0) - lungeBlend) * Math.min(1, dt * 2.5);

        const spd = (opts.speed || 5.4) * (lungeTimer > 0 ? 2.1 : 1.0);
        ang += (spd / opts.r) * dir * dt;
        const patCx = lungeBlend > 0.02 && lungeTarget ? OC.lerp(opts.cx, lungeTarget.x, lungeBlend) : opts.cx;
        const patCz = lungeBlend > 0.02 && lungeTarget ? OC.lerp(opts.cz, lungeTarget.z, lungeBlend) : opts.cz;
        const patR = OC.lerp(opts.r + Math.sin(t * 0.2) * 14, 6.0, lungeBlend);
        const ax = patCx + Math.cos(ang) * patR * 0.9;
        const az = patCz + Math.sin(ang) * patR + Math.sin(ang * 2.0) * 12 * (1 - lungeBlend);
        const bx = patCx + Math.cos(ang + 0.1 * dir) * patR * 0.9;
        const bz = patCz + Math.sin(ang + 0.1 * dir) * patR + Math.sin((ang + 0.1 * dir) * 2.0) * 12 * (1 - lungeBlend);
        const baseY = lungeBlend > 0.02 && lungeTarget ? OC.lerp(opts.y + Math.sin(t * 0.25) * 4, lungeTarget.y, lungeBlend) : (opts.y + Math.sin(t * 0.25) * 4);
        const ay = Math.max(baseY, biome.getHeight(ax, az) + 4.2);
        const by = Math.max(baseY, biome.getHeight(bx, bz) + 4.2);
        a.set(ax, Math.min(-2.5, ay), az);
        b.set(bx, Math.min(-2.5, by), bz);
        group.position.copy(a);
        group.lookAt(b);
        const wag = lungeTimer > 0 ? 5.6 : 3.4;
        tailPivot.rotation.y = Math.sin(time * wag + t) * 0.34;
        // Характерное покачивание головы-молота при сканировании дна
        group.rotation.y += Math.sin(time * wag + t) * 0.08;
      }
    };
  }

  /* ---------- Золотая медуза Палау (Mastigias papua) ---------- */
  function makeGoldenJelly(scene, opts) {
    const group = new T.Group();
    const bellGeo = new T.SphereGeometry(0.88, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const bellMat = new T.MeshStandardMaterial({
      color: new T.Color(0xf6b93b),
      emissive: new T.Color(0xd98018),
      emissiveIntensity: 0.72,
      roughness: 0.26,
      transparent: true,
      opacity: 0.72,
      side: T.DoubleSide,
      depthWrite: false
    });
    const bell = new T.Mesh(bellGeo, bellMat);
    group.add(bell);

    // Характерные светлые пятна и медовые ротовые лопасти без жгучих нитей
    const spotMat = new T.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.85 });
    const spotGeo = new T.SphereGeometry(0.085, 6, 4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sm = new T.Mesh(spotGeo, spotMat);
      sm.position.set(Math.cos(a) * 0.62, 0.42 + (i % 2) * 0.16, Math.sin(a) * 0.62);
      group.add(sm);
    }

    const armsMat = new T.MeshStandardMaterial({
      color: 0xd47a14,
      emissive: 0x8c4208,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.86,
      roughness: 0.45
    });
    const armGeo = new T.ConeGeometry(0.16, 1.15, 6);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const am = new T.Mesh(armGeo, armsMat);
      am.position.set(Math.cos(a) * 0.28, -0.58, Math.sin(a) * 0.28);
      am.rotation.x = Math.PI;
      group.add(am);
    }

    group.scale.setScalar(opts.scale || 0.95);
    group.position.set(opts.cx, opts.y, opts.cz);
    group.userData.key = 'jelly_golden';
    scene.add(group);

    const ph = Math.random() * 6.28;
    const baseS = opts.scale || 0.95;
    return {
      key: 'jelly_golden',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 420) { group.visible = false; return; }
        group.visible = true;
        const pulse = Math.sin(time * 2.1 + ph);
        group.position.x = opts.cx + Math.sin(time * 0.24 + ph) * 7.5;
        group.position.z = opts.cz + Math.cos(time * 0.21 + ph) * 7.5;
        group.position.y = Math.min(-1.0, opts.y + Math.sin(time * 0.42 + ph) * (opts.amp || 2.2) + pulse * 0.24);
        group.scale.set(baseS * (1 - pulse * 0.08), baseS * (1 + pulse * 0.12), baseS * (1 - pulse * 0.08));
      }
    };
  }

  /* ---------- Шлейфы чёрных курильщиков и термальный свет ---------- */
  function makeVentPlume(scene, biome, tex, opts) {
    const n = opts.n || 180;
    const hMax = opts.height || 34;
    const baseY = biome.getHeight(opts.x, opts.z) + (opts.chimneyH || 6.5);
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    const sz = new Float32Array(n);
    const rng = OC.mulberry32(Math.abs(Math.round(opts.x * 13 + opts.z * 29)) + 77);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * 1.4;
      pos[i * 3 + 1] = rng() * hMax;
      pos[i * 3 + 2] = (rng() - 0.5) * 1.4;
      ph[i] = rng() * 100;
      sz[i] = OC.lerp(1.4, 3.6, rng());
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.NormalBlending, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: tex },
          uTime: OC.uTime,
          uHMax: { value: hMax }
        }
      ]),
      vertexShader: `
        attribute float aPhase, aSize;
        uniform float uTime, uHMax;
        varying float vLife;
        varying float vHeat;
        #include <fog_pars_vertex>
        void main(){
          float y = mod(position.y + uTime * 3.8 + aPhase, uHMax);
          float life = y / uHMax;
          vLife = life;
          vHeat = smoothstep(0.24, 0.0, life);
          float billow = 0.8 + life * 6.2;
          vec3 p = vec3(
            position.x * billow + sin(uTime * 0.9 + aPhase + life * 4.0) * (0.6 + life * 2.2),
            y,
            position.z * billow + cos(uTime * 0.75 + aPhase * 1.3 + life * 4.0) * (0.6 + life * 2.2)
          );
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * (1.0 + life * 2.4) * (240.0 / max(1.5, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vLife, vHeat;
        #include <fog_pars_fragment>
        void main(){
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.03) discard;
          vec3 soot = vec3(0.11, 0.12, 0.14);
          vec3 ember = vec3(0.92, 0.36, 0.08);
          vec3 col = mix(soot, ember, vHeat * 0.72);
          float alpha = tx.a * (1.0 - smoothstep(0.45, 1.0, vLife)) * smoothstep(0.0, 0.05, vLife) * 0.68;
          gl_FragColor = vec4(col, alpha);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.position.set(opts.x, baseY, opts.z);
    pts.userData.key = 'vent_chimney';
    scene.add(pts);

    let light = null;
    if (opts.light) {
      light = new T.PointLight(0xff5e1a, 2.6, 52, 1.4);
      light.position.set(opts.x, baseY + 1.5, opts.z);
      scene.add(light);
    }

    return {
      key: 'vent_chimney',
      getPosition: () => pts.position,
      update(dt, time, camPos) {
        const d = Math.hypot(opts.x - camPos.x, opts.z - camPos.z);
        const vis = d < 520;
        pts.visible = vis;
        if (light) light.intensity = vis ? (2.2 + 0.7 * Math.sin(time * 5.2 + opts.x)) : 0;
      }
    };
  }

  /* ---------- Бесконечные пузыри, биолюминесцентный планктон и глубинный «морской снег» ---------- */
  function createCameraRelativeParticles(scene, n, tex, mode, noSurface) {
    const kind = mode === true ? 'plankton' : (mode === false ? 'bubbles' : mode);
    const isPlankton = kind === 'plankton';
    const isSnow = kind === 'snow';
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    const sz = new Float32Array(n);
    const spd = new Float32Array(n);
    const rng = OC.mulberry32(isPlankton ? 8812 : (isSnow ? 6147 : 4409));

    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * 180;
      pos[i * 3 + 1] = (rng() - 0.5) * 110;
      pos[i * 3 + 2] = (rng() - 0.5) * 180;
      ph[i] = rng() * 100;
      sz[i] = isPlankton ? OC.lerp(0.35, 1.35, rng()) : (isSnow ? OC.lerp(0.55, 1.65, rng()) : OC.lerp(0.45, 1.4, rng()));
      spd[i] = isPlankton ? OC.lerp(0.2, 0.7, rng()) : (isSnow ? OC.lerp(0.25, 0.72, rng()) : OC.lerp(1.6, 4.4, rng()));
    }
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new T.BufferAttribute(ph, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));
    geo.setAttribute('aSpeed', new T.BufferAttribute(spd, 1));

    const motionGLSL = isPlankton
      ? `p.x += sin(uTime * 0.16 + aPhase) * 3.5;
         p.y += cos(uTime * 0.21 + aPhase * 1.3) * 2.2;
         p.z += cos(uTime * 0.14 + aPhase * 0.7) * 3.5;`
      : (isSnow
        ? `p.y -= uTime * aSpeed;
           p.x += sin(uTime * 0.32 + aPhase) * 2.2;
           p.z += cos(uTime * 0.27 + aPhase * 1.2) * 2.2;`
        : `p.y += uTime * aSpeed;
           p.x += sin(uTime * 0.75 + aPhase) * 1.1;
           p.z += cos(uTime * 0.6 + aPhase) * 1.1;`);

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: tex },
          uTime: OC.uTime,
          uCamPos: { value: new T.Vector3() },
          uFlowOffset: { value: new T.Vector3() },
          uColor: { value: new T.Color(isPlankton ? 0x7ef2ff : (isSnow ? 0xd9edf7 : 0xc6f2ff)) },
          uBio: { value: 0.4 },
          uScale: { value: 1.0 },
          uNoSurface: { value: noSurface ? 1.0 : 0.0 }
        }
      ]),
      vertexShader: `
        attribute float aPhase, aSize, aSpeed;
        uniform float uTime, uScale, uBio, uNoSurface;
        uniform vec3 uCamPos, uFlowOffset;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main(){
          vec3 box = vec3(180.0, 110.0, 180.0);
          vec3 p = position + uFlowOffset;
          ${motionGLSL}
          vec3 rel = mod(p - uCamPos + box * 0.5, box) - box * 0.5;
          vec3 worldP = uCamPos + rel;
          // Не вылетаем над поверхностью моря (Y = 0), кроме абиссального рифта
          float belowWater = max(uNoSurface, step(worldP.y, -0.35));
          vec4 mvPosition = modelViewMatrix * vec4(worldP, 1.0);
          gl_PointSize = belowWater * aSize * uScale * (${isPlankton ? '135.0' : (isSnow ? '105.0' : '115.0')} / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          float blink = ${isPlankton
            ? '0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.7 + fract(aPhase) * 1.3) + aPhase), 2.0)'
            : (isSnow ? '(0.28 + 0.72 * smoothstep(-6.0, -28.0, worldP.y))' : '0.85')};
          vAlpha = belowWater * blink * ${isPlankton ? '(0.28 + uBio * 0.72)' : (isSnow ? '(0.36 + uBio * 0.35)' : '0.52')};
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
    pts.userData.key = isPlankton ? 'plankton' : (isSnow ? 'marine_snow' : 'bubbles');
    scene.add(pts);
    return mat;
  }

  /* ---------- Система водных брызг (выпрыги китов, белух и морских львов) ---------- */
  function makeSplashSystem(scene, texHard) {
    const N = 420;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const life = new Float32Array(N);
    const maxLife = new Float32Array(N);
    const alpha = new Float32Array(N);
    const size = new Float32Array(N);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aAlpha', new T.BufferAttribute(alpha, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(size, 1));

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        { uTex: { value: texHard }, uScale: { value: 1.0 } }
      ]),
      vertexShader: `
        attribute float aAlpha, aSize;
        uniform float uScale;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main(){
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aAlpha > 0.01 ? aSize * uScale * (185.0 / max(1.0, -mvPosition.z)) : 0.0;
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = aAlpha;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main(){
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.03 || vAlpha < 0.01) discard;
          gl_FragColor = vec4(vec3(0.92, 0.98, 1.0), tx.a * vAlpha);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.visible = false;
    pts.userData.key = 'bubbles';
    scene.add(pts);

    let cursor = 0;
    let activeCount = 0;

    return {
      emit(worldPos, intensity) {
        const k = Math.max(18, Math.min(84, Math.round(74 * (intensity || 0.7))));
        const spread = 1.6 + 2.8 * (intensity || 0.7);
        for (let m = 0; m < k; m++) {
          const i = cursor;
          cursor = (cursor + 1) % N;
          const a = Math.random() * 6.28318;
          const r = Math.random() * spread;
          const i3 = i * 3;
          pos[i3]     = worldPos.x + Math.cos(a) * r;
          pos[i3 + 1] = 0.15 + Math.random() * 0.45;
          pos[i3 + 2] = worldPos.z + Math.sin(a) * r;
          const outV = (1.5 + Math.random() * 5.2) * (0.55 + (intensity || 0.7) * 0.65);
          vel[i3]     = Math.cos(a) * outV;
          vel[i3 + 1] = (4.8 + Math.random() * 9.5) * (0.5 + (intensity || 0.7) * 0.65);
          vel[i3 + 2] = Math.sin(a) * outV;
          const ml = 0.85 + Math.random() * 0.95;
          life[i] = ml;
          maxLife[i] = ml;
          alpha[i] = 0.9;
          size[i] = (0.7 + Math.random() * 1.15) * (0.65 + (intensity || 0.7) * 0.65);
        }
        activeCount = N;
        pts.visible = true;
      },
      update(dt) {
        if (activeCount === 0) return;
        let alive = 0;
        for (let i = 0; i < N; i++) {
          const l = life[i];
          if (l <= 0) { alpha[i] = 0; continue; }
          const nl = l - dt;
          life[i] = nl;
          if (nl <= 0) { alpha[i] = 0; continue; }
          const i3 = i * 3;
          vel[i3 + 1] -= 13.8 * dt;
          pos[i3]     += vel[i3] * dt;
          pos[i3 + 1] += vel[i3 + 1] * dt;
          pos[i3 + 2] += vel[i3 + 2] * dt;
          if (pos[i3 + 1] < -0.2) {
            life[i] = 0;
            alpha[i] = 0;
            continue;
          }
          const frac = nl / maxLife[i];
          alpha[i] = Math.min(0.92, frac * 1.35);
          alive++;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aAlpha.needsUpdate = true;
        geo.attributes.aSize.needsUpdate = true;
        if (alive === 0) { activeCount = 0; pts.visible = false; }
      },
      setScale(s) { mat.uniforms.uScale.value = s; },
      getActiveCount: () => activeCount
    };
  }

  /* ---------- Биолюминесцентный след ночесветок (Noctiluca) при движении дайвера ---------- */
  function makeBiolumTrail(scene, tex, noSurface) {
    const N = 180;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const born = new Float32Array(N);
    const sz = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      born[i] = -999;
      sz[i] = 1.6 + (i % 5) * 0.45;
    }
    const posAttr = new T.BufferAttribute(pos, 3);
    const bornAttr = new T.BufferAttribute(born, 1);
    posAttr.setUsage(T.DynamicDrawUsage);
    bornAttr.setUsage(T.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aBorn', bornAttr);
    geo.setAttribute('aSize', new T.BufferAttribute(sz, 1));

    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: true,
      uniforms: T.UniformsUtils.merge([
        T.UniformsLib.fog,
        {
          uTex: { value: tex },
          uTime: OC.uTime,
          uScale: { value: 1.0 }
        }
      ]),
      vertexShader: `
        attribute float aBorn, aSize;
        uniform float uTime, uScale;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main(){
          float age = uTime - aBorn;
          float alive = step(0.0, age) * step(age, 2.5);
          vec3 p = position + vec3(sin(uTime * 1.4 + position.z) * 0.18, age * 0.22, cos(uTime * 1.2 + position.x) * 0.18);
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = alive * aSize * uScale * (145.0 / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
          vAlpha = alive * smoothstep(0.0, 0.14, age) * (1.0 - smoothstep(0.45, 2.5, age));
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D uTex;
        varying float vAlpha;
        #include <fog_pars_fragment>
        void main(){
          if (vAlpha < 0.01) discard;
          vec4 tx = texture2D(uTex, gl_PointCoord);
          if (tx.a < 0.02) discard;
          gl_FragColor = vec4(0.24, 0.96, 1.0, tx.a * vAlpha * 0.92);
          #include <fog_fragment>
        }`
    });

    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.key = 'plankton';
    scene.add(pts);

    let cursor = 0;
    let spawnAcc = 0;
    return {
      mat,
      update(dt, time, camPos, camSpeed, bioGlow, flashOn) {
        if ((bioGlow > 0.28 || flashOn) && (camSpeed > 1.8) && (noSurface || camPos.y < -0.35)) {
          spawnAcc += dt * Math.min(4.0, camSpeed * 0.35);
          let dirty = false;
          while (spawnAcc >= 0.055) {
            spawnAcc -= 0.055;
            const i = cursor;
            cursor = (cursor + 1) % N;
            const a = cursor * 2.39996;
            const r = 1.4 + ((cursor * 17) % 10) * 0.36;
            pos[i * 3] = camPos.x + Math.cos(a) * r;
            pos[i * 3 + 1] = camPos.y + Math.sin(a * 1.3) * 1.6 - 0.35;
            pos[i * 3 + 2] = camPos.z + Math.sin(a) * r;
            born[i] = time;
            dirty = true;
          }
          if (dirty) {
            posAttr.needsUpdate = true;
            bornAttr.needsUpdate = true;
          }
        }
      },
      setScale(s) {
        mat.uniforms.uScale.value = s;
      }
    };
  }

  /* ---------- Сборка фауны по экологическому плану биома (biome.faunaPlan) ---------- */
  function disposeFaunaGroup(scene) {
    if (!faunaGroup) return;
    const dGeos = new Set();
    const dMats = new Set();
    faunaGroup.traverse((o) => {
      if (o.geometry && !dGeos.has(o.geometry)) { o.geometry.dispose(); dGeos.add(o.geometry); }
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (m && !dMats.has(m)) { m.dispose(); dMats.add(m); }
        }
      }
    });
    scene.remove(faunaGroup);
    faunaGroup = null;
  }

  OC.FaunaEngine = {
    init(scene, biome) {
      disposeFaunaGroup(scene);
      faunaGroup = new T.Group();
      scene.add(faunaGroup);

      fishMatInstanced = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.48, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: biome.noSurface ? 0.0 : 0.45, fishSwim: true });

      fishMatBiolum = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true,
        emissive: new T.Color(0x2ce8ff),
        emissiveIntensity: 0.45,
        roughness: 0.42,
        metalness: 0.08,
        side: T.DoubleSide
      }), { causticStrength: biome.noSurface ? 0.0 : 0.25, fishSwim: true });

      creatureMat = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.52, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: biome.noSurface ? 0.0 : 0.55 });

      const plan = biome.faunaPlan || {};
      const agents = [];
      const schools = [];
      const predatorAgents = [];
      const preySchools = [];
      const sonarTargets = [];
      const texSoft = OC.circleTexture(64, false);
      const texHard = OC.circleTexture(64, true);
      const splashSystem = makeSplashSystem(faunaGroup, texHard);
      const lastCamPos = new T.Vector3();

      function emitSplash(worldPos, intensity) {
        splashSystem.emit(worldPos, intensity);
        if (intensity >= 0.6 && OC.sound && OC.sound.whaleSplash) {
          const d = Math.hypot(worldPos.x - lastCamPos.x, worldPos.y - lastCamPos.y, worldPos.z - lastCamPos.z);
          if (d < 360) OC.sound.whaleSplash(d);
        }
      }

      const schoolsSpec = plan.schools || [];
      for (const s of schoolsSpec) {
        const sch = makeSchool(faunaGroup, biome, s);
        schools.push(sch);
        agents.push(sch);
        if (sch.isPredator) predatorAgents.push(sch);
        else if (sch.isPrey) preySchools.push(sch);
        sonarTargets.push(sch);
      }

      for (const sf of (plan.soloFish || [])) {
        const a = makeSoloFish(faunaGroup, biome, sf);
        agents.push(a);
      }

      for (const lf of (plan.lionfish || [])) {
        const a = makeLionfish(faunaGroup, biome, lf);
        agents.push(a);
        predatorAgents.push(a);
        sonarTargets.push(a);
      }

      for (const oct of (plan.octopus || [])) {
        agents.push(makeOctopus(faunaGroup, biome, oct));
      }

      for (const mor of (plan.moray || [])) {
        agents.push(makeMoray(faunaGroup, biome, mor));
      }

      for (const j of (plan.jellies || [])) {
        agents.push(makeJelly(faunaGroup, j));
      }

      for (const dg of (plan.dugongs || [])) {
        const a = makeDugong(faunaGroup, biome, dg);
        agents.push(a);
        sonarTargets.push(a);
      }

      const surfaceJumpers = [];
      for (const sl of (plan.seaLions || [])) {
        const a = makeSeaLion(faunaGroup, biome, sl, emitSplash);
        agents.push(a);
        surfaceJumpers.push(a);
        sonarTargets.push(a);
      }

      for (const tu of (plan.turtles || [])) {
        const a = makeTurtle(faunaGroup, biome, tu);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const ry of (plan.rays || [])) {
        const a = makeRay(faunaGroup, biome, ry);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const mn of (plan.mantas || [])) {
        const a = makeManta(faunaGroup, biome, mn);
        agents.push(a);
        sonarTargets.push(a);
      }

      const huntingAgents = [];
      for (const sh of (plan.sharks || [])) {
        const a = makeShark(faunaGroup, biome, sh);
        agents.push(a);
        if (a.isActivePredator) {
          predatorAgents.push(a);
          huntingAgents.push(a);
        }
        sonarTargets.push(a);
      }

      for (const angF of (plan.anglers || [])) {
        const a = makeAnglerfish(faunaGroup, biome, angF);
        agents.push(a);
        predatorAgents.push(a);
        sonarTargets.push(a);
      }

      for (const sq of (plan.squids || [])) {
        const a = makeAbyssalSquid(faunaGroup, biome, sq);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const db of (plan.dumbos || [])) {
        agents.push(makeDumboOctopus(faunaGroup, biome, db));
      }

      for (const bl of (plan.belugas || [])) {
        const a = makeBeluga(faunaGroup, biome, bl, emitSplash);
        agents.push(a);
        surfaceJumpers.push(a);
        sonarTargets.push(a);
      }

      for (const nw of (plan.narwhals || [])) {
        const a = makeNarwhal(faunaGroup, biome, nw);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const aj of (plan.arcticJellies || [])) {
        agents.push(makeArcticJelly(faunaGroup, aj));
      }

      for (const cl of (plan.cliones || [])) {
        agents.push(makeClione(faunaGroup, cl));
      }

      for (const wr of (plan.wrecks || [])) {
        const a = makeShipwreck(faunaGroup, biome, wr);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const hm of (plan.hammerheads || [])) {
        const a = makeHammerhead(faunaGroup, biome, hm);
        agents.push(a);
        predatorAgents.push(a);
        huntingAgents.push(a);
        sonarTargets.push(a);
      }

      for (const gj of (plan.goldenJellies || [])) {
        agents.push(makeGoldenJelly(faunaGroup, gj));
      }

      let whale = null;
      const whalesList = [];
      for (const wh of (plan.whales || [])) {
        const w = makeHumpbackWhale(faunaGroup, biome, wh, emitSplash);
        if (!whale) whale = w;
        whalesList.push(w);
        agents.push(w);
        sonarTargets.push(w);
      }

      // ---- Пузыри, планктон, морской снег и шлейфы курильщиков ----
      const pCountMult = OC.Quality.get().particlesScale;
      for (const vp of (plan.ventPlumes || [])) {
        agents.push(makeVentPlume(faunaGroup, biome, texSoft, vp));
      }
      const noSurf = !!biome.noSurface;
      const bubbleMat = createCameraRelativeParticles(faunaGroup, noSurf ? 80 : Math.round(900 * pCountMult), texHard, 'bubbles', noSurf);
      const planktonMat = createCameraRelativeParticles(faunaGroup, Math.round(1500 * pCountMult), texSoft, 'plankton', noSurf);
      const snowMat = createCameraRelativeParticles(faunaGroup, Math.round((noSurf ? 1400 : 1050) * pCountMult), texSoft, 'snow', noSurf);
      const biolumTrail = makeBiolumTrail(faunaGroup, texSoft, noSurf);

      const bioPlanktonCol = new T.Color(0x52f2ff);
      const dayPlanktonCol = new T.Color(0x9be8ff);

      const predatorsBuf = [];
      const preyCentersBuf = [];
      const cleanClientsBuf = [];
      const sonarOrigin = new T.Vector3();
      const updateCtx = {
        dayW: 1.0,
        camSpeed: 0,
        flashOn: false,
        predators: predatorsBuf,
        preyCenters: preyCentersBuf,
        cleanClients: cleanClientsBuf,
        cleaningStations: plan.cleaningStations || [],
        sonarOrigin,
        sonarPulseAge: 99,
        frameIdx: 0
      };
      const _scanSample = new T.Vector3();
      const _toTarget = new T.Vector3();
      const _currFlow = new T.Vector3();
      const _flowAccum = new T.Vector3();

      function refreshFaunaCounts() {
        let total = 0;
        for (const sch of activeSchoolsRef) total += sch.getCount();
        OC.faunaInfo.schoolFish = total;
      }

      activeSchoolsRef = schools;
      OC.faunaInfo = {
        schoolFish: 0,
        schools: schools.length,
        big: agents.length - schools.length,
        whale,
        activeEvent: null
      };
      refreshFaunaCounts();

      if (!qualityHookBound) {
        qualityHookBound = true;
        OC.Quality.onChange((preset) => {
          for (const sch of activeSchoolsRef) sch.setQualityScale(preset.fishScale);
          refreshFaunaCounts();
        });
      }

      return {
        agents,
        whale,
        notifySonarPing(origin) {
          if (origin) sonarOrigin.copy(origin);
          updateCtx.sonarPulseAge = 0;
        },
        getSplashCount: () => splashSystem.getActiveCount(),
        getActiveEvent: () => OC.faunaInfo.activeEvent,
        update(dt, time, camPos, camSpeed, flashOn) {
          const pal = OC.getPalette();
          const dayW = pal && typeof pal.dayW === 'number' ? pal.dayW : 1.0;

          lastCamPos.copy(camPos);
          updateCtx.dayW = dayW;
          updateCtx.camSpeed = camSpeed || 0;
          updateCtx.flashOn = !!flashOn;
          updateCtx.frameIdx++;
          if (updateCtx.sonarPulseAge < 90) updateCtx.sonarPulseAge += dt;

          // Собираем активных хищников и косяки жертв в переиспользуемые массивы (без GC аллокаций)
          predatorsBuf.length = 0;
          for (let i = 0; i < predatorAgents.length; i++) {
            const pa = predatorAgents[i];
            if (pa.isNocturnalPredator && dayW > 0.55) continue;
            const p = pa.getPosition ? pa.getPosition() : null;
            if (p) predatorsBuf.push(p);
          }

          preyCentersBuf.length = 0;
          for (let i = 0; i < preySchools.length; i++) {
            const ps = preySchools[i];
            if (ps.mesh && ps.mesh.visible && ps.center) preyCentersBuf.push(ps.center);
          }

          // Клиенты станций чистки заполняются агентами в этом кадре (если остаются рядом — используются в следующем)
          cleanClientsBuf.length = 0;

          if (fishMatBiolum) {
            fishMatBiolum.emissiveIntensity = OC.lerp(1.45, 0.25, dayW) + (pal.bioGlow || 0) * 0.45;
          }

          for (let i = 0; i < agents.length; i++) {
            agents[i].update(dt, time, camPos, updateCtx);
          }
          splashSystem.update(dt);

          // Классифицируем ключевое природное событие в радиусе видимости
          let ev = null;
          for (let i = 0; i < whalesList.length; i++) {
            if (whalesList[i].isBreaching()) {
              const p = whalesList[i].getPosition();
              if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 420) { ev = 'breach'; break; }
            }
          }
          if (!ev) {
            for (let i = 0; i < huntingAgents.length; i++) {
              if (huntingAgents[i].isHunting()) {
                const p = huntingAgents[i].getPosition();
                if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 160) { ev = 'hunt'; break; }
              }
            }
          }
          if (!ev) {
            for (let i = 0; i < preySchools.length; i++) {
              if (preySchools[i].getPanic && preySchools[i].getPanic() > 0.5) {
                const p = preySchools[i].center;
                if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 140) { ev = 'baitball'; break; }
              }
            }
          }
          if (!ev && cleanClientsBuf.length > 0) {
            for (let i = 0; i < cleanClientsBuf.length; i++) {
              const p = cleanClientsBuf[i];
              if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 120) { ev = 'cleaning'; break; }
            }
          }
          if (!ev) {
            for (let i = 0; i < surfaceJumpers.length; i++) {
              if (surfaceJumpers[i].isPorpoising()) {
                const p = surfaceJumpers[i].getPosition();
                if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 190) { ev = 'porpoising'; break; }
              }
            }
          }
          OC.faunaInfo.activeEvent = ev;

          bubbleMat.uniforms.uCamPos.value.copy(camPos);
          planktonMat.uniforms.uCamPos.value.copy(camPos);
          snowMat.uniforms.uCamPos.value.copy(camPos);

          // Плавная адвекция планктона, пузырей и морского снега по локальному течению
          if (biome.getCurrentAt && (biome.noSurface || camPos.y < 1.5)) {
            biome.getCurrentAt(camPos.x, camPos.y, camPos.z, time, _currFlow);
            _flowAccum.addScaledVector(_currFlow, dt * 1.35);
            _flowAccum.x = ((_flowAccum.x % 180) + 180) % 180;
            _flowAccum.y = ((_flowAccum.y % 110) + 110) % 110;
            _flowAccum.z = ((_flowAccum.z % 180) + 180) % 180;
            bubbleMat.uniforms.uFlowOffset.value.copy(_flowAccum);
            planktonMat.uniforms.uFlowOffset.value.copy(_flowAccum);
            snowMat.uniforms.uFlowOffset.value.copy(_flowAccum);
          }

          planktonMat.uniforms.uBio.value = pal.bioGlow;
          planktonMat.uniforms.uColor.value.copy(pal.bioGlow > 0.45 ? bioPlanktonCol : dayPlanktonCol);
          snowMat.uniforms.uBio.value = flashOn ? 1.0 : 0.15;
          biolumTrail.update(dt, time, camPos, camSpeed || 0, pal.bioGlow || 0, !!flashOn);
        },
        setScale(s) {
          bubbleMat.uniforms.uScale.value = s;
          planktonMat.uniforms.uScale.value = s;
          snowMat.uniforms.uScale.value = s;
          biolumTrail.setScale(s);
          splashSystem.setScale(s);
        },
        /* Активное сонарное сканирование вперёд по курсу (рельеф + крупная фауна/стаи) */
        scanForward(origin, dir, maxRange) {
          const maxR = maxRange || 140;
          let bestDist = Infinity;
          let bestKind = 'none';
          let bestLabel = 'Чистая вода';

          // 1. Проверяем пересечение с рельефом дна / стеной
          const step = 4.0;
          for (let d = 6; d <= maxR; d += step) {
            _scanSample.copy(origin).addScaledVector(dir, d);
            const fl = biome.getHeight(_scanSample.x, _scanSample.z);
            if (_scanSample.y <= fl + 0.6) {
              // Уточняем расстояние половинным делением
              let lo = d - step, hi = d;
              for (let k = 0; k < 3; k++) {
                const mid = (lo + hi) * 0.5;
                _scanSample.copy(origin).addScaledVector(dir, mid);
                if (_scanSample.y <= biome.getHeight(_scanSample.x, _scanSample.z) + 0.6) hi = mid;
                else lo = mid;
              }
              bestDist = hi;
              bestKind = 'terrain';
              const zHit = biome.getZoneAt(_scanSample.x, _scanSample.y, _scanSample.z);
              bestLabel = 'Рельеф · ' + (zHit ? zHit.shortName : 'дно');
              break;
            }
          }

          // 2. Проверяем попадание живых объектов в передний конус ~16 градусов (cos > 0.96)
          let bestKey = null;
          for (let i = 0; i < sonarTargets.length; i++) {
            const tgt = sonarTargets[i];
            const pos = tgt.getPosition ? tgt.getPosition() : null;
            if (!pos) continue;
            _toTarget.subVectors(pos, origin);
            const dist = _toTarget.length();
            if (dist < 4 || dist > maxR || dist >= bestDist) continue;
            const dot = _toTarget.dot(dir) / dist;
            if (dot > 0.945) {
              bestDist = dist;
              bestKind = 'fauna';
              bestKey = tgt.key || null;
              const enc = biome.encyclopedia[tgt.key];
              bestLabel = enc ? enc[0] : (tgt.key || 'Морской объект');
            }
          }

          return {
            hit: bestDist <= maxR,
            range: bestDist <= maxR ? bestDist : maxR,
            kind: bestKind,
            key: bestKey,
            label: bestLabel
          };
        },
        /* Фокусный сканер подводной фотокамеры по всем существам в кадре */
        scanCameraTarget(origin, dir, maxRange) {
          const maxR = maxRange || 95;
          let bestScore = -1;
          let best = null;
          for (let i = 0; i < agents.length; i++) {
            const tgt = agents[i];
            const pos = tgt.getPosition ? tgt.getPosition() : null;
            if (!pos) continue;
            _toTarget.subVectors(pos, origin);
            const dist = _toTarget.length();
            if (dist < 1.5 || dist > maxR) continue;
            const dot = _toTarget.dot(dir) / dist;
            if (dot < 0.89) continue; // ~27° конус видоискателя
            // Ближние и хорошо отцентрированные цели получают более высокий приоритет
            const score = (dot - 0.88) * 12.0 + (1.0 - dist / maxR) * 1.4;
            if (score > bestScore) {
              bestScore = score;
              const enc = biome.encyclopedia[tgt.key];
              best = {
                hit: true,
                key: tgt.key,
                label: enc ? enc[0] : tgt.key,
                latin: enc ? enc[1] : '',
                dist,
                align: OC.clamp((dot - 0.89) / 0.11, 0, 1)
              };
            }
          }
          return best;
        }
      };
    },

    /* Генератор изолированной 3D-модели любого вида или объекта для Атласа */
    createPreviewMesh(key, biome) {
      const dummyBiome = { getHeight: () => -30 };
      const tmpGroup = new T.Group();
      const previewMat = new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.44, metalness: 0.08, side: T.DoubleSide
      });
      const previewBiolumMat = new T.MeshStandardMaterial({
        vertexColors: true,
        emissive: new T.Color(0x2ce8ff),
        emissiveIntensity: 0.55,
        roughness: 0.36,
        metalness: 0.08,
        side: T.DoubleSide
      });
      const savedMat = creatureMat;
      let built = null;

      try {
        creatureMat = previewMat;

        if (key === 'floor') {
          const g = new T.PlaneGeometry(14, 14, 16, 16);
          g.rotateX(-Math.PI / 2);
          const pos = g.attributes.position;
          const colors = new Float32Array(pos.count * 3);
          const c = new T.Color();
          const bId = biome ? biome.id : 'great_barrier_reef';
          const ox = bId === 'great_barrier_reef' ? 80 : 0;
          const oz = 0;
          let sumY = 0;
          for (let i = 0; i < pos.count; i++) {
            const wx = pos.getX(i) + ox;
            const wz = pos.getZ(i) + oz;
            const y = biome && biome.getHeight ? biome.getHeight(wx, wz) : Math.sin(wx * 0.4) * 0.6;
            pos.setY(i, y);
            sumY += y;
          }
          const avgY = sumY / pos.count;
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            pos.setY(i, (y - avgY) * 0.85);
            if (bId === 'hydrothermal_vents') {
              c.setHex(0x24262e).offsetHSL(0, 0, Math.sin(x * 0.7 + z * 0.5) * 0.05);
            } else if (bId === 'kelp_forest') {
              c.setHex(0x52554c).offsetHSL(0.02, 0.05, Math.cos(x * 0.5) * 0.06);
            } else if (bId === 'arctic_sea') {
              c.setHex(0x4b5c69).lerp(new T.Color(0x88b4cc), OC.clamp((y - avgY) * 0.25 + 0.3, 0, 0.7));
            } else if (bId === 'wreck_atoll') {
              c.setHex(0xe5d7b4).lerp(new T.Color(0x8ab894), Math.sin(x * 0.38 + z * 0.42) * 0.35 + 0.35);
            } else {
              c.setHex(0xdbc9a4).lerp(new T.Color(0xc49c76), Math.sin(x * 0.45 + z * 0.45) * 0.5 + 0.5);
            }
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
          }
          g.setAttribute('color', new T.BufferAttribute(colors, 3));
          g.computeVertexNormals();
          built = new T.Mesh(g, previewMat);
        } else if (key === 'lionfish') {
          makeLionfish(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'moray') {
          makeMoray(tmpGroup, dummyBiome, { x: 0, z: 0 });
        } else if (key === 'octopus') {
          makeOctopus(tmpGroup, dummyBiome, { x: 0, z: 0, scale: 1 });
        } else if (key === 'ray_spotted' || key === 'ray_eagle') {
          makeRay(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, speed: 2, eagle: key === 'ray_eagle', scale: 1 });
        } else if (key === 'manta') {
          makeManta(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, span: 10, size: 1 });
        } else if (key === 'turtle') {
          makeTurtle(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, size: 1 });
        } else if (key === 'dugong') {
          makeDugong(tmpGroup, dummyBiome, { cx: 0, cz: 0, r: 10, scale: 1 });
        } else if (key === 'shark_reef' || key === 'shark_whale' || key === 'shark_leopard' || key === 'shark_greenland') {
          makeShark(tmpGroup, dummyBiome, {
            cx: 0, cz: 0, y: 0, r: 10, speed: 2,
            speciesKey: key, whaleShark: key === 'shark_whale'
          });
        } else if (key === 'whale_humpback') {
          makeHumpbackWhale(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 20 });
        } else if (key === 'jelly' || key === 'jelly_deep') {
          makeJelly(tmpGroup, { cx: 0, cz: 0, y: 0, r: 2, hue: key === 'jelly_deep' ? 0.56 : 0.85, deep: key === 'jelly_deep', scale: 1 });
        } else if (key === 'sea_lion') {
          makeSeaLion(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'fish_angler') {
          makeAnglerfish(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'squid_abyssal') {
          makeAbyssalSquid(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'octopus_dumbo') {
          makeDumboOctopus(tmpGroup, dummyBiome, { x: 0, z: 0, scale: 1 });
        } else if (key === 'beluga') {
          makeBeluga(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, len: 4.8, scale: 1 });
        } else if (key === 'narwhal') {
          makeNarwhal(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, len: 5.0, scale: 1 });
        } else if (key === 'jelly_arctic') {
          makeArcticJelly(tmpGroup, { cx: 0, cz: 0, y: 0, scale: 1 });
        } else if (key === 'clione_angel') {
          makeClione(tmpGroup, { cx: 0, cz: 0, y: 0, n: 1, singlePreview: true });
        } else if (key === 'shipwreck') {
          makeShipwreck(tmpGroup, dummyBiome, { x: 0, z: 0, yOffset: 0, pitch: 0, yaw: 0, roll: 0 });
        } else if (key === 'shark_hammerhead') {
          makeHammerhead(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, len: 4.8 });
        } else if (key === 'jelly_golden') {
          makeGoldenJelly(tmpGroup, { cx: 0, cz: 0, y: 0, scale: 1 });
        } else {
          // Ищем либо параметры стаи / одиночной рыбы в фауне биомов, либо прототип из FloraLibrary
          let fishSpec = null;
          const allBiomes = biome ? [biome, ...OC.Biomes.list()] : OC.Biomes.list();
          for (const b of allBiomes) {
            const p = b && b.faunaPlan;
            if (!p) continue;
            const sc = (p.schools || []).find((s) => s.key === key);
            if (sc) { fishSpec = sc; break; }
            const sl = (p.soloFish || []).find((s) => s.key === key);
            if (sl) { fishSpec = sl; break; }
          }
          if (fishSpec) {
            const fg = makeFishGeo(fishSpec.geoOpts || {});
            built = new T.Mesh(fg, fishSpec.biolum ? previewBiolumMat : previewMat);
          } else if (OC.FloraLibrary && OC.FloraLibrary.getPreviewGeo) {
            const fl = OC.FloraLibrary.getPreviewGeo(key);
            if (fl) {
              const fMat = new T.MeshStandardMaterial({
                vertexColors: true,
                roughness: fl.roughness !== undefined ? fl.roughness : 0.72,
                metalness: fl.metalness !== undefined ? fl.metalness : 0.05,
                emissive: fl.emissive ? new T.Color(fl.emissive) : new T.Color(0x000000),
                emissiveIntensity: fl.emissiveIntensity || 0,
                side: T.DoubleSide
              });
              built = new T.Mesh(fl.geo, fMat);
            }
          }
        }

        if (!built && tmpGroup.children.length > 0) {
          built = tmpGroup.children[0];
          tmpGroup.remove(built);
        }
        if (!built) {
          built = new T.Mesh(new T.SphereGeometry(0.8, 12, 8), previewMat);
        }

        // Обнуляем возможный сдвиг (напр. позиция группы в мировой точке) и приводим к единому масштабу 2.6 м
        built.position.set(0, 0, 0);
        built.rotation.set(0, 0, 0);
        built.scale.set(1, 1, 1);
        built.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(built);
        const size = new T.Vector3();
        const center = new T.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxDim = Math.max(0.05, size.x, size.y, size.z);
        const s = 2.65 / maxDim;

        const wrapper = new T.Group();
        built.position.sub(center);
        wrapper.add(built);
        wrapper.scale.setScalar(s);
        wrapper.updateMatrixWorld(true);
        return wrapper;
      } finally {
        creatureMat = savedMat;
      }
    }
  };
})(window.OC);
