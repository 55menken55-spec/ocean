# Animation Reference

## Contents

- Animation System Overview
- AnimationMixer — Play GLTF Animations
- AnimationAction Controls
- Animation Blending (State Machine Pattern)
- Keyframe Tracks (custom animations)
- Morph Targets
- Skeletal Animation — Bone Access
- Procedural Animation Patterns
- Performance Tips

AnimationMixer, keyframe tracks, skeletal rigs, morph targets, blending, procedural motion.

---

## Animation System Overview

```
AnimationClip     — stores keyframe data (what to animate, when, to what value)
AnimationMixer    — plays clips on an object (one mixer per animated root)
AnimationAction   — controls one clip's playback (speed, weight, looping)
```

---

## AnimationMixer — Play GLTF Animations

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('character.glb', gltf => {
  const model = gltf.scene;
  scene.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const clips  = gltf.animations;

  console.log('Available clips:', clips.map(c => c.name));

  // Play by name
  const walkClip = THREE.AnimationClip.findByName(clips, 'Walk');
  const action   = mixer.clipAction(walkClip);
  action.play();

  // Store for update loop
  mixers.push(mixer);
});

// Update ALL mixers in render loop
const mixers = [];
const timer  = new THREE.Timer();   // r183+: Clock is deprecated
timer.connect(document);

renderer.setAnimationLoop((time) => {
  timer.update(time);
  const delta = timer.getDelta();
  mixers.forEach(m => m.update(delta));   // REQUIRED every frame
  renderer.render(scene, camera);
});
```

---

## AnimationAction Controls

```js
const action = mixer.clipAction(clip);

// Playback
action.play();
action.stop();
action.reset();
action.paused = true;

// Speed
action.timeScale = 1;      // 1 = normal | 2 = 2× faster | -1 = reverse
action.time = 0.5;         // jump to 0.5 s

// Loop modes
action.loop = THREE.LoopRepeat;    // default: loop forever
action.loop = THREE.LoopOnce;     // play once, stop at end
action.loop = THREE.LoopPingPong; // forward then backward
action.repetitions = 3;           // loop N times (Infinity = default)
action.clampWhenFinished = true;  // hold last frame when LoopOnce ends

// Weight (for blending)
action.weight = 1;
action.setEffectiveWeight(1);  // respects fade in/out

// Fading
action.fadeIn(0.5);   // fade in over 0.5 s
action.fadeOut(0.5);  // fade out over 0.5 s
action.reset().fadeIn(0.3).play();  // chain

// Crossfade between two actions
idleAction.crossFadeTo(walkAction, 0.5, true);
walkAction.play();

// Mixer events
mixer.addEventListener('finished', e => {
  console.log('Clip ended:', e.action.getClip().name);
  // e.g. switch to idle
  e.action.crossFadeTo(idleAction, 0.3);
  idleAction.play();
});
```

---

## Animation Blending (State Machine Pattern)

```js
class CharacterAnimator {
  constructor(model, clips) {
    this.mixer   = new THREE.AnimationMixer(model);
    this.current = null;
    this.actions = {};

    clips.forEach(clip => {
      this.actions[clip.name] = this.mixer.clipAction(clip);
    });
  }

  // Play all with weight 0, then fade target in
  init(startName) {
    Object.values(this.actions).forEach(a => {
      a.setEffectiveWeight(0);
      a.play();
    });
    this.fadeTo(startName, 0);
  }

  fadeTo(name, duration = 0.3) {
    const next = this.actions[name];
    if (!next || next === this.current) return;

    if (this.current) {
      this.current.fadeOut(duration);
    }
    next.reset().setEffectiveWeight(1).fadeIn(duration);
    this.current = next;
  }

  update(delta) {
    this.mixer.update(delta);
  }
}

// Usage
const anim = new CharacterAnimator(model, gltf.animations);
anim.init('Idle');

// On input
document.addEventListener('keydown', e => {
  if (e.key === 'w') anim.fadeTo('Walk');
});
document.addEventListener('keyup', e => {
  if (e.key === 'w') anim.fadeTo('Idle');
});

renderer.setAnimationLoop(() => {
  anim.update(timer.getDelta());
  renderer.render(scene, camera);
});
```

---

## Keyframe Tracks (custom animations)

```js
// VectorKeyframeTrack — position / scale
const posTrack = new THREE.VectorKeyframeTrack(
  '.position',          // property path on the mesh
  [0, 0.5, 1, 2],      // keyframe times (seconds)
  [
    0, 0, 0,            // t=0
    0, 2, 0,            // t=0.5
    0, 0, 0,            // t=1
    0, 0, 0,            // t=2
  ]
);

// QuaternionKeyframeTrack — rotation (always use Quaternion for rotation)
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI);
const rotTrack = new THREE.QuaternionKeyframeTrack(
  '.quaternion',
  [0, 1],
  [q0.x, q0.y, q0.z, q0.w,  q1.x, q1.y, q1.z, q1.w]
);

