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
}
