/**
 * Shared species/channel index arithmetic for the reaction-diffusion simulator.
 *
 * Simulation state is packed into groups of `CHANNELS_PER_GROUP` texture channels (r,g,b,a).
 * A species' 0-based index (its position in `listOfSpecies`) determines which group it lives
 * in and which channel within that group holds its value. This module is the single source
 * of truth for that arithmetic, so a future extension beyond `MAX_SPECIES_SUPPORTED` only
 * needs to bump the constants/UI ranges, not rederive the index math.
 *
 * See /Users/ben/.claude/plans/i-m-planning-a-major-jazzy-zebra.md (Stage 1) for the design
 * this module implements and /Users/ben/.claude/plans/8-species-upgrade-progress.md for
 * per-stage implementation notes.
 * @file
 */

export const CHANNELS_PER_GROUP = 4;

// Current UI ceiling. Bump this (and the numSpecies/numAlgebraicSpecies dropdown ranges in
// main.js, and every other spot flagged "hardcoded ceiling" in the plan's summary table) to
// extend support to 12/16 species in a future upgrade.
export const MAX_SPECIES_SUPPORTED = 8;

/**
 * @param {number} numSpecies - Total number of active species.
 * @returns {number} Number of texture groups (each holding up to CHANNELS_PER_GROUP species) needed.
 */
export function numGroups(numSpecies) {
  return Math.ceil(numSpecies / CHANNELS_PER_GROUP);
}

/**
 * @param {number} speciesInd - 0-based index into listOfSpecies.
 * @returns {number} 0-based index of the texture group holding this species.
 */
export function groupOfSpecies(speciesInd) {
  return Math.floor(speciesInd / CHANNELS_PER_GROUP);
}

/**
 * @param {number} speciesInd - 0-based index into listOfSpecies.
 * @returns {number} 0-3 channel index within the species' group.
 */
export function channelOfSpecies(speciesInd) {
  return speciesInd % CHANNELS_PER_GROUP;
}

/**
 * @param {number} speciesInd - 0-based index into listOfSpecies.
 * @returns {string} The rgba channel character ("r","g","b", or "a") within the species' group.
 */
export function channelCharOfSpecies(speciesInd) {
  return "rgba"[channelOfSpecies(speciesInd)];
}

// GLSL reaction-term token name for each species index (0-based). Species 1-4 keep their
// legacy per-letter names (matching main.js's defaultReactions array from Stage 1); species
// 5-8 have no natural letter, so they use a numeric suffix on "UFUN". If either list changes,
// change both - this one exists so simulation_shaders.js's MRT shader builders (Stage 4) and
// main.js's diffusion/reaction string builders (Stage 5) reference the exact same token names.
const REACTION_TOKENS = [
  "UFUN",
  "VFUN",
  "WFUN",
  "QFUN",
  "UFUN5",
  "UFUN6",
  "UFUN7",
  "UFUN8",
];

/**
 * @param {number} speciesInd - 0-based index into listOfSpecies.
 * @returns {string} The GLSL float variable name holding this species' parsed reaction term.
 */
export function reactionTokenOfSpecies(speciesInd) {
  return REACTION_TOKENS[speciesInd];
}

const SPECIES_LETTERS = ["u", "v", "w", "q"];

/**
 * GLSL diffusion-coefficient label for the (i,j) species-index pair (0-based), used to build
 * tokens like "Duu"/"DuuxL" (both indices <4: legacy letter-pair, byte-identical to the
 * pre-upgrade naming) or "D5_5"/"D1_5xL" (either index >=4: numeric-pair, since species 5-8
 * have no natural letter). Shared between simulation_shaders.js (which references these
 * tokens in generated GLSL) and main.js's diffusion-string builders (which define them) -
 * both must use this function rather than reimplementing the naming rule.
 * @param {number} i - 0-based species index (the diffusing/row species).
 * @param {number} j - 0-based species index (the coefficient's other index/column species).
 * @returns {string} The label to append to "D" (and further to "x"/"y"/"xL" etc suffixes).
 */
export function diffusionLabel(i, j) {
  if (i < 4 && j < 4) return SPECIES_LETTERS[i] + SPECIES_LETTERS[j];
  return (i + 1).toString() + "_" + (j + 1).toString();
}
