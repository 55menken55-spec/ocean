/* ================= HUD: ПЕРЕКЛЮЧАТЕЛЬ БИОМОВ И ЧИПЫ ЛОКАЦИЙ ================= */
/* Нижняя полоса биомов, компактные чипы в меню и подсказки локаций внутри биома.
   Выбор биома выполняет main.js (switchBiome) — модуль только рисует и зовёт ctx.switchBiome. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  OC._HudPanelsBiomes = {
    bind(ctx) {
      const toast = ctx.toast;
      const activeBiome = () => ctx.getBiome();
      const doSwitch = ctx.switchBiome;

      const BIOME_SHORT = OC._HudPanels.BIOME_SHORT;
      const BIOME_REGION = OC._HudPanels.BIOME_REGION;
      const zoneChipsEl = document.getElementById('zone-chips');
      const biomeBarEl = document.getElementById('biome-bar');
      const biomeBtnsEl = document.getElementById('biome-btns');
      const brandTitleEl = document.getElementById('brand-title');
      const brandSubEl = document.getElementById('brand-sub');
      const statusRegionEl = document.getElementById('status-region');

    function renderBiomeUI() {
      const list = OC.Biomes.list();
      const bio = activeBiome();
      const curId = bio ? bio.id : '';
      if (brandTitleEl && bio) {
        const parts = bio.name.split(' ');
        brandTitleEl.innerHTML = parts.length > 1
          ? (parts[0] + ' <span>' + parts.slice(1).join(' ') + '</span>')
          : bio.name;
      }
      if (brandSubEl && bio) brandSubEl.textContent = bio.subtitle || bio.region;
      if (statusRegionEl) statusRegionEl.textContent = BIOME_REGION[curId] || (bio ? bio.region : 'Океан');

      if (biomeBarEl) {
        biomeBarEl.innerHTML = '';
        list.forEach((b) => {
          const pill = document.createElement('button');
          pill.className = 'biome-pill' + (b.id === curId ? ' on' : '');
          pill.textContent = BIOME_SHORT[b.id] || b.name;
          pill.title = b.name + ' · ' + b.region;
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            if (b.id !== curId) doSwitch(b.id);
          });
          biomeBarEl.appendChild(pill);
        });
      }
      if (biomeBtnsEl) {
        biomeBtnsEl.innerHTML = '';
        list.forEach((b) => {
          const btn = document.createElement('button');
          btn.className = 'btn chip' + (b.id === curId ? ' on' : '');
          btn.textContent = BIOME_SHORT[b.id] || b.name;
          btn.title = b.name + ' (' + b.region + ')';
          btn.addEventListener('click', () => {
            if (b.id !== curId) doSwitch(b.id);
          });
          biomeBtnsEl.appendChild(btn);
        });
      }
    }

    function renderZoneChips() {
      const bio = activeBiome();
      if (!zoneChipsEl || !bio || !bio.landmarks) return;
      zoneChipsEl.innerHTML = '';
      bio.landmarks.forEach((lm) => {
        const b = document.createElement('button');
        b.className = 'btn chip';
        b.textContent = lm.name;
        b.title = lm.description;
        b.addEventListener('click', () => {
          OC.Navigation.flyTo(lm.x, lm.y, lm.z, lm.yaw, lm.pitch);
          toast(lm.name + ' · ' + lm.description);
        });
        zoneChipsEl.appendChild(b);
      });
    }

    renderBiomeUI();
    renderZoneChips();

      return { renderBiomeUI, renderZoneChips };
    }
  };
})(window.OC);
