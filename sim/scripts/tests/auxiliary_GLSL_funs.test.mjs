import { test } from "node:test";
import assert from "node:assert/strict";
import { auxiliary_GLSL_funs } from "../auxiliary_GLSL_funs.js";

test("auxiliary_GLSL_funs: defines every helper function referenced elsewhere in the shader pipeline", () => {
  const glsl = auxiliary_GLSL_funs();
  for (const fn of ["H(float VALUE)", "safetanh", "safepow", "Gauss", "Bump"]) {
    assert.match(glsl, new RegExp(fn.replace(/[()]/g, "\\$&")), `missing ${fn}`);
  }
  assert.match(glsl, /const float pi = 3\.141592653589793;/);
});

test("auxiliary_GLSL_funs: textureBilinear interpolates between the four surrounding texel centres, snapping near-centre weights", () => {
  const src = auxiliary_GLSL_funs();
  assert.match(src, /vec4 textureBilinear\(sampler2D TEX, vec2 UV\)/);
  assert.match(src, /vec2 ST = UV \* SIZE - 0\.5;/);
  assert.match(src, /lessThan\(FRAC, vec2\(1e-4\)\)/);
  assert.match(src, /greaterThan\(FRAC, vec2\(1\.0 - 1e-4\)\)/);
});

// getReservedStrs() in main.js reserves every name declared in these helpers (it scrapes
// "float NAME", "vec2 NAME" etc.), so new locals mustn't take names users might choose.
test("auxiliary_GLSL_funs: declares no new lowercase names that would be reserved from users", () => {
  // Names that were already reserved before this check existed.
  const allowed = ["pi", "isTwoD", "safetanh", "safepow", "x", "y", "yDiff", "textureBilinear"];
  const declared = [...auxiliary_GLSL_funs().matchAll(/(?:float|vec\d|ivec\d|function|void)\b\s+(\w+)\b/g)].map((m) => m[1]);
  const lowercase = declared.filter((name) => /[a-z]/.test(name) && !/^[A-Z]/.test(name) && !allowed.includes(name));
  assert.deepEqual(lowercase, []);
});

test("auxiliary_GLSL_funs: safepow takes its sign for x < 0 from y rounded with halves away from zero", () => {
  // Run safepow's GLSL body as JS.
  const src = auxiliary_GLSL_funs();
  const start = src.indexOf("{", src.indexOf("float safepow(float x, float y)"));
  let depth = 0,
    end = start;
  for (; end < src.length; end++) {
    if (src[end] == "{") depth++;
    if (src[end] == "}" && --depth == 0) break;
  }
  const body = src.slice(start + 1, end).replaceAll(/\bfloat\b/g, "let");
  const safepow = (x, y) =>
    new Function("x", "y", "trunc", "abs", "sign", "mod", "pow", body)(
      x,
      y,
      Math.trunc,
      Math.abs,
      Math.sign,
      (a, b) => a - b * Math.floor(a / b),
      Math.pow,
    );
  assert.equal(safepow(4, 0.5), 2);
  assert.equal(safepow(-2, 2), 4);
  assert.equal(safepow(-2, 3), -8);
  // Halves round away from zero: 0.5 -> 1, 2.5 -> 3, -0.5 -> -1, 1.5 -> 2.
  assert.equal(safepow(-4, 0.5), -2);
  assert.equal(safepow(-4, 2.5), -32);
  assert.equal(safepow(-4, -0.5), -0.5);
  assert.equal(safepow(-4, 1.5), 8);
  // Otherwise to the nearest integer.
  assert.equal(safepow(-4, 2.4), Math.pow(4, 2.4));
  assert.equal(safepow(-4, 2.6), -Math.pow(4, 2.6));
});
