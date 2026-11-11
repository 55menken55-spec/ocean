/* ================= ПИКИНГ СЦЕНЫ И КАРТОЧКИ ВИДОВ ================= */
/* Raycast по клику и по центру экрана: инспекция флоры/фауны, карточки видов,
   попап ROV, авто-скрытие карточки. Модуль держит только raycaster и таймер
   последнего выбора; данные биома и сцена приходят извне. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._ScenePicking = {
    bind(ctx) {
      const T = THREE;
      const getScene = ctx.getScene;
      const getCamera = ctx.getCamera;
      const getCanvas = ctx.getCanvas;
      const toast = ctx.toast;

      const raycaster = new T.Raycaster();
      const ndc = new T.Vector2();
      const _fwd = new T.Vector3();
      const _zeroNdc = new T.Vector2(0, 0);
      let pickedTime = 0;
      const popup = document.getElementById('fish-popup');

      function isObjVisible(obj) {
        for (let p = obj; p; p = p.parent) {
          if (!p.visible) return false;
        }
        return true;
      }

      function detectCenterTarget(camera, biome, fauna) {
        if (!camera || !biome) return null;
        camera.getWorldDirection(_fwd);
        const faunaHit = (fauna && fauna.scanCameraTarget) ? fauna.scanCameraTarget(camera.position, _fwd, 95) : null;

        raycaster.setFromCamera(_zeroNdc, camera);
        const hits = raycaster.intersectObjects(getScene().children, true);
        let rayHit = null;
        for (const h of hits) {
          if (!isObjVisible(h.object) || h.distance > 48) continue;
          let o = h.object;
          while (o && !o.userData.key && !o.userData.rovKey) o = o.parent;
          if (o && o.userData.rovKey) continue;
          const key = o && o.userData.key ? o.userData.key : null;
          if (!key || key === 'bubbles' || key === 'plankton' || key === 'marine_snow') continue;
          const enc = biome.encyclopedia[key];
          rayHit = { hit: true, key, label: enc ? enc[0] : key, latin: enc ? enc[1] : '', dist: h.distance, align: 0.92 };
          break;
        }

        if (faunaHit && (!rayHit || rayHit.key === 'floor' || faunaHit.dist <= rayHit.dist + 8)) return faunaHit;
        return rayHit;
      }

      function showInfo(key, cx, cy, biome) {
        OC._HudPanels.showInfo(popup, key, cx, cy, biome);
        pickedTime = performance.now();
      }

      function showRovPopup(cx, cy) {
        OC._HudPanels.showRovPopup(popup, cx, cy);
        pickedTime = performance.now();
      }

      function pickAt(cx, cy, biome) {
        const canvas = getCanvas();
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        ndc.x = ((cx - rect.left) / rect.width) * 2 - 1;
        ndc.y = -((cy - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, getCamera());
        const hits = raycaster.intersectObjects(getScene().children, true);
        for (const h of hits) {
          if (!isObjVisible(h.object)) continue;
          let o = h.object;
          while (o && !o.userData.key && !o.userData.rovKey) o = o.parent;
          if (o && o.userData.rovKey) {
            if (o.userData.rovKey === 'rov_nautilus') {
              showRovPopup(cx, cy);
              return;
            }
            continue;
          }
          const key = o && o.userData.key ? o.userData.key : null;
          if (!key || key === 'bubbles' || key === 'plankton' || key === 'marine_snow') continue;
          showInfo(key, cx, cy, biome);
          return;
        }
      }

      /* Карточка вида исчезает сама через 9.5 с */
      function autoHidePopup(now) {
        if (popup && !popup.classList.contains('hidden') && now - pickedTime > 9500) {
          popup.classList.add('hidden');
        }
      }

      return { detectCenterTarget, pickAt, showInfo, showRovPopup, autoHidePopup, isObjVisible, popup };
    }
  };
})(window.OC);
