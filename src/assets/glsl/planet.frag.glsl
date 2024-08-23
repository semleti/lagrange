#ifdef GL_ES
precision highp float;
#endif

struct NoiseParameters {
    int type;
    float freq;
    float amp;
    float lac;
    int oct;
};

// Noise uniforms
uniform float u_radius;
uniform NoiseParameters u_gnd_noise;

// Bump uniforms
uniform bool u_bump;
uniform float u_bump_offset;
uniform float u_bump_strength;

// Water & roughness/metalness uniforms
uniform float u_water_level;
uniform float u_water_roughness;
uniform float u_ground_roughness;
uniform float u_water_metalness;
uniform float u_ground_metalness;

// Biome uniforms
uniform bool u_biomes;
uniform int u_temp_mode;
uniform int u_humi_mode;
uniform NoiseParameters u_temp_noise;
uniform NoiseParameters u_humi_noise;
uniform sampler2D u_temp_tex;
uniform sampler2D u_humi_tex;

// Color ramp uniforms
uniform float[16] u_cr_positions;
uniform vec3[16] u_cr_colors;
uniform int u_cr_size;

in vec2 vUv;
in vec3 vPos;
in vec3 vTangent;
in vec3 vBitangent;

@import functions/fbm;
@import functions/color_utils;
@import functions/normal_utils;

// Biome function
vec3 apply_biomes(float t, float h, vec3 color) {
    vec2 tTexCoord = vec2(t, 0.5);
    vec2 hTexCoord = vec2(h, 0.5);
    vec4 tTexel = texture2D(u_temp_tex, tTexCoord);
    //vec4 hTexel = texture2D(u_humi_tex, hTexCoord);
    
    vec3 biomeColor = color;
    biomeColor = mix(color, tTexel.xyz, tTexel.w);
    //biomeColor = mix(color, hTexel.xyz, hTexel.w);
    return biomeColor;
}

// Bump mapping function, pretty mediocre but enough for a start...
// Calculates height derivatives, then perturbs the normal according to these values
vec3 apply_bump(float height) {
    vec3 dx = vTangent * u_bump_offset;
    vec3 dy = vBitangent * u_bump_offset;
    float dxHeight = fbm3(vPos + dx, u_gnd_noise.freq, u_gnd_noise.amp, u_gnd_noise.lac, u_gnd_noise.oct);
    float dyHeight = fbm3(vPos + dy, u_gnd_noise.freq, u_gnd_noise.amp, u_gnd_noise.lac, u_gnd_noise.oct);
    return perturb_normal(vPos, dx, dy, height, dxHeight, dyHeight, u_radius, u_bump_strength);
}

void main() {
    // temp/humi fields
    float FLAG_POLAR_GRADIENT = step(0.5, float(u_temp_mode));
    float FLAG_NOISE_GRADIENT = step(1.5, float(u_temp_mode));
    float y = mix(abs(vPos.y), vPos.y, FLAG_POLAR_GRADIENT);
    float adjustedY = smoothstep(1.0, -FLAG_POLAR_GRADIENT, y);
    float tHeight = mix(adjustedY, 0.75, FLAG_NOISE_GRADIENT);
    tHeight *= fbm3(vPos, u_temp_noise.freq, u_temp_noise.amp, u_temp_noise.lac, u_temp_noise.oct);
    //float hHeight = mix(smoothstep(1.0, 0.0, 1.0 - abs(vPos.y)), 0.75, float(u_humi_mode));
    //hHeight *= fbm3(vPos, u_humi_noise.freq, u_humi_noise.amp, u_humi_noise.lac, u_humi_noise.oct);

    // initial color (always black)
    vec3 color = vec3(0.0);

    // Initial heightmap & flags
    float height = fbm3(vPos, u_gnd_noise.freq, u_gnd_noise.amp, u_gnd_noise.lac, u_gnd_noise.oct);
    float FLAG_LAND = step(u_water_level, height);
    float FLAG_BIOMES = FLAG_LAND * float(u_biomes);

    // Render noise as color
    color += height;
    color = color_ramp(u_cr_colors, u_cr_positions, u_cr_size, color.x);

    // Render biomes
    color = mix(color, apply_biomes(tHeight, /* hHeight */ 0.0, color), FLAG_BIOMES);

    // Set outputs
    csm_Bump = mix(vNormal, apply_bump(height), FLAG_LAND);
    csm_Roughness = mix(u_water_roughness, u_ground_roughness, FLAG_LAND);
    csm_Metalness = mix(u_water_metalness, u_ground_metalness, FLAG_LAND);
    csm_DiffuseColor = vec4(color, 1.0);
}