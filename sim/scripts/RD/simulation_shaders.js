// simulation_shaders.js

/**
 * Generates the top part of a shader for reaction-diffusion simulation based on the given timestepping scheme.
 * @param {string} type - The timestepping scheme to generate the shader for.
 * @returns {string} The generated shader code.
 */
export function RDShaderTop(type) {
  let numInputs = 0;
  switch (type) {
    case "FE":
      numInputs = 2;
      break;
    case "AB2":
      numInputs = 2;
      break;
    case "Mid1":
      numInputs = 1;
      break;
    case "Mid2":
      numInputs = 2;
      break;
    case "RK41":
      numInputs = 1;
      break;
    case "RK42":
      numInputs = 2;
      break;
    case "RK43":
      numInputs = 3;
      break;
    case "RK44":
      numInputs = 4;
      break;
  }
  let parts = [];
  parts[0] =
    "precision highp float; precision highp sampler2D; varying vec2 textureCoords;";
  parts[1] = "uniform sampler2D textureSource;";
  parts[2] = "uniform sampler2D textureSource1;";
  parts[3] = "uniform sampler2D textureSource2;";
  parts[4] = "uniform sampler2D textureSource3;";
  return (
    parts.slice(0, numInputs + 1).join("\n") +
    `
    uniform float dt;
    uniform float dx;
    uniform float dy;
    uniform float L;
    uniform float L_x;
    uniform float L_y;
    uniform float L_min;
    uniform float t;
    uniform float seed;
    uniform float globalIntegralValue;
    uniform sampler2D imageSourceOne;
    uniform sampler2D imageSourceTwo;

    AUXILIARY_GLSL_FUNS

    const float ALPHA = 0.147;
    const float INV_ALPHA = 1.0 / ALPHA;
    const float BETA = 2.0 / (pi * ALPHA);
    float erfinv(float pERF) {
      float yERF;
      if (pERF == -1.0) {
        yERF = log(1.0 - (-0.99)*(-0.99));
      } else {
        yERF = log(1.0 - pERF*pERF);
      }
      float zERF = BETA + 0.5 * yERF;
      return sqrt(sqrt(zERF*zERF - yERF * INV_ALPHA) - zERF) * sign(pERF);
    }

    void computeRHS(sampler2D textureSource, vec4 uvwqIn, vec4 uvwqLIn, vec4 uvwqRIn, vec4 uvwqTIn, vec4 uvwqBIn, vec4 uvwqLLIn, vec4 uvwqRRIn, vec4 uvwqTTIn, vec4 uvwqBBIn, out highp vec4 result) {

        ivec2 texSize = textureSize(textureSource,0);
        float step_x = 1.0 / float(texSize.x);
        float step_y = 1.0 / float(texSize.y);
        float x = textureCoords.x * L_x + MINX;
        float y = textureCoords.y * L_y + MINY;
        float interior = float(textureCoords.x > 0.75*step_x && textureCoords.x < 1.0 - 0.75*step_x && textureCoords.y > 0.5*step_y && textureCoords.y < 1.0 - 0.75*step_y);
        float exterior = 1.0 - interior;
        vec2 dSquared = 1.0/vec2(dx*dx, dy*dy);
        vec2 textureCoordsL = textureCoords + vec2(-step_x, 0.0);
        vec2 textureCoordsLL = textureCoordsL + vec2(-step_x, 0.0);
        vec2 textureCoordsR = textureCoords + vec2(+step_x, 0.0);
        vec2 textureCoordsRR = textureCoordsR + vec2(+step_x, 0.0);
        vec2 textureCoordsT = textureCoords + vec2(0.0, +step_y);
        vec2 textureCoordsTT = textureCoordsT + vec2(0.0, +step_y);
        vec2 textureCoordsB = textureCoords + vec2(0.0, -step_y);
        vec2 textureCoordsBB = textureCoordsB + vec2(0.0, -step_y);

        vec4 uvwq = uvwqIn;
        vec4 uvwqL = uvwqLIn;
        vec4 uvwqLL = uvwqLLIn;
        vec4 uvwqR = uvwqRIn;
        vec4 uvwqRR = uvwqRRIn;
        vec4 uvwqT = uvwqTIn;
        vec4 uvwqTT = uvwqTTIn;
        vec4 uvwqB = uvwqBIn;
        vec4 uvwqBB = uvwqBBIn;
    `
  );
}

/**
 * Generates shader code based on the timestepping scheme.
 * @param {string} type - The type of timestepping scheme ("FE", "AB2", "Mid1", "Mid2", "RK41", "RK42", "RK43", "RK44").
 * @returns {string} - The generated shader code.
 */
