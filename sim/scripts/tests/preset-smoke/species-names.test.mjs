/**
 * Regression test for renaming species via the "Variables" folder's "Names" field. A blank or
 * punctuation-only name used to be accepted as an empty species name, and the next rename then
 * left replaceSymbolsInStr's placeholders (e.g. "PLACE00PLACE0" for "0") in every expression.
 * Invalid names should now be refused with an error, putting the last valid names back.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ensureServerRunning } from "./server.mjs";
import { launchAt, ensureOpen, collectErrors } from "./gui-helpers.mjs";

let browser, page, stopServer, errors;

before(async () => {
  stopServer = await ensureServerRunning();
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
  errors = collectErrors(page);
  await launchAt(page);
  await ensureOpen(page, "Equations");
  await ensureOpen(page, "Forcing terms");
  await ensureOpen(page, "Variables");
});

after(async () => {
  await browser.close();
  stopServer();
});

function namesInput() {
  return page
    .locator("li.cr")
    .filter({ has: page.locator(".property-name", { hasText: /^Names$/ }) })
    .locator("input[type=text]");
}

function reactionTermInput(n) {
  return page
    .locator("li.title", { hasText: "Forcing terms" })
    .locator(`xpath=following-sibling::li[${n}]//input`)
    .first();
}

async function setNames(text) {
  await namesInput().fill(text);
  await namesInput().evaluate((el) => el.blur());
  await page.waitForTimeout(300);
}

async function dismissError() {
  const err = page.locator("#error");
  if (await err.isVisible().catch(() => false)) {
    await page.locator("#error").getByText("Close").click();
    await page.waitForTimeout(200);
  }
}

/** Every text field in both GUIs, so that a stray placeholder anywhere is caught. */
function allTextFieldValues() {
  return page.evaluate(() =>
    [...document.querySelectorAll("input[type=text]")].map((el) => el.value),
  );
}

test("invalid species names are refused with an error, and the previous names are restored", async () => {
  await setNames("u v");
  const reaction1 = await reactionTermInput(1).inputValue();
  assert.match(reaction1, /\bu\b/, "expected the default reaction term to involve u");

  for (const bad of ["", "   ", "!?", "2 v", "u u"]) {
    await setNames(bad);
    assert.ok(await page.locator("#error").isVisible(), `expected an error for ${JSON.stringify(bad)}`);
    assert.equal(await namesInput().inputValue(), "u v", `names not restored after ${JSON.stringify(bad)}`);
    assert.equal(await reactionTermInput(1).inputValue(), reaction1);
    await dismissError();
  }
});

test("renaming after a refused name swaps species cleanly, leaving no placeholders behind", async () => {
  const before = await allTextFieldValues();
  await setNames("");
  await dismissError();
  await setNames("p q");

  assert.equal(await namesInput().inputValue(), "p q");
  const after = await allTextFieldValues();
  for (const value of after) {
    assert.ok(!/PLACE|\uE000|\uE001/.test(value), `placeholder left in ${JSON.stringify(value)}`);
  }
  // Swapping the names back should restore every field exactly.
  await setNames("u v");
  assert.deepEqual(await allTextFieldValues(), before);
  assert.deepEqual(errors, []);
});
