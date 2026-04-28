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
uniform float uPulseRadius;
// 0 = glow (immediate gaussian), 1 = ripple (ring that travels outward).
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
  for (int i = 0; i < MAX_PULSES; i++) {
    if (i >= uPulseCount) break;
    float ai = uPulseI[i];
    if (ai <= 0.001) continue;
    float ad = length(vWorldXY - uPulsePos[i]);
    float spot;
    if (ripple) {
      // Ring whose radius grows with age. Reuse uPulseRadius as ring thickness.
      float front = uPulseAge[i] * uPulseSpeed;
      float diff = ad - front;
      // Suppress the ring before it has actually formed (no light at origin
      // immediately). A small ramp prevents a "spawn flash" at d≈0.
      float emerge = smoothstep(0.0, ar * 0.6, front);
      spot = exp(-(diff * diff) / (ar * ar)) * ai * emerge;
    } else {
      spot = exp(-(ad * ad) / (ar * ar)) * ai;
    }
    pulseSpot += spot;
    // Each pulse picks a hue offset; saturate strongly.
    vec3 hue = hsv2rgb(vec3(fract(uPulseHue[i]), 0.85, 1.0));
    pulseColor += hue * spot;
  }

  float totalSpot = pointerSpot + pulseSpot;
  if (totalSpot < 0.001) discard;

  vec3 col = (pointerColor + pulseColor) * (halo * 0.8 + core * 4.0) * uIntensity;

  gl_FragColor = vec4(col, halo * clamp(totalSpot, 0.0, 1.5));
}
