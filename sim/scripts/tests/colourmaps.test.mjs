import { test } from "node:test";
import assert from "node:assert/strict";
import { getColours } from "../colourmaps.js";

const KNOWN_MAPS = [
  "redGreen",
  "fireOnTerrain",
  "splitscreenFires",
  "cyclic",
  "pride",
  "terrain",
  "squirrels",
  "chemicalBlue",
  "chemicalYellow",
  "chemicalGreen",
  "spooky",
  "retro",
  "greyscale",
  "urbanFlooding",
  "BlackGreenYellowRedWhite",
  "viridis",
  "turbo",
  "blue-magenta",
  "diverging",
  "thermal",
  "snowghost",
  "midnight",
  "lavaflow",
  "ice",
  "pastels",
  "foliage",
  "water",
  "blue",
];

test("getColours: every known colourmap returns 5 [r,g,b,stop] control points", () => {
  // Note: stops don't always span 0..1 (e.g. "blue" is a flat solid colour, all 5 points at
  // stop 0.75; "ice" tops out at 0.8) - that's real, intentional colourmap data, not something
  // to assert a fixed shape on here.
  for (const name of KNOWN_MAPS) {
    const colours = getColours(name);
    assert.equal(colours.length, 5, `${name} should have 5 control points`);
    for (const c of colours) {
      assert.equal(c.length, 4, `${name} control point should be [r,g,b,stop]`);
      assert.ok(c.every((n) => typeof n === "number"), `${name} control point values should all be numbers`);
    }
  }
});

test("getColours: unknown/undefined selector returns an empty array", () => {
  assert.deepEqual(getColours("not-a-real-colourmap"), []);
  assert.deepEqual(getColours(undefined), []);
});
