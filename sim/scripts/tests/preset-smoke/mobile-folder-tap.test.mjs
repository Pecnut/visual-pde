/**
 * Formalizes manual verification that "Diffusion coefficients", "Forcing terms" and
 * "Timescales" - the 3 folders whose title bar also highlights TeX on hover (see
 * setOnFolderHoverEnter/Leave in main.js) - open on a single tap on touch devices, not just
 * a mouse click.
 *
 * On WebKit/iOS in particular, an element with a mouseenter/mouseover handler has its click
 * event deferred to a second tap (the browser treats the first tap as "simulate hovering
 * it", only committing to "actually click it" on a second tap on the same target) - so these
 * 3 folders, uniquely, used to require two taps to open on such devices: the first tap only
 * highlighted the folder's TeX terms, without ever toggling it open. setOnFolderTapToggle
 * fixes this by handling touchend explicitly. This file drives a touch-emulated browser
 * context (hasTouch/isMobile) to catch a regression back to that behaviour.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ensureServerRunning } from "./server.mjs";
import { collectErrors } from "./gui-helpers.mjs";

let browser, context, page, stopServer, errors;

before(async () => {
  stopServer = await ensureServerRunning();
  browser = await chromium.launch();
  context = await browser.newContext({
    viewport: { width: 420, height: 900 },
    hasTouch: true,
    isMobile: true,
  });
  page = await context.newPage();
  errors = collectErrors(page);

  await page.goto("http://localhost:4000/sim/", { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1200);
  // "Skip the tour" (id=welcome_no) - matched by id, not label text, since the copy on this
  // button has already changed once (was "No, let me jump in!"); see gui-helpers.mjs's launchAt.
  const skipTour = page.locator("#welcome_no");
  if (await skipTour.isVisible().catch(() => false)) {
    await skipTour.click();
    await page.waitForTimeout(200);
  }
  await page.tap("#equations");
  await page.waitForTimeout(300);
  // "Equations" has no hover handler and should already open on the first tap - opening it
  // here is also what reveals the 3 folders under test.
  await page.tap("li.title >> text='Equations'");
  await page.waitForTimeout(300);
});

after(async () => {
  await browser.close();
  stopServer();
});

function folderTitle(titleText) {
  return page.locator("li.title").filter({ hasText: new RegExp(`^${titleText}$`) }).first();
}

async function isFolderClosed(titleText) {
  return folderTitle(titleText).evaluate((li) => li.parentElement.classList.contains("closed"));
}

for (const name of ["Diffusion coefficients", "Forcing terms", "Timescales"]) {
  test(`${name}: opens on a single tap (not just a mouse click)`, async () => {
    assert.equal(await isFolderClosed(name), true, `${name} should start closed`);
    await folderTitle(name).tap();
    await page.waitForTimeout(300);
    assert.equal(await isFolderClosed(name), false, `${name} should be open after one tap`);

    // The individual field rows revealed inside never had a hover/mouseenter handler
    // themselves (only the folder title bar does) - they're a normal dat.gui text input, so
    // a single tap should focus it directly, without needing a second tap.
    const firstInput = folderTitle(name).locator("xpath=following-sibling::li[1]//input").first();
    await firstInput.tap();
    await page.waitForTimeout(200);
    const focusedTag = await page.evaluate(() => document.activeElement.tagName);
    assert.equal(focusedTag, "INPUT", `${name}'s first field should be focused after one tap`);
    await firstInput.evaluate((el) => el.blur());

    // Tapping the title again closes it, mirroring the desktop click-to-toggle behaviour.
    await folderTitle(name).tap();
    await page.waitForTimeout(300);
    assert.equal(await isFolderClosed(name), true, `${name} should close again after a second tap`);
  });
}

test("a scroll-like drag ending on a folder title doesn't toggle it", async () => {
  const box = await folderTitle("Diffusion coefficients").boundingBox();
  assert.equal(await isFolderClosed("Diffusion coefficients"), true);

  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 10, y: box.y - 150 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + 10, y: box.y - 50 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: box.x + 10, y: box.y + 5 }],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(300);

  assert.equal(
    await isFolderClosed("Diffusion coefficients"),
    true,
    "a >10px drag ending on the title should be treated as a scroll, not a tap",
  );
});

test("no console errors or uncaught exceptions occurred across the whole sequence", () => {
  assert.deepEqual(errors, []);
});
