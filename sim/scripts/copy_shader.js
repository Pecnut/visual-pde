// copy_shaders.js

export function copyShader() {
    return `varying vec2 textureCoords;
    uniform sampler2D textureSource;

    AUXILIARY_GLSL_FUNS

    void main()
    {
        gl_FragColor = textureBilinear(textureSource, textureCoords);
    }`;
}

// Restores a checkpoint with more than 4 species (one texture per species group) into the
// state's two render targets, sampling as checkpointMaterial (a MeshBasicMaterial) does for
// up to 4 species: at the texture coordinates times repeat plus offset (which crop the
// checkpoint to the domain's aspect ratio), with the checkpoint textures' own filtering.
export function checkpointShaderMRT() {
    return `varying vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform sampler2D textureSourceGroup1;
    uniform vec2 checkpointRepeat;
    uniform vec2 checkpointOffset;
    layout(location = 0) out highp vec4 fragColor0;
    layout(location = 1) out highp vec4 fragColor1;

    void main()
    {
        vec2 uv = textureCoords * checkpointRepeat + checkpointOffset;
        fragColor0 = texture(textureSource, uv);
        fragColor1 = texture(textureSourceGroup1, uv);
    }`;
}

// Copies a texture exactly, texel for texel, into a target of the same size (e.g. to read
// one attachment of a multiple render target back). Unlike copyShader(), whose interpolation
// at the rasterised texture coordinates can blend in a sliver of a neighbouring texel on
// large textures, it fetches the texel under each fragment.
export function exactCopyShader() {
    return `uniform sampler2D textureSource;

    void main()
    {
        gl_FragColor = texelFetch(textureSource, ivec2(gl_FragCoord.xy), 0);
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

    AUXILIARY_GLSL_FUNS

    void main()
    {
        fragColor0 = textureBilinear(textureSource, textureCoords);
        fragColor1 = textureBilinear(textureSourceGroup1, textureCoords);
    }`;
}