export function RDShaderMain(type) {
  let update = {};
  update.FE = `uvwq = texture2D(textureSource, textureCoords);
    uvwqL = texture2D(textureSource, textureCoordsL);
    uvwqR = texture2D(textureSource, textureCoordsR);
    uvwqT = texture2D(textureSource, textureCoordsT);
    uvwqB = texture2D(textureSource, textureCoordsB);
    uvwqLL = texture2D(textureSource, textureCoordsLL);
    uvwqRR = texture2D(textureSource, textureCoordsRR);
    uvwqTT = texture2D(textureSource, textureCoordsTT);
    uvwqBB = texture2D(textureSource, textureCoordsBB);
    computeRHS(textureSource, uvwq, uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB, RHS);
    vec4 timescales = TIMESCALES;
    updated = dt * RHS / timescales + uvwq;`;
  update.AB2 = `uvwq = texture2D(textureSource, textureCoords);
    uvwqL = texture2D(textureSource, textureCoordsL);
    uvwqR = texture2D(textureSource, textureCoordsR);
    uvwqT = texture2D(textureSource, textureCoordsT);
    uvwqB = texture2D(textureSource, textureCoordsB);
    uvwqLL = texture2D(textureSource, textureCoordsLL);
    uvwqRR = texture2D(textureSource, textureCoordsRR);
    uvwqTT = texture2D(textureSource, textureCoordsTT);
    uvwqBB = texture2D(textureSource, textureCoordsBB);
    computeRHS(textureSource, uvwq, uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB, RHS1);
    uvwq = texture2D(textureSource1, textureCoords);
    uvwqL = texture2D(textureSource1, textureCoordsL);
    uvwqR = texture2D(textureSource1, textureCoordsR);
    uvwqT = texture2D(textureSource1, textureCoordsT);
    uvwqB = texture2D(textureSource1, textureCoordsB);
    uvwqLL = texture2D(textureSource1, textureCoordsLL);
    uvwqRR = texture2D(textureSource1, textureCoordsRR);
    uvwqTT = texture2D(textureSource1, textureCoordsTT);
    uvwqBB = texture2D(textureSource1, textureCoordsBB);
    computeRHS(textureSource1, uvwq, uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB, RHS2);
    RHS = 1.5 * RHS1 - 0.5 * RHS2;
    vec4 timescales = TIMESCALES;
    updated = dt * RHS / timescales + texture2D(textureSource, textureCoords);`;
  update.Mid1 = `uvwq = texture2D(textureSource, textureCoords);
    uvwqL = texture2D(textureSource, textureCoordsL);
    uvwqR = texture2D(textureSource, textureCoordsR);
    uvwqT = texture2D(textureSource, textureCoordsT);
    uvwqB = texture2D(textureSource, textureCoordsB);
    uvwqLL = texture2D(textureSource, textureCoordsLL);
    uvwqRR = texture2D(textureSource, textureCoordsRR);
    uvwqTT = texture2D(textureSource, textureCoordsTT);
    uvwqBB = texture2D(textureSource, textureCoordsBB);
    computeRHS(textureSource, uvwq, uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB, RHS);
    vec4 timescales = TIMESCALES;
    updated = RHS;`;
  update.Mid2 = `uvwqLast = texture2D(textureSource, textureCoords);
    uvwq = uvwqLast + 0.5*dt*texture2D(textureSource1, textureCoords);
    uvwqL = texture2D(textureSource, textureCoordsL) + 0.5*dt*texture2D(textureSource1, textureCoordsL);
    uvwqR = texture2D(textureSource, textureCoordsR) + 0.5*dt*texture2D(textureSource1, textureCoordsR);
    uvwqT = texture2D(textureSource, textureCoordsT) + 0.5*dt*texture2D(textureSource1, textureCoordsT);
    uvwqB = texture2D(textureSource, textureCoordsB) + 0.5*dt*texture2D(textureSource1, textureCoordsB);
    uvwqLL = texture2D(textureSource, textureCoordsLL) + 0.5*dt*texture2D(textureSource1, textureCoordsLL);
    uvwqRR = texture2D(textureSource, textureCoordsRR) + 0.5*dt*texture2D(textureSource1, textureCoordsRR);
    uvwqTT = texture2D(textureSource, textureCoordsTT) + 0.5*dt*texture2D(textureSource1, textureCoordsTT);
    uvwqBB = texture2D(textureSource, textureCoordsBB) + 0.5*dt*texture2D(textureSource1, textureCoordsBB);
    computeRHS(textureSource, uvwq, uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB, RHS);
    vec4 timescales = TIMESCALES;
    updated = dt * RHS / timescales + uvwqLast;`;
  update.RK41 = `uvwq = texture2D(textureSource, textureCoords);
    uvwqL = texture2D(textureSource, textureCoordsL);
    uvwqR = texture2D(textureSource, textureCoordsR);
    uvwqT = texture2D(textureSource, textureCoordsT);
    uvwqB = texture2D(textureSource, textureCoordsB);
    uvwqLL = texture2D(textureSource, textureCoordsLL);
    uvwqRR = texture2D(textureSource, textureCoordsRR);
    uvwqTT = texture2D(textureSource, textureCoordsTT);
    uvwqBB = texture2D(textureSource, textureCoordsBB);
    computeRHS(textureSource, uvwq, uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB, RHS);
    vec4 timescales = TIMESCALES;
    updated = RHS;`;
  update.RK42 = `uvwq = texture2D(textureSource, textureCoords) + 0.5*dt*texture2D(textureSource1, textureCoords);
    uvwqL = texture2D(textureSource, textureCoordsL) + 0.5*dt*texture2D(textureSource1, textureCoordsL);
    uvwqR = texture2D(textureSource, textureCoordsR) + 0.5*dt*texture2D(textureSource1, textureCoordsR);
    uvwqT = texture2D(textureSource, textureCoordsT) + 0.5*dt*texture2D(textureSource1, textureCoordsT);
    uvwqB = texture2D(textureSource, textureCoordsB) + 0.5*dt*texture2D(textureSource1, textureCoordsB);
    uvwqLL = texture2D(textureSource, textureCoordsLL) + 0.5*dt*texture2D(textureSource1, textureCoordsLL);
    uvwqRR = texture2D(textureSource, textureCoordsRR) + 0.5*dt*texture2D(textureSource1, textureCoordsRR);
    uvwqTT = texture2D(textureSource, textureCoordsTT) + 0.5*dt*texture2D(textureSource1, textureCoordsTT);
    uvwqBB = texture2D(textureSource, textureCoordsBB) + 0.5*dt*texture2D(textureSource1, textureCoordsBB);
    computeRHS(textureSource, uvwq, uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB, RHS);
    vec4 timescales = TIMESCALES;
    updated = RHS;`;
  update.RK43 = `uvwq = texture2D(textureSource, textureCoords) + 0.5*dt*texture2D(textureSource2, textureCoords);
    uvwqL = texture2D(textureSource, textureCoordsL) + 0.5*dt*texture2D(textureSource2, textureCoordsL);
    uvwqR = texture2D(textureSource, textureCoordsR) + 0.5*dt*texture2D(textureSource2, textureCoordsR);
    uvwqT = texture2D(textureSource, textureCoordsT) + 0.5*dt*texture2D(textureSource2, textureCoordsT);
    uvwqB = texture2D(textureSource, textureCoordsB) + 0.5*dt*texture2D(textureSource2, textureCoordsB);
    uvwqLL = texture2D(textureSource, textureCoordsLL) + 0.5*dt*texture2D(textureSource2, textureCoordsLL);
    uvwqRR = texture2D(textureSource, textureCoordsRR) + 0.5*dt*texture2D(textureSource2, textureCoordsRR);
    uvwqTT = texture2D(textureSource, textureCoordsTT) + 0.5*dt*texture2D(textureSource2, textureCoordsTT);
    uvwqBB = texture2D(textureSource, textureCoordsBB) + 0.5*dt*texture2D(textureSource2, textureCoordsBB);
    computeRHS(textureSource, uvwq, uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB, RHS);
    vec4 timescales = TIMESCALES;
    updated = RHS;`;
  update.RK44 = `uvwqLast = texture2D(textureSource, textureCoords);
    uvwq = uvwqLast + dt*texture2D(textureSource3, textureCoords);
    uvwqL = texture2D(textureSource, textureCoordsL) + dt*texture2D(textureSource3, textureCoordsL);
    uvwqR = texture2D(textureSource, textureCoordsR) + dt*texture2D(textureSource3, textureCoordsR);
    uvwqT = texture2D(textureSource, textureCoordsT) + dt*texture2D(textureSource3, textureCoordsT);
    uvwqB = texture2D(textureSource, textureCoordsB) + dt*texture2D(textureSource3, textureCoordsB);
    uvwqLL = texture2D(textureSource, textureCoordsLL) + dt*texture2D(textureSource3, textureCoordsLL);
    uvwqRR = texture2D(textureSource, textureCoordsRR) + dt*texture2D(textureSource3, textureCoordsRR);
    uvwqTT = texture2D(textureSource, textureCoordsTT) + dt*texture2D(textureSource3, textureCoordsTT);
    uvwqBB = texture2D(textureSource, textureCoordsBB) + dt*texture2D(textureSource3, textureCoordsBB);
    computeRHS(textureSource, uvwq, uvwqL, uvwqR, uvwqT, uvwqB, uvwqLL, uvwqRR, uvwqTT, uvwqBB, RHS1);
    RHS = (texture2D(textureSource1, textureCoords) + 2.0*(texture2D(textureSource2, textureCoords) + texture2D(textureSource3, textureCoords)) + RHS1) / 6.0;
    vec4 timescales = TIMESCALES;
    updated = dt * RHS / timescales + uvwqLast;`;
  return (
    `
  void main()
  {
      ivec2 texSize = textureSize(textureSource,0);
      float step_x = 1.0 / float(texSize.x);
      float step_y = 1.0 / float(texSize.y);
      float x = textureCoords.x * L_x + MINX;
      float y = textureCoords.y * L_y + MINY;
      float interior = float(textureCoords.x > 0.75*step_x && textureCoords.x < 1.0 - 0.75*step_x && textureCoords.y > 0.5*step_y && textureCoords.y < 1.0 - 0.75*step_y);
      float exterior = 1.0 - interior;

      vec2 textureCoordsL = textureCoords + vec2(-step_x, 0.0);
      vec2 textureCoordsLL = textureCoordsL + vec2(-step_x, 0.0);
      vec2 textureCoordsR = textureCoords + vec2(+step_x, 0.0);
      vec2 textureCoordsRR = textureCoordsR + vec2(+step_x, 0.0);
      vec2 textureCoordsT = textureCoords + vec2(0.0, +step_y);
      vec2 textureCoordsTT = textureCoordsT + vec2(0.0, +step_y);
      vec2 textureCoordsB = textureCoords + vec2(0.0, -step_y);
      vec2 textureCoordsBB = textureCoordsB + vec2(0.0, -step_y);
      
      vec4 RHS;
      vec4 RHS1;
      vec4 RHS2;
      vec4 updated;
      vec4 uvwq;
      vec4 uvwqL;
      vec4 uvwqLL;
      vec4 uvwqR;
      vec4 uvwqRR;
      vec4 uvwqT;
      vec4 uvwqTT;
      vec4 uvwqB;
      vec4 uvwqBB;
      vec4 uvwqLast;
  ` + update[type]
  );
}

