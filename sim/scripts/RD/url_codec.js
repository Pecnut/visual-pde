// url_codec.js
//
// Encodes the simulation configuration for the options search/hash parameter of a link, and
// decodes it again, including every format that has been used for links in the past.
//
// Formats:
//  - Legacy: LZString.compressToEncodedURIComponent of the JSON of the options that differ
//    from the default preset, optionally with the field names minified (detected by the
//    presence of the minified "preset" key, "p"). Its alphabet is A-Za-z0-9+-$.
//  - "_1" + base64url(raw deflate(JSON)), compressed against a frozen dictionary
//    (url_codec_v1_data.js). "_" never appears in the legacy alphabet, so the two can't be
//    confused. The JSON holds the minified fields that differ from a frozen snapshot of the
//    default preset (BASE_V1), rather than the live default, so that links are unaffected by
//    later changes to the default. Fields of each view that match the top level are left out,
//    and filled back in when decoding, as these make up the bulk of most configurations.
//
// The data behind a format must never change once links using it exist. To change the
// dictionary or base, add a new version ("_2", ...) alongside the old ones.

import { deflateSync, inflateSync } from "../fflate.min.js";
import { LZString } from "../lz-string.min.js";
import { minifyPreset, maxifyPreset } from "./minify_preset.js";
import { BASE_V1, VIEW_FIELDS_V1, DICT_V1 } from "./url_codec_v1_data.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const dictV1 = textEncoder.encode(DICT_V1);
const json = JSON.stringify;

/**
 * Returns the JSON that format v1 compresses: the minified fields of options that differ from
 * BASE_V1, with each view stripped of the fields that it shares with the top level.
 * @param {Object} options - The full options of the simulation.
 * @returns {string} The JSON payload.
 */
export function payloadV1(options) {
  const delta = {};
  for (const [key, value] of Object.entries(options)) {
    if (key == "preset" || key == "parent") continue;
    if (json(BASE_V1[key]) !== json(value)) delta[key] = value;
  }
  if (Array.isArray(delta.views)) {
    // The top level as the decoder will reconstruct it.
    const top = Object.assign({}, BASE_V1, delta);
    delta.views = delta.views.map((view) =>
      Object.fromEntries(
        Object.entries(view).filter(
          ([key, value]) =>
            !(
              VIEW_FIELDS_V1.includes(key) &&
              key in top &&
              json(top[key]) === json(value)
            ),
        ),
      ),
    );
  }
  return json(minifyPreset(delta));
}

/**
 * Inverts payloadV1, returning a complete options object.
 * @param {string} payload - The JSON payload.
 * @returns {Object} The options.
 */
function optionsFromPayloadV1(payload) {
  const delta = maxifyPreset(JSON.parse(payload));
  const options = Object.assign(JSON.parse(json(BASE_V1)), delta);
  options.views = options.views.map(function (view) {
    const fullView = {};
    VIEW_FIELDS_V1.forEach(function (key) {
      if (key in options) fullView[key] = JSON.parse(json(options[key]));
    });
    return Object.assign(fullView, view);
  });
  options.preset = "Custom";
  return options;
}

/**
 * Returns a compressed, URI-safe representation of the given options, in the latest format.
 * @param {Object} options - The full options of the simulation.
 * @returns {string} The encoded options.
 */
export function encodeOptions(options) {
  const bytes = deflateSync(textEncoder.encode(payloadV1(options)), {
    level: 9,
    mem: 12,
    dictionary: dictV1,
  });
  return "_1" + toBase64URL(bytes);
}

/**
 * Decodes options encoded in any format, past or present.
 * @param {string} str - The encoded options.
 * @returns {Object} The options. Those from legacy links only contain the fields that differ
 * from the default preset.
 * @throws If the string can't be decoded.
 */
export function decodeOptions(str) {
  if (str.startsWith("_1")) {
    const bytes = inflateSync(fromBase64URL(str.slice(2)), {
      dictionary: dictV1,
    });
    return optionsFromPayloadV1(textDecoder.decode(bytes));
  }
  if (str.startsWith("_")) {
    throw new Error("Unknown link format.");
  }
  let options = JSON.parse(LZString.decompressFromEncodedURIComponent(str));
  if (options.hasOwnProperty("p")) {
    // This has been minified, so maxify before loading.
    options = maxifyPreset(options);
  }
  return options;
}

function toBase64URL(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64URL(str) {
  const binary = atob(str.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
