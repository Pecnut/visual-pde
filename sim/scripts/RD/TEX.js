import {
  MAX_SPECIES_SUPPORTED,
  reactionTokenOfSpecies,
} from "./species_config.js";

export function equationTEXFun() {
  let out = [];
  out[0] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u} \\vnabla u) + UFUN
    \\end{aligned}$`;
  out[1] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u} \\vnabla u) + UFUN\\\\
    \\textstyle tau_{v} \\pd{v}{t} &= \\vnabla \\cdot(D_{v} \\vnabla v) + VFUN
    \\end{aligned}$`;
  out[2] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot (D_{u u} \\vnabla u+D_{u v} \\vnabla v ) + UFUN\\\\
    \\textstyle tau_{v} \\pd{v}{t} &= \\vnabla \\cdot (D_{v u} \\vnabla u+D_{v v} \\vnabla v ) + VFUN
    \\end{aligned}$`;
  out[3] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot (D_{u u} \\vnabla u+D_{u v} \\vnabla v ) + UFUN\\\\
    \\textstyle tau_{v} v &= \\vnabla \\cdot (D_{v u} \\vnabla u) + VFUN
    \\end{aligned}$`;
  out[4] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u} \\vnabla u) + UFUN\\\\
    \\textstyle tau_{v} \\pd{v}{t} &= \\vnabla \\cdot(D_{v} \\vnabla v) + VFUN\\\\
    \\textstyle tau_{w} \\pd{w}{t} &= \\vnabla \\cdot(D_{w} \\vnabla w) + WFUN
    \\end{aligned}$`;
  out[5] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u u} \\vnabla u+D_{u v} \\vnabla v+D_{u w} \\vnabla w) + UFUN\\\\
    \\textstyle tau_{v} \\pd{v}{t} &= \\vnabla \\cdot(D_{v u} \\vnabla u+D_{v v} \\vnabla v+D_{v w} \\vnabla w) + VFUN\\\\
    \\textstyle tau_{w} \\pd{w}{t} &= \\vnabla \\cdot(D_{w u} \\vnabla u+D_{w v} \\vnabla v+D_{w w} \\vnabla w) + WFUN
    \\end{aligned}$`;
  out[6] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u u} \\vnabla u+D_{u v} \\vnabla v+D_{u w} \\vnabla w) + UFUN\\\\
    \\textstyle tau_{v} \\pd{v}{t} &= \\vnabla \\cdot(D_{v u} \\vnabla u+D_{v v} \\vnabla v+D_{v w} \\vnabla w) + VFUN\\\\
    \\textstyle tau_{w} w &= \\vnabla \\cdot(D_{w u} \\vnabla u+D_{w v} \\vnabla v) + WFUN
    \\end{aligned}$`;
  out[7] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u u} \\vnabla u+D_{u v} \\vnabla v+D_{u w} \\vnabla w) + UFUN\\\\
    \\textstyle tau_{v} v &= \\vnabla \\cdot(D_{v u} \\vnabla u+D_{v w} \\vnabla w) + VFUN\\\\
    \\textstyle tau_{w} w &= \\vnabla \\cdot(D_{w u} \\vnabla u+D_{w v} \\vnabla v) + WFUN
    \\end{aligned}$`;
  out[8] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u} \\vnabla u) + UFUN\\\\
    \\textstyle tau_{v} \\pd{v}{t} &= \\vnabla \\cdot(D_{v} \\vnabla v) + VFUN\\\\
    \\textstyle tau_{w} \\pd{w}{t} &= \\vnabla \\cdot(D_{w} \\vnabla w) + WFUN\\\\
    \\textstyle tau_{q} \\pd{q}{t} &= \\vnabla \\cdot(D_{q} \\vnabla q) + QFUN
    \\end{aligned}$`;
  out[9] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u u} \\vnabla u+D_{u v} \\vnabla v+D_{u w} \\vnabla w+D_{u q} \\vnabla q) + UFUN\\\\
    \\textstyle tau_{v} \\pd{v}{t} &= \\vnabla \\cdot(D_{v u} \\vnabla u+D_{v v} \\vnabla v+D_{v w} \\vnabla w+D_{v q} \\vnabla q) + VFUN\\\\
    \\textstyle tau_{w} \\pd{w}{t} &= \\vnabla \\cdot(D_{w u} \\vnabla u+D_{w v} \\vnabla v+D_{w w} \\vnabla w+D_{w q} \\vnabla q) + WFUN\\\\
    \\textstyle tau_{q} \\pd{q}{t} &= \\vnabla \\cdot(D_{q u} \\vnabla u+D_{q v} \\vnabla v+D_{q w} \\vnabla w+D_{q q} \\vnabla q) + QFUN
    \\end{aligned}$`;
  out[10] = `$\\begin{aligned}
    \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u u} \\vnabla u+D_{u v} \\vnabla v+D_{u w} \\vnabla w+D_{u q} \\vnabla q) + UFUN\\\\
    \\textstyle tau_{v} \\pd{v}{t} &= \\vnabla \\cdot(D_{v u} \\vnabla u+D_{v v} \\vnabla v+D_{v w} \\vnabla w+D_{v q} \\vnabla q) + VFUN\\\\
    \\textstyle tau_{w} \\pd{w}{t} &= \\vnabla \\cdot(D_{w u} \\vnabla u+D_{w v} \\vnabla v+D_{w w} \\vnabla w+D_{w q} \\vnabla q) + WFUN\\\\
    \\textstyle tau_{q} q &= \\vnabla \\cdot(D_{q u} \\vnabla u+D_{q v} \\vnabla v+D_{q w} \\vnabla w) + QFUN
    \\end{aligned}$`;
  out[11] = `$\\begin{aligned}
      \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u u} \\vnabla u+D_{u v} \\vnabla v+D_{u w} \\vnabla w+D_{u q} \\vnabla q) + UFUN\\\\
      \\textstyle tau_{v} \\pd{v}{t} &= \\vnabla \\cdot(D_{v u} \\vnabla u+D_{v v} \\vnabla v+D_{v w} \\vnabla w+D_{v q} \\vnabla q) + VFUN\\\\
      \\textstyle tau_{w} w &= \\vnabla \\cdot(D_{w u} \\vnabla u+D_{w v} \\vnabla v+D_{w q} \\vnabla q) + WFUN\\\\
      \\textstyle tau_{q} q &= \\vnabla \\cdot(D_{q u} \\vnabla u+D_{q v} \\vnabla v+D_{q w} \\vnabla w) + QFUN
      \\end{aligned}$`;
  out[12] = `$\\begin{aligned}
      \\textstyle tau_{u} \\pd{u}{t} &= \\vnabla \\cdot(D_{u u} \\vnabla u+D_{u v} \\vnabla v+D_{u w} \\vnabla w+D_{u q} \\vnabla q) + UFUN\\\\
      \\textstyle tau_{v} v &= \\vnabla \\cdot(D_{v u} \\vnabla u+D_{v w} \\vnabla w+D_{v q} \\vnabla q) + VFUN\\\\
      \\textstyle tau_{w} w &= \\vnabla \\cdot(D_{w u} \\vnabla u+D_{w v} \\vnabla v+D_{w q} \\vnabla q) + WFUN\\\\
      \\textstyle tau_{q} q &= \\vnabla \\cdot(D_{q u} \\vnabla u+D_{q v} \\vnabla v+D_{q w} \\vnabla w) + QFUN
      \\end{aligned}$`;
  return out;
}