/**
 * Returns the shader code for a reaction-diffusion simulation with periodic boundary conditions.
 * @returns {string} The shader code.
 */
export function RDShaderPeriodic() {
  return ``;
}

/**
 * Generates shader code for specifying the values of ghost cells in the x-direction.
 * @param {string} [LR] - Determines whether to apply the condition at the left ("L"), right ("R"), or both ("LR"). If undefined, returns both.
 * @returns {string} The shader code for setting the species of ghost cells in the x-direction.
 */
export function RDShaderGhostX(LR) {
  const L = `
    if (textureCoords.x - step_x < 0.0) {
        uvwqL.SPECIES = GHOSTSPECIES;
    }
    `;
  const R = `
    if (textureCoords.x + step_x > 1.0) {
        uvwqR.SPECIES = GHOSTSPECIES;
    }
    `;
  if (LR == undefined) return L + R;
  if (LR == "L") return L;
  if (LR == "R") return R;
  return "";
}

/**
 * Generates shader code for specifying the values of ghost cells in the y-direction.
 * @param {string} [TB] - Determines whether to apply the condition at the top ("T"), bottom ("B"), or both ("TB"). If undefined, returns both.
 * @returns {string} The shader code for setting the species of ghost cells in the y-direction.
 */
export function RDShaderGhostY(TB) {
  const T = `
    if (textureCoords.y + step_y > 1.0){
        uvwqT.SPECIES = GHOSTSPECIES;
    }
    `;
  const B = `
    if (textureCoords.y - step_y < 0.0) {
        uvwqB.SPECIES = GHOSTSPECIES;
    }
    `;
  if (TB == undefined) return T + B;
  if (TB == "T") return T;
  if (TB == "B") return B;
  return "";
}

/**
 * Returns a string containing the Robin boundary condition shader code in the x-direction.
 * @param {string} [LR] - Determines whether to apply the condition at the left ("L"), right ("R"), or both ("LR"). If undefined, returns both.
 * @returns {string} The Robin boundary condition shader code.
 */
