import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearShaderTop,
  clearShaderBot,
  clearShaderTopMRT,
  clearShaderBotMRT,
} from "../RD/clear_shader.js";

test("clearShaderTop/Bot: non-empty, contain expected placeholders", () => {
  assert.match(clearShaderTop(), /AUXILIARY_GLSL_FUNS/);
  assert.match(clearShaderBot(), /gl_FragColor = vec4\(u, v, w, q\);/);
});

// Regression: minX/minY are free-text fields (getUserTextFields() in presets.js) that get
// compiled into every shader via replaceMINXMINY(), including this one (used for MINX/MINY in
// setClearShader()) - so Int(...) used in minX/minY must resolve to a declared uniform here
// too, or the shader fails to compile ("Unknown symbol: globalIntegralValueN").
test("clearShaderTop: declares the globalIntegralValue1-4 uniforms Int(...) needs (minX/minY)", () => {
  const top = clearShaderTop();
  for (let i = 1; i <= 4; i++) {
    assert.match(top, new RegExp(`uniform float globalIntegralValue${i};`));
  }
});

test("clearShaderTopMRT: derived from clearShaderTop() with dual fragColor outputs added", () => {
  const mrt = clearShaderTopMRT();
  assert.match(mrt, /layout\(location = 0\) out highp vec4 fragColor0;/);
  assert.match(mrt, /layout\(location = 1\) out highp vec4 fragColor1;/);
  // Everything else about the top shader should be preserved verbatim.
  assert.match(mrt, /AUXILIARY_GLSL_FUNS/);
  assert.match(mrt, /erfinv/);
});

test("clearShaderBotMRT: writes group 0's (u,v,w,q) to fragColor0 and group 1's (u5-u8) to fragColor1", () => {
  const mrt = clearShaderBotMRT();
  assert.match(mrt, /fragColor0 = vec4\(u, v, w, q\);/);
  assert.match(mrt, /fragColor1 = vec4\(u5, u6, u7, u8\);/);
});
