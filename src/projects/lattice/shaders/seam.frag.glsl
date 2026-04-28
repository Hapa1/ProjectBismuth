// Seam fragment shader — grid line that emits color near pointer + audio pulses.

precision highp float;

#define MAX_PULSES 8

uniform float uTime;
uniform float uIntensity;

// Pointer (mouse) spotlight.
uniform vec2  uPointer;
uniform float uPointerStrength;
uniform float uPointerRadius;

// Audio pulses (each = vec2 pos in world space, plus parallel uPulseI[i] for intensity).
uniform int   uPulseCount;
uniform vec2  uPulsePos[MAX_PULSES];
uniform float uPulseI[MAX_PULSES];
uniform float uPulseHue[MAX_PULSES];
uniform float uPulseAge[MAX_PULSES];
// Per-pulse direction mask: (+x, -x, +y, -y), each 0 or 1.
uniform vec4  uPulseDirs[MAX_PULSES];
uniform float uPulseRadius;
// 0 = glow (immediate gaussian), 1 = ripple (head travels along grid axes).
uniform float uPulseMode;
uniform float uPulseSpeed;

varying vec2 vUv;
varying vec2 vWorldXY;

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 colorField(vec2 p, float t) {
  float a = sin(p.x * 0.55 + t * 0.13);
  float b = sin(p.y * 0.47 - t * 0.11);
  float c = sin((p.x + p.y) * 0.31 + t * 0.07);
  float d = sin(length(p) * 0.62 - t * 0.09);
  float hue = 0.55 + 0.16 * (a + b) + 0.10 * (c + d);
  float sat = 0.62 + 0.22 * sin(t * 0.05 + p.x * 0.4);
  return hsv2rgb(vec3(fract(hue), clamp(sat, 0.3, 0.9), 1.0));
}

void main() {
  // Cross-strip profile: bright narrow core + soft halo.
  float across = abs(vUv.y - 0.5) * 2.0;
  float halo   = 1.0 - smoothstep(0.0, 1.0, across);
  float core   = pow(1.0 - smoothstep(0.0, 0.25, across), 2.5);

  // --- Pointer contribution -------------------------------------------------
  float pr = max(uPointerRadius, 0.001);
  float pd = length(vWorldXY - uPointer);
  float pointerSpot = exp(-(pd * pd) / (pr * pr)) * uPointerStrength;

  vec3 pointerColor = colorField(vWorldXY, uTime) * pointerSpot;

  // --- Audio pulses ---------------------------------------------------------
  float ar = max(uPulseRadius, 0.001);
  vec3 pulseColor = vec3(0.0);
  float pulseSpot = 0.0;
  bool ripple = uPulseMode > 0.5;
  float beamW = max(ar * 0.45, 0.001);
  float headSigmaSq = ar * ar;
  float beamSigmaSq = beamW * beamW;
  for (int i = 0; i < MAX_PULSES; i++) {
    if (i >= uPulseCount) break;
    float ai = uPulseI[i];
    if (ai <= 0.001) continue;
    vec2 delta = vWorldXY - uPulsePos[i];
    float spot = 0.0;
    if (ripple) {
      // The wavefront is a moving glow that travels along the seam(s) the
      // pulse picked. For each enabled direction, brightness peaks at
      // (origin + dir * age * speed) and falls off both along and across.
      float front = uPulseAge[i] * uPulseSpeed;
      float emerge = smoothstep(0.0, ar * 0.4, front);
      vec4 dirs = uPulseDirs[i];

      // +x
      if (dirs.x > 0.5 && delta.x >= 0.0) {
        float d = delta.x - front;
        spot += exp(-(d * d) / headSigmaSq)
              * exp(-(delta.y * delta.y) / beamSigmaSq) * ai * emerge;
      }
      // -x
      if (dirs.y > 0.5 && delta.x <= 0.0) {
        float d = -delta.x - front;
        spot += exp(-(d * d) / headSigmaSq)
              * exp(-(delta.y * delta.y) / beamSigmaSq) * ai * emerge;
      }
      // +y
      if (dirs.z > 0.5 && delta.y >= 0.0) {
        float d = delta.y - front;
        spot += exp(-(d * d) / headSigmaSq)
              * exp(-(delta.x * delta.x) / beamSigmaSq) * ai * emerge;
      }
      // -y
      if (dirs.w > 0.5 && delta.y <= 0.0) {
        float d = -delta.y - front;
        spot += exp(-(d * d) / headSigmaSq)
              * exp(-(delta.x * delta.x) / beamSigmaSq) * ai * emerge;
      }
    } else {
      float ad = length(delta);
      spot = exp(-(ad * ad) / (ar * ar)) * ai;
    }
    pulseSpot += spot;
    // Iridescent color: blend the per-pulse hue with the swirling colorField
    // so the ripple shimmers instead of reading as a flat color. The hue
    // offset gives each pulse its own bias.
    vec3 base = hsv2rgb(vec3(fract(uPulseHue[i]), 0.85, 1.0));
    vec3 iri  = colorField(vWorldXY + vec2(uPulseHue[i] * 7.3), uTime + uPulseAge[i] * 1.5);
    vec3 tint = ripple ? mix(base, iri, 0.75) : base;
    pulseColor += tint * spot;
  }

  float totalSpot = pointerSpot + pulseSpot;
  if (totalSpot < 0.001) discard;

  vec3 col = (pointerColor + pulseColor) * (halo * 0.8 + core * 4.0) * uIntensity;

  gl_FragColor = vec4(col, halo * clamp(totalSpot, 0.0, 1.5));
}
