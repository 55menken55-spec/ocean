/* ================= 3D-ГЛОБУС ПЛАНЕТЫ И МАРШРУТЫ ЭКСПЕДИЦИЙ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const GLOBE_R = 1.42;

  const CONTINENTS = [
    // Северная Америка
    [
      [-168, 65], [-162, 70], [-140, 70], [-126, 71], [-108, 72], [-95, 70], [-82, 67],
      [-78, 62], [-66, 60], [-56, 52], [-60, 46], [-70, 42], [-76, 35], [-81, 30],
      [-80, 25], [-83, 29], [-90, 29], [-97, 26], [-96, 19], [-90, 21], [-87, 21],
      [-84, 15], [-82, 9], [-78, 8], [-85, 11], [-93, 15], [-105, 20], [-110, 24],
      [-114, 31], [-117, 32], [-122, 37], [-124, 42], [-125, 49], [-134, 57], [-148, 60],
      [-160, 56], [-166, 60]
    ],
    // Баффинова Земля и арктический архипелаг
    [[-85, 73], [-72, 74], [-63, 68], [-67, 63], [-78, 64], [-86, 69]],
    // Гренландия
    [[-60, 76], [-44, 82], [-20, 81], [-19, 71], [-34, 66], [-44, 60], [-53, 66], [-56, 73]],
    // Южная Америка
    [
      [-78, 9], [-72, 12], [-62, 10], [-50, 1], [-35, -6], [-39, -15], [-42, -23],
      [-49, -28], [-54, -34], [-62, -41], [-66, -48], [-69, -55], [-74, -52],
      [-74, -42], [-72, -31], [-71, -18], [-81, -5], [-80, 2]
    ],
    // Африка
    [
      [-17, 15], [-13, 28], [-6, 36], [10, 37], [15, 32], [32, 31], [35, 26],
      [43, 12], [51, 12], [46, 2], [40, -10], [35, -24], [28, -33], [18, -35],
      [14, -22], [12, -10], [9, 4], [2, 6], [-8, 5], [-16, 11]
    ],
    // Мадагаскар
    [[49, -12], [50, -19], [46, -25], [44, -22], [46, -15]],
    // Евразия
    [
      [-9, 37], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [6, 60], [16, 69],
      [29, 71], [44, 67], [60, 70], [74, 73], [104, 77], [136, 72], [168, 69], [179, 65],
      [163, 59], [156, 51], [142, 54], [136, 44], [129, 36], [126, 38], [121, 39],
      [122, 31], [114, 22], [108, 17], [109, 12], [104, 8], [103, 1], [100, 5],
      [97, 16], [90, 22], [80, 10], [77, 8], [72, 20], [67, 24], [58, 25],
      [51, 26], [59, 22], [53, 16], [44, 13], [35, 29], [35, 36], [27, 37],
      [23, 38], [16, 40], [13, 45], [8, 44], [3, 42], [-5, 36]
    ],
    // Великобритания и Ирландия
    [[-5, 50], [-6, 56], [-2, 59], [1, 53], [1, 51]],
    // Япония
    [[130, 32], [136, 35], [141, 38], [145, 44], [140, 42], [135, 36]],
    // Суматра и Ява
    [[96, 5], [105, -2], [114, -8], [106, -7], [99, 0]],
    // Калимантан и Новая Гвинея
    [[110, 1], [118, 6], [118, -3], [111, -3]],
    [[132, -2], [141, -3], [150, -10], [142, -9], [135, -5]],
    // Австралия
    [
      [114, -22], [122, -17], [131, -12], [136, -12], [137, -15], [141, -16],
      [142, -11], [146, -17], [151, -24], [153, -29], [150, -37], [144, -38],
      [136, -35], [129, -32], [121, -34], [115, -34], [113, -26]
    ],
    // Новая Зеландия
    [[167, -46], [174, -41], [178, -37], [173, -35], [172, -41]],
    // Антарктида
    [
      [-180, -72], [-130, -74], [-80, -72], [-58, -64], [-40, -73], [10, -70],
      [60, -68], [110, -67], [155, -71], [180, -72], [180, -90], [-180, -90]
    ]
  ];

  function lonX(lon, w) {
    return ((lon + 180) / 360) * w;
  }
  function latY(lat, h) {
    return ((90 - lat) / 180) * h;
  }

  function tracePoly(ctx, pts, w, h) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = lonX(pts[i][0], w);
      const y = latY(pts[i][1], h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function createEarthTextures() {
    const w = 768, h = 384;
    const cColor = document.createElement('canvas');
    cColor.width = w; cColor.height = h;
    const ctx = cColor.getContext('2d');

    const cSpec = document.createElement('canvas');
    cSpec.width = w; cSpec.height = h;
    const sctx = cSpec.getContext('2d');

    if (ctx) {
      // Глубоководный океанический градиент по широтам
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0.0, '#143854');
      grad.addColorStop(0.18, '#0c2f4d');
      grad.addColorStop(0.5, '#09436b');
      grad.addColorStop(0.82, '#0a2d4c');
      grad.addColorStop(1.0, '#153a56');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Подводные хребты и абиссальные бассейны (лёгкие батиметрические пятна)
      const trenches = [
        [-105, 5, 110, 62, 'rgba(30,130,175,0.22)'],
        [-30, 15, 70, 120, 'rgba(28,125,175,0.18)'],
        [145, -16, 65, 55, 'rgba(42,200,210,0.28)'],
        [135, 8, 52, 42, 'rgba(62,210,210,0.26)'],
        [-68, 73, 55, 28, 'rgba(85,195,235,0.24)'],
        [-122, 36, 48, 36, 'rgba(35,175,185,0.24)']
      ];
      for (let i = 0; i < trenches.length; i++) {
        const t = trenches[i];
        const cx = lonX(t[0], w), cy = latY(t[1], h);
        const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, t[2]);
        rg.addColorStop(0, t[4]);
        rg.addColorStop(1, 'rgba(9,45,76,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(cx - t[2], cy - t[3], t[2] * 2, t[3] * 2);
      }

      // Координатная сетка меридианов и параллелей
      ctx.strokeStyle = 'rgba(120,215,255,0.11)';
      ctx.lineWidth = 1;
      for (let lon = -150; lon <= 150; lon += 30) {
        const x = lonX(lon, w);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = latY(lat, h);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(88,224,255,0.26)';
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.5); ctx.stroke();
      ctx.setLineDash([]);

      // Шельфовое бирюзовое свечение вокруг материков
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(60,215,225,0.34)';
      ctx.lineWidth = 8;
      for (let i = 0; i < CONTINENTS.length - 1; i++) {
        tracePoly(ctx, CONTINENTS[i], w, h);
        ctx.stroke();
      }

      // Континенты
      const landGrad = ctx.createLinearGradient(0, 0, 0, h);
      landGrad.addColorStop(0.0, '#cfe6ee');
      landGrad.addColorStop(0.22, '#3c6b63');
      landGrad.addColorStop(0.5, '#5b7a58');
      landGrad.addColorStop(0.75, '#4b6b5c');
      landGrad.addColorStop(1.0, '#d8eef5');

      ctx.fillStyle = landGrad;
      ctx.strokeStyle = 'rgba(175,240,255,0.55)';
      ctx.lineWidth = 1.1;
      for (let i = 0; i < CONTINENTS.length; i++) {
        tracePoly(ctx, CONTINENTS[i], w, h);
        if (i === CONTINENTS.length - 1 || i === 2 || i === 1) {
          ctx.fillStyle = '#c9e4ef';
        } else {
          ctx.fillStyle = landGrad;
        }
        ctx.fill();
        ctx.stroke();
      }

      // Северный паковый лёд
      const iceGrad = ctx.createLinearGradient(0, 0, 0, h * 0.14);
      iceGrad.addColorStop(0, 'rgba(220,245,255,0.92)');
      iceGrad.addColorStop(1, 'rgba(180,228,245,0)');
      ctx.fillStyle = iceGrad;
      ctx.fillRect(0, 0, w, h * 0.14);
    }

    if (sctx) {
      sctx.fillStyle = '#d4f2ff';
      sctx.fillRect(0, 0, w, h);
      sctx.fillStyle = '#18242e';
      for (let i = 0; i < CONTINENTS.length; i++) {
        tracePoly(sctx, CONTINENTS[i], w, h);
        sctx.fill();
      }
    }

    const map = new T.CanvasTexture(cColor);
    map.anisotropy = 4;
    const specMap = new T.CanvasTexture(cSpec);
    return { map, specMap };
  }

  function latLonToVec3(lat, lon, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new T.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );
  }

  function createAtmosphereMaterial() {
    return new T.ShaderMaterial({
      uniforms: {
        uColor: { value: new T.Color(0x4be3ff) }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec3 vView;',
        'void main(){',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vNormal = normalize(normalMatrix * normal);',
        '  vView = normalize(-mv.xyz);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor;',
        'varying vec3 vNormal;',
        'varying vec3 vView;',
        'void main(){',
        '  float d = clamp(dot(normalize(vNormal), -normalize(vView)), 0.0, 1.0);',
        '  float rim = pow(smoothstep(0.0, 0.44, d), 1.55);',
        '  gl_FragColor = vec4(uColor, rim * 0.78);',
        '}'
      ].join('\n'),
      side: T.BackSide,
      blending: T.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
  }

  let modalEl = null;
  let canvasEl = null;
  let listEl = null;
  let hoverTipEl = null;
  let titleEl = null;
  let oceanEl = null;
  let coordsEl = null;
  let depthEl = null;
  let tempEl = null;
  let progressEl = null;
  let summaryEl = null;
  let goBtn = null;
  let tourBtn = null;

  let renderer = null;
  let scene = null;
  let camera = null;
  let earthGroup = null;
  let orbitRing = null;
  let raycaster = null;
  let rafId = 0;
  let stageFailed = false;
  let isOpenState = false;

  const beacons = [];
  const beaconById = Object.create(null);
  let selectedId = null;
  let hoveredId = null;

  let rotY = 0;
  let rotX = 0.25;
  let targetRotY = 0;
  let targetRotX = 0.25;
  let dragging = false;
  let downX = 0;
  let downY = 0;
  let movedPx = 0;
  let autoSpinPauseUntil = 0;
  const ptr = new T.Vector2();

  let callbacks = {
    getActiveBiomeId: null,
    onSelectBiome: null,
    getProgress: null
  };

  function collectBiomes() {
    const list = (OC.Biomes && OC.Biomes.list) ? OC.Biomes.list() : [];
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (!b || !b.globe) continue;
      const pos = latLonToVec3(b.globe.lat, b.globe.lon, GLOBE_R + 0.015);
      out.push({
        biome: b,
        id: b.id,
        lat: b.globe.lat,
        lon: b.globe.lon,
        pos,
        colorHex: b.globe.color || '#58e0ff'
      });
    }
    return out;
  }

  function ensureStage() {
    if (renderer || stageFailed || !canvasEl) return !!renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(canvasEl.clientWidth || 420, canvasEl.clientHeight || 380, false);

      scene = new T.Scene();
      camera = new T.PerspectiveCamera(36, (canvasEl.clientWidth || 420) / (canvasEl.clientHeight || 380), 0.1, 40);
      camera.position.set(0, 0.18, 4.15);
      camera.lookAt(0, 0, 0);

      const amb = new T.AmbientLight(0x88b4cc, 0.78);
      const hemi = new T.HemisphereLight(0x9be2ff, 0x102840, 0.65);
      const sun = new T.DirectionalLight(0xfff4e0, 1.35);
      sun.position.set(4.5, 2.8, 5.2);
      const rim = new T.DirectionalLight(0x40b8ff, 0.42);
      rim.position.set(-4.0, -2.0, -3.0);
      scene.add(amb, hemi, sun, rim);

      // Звёзды космоса
      const starCount = 260;
      const starPos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const th = 2 * Math.PI * u;
        const ph = Math.acos(2 * v - 1);
        const r = 10 + Math.random() * 6;
        starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        starPos[i * 3 + 1] = r * Math.cos(ph);
        starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      const starGeo = new T.BufferGeometry();
      starGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
      const starMat = new T.PointsMaterial({ color: 0xcbeeff, size: 0.06, transparent: true, opacity: 0.72 });
      scene.add(new T.Points(starGeo, starMat));

      earthGroup = new T.Group();
      scene.add(earthGroup);

      const tex = createEarthTextures();
      const earthGeo = new T.SphereGeometry(GLOBE_R, 48, 32);
      const earthMat = new T.MeshPhongMaterial({
        map: tex.map,
        specularMap: tex.specMap,
        specular: new T.Color(0x52c4e8),
        shininess: 32,
        emissive: new T.Color(0x06192c),
        emissiveIntensity: 0.45
      });
      earthGroup.add(new T.Mesh(earthGeo, earthMat));

      // Атмосферное гало
      const atmoGeo = new T.SphereGeometry(GLOBE_R * 1.07, 40, 28);
      scene.add(new T.Mesh(atmoGeo, createAtmosphereMaterial()));

      // Орбитальное научное кольцо
      const ringGeo = new T.TorusGeometry(GLOBE_R * 1.21, 0.0045, 8, 96);
      const ringMat = new T.MeshBasicMaterial({ color: 0x58e0ff, transparent: true, opacity: 0.25 });
      orbitRing = new T.Mesh(ringGeo, ringMat);
      orbitRing.rotation.x = Math.PI * 0.42;
      orbitRing.rotation.y = 0.28;
      scene.add(orbitRing);

      // Маяки 7 биомов + соединительные дуги маршрутов
      buildBeaconsOnGlobe();

      raycaster = new T.Raycaster();
      return true;
    } catch (err) {
      stageFailed = true;
      return false;
    }
  }

  function buildBeaconsOnGlobe() {
    if (!earthGroup) return;
    const items = beacons.length ? beacons : collectBiomes();
    const up = new T.Vector3(0, 1, 0);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const col = new T.Color(it.colorHex);
      const nrm = it.pos.clone().normalize();
      const g = new T.Group();
      g.position.copy(it.pos);
      g.quaternion.setFromUnitVectors(up, nrm);

      const core = new T.Mesh(
        new T.SphereGeometry(0.042, 16, 12),
        new T.MeshBasicMaterial({ color: col })
      );
      core.position.y = 0.02;

      const spire = new T.Mesh(
        new T.CylinderGeometry(0.005, 0.015, 0.17, 10),
        new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.78 })
      );
      spire.position.y = 0.095;

      const halo = new T.Mesh(
        new T.RingGeometry(0.056, 0.088, 28),
        new T.MeshBasicMaterial({ color: col, side: T.DoubleSide, transparent: true, opacity: 0.85 })
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.012;

      const hit = new T.Mesh(
        new T.SphereGeometry(0.15, 10, 10),
        new T.MeshBasicMaterial({ visible: false })
      );
      hit.position.y = 0.06;
      hit.userData.biomeId = it.id;

      g.add(core, spire, halo, hit);
      earthGroup.add(g);

      it.group = g;
      it.core = core;
      it.spire = spire;
      it.halo = halo;
      it.hit = hit;
    }

    // Соединяем 7 точек планеты дугами глобальной экспедиции
    const orderIds = ['great_barrier_reef', 'wreck_atoll', 'mariana_trench', 'kelp_forest', 'brine_pool', 'hydrothermal_vents', 'arctic_sea'];
    const ordered = [];
    for (let i = 0; i < orderIds.length; i++) {
      if (beaconById[orderIds[i]]) ordered.push(beaconById[orderIds[i]]);
    }
    if (ordered.length > 1) {
      const arcMat = new T.MeshBasicMaterial({ color: 0x58e0ff, transparent: true, opacity: 0.34 });
      for (let i = 0; i < ordered.length; i++) {
        const a = ordered[i];
        const b = ordered[(i + 1) % ordered.length];
        const mid = a.pos.clone().add(b.pos).multiplyScalar(0.5);
        if (mid.lengthSq() < 0.01) mid.set(0, 1, 0);
        mid.normalize().multiplyScalar(GLOBE_R * 1.24);
        const curve = new T.CatmullRomCurve3([a.pos.clone(), mid, b.pos.clone()]);
        const arc = new T.Mesh(new T.TubeGeometry(curve, 26, 0.006, 6, false), arcMat);
        earthGroup.add(arc);
      }
    }
  }

  function syncBeaconListData() {
    if (beacons.length) return;
    const list = collectBiomes();
    for (let i = 0; i < list.length; i++) {
      beacons.push(list[i]);
      beaconById[list[i].id] = list[i];
    }
  }

  function resizeCanvas() {
    if (!renderer || !canvasEl || !camera) return;
    const w = canvasEl.clientWidth || 420;
    const h = canvasEl.clientHeight || 380;
    if (w < 10 || h < 10) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function renderSelectedInfo() {
    const it = beaconById[selectedId] || beacons[0];
    if (!it) return;
    const b = it.biome;
    const g = b.globe;
    const activeId = callbacks.getActiveBiomeId ? callbacks.getActiveBiomeId() : null;
    const prog = callbacks.getProgress ? callbacks.getProgress(b.id) : null;

    if (titleEl) titleEl.textContent = b.name;
    if (oceanEl) oceanEl.textContent = g.ocean || b.region;
    if (coordsEl) coordsEl.textContent = g.coordLabel || `${g.lat.toFixed(1)}°, ${g.lon.toFixed(1)}°`;
    if (depthEl) depthEl.textContent = g.depthSpan || '—';
    if (tempEl) tempEl.textContent = g.tempSpan || '—';
    if (summaryEl) summaryEl.textContent = g.summary || b.subtitle;

    if (progressEl) {
      if (prog) {
        const legsCount = (b.tourLegs && b.tourLegs.length) || 0;
        progressEl.textContent = `Атлас: ${prog.discovered}/${prog.speciesTotal} · Миссии: ${prog.missionsDone}/${prog.missionsTotal} · Этапов гида: ${legsCount}`;
      } else {
        const legsCount = (b.tourLegs && b.tourLegs.length) || 0;
        progressEl.textContent = `Этапов гид-тура: ${legsCount}`;
      }
    }

    if (goBtn) {
      goBtn.textContent = b.id === activeId ? 'Вы уже здесь (Закрыть)' : 'Перейти в биом';
    }
    if (tourBtn) {
      tourBtn.textContent = b.id === activeId ? 'Запустить гид-тур здесь' : 'Перейти и начать гид-тур';
    }

    if (listEl) {
      listEl.innerHTML = '';
      for (let i = 0; i < beacons.length; i++) {
        const item = beacons[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'globe-loc' + (item.id === it.id ? ' on' : '') + (item.id === activeId ? ' cur' : '');
        const p = callbacks.getProgress ? callbacks.getProgress(item.id) : null;
        const badge = item.id === activeId ? 'Текущий' : (p ? `${p.discovered}/${p.speciesTotal}` : item.biome.globe.coordLabel);
        btn.innerHTML = `<span class="globe-dot" style="background:${item.colorHex};box-shadow:0 0 8px ${item.colorHex}"></span>` +
          `<span class="globe-loc-txt"><b>${item.biome.name}</b><small>${item.biome.globe.ocean}</small></span>` +
          `<span class="globe-loc-meta">${badge}</span>`;
        btn.addEventListener('click', () => {
          focusBiome(item.id, true);
        });
        listEl.appendChild(btn);
      }
    }
  }

  function focusBiome(id, pauseAuto) {
    syncBeaconListData();
    const it = beaconById[id] || beacons[0];
    if (!it) return null;
    selectedId = it.id;

    // Поворачиваем Землю так, чтобы точка (lat, lon) оказалась напротив камеры (+Z)
    targetRotY = -Math.atan2(it.pos.x, it.pos.z);
    targetRotX = OC.clamp((it.lat * Math.PI) / 180, -1.25, 1.25);
    if (pauseAuto) autoSpinPauseUntil = performance.now() + 5500;

    renderSelectedInfo();
    return it;
  }

  function pickBeaconAt(clientX, clientY) {
    if (!raycaster || !camera || !canvasEl) return null;
    const rect = canvasEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    ptr.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ptr.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ptr, camera);
    const hitsTargets = [];
    for (let i = 0; i < beacons.length; i++) {
      if (beacons[i].hit) hitsTargets.push(beacons[i].hit);
    }
    const hits = raycaster.intersectObjects(hitsTargets, false);
    if (hits.length && hits[0].object.userData.biomeId) {
      return hits[0].object.userData.biomeId;
    }
    return null;
  }

  function tick(now) {
    if (!isOpenState) return;
    rafId = requestAnimationFrame(tick);

    const t = now * 0.001;
    if (!dragging && now > autoSpinPauseUntil) {
      targetRotY += 0.0018;
    }

    // Короткий путь по углу Y
    const dy = ((((targetRotY - rotY) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    rotY += dy * 0.12;
    rotX += (targetRotX - rotX) * 0.12;

    if (earthGroup) {
      earthGroup.rotation.y = rotY;
      earthGroup.rotation.x = rotX;
    }
    if (orbitRing) {
      orbitRing.rotation.z = t * 0.12;
    }

    // Пульсация маяков: выбранный маяк ярче и крупнее
    const activeId = callbacks.getActiveBiomeId ? callbacks.getActiveBiomeId() : null;
    for (let i = 0; i < beacons.length; i++) {
      const b = beacons[i];
      if (!b.halo || !b.core || !b.spire) continue;
      const isSel = b.id === selectedId;
      const isHov = b.id === hoveredId;
      const isAct = b.id === activeId;
      const pulse = 1 + Math.sin(t * 3.4 + i * 1.1) * (isSel ? 0.34 : 0.16);
      const s = (isSel ? 1.55 : isHov ? 1.35 : isAct ? 1.2 : 1.0) * pulse;
      b.halo.scale.set(s, s, 1);
      b.halo.material.opacity = isSel ? 0.95 : isHov ? 0.85 : 0.55;
      const cs = isSel ? 1.45 : isHov ? 1.25 : 1.0;
      b.core.scale.set(cs, cs, cs);
      b.spire.scale.y = isSel ? 1.45 : 1.0;
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function bindEvents() {
    if (!canvasEl) return;

    canvasEl.addEventListener('pointerdown', (e) => {
      dragging = true;
      downX = e.clientX;
      downY = e.clientY;
      movedPx = 0;
      autoSpinPauseUntil = performance.now() + 6000;
      try { canvasEl.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });

    canvasEl.addEventListener('pointermove', (e) => {
      if (dragging) {
        const dx = e.clientX - downX;
        const dy = e.clientY - downY;
        movedPx += Math.abs(dx) + Math.abs(dy);
        downX = e.clientX;
        downY = e.clientY;
        targetRotY += dx * 0.0085;
        targetRotX = OC.clamp(targetRotX + dy * 0.007, -1.28, 1.28);
        autoSpinPauseUntil = performance.now() + 6000;
        return;
      }
      const hitId = pickBeaconAt(e.clientX, e.clientY);
      hoveredId = hitId;
      canvasEl.style.cursor = hitId ? 'pointer' : 'grab';
      if (hoverTipEl) {
        if (hitId && beaconById[hitId]) {
          const b = beaconById[hitId].biome;
          hoverTipEl.textContent = `${b.name} · ${b.globe.coordLabel}`;
          hoverTipEl.classList.remove('hidden');
        } else {
          hoverTipEl.classList.add('hidden');
        }
      }
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      if (movedPx < 7) {
        const hitId = pickBeaconAt(e.clientX, e.clientY);
        if (hitId) {
          if (OC.sound && OC.sound.globeWhoosh) OC.sound.globeWhoosh();
          focusBiome(hitId, true);
        }
      }
    };
    canvasEl.addEventListener('pointerup', endDrag);
    canvasEl.addEventListener('pointercancel', () => { dragging = false; });

    canvasEl.addEventListener('dblclick', (e) => {
      const hitId = pickBeaconAt(e.clientX, e.clientY);
      if (hitId) launchSelected(false);
    });

    window.addEventListener('resize', () => {
      if (isOpenState) resizeCanvas();
    });
  }

  function launchSelected(withTour) {
    const id = selectedId || (beacons[0] && beacons[0].id);
    if (!id) return;
    if (OC.sound && OC.sound.globeWhoosh) OC.sound.globeWhoosh();
    close();
    if (callbacks.onSelectBiome) callbacks.onSelectBiome(id, !!withTour);
  }

  function open() {
    if (!modalEl) return;
    syncBeaconListData();
    isOpenState = true;
    modalEl.classList.remove('hidden');
    ensureStage();
    resizeCanvas();
    const curId = (callbacks.getActiveBiomeId && callbacks.getActiveBiomeId()) || selectedId || (beacons[0] && beacons[0].id);
    const it = focusBiome(curId, true);
    if (it) {
      rotY = targetRotY - 0.35;
      rotX = targetRotX;
    }
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function close() {
    isOpenState = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (modalEl) modalEl.classList.add('hidden');
  }

  OC.Globe = {
    init(opts) {
      callbacks = opts || {};
      modalEl = document.getElementById('globe-modal');
      canvasEl = document.getElementById('globe-3d');
      listEl = document.getElementById('globe-list');
      hoverTipEl = document.getElementById('globe-hover-tip');
      titleEl = document.getElementById('globe-b-name');
      oceanEl = document.getElementById('globe-b-ocean');
      coordsEl = document.getElementById('globe-b-coords');
      depthEl = document.getElementById('globe-b-depth');
      tempEl = document.getElementById('globe-b-temp');
      progressEl = document.getElementById('globe-b-progress');
      summaryEl = document.getElementById('globe-b-summary');
      goBtn = document.getElementById('globe-go-btn');
      tourBtn = document.getElementById('globe-tour-btn');

      const closeBtn = document.getElementById('globe-close');
      if (closeBtn) closeBtn.addEventListener('click', close);
      if (modalEl) {
        modalEl.addEventListener('click', (e) => {
          if (e.target === modalEl) close();
        });
      }
      if (goBtn) goBtn.addEventListener('click', () => launchSelected(false));
      if (tourBtn) tourBtn.addEventListener('click', () => launchSelected(true));

      syncBeaconListData();
      bindEvents();
    },
    open,
    close,
    toggle() {
      if (isOpenState) close();
      else open();
      return isOpenState;
    },
    isOpen: () => isOpenState,
    focusBiome(id) { return focusBiome(id, true); },
    getSelectedId: () => selectedId,
    getBeacons: () => {
      syncBeaconListData();
      return beacons.map((b) => ({
        id: b.id,
        name: b.biome.name,
        lat: b.lat,
        lon: b.lon,
        x: b.pos.x,
        y: b.pos.y,
        z: b.pos.z,
        color: b.colorHex
      }));
    }
  };
})(window.OC);
