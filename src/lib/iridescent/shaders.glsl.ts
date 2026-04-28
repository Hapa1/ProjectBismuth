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

// Unified fragment shader — supports three palette modes:
//   uPaletteMode = 0 → cosine spectrum (Apex-style fresnel iridescence)
//   uPaletteMode = 1 → HSV color field (Voronoi/Lattice-style hue cycling)
//   uPaletteMode = 2 → bleed (Apex bleed-style pointer + audio-pulse spotlights)
// Pulse / pointer uniforms are declared unconditionally so the host program
// can switch modes without rebuilding the shader source. Modes 0/1 ignore
// the pulse uniforms entirely.
export const IRIDESCENT_FRAG = /* glsl */ `
precision highp float;

#define MAX_PULSES 8

${HSV2RGB_GLSL}
${COSINE_SPECTRUM_GLSL}
${COLOR_FIELD_GLSL}

float irHash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

vec3 irColorField3(vec3 p, float t) {
  float a = sin(p.x * 0.55 + t * 0.13);
  float b = sin(p.y * 0.47 - t * 0.11);
  float c = sin((p.x + p.z) * 0.31 + t * 0.07);
  float hue = 0.55 + 0.16 * (a + b) + 0.10 * c;
  return irHsv2rgb(vec3(fract(hue), 0.75, 1.0));
}

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

// Bleed mode—pointer + audio pulses with selectable effect.
uniform vec3  uPointer;
uniform float uPointerStrength;
uniform float uPointerRadius;
uniform int   uPulseCount;
uniform vec3  uPulsePos[MAX_PULSES];
uniform float uPulseI[MAX_PULSES];
uniform float uPulseHue[MAX_PULSES];
uniform float uPulseAge[MAX_PULSES];
uniform float uPulseTravel;
uniform int   uEffect; // 0=rings 1=bloom 2=streaks 3=sparkle

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);
  float ndv = max(dot(n, v), 0.0);
  float rim = pow(1.0 - ndv, uFresnelPower);
  float facing = pow(ndv, 1.5);

  if (uPaletteMode == 2) {
    // ---- Bleed mode ------------------------------------------------------
    float rimB = pow(1.0 - ndv, 3.5);
    vec3 baseRim = vec3(0.22, 0.16, 0.40) * (rimB * 0.9 + 0.10);

    float pr = max(uPointerRadius, 0.001);
    float pd = length(vWorldPos - uPointer);
    float pointerSpot = exp(-(pd * pd) / (pr * pr)) * uPointerStrength;
    vec3 pointerColor = irColorField3(vWorldPos, uTime) * pointerSpot;

    float maxR = max(uPulseTravel, 0.001);
    vec3 pulseColor = vec3(0.0);
    for (int i = 0; i < MAX_PULSES; i++) {
      if (i >= uPulseCount) break;
      float ai = uPulseI[i];
      if (ai <= 0.001) continue;

      float age = uPulseAge[i];
      vec3 d = vWorldPos - uPulsePos[i];
      float dist = length(d);
      float life = pow(1.0 - age, 0.9);

      float spot = 0.0;
      if (uEffect == 0) {
        float front = maxR * (1.0 - pow(1.0 - age, 1.8));
        float ringSigma = max(0.32, maxR * 0.28 * (1.0 - age * 0.5));
        float ring = exp(-pow((dist - front) / ringSigma, 2.0));
        spot = ring * life * ai * 1.5;
      } else if (uEffect == 1) {
        float grow = mix(0.55, 1.15, smoothstep(0.0, 0.4, age));
        float sigma = max(0.001, maxR * 0.55 * grow);
        float glow = exp(-(dist * dist) / (sigma * sigma));
        spot = glow * life * ai * 1.3;
      } else if (uEffect == 2) {
        float front = maxR * (1.0 - pow(1.0 - age, 1.8));
        float dy = abs(d.y - front * 0.5);
        float dxz = length(d.xz);
        float bandSigma = max(0.25, maxR * 0.22);
        float widthSigma = max(0.001, maxR * 0.9);
        float band = exp(-pow(dy / bandSigma, 2.0));
        float width = exp(-pow(dxz / widthSigma, 2.0));
        spot = band * width * life * ai * 1.6;
      } else {
        float sigma = max(0.001, maxR * 0.7);
        float falloff = exp(-(dist * dist) / (sigma * sigma));
        vec3 cell = floor(vWorldPos * 6.0);
        float h = irHash13(cell + floor(uTime * 9.0 + float(i) * 3.7));
        float sparkle = step(0.78, h) * (1.0 + h * 0.6);
        spot = falloff * sparkle * life * ai * 1.8;
      }

      float ang = atan(d.y, d.x);
      float hh = uPulseHue[i] + 0.18 * sin(ang * 2.0 + uTime * 0.4);
      vec3 hue = irHsv2rgb(vec3(fract(hh), 0.85, 1.0));
      pulseColor += hue * spot;
    }

    float rimBoost = 0.45 + rimB * 1.2;
    vec3 colB = (pointerColor + pulseColor) * rimBoost * uIntensity + baseRim;
    gl_FragColor = vec4(colB, 1.0);
    return;
  }

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
    col = spectrum * (uRimBoost + uLevel * 0.6) * rim
        + spectrum * uInnerWash * facing;
  } else {
    vec2 p = vWorldPos.xy + uPaletteOffset.xy;
    float t = uTime + uHueShift * 6.2831;
    vec3 field = irColorField(p, t);
    col = field * (rim * uRimBoost + facing * uInnerWash) * (1.0 + uLevel * 0.5);
  }

  float mirage = max(0.4, uMirage);
  col *= mirage * uIntensity;

  float alpha = clamp((rim * 0.9 + facing * 0.25 + uAlphaBase) * mirage, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;
