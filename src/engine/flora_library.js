/* ================= БИБЛИОТЕКА ПРОТОТИПОВ ФЛОРА: МАТЕРИАЛЫ И РЕЕСТР ================= */
/* Сами геометрии вынесены в engine/flora/*.js (7 тематических модулей) и публикуются
   через OC._FloraBuilders. Здесь остаются материалы, бюджеты инстансов и реестр видов. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const B = () => (typeof OC._FloraBuilders === 'object' ? OC._FloraBuilders : {});

  function need(name) {
    const fn = B()[name];
    if (!fn) throw new Error('FloraLibrary: geometry builder "' + name + '" is not loaded');
    return fn;
  }

  /* ---------- Реестр прототипов ---------- */
  let previewCache = null;

  OC.FloraLibrary = {
    create(skipEnhance) {
      const rng = OC.mulberry32(99107);
      const enh = (!skipEnhance && OC.enhanceMaterial) ? OC.enhanceMaterial : ((m) => m);

      const matRigid = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.85, metalness: 0.02, side: T.DoubleSide
      }), { causticStrength: 0.92, swayAmp: 0 });

      const matCoralRigid = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.85, metalness: 0.02, side: T.DoubleSide
      }), { causticStrength: 0.92, swayAmp: 0, bleachable: true });

      const matChimney = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.72, metalness: 0.28, side: T.DoubleSide
      }), { causticStrength: 0.0, swayAmp: 0 });

      const matHydrate = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.28, metalness: 0.06,
        emissive: new T.Color(0x4a3108), emissiveIntensity: 0.42, side: T.DoubleSide
      }), { causticStrength: 0.0, swayAmp: 0 });

      const matClam = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.42, metalness: 0.12, side: T.DoubleSide
      }), { causticStrength: 1.0, swayAmp: 0 });

      const matSoft = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.82, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.78, swayAmp: 0.42 });

      const matCoralSoft = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.82, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.78, swayAmp: 0.42, bleachable: true });

      const matPlant = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.78, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.88, swayAmp: 0.85 });

      const matFoliage = enh(new T.MeshStandardMaterial({
        vertexColors: true, roughness: 0.72, metalness: 0.0, side: T.DoubleSide
      }), { causticStrength: 0.0, swayAmp: 0.48 });

      const matIce = enh(new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.34,
        metalness: 0.08,
        emissive: new T.Color(0x0c3452),
        emissiveIntensity: 0.38,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
        side: T.DoubleSide
      }), { causticStrength: 0.52, swayAmp: 0 });

      const prototypes = {
        coral_staghorn: {
          mat: matCoralRigid, maxInstances: 2000, cullDist: 460,
          geos: [need('buildStaghorn')(0.94, rng), need('buildStaghorn')(0.55, rng), need('buildStaghorn')(0.76, rng), need('buildStaghorn')(0.11, rng)]
        },
        coral_table: {
          mat: matCoralRigid, maxInstances: 1700, cullDist: 560,
          geos: [need('buildTable')(0.09, rng), need('buildTable')(0.44, rng), need('buildTable')(0.86, rng), need('buildTable')(0.96, rng)]
        },
        coral_brain: {
          mat: matCoralRigid, maxInstances: 1600, cullDist: 440,
          geos: [need('buildBrain')(0.14, rng), need('buildBrain')(0.24, rng), need('buildBrain')(0.95, rng)]
        },
        coral_bommie: {
          mat: matCoralRigid, maxInstances: 520, cullDist: 640,
          geos: [need('buildBommie')(0.11, rng), need('buildBommie')(0.48, rng)]
        },
        coral_plate: {
          mat: matCoralRigid, maxInstances: 1050, cullDist: 480,
          geos: [need('buildPlateCoral')(0.08, rng), need('buildPlateCoral')(0.82, rng)]
        },
        coral_crust: {
          mat: matCoralRigid, maxInstances: 2400, cullDist: 230,
          geos: [need('buildCrustCoral')(0.94, rng), need('buildCrustCoral')(0.09, rng), need('buildCrustCoral')(0.76, rng)]
        },
        coral_fan: {
          mat: matCoralSoft, maxInstances: 980, cullDist: 460,
          geos: [need('buildSeaFan')(0.88, rng), need('buildSeaFan')(0.02, rng), need('buildSeaFan')(0.74, rng)]
        },
        coral_soft: {
          mat: matCoralSoft, maxInstances: 980, cullDist: 420,
          geos: [need('buildSoftCoral')(0.91, rng), need('buildSoftCoral')(0.78, rng), need('buildSoftCoral')(0.07, rng)]
        },
        coral_black: {
          mat: matSoft, maxInstances: 650, cullDist: 420,
          geos: [need('buildBlackCoral')(rng), need('buildBlackCoral')(rng)]
        },
        crinoid: {
          mat: matSoft, maxInstances: 1100, cullDist: 230,
          geos: [need('buildCrinoid')(0.11, rng), need('buildCrinoid')(0.96, rng), need('buildCrinoid')(0.78, rng)]
        },
        sponge_tube: {
          mat: matRigid, maxInstances: 700, cullDist: 420,
          geos: [need('buildTubeSponge')(0.05, 0.13, rng), need('buildTubeSponge')(0.78, 0.88, rng)]
        },
        sponge_barrel: {
          mat: matRigid, maxInstances: 650, cullDist: 480,
          geos: [need('buildBarrelSponge')(0.06, rng), need('buildBarrelSponge')(0.84, rng)]
        },
        anemone: {
          mat: matCoralSoft, maxInstances: 900, cullDist: 340,
          geos: [need('buildAnemone')(0.74, 0.92, rng), need('buildAnemone')(0.58, 0.50, rng), need('buildAnemone')(0.95, 0.08, rng)]
        },
        giant_clam: {
          mat: matClam, maxInstances: 760, cullDist: 310,
          geos: [need('buildGiantClam')(0.56, rng), need('buildGiantClam')(0.78, rng)]
        },
        seagrass: {
          mat: matPlant, maxInstances: 2600, cullDist: 290,
          geos: [need('buildSeagrass')(0.24, rng), need('buildSeagrass')(0.28, rng)]
        },
        kelp: {
          mat: matPlant, maxInstances: 520, cullDist: 480,
          geos: [need('buildKelp')(0.14, rng), need('buildKelp')(0.18, rng)]
        },
        mangrove: {
          mat: matSoft, maxInstances: 1150, cullDist: 680,
          geos: [need('buildMangrove')(rng), need('buildMangrove')(rng)]
        },
        island_palm: {
          mat: matFoliage, maxInstances: 180, cullDist: 920,
          geos: [need('buildIslandPalm')(rng), need('buildIslandPalm')(rng)]
        },
        urchin: {
          mat: matRigid, maxInstances: 650, cullDist: 190,
          geos: [need('buildUrchin')()]
        },
        starfish_blue: {
          mat: matRigid, maxInstances: 480, cullDist: 190,
          geos: [need('buildStarfish')(5, 0.58, false)]
        },
        starfish_cots: {
          mat: matRigid, maxInstances: 480, cullDist: 210,
          geos: [need('buildStarfish')(11, 0.94, true)]
        },
        shell_triton: {
          mat: matClam, maxInstances: 440, cullDist: 190,
          geos: [need('buildTritonShell')()]
        },
        kelp_giant: {
          mat: matPlant, maxInstances: 1100, cullDist: 640,
          geos: [need('buildGiantKelp')(0.0, rng), need('buildGiantKelp')(0.03, rng)]
        },
        urchin_purple: {
          mat: matRigid, maxInstances: 800, cullDist: 300,
          geos: [need('buildPurpleUrchin')()]
        },
        starfish_ochre: {
          mat: matRigid, maxInstances: 520, cullDist: 300,
          geos: [need('buildStarfish')(5, 0.07, false), need('buildStarfish')(5, 0.82, false)]
        },
        anemone_giant_green: {
          mat: matCoralSoft, maxInstances: 620, cullDist: 380,
          geos: [need('buildAnemone')(0.38, 0.28, rng), need('buildAnemone')(0.44, 0.34, rng)]
        },
        vent_chimney: {
          mat: matChimney, maxInstances: 320, cullDist: 620,
          geos: [need('buildVentChimney')(rng), need('buildVentChimney')(rng)]
        },
        riftia_worms: {
          mat: matSoft, maxInstances: 960, cullDist: 420,
          geos: [need('buildRiftiaWorms')(rng), need('buildRiftiaWorms')(rng)]
        },
        vent_mussels: {
          mat: matRigid, maxInstances: 880, cullDist: 360,
          geos: [need('buildVentMussels')(rng)]
        },
        ice_floe: {
          mat: matIce, maxInstances: 520, cullDist: 920,
          geos: [need('buildIceFloe')(rng), need('buildIceFloe')(rng), need('buildIceFloe')(rng)]
        },
        iceberg: {
          mat: matIce, maxInstances: 160, cullDist: 1080,
          geos: [need('buildIceberg')(rng), need('buildIceberg')(rng)]
        },
        brinicle: {
          mat: matIce, maxInstances: 220, cullDist: 440,
          geos: [need('buildBrinicle')(rng), need('buildBrinicle')(rng)]
        },
        kelp_arctic: {
          mat: matPlant, maxInstances: 1400, cullDist: 460,
          geos: [need('buildArcticKelp')(rng), need('buildArcticKelp')(rng)]
        },
        coral_arctic_soft: {
          mat: matCoralSoft, maxInstances: 900, cullDist: 360,
          geos: [need('buildArcticSoftCoral')(rng), need('buildArcticSoftCoral')(rng)]
        },
        anemone_arctic: {
          mat: matCoralSoft, maxInstances: 620, cullDist: 360,
          geos: [need('buildAnemone')(0.02, 0.96, rng), need('buildAnemone')(0.06, 0.92, rng)]
        },
        sargassum: {
          mat: matPlant, maxInstances: 1500, cullDist: 520,
          geos: [need('buildSargassum')(rng), need('buildSargassum')(rng)]
        },
        wreck_anchor: {
          mat: matRigid, maxInstances: 160, cullDist: 540,
          geos: [need('buildWreckAnchor')(rng), need('buildWreckAnchor')(rng)]
        },
        coral_whip: {
          mat: matCoralSoft, maxInstances: 900, cullDist: 460,
          geos: [need('buildWhipCoral')(0.07, rng), need('buildWhipCoral')(0.13, rng)]
        },
        seafan_gold: {
          mat: matCoralSoft, maxInstances: 700, cullDist: 520,
          geos: [need('buildGoldSeaFan')(rng), need('buildGoldSeaFan')(rng)]
        },
        osedax_plume: {
          mat: matSoft, maxInstances: 960, cullDist: 420,
          geos: [need('buildOsedaxPlume')(rng), need('buildOsedaxPlume')(rng)]
        },
        hadal_sponge: {
          mat: matSoft, maxInstances: 780, cullDist: 440,
          geos: [need('buildHadalSponge')(rng), need('buildHadalSponge')(rng)]
        },
        serpentinite_vent: {
          mat: matChimney, maxInstances: 320, cullDist: 620,
          geos: [need('buildSerpentiniteVent')(rng), need('buildSerpentiniteVent')(rng)]
        },
        methane_hydrate: {
          mat: matHydrate, maxInstances: 520, cullDist: 500,
          geos: [need('buildMethaneHydrate')(rng), need('buildMethaneHydrate')(rng)]
        },
        cold_tubeworm: {
          mat: matSoft, maxInstances: 960, cullDist: 440,
          geos: [need('buildColdTubeworm')(rng), need('buildColdTubeworm')(rng)]
        },
        halite_spire: {
          mat: matIce, maxInstances: 540, cullDist: 560,
          geos: [need('buildHaliteSpire')(rng), need('buildHaliteSpire')(rng)]
        },
        stalactite: {
          mat: matRigid, maxInstances: 1100, cullDist: 460,
          geos: [need('buildStalactite')(rng), need('buildStalactite')(rng), need('buildStalactite')(rng)]
        },
        stalagmite: {
          mat: matRigid, maxInstances: 1000, cullDist: 460,
          geos: [need('buildStalagmite')(rng), need('buildStalagmite')(rng), need('buildStalagmite')(rng)]
        },
        cenote_vine: {
          mat: matSoft, maxInstances: 320, cullDist: 520,
          geos: [need('buildCenoteVine')(rng), need('buildCenoteVine')(rng)]
        },
        volcanic_fumarole: {
          mat: matChimney, maxInstances: 260, cullDist: 560,
          geos: [need('buildVolcanicFumarole')(rng), need('buildVolcanicFumarole')(rng)]
        },
        tubastraea_coral: {
          mat: matCoralRigid, maxInstances: 1000, cullDist: 440,
          geos: [need('buildTubastraeaCoral')(rng), need('buildTubastraeaCoral')(rng)]
        },
        galapagos_barnacle: {
          mat: matClam, maxInstances: 900, cullDist: 400,
          geos: [need('buildGalapagosBarnacle')(rng), need('buildGalapagosBarnacle')(rng)]
        },
        ulva_turf: {
          mat: matPlant, maxInstances: 1400, cullDist: 420,
          geos: [need('buildUlvaTurf')(rng), need('buildUlvaTurf')(rng)]
        },
        igapo_tree: {
          mat: matFoliage, maxInstances: 520, cullDist: 640,
          geos: [need('buildIgapoTree')(rng), need('buildIgapoTree')(rng)]
        },
        victoria_lily: {
          mat: matFoliage, maxInstances: 620, cullDist: 520,
          geos: [need('buildVictoriaLily')(rng), need('buildVictoriaLily')(rng)]
        },
        amazon_sword: {
          mat: matPlant, maxInstances: 1200, cullDist: 420,
          geos: [need('buildAmazonSword')(rng), need('buildAmazonSword')(rng)]
        },
        sunken_log: {
          mat: matRigid, maxInstances: 680, cullDist: 480,
          geos: [need('buildSunkenLog')(rng), need('buildSunkenLog')(rng)]
        },
        driftwood_snag: {
          mat: matRigid, maxInstances: 780, cullDist: 460,
          geos: [need('buildDriftwoodSnag')(rng), need('buildDriftwoodSnag')(rng)]
        },
        baikal_sponge: {
          mat: matSoft, maxInstances: 1100, cullDist: 430,
          geos: [need('buildBaikalSponge')(rng), need('buildBaikalSponge')(rng)]
        },
        charophyte_bed: {
          mat: matPlant, maxInstances: 1450, cullDist: 360,
          geos: [need('buildCharophyteBed')(rng), need('buildCharophyteBed')(rng)]
        }
      };

      return prototypes;
    },

    getPreviewGeo(key) {
      if (!previewCache) previewCache = this.create(true);
      const p = previewCache[key];
      if (!p || !p.geos || !p.geos.length) return null;
      p.geos[0].userData.sharedPreview = true;
      return {
        geo: p.geos[0],
        roughness: p.mat ? p.mat.roughness : 0.72,
        metalness: p.mat ? p.mat.metalness : 0.05,
        emissive: p.mat && p.mat.emissive ? p.mat.emissive.getHex() : 0x000000,
        emissiveIntensity: p.mat ? (p.mat.emissiveIntensity || 0) : 0
      };
    }
  };
})(window.OC);