// Generative counterpart to equationTEXFun() above, used only for numSpecies>4 (the
// 13-entry hand-written array only enumerates every numSpecies/crossDiffusion/algebraic
// combination up to 4 species - doing the same by hand up to 8 species is combinatorially
// infeasible: see the 8-species upgrade plan, Stage 10). One line per species, in the same
// default-notation-placeholder style as equationTEXFun()'s output (default species/reaction
// names as tokens - the caller substitutes real names in later), so the same downstream
// TeX post-processing pipeline (setEquationDisplayType in main.js) applies uniformly
// regardless of which function produced the string.
//
// Matches the <=4-species templates' own convention: self-diffusion uses the single-letter
// "D_{u}" form when cross-diffusion is off (there's only ever one diffusion term, so the
// doubled subscript is redundant - see out[0]/out[1]/out[4]/out[8] above, all
// cross-diffusion-off cases) and the doubled "D_{u u}" form when cross-diffusion is on (see
// out[2] etc., which use "D_{u u}" even for the self term once other species' terms are
// also present).
//
// Algebraic species no longer require cross-diffusion (relaxed - previously the only reason
// was to limit the <=4-species hand-written equationTEX array's combinatorics, not for any
// numerical reason). An algebraic species with cross-diffusion off has no diffusion term at
// all: `others` (species i's own diffusion-term list) reduces to just `[i]` when
// `!crossDiffusion`, and the trailing `.filter` removes even that when `isAlgebraic` is true
// (since configureOptions() always zeros an algebraic species' own self-diffusion), leaving
// `divTerms` empty. setEquationDisplayType()'s shared post-processing pipeline already
// cleans up the resulting empty "\vnabla \cdot()" (and the stray "= +" left behind), so no
// special-casing is needed here.
//
// @param {string[]} species - Default species names (e.g. defaultSpecies.slice(0, n)).
// @param {string[]} reactions - Default reaction tokens (e.g. defaultReactions.slice(0, n)),
//   same length/order as species.
// @param {boolean} crossDiffusion - Whether cross-diffusion terms should be included.
// @param {boolean[]} algebraicFlags - Per-species algebraic flag, same length/order as
//   species (index 0 is never algebraic, matching the rest of the codebase's invariant).
export function buildEquationTEX(
  species,
  reactions,
  crossDiffusion,
  algebraicFlags,
) {
  const n = species.length;
  const lines = species.map((s, i) => {
    const isAlgebraic = algebraicFlags[i];
    const others = (
      crossDiffusion ? Array.from({ length: n }, (_, j) => j) : [i]
    ).filter((j) => !isAlgebraic || j !== i);
    const divTerms = others
      .map((j) => {
        const label = crossDiffusion ? s + " " + species[j] : s;
        return "D_{" + label + "} \\vnabla " + species[j];
      })
      .join("+");
    const lhs = isAlgebraic
      ? "\\textstyle tau_{" + s + "} " + s
      : "\\textstyle tau_{" + s + "} \\pd{" + s + "}{t}";
    return lhs + " &= \\vnabla \\cdot(" + divTerms + ") + " + reactions[i];
  });
  return (
    "$\\begin{aligned}\n    " +
    lines.join("\\\\\n    ") +
    "\n    \\end{aligned}$"
  );
}

