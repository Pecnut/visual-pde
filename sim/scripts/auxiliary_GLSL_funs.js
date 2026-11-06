// auxiliary_GLSL_funs.js
export function auxiliary_GLSL_funs() {
  return `const float pi = 3.141592653589793;
  uniform bool isTwoD;
  float H(float VALUE) 
    {
        float RES = smoothstep(-0.01, 0.01, VALUE);
        return RES;
    }

    float H(float VALUE, float EDGE) 
    {
        float RES = smoothstep(-0.01, 0.01, VALUE - EDGE);
        return RES;
    }

    // Bilinear interpolation of a texture, honouring its wrap mode. Simulation textures use
    // nearest filtering, so that stencil reads at texel centres are exact, so lookups at
    // arbitrary points (u[x,y], probes, overlays, resampling) interpolate with this instead.
    // Weights within rounding error of a texel centre are snapped, so sampling at a node
    // returns exactly its value.
    // Locals are uppercase because getReservedStrs() in main.js reserves every name declared
    // here, and these mustn't clash with users' species or parameter names.
    vec4 textureBilinear(sampler2D TEX, vec2 UV) {
      vec2 SIZE = vec2(textureSize(TEX, 0));
      vec2 ST = UV * SIZE - 0.5;
      vec2 BASE = floor(ST);
      vec2 FRAC = ST - BASE;
      FRAC = mix(FRAC, vec2(0.0), vec2(lessThan(FRAC, vec2(1e-4))));
      FRAC = mix(FRAC, vec2(1.0), vec2(greaterThan(FRAC, vec2(1.0 - 1e-4))));
      vec2 C0 = (BASE + 0.5) / SIZE;
      vec2 C1 = (BASE + 1.5) / SIZE;
      return mix(
        mix(texture(TEX, C0), texture(TEX, vec2(C1.x, C0.y)), FRAC.x),
        mix(texture(TEX, vec2(C0.x, C1.y)), texture(TEX, C1), FRAC.x),
        FRAC.y
      );
    }

    float safetanh(float VALUE)
    {
        return 1.0 - 2.0/(1.0+exp(2.0*VALUE));
    }

    // x^y, extended to x < 0 as even or odd in x by the parity of y rounded to
    // the nearest integer. Halves round away from zero, explicitly, as GLSL's round() may
    // round them either way.
    float safepow(float x, float y) {
      if (x >= 0.0) {
          return pow(x,y);
      }
      float ROUNDEDY = trunc(y);
      if (abs(y - ROUNDEDY) >= 0.5) {
          ROUNDEDY += sign(y);
      }
      if (mod(ROUNDEDY,2.0) == 0.0) {
          return pow(-x,y);
      }
      return -pow(-x,y);
    }

    float Gauss(float x, float y, float MX, float MY, float SX, float SY, float CORR) {
      return exp(-((x-MX)*(x-MX)/(2.0*SX*SX)+(y-MY)*(y-MY)/(2.0*SY*SY)-CORR*(x-MX)*(y-MY)/(SX*SY))/(1.0-CORR*CORR))/(2.0*pi*SX*SY*sqrt(1.0-CORR*CORR));
    }

    float Bump(float x, float y, float MX, float MY, float MAXR) {
      float yDiff = 0.0;
      if (isTwoD) {
        yDiff = y - MY;
      }
      float RADIUSSQ = ((x-MX)*(x-MX)+(yDiff)*(yDiff)) / (MAXR*MAXR);
      if (RADIUSSQ < 1.0) {
        return exp(1.0-1.0/(1.0-RADIUSSQ));
      } else {
        return 0.0;
      }
    }`;
}
