// C) Verify GLSL onBeforeCompile shader patching on Three r128 ShaderLib.standard
import assert from 'node:assert/strict';

export function run(ctx) {
  const { OC, T } = ctx;
  function checkMaterialShader(opts, label) {
    const mat = new T.MeshStandardMaterial({ vertexColors: true });
    OC.enhanceMaterial(mat, opts);
    const sh = {
      uniforms: {},
      vertexShader: T.ShaderLib.standard.vertexShader,
      fragmentShader: T.ShaderLib.standard.fragmentShader,
    };
    mat.onBeforeCompile(sh);
    assert(sh.vertexShader.includes('vCWorld = (modelMatrix * ocWorldPos).xyz;'), `${label} vertex missing vCWorld`);
    assert(sh.vertexShader.includes('vCNormal = normalize( mat3( modelMatrix ) * ocNorm );'), `${label} vertex missing vCNormal`);
    assert(!sh.vertexShader.includes('#include <project_vertex>'), `${label} vertex left unreplaced project_vertex`);
    if (opts.swayAmp > 0) assert(sh.vertexShader.includes('attribute float aSway;'), `${label} missing aSway`);
    if (opts.fishSwim) assert(sh.vertexShader.includes('attribute vec2 aSwim;'), `${label} missing aSwim`);
    if (opts.isTerrain) {
      assert(sh.fragmentShader.includes('detFade'), 'terrain fragment missing procedural micro-detail detFade');
      assert(sh.fragmentShader.includes('strata'), 'terrain fragment missing limestone strata detail');
    }
    if (opts.bleachable) {
      assert(sh.fragmentShader.includes('uBleachable') && sh.fragmentShader.includes('uBleach'), `${label} missing coral bleaching GLSL uniforms`);
    }
    assert(sh.fragmentShader.includes('#include <fog_fragment>'), `${label} fragment must preserve fog_fragment after caustics`);
    assert(sh.fragmentShader.indexOf('uCausticTex') < sh.fragmentShader.indexOf('#include <fog_fragment>'), `${label} caustics must run before fog`);
    if ((opts.causticStrength === undefined || opts.causticStrength > 0)) {
      assert(sh.fragmentShader.includes('uSunProj') && sh.fragmentShader.includes('causRGB'), `${label} missing chromatic sun-projected caustics`);
    }
  }

  checkMaterialShader({ causticStrength: 1.0, isTerrain: true }, 'terrain');
  checkMaterialShader({ causticStrength: 0.92, swayAmp: 0, bleachable: true }, 'coralRigid');
  checkMaterialShader({ causticStrength: 0.78, swayAmp: 0.42, bleachable: true }, 'coralSoftSway');
  checkMaterialShader({ causticStrength: 0.45, fishSwim: true }, 'fishInstanced');
  console.log('   GLSL shader patching verified for terrain, rigid corals, swaying flora, and GPU-swimming fish.');
  return { checkMaterialShader };
}
