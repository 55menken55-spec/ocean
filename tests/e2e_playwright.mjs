/**
 * Real Headless Chromium / Playwright WebGL E2E Verification & FPS Profiler
 * Usage:
 *   1. Ensure Playwright + Chromium are installed (`npm install --no-save playwright && npx playwright install chromium`)
 *   2. Start static server (`python3 -m http.server 8080 --bind 0.0.0.0`)
 *   3. Run: `node tests/e2e_playwright.mjs`
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (err) {
  console.error('Playwright is not installed in this environment. Install with `npm install --no-save playwright && npx playwright install chromium`.');
  process.exit(2);
}

const URL = process.env.OC_URL || 'http://127.0.0.1:8080/index.html';
const SUMMARY_MD = process.env.OC_PERF_SUMMARY_MD || '';

// Stage breadcrumbs: on CI the raw job log is often unavailable, so every failure is
// reported through a `::error::` workflow annotation that names the failing stage.
let stage = 'init';
function enterStage(name) {
  stage = name;
  console.log(`\n--- stage: ${name} ---`);
}

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--no-sandbox'
  ]
});

const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
});

try {
  enterStage('desktop-boot');
  console.log(`1) Loading ${URL} in headless Chromium (WebGL SwiftShader)...`);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => window.OC && window.OC.getPerfStats && window.OC.Biomes && window.OC.getPerfStats().sampleCount >= 8,
    { timeout: 30000 }
  );
  await page.waitForTimeout(700);

  // Sample WebGL framebuffer inside the same RAF frame right after Three.js renders (preserveDrawingBuffer-safe)
  const renderCheck = await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => {
      const c = document.getElementById('scene');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) {
        resolve({ ok: false, reason: 'No WebGL context on #scene' });
        return;
      }
      const px = new Uint8Array(4);
      const pts = [
        [Math.floor(c.width * 0.5), Math.floor(c.height * 0.5)],
        [Math.floor(c.width * 0.25), Math.floor(c.height * 0.35)],
        [Math.floor(c.width * 0.75), Math.floor(c.height * 0.65)]
      ];
      let rgbSum = 0;
      for (const [x, y] of pts) {
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        rgbSum += px[0] + px[1] + px[2];
      }
      const st = window.OC.getPerfStats();
      resolve({ ok: rgbSum > 0 && st.drawCalls > 0, rgbSum, drawCalls: st.drawCalls, width: c.width, height: c.height });
    });
  }));
  assert(renderCheck.ok, `Main WebGL #scene failed render check: ${JSON.stringify(renderCheck)}`);
  console.log(`   WebGL frame rendered (${renderCheck.width}x${renderCheck.height}, drawCalls=${renderCheck.drawCalls}, sampleRGB=${renderCheck.rgbSum}).`);

  enterStage('desktop-hotkeys');
  // Exercise core hotkeys: B (sub HUD), F (flashlight), G (3D multibeam sonar), ` (hydrophone), Z (ROV grab), I (CTD), K (Atlas), O (Globe), L (EcoLab), P/Enter (Photo), N/X (Cinema), / (Quick-Help)
  for (const code of ['KeyB', 'KeyF', 'KeyG', 'Backquote', 'KeyZ', 'KeyI', 'KeyI', 'KeyL', 'KeyL', 'KeyO', 'Escape', 'KeyK', 'Escape', 'KeyP', 'Enter', 'KeyP', 'KeyN', 'KeyX', 'KeyN', 'Slash', 'Escape']) {
    await page.keyboard.press(code);
    await page.waitForTimeout(160);
  }

  const hydroOpen = await page.evaluate(() => window.OC.Hydrophone && window.OC.Hydrophone.isOpen());
  assert(hydroOpen, 'Backquote (~) hotkey must keep Hydrophone FFT active in Chromium');

  enterStage('desktop-biomes');
  // Profile every ocean biome across live Chromium frames
  const biomeIds = await page.evaluate(() => window.OC.Biomes.list().map((b) => b.id));
  assert(biomeIds.length >= 14, `Expected >= 14 biomes, found ${biomeIds.length}`);

  const reportMeta = await page.evaluate(() => {
    const exp = window.OC.Expedition && window.OC.Expedition.exportReport ? window.OC.Expedition.exportReport('md') : null;
    return exp ? { len: exp.content.length, biomes: exp.report.biomes.length } : null;
  });
  assert(reportMeta && reportMeta.biomes === 14 && reportMeta.len > 400, `Playwright report export failed: ${JSON.stringify(reportMeta)}`);

  const report = [];
  for (const id of biomeIds) {
    await page.evaluate((bId) => window.OC.switchBiome(bId), id);
    await page.waitForFunction(
      (bId) => {
        const s = window.OC.getPerfStats();
        return s.biomeId === bId && s.drawCalls > 0;
      },
      id,
      { timeout: 25000 }
    );
    await page.waitForTimeout(1200);
    await page.keyboard.press('KeyG');
    await page.waitForTimeout(800);
    const st = await page.evaluate(() => window.OC.getPerfStats());
    assert(st.drawCalls > 0 && st.chunksVisible > 0, `Biome ${id} rendered zero drawCalls or chunks`);
    report.push(st);
  }

  console.log('\nBiome FPS & Draw-Call Profile (Headless Chromium SwiftShader):');
  console.table(report);

  if (SUMMARY_MD) {
    const lines = [
      '### WebGL Headless Chromium (SwiftShader) Biome E2E Profile',
      '',
      '| Biome | FPS | Avg CPU (ms) | p95 CPU (ms) | Max CPU (ms) | Draw Calls | Triangles | Chunks | Flora | Fish |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
    ];
    for (const r of report) {
      lines.push(`| \`${r.biomeId}\` | ${r.fps} | ${r.avgCpuMs} | ${r.p95CpuMs} | ${r.maxCpuMs} | ${r.drawCalls} | ${r.triangles} | ${r.chunksVisible} | ${r.floraInstances} | ${r.schoolFish} |`);
    }
    fs.appendFileSync(SUMMARY_MD, lines.join('\n') + '\n');
  }

  // Free the SwiftShader CPU budget: the desktop page keeps rendering in the background and
  // would starve the emulated mobile page of frames during its boot wait.
  await context.close();

  // Mobile / tablet HUD pass: emulate a coarse-pointer phone in landscape and verify the
  // responsive HUD, touch quick-actions and dynamic resolution ladder stay functional.
  const mobileContext = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  const mobileErrors = [];
  mobilePage.on('pageerror', (err) => mobileErrors.push(`pageerror: ${err.message}`));
  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') mobileErrors.push(`console.error: ${msg.text()}`);
  });
  try {
    enterStage('mobile-boot');
    console.log('\nMobile HUD pass (844×390 landscape, coarse pointer, DPR 2)...');
    await mobilePage.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobilePage.waitForFunction(
      () => window.OC && window.OC.getPerfStats && window.OC.getPerfStats().sampleCount >= 5,
      { timeout: 60000 }
    );
    await mobilePage.waitForTimeout(600);

    async function readHudState(pg) {
      return pg.evaluate(() => {
        const vis = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return { display: cs.display, w: Math.round(r.width), h: Math.round(r.height), opacity: Number(cs.opacity) };
        };
        return {
          touchNav: vis('.touch-nav'),
          touchActions: vis('#touch-actions'),
          stick: vis('#touch-stick'),
          badge: vis('#res-badge'),
          stickLabel: vis('.touch-stick-label'),
          hudToggle: vis('#hud-toggle'),
          dyn: window.OC.Quality.getDynamicResolution(),
          mobile: window.OC.Quality.isMobile(),
          qualityId: window.OC.Quality.getId()
        };
      });
    }
    let hudState = await readHudState(mobilePage);

    enterStage('mobile-rotation');
    // Rotation: portrait phone must re-layout the HUD without overflow, then return to landscape
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    await mobilePage.waitForTimeout(500);
    const portrait = await mobilePage.evaluate(() => {
      const bad = [];
      for (const sel of ['.brand', '.topright', '#touch-actions', '.telemetry']) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const cs = window.getComputedStyle(el);
        if (cs.display === 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2 || r.bottom > window.innerHeight + 2)) {
          bad.push({ sel, left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom) });
        }
      }
      return { bad, w: window.innerWidth, h: window.innerHeight, drawCalls: window.OC.getPerfStats().drawCalls };
    });
    assert(portrait.bad && portrait.bad.length === 0, `Portrait phone HUD overflows: ${JSON.stringify(portrait)}`);
    assert(portrait.drawCalls > 0, 'Portrait rotation must keep the WebGL loop rendering');
    await mobilePage.setViewportSize({ width: 844, height: 390 });
    await mobilePage.waitForTimeout(500);
    hudState = await readHudState(mobilePage);
    assert(hudState.hudToggle && hudState.hudToggle.display !== 'none', `Coarse-pointer devices must expose the HUD toggle, got ${JSON.stringify(hudState.hudToggle)}`);
    assert(hudState.touchNav && hudState.touchNav.display !== 'none', `Mobile HUD must show touch-nav, got ${JSON.stringify(hudState.touchNav)}`);
    assert(hudState.touchActions && hudState.touchActions.display !== 'none', `Mobile HUD must show quick-action buttons, got ${JSON.stringify(hudState.touchActions)}`);
    assert(hudState.stick && hudState.stick.w > 40 && hudState.stick.h > 40, `Virtual stick must be tappable on mobile, got ${JSON.stringify(hudState.stick)}`);
    assert(hudState.dyn && typeof hudState.dyn.scale === 'number', 'Dynamic resolution telemetry must be live on mobile');

    enterStage('mobile-quick-actions');
    // Touch quick actions: flashlight, sonar, sample, boat mode, menu open
    for (const id of ['#m-flash', '#m-sonar', '#m-sample', '#m-sub', '#m-menu']) {
      await mobilePage.click(id, { force: true });
      await mobilePage.waitForTimeout(180);
    }
    const quickState = await mobilePage.evaluate(() => ({
      flash: window.OC.isFlashlightOn(),
      subHud: !document.getElementById('sub-hud').classList.contains('hidden'),
      panelOpen: !document.getElementById('panel').classList.contains('closed')
    }));
    assert(quickState.flash === true, 'Touch flashlight button must enable the ROV/diver spotlight');
    assert(quickState.subHud === true, 'Touch batiscaphe button must open the sub HUD');
    assert(quickState.panelOpen === true, 'Touch menu button must open the settings panel');

    enterStage('mobile-overflow');
    // Safe-area / narrow-phone rules must not push the HUD off-screen
    const overflow = await mobilePage.evaluate(() => {
      const bad = [];
      for (const sel of ['.brand', '.topright', '.touch-nav', '#touch-actions', '.telemetry']) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2 || r.bottom > window.innerHeight + 2)) {
          bad.push({ sel, left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom) });
        }
      }
      return { bad, w: window.innerWidth, h: window.innerHeight };
    });
    assert.equal(overflow.bad.length, 0, `Mobile HUD elements overflow the viewport: ${JSON.stringify(overflow)}`);

    enterStage('mobile-hud-toggle');
    // HUD hide/show («глаз») keeps the canvas interactive while hiding overlays
    const hudToggleOk = await mobilePage.evaluate(() => {
      const btn = document.getElementById('hud-toggle');
      if (!btn) return { ok: false, reason: 'missing #hud-toggle' };
      btn.click();
      const hiddenCount = document.querySelectorAll('.hud-hideable.hud-hidden').length;
      const reShow = document.getElementById('hud-toggle').classList.contains('show');
      btn.click();
      const restored = document.querySelectorAll('.hud-hideable.hud-hidden').length === 0;
      return { ok: hiddenCount > 3 && restored && reShow, hiddenCount, reShow, restored };
    });
    assert(hudToggleOk.ok, `HUD toggle must hide and restore overlays: ${JSON.stringify(hudToggleOk)}`);

    enterStage('icon-rail');
    // Рейл иконок: 14 кнопок сгруппированы, сворачиваются и не наезжают на бренд/телеметрию
    const rail = await mobilePage.evaluate(() => {
      const railEl = document.getElementById('topright');
      const groups = document.querySelectorAll('#icon-rail .icon-group');
      const btns = document.querySelectorAll('#topright .icon-btn:not(.rail-toggle)');
      const toggle = document.getElementById('btn-rail-toggle');
      const before = railEl ? railEl.dataset.collapsed : null;
      if (toggle) toggle.click();
      const rendered = document.getElementById('icon-rail');
      const cs = rendered ? window.getComputedStyle(rendered) : null;
      const collapsed = { state: railEl ? railEl.dataset.collapsed : null, pointerEvents: cs ? cs.pointerEvents : null };
      if (toggle) toggle.click();
      const restored = { state: railEl ? railEl.dataset.collapsed : null };
      return { groups: groups.length, btns: btns.length, toggle: !!toggle, before, collapsed, restored };
    });
    assert.equal(rail.btns, 14, `Рейл должен содержать все 14 иконок, найдено ${rail.btns}`);
    assert.equal(rail.groups, 4, `Иконки должны быть разбиты на 4 логические группы, найдено ${rail.groups}`);
    assert(rail.toggle, 'Кнопка сворачивания рейла #btn-rail-toggle отсутствует');
    assert.equal(rail.collapsed.state, 'true', `Сворачивание рейла не сработало: ${JSON.stringify(rail)}`);
    assert.equal(rail.collapsed.pointerEvents, 'none', 'Свёрнутый рейл должен быть некликабельным');
    assert.equal(rail.restored.state, 'false', 'Повторный клик должен разворачивать рейл обратно');

    enterStage('modal-hides-hud');
    // Открытая модалка (атлас) убирает HUD с экрана и возвращает его после закрытия
    const modalHud = await mobilePage.evaluate(() => {
      const vis = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return Number(window.getComputedStyle(el).opacity);
      };
      const before = { rail: vis('#topright'), brand: vis('.brand'), tele: vis('.telemetry') };
      window.OC.Atlas.toggle();
      return { before, atlasOpen: window.OC.Atlas.isOpen() };
    });
    await mobilePage.waitForTimeout(450); // ждём завершения перехода прозрачности
    // Под SwiftShader главный поток загружен рендером, поэтому CSS-переход
    // прозрачности может дойти до конца заметно позже номинальных 250 мс —
    // ждём фактического достижения целевой прозрачности, а не фиксированной паузы.
    await mobilePage.waitForFunction(() => {
      const v = (sel) => Number(getComputedStyle(document.querySelector(sel)).opacity);
      return v('#topright') < 0.05 && v('.brand') < 0.05 && v('.telemetry') < 0.05;
    }, null, { timeout: 15000 }).catch(() => {});
    modalHud.open = await mobilePage.evaluate(() => {
      const vis = (sel) => Number(window.getComputedStyle(document.querySelector(sel)).opacity);
      return {
        class: document.body.classList.contains('modal-open'),
        rail: vis('#topright'), brand: vis('.brand'), tele: vis('.telemetry')
      };
    });
    await mobilePage.evaluate(() => window.OC.Atlas.toggle());
    await mobilePage.waitForTimeout(450);
    await mobilePage.waitForFunction(() => {
      const v = (sel) => Number(getComputedStyle(document.querySelector(sel)).opacity);
      return v('#topright') > 0.95 && v('.brand') > 0.95;
    }, null, { timeout: 15000 }).catch(() => {});
    modalHud.closed = await mobilePage.evaluate(() => {
      const vis = (sel) => Number(window.getComputedStyle(document.querySelector(sel)).opacity);
      return { class: document.body.classList.contains('modal-open'), rail: vis('#topright'), brand: vis('.brand') };
    });
    assert(modalHud.atlasOpen, 'Атлас не открылся в тесте модалок');
    assert(modalHud.open.class === true, 'Открытая модалка должна ставить body.modal-open');
    assert(modalHud.open.rail < 0.05 && modalHud.open.brand < 0.05 && modalHud.open.tele < 0.05,
      `HUD не скрылся под модалкой: ${JSON.stringify(modalHud.open)}`);
    assert(modalHud.closed.class === false, 'После закрытия модалки body.modal-open должен сниматься');
    assert(modalHud.closed.rail > 0.95 && modalHud.closed.brand > 0.95,
      `HUD не вернулся после закрытия модалки: ${JSON.stringify(modalHud.closed)}`);

    enterStage('hud-layering');
    // Панели-окна обязаны быть выше ВСЕГО HUD-хрома: иначе иконки и джойстик
    // рисуются поверх открытой панели (было: panel 25 < rail 30, stick 26, actions 27)
    const layerReport = await mobilePage.evaluate(() => {
      const zOf = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        let node = el, z = null;
        while (node && node !== document.documentElement) {
          const v = getComputedStyle(node).zIndex;
          if (v && v !== 'auto') { z = parseInt(v, 10); break; }
          node = node.parentElement;
        }
        return z;
      };
      const panel = zOf('#panel');
      const hud = {
        rail: zOf('#topright'),
        joystick: zOf('.touch-nav'),
        touchActions: zOf('#touch-actions'),
        camPreview: zOf('.cam-preview'),
        resBadge: zOf('.res-badge'),
        minimap: zOf('.minimap-box'),
        sonar: zOf('.sonar-box'),
        hydro: zOf('.hydro-box'),
        telemetry: zOf('.telemetry'),
      };
      const offenders = Object.entries(hud)
        .filter(([, z]) => z !== null && z >= panel)
        .map(([k, z]) => `${k}=${z}`);
      return { panel, offenders };
    });
    assert.equal(layerReport.offenders.length, 0,
      `HUD-элементы перекрывают панель (panel z=${layerReport.panel}): ${layerReport.offenders.join(', ')}`);
    // и модалки по-прежнему выше панелей
    const modalZ = await mobilePage.evaluate(() => {
      const m = document.getElementById('atlas-modal');
      return m ? parseInt(getComputedStyle(m).zIndex, 10) : null;
    });
    assert.ok(modalZ > layerReport.panel, `Модалка (z=${modalZ}) должна быть выше панелей (z=${layerReport.panel})`);

    enterStage('panel-under-rail');
    // «Настройки и зоны» и «Эко-лаборатория» не должны заезжать под рейл иконок
    const panelHits = [];
    for (const vp of [{ w: 1280, h: 800 }, { w: 1024, h: 768 }, { w: 844, h: 390 }]) {
      await mobilePage.setViewportSize({ width: vp.w, height: vp.h });
      await mobilePage.waitForTimeout(320);
      for (const panelId of ['panel', 'lab-panel']) {
        const bad = await mobilePage.evaluate(({ panelId, w, h }) => {
          const railEl = document.getElementById('topright');
          const panelEl = document.getElementById(panelId);
          if (!railEl || !panelEl) return [{ reason: 'missing element' }];
          const openIt = () => panelEl.classList.remove('closed');
          // рейл разворачиваем — это самый плотный случай
          if (window.OC && window.OC.UI && window.OC.UI.Rail) window.OC.UI.Rail.setCollapsed(false, false);
          openIt();
          const r = railEl.getBoundingClientRect();
          const p = panelEl.getBoundingClientRect();
          const ox = Math.min(r.right, p.right) - Math.max(r.left, p.left);
          const oy = Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top);
          const hits = [];
          if (ox > 2 && oy > 2) hits.push({ kind: 'rail-vs-panel', ox: Math.round(ox), oy: Math.round(oy), railBottom: Math.round(r.bottom), panelTop: Math.round(p.top) });
          if (p.bottom > h + 2 || p.top < -2) hits.push({ kind: 'panel-offscreen', top: Math.round(p.top), bottom: Math.round(p.bottom) });
          return hits;
        }, { panelId, w: vp.w, h: vp.h });
        if (bad.length) panelHits.push({ viewport: `${vp.w}x${vp.h}`, panel: panelId, hits: bad });
        await mobilePage.evaluate((id) => document.getElementById(id).classList.add('closed'), panelId);
      }
    }
    await mobilePage.setViewportSize({ width: 844, height: 390 });
    await mobilePage.waitForTimeout(300);
    assert.equal(panelHits.length, 0, `Панели перекрываются рейлом: ${JSON.stringify(panelHits)}`);

    enterStage('hud-overlap');
    // Ни один элемент HUD не должен наезжать на другой на типовых ширинах
    const overlaps = [];
    for (const vp of [{ w: 1280, h: 800 }, { w: 1024, h: 768 }, { w: 844, h: 390 }]) {
      await mobilePage.setViewportSize({ width: vp.w, height: vp.h });
      await mobilePage.waitForTimeout(320);
      const bad = await mobilePage.evaluate(() => {
        // проверяем самый плотный случай: рейл развёрнут
        if (window.OC && window.OC.UI && window.OC.UI.Rail) window.OC.UI.Rail.setCollapsed(false, false);
        const rect = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const cs = window.getComputedStyle(el);
          if (cs.display === 'none' || Number(cs.opacity) < 0.1) return null;
          const r = el.getBoundingClientRect();
          return r.width > 0 ? { sel, left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null;
        };
        const els = ['.brand', '.topright', '.telemetry', '.status', '#res-badge'].map(rect).filter(Boolean);
        const hits = [];
        for (let i = 0; i < els.length; i++) {
          for (let j = i + 1; j < els.length; j++) {
            const a = els[i], b = els[j];
            const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (ox > 4 && oy > 4) hits.push({ a: a.sel, b: b.sel, ox: Math.round(ox), oy: Math.round(oy) });
          }
        }
        return hits;
      });
      if (bad.length) overlaps.push({ viewport: `${vp.w}x${vp.h}`, hits: bad });
    }
    await mobilePage.setViewportSize({ width: 844, height: 390 });
    await mobilePage.waitForTimeout(320);
    assert.equal(overlaps.length, 0, `Элементы HUD перекрывают друг друга: ${JSON.stringify(overlaps)}`);

    enterStage('mobile-stick');
    // Virtual stick drives the nav state (drag right = forward thrust)
    const stickDrive = await mobilePage.evaluate(() => new Promise((resolve) => {
      const stick = document.getElementById('touch-stick');
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const fire = (type, x, y) => stick.dispatchEvent(new PointerEvent(type, {
        pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true
      }));
      fire('pointerdown', cx, cy);
      fire('pointermove', cx, cy - r.height * 0.4);
      const knob = document.getElementById('touch-knob');
      const moved = !!(knob && /translate\(/.test(knob.style.transform || ''));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const speedAfterPush = window.OC.Navigation.getSpeed();
        fire('pointerup', cx, cy - r.height * 0.4);
        resolve({ moved, speedAfterPush, transform: knob ? knob.style.transform : null });
      }));
    }));
    assert(stickDrive.moved, `Touch stick must move its knob visual: ${JSON.stringify(stickDrive)}`);
    assert(stickDrive.speedAfterPush > 0.12, `Touch stick must thrust the diver forward: ${JSON.stringify(stickDrive)}`);

    // Virtual stick must feed the navigation axis state (thrust then release)
    const stickAxis = await mobilePage.evaluate(() => new Promise((resolve) => {
      const stick = document.getElementById('touch-stick');
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const fire = (type, x, y) => stick.dispatchEvent(new PointerEvent(type, {
        pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true
      }));
      fire('pointerdown', cx, cy);
      fire('pointermove', cx, cy - r.height * 0.45);
      const pushed = window.OC.Navigation.getVirtualInput();
      fire('pointerup', cx, cy - r.height * 0.45);
      const released = window.OC.Navigation.getVirtualInput();
      resolve({ pushed, released });
    }));
    assert(stickAxis.pushed.y > 0.5, `Touch stick must push the forward axis: ${JSON.stringify(stickAxis)}`);
    assert(Math.abs(stickAxis.released.y) < 0.01 && Math.abs(stickAxis.released.x) < 0.01, `Releasing the stick must zero thrust: ${JSON.stringify(stickAxis)}`);

    enterStage('mobile-hotkeys');
    // Keyboard optics shortcuts work alongside touch controls
    await mobilePage.keyboard.press('BracketRight');
    await mobilePage.waitForTimeout(200);
    const tierAfter = await mobilePage.evaluate(() => window.OC.Quality.getId());
    assert(['low', 'medium', 'high', 'ultra'].includes(tierAfter), `Quality cycle hotkey produced invalid tier ${tierAfter}`);

    const mobileSt = await mobilePage.evaluate(() => window.OC.getPerfStats());
    assert(mobileSt.drawCalls > 0 && mobileSt.sampleCount > 0, `Mobile viewport rendered no frames: ${JSON.stringify(mobileSt)}`);
    assert.equal(mobileErrors.length, 0, `Mobile HUD page errors:\n${mobileErrors.join('\n')}`);
    console.log(`   Mobile HUD verified (dynRes=${(hudState.dyn.scale * 100).toFixed(0)}%, quickActions=5, quality=${tierAfter}, drawCalls=${mobileSt.drawCalls}).`);
  } finally {
    await mobileContext.close();
  }

  assert.equal(errors.length, 0, `Encountered browser console/page errors:\n${errors.join('\n')}`);
  console.log('PLAYWRIGHT WEBGL E2E VERIFICATION PASSED!');
} catch (err) {
  const detail = String(err && err.message ? err.message : err).replace(/\r?\n/g, ' ⏎ ').slice(0, 600);
  console.error(`FAILED STAGE: ${stage}`);
  console.error(detail);
  // GitHub Actions annotation: readable even when the raw job log is unavailable
  console.log(`::error title=Playwright E2E failed (${stage})::${detail}`);
  try {
    fs.mkdirSync(path.join(process.cwd(), 'test-results'), { recursive: true });
    if (page && !page.isClosed()) {
      await page.screenshot({ path: path.join(process.cwd(), 'test-results', 'failure.png') });
    }
    fs.writeFileSync(path.join(process.cwd(), 'test-results', 'failure-stage.txt'), `stage: ${stage}\n\n${detail}\n`);
    console.error('Saved failure screenshot to test-results/failure.png');
  } catch (_) {}
  throw err;
} finally {
  await browser.close();
}