export function RDShaderRobinX(LR) {
  const L = `
    if (textureCoords.x - step_x < 0.0) {
        uvwqL.SPECIES = 2.0 * (dx * robinRHSSPECIESL) + uvwqR.SPECIES;
    }
    `;
  const R = `
    if (textureCoords.x + step_x > 1.0) {
        uvwqR.SPECIES = 2.0 * (dx * robinRHSSPECIESR) + uvwqL.SPECIES;
    }
    `;
  if (LR == undefined) return L + R;
  if (LR == "L") return L;
  if (LR == "R") return R;
  return "";
}

/**
 * Returns a string containing the Robin boundary condition shader code in the y-direction.
 * @param {string} [TB] - Determines whether to apply the condition at the top ("T"), bottom ("B"), or both ("TB"). If undefined, returns both.
 * @returns {string} The Robin boundary condition shader code.
 */
export function RDShaderRobinY(TB) {
  const T = `
    if (textureCoords.y + step_y > 1.0){
        uvwqT.SPECIES = 2.0 * (dy * robinRHSSPECIEST) + uvwqB.SPECIES;
    }
    `;
  const B = `
    if (textureCoords.y - step_y < 0.0) {
        uvwqB.SPECIES = 2.0 * (dy * robinRHSSPECIESB) + uvwqT.SPECIES;
    }
    `;
  if (TB == undefined) return T + B;
  if (TB == "T") return T;
  if (TB == "B") return B;
  return "";
}

/**
 * Generates a Robin boundary condition shader for a custom domain in the x-direction.
 * @param {string} TB - Determines whether to apply the condition at the left ("L"), right ("R"), or both ("LR"). If undefined, returns both.
 * @param {string} fun - A function that defines the custom domain.
 * @returns {string} The generated shader code.
 */
export function RDShaderRobinCustomDomainX(LR, fun) {
  const L = `
    if (float(indicatorFunL) <= 0.0 || textureCoords.x - 2.0*step_x < 0.0) {
      if (float(indicatorFunR) <= 0.0) {
        uvwqL.SPECIES = dx * robinRHSSPECIESL + uvwq.SPECIES;
      } else {
        uvwqL.SPECIES = 2.0 * (dx * robinRHSSPECIESL) + uvwqR.SPECIES;
      }
    }
    `
    .replace(
      /indicatorFunL/,
      fun.replaceAll(/\bx\b/g, "(x-1.25*dx)").replaceAll(/\buvwq\./g, "uvwqL."),
    )
    .replace(
      /indicatorFunR/,
      fun.replaceAll(/\bx\b/g, "(x+1.25*dx)").replaceAll(/\buvwq\./g, "uvwqR."),
    );
  const R = `
    if (float(indicatorFunR) <= 0.0 || textureCoords.x + 2.0*step_x > 1.0) {
      if (float(indicatorFunL) <= 0.0) {
        uvwqR.SPECIES = dx * robinRHSSPECIESR + uvwq.SPECIES;
      } else {
        uvwqR.SPECIES = 2.0 * (dx * robinRHSSPECIESR) + uvwqL.SPECIES;
      }
    }
    `
    .replace(
      /indicatorFunR/,
      fun.replaceAll(/\bx\b/g, "(x+1.25*dx)").replaceAll(/\buvwq\./g, "uvwqR."),
    )
    .replace(
      /indicatorFunL/,
      fun.replaceAll(/\bx\b/g, "(x-1.25*dx)").replaceAll(/\buvwq\./g, "uvwqL."),
    );
  if (LR == undefined) return L + R;
  if (LR == "L") return L;
  if (LR == "R") return R;
  return "";
}

/**
 * Generates a Robin boundary condition shader for a custom domain in the y-direction.
 * @param {string} TB - Determines whether to apply the condition at the top ("T"), bottom ("B"), or both ("TB"). If undefined, returns both.
 * @param {string} fun - A function that defines the custom domain.
 * @returns {string} The generated shader code.
 */
export function RDShaderRobinCustomDomainY(TB, fun) {
  const T = `
    if (float(indicatorFunT) <= 0.0 || textureCoords.y + 2.0*step_y > 1.0){
      if (float(indicatorFunB) <= 0.0) {
        uvwqT.SPECIES = dy * robinRHSSPECIEST + uvwq.SPECIES;
      } else {
        uvwqT.SPECIES = 2.0 * (dy * robinRHSSPECIEST) + uvwqB.SPECIES;
      }
    }
    `
    .replace(
      /indicatorFunT/,
      fun.replaceAll(/\by\b/g, "(y+1.25*dy)").replaceAll(/\buvwq\./g, "uvwqT."),
    )
    .replace(
      /indicatorFunB/,
      fun.replaceAll(/\by\b/g, "(y-1.25*dy)").replaceAll(/\buvwq\./g, "uvwqB."),
    );
  const B = `
    if (float(indicatorFunB) <= 0.0 || textureCoords.y - 2.0*step_y < 0.0) {
      if (float(indicatorFunT) <= 0.0) {
        uvwqB.SPECIES = dy * robinRHSSPECIESB + uvwq.SPECIES;
      } else {
        uvwqB.SPECIES = 2.0 * (dy * robinRHSSPECIESB) + uvwqT.SPECIES;
      }
    }
    `
    .replace(
      /indicatorFunB/,
      fun.replaceAll(/\by\b/g, "(y-1.25*dy)").replaceAll(/\buvwq\./g, "uvwqB."),
    )
    .replace(
      /indicatorFunT/,
      fun.replaceAll(/\by\b/g, "(y+1.25*dy)").replaceAll(/\buvwq\./g, "uvwqT."),
    );
  if (TB == undefined) return T + B;
  if (TB == "T") return T;
  if (TB == "B") return B;
  return "";
}

/**
 * Returns the shader code for computing advection before boundary conditions have been applied.
 * @returns {string} The shader code.
 */
