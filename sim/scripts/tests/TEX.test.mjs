import { test } from "node:test";
import assert from "node:assert/strict";
import {
  equationTEXFun,
  buildEquationTEX,
  getDefaultTeXLabelsDiffusion,
  getDefaultTeXLabelsTimescales,
  getDefaultTeXLabelsReaction,
  getDefaultTeXLabelsBCsICs,
  substituteGreek,
} from "../RD/TEX.js";

test("equationTEXFun returns all 13 hand-written entries, each a balanced $...aligned...$ block", () => {
  const out = equationTEXFun();
  assert.equal(out.length, 13);
  for (const entry of out) {
    assert.match(entry, /^\$\\begin\{aligned\}/);
    assert.match(entry, /\\end\{aligned\}\$$/);
  }
});

test("buildEquationTEX: 1 species, no cross diffusion, not algebraic - matches equationTEXFun()[0]", () => {
  const expected = equationTEXFun()[0];
  const actual = buildEquationTEX(["u"], ["UFUN"], false, [false]);
  assert.equal(actual, expected);
});

test("buildEquationTEX: 4 species with cross diffusion, no algebraic - matches equationTEXFun()[9]", () => {
  const expected = equationTEXFun()[9];
  const actual = buildEquationTEX(
    ["u", "v", "w", "q"],
    ["UFUN", "VFUN", "WFUN", "QFUN"],
    true,
    [false, false, false, false],
  );
  assert.equal(actual, expected);
});

test("buildEquationTEX: 4 species, cross diffusion, v algebraic - matches equationTEXFun()[10]", () => {
  const expected = equationTEXFun()[10];
  const actual = buildEquationTEX(
    ["u", "v", "w", "q"],
    ["UFUN", "VFUN", "WFUN", "QFUN"],
    true,
    [false, false, false, true],
  );
  assert.equal(actual, expected);
});

test("buildEquationTEX: algebraic species with cross diffusion off has no diffusion term (empty divergence, uncleaned)", () => {
  const actual = buildEquationTEX(["u", "v"], ["UFUN", "VFUN"], false, [
    false,
    true,
  ]);
  // buildEquationTEX itself does NOT clean up the empty divergence operator - that's done by
  // main.js's setEquationDisplayType() shared post-processing pipeline downstream.
  assert.match(actual, /\\textstyle tau_\{v\} v &= \\vnabla \\cdot\(\) \+ VFUN/);
  assert.match(actual, /\\textstyle tau_\{u\} \\pd\{u\}\{t\} &= \\vnabla \\cdot\(D_\{u\} \\vnabla u\) \+ UFUN/);
});

test("buildEquationTEX: self-diffusion label is single-letter without cross diffusion, doubled with it", () => {
  const withoutCross = buildEquationTEX(["u"], ["UFUN"], false, [false]);
  assert.match(withoutCross, /D_\{u\}/);
  assert.doesNotMatch(withoutCross, /D_\{u u\}/);

  const withCross = buildEquationTEX(["u", "v"], ["UFUN", "VFUN"], true, [
    false,
    false,
  ]);
  assert.match(withCross, /D_\{u u\}/);
});

test("buildEquationTEX: works generatively for numSpecies up to 8, one line per species", () => {
  for (let n = 1; n <= 8; n++) {
    const species = Array.from({ length: n }, (_, i) => `s${i}`);
    const reactions = Array.from({ length: n }, (_, i) => `R${i}`);
    for (const crossDiffusion of [false, true]) {
      const algebraicFlags = Array.from({ length: n }, () => false);
      const out = buildEquationTEX(species, reactions, crossDiffusion, algebraicFlags);
      const lineCount = out.split("\\\\").length;
      assert.equal(lineCount, n, `numSpecies=${n} crossDiffusion=${crossDiffusion}`);
      for (const r of reactions) assert.match(out, new RegExp(r));
    }
  }
});

test("buildEquationTEX: every species can independently be algebraic, for numSpecies 2-8", () => {
  for (let n = 2; n <= 8; n++) {
    const species = Array.from({ length: n }, (_, i) => `s${i}`);
    const reactions = Array.from({ length: n }, (_, i) => `R${i}`);
    for (let algebraicIndex = 1; algebraicIndex < n; algebraicIndex++) {
      const algebraicFlags = Array.from({ length: n }, (_, i) => i === algebraicIndex);
      for (const crossDiffusion of [false, true]) {
        const out = buildEquationTEX(species, reactions, crossDiffusion, algebraicFlags);
        // Algebraic species use "tau_{s} s" (no time derivative); others use "\pd{s}{t}".
        assert.match(
          out,
          new RegExp(`tau_\\{s${algebraicIndex}\\} s${algebraicIndex} &=`),
        );
      }
    }
  }
});

test("getDefaultTeXLabelsDiffusion: species 1-4 hand-written labels", () => {
  const labels = getDefaultTeXLabelsDiffusion();
  assert.equal(labels["Du"], "$D_{u}$");
  assert.equal(labels["Duv"], "$D_{u v}$");
  assert.equal(labels["Dqq"], "$D_{q q}$");
});

