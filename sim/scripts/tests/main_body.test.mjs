/**
 * Tests against generated/main-body.mjs - the extracted, DOM/THREE-free subset of main.js's
 * VisualPDE() closure (see extract-main-body.mjs). Module-scoped state (options, listOfSpecies,
 * ...) is bare/undefined until a test sets it up via __setState(); functions that call
 * throwError (real DOM writes) get it stubbed the same way, since __setState reassigns the
 * shared module binding that every other function already looks `throwError` up through.
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

// reconcileGlobalIntegrals() calls these (only when options.globalIntExprs actually
// changes) to rebuild the GPU integral shader and refresh the on-screen equation display -
// both real DOM/THREE work, well beyond what these unit tests need to cover.
function stubGlobalIntegralRebuild() {
  m.__setState({
    setGlobalIntegralShader: () => {},
    setEquationDisplayType: () => {},
  });
}

// --- parseNamedDefinition ---------------------------------------------------

test("parseNamedDefinition: parses 'name = rhs', trims whitespace, handles multi-line rhs", () => {
  assert.deepEqual(m.parseNamedDefinition("a = 1"), { name: "a", rhs: "1" });
  assert.deepEqual(m.parseNamedDefinition("  a  =  1 + 2  "), { name: "a", rhs: "1 + 2" });
  assert.deepEqual(m.parseNamedDefinition("f = x*y\n+ 1"), { name: "f", rhs: "x*y\n+ 1" });
});

test("parseNamedDefinition: returns null when unparseable", () => {
  assert.equal(m.parseNamedDefinition("not an assignment"), null);
  assert.equal(m.parseNamedDefinition("1a = 1"), null); // name can't start with a digit
  assert.equal(m.parseNamedDefinition(""), null);
});

// --- buildDependencyGraph / checkForCyclicDependencies / resolveDependentDefinitions ---------

test("buildDependencyGraph: finds whole-word references between definitions", () => {
  const graph = m.buildDependencyGraph({ a: "b + 1", b: "2", c: "a * b" }, ["a", "b", "c"]);
  assert.deepEqual(graph, { a: ["b"], b: [], c: ["a", "b"] });
});

test("buildDependencyGraph: doesn't match partial-word substrings", () => {
  const graph = m.buildDependencyGraph({ ab: "a + 1", a: "2" }, ["ab", "a"]);
  // "ab"'s definition "a + 1" does reference "a" as a whole word; "a"'s definition "2" doesn't
  // reference "ab" as a substring match, since \b won't match "ab" inside a definition of "2".
  assert.deepEqual(graph, { ab: ["a"], a: [] });
});

test("checkForCyclicDependencies: no cycle - every name ends up in doneDict, badNames empty", () => {
  const dependencies = { a: ["b"], b: ["c"], c: [] };
  let doneDict = {};
  let badNames = [];
  [doneDict, , badNames] = m.checkForCyclicDependencies("a", doneDict, ["a"], dependencies, badNames);
  assert.deepEqual(Object.keys(doneDict).sort(), ["a", "b", "c"]);
  assert.deepEqual(badNames, []);
});

test("checkForCyclicDependencies: direct cycle (a -> b -> a) is recorded in badNames", () => {
  const dependencies = { a: ["b"], b: ["a"] };
  let doneDict = {};
  let badNames = [];
  [doneDict, , badNames] = m.checkForCyclicDependencies("a", doneDict, ["a"], dependencies, badNames);
  assert.equal(badNames.length, 1);
  assert.ok(badNames[0].includes("a") && badNames[0].includes("b"));
});

test("checkForCyclicDependencies: self-reference (a -> a) is a cycle of length 1", () => {
  const dependencies = { a: ["a"] };
  let doneDict = {};
  let badNames = [];
  [doneDict, , badNames] = m.checkForCyclicDependencies("a", doneDict, ["a"], dependencies, badNames);
  assert.deepEqual(badNames, [["a"]]);
});

test("resolveDependentDefinitions: resolves names in dependency order via the resolve callback", () => {
  const strDict = { a: "b", b: "1" };
  const order = [];
  const [resultDict, badNames] = m.resolveDependentDefinitions(strDict, ["a", "b"], "0", (name, str, deps, result) => {
    order.push(name);
    result[name] = str;
  });
  assert.deepEqual(badNames, []);
  // b has no dependencies, so it must be resolved before a (which depends on b).
  assert.deepEqual(order, ["b", "a"]);
  assert.deepEqual(resultDict, { a: "b", b: "1" });
});

test("resolveDependentDefinitions: cyclic names are degraded to degradeValue before resolve is called", () => {
  const strDict = { a: "b", b: "a" };
  const seenStrs = {};
  const [, badNames] = m.resolveDependentDefinitions(strDict, ["a", "b"], "DEGRADED", (name, str, deps, result) => {
    seenStrs[name] = str;
    result[name] = str;
  });
  assert.ok(badNames.length > 0);
  assert.equal(seenStrs.a, "DEGRADED");
  assert.equal(seenStrs.b, "DEGRADED");
});

// --- evaluateDependentNumerics (Parameters) ---------------------------------

test("evaluateDependentNumerics: evaluates independent and dependent numeric definitions", () => {
  m.__setState({ parser: new exprEvalModule.Parser() });
  const [valDict, badNames] = m.evaluateDependentNumerics({ a: "2 + 3", b: "a * 2" }, ["a", "b"]);
  assert.deepEqual(badNames, []);
  assert.equal(valDict.a, 5);
  assert.equal(valDict.b, 10);
});

test("evaluateDependentNumerics: cyclic definitions degrade to 0 and are reported via throwError", () => {
  m.__setState({ parser: new exprEvalModule.Parser() });
  const messages = stubThrowError();
  const [valDict, badNames] = m.evaluateDependentNumerics({ a: "b", b: "a" }, ["a", "b"]);
  assert.ok(badNames.length > 0);
  assert.equal(valDict.a, 0);
  assert.equal(valDict.b, 0);
  assert.equal(messages.length, 0); // resolveDependentDefinitions degrades silently, no throwError call itself
});

test("evaluateDependentNumerics: unparseable definitions report via throwError and evaluate to 0", () => {
  m.__setState({ parser: new exprEvalModule.Parser() });
  const messages = stubThrowError();
  const [valDict] = m.evaluateDependentNumerics({ a: "not a valid expr (" }, ["a"]);
  assert.equal(valDict.a, 0);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Unable to evaluate the definition of a/);
});

// --- expandDependentExpressions (Expressions) -------------------------------

test("expandDependentExpressions: substitutes each dependency's own expanded, parenthesized definition", () => {
  const [expanded, badNames] = m.expandDependentExpressions({ a: "b + 1", b: "x * 2" }, ["a", "b"]);
  assert.deepEqual(badNames, []);
  assert.equal(expanded.b, "x * 2");
  assert.equal(expanded.a, "(x * 2) + 1");
});

test("expandDependentExpressions: cyclic definitions degrade to '0.0'", () => {
  const [expanded, badNames] = m.expandDependentExpressions({ a: "b", b: "a" }, ["a", "b"]);
  assert.ok(badNames.length > 0);
  assert.equal(expanded.a, "0.0");
  assert.equal(expanded.b, "0.0");
});

// --- getKineticParamNames / getKineticParamNameVals -------------------------

test("getKineticParamNames/NameVals: parses semicolon-separated 'name = value' definitions", () => {
  m.__setState({ options: { kineticParams: "a = 1; b = 2*a" } });
  assert.deepEqual(m.getKineticParamNames(), ["a", "b"]);
  assert.deepEqual(m.getKineticParamNameVals(), [
    ["a", "1"],
    ["b", "2*a"],
  ]);
});

test("getKineticParamNames: strips 'in [a,b]' range directives before parsing", () => {
  m.__setState({ options: { kineticParams: "a = 1 in [0,1]; b = 2" } });
  assert.deepEqual(m.getKineticParamNames(), ["a", "b"]);
});

test("getKineticParamNameVals: reports unparseable definitions via throwError and skips them", () => {
  const messages = stubThrowError();
  m.__setState({ options: { kineticParams: "not valid; b = 2" } });
  const nameVals = m.getKineticParamNameVals();
  assert.deepEqual(nameVals, [["b", "2"]]);
  assert.equal(messages.length, 1);
});

// --- getExpressionNames / getExpressionNameVals -----------------------------

test("getExpressionNames/NameVals: parses semicolon-separated 'name = value' definitions", () => {
  m.__setState({ options: { expressions: "f = 1; g = f + 2" } });
  assert.deepEqual(m.getExpressionNames(), ["f", "g"]);
  // The third element of each triple is the expression's "TeX" toggle state (see
  // setExpressionsShowStringFromControllers) - defaults to true (shown) when
  // options.expressionsShow is absent, as here.
  assert.deepEqual(m.getExpressionNameVals(), [
    ["f", "1", true],
    ["g", "f + 2", true],
  ]);
});

test("getExpressionNameVals: reads the shown/hidden flag positionally from options.expressionsShow", () => {
  m.__setState({
    options: { expressions: "f = 1; g = f + 2", expressionsShow: "01" },
  });
  assert.deepEqual(m.getExpressionNameVals(), [
    ["f", "1", false],
    ["g", "f + 2", true],
  ]);
});

test("getExpressionNameVals: reports unparseable definitions via throwError", () => {
  const messages = stubThrowError();
  m.__setState({ options: { expressions: "not valid" } });
  assert.deepEqual(m.getExpressionNameVals(), []);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Unable to evaluate the expression definition/);
});

// --- isSpeciesAlgebraic ------------------------------------------------------

test("isSpeciesAlgebraic: species 1-3 (0-based indices 1-3) use the algebraicV/W/Q booleans", () => {
  m.__setState({ algebraicV: true, algebraicW: false, algebraicQ: true, algebraicSpeciesFlags: [] });
  assert.equal(m.isSpeciesAlgebraic(0), false); // species 0 (u) is never algebraic
  assert.equal(m.isSpeciesAlgebraic(1), true);
  assert.equal(m.isSpeciesAlgebraic(2), false);
  assert.equal(m.isSpeciesAlgebraic(3), true);
});

test("isSpeciesAlgebraic: species 5-8 (0-based indices 4-7) use algebraicSpeciesFlags", () => {
  m.__setState({ algebraicSpeciesFlags: [undefined, undefined, undefined, undefined, true, false] });
  assert.equal(m.isSpeciesAlgebraic(4), true);
  assert.equal(m.isSpeciesAlgebraic(5), false);
  assert.equal(m.isSpeciesAlgebraic(6), false); // out of bounds -> undefined -> coerced falsy
});

// --- species/diffusion key helpers ------------------------------------------

test("speciesToChannelChar/speciesToChannelInd/speciesToGroupInd", () => {
  m.__setState({ listOfSpecies: ["u", "v", "w", "q", "u5", "u6", "u7", "u8"] });
  assert.equal(m.speciesToChannelInd("u"), 0);
  assert.equal(m.speciesToChannelInd("u6"), 5);
  assert.equal(m.speciesToChannelChar("u"), "r");
  assert.equal(m.speciesToChannelChar("v"), "g");
  assert.equal(m.speciesToChannelChar("u5"), "r"); // channel wraps mod 4 for group 1
  assert.equal(m.speciesToChannelChar("u6"), "g");
  assert.equal(m.speciesToGroupInd("u"), 0);
  assert.equal(m.speciesToGroupInd("u5"), 1);
});

test("diffCtrlKey: species 1-4 (1-based) use legacy letter-pair keys; anything touching 5-8 uses numeric keys", () => {
  m.__setState({ defaultSpecies: ["u", "v", "w", "q", "u5", "u6", "u7", "u8"] });
  assert.equal(m.diffCtrlKey(1, 1), "Duu");
  assert.equal(m.diffCtrlKey(1, 2), "Duv");
  assert.equal(m.diffCtrlKey(4, 4), "Dqq");
  assert.equal(m.diffCtrlKey(1, 5), "D_1_5");
  assert.equal(m.diffCtrlKey(5, 5), "D_5_5");
});

// --- parseIntCalls / replaceIntCalls -----------------------------------------

test("parseIntCalls: extracts the argument of each Int(...) call, matching balanced (nested) brackets", () => {
  const calls = m.parseIntCalls("Int(u*(v+1)) + Int(w)");
  assert.deepEqual(
    calls.map((c) => c.expr),
    ["u*(v+1)", "w"],
  );
});

test("parseIntCalls: canonicalizes whitespace so equivalent expressions compare equal", () => {
  const calls = m.parseIntCalls("Int( u * v ) + Int(u*v)");
  assert.equal(calls[0].expr, calls[1].expr);
  assert.equal(calls[0].expr, "u*v");
});

test("parseIntCalls: unbalanced brackets are skipped rather than crashing", () => {
  assert.deepEqual(m.parseIntCalls("Int(u"), []);
});

test("parseIntCalls: nested Int(...) is rejected via throwError and NOT recorded as a call (regression: it must not silently consume a slot or resolve to a live uniform)", () => {
  const messages = stubThrowError();
  const calls = m.parseIntCalls("Int(Int(u))");
  assert.equal(messages.length, 1);
  assert.match(messages[0], /cannot be nested/);
  assert.deepEqual(calls, []);
});

test("replaceIntCalls: splices each Int(...) call's replacement in place, keeping surrounding text intact", () => {
  const out = m.replaceIntCalls("2*Int(u) + Int(v*2)", (expr) => "<" + expr + ">");
  assert.equal(out, "2*<u> + <v*2>");
});

// --- reconcileGlobalIntegrals -------------------------------------------------

function baseOptionsForReconcile(overrides = {}) {
  // getUserTextFields() is real (imported from presets.js), so reconcileGlobalIntegrals
  // scans ~140 fields; only the ones under test need to actually be strings.
  return { globalIntExprs: [null, null, null, null], ...overrides };
}

test("reconcileGlobalIntegrals: assigns newly-seen expressions to the lowest free slot, in first-appearance order", () => {
  m.__setState({
    options: baseOptionsForReconcile({
      // All in one field, so the assertion only depends on left-to-right appearance order,
      // not on getUserTextFields()'s (unspecified-by-this-test) field iteration order.
      reactionStr_1: "Int(u) + Int(v) + Int(w)",
    }),
  });
  stubThrowError();
  stubGlobalIntegralRebuild();
  const changed = m.reconcileGlobalIntegrals();
  assert.equal(changed, true);
  assert.deepEqual(m.options.globalIntExprs, ["u", "v", "w", null]);
});

test("reconcileGlobalIntegrals: is a no-op (returns false, doesn't touch the array) when nothing changed", () => {
  m.__setState({
    options: baseOptionsForReconcile({
      globalIntExprs: ["u", null, null, null],
      reactionStr_1: "Int(u)",
    }),
  });
  stubThrowError();
  stubGlobalIntegralRebuild();
  const before = m.options.globalIntExprs;
  const changed = m.reconcileGlobalIntegrals();
  assert.equal(changed, false);
  assert.equal(m.options.globalIntExprs, before); // same array instance, not just deepEqual
});

test("reconcileGlobalIntegrals: stability - removing one Int(...) frees its slot without renumbering the others", () => {
  m.__setState({
    options: baseOptionsForReconcile({
      globalIntExprs: ["u", "v", "w", null],
      // "u" no longer appears anywhere; "v" and "w" still do.
      reactionStr_1: "Int(v)",
      initCond_1: "Int(w)",
    }),
  });
  stubThrowError();
  stubGlobalIntegralRebuild();
  m.reconcileGlobalIntegrals();
  assert.deepEqual(m.options.globalIntExprs, [null, "v", "w", null]);
});

test("reconcileGlobalIntegrals: a freed slot is reused by a new expression rather than the others being compacted down", () => {
  m.__setState({
    options: baseOptionsForReconcile({
      globalIntExprs: [null, "v", "w", null],
      reactionStr_1: "Int(v) + Int(x)",
      initCond_1: "Int(w)",
    }),
  });
  stubThrowError();
  stubGlobalIntegralRebuild();
  m.reconcileGlobalIntegrals();
  assert.deepEqual(m.options.globalIntExprs, ["x", "v", "w", null]);
});

test("reconcileGlobalIntegrals: the same expression used in multiple fields only takes one slot", () => {
  m.__setState({
    options: baseOptionsForReconcile({
      reactionStr_1: "Int(u)",
      reactionStr_2: "Int(u) + 1",
    }),
  });
  stubThrowError();
  stubGlobalIntegralRebuild();
  m.reconcileGlobalIntegrals();
  assert.deepEqual(m.options.globalIntExprs, ["u", null, null, null]);
});

test("reconcileGlobalIntegrals: a 5th distinct expression overflows, throwing an error and leaving it unassigned", () => {
  m.__setState({
    options: baseOptionsForReconcile({
      reactionStr_1: "Int(a) + Int(b) + Int(c) + Int(d) + Int(e)",
    }),
  });
  const messages = stubThrowError();
  stubGlobalIntegralRebuild();
  m.reconcileGlobalIntegrals();
  assert.deepEqual(m.options.globalIntExprs, ["a", "b", "c", "d"]);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /at most 4/);
});

test("reconcileGlobalIntegrals: a nested Int(Int(...)) doesn't consume a slot (regression - parseIntCalls must not record a rejected nested call)", () => {
  m.__setState({
    options: baseOptionsForReconcile({
      reactionStr_1: "Int(a) + Int(b) + Int(c) + Int(d) + Int(Int(e))",
    }),
  });
  const messages = stubThrowError();
  stubGlobalIntegralRebuild();
  m.reconcileGlobalIntegrals();
  // All 4 real slots go to a-d; the nested Int(Int(e)) must not itself take a slot (nor push
  // a-d into overflow) and must not raise the separate "at most 4" overflow error - only the
  // nesting error.
  assert.deepEqual(m.options.globalIntExprs, ["a", "b", "c", "d"]);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /cannot be nested/);
});

test("reconcileGlobalIntegrals: scans brushRadius, minX, minY and timescale_1-8 (regression - these are real free-text expression fields, e.g. presets.js's brushRadius: \"a*L\"/minX: \"-L_x/2\", that were missing from getUserTextFields())", () => {
  for (const field of ["brushRadius", "minX", "minY", "timescale_3"]) {
    m.__setState({
      options: baseOptionsForReconcile({ [field]: "Int(u)" }),
    });
    stubThrowError();
    stubGlobalIntegralRebuild();
    m.reconcileGlobalIntegrals();
    assert.deepEqual(
      m.options.globalIntExprs,
      ["u", null, null, null],
      `Int(u) in ${field} should be assigned a slot`,
    );
  }
});

// --- parseShaderString / parseStringToTEX: Int(...) --------------------------

test("parseShaderString: substitutes Int(expr) with the globalIntegralValueN uniform for expr's reconciled slot", () => {
  m.__setState({
    options: { minX: "0", minY: "0", globalIntExprs: ["u", "v", null, null] },
    listOfSpecies: ["u", "v"],
    listOfReactions: ["UFUN", "VFUN"],
    expandedExpressionDefs: {},
  });
  stubThrowError();
  m.genAnySpeciesRegexStrs();
  const out = m.parseShaderString("Int(u) + Int(v)");
  assert.equal(out.trim(), "globalIntegralValue1 + globalIntegralValue2");
});

test("parseShaderString: an Int(expr) with no reconciled slot degrades to 0.0 rather than crashing", () => {
  m.__setState({
    options: { minX: "0", minY: "0", globalIntExprs: [null, null, null, null] },
    listOfSpecies: ["u"],
    listOfReactions: ["UFUN"],
    expandedExpressionDefs: {},
  });
  stubThrowError();
  m.genAnySpeciesRegexStrs();
  const out = m.parseShaderString("Int(u)");
  assert.equal(out.trim(), "0.0");
});

test("parseShaderString: Int(...) is rejected in initial conditions (allowIntegrals=false) - degrades to 0.0 and reports via throwError, even when the expression has a valid reconciled slot elsewhere", () => {
  m.__setState({
    options: { minX: "0", minY: "0", globalIntExprs: ["u", null, null, null] },
    listOfSpecies: ["u"],
    listOfReactions: ["UFUN"],
    expandedExpressionDefs: {},
  });
  const messages = stubThrowError();
  m.genAnySpeciesRegexStrs();
  const out = m.parseShaderString("Int(u)", false);
  assert.equal(out.trim(), "0.0");
  assert.equal(messages.length, 1);
  assert.match(messages[0], /can't be used in initial conditions/);
});

test("parseStringToTEX: substitutes Int(expr) with \\iint_{\\Omega}(expr, fully TeX-formatted)", () => {
  m.__setState({
    options: { minX: "0", minY: "0", dimension: "2" },
    listOfSpecies: ["u", "v"],
    listOfReactions: ["UFUN", "VFUN"],
  });
  stubThrowError();
  const out = m.parseStringToTEX("a*Int(u*v)");
  assert.doesNotMatch(out, /\*/); // each Int(...) argument gets its own TeX formatting
  assert.match(out, /\\iint_\{\\Omega\} u v\\, \\d x \\d y\\ /);
});

