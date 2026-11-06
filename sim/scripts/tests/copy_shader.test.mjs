import { test } from "node:test";
import assert from "node:assert/strict";
import { copyShader, copyShaderMRT, exactCopyShader, checkpointShaderMRT } from "../copy_shader.js";

test("copyShader: samples textureSource straight through to gl_FragColor", () => {
  assert.match(copyShader(), /gl_FragColor = textureBilinear\(textureSource, textureCoords\);/);
});

test("copyShaderMRT: copies both groups through their own dual outputs", () => {
  const mrt = copyShaderMRT();
  assert.match(mrt, /uniform sampler2D textureSourceGroup1;/);
  assert.match(mrt, /layout\(location = 0\) out highp vec4 fragColor0;/);
  assert.match(mrt, /layout\(location = 1\) out highp vec4 fragColor1;/);
  assert.match(mrt, /fragColor0 = textureBilinear\(textureSource, textureCoords\);/);
  assert.match(mrt, /fragColor1 = textureBilinear\(textureSourceGroup1, textureCoords\);/);
});

test("exactCopyShader: fetches the texel under each fragment, without interpolating", () => {
  const exact = exactCopyShader();
  assert.match(exact, /gl_FragColor = texelFetch\(textureSource, ivec2\(gl_FragCoord\.xy\), 0\);/);
  assert.doesNotMatch(exact, /textureBilinear|textureCoords/);
});

test("checkpointShaderMRT: samples both checkpoint textures at the cropped coordinates", () => {
  const shader = checkpointShaderMRT();
  assert.match(shader, /vec2 uv = textureCoords \* checkpointRepeat \+ checkpointOffset;/);
  assert.match(shader, /fragColor0 = texture\(textureSource, uv\);/);
  assert.match(shader, /fragColor1 = texture\(textureSourceGroup1, uv\);/);
});
