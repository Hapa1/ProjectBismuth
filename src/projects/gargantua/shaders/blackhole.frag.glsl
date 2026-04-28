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
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = r * p * 2.0 + vec2(1.7, 9.2);
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

// Volumetric emissive sample.
// Returns linear-light emission (no opacity) for a single point in space; the
// raymarcher integrates this along the ray, so light naturally bleeds outward
// into a soft glow instead of forming a hard slab.
vec3 sampleDiskEmission(vec3 p, vec3 rayDir) {
  float r     = length(p.xz);
  float y     = p.y;

  // Smooth radial profile: bright peak just outside uDiskInner, soft falls off
  // toward both edges. Built from two smoothsteps so there are no hard rings.
  float inner = smoothstep(uDiskInner * 0.7, uDiskInner * 1.15, r);
  float outer = 1.0 - smoothstep(uDiskOuter * 0.55, uDiskOuter * 1.05, r);
  float radial = inner * outer;
  if (radial <= 0.0) return vec3(0.0);

  // Vertical Gaussian: thickness scales with radius (thin near the BH, puffier outside).
  // This gives the disk a smooth volumetric body — grazing rays no longer hit a slab.
  float thickness = mix(0.10, 0.45, smoothstep(uDiskInner, uDiskOuter, r)) * uMass;
  float vert      = exp(-(y * y) / (thickness * thickness));

  // Normalised radius for colour / brightness curves.
  float rNorm = clamp((r - uDiskInner) / max(uDiskOuter - uDiskInner, 0.001), 0.0, 1.0);

  // Whisper of turbulence — sampled in seam-free Cartesian space, rotated by spin.
  float spin = uTime * uDiskSpin;
  float cs   = cos(spin);
  float sn   = sin(spin);
  vec2  pxz  = vec2(p.x * cs - p.z * sn, p.x * sn + p.z * cs);
  float n    = fbm(pxz * 0.6 + vec2(uTime * 0.2, 0.0));
  // Map noise to a gentle multiplier in [0.75, 1.25] — never enough to clump.
  float swirl = mix(0.75, 1.25, smoothstep(0.25, 0.75, n));

  // Heat / colour (hot inner, cool outer).
  float heat = pow(1.0 - rNorm, mix(1.8, 0.9, uDiskTemp));
  vec3  col  = hotColor(heat);

  // Brightness — strong inner peak, gentle outer halo. Inverse-r adds a glow
  // that bleeds beyond the geometric body of the disk.
  float bri = (0.6 + 1.6 * pow(1.0 - rNorm, 1.6)) * radial * vert * swirl;
  bri      += 0.18 * radial / (0.05 + rNorm);          // inner halo bleed
  bri      += 0.30 * exp(-abs(y) / (thickness * 1.8))  // outer puff above/below
              * radial * uTurbulence * 0.5;

  // Doppler beaming
  vec3  orbit   = normalize(vec3(-p.z, 0.0, p.x));
  float doppler = dot(orbit, -rayDir);
  float dShift  = 1.0 + doppler * uDopplerStrength * (1.0 - rNorm * 0.6);
  bri          *= clamp(dShift * dShift, 0.2, 4.5);
  col          *= mix(vec3(1.05, 0.95, 0.85), vec3(0.85, 0.95, 1.10),
                      0.5 + 0.5 * doppler);

  return col * bri * uDiskBrightness * uDiskOpacity * 0.18;
}

// ============================================================
// Raymarcher
// ============================================================
vec3 traceRay(vec3 ro, vec3 rd) {
  vec3  pos    = ro;
  vec3  vel    = rd;
  vec3  accum  = vec3(0.0);
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

    // Volumetric disk: emissive contribution every step. Because the disk has
    // radial AND vertical extent, light bleeds outward to form a soft glow
    // instead of a hard slab. Using midpoint of the step keeps it stable.
    vec3 mid = pos + vel * (dt * 0.5);
    accum   += sampleDiskEmission(mid, normalize(vel)) * dt;

    pos += vel * dt;
  }

  // Background stars fill whatever's left
  if (!ate) {
    accum += starsBackground(normalize(vel));
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