test("parseStringToTEX: doesn't infinitely recurse when str has no Int(...) at all (regression: the substitution must only recurse when an actual Int(...) match exists)", () => {
  m.__setState({
    options: { minX: "0", minY: "0", dimension: "2" },
    listOfSpecies: ["u", "v"],
    listOfReactions: ["UFUN", "VFUN"],
  });
  stubThrowError();
  assert.equal(m.parseStringToTEX("a - b"), "a - b");
});

// --- migrateGlobalIntSyntax ---------------------------------------------------

test("migrateGlobalIntSyntax: is a no-op when there's no old globalIntegralFun field", () => {
  m.__setState({ options: { reactionStr_1: "u" } });
  m.migrateGlobalIntSyntax();
  assert.deepEqual(m.options, { reactionStr_1: "u" });
});

test("migrateGlobalIntSyntax: rewrites GlobalInt1-4 and bare GlobalInt (slot 1) into Int(<old component>), then deletes globalIntegralFun", () => {
  m.__setState({
    options: {
      globalIntegralFun: "u;v;0;0",
      reactionStr_1: "GlobalInt1 + GlobalInt2",
      reactionStr_2: "GlobalInt", // bare form == slot 1, for backwards compatibility
      initCond_1: "1.0", // untouched, no GlobalInt reference
    },
  });
  m.migrateGlobalIntSyntax();
  assert.equal(m.options.reactionStr_1, "Int(u) + Int(v)");
  assert.equal(m.options.reactionStr_2, "Int(u)");
  assert.equal(m.options.initCond_1, "1.0");
  assert.equal(m.options.hasOwnProperty("globalIntegralFun"), false);
});