export function RDShaderAdvectionPreBC() {
  return `
    vec4 uvwqX = (uvwqR - uvwqL) / (2.0*dx);
    vec4 uvwqY = (uvwqT - uvwqB) / (2.0*dy);
    vec4 uvwqXF = (uvwqR - uvwq) / dx;
    vec4 uvwqYF = (uvwqT - uvwq) / dy;
    vec4 uvwqXB = (uvwq - uvwqL) / dx;
    vec4 uvwqYB = (uvwq - uvwqB) / dy;
    vec4 uvwqXFXF = (4.0*uvwqR - 3.0*uvwq - uvwqRR) / (2.0*dx);
    vec4 uvwqYFYF = (4.0*uvwqT - 3.0*uvwq - uvwqTT) / (2.0*dy);
    vec4 uvwqXBXB = (3.0*uvwq - 4.0*uvwqL + uvwqLL) / (2.0*dx);
    vec4 uvwqYBYB = (3.0*uvwq - 4.0*uvwqB + uvwqBB) / (2.0*dy);
    `;
}

/**
 * Returns the shader code for computing advection after boundary conditions have been applied.
 * @returns {string} The shader code.
 */
export function RDShaderAdvectionPostBC() {
  return `
    uvwqX = (uvwqR - uvwqL) / (2.0*dx);
    uvwqY = (uvwqT - uvwqB) / (2.0*dy);
    uvwqXF = (uvwqR - uvwq) / dx;
    uvwqYF = (uvwqT - uvwq) / dy;
    uvwqXB = (uvwq - uvwqL) / dx;
    uvwqYB = (uvwq - uvwqB) / dy;
    uvwqXFXF = (4.0*uvwqR - 3.0*uvwq - uvwqRR) / (2.0*dx);
    uvwqYFYF = (4.0*uvwqT - 3.0*uvwq - uvwqTT) / (2.0*dy);
    uvwqXBXB = (3.0*uvwq - 4.0*uvwqL + uvwqLL) / (2.0*dx);
    uvwqYBYB = (3.0*uvwq - 4.0*uvwqB + uvwqBB) / (2.0*dy);
    `;
}

/**
 * Returns the shader code for computing diffusion before boundary conditions have been applied.
 * @returns {string} The shader code.
 */
export function RDShaderDiffusionPreBC() {
  return `
    vec4 uvwqXX = (uvwqR - 2.0*uvwq + uvwqL) / (dx*dx);
    vec4 uvwqYY = (uvwqT - 2.0*uvwq + uvwqB) / (dy*dy);
    `;
}

/**
 * Returns the shader code for computing diffusion after boundary conditions have been applied.
 * @returns {string} The shader code.
 */
export function RDShaderDiffusionPostBC() {
  return `
    uvwqXX = (uvwqR - 2.0*uvwq + uvwqL) / (dx*dx);
    uvwqYY = (uvwqT - 2.0*uvwq + uvwqB) / (dy*dy);
    `;
}

/**
 * Generates a shader for updating a reaction-diffusion system without cross diffusion.
 * @param {number} [numSpecies=4] - The number of species. Defaults to 4.
 * @returns {string} - The shader code for the update.
 */
export function RDShaderUpdateNormal(numSpecies) {
  if (numSpecies == undefined) numSpecies = 4;
  let shader = "";
  shader += `
  float LDuuU = 0.5*((Duux*(uvwqR.r + uvwqL.r - 2.0*uvwq.r) + DuuxR*(uvwqR.r - uvwq.r) + DuuxL*(uvwqL.r - uvwq.r)) / dx) / dx +  0.5*((Duuy*(uvwqT.r + uvwqB.r - 2.0*uvwq.r) + DuuyT*(uvwqT.r - uvwq.r) + DuuyB*(uvwqB.r - uvwq.r)) / dy) / dy;
  float du = LDuuU + UFUN;
  `;
  if (numSpecies > 1) {
    shader += `
    float LDvvV = 0.5*((Dvvx*(uvwqR.g + uvwqL.g - 2.0*uvwq.g) + DvvxR*(uvwqR.g - uvwq.g) + DvvxL*(uvwqL.g - uvwq.g)) / dx) / dx +  0.5*((Dvvy*(uvwqT.g + uvwqB.g - 2.0*uvwq.g) + DvvyT*(uvwqT.g - uvwq.g) + DvvyB*(uvwqB.g - uvwq.g)) / dy) / dy;
    float dv = LDvvV + VFUN;
    `;
  }
  if (numSpecies > 2) {
    shader += `
    float LDwwW = 0.5*((Dwwx*(uvwqR.b + uvwqL.b - 2.0*uvwq.b) + DwwxR*(uvwqR.b - uvwq.b) + DwwxL*(uvwqL.b - uvwq.b)) / dx) / dx +  0.5*((Dwwy*(uvwqT.b + uvwqB.b - 2.0*uvwq.b) + DwwyT*(uvwqT.b - uvwq.b) + DwwyB*(uvwqB.b - uvwq.b)) / dy) / dy;
    float dw = LDwwW + WFUN;
    `;
  }
  if (numSpecies > 3) {
    shader += `
    float LDqqQ = 0.5*((Dqqx*(uvwqR.a + uvwqL.a - 2.0*uvwq.a) + DqqxR*(uvwqR.a - uvwq.a) + DqqxL*(uvwqL.a - uvwq.a)) / dx) / dx +  0.5*((Dqqy*(uvwqT.a + uvwqB.a - 2.0*uvwq.a) + DqqyT*(uvwqT.a - uvwq.a) + DqqyB*(uvwqB.a - uvwq.a)) / dy) / dy;
    float dq = LDqqQ + QFUN;
    `;
  }
  // Add the final line of the shader.
  switch (numSpecies) {
    case 1:
      shader += `result = vec4(du,0.0,0.0,0.0);`;
      break;
    case 2:
      shader += `result = vec4(du,dv,0.0,0.0);`;
      break;
    case 3:
      shader += `result = vec4(du,dv,dw,0.0);`;
      break;
    case 4:
      shader += `result = vec4(du,dv,dw,dq);`;
      break;
  }
  return (
    shader +
    `
    }`
  );
}

/**
 * Generates a shader for updating a reaction-diffusion system with cross diffusion.
 * @param {number} [numSpecies=4] - The number of species in the system.
 * @returns {string} The generated shader code.
 */
