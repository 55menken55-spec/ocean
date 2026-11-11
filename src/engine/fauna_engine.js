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
  OC._FaunaCtx = OC._FaunaCtx || { fishMatInstanced: null, fishMatBiolum: null, creatureMat: null };
  OC._FaunaBuilders = OC._FaunaBuilders || {};

  /* Системы частиц и эффектов вынесены в fauna/systems.js */
  const {
    createCameraRelativeParticles, createCoralSpawningSystem, makeSplashSystem,
    makeBiolumTrail, makeThermoclineHaze, makeBenthicSiltSystem, makeHydratePlumeSystem
  } = OC._FaunaSystems;
  const { spawnFauna } = OC._FaunaSpawn;
  /* ---------- Галапагосы: Океаническая луна-рыба (Mola mola), Морская игуана, Пингвин, Косатка, Мобула, Арка Дарвина, Фумаролы ---------- */

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

      fishMatInstanced = OC._FaunaCtx.fishMatInstanced = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.48, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: biome.noSurface ? 0.0 : 0.56, fishSwim: true });

      fishMatBiolum = OC._FaunaCtx.fishMatBiolum = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true,
        emissive: new T.Color(0x2ce8ff),
        emissiveIntensity: 0.45,
        roughness: 0.42,
        metalness: 0.08,
        side: T.DoubleSide
      }), { causticStrength: biome.noSurface ? 0.0 : 0.34, fishSwim: true });

      creatureMat = OC._FaunaCtx.creatureMat = OC.enhanceMaterial(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.52, metalness: 0.06, side: T.DoubleSide
      }), { causticStrength: biome.noSurface ? 0.0 : 0.64 });

      const plan = biome.faunaPlan || {};
      const agents = [];
      const schools = [];
      const predatorAgents = [];
      const preySchools = [];
      const sonarTargets = [];
      const surfaceJumpers = [];
      const huntingAgents = [];
      const texSoft = OC.circleTexture(64, false);
      const texHard = OC.circleTexture(64, true);
      const splashSystem = makeSplashSystem(faunaGroup, texHard);
      const lastCamPos = new T.Vector3();

      const _splashTmp = new T.Vector3();
      function emitSplash(worldPos, intensity, zOpt) {
        let wp = worldPos;
        let inten = intensity;
        if (typeof worldPos === 'number') {
          _splashTmp.set(worldPos, 0, intensity || 0);
          wp = _splashTmp;
          inten = zOpt;
        }
        if (!wp || !Number.isFinite(wp.x) || !Number.isFinite(wp.z)) return;
        splashSystem.emit(wp, inten);
        if ((inten || 0) >= 0.6 && OC.sound && OC.sound.whaleSplash) {
          const d = Math.hypot(wp.x - lastCamPos.x, (wp.y || 0) - lastCamPos.y, wp.z - lastCamPos.z);
          if (d < 360) OC.sound.whaleSplash(d);
        }
      }

      const { whale, whalesList, primaryVessel } = spawnFauna({
        faunaGroup, biome, plan, emitSplash,
        agents, schools, predatorAgents, preySchools, sonarTargets,
        surfaceJumpers, huntingAgents
      });

      // ---- Пузыри, планктон, морской снег и шлейфы курильщиков ----

      // ---- Пузыри, планктон, морской снег и шлейфы курильщиков ----
      const pCountMult = OC.Quality.get().particlesScale;
      for (const vp of (plan.ventPlumes || [])) {
        agents.push(OC._FaunaBuilders.makeVentPlume(faunaGroup, biome, texSoft, vp));
      }
      const noSurf = !!biome.noSurface;
      const bubbleMat = createCameraRelativeParticles(faunaGroup, noSurf ? 80 : Math.round(900 * pCountMult), texHard, 'bubbles', noSurf);
      const planktonMat = createCameraRelativeParticles(faunaGroup, Math.round(1500 * pCountMult), texSoft, 'plankton', noSurf);
      const snowMat = createCameraRelativeParticles(faunaGroup, Math.round((noSurf ? 1400 : 1050) * pCountMult), texSoft, 'snow', noSurf);
      const isCoralBiome = (biome.id === 'great_barrier_reef' || biome.id === 'wreck_atoll' || biome.id === 'galapagos_upwelling');
      const coralSpawnSys = isCoralBiome ? createCoralSpawningSystem(faunaGroup, Math.round(340 * pCountMult), texSoft) : null;
      const thermoHaze = makeThermoclineHaze(faunaGroup, biome);
      const benthicSilt = makeBenthicSiltSystem(faunaGroup, biome, texSoft);
      const hydratePlumes = makeHydratePlumeSystem(faunaGroup, biome, texHard);
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
        fishActivity: 1.0,
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

      const _shadowCaster = { active: false, x: 0, y: 0, z: 0, radius: 4.5, key: '' };
      const SHADOW_RADII = {
        whale_humpback: 10.5, shark_whale: 7.8, orca: 5.8, manta: 4.6, mobula_ray: 4.2,
        shark_hammerhead: 3.6, galapagos_shark: 3.4, shark_tiger: 3.6, ocean_sunfish: 3.2,
        pink_dolphin: 3.1, arapaima: 3.2, narwhal: 3.5, beluga: 3.4, turtle: 2.4, dugong: 2.8, sea_lion: 2.3
      };

      activeSchoolsRef = schools;

      /* ============ УРОВНИ РЕДКОСТИ СОБЫТИЙ И ПРЕДВЕСТНИКИ ============
         common  — видно сразу, предвестника нет (выпрыг кита, порпойзинг, DVM, муть)
         rare    — предвестник ~30 с: стаи нервничают, гидрофон ловит звуки
         unique  — предвестник ~60 с: звук, тревога стай (нерест кораллов)
         Текстовых анонсов «скоро начнётся» нет — игрок сам замечает предвестники.
         ================================================================= */
      const EVENT_RARITY = {
        breach: 'common',
        porpoising: 'common',
        dvm: 'common',
        silt_out: 'common',
        hunt: 'rare',
        baitball: 'rare',
        cleaning: 'rare',
        coral_spawn: 'unique'
      };
      const HERALD_SECONDS = { common: 0, rare: 30, unique: 60 };

      // Детерминированный сид на тип события (воспроизводимо по сессии)
      function heraldSeed(type) {
        let h = 0;
        for (let i = 0; i < type.length; i++) h = (h * 31 + type.charCodeAt(i)) | 0;
        return h >>> 0;
      }

      // Состояние предвестника по типам событий
      const heraldState = {};
      for (const k of Object.keys(EVENT_RARITY)) {
        heraldState[k] = {
          phase: 'idle',      // idle | herald | active | cooldown
          timer: 0,           // секунды до конца текущей фазы
          progress: 0,        // 0..1 внутри фазы предвестника
          cooldownUntil: 0,   // время, когда следующий предвестник может начаться
          rng: OC.mulberry32(heraldSeed(k))
        };
      }

      OC.faunaInfo = {
        schoolFish: 0,
        schools: schools.length,
        big: agents.length - schools.length,
        whale,
        vessel: primaryVessel ? primaryVessel.shipInfo : null,
        shadowCaster: _shadowCaster,
        activeEvent: null,
        herald: null,         // {type, rarity, progress} или null
        dvmPhase: 'day_deep',
        dvmShiftM: -5.5,
        coralSpawnIntensity: 0,
        nocturnalPredators: 0,
        thermoclineActive: false,
        thermoDepthM: thermoHaze.enabled ? Math.abs(thermoHaze.thermoY) : 0,
        siltTurbidity: 0,
        siltCount: 0,
        hydratePlumesActive: !!hydratePlumes.hasHydrates
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
        getVesselInfo: () => (primaryVessel ? primaryVessel.shipInfo : null),
        notifySonarPing(origin) {
          if (origin) sonarOrigin.copy(origin);
          updateCtx.sonarPulseAge = 0;
        },
        notifySiltKick(origin, strength) {
          if (benthicSilt && origin) benthicSilt.kick(origin, strength || 1.0);
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
          const ecoState = OC.EcoLab ? OC.EcoLab.getState() : null;
          updateCtx.fishActivity = ecoState ? ecoState.fishActivity : 1.0;
          updateCtx.frameIdx++;
          if (updateCtx.sonarPulseAge < 90) updateCtx.sonarPulseAge += dt;

          // Собираем активных хищников и косяки жертв в переиспользуемые массивы (без GC аллокаций)
          predatorsBuf.length = 0;
          let noctCount = 0;
          for (let i = 0; i < predatorAgents.length; i++) {
            const pa = predatorAgents[i];
            if (pa.isNocturnalPredator && dayW > 0.55) continue;
            if (pa.isNocturnalPredator) noctCount++;
            const p = pa.getPosition ? pa.getPosition() : null;
            if (p) predatorsBuf.push(p);
          }
          OC.faunaInfo.nocturnalPredators = noctCount;

          preyCentersBuf.length = 0;
          for (let i = 0; i < preySchools.length; i++) {
            const ps = preySchools[i];
            if (ps.mesh && ps.mesh.visible && ps.center) preyCentersBuf.push(ps.center);
          }

          // Клиенты станций чистки и выбор ближайшей мегафауны для тени на мелководном дне
          _shadowCaster.active = false;
          let bestShadowScore = 1e9;
          for (let i = 0; i < agents.length; i++) {
            const ag = agents[i];
            if (!ag || !ag.key || !ag.getPosition) continue;
            const sr = SHADOW_RADII[ag.key];
            if (!sr) continue;
            const ap = ag.getPosition();
            const dCam = Math.hypot(ap.x - camPos.x, ap.z - camPos.z);
            if (dCam < 135 && dCam - sr * 4 < bestShadowScore) {
              bestShadowScore = dCam - sr * 4;
              _shadowCaster.active = true;
              _shadowCaster.x = ap.x;
              _shadowCaster.y = ap.y;
              _shadowCaster.z = ap.z;
              _shadowCaster.radius = sr;
              _shadowCaster.key = ag.key;
            }
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

          // --- Предвестники событий (без текстовых анонсов, без календаря) ---
          const now = time;

          // Обновляем таймеры фаз предвестников
          for (const k of Object.keys(heraldState)) {
            const st = heraldState[k];
            if (st.timer > 0) {
              st.timer -= dt;
              if (st.timer <= 0) {
                st.timer = 0;
                if (st.phase === 'herald') st.phase = 'active';
                else if (st.phase === 'active') st.phase = 'cooldown';
                else if (st.phase === 'cooldown') st.phase = 'idle';
              }
              const hs = HERALD_SECONDS[EVENT_RARITY[k]];
              st.progress = hs > 0 ? 1.0 - Math.max(0, st.timer) / hs : 0;
            }
          }

          // Пытаемся начать новый предвестник для редких/уникальных событий
          for (const k of Object.keys(EVENT_RARITY)) {
            const st = heraldState[k];
            const rarity = EVENT_RARITY[k];
            const heraldSec = HERALD_SECONDS[rarity];
            if (heraldSec === 0) continue; // common — без предвестника
            if (st.phase !== 'idle') continue;
            if (now < st.cooldownUntil) continue;
            // Детерминированный шанс на старт предвестника (~раз в 4–8 мин в среднем)
            if (st.rng() < 0.002) {
              st.phase = 'herald';
              st.timer = heraldSec;
              st.cooldownUntil = now + heraldSec + 45 + st.rng() * 90; // пауза 45–135 с после события
              // subtle audio cue: гидрофон ловит отдалённый звук
              const sound = OC.sound;
              if (sound && !sound.muted && sound.ctx && sound.ctx.state === 'running') {
                if (rarity === 'unique') sound.whale();
                else sound.sonarPing(60, false);
              }
            }
          }

          // Текущий активный предвестник (для faunaInfo и потенциальных визуальных намёков)
          let currentHerald = null;
          for (const k of Object.keys(heraldState)) {
            const st = heraldState[k];
            if (st.phase === 'herald' || st.phase === 'active') {
              currentHerald = {
                type: k,
                rarity: EVENT_RARITY[k],
                progress: st.progress
              };
              break; // только один предвестник одновременно
            }
          }
          OC.faunaInfo.herald = currentHerald;

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
              if (surfaceJumpers[i].isPorpoising && surfaceJumpers[i].isPorpoising()) {
                const p = surfaceJumpers[i].getPosition();
                if (Math.hypot(p.x - camPos.x, p.z - camPos.z) < 190) { ev = 'porpoising'; break; }
              }
            }
          }
          // Суточный цикл экосистемы: вертикальная миграция планктона (DVM) и ночной нерест кораллов
          const tod = OC.getTimeOfDay ? OC.getTimeOfDay() : 0.5;
          const dvmShift = noSurf ? 0 : OC.lerp(6.5, -5.5, dayW);
          const dvmPhase = noSurf
            ? 'abyss_constant'
            : (dayW > 0.68 ? 'day_deep' : (dayW < 0.26 ? 'night_surface' : (tod > 0.5 ? 'dusk_ascent' : 'dawn_descent')));
          const coralSpawnIntensity = isCoralBiome ? OC.clamp((0.38 - dayW) / 0.28, 0, 1) : 0;
          OC.faunaInfo.dvmPhase = dvmPhase;
          OC.faunaInfo.dvmShiftM = Math.round(dvmShift * 10) / 10;
          OC.faunaInfo.coralSpawnIntensity = Math.round(coralSpawnIntensity * 100) / 100;

          if (!ev && coralSpawnIntensity > 0.35 && camPos.y > -34) {
            ev = 'coral_spawn';
          } else if (!ev && !noSurf && (dvmPhase === 'dusk_ascent' || (dvmPhase === 'night_surface' && !isCoralBiome))) {
            ev = 'dvm';
          }
          OC.faunaInfo.activeEvent = ev;

          // Переходы фаз предвестника → событие → пауза
          if (ev) {
            const st = heraldState[ev];
            if (st) {
              if (st.phase === 'herald') st.phase = 'active';
              if (st.phase === 'active') st.timer = 0; // событие началось, удерживаем фазу active
            }
          } else {
            // События сейчас нет — если был active, уходим в cooldown
            for (const k of Object.keys(heraldState)) {
              const st = heraldState[k];
              if (st.phase === 'active') st.phase = 'cooldown';
            }
          }

          bubbleMat.uniforms.uCamPos.value.copy(camPos);
          planktonMat.uniforms.uCamPos.value.copy(camPos);
          planktonMat.uniforms.uDvmShift.value = dvmShift;
          snowMat.uniforms.uCamPos.value.copy(camPos);

          if (coralSpawnSys) {
            coralSpawnSys.pts.visible = coralSpawnIntensity > 0.02;
            coralSpawnSys.mat.uniforms.uCamPos.value.copy(camPos);
            coralSpawnSys.mat.uniforms.uIntensity.value = coralSpawnIntensity;
          }

          // Плавная адвекция планктона, пузырей и морского снега по локальному течению
          if (biome.getCurrentAt && (biome.noSurface || camPos.y < 1.5)) {
            biome.getCurrentAt(camPos.x, camPos.y, camPos.z, time, _currFlow);
            const flowMult = ecoState ? ecoState.currentMult : 1.0;
            _flowAccum.addScaledVector(_currFlow, dt * 1.35 * flowMult);
            _flowAccum.x = ((_flowAccum.x % 180) + 180) % 180;
            _flowAccum.y = ((_flowAccum.y % 110) + 110) % 110;
            _flowAccum.z = ((_flowAccum.z % 180) + 180) % 180;
            bubbleMat.uniforms.uFlowOffset.value.copy(_flowAccum);
            planktonMat.uniforms.uFlowOffset.value.copy(_flowAccum);
            snowMat.uniforms.uFlowOffset.value.copy(_flowAccum);
            if (coralSpawnSys) coralSpawnSys.mat.uniforms.uFlowOffset.value.copy(_flowAccum);
          }

          planktonMat.uniforms.uBio.value = pal.bioGlow;
          planktonMat.uniforms.uColor.value.copy(pal.bioGlow > 0.45 ? bioPlanktonCol : dayPlanktonCol);
          snowMat.uniforms.uBio.value = flashOn ? 1.0 : 0.15;
          thermoHaze.update(camPos, dayW);
          OC.faunaInfo.thermoclineActive = !!(thermoHaze.enabled && Math.abs(camPos.y - thermoHaze.thermoY) < 3.6);
          const siltSt = benthicSilt.update(dt, time, camPos, camSpeed || 0);
          OC.faunaInfo.siltTurbidity = Math.round(siltSt.turbidity * 100) / 100;
          OC.faunaInfo.siltCount = siltSt.active;
          if (!ev && siltSt.turbidity > 0.38) OC.faunaInfo.activeEvent = 'silt_out';
          biolumTrail.update(dt, time, camPos, camSpeed || 0, pal.bioGlow || 0, !!flashOn);
        },
        setScale(s) {
          bubbleMat.uniforms.uScale.value = s;
          planktonMat.uniforms.uScale.value = s;
          snowMat.uniforms.uScale.value = s;
          if (coralSpawnSys) coralSpawnSys.mat.uniforms.uScale.value = s;
          benthicSilt.setScale(s);
          hydratePlumes.setScale(s);
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
        },
        /* Пассивный гидроакустический сканер всех звучащих существ и гео-источников вокруг */
        scanAcousticSources(origin, maxRange) {
          const maxR = maxRange || 260;
          const out = [];
          for (let i = 0; i < agents.length; i++) {
            const tgt = agents[i];
            const pos = tgt.getPosition ? tgt.getPosition() : null;
            if (!pos) continue;
            const dx = pos.x - origin.x;
            const dy = pos.y - origin.y;
            const dz = pos.z - origin.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist > maxR) continue;
            const enc = biome.encyclopedia && biome.encyclopedia[tgt.key];
            const amp = Math.pow(1.0 - dist / maxR, 1.35);
            const bearingDeg = ((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360;
            out.push({
              key: tgt.key,
              label: enc ? enc[0] : (tgt.key || 'Акустический объект'),
              dist,
              bearingDeg,
              amp,
              x: pos.x,
              y: pos.y,
              z: pos.z
            });
          }
          // Геоакустические ориентиры (чёрные курильщики, фумаролы, метановые сипы, ледяные сталактиты)
          if (biome && Array.isArray(biome.landmarks)) {
            for (let i = 0; i < biome.landmarks.length; i++) {
              const lm = biome.landmarks[i];
              if (!lm) continue;
              const lid = (lm.id || '').toLowerCase();
              let geoKey = null;
              if (lid.includes('smoker') || lid.includes('vent')) geoKey = 'vent_chimney';
              else if (lid.includes('fumarole')) geoKey = 'volcanic_fumarole';
              else if (lid.includes('hydrate') || lid.includes('seep') || lid.includes('brine')) geoKey = 'methane_hydrate';
              else if (lid.includes('brinicle') || lid.includes('ice')) geoKey = 'brinicle';
              if (!geoKey) continue;
              const ly = lm.y - 3.0;
              const dx = lm.x - origin.x;
              const dy = ly - origin.y;
              const dz = lm.z - origin.z;
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist > maxR) continue;
              const amp = Math.pow(1.0 - dist / maxR, 1.4) * 0.72;
              const bearingDeg = ((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360;
              out.push({
                key: geoKey,
                label: lm.name || 'Геоакустический источник',
                dist,
                bearingDeg,
                amp,
                x: lm.x,
                y: ly,
                z: lm.z
              });
            }
          }
          out.sort((a, b) => b.amp - a.amp);
          return out.slice(0, 6);
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
      const savedMat = OC._FaunaCtx.creatureMat;
      let built = null;

      try {
        OC._FaunaCtx.creatureMat = previewMat;

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
            } else if (bId === 'mariana_trench') {
              c.setHex(0x282c36).lerp(new T.Color(0x6d8492), Math.sin(x * 0.45 + z * 0.35) * 0.25 + 0.25);
            } else if (bId === 'brine_pool') {
              c.setHex(0x3a3248).lerp(new T.Color(0x8cd2d8), Math.sin(x * 0.42 + z * 0.42) * 0.32 + 0.35);
            } else if (bId === 'cenote_caves') {
              c.setHex(0x8e836e).lerp(new T.Color(0xcab999), Math.sin(x * 0.44 + z * 0.4) * 0.38 + 0.4);
            } else if (bId === 'galapagos_upwelling') {
              c.setHex(0x232228).lerp(new T.Color(0x4c5840), Math.sin(x * 0.4 + z * 0.4) * 0.3 + 0.3);
            } else if (bId === 'amazon_igapo') {
              c.setHex(0x4a331d).lerp(new T.Color(0x8e6b42), Math.sin(x * 0.42 + z * 0.38) * 0.35 + 0.35);
            } else {
              c.setHex(0xdbc9a4).lerp(new T.Color(0xc49c76), Math.sin(x * 0.45 + z * 0.45) * 0.5 + 0.5);
            }
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
          }
          g.setAttribute('color', new T.BufferAttribute(colors, 3));
          g.computeVertexNormals();
          built = new T.Mesh(g, previewMat);
        } else if (key === 'lionfish') {
          OC._FaunaBuilders.makeLionfish(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'moray') {
          OC._FaunaBuilders.makeMoray(tmpGroup, dummyBiome, { x: 0, z: 0 });
        } else if (key === 'octopus') {
          OC._FaunaBuilders.makeOctopus(tmpGroup, dummyBiome, { x: 0, z: 0, scale: 1 });
        } else if (key === 'ray_spotted' || key === 'ray_eagle') {
          OC._FaunaBuilders.makeRay(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, speed: 2, eagle: key === 'ray_eagle', scale: 1 });
        } else if (key === 'manta') {
          OC._FaunaBuilders.makeManta(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, span: 10, size: 1 });
        } else if (key === 'turtle') {
          OC._FaunaBuilders.makeTurtle(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, size: 1 });
        } else if (key === 'dugong') {
          OC._FaunaBuilders.makeDugong(tmpGroup, dummyBiome, { cx: 0, cz: 0, r: 10, scale: 1 });
        } else if (key === 'shark_reef' || key === 'shark_whale' || key === 'shark_leopard' || key === 'shark_greenland' || key === 'galapagos_shark') {
          OC._FaunaBuilders.makeShark(tmpGroup, dummyBiome, {
            cx: 0, cz: 0, y: 0, r: 10, speed: 2,
            speciesKey: key, whaleShark: key === 'shark_whale'
          });
        } else if (key === 'whale_humpback') {
          OC._FaunaBuilders.makeHumpbackWhale(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 20 });
        } else if (key === 'jelly' || key === 'jelly_deep') {
          OC._FaunaBuilders.makeJelly(tmpGroup, { cx: 0, cz: 0, y: 0, r: 2, hue: key === 'jelly_deep' ? 0.56 : 0.85, deep: key === 'jelly_deep', scale: 1 });
        } else if (key === 'sea_lion') {
          OC._FaunaBuilders.makeSeaLion(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'fish_angler') {
          OC._FaunaBuilders.makeAnglerfish(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'squid_abyssal') {
          OC._FaunaBuilders.makeAbyssalSquid(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 8, scale: 1 });
        } else if (key === 'octopus_dumbo') {
          OC._FaunaBuilders.makeDumboOctopus(tmpGroup, dummyBiome, { x: 0, z: 0, scale: 1 });
        } else if (key === 'beluga') {
          OC._FaunaBuilders.makeBeluga(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, len: 4.8, scale: 1 });
        } else if (key === 'narwhal') {
          OC._FaunaBuilders.makeNarwhal(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, len: 5.0, scale: 1 });
        } else if (key === 'jelly_arctic') {
          OC._FaunaBuilders.makeArcticJelly(tmpGroup, { cx: 0, cz: 0, y: 0, scale: 1 });
        } else if (key === 'clione_angel') {
          OC._FaunaBuilders.makeClione(tmpGroup, { cx: 0, cz: 0, y: 0, n: 1, singlePreview: true });
        } else if (key === 'shipwreck') {
          OC._FaunaBuilders.makeShipwreck(tmpGroup, dummyBiome, { x: 0, z: 0, yOffset: 0, pitch: 0, yaw: 0, roll: 0 });
        } else if (key === 'shark_hammerhead') {
          OC._FaunaBuilders.makeHammerhead(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, r: 10, len: 4.8 });
        } else if (key === 'jelly_golden') {
          OC._FaunaBuilders.makeGoldenJelly(tmpGroup, { cx: 0, cz: 0, y: 0, scale: 1 });
        } else if (key === 'research_vessel') {
          const bId = biome ? biome.id : 'great_barrier_reef';
          const vVariant = bId === 'arctic_sea' ? 'polar' : bId === 'kelp_forest' ? 'coastal' : bId === 'wreck_atoll' ? 'expedition' : (bId === 'galapagos_upwelling' ? 'galapagos' : 'tropical');
          OC._FaunaBuilders.makeResearchVessel(tmpGroup, dummyBiome, { x: 0, z: 0, yaw: 0, variant: vVariant, preview: true });
        } else if (key === 'seabird') {
          const bId = biome ? biome.id : 'great_barrier_reef';
          const sVariant = bId === 'arctic_sea' ? 'arctic' : bId === 'kelp_forest' ? 'albatross' : (bId === 'galapagos_upwelling' ? 'booby' : 'tropical');
          OC._FaunaBuilders.makeSeabirdFlock(tmpGroup, dummyBiome, { cx: 0, cz: 0, y: 0, singlePreview: true, variant: sVariant });
        } else if (key === 'dolphin') {
          const bId = biome ? biome.id : 'great_barrier_reef';
          const dVariant = bId === 'arctic_sea' ? 'arctic' : bId === 'kelp_forest' ? 'pacific' : 'spinner';
          OC._FaunaBuilders.makeDolphinPod(tmpGroup, dummyBiome, { cx: 0, cz: 0, r: 10, singlePreview: true, variant: dVariant });
        } else if (key === 'flying_fish') {
          OC._FaunaBuilders.makeFlyingFishPod(tmpGroup, dummyBiome, { cx: 0, cz: 0, r: 10, singlePreview: true });
        } else if (key === 'whale_fall') {
          OC._FaunaBuilders.makeWhaleFall(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'hadal_snailfish') {
          OC._FaunaBuilders.makeHadalSnailfish(tmpGroup, dummyBiome, { cx: 0, cz: 0, scale: 1.5 });
        } else if (key === 'sea_pig') {
          OC._FaunaBuilders.makeSeaPig(tmpGroup, dummyBiome, { cx: 0, cz: 0, singlePreview: true });
        } else if (key === 'brine_pool_lake') {
          OC._FaunaBuilders.makeBrineLake(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'siphonophore') {
          OC._FaunaBuilders.makeSiphonophore(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'oarfish') {
          OC._FaunaBuilders.makeOarfish(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'chimaera') {
          OC._FaunaBuilders.makeChimaera(tmpGroup, dummyBiome, { cx: 0, cz: 0, scale: 1.25 });
        } else if (key === 'ariadne_line') {
          OC._FaunaBuilders.makeAriadneGuideline(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'halocline_layer') {
          OC._FaunaBuilders.makeHaloclineLayer(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'cave_remipede') {
          OC._FaunaBuilders.makeCaveRemipede(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'blind_brotula') {
          OC._FaunaBuilders.makeBlindBrotula(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'ocean_sunfish') {
          OC._FaunaBuilders.makeOceanSunfish(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'marine_iguana') {
          OC._FaunaBuilders.makeMarineIguana(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'galapagos_penguin') {
          OC._FaunaBuilders.makeGalapagosPenguin(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'orca') {
          OC._FaunaBuilders.makeOrca(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'mobula_ray') {
          OC._FaunaBuilders.makeMobulaRay(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'darwins_arch') {
          OC._FaunaBuilders.makeDarwinsArch(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'pink_dolphin') {
          OC._FaunaBuilders.makePinkDolphin(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'arapaima') {
          OC._FaunaBuilders.makeArapaima(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'electric_eel') {
          OC._FaunaBuilders.makeElectricEel(tmpGroup, dummyBiome, { preview: true });
        } else if (key === 'river_stingray') {
          OC._FaunaBuilders.makeRiverStingray(tmpGroup, dummyBiome, { preview: true });
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
            const fg = OC._FaunaBuilders.makeFishGeo(fishSpec.geoOpts || {});
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
        OC._FaunaCtx.creatureMat = savedMat;
      }
    }
  };
})(window.OC);
