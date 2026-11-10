---
name: webgl-shader-fx
description: Builds hero-grade WebGL and shader effects — Three.js scenes, GLSL distortion, GPU particles, MSDF text, disciplined post-processing — that hold 60fps on real devices and degrade gracefully to a static poster. Every effect ships with a fallback ladder, recorded performance numbers, and an evidence log when recreating effects seen elsewhere. USE WHEN: "add a 3D hero", "WebGL background", "shader effect", "image hover distortion", "liquid ripple on images", "GPU particles", "Three.js scene", "animated gradient background without banding", "recreate this effect from [site]", "scroll-driven camera", "kinetic 3D type", "the canvas is dropping frames", "make the hero feel alive", "noise transition between images".
license: MIT
metadata:
  suite: award-grade
  version: "1.4.0"
---

# webgl-shader-fx — the 3D/shader lab for hero moments that hold 60fps

## Mission

WebGL is the most expensive pixel on the page — it either IS the signature moment or it's a defect with a GPU bill. This skill builds one earned canvas per page, budgeted before beautified, with the fallback ladder built first and the frame trace recorded before anyone says "done". "Should work" is not a state a shader can be in; it either held 60fps on a throttled device or it didn't.

## When NOT to use

- **Content sites and long-form reading.** If people came to read, 3D behind or beside the text is decoration competing with content. Ship typography instead (`design-dna-forge`).
- **Dashboards and data-dense product UI.** Every GPU millisecond spent on ambiance is stolen from interaction latency. Hard no.
- **When CSS already does it.** A two-stop gradient, a simple hover scale, a masked reveal — `signature-interactions` handles these at 1/100th the payload.
- **When nobody will maintain the fallback.** If the team can't own a poster image and a context-loss handler, they can't own a canvas.
- **More than one scene per page.** Two competing canvases = zero signature moments and double the budget. Cut one.

## Workflow

1. **Earn the canvas.** Confirm with `wow-director` that this is THE signature moment (`../../references/awwwards-scoring.md` allows exactly one). If it's ambiance, stop here and use CSS.
2. **Write budgets before code.** Draw calls < 100, triangles < 500k mobile, hero payload < 1.5MB streamed, DPR ≤ 2, 60fps desktop / 30fps mobile floor. Put them in the project notes; they are exit criteria.
3. **Build the ladder bottom-up.** Static poster (a real image — this is your LCP) → CSS fallback → WebGL mount, feature-detected. The page must be complete and beautiful before the canvas ever boots.
4. **Gray-box the scene.** Geometry, camera choreography, and scroll wiring with flat `MeshBasicMaterial` — no shaders, no textures. Verify motion feel and `renderer.info.render.calls` here, where changes are cheap.
5. **Layer beauty one pass at a time.** Materials → custom shaders → (maybe) one post effect. Profile after each layer; record ms/frame. If a layer costs more than it says, it goes.
6. **Wire the lifecycle.** `IntersectionObserver` pauses off-viewport, `document.hidden` pauses the loop, `webglcontextlost` swaps to the poster, `prefers-reduced-motion` renders one frame and stops.
7. **Verify with recorded numbers.** DevTools Performance trace at 4× CPU throttle across the full hero + scroll journey (zero long tasks > 50ms), one real 3-year-old device or throttled simulator, payload sizes from the Network panel. Write the numbers down — unrecorded claims don't count.
8. **Submit to `award-judge`** with the numbers and the reduced-motion screenshots attached.

## Technique library

### Three.js hero scenes
**Earns its place when** the product/brand has a physical or spatial metaphor worth inhabiting — a device, a material, a world. Not when you "want some 3D".
- Scene budget: **< 100 draw calls, < 500k tris mobile**. Merge static geometry, share materials, instance repeats. Check `renderer.info.render.calls` in dev — put it on screen behind a debug flag.
- Camera choreography tied to scroll: sample a `CatmullRomCurve3` by scroll progress (ScrollTrigger `scrub` or a rAF-read progress value), then damp toward the target — `camera.position.lerp(target, 1 - Math.exp(-6 * dt))` — so fast scrolls stay smooth instead of teleporting.
- Never read layout inside the scroll handler; the scroll callback writes one number, the render loop reads it.

### Image distortion on hover (UV displacement)
**Earns its place on** portfolio/case-study image grids where images ARE the content. The classic: offset UVs by simplex noise scaled by an eased hover progress.

