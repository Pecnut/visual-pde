/**
 * Shared Playwright helpers for driving VisualPDE's dat.gui-based left/right UI panels,
 * extracted from the ad hoc scripts used to manually verify GUI-affecting changes throughout
 * earlier work this session (the species/algebraic controller refactor, the GlobalInt feature,
 * placeholder text). Used by every *.test.mjs file alongside check-presets.mjs.
 */
import { BASE_URL } from "./server.mjs";

/**
 * Navigates to `path` (default the plain sim page), dismisses the first-visit welcome modal if
 * present, and opens the left GUI panel (the "f(x)" button, id="equations" - unrelated to the
 * "Equations" dat.gui folder of the same name).
 */
export async function launchAt(page, path = "/sim/") {
  await page.goto(BASE_URL + path, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1200);
  // "Skip the tour" (id=welcome_no) - matched by id, not label text, since the copy on this
  // button has already changed once (was "No, let me jump in!").
  const skipTour = page.locator("#welcome_no");
  if (await skipTour.isVisible().catch(() => false)) {
    await skipTour.click();
    await page.waitForTimeout(200);
  }
  await page.locator("#equations").click();
  await page.waitForTimeout(200);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Exact (not substring) match on the folder's title text - dat.gui folder names can be
 * substrings of one another (e.g. "Parameters" vs "Parameters and notation"), and Playwright's
 * `hasText` string form does a substring match, which previously caused `ensureOpen(page,
 * "Parameters")` to silently match and toggle "Parameters and notation" instead.
 */
function folderTitle(page, titleText) {
  return page.locator("li.title").filter({ hasText: new RegExp(`^${escapeRegExp(titleText)}$`) }).first();
}

async function isFolderClosed(page, titleText) {
  return folderTitle(page, titleText).evaluate((li) =>
    li.parentElement.classList.contains("closed"),
  );
}

/** Idempotently expands a dat.gui folder by its exact title text. */
export async function ensureOpen(page, titleText) {
  if (await isFolderClosed(page, titleText)) {
    await folderTitle(page, titleText).click();
    await page.waitForTimeout(200);
  }
}

/** Idempotently collapses a dat.gui folder by its exact title text. */
export async function ensureClosed(page, titleText) {
  if (!(await isFolderClosed(page, titleText))) {
    await folderTitle(page, titleText).click();
    await page.waitForTimeout(200);
  }
}

/**
 * Counts controller rows (li.cr) immediately following the given folder's title, up to (not
 * including) the next li.title - i.e. this folder's direct contents, whether or not they're a
 * nested sub-folder's own title/contents (those show up as a plain li.cr.function row for the
 * sub-folder-opening button in dat.gui's DOM, so they're skipped automatically since only rows
 * with the "cr" class and no "display:none" are counted). Returns { total, visible }.
 */
export async function countVisibleControllers(page, titleText) {
  return page.evaluate((title) => {
    const titles = [...document.querySelectorAll("li.title")];
    const start = titles.find((li) => li.textContent.trim() === title);
    if (!start) return { total: 0, visible: 0 };
    let el = start.nextElementSibling;
    let total = 0;
    let visible = 0;
    while (el && !el.classList.contains("title")) {
      if (el.classList.contains("cr")) {
        total++;
        if (el.style.display !== "none") visible++;
      }
      el = el.nextElementSibling;
    }
    return { total, visible };
  }, titleText);
}

/**
 * Drives the "Variables" folder's "Number" <select>. Scoped to the controller whose
 * .property-name is exactly "Number" (via .filter({has: ...}), not a loose/substring
 * `hasText` match on the whole li.cr) - a plain substring match is both case-insensitive
 * and matches multiple unrelated controls (e.g. "Contour Number").
 */
export async function setNumSpecies(page, n) {
  await page
    .locator("li.cr")
    .filter({ has: page.locator(".property-name", { hasText: /^Number$/ }) })
    .locator("select")
    .selectOption(String(n));
  await page.waitForTimeout(300);
}

/** Drives the "Variables" folder's "No. algebraic" <select> - see setNumSpecies for why this
 * is scoped to an exact .property-name match rather than a loose `hasText` substring. */
export async function setNumAlgebraic(page, n) {
  await page
    .locator("li.cr")
    .filter({ has: page.locator(".property-name", { hasText: /^No\. algebraic$/ }) })
    .locator("select")
    .selectOption(String(n));
  await page.waitForTimeout(300);
}

/**
 * Toggles the "Cross diffusion" button to the requested on/off state. A no-op if the button is
 * currently hidden entirely (numSpecies==1, where cross-diffusion is meaningless).
 */
export async function setCrossDiffusion(page, on) {
  const btn = page.locator("#cross_diffusion_controller");
  if (!(await btn.isVisible())) return;
  const isOn = await btn.evaluate((el) => el.classList.contains("toggled_on"));
  if (isOn !== on) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Attaches console/pageerror listeners to `page` and returns the accumulator array messages get
 * pushed into - call this once per page, before navigating.
 */
export function collectErrors(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console.error] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[uncaught exception] ${err.message}`));
  return errors;
}
