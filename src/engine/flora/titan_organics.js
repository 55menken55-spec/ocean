/* ================= ПРОЦЕДУРНАЯ «ФЛОРА» ТИТАНА: ОРГАНИКА, ЛЁД И ЭВАПОРИТЫ ================= */
/* Здесь нет ни одного растения: при −179,6 °C в жидком метане земная биохимия не работает.
   Все пять видов — формы рельефа и осадка дна Кракенова моря, которые симулятор раскладывает
   тем же стримером, что и подводные растения Земли:
     organic_silt   — слой осевших толинов на дне;
     ice_boulder    — глыбы водяного льда (на Титане это коренная порода, а не плавучий лёд);
     tholin_dune    — гряды органогенного аэрозоля, продолжающиеся под воду с берега;
     evaporite_crust— корка, выпадающая при испарении моря на мелководье;
     nitrile_drift  — плотные линзы нитрилов в устьях метановых рек. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const B = (OC._FloraBuilders = OC._FloraBuilders || {});

  const COL = (hex) => new T.Color(hex);

  /* ---------- Органический ил: мягкие подушки осевших толинов ---------- */
  function buildOrganicSilt(rng) {
    const list = [];
    const cDeep = COL(0x3a2a17);
    const cMid = COL(0x6b4a26);
    const cTop = COL(0x9c7038);

    const mounds = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < mounds; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.25;
      const r = OC.lerp(0.55, 1.35, rng());
      const h = OC.lerp(0.16, 0.52, rng());

      const mound = new T.SphereGeometry(r, 11, 7, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const mp = mound.attributes.position;
      for (let v = 0; v < mp.count; v++) {
        const x = mp.getX(v), y = mp.getY(v), z = mp.getZ(v);
        const rr = Math.hypot(x, z) / r;
        /* Края расплываются в ноль — ил не держит вертикальную стенку. */
        const fall = 1 - Math.pow(rr, 2.6);
        const lump = 1 + 0.22 * Math.sin(x * 4.3 + i) * Math.cos(z * 3.7 - i);
        mp.setXYZ(v, x, y * h / r * fall * lump, z);
      }
      mound.computeVertexNormals();
      OC.geoPrep(mound);
      OC.paint(mound, (x, y, z, c) => {
        const u = OC.clamp(y / 0.5, 0, 1);
        c.copy(cDeep).lerp(cMid, OC.smoothstep(0.0, 0.5, u)).lerp(cTop, OC.smoothstep(0.55, 1.0, u));
      });
      OC.xform(mound, { r: [0, rng() * 6.28, 0], p: [Math.cos(a) * dist, 0, Math.sin(a) * dist] });
      OC.withSway(mound, () => 0);
      list.push(mound);
    }

    // Редкие тёмные конкреции: более тяжёлые фракции, провалившиеся сквозь ил
    const nodes = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < nodes; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.15;
      const r = OC.lerp(0.06, 0.15, rng());
      const node = new T.DodecahedronGeometry(r, 0);
      OC.geoPrep(node);
      OC.paint(node, (x, y, z, c) => c.copy(cDeep).lerp(COL(0x211609), 0.4 + rng() * 0.3));
      OC.xform(node, { r: [rng(), rng(), rng()], p: [Math.cos(a) * dist, r * 0.4, Math.sin(a) * dist] });
      OC.withSway(node, () => 0);
      list.push(node);
    }
    return OC.mergeGeometries(list);
  }
  B.buildOrganicSilt = buildOrganicSilt;

  /* ---------- Глыба водяного льда: при 94 К это скальная порода ---------- */
  function buildIceBoulder(rng) {
    const list = [];
    const cLight = COL(0xdfeffa);
    const cMid = COL(0xa8c8de);
    const cDeep = COL(0x6f93ad);

    const blocks = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < blocks; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.05;
      const r = OC.lerp(0.5, 1.25, rng());
      const boulder = new T.IcosahedronGeometry(r, 1);
      const bp = boulder.attributes.position;
      for (let v = 0; v < bp.count; v++) {
        const x = bp.getX(v), y = bp.getY(v), z = bp.getZ(v);
        /* Сколы граней: лёд ломается плоскостями, а не округляется водой. */
        const facet = 1 + 0.16 * Math.sin(x * 3.1 + z * 2.3) - 0.13 * Math.abs(Math.sin(y * 2.7));
        bp.setXYZ(v, x * facet, y * facet * OC.lerp(0.62, 1.05, rng() * 0.4 + 0.6), z * facet);
      }
      boulder.computeVertexNormals();
      OC.geoPrep(boulder);
      OC.paint(boulder, (x, y, z, c) => {
        const u = OC.clamp((y / r) * 0.5 + 0.5, 0, 1);
        c.copy(cDeep).lerp(cMid, OC.smoothstep(0.15, 0.7, u)).lerp(cLight, OC.smoothstep(0.75, 1.0, u));
      });
      OC.xform(boulder, {
        r: [(rng() - 0.5) * 0.5, rng() * 6.28, (rng() - 0.5) * 0.5],
        p: [Math.cos(a) * dist, r * 0.42, Math.sin(a) * dist]
      });
      OC.withSway(boulder, () => 0);
      list.push(boulder);
    }

    // Осыпь у подножия: осколки той же породы
    const chips = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < chips; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.35;
      const r = OC.lerp(0.07, 0.18, rng());
      const chip = new T.TetrahedronGeometry(r, 0);
      OC.geoPrep(chip);
      OC.paint(chip, (x, y, z, c) => c.copy(cMid).lerp(cLight, 0.25 + rng() * 0.35));
      OC.xform(chip, { r: [rng(), rng(), rng()], p: [Math.cos(a) * dist, r * 0.5, Math.sin(a) * dist] });
      OC.withSway(chip, () => 0);
      list.push(chip);
    }
    return OC.mergeGeometries(list);
  }
  B.buildIceBoulder = buildIceBoulder;

  /* ---------- Толиновая дюна: гряда аэрозольной органики ---------- */
  function buildTholinDune(rng) {
    const list = [];
    const cDark = COL(0x4a2f16);
    const cWarm = COL(0x9a6431);
    const cCrest = COL(0xc08b47);

    const crests = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < crests; i++) {
      const len = OC.lerp(2.2, 4.0, rng());
      const wid = OC.lerp(0.7, 1.3, rng());
      const h = OC.lerp(0.35, 0.95, rng());
      const a = rng() * 6.283;
      const dist = (i - (crests - 1) * 0.5) * 0.75;

      const dune = new T.PlaneGeometry(len, wid, 12, 5);
      const dp = dune.attributes.position;
      for (let v = 0; v < dp.count; v++) {
        const u = OC.clamp(dp.getX(v) / len + 0.5, 0, 1);
        const w = OC.clamp(dp.getY(v) / wid + 0.5, 0, 1);
        /* Асимметрия земной дюны: пологий наветренный склон, крутой подветренный. */
        const prof = Math.pow(Math.sin(u * Math.PI), 0.7) * (1 - Math.pow(Math.abs(w - 0.5) * 2, 1.6));
        dp.setZ(v, dp.getZ(v) + prof * h * (1 + 0.18 * Math.sin(u * 7.1 + i)));
      }
      dune.computeVertexNormals();
      OC.geoPrep(dune);
      OC.paint(dune, (x, y, z, c) => {
        const t = OC.clamp(z / 0.9, 0, 1);
        c.copy(cDark).lerp(cWarm, OC.smoothstep(0.0, 0.6, t)).lerp(cCrest, OC.smoothstep(0.65, 1.0, t));
      });
      OC.xform(dune, { r: [Math.PI / 2, 0, a], p: [Math.cos(a) * dist, 0, Math.sin(a) * dist] });
      OC.withSway(dune, () => 0);
      list.push(dune);
    }
    return OC.mergeGeometries(list);
  }
  B.buildTholinDune = buildTholinDune;

  /* ---------- Эвапоритовая корка: ступенчатые плиты испарения ---------- */
  function buildEvaporiteCrust(rng) {
    const list = [];
    const cPale = COL(0xd8bf94);
    const cMid = COL(0xa8875c);
    const cEdge = COL(0x6d5436);

    const plates = 5 + Math.floor(rng() * 5);
    for (let i = 0; i < plates; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.2;
      const r = OC.lerp(0.22, 0.62, rng());
      const thick = OC.lerp(0.04, 0.11, rng());
      const sides = 5 + Math.floor(rng() * 3);

      const plate = new T.CylinderGeometry(r, r * 0.94, thick, sides, 1);
      const pp = plate.attributes.position;
      for (let v = 0; v < pp.count; v++) {
        const x = pp.getX(v), z = pp.getZ(v);
        /* Края корки задираются вверх — так ведёт себя высыхающая соляная корка. */
        const rr = Math.hypot(x, z) / r;
        const lip = Math.pow(rr, 3) * thick * 1.35;
        pp.setY(v, pp.getY(v) + lip);
      }
      plate.computeVertexNormals();
      OC.geoPrep(plate);
      OC.paint(plate, (x, y, z, c) => {
        const rr = Math.hypot(x, z) / r;
        c.copy(cMid).lerp(cPale, OC.clamp(0.4 + Math.sin(x * 6.1 + z * 5.3) * 0.3, 0, 1)).lerp(cEdge, OC.smoothstep(0.72, 1.0, rr));
      });
      OC.xform(plate, {
        r: [(rng() - 0.5) * 0.14, rng() * 6.28, (rng() - 0.5) * 0.14],
        p: [Math.cos(a) * dist, thick * 0.5 + (i % 2) * 0.03, Math.sin(a) * dist]
      });
      OC.withSway(plate, () => 0);
      list.push(plate);
    }
    return OC.mergeGeometries(list);
  }
  B.buildEvaporiteCrust = buildEvaporiteCrust;

  /* ---------- Нитриловые наносы: плотные линзы в устье ---------- */
  function buildNitrileDrift(rng) {
    const list = [];
    const cDeep = COL(0x2b1d33);
    const cMid = COL(0x5c3a58);
    const cTop = COL(0x8f6a79);

    const lenses = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < lenses; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.1;
      const r = OC.lerp(0.42, 0.95, rng());
      const h = OC.lerp(0.12, 0.34, rng());

      const lens = new T.SphereGeometry(r, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const lp = lens.attributes.position;
      for (let v = 0; v < lp.count; v++) {
        const x = lp.getX(v), y = lp.getY(v), z = lp.getZ(v);
        const rr = Math.hypot(x, z) / r;
        /* Линза: плоская сверху, выпуклая по краям — так оседает тяжёлая взвесь. */
        const prof = (1 - Math.pow(rr, 2.2)) * (1 + 0.35 * Math.pow(rr, 1.4));
        lp.setXYZ(v, x, y * h / r * prof, z);
      }
      lens.computeVertexNormals();
      OC.geoPrep(lens);
      OC.paint(lens, (x, y, z, c) => {
        const u = OC.clamp(y / 0.3, 0, 1);
        c.copy(cDeep).lerp(cMid, OC.smoothstep(0.0, 0.55, u)).lerp(cTop, OC.smoothstep(0.6, 1.0, u));
      });
      OC.xform(lens, { r: [0, rng() * 6.28, 0], p: [Math.cos(a) * dist, 0, Math.sin(a) * dist] });
      OC.withSway(lens, () => 0);
      list.push(lens);
    }

    // Взвесь над линзами: лёгкая, едва колышется течением
    const motes = 6 + Math.floor(rng() * 6);
    for (let i = 0; i < motes; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.15;
      const hgt = OC.lerp(0.25, 0.95, rng());
      const r = OC.lerp(0.05, 0.11, rng());
      const mote = new T.SphereGeometry(r, 6, 5);
      OC.geoPrep(mote);
      OC.paint(mote, (x, y, z, c) => c.copy(cMid).lerp(cTop, 0.45 + rng() * 0.3));
      OC.xform(mote, { p: [Math.cos(a) * dist, hgt, Math.sin(a) * dist] });
      OC.withSway(mote, (x, y) => OC.clamp(y / 1.0, 0, 1) * 0.32);
      list.push(mote);
    }
    return OC.mergeGeometries(list);
  }
  B.buildNitrileDrift = buildNitrileDrift;

  /* ---------- Ледяная береговая кромка: зубцы льда у уреза моря ---------- */
  function buildShorelineIce(rng) {
    const list = [];
    const cClear = COL(0xe8f4fb);
    const cBlue = COL(0x9fc4d8);
    const cDeep = COL(0x6a90aa);

    const spikes = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < spikes; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.15;
      const h = OC.lerp(0.5, 1.6, rng());
      const r = OC.lerp(0.16, 0.42, rng());
      const spike = new T.ConeGeometry(r, h, 5 + Math.floor(rng() * 3), 2);
      const sp = spike.attributes.position;
      for (let v = 0; v < sp.count; v++) {
        const u = OC.clamp(sp.getY(v) / h + 0.5, 0, 1);
        /* Клин: грань, срезанная прибоем с одной стороны. */
        sp.setX(v, sp.getX(v) * (1 + 0.22 * Math.sin(u * 3.4 + i)));
        sp.setZ(v, sp.getZ(v) * (1 - 0.18 * u));
      }
      spike.computeVertexNormals();
      OC.geoPrep(spike);
      OC.paint(spike, (x, y, z, c) => {
        const u = OC.clamp(y / h + 0.5, 0, 1);
        c.copy(cDeep).lerp(cBlue, OC.smoothstep(0.0, 0.6, u)).lerp(cClear, OC.smoothstep(0.62, 1.0, u));
      });
      OC.xform(spike, {
        r: [(rng() - 0.5) * 0.3, rng() * 6.28, (rng() - 0.5) * 0.3],
        p: [Math.cos(a) * dist, h * 0.42, Math.sin(a) * dist]
      });
      OC.withSway(spike, () => 0);
      list.push(spike);
    }
    return OC.mergeGeometries(list);
  }
  B.buildShorelineIce = buildShorelineIce;

  /* ---------- Приливный бор: вал, идущий вверх по устью ---------- */
  function buildTidalBore(rng) {
    const list = [];
    const cCrest = COL(0xd9c79c);
    const cFace = COL(0x8a6b3d);
    const cFoam = COL(0xf3e7c8);

    const len = OC.lerp(3.0, 4.4, rng());
    const h = OC.lerp(0.45, 0.9, rng());
    const bore = new T.PlaneGeometry(len, 1.5, 16, 6);
    const bp = bore.attributes.position;
    for (let v = 0; v < bp.count; v++) {
      const u = OC.clamp(bp.getX(v) / len + 0.5, 0, 1);
      /* Крутой передний фронт и пологая тыльная сторона — профиль бора. */
      const front = Math.pow(OC.clamp(1 - u * 3.2, 0, 1), 2.2);
      const tail = Math.pow(OC.clamp((u - 0.31) / 0.69, 0, 1), 1.5);
      const z = (front * 1.0 + (1 - tail) * 0.35) * h;
      bp.setZ(v, bp.getZ(v) + z + Math.sin(u * 11.0 + bp.getY(v) * 2.3) * 0.05 * h);
    }
    bore.computeVertexNormals();
    OC.geoPrep(bore);
    OC.paint(bore, (x, y, z, c) => {
      const t = OC.clamp(z / 0.9, 0, 1);
      c.copy(cFace).lerp(cCrest, OC.smoothstep(0.15, 0.7, t)).lerp(cFoam, OC.smoothstep(0.78, 1.0, t));
    });
    OC.xform(bore, { r: [Math.PI / 2, 0, rng() * 6.28] });
    OC.withSway(bore, () => 0);
    list.push(bore);
    return OC.mergeGeometries(list);
  }
  B.buildTidalBore = buildTidalBore;

  /* ---------- Метановый дождь: струи осадков над поверхностью моря ---------- */
  function buildMethaneRain(rng) {
    const list = [];
    const cDrop = COL(0xcfd9c0);
    const cStreak = COL(0x9fb08a);

    /* Капли метана вдвое крупнее земных и падают втрое медленнее: при
       тяжести 1,35 м/с² и плотном воздухе они летят почти как в замедленной
       съёмке — поэтому струи здесь длинные и редкие. */
    const streaks = 10 + Math.floor(rng() * 8);
    for (let i = 0; i < streaks; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.3;
      const len = OC.lerp(0.7, 2.1, rng());
      const drop = new T.CylinderGeometry(0.022, 0.035, len, 5, 1, true);
      OC.geoPrep(drop);
      OC.paint(drop, (x, y, z, c) => c.copy(cStreak).lerp(cDrop, OC.clamp(y / len + 0.5, 0, 1)));
      OC.xform(drop, {
        r: [(rng() - 0.5) * 0.12, rng() * 6.28, (rng() - 0.5) * 0.12],
        p: [Math.cos(a) * dist, OC.lerp(0.6, 3.2, rng()), Math.sin(a) * dist]
      });
      OC.withSway(drop, (x, y) => OC.clamp(y / 3.0, 0, 1) * 0.2);
      list.push(drop);
    }
    return OC.mergeGeometries(list);
  }
  B.buildMethaneRain = buildMethaneRain;

  /* ---------- «Магический остров»: пятно всплывающих пузырей азота ---------- */
  function buildBubblePatch(rng) {
    const list = [];
    const cBubble = COL(0xf3e3b6);
    const cShade = COL(0xa98f57);

    const bubbles = 8 + Math.floor(rng() * 7);
    for (let i = 0; i < bubbles; i++) {
      const a = rng() * 6.283;
      const dist = rng() * 1.1;
      const r = OC.lerp(0.08, 0.3, rng());
      const bubble = new T.SphereGeometry(r, 9, 7);
      bubble.scale(1, 0.86, 1);
      OC.geoPrep(bubble);
      OC.paint(bubble, (x, y, z, c) => c.copy(cShade).lerp(cBubble, OC.clamp(y / r * 0.5 + 0.62, 0, 1)));
      OC.xform(bubble, { p: [Math.cos(a) * dist, OC.lerp(0.15, 2.4, rng()), Math.sin(a) * dist] });
      OC.withSway(bubble, (x, y) => OC.clamp(y / 2.4, 0, 1) * 0.45);
      list.push(bubble);
    }
    // Светлое пятно на поверхности над пятном пузырей
    const slick = new T.CircleGeometry(1.5, 18);
    OC.geoPrep(slick);
    OC.paint(slick, (x, y, z, c) => c.copy(cShade).lerp(cBubble, OC.clamp(0.35 + Math.sin(x * 3.1 + z * 2.7) * 0.3, 0, 1)));
    OC.xform(slick, { r: [Math.PI / 2, 0, 0], p: [0, 2.6, 0] });
    OC.withSway(slick, () => 0.12);
    list.push(slick);
    return OC.mergeGeometries(list);
  }
  B.buildBubblePatch = buildBubblePatch;
})(window.OC);
