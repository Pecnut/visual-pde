#!/usr/bin/env node
/**
 * Loads every preset in sim/scripts/RD/presets.js (via ?preset=<name> against a running
 * VisualPDE site) in a single reused browser tab and reports any JS console errors or
 * uncaught exceptions as failures. Complements the node:test unit harness in
 * sim/scripts/tests/ - this exercises the ~250+ DOM/THREE.js/dat.gui-touching functions that
 * harness explicitly can't cover (see the "out of scope" section of its plan), by actually
 * running the app in a real browser instead.
 *
 * If nothing is already listening on BASE_URL, this spawns `bundle exec jekyll serve` itself
 * (from the repo root) and tears it down afterwards; if a server is already running there
 * (e.g. a dev server you started by hand), it's reused as-is and left running.
 *
 * By default only a random sample of at most SAMPLE_SIZE presets is checked, to keep the
 * suite fast; pass --all to check every preset instead, or --names=NameOne,NameTwo to check
 * only specific preset(s) by name (case-insensitive, matching the ?preset= lookup itself).
 */
import { chromium } from "playwright";
import { BASE_URL, ensureServerRunning } from "./server.mjs";

const LOAD_WAIT_MS = 1500;
const SAMPLE_SIZE = 20;

function sample(array, size) {
  const pool = [...array];
  const picked = [];
  while (pool.length > 0 && picked.length < size) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

async function checkPreset(page, name) {
  const messages = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") messages.push(`[console.error] ${msg.text()}`);
  };
  const onPageError = (err) => {
    messages.push(`[uncaught exception] ${err.message}`);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  try {
    const url = `${BASE_URL}/sim/?preset=${encodeURIComponent(name)}`;
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(LOAD_WAIT_MS);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }

  return messages;
}

function parseNamesArg() {
  const arg = process.argv.find((a) => a.startsWith("--names="));
  if (!arg) return null;
  return arg
    .slice("--names=".length)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  const checkAll = process.argv.includes("--all");
  const requestedNames = parseNamesArg();

  const { getListOfPresetNames } = await import("../../RD/presets.js");
  const allPresetNames = getListOfPresetNames();

  let presetNames;
  if (requestedNames) {
    const lowerToActual = new Map(allPresetNames.map((n) => [n.toLowerCase(), n]));
    const missing = requestedNames.filter((n) => !lowerToActual.has(n.toLowerCase()));
    if (missing.length > 0) {
      throw new Error(`Unknown preset name(s): ${missing.join(", ")}`);
    }
    presetNames = requestedNames.map((n) => lowerToActual.get(n.toLowerCase()));
  } else {
    presetNames = checkAll ? allPresetNames : sample(allPresetNames, SAMPLE_SIZE);
  }

  if (requestedNames) {
    console.log(`Checking ${presetNames.length} named preset(s) against ${BASE_URL}/sim/ ...\n`);
  } else if (checkAll) {
    console.log(`Checking all ${presetNames.length} presets against ${BASE_URL}/sim/ ...\n`);
  } else {
    console.log(
      `Checking a random sample of ${presetNames.length}/${allPresetNames.length} presets against ${BASE_URL}/sim/ (pass --all to check every preset) ...\n`,
    );
  }

  const stopServer = await ensureServerRunning();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const failures = [];
  try {
    for (const [i, name] of presetNames.entries()) {
      const messages = await checkPreset(page, name);
      if (messages.length > 0) {
        failures.push({ name, messages });
        console.log(`[${i + 1}/${presetNames.length}] FAIL  ${name}`);
        for (const msg of messages) console.log(`    ${msg}`);
      } else {
        console.log(`[${i + 1}/${presetNames.length}] ok    ${name}`);
      }
    }
  } finally {
    await browser.close();
    stopServer();
  }

  console.log("");
  console.log(`${presetNames.length - failures.length}/${presetNames.length} presets loaded without console errors.`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} preset(s) failed:`);
    for (const { name, messages } of failures) {
      console.log(`- ${name}`);
      for (const msg of messages) console.log(`    ${msg}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
