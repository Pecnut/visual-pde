// copy_shaders.js

export function copyShader() {
    return `varying vec2 textureCoords;
    uniform sampler2D textureSource;

    void main()
    {
        gl_FragColor = texture2D(textureSource, textureCoords);
    }`;
}

// MRT counterpart of copyShader(), used only once numGroups(numSpecies)>1 (e.g. by
// resizeTextures() to resample mrtSimTextures onto a new discretisation). Needs true
// dual-output (unlike a plain copy) since GLSL ES 300 doesn't guarantee an unwritten MRT
// attachment retains its previous contents - both groups must be explicitly copied through.
export function copyShaderMRT() {
    return `varying vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform sampler2D textureSourceGroup1;
    layout(location = 0) out highp vec4 fragColor0;
    layout(location = 1) out highp vec4 fragColor1;

    void main()
    {
        fragColor0 = texture2D(textureSource, textureCoords);
        fragColor1 = texture2D(textureSourceGroup1, textureCoords);
    }`;
}