/* ================= ББР: ПРОЦЕДУРНОЕ РАЗМЕЩЕНИЕ ФЛОРЫ ПО ЧАНКАМ ================= */
/* Детерминированное зонально-реалистичное заполнение 16 × 16 чанков: мангры,
   морская трава, кораллы гребня и склона, саргассы, губки Голубой дыры. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const { shelfOffset, passCenterZ, BLUE_HOLE_X, BLUE_HOLE_Z, CAY_X, CAY_Z, BOMMIES,
          WORLD_RADIUS, CHUNK_SIZE, getHeight, getZoneAt } = OC._GbrBase;

  /* ---- Размещение флоры в чанке (детерминированное, зонально-реалистичное) ---- */
  function generateChunkFlora(cx, cz, chunkSize, density, rng) {
    const x0 = cx * chunkSize;
    const z0 = cz * chunkSize;
    const out = [];

    // Основная сетка кандидатов: шаг адаптируется от плотности
    const step = OC.clamp(12.5 / Math.sqrt(Math.max(0.25, density)), 8.5, 22);
    const cols = Math.floor(chunkSize / step);

    for (let iz = 0; iz < cols; iz++) {
      for (let ix = 0; ix < cols; ix++) {
        const x = x0 + (ix + 0.15 + rng() * 0.7) * step;
        const z = z0 + (iz + 0.15 + rng() * 0.7) * step;
        const y = getHeight(x, z);
        const u = x - shelfOffset(z);
        const dHole = Math.hypot(x - BLUE_HOLE_X, z - BLUE_HOLE_Z);

        // Выше уровня моря + 0.35 м (сухой островок или мангровый берег)
        if (y > 0.35) {
          if (u < -760 && y < 1.35 && rng() < 0.42) {
            out.push({
              species: 'mangrove',
              x, y: y - 0.3, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.85, 1.45, rng()),
              tint: 0xffffff
            });
          } else if (u >= -760 && y > 0.55 && rng() < 0.85) {
            out.push({
              species: 'island_palm',
              x, y: y - 0.22, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.72, 1.28, rng()),
              tint: rng() < 0.5 ? 0xf6fff2 : 0xe4f5dc
            });
            if (y > 1.25 && rng() < 0.6) {
              const px2 = x + (rng() - 0.5) * 6.0;
              const pz2 = z + (rng() - 0.5) * 6.0;
              const py2 = getHeight(px2, pz2);
              if (py2 > 0.5) {
                out.push({
                  species: 'island_palm',
                  x: px2, y: py2 - 0.22, z: pz2,
                  ry: rng() * 6.28,
                  scale: OC.lerp(0.62, 1.12, rng()),
                  tint: 0xecfbe2
                });
              }
            }
          }
          continue;
        }

        const hx = getHeight(x + 2, z) - getHeight(x - 2, z);
        const hz = getHeight(x, z + 2) - getHeight(x, z - 2);
        const slope = Math.hypot(hx, hz) * 0.25;

        // 1) Прибрежная зона: мангры на мелководье (-2.2 .. +0.35 м)
        if (u < -735 && y > -2.3 && y <= 0.35) {
          if (rng() < 0.58) {
            out.push({
              species: 'mangrove',
              x, y: y - 0.15, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.9, 1.55, rng()),
              tint: 0xffffff
            });
          }
          continue;
        }

        // 2) Луга морской травы
        if (u >= -740 && u < -390) {
          if (rng() < 0.72) {
            out.push({
              species: 'seagrass',
              x, y: y - 0.04, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.85, 1.45, rng()),
              tint: 0xdff5c8
            });
          } else if (rng() < 0.25) {
            out.push({
              species: rng() < 0.5 ? 'starfish_blue' : 'shell_triton',
              x, y: y + 0.12, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.8, 1.25, rng()),
              tint: 0xffffff
            });
          }
          continue;
        }

        // 3) Внутренняя лагуна (песчаные поля, бомми, островок)
        if (u >= -390 && u < 40) {
          const dc = Math.hypot(x - CAY_X, z - CAY_Z);
          if (dc < 52) continue; // не загромождаем чистый пляж островка

          // На верхушках и склонах бомми (y > -13 или высокий склон) — богатые кораллы!
          if (y > -13.5 || slope > 0.28) {
            const r = rng();
            let sp = 'coral_staghorn';
            if (r < 0.25) sp = 'coral_brain';
            else if (r < 0.48) sp = 'coral_table';
            else if (r < 0.65) sp = 'coral_staghorn';
            else if (r < 0.78) sp = 'coral_bommie';
            else if (r < 0.89) sp = 'anemone';
            else sp = 'giant_clam';
            out.push({
              species: sp,
              x, y: y - 0.15, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.75, 1.35, rng()),
              tint: 0xffffff
            });
            // Нижний ярус коркового коралла / криноидеи на бомми
            if (rng() < 0.52) {
              out.push({
                species: rng() < 0.72 ? 'coral_crust' : 'crinoid',
                x: x + (rng() - 0.5) * 4.5,
                y: y - 0.12,
                z: z + (rng() - 0.5) * 4.5,
                ry: rng() * 6.28,
                scale: OC.lerp(0.75, 1.25, rng()),
                tint: 0xffffff
              });
            }
          } else {
            // Песчаное дно лагуны: трава, ежи, звёзды, тридакны, раковины
            const r = rng();
            if (r < 0.28) {
              out.push({ species: 'seagrass', x, y: y - 0.04, z, ry: rng() * 6.28, scale: OC.lerp(0.8, 1.2, rng()), tint: 0xd8f0c8 });
            } else if (r < 0.42) {
              out.push({ species: 'coral_brain', x, y: y - 0.1, z, ry: rng() * 6.28, scale: OC.lerp(0.7, 1.15, rng()), tint: 0xffffff });
            } else if (r < 0.52) {
              out.push({ species: 'giant_clam', x, y: y - 0.05, z, ry: rng() * 6.28, scale: OC.lerp(0.8, 1.35, rng()), tint: 0xffffff });
            } else if (r < 0.64) {
              out.push({ species: rng() < 0.5 ? 'urchin' : 'starfish_blue', x, y: y + 0.1, z, ry: rng() * 6.28, scale: OC.lerp(0.8, 1.3, rng()), tint: 0xffffff });
            } else if (r < 0.70) {
              out.push({ species: 'shell_triton', x, y: y + 0.12, z, ry: rng() * 6.28, scale: OC.lerp(0.85, 1.35, rng()), tint: 0xffffff });
            }
          }
          continue;
        }

        // 4) Гребень рифа и Spur-and-Groove
        if (u >= 40 && u < 305) {
          // В глубоких песчаных желобах между контрфорсами (y < -14) оставляем песок и редкие ежи/траву
          if (y < -15.5 && slope < 0.22) {
            if (rng() < 0.35) {
              out.push({
                species: rng() < 0.6 ? 'urchin' : 'starfish_cots',
                x, y: y + 0.12, z,
                ry: rng() * 6.28,
                scale: OC.lerp(0.85, 1.25, rng()),
                tint: 0xffffff
              });
            }
            continue;
          }
          // На гребнях (spurs) — максимальная плотность кораллов!
          const r = rng();
          let sp = 'coral_staghorn';
          if (r < 0.30) sp = 'coral_staghorn';
          else if (r < 0.54) sp = 'coral_table';
          else if (r < 0.70) sp = 'coral_brain';
          else if (r < 0.80) sp = 'anemone';
          else if (r < 0.88) sp = 'coral_fan';
          else if (r < 0.94) sp = 'giant_clam';
          else sp = 'starfish_cots';

          out.push({
            species: sp,
            x, y: y - 0.15, z,
            ry: rng() * 6.28,
            scale: OC.lerp(0.82, 1.48, rng()),
            tint: 0xffffff
          });
          // Плотное покрытие гребня вторым ярусом (корковые кораллы, криноидеи, мелкие ветви)
          if (rng() < 0.72) {
            const subR = rng();
            const subSp = subR < 0.62 ? 'coral_crust' : (subR < 0.84 ? 'crinoid' : 'coral_staghorn');
            out.push({
              species: subSp,
              x: x + (rng() - 0.5) * 4.8,
              y: y - 0.12,
              z: z + (rng() - 0.5) * 4.8,
              ry: rng() * 6.28,
              scale: OC.lerp(0.7, 1.25, rng()),
              tint: 0xffffff
            });
          }
          continue;
        }

        // 5) Внешний склон, Рифовый проход и Голубая дыра
        if (u >= 305 && u < 545) {
          if (dHole < 48 && y < -45) {
            // Глубина Голубой дыры: губки и редкие чёрные кораллы на уступах
            if (slope > 0.22 && rng() < 0.45) {
              out.push({
                species: rng() < 0.5 ? 'coral_black' : 'sponge_tube',
                x, y: y - 0.1, z,
                ry: rng() * 6.28,
                scale: OC.lerp(0.9, 1.4, rng()),
                tint: 0xffffff
              });
            }
            continue;
          }
          const r = rng();
          let sp = 'coral_fan';
          if (r < 0.22) sp = 'coral_fan';
          else if (r < 0.38) sp = 'sponge_tube';
          else if (r < 0.52) sp = 'sponge_barrel';
          else if (r < 0.66) sp = 'coral_plate';
          else if (r < 0.78) sp = 'coral_soft';
          else if (r < 0.88) sp = 'crinoid';
          else if (r < 0.94) sp = 'kelp';
          else sp = 'coral_brain';
          out.push({
            species: sp,
            x, y: y - 0.18, z,
            ry: rng() * 6.28,
            scale: OC.lerp(0.9, 1.5, rng()),
            tint: 0xffffff
          });
          continue;
        }

        // 6) Отвесная стена и Бездна Кораллового моря
        if (u >= 545) {
          if (y > -92 && (slope > 0.25 || u < 740)) {
            const r = rng();
            let sp = 'coral_plate';
            if (y < -52) {
              if (r < 0.36) sp = 'coral_black';
              else if (r < 0.68) sp = 'coral_soft';
              else if (r < 0.88) sp = 'sponge_barrel';
              else sp = 'coral_fan';
            } else {
              if (r < 0.34) sp = 'coral_plate';
              else if (r < 0.58) sp = 'coral_fan';
              else if (r < 0.78) sp = 'coral_soft';
              else sp = 'sponge_tube';
            }
            if (rng() < 0.68) {
              out.push({
                species: sp,
                x, y: y - 0.2, z,
                ry: rng() * 6.28,
                scale: OC.lerp(0.95, 1.65, rng()),
                tint: 0xffffff
              });
            }
          } else if (y <= -92 && rng() < 0.08) {
            // Редкие глубоководные губки и чёрные кораллы на дне Кораллового моря
            out.push({
              species: rng() < 0.5 ? 'coral_black' : 'sponge_barrel',
              x, y: y - 0.1, z,
              ry: rng() * 6.28,
              scale: OC.lerp(0.9, 1.4, rng()),
              tint: 0xaab8d8
            });
          }
        }
      }
    }

    return out;
  }
  OC._GbrFlora = { generateChunkFlora };
})(window.OC);
