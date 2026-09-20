/**
 * Formalizes manual verification of the Parameters/Expressions "definitions list" UI (see
 * createDefinitionController/registerParsedName/rebuildDefinitionsFromString in main.js): the
 * trailing always-empty field that promotes into a real controller when filled in, the
 * "name = val in [a,b]" syntax that grows/removes a slider, and the shared name validation
 * (validateParamName/validateExpressionName) that rejects species/reaction/existing-definition
 * names.
 *
 * Note: an invalid name doesn't revert the field or block promotion - the row is still created
 * (see createDefinitionController's isNext branch, which doesn't consult hooks.validateName at
 * all), but registerParsedName's call to hooks.validateName fails to register the name and
 * throwError shows the "#error" banner. That's what these tests assert instead of DOM reversion.
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
  await ensureOpen(page, "Parameters");
});

after(async () => {
  await browser.close();
  stopServer();
});

/** The dat.gui folder's li.cr rows, in DOM order, as {value, hasSlider} - see gui-helpers.mjs's
 * countVisibleControllers for the same "walk nextElementSibling until the next li.title" pattern. */
function folderRows(folderTitle) {
  return page.evaluate((folderTitle) => {
    const titles = [...document.querySelectorAll("li.title")];
    const start = titles.find((li) => li.textContent.trim() === folderTitle);
    let el = start.nextElementSibling;
    const rows = [];
    while (el && !el.classList.contains("title")) {
      if (el.classList.contains("cr")) {
        rows.push({
          value: el.querySelector("input[type=text]")?.value,
          hasSlider: !!el.querySelector("input[type=range]"),
        });
      }
      el = el.nextElementSibling;
    }
    return rows;
  }, folderTitle);
}

/** ElementHandle for the folder's Nth-from-the-end li.cr row (0 = last, i.e. the trailing empty
 * field, as long as it hasn't been filled in yet). */
function folderRow(folderTitle, indexFromEnd) {
  return page.evaluateHandle(
    ({ folderTitle, indexFromEnd }) => {
      const titles = [...document.querySelectorAll("li.title")];
      const start = titles.find((li) => li.textContent.trim() === folderTitle);
      let el = start.nextElementSibling;
      const rows = [];
      while (el && !el.classList.contains("title")) {
        if (el.classList.contains("cr")) rows.push(el);
        el = el.nextElementSibling;
      }
      return rows[rows.length - 1 - indexFromEnd];
    },
    { folderTitle, indexFromEnd },
  );
}

async function fillTrailingField(folderTitle, text) {
  const handle = await folderRow(folderTitle, 0);
  const input = await handle.asElement().$("input[type=text]");
  await input.fill(text);
  await input.evaluate((el) => el.blur());
  await page.waitForTimeout(300);
}

async function fillRowFromEnd(folderTitle, indexFromEnd, text) {
  const handle = await folderRow(folderTitle, indexFromEnd);
  const input = await handle.asElement().$("input[type=text]");
  await input.fill(text);
  await input.evaluate((el) => el.blur());
  await page.waitForTimeout(300);
}

async function dismissError() {
  const err = page.locator("#error");
  if (await err.isVisible().catch(() => false)) {
    await page.locator("#error").getByText("Close").click();
    await page.waitForTimeout(200);
  }
}

test("Parameters: typing into the trailing empty field promotes it (new row keeps the value, a fresh empty trailing field with the placeholder appears below it)", async () => {
  await ensureOpen(page, "Parameters");
  const before = await folderRows("Parameters");
  const placeholder = await folderRow("Parameters", 0).then((h) =>
    h.asElement().$eval("input[type=text]", (el) => el.placeholder),
  );

  await fillTrailingField("Parameters", "c = 5");

  const after = await folderRows("Parameters");
  assert.equal(after.length, before.length + 1, "one new row (the promoted one) plus the fresh trailing field");
  assert.equal(after[after.length - 2].value, "c = 5", "the promoted row keeps the typed value");
  assert.equal(after[after.length - 1].value, "", "a fresh empty trailing field appears");
  const newPlaceholder = await folderRow("Parameters", 0).then((h) =>
    h.asElement().$eval("input[type=text]", (el) => el.placeholder),
  );
  assert.equal(newPlaceholder, placeholder, "the trailing field's placeholder text is preserved");
});

test("Parameters: 'name = val in [a,b]' syntax grows a slider, which disappears when edited back to a plain 'name = val'", async () => {
  await fillTrailingField("Parameters", "d = 1 in [0,10]");
  let rows = await folderRows("Parameters");
  const dRow = rows[rows.length - 2];
  assert.equal(dRow.value, "d = 1 in [0,10]");
  assert.ok(dRow.hasSlider, "a slider should appear for the 'in [a,b]' syntax");

  await fillRowFromEnd("Parameters", 1, "d = 1");
  rows = await folderRows("Parameters");
  const dRowAfter = rows[rows.length - 2];
  assert.equal(dRowAfter.value, "d = 1");
  assert.ok(!dRowAfter.hasSlider, "the slider should be removed once the 'in [a,b]' suffix is gone");
});

test("Parameters: a name already in use (an existing parameter) is rejected via the #error banner, not silently accepted", async () => {
  await fillTrailingField("Parameters", "c = 99");
  assert.ok(await page.locator("#error").isVisible(), "the error banner should appear for a duplicate parameter name");
  assert.match(await page.locator("#error").innerText(), /multiple definitions of 'c'/);
  await dismissError();
});

test("Expressions: typing into the trailing empty field promotes it the same way as Parameters", async () => {
  await ensureOpen(page, "Substitutions");
  const before = await folderRows("Substitutions");

  await fillTrailingField("Substitutions", "myExpr = u + 1");

  const after = await folderRows("Substitutions");
  assert.equal(after.length, before.length + 1);
  assert.equal(after[after.length - 2].value, "myExpr = u + 1");
  assert.equal(after[after.length - 1].value, "");
});

test("Expressions: a name colliding with a species name is rejected via the #error banner", async () => {
  await fillTrailingField("Substitutions", "u = 5");
  assert.ok(await page.locator("#error").isVisible(), "the error banner should appear for a species-name collision");
  assert.match(await page.locator("#error").innerText(), /'u' is already in use/);
  await dismissError();
});

test("no console errors or uncaught exceptions occurred across the whole sequence", () => {
  assert.deepEqual(errors, []);
});
