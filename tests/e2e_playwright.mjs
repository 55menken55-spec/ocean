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

  // Exercise core hotkeys: B (sub HUD), F (flashlight), G (3D multibeam sonar), ` (hydrophone), Z (ROV grab), I (CTD), K (Atlas), O (Globe), L (EcoLab), P/Enter (Photo), N/X (Cinema), / (Quick-Help)
  for (const code of ['KeyB', 'KeyF', 'KeyG', 'Backquote', 'KeyZ', 'KeyI', 'KeyI', 'KeyL', 'KeyL', 'KeyO', 'Escape', 'KeyK', 'Escape', 'KeyP', 'Enter', 'KeyP', 'KeyN', 'KeyX', 'KeyN', 'Slash', 'Escape']) {
    await page.keyboard.press(code);
    await page.waitForTimeout(160);
  }

  const hydroOpen = await page.evaluate(() => window.OC.Hydrophone && window.OC.Hydrophone.isOpen());
  assert(hydroOpen, 'Backquote (~) hotkey must keep Hydrophone FFT active in Chromium');

  // Profile every ocean biome across live Chromium frames
  const biomeIds = await page.evaluate(() => window.OC.Biomes.list().map((b) => b.id));
  assert(biomeIds.length >= 10, `Expected >= 10 biomes, found ${biomeIds.length}`);

  const reportMeta = await page.evaluate(() => {
    const exp = window.OC.Expedition && window.OC.Expedition.exportReport ? window.OC.Expedition.exportReport('md') : null;
    return exp ? { len: exp.content.length, biomes: exp.report.biomes.length } : null;
  });
  assert(reportMeta && reportMeta.biomes === 10 && reportMeta.len > 400, `Playwright report export failed: ${JSON.stringify(reportMeta)}`);

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

  assert.equal(errors.length, 0, `Encountered browser console/page errors:\n${errors.join('\n')}`);
  console.log('PLAYWRIGHT WEBGL E2E VERIFICATION PASSED!');
} catch (err) {
  try {
    fs.mkdirSync(path.join(process.cwd(), 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(process.cwd(), 'test-results', 'failure.png') });
    console.error('Saved failure screenshot to test-results/failure.png');
  } catch (_) {}
  throw err;
} finally {
  await browser.close();
}