test("migrateGlobalIntSyntax: also rewrites GlobalInt tokens inside per-view field overrides", () => {
  m.__setState({
    options: {
      globalIntegralFun: "u;v;0;0",
      probeFun: "0",
      views: [{ probeFun: "GlobalInt2" }],
    },
  });
  m.migrateGlobalIntSyntax();
  assert.equal(m.options.views[0].probeFun, "Int(v)");
});

// --- lerp / lerpArrays -------------------------------------------------------

test("lerp: interpolates and clamps t to [0,1]", () => {
  assert.equal(m.lerp(0, 10, 0.5), 5);
  assert.equal(m.lerp(0, 10, 0), 0);
  assert.equal(m.lerp(0, 10, 1), 10);
  assert.equal(m.lerp(0, 10, 2), 10); // clamped
  assert.equal(m.lerp(0, 10, -1), 0); // clamped
});

test("lerpArrays: interpolates element-wise", () => {
  assert.deepEqual(m.lerpArrays([0, 10], [10, 20], 0.5), [5, 15]);
});

// --- alternateBrackets -------------------------------------------------------

test("alternateBrackets: alternates nesting depth between ( and [ from the outside in (outermost bracket type depends on total nesting depth)", () => {
  assert.equal(m.alternateBrackets("(a)"), "(a)");
  assert.equal(m.alternateBrackets("((a))"), "[(a)]");
  assert.equal(m.alternateBrackets("(((a)))"), "([(a)])");
});

