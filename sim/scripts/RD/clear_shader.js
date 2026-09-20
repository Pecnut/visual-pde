// clear_shader.js

export function clearShaderTop() {
  return `varying vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform sampler2D imageSourceOne;
    uniform sampler2D imageSourceTwo;
    uniform float dx;
    uniform float dy;
    uniform float L;
    uniform float L_x;
    uniform float L_y;
    uniform float L_min;
    uniform float t;
    uniform int nXDisc;
    uniform int nYDisc;
    uniform float seed;
    uniform float globalIntegralValue1;
    uniform float globalIntegralValue2;
    uniform float globalIntegralValue3;
    uniform float globalIntegralValue4;

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
        float x = MINX + textureCoords.x * float(nXDisc) * dx;
        float y = MINY + textureCoords.y * float(nYDisc) * dy;
    `;
}

export function clearShaderBot() {
  return `
        gl_FragColor = vec4(u, v, w, q);
    }`;
}

// MRT counterpart of clearShaderTop(), used only once numGroups(numSpecies)>1. Unlike the
// display/probe MRT variants, initial conditions genuinely need to write every channel of
// every active group at once, so this needs the same GLSL3/layout(location=N) treatment as
// RDShaderTopMRT (simulation_shaders.js) - the out variables are declared here (before
// use in main(), as GLSL ES 300 requires), clearShaderBotMRT() only assigns them.
export function clearShaderTopMRT() {
  return clearShaderTop().replace(
    "varying vec2 textureCoords;",
    `varying vec2 textureCoords;
    layout(location = 0) out highp vec4 fragColor0;
    layout(location = 1) out highp vec4 fragColor1;`,
  );
}

// MRT counterpart of clearShaderBot(): writes group 0's initial conditions (u,v,w,q,
// unchanged) to output 0 and group 1's (u5,u6,u7,u8) to output 1.
export function clearShaderBotMRT() {
  return `
        fragColor0 = vec4(u, v, w, q);
        fragColor1 = vec4(u5, u6, u7, u8);
    }`;
}
