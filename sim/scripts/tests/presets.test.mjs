import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPreset,
  getResolvedPreset,
  getListOfPresetNames,
  coerceOptions,
  getUserTextFields,
  getFieldsInView,
  getOldPresetFieldsToNew,
} from "../RD/presets.js";

test("getPreset(): unknown/null id falls back to the default preset", () => {
  const byNull = getPreset(null);
  const byUnknown = getPreset("this-preset-does-not-exist");
  const byDefault = getPreset("default");
  assert.deepEqual(byNull, byDefault);
  assert.deepEqual(byUnknown, byDefault);
});

test("getPreset(): case-insensitive lookup", () => {
  const names = getListOfPresetNames().filter((n) => n !== "default");
  assert.ok(names.length > 0);
  const name = names[0];
  assert.deepEqual(getPreset(name.toUpperCase()), getPreset(name));
});

test("getPreset(): returns an independent copy each call (mutating one doesn't affect another)", () => {
  const a = getPreset("default");
  const b = getPreset("default");
  a.numSpecies = 999;
  assert.notEqual(b.numSpecies, 999);
});

test("getResolvedPreset(): fills in fields inherited from a parent that the child preset doesn't redeclare itself (e.g. 'expressions')", () => {
  // penguinsInOut inherits from penguinsBlobStatic, which declares
  // `expressions`, but penguinsInOut does not declare it itself - so
  // getPreset() alone won't see it, only getResolvedPreset() will.
  const child = getPreset("penguinsInOut");
  assert.ok(!Object.hasOwn(child, "expressions"));
  const parent = getPreset("penguinsBlobStatic");
  assert.ok(Object.hasOwn(parent, "expressions"));

  const resolved = getResolvedPreset("penguinsInOut");
  assert.equal(resolved.expressions, parent.expressions);
});

test("getResolvedPreset(): resolves a multi-level parent chain all the way to 'default' (e.g. GrayScottPorousMedia, which has a 3-level chain)", () => {
  const defaultPreset = getPreset("default");
  const resolved = getResolvedPreset("GrayScottPorousMedia");
  // Every field on the default preset is present on the fully resolved
  // result, even fields not touched by any preset in the chain.
  for (const key of Object.keys(defaultPreset)) {
    assert.ok(Object.hasOwn(resolved, key), `expected resolved preset to have field "${key}"`);
  }
  // And the leaf's own overrides win over anything inherited.
  const leaf = getPreset("GrayScottPorousMedia");
  for (const [key, value] of Object.entries(leaf)) {
    assert.deepEqual(resolved[key], value);
  }
});

test("getResolvedPreset(): matches getPreset('default') for a preset with no parent", () => {
  assert.deepEqual(getResolvedPreset("default"), getPreset("default"));
});

test("getListOfPresetNames(): includes 'default' and a substantial number of named presets", () => {
  const names = getListOfPresetNames();
  assert.ok(names.includes("default"));
  assert.ok(names.length > 50);
});

test("coerceOptions() normalizes every real preset's fields to presets['default']'s types (not all hand-written presets are already perfectly typed - e.g. 'Polar diffusion' has numSpecies as a string - this is exactly what coerceOptions() exists to fix up at load time)", () => {
  const defaultPreset = getPreset("default");
  for (const name of getListOfPresetNames()) {
    const preset = getPreset(name);
    coerceOptions(preset);
    for (const [key, value] of Object.entries(preset)) {
      if (!Object.hasOwn(defaultPreset, key)) continue;
      const expectedType = typeof defaultPreset[key];
      if (expectedType === "number" || expectedType === "boolean" || expectedType === "string") {
        assert.equal(
          typeof value,
          expectedType,
          `preset "${name}" field "${key}" expected ${expectedType}, got ${typeof value} (${JSON.stringify(value)})`,
        );
      }
    }
  }
});

test("coerceOptions(): coerces stringly-typed values to the default's real type, in place", () => {
  const options = { numSpecies: "3", crossDiffusion: "true", kineticParams: 5 };
  coerceOptions(options);
  assert.equal(options.numSpecies, 3);
  assert.equal(typeof options.numSpecies, "number");
  assert.equal(options.crossDiffusion, true);
  assert.equal(options.kineticParams, "5");
});

test("coerceOptions(): leaves fields not present in the default preset untouched", () => {
  const options = { notARealOption: "x" };
  coerceOptions(options);
  assert.equal(options.notARealOption, "x");
});

test("getUserTextFields()/getFieldsInView(): non-empty arrays of unique string field names", () => {
  for (const fields of [getUserTextFields(), getFieldsInView()]) {
    assert.ok(Array.isArray(fields));
    assert.ok(fields.length > 0);
    assert.ok(fields.every((f) => typeof f === "string"));
    assert.equal(new Set(fields).size, fields.length, "expected no duplicate field names");
  }
});

test("getOldPresetFieldsToNew(): maps every legacy field name to a field that exists on the default preset", () => {
  const mapping = getOldPresetFieldsToNew();
  const defaultPreset = getPreset("default");
  assert.ok(Object.keys(mapping).length > 0);
  for (const [oldName, newName] of Object.entries(mapping)) {
    assert.ok(
      Object.hasOwn(defaultPreset, newName),
      `getOldPresetFieldsToNew()["${oldName}"] = "${newName}", but "${newName}" is not a field on presets["default"]`,
    );
  }
});
