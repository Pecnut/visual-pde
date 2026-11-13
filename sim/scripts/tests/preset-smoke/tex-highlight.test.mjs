/**
 * Hovering the "Diffusion coefficients" / "Forcing terms" / "Timescales" folder titles, or
 * focusing one of their fields, highlights the corresponding terms of the equations. This
 * must never change the equation display's size, as that moves the left GUI beneath it, and
 * so the hovered title, ending the hover (and repeating endlessly).
 *
 * BrusselatorTuringWave1D reveals many hidden terms when highlighted, and the mouse is parked
 * on a title's bottom edge, the most sensitive spot.
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
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  errors = collectErrors(page);
  await launchAt(page, "/sim/?preset=BrusselatorTuringWave1D");
  await ensureOpen(page, "Equations");
  await page.mouse.move(1, 790);
  await page.waitForTimeout(500);
});

after(async () => {
  await browser.close();
  stopServer();
});

function folderTitle(titleText) {
  return page
    .locator("#leftGUI li.title")
    .filter({ hasText: new RegExp(`^${titleText}$`) })
    .first();
}

function state() {
  return page.evaluate(() => {
    const texOf = (el) =>
      el
        ? MathJax.startup.document
            .getMathItemsWithin(el)
            .map((i) => i.math)
            .join()
        : "";
    const overlay = document.getElementById("typeset_equation_highlight");
    const content = overlay.querySelector(":scope > div:not(.pending)");
    const box = document
      .getElementById("equation_display_box")
      .getBoundingClientRect();
    const c = content?.getBoundingClientRect();
    return {
      height: document
        .getElementById("equation_display")
        .getBoundingClientRect().height,
      tex: texOf(document.getElementById("typeset_equation")),
      overlayShown: getComputedStyle(overlay).visibility === "visible",
      overlayTex: texOf(content),
      overlayFits:
        !c ||
        (c.left >= box.left - 0.5 &&
          c.right <= box.right + 0.5 &&
          c.top >= box.top - 0.5 &&
          c.bottom <= box.bottom + 0.5),
    };
  });
}

for (const name of ["Diffusion coefficients", "Forcing terms", "Timescales"]) {
  test(`${name}: hovering the title highlights its terms without moving anything`, async () => {
    const rest = await state();
    assert.equal(rest.overlayShown, false);
    const box = await folderTitle(name).boundingBox();
    await page.mouse.move(box.x + 40, box.y + box.height - 2);
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(50);
      const now = await state();
      assert.equal(
        now.height,
        rest.height,
        "equation display height changed while hovering",
      );
      assert.equal(
        now.tex,
        rest.tex,
        "plain equations were re-typeset while hovering",
      );
      assert.equal(
        await folderTitle(name).evaluate((t) => t.matches(":hover")),
        true,
      );
      if (i < 4) continue; // Give the overlay time to typeset.
      assert.equal(
        now.overlayShown,
        true,
        "highlight overlay not shown while hovering",
      );
      assert.match(
        now.overlayTex,
        /\\selectedLight\{/,
        "nothing highlighted while hovering",
      );
      assert.ok(
        now.overlayFits,
        "highlight overlay spills outside the equation display",
      );
    }
    await page.mouse.move(1, 790);
    await page.waitForTimeout(100);
    assert.equal(
      (await state()).overlayShown,
      false,
      "highlight not cleared on mouseleave",
    );
  });
}

test("focusing a single field highlights only its own term, revealing it even if it's hidden", async () => {
  await ensureOpen(page, "Forcing terms");
  // Opening it hovered its title.
  await page.mouse.move(1, 790);
  await page.waitForTimeout(300);
  const rest = await state();
  const input = folderTitle("Forcing terms")
    .locator("xpath=following-sibling::li[1]//input")
    .first();
  await input.focus();
  await page.waitForTimeout(300);
  const focused = await state();
  assert.equal(focused.overlayShown, true);
  assert.equal(focused.overlayTex.match(/\\selectedLight\{/g).length, 1);
  assert.equal(focused.height, rest.height);
  await input.evaluate((el) => el.blur());
  await page.waitForTimeout(100);
  assert.equal((await state()).overlayShown, false);
});

test("no console errors or uncaught exceptions occurred", () => {
  assert.deepEqual(errors, []);
});
