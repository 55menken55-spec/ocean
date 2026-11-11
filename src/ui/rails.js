/* ================= РЕЙЛ ИКОНОК И ФОКУС НА МОДАЛКАХ ================= */
/* 1. Сворачивание правого рейла инструментов (кнопка «›» / клавиша «\»):
    состояние живёт в localStorage и переживает перезагрузку.
   2. Пока открыта любая модалка (глобус, атлас, журнал, справка), весь HUD
    уходит с экрана (body.modal-open), а после закрытия возвращается. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const COLLAPSE_KEY = 'oc_icon_rail_collapsed_v1';
  const modalSessions = Object.create(null);
  let railEl = null;
  let toggleEl = null;
  let bodyEl = null;

  function readCollapsed() {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function writeCollapsed(v) {
    try {
      localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
    } catch (e) { /* приватный режим — состояние просто не сохранится */ }
  }

  /* Высота рейла зависит от количества групп, ширины экрана и состояния:
     сообщаем её CSS-переменной, чтобы панели вставали ровно под иконками. */
  function syncRailMetrics() {
    if (!railEl || typeof document === 'undefined' || !document.documentElement) return;
    const collapsed = isCollapsed();
    const h = collapsed ? 0 : Math.ceil(railEl.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--rail-bottom', (collapsed ? 0 : h) + 'px');
  }

  function applyCollapsed(collapsed) {
    if (!railEl || !railEl.dataset) return;
    railEl.dataset.collapsed = collapsed ? 'true' : 'false';
    if (toggleEl) {
      toggleEl.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggleEl.title = collapsed ? 'Развернуть панель инструментов (\\)' : 'Свернуть панель инструментов (\\)';
    }
    syncRailMetrics();
  }

  function setCollapsed(v, persist) {
    applyCollapsed(!!v);
    if (persist !== false) writeCollapsed(!!v);
    return !!v;
  }

  function isCollapsed() {
    return !!railEl && !!railEl.dataset && railEl.dataset.collapsed === 'true';
  }

  function syncModalState() {
    if (!bodyEl) return;
    const open = Object.keys(modalSessions).some((k) => modalSessions[k]);
    bodyEl.classList.toggle('modal-open', open);
    return open;
  }

  function setModalOpen(id, open) {
    if (!id) return;
    if (open) modalSessions[id] = true;
    else delete modalSessions[id];
    return syncModalState();
  }

  function isModalOpen() {
    return Object.keys(modalSessions).length > 0;
  }

  function init() {
    bodyEl = document.body;
    railEl = document.getElementById('topright');
    toggleEl = document.getElementById('btn-rail-toggle');

    /* На узких экранах 14 иконок закрывают пол-экрана — по умолчанию прячем рейл.
       Явный выбор пользователя (localStorage) всегда важнее. */
    let stored = null;
    try { stored = localStorage.getItem(COLLAPSE_KEY); } catch (e) { stored = null; }
    const narrow = typeof window !== 'undefined' && window.innerWidth <= 720;
    applyCollapsed(stored === null ? narrow : stored === '1');

    if (toggleEl) {
      toggleEl.addEventListener('click', (e) => {
        e.stopPropagation();
        setCollapsed(!isCollapsed());
      });
    }

    window.addEventListener('resize', syncRailMetrics);
    window.addEventListener('orientationchange', () => setTimeout(syncRailMetrics, 120));
    /* Группы переносятся по строкам по-разному в зависимости от ширины */
    if (typeof ResizeObserver !== 'undefined' && railEl) {
      try { new ResizeObserver(syncRailMetrics).observe(railEl); } catch (e) { /* старые браузеры */ }
    }

    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === '\\' || e.code === 'Backslash') {
        e.preventDefault();
        setCollapsed(!isCollapsed());
      }
    });
  }

  OC.UI = OC.UI || {};
  OC.UI.Rail = {
    init,
    setCollapsed,
    isCollapsed,
    toggle: () => setCollapsed(!isCollapsed()),
    /* Модалки сообщают о себе — открытие/закрытие скрывает и возвращает HUD */
    setModalOpen,
    isModalOpen,
    syncRailMetrics
  };
})(window.OC);
