#!/usr/bin/env bash
# Minimal test harness for /sim - no npm install, no dependencies beyond Node itself.
#
# Regenerates the main.js extraction (see extract-main-body.mjs - never modifies the real
# main.js, always derives a fresh gitignored copy) and then runs every *.test.mjs file in this
# directory with Node's built-in test runner.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "== Regenerating main.js extraction =="
node extract-main-body.mjs

echo ""
echo "== Running tests =="
node --test --test-reporter=spec ./*.test.mjs
