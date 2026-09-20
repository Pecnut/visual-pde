import { test } from "node:test";
import assert from "node:assert/strict";
import { minifyPreset, maxifyPreset } from "../RD/minify_preset.js";
import { getPreset, getListOfPresetNames } from "../RD/presets.js";

test("minifyPreset: uses the abbreviation table where one exists", () => {
  const mini = minifyPreset({ kineticParams: "a = 1", numSpecies: 2 });
  assert.equal(mini.k, "a = 1");
});

test("minifyPreset: falls back to the original key when no abbreviation exists", () => {
  const mini = minifyPreset({ notARealOption: "x" });
  assert.deepEqual(mini, { notARealOption: "x" });
});

test("maxifyPreset: inverts minifyPreset for a simple object", () => {
  const original = { kineticParams: "a = 1", numSpecies: 2, notARealOption: "x" };
  assert.deepEqual(maxifyPreset(minifyPreset(original)), original);
});

test("minifyPreset/maxifyPreset round-trip every real preset in presets.js without loss", () => {
  const names = getListOfPresetNames();
  assert.ok(names.length > 50, "expected a substantial number of real presets to exist");
  for (const name of names) {
    const original = getPreset(name);
    const roundTripped = maxifyPreset(minifyPreset(original));
    assert.deepEqual(
      roundTripped,
      original,
      `preset "${name}" did not round-trip through minify/maxify - likely an abbreviation collision in minify_preset.js's presetMap()`,
    );
  }
});

test("minifyPreset's abbreviation table has no collisions (every full field name maps to a unique short code)", () => {
  // Collect abbreviations by minifying every field name from every real preset (a superset of
  // presetMap()'s actual table, but sufficient to catch any collision that would corrupt a
  // round-trip); a collision means two different full names minify to the same short code -
  // maxifyPreset can then only recover one of them (TwoWayMap's reverseMap silently drops the
  // other).
  const allFieldNames = new Set();
  for (const name of getListOfPresetNames()) {
    for (const key of Object.keys(getPreset(name))) allFieldNames.add(key);
  }
  const codeToNames = new Map();
  for (const fieldName of allFieldNames) {
    const mini = minifyPreset({ [fieldName]: true });
    const code = Object.keys(mini)[0];
    if (code === fieldName) continue; // no abbreviation defined for this field - not a collision risk
    if (!codeToNames.has(code)) codeToNames.set(code, []);
    codeToNames.get(code).push(fieldName);
  }
  const collisions = [...codeToNames.entries()].filter(([, names]) => names.length > 1);
  assert.deepEqual(
    collisions,
    [],
    `abbreviation collisions found (code -> full names): ${JSON.stringify(collisions)}`,
  );
});
