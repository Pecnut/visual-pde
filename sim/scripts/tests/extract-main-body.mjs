#!/usr/bin/env node
/**
 * Regenerates generated/main-body.mjs from the real sim/scripts/RD/main.js, WITHOUT ever
 * modifying main.js itself. main.js is one giant `async function VisualPDE(url) { ... }`
 * closure with zero exports (everything - ~339 functions, all the app's actual feature
 * logic - lives inside it), so nothing in it can be `import`ed by a test file as-is.
 *
 * This script mechanically splits main.js's source into top-level statements (depth-aware,
 * so braces/commas/semicolons inside strings/template-literals/comments don't cause
 * mis-splits), keeps only what's safe and useful for testing (import statements, bare
 * variable-name declarations with their initializers stripped, and every top-level function
 * declaration verbatim), and drops everything else (event listener registration, THREE.js
 * scene setup, `await` calls, and other imperative code that would try to touch a real
 * browser/WebGL context if it ran at module-load time).
 *
 * Run fresh before every test run (see run.sh) - never hand-edited, never committed - so it
 * can't silently drift from the real source. Self-validates with `node --check` as the last
 * step: if the scanner below ever mis-extracts something (e.g. a brace miscount), that fails
 * loudly and immediately, rather than producing silently-wrong test results.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAIN_JS = path.join(__dirname, "../RD/main.js");
const OUT_DIR = path.join(__dirname, "generated");
const OUT_FILE = path.join(OUT_DIR, "main-body.mjs");
const FN_SIGNATURE = "async function VisualPDE(url) {";

/**
 * Scans `text` character by character, calling `visit(index, char, depthAfter)` for every
 * character that is genuine JS syntax (i.e. not inside a string/template-literal/comment,
 * which are skipped over as opaque so their contents can never be mistaken for real braces/
 * commas/semicolons). `depthAfter` is the {[( nesting depth *after* processing this
 * character - callers use this to detect "just returned to depth 0" for opening/closing
 * brackets, or "currently at depth 0" for punctuation like `;`/`,`.
 */
// Characters after which a "/" is (almost) always the start of a regex literal rather than
// division - i.e. everywhere a value/expression can't have just ended. Used to disambiguate
// "/" without a real parser; this is the same heuristic simple syntax highlighters use.
const REGEX_PRECEDING_CHARS = new Set([
  "(",
  ",",
  ";",
  "{",
  "}",
  "[",
  "=",
  "!",
  "&",
  "|",
  "?",
  ":",
  "+",
  "-",
  "*",
  "%",
  "^",
  "~",
  "<",
  ">",
  "\n",
]);
const REGEX_PRECEDING_KEYWORDS = new Set([
  "return",
  "typeof",
  "instanceof",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "case",
  "do",
  "else",
]);

