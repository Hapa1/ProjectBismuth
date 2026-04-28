// Raymarched black hole.
// Inspired by rmarchet/blackhole-ts (geodesic ray bending, Doppler) and
// ArjunSNair00/Gargantua (cinematic disk look). Original shader code.
//
// Per pixel we cast a ray, bend it each step toward the singularity using
// a 1/r^2 pull (a stable visual approximation of the Schwarzschild geodesic),
// detect disk-plane crossings, and finally sample a procedural starfield in
// whatever direction the bent ray ended up pointing.

precision highp float;

#define PI       3.14159265358979
#define TWO_PI   6.28318530717958
#define MAX_STEP 256

// ---- Camera ----
uniform vec3  uCamPos;
uniform mat3  uCamBasis;     // columns: right, up, -forward
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uTime;

// ---- Black hole / lensing ----
uniform float uMass;            // event-horizon radius (Rs)
uniform float uLensStrength;    // gravitational pull multiplier
uniform float uPhotonIntensity; // photon-ring brightness

// ---- Accretion disk ----
uniform float uDiskInner;
uniform float uDiskOuter;
uniform float uDiskBrightness;
uniform float uDiskOpacity;
uniform float uDiskTemp;
uniform float uDiskSpin;
uniform float uTurbulence;
uniform float uDiskTilt;        // radians
uniform float uDopplerStrength;

// ---- Stars ----
uniform float uStarBrightness;
uniform float uStarDensity;

// ---- Performance ----
uniform int   uSteps;

varying vec2 vUv;

