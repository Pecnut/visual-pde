/**
 * This file contains the main function that initializes the simulation and GUI, and imports various shaders and modules.
 * It also defines various variables and constants used throughout the simulation.
 * @file
 * @summary Main file for the simulation.
 */
import {
  drawShaderTop,
  drawShaderBotReplace,
  drawShaderBotAdd,
  drawShaderShapeDisc,
  drawShaderShapeVLine,
  drawShaderShapeHLine,
  drawShaderShapeSquare,
  drawShaderCustom,
  drawShaderFactorSharp,
  drawShaderFactorSmooth,
  uvFragShader,
  drawShaderTopMRT,
  drawShaderBotReplaceMRT,
  drawShaderBotAddMRT,
} from "./drawing_shaders.js";
import {
  computeDisplayFunShaderTop,
  computeDisplayFunShaderMid,
  postGenericShaderBot,
  postShaderDomainIndicator,
  postShaderDomainIndicatorVField,
  interpolationShader,
  minMaxShader,
  sumShader,
  probeShader,
  computeDisplayFunShaderTopMRT,
  computeDisplayFunShaderMidMRT,
  probeShaderMRT,
} from "./post_shaders.js";
import { copyShader, copyShaderMRT } from "../copy_shader.js";
import {
  RDShaderTop,
  RDShaderBot,
  RDShaderDirichletX,
  RDShaderDirichletY,
  RDShaderDirichletIndicatorFun,
  RDShaderRobinX,
  RDShaderRobinY,
  RDShaderRobinCustomDomainX,
  RDShaderRobinCustomDomainY,
  RDShaderUpdateNormal,
  RDShaderUpdateCross,
  RDShaderAlgebraicSpecies,
  RDShaderEnforceDirichletTop,
  RDShaderEnforceDirichletTopMRT,
  RDShaderEnforceDirichletBotMRT,
  RDShaderAdvectionPreBC,
  RDShaderAdvectionPostBC,
  RDShaderDiffusionPreBC,
  RDShaderDiffusionPostBC,
  RDShaderGhostX,
  RDShaderGhostY,
  RDShaderMain,
  clampSpeciesToEdgeShader,
  globalIntegralShader,
  globalIntegralShaderMRT,
  RDShaderTopMRT,
  RDShaderMainMRT,
  RDShaderUpdateNormalMRT,
  RDShaderUpdateCrossMRT,
  RDShaderBotMRT,
} from "./simulation_shaders.js";
import { randShader, randNShader } from "../rand_shader.js";
import {
  fiveColourDisplayTop,
  fiveColourDisplayBot,
  embossShader,
  contourShader,
  surfaceVertexShaderColour,
  surfaceVertexShaderCustom,
  overlayShader,
  fiveColourDisplayTopMRT,
  overlayShaderMRT,
} from "./display_shaders.js";
import { getColours } from "../colourmaps.js";
import { genericVertexShader } from "../generic_shaders.js";
import {
  getPreset,
  getResolvedPreset,
  getUserTextFields,
  getFieldsInView,
  getOldPresetFieldsToNew,
  getListOfPresetNames,
  coerceOptions,
} from "./presets.js";
import {
  clearShaderBot,
  clearShaderTop,
  clearShaderTopMRT,
  clearShaderBotMRT,
} from "./clear_shader.js";
import {
  numGroups,
  groupOfSpecies,
  channelCharOfSpecies,
  diffusionLabel,
  reactionTokenOfSpecies,
  MAX_SPECIES_SUPPORTED,
} from "./species_config.js";
import { auxiliary_GLSL_funs } from "../auxiliary_GLSL_funs.js";
import * as THREE from "../three.module.min.js";
import { OrbitControls } from "../OrbitControls.js";
import { Line2 } from "../lines/Line2.js";
import { LineMaterial } from "../lines/LineMaterial.js";
import { LineGeometry } from "../lines/LineGeometry.js";
import { minifyPreset, maxifyPreset } from "./minify_preset.js";
import { LZString } from "../lz-string.min.js";
import {
  equationTEXFun,
  buildEquationTEX,
  getDefaultTeXLabelsDiffusion,
  getDefaultTeXLabelsReaction,
  getDefaultTeXLabelsBCsICs,
  getDefaultTeXLabelsTimescales,
  substituteGreek,
} from "./TEX.js";
import { closestMatch } from "../../../assets/js/closest-match.js";
import { Stats } from "../stats.min.js";
import { createWelcomeTour } from "./tours.js";

if (expandingOptionsInProgress) {
  let checkIfOptionsLoaded = setInterval(() => {
    if (linkParsed) {
      clearInterval(checkIfOptionsLoaded);
      VisualPDE(simURL);
    }
  }, 50);
} else {
  VisualPDE();
}

async function VisualPDE(url) {
  let canvas, gl, manualInterpolationNeeded, camCanvas;
  let camera, simCamera, scene, simScene, renderer, aspectRatio, controls;
  let simTextures = [],
    // Only allocated once numGroups(options.numSpecies)>1 (i.e. numSpecies>4). Each entry is
    // a THREE.WebGLMultipleRenderTargets holding one colour attachment per texture group, so
    // that a single Forward-Euler MRT pass can write every group's species in one render call.
    // simTextures (above) stays exactly as it is today and is what's used whenever
    // numGroups===1, so the <=4-species code path/performance is completely unaffected by
    // this array ever existing. See species_config.js and the Stage 3 upgrade notes.
    mrtSimTextures = [],
    postTexture,
    interpolationTexture,
    probeTexture,
    clickTexture,
    simTextureOpts,
    reductionTextures = [],
    checkpointTexture,
    // Group 1 (species 5-8) counterpart of checkpointTexture; null whenever the current
    // checkpoint has no group-1 data (numGroups was 1 when it was captured/loaded).
    checkpointTextureGroup1;
  let displayMaterial,
    drawMaterial,
    clickMaterial,
    clearColour,
    simMaterials = {},
    dirichletMaterial,
    clearMaterial,
    copyMaterial,
    postMaterial,
    probeMaterial,
    globalIntegralMaterial,
    lineMaterial,
    overlayLineMaterial,
    arrowMaterial,
    interpolationMaterial,
    checkpointMaterial,
    // MRT (>4-species) counterpart of checkpointMaterial - a MeshBasicMaterial can't sample
    // two textures/write two outputs, so restoring a checkpoint once numGroups>1 needs a
    // real dual-input, dual-output ShaderMaterial instead (built once at init, like
    // checkpointMaterial itself).
    checkpointMaterialMRT,
    minMaxMaterial,
    sumMaterial,
    tailGeometry,
    headGeometry;
  let domain, simDomain, line, overlayLine;
  let xDisplayDomainCoords, yDisplayDomainCoords, numPointsInLine, arrowGroup;
  let colourmap,
    colourmapEndpoints,
    cLims = [0, 1],
    cLimsDependOnParams = false;
  let options,
    uniforms,
    minMaxUniforms,
    funsObj,
    savedOptions,
    comboBCsOptions = { type: "", value: "", open: false },
    localOpts = { id: null };
  let leftGUI,
    rightGUI,
    viewsGUI,
    comboBCsGUI,
    probeChart,
    root,
    controllers = [],
    contoursControllers = [],
    embossControllers = [],
    surfaceButtons,
    fIm,
    imControllerOne,
    imControllerTwo,
    imControllerBlend,
    editEquationsFolder,
    variablesFolder,
    diffusionCoeffsFolder,
    reactionTermsFolder,
    timescalesFolder,
    diffusionMatrixButton,
    crossDiffusionToggle,
    boundaryConditionsFolder,
    initialConditionsFolder,
    // variablesAndParamsFolder,
    editViewFolder,
    viewFeatureToggles,
    linesAnd3DFolder,
    linesFolderButton,
    threeDFolderButton,
    vectorFieldFolder,
    devFolder,
    selectedEntries = new Set();
  let isRunning,
    isSuspended = false,
    isLoading = true,
    isRecording = false,
    isOptimising = false,
    runningBeforeError = false,
    canTimeStep = true,
    simObserver,
    hasErrored = false,
    canAutoPause = true,
    autoPauseStopValue = 0,
    isDrawing,
    hasDrawn,
    shouldCheckNaN = true,
    isStory = false,
    wasLinePlot = false,
    shaderContainsRAND = false,
    shaderContainsGlobalIntegral = false,
    anyDirichletBCs,
    dataNudgedUp = false,
    probeNudgedUp = false,
    compileErrorOccurred = false,
    NaNTimer,
    brushDisabledTimer,
    recordingTimer,
    stabilisingFPSTimer,
    titleBlurTimer,
    webcamTimer,
    recordingTextInterval,
    uiHidden = false,
    showColourbarOverride = false,
    checkpointExists = false,
    nextViewNumber = 0,
    frameCount = 0,
    timestepCount = 0,
    lastFPS,
    rate,
    lastT,
    lastTime,
    seed = performance.now(),
    updatingAlgebraicSpecies = false,
    optimisationDelay = 4000,
    viewUIOffsetInit,
    simURL,
    longSimURL,
    lastShortenedOpts,
    lastShortKey,
    shortenAborter,
    // State used by syncURLWithOptions() to keep the URL up to date with options.
    lastOptionsFingerprint,
    settlingFingerprint,
    lastURLOptions,
    urlSyncTimer;
  // How often (in ms) to check whether the URL needs replacing to reflect a change in
  // options. Checking is cheap (a JSON.stringify, well under a millisecond even on a
  // throttled phone); it's rebuilding the URL that costs, so syncURLWithOptions() waits
  // for a second unchanged check rather than rebuilding it on the first.
  const urlSyncPeriod = 200;
  // The search parameters that describe the state of the simulation, and which are
  // therefore superseded by the options parameter written by syncURLWithOptions().
  const stateSearchParams = ["options", "preset", "mini", "view"];
  let spatialStepValue,
    nXDisc,
    nYDisc,
    domainWidth,
    domainHeight,
    maxDim,
    maxTexSize,
    canvasWidth,
    canvasHeight,
    usingLowResDomain = true,
    domainScaleValue = 1,
    domainScaleFactor = 1,
    baseArrowScale = 0.15;
  let parametersFolder,
    kineticParamsStrs = {},
    kineticParamsLabels = [],
    kineticNameToCont = {},
    kineticParamsVals = [],
    kineticParamsCounter = 0,
    nextParamController;
  let expressionsFolder,
    expressionsStrs = {},
    expressionsLabels = [],
    expressionNameToCont = {},
    expressionsCounter = 0,
    nextExpressionController,
    // Fully dependency-resolved expression definitions ({name: expandedGLSLDefinitionString}),
    // rebuilt by refreshExpressionExpansions() (called at the top of updateShaders()) and
    // consumed by parseShaderString(). See the "Expressions" feature (main.js, search for
    // refreshExpressionExpansions) for the substitution design.
    expandedExpressionDefs = {};
  const llmURL =
    "https://gemini.google.com/gem/1mJ4572e1TJwEHcaYDst0_9keZkx78-zn";
  const defaultPreset = "GrayScott";
  // Species 5-8 have no natural single-letter mnemonic like u/v/w/q, so they use numeric
  // suffixes, consistent with the existing diffusionStr_i_j/reactionStr_i field-naming
  // convention. These four arrays are extended by appending only (indices 0-3 are untouched)
  // so that every existing index-based/sliced-by-numSpecies consumer keeps working
  // identically for numSpecies<=4. See species_config.js and the Stage 1 upgrade plan.
  const defaultSpecies = ["u", "v", "w", "q", "u5", "u6", "u7", "u8"];
  const defaultReactions = [
    "UFUN",
    "VFUN",
    "WFUN",
    "QFUN",
    "UFUN5",
    "UFUN6",
    "UFUN7",
    "UFUN8",
  ];
  // NB: controllers/regexes for TU5-TU8 don't exist until the GUI/TeX stages of the upgrade
  // land, so consumers that iterate this array and look up a controller/regex by tag must
  // guard against a missing entry (see the timescaleTags.forEach call sites below).
  const timescaleTags = ["TU", "TV", "TW", "TQ", "TU5", "TU6", "TU7", "TU8"];
  const placeholderSp = [
    "VARIABLE1",
    "VARIABLE2",
    "VARIABLE3",
    "VARIABLE4",
    "VARIABLE5",
    "VARIABLE6",
    "VARIABLE7",
    "VARIABLE8",
  ];
  const listOfTypes = [
    "1Species", // 0
    "2Species", // 1
    "2SpeciesCrossDiffusion", // 2
    "2SpeciesCrossDiffusionAlgebraicV", // 3
    "3Species", // 4
    "3SpeciesCrossDiffusion", // 5
    "3SpeciesCrossDiffusionAlgebraicW", // 6
    "3SpeciesCrossDiffusionAlgebraicVW", // 7
    "4Species", // 8
    "4SpeciesCrossDiffusion", // 9
    "4SpeciesCrossDiffusionAlgebraicQ", // 10
    "4SpeciesCrossDiffusionAlgebraicWQ", // 11
    "4SpeciesCrossDiffusionAlgebraicVWQ", // 12
  ];
  const brushActions = ["Replace", "Add", "Replace (smooth)", "Add (smooth)"],
    brushActionVals = ["replace", "add", "smoothreplace", "smoothadd"];
  let equationType, algebraicV, algebraicW, algebraicQ;
  // Algebraic-species flags for species 5-8 (0-based indices 4-7), computed in
  // setAlgebraicVarsFromOptions(). Species 1-4 continue to use algebraicV/W/Q above,
  // unchanged - this only covers indices not already handled by those.
  let algebraicSpeciesFlags = {};
  let takeAScreenshot = false,
    mediaRecorder,
    videoChunks;
  let buffer,
    stateBuffer,
    // Group 1 (species 5-8) counterpart of stateBuffer, populated by getRawState() only
    // once numGroups(numSpecies)>1 - see the 8-species upgrade's Stage 11.5 notes.
    stateBufferGroup1,
    postBuffer,
    bufferFilled = false;
  const numsAsWords = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ];

  let equationTEX = equationTEXFun();
  let TeXStrings = {
    ...getDefaultTeXLabelsDiffusion(),
    ...getDefaultTeXLabelsReaction(),
    ...getDefaultTeXLabelsBCsICs(),
    ...getDefaultTeXLabelsTimescales(),
  };
  let listOfSpecies, listOfReactions, anySpeciesRegexStrs;
  const fieldsInView = getFieldsInView();

  let parser = new exprEval.Parser();
  parser.consts.pi = Math.PI;
  parser.consts.Pi = Math.PI;
  parser.consts.e = Math.exp(1.0);

  const stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.id = "stats";
  document.body.appendChild(stats.dom);

  // Setup some configurable options.
  options = {};

  // List of fields that the user can type into.
  const userTextFields = getUserTextFields();

  // An object with functions as fields that the GUI controllers can call.
  funsObj = {
    reset: function () {
      resetSim();
    },
    toggleRunning: function () {
      isRunning ? pauseSim() : playSim();
    },
    copyConfigAsURL: function () {
      if (!simURL) {
        getSimURL();
      }
      copyToClipboard(simURL);
    },
    copyConfigAsLongURL: function () {
      getSimURL(false);
      copyToClipboard(longSimURL);
    },
    saveSimState: function () {
      saveSimState();
    },
    exportSimState: function () {
      exportSimState();
    },
    clearCheckpoints: function () {
      if (checkpointExists) {
        checkpointTexture.dispose();
        checkpointTexture = null;
        checkpointExists = false;
      }
    },
  };

  // Define a handy countDecimals function.
  Number.prototype.countDecimals = function () {
    if (Math.floor(this.valueOf()) === this.valueOf()) return 0;

    var str = this.toString();
    if (str.indexOf(".") !== -1 && str.indexOf("-") !== -1) {
      return str.split("-")[1] || 0;
    } else if (str.indexOf(".") !== -1) {
      return str.split(".")[1].length || 0;
    }
    return str.split("-")[1] || 0;
  };

  // Define a handy clamp function.
  Number.prototype.clamp = function (min, max) {
    return Math.min(Math.max(this, min), max);
  };

  // Define a handy rotate function.
  Array.prototype.rotate = (function () {
    // Save references to array functions to make lookup faster
    var push = Array.prototype.push,
      splice = Array.prototype.splice;

    return function (count) {
      var len = this.length >>> 0, // convert to uint
        count = count >> 0; // convert to int

      // convert count to value in range [0, len)
      count = ((count % len) + len) % len;

      // use splice.call() instead of this.splice() to make function generic
      push.apply(this, splice.call(this, 0, count));
      return this;
    };
  })();

  // Define some handy functions for making things invisible or visible.
  (function ($) {
    $.fn.invisible = function () {
      return this.each(function () {
        $(this).css("visibility", "hidden");
      });
    };
    $.fn.visible = function () {
      return this.each(function () {
        $(this).css("visibility", "visible");
      });
    };
  })(jQuery);

  // Get the canvas to draw on, as specified by the html.
  canvas = document.getElementById("simCanvas");
  // If the webgl context is lost, the user is likely encountering a Safari bug (https://developer.apple.com/forums/thread/737042).
  document.getElementById("simCanvas").addEventListener(
    "webglcontextlost",
    function (event) {
      event.preventDefault();
      if (/iPhone|iPad/i.test(navigator.userAgent)) {
        alert(
          "Oops! An iOS/iPadOS bug has caused the simulation to crash. Fix this by quitting your browser and reopening the simulation (wait until the simulation has loaded before changing tab/application), and perform a software update if possible.",
        );
      }
    },
    false,
  );

  // Warn the user if any errors occur.
  console.error = function (error) {
    // Record the fact that an error has occurred and we need to recompile shaders.
    compileErrorOccurred = true;
    let errorStr = error.toString();
    console.log(errorStr);
    let regex = /ERROR.*/;
    regex.test(errorStr)
      ? (errorStr = errorStr.match(regex).toString().trim())
      : {};
    if (/error C7532/.test(errorStr)) {
      throwError(
        "Oops! It looks like you're using Firefox on a Linux machine with an NVIDIA graphics card. Please use an alternative browser (e.g. Edge or Chrome) to use VisualPDE.",
      );
    } else if (/undeclared identifier/.test(errorStr)) {
      // If an identifier is undeclared, extract it and offer to add it as a parameter.
      let undeclaredVar = errorStr.match(/'([^']+)'/)[1];
      throwError(
        "Unknown symbol: '" +
          undeclaredVar +
          "'. Click <a href='/user-guide/FAQ#undeclared' target='blank'>here</a> for more information.",
        "Add " + undeclaredVar + " as parameter",
        () => {
          addKineticParameterAfterError(undeclaredVar);
        },
      );
    } else {
      throwError(errorStr + ".");
    }
  };

  // Check URL for any specified options.
  // Take the URL stored as a string in url (if it exists) and get the search parameters
  // from it. If it doesn't exist, use the current URL.
  const params = new URLSearchParams(
    (url ? url.split("?")[1] : window.location.search).replaceAll("&amp;", "&"),
  );

  if (params.has("iframeID")) {
    // If an iframe ID is specified, save it for later.
    localOpts.id = params.get("iframeID");
  }

  if (params.has("no_ui")) {
    // Hide all the ui, including buttons.
    $(".ui").addClass("hidden");
    uiHidden = true;
  } else {
    $(".ui").removeClass("hidden");
    $("#probeChartMaximise").hide();
  }

  const logo_only = params.has("logo_only");
  if (logo_only) {
    // Hide all ui except the logo.
    $(".ui").addClass("hidden");
    $("#logo").removeClass("hidden");
    uiHidden = true;
  } else if (!fromExternalLink()) {
    // Remove the logo if we're from an internal link.
    $("#logo").hide();
  }

  const cleanDisplay = params.has("clean");
  if (cleanDisplay) {
    $(".ui").addClass("hidden");
    $("#logo").hide();
    uiHidden = true;
  }

  if (params.has("reset_only")) {
    // Hide all ui except the reset button.
    $(".ui").addClass("hidden");
    $("#erase").removeClass("hidden");
    $("#erase").css("top", "0");
    $("#logo").hide();
    uiHidden = true;
  }

  if (params.has("sf")) {
    // Set the domain scale factor from the search string.
    domainScaleFactor = parseFloat(params.get("sf"));
    if (isNaN(domainScaleFactor) || domainScaleFactor <= 0) {
      domainScaleFactor = 1;
    }
  }

  if (inIframe()) {
    // If we're in an iframe, disable the header.
    $("#header").addClass("hidden");
  } else {
    $("#header").removeClass("hidden");
  }

  // Load default options.
  loadOptions({ preset: "default", isInitialLoad: true });

  // Initialise simulation and GUI.
  init();

  // Load things from the search string, if anything is there.
  // Unless this value is set to false later, we will load a default preset.
  let shouldLoadDefault = true;
  if (params.has("preset")) {
    // If a preset is specified, load it.
    loadPreset(params.get("preset"));
    shouldLoadDefault = false;
    if (params.get("preset") != "Banner")
      window.gtag?.("event", "preset: " + params.get("preset"));
  }
  if (params.has("options")) {
    // If options have been provided, apply them on top of loaded options.
    window.gtag?.("event", "custom_link_followed");
    try {
      var newParams = JSON.parse(
        LZString.decompressFromEncodedURIComponent(params.get("options")),
      );
    } catch (e) {
      throwError(
        "It looks like this link is missing something - please check that it has been copied and pasted correctly and try again.",
      );
      newParams = {};
    }
    if (newParams.hasOwnProperty("p")) {
      // This has been minified, so maxify before loading.
      newParams = maxifyPreset(newParams);
    }
    loadPreset(newParams);
    shouldLoadDefault = false;
  }
  if (shouldLoadDefault) {
    // Load a specific preset as the default.
    loadPreset(defaultPreset);
  }
  if (params) {
    // Loop through entries of params and check if any are fields in options.
    // If so, apply them.
    newParams = {};
    for (let [key, value] of params) {
      if (key in options && key != "preset") {
        newParams[key] = value;
        console.log("Applying " + key + " from URL with value " + value);
      }
    }
    showColourbarOverride =
      newParams.colourbar == "true" || newParams.colourbar == true;
    if (Object.keys(newParams).length) loadPreset(newParams, true, true);
  }

  // If there is an options object in sessionStorage, load it, so long as we're not changing simulation via the URL. This allows a simulation to persist across page reloads.
  const sessionOptions = sessionStorage.getItem("options");
  const oldQueryString = sessionStorage.getItem("oldQueryString");
  if (sessionOptions && oldQueryString == window.location.search) {
    loadPreset(JSON.parse(sessionOptions));
    // Reflect the restored state in the URL. This replaces the current entry rather than
    // pushing a new one, since it describes the same simulation and so doesn't warrant its
    // own entry in the session history.
    syncURLWithOptions(true);
  }
  sessionStorage.removeItem("options");
  sessionStorage.removeItem("oldQueryString");

  if (params.has("view")) {
    options.activeViewInd = Number(params.get("view")).clamp(
      0,
      options.views.length - 1,
    );
    applyView(options.views[options.activeViewInd]);
  }

  // If this is a Visual Story, hide all buttons apart from play/pause, erase and views.
  isStory = params.has("story");
  if (isStory) {
    $("#settings").addClass("hidden");
    $("#equations").addClass("hidden");
    $("#help").addClass("hidden");
    $("#share").addClass("hidden");
    $("#probeChartContainer").addClass("hidden");
    editViewFolder.domElement.classList.add("hidden");
    $("#add_view").addClass("hidden");
    $("#llm-bot").addClass("hidden");
    configureColourbar();

    $("#play").css("top", "-=50");
    $("#pause").css("top", "-=50");
    $("#play_pause_placeholder").css("top", "-=50");
    if (!params.has("reset_only")) $("#erase").css("top", "-=50");
    $("#views").css("top", "-=50");
    $("#views_ui").css("top", "-=50");
    viewUIOffsetInit = $(":root").css("--views-ui-offset");
    $(":root").css("--views-ui-offset", "-=50");
  }

  /* GUI settings and equations buttons */
  $("#settings").click(function () {
    window.gtag?.("event", "settings_open");
    toggleRightUI();
    if ($("#right_ui").is(":visible") && $("#help_panel").is(":visible")) {
      toggleHelpPanel();
    }
    if ($("#right_ui").is(":visible") && $("#share_panel").is(":visible")) {
      toggleSharePanel();
    }
    if (window.innerWidth < 629 && $("#right_ui").is(":visible")) {
      if ($("#left_ui").is(":visible")) toggleLeftUI();
      if ($("#views_ui").is(":visible")) toggleViewsUI();
    }
    if ($("#left_ui").is(":visible")) resizeEquationDisplay();
  });
  $("#equations").click(function () {
    window.gtag?.("event", "equations_open");
    toggleLeftUI();
    resizeEquationDisplay();
    if (
      window.innerWidth < 629 &&
      $("#right_ui").is(":visible") &&
      $("#left_ui").is(":visible")
    ) {
      toggleRightUI();
    }
    if ($("#views_ui").is(":visible") && $("#left_ui").is(":visible")) {
      toggleViewsUI();
    }
    if ($("#share_panel").is(":visible")) {
      toggleSharePanel();
      abortShorten();
    }
  });
  $("#pause").click(function () {
    pauseSim();
    document.getElementById("play").focus();
  });
  $("#play").click(function () {
    playSim();
    document.getElementById("pause").focus();
  });
  $("#erase").click(function () {
    window.gtag?.("event", "sim_reset");
    resetSim();
  });
  $("#share").click(function () {
    window.gtag?.("event", "share_menu_open");
    toggleSharePanel();
    if ($("#share_panel").is(":visible")) {
      // Generate and minify the simulation link.
      getSimURL();
      // Close the equations and views menus.
      if ($("#left_ui").is(":visible")) {
        toggleLeftUI();
      }
      if ($("#views_ui").is(":visible")) {
        toggleViewsUI();
      }
    } else {
      // Abort any running minification process.
      abortShorten();
    }
    if ($("#help_panel").is(":visible")) {
      toggleHelpPanel();
    }
    if ($("#right_ui").is(":visible")) {
      toggleRightUI();
    }
  });
  $("#help").click(function () {
    window.gtag?.("event", "help_menu_open");
    toggleHelpPanel();
    if ($("#share_panel").is(":visible")) {
      toggleSharePanel();
    }
  });
  $("#llm-bot").click(function () {
    window.gtag?.("event", "llm_bot_click");
    $("#llm-message").show();
  });
  $("#screenshot").click(function () {
    window.gtag?.("event", "screenshot");
    takeAScreenshot = true;
    render();
    toggleSharePanel();
  });
  $("#record").click(function () {
    // Record a video of the simulation.
    window.gtag?.("event", "recording_started");
    stopRecording();
    startRecording();
    toggleSharePanel();
  });
  $("#stop_recording").click(function () {
    // Stop recording a video of the simulation.
    stopRecording();
  });
  $("#video_quality").change(function () {
    $("#video_quality").blur();
  });
  $("#link").click(function () {
    window.gtag?.("event", "link_copied");
    funsObj.copyConfigAsURL();
    toggleSharePanel();
  });
  $("#embed").click(function () {
    window.gtag?.("event", "embed");
    copyIframe();
    toggleSharePanel();
  });
  $("#embed_ui_type").change(function () {
    $("#embed_ui_type").blur();
  });
  $("#help_panel .container .button").click(function () {
    toggleHelpPanel();
  });
  $("#views").click(function () {
    window.gtag?.("event", "views_open");
    toggleViewsUI();
    if (
      window.innerWidth < 629 &&
      $("#right_ui").is(":visible") &&
      $("#views_ui").is(":visible")
    ) {
      toggleRightUI();
    }
    if ($("#views_ui").is(":visible") && $("#left_ui").is(":visible")) {
      toggleLeftUI();
    }
    if ($("#share_panel").is(":visible")) {
      toggleSharePanel();
      abortShorten();
    }
  });
  $("#error_close_button").click(function () {
    fadeout("#error");
  });
  $("#preset_error_close_button").click(function () {
    fadeout("#bad_preset");
  });
  $("#oops_hit_nan_close").click(function () {
    fadeout("#oops_hit_nan");
    shouldCheckNaN = true;
  });
  $("#llm_click_open").click(function () {
    window.open(llmURL, "_blank");
  });
  $("#llm_click_close").click(function () {
    $("#llm-message").hide();
  });
  $("#start_tour").click(function () {
    $("#welcome").css("display", "none");
    tour.start();
    window.gtag?.("event", "manual_intro_tour");
  });
  $("#close-bcs-ui").click(function () {
    closeComboBCsGUI();
  });
  $("#diffusionMatrix_ok").click(function () {
    closeDiffusionMatrixGUI();
  });
  // Open the Definitions tab when the user clicks on the equation display.
  $("#equation_display").click(function () {
    editEquationsFolder.open();
  });
  $("#probeChartMinimise").click(function () {
    $("#probeChartContainer").hide();
    $("#probeChartMaximise").show();
  });
  $("#probeChartMaximise").click(function () {
    $("#probeChartContainer").show();
    $("#probeChartMaximise").hide();
  });

  // New, rename, delete
  // (Dynamically created buttons, like the +, can't use .click())
  $(document).on("click", "#add_view", function () {
    addView();
  });

  let tour = createWelcomeTour(onMobile());

  // Welcome message. Display if someone is not a returning user, or if they haven't seen the full welcome message.
  const viewFullWelcome = !(isStory || uiHidden);
  let wantsTour = params.has("tour");
  let restart = isRunning;
  if (
    (!isReturningUser() || (viewFullWelcome && !seenFullWelcomeUser())) &&
    options.preset != "Banner" &&
    !(logo_only || cleanDisplay)
  ) {
    pauseSim();
    let noButtonId = "welcome_no";
    if (!viewFullWelcome) {
      $("#tour_question").hide();
      $("#lets_go_cont").show();
      noButtonId = "lets_go";
    }
    // Display the welcome message.
    $("#welcome").css("display", "block");
    wantsTour =
      wantsTour ||
      (await Promise.race([
        waitListener(document.getElementById("welcome_ok"), "click", true),
        waitListener(document.getElementById(noButtonId), "click", false),
        // A promise that resolves when "visited" is added to localStorage.
        new Promise(function (resolve) {
          var listener = function (e) {
            if (e.key == "visited") {
              window.removeEventListener("storage", listener);
              resolve(false);
            }
          };
          window.addEventListener("storage", listener);
        }),
      ]));
    $("#welcome").css("display", "none");
    // If they've interacted with anything, note that they have visited the site.
    setReturningUser();
    // Set cookie consent.
    setCookieConsent();
    // If someone hasn't seen the full welcome, don't stop them from seeing it next time.
    if (viewFullWelcome) setSeenFullWelcomeUser();
    if (!wantsTour && restart) {
      playSim();
    }
  } else {
    // Only show the updates message if the user wasn't just shown the
    // welcome message, so they see at most one popup on load.
    await showUpdatesMessage("2026-07-multi-species-llm", "2026-12-31");
  }
  if (wantsTour) {
    await new Promise(function (resolve) {
      ["complete", "cancel"].forEach(function (event) {
        Shepherd?.once(event, () => resolve());
      });
      tour.start();
      window.gtag?.("event", "intro_tour");
    });
    if (restart) {
      playSim();
    }
  }
  if ($("#help").is(":visible")) {
    $("#get_help").fadeIn(1000);
    setTimeout(() => $("#get_help").fadeOut(1000), 4000);
  }

  if ($("#llm-bot").is(":visible")) {
    $("#llm-bot-message").fadeIn(1000);
    setTimeout(() => $("#llm-bot-message").fadeOut(1000), 4000);
  }

  // If the "Try clicking!" popup is allowed, show it iff we're from an external link
  // or have loaded the default simulation.
  if (
    (fromExternalLink() ||
      shouldLoadDefault ||
      options.forceTryClickingPopup) &&
    !options.suppressTryClickingPopup &&
    options.brushEnabled &&
    !cleanDisplay
  ) {
    $("#top_message").html("<p>" + options.tryClickingText + "</p>");
    fadein("#top_message", 1000);
    // Fadeout either after the user clicks on the canvas or 5s passes.
    setTimeout(() => fadeout("#top_message"), 5000);
    $("#simCanvas").one("pointerdown touchstart", () =>
      fadeout("#top_message"),
    );
  }

  // If we're in an iframe, set the logo to be a link to the current simulation on the main site just as it is clicked.
  if (inIframe()) {
    $("#logo").click(function (e) {
      e.preventDefault();
      getSimURL(false);
      window.open(longSimURL);
    });
  }

  // Determine whether or not we can optimise the FPS of the simulation.
  // Typically, this is only disabled for synchronised simulations.
  isOptimising = !params.has("noop") && options.optimiseFPS;

  if (isOptimising) {
    // If the tab has been opened in the background, delay the FPS optimisation until we return to the tab.
    if (document.visibilityState === "hidden") {
      becomingHidden();
    } else {
      // Otherwise, delay optimisation until FPS stabilises and listen out for becoming hidden.
      becomingVisible();
    }
  }
  // Add an observer to listen for becoming hidden if we're inside an iframe.
  simObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          isSuspended = false;
          if (isOptimising) becomingVisible();
        } else {
          isSuspended = true;
          if (isOptimising) becomingHidden();
        }
      });
    },
    {
      root: null,
      threshold: 0,
    },
  );
  simObserver.observe(document.getElementById("simCanvas"));

  // Listen for dark-mode changes in local storage.
  window.addEventListener("storage", function (e) {
    if (e.key == "dark-mode") {
      // If the event fires because dark-mode was removed, do nothing.
      if (e.newValue == null) return;
      // Otherwise, update the mode (without saving again to prevent loops).
      toggleDarkMode(e.newValue == "true", false);
    }
  });

  // When navigating away from the page, store the URL reflecting the current state in history if anything has changed.
  window.addEventListener("beforeunload", function (e) {
    // Stop any recording.
    if (isRecording) {
      stopRecording();
    }
    // Check if the simulation has changed from the preset it was loaded from
    // (using the fully resolved preset, since a preset may inherit fields
    // such as `expressions` from a parent rather than declaring them
    // itself). `options` must be the first argument to diffObjects, since it
    // only inspects the first argument's keys, and `options` is the side
    // guaranteed to be complete.
    if (
      Object.keys(diffObjects(options, getResolvedPreset(options.preset)))
        .length
    ) {
      // If so, add to session storage so that it can be loaded on return, and add the URL to history.
      sessionStorage.setItem("options", JSON.stringify(options));
      sessionStorage.setItem("oldQueryString", window.location.search);
    }
  });

  // Keep the URL in the address bar in sync with the state of the simulation, so that a
  // reload, a bookmark or a copy-paste of the URL always captures whatever the user has
  // changed. There's no address bar to keep up to date when we're embedded in an iframe,
  // so don't pay the cost there.
  if (!inIframe()) {
    ["pointerdown", "keydown", "wheel"].forEach(function (eventName) {
      window.addEventListener(eventName, startSyncingURL, {
        capture: true,
        once: true,
      });
    });
  }

  // Begin the simulation.
  isLoading = false;
  resetSim();
  animate();
  if (options.captureWebcam) {
    // Show the webcam access pane.
    $("#webcam_access").show();
    // Attach a listener to the button in the webcam access pane that will configure the webcam.
    document.getElementById("webcam_ok").addEventListener("click", () => {
      configureWebcam();
      $("#webcam_access").hide();
    });
  }

  // Monitor the rate at which time is being increased in the simulation.
  setInterval(function () {
    rate = (1e3 * (uniforms.t.value - lastT)) / (performance.now() - lastTime);
    lastT = uniforms.t.value;
    lastTime = performance.now();
    if (options.showStats) {
      document.getElementById("rateOfProgressValue").innerHTML =
        rate.toPrecision(2) + "/s";
    }
  }, 1000);

  const darkOS = window.matchMedia("(prefers-color-scheme: dark)");
  // Listen for the changes in the OS settings, and refresh equation display.
  darkOS.addEventListener("change", (evt) => {
    setEquationDisplayType();
  });

  // If a badLink was detected during the page load (from failed lookup of minification), let the user know.
  if (badLink) {
    throwPresetError(
      "Sorry, we've not managed to resolve this minified link. Check the link and your internet connection. If the problem persists, please get in touch at hello@visualpde.com.",
    );
  }

  //---------------

  // Initialise all aspects of the site, including both the simulation and the GUI.
  function init() {
    // Define uniforms to be sent to the shaders.
    initUniforms();

    // Define a quantity to track if the user is drawing.
    isDrawing = false;

    // Check local storage to see if antialiasing has been specified.
    // If not, default to on for desktop, off for mobile.
    const antialias = localStorage.getItem("AA")
      ? localStorage.getItem("AA") == "true"
      : !onMobile() && devicePixelRatio < 3;
    localOpts.antialias = antialias;

    // Create a renderer.
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
      antialias: antialias,
      alpha: true,
      premultipliedAlpha: false,
      stencilBuffer: false,
    });
    renderer.autoClear = false;
    gl = renderer.getContext();
    maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    // Configure textures with placeholder sizes. We'll need two textures for simulation (A,B), one for
    // post processing, and another for (optional) manual interpolation.
    simTextureOpts = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
    };

    // Check if we should be interpolating manually due to extensions not being supported.
    manualInterpolationNeeded = !(
      gl.getExtension("OES_texture_float_linear") &&
      gl.getExtension("EXT_float_blend")
    );

    // We'll assume that manual interpolation is necessary unless we can guarantee the user is on a desktop device.
    // Crudely (but notably safely) we will check for a desktop by asking if no touch events are supported.
    manualInterpolationNeeded |=
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;

    manualInterpolationNeeded
      ? (simTextureOpts.magFilter = THREE.NearestFilter)
      : (simTextureOpts.magFilter = THREE.LinearFilter);
    // Store all the simulation textures in an array. They'll be in history order, so that the first element is the most
    // recent. We'll write to the first texture, with later elements being further back in time.
    simTextures.push(
      ...createGroupRenderTargets(
        options.maxDisc,
        options.maxDisc,
        simTextureOpts,
      ),
    );
    postTexture = simTextures[0].clone();
    interpolationTexture = simTextures[0].clone();

    // Periodic boundary conditions (for now).

    simTextures.forEach((simTex) => {
      simTex.texture.wrapS = THREE.RepeatWrapping;
      simTex.texture.wrapT = THREE.RepeatWrapping;
    });

    // The post and interpolation materials, used for display, will always edge clamp to avoid artefacts.
    postTexture.texture.wrapS = THREE.ClampToEdgeWrapping;
    postTexture.texture.wrapT = THREE.ClampToEdgeWrapping;
    interpolationTexture.texture.wrapS = THREE.ClampToEdgeWrapping;
    interpolationTexture.texture.wrapT = THREE.ClampToEdgeWrapping;

    // Create a 1x1 texture for clicking into 3D simulations, which will be used to pick the uv coords of the click.
    clickTexture = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    clickTexture.texture.wrapS = THREE.ClampToEdgeWrapping;
    clickTexture.texture.wrapT = THREE.ClampToEdgeWrapping;

    // Create a 1x1 texture for probing simulations at a single point.
    probeTexture = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    probeTexture.texture.wrapS = THREE.ClampToEdgeWrapping;
    probeTexture.texture.wrapT = THREE.ClampToEdgeWrapping;

    // Create cameras for the simulation domain and the final output.
    camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 10);
    controls = new OrbitControls(camera, canvas);
    controls.listenToKeyEvents(document);
    controls.addEventListener("change", function () {
      if (options.plotType == "surface") {
        options.cameraTheta =
          90 - (180 * Math.acos(camera.position.y)) / Math.PI;
        options.cameraPhi =
          -(180 * Math.atan2(camera.position.x, camera.position.z)) / Math.PI;
        options.cameraZoom = camera.zoom;
        updateView("cameraTheta");
        updateView("cameraPhi");
        updateView("cameraZoom");
        refreshGUI(viewsGUI);
        renderIfNotRunning();
      }
    });
    simCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 10);
    simCamera.position.z = 1;

    // Create two scenes: one for simulation, another for drawing.
    scene = new THREE.Scene();
    simScene = new THREE.Scene();

    scene.background = new THREE.Color(options.backgroundColour);

    // This material will display the output of the simulation.
    displayMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
      transparent: true,
      side: THREE.DoubleSide,
    });
    // This material performs any postprocessing before display.
    postMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
    });
    // This material performs bilinear interpolation.
    interpolationMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
      fragmentShader: interpolationShader(),
    });
    // This material allows for drawing via a number of fragment shaders, which will be swapped in before use.
    drawMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
    });
    // This material allows for the detection of clicks.
    clickMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
      fragmentShader: uvFragShader(),
    });
    // This material allows for the probing of simulation output at a single point.
    probeMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
    });
    // This material allows for the computation of a global integral quantity.
    globalIntegralMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
    });
    clearColour = new THREE.Color().setRGB(-1, -1, -1);

    // We'll use a host of materials for timestepping, each with different fragment shaders.
    simMaterials.FE = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
    });
    simMaterials.AB2 = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
    });
    for (let ind = 1; ind < 3; ind++) {
      simMaterials["Mid" + ind.toString()] = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: genericVertexShader(),
      });
    }
    for (let ind = 1; ind < 5; ind++) {
      simMaterials["RK4" + ind.toString()] = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: genericVertexShader(),
      });
    }

    copyMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
      fragmentShader: copyShader(),
    });
    // A material for clearing the domain.
    clearMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
    });
    // A material for enforcing Dirichlet conditions.
    dirichletMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: genericVertexShader(),
    });
    lineMaterial = new LineMaterial({
      vertexColors: true,
      linewidth: 0.01,
    });
    overlayLineMaterial = new LineMaterial({
      color: 0x000000,
      linewidth: 0.01,
    });
    arrowMaterial = new THREE.MeshBasicMaterial({
      color: options.arrowColour,
      side: THREE.DoubleSide,
    });
    checkpointMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.NoBlending,
      toneMapped: false,
    });
    // MRT counterpart of checkpointMaterial (Stage 11.5 of the 8-species upgrade) - a
    // MeshBasicMaterial can only sample one texture/write one output, so restoring a
    // checkpoint once numGroups>1 needs a real ShaderMaterial instead. Reuses copyShaderMRT
    // (already samples textureSource/textureSourceGroup1 and writes fragColor0/fragColor1)
    // with its own dedicated uniforms object - NOT the shared `uniforms` - since that
    // object's textureSource/textureSourceGroup1 are reassigned constantly by every other
    // MRT material and this one's inputs (the checkpoint textures) are set only when
    // restoring, not every frame.
    checkpointMaterialMRT = new THREE.ShaderMaterial({
      uniforms: {
        textureSource: { type: "t", value: null },
        textureSourceGroup1: { type: "t", value: null },
      },
      vertexShader: genericVertexShader(),
      fragmentShader: copyShaderMRT(),
      glslVersion: THREE.GLSL3,
    });
    minMaxMaterial = new THREE.ShaderMaterial({
      uniforms: minMaxUniforms,
      vertexShader: genericVertexShader(),
      fragmentShader: minMaxShader(),
    });
    sumMaterial = new THREE.ShaderMaterial({
      uniforms: minMaxUniforms,
      vertexShader: genericVertexShader(),
      fragmentShader: sumShader(),
    });

    // Geometry for arrows.
    tailGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.1);
    headGeometry = new THREE.ConeGeometry(0.04, 0.04, 4);

    const simPlane = new THREE.PlaneGeometry(1.0, 1.0);
    simDomain = new THREE.Mesh(simPlane, simMaterials[0]);
    simDomain.position.z = 0;
    simDomain.matrixWorldAutoUpdate = false;
    simScene.add(simDomain);

    // Set sizes and create the display domains.
    setSizes();
    createDisplayDomains();

    // Configure the camera.
    configureCameraAndClicks();

    // Set the size of the domain and related parameters.
    setCanvasShape();
    resize();

    // Create a GUI.
    initGUI();

    // Configure the GUI.
    configureGUI();

    // Add tabIndex="0" to all ui_buttons, unless they have tabindex="-1".
    document.querySelectorAll(".ui_button").forEach((button) => {
      if (!button.getAttribute("tabindex")) {
        button.tabIndex = 0;
        button.addEventListener("keydown", function (e) {
          if (e.key == "Enter") {
            button.click();
          }
        });
      }
    });

    // Set up the problem.
    updateProblem();

    // Set the brush type.
    setBrushType();

    // Add shaders to the textures.
    setDrawAndDisplayShaders();
    setClearShader();

    // Configure interpolation.
    configureManualInterpolation();

    // Set the initial condition.
    resetSim();

    // Create a probe chart.
    createProbeChart();

    // Listen for pointer events.
    canvas.addEventListener("pointerdown", onDocumentPointerDown);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("pointerleave", onDocumentPointerUp);
    canvas.addEventListener("pointerup", onDocumentPointerUp);
    canvas.addEventListener("pointermove", onDocumentPointerMove);

    // Listen for keypresses.
    document.addEventListener("keypress", function onEvent(event) {
      event = event || window.event;
      var target = event.target;
      var targetTagName =
        target.nodeType == 1 ? target.nodeName.toUpperCase() : "";
      if (!/INPUT|SELECT|TEXTAREA|SPAN/.test(targetTagName)) {
        if (event.key === "h") {
          if (uiHidden) {
            if (!inIframe()) {
              $("#header").removeClass("hidden");
              resize();
              renderIfNotRunning();
            }
            showAllUI();
          } else {
            hideAllUI();
            $("#header").addClass("hidden");
            resize();
            renderIfNotRunning();
          }
        } else if (!(isStory && uiHidden)) {
          // Don't allow for keyboard input if the ui is hidden in a Story.
          if (event.key === "r") {
            $("#erase").click();
          }
          if (event.key === " ") {
            funsObj.toggleRunning();
            event.preventDefault();
          }
          if (event.key == "s") {
            saveSimState();
          }
          if (event.key == "c") {
            options.resetFromCheckpoints = !options.resetFromCheckpoints;
            updateToggle($("#checkpointButton")[0]);
          }
        }
      }
    });

    $("#simTitle")
      .on("keydown keypress", function (e) {
        // Reset timer that blurs after inactivity.
        clearTimeout(titleBlurTimer);
        // Blur on enter key.
        if (e.which == 13) {
          this.blur();
          return false;
        }
        var $self = $(this);
        titleBlurTimer = setTimeout(function () {
          $self.blur();
          window.getSelection().removeAllRanges();
        }, 5000);
      })
      .on("focus click", function () {
        var $self = $(this);
        clearTimeout(titleBlurTimer);
        titleBlurTimer = setTimeout(function () {
          $self.blur();
          window.getSelection().removeAllRanges();
        }, 5000);
      })
      .on("blur", function () {
        // Save the title.
        let val = removeExtraWhitespace(this.value.trim());
        options.simTitle = val;
        this.value = val;
        setDocTitle(val);
        clearTimeout(titleBlurTimer);
      });

    // Listen for resize events.
    window.addEventListener(
      "resize",
      function () {
        resize();
        renderIfNotRunning();
        // Lightweight update rather than a full configureGUI() call (which could be
        // expensive/flicker-prone fired repeatedly during a drag-resize) - onSmallScreen()
        // is otherwise only re-checked inside configureGUI(), so without this the button
        // could stay (in)visible after crossing the breakpoint until some other option
        // change happens to trigger a reconfigure.
        diffusionMatrixButton.classList.toggle("hidden", onSmallScreen());
      },
      false,
    );

    // Handle messages sent to the simulation.
    window.addEventListener("message", handleMessage);

    // Bind the onchange event for the checkpoint loader.
    $("#checkpointInput").change(function () {
      loadSimState(this.files[0]);
      this.value = null;
    });

    // Listen for clicks on the clickAreas for setting the boundary conditions.
    document
      .getElementById("topClickArea")
      .addEventListener("click", function () {
        comboBCsOptions.side = "top";
        $(".clickArea").removeClass("selected");
        $("#topClickArea").addClass("selected");
        configureComboBCsGUI();
      });
    document
      .getElementById("bottomClickArea")
      .addEventListener("click", function () {
        comboBCsOptions.side = "bottom";
        $(".clickArea").removeClass("selected");
        $("#bottomClickArea").addClass("selected");
        configureComboBCsGUI();
      });
    document
      .getElementById("leftClickArea")
      .addEventListener("click", function () {
        comboBCsOptions.side = "left";
        $(".clickArea").removeClass("selected");
        $("#leftClickArea").addClass("selected");
        configureComboBCsGUI();
      });
    document
      .getElementById("rightClickArea")
      .addEventListener("click", function () {
        comboBCsOptions.side = "right";
        $(".clickArea").removeClass("selected");
        $("#rightClickArea").addClass("selected");
        configureComboBCsGUI();
      });
    camCanvas = document.createElement("canvas");
  }

  function resize() {
    // Set the resolution of the simulation domain and the renderer.
    setSizes();
    // Assign sizes to textures.
    resizeTextures();
    // Update cropping of checkpoint textures.
    setStretchOrCropTexture(checkpointTexture);
    // Update any size-dependent uniforms.
    updateSizeUniforms();
    // Create new display domains with the correct sizes.
    replaceDisplayDomains();
    // Create arrows for vector fields.
    configureVectorField();
    // Configure the camera.
    configureCameraAndClicks();
    // Check if the colourbar lies on top of the logo. If so, remove the logo.
    checkColourbarLogoCollision();
    resizeEquationDisplay();
  }

  function replaceDisplayDomains() {
    domain.geometry.dispose();
    scene.remove(domain);
    line.geometry.dispose();
    scene.remove(line);
    overlayLine.geometry.dispose();
    scene.remove(overlayLine);
    createDisplayDomains();
  }

  function configureCameraAndClicks() {
    // Setup the camera position, orientation, and the invisible surface used for click detection.
    computeCanvasSizesAndAspect();
    switch (options.plotType) {
      case "line":
        controls.enabled = false;
        camera.zoom = 1;
        setCameraPos();
        displayMaterial.vertexShader = surfaceVertexShaderColour();
        break;
      case "plane":
        controls.enabled = false;
        controls.reset();
        displayMaterial.vertexShader = genericVertexShader();
        break;
      case "surface":
        controls.enabled = true;
        camera.zoom = options.cameraZoom;
        setCameraPos();
        setSurfaceShader();
        break;
    }
    displayMaterial.needsUpdate = true;
    camera.left = -domainWidth / (2 * maxDim);
    camera.right = domainWidth / (2 * maxDim);
    camera.top = domainHeight / (2 * maxDim);
    camera.bottom = -domainHeight / (2 * maxDim);
    camera.updateProjectionMatrix();
    setDomainOrientation();
  }

  function updateUniforms() {
    uniforms.dt.value = options.dt;
    uniforms.heightScale.value = options.threeDHeightScale;
    uniforms.customSurface.value = options.customSurface;
    uniforms.vectorField.value = options.vectorField;
    uniforms.pointProbe.value = options.probeType == "sample";
    updateSizeUniforms();
    setColourRangeFromDef();
    setEmbossUniforms();
    updateRandomSeed();
    uniforms.blendImage.value = options.blendImage == true;
    uniforms.blendImageAmount.value = Number(options.blendImageAmount);
  }

  function updateSizeUniforms() {
    uniforms.L.value = domainScaleValue;
    uniforms.L_y.value = domainHeight;
    uniforms.L_x.value = domainWidth;
    uniforms.L_min.value = Math.min(domainHeight, domainWidth);
    uniforms.dx.value = spatialStepValue;
    uniforms.dy.value = spatialStepValue;
  }

  function computeCanvasSizesAndAspect() {
    // Parse the domain scale.
    try {
      domainScaleValue =
        parser.evaluate(options.domainScale) * domainScaleFactor;
    } catch (error) {
      throwError(
        "Unable to evaluate the domain length. Please check the definition.",
      );
      domainScaleValue = 100 * domainScaleFactor;
    }
    canvasWidth = Math.round(canvas.getBoundingClientRect().width);
    canvasHeight = Math.round(canvas.getBoundingClientRect().height);
    aspectRatio = canvasHeight / canvasWidth;
    if (aspectRatio <= 0) aspectRatio = 0.1;
    // Set the domain size, setting the largest side to be of size domainScaleValue.
    if (aspectRatio >= 1) {
      domainHeight = domainScaleValue;
      domainWidth = domainHeight / aspectRatio;
    } else {
      domainWidth = domainScaleValue;
      domainHeight = domainWidth * aspectRatio;
    }
    if (options.dimension == 1) {
      domainWidth = domainScaleValue;
    }
    uniforms.L_x.value = domainWidth;
    uniforms.L_y.value = domainHeight;
    maxDim = Math.max(domainWidth, domainHeight);
  }

  function setSizes() {
    setSimCSS();
    computeCanvasSizesAndAspect();
    // Using the user-specified spatial step size, compute as close a discretisation as possible that
    // doesn't reduce the step size below the user's choice.
    spatialStepValue = domainScaleValue / 100;
    try {
      spatialStepValue = parser.evaluate(options.spatialStep);
    } catch (error) {
      throwError(
        "Unable to evaluate the spatial step. Please check the definition.",
      );
    }
    if (spatialStepValue <= 0) {
      // Prevent a crash if a <=0 spatial step is specified.
      throwError(
        "Oops! A spatial step less than or equal to 0 would almost certainly crash your device. Please check the definition.",
      );
      spatialStepValue = domainScaleValue / 100;
    } else if (spatialStepValue >= domainScaleValue) {
      throwError(
        "Oops! The spatial step was set to be larger than the domain size. Please reduce the step size or increase the domain size.",
      );
      spatialStepValue = domainScaleValue / 100;
    }

    nXDisc = Math.floor(domainWidth / spatialStepValue);
    nYDisc = Math.floor(domainHeight / spatialStepValue);
    if (nXDisc > maxTexSize || nYDisc > maxTexSize) {
      throwError(
        "Your device does not support a discretisation this fine (maximum " +
          maxTexSize +
          "MB). Please increase the space step to at least " +
          (Math.ceil((1e4 * domainScaleValue) / maxTexSize) / 1e4).toPrecision(
            4,
          ) +
          " or reduce the domain size to at most " +
          (Math.floor(1e4 * maxTexSize * spatialStepValue) / 1e4).toPrecision(
            4,
          ) +
          ".",
      );
      nXDisc = Math.min(nXDisc, maxTexSize);
      nYDisc = Math.min(nYDisc, maxTexSize);
    }
    if (nXDisc == 0) nXDisc = 1;
    if (nYDisc == 0) nYDisc = 1;
    // If the user has specified that this is a 1D problem, set nYDisc = 1.
    if (options.dimension == 1) {
      nYDisc = 1;
    }
    // Update these values in the uniforms.
    uniforms.nXDisc.value = nXDisc;
    uniforms.nYDisc.value = nYDisc;
    // Set an array of XDisplayDomainCoords for plotting lines. Note that these simply go between -0.5 and 0.5,
    // and do not correspond to x in the simulation.
    xDisplayDomainCoords = new Array(nXDisc);
    yDisplayDomainCoords = new Array(nXDisc);
    let val = -0.5,
      step = nXDisc > 1 ? 1 / (nXDisc - 1) : 0.5;
    for (let i = 0; i < xDisplayDomainCoords.length; i++) {
      xDisplayDomainCoords[i] = val;
      val += step;
    }
    xDisplayDomainCoords = xDisplayDomainCoords.map(
      (x) => (x * domainWidth) / maxDim,
    );
    // Set the size of the renderer, which will interpolate precisely from the textures.
    setDefaultRenderSize();
    buffer = new Float32Array(nXDisc * nYDisc * 4);
    bufferFilled = false;
  }

  function createDisplayDomains() {
    computeCanvasSizesAndAspect();
    let displayDomainSize = [1, 1];
    // If we're not using a low res domain (eg because of surface plotting),
    // create a domain with as much resolution of the finite difference mesh.
    if (!usingLowResDomain) displayDomainSize = [nXDisc, nYDisc];
    const plane = new THREE.PlaneGeometry(
      domainWidth / maxDim,
      domainHeight / maxDim,
      displayDomainSize[0],
      displayDomainSize[1],
    );
    domain = new THREE.Mesh(plane, displayMaterial);
    domain.position.z = 0;
    domain.visible = options.plotType != "line";
    domain.matrixAutoUpdate = false;
    scene.add(domain);
    setDomainOrientation();

    // Create a line object whose coordinates we can set when plotting lines.
    const lineGeom = new LineGeometry();
    numPointsInLine = Math.round(2 * devicePixelRatio * canvasWidth);
    const positions = new Array(3 * numPointsInLine).fill(0);
    const lineColours = new Array(positions.length).fill(0);
    lineGeom.setPositions(positions);
    lineGeom.setColors(lineColours);
    line = new Line2(lineGeom, lineMaterial);
    line.scale.set(1, 1, 1);
    line.visible = options.plotType == "line";
    scene.add(line);

    // Create a line object for overlay in line plots.
    const overlayLineGeom = new LineGeometry();
    const overlayLinePositions = new Array(3 * numPointsInLine).fill(0);
    overlayLineGeom.setPositions(overlayLinePositions);
    overlayLine = new Line2(overlayLineGeom, overlayLineMaterial);
    overlayLine.scale.set(1, 1, 1);
    overlayLine.visible = options.plotType == "line" && options.overlay;
    scene.add(overlayLine);
  }

  function setDomainOrientation() {
    // Configure the orientation of the simulation domain and the click domain, which we modify for 3D to make
    // convenient use of Euler angles for the camera controls.
    switch (options.plotType) {
      case "plane":
        domain.rotation.x = 0;
        break;
      case "surface":
        domain.rotation.x = -Math.PI / 2;
        break;
    }
    domain.updateMatrix();
  }

  function setCanvasShape() {
    options.squareCanvas
      ? $("#simCanvas").addClass("squareCanvas")
      : $("#simCanvas").removeClass("squareCanvas");
  }

  function setSimCSS() {
    // Set the CSS of simulation page, accounting for the header visible on larger screens.
    const headerStyles = window.getComputedStyle(
      document.getElementById("header"),
    );
    const hasHeader = headerStyles.getPropertyValue("display") != "none";
    const height =
      document.getElementById("header").getBoundingClientRect().height + "px";
    // Set CSS variables for the simulation.
    $(":root").css("--header-height", hasHeader ? height : "0px");
    // Hide the logo if we can see the header. Don't worry about making it visible again if the header disappears.
    if (hasHeader) {
      $("#logo").hide();
    }
  }

  function resizeTextures(shift = 0) {
    // Resize the computational domain by interpolating the existing domain onto the new discretisation.
    // mrtSimTextures (the real 8-species state once numGroups>1) is allocated once at
    // options.maxDisc size (Stage 3) and, unlike simTextures, was never being resized down
    // to the actual discretisation (nXDisc/nYDisc) here - found via live testing (an initial
    // condition meant to occupy a small region instead filling the whole domain, since the
    // render target was much larger than intended). copyMaterial's shader/glslVersion are
    // toggled dynamically since, unlike drawMaterial/clearMaterial, it's built once at
    // startup rather than rebuilt whenever relevant options change - this is its only use.
    const isMRT = numGroups(Number(options.numSpecies)) > 1;
    if (isMRT) {
      assignFragmentShader(copyMaterial, copyShaderMRT());
      copyMaterial.glslVersion = THREE.GLSL3;
    } else {
      assignFragmentShader(copyMaterial, copyShader());
      copyMaterial.glslVersion = null;
    }
    copyMaterial.needsUpdate = true;
    simDomain.material = copyMaterial;

    if (isMRT) {
      // simTextures is unused once numGroups>1 (the real state lives in mrtSimTextures,
      // matching every other Stage 3-8 MRT code path), so it's deliberately left alone here.
      for (let ind = 1; ind < mrtSimTextures.length; ind++) {
        uniforms.textureSource.value = mrtSimTextures[ind].texture[0];
        uniforms.textureSourceGroup1.value = mrtSimTextures[ind].texture[1];
        mrtSimTextures[ind - 1].setSize(nXDisc + shift, nYDisc + shift);
        renderer.setRenderTarget(mrtSimTextures[ind - 1]);
        renderer.render(simScene, simCamera);
      }
      mrtSimTextures.rotate(-1);
      mrtSimTextures[0].dispose();
      mrtSimTextures[0] = mrtSimTextures[1].clone();
    } else {
      // Resize all history terms. We'll do 1->0 then 2->1 etc, then cycle.
      for (let ind = 1; ind < simTextures.length; ind++) {
        uniforms.textureSource.value = simTextures[ind].texture;
        simTextures[ind - 1].setSize(nXDisc + shift, nYDisc + shift);
        renderer.setRenderTarget(simTextures[ind - 1]);
        renderer.render(simScene, simCamera);
      }
      simTextures.rotate(-1);
      simTextures[0].dispose();
      simTextures[0] = simTextures[1].clone();
    }

    postTexture.setSize(nXDisc + shift, nYDisc + shift);
    postprocess();

    // Dispose of and create new minmax textures.
    reductionTextures.forEach((tex) => tex.dispose());
    reductionTextures = [];
    let w = nXDisc + shift,
      h = nYDisc + shift;
    const reductionTextureOpts = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    };
    // Create a number of reduction textures, each half the size of the previous.
    while (w > 1 || h > 1) {
      w = Math.max(1, Math.ceil(w / 2));
      h = Math.max(1, Math.ceil(h / 2));
      reductionTextures.push(
        new THREE.WebGLRenderTarget(w, h, reductionTextureOpts),
      );
    }

    // The interpolationTexture will match the number of pixels in the display.
    interpolationTexture.setSize(
      Math.round(devicePixelRatio * canvasWidth),
      Math.round(devicePixelRatio * canvasHeight),
    );
  }

  function nudgeTextureSizeUpDown() {
    // Force a texture reupload by modifying the size of the textures and then resetting it.
    resizeTextures(1);
    resizeTextures(0);
  }

  function initUniforms() {
    // Initialise the uniforms to be passed to the shaders.
    uniforms = {
      blendImage: {
        type: "bool",
        value: false,
      },
      blendImageAmount: {
        type: "f",
        value: 0,
      },
      brushCoords: {
        type: "v2",
        value: new THREE.Vector2(0.5, 0.5),
      },
      brushValueModifier: {
        type: "f",
        value: 1.0,
      },
      colour1: {
        type: "v4",
        value: new THREE.Vector4(0, 0, 0, 0),
      },
      colour2: {
        type: "v4",
        value: new THREE.Vector4(0, 1, 0, 0.2),
      },
      colour3: {
        type: "v4",
        value: new THREE.Vector4(1, 1, 0, 0.21),
      },
      colour4: {
        type: "v4",
        value: new THREE.Vector4(1, 0, 0, 0.4),
      },
      colour5: {
        type: "v4",
        value: new THREE.Vector4(1, 1, 1, 0.6),
      },
      contourColour: {
        type: "v4",
      },
      contourEpsilon: {
        type: "f",
      },
      contourStep: {
        type: "f",
      },
      customSurface: {
        type: "bool",
      },
      embossAmbient: {
        type: "f",
      },
      embossDiffuse: {
        type: "f",
      },
      embossShiny: {
        type: "f",
      },
      embossSmoothness: {
        type: "f",
      },
      embossSpecular: {
        type: "f",
      },
      embossLightDir: {
        type: "vec3",
      },
      globalIntegralValue1: {
        type: "f",
      },
      globalIntegralValue2: {
        type: "f",
      },
      globalIntegralValue3: {
        type: "f",
      },
      globalIntegralValue4: {
        type: "f",
      },
      L: {
        type: "f",
      },
      L_x: {
        type: "f",
      },
      L_y: {
        type: "f",
      },
      L_min: {
        type: "f",
      },
      dt: {
        type: "f",
        value: 0.01,
      },
      // Discrete step sizes in the texture, which will be set later.
      dx: {
        type: "f",
      },
      dxUpscaledScale: {
        type: "f",
      },
      dy: {
        type: "f",
      },
      dyUpscaledScale: {
        type: "f",
      },
      heightScale: {
        type: "f",
      },
      imageSourceOne: {
        type: "t",
      },
      imageSourceTwo: {
        type: "t",
      },
      imageSourceBlend: {
        type: "t",
      },
      isTwoD: {
        type: "bool",
      },
      L: {
        type: "f",
      },
      maxColourValue: {
        type: "f",
        value: 1.0,
      },
      minColourValue: {
        type: "f",
        value: 0.0,
      },
      nXDisc: {
        type: "i",
      },
      nYDisc: {
        type: "i",
      },
      overlayColour: {
        type: "v4",
      },
      overlayEpsilon: {
        type: "f",
      },
      overlayLine: {
        type: "bool",
        value: true,
      },
      pointProbe: {
        type: "bool",
        value: true,
      },
      probeUVs: {
        type: "bool",
        value: false,
      },
      probeU: {
        type: "f",
        value: 0.0,
      },
      probeV: {
        type: "f",
        value: 0.0,
      },
      seed: {
        type: "f",
        value: 0.0,
      },
      textureSource: {
        type: "t",
      },
      textureSource1: {
        type: "t",
      },
      textureSource2: {
        type: "t",
      },
      textureSource3: {
        type: "t",
      },
      // Group 1's (species 5-8) current-state texture, only bound to an actual value once
      // numGroups(options.numSpecies)>1 - see species_config.js and the Stage 4-8 upgrade
      // notes.
      textureSourceGroup1: {
        type: "t",
      },
      // Group 1 counterparts of textureSource1/2/3, needed once AB2/Midpoint/RK4 support
      // numSpecies>4 (Stage 13 of the 8-species upgrade) - only bound to an actual value
      // once numGroups(options.numSpecies)>1, same as textureSourceGroup1 above.
      textureSource1Group1: {
        type: "t",
      },
      textureSource2Group1: {
        type: "t",
      },
      textureSource3Group1: {
        type: "t",
      },
      t: {
        type: "f",
        value: 0.0,
      },
      vectorField: {
        type: "bool",
        value: false,
      },
    };
    minMaxUniforms = {
      firstFlag: {
        type: "bool",
      },
      srcResolution: {
        type: "v2",
      },
      textureSource: {
        type: "t",
      },
    };
  }

  function initGUI(startOpen) {
    // Initialise the left GUI.
    leftGUI = new dat.GUI({ closeOnTop: true, autoPlace: false });
    leftGUI.domElement.id = "leftGUI";
    document.getElementById("leftGUIContainer").appendChild(leftGUI.domElement);

    // Initialise the right GUI.
    rightGUI = new dat.GUI({ closeOnTop: true, autoPlace: false });
    rightGUI.domElement.id = "rightGUI";
    document
      .getElementById("rightGUIContainer")
      .appendChild(rightGUI.domElement);

    // Initialise the viewsGUI.
    viewsGUI = new dat.GUI({ closeOnTop: true, autoPlace: false });
    viewsGUI.domElement.id = "viewsGUI";
    document
      .getElementById("viewsGUIContainer")
      .appendChild(viewsGUI.domElement);

    comboBCsGUI = new dat.GUI({ closeOnTop: false, autoPlace: false });
    comboBCsGUI.domElement.id = "comboBCsGUI";
    document
      .getElementById("comboBCsGUIContainer")
      .appendChild(comboBCsGUI.domElement);

    leftGUI.open();
    rightGUI.open();
    viewsGUI.open();
    comboBCsGUI.open();
    if (startOpen != undefined && startOpen) {
      $("#right_ui").show();
      $("#left_ui").show();
    } else {
      $("#left_ui").hide();
      $("#right_ui").hide();
    }

    // Brush folder.
    root = rightGUI.addFolder("Brush");
    addInfoButton(root, "/user-guide/advanced-options#brush");

    const brushButtonList = addButtonList(root);

    addToggle(
      brushButtonList,
      "brushEnabled",
      '<i class="fa-regular fa-brush"></i> Enable brush',
      configureCursorDisplay,
      null,
      "Toggle the brush on or off",
    );

    controllers["brushAction"] = root
      .add(options, "brushAction", {
        Replace: "replace",
        Add: "add",
        "Replace (smooth)": "smoothreplace",
        "Add (smooth)": "smoothadd",
      })
      .name("Action")
      .onChange(function () {
        setBrushType();
        document.activeElement.blur();
      });

    controllers["brushType"] = root
      .add(options, "brushType", {
        Disk: "circle",
        Square: "square",
        "Horizontal line": "hline",
        "Vertical line": "vline",
        Custom: "custom",
      })
      .name("Shape")
      .onChange(function () {
        setBrushType();
        configureGUI();
        document.activeElement.blur();
      });

    root
      .add(options, "brushValue")
      .name("Value")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setBrushType();
      });

    controllers["brushRadius"] = root
      .add(options, "brushRadius")
      .name("Radius")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setBrushType();
      });

    controllers["whatToDraw"] = root
      .add(options, "whatToDraw", listOfSpecies)
      .name("Variable")
      .onChange(setBrushType);

    // Domain folder.
    root = rightGUI.addFolder("Domain");
    addInfoButton(root, "/user-guide/advanced-options#domain");

    root
      .add(options, "dimension", { 1: 1, 2: 2 })
      .name("Dimension")
      .onChange(function () {
        configureDimension();
        document.activeElement.blur();
        renderIfNotRunning();
      });

    root
      .add(options, "domainScale")
      .name("Largest side")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        resize();
        renderIfNotRunning();
      });

    root
      .add(options, "spatialStep")
      .name("Space step")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        resize();
        renderIfNotRunning();
      });

    root
      .add(options, "minX")
      .name("Min. $x$")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        updateProblem();
        resetSim();
      });

    controllers["minY"] = root
      .add(options, "minY")
      .name("Min. $y$")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        updateProblem();
        resetSim();
      });

    const domainButtonList = addButtonList(root);

    addToggle(
      domainButtonList,
      "squareCanvas",
      '<i class="fa-regular fa-up-right-and-down-left-from-center"></i> Fill screen',
      function () {
        setCanvasShape();
        resize();
        configureCameraAndClicks();
        renderIfNotRunning();
      },
      null,
      "Fit the domain to the shape of the display, or use a square computational domain",
      null,
      null,
      null,
      true,
    );

    addToggle(
      domainButtonList,
      "domainViaIndicatorFun",
      '<i class="fa-regular fa-circle"></i> Custom',
      function () {
        configureOptions();
        configureGUI();
        setRDEquations();
        setGlobalIntegralShader();
        setPostFunFragShader();
        setProbeShader();
        renderIfNotRunning();
      },
      null,
      "Specify a custom domain",
    );

    controllers["domainIndicatorFun"] = root
      .add(options, "domainIndicatorFun")
      .name("Ind. fun")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        configureOptions();
        configureGUI();
        setRDEquations();
        setProbeShader();
        updateWhatToPlot();
        renderIfNotRunning();
      });

    // Timestepping folder.
    root = rightGUI.addFolder("Timestepping");
    addInfoButton(root, "/user-guide/advanced-options#timestepping");

    controllers["numTimestepsPerFrame"] = root
      .add(options, "numTimestepsPerFrame", 1, 1000, 1)
      .name("Steps/frame");
    createOptionSlider(controllers["numTimestepsPerFrame"], 1, 400, 1);

    controllers["dt"] = root
      .add(options, "dt")
      .name("Timestep")
      .onChange(function () {
        updateUniforms();
      });
    controllers["dt"].__precision = 12;
    controllers["dt"].min(0);
    controllers["dt"].updateDisplay();

    controllers["timesteppingScheme"] = root
      .add(options, "timesteppingScheme", {
        "Forward Euler": "Euler",
        "Adams-Bashforth 2": "AB2",
        "Midpoint Method": "Mid",
        "Runge-Kutta 4": "RK4",
      })
      .name("Scheme")
      .onChange(function () {
        document.activeElement.blur();
      });

    const timeButtonList = addButtonList(root);
    addToggle(
      timeButtonList,
      "timeDisplay",
      '<i class="fa-regular fa-hourglass-half"></i> Elapsed time',
      configureTimeDisplay,
      null,
      "Show/hide time display",
    );

    addToggle(
      timeButtonList,
      "autoPause",
      '<i class="fa-regular fa-hourglass-end"></i> Auto pause',
      function () {
        setAutoPauseStopValue();
        canAutoPause = uniforms.t.value < autoPauseStopValue;
        configureGUI();
      },
      null,
      "Toggle automatic pausing",
    );

    addToggle(
      timeButtonList,
      "performanceMode",
      '<i class="fa-regular fa-gauge-high"></i> Performance mode',
      setDefaultRenderSize,
      null,
      "Toggle performance mode, which lowers display quality to boost simulation speed",
    );

    controllers["autoPauseAt"] = root
      .add(options, "autoPauseAt")
      .name("Pause at $t=$")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setAutoPauseStopValue();
        canAutoPause = uniforms.t.value < autoPauseStopValue;
        controllers["autoPauseAt"].domElement.blur();
      });

    // Let's put these in the left GUI.
    // Equations folder.
    editEquationsFolder = leftGUI.addFolder("Equations");
    root = editEquationsFolder;
    addInfoButton(root, "/user-guide/advanced-options#edit");
    addFocusLeftGUIButton(editEquationsFolder);

    // Species-count/naming controllers get their own sub-folder too, back directly under
    // "Equations" as a sibling of Timescales/Diffusion coefficients/Reaction terms (not nested
    // inside "Parameters and notation" - Parameters/Expressions live there instead).
    root = editEquationsFolder;
    variablesFolder = editEquationsFolder.addFolder("Variables");
    addInfoButton(variablesFolder, "/user-guide/advanced-options#variables");
    root = variablesFolder;

    controllers["speciesNames"] = root
      .add(options, "speciesNames")
      .name("Names")
      .onFinishChange(function () {
        setCustomNames();
      });

    // Number of species.
    root
      .add(options, "numSpecies", {
        1: 1,
        2: 2,
        3: 3,
        4: 4,
        5: 5,
        6: 6,
        7: 7,
        8: 8,
      })
      .name("Number")
      .onChange(function () {
        document.activeElement.blur();
        options.speciesNames = speciesNamesToString();
        setCustomNames();
        // updateProblem() (De)allocates the MRT render targets itself now, before it
        // triggers configureDimension()'s resize/render chain - see its definition.
        updateProblem();
        resetSim();
      });

    // Number of algebraic species.
    controllers["algebraicSpecies"] = root
      .add(options, "numAlgebraicSpecies", {
        0: 0,
        1: 1,
        2: 2,
        3: 3,
        4: 4,
        5: 5,
        6: 6,
        7: 7,
      })
      .name("No. algebraic")
      .onChange(function () {
        updatingAlgebraicSpecies = true;
        updateProblem();
        updatingAlgebraicSpecies = false;
        resetSim();
      });

    // Diffusion coefficients go back directly under "Equations", not nested in the
    // timescales sub-folder. They get their own nested sub-folder in turn (rather than
    // sitting directly in "Equations" alongside timescales/reaction terms) since
    // cross-diffusion can show up to 64 of them at once. Always created (regardless of
    // crossDiffusion), matching the existing show/hide pattern (showSpeciesGUIPanels etc.
    // already hide most of these when cross-diffusion is off) - only the "expand as matrix" button
    // (added below, once all these controllers exist) is conditional.
    root = editEquationsFolder;
    diffusionCoeffsFolder = editEquationsFolder.addFolder(
      "Diffusion coefficients",
    );
    root = diffusionCoeffsFolder;
    addInfoButton(root, "/user-guide/advanced-options#diffusion-coefficients");

    // Diffusion coefficient controllers for every (i,j) pair, all 8 species. Controller keys
    // use diffCtrlKey(i,j) - species 1-4 keep their legacy letter-pair keys (Duu..Dqq),
    // touching species 5-8 uses a numeric key (see species_config.js/diffusionLabel for the
    // same convention). TeX select keys reuse defaultSpecies so the TeX display can hook into
    // them; selectTeX/deselectTeX are no-ops for keys with no TeXStrings entry.
    // allDiffusionTexKeys collects every key seen below, so hovering the folder's own title bar
    // (rather than any individual controller) can highlight all of them at once - see the
    // setOnFolderHoverEnter/Leave calls below the loop.
    const allDiffusionTexKeys = [];
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      for (let j = 1; j <= MAX_SPECIES_SUPPORTED; j++) {
        const key = diffCtrlKey(i, j);
        const texKey =
          defaultSpecies[i - 1].toUpperCase() +
          defaultSpecies[j - 1].toUpperCase();
        controllers[key] = root
          .add(options, "diffusionStr_" + i + "_" + j)
          .onFinishChange(function () {
            this.setValue(autoCorrectSyntax(this.getValue()));
            setRDEquations();
            setEquationDisplayType();
          });
        // Self-diffusion (i===j) needs both the single-subscript key ("U5", matched when
        // cross-diffusion is off) and the doubled key ("U5U5", matched when it's on) - e.g.
        // Dqq passes ["Q", "QQ"], not just "QQ".
        const texKeys =
          i === j ? [defaultSpecies[i - 1].toUpperCase(), texKey] : [texKey];
        setOnfocus(controllers[key], selectTeX, texKeys);
        setOnblur(controllers[key], deselectTeX, texKeys);
        allDiffusionTexKeys.push(...texKeys);
      }
    }
    setOnFolderHoverEnter(
      diffusionCoeffsFolder,
      selectTeX,
      allDiffusionTexKeys,
    );
    setOnFolderHoverLeave(
      diffusionCoeffsFolder,
      deselectTeX,
      allDiffusionTexKeys,
    );
    setOnFolderTapToggle(
      diffusionCoeffsFolder,
      selectTeX,
      deselectTeX,
      allDiffusionTexKeys,
    );

    // Cross-diffusion toggle button.
    const crossDiffusionButtonList = addButtonList(root);
    crossDiffusionToggle = addToggle(
      crossDiffusionButtonList,
      "crossDiffusion",
      '<i class="fa-regular fa-arrow-down-up-across-line"></i> Cross diffusion',
      function () {
        updateProblem();
      },
      "cross_diffusion_controller",
      "Toggle cross diffusion",
    );

    // Button to open the diffusion matrix popup, injected into the sub-folder's title bar
    // (mirroring addInfoButton's DOM-injection pattern). Its visibility (crossDiffusion on,
    // not a small screen) is kept up to date in configureGUI(), not here.
    addDiffusionMatrixButton(diffusionCoeffsFolder);

    // Reaction terms get their own sub-folder too, back directly under "Equations" rather
    // than nested in the diffusion sub-folder.
    root = editEquationsFolder;
    reactionTermsFolder = editEquationsFolder.addFolder("Forcing terms");
    root = reactionTermsFolder;
    addInfoButton(root, "/user-guide/advanced-options#forcing-terms");

    // Reaction term controllers for all 8 species, keyed "reaction_1".."reaction_8" (species
    // 1-4 historically used "f"/"g"/"h"/"j" - purely an internal lookup key, never serialized
    // to options/URLs - renamed here to match species 5-8's naming, which has no natural
    // single-letter mnemonic).
    // allReactionTexKeys mirrors allDiffusionTexKeys above - collected so hovering the folder's
    // own title bar can highlight every reaction term at once.
    const allReactionTexKeys = [];
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      const key = "reaction_" + i;
      const texKey = reactionTokenOfSpecies(i - 1);
      controllers[key] = root
        .add(options, "reactionStr_" + i)
        .onFinishChange(function () {
          this.setValue(autoCorrectSyntax(this.getValue()));
          setRDEquations();
          setEquationDisplayType();
        });
      setOnfocus(controllers[key], selectTeX, [texKey]);
      setOnblur(controllers[key], deselectTeX, [texKey]);
      allReactionTexKeys.push(texKey);
    }
    setOnFolderHoverEnter(reactionTermsFolder, selectTeX, allReactionTexKeys);
    setOnFolderHoverLeave(reactionTermsFolder, deselectTeX, allReactionTexKeys);
    setOnFolderTapToggle(
      reactionTermsFolder,
      selectTeX,
      deselectTeX,
      allReactionTexKeys,
    );

    // Timescale controllers get their own sub-folder, shown only when the "Scales" toggle is
    // on (configureGUI() shows/hides the folder itself, mirroring how it already showed/hid
    // each controller individually before this folder existed).
    timescalesFolder = editEquationsFolder.addFolder("Timescales");
    root = timescalesFolder;
    addInfoButton(root, "/user-guide/advanced-options#timescales");

    // Timescale controllers for all 8 species. See timescaleTag() for the species 1-4 vs 5-8
    // key-naming split (matching timescaleTags above).
    const allTimescaleTexKeys = [];
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      const tTag = timescaleTag(i);
      controllers[tTag] = root
        .add(options, "timescale_" + i)
        .onFinishChange(function () {
          this.setValue(autoCorrectSyntax(this.getValue()));
          setRDEquations();
          setEquationDisplayType();
        });
      setOnfocus(controllers[tTag], selectTeX, [tTag]);
      setOnblur(controllers[tTag], deselectTeX, [tTag]);
      allTimescaleTexKeys.push(tTag);
    }
    setOnFolderHoverEnter(timescalesFolder, selectTeX, allTimescaleTexKeys);
    setOnFolderHoverLeave(timescalesFolder, deselectTeX, allTimescaleTexKeys);
    setOnFolderTapToggle(
      timescalesFolder,
      selectTeX,
      deselectTeX,
      allTimescaleTexKeys,
    );

    root = editEquationsFolder;

    parametersFolder = leftGUI.addFolder("Parameters");
    addInfoButton(parametersFolder, "/user-guide/advanced-options#parameters");
    addFocusLeftGUIButton(parametersFolder);
    setParamsFromKineticString();

    // Expressions folder: named text macros (not uniforms - see the Expressions design near
    // refreshExpressionExpansions()), substituted directly into shader source at shader-
    // construction time.
    expressionsFolder = leftGUI.addFolder("Substitutions");
    addInfoButton(
      expressionsFolder,
      "/user-guide/advanced-options#substitutions",
    );
    addFocusLeftGUIButton(expressionsFolder);
    setExpressionsFromString();

    // Boundary conditions folder.
    boundaryConditionsFolder = leftGUI.addFolder("Boundary conditions");
    root = boundaryConditionsFolder;
    addInfoButton(root, "/user-guide/advanced-options#boundary-conditions");
    addFocusLeftGUIButton(boundaryConditionsFolder);

    // Boundary-condition controls (dropdown, dirichlet, neumann, robin, combo) for all 8
    // species. Keyed by defaultSpecies[i]+"BCs"/"dirichlet"+S/"neumann"+S/"robin"+S/"combo"+S
    // (S = defaultSpecies[i].toUpperCase(), e.g. "u"->"U", "u5"->"U5") - addComboBCsButton
    // (reused unmodified below) already builds its "combo"+X/X+"BCs" controller keys from
    // exactly this defaultSpecies-derived naming.
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      const s = defaultSpecies[i - 1]; // "u".."q", "u5".."u8"
      const S = s.toUpperCase(); // "U".."Q", "U5".."U8"
      const bcsKey = s + "BCs";
      const speciesInd = i - 1; // 0-based, for addComboBCsButton/comboBCsButton<N> DOM id.

      controllers[bcsKey] = root
        .add(options, "boundaryConditions_" + i, {})
        .onChange(function () {
          setRDEquations();
          setBCsGUI();
          // Show the combo BCs GUI if the user has selected combo.
          if (this.getValue() == "combo") {
            document.getElementById("comboBCsButton" + speciesInd).click();
          }
          document.activeElement.blur();
        });
      // Preserves the original qBCs controller's fallback label (likely superseded almost
      // immediately by the setGUIControllerName call in setEquationDisplayType(), but kept for
      // parity with pre-refactor behaviour).
      if (i === 4) controllers[bcsKey].name("$q$");
      addComboBCsButton(controllers[bcsKey], speciesInd);

      controllers["dirichlet" + S] = root
        .add(options, "dirichletStr_" + i)
        .onFinishChange(function () {
          this.setValue(autoCorrectSyntax(this.getValue()));
          setRDEquations();
        });

      controllers["neumann" + S] = root
        .add(options, "neumannStr_" + i)
        .onFinishChange(function () {
          this.setValue(autoCorrectSyntax(this.getValue()));
          setRDEquations();
        });

      controllers["robin" + S] = root
        .add(options, "robinStr_" + i)
        .onFinishChange(function () {
          this.setValue(autoCorrectSyntax(this.getValue()));
          setRDEquations();
        });

      controllers["combo" + S] = root
        .add(options, "comboStr_" + i)
        .name("Details")
        .onFinishChange(function () {
          // Unlike the purely mathematical fields, "" is meaningful here - it means "no
          // per-side overrides" - so don't let autoCorrectSyntax turn it into a stray "0".
          if (!isEmptyString(this.getValue()))
            this.setValue(autoCorrectSyntax(this.getValue()));
          setRDEquations();
          if (options["boundaryConditions_" + i] == "combo") {
            configureComboBCsGUI();
          }
        });
    }

    // Initial conditions folder.
    initialConditionsFolder = leftGUI.addFolder("Initial conditions");
    root = initialConditionsFolder;
    addInfoButton(root, "/user-guide/advanced-options#initial-conditions");
    addFocusLeftGUIButton(initialConditionsFolder);

    controllers["initCond_1"] = root
      .add(options, "initCond_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setClearShader();
      });

    controllers["initCond_2"] = root
      .add(options, "initCond_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setClearShader();
      });

    controllers["initCond_3"] = root
      .add(options, "initCond_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setClearShader();
      });

    controllers["initCond_4"] = root
      .add(options, "initCond_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setClearShader();
      });

    // Species 5-8 initial conditions (Stage 9 of the 8-species upgrade).
    for (let i = 5; i <= MAX_SPECIES_SUPPORTED; i++) {
      controllers["initCond_" + i] = root
        .add(options, "initCond_" + i)
        .onFinishChange(function () {
          this.setValue(autoCorrectSyntax(this.getValue()));
          setClearShader();
        });
    }

    // Images folder.
    fIm = rightGUI.addFolder("Images");
    root = fIm;
    addInfoButton(root, "/user-guide/advanced-options#images");

    // Saving/loading folder.
    root = rightGUI.addFolder("Checkpoints");
    addInfoButton(root, "/user-guide/advanced-options#checkpoints");

    // Checkpoints override initial condition.
    const checkpointButtons = addButtonList(root);

    addToggle(
      checkpointButtons,
      "resetFromCheckpoints",
      "Enable checkpoints",
      null,
      "checkpointButton",
    );

    // Force a newline.
    addNewline(checkpointButtons);
    addButton(
      checkpointButtons,
      '<i class="fa-regular fa-flag"></i> Set',
      saveSimState,
      null,
      "Set a checkpoint at the current state",
      ["narrow"],
    );
    addButton(
      checkpointButtons,
      '<i class="fa-regular fa-file-arrow-down"></i> Export',
      exportSimState,
      null,
      "Download the last checkpoint as a file",
      ["narrow"],
    );
    addButton(
      checkpointButtons,
      '<i class="fa-regular fa-file-arrow-up"></i> Import',
      function () {
        $("#checkpointInput").click();
      },
      null,
      "Upload a checkpoint file",
      ["narrow"],
    );

    root
      .add(options, "resizeCheckpoints", { Stretch: "stretch", Crop: "crop" })
      .name("Resize")
      .onChange(function () {
        document.activeElement.blur();
      });

    // Miscellaneous folder.
    root = rightGUI.addFolder("More...");
    addInfoButton(root, "/user-guide/advanced-options#misc");

    root
      .addColor(options, "backgroundColour")
      .name("Background")
      .onChange(function () {
        scene.background = new THREE.Color(options.backgroundColour);
        renderIfNotRunning();
      });

    const miscButtons = addButtonList(root);

    addToggle(
      miscButtons,
      "integrate",
      '<i class="fa-regular fa-chart-area"></i> Integrate',
      function () {
        configureIntegralDisplay();
        renderIfNotRunning();
      },
      null,
      "Compute the integral of the plotted expression over the domain",
    );

    addToggle(
      miscButtons,
      "forceManualInterpolation",
      '<i class="fa-regular fa-bezier-curve"></i> Interpolate',
      function () {
        configureManualInterpolation();
        renderIfNotRunning();
      },
      "interpController",
      "Override your device's default smoothing and perform bilinear interpolation of the display",
    );

    addToggle(
      miscButtons,
      "setSeed",
      '<i class="fa-regular fa-shuffle"></i> Set seed',
      function () {
        if (options.setSeed) seed = options.randSeed;
        updateRandomSeed();
        configureGUI();
      },
      null,
      "Set the seed for random number generation",
    );

    addButton(
      miscButtons,
      '<i class="fa-solid fa-arrow-rotate-left"></i> Clean slate',
      function () {
        // Check with the user before resetting everything.
        if (
          confirm(
            "Are you sure you want to reset everything to a blank simulation?",
          )
        ) {
          window.location.replace(window.location.pathname + "?preset=blank");
        }
      },
      null,
      "Load a blank simulation",
    );

    addToggle(
      miscButtons,
      "showGhostBCs",
      '<i class="fa-solid fa-ghost"></i> Ghost BCs',
      function () {
        if (!checkGhostBCs()) return configureComboBCsDropdown();
        if (!options.showGhostBCs) {
          alert(
            "Ghost boundary conditions are currently in use so cannot be hidden.",
          );
        }
        options.showGhostBCs = true;
        updateToggle(document.getElementById("ghostToggle"));
      },
      "ghostToggle",
      "Toggle visibility of advanced 'ghost' boundary conditions",
    );

    addToggle(
      miscButtons,
      "runningOnLoad",
      '<i class="fa-solid fa-play"></i> Run on load',
      function () {},
      "runningOnLoad",
      "Toggle whether the simulation should run automatically on page load",
    );

    addToggle(
      miscButtons,
      "blendImage",
      '<i class="fa-solid fa-image"></i> Blend image',
      function () {
        updateUniforms();
        renderIfNotRunning();
      },
      null,
      "Toggle the blending of an image into the simulation colour output",
    );

    controllers["blendImageAmount"] = root
      .add(options, "blendImageAmount")
      .name("Blend amount")
      .onChange(function () {
        updateUniforms();
        renderIfNotRunning();
      });
    createOptionSlider(controllers["blendImageAmount"], 0, 1, 0.01);

    controllers["randSeed"] = root
      .add(options, "randSeed")
      .name("Random seed")
      .onFinishChange(function () {
        updateRandomSeed();
      });

    // The number of timesteps between updates of any Int(...) quantities referenced in
    // the simulation (see reconcileGlobalIntegrals()). No onFinishChange rebuild needed -
    // this field only gates a per-timestep modulo check, not a shader rebuild.
    controllers["globalIntegralUpdatePeriod"] = root
      .add(options, "globalIntegralUpdatePeriod", 1, 1000, 1)
      .name("Int. update");

    devFolder = root.addFolder("Developer tools");
    root = devFolder;
    addInfoButton(root, "/user-guide/advanced-options#dev");
    // Dev.
    const devButtons = addButtonList(root);
    // Copy configuration as raw JSON.
    addButton(
      devButtons,
      '<i class="fa-regular fa-copy"></i> Copy code',
      copyConfigAsJSON,
      null,
      "Copy the simulation configuration as JSON to the clipboard",
    );

    // Copy configuration as raw JSON.
    addButton(
      devButtons,
      '<i class="fa-regular fa-bug"></i> Copy debug',
      copyDebug,
      null,
      "Copy debug information to the clipboard",
    );

    addToggle(
      devButtons,
      "showStats",
      '<i class="fa-regular fa-chart-line"></i> Show stats',
      function () {
        configureStatsGUI();
      },
      "interpController",
      "Show performance statistics",
    );

    addToggle(
      devButtons,
      "antialias",
      '<i class="fa-regular fa-display"></i> Antialias',
      function () {
        localStorage.setItem("AA", localOpts.antialias);
        alert(
          "Toggling antialiasing requires a page reload. We recommend generating a link to the current simulation if you've modified anything.",
        );
      },
      undefined,
      "Antialias the display (useful for vector fields on low-res displays). Requires page reload.",
      undefined,
      undefined,
      localOpts,
    );

    addToggle(
      devButtons,
      "showComboStr",
      '<i class="fa-regular fa-font"></i> Mixed strings',
      function () {
        setBCsGUI();
      },
      null,
      "Show strings associated with mixed BCs",
    );

    addButton(
      devButtons,
      '<i class="fa-regular fa-link"></i> Long URL',
      function () {
        funsObj.copyConfigAsLongURL();
      },
      null,
      "Copy a long, shareable URL to your clipboard",
    );

    addToggle(
      devButtons,
      "captureWebcam",
      '<i class="fa-regular fa-camera"></i> Camera',
      function () {
        configureWebcam();
      },
      "captureWebcamToggle",
      "Toggle the use of a webcam as the first image input",
    );

    controllers["captureWebcamDelay"] = root
      .add(options, "captureWebcamDelay")
      .name("Cam delay")
      .onChange(function () {
        configureWebcam();
      });
    createOptionSlider(controllers["captureWebcamDelay"], 10, 5000, 1);

    // Populate list of presets for parent selection.
    let listOfPresets = {};
    getListOfPresetNames().forEach(function (key) {
      listOfPresets[key] = key;
    });
    listOfPresets["default"] = null;
    root
      .add(options, "parent", sortObject(listOfPresets))
      .name("Parent preset")
      .onChange(function () {
        document.activeElement.blur();
      });

    root.add(options, "guiUpdatePeriod").name("GUI update period)");

    root
      .add(options, "colourbarMaxStr")
      .name("Cbar max label")
      .onFinishChange(function () {
        updateColourbarLims();
      });

    root
      .add(options, "colourbarMinStr")
      .name("Cbar min label")
      .onFinishChange(function () {
        updateColourbarLims();
      });

    // Add a title to the rightGUI.
    const settingsTitle = document.createElement("div");
    settingsTitle.innerHTML = "Settings";
    settingsTitle.classList.add("ui_title");
    rightGUI.domElement.prepend(settingsTitle);

    // Add the light/dark buttons to the rightGUI.
    const darkButton = document.createElement("button");
    darkButton.className = "darkmode-button";
    darkButton.id = "dark-on";
    darkButton.innerHTML =
      '<span>Dark mode<i class="fa-solid fa-moon"></i></span>';
    darkButton.onclick = function () {
      toggleDarkMode(true, true);
    };
    const lightButton = document.createElement("button");
    lightButton.className = "darkmode-button";
    lightButton.id = "light-on";
    lightButton.innerHTML =
      '<span>Light mode<i class="fa-solid fa-sun"></i></span>';
    lightButton.onclick = function () {
      toggleDarkMode(false, true);
    };
    rightGUI.domElement.prepend(lightButton);
    rightGUI.domElement.prepend(darkButton);

    // Populate the viewsGUI.
    // Create a custom element for containing the view options.
    const viewsList = document.createElement("div");
    viewsList.id = "views_list";
    viewsGUI.domElement.prepend(viewsList);
    const viewsTitle = document.createElement("div");
    viewsTitle.innerHTML =
      "Views<a id='add_view' title='New view'><i class='fa-solid fa-plus'></i></a>";
    viewsTitle.classList.add("ui_title");
    viewsGUI.domElement.prepend(viewsTitle);

    editViewFolder = viewsGUI.addFolder("Edit view");
    root = editViewFolder;
    addInfoButton(root, "/user-guide/advanced-options#views");

    const editViewButtons = addButtonList(root, "edit_view_buttons");

    addButton(
      editViewButtons,
      '<i class="fa-solid fa-pen-nib"></i> Rename',
      editCurrentViewName,
      null,
      "Rename the current view",
    ); // Rename
    addButton(
      editViewButtons,
      '<i class="fa-solid fa-xmark"></i> Delete',
      deleteView,
      "deleteViewButton",
      "Delete view",
    ); // Delete

    controllers["whatToPlot"] = root
      .add(options, "whatToPlot")
      .name("Expression")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        updateWhatToPlot();
        renderIfNotRunning();
        updateView(this.property);
      });

    root
      .add(options, "plotType", {
        Line: "line",
        Plane: "plane",
        Surface: "surface",
      })
      .name("Plot type")
      .onChange(function () {
        configurePlotType();
        document.activeElement.blur();
        renderIfNotRunning();
        updateView(this.property);
      });

    // Generate a list of buttons for turning on effects/advanced options.
    // We'll populate this after the folders have been generated.
    const effectsButtons = addButtonList(root);
    effectsButtons.classList.add("tab_list");
    effectsButtons.submenuToggles = [];

    root = editViewFolder.addFolder("Colour options");
    addInfoButton(root, "/user-guide/advanced-options#colour");
    root.domElement.id = "colourFolder";
    root.domElement.classList.add("viewsFolder");

    root
      .add(options, "colourmap", {
        BlckGrnYllwRdWht: "BlackGreenYellowRedWhite",
        "Blue-Magenta": "blue-magenta",
        "Chemical (blue)": "chemicalBlue",
        "Chemical (green)": "chemicalGreen",
        "Chemical (yellow)": "chemicalYellow",
        Cyclic: "cyclic",
        Diverging: "diverging",
        Greyscale: "greyscale",
        "Fires (split)": "splitscreenFires",
        Foliage: "foliage",
        Ice: "ice",
        "Lava flow": "lavaflow",
        Midnight: "midnight",
        Pastels: "pastels",
        Pride: "pride",
        "Red-green": "redGreen",
        Retro: "retro",
        "Simply blue": "blue",
        "Snow Ghost": "snowghost",
        Spooky: "spooky",
        Squirrels: "squirrels",
        Terrain: "terrain",
        "Terrain (fire)": "fireOnTerrain",
        Thermal: "thermal",
        Turbo: "turbo",
        "Urban flooding": "urbanFlooding",
        Viridis: "viridis",
        Water: "water",
      })
      .onChange(function () {
        setDisplayColourAndType();
        configureColourbar();
        document.activeElement.blur();
        renderIfNotRunning();
        updateView(this.property);
      })
      .name("Colour map");

    controllers["minColourValue"] = root
      .add(options, "minColourValue")
      .name("Min value")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setColourRangeFromDef();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["maxColourValue"] = root
      .add(options, "maxColourValue")
      .name("Max value")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setColourRangeFromDef();
        renderIfNotRunning();
        updateView(this.property);
      });

    const colourButtons = addButtonList(root);

    addButton(
      colourButtons,
      '<i class="fa-regular fa-arrows-rotate"></i> Reverse',
      function () {
        options.flippedColourmap = !options.flippedColourmap;
        setDisplayColourAndType();
        configureColourbar();
        renderIfNotRunning();
        updateView("flippedColourmap");
      },
      null,
      "Reverse the colour map",
      ["wide"],
    );

    addToggle(
      colourButtons,
      "colourbar",
      '<i class="fa-solid fa-bars-progress"></i> Colour bar',
      function () {
        configureColourbar();
        updateView("colourbar");
      },
      null,
      "Display the colourbar",
      null,
      ["wide"],
    );

    addButton(
      colourButtons,
      '<i class="fa-solid fa-arrows-left-right-to-line"></i> Snap range',
      function () {
        setColourRangeSnap();
        render();
        updateView("minColourValue");
        updateView("maxColourValue");
      },
      null,
      "Snap min/max to visible",
      ["wide"],
    );

    addToggle(
      colourButtons,
      "autoSetColourRange",
      '<i class="fa-solid fa-wand-magic-sparkles"></i> Auto snap',
      function () {
        if (options.autoSetColourRange) {
          setColourRangeSnap();
          render();
        }
        updateView("autoSetColourRange");
      },
      null,
      "Automatically snap range",
      null,
      ["wide"],
    );

    root = editViewFolder.addFolder("Contour options");
    addInfoButton(root, "/user-guide/advanced-options#contours");
    root.domElement.id = "contoursFolder";
    root.domElement.classList.add("viewsFolder");

    const contoursButtonList = addButtonList(root);
    addToggle(
      contoursButtonList,
      "contours",
      `<i class="fa-solid fa-bullseye"></i> Enable`,
      function () {
        setDisplayColourAndType();
        renderIfNotRunning();
        updateView("contours");
      },
      "contourButton",
      "Toggle contours",
      null,
      ["wide"],
    );

    controllers["contourColour"] = root
      .addColor(options, "contourColour")
      .name("Colour")
      .onChange(function () {
        setContourUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["contourNum"] = root
      .add(options, "contourNum")
      .name("Number")
      .onChange(function () {
        setContourUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });
    createOptionSlider(controllers["contourNum"], 1, 20, 1);
    contoursControllers.push(controllers["contourNum"]);

    controllers["contourEpsilon"] = root
      .add(options, "contourEpsilon")
      .name("Threshold")
      .onChange(function () {
        setContourUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });
    createOptionSlider(controllers["contourEpsilon"], 0.001, 0.05, 0.001);
    contoursControllers.push(controllers["contourEpsilon"]);

    root = editViewFolder.addFolder("Lighting options");
    addInfoButton(root, "/user-guide/advanced-options#lighting");
    root.domElement.id = "embossFolder";
    root.domElement.classList.add("viewsFolder");

    const embossButtonList = addButtonList(root);
    addToggle(
      embossButtonList,
      "emboss",
      `<i class="fa-solid fa-lightbulb"></i> Enable`,
      function () {
        setDisplayColourAndType();
        renderIfNotRunning();
        updateView("emboss");
      },
      "embossButton",
      "Toggle lighting",
      null,
      ["wide"],
    );

    controllers["embossSmoothness"] = root
      .add(options, "embossSmoothness")
      .name("Smoothness")
      .onChange(function () {
        setEmbossUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });
    createOptionSlider(controllers["embossSmoothness"], 0, 2, 0.001);
    embossControllers.push(controllers["embossSmoothness"]);

    controllers["embossAmbient"] = root
      .add(options, "embossAmbient")
      .name("Ambient")
      .onChange(function () {
        setEmbossUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });
    createOptionSlider(controllers["embossAmbient"], 0, 1, 0.001);
    embossControllers.push(controllers["embossAmbient"]);

    controllers["embossDiffuse"] = root
      .add(options, "embossDiffuse")
      .name("Diffuse")
      .onChange(function () {
        setEmbossUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });
    createOptionSlider(controllers["embossDiffuse"], 0, 1, 0.001);
    embossControllers.push(controllers["embossDiffuse"]);

    controllers["embossSpecular"] = root
      .add(options, "embossSpecular")
      .name("Specular")
      .onChange(function () {
        setEmbossUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });
    createOptionSlider(controllers["embossSpecular"], 0, 1, 0.001);
    embossControllers.push(controllers["embossSpecular"]);

    controllers["embossShiny"] = root
      .add(options, "embossShiny")
      .name("Precision")
      .onChange(function () {
        setEmbossUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });
    createOptionSlider(controllers["embossShiny"], 0, 100, 1);
    embossControllers.push(controllers["embossShiny"]);

    controllers["embossTheta"] = root
      .add(options, "embossTheta")
      .name("Inclination")
      .onChange(function () {
        setEmbossUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });
    createOptionSlider(controllers["embossTheta"], 0, 1.5708, 0.001);
    embossControllers.push(controllers["embossTheta"]);

    controllers["embossPhi"] = root
      .add(options, "embossPhi")
      .name("Direction")
      .onChange(function () {
        setEmbossUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });
    createOptionSlider(controllers["embossPhi"], 0, 3.1456, 0.001);
    embossControllers.push(controllers["embossPhi"]);

    root = editViewFolder.addFolder("Overlay options");
    addInfoButton(root, "/user-guide/advanced-options#overlay");
    root.domElement.id = "overlayFolder";
    root.domElement.classList.add("viewsFolder");

    const overlayButtonList = addButtonList(root);
    addToggle(
      overlayButtonList,
      "overlay",
      `<i class="fa-solid fa-clover"></i> Enable`,
      function () {
        setDisplayColourAndType();
        setPostFunFragShader();
        renderIfNotRunning();
        updateView("overlay");
      },
      null,
      "Toggle overlay",
      null,
      ["wide"],
    );

    root
      .addColor(options, "overlayColour")
      .name("Colour")
      .onChange(function () {
        setOverlayUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });

    root
      .add(options, "overlayExpr")
      .name("Expression")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setDisplayColourAndType();
        setPostFunFragShader();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["overlayEpsilon"] = root
      .add(options, "overlayEpsilon")
      .name("Threshold")
      .onChange(function () {
        setOverlayUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["overlayLineWidthMul"] = root
      .add(options, "overlayLineWidthMul", 0.1, 2)
      .name("Thickness")
      .onChange(function () {
        setLineWidth();
        renderIfNotRunning();
        updateView(this.property);
      });

    linesAnd3DFolder = editViewFolder.addFolder("3D options");
    linesAnd3DFolder.domElement.id = "linesAnd3DFolder";
    root = linesAnd3DFolder;
    addInfoButton(root, "/user-guide/advanced-options#3d-options");

    surfaceButtons = addButtonList(root);

    addToggle(
      surfaceButtons,
      "customSurface",
      '<i class="fa-regular fa-wave-square"></i> Custom surface',
      function () {
        uniforms.customSurface.value = options.customSurface;
        setSurfaceShader();
        configureCustomSurfaceControllers();
        renderIfNotRunning();
        updateView("customSurface");
      },
      null,
      "Plot the solution on a custom surface",
    );

    controllers["surfaceFun"] = root
      .add(options, "surfaceFun")
      .name("Surface $z=$ ")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        updateWhatToPlot();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["threeDHeightScale"] = root
      .add(options, "threeDHeightScale")
      .name("Height scale")
      .onChange(function () {
        updateUniforms();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["cameraTheta"] = root
      .add(options, "cameraTheta")
      .name("View $\\theta$")
      .onChange(function () {
        configureCameraAndClicks();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["cameraPhi"] = root
      .add(options, "cameraPhi")
      .name("View $\\phi$")
      .onChange(function () {
        configureCameraAndClicks();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["cameraZoom"] = root
      .add(options, "cameraZoom")
      .name("Zoom")
      .onChange(function () {
        configureCameraAndClicks();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["lineWidthMul"] = root
      .add(options, "lineWidthMul", 0.1, 2)
      .name("Thickness")
      .onChange(function () {
        setLineWidth();
        renderIfNotRunning();
        updateView(this.property);
      });

    vectorFieldFolder = editViewFolder.addFolder("Vector field options");
    root = vectorFieldFolder;
    addInfoButton(root, "/user-guide/advanced-options#vector-field");
    root.domElement.id = "vectorFieldFolder";
    root.domElement.classList.add("viewsFolder");

    const vectorFieldButtons = addButtonList(root);
    addToggle(
      vectorFieldButtons,
      "vectorField",
      `<i class="fa-solid fa-arrow-right-arrow-left"></i> Enable`,
      function () {
        configureVectorField();
        renderIfNotRunning();
        updateView("vectorField");
      },
      "vectorFieldButton",
      "Toggle vector field",
      null,
      ["wide"],
    );

    root
      .addColor(options, "arrowColour")
      .name("Colour")
      .onChange(function () {
        updateArrowColour();
        renderIfNotRunning();
        updateView(this.property);
      });

    root
      .add(options, "arrowX")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setPostFunFragShader();
        renderIfNotRunning();
        updateView(this.property);
      })
      .name("$x$ component");

    root
      .add(options, "arrowY")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setPostFunFragShader();
        renderIfNotRunning();
        updateView(this.property);
      })
      .name("$y$ component");

    controllers["arrowDensity"] = root
      .add(options, "arrowDensity")
      .onChange(function () {
        configureVectorField();
        renderIfNotRunning();
        updateView(this.property);
      })
      .name("Density");
    controllers["arrowDensity"].__precision = 2;
    createOptionSlider(controllers["arrowDensity"], 0, 1, 0.001);

    root
      .add(options, "arrowScale", {
        None: "none",
        Relative: "relative",
        Auto: "auto",
      })
      .onFinishChange(function () {
        configureGUI();
        renderIfNotRunning();
        updateView(this.property);
      })
      .name("Scaling");

    controllers["arrowLengthMax"] = root
      .add(options, "arrowLengthMax")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        configureVectorField();
        renderIfNotRunning();
        updateView(this.property);
      })
      .name("Max length");

    root = editViewFolder.addFolder("Time series options");
    addInfoButton(root, "/user-guide/advanced-options#timeseries");
    root.domElement.id = "probeFolder";
    root.domElement.classList.add("viewsFolder");

    const probeTopButtons = addButtonList(root);
    addToggle(
      probeTopButtons,
      "probing",
      `<i class="fa-solid fa-chart-line"></i> Enable`,
      function () {
        configureProbe();
        renderIfNotRunning();
        updateView("probing");
      },
      "probeButton",
      "Toggle display of time series",
      null,
      ["wide"],
    );
    addButton(
      probeTopButtons,
      '<i class="fa-solid fa-arrows-left-right-to-line fa-rotate-90"></i> Snap range',
      function () {
        snapProbeAxes();
        renderIfNotRunning();
      },
      null,
      "Snap vertical min/max to visible",
      ["wide"],
    );

    controllers["probeType"] = root
      .add(options, "probeType", { Point: "sample", Integral: "integral" })
      .name("Type")
      .onFinishChange(function () {
        uniforms.pointProbe.value = options.probeType == "sample";
        renderIfNotRunning();
        configureProbe();
        updateView(this.property);
      });
    addProbeTargetButton();

    root
      .add(options, "probeFun")
      .name("Expression")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setProbeShader();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["prX"] = root
      .add(options, "probeX")
      .name("$x$ location")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setProbeShader();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["prY"] = root
      .add(options, "probeY")
      .name("$y$ location")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setProbeShader();
        renderIfNotRunning();
        updateView(this.property);
      });

    root
      .add(options, "probeLength")
      .name("Duration")
      .onFinishChange(function () {
        if (options.probeLength <= 0) autoSetProbeLength();
        this.setValue(Math.min((0, options.probeLength)));
        renderIfNotRunning();
        updateView(this.property);
      });

    // Populate the toggle button list for turning on effects.
    addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-palette"></i> Colour',
      "Show colour options",
      "colourFolder",
      ["wide"],
    );

    viewFeatureToggles = {};
    viewFeatureToggles["contours"] = addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-bullseye"></i> Contours',
      "Show contour options",
      "contoursFolder",
      ["wide"],
    );

    viewFeatureToggles["emboss"] = addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-lightbulb"></i> Lighting',
      "Show lighting options",
      "embossFolder",
      ["wide"],
    );

    viewFeatureToggles["overlay"] = addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-clover"></i> Overlay',
      "Show overlay options",
      "overlayFolder",
      ["wide"],
    );

    viewFeatureToggles["vectorField"] = addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-arrow-right-arrow-left"></i> Vector field',
      "Show vector field options",
      "vectorFieldFolder",
      ["wide"],
    );

    viewFeatureToggles["probing"] = addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-chart-line"></i> Time series',
      "Show time series options",
      "probeFolder",
      ["wide"],
    );

    threeDFolderButton = addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-cube"></i> 3D',
      "Show 3D options",
      "linesAnd3DFolder",
      ["wide"],
    );

    linesFolderButton = addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-bezier-curve"></i> Line',
      "Show line options",
      "linesAnd3DFolder",
      ["wide"],
    );

    // Hide all views submenus.
    effectsButtons.submenuToggles[0].click();
    effectsButtons.submenuToggles[0].click();

    // ComboBCs GUI.
    // Add a title to the comboBCs GUI.
    const comboBCsTitle = document.createElement("div");
    comboBCsTitle.classList.add("ui_title");
    comboBCsTitle.id = "comboBCsTitle";
    comboBCsGUI.domElement.prepend(comboBCsTitle);
    root = comboBCsGUI;

    controllers["comboBCsType"] = root
      .add(comboBCsOptions, "type", {})
      .name("Type")
      .onFinishChange(function () {
        configureComboBCsGUI(comboBCsOptions.type);
      });
    configureComboBCsDropdown();

    controllers["comboBCsValue"] = root
      .add(comboBCsOptions, "value")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        // Remove any BCs already set for the current side.
        const isPeriodic = comboBCsOptions.type.toLowerCase() == "periodic";
        let str =
          options["comboStr_" + (comboBCsOptions.speciesInd + 1).toString()];
        str = str.replaceAll(
          new RegExp(comboBCsOptions.side + "([^;]*);", "gi"),
          "",
        );
        let oppositeSide = "";
        switch (comboBCsOptions.side) {
          case "left":
            oppositeSide = "right";
            break;
          case "right":
            oppositeSide = "left";
            break;
          case "bottom":
            oppositeSide = "top";
            break;
          case "top":
            oppositeSide = "bottom";
            break;
        }
        // Add the new BC.
        let newBCs;
        if (isPeriodic) {
          newBCs = [comboBCsOptions.side, oppositeSide].map(
            (s) => capitaliseFirstLetter(s) + ": " + "Periodic;",
          );
        } else {
          newBCs = [comboBCsOptions.side, oppositeSide].map(
            (s) =>
              capitaliseFirstLetter(s) +
              ": " +
              capitaliseFirstLetter(comboBCsOptions.type) +
              " = " +
              this.getValue() +
              ";",
          );
        }
        str += newBCs[0];
        let regex;
        if (isPeriodic) {
          // If the new BC is periodic, replace the BC on the opposite side with a periodic one.
          regex = new RegExp(oppositeSide + "[^;]*;", "gi");
          str = str.replaceAll(regex, "");
          str += newBCs[1];
        } else {
          // If the BC on the opposite side is periodic, remove the opposite BC and duplicate this BC.
          regex = new RegExp(oppositeSide + "\\s*:\\s*Periodic;", "gi");
          if (regex.test(str)) {
            str = str.replaceAll(regex, "");
            str += newBCs[1];
          }
        }
        let controller =
          controllers[
            "combo" + defaultSpecies[comboBCsOptions.speciesInd].toUpperCase()
          ];
        controller.setValue(sortBCsString(removeExtraWhitespace(str.trim())));
        setClickAreaLabels();
        setRDEquations();
      });

    // Always make images controller, but hide them if they're not wanted.
    createImageControllers();

    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => disableAutocorrect(input));
    inputs.forEach((input) =>
      input.addEventListener("blur", function () {
        window.scrollTo({ top: -1, left: 0, behaviour: "smooth" });
        document.body.scrollTo(0, 0);
      }),
    );

    // Put all title elements in the taborder, and make Enter key click them.
    document.querySelectorAll(".dg li.title").forEach((title) => {
      title.tabIndex = 0;
      title.addEventListener("keydown", function (e) {
        if (e.key == "Enter") {
          title.click();
        }
      });
    });
  }

  function animate() {
    if (isSuspended) {
      requestAnimationFrame(animate);
      return;
    }
    if (options.showStats || isOptimising) stats.begin();

    hasDrawn = isDrawing;
    // Draw on any input from the user, which can happen even if timestepping is not running.
    if (isDrawing && options.brushEnabled) {
      draw();
    }

    // Only timestep if the simulation is running.
    if (isRunning && canTimeStep) {
      // Ensure that any Dirichlet BCs are satisfied before timestepping (required due to brushes/init condition).
      anyDirichletBCs ? enforceDirichlet() : {};
      // Perform a number of timesteps per frame.
      for (let i = 0; i < options.numTimestepsPerFrame; i++) {
        if (
          options.autoPause &&
          canAutoPause &&
          uniforms.t.value >= autoPauseStopValue
        ) {
          // Pause automatically if this option is selected and we're past the set time, but only once.
          canAutoPause = false;
          pauseSim();
          break;
        }
        if (shaderContainsRAND && !options.setSeed) updateRandomSeed();
        if (shaderContainsGlobalIntegral) {
          timestepCount =
            (timestepCount + 1) % options.globalIntegralUpdatePeriod;
          if (!(timestepCount % options.globalIntegralUpdatePeriod)) {
            updateGlobalIntegral();
          }
        }
        timestep();
        // Leave the loop after one timestep if we're in automata mode.
        if (options.automataMode) {
          canTimeStep = false;
          setTimeout(() => {
            canTimeStep = true;
          }, 1000 / options.numTimestepsPerFrame);
          break;
        }
      }
    }

    // Render if something has happened.
    if (hasDrawn || isRunning) render();

    // Update stats.
    if (options.showStats || isOptimising) stats.end();

    // Optimise FPS.
    if (isRunning && isOptimising) optimiseFPS();

    requestAnimationFrame(animate);
  }

  function optimiseFPS() {
    // Return immediately if we're already waiting for the FPS to stabilise.
    if (stabilisingFPSTimer) return;
    // If we're already at 1 TPF, stop optimising.
    if (options.numTimestepsPerFrame == 1) return doneOptimising();
    const fps = stats.getFPS();
    // If we're already at 30 FPS, stop optimising.
    if (fps > 29) return doneOptimising();

    // If stats has returned a new FPS, update the number of timesteps per frame to target 30 FPS.
    if (lastFPS != Math.floor(fps)) {
      lastFPS = Math.floor(fps);
      options.numTimestepsPerFrame = Math.max(
        1,
        Math.floor((options.numTimestepsPerFrame * fps) / 30),
      );
      controllers["numTimestepsPerFrame"].updateDisplay();
      stabilisingFPSTimer = setTimeout(
        () => (stabilisingFPSTimer = null),
        optimisationDelay,
      );
    } else {
      // If we haven't received a new FPS, we're probably at the limit of the device's performance.
      // Stop optimising.
      return doneOptimising();
    }
  }

  function setDrawAndDisplayShaders() {
    // Configure the display material.
    setDisplayColourAndType();

    // Configure the colourbar.
    configureColourbar();

    // Configure the postprocessing material.
    updateWhatToPlot();

    // Configure the drawing material.
    setBrushType();
  }

  function setBrushType() {
    // Must run before anything below that could reference an Int(...) expression - see
    // reconcileGlobalIntegrals().
    reconcileGlobalIntegrals();
    // Construct a drawing shader based on the selected type and the value string.
    // Insert any user-defined kinetic parameters, given as a string that needs parsing.
    // Extract variable definitions, separated by semicolons or commas, ignoring whitespace.
    const isMRT = numGroups(Number(options.numSpecies)) > 1;
    let shaderStr =
      kineticUniformsForShader() +
      (isMRT ? drawShaderTopMRT() : drawShaderTop());
    let radiusStr =
      "float brushRadius = " +
      parseShaderString(options.brushRadius.toString()) +
      ";\n";

    // If the radius string contains any references to u,v,w,q (or, for group-1 species,
    // u5..u8), replace them with references to the species at the brush centre, not the
    // current pixel.
    radiusStr = radiusStr
      .replace(/\buvwq\./g, "uvwqBrush.")
      .replace(/\buvwq2\./g, "uvwq2Brush.");
    // If the radius string contains any references to I_S or I_T, replace them with references to the value at the
    // brush centre, not the current pixel.
    radiusStr = radiusStr.replace(/\b(I_[ST])([RGBA]?)\b/g, "$1Brush$2");

    // If a random number has been requested, insert calculation of a random number.
    if (/\bRAND\b/.test(options.brushValue)) {
      shaderStr += randShader();
    }
    if (/\bRANDN(_[1234])?\b/.test(options.brushValue)) {
      shaderStr += randNShader();
    }
    shaderStr +=
      "float brushValue = " + parseShaderString(options.brushValue) + ";\n";

    // Configure the shape of the brush.
    shaderStr += radiusStr;
    switch (options.brushType) {
      case "circle":
        shaderStr += drawShaderShapeDisc();
        break;
      case "square":
        shaderStr += drawShaderShapeSquare();
        break;
      case "hline":
        shaderStr += drawShaderShapeHLine();
        break;
      case "vline":
        shaderStr += drawShaderShapeVLine();
        break;
    }

    // Configure the action of the brush. Brush drawing always targets exactly one species
    // (one channel of one group) at a time, so the MRT Bot variants only need
    // FRAGCOLOR/UVWQGROUP substituted for whichever group that species belongs to (see
    // below) - not a full dual-output "combine both groups' equations" treatment like the
    // main simulation shader.
    const botReplace = isMRT
      ? drawShaderBotReplaceMRT()
      : drawShaderBotReplace();
    const botAdd = isMRT ? drawShaderBotAddMRT() : drawShaderBotAdd();
    if (options.brushType == "custom") {
      shaderStr += drawShaderCustom();
      shaderStr += options.brushAction.includes("replace")
        ? botReplace
        : botAdd;
    } else {
      switch (options.brushAction) {
        case "replace":
          shaderStr += drawShaderFactorSharp();
          shaderStr += botReplace;
          break;
        case "add":
          shaderStr += drawShaderFactorSharp();
          shaderStr += botAdd;
          break;
        case "smoothreplace":
          shaderStr += drawShaderFactorSmooth();
          shaderStr += botReplace;
          break;
        case "smoothadd":
          shaderStr += drawShaderFactorSmooth();
          shaderStr += botAdd;
          break;
      }
    }
    // Configure the displayed cursor.
    configureCursorDisplay();
    // Substitute in the correct colour code (and, for the MRT case, which group's output/
    // current-state variable the brush override targets).
    shaderStr = selectColourspecInShaderStr(shaderStr);
    if (isMRT) {
      const group = speciesToGroupInd(options.whatToDraw);
      shaderStr = shaderStr
        .replaceAll(/\bFRAGCOLOR\b/g, group === 0 ? "fragColor0" : "fragColor1")
        .replaceAll(/\bUVWQGROUP\b/g, group === 0 ? "uvwq" : "uvwq2");
    }
    shaderStr = replaceMINXMINY(shaderStr);
    assignFragmentShader(drawMaterial, shaderStr);
    drawMaterial.glslVersion = isMRT ? THREE.GLSL3 : null;
    drawMaterial.needsUpdate = true;
  }

  function setDisplayColourAndType() {
    // Must run before anything below that could reference an Int(...) expression - see
    // reconcileGlobalIntegrals().
    reconcileGlobalIntegrals();
    colourmap = getColours(options.colourmap);
    if (options.flippedColourmap) {
      colourmap.reverse();
      colourmap = colourmap.map((x) =>
        x.slice(0, -1).concat([1 - x.slice(-1)]),
      );
    }

    uniforms.colour1.value = new THREE.Vector4(...colourmap[0]);
    uniforms.colour2.value = new THREE.Vector4(...colourmap[1]);
    uniforms.colour3.value = new THREE.Vector4(...colourmap[2]);
    uniforms.colour4.value = new THREE.Vector4(...colourmap[3]);
    uniforms.colour5.value = new THREE.Vector4(...colourmap[4]);
    // fiveColourDisplayTopMRT/overlayShaderMRT (>4 species) just add extra input sampler(s)
    // + group-1 locals so the overlay expression can reference species 5-8 - still
    // single-output, so no glslVersion toggle is needed here.
    const isMRT = numGroups(Number(options.numSpecies)) > 1;
    let shader =
      kineticUniformsForShader() +
      (isMRT ? fiveColourDisplayTopMRT() : fiveColourDisplayTop());
    if (options.emboss) {
      shader += embossShader();
      setEmbossUniforms();
    }
    if (options.contours) {
      shader += contourShader();
      setContourUniforms();
    }
    if (options.overlay) {
      shader += (isMRT ? overlayShaderMRT() : overlayShader()).replaceAll(
        "OVERLAYEXPR",
        parseShaderString(options.overlayExpr),
      );
      shader = replaceMINXMINY(shader);
      setOverlayUniforms();
    }
    overlayLine.visible = options.overlay && options.plotType == "line";
    shader += fiveColourDisplayBot();
    assignFragmentShader(displayMaterial, shader);
    displayMaterial.needsUpdate = true;
    postMaterial.needsUpdate = true;
    colourmapEndpoints = colourmap.map((x) => x[3]);
    colourmap = colourmap.map((x) => x.slice(0, -1));
  }

  function selectColourspecInShaderStr(shaderStr) {
    let regex = /COLOURSPEC/g;
    shaderStr = shaderStr.replace(
      regex,
      speciesToChannelChar(options.whatToDraw),
    );
    return shaderStr;
  }

  function setDisplayFunInShader(shaderStr) {
    let regex = /\bFUN\b/g;
    shaderStr = shaderStr.replace(regex, parseShaderString(options.whatToPlot));
    regex = /\bHEIGHT\b/g;
    shaderStr = shaderStr.replace(regex, parseShaderString(options.surfaceFun));
    return shaderStr;
  }

  function draw() {
    // Update the random seed if we're drawing using random.
    if (!options.setSeed && options.brushValue.includes("RAND")) {
      updateRandomSeed();
    }

    simDomain.material = drawMaterial;
    // We'll draw onto all history terms. We'll do 1->0 then 2->1 etc, then cycle.
    if (numGroups(Number(options.numSpecies)) > 1) {
      // drawMaterial's MRT shader (drawShaderTopMRT, Stage 7) always passes both groups'
      // current state through, overriding only the one drawn-on channel - so both
      // textureSource (group 0) and textureSourceGroup1 (group 1) need to be bound from the
      // same slot regardless of which group is actually being drawn on.
      for (let ind = 1; ind < mrtSimTextures.length; ind++) {
        uniforms.textureSource.value = mrtSimTextures[ind].texture[0];
        uniforms.textureSourceGroup1.value = mrtSimTextures[ind].texture[1];
        renderer.setRenderTarget(mrtSimTextures[ind - 1]);
        renderer.render(simScene, simCamera);
      }
      mrtSimTextures.rotate(-1);
    } else {
      for (let ind = 1; ind < simTextures.length; ind++) {
        uniforms.textureSource.value = simTextures[ind].texture;
        renderer.setRenderTarget(simTextures[ind - 1]);
        renderer.render(simScene, simCamera);
      }
      simTextures.rotate(-1);
    }
  }

  function timestep() {
    // We timestep by updating a texture that stores the solutions. We can't overwrite
    // the texture in the loop, so we'll cycle between textures. These
    // textures are already defined above, and their resolution defines the resolution
    // of solution.

    // Use the scheme specified in options.timesteppingScheme.
    switch (options.timesteppingScheme) {
      case "Euler":
        simDomain.material = simMaterials["FE"];
        if (numGroups(Number(options.numSpecies)) > 1) {
          // The real 8-species state lives in mrtSimTextures (each slot's two
          // attachments are group 0/group 1 respectively) - simTextures is untouched and
          // unused once numGroups>1, matching every other Stage 3-7 MRT code path.
          uniforms.textureSource.value = mrtSimTextures[1].texture[0];
          uniforms.textureSourceGroup1.value = mrtSimTextures[1].texture[1];
          uniforms.textureSource1.value = mrtSimTextures[2].texture[0];
          uniforms.dt.value = options.dt;
          renderer.setRenderTarget(mrtSimTextures[0]);
          renderer.render(simScene, simCamera);
          mrtSimTextures.rotate(-1);
        } else {
          uniforms.textureSource.value = simTextures[1].texture;
          uniforms.textureSource1.value = simTextures[2].texture;
          uniforms.dt.value = options.dt;
          renderer.setRenderTarget(simTextures[0]);
          renderer.render(simScene, simCamera);
          simTextures.rotate(-1);
        }
        uniforms.t.value += options.dt;
        break;
      case "AB2":
        simDomain.material = simMaterials["AB2"];
        if (numGroups(Number(options.numSpecies)) > 1) {
          uniforms.textureSource.value = mrtSimTextures[1].texture[0];
          uniforms.textureSourceGroup1.value = mrtSimTextures[1].texture[1];
          uniforms.textureSource1.value = mrtSimTextures[2].texture[0];
          uniforms.textureSource1Group1.value = mrtSimTextures[2].texture[1];
          uniforms.dt.value = options.dt;
          renderer.setRenderTarget(mrtSimTextures[0]);
          renderer.render(simScene, simCamera);
          mrtSimTextures.rotate(-1);
        } else {
          uniforms.textureSource.value = simTextures[1].texture;
          uniforms.textureSource1.value = simTextures[2].texture;
          uniforms.dt.value = options.dt;
          renderer.setRenderTarget(simTextures[0]);
          renderer.render(simScene, simCamera);
          simTextures.rotate(-1);
        }
        uniforms.t.value += options.dt;
        break;
      case "Mid":
        if (numGroups(Number(options.numSpecies)) > 1) {
          // We'll use mrtSimTextures as [result, previous, k1].
          // Compute k1 in [2]. Mid1
          simDomain.material = simMaterials["Mid1"];
          uniforms.textureSource.value = mrtSimTextures[1].texture[0];
          uniforms.textureSourceGroup1.value = mrtSimTextures[1].texture[1];
          renderer.setRenderTarget(mrtSimTextures[2]);
          renderer.render(simScene, simCamera);

          // Compute the new value in [0] by computing k2 using k1. Mid2
          simDomain.material = simMaterials["Mid2"];
          uniforms.textureSource1.value = mrtSimTextures[2].texture[0];
          uniforms.textureSource1Group1.value = mrtSimTextures[2].texture[1];
          uniforms.t.value += 0.5 * options.dt;
          renderer.setRenderTarget(mrtSimTextures[0]);
          renderer.render(simScene, simCamera);
          mrtSimTextures.rotate(-1);
          uniforms.t.value += 0.5 * options.dt;
        } else {
          // We'll use simTextures as [result, previous, k1].
          // Compute k1 in [2]. Mid1
          simDomain.material = simMaterials["Mid1"];
          uniforms.textureSource.value = simTextures[1].texture;
          renderer.setRenderTarget(simTextures[2]);
          renderer.render(simScene, simCamera);

          // Compute the new value in [0] by computing k2 using k1. Mid2
          simDomain.material = simMaterials["Mid2"];
          uniforms.textureSource1.value = simTextures[2].texture;
          uniforms.t.value += 0.5 * options.dt;
          renderer.setRenderTarget(simTextures[0]);
          renderer.render(simScene, simCamera);
          simTextures.rotate(-1);
          uniforms.t.value += 0.5 * options.dt;
        }
        break;
      case "RK4":
        if (numGroups(Number(options.numSpecies)) > 1) {
          // We'll use mrtSimTextures as [result, previous, k1, k2, k3].

          // Compute k1 in [2]. RK41
          simDomain.material = simMaterials["RK41"];
          uniforms.textureSource.value = mrtSimTextures[1].texture[0];
          uniforms.textureSourceGroup1.value = mrtSimTextures[1].texture[1];
          renderer.setRenderTarget(mrtSimTextures[2]);
          renderer.render(simScene, simCamera);

          // Compute k2 in [3] using previous [1] and k1 [2]. RK42
          simDomain.material = simMaterials["RK42"];
          uniforms.textureSource1.value = mrtSimTextures[2].texture[0];
          uniforms.textureSource1Group1.value = mrtSimTextures[2].texture[1];
          uniforms.t.value += 0.5 * options.dt;
          renderer.setRenderTarget(mrtSimTextures[3]);
          renderer.render(simScene, simCamera);

          // Compute k3 in [4] using previous [1] and k2 [3]. RK43
          simDomain.material = simMaterials["RK43"];
          uniforms.textureSource2.value = mrtSimTextures[3].texture[0];
          uniforms.textureSource2Group1.value = mrtSimTextures[3].texture[1];
          renderer.setRenderTarget(mrtSimTextures[4]);
          renderer.render(simScene, simCamera);

          // Compute the new value in [0] by computing k4 using k1, k2, k3. RK44
          simDomain.material = simMaterials["RK44"];
          uniforms.textureSource3.value = mrtSimTextures[4].texture[0];
          uniforms.textureSource3Group1.value = mrtSimTextures[4].texture[1];
          uniforms.t.value += 0.5 * options.dt;
          renderer.setRenderTarget(mrtSimTextures[0]);
          renderer.render(simScene, simCamera);
          mrtSimTextures.rotate(-1);
        } else {
          // We'll use simTextures as [result, previous, k1, k2, k3].

          // Compute k1 in [2]. RK41
          simDomain.material = simMaterials["RK41"];
          uniforms.textureSource.value = simTextures[1].texture;
          renderer.setRenderTarget(simTextures[2]);
          renderer.render(simScene, simCamera);

          // Compute k2 in [3] using previous [1] and k1 [2]. RK42
          simDomain.material = simMaterials["RK42"];
          uniforms.textureSource1.value = simTextures[2].texture;
          uniforms.t.value += 0.5 * options.dt;
          renderer.setRenderTarget(simTextures[3]);
          renderer.render(simScene, simCamera);

          // Compute k3 in [4] using previous [1] and k2 [3]. RK43
          simDomain.material = simMaterials["RK43"];
          uniforms.textureSource2.value = simTextures[3].texture;
          renderer.setRenderTarget(simTextures[4]);
          renderer.render(simScene, simCamera);

          // Compute the new value in [0] by computing k4 using k1, k2, k3. RK44
          simDomain.material = simMaterials["RK44"];
          uniforms.textureSource3.value = simTextures[4].texture;
          uniforms.t.value += 0.5 * options.dt;
          renderer.setRenderTarget(simTextures[0]);
          renderer.render(simScene, simCamera);
          simTextures.rotate(-1);
        }
        break;
    }
  }

  function enforceDirichlet() {
    // Enforce any Dirichlet boundary conditions.
    simDomain.material = dirichletMaterial;
    // The real 8-species state lives in mrtSimTextures once numGroups>1 (matching every
    // other Stage 3+ MRT code path) - dirichletMaterial's shader/glslVersion are already
    // toggled to the MRT-capable variant in setRDEquations() when that's the case (Stage
    // 11.5 of the 8-species upgrade; previously this always cascaded over the unused
    // simTextures regardless, so Dirichlet BCs silently had no effect on any species once
    // numSpecies>4).
    if (numGroups(Number(options.numSpecies)) > 1) {
      // We'll do 1->0 then 2->1 etc, then cycle.
      for (let ind = 1; ind < mrtSimTextures.length; ind++) {
        uniforms.textureSource.value = mrtSimTextures[ind].texture[0];
        uniforms.textureSourceGroup1.value = mrtSimTextures[ind].texture[1];
        renderer.setRenderTarget(mrtSimTextures[ind - 1]);
        renderer.render(simScene, simCamera);
      }
      mrtSimTextures.rotate(-1);
    } else {
      // We'll do 1->0 then 2->1 etc, then cycle.
      for (let ind = 1; ind < simTextures.length; ind++) {
        uniforms.textureSource.value = simTextures[ind].texture;
        renderer.setRenderTarget(simTextures[ind - 1]);
        renderer.render(simScene, simCamera);
      }
      simTextures.rotate(-1);
    }
  }

  function render(isResetting) {
    // Perform any postprocessing on the last computed values.
    postprocess();

    // If selected, set the colour range.
    if (
      options.autoSetColourRange &&
      (isResetting || !(frameCount % options.guiUpdatePeriod))
    ) {
      setColourRangeSnap();
    }

    // If this is a line plot, modify the line positions and colours before rendering.
    if (options.plotType == "line") {
      // Get the output from the buffer, in the form of (value,0,0,1).
      fillBuffer();
      let ind = 0;
      var range = cLims[1] - cLims[0];
      range = range == 0 ? 0.5 : range;
      for (let i = 0; i < buffer.length; i += 4) {
        // Set the height.
        yDisplayDomainCoords[ind++] = (buffer[i] - cLims[0]) / range - 0.5;
      }
      // Use spline-smoothed points for plotting.
      let curve = new THREE.SplineCurve(
        xDisplayDomainCoords.map(
          (x, ind) => new THREE.Vector2(x, yDisplayDomainCoords[ind]),
        ),
      );
      let points;
      try {
        points = curve.getSpacedPoints(numPointsInLine);
      } catch (e) {
        // If this fails, we've almost certainly hit NaN. Try to recover.
        hitNaN();
        yDisplayDomainCoords = yDisplayDomainCoords.map(() => 0);
        curve = new THREE.SplineCurve(
          xDisplayDomainCoords.map(
            (x, ind) => new THREE.Vector2(x, yDisplayDomainCoords[ind]),
          ),
        );
        points = curve.getSpacedPoints(numPointsInLine);
      }
      setLineXY(line, points);
      setLineColour(line, points);
      if (options.overlay) {
        ind = 0;
        for (let i = 2; i < 4 * nXDisc; i += 4) {
          yDisplayDomainCoords[ind++] = (buffer[i] - cLims[0]) / range - 0.5;
        }
        curve = new THREE.SplineCurve(
          xDisplayDomainCoords.map(
            (x, ind) => new THREE.Vector2(x, yDisplayDomainCoords[ind]),
          ),
        );
        try {
          points = curve.getSpacedPoints(numPointsInLine);
        } catch (e) {
          // If this fails, we've almost certainly hit NaN for the overlay species. Try to recover.
          hitNaN();
          yDisplayDomainCoords = yDisplayDomainCoords.map(() => 0);
          curve = new THREE.SplineCurve(
            xDisplayDomainCoords.map(
              (x, ind) => new THREE.Vector2(x, yDisplayDomainCoords[ind]),
            ),
          );
          points = curve.getSpacedPoints(numPointsInLine);
        }
        setLineXY(overlayLine, points);
      }
    }

    // If a vector field is requested, update arrows. They will already be set as visible.
    if (
      options.vectorField &&
      arrowGroup &&
      !(frameCount % options.guiUpdatePeriod)
    ) {
      // Update the direction of each arrow using the b and a components of postTexture.
      getPostState();
      let ind,
        xComp,
        yComp,
        sizes = [];
      for (const arrow of arrowGroup.children) {
        ind = 4 * arrow.ind;
        xComp = postBuffer[ind + 2];
        yComp = postBuffer[ind + 3];
        arrow.visible = postBuffer[ind + 1] <= 0.5;
        arrow.lookAt(
          arrow.position.x + xComp,
          arrow.position.y + yComp,
          arrow.position.z,
        );
        arrow.size = xComp ** 2 + yComp ** 2;
        sizes.push(arrow.size);
      }
      let maxSize = 1;
      switch (options.arrowScale) {
        case "auto":
          maxSize = Math.sqrt(Math.max(...sizes));
          if (maxSize == 0) maxSize = 1;
          for (const arrow of arrowGroup.children) {
            const scale =
              baseArrowScale * lerp(0.1, 1.5, Math.sqrt(arrow.size) / maxSize);
            arrow.scale.set(scale, scale, scale);
          }
          break;
        case "relative":
          maxSize = arrowGroup.customMax > 0 ? arrowGroup.customMax : 1;
          for (const arrow of arrowGroup.children) {
            const scale =
              baseArrowScale * lerp(0.1, 1.5, Math.sqrt(arrow.size) / maxSize);
            arrow.scale.set(scale, scale, scale);
          }
          break;
        case "none":
          for (const arrow of arrowGroup.children) {
            arrow.scale.set(baseArrowScale, baseArrowScale, baseArrowScale);
          }
          break;
      }
    }

    // If selected, update the time display.
    if (options.timeDisplay && !(frameCount % options.guiUpdatePeriod)) {
      updateTimeDisplay();
    }

    // If selected, update the integral display.
    if (options.integrate && !(frameCount % options.guiUpdatePeriod)) {
      updateIntegralDisplay();
    }

    // If we want to smooth manually, apply a bilinear filter.
    if (isManuallyInterpolating() & !options.automataMode) {
      simDomain.material = interpolationMaterial;
      renderer.setRenderTarget(interpolationTexture);
      renderer.render(simScene, simCamera);
      uniforms.textureSource.value = interpolationTexture.texture;
      uniforms.dxUpscaledScale.value =
        (devicePixelRatio * canvasWidth) / nXDisc;
      uniforms.dyUpscaledScale.value =
        (devicePixelRatio * canvasHeight) / nYDisc;
    } else {
      uniforms.dxUpscaledScale.value = 1;
      uniforms.dyUpscaledScale.value = 1;
    }

    // Render the output to the screen.
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    if (takeAScreenshot) {
      takeAScreenshot = false;
      var link = document.createElement("a");
      link.download = "VisualPDEScreenshot.png";
      renderer.render(scene, camera);
      link.href = renderer.domElement
        .toDataURL()
        .replace(
          /^data:image\/?[A-z]*;base64,/,
          "data:application/octet-stream;base64,",
        );
      link.click();
      setSizes();
      render();
    }

    // If we're probing via an integral, we overwrite postTexture (now that we're done with it) to compute the integral.
    if (
      options.probing &&
      options.probeType == "integral" &&
      readyForProbeUpdate()
    ) {
      bufferFilled = false;
      simDomain.material = probeMaterial;
      if (numGroups(Number(options.numSpecies)) > 1) {
        uniforms.textureSource.value = mrtSimTextures[1].texture[0];
        uniforms.textureSourceGroup1.value = mrtSimTextures[1].texture[1];
      } else {
        uniforms.textureSource.value = simTextures[1].texture;
      }
      renderer.setRenderTarget(postTexture);
      renderer.render(simScene, simCamera);
      fillBuffer();
      let dA;
      if (options.dimension == 1) {
        dA = uniforms.dx.value;
      } else if (options.dimension == 2) {
        dA = uniforms.dx.value * uniforms.dy.value;
      }
      let total = 0;
      for (let i = 0; i < buffer.length; i += 4) {
        total += buffer[i] * (1 - buffer[i + 1]);
      }
      total *= dA;
      addProbeData(uniforms.t.value, total);
      updateProbeDisplay();
    }

    frameCount = (frameCount + 1) % options.guiUpdatePeriod;
  }

  function postprocess(updateProbeXY = false) {
    simDomain.material = postMaterial;
    // The real 8-species state lives in mrtSimTextures once numGroups>1. textureSourceGroup1
    // is bound here (used by both postMaterial's computeDisplayFunShaderMidMRT and, via the
    // render below, probeMaterial's probeShaderMRT - both need to read group 1's state) and
    // reused again below for displayMaterial's overlayShaderMRT.
    const isMRT = numGroups(Number(options.numSpecies)) > 1;
    if (isMRT) {
      uniforms.textureSource.value = mrtSimTextures[1].texture[0];
      uniforms.textureSourceGroup1.value = mrtSimTextures[1].texture[1];
    } else {
      uniforms.textureSource.value = simTextures[1].texture;
    }
    renderer.setRenderTarget(postTexture);
    renderer.render(simScene, simCamera);
    // If we're probing, probe the simulation texture.
    if (
      (options.probing &&
        options.probeType == "sample" &&
        (readyForProbeUpdate() || updateProbeXY)) ||
      updateProbeXY
    ) {
      simDomain.material = probeMaterial;
      renderer.setRenderTarget(probeTexture);
      renderer.render(simScene, simCamera);
      // Create a buffer for reading single pixel
      const pixelBuffer = new Float32Array(4);

      // Read the pixel and push to the probe plot.
      renderer.readRenderTargetPixels(probeTexture, 0, 0, 1, 1, pixelBuffer);
      addProbeData(uniforms.t.value, pixelBuffer[0]);
      updateProbeDisplay();
      if (updateProbeXY) {
        // Read in the computed X,Y coords from the buffer.
        options.probeX = pixelBuffer[2];
        options.probeY = pixelBuffer[3];
        refreshGUI(viewsGUI);
        updateView("probeX");
        updateView("probeY");
      }
    }
    uniforms.textureSource.value = postTexture.texture;
    bufferFilled = false;
    if (isMRT) {
      uniforms.textureSource1.value = mrtSimTextures[1].texture[0];
      // textureSourceGroup1 stays bound to mrtSimTextures[1].texture[1] from above, reused
      // as-is for the overlay pass.
    } else {
      uniforms.textureSource1.value = simTextures[1].texture;
    }
  }

  function onDocumentPointerDown(event) {
    // If the event is a right-click, we'll want to negate the brush action.
    if (event.button == 2) {
      event.preventDefault();
      uniforms.brushValueModifier.value = -1;
    } else {
      uniforms.brushValueModifier.value = 1;
    }
    isDrawing = setBrushCoords(event, canvas);
    if (isDrawing) {
      if (options.brushEnabled && options.plotType == "surface") {
        controls.enabled = false;
      } else if (!options.brushEnabled && !uiHidden) {
        // Display a message saying that the brush is disabled.")
        $("#brush_disabled").fadeIn(1000);
        window.clearTimeout(brushDisabledTimer);
        brushDisabledTimer = setTimeout(
          () => $("#brush_disabled").fadeOut(1000),
          3000,
        );
      }
    }
  }

  function onDocumentPointerUp(event) {
    isDrawing = false;
    if (options.plotType == "surface") {
      controls.enabled = true;
    }
  }

  function onDocumentPointerMove(event) {
    if (isDrawing) {
      setBrushCoords(event, canvas);
    }
  }

  function setBrushCoords(event, container) {
    // Set the brush coordinates to the mouse position, and return whether we're in the container.
    var cRect = container.getBoundingClientRect();
    let x = (event.clientX - cRect.x) / cRect.width;
    let y = 1 - (event.clientY - cRect.y) / cRect.height;
    if (options.plotType == "surface") {
      // If we're in 3D, we'll do some GPU-side raycasting to find the coordinates.
      camera.setViewOffset(
        cRect.width,
        cRect.height,
        Math.floor(event.clientX - cRect.x),
        Math.floor(event.clientY - cRect.y),
        1,
        1,
      );
      // Render to the click domain.
      domain.material = clickMaterial;
      renderer.setRenderTarget(clickTexture);
      scene.background = clearColour;
      renderer.render(scene, camera);

      // Reset for future rendering.
      camera.clearViewOffset();
      domain.material = displayMaterial;
      scene.background = new THREE.Color(options.backgroundColour);

      // Create a buffer for reading single pixel
      const pixelBuffer = new Float32Array(4);

      // Read the pixel.
      renderer.readRenderTargetPixels(clickTexture, 0, 0, 1, 1, pixelBuffer);
      [x, y] = pixelBuffer.slice(0, 2);
    } else if (options.plotType == "line") {
      x = (x - 0.5) / camera.zoom + 0.5;
      y = 0.5;
    }
    // Round to near-pixel coordinates.
    if (options.automataMode) {
      x = (Math.ceil(x * nXDisc) - 0.5) / nXDisc;
      y = (Math.ceil(y * nYDisc) - 0.5) / nYDisc;
    } else {
      x = Math.round(x * nXDisc) / nXDisc;
      y = Math.round(y * nYDisc) / nYDisc;
    }
    uniforms.brushCoords.value = new THREE.Vector2(x, y);
    return 0 <= x && x <= 1 && 0 <= y && y <= 1;
  }

  /**
   * Creates the 5-slot ping-pong render target array used by a single texture group (one
   * texture holding up to CHANNELS_PER_GROUP species in its r,g,b,a channels): a "current"
   * target plus 4 history/stage-buffer clones, which between them cover every timestepping
   * scheme's needs (Forward Euler needs 2, RK4 needs all 5). Factored out so the always-
   * present group 0 (simTextures) and, once implemented, any future >8-species upgrade's
   * additional groups can all share this logic.
   * @param {number} width
   * @param {number} height
   * @param {Object} opts - THREE.WebGLRenderTarget options (format/type/filtering).
   * @returns {THREE.WebGLRenderTarget[]} 5 render targets; entries 1-4 are clones of entry 0.
   */
  function createGroupRenderTargets(width, height, opts) {
    const targets = [new THREE.WebGLRenderTarget(width, height, opts)];
    targets.push(targets[0].clone());
    targets.push(targets[0].clone());
    targets.push(targets[0].clone());
    targets.push(targets[0].clone());
    return targets;
  }

  /**
   * MRT counterpart of createGroupRenderTargets, used only once numGroups(options.numSpecies)>1.
   * Each slot is a single THREE.WebGLMultipleRenderTargets with one colour attachment per
   * texture group, so one render call can update every group's species at once. Group g's
   * texture for ping-pong slot k is mrtSimTextures[k].texture[g].
   * @param {number} width
   * @param {number} height
   * @param {Object} opts
   * @param {number} groups - Number of texture groups (colour attachments), i.e. numGroups(numSpecies).
   * @returns {THREE.WebGLMultipleRenderTargets[]} 5 MRT render targets.
   */
  function createMRTRenderTargets(width, height, opts, groups) {
    const targets = [
      new THREE.WebGLMultipleRenderTargets(width, height, groups, opts),
    ];
    targets.push(targets[0].clone());
    targets.push(targets[0].clone());
    targets.push(targets[0].clone());
    targets.push(targets[0].clone());
    return targets;
  }

  /**
   * Allocates mrtSimTextures if numSpecies>4 and the right number of groups isn't already
   * allocated; disposes them if numSpecies has dropped back to <=4. A no-op otherwise, so
   * it's safe to call on every numSpecies change. Must run before resetSim()/clearTextures()
   * so the (de)allocated targets are in place before anything renders into them.
   */
  function ensureMRTRenderTargets() {
    const groups = numGroups(options.numSpecies);
    if (groups <= 1) {
      disposeMRTRenderTargets();
      return;
    }
    if (
      mrtSimTextures.length > 0 &&
      mrtSimTextures[0].texture.length === groups
    ) {
      return;
    }
    disposeMRTRenderTargets();
    mrtSimTextures.push(
      ...createMRTRenderTargets(
        options.maxDisc,
        options.maxDisc,
        simTextureOpts,
        groups,
      ),
    );
    // Match simTextures' periodic wrapping (set on every attachment of every slot).
    mrtSimTextures.forEach((mrtTex) => {
      mrtTex.texture.forEach((tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
      });
    });
  }

  /**
   * Frees the GPU resources backing mrtSimTextures (THREE render targets are not garbage
   * collected automatically) and empties the array. Safe to call when nothing is allocated.
   */
  function disposeMRTRenderTargets() {
    mrtSimTextures.forEach((tex) => tex.dispose());
    mrtSimTextures.length = 0;
  }

  function clearTextures() {
    setRenderSizeToDisc();
    const isMRT = numGroups(Number(options.numSpecies)) > 1;
    // If restoring a checkpoint captured/loaded while numGroups was 1 (no group-1 data) but
    // numSpecies is now >4, species 5-8 restore to zero rather than being left with whatever
    // a single-output material would otherwise leave in that attachment (undefined/stale
    // data) - created fresh each time (a reset-to-checkpoint is an explicit, infrequent user
    // action, not a per-frame one) and disposed right after use, below.
    let tempZeroGroup1Tex;
    if (checkpointExists && options.resetFromCheckpoints) {
      if (isMRT) {
        // checkpointMaterial (plain MeshBasicMaterial) can only sample one texture/write
        // one output - use checkpointMaterialMRT (Stage 11.5 of the 8-species upgrade)
        // instead, which samples both checkpoint textures and writes both attachments.
        if (checkpointTextureGroup1 == null) {
          tempZeroGroup1Tex = new THREE.DataTexture(
            new Float32Array(
              checkpointTexture.image.width *
                checkpointTexture.image.height *
                4,
            ),
            checkpointTexture.image.width,
            checkpointTexture.image.height,
            THREE.RGBAFormat,
            THREE.FloatType,
          );
          tempZeroGroup1Tex.needsUpdate = true;
        }
        checkpointMaterialMRT.uniforms.textureSource.value = checkpointTexture;
        checkpointMaterialMRT.uniforms.textureSourceGroup1.value =
          checkpointTextureGroup1 ?? tempZeroGroup1Tex;
        simDomain.material = checkpointMaterialMRT;
      } else {
        simDomain.material = checkpointMaterial;
      }
    } else {
      simDomain.material = clearMaterial;
    }
    // The real 8-species state lives in mrtSimTextures once numGroups>1 (see timestep()'s
    // "Euler" case) - clearMaterial's MRT shader (Stage 7) writes both attachments in one
    // render call per slot.
    (isMRT ? mrtSimTextures : simTextures).forEach((tex) => {
      renderer.setRenderTarget(tex);
      renderer.render(simScene, simCamera);
    });
    tempZeroGroup1Tex?.dispose();
    setDefaultRenderSize();
    render();
  }

  function pauseSim() {
    if (!uiHidden) {
      $("#pause").hide();
      $("#pause").invisible();
      $("#play").show();
      $("#play").visible();
    }
    isRunning = false;
    renderIfNotRunning();
  }

  function playSim() {
    if (!uiHidden) {
      $("#play").hide();
      $("#play").invisible();
      $("#pause").show();
      $("#pause").visible();
    }
    shouldCheckNaN = true;
    window.clearTimeout(NaNTimer);
    NaNTimer = setTimeout(checkForNaN, 1000);
    isRunning = true;
  }

  function resetSim() {
    if (options.setSeed) {
      seed = options.randSeed;
    }
    updateRandomSeed();
    uniforms.t.value = 0.0;
    timestepCount = 0;
    frameCount = 0;
    canAutoPause = true;
    updateTimeDisplay();
    clearTextures();
    clearProbe();
    if (shaderContainsGlobalIntegral) {
      updateGlobalIntegral();
    }
    render(true);
    // Reset time-tracking stats.
    lastT = uniforms.t.value;
    lastTime = performance.now();
    // Start a timer that checks for NaNs every second.
    shouldCheckNaN = true;
    window.clearTimeout(NaNTimer);
    checkForNaN();
  }

  function parseReactionStrings() {
    // Parse the user-defined shader strings into valid GLSL and output their concatenation. We won't worry about code injection.
    let out = "";
    // Prepare the UFUN string.
    out += "float UFUN = " + parseShaderString(options.reactionStr_1) + ";\n";
    // Prepare the VFUN string.
    out += "float VFUN = " + parseShaderString(options.reactionStr_2) + ";\n";
    // Prepare the WFUN string.
    out += "float WFUN = " + parseShaderString(options.reactionStr_3) + ";\n";
    // Prepare the QFUN string.
    out += "float QFUN = " + parseShaderString(options.reactionStr_4) + ";\n";

    // Species 5-8, only relevant once numGroups(numSpecies)>1 (numSpecies>4). Kept
    // separate from the 4 hardcoded lines above (rather than folding everything into one
    // generalized loop) so the numSpecies<=4 output is provably unchanged - this loop's
    // range is empty whenever numSpecies<=4.
    const numSpecies = Number(options.numSpecies);
    for (let i = 4; i < numSpecies; i++) {
      out +=
        "float " +
        reactionTokenOfSpecies(i) +
        " = " +
        parseShaderString(options["reactionStr_" + (i + 1)]) +
        ";\n";
    }

    return out;
  }

  // Shared per-coefficient body extracted from parseNormalDiffusionStrings/
  // parseCrossDiffusionStrings' tuple loops (unchanged logic, just factored out so the new
  // species-5-8/cross-group loops below can reuse it without duplicating it).
  function diffusionTupleToShader(str, label) {
    let out = "";
    let stry;
    // Check if we have a separate y diffusion coefficient.
    if (str.includes(";")) {
      let parts = str.split(";").filter((x) => x);
      str = parts[0];
      if (parts.length > 1 && options.dimension > 1) {
        stry = parts[1];
      }
    }
    // Add in the x diffusion coefficient.
    out += nonConstantDiffusionEvaluateInSpaceStr(
      parseShaderString(str) + ";\n",
      label + "x",
    );
    // Add in the y diffusion coefficients.
    if (!stry) {
      out += setEqualYDiffusionCoefficientsShader(label);
    } else {
      out += nonConstantDiffusionEvaluateInSpaceStr(
        parseShaderString(stry) + ";\n",
        label + "y",
      );
    }
    return out;
  }

  function parseNormalDiffusionStrings() {
    // Parse the user-defined shader strings into valid GLSL and output their concatenation. We won't worry about code injection.
    let out = "";
    const tuples = [
      [options.diffusionStr_1_1, "uu"],
      [options.diffusionStr_2_2, "vv"],
      [options.diffusionStr_3_3, "ww"],
      [options.diffusionStr_4_4, "qq"],
    ].slice(0, options.numSpecies);

    // Loop over the tuples.
    for (let [str, label] of tuples) {
      out += diffusionTupleToShader(str, label);
    }

    // Species 5-8 self-diffusion, only relevant once numGroups(numSpecies)>1 (numSpecies>4).
    // Kept separate from the tuples array above (rather than folding into one generalized
    // loop) so the numSpecies<=4 output is provably unchanged - this loop's range is empty
    // whenever numSpecies<=4.
    const numSpecies = Number(options.numSpecies);
    for (let i = 4; i < numSpecies; i++) {
      out += diffusionTupleToShader(
        options["diffusionStr_" + (i + 1) + "_" + (i + 1)],
        diffusionLabel(i, i),
      );
    }

    return out;
  }

  function parseCrossDiffusionStrings() {
    // Parse the user-defined shader strings into valid GLSL and output their concatenation. We won't worry about code injection.
    let out = "";

    const tuples = [
      [
        [options.diffusionStr_1_2, "uv"],
        [options.diffusionStr_1_3, "uw"],
        [options.diffusionStr_1_4, "uq"],
      ].slice(0, options.numSpecies - 1),
      [
        [options.diffusionStr_2_1, "vu"],
        [options.diffusionStr_2_3, "vw"],
        [options.diffusionStr_2_4, "vq"],
      ].slice(0, options.numSpecies - 1),
      [
        [options.diffusionStr_3_1, "wu"],
        [options.diffusionStr_3_2, "wv"],
        [options.diffusionStr_3_4, "wq"],
      ].slice(0, options.numSpecies - 1),
      [
        [options.diffusionStr_4_1, "qu"],
        [options.diffusionStr_4_2, "qv"],
        [options.diffusionStr_4_3, "qw"],
      ].slice(0, options.numSpecies - 1),
    ]
      .slice(0, (options.numSpecies - 1) * options.numSpecies)
      .flat(1);

    // Loop over the tuples.
    for (let [str, label] of tuples) {
      out += diffusionTupleToShader(str, label);
    }

    // Cross-diffusion terms involving species 5-8 (any pair where at least one index is
    // >=4 - pairs with both indices <4 are already covered by the tuples array above), only
    // relevant once numGroups(numSpecies)>1. Every species can cross-diffuse with every
    // other regardless of group, so this covers the full N x N matrix minus the diagonal
    // and minus the <=4-species block handled above. Empty whenever numSpecies<=4.
    const numSpecies = Number(options.numSpecies);
    for (let i = 0; i < numSpecies; i++) {
      for (let j = 0; j < numSpecies; j++) {
        if (i === j || (i < 4 && j < 4)) continue;
        out += diffusionTupleToShader(
          options["diffusionStr_" + (i + 1) + "_" + (j + 1)],
          diffusionLabel(i, j),
        );
      }
    }

    return out;
  }

  function nonConstantDiffusionEvaluateInSpaceStr(str, label) {
    let out = "";
    let xRegex = /\bx\b/g;
    let yRegex = /\by\b/g;
    let uvwqRegex = /\buvwq\.\b/g;

    out += "float D" + label + " = " + str;
    out +=
      "float D" +
      label +
      "L = " +
      str.replaceAll(xRegex, "(x-dx)").replaceAll(uvwqRegex, "uvwqL.");
    out +=
      "float D" +
      label +
      "R = " +
      str.replaceAll(xRegex, "(x+dx)").replaceAll(uvwqRegex, "uvwqR.");
    out +=
      "float D" +
      label +
      "T = " +
      str.replaceAll(yRegex, "(y+dy)").replaceAll(uvwqRegex, "uvwqT.");
    out +=
      "float D" +
      label +
      "B = " +
      str.replaceAll(yRegex, "(y-dy)").replaceAll(uvwqRegex, "uvwqB.");
    return out;
  }

  // Set the y diffusion coefficients to be equal to the x counterparts.
  function setEqualYDiffusionCoefficientsShader(label) {
    let out = "";
    out += "float D" + label + "y = D" + label + "x;\n";
    out += "float D" + label + "yL = D" + label + "xL;\n";
    out += "float D" + label + "yR = D" + label + "xR;\n";
    out += "float D" + label + "yT = D" + label + "xT;\n";
    out += "float D" + label + "yB = D" + label + "xB;\n";
    return out;
  }

  function parseShaderString(str, allowIntegrals = true) {
    // Parse a string into valid GLSL by replacing u,v,^, and integers.
    // Pad the string.
    str = " " + str + " ";

    // Substitute user-defined expressions (raw text macros, not GLSL quantities) before any
    // other parsing, so everything below only ever sees expression-free text.
    // expandedExpressionDefs is kept up to date by refreshExpressionExpansions(), called once
    // per shader rebuild in updateShaders().
    Object.keys(expandedExpressionDefs).forEach((name) => {
      str = str.replaceAll(
        new RegExp("\\b" + name + "\\b", "g"),
        "(" + expandedExpressionDefs[name] + ")",
      );
    });

    // Replace each Int(expression) with the globalIntegralValueN uniform holding its
    // current value, N being whichever of the (at most 4) slots reconcileGlobalIntegrals()
    // has assigned that expression to. reconcileGlobalIntegrals() always runs earlier in
    // the same shader-rebuild call than parseShaderString(), so the slot should always be
    // found; fall back to "0.0" (mirroring expandDependentExpressions' degrade-to-"0.0" for
    // cyclic expressions) if it somehow isn't, e.g. a slot that overflowed the max of 4. Must
    // run after macro substitution above - reconcileGlobalIntegrals() scans every field's raw
    // text (including a macro's own definition in options.expressions) for Int(...), so a
    // macro like "myMacro = u + Int(u)" already gets "u" assigned a slot; if this ran before
    // macro substitution, an Int(...) that only exists *inside* a macro's definition (only
    // appearing here once "myMacro" gets expanded to "(u + Int(u))") would never be resolved,
    // reaching the shader compiler as literal, invalid "Int(u)" text. Still runs before
    // anything below that could otherwise mangle the raw text inside "Int(...)" (e.g. species
    // substitution) - the lookup here needs to see the same canonical text
    // reconcileGlobalIntegrals() saw. The result is a bare identifier, immune to every later
    // substitution pass.
    //
    // allowIntegrals is false only for initial conditions (setClearShader) - domain integrals
    // aren't computed until the simulation is actually running (they're derived from the
    // current state, which doesn't exist yet at t=0, before the very first timestep), so
    // there's no meaningful value Int(...) could resolve to there. Rather than let that reach
    // the shader compiler as a reference to a uniform initCond's shader never declares
    // (a confusing "undefined identifier" GLSL compile error), degrade straight to "0.0" and
    // explain why via throwError.
    str = replaceIntCalls(str, (expr) => {
      if (!allowIntegrals) {
        throwError(
          "Int(...) can't be used in initial conditions, since domain integrals haven't been computed yet when the simulation starts. Use it in a reaction/forcing term or another field instead - initial conditions will be treated as 0 here.",
        );
        return "0.0";
      }
      const ind = options.globalIntExprs.indexOf(expr);
      return ind == -1 ? "0.0" : "globalIntegralValue" + (ind + 1);
    });

    // Perform a syntax check.
    if (!isValidSyntax(str) || isEmptyString(str)) {
      return " 0.0 ";
    }

    // Replace tanh with safetanh.
    str = str.replaceAll(/\btanh\b/g, "safetanh");

    // Replace custom functions.
    str = replaceGauss(str);
    str = replaceBump(str);
    str = replaceWhiteNoise(str);

    // Replace species[x,y] with a texture lookup. Note that this regex doesn't handle
    // x being an expression containing a comma.
    str = str.replaceAll(
      new RegExp(
        "\\b(" + anySpeciesRegexStrs[0] + ")\\[([^,]*),([^\\]]*)\\]",
        "g",
      ),
      function (m, d1, d2, d3) {
        const textureUniform =
          speciesToGroupInd(d1) === 0 ? "textureSource" : "textureSourceGroup1";
        return (
          "texture(" +
          textureUniform +
          ", vec2((" +
          d2 +
          "-MINX)/L_x,(" +
          d3 +
          "-MINY)/L_y))." +
          speciesToChannelChar(d1)
        );
      },
    );

    // Replace powers with safepow, including nested powers.
    str = replaceBinOperator(str, "^", function (m, p1, p2) {
      if (p2 == "0") return "1";
      const exp = Number(p2);
      if (Number.isInteger(exp && exp > 0 && exp < 101)) {
        return "((" + p1 + ")" + ("*(" + p1 + ")").repeat(exp - 1) + ")";
      } else return "safepow(" + p1 + "," + p2 + ")";
    });
    // Replace species with uvwq.[rgba] (group 0) or uvwq2.[rgba] (group 1, species 5-8).
    str = str.replaceAll(
      RegExp("\\b(" + anySpeciesRegexStrs[0] + ")\\b", "g"),
      function (m, d) {
        return stencilPrefixForSpecies(d) + "." + speciesToChannelChar(d);
      },
    );

    // Replace species_x, species_y etc with uvwqX.r/uvwq2X.r and uvwqY.r/uvwq2Y.r, etc.
    // Allow for specifying forward or backward difference.
    str = str.replaceAll(
      RegExp("\\b(" + anySpeciesRegexStrs[0] + ")_([xy][fb]?2?)\\b", "g"),
      function (m, d1, d2) {
        if (d2.includes("2")) d2 = d2.slice(0, -1).repeat(2);
        return (
          stencilPrefixForSpecies(d1) +
          d2.toUpperCase() +
          "." +
          speciesToChannelChar(d1)
        );
      },
    );

    // Replace species_xx, species_yy etc with uvwqXX.r/uvwq2XX.r and uvwqYY.r/uvwq2YY.r, etc.
    str = str.replaceAll(
      RegExp("\\b(" + anySpeciesRegexStrs[0] + ")_(xx|yy)\\b", "g"),
      function (m, d1, d2) {
        return (
          stencilPrefixForSpecies(d1) +
          d2.toUpperCase() +
          "." +
          speciesToChannelChar(d1)
        );
      },
    );

    // Replace images with function-evaluation notation, e.g. I_T -> I_T(x,y).
    str = str.replaceAll(/\b(I_[ST][RBGA]?\b)\s*(?!\()/g, "$1(x,y) ");

    // Replace images evaluated at coordinates with appropriate shader expressions.
    str = enableImageLookupInShader(str);

    // Replace integers with floats.
    while (
      str != (str = str.replace(/([^.0-9a-zA-Z_])(\d+)([^.0-9])/g, "$1$2.$3"))
    );

    // Look for scientific notation and remove the "." from the exponent.
    str = str.replaceAll(/([\d.])[eE]([+-]?\d+)\./g, "$1e$2");

    // Replace 'ind' with 'float' to cast the argument as a float.
    str = str.replaceAll(/\bind\b/g, "float");

    // Insert MINX and MINY.
    str = replaceMINXMINY(str);

    return str;
  }

  function replaceBinOperator(str, op, form) {
    // Take a string and replace all instances of op with form,
    // matching balanced brackets.
    const needsEscaping = "^*".includes(op);
    if (str.indexOf(op) > -1) {
      let tab = [];
      let joker = "___joker___";
      while (str.indexOf("(") > -1) {
        str = str.replace(/(\([^\(\)]*\))/g, function (m, t) {
          tab.push(t);
          return joker + (tab.length - 1);
        });
      }

      tab.push(str);
      str = joker + (tab.length - 1);
      let regex;
      if (needsEscaping) {
        regex = new RegExp("([\\w.]*)\\s*\\" + op + "\\s*([\\w.]*)", "g");
      } else {
        regex = new RegExp("([\\w.]*)\\s*" + op + "\\s*([\\w.]*)", "g");
      }
      while (str.indexOf(joker) > -1) {
        str = str.replace(new RegExp(joker + "(\\w+)", "g"), function (m, d) {
          return tab[d] ? tab[d].replace(regex, form) : "";
        });
      }
    }
    return str;
  }

  /**
   * Builds the Neumann/Ghost/Dirichlet/Robin shader blocks and edge-clamp flags for a given
   * list of (0-based) species indices, mirroring setRDEquations()'s own group-0 blocks
   * (which remain untouched, literal code) exactly - same conditions, same order, same
   * helper functions (robinUpdateShader/ghostUpdateShader/dirichletUpdateShader/
   * parseRobinRHS/parseDirichletRHS, all already index-generic). Used for species 5-8
   * (group 1) so group 0's already-correct, byte-for-byte-preserved blocks don't need to be
   * touched or risk being altered by a shared/generalized loop.
   * @param {number[]} indices - 0-based species indices to build BCs for (e.g. [4,5,6,7]).
   * @returns {{neumannShader: string, ghostShader: string, dirichletShader: string, robinShader: string, edgeClampSpeciesH: Object<number,boolean>, edgeClampSpeciesV: Object<number,boolean>}}
   */
  function buildBCShadersForIndices(indices) {
    const BCStrs = indices.map((i) => options["boundaryConditions_" + (i + 1)]);
    const NStrs = indices.map((i) => options["neumannStr_" + (i + 1)]);
    const MStrs = indices
      .map((i) => options["comboStr_" + (i + 1)])
      .map((s) => s + ";");
    const DStrs = indices.map((i) => options["dirichletStr_" + (i + 1)]);
    const RStrs = indices.map((i) => options["robinStr_" + (i + 1)]);

    let neumannShader = "";
    let ghostShader = "";
    let dirichletShader = "";
    let robinShader = "";
    const edgeClampSpeciesH = {};
    const edgeClampSpeciesV = {};
    indices.forEach((i) => {
      edgeClampSpeciesH[i] = false;
      edgeClampSpeciesV[i] = false;
    });

    // Neumann (a special case of Robin).
    BCStrs.forEach(function (str, localInd) {
      const ind = indices[localInd];
      if (str == "neumann") {
        edgeClampSpeciesH[ind] = true;
        edgeClampSpeciesV[ind] = true;
        neumannShader += parseRobinRHS(NStrs[localInd], listOfSpecies[ind]);
        if (!options.domainViaIndicatorFun) {
          neumannShader += robinUpdateShader(ind);
        } else {
          neumannShader += robinUpdateShaderCustomDomain(ind);
        }
      } else if (str == "combo") {
        [
          ...MStrs[localInd].matchAll(
            /(Left|Right|Top|Bottom)\s*:\s*Neumann\s*=([^;]*);/gi,
          ),
        ].forEach(function (m) {
          const side = m[1][0].toUpperCase();
          neumannShader += parseRobinRHS(m[2], listOfSpecies[ind], side);
          neumannShader += robinUpdateShader(ind, side);
          if (["L", "R"].includes(side)) edgeClampSpeciesH[ind] = true;
          if (["T", "B"].includes(side)) edgeClampSpeciesV[ind] = true;
        });
      }
    });

    // Ghost.
    BCStrs.forEach(function (str, localInd) {
      const ind = indices[localInd];
      if (str == "combo") {
        [
          ...MStrs[localInd].matchAll(
            /(Left|Right|Top|Bottom)\s*:\s*Ghost\s*=([^;]*);/gi,
          ),
        ].forEach(function (m) {
          const side = m[1][0].toUpperCase();
          ghostShader += ghostUpdateShader(ind, side, parseShaderString(m[2]));
          if (["L", "R"].includes(side)) edgeClampSpeciesH[ind] = true;
          if (["T", "B"].includes(side)) edgeClampSpeciesV[ind] = true;
        });
      }
    });

    // Dirichlet.
    BCStrs.forEach(function (str, localInd) {
      const ind = indices[localInd];
      if (str == "dirichlet") {
        edgeClampSpeciesH[ind] = true;
        edgeClampSpeciesV[ind] = true;
        if (!options.domainViaIndicatorFun) {
          dirichletShader += parseDirichletRHS(
            DStrs[localInd],
            listOfSpecies[ind],
          );
          dirichletShader += dirichletUpdateShader(ind);
        } else {
          let baseStr = RDShaderDirichletIndicatorFun().replace(
            /indicatorFun/g,
            parseShaderString(getModifiedDomainIndicatorFun()),
          );
          dirichletShader +=
            selectSpeciesInShaderStr(baseStr, listOfSpecies[ind]) +
            parseShaderString(DStrs[localInd]) +
            ";\n}\n";
        }
      } else if (str == "combo") {
        [
          ...MStrs[localInd].matchAll(
            /(Left|Right|Top|Bottom)\s*:\s*Dirichlet\s*=([^;]*);/gi,
          ),
        ].forEach(function (m) {
          const side = m[1][0].toUpperCase();
          dirichletShader += parseDirichletRHS(m[2], listOfSpecies[ind], side);
          dirichletShader += dirichletUpdateShader(ind, side);
          if (["L", "R"].includes(side)) edgeClampSpeciesH[ind] = true;
          if (["T", "B"].includes(side)) edgeClampSpeciesV[ind] = true;
        });
      } else if (options.domainViaIndicatorFun) {
        // Zero-out anything outside of the domain if we're using an indicator function.
        let baseStr = RDShaderDirichletIndicatorFun().replace(
          /indicatorFun/g,
          parseShaderString(getModifiedDomainIndicatorFun()),
        );
        dirichletShader +=
          selectSpeciesInShaderStr(baseStr, listOfSpecies[ind]) +
          "0.0" +
          ";\n}\n";
      }
    });

    // Robin.
    BCStrs.forEach(function (str, localInd) {
      const ind = indices[localInd];
      if (str == "robin") {
        edgeClampSpeciesH[ind] = true;
        edgeClampSpeciesV[ind] = true;
        robinShader += parseRobinRHS(RStrs[localInd], listOfSpecies[ind]);
        if (!options.domainViaIndicatorFun) {
          robinShader += robinUpdateShader(ind);
        } else {
          robinShader += robinUpdateShaderCustomDomain(ind);
        }
      } else if (str == "combo") {
        [
          ...MStrs[localInd].matchAll(
            /(Left|Right|Top|Bottom)\s*:\s*Robin\s*=([^;]*);/gi,
          ),
        ].forEach(function (m) {
          const side = m[1][0].toUpperCase();
          robinShader += parseRobinRHS(m[2], listOfSpecies[ind], side);
          robinShader += robinUpdateShader(ind, side);
          if (["L", "R"].includes(side)) edgeClampSpeciesH[ind] = true;
          if (["T", "B"].includes(side)) edgeClampSpeciesV[ind] = true;
        });
      }
    });

    return {
      neumannShader,
      ghostShader,
      dirichletShader,
      robinShader,
      edgeClampSpeciesH,
      edgeClampSpeciesV,
    };
  }

  function setRDEquations() {
    // Must run before anything below that could reference an Int(...) expression - see
    // reconcileGlobalIntegrals().
    reconcileGlobalIntegrals();
    let neumannShader = "";
    let ghostShader = "";
    let dirichletShader = "";
    let robinShader = "";
    let diffusionShader = "";
    let algebraicShader = "";
    let clampShader = "";

    let edgeClampSpeciesH = [false, false, false, false];
    let edgeClampSpeciesV = [false, false, false, false];

    // Initially set all simulation textures to repeat wrapping for periodicity.
    simTextures.forEach((simTex) => {
      simTex.texture.wrapS = THREE.RepeatWrapping;
      simTex.texture.wrapT = THREE.RepeatWrapping;
    });

    const BCStrs = [
      options.boundaryConditions_1,
      options.boundaryConditions_2,
      options.boundaryConditions_3,
      options.boundaryConditions_4,
    ];
    const NStrs = [
      options.neumannStr_1,
      options.neumannStr_2,
      options.neumannStr_3,
      options.neumannStr_4,
    ];
    const MStrs = [
      options.comboStr_1,
      options.comboStr_2,
      options.comboStr_3,
      options.comboStr_4,
    ].map((s) => s + ";");
    const DStrs = [
      options.dirichletStr_1,
      options.dirichletStr_2,
      options.dirichletStr_3,
      options.dirichletStr_4,
    ];
    const RStrs = [
      options.robinStr_1,
      options.robinStr_2,
      options.robinStr_3,
      options.robinStr_4,
    ];

    // Create a Neumann shader block for each species separately, which is just a special case of Robin.
    BCStrs.forEach(function (str, ind) {
      if (str == "neumann") {
        edgeClampSpeciesH[ind] = true;
        edgeClampSpeciesV[ind] = true;
        neumannShader += parseRobinRHS(NStrs[ind], listOfSpecies[ind]);
        if (!options.domainViaIndicatorFun) {
          neumannShader += robinUpdateShader(ind);
        } else {
          neumannShader += robinUpdateShaderCustomDomain(ind);
        }
      } else if (str == "combo") {
        [
          ...MStrs[ind].matchAll(
            /(Left|Right|Top|Bottom)\s*:\s*Neumann\s*=([^;]*);/gi,
          ),
        ].forEach(function (m) {
          const side = m[1][0].toUpperCase();
          neumannShader += parseRobinRHS(m[2], listOfSpecies[ind], side);
          neumannShader += robinUpdateShader(ind, side);
          if (["L", "R"].includes(side)) edgeClampSpeciesH[ind] = true;
          if (["T", "B"].includes(side)) edgeClampSpeciesV[ind] = true;
        });
      }
    });

    // Create a Ghost shader block for each species separately.
    BCStrs.forEach(function (str, ind) {
      if (str == "combo") {
        [
          ...MStrs[ind].matchAll(
            /(Left|Right|Top|Bottom)\s*:\s*Ghost\s*=([^;]*);/gi,
          ),
        ].forEach(function (m) {
          const side = m[1][0].toUpperCase();
          ghostShader += ghostUpdateShader(ind, side, parseShaderString(m[2]));
          if (["L", "R"].includes(side)) edgeClampSpeciesH[ind] = true;
          if (["T", "B"].includes(side)) edgeClampSpeciesV[ind] = true;
        });
      }
    });

    // Create Dirichlet shaders.
    BCStrs.forEach(function (str, ind) {
      if (str == "dirichlet") {
        edgeClampSpeciesH[ind] = true;
        edgeClampSpeciesV[ind] = true;
        if (!options.domainViaIndicatorFun) {
          dirichletShader += parseDirichletRHS(DStrs[ind], listOfSpecies[ind]);
          dirichletShader += dirichletUpdateShader(ind);
        } else {
          let baseStr = RDShaderDirichletIndicatorFun().replace(
            /indicatorFun/g,
            parseShaderString(getModifiedDomainIndicatorFun()),
          );
          dirichletShader +=
            selectSpeciesInShaderStr(baseStr, listOfSpecies[ind]) +
            parseShaderString(DStrs[ind]) +
            ";\n}\n";
        }
      } else if (str == "combo") {
        [
          ...MStrs[ind].matchAll(
            /(Left|Right|Top|Bottom)\s*:\s*Dirichlet\s*=([^;]*);/gi,
          ),
        ].forEach(function (m) {
          const side = m[1][0].toUpperCase();
          dirichletShader += parseDirichletRHS(m[2], listOfSpecies[ind], side);
          dirichletShader += dirichletUpdateShader(ind, side);
          if (["L", "R"].includes(side)) edgeClampSpeciesH[ind] = true;
          if (["T", "B"].includes(side)) edgeClampSpeciesV[ind] = true;
        });
      } else if (options.domainViaIndicatorFun) {
        // Zero-out anything outside of the domain if we're using an indicator function.
        let baseStr = RDShaderDirichletIndicatorFun().replace(
          /indicatorFun/g,
          parseShaderString(getModifiedDomainIndicatorFun()),
        );
        dirichletShader +=
          selectSpeciesInShaderStr(baseStr, listOfSpecies[ind]) +
          "0.0" +
          ";\n}\n";
      }
    });

    // Create a Robin shader block for each species separately.
    BCStrs.forEach(function (str, ind) {
      if (str == "robin") {
        edgeClampSpeciesH[ind] = true;
        edgeClampSpeciesV[ind] = true;
        robinShader += parseRobinRHS(RStrs[ind], listOfSpecies[ind]);
        if (!options.domainViaIndicatorFun) {
          robinShader += robinUpdateShader(ind);
        } else {
          robinShader += robinUpdateShaderCustomDomain(ind);
        }
      } else if (str == "combo") {
        [
          ...MStrs[ind].matchAll(
            /(Left|Right|Top|Bottom)\s*:\s*Robin\s*=([^;]*);/gi,
          ),
        ].forEach(function (m) {
          const side = m[1][0].toUpperCase();
          robinShader += parseRobinRHS(m[2], listOfSpecies[ind], side);
          robinShader += robinUpdateShader(ind, side);
          if (["L", "R"].includes(side)) edgeClampSpeciesH[ind] = true;
          if (["T", "B"].includes(side)) edgeClampSpeciesV[ind] = true;
        });
      }
    });

    // Insert any user-defined kinetic parameters, given as a string that needs parsing.
    // Extract variable definitions, separated by semicolons or commas, ignoring whitespace.
    // We'll inject this shader string before any boundary conditions etc, so that these params
    // are also available in BCs.
    let kineticStr = kineticUniformsForShader();

    // Choose what sort of update we are doing: normal, or cross-diffusion enabled?
    // RDShaderUpdateNormal/RDShaderUpdateCross build group 0's (species 1-4 only) RHS -
    // BCStrs/NStrs/DStrs/MStrs/edgeClampSpeciesH/V above are already hardcoded to species
    // 1-4 for the same reason. Cap at 4 (found during the Stage 11 audit of the 8-species
    // upgrade): passing the raw, uncapped numSpecies here left their trailing
    // switch(numSpecies){case 1..4} unmatched for numSpecies 5-8, so `result` (an `out`
    // parameter of computeRHS) was never assigned. This diffusionShader/middle/bot is only
    // ever assigned to a material when numGroups===1 (see the isMRT branch below, which uses
    // middleMRT/botMRT instead for every scheme once numGroups>1) - the cap keeps this
    // branch's generated text well-formed regardless of numSpecies even though it's unused
    // in that case.
    const numSpeciesGroup0 = Math.min(Number(options.numSpecies), 4);
    diffusionShader = parseNormalDiffusionStrings() + "\n";
    if (options.crossDiffusion) {
      diffusionShader +=
        parseCrossDiffusionStrings() +
        "\n" +
        RDShaderUpdateCross(numSpeciesGroup0);
    } else {
      diffusionShader += RDShaderUpdateNormal(numSpeciesGroup0);
    }

    // If 2 or more variables are algebraic, check that we don't have any cyclic dependencies.
    if (options.numAlgebraicSpecies >= 2 && !options.automataMode) {
      const start = options.numSpecies - options.numAlgebraicSpecies;
      // Check what each algebraic species depends on.
      let allDependencies = {};
      for (let ind = start; ind < options.numSpecies; ind++) {
        let dependencies = [];
        let strToTest = options["reactionStr_" + (ind + 1).toString()];
        for (let specInd = start; specInd < options.numSpecies; specInd++) {
          strToTest = [
            strToTest,
            options[
              "diffusionStr_" +
                (ind + 1).toString() +
                "_" +
                (specInd + 1).toString()
            ],
          ].join(" ");
        }
        for (let specInd = start; specInd < options.numSpecies; specInd++) {
          let regex = new RegExp(
            "\\b" +
              listOfSpecies[specInd] +
              "(_(x|xb|xf|xb2|xf2|xx|y|yb|yf|yb2|yf2|yy))?\\b",
          );
          if (
            regex.test(strToTest) ||
            options[
              "diffusionStr_" +
                (ind + 1).toString() +
                "_" +
                (specInd + 1).toString()
            ] != "0"
          ) {
            dependencies.push(listOfSpecies[specInd]);
          }
        }
        if (dependencies != [])
          allDependencies[listOfSpecies[ind]] = dependencies;
      }
      // Now we have all the dependencies, check if we have any loops.
      let doneDict = {};
      let stack = [];
      let badNames = [];
      for (let name of listOfSpecies.slice(start, options.numSpecies)) {
        checkForCyclicDependencies(
          name,
          doneDict,
          stack,
          allDependencies,
          badNames,
        );
      }
      if (badNames.length > 0) {
        throwError(
          "Cyclic variables detected. Please check the definition(s) of " +
            badNames.join(", ") +
            ". Click <a href='/user-guide/FAQ#cyclic' target='blank'>here</a> for more information.",
        );
        return;
      }
    }

    // If v should be algebraic, append this to the normal update shader. Algebraic species no
    // longer require cross diffusion (relaxed - previously this was gated on
    // options.crossDiffusion purely to limit the equationTEX display's combinatorics, not for
    // any numerical reason: RHS.SPECIES already includes whatever diffusion/reaction terms
    // are actually defined regardless of cross diffusion, and configureOptions() always zeros
    // an algebraic species' own self-diffusion anyway).
    if (algebraicV) {
      algebraicShader += selectSpeciesInShaderStr(
        RDShaderAlgebraicSpecies(),
        listOfSpecies[1],
      );
    }

    // If w should be algebraic, append this to the normal update shader.
    if (algebraicW) {
      algebraicShader += selectSpeciesInShaderStr(
        RDShaderAlgebraicSpecies(),
        listOfSpecies[2],
      );
    }

    // If q should be algebraic, append this to the normal update shader.
    if (algebraicQ) {
      algebraicShader += selectSpeciesInShaderStr(
        RDShaderAlgebraicSpecies(),
        listOfSpecies[3],
      );
    }

    // Iff the user has entered u_x, u_y etc in a diffusion coefficient, it will be present in
    // the update shader as uvwxy[XY].[rgba] (group 0) or uvwq2[XY].[rgba] (group 1, species
    // 5-8 - there's no uvwq2X/uvwq2XX declared anywhere, so this must be caught here rather
    // than left to fail as an undeclared-variable shader compile error).
    // If they've done this, warn them and don't update the shader.
    let match = diffusionShader.match(/\buvwq2?[XY]\.[rgba]\b/);
    if (match) {
      throwError(
        "Including derivatives in the diffusion coefficients is not supported. Try casting your PDE in another form.",
      );
      return;
    }

    // Edge clamp all the simulation textures if every species needs clamping.
    if (edgeClampSpeciesH.every((x) => x)) {
      simTextures.forEach((simTex) => {
        simTex.texture.wrapS = THREE.ClampToEdgeWrapping;
      });
    } else {
      // If only some species need clamping, we'll do it in the shader.
      let channels = "";
      edgeClampSpeciesH.forEach((x, ind) => {
        if (x) channels += speciesToChannelChar(listOfSpecies[ind]);
      });
      clampShader += channels
        ? clampSpeciesToEdgeShader("H").replaceAll(/\bSPECIES\b/g, channels)
        : "";
    }
    if (edgeClampSpeciesV.every((x) => x)) {
      simTextures.forEach((simTex) => {
        simTex.texture.wrapT = THREE.ClampToEdgeWrapping;
      });
    } else {
      let channels = "";
      edgeClampSpeciesV.forEach((x, ind) => {
        if (x) channels += speciesToChannelChar(listOfSpecies[ind]);
      });
      clampShader += channels
        ? clampSpeciesToEdgeShader("V").replaceAll(/\bSPECIES\b/g, channels)
        : "";
    }

    // Using the constructed shader parts, we'll form fragment shaders for every possible timestepping scheme.
    let middle = [
      clampShader,
      RDShaderAdvectionPreBC(),
      RDShaderDiffusionPreBC(),
      neumannShader,
      ghostShader,
      robinShader,
      RDShaderAdvectionPostBC(),
      RDShaderDiffusionPostBC(),
      parseReactionStrings(),
      diffusionShader,
    ].join(" ");
    let containsRAND = /\bRAND\b/.test(middle) || /\bRANDVAL\b/.test(middle);
    let containsRANDN = /\b(RANDN|RANDNTWO|RANDNTHREE|RANDNFOUR)\b/.test(
      middle,
    );
    if (containsRAND) {
      middle = randShader() + middle;
    }
    if (containsRANDN) {
      middle = randNShader() + middle;
    }
    shaderContainsRAND = containsRAND || containsRANDN;
    shaderContainsGlobalIntegral = /\bglobalIntegralValue[1-4]\b/.test(middle);
    let bot = [dirichletShader, algebraicShader, RDShaderBot()].join(" ");

    // MRT (>4-species) path, used by every timestepping scheme once numGroups>1 (Stage 13 of
    // the 8-species upgrade extended this from Forward-Euler-only to all 8 scheme
    // materials). Built as an entirely separate diffusionShader/middle/bot from the ones
    // above: RDShaderUpdateNormalMRT/RDShaderUpdateCrossMRT close a computeRHS with a
    // doubled signature (18 stencil args, result0/result1) that's incompatible with the
    // legacy single-group signature `middle`/`bot` above are built around - and `middle`/
    // `bot` above must stay exactly as they are, since every scheme still uses them
    // unchanged whenever numGroups===1. middleMRT/botMRT below are scheme-agnostic (the
    // scheme only affects RDShaderTopMRT(type)/RDShaderMainMRT(type), assembled below) -
    // parseReactionStrings()/parseNormalDiffusionStrings()/parseCrossDiffusionStrings()
    // already include species 5-8 and cross-group terms unconditionally (generalized
    // earlier in this stage), so they're reused here as-is - only the final
    // "close computeRHS"/shader-wrapper functions differ.
    let middleMRT, botMRT;
    if (numGroups(Number(options.numSpecies)) > 1) {
      let diffusionShaderMRT = parseNormalDiffusionStrings() + "\n";
      if (options.crossDiffusion) {
        diffusionShaderMRT +=
          parseCrossDiffusionStrings() +
          "\n" +
          RDShaderUpdateCrossMRT(Number(options.numSpecies));
      } else {
        diffusionShaderMRT += RDShaderUpdateNormalMRT(
          Number(options.numSpecies),
        );
      }

      // Group 1 (species 5-8) BCs: mirrors the group-0 blocks above exactly, via
      // buildBCShadersForIndices (factored out so group 0's blocks don't need touching).
      // All 4 slots are always processed regardless of exact numSpecies (5-8), matching the
      // group-0 pattern of always processing all 4 slots regardless of numSpecies<=4.
      const bcGroup1 = buildBCShadersForIndices([4, 5, 6, 7]);

      // Group 1 edge-clamping: always via the shader (clampSpeciesToEdgeShader,
      // groupified to route to uvwq2), never via mutating mrtSimTextures' wrapping mode -
      // unlike group 0's optimization of clamping the whole texture when every species
      // needs it. This is a deliberate, documented simplification (correct, just not
      // maximally optimized) rather than entangling this stage with Stage 3/8's
      // render-target lifecycle further.
      let clampShaderGroup1 = "";
      let channelsHGroup1 = "";
      [4, 5, 6, 7].forEach((ind) => {
        if (bcGroup1.edgeClampSpeciesH[ind])
          channelsHGroup1 += speciesToChannelChar(listOfSpecies[ind]);
      });
      if (channelsHGroup1) {
        clampShaderGroup1 += groupifyShaderStr(
          clampSpeciesToEdgeShader("H"),
          1,
        ).replaceAll(/\bSPECIES\b/g, channelsHGroup1);
      }
      let channelsVGroup1 = "";
      [4, 5, 6, 7].forEach((ind) => {
        if (bcGroup1.edgeClampSpeciesV[ind])
          channelsVGroup1 += speciesToChannelChar(listOfSpecies[ind]);
      });
      if (channelsVGroup1) {
        clampShaderGroup1 += groupifyShaderStr(
          clampSpeciesToEdgeShader("V"),
          1,
        ).replaceAll(/\bSPECIES\b/g, channelsVGroup1);
      }

      // Group 1 algebraic species: mirrors the 3 hardcoded algebraicV/W/Q blocks above,
      // generalized into a loop over algebraicSpeciesFlags (species 1-4 keep using the
      // existing blocks/booleans, untouched). No longer gated on crossDiffusion - see the
      // algebraicV block above for why.
      let algebraicShaderGroup1 = "";
      for (let s = 4; s < 8; s++) {
        if (algebraicSpeciesFlags[s]) {
          algebraicShaderGroup1 += selectSpeciesInShaderStr(
            RDShaderAlgebraicSpecies(),
            listOfSpecies[s],
          );
        }
      }

      middleMRT = [
        clampShader,
        clampShaderGroup1,
        RDShaderAdvectionPreBC(),
        RDShaderDiffusionPreBC(),
        neumannShader,
        bcGroup1.neumannShader,
        ghostShader,
        bcGroup1.ghostShader,
        robinShader,
        bcGroup1.robinShader,
        RDShaderAdvectionPostBC(),
        RDShaderDiffusionPostBC(),
        parseReactionStrings(),
        diffusionShaderMRT,
      ].join(" ");
      // Reuse the RAND/RANDN detection already done for `middle` above, rather than
      // redoing it: parseReactionStrings()'s output (the only place WhiteNoise/RAND could
      // come from) is identical whether it ends up embedded in `middle` or `middleMRT`.
      if (containsRAND) middleMRT = randShader() + middleMRT;
      if (containsRANDN) middleMRT = randNShader() + middleMRT;
      botMRT = [
        dirichletShader,
        bcGroup1.dirichletShader,
        algebraicShader,
        algebraicShaderGroup1,
        RDShaderBotMRT(),
      ].join(" ");
    }

    // Build every timestepping scheme's material (AB2/Mid/RK4's MRT support added when the
    // 8-species upgrade's Stage 13 sketch was implemented - previously only "FE" had an MRT
    // branch here, with the rest always built from the non-MRT middle/bot regardless of
    // numGroups, and Stage 9's dropdown guard prevented them from ever being selected above
    // 4 species). middleMRT/botMRT (built above) are already scheme-agnostic - only
    // RDShaderTopMRT(type)/RDShaderMainMRT(type) vary per scheme.
    const isMRT = numGroups(Number(options.numSpecies)) > 1;
    ["FE", "AB2", "Mid1", "Mid2", "RK41", "RK42", "RK43", "RK44"].forEach(
      (type) => {
        if (isMRT) {
          assignFragmentShader(
            simMaterials[type],
            replaceMINXMINY(
              [
                kineticStr,
                RDShaderTopMRT(type),
                middleMRT,
                insertRates(RDShaderMainMRT(type)),
                botMRT,
              ].join(" "),
            ),
          );
          simMaterials[type].glslVersion = THREE.GLSL3;
        } else {
          assignFragmentShader(
            simMaterials[type],
            replaceMINXMINY(
              [
                kineticStr,
                RDShaderTop(type),
                middle,
                insertRates(RDShaderMain(type)),
                bot,
              ].join(" "),
            ),
          );
          simMaterials[type].glslVersion = null;
        }
      },
    );

    Object.keys(simMaterials).forEach(
      (key) => (simMaterials[key].needsUpdate = true),
    );

    // We will use a shader to enforce Dirichlet BCs before each timestep, but only if some Dirichlet
    // BCs have been specified.
    checkForAnyDirichletBCs();
    if (anyDirichletBCs) {
      if (numGroups(Number(options.numSpecies)) > 1) {
        // MRT (>4-species) path (Stage 11.5 of the 8-species upgrade): built as an entirely
        // separate dirichletShader from the one below (rather than sharing partial state) so
        // that branch stays provably byte-for-byte unchanged. Loops over all 8 species
        // directly via options["...Str_" + i] (BCStrs/DStrs/MStrs above are species-1-4-only
        // by design, matching RDShaderUpdateNormal/Cross's group-0 scope) - previously,
        // Dirichlet BCs had no effect at all once numSpecies>4: enforceDirichlet() only ever
        // touched the unused (once numGroups>1) simTextures, and this shader's content never
        // even attempted to include species 5-8's terms.
        dirichletShader = kineticStr + RDShaderEnforceDirichletTopMRT();
        if (options.domainViaIndicatorFun) {
          let str = RDShaderDirichletIndicatorFun().replace(
            /indicatorFun/,
            parseShaderString(getModifiedDomainIndicatorFun()),
          );
          for (let ind = 0; ind < MAX_SPECIES_SUPPORTED; ind++) {
            const D = options["dirichletStr_" + (ind + 1)];
            if (options["boundaryConditions_" + (ind + 1)] == "dirichlet") {
              dirichletShader +=
                selectSpeciesInShaderStr(str, listOfSpecies[ind]) +
                parseShaderString(D) +
                ";\n}\n";
            } else {
              dirichletShader +=
                selectSpeciesInShaderStr(str, listOfSpecies[ind]) +
                "0.0" +
                ";\n}\n";
            }
          }
        } else {
          for (let ind = 0; ind < MAX_SPECIES_SUPPORTED; ind++) {
            const bcStr = options["boundaryConditions_" + (ind + 1)];
            if (bcStr == "dirichlet") {
              dirichletShader += parseDirichletRHS(
                options["dirichletStr_" + (ind + 1)],
                listOfSpecies[ind],
              );
              dirichletShader += dirichletEnforceShaderMRT(ind);
            } else if (bcStr == "combo") {
              [
                ...(options["comboStr_" + (ind + 1)] + ";").matchAll(
                  /(Left|Right|Top|Bottom)\s*:\s*Dirichlet\s*=([^;]*);/gi,
                ),
              ].forEach(function (m) {
                const side = m[1][0].toUpperCase();
                dirichletShader += parseDirichletRHS(
                  m[2],
                  listOfSpecies[ind],
                  side,
                );
                dirichletShader += dirichletEnforceShaderMRT(ind, side);
              });
            }
          }
        }
        dirichletShader += RDShaderEnforceDirichletBotMRT();
        dirichletShader = replaceMINXMINY(dirichletShader);
        assignFragmentShader(dirichletMaterial, dirichletShader);
        dirichletMaterial.glslVersion = THREE.GLSL3;
      } else {
        dirichletShader = kineticStr + RDShaderEnforceDirichletTop();
        if (options.domainViaIndicatorFun) {
          let str = RDShaderDirichletIndicatorFun()
            .replace(
              /indicatorFun/,
              parseShaderString(getModifiedDomainIndicatorFun()),
            )
            .replace(/updated/, "gl_FragColor");
          DStrs.forEach(function (D, ind) {
            if (BCStrs[ind] == "dirichlet") {
              dirichletShader +=
                selectSpeciesInShaderStr(str, listOfSpecies[ind]) +
                parseShaderString(D) +
                ";\n}\n";
            } else {
              dirichletShader +=
                selectSpeciesInShaderStr(str, listOfSpecies[ind]) +
                "0.0" +
                ";\n}\n";
            }
          });
        } else {
          BCStrs.forEach(function (str, ind) {
            if (str == "dirichlet") {
              dirichletShader += parseDirichletRHS(
                DStrs[ind],
                listOfSpecies[ind],
              );
              dirichletShader += dirichletEnforceShader(ind);
            } else if (str == "combo") {
              [
                ...MStrs[ind].matchAll(
                  /(Left|Right|Top|Bottom)\s*:\s*Dirichlet\s*=([^;]*);/gi,
                ),
              ].forEach(function (m) {
                const side = m[1][0].toUpperCase();
                dirichletShader += parseDirichletRHS(
                  m[2],
                  listOfSpecies[ind],
                  side,
                );
                dirichletShader += dirichletEnforceShader(ind, side);
              });
            }
          });
        }
        dirichletShader += "}";
        dirichletShader = replaceMINXMINY(dirichletShader);
        assignFragmentShader(dirichletMaterial, dirichletShader);
        dirichletMaterial.glslVersion = null;
      }
      dirichletMaterial.needsUpdate = true;
    }

    // Every diffusion coefficient controller's onFinishChange calls setRDEquations(), so this
    // is the one shared place that keeps the diffusion matrix popup in sync when a coefficient
    // is instead edited via its usual controller in the left UI (a no-op if the popup's
    // closed, or if a diffusion coefficient wasn't what changed).
    syncDiffusionMatrixGUI();
  }

  function checkForAnyDirichletBCs() {
    // Loops over all 8 species slots (not just numSpecies) to match the existing pattern
    // elsewhere in this file of always checking all slots in a group regardless of how many
    // are officially "active" - harmless since inactive species are always forced to
    // "periodic" by configureOptions(). setRDEquations()/enforceDirichlet() are both now
    // MRT-aware (Stage 11.5 of the 8-species upgrade), so a Dirichlet BC on species 5-8 is
    // correctly enforced once numSpecies>4.
    anyDirichletBCs =
      options.domainViaIndicatorFun ||
      [1, 2, 3, 4, 5, 6, 7, 8].some(
        (i) =>
          options["boundaryConditions_" + i] == "dirichlet" ||
          /Dirichlet/.test(options["comboStr_" + i]),
      );
  }

  function parseRobinRHS(string, species, side) {
    if (side == undefined) {
      // Make a copy for each side.
      return ["L", "R", "T", "B"]
        .map((side) => parseRobinRHS(string, species, side))
        .join("");
    }
    return (
      "float robinRHS" +
      species +
      side +
      " = " +
      parseShaderString(string) +
      ";\n"
    );
  }

  function parseDirichletRHS(string, species, side) {
    if (side == undefined) {
      // Make a copy for each side.
      return ["L", "R", "T", "B"]
        .map((side) => parseDirichletRHS(string, species, side))
        .join("");
    }
    return (
      "float dirichletRHS" +
      species +
      side +
      " = " +
      parseShaderString(string) +
      ";\n"
    );
  }

  function loadPreset(preset, updateView = false, overrideIsLoading = false) {
    // Updates the values stored in options.
    loadOptions({ preset: preset, overrideIsLoading: overrideIsLoading });

    // Maintain compatibility with links/presets that set the deprecated threeD or oneDimensional options.
    if (options.threeD != undefined) {
      if (options.threeD) {
        options.dimension = 2;
        if (options.plotType == undefined) {
          options.plotType = "surface";
        }
      }
      delete options.threeD;
    }
    if (options.oneDimensional != undefined) {
      if (options.oneDimensional) {
        options.dimension = 1;
        options.plotType = "line";
      }
      delete options.oneDimensional;
    }
    // If a default probeFun is specified, set it to the first species.
    if (options.probeFun == "DEFAULT") {
      options.probeFun = listOfSpecies[0];
    }

    // Configure views.
    configureViews();

    // Replace the GUI.
    deleteGUIs();
    initGUI();

    // Apply any specified view.
    if (options.activeViewInd >= options.views.length) {
      // No valid view has been specified, so apply the last view.
      options.activeViewInd = options.views.length - 1;
    }
    // If we should be updating the current view (ie when changing an option via the query string), update the current view before applying it.
    if (updateView) {
      Object.keys(preset).forEach(function (key) {
        if (options.views[options.activeViewInd].hasOwnProperty(key)) {
          options.views[options.activeViewInd][key] = preset[key];
        }
      });
    }
    applyView(options.views[options.activeViewInd], false);

    // Update the equations, setup and GUI in line with new options.
    updateProblem();

    // Trigger a resize, which will refresh all uniforms and set sizes.
    setCanvasShape();
    resize();

    // Update any uniforms.
    updateUniforms();

    // Set the background color.
    scene.background = new THREE.Color(options.backgroundColour);

    // If an initial state has been specified, load it in, which will also reset the simulation.
    if (options.initialState != "") {
      fetch(options.initialState)
        .then((res) => res.blob())
        .then((blob) => loadSimState(blob));
    } else {
      // Reset the state of the simulation using specified ICs.
      resetSim();
    }

    // Set the camera.
    configureCameraAndClicks();

    // To get around an annoying bug in dat.GUI.image, in which the
    // controller doesn't update the value of the underlying property,
    // we'll destroy and create a new image controller everytime we load
    // a preset.
    imControllerOne.remove();
    imControllerTwo.remove();
    imControllerBlend.remove();
    createImageControllers();

    // Configure interpolation.
    configureManualInterpolation();
  }

  function loadOptions({
    preset,
    overrideIsLoading = false,
    isInitialLoad = false,
  } = {}) {
    let newOptions;
    const listOfPresetNames = getListOfPresetNames();
    const listOfPresetNamesLower = listOfPresetNames.map((x) =>
      x.toLowerCase(),
    );
    if (preset == undefined) {
      // If no argument is given, load whatever is set in options.preset.
      newOptions = getPreset(options.preset);
    } else if (typeof preset == "string") {
      // If an argument is given and it's a string, try to load the corresponding preset.
      if (listOfPresetNamesLower.includes(preset.toLowerCase())) {
        newOptions = getPreset(preset);
      } else {
        const closest = closestMatch(preset, listOfPresetNames, false);
        // Display an error if the preset doesn't exist.
        throwPresetError(
          "We couldn't find the preset ‘" +
            preset +
            "’." +
            (closest != null
              ? " We've loaded the closest match, ‘" + closest + "’, instead."
              : "") +
            " Please check the preset name in the URL.",
        );
        // Load the default preset or the closest match.
        newOptions = getPreset(closest ? closest : defaultPreset);
      }
    } else if (typeof preset == "object") {
      // If the argument is an object, then assume it is an options object.
      newOptions = preset;
    } else {
      // Otherwise, fall back to default.
      newOptions = getPreset(defaultPreset);
    }

    // If newOptions specifies a parent, first load the options of the parent.
    if (newOptions.hasOwnProperty("parent") && newOptions.parent != null) {
      loadOptions({ preset: newOptions.parent, isInitialLoad: true });
    }

    // Reset the kinetic parameters.
    kineticParamsCounter = 0;
    kineticParamsLabels = [];
    kineticParamsStrs = {};
    kineticNameToCont = {};

    // Reset the Expressions' "Show" checkbox states too: unlike options.expressions itself,
    // most presets don't specify options.expressionsShow at all (it's fine for it to be
    // absent - see getExpressionNameVals, which treats a short/missing string as "shown"),
    // so without this reset a preset switch could otherwise leave a previous preset's
    // checkbox states (for a different number of expressions) sitting in options past the
    // point where they'd be meaningful. A preset/link that does specify its own
    // expressionsShow (e.g. one generated from getShareableURL) overrides this via the
    // Object.assign below, same as any other option.
    options.expressionsShow = "";

    // Coerce the new options into the correct types.
    coerceOptions(newOptions);

    // Loop through newOptions and overwrite anything already present.
    Object.assign(options, newOptions);

    // Check if the simulation should be running on load.
    isRunning = options.runningOnLoad;

    // Set custom species names and reaction names.
    setCustomNames(overrideIsLoading);
    if (!isInitialLoad) {
      // When doing the initial loading, just keep the species names as-is without doing any pruning.
      // This prevents "u v w q" becoming "u v" on loading the default.
      // Otherwise, trim speciesNames to match numSpecies.
      options.speciesNames = speciesNamesToString();
      setCustomNames(overrideIsLoading);
    }
    // Ensure that the correct play/pause button is showing.
    isRunning ? playSim() : pauseSim();

    // If we're on mobile, replace 'clicking' with 'tapping' in tryClickingText if it exists.
    // Also, make sure that guiUpdatePeriod is at least 3.
    if (onMobile()) {
      options.guiUpdatePeriod = Math.max(options.guiUpdatePeriod, 3);
      options.tryClickingText = options.tryClickingText.replaceAll(
        "clicking",
        "tapping",
      );
    } else {
      options.tryClickingText = options.tryClickingText.replaceAll(
        "tapping",
        "clicking",
      );
    }

    // Enable backwards compatibility.
    options.brushRadius = options.brushRadius.toString();
    if (options.hasOwnProperty("drawIn3D")) {
      options.brushEnabled = options.drawIn3D;
    }
    // Map algebraicV, algebraicW, and algebraicQ onto numAlgebraicSpecies.
    var count = 0;
    count += options.hasOwnProperty("algebraicV");
    count += options.hasOwnProperty("algebraicW");
    count += options.hasOwnProperty("algebraicQ");
    if (count && !options.numAlgebraicSpecies) {
      // If algebraicV,W,Q contain more information than count, then update it.
      options.numAlgebraicSpecies = count;
    }
    // Remove obsolete fields from options.
    delete options.algebraicV;
    delete options.algebraicW;
    delete options.algebraicQ;

    // Set options.timescales = true, as these are now always enabled.
    options.timescales = true;

    // Renaming of U/V/W/Q fields.
    // Map old to new.
    const oldToNewMap = getOldPresetFieldsToNew();
    Object.keys(oldToNewMap).forEach(function (x) {
      if (options.hasOwnProperty(x)) {
        // If there isn't already a property of the new name in newOptions, rename the old field.
        if (!newOptions.hasOwnProperty(oldToNewMap[x])) {
          options[oldToNewMap[x]] = options[x];
        }
        delete options[x];
      }
    });

    // Migrate the old GlobalInt1-GlobalInt4/bare-GlobalInt token syntax to the new inline
    // Int(expression) syntax. options.globalIntExprs itself is deliberately left for the
    // next reconcileGlobalIntegrals() call (triggered by updateProblem() below) to
    // (re)populate from the now-rewritten text, rather than duplicating that assignment
    // logic here.
    migrateGlobalIntSyntax();

    // If min/max colour value is null (happens if we've blown up to +-inf), set them to 0 and 1.
    if (options.minColourValue == null) options.minColourValue = "0";
    if (options.maxColourValue == null) options.maxColourValue = "1";
    // Convert min and max values to strings.
    options.minColourValue = options.minColourValue.toString();
    options.maxColourValue = options.maxColourValue.toString();

    // If options.domainScale is not a string, convert it to one.
    options.domainScale = options.domainScale.toString();
    // If options.spatialStep is not a string, convert it to one.
    options.spatialStep = options.spatialStep.toString();

    // If the probeLength is zero, automatically configure it.
    if (options.probeLength == 0) autoSetProbeLength();

    // Save these loaded options if we ever need to revert.
    savedOptions = JSON.parse(JSON.stringify(options));

    // Update the simulation title if one is provided.
    $("#simTitle").val(
      options.simTitle ? options.simTitle : "Interactive simulation",
    );
    setDocTitle($("#simTitle").val());

    // If Ghost nodes are specified in any comboStr, set showGhostBCs to true.
    if (checkGhostBCs()) {
      options.showGhostBCs = true;
    }

    // If either of the images are used in the simulation, ensure that the simulation resets when the images are
    // actually loaded in.
    let str = [
      options.initCond_1,
      options.initCond_2,
      options.initCond_3,
      options.initCond_4,
      options.domainIndicatorFun,
      options.reactionStr_1,
      options.reactionStr_2,
      options.reactionStr_3,
      options.reactionStr_4,
      options.diffusionStr_1_1,
      options.diffusionStr_1_2,
      options.diffusionStr_1_3,
      options.diffusionStr_1_4,
      options.diffusionStr_2_1,
      options.diffusionStr_2_2,
      options.diffusionStr_2_3,
      options.diffusionStr_2_4,
      options.diffusionStr_3_1,
      options.diffusionStr_3_2,
      options.diffusionStr_3_3,
      options.diffusionStr_3_4,
      options.diffusionStr_4_1,
      options.diffusionStr_4_2,
      options.diffusionStr_4_3,
      options.diffusionStr_4_4,
      options.dirichletStr_1,
      options.dirichletStr_2,
      options.dirichletStr_3,
      options.dirichletStr_4,
      options.robinStr_1,
      options.robinStr_2,
      options.robinStr_3,
      options.robinStr_4,
      options.comboStr_1,
      options.comboStr_2,
      options.comboStr_3,
      options.comboStr_4,
      options.neumannStr_1,
      options.neumannStr_2,
      options.neumannStr_3,
      options.neumannStr_4,
      options.brushValue,
      options.whatToPlot,
    ].join(" ");
    options.resetOnImageLoad = /\bI_[ST][RGBA]?\b/.test(str);
  }

  function refreshGUI(folder, typeset) {
    if (typeset == undefined) {
      typeset = true;
    }
    if (folder != undefined) {
      // Traverse through all the subfolders and recurse.
      for (let subfolderName in folder.__folders) {
        refreshGUI(folder.__folders[subfolderName], false);
      }
      // Update all the controllers at this level.
      for (let i = 0; i < folder.__controllers.length; i++) {
        folder.__controllers[i].updateDisplay();
      }
    }
    // Run MathJax to texify the parameter names (e.g. D_uu) that appear dynamically.
    if (typeset) {
      runMathJax();
    }
  }

  function deleteGUIs() {
    deleteGUI(leftGUI, true);
    deleteGUI(rightGUI, true);
    deleteGUI(viewsGUI, true);
    deleteGUI(comboBCsGUI, true);
  }

  function deleteGUI(folder, topLevel) {
    if (folder != undefined) {
      // Traverse through all the subfolders and recurse.
      for (let subfolderName in folder.__folders) {
        deleteGUI(folder.__folders[subfolderName]);
        try {
          folder.removeFolder(folder.__folders[subfolderName]);
        } catch {}
      }
      // Delete all the controllers at this level.
      for (let i = 0; i < folder.__controllers.length; i++) {
        folder.__controllers[i].remove();
      }
      // If this is the top-level GUI, destroy it.
      if (topLevel != undefined && topLevel) {
        folder.domElement.remove();
        folder.destroy();
      }
    }
  }

  function setGUIControllerName(cont, str, title) {
    if (cont != undefined) {
      cont.name(str);
      if (title != undefined) {
        cont.title(title);
      }
    }
  }

  // Rewrites group-0's hardcoded stencil/output variable names (uvwq, uvwqL/R/T/B/LL/RR/
  // TT/BB, updated, RHS, timescales) to their group-1 counterparts (uvwq2, uvwq2L/R/T/B/
  // LL/RR/TT/BB, updated2, RHS2, timescalesGroup1 - see RDShaderTopMRT/RDShaderMainMRT in
  // simulation_shaders.js, which declare exactly these group-1 locals). A no-op for group
  // 0. Used by selectSpeciesInShaderStr (for BC/algebraic-species templates) and directly
  // for clampSpeciesToEdgeShader's output (which doesn't go through selectSpeciesInShaderStr
  // - it does its own SPECIES substitution).
  function groupifyShaderStr(shaderStr, group) {
    if (group === 0) return shaderStr;
    return shaderStr.replaceAll(
      /\buvwqLL\b|\buvwqRR\b|\buvwqTT\b|\buvwqBB\b|\buvwqL\b|\buvwqR\b|\buvwqT\b|\buvwqB\b|\buvwq\b|\bupdated\b|\bRHS\b|\btimescales\b/g,
      function (m) {
        if (m === "uvwq") return "uvwq2";
        if (m === "updated") return "updated2";
        if (m === "RHS") return "RHS2";
        if (m === "timescales") return "timescalesGroup1";
        // uvwqL/R/T/B/LL/RR/TT/BB: insert "2" right after "uvwq".
        return "uvwq2" + m.slice(4);
      },
    );
  }

  function selectSpeciesInShaderStr(shaderStr, species) {
    // If there are no species, then return an empty string.
    if (species.length == 0) {
      return "";
    }
    let regex = /\bSPECIES\b/g;
    let channel = speciesToChannelChar(species);
    shaderStr = shaderStr.replace(regex, channel);
    regex = /\brobinRHSSPECIES/g;
    shaderStr = shaderStr.replace(regex, "robinRHS" + species);
    regex = /\bdirichletRHSSPECIES/g;
    shaderStr = shaderStr.replace(regex, "dirichletRHS" + species);
    return groupifyShaderStr(shaderStr, speciesToGroupInd(species));
  }

  function speciesToChannelChar(speciesStr) {
    // channelCharOfSpecies takes the species' raw (0-based) index and reduces it mod
    // CHANNELS_PER_GROUP, since each texture group only has 4 channels (r,g,b,a) to reuse
    // across groups. Behaviourally identical to the old direct "rgba"[ind] lookup for
    // ind<4 (numSpecies<=4, a single group); safe for ind up to 7 once numGroups>1.
    return channelCharOfSpecies(speciesToChannelInd(speciesStr));
  }

  function speciesToChannelInd(speciesStr) {
    return listOfSpecies.indexOf(speciesStr);
  }

  // Which texture group (0-based) a species' state lives in. Group 0 is always the
  // existing single-texture ("uvwq") group; group 1+ only exist once numSpecies>4.
  function speciesToGroupInd(speciesStr) {
    return groupOfSpecies(speciesToChannelInd(speciesStr));
  }

  // dat.gui controllers["..."] key for the (i,j) diffusion coefficient (1-based species
  // indices). Species 1-4 keep their legacy hand-declared letter-pair keys (Duu..Dqq); any
  // pair touching species 5-8 (Stage 9 of the upgrade) uses a numeric key, matching
  // diffusionLabel()'s GLSL-token naming convention in species_config.js.
  function diffCtrlKey(i, j) {
    if (i <= 4 && j <= 4) {
      return "D" + defaultSpecies[i - 1] + defaultSpecies[j - 1];
    }
    return "D_" + i + "_" + j;
  }

  // The GLSL stencil-vec4 variable prefix for a species: "uvwq" (group 0, unchanged) or
  // "uvwq2" (group 1, species 5-8) - see RDShaderTopMRT/RDShaderMainMRT in
  // simulation_shaders.js, which declare the uvwq2-prefixed locals this references.
  function stencilPrefixForSpecies(speciesStr) {
    return speciesToGroupInd(speciesStr) === 0 ? "uvwq" : "uvwq2";
  }

  function setBCsGUI() {
    // Update the GUI. Show/hide each species' dirichlet/neumann/robin sub-controls based on
    // its currently selected boundary-condition type.
    const bcsKeys = [];
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      const s = defaultSpecies[i - 1];
      const S = s.toUpperCase();
      bcsKeys.push(s + "BCs");
      const bc = options["boundaryConditions_" + i];
      controllers["dirichlet" + S][bc == "dirichlet" ? "show" : "hide"]();
      controllers["neumann" + S][bc == "neumann" ? "show" : "hide"]();
      controllers["robin" + S][bc == "robin" ? "show" : "hide"]();
    }

    let overrideShowComboStr = true;
    if (options.plotType != "surface") {
      bcsKeys.forEach((str) => {
        controllers[str].domElement
          .getElementsByClassName("combo-bcs")[0]
          .classList.remove("hidden");
      });
      overrideShowComboStr = false;
    }

    // Always hide the combo BCs string.
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      controllers["combo" + defaultSpecies[i - 1].toUpperCase()].hide();
    }

    if (options.showComboStr || overrideShowComboStr) {
      for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
        if (options["boundaryConditions_" + i] == "combo") {
          controllers["combo" + defaultSpecies[i - 1].toUpperCase()].show();
        }
      }
    }

    // If the comboBCsGUI is visible, make all clickAreas visible.
    if (comboBCsOptions.open) {
      revealClickAreas();
    }

    const BCsControllers = bcsKeys.map((key) => controllers[key]);
    if (options.domainViaIndicatorFun) {
      BCsControllers.forEach((cont) => {
        updateGUIDropdown(
          cont,
          ["Dirichlet", "Neumann"],
          ["dirichlet", "neumann"],
        );
        cont.domElement
          .getElementsByClassName("combo-bcs")[0]
          .classList.add("hidden");
      });
    } else {
      BCsControllers.forEach((cont) =>
        updateGUIDropdown(
          cont,
          ["Periodic", "Dirichlet", "Neumann", "Robin", "Mixed..."],
          ["periodic", "dirichlet", "neumann", "robin", "combo"],
        ),
      );
    }
    refreshGUI(leftGUI);
  }

  function updateRandomSeed() {
    // Update the random seed used in the shaders.
    seed = (seed + 123456789) % 1000000000;
    uniforms.seed.value = seed / 1000000;
  }

  function setClearShader() {
    // Must run before anything below that could reference an Int(...) expression - see
    // reconcileGlobalIntegrals().
    reconcileGlobalIntegrals();
    // Insert any user-defined kinetic parameters, as uniforms.
    let kineticStr = kineticUniformsForShader();
    if (numGroups(Number(options.numSpecies)) > 1) {
      // MRT (>4-species) path: separate top/bot (dual output, GLSL3) and species-5-8
      // locals. Kept entirely separate from the numGroups===1 branch below (rather than
      // sharing partial state) so that branch is provably byte-for-byte unchanged.
      let shaderStr = kineticStr + clearShaderTopMRT();
      let allClearShaders = [
        options.initCond_1,
        options.initCond_2,
        options.initCond_3,
        options.initCond_4,
        options.initCond_5,
        options.initCond_6,
        options.initCond_7,
        options.initCond_8,
      ].join(" ");
      if (
        /\bRAND\b/.test(allClearShaders) ||
        /\bRANDVAL\b/.test(allClearShaders)
      ) {
        shaderStr += randShader();
      }
      if (/\bRANDN(_[1234])?\b/.test(allClearShaders)) {
        shaderStr += randNShader();
      }
      shaderStr +=
        "float u = " + parseShaderString(options.initCond_1, false) + ";\n";
      shaderStr +=
        "float v = " + parseShaderString(options.initCond_2, false) + ";\n";
      shaderStr +=
        "float w = " + parseShaderString(options.initCond_3, false) + ";\n";
      shaderStr +=
        "float q = " + parseShaderString(options.initCond_4, false) + ";\n";
      shaderStr +=
        "float u5 = " + parseShaderString(options.initCond_5, false) + ";\n";
      shaderStr +=
        "float u6 = " + parseShaderString(options.initCond_6, false) + ";\n";
      shaderStr +=
        "float u7 = " + parseShaderString(options.initCond_7, false) + ";\n";
      shaderStr +=
        "float u8 = " + parseShaderString(options.initCond_8, false) + ";\n";
      shaderStr += clearShaderBotMRT();
      shaderStr = replaceMINXMINY(shaderStr);
      assignFragmentShader(clearMaterial, shaderStr);
      clearMaterial.glslVersion = THREE.GLSL3;
    } else {
      let shaderStr = kineticStr + clearShaderTop();
      let allClearShaders = [
        options.initCond_1,
        options.initCond_2,
        options.initCond_3,
        options.initCond_4,
      ].join(" ");
      if (
        /\bRAND\b/.test(allClearShaders) ||
        /\bRANDVAL\b/.test(allClearShaders)
      ) {
        shaderStr += randShader();
      }
      if (/\bRANDN(_[1234])?\b/.test(allClearShaders)) {
        shaderStr += randNShader();
      }
      shaderStr +=
        "float u = " + parseShaderString(options.initCond_1, false) + ";\n";
      shaderStr +=
        "float v = " + parseShaderString(options.initCond_2, false) + ";\n";
      shaderStr +=
        "float w = " + parseShaderString(options.initCond_3, false) + ";\n";
      shaderStr +=
        "float q = " + parseShaderString(options.initCond_4, false) + ";\n";
      shaderStr += clearShaderBot();
      shaderStr = replaceMINXMINY(shaderStr);
      assignFragmentShader(clearMaterial, shaderStr);
      clearMaterial.glslVersion = null;
    }
    clearMaterial.needsUpdate = true;
  }

  function setProbeShader() {
    // Must run before anything below that could reference an Int(...) expression - see
    // reconcileGlobalIntegrals().
    reconcileGlobalIntegrals();
    // Insert any user-defined kinetic parameters, as uniforms. probeShaderMRT (>4 species)
    // just adds a second input sampler + group-1 locals so PROBE_FUN can reference species
    // 5-8 - still single-output, so no glslVersion toggle is needed here (unlike the main
    // simulation/clear shaders).
    let shaderStr =
      kineticUniformsForShader() +
      (numGroups(Number(options.numSpecies)) > 1
        ? probeShaderMRT()
        : probeShader());
    shaderStr = replaceMINXMINY(shaderStr);
    // Insert the user-defined location of the probe.
    shaderStr = shaderStr.replace("PROBE_X", parseShaderString(options.probeX));
    shaderStr = shaderStr.replace("PROBE_Y", parseShaderString(options.probeY));
    // Insert the user-defined probe function.
    shaderStr = shaderStr.replace(
      "PROBE_FUN",
      parseShaderString(options.probeFun),
    );
    let replacement = "1";
    if (options.domainViaIndicatorFun) {
      replacement = parseShaderString(getModifiedDomainIndicatorFun());
    }
    shaderStr = shaderStr.replace(/indicatorFun/g, replacement);
    assignFragmentShader(probeMaterial, shaderStr);
    probeMaterial.needsUpdate = true;
  }

  /**
   * Finds every top-level Int(...) call in str, matching balanced brackets so nested
   * parens inside the argument (e.g. Int(u*(v+1))) are handled correctly - mirrors the
   * depth-counting bracket walk in enableImageLookupInShader(). A nested Int(...) call
   * (e.g. Int(Int(u))) isn't a meaningful quantity (Int(u) is already constant over
   * space, so integrating it again is degenerate), so it's rejected via throwError
   * rather than silently resolved.
   *
   * @param {string} str
   * @returns {{start: number, end: number, expr: string}[]} One entry per Int(...) call,
   *   in order of appearance. start/end span the whole "Int(...)" call (end exclusive);
   *   expr is the argument text, canonicalized via canonicalizeIntExpr() so equivalent
   *   expressions that only differ by incidental whitespace compare equal.
   */
  function parseIntCalls(str) {
    const calls = [];
    const regex = /\bInt\s*\(/g;
    let match;
    while ((match = regex.exec(str))) {
      const argStart = match.index + match[0].length;
      let depth = 1;
      let ind = argStart;
      while (ind < str.length && depth > 0) {
        if (str[ind] == "(") depth++;
        else if (str[ind] == ")") depth--;
        ind++;
      }
      if (depth != 0) {
        // Unbalanced brackets - nothing sensible to extract. Leave as-is; general
        // syntax checking elsewhere (isValidSyntax) will already flag this string.
        continue;
      }
      const argStr = str.slice(argStart, ind - 1);
      if (/\bInt\s*\(/.test(argStr)) {
        throwError(
          "Int(...) expressions cannot be nested. Please rewrite your expression so that Int(...) is not used inside another Int(...).",
        );
        // Don't record the nested call - its argument text (literally containing "Int(...)")
        // must never be treated as a real expression to assign a slot to or resolve to a
        // uniform, or the outer Int(...) would end up wired straight to whatever uniform its
        // own (bogus) argument happens to canonicalize to.
        regex.lastIndex = ind;
        continue;
      }
      calls.push({
        start: match.index,
        end: ind,
        expr: canonicalizeIntExpr(argStr),
      });
      regex.lastIndex = ind;
    }
    return calls;
  }

  // Canonicalizes an Int(...) argument for equality comparison, so that e.g. "u*v" and
  // "u * v" (or any other incidental whitespace difference) are recognized as the same
  // expression and share a slot. Used only as a comparison/lookup key (options.globalIntExprs
  // entries, parseShaderString's slot lookup) - never shown to the user or spliced into
  // shader/TeX output, so there's no readability cost to stripping whitespace entirely
  // rather than just collapsing it.
  function canonicalizeIntExpr(str) {
    return str.replace(/\s+/g, "");
  }

  /**
   * Replaces every top-level Int(expression) call in str with replacer(canonicalExpr),
   * using parseIntCalls() to correctly match balanced brackets around each argument (so
   * e.g. Int(u*(v+1)) is replaced as a whole, not split on the inner parens). Mirrors the
   * offset-tracking splice loop in enableImageLookupInShader().
   *
   * @param {string} str
   * @param {(expr: string) => string} replacer
   * @returns {string}
   */
  function replaceIntCalls(str, replacer) {
    let out = str;
    let offset = 0;
    parseIntCalls(str).forEach(({ start, end, expr }) => {
      const replacement = replacer(expr);
      out = replaceStrAtIndex(out, replacement, start + offset, end + offset);
      offset += replacement.length - (end - start);
    });
    return out;
  }

  /**
   * Scans every user-editable expression field for Int(expression) usages and keeps
   * options.globalIntExprs - the stable expression -> globalIntegralValueN slot
   * assignment consumed by parseShaderString/parseStringToTEX/setGlobalIntegralShader -
   * in sync. This is the Int(...) analog of refreshExpressionExpansions() (which plays
   * the same "resolve once per rebuild, report errors via throwError" role for the
   * separate Expressions macro feature).
   *
   * Slot assignment is deliberately stable, not recomputed from scratch: an expression
   * that's still referenced anywhere keeps its existing slot, a freed slot (its
   * expression no longer appears anywhere) is left empty rather than compacting the
   * others down, and a newly-appearing expression takes the lowest free slot. This means
   * adding or removing an unrelated Int(...) elsewhere never renumbers - and hence never
   * forces a shader rebuild for - an existing one.
   *
   * Only ever called from the various shader-rebuild entry points (setRDEquations,
   * setClearShader, setProbeShader, setBrushType, setPostFunFragShader,
   * setDisplayColourAndType, updateShaders) - never from setGlobalIntegralShader()
   * itself, which is this function's own (conditional) output step.
   *
   * @returns {boolean} Whether options.globalIntExprs actually changed - i.e. whether
   *   the integral shader/equation display needed rebuilding.
   */
  function reconcileGlobalIntegrals() {
    const seen = [];
    getUserTextFields().forEach((key) => {
      const text = options[key];
      if (typeof text !== "string") return;
      parseIntCalls(text).forEach(({ expr }) => {
        if (!seen.includes(expr)) seen.push(expr);
      });
    });

    const prev = options.globalIntExprs;
    const next = prev.slice();

    // Free slots whose expression is no longer referenced anywhere - without shifting
    // the remaining slots. That's what gives us stability.
    next.forEach((expr, i) => {
      if (expr != null && !seen.includes(expr)) next[i] = null;
    });

    // Assign newly-appearing expressions to the lowest free slot, in first-appearance order.
    const overflow = [];
    seen.forEach((expr) => {
      if (next.includes(expr)) return;
      const freeInd = next.indexOf(null);
      if (freeInd == -1) {
        overflow.push(expr);
      } else {
        next[freeInd] = expr;
      }
    });

    if (overflow.length > 0) {
      throwError(
        "You can define at most 4 unique Int(...) expressions across your simulation. Please remove one before adding another.",
      );
    }

    const changed = next.some((expr, i) => expr !== prev[i]);
    if (changed) {
      options.globalIntExprs = next;
      setGlobalIntegralShader();
      setEquationDisplayType();
    }
    return changed;
  }

  function setGlobalIntegralShader() {
    // Insert any user-defined kinetic parameters, as uniforms. globalIntegralShaderMRT
    // (>4 species) just adds a second input sampler + group-1 locals so
    // GLOBAL_INTEGRAL_FUN1-4 can reference species 5-8 - still single-output, so no
    // glslVersion toggle is needed here.
    let shaderStr =
      kineticUniformsForShader() +
      (numGroups(Number(options.numSpecies)) > 1
        ? globalIntegralShaderMRT()
        : globalIntegralShader());
    shaderStr = replaceMINXMINY(shaderStr);
    const globalIntegralComponents = options.globalIntExprs.map(
      (expr) => expr || "0",
    );
    for (let i = 1; i <= 4; i++) {
      shaderStr = shaderStr.replace(
        new RegExp("GLOBAL_INTEGRAL_FUN" + i, "g"),
        parseShaderString(globalIntegralComponents[i - 1]),
      );
    }
    let replacement = "1";
    if (options.domainViaIndicatorFun) {
      replacement = parseShaderString(getModifiedDomainIndicatorFun());
    }
    shaderStr = shaderStr.replace(/indicatorFun/g, replacement);
    assignFragmentShader(globalIntegralMaterial, shaderStr);
    globalIntegralMaterial.needsUpdate = true;
  }

  /**
   * One-shot migration, run from loadOptions(), of the old GlobalInt1-GlobalInt4/bare-
   * GlobalInt token syntax (which referred to one of 4 expressions packed into the old
   * options.globalIntegralFun field, "expr1;expr2;expr3;expr4") into the new inline
   * Int(expression) syntax: rewrites every occurrence embedded in any field in
   * getUserTextFields() (and any per-view override of one) into Int(<that slot's old
   * expression>), then deletes options.globalIntegralFun. A no-op if options has no
   * globalIntegralFun field (i.e. nothing old-format to migrate).
   */
  function migrateGlobalIntSyntax() {
    if (!options.hasOwnProperty("globalIntegralFun")) return;
    const oldParts = options.globalIntegralFun.split(";");
    const oldComponents = [0, 1, 2, 3].map((i) => oldParts[i]?.trim() || "0");
    const rewriteOldGlobalIntSyntax = (text) => {
      if (typeof text != "string") return text;
      // Bare GlobalInt means slot 1, for backwards compatibility - matched separately
      // since \bGlobalInt\b doesn't also match GlobalInt1-4 (the trailing digit breaks
      // the word boundary), so the two passes can't double up on the same occurrence.
      let out = text.replaceAll(
        /\bGlobalInt\b/g,
        "Int(" + oldComponents[0] + ")",
      );
      for (let i = 1; i <= 4; i++) {
        out = out.replaceAll(
          new RegExp("\\bGlobalInt" + i + "\\b", "g"),
          "Int(" + oldComponents[i - 1] + ")",
        );
      }
      return out;
    };
    const fieldsToScan = getUserTextFields();
    fieldsToScan.forEach((key) => {
      if (options.hasOwnProperty(key)) {
        options[key] = rewriteOldGlobalIntSyntax(options[key]);
      }
    });
    options.views = (options.views || []).map((view) => {
      const newView = { ...view };
      Object.keys(view).forEach((key) => {
        if (fieldsToScan.includes(key)) {
          newView[key] = rewriteOldGlobalIntSyntax(view[key]);
        }
      });
      return newView;
    });
    delete options.globalIntegralFun;
  }

  function loadImageSourceOne() {
    let image = new Image();
    image.src = imControllerOne.__image.src;
    let texture = new THREE.Texture();
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.image = image;
    image.onload = function () {
      texture.needsUpdate = true;
      uniforms.imageSourceOne.value = texture;
      if (options.resetOnImageLoad) {
        resetSim();
      }
    };
    texture.dispose();
  }

  function loadImageSourceTwo() {
    let image = new Image();
    image.src = imControllerTwo.__image.src;
    let texture = new THREE.Texture();
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.image = image;
    image.onload = function () {
      texture.needsUpdate = true;
      uniforms.imageSourceTwo.value = texture;
      if (options.resetOnImageLoad) {
        resetSim();
      }
    };
    texture.dispose();
  }

  function loadImageSourceBlend() {
    let image = new Image();
    image.src = imControllerBlend.__image.src;
    let texture = new THREE.Texture();
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.image = image;
    image.onload = function () {
      texture.needsUpdate = true;
      uniforms.imageSourceBlend.value = texture;
    };
    texture.dispose();
  }

  function createImageControllers() {
    // This is a bad solution to a problem that shouldn't exist.
    // The image controller does not modify the value that you assign to it, and doesn't respond to it being changed.
    // Hence, we create a function used solely to create the controller, which we'll do everytime a preset is loaded.
    root = fIm;
    imControllerOne = root
      .addImage(options, "imagePathOne")
      .name("$I_S(x,y)$")
      .onChange(loadImageSourceOne);
    imControllerTwo = root
      .addImage(options, "imagePathTwo")
      .name("$I_T(x,y)$")
      .onChange(loadImageSourceTwo);
    root = devFolder;
    imControllerBlend = root
      .addImage(options, "blendImagePath")
      .name("To blend")
      .onChange(loadImageSourceBlend);
    runMathJax();
  }

  function updateWhatToPlot() {
    // Invalidate the solution buffer.
    bufferFilled = false;
    setPostFunFragShader();
    controllers["minColourValue"].show();
    controllers["maxColourValue"].show();
    configureColourbar();
    configureIntegralDisplay();
  }

  // Species 1-4 use a short letter-suffixed timescale key ("TU".."TQ", matching
  // timescaleTags); species 5-8 have no natural single-letter mnemonic, so they use
  // "TU5".."TU8" instead (same convention as diffCtrlKey/reactionTokenOfSpecies).
  function timescaleTag(i) {
    return i <= 4 ? "T" + defaultSpecies[i - 1].toUpperCase() : "TU" + i;
  }

  // Shows/hides one species' GUI panels (timescale, diffusion row/column, reaction term,
  // initial condition, boundary condition), for species 2-8 (species 1/u is always shown -
  // numSpecies is never less than 1). Only handles cross-diffusion pairs with
  // STRICTLY LOWER-indexed species (j<i): the species-count switch in configureGUI() calls
  // these in descending order (8,7,...,2), so a higher-indexed species' own call already
  // handles its pairing with this one.
  function showSpeciesGUIPanels(i) {
    if (options.timescales) controllers[timescaleTag(i)].show();
    for (let j = 1; j < i; j++) {
      if (options.crossDiffusion) {
        controllers[diffCtrlKey(i, j)].show();
        controllers[diffCtrlKey(j, i)].show();
      } else {
        controllers[diffCtrlKey(i, j)].hide();
        controllers[diffCtrlKey(j, i)].hide();
      }
    }
    controllers[diffCtrlKey(i, i)].show();
    controllers["reaction_" + i].show();
    controllers["initCond_" + i].show();
    controllers[defaultSpecies[i - 1] + "BCs"].show();
  }

  function hideSpeciesGUIPanels(i) {
    controllers[timescaleTag(i)].hide();
    for (let j = 1; j < i; j++) {
      controllers[diffCtrlKey(i, j)].hide();
      controllers[diffCtrlKey(j, i)].hide();
    }
    controllers[diffCtrlKey(i, i)].hide();
    controllers["reaction_" + i].hide();
    controllers["initCond_" + i].hide();
    controllers[defaultSpecies[i - 1] + "BCs"].hide();
  }

  function diffObjects(o1, o2) {
    const diff = Object.fromEntries(
      Object.entries(o1).filter(
        ([k, v]) => JSON.stringify(o2[k]) !== JSON.stringify(v),
      ),
    );
    return JSON.parse(JSON.stringify(diff));
  }

  function getMinMaxVal() {
    fillBuffer();
    let minVal = Infinity;
    let maxVal = -Infinity;
    let v;
    for (let i = 0; i < buffer.length; i += 4) {
      v = buffer[i];
      minVal = minVal < v ? minVal : v;
      maxVal = maxVal > v ? maxVal : v;
    }
    return [minVal, maxVal];
  }

  function getMeanVal() {
    fillBuffer();
    let total = 0;
    for (let i = 0; i < buffer.length; i += 4) {
      total += buffer[i];
    }
    return total / (nXDisc * nYDisc);
  }

  function setPostFunFragShader() {
    // Must run before anything below that could reference an Int(...) expression - see
    // reconcileGlobalIntegrals().
    reconcileGlobalIntegrals();
    // computeDisplayFunShaderTopMRT/MidMRT (>4 species) just add a second input sampler +
    // group-1 locals so FUN/HEIGHT/XVECFUN/YVECFUN can reference species 5-8 - still
    // single-output, so no glslVersion toggle is needed here.
    const isMRT = numGroups(Number(options.numSpecies)) > 1;
    let shaderStr =
      kineticUniformsForShader() +
      (isMRT ? computeDisplayFunShaderTopMRT() : computeDisplayFunShaderTop());
    shaderStr += (
      isMRT ? computeDisplayFunShaderMidMRT() : computeDisplayFunShaderMid()
    )
      .replace(/\bXVECFUN\b/, parseShaderString(options.arrowX))
      .replace(/\bYVECFUN\b/, parseShaderString(options.arrowY));
    shaderStr = setDisplayFunInShader(shaderStr);
    if (options.domainViaIndicatorFun) {
      shaderStr += postShaderDomainIndicator().replace(
        /indicatorFun/g,
        parseShaderString(getModifiedDomainIndicatorFun()),
      );
    }
    // Substitute the placeholder string used for remove vectors when near custom boundaries.
    let replacement = "";
    if (options.vectorField && options.domainViaIndicatorFun) {
      replacement = postShaderDomainIndicatorVField(
        parseShaderString(options.domainIndicatorFun),
      );
    }
    shaderStr = shaderStr.replace("VECFIELDPLACEHOLDER", replacement);
    // Substitute the overlay expression.
    shaderStr = shaderStr.replaceAll(
      "OVERLAYEXPR",
      parseShaderString(options.overlay ? options.overlayExpr : "1.0"),
    );
    shaderStr = replaceMINXMINY(shaderStr);
    setOverlayUniforms();
    assignFragmentShader(postMaterial, shaderStr + postGenericShaderBot());
    postMaterial.needsUpdate = true;
  }

  function setAlgebraicVarsFromOptions() {
    // Set the variables algebraicV etc and constrain numAlgebraicSpecies.
    // Limit the number of algebraic species to at most one less than the number of species.
    options.numAlgebraicSpecies = Math.min(
      parseInt(options.numAlgebraicSpecies),
      parseInt(options.numSpecies) - 1,
    );
    algebraicV = options.numAlgebraicSpecies >= options.numSpecies - 1;
    algebraicW =
      options.numAlgebraicSpecies >= options.numSpecies - 2 &&
      options.numSpecies >= 3;
    algebraicQ =
      options.numAlgebraicSpecies >= options.numSpecies - 3 &&
      options.numSpecies >= 4;
    // Species 5-8 (0-based indices 4-7): same "reverse order" rule (the last
    // numAlgebraicSpecies species, by index, are algebraic), generalized to any index.
    // Only relevant once numGroups(numSpecies)>1 (numSpecies>4).
    for (let s = 4; s < 8; s++) {
      algebraicSpeciesFlags[s] =
        options.numSpecies > s &&
        options.numAlgebraicSpecies >= options.numSpecies - s;
    }
  }

  function problemTypeFromOptions() {
    // Use the currently selected options to specify an equation type as an index into listOfTypes.
    setAlgebraicVarsFromOptions();
    switch (parseInt(options.numSpecies)) {
      case 1:
        // 1Species
        equationType = 0;
        break;
      case 2:
        if (options.crossDiffusion) {
          if (options.numAlgebraicSpecies == 1) {
            // 2SpeciesCrossDiffusionAlgebraicV
            equationType = 3;
          } else {
            // 2SpeciesCrossDiffusion
            equationType = 2;
          }
        } else {
          // 2Species
          equationType = 1;
        }
        break;
      case 3:
        if (options.crossDiffusion) {
          switch (options.numAlgebraicSpecies) {
            case 0:
              // 3SpeciesCrossDiffusion
              equationType = 5;
              break;
            case 1:
              // 3SpeciesCrossDiffusionAlgebraicW
              equationType = 6;
              break;
            case 2:
              // 3SpeciesCrossDiffusionVW
              equationType = 7;
              break;
          }
        } else {
          // 3Species
          equationType = 4;
        }
        break;
      case 4:
        if (options.crossDiffusion) {
          switch (options.numAlgebraicSpecies) {
            case 0:
              // 4SpeciesCrossDiffusion
              equationType = 9;
              break;
            case 1:
              // 4SpeciesCrossDiffusionAlgebraicQ
              equationType = 10;
              break;
            case 2:
              // 4SpeciesCrossDiffusionAlgebraicWQ
              equationType = 11;
              break;
            case 3:
              // 4SpeciesCrossDiffusionAlgebraicVWQ
              equationType = 12;
              break;
          }
        } else {
          // 4Species
          equationType = 8;
        }
        break;
    }
  }

  function configureGUI() {
    // Set up the GUI based on the the current options: numSpecies, crossDiffusion, and numAlgebraicSpecies.
    let tooltip =
      "function of " +
      listOfSpecies.slice(0, options.numSpecies).join(", ") +
      ", x, y, t";
    let Vtooltip = tooltip.replace(" " + listOfSpecies[1] + ",", "");
    let Qtooltip = tooltip.replace(" " + listOfSpecies[2] + ",", "");
    let Wtooltip = tooltip.replace(" " + listOfSpecies[3] + ",", "");

    if (options.dimension == 1) {
      tooltip = tooltip.replace(" y,", "");
      controllers["minY"].hide();
    } else {
      controllers["minY"].show();
    }
    // Algebraic species no longer require cross diffusion (relaxed - see the algebraicV
    // block in setRDEquations() for why); only >1 species is needed for "algebraic" to mean
    // anything.
    if (parseInt(options.numSpecies) > 1) {
      if (!updatingAlgebraicSpecies) {
        updateGUIDropdown(
          controllers["algebraicSpecies"],
          Array.from(Array(parseInt(options.numSpecies)).keys()),
        );
      }
      controllers["algebraicSpecies"].show();
    } else {
      controllers["algebraicSpecies"].hide();
    }
    if (options.brushType == "custom") {
      updateGUIDropdown(
        controllers["brushAction"],
        brushActions.filter((x) => !x.includes("smooth")),
        brushActionVals.filter((x) => !x.includes("smooth")),
      );
      if (options.brushAction.includes("smooth")) {
        controllers["brushAction"].setValue(
          options.brushAction.replaceAll("smooth", ""),
        );
      }
      // Rename the Radius field to Indicator.
      controllers["brushRadius"].name("Indicator");
    } else {
      updateGUIDropdown(
        controllers["brushAction"],
        brushActions,
        brushActionVals,
      );
      controllers["brushRadius"].name("Radius");
    }

    if (options.numSpecies > 1) {
      $("#cross_diffusion_controller").show();
    } else {
      $("#cross_diffusion_controller").hide();
    }

    // The "edit as a matrix" button is hidden on small screens - the popup's grid needs real screen
    // space to be usable.
    diffusionMatrixButton.classList.toggle("hidden", onSmallScreen());

    // Show all timescale panels to begin with. Guarded with ?. because controllers for
    // TU5-TU8 don't exist until the GUI is extended to 8 species (Stage 9 of the upgrade).
    timescaleTags.forEach((tag) => controllers[tag]?.show());

    // Hide every species' panels (species 1/u is always shown), then show them back in for
    // however many species are actually active.
    for (let i = 2; i <= MAX_SPECIES_SUPPORTED; i++) hideSpeciesGUIPanels(i);
    for (let i = 2; i <= parseInt(options.numSpecies); i++)
      showSpeciesGUIPanels(i);
    // Hide timescale panels if we don't need them. Guarded with ?. (see note above).
    if (!options.timescales) {
      timescaleTags.forEach((tag) => controllers[tag]?.hide());
    }
    // The whole "Timescales" sub-folder (not just its individual controllers, above) only
    // makes sense when timescales are turned on - otherwise it'd show as an empty folder.
    // dat.gui folders have no show()/hide() of their own (only controllers do) - toggle the
    // shared .hidden utility class on the folder's domElement directly, matching the existing
    // pattern for hiding other folders (e.g. editViewFolder above).
    timescalesFolder.domElement.classList.toggle("hidden", !options.timescales);

    // Configure the controller names. We'll set the generic names then alter any algebraic
    // ones. Diffusion TeX keys: species 1-4 pairs use the legacy "D"+letter+letter form
    // (e.g. "Duv"); any pair touching species 5-8 uses an uppercase-letter/number form with no
    // "D" prefix (e.g. "U5U", "U5U6" - see getDefaultTeXLabelsDiffusion in TEX.js). Self-
    // diffusion when cross-diffusion is off uses a single-subscript form ("Du" for species
    // 1-4, "Du5" for species 5-8) - cross-term controllers stay hidden in that case (see
    // hideSpeciesGUIPanels), so their name is never visible and is left untouched.
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      for (let j = 1; j <= MAX_SPECIES_SUPPORTED; j++) {
        if (!options.crossDiffusion && i !== j) continue;
        let texKey;
        if (i === j && !options.crossDiffusion) {
          texKey = i <= 4 ? "D" + defaultSpecies[i - 1] : "Du" + i;
        } else if (i <= 4 && j <= 4) {
          texKey = "D" + defaultSpecies[i - 1] + defaultSpecies[j - 1];
        } else {
          texKey =
            defaultSpecies[i - 1].toUpperCase() +
            defaultSpecies[j - 1].toUpperCase();
        }
        setGUIControllerName(
          controllers[diffCtrlKey(i, j)],
          TeXStrings[texKey] || "D_" + i + "_" + j,
          tooltip,
        );
      }
    }

    // Reaction term and timescale names. reactionTokenOfSpecies/timescaleTag already handle
    // the species 1-4 (legacy letter-keyed) vs 5-8 (numeric-suffixed) key-naming split.
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      const s = defaultSpecies[i - 1];
      setGUIControllerName(
        controllers["reaction_" + i],
        TeXStrings[reactionTokenOfSpecies(i - 1)] || s + "'",
        tooltip,
      );
      setGUIControllerName(
        controllers[timescaleTag(i)],
        TeXStrings[timescaleTag(i)] || "T_" + s,
        tooltip,
      );
    }

    // Configure the names/visibility of algebraic species' controllers: retitle their
    // diffusion row (against every other species) and reaction term with a tooltip that
    // omits their own name from the "function of ..." list, and hide their self-diffusion
    // controller entirely (an algebraic species has no diffusion term).
    //
    // NOTE (pre-existing behaviour, preserved as-is by this loop, not fixed here): the
    // per-species tooltip lookup below reuses Vtooltip/Wtooltip/Qtooltip exactly as they were
    // before this was a loop - but Wtooltip actually omits species 4 (q) rather than species 3
    // (w), and Qtooltip omits species 3 (w) rather than species 4 (q) (see their definitions
    // above) - so an algebraic w or q's tooltip currently omits the wrong species' name.
    // Species 5-8 never got a name-omitting tooltip at all; they always use the plain
    // `tooltip`. Flagging both as a separate, likely-wanted follow-up fix.
    const algebraicTooltips = [tooltip, Vtooltip, Wtooltip, Qtooltip];
    for (let s = 1; s < MAX_SPECIES_SUPPORTED; s++) {
      if (!isSpeciesAlgebraic(s)) continue;
      const i = s + 1; // 1-based species number.
      const algTooltip = algebraicTooltips[s] ?? tooltip;
      for (let j = 1; j <= MAX_SPECIES_SUPPORTED; j++) {
        if (j === i) continue;
        const texKey =
          i <= 4 && j <= 4
            ? "D" + defaultSpecies[i - 1] + defaultSpecies[j - 1]
            : defaultSpecies[i - 1].toUpperCase() +
              defaultSpecies[j - 1].toUpperCase();
        setGUIControllerName(
          controllers[diffCtrlKey(i, j)],
          TeXStrings[texKey] || "D_" + i + "_" + j,
          algTooltip,
        );
      }
      setGUIControllerName(
        controllers["reaction_" + i],
        TeXStrings[reactionTokenOfSpecies(s)] || defaultSpecies[s] + "'",
        algTooltip,
      );
      controllers[diffCtrlKey(i, i)].hide();
    }

    // Set the names of the BCs and ICs controllers.
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      const s = defaultSpecies[i - 1];
      const S = s.toUpperCase();
      setGUIControllerName(controllers[s + "BCs"], TeXStrings[s] || s);
      setGUIControllerName(
        controllers["dirichlet" + S],
        TeXStrings[s + "D"] || s + " (Dirichlet)",
      );
      setGUIControllerName(
        controllers["neumann" + S],
        TeXStrings[s + "N"] || s + " (Neumann)",
      );
      setGUIControllerName(
        controllers["robin" + S],
        TeXStrings[s + "N"] || s + " (Robin)",
      );
      setGUIControllerName(
        controllers["initCond_" + i],
        TeXStrings[s + "Init"] || s + "(x,y,0)",
      );
    }

    // Configure timestepping folder for automata mode.
    let controller = controllers["numTimestepsPerFrame"];
    if (options.automataMode) {
      setGUIControllerName(controller, "Speed");
      controller.slider.max = 50;
      controller.slider.style.setProperty("--max", controller.slider.max);
      controllers["dt"].hide();
      controllers["timesteppingScheme"].hide();
    } else {
      setGUIControllerName(controllers["numTimestepsPerFrame"], "Steps/frame");
      controller.slider.max = 400;
      controller.slider.style.setProperty("--max", controller.slider.max);
      controllers["dt"].show();
      controllers["timesteppingScheme"].show();
    }

    // Show/hide the indicator function controller.
    if (options.domainViaIndicatorFun) {
      controllers["domainIndicatorFun"].show();
    } else {
      controllers["domainIndicatorFun"].hide();
    }
    // Hide or show GUI elements that depend on the BCs.
    setBCsGUI();
    // Hide or show GUI elements to do with surface plotting.
    $("#probeTargetButton").show();
    $("#probeTargetButton").visible();
    if (options.plotType == "surface") {
      $("#probeTargetButton").hide();
      $("#probeTargetButton").invisible();
      $("#contourButton").show();
      $("#embossButton").show();
      $("#vectorFieldButton").hide();
      linesAnd3DFolder.name = "3D options";
      threeDFolderButton.classList.remove("hidden");
      linesFolderButton.classList.add("hidden");
      controllers["lineWidthMul"].hide();
      controllers["threeDHeightScale"].show();
      controllers["cameraTheta"].show();
      controllers["cameraPhi"].show();
      controllers["cameraZoom"].show();
      if (comboBCsOptions.open) closeComboBCsGUI();
      $(".combo-bcs").addClass("hidden");
    } else if (options.plotType == "line") {
      $("#contourButton").hide();
      $("#embossButton").hide();
      $("#vectorFieldButton").hide();
      linesAnd3DFolder.name = "Line options";
      threeDFolderButton.classList.add("hidden");
      linesFolderButton.classList.remove("hidden");
      controllers["lineWidthMul"].show();
      controllers["threeDHeightScale"].show();
      controllers["cameraTheta"].hide();
      controllers["cameraPhi"].hide();
      controllers["cameraZoom"].hide();
      hideTopBottomClickAreas();
    } else {
      $("#contourButton").show();
      $("#embossButton").show();
      $("#vectorFieldButton").show();
      threeDFolderButton.classList.add("hidden");
      linesFolderButton.classList.add("hidden");
      controllers["lineWidthMul"].hide();
      controllers["threeDHeightScale"].hide();
      controllers["cameraTheta"].hide();
      controllers["cameraPhi"].hide();
      controllers["cameraZoom"].hide();
    }
    if (options.dimension == 1) {
      $("#vectorFieldButton").hide();
      hideTopBottomClickAreas();
    }
    configureColourbar();
    configureProbe();
    configureTimeDisplay();
    configureIntegralDisplay();
    configureDataContainer();
    configureCustomSurfaceControllers();
    // Show/hide/modify GUI elements that depend on dimension.
    if (options.plotType == "line") {
      controllers["brushType"].hide();
      $(":root").css("--ui-button-outline", "black");
    } else {
      controllers["brushType"].show();
      $(":root").css("--ui-button-outline", "white");
    }
    if (manualInterpolationNeeded) {
      $("#interpController").hide();
    } else {
      $("#interpController").show();
    }
    if (options.arrowScale == "relative") {
      controllers["arrowLengthMax"].show();
    } else {
      controllers["arrowLengthMax"].hide();
    }
    // Update the options available in whatToDraw based on the number of species.
    updateGUIDropdown(
      controllers["whatToDraw"],
      listOfSpecies.slice(0, options.numSpecies),
    );
    // Update emboss sliders.
    updateViewSliders();
    // Show/hide the autoPauseAt controller.
    if (options.autoPause) {
      controllers["autoPauseAt"].show();
    } else {
      controllers["autoPauseAt"].hide();
    }
    if (options.plotType == "line") {
      controllers["overlayEpsilon"].hide();
      controllers["overlayLineWidthMul"].show();
    } else {
      controllers["overlayEpsilon"].show();
      controllers["overlayLineWidthMul"].hide();
    }
    if (options.setSeed) {
      controllers["randSeed"].show();
    } else {
      controllers["randSeed"].hide();
    }
    // Update all toggle buttons.
    $(".toggle_button").each(function () {
      updateToggle(this);
    });
    // Configure the Views GUI from options.views.
    configureViewsGUI();
    updateViewFeatureToggleClasses();
    // Configure the stats display.
    configureStatsGUI();
    // Refresh the GUI displays.
    refreshGUI(leftGUI);
    refreshGUI(rightGUI);
    refreshGUI(viewsGUI);
  }

  function configureOptions() {
    // Configure any options that depend on the equation type.
    let regex;

    setAlgebraicVarsFromOptions();

    if (options.domainViaIndicatorFun) {
      // Only allow Dirichlet or Neumann conditions. Loops over all MAX_SPECIES_SUPPORTED
      // slots (not just the active numSpecies), matching the pre-upgrade behaviour, which
      // unconditionally coerced species 1-4 regardless of numSpecies - any inactive slot is
      // overwritten to "periodic" by the loop below anyway.
      for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
        if (
          !["dirichlet", "neumann"].includes(options["boundaryConditions_" + i])
        ) {
          options["boundaryConditions_" + i] = "dirichlet";
        }
      }
    }

    // Set options that only depend on the number of species: any species with (1-based)
    // index > numSpecies is "inactive" - its diffusion (every direction, self and cross) is
    // zeroed, it's forced to periodic BCs with a zero IC/reaction, and any active species'
    // reaction term referencing it is cleared. This loop is a direct generalisation of the
    // pre-upgrade hand-written switch(numSpecies){case 1: ... case 4: break;} (see git
    // history) - verified during the 8-species upgrade (Stage 9) to reproduce it exactly for
    // numSpecies 1-4 (the whatToDraw/whatToPlot resets become unconditional-vs-conditional
    // but land on the same final value; the diffusion/BC/IC/reaction zeroing matches the old
    // per-case lists entry-for-entry). See
    // /Users/ben/.claude/plans/8-species-upgrade-progress.md for the derivation.
    const numSpeciesInt = parseInt(options.numSpecies);
    if (numSpeciesInt == 1) {
      // Cross-diffusion is meaningless with only one species.
      options.crossDiffusion = false;
    }
    // Ensure the brush target and whatToPlot only reference active species.
    if (!listOfSpecies.slice(0, numSpeciesInt).includes(options.whatToDraw)) {
      options.whatToDraw = listOfSpecies[0];
    }
    if (
      numSpeciesInt < MAX_SPECIES_SUPPORTED &&
      new RegExp("\\b(" + anySpeciesRegexStrs[numSpeciesInt] + ")\\b").test(
        options.whatToPlot,
      )
    ) {
      options.whatToPlot = listOfSpecies[0];
    }
    // Zero the diffusion of any pair involving an inactive species, to prevent it from
    // causing numerical instability (and to keep stale values from a higher numSpecies
    // session from lingering).
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      for (let j = 1; j <= MAX_SPECIES_SUPPORTED; j++) {
        if (i <= numSpeciesInt && j <= numSpeciesInt) continue;
        options["diffusionStr_" + i + "_" + j] = "0";
      }
    }
    // Set inactive species to be periodic, with a zero IC/reaction, to reduce computational
    // overhead.
    for (let i = numSpeciesInt + 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      options["boundaryConditions_" + i] = "periodic";
      options["initCond_" + i] = "0";
      options["reactionStr_" + i] = "0";
    }
    // If any active species' reaction string references an inactive species, clear it.
    if (numSpeciesInt < MAX_SPECIES_SUPPORTED) {
      regex = new RegExp("\\b(" + anySpeciesRegexStrs[numSpeciesInt] + ")\\b");
      for (let i = 1; i <= numSpeciesInt; i++) {
        if (regex.test(options["reactionStr_" + i])) {
          options["reactionStr_" + i] = "0";
        }
      }
    }

    // Algebraic species have no self-diffusion (they're not PDEs) - true regardless of
    // whether cross diffusion is on (algebraic species no longer require it - relaxed; see
    // the algebraicV block in setRDEquations() for why). Generalised using algebraicV/W/Q
    // directly (species 1-4) plus algebraicSpeciesFlags[4..7] (species 5-8, Stage 6) instead
    // of re-deriving it from equationType, since equationType has no representation for
    // numSpecies>4.
    if (algebraicV) options.diffusionStr_2_2 = "0";
    if (algebraicW) options.diffusionStr_3_3 = "0";
    if (algebraicQ) options.diffusionStr_4_4 = "0";
    for (let s = 4; s < MAX_SPECIES_SUPPORTED; s++) {
      if (algebraicSpeciesFlags[s]) {
        options["diffusionStr_" + (s + 1) + "_" + (s + 1)] = "0";
      }
    }

    // If we're in automata mode, specify forward Euler.
    if (options.automataMode) {
      options.timesteppingScheme = "Euler";
    }

    // Refresh the GUI displays.
    refreshGUI(leftGUI);
    refreshGUI(rightGUI);
  }

  function updateProblem() {
    // Update the problem and any dependencies based on the current options.
    // (De)allocate the MRT render targets before anything below - configureDimension() in
    // particular, via resize()/resizeTextures()/postprocess() - tries to read/write them.
    // This must run for every path that can change numSpecies, not just the GUI dropdown:
    // loadPreset()/URL-param loading call updateProblem() too, without ever going through
    // the dropdown's onChange handler (where this used to live, too late in the sequence
    // and unreachable from these other paths).
    ensureMRTRenderTargets();
    problemTypeFromOptions();
    configurePlotType();
    configureOptions();
    configureGUI();
    setComputedUniforms();
    updateShaders();
    configureDimension(); // Triggers a render via a resize, so must be called after updateShaders.
    setEquationDisplayType();
  }

  // Whether species index `ind` (0-based) is currently algebraic. Species 1-4 use the
  // algebraicV/W/Q booleans; species 5-8 use algebraicSpeciesFlags (Stage 6 of the
  // 8-species upgrade). Shared by setEquationDisplayType()'s algebraicFlagsArr construction
  // and the diffusion matrix popup (configureDiffusionMatrixGUI), both of which need to know
  // which species have no self-diffusion term.
  function isSpeciesAlgebraic(ind) {
    if (ind === 1) return algebraicV;
    if (ind === 2) return algebraicW;
    if (ind === 3) return algebraicQ;
    if (ind >= 4) return !!algebraicSpeciesFlags[ind];
    return false;
  }

  function setEquationDisplayType() {
    // Given an equation type (specified as an integer selector), set the type of
    // equation in the UI element that displays the equations.
    const numSpeciesInt = parseInt(options.numSpecies);
    let str;
    // The 13-entry hand-written equationTEX array only enumerates every
    // numSpecies/crossDiffusion/algebraic combination up to 4 species that was reachable
    // when algebraic species required cross-diffusion to be on (problemTypeFromOptions()
    // never assigns an "algebraic" equationType when crossDiffusion is off). Now that
    // algebraic species no longer require cross-diffusion (relaxed - see the algebraicV
    // block in setRDEquations() for why), that combination has no hand-written entry either -
    // build it generatively instead, exactly as already done for numSpecies>4 (8-species
    // upgrade, Stage 10). Uses the same default-notation-placeholder convention as
    // equationTEXFun()'s output, so everything below (custom-equation splicing, custom-name
    // substitution, TeX post-processing) applies uniformly regardless of which path produced
    // `str`.
    const needsGenerativeTEX =
      numGroups(numSpeciesInt) > 1 ||
      (!options.crossDiffusion && options.numAlgebraicSpecies > 0);
    if (needsGenerativeTEX) {
      const algebraicFlagsArr = Array.from({ length: numSpeciesInt }, (_, i) =>
        isSpeciesAlgebraic(i),
      );
      str = buildEquationTEX(
        defaultSpecies.slice(0, numSpeciesInt),
        defaultReactions.slice(0, numSpeciesInt),
        options.crossDiffusion,
        algebraicFlagsArr,
      );
    } else {
      str = equationTEX[equationType];
    }

    let regex;
    // Regex-alternation fragment matching any default species name ("u5".."u8" first, since
    // longer alternatives must be tried before their own prefixes - "u" would otherwise
    // match first and leave a stray "5" unconsumed - matching the same
    // sort-before-alternating precaution genAnySpeciesRegexStrs() already uses elsewhere).
    // Used below in place of the literal [uvwq] character class, which can only ever match
    // one of species 1-4's single-letter names and silently never matches species 5-8's
    // multi-character ones.
    const speciesAlt = [...defaultSpecies]
      .sort((a, b) => b.length - a.length)
      .join("|");
    // Define a list of strings that will be used to make regexes.
    const regexes = {};
    regexes["U"] = /\b(D_{u}) (\\vnabla u)/g;
    regexes["UU"] = /\b(D_{u u}) (\\vnabla u)/g;
    regexes["V"] = /\b(D_{v}) (\\vnabla v)/g;
    regexes["VV"] = /\b(D_{v v}) (\\vnabla v)/g;
    regexes["W"] = /\b(D_{w}) (\\vnabla w)/g;
    regexes["WW"] = /\b(D_{w w}) (\\vnabla w)/g;
    regexes["Q"] = /\b(D_{q}) (\\vnabla q)/g;
    regexes["QQ"] = /\b(D_{q q}) (\\vnabla q)/g;
    regexes["UV"] = /\b(D_{u v}) (\\vnabla v)/g;
    regexes["UW"] = /\b(D_{u w}) (\\vnabla w)/g;
    regexes["UQ"] = /\b(D_{u q}) (\\vnabla q)/g;
    regexes["VU"] = /\b(D_{v u}) (\\vnabla u)/g;
    regexes["VW"] = /\b(D_{v w}) (\\vnabla w)/g;
    regexes["VQ"] = /\b(D_{v q}) (\\vnabla q)/g;
    regexes["WU"] = /\b(D_{w u}) (\\vnabla u)/g;
    regexes["WV"] = /\b(D_{w v}) (\\vnabla v)/g;
    regexes["WQ"] = /\b(D_{w q}) (\\vnabla q)/g;
    regexes["QU"] = /\b(D_{q u}) (\\vnabla u)/g;
    regexes["QV"] = /\b(D_{q v}) (\\vnabla v)/g;
    regexes["QW"] = /\b(D_{q w}) (\\vnabla w)/g;
    // Trailing \b anchors matter now that species 5-8 exist: without one, e.g. "UFUN"
    // partially matches the "UFUN" prefix of "UFUN5".."UFUN8" (bug found via live testing -
    // reaction terms for species 5-8 were getting corrupted/never substituted, since this
    // array is processed before reactionKeys5to8 below and would consume the "UFUN" prefix
    // out of "UFUN5" etc first, leaving a stray "5" and no "UFUN5" left to match against).
    regexes["UFUN"] = /\b(UFUN)\b/g;
    regexes["VFUN"] = /\b(VFUN)\b/g;
    regexes["WFUN"] = /\b(WFUN)\b/g;
    regexes["QFUN"] = /\b(QFUN)\b/g;
    regexes["TU"] = /\b(tau_{u})/g;
    regexes["TV"] = /\b(tau_{v})/g;
    regexes["TW"] = /\b(tau_{w})/g;
    regexes["TQ"] = /\b(tau_{q})/g;

    // Species 5-8 diffusion/reaction/timescale regexes (8-species upgrade, Stage 10) -
    // generalized since these species have no natural single letter for the hand-written
    // entries above to be extended by hand. Keys match Stage 9's controller-naming
    // convention exactly (diffCtrlKey's texKey, reactionTokenOfSpecies(), timescaleTags), so
    // this list is also what buildEquationTEX()'s output (used when numSpecies>4, above) is
    // built to be spliceable by. diffKeys5to8 is reused below by the diffusion-replacement
    // loop.
    //
    // Self-diffusion (i===j) additionally gets a single-subscript key/regex (e.g. "U5",
    // matching "D_{u5}"), mirroring the hand-written "U"/"UU" pair above: buildEquationTEX()
    // emits the single form when cross-diffusion is off and the doubled form ("D_{u5 u5}")
    // when it's on, so both regexes must exist for the substitution loop below to match
    // whichever form actually appears in the generated string.
    const diffKeys5to8 = [];
    for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
      for (let j = 1; j <= MAX_SPECIES_SUPPORTED; j++) {
        if (i <= 4 && j <= 4) continue;
        const X = defaultSpecies[i - 1];
        const Y = defaultSpecies[j - 1];
        const key = X.toUpperCase() + Y.toUpperCase();
        diffKeys5to8.push(key);
        regexes[key] = new RegExp(
          "\\b(D_{" + X + " " + Y + "}) (\\\\vnabla " + Y + ")",
          "g",
        );
        if (i === j) {
          const singleKey = X.toUpperCase();
          diffKeys5to8.push(singleKey);
          regexes[singleKey] = new RegExp(
            "\\b(D_{" + X + "}) (\\\\vnabla " + X + ")",
            "g",
          );
        }
      }
    }
    const reactionKeys5to8 = [];
    for (let i = 5; i <= MAX_SPECIES_SUPPORTED; i++) {
      const tag = reactionTokenOfSpecies(i - 1);
      reactionKeys5to8.push(tag);
      regexes[tag] = new RegExp("\\b(" + tag + ")\\b", "g");
    }
    for (let i = 5; i <= MAX_SPECIES_SUPPORTED; i++) {
      const tag = "TU" + i;
      // No trailing \b here (unlike the reaction-token fix above): the capture group ends
      // in "}", a non-word character, so a trailing \b would require the *next* character
      // to be a word character to match - which it never is in practice (whitespace/"\\"
      // follows in the generated TeX), so it would break every match. Safe without one
      // regardless: "tau_{u}" can never be a literal prefix of "tau_{u5}" (they diverge at
      // "}" vs "5" before the shorter pattern's boundary would even matter).
      regexes[tag] = new RegExp(
        "\\b(tau_{" + defaultSpecies[i - 1] + "})",
        "g",
      );
    }

    // Define placeholders for substituting parameter names in custom-typeset equations.
    let paramNames = getKineticParamNames();
    let paramPlaceholders = Array.from(Array(paramNames.length).keys()).map(
      (s) => "PARAMETER_" + s.toString(),
    );
    let defaultSpeciesPlaceholders = Array.from(
      Array(listOfSpecies.length).keys(),
    ).map((s) => "DEFAULTSPECIES_" + s.toString());

    if (options.typesetCustomEqs) {
      // We'll work using the default notation, then convert at the end.
      let associatedStrs = {};
      associatedStrs["U"] = options.diffusionStr_1_1;
      associatedStrs["UU"] = options.diffusionStr_1_1;
      associatedStrs["V"] = options.diffusionStr_2_2;
      associatedStrs["VV"] = options.diffusionStr_2_2;
      associatedStrs["W"] = options.diffusionStr_3_3;
      associatedStrs["WW"] = options.diffusionStr_3_3;
      associatedStrs["Q"] = options.diffusionStr_4_4;
      associatedStrs["QQ"] = options.diffusionStr_4_4;
      associatedStrs["UV"] = options.diffusionStr_1_2;
      associatedStrs["UW"] = options.diffusionStr_1_3;
      associatedStrs["UQ"] = options.diffusionStr_1_4;
      associatedStrs["VU"] = options.diffusionStr_2_1;
      associatedStrs["VW"] = options.diffusionStr_2_3;
      associatedStrs["VQ"] = options.diffusionStr_2_4;
      associatedStrs["WU"] = options.diffusionStr_3_1;
      associatedStrs["WV"] = options.diffusionStr_3_2;
      associatedStrs["WQ"] = options.diffusionStr_3_4;
      associatedStrs["QU"] = options.diffusionStr_4_1;
      associatedStrs["QV"] = options.diffusionStr_4_2;
      associatedStrs["QW"] = options.diffusionStr_4_3;
      associatedStrs["UFUN"] = options.reactionStr_1;
      associatedStrs["VFUN"] = options.reactionStr_2;
      associatedStrs["WFUN"] = options.reactionStr_3;
      associatedStrs["QFUN"] = options.reactionStr_4;
      associatedStrs["TU"] = options.timescale_1;
      associatedStrs["TV"] = options.timescale_2;
      associatedStrs["TW"] = options.timescale_3;
      associatedStrs["TQ"] = options.timescale_4;

      // Species 5-8 (Stage 10 of the 8-species upgrade) - mirrors the hand-written entries
      // above; keys match diffKeys5to8/reactionKeys5to8 (built alongside regexes, above).
      for (let i = 1; i <= MAX_SPECIES_SUPPORTED; i++) {
        for (let j = 1; j <= MAX_SPECIES_SUPPORTED; j++) {
          if (i <= 4 && j <= 4) continue;
          const key =
            defaultSpecies[i - 1].toUpperCase() +
            defaultSpecies[j - 1].toUpperCase();
          associatedStrs[key] = options["diffusionStr_" + i + "_" + j];
          // Single-subscript self-diffusion key ("U5"), matching the extra single-form
          // regex added above - same value as the doubled key, just a different pattern to
          // match against depending on whether cross-diffusion is on or off.
          if (i === j) {
            associatedStrs[defaultSpecies[i - 1].toUpperCase()] =
              options["diffusionStr_" + i + "_" + j];
          }
        }
      }
      for (let i = 5; i <= MAX_SPECIES_SUPPORTED; i++) {
        associatedStrs[reactionTokenOfSpecies(i - 1)] =
          options["reactionStr_" + i];
        associatedStrs["TU" + i] = options["timescale_" + i];
      }

      // Map empty strings to 0.
      Object.keys(associatedStrs).forEach(function (key) {
        if (isEmptyString(associatedStrs[key])) associatedStrs[key] = "0";
      });

      // Expressions are deliberately NOT substituted into the displayed equations here (they
      // stay as plain symbol names, e.g. "f" rather than its definition) - each gets its own
      // row appended to the equation block instead, see appendExpressionRowsToTEX() below.

      // Check associatedStrs for basic syntax validity, and return without updating the TeX if there are issues.
      var badSyntax = false;
      Object.keys(associatedStrs).forEach(function (key) {
        if (!badSyntax) badSyntax |= !isValidSyntax(associatedStrs[key]);
      });
      if (badSyntax) return;

      // Before we convert the associated strings to default notation, put in placeholders for all
      // user-defined parameters to prevent them from being accidentally recognised as default notation
      // eg if u is a parameter.
      Object.keys(associatedStrs).forEach(function (key) {
        associatedStrs[key] = replaceSymbolsInStr(
          associatedStrs[key],
          paramNames,
          paramPlaceholders,
        );
      });

      // Check for any default variable names in the associated strings that don't correspond to current species names. Replace them with placeholders to prevent accidental typesetting as another symbol.
      Object.keys(associatedStrs).forEach(function (key) {
        associatedStrs[key] = replaceSymbolsInStr(
          associatedStrs[key],
          defaultSpecies.filter((s) => !listOfSpecies.includes(s)),
          defaultSpeciesPlaceholders,
        );
      });

      // Convert all the associated strings back to default notation.
      function toDefault(s) {
        return replaceSymbolsInStr(
          s,
          listOfSpecies,
          defaultSpecies,
          "_(?:[xy][xybf]?)",
        );
      }

      Object.keys(associatedStrs).forEach(function (key) {
        associatedStrs[key] = toDefault(associatedStrs[key]);
      });

      // Trim associated strings.
      Object.keys(associatedStrs).forEach(function (key) {
        associatedStrs[key] = associatedStrs[key].trim();
      });

      // If a diffusion string contains a semicolon, treat it as a diagonal matrix, and typeset as such.
      Object.keys(associatedStrs).forEach(function (key) {
        if (!defaultReactions.includes(key)) {
          if (associatedStrs[key].includes(";")) {
            let parts = associatedStrs[key].split(";").filter((x) => x);
            if (parts.length > 1 && options.dimension > 1) {
              associatedStrs[key] =
                "\\dmat{" + parts.slice(0, 2).join("}{") + "}";
            } else {
              associatedStrs[key] = parts[0];
            }
          }
        }
      });

      // Add in \selected{} to any selected entry.
      const selectCommand = inDarkMode() ? "selectedDark" : "selectedLight";
      selectedEntries.forEach(function (x) {
        associatedStrs[x] =
          "\\" + selectCommand + "{" + associatedStrs[x] + "}";
      });

      // For each diffusion string, replace it with the value in associatedStrs.
      [
        "U",
        "UU",
        "V",
        "VV",
        "W",
        "WW",
        "Q",
        "QQ",
        "UV",
        "UW",
        "UQ",
        "VU",
        "VW",
        "VQ",
        "WU",
        "WV",
        "WQ",
        "QU",
        "QV",
        "QW",
        ...diffKeys5to8,
      ].forEach(function (key) {
        let delims = associatedStrs[key].includes("\\dmat") ? "  " : "[]";
        str = replaceUserDefDiff(
          str,
          regexes[key],
          associatedStrs[key],
          delims,
        );
      });

      // Replace the reaction strings.
      ["UFUN", "VFUN", "WFUN", "QFUN", ...reactionKeys5to8].forEach(
        function (tag) {
          str = replaceUserDefReac(str, regexes[tag], associatedStrs[tag]);
        },
      );

      // Replace the timescale strings. Skip tags with no associatedStrs/regexes entry
      // (shouldn't happen now that Stage 10 populates TU5-TU8 too, but kept as a defensive
      // guard) rather than passing `undefined` as input, which replaceUserDefTimescale
      // can't handle.
      timescaleTags.forEach(function (tag) {
        if (associatedStrs[tag] === undefined) return;
        str = replaceUserDefTimescale(str, regexes[tag], associatedStrs[tag]);
      });

      // Look through the string for any open brackets ( or [ followed by a +.
      regex = /\(\s*\+/g;
      while (str != (str = str.replace(regex, "(")));
      regex = /\[\s*\+/g;
      while (str != (str = str.replace(regex, "[")));
      // Look through the string for any + followed by a ).
      regex = /\+\s*\)/g;
      while (str != (str = str.replace(regex, ")")));
      // Look through the string for any  +[-blah] or [-blah] and replace with -blah.
      regex = /\+?\s*\[\s*(\-[^\+\-\[\]]*)\]/g;
      while (str != (str = str.replace(regex, "$1")));

      // Look through the string for any empty divergence operators, and remove them if so.
      regex = /\\vnabla\s*\\cdot\s*\(\s*\)/g;
      str = str.replaceAll(regex, "");

      // Look through the string for any = +, and remove the +.
      regex = /=\s*\+/g;
      str = str.replaceAll(regex, "=");

      // Look through the string for any + \\\\, and remove the +.
      regex = /\+\s*(\\\\|\n)/g;
      str = str.replaceAll(regex, "$1");

      // Look through the string for any && and replace them with \land.
      regex = /&&/g;
      str = str.replaceAll(regex, "\\,\\land\\, ");

      // Look through the string for any || and replace them with \lor.
      regex = /\|\|/g;
      str = str.replaceAll(regex, "\\,\\lor\\, ");

      // Look for = followed by a newline, and insert 0.
      regex = /=\s*(\\\\|\n)/g;
      str = str.replaceAll(regex, "=0$1");

      // If we have [-blah] inside a divergence operator, move the minus sign outside.
      regex = new RegExp(
        "(\\\\vnabla\\s*\\\\cdot\\s*\\()\\[-([\\w\\{\\}\\(\\)]*)\\]\\s*(\\\\vnabla\\s*(?:" +
          speciesAlt +
          ")\\s*\\))",
        "g",
      );
      str = str.replaceAll(regex, "-$1$2$3");

      // Look for div(grad(blah)) and replace it with lap.
      regex = new RegExp(
        "\\\\vnabla\\s*\\\\cdot\\s*\\(\\s*\\\\vnabla\\s*(" +
          speciesAlt +
          ")\\s*\\)",
        "g",
      );
      str = str.replaceAll(regex, "\\lap $1");

      // Look for div(const * grad(blah)), and move the constant outside the bracket.
      // Constant in space <=> it doesn't contain [xy], any species name (optionally
      // suffixed with _x/_y/_xx/_yy), (?:I_[ST][RGBA]?), or the name of any user-defined expression. We'll also treat matrices as
      // non-constants for typesetting.
      regex = new RegExp(
        "\\\\vnabla\\s*\\\\cdot\\s*\\(\\s*((?!\\\\vnabla).*)\\s*\\\\vnabla\\s*(" +
          speciesAlt +
          ")\\s*\\)",
        "g",
      );

      let expressionNames = getExpressionNames();
      let expressionNameRegex = new RegExp(
        "\\b(?:" + expressionNames.join("|") + ")\\b",
        "g",
      );
      function containsExpressionName(s) {
        if (expressionNames.length == 0) return false;
        return expressionNameRegex.test(s);
      }

      str = str.replaceAll(regex, function (match, g1, g2) {
        const innerRegex = new RegExp(
          "\\b(?:[xy]|(?:" + speciesAlt + ")(?:_[xy])?|(?:I_[ST][RGBA]?))\\b",
          "g",
        );
        if (
          !innerRegex.test(g1) &&
          !containsExpressionName(g1) &&
          !g1.includes("\\dmat")
        ) {
          return g1.trim() + " \\lap " + g2;
        } else {
          return match;
        }
      });

      // Replace u_x, u_y etc with \pd{u}{x} etc. Add parentheses if followed by ^.
      regex = new RegExp(
        "(\\(?)\\b(" + speciesAlt + ")_([xy])[fb]?2?\\s*(\\)?)\\s*(\\^?)\\b",
        "g",
      );
      str = str.replaceAll(regex, function (match, g1, g2, g3, g4, g5) {
        let base =
          g1 + "\\textstyle \\pd{" + g2 + "}{" + g3 + "\\vphantom{y}}" + g4;
        if (g5 != "" && (g1 == "" || g4 == "")) {
          base = "(" + base + ")" + g5;
        } else {
          base += g5;
        }
        return base;
      });

      // Replace u_xx, u_yy etc with \pdd{u}{x} etc.
      regex = new RegExp(
        "(\\(?)\\b(" + speciesAlt + ")_(xx|yy)\\s*(\\)?)\\s*(\\^?)\\b",
        "g",
      );
      str = str.replaceAll(regex, function (match, g1, g2, g3, g4, g5) {
        let base =
          g1 + "\\textstyle \\pdd{" + g2 + "}{" + g3[0] + "\\vphantom{y}}" + g4;
        if (g5 != "" && (g1 == "" || g4 == "")) {
          base = "(" + base + ")" + g5;
        } else {
          base += g5;
        }
        return base;
      });

      // Replace RAND with \mathcal{U}.
      regex = /\bRAND\b/g;
      str = str.replaceAll(regex, "\\mathcal{U}");

      // Replace RANDN with \mathcal{Z}.
      regex = /\bRANDN\b/g;
      str = str.replaceAll(regex, "\\mathcal{Z}");
    } else {
      // Even if we're not customising the typesetting, add in \selected{} to any selected entry.
      const selectCommand = inDarkMode() ? "selectedDark" : "selectedLight";
      selectedEntries.forEach(function (x) {
        str = str.replaceAll(regexes[x], function (match, g1, g2) {
          let val = "\\" + selectCommand + "{" + g1 + " ";
          if (typeof g2 == "string") val += g2;
          return val + "}";
        });
      });
      // Replace fFUN, gFUN etc with the reaction names.
      str = replaceSymbolsInStr(
        str,
        ["UFUN", "VFUN", "WFUN", "QFUN"],
        defaultReactions,
      );
    }

    // Remove timescales if they're not being requested.
    if (!options.timescales) {
      // Replace the timescale strings.
      timescaleTags.forEach(function (tag) {
        str = replaceUserDefTimescale(str, regexes[tag], "");
      });
    }

    // If we're in 1D, convert \nabla to \pd{}{x} and \lap word to \pdd{word}{x}.
    if (options.dimension == 1) {
      str = str.replaceAll(/\\vnabla\s*\\cdot/g, "\\textstyle \\pd{}{x}");
      regex = new RegExp("\\\\vnabla\\s*(" + speciesAlt + ")", "g");
      str = str.replaceAll(regex, "\\textstyle \\pd{$1}{x}");
      regex = new RegExp("\\\\lap\\s*(" + speciesAlt + ")", "g");
      str = str.replaceAll(regex, "\\textstyle \\pdd{$1}{x}");
    }

    // Swap out all default symbols for new species and reactions.
    // This will also swap out strange parameter names that are 'reactionName_x', which isn't desirable.
    str = replaceSymbolsInStr(
      str,
      defaultSpecies.concat(defaultReactions),
      listOfSpecies.concat(listOfReactions),
      "_(?:[xy][xybf]?)",
    );

    // Remove parameter placeholders with parameter names.
    str = replaceSymbolsInStr(str, paramPlaceholders, paramNames);

    // Remove default species placeholders with original default species names.
    str = replaceSymbolsInStr(str, defaultSpeciesPlaceholders, defaultSpecies);

    // Append one row per defined expression (its own name and raw definition - not
    // substituted into the equations above) before the final TeX pass below, which will
    // typeset these rows the same way as everything else in one uniform pass.
    str = appendExpressionRowsToTEX(str);

    str = parseStringToTEX(str);

    $("#typeset_equation").html(str);
    runMathJax()?.then(resizeEquationDisplay);
  }

  /**
   * Appends one row per defined expression whose "Show" checkbox is checked ("name &= rhs",
   * using the expression's own raw definition, not substituted/expanded - expressions are
   * deliberately shown as themselves here, never inlined into other equations, see
   * setEquationDisplayType()) to the end of the aligned equation block in `str`, right before
   * its closing "\end{aligned}$". A no-op if no expressions are defined, or none are shown.
   */
  function appendExpressionRowsToTEX(str) {
    const nameVals = getExpressionNameVals().filter(([, , shown]) => shown);
    if (nameVals.length === 0) return str;
    const rows = nameVals
      .map(([name, rhs]) => "\\textstyle " + name + " &= " + rhs)
      .join("\\\\\n    ");
    return str.replace(
      /\s*\\end\{aligned\}\$\s*$/,
      "\\\\\n    " + rows + "\n    \\end{aligned}$",
    );
  }

  function parseStringToTEX(str) {
    // Parse a string into valid TEX by replacing * and ^.

    // Resolve each Int(...) call to an inert placeholder token immediately, before any of
    // the transforms below get a chance to mangle the raw "Int(...)" syntax itself (in
    // particular the \left/\right bracket-escaping pass a little further down, which would
    // otherwise turn "Int(" into "Int\left(", making it unrecognizable). Each placeholder is
    // swapped for its actual rendered TeX further down (see intCallPlaceholders below),
    // after the passes that would mangle raw "Int(...)" syntax but before the ones that
    // would mangle the placeholder token itself (e.g. the underscore/subscript passes at the
    // end, which would otherwise treat a trailing digit as a subscript).
    const intCallPlaceholders = [];
    str = replaceIntCalls(str, (expr) => {
      const placeholder = "IntCallPlaceholder" + intCallPlaceholders.length;
      intCallPlaceholders.push([placeholder, expr]);
      return placeholder;
    });

    // If the string is surrounded by [] but doesn't contain +, -, or /, remove the brackets.
    str = str.replaceAll(/\[([^\+\/\[\]-]*)\]/g, "$1");

    // Look through the string and replace any + + with +.
    while (str != (str = str.replace(/\+\s*\+/g, "+")));

    // Replace +- and -+ with simply -
    str = str.replaceAll(/\+\s*-/g, "-");
    str = str.replaceAll(/-\s*\+/g, "-");

    // Replace common functions with commands.
    str = replaceFunctionInTeX(str, "sin", true);
    str = replaceFunctionInTeX(str, "cos", true);
    str = replaceFunctionInTeX(str, "tan", true);
    str = replaceFunctionInTeX(str, "exp", true);
    str = replaceFunctionInTeX(str, "log", true);
    str = replaceFunctionInTeX(str, "sqrt", false);
    str = replaceFunctionInTeX(str, "sinh", true);
    str = replaceFunctionInTeX(str, "cosh", true);
    str = replaceFunctionInTeX(str, "tanh", true);
    str = replaceFunctionInTeX(str, "max", true);
    str = replaceFunctionInTeX(str, "min", true);
    str = replaceFunctionInTeX(str, "ind", true);
    str = replaceFunctionInTeX(str, "abs", false);

    // Remove *, unless between two numbers or followed by + or -, in which case insert \times.
    while (
      str != (str = str.replace(/([0-9\.])\s*\*\s*([0-9\.])/, "$1 \\times $2"))
    );
    while (str != (str = str.replace(/\*([\-\+])/, "\\times $1")));
    str = str.replaceAll(/\*/g, " ");

    // Replace powers with well-formatted ^, including nested powers.
    str = replaceBinOperator(str, "^", "{$1}^{$2}");

    // Replace / with well-formatted \frac, including nested fractions.
    // str = replaceBinOperator(str, "/", "\\frac{$1}{$2}");

    // Prepend \\ to any Greek character.
    str = substituteGreek(str);

    // Alternate nested brackets between () and [].
    str = alternateBrackets(str);

    // Add \left and \right to brackets.
    str = str.replaceAll(/[\(\[]/g, "\\left$&");
    str = str.replaceAll(/[\)\]]/g, "\\right$&");

    // Replace WhiteNoise with dW_t/dt.
    str = str.replaceAll(
      /\bWhiteNoise(_([1234]))?\b/g,
      "\\textstyle\\diff{W_{t$2}}{t}",
    );

    // Replace Bump with \text{Bump}.
    str = str.replaceAll(/\bBump\b/g, "\\text{Bump}");

    // Replace Gauss with \mathcal{N}.
    str = str.replaceAll(/\bGauss\b/g, "\\mathcal{N}");

    // Swap each Int(...) placeholder (see the top of this function) for its actual
    // \int_{\Omega} expression \d x \d y rendering. This must happen here - after the
    // bracket/left-right/function-name passes above (which would otherwise mangle the raw
    // "Int(...)" syntax before we could find it, hence resolving it into an inert
    // placeholder up front instead) but before the underscore/subscript passes below (which
    // would otherwise mangle the placeholder token itself). Each captured expression is
    // itself a raw expression string (e.g. "u*v"), so it needs its own trip through
    // parseStringToTEX (recursing here is safe - each call is a fresh, independent
    // conversion, and intCallPlaceholders only ever holds entries for Int(...) calls that
    // actually existed in the original string, so there's no risk of unconditionally
    // recursing on every parseStringToTEX() call regardless of whether "Int(" was ever
    // actually present) to get the same TeX formatting (removing "*", species substitution,
    // etc.) as the rest of the equation. No outer parens around the integrand - matches how
    // the rest of the equation display renders bare terms.
    intCallPlaceholders.forEach(([placeholder, expr]) => {
      const replacement =
        (options.dimension == 1 ? "\\int_{\\Omega} " : "\\iint_{\\Omega} ") +
        parseStringToTEX(expr) +
        (options.dimension == 1 ? "\\, \\d x \\ " : "\\, \\d x \\d y\\ ");
      // split/join rather than replaceAll, so a "$"-containing expression (e.g. a species
      // name never actually looks like this, but a user-defined parameter safely could)
      // can't be misread as a replaceAll() special replacement pattern.
      str = str.split(placeholder).join(replacement);
    });

    // If there's an underscore, put {} around the word that follows it.
    str = str.replaceAll(/_(\w+\b)/g, "_{$1}");

    // If letters are followed by only numbers, assume that the numbers are a subscript.
    str = str.replaceAll(/\b([a-zA-Z]+)([0-9]+)\b/g, "$1_{$2}");

    // Swap out weak inequalities for \geq \leq, with spaces.
    str = str.replaceAll(/<=/g, " \\leq ");
    str = str.replaceAll(/>=/g, " \\geq ");

    // Add spaces around strict inequalities.
    str = str.replaceAll(/([<>])/g, " $1 ");

    return str;
  }

  function replaceFunctionInTeX(str, func, withBrackets) {
    // Replace a function, like sqrt(expression), with \sqrt{expression} in str.
    // withBrackets specifies whether or not we should include brackets in between {}.
    var newStr = str;
    var addedChars = 0;
    const matches = str.matchAll(new RegExp("\\b" + func + "\\b", "g"));
    let funcInd,
      startInd,
      endInd,
      subStr,
      depth,
      foundBracket,
      ind,
      offset = 0;
    for (const match of matches) {
      funcInd = match.index;
      startInd = funcInd + func.length;
      subStr = str.slice(startInd);
      ind = 0;
      depth = 0;
      foundBracket = false;
      // Try to find paired brackets.
      while (
        (ind <= subStr.length) &
        (!foundBracket | !(foundBracket && depth == 0))
      ) {
        depth += ["(", "["].includes(subStr[ind]);
        depth -= [")", "]"].includes(subStr[ind]);
        foundBracket |= depth;
        ind += 1;
      }
      // If we found correctly paired brackets, replace them. Otherwise, do nothing.
      if (foundBracket && depth == 0) {
        endInd = ind - 1 + startInd;
        // Insert a backslash and record that we've added a character, which will shift all indices in newStr.
        newStr = insertStrAtIndex(newStr, "\\", funcInd + offset);
        offset += 1;
        if (withBrackets) {
          // Insert braces before and after brackets.
          newStr = insertStrAtIndex(newStr, "{", startInd + offset);
          offset += 1;
          newStr = insertStrAtIndex(newStr, "}", endInd + 1 + offset);
          offset += 1;
        } else {
          newStr = replaceStrAtIndex(newStr, "{", startInd + offset);
          newStr = replaceStrAtIndex(newStr, "}", endInd + offset);
        }
      }
    }
    return newStr;
  }

  function enableImageLookupInShader(str) {
    // Enable function evaluation in shaders.
    var newStr = str;
    const matches = str.matchAll(/\bI_([TS])([RGBA])?\b/g);
    let funcInd,
      startInd,
      endInd,
      subStr,
      argStr,
      args,
      depth,
      foundBracket,
      ind,
      toAddPart,
      toAdd,
      imNum,
      component,
      offset = 0;
    const imageLookup = { S: "One", T: "Two" };
    const componentLookup = { R: "r", G: "g", B: "b", A: "a" };
    for (const match of matches) {
      funcInd = match.index;
      imNum = imageLookup[match[1]];
      startInd = funcInd + match[0].length;
      subStr = str.slice(startInd);
      ind = 0;
      depth = 0;
      foundBracket = false;
      // Try to find paired brackets.
      while (
        (ind <= subStr.length) &
        (!foundBracket | !(foundBracket && depth == 0))
      ) {
        depth += ["("].includes(subStr[ind]);
        depth -= [")"].includes(subStr[ind]);
        foundBracket |= depth;
        ind += 1;
      }
      // If we found correctly paired brackets, replace with the function. Otherwise, do nothing.
      if (foundBracket && depth == 0) {
        endInd = ind - 1 + startInd;
        argStr = newStr.slice(startInd + offset + 1, endInd + offset);
        // Detect at most two arguments separated by a comma.
        args = argStr.split(",");
        // If the second argument is empty, put a zero in its place.
        if (args.length == 1 || args[1].trim().length == 0) args[1] = "0";
        args[0] = "(" + args[0] + "-MINX)/L_x";
        args[1] = "(" + args[1] + "-MINY)/L_y";
        toAddPart =
          "texture(imageSource" + imNum + ",vec2(" + args.join(",") + ")).";
        if (match[2] != undefined) {
          component = componentLookup[match[2]];
          toAdd = toAddPart + component;
        } else {
          component = ["r", "g", "b"];
          toAdd =
            "(" + component.map((c) => toAddPart + c).join("+") + ")/3.0 ";
        }

        newStr = replaceStrAtIndex(
          newStr,
          toAdd,
          funcInd + offset,
          endInd + 1 + offset,
        );
        offset += toAdd.length - endInd + funcInd - 1;
      }
    }
    return newStr;
  }

  function alternateBrackets(str) {
    // Given a string with balanced bracketing, loop nested brackets through (, [.
    const openBrackets = ["(", "["];
    const closeBrackets = [")", "]"];
    let bracketInd = 0;
    let bracketDepth = 0;
    let lastIndex = 0;
    let chunk = "";
    let strOut = "";
    for (var ind = 0; ind < str.length; ind++) {
      if (openBrackets.includes(str[ind])) {
        bracketInd += 1;
        bracketDepth += 1;
      } else if (closeBrackets.includes(str[ind])) {
        bracketInd -= 1;
      }
      if (bracketInd == 0 && bracketDepth > 0) {
        chunk = str.slice(lastIndex, ind + 1);
        strOut = strOut + alternateBracketsGivenDepth(chunk, bracketDepth);
        bracketDepth = 0;
        lastIndex = ind + 1;
      }
    }
    strOut = strOut + str.slice(lastIndex);
    return strOut;
  }

  function alternateBracketsGivenDepth(str, depth) {
    // Given a string with balanced bracketing, loop nested brackets through (, [.
    // Requires a depth so that it can select brackets from the outside in, i.e. 321123
    const openBrackets = ["(", "["];
    const closeBrackets = [")", "]"];
    let bracketInd = modulo(-depth + 1, openBrackets.length);
    for (var ind = 0; ind < str.length; ind++) {
      if (openBrackets.includes(str[ind])) {
        str = replaceStrAtIndex(str, openBrackets[bracketInd], ind);
        bracketInd += 1;
        // Ensure that bracketInd is a valid index that loops through listToSub.
        bracketInd = modulo(bracketInd, openBrackets.length);
      } else if (closeBrackets.includes(str[ind])) {
        bracketInd -= 1;
        // Ensure that bracketInd is a valid index that loops through listToSub.
        bracketInd = modulo(bracketInd, openBrackets.length);
        str = replaceStrAtIndex(str, closeBrackets[bracketInd], ind);
      }
    }
    return str;
  }

  function modulo(num, quot) {
    return ((num % quot) + quot) % quot;
  }

  function replaceStrAtIndex(str, toSub, ind, resumeInd) {
    if (resumeInd == undefined) resumeInd = ind + 1;
    return str.slice(0, ind) + toSub + str.slice(resumeInd, str.length);
  }

  function insertStrAtIndex(str, toAdd, ind) {
    return str.slice(0, ind) + toAdd + str.slice(ind, str.length);
  }

  function removeWhitespace(str) {
    str = str.replace(/\s+/g, "  ").trim();
    return str;
  }

  /**
   * Parses a whitespace-agnostic "name = definition" string (shared by Parameters and
   * Expressions). Returns {name, rhs} or null if unparseable.
   *
   * @param {string} str - The definition string to parse.
   * @returns {{name: string, rhs: string}|null}
   */
  function parseNamedDefinition(str) {
    const match = str.match(/^\s*([a-zA-Z]\w*)\s*=\s*(.*)$/s);
    if (!match) return null;
    return { name: match[1], rhs: match[2].trim() };
  }

  /**
   * Builds a dependency graph {name: [otherNamesReferenced]} from a name->definition-string
   * dict, via word-boundary scan. Shared by Parameters' numeric evaluation and Expressions'
   * substitution ordering.
   */
  function buildDependencyGraph(strDict, names) {
    const dependencies = {};
    names.forEach((name) => {
      dependencies[name] = names.filter(
        (other) =>
          other != name &&
          new RegExp("\\b" + other + "\\b").test(strDict[name] ?? ""),
      );
    });
    return dependencies;
  }

  /**
   * Shared by evaluateDependentNumerics (Parameters) and expandDependentExpressions
   * (Expressions): builds a dependency graph over strDict/names, checks for cyclic
   * dependencies (reusing the generic checkForCyclicDependencies()), degrades any name
   * involved in a cycle to `degradeValue`, then resolves every name in dependency order
   * (each name's dependencies are always resolved before it, since
   * checkForCyclicDependencies's DFS only marks a name "done" once all its dependencies are)
   * via the caller-supplied `resolve` callback.
   *
   * @param {Object} strDict - name -> raw definition string.
   * @param {string[]} names - The full list of names to resolve.
   * @param {string} degradeValue - What a cyclic name's definition is replaced with.
   * @param {function(string, string, string[], Object): void} resolve - Called once per name,
   *   in dependency order, as (name, degradedDefStr, dependencyNames, resultDict); should set
   *   resultDict[name].
   * @returns {[Object, Array]} [resultDict, badNames] - badNames is a list of cyclic paths.
   */
  function resolveDependentDefinitions(strDict, names, degradeValue, resolve) {
    const dependencies = buildDependencyGraph(strDict, names);
    let doneDict = {};
    let badNames = [];
    for (const name of names) {
      if (!(name in doneDict)) {
        [doneDict, , badNames] = checkForCyclicDependencies(
          name,
          doneDict,
          [name],
          dependencies,
          badNames,
        );
      }
    }
    const degradedStrDict = { ...strDict };
    badNames.forEach((path) =>
      path.forEach((name) => (degradedStrDict[name] = degradeValue)),
    );
    const resultDict = {};
    Object.keys(doneDict).forEach((name) => {
      resolve(name, degradedStrDict[name], dependencies[name], resultDict);
    });
    return [resultDict, badNames];
  }

  /**
   * Evaluates numeric values for a set of (possibly interdependent, but not cyclically so)
   * definitions - used for kinetic parameters.
   *
   * @returns {[Object, Array]} [valDict, badNames].
   */
  function evaluateDependentNumerics(strDict, names) {
    return resolveDependentDefinitions(
      strDict,
      names,
      "0",
      (name, str, deps, valDict) => {
        deps.forEach((dep) => {
          str = str.replaceAll(
            new RegExp("\\b" + dep + "\\b", "g"),
            (valDict[dep] ?? 0).toString(),
          );
        });
        try {
          valDict[name] = parser.evaluate(str);
        } catch (error) {
          throwError(
            "Unable to evaluate the definition of " +
              name +
              ". Please check for syntax errors or undefined parameters.",
          );
          valDict[name] = 0;
        }
      },
    );
  }

  /**
   * Fully expands a set of (possibly interdependent, but not cyclically so) text-macro
   * definitions - used for expressions. Each name's definition has every expression name it
   * references replaced by that name's own (already fully expanded) definition, parenthesized
   * for precedence safety.
   *
   * @returns {[Object, Array]} [expandedDict, badNames].
   */
  function expandDependentExpressions(strDict, names) {
    return resolveDependentDefinitions(
      strDict,
      names,
      "0.0",
      (name, str, deps, expandedDict) => {
        deps.forEach((dep) => {
          str = str.replaceAll(
            new RegExp("\\b" + dep + "\\b", "g"),
            "(" + (expandedDict[dep] ?? "0.0") + ")",
          );
        });
        expandedDict[name] = str;
      },
    );
  }

  /**
   * Creates and wires a single controller within a "definitions list" folder (Parameters or
   * Expressions): a dat.gui text controller bound to `ctx.strs[label]`, handling whitespace
   * trimming, deleting itself (and its name registration) when emptied, parsing/validating/
   * registering its name when non-empty, and - if this is the trailing "next" (always-empty)
   * controller and the user just filled it in - promoting itself into a real controller and
   * creating a fresh trailing empty one. (dat.gui controllers can't be converted between
   * "next" and "normal" behaviour in place, so promotion adds a new controller for the same
   * label and removes the old one.)
   *
   * @param {Object} ctx - Bundles one feature's mutable state: {folder, strs, labels,
   *   nameToCont, labelPrefix, getCounter, setCounter, setNext}. strs/labels/nameToCont are
   *   held by reference and only ever mutated in place here (never reassigned), so a ctx
   *   stays valid for as long as its resulting controllers do - safe even across an external
   *   full reset of the owning feature's outer variables (which always happens as a prelude
   *   to a full rebuild that removes those controllers anyway).
   * @param {string} label - The (internal, not user-visible) key into ctx.strs.
   * @param {boolean} isNext - Whether this is the trailing always-empty "add new" controller.
   * @param {Object} hooks - Feature-specific behaviour: {ariaLabel, placeholder,
   *   validateName(name), afterChange(isPromotion), onDeleted(name),
   *   extraControllerSetup(controller, str)}.
   * @returns {dat.GUI controller}
   */
  function createDefinitionController(ctx, label, isNext, hooks) {
    let controller;
    if (isNext) {
      ctx.labels.push(label);
      ctx.strs[label] = "";
      controller = ctx.folder.add(ctx.strs, label).name("");
      ctx.setNext(controller);
    } else {
      controller = ctx.folder.add(ctx.strs, label).name("");
      registerParsedName(ctx, controller, ctx.strs[label], hooks);
    }
    disableAutocorrect(controller.domElement.firstChild);
    controller.domElement.classList.add("params");
    controller.domElement.firstChild.setAttribute(
      "aria-label",
      hooks.ariaLabel,
    );
    controller.domElement.firstChild.setAttribute(
      "placeholder",
      hooks.placeholder,
    );

    controller.onFinishChange(function () {
      // Normalise what was just typed, exactly as every other expression field does. Must
      // run before the empty-string checks below: autoCorrectSyntax turns "" into "0", which
      // would stop an emptied row ever being deleted.
      const corrected = autoCorrectDefinition(ctx.strs[label]);
      if (corrected != ctx.strs[label]) controller.setValue(corrected);
      const str = removeWhitespace(ctx.strs[label]);
      if (isNext) {
        // If the string is empty, do nothing.
        if (str == "") return;
        // A definition has been added! Create a new controller and assign it to this
        // (now-filled-in) label, remove this one, and make a fresh blank one.
        createDefinitionController(ctx, label, false, hooks);
        controller.remove();
        ctx.setCounter(ctx.getCounter() + 1);
        createDefinitionController(
          ctx,
          ctx.labelPrefix + ctx.getCounter(),
          true,
          hooks,
        );
        hooks.afterChange(true);
      } else if (str == "") {
        // The string is empty: delete this controller (its slider, if any, is a DOM
        // descendant of the controller and is removed along with it).
        controller.remove();
        ctx.labels.splice(ctx.labels.indexOf(label), 1);
        delete ctx.strs[label];
        if (controller.lastName) {
          hooks.onDeleted(controller.lastName);
          delete ctx.nameToCont[controller.lastName];
        }
        hooks.afterChange(false);
      } else {
        hooks.extraControllerSetup?.(controller, str);
        registerParsedName(ctx, controller, str, hooks);
        hooks.afterChange(false);
      }
    });

    hooks.extraControllerSetup?.(controller, ctx.strs[label]);
    return controller;
  }

  /**
   * Parses `str` as "name = ...", validates the name (hooks.validateName), and registers/
   * updates ctx.nameToCont + controller.lastName accordingly. A no-op if unparseable/invalid.
   */
  function registerParsedName(ctx, controller, str, hooks) {
    const parsed = parseNamedDefinition(str);
    if (!parsed || !hooks.validateName(parsed.name)) return;
    if (controller.lastName && controller.lastName != parsed.name) {
      delete ctx.nameToCont[controller.lastName];
    }
    controller.lastName = parsed.name;
    ctx.nameToCont[parsed.name] = controller;
  }

  /**
   * Rebuilds a "definitions list" folder from scratch to match `optionsStr` (a semicolon-
   * joined "name = definition;..." string): removes all existing controllers, clears ctx's
   * state in place, creates one real controller per non-empty definition (in a separate loop
   * after they're all initialised, so dependencies between them resolve correctly), then adds
   * one trailing empty controller for adding a new definition.
   */
  function rebuildDefinitionsFromString(ctx, hooks, optionsStr) {
    ctx.folder.__controllers.slice().forEach((c) => c.remove());
    ctx.labels.length = 0;
    Object.keys(ctx.strs).forEach((k) => delete ctx.strs[k]);
    Object.keys(ctx.nameToCont).forEach((k) => delete ctx.nameToCont[k]);
    ctx.setCounter(0);
    ctx.setNext(null);

    const newLabels = [];
    optionsStr.split(";").forEach((raw) => {
      let str = removeWhitespace(raw);
      if (str == "") return;
      const label = ctx.labelPrefix + ctx.getCounter();
      ctx.setCounter(ctx.getCounter() + 1);
      ctx.labels.push(label);
      ctx.strs[label] = str;
      newLabels.push(label);
    });
    newLabels.forEach((label) =>
      createDefinitionController(ctx, label, false, hooks),
    );
    // createDefinitionController's own isNext branch pushes the label and sets strs[label]
    // to "" itself - don't duplicate that here.
    createDefinitionController(
      ctx,
      ctx.labelPrefix + ctx.getCounter(),
      true,
      hooks,
    );
  }

  /**
   * Serializes a "definitions list"'s strs dict back into a single semicolon-joined string,
   * for storage in the corresponding options field.
   */
  function serializeDefinitions(strs) {
    return Object.values(strs)
      .map((str) => str.replaceAll(/"\s+"/g, " "))
      .join(";");
  }

  function getParamsContext() {
    return {
      folder: parametersFolder,
      strs: kineticParamsStrs,
      labels: kineticParamsLabels,
      nameToCont: kineticNameToCont,
      labelPrefix: "param",
      getCounter: () => kineticParamsCounter,
      setCounter: (v) => (kineticParamsCounter = v),
      setNext: (v) => (nextParamController = v),
    };
  }

  // A function (not a `const` object) because it's referenced from setParamsFromKineticString,
  // which initGUI() calls before this point in the file's top-to-bottom execution order would
  // otherwise be reached - `const`/`let` bindings aren't hoisted the way `function`
  // declarations are, so a `const` here would throw a temporal-dead-zone ReferenceError.
  function getParamHooks() {
    return {
      ariaLabel: "Custom parameter definition",
      placeholder: "Add parameter e.g. a=1 in [0,1]",
      validateName: validateParamName,
      onDeleted: (name) => {
        if (!isReservedName(name)) delete uniforms[name];
      },
      extraControllerSetup: (controller) => syncParamSlider(controller),
      afterChange: (isPromotion) => {
        setKineticStringFromParams();
        if (setComputedUniforms() || (isPromotion && compileErrorOccurred)) {
          compileErrorOccurred = false;
          updateShaders();
        }
      },
    };
  }

  /**
   * Creates/updates/removes a parameter controller's slider, based on whether its current
   * definition string is of the form "name = val in [min,(step,)max]". Reads/writes the
   * controller's bound value via controller.object[controller.property] (dat.gui's own
   * controller API) rather than a closed-over label, so it can be reused across every
   * parameter controller uniformly.
   */
  function syncParamSlider(controller) {
    const defStr = controller.object[controller.property];
    if (controller.lastString == defStr) return;
    controller.lastString = defStr;
    // Remove any existing slider if anything has changed.
    if (controller.slider) {
      controller.slider.remove();
      delete controller.slider;
      controller.domElement.closest("li").classList.remove("parameterSlider");
    }
    // If the string is of the form "name = val in [a,b]", create a slider underneath this
    // controller with limits a,b.
    const regex =
      /\s*(\w+)\s*=\s*(\S*)\s*in\s*[\[\(]([0-9\.\-]+)\s*,\s*(?:([0-9\.]*)\s*,)?\s*([0-9\.\-]+)[\]\)]/;
    const match = defStr.match(regex);
    if (!match) return;
    // Add a CSS class highlighting that this controller now contains a slider too.
    controller.domElement.parentElement.parentElement.classList.add(
      "parameterSlider",
    );
    // Create a range input object and tie it to the controller.
    controller.slider = document.createElement("input");
    controller.slider.classList.add("styled-slider");
    controller.slider.classList.add("slider-progress");
    controller.slider.type = "range";
    controller.slider.min = match[3];
    controller.slider.max = match[5];
    if (parseFloat(controller.slider.min) > parseFloat(controller.slider.max)) {
      let temp = controller.slider.min;
      controller.slider.min = controller.slider.max;
      controller.slider.max = temp;
    }

    let step;
    // Define the step of the slider, which may or may not have been given.
    if (match[4] == undefined) {
      match[4] = "";
      // Choose a step that either matches the max precision of the inputs, or splits the
      // interval into 20, whichever is more precise.
      controller.slider.precision =
        Math.max(
          parseFloat(match[2]).countDecimals(),
          parseFloat(controller.slider.min).countDecimals(),
          parseFloat(controller.slider.max).countDecimals(),
        ) + 1;
      step = Math.min(
        (parseFloat(controller.slider.max) -
          parseFloat(controller.slider.min)) /
          20,
        10 ** -controller.slider.precision,
      );
    } else {
      controller.slider.precision =
        Math.max(
          parseFloat(match[2]).countDecimals(),
          parseFloat(controller.slider.min).countDecimals(),
          parseFloat(match[4]).countDecimals(),
          parseFloat(controller.slider.max).countDecimals(),
        ) + 1;
      step = match[4];
      match[4] += ", ";
    }
    controller.slider.precision = Math.min(
      Math.max(controller.slider.precision, parseFloat(step).countDecimals()),
      10,
    );
    controller.slider.step = step.toString();

    // Assign the initial value, which should happen after step has been defined.
    controller.slider.value = match[2];

    // Use the input event of the slider to update the controller and the simulation.
    controller.slider.addEventListener("input", function () {
      controller.slider.style.setProperty("--value", controller.slider.value);
      const valueRegex = /\s*(\w+)\s*=\s*(\S*)\s*/g;
      controller.object[controller.property] = controller.object[
        controller.property
      ].replace(
        valueRegex,
        match[1] +
          " = " +
          parseFloat(controller.slider.value)
            .toFixed(controller.slider.precision)
            .toString() +
          " ",
      );
      refreshGUI(parametersFolder);
      setKineticStringFromParams();
      render();
      // Update the uniforms with this new value.
      if (setComputedUniforms() || compileErrorOccurred) {
        // Reset the error flag.
        compileErrorOccurred = false;
        // If we added a new uniform, we need to remake all the shaders.
        updateShaders();
      }
    });

    // Augment the onChange function of the controller to also update the slider.
    controller.__oldOnFinishChange = controller.onFinishChange;
    controller.onFinishChange = function () {
      controller.__oldOnFinishChange();
      controller.slider.value = match[2];
    };

    // Configure the slider's style so that it can be nicely formatted.
    controller.slider.style.setProperty("--value", controller.slider.value);
    controller.slider.style.setProperty("--min", controller.slider.min);
    controller.slider.style.setProperty("--max", controller.slider.max);

    // Add the slider to the DOM with an aria-label.
    controller.slider.setAttribute("aria-label", "Custom parameter slider");
    controller.domElement.appendChild(controller.slider);
    // Focus the slider.
    controller.slider.focus();
    // Record the string for checking for changes later.
    controller.lastString = defStr;
  }

  function setParamsFromKineticString() {
    // Take the kineticParams string in the options and use it to populate a GUI containing
    // these parameters as individual options.
    rebuildDefinitionsFromString(
      getParamsContext(),
      getParamHooks(),
      options.kineticParams,
    );
  }

  function setKineticStringFromParams() {
    // Combine the custom parameters into a single string for storage, so long as no reserved names are used.
    options.kineticParams = serializeDefinitions(kineticParamsStrs);
  }

  function getExpressionsContext() {
    return {
      folder: expressionsFolder,
      strs: expressionsStrs,
      labels: expressionsLabels,
      nameToCont: expressionNameToCont,
      labelPrefix: "expr",
      getCounter: () => expressionsCounter,
      setCounter: (v) => (expressionsCounter = v),
      setNext: (v) => (nextExpressionController = v),
    };
  }

  // A function (not a `const` object) for the same reason as getParamHooks() above.
  function getExpressionHooks() {
    return {
      ariaLabel: "Custom expression definition",
      placeholder: "Define notation e.g. f = u + 1",
      validateName: validateExpressionName,
      onDeleted: () => {},
      // Expressions can never be sliders, but they do get a "Show" toggle button controlling
      // whether they're typeset (see setupExpressionShowToggle).
      extraControllerSetup: setupExpressionShowToggle,
      afterChange: () => {
        setExpressionsStringFromExpressions();
        // Keep options.expressionsShow in sync with the current set of expression rows -
        // see setExpressionsShowStringFromControllers for why this is always safe/cheap to
        // just recompute from scratch here.
        setExpressionsShowStringFromControllers();
        // Unlike parameters (which only need a shader rebuild when a brand new uniform is
        // added), every expression change needs a full shader reconstruction - expressions
        // are substituted directly into shader source at construction time, not read as
        // uniforms.
        updateShaders();
        setEquationDisplayType();
      },
    };
  }

  function setExpressionsFromString() {
    // Take the expressions string in the options and use it to populate a GUI containing
    // these expressions as individual options.
    rebuildDefinitionsFromString(
      getExpressionsContext(),
      getExpressionHooks(),
      options.expressions,
    );
    // Restore each expression's "Show" toggle from options.expressionsShow (a "1"/"0" per
    // expression, in order - see setExpressionsShowStringFromControllers), then immediately
    // re-derive options.expressionsShow from the result so it's always exactly as long as
    // the current number of expressions, even if the persisted string was stale (e.g. left
    // over from a previously-loaded preset with a different number of expressions).
    applyExpressionsShowString(options.expressionsShow);
  }

  /**
   * Creates the "Show" toggle button for a real (non-blank) Expression row, appended inside
   * the controller's own domElement so - like Parameters' slider (see syncParamSlider) - it's
   * a DOM descendant of the row and gets removed automatically when the row does (see
   * createDefinitionController's onFinishChange). Styled like the toggle buttons elsewhere in
   * the UI (see addToggle/.toggle_button), on by default. A no-op for the trailing always-
   * empty "add new expression" row, and idempotent, since extraControllerSetup is invoked
   * again on every edit of an already-set-up row, not just on creation.
   */
  function setupExpressionShowToggle(controller) {
    if (controller === nextExpressionController || controller.showToggle)
      return;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.classList.add("toggle_button", "expr-show-toggle", "toggled_on");
    toggle.title = "Typeset this expression in the equations display";
    toggle.setAttribute("aria-pressed", "true");
    toggle.textContent = "Show";
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("toggled_on");
      toggle.setAttribute(
        "aria-pressed",
        toggle.classList.contains("toggled_on").toString(),
      );
      setExpressionsShowStringFromControllers();
      setEquationDisplayType();
    });
    controller.domElement.classList.add("hasShowToggle");
    controller.domElement.appendChild(toggle);
    controller.showToggle = toggle;
  }

  /**
   * The Expressions folder's real (non-blank) controllers, in display order - i.e. those with
   * a "Show" toggle button (see setupExpressionShowToggle), which excludes the trailing
   * always-empty "add new expression" row.
   */
  function getExpressionShowToggleControllers() {
    return expressionsFolder.__controllers.filter((c) => c.showToggle);
  }

  /**
   * Rebuilds options.expressionsShow (one "1"/"0" char per currently-defined expression, in
   * display order) from the live toggle-button DOM state, which is the single source of truth
   * for "should this expression be typeset". Called on every Expressions add/remove/edit (see
   * getExpressionHooks' afterChange) and after restoring persisted state (see
   * applyExpressionsShowString), so the option string is always exactly as long as the
   * current number of expressions - never longer, per the Expressions design.
   */
  function setExpressionsShowStringFromControllers() {
    options.expressionsShow = getExpressionShowToggleControllers()
      .map((c) => (c.showToggle.classList.contains("toggled_on") ? "1" : "0"))
      .join("");
  }

  /**
   * Applies a persisted options.expressionsShow string (see
   * setExpressionsShowStringFromControllers) to the toggle buttons just (re)created by
   * rebuildDefinitionsFromString - missing/extra characters default to "shown", so a shorter
   * string (a brand new expression added since the string was saved) or longer one (fewer
   * expressions than when it was saved) are both handled gracefully.
   */
  function applyExpressionsShowString(showStr) {
    getExpressionShowToggleControllers().forEach((c, i) => {
      const shown = !showStr || showStr[i] !== "0";
      c.showToggle.classList.toggle("toggled_on", shown);
      c.showToggle.setAttribute("aria-pressed", shown.toString());
    });
    setExpressionsShowStringFromControllers();
  }

  function setExpressionsStringFromExpressions() {
    // Combine the custom expressions into a single string for storage, so long as no
    // reserved names are used.
    options.expressions = serializeDefinitions(expressionsStrs);
  }

  /**
   * options.expressions could in principle contain surrounding whitespace per definition,
   * but (unlike kineticParams) has no extra directives to strip - kept as a thin wrapper for
   * symmetry with getKineticParamDefs/getExpressionNames/getExpressionNameVals below.
   */
  function getExpressionDefs() {
    return options.expressions;
  }

  function getExpressionNames() {
    const regex = /^\s*([a-zA-Z]\w*)\b/;
    let names = [];
    getExpressionDefs()
      .split(";")
      .filter((x) => x.length > 0)
      .forEach(function (x) {
        if (x.match(regex)) {
          names.push(x.match(regex)[1].trim());
        }
      });
    return names;
  }

  /**
   * Returns [name, rhs, shown] triples, one per defined expression, in order. `shown` is this
   * expression's "Show" checkbox state (see setExpressionsShowStringFromControllers), read
   * positionally from options.expressionsShow by index into the same non-empty, semicolon-
   * separated segments this parses - defaulting to true (shown) if that string is short (or
   * absent), so a segment gets a sensible default even before options.expressionsShow has
   * caught up with a just-added expression.
   */
  function getExpressionNameVals() {
    const regex = /^\s*([a-zA-Z]\w*)\b\s*=\s*(.*)/;
    const showStr = options.expressionsShow ?? "";
    let nameVals = [];
    getExpressionDefs()
      .split(";")
      .filter((x) => x.length > 0)
      .forEach(function (x, i) {
        const m = x.match(regex);
        if (m) {
          nameVals.push([m[1].trim(), m[2].trim(), showStr[i] !== "0"]);
        } else {
          throwError(
            "Unable to evaluate the expression definition '" +
              x +
              "'. Please check for syntax errors.",
          );
        }
      });
    return nameVals;
  }

  /**
   * Rebuilds expandedExpressionDefs (name -> fully dependency-resolved definition string),
   * checking for duplicate/cyclic expression names first. Called once at the start of every
   * updateShaders() - not from parseShaderString() itself, which is called many times per
   * shader rebuild - so a cyclic/duplicate error is reported once per rebuild, not once per
   * shader-string field. Cyclic names degrade to "0.0" (see expandDependentExpressions), so
   * shader construction still produces valid (if temporarily wrong) GLSL.
   */
  function refreshExpressionExpansions() {
    const nameVals = getExpressionNameVals();
    const dups = getDuplicates(nameVals.map((x) => x[0]));
    if (dups.length > 0) {
      throwError(
        "It looks like there are multiple definitions of '" +
          dups.join("', '") +
          "'. Please check your expressions to ensure everything has a unique definition.",
      );
    }
    const names = nameVals.map((x) => x[0]);
    const strDict = {};
    nameVals.forEach((x) => (strDict[x[0]] = x[1]));
    const [expanded, badNames] = expandDependentExpressions(strDict, names);
    if (badNames.length > 0) {
      throwError(
        "Cyclic expressions detected. Please check the definition(s) of " +
          badNames.join(", ") +
          ". Click <a href='/user-guide/FAQ#cyclic' target='blank'>here</a> for more information.",
      );
    }
    expandedExpressionDefs = expanded;
  }

  function addKineticParameterAfterError(paramName) {
    // Append a kinetic parameter to the end of the string that defines kinetic parameters.
    // First, check if the parameter is already present.
    let existingNames = getKineticParamNames();
    if (existingNames.includes(paramName)) return;
    if (nextParamController) {
      // If there is a next parameter controller, update its value as if the user had typed in a new parameter.
      const val = paramName + " = 0";
      nextParamController.setValue(val);
      nextParamController.__onFinishChange(nextParamController, val);
      // Fadeout the error and restart the simulation if it was running.
      fadeout("#error");
      if (runningBeforeError) {
        playSim();
      }
      return;
    } else {
      // Otherwise, we can't add the parameter automatically, so we throw an error to let the user know.
      throwError(
        "Could not add parameter '" +
          paramName +
          "' automatically. Please add it manually.",
      );
    }
  }

  function fromExternalLink() {
    const link = document.createElement("a");
    link.href = document.referrer; // This resolves the URL.
    return (
      link.href == window.location ||
      !link.href.includes(window.location.origin)
    );
  }

  function fadein(id) {
    $(id).removeClass("fading_out");
    $(id).show();
    $(id).addClass("fading_in");
  }

  function fadeout(id) {
    $(id).removeClass("fading_in");
    $(id).addClass("fading_out");
    setTimeout(function () {
      if ($(id).hasClass("fading_out")) {
        $(id).removeClass("fading_out");
        $(id).hide();
      }
    }, 1000);
  }

  function isFadingOut(id) {
    return $(id).hasClass("fading_out");
  }

  function configureColourbar() {
    if (options.colourbar || showColourbarOverride) {
      if (showColourbarOverride) $("#colourbar").removeClass("hidden");
      $("#colourbar").show();
      let cString = "linear-gradient(90deg, ";
      for (var val = 0; val < 1; val += 0.01) {
        cString +=
          "rgb(" +
          colourFromValue(val).map((x) => 255 * x) +
          ") " +
          100 * val +
          "%,";
      }
      cString = cString.slice(0, -1) + ")";
      $("#colourbar").css("background", cString);
      if (options.whatToPlot == "MAX") {
        $("#minLabel").html("$" + listOfSpecies[0] + "$");
        $("#midLabel").html("$" + listOfSpecies[1] + "$");
        $("#maxLabel").html("$" + listOfSpecies[2] + "$");
      } else {
        if (isStory) {
          $("#midLabel").html(
            options.views[options.activeViewInd].name.replaceAll(
              /\s*<br \/>\s*/g,
              " ",
            ),
          );
        } else {
          $("#midLabel").html("$" + parseStringToTEX(options.whatToPlot) + "$");
        }
      }
      runMathJax($("#midLabel"));
      updateColourbarLims();
    } else {
      $("#colourbar").hide();
    }
    checkColourbarPosition();
    checkColourbarLogoCollision();
  }

  function updateColourbarLims() {
    if (options.whatToPlot != "MAX") {
      // We want to display a string that is the shorter of 3 sig. fig. and 3 dec. places.
      let minStr, maxStr;
      [minStr, maxStr] = formatLabels(cLims[0], cLims[1]);
      // If either strings are just zeros, simply write 0.
      const regex = /[1-9]/;
      if (!regex.test(minStr)) minStr = "0";
      if (!regex.test(maxStr)) maxStr = "0";
      if (options.colourbarMinStr.trim() != "") {
        minStr = options.colourbarMinStr;
      }
      if (options.colourbarMaxStr.trim() != "") {
        maxStr = options.colourbarMaxStr;
      }
      $("#minLabel").html(minStr);
      $("#maxLabel").html(maxStr);
    }
    // Get the leftmost and rightmost colour values from the map.
    let leftColour = computeColourBrightness(colourFromValue(0));
    let midColour = computeColourBrightness(colourFromValue(0.5));
    let rightColour = computeColourBrightness(colourFromValue(1.0));

    const threshold = 0.51;
    if (leftColour < threshold) {
      // If the background colour is closer to black than white, set
      // the label to be white.
      $("#minLabel").css("color", "#fff");
    } else {
      $("#minLabel").css("color", "#000");
    }
    if (midColour < threshold) {
      // If the background colour is closer to black than white, set
      // the label to be white.
      $("#midLabel").css("color", "#fff");
    } else {
      $("#midLabel").css("color", "#000");
    }
    if (rightColour < threshold) {
      // If the background colour is closer to black than white, set
      // the label to be white.
      $("#maxLabel").css("color", "#fff");
    } else {
      $("#maxLabel").css("color", "#000");
    }
  }

  function formatLabelNum(num, depth) {
    return num.toPrecision(depth);
  }

  function shortestStringNum(num, depth) {
    num = parseFloat(num);
    const dec = num.toFixed(depth);
    const sig = num.toPrecision(depth);
    return dec.length < sig.length ? dec : sig;
  }

  function formatLabels(min, max) {
    const depth = 3;
    // Check if both numbers are close to zero, in which case use exponential notation.
    if (Math.abs(min) < 0.001 && Math.abs(max) < 0.001) {
      return [min.toExponential(depth - 1), max.toExponential(depth - 1)];
    }
    // Otherwise, use the shorter of dp or sig fig for each.
    return [shortestStringNum(min, depth), shortestStringNum(max, depth)];
  }

  function configureTimeDisplay() {
    if (options.timeDisplay) {
      $("#timeDisplay").show();
      updateTimeDisplay();
    } else {
      $("#timeDisplay").hide();
    }
    orderTimeIntegralDisplays();
  }

  function updateTimeDisplay() {
    if (options.timeDisplay) {
      let str = formatLabelNum(uniforms.t.value, 3);
      str = str.replace(/e(\+)*(\-)*([0-9]*)/, " × 10<sup>$2$3<sup>");
      $("#timeValue").html(str);
      checkColourbarPosition();
    }
  }

  function configureIntegralDisplay() {
    if (options.integrate) {
      $("#integralDisplay").show();
      let str = "";
      options.dimension == 1 ? (str += "$\\int") : (str += "$\\iint");
      str += "_{\\domain}" + parseStringToTEX(options.whatToPlot) + "\\,\\d x";
      options.dimension == 1 ? {} : (str += "\\d y");
      $("#integralLabel").html(str + " = $");
      runMathJax($("#integralLabel"));
    } else {
      $("#integralDisplay").hide();
    }
    orderTimeIntegralDisplays();
  }

  function configureDataContainer() {
    // Show the dataContainer element, ready for showing any data. Doing it this way prevents
    // it flashing on load.
    $("#dataContainer").show();
  }

  function nudgeUIUp(id, num) {
    $(id).css("bottom", "");
    $(id).css("bottom", "+=" + num.toString());
  }

  function orderTimeIntegralDisplays() {
    options.integrate && options.timeDisplay
      ? nudgeUIUp("#timeDisplay", 10)
      : nudgeUIUp("#timeDisplay", 0);
  }

  function updateIntegralDisplay() {
    if (options.integrate) {
      fillBuffer();
      let dA;
      if (options.dimension == 1) {
        dA = uniforms.dx.value;
      } else if (options.dimension == 2) {
        dA = uniforms.dx.value * uniforms.dy.value;
      }
      let total = 0;
      for (let i = 0; i < buffer.length; i += 4) {
        total += buffer[i] * (1 - buffer[i + 1]);
      }
      total *= dA;
      $("#integralValue").html(formatLabelNum(total, 4));
      checkColourbarPosition();
    }
  }

  function checkForNaN() {
    // Check to see if a NaN value is in the first entry of the simulation array, which would mean that we've hit overflow or instability.
    const valueRange = setMinMaxValGPU();
    if (
      (shouldCheckNaN &&
        (!isFinite(valueRange[0]) ||
          Math.abs(valueRange[0]) > 1e37 ||
          !isFinite(valueRange[1]))) ||
      Math.abs(valueRange[1]) > 1e37
    ) {
      hitNaN();
    } else {
      NaNTimer = setTimeout(checkForNaN, 1000);
    }
  }

  function hitNaN() {
    shouldCheckNaN = false;
    if ($("#oops_hit_nan").is(":visible")) return;
    if (!shouldShowErrors()) {
      resetSim();
      restartNaNChecking();
      return;
    }
    fadein("#oops_hit_nan");
    pauseSim();
    $("#erase").one("pointerdown", function () {
      fadeout("#oops_hit_nan");
      restartNaNChecking();
    });
  }

  function restartNaNChecking() {
    shouldCheckNaN = true;
    window.clearTimeout(NaNTimer);
    NaNTimer = setTimeout(checkForNaN, 1000);
  }

  function fillBuffer() {
    if (!bufferFilled) {
      try {
        renderer.readRenderTargetPixels(
          postTexture,
          0,
          0,
          nXDisc,
          nYDisc,
          buffer,
        );
      } catch {
        alert(
          "Sadly, your configuration is not fully supported by VisualPDE. Some features may not work as expected, but we encourage you to try!",
        );
      }
      bufferFilled = true;
    }
  }

  function setMinMaxValGPU() {
    // Get the min and max vals in postTexture, using a shader to compute min and max on the GPU.
    simDomain.material = minMaxMaterial;
    minMaxUniforms.textureSource.value = postTexture.texture;
    minMaxUniforms.srcResolution.value = new THREE.Vector2(nXDisc, nYDisc);
    minMaxUniforms.firstFlag.value = true;
    for (const curTex of reductionTextures) {
      renderer.setRenderTarget(curTex);
      renderer.render(simDomain, simCamera);
      minMaxUniforms.textureSource.value = curTex.texture;
      minMaxUniforms.srcResolution.value = new THREE.Vector2(
        curTex.width,
        curTex.height,
      );
      minMaxUniforms.firstFlag.value = false;
    }
    try {
      const smallBuffer = new Float32Array(4);
      renderer.readRenderTargetPixels(
        reductionTextures.slice(-1)[0],
        0,
        0,
        1,
        1,
        smallBuffer,
      );
      return [smallBuffer[0], smallBuffer[1]];
    } catch {
      alert(
        "Sadly, your configuration is not fully supported by VisualPDE. Some features may not work as expected, but we encourage you to try!",
      );
      return [0, 1];
    }
  }

  function computeTextureSumGPU() {
    // Get the sum of vals in postTexture, using a shader to compute this on the GPU. Returns
    // all 4 (r,g,b,a) channel sums at once - sumShader() sums each channel independently, so
    // this doubles as the reduction for up to 4 simultaneous global integrals.
    simDomain.material = sumMaterial;
    minMaxUniforms.textureSource.value = postTexture.texture;
    minMaxUniforms.srcResolution.value = new THREE.Vector2(nXDisc, nYDisc);
    for (const curTex of reductionTextures) {
      renderer.setRenderTarget(curTex);
      renderer.render(simDomain, simCamera);
      minMaxUniforms.textureSource.value = curTex.texture;
      minMaxUniforms.srcResolution.value = new THREE.Vector2(
        curTex.width,
        curTex.height,
      );
    }
    try {
      const smallBuffer = new Float32Array(4);
      renderer.readRenderTargetPixels(
        reductionTextures.slice(-1)[0],
        0,
        0,
        1,
        1,
        smallBuffer,
      );
      return smallBuffer;
    } catch {
      alert(
        "Sadly, your configuration is not fully supported by VisualPDE. Some features may not work as expected, but we encourage you to try!",
      );
      return new Float32Array(4);
    }
  }

  function checkColourbarPosition() {
    // If there's a potential overlap of the data display and the colourbar, move the former up.
    if (options.colourbar && (options.integrate || options.timeDisplay)) {
      let colourbarDims = $("#colourbar")[0].getBoundingClientRect();
      let bottomElm;
      options.integrate
        ? (bottomElm = $("#integralDisplay")[0])
        : (bottomElm = $("#timeDisplay")[0]);
      let bottomDims = bottomElm.getBoundingClientRect();
      // If the colour overlaps the bottom element (or is above it and would otherwise overlap).
      if (colourbarDims.right >= bottomDims.left) {
        if (colourbarDims.top <= bottomDims.bottom) {
          nudgeUIUp("#dataContainer", 40);
          dataNudgedUp = true;
        }
      } else {
        if (dataNudgedUp) {
          nudgeUIUp("#dataContainer", 0);
          dataNudgedUp = false;
        }
      }
    }
    // If there's a potential overlap of the probe display and the colourbar, move the former up.
    if (options.colourbar && options.probing) {
      let colourbarDims = $("#colourbar")[0].getBoundingClientRect();
      let probeDims = $("#probeChartContainer")[0].getBoundingClientRect();
      // If the colour overlaps the bottom element (or is above it and would otherwise overlap).
      if (probeDims.right >= colourbarDims.left) {
        if (colourbarDims.top <= probeDims.bottom) {
          nudgeUIUp("#probeChartContainer", 40);
          probeNudgedUp = true;
        }
      } else {
        if (probeNudgedUp) {
          nudgeUIUp("#probeChartContainer", 0);
          probeNudgedUp = false;
        }
      }
    } else {
      if (probeNudgedUp) {
        nudgeUIUp("#probeChartContainer", 0);
        probeNudgedUp = false;
      }
    }
  }

  function configureManualInterpolation() {
    if (isManuallyInterpolating()) {
      simTextures.forEach((simTex) => {
        simTex.texture.magFilter = THREE.NearestFilter;
      });
      postTexture.texture.magFilter = THREE.NearestFilter;
      interpolationTexture.texture.magFilter = THREE.NearestFilter;
    } else {
      simTextures.forEach((simTex) => {
        simTex.texture.magFilter = THREE.LinearFilter;
      });
      postTexture.texture.magFilter = THREE.LinearFilter;
      interpolationTexture.texture.magFilter = THREE.LinearFilter;
    }
    // Trigger a refresh of the textures (oddly, setting needsUpdate doesn't seem to work).
    nudgeTextureSizeUpDown();
    // Refresh the GUI.
    configureGUI();
  }

  function isManuallyInterpolating() {
    return (
      manualInterpolationNeeded ||
      options.forceManualInterpolation ||
      options.automataMode
    );
  }

  function isReturningUser() {
    return localStorage.getItem("visited");
  }

  function setReturningUser() {
    localStorage.setItem("visited", true);
  }

  function setCookieConsent() {
    localStorage.setItem("ga-consent", "true");
    if (typeof gtag_config === "function") gtag_config();
  }

  function seenFullWelcomeUser() {
    return localStorage.getItem("seenFullWelcome");
  }

  function setSeenFullWelcomeUser() {
    localStorage.setItem("seenFullWelcome", true);
  }

  // Wraps the logic gating whether "What's new" popups should be shown, so
  // it can diverge from shouldShowErrors() independently in future.
  function shouldShowUpdatesMessage() {
    return shouldShowErrors();
  }

  // Shows the "What's new" popup identified by id, provided today's date is
  // before expiryDate and this user hasn't already dismissed it. Resolves
  // once the user has dismissed the message (or immediately, if it's not
  // shown). id should be unique per update, so unrelated updates each get
  // their own localStorage entry and their own one-time showing.
  async function showUpdatesMessage(id, expiryDate) {
    if (
      !shouldShowUpdatesMessage() ||
      new Date() >= new Date(expiryDate) ||
      localStorage.getItem("seenUpdate:" + id)
    ) {
      return;
    }
    $("#updates-message").css("display", "block");
    await waitListener(
      document.getElementById("updates_message_ok"),
      "click",
      true,
    );
    $("#updates-message").css("display", "none");
    localStorage.setItem("seenUpdate:" + id, true);
  }

  function waitListener(element, listenerName, val) {
    return new Promise(function (resolve, reject) {
      var listener = (event) => {
        element.removeEventListener(listenerName, listener);
        resolve(val);
      };
      element.addEventListener(listenerName, listener);
    });
  }

  function getReservedStrs(exclusions) {
    // Load an RD shader and find floats, vecs, and ivecs.
    let regex = /(?:float|vec\d|ivec\d|function|void)\b\s+(\w+)\b/g;
    let str = RDShaderTop() + RDShaderUpdateCross() + auxiliary_GLSL_funs();
    let reserved = [...str.matchAll(regex)]
      .map((x) => x[1])
      .concat(exclusions)
      .concat([
        "I_T",
        "I_TR",
        "I_TG",
        "I_TB",
        "I_TA",
        "I_S",
        "I_SR",
        "I_SG",
        "I_SB",
        "I_SA",
      ]);
    return reserved;
  }

  function isReservedName(name, exclusions) {
    if (exclusions == undefined) exclusions = [];
    return getReservedStrs(exclusions).some(function (badName) {
      let regex = new RegExp("\\b" + badName + "\\b", "g");
      return regex.test(name);
    });
  }

  function replaceUserDefReac(str, regex, input) {
    // Insert user-defined input into str in place of original.
    // E.g. str = some TeX, regex = /\bf\b/g; input = "2*a".
    // If the input is 0, just remove the original from str.
    if (input.replace(/\s+/g, "  ").trim() == "0")
      return str.replaceAll(regex, "");
    // If the input contains letters (like parameters), insert it with delimiters.
    if (input.match(/[a-zA-Z]/)) return str.replaceAll(regex, input);
    // If it's just a scalar, keep the original, but replace old species with new.
    return str;
  }

  function replaceUserDefTimescale(str, regex, input) {
    if (!options.timescales) return str.replaceAll(regex, "");
    // Special cases.
    let trimmed = input.replace(/\s+/g, "  ").trim();
    if (["1", "1.0"].includes(trimmed)) return str.replaceAll(regex, "");
    if (["-1", "-1.0"].includes(trimmed)) return str.replaceAll(regex, "-");
    // If the input contains a + or -, add parentheses.
    if (input.match(/[\+\-]/)) input = "(" + input + ")";
    return str.replaceAll(regex, input);
  }

  function replaceUserDefDiff(str, regex, input, delimiters) {
    // Insert user-defined input into str in place of original, surrounded by delimiters.
    // E.g. str = some TeX, regex = /(D_{uu}) (\\vnabla u)/g; input = "2*a"; delimiters = " ";
    // If the input is 0, just remove the original from str.
    if (delimiters == undefined) delimiters = "  ";
    // Special cases.
    let trimmed = input.replace(/\s+/g, "  ").trim();
    if (["0", "0.0", "-0", "-0.0", "+0", "+0.0"].includes(trimmed))
      return str.replaceAll(regex, "");
    if (trimmed == "1" || trimmed == "1.0") return str.replaceAll(regex, "$2");
    if (trimmed == "-1" || trimmed == "-1.0")
      return str.replaceAll(regex, delimiters[0] + "-" + delimiters[1] + "$2");
    // Otherwise, just do the substitution.
    return str.replaceAll(regex, delimiters[0] + input + delimiters[1] + "$2");
  }

  function configurePlotType() {
    // Configure the simulation to plot the solution as requested.
    if (options.plotType == "line") {
      wasLinePlot = true;
      setLineWidth();
      options.brushType = "vline";
      setBrushType();
      refreshGUI(rightGUI);
      domain.visible = false;
      line.visible = true;
      // Toggle off options that have to be toggled off, and update the current View to reflect this.
      let keys = ["contours", "emboss", "vectorField"];
      keys.forEach(function (key) {
        options[key] = false;
        updateView(key);
      });
      configureVectorField();
    } else {
      if (wasLinePlot && options.dimension > 1) {
        wasLinePlot = false;
        options.brushType = "circle";
        setBrushType();
      }
      domain.visible = true;
      line.visible = false;
      if (options.plotType == "surface") {
        $("#simCanvas").css("outline", "2px #000 solid");
        if (usingLowResDomain) {
          usingLowResDomain = false;
          replaceDisplayDomains();
        }
        // Toggle off options that have to be toggled off, and update the current View to reflect this.
        let keys = ["vectorField"];
        keys.forEach(function (key) {
          options[key] = false;
          updateView(key);
        });
        configureVectorField();
      } else {
        $("#simCanvas").css("outline", "");
      }
    }
    overlayLine.visible = options.overlay && options.plotType == "line";
    setDisplayColourAndType();
    configureCameraAndClicks();
    configureGUI();
    configureCursorDisplay();
  }

  function configureDimension() {
    // Configure the dimension of the equations.
    if (!isLoading) {
      if (options.dimension != 1 && options.plotType == "line") {
        options.plotType = "plane";
        updateView("plotType");
        // Loop through all the views and, if they specify a plotType, set it to plane.
        options.views.forEach(function (view) {
          if (view.plotType != undefined) view.plotType = "plane";
        });
        configurePlotType();
      }
      if (options.dimension == 1 && options.plotType != "line") {
        options.plotType = "line";
        options.vectorField = false;
        updateView("plotType");
        // Loop through all the views and, if they specify a plotType, set it to line. Similarly, disable vector fields.
        options.views.forEach(function (view) {
          if (view.plotType != undefined) view.plotType = "line";
          if (view.vectorField != undefined) view.vectorField = false;
        });
        configurePlotType();
      }
    }
    if (options.dimension == 1) options.minY = "0.0";
    uniforms.isTwoD.value = options.dimension == 2;
    resize();
    setRDEquations();
    setEquationDisplayType();
    configureGUI();
    configureIntegralDisplay();
  }

  function setCameraPos() {
    const theta = options.plotType == "line" ? 0 : options.cameraTheta;
    const phi = options.plotType == "line" ? 0 : options.cameraPhi;
    const pos = new THREE.Vector3().setFromSphericalCoords(
      1,
      Math.PI / 2 - (theta * Math.PI) / 180,
      -(phi * Math.PI) / 180,
    );
    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(0, 0, 0);
  }

  function checkColourbarLogoCollision() {
    // If the logo and the colourbar overlap, remove the logo.
    if ($("#logo").is(":visible") && $("#colourbar").is(":visible")) {
      if (
        $("#logo")[0].getBoundingClientRect().right >=
        $("#colourbar")[0].getBoundingClientRect().left
      ) {
        $("#logo").hide();
      }
    }
  }

  function getKineticParamDefs() {
    // options.kineticParams could contain additional directives, like "in [0,1]", used
    // to create additional controllers. We want to save these in options.kineticParams, but
    // can't pass them to the shader like this. Here, we strip these directives from the string.
    // If a kineticParam is of the form "name = val in [a,b]", remove the in [a,b] part.
    let out = options.kineticParams.replaceAll(/\bin[^;]*;?/g, ";");

    return out;
  }

  function getKineticParamNames() {
    // Return a list of parsed kinetic parameter names.
    const regex = /^\s*([a-zA-Z]\w*)\b/;
    let names = [];
    getKineticParamDefs()
      .split(";")
      .filter((x) => x.length > 0)
      .forEach(function (x) {
        if (x.match(regex)) {
          names.push(x.match(regex)[1].trim());
        }
      });
    return names;
  }

  function getKineticParamNameVals() {
    // Return a list of pairs of kinetic parameter names and value strings.
    const regex = /^\s*([a-zA-Z]\w*)\b\s*=\s*(.*)/;
    let nameVals = [];
    getKineticParamDefs()
      .split(";")
      .filter((x) => x.length > 0)
      .forEach(function (x) {
        const m = x.match(regex);
        if (m) {
          nameVals.push([m[1].trim(), m[2].trim()]);
        } else {
          throwError(
            "Unable to evaluate the parameter definition '" +
              x +
              "'. Please check for syntax errors.",
          );
        }
      });
    return nameVals;
  }

  function setComputedUniforms() {
    // Set uniforms based on the parameters defined in kineticParams.
    // Return true if we're adding a new uniform, which signifies that all shaders must be
    // updated to reference this new uniform.
    kineticParamsVals = evaluateParamVals();
    // Check for any duplicated parameter names.
    const dups = getDuplicates(getKineticParamNames());
    if (dups.length > 0) {
      throwError(
        "It looks like there are multiple definitions of '" +
          dups.join("', '") +
          "'. Please check your parameters to ensure everything has a unique definition.",
      );
      return false;
    }
    let addingNewUniform = false;
    let encounteredError = false;
    for (const nameVal of kineticParamsVals) {
      let [uniformFlag, errorFlag] = setKineticUniform(nameVal[0], nameVal[1]);
      addingNewUniform |= uniformFlag;
      encounteredError |= errorFlag;
    }
    if (cLimsDependOnParams) setColourRangeFromDef();
    setAutoPauseStopValue();
    return addingNewUniform && !encounteredError;
  }

  function setKineticUniform(name, value) {
    // Set a uniform with given name and value.
    // Return true if we're adding a new uniform, which signifies that all shaders must be
    // updated to reference this new uniform.
    let addingNewUniform = false;
    let errorFlag = false;
    if (isReservedName(name)) {
      throwError(
        "The name '" +
          name +
          "' is used under the hood, so can't be used as a parameter name. Please use a different name for " +
          name +
          ".",
      );
      errorFlag = true;
    } else {
      // If no such uniform exists, make a note of this.
      addingNewUniform = !uniforms.hasOwnProperty(name);
      // Define the required uniform.
      uniforms[name] = {
        type: "float",
        value: value,
      };
    }
    return [addingNewUniform, errorFlag];
  }

  function kineticUniformsForShader() {
    // Given the kinetic parameters in options.kineticParams, return GLSL defining uniforms with
    // these names.
    return getKineticParamNames()
      .map((x) => "uniform float " + x + ";")
      .join("\n");
  }

  /**
   * Returns a list of (name,value) pairs for parameters defined in a list of strings.
   * These can depend on each other, but not cyclically.
   *
   * @param {string[]} strs - Extra (name, value) pairs to evaluate alongside the kinetic
   *   parameters, which are always included.
   * @returns {[string, any][]} A list of (name, value) pairs for the evaluated parameters.
   */
  function evaluateParamVals(strs) {
    let nameVals = getKineticParamNameVals();
    if (strs) nameVals.push(...strs);
    const names = nameVals.map((x) => x[0]);
    const strDict = {};
    nameVals.forEach((x) => (strDict[x[0]] = x[1]));
    const [valDict, badNames] = evaluateDependentNumerics(strDict, names);
    // If the parameters were cyclic, throw an error.
    if (badNames.length > 0) {
      throwError(
        "Cyclic parameters detected. Please check the definition(s) of " +
          badNames.join(", ") +
          ". Click <a href='/user-guide/FAQ#cyclic' target='blank'>here</a> for more information.",
      );
    }
    return Object.keys(valDict).map((x) => [x, valDict[x]]);
  }

  /**
   * Sets the colour range based on the current min and max values.
   * @name setColourRangeFromDef
   * @returns {void}
   */
  function setColourRangeFromDef() {
    cLims = evaluateMinMaxVals();
    // Check if the colour limits need to be evaluated (ie do they contain non-numeric values).
    cLimsDependOnParams = doColourLimsNeedEvaluating();
    uniforms.minColourValue.value = cLims[0];
    uniforms.maxColourValue.value = cLims[1];
    updateColourbarLims();
  }

  /**
   * Evaluates expressions for min and max colours using the parameter values in kineticParamsVals.
   * @returns {void}
   */
  function evaluateMinMaxVals() {
    // Using the parameter values in kineticParamsVals, evaluate expressions for min and max colours.
    let min = options.minColourValue.toString();
    let max = options.maxColourValue.toString();
    try {
      cLims[0] = evaluateWithParams(min);
    } catch (error) {
      throwError(
        `Unable to evaluate ${min}. Please check the definition of the minimum colour limit.`,
      );
    }
    try {
      cLims[1] = evaluateWithParams(max);
    } catch (error) {
      throwError(
        `Unable to evaluate ${max}. Please check the definition of the maximum colour limit.`,
      );
    }
    return cLims;
  }

  /**
   * Checks if the color limits need to be evaluated (ie do they contain non-numeric values).
   * @returns {boolean} Returns true if the color limits need to be evaluated, false otherwise.
   */
  function doColourLimsNeedEvaluating() {
    return (
      /[^\.0-9\s]+/.test(options.minColourValue) ||
      /[^\.0-9\s]+/.test(options.maxColourValue)
    );
  }

  /**
   * Updates all the shaders that are constructed using user input.
   * @returns {void}
   */
  function updateShaders() {
    // Must run before anything below - parseShaderString() (called throughout the following
    // builders) substitutes expression names using the map this rebuilds.
    refreshExpressionExpansions();
    // Likewise must run before anything below that could reference an Int(...) expression -
    // see reconcileGlobalIntegrals(). Also called independently at the top of each of the
    // narrower builders below, since they're each reachable directly from a field's
    // onFinishChange without going through updateShaders() first; redundant calls here are
    // cheap no-ops (reconcileGlobalIntegrals only does real work when the slot assignment
    // actually changes).
    reconcileGlobalIntegrals();
    setRDEquations();
    setClearShader();
    setProbeShader();
    setGlobalIntegralShader();
    setBrushType();
    updateWhatToPlot();
    setDrawAndDisplayShaders();
    setPostFunFragShader();
  }

  /**
   * Resizes the equation display to fit the screen by iteratively reducing the font size until the container
   * no longer encroaches on the right-hand side of the screen.
   * @returns {void}
   */
  function resizeEquationDisplay() {
    const el = $("#equation_display div mjx-container").children("mjx-math");
    var fontSize;
    // Reset the font size.
    el.css("font-size", "");
    var count = 0;
    if ($("#leftGUI")[0] == undefined) return;
    const rGUI = $("#rightGUI")[0];
    var rGUICorrection = 0;
    if (rGUI != undefined) rGUICorrection = rGUI.getBoundingClientRect().width;
    // If the equation display is too wide, reduce the font size. Do this at most 20 times.
    while (
      (count < 20) &
      ($("#equation_display")[0].getBoundingClientRect().right >=
        window.innerWidth - 65 - rGUICorrection) &
      ($("#equation_display")[0].getBoundingClientRect().width >
        $("#leftGUI")[0].getBoundingClientRect().width)
    ) {
      // Reduce the font size by 10% each time.
      fontSize = (parseFloat(el.css("font-size")) * 0.9).toString() + "px";
      el.css("font-size", fontSize);
      count += 1;
    }

    // Set the left gui max height based on its position.
    $(":root").css(
      "--left-ui-v-offset",
      $("#leftGUI")[0].getBoundingClientRect().top,
    );
  }

  /**
   * Computes the brightness of a given color represented as an array of RGB values.
   * @param {number[]} col - An array of RGB values representing a color.
   * @returns {number} The brightness of the color.
   */
  function computeColourBrightness(col) {
    return col.reduce((a, b) => a + b, 0) / 3;
  }

  /**
   * Sets the range of the colour axis based on the extremes of the computed values.
   * @returns {void}
   */
  function setColourRangeSnap() {
    cLims = setMinMaxValGPU();
    options.minColourValue = String(cLims[0]);
    options.maxColourValue = String(cLims[1]);
    updateView("minColourValue");
    updateView("maxColourValue");
    uniforms.minColourValue.value = cLims[0];
    uniforms.maxColourValue.value = cLims[1];
    controllers["maxColourValue"].updateDisplay();
    controllers["minColourValue"].updateDisplay();
    updateColourbarLims();
  }

  /**
   * Updates the dropdown of a dat.GUI controller.
   * @param {dat.GUIController} controller - The dat.GUI controller to update.
   * @param {Array<string>} labels - The labels to display in the dropdown.
   * @param {Array<string>} [values=labels] - The values to associate with each label in the dropdown. If not provided, the labels will be used as values.
   */
  function updateGUIDropdown(controller, labels, values) {
    // Update the dropdown of a dat.GUI controller.
    if (values == undefined) {
      values = labels;
    }
    let innerHTMLStr = "";
    for (var i = 0; i < labels.length; i++) {
      var str =
        "<option value='" +
        values[i].toString() +
        "'>" +
        labels[i].toString() +
        "</option>";
      innerHTMLStr += str;
    }
    controller.domElement.children[0].innerHTML = innerHTMLStr;
  }

  /**
   * Parses species names from options.
   * @returns {string[]} An array of parsed species names.
   */
  // NB: slicing to defaultSpecies.length (now 8) means this will accept up to 8 custom
  // names as soon as they're typed, even though the numSpecies dropdown (and everything
  // downstream of it) is still capped at 4 until the GUI stage of the 8-species upgrade.
  // Harmless only because nothing currently reachable from the UI can set numSpecies>4.
  function parseSpeciesNamesFromOptions() {
    return options.speciesNames
      .replaceAll(/\W+/g, " ")
      .trim()
      .split(" ")
      .slice(0, defaultSpecies.length);
  }

  function speciesNamesToString() {
    // Prune and return the species names as a string.
    return listOfSpecies.slice(0, options.numSpecies).join(" ");
  }

  /**
   * Sets custom names for species and reactions, swapping out species in all user-editable strings.
   * @returns {void}
   */
  function setCustomNames(overrideIsLoading = false) {
    let oldListOfSpecies;
    if (listOfSpecies != undefined) {
      oldListOfSpecies = listOfSpecies;
    }
    const newSpecies = parseSpeciesNamesFromOptions();

    // If not enough species have been provided, add placeholders for those remaining.
    const tempListOfSpecies = newSpecies.concat(
      placeholderSp.slice(newSpecies.length),
    );

    // Check if any reserved names have been used, and stop if so.
    const kinParamNames = getKineticParamNames();
    let message;
    for (var ind = 0; ind < tempListOfSpecies.length; ind++) {
      if (isReservedName(tempListOfSpecies[ind], kinParamNames)) {
        if (kinParamNames.includes(tempListOfSpecies[ind])) {
          message = "as a parameter";
        } else {
          message = "under the hood";
        }
        throwError(
          "The name '" +
            tempListOfSpecies[ind] +
            "' is used " +
            message +
            ", so can't be used as a species name. Please use a different name for " +
            tempListOfSpecies[ind] +
            ".",
        );
        return;
      }
    }

    // Now that we know all the names are valid, assign the names to the global variables.
    listOfSpecies = tempListOfSpecies;
    listOfReactions = listOfSpecies.map((x) => "f_{" + x + "}");

    // Define non-capturing strings that are equivalent to the old [uvwq], [vwq] etc in regexes.
    genAnySpeciesRegexStrs();

    // Configuring the GUI requires strings for D_{u u} etc, so we'll modify the strings here for later use.
    let defaultStrings = {
      ...getDefaultTeXLabelsDiffusion(),
      ...getDefaultTeXLabelsBCsICs(),
      ...getDefaultTeXLabelsTimescales(),
    };
    Object.keys(defaultStrings).forEach(function (key) {
      TeXStrings[key] = parseStringToTEX(
        replaceSymbolsInStr(
          defaultStrings[key],
          defaultSpecies,
          listOfSpecies,
          "_(?:[xy][xybf]?)",
        ),
      );
    });

    // Configuring the GUI requires strings for f, g etc, so we'll modify the default strings for use here
    // via placeholders.
    defaultStrings = getDefaultTeXLabelsReaction();
    Object.keys(defaultStrings).forEach(function (key) {
      TeXStrings[key] = parseStringToTEX(
        replaceSymbolsInStr(
          defaultStrings[key],
          defaultReactions,
          listOfReactions,
        ),
      );
    });

    // Don't update the problem if we're just loading in, as this will be done as part of loading.
    if (isLoading && !overrideIsLoading) return;

    // If we're not loading in, go through options and replace the old species with the new ones.
    const excludes = [
      "initCond_1",
      "initCond_2",
      "initCond_3",
      "initCond_4",
      "kineticParams",
    ];
    Object.keys(options).forEach(function (key) {
      if (userTextFields.includes(key)) {
        if (!excludes.includes(key)) {
          options[key] = replaceSymbolsInStr(
            options[key],
            oldListOfSpecies,
            listOfSpecies,
            "_(?:[xy][xybf]?)",
          );
        }
      }
    });
    options.views = options.views.map(function (view) {
      let newView = JSON.parse(JSON.stringify(view));
      Object.keys(view).forEach(function (key) {
        if (userTextFields.includes(key)) {
          newView[key] = replaceSymbolsInStr(
            view[key],
            oldListOfSpecies,
            listOfSpecies,
            "_(?:[xy][xybf]?)",
          );
        }
      });
      return newView;
    });
    // Do the same for savedOptions.
    Object.keys(savedOptions).forEach(function (key) {
      if (userTextFields.includes(key)) {
        if (!excludes.includes(key)) {
          savedOptions[key] = replaceSymbolsInStr(
            savedOptions[key],
            oldListOfSpecies,
            listOfSpecies,
            "_(?:[xy][xybf]?)",
          );
        }
      }
    });
    savedOptions.views = savedOptions.views.map(function (view) {
      let newView = JSON.parse(JSON.stringify(view));
      Object.keys(view).forEach(function (key) {
        if (userTextFields.includes(key)) {
          newView[key] = replaceSymbolsInStr(
            view[key],
            oldListOfSpecies,
            listOfSpecies,
            "_(?:[xy][xybf]?)",
          );
        }
      });
      return newView;
    });
    configureOptions();
    configureGUI();
    updateShaders();
    setEquationDisplayType();
  }

  /**
   * Generates an array of strings defining regular expression that are equivalent to [uvwq], [vwq], [wq], [q] but with
   * the new species inserted. Sorts before forming regex to pick up nested species.
   */
  function genAnySpeciesRegexStrs() {
    // Generate RegExp that is equivalent to [uvwq], [vwq], [wq], [q] but with
    // the new species inserted. Sort before forming regex to pick up nested species.
    anySpeciesRegexStrs = [];
    for (let i = 0; i < listOfSpecies.length; i++) {
      anySpeciesRegexStrs.push(
        "(?:" +
          listOfSpecies
            .slice(i)
            .sort((a, b) => b.length - a.length)
            .map((x) => "(?:" + x + ")")
            .join("|") +
          ")",
      );
    }
  }

  /**
   * Replaces all the symbols from originals, found as whole words, with those in replacements, allowing for an optional trailing regex.
   * @param {string} str - The string to replace symbols in.
   * @param {string[]} originals - The original symbols to replace.
   * @param {string[]} replacements - The replacement symbols.
   * @param {string} [optional] - An optional trailing regex.
   * @returns {string} The string with replaced symbols.
   */
  function replaceSymbolsInStr(str, originals, replacements, optional) {
    if (optional == undefined) optional = "";
    const placeholders = new Array(originals.length)
      .fill(0)
      .map((x, i) => "PLACE" + i.toString());
    let regex;
    // Substitute in placeholders first.
    for (var ind = 0; ind < originals.length; ind++) {
      regex = new RegExp(
        "\\b(" + originals[ind] + ")(" + optional + ")?\\b",
        "g",
      );
      str = str.replaceAll(regex, placeholders[ind] + "$2");
    }
    // Now swap the placeholders for the new reactions.
    for (var ind = 0; ind < placeholders.length; ind++) {
      regex = new RegExp(
        "\\b(" + placeholders[ind] + ")(" + optional + ")?\\b",
        "g",
      );
      str = str.replaceAll(regex, replacements[ind] + "$2");
    }
    return str;
  }

  /**
   * Sets the xy coordinates of the display line, scaling y by options.threeDHeightScale.
   * @param {Object} lineObj - The line object to set the coordinates for.
   * @param {Array<Array<number>>} xy - The xy coordinates to set.
   */
  function setLineXY(lineObj, xy) {
    let start = lineObj.geometry.attributes.instanceStart;
    let end = lineObj.geometry.attributes.instanceEnd;
    let coord;
    for (let i = 0; i < xy.length; i++) {
      coord = xy[i].toArray();
      coord[1] *= (options.threeDHeightScale * domainHeight) / maxDim;
      if (i < xy.length) start.setXYZ(i, coord[0], coord[1], 0);
      if (i > 0) end.setXYZ(i - 1, coord[0], coord[1], 0);
    }
    start.needsUpdate = true;
    end.needsUpdate = true;
  }

  /**
   * Sets the display line colour from the xy coordinates, noting that y in [-0.5,0.5].
   * The colour is given simply by the y coordinate.
   * @param {Object} lineObj - The line object to set the colour for.
   * @param {Array} xy - The xy coordinates to use for setting the colour.
   */
  function setLineColour(lineObj, xy) {
    let start = lineObj.geometry.attributes.instanceColorStart;
    let end = lineObj.geometry.attributes.instanceColorEnd;
    let colour;
    for (let i = 0; i < xy.length; i++) {
      colour = colourFromValue(xy[i].toArray()[1] + 0.5);
      if (i < xy.length) start.setXYZ(i, colour[0], colour[1], colour[2]);
      if (i > 0) end.setXYZ(i - 1, colour[0], colour[1], colour[2]);
    }
    start.needsUpdate = true;
  }

  /**
   * Returns a colour from a given value using a colour map.
   * @param {number} val - The value to assign a colour to, must be between 0 and 1.
   * @returns {Array<number>} An array of RGB values representing the colour.
   */
  function colourFromValue(val) {
    // For val in [0,1] assign a colour using the colourmap.
    val = val.clamp(0, 1);
    let ind = 0;
    while (val >= colourmapEndpoints[ind + 1] && ind < colourmap.length - 2) {
      ind += 1;
    }

    if (colourmapEndpoints[ind + 1] == colourmapEndpoints[ind])
      return colourmap[ind];
    // Interpolate between the colours on the required segment. Note ind 0 <= ind < 4.
    return lerpArrays(
      colourmap[ind],
      colourmap[ind + 1],
      (val - colourmapEndpoints[ind]) /
        (colourmapEndpoints[ind + 1] - colourmapEndpoints[ind]),
    ).map((x) => x.clamp(0, 1));
  }

  /**
   * Linearly interpolates between two arrays v1 and v2, with t in [0,1].
   *
   * @param {Array} v1 - The first array to interpolate from.
   * @param {Array} v2 - The second array to interpolate to.
   * @param {number} t - The interpolation factor, in the range [0, 1].
   * @returns {Array} The interpolated array.
   */
  function lerpArrays(v1, v2, t) {
    // Linear interpolation of arrays v1 and v2, with t in [0,1].
    let res = new Array(v1.length);
    for (let i = 0; i < res.length; i++) {
      res[i] = lerp(v1[i], v2[i], t);
    }
    return res;
  }

  /**
   * Linear interpolation between two values.
   * @param {number} a - The starting value.
   * @param {number} b - The ending value.
   * @param {number} t - The interpolation factor, between 0 and 1.
   * @returns {number} The interpolated value.
   */
  function lerp(a, b, t) {
    // Linear interpolation between a and b, with t in [0,1].
    t = t.clamp(0, 1);
    return (1 - t) * a + t * b;
  }

  /**
   * Sets the line width for the line material and overlay line material.
   */
  function setLineWidth() {
    lineMaterial.linewidth = 0.01 * options.lineWidthMul;
    overlayLineMaterial.linewidth = 0.01 * options.overlayLineWidthMul;
    lineMaterial.needsUpdate = true;
    overlayLineMaterial.needsUpdate = true;
  }

  /**
   * Sets the onfocus handler of a free-text controller.
   *
   * @param {Object} cont - The free-text controller object.
   * @param {Function} fun - The function to be called when the controller is focused.
   * @param {Array} args - The arguments to be passed to the function.
   */
  function setOnfocus(cont, fun, args) {
    cont.domElement.firstChild.onfocus = () => fun(args);
  }

  /**
   * Sets the onblur handler of a free-text controller.
   *
   * @param {Object} cont - The free-text controller object.
   * @param {Function} fun - The function to be called when the onblur event is triggered.
   * @param {Array} args - The arguments to be passed to the function.
   */
  function setOnblur(cont, fun, args) {
    cont.domElement.firstChild.onblur = () => fun(args);
  }

  /**
   * Sets the mouseenter handler of a dat.GUI folder's title bar (the "li.title" row that
   * toggles the folder open/closed - not any of its child rows). Mirrors setOnfocus, but for
   * hovering a whole folder rather than focusing a single controller - e.g. used to highlight
   * every term a folder controls (all diffusion coefficients, all reaction terms, ...) at once.
   *
   * @param {dat.GUI} folder - The dat.GUI folder whose title bar should get the handler.
   * @param {Function} fun - The function to be called on mouseenter.
   * @param {Array} args - The arguments to be passed to the function.
   */
  function setOnFolderHoverEnter(folder, fun, args) {
    folder.domElement.querySelector("li.title").onmouseenter = () => fun(args);
  }

  /**
   * Sets the mouseleave handler of a dat.GUI folder's title bar. See setOnFolderHoverEnter.
   *
   * @param {dat.GUI} folder - The dat.GUI folder whose title bar should get the handler.
   * @param {Function} fun - The function to be called on mouseleave.
   * @param {Array} args - The arguments to be passed to the function.
   */
  function setOnFolderHoverLeave(folder, fun, args) {
    folder.domElement.querySelector("li.title").onmouseleave = () => fun(args);
  }

  /**
   * Makes a dat.GUI folder's title bar open/close correctly on a single tap on touch
   * devices, for a folder that also has setOnFolderHoverEnter/Leave handlers wired up. On
   * WebKit/iOS in particular, an element with a mouseenter handler has its click event
   * deferred to a second tap (the browser treats the first tap as "simulate hovering it",
   * only committing to "actually click it" on a second tap on the same target) - so, on such
   * a folder, tapping only ever highlighted its TeX terms without ever toggling it open.
   * Handling touchend explicitly - and preventing its default, which suppresses the
   * following synthetic click - lets us toggle the folder open/closed and select/deselect
   * its TeX highlight together, directly, on the very first tap.
   *
   * @param {dat.GUI} folder - The dat.GUI folder whose title bar should get the handler.
   * @param {Function} selectFun - Called (with args) to highlight, when the folder opens.
   * @param {Function} deselectFun - Called (with args) to un-highlight, when it closes.
   * @param {Array} args
   */
  function setOnFolderTapToggle(folder, selectFun, deselectFun, args) {
    const title = folder.domElement.querySelector("li.title");
    // Track the touch's start position so a scroll gesture that happens to end (finger
    // lifted) over this title bar - e.g. scrolling a tall GUI panel on a small screen -
    // isn't misread as a tap; only a touchend close to where the touch started toggles.
    const TAP_MOVE_THRESHOLD_PX = 10;
    let startX, startY;
    title.addEventListener(
      "touchstart",
      (e) => {
        startX = e.changedTouches[0].clientX;
        startY = e.changedTouches[0].clientY;
      },
      { passive: true },
    );
    title.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) return;
        e.preventDefault();
        folder.closed = !folder.closed;
        (folder.closed ? deselectFun : selectFun)(args);
      },
      { passive: false },
    );
  }

  /**
   * Selects TeX entries with the given IDs.
   * @param {Array<string>} ids - The IDs of the TeX entries to select.
   */
  function selectTeX(ids) {
    ids.forEach(function (id) {
      selectedEntries.add(id);
    });
    setEquationDisplayType();
  }

  /**
   * Deselects TeX entries with the given IDs.
   * @param {Array<string>} ids - The IDs of the TeX entries to deselect.
   */
  function deselectTeX(ids) {
    ids.forEach(function (id) {
      selectedEntries.delete(id);
    });
    setEquationDisplayType();
  }

  /**
   * Retrieves the raw state of the simulation from the renderer's render target pixels.
   * @returns {void}
   */
  function getRawState() {
    stateBuffer = new Float32Array(nXDisc * nYDisc * 4);
    if (numGroups(Number(options.numSpecies)) > 1) {
      // The real state lives in mrtSimTextures once numGroups>1 (simTextures is unused -
      // see every other Stage 3+ MRT code path). readRenderTargetPixels can't read a
      // specific attachment from a WebGLMultipleRenderTargets directly (it assumes a
      // single-texture render target via renderTarget.texture.format/.type, which are
      // undefined for the array `.texture` an MRT target exposes) - so copy each
      // attachment out to a plain scratch target with the existing copy shader first, then
      // read that. Found/fixed as part of the 8-species upgrade's Stage 11.5 (checkpoint
      // save/restore was previously only capturing group 0, silently dropping species 5-8).
      stateBufferGroup1 = new Float32Array(nXDisc * nYDisc * 4);
      const prevMaterial = simDomain.material;
      const prevTarget = renderer.getRenderTarget();
      const scratch = postTexture.clone();
      assignFragmentShader(copyMaterial, copyShader());
      copyMaterial.glslVersion = null;
      copyMaterial.needsUpdate = true;
      simDomain.material = copyMaterial;
      [
        [mrtSimTextures[1].texture[0], stateBuffer],
        [mrtSimTextures[1].texture[1], stateBufferGroup1],
      ].forEach(([tex, buf]) => {
        uniforms.textureSource.value = tex;
        renderer.setRenderTarget(scratch);
        renderer.render(simScene, simCamera);
        renderer.readRenderTargetPixels(scratch, 0, 0, nXDisc, nYDisc, buf);
      });
      scratch.dispose();
      simDomain.material = prevMaterial;
      renderer.setRenderTarget(prevTarget);
    } else {
      stateBufferGroup1 = undefined;
      renderer.readRenderTargetPixels(
        simTextures[1],
        0,
        0,
        nXDisc,
        nYDisc,
        stateBuffer,
      );
    }
  }

  /**
   * Reads the pixel data from the post-processing texture and stores it in a Float32Array postBuffer.
   */
  function getPostState() {
    postBuffer = new Float32Array(nXDisc * nYDisc * 4);
    renderer.readRenderTargetPixels(
      postTexture,
      0,
      0,
      nXDisc,
      nYDisc,
      postBuffer,
    );
  }

  /**
   * Saves the current simulation state in memory as a buffer and creates a texture from it.
   */
  function saveSimState() {
    // Save the current state in memory as a buffer (getRawState also (re)populates
    // stateBufferGroup1 - a Float32Array once numGroups>1, undefined otherwise).
    getRawState();

    // Create a texture from the state buffer.
    createCheckpointTexture(stateBuffer, undefined, stateBufferGroup1);

    checkpointExists = true;
  }

  /**
   * Saves a checkpoint of the simulation state and downloads it as a file.
   * If no checkpoint exists, creates one before downloading.
   */
  function exportSimState() {
    // Save a checkpoint to file. If no checkpoint exists, create one.
    if (!checkpointExists) {
      saveSimState();
    }

    // Download the buffer as a file, with the dimensions prepended. Group 1's (species 5-8)
    // buffer, if present, is appended after group 0's - the file's total length beyond
    // [header + group-0 buffer] signals its presence on load (see loadSimState), so this
    // stays backward compatible with files exported before the 8-species upgrade without a
    // format version bump.
    const parts = [new Float32Array([nXDisc, nYDisc]), stateBuffer];
    if (stateBufferGroup1 != undefined) parts.push(stateBufferGroup1);
    var link = document.createElement("a");
    link.download = "VisualPDEState";
    link.href = URL.createObjectURL(new Blob(parts));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Loads simulation state from a file.
   *
   * @param {File} file - The file containing the simulation state.
   */
  function loadSimState(file) {
    const reader = new FileReader();
    reader.onload = function () {
      const buff = new Float32Array(reader.result);
      // The first two elements are width and height; the next width*height*4 are group 0's
      // (species 1-4) state. A file exported with species 5-8 active (Stage 11.5 of the
      // 8-species upgrade) has a second, equally-sized block appended after that for group 1
      // - detected by length here (rather than a format version field) so files exported
      // before this upgrade still load identically.
      const dims = buff.slice(0, 2);
      const group0Len = dims[0] * dims[1] * 4;
      const group0Buff = buff.slice(2, 2 + group0Len);
      const group1Buff =
        buff.length >= 2 + 2 * group0Len
          ? buff.slice(2 + group0Len, 2 + 2 * group0Len)
          : undefined;
      createCheckpointTexture(group0Buff, dims, group1Buff);
      setStretchOrCropTexture(checkpointTexture);
      setStretchOrCropTexture(checkpointTextureGroup1);
      checkpointExists = true;
      resetSim();
    };
    reader.readAsArrayBuffer(file);
  }

  /**
   * Sets the repeat and offset properties of a texture based on the resizeCheckpoints option. Allows for stretching or cropping of the texture.
   * @param {Texture} texture - The texture to set the properties for.
   */
  function setStretchOrCropTexture(texture) {
    if (texture != null) {
      if (options.resizeCheckpoints == "crop") {
        let textureAspectRatio =
          texture.source.data.height / texture.source.data.width;
        let xScale = 1;
        let yScale = aspectRatio / textureAspectRatio;
        if (yScale > 1) {
          xScale = textureAspectRatio / aspectRatio;
          yScale = 1;
        }
        texture.repeat.set(xScale, yScale);
        texture.offset.set((1 - xScale) / 2, (1 - yScale) / 2);
      } else {
        texture.repeat.set(1, 1);
        texture.offset.set(0, 0);
      }
    }
  }

  /**
   * Creates a new THREE.DataTexture object from the given buffer and dimensions.
   * If a checkpoint texture already exists, it will be disposed of before creating the new texture.
   * @param {Float32Array} buff - The buffer to use for the texture data.
   * @param {Array<number>} [dims=[nXDisc, nYDisc]] - The dimensions of the texture.
   * @param {Float32Array} [buffGroup1] - Group 1's (species 5-8) buffer, if the checkpoint
   *   being created has one (only once numGroups(numSpecies)>1 at capture/load time).
   */
  function createCheckpointTexture(buff, dims, buffGroup1) {
    if (checkpointTexture != null) {
      checkpointTexture.dispose();
    }
    if (checkpointTextureGroup1 != null) {
      checkpointTextureGroup1.dispose();
      checkpointTextureGroup1 = null;
    }
    if (dims == undefined) {
      dims = [nXDisc, nYDisc];
    }
    checkpointTexture = new THREE.DataTexture(
      buff,
      dims[0],
      dims[1],
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    checkpointTexture.needsUpdate = true;
    manualInterpolationNeeded
      ? (checkpointTexture.magFilter = THREE.NearestFilter)
      : (checkpointTexture.magFilter = THREE.LinearFilter);
    if (checkpointMaterial != null) {
      checkpointMaterial.map = checkpointTexture;
      checkpointMaterial.needsUpdate = true;
    }
    if (buffGroup1 != undefined) {
      checkpointTextureGroup1 = new THREE.DataTexture(
        buffGroup1,
        dims[0],
        dims[1],
        THREE.RGBAFormat,
        THREE.FloatType,
      );
      checkpointTextureGroup1.needsUpdate = true;
      manualInterpolationNeeded
        ? (checkpointTextureGroup1.magFilter = THREE.NearestFilter)
        : (checkpointTextureGroup1.magFilter = THREE.LinearFilter);
    }
  }

  /**
   * Sets the size of the renderer to the dimensions of the discretisation.
   */
  function setRenderSizeToDisc() {
    renderer.setSize(nXDisc, nYDisc, false);
  }

  /**
   * Sets the default render size based on the canvas dimensions and performance mode option.

   * @returns {void}
   */
  function setDefaultRenderSize() {
    let scaleFactor = options.performanceMode ? 0.6 : devicePixelRatio;
    renderer.setSize(
      Math.round(scaleFactor * canvasWidth),
      Math.round(scaleFactor * canvasHeight),
      false,
    );
  }

  /**
   * Pauses the simulation and displays an error message.
   * @param {string} message - The error message to display.
   */
  function throwError(message, fixButtonMessage, fixButtonFunc) {
    if (!shouldShowErrors()) return;
    runningBeforeError = isRunning;
    try {
      pauseSim();
    } catch (error) {
      // Do nothing - this is just to stop the simulation loop and will throw an error because the loop is paused. The error message will still be displayed correctly.
    }
    // If we're loading in, don't overwrite previous errors.
    if (isLoading && hasErrored) return;
    hasErrored = true;
    // If an error is already being displayed, just update the message.
    // If a fix button message and function are provided, update those too. Otherwise hide the button.
    if (fixButtonMessage != undefined && fixButtonFunc != undefined) {
      $("#error_fix_button_text").html(fixButtonMessage);
      $("#error_fix_button").off("click").on("click", fixButtonFunc);
      $("#error_fix_button").show();
    } else {
      $("#error_fix_button").hide();
    }
    if ($("#error").is(":visible") && !isFadingOut("#error")) {
      $("#error_description").html(message);
    } else {
      // If an input element has focus, don't display a new error as it could block input.
      if (document.activeElement.tagName == "INPUT") return;
      // Otherwise, create a new error message.
      $("#error_description").html(message);
      fadein("#error");
    }
  }

  function shouldShowErrors() {
    return !(cleanDisplay || uiHidden || logo_only || isStory);
  }

  /**
   * Throws an error about a preset with the given message, pauses the simulation, and displays the error message to the user.
   * @param {string} message - The error message to display.
   */
  function throwPresetError(message) {
    pauseSim();
    $("#preset_description").html(message);
    fadein("#bad_preset");
  }

  /**
   * Checks if the syntax of a given mathematical expression is valid.
   * @param {string} str - The string to check.
   * @returns {boolean} - Returns true if the syntax is valid, false otherwise.
   */
  function isValidSyntax(str) {
    // Replace vec2 with a placeholder to prevent accidental detection of bad syntax due to number followed by (.
    str = str.replaceAll(/\bvec2\(/g, "__VECTWO__(");

    let regex, matches;
    // Empty parentheses?
    regex = /\(\s*\)/;
    matches = str.match(regex);
    if (matches != null) {
      throwError(
        "Empty parentheses in: " +
          highlightStringinString(str, matches[0]).trim() +
          ".",
      );
      return false;
    }

    // Balanced parentheses?
    let bracketDepth = 0,
      startInd,
      endInd;
    for (var ind = 0; ind < str.length; ind++) {
      if (str[ind] == "(") {
        bracketDepth += 1;
      } else if (str[ind] == ")") {
        bracketDepth -= 1;
      }
      if (bracketDepth > 0 && startInd == undefined) startInd = ind;
    }
    bracketDepth = 0;
    for (var ind = str.length; ind >= 0; ind--) {
      if (str[ind] == "(") {
        bracketDepth += 1;
      } else if (str[ind] == ")") {
        bracketDepth -= 1;
      }
      if (bracketDepth < 0 && endInd == undefined) endInd = ind + 1;
    }

    if (bracketDepth > 0) {
      throwError(
        "Missing " +
          (bracketDepth < 2 ? "" : bracketDepth.toString()) +
          " ')'" +
          " in: " +
          (str.slice(0, startInd) +
            highlightStringinString(str.slice(startInd), str.slice(startInd))) +
          ".",
      );
      return false;
    } else if (bracketDepth < 0) {
      throwError(
        "Missing " +
          (bracketDepth > -2 ? "" : -bracketDepth.toString()) +
          " '('" +
          " in: " +
          (
            highlightStringinString(
              str.slice(0, endInd),
              str.slice(0, endInd),
            ) + str.slice(endInd)
          ).trim() +
          ".",
      );
      return false;
    }

    // Trailing operator?
    regex = /[\+\-\*\^\/]\s*$/;
    matches = str.match(regex);
    if (matches != null) {
      throwError(
        "A binary operator is missing an operand in: " +
          highlightStringinString(str, matches[0]).trim() +
          ".",
      );
      return false;
    }

    // Closing parenthesis followed by a letter or number?
    regex = /\)\s*[a-zA-Z0-9]/;
    matches = str.match(regex);
    if (matches != null) {
      throwError(
        "Missing operator in: " +
          highlightStringinString(str, matches[0]).trim() +
          "<br>You might be missing a '*' for multiplication.",
      );
      return false;
    }

    // Number followed immediately by an opening parenthesis?
    regex = /[0-9]+\s*\(/;
    matches = str.match(regex);
    if (matches != null) {
      throwError(
        "Operator missing after a number in: " +
          highlightStringinString(str, matches[0]).trim() +
          "<br> You might be missing a '*' for multiplication.",
      );
      return false;
    }

    // Scientific notation with a decimal point in the exponent?
    regex = /\d*\.?\d*[eE][+-]?[0-9]*\.[0-9]*/;
    matches = str.match(regex);
    if (matches != null) {
      throwError(
        "Invalid scientific notation in: " +
          highlightStringinString(str, matches[0]).trim() +
          "<br> Exponents cannot include a decimal point.",
      );
      return false;
    }

    // Contains ++ or --, which is ambiguous?
    regex = /\-\-/;
    matches = str.match(regex);
    if (matches != null) {
      throwError(
        "Ambiguous use of '--' in: " +
          highlightStringinString(str, matches[0]).trim() +
          "<br> Did you mean to use this as a minus sign followed by a negative number? If so, please add spaces between minus signs.",
      );
      return false;
    }
    regex = /\+\+/;
    matches = str.match(regex);
    if (matches != null) {
      throwError(
        "There is a '++' in: " +
          highlightStringinString(str, matches[0]).trim() +
          "<br> Did you mean to use a single '+'?",
      );
      return false;
    }

    // If we've not yet returned false, everything looks ok, so return true.
    return true;
  }

  /**
   * Configures the views for the simulation, filling in unset parts of existing views.
   */
  function configureViews() {
    // If there's no default view in options.views, add one.
    if (options.views.length == 0) {
      let view = buildViewFromOptions();
      view.name = "1";
      options.views.push(view);
    } else {
      // Fill in any unset parts of the views.
      options.views = options.views.map(function (view) {
        let newView = buildViewFromOptions();
        Object.assign(newView, view);
        return newView;
      });
    }
  }

  /**
   * Configures the views GUI by removing every existing list item from views_list, creating a new list item for each view, and applying the view when clicked.
   */
  function configureViewsGUI() {
    // Remove every existing list item from views_list.
    $("#views_list").empty();

    let item;
    for (let ind = 0; ind < options.views.length; ind++) {
      item = document.createElement("a");
      item.onclick = function () {
        options.activeViewInd = ind;
        // Apply the view, which will update which button is active through configureGUI().
        applyView(options.views[ind]);
      };
      item.innerHTML =
        "<div class='view_label'>" + options.views[ind].name + "</div>";
      if (ind == options.activeViewInd) item.classList.add("active_button");
      $("#views_list").append(item);
    }
    nextViewNumber = Math.max(options.views.length, nextViewNumber);

    // Only show the Delete Views button if there is more than one view.
    if (options.views.length > 1) {
      $("#deleteViewButton").removeClass("hidden");
    } else {
      $("#deleteViewButton").addClass("hidden");
    }
    runMathJax();
    if (options.views.length > 0) {
      // fitty(".view_label", { maxSize: 32, minSize: 12, multiline: true });
    }
  }

  /**
   * Applies the given view to the options object, updates the plot and renders it.
   * @param {Object} view - An object of parameters that resembles options.
   * @param {boolean} [update=true] - Whether to update what is being plotted and render.
   */
  function applyView(view, update) {
    // Apply the view, which is an object of parameters that resembles options.
    Object.assign(options, view);
    delete options.name;
    refreshGUI(viewsGUI);

    if (update == undefined || update) {
      // Update what is being plotted, and render.
      updateWhatToPlot();
      configurePlotType();
      setDisplayColourAndType();
      updateUniforms();
      updateColourbarLims();
      configureColourbar();
      configureProbe();
      configureVectorField();
      updateViewSliders();
      updateViewFeatureToggleClasses();
      render();
      if (options.autoSetColourRange) {
        setColourRangeSnap();
        render();
      }
    }
  }

  /**
   * Prompts the user to enter a name for the current view and updates the view's name in the options object.
   * If the user enters a name, the views GUI is reconfigured and MathJax typesetting is updated.
   */
  function editCurrentViewName() {
    let name = prompt(
      "Enter a name for the current View. You can enclose mathematics in $ $.",
      options.views[options.activeViewInd].name,
    );
    if (name != null) {
      options.views[options.activeViewInd].name = name;
      configureViewsGUI();
      runMathJax();
    }
  }

  /**
   * Adds a new view to the options object and configures the views GUI.
   */
  function addView() {
    // Add a new view.
    let view = buildViewFromOptions();
    view.name = ++nextViewNumber;
    options.views.push(view);
    options.activeViewInd = options.views.length - 1;
    configureViewsGUI();
  }

  /**
   * Removes the current view from the options.views array if there is more than one view. If there is only one view, renames it to "Custom".

   * @returns {void}
   */
  function deleteView() {
    // Remove the current view if there is more than one view.
    if (options.views.length > 1) {
      options.views.splice(options.activeViewInd, 1);
      // Activate the previous view in the list, or the first element.
      if (options.activeViewInd < 1) {
        options.activeViewInd = 0;
      } else {
        options.activeViewInd -= 1;
      }
    } else {
      // Otherwise, just rename the view.
      options.views[options.activeViewInd].name = "Custom";
    }
    applyView(options.views[options.activeViewInd]);
  }

  /**
   * Builds a view object from the options object, containing only the fields specified in fieldsInView.
   * @returns {Object} The view object.
   */
  function buildViewFromOptions() {
    let view = {};
    fieldsInView.forEach(function (key) {
      if (options.hasOwnProperty(key))
        view[key] = JSON.parse(JSON.stringify(options[key]));
    });
    return view;
  }

  /**
   * Updates the active view with the given property.
   * @param {string} property - The property to update the active view with.
   */
  function updateView(property) {
    // Update the active view with options.property.
    if (options.activeViewInd < options.views.length)
      options.views[options.activeViewInd][property] =
        options[property]?.valueOf();

    // If the property is an "enable" type, then we update a class on the folder to reflect the change.
    updateViewFeatureToggleClasses(property);
  }

  /**
   * Updates the shader for a ghost species on a given side with a specified value.
   * @param {number} speciesInd - The index of the species to update.
   * @param {string} [side] - The side on which to apply the boundary condition ("L", "R", "B", "T", or undefined).
   * @param {string} valStr - The value to update the species with.
   * @returns {string} The updated shader string.
   */
  function ghostUpdateShader(speciesInd, side, valStr) {
    let str = "";
    str += selectSpeciesInShaderStr(
      RDShaderGhostX(side),
      listOfSpecies[speciesInd],
    );
    if (options.dimension > 1) {
      str += selectSpeciesInShaderStr(
        RDShaderGhostY(side),
        listOfSpecies[speciesInd],
      );
    }
    // Replace the placeholder GHOST with the specified value.
    str = str.replaceAll("GHOSTSPECIES", valStr);
    return str;
  }

  /**
   * Generates a shader string for updating a species with Dirichlet boundary conditions on a given side.
   * @param {number} speciesInd - The index of the species to update.
   * @param {string} [side] - The side on which to apply the boundary condition ("L", "R", "B", "T", or undefined).
   * @returns {string} The generated shader string.
   */
  function dirichletUpdateShader(speciesInd, side) {
    let str = "";
    str += selectSpeciesInShaderStr(
      RDShaderDirichletX(side),
      listOfSpecies[speciesInd],
    );
    if (options.dimension > 1) {
      str += selectSpeciesInShaderStr(
        RDShaderDirichletY(side),
        listOfSpecies[speciesInd],
      );
    }
    return str;
  }

  /**
   * Generates a shader for including Robin boundary conditions for a given species and side.
   * @param {number} speciesInd - The index of the species to update.
   * @param {string} [side] - The side on which to apply the boundary condition ("L", "R", "B", "T", or undefined).
   * @returns {string} - The updated shader string.
   */
  function robinUpdateShader(speciesInd, side) {
    let str = "";
    str += selectSpeciesInShaderStr(
      RDShaderRobinX(side),
      listOfSpecies[speciesInd],
    );
    if (options.dimension > 1) {
      str += selectSpeciesInShaderStr(
        RDShaderRobinY(side),
        listOfSpecies[speciesInd],
      );
    }
    return str;
  }

  /**
   * Generates a shader for including Robin boundary conditions for a given species and side in a custom domain.
   * @param {number} speciesInd - The index of the species to update the shader for.
   * @param {string} side - The side to update the shader for.
   * @returns {string} - The updated shader string.
   */
  function robinUpdateShaderCustomDomain(speciesInd, side) {
    let str = "";
    str += selectSpeciesInShaderStr(
      RDShaderRobinCustomDomainX(
        side,
        parseShaderString(options.domainIndicatorFun),
      ),
      listOfSpecies[speciesInd],
    );
    if (options.dimension > 1) {
      str += selectSpeciesInShaderStr(
        RDShaderRobinCustomDomainY(
          side,
          parseShaderString(options.domainIndicatorFun),
        ),
        listOfSpecies[speciesInd],
      );
    }
    return str;
  }

  /**
   * Generates a shader string for enforcing Dirichlet boundary conditions for a given species and side.
   * @param {number} speciesInd - The index of the species to enforce the boundary condition for.
   * @param {string} side - The side of the boundary to enforce the condition on ("left", "right", "bottom", or "top").
   * @returns {string} The generated shader string.
   */
  function dirichletEnforceShader(speciesInd, side) {
    let str = "";
    str += selectSpeciesInShaderStr(
      RDShaderDirichletX(side).replaceAll(/updated/g, "gl_FragColor"),
      listOfSpecies[speciesInd],
    );
    if (options.dimension > 1) {
      str += selectSpeciesInShaderStr(
        RDShaderDirichletY(side).replaceAll(/updated/g, "gl_FragColor"),
        listOfSpecies[speciesInd],
      );
    }
    return str;
  }

  // MRT counterpart of dirichletEnforceShader(), used only once numGroups(numSpecies)>1
  // (Stage 11.5 of the 8-species upgrade). Deliberately skips the .replaceAll(/updated/g,
  // "gl_FragColor") step the non-MRT version does: RDShaderDirichletX/Y already target
  // "updated", and selectSpeciesInShaderStr's groupifyShaderStr needs that name intact to
  // correctly retarget it to "updated2" for group-1 species - the single, final
  // fragColor0/fragColor1 assignment happens once, in RDShaderEnforceDirichletBotMRT().
  function dirichletEnforceShaderMRT(speciesInd, side) {
    let str = "";
    str += selectSpeciesInShaderStr(
      RDShaderDirichletX(side),
      listOfSpecies[speciesInd],
    );
    if (options.dimension > 1) {
      str += selectSpeciesInShaderStr(
        RDShaderDirichletY(side),
        listOfSpecies[speciesInd],
      );
    }
    return str;
  }

  /**
   * Creates a button list element and appends it to the parent element.
   * @param {Object} parent - The parent element to append the button list to.
   * @param {string} [id] - The id to assign to the button list element.
   * @returns {Object} The created button list element.
   */
  function addButtonList(parent, id) {
    const list = document.createElement("li");
    if (id != null) list.id = id;
    list.classList.add("button_list");
    // Add the button list to the first <ul> element that is a child of parent.
    parent.domElement.querySelector(".dg > ul")?.appendChild(list);
    return list;
  }

  /**
   * Creates and appends a button element to a parent element.
   * @param {HTMLElement} parent - The parent element to append the button to.
   * @param {string} [inner] - The inner HTML of the button.
   * @param {function} [onclick] - The function to be executed when the button is clicked.
   * @param {string} [id] - The ID of the button.
   * @param {string} [title] - The title of the button.
   * @param {Array<string>} [classes] - An array of classes to be added to the button.
   */
  function addButton(parent, inner, onclick, id, title, classes) {
    const button = document.createElement("button");
    if (onclick != undefined) button.onclick = onclick;
    if (id != undefined) button.id = id;
    if (title != undefined) button.title = title;
    if (inner != undefined) button.innerHTML = inner;
    if (classes != undefined) {
      for (const c of classes) {
        button.classList.add(c);
      }
    }
    parent.appendChild(button);
  }

  /**
   * Creates a toggle button and appends it to the given parent element.
   * @param {HTMLElement} parent - The parent element to append the toggle button to.
   * @param {string} property - The property to toggle when the button is clicked.
   * @param {string} [inner] - The inner HTML of the toggle button.
   * @param {function} [onclick] - The function to call when the button is clicked.
   * @param {string} [id] - The ID to assign to the toggle button.
   * @param {string} [title] - The title to assign to the toggle button.
   * @param {string} [folderID] - The folder ID to assign to the toggle button.
   * @param {string[]} [classes] - An array of classes to assign to the toggle button.
   * @param {object} [obj=options] - The object to toggle the property on. Defaults to the global options object.
   * @param {boolean} [negate=false] - Button reflects the negation of the property.
   * @returns {HTMLElement} The created toggle button.
   */
  function addToggle(
    parent,
    property,
    inner,
    onclick,
    id,
    title,
    folderID,
    classes,
    obj,
    negate,
  ) {
    // Create the toggle button.
    const toggle = document.createElement("button");
    // If obj is undefined, use options.
    if (obj == undefined) obj = options;
    toggle.obj = obj;
    toggle.property = property;
    toggle.negate = negate || false;
    // Add the toggle_button class to the toggle button.
    toggle.classList.add("toggle_button");
    if (onclick == undefined) onclick = () => {};
    // Augment any existing onclick to toggle the property.
    toggle.onclick = function () {
      toggle.obj[property] = !toggle.obj[property];
      updateToggle(toggle);
      onclick();
    };
    if (id != undefined) toggle.id = id;
    if (title != undefined) toggle.title = title;
    if (inner != undefined) toggle.innerHTML = inner;
    if (folderID != undefined) toggle.folderID = folderID;
    // Add any classes to the toggle button.
    if (classes != undefined) {
      for (const c of classes) {
        toggle.classList.add(c);
      }
    }
    // Add the toggle button to the parent element.
    parent.appendChild(toggle);
    // Update the toggle button to reflect the current value of the property.
    updateToggle(toggle);
    return toggle;
  }

  function addViewsSubmenuToggle(parent, inner, title, folderID, classes) {
    // Create the toggle button.
    const toggle = document.createElement("button");
    // Add the toggle_button class to the toggle button.
    toggle.classList.add("toggle_button");
    toggle.enabled = false;
    toggle.onclick = function () {
      const enabled = toggle.enabled;
      // Turn off all the views submenus.
      parent.submenuToggles.forEach((t) => {
        updateToggle(t, false);
      });
      // Turn on this toggle if it was disabled.
      updateToggle(toggle, !enabled);
    };
    if (title != undefined) toggle.title = title;
    if (inner != undefined) toggle.innerHTML = inner;
    if (folderID != undefined) {
      toggle.folderID = folderID;
      // When the folder title is clicked, toggle the whole submenu.
      let folder = document.getElementById(folderID);
      let title = folder.getElementsByTagName("ul")[0].firstChild;
      title.addEventListener("click", function (e) {
        if (toggle.enabled) updateToggle(toggle, false);
      });
    }
    // Add any classes to the toggle button.
    if (classes != undefined) {
      for (const c of classes) {
        toggle.classList.add(c);
      }
    }
    // Add the toggle button to the parent element.
    parent.appendChild(toggle);
    parent.submenuToggles.push(toggle);
    return toggle;
  }

  /**
   * Adds a new line element to the specified parent element.
   * @param {HTMLElement} parent - The parent element to append the new line element to.
   */
  function addNewline(parent) {
    const breaker = document.createElement("div");
    breaker.classList.add("break");
    parent.appendChild(breaker);
  }

  /**
   * Copies the current configuration as a JSON string to the clipboard, with some modifications.

   * @returns {void}
   */
  function copyConfigAsJSON() {
    const parentOptions = getResolvedPreset(options.parent);

    // Get the options that differ from the default.
    let objDiff = diffObjects(options, parentOptions);
    // If there's only one view and it has the default name, remove the view from the preset.
    if (options.views.length == 1 && options.views[0].name == "1") {
      delete objDiff.views;
    }

    // If every view has the same value as options for a property, remove that property from the views.
    for (const key of Object.keys(options.views[0])) {
      if (options.hasOwnProperty(key)) {
        if (options.views.map((e) => e[key]).every((v) => v == options[key])) {
          objDiff.views?.forEach((v) => delete v[key]);
        }
      }
    }

    // If every view specifies a value for a property, remove that property from options.
    if (options.views.length > 1) {
      for (const key of Object.keys(options.views[0])) {
        if (options.views.every((v) => v.hasOwnProperty(key))) {
          delete objDiff[key];
        }
      }
    }

    objDiff.preset = "PRESETNAME";
    if (objDiff.hasOwnProperty("parent") && objDiff.parent == "null") {
      delete objDiff.parent;
    }
    let str = JSON.stringify(objDiff)
      .replaceAll(/(:[^:]*),/g, "$1,\n\t")
      .replaceAll(":", ": ")
      .replaceAll("  ", " ")
      .replaceAll("{", "{\n\t")
      .replaceAll("}", ",\n}");
    str = 'presets["PRESETNAME"] = ' + str + ";\n";

    copyToClipboard(str);
  }

  /**
   * Copies debugging data to the clipboard.

   * @returns {void}
   */
  function copyDebug() {
    let str = "";
    str += JSON.stringify(options);
    str += JSON.stringify(uniforms);
    str += JSON.stringify({
      nXDisc: nXDisc,
      nYDisc: nYDisc,
      domainHeight: domainHeight,
      domainWidth: domainWidth,
      aspectRatio: aspectRatio,
      canvas: canvas.getBoundingClientRect(),
    });
    copyToClipboard(str);
  }

  /**
   * Configures the stats GUI based on the value of the `options.showStats` flag.
   */
  function configureStatsGUI() {
    stats.domElement.style.visibility = options.showStats ? "" : "hidden";
    document.getElementById("dataContainerStats").style.visibility =
      options.showStats ? "" : "hidden";
  }

  /**
   * Toggles the visibility of the right UI panel and toggles the "clicked" class on the settings button.
   */
  function toggleRightUI() {
    $("#right_ui").toggle();
    $("#settings").toggleClass("clicked");
  }

  /**
   * Toggles the visibility of the left UI panel and toggles the "clicked" class of the equations element.
   */
  function toggleLeftUI() {
    $("#left_ui").toggle();
    $("#equations").toggleClass("clicked");
  }

  /**
   * Toggles the visibility of the views UI and toggles the "clicked" class of the views element.
   */
  function toggleViewsUI() {
    $("#views_ui").toggle();
    $("#views").toggleClass("clicked");
  }

  /**
   * Toggles the visibility of the help panel and toggles the "clicked" class of the help button.
   */
  function toggleHelpPanel() {
    $("#help_panel").toggle();
    $("#help").toggleClass("clicked");
  }

  /**
   * Toggles the visibility of the share panel and toggles the "clicked" class of the share button.
   */
  function toggleSharePanel() {
    $("#share_panel").toggle();
    $("#share").toggleClass("clicked");
  }

  /**
   * Checks if the user is accessing the website from a mobile device.
   * @returns {boolean} - True if the user is accessing the website from a mobile device, false otherwise.
   */
  function onMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  /**
   * Determines if the window width is less than 629 pixels.
   * @returns {boolean} Whether the screen is considered small or not.
   */
  function onSmallScreen() {
    return window.innerWidth < 629;
  }

  /**
   * Inserts the URL of the current sim to an iframe and appends UI options based on the value of embed_ui_type.
   * Then, it copies the iframe to the clipboard.
   */
  function copyIframe() {
    // Get the URL of the current sim.
    getSimURL(false);
    let url = longSimURL;
    // Use the UI options specified in embed_ui_type to append ui options.
    switch (document.getElementById("embed_ui_type").value) {
      case "full":
        break;
      case "story":
        url += "&story";
        break;
      case "none":
        url += "&logo_only";
        break;
    }
    // Put the url in an iframe and copy to clipboard.
    let str =
      '<iframe title="VisualPDE simulation" style="border:0;width:100%;height:100%;" src="' +
      url +
      '" frameborder="0"></iframe>';
    copyToClipboard(str);
  }

  /**
   * Returns a compressed, URI-safe representation of the current simulation configuration,
   * as used for the value of the `options` search parameter.
   * @returns {string} The compressed options string.
   */
  function getCompressedOptions() {
    // First, get the options that differ from the default.
    let objDiff = diffObjects(options, getPreset("default"));
    objDiff.preset = "Custom";
    // Remove any parents so that loading happens from the default sim.
    delete objDiff.parent;
    // Minify the field names in order to generate shorter URLs.
    objDiff = minifyPreset(objDiff);
    return LZString.compressToEncodedURIComponent(JSON.stringify(objDiff));
  }

  /**
   * Returns a URL encoded string representing the current simulation configuration.
   * @returns {string} The URL encoded string representing the current simulation configuration.
   */
  function getSimURL(shorten = true) {
    const base = location.origin + location.pathname.replace(/\/$/, "");
    const shortOpts = getCompressedOptions();
    const queryString = "?options=" + shortOpts;
    let str = [base, queryString].join("");
    // Keep the long URL as a fallback.
    longSimURL = str;
    simURL = longSimURL;
    // Asynchronously shorten the URL, replcing the long URL with the shortened one when complete.
    if (shorten) shortenURL(base, shortOpts);
    return queryString;
  }

  /**
   * Returns the fields of `options` that the simulation is currently tuning on the user's
   * behalf, and which therefore shouldn't be enough on their own to replace the URL:
   * optimiseFPS settles numTimestepsPerFrame over the first seconds of a simulation, and
   * autoSetColourRange rewrites the colour limits several times a second for as long as
   * it's enabled. Rewriting a tidy ?preset=... link into a long options string off the back
   * of the first would be surprising, and off the back of the second would mean rebuilding
   * the URL for as long as the simulation runs, and never letting it settle. The simulation
   * overwrites both within
   * a frame or two of the user setting them by hand, so nothing is lost by ignoring them:
   * whatever they currently hold is still written into the URL as soon as anything else
   * changes it.
   * @returns {string[]} The names of the fields currently being tuned automatically.
   */
  function autoTunedOptionNames() {
    return [
      ...(isOptimising ? ["numTimestepsPerFrame"] : []),
      ...(options.autoSetColourRange
        ? ["minColourValue", "maxColourValue"]
        : []),
    ];
  }

  /**
   * Returns a string that changes whenever the user-facing state of the simulation does,
   * used by syncURLWithOptions() as a cheap check for whether the URL needs replacing.
   * Fields that the simulation is tuning by itself are left out, both from options and from
   * the copies of them that updateView() keeps in options.views.
   * @returns {string} A fingerprint of the current state.
   */
  function optionsFingerprint() {
    const autoTuned = autoTunedOptionNames();
    if (!autoTuned.length) return JSON.stringify(options);
    const stripped = Object.assign({}, options, {
      views: options.views?.map(function (view) {
        const copy = Object.assign({}, view);
        autoTuned.forEach((key) => delete copy[key]);
        return copy;
      }),
    });
    autoTuned.forEach((key) => delete stripped[key]);
    return JSON.stringify(stripped);
  }

  /**
   * Replaces the URL in the address bar with one that encodes the current state of
   * `options`, so that the URL is always ready to be copied, bookmarked or reloaded.
   * Returns immediately if nothing has changed since the last call.
   *
   * `options` can change many times a second (dragging a slider, orbiting the camera,
   * auto-scaling colour limits), so this is run on a timer rather than from each of the
   * many places that write to `options`, and the comparatively expensive rebuilding of the
   * URL is guarded behind a cheap check of whether anything has changed at all.
   *
   * @param {boolean} [immediate] - Rebuild the URL on this call rather than waiting for the
   * state to settle first. Only for one-off changes that are known to have finished.
   */
  function syncURLWithOptions(immediate = false) {
    const fingerprint = optionsFingerprint();
    if (fingerprint == lastOptionsFingerprint) return;
    // Wait for the state to stop changing before rebuilding the URL. A slider drag or a
    // camera orbit writes to options on every frame, and rebuilding the URL mid-gesture
    // costs roughly a frame on a phone, for intermediate links nobody ever sees.
    if (!immediate && fingerprint != settlingFingerprint) {
      settlingFingerprint = fingerprint;
      return;
    }
    lastOptionsFingerprint = fingerprint;
    const compressedOptions = getCompressedOptions();
    if (compressedOptions == lastURLOptions) return;
    lastURLOptions = compressedOptions;
    // Carry over any search parameters that configure the page rather than the simulation
    // (story, no_ui, sf, ...), preserving their original encoding. Anything that describes
    // the state of the simulation is superseded by the new options string: that's preset,
    // options and mini, plus view and any parameter named after a field of options, all of
    // which are applied on top of the options string when loading and would otherwise
    // clobber the state we're storing.
    const otherParams = window.location.search
      .replace(/^\?/, "")
      .split("&")
      .filter(function (param) {
        if (!param.length) return false;
        const key = decodeURIComponent(param.split("=")[0]);
        return !stateSearchParams.includes(key) && !(key in options);
      });
    const queryString = ["options=" + compressedOptions]
      .concat(otherParams)
      .join("&");
    history.replaceState({}, "", window.location.pathname + "?" + queryString);
  }

  /**
   * Starts keeping the URL in sync with `options`. Called on the user's first interaction
   * with the page, rather than on load, so that a tidy link like ?preset=GrayScott isn't
   * replaced by a long options string just because something settled by itself after
   * loading (optimiseFPS adjusting numTimestepsPerFrame, say).
   */
  function startSyncingURL() {
    if (urlSyncTimer) return;
    // Record the current state, so that we only replace the URL once something changes.
    lastOptionsFingerprint = optionsFingerprint();
    urlSyncTimer = setInterval(syncURLWithOptions, urlSyncPeriod);
  }

  /**
   * Copies the given string to the user's clipboard.
   *
   * @param {string} str - The string to copy to the clipboard.
   */
  function copyToClipboard(str) {
    navigator.clipboard.writeText(str).then(
      () => {
        // Success.
        $("#link_copied").fadeIn(1000);
        setTimeout(() => $("#link_copied").fadeOut(1000), 2000);
      },
      () => {
        // Failure.
        throwError(
          "For some reason, we couldn't copy to your device's clipboard. You might not be using HTTPS or there's something wrong on our end - sorry!",
        );
      },
    );
  }

  /**
   * Handles incoming messages for the simulation.
   * @param {MessageEvent} event - The message event object.
   */
  function handleMessage(event) {
    switch (event.data.type) {
      case "updateParam":
        updateParamFromMessage(event.data);
        break;
      case "resetSim":
        resetSim();
        break;
      case "pauseSim":
        pauseSim();
        break;
      case "playSim":
        playSim();
        break;
      case "suspend":
        isSuspended = true;
        break;
      case "resume":
        isSuspended = false;
        break;
      case "id":
        localOpts.id = event.data.id;
        break;
      default:
        // Maintain backwards compatibility with old messages.
        updateParamFromMessage(event.data);
    }
  }

  /**
   * Updates the value of a parameter based on a message received from another window.
   *
   * @param {Object} data - The message data containing the name and value of the parameter to update.
   */
  function updateParamFromMessage(data) {
    // Upon receiving a message from another window, use the message to update
    // the value in the specified parameter.

    // If data.name is not an array, make it an array.
    if (!Array.isArray(data.name)) {
      data.name = [data.name];
      data.value = [data.value];
    }
    // Loop through the names and values in the message.
    for (let i = 0; i < data.name.length; i++) {
      // For each name, find the corresponding controller and update its value.
      const controller = kineticNameToCont[data.name[i]];
      updateControllerWithValue(controller, data.value[i]);
    }
  }

  function updateControllerWithValue(controller, value) {
    if (controller != undefined) {
      // If there's a slider and the value does not contain a parameter-dependent expression, update its value and trigger the update via the slider's input event.
      const paramDependent = /[^0-9\._\s]/.test(value.toString());
      if (controller.slider != undefined && !paramDependent) {
        controller.slider.value = value;
        controller.slider.dispatchEvent(new Event("input"));
      } else {
        // Otherwise, just update the value.
        const val =
          controller.object[controller.property].split("=")[0] +
          "= " +
          value.toString();
        controller.setValue(val);
        controller.__onFinishChange(controller, val);
      }
    }
  }

  /**
   * Sets the values of the emboss uniforms based on the current options.
   */
  function setEmbossUniforms() {
    uniforms.embossAmbient.value = options.embossAmbient;
    uniforms.embossDiffuse.value = options.embossDiffuse;
    uniforms.embossShiny.value = options.embossShiny;
    uniforms.embossSmoothness.value = options.embossSmoothness;
    uniforms.embossSpecular.value = options.embossSpecular;
    uniforms.embossLightDir.value = new THREE.Vector3(
      Math.sin(options.embossTheta) * Math.cos(options.embossPhi),
      Math.sin(options.embossTheta) * Math.sin(options.embossPhi),
      Math.cos(options.embossTheta),
    );
  }

  /**
   * Creates a slider element for a given controller with the specified minimum, maximum, and step values.
   * @param {Object} controller - The controller to which the slider will be added.
   * @param {number} min - The minimum value of the slider.
   * @param {number} max - The maximum value of the slider.
   * @param {number} step - The step value of the slider.
   */
  function createOptionSlider(controller, min, max, step) {
    controller.slider = document.createElement("input");
    controller.slider.classList.add("styled-slider");
    controller.slider.classList.add("slider-progress");
    controller.slider.type = "range";
    controller.slider.min = min;
    controller.slider.max = max;
    controller.slider.step = step;
    controller.slider.value = controller.getValue();

    // Configure the slider's style so that it can be nicely formatted.
    controller.slider.style.setProperty("--value", controller.slider.value);
    controller.slider.style.setProperty("--min", controller.slider.min);
    controller.slider.style.setProperty("--max", controller.slider.max);

    // Configure the update.
    controller.slider.addEventListener("input", function () {
      controller.slider.style.setProperty("--value", controller.slider.value);
      controller.setValue(parseFloat(controller.slider.value));
    });

    // Augment the controller's onChange and onFinishChange to update the slider.
    let flag = true;
    // If onChange is set, we need to augment it to update the slider.
    if (controller.__onChange) {
      flag = false;
      controller.oldOnChange = controller.__onChange;
      controller.__onChange = function () {
        controller.oldOnChange();
        controller.slider.value = controller.getValue();
        controller.slider.style.setProperty("--value", controller.slider.value);
      };
    }

    // If onFinishChange is set, we need to augment it as well.
    if (controller.__onFinishChange) {
      flag = false;
      controller.oldOnFinishChange = controller.__onFinishChange;
      controller.__onFinishChange = function () {
        controller.oldOnFinishChange();
        controller.slider.value = controller.getValue();
        controller.slider.style.setProperty("--value", controller.slider.value);
      };
    }

    if (flag) {
      // Neither onChange nor onFinishChange were set, so we need to add an onChange to update the slider.
      controller.onChange(function () {
        controller.slider.value = controller.getValue();
        controller.slider.style.setProperty("--value", controller.slider.value);
      });
    }

    // Add the slider to the DOM with a label element.
    controller.sliderLabel = document.createElement("label");
    controller.sliderLabel.appendChild(controller.slider);
    controller.domElement.appendChild(controller.sliderLabel);
    controller.domElement.parentElement.parentElement.classList.add(
      "parameterSlider",
    );
  }

  /**
   * Updates the view sliders by setting their value and style based on the current controller value.
   */
  function updateViewSliders() {
    for (const controller of [...embossControllers, ...contoursControllers]) {
      let value = controller.getValue();
      controller.slider.style.setProperty("--value", value);
      controller.slider.value = value;
    }
  }

  /**
   * Sets the contour uniforms for the simulation.
   */
  function setContourUniforms() {
    uniforms.contourColour.value = new THREE.Color(options.contourColour);
    uniforms.contourEpsilon.value = options.contourEpsilon;
    uniforms.contourStep.value = 1 / (options.contourNum + 1);
  }

  /**
   * Sets the uniforms for the overlay.
   */
  function setOverlayUniforms() {
    uniforms.overlayColour.value = new THREE.Color(options.overlayColour);
    uniforms.overlayEpsilon.value = options.overlayEpsilon;
    uniforms.overlayLine.value = options.overlay && options.plotType == "line";
    overlayLineMaterial.color = new THREE.Color(options.overlayColour);
    overlayLineMaterial.needsUpdate = true;
  }

  /**
   * Renders the simulation if it is not currently running.
   */
  function renderIfNotRunning() {
    frameCount = 0;
    if (!isRunning) render();
  }

  /**
   * Updates the toggle based on the state of the object property.
   * @param {HTMLElement} toggle - The toggle element to update.
   */
  function updateToggle(toggle, forcedState) {
    // If there is no forced state and the toggle does not have an object property, return.
    if (forcedState == undefined && !toggle.hasOwnProperty("obj")) return;
    const toggleOn =
      forcedState != undefined
        ? forcedState
        : toggle.obj[toggle.property] == !toggle.negate;
    if (toggleOn) {
      toggle.enabled = true;
      toggle.classList.add("toggled_on");
      if (toggle.folderID) {
        let folder = document.getElementById(toggle.folderID);
        folder.classList.remove("hidden");
        // Open the current folder if it is closed.
        let list = folder.getElementsByTagName("ul")[0];
        list.classList.remove("closed");
      }
    } else {
      toggle.enabled = false;
      toggle.classList.remove("toggled_on");
      if (toggle.folderID) {
        document.getElementById(toggle.folderID)?.classList.add("hidden");
      }
    }
  }

  /**
   * Disables autocorrect, autocapitalize, and spellcheck for the given input element.
   * @param {HTMLInputElement} input - The input element to disable autocorrect for.
   */
  function disableAutocorrect(input) {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", false);
  }

  /**
   * Sets the vertex shader for the display material based on the value of `options.customSurface`.
   * If `options.customSurface` is truthy, the custom surface vertex shader is used. Otherwise, the
   * default surface vertex shader is used.
   */
  function setSurfaceShader() {
    if (options.customSurface) {
      displayMaterial.vertexShader = surfaceVertexShaderCustom();
      clickMaterial.vertexShader = surfaceVertexShaderCustom();
    } else {
      displayMaterial.vertexShader = surfaceVertexShaderColour();
      clickMaterial.vertexShader = surfaceVertexShaderColour();
    }
    displayMaterial.needsUpdate = true;
    clickMaterial.needsUpdate = true;
  }

  /**
   * Configures the custom surface controllers based on the current plot type and options.
   */
  function configureCustomSurfaceControllers() {
    if (options.plotType == "surface") {
      $(surfaceButtons).show();
      if (options.customSurface) {
        controllers["surfaceFun"].show();
        controllers["threeDHeightScale"].hide();
      } else {
        controllers["surfaceFun"].hide();
        controllers["threeDHeightScale"].show();
      }
    } else {
      $(surfaceButtons).hide();
      controllers["surfaceFun"].hide();
    }
  }

  function getDuplicates(strarr) {
    const seen = {};
    let dups = [];
    strarr.forEach((e) => (seen[e] ? dups.push(e) : (seen[e] = true)));
    return Array.from(new Set(dups));
  }

  /**
   * Creates arrows and adds them to the scene.
   */
  function createArrows() {
    arrowGroup = new THREE.Group();
    scene.add(arrowGroup);
    const maxDisc = Math.max(nXDisc, nYDisc);
    const denom = Math.round(
      lerp(3, onSmallScreen() ? 20 : 64, options.arrowDensity),
    );
    let stride = Math.max(Math.floor(maxDisc / denom), 1);
    const xNum = Math.floor(nXDisc / stride);
    const yNum = Math.floor(nYDisc / stride);
    const xStartInd = Math.floor((nXDisc - stride * (xNum - 1)) / 2);
    const yStartInd = Math.floor((nYDisc - stride * (yNum - 1)) / 2);
    let ind, yInd, xInd, arrow, x, y;
    // Texture reads go along rows from bottom to top.
    for (let row = 0; row < yNum; row++) {
      yInd = yStartInd + row * stride;
      y = ((yInd + 0.5) / nYDisc - 0.5) * domain.geometry.parameters.height;
      for (let col = 0; col < xNum; col++) {
        xInd = xStartInd + col * stride;
        x = ((xInd + 0.5) / nXDisc - 0.5) * domain.geometry.parameters.width;
        ind = xInd + yInd * nXDisc;
        arrow = createArrow([x, y, 1], [0, 0, 0]);
        arrow.ind = ind;
        arrowGroup.add(arrow);
      }
    }
  }

  /**
   * Creates an arrow object with a tail and a head, positioned at the given position and pointing in the given direction.
   * @param {number[]} pos - The position of the arrow as an array of three numbers representing the x, y, and z coordinates.
   * @param {number[]} dir - The direction of the arrow as an array of three numbers representing the x, y, and z components of the direction vector.
   * @returns {THREE.Group} The arrow object as a THREE.Group instance.
   */
  function createArrow(pos, dir) {
    const arrow = new THREE.Group();
    const tail = new THREE.Mesh(tailGeometry, arrowMaterial);
    tail.rotation.x = Math.PI / 2;
    const head = new THREE.Mesh(headGeometry, arrowMaterial);
    head.rotation.x = Math.PI / 2;
    head.rotation.y = Math.PI / 4;
    head.position.z = tailGeometry.parameters.height / 2;
    arrow.add(tail);
    arrow.add(head);
    arrow.scale.multiplyScalar(baseArrowScale);
    arrow.position.set(pos[0], pos[1], pos[2]);
    arrow.lookAt(pos[0] + dir[0], pos[1] + dir[1], pos[2] + dir[2]);
    return arrow;
  }

  /**
   * Removes all arrows from the scene.
   */
  function deleteArrows() {
    if (!arrowGroup) return;
    scene.remove(arrowGroup);
    while (arrowGroup.children.length) {
      arrowGroup.remove(arrowGroup.children[0]);
    }
  }

  /**
   * Configures the vector field based on the options selected by the user.
   */
  function configureVectorField() {
    uniforms.vectorField.value = options.vectorField;
    deleteArrows();
    if (options.vectorField) {
      createArrows();
      updateArrowColour();
      // Set the arrow scale based on the options.arrowScale value.
      if (options.arrowScale == "relative") {
        try {
          // Evaluate the expression in options.arrowLengthMax.
          arrowGroup.customMax = parser.evaluate(options.arrowLengthMax);
        } catch (error) {
          throwError(
            "Unable to evaluate the maximum arrow length. Please check the definition.",
          );
          arrowGroup.customMax = 1;
        }
      }
    }
  }

  /**
   * Updates the color of the arrow material based on the options.arrowColour value.
   */
  function updateArrowColour() {
    arrowMaterial.color = new THREE.Color(options.arrowColour);
  }

  /**
   * Returns an array of strings containing the names of all species and reactions.
   * @returns {string[]} Array of strings containing the names of all species and reactions.
   */
  function getSpecAndReacNames() {
    return listOfSpecies.concat(listOfReactions);
  }

  /**
   * Every name the user has declared and can legitimately write in an expression: the species,
   * plus the Parameters and Substitutions they've defined. Used by autoCorrectSyntax to tell a
   * single identifier from two names written side by side - "D_1r" from "u_1u_2" - which is
   * otherwise impossible, since the two are lexically the same shape.
   *
   * Reactions are excluded: listOfReactions holds display forms like "f_{u}", not identifiers.
   * Note this reads the *committed* options, so when called while a definition row is being
   * edited it won't yet see that row's pending name - harmless, since autoCorrectDefinition
   * only ever autocorrects a row's right-hand side, never its name.
   */
  function getDeclaredNames() {
    // Tolerates options not being populated yet: with no names to go on, autoCorrectSyntax
    // just falls back to its old blanket behaviour, which beats throwing out of a field's
    // onFinishChange and taking the rest of that handler down with it.
    if (options.kineticParams == undefined || options.expressions == undefined)
      return listOfSpecies.slice();
    return listOfSpecies
      .concat(getKineticParamNames())
      .concat(getExpressionNames());
  }

  /**
   * Validates if a parameter name is already in use (as a species/reaction/reserved name, or
   * as an existing expression name - parameters and expressions share one namespace, since a
   * parameter is a live uniform reference while an expression is inline-substituted text, and
   * allowing the same name in both would make substitution order silently decide which wins).
   * @param {string} name - The name of the parameter to validate.
   * @returns {boolean} - Returns true if the parameter name is not already in use, otherwise returns false.
   */
  function validateParamName(name) {
    const val =
      isReservedName(name, getSpecAndReacNames()) ||
      name in expressionNameToCont;
    if (val) {
      throwError(
        "The name '" +
          name +
          "' is already in use, so can't be used as a parameter name. Please use a different name for " +
          name +
          ".",
      );
    }
    return !val;
  }

  /**
   * Validates if an expression name is already in use (as a species/reaction/reserved name,
   * or as an existing parameter name - see validateParamName for why the namespace is shared).
   * @param {string} name - The name of the expression to validate.
   * @returns {boolean} - Returns true if the expression name is not already in use, otherwise returns false.
   */
  function validateExpressionName(name) {
    const val =
      isReservedName(name, getSpecAndReacNames()) || name in kineticNameToCont;
    if (val) {
      throwError(
        "The name '" +
          name +
          "' is already in use, so can't be used as an expression name. Please use a different name for " +
          name +
          ".",
      );
    }
    return !val;
  }

  /**
   * The `sortObject()` function is used to sort the keys of an object in case-insensitive alphabetical order and return a new object with the sorted keys.
   *
   * @param {Object} obj - The input object to be sorted.
   *
   * The function first gets the keys of the object and sorts them using the `sort()` method with a custom comparator function that compares the keys in a case-insensitive manner.
   * It then uses the `reduce()` method to create a new object with the sorted keys and their corresponding values from the original object.
   *
   * @returns {Object} - The new object with keys sorted in case-insensitive alphabetical order.
   */
  function sortObject(obj) {
    return Object.keys(obj)
      .sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      })
      .reduce(function (result, key) {
        result[key] = obj[key];
        return result;
      }, {});
  }

  /**
   * The `replaceMINXMINY()` function is used to replace occurrences of 'MINX' and 'MINY' in a string with the respective minimum X and Y values from the options object.
   *
   * @param {string} str - The input string, typically a shader code, where the placeholders 'MINX' and 'MINY' will be replaced.
   *
   * The function uses the `replaceAll()` method to replace all occurrences of 'MINX' and 'MINY' in the string. The replacement values are obtained by calling the `parseShaderString()` function with the respective minimum X and Y values from the options object.
   *
   * @returns {string} - The modified string with all occurrences of 'MINX' and 'MINY' replaced by the respective minimum X and Y values.
   */
  function replaceMINXMINY(str) {
    str = str.replaceAll(/\bMINX\b/g, () => parseShaderString(options.minX));
    str = str.replaceAll(/\bMINY\b/g, () => parseShaderString(options.minY));
    return str;
  }

  /**
   * The `checkForCyclicDependencies()` function is used to check for cyclic dependencies in a directed graph of names
   *
   * @param {string} name - The name of the node to start the check from.
   * @param {Object} doneDict - An object that keeps track of the nodes that have been checked.
   * @param {Array} stack - An array that represents the current path of nodes being checked.
   * @param {Object} dependencies - An object that maps each node to an array of its dependencies.
   * @param {Array} badNames - An array that stores the paths that contain cyclic dependencies.
   *
   * The function uses a depth-first search algorithm to traverse the graph. If it encounters a node that is already in the current path, it has found a cycle, and it adds the cyclic path to `badNames`.
   *
   * @returns {Array} - Returns an array containing the updated `doneDict`, `stack`, and `badNames`.
   */
  function checkForCyclicDependencies(
    name,
    doneDict,
    stack,
    dependencies,
    badNames,
  ) {
    // If we know the name is safe already, don't do anything.
    if (name in doneDict) return [doneDict, stack.slice(0, -1), badNames];
    // Find any names and check them.
    for (const otherName of dependencies[name]) {
      // Check if it's something we're already trying to evaluate.
      if (stack.includes(otherName)) {
        // We've hit a quantity that we're already trying to evaluate - cyclic!
        // Record the name as bad so that we can throw an error.
        badNames.push(stack.slice(stack.indexOf(otherName)));
      } else {
        // Otherwise, check for its dependencies.
        [doneDict, , badNames] = checkForCyclicDependencies(
          otherName,
          doneDict,
          [...stack, otherName],
          dependencies,
          badNames,
        );
      }
    }
    // Record that we've done this name.
    doneDict[name] = true;
    return [doneDict, stack.slice(0, -1), badNames];
  }

  /**
   * The `configureCursorDisplay()` function is used to set the cursor display on a canvas element with the id "simCanvas" based on certain conditions.
   *
   * Initially, it sets the cursor to the default style ("auto").
   * If the brush is not enabled or the plot type is either "surface" or "line", the function returns and no further changes are made to the cursor.
   * If the plot type is "plane", the cursor style is set based on the brush type:
   * - If the brush type is "circle", the cursor is set to a circle image.
   * - If the brush type is "hline", the cursor is set to a horizontal line image.
   * - If the brush type is "vline", the cursor is set to a vertical line image.
   * - If the brush type is "square", the cursor is set to a square image.
   *
   * The `$("#simCanvas").css("cursor", "url('images/cursor-circle.svg') 12 12, auto")` line sets the cursor to an image. The "12 12" part specifies the position of the hotspot, or the cursor's active point. The "auto" part is a fallback cursor style in case the image cannot be displayed.
   */
  function configureCursorDisplay() {
    // Default cursor.
    $("#simCanvas").css("cursor", "auto");
    if (
      !options.brushEnabled ||
      options.plotType == "surface" ||
      options.plotType == "line"
    ) {
      return;
    }

    // If we're looking at a plane plot, match the brush type.
    switch (options.brushType) {
      case "circle":
        $("#simCanvas").css(
          "cursor",
          "url('images/cursor-circle.svg') 12 12, auto",
        );
        break;
      case "square":
        $("#simCanvas").css(
          "cursor",
          "url('images/cursor-square.svg') 29 35, auto",
        );
        break;
      case "hline":
        $("#simCanvas").css(
          "cursor",
          "url('images/cursor-hline.svg') 32 32, auto",
        );
        break;
      case "vline":
        $("#simCanvas").css(
          "cursor",
          "url('images/cursor-vline.svg') 32 32, auto",
        );
        break;
      case "custom":
        $("#simCanvas").css(
          "cursor",
          "url('images/cursor-droplet.svg') 12 12, auto",
        );
        break;
    }
  }

  /**
   * The `isEmptyString()` function checks if a given string is empty or contains only whitespace characters.
   *
   * @param {string} str - The string to check.
   *
   * The function uses a regular expression (`/^\s*$/`) to test the string. This regular expression matches strings that start and end with zero or more whitespace characters.
   *
   * @returns {boolean} - Returns true if the string is empty or contains only whitespace characters. Returns false otherwise.
   */
  function isEmptyString(str) {
    return /^\s*$/.test(str);
  }

  /**
   * Starts recording a video from the canvas.
   * The function first checks if a recording is already in progress, and if so, it returns immediately.
   * It then checks if the browser supports video recording, and if not, it throws an error.
   * The video quality is set based on the value of the "video_quality" element in the DOM.
   * A stream is captured from the canvas at a maximum of 30 frames per second.
   * The MediaRecorder API is used to record the stream.
   * When the recording is stopped, the video is created and downloaded.
   * If the browser is not Chrome or Firefox, a message is shown.
   * The recording automatically stops after 60 seconds.
   * A timer is displayed showing the recording time.
   */
  function startRecording() {
    if (isRecording) return;
    isRecording = true;
    videoChunks = [];
    const type = getBestVideoType();
    if (!type) {
      isRecording = false;
      throwError("Your browser doesn't support recording video. Sorry!");
      return;
    }
    const ext = type.split("/")[1].split(";")[0];
    let quality = 8000000;
    switch (document.getElementById("video_quality").value) {
      case "SD":
        quality = 2000000;
        break;
      case "HD":
        quality = 8000000;
        break;
      case "UHD":
        quality = 32000000;
        break;
    }
    // Capture a stream of at most 30fps from the canvas.
    var stream = canvas.captureStream(30);
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: type,
      videoBitsPerSecond: quality,
    });
    mediaRecorder.ondataavailable = (evt) => {
      videoChunks.push(evt.data);
    };
    // When stopping, create and download the video.
    mediaRecorder.onstop = function (e) {
      var blob = new Blob(videoChunks, { type: "octet/stream" });
      const recording_url = URL.createObjectURL(blob);
      // Attach the object URL to an <a> element, setting the download file name
      const a = document.createElement("a");
      a.style = "display: none;";
      a.href = recording_url;
      a.download = "VisualPDERecording." + ext;
      document.body.appendChild(a);
      // Trigger the file download
      a.click();
      setTimeout(() => {
        // Clean up. Firefox demands it be on a timeout.
        URL.revokeObjectURL(recording_url);
        document.body.removeChild(a);
      }, 100);
    };

    mediaRecorder.start();
    $("#recording").show();
    // If the browser is neither Chrome nor Firefox, show a message.
    if (
      !/Chrome/.test(navigator.userAgent) &&
      !/Firefox/.test(navigator.userAgent)
    ) {
      fadein("#use_Chrome", 1000);
      localStorage.setItem("shown_use_chrome", "true");
      // Fadeout after 5s passes.
      setTimeout(() => fadeout("#use_Chrome"), 5000);
    }
    // Stop recording automatically after 60s.
    window.clearTimeout(recordingTimer);
    recordingTimer = setTimeout(stopRecording, 60000);
    const startTime = new Date().getTime();
    // Update the recording display to include a timer.
    recordingTextInterval = setInterval(function () {
      var now = new Date().getTime();
      var distance = now - startTime;
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      document.getElementById("recording_time").innerHTML =
        "(" + seconds + "s)";
    }, 1000);
  }

  /**
   * The `stopRecording()` function is used to stop the video recording.
   *
   * If no recording is in progress, the function immediately returns.
   * If a recording is in progress, it clears the recording timer and stops the MediaRecorder.
   * The recording display is hidden and the interval that updates the recording time display is cleared.
   * The recording time display is reset.
   * The `isRecording` flag is set to false, indicating that no recording is currently in progress.
   * If this is the first time a video has been recorded, a message is displayed to the user.
   * This message can be closed by clicking on the close button, and it will not be shown again in future recording sessions.
   */
  function stopRecording() {
    if (!isRecording) return;
    window.clearTimeout(recordingTimer);
    mediaRecorder.stop();
    $("#recording").hide();
    clearInterval(recordingTextInterval);
    document.getElementById("recording_time").innerHTML = "";
    isRecording = false;
    if (!localStorage.getItem("recordedVideo")) {
      pauseSim();
      $("#first_video").show();
      $("#first_video_close").click(function () {
        $("#first_video").hide();
      });
      localStorage.setItem("recordedVideo", "true");
    }
  }

  function getBestVideoType() {
    const media = "video";
    const types = ["mp4", "webm", "ogg", "x-matroska"];
    const codecs = [
      "should-not-be-supported",
      "vp9",
      "vp9.0",
      "vp8",
      "vp8.0",
      "avc1",
      "av1",
      "h264",
      "h.264",
      "h265",
      "h.265",
      "opus",
      "pcm",
      "aac",
      "mpeg",
      "mp4a",
    ];
    const isSupported = MediaRecorder.isTypeSupported;
    const supported = [];
    types.forEach((type) => {
      const mimeType = `${media}/${type}`;
      codecs.forEach((codec) =>
        [
          `${mimeType};codecs=${codec}`,
          `${mimeType};codecs=${codec.toUpperCase()}`,
        ].forEach((variation) => {
          if (isSupported(variation)) supported.push(variation);
        }),
      );
      if (isSupported(mimeType)) supported.push(mimeType);
    });
    return supported.length ? supported[0] : false;
  }

  /**
   * The `insertRates()` function is used to replace a placeholder in a string with a vector of timescale values.
   *
   * @param {string} str - The input string, typically a shader code, where the placeholder 'TIMESCALES' will be replaced.
   *
   * The function constructs a string representation of a 4-component vector (vec4) using the timescale values from the options object.
   * These timescale values are parsed into shader-compatible strings using the `parseShaderString()` function.
   * The resulting vec4 string is then used to replace all occurrences of 'TIMESCALES' in the input string.
   *
   * @returns {string} - The modified string with all occurrences of 'TIMESCALES' replaced by the vec4 string.
   */
  function insertRates(str) {
    let scales = options.timescales
      ? [
          options.timescale_1,
          options.timescale_2,
          options.timescale_3,
          options.timescale_4,
        ]
      : [1, 1, 1, 1];
    const toSub = "vec4(" + scales.map(parseShaderString).join(",") + ")";
    // Used only by the MRT (>4-species) Forward Euler shader (RDShaderMainMRT). Replaced
    // before TIMESCALES since "TIMESCALESGROUP1" contains "TIMESCALES" as a prefix and the
    // TIMESCALES regex below has no word-boundary anchoring - doing this one first avoids it
    // being partially consumed. A guaranteed no-op for every other shader/scheme, since only
    // RDShaderMainMRT's text ever contains this token.
    let scalesGroup1 = options.timescales
      ? [
          options.timescale_5,
          options.timescale_6,
          options.timescale_7,
          options.timescale_8,
        ]
      : [1, 1, 1, 1];
    const toSubGroup1 =
      "vec4(" + scalesGroup1.map(parseShaderString).join(",") + ")";
    str = str.replaceAll(/TIMESCALESGROUP1/g, toSubGroup1);
    return str.replaceAll(/TIMESCALES/g, toSub);
  }

  /**
   * The `inDarkMode()` function checks if the application is currently in dark mode.
   *
   * It does this by checking if the root element of the document (i.e., <html>) has a class named "dark-mode".
   *
   * @returns {boolean} - Returns true if the "dark-mode" class is present, indicating that the application is in dark mode. Returns false otherwise.
   */
  function inDarkMode() {
    return document.documentElement.classList.contains("dark-mode");
  }

  /**
   * Runs MathJax to typeset mathematical expressions, if available.
   * @param {Object} [args] - The arguments to pass to MathJax.
   * @returns {Promise} A promise that resolves when typesetting is complete.
   */
  function runMathJax(args) {
    if (MathJax.typesetPromise != undefined)
      return MathJax.typesetPromise(args);
  }

  /**
   * Modify the domain indicator function so that the outer layer of pixels is not included in the domain.
   * This is done by multiplying the domain indicator function by a function that is 1 in the domain and 0 outside the domain.
   * @returns {string} The modified domain indicator function.
   */
  function getModifiedDomainIndicatorFun() {
    let str =
      "float(" +
      options.domainIndicatorFun +
      ")*float(textureCoords.x - step_x >= 0.0)*float(textureCoords.x + step_x <= 1.0)";
    if (options.dimension == 2) {
      str +=
        "*float(textureCoords.y - step_y >= 0.0)*float(textureCoords.y + step_y <= 1.0)";
    }
    return str;
  }

  /**
   * Replaces all occurrences of a substring in a string with a highlighted version of the substring.
   * @param {string} str - The string to search and replace in.
   * @param {string} substr - The substring to search for and replace.
   * @param {string} [highlightClass="highlight"] - The CSS class to apply to the highlighted substring.
   * @returns {string} The modified string with highlighted substrings.
   */
  function highlightStringinString(str, substr, highlightClass) {
    if (highlightClass == undefined) {
      highlightClass = "highlight";
    }
    return str.replaceAll(
      substr,
      `<span class="${highlightClass}">${substr}</span>`,
    );
  }

  /**
   * Adds a button to a dat.GUI folder's title bar that opens the diffusion matrix popup.
   * Mirrors addInfoButton's DOM-injection pattern. Starts hidden - configureGUI() shows/
   * hides it (via diffusionMatrixButton, set here) based on options.crossDiffusion and
   * screen size.
   *
   * @param {dat.GUI} folder - The dat.GUI folder to add the button to.
   */
  function addDiffusionMatrixButton(folder) {
    diffusionMatrixButton = document.createElement("button");
    diffusionMatrixButton.classList.add("matrix-view", "hidden");
    diffusionMatrixButton.innerHTML = `<i class="fa-solid fa-table-cells"></i>`;
    diffusionMatrixButton.title = "Edit as a matrix";
    diffusionMatrixButton.onclick = function (e) {
      e.stopPropagation();
      openDiffusionMatrixGUI();
      if (!options.crossDiffusion) {
        crossDiffusionToggle.click();
      }
    };
    // Reuses has-info-link purely for its `position: relative` effect on the folder title
    // (no actual info-link on this folder) - the same anchor every absolutely-positioned
    // title-bar button (info-link, focus-params, combo-bcs) already relies on.
    folder.domElement.classList.add("has-info-link");
    folder.domElement.insertBefore(
      diffusionMatrixButton,
      folder.domElement.firstChild,
    );
  }

  /**
   * Adds an information button to a dat.GUI folder.
   *
   * @param {dat.GUI} folder - The dat.GUI folder to add the information button to.
   * @param {string} link - The link to the information page.
   */
  function addInfoButton(folder, link) {
    const infoButton = document.createElement("a");
    infoButton.classList.add("info-link");
    infoButton.innerHTML = `<i class="fa-regular fa-circle-info"></i>`;
    infoButton.href = link;
    infoButton.target = "_blank";
    infoButton.title = "More information";
    infoButton.tabIndex = 0;
    folder.domElement.classList.add("has-info-link");
    folder.domElement.insertBefore(infoButton, folder.domElement.firstChild);
  }

  /**
   * Adds a focus button to a leftGUI folder that hides other folders.
   */
  function addFocusLeftGUIButton(folder = parametersFolder) {
    const focusButton = document.createElement("button");
    focusButton.classList.add("focus-params");
    focusButton.innerHTML = `<i class="fa-solid fa-thumbtack"></i>`;
    focusButton.title = "Pin this folder";
    focusButton.onclick = function () {
      focusButton.classList.toggle("active");
      parametersFolder.domElement.classList.toggle("hidden-aug");
      expressionsFolder.domElement.classList.toggle("hidden-aug");
      editEquationsFolder.domElement.classList.toggle("hidden-aug");
      boundaryConditionsFolder.domElement.classList.toggle("hidden-aug");
      initialConditionsFolder.domElement.classList.toggle("hidden-aug");
      // Repeat this toggle for the target folder.
      folder.domElement.classList.toggle("hidden-aug");
      document
        .getElementById("equation_display")
        .classList.toggle("hidden-aug");
      // document
      //   .getElementById("typesetCustomEqsButtonRow")
      //   .classList.toggle("hidden-aug");
      leftGUI.domElement.firstChild.classList.toggle("hidden-aug");
      document.getElementById("left_ui_arrow").classList.toggle("hidden-aug");
      $(".ui.ui_button").toggleClass("hidden-aug");
      $("#play").toggleClass("hidden-aug");
      $("#pause").toggleClass("hidden-aug");
      $("#erase").toggleClass("hidden-aug");
      if (focusButton.classList.contains("active")) {
        // Move play, pause, and erase up.
        $("#play").css("top", "-=50");
        $("#pause").css("top", "-=50");
        $("#erase").css("top", "-=50");
        focusButton.innerHTML = `<i class="fa-solid fa-thumbtack-slash"></i>`;
        focusButton.title = "Unpin this folder";
      } else {
        // Reset play, pause, and erase position.
        $("#play").css("top", "");
        $("#pause").css("top", "");
        $("#erase").css("top", "");
        focusButton.innerHTML = `<i class="fa-solid fa-thumbtack"></i>`;
        focusButton.title = "Pin this folder";
      }
    };
    folder.domElement.insertBefore(focusButton, folder.domElement.firstChild);
  }

  /**
   * Adds a target button to the probeType controller that enables probe location selection.
   */
  function addProbeTargetButton() {
    const targetButton = document.createElement("button");
    targetButton.classList.add("target");
    targetButton.id = "probeTargetButton";
    targetButton.innerHTML = `<i class="fa-solid fa-crosshairs"></i>`;
    targetButton.title = "Select probe location";
    targetButton.onclick = function () {
      // Hide all the UI.
      hideAllUI();
      // Show the click detector.
      document.getElementById("clickDetector").classList.remove("hidden");
      // Add a click event listener to the click detector.
      document.getElementById("clickDetector").addEventListener(
        "click",
        function (event) {
          const rect = canvas.getBoundingClientRect();
          let x = ((event.clientX - rect.left) / rect.width).clamp(0, 1);
          let y = (1 - (event.clientY - rect.top) / rect.height).clamp(0, 1);
          uniforms.probeU.value = x;
          uniforms.probeV.value = y;
          uniforms.probeUVs.value = true;
          // Update the stored XY location of the probe, performed during postprocessing.
          postprocess(true);
          setProbeShader();
          uniforms.probeUVs.value = false;
          document.getElementById("clickDetector").classList.add("hidden");
          // Show the UI again.
          showAllUI();
        },
        { once: true },
      );
    };
    controllers["probeType"].domElement.appendChild(targetButton);
  }

  function addComboBCsButton(controller, speciesInd) {
    const BCsButton = document.createElement("button");
    BCsButton.id = "comboBCsButton" + speciesInd;
    BCsButton.classList.add("info-link", "combo-bcs");
    BCsButton.innerHTML = `<i class="fa-solid fa-cube"></i>`;
    BCsButton.onclick = function () {
      // If the current type of boundary conditions is not "combo", fill the combo string with the current type and value.
      let indText = (speciesInd + 1).toString();
      let speciesUpper = defaultSpecies[speciesInd].toUpperCase();
      let oldType = options["boundaryConditions_" + indText];
      if (oldType != "combo") {
        if (oldType == "periodic") {
          // Periodic BCs have no value.
          controllers["combo" + speciesUpper].setValue(
            ["Left", "Right", "Top", "Bottom"]
              .map((side) => side + ": Periodic;")
              .join(""),
          );
        } else {
          controllers["combo" + speciesUpper].setValue(
            ["Left", "Right", "Top", "Bottom"]
              .map(
                (side) =>
                  side +
                  ": " +
                  capitaliseFirstLetter(oldType) +
                  " = " +
                  options[oldType + "Str_" + indText] +
                  ";",
              )
              .join(""),
          );
        }
      }
      controllers[defaultSpecies[speciesInd] + "BCs"].setValue("combo");
      comboBCsOptions.speciesInd = speciesInd;
      comboBCsOptions.side = comboBCsOptions.side || "left";
      configureComboBCsGUI();
      setBCsGUI();
      openComboBCsGUI();
    };
    BCsButton.title = "Configure boundary conditions for this species";
    controller.domElement.classList.add("has-info-link");
    controller.domElement.appendChild(BCsButton);
  }

  /**
   * Corrects the syntax of a given expression by performing specific replacements (primarily multiplication).
   *
   * @param {string} str - The expression to be corrected.
   * @returns {string} The corrected string.
   */
  function autoCorrectSyntax(str) {
    // If the string is empty, replace it with 0 and return.
    if (str.trim() == "") {
      return "0";
    }

    // Replace all sorts of unicode minus signs, dashes, and hyphens with a regular minus sign.
    str = str.replaceAll(/[\u2212\u2012\u2013\u2014]/g, "-");

    // Replace texture2D and vec2 with placeholders to prevent accidental multiplication.
    str = str.replaceAll(/\btexture2D\b/g, "__TEXTURETWOD__");
    str = str.replaceAll(/\bvec2\(/g, "__VECTWOPAREN__");

    // If an e or E is preceded by a number or . and is followed by a - or number, repkace it with a placeholder to enable scientific notation.
    str = str.replaceAll(/([0-9\.])[eE]([0-9\-])/g, "$1__E__$2");

    // If a number is followed by a letter, add a *. A run of word characters that the user has
    // actually declared - a species, parameter or expression name - is one identifier and is
    // left alone, so CoupledCGL's parameter "D_1r" stays "D_1r" instead of being mangled into
    // "D_1*r". Every other run keeps the old blanket behaviour, so juxtaposed names still gain
    // their implicit multiplication ("u_1u_2" -> "u_1*u_2"): a declared name and two names
    // written side by side are lexically identical, so the declared-name list is the only
    // thing that can tell them apart.
    const declaredNames = new Set(getDeclaredNames());
    str = str.replaceAll(/\w+/g, (word) => {
      if (declaredNames.has(word)) return word;
      // A number written straight onto a declared name ("2D_1r") is that number times that
      // name, not something to be split up further.
      const numberThenName = word.match(/^(\d+)(.+)$/);
      if (numberThenName && declaredNames.has(numberThenName[2]))
        return numberThenName[1] + "*" + numberThenName[2];
      return word.replaceAll(/(\d)([a-zA-Z])/g, "$1*$2");
    });

    // A digit immediately before a ( is always implicit multiplication - it can't be inside a
    // name, and no built-in function name ends in a digit - so this needs no such guard, and
    // still applies to declared names ("a0(x)" -> "a0*(x)").
    str = str.replaceAll(/(\d)(\()/g, "$1*$2");

    // If a ) is followed by a (, add a *.
    str = str.replaceAll(/\)\(/g, ")*(");

    // If the string contains xy or yx, replace with x*y.
    str = str.replaceAll(/\bxy\b/g, "x*y");
    str = str.replaceAll(/\byx\b/g, "y*x");

    // If the string contains + + or ++, replace with +.
    while (str != (str = str.replace(/\+\s*\+/g, "+")));

    // Replace +- and -+ with simply -
    str = str.replaceAll(/\+\s*-/g, "-");
    str = str.replaceAll(/-\s*\+/g, "-");

    // If the string contains a ) followed by a letter or number, add a *.
    str = str.replaceAll(/\)([a-zA-Z0-9])/g, ")*$1");

    // If the string contains "> =" or "< =", replace with ">=" or "<=".
    str = str.replaceAll(/>\s*=/g, ">=");
    str = str.replaceAll(/<\s*=/g, "<=");

    // For each pair of single-character species names that is not itself a species name, add a *.
    const singleCharNames = listOfSpecies.filter((name) => name.length == 1);
    singleCharNames.forEach((name1) => {
      singleCharNames.forEach((name2) => {
        if (!listOfSpecies.includes(name1 + name2)) {
          // Replace all occurrences of name1 followed by name2 with name1*name2.
          str = str.replaceAll(
            new RegExp("\\b" + name1 + name2 + "\\b", "g"),
            name1 + "*" + name2,
          );
        }
        if (!listOfSpecies.includes(name2 + name1)) {
          // Replace all occurrences of name1 followed by name2 with name1*name2.
          str = str.replaceAll(
            new RegExp("\\b" + name2 + name1 + "\\b", "g"),
            name2 + "*" + name1,
          );
        }
      });
    });

    // If the string contains a single species name (with optional _[xy]) followed by a (, add a *.
    str = str.replaceAll(
      new RegExp("\\b(" + anySpeciesRegexStrs[0] + ")(_[xy])?\\(", "g"),
      "$1$2*(",
    );

    // Replace texture2D and vec2 placeholders back to original.
    str = str.replaceAll(/__TEXTURETWOD__/g, "texture2D");
    str = str.replaceAll(/__VECTWOPAREN__/g, "vec2(");

    // Replace __E__ with e.
    str = str.replaceAll(/__E__/g, "e");

    return str;
  }

  /**
   * autoCorrectSyntax() for a "name = definition" string (a Parameters or Substitutions row),
   * applied to the right-hand side only. The name is deliberately left alone: autoCorrectSyntax
   * is written for bare expressions, so it would rewrite a perfectly legal definition name like
   * "uv" to "u*v" (implicit multiplication of two single-character species names).
   *
   * Returns `str` unchanged if it isn't a parseable definition, or if the right-hand side is
   * still empty - a half-typed "a = " is left for the usual "unable to evaluate" error to
   * report, rather than being silently turned into "a = 0" by autoCorrectSyntax's empty case.
   */
  function autoCorrectDefinition(str) {
    const match = str.match(/^(\s*[a-zA-Z]\w*\s*=\s*)(.*)$/s);
    if (!match || match[2].trim() == "") return str;
    return match[1] + autoCorrectSyntax(match[2]);
  }

  /**
   * Replaces occurrences of WhiteNoise with correct shader syntax.
   *
   * @param {string} str - The input string to be modified.
   * @returns {string} The modified string.
   */
  function replaceWhiteNoise(str) {
    // Replace WhiteNoise with RANDN*sqrt(1/(dt*dx^dim)), where dim is dimension.
    let dxStr = options.dimension == 1 ? "dx" : "safepow(dx,2)";
    str = str.replaceAll(
      /\bWhiteNoise(_1)?\b/g,
      "sqrt(1/(dt*" + dxStr + "))*RANDN",
    );
    str = str.replaceAll(/\bWhiteNoise_([2-4])\b/g, function (match, p1) {
      return (
        "sqrt(1/(dt*" +
        dxStr +
        "))*RANDN" +
        numsAsWords[Number(p1)].toUpperCase()
      );
    });
    return str;
  }

  /**
   * Replaces occurrences of Gauss(blah) with correct shader syntax.
   *
   * @param {string} str - The input string to be modified.
   * @returns {string} The modified string.
   */
  function replaceGauss(str) {
    // Find all calls to Gauss in the string.
    const calls = findAllFunCalls(str, "Gauss");

    // If there are no calls to Gauss, return the string unchanged.
    if (calls.length == 0) return str;

    // Sort matches in reverse order (innermost to outermost).
    calls.sort((a, b) => b.start - a.start);

    let output = str;

    for (const { start, end, args } of calls) {
      // Default to no change.
      let replacement = output.slice(start, end);
      // Replace Gauss(meanx, meany, sx, sy, rho) with Gauss(x, y, meanx, meany, sx, sy, rho).
      if (args.length == 5) {
        replacement = `Gauss(x,y,${args[0]},${args[1]},${args[2]},${args[3]},${args[4]})`;
      } else if (args.length == 4) {
        // Replace Gauss(meanx, meany, sx, sy) with Gauss(x, y, meanx, meany, sx, sy, 0).
        replacement = `Gauss(x,y,${args[0]},${args[1]},${args[2]},${args[3]},0)`;
      } else if (args.length == 3) {
        // Replace Gauss(meanx, meany, sd) with Gauss(x, y, meanx, meany, sd, sd, 0).
        replacement = `Gauss(x,y,${args[0]},${args[1]},${args[2]},${args[2]},0)`;
      } else if (args.length == 2) {
        // Replace Gauss(mean, sd) with Gauss(x, y, mean, 0.5*L_y, sd, sd, 0).
        replacement = `Gauss(x,y,${args[0]},0.5*L_y,${args[1]},${args[1]},0)`;
      }
      output = output.slice(0, start) + replacement + output.slice(end);
    }

    return output;
  }

  /**
   * Replaces occurrences of Bump(blah) with correct shader syntax.
   *
   * @param {string} str - The input string to be modified.
   * @returns {string} The modified string.
   */
  function replaceBump(str) {
    // Find all calls to Bump in the string.
    const calls = findAllFunCalls(str, "Bump");

    // If there are no calls to Bump, return the string unchanged.
    if (calls.length == 0) return str;

    // Sort matches in reverse order (innermost to outermost).
    calls.sort((a, b) => b.start - a.start);

    let output = str;

    for (const { start, end, args } of calls) {
      // Default to no change.
      let replacement = output.slice(start, end);
      // If there are 2 arguments, replace with Bump(x, y, arg1, 0.5*L_y, arg2).
      if (args.length == 2) {
        replacement = `Bump(x,y,${args[0]},0.5*L_y,${args[1]})`;
      }
      // If there are 3 arguments, replace with Bump(x, y, arg1, arg2, arg3).
      else if (args.length == 3) {
        replacement = `Bump(x,y,${args[0]},${args[1]},${args[2]})`;
      }
      output = output.slice(0, start) + replacement + output.slice(end);
    }

    return output;
  }

  function assignFragmentShader(material, shader) {
    material.fragmentShader = shader.replaceAll(
      /\bAUXILIARY_GLSL_FUNS\b/g,
      auxiliary_GLSL_funs(),
    );
  }

  function startOptimising() {
    lastFPS = 0;
    isOptimising = true;
  }

  function doneOptimising() {
    isOptimising = false;
  }

  function queryOptimising() {}

  function becomingVisible() {
    // Allow optimisation to occur while the page is visible.
    window.clearTimeout(stabilisingFPSTimer);
    stabilisingFPSTimer = setTimeout(() => {
      stabilisingFPSTimer = null;
    }, optimisationDelay);
    startOptimising();
    // Listen for becoming hidden again.
    document.addEventListener("visibilitychange", becomingHidden, {
      once: true,
    });
  }

  function becomingHidden() {
    // Prevent optimisation from occuring while the page is hidden.
    window.clearTimeout(stabilisingFPSTimer);
    stabilisingFPSTimer = true;
    // Listen for becoming visible again.
    document.addEventListener("visibilitychange", becomingVisible, {
      once: true,
    });
  }

  function inIframe() {
    return window.self !== window.top;
  }

  /**
   * Opens the diffusion matrix popup (the "edit as a matrix" button on the "Diffusion
   * coefficients" folder), refreshing its contents first so it always reflects the current
   * species/values.
   */
  function openDiffusionMatrixGUI() {
    configureDiffusionMatrixGUI();
    fadein("#diffusionMatrix_ui");
  }

  function closeDiffusionMatrixGUI() {
    fadeout("#diffusionMatrix_ui");
  }

  /**
   * Rebuilds the diffusion matrix popup's grid from scratch to match the current number of
   * species and their diffusion coefficients. Each grid cell is a plain HTML input (dat.gui
   * controllers don't support grid layouts) that proxies straight through to the matching
   * dat.gui controller's own setValue()/__onFinishChange() on change, so autoCorrectSyntax/
   * setRDEquations/setEquationDisplayType all run exactly as they do for every other
   * controller in the app, with no duplicated logic - and the "Diffusion coefficients"
   * folder's own controllers update in lockstep.
   */
  function configureDiffusionMatrixGUI() {
    const n = parseInt(options.numSpecies);

    // General equation form (fixed - not per-species), using the site's existing vector/
    // matrix TeX macros (mathjax.html): \v{} for bold vectors, \m{} for the bold matrix.
    document.getElementById("diffusionMatrixEquation").innerHTML =
      "$\\pd{\\v{u}}{t} = \\vnabla \\cdot (\\m{D} \\vnabla \\v{u}) + \\v{f}, \\ \\v{u} = [SPECIES]^T$".replace(
        "SPECIES",
        listOfSpecies
          .slice(0, options.numSpecies)
          .map((s) => parseStringToTEX(s))
          .join(","),
      );

    const grid = document.getElementById("diffusionMatrixGrid");
    grid.innerHTML = "";
    // Columns: "D =" | left bracket | row labels | n input columns | right bracket.
    grid.style.gridTemplateColumns =
      "auto auto auto " + "auto ".repeat(n) + "auto";
    // Rows: column labels | n input rows.
    grid.style.gridTemplateRows = "auto " + "auto ".repeat(n);

    function addCell(className, innerHTML, col, rowStart, rowSpan) {
      const cell = document.createElement(className ? "div" : "span");
      if (className) cell.className = className;
      if (innerHTML != undefined) cell.innerHTML = innerHTML;
      cell.style.gridColumn = col;
      cell.style.gridRow = rowSpan ? rowStart + " / span " + rowSpan : rowStart;
      grid.appendChild(cell);
      return cell;
    }

    // Column-label row: column labels sit above the input columns; every other cell in this
    // row is left empty (the row-label/"D ="/bracket columns only need content further down).
    for (let j = 0; j < n; j++) {
      addCell(
        "matrix-col-label",
        "$" + parseStringToTEX(listOfSpecies[j]) + "$",
        4 + j,
        1,
      );
    }

    // "D =" and both brackets each span every input row, vertically centred.
    addCell("matrix-equals", "$\\m{D} = $", 1, 2, n).style.alignSelf = "center";
    addCell("matrix-bracket left", "", 2, 2, n);
    addCell("matrix-bracket right", "", 4 + n, 2, n);

    // Row labels and the actual coefficient inputs.
    for (let i = 0; i < n; i++) {
      addCell(
        "matrix-row-label",
        "$" + parseStringToTEX(listOfSpecies[i]) + "$",
        3,
        2 + i,
      );
      for (let j = 0; j < n; j++) {
        const key = diffCtrlKey(i + 1, j + 1);
        const fieldName = "diffusionStr_" + (i + 1) + "_" + (j + 1);
        const input = document.createElement("input");
        input.type = "text";
        input.style.gridColumn = 4 + j;
        input.style.gridRow = 2 + i;
        if (i === j && isSpeciesAlgebraic(i)) {
          // Mirrors showSpeciesGUIPanels/etc. hiding the self-diffusion controller entirely
          // for an algebraic species (configureOptions() forces it to "0" and any edit here
          // would just be silently overwritten again on the next options change).
          input.value = "0";
          input.disabled = true;
          input.title = listOfSpecies[i] + " is algebraic - no self-diffusion.";
        } else {
          input.value = options[fieldName];
          // Tags this input for syncDiffusionMatrixGUI() to find and refresh if the matching
          // dat.gui controller in the left UI is edited directly while this popup is open.
          input.dataset.field = fieldName;
          input.addEventListener("change", function () {
            const controller = controllers[key];
            controller.setValue(this.value);
            controller.__onFinishChange(controller, this.value);
            // Reflect whatever autoCorrectSyntax normalized the value to.
            this.value = options[fieldName];
          });
          input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") this.blur();
          });
        }
        grid.appendChild(input);
      }
    }

    runMathJax();
  }

  /**
   * If the diffusion matrix popup is currently open, refreshes its inputs' displayed values
   * from options - keeps it in sync when a diffusion coefficient is instead edited via its
   * usual dat.gui controller in the left UI. Cheap no-op when the popup is closed (the common
   * case), so safe to call unconditionally from setRDEquations().
   */
  function syncDiffusionMatrixGUI() {
    if (!$("#diffusionMatrix_ui").is(":visible")) return;
    document
      .querySelectorAll("#diffusionMatrixGrid input[data-field]")
      .forEach((input) => {
        if (document.activeElement !== input) {
          input.value = options[input.dataset.field];
        }
      });
  }

  function openComboBCsGUI() {
    if (comboBCsOptions.open) return;
    document.getElementById("comboBCs_ui").style.display = "block";
    // If the equations are open, close them.
    if ($("#leftGUI").is(":visible")) $("#equations").click();
    configureComboBCsGUI();
    $(".clickArea").removeClass("selected");
    $("#" + comboBCsOptions.side + "ClickArea").addClass("selected");
    $("#logo").hide();
    revealClickAreas();
    comboBCsOptions.open = true;
  }

  function closeComboBCsGUI() {
    document.getElementById("comboBCs_ui").style.display = "none";
    $(".clickArea").addClass("hidden");
    // If the equations are not already open, open them.
    if (!$("#leftGUI").is(":visible")) $("#equations").click();
    comboBCsOptions.open = false;
  }

  function configureComboBCsGUI(type) {
    comboBCsOptions.type = type || "periodic";
    comboBCsOptions.value = "0";
    let indText = (comboBCsOptions.speciesInd + 1).toString();
    validateComboStr(indText);
    if (!type) {
      // This won't find periodic BCs, but they are the default type so this doesn't need to find them.
      let sideRegex = new RegExp(
        comboBCsOptions.side + "\\s*:\\s*([^=;]*)\\s*=([^;]*);",
        "i",
      );
      let match = options["comboStr_" + indText].match(sideRegex);
      if (match) {
        comboBCsOptions.type =
          match[1].trim().toLowerCase() || comboBCsOptions.type;
        comboBCsOptions.value = match[2].trim() || comboBCsOptions.value;
      }
    }
    // Set the values of the controllers.
    // Don't use setValue on the Type controller as it will trigger the onChange event and overwrite the value.
    controllers["comboBCsType"].updateDisplay();
    controllers["comboBCsValue"].setValue(comboBCsOptions.value);
    // Make sure that the onFinishChange event is triggered.
    controllers["comboBCsValue"].__onFinishChange(
      controllers["comboBCsValue"],
      comboBCsOptions.value,
    );

    // Configure the GUI based on the options.
    let parent = document.getElementById("comboBCs_ui");
    parent.classList.remove("left", "right", "top", "bottom");
    parent.classList.add(comboBCsOptions.side);
    let arrows = parent.getElementsByClassName("arrow");
    for (var arrow of arrows) {
      arrow.style.display = "none";
    }
    parent.getElementsByClassName(
      "arrow " + comboBCsOptions.side,
    )[0].style.display = "block";

    document.getElementById("comboBCsTitle").innerHTML =
      capitaliseFirstLetter(comboBCsOptions.side) + " boundary condition";
    setGUIControllerName(
      controllers["comboBCsType"],
      TeXStrings[defaultSpecies[comboBCsOptions.speciesInd]],
    );
    if (comboBCsOptions.type == "periodic") {
      controllers["comboBCsValue"].hide();
    } else {
      setGUIControllerName(controllers["comboBCsValue"], "Unknown");
      controllers["comboBCsValue"].show();
      let label = comboBCsOptions.type[0].toUpperCase();
      if (label == "R") label = "N";
      label = defaultSpecies[comboBCsOptions.speciesInd] + label;
      if (TeXStrings[label])
        setGUIControllerName(controllers["comboBCsValue"], TeXStrings[label]);
    }
    setClickAreaLabels();
    runMathJax();
  }

  function setClickAreaLabels() {
    let indText = (comboBCsOptions.speciesInd + 1).toString();
    // Set the labels for the click areas.
    let sides = ["left", "right", "top", "bottom"];
    sides.forEach(function (side) {
      let node = document.getElementById(side + "ClickArea").childNodes[1];
      node.innerHTML = "Periodic";
      let sideRegex = new RegExp(
        side + "\\s*:\\s*([^=;]*)\\s*(?:=)?([^;]*);",
        "i",
      );
      let match = options["comboStr_" + indText].match(sideRegex);
      if (!match) return;
      let label = match[1].trim()[0].toUpperCase();
      if (label == "P") {
        node.innerHTML = "Periodic";
      } else {
        node.innerHTML = "Unknown";
        if (label == "R") label = "N";
        label = defaultSpecies[comboBCsOptions.speciesInd] + label;
        if (!TeXStrings[label]) return;
        node.innerHTML =
          removeEvalAt(TeXStrings[label].slice(0, -1)) +
          (match[2] ? " = " + parseStringToTEX(match[2].trim()) : "") +
          "$";
      }
    });
    runMathJax();
  }

  function revealClickAreas() {
    $(".clickArea").removeClass("hidden");
    if (options.dimension == 1) {
      hideTopBottomClickAreas();
    }
  }

  function hideTopBottomClickAreas() {
    $("#topClickArea").addClass("hidden");
    $("#bottomClickArea").addClass("hidden");
    if (["top", "bottom"].includes(comboBCsOptions.side)) {
      comboBCsOptions.side = "left";
      configureComboBCsGUI();
    }
  }

  function sortBCsString(str) {
    return (
      str
        .split(";")
        .filter((s) => s.trim() != "")
        .map((s) => s.trim())
        .sort()
        .join("; ") + ";"
    );
  }

  function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  function removeExtraWhitespace(str) {
    while (str != (str = str.replace(/\s\s/g, " ")));
    return str;
  }

  function removeEvalAt(str) {
    return str
      .replace("\\left.", "")
      .replace("\\right\\rvert_{\\boundary}", "");
  }

  function validateComboStr(indText) {
    let str = options["comboStr_" + indText];
    if (str.trim() == "") return;
    if (str[str.length - 1] != ";") str += ";";
    // If a side is absent, add in periodic.
    let sides = ["Left", "Right", "Top", "Bottom"];
    sides.forEach(function (side) {
      if (!str.match(new RegExp(side + "\\s*:", "i"))) {
        str += side + ": Periodic;";
      }
    });
    str = sortBCsString(str);
    options["comboStr_" + indText] = str;
  }

  function configureComboBCsDropdown() {
    if (options.showGhostBCs) {
      updateGUIDropdown(
        controllers["comboBCsType"],
        ["Periodic", "Dirichlet", "Neumann", "Robin", "Ghost"],
        ["periodic", "dirichlet", "neumann", "robin", "ghost"],
      );
    } else {
      updateGUIDropdown(
        controllers["comboBCsType"],
        ["Periodic", "Dirichlet", "Neumann", "Robin"],
        ["periodic", "dirichlet", "neumann", "robin"],
      );
    }
  }

  function checkGhostBCs() {
    let res = false;
    res |=
      /Ghost/i.test(options.comboStr_1) &&
      options.boundaryConditions_1 == "combo";
    res |=
      /Ghost/i.test(options.comboStr_2) &&
      options.boundaryConditions_2 == "combo";
    res |=
      /Ghost/i.test(options.comboStr_3) &&
      options.boundaryConditions_3 == "combo";
    res |=
      /Ghost/i.test(options.comboStr_4) &&
      options.boundaryConditions_4 == "combo";
    return res;
  }

  function createProbeChart() {
    Chart.defaults.font.family = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
    "Segoe UI Symbol"`;
    Chart.defaults.font.size = "11";
    const textCol = getComputedStyle(document.documentElement).getPropertyValue(
      "--text-color",
    );
    Chart.defaults.color = textCol;
    if (inDarkMode()) {
      Chart.defaults.borderColor = getComputedStyle(
        document.documentElement,
      ).getPropertyValue("--ui-button-border-color");
    }
    probeChart = new Chart(document.getElementById("probeChart"), {
      type: "line",
      options: {
        borderWidth: 2.5,
        borderColor: getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--link-color"),
        layout: { padding: { top: 17, right: 17 } },
        responsive: true,
        animation: false,
        maintainAspectRatio: false,
        parsing: false,
        scales: {
          x: {
            type: "linear",
            ticks: {
              maxTicksLimit: 2,
              callback: function (value, index, ticks) {
                return " ";
              },
            },
          },
          y: {
            type: "linear",
            grace: "5%",
            ticks: {
              maxTicksLimit: 10,
              callback: function (value, index, ticks) {
                return shortestStringNum(value, 3);
              },
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          decimation: {
            enabled: true,
            algorithm: "lttb",
            threshold: 200,
          },
        },
      },
      data: {
        datasets: [{ data: [], pointStyle: false }],
      },
    });
    probeChart.limMax = -Infinity;
    probeChart.limMin = Infinity;
    probeChart.nextUpdateTime = 0;
    probeChart.targetDataLength = 200;
    probeChart.dataStore = [];
    configureProbe();
  }

  function addProbeData(x, y) {
    if (!probeChart) return;
    if (!readyForProbeUpdate()) return;
    // We try to target a certain number of data points in order to make the chart display nicely
    // in a small area.
    probeChart.nextUpdateTime =
      uniforms.t.value + options.probeLength / probeChart.targetDataLength;
    addChartData(probeChart, x, y);
  }

  function addChartData(chart, label, value) {
    // Throw away values that are too old.
    const threshold = uniforms.t.value - options.probeLength;
    for (var i = 0; i < chart.dataStore.length; i++) {
      if (chart.dataStore[i].x >= threshold) break;
    }
    chart.dataStore = chart.dataStore.slice(i);

    // Add the new value.
    chart.dataStore.push({ x: label, y: value });
    chart.data.datasets[0].data = chart.dataStore;
    let opts = chart.options.scales;
    opts.x.max = chart.dataStore.slice(-1)[0].x;
    opts.x.min = opts.x.max - options.probeLength;
    chart.limMin = Math.min(chart.limMin, value);
    chart.limMax = Math.max(chart.limMax, value);
    if (isNaN(value)) {
      chart.limMax = -Infinity;
      chart.limMin = Infinity;
    }
    opts.y.suggestedMin = chart.limMin;
    opts.y.suggestedMax = chart.limMax;

    // If we're in an iframe, post the data to the parent window.
    if (inIframe()) {
      window.parent.postMessage(
        { type: "probeData", data: chart.dataStore, id: localOpts.id },
        "*",
      );
    }
  }

  function updateProbeDisplay() {
    if (!probeChart) return;
    // If the probeChart is visible, update it.
    if (options.probing) probeChart.update("none");
  }

  function configureProbe() {
    if (!probeChart) return;
    clearProbe();
    // Ensure that the probe shader is up to date.
    setProbeShader();
    if (options.probing) {
      $("#probeChartContainer").show();
      $("#logo").hide();
    } else {
      $("#probeChartContainer").hide();
    }
    $("#probeChartMaximise").hide();
    checkColourbarPosition();
    if (options.probeType == "sample") {
      // Show probeX and probeY controllers.
      controllers["prX"].show();
      if (options.dimension == 2) {
        controllers["prY"].show();
      } else {
        controllers["prY"].hide();
      }
      if (options.plotType != "surface") {
        $("#probeTargetButton").show();
        $("#probeTargetButton").visible();
      }
    } else {
      // Hide probeX and probeY controllers.
      controllers["prX"].hide();
      controllers["prY"].hide();
      $("#probeTargetButton").hide();
      $("#probeTargetButton").invisible();
    }
  }

  function clearProbe() {
    if (!probeChart) return;
    probeChart.dataStore = [];
    probeChart.nextUpdateTime = 0;
    probeChart.limMin = Infinity;
    probeChart.limMax = -Infinity;
    delete probeChart.options.scales.y.suggestedMin;
    delete probeChart.options.scales.y.suggestedMax;
    probeChart.update("none");
  }

  function snapProbeAxes() {
    if (!probeChart) return;
    const data = probeChart.dataStore;
    if (data.length == 0) return;
    let min = data[0].y;
    let max = min;
    for (let i = 1; i < data.length; i++) {
      min = Math.min(min, data[i].y);
      max = Math.max(max, data[i].y);
    }
    probeChart.limMin = min;
    probeChart.limMax = max;
    let opts = probeChart.options.scales;
    opts.y.suggestedMin = probeChart.limMin;
    opts.y.suggestedMax = probeChart.limMax;
    probeChart.update("none");
  }

  function setProbeAxes(min, max) {
    if (!probeChart) return;
    let opts = probeChart.options.scales;
    opts.y.min = min;
    opts.y.max = max;
  }

  function clearProbeAxes(min, max) {
    if (!probeChart) return;
  }

  function readyForProbeUpdate() {
    return uniforms.t.value >= probeChart.nextUpdateTime;
  }

  function autoSetProbeLength() {
    if (!probeChart) return;
    options.probeLength = 300 * options.dt * options.numTimestepsPerFrame;
  }

  function showAllUI() {
    if (!uiHidden) return;
    uiHidden = false;
    $(".ui").removeClass("hidden");
    editViewFolder.domElement.classList.remove("hidden");
    $("#add_view").removeClass("hidden");
    // Reset any custom positioning for the Story ui.
    $(".ui").css("top", "");
    $(":root").css("--views-ui-offset", viewUIOffsetInit);
    // Ensure that the correct play/pause button is showing.
    isRunning ? playSim() : pauseSim();
    $("#pause").css("display", "");
    $("#play").css("display", "");
    // Check for any positioning that relies on elements being visible.
    checkColourbarPosition();
    checkColourbarLogoCollision();
    resizeEquationDisplay();
  }

  function hideAllUI() {
    if (uiHidden) return;
    uiHidden = true;
    $(".ui").addClass("hidden");
  }

  // Generate a QR code from the link to the current simulation.
  function generateSimQR(url) {
    // Remove any existing QR code.
    $("#link_qr").empty();
    const qrCode = new QRCode(document.getElementById("link_qr"), {
      text: url,
      width: 128,
      height: 128,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  }

  function shortenURL(base, opts) {
    // Abort any existing fetch request.
    abortShorten();

    // Check the to-be-shortened URL against the last requested to see if it's the same.
    if (opts == lastShortenedOpts) {
      saveShortURL(opts, lastShortKey);
      return;
    }

    // Check to see if opts is in localStorage. Really, this supercedes the above check.
    let cachedKey = localStorage.getItem("long:" + opts);
    if (cachedKey) {
      saveShortURL(opts, cachedKey);
      return;
    }

    // Remove the visual indicator of a minified link.
    document.getElementById("shortenedLabel").classList.remove("visible");

    const shortenAborter = new AbortController();
    const signal = shortenAborter.signal;
    const endpoint = "https://link-shortener.8dsf27772t.workers.dev";
    // opts contains the original URL
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalURL: opts }),
      signal: signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          console.log("Error creating short URL:", response.status);
          return;
        }

        const data = await response.json();
        const shortKey = data.shortKey;

        if (shortKey && typeof shortKey === "string") {
          saveShortURL(opts, shortKey);
        }
      })
      .catch(() => {});
  }

  function abortShorten() {
    if (shortenAborter) {
      shortenAborter.abort();
    }
  }

  function saveShortURL(opts, shortKey) {
    const base = location.origin + location.pathname.replace(/\/$/, "");
    lastShortenedOpts = opts;
    lastShortKey = shortKey;
    localStorage.setItem("long:" + opts, shortKey);
    localStorage.setItem("short:" + shortKey, opts);
    simURL = base + "?mini=" + shortKey;
    document.getElementById("shortenedLabel").classList.add("visible");
  }

  function configureWebcam() {
    if (!options.captureWebcam) {
      stopWebcam();
    }
    if (options.captureWebcam) {
      startWebcam();
    }
  }

  // Capture an image from the webcam every n seconds and save it to imageSourceOne as a texture.
  function startWebcam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log("getUserMedia is not supported in this browser");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();
        let ctx = camCanvas.getContext("2d");
        camCanvas.width = 640;
        camCanvas.height = 480;
        function handler() {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(
            video,
            -camCanvas.width,
            0,
            camCanvas.width,
            camCanvas.height,
          );
          ctx.restore();
          const dataURL = camCanvas.toDataURL("image/png");
          const image = new Image();
          image.src = dataURL;
          image.onload = function () {
            let texture = new THREE.Texture();
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.image = image;
            texture.needsUpdate = true;
            uniforms.imageSourceOne.value = texture;
          };
        }
        webcamTimer = setTimeout(function tick() {
          handler();
          webcamTimer = setTimeout(tick, options.captureWebcamDelay);
        }, options.captureWebcamDelay);
      })
      .catch((err) => {
        console.log("Error accessing webcam:", err);
      });
  }

  function stopWebcam() {
    clearTimeout(webcamTimer);
    // Stop the webcam stream.
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
    }
  }

  function findAllFunCalls(input, fun) {
    const calls = [];
    const regex = new RegExp(`\\b${fun}\\s*\\(`, "g");
    let match;

    while ((match = regex.exec(input)) !== null) {
      let start = match.index + match[0].length - 1;
      let depth = 1;
      let end = start;

      while (end < input.length && depth > 0) {
        end++;
        const char = input[end];
        if (char === "(") depth++;
        else if (char === ")") depth--;
      }

      if (depth === 0) {
        const fullCall = input.slice(match.index, end + 1);
        const argsStr = input.slice(start + 1, end);
        const args = splitArgs(argsStr);
        calls.push({
          start: match.index,
          end: end + 1,
          fullCall,
          args,
        });
      }
    }

    return calls;
  }

  // Argument splitter with nesting support
  function splitArgs(str) {
    const args = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === "," && depth === 0) {
        args.push(current.trim());
        current = "";
      } else {
        if (char === "(") depth++;
        else if (char === ")") depth--;
        current += char;
      }
    }

    if (current.trim()) args.push(current.trim());

    return args;
  }

  function setAutoPauseStopValue() {
    try {
      autoPauseStopValue = evaluateWithParams(options.autoPauseAt);
    } catch (error) {
      throwError(
        "Unable to evaluate " +
          options.autoPauseAt +
          ". Please check the definition of the auto-pause expression.",
      );
    }
  }

  // Evaluate a string with kinetic parameter substitutions.
  // Errors should be caught by the caller.
  function evaluateWithParams(str) {
    let regex;
    str = String(str);
    for (const nameVal of kineticParamsVals) {
      regex = new RegExp("\\b" + nameVal[0] + "\\b", "g");
      str = str.replaceAll(regex, "(" + nameVal[1] + ")");
    }
    return parser.evaluate(str);
  }

  function setDocTitle(val) {
    let str = "VisualPDE Simulation";
    if (val?.trim()) {
      str = `${val.trim()} | ${str}`;
    }
    document.title = str;
  }

  function updateGlobalIntegral() {
    simDomain.material = globalIntegralMaterial;
    if (numGroups(Number(options.numSpecies)) > 1) {
      uniforms.textureSource.value = mrtSimTextures[1].texture[0];
      uniforms.textureSourceGroup1.value = mrtSimTextures[1].texture[1];
    } else {
      uniforms.textureSource.value = simTextures[1].texture;
    }
    renderer.setRenderTarget(postTexture);
    renderer.render(simScene, simCamera);
    let dA;
    if (options.dimension == 1) {
      dA = uniforms.dx.value;
    } else if (options.dimension == 2) {
      dA = uniforms.dx.value * uniforms.dy.value;
    }
    const sums = computeTextureSumGPU();
    uniforms.globalIntegralValue1.value = sums[0] * dA;
    uniforms.globalIntegralValue2.value = sums[1] * dA;
    uniforms.globalIntegralValue3.value = sums[2] * dA;
    uniforms.globalIntegralValue4.value = sums[3] * dA;
  }

  function updateViewFeatureToggleClasses(feature) {
    if (feature && viewFeatureToggles[feature]) {
      viewFeatureToggles[feature].classList.toggle(
        "feature-enabled",
        options[feature],
      );
      return;
    }
    // If no feature is specified, update all feature toggles.
    Object.keys(viewFeatureToggles).forEach((feature) => {
      viewFeatureToggles[feature].classList.toggle(
        "feature-enabled",
        options[feature],
      );
    });
  }
}