function scanCode(text, visit) {
  let i = 0;
  let depth = 0;
  const n = text.length;
  // Last non-whitespace character actually emitted as code (not inside a string/comment/
  // regex), used only to decide whether a "/" starts a regex literal or is division, and
  // whether a "{" opens a block or an expression (object literal/import specifier list).
  let lastChar = "";
  // Parallel stack to the {[( nesting: for each open bracket, whether it's a "block"-type "{"
  // (see isBlockContext) - false for "(", "[", and expression-type "{". Popped on close so it
  // stays aligned with `depth`.
  const blockStack = [];
  while (i < n) {
    const c = text[i];
    // Line comment.
    if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    // Block comment.
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    // Regex literal - only recognised where a value can't have just ended (see
    // REGEX_PRECEDING_CHARS/KEYWORDS), the same heuristic simple JS tokenizers use to
    // distinguish "/regex/" from division. Skipped over entirely as opaque, like a string, so
    // escaped/quantifier braces (e.g. "\{", "{4}") inside a pattern never affect bracket depth.
    if (c === "/" && isRegexContext(text, i, lastChar)) {
      i++;
      let inClass = false;
      while (i < n) {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text[i] === "[") inClass = true;
        else if (text[i] === "]") inClass = false;
        else if (text[i] === "/" && !inClass) {
          i++;
          break;
        }
        i++;
      }
      while (i < n && /[a-z]/.test(text[i])) i++; // flags (g, i, m, s, u, y, ...)
      lastChar = "/";
      continue;
    }
    // Single/double-quoted string, respecting backslash escapes.
    if (c === "'" || c === '"') {
      const quote = c;
      i++;
      while (i < n && text[i] !== quote) {
        if (text[i] === "\\") i++;
        i++;
      }
      i++;
      lastChar = quote;
      continue;
    }
    // Template literal, respecting ${...} interpolation (tracked with its own small depth
    // counter so braces *inside* an interpolation don't end the template early). This is a
    // simple char-scan, not a full re-entrant parse of the interpolated expression - verified
    // sufficient for this codebase by node --check on the generated output.
    if (c === "`") {
      i++;
      let tDepth = 0;
      while (i < n) {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text[i] === "`" && tDepth === 0) {
          i++;
          break;
        }
        if (text[i] === "$" && text[i + 1] === "{") {
          tDepth++;
          i += 2;
          continue;
        }
        if (text[i] === "}" && tDepth > 0) {
          tDepth--;
          i++;
          continue;
        }
        i++;
      }
      lastChar = "`";
      continue;
    }
    if (c === "{" || c === "(" || c === "[") {
      // Track whether this "{" is a block (function/if/for/while/etc body, which can end a
      // statement on its own) or an object literal / import-specifier list (which can be
      // followed by more of the same statement, e.g. "from \"...\";" or ".prop"), so
      // splitTopLevelStatements() only treats block-closing "}" as a statement boundary.
      // Heuristic: "{" is a block if it's preceded by ")" (function/if/for/while param list),
      // or by ";"/"{"/"}"/start-of-text (a fresh statement), or by "else"/"try"/"finally"/"do".
      // Otherwise (preceded by "=", "(", ",", "[", ":", "return", operators, ...) it's an
      // expression context (object literal, import specifier list, etc).
      const isBlock = c === "{" ? isBlockContext(text, i, lastChar) : false;
      blockStack.push(isBlock);
      depth++;
      visit(i, c, depth, false);
      i++;
      lastChar = c;
      continue;
    }
    if (c === "}" || c === ")" || c === "]") {
      const wasBlock = blockStack.pop();
      depth--;
      visit(i, c, depth, c === "}" && wasBlock);
      i++;
      lastChar = c;
      continue;
    }
    visit(i, c, depth, false);
    i++;
    if (!/\s/.test(c)) lastChar = c;
  }
}

/**
 * Heuristic (no full parser): a "/" at `text[i]` starts a regex literal if the most recent
 * non-whitespace code character before it is one a value/expression can't have just ended
 * with (an operator/punctuation/opening-bracket/newline), or if it's preceded by a keyword
 * like `return`/`typeof` with only whitespace between. Otherwise it's division (or the start
 * of a comment, already handled by the caller before this is reached).
 */
function isRegexContext(text, i, lastChar) {
  if (lastChar === "" || REGEX_PRECEDING_CHARS.has(lastChar)) return true;
  // Identifier/keyword immediately before (skipping whitespace) - check for keywords that can
  // precede a regex (e.g. "return /foo/"). If the preceding token is some other identifier or
  // a number/")"/"]" close, a value just ended, so "/" is division.
  let j = i - 1;
  while (j >= 0 && /\s/.test(text[j])) j--;
  let end = j + 1;
  while (j >= 0 && /[a-zA-Z_$]/.test(text[j])) j--;
  const word = text.slice(j + 1, end);
  if (word && REGEX_PRECEDING_KEYWORDS.has(word)) return true;
  return false;
}

const BLOCK_PRECEDING_KEYWORDS = new Set(["else", "try", "finally", "do"]);

/**
 * Heuristic (no full parser): the "{" at `text[i]` opens a block (function/if/for/while/etc
 * body - which can end its enclosing statement on its own, no trailing content expected)
 * rather than an expression (object literal, import specifier list, destructuring - which
 * can be followed by more of the same statement, e.g. "from \"x\";" or ".prop" or ", y = 2").
 * A "{" is a block if immediately preceded by ")" (a function/if/for/while parameter list
 * just closed), or by ";"/"{"/"}"/start-of-text (a fresh statement), or by a keyword like
 * "else"/"try". Otherwise (preceded by "=", "(", ",", "[", ":", "return", operators, ...) it's
 * an expression.
 */