// NumberKeyframeTrack — single value (opacity, etc.)
const opTrack = new THREE.NumberKeyframeTrack('.material.opacity', [0, 1], [1, 0]);

// ColorKeyframeTrack
const colTrack = new THREE.ColorKeyframeTrack('.material.color', [0, 1], [
  1, 0, 0,  // red
  0, 0, 1,  // blue
]);

// Interpolation
posTrack.setInterpolation(THREE.InterpolateLinear);   // default
posTrack.setInterpolation(THREE.InterpolateSmooth);   // cubic spline
posTrack.setInterpolation(THREE.InterpolateDiscrete); // step

// Build clip
const clip = new THREE.AnimationClip('bounce', 2, [posTrack, rotTrack]);
clip.optimize(); // remove redundant keyframes

// Play
const mixer = new THREE.AnimationMixer(mesh);
mixer.clipAction(clip).setLoop(THREE.LoopRepeat).play();
```

---

## Morph Targets

```js
// Morph targets are baked into geometry during export
// Access influences (weights 0–1)
mesh.morphTargetDictionary  // { 'smile': 0, 'blink': 1, ... }
mesh.morphTargetInfluences  // [0, 0, ...] — same length as geometry morph attributes

// Set by name
function setMorph(mesh, name, value) {
  const idx = mesh.morphTargetDictionary[name];
  if (idx !== undefined) mesh.morphTargetInfluences[idx] = value;
}

setMorph(face, 'smile', 0.8);
setMorph(face, 'blink', 1.0);

// Animate morph procedurally
renderer.setAnimationLoop(() => {
  const t = timer.getElapsed();
  setMorph(face, 'smile', (Math.sin(t) + 1) / 2);
  renderer.render(scene, camera);
});

// Animate morph via AnimationClip
const track = new THREE.NumberKeyframeTrack(
  '.morphTargetInfluences[0]',  // index 0 = first morph target
  [0, 0.5, 1],
  [0, 1, 0]
);
const clip   = new THREE.AnimationClip('blink', 1, [track]);
const action = new THREE.AnimationMixer(face).clipAction(clip);
action.setLoop(THREE.LoopRepeat).play();
```

---

## Skeletal Animation — Bone Access

```js
// Find SkinnedMesh in a loaded model
let skinnedMesh;
model.traverse(child => {
  if (child.isSkinnedMesh) skinnedMesh = child;
});

const skeleton = skinnedMesh.skeleton;

// Visualise skeleton (dev only)
const helper = new THREE.SkeletonHelper(model);
scene.add(helper);

// Find bone by name
const head = skeleton.bones.find(b => b.name === 'Head');

// Procedural bone override (runs ON TOP of mixer if weight < 1)
renderer.setAnimationLoop(() => {
  const delta = timer.getDelta();
  mixer.update(delta);

  // Override head to track mouse
  if (head) {
    head.rotation.y = THREE.MathUtils.lerp(
      head.rotation.y,
      targetYaw,
      delta * 5,
    );
  }

  renderer.render(scene, camera);
});

// Attach prop to bone
const weapon = new THREE.Mesh(weaponGeo, weaponMat);
const rightHand = skeleton.bones.find(b => b.name === 'RightHand');
rightHand.add(weapon);
weapon.position.set(0, 0, 0.2);
weapon.rotation.set(0, Math.PI / 2, 0);
```

---

## Procedural Animation Patterns

```js
const timer = new THREE.Timer();
timer.connect(document);

renderer.setAnimationLoop((time) => {
  timer.update(time);
  const t  = timer.getElapsed();   // Timer reads have no side effects —
  const dt = timer.getDelta();     // with Clock, getElapsedTime() reset getDelta() to ~0

  // Sine wave bob
  mesh.position.y = Math.sin(t * 2) * 0.5;

  // Circular orbit
  mesh.position.x = Math.cos(t) * 3;
  mesh.position.z = Math.sin(t) * 3;
  mesh.lookAt(0, 0, 0);

  // Smooth follow (lerp)
  mesh.position.lerp(targetPosition, dt * 5);

  // Smooth rotation (slerp)
  mesh.quaternion.slerp(targetQuaternion, dt * 5);

  // Spring bounce
  spring.velocity += (spring.target - spring.value) * spring.stiffness * dt;
  spring.velocity  *= (1 - spring.damping * dt);
  spring.value     += spring.velocity * dt;
  mesh.position.y   = spring.value;

  renderer.render(scene, camera);
});
```

---

## Performance Tips

- Call `clip.optimize()` to remove redundant keyframes before playing
- Pause mixer when object is off-screen or far away
- Share `AnimationClip` objects across multiple mixers (same clip, different objects)
- Use `LoopOnce` + `clampWhenFinished` for one-shot effects
- Disable `SkinnedMesh.frustumCulled = false` to prevent culling pop-in