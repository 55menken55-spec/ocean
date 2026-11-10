---
name: webaudio-underwater-soundscape
description: Author procedural zero-asset Web Audio API underwater soundscapes in src/engine/audio.js, including depth-dependent pressure filtering, zone bioacoustics, whale songs, sonar pings, and biome audio profiles.
metadata:
  project: ocean
  domain: web-audio-synthesis
---

# Web Audio Underwater Soundscape

Use this skill when extending `src/engine/audio.js` (`OC.sound`). `ocean` builds a completely offline, zero-asset `index.html`, so **all ocean audio must be synthesized procedurally** via the Web Audio API (`AudioContext` / `webkitAudioContext`).

## Current Signal Graph (`src/engine/audio.js`)

- **`S.master` GainNode**: fades smoothly (`linearRampToValueAtTime`) on init (`2.2 s`) and mute toggle (`0.5 s`).
- **Deep ocean rumble**: 4-second stereo Brownian noise buffer (`last = (last + 0.022 * white) / 1.022`) routed through a `lowpass` filter (`S.deepFilter`, `Q = 0.65`) modulated by slow LFO (`0.05–0.10 Hz`).
  - Depth damping: `OC.sound.update(depth, zoneId)` shifts `S.deepFilter.frequency` smoothly via `setTargetAtTime(OC.clamp(320 - depth * 2.1, 95, 340), now, 0.4)`.
- **Reef current flow**: second noise loop through `bandpass` (`620 Hz`, gain `0.045`).
- **One-shot bioacoustics**:
  - `S.bubble()`: 1–3 sine oscillators sweeping upward (`f0 -> f0 * 1.8..3.0` over `50–120 ms`) with random `StereoPannerNode` (`-0.8..+0.8`).
  - `S.shrimpSnap()`: short triangle impulse (`2200–3800 Hz -> 900 Hz` over `18 ms`) triggered only in shallow coral zones (`depth < 24 && zoneId !== 'dropoff'`).
  - `S.whale()`: 3-harmonic sine voice (`92, 138, 231 Hz`) with vibrato LFO (`4.6+ Hz`) filtered at `420 Hz`, gain boosted (`1.5×`) near `dropoff` and `slope_hole`.

## Synthesis Recipes for Expansion

### 1. Submersible Active Sonar Ping (`OC.sound.sonarPing(rangeMeters)`)
- Primary pulse: `1350 Hz` sine with `2 ms` attack and `220 ms` exponential decay (`gain = 0.08`) through a tight `bandpass` (`Q = 8`).
- Echo return (if seabed/wall hit within `120 m`): schedule a delayed clone (`delay = (2 * rangeMeters) / 1500` sec, `lowpass` `950 Hz`, attenuated gain inversely proportional to distance).

### 2. Deep-Ocean Hull Pressure Creak (`depth > 60 m`)
- Low-frequency filtered noise burst (`110–180 Hz`, `Q = 6`, `0.25–0.6 s`) paired with subtle metallic pitch bend (`78 -> 64 Hz`) triggered rarely as depth increases below `60 m`.

### 3. New Biome Audio Profiles
- **Kelp Forest / Surf Zone**: surge oscillator modulating `bandpass` wave hiss (`400–900 Hz`) inversely with depth (`< 10 m` stronger).
- **Hydrothermal Vents**: sub-bass `42 Hz` rumble + crackling narrowband highpass noise (`1800–3200 Hz`) scaled by proximity to active smoker coordinates.
- **Arctic / Ice Shelf**: sharp resonant crack impulses (noise burst -> `bandpass` `900 Hz` + `2400 Hz` resonance) + deep slow hull groans.

## Browser & Audio Safety Rules
1. **Autoplay policy compliance**: Never construct `AudioContext` on page load; initialize lazily inside `S.ensure()` only from user interaction (`click` or `KeyM`), and call `S.ctx.resume()` if `state === 'suspended'`.
2. **No `StereoPannerNode` crashes**: Always guard `ctx.createStereoPanner ? ctx.createStereoPanner() : null` for legacy WebKit fallback.
3. **Zero click artifacts**: Always ramp gain from `0` or current value (`setValueAtTime` -> `linearRampToValueAtTime` / `exponentialRampToValueAtTime`, never jump abruptly to `0`, and keep exponential ramp targets `>= 0.0001`).
4. **Stop timers cleanly**: Track `setTimeout` handles in `S.timers` and clear/gate them when muted or tearing down a biome.
