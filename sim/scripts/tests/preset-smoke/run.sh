#!/usr/bin/env bash
# Loads presets in a real browser via Playwright and reports any JS console errors.
# By default only checks a random sample of presets; pass --all to check every preset.
# Unlike sim/scripts/tests/run.sh, this needs real dependencies (Playwright + a Chromium
# download) and a running Jekyll site, so it's kept in its own directory/package.json rather
# than folded into the dependency-free unit test harness.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -d node_modules ]; then
  echo "== Installing dependencies (npm install) =="
  npm install
fi

if [ -z "${SKIP_PLAYWRIGHT_INSTALL:-}" ]; then
  echo "== Ensuring Playwright's Chromium build is installed =="
  npx playwright install chromium
fi

echo "== Checking presets for console errors =="
node check-presets.mjs "$@"

echo "== Running GUI interaction tests =="
node --test *.test.mjs
