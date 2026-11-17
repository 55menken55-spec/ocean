// Z) Verify Step 10 & CI Stage 5 (Interactive Onboarding, Quick-Help Modal ?/F1, Frame Telemetry & GitHub Actions WebGL CI)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { groupSource, ROOT } from '../lib/harness.mjs';

export function run(ctx) {
  const { OC, html } = ctx;
  const tplSrc = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
  const mainUiSrc = fs.readFileSync(path.join(ROOT, 'src/ui/main.js'), 'utf8');
  const ciSrc = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  const pwSrc = fs.readFileSync(path.join(ROOT, 'tests', 'e2e_playwright.mjs'), 'utf8');
  assert(tplSrc.includes('id="btn-help"') && tplSrc.includes('id="help-modal"') && tplSrc.includes('id="hero-tour-btn"') && tplSrc.includes('id="hero-help-btn"'), 'template.html must contain interactive onboarding & Quick-Help modal markup');
  const guideUiSrc = fs.readFileSync(path.join(ROOT, 'src/ui/panels_guide.js'), 'utf8');
  const hotkeysSrc = fs.readFileSync(path.join(ROOT, 'src/ui/hotkeys.js'), 'utf8');
  assert(hotkeysSrc.includes("e.code === 'Slash'") && mainUiSrc.includes('OC._Hotkeys.bind'), 'src/ui/hotkeys.js must own the Slash/F1 quick-help shortcut, wired from main.js');
  assert(mainUiSrc.includes('OC.getPerfStats'), 'src/ui/main.js must wire OC.getPerfStats');
  assert(guideUiSrc.includes('oc_onboard_seen_v1') && guideUiSrc.includes('function dismissHero') && mainUiSrc.includes('OC._HudPanelsGuide.bind'), 'src/ui/panels_guide.js must own persisted onboarding dismissal & the help modal');
  assert(!ciSrc.includes('\t'), '.github/workflows/ci.yml must not contain raw tab indentation');
  assert(ciSrc.includes('build-and-vm-verify') && ciSrc.includes('browser-webgl-e2e') && ciSrc.includes('e2e_playwright.mjs') && ciSrc.includes('verify_e2e.mjs'), 'ci.yml must run build check, verify.mjs, verify_e2e.mjs and browser-webgl-e2e');
  assert(pwSrc.includes('swiftshader') && pwSrc.includes('readPixels') && pwSrc.includes('OC_PERF_SUMMARY_MD'), 'e2e_playwright.mjs must verify WebGL SwiftShader pixels & export perf summary');
  /* Профиль по биомам обязан быть гейтом сборки, а не справкой к логу: без этого
     проверку выкидывают при первом же ложном срабатывании. */
  const e2eSrc = fs.readFileSync(path.join(ROOT, 'tests', 'verify_e2e.mjs'), 'utf8');
  const gateSrc = fs.readFileSync(path.join(ROOT, 'tests', 'perf_gate.mjs'), 'utf8');
  assert(e2eSrc.includes('assertPerfGate(') && e2eSrc.includes('VM_GATE'),
    'tests/verify_e2e.mjs must gate the biome profile through assertPerfGate(VM_GATE)');
  assert(pwSrc.includes('checkPerfRows(') && pwSrc.includes('BROWSER_GATE'),
    'tests/e2e_playwright.mjs must gate the Chromium profile through checkPerfRows(BROWSER_GATE)');
  assert(gateSrc.includes('maxRelativeAvgCpuMs') && gateSrc.includes('maxP95OverAvg'),
    'tests/perf_gate.mjs must gate both the relative biome cost and p95 frame spikes');
}