export function RDShaderUpdateCross(numSpecies) {
  if (numSpecies == undefined) numSpecies = 4;
  let shader = "";
  shader +=
    [
      `vec2 LDuuU = vec2(Duux*(uvwqR.r + uvwqL.r - 2.0*uvwq.r) + DuuxR*(uvwqR.r - uvwq.r) + DuuxL*(uvwqL.r - uvwq.r), Duuy*(uvwqT.r + uvwqB.r - 2.0*uvwq.r) + DuuyT*(uvwqT.r - uvwq.r) + DuuyB*(uvwqB.r - uvwq.r));`,
      `vec2 LDuvV = vec2(Duvx*(uvwqR.g + uvwqL.g - 2.0*uvwq.g) + DuvxR*(uvwqR.g - uvwq.g) + DuvxL*(uvwqL.g - uvwq.g), Duvy*(uvwqT.g + uvwqB.g - 2.0*uvwq.g) + DuvyT*(uvwqT.g - uvwq.g) + DuvyB*(uvwqB.g - uvwq.g));`,
      `vec2 LDuwW = vec2(Duwx*(uvwqR.b + uvwqL.b - 2.0*uvwq.b) + DuwxR*(uvwqR.b - uvwq.b) + DuwxL*(uvwqL.b - uvwq.b), Duwy*(uvwqT.b + uvwqB.b - 2.0*uvwq.b) + DuwyT*(uvwqT.b - uvwq.b) + DuwyB*(uvwqB.b - uvwq.b));`,
      `vec2 LDuqQ = vec2(Duqx*(uvwqR.a + uvwqL.a - 2.0*uvwq.a) + DuqxR*(uvwqR.a - uvwq.a) + DuqxL*(uvwqL.a - uvwq.a), Duqy*(uvwqT.a + uvwqB.a - 2.0*uvwq.a) + DuqyT*(uvwqT.a - uvwq.a) + DuqyB*(uvwqB.a - uvwq.a));`,
    ]
      .slice(0, numSpecies)
      .join("\n") +
    `\nfloat du = 0.5*dot(dSquared,` +
    [`LDuuU`, `LDuvV`, `LDuwW`, `LDuqQ`].slice(0, numSpecies).join(" + ") +
    `) + UFUN;\n`;
  // If there is more than one species, add the second species.
  if (numSpecies > 1) {
    // Compute the cross-diffusion terms.
    shader +=
      [
        `vec2 LDvuU = vec2(Dvux*(uvwqR.r + uvwqL.r - 2.0*uvwq.r) + DvuxR*(uvwqR.r - uvwq.r) + DvuxL*(uvwqL.r - uvwq.r), Dvuy*(uvwqT.r + uvwqB.r - 2.0*uvwq.r) + DvuyT*(uvwqT.r - uvwq.r) + DvuyB*(uvwqB.r - uvwq.r));`,
        `vec2 LDvvV = vec2(Dvvx*(uvwqR.g + uvwqL.g - 2.0*uvwq.g) + DvvxR*(uvwqR.g - uvwq.g) + DvvxL*(uvwqL.g - uvwq.g), Dvvy*(uvwqT.g + uvwqB.g - 2.0*uvwq.g) + DvvyT*(uvwqT.g - uvwq.g) + DvvyB*(uvwqB.g - uvwq.g));`,
        `vec2 LDvwW = vec2(Dvwx*(uvwqR.b + uvwqL.b - 2.0*uvwq.b) + DvwxR*(uvwqR.b - uvwq.b) + DvwxL*(uvwqL.b - uvwq.b), Dvwy*(uvwqT.b + uvwqB.b - 2.0*uvwq.b) + DvwyT*(uvwqT.b - uvwq.b) + DvwyB*(uvwqB.b - uvwq.b));`,
        `vec2 LDvqQ = vec2(Dvqx*(uvwqR.a + uvwqL.a - 2.0*uvwq.a) + DvqxR*(uvwqR.a - uvwq.a) + DvqxL*(uvwqL.a - uvwq.a), Dvqy*(uvwqT.a + uvwqB.a - 2.0*uvwq.a) + DvqyT*(uvwqT.a - uvwq.a) + DvqyB*(uvwqB.a - uvwq.a));`,
      ]
        .slice(0, numSpecies)
        .join("\n") +
      `\nfloat dv = 0.5*dot(dSquared,` +
      [`LDvuU`, `LDvvV`, `LDvwW`, `LDvqQ`].slice(0, numSpecies).join(" + ") +
      `) + VFUN;\n`;
  }
  // If there are more than two species, add the third species.
  if (numSpecies > 2) {
    // Compute the cross-diffusion terms.
    shader +=
      [
        `vec2 LDwuU = vec2(Dwux*(uvwqR.r + uvwqL.r - 2.0*uvwq.r) + DwuxR*(uvwqR.r - uvwq.r) + DwuxL*(uvwqL.r - uvwq.r), Dwuy*(uvwqT.r + uvwqB.r - 2.0*uvwq.r) + DwuyT*(uvwqT.r - uvwq.r) + DwuyB*(uvwqB.r - uvwq.r));`,
        `vec2 LDwvV = vec2(Dwvx*(uvwqR.g + uvwqL.g - 2.0*uvwq.g) + DwvxR*(uvwqR.g - uvwq.g) + DwvxL*(uvwqL.g - uvwq.g), Dwvy*(uvwqT.g + uvwqB.g - 2.0*uvwq.g) + DwvyT*(uvwqT.g - uvwq.g) + DwvyB*(uvwqB.g - uvwq.g));`,
        `vec2 LDwwW = vec2(Dwwx*(uvwqR.b + uvwqL.b - 2.0*uvwq.b) + DwwxR*(uvwqR.b - uvwq.b) + DwwxL*(uvwqL.b - uvwq.b), Dwwy*(uvwqT.b + uvwqB.b - 2.0*uvwq.b) + DwwyT*(uvwqT.b - uvwq.b) + DwwyB*(uvwqB.b - uvwq.b));`,
        `vec2 LDwqQ = vec2(Dwqx*(uvwqR.a + uvwqL.a - 2.0*uvwq.a) + DwqxR*(uvwqR.a - uvwq.a) + DwqxL*(uvwqL.a - uvwq.a), Dwqy*(uvwqT.a + uvwqB.a - 2.0*uvwq.a) + DwqyT*(uvwqT.a - uvwq.a) + DwqyB*(uvwqB.a - uvwq.a));`,
      ]
        .slice(0, numSpecies)
        .join("\n") +
      `\nfloat dw = 0.5*dot(dSquared,` +
      [`LDwuU`, `LDwvV`, `LDwwW`, `LDwqQ`].slice(0, numSpecies).join(" + ") +
      `) + WFUN;\n`;
  }
  // If there are more than three species, add the fourth species.
  if (numSpecies > 3) {
    // Compute the cross-diffusion terms.
    shader +=
      [
        `vec2 LDquU = vec2(Dqux*(uvwqR.r + uvwqL.r - 2.0*uvwq.r) + DquxR*(uvwqR.r - uvwq.r) + DquxL*(uvwqL.r - uvwq.r), Dquy*(uvwqT.r + uvwqB.r - 2.0*uvwq.r) + DquyT*(uvwqT.r - uvwq.r) + DquyB*(uvwqB.r - uvwq.r));`,
        `vec2 LDqvV = vec2(Dqvx*(uvwqR.g + uvwqL.g - 2.0*uvwq.g) + DqvxR*(uvwqR.g - uvwq.g) + DqvxL*(uvwqL.g - uvwq.g), Dqvy*(uvwqT.g + uvwqB.g - 2.0*uvwq.g) + DqvyT*(uvwqT.g - uvwq.g) + DqvyB*(uvwqB.g - uvwq.g));`,
        `vec2 LDqwW = vec2(Dqwx*(uvwqR.b + uvwqL.b - 2.0*uvwq.b) + DqwxR*(uvwqR.b - uvwq.b) + DqwxL*(uvwqL.b - uvwq.b), Dqwy*(uvwqT.b + uvwqB.b - 2.0*uvwq.b) + DqwyT*(uvwqT.b - uvwq.b) + DqwyB*(uvwqB.b - uvwq.b));`,
        `vec2 LDqqQ = vec2(Dqqx*(uvwqR.a + uvwqL.a - 2.0*uvwq.a) + DqqxR*(uvwqR.a - uvwq.a) + DqqxL*(uvwqL.a - uvwq.a), Dqqy*(uvwqT.a + uvwqB.a - 2.0*uvwq.a) + DqqyT*(uvwqT.a - uvwq.a) + DqqyB*(uvwqB.a - uvwq.a));`,
      ]
        .slice(0, numSpecies)
        .join("\n") +
      `\nfloat dq = 0.5*dot(dSquared,` +
      [`LDquU`, `LDqvV`, `LDqwW`, `LDqqQ`].slice(0, numSpecies).join(" + ") +
      `) + QFUN;\n`;
  }
  // Add the final line of the shader.
  switch (numSpecies) {
    case 1:
      shader += `result = vec4(du,0.0,0.0,0.0);`;
      break;
    case 2:
      shader += `result = vec4(du,dv,0.0,0.0);`;
      break;
    case 3:
      shader += `result = vec4(du,dv,dw,0.0);`;
      break;
    case 4:
      shader += `result = vec4(du,dv,dw,dq);`;
      break;
  }
  return (
    shader +
    `
    }`
  );
}