export function getDefaultTeXLabelsDiffusion() {
  let TeXStrings = {};
  // Strings for diffusion coefficients.
  TeXStrings["D"] = "$D$";
  TeXStrings["Du"] = "$D_{u}$";
  TeXStrings["Dv"] = "$D_{v}$";
  TeXStrings["Dw"] = "$D_{w}$";
  TeXStrings["Dq"] = "$D_{q}$";
  TeXStrings["Duu"] = "$D_{u u}$";
  TeXStrings["Duv"] = "$D_{u v}$";
  TeXStrings["Duw"] = "$D_{u w}$";
  TeXStrings["Duq"] = "$D_{u q}$";
  TeXStrings["Dvu"] = "$D_{v u}$";
  TeXStrings["Dvv"] = "$D_{v v}$";
  TeXStrings["Dvw"] = "$D_{v w}$";
  TeXStrings["Dvq"] = "$D_{v q}$";
  TeXStrings["Dwu"] = "$D_{w u}$";
  TeXStrings["Dwv"] = "$D_{w v}$";
  TeXStrings["Dww"] = "$D_{w w}$";
  TeXStrings["Dwq"] = "$D_{w q}$";
  TeXStrings["Dqu"] = "$D_{q u}$";
  TeXStrings["Dqv"] = "$D_{q v}$";
  TeXStrings["Dqw"] = "$D_{q w}$";
  TeXStrings["Dqq"] = "$D_{q q}$";

  // Species 5-8 (8-species upgrade, Stage 10): no natural single letter, so every pair
  // touching one of them uses the "U5U1"-style key convention already established for
  // their dat.gui controller names (Stage 9, main.js's diffCtrlKey/configureGUI) - matching
  // it means Stage 9's `TeXStrings[texKey] || <plain fallback>` lookups start resolving to
  // real TeX automatically, no main.js change needed.
  // Also mirrors Du/Dv/Dw/Dq above: a single-letter-style "Du5".."Du8" form for
  // self-diffusion, used (like Du/Dv/Dw/Dq) only when cross-diffusion is off - the doubled
  // "U5U5"-style form above is used when it's on. See buildEquationTEX()'s docstring for the
  // same on/off distinction in the equation-panel TeX.
  for (let i = 5; i <= MAX_SPECIES_SUPPORTED; i++) {
    TeXStrings["Du" + i] = "$D_{u" + i + "}$";
  }
  for (let i = 5; i <= MAX_SPECIES_SUPPORTED; i++) {
    for (let j = 1; j <= MAX_SPECIES_SUPPORTED; j++) {
      const si = "u" + i;
      const sj = j <= 4 ? ["u", "v", "w", "q"][j - 1] : "u" + j;
      const key = si.toUpperCase() + sj.toUpperCase();
      TeXStrings[key] = "$D_{" + si + " " + sj + "}$";
    }
  }
  for (let i = 1; i <= 4; i++) {
    for (let j = 5; j <= MAX_SPECIES_SUPPORTED; j++) {
      const si = ["u", "v", "w", "q"][i - 1];
      const sj = "u" + j;
      const key = si.toUpperCase() + sj.toUpperCase();
      TeXStrings[key] = "$D_{" + si + " " + sj + "}$";
    }
  }

  return TeXStrings;
}

