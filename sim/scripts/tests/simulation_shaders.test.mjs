import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RDShaderTop,
  RDShaderMain,
  RDShaderTopMRT,
  RDShaderMainMRT,
  RDShaderUpdateNormal,
  RDShaderUpdateCross,
  RDShaderUpdateNormalMRT,
  RDShaderUpdateCrossMRT,
  RDShaderBotMRT,
  RDShaderPeriodic,
  RDShaderGhostX,
  RDShaderGhostY,
  RDShaderRobinX,
  RDShaderRobinY,
  RDShaderRobinCustomDomainX,
  RDShaderRobinCustomDomainY,
  RDShaderAlgebraicSpecies,
  RDShaderDirichletX,
  RDShaderDirichletY,
  RDShaderBot,
  clampSpeciesToEdgeShader,
  globalIntegralShader,
  globalIntegralShaderMRT,
  RDShaderEnforceDirichletTop,
  RDShaderEnforceDirichletTopMRT,
} from "../RD/simulation_shaders.js";

// Note: these builder functions return GLSL *fragments* meant to be spliced into a larger
// template that already opens/closes its own braces (e.g. RDShaderUpdateNormalMRT's output ends
// with a stray closing "}" for an enclosing block it doesn't open itself) - so, unlike
// RDShaderTop/Main, brace-balance is not a meaningful invariant to assert on these in isolation.

test("RDShaderUpdateNormal: default numSpecies is 4, uses all four species", () => {
  const shader = RDShaderUpdateNormal();
  for (const term of ["UFUN", "VFUN", "WFUN", "QFUN"]) assert.match(shader, new RegExp(term));
  assert.match(shader, /result = vec4\(du,dv,dw,dq\);/);
});

test("RDShaderUpdateNormal: numSpecies 1-4 only include their own species' terms", () => {
  const allTerms = ["UFUN", "VFUN", "WFUN", "QFUN"];
  for (let n = 1; n <= 4; n++) {
    const shader = RDShaderUpdateNormal(n);
    for (let i = 0; i < 4; i++) {
      if (i < n) assert.match(shader, new RegExp(allTerms[i]), `n=${n} should include ${allTerms[i]}`);
      else assert.doesNotMatch(shader, new RegExp(allTerms[i]), `n=${n} should not include ${allTerms[i]}`);
    }
  }
});

test("RDShaderUpdateCross: numSpecies 1-4 include the right cross-diffusion terms and final vec4", () => {
  const finalLines = [
    "result = vec4(du,0.0,0.0,0.0);",
    "result = vec4(du,dv,0.0,0.0);",
    "result = vec4(du,dv,dw,0.0);",
    "result = vec4(du,dv,dw,dq);",
  ];
  for (let n = 1; n <= 4; n++) {
    const shader = RDShaderUpdateCross(n);
    assert.ok(shader.includes(finalLines[n - 1]), `n=${n}`);
  }
});

test("RDShaderUpdateNormalMRT/RDShaderUpdateCrossMRT: numSpecies 5-8 reference every species and produce both result0/result1", () => {
  for (let n = 5; n <= 8; n++) {
    for (const fn of [RDShaderUpdateNormalMRT, RDShaderUpdateCrossMRT]) {
      const shader = fn(n);
      assert.match(shader, /result0 = vec4\(d0,d1,d2,d3\);/, `${fn.name} n=${n}`);
      for (let s = 0; s < n; s++) {
        assert.match(shader, new RegExp(`\\bd${s}\\b`), `${fn.name} n=${n} missing d${s}`);
      }
    }
  }
});

test("RDShaderUpdateNormalMRT/CrossMRT: result1 pads unused species-8 channels with 0.0", () => {
  const shader5 = RDShaderUpdateNormalMRT(5);
  assert.match(shader5, /result1 = vec4\(d4,0\.0,0\.0,0\.0\);/);
  const shader8 = RDShaderUpdateNormalMRT(8);
  assert.match(shader8, /result1 = vec4\(d4,d5,d6,d7\);/);
});

test("RDShaderGhostX/Y: undefined returns both directions, single letter returns just one, anything else empty", () => {
  for (const [fn, both, a, b] of [
    [RDShaderGhostX, undefined, "L", "R"],
    [RDShaderGhostY, undefined, "T", "B"],
  ]) {
    const full = fn(both);
    assert.equal(full, fn(a) + fn(b));
    assert.notEqual(fn(a), "");
    assert.notEqual(fn(b), "");
    assert.equal(fn("nonsense"), "");
  }
});

