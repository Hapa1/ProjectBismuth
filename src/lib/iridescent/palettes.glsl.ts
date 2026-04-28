// Shared GLSL chunks used by the iridescent material. Inlined as string
// constants and concatenated at material build time so we don't depend on
// any GLSL #include preprocessor.

export const HSV2RGB_GLSL = /* glsl */ `
vec3 irHsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
`;

// Apex-style cosine palette. `offset` shifts hue band; pass vec3(0.55,0.88,1.22)
// for the violet→cyan→pink default.
export const COSINE_SPECTRUM_GLSL = /* glsl */ `
vec3 irCosineSpectrum(float t, vec3 offset) {
  return 0.5 + 0.5 * cos(6.2831 * (offset + t));
}
`;

// Voronoi/Lattice-style 4-sine HSV color field — animated in time, varies
// over a 2D position. Returns RGB.
export const COLOR_FIELD_GLSL = /* glsl */ `
vec3 irColorField(vec2 p, float t) {
  float a = sin(p.x * 0.55 + t * 0.13);
  float b = sin(p.y * 0.47 - t * 0.11);
  float c = sin((p.x + p.y) * 0.31 + t * 0.07);
  float d = sin(length(p) * 0.62 - t * 0.09);
  float hue = 0.55 + 0.16 * (a + b) + 0.10 * (c + d);
  float sat = 0.62 + 0.22 * sin(t * 0.05 + p.x * 0.4);
  return irHsv2rgb(vec3(fract(hue), clamp(sat, 0.3, 0.9), 1.0));
}
`;