test("alternateBrackets: leaves text outside brackets untouched and handles multiple bracket groups", () => {
  assert.equal(m.alternateBrackets("f((a)) + g((b))"), "f[(a)] + g[(b)]");
});

// --- isEmptyString / getDuplicates / sortObject -----------------------------

test("isEmptyString: true for empty or whitespace-only strings, false otherwise", () => {
  assert.equal(m.isEmptyString(""), true);
  assert.equal(m.isEmptyString("   \n\t "), true);
  assert.equal(m.isEmptyString("a"), false);
});

test("getDuplicates: returns each duplicated element once, preserving no particular order requirement", () => {
  assert.deepEqual(m.getDuplicates(["a", "b", "a", "c", "b", "b"]).sort(), ["a", "b"]);
  assert.deepEqual(m.getDuplicates(["a", "b", "c"]), []);
});

test("sortObject: sorts keys case-insensitively, preserving values", () => {
  const sorted = m.sortObject({ Banana: 2, apple: 1, Cherry: 3 });
  assert.deepEqual(Object.keys(sorted), ["apple", "Banana", "Cherry"]);
  assert.deepEqual(sorted, { apple: 1, Banana: 2, Cherry: 3 });
});

// --- isValidSyntax ------------------------------------------------------------

test("isValidSyntax: accepts well-formed expressions", () => {
  stubThrowError();
  assert.equal(m.isValidSyntax(" a + b * (c - 1) "), true);
});

