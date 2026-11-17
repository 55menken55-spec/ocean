/* ================= ФАУНА КРАКЕНОВА МОРЯ: ГИПОТЕТИЧЕСКАЯ МЕТАНОТРОФНАЯ БИОТА ================= */
/* Ни одного из этих существ не видел ни один прибор. Это визуализация гипотезы Stevenson et al.
   (2015): мембрана из акрилонитрила (азотозома), устойчивая в жидком метане при 94 К, и
   метаболизм на реакции H₂ + C₂H₂ → CH₄. Скорости такие организмы должны иметь на порядки
   ниже земных — при 94 К химия идёт в тысячи раз медленнее, поэтому и плавают они медленно.
   Плавучесть здесь другая: ρ среды 660 кг/м³ при g = 1,352 м/с² дают выталкивающую силу
   примерно в 9 % земной, поэтому крупные формы вынуждены быть почти невесомыми и плоскими. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  window.OC._FaunaBuilders = window.OC._FaunaBuilders || {};
  const B = window.OC._FaunaBuilders;
  const GEO = (B.geoBuilders = B.geoBuilders || {});

  const COL = (hex) => new T.Color(hex);

  /* ---------- Геометрии для стай (инстансинг) ---------- */

  /* Азотозомный дрейфовик: тонкая мембранная пластинка с пузырьками азотозом по краю.
     Не машет ничем: в метане при 94 К активное плавание почти ничего не стоит организму,
     но и не даёт выигрыша — дрейфовик просто держит площадь в потоке. */
  function buildAzotosomeDrifterGeo() {
    const parts = [];
    const cMem = COL(0xd8b27a);
    const cCore = COL(0x8a5c2a);
    const cNode = COL(0xf0d9a8);

    const disc = new T.SphereGeometry(1, 16, 9);
    disc.scale(0.6, 0.055, 0.34);
    const dp = disc.attributes.position;
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i), z = dp.getZ(i);
      const wob = 1 + 0.14 * Math.sin(x * 4.1) * Math.cos(z * 5.3);
      dp.setXYZ(i, x * wob, dp.getY(i), z * wob);
    }
    disc.computeVertexNormals();
    OC.geoPrep(disc);
    OC.paint(disc, (x, y, z, c) => {
      const rr = Math.hypot(x / 0.6, z / 0.34);
      c.copy(cCore).lerp(cMem, OC.smoothstep(0.1, 0.85, rr));
    });
    parts.push(disc);

    // Азотозомы: узлы мембраны по периметру
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const nx = Math.cos(a) * 0.58;
      const nz = Math.sin(a) * 0.33;
      const node = new T.SphereGeometry(0.055, 6, 5);
      OC.geoPrep(node);
      OC.paint(node, cNode);
      OC.xform(node, { p: [nx, 0.02, nz] });
      parts.push(node);
    }

    // Центральный тяжёлый узел — за счёт него пластинка держит ориентацию
    const core = new T.SphereGeometry(0.1, 7, 6);
    core.scale(1, 0.7, 1);
    OC.geoPrep(core);
    OC.paint(core, cCore);
    parts.push(core);

    return OC.mergeGeometries(parts);
  }
  GEO.azotosome_drifter = buildAzotosomeDrifterGeo;

  /* Нитрильный подвижный колонист: комок, обросший короткими ресничками.
     Держится у нитриловых наносов в устье, где выше концентрация ацетилена. */
  function buildNitrileMotileGeo() {
    const parts = [];
    const cBody = COL(0x9c6a8e);
    const cDark = COL(0x54304d);
    const cCilia = COL(0xd9b9c8);

    const body = new T.SphereGeometry(1, 12, 8);
    body.scale(0.32, 0.26, 0.26);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const bump = 1 + 0.16 * Math.sin(x * 7.3 + y * 5.1) * Math.cos(z * 6.7);
      bp.setXYZ(i, x * bump, y * bump, z * bump);
    }
    body.computeVertexNormals();
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => c.copy(cDark).lerp(cBody, OC.clamp(y * 3.0 + 0.6, 0, 1)));
    parts.push(body);

    // Реснички: короткие, жёсткие — в вязкой относительно воды среде они работают как вёсла
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const tilt = (i % 3) * 0.35 - 0.35;
      const cilia = new T.ConeGeometry(0.022, 0.2, 4);
      OC.geoPrep(cilia);
      OC.paint(cilia, cCilia);
      OC.xform(cilia, {
        r: [0, 0, Math.PI / 2 + tilt],
        p: [Math.cos(a) * 0.3, Math.sin(a) * 0.24, Math.sin(a * 1.7) * 0.2]
      });
      parts.push(cilia);
    }
    return OC.mergeGeometries(parts);
  }
  GEO.nitrile_motile = buildNitrileMotileGeo;

  /* ---------- Метановый планировщик: крупный обитатель котловины ---------- */
  function makeMethaneGlider(scene, biome, opts) {
    opts = opts || {};
    const group = new T.Group();
    group.userData.key = 'methane_glider';

    const cBody = COL(0xbf9a5e);
    const cEdge = COL(0xe6c88c);
    const cVein = COL(0x7a5a2c);

    const parts = [];
    // Плоское лентовидное тело: почти невесомая форма в слабой плавучести Титана
    const body = new T.SphereGeometry(1, 26, 12);
    body.scale(2.6, 0.16, 0.95);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), z = bp.getZ(i);
      const taper = 1 - 0.4 * Math.pow(OC.clamp(-x / 2.6, 0, 1), 1.4);
      const ripple = 1 + 0.11 * Math.sin(x * 1.9 + z * 2.4);
      bp.setXYZ(i, x, bp.getY(i) * taper * ripple, z * taper * ripple);
    }
    body.computeVertexNormals();
    OC.geoPrep(body);
    OC.paint(body, (x, y, z, c) => {
      const t = OC.clamp(x / 2.6, -1, 1);
      c.copy(cVein).lerp(cBody, OC.smoothstep(-0.8, 0.4, t)).lerp(cEdge, OC.smoothstep(0.5, 1.0, t));
    });
    parts.push(body);

    // Две продольные складки-«кили»: увеличивают жёсткость без веса
    for (const s of [-1, 1]) {
      const keel = new T.BoxGeometry(4.4, 0.1, 0.06);
      OC.geoPrep(keel);
      OC.paint(keel, (x, y, z, c) => c.copy(cVein).lerp(cEdge, 0.35));
      OC.xform(keel, { p: [0, -0.14, s * 0.62] });
      parts.push(keel);
    }

    // Хвостовая нить-стабилизатор
    const tail = new T.ConeGeometry(0.05, 2.2, 5);
    OC.geoPrep(tail);
    OC.paint(tail, (x, y, z, c) => c.copy(cVein).lerp(cEdge, OC.clamp(-y, 0, 1)));
    OC.xform(tail, { r: [0, 0, Math.PI / 2], p: [-3.4, 0, 0] });
    parts.push(tail);

    const gliderMat = new T.MeshStandardMaterial({
      vertexColors: true, roughness: 0.62, metalness: 0.04,
      transparent: true, opacity: 0.9, side: T.DoubleSide
    });
    const mesh = new T.Mesh(OC.mergeGeometries(parts), gliderMat);
    group.add(mesh);

    const scale = opts.scale || 1.2;
    group.scale.setScalar(scale);
    const cx = opts.cx || 0;
    const cz = opts.cz || 0;
    const orbitR = opts.r || 120;
    const baseY = opts.y || -60;
    const speed = opts.speed || 1.1;
    group.position.set(cx + orbitR, baseY, cz);
    scene.add(group);

    const ph = Math.random() * 6.28;
    const ang0 = Math.random() * 6.28;

    return {
      key: 'methane_glider',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(cx - camPos.x, cz - camPos.z) > 620) { group.visible = false; return; }
        group.visible = true;
        const ang = ang0 + time * speed / Math.max(20, orbitR) * 6.0;
        const rad = orbitR * (0.82 + 0.18 * Math.sin(time * 0.11 + ang0));
        const px = cx + Math.cos(ang) * rad;
        const pz = cz + Math.sin(ang) * rad;
        /* Планировщик почти не тратит усилий: медленный набор высоты и длинный
           пологий спуск — в жидкости плотностью 660 кг/м³ это выгоднее всего. */
        /* Орбита планировщика задана в координатах сцены: вместе с переносом
           начала координат под ним оказывается другой рельеф. Без привязки к
           дну он уходит в грунт там, где котловина мельче. */
        const py = Math.max(baseY + Math.sin(time * 0.13 + ph) * 9.0, biome.getHeight(px, pz) + 8.0);
        group.position.set(px, py, pz);
        group.rotation.y = -ang + Math.PI / 2;
        group.rotation.z = Math.sin(time * 0.13 + ph) * 0.22;
        group.rotation.x = Math.sin(time * 0.21 + ph) * 0.08;
      }
    };
  }
  B.makeMethaneGlider = makeMethaneGlider;

  /* ---------- Поле пузырей азота: «магические острова» Кассини ---------- */
  function makeNitrogenBubble(scene, biome, opts) {
    opts = opts || {};
    const group = new T.Group();
    group.userData.key = 'nitrogen_bubble';

    const n = Math.max(12, Math.round((opts.n || 90) * (OC.Quality ? OC.Quality.get().fishScale : 1)));
    const radius = opts.radius || 14;
    const riseHeight = opts.height || 42;
    const x0 = opts.x || 0;
    const z0 = opts.z || 0;
    const y0 = opts.y || -40;

    const pos = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    const speed = new Float32Array(n);
    const size = new Float32Array(n);
    const off = new Float32Array(n * 2);
    const rng = OC.mulberry32((Math.abs(Math.round(x0 * 13 + z0 * 71)) ^ (n * 2654435761)) >>> 0 || 7);

    for (let i = 0; i < n; i++) {
      const a = rng() * 6.283;
      const rr = Math.sqrt(rng()) * radius;
      off[i * 2] = Math.cos(a) * rr;
      off[i * 2 + 1] = Math.sin(a) * rr;
      phase[i] = rng();
      /* Крупные пузыри всплывают быстрее: подъёмная сила ~ r³, сопротивление ~ r². */
      size[i] = OC.lerp(0.5, 1.9, rng());
      speed[i] = OC.lerp(1.4, 3.4, size[i] / 1.9);
    }

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new T.BufferAttribute(size, 1));
    const mat = new T.PointsMaterial({
      color: 0xf6e6bd,
      size: 0.85,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.62,
      depthWrite: false
    });
    const points = new T.Points(geo, mat);
    points.frustumCulled = false;
    group.add(points);

    // Донное «устье»: воронка, из которой идёт газ
    const cVent = COL(0x3b2a15);
    const ring = new T.CylinderGeometry(radius * 0.34, radius * 0.5, 1.1, 12, 1);
    OC.geoPrep(ring);
    OC.paint(ring, (x, y, z, c) => c.copy(cVent).lerp(COL(0x7a5a30), OC.clamp(0.4 + Math.sin(x * 2.1 + z * 1.7) * 0.35, 0, 1)));
    const vent = new T.Mesh(ring, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.02, side: T.DoubleSide }));
    vent.position.set(0, -0.55, 0);
    group.add(vent);

    group.position.set(x0, y0, z0);
    scene.add(group);

    const attr = geo.attributes.position;

    return {
      key: 'nitrogen_bubble',
      getPosition: () => group.position,
      update(dt, time, camPos) {
        if (Math.hypot(x0 - camPos.x, z0 - camPos.z) > 520) { group.visible = false; return; }
        group.visible = true;
        for (let i = 0; i < n; i++) {
          /* Каждый пузырь проходит путь от дна до поверхности и начинает заново.
             Азот выделяется неравномерно — из-за этого поле то густеет, то редеет:
             именно так объясняют «магические острова» на радарных снимках Кассини. */
          const u = (phase[i] + time * speed[i] / riseHeight) % 1;
          const sway = Math.sin(time * 0.9 + i * 1.7) * (0.6 + u * 2.2);
          attr.setXYZ(
            i,
            off[i * 2] + sway,
            u * riseHeight,
            off[i * 2 + 1] + Math.cos(time * 0.8 + i * 2.3) * (0.5 + u * 1.8)
          );
        }
        attr.needsUpdate = true;
      }
    };
  }
  B.makeNitrogenBubble = makeNitrogenBubble;
})(window.OC);
