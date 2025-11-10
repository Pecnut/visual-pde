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
} from "./drawing_shaders.js";
import {
  computeDisplayFunShaderTop,
  computeDisplayFunShaderMid,
  postGenericShaderBot,
  postShaderDomainIndicator,
  postShaderDomainIndicatorVField,
  interpolationShader,
  minMaxShader,
  probeShader,
} from "./post_shaders.js";
import { copyShader } from "../copy_shader.js";
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
  RDShaderAdvectionPreBC,
  RDShaderAdvectionPostBC,
  RDShaderDiffusionPreBC,
  RDShaderDiffusionPostBC,
  RDShaderGhostX,
  RDShaderGhostY,
  RDShaderMain,
  clampSpeciesToEdgeShader,
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
} from "./display_shaders.js";
import { getColours } from "../colourmaps.js";
import { genericVertexShader } from "../generic_shaders.js";
import {
  getPreset,
  getUserTextFields,
  getFieldsInView,
  getOldPresetFieldsToNew,
  getListOfPresetNames,
  coerceOptions,
} from "./presets.js";
import { clearShaderBot, clearShaderTop } from "./clear_shader.js";
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
    postTexture,
    interpolationTexture,
    probeTexture,
    clickTexture,
    simTextureOpts,
    minMaxTextures = [],
    checkpointTexture;
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
    lineMaterial,
    overlayLineMaterial,
    arrowMaterial,
    interpolationMaterial,
    checkpointMaterial,
    minMaxMaterial,
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
    boundaryConditionsFolder,
    initialConditionsFolder,
    advancedOptionsFolder,
    editViewFolder,
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
    shortenAborter;
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
  const defaultPreset = "GrayScott";
  const defaultSpecies = ["u", "v", "w", "q"];
  const defaultReactions = ["UFUN", "VFUN", "WFUN", "QFUN"];
  const timescaleTags = ["TU", "TV", "TW", "TQ"];
  const placeholderSp = ["SPECIES1", "SPECIES2", "SPECIES3", "SPECIES4"];
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
  let takeAScreenshot = false,
    mediaRecorder,
    videoChunks;
  let buffer,
    stateBuffer,
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
  loadOptions("default");

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
  } else {
    // Loop through entries of params and check if any are fields in options.
    // If so, apply them.
    newParams = {};
    for (let [key, value] of params) {
      if (key in options && key != "preset") {
        newParams[key] = value;
      }
    }
    showColourbarOverride =
      newParams.colourbar == "true" || newParams.colourbar == true;
    if (Object.keys(newParams).length) loadPreset(newParams, true);
  }

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
  $("#start_tour").click(function () {
    $("#welcome").css("display", "none");
    tour.start();
    window.gtag?.("event", "manual_intro_tour");
  });
  $("#close-bcs-ui").click(function () {
    closeComboBCsGUI();
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
      toggleDarkMode(e.newValue == "true", true);
    }
  });

  // When navigating away from the page, store the URL reflecting the current state in history if anything has changed.
  window.addEventListener("beforeunload", function (e) {
    // Stop any recording.
    if (isRecording) {
      stopRecording();
    }
    // // Check if the simulation has changed (options.preset will have changed).
    // if (Object.keys(diffObjects(getPreset(options.preset), options)).length) {
    //   // If so, add the URL.
    //   history.pushState({}, "", getSimURL());
    // }
  });

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
    simTextures.push(
      new THREE.WebGLRenderTarget(
        options.maxDisc,
        options.maxDisc,
        simTextureOpts,
      ),
    );
    // Store all the simulation textures in an array. They'll be in history order, so that the first element is the most
    // recent. We'll write to the first texture, with later elements being further back in time.
    simTextures.push(simTextures[0].clone());
    simTextures.push(simTextures[0].clone());
    simTextures.push(simTextures[0].clone());
    simTextures.push(simTextures[0].clone());
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
    checkpointMaterial = new THREE.MeshBasicMaterial();
    minMaxMaterial = new THREE.ShaderMaterial({
      uniforms: minMaxUniforms,
      vertexShader: genericVertexShader(),
      fragmentShader: minMaxShader(),
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
      });

    // Listen for resize events.
    window.addEventListener(
      "resize",
      function () {
        resize();
        renderIfNotRunning();
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
    simDomain.material = copyMaterial;

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

    postTexture.setSize(nXDisc + shift, nYDisc + shift);
    postprocess();

    // Dispose of and create new minmax textures.
    minMaxTextures.forEach((tex) => tex.dispose());
    minMaxTextures = [];
    let w = nXDisc + shift,
      h = nYDisc + shift;
    const minmaxTextureOpts = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    };
    // Create a number of minmax textures, each half the size of the previous.
    while (w > 1 || h > 1) {
      w = Math.max(1, Math.ceil(w / 2));
      h = Math.max(1, Math.ceil(h / 2));
      minMaxTextures.push(new THREE.WebGLRenderTarget(w, h, minmaxTextureOpts));
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
      .name("Species")
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
        resize();
        renderIfNotRunning();
      });

    root
      .add(options, "spatialStep")
      .name("Space step")
      .onFinishChange(function () {
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
        canAutoPause = uniforms.t.value < options.autoPauseAt;
        controllers["autoPauseAt"].domElement.blur();
      });

    // Let's put these in the left GUI.
    // Definitions folder.
    editEquationsFolder = leftGUI.addFolder("Edit");
    root = editEquationsFolder;
    addInfoButton(root, "/user-guide/advanced-options#edit");
    addFocusLeftGUIButton(editEquationsFolder);

    const defButtonList = addButtonList(root, "typesetCustomEqsButtonRow");
    addToggle(
      defButtonList,
      "typesetCustomEqs",
      '<i class="fa-regular fa-square-root-variable"></i> Typeset',
      setEquationDisplayType,
      null,
      "Typeset the specified equations",
    );

    controllers["TU"] = root
      .add(options, "timescale_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["TU"], selectTeX, ["TU"]);
    setOnblur(controllers["TU"], deselectTeX, ["TU"]);

    controllers["TV"] = root
      .add(options, "timescale_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["TV"], selectTeX, ["TV"]);
    setOnblur(controllers["TV"], deselectTeX, ["TV"]);

    controllers["TW"] = root
      .add(options, "timescale_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["TW"], selectTeX, ["TW"]);
    setOnblur(controllers["TW"], deselectTeX, ["TW"]);

    controllers["TQ"] = root
      .add(options, "timescale_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["TQ"], selectTeX, ["TQ"]);
    setOnblur(controllers["TQ"], deselectTeX, ["TQ"]);

    controllers["Duu"] = root
      .add(options, "diffusionStr_1_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Duu"], selectTeX, ["U", "UU"]);
    setOnblur(controllers["Duu"], deselectTeX, ["U", "UU"]);

    controllers["Duv"] = root
      .add(options, "diffusionStr_1_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Duv"], selectTeX, ["UV"]);
    setOnblur(controllers["Duv"], deselectTeX, ["UV"]);

    controllers["Duw"] = root
      .add(options, "diffusionStr_1_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Duw"], selectTeX, ["UW"]);
    setOnblur(controllers["Duw"], deselectTeX, ["UW"]);

    controllers["Duq"] = root
      .add(options, "diffusionStr_1_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Duq"], selectTeX, ["UQ"]);
    setOnblur(controllers["Duq"], deselectTeX, ["UQ"]);

    controllers["Dvu"] = root
      .add(options, "diffusionStr_2_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dvu"], selectTeX, ["VU"]);
    setOnblur(controllers["Dvu"], deselectTeX, ["VU"]);

    controllers["Dvv"] = root
      .add(options, "diffusionStr_2_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dvv"], selectTeX, ["V", "VV"]);
    setOnblur(controllers["Dvv"], deselectTeX, ["V", "VV"]);

    controllers["Dvw"] = root
      .add(options, "diffusionStr_2_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dvw"], selectTeX, ["VW"]);
    setOnblur(controllers["Dvw"], deselectTeX, ["VW"]);

    controllers["Dvq"] = root
      .add(options, "diffusionStr_2_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dvq"], selectTeX, ["VQ"]);
    setOnblur(controllers["Dvq"], deselectTeX, ["VQ"]);

    controllers["Dwu"] = root
      .add(options, "diffusionStr_3_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dwu"], selectTeX, ["WU"]);
    setOnblur(controllers["Dwu"], deselectTeX, ["WU"]);

    controllers["Dwv"] = root
      .add(options, "diffusionStr_3_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dwv"], selectTeX, ["WV"]);
    setOnblur(controllers["Dwv"], deselectTeX, ["WV"]);

    controllers["Dww"] = root
      .add(options, "diffusionStr_3_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dww"], selectTeX, ["W", "WW"]);
    setOnblur(controllers["Dww"], deselectTeX, ["W", "WW"]);

    controllers["Dwq"] = root
      .add(options, "diffusionStr_3_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dwq"], selectTeX, ["WQ"]);
    setOnblur(controllers["Dwq"], deselectTeX, ["WQ"]);

    controllers["Dqu"] = root
      .add(options, "diffusionStr_4_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dqu"], selectTeX, ["QU"]);
    setOnblur(controllers["Dqu"], deselectTeX, ["QU"]);

    controllers["Dqv"] = root
      .add(options, "diffusionStr_4_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dqv"], selectTeX, ["QV"]);
    setOnblur(controllers["Dqv"], deselectTeX, ["QV"]);

    controllers["Dqw"] = root
      .add(options, "diffusionStr_4_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dqw"], selectTeX, ["QW"]);
    setOnblur(controllers["Dqw"], deselectTeX, ["QW"]);

    controllers["Dqq"] = root
      .add(options, "diffusionStr_4_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["Dqq"], selectTeX, ["Q", "QQ"]);
    setOnblur(controllers["Dqq"], deselectTeX, ["Q", "QQ"]);

    // Custom f(u,v) and g(u,v).
    controllers["f"] = root
      .add(options, "reactionStr_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["f"], selectTeX, ["UFUN"]);
    setOnblur(controllers["f"], deselectTeX, ["UFUN"]);

    controllers["g"] = root
      .add(options, "reactionStr_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["g"], selectTeX, ["VFUN"]);
    setOnblur(controllers["g"], deselectTeX, ["VFUN"]);

    controllers["h"] = root
      .add(options, "reactionStr_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["h"], selectTeX, ["WFUN"]);
    setOnblur(controllers["h"], deselectTeX, ["WFUN"]);

    controllers["j"] = root
      .add(options, "reactionStr_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
        setEquationDisplayType();
      });
    setOnfocus(controllers["j"], selectTeX, ["QFUN"]);
    setOnblur(controllers["j"], deselectTeX, ["QFUN"]);

    parametersFolder = leftGUI.addFolder("Parameters");
    addInfoButton(parametersFolder, "/user-guide/advanced-options#parameters");
    addFocusLeftGUIButton(parametersFolder);
    setParamsFromKineticString();

    // Boundary conditions folder.
    boundaryConditionsFolder = leftGUI.addFolder("Boundary conditions");
    root = boundaryConditionsFolder;
    addInfoButton(root, "/user-guide/advanced-options#boundary-conditions");
    addFocusLeftGUIButton(boundaryConditionsFolder);

    controllers["uBCs"] = root
      .add(options, "boundaryConditions_1", {})
      .onChange(function () {
        setRDEquations();
        setBCsGUI();
        // Show the combo BCs GUI if the user has selected combo.
        if (this.getValue() == "combo") {
          document.getElementById("comboBCsButton0").click();
        }
        document.activeElement.blur();
      });
    addComboBCsButton(controllers["uBCs"], 0);

    controllers["dirichletU"] = root
      .add(options, "dirichletStr_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["neumannU"] = root
      .add(options, "neumannStr_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["robinU"] = root
      .add(options, "robinStr_1")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["comboU"] = root
      .add(options, "comboStr_1")
      .name("Details")
      .onFinishChange(function () {
        this.setValue(this.getValue());
        setRDEquations();
        if (options.boundaryConditions_1 == "combo") configureComboBCsGUI();
      });

    controllers["vBCs"] = root
      .add(options, "boundaryConditions_2", {})
      .onChange(function () {
        setRDEquations();
        setBCsGUI();
        // Show the combo BCs GUI if the user has selected combo.
        if (this.getValue() == "combo") {
          document.getElementById("comboBCsButton1").click();
        }
        document.activeElement.blur();
      });
    addComboBCsButton(controllers["vBCs"], 1);

    controllers["dirichletV"] = root
      .add(options, "dirichletStr_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["neumannV"] = root
      .add(options, "neumannStr_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["robinV"] = root
      .add(options, "robinStr_2")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["comboV"] = root
      .add(options, "comboStr_2")
      .name("Details")
      .onFinishChange(function () {
        this.setValue(this.getValue());
        setRDEquations();
        if (options.boundaryConditions_2 == "combo") configureComboBCsGUI();
      });

    controllers["wBCs"] = root
      .add(options, "boundaryConditions_3", {})
      .onChange(function () {
        setRDEquations();
        setBCsGUI();
        // Show the combo BCs GUI if the user has selected combo.
        if (this.getValue() == "combo") {
          document.getElementById("comboBCsButton2").click();
        }
        document.activeElement.blur();
      });
    addComboBCsButton(controllers["wBCs"], 2);

    controllers["dirichletW"] = root
      .add(options, "dirichletStr_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["neumannW"] = root
      .add(options, "neumannStr_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["robinW"] = root
      .add(options, "robinStr_3")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["comboW"] = root
      .add(options, "comboStr_3")
      .name("Details")
      .onFinishChange(function () {
        this.setValue(this.getValue());
        setRDEquations();
        if (options.boundaryConditions_3 == "combo") configureComboBCsGUI();
      });

    controllers["qBCs"] = root
      .add(options, "boundaryConditions_4", {})
      .name("$q$")
      .onChange(function () {
        setRDEquations();
        setBCsGUI();
        // Show the combo BCs GUI if the user has selected combo.
        if (this.getValue() == "combo") {
          document.getElementById("comboBCsButton3").click();
        }
        document.activeElement.blur();
      });
    addComboBCsButton(controllers["qBCs"], 3);

    controllers["dirichletQ"] = root
      .add(options, "dirichletStr_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["neumannQ"] = root
      .add(options, "neumannStr_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["robinQ"] = root
      .add(options, "robinStr_4")
      .onFinishChange(function () {
        this.setValue(autoCorrectSyntax(this.getValue()));
        setRDEquations();
      });

    controllers["comboQ"] = root
      .add(options, "comboStr_4")
      .name("Details")
      .onFinishChange(function () {
        this.setValue(this.getValue());
        setRDEquations();
        if (options.boundaryConditions_4 == "combo") configureComboBCsGUI();
      });

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

    // Equations folder.
    advancedOptionsFolder = leftGUI.addFolder("Advanced options");
    root = advancedOptionsFolder;
    root.domElement.classList.add("advancedOptions");
    addInfoButton(root, "/user-guide/advanced-options#advanced-options-");

    // Number of species.
    root
      .add(options, "numSpecies", { 1: 1, 2: 2, 3: 3, 4: 4 })
      .name("# Species")
      .onChange(function () {
        document.activeElement.blur();
        options.speciesNames = speciesNamesToString();
        setCustomNames();
        updateProblem();
        resetSim();
      });

    // Number of algebraic species.
    controllers["algebraicSpecies"] = root
      .add(options, "numAlgebraicSpecies", { 0: 0, 1: 1, 2: 2, 3: 3 })
      .name("# Algebraic")
      .onChange(function () {
        updatingAlgebraicSpecies = true;
        updateProblem();
        updatingAlgebraicSpecies = false;
        resetSim();
      });

    root
      .add(options, "speciesNames")
      .name("Species names")
      .onFinishChange(function () {
        setCustomNames();
      });

    // Cross diffusion.
    const crossDiffusionButtonList = addButtonList(root);
    addToggle(
      crossDiffusionButtonList,
      "crossDiffusion",
      '<i class="fa-regular fa-arrow-down-up-across-line"></i> Cross diffusion',
      function () {
        updateProblem();
      },
      "cross_diffusion_controller",
      "Toggle cross diffusion",
    );

    addToggle(
      crossDiffusionButtonList,
      "timescales",
      '<i class="fa-regular fa-clock"></i>Scales',
      function () {
        configureGUI();
        setRDEquations();
        setEquationDisplayType();
      },
      "timescales_controller",
      "Toggle the use of custom timescales",
    );

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
    root = rightGUI.addFolder("Misc.");
    addInfoButton(root, "/user-guide/advanced-options#misc-");

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

    devFolder = root.addFolder("Dev");
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

    // Add a title to the rightGUI.
    const settingsTitle = document.createElement("div");
    settingsTitle.innerHTML = "Settings";
    settingsTitle.classList.add("ui_title");
    rightGUI.domElement.prepend(settingsTitle);

    // Add a title to the leftGUI.
    const equationsTitle = document.createElement("div");
    equationsTitle.innerHTML = "Equations";
    equationsTitle.classList.add("ui_title");
    leftGUI.domElement.prepend(equationsTitle);

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
        setColourRangeFromDef();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["maxColourValue"] = root
      .add(options, "maxColourValue")
      .name("Max value")
      .onFinishChange(function () {
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
        if (options.plotType == "line") setPostFunFragShader();
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
        setProbeShader();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["prX"] = root
      .add(options, "probeX")
      .name("$x$ location")
      .onFinishChange(function () {
        setProbeShader();
        renderIfNotRunning();
        updateView(this.property);
      });

    controllers["prY"] = root
      .add(options, "probeY")
      .name("$y$ location")
      .onFinishChange(function () {
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

    addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-bullseye"></i> Contours',
      "Show contour options",
      "contoursFolder",
      ["wide"],
    );

    addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-lightbulb"></i> Lighting',
      "Show lighting options",
      "embossFolder",
      ["wide"],
    );

    addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-clover"></i> Overlay',
      "Show overlay options",
      "overlayFolder",
      ["wide"],
    );

    addViewsSubmenuToggle(
      effectsButtons,
      '<i class="fa-solid fa-arrow-right-arrow-left"></i> Vector field',
      "Show vector field options",
      "vectorFieldFolder",
      ["wide"],
    );

    addViewsSubmenuToggle(
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
          uniforms.t.value >= options.autoPauseAt
        ) {
          // Pause automatically if this option is selected and we're past the set time, but only once.
          canAutoPause = false;
          pauseSim();
          break;
        }
        if (shaderContainsRAND && !options.setSeed) updateRandomSeed();
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
    // Construct a drawing shader based on the selected type and the value string.
    // Insert any user-defined kinetic parameters, given as a string that needs parsing.
    // Extract variable definitions, separated by semicolons or commas, ignoring whitespace.
    let shaderStr = kineticUniformsForShader() + drawShaderTop();
    let radiusStr =
      "float brushRadius = " +
      parseShaderString(options.brushRadius.toString()) +
      ";\n";

    // If the radius string contains any references to u,v,w,q, replace them with references to the species at the
    // brush centre, not the current pixel.
    radiusStr = radiusStr.replace(/\buvwq\./g, "uvwqBrush.");
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

    // Configure the action of the brush.
    if (options.brushType == "custom") {
      shaderStr += drawShaderCustom();
      shaderStr += options.brushAction.includes("replace")
        ? drawShaderBotReplace()
        : drawShaderBotAdd();
    } else {
      switch (options.brushAction) {
        case "replace":
          shaderStr += drawShaderFactorSharp();
          shaderStr += drawShaderBotReplace();
          break;
        case "add":
          shaderStr += drawShaderFactorSharp();
          shaderStr += drawShaderBotAdd();
          break;
        case "smoothreplace":
          shaderStr += drawShaderFactorSmooth();
          shaderStr += drawShaderBotReplace();
          break;
        case "smoothadd":
          shaderStr += drawShaderFactorSmooth();
          shaderStr += drawShaderBotAdd();
          break;
      }
    }
    // Configure the displayed cursor.
    configureCursorDisplay();
    // Substitute in the correct colour code.
    shaderStr = selectColourspecInShaderStr(shaderStr);
    shaderStr = replaceMINXMINY(shaderStr);
    assignFragmentShader(drawMaterial, shaderStr);
    drawMaterial.needsUpdate = true;
  }

  function setDisplayColourAndType() {
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
    let shader = kineticUniformsForShader() + fiveColourDisplayTop();
    if (options.emboss) {
      shader += embossShader();
      setEmbossUniforms();
    }
    if (options.contours) {
      shader += contourShader();
      setContourUniforms();
    }
    if (options.overlay) {
      shader += overlayShader().replaceAll(
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
    for (let ind = 1; ind < simTextures.length; ind++) {
      uniforms.textureSource.value = simTextures[ind].texture;
      renderer.setRenderTarget(simTextures[ind - 1]);
      renderer.render(simScene, simCamera);
    }
    simTextures.rotate(-1);
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
        uniforms.textureSource.value = simTextures[1].texture;
        uniforms.textureSource1.value = simTextures[2].texture;
        uniforms.dt.value = options.dt;
        renderer.setRenderTarget(simTextures[0]);
        renderer.render(simScene, simCamera);
        simTextures.rotate(-1);
        uniforms.t.value += options.dt;
        break;
      case "AB2":
        simDomain.material = simMaterials["AB2"];
        uniforms.textureSource.value = simTextures[1].texture;
        uniforms.textureSource1.value = simTextures[2].texture;
        uniforms.dt.value = options.dt;
        renderer.setRenderTarget(simTextures[0]);
        renderer.render(simScene, simCamera);
        simTextures.rotate(-1);
        uniforms.t.value += options.dt;
        break;
      case "Mid":
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
        break;
      case "RK4":
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
        break;
    }
  }

  function enforceDirichlet() {
    // Enforce any Dirichlet boundary conditions.
    simDomain.material = dirichletMaterial;
    // We'll do 1->0 then 2->1 etc, then cycle.
    for (let ind = 1; ind < simTextures.length; ind++) {
      uniforms.textureSource.value = simTextures[ind].texture;
      renderer.setRenderTarget(simTextures[ind - 1]);
      renderer.render(simScene, simCamera);
    }
    simTextures.rotate(-1);
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
      uniforms.textureSource.value = simTextures[1].texture;
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
    uniforms.textureSource.value = simTextures[1].texture;
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
    uniforms.textureSource1.value = simTextures[1].texture;
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

  function clearTextures() {
    setRenderSizeToDisc();
    if (checkpointExists && options.resetFromCheckpoints) {
      simDomain.material = checkpointMaterial;
    } else {
      simDomain.material = clearMaterial;
    }
    simTextures.forEach((tex) => {
      renderer.setRenderTarget(tex);
      renderer.render(simScene, simCamera);
    });
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
    canAutoPause = true;
    updateTimeDisplay();
    clearTextures();
    clearProbe();
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

  function parseShaderString(str) {
    // Parse a string into valid GLSL by replacing u,v,^, and integers.
    // Pad the string.
    str = " " + str + " ";

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
        return (
          "texture(textureSource, vec2((" +
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
    // Replace species with uvwq.[rgba].
    str = str.replaceAll(
      RegExp("\\b(" + anySpeciesRegexStrs[0] + ")\\b", "g"),
      function (m, d) {
        return "uvwq." + speciesToChannelChar(d);
      },
    );

    // Replace species_x, species_y etc with uvwqX.r and uvwqY.r, etc.
    // Allow for specifying forward or backward difference.
    str = str.replaceAll(
      RegExp("\\b(" + anySpeciesRegexStrs[0] + ")_([xy][fb]?2?)\\b", "g"),
      function (m, d1, d2) {
        if (d2.includes("2")) d2 = d2.slice(0, -1).repeat(2);
        return "uvwq" + d2.toUpperCase() + "." + speciesToChannelChar(d1);
      },
    );

    // Replace species_xx, species_yy etc with uvwqXX.r and uvwqYY.r, etc.
    str = str.replaceAll(
      RegExp("\\b(" + anySpeciesRegexStrs[0] + ")_(xx|yy)\\b", "g"),
      function (m, d1, d2) {
        return "uvwq" + d2.toUpperCase() + "." + speciesToChannelChar(d1);
      },
    );

    // If there are any numbers preceded by letters (eg r0), replace the number with the corresponding string.
    str = sanitise(str);

    // Replace images with function-evaluation notation, e.g. I_T -> I_T(x,y).
    str = str.replaceAll(/\b(I_[ST][RBGA]?\b)\s*(?!\()/g, "$1(x,y) ");

    // Replace images evaluated at coordinates with appropriate shader expressions.
    str = enableImageLookupInShader(str);

    // Replace integers with floats.
    while (
      str != (str = str.replace(/([^.0-9a-zA-Z])(\d+)([^.0-9])/g, "$1$2.$3"))
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

  function setRDEquations() {
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
    diffusionShader = parseNormalDiffusionStrings() + "\n";
    if (options.crossDiffusion) {
      diffusionShader +=
        parseCrossDiffusionStrings() +
        "\n" +
        RDShaderUpdateCross(Number(options.numSpecies));
    } else {
      diffusionShader += RDShaderUpdateNormal(Number(options.numSpecies));
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

    // If v should be algebraic, append this to the normal update shader.
    if (algebraicV && options.crossDiffusion) {
      algebraicShader += selectSpeciesInShaderStr(
        RDShaderAlgebraicSpecies(),
        listOfSpecies[1],
      );
    }

    // If w should be algebraic, append this to the normal update shader.
    if (algebraicW && options.crossDiffusion) {
      algebraicShader += selectSpeciesInShaderStr(
        RDShaderAlgebraicSpecies(),
        listOfSpecies[2],
      );
    }

    // If q should be algebraic, append this to the normal update shader.
    if (algebraicQ && options.crossDiffusion) {
      algebraicShader += selectSpeciesInShaderStr(
        RDShaderAlgebraicSpecies(),
        listOfSpecies[3],
      );
    }

    // Iff the user has entered u_x, u_y etc in a diffusion coefficient, it will be present in
    // the update shader as uvwxy[XY].[rgba]. If they've done this, warn them and don't update the shader.
    let match = diffusionShader.match(/\buvwq[XY]\.[rgba]\b/);
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
    let bot = [dirichletShader, algebraicShader, RDShaderBot()].join(" ");

    let type = "FE";
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

    type = "AB2";
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

    type = "Mid";
    for (let ind = 1; ind < 3; ind++) {
      assignFragmentShader(
        simMaterials[type + ind.toString()],
        replaceMINXMINY(
          [
            kineticStr,
            RDShaderTop(type + ind.toString()),
            middle,
            insertRates(RDShaderMain(type + ind.toString())),
            bot,
          ].join(" "),
        ),
      );
    }

    type = "RK4";
    for (let ind = 1; ind < 5; ind++) {
      assignFragmentShader(
        simMaterials[type + ind.toString()],
        replaceMINXMINY(
          [
            kineticStr,
            RDShaderTop(type + ind.toString()),
            middle,
            insertRates(RDShaderMain(type + ind.toString())),
            bot,
          ].join(" "),
        ),
      );
    }

    Object.keys(simMaterials).forEach(
      (key) => (simMaterials[key].needsUpdate = true),
    );

    // We will use a shader to enforce Dirichlet BCs before each timestep, but only if some Dirichlet
    // BCs have been specified.
    checkForAnyDirichletBCs();
    if (anyDirichletBCs) {
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
      dirichletMaterial.needsUpdate = true;
    }
  }

  function checkForAnyDirichletBCs() {
    anyDirichletBCs =
      options.domainViaIndicatorFun ||
      options.boundaryConditions_1 == "dirichlet" ||
      options.boundaryConditions_2 == "dirichlet" ||
      options.boundaryConditions_3 == "dirichlet" ||
      options.boundaryConditions_4 == "dirichlet" ||
      /Dirichlet/.test(options.comboStr_1) ||
      /Dirichlet/.test(options.comboStr_2) ||
      /Dirichlet/.test(options.comboStr_3) ||
      /Dirichlet/.test(options.comboStr_4);
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

  function loadPreset(preset, updateView = false) {
    // Updates the values stored in options.
    loadOptions(preset);

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

  function loadOptions(preset) {
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
          "We couldn't find a preset called '" +
            preset +
            "'." +
            (closest != null
              ? " We've loaded the closest match, '" + closest + "'."
              : "") +
            " Please check the preset specified in the URL.",
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
      loadOptions(newOptions.parent);
    }

    // Reset the kinetic parameters.
    kineticParamsCounter = 0;
    kineticParamsLabels = [];
    kineticParamsStrs = {};
    kineticNameToCont = {};

    // Coerce the new options into the correct types.
    coerceOptions(newOptions);

    // Loop through newOptions and overwrite anything already present.
    Object.assign(options, newOptions);

    // Check if the simulation should be running on load.
    isRunning = options.runningOnLoad;

    // Set custom species names and reaction names.
    setCustomNames();
    // Trim speciesNames such that there are only numSpecies names.
    options.speciesNames = speciesNamesToString();
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
    return shaderStr;
  }

  function speciesToChannelChar(speciesStr) {
    let listOfChannels = "rgba";
    return listOfChannels[speciesToChannelInd(speciesStr)];
  }

  function speciesToChannelInd(speciesStr) {
    return listOfSpecies.indexOf(speciesStr);
  }

  function setBCsGUI() {
    // Update the GUI.
    if (options.boundaryConditions_1 == "dirichlet") {
      controllers["dirichletU"].show();
    } else {
      controllers["dirichletU"].hide();
    }
    if (options.boundaryConditions_2 == "dirichlet") {
      controllers["dirichletV"].show();
    } else {
      controllers["dirichletV"].hide();
    }
    if (options.boundaryConditions_3 == "dirichlet") {
      controllers["dirichletW"].show();
    } else {
      controllers["dirichletW"].hide();
    }
    if (options.boundaryConditions_4 == "dirichlet") {
      controllers["dirichletQ"].show();
    } else {
      controllers["dirichletQ"].hide();
    }

    if (options.boundaryConditions_1 == "neumann") {
      controllers["neumannU"].show();
    } else {
      controllers["neumannU"].hide();
    }
    if (options.boundaryConditions_2 == "neumann") {
      controllers["neumannV"].show();
    } else {
      controllers["neumannV"].hide();
    }
    if (options.boundaryConditions_3 == "neumann") {
      controllers["neumannW"].show();
    } else {
      controllers["neumannW"].hide();
    }
    if (options.boundaryConditions_4 == "neumann") {
      controllers["neumannQ"].show();
    } else {
      controllers["neumannQ"].hide();
    }

    if (options.boundaryConditions_1 == "robin") {
      controllers["robinU"].show();
    } else {
      controllers["robinU"].hide();
    }
    if (options.boundaryConditions_2 == "robin") {
      controllers["robinV"].show();
    } else {
      controllers["robinV"].hide();
    }
    if (options.boundaryConditions_3 == "robin") {
      controllers["robinW"].show();
    } else {
      controllers["robinW"].hide();
    }
    if (options.boundaryConditions_4 == "robin") {
      controllers["robinQ"].show();
    } else {
      controllers["robinQ"].hide();
    }

    let overrideShowComboStr = true;
    if (options.plotType != "surface") {
      ["uBCs", "vBCs", "wBCs", "qBCs"].forEach((str) => {
        controllers[str].domElement
          .getElementsByClassName("combo-bcs")[0]
          .classList.remove("hidden");
      });
      overrideShowComboStr = false;
    }

    // Always hide the combo BCs string.
    controllers["comboU"].hide();
    controllers["comboV"].hide();
    controllers["comboW"].hide();
    controllers["comboQ"].hide();

    if (options.showComboStr || overrideShowComboStr) {
      if (options.boundaryConditions_1 == "combo") controllers["comboU"].show();
      if (options.boundaryConditions_2 == "combo") controllers["comboV"].show();
      if (options.boundaryConditions_3 == "combo") controllers["comboW"].show();
      if (options.boundaryConditions_4 == "combo") controllers["comboQ"].show();
    }

    // If the comboBCsGUI is visible, make all clickAreas visible.
    if (comboBCsOptions.open) {
      revealClickAreas();
    }

    const BCsControllers = [
      controllers["uBCs"],
      controllers["vBCs"],
      controllers["wBCs"],
      controllers["qBCs"],
    ];
    if (options.domainViaIndicatorFun) {
      BCsControllers.forEach((cont) => {
        updateGUIDropdown(
          cont,
          ["Dirichlet", "Neumann", "Robin"],
          ["dirichlet", "neumann", "robin"],
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
    // Insert any user-defined kinetic parameters, as uniforms.
    let shaderStr = kineticUniformsForShader() + clearShaderTop();
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
    shaderStr += "float u = " + parseShaderString(options.initCond_1) + ";\n";
    shaderStr += "float v = " + parseShaderString(options.initCond_2) + ";\n";
    shaderStr += "float w = " + parseShaderString(options.initCond_3) + ";\n";
    shaderStr += "float q = " + parseShaderString(options.initCond_4) + ";\n";
    shaderStr += clearShaderBot();
    shaderStr = replaceMINXMINY(shaderStr);
    assignFragmentShader(clearMaterial, shaderStr);
    clearMaterial.needsUpdate = true;
  }

  function setProbeShader() {
    // Insert any user-defined kinetic parameters, as uniforms.
    let shaderStr = kineticUniformsForShader() + probeShader();
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

  function showVGUIPanels() {
    if (options.timescales) controllers["TV"].show();
    if (options.crossDiffusion) {
      controllers["Duv"].show();
      controllers["Dvu"].show();
    } else {
      controllers["Duv"].hide();
      controllers["Dvu"].hide();
    }
    controllers["Dvv"].show();
    controllers["g"].show();
    controllers["initCond_2"].show();
    controllers["vBCs"].show();
  }

  function showWGUIPanels() {
    if (options.timescales) controllers["TW"].show();
    if (options.crossDiffusion) {
      controllers["Duw"].show();
      controllers["Dvw"].show();
      controllers["Dwu"].show();
      controllers["Dwv"].show();
    } else {
      controllers["Duw"].hide();
      controllers["Dvw"].hide();
      controllers["Dwu"].hide();
      controllers["Dwv"].hide();
    }
    controllers["Dww"].show();
    controllers["h"].show();
    controllers["initCond_3"].show();
    controllers["wBCs"].show();
  }

  function showQGUIPanels() {
    if (options.timescales) controllers["TQ"].show();
    if (options.crossDiffusion) {
      controllers["Duq"].show();
      controllers["Dvq"].show();
      controllers["Dwq"].show();
      controllers["Dqu"].show();
      controllers["Dqv"].show();
      controllers["Dqw"].show();
    } else {
      controllers["Dwq"].hide();
      controllers["Dqu"].hide();
      controllers["Dvq"].hide();
      controllers["Duq"].hide();
      controllers["Dqv"].hide();
      controllers["Dqw"].hide();
    }
    controllers["Dqq"].show();
    controllers["j"].show();
    controllers["initCond_4"].show();
    controllers["qBCs"].show();
  }

  function hideVGUIPanels() {
    controllers["TV"].hide();
    controllers["Duv"].hide();
    controllers["Dvu"].hide();
    controllers["Dvv"].hide();
    controllers["g"].hide();
    controllers["initCond_2"].hide();
    controllers["vBCs"].hide();
  }

  function hideWGUIPanels() {
    controllers["TW"].hide();
    controllers["Duw"].hide();
    controllers["Dvw"].hide();
    controllers["Dwu"].hide();
    controllers["Dwv"].hide();
    controllers["Dww"].hide();
    controllers["h"].hide();
    controllers["initCond_3"].hide();
    controllers["wBCs"].hide();
  }

  function hideQGUIPanels() {
    controllers["TQ"].hide();
    controllers["Duq"].hide();
    controllers["Dvq"].hide();
    controllers["Dwq"].hide();
    controllers["Dqu"].hide();
    controllers["Dqv"].hide();
    controllers["Dqw"].hide();
    controllers["Dqq"].hide();
    controllers["j"].hide();
    controllers["initCond_4"].hide();
    controllers["qBCs"].hide();
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
    let shaderStr = kineticUniformsForShader() + computeDisplayFunShaderTop();
    shaderStr += computeDisplayFunShaderMid()
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
    if (options.crossDiffusion && parseInt(options.numSpecies) > 1) {
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

    // Show all timescale panels to begin with.
    timescaleTags.forEach((tag) => controllers[tag].show());

    // Hide/Show VWQGUI panels.
    hideVGUIPanels();
    hideWGUIPanels();
    hideQGUIPanels();
    switch (parseInt(options.numSpecies)) {
      case 4:
        showQGUIPanels();
      case 3:
        showWGUIPanels();
      case 2:
        showVGUIPanels();
    }
    // Hide timescale panels if we don't need them.
    if (!options.timescales) {
      timescaleTags.forEach((tag) => controllers[tag].hide());
    }

    // Configure the controller names.
    // We'll set the generic names then alter any algebraic ones.
    if (options.crossDiffusion) {
      setGUIControllerName(controllers["Duu"], TeXStrings["Duu"], tooltip);
      setGUIControllerName(controllers["Duv"], TeXStrings["Duv"], tooltip);
      setGUIControllerName(controllers["Duw"], TeXStrings["Duw"], tooltip);
      setGUIControllerName(controllers["Duq"], TeXStrings["Duq"], tooltip);
      setGUIControllerName(controllers["Dvu"], TeXStrings["Dvu"], tooltip);
      setGUIControllerName(controllers["Dvv"], TeXStrings["Dvv"], tooltip);
      setGUIControllerName(controllers["Dvw"], TeXStrings["Dvw"], tooltip);
      setGUIControllerName(controllers["Dvq"], TeXStrings["Dvq"], tooltip);
      setGUIControllerName(controllers["Dwu"], TeXStrings["Dwu"], tooltip);
      setGUIControllerName(controllers["Dwv"], TeXStrings["Dwv"], tooltip);
      setGUIControllerName(controllers["Dww"], TeXStrings["Dww"], tooltip);
      setGUIControllerName(controllers["Dwq"], TeXStrings["Dwq"], tooltip);
      setGUIControllerName(controllers["Dqu"], TeXStrings["Dqu"], tooltip);
      setGUIControllerName(controllers["Dqv"], TeXStrings["Dqv"], tooltip);
      setGUIControllerName(controllers["Dqw"], TeXStrings["Dqw"], tooltip);
      setGUIControllerName(controllers["Dqq"], TeXStrings["Dqq"], tooltip);
    } else {
      setGUIControllerName(controllers["Duu"], TeXStrings["Du"], tooltip);
      setGUIControllerName(controllers["Dvv"], TeXStrings["Dv"], tooltip);
      setGUIControllerName(controllers["Dww"], TeXStrings["Dw"], tooltip);
      setGUIControllerName(controllers["Dqq"], TeXStrings["Dq"], tooltip);
    }
    setGUIControllerName(controllers["f"], TeXStrings["UFUN"], tooltip);
    setGUIControllerName(controllers["g"], TeXStrings["VFUN"], tooltip);
    setGUIControllerName(controllers["h"], TeXStrings["WFUN"], tooltip);
    setGUIControllerName(controllers["j"], TeXStrings["QFUN"], tooltip);

    setGUIControllerName(controllers["TU"], TeXStrings["TU"], tooltip);
    setGUIControllerName(controllers["TV"], TeXStrings["TV"], tooltip);
    setGUIControllerName(controllers["TW"], TeXStrings["TW"], tooltip);
    setGUIControllerName(controllers["TQ"], TeXStrings["TQ"], tooltip);

    // Configure the names of algebraic controllers.
    if (algebraicV) {
      setGUIControllerName(controllers["Dvu"], TeXStrings["Dvu"], Vtooltip);
      setGUIControllerName(controllers["Dvw"], TeXStrings["Dvw"], Vtooltip);
      setGUIControllerName(controllers["Dvq"], TeXStrings["Dvq"], Vtooltip);
      setGUIControllerName(controllers["g"], TeXStrings["VFUN"], Vtooltip);
      controllers["Dvv"].hide();
    }
    if (algebraicW) {
      setGUIControllerName(controllers["Dwu"], TeXStrings["Dwu"], Wtooltip);
      setGUIControllerName(controllers["Dwv"], TeXStrings["Dwv"], Wtooltip);
      setGUIControllerName(controllers["Dwq"], TeXStrings["Dwq"], Wtooltip);
      setGUIControllerName(controllers["h"], TeXStrings["WFUN"], Wtooltip);
      controllers["Dww"].hide();
    }
    if (algebraicQ) {
      setGUIControllerName(controllers["Dqu"], TeXStrings["Dqu"], Qtooltip);
      setGUIControllerName(controllers["Dqv"], TeXStrings["Dqv"], Qtooltip);
      setGUIControllerName(controllers["Dqw"], TeXStrings["Dqw"], Qtooltip);
      setGUIControllerName(controllers["j"], TeXStrings["QFUN"], Qtooltip);
      controllers["Dqq"].hide();
    }

    // Set the names of the BCs and ICs controllers.
    setGUIControllerName(controllers["uBCs"], TeXStrings["u"]);
    setGUIControllerName(controllers["vBCs"], TeXStrings["v"]);
    setGUIControllerName(controllers["wBCs"], TeXStrings["w"]);
    setGUIControllerName(controllers["qBCs"], TeXStrings["q"]);
    setGUIControllerName(controllers["dirichletU"], TeXStrings["uD"]);
    setGUIControllerName(controllers["dirichletV"], TeXStrings["vD"]);
    setGUIControllerName(controllers["dirichletW"], TeXStrings["wD"]);
    setGUIControllerName(controllers["dirichletQ"], TeXStrings["qD"]);
    setGUIControllerName(controllers["neumannU"], TeXStrings["uN"]);
    setGUIControllerName(controllers["neumannV"], TeXStrings["vN"]);
    setGUIControllerName(controllers["neumannW"], TeXStrings["wN"]);
    setGUIControllerName(controllers["neumannQ"], TeXStrings["qN"]);
    setGUIControllerName(controllers["robinU"], TeXStrings["uN"]);
    setGUIControllerName(controllers["robinV"], TeXStrings["vN"]);
    setGUIControllerName(controllers["robinW"], TeXStrings["wN"]);
    setGUIControllerName(controllers["robinQ"], TeXStrings["qN"]);
    setGUIControllerName(controllers["initCond_1"], TeXStrings["uInit"]);
    setGUIControllerName(controllers["initCond_2"], TeXStrings["vInit"]);
    setGUIControllerName(controllers["initCond_3"], TeXStrings["wInit"]);
    setGUIControllerName(controllers["initCond_4"], TeXStrings["qInit"]);

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
      // Only allow Dirichlet or Neumann conditions.
      if (!["dirichlet", "neumann"].includes(options.boundaryConditions_1))
        options.boundaryConditions_1 = "dirichlet";
      if (!["dirichlet", "neumann"].includes(options.boundaryConditions_2))
        options.boundaryConditions_2 = "dirichlet";
      if (!["dirichlet", "neumann"].includes(options.boundaryConditions_3))
        options.boundaryConditions_3 = "dirichlet";
      if (!["dirichlet", "neumann"].includes(options.boundaryConditions_4))
        options.boundaryConditions_4 = "dirichlet";
    }

    // Set options that only depend on the number of species.
    switch (parseInt(options.numSpecies)) {
      case 1:
        options.crossDiffusion = false;

        // Ensure that u is the brush target and that the no other species is in options.whatToPlot.
        options.whatToDraw = listOfSpecies[0];
        if (
          new RegExp("\\b(" + anySpeciesRegexStrs[1] + ")\\b").test(
            options.whatToPlot,
          )
        ) {
          options.whatToPlot = listOfSpecies[0];
        }

        // Set the diffusion of v and w to zero to prevent them from causing numerical instability.
        options.diffusionStr_1_2 = "0";
        options.diffusionStr_1_3 = "0";
        options.diffusionStr_1_4 = "0";
        options.diffusionStr_2_1 = "0";
        options.diffusionStr_2_2 = "0";
        options.diffusionStr_2_3 = "0";
        options.diffusionStr_2_4 = "0";
        options.diffusionStr_3_1 = "0";
        options.diffusionStr_3_2 = "0";
        options.diffusionStr_3_3 = "0";
        options.diffusionStr_3_4 = "0";
        options.diffusionStr_4_1 = "0";
        options.diffusionStr_4_2 = "0";
        options.diffusionStr_4_3 = "0";
        options.diffusionStr_4_4 = "0";

        // Set v,w, and q to be periodic to reduce computational overhead.
        options.boundaryConditions_2 = "periodic";
        options.initCond_2 = "0";
        options.reactionStr_2 = "0";
        options.boundaryConditions_3 = "periodic";
        options.initCond_3 = "0";
        options.reactionStr_3 = "0";
        options.boundaryConditions_4 = "periodic";
        options.initCond_4 = "0";
        options.reactionStr_4 = "0";

        // If the f string contains any v,w, or q references, clear it.
        regex = new RegExp("\\b(" + anySpeciesRegexStrs[1] + ")\\b");
        if (regex.test(options.reactionStr_1)) {
          options.reactionStr_1 = "0";
        }
        break;
      case 2:
        // Ensure that species 1 or 2 is being displayed on the screen (and the brush target).
        if (
          (options.whatToDraw == listOfSpecies[2]) |
          (options.whatToDraw == listOfSpecies[3])
        ) {
          options.whatToDraw = listOfSpecies[0];
        }
        if (
          new RegExp("\\b(" + anySpeciesRegexStrs[2] + ")\\b").test(
            options.whatToPlot,
          )
        ) {
          options.whatToPlot = listOfSpecies[0];
        }

        // Set the diffusion of w and q to zero to prevent them from causing numerical instability.
        options.diffusionStr_1_3 = "0";
        options.diffusionStr_1_4 = "0";
        options.diffusionStr_2_3 = "0";
        options.diffusionStr_2_4 = "0";
        options.diffusionStr_3_1 = "0";
        options.diffusionStr_3_2 = "0";
        options.diffusionStr_3_3 = "0";
        options.diffusionStr_3_4 = "0";
        options.diffusionStr_4_1 = "0";
        options.diffusionStr_4_2 = "0";
        options.diffusionStr_4_3 = "0";
        options.diffusionStr_4_4 = "0";

        // Set w and q to be periodic to reduce computational overhead.
        options.boundaryConditions_3 = "periodic";
        options.initCond_3 = "0";
        options.reactionStr_3 = "0";

        options.boundaryConditions_4 = "periodic";
        options.initCond_4 = "0";
        options.reactionStr_4 = "0";

        // If the f or g strings contains any w or q references, clear them.
        regex = new RegExp("\\b(" + anySpeciesRegexStrs[2] + ")\\b");
        if (regex.test(options.reactionStr_1)) {
          options.reactionStr_1 = "0";
        }
        if (regex.test(options.reactionStr_2)) {
          options.reactionStr_2 = "0";
        }
        break;
      case 3:
        // Ensure that species 1-3 is being displayed on the screen (and the brush target).
        if (options.whatToDraw == listOfSpecies[3]) {
          options.whatToDraw = listOfSpecies[0];
        }
        if (
          new RegExp("\\b(" + anySpeciesRegexStrs[3] + ")\\b").test(
            options.whatToPlot,
          )
        ) {
          options.whatToPlot = listOfSpecies[0];
        }

        // Set the diffusion of q to zero to prevent it from causing numerical instability.
        options.diffusionStr_1_4 = "0";
        options.diffusionStr_2_4 = "0";
        options.diffusionStr_3_4 = "0";
        options.diffusionStr_4_1 = "0";
        options.diffusionStr_4_2 = "0";
        options.diffusionStr_4_3 = "0";
        options.diffusionStr_4_4 = "0";

        // Set q to be periodic to reduce computational overhead.
        options.boundaryConditions_4 = "periodic";
        options.initCond_4 = "0";
        options.reactionStr_4 = "0";

        // If the f, g, or h strings contains any q references, clear them.
        regex = new RegExp("\\b(" + anySpeciesRegexStrs[3] + ")\\b");
        if (regex.test(options.reactionStr_1)) {
          options.reactionStr_1 = "0";
        }
        if (regex.test(options.reactionStr_2)) {
          options.reactionStr_2 = "0";
        }
        if (regex.test(options.reactionStr_3)) {
          options.reactionStr_3 = "0";
        }
        break;
      case 4:
        break;
    }

    // Configure any type-specific options.
    switch (equationType) {
      case 3:
        // 2SpeciesCrossDiffusionAlgebraicV
        options.diffusionStr_2_2 = "0";
        break;
      case 6:
        // 3SpeciesCrossDiffusionAlgebraicW
        options.diffusionStr_3_3 = "0";
        break;
      case 7:
        // 3SpeciesCrossDiffusionAlgebraicVW
        options.diffusionStr_2_2 = "0";
        options.diffusionStr_3_3 = "0";
        break;
      case 10:
        // 4SpeciesCrossDiffusionAlgebraicQ
        options.diffusionStr_4_4 = "0";
        break;
      case 11:
        // 4SpeciesCrossDiffusionAlgebraicWQ
        options.diffusionStr_3_3 = "0";
        options.diffusionStr_4_4 = "0";
        break;
      case 12:
        // 4SpeciesCrossDiffusionAlgebraicVWQ
        options.diffusionStr_2_2 = "0";
        options.diffusionStr_3_3 = "0";
        options.diffusionStr_4_4 = "0";
        break;
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
    problemTypeFromOptions();
    configurePlotType();
    configureOptions();
    configureGUI();
    setComputedUniforms();
    updateShaders();
    configureDimension(); // Triggers a render via a resize, so must be called after updateShaders.
    setEquationDisplayType();
  }

  function setEquationDisplayType() {
    // Given an equation type (specified as an integer selector), set the type of
    // equation in the UI element that displays the equations.
    let str = equationTEX[equationType];

    let regex;
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
    regexes["UFUN"] = /\b(UFUN)/g;
    regexes["VFUN"] = /\b(VFUN)/g;
    regexes["WFUN"] = /\b(WFUN)/g;
    regexes["QFUN"] = /\b(QFUN)/g;
    regexes["TU"] = /\b(tau_{u})/g;
    regexes["TV"] = /\b(tau_{v})/g;
    regexes["TW"] = /\b(tau_{w})/g;
    regexes["TQ"] = /\b(tau_{q})/g;

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

      // Map empty strings to 0.
      Object.keys(associatedStrs).forEach(function (key) {
        if (isEmptyString(associatedStrs[key])) associatedStrs[key] = "0";
      });

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
      ["UFUN", "VFUN", "WFUN", "QFUN"].forEach(function (tag) {
        str = replaceUserDefReac(str, regexes[tag], associatedStrs[tag]);
      });

      // Replace the timescale strings.
      timescaleTags.forEach(function (tag) {
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
      regex =
        /(\\vnabla\s*\\cdot\s*\()\[-([\w\{\}\(\)]*)\]\s*(\\vnabla\s*([uvwq])\s*\))/g;
      str = str.replaceAll(regex, "-$1$2$3");

      // Look for div(grad(blah)) and replace it with lap.
      regex = /\\vnabla\s*\\cdot\s*\(\s*\\vnabla\s*([uvwq])\s*\)/g;
      str = str.replaceAll(regex, "\\lap $1");

      // Look for div(const * grad(blah)), and move the constant outside the bracket.
      // Constant in space <=> it doesn't contain [xy], [uvwq](?:_[x|y|xx|yy])?, (?:I_[ST][RGBA]?).
      // We'll also treat matrices as non-constants for typesetting.
      regex =
        /\\vnabla\s*\\cdot\s*\(\s*((?!\\vnabla).*)\s*\\vnabla\s*([uvwq])\s*\)/g;
      str = str.replaceAll(regex, function (match, g1, g2) {
        const innerRegex = /\b(?:[xy]|[uvwq](?:_[xy])?|(?:I_[ST][RGBA]?))\b/g;
        if (!innerRegex.test(g1) && !g1.includes("\\dmat")) {
          return g1.trim() + " \\lap " + g2;
        } else {
          return match;
        }
      });

      // Replace u_x, u_y etc with \pd{u}{x} etc. Add parentheses if followed by ^.
      regex = /(\(?)\b([uvwq])_([xy])[fb]?2?\s*(\)?)\s*(\^?)\b/g;
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
      regex = /(\(?)\b([uvwq])_(xx|yy)\s*(\)?)\s*(\^?)\b/g;
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
      regex = /\\vnabla\s*([uvwq])/g;
      str = str.replaceAll(regex, "\\textstyle \\pd{$1}{x}");
      regex = /\\lap\s*([uvwq])/g;
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

    str = parseStringToTEX(str);

    $("#typeset_equation").html(str);
    runMathJax()?.then(resizeEquationDisplay);
  }

  function parseStringToTEX(str) {
    // Parse a string into valid TEX by replacing * and ^.
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
        // Replace digits with words in the arguments.
        argStr = replaceDigitsWithWords(argStr);
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

  function createParameterController(label, isNextParam) {
    let controller;

    // Define a function that we can use to concisely add in a slider depending on the string.
    function createSlider() {
      const hasChanged = controller.lastString != kineticParamsStrs[label];
      if (!hasChanged) return;
      // Remove any existing sliders is anything has changed.
      if (controller.hasOwnProperty("slider")) {
        // Check if the slider has changed.
        let hasChanged = controller.lastString != kineticParamsStrs[label];
        // Remove any existing sliders.
        controller.slider.remove();
        delete controller.slider;
        // Remove the parameterSlider class from the controller.
        controller.domElement.closest("li").classList.remove("parameterSlider");
      }
      // If the string is of the form "name = val in [a,b]", create a slider underneath this controller with
      // limits a,b.
      let regex =
        /\s*(\w+)\s*=\s*(\S*)\s*in\s*[\[\(]([0-9\.\-]+)\s*,\s*(?:([0-9\.]*)\s*,)?\s*([0-9\.\-]+)[\]\)]/;
      let match = kineticParamsStrs[label].match(regex);
      if (match) {
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
        if (
          parseFloat(controller.slider.min) > parseFloat(controller.slider.max)
        ) {
          let temp = controller.slider.min;
          controller.slider.min = controller.slider.max;
          controller.slider.max = temp;
        }

        let step;
        // Define the step of the slider, which may or may not have been given.
        if (match[4] == undefined) {
          match[4] = "";
          // Choose a step that either matches the max precision of the inputs, or
          // splits the interval into 20, whichever is more precise.
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
        controller.slider.precision = Math.max(
          controller.slider.precision,
          parseFloat(step).countDecimals(),
        );
        controller.slider.step = step.toString();

        // Assign the initial value, which should happen after step has been defined.
        controller.slider.value = match[2];

        // Use the input event of the slider to update the controller and the simulation.
        controller.slider.addEventListener("input", function () {
          controller.slider.style.setProperty(
            "--value",
            controller.slider.value,
          );
          let valueRegex = /\s*(\w+)\s*=\s*(\S*)\s*/g;
          kineticParamsStrs[label] = kineticParamsStrs[label].replace(
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
        controller.lastString = kineticParamsStrs[label];
      }
    }
    if (isNextParam) {
      kineticParamsLabels.push(label);
      kineticParamsStrs[label] = "";
      controller = parametersFolder.add(kineticParamsStrs, label).name("");
      nextParamController = controller;
      disableAutocorrect(controller.domElement.firstChild);
      controller.domElement.classList.add("params");
      controller.onFinishChange(function () {
        const index = kineticParamsLabels.indexOf(label);
        // Remove excess whitespace.
        let str = removeWhitespace(
          kineticParamsStrs[kineticParamsLabels.at(index)],
        );
        if (str == "") {
          // If the string is empty, do nothing.
        } else {
          // A parameter has been added! So, we create a new controller and assign it to this parameter,
          // delete this controller, and make a new blank controller.
          let newController = createParameterController(
            kineticParamsLabels.at(index),
            false,
          );
          // We record the name of the parameter in the controller.
          const match = str.match(/\s*(\w+)\s*=/);
          if (match) {
            let name = match[1];
            validateParamName(name);
            newController.lastName = name;
            kineticNameToCont[name] = newController;
          }
          kineticParamsCounter += 1;
          let newLabel = "params" + kineticParamsCounter;
          this.remove();
          createParameterController(newLabel, true);
          // Update the uniforms, the kinetic string for saving and, if we've added something that we've not seen before, update the shaders.
          setKineticStringFromParams();
          if (setComputedUniforms() || compileErrorOccurred) {
            // Reset the error flag.
            compileErrorOccurred = false;
            updateShaders();
          }
        }
      });
    } else {
      controller = parametersFolder.add(kineticParamsStrs, label).name("");
      disableAutocorrect(controller.domElement.firstChild);
      controller.domElement.classList.add("params");
      const match = kineticParamsStrs[label].match(/\s*(\w+)\s*=/);
      if (match) {
        let name = match[1];
        validateParamName(name);
        controller.lastName = name;
        kineticNameToCont[name] = controller;
      }
      controller.onFinishChange(function () {
        // Remove excess whitespace.
        let str = removeWhitespace(kineticParamsStrs[label]);
        if (str == "") {
          // If the string is empty, delete this controller and any associated slider.
          if (
            controller.domElement
              .closest("li")
              .hasOwnProperty("parameterSlider")
          ) {
            // Remove any existing sliders.
            controller.slider.remove();
            // Remove the parameterSlider class from the controller.
            controller.domElement
              .closest("li")
              .classList.remove("parameterSlider");
          }
          this.remove();
          // Remove the associated label and the (empty) kinetic parameters string.
          const index = kineticParamsLabels.indexOf(label);
          kineticParamsLabels.splice(index, 1);
          delete kineticParamsStrs[label];
          // Remove any uniform created with this parameter name.
          if (
            controller.hasOwnProperty("lastName") &&
            !isReservedName(controller.lastName)
          ) {
            delete uniforms[controller.lastName];
          }
        } else {
          // Otherwise, check if we need to create/modify a slider.
          createSlider();
          // Check if we need to update the parameter name and remove a redundant uniform.
          const match = replaceDigitsWithWords(str).match(/\s*(\w+)\s*=/);
          if (match) {
            let name = match[1];
            validateParamName(name);
            if (
              controller.hasOwnProperty("lastName") &&
              controller.lastName != name &&
              !isReservedName(controller.lastName)
            ) {
              delete uniforms[controller.lastName];
              controller.lastName = name;
              kineticNameToCont[name] = controller;
            }
          }
        }
        // Update the uniforms, the kinetic string for saving and, if we've added something that we've not seen before, update the shaders.
        setKineticStringFromParams();
        if (setComputedUniforms()) {
          updateShaders();
        }
      });
    }
    // Now that we've made the required controller, check the current string to see if
    // the user has requested that we make other types of controller (e.g. a slider).
    createSlider();
    // Disable autocorrect on the controller.
    disableAutocorrect(controller.domElement.firstChild);
    // Add an aria-label.
    controller.domElement.firstChild.setAttribute(
      "aria-label",
      "Custom parameter definition",
    );
    // Return the controller in case it is needed.
    return controller;
  }

  function setParamsFromKineticString() {
    // Take the kineticParams string in the options and
    // use it to populate a GUI containing these parameters
    // as individual options.
    let label,
      str,
      newLabels = [];
    // Reset the kinetic parameters.
    kineticParamsCounter = 0;
    kineticParamsLabels = [];
    kineticParamsStrs = {};
    kineticNameToCont = {};
    // Remove all existing controllers from the parameters folder.
    let existingControllers = parametersFolder.__controllers.slice();
    existingControllers.forEach(function (controller) {
      controller.remove();
    });
    nextParamController = null;

    let strs = options.kineticParams.split(";");
    for (var index = 0; index < strs.length; index++) {
      str = removeWhitespace(strs[index]);
      if (str == "") {
        // If the string is empty, do nothing.
      } else {
        // Add whitespace to the string around "=".
        str = str.replace(/(\S)=/, "$1 =");
        str = str.replace(/=(\S)/, "= $1");
        // Add whitespace after commas.
        str = str.replaceAll(/,(\S)/g, ", $1");
        label = "param" + kineticParamsCounter;
        kineticParamsCounter += 1;
        kineticParamsLabels.push(label);
        kineticParamsStrs[label] = str;
        newLabels.push(label);
      }
    }
    // Having defined all the parameters, create the controllers. This separate loop allows dependencies
    // between parameters, as all parameters have been initialised by this point.
    for (const label of newLabels) {
      createParameterController(label, false);
    }
    // Finally, create an empty controller for adding parameters.
    label = "param" + kineticParamsCounter;
    kineticParamsLabels.push(label);
    kineticParamsStrs[label] = str;
    createParameterController(label, true);
  }

  function setKineticStringFromParams() {
    // Combine the custom parameters into a single string for storage, so long as no reserved names are used.
    options.kineticParams = Object.values(kineticParamsStrs)
      .map(function (str) {
        return str.replaceAll(/"\s+"/g, " ");
      })
      .join(";");
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
    for (const curTex of minMaxTextures) {
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
        minMaxTextures.slice(-1)[0],
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
      options.contours = false;
      options.emboss = false;
      options.vectorField = false;
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
        options.vectorField = false;
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

  function sanitise(str) {
    return replaceDigitsWithWords(str);
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
    return addingNewUniform && !encounteredError;
  }

  function setKineticUniform(name, value) {
    // Set a uniform with given name and value.
    // Return true if we're adding a new uniform, which signifies that all shaders must be
    // updated to reference this new uniform.
    let addingNewUniform = false;
    let errorFlag = false;
    // Sanitise the name for the shader.
    const cleanName = sanitise(name);
    if (isReservedName(cleanName)) {
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
      addingNewUniform = !uniforms.hasOwnProperty(cleanName);
      // Define the required uniform.
      uniforms[cleanName] = {
        type: "float",
        value: value,
      };
    }
    return [addingNewUniform, errorFlag];
  }

  function kineticUniformsForShader() {
    // Given the kinetic parameters in options.kineticParams, return GLSL defining uniforms with
    // these names.
    return sanitise(
      getKineticParamNames()
        .map((x) => "uniform float " + x + ";")
        .join("\n"),
    );
  }

  /**
   * Returns a list of (name,value) pairs for parameters defined in a list of strings.
   * These can depend on each other, but not cyclically.
   *
   * @param {string[]} strs - The list of strings to evaluate.
   * @returns {[string, any][]} A list of (name, value) pairs for the evaluated parameters.
   */
  function evaluateParamVals(strs) {
    // Return a list of (name,value) pairs for parameters defined in
    // a list of strings. These can depend on each other, but not cyclically.
    // The kinetic parameters are always included.
    // strs is an array of arrays of strings [[name, value]]
    let strDict = {};
    let valDict = {};
    let badNames = [];
    let nameVals = getKineticParamNameVals();
    if (strs) {
      nameVals.push(...strs);
    }
    const names = nameVals.map((x) => x[0]);
    nameVals.forEach((x) => (strDict[x[0]] = x[1]));
    for (const nameVal of nameVals) {
      // Evaluate each parameter.
      let [name, val] = nameVal;
      if (!(name in valDict)) {
        // We've not computed the value of this yet.
        [valDict, , badNames] = evaluateParam(
          name,
          strDict,
          valDict,
          [name],
          names,
          [],
        );
      }
    }
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
   * Evaluates a parameter value based on its dependencies and returns the updated value dictionary, stack, and bad names.
   * @param {string} name - The name of the parameter to evaluate.
   * @param {Object} strDict - The dictionary of parameter names and their string representations.
   * @param {Object} valDict - The dictionary of parameter names and their numeric values.
   * @param {Array} stack - The stack of parameter names being evaluated.
   * @param {Array} names - The list of parameter names.
   * @param {Array} badNames - The list of parameter names that have cyclic dependencies.
   * @returns {Array} - An array containing the updated value dictionary, stack, and bad names.
   */
  function evaluateParam(name, strDict, valDict, stack, names, badNames) {
    // If we know the value already, don't do anything.
    if (name in valDict) return [valDict, stack.slice(0, -1), badNames];
    // Find any names in val and evaluate them.
    let regex;
    for (const otherName of names) {
      // Skip the name if it's not in vals.
      regex = new RegExp("\\b" + otherName + "\\b", "g");
      if (!regex.test(strDict[name])) continue;
      // Otherwise, check if it's a bad name.
      if (stack.includes(otherName)) {
        // We've hit a parameter that we're already trying to evaluate - cyclic!
        // Set the value to 0 and record the name as bad so that we can throw an error.
        valDict[otherName] = 0.0;
        strDict[otherName] = "0";
        strDict[name] = "0";
        badNames.push(stack.slice(stack.indexOf(otherName)));
      } else {
        // Otherwise, try and evaluate the parameter and substitute the value into the expression.
        [valDict, , badNames] = evaluateParam(
          otherName,
          strDict,
          valDict,
          [...stack, otherName],
          names,
          badNames,
        );
        strDict[name] = strDict[name].replaceAll(
          regex,
          valDict[otherName].toString(),
        );
      }
    }
    // Now that we've assigned all the values that we could need, parse the expression.
    try {
      valDict[name] = parser.evaluate(strDict[name]);
    } catch (error) {
      throwError(
        "Unable to evaluate the definition of " +
          name +
          ". Please check for syntax errors or undefined parameters.",
      );
      valDict[name] = 0;
    }
    return [valDict, stack.slice(0, -1), badNames];
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
    let regex;
    for (const nameVal of kineticParamsVals) {
      regex = new RegExp("\\b" + nameVal[0] + "\\b", "g");
      min = min.replaceAll(regex, nameVal[1]);
      max = max.replaceAll(regex, nameVal[1]);
    }
    try {
      cLims[0] = parser.evaluate(min);
    } catch (error) {
      throwError(
        "Unable to evaluate the minimum colour limit. Please check the definition.",
      );
    }
    try {
      cLims[1] = parser.evaluate(max);
    } catch (error) {
      throwError(
        "Unable to evaluate the maximum colour limit. Please check the definition.",
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
    setRDEquations();
    setClearShader();
    setProbeShader();
    setBrushType();
    updateWhatToPlot();
    setDrawAndDisplayShaders();
    setPostFunFragShader();
  }

  /**
   * Replaces any digits [0-9] in the input string with their word equivalents, so long as they follow at least one letter in a word.
   * Do not replace texture2 or vec2 to allow for special GLSL functions.
   * @param {string} strIn - The input string to replace digits in.
   * @returns {string} The output string with digits replaced by their word equivalents.
   */
  function replaceDigitsWithWords(strIn) {
    let regex;
    let strOut = strIn;
    for (let num = 0; num < 10; num++) {
      regex = new RegExp("([a-zA-Z_]+[0-9]*)(" + num.toString() + ")", "g");
      while (
        strOut !=
        (strOut = strOut.replace(regex, function (m, d1) {
          if (m == "texture2" || m == "vec2") return m;
          return d1 + numsAsWords[num];
        }))
      );
    }
    return strOut;
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
  function parseSpeciesNamesFromOptions() {
    return options.speciesNames
      .replaceAll(/\W+/g, " ")
      .trim()
      .split(" ")
      .slice(0, defaultSpecies.length);
  }

  function speciesNamesToString() {
    return listOfSpecies.slice(0, options.numSpecies).join(" ");
  }

  /**
   * Sets custom names for species and reactions, swapping out species in all user-editable strings.
   * @returns {void}
   */
  function setCustomNames() {
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
    if (isLoading) return;

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
    renderer.readRenderTargetPixels(
      simTextures[1],
      0,
      0,
      nXDisc,
      nYDisc,
      stateBuffer,
    );
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
    // Save the current state in memory as a buffer.
    getRawState();

    // Create a texture from the state buffer.
    createCheckpointTexture(stateBuffer);

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

    // Download the buffer as a file, with the dimensions prepended.
    var link = document.createElement("a");
    link.download = "VisualPDEState";
    link.href = URL.createObjectURL(
      new Blob([new Float32Array([nXDisc, nYDisc]), stateBuffer]),
    );
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
      // Create the stateBuffer from the data. The first two elements are width and height.
      createCheckpointTexture(buff.slice(2), buff.slice(0, 2));
      setStretchOrCropTexture(checkpointTexture);
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
   */
  function createCheckpointTexture(buff, dims) {
    if (checkpointTexture != null) {
      checkpointTexture.dispose();
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
      checkpointMaterial.needsUpdate;
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
    pauseSim();
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
    const parentOptions = Object.assign(
      getPreset("default"),
      getPreset(options.parent),
    );

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
    return window.width < 629;
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
   * Returns a URL encoded string representing the current simulation configuration.
   * @returns {string} The URL encoded string representing the current simulation configuration.
   */
  function getSimURL(shorten = true) {
    // First, get the options that differ from the default.
    let objDiff = diffObjects(options, getPreset("default"));
    objDiff.preset = "Custom";
    // Remove any parents so that loading happens from the default sim.
    delete objDiff.parent;
    // Minify the field names in order to generate shorter URLs.
    objDiff = minifyPreset(objDiff);
    const base = location.href.replace(location.search, "");
    const shortOpts = LZString.compressToEncodedURIComponent(
      JSON.stringify(objDiff),
    );
    let str = [base, "?options=", shortOpts].join("");
    // Keep the long URL as a fallback.
    longSimURL = str;
    simURL = longSimURL;
    // Asynchronously shorten the URL, replcing the long URL with the shortened one when complete.
    if (shorten) shortenURL(base, shortOpts);
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
      // If there's a slider, update its value and trigger the update via the slider's input event.
      if (controller.slider != undefined) {
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
   * Validates if a parameter name is already in use.
   * @param {string} name - The name of the parameter to validate.
   * @returns {boolean} - Returns true if the parameter name is not already in use, otherwise returns false.
   */
  function validateParamName(name) {
    const val = isReservedName(name, getSpecAndReacNames());
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
    // ...
  }
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
    if (options.dimensions == 2) {
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
    focusButton.innerHTML = `<i class="fa-solid fa-eye"></i>`;
    focusButton.title = "Focus this folder";
    focusButton.onclick = function () {
      focusButton.classList.toggle("active");
      advancedOptionsFolder.domElement.classList.toggle("hidden-aug");
      boundaryConditionsFolder.domElement.classList.toggle("hidden-aug");
      editEquationsFolder.domElement.classList.toggle("hidden-aug");
      initialConditionsFolder.domElement.classList.toggle("hidden-aug");
      parametersFolder.domElement.classList.toggle("hidden-aug");
      // Repeat this toggle for the target folder.
      folder.domElement.classList.toggle("hidden-aug");
      document
        .getElementById("equation_display")
        .classList.toggle("hidden-aug");
      document
        .getElementById("typesetCustomEqsButtonRow")
        .classList.toggle("hidden-aug");
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
        focusButton.title = "Unfocus this folder";
      } else {
        // Reset play, pause, and erase position.
        $("#play").css("top", "");
        $("#pause").css("top", "");
        $("#erase").css("top", "");
        focusButton.title = "Focus this folder";
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

    // Replace texture2D and vec2 with placeholders to prevent accidental multiplication.
    str = str.replaceAll(/\btexture2D\b/g, "__TEXTURETWOD__");
    str = str.replaceAll(/\bvec2\(/g, "__VECTWOPAREN__");

    // If an e or E is preceded by a number or . and is followed by a - or number, repkace it with a placeholder to enable scientific notation.
    str = str.replaceAll(/([0-9\.])[eE]([0-9\-])/g, "$1__E__$2");

    // If a number is followed by a letter or (, add a *.
    str = str.replaceAll(/(\d)([a-zA-Z(])/g, "$1*$2");

    // If a ) is followed by a (, add a *.
    str = str.replaceAll(/\)\(/g, ")*(");

    // If the string contains xy or yx, replace with x*y.
    str = str.replaceAll(/\bxy\b/g, "x*y");
    str = str.replaceAll(/\byx\b/g, "y*x");

    // If the string contains a ) followed by a letter or number, add a *.
    str = str.replaceAll(/\)([a-zA-Z0-9])/g, ")*$1");

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
      let replacement = "";
      // Replace Gauss(meanx, meany, sx, sy, rho) with Gauss(x, y, meanx, meany, sx, sy, rho).
      if (args.length == 5) {
        replacement = `Gauss(x,y,${args[0]},${args[1]},${args[2]},${args[3]},${args[4]})`;
      } else if (args.length == 4) {
        // Replace Gauss(meanx, meany, sx, sy) with Gauss(x, y, meanx, meany, sx, sy, 0).
        replacement = `Gauss(x,y,${args[0]},${args[1]},${args[2]},${args[3]},0)`;
      } else if (args.length == 3) {
        // Replace Gauss(meanx, meany, sd) with Gauss(x, y, meanx, meany, sd).
        replacement = `Gauss(x,y,${args[0]},${args[1]},${args[2]})`;
      } else if (args.length == 2) {
        // Replace Gauss(mean, sd) with Gauss(x, y, mean, sd).
        replacement = `Gauss(x,y,${args[0]},${args[1]})`;
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
      let replacement = "";
      // If there are 2 arguments, replace with Bump(x, y, arg1, 0, arg2).
      if (args.length == 2) {
        replacement = `Bump(x,y,${args[0]},0,${args[1]})`;
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

    shortenAborter = new AbortController();
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
    const base = location.href.replace(location.search, "");
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
    autoPauseStopValue = evaluateParamVals([
      ["autoPauseStopVal", String(options.autoPauseAt)],
    ]);
  }
}
