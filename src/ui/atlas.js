/* ================= ИНТЕРАКТИВНЫЙ АТЛАС ВИДОВ И ГЕОГРАФИИ РИФА ================= */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const discovered = new Set(['floor']);
  let modalEl = null;
  let gridEl = null;
  let countEl = null;
  let currentCat = 'Все';
  let biomeRef = null;
  let onDiveCallback = null;

  const CATEGORY_LANDMARK = {
    'Мангровые отмели': 'mangroves',
    'Луга морской травы': 'seagrass',
    'Внутренняя лагуна': 'bommies',
    'Лагуна и Трава': 'seagrass',
    'Лагуна и Гребень': 'crest',
    'Гребень и Лагуна': 'crest',
    'Гребень и Бомми': 'crest',
    'Гребень рифа': 'crest',
    'Лагуна и Желоба': 'crest',
    'Лагуна и Толща воды': 'bommies',
    'Лагуна и Проход': 'pass',
    'Лагуна и Склон': 'pass',
    'Склон и Проход': 'pass',
    'Склон и Стена': 'dropoff',
    'Внешний склон': 'pass',
    'Внешний склон и Обрыв': 'dropoff',
    'Склон и Обрыв': 'dropoff',
    'Бомми и Склон': 'bommies',
    'Гребень и Склон': 'crest',
    'Рифовый проход': 'pass',
    'Рифовый проход и Обрыв': 'pass',
    'Голубая дыра и Склон': 'blue_hole',
    'Голубая дыра и Обрыв': 'blue_hole',
    'Голубая дыра и Бездна': 'blue_hole',
    'Стена внешнего барьера': 'dropoff',
    'Бездна Кораллового моря': 'dropoff',
    'Коралловое море': 'dropoff',
    'Все зоны': 'crest'
  };

  function render() {
    if (!gridEl || !biomeRef) return;
    const enc = biomeRef.encyclopedia;
    const keys = Object.keys(enc);
    if (countEl) countEl.textContent = discovered.size + ' / ' + keys.length;

    gridEl.innerHTML = '';
    for (const key of keys) {
      const item = enc[key];
      const [title, latin, cat, zoneLabel, depthLabel, desc] = item;
      if (currentCat !== 'Все' && cat !== currentCat) continue;

      const isFound = discovered.has(key);
      const card = document.createElement('div');
      card.className = 'atlas-card' + (isFound ? ' found' : '');

      const badge = isFound ? '<span class="atlas-badge ok">Изучено</span>' : '<span class="atlas-badge">Не изучено</span>';
      card.innerHTML =
        '<div class="atlas-top"><span class="atlas-cat">' + cat + ' · ' + depthLabel + '</span>' + badge + '</div>' +
        '<div class="atlas-name">' + title + '</div>' +
        '<div class="atlas-latin">' + latin + '</div>' +
        '<div class="atlas-desc">' + desc + '</div>' +
        '<div class="atlas-foot"><span>' + zoneLabel + '</span><button class="atlas-go">Нырнуть туда →</button></div>';

      const goBtn = card.querySelector('.atlas-go');
      goBtn.addEventListener('click', () => {
        const lmId = CATEGORY_LANDMARK[zoneLabel] || 'crest';
        const lm = biomeRef.landmarks.find((l) => l.id === lmId) || biomeRef.landmarks[0];
        if (lm && onDiveCallback) {
          onDiveCallback(lm);
          thisClose();
        }
      });
      gridEl.appendChild(card);
    }
  }

  function thisClose() {
    if (modalEl) modalEl.classList.add('hidden');
  }

  OC.Atlas = {
    init(biome, onDive) {
      biomeRef = biome;
      onDiveCallback = onDive;
      modalEl = document.getElementById('atlas-modal');
      gridEl = document.getElementById('atlas-grid');
      countEl = document.getElementById('atlas-count');
      const closeBtn = document.getElementById('atlas-close');
      const tabsEl = document.getElementById('atlas-tabs');

      if (closeBtn) closeBtn.addEventListener('click', thisClose);
      if (modalEl) {
        modalEl.addEventListener('click', (e) => {
          if (e.target === modalEl) thisClose();
        });
      }
      if (tabsEl) {
        tabsEl.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-cat]');
          if (!btn) return;
          currentCat = btn.getAttribute('data-cat');
          tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
          render();
        });
      }
      render();
    },

    discover(key) {
      if (!key || discovered.has(key)) return false;
      if (biomeRef && biomeRef.encyclopedia[key]) {
        discovered.add(key);
        render();
        return true;
      }
      return false;
    },

    toggle() {
      if (!modalEl) return;
      const opening = modalEl.classList.contains('hidden');
      modalEl.classList.toggle('hidden');
      if (opening) render();
    },

    isOpen() {
      return modalEl && !modalEl.classList.contains('hidden');
    }
  };
})(window.OC);
