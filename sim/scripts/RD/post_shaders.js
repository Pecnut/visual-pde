// post_shaders.js

export function computeDisplayFunShaderTop() {
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
       `;
}

export function computeDisplayFunShaderMid() {
  return `
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

        float value = FUN;
				float height = value;
                float yVecComp;
				if (customSurface) {
					height = (HEIGHT) / L;
				}
        if (vectorField) {
          height = XVECFUN;
          yVecComp = YVECFUN;
          VECFIELDPLACEHOLDER
        }
        if (overlayLine) {
          height = OVERLAYEXPR;
        }
        if (isnan(value)) {
          value = 1.0/0.0;
        }
        gl_FragColor = vec4(value, 0.0, height, yVecComp);`;
}

// If the sample point is near the edge of the domain, set all vector components to zero.
export function postShaderDomainIndicatorVField(fun) {
  return `
  if (float(indicatorFunL) <= 0.0 || float(indicatorFunR) <= 0.0 || float(indicatorFunT) <= 0.0 || float(indicatorFunB) <= 0.0) {
    height = 0.0;
    yVecComp = 0.0;
  }
  `
    .replace(
      /indicatorFunL/,
      fun.replaceAll(/\bx\b/g, "(x-dx)").replaceAll(/\buvwq\./g, "uvwqL."),
    )
    .replace(
      /indicatorFunR/,
      fun.replaceAll(/\bx\b/g, "(x+dx)").replaceAll(/\buvwq\./g, "uvwqR."),
    )
    .replace(
      /indicatorFunT/,
      fun.replaceAll(/\by\b/g, "(y+dy)").replaceAll(/\buvwq\./g, "uvwqT."),
    )
    .replace(
      /indicatorFunB/,
      fun.replaceAll(/\by\b/g, "(y-dy)").replaceAll(/\buvwq\./g, "uvwqB."),
    );
}

export function postShaderDomainIndicator() {
  return `
  gl_FragColor.g = float(float(indicatorFun) <= 0.0);`;
}

export function postGenericShaderBot() {
  return `}`;
}

export function interpolationShader() {
  return `varying vec2 textureCoords;
    uniform sampler2D textureSource;

    void main()
    {
			// Bilinear interpolation of scalar values.
            ivec2 texSize = textureSize(textureSource,0);
            float fx = fract(textureCoords.x * float(texSize.x) - 0.5);
            float fy = fract(textureCoords.y * float(texSize.y) - 0.5);
            float lowerx = textureCoords.x - fx / float(texSize.x);
            float lowery = textureCoords.y - fy / float(texSize.y);
            float upperx = lowerx + 1.0 / float(texSize.x);
            float uppery = lowery + 1.0 / float(texSize.y);

            float valueLB = texture2D(textureSource, vec2(lowerx, lowery)).r;
            float valueLT = texture2D(textureSource, vec2(lowerx, uppery)).r;
            float valueRB = texture2D(textureSource, vec2(upperx, lowery)).r;
            float valueRT = texture2D(textureSource, vec2(upperx, uppery)).r;

            float value = mix(mix(valueLB, valueRB, fx), mix(valueLT, valueRT, fx), fy);
            
            gl_FragColor = texture2D(textureSource, textureCoords);
            gl_FragColor.r = value;
      }`;
}

export function minMaxShader() {
  return `varying vec2 textureCoords; 
    uniform sampler2D textureSource;
    uniform vec2 srcResolution;
    uniform bool firstFlag;
    
    void main()
    {
      // Get the min and max of the nearby pixels in the texture source.
      // Step of one pixel in the source texture.
      vec2 onePixel = vec2(1) / srcResolution;
      vec2 uv = textureCoords - 0.5*onePixel;
        
      float minVal = 1e38;
      float maxVal = -1e38;
      vec2 vals;
      for (int y = 0; y < 2; ++y) {
        for (int x = 0; x < 2; ++x) {
          vals = texture2D(textureSource, uv + vec2(x, y) * onePixel).rg;
          if (firstFlag) { 
            vals.g = vals.r;
          }
          minVal = min(minVal, vals.r);
          maxVal = max(maxVal, vals.g);
        }
      }
      gl_FragColor = vec4(minVal, maxVal, 0.0, 0.0);
    }`;
}

export function sumShader() {
  return `varying vec2 textureCoords; 
    uniform sampler2D textureSource;
    uniform vec2 srcResolution;

    void main()
    {
      // Sum the nearby pixels in the texture source.
      ivec2 outTexel = ivec2(gl_FragCoord.xy);
      float sumVal = 0.0;
      for (int y = 0; y < 2; ++y) {
        for (int x = 0; x < 2; ++x) {
          ivec2 srcTexel = outTexel * 2 + ivec2(x, y);
          if (srcTexel.x < int(srcResolution.x) && srcTexel.y < int(srcResolution.y)) {
            sumVal += texture2D(textureSource, (vec2(srcTexel) + 0.5) / srcResolution).r;
          }
        }
      }
      gl_FragColor = vec4(sumVal, 0.0, 0.0, 0.0);
    }`;
}

export function probeShader() {
  return `varying vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform float dx;
    uniform float dy;
    uniform float L;
    uniform float L_x;
    uniform float L_y;
    uniform float L_min;
    uniform float t;
		uniform bool pointProbe;
    uniform bool probeUVs;
    uniform float probeU;
    uniform float probeV;
    uniform sampler2D imageSourceOne;
    uniform sampler2D imageSourceTwo;

    AUXILIARY_GLSL_FUNS
    
    void main() 
    {
			
      // x and y coordinates of the probe point.
      float x;
      float y;
			vec2 probeTexCoords;
			if (pointProbe)
			{
      	if (probeUVs) {
        	x = probeU * L_x + MINX;
        	y = probeV * L_y + MINY;
     		} else {
        	x = PROBE_X;
        	y = PROBE_Y;
      	}
      	probeTexCoords = vec2((x - MINX) / L_x, (y - MINY) / L_y);
			} else {
				probeTexCoords = textureCoords;
				x = textureCoords.x * L_x + MINX;
				y = textureCoords.y * L_y + MINY;
			}
      ivec2 texSize = textureSize(textureSource,0);
      float step_x = 1.0 / float(texSize.x);
      float step_y = 1.0 / float(texSize.y);
      vec2 probeTexCoordsL = probeTexCoords + vec2(-step_x, 0.0);
      vec2 probeTexCoordsLL = probeTexCoordsL + vec2(-step_x, 0.0);
      vec2 probeTexCoordsR = probeTexCoords + vec2(+step_x, 0.0);
      vec2 probeTexCoordsRR = probeTexCoordsR + vec2(+step_x, 0.0);
      vec2 probeTexCoordsT = probeTexCoords + vec2(0.0, +step_y);
      vec2 probeTexCoordsTT = probeTexCoordsT + vec2(0.0, +step_y);
      vec2 probeTexCoordsB = probeTexCoords + vec2(0.0, -step_y);
      vec2 probeTexCoordsBB = probeTexCoordsB + vec2(0.0, -step_y);

      // Sample.
      vec4 uvwq = texture2D(textureSource, probeTexCoords);
      vec4 uvwqL = texture2D(textureSource, probeTexCoordsL);
      vec4 uvwqR = texture2D(textureSource, probeTexCoordsR);
      vec4 uvwqT = texture2D(textureSource, probeTexCoordsT);
      vec4 uvwqB = texture2D(textureSource, probeTexCoordsB);
      vec4 uvwqLL = texture2D(textureSource, probeTexCoordsLL);
      vec4 uvwqRR = texture2D(textureSource, probeTexCoordsRR);
      vec4 uvwqTT = texture2D(textureSource, probeTexCoordsTT);
      vec4 uvwqBB = texture2D(textureSource, probeTexCoordsBB);

      // Compute derivatives.
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
      vec4 uvwqXX = (uvwqR - 2.0*uvwq + uvwqL) / (dx*dx);
      vec4 uvwqYY = (uvwqT - 2.0*uvwq + uvwqB) / (dy*dy);

      // Compute the probe value.
      gl_FragColor = vec4(PROBE_FUN, 0.0, x, y);
    }`;
}
