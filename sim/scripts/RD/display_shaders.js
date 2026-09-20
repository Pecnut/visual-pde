// display_shaders.js

export function fiveColourDisplayTop() {
  return `varying vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform sampler2D textureSource1;
    uniform float minColourValue;
    uniform float maxColourValue;
    uniform float dx;
    uniform float dy;
    uniform float L;
    uniform float L_x;
    uniform float L_y;
    uniform float L_min;
    uniform float t;
    uniform float globalIntegralValue1;
    uniform float globalIntegralValue2;
    uniform float globalIntegralValue3;
    uniform float globalIntegralValue4;

    uniform sampler2D imageSourceOne;
    uniform sampler2D imageSourceTwo;

    uniform vec4 colour1;
    uniform vec4 colour2;
    uniform vec4 colour3;
    uniform vec4 colour4;
    uniform vec4 colour5;
		
    uniform float dxUpscaledScale;
    uniform float dyUpscaledScale;
    uniform float embossAmbient;
    uniform float embossDiffuse;
    uniform float embossShiny;
    uniform float embossSmoothness;
    uniform float embossSpecular;
    uniform vec3 embossLightDir;

    uniform vec3 contourColour;
    uniform float contourEpsilon;
    uniform float contourStep;

    uniform vec3 overlayColour;
    uniform float overlayEpsilon;

    uniform bool blendImage;
    uniform float blendImageAmount;
    uniform sampler2D imageSourceBlend;

    AUXILIARY_GLSL_FUNS

    vec3 colFromValue(float val) {
        vec3 col;
        float a = 0.0;
        if (val <= colour1.a)
        {
            col = colour1.rgb;
        }
        if (val > colour1.a && val <= colour2.a)
        {
            a = (val - colour1.a)/(colour2.a - colour1.a);
            col = mix(colour1.rgb, colour2.rgb, a);
        }
        if(val > colour2.a && val <= colour3.a)
        {
            a = (val - colour2.a)/(colour3.a - colour2.a);
            col = mix(colour2.rgb, colour3.rgb, a);
        }
        if(val > colour3.a && val <= colour4.a)
        {
            a = (val - colour3.a)/(colour4.a - colour3.a);
            col = mix(colour3.rgb, colour4.rgb, a);
        }
        if(val > colour4.a && val <= colour5.a)
        {
            a = (val - colour4.a)/(colour5.a - colour4.a);
            col = mix(colour4.rgb, colour5.rgb, a);
        }
        if(val > colour5.a)
        {
            col = colour5.rgb;
        }
      return clamp(col, 0.0, 1.0);
    }

    void main()
    {   
        ivec2 texSize = textureSize(textureSource,0);
        float step_x = 1.0 / float(texSize.x);
        float step_y = 1.0 / float(texSize.y);

        vec2 values = texture2D(textureSource, textureCoords).rg;
        if (values.g > 0.5)
        {
            if (blendImage) {
                gl_FragColor = texture2D(imageSourceBlend, textureCoords);
                return;
            }
            gl_FragColor = vec4(0);
            return;
        }
        float value = values.r;
        float scaledValue = 0.5;
        if (minColourValue != maxColourValue) {
          scaledValue = (value - minColourValue) / (maxColourValue - minColourValue);
        }
        vec3 col = colFromValue(scaledValue);
				`;
}

export function fiveColourDisplayBot() {
  return `
    if (blendImage) {
      vec4 blendCol = texture2D(imageSourceBlend, textureCoords);
      col = mix(col, blendCol.rgb, clamp(blendImageAmount * blendCol.a,0.0,1.0));
    }
    gl_FragColor = vec4(col, 1.0);
	}`;
}

export function embossShader() {
  return `
    float gradX = (texture2D(textureSource, textureCoords + vec2(+step_x, 0.0)).r - texture2D(textureSource, textureCoords + vec2(-step_x, 0.0)).r);
    float gradY = (texture2D(textureSource, textureCoords + vec2(0.0, +step_y)).r - texture2D(textureSource, textureCoords + vec2(0.0, -step_y)).r);
    vec3 normal = normalize(vec3 (-gradX/dx * dxUpscaledScale, -gradY/dy * dyUpscaledScale, embossSmoothness * (maxColourValue - minColourValue)));
    float diff = max(0.0, dot(normal, embossLightDir));
    float rz = max(0.0, 2.0*diff*normal.z - embossLightDir.z);
    col = col*(embossDiffuse*diff + embossAmbient) + embossSpecular*pow(rz, embossShiny);
    `;
}

export function contourShader() {
  return `for (float contourVal = contourStep; contourVal < 1.0; contourVal += contourStep) {
    col = mix(col, contourColour, float(abs(scaledValue - contourVal) < contourEpsilon));
  }`;
}

