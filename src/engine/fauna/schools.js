/* ================= ФАУНА: ПРОЦЕДУРНЫЕ РЫБЫ, КОСЯКИ (BOIDS) И ОДИНОЧНЫЕ РИФОВЫЕ ВИДЫ ================= */
window.OC = window.OC || {};
window.OC._FaunaCtx = window.OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const ECO_STORAGE_KEY = 'oc_ocean_ecosystem_v1';
  const ECO_RECOVERY_PER_SEC = 0.00045; // ~37 минут до полного восстановления без новых потерь
  let ecoPopulations = null;
  let lastEcoSave = 0;

  function getEcoPopulations() {
    if (ecoPopulations) return ecoPopulations;
    ecoPopulations = {};
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = JSON.parse(localStorage.getItem(ECO_STORAGE_KEY) || '{}');
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) ecoPopulations = saved;
      }
    } catch (e) { /* повреждённое или недоступное хранилище не блокирует симуляцию */ }
    return ecoPopulations;
  }

  function saveEcoPopulations(force) {
    const now = Date.now();
    if (!force && now - lastEcoSave < 15000) return;
    lastEcoSave = now;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(ECO_STORAGE_KEY, JSON.stringify(getEcoPopulations()));
    } catch (e) { /* симуляция продолжает работать и без сохранения */ }
  }

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

    /* глаза (у слепых пещерных видов eyeScale === 0) */
    if (o.eyeScale > 0) {
      const eyeG = new T.SphereGeometry(o.height * 0.085 * o.eyeScale, 6, 5);
      OC.geoPrep(eyeG);
      OC.paint(eyeG, 0x0a0a0a);
      const e1 = eyeG.clone(); OC.xform(e1, { p: [o.len * 0.33, o.height * 0.12, o.width * 0.40] });
      const e2 = eyeG.clone(); OC.xform(e2, { p: [o.len * 0.33, o.height * 0.12, -o.width * 0.40] });
      list.push(e1, e2);
    }

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
    const dvmAmp = opts.dvmAmp || 4.5;
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

    const mat = isBiolum ? OC._FaunaCtx.fishMatBiolum : OC._FaunaCtx.fishMatInstanced;
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
    anchor.schoolKey = opts.key || 'fish_blue';
    const matArr = mesh.instanceMatrix.array;
    const isHostAnemone = !!opts.hostAnemone;
    const isPrey = !isPredator && !isCleaner && !isHostAnemone && !isBiolum;
    let anemoneHostFloor = biome.getHeight(cx, cz);
    let huntTimer = 0;
    let huntCooldown = 8 + rng() * 14;
    let huntTarget = null;
    let schoolPanic = 0;
    let qualityScale = OC.Quality.get().fishScale;
    const populationKey = biome.id + '|' + (opts.key || 'fish_blue') + '|' + Math.round(cx) + '|' + Math.round(cz);
    const populationStore = getEcoPopulations();
    let populationState = isPrey ? populationStore[populationKey] : null;
    if (!populationState || !Number.isFinite(populationState.ratio)) {
      populationState = { ratio: 1, updatedAt: Date.now() };
      if (isPrey) populationStore[populationKey] = populationState;
    } else {
      const elapsed = OC.clamp((Date.now() - (populationState.updatedAt || Date.now())) / 1000, 0, 30 * 24 * 60 * 60);
      populationState.ratio = OC.clamp(populationState.ratio + elapsed * ECO_RECOVERY_PER_SEC, 0, 1);
      populationState.updatedAt = Date.now();
    }

    function syncSchoolCount() {
      const nextN = isPrey
        ? OC.clamp(Math.round(Math.max(6, baseN * qualityScale) * populationState.ratio), 0, maxN)
        : OC.clamp(Math.round(baseN * qualityScale), 6, maxN);
      if (nextN !== n) {
        n = nextN;
        mesh.count = n;
      }
    }

    function applyPredation() {
      if (!isPrey || populationState.ratio <= 0) return;
      const now = Date.now();
      const elapsed = OC.clamp((now - (populationState.updatedAt || now)) / 1000, 0, 30 * 24 * 60 * 60);
      populationState.ratio = OC.clamp(populationState.ratio + elapsed * ECO_RECOVERY_PER_SEC - 0.055, 0, 1);
      populationState.updatedAt = now;
      syncSchoolCount();
      saveEcoPopulations(true);
    }

    syncSchoolCount();
    if (isPrey) anchor.applyPredation = applyPredation;

    // Если это семья рыб-клоунов, ставим реальную актинию-хозяина прямо на дно в центре территории
    if (isHostAnemone) {
      const anemG = new T.Group();
      const baseM = new T.Mesh(new T.CylinderGeometry(1.05, 1.35, 0.55, 10), OC._FaunaCtx.creatureMat);
      OC.geoPrep(baseM.geometry);
      OC.paint(baseM.geometry, 0xb84086);
      baseM.position.y = 0.25;
      anemG.add(baseM);
      for (let ti = 0; ti < 10; ti++) {
        const ta = (ti / 10) * Math.PI * 2;
        const tGeo = new T.ConeGeometry(0.16, 1.15, 5);
        OC.geoPrep(tGeo);
        OC.paint(tGeo, (x, y, z, c) => c.set(y > 0.2 ? 0xff7ae0 : 0xa03888));
        const tm = new T.Mesh(tGeo, OC._FaunaCtx.creatureMat);
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
        qualityScale = mult;
        syncSchoolCount();
      },
      getCount: () => n,
      update(dt, time, camPos, ctx) {
        if (isPrey && populationState.ratio < 1) {
          const simDt = Math.max(0, Math.min(0.25, dt || 0));
          populationState.ratio = Math.min(1, populationState.ratio + simDt * ECO_RECOVERY_PER_SEC);
          populationState.updatedAt = Date.now();
          syncSchoolCount();
          saveEcoPopulations(false);
        }
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
          depthShift = OC.lerp(dvmAmp, -dvmAmp * 0.85, dayW); // ночью поднимаются охотиться, днём опускаются глубже
          radiusMult = OC.lerp(1.25, 0.6, dayW);
        } else {
          activity = OC.lerp(0.85, 1.05, dayW);
        }
        if (ctx && ctx.fishActivity !== undefined) {
          activity *= ctx.fishActivity;
          if (ctx.fishActivity < 0.72) depthShift -= (0.72 - ctx.fishActivity) * 4.0;
        }
        if (ctx && ctx.season) {
          activity *= ctx.season.faunaActivity || 1.0;
          if (opts.seasonalDepth) depthShift -= ctx.season.warmFactor * opts.seasonalDepth;
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
                if (bestP.applyPredation) bestP.applyPredation();
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
        if (biome.getCeilingHeight) {
          const chA = biome.getCeilingHeight(ax, az);
          if (chA < 20.0) ay = Math.min(ay, Math.max(floorC + 2.2, chA - 2.0));
        }

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

          // Раннее оповещение и бегство от подводного вулкана (редкие события, см. engine/volcano.js)
          const volcInf = ctx ? ctx.volcano : null;
          if (volcInf && volcInf.active && !isPredator) {
            const vdx = x - volcInf.x, vdz = z - volcInf.z;
            const vd2 = vdx * vdx + vdz * vdz;
            if (vd2 < volcInf.r * volcInf.r && vd2 > 0.01) {
              const vd = Math.sqrt(vd2);
              const edge = OC.smoothstep(volcInf.r, volcInf.r * 0.45, vd);
              const pulse = volcInf.strength * edge;
              fx += (vdx / vd) * pulse;
              fz += (vdz / vd) * pulse;
              panic = Math.max(panic, volcInf.panic * edge + 0.2);
            }
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
          let maxFishY = -1.3;
          if (biome.getCeilingHeight) {
            const chF = biome.getCeilingHeight(x, z);
            if (chF < 20.0) maxFishY = Math.min(maxFishY, chF - 1.6);
          }
          if (y > maxFishY) fy -= (y - maxFishY) * 11.0;

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
    const mesh = new T.Mesh(geo, OC._FaunaCtx.creatureMat);
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
    group.add(new T.Mesh(bodyG, OC._FaunaCtx.creatureMat));

    // Веер длинных ядовитых лучей
    for (let i = 0; i < 12; i++) {
      const sp = new T.CylinderGeometry(0.015, 0.045, 1.35, 4);
      OC.geoPrep(sp);
      OC.paint(sp, i % 2 === 0 ? 0xffebe0 : 0x8f1d18);
      const m = new T.Mesh(sp, OC._FaunaCtx.creatureMat);
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

  OC._FaunaBuilders.makeFishGeo = makeFishGeo;
  OC._FaunaBuilders.makeSchool = makeSchool;
  OC._FaunaBuilders.makeSoloFish = makeSoloFish;
  OC._FaunaBuilders.makeLionfish = makeLionfish;
})(window.OC);
