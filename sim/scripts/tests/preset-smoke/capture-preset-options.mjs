// Loads every preset in the running site and saves the resulting `options` of each, as used to
// build the frozen dictionary of link format v1 (see build-url-dict-v1.mjs) and to measure the
// length of links.
//
// Usage: node capture-preset-options.mjs <out.json> [preset ...]
// Needs a server on BASE_URL (see server.mjs). `options` is closure-private, so the served
// main.js is intercepted to expose it, leaving the source untouched.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL } from "./server.mjs";
import { getListOfPresetNames } from "../../RD/presets.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const [outFile, ...requested] = process.argv.slice(2);
if (!outFile) {
  console.error(
    "Usage: node capture-preset-options.mjs <out.json> [preset ...]",
  );
  process.exit(1);
}
const names = requested.length
  ? requested
  : getListOfPresetNames().filter((name) => name != "default");

const mainSrc = fs
  .readFileSync(path.join(here, "../../RD/main.js"), "utf8")
  .replace(
    "async function VisualPDE(url) {",
    "async function VisualPDE(url) { window.__options = () => options;",
  );

const browser = await chromium.launch();
// Block the service worker, which would otherwise serve its own cached main.js.
const context = await browser.newContext({ serviceWorkers: "block" });
await context.addInitScript(() => {
  try {
    localStorage.setItem("visited", "true");
  } catch {}
});
await context.route("**/sim/scripts/RD/main.js*", (route) =>
  route.fulfill({ body: mainSrc, contentType: "application/javascript" }),
);

const out = {};
for (const name of names) {
  const page = await context.newPage();
  try {
    await page.goto(BASE_URL + "/sim/?preset=" + name, { waitUntil: "load" });
    await page.waitForFunction(
      () => window.__options?.()?.views?.length,
      null,
      {
        timeout: 15000,
      },
    );
    await page.waitForTimeout(800);
    out[name] = await page.evaluate(() =>
      JSON.parse(JSON.stringify(window.__options())),
    );
    console.log("captured", name);
  } catch (e) {
    console.log("skipped", name, e.message.split("\n")[0]);
  }
  await page.close();
}
fs.writeFileSync(outFile, JSON.stringify(out));
await browser.close();
