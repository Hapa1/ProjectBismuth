// Apex bleed shader — pyramid surface lit only by pointer + audio-pulse
// spotlights, exactly like the voronoi piece. Beat-driven pulses spawn at
// random points on the surface and bleed light outward across world space.

precision highp float;

#define MAX_PULSES 8

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

uniform float uTime;
uniform float uIntensity;

uniform vec3  uPointer;        // world-space pointer hit (xyz)
uniform float uPointerStrength;
uniform float uPointerRadius;

uniform int   uPulseCount;
uniform vec3  uPulsePos[MAX_PULSES];
uniform float uPulseI[MAX_PULSES];
uniform float uPulseHue[MAX_PULSES];
uniform float uPulseAge[MAX_PULSES];
uniform float uPulseTravel;
uniform int   uEffect; // 0=rings, 1=bloom, 2=streaks, 3=sparkle

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 colorField(vec3 p, float t) {
  float a = sin(p.x * 0.55 + t * 0.13);
  float b = sin(p.y * 0.47 - t * 0.11);
  float c = sin((p.x + p.z) * 0.31 + t * 0.07);
  float hue = 0.55 + 0.16 * (a + b) + 0.10 * c;
  return hsv2rgb(vec3(fract(hue), 0.75, 1.0));
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewDir);

  // Subtle fresnel rim so the pyramid silhouette is always faintly visible
  // even between beats — gives the lights a surface to bleed across.
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.5);
  vec3 baseRim = vec3(0.18, 0.12, 0.32) * rim * 0.45;

  // Pointer spotlight in 3D world space.
  float pr = max(uPointerRadius, 0.001);
  float pd = length(vWorldPos - uPointer);
  float pointerSpot = exp(-(pd * pd) / (pr * pr)) * uPointerStrength;
  vec3 pointerColor = colorField(vWorldPos, uTime) * pointerSpot;

  // Audio pulses — behavior depends on uEffect.
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
      // Rings: traveling expanding wavefront.
      float front = maxR * (1.0 - pow(1.0 - age, 1.8));
      float ringSigma = max(0.32, maxR * 0.28 * (1.0 - age * 0.5));
      float ring = exp(-pow((dist - front) / ringSigma, 2.0));
      spot = ring * life * ai * 1.5;
    } else if (uEffect == 1) {
      // Bloom: stationary radial glow that softly grows then fades.
      float grow = mix(0.55, 1.15, smoothstep(0.0, 0.4, age));
      float sigma = max(0.001, maxR * 0.55 * grow);
      float glow = exp(-(dist * dist) / (sigma * sigma));
      spot = glow * life * ai * 1.3;
    } else if (uEffect == 2) {
      // Streaks: anisotropic vertical sweep that travels upward.
      float front = maxR * (1.0 - pow(1.0 - age, 1.8));
      float dy = abs(d.y - front * 0.5);
      float dxz = length(d.xz);
      float bandSigma = max(0.25, maxR * 0.22);
      float widthSigma = max(0.001, maxR * 0.9);
      float band = exp(-pow(dy / bandSigma, 2.0));
      float width = exp(-pow(dxz / widthSigma, 2.0));
      spot = band * width * life * ai * 1.6;
    } else {
      // Sparkle: many short-lived granular hotspots around the pulse pos.
      float sigma = max(0.001, maxR * 0.7);
      float falloff = exp(-(dist * dist) / (sigma * sigma));
      vec3 cell = floor(vWorldPos * 6.0);
      float n = hash13(cell + floor(uTime * 9.0 + float(i) * 3.7));
      float sparkle = step(0.78, n) * (1.0 + n * 0.6);
      spot = falloff * sparkle * life * ai * 1.8;
    }

    // Iridescent hue sweep around the wave.
    float ang = atan(d.y, d.x);
    float h = uPulseHue[i] + 0.18 * sin(ang * 2.0 + uTime * 0.4);
    vec3 hue = hsv2rgb(vec3(fract(h), 0.85, 1.0));
    pulseColor += hue * spot;
  }

  // Brighten contributions on the rim so highlights "rake" along edges.
  float rimBoost = 0.45 + rim * 1.2;
  vec3 col = (pointerColor + pulseColor) * rimBoost * uIntensity + baseRim;

  // Premultiplied additive — never write below baseRim.
  gl_FragColor = vec4(col, 1.0);
}