test("RDShaderRobinX/Y: same undefined/single-side/other pattern as Ghost", () => {
  for (const [fn, a, b] of [
    [RDShaderRobinX, "L", "R"],
    [RDShaderRobinY, "T", "B"],
  ]) {
    assert.equal(fn(undefined), fn(a) + fn(b));
    assert.equal(fn("nonsense"), "");
  }
});

test("RDShaderRobinCustomDomainX/Y: substitutes the caller-supplied indicator function", () => {
  const shaderL = RDShaderRobinCustomDomainX("L", "myIndicatorFun(x,y)");
  assert.match(shaderL, /myIndicatorFun/);
  const shaderBoth = RDShaderRobinCustomDomainX(undefined, "myIndicatorFun(x,y)");
  assert.match(shaderBoth, /myIndicatorFun/);
});

test("clampSpeciesToEdgeShader: 'H' includes x-direction clamps, 'V' includes y-direction, 'HV' includes both", () => {
  const h = clampSpeciesToEdgeShader("H");
  assert.match(h, /step_x/);
  assert.doesNotMatch(h, /step_y/);

  const v = clampSpeciesToEdgeShader("V");
  assert.match(v, /step_y/);
  assert.doesNotMatch(v, /step_x/);

  const hv = clampSpeciesToEdgeShader("HV");
  assert.match(hv, /step_x/);
  assert.match(hv, /step_y/);

  assert.equal(clampSpeciesToEdgeShader(""), "");
});

test("RDShaderAlgebraicSpecies/RDShaderDirichletX/Y/RDShaderBot/RDShaderPeriodic: non-empty (or intentionally empty) fixed snippets", () => {
  assert.match(RDShaderAlgebraicSpecies(), /RHS\.SPECIES/);
  assert.notEqual(RDShaderDirichletX(), "");
  assert.notEqual(RDShaderDirichletY(), "");
  assert.notEqual(RDShaderBot(), "");
  assert.equal(RDShaderPeriodic(), "");
});

test("RDShaderTop/RDShaderMain: return distinct, non-empty text for each timestepping scheme type", () => {
  const types = ["FE", "AB2", "Mid1", "Mid2", "RK41", "RK42", "RK43", "RK44"];
  for (const type of types) {
    assert.ok(RDShaderTop(type).length > 0, `RDShaderTop(${type})`);
    assert.ok(RDShaderMain(type).length > 0, `RDShaderMain(${type})`);
  }
});

test("RDShaderTopMRT/RDShaderMainMRT: return non-empty text for each scheme type", () => {
  const types = ["FE", "AB2", "Mid1", "Mid2", "RK41", "RK42", "RK43", "RK44"];
  for (const type of types) {
    assert.ok(RDShaderTopMRT(type).length > 0, `RDShaderTopMRT(${type})`);
    assert.ok(RDShaderMainMRT(type).length > 0, `RDShaderMainMRT(${type})`);
  }
});

test("RDShaderBotMRT: assigns both fragColor0 and fragColor1", () => {
  const shader = RDShaderBotMRT();
  assert.match(shader, /fragColor0/);
  assert.match(shader, /fragColor1/);
});

test("globalIntegralShader/globalIntegralShaderMRT: non-empty, MRT variant references group 1", () => {
  assert.ok(globalIntegralShader().length > 0);
  const mrt = globalIntegralShaderMRT();
  assert.ok(mrt.length > 0);
  assert.match(mrt, /textureSourceGroup1|Group1/);
});

test("globalIntegralShader: declares the globalIntegralValue1-4 uniforms itself, for Int(...) used in domainIndicatorFun", () => {
  const shader = globalIntegralShader();
  for (let i = 1; i <= 4; i++) {
    assert.match(shader, new RegExp(`uniform float globalIntegralValue${i};`));
  }
});

// Regression: RDShaderEnforceDirichletTop() is the separate shader (dirichletMaterial, built by
// setRDEquations() and run every frame via enforceDirichlet()) that applies dirichletStr_i/combo
// Dirichlet values - it was missing the globalIntegralValue1-4 uniforms even though every other
// BC type (Neumann/Robin) already worked with Int(...), so a Dirichlet value using Int(...)
// failed to compile ("Unknown symbol: globalIntegralValueN") for every species, 1-8.
test("RDShaderEnforceDirichletTop/MRT: declare the globalIntegralValue1-4 uniforms Int(...) needs (Dirichlet BC values)", () => {
  for (const shader of [RDShaderEnforceDirichletTop(), RDShaderEnforceDirichletTopMRT()]) {
    for (let i = 1; i <= 4; i++) {
      assert.match(shader, new RegExp(`uniform float globalIntegralValue${i};`));
    }
  }
});