/**
 * Returns the shader code for updating the algebraic species in a reaction-diffusion simulation.
 * @returns {string} The shader code for updating the algebraic species.
 */
export function RDShaderAlgebraicSpecies() {
  return `
    updated.SPECIES = RHS.SPECIES / timescales.SPECIES;
    `;
}

/**
 * Returns the shader code for applying Dirichlet boundary conditions in the x-direction.
 * @param {string} [LR] - Optional argument to specify whether to return the shader code for the left boundary ("L"), right boundary ("R"), or both boundaries (undefined).
 * @returns {string} The shader code for applying Dirichlet boundary conditions in the x-direction.
 */
export function RDShaderDirichletX(LR) {
  const L = `
    if (textureCoords.x - step_x < 0.0) {
        updated.SPECIES = dirichletRHSSPECIESL;
    }
    `;
  const R = `
    if (textureCoords.x + step_x > 1.0) {
        updated.SPECIES = dirichletRHSSPECIESR;
    }
    `;
  if (LR == undefined) return L + R;
  if (LR == "L") return L;
  if (LR == "R") return R;
  return "";
}

/**
 * Returns the shader code for applying Dirichlet boundary conditions in the y-direction.
 * @param {string} [LR] - Optional argument to specify whether to return the shader code for the top boundary ("T"), bottom boundary ("B"), or both boundaries (undefined).
 * @returns {string} The shader code for applying Dirichlet boundary conditions in the y-direction.
 */
export function RDShaderDirichletY(TB) {
  const T = `
    if (textureCoords.y + step_y > 1.0) {
        updated.SPECIES = dirichletRHSSPECIEST;
    }
    `;
  const B = `
    if (textureCoords.y - step_y < 0.0) {
        updated.SPECIES = dirichletRHSSPECIESB;
    }
    `;
  if (TB == undefined) return T + B;
  if (TB == "T") return T;
  if (TB == "B") return B;
  return "";
}

/**
 * Returns a shader fragment that updates the SPECIES based on an indicator function.
 * @returns {string} The shader function as a string.
 */
export function RDShaderDirichletIndicatorFun() {
  return `
    if (float(indicatorFun) <= 0.0) {
        updated.SPECIES = `;
}

/**
 * Returns the final part of shader code for a reaction-diffusion simulation.
 * @returns {string} The shader code.
 */
export function RDShaderBot() {
  return ` 
    gl_FragColor = updated;
}`;
}

/**
 * Returns the top part of shader code for enforcing Dirichlet boundary conditions.
 * @returns {string} The shader code.
 */
