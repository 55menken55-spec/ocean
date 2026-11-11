/* ================= ВСПОМОГАТЕЛЬНЫЕ ПАНЕЛИ HUD, ЖУРНАЛ, ЭХОЛОТ И МАСКА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const ECO_LABELS = {
    breach: 'Наблюдение: горбатый кит выпрыгивает из воды!',
    hunt: 'Наблюдение: хищник атакует косяк!',
    baitball: 'Наблюдение: стая сжалась в защитный шар (baitball)!',
    cleaning: 'Наблюдение: симбиоз — чистильщики обслуживают гиганта',
    porpoising: 'Наблюдение: морские млекопитающие выпрыгивают у поверхности',
    coral_spawn: 'Ночное явление: массовый нерест кораллов — гаметы поднимаются к поверхности!',
    dvm: 'Суточная вертикальная миграция (DVM): глубоководный планктон поднимается наверх!',
    silt_out: 'Донная муть (Silt-out): движители подняли облако осадка со дна!'
  };

  const BIOME_SHORT = {
    great_barrier_reef: 'Риф ББР',
    kelp_forest: 'Ламинария',
    hydrothermal_vents: 'Курильщики 2500м',
    arctic_sea: 'Арктика',
    wreck_atoll: 'Атолл и Корабль',
    mariana_trench: 'Марианская 10920м',
    brine_pool: 'Соляной бассейн',
    cenote_caves: 'Сеноты Юкатана',
    galapagos_upwelling: 'Галапагосы',
    amazon_igapo: 'Амазония'
  };

  const BIOME_REGION = {
    great_barrier_reef: 'GBR · Тихий океан',
    kelp_forest: 'Монтерей · Калифорния',
    hydrothermal_vents: 'ВТП · Абиссаль 2500 м',
    arctic_sea: 'Баффин · 74° с.ш.',
    wreck_atoll: 'Палау · Микронезия',
    mariana_trench: 'Челленджер · 10 920 м',
    brine_pool: 'Мексиканский залив · 650 м',
    cenote_caves: 'Юкатан · Сак-Актун 58 м',
    galapagos_upwelling: 'Эквадор · Апвеллинг',
    amazon_igapo: 'Рио-Негру · Игапо 28 м'
  };

  // Капли воды на стекле маски при выныривании или шторме (fixed pool, без GC)
  let lensDirty = false;
  const LENS_DROPS = (() => {
    const rng = OC.mulberry32(4242);
    const arr = [];
    for (let i = 0; i < 34; i++) {
      arr.push({
        x: rng(),
        y: rng(),
        r: OC.lerp(4.5, 13.5, rng()),
        vy: OC.lerp(0.014, 0.048, rng()),
        drift: OC.lerp(-0.005, 0.005, rng())
      });
    }
    return arr;
  })();

  function updateLensDroplets(lensCanvas, dt, camPos, wState, biome) {
    if (!lensCanvas) return;
    const ctx = lensCanvas.getContext('2d');
    if (!ctx) return;
    const strength = (biome && biome.noSurface) ? 0 : (wState ? wState.droplets : 0);
    if (strength <= 0.02 || camPos.y < -0.1) {
      if (lensDirty) {
        ctx.clearRect(0, 0, lensCanvas.width, lensCanvas.height);
        lensDirty = false;
      }
      return;
    }
    lensDirty = true;
    const w = lensCanvas.width, h = lensCanvas.height;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < LENS_DROPS.length; i++) {
      const d = LENS_DROPS[i];
      d.y += d.vy * dt * (0.65 + strength * 0.9);
      d.x += d.drift * dt;
      if (d.y > 1.05) { d.y = -0.05; d.x = ((d.x + 0.37) % 1 + 1) % 1; }
      const cx = d.x * w;
      const cy = d.y * h;
      const rr = d.r * (0.8 + strength * 0.35);
      const a = Math.min(0.45, strength * 0.42);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(205, 240, 255, ' + (a * 0.28).toFixed(3) + ')';
      ctx.fill();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = 'rgba(235, 250, 255, ' + (a * 0.65).toFixed(3) + ')';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - rr * 0.3, cy - rr * 0.3, Math.max(1.2, rr * 0.26), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (a * 0.9).toFixed(3) + ')';
      ctx.fill();
    }
  }

  function formatHeading(yawRad) {
    // 0 yaw смотрит на +Z (Юг), PI на -Z (Север)
    const deg = ((Math.round((180 - yawRad * 180 / Math.PI)) % 360) + 360) % 360;
    const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const dName = dirs[Math.round(deg / 45) % 8];
    return dName + ' ' + String(deg).padStart(3, '0') + '°';
  }

  function renderJournal(opts) {
    const {
      journalGrid,
      journalTitle,
      journalSummary,
      journalModal,
      journalTab,
      activeBiome,
      lastEvalCtx,
      switchBiome,
      toast
    } = opts;
    if (!journalGrid || !activeBiome || !OC.Expedition) return;

    const res = OC.Expedition.evaluateMissions(activeBiome, lastEvalCtx);
    const sum = OC.Expedition.getAllSummary();
    if (journalTitle) journalTitle.textContent = 'Экспедиция · ' + activeBiome.name;
    if (journalSummary) {
      journalSummary.textContent = 'Миссий: ' + sum.missionsDone + ' / ' + sum.missionsTotal +
        ' · Снимков: ' + sum.photosCount +
        ' · Проб в музее: ' + (sum.samplesCount || 0);
    }

    journalGrid.innerHTML = '';
    if (journalTab === 'missions') {
      for (const m of res.list) {
        const card = document.createElement('div');
        card.className = 'mission-card' + (m.done ? ' done' : '');
        const pct = Math.round((m.cur / Math.max(1, m.goal)) * 100);
        const badge = m.done ? '<span class="atlas-badge ok">Выполнено ✓</span>' : '<span class="atlas-badge">' + m.cur + ' / ' + m.goal + '</span>';
        card.innerHTML =
          '<div class="atlas-top"><span>Научная задача</span>' + badge + '</div>' +
          '<div class="atlas-name">' + m.title + '</div>' +
          '<div class="atlas-desc">' + m.desc + '</div>' +
          '<div class="mission-prog"><i style="width:' + pct + '%"></i></div>' +
          '<div class="atlas-foot"><span>' + (m.done ? 'Задание засчитано' : 'В процессе') + '</span><button class="atlas-go">Поставить маяк →</button></div>';
        const btn = card.querySelector('.atlas-go');
        btn.addEventListener('click', () => {
          const lm = activeBiome.landmarks.find((l) => l.id === m.landmarkId) || activeBiome.landmarks[0];
          if (lm) {
            OC.Expedition.setWaypoint(activeBiome.id, lm.x, lm.z, lm.name);
            toast('Маяк поставлен: ' + lm.name);
            if (journalModal) journalModal.classList.add('hidden');
          }
        });
        journalGrid.appendChild(card);
      }
    } else if (journalTab === 'museum') {
      const samplesList = OC.Expedition.getSamples ? OC.Expedition.getSamples() : [];
      if (!samplesList.length) {
        journalGrid.innerHTML = '<div style="grid-column:1/-1;color:var(--dim);font-size:13px;padding:18px 0">Музей экспедиционных проб пока пуст. Откройте панель ROV (<b>I</b>), наведите манипулятор на коралл, курильщик, гидрат, сталактит или вулканический базальт и нажмите <b>Z</b>!</div>';
        return;
      }
      for (const s of samplesList) {
        const card = document.createElement('div');
        card.className = 'mission-card';
        const colCss = '#' + (s.colorHex || 0x58e0ff).toString(16).padStart(6, '0');
        const hasEnc = !!(activeBiome && activeBiome.encyclopedia && s.species && activeBiome.encyclopedia[s.species] && s.biomeId === activeBiome.id);
        card.innerHTML =
          '<div class="atlas-top"><span style="display:inline-flex;align-items:center;gap:6px"><i style="width:10px;height:10px;border-radius:50%;display:inline-block;background:' + colCss + ';box-shadow:0 0 8px ' + colCss + '"></i>' + s.category + ' · ' + s.biomeName + '</span><span class="atlas-badge ok">' + s.depthM + ' м</span></div>' +
          '<div class="atlas-name">' + s.title + '</div>' +
          '<div class="atlas-latin">' + (s.latin || s.chemNote) + '</div>' +
          '<div class="atlas-desc">' + s.chemNote + ' · T=' + s.tempC + '°C · ' + s.pH + ' pH · O₂ ' + s.o2 + ' мг/л' + (s.bleachPct > 0 ? (' · обесцв. ' + s.bleachPct + '%') : '') + '</div>' +
          '<div class="atlas-foot"><span>' + new Date(s.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span>' +
          (hasEnc ? '<button class="atlas-go">3D-Атлас →</button>' : '<button class="atlas-go">В биом →</button>') + '</div>';
        const btn = card.querySelector('.atlas-go');
        btn.addEventListener('click', () => {
          if (journalModal) journalModal.classList.add('hidden');
          if (s.biomeId !== activeBiome.id) {
            switchBiome(s.biomeId);
            return;
          }
          if (hasEnc && OC.Atlas && OC.Atlas.selectSpecies) {
            if (!OC.Atlas.isOpen()) OC.Atlas.toggle();
            OC.Atlas.selectSpecies(s.species, false);
          }
        });
        journalGrid.appendChild(card);
      }
    } else {
      const photos = OC.Expedition.getPhotos();
      if (!photos.length) {
        journalGrid.innerHTML = '<div style="grid-column:1/-1;color:var(--dim);font-size:13px;padding:18px 0">Пока нет подводных снимков. Нажмите <b>P</b> (или значок камеры), наведите видоискатель на обитателя или коралл и нажмите <b>Enter</b>!</div>';
        return;
      }
      for (const ph of photos) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        const dlUrl = OC.Expedition.getPhotoDownloadUrl(ph.id);
        card.innerHTML =
          (ph.dataUrl ? '<img src="' + ph.dataUrl + '" alt="' + ph.title + '">' : '') +
          '<div class="atlas-top"><span>' + ph.biomeName + ' · ' + ph.depthM + ' м</span><span class="atlas-badge ok">' + ph.score + '/100</span></div>' +
          '<div class="atlas-name">' + ph.title + '</div>' +
          '<div class="atlas-latin">' + ph.latin + (ph.dist ? (' · ' + ph.dist + ' м') : '') + '</div>' +
          '<div class="atlas-foot"><span>' + new Date(ph.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span>' +
          (dlUrl ? '<a class="atlas-go" style="text-decoration:none" href="' + dlUrl + '" download="' + ph.key + '.png">Скачать PNG</a>' : '') + '</div>';
        journalGrid.appendChild(card);
      }
    }
  }

  function showInfo(popup, key, cx, cy, biome) {
    if (!popup || !biome) return;
    const info = biome.encyclopedia[key] || biome.encyclopedia.floor;
    if (!info) return;
    const isNew = OC.Atlas.discover(key);
    popup.innerHTML =
      '<div class="popup-head"><span>' + info[2] + ' · ' + info[4] + '</span>' +
      (isNew ? '<span class="popup-new">Открыто в Атласе!</span>' : '') + '</div>' +
      '<div class="popup-title">' + info[0] + '</div>' +
      '<div class="popup-latin">' + info[1] + '</div>' +
      '<div class="popup-desc">' + info[5] + '</div>';
    popup.classList.remove('hidden');
    const x = Math.min(cx, window.innerWidth - 305);
    const y = Math.min(cy, window.innerHeight - 210);
    popup.style.left = Math.max(12, x + 14) + 'px';
    popup.style.top = Math.max(12, y + 10) + 'px';
  }

  function showRovPopup(popup, cx, cy) {
    if (!popup) return;
    const cnt = OC.ROV ? OC.ROV.getSamples().length : 0;
    popup.innerHTML =
      '<div class="popup-head"><span>Аппарат · Проб: ' + cnt + '</span><span class="popup-new">ROV «Наутилус-IV»</span></div>' +
      '<div class="popup-title">Исследовательский ROV</div>' +
      '<div class="popup-latin">Глубоководный аппарат до 4000 м</div>' +
      '<div class="popup-desc">Оснащён 3-звенным манипулятором (Z), вертикальным CTD-зондом (I), 4K-камерой, двойными прожекторами (F) и трассерами течений.</div>';
    popup.classList.remove('hidden');
    const x = Math.min(cx, window.innerWidth - 305);
    const y = Math.min(cy, window.innerHeight - 210);
    popup.style.left = Math.max(12, x + 14) + 'px';
    popup.style.top = Math.max(12, y + 10) + 'px';
  }

  function drawEchosounder(sonarCanvas, subMode, camPos, yaw, biome, time, sonarPingState) {
    if (!sonarCanvas || !subMode) return;
    const ctx = sonarCanvas.getContext('2d');
    if (!ctx) return;
    const w = sonarCanvas.width, h = sonarCanvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(2,14,26,0.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(88,224,255,0.12)';
    ctx.lineWidth = 1;
    for (let gx = 49; gx < w; gx += 49) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    for (let gy = 25; gy < h; gy += 25) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }

    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const maxRange = 140;
    const steps = 28;
    const maxDepthVis = Math.max(45, Math.min(180, -camPos.y + 42));
    const yToPx = (yVal) => {
      const depth = Math.max(0, -yVal);
      return 6 + (depth / maxDepthVis) * (h - 12);
    };

    ctx.strokeStyle = 'rgba(130,225,255,0.32)';
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(w, 6); ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * maxRange;
      const sx = camPos.x + fwdX * dist;
      const sz = camPos.z + fwdZ * dist;
      const fl = biome.getHeight(sx, sz);
      const px = (i / steps) * w;
      const py = Math.min(h - 2, Math.max(6, yToPx(fl)));
      ctx.lineTo(px, py);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(30, 125, 165, 0.34)';
    ctx.fill();

    ctx.strokeStyle = '#58e0ff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * maxRange;
      const fl = biome.getHeight(camPos.x + fwdX * dist, camPos.z + fwdZ * dist);
      const px = (i / steps) * w;
      const py = Math.min(h - 2, Math.max(6, yToPx(fl)));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const subPy = Math.min(h - 6, Math.max(6, yToPx(camPos.y)));
    ctx.strokeStyle = 'rgba(91, 232, 176, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(8, subPy); ctx.lineTo(w - 6, subPy); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#5be8b0';
    ctx.beginPath(); ctx.arc(8, subPy, 3.5, 0, Math.PI * 2); ctx.fill();

    const pingAge = time - sonarPingState.t;
    if (pingAge >= 0 && pingAge < 2.6) {
      const waveX = Math.min(w, (pingAge / 1.1) * w);
      ctx.strokeStyle = 'rgba(130, 250, 255, ' + (1 - pingAge / 2.6).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(waveX, 0); ctx.lineTo(waveX, h); ctx.stroke();

      if (sonarPingState.hit) {
        const tx = Math.min(w - 6, Math.max(12, (sonarPingState.range / maxRange) * w));
        ctx.fillStyle = sonarPingState.kind === 'fauna' ? '#ffb574' : '#5be8b0';
        ctx.beginPath(); ctx.arc(tx, subPy, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  OC._HudPanels = {
    ECO_LABELS,
    BIOME_SHORT,
    BIOME_REGION,
    updateLensDroplets,
    formatHeading,
    renderJournal,
    showInfo,
    showRovPopup,
    drawEchosounder
  };
})(window.OC);
