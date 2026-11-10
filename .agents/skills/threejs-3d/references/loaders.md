# Loaders Reference

## Contents

- GLTF / GLB (primary 3D format)
- GLTF + DRACO Compression
- GLTF + KTX2 Compressed Textures
- GLTF + DRACO + KTX2 (production optimal)
- Async / Promise Loading (recommended pattern)
- LoadingManager (progress tracking)
- Other Formats
- Loading from ArrayBuffer / Blob / Data URL
- Error Handling & Retry
- Asset Manager (caching + disposal)

GLTF/GLB, DRACO, OBJ, FBX, textures, HDR, async loading, LoadingManager.

---

## GLTF / GLB (primary 3D format)

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

loader.load(
  'model.glb',
  gltf => {                           // onLoad
    const model = gltf.scene;
    scene.add(model);

    // Enable shadows on all meshes
    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
        // Fix color space for PBR maps (r149+ does this automatically)
        if (child.material.map) {
          child.material.map.colorSpace = THREE.SRGBColorSpace;
        }
      }
    });

    // Center and normalize scale
    const box    = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    model.position.sub(center);
    model.scale.setScalar(1 / Math.max(size.x, size.y, size.z));

    // Access animations
    const clips = gltf.animations;
  },
  xhr => { console.log((xhr.loaded / xhr.total * 100).toFixed(1) + '% loaded'); },
  err => { console.error('GLTF load error:', err); }
);
```

## GLTF + DRACO Compression

Draco reduces geometry size by 70–90%.

```js
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
draco.preload();  // start downloading decoder early

const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

loader.load('compressed-model.glb', gltf => scene.add(gltf.scene));
```

## GLTF + KTX2 Compressed Textures

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const ktx2 = new KTX2Loader()
  .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/libs/basis/')
  .detectSupport(renderer);

const loader = new GLTFLoader();
loader.setKTX2Loader(ktx2);

loader.load('model-ktx2.glb', gltf => scene.add(gltf.scene));
```

## GLTF + DRACO + KTX2 (production optimal)

```js
const draco = new DRACOLoader()
  .setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

const ktx2 = new KTX2Loader()
  .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.182.0/examples/jsm/libs/basis/')
  .detectSupport(renderer);

const loader = new GLTFLoader()
  .setDRACOLoader(draco)
  .setKTX2Loader(ktx2);
```

---

## Async / Promise Loading (recommended pattern)

```js
// Promisify any Three.js loader
function promiseLoader(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

// Specific helpers
const gltfLoader    = new GLTFLoader().setDRACOLoader(draco);
const textureLoader = new THREE.TextureLoader();
const rgbeLoader    = new RGBELoader();

const loadGLTF    = url => promiseLoader(gltfLoader, url);
const loadTexture = (url, cs = THREE.LinearSRGBColorSpace) =>
  promiseLoader(textureLoader, url).then(t => { t.colorSpace = cs; return t; });
const loadHDR     = url => promiseLoader(rgbeLoader, url);

// Load everything in parallel
async function loadScene() {
  const [character, environment, albedo] = await Promise.all([
    loadGLTF('character.glb'),
    loadHDR('studio.hdr'),
    loadTexture('ground_albedo.jpg', THREE.SRGBColorSpace),
  ]);

  // Set up environment
  const pmrem  = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(environment).texture;
  scene.environment = envMap;
  environment.dispose();
  pmrem.dispose();

  scene.add(character.scene);
  groundMat.map = albedo;
  groundMat.needsUpdate = true;
}
```

---

## LoadingManager (progress tracking)

```js
const manager = new THREE.LoadingManager(
  () => {                                     // onLoad — ALL assets done
    document.getElementById('loader').style.display = 'none';
    startExperience();
  },
  (url, loaded, total) => {                  // onProgress
    const pct = Math.round(loaded / total * 100);
    document.getElementById('progress').style.width = pct + '%';
  },
  url => console.error('Failed to load:', url) // onError
);

// Pass manager to every loader
const textureLoader = new THREE.TextureLoader(manager);
const gltfLoader    = new GLTFLoader(manager);
const rgbeLoader    = new RGBELoader(manager);

// THREE.Cache speeds up repeated loads of same URL
THREE.Cache.enabled = true;
```

---

## Other Formats

```js
// OBJ + MTL
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

const mtlLoader = new MTLLoader();
mtlLoader.load('model.mtl', mats => {
  mats.preload();
  new OBJLoader().setMaterials(mats).load('model.obj', obj => scene.add(obj));
});

// FBX
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
const fbxLoader = new FBXLoader();
fbxLoader.load('model.fbx', fbx => {
  fbx.scale.setScalar(0.01);   // FBX is often in cm, not meters
  scene.add(fbx);
  // Animations in fbx.animations
});

// STL
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
new STLLoader().load('model.stl', geo => {
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial()));
});

// HDR environment
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
new RGBELoader().load('env.hdr', tex => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = tex;
  scene.background  = tex;
});

// EXR
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
new EXRLoader().load('env.exr', tex => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = tex;
});
```

---

## Loading from ArrayBuffer / Blob / Data URL

```js
// From fetch (avoid CORS issues)
const response = await fetch('model.glb');
const buffer   = await response.arrayBuffer();
const gltf     = await new Promise((res, rej) =>
  loader.parse(buffer, '', res, rej)
);
scene.add(gltf.scene);

// From user file input
fileInput.addEventListener('change', async e => {
  const file   = e.target.files[0];
  const buffer = await file.arrayBuffer();
  const gltf   = await new Promise((res, rej) => loader.parse(buffer, '', res, rej));
  scene.add(gltf.scene);
});

// From Blob URL
const url = URL.createObjectURL(blob);
loader.load(url, gltf => {
  URL.revokeObjectURL(url); // revoke after load
  scene.add(gltf.scene);
});
```

---

## Error Handling & Retry

```js
async function loadWithRetry(url, maxAttempts = 3, delayMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await loadGLTF(url);
    } catch (err) {
      console.warn(`Load attempt ${i + 1} failed:`, err);
      if (i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw new Error(`Failed to load ${url} after ${maxAttempts} attempts`);
}

async function loadWithFallback(primaryUrl, fallbackUrl) {
  try {
    return await loadGLTF(primaryUrl);
  } catch {
    console.warn('Primary failed, trying fallback');
    return loadGLTF(fallbackUrl);
  }
}
```

---

## Asset Manager (caching + disposal)

```js
class AssetManager {
  constructor() {
    this._gltfCache   = new Map();
    this._texCache    = new Map();
    this._gltfLoader  = new GLTFLoader().setDRACOLoader(draco);
    this._texLoader   = new THREE.TextureLoader();
  }

  async loadGLTF(key, url) {
    if (!this._gltfCache.has(key)) {
      const gltf = await promiseLoader(this._gltfLoader, url);
      this._gltfCache.set(key, gltf);
    }
    return this._gltfCache.get(key);
  }

  async loadTexture(key, url, colorSpace = THREE.SRGBColorSpace) {
    if (!this._texCache.has(key)) {
      const tex = await promiseLoader(this._texLoader, url);
      tex.colorSpace = colorSpace;
      this._texCache.set(key, tex);
    }
    return this._texCache.get(key);
  }

  dispose() {
    this._texCache.forEach(t => t.dispose());
    this._texCache.clear();
    this._gltfCache.clear();
  }
}
```