export function RDShaderEnforceDirichletTop() {
  return `precision highp float;
    varying vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform float dx;
    uniform float dy;
    uniform float L;
    uniform float L_x;
    uniform float L_y;
    uniform float L_min;
    uniform float t;
    uniform sampler2D imageSourceOne;
    uniform sampler2D imageSourceTwo;

    AUXILIARY_GLSL_FUNS

    const float ALPHA = 0.147;
    const float INV_ALPHA = 1.0 / ALPHA;
    const float BETA = 2.0 / (pi * ALPHA);
    float erfinv(float pERF) {
      float yERF;
      if (pERF == -1.0) {
        yERF = log(1.0 - (-0.99)*(-0.99));
      } else {
        yERF = log(1.0 - pERF*pERF);
      }
      float zERF = BETA + 0.5 * yERF;
      return sqrt(sqrt(zERF*zERF - yERF * INV_ALPHA) - zERF) * sign(pERF);
    }
    
    void main()
    {
        ivec2 texSize = textureSize(textureSource,0);
        float step_x = 1.0 / float(texSize.x);
        float step_y = 1.0 / float(texSize.y);
        float x = textureCoords.x * L_x + MINX;
        float y = textureCoords.y * L_y + MINY;
        float interior = float(textureCoords.x > 0.75*step_x && textureCoords.x < 1.0 - 0.75*step_x && textureCoords.y > 0.5*step_y && textureCoords.y < 1.0 - 0.75*step_y);
        float exterior = 1.0 - interior;

        vec4 uvwq = texture2D(textureSource, textureCoords);
        gl_FragColor = uvwq;
    `;
}

/**
 * Generates shader code for clamping species values to the edge of a texture in a given direction.
 * @param {string} direction - The direction in which to clamp the species values. Can include "H" for horizontal and/or "V" for vertical.
 * @returns {string} The generated GLSL code.
 */
export function clampSpeciesToEdgeShader(direction) {
  let out = "";
  if (direction.includes("H")) {
    out += `
    if (textureCoords.x - step_x < 0.0) {
      uvwqL.SPECIES = uvwq.SPECIES;
    }
    if (textureCoords.x + step_x > 1.0) {
      uvwqR.SPECIES = uvwq.SPECIES;
    }`;
  }
  if (direction.includes("V")) {
    out += `
    if (textureCoords.y + step_y > 1.0) {
      uvwqT.SPECIES = uvwq.SPECIES;
    }
    if (textureCoords.y - step_y < 0.0) {
      uvwqB.SPECIES = uvwq.SPECIES;
    }`;
  }
  return out;
}

export function globalIntegralShader() {
  return `varying vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform float dx;
    uniform float dy;
    uniform float L;
    uniform float L_x;
    uniform float L_y;
    uniform float L_min;
    uniform float t;
    uniform bool customSurface;
    uniform bool vectorField;
    uniform bool overlayLine;
    uniform sampler2D imageSourceOne;
    uniform sampler2D imageSourceTwo;

    AUXILIARY_GLSL_FUNS

    const float ALPHA = 0.147;
    const float INV_ALPHA = 1.0 / ALPHA;
    const float BETA = 2.0 / (pi * ALPHA);
    float erfinv(float pERF) {
      float yERF;
      if (pERF == -1.0) {
        yERF = log(1.0 - (-0.99)*(-0.99));
      } else {
        yERF = log(1.0 - pERF*pERF);
      }
      float zERF = BETA + 0.5 * yERF;
      return sqrt(sqrt(zERF*zERF - yERF * INV_ALPHA) - zERF) * sign(pERF);
    }

    void main()
    {
      ivec2 texSize = textureSize(textureSource,0);
      float step_x = 1.0 / float(texSize.x);
      float step_y = 1.0 / float(texSize.y);
      float x = MINX + textureCoords.x * L_x;
      float y = MINY + textureCoords.y * L_y;

      vec4 uvwq = texture2D(textureSource, textureCoords);
      vec4 uvwqL = texture2D(textureSource, textureCoords + vec2(-step_x, 0.0));
      vec4 uvwqR = texture2D(textureSource, textureCoords + vec2(+step_x, 0.0));
      vec4 uvwqT = texture2D(textureSource, textureCoords + vec2(0.0, +step_y));
      vec4 uvwqB = texture2D(textureSource, textureCoords + vec2(0.0, -step_y));

      vec4 uvwqX = (uvwqR - uvwqL) / (2.0*dx);
      vec4 uvwqY = (uvwqT - uvwqB) / (2.0*dy);
      vec4 uvwqXF = (uvwqR - uvwq) / dx;
      vec4 uvwqYF = (uvwqT - uvwq) / dy;
      vec4 uvwqXB = (uvwq - uvwqL) / dx;
      vec4 uvwqYB = (uvwq - uvwqB) / dy;
      vec4 uvwqXX = (uvwqR - 2.0*uvwq + uvwqL) / (dx * dx);
      vec4 uvwqYY = (uvwqT - 2.0*uvwq + uvwqB) / (dy * dy);

      // At boundaries, compute gradients using one-sided differences.
      if (textureCoords.x - step_x < 0.0) {
        uvwqX = (uvwqR - uvwq) / dx;
        uvwqXF = uvwqX;
        uvwqXB = uvwqX;
      }

      if (textureCoords.x + step_x > 1.0) {
        uvwqX = (uvwq - uvwqL) / dx;
        uvwqXF = uvwqX;
        uvwqXB = uvwqX;
      }

      if (textureCoords.y - step_y < 0.0) {
        uvwqY = (uvwqT - uvwq) / dy;
        uvwqYF = uvwqY;
        uvwqYB = uvwqY;
      }

      if (textureCoords.y + step_y > 1.0) {
        uvwqY = (uvwq - uvwqB) / dy;
        uvwqYF = uvwqY;
        uvwqYB = uvwqY;
      }

      float value = GLOBAL_INTEGRAL_FUN;
      if (isnan(value)) {
        value = 1.0/0.0;
      }
      float in_domain = float(float(indicatorFun) > 0.0);
      gl_FragColor = vec4(value * in_domain, 0.0, 0.0, 0.0);
    }`;
}
