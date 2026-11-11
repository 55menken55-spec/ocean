# Interaction Reference

## Contents

- Raycasting — Click to Select Object
- Hover Highlight Pattern
- DragControls
- Pointer Events on DOM Overlay (2D UI over 3D)
- CSS2DRenderer / CSS3DRenderer — HTML Labels in 3D
- TransformControls — Move/Rotate/Scale Objects
- Touch / Mobile Pointer Events
- Raycaster Tips

Raycasting, object picking, drag-and-drop, hover, pointer events in 3D.

---

## Raycasting — Click to Select Object

```js
const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();

// Update pointer on mouse move
renderer.domElement.addEventListener('mousemove', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
});

// Pick on click
renderer.domElement.addEventListener('click', () => {
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(scene.children, true); // true = recursive

  if (hits.length > 0) {
    const hit    = hits[0]; // closest
    const object = hit.object;
    const point  = hit.point;   // world-space intersection point
    const normal = hit.face?.normal; // face normal (object space)
    const dist   = hit.distance;

    console.log('Clicked:', object.name, 'at distance', dist);
    object.material.color.set(0xff0000); // highlight
  }
});
```

---

## Hover Highlight Pattern

```js
let hoveredObject = null;
const originalColors = new WeakMap();

renderer.domElement.addEventListener('mousemove', () => {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickableObjects, true);

  const newHovered = hits.length > 0 ? hits[0].object : null;

  if (newHovered !== hoveredObject) {
    // Restore previous
    if (hoveredObject) {
      hoveredObject.material.color.copy(originalColors.get(hoveredObject));
      hoveredObject = null;
    }
    // Highlight new
    if (newHovered && newHovered.material) {
      originalColors.set(newHovered, newHovered.material.color.clone());
      newHovered.material.color.set(0xffaa00);
      hoveredObject = newHovered;
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'default';
    }
  }
});
```

---

## DragControls

```js
import { DragControls } from 'three/addons/controls/DragControls.js';

const draggable = [mesh1, mesh2, mesh3];
const drag = new DragControls(draggable, camera, renderer.domElement);

// Pause orbit controls while dragging
drag.addEventListener('dragstart', () => { controls.enabled = false; });
drag.addEventListener('dragend',   () => { controls.enabled = true; });

// Constrain drag to a plane
drag.addEventListener('drag', e => {
  e.object.position.y = 0; // lock y to ground
});
```

---

## Pointer Events on DOM Overlay (2D UI over 3D)

```js
// HTML overlay for labels, tooltips, HUD
const labelDiv = document.createElement('div');
labelDiv.className = 'label';
document.body.appendChild(labelDiv);

// Convert 3D world position to 2D screen position
function worldToScreen(worldPos, camera) {
  const pos = worldPos.clone().project(camera);
  return {
    x: ( pos.x * 0.5 + 0.5) * window.innerWidth,
    y: (-pos.y * 0.5 + 0.5) * window.innerHeight,
  };
}

renderer.setAnimationLoop(() => {
  const screen = worldToScreen(mesh.position, camera);
  labelDiv.style.transform = `translate(${screen.x}px, ${screen.y}px)`;
  renderer.render(scene, camera);
});
```

---

## CSS2DRenderer / CSS3DRenderer — HTML Labels in 3D

```js
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none'; // allow clicks through
document.body.appendChild(labelRenderer.domElement);

// Create a label
const div = document.createElement('div');
div.className = 'label';
div.textContent = 'Hello 3D!';
const label = new CSS2DObject(div);
label.position.set(0, 1, 0); // above mesh
mesh.add(label);

// Resize
window.addEventListener('resize', () => {
  labelRenderer.setSize(innerWidth, innerHeight);
});

// Render in loop (after main renderer)
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera); // ← also render labels
});
```

---

## TransformControls — Move/Rotate/Scale Objects

```js
import { TransformControls } from 'three/addons/controls/TransformControls.js';

const gizmo = new TransformControls(camera, renderer.domElement);
gizmo.attach(selectedMesh);
gizmo.setMode('translate'); // 'rotate' | 'scale'
scene.add(gizmo);

// Prevent OrbitControls from interfering
gizmo.addEventListener('dragging-changed', e => {
  orbitControls.enabled = !e.value;
});

// Switch mode with keyboard
window.addEventListener('keydown', e => {
  if (e.key === 'g') gizmo.setMode('translate');
  if (e.key === 'r') gizmo.setMode('rotate');
  if (e.key === 's') gizmo.setMode('scale');
  if (e.key === 'Escape') gizmo.detach();
});
```

---

## Touch / Mobile Pointer Events

```js
// Use 'pointerdown' instead of 'mousedown' for cross-device support
renderer.domElement.addEventListener('pointerdown', e => {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickable, true);
  if (hits.length) onHit(hits[0]);
});
```

---

## Raycaster Tips

```js
// Limit what's raycasted for performance
const pickable = [mesh1, mesh2]; // only test these
raycaster.intersectObjects(pickable, false); // false = non-recursive (faster)

// Set precision for lines and points
raycaster.params.Line.threshold = 0.1;
raycaster.params.Points.threshold = 0.1;

// Check only near/far range
raycaster.near = 0;
raycaster.far  = 100;

// Ray from arbitrary point+direction (not mouse)
raycaster.set(origin, direction.normalize());
const hits = raycaster.intersectObject(terrain);
```