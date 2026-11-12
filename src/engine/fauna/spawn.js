/* ================= ВЫСАДКА ФАУНЫ БИОМА ПО ЭКОЛОГИЧЕСКОМУ ПЛАНУ ================= */
/* Читает biome.faunaPlan и вызывает билдеры из OC._FaunaBuilders, наполняя общие
   массивы агентов: одиночные особи, стаи, хищники, цели сонара и прыгуны у поверхности.
   Возвращает китов, список китов и головное судно — их использует update-цикл. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';

  const T = THREE;

  function spawnFauna(ctx) {
    const {
      faunaGroup, biome, plan, emitSplash,
      agents, schools, predatorAgents, preySchools, sonarTargets,
      surfaceJumpers, huntingAgents
    } = ctx;

      const schoolsSpec = plan.schools || [];
      for (const s of schoolsSpec) {
        const sch = OC._FaunaBuilders.makeSchool(faunaGroup, biome, s);
        schools.push(sch);
        agents.push(sch);
        if (sch.isPredator) predatorAgents.push(sch);
        else if (sch.isPrey) preySchools.push(sch);
        sonarTargets.push(sch);
      }

      for (const sf of (plan.soloFish || [])) {
        const a = OC._FaunaBuilders.makeSoloFish(faunaGroup, biome, sf);
        agents.push(a);
      }

      for (const lf of (plan.lionfish || [])) {
        const a = OC._FaunaBuilders.makeLionfish(faunaGroup, biome, lf);
        agents.push(a);
        predatorAgents.push(a);
        sonarTargets.push(a);
      }

      for (const oct of (plan.octopus || [])) {
        agents.push(OC._FaunaBuilders.makeOctopus(faunaGroup, biome, oct));
      }

      for (const mor of (plan.moray || [])) {
        agents.push(OC._FaunaBuilders.makeMoray(faunaGroup, biome, mor));
      }

      for (const j of (plan.jellies || [])) {
        agents.push(OC._FaunaBuilders.makeJelly(faunaGroup, j));
      }

      for (const dg of (plan.dugongs || [])) {
        const a = OC._FaunaBuilders.makeDugong(faunaGroup, biome, dg);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const m of (plan.megafauna || [])) {
        if (m.key === 'florida_manatee') {
          const a = OC._FaunaBuilders.makeManatee(faunaGroup, biome, m);
          agents.push(a);
          sonarTargets.push(a);
        }
      }

      for (const cr of (plan.crustaceans || [])) {
        if (cr.key === 'cave_crayfish' || cr.key === 'blind_cave_fish') {
          const geo = OC._FaunaBuilders.makeFishGeo(cr.geoOpts || { len: 0.6, height: 0.2, width: 0.1, colA: 0x6b7280, colB: 0x9ca3af, finCol: 0x4b5563 });
          const mesh = new T.Mesh(geo, OC._FaunaCtx.creatureMat);
          mesh.scale.setScalar(cr.scale || 0.8);
          mesh.userData.key = cr.key;
          scene.add(mesh);
          const ra = new T.Vector3(), rb = new T.Vector3();
          agents.push({
            key: cr.key,
            getPosition: () => mesh.position,
            update(dt, time, camPos) {
              if (Math.hypot(cr.cx - camPos.x, cr.cz - camPos.z) > 420) { mesh.visible = false; return; }
              mesh.visible = true;
              let ang = Math.random() * 6.28;
              const rr = cr.radius + Math.sin(time * 0.5) * 3;
              const x = cr.cx + Math.cos(ang) * rr;
              const z = cr.cz + Math.sin(ang) * rr;
              const y = Math.max(biome.getHeight(x, z) + 1.0, cr.y);
              mesh.position.set(x, y, z);
              mesh.lookAt(cr.cx, cr.y, cr.cz);
            }
          });
          sonarTargets.push(agents[agents.length - 1]);
        }
      }

      for (const sl of (plan.seaLions || [])) {
        const a = OC._FaunaBuilders.makeSeaLion(faunaGroup, biome, sl, emitSplash);
        agents.push(a);
        surfaceJumpers.push(a);
        sonarTargets.push(a);
      }

      for (const tu of (plan.turtles || [])) {
        const a = OC._FaunaBuilders.makeTurtle(faunaGroup, biome, tu);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const ry of (plan.rays || [])) {
        const a = OC._FaunaBuilders.makeRay(faunaGroup, biome, ry);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const mn of (plan.mantas || [])) {
        const a = OC._FaunaBuilders.makeManta(faunaGroup, biome, mn);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const sh of (plan.sharks || [])) {
        const a = OC._FaunaBuilders.makeShark(faunaGroup, biome, sh);
        agents.push(a);
        if (a.isActivePredator) {
          predatorAgents.push(a);
          huntingAgents.push(a);
        }
        sonarTargets.push(a);
      }

      for (const angF of (plan.anglers || [])) {
        const a = OC._FaunaBuilders.makeAnglerfish(faunaGroup, biome, angF);
        agents.push(a);
        predatorAgents.push(a);
        sonarTargets.push(a);
      }

      for (const sq of (plan.squids || [])) {
        const a = OC._FaunaBuilders.makeAbyssalSquid(faunaGroup, biome, sq);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const db of (plan.dumbos || [])) {
        agents.push(OC._FaunaBuilders.makeDumboOctopus(faunaGroup, biome, db));
      }

      for (const bl of (plan.belugas || [])) {
        const a = OC._FaunaBuilders.makeBeluga(faunaGroup, biome, bl, emitSplash);
        agents.push(a);
        surfaceJumpers.push(a);
        sonarTargets.push(a);
      }

      for (const nw of (plan.narwhals || [])) {
        const a = OC._FaunaBuilders.makeNarwhal(faunaGroup, biome, nw);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const aj of (plan.arcticJellies || [])) {
        agents.push(OC._FaunaBuilders.makeArcticJelly(faunaGroup, aj));
      }

      for (const cl of (plan.cliones || [])) {
        agents.push(OC._FaunaBuilders.makeClione(faunaGroup, cl));
      }

      for (const seal of (plan.baikalSeals || [])) {
        const a = OC._FaunaBuilders.makeBaikalSeal(faunaGroup, biome, seal);
        agents.push(a);
        predatorAgents.push(a);
        huntingAgents.push(a);
        sonarTargets.push(a);
      }

      for (const seep of (plan.seepTargets || [])) {
        const p = new T.Vector3(seep.x, biome.getHeight(seep.x, seep.z) + 1.0, seep.z);
        const target = { key: 'methane_seep_baikal', getPosition: () => p, update() {} };
        agents.push(target);
        sonarTargets.push(target);
      }

      for (const wr of (plan.wrecks || [])) {
        const a = OC._FaunaBuilders.makeShipwreck(faunaGroup, biome, wr);
        agents.push(a);
        sonarTargets.push(a);
      }

      for (const hm of (plan.hammerheads || [])) {
        const a = OC._FaunaBuilders.makeHammerhead(faunaGroup, biome, hm);
        agents.push(a);
        predatorAgents.push(a);
        huntingAgents.push(a);
        sonarTargets.push(a);
      }

      for (const gj of (plan.goldenJellies || [])) {
        agents.push(OC._FaunaBuilders.makeGoldenJelly(faunaGroup, gj));
      }

      let whale = null;
      const whalesList = [];
      for (const wh of (plan.whales || [])) {
        const w = OC._FaunaBuilders.makeHumpbackWhale(faunaGroup, biome, wh, emitSplash);
        if (!whale) whale = w;
        whalesList.push(w);
        agents.push(w);
        sonarTargets.push(w);
      }

      let primaryVessel = null;
      for (const vs of (plan.vessels || [])) {
        const v = OC._FaunaBuilders.makeResearchVessel(faunaGroup, biome, vs);
        if (!primaryVessel) primaryVessel = v;
        agents.push(v);
        sonarTargets.push(v);
      }

      for (const sb of (plan.seabirds || [])) {
        agents.push(OC._FaunaBuilders.makeSeabirdFlock(faunaGroup, biome, sb, emitSplash));
      }

      for (const dl of (plan.dolphins || [])) {
        const d = OC._FaunaBuilders.makeDolphinPod(faunaGroup, biome, dl, emitSplash);
        agents.push(d);
        surfaceJumpers.push(d);
        sonarTargets.push(d);
      }

      for (const ff of (plan.flyingFish || [])) {
        agents.push(OC._FaunaBuilders.makeFlyingFishPod(faunaGroup, biome, ff, emitSplash));
      }

      for (const wf of (plan.whaleFalls || [])) {
        const wfo = OC._FaunaBuilders.makeWhaleFall(faunaGroup, biome, wf);
        agents.push(wfo);
        sonarTargets.push(wfo);
      }

      for (const sf of (plan.snailfishes || [])) {
        const sfo = OC._FaunaBuilders.makeHadalSnailfish(faunaGroup, biome, sf);
        agents.push(sfo);
        sonarTargets.push(sfo);
      }

      for (const sp of (plan.seaPigs || [])) {
        agents.push(OC._FaunaBuilders.makeSeaPig(faunaGroup, biome, sp));
      }

      for (const bl of (plan.brineLakes || [])) {
        const blo = OC._FaunaBuilders.makeBrineLake(faunaGroup, biome, bl);
        agents.push(blo);
        sonarTargets.push(blo);
      }

      for (const sph of (plan.siphonophores || [])) {
        const spho = OC._FaunaBuilders.makeSiphonophore(faunaGroup, biome, sph);
        agents.push(spho);
        sonarTargets.push(spho);
      }

      for (const orf of (plan.oarfishes || [])) {
        const orfo = OC._FaunaBuilders.makeOarfish(faunaGroup, biome, orf);
        agents.push(orfo);
        sonarTargets.push(orfo);
      }

      for (const ch of (plan.chimaeras || [])) {
        const cho = OC._FaunaBuilders.makeChimaera(faunaGroup, biome, ch);
        agents.push(cho);
        sonarTargets.push(cho);
      }

      for (const al of (plan.ariadneLines || [])) {
        const alo = OC._FaunaBuilders.makeAriadneGuideline(faunaGroup, biome, al);
        agents.push(alo);
        sonarTargets.push(alo);
      }

      for (const hc of (plan.haloclines || [])) {
        const hco = OC._FaunaBuilders.makeHaloclineLayer(faunaGroup, biome, hc);
        agents.push(hco);
        sonarTargets.push(hco);
      }

      for (const rm of (plan.remipedes || [])) {
        const rmo = OC._FaunaBuilders.makeCaveRemipede(faunaGroup, biome, rm);
        agents.push(rmo);
        sonarTargets.push(rmo);
      }

      for (const br of (plan.blindBrotulas || [])) {
        const bro = OC._FaunaBuilders.makeBlindBrotula(faunaGroup, biome, br);
        agents.push(bro);
        sonarTargets.push(bro);
      }

      for (const sf of (plan.sunfishes || [])) {
        const sfo = OC._FaunaBuilders.makeOceanSunfish(faunaGroup, biome, sf);
        agents.push(sfo);
        sonarTargets.push(sfo);
      }

      for (const ig of (plan.marineIguanas || [])) {
        const igo = OC._FaunaBuilders.makeMarineIguana(faunaGroup, biome, ig);
        agents.push(igo);
        sonarTargets.push(igo);
      }

      for (const pg of (plan.penguins || [])) {
        const pgo = OC._FaunaBuilders.makeGalapagosPenguin(faunaGroup, biome, pg, emitSplash);
        agents.push(pgo);
        surfaceJumpers.push(pgo);
        sonarTargets.push(pgo);
      }

      for (const oc of (plan.orcas || [])) {
        const oco = OC._FaunaBuilders.makeOrca(faunaGroup, biome, oc, emitSplash);
        agents.push(oco);
        predatorAgents.push(oco);
        surfaceJumpers.push(oco);
        sonarTargets.push(oco);
      }

      for (const mb of (plan.mobulas || [])) {
        const mbo = OC._FaunaBuilders.makeMobulaRay(faunaGroup, biome, mb, emitSplash);
        agents.push(mbo);
        surfaceJumpers.push(mbo);
        sonarTargets.push(mbo);
      }

      for (const pd of (plan.pinkDolphins || [])) {
        const pdo = OC._FaunaBuilders.makePinkDolphin(faunaGroup, biome, pd, emitSplash);
        agents.push(pdo);
        surfaceJumpers.push(pdo);
        sonarTargets.push(pdo);
      }

      for (const ar of (plan.arapaimas || [])) {
        const aro = OC._FaunaBuilders.makeArapaima(faunaGroup, biome, ar, emitSplash);
        agents.push(aro);
        sonarTargets.push(aro);
      }

      for (const ee of (plan.electricEels || [])) {
        const eeo = OC._FaunaBuilders.makeElectricEel(faunaGroup, biome, ee);
        agents.push(eeo);
        sonarTargets.push(eeo);
      }

      for (const rs of (plan.riverStingrays || [])) {
        const rso = OC._FaunaBuilders.makeRiverStingray(faunaGroup, biome, rs);
        agents.push(rso);
        sonarTargets.push(rso);
      }

      for (const da of (plan.darwinsArches || [])) {
        const dao = OC._FaunaBuilders.makeDarwinsArch(faunaGroup, biome, da);
        agents.push(dao);
        sonarTargets.push(dao);
      }

      for (const fm of (plan.fumaroles || [])) {
        const fmo = OC._FaunaBuilders.makeFumaroleVents(faunaGroup, biome, fm);
        agents.push(fmo);
      }

    return { whale, whalesList, primaryVessel };
  }

  OC._FaunaSpawn = { spawnFauna };
})(window.OC);
