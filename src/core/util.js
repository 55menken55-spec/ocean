/* ================= БАЗОВЫЕ УТИЛИТЫ, ШУМ И ГЕОМЕТРИЯ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  OC.rand = (a, b) => a + Math.random() * (b - a);
  OC.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  OC.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  OC.lerp = (a, b, t) => a + (b - a) * t;
  OC.smoothstep = (e0, e1, x) => {
    const t = OC.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  OC.pick = (arr, rng) => arr[Math.floor((rng ? rng() : Math.random()) * arr.length)];

  /* ---- Детерминированный PRNG и пространственный хэш ---- */
  OC.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  OC.hash2 = function (ix, iz, seed) {
    let h = Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263) + Math.imul((seed || 0) | 0, 1442695041);
    h = (h ^ (h >>> 13)) | 0;
    h = Math.imul(h, 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  /* ---- Плавный 2D-шум и FBM для рельефа ---- */
  function hashGrad(ix, iz) {
    const h = OC.hash2(ix, iz, 9137);
    const a = h * 6.28318530718;
    return [Math.cos(a), Math.sin(a)];
  }

  OC.noise2 = function (x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);

    const g00 = hashGrad(ix, iz);
    const g10 = hashGrad(ix + 1, iz);
    const g01 = hashGrad(ix, iz + 1);
    const g11 = hashGrad(ix + 1, iz + 1);

    const n00 = g00[0] * fx + g00[1] * fz;
    const n10 = g10[0] * (fx - 1) + g10[1] * fz;
    const n01 = g01[0] * fx + g01[1] * (fz - 1);
    const n11 = g11[0] * (fx - 1) + g11[1] * (fz - 1);

    const nx0 = n00 + (n10 - n00) * ux;
    const nx1 = n01 + (n11 - n01) * ux;
    return (nx0 + (nx1 - nx0) * uz) * 0.7071;
  };

  OC.fbm2 = function (x, z, octaves) {
    const oct = octaves || 4;
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += OC.noise2(x * freq, z * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  };

  OC.ridged2 = function (x, z, octaves) {
    const oct = octaves || 3;
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      const n = 1 - Math.abs(OC.noise2(x * freq, z * freq));
      sum += n * n * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.05;
    }
    return sum / norm;
  };

  OC.fibDir = function (i, n) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * 2.399963229728653;
    return new T.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
  };

  /* ---- Мягкая круглая текстура ---- */
  OC.circleTexture = function (size, hard) {
    size = size || 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(hard ? 0.68 : 0.35, 'rgba(255,255,255,' + (hard ? 0.94 : 0.72) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new T.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  };

  /* ---- Подготовка геометрии к вершинным цветам/слиянию ---- */
  OC.geoPrep = function (g) {
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (g.attributes.uv2) g.deleteAttribute('uv2');
    if (!g.attributes.normal) g.computeVertexNormals();
    return g;
  };

  /* ---- Применить цвет к вершинам геометрии ---- */
  OC.paint = function (geom, fn) {
    const pos = geom.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    const c = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
        arr[i * 3] = 0.05; arr[i * 3 + 1] = 0.05; arr[i * 3 + 2] = 0.05;
        continue;
      }
      if (typeof fn === 'function') fn(x, y, z, c, i);
      else c.set(fn);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    geom.setAttribute('color', new T.BufferAttribute(arr, 3));
    return geom;
  };

  /* ---- Атрибут колыхания aSway ---- */
  OC.withSway = function (g, fn) {
    const pos = g.attributes.position;
    const a = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      a[i] = fn ? fn(pos.getX(i), pos.getY(i), pos.getZ(i)) : 0;
    }
    g.setAttribute('aSway', new T.BufferAttribute(a, 1));
    return g;
  };

  /* ---- Трансформация геометрии ---- */
  const _xp = new T.Vector3();
  const _xe = new T.Euler();
  const _xq = new T.Quaternion();
  const _xs = new T.Vector3();
  const _xm = new T.Matrix4();

  OC.xform = function (geom, o) {
    o = o || {};
    _xp.fromArray(o.p || [0, 0, 0]);
    _xe.fromArray(o.r || [0, 0, 0]);
    _xq.setFromEuler(_xe);
    _xs.fromArray(o.s || [1, 1, 1]);
    _xm.compose(_xp, _xq, _xs);
    geom.applyMatrix4(_xm);
    return geom;
  };

  /* ---- Безопасное объединение массива геометрий ---- */
  OC.mergeGeometries = function (list) {
    if (!list || !list.length) return new T.BufferGeometry();
    const geoms = list.map((g) => (g.index ? g.toNonIndexed() : g));

    const attrSet = new Set();
    for (const g of geoms) {
      for (const k in g.attributes) attrSet.add(k);
    }
    const sizes = {};
    for (const name of attrSet) {
      for (const g of geoms) {
        if (g.attributes[name]) {
          sizes[name] = g.attributes[name].itemSize;
          break;
        }
      }
    }

    let total = 0;
    for (const g of geoms) total += g.attributes.position.count;

    const out = new T.BufferGeometry();
    for (const name of attrSet) {
      const itemSize = sizes[name];
      const arr = new Float32Array(total * itemSize);
      let off = 0;
      for (const g of geoms) {
        const a = g.attributes[name];
        const cnt = g.attributes.position.count;
        if (a) {
          arr.set(a.array.subarray(0, cnt * itemSize), off * itemSize);
        } else if (name === 'color') {
          arr.fill(1.0, off * itemSize, (off + cnt) * itemSize);
        }
        off += cnt;
      }
      out.setAttribute(name, new T.BufferAttribute(arr, itemSize));
    }
    out.computeBoundingSphere();
    return out;
  };
})(window.OC);
