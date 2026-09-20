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
