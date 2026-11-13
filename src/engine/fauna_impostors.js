/* ================= IMPOSTORS (BILLBOARDS ДЛЯ УДАЛЁННОЙ ФАУНЫ) ================= */
/* Когда существо дальше порога impostorDist, его 3D-меш заменяется на
   Billboard-квадрат, который всегда лицом к камере. Это экономит вершинную
   нагрузку и draw calls на больших дистанциях (>200 м), где детали модели
   всё равно неразличимы. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;

  let sceneRef = null;
  let camRef = null;

  /* Пул billboard-мешей, кэшированных по ключу вида "species:tintHex" */
  const impostorPool = new Map(); // "species:tint" -> { mesh, species, tint, inUse }
  const activeImpostors = new Map(); // agent -> { mesh, species, tint }
  const _camPos = new T.Vector3();
  const _camFwd = new T.Vector3();
  const _up = new T.Vector3(0, 1, 0);
  const _tmpVec = new T.Vector3();

  /* Дистанция переключения на impostor (и обратно с гистерезисом) */
  const IMPOSTOR_DIST_ON = 200;   // дальше 200 м -> impostor
  const IMPOSTOR_DIST_OFF = 150;   // ближе 150 м -> полная 3D-модель
  const IMPOSTOR_SIZE = 1.6;       // размер квадрата billboard

  function getImpostorKey(species, tint) {
    return species + ':' + (tint !== undefined ? tint.toString(16) : 'fff');
  }

  function createImpostor(species, tint) {
    const geo = new T.PlaneGeometry(IMPOSTOR_SIZE, IMPOSTOR_SIZE);
    const mat = new T.MeshBasicMaterial({
      color: tint !== undefined ? tint : 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: T.DoubleSide
    });
    const mesh = new T.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.userData.isImpostor = true;
    mesh.userData.species = species;
    mesh.visible = false;
    sceneRef.add(mesh);
    return { mesh, species, tint, inUse: false };
  }

  function getImpostor(species, tint) {
    const key = getImpostorKey(species, tint);
    let entry = impostorPool.get(key);
    if (!entry) {
      entry = createImpostor(species, tint);
      impostorPool.set(key, entry);
    }
    entry.inUse = true;
    return entry.mesh;
  }

  function releaseImpostor(species, tint) {
    const key = getImpostorKey(species, tint);
    const entry = impostorPool.get(key);
    if (entry) entry.inUse = false;
  }

  OC.FaunaImpostors = {
    init(scene, camera) {
      sceneRef = scene;
      camRef = camera;
      impostorPool.clear();
      activeImpostors.clear();
    },

    /* Вызывать каждый кадр с позицией и направлением камеры.
       Обновляет поворот всех активных impostor-мешей, чтобы они лицом к камере. */
    update(camPos, camFwd) {
      if (!sceneRef) return;
      _camPos.copy(camPos);
      if (camFwd) _camFwd.copy(camFwd);
      else if (camRef) camRef.getWorldDirection(_camFwd);

      activeImpostors.forEach((info, agent) => {
        const mesh = info.mesh;
        const p = agent.getPosition ? agent.getPosition() : null;
        if (!p) return;

        mesh.position.copy(p);

        /* Billboard: квадрат всегда лицом к камере, но остаётся вертикальным (Y-up).
           Используем направление камеры по XZ для поворота вокруг Y. */
        const angle = Math.atan2(_camFwd.x, _camFwd.z);
        mesh.rotation.set(0, angle, 0);

        /* Небольшой эффект удаления: чуть уменьшаем 불кость с дистанцией */
        const d = Math.hypot(p.x - camPos.x, p.z - camPos.z);
        const alpha = Math.max(0.3, Math.min(1.0, 1.0 - (d - IMPOSTOR_DIST_OFF) / 400));
        mesh.material.opacity = alpha;
      });
    },

    /* Включить/выключить impostor для агента.
       agent — объект с getPosition(); species — ключ вида; tint — цвет. */
    setImpostor(agent, enabled, species, tint) {
      const key = agent;
      if (enabled) {
        if (activeImpostors.has(key)) return; // уже активен
        const mesh = getImpostor(species, tint);
        mesh.visible = true;
        activeImpostors.set(key, { mesh, species, tint });
      } else {
        const info = activeImpostors.get(key);
        if (!info) return;
        info.mesh.visible = false;
        activeImpostors.delete(key);
        releaseImpostor(info.species, info.tint);
      }
    },

    /* Отключить все impostors (например, при смене биома) */
    clearAll() {
      activeImpostors.forEach((info) => {
        info.mesh.visible = false;
        if (sceneRef) sceneRef.remove(info.mesh);
        releaseImpostor(info.species, info.tint);
      });
      activeImpostors.clear();
      // Освобождаем весь пул
      impostorPool.forEach((entry) => {
        if (sceneRef) sceneRef.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.material.dispose();
        entry.inUse = false;
      });
      impostorPool.clear();
    },

    getStats() {
      let active = 0;
      let pooled = 0;
      impostorPool.forEach((e) => { if (e.inUse) active++; else pooled++; });
      return { active, pooled, total: impostorPool.size };
    }
  };
})(window.OC);