export function overlayShader() {
  return `float x = MINX + textureCoords.x * L_x;
  float y = MINY + textureCoords.y * L_y;
  vec4 uvwq = texture2D(textureSource1, textureCoords);
  vec4 uvwqL = texture2D(textureSource1, textureCoords + vec2(-step_x, 0.0));
  vec4 uvwqR = texture2D(textureSource1, textureCoords + vec2(+step_x, 0.0));
  vec4 uvwqT = texture2D(textureSource1, textureCoords + vec2(0.0, +step_y));
  vec4 uvwqB = texture2D(textureSource1, textureCoords + vec2(0.0, -step_y));
  vec4 uvwqX = (uvwqR - uvwqL) / (2.0*dx) * dxUpscaledScale;
  vec4 uvwqY = (uvwqT - uvwqB) / (2.0*dy) * dyUpscaledScale;
  vec4 uvwqXF = (uvwqR - uvwq) / dx * dxUpscaledScale;
  vec4 uvwqYF = (uvwqT - uvwq) / dy * dyUpscaledScale;
  vec4 uvwqXB = (uvwq - uvwqL) / dx * dxUpscaledScale;
  vec4 uvwqYB = (uvwq - uvwqB) / dy * dyUpscaledScale;
  float overlayExpr = OVERLAYEXPR;
  col = mix(col, overlayColour, float(abs(overlayExpr) < overlayEpsilon));`;
}

// MRT counterpart of fiveColourDisplayTop(), used only once numGroups(numSpecies)>1. Adds a
// third sampler (textureSourceGroup1, group 1's raw current state) alongside the existing
// textureSource (post-processed display value) and textureSource1 (group 0's raw state,
// used by overlayShaderMRT below), so an overlay expression can reference species 5-8.
export function fiveColourDisplayTopMRT() {
  return fiveColourDisplayTop().replace(
    "uniform sampler2D textureSource1;",
    "uniform sampler2D textureSource1;\n    uniform sampler2D textureSourceGroup1;",
  );
}

// MRT counterpart of overlayShader(): samples group 1's 5-point stencil (uvwq2-family) from
// textureSourceGroup1, in addition to the existing group-0 stencil from textureSource1, so
// OVERLAYEXPR (already group-aware via parseShaderString) resolves correctly for group-1
// species references. The group-1 locals must be declared *before* "float overlayExpr =
// OVERLAYEXPR;" (not simply appended after overlayShader()'s text), since OVERLAYEXPR gets
// substituted with an expression that may reference them.
export function overlayShaderMRT() {
  return overlayShader().replace(
    "float overlayExpr = OVERLAYEXPR;",
    `vec4 uvwq2 = texture2D(textureSourceGroup1, textureCoords);
  vec4 uvwq2L = texture2D(textureSourceGroup1, textureCoords + vec2(-step_x, 0.0));
  vec4 uvwq2R = texture2D(textureSourceGroup1, textureCoords + vec2(+step_x, 0.0));
  vec4 uvwq2T = texture2D(textureSourceGroup1, textureCoords + vec2(0.0, +step_y));
  vec4 uvwq2B = texture2D(textureSourceGroup1, textureCoords + vec2(0.0, -step_y));
  vec4 uvwq2X = (uvwq2R - uvwq2L) / (2.0*dx) * dxUpscaledScale;
  vec4 uvwq2Y = (uvwq2T - uvwq2B) / (2.0*dy) * dyUpscaledScale;
  vec4 uvwq2XF = (uvwq2R - uvwq2) / dx * dxUpscaledScale;
  vec4 uvwq2YF = (uvwq2T - uvwq2) / dy * dyUpscaledScale;
  vec4 uvwq2XB = (uvwq2 - uvwq2L) / dx * dxUpscaledScale;
  vec4 uvwq2YB = (uvwq2 - uvwq2B) / dy * dyUpscaledScale;
  float overlayExpr = OVERLAYEXPR;`,
  );
}

export function largestSpeciesShader() {
  return `varying vec2 textureCoords;
      uniform sampler2D textureSource;
  
      void main()
      {   
          gl_FragColor = texture2D(textureSource, textureCoords);
      }`;
}

export function surfaceVertexShaderColour() {
  return `varying vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform float minColourValue;
    uniform float maxColourValue;
    uniform float heightScale;
    void main()
    {      
        textureCoords = uv;
        vec3 newPosition = position;
        float scaledValue = 0.0;
        if (minColourValue != maxColourValue) {
          float value = texture2D(textureSource, textureCoords).r;
          scaledValue = (value - minColourValue) / (maxColourValue - minColourValue) - 0.5;
        }
        newPosition.z += heightScale * scaledValue;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }`;
}

export function surfaceVertexShaderCustom() {
  return `varying vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform float minColourValue;
    uniform float maxColourValue;
    void main()
    {      
        textureCoords = uv;
        vec3 newPosition = position;
        float value = 0.0;
        if (minColourValue != maxColourValue) {
          value = texture2D(textureSource, textureCoords).b;
        }
        newPosition.z += value;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }`;
}