test("isValidSyntax: rejects empty parentheses, unbalanced parentheses, and trailing operators", () => {
  for (const bad of [" f() ", " (a + b ", " a + b) ", " a + "]) {
    const messages = stubThrowError();
    assert.equal(m.isValidSyntax(bad), false, `expected "${bad}" to be invalid`);
    assert.equal(messages.length, 1);
  }
});

test("isValidSyntax: rejects '--' and '++' as ambiguous", () => {
  for (const bad of [" a--b ", " a++b "]) {
    stubThrowError();
    assert.equal(m.isValidSyntax(bad), false);
  }
});

// --- isReservedName / validateParamName / validateExpressionName -----------

test("isReservedName: true for GLSL built-ins/reserved image tokens, false for an ordinary name", () => {
  stubThrowError();
  assert.equal(m.isReservedName("I_T"), true);
  assert.equal(m.isReservedName("myOwnParamName"), false);
});

test("validateParamName/validateExpressionName: reject species/reaction/reserved names and names already used by the other feature", () => {
  m.__setState({
    listOfSpecies: ["u", "v"],
    listOfReactions: ["UFUN", "VFUN"],
    expressionNameToCont: { myExpr: {} },
    kineticNameToCont: { myParam: {} },
  });
  const paramMessages = stubThrowError();
  assert.equal(m.validateParamName("u"), false); // species name
  assert.equal(m.validateParamName("myExpr"), false); // already an expression name
  assert.ok(paramMessages.length > 0);

  const exprMessages = stubThrowError();
  assert.equal(m.validateExpressionName("UFUN"), false); // reaction name
  assert.equal(m.validateExpressionName("myParam"), false); // already a parameter name
  assert.ok(exprMessages.length > 0);
});

