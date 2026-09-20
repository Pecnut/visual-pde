import { test } from "node:test";
import assert from "node:assert/strict";
import { randShader, randNShader } from "../rand_shader.js";

test("randShader: declares RAND and RANDVAL uniform-noise locals", () => {
  const shader = randShader();
  assert.match(shader, /float RAND = /);
  assert.match(shader, /float RANDVAL = /);
});

test("randNShader: declares four independent normal-noise locals via erfinv", () => {
  const shader = randNShader();
  for (const name of ["RANDN", "RANDNTWO", "RANDNTHREE", "RANDNFOUR"]) {
    assert.match(shader, new RegExp(`float ${name} = `));
  }
  assert.match(shader, /erfinv/);
});
