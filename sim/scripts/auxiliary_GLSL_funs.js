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

    float safetanh(float VALUE)
    {
        return 1.0 - 2.0/(1.0+exp(2.0*VALUE));
    }

    float safepow(float x, float y) {
      if (x >= 0.0) {
          return pow(x,y);
      }
      if (mod(round(y),2.0) == 0.0) {
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