test("validateParamName/validateExpressionName: accept a fresh, unused name", () => {
  m.__setState({
    listOfSpecies: ["u", "v"],
    listOfReactions: ["UFUN", "VFUN"],
    expressionNameToCont: {},
    kineticNameToCont: {},
  });
  stubThrowError();
  assert.equal(m.validateParamName("myBrandNewName"), true);
  assert.equal(m.validateExpressionName("myOtherNewName"), true);
});

// --- autoCorrectSyntax --------------------------------------------------------

test("autoCorrectSyntax: inserts implicit multiplication between a number and a following letter/paren", () => {
  m.__setState({ listOfSpecies: ["u", "v"], options: { kineticParams: "", expressions: "" } });
  m.genAnySpeciesRegexStrs();
  assert.equal(m.autoCorrectSyntax("2u"), "2*u");
  assert.equal(m.autoCorrectSyntax("3(a+1)"), "3*(a+1)");
});

test("autoCorrectSyntax: inserts implicit multiplication between adjacent parentheses, and simplifies +- chains", () => {
  m.__setState({ listOfSpecies: ["u", "v"], options: { kineticParams: "", expressions: "" } });
  m.genAnySpeciesRegexStrs();
  assert.equal(m.autoCorrectSyntax("(a)(b)"), "(a)*(b)");
  assert.equal(m.autoCorrectSyntax("a +- b"), "a - b");
  assert.equal(m.autoCorrectSyntax("a - + b"), "a - b");
});

