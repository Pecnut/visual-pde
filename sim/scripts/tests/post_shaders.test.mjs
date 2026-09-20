import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDisplayFunShaderTop,
  computeDisplayFunShaderMid,
  computeDisplayFunShaderTopMRT,
  computeDisplayFunShaderMidMRT,
  postShaderDomainIndicatorVField,
  postShaderDomainIndicator,
  postGenericShaderBot,
  interpolationShader,
  minMaxShader,
  sumShader,
  probeShader,
  probeShaderMRT,
} from "../RD/post_shaders.js";

// Every field Int(...) can be used in (see getUserTextFields()) has to be compiled into a
// shader that declares these 4 uniforms, or parseShaderString's Int(...) -> globalIntegralValueN
// substitution produces a reference to an undeclared uniform - a GLSL compile error. Checked
// wherever a View-eligible field (whatToPlot/surfaceFun/arrowX/arrowY here, probeFun/X/Y below)
// gets compiled.
function assertDeclaresGlobalIntegralUniforms(shaderSrc) {
  for (let i = 1; i <= 4; i++) {
    assert.match(shaderSrc, new RegExp(`uniform float globalIntegralValue${i};`));
  }
}

test("computeDisplayFunShaderTop: declares the globalIntegralValue1-4 uniforms Int(...) needs (whatToPlot/surfaceFun/arrowX/arrowY)", () => {
  assertDeclaresGlobalIntegralUniforms(computeDisplayFunShaderTop());
});

test("probeShader: declares the globalIntegralValue1-4 uniforms Int(...) needs (probeFun/probeX/probeY)", () => {
  assertDeclaresGlobalIntegralUniforms(probeShader());
});

test("computeDisplayFunShaderTop/Mid: non-empty, contain expected placeholders", () => {
  assert.match(computeDisplayFunShaderTop(), /AUXILIARY_GLSL_FUNS/);
  const mid = computeDisplayFunShaderMid();
  for (const placeholder of ["FUN", "HEIGHT", "XVECFUN", "YVECFUN", "OVERLAYEXPR", "VECFIELDPLACEHOLDER"]) {
    assert.match(mid, new RegExp(placeholder), `missing ${placeholder}`);
  }
});

test("computeDisplayFunShaderTopMRT: adds textureSourceGroup1 sampler", () => {
  const mrt = computeDisplayFunShaderTopMRT();
  assert.match(mrt, /uniform sampler2D textureSource;\s*\n\s*uniform sampler2D textureSourceGroup1;/);
});

test("computeDisplayFunShaderMidMRT: injects group-1 stencil sampling before 'float value = FUN;'", () => {
  const mrt = computeDisplayFunShaderMidMRT();
  const group1Index = mrt.indexOf("uvwq2 = texture2D(textureSourceGroup1");
  const valueIndex = mrt.lastIndexOf("float value = FUN;");
  assert.ok(group1Index >= 0 && valueIndex >= 0 && group1Index < valueIndex);
  // The base (non-MRT) shader's own "float value = FUN;" should still appear exactly once.
  assert.equal(mrt.split("float value = FUN;").length - 1, 1);
});

test("postShaderDomainIndicatorVField: substitutes fun's x/y/uvwq references for each of the 4 stencil directions", () => {
  const shader = postShaderDomainIndicatorVField("uvwq.r * x");
  assert.match(shader, /uvwqL\.r \* \(x-dx\)/);
  assert.match(shader, /uvwqR\.r \* \(x\+dx\)/);
  // The T/B substitutions operate on \by\b, which is absent from this fun string, so they
  // should leave the x-substituted text as-is except for swapping the channel to T/B.
  assert.match(shader, /uvwqT\.r \* x/);
  assert.match(shader, /uvwqB\.r \* x/);
});

test("postShaderDomainIndicator/postGenericShaderBot: minimal fixed fragments", () => {
  assert.match(postShaderDomainIndicator(), /gl_FragColor\.g = float\(float\(indicatorFun\) <= 0\.0\);/);
  assert.equal(postGenericShaderBot(), "}");
});

test("interpolationShader/minMaxShader/sumShader: non-empty, self-contained shaders", () => {
  assert.match(interpolationShader(), /Bilinear interpolation/);
  assert.match(minMaxShader(), /gl_FragColor = vec4\(minVal, maxVal, 0\.0, 0\.0\);/);
  assert.match(sumShader(), /gl_FragColor = sumVal;/);
  assert.match(sumShader(), /vec4 sumVal = vec4\(0\.0\);/); // sums all 4 channels independently
});

test("probeShader: contains PROBE_FUN/PROBE_X/PROBE_Y placeholders and the 9-point stencil", () => {
  const shader = probeShader();
  for (const placeholder of ["PROBE_FUN", "PROBE_X", "PROBE_Y"]) {
    assert.match(shader, new RegExp(placeholder));
  }
  assert.match(shader, /uvwqLL/);
  assert.match(shader, /uvwqRR/);
});

test("probeShaderMRT: adds textureSourceGroup1 sampler and group-1 9-point stencil before derivative computation", () => {
  const mrt = probeShaderMRT();
  assert.match(mrt, /uniform sampler2D textureSourceGroup1;/);
  assert.match(mrt, /uvwq2LL = texture2D\(textureSourceGroup1/);
  const group1Index = mrt.indexOf("// Sample (group 1).");
  const derivIndex = mrt.indexOf("// Compute derivatives.\n      vec4 uvwqX");
  assert.ok(group1Index >= 0 && derivIndex >= 0 && group1Index < derivIndex);
});
