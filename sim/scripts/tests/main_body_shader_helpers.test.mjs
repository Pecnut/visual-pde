/**
 * Tests for main.js's options-touching shader-string-building helpers (reaction/diffusion/
 * boundary-condition GLSL assembly), against generated/main-body.mjs (see
 * extract-main-body.mjs). Split out from main_body.test.mjs to keep that file from growing
 * unwieldy. Each test sets up just the options/state fields the function under test actually
 * reads.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as m from "./generated/main-body.mjs";

function stubThrowError() {
  m.__setState({ throwError: () => {} });
}

// --- species/group/channel shader-string helpers -----------------------------

test("selectColourspecInShaderStr: substitutes COLOURSPEC with options.whatToDraw's channel", () => {
  m.__setState({ options: { whatToDraw: "v" }, listOfSpecies: ["u", "v", "w", "q"] });
  assert.equal(
    m.selectColourspecInShaderStr("gl_FragColor.COLOURSPEC = 1.0;"),
    "gl_FragColor.g = 1.0;",
  );
});

test("groupifyShaderStr: a no-op for group 0, retargets the uvwq-family/updated/RHS/timescales tokens to their group-1 counterparts otherwise", () => {
  const str = "uvwqL.r + updated + RHS + timescales";
  assert.equal(m.groupifyShaderStr(str, 0), str);
  assert.equal(
    m.groupifyShaderStr(str, 1),
    "uvwq2L.r + updated2 + RHS2 + timescalesGroup1",
  );
});

test("selectSpeciesInShaderStr: substitutes SPECIES/robinRHSSPECIES/dirichletRHSSPECIES for the given species, and groupifies for species 5-8", () => {
  m.__setState({ listOfSpecies: ["u", "v"] });
  assert.equal(
    m.selectSpeciesInShaderStr("float SPECIES = robinRHSSPECIES + dirichletRHSSPECIES;", "v"),
    "float g = robinRHSv + dirichletRHSv;",
  );
  assert.equal(m.selectSpeciesInShaderStr("anything", []), "");
});

test("stencilPrefixForSpecies: 'uvwq' for group-0 species, 'uvwq2' for species 5-8", () => {
  m.__setState({ listOfSpecies: ["u", "v", "w", "q", "u5", "u6", "u7", "u8"] });
  assert.equal(m.stencilPrefixForSpecies("u"), "uvwq");
  assert.equal(m.stencilPrefixForSpecies("u5"), "uvwq2");
});

// --- reaction/diffusion GLSL assembly -----------------------------------------

function diffusionFixture(extra = {}) {
  m.__setState({
    options: Object.assign(
      {
        minX: "0",
        minY: "0",
        dimension: 2,
        reactionStr_1: "u*v",
        reactionStr_2: "v-u",
        reactionStr_3: "0",
        reactionStr_4: "0",
        numSpecies: 2,
        diffusionStr_1_1: "1",
        diffusionStr_2_2: "0.5",
        diffusionStr_1_2: "0",
        diffusionStr_2_1: "0",
        diffusionStr_1_3: "0",
        diffusionStr_1_4: "0",
        diffusionStr_2_3: "0",
        diffusionStr_2_4: "0",
        diffusionStr_3_1: "0",
        diffusionStr_3_2: "0",
        diffusionStr_3_4: "0",
        diffusionStr_4_1: "0",
        diffusionStr_4_2: "0",
        diffusionStr_4_3: "0",
      },
      extra,
    ),
    listOfSpecies: ["u", "v"],
    listOfReactions: ["UFUN", "VFUN"],
    expandedExpressionDefs: {},
  });
  stubThrowError();
  m.genAnySpeciesRegexStrs();
}

test("parseReactionStrings: emits 'float UFUN = ...;' etc. for reactionStr_1-4, parsed through parseShaderString", () => {
  diffusionFixture();
  const out = m.parseReactionStrings();
  assert.match(out, /float UFUN =\s*uvwq\.r\*uvwq\.g\s*;/);
  assert.match(out, /float VFUN =\s*uvwq\.g-uvwq\.r\s*;/);
  assert.match(out, /float WFUN =\s*0\.\s*;/);
});

test("parseNormalDiffusionStrings: emits self-diffusion (Duux/Dvvx/...) blocks, one per active species, with matching y-coefficients", () => {
  diffusionFixture();
  const out = m.parseNormalDiffusionStrings();
  assert.match(out, /float Duux =\s*1\.\s*;/);
  assert.match(out, /float Duuy = Duux;/); // no separate y-coefficient given -> mirrors x
  assert.match(out, /float Dvvx =\s*0\.5\s*;/);
});

test("parseCrossDiffusionStrings: emits every off-diagonal (i,j) pair for the active species", () => {
  diffusionFixture();
  const out = m.parseCrossDiffusionStrings();
  assert.match(out, /float Duvx/);
  assert.match(out, /float Dvux/);
  assert.doesNotMatch(out, /float Duux/); // self-diffusion isn't part of the cross-diffusion output
});

test("diffusionTupleToShader: a single value applies to both x and y; ';'-separated values give independent x/y coefficients", () => {
  diffusionFixture();
  const same = m.diffusionTupleToShader("1.5", "uu");
  assert.match(same, /float Duux =\s*1\.5\s*;/);
  assert.match(same, /float Duuy = Duux;/);

  const separate = m.diffusionTupleToShader("1.5;2.5", "uu");
  assert.match(separate, /float Duux =\s*1\.5\s*;/);
  assert.match(separate, /float Duuy =\s*2\.5\s*;/);
});

test("nonConstantDiffusionEvaluateInSpaceStr: emits the coefficient plus its 4 one-sided-shifted (L/R/T/B) variants", () => {
  const out = m.nonConstantDiffusionEvaluateInSpaceStr("1.0;\n", "uux");
  assert.match(out, /float Duux = 1\.0;/);
  assert.match(out, /float DuuxL = 1\.0;/);
  assert.match(out, /float DuuxR = 1\.0;/);
  assert.match(out, /float DuuxT = 1\.0;/);
  assert.match(out, /float DuuxB = 1\.0;/);
});

test("setEqualYDiffusionCoefficientsShader: mirrors the x-coefficient (and its L/R/T/B variants) onto y", () => {
  const out = m.setEqualYDiffusionCoefficientsShader("uu");
  assert.match(out, /float Duuy = Duux;/);
  assert.match(out, /float DuuyB = DuuxB;/);
});

// --- boundary-condition GLSL assembly -----------------------------------------

test("parseRobinRHS/parseDirichletRHS: emit one 'float <kind>RHS<species><side> = ...;' line per side, or all 4 sides if side is omitted", () => {
  diffusionFixture();
  assert.equal(
    m.parseRobinRHS("5.0", "u", "L"),
    "float robinRHSuL =  5.0 ;\n",
  );
  const allSides = m.parseRobinRHS("5.0", "u");
  for (const side of ["L", "R", "T", "B"]) {
    assert.match(allSides, new RegExp(`float robinRHSu${side} = `));
  }
  assert.match(m.parseDirichletRHS("sin(t)", "v", "T"), /float dirichletRHSvT = /);
});

test("ghostUpdateShader/dirichletUpdateShader/robinUpdateShader: build a one-sided-difference GLSL block for the given species/side", () => {
  diffusionFixture();
  const ghost = m.ghostUpdateShader(0, "L", "5.0");
  assert.match(ghost, /uvwqL\.r = 5\.0;/);
  assert.doesNotMatch(ghost, /GHOSTSPECIES/); // placeholder fully substituted

  const dirichlet = m.dirichletUpdateShader(1, "T");
  assert.match(dirichlet, /updated\.g = dirichletRHSvT;/);

  const robin = m.robinUpdateShader(0, "L");
  assert.match(robin, /uvwqL\.r = /);
});

test("robinUpdateShaderCustomDomain: substitutes the parsed domainIndicatorFun into the custom-domain Robin template", () => {
  diffusionFixture({ domainIndicatorFun: "1" });
  const out = m.robinUpdateShaderCustomDomain(0, "L");
  assert.match(out, /float\(\s*1\.\s*\)/);
});

test("dirichletEnforceShader/dirichletEnforceShaderMRT: assign gl_FragColor (non-MRT) or updated (MRT) directly from the Dirichlet RHS", () => {
  diffusionFixture();
  const nonMRT = m.dirichletEnforceShader(0, "L");
  assert.match(nonMRT, /gl_FragColor\.r = dirichletRHSuL;/);

  const mrt = m.dirichletEnforceShaderMRT(0, "L");
  assert.match(mrt, /updated\.r = dirichletRHSuL;/);
});

// --- misc options-touching helpers --------------------------------------------

test("replaceMINXMINY: substitutes MINX/MINY with the parsed options.minX/minY", () => {
  m.__setState({ options: { minX: "1", minY: "2" }, listOfSpecies: [], expandedExpressionDefs: {} });
  stubThrowError();
  m.genAnySpeciesRegexStrs();
  assert.equal(m.replaceMINXMINY("x - MINX + MINY").trim(), "x -  1.  +  2.");
});

test("getModifiedDomainIndicatorFun: excludes the outer layer of pixels in x always, and in y too when options.dimension is 2 (regression: previously checked the nonexistent options.dimensions)", () => {
  m.__setState({ options: { domainIndicatorFun: "1 - x^2 - y^2", dimension: "2" } });
  const twoD = m.getModifiedDomainIndicatorFun();
  assert.match(twoD, /textureCoords\.x - step_x >= 0\.0/);
  assert.match(twoD, /textureCoords\.y - step_y >= 0\.0/);

  m.__setState({ options: { domainIndicatorFun: "1 - x^2", dimension: "1" } });
  const oneD = m.getModifiedDomainIndicatorFun();
  assert.match(oneD, /textureCoords\.x - step_x >= 0\.0/);
  assert.doesNotMatch(oneD, /textureCoords\.y/);
});

test("getExpressionDefs/getKineticParamDefs: thin options accessors, the latter stripping 'in [a,b]' range directives", () => {
  m.__setState({ options: { expressions: "f = 1;", kineticParams: "a = 0.5 in [0,1]; b = 1;" } });
  assert.equal(m.getExpressionDefs(), "f = 1;");
  assert.equal(m.getKineticParamDefs(), "a = 0.5 ; b = 1;");
});

test("kineticUniformsForShader: declares one GLSL uniform per kinetic parameter name", () => {
  m.__setState({ options: { kineticParams: "a = 0.5; b = 1;" } });
  assert.equal(m.kineticUniformsForShader(), "uniform float a;\nuniform float b;");
});

test("parseSpeciesNamesFromOptions/speciesNamesToString: split options.speciesNames on non-word characters, and re-join the active ones with spaces", () => {
  m.__setState({
    options: { speciesNames: "u, v  w", numSpecies: 2 },
    listOfSpecies: ["u", "v", "w"],
    defaultSpecies: ["u", "v", "w", "q", "u5", "u6", "u7", "u8"],
  });
  assert.deepEqual(m.parseSpeciesNamesFromOptions(), ["u", "v", "w"]);
  assert.equal(m.speciesNamesToString(), "u v"); // pruned to the first numSpecies=2
});

test("checkForAnyDirichletBCs: true if any of the 8 boundary-condition slots is Dirichlet (direct or via a combo string), or if the domain is defined via an indicator function", () => {
  const base = {
    domainViaIndicatorFun: false,
    boundaryConditions_1: "periodic",
    boundaryConditions_2: "periodic",
    boundaryConditions_3: "periodic",
    boundaryConditions_4: "periodic",
    boundaryConditions_5: "periodic",
    boundaryConditions_6: "periodic",
    boundaryConditions_7: "periodic",
    boundaryConditions_8: "periodic",
    comboStr_1: "",
    comboStr_2: "",
    comboStr_3: "",
    comboStr_4: "",
    comboStr_5: "",
    comboStr_6: "",
    comboStr_7: "",
    comboStr_8: "",
  };
  m.__setState({ options: base });
  m.checkForAnyDirichletBCs();
  assert.equal(m.anyDirichletBCs, false);

  m.__setState({ options: Object.assign({}, base, { boundaryConditions_3: "dirichlet" }) });
  m.checkForAnyDirichletBCs();
  assert.equal(m.anyDirichletBCs, true);

  m.__setState({ options: Object.assign({}, base, { comboStr_2: "Left: Dirichlet = 0;" }) });
  m.checkForAnyDirichletBCs();
  assert.equal(m.anyDirichletBCs, true);

  m.__setState({ options: Object.assign({}, base, { domainViaIndicatorFun: true }) });
  m.checkForAnyDirichletBCs();
  assert.equal(m.anyDirichletBCs, true);
});

test("checkGhostBCs: true only if a Ghost clause is present in a slot that's actually set to 'combo'", () => {
  const base = {
    comboStr_1: "Left: Ghost = 0;",
    comboStr_2: "",
    comboStr_3: "",
    comboStr_4: "",
    boundaryConditions_1: "combo",
    boundaryConditions_2: "periodic",
    boundaryConditions_3: "periodic",
    boundaryConditions_4: "periodic",
  };
  m.__setState({ options: base });
  assert.ok(m.checkGhostBCs());

  m.__setState({ options: Object.assign({}, base, { boundaryConditions_1: "periodic" }) });
  assert.ok(!m.checkGhostBCs());
});

test("validateComboStr: appends missing sides as Periodic, sorts, and writes the result back to options", () => {
  m.__setState({ options: { comboStr_1: "Left: Dirichlet = 0" } });
  m.validateComboStr("1");
  assert.equal(
    m.options.comboStr_1,
    "Bottom: Periodic; Left: Dirichlet = 0; Right: Periodic; Top: Periodic;",
  );
});

test("evaluateWithParams: substitutes kinetic-parameter names before evaluating with the expression parser", async () => {
  const { Parser } = (await import("../expr-eval.js")).default;
  m.__setState({ parser: new Parser(), kineticParamsVals: [["a", "0.5"]] });
  assert.equal(m.evaluateWithParams("10*a"), 5);
});