```glsl
uniform sampler2D uMap;
uniform float uHover;   // 0→1, eased on the CPU with the project's ease-out — never raw
uniform float uTime;
varying vec2 vUv;
void main() {
  float n = snoise(vec3(vUv * 4.0, uTime * 0.15));   // low-frequency simplex
  vec2 uv = vUv + n * 0.02 * uHover;                 // ≤ 2% displacement — felt, not seen
  float s = 0.0015 * uHover;                         // optional whisper of RGB split
  gl_FragColor = vec4(texture2D(uMap, uv + vec2(s,0.)).r,
                      texture2D(uMap, uv).g,
                      texture2D(uMap, uv - vec2(s,0.)).b, 1.0);
}
```
Perf: one plane per visible image, shared program, per-mesh uniforms. Animate `uHover` at `--duration-slow` (400ms) enter, ~70% on exit, per the motion canon.

### Noise-driven transitions
**Earns its place for** slide/route image changes that deserve more than a crossfade. Dissolve two textures through a noise threshold:

```glsl
float n = snoise(vec3(vUv * 6.0, uSeed));
float edge = smoothstep(uProgress - 0.08, uProgress + 0.08, n);
gl_FragColor = mix(texture2D(uTo, vUv), texture2D(uFrom, vUv), edge);
```
Drive `uProgress` with the same easing tokens as the rest of the page — a transition with foreign timing reads as a plugin, not a design.

### GPU particles
**Earns its place when** particles carry the brand idea (data made physical, matter forming a logo) — not as generic sparkle.
- Use `THREE.Points` or `InstancedMesh`; compute motion **in the vertex shader** from `uTime` + a curl-noise field. Zero per-frame attribute uploads — CPU-updated particles are the #1 particle perf mistake.
- Point budgets: **10k–50k mobile, 100k–500k desktop** with simple shaders. Halve counts as a ladder step (below) before dropping the effect.
- Curl noise (divergence-free gradient of simplex noise) gives fluid, non-crossing paths; plain jittered noise reads as static.

### Gradient / mesh backgrounds done RIGHT
**Earns its place as** quiet atmosphere behind a strong composition. This is the opposite of the banned floating-blob slop.
- Motion budget: **sub-1% of the frame changing per second** — uniforms drift on minutes-long loops. If a viewer can watch it move, it's too fast.
- Dither or it bands. 8-bit output cannot represent a slow dark gradient; add screen-space noise in the final shader:

```glsl
float d = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
color.rgb += (d - 0.5) / 255.0;   // ±0.5 LSB breaks banding invisibly
```
- Text over it gets a scrim and contrast tested against the **worst** frame, not the average (accessibility canon).

### Text effects (MSDF + per-glyph displacement)
**Earns its place for** hero headlines that are the signature moment themselves.
- Render type as **MSDF (multi-channel signed distance field)** atlases — crisp at any scale, one draw call per font, cheap outlines/soft edges in the fragment shader.
- Per-glyph motion: one instanced quad per glyph with an index attribute; displace in the vertex shader by `index`-staggered noise. Stagger 30–60ms equivalent, reading order, ≤ 7 glyph groups — canon stagger rules apply to shaders too.
- Reduced motion: the same MSDF text, set. Kinetic type becomes typography, not absence.

### Post-processing discipline
**Earns its place** almost never. Every fullscreen pass costs fullscreen fill-rate on the weakest GPU you support.
- **Pick ONE**: bloom OR film grain OR chromatic aberration. Subtle — if a stakeholder can name the effect, halve it.
- Grain and vignette are ~free folded into your final material's fragment shader — prefer that over a composer pass. Bloom is the expensive one (multiple downsampled blur passes); budget the whole post chain **≤ 3ms** on the throttled trace, measured, or cut it.

### Progressive enhancement architecture
Not optional — this IS the architecture.
1. **Static poster**: a real, art-directed image in the HTML. Preloaded, it is your LCP (< 2.5s budget).
2. **CSS fallback**: gradient/`transform` treatment layered on the poster for capable-but-no-WebGL contexts.
3. **WebGL mount**: only after feature detection passes — successful `canvas.getContext('webgl2')`, `prefers-reduced-motion: no-preference`, and a device heuristic (deviceMemory / DPR / save-data where available). The scene fades in over the poster; users on the fallback never know they missed anything.
- Reduced-motion = render one static frame (or keep the poster) per the motion canon. Same beauty, no loop.

