---
name: ui-checker
description: >-
  Audits built web UIs on four dimensions: theme compliance (colors, borders, shadows use CSS
  variables or tokens, including Tailwind and shadcn dark mode), layout integrity (spacing,
  overflow, breakpoints), browser rendering (a live inspector artifact to toggle themes, measure
  elements, check contrast) and accessibility (WCAG contrast, alt text, focus styles, fixed px
  fonts, reduced motion). Also reviews UI code against the Vercel Web Interface Guidelines with
  file:line findings. Trigger for: "review my UI", "audit my theme", "does dark mode work", "find
  hardcoded colors", "WCAG contrast", "responsive check", "UI QA", "check accessibility", "check my
  site against best practices", or pasted HTML/CSS asking "why doesn't my dark mode work" or "what's
  wrong with my layout". Not for choosing a new aesthetic or applying a design system from scratch;
  this audits what is already built.
license: MIT
metadata:
  author: tp-job (enhanced by Claude)
  version: "1.2.0"
  source: UI Inspection & WCAG guidelines (compiled 2026)
---

# UI Inspector

Audits web UIs across four dimensions: **Theme Compliance**, **Layout Integrity**, **Browser Rendering**, and **Accessibility**.

**Primary deliverable: the live Inspector Artifact**, a single client-side `.html` file (or inline widget) that runs in the person's own browser: click an element for live dimensions, toggle light/dark, click two swatches for WCAG contrast. It needs no headless browser, Node or network, so it works in every environment.

Playwright screenshots (Step 4) are optional; use them only after confirming Node, network and Playwright are available (often true in Claude Code, usually not in a claude.ai sandbox).

---

## Step 0 — Classify Input & Build Check Plan

Identify what's been provided and what checks to run:

|Input|Detection|Checks to Run|
|---|---|---|
|`.html` file (uploaded or in the repo)|`*.html` path|All three: static + WCAG + artifact|
|`.css` file (uploaded or in the repo)|`*.css` path|Static + WCAG only|
|URL|Starts `http://` or `https://`|Fetch first, then all|
|Pasted HTML/CSS|Raw code in message|Write to `/tmp/ui-checker/`, then all|
|`.jsx` / `.tsx` / `.vue`|Component file|Extract `<style>` / CSS-in-JS, then static|
|Screenshot / image|Image file|Visual analysis only, describe issues|