function isBlockContext(text, i, lastChar) {
  if (lastChar === ")" || lastChar === ";" || lastChar === "{" || lastChar === "}" || lastChar === "") {
    return true;
  }
  let j = i - 1;
  while (j >= 0 && /\s/.test(text[j])) j--;
  let end = j + 1;
  while (j >= 0 && /[a-zA-Z_$]/.test(text[j])) j--;
  const word = text.slice(j + 1, end);
  return BLOCK_PRECEDING_KEYWORDS.has(word);
}

/**
 * Splits `text` into top-level statements: each ends either at a `;` while depth is 0, or (for
 * brace-delimited constructs with no trailing semicolon, like function declarations) at a `}`
 * that both returns depth to 0 AND closed a block (not an object literal/import specifier
 * list/etc - see isBlockContext - since those can be followed by more of the same statement).
 */
function splitTopLevelStatements(text) {
  const statements = [];
  let start = 0;
  scanCode(text, (i, c, depthAfter, isBlockClose) => {
    if (depthAfter === 0 && (c === ";" || (c === "}" && isBlockClose))) {
      statements.push(text.slice(start, i + 1));
      start = i + 1;
    }
  });
  const rest = text.slice(start);
  if (rest.trim()) statements.push(rest);
  return statements.filter((s) => s.trim());
}

/**
 * Splits `text` on top-level commas only (depth 0), for declarator lists. Commas don't
 * themselves change bracket depth, so the running depth at a comma is just whatever the most
 * recent bracket character last reported.
 */
