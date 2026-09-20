/**
 * Formalizes the manual Playwright verification done for the species 1-4/5-8 controller-code
 * unification refactor (see main.js's timescale/diffusion/reaction/boundary-condition/initial-
 * condition controller creation, setBCsGUI(), showSpeciesGUIPanels/hideSpeciesGUIPanels, and
 * the setGUIControllerName re-labeling block) into a permanent regression test.
 *
 * One shared browser tab is reused across every test in this file (via before/after), matching
 * check-presets.mjs's approach for speed.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ensureServerRunning } from "./server.mjs";
import {
  launchAt,
  ensureOpen,
  countVisibleControllers,
  setNumSpecies,
  setNumAlgebraic,
  setCrossDiffusion,
  collectErrors,
} from "./gui-helpers.mjs";

let browser, page, stopServer, errors;

before(async () => {
  stopServer = await ensureServerRunning();
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
  errors = collectErrors(page);
  await launchAt(page);
  await ensureOpen(page, "Equations");
  await ensureOpen(page, "Diffusion coefficients");
  await ensureOpen(page, "Forcing terms");
  await ensureOpen(page, "Boundary conditions");
  await ensureOpen(page, "Initial conditions");
  await ensureOpen(page, "Parameters");
  await ensureOpen(page, "Variables");
});

after(async () => {
  await browser.close();
  stopServer();
});

// A representative subset of numSpecies (not all 8) to keep runtime reasonable - 1 (no
// cross-diffusion toggle), a species 1-4 case, and species-5-8 cases at the boundary (5) and
// max (8).
const REPRESENTATIVE_NUM_SPECIES = [1, 2, 4, 5, 8];

for (const n of REPRESENTATIVE_NUM_SPECIES) {
  for (const cross of n === 1 ? [false] : [false, true]) {
    test(`numSpecies=${n} crossDiffusion=${cross}: diffusion/reaction/BCs/initCond controller counts match`, async () => {
      await setNumSpecies(page, n);
      await setCrossDiffusion(page, cross);

      const diffusion = await countVisibleControllers(page, "Diffusion coefficients");
      assert.equal(diffusion.total, 64, "all 8x8 diffusion controllers should always exist");
      assert.equal(diffusion.visible, cross ? n * n : n);

      const reaction = await countVisibleControllers(page, "Forcing terms");
      assert.equal(reaction.visible, n);

      const bcs = await countVisibleControllers(page, "Boundary conditions");
      // Only the BC-type dropdown is species-count-gated; dirichlet/neumann/robin/combo stay
      // hidden until a species' BC type is actually changed away from the "periodic" default.
      assert.equal(bcs.visible, n);

      const initCond = await countVisibleControllers(page, "Initial conditions");
      assert.equal(initCond.visible, n);
    });
  }
}

for (const n of [4, 8]) {
  test(`numSpecies=${n}: making the last species algebraic hides exactly its self-diffusion controller`, async () => {
    await setNumSpecies(page, n);
    await setCrossDiffusion(page, true);
    await setNumAlgebraic(page, 0);
    const before = await countVisibleControllers(page, "Diffusion coefficients");
    await setNumAlgebraic(page, 1);
    const after = await countVisibleControllers(page, "Diffusion coefficients");
    assert.equal(after.visible, before.visible - 1);
    // Reset so later tests in this file aren't affected.
    await setNumAlgebraic(page, 0);
  });
}

test("no console errors or uncaught exceptions occurred across the whole sweep", () => {
  assert.deepEqual(errors, []);
});
