// Voronoi fragment shader — seeded cells with edge SDF, parallax-shifted by per-cell
// height, and pointer + audio-pulse spotlights identical to the lattice piece.

precision highp float;

#define MAX_PULSES 8

uniform float uTime;
uniform float uIntensity;
uniform float uSeed;
uniform float uDensity;
uniform float uParallax;
uniform float uSeamWidth;

uniform vec2  uPointer;
uniform float uPointerStrength;
uniform float uPointerRadius;

uniform int   uPulseCount;
uniform vec2  uPulsePos[MAX_PULSES];
uniform float uPulseI[MAX_PULSES];
uniform float uPulseHue[MAX_PULSES];
uniform float uPulseAge[MAX_PULSES];
uniform float uPulseTravel; // max world-space distance the wave travels

varying vec2 vWorldXY;
varying vec3 vViewDir;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

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

// Two-pass voronoi: first finds the nearest site, second computes the distance to
// the closest edge between that site and any neighbor. Returns:
//   x = edge distance
//   y = cell id hash (0..1)
//   z = per-cell height hash (-1..1)
struct VR {
  float edge;
  float cellId;
  float height;
};

VR voronoi(vec2 x, float seed) {
  vec2 n = floor(x);
  vec2 f = fract(x);

  vec2 mr = vec2(0.0);
  vec2 mg = vec2(0.0);
  float md = 1e9;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g + seed);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) { md = d; mr = r; mg = g; }
    }
  }

  float edge = 1e9;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 g = mg + vec2(float(i), float(j));
      vec2 o = hash2(n + g + seed);
      vec2 r = g + o - f;
      vec2 diff = r - mr;
      float lenSq = dot(diff, diff);
      if (lenSq > 1e-5) {
        float d = dot(0.5 * (mr + r), normalize(diff));
        edge = min(edge, d);
      }
    }
  }

  vec2 cellCoord = n + mg;
  float cellId = hash1(cellCoord + seed * 17.0);
  float height = hash1(cellCoord + seed * 53.0 + 7.13) * 2.0 - 1.0;

  VR vr;
  vr.edge = edge;
  vr.cellId = cellId;
  vr.height = height;
  return vr;
}

void main() {
  // Density 1 ≈ one cell per world unit. Higher = more cells.
  vec2 p = vWorldXY * uDensity;
  float seed = uSeed;

  // Pass 1: get height at unshifted position to drive parallax.
  VR vr0 = voronoi(p, seed);
  vec2 shift = vViewDir.xy * vr0.height * uParallax;

  // Pass 2: re-evaluate at shifted position so cells appear lifted/sunken.
  VR vr = voronoi(p + shift, seed);

  // Seam mask using edge distance. Width is in cell units.
  float halo = 1.0 - smoothstep(0.0, uSeamWidth * 6.0, vr.edge);
  float core = pow(1.0 - smoothstep(0.0, uSeamWidth, vr.edge), 2.0);

  // World-space coords of the *visible* cell center (approximate, used for
  // pointer / pulse distance so spotlights track the parallaxed surface).
  vec2 worldShifted = vWorldXY + shift / max(uDensity, 0.0001);

  // Pointer
  float pr = max(uPointerRadius, 0.001);
  float pd = length(worldShifted - uPointer);
  float pointerSpot = exp(-(pd * pd) / (pr * pr)) * uPointerStrength;
  vec3 pointerColor = colorField(worldShifted, uTime) * pointerSpot;

  // Pulses — traveling waves that ripple outward and are gated by the seam
  // mask, so light effectively "follows" the voronoi edges for ~1–2 cells.
  float maxR = max(uPulseTravel, 0.001);
  vec3 pulseColor = vec3(0.0);
  float pulseSpot = 0.0;
  float edgePhase = vr.cellId * 6.2831 + vr.height * 3.0
                  + worldShifted.x * 0.6 + worldShifted.y * 0.4;
  for (int i = 0; i < MAX_PULSES; i++) {
    if (i >= uPulseCount) break;
    float ai = uPulseI[i];
    if (ai <= 0.001) continue;

    float age = uPulseAge[i];
    vec2 d = worldShifted - uPulsePos[i];
    float dist = length(d);

    // Wave front position grows with age. Slight ease-out for a snappy start.
    float front = maxR * (1.0 - pow(1.0 - age, 1.8));
    // Gaussian ring around the front. Wider than before so the wave reads with
    // similar luminance to the steady pointer spotlight.
    float ringSigma = max(0.32, maxR * 0.28 * (1.0 - age * 0.5));
    float ring = exp(-pow((dist - front) / ringSigma, 2.0));

    // Fade the wave's amplitude as it ages — gentler curve so the tail stays
    // legible after the front passes.
    float life = pow(1.0 - age, 0.9);

    // Keep beats legible but avoid overpowering the baseline pattern.
    float spot = ring * life * ai * 1.35;
    pulseSpot += spot;

    // Iridescent hue sweep along the wave front.
    float ang = atan(d.y, d.x);
    float h = uPulseHue[i] + 0.18 * sin(ang * 2.0 + edgePhase) + 0.10 * vr.cellId;
    float sat = 0.65 + 0.30 * core;
    vec3 hue = hsv2rgb(vec3(fract(h), sat, 1.0));
    pulseColor += hue * spot;
  }

  float totalSpot = pointerSpot + pulseSpot;
  if (totalSpot < 0.001) discard;

  // Cells with greater height get a subtle warmth bias so 3D structure reads
  // even on lit seams.
  vec3 col = (pointerColor + pulseColor) * (halo * 0.48 + core * 2.25) * uIntensity;
  col *= 1.0 + 0.12 * vr.height;

  gl_FragColor = vec4(col, halo * clamp(totalSpot, 0.0, 1.0));
}
