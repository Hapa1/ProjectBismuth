import { COLOR_FIELD_GLSL, COSINE_SPECTRUM_GLSL, HSV2RGB_GLSL } from './palettes.glsl';

// Vertex shader passes world position, view-space normal, and view dir.
// Used by every iridescent primitive (line tubes, polygons, solids).
export const IRIDESCENT_VERT = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

// Unified fragment shader — supports both palette modes:
//   uPaletteMode = 0 → cosine spectrum (Apex-style fresnel iridescence)
//   uPaletteMode = 1 → HSV color field (Voronoi/Lattice-style hue cycling)
// Audio uniforms (uMirage, uLevel, uTreble) are optional drivers; they
// default to neutral values when no audio source is connected.
export const IRIDESCENT_FRAG = /* glsl */ `
precision highp float;

${HSV2RGB_GLSL}
${COSINE_SPECTRUM_GLSL}
${COLOR_FIELD_GLSL}

uniform float uTime;
uniform float uIntensity;
uniform float uHueShift;
uniform vec3  uPaletteOffset;
uniform int   uPaletteMode;

uniform float uMirage;   // beat envelope, ~0.4–1.4
uniform float uLevel;    // average band energy
uniform float uTreble;   // treble band

uniform float uFresnelPower;
uniform float uRimBoost;
uniform float uInnerWash;
uniform float uAlphaBase;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);
  float ndv = max(dot(n, v), 0.0);
  float rim = pow(1.0 - ndv, uFresnelPower);
  float facing = pow(ndv, 1.5);

  vec3 col;
  if (uPaletteMode == 0) {
    // Spatial term mirrors Apex's per-face angle hue spread so different
    // parts of a recursive structure read in different hues even when most
    // surfaces face the camera (rim ≈ 0).
    float spatial = 0.18 * (vWorldPos.x + vWorldPos.y * 0.7 + vWorldPos.z * 1.3);
    float faceAngle = atan(n.x, n.z) / 6.2831 + 0.5;
    float t = uHueShift + uTime * 0.05 + uTreble * 0.5
            + rim * 1.1 + spatial + faceAngle * 0.25;
    vec3 spectrum = irCosineSpectrum(t, uPaletteOffset);
    col = spectrum * (uRimBoost + uLevel * 1.2) * rim
        + spectrum * uInnerWash * facing;
  } else {
    vec2 p = vWorldPos.xy + uPaletteOffset.xy;
    float t = uTime + uHueShift * 6.2831;
    vec3 field = irColorField(p, t);
    col = field * (rim * uRimBoost + facing * uInnerWash) * (1.0 + uLevel * 1.0);
  }

  float mirage = max(0.4, uMirage);
  col *= mirage * uIntensity;

  float alpha = clamp((rim * 0.9 + facing * 0.25 + uAlphaBase) * mirage, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;
