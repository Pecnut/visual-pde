import { test } from "node:test";
import assert from "node:assert/strict";
import { genericVertexShader } from "../generic_shaders.js";

test("genericVertexShader: passes uv through as textureCoords and sets gl_Position", () => {
  const shader = genericVertexShader();
  assert.match(shader, /textureCoords = uv;/);
  assert.match(shader, /gl_Position = projectionMatrix \* \(modelViewMatrix \* vec4\(position, 1\.0\)\);/);
});
