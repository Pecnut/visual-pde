import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fiveColourDisplayTop,
  fiveColourDisplayBot,
  embossShader,
  contourShader,
  overlayShader,
  fiveColourDisplayTopMRT,
  overlayShaderMRT,
  largestSpeciesShader,
  surfaceVertexShaderColour,
  surfaceVertexShaderCustom,
} from "../RD/display_shaders.js";

test("fiveColourDisplayTop: declares the globalIntegralValue1-4 uniforms Int(...) needs (overlayExpr)", () => {
  const top = fiveColourDisplayTop();
  for (let i = 1; i <= 4; i++) {
    assert.match(top, new RegExp(`uniform float globalIntegralValue${i};`));
  }
});

test("fiveColourDisplayTop/Bot: non-empty, contain expected placeholders/colour ramp", () => {
  const top = fiveColourDisplayTop();
  assert.match(top, /AUXILIARY_GLSL_FUNS/);
  assert.match(top, /colFromValue/);
  assert.match(fiveColourDisplayBot(), /gl_FragColor = vec4\(col, 1\.0\);/);
});

test("embossShader/contourShader: non-empty fragments referencing expected uniforms", () => {
  assert.match(embossShader(), /embossLightDir/);
  assert.match(contourShader(), /contourStep/);
});

test("overlayShader: samples the 5-point stencil and substitutes OVERLAYEXPR", () => {
  const shader = overlayShader();
  assert.match(shader, /OVERLAYEXPR/);
  assert.match(shader, /uvwqL = texture2D\(textureSource1/);
  assert.match(shader, /uvwqR = texture2D\(textureSource1/);
});

test("fiveColourDisplayTopMRT: adds textureSourceGroup1 sampler alongside textureSource1", () => {
  const mrt = fiveColourDisplayTopMRT();
  assert.match(mrt, /uniform sampler2D textureSource1;\s*\n\s*uniform sampler2D textureSourceGroup1;/);
  // Everything else about the base shader should be preserved.
  assert.match(mrt, /colFromValue/);
});

test("overlayShaderMRT: injects group-1 stencil sampling before the OVERLAYEXPR substitution", () => {
  const mrt = overlayShaderMRT();
  assert.match(mrt, /uvwq2 = texture2D\(textureSourceGroup1, textureCoords\);/);
  const group1Index = mrt.indexOf("uvwq2 = texture2D(textureSourceGroup1");
  const overlayIndex = mrt.indexOf("float overlayExpr = OVERLAYEXPR;");
  assert.ok(group1Index >= 0 && overlayIndex >= 0 && group1Index < overlayIndex);
});

test("largestSpeciesShader/surfaceVertexShaderColour/Custom: non-empty, minimal shaders", () => {
  assert.match(largestSpeciesShader(), /gl_FragColor = texture2D\(textureSource, textureCoords\);/);
  assert.match(surfaceVertexShaderColour(), /heightScale/);
  assert.match(surfaceVertexShaderCustom(), /newPosition\.z \+= value;/);
});
