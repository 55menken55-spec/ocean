// AE) Verify Stage 5 Visual & Immersion Upgrade (Cinematic Water Optics, Tindall Glow, Entity Shadows, Touch HUD)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { groupSource, ROOT } from '../lib/harness.mjs';

export function run(ctx) {
  const { T, OC, html, worldSrc } = ctx;
  const worldV5 = worldSrc;
  assert(worldV5.includes('uFlashGlow') && worldV5.includes('coneScatter'), 'world post-FX must add flashlight Tindall scatter (uFlashGlow)');
  assert(worldV5.includes('uBedDepth') && worldV5.includes('floorGlow'), 'world.js volumetric flashlight beam must respect seabed contact (uBedDepth)');
  assert(worldV5.includes('sparkle') && worldV5.includes('causticBands'), 'world.js water surface must add sun sparkle glitter & underwater caustic bands');
  assert(worldV5.includes('currentPixelScale') && worldV5.includes('OC.applyPixelScale'), 'world.js must expose dynamic pixel-scale application');

  const shFloraShadow = new T.MeshStandardMaterial({ vertexColors: true });
  OC.enhanceMaterial(shFloraShadow, { causticStrength: 0.86, swayAmp: 0.4 });
  const shFloraOut = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
  shFloraShadow.onBeforeCompile(shFloraOut);
  assert(shFloraOut.fragmentShader.includes('ocShadow') && shFloraOut.fragmentShader.includes('uShadowB') && shFloraOut.fragmentShader.includes('counterShade'), 'Flora/coral shaders must receive overhead entity shadows & counter-shading');

  assert(typeof OC.ROV.getWakeCount === 'function' && OC.ROV.getWakeCount() >= 96, `ROV wake particle pool must be enlarged for turbulent trails, got ${OC.ROV.getWakeCount()}`);

  assert(typeof OC.Quality.getDynamicResolution === 'function' && typeof OC.Quality.evaluateDynamicResolution === 'function' && typeof OC.Quality.setDynamicResolution === 'function' && typeof OC.Quality.isMobile === 'function', 'OC.Quality must expose dynamic resolution controller & mobile detection');
  OC.Quality.setDynamicResolution(true);
  for (let s = 0; s < 14; s++) OC.Quality.evaluateDynamicResolution(41.0, 1.0);
  const dynHeavy = OC.Quality.getDynamicResolution();
  assert(dynHeavy.enabled && dynHeavy.scale < 0.9, `Dynamic resolution must step down under frame pressure, got ${JSON.stringify(dynHeavy)}`);
  for (let s = 0; s < 24; s++) OC.Quality.evaluateDynamicResolution(6.0, 1.0);
  const dynLight = OC.Quality.getDynamicResolution();
  assert(dynLight.scale >= dynHeavy.scale && dynLight.scale <= 1.0, `Dynamic resolution must recover toward 100%, got ${JSON.stringify(dynLight)}`);
  OC.Quality.setDynamicResolution(false);
  assert.equal(OC.Quality.getDynamicResolution().scale, 1.0, 'Disabling dynamic resolution must restore 100% pixel scale');
  assert(OC.Quality.getAutoLodState().dynamicResScale !== undefined, 'Auto-LOD telemetry must report dynamic resolution scale');

  const tplV5 = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
  assert(tplV5.includes('id="touch-actions"') && tplV5.includes('id="m-flash"') && tplV5.includes('id="m-sonar"') && tplV5.includes('id="m-sample"') && tplV5.includes('id="m-sub"'), 'template.html must add the mobile quick-action HUD buttons');
  assert(tplV5.includes('id="res-badge"') && tplV5.includes('id="hud-toggle"'), 'template.html must add the optics resolution badge and HUD toggle');

  // Рейл иконок: 14 кнопок в 4 логических группах + кнопка сворачивания + скрытие HUD под модалками
  const railIds = ['btn-globe','btn-atlas','btn-journal','btn-lab','btn-rov','btn-cam','btn-sonar','btn-hydro',
    'btn-flash','btn-sound','btn-cinema','btn-sub','btn-help','btn-panel'];
  for (const id of railIds) {
    assert(tplV5.includes(`id="${id}"`), `template.html lost rail icon #${id}`);
  }
  assert(tplV5.includes('id="icon-rail"') && tplV5.includes('id="btn-rail-toggle"'), 'template.html must wrap icons in #icon-rail with #btn-rail-toggle');
  const railGroupCount = (tplV5.match(/class="icon-group"/g) || []).length;
  assert(railGroupCount === 4, `rail must expose 4 logical icon groups, found ${railGroupCount}`);
  assert(tplV5.includes('body.modal-open'), 'template.html must hide HUD while a modal is open (body.modal-open)');
  const railsSrc = groupSource('ui/rails');
  assert(tplV5.includes('--rail-bottom'), 'template.html must expose measured rail height as --rail-bottom');
  assert(/\.panel\{[^}]*var\(--rail-bottom\)/.test(tplV5), 'panels must be offset below the icon rail via --rail-bottom');
  for (const sel of ['lab-panel', 'rov-panel']) {
    const re = new RegExp('\\.' + sel + '\\{[^}]*var\\(--rail-bottom\\)');
    assert(re.test(tplV5), `panel .${sel} must account for the icon rail height`);
  }
  assert(railsSrc.includes('syncRailMetrics'), 'ui/rails.js must publish measured rail height');
  /* CI: установка Chromium не должна выедать бюджет джоба (15 мин) */
  {
    const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
    const budgets = [...ci.matchAll(/timeout-minutes:\s*(\d+)/g)].map((m) => Number(m[1]));
    const jobBudget = Math.min(...budgets);
    const cap = Number((ci.match(/timeout (\d+) npx playwright install/) || [])[1] || 0);
    const attempts = Number(((ci.match(/for attempt in 1 (\d+)/) || [])[1]) || 0) + 1;
    assert(cap > 0, 'ci.yml must cap each Chromium install attempt');
    assert(cap * attempts + attempts * 20 < jobBudget * 60,
      `Chromium install budget (${cap}s x ${attempts}) must fit the ${jobBudget}-minute job`);
  }
  /* Панели-окна должны быть выше HUD-хрома, но ниже модалок */
  const panelZ = (tplV5.match(/\.panel\{[^}]*z-index:(\d+)/) || [])[1];
  assert(panelZ, '.panel must declare a z-index');
  for (const [name, re] of Object.entries({
    rail: /\.topright\{[^}]*z-index:(\d+)/,
    joystick: /\.touch-nav\{[^}]*z-index:(\d+)/,
    touchActions: /\.touch-actions\{[^}]*z-index:(\d+)/,
  })) {
    const z = (tplV5.match(re) || [])[1];
    assert(z && Number(z) < Number(panelZ), `HUD ${name} (z=${z}) must stay below panels (z=${panelZ})`);
  }
  { const mz = (tplV5.match(/\.atlas-modal\{[^}]*z-index:(\d+)/) || [])[1];
    assert(mz && Number(mz) > Number(panelZ), `modals (z=${mz}) must stay above panels (z=${panelZ})`); }
  for (const fn of ['setCollapsed', 'setModalOpen', 'isModalOpen']) {
    assert(railsSrc.includes(fn), `ui/rails.js must expose ${fn}`);
  }
  for (const src of ['ui/atlas', 'ui/globe', 'ui/panels_guide', 'ui/panels_camera']) {
    assert(groupSource(src).includes('setModalOpen'), `${src} must report its modal state to OC.UI.Rail`);
  }
  assert(tplV5.includes('env(safe-area-inset-bottom') && tplV5.includes('@media (max-width:430px)') && tplV5.includes('orientation:landscape') && tplV5.includes('pointer:coarse'), 'template.html must ship safe-area, narrow-phone & landscape mobile media rules');
  assert(tplV5.includes('touch-action:none') && tplV5.includes('.touch-act'), 'template.html must style touch action buttons with pointer-safe interaction');

  const mainV5 = fs.readFileSync(path.join(ROOT, 'src/ui/main.js'), 'utf8');
  assert(mainV5.includes('syncTouchQuick') && mainV5.includes('updateResBadge') && mainV5.includes('toggleHud'), 'main.js must wire touch quick actions, resolution badge & HUD toggle');
  assert(mainV5.includes('evaluateDynamicResolution') && mainV5.includes('applyPixelScale'), 'main.js frame loop must apply dynamic resolution');
  assert(mainV5.includes('orientationchange'), 'main.js must re-scale the render target after device rotation');
  console.log(`   Stage 5 Visual & Immersion (Tindall beam glow ${dynHeavy.scale} → ${dynLight.scale} dyn-res, 128 wake particles, flora entity shadows, safe-area touch HUD) verified.`);

}
