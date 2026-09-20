/**
 * Exercises two dat.gui-adjacent popups that the unit harness can't reach: the diffusion
 * matrix popup (configureDiffusionMatrixGUI/syncDiffusionMatrixGUI - the "keep the popup in
 * sync with the left-UI controllers" fix from earlier this session) and the combo/"Mixed..."
 * boundary-conditions per-side editor (configureComboBCsGUI/validateComboStr).
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ensureServerRunning } from "./server.mjs";
import { launchAt, ensureOpen, setNumSpecies, setCrossDiffusion, collectErrors } from "./gui-helpers.mjs";

let browser, page, stopServer, errors;

before(async () => {
  stopServer = await ensureServerRunning();
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
  errors = collectErrors(page);
  await launchAt(page);
});

after(async () => {
  await browser.close();
  stopServer();
});

/** The Nth (0-based) visible li.cr row directly under the given folder title. */
function visibleControllerInput(folderTitle, index, selector = "input") {
  return page
    .locator("li.title", { hasText: folderTitle })
    .locator(
      `xpath=following-sibling::li[contains(@class,"cr") and not(contains(@style,"display: none"))][${index + 1}]`,
    )
    .locator(selector);
}

test("diffusion matrix popup: editing a cell updates the matching left-UI controller", async () => {
  await ensureOpen(page, "Equations");
  await ensureOpen(page, "Diffusion coefficients");
  await ensureOpen(page, "Parameters");
  await ensureOpen(page, "Variables");
  await setNumSpecies(page, 2);
  await setCrossDiffusion(page, true);

  await page.locator("button.matrix-view").click();
  await page.waitForTimeout(300);
  assert.ok(await page.locator("#diffusionMatrix_ui").isVisible());

  const cell = page.locator('#diffusionMatrixGrid input[data-field="diffusionStr_1_2"]');
  await cell.fill("7");
  await cell.dispatchEvent("change");
  await page.waitForTimeout(300);

  // Visible row order for numSpecies=2, crossDiffusion on: Duu(0), Duv(1), Dvu(2), Dvv(3).
  const leftDuv = visibleControllerInput("Diffusion coefficients", 1);
  assert.equal(await leftDuv.inputValue(), "7");
});

test("diffusion matrix popup: editing the left-UI controller directly syncs the (still open) popup cell", async () => {
  const leftDuv = visibleControllerInput("Diffusion coefficients", 1);
  await leftDuv.fill("42");
  await leftDuv.blur();
  await page.waitForTimeout(300);

  const cell = page.locator('#diffusionMatrixGrid input[data-field="diffusionStr_1_2"]');
  const cellValue = await cell.inputValue();
  // Always close the popup before asserting, so a failure here can't leave it open and block
  // later tests (its overlay intercepts pointer events for the rest of the page).
  await page.locator("#diffusionMatrix_ok").click();
  await page.waitForTimeout(200);
  assert.equal(cellValue, "42");
});

test("combo ('Mixed...') boundary conditions: selecting it opens the per-side popup with periodic defaults, and editing a side's type/value writes back to comboStr", async () => {
  await ensureOpen(page, "Boundary conditions");
  const uBCsSelect = visibleControllerInput("Boundary conditions", 0, "select");
  await uBCsSelect.selectOption("combo");
  await page.waitForTimeout(500);
  assert.ok(await page.locator("#comboBCs_ui").isVisible(), "the per-side popup should open");

  const popupSelect = page.locator("#comboBCsGUIContainer select");
  assert.equal(await popupSelect.inputValue(), "periodic");
  await popupSelect.selectOption("dirichlet");
  await page.waitForTimeout(300);

  const popupValueInput = page.locator("#comboBCsGUIContainer input").first();
  await popupValueInput.fill("5");
  await popupValueInput.blur();
  await page.waitForTimeout(300);

  await page.locator("#close-bcs-ui").click();
  await page.waitForTimeout(300);

  const comboStrValues = await page.evaluate(() => {
    const titles = [...document.querySelectorAll("li.title")];
    const start = titles.find((li) => li.textContent.trim() === "Boundary conditions");
    let el = start.nextElementSibling;
    const values = [];
    while (el && !el.classList.contains("title")) {
      const input = el.querySelector("input");
      if (input) values.push(input.value);
      el = el.nextElementSibling;
    }
    return values;
  });
  assert.ok(
    comboStrValues.some((v) => v.includes("Dirichlet = 5")),
    `expected some comboStr field to contain "Dirichlet = 5", got: ${JSON.stringify(comboStrValues)}`,
  );
});

test("no console errors or uncaught exceptions occurred across the whole sequence", () => {
  assert.deepEqual(errors, []);
});