Write temp working files to a scratch directory (`/tmp/ui-checker/` below; use the session's scratch or temp folder where `/tmp` does not exist). Create it first:

```bash
mkdir -p /tmp/ui-checker/screenshots
```

---

## Step 1 — Static Analysis (always run first)

Run `scripts/static-analysis.py` on the input file. Works on raw `.html`/`.css` — no dependencies, no network.

```bash
python3 scripts/static-analysis.py \
  --input /tmp/ui-checker/target.html \
  --output /tmp/ui-checker/analysis.json
```

**What it finds:**

**Theme Violations (Critical)**

- Hardcoded `#hex`, `rgb()`, `hsl()` values in component rules (not inside `:root` or `.dark`)
- Colors in `style=""` attributes (inline styles bypass all CSS variable systems)
- Tailwind arbitrary-value color utilities, e.g. `bg-[#1a1a1a]` — same severity as a hardcoded CSS color

**Tailwind-Specific Checks**

- Detects `cdn.tailwindcss.com` usage and whether `darkMode: 'class'` is configured
- Flags raw palette utilities (`bg-slate-100`) used on an element with no matching `dark:bg-...` sibling class, but only when the file demonstrably uses `dark:` elsewhere (avoids false positives on intentionally single-theme pages)
- Counts usage of semantic/token utilities (`bg-background`, `text-foreground`, `bg-primary` etc.) — the shadcn/ui convention where Tailwind classes map through `tailwind.config` to CSS variables; this is the _compliant_ pattern and should be praised, not flagged

**Theme Gaps (High)**

- CSS variables defined in `:root` with no override in `@media (prefers-color-scheme: dark)`, `.dark { }`, or `[data-theme="dark"]`
- **Dark-mode method detection** (`dark_mode_method` field) — one of `class`, `tailwind-class`, `data-attribute`, `media-query`, `tailwind-media`, `none`. The `class`/`data-attribute`/`tailwind-class` methods are **live-toggle compatible**: a manual button can switch them, which is what the Inspector Artifact's theme toggle does. Pure `media-query`/`tailwind-media` methods only respond to the OS appearance setting — flag this clearly so the person knows the artifact's toggle won't visibly do anything for those, and suggest adding a class hook if they want it manually testable.

**Layout Issues (Medium)**

- Fixed `height: Npx` without a `min-height` fallback
- Fixed `width: Npx > 480px` without `max-width` + `width: 100%` pairing
- `overflow: hidden` that may clip content at different sizes or zoom levels

**Typography & Motion & Accessibility (Polish)**

- `font-size` set in `px` instead of `rem` (won't scale with the user's browser font-size preference)
- Transitions/animations with no `@media (prefers-reduced-motion: reduce)` override
- `<img>` tags missing `alt` text
- No `:focus` / `:focus-visible` styles found despite interactive elements existing

---

## Step 2 — WCAG Contrast Check

Run `scripts/wcag-checker.py` on the analysis results.

```bash
python3 scripts/wcag-checker.py \
  --input /tmp/ui-checker/analysis.json \
  --output /tmp/ui-checker/wcag-report.json
```

Or check a specific pair directly:

```bash
python3 scripts/wcag-checker.py --colors "#1a1a1a" "#ffffff"
```

**WCAG AA Thresholds (required minimum):**

- Normal text (< 18px or < 14px bold): **4.5:1**
- Large text (≥ 18px or ≥ 14px bold): **3:1**
- UI components & graphics: **3:1**

**WCAG AAA (enhanced, target for important UIs):**

- Normal text: **7:1** | Large text: **4.5:1**

---

## Step 3 — Build the Interactive Inspector Artifact (primary deliverable)

Inject the target HTML (and the Step 1 analysis) into the artifact template using `scripts/build-artifact.py`. This uses base64 encoding internally so it's immune to backticks, `${}`, or any special characters in the person's original markup — never hand-edit the template's placeholders with string replacement, always use this script.

```bash
python3 scripts/build-artifact.py \
  --html /tmp/ui-checker/target.html \
  --template assets/inspector-artifact.html \
  --analysis /tmp/ui-checker/analysis.json \
  --output /tmp/ui-checker/ui-inspector.html
```

Then show the result to the person using `visualize:show_widget` (preferred — renders inline in chat) by reading the built file's contents into `widget_code`, or save it as a downloadable artifact file via `present_files` if they want to keep/share it.

**What the artifact gives the person, live in their own browser:**

- **Left pane** — actual rendered preview of their UI in an iframe
- **Viewport buttons** — 320 / 375 / 768 / Full width, to check responsiveness instantly
- **🎨 Colors tab** — every color found, tagged ✅ token or ❌ hardcoded; click any swatch to feed it into the WCAG checker; full CSS variable list
- **📐 Layout tab** — click any element in the preview to see its live width/height/position and key computed styles
- **♿ WCAG tab** — pick two colors, see the live contrast ratio against AA/AAA thresholds for normal text, large text, and UI components
- **⚠️ Issues tab** — every finding from Step 1, each with a one-click "Copy fix" button containing ready-to-paste CSS
- **Compatibility banner** — automatically warns if the page's dark mode only responds to OS settings (media-query-only) so the toggle won't appear to do anything, with the exact config fix needed

---

## Step 4 — Browser Screenshots (optional)

Only attempt this if you've confirmed Node + network + Playwright are actually available in the current environment (check with `npx playwright --version`). If it is not available, go straight from Step 3 to Step 5.

```bash
npx playwright --version 2>/dev/null && echo "AVAILABLE" || echo "NOT_AVAILABLE"
```

If available, run `scripts/browser-inspector.js`:

```bash
node scripts/browser-inspector.js \
  --file /tmp/ui-checker/target.html \
  --selectors "body,main,nav,header,footer,.container" \
  --viewports "mobile,tablet,desktop,desktop-lg" \
  --output /tmp/ui-checker/layout-report.json
```

This captures, per viewport per selector: bounding box, computed styles, and light/dark screenshots via real `prefers-color-scheme` emulation (which the artifact's toggle cannot fake for media-query-only pages — this is the one thing Playwright can do that the artifact can't).

---

## Step 5 — Generate Report

Produce the final HTML report:

```bash
python3 /path/to/scripts/generate-report.py \
  --analysis /tmp/ui-checker/analysis.json \
  --wcag /tmp/ui-checker/wcag-report.json \
  --layout /tmp/ui-checker/layout-report.json \
  --output /mnt/user-data/outputs/ui-check-report.html
```

**Report structure:**

1. **Scorecard** — Theme compliance %, issue counts by severity
2. **Hardcoded Color Table** — Each violation with swatch, property, line, suggested fix
3. **CSS Variable Map** — All defined tokens, their values, dark mode coverage
4. **WCAG Table** — All color pairs with ratio and PASS/FAIL
5. **Layout Issues** — Sorted by severity, each with code fix
6. **Screenshots** — Side-by-side light vs dark at each breakpoint (if Playwright ran)

---

## Step 6 — In-Chat Summary

Always produce a short in-chat summary even if files are also generated:

```
🔍 UI Check Complete

Theme Compliance: 62% — 8 hardcoded colors found
🔴 Critical (3): Inline style colors bypassing CSS variables
🟡 Warnings (5): Fixed heights without min-height fallback
✅ Passing: CSS variable system detected, dark mode partially supported
⚠️  Dark mode gaps: 4 variables missing @media override
```

---

## Common Fixes (Quick Reference)

### Hardcoded color not responding to theme

```css
/* ❌ Hardcoded — won't change with theme */
.card { color: #1a1a1a; background: #ffffff; }

/* ✅ CSS Variable — responds to theme */
:root { --color-text: #1a1a1a; --color-surface: #ffffff; }
[data-theme="dark"] { --color-text: #f0f0f0; --color-surface: #1e1e1e; }
.card { color: var(--color-text); background: var(--color-surface); }
```

### Missing dark mode override

```css
/* ❌ Only light defined */
:root { --color-primary: #0070f3; }

/* ✅ Both modes defined */
:root { --color-primary: #0070f3; }
@media (prefers-color-scheme: dark) {
  :root { --color-primary: #3b9eff; }
}
```

### Fixed height breaking layout

```css
/* ❌ Clips content at large font / zoom */
.card { height: 200px; }

/* ✅ Grows with content */
.card { min-height: 200px; height: auto; }
```

### Container too wide on mobile

```css
/* ❌ Overflows at narrow viewports */
.container { width: 1200px; }

/* ✅ Responsive container */
.container { width: 100%; max-width: 1200px; margin: 0 auto; }
```

---

## Viewport Test Matrix

|Label|Width|Device|
|---|---|---|
|mobile-s|320px|iPhone SE|
|mobile|375px|iPhone standard|
|mobile-lg|430px|iPhone Pro Max|
|tablet|768px|iPad portrait|
|tablet-lg|1024px|iPad landscape|
|desktop|1280px|Laptop|
|desktop-lg|1440px|Large laptop|
|4k|1920px|External monitor|

---

## Outputs (produce every one that applies)

1. **In-chat summary** — always, even for quick checks
2. **Inspector Artifact** — live interactive checker in Claude's UI — always for HTML input
3. **HTML Report file** — full findings with code fixes — always when files available
4. **Raw JSON** — machine-readable results at `/tmp/ui-checker/*.json`

For quick one-liner questions ("is `#fff` on `#e5e5e5` accessible?"), skip all scripts and reason directly.

---

## References

- [checklist](references/checklist.md) — Complete 50-point UI check checklist
- [theme-patterns](references/theme-patterns.md) — Per-framework theming patterns and detection
- [web-interface-guidelines](references/web-interface-guidelines.md) — review files against the live Vercel Web Interface Guidelines