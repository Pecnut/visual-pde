import { test } from "node:test";
import assert from "node:assert/strict";
import {
  drawShaderTop,
  drawShaderTopMRT,
  drawShaderShapeDisc,
  drawShaderShapeVLine,
  drawShaderShapeHLine,
  drawShaderShapeSquare,
  drawShaderFactorSharp,
  drawShaderFactorSmooth,
  drawShaderCustom,
  drawShaderBotReplace,
  drawShaderBotAdd,
  drawShaderBotReplaceMRT,
  drawShaderBotAddMRT,
  uvFragShader,
} from "../RD/drawing_shaders.js";

test("drawShaderTop: non-empty, contains expected placeholders", () => {
  assert.match(drawShaderTop(), /AUXILIARY_GLSL_FUNS/);
  assert.match(drawShaderTop(), /brushCoords/);
});

test("drawShaderTop: declares the globalIntegralValue1-4 uniforms Int(...) needs (brushValue)", () => {
  const top = drawShaderTop();
  for (let i = 1; i <= 4; i++) {
    assert.match(top, new RegExp(`uniform float globalIntegralValue${i};`));
  }
});

test("drawShaderTopMRT: adds textureSourceGroup1 sampler and dual fragColor outputs, samples group 1", () => {
  const mrt = drawShaderTopMRT();
  assert.match(mrt, /uniform sampler2D textureSourceGroup1;/);
  assert.match(mrt, /layout\(location = 0\) out highp vec4 fragColor0;/);
  assert.match(mrt, /layout\(location = 1\) out highp vec4 fragColor1;/);
  assert.match(mrt, /fragColor0 = uvwq;/);
  assert.match(mrt, /fragColor1 = uvwq2;/);
  assert.doesNotMatch(mrt, /gl_FragColor = uvwq;/);
});

test("shape shaders: each sets 'distance' using the expected geometry", () => {
  assert.match(drawShaderShapeDisc(), /distance = length\(diff \* vec2\(L_x, L_y\)\);/);
  assert.match(drawShaderShapeVLine(), /distance = L_x \* length\(diff\.x\);/);
  assert.match(drawShaderShapeHLine(), /distance = L_y \* length\(diff\.y\);/);
  assert.match(drawShaderShapeSquare(), /distance = max\(abs\(L_x \* diff\.x\),abs\(L_y \* diff\.y\)\);/);
});

test("factor shaders: sharp uses a step function, smooth uses Bump", () => {
  assert.match(drawShaderFactorSharp(), /factor = float\(distance <= brushRadius\);/);
  assert.match(drawShaderFactorSmooth(), /factor = Bump\(distance, 0\.0, 0\.0, 0\.0, brushRadius\);/);
});

test("drawShaderCustom: binary factor based on brushRadius", () => {
  const shader = drawShaderCustom();
  assert.match(shader, /if \(brushRadius > 0\.0\)/);
  assert.match(shader, /factor = 1\.0;/);
  assert.match(shader, /factor = 0\.0;/);
});

test("drawShaderBotReplace/Add: use gl_FragColor.COLOURSPEC placeholder", () => {
  assert.match(drawShaderBotReplace(), /gl_FragColor\.COLOURSPEC = brushValueModifier \* brushValue \* factor;/);
  assert.match(drawShaderBotAdd(), /gl_FragColor\.COLOURSPEC = uvwq\.COLOURSPEC \+ brushValueModifier \* brushValue \* factor;/);
});

test("drawShaderBotReplaceMRT/AddMRT: use FRAGCOLOR/UVWQGROUP placeholders instead of gl_FragColor/uvwq", () => {
  const replaceMRT = drawShaderBotReplaceMRT();
  assert.match(replaceMRT, /FRAGCOLOR\.COLOURSPEC = brushValueModifier \* brushValue \* factor;/);
  assert.doesNotMatch(replaceMRT, /gl_FragColor/);

  const addMRT = drawShaderBotAddMRT();
  assert.match(addMRT, /FRAGCOLOR\.COLOURSPEC = UVWQGROUP\.COLOURSPEC \+ brushValueModifier \* brushValue \* factor;/);
  assert.doesNotMatch(addMRT, /gl_FragColor|uvwq\.COLOURSPEC/);
});

test("uvFragShader: colours by texture coordinates", () => {
  assert.match(uvFragShader(), /gl_FragColor = vec4\(textureCoords, 0\.0, 1\.0\);/);
});
