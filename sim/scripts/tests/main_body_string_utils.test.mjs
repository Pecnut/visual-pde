/**
 * Tests for main.js's smaller pure string/formatting/TeX helper functions, against
 * generated/main-body.mjs (see extract-main-body.mjs). Split out from main_body.test.mjs to
 * keep that file from growing unwieldy - these functions need no options/state fixture at
 * all, or only a trivial one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as m from "./generated/main-body.mjs";

test("modulo: always returns a non-negative result, unlike JS's %", () => {
  assert.equal(m.modulo(-1, 3), 2);
  assert.equal(m.modulo(5, 3), 2);
  assert.equal(m.modulo(0, 3), 0);
});

test("replaceStrAtIndex: replaces a single character by default, or a range when resumeInd is given", () => {
  assert.equal(m.replaceStrAtIndex("hello world", "X", 6), "hello Xorld");
  assert.equal(m.replaceStrAtIndex("hello world", "XYZ", 0, 5), "XYZ world");
});

test("insertStrAtIndex: inserts without removing any existing characters", () => {
  assert.equal(m.insertStrAtIndex("hello", "X", 2), "heXllo");
});

test("removeWhitespace: collapses runs of whitespace to 2 spaces and trims", () => {
  assert.equal(m.removeWhitespace("  a   b\tc  "), "a  b  c");
});

test("removeExtraWhitespace: collapses runs of whitespace to a single space (no trim)", () => {
  assert.equal(m.removeExtraWhitespace("a   b    c"), "a b c");
  assert.equal(m.removeExtraWhitespace("  a  "), " a ");
});

test("capitaliseFirstLetter", () => {
  assert.equal(m.capitaliseFirstLetter("hello"), "Hello");
  assert.equal(m.capitaliseFirstLetter(""), "");
});

test("removeEvalAt: strips the TeX eval-at-boundary wrapper, leaving the wrapped content", () => {
  assert.equal(m.removeEvalAt("\\left. u \\right\\rvert_{\\boundary}"), " u ");
});

test("sortBCsString: sorts ';'-separated clauses alphabetically, dropping empties, trailing ';'", () => {
  assert.equal(
    m.sortBCsString("Top: Periodic; Left: Dirichlet = 0;"),
    "Left: Dirichlet = 0; Top: Periodic;",
  );
  assert.equal(m.sortBCsString(";;"), ";");
});

test("formatLabelNum: formats to the given number of significant figures", () => {
  assert.equal(m.formatLabelNum(3.14159, 3), "3.14");
});

test("shortestStringNum: picks whichever of toFixed/toPrecision is shorter", () => {
  assert.equal(m.shortestStringNum(5, 3), "5.00");
  assert.equal(m.shortestStringNum(0.001234, 3), "0.001");
});

test("formatLabels: uses exponential notation when both values are near zero, otherwise the shortest fixed/precision form", () => {
  assert.deepEqual(m.formatLabels(0.0001, 0.0002), ["1.00e-4", "2.00e-4"]);
  assert.deepEqual(m.formatLabels(1, 200), ["1.00", "200"]);
});

test("diffObjects: returns only the entries of o1 whose value differs (by JSON) from o2's, deep-cloned", () => {
  const o1 = { a: 1, b: 2, c: { x: 1 } };
  const o2 = { a: 1, b: 3, c: { x: 1 } };
  const diff = m.diffObjects(o1, o2);
  assert.deepEqual(diff, { b: 2 });
  // Deep-cloned, not a live reference.
  diff.b = 999;
  assert.equal(o1.b, 2);
});

test("splitArgs: splits on top-level commas only, respecting nested parentheses", () => {
  assert.deepEqual(m.splitArgs("a, b, f(c,d), e"), ["a", "b", "f(c,d)", "e"]);
  assert.deepEqual(m.splitArgs(""), []);
});

test("findAllFunCalls: locates every balanced call to the named function and parses its arguments", () => {
  const calls = m.findAllFunCalls("Gauss(1,2,3) + Bump(x,y) + Gauss(4,5)", "Gauss");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].args, ["1", "2", "3"]);
  assert.deepEqual(calls[1].args, ["4", "5"]);
  assert.equal(m.findAllFunCalls("no calls here", "Gauss").length, 0);
});

test("alternateBracketsGivenDepth: picks the bracket type based on depth parity", () => {
  assert.equal(m.alternateBracketsGivenDepth("(a)", 1), "(a)");
  assert.equal(m.alternateBracketsGivenDepth("(a)", 2), "[a]");
});

test("replaceFunctionInTeX: prefixes a backslash and wraps the argument in braces (optionally keeping the original brackets)", () => {
  assert.equal(m.replaceFunctionInTeX("sqrt(a+b)", "sqrt", true), "\\sqrt{(a+b)}");
  assert.equal(m.replaceFunctionInTeX("abs(a-b)", "abs", false), "\\abs{a-b}");
  assert.equal(m.replaceFunctionInTeX("a+b", "sqrt", true), "a+b");
});

test("enableImageLookupInShader: converts I_S/I_T(...) calls into texture lookups, averaging rgb when no channel is specified", () => {
  const rgb = m.enableImageLookupInShader("I_T(x,y)");
  assert.match(rgb, /texture\(imageSourceTwo,vec2\(\(x-MINX\)\/L_x,\(y-MINY\)\/L_y\)\)\.r/);
  assert.match(rgb, /\)\/3\.0/);
  const single = m.enableImageLookupInShader("I_SR(x,y)");
  assert.equal(single, "texture(imageSourceOne,vec2((x-MINX)/L_x,(y-MINY)/L_y)).r");
});

test("replaceUserDefReac: removes the match for '0', substitutes lettered input directly, leaves scalar input as the original", () => {
  assert.equal(m.replaceUserDefReac("blah f blah", /\bf\b/g, "0"), "blah  blah");
  assert.equal(m.replaceUserDefReac("blah f blah", /\bf\b/g, "2*a"), "blah 2*a blah");
  assert.equal(m.replaceUserDefReac("blah f blah", /\bf\b/g, "2"), "blah f blah");
});

test("replaceUserDefTimescale: special-cases 1/-1, parenthesizes +/- expressions, removes the match entirely when timescales are off", () => {
  m.__setState({ options: { timescales: true } });
  assert.equal(m.replaceUserDefTimescale("X tau Y", /tau/g, "1"), "X  Y");
  assert.equal(m.replaceUserDefTimescale("X tau Y", /tau/g, "-1"), "X - Y");
  assert.equal(m.replaceUserDefTimescale("X tau Y", /tau/g, "a+b"), "X (a+b) Y");
  m.__setState({ options: { timescales: false } });
  assert.equal(m.replaceUserDefTimescale("X tau Y", /tau/g, "a+b"), "X  Y");
});

test("replaceUserDefDiff: special-cases 0/1/-1, otherwise wraps the input in the given delimiters", () => {
  const re = () => /(FOO) (BAR)/g;
  assert.equal(m.replaceUserDefDiff("FOO BAR", re(), "0"), "");
  assert.equal(m.replaceUserDefDiff("FOO BAR", re(), "0.0"), "");
  assert.equal(m.replaceUserDefDiff("FOO BAR", re(), "1"), "BAR");
  assert.equal(m.replaceUserDefDiff("FOO BAR", re(), "-1"), " - BAR");
  assert.equal(m.replaceUserDefDiff("FOO BAR", re(), "2*a"), " 2*a BAR");
  assert.equal(m.replaceUserDefDiff("FOO BAR", re(), "2*a", "[]"), "[2*a]BAR");
});

test("replaceWhiteNoise: substitutes WhiteNoise/WhiteNoise_2-4 with scaled RANDN terms, using dx (1D) or dx^2 (2D+)", () => {
  m.__setState({ numsAsWords: ["zero", "one", "two", "three", "four", "five"] });
  m.__setState({ options: { dimension: 2 } });
  assert.equal(
    m.replaceWhiteNoise("WhiteNoise + WhiteNoise_2"),
    "sqrt(1/(dt*safepow(dx,2)))*RANDN + sqrt(1/(dt*safepow(dx,2)))*RANDNTWO",
  );
  m.__setState({ options: { dimension: 1 } });
  assert.equal(m.replaceWhiteNoise("WhiteNoise"), "sqrt(1/(dt*dx))*RANDN");
});

test("replaceGauss: normalizes every arity of Gauss(...) to the full 7-argument Gauss(x,y,meanx,meany,sx,sy,rho) form", () => {
  assert.equal(m.replaceGauss("Gauss(1,2,3,4,5)"), "Gauss(x,y,1,2,3,4,5)");
  assert.equal(m.replaceGauss("Gauss(1,2,3,4)"), "Gauss(x,y,1,2,3,4,0)");
  assert.equal(m.replaceGauss("Gauss(1,2,3)"), "Gauss(x,y,1,2,3,3,0)");
  assert.equal(m.replaceGauss("Gauss(1,2)"), "Gauss(x,y,1,0.5*L_y,2,2,0)");
  assert.equal(m.replaceGauss("a+b"), "a+b");
});

test("replaceBump: normalizes every arity of Bump(...) to the full 5-argument Bump(x,y,meanx,meany,maxR) form", () => {
  assert.equal(m.replaceBump("Bump(1,2,3)"), "Bump(x,y,1,2,3)");
  assert.equal(m.replaceBump("Bump(1,2)"), "Bump(x,y,1,0.5*L_y,2)");
  assert.equal(m.replaceBump("a+b"), "a+b");
});

test("replaceBinOperator: replaces every top-level match of the given operator with form(match, left, right), respecting balanced brackets", () => {
  const pow = (str) => m.replaceBinOperator(str, "^", (full, p1, p2) => `POW(${p1},${p2})`);
  assert.equal(pow("a^2"), "POW(a,2)");
  assert.equal(pow("(a+b)^2"), "POW((a+b),2)");
  assert.equal(pow("a+b"), "a+b"); // no match, unchanged
});

test("replaceSymbolsInStr: substitutes every whole-word original with its replacement, via placeholders so overlapping names don't clash", () => {
  assert.equal(m.replaceSymbolsInStr("u + v", ["u", "v"], ["prey", "predator"]), "prey + predator");
  assert.equal(
    m.replaceSymbolsInStr("u_x + v", ["u", "v"], ["p", "q"], "_(?:[xy])"),
    "p_x + q",
  );
});

test("timescaleTag: species 1-4 use a letter suffix (matching timescaleTags), species 5-8 use a numeric suffix", () => {
  m.__setState({ defaultSpecies: ["u", "v", "w", "q", "u5", "u6", "u7", "u8"] });
  assert.equal(m.timescaleTag(1), "TU");
  assert.equal(m.timescaleTag(4), "TQ");
  assert.equal(m.timescaleTag(5), "TU5");
});

test("computeColourBrightness: mean of the RGB components", () => {
  assert.equal(m.computeColourBrightness([1, 0.5, 0]), 0.5);
  assert.equal(m.computeColourBrightness([0, 0, 0]), 0);
});
