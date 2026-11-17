/* ---- Атлас: у каждой записи своя объёмная модель, а не серая сфера-заглушка ----
   И fauna: ни один агент не получает NaN-позицию из-за чужого формата опций.

   Серая сфера (createPreviewMesh fallback) означала, что запись есть в
   энциклопедии, но модели для неё нет. Так жили 15 записей, и семь из них —
   coral_branch, sea_lily, water_lily, reed, limestone_ledge, mud_rock,
   cave_algae — к тому же генерировались биомами в мир и выбрасывались
   FloraStreamer'ом: 27,7 % флоры Красного моря и 55,3 % флоры пещер Флориды
   были невидимы. Остальные пять (рифовая акула, наполеон, мягкокрылая черепаха,
   игла-панцирник, аллигатор) плюс голожаберная улитка, подводный вулкан и
   метановый сип существовали только как текст: spawn.js не читал массивы
   predators и megafauna, а эти объекты не высаживались вовсе.

   Второй проверяемый класс — NaN в позициях агентов. Так, медузы kelp_forest и
   hydrothermal_vents описаны в плане как cx/cz/scale, а makeJelly читает
   x/z/size: все шесть медуз получали NaN и не существовали. */

import assert from 'node:assert/strict';

export function run(ctx) {
  const { T, OC } = ctx;

    const atlasBiomes = OC.Biomes.list();
    let atlasEntries = 0;
    const placeholders = [];
    for (const ab of atlasBiomes) {
      const enc = ab.encyclopedia || {};
      for (const key of Object.keys(enc)) {
        atlasEntries++;
        let model = null;
        try {
          model = OC.FaunaEngine.createPreviewMesh(key, ab);
        } catch (err) {
          placeholders.push(`${ab.id}/${key}: ${err.message}`);
          continue;
        }
        if (!model || model.userData.isAtlasPlaceholder) placeholders.push(`${ab.id}/${key}`);
        if (model) {
          // Модель обязана быть непустой и конечной: иначе в 3D-студии пустота
          let verts = 0;
          let badGeo = '';
          model.traverse((o) => {
            if (!o.isMesh || !o.geometry) return;
            const pos = o.geometry.attributes && o.geometry.attributes.position;
            if (!pos) { badGeo = 'нет позиций'; return; }
            verts += pos.count;
            for (let i = 0; i < pos.array.length; i++) {
              if (!Number.isFinite(pos.array[i])) { badGeo = 'NaN в position'; break; }
            }
          });
          assert(verts > 0 && !badGeo, `Atlas model ${ab.id}/${key} is empty or broken (${badGeo || verts + ' вершин'})`);
        }
      }
    }
    assert(atlasEntries > 250, `Atlas must cover the whole encyclopedia, got ${atlasEntries} entries`);
    assert.equal(placeholders.length, 0, `Atlas entries still falling back to the placeholder sphere: ${placeholders.join(', ')}`);
    console.log(`   Atlas: все ${atlasEntries} записей ${atlasBiomes.length} биомов имеют собственную 3D-модель (заглушек: 0).`);

    // Фауна: ни одного NaN в позициях агентов ни у одного биома
    for (const ab of atlasBiomes) {
      const fbScene = new T.Scene();
      const fbSpawn = new T.Vector3(ab.spawn.pos[0], ab.spawn.pos[1], ab.spawn.pos[2]);
      const fbFauna = OC.FaunaEngine.init(fbScene, ab);
      const spots = [fbSpawn, ...(ab.landmarks || []).slice(0, 3).map((lm) => new T.Vector3(lm.x, lm.y, lm.z))];
      for (const spot of spots) {
        for (let f = 0; f < 5; f++) {
          OC.uTime.value += 0.16;
          fbFauna.update(0.16, OC.uTime.value, spot, 2.0, true);
        }
        fbScene.traverse((o) => {
          const p = o.position;
          if (p && (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z))) {
            assert.fail(`${ab.id}: агент фауны "${(o.userData && o.userData.key) || o.type}" получил NaN-позицию — проверь формат опций в faunaPlan`);
          }
        });
      }
      // Ключи всех высаженных агентов обязаны быть в энциклопедии биома
      const fbKeys = new Set();
      fbScene.traverse((o) => { if (o.userData && o.userData.key) fbKeys.add(o.userData.key); });
      for (const k of fbKeys) {
        if (k === 'bubbles' || k === 'plankton' || k === 'marine_snow' || k === 'coral_spawn') continue;
        assert(ab.encyclopedia[k], `${ab.id}: высажен агент "${k}" без записи в энциклопедии`);
      }
      // Хищники и мегафауна из плана обязаны попасть в мир
      const plan = ab.faunaPlan || {};
      const planned = [...(plan.predators || []), ...(plan.megafauna || [])].map((p) => p.key);
      for (const k of planned) {
        assert(fbKeys.has(k), `${ab.id}: ${k} есть в faunaPlan, но не высажен — spawn.js не читает этот массив`);
      }
    }
    console.log(`   Fauna: агенты всех ${atlasBiomes.length} биомов конечны, задокументированы и высаживаются по плану.`);

}
