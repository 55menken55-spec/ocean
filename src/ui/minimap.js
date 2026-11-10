/* ================= БАТИМЕТРИЧЕСКАЯ МИНИ-КАРТА И ТЕЛЕПОРТ ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  let canvas = null;
  let ctx = null;
  let bgImage = null;
  let biomeRef = null;
  let pingState = null; // { x, z, startMs }
  const SIZE = 184;

  function depthToRGB(y) {
    const theme = biomeRef && biomeRef.minimapTheme;
    if (theme === 'kelp') {
      if (y > 0.1) return [152, 154, 150]; // прибойные гранитные кекуры
      if (y > -8) return [58, 168, 150];
      if (y > -18) return [32, 128, 124];
      if (y > -34) return [20, 92, 108];
      if (y > -55) return [14, 56, 82];
      return [8, 28, 52];
    }
    if (theme === 'abyss') {
      if (y > -20) return [72, 74, 92]; // верх базальтового уступа
      if (y > -32) return [124, 72, 52]; // гидротермальные поля
      if (y > -48) return [54, 54, 74];
      if (y > -78) return [26, 30, 50];
      return [10, 14, 28];
    }
    if (theme === 'arctic') {
      if (y > -11) return [218, 240, 252]; // кромка пакового припая
      if (y > -18) return [134, 206, 236]; // бирюзовые ледяные поля и полыньи
      if (y > -34) return [52, 138, 186];  // аллея айсбергов
      if (y > -56) return [24, 78, 134];   // моренный склон
      if (y > -92) return [13, 44, 96];    // полярный жёлоб
      return [6, 20, 54];
    }
    if (theme === 'atoll') {
      if (y > 1.2) return [72, 148, 86];   // зелёные шапки известняковых островков
      if (y > 0.05) return [236, 222, 184]; // песчаные пляжи атолла
      if (y > -10) return [54, 208, 198];  // бирюзовая лагуна золотых медуз
      if (y > -20) return [36, 166, 168];  // луга саргасса
      if (y > -30) return [32, 124, 152];  // терраса крушения «SS Maru»
      if (y > -64) return [18, 78, 136];   // стена «Синий угол»
      return [8, 32, 76];
    }
    if (y > 0.1) return [242, 228, 194]; // суша / островок
    if (y > -3.5) return [88, 212, 206];
    if (y > -12) return [36, 172, 194];
    if (y > -24) return [22, 130, 174];
    if (y > -46) return [18, 88, 152];
    if (y > -92) return [12, 48, 110];
    return [7, 22, 58]; // бездна
  }

  function renderBathymetry() {
    if (!biomeRef) return;
    const off = document.createElement('canvas');
    off.width = off.height = SIZE;
    const octx = off.getContext('2d');
    const img = octx.createImageData(SIZE, SIZE);
    const R = biomeRef.worldRadius || 1200;

    for (let py = 0; py < SIZE; py++) {
      const wz = ((py / (SIZE - 1)) * 2 - 1) * R;
      for (let px = 0; px < SIZE; px++) {
        const wx = ((px / (SIZE - 1)) * 2 - 1) * R;
        const y = biomeRef.getHeight(wx, wz);
        const rgb = depthToRGB(y);
        // Лёгкая изогипса каждые 15 м
        const contour = (y < 0 && Math.abs(y % 15) < 1.0) ? 1.08 : 1.0;
        const idx = (py * SIZE + px) * 4;
        img.data[idx] = Math.min(255, rgb[0] * contour);
        img.data[idx + 1] = Math.min(255, rgb[1] * contour);
        img.data[idx + 2] = Math.min(255, rgb[2] * contour);
        img.data[idx + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);

    // Сетка координат
    octx.strokeStyle = 'rgba(180,235,255,0.08)';
    octx.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      const p = (SIZE / 4) * k;
      octx.beginPath(); octx.moveTo(p, 0); octx.lineTo(p, SIZE); octx.stroke();
      octx.beginPath(); octx.moveTo(0, p); octx.lineTo(SIZE, p); octx.stroke();
    }

    bgImage = off;
  }

  function worldToMap(x, z) {
    const R = biomeRef.worldRadius || 1200;
    return [
      ((x / R) * 0.5 + 0.5) * SIZE,
      ((z / R) * 0.5 + 0.5) * SIZE
    ];
  }

  function mapToWorld(px, py) {
    const R = biomeRef.worldRadius || 1200;
    return [
      ((px / SIZE) * 2 - 1) * R,
      ((py / SIZE) * 2 - 1) * R
    ];
  }

  OC.Minimap = {
    init(canvasEl, biome, onTeleport, onWaypoint) {
      canvas = canvasEl;
      if (!canvas) return;
      canvas.width = SIZE;
      canvas.height = SIZE;
      ctx = canvas.getContext('2d');
      biomeRef = biome;
      renderBathymetry();

      function toggleWaypointAt(px, py) {
        if (!OC.Expedition || !biomeRef) return;
        const curWp = OC.Expedition.getWaypoint(biomeRef.id);
        if (curWp) {
          const [wpx, wpy] = worldToMap(curWp.x, curWp.z);
          if (Math.hypot(wpx - px, wpy - py) < 12) {
            OC.Expedition.clearWaypoint(biomeRef.id);
            if (onWaypoint) onWaypoint(null);
            return;
          }
        }
        for (const lm of biomeRef.landmarks) {
          const mp = worldToMap(lm.x, lm.z);
          if (Math.hypot(mp[0] - px, mp[1] - py) < 11) {
            const wp = OC.Expedition.setWaypoint(biomeRef.id, lm.x, lm.z, lm.name);
            if (onWaypoint) onWaypoint(wp);
            return;
          }
        }
        const [wx, wz] = mapToWorld(px, py);
        const z = biomeRef.getZoneAt(wx, -10, wz);
        const wp = OC.Expedition.setWaypoint(biomeRef.id, wx, wz, z ? z.shortName : 'Метка');
        if (onWaypoint) onWaypoint(wp);
      }

      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * SIZE;
        const py = ((e.clientY - rect.top) / rect.height) * SIZE;

        if (e.shiftKey) {
          toggleWaypointAt(px, py);
          return;
        }

        // Проверяем клик по ориентиру (landmark)
        for (const lm of biomeRef.landmarks) {
          const mp = worldToMap(lm.x, lm.z);
          if (Math.hypot(mp[0] - px, mp[1] - py) < 10) {
            if (onTeleport) onTeleport(lm.x, lm.y, lm.z, lm.yaw, lm.pitch, lm.name);
            return;
          }
        }
        const [wx, wz] = mapToWorld(px, py);
        const fl = biomeRef.getHeight(wx, wz);
        const targetY = Math.min(-3.0, Math.max(fl + 5.5, -28));
        if (onTeleport) onTeleport(wx, targetY, wz, undefined, -0.14, null);
      });

      canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * SIZE;
        const py = ((e.clientY - rect.top) / rect.height) * SIZE;
        toggleWaypointAt(px, py);
      });
    },

    triggerPing(x, z) {
      pingState = { x, z, startMs: Date.now() };
    },

    setBiome(biome) {
      biomeRef = biome;
      pingState = null;
      if (canvas) renderBathymetry();
    },

    update(camPos, yaw) {
      if (!ctx || !bgImage || !biomeRef) return;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(bgImage, 0, 0);

      // Активный импульс сонара на карте
      if (pingState) {
        const age = (Date.now() - pingState.startMs) / 1000;
        if (age > 2.2) {
          pingState = null;
        } else {
          const [px, pz] = worldToMap(pingState.x, pingState.z);
          const prog = age / 2.2;
          const r = 4 + prog * 46;
          ctx.save();
          ctx.strokeStyle = 'rgba(88,224,255,' + ((1 - prog) * 0.85).toFixed(2) + ')';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(px, pz, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Ориентиры
      for (const lm of biomeRef.landmarks) {
        const [mx, my] = worldToMap(lm.x, lm.z);
        ctx.fillStyle = lm.id === 'blue_hole' || lm.id === 'canyon_abyss' ? '#38b6ff' : (lm.isHot ? '#ff7d45' : '#ffd17a');
        ctx.beginPath();
        ctx.arc(mx, my, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(2,14,28,0.85)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Конус обзора и позиция камеры
      const [cx, cz] = worldToMap(camPos.x, camPos.z);

      // Активный навигационный маячок (Waypoint) и пунктирный курс к нему
      const wp = OC.Expedition && OC.Expedition.getWaypoint ? OC.Expedition.getWaypoint(biomeRef.id) : null;
      if (wp) {
        const [wx, wz] = worldToMap(wp.x, wp.z);
        ctx.save();
        ctx.strokeStyle = 'rgba(91, 232, 176, 0.65)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cz);
        ctx.lineTo(wx, wz);
        ctx.stroke();
        ctx.setLineDash([]);

        const pulse = 5 + Math.sin(Date.now() * 0.006) * 2.2;
        ctx.strokeStyle = 'rgba(91, 232, 176, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(wx, wz, pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#5be8b0';
        ctx.beginPath();
        ctx.arc(wx, wz, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(cx, cz);
      // В Three.js forward = (sin(yaw), cos(yaw)), на карте X вправо, Z вниз
      const mapAngle = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      ctx.rotate(-mapAngle + Math.PI);

      // Конус обзора
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      grad.addColorStop(0, 'rgba(88,224,255,0.45)');
      grad.addColorStop(1, 'rgba(88,224,255,0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 26, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
      ctx.closePath();
      ctx.fill();

      // Стрелка игрока
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#062033';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.2, 4.5);
      ctx.lineTo(0, 2.2);
      ctx.lineTo(-4.2, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };
})(window.OC);
