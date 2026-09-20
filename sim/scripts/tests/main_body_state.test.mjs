/**
 * Tests for main.js's options-derived module-state setters and a few related helpers, against
 * generated/main-body.mjs (see extract-main-body.mjs). Split out from main_body.test.mjs to
 * keep that file from growing unwieldy - these functions set/read module-scoped state (not
 * just returning a value from their arguments), fixtured via __setState() as usual.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as m from "./generated/main-body.mjs";
import exprEvalModule from "../expr-eval.js";

function stubThrowError() {
  const messages = [];
  m.__setState({ throwError: (msg) => messages.push(msg) });
  return messages;
}

test("getSpecAndReacNames: concatenates species and reaction names", () => {
  m.__setState({ listOfSpecies: ["u", "v"], listOfReactions: ["UFUN", "VFUN"] });
  assert.deepEqual(m.getSpecAndReacNames(), ["u", "v", "UFUN", "VFUN"]);
});

test("getReservedStrs: includes GLSL identifiers scraped from the RD/auxiliary shader templates, the fixed image-lookup tokens, and any caller-supplied exclusions", () => {
  const reserved = m.getReservedStrs(["myExclusion"]);
  assert.ok(reserved.includes("myExclusion"));
  assert.ok(reserved.includes("I_T"));
  assert.ok(reserved.includes("pi")); // declared in auxiliary_GLSL_funs()
});

test("doColourLimsNeedEvaluating: true if either colour limit contains anything beyond digits/dots/whitespace (i.e. an expression, not a plain number)", () => {
  m.__setState({ options: { minColourValue: "0", maxColourValue: "1" } });
  assert.equal(m.doColourLimsNeedEvaluating(), false);
  m.__setState({ options: { minColourValue: "a", maxColourValue: "1" } });
  assert.equal(m.doColourLimsNeedEvaluating(), true);
});

test("colourFromValue: interpolates within the [r,g,b,stop] colourmap segment containing val, clamping val to [0,1]", () => {
  m.__setState({
    colourmap: [
      [0, 0, 0, 0],
      [1, 0, 0, 0.5],
      [1, 1, 1, 1],
    ],
    colourmapEndpoints: [0, 0.5, 1],
  });
  assert.deepEqual(m.colourFromValue(0), [0, 0, 0, 0]);
  assert.deepEqual(m.colourFromValue(0.25), [0.5, 0, 0, 0.25]);
  assert.deepEqual(m.colourFromValue(1), [1, 1, 1, 1]);
  assert.deepEqual(m.colourFromValue(-1), [0, 0, 0, 0]); // clamped
});

test("setAlgebraicVarsFromOptions: sets algebraicV/W/Q (species 1-4) and algebraicSpeciesFlags (species 5-8) from the trailing numAlgebraicSpecies species, and clamps numAlgebraicSpecies to numSpecies-1", () => {
  m.__setState({ options: { numSpecies: 4, numAlgebraicSpecies: 2 }, algebraicSpeciesFlags: [] });
  m.setAlgebraicVarsFromOptions();
  assert.deepEqual(
    { algebraicV: m.algebraicV, algebraicW: m.algebraicW, algebraicQ: m.algebraicQ },
    { algebraicV: false, algebraicW: true, algebraicQ: true },
  );

  m.__setState({ options: { numSpecies: 4, numAlgebraicSpecies: 5 } });
  m.setAlgebraicVarsFromOptions();
  assert.equal(m.options.numAlgebraicSpecies, 3); // clamped to numSpecies-1

  m.__setState({
    options: { numSpecies: 8, numAlgebraicSpecies: 3 },
    algebraicSpeciesFlags: [false, false, false, false, false, false, false, false],
  });
  m.setAlgebraicVarsFromOptions();
  // The trailing 3 species (indices 5,6,7 - i.e. species 6,7,8) are algebraic.
  assert.deepEqual(m.algebraicSpeciesFlags, [false, false, false, false, false, true, true, true]);
});

test("problemTypeFromOptions: sets equationType from numSpecies/crossDiffusion/numAlgebraicSpecies", () => {
  m.__setState({ options: { numSpecies: 1, numAlgebraicSpecies: 0, crossDiffusion: false } });
  m.problemTypeFromOptions();
  assert.equal(m.equationType, 0);

  m.__setState({ options: { numSpecies: 2, numAlgebraicSpecies: 0, crossDiffusion: true } });
  m.problemTypeFromOptions();
  assert.equal(m.equationType, 2);

  m.__setState({ options: { numSpecies: 2, numAlgebraicSpecies: 1, crossDiffusion: true } });
  m.problemTypeFromOptions();
  assert.equal(m.equationType, 3);
});

test("evaluateParamVals: evaluates the kinetic parameters (plus any extra name/value pairs) as a list of [name, value] pairs", () => {
  m.__setState({
    options: { kineticParams: "a = 2; b = a*3" },
    parser: new exprEvalModule.Parser(),
  });
  stubThrowError();
  assert.deepEqual(m.evaluateParamVals(), [
    ["a", 2],
    ["b", 6],
  ]);
  assert.deepEqual(m.evaluateParamVals([["c", "10"]]), [
    ["a", 2],
    ["b", 6],
    ["c", 10],
  ]);
});

test("setAutoPauseStopValue: evaluates options.autoPauseAt (substituting kinetic parameters) into autoPauseStopValue, reporting via throwError on failure", () => {
  m.__setState({
    options: { autoPauseAt: "10*a" },
    kineticParamsVals: [["a", "2"]],
  });
  stubThrowError();
  m.setAutoPauseStopValue();
  assert.equal(m.autoPauseStopValue, 20);

  m.__setState({ options: { autoPauseAt: "not valid (" } });
  const messages = stubThrowError();
  m.setAutoPauseStopValue();
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Unable to evaluate/);
});

test("getParamHooks/getExpressionHooks: return the hooks contract createDefinitionController expects, with feature-specific ariaLabel/placeholder/validateName", () => {
  m.__setState({
    listOfSpecies: ["u", "v"],
    listOfReactions: ["UFUN", "VFUN"],
    expressionNameToCont: {},
    kineticNameToCont: {},
  });
  stubThrowError();

  const paramHooks = m.getParamHooks();
  for (const key of ["ariaLabel", "placeholder", "validateName", "onDeleted", "extraControllerSetup", "afterChange"]) {
    assert.ok(key in paramHooks, `paramHooks missing ${key}`);
  }
  assert.equal(typeof paramHooks.validateName, "function");
  assert.equal(paramHooks.validateName("myNewParam"), true);

  const exprHooks = m.getExpressionHooks();
  for (const key of ["ariaLabel", "placeholder", "validateName", "onDeleted", "extraControllerSetup", "afterChange"]) {
    assert.ok(key in exprHooks, `exprHooks missing ${key}`);
  }
  assert.notEqual(paramHooks.ariaLabel, exprHooks.ariaLabel);
  assert.notEqual(paramHooks.placeholder, exprHooks.placeholder);
});

test("appendExpressionRowsToTEX: appends one \\textstyle row per expression before \\end{aligned}, or leaves str unchanged if there are none", () => {
  m.__setState({ options: { expressions: "" } });
  const unchanged = "$\\begin{aligned}a &= b\\end{aligned}$";
  assert.equal(m.appendExpressionRowsToTEX(unchanged), unchanged);

  m.__setState({ options: { expressions: "f = u+1; g = v-1" } });
  const out = m.appendExpressionRowsToTEX(unchanged);
  assert.match(out, /\\textstyle f &= u\+1/);
  assert.match(out, /\\textstyle g &= v-1/);
  assert.match(out, /\\end\{aligned\}\$$/);
});

test("buildBCShadersForIndices: builds the dirichlet/neumann/robin GLSL blocks and edge-clamp flags for the given (0-based) species indices", () => {
  m.__setState({
    options: {
      minX: "0",
      minY: "0",
      dimension: 2,
      boundaryConditions_1: "dirichlet",
      boundaryConditions_2: "neumann",
      dirichletStr_1: "5",
      neumannStr_1: "0",
      neumannStr_2: "1",
      robinStr_1: "0",
      robinStr_2: "0",
      comboStr_1: "",
      comboStr_2: "",
      domainViaIndicatorFun: false,
    },
    listOfSpecies: ["u", "v"],
    listOfReactions: ["UFUN", "VFUN"],
    expandedExpressionDefs: {},
  });
  stubThrowError();
  m.genAnySpeciesRegexStrs();

  const result = m.buildBCShadersForIndices([0, 1]);
  assert.match(result.dirichletShader, /dirichletRHSuL =\s*5\.\s*;/);
  assert.match(result.neumannShader, /robinRHSvL =\s*1\.\s*;/); // Neumann is a special case of Robin
  assert.deepEqual(result.edgeClampSpeciesH, { 0: true, 1: true });
  assert.deepEqual(result.edgeClampSpeciesV, { 0: true, 1: true });
});
