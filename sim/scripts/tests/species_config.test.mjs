import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHANNELS_PER_GROUP,
  MAX_SPECIES_SUPPORTED,
  numGroups,
  groupOfSpecies,
  channelOfSpecies,
  channelCharOfSpecies,
  reactionTokenOfSpecies,
  diffusionLabel,
} from "../RD/species_config.js";

test("constants", () => {
  assert.equal(CHANNELS_PER_GROUP, 4);
  assert.equal(MAX_SPECIES_SUPPORTED, 8);
});

test("numGroups", () => {
  assert.equal(numGroups(1), 1);
  assert.equal(numGroups(4), 1);
  assert.equal(numGroups(5), 2);
  assert.equal(numGroups(8), 2);
});

test("groupOfSpecies", () => {
  for (let i = 0; i < 4; i++) assert.equal(groupOfSpecies(i), 0);
  for (let i = 4; i < 8; i++) assert.equal(groupOfSpecies(i), 1);
});

test("channelOfSpecies / channelCharOfSpecies", () => {
  const expectedChars = ["r", "g", "b", "a", "r", "g", "b", "a"];
  for (let i = 0; i < 8; i++) {
    assert.equal(channelOfSpecies(i), i % 4);
    assert.equal(channelCharOfSpecies(i), expectedChars[i]);
  }
});

test("reactionTokenOfSpecies", () => {
  assert.equal(reactionTokenOfSpecies(0), "UFUN");
  assert.equal(reactionTokenOfSpecies(1), "VFUN");
  assert.equal(reactionTokenOfSpecies(2), "WFUN");
  assert.equal(reactionTokenOfSpecies(3), "QFUN");
  assert.equal(reactionTokenOfSpecies(4), "UFUN5");
  assert.equal(reactionTokenOfSpecies(7), "UFUN8");
});

test("diffusionLabel: both indices <4 use legacy letter pairs", () => {
  assert.equal(diffusionLabel(0, 0), "uu");
  assert.equal(diffusionLabel(0, 1), "uv");
  assert.equal(diffusionLabel(3, 2), "qw");
});

test("diffusionLabel: either index >=4 uses numeric pairs", () => {
  assert.equal(diffusionLabel(4, 4), "5_5");
  assert.equal(diffusionLabel(0, 4), "1_5");
  assert.equal(diffusionLabel(4, 0), "5_1");
  assert.equal(diffusionLabel(7, 7), "8_8");
});