test("autoCorrectSyntax: empty/whitespace-only input becomes '0'", () => {
  m.__setState({ listOfSpecies: [] });
  m.genAnySpeciesRegexStrs();
  assert.equal(m.autoCorrectSyntax("   "), "0");
});

/**
 * CoupledCGL's setup: species and parameters whose names contain a digit in the middle
 * ("D_1r", "a_1i"). The implicit-multiplication rule used to split those into "D_1*r",
 * silently corrupting the expression as soon as any field was edited.
 */
function useCoupledCGLNames() {
  m.__setState({
    listOfSpecies: ["u_1", "v_1", "u_2", "v_2"],
    options: {
      kineticParams:
        "b_1i = 5 in [-5, 5];D_1r = 1;D_1i = 0.1;a_1r = 1;a_1i = 0;b_1r = -1;alpha_1 = 4;",
      expressions: "",
    },
  });
  m.genAnySpeciesRegexStrs();
}

test("autoCorrectSyntax: a declared name containing a digit is never split", () => {
  useCoupledCGLNames();
  assert.equal(m.autoCorrectSyntax("D_1r"), "D_1r");
  assert.equal(m.autoCorrectSyntax("a_1i"), "a_1i");
  assert.equal(m.autoCorrectSyntax("alpha_1"), "alpha_1");
  assert.equal(
    m.autoCorrectSyntax("a_1r*u_1-a_1i*v_1+(b_1r*u_1-b_1i*v_1)*rho_1"),
    "a_1r*u_1-a_1i*v_1+(b_1r*u_1-b_1i*v_1)*rho_1",
  );
});