// ============================================================
// Hash + noise helpers
// ============================================================
float hash12(vec2 p) {
  // Sine-based hash — softer, less directional banding than fract-mul
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Quintic smoothstep — C2 continuous, removes the visible bilinear creases
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  // Slight non-uniform rotation between octaves removes axis-aligned grid artifacts
  mat2 r = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 6; i++) {
    v += a * vnoise(p);
    p = r * p * 2.07 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// ============================================================
// Procedural starfield, sampled by ray direction
// ============================================================
vec3 starsBackground(vec3 dir) {
  vec3 d = normalize(dir);
  vec2 uv = vec2(
    atan(d.z, d.x) / TWO_PI + 0.5,
    asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5
  );

  vec3 col = vec3(0.0);

  // Three octaves of point stars
  for (int oct = 0; oct < 3; oct++) {
    float scale = 80.0 * pow(2.0, float(oct));
    vec2 p = uv * scale;
    vec2 ic = floor(p);
    vec2 fc = fract(p);

    float gate = hash12(ic + float(oct) * 13.7);
    float threshold = 1.0 - uStarDensity * 0.04 / pow(1.6, float(oct));
    if (gate > threshold) {
      vec2 jitter = vec2(hash12(ic + 1.7), hash12(ic + 3.1)) - 0.5;
      vec2 cp = fc - 0.5 - jitter * 0.6;
      float d2 = dot(cp, cp);
      float intensity = exp(-d2 * 250.0) * (0.4 + 0.6 * hash12(ic + 7.0));
      // Subtle twinkle
      intensity *= 0.75 + 0.25 * sin(uTime * 1.7 + gate * 28.0);
      // Spectral colour (blue-white → warm white → orange)
      float spec = hash12(ic + 5.0);
      vec3 c =
        spec < 0.20 ? vec3(0.65, 0.78, 1.0) :
        spec < 0.55 ? vec3(1.0,  0.97, 0.92) :
        spec < 0.85 ? vec3(1.0,  0.86, 0.6)  :
                      vec3(1.0,  0.66, 0.38);
      col += c * intensity;
    }
  }

  // Faint Milky-Way-like band running through the equator
  float band = exp(-pow((uv.y - 0.5) * 6.0, 2.0));
  col += band * 0.04 * vec3(0.55, 0.45, 0.7) * fbm(uv * 8.0);

  return col * uStarBrightness;
}

// ============================================================
// Disk sampling — heat gradient + FBM turbulence + Doppler shift
// ============================================================
vec3 hotColor(float t) {
  vec3 deep  = vec3(0.45, 0.02, 0.0);
  vec3 warm  = vec3(1.0,  0.42, 0.04);
  vec3 gold  = vec3(1.0,  0.88, 0.52);
  vec3 white = vec3(1.0,  0.97, 0.90);
  if (t < 0.33) return mix(deep, warm, t / 0.33);
  if (t < 0.66) return mix(warm, gold, (t - 0.33) / 0.33);
  return mix(gold, white, (t - 0.66) / 0.34);
}

vec4 sampleDisk(vec3 hitPoint, vec3 rayDir) {
  float r        = length(hitPoint.xz);
  float angle    = atan(hitPoint.z, hitPoint.x);
  float rNorm    = clamp((r - uDiskInner) / max(uDiskOuter - uDiskInner, 0.001), 0.0, 1.0);

  // ---- Procedural disk turbulence ----
  // Differential rotation: inner edge spins faster than the outer (Keplerian flavour).
  float keplerian = uDiskSpin * (1.0 + 1.4 / max(r, 0.4));
  float a         = angle + uTime * keplerian;

  // Anisotropic UV: many cells around the ring, fewer across its width — mimics
  // gas being sheared into long thin streamers by orbital velocity. Logarithmic
  // radial coord prevents cells from stretching as r grows.
  float logR    = log(max(r, 0.5));
  vec2  baseUV  = vec2(a * 14.0, logR * 9.0 - uTime * 0.6);

  // Two slightly offset samples form a free supersample, softening cell seams.
  float n1 = fbm(baseUV);
  float n2 = fbm(baseUV + vec2(0.07, -0.05));
  float swirl = fbm(vec2(a * 24.0 + n1 * 2.5, logR * 18.0));
  float density = mix(0.5 * (n1 + n2), swirl, 0.45);

  // Thin tangential streamers — the "filament" look of a hot disk
  float streamers = 0.5 + 0.5 * sin(
    a * 32.0
    + logR * 6.0
    + n1 * 6.0
    + uTime * 0.8
  );
  streamers = pow(streamers, 3.0);

  // Heat: hottest at the inner edge
  float heat = pow(1.0 - rNorm, mix(1.8, 0.9, uDiskTemp));
  vec3  col  = hotColor(heat);

  // Brightness profile
  float bri  = pow(1.0 - rNorm, 1.4) * 2.2;
  bri       += pow(density,   3.5) * uTurbulence * 1.6;
  bri       += streamers * uTurbulence * 0.55 * (1.0 - rNorm * 0.4);

  // Doppler: relativistic beaming on the side of the disk moving toward us
  vec3  orbit   = normalize(vec3(-hitPoint.z, 0.0, hitPoint.x));
  float doppler = dot(orbit, -rayDir);
  float dShift  = 1.0 + doppler * uDopplerStrength * (1.0 - rNorm * 0.6);
  bri          *= clamp(dShift * dShift, 0.15, 4.5);
  col          *= mix(vec3(1.05, 0.95, 0.85), vec3(0.85, 0.95, 1.10),
                      0.5 + 0.5 * doppler);

  // Soft inner / outer fades
  float innerFade = smoothstep(0.0, 0.06, rNorm);
  float outerFade = smoothstep(1.0, 0.85, rNorm);
  float alpha     = innerFade * outerFade * uDiskOpacity;

  return vec4(col * bri * uDiskBrightness, alpha);
}

// ============================================================
// Raymarcher
// ============================================================
vec3 traceRay(vec3 ro, vec3 rd) {
  vec3  pos    = ro;
  vec3  vel    = rd;
  vec3  accum  = vec3(0.0);
  float opa    = 0.0;       // accumulated disk opacity
  bool  ate    = false;     // crossed event horizon

  float Rs    = uMass;
  float Rs2   = Rs * Rs;

  for (int i = 0; i < MAX_STEP; i++) {
    if (i >= uSteps) break;

    float r = length(pos);

    // Event horizon — absorb the ray
    if (r < Rs) { ate = true; break; }
    // Escape — let the ray hit the starfield with whatever direction it has
    if (r > 90.0) break;

    // Adaptive step: small near the BH, large far from it
    float dt = clamp(r * 0.18, 0.04, 1.6);

    // Gravitational pull (1/r^2 toward origin). uLensStrength scales the bend.
    vec3  toBH = -pos / max(r, 1e-4);
    float pull = uLensStrength * Rs2 / max(r * r, 1e-4);
    vel += toBH * pull * dt;

    // Photon-ring brightening — light tracing close to ~1.5 Rs glows
    float photonR = 1.5 * Rs;
    float pd      = abs(r - photonR);
    if (pd < 0.18 * Rs) {
      float falloff = 1.0 - pd / (0.18 * Rs);
      accum += vec3(1.0, 0.78, 0.32) * uPhotonIntensity * 0.05 * falloff;
    }

    vec3 newPos = pos + vel * dt;

    // Disk crossing: sign change in y while inside the disk's radial range
    if (sign(pos.y) != sign(newPos.y) && opa < 0.99) {
      float t   = -pos.y / (vel.y + sign(vel.y) * 1e-5);
      vec3  hit = pos + vel * t;
      float hr  = length(hit.xz);
      if (hr > uDiskInner && hr < uDiskOuter) {
        vec4 d = sampleDisk(hit, normalize(vel));
        accum += d.rgb * (1.0 - opa);
        opa   += d.a   * (1.0 - opa);
      }
    }

    pos = newPos;
  }

  // Background stars fill whatever's left
  if (!ate) {
    accum += starsBackground(normalize(vel)) * (1.0 - opa);
  }

  return accum;
}

void main() {
  // Pixel → camera-space ray
  vec2 ndc      = vUv * 2.0 - 1.0;
  vec3 dirLocal = normalize(vec3(
    ndc.x * uAspect * uTanHalfFov,
    ndc.y * uTanHalfFov,
    -1.0
  ));
  vec3 dirWorld = uCamBasis * dirLocal;

  // Tilt the world around X by -uDiskTilt so the disk (on y=0) appears tilted
  float ct = cos(-uDiskTilt);
  float st = sin(-uDiskTilt);
  mat3  tiltM = mat3(
    1.0, 0.0, 0.0,
    0.0,  ct,  st,
    0.0, -st,  ct
  );
  vec3 ro = tiltM * uCamPos;
  vec3 rd = tiltM * dirWorld;

  vec3 col = traceRay(ro, rd);

  // Soft Reinhard tone-map; bloom pass picks up highlights afterwards
  col = col / (1.0 + col * 0.55);

  gl_FragColor = vec4(col, 1.0);
}
