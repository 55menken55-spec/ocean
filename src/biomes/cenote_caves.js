/* ================= 8-Й БИОМ: ПОДВОДНЫЕ КАРСТОВЫЕ ПЕЩЕРЫ И СЕНОТЫ ЮКАТАНА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const MAIN_CENOTE = { x: 0, z: 0, openR: 60, rimR: 72, blendR: 112, floorBase: -31.5 };
  const SKY_CENOTE = { x: 210, z: -185, openR: 38, rimR: 48, blendR: 80, floorBase: -26.5 };
  const ANGELITA = { x: -210, z: 130, r: 82 };
  const EL_PIT = { x: 180, z: 210, r: 86 };

  const SHAFTS = [MAIN_CENOTE, SKY_CENOTE];

  // Основные галереи карстовой сети (для широких сводов, ориентирования и нити Ариадны)
  const GALLERIES = [
    [0, 0, -95, 58, 56],
    [-95, 58, -210, 130, 62],
    [0, 0, 96, -88, 50],
    [96, -88, 210, -185, 50],
    [0, 0, 90, 105, 52],
    [90, 105, 180, 210, 58],
    [-95, 58, 90, 105, 42]
  ];

  // Точки маршрута ходовой нити Ариадны (маркеры указывают путь обратно к свету (0, 0))
  const ARIADNE_WEST = [
    [0, -14.0, 22],
    [-38, -14.5, 24],
    [-95, -15.5, 58],
    [-148, -17.5, 92],
    [-205, -20.0, 126]
  ];
  const ARIADNE_NORTH = [
    [0, -14.0, -24],
    [48, -14.5, -52],
    [96, -15.0, -88],
    [152, -14.5, -136],
    [206, -14.0, -182]
  ];
  const ARIADNE_SOUTH = [
    [16, -15.0, 26],
    [54, -18.5, 68],
    [90, -21.0, 105],
    [138, -24.5, 158],
    [178, -28.0, 206]
  ];

  const ZONES = [
    {
      id: 'cenote_pit',
      name: 'Открытый сенот и лучи света',
      shortName: 'Портал сенота',
      depth: '0 – 34 м',
      tempC: 25.8,
      visibilityM: 70,
      life: 'Тропические лианы · Моллинезии · Пресноводные черепахи',
      desc: 'Карстовый провал в известняке Юкатана, открытый тропическому небу. Кристально чистая пресная вода пронизана лазерными снопами солнечных лучей среди свисающих корней фикусов.'
    },
    {
      id: 'stalactite_gallery',
      name: 'Галерея сталактитов и нить Ариадны',
      shortName: 'Зал сталактитов',
      depth: '6 – 28 м',
      tempC: 24.6,
      visibilityM: 82,
      life: 'Сталактиты и сталагмиты · Слепые тетры · Пещерные креветки',
      desc: 'Огромные затопленные залы, сформированные в ледниковую эпоху над уровнем моря: своды увешаны тысячелетними сталактитами, а путь к выходу размечен оранжевой ходовой нитью Ариадны.'
    },
    {
      id: 'halocline_cloud',
      name: 'Галоклин и облако сероводорода (Анхелита)',
      shortName: 'Галоклин Анхелиты',
      depth: '22 – 38 м',
      tempC: 26.1,
      visibilityM: 38,
      life: 'Облако H₂S · Древние стволы джунглей · Гребненосец Xibalbanus',
      desc: 'На границе пресной воды (0‰) и плотного прибрежного рассола (35‰) мерцает зеркало галоклина и клубится призрачное облако сероводорода, сквозь которое проступают затонувшие деревья.'
    },
    {
      id: 'el_pit_abyss',
      name: 'Глубокий колодец Эль-Пит и стигобионты',
      shortName: 'Бездна Эль-Пит',
      depth: '32 – 58 м',
      tempC: 26.4,
      visibilityM: 48,
      life: 'Слепая бротула Typhliasina · Безглазые креветки · Кристальный карст',
      desc: 'Самый глубокий подземный колодец системы: в абсолютной темноте на глубине 58 м обитают эндемичные слепые рыбы и ракообразные, не знающие солнечного света.'
    }
  ];

  function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const t = OC.clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  }

  function galleryWeight(x, z) {
    let best = 0;
    for (let i = 0; i < GALLERIES.length; i++) {
      const g = GALLERIES[i];
      const d = segDist(x, z, g[0], g[1], g[2], g[3]);
      const w = OC.smoothstep(g[4] * 1.45, g[4] * 0.25, d);
      if (w > best) best = w;
    }
    const angW = OC.smoothstep(ANGELITA.r * 1.25, ANGELITA.r * 0.45, Math.hypot(x - ANGELITA.x, z - ANGELITA.z));
    const pitW = OC.smoothstep(EL_PIT.r * 1.25, EL_PIT.r * 0.45, Math.hypot(x - EL_PIT.x, z - EL_PIT.z));
    return Math.max(best, angW, pitW);
  }

  function shaftMetrics(x, z, s) {
    const dx = x - s.x, dz = z - s.z;
    const a = Math.atan2(dz, dx);
    const scall = Math.sin(a * 5.0 + s.x * 0.02) * 3.2 + Math.cos(a * 3.0 - s.z * 0.03) * 2.4;
    const d = Math.hypot(dx, dz) + scall;
    return d;
  }

  function isCeilingOpen(x, z) {
    for (let i = 0; i < SHAFTS.length; i++) {
      if (shaftMetrics(x, z, SHAFTS[i]) < SHAFTS[i].openR) return true;
    }
    return false;
  }

  function getCeilingHeight(x, z) {
    const gw = galleryWeight(x, z);
    const karstN = OC.fbm2(x * 0.011 + 4.3, z * 0.011 - 2.9, 3);
    const fineN = OC.fbm2(x * 0.036, z * 0.036, 2);

    // Базовый подводный свод: в залах выше (-5.5 .. -8.5 м), в боковых камерах ниже (-14 .. -16.5 м)
    let ceil = OC.lerp(-14.6, -6.4, gw) + karstN * 1.8 + fineN * 0.65;

    // Открытые карстовые воронки-сеноты поднимают свод вверх к небу (+14.5 м)
    for (let i = 0; i < SHAFTS.length; i++) {
      const s = SHAFTS[i];
      const d = shaftMetrics(x, z, s);
      if (d < s.openR - 4) return 180.0;
      const holeLift = 1.0 - OC.smoothstep(s.rimR - 2, s.blendR, d);
      if (holeLift > 0.001) {
        const rimHeight = 14.5 + karstN * 1.1;
        ceil = OC.lerp(ceil, rimHeight, holeLift);
      }
    }
    return ceil;
  }

  function getHeight(x, z) {
    const gw = galleryWeight(x, z);
    const floorN = OC.fbm2(x * 0.009 - 1.7, z * 0.009 + 3.1, 3);
    const rubble = Math.abs(OC.fbm2(x * 0.032, z * 0.032, 2));

    let y = OC.lerp(-25.8, -28.2, gw) + floorN * 2.1 + rubble * 1.25;

    // Главный и северный сеноты имеют обрушившийся известняковый конус в центре и глубокое дно
    for (let i = 0; i < SHAFTS.length; i++) {
      const s = SHAFTS[i];
      const d = Math.hypot(x - s.x, z - s.z);
      const basinW = 1.0 - OC.smoothstep(s.openR * 0.5, s.blendR, d);
      if (basinW > 0.001) {
        const debrisMound = Math.exp(-(d * d) / (s.openR * s.openR * 0.24)) * 6.5;
        y = OC.lerp(y, s.floorBase + debrisMound + rubble * 1.6, basinW);
      }
    }

    // Сенот Анхелита: котловина под облако H2S (-36.5 м)
    const dAng = Math.hypot(x - ANGELITA.x, z - ANGELITA.z);
    if (dAng < ANGELITA.r * 1.3) {
      const aw = 1.0 - OC.smoothstep(ANGELITA.r * 0.35, ANGELITA.r * 1.25, dAng);
      y -= aw * 8.6;
    }

    // Глубокий колодец Эль-Пит (-58 м)
    const dPit = Math.hypot(x - EL_PIT.x, z - EL_PIT.z);
    if (dPit < EL_PIT.r * 1.35) {
      const pw = 1.0 - OC.smoothstep(EL_PIT.r * 0.22, EL_PIT.r * 1.2, dPit);
      y -= pw * 29.8;
    }

    return y;
  }

  function cenoteLightFactor(x, z) {
    let best = 0;
    for (let i = 0; i < SHAFTS.length; i++) {
      const s = SHAFTS[i];
      const d = shaftMetrics(x, z, s);
      const l = 1.0 - OC.smoothstep(s.openR * 0.72, s.blendR + 85, d);
      if (l > best) best = l;
    }
    return best;
  }

  function getHaloclineAt(x, y, z) {
    const dAng = Math.hypot(x - ANGELITA.x, z - ANGELITA.z);
    const inAngelita = dAng <= ANGELITA.r * 0.96;
    if (inAngelita && y <= -22.8 && y >= -27.2) {
      return { level: -24.5, sulfide: true, salinityJump: 35 };
    }
    if (y <= -23.8 && y >= -25.8 && Math.hypot(x, z) > 105) {
      return { level: -24.5, sulfide: false, salinityJump: 32 };
    }
    return null;
  }

  function getZoneAt(x, y, z) {
    if (Math.hypot(x - EL_PIT.x, z - EL_PIT.z) <= EL_PIT.r * 1.15 && y < -28.0) return ZONES[3]; // el_pit_abyss
    const dAng = Math.hypot(x - ANGELITA.x, z - ANGELITA.z);
    if (dAng <= ANGELITA.r * 1.05 || y < -24.0) return ZONES[2]; // halocline_cloud
    if (isCeilingOpen(x, z) || cenoteLightFactor(x, z) > 0.68) return ZONES[0]; // cenote_pit
    return ZONES[1]; // stalactite_gallery
  }

  function getTerrainColor(x, y, z, out) {
    const n = OC.fbm2(x * 0.045, z * 0.045, 2) * 0.5 + 0.5;
    const light = cenoteLightFactor(x, z);
    if (y < -42) {
      out.setHex(0x3a3734).lerp(new T.Color(0x5b544c), n); // глубокий тёмный карст Эль-Пит
    } else if (y < -25.0) {
      out.setHex(0x645c4e).lerp(new T.Color(0x887b64), n); // ниже галоклина — бурый известняк
    } else if (light > 0.35) {
      out.setHex(0x7c8c64).lerp(new T.Color(0xcab993), n); // замшелый солнечный известняк сенота
    } else {
      out.setHex(0x9a8c74).lerp(new T.Color(0xd2c3a4), n * 0.85); // кремово-белый юкатанский карст
    }
    return out;
  }

  function getCeilingColor(x, y, z, out) {
    const n = OC.fbm2(x * 0.04 + 9.1, z * 0.04 - 5.4, 2) * 0.5 + 0.5;
    if (y > 2.5) {
      // Надводная кромка каньона сенота: известняк и зелёный мох/джунгли сверху
      const greenMix = OC.smoothstep(4.5, 13.5, y);
      out.setHex(0x9c8f76).lerp(new T.Color(0x3a6434), greenMix * (0.45 + 0.45 * n));
    } else if (y > -2.5) {
      out.setHex(0x6c6e58).lerp(new T.Color(0xa69b82), n); // ватерлиния провала
    } else {
      out.setHex(0x7d705c).lerp(new T.Color(0xbaa788), n); // подводный карстовый свод
    }
    return out;
  }

  function getTemperatureAt(x, d) {
    // Пресный верхний слой (~24.6°C) теплее после галоклина на ~24 м (~26.4°C — реальная инверсия Юкатана!)
    const haloMix = OC.smoothstep(22.0, 27.5, d);
    return OC.lerp(24.6, 26.4, haloMix);
  }

  const cTop = new T.Color();
  const cMid = new T.Color();
  const cBot = new T.Color();
  const cWater = new T.Color();
  const cFog = new T.Color();
  const cAboveTop = new T.Color(0x2884c8);
  const cAboveHor = new T.Color(0x92dff0);

  function getOpticalProfile(x, y, z, dayW) {
    const open = isCeilingOpen(x, z);
    const above = open && y > 0.25;
    const depth = Math.max(0, -y);
    const light = cenoteLightFactor(x, z);
    const dAng = Math.hypot(x - ANGELITA.x, z - ANGELITA.z);
    const inSulfide = dAng < ANGELITA.r && y < -24.3;

    if (above) {
      cTop.setHex(0x1f6ca6).lerp(new T.Color(0x061422), 1 - dayW);
      cBot.setHex(0x88d4e0).lerp(new T.Color(0x0d2638), 1 - dayW);
      cFog.copy(cBot);
      cWater.setHex(0x129892);
      return {
        aboveWater: true,
        fogColor: cFog,
        fogDensity: 0.0042,
        causticStrength: 0.9 * dayW,
        rayStrength: 0.0,
        sunAtten: 0.35 + 0.65 * dayW,
        bioGlow: 1 - dayW,
        waterColor: cWater,
        skyTop: cTop,
        skyBot: cBot,
        aboveTop: cAboveTop.clone().lerp(new T.Color(0x05101e), 1 - dayW),
        aboveHoriz: cAboveHor.clone().lerp(new T.Color(0x0c2238), 1 - dayW),
        fillAColor: new T.Color(0x5ae2d4),
        fillBColor: new T.Color(0xbce8c8)
      };
    }

    const dFade = Math.exp(-depth * 0.025);
    const shaftDay = light * dayW;
    const sunAtten = OC.clamp(0.05 + shaftDay * dFade * 0.95, 0.05, 1.0);

    const caveBg = new T.Color(0x041118);
    const shaftBg = new T.Color(0x0d7d74);
    const sulfideBg = new T.Color(0x3a4834);

    cFog.copy(caveBg).lerp(shaftBg, shaftDay * 0.85 * dFade);
    if (inSulfide) cFog.lerp(sulfideBg, OC.smoothstep(-24.2, -26.2, y) * 0.72);

    cTop.copy(cFog).lerp(new T.Color(0x28b8a8), shaftDay * 0.55);
    cBot.copy(cFog).multiplyScalar(0.55);
    cWater.setHex(0x0b3a42).lerp(new T.Color(0x1cb4a2), shaftDay);

    let fogDensity = OC.lerp(0.0112, 0.0082, shaftDay);
    if (inSulfide) fogDensity += OC.smoothstep(-24.2, -26.5, y) * 0.014;

    return {
      aboveWater: false,
      fogColor: cFog,
      fogDensity,
      causticStrength: 0.95 * shaftDay * dFade,
      rayStrength: 1.18 * shaftDay * Math.exp(-depth * 0.028),
      sunAtten,
      bioGlow: Math.max(0.28, 1.0 - shaftDay * 0.8),
      waterColor: cWater,
      skyTop: cTop,
      skyBot: cBot,
      fillAColor: new T.Color(0x269298).lerp(new T.Color(0x52e2d4), shaftDay),
      fillBColor: new T.Color(0x465864),
      fillAMult: 0.35 + 0.65 * sunAtten,
      fillBMult: 0.25 + 0.55 * sunAtten
    };
  }

  function getCurrentAt(x, y, z, time, out) {
    out = out || new T.Vector3();
    // Медленный карстовый подземный поток от глубинных галерей к океанскому шельфу
    const flowA = Math.sin(x * 0.018 + time * 0.14) * 0.14;
    const flowB = Math.cos(z * 0.018 - time * 0.11) * 0.12;
    out.set(0.18 + flowA, Math.sin(time * 0.4 + x * 0.05) * 0.04, -0.08 + flowB);
    return out;
  }

  function generateChunkFlora(cx, cz, chunkSize, scale, rng) {
    const items = [];
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;

    // 1. Вдоль кромки открытых сенотов — пальмы наверху и свисающие корни/лианы в воду
    for (let sIdx = 0; sIdx < SHAFTS.length; sIdx++) {
      const s = SHAFTS[sIdx];
      if (Math.abs(x0 + chunkSize * 0.5 - s.x) < chunkSize * 1.4 &&
          Math.abs(z0 + chunkSize * 0.5 - s.z) < chunkSize * 1.4) {
        const nRim = sIdx === 0 ? 18 : 11;
        for (let k = 0; k < nRim; k++) {
          const ang = (k / nRim) * Math.PI * 2 + (sIdx * 0.7);
          const rrPalm = s.rimR - 1.5 + (k % 3) * 1.2;
          const px = s.x + Math.cos(ang) * rrPalm;
          const pz = s.z + Math.sin(ang) * rrPalm;
          if (px >= x0 && px < x0 + chunkSize && pz >= z0 && pz < z0 + chunkSize) {
            const ryTop = getCeilingHeight(px, pz);
            if (ryTop > 8.0 && ryTop < 22.0 && k % 2 === 0) {
              items.push({
                species: 'island_palm',
                x: px, y: ryTop - 0.3, z: pz,
                ry: ang + 1.2,
                scale: OC.lerp(0.82, 1.18, rng()),
                tint: 0xdff4d8
              });
            }
            const vr = s.openR + 2.5 + (k % 2) * 3.5;
            const vx = s.x + Math.cos(ang + 0.15) * vr;
            const vz = s.z + Math.sin(ang + 0.15) * vr;
            if (vx >= x0 && vx < x0 + chunkSize && vz >= z0 && vz < z0 + chunkSize) {
              const vyTop = Math.min(13.8, getCeilingHeight(vx, vz));
              if (vyTop > 2.0) {
                items.push({
                  species: 'cenote_vine',
                  x: vx, y: vyTop - 0.4, z: vz,
                  ry: rng() * 6.28,
                  scale: OC.lerp(0.85, 1.35, rng()),
                  tint: 0xdaf2d4
                });
              }
            }
          }
        }
      }
    }

    // 2. Сталактиты на потолке, сталагмиты на дне и освещённая растительность в чаше сенота
    const nCave = Math.max(4, Math.round(14 * Math.min(1.2, scale)));
    for (let i = 0; i < nCave; i++) {
      const x = x0 + rng() * chunkSize;
      const z = z0 + rng() * chunkSize;
      const open = isCeilingOpen(x, z);
      const fl = getHeight(x, z);
      const ceil = getCeilingHeight(x, z);

      if (open) {
        if (fl < -2.0) {
          const rPick = rng();
          items.push({
            species: rPick < 0.58 ? 'seagrass' : (rPick < 0.88 ? 'coral_crust' : 'shell_triton'),
            x, y: fl - 0.08, z,
            ry: rng() * 6.28,
            scale: OC.lerp(0.75, 1.25, rng()),
            tint: rPick < 0.58 ? 0x9de69c : 0xc6cbb8
          });
        }
        continue;
      }

      if (ceil < -3.6 && ceil - fl > 9.0) {
        if (i % 2 === 0 || rng() < 0.65) {
          items.push({
            species: 'stalactite',
            x, y: ceil + 0.35, z,
            ry: rng() * 6.28,
            scale: OC.lerp(0.78, 1.45, rng()),
            tint: 0xf4ead8
          });
        }
      }

      const x2 = x0 + rng() * chunkSize;
      const z2 = z0 + rng() * chunkSize;
      if (!isCeilingOpen(x2, z2)) {
        const fl2 = getHeight(x2, z2);
        const ceil2 = getCeilingHeight(x2, z2);
        if (ceil2 - fl2 > 11.0 && rng() < 0.78) {
          items.push({
            species: 'stalagmite',
            x: x2, y: fl2 - 0.15, z: z2,
            ry: rng() * 6.28,
            scale: OC.lerp(0.75, 1.38, rng()),
            tint: 0xeee2cc
          });
        }
      }
    }

    return items;
  }

  const LANDMARKS = [
    {
      id: 'cenote_portal',
      name: 'Портал сенота и Лучи света',
      x: 0, y: -11.0, z: 0,
      zone: 'cenote_pit',
      description: 'Залитый тропическим солнцем карстовый провал с лазерными снопами лучей и лианами'
    },
    {
      id: 'stalactite_cathedral',
      name: 'Собор сталактитов',
      x: -95, y: -14.0, z: 58,
      zone: 'stalactite_gallery',
      description: 'Величественный подводный карстовый свод с люстрами сталактитов и колоннами сталагмитов'
    },
    {
      id: 'ariadne_junction',
      name: 'Развилка нити Ариадны',
      x: 96, y: -14.5, z: -88,
      zone: 'stalactite_gallery',
      description: 'Ключевая навигационная развилка пещерной ходовой нити на пути к северному окну света'
    },
    {
      id: 'angelita_halocline',
      name: 'Облако галоклина Анхелиты',
      x: -210, y: -22.2, z: 130,
      zone: 'halocline_cloud',
      description: 'Мистическая граница пресной и солёной воды с облаком H₂S и древним затонувшим лесом'
    },
    {
      id: 'el_pit_depth',
      name: 'Глубокий колодец Эль-Пит',
      x: 180, y: -42.0, z: 210,
      zone: 'el_pit_abyss',
      description: 'Глубочайший 58-метровый карстовый колодец системы, дом слепой белой бротулы'
    }
  ];

  const ENCYCLOPEDIA = {
    floor: ['Карстовый известняк Юкатана', 'Karst Limestone (Sak Actun)', 'Геология', 'Все зоны', '0 – 58 м',
      'Дно и своды системы Сак-Актун сложены пористым плейстоценовым известняком, растворённым пресными водами за сотни тысяч лет.'],
    stalactite: ['Известняковый сталактит', 'Speleothem Stalactite', 'Геология', 'Зал сталактитов', '6 – 28 м',
      'Образовался на воздухе во время ледниковых периодов, когда уровень моря был на 120 м ниже, а затем ушёл под воду вместе с пещерами.'],
    stalagmite: ['Кальцитовый сталагмит', 'Calcite Stalagmite', 'Геология', 'Зал сталактитов', '10 – 48 м',
      'Натёчная колонна, росшая миллиметр за столетие из капель воды; годичные кольца кальцита хранят летопись климата майя.'],
    cenote_vine: ['Воздушные корни и лианы сенота', 'Ficus Aerial Roots', 'Флора', 'Портал сенота', '0 – 14 м',
      'Длинные корни тропических фикусов спускаются с края обрыва на 12–15 метров прямо в воду, вытягивая влагу и питая подводную фауну.'],
    ariadne_line: ['Ходовая нить Ариадны', 'Cave Diving Guideline', 'Экспедиция', 'Зал сталактитов', '10 – 45 м',
      'Прочный флуоресцентный шнур со стрелками-маркерами, всегда указывающими в сторону ближайшего выхода к открытому сеноту.'],
    halocline_layer: ['Галоклин и облако сероводорода', 'Cenote Angelita Halocline & H₂S', 'Геология', 'Галоклин Анхелиты', '23 – 36 м',
      'Оптическая граница между пресной дождевой водой и более плотным солёным прибрежным слоем, под которой скапливается белёсое облако H₂S.'],
    blind_tetra: ['Слепая мексиканская тетра', 'Astyanax mexicanus (Cave morph)', 'Рыбы', 'Зал сталактитов', '10 – 26 м',
      'Безглазая депигментированная пещерная форма тетры, ориентирующаяся в полной темноте по малейшим колебаниям боковой линии.'],
    cenote_molly: ['Парусная моллинезия сенота', 'Poecilia velifera', 'Рыбы', 'Портал сенота', '1 – 16 м',
      'Серебристо-изумрудная пресноводная рыба освещённой зоны сенота, снующая стайками среди солнечных снопов и корней.'],
    cave_remipede: ['Пещерный гребненосец (Ремипедия)', 'Xibalbanus tulumensis', 'Беспозвоночные', 'Галоклин Анхелиты', '20 – 28 м',
      'Живое ископаемое и единственный известный ядовитый рачок планеты — обитает в слое галоклина и плавает спиной вниз.'],
    blind_brotula: ['Юкатанская слепая бротула', 'Typhliasina pearsei (Dama Blanca)', 'Мегафауна', 'Бездна Эль-Пит', '32 – 58 м',
      '«Белая дама пещер» — редкий эндемик, живородящая слепая рыба без чешуи и пигмента, скользящая в кромешной тьме колодца Эль-Пит.'],
    cave_shrimp: ['Слепая пещерная креветка', 'Typhlatya mitchelli', 'Беспозвоночные', 'Галоклин Анхелиты', '18 – 30 м',
      'Полупрозрачный стигобионт, собирающий органическую плёнку и бактериальные нити над границей галоклина.'],
    turtle: ['Пресноводная черепаха сенота', 'Trachemys venusta', 'Мегафауна', 'Портал сенота', '0 – 12 м',
      'Мезоамериканская расписная черепаха, ныряющая за водорослями в бирюзовом колодце открытого сенота.'],
    seagrass: ['Подводные харовые водоросли', 'Chara & Freshwater Moss', 'Флора', 'Портал сенота', '12 – 32 м',
      'Ярко-зелёные коврики пресноводных макрофитов на дне солнечного портала сенота.'],
    island_palm: ['Прибрежная пальма кромки сенота', 'Sabal yapa (Yucatan Palm)', 'Флора', 'Портал сенота', 'Над водой',
      'Тропическая веерная пальма джунглей Юкатана, венчающая 14-метровую известняковую стену карстового провала.'],
    coral_crust: ['Пресноводные строматолиты', 'Microbialite Travertine Crust', 'Кораллы', 'Портал сенота', '8 – 30 м',
      'Органо-минеральные карбонатные корки, нарастающие на подводных валунах благодаря цианобактериям.']
  };

  const FAUNA_PLAN = {
    schools: [
      {
        key: 'cenote_molly', count: 1, n: 30, cx: 4, cz: -6, radius: 22, yDepth: -7.5, yAmp: 3.5, speed: 5.0, scale: 0.72,
        diel: 'diurnal', shyness: 0.45, curious: 0.3,
        geoOpts: { len: 0.85, height: 0.44, width: 0.16, colA: 0x3ec8b8, colB: 0xd8fff2, finCol: 0xffe066, dorsal: true, streamer: true }
      },
      {
        key: 'blind_tetra', count: 1, n: 26, cx: -92, cz: 54, radius: 24, yDepth: -14.5, yAmp: 3.2, speed: 4.4, scale: 0.68, biolum: true,
        diel: 'nocturnal', dvmAmp: 1.5, shyness: 0.2, curious: 0.5,
        geoOpts: { len: 0.82, height: 0.36, width: 0.14, colA: 0xf4dcd6, colB: 0xfff6f2, finCol: 0xfceef0, tailH: 0.62, eyeScale: 0 }
      },
      {
        key: 'blind_tetra', count: 1, n: 24, cx: 92, cz: -84, radius: 22, yDepth: -15.5, yAmp: 3.0, speed: 4.2, scale: 0.66, biolum: true,
        diel: 'nocturnal', dvmAmp: 1.5, shyness: 0.2, curious: 0.45,
        geoOpts: { len: 0.82, height: 0.36, width: 0.14, colA: 0xf4dcd6, colB: 0xfff6f2, finCol: 0xfceef0, tailH: 0.62, eyeScale: 0 }
      },
      {
        key: 'cave_shrimp', count: 1, n: 34, cx: -206, cz: 128, radius: 20, yDepth: -22.8, yAmp: 1.6, speed: 3.4, scale: 0.45, biolum: true,
        diel: 'nocturnal', dvmAmp: 1.0, shyness: 0.1, curious: 0.4,
        geoOpts: { len: 0.66, height: 0.16, width: 0.12, colA: 0xdbf4ff, colB: 0xffffff, finCol: 0xc2ecff, dorsal: false, eyeScale: 0 }
      }
    ],
    turtles: [
      { cx: 6, cz: -4, r: 24, y: -5.5, speed: 2.1, size: 0.62 }
    ],
    ariadneLines: [
      { waypoints: ARIADNE_WEST },
      { waypoints: ARIADNE_NORTH },
      { waypoints: ARIADNE_SOUTH }
    ],
    haloclines: [
      { cx: ANGELITA.x, cz: ANGELITA.z, y: -24.5, r: 72 }
    ],
    remipedes: [
      { cx: -202, cz: 126, r: 16, y: -22.2, speed: 1.3, scale: 1.15 },
      { cx: -218, cz: 136, r: 14, y: -23.1, speed: 1.1, scale: 1.05 }
    ],
    blindBrotulas: [
      { cx: 180, cz: 210, r: 22, y: -42.0, speed: 1.7, scale: 1.2 },
      { cx: 174, cz: 204, r: 16, y: -36.5, speed: 1.5, scale: 1.05 }
    ]
  };

  const TOUR_LEGS = [
    {
      title: 'Открытый сенот Сак-Актун',
      fact: 'Пресная дождевая вода Юкатана кристально прозрачна; солнечные лучи вертикально пробивают провал среди корней джунглей.',
      pos: [18, -9.5, 34],
      look: [-8, -14, -4],
      duration: 8.5
    },
    {
      title: 'Вход в Галерею сталактитов',
      fact: 'Эти натёчные колонны выросли на суше, когда уровень океана в ледниковый период был на 120 метров ниже нынешнего.',
      pos: [-68, -13.5, 42],
      look: [-110, -15, 68],
      duration: 9.0
    },
    {
      title: 'Развилка нити Ариадны',
      fact: 'В полной темноте пещер дайверы ориентируются по туго натянутой ходовой нити с треугольными маркерами выхода к небу.',
      pos: [74, -14.0, -68],
      look: [110, -15.5, -100],
      duration: 8.5
    },
    {
      title: 'Облако галоклина Сенота Анхелита',
      fact: 'Пресная вода (0‰) покоится поверх солёного морского слоя (35‰), создавая иллюзию призрачной подземной реки с деревьями.',
      pos: [-176, -21.0, 108],
      look: [-215, -25.0, 134],
      duration: 9.5
    },
    {
      title: 'Глубокий колодец Эль-Пит и Белая дама',
      fact: 'На глубине до 58 м в вечном мраке скользит эндемичная слепая бротула Typhliasina и пещерные гребненосцы Xibalbanus.',
      pos: [148, -36.0, 178],
      look: [182, -44.0, 212],
      duration: 9.5
    }
  ];

  OC.Biomes.register({
    id: 'cenote_caves',
    name: 'Юкатанские пещеры и Сеноты',
    subtitle: 'Система Сак-Актун · Галоклин Анхелиты · Колодец Эль-Пит · 0 – 58 м',
    region: 'Ривьера-Майя, Юкатан · 0 – 58 м',
    globe: {
      lat: 20.27, lon: -87.43, coordLabel: '20.3° с.ш., 87.4° з.д.',
      ocean: 'Карибское побережье Юкатана · Сак-Актун', depthSpan: '0 – 58 м', tempSpan: '24.6 – 26.4 °C', color: '#38e8b0',
      country: 'Мексика (Кинтана-Роо)', waterType: 'cave', protectionStatus: 'не охраняется',
      notableFor: 'карстовые пещеры, сеноты, подводные системы, слепые пещерные виды',
      summary: 'Затопленная карстовая сеть со сталактитами, солнечными окнами сенотов, ходовой нитью Ариадны, галоклином Анхелиты и слепыми пещерными рыбами.'
    },
    minimapTheme: 'cenote',
    seaLevel: 0,
    depthOffset: 0,
    noSurface: false,
    shelteredSurface: true,
    maxCamY: 6.0,
    worldRadius: 1200,
    chunkSize: 150,
    spawn: { pos: [0, -11.5, 22], yaw: 3.14, pitch: -0.04 },
    zones: ZONES,
    landmarks: LANDMARKS,
    encyclopedia: ENCYCLOPEDIA,
    faunaPlan: FAUNA_PLAN,
    tourLegs: TOUR_LEGS,
    ariadnePaths: [ARIADNE_WEST, ARIADNE_NORTH, ARIADNE_SOUTH],
    getCenoteShafts: () => SHAFTS,
    getHeight,
    getCeilingHeight,
    isCeilingOpen,
    getHaloclineAt,
    getZoneAt,
    getTerrainColor,
    getCeilingColor,
    getTemperatureAt,
    getOpticalProfile,
    getCurrentAt,
    generateChunkFlora
  });
})(window.OC);
