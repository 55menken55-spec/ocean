/**
 * Real Headless Chromium / Playwright WebGL E2E Verification & FPS Profiler
 * Usage:
 *   1. Ensure Playwright + Chromium are installed (`npx playwright install chromium`)
 *   2. Start static server (`python3 -m http.server 8080 --bind 0.0.0.0`)
 *   3. Run: `node tests/e2e_playwright.mjs`
 */
import assert from 'node:assert/strict';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (err) {
  console.error('Playwright is not installed in this environment. Install with `npm i -D playwright && npx playwright install chromium`.');
  process.exit(2);
}

const URL = process.env.OC_URL || 'http://127.0.0.1:8080/index.html';

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

console.log(`1) Loading ${URL} in headless Chromium (WebGL SwiftShader)...`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.OC && window.OC.getPerfStats && window.OC.Biomes, { timeout: 20000 });
await page.waitForTimeout(1000);

// Assert WebGL canvas produces non-black pixels
const nonBlack = await page.evaluate(() => {
  const c = document.getElementById('scene');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return false;
  const px = new Uint8Array(4);
  gl.readPixels(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return (px[0] + px[1] + px[2]) > 0;
});
assert(nonBlack, 'Main WebGL #scene canvas rendered completely black center pixel');

// Exercise core hotkeys: B (sub HUD), F (flashlight), G (3D multibeam sonar), ` (hydrophone), Z (ROV grab), I (CTD), K (Atlas), O (Globe), L (EcoLab)
for (const code of ['KeyB', 'KeyF', 'KeyG', 'Backquote', 'KeyZ', 'KeyI', 'KeyI', 'KeyL', 'KeyL', 'KeyO', 'Escape', 'KeyK', 'Escape']) {
  await page.keyboard.press(code);
  await page.waitForTimeout(180);
}

// Profile all 9 ocean biomes across live frames
const biomeIds = await page.evaluate(() => window.OC.Biomes.list().map((b) => b.id));
assert.equal(biomeIds.length, 9, `Expected 9 biomes, found ${biomeIds.length}`);

const report = [];
for (const id of biomeIds) {
  await page.evaluate((bId) => window.OC.switchBiome(bId), id);
  await page.waitForTimeout(1400);
  await page.keyboard.press('KeyG');
  await page.waitForTimeout(900);
  const st = await page.evaluate(() => window.OC.getPerfStats());
  report.push(st);
}

console.log('\nBiome FPS & Draw-Call Profile (Headless Chromium SwiftShader):');
console.table(report);
assert.equal(errors.length, 0, `Encountered browser console/page errors:\n${errors.join('\n')}`);

await browser.close();
console.log('PLAYWRIGHT WEBGL E2E VERIFICATION PASSED!');