test("getDefaultTeXLabelsDiffusion: species 5-8 generated labels cover every pair touching 5-8", () => {
  const labels = getDefaultTeXLabelsDiffusion();
  assert.equal(labels["Du5"], "$D_{u5}$");
  assert.equal(labels["Du8"], "$D_{u8}$");
  assert.equal(labels["U5U"], "$D_{u5 u}$");
  assert.equal(labels["U5U6"], "$D_{u5 u6}$");
  assert.equal(labels["UU5"], "$D_{u u5}$");
});

test("getDefaultTeXLabelsTimescales", () => {
  const labels = getDefaultTeXLabelsTimescales();
  assert.equal(labels["TU"], "$tau_{u}$");
  assert.equal(labels["TU5"], "$tau_{u5}$");
  assert.equal(labels["TU8"], "$tau_{u8}$");
});

test("getDefaultTeXLabelsReaction", () => {
  const labels = getDefaultTeXLabelsReaction();
  assert.equal(labels["UFUN"], "$UFUN$");
  assert.equal(labels["UFUN5"], "$UFUN5$");
  assert.equal(labels["UFUN8"], "$UFUN8$");
});

test("getDefaultTeXLabelsBCsICs: species 1-4 and 5-8 both present", () => {
  const labels = getDefaultTeXLabelsBCsICs();
  assert.equal(labels["u"], "$u$");
  assert.equal(labels["uD"], "$\\left. u \\right\\rvert_{\\boundary}$");
  assert.equal(labels["u5"], "$u5$");
  assert.equal(labels["u8G"], "$\\text{Ghost node}$");
});

test("substituteGreek: whole-word Greek letter names get a backslash prefix", () => {
  assert.equal(substituteGreek("alpha + beta"), "\\alpha + \\beta");
  assert.equal(substituteGreek("alphabet"), "alphabet"); // not a whole word
  assert.equal(substituteGreek("2*pi*r"), "2*\\pi*r");
});

test("substituteGreek: epsilon becomes 'varepsilon' first, then gets backslash-prefixed like any other Greek name (since 'varepsilon' is itself in the Greek list)", () => {
  assert.equal(substituteGreek("epsilon"), "\\varepsilon");
});

test("substituteGreek: subscripted Greek names are still matched (e.g. alpha_1)", () => {
  assert.equal(substituteGreek("alpha_1"), "\\alpha_1");
});

test("substituteGreek: Greek after an underscore is backslash-prefixed and the subscript wrapped in {}", () => {
  assert.equal(substituteGreek("D_alpha"), "D_{\\alpha}");
  assert.equal(substituteGreek("u_beta + v_gamma"), "u_{\\beta} + v_{\\gamma}");
  assert.equal(substituteGreek("a_theta*b_eta"), "a_{\\theta}*b_{\\eta}");
  assert.equal(substituteGreek("D_alpha(u)"), "D_{\\alpha}(u)");
  assert.equal(substituteGreek("u_tau^2"), "u_{\\tau}^2");
  assert.equal(substituteGreek("T_Alpha"), "T_{\\Alpha}"); // case-insensitive, as for bare Greek
  assert.equal(substituteGreek("_omega"), "_{\\omega}");
});

test("substituteGreek: the rest of the subscripted word is wrapped too, including nested subscripts and more Greek", () => {
  assert.equal(substituteGreek("k_alpha1"), "k_{\\alpha1}");
  assert.equal(substituteGreek("x_mu2b"), "x_{\\mu2b}");
  assert.equal(substituteGreek("u_alpha_1"), "u_{\\alpha_{1}}");
  assert.equal(substituteGreek("f_pi_max"), "f_{\\pi_{max}}");
  assert.equal(substituteGreek("u_alpha_beta"), "u_{\\alpha_{\\beta}}");
  assert.equal(substituteGreek("s_phi_epsilon_2"), "s_{\\phi_{\\varepsilon_{2}}}");
  // Greek after a later underscore in the subscript.
  assert.equal(substituteGreek("u_ab_alpha"), "u_{ab_{\\alpha}}");
});

test("substituteGreek: epsilon after an underscore becomes varepsilon, and varepsilon is not doubled", () => {
  assert.equal(substituteGreek("x_epsilon"), "x_{\\varepsilon}");
  assert.equal(substituteGreek("x_varepsilon"), "x_{\\varepsilon}");
  assert.equal(substituteGreek("beta_epsilon"), "\\beta_{\\varepsilon}");
});

test("substituteGreek: bare and underscored Greek mix without double-substitution", () => {
  assert.equal(substituteGreek("alpha_beta"), "\\alpha_{\\beta}");
  assert.equal(substituteGreek("alpha + D_alpha"), "\\alpha + D_{\\alpha}");
  assert.equal(substituteGreek("epsilon_1"), "\\varepsilon_1");
});

test("substituteGreek: underscored words that only start with a Greek name, or have no Greek, are left alone", () => {
  assert.equal(substituteGreek("x_nuclear"), "x_nuclear"); // not x_{\nuclear}
  assert.equal(substituteGreek("u_pix"), "u_pix");
  assert.equal(substituteGreek("x_1alpha"), "x_1alpha");
  assert.equal(substituteGreek("u_ab + v_12"), "u_ab + v_12");
});
