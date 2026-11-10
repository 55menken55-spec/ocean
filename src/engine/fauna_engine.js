/* ================= ФАУНА: ЭКОСИСТЕМНЫЙ ИИ (BOIDS), ДЕНЬ/НОЧЬ, МЕГАФАУНА, ПЛАНКТОН ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  let fishMatInstanced = null;
  let fishMatBiolum = null;
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
    let anemoneHostFloor = biome.getHeight(cx, cz);

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
        const stations = ctx ? ctx.cleaningStations : null;

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

        t += stepDt;
        let hideInAnemone = false;
        if (isHostAnemone) {
          const dCamHost = Math.hypot(cx - camPos.x, cz - camPos.z);
          if (dCamHost < 15 && (camSpeed > 5.5 || flashOn)) hideInAnemone = true;
        }
        const effRadius = isHostAnemone ? (hideInAnemone ? 1.2 : 4.2) : radius * radiusMult;
        ang += (speed * activity / Math.max(8, effRadius)) * angDir * stepDt;
        const r = effRadius + Math.sin(t * 0.16) * (effRadius * 0.18);
        const ax = cx + Math.cos(ang) * r;
        const az = cz + Math.sin(ang) * r;
        const floorC = isHostAnemone ? anemoneHostFloor : biome.getHeight(ax, az);
        const ay = isHostAnemone
          ? OC.clamp(hideInAnemone ? floorC + 0.95 : floorC + 2.25 + Math.sin(t * 0.6) * 0.55, floorC + 0.75, -1.2)
          : OC.clamp(yDepth + depthShift + Math.sin(t * 0.25) * yAmp, floorC + 2.2, -1.4);
        anchor.set(ax, ay, az);

        // Определяем, активна ли рядом станция чистки
        let stationPullX = 0, stationPullY = 0, stationPullZ = 0, hasStation = false;
        if (isCleaner && stations && stations.length && dayW > 0.35) {
          for (let s = 0; s < stations.length; s++) {
            const st = stations[s];
            const dS = Math.hypot(st.x - ax, st.z - az);
            if (dS < st.radius * 2.2) {
              stationPullX = st.x; stationPullY = st.y; stationPullZ = st.z;
              hasStation = true;
              break;
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
              fx += (aliX * invN - vxi) * 1.15;
              fy += (aliY * invN - vyi) * 1.15;
              fz += (aliZ * invN - vzi) * 1.15;
              fx += (cohX * invN - x) * 0.65;
              fy += (cohY * invN - y) * 0.55;
              fz += (cohZ * invN - z) * 0.65;
            }
          }

          // Притяжение к патрулируемой точке зоны / станции чистки
          const hx = hasStation ? OC.lerp(anchor.x, stationPullX, 0.25) : anchor.x;
          const hy = hasStation ? OC.lerp(anchor.y, stationPullY, 0.25) : anchor.y;
          const hz = hasStation ? OC.lerp(anchor.z, stationPullZ, 0.25) : anchor.z;
          const hdx = hx - x, hdy = hy - y, hdz = hz - z;
          const hd = Math.hypot(hdx, hdy, hdz);
          if (hd > spread * 0.65) {
            const pull = (hd - spread * 0.65) * 0.35;
            fx += (hdx / hd) * pull;
            fy += (hdy / hd) * pull * 0.85;
            fz += (hdz / hd) * pull;
          }

          // Избегание хищников (акулы, барракуды, ночные крылатки)
          if (fullBoids && !isPredator && predators && predators.length) {
            for (let p = 0; p < predators.length; p++) {
              const pr = predators[p];
              const pdx = x - pr.x, pdy = y - pr.y, pdz = z - pr.z;
              const pd2 = pdx * pdx + pdy * pdy + pdz * pdz;
              if (pd2 < 576 && pd2 > 0.01) { // < 24 м
                const pd = Math.sqrt(pd2);
                const flee = (24 - pd) * 2.1;
                fx += (pdx / pd) * flee;
                fy += (pdy / pd) * flee * 0.6;
                fz += (pdz / pd) * flee;
                panic = 1.65;
              }
            }
          }

          // Реакция на дайвера / батискаф и прожектор
          if (fullBoids) {
            const cdx = x - camPos.x, cdy = y - camPos.y, cdz = z - camPos.z;
            const cd2 = cdx * cdx + cdy * cdy + cdz * cdz;
            if (shyness > 0 && cd2 < shyR2 && cd2 > 0.01) {
              const cd = Math.sqrt(cd2);
              const away = (shyR - cd) * 1.45 * shyness;
              fx += (cdx / cd) * away;
              fy += (cdy / cd) * away * 0.55;
              fz += (cdz / cd) * away;
              if (cd < 7) panic = Math.max(panic, 1.35);
            } else if (curious > 0 && camSpeed < 4.5 && !flashOn && cd2 < 529 && cd2 > 28) {
              const cd = Math.sqrt(cd2);
              fx -= (cdx / cd) * curious * 1.4;
              fy -= (cdy / cd) * curious * 0.7;
              fz -= (cdz / cd) * curious * 1.4;
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
        // Манты притормаживают, проходя рядом со станциями чистки
        let spd = opts.speed || 4.2;
        const stations = ctx ? ctx.cleaningStations : null;
        if (stations) {
          for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            if (Math.hypot(group.position.x - st.x, group.position.z - st.z) < st.radius * 1.4) {
              spd *= 0.62;
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
        const spd = OC.lerp(1.4, 2.2, dayW);
        t += dt;
        breathPhase += dt;
        ang += (spd / opts.r) * dt;
        turtlePos(ang, t, breathPhase, a);
        turtlePos(ang + 0.14, t + 0.4, breathPhase + 0.4, b);
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
    let inspectBlend = 0;

    return {
      key: isWhale ? 'shark_whale' : 'shark_reef',
      isActivePredator: !isWhale,
      getPosition: () => group.position,
      update(dt, time, camPos, ctx) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 760) { group.visible = false; return; }
        group.visible = true;
        const dayW = ctx ? ctx.dayW : 1.0;
        const flashOn = ctx ? ctx.flashOn : false;
        const nightBoost = isWhale ? 1.0 : OC.lerp(1.22, 1.0, dayW);
        t += dt;
        ang += ((opts.speed * nightBoost) / opts.r) * dir * dt;

        // Патрулирование по вытянутой восьмёрке вдоль рельефа + любопытный осмотр дайвера на 18 м
        const dCam = Math.hypot(camPos.x - opts.cx, camPos.z - opts.cz);
        const wantInspect = !isWhale && dCam < opts.r + 36 && camPos.y < -3.0;
        inspectBlend += ((wantInspect ? (flashOn ? 0.55 : 0.35) : 0) - inspectBlend) * Math.min(1, dt * 1.2);

        const patCx = OC.lerp(opts.cx, camPos.x, inspectBlend);
        const patCz = OC.lerp(opts.cz, camPos.z, inspectBlend);
        const patR = OC.lerp(opts.r + Math.sin(t * 0.18) * 14, 18.0, inspectBlend);

        const ax = patCx + Math.cos(ang) * patR * 0.85;
        const az = patCz + Math.sin(ang) * patR + Math.sin(ang * 2.0) * (isWhale ? 16 : 10) * (1 - inspectBlend);
        const bx = patCx + Math.cos(ang + 0.1 * dir) * patR * 0.85;
        const bz = patCz + Math.sin(ang + 0.1 * dir) * patR + Math.sin((ang + 0.1 * dir) * 2.0) * (isWhale ? 16 : 10) * (1 - inspectBlend);
        const baseY = OC.lerp(opts.y + Math.sin(t * 0.24) * 5, Math.min(-4, camPos.y + 1.5), inspectBlend);
        const ay = Math.max(baseY, biome.getHeight(ax, az) + 4);
        const by = Math.max(baseY + Math.sin(t * 0.24 + 0.2) * 1.5, biome.getHeight(bx, bz) + 4);
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

    function whalePos(angVal, tVal, out) {
      // Длинный эллиптический ход вдоль внешней стены + периодическое всплытие на поверхность
      const ax = opts.cx + Math.cos(angVal) * opts.r * 0.65;
      const az = opts.cz + Math.sin(angVal) * opts.r * 1.45;
      const cyc = tVal % 58.0;
      let breathRise = 0;
      if (cyc > 44.0 && cyc < 56.0) {
        breathRise = Math.sin(((cyc - 44.0) / 12.0) * Math.PI);
      }
      const deepY = Math.max(opts.y + Math.sin(tVal * 0.14) * 10, biome.getHeight(ax, az) + 12);
      const y = Math.min(-3.4, OC.lerp(deepY, -3.8, breathRise));
      return out.set(ax, y, az);
    }

    return {
      key: 'whale_humpback',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(opts.cx - camPos.x, opts.cz - camPos.z) > 950) { group.visible = false; return; }
        group.visible = true;
        t += dt;
        ang += (opts.speed / opts.r) * dt;
        whalePos(ang, t, a);
        whalePos(ang + 0.08, t + 1.2, b);
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

  /* ---------- Бесконечные пузыри, биолюминесцентный планктон и глубинный «морской снег» ---------- */
  function createCameraRelativeParticles(scene, n, tex, mode) {
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
          uScale: { value: 1.0 }
        }
      ]),
      vertexShader: `
        attribute float aPhase, aSize, aSpeed;
        uniform float uTime, uScale, uBio;
        uniform vec3 uCamPos, uFlowOffset;
        varying float vAlpha;
        #include <fog_pars_vertex>
        void main(){
          vec3 box = vec3(180.0, 110.0, 180.0);
          vec3 p = position + uFlowOffset;
          ${motionGLSL}
          vec3 rel = mod(p - uCamPos + box * 0.5, box) - box * 0.5;
          vec3 worldP = uCamPos + rel;
          // Не вылетаем над поверхностью моря (Y = 0)
          float belowWater = step(worldP.y, -0.35);
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

  /* ---------- Сборка фауны по экологическому плану биома (biome.faunaPlan) ---------- */
  OC.FaunaEngine = {
    init(scene, biome) {
      fishMatInstanced = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.48, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: 0.45, fishSwim: true });

      fishMatBiolum = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true,
        emissive: new T.Color(0x2ce8ff),
        emissiveIntensity: 0.45,
        roughness: 0.42,
        metalness: 0.08,
        side: T.DoubleSide
      }), { causticStrength: 0.25, fishSwim: true });

      creatureMat = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.52, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: 0.55 });

      const plan = biome.faunaPlan || {};
      const agents = [];
      const schools = [];
      const predatorAgents = [];
      const sonarTargets = [];

      const schoolsSpec = plan.schools || [];
      for (const s of schoolsSpec) {
        const sch = makeSchool(scene, biome, s);
        schools.push(sch);
        agents.push(sch);
        if (sch.isPredator) predatorAgents.push(sch);
        sonarTargets.push(sch);
      }

      for (const sf of (plan.soloFish || [])) {
        const a = makeSoloFish(scene, biome, sf);
        agents.push(a);
      }

      for (const lf of (plan.lionfish || [])) {
        const a = makeLionfish(scene, biome, lf);
        agents.push(a);
        predatorAgents.push(a);
        sonarTargets.push(a);
      }

      for (const oct of (plan.octopus || [])) {
        agents.push(makeOctopus(scene, biome, oct));
      }

      for (const mor of (plan.moray || [])) {
        agents.push(makeMoray(scene, biome, mor));
      }

      for (const j of (plan.jellies || [])) {
        agents.push(makeJelly(scene, j));
      }

      for (const dg of (plan.dugongs || [])) {
        const a = makeDugong(scene, biome, dg);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const tu of (plan.turtles || [])) {
        const a = makeTurtle(scene, biome, tu);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const ry of (plan.rays || [])) {
        const a = makeRay(scene, biome, ry);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const mn of (plan.mantas || [])) {
        const a = makeManta(scene, biome, mn);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const sh of (plan.sharks || [])) {
        const a = makeShark(scene, biome, sh);
        agents.push(a);
        if (a.isActivePredator) predatorAgents.push(a);
        sonarTargets.push(a);
      }

      let whale = null;
      for (const wh of (plan.whales || [])) {
        const w = makeHumpbackWhale(scene, biome, wh);
        if (!whale) whale = w;
        agents.push(w);
        sonarTargets.push(w);
      }

      // ---- Пузыри, планктон и глубинный морской снег (вокруг камеры) ----
      const pCountMult = OC.Quality.get().particlesScale;
      const texSoft = OC.circleTexture(64, false);
      const texHard = OC.circleTexture(64, true);
      const bubbleMat = createCameraRelativeParticles(scene, Math.round(900 * pCountMult), texHard, 'bubbles');
      const planktonMat = createCameraRelativeParticles(scene, Math.round(1500 * pCountMult), texSoft, 'plankton');
      const snowMat = createCameraRelativeParticles(scene, Math.round(1050 * pCountMult), texSoft, 'snow');

      const bioPlanktonCol = new T.Color(0x52f2ff);
      const dayPlanktonCol = new T.Color(0x9be8ff);

      const predatorsBuf = [];
      const updateCtx = {
        dayW: 1.0,
        camSpeed: 0,
        flashOn: false,
        predators: predatorsBuf,
        cleaningStations: plan.cleaningStations || [],
        frameIdx: 0
      };
      const _scanSample = new T.Vector3();
      const _toTarget = new T.Vector3();
      const _currFlow = new T.Vector3();
      const _flowAccum = new T.Vector3();

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
        update(dt, time, camPos, camSpeed, flashOn) {
          const pal = OC.getPalette();
          const dayW = pal && typeof pal.dayW === 'number' ? pal.dayW : 1.0;

          updateCtx.dayW = dayW;
          updateCtx.camSpeed = camSpeed || 0;
          updateCtx.flashOn = !!flashOn;
          updateCtx.frameIdx++;

          // Собираем активных хищников в переиспользуемый массив (без мусорных аллокаций)
          predatorsBuf.length = 0;
          for (let i = 0; i < predatorAgents.length; i++) {
            const pa = predatorAgents[i];
            if (pa.isNocturnalPredator && dayW > 0.55) continue;
            const p = pa.getPosition ? pa.getPosition() : null;
            if (p) predatorsBuf.push(p);
          }

          if (fishMatBiolum) {
            fishMatBiolum.emissiveIntensity = OC.lerp(1.45, 0.25, dayW) + (pal.bioGlow || 0) * 0.45;
          }

          for (let i = 0; i < agents.length; i++) {
            agents[i].update(dt, time, camPos, updateCtx);
          }

          bubbleMat.uniforms.uCamPos.value.copy(camPos);
          planktonMat.uniforms.uCamPos.value.copy(camPos);
          snowMat.uniforms.uCamPos.value.copy(camPos);

          // Плавная адвекция планктона, пузырей и морского снега по локальному течению
          if (biome.getCurrentAt && camPos.y < 1.5) {
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
        },
        setScale(s) {
          bubbleMat.uniforms.uScale.value = s;
          planktonMat.uniforms.uScale.value = s;
          snowMat.uniforms.uScale.value = s;
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
              const enc = biome.encyclopedia[tgt.key];
              bestLabel = enc ? enc[0] : (tgt.key || 'Морской объект');
            }
          }

          return {
            hit: bestDist <= maxR,
            range: bestDist <= maxR ? bestDist : maxR,
            kind: bestKind,
            label: bestLabel
          };
        }
      };
    }
  };
})(window.OC);
