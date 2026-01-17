class TwoWayMap {
  constructor(map) {
    this.map = map;
    this.reverseMap = {};
    for (const key in map) {
      const value = map[key];
      this.reverseMap[value] = key;
    }
  }
  get(key) {
    return this.map[key];
  }
  revGet(key) {
    return this.reverseMap[key];
  }
}

export function minifyPreset(preset) {
  var miniPreset = {};
  const pm = presetMap();
  for (var key of Object.keys(preset)) {
    if (pm.map.hasOwnProperty(key)) {
      // Use a minified name if one is defined.
      miniPreset[pm.get(key)] = preset[key];
    } else {
      // Fallback to inserting the non-minified version.
      miniPreset[key] = preset[key];
    }
  }
  return miniPreset;
}

export function maxifyPreset(mp) {
  var preset = {};
  const pm = presetMap();
  for (var key of Object.keys(mp)) {
    if (pm.reverseMap.hasOwnProperty(key)) {
      // Use a minified name if one is defined.
      preset[pm.revGet(key)] = mp[key];
    } else {
      // Fallback to inserting the non-minified version.
      preset[key] = mp[key];
    }
  }
  return preset;
}

function presetMap() {
  return new TwoWayMap({
    activeViewInd: "aVi",
    algebraicV: "aV",
    algebraicW: "aW",
    autoPause: "ap",
    autoPauseAt: "apa",
    autoSetColourRange: "a",
    backgroundColour: "b",
    boundaryConditions_1: "bU",
    boundaryConditions_2: "bV",
    boundaryConditions_3: "bW",
    boundaryConditions_4: "bQ",
    brushAction: "ba",
    brushEnabled: "be",
    brushRadius: "br",
    brushValue: "bv",
    cameraTheta: "ct",
    cameraPhi: "cp",
    cameraZoom: "cz",
    initCond_1: "cU",
    initCond_2: "cV",
    initCond_3: "cW",
    initCond_4: "cQ",
    colourbar: "cb",
    colourbarMaxStr: "cM",
    colourbarMinStr: "cm",
    colourmap: "c",
    comboStr_1: "csU",
    comboStr_2: "csV",
    comboStr_3: "csW",
    comboStr_4: "csQ",
    contours: "co",
    contourColour: "cC",
    contourEpsilon: "cE",
    contourNum: "cN",
    crossDiffusion: "cD",
    customSurface: "cu",
    diffusionStr_1_1: "dUU",
    diffusionStr_1_2: "dUV",
    diffusionStr_1_3: "dUW",
    diffusionStr_1_4: "dUQ",
    diffusionStr_2_1: "dVU",
    diffusionStr_2_2: "dVV",
    diffusionStr_2_3: "dVW",
    diffusionStr_2_4: "dVQ",
    diffusionStr_3_1: "dWU",
    diffusionStr_3_2: "dWV",
    diffusionStr_3_3: "dWW",
    diffusionStr_3_4: "dWQ",
    diffusionStr_4_1: "dQU",
    diffusionStr_4_2: "dQV",
    diffusionStr_4_3: "dQW",
    diffusionStr_4_4: "dQQ",
    dirichletStr_1: "dU",
    dirichletStr_2: "dV",
    dirichletStr_3: "dW",
    dirichletStr_4: "dQ",
    dimension: "di",
    domainIndicatorFun: "d",
    domainScale: "ds",
    domainViaIndicatorFun: "dv",
    drawIn3D: "dr",
    dt: "dt",
    emboss: "e",
    embossAmbient: "eA",
    embossDiffuse: "eD",
    embossPhi: "eP",
    embossShiny: "eSh",
    embossSmoothness: "eSm",
    embossSpecular: "eSp",
    embossTheta: "eT",
    fixRandSeed: "f",
    flippedColourmap: "fc",
    forceManualInterpolation: "fI",
    forceTryClickingPopup: "fT",
    imagePathOne: "io",
    imagePathTwo: "it",
    initialState: "iS",
    integrate: "i",
    kineticParams: "k",
    lineWidthMul: "lm",
    maxColourValue: "ma",
    maxSurfaceValue: "mas",
    minColourValue: "mi",
    minSurfaceValue: "mis",
    neumannStr_1: "nU",
    neumannStr_2: "nV",
    neumannStr_3: "nW",
    neumannStr_4: "nQ",
    numAlgebraicSpecies: "na",
    numSpecies: "n",
    numTimestepsPerFrame: "nT",
    oneDimensional: "o",
    onlyExposeOptions: "oE",
    overlay: "ov",
    overlayColour: "oC",
    overlayEpsilon: "ovE",
    overlayExpr: "oF",
    parent: "pa",
    plotType: "pT",
    preset: "p",
    randSeed: "rs",
    reactionNames: "rn",
    resetOnImageLoad: "ri",
    renderSize: "r",
    reactionStr_1: "rU",
    reactionStr_2: "rV",
    reactionStr_3: "rW",
    reactionStr_4: "rQ",
    resetFromCheckpoints: "rF",
    resizeCheckpoints: "rC",
    robinStr_1: "roU",
    robinStr_2: "roV",
    robinStr_3: "roW",
    robinStr_4: "roQ",
    runningOnLoad: "rL",
    showAllOptionsOverride: "s",
    smoothingScale: "sm",
    spatialStep: "sp",
    speciesNames: "sn",
    squareCanvas: "sq",
    surfaceFun: "sF",
    suppressTryClickingPopup: "su",
    threeD: "t",
    threeDHeightScale: "th",
    timeDisplay: "td",
    timesteppingScheme: "ts",
    tryClickingText: "tc",
    typesetCustomEqs: "te",
    brushType: "tb",
    views: "v",
    whatToDraw: "wd",
    whatToPlot: "wp",
  });
}
