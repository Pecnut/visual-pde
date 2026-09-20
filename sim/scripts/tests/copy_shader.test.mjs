import { test } from "node:test";
import assert from "node:assert/strict";
import { copyShader, copyShaderMRT } from "../copy_shader.js";

test("copyShader: samples textureSource straight through to gl_FragColor", () => {
  assert.match(copyShader(), /gl_FragColor = texture2D\(textureSource, textureCoords\);/);
});

test("copyShaderMRT: copies both groups through their own dual outputs", () => {
  const mrt = copyShaderMRT();
  assert.match(mrt, /uniform sampler2D textureSourceGroup1;/);
  assert.match(mrt, /layout\(location = 0\) out highp vec4 fragColor0;/);
  assert.match(mrt, /layout\(location = 1\) out highp vec4 fragColor1;/);
  assert.match(mrt, /fragColor0 = texture2D\(textureSource, textureCoords\);/);
  assert.match(mrt, /fragColor1 = texture2D\(textureSourceGroup1, textureCoords\);/);
});