test("autoCorrectSyntax: two declared names written side by side still gain a *", () => {
  useCoupledCGLNames();
  // Lexically identical to "D_1r" above - only the declared-name list tells them apart.
  assert.equal(m.autoCorrectSyntax("u_1u_2"), "u_1*u_2");
  assert.equal(m.autoCorrectSyntax("2u_1"), "2*u_1");
  assert.equal(m.autoCorrectSyntax("2D_1r"), "2*D_1r");
});

test("autoCorrectSyntax: an undeclared run keeps the old digit-splitting behaviour", () => {
  useCoupledCGLNames();
  assert.equal(m.autoCorrectSyntax("2u"), "2*u");
  assert.equal(m.autoCorrectSyntax("x2y"), "x2*y");
  assert.equal(m.autoCorrectSyntax("a0(x)"), "a0*(x)");
});

test("autoCorrectSyntax: scientific notation survives the digit rule", () => {
  useCoupledCGLNames();
  assert.equal(m.autoCorrectSyntax("1e5"), "1e5");
  assert.equal(m.autoCorrectSyntax("2e-3"), "2e-3");
  assert.equal(m.autoCorrectSyntax("1E5"), "1e5");
});

// --- autoCorrectDefinition ----------------------------------------------------------------

test("autoCorrectDefinition: corrects the right-hand side but never the name", () => {
  m.__setState({
    listOfSpecies: ["u", "v"],
    options: { kineticParams: "", expressions: "" },
  });
  m.genAnySpeciesRegexStrs();
  // "uv" would become "u*v" if autoCorrectSyntax saw the whole row.
  assert.equal(m.autoCorrectDefinition("uv = 3"), "uv = 3");
  assert.equal(m.autoCorrectDefinition("q1 = 2u"), "q1 = 2*u");
  assert.equal(
    m.autoCorrectDefinition("p1 = 2(a+1) in [0,5]"),
    "p1 = 2*(a+1) in [0,5]",
  );
});

test("autoCorrectDefinition: leaves a half-typed row and a non-definition alone", () => {
  m.__setState({
    listOfSpecies: ["u", "v"],
    options: { kineticParams: "", expressions: "" },
  });
  m.genAnySpeciesRegexStrs();
  // Would become "a = 0" if the empty right-hand side reached autoCorrectSyntax, hiding the
  // "unable to evaluate" error the user should see instead.
  assert.equal(m.autoCorrectDefinition("a = "), "a = ");
  assert.equal(m.autoCorrectDefinition("not a definition"), "not a definition");
});
