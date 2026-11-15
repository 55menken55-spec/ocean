/* ================= FLOATING ORIGIN (пересчёт координат относительно игрока) ================= */
/* Позволяет перемещаться на сколь угодно большие расстояния без потери точности float32.
   Камера удерживается vicino к началу координат; при превышении порога всё смещение
   накапливается в origin, а scène сдвигается назад. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  const origin = new T.Vector3(); // истинная мировая позиция сцены (0,0,0)
  let threshold = 1000;           // сдвигать, когда камера дальше этого (м)
  const shiftListeners = [];      // колбэки при сдвиге origins

  OC.FloatingOrigin = {
    /* Вернуть текущее смещение начала координат. */
    getOrigin() {
      return origin;
    },

    /* Перевести истинную мировую позицию в локальную ( escena ). */
    toLocal(worldPos) {
      return worldPos.clone().sub(origin);
    },

    /* Перевести локальную позицию сцены в истинную мировую. */
    toWorld(localPos) {
      return localPos.clone().add(origin);
    },

    /* Истинная позиция камеры в мире (локальная + origin). */
    getTrueCameraPos(camera, out) {
      const o = origin;
      const c = camera.position;
      const target = out || new T.Vector3();
      return target.set(c.x + o.x, c.y + o.y, c.z + o.z);
    },

    /* Подписаться на событие сдвига начала координат. Возвращает функцию
       отписки: подписчики обычно регистрируются внутри init(), а init()
       вызывается при каждой смене биома — без отписки слушатели накапливаются
       и на каждом сдвиге выполняют одну и ту же работу по несколько раз.

       Меш/лайт/спрайт сдвигает сам update() обходом сцены: повторно вычитать
       delta в слушателе — значит сдвинуть объект дважды. */
    onShift(cb) {
      shiftListeners.push(cb);
      return function offShift() {
        const i = shiftListeners.indexOf(cb);
        if (i >= 0) shiftListeners.splice(i, 1);
      };
    },

    /* Вызывать каждый фрейм с камерой. Возвращает true, если сдвиг произошёл. */
    update(camera, scene) {
      const camPos = camera.position;
      const dist = Math.hypot(camPos.x, camPos.y, camPos.z);

      if (dist > threshold) {
        const delta = camPos.clone(); // насколько сдвигаем всё назад

        // Накапливаем в origin
        origin.add(delta);

        // Сдвигаем все объекты сцены назад на delta
        if (scene) {
          scene.traverse((obj) => {
            if (obj.isMesh || obj.isInstancedMesh || obj.isLight || obj.isSprite) {
              /* Контейнер инстансов (InstancedMesh) — это не объект в сцене, а
                 просто якорь: позиции лежат в instanceMatrix уже в локальных
                 координатах. Сдвигать его position — значит сдвинуть все
                 экземпляры второй раз (владелец к тому же не знает про этот
                 сдвиг и перезапишет матрицы по-своему). Такие меши помечают
                 себя userData.noFloatingOrigin = true. */
              if (obj.userData && obj.userData.noFloatingOrigin) return;
              obj.position.sub(delta);
              if (obj.isInstancedMesh && obj.instanceMatrix) {
                obj.instanceMatrix.needsUpdate = true;
              }
            }
          });
        }

        // Сбрасываем камеру в начало
        camPos.set(0, 0, 0);
        camera.updateMatrixWorld();

        // Уведомляем подписчиков
        shiftListeners.forEach((cb) => cb(delta, origin));

        return true;
      }
      return false;
    },

    setThreshold(v) { threshold = v; },
    getThreshold() { return threshold; }
  };
})(window.OC);