function splitTopLevelCommas(text) {
  let depth = 0;
  let start = 0;
  const out = [];
  scanCode(text, (i, c, depthAfter) => {
    if (c === "{" || c === "(" || c === "[" || c === "}" || c === ")" || c === "]") {
      depth = depthAfter;
      return;
    }
    if (c === "," && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  });
  out.push(text.slice(start));
  return out;
}

/**
 * Given one declarator (e.g. "foo", "foo = bar()", "foo = { a: 1, b: 2 }"), returns just the
 * bare variable name, discarding any initializer. Only handles simple identifier declarators
 * (confirmed there's no destructuring in main.js's top-level let/const/var statements).
 *
 * splitTopLevelCommas() doesn't treat comments as split points, so a comment sitting between
 * two declarators in a multi-name list (e.g. "let a,\n  // describes b\n  b = {};") gets
 * captured as a prefix of the declarator that follows it - strip that the same way
 * stripLeadingCommentsAndWhitespace() does for statements, or the name after the comment is
 * silently dropped instead of extracted.
 */
function bareDeclaratorName(declarator) {
  const stripped = stripLeadingCommentsAndWhitespace(declarator);
  const match = stripped.match(/^([a-zA-Z_$][\w$]*)/);
  return match ? match[1] : null;
}

const RD_DIR = path.dirname(MAIN_JS);

/**
 * main.js's relative import specifiers (e.g. "./TEX.js", "../copy_shader.js") resolve
 * relative to sim/scripts/RD/ - since the generated file lives in a different directory
 * (sim/scripts/tests/generated/), those specifiers need rewriting to point at the same
 * absolute targets. Computed via path.resolve/path.relative (not hand-counted "../" prefixes)
 * so it stays correct regardless of exactly how deep either directory is.
 */
function rewriteImportSpecifier(statement) {
  const match = statement.match(/from\s+(["'])((?:(?!\1).)*)\1(\s*;?\s*)$/);
  if (!match || !match[2].startsWith(".")) return statement; // bare/non-relative specifier
  const absoluteTarget = path.resolve(RD_DIR, match[2]);
  let rel = path.relative(OUT_DIR, absoluteTarget).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return statement.slice(0, match.index) + `from ${match[1]}${rel}${match[1]}${match[3]}`;
}

function extractImports(headerText) {
  return splitTopLevelStatements(headerText)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("import "))
    .map(rewriteImportSpecifier);
}

function extractBody(fullText) {
  const fnStart = fullText.indexOf(FN_SIGNATURE);
  if (fnStart === -1) {
    throw new Error(
      `Could not find "${FN_SIGNATURE}" in main.js - has the file's top-level structure changed? Update FN_SIGNATURE in extract-main-body.mjs.`,
    );
  }
  const openBraceIndex = fnStart + FN_SIGNATURE.length - 1; // index of the "{" itself
  // Find this function's matching closing brace via the same depth-aware scanner.
  let depth = 0;
  let closeIndex = -1;
  scanCode(fullText.slice(openBraceIndex), (i, c, depthAfter) => {
    if (closeIndex !== -1) return;
    if (c === "{" || c === "(" || c === "[") depth = depthAfter;
    if (c === "}" || c === ")" || c === "]") {
      depth = depthAfter;
      if (depth === 0 && c === "}") closeIndex = openBraceIndex + i;
    }
  });
  if (closeIndex === -1) {
    throw new Error("Could not find VisualPDE's matching closing brace.");
  }
  return fullText.slice(openBraceIndex + 1, closeIndex);
}

/**
 * Statements returned by splitTopLevelStatements() include any comment(s) that sat between
 * the end of the previous statement and the start of this one (comments aren't split points,
 * so they get captured as a prefix of whatever follows) - strip those so classification
 * regexes see the real start of the statement (e.g. a function preceded by a doc comment).
 */
function stripLeadingCommentsAndWhitespace(text) {
  let s = text;
  let changed = true;
  while (changed) {
    changed = false;
    const trimmed = s.replace(/^\s+/, "");
    if (trimmed !== s) {
      s = trimmed;
      changed = true;
    }
    if (s.startsWith("//")) {
      const nl = s.indexOf("\n");
      s = nl === -1 ? "" : s.slice(nl + 1);
      changed = true;
    } else if (s.startsWith("/*")) {
      const end = s.indexOf("*/");
      s = end === -1 ? "" : s.slice(end + 2);
      changed = true;
    }
  }
  return s;
}

// Matches top-level prototype-augmentation statements like "Number.prototype.clamp =
// function (min, max) {...};" - a handful of these near the top of main.js define methods
// (Number.prototype.clamp/countDecimals, Array.prototype.rotate) that plenty of otherwise-pure
// functions rely on (e.g. lerp() calls t.clamp(0, 1)). They don't touch DOM/THREE, so unlike
// other imperative setup code they're safe (and necessary) to keep verbatim.
const PROTOTYPE_AUGMENTATION_RE = /^[a-zA-Z_$][\w$]*\.prototype\.[a-zA-Z_$][\w$]*\s*=/;

function classifyBodyStatements(bodyText) {
  const functionDecls = [];
  const functionNames = [];
  const varNames = [];
  const prototypeAugmentations = [];
  const declKeyword = /^(let|const|var)\s+([\s\S]*)$/;
  const fnDeclRe = /^(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)\s*\(/;

  for (const raw of splitTopLevelStatements(bodyText)) {
    const stmt = stripLeadingCommentsAndWhitespace(raw.trim());
    if (!stmt) continue;

    const fnMatch = stmt.match(fnDeclRe);
    if (fnMatch) {
      functionDecls.push(stmt);
      functionNames.push(fnMatch[1]);
      continue;
    }

    const declMatch = stmt.match(declKeyword);
    if (declMatch) {
      // Strip the trailing ";" (if any) before splitting declarators.
      let declList = declMatch[2].trim();
      if (declList.endsWith(";")) declList = declList.slice(0, -1);
      for (const declarator of splitTopLevelCommas(declList)) {
        const name = bareDeclaratorName(declarator);
        if (name) varNames.push(name);
      }
      continue;
    }

    if (PROTOTYPE_AUGMENTATION_RE.test(stmt)) {
      prototypeAugmentations.push(stmt);
      continue;
    }

    // Anything else (expression statements, if/for/await, event listener registration,
    // THREE.js scene setup, ...) is imperative setup code - dropped.
  }

  return { functionDecls, functionNames, varNames, prototypeAugmentations };
}

function main() {
  const src = fs.readFileSync(MAIN_JS, "utf8");
  const fnStart = src.indexOf(FN_SIGNATURE);
  if (fnStart === -1) {
    throw new Error(`Could not find "${FN_SIGNATURE}" in main.js.`);
  }
  const header = src.slice(0, fnStart);
  const imports = extractImports(header);
  const bodyText = extractBody(src);

  if (process.env.DEBUG_SPLIT) {
    const stmts = splitTopLevelStatements(bodyText);
    const lines = stmts.map((s, idx) => {
      const oneLine = s.replace(/\s+/g, " ").trim().slice(0, 90);
      return `[${idx}] (${s.length} chars) ${oneLine}`;
    });
    fs.writeFileSync(
      path.join(OUT_DIR, "debug-statements.txt"),
      lines.join("\n"),
    );
    console.log(`Wrote ${stmts.length} statements to generated/debug-statements.txt`);
  }

  const { functionDecls, functionNames, varNames, prototypeAugmentations } = classifyBodyStatements(bodyText);

  // De-duplicate var names (a name could legitimately appear once; guard against the
  // extraction accidentally emitting "let x; let x;" which would be a syntax error).
  const uniqueVarNames = [...new Set(varNames)];
  // Function names should already be unique (duplicate function declarations in main.js
  // would themselves be a real bug - JS silently lets the later one win - so no
  // de-duplication here; a collision would surface as a duplicate export, which node --check
  // will catch below).
  const exportNames = [...uniqueVarNames, ...functionNames];

  // ES module bindings (named or namespace import) are read-only from the importer's side -
  // a test can't do `import * as m from ...; m.options = {...};`. __setState lets tests
  // reassign these module-scoped variables from outside by doing the reassignment from code
  // *inside* this module (which has ordinary lexical access to them). Generated, not sourced
  // from main.js. Once set, tests can freely mutate properties on the resulting object/array
  // via the live imported binding (e.g. `m.options.kineticParams = "...";`) without calling
  // __setState again - only *reassigning* the binding itself needs this function.
  //
  // Function declarations create reassignable bindings too (unlike `const`), so __setState
  // also accepts function-name overrides - e.g. `m.__setState({ throwError: (msg) => {...} })`
  // to stub the handful of functions that call the real (DOM-touching) throwError, without
  // needing a full jQuery/DOM mock. Every other function in this module looks `throwError` up
  // via the shared module scope at call time, so an override is picked up everywhere.
  const setStateFn = [
    "export function __setState(patch) {",
    ...uniqueVarNames.map(
      (name) => `  if ("${name}" in patch) ${name} = patch.${name};`,
    ),
    ...functionNames.map(
      (name) => `  if ("${name}" in patch) ${name} = patch.${name};`,
    ),
    "}",
  ].join("\n");

  const output = [
    "// AUTO-GENERATED by extract-main-body.mjs - DO NOT EDIT, DO NOT COMMIT.",
    "// Regenerated fresh from sim/scripts/RD/main.js on every test run.",
    "",
    imports.join("\n"),
    "",
    "// Bare state-variable declarations (initializers stripped, see extract-main-body.mjs) -",
    "// tests set these up as fixtures (via __setState below) before calling functions that",
    "// read them.",
    uniqueVarNames.length ? `let ${uniqueVarNames.join(", ")};` : "",
    "",
    setStateFn,
    "",
    "// Prototype augmentations (Number.prototype.clamp etc.) that pure functions rely on - see",
    "// PROTOTYPE_AUGMENTATION_RE in extract-main-body.mjs.",
    prototypeAugmentations.join("\n"),
    "",
    "// Every top-level function declaration from main.js's VisualPDE() closure, verbatim.",
    functionDecls.join("\n\n"),
    "",
    `export { ${exportNames.join(", ")} };`,
    "",
  ].join("\n");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, output);

  // Self-validate: catch scanner mis-extractions immediately and loudly.
  execFileSync(process.execPath, ["--check", OUT_FILE], { stdio: "inherit" });

  console.log(
    `Extracted ${functionNames.length} functions and ${uniqueVarNames.length} state variables from main.js -> ${path.relative(process.cwd(), OUT_FILE)}`,
  );
}

main();