### The adaptive performance ladder
Degrade resolution before beauty, beauty before existence. Evaluate on a rolling window (~60 frames), **ratchet down only** — oscillating quality is worse than stable-low.
1. **DPR clamp**: `Math.min(devicePixelRatio, 2)` always — 3× DPR is 2.25× the pixels for zero perceptible gain.
2. **Resolution scale**: render-target scale 1.0 → 0.75 → 0.5 when frame time sustains > 16.7ms (desktop) / > 33ms (mobile).
3. **Effect LOD**: drop the post pass, halve particle counts, simplify materials.
4. **Static fallback**: kill the loop, show the poster. A still image at 60fps beats a scene at 12.

### Evidence discipline — recreating effects seen elsewhere
Never build from an AI's guess of how an effect works — plausible-sounding shader explanations are routinely wrong. Capture truth at the GL boundary:
- **Frame capture** the target site with a GL call-capture tool (an open-source WebGL inspector) and read the actual draw calls, render targets, and pass structure.
- **Read the real shaders**: `gl.getShaderSource()` on captured programs, or the browser devtools' shader editor. Uniform names alone reveal the technique.
- Label every claim before building: **SOURCE** (read the actual shader/call stream) / **PARTIAL** (observed passes or uniforms, inferred the rest) / **GUESS** (visual inference only).
- Build from SOURCE or PARTIAL. A GUESS is not a recreation — it's a new effect you now own, and you name it honestly as such in the evidence log.

## Quality gates

- [`../../references/performance-budgets.md`](../../references/performance-budgets.md) — the WebGL row is the law here: 60fps desktop / 30fps mobile floor, DPR ≤ 2, hero payload < 1.5MB with poster-first paint, pause off-viewport and on `document.hidden`, and the test ritual with **recorded** numbers.
- [`../../references/motion-canon.md`](../../references/motion-canon.md) — reduced-motion parity (static hero frame), the autoplaying-loops-near-text ban (your gradient background lives or dies by sub-1% motion), the 1-second ceiling, and easing tokens for every uniform and camera move.
- [`../../references/accessibility-motion.md`](../../references/accessibility-motion.md) — canvas content that carries meaning needs a DOM equivalent; nothing flashes > 3×/s; text over WebGL tested against the worst frame; no full-viewport zoom/rotation transitions.
- [`../../references/awwwards-scoring.md`](../../references/awwwards-scoring.md) — one signature moment only; stock 3D blobs and glass-over-mesh-gradient are on the slop list that caps Design at 6; the restraint clause decides every "one more pass?" debate.

## Craft library (deep technique references)

- [`../../references/threejs-webgl-craft.md`](../../references/threejs-webgl-craft.md) — the 12 immutable shader rules earned over 76 calibration phases (output color-space r152 trap, normalization-constant hunts, render() sanity greps, rAF-not-tween uniforms, morph-never-at-rest, the three-part cursor sync), pixel-probe forensics, the library decision matrix, hero-source technique tiers, and the render-pipeline order.
- [`../../references/gpgpu-particles-and-morph.md`](../../references/gpgpu-particles-and-morph.md) — FBO ping-pong particle systems (256²=65k → 1024²=1M), curl-noise flow fields, and mesh morphing as a spring force into the field (never a lerp) with per-particle stagger — plus the honest "when NOT to GPGPU" list.
- [`../../references/ascii-dot-matrix-art.md`](../../references/ascii-dot-matrix-art.md) — the text-as-image family: the four-tier technique ladder (DOM halftone → canvas glyphs → WebGL glyph-atlas post-process → dot-matrix particle sculpture), the "resolve" as the signature move, and the full aesthetic pairing checklist.

## Deliverables

- **Scene module**: feature-detected mount with full lifecycle (viewport pause, hidden pause, context-loss recovery, reduced-motion single frame).
- **Fallback assets**: art-directed poster image (preloaded, LCP-ready) + CSS fallback layer.
- **Performance report**: recorded fps trace at 4× throttle, draw-call and triangle counts, payload sizes, post-chain ms, device tested. Numbers, not adjectives.
- **Adaptive ladder config**: the documented rung thresholds actually shipped.
- **Evidence log** (recreations only): per-claim SOURCE / PARTIAL / GUESS table with capture artifacts.

## Related skills

- **wow-director** — orchestrates the suite; approves that this page has earned a canvas at all.
- **award-judge** — gates the ship; bring it the perf report and reduced-motion screenshots.
- **signature-interactions** — DOM-level craft; the first stop before concluding an effect needs WebGL.
- **motion-choreography** — owns the timing system your uniforms and camera moves must speak.
- **design-dna-forge** — the palette and type DNA your shaders sample from; no freelance colors in GLSL.
- **ux-narrative** — the scroll story a camera path serves; choreograph to its beats, not the reverse.
- **video-motion-studio** — sometimes the honest answer is a beautifully compressed video, not a live scene.
