/* ================= ТАЧ-УПРАВЛЕНИЕ: ДЖОЙСТИК И БЫСТРЫЕ ДЕЙСТВИЯ ================= */
/* Виртуальный стик (X/Y), вертикальные кнопки вверх/вниз и сенсорный блок быстрых
   действий: прожектор, сонар, проба, батискаф, меню. Логика действий живёт в main.js
   и приходит через ctx; модуль только ловит жесты и подсвечивает состояние. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._HudPanelsTouch = {
    bind(ctx) {
      const toast = ctx.toast;
      const isFlashOn = ctx.isFlashOn || (() => false);
      const isSubMode = ctx.isSubMode || (() => false);
      const isPanelOpen = ctx.isPanelOpen || (() => false);
      const toggleFlash = ctx.toggleFlash || (() => false);
      const syncFlash = ctx.syncFlash || (() => {});
      const syncSubMode = ctx.syncSubMode || (() => {});
      const fireSonarPing = ctx.fireSonarPing || (() => {});
      const triggerSampleGrab = ctx.triggerSampleGrab || (() => {});
      const togglePanel = ctx.togglePanel || (() => {});

      const touchStick = document.getElementById('touch-stick');
      const touchKnob = document.getElementById('touch-knob');
      const mUp = document.getElementById('m-up');
      const mDown = document.getElementById('m-down');
      let stickPtrId = null;
      let virtVert = 0;

      if (touchStick && OC.Navigation.setVirtualInput) {
        const resetStick = () => {
          stickPtrId = null;
          if (touchKnob) touchKnob.style.transform = 'translate(0px, 0px)';
          OC.Navigation.setVirtualInput(0, 0, virtVert);
        };
        const updateStick = (clientX, clientY) => {
          const rect = touchStick.getBoundingClientRect();
          const cx = rect.left + rect.width * 0.5;
          const cy = rect.top + rect.height * 0.5;
          const maxR = Math.max(24, rect.width * 0.38);
          let dx = clientX - cx;
          let dy = clientY - cy;
          const len = Math.hypot(dx, dy);
          if (len > maxR) { dx = (dx / len) * maxR; dy = (dy / len) * maxR; }
          if (touchKnob) touchKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
          OC.Navigation.setVirtualInput(dx / maxR, -dy / maxR, virtVert);
        };
        touchStick.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          stickPtrId = e.pointerId;
          try { touchStick.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
          updateStick(e.clientX, e.clientY);
        });
        touchStick.addEventListener('pointermove', (e) => {
          if (stickPtrId !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        });
        touchStick.addEventListener('pointerup', (e) => { if (stickPtrId === e.pointerId) resetStick(); });
        touchStick.addEventListener('pointercancel', resetStick);
      }
      const bindVertBtn = (btn, val) => {
        if (!btn || !OC.Navigation.setVirtualInput) return;
        const setV = (v) => { virtVert = v; OC.Navigation.setVirtualInput(0, 0, virtVert); };
        btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); setV(val); });
        btn.addEventListener('pointerup', () => setV(0));
        btn.addEventListener('pointercancel', () => setV(0));
      };
      bindVertBtn(mUp, 1);
      bindVertBtn(mDown, -1);

      /* Сенсорный блок быстрых действий: прожектор, сонар, проба, батискаф, меню */
      const mFlash = document.getElementById('m-flash');
      const mSonar = document.getElementById('m-sonar');
      const mSample = document.getElementById('m-sample');
      const mSub = document.getElementById('m-sub');
      const mMenu = document.getElementById('m-menu');
      function syncTouchQuick() {
        if (mFlash) mFlash.classList.toggle('on', !!isFlashOn());
        if (mSub) mSub.classList.toggle('on', !!isSubMode());
        if (mMenu) mMenu.classList.toggle('on', !!isPanelOpen());
      }
      if (mFlash) {
        mFlash.addEventListener('click', (e) => {
          e.stopPropagation();
          const on = toggleFlash();
          syncFlash(on);
          syncTouchQuick();
          toast(on ? 'Прожектор включён' : 'Прожектор выключен');
        });
      }
      if (mSonar) {
        mSonar.addEventListener('click', (e) => {
          e.stopPropagation();
          fireSonarPing();
        });
      }
      if (mSample) {
        mSample.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerSampleGrab();
        });
      }
      if (mSub) {
        mSub.addEventListener('click', (e) => {
          e.stopPropagation();
          syncSubMode(!isSubMode());
          syncTouchQuick();
          toast(isSubMode() ? 'Режим батискафа включён' : 'Режим свободного дайвера');
        });
      }
      if (mMenu) {
        mMenu.addEventListener('click', (e) => {
          e.stopPropagation();
          togglePanel();
          syncTouchQuick();
        });
      }
      syncTouchQuick();

      return { syncTouchQuick };
    }
  };
})(window.OC);
