/**
 * Formalizes manual verification of the Int(expression) inline domain-integral syntax (see
 * reconcileGlobalIntegrals/parseIntCalls/parseShaderString/parseStringToTEX in main.js), which
 * replaced the old "Integrals" folder/GlobalInt1-4-token feature this session - including the
 * TeX-formatting regression check (a raw "*" leaking into the rendered equation instead of being
 * removed) the original version of this file caught for the old syntax.
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
  // launchAt only opens the left GUI panel (via #equations) - "More..." (formerly "Misc.")
  // lives in the right panel, toggled separately by #settings (see toggleRightUI() in main.js).
  await page.locator("#settings").click();
  await page.waitForTimeout(200);
});

after(async () => {
  await browser.close();
  stopServer();
});

/** The Nth (1-based) reaction-term text input, in DOM order under the "Forcing terms" title. */
function reactionTermInput(n) {
  return page
    .locator("li.title", { hasText: "Forcing terms" })
    .locator(`xpath=following-sibling::li[${n}]//input`)
    .first();
}

async function dismissError() {
  const err = page.locator("#error");
  if (await err.isVisible().catch(() => false)) {
    await page.locator("#error").getByText("Close").click();
    await page.waitForTimeout(200);
  }
}

test("the old 'Integrals' folder and its 'Integrand N' fields no longer exist", async () => {
  assert.equal(await page.locator("li.title", { hasText: "Integrals" }).count(), 0);
  assert.equal(await page.locator("li.cr.string", { hasText: /Integrand/ }).count(), 0);
});

test("More...: 'Int. update' replaces the old 'Update period' control", async () => {
  await ensureOpen(page, "More...");
  assert.ok(await page.locator("li.cr", { hasText: "Int. update" }).isVisible());
  // Match on the exact controller-name span, not a loose (case-insensitive) substring of the
  // whole row - "Update period" is also a substring of the unrelated "GUI update period" (Dev)
  // controller's own label.
  assert.equal(
    await page.locator("li.cr .property-name", { hasText: /^Update period$/ }).count(),
    0,
  );
  await ensureOpen(page, "Forcing terms");
});

test("Int(u) in a reaction term renders as \\iint_{\\Omega}(...) with no raw '*' left in the typeset equation", async () => {
  await reactionTermInput(1).fill("u^2*v - (a+b)*u + 0.001*Int(u)");
  await reactionTermInput(1).blur();
  await page.waitForTimeout(500);

  const eqText = await page.locator("#equation_display").innerText();
  const iintCount = (eqText.match(/∬/g) || []).length;
  assert.equal(iintCount, 1, "expected one ∬ for Int(u)");
  // MathJax renders a raw, un-TeX-ified "*" as the Unicode asterisk operator "∗" (U+2217, not
  // the plain ASCII "*") - checking for both catches the bug regardless of which form leaked.
  assert.ok(
    !eqText.includes("*") && !eqText.includes("∗"),
    "no raw '*' (rendered as '∗') should leak into the typeset equation",
  );
});

test("a second, distinct Int(v) elsewhere renders alongside the first without disturbing it (stable, independent slots)", async () => {
  await reactionTermInput(2).fill("Int(v) - u*v");
  await reactionTermInput(2).blur();
  await page.waitForTimeout(500);

  const eqText = await page.locator("#equation_display").innerText();
  const iintCount = (eqText.match(/∬/g) || []).length;
  assert.equal(iintCount, 2, "expected one ∬ each for Int(u) and Int(v)");
});

test("a 5th distinct Int(...) expression across the simulation is rejected via the #error banner", async () => {
  // Int(u) (field 1) and Int(v) (field 2, below) are already in use - adding 3 more distinct
  // expressions here (w, a+b, a-b) pushes the total past the max of 4 on the last one.
  await reactionTermInput(2).fill("Int(v) + Int(w) + Int(a+b) + Int(a-b)");
  await reactionTermInput(2).blur();
  await page.waitForTimeout(500);

  assert.ok(
    await page.locator("#error").isVisible(),
    "the error banner should appear for a 5th distinct Int(...) expression",
  );
  assert.match(await page.locator("#error").innerText(), /at most 4/);
  await dismissError();

  // Leave the fields in a valid (non-overflowing) state for the final no-console-errors check.
  await reactionTermInput(2).fill("Int(v) - u*v");
  await reactionTermInput(2).blur();
  await page.waitForTimeout(300);
});

test("no console errors or uncaught exceptions occurred across the whole sequence", () => {
  assert.deepEqual(errors, []);
});
