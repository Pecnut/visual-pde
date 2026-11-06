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
  RDShaderDirichletForStage,
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

test("clampSpeciesToEdgeShader: every neighbour, including LL/RR/TT/BB, gets its clamped value", () => {
  // Run the shader as JS on each node of an n x m grid whose neighbours were fetched with
  // wrapping, and check it leaves every neighbour as the node at the clamped index.
  const n = 6;
  const m = 5;
  const code = clampSpeciesToEdgeShader("HV").replaceAll(".SPECIES", "");
  const run = new Function(
    "textureCoords",
    "step_x",
    "step_y",
    "uvwq",
    "uvwqL",
    "uvwqR",
    "uvwqT",
    "uvwqB",
    "uvwqLL",
    "uvwqRR",
    "uvwqTT",
    "uvwqBB",
    `${code}; return {uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB};`,
  );
  const value = (i, j) => 100 * j + i;
  const wrap = (k, len) => ((k % len) + len) % len;
  const clamp = (k, len) => Math.min(Math.max(k, 0), len - 1);
  const offsets = { L: [-1, 0], R: [1, 0], T: [0, 1], B: [0, -1], LL: [-2, 0], RR: [2, 0], TT: [0, 2], BB: [0, -2] };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const at = (f, [di, dj]) => value(f(i + di, n), f(j + dj, m));
      const out = run(
        { x: (i + 0.5) / n, y: (j + 0.5) / m },
        1 / n,
        1 / m,
        value(i, j),
        ...["L", "R", "T", "B", "LL", "RR", "TT", "BB"].map((d) => at(wrap, offsets[d])),
      );
      for (const d of Object.keys(offsets)) {
        assert.equal(out["uvwq" + d], at(clamp, offsets[d]), `node (${i}, ${j}), neighbour ${d}`);
      }
    }
  }
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

// The algebraic-species block (RDShaderAlgebraicSpecies, and its groupified copy for species
// 5-8) is appended after every scheme stage and reads timescales/timescalesGroup1, so every
// stage must declare them or the shader fails to compile.
test("RDShaderMain/RDShaderMainMRT: every scheme stage declares the timescales the algebraic block reads", () => {
  const types = ["FE", "AB2", "Mid1", "Mid2", "RK41", "RK42", "RK43", "RK44"];
  for (const type of types) {
    assert.match(RDShaderMain(type), /vec4 timescales = TIMESCALES;/, `RDShaderMain(${type})`);
    const mrt = RDShaderMainMRT(type);
    assert.match(mrt, /vec4 timescales = TIMESCALES;/, `RDShaderMainMRT(${type})`);
    assert.match(mrt, /vec4 timescalesGroup1 = TIMESCALESGROUP1;/, `RDShaderMainMRT(${type})`);
  }
});

// Midpoint/RK4 stage slopes are combined into intermediate states (u + c*dt*k), so they must
// be du/dt itself, i.e. RHS divided by the timescales, or those schemes lose their order of
// accuracy whenever a timescale isn't 1.
test("RDShaderMain/RDShaderMainMRT: Midpoint/RK4 stage slopes are divided by the timescales", () => {
  for (const type of ["Mid1", "RK41", "RK42", "RK43"]) {
    assert.match(RDShaderMain(type), /updated = RHS \/ timescales;/, `RDShaderMain(${type})`);
    const mrt = RDShaderMainMRT(type);
    assert.match(mrt, /updated = RHS \/ timescales;/, `RDShaderMainMRT(${type})`);
    assert.match(mrt, /updated2 = RHS2 \/ timescalesGroup1;/, `RDShaderMainMRT(${type})`);
  }
  // RK44 undoes the division on the stored slopes so the final update divides only once.
  assert.match(RDShaderMain("RK44"), /RHS = \(timescales \* \(texture2D\(textureSource1/);
  assert.match(RDShaderMainMRT("RK44"), /RHS = \(timescales \* \(texture2D\(textureSource1,/);
  assert.match(RDShaderMainMRT("RK44"), /RHS2 = \(timescalesGroup1 \* \(texture2D\(textureSource1Group1/);
});

// computeRHS takes the time explicitly (shadowing the uniform t), so that AB2 can evaluate
// its previous RHS at the previous time rather than the current one.
test("RDShaderTop/RDShaderMain (+MRT): computeRHS takes the time, and AB2's previous RHS uses t - dt", () => {
  assert.match(RDShaderTop("FE"), /void computeRHS\(sampler2D textureSource, float t,/);
  assert.match(RDShaderTopMRT("FE"), /void computeRHS\(sampler2D textureSource, float t,/);
  const types = ["FE", "AB2", "Mid1", "Mid2", "RK41", "RK42", "RK43", "RK44"];
  for (const type of types) {
    for (const main of [RDShaderMain(type), RDShaderMainMRT(type)]) {
      const calls = [...main.matchAll(/computeRHS\(\w+, ([^,]+),/g)].map((m) => m[1]);
      const expected = type == "AB2" ? ["t", "t - dt"] : ["t"];
      assert.deepEqual(calls, expected, type);
    }
  }
});

test("RDShaderDirichletForStage: no Dirichlet code means no wrapper", () => {
  assert.equal(RDShaderDirichletForStage("RK41", " \n "), "");
});

test("RDShaderDirichletForStage: boundary values are evaluated at the time of the state each pass produces", () => {
  const offsets = { FE: "dt", AB2: "dt", Mid1: "0.5*dt", Mid2: "0.5*dt", RK41: "0.5*dt", RK42: "0.0", RK43: "0.5*dt", RK44: "0.0" };
  for (const [type, offset] of Object.entries(offsets)) {
    const shader = RDShaderDirichletForStage(type, "updated.r = g;");
    assert.ok(shader.includes(`float tDirichlet = t + ${offset};`), type);
    assert.match(shader, /\{\s*float t = tDirichlet;\s*updated\.r = g;\s*\}/, type);
  }
});

test("RDShaderDirichletForStage: stage-slope passes apply the condition to the intermediate state and recover the slope", () => {
  const coefficients = { Mid1: "0.5", RK41: "0.5", RK42: "0.5", RK43: "1.0" };
  for (const [type, c] of Object.entries(coefficients)) {
    const shader = RDShaderDirichletForStage(type, "updated.r = g;");
    assert.ok(shader.includes(`updated = stageBase + ${c}*dt*stageSlope;`), type);
    assert.ok(shader.includes(`updated = mix(stageSlope, (updated - stageBase) / (${c}*dt), vec4(notEqual(updated, stageState)));`), type);
    assert.ok(!shader.includes("updated2"), type);
    assert.ok(RDShaderDirichletForStage(type, "updated.r = g;", true).includes(`updated2 = stage2Base + ${c}*dt*stage2Slope;`), type);
  }
  for (const type of ["FE", "AB2", "Mid2", "RK44"]) {
    assert.ok(!RDShaderDirichletForStage(type, "updated.r = g;", true).includes("Slope"), type);
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