export function getDefaultTeXLabelsTimescales() {
  let TeXStrings = {};
  // Strings for diffusion coefficients.
  TeXStrings["TU"] = "$tau_{u}$";
  TeXStrings["TV"] = "$tau_{v}$";
  TeXStrings["TW"] = "$tau_{w}$";
  TeXStrings["TQ"] = "$tau_{q}$";
  // Species 5-8 (Stage 10): keys must match timescaleTags ("TU5".."TU8", main.js).
  for (let i = 5; i <= MAX_SPECIES_SUPPORTED; i++) {
    TeXStrings["TU" + i] = "$tau_{u" + i + "}$";
  }

  return TeXStrings;
}

export function getDefaultTeXLabelsReaction() {
  let TeXStrings = {};
  // Strings for reactions.
  TeXStrings["UFUN"] = "$UFUN$";
  TeXStrings["VFUN"] = "$VFUN$";
  TeXStrings["WFUN"] = "$WFUN$";
  TeXStrings["QFUN"] = "$QFUN$";
  // Species 5-8 (Stage 10): keys must match reactionTokenOfSpecies() (species_config.js).
  for (let i = 5; i <= MAX_SPECIES_SUPPORTED; i++) {
    const tag = reactionTokenOfSpecies(i - 1);
    TeXStrings[tag] = "$" + tag + "$";
  }

  return TeXStrings;
}

export function getDefaultTeXLabelsBCsICs() {
  let TeXStrings = {};
  // Strings for BCs and ICs controllers.
  TeXStrings["u"] = "$u$";
  TeXStrings["v"] = "$v$";
  TeXStrings["w"] = "$w$";
  TeXStrings["q"] = "$q$";
  TeXStrings["uInit"] = "$\\left. u \\right\\rvert_{t=0}$";
  TeXStrings["vInit"] = "$\\left. v \\right\\rvert_{t=0}$";
  TeXStrings["wInit"] = "$\\left. w \\right\\rvert_{t=0}$";
  TeXStrings["qInit"] = "$\\left. q \\right\\rvert_{t=0}$";
  TeXStrings["uD"] = "$\\left. u \\right\\rvert_{\\boundary}$";
  TeXStrings["vD"] = "$\\left. v \\right\\rvert_{\\boundary}$";
  TeXStrings["wD"] = "$\\left. w \\right\\rvert_{\\boundary}$";
  TeXStrings["qD"] = "$\\left. q \\right\\rvert_{\\boundary}$";
  TeXStrings["uN"] = "$\\left.\\pd{u}{n}\\right\\rvert_{\\boundary}$";
  TeXStrings["vN"] = "$\\left.\\pd{v}{n}\\right\\rvert_{\\boundary}$";
  TeXStrings["wN"] = "$\\left.\\pd{w}{n}\\right\\rvert_{\\boundary}$";
  TeXStrings["qN"] = "$\\left.\\pd{q}{n}\\right\\rvert_{\\boundary}$";
  TeXStrings["uG"] = "$\\text{Ghost node}$";
  TeXStrings["vG"] = "$\\text{Ghost node}$";
  TeXStrings["wG"] = "$\\text{Ghost node}$";
  TeXStrings["qG"] = "$\\text{Ghost node}$";
  // Species 5-8 (Stage 10): keys match Stage 9's controller-naming convention
  // (defaultSpecies[i]+"BCs"/"dirichlet"+S/"neumann"+S/"robin"+S, S=defaultSpecies[i].toUpperCase()).
  for (let i = 5; i <= MAX_SPECIES_SUPPORTED; i++) {
    const s = "u" + i;
    TeXStrings[s] = "$" + s + "$";
    TeXStrings[s + "Init"] = "$\\left. " + s + " \\right\\rvert_{t=0}$";
    TeXStrings[s + "D"] = "$\\left. " + s + " \\right\\rvert_{\\boundary}$";
    TeXStrings[s + "N"] =
      "$\\left.\\pd{" + s + "}{n}\\right\\rvert_{\\boundary}$";
    TeXStrings[s + "G"] = "$\\text{Ghost node}$";
  }

  return TeXStrings;
}

export function substituteGreek(str) {
  let listOfVar = ["epsilon"];
  let listOfGreek = [
    "alpha",
    "beta",
    "gamma",
    "delta",
    "varepsilon",
    "zeta",
    "eta",
    "theta",
    "iota",
    "kappa",
    "lambda",
    "mu",
    "nu",
    "xi",
    "pi",
    "rho",
    "sigma",
    "tau",
    "upsilon",
    "phi",
    "chi",
    "psi",
    "omega",
    "varphi",
    "varpi",
    "varsigma",
    "vartheta",
    "varkappa",
    "varrho",
  ];
  let regex = new RegExp("\\b(" + listOfVar.join("|") + ")(\\b|_)", "ig");
  str = str.replaceAll(regex, "var" + "$1$2");
  regex = new RegExp("\\b(" + listOfGreek.join("|") + ")(\\b|_)", "ig");
  return str.replaceAll(regex, "\\" + "$1$2");
}
