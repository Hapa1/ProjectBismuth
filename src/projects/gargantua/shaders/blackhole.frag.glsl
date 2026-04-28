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
// Disk sampling — heat gradient + smooth swirl + Doppler
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

// Returns (col*bri, alpha) for a point on the disk midplane.
// Noise is in seam-free Cartesian+log space — no atan2 wrap seam,
// no harsh pow() quantisation, just a gentle swirl multiplier.
vec4 sampleDisk(vec3 p, vec3 rayDir) {
  float r     = length(p.xz);
  float rNorm = clamp((r - uDiskInner) / max(uDiskOuter - uDiskInner, 0.001), 0.0, 1.0);

  // Wide smooth radial envelope — no hard inner/outer rings
  float radial = smoothstep(0.0, 0.18, rNorm) * smoothstep(1.0, 0.72, rNorm);
  if (radial < 0.001) return vec4(0.0);

  // Seam-free swirl using Cartesian+log coords
  float spin = uTime * uDiskSpin;
  float cs   = cos(spin), sn = sin(spin);
  vec2  rot  = vec2(p.x * cs - p.z * sn, p.x * sn + p.z * cs);
  float lr   = log(max(r, 0.1)) * 3.0 - uTime * 0.28;
  float n    = fbm(rot * 0.55 + vec2(lr, lr * 0.4));
  // Gentle swirl multiplier [0.72, 1.28] — no chunky clamping
  float swirl = mix(0.72, 1.28, smoothstep(0.3, 0.7, n));

  // Heat gradient — inner white-hot, outer deep red
  float heat = pow(1.0 - rNorm, mix(2.0, 1.0, uDiskTemp));
  vec3  col  = hotColor(heat);

  // Brightness: inner peak + turbulence
  float bri = (1.5 * pow(1.0 - rNorm, 1.6) + 0.25) * radial;
  bri      *= mix(1.0, swirl, uTurbulence);

  // Doppler beaming
  vec3  orbit   = normalize(vec3(-p.z, 0.0, p.x));
  float doppler = dot(orbit, -rayDir);
  float dShift  = 1.0 + doppler * uDopplerStrength * (1.0 - rNorm * 0.6);
  bri          *= clamp(dShift * dShift, 0.15, 4.5);
  col          *= mix(vec3(1.05, 0.95, 0.85), vec3(0.85, 0.95, 1.10),
                      0.5 + 0.5 * doppler);

  return vec4(col * bri * uDiskBrightness, radial * uDiskOpacity);
}

// ============================================================
// Raymarcher
// ============================================================
vec3 traceRay(vec3 ro, vec3 rd) {
  vec3  pos   = ro;
  vec3  vel   = rd;
  vec3  accum = vec3(0.0);
  float opa   = 0.0;
  bool  ate   = false;

  float Rs  = uMass;
  float Rs2 = Rs * Rs;

  for (int i = 0; i < MAX_STEP; i++) {
    if (i >= uSteps) break;

    float r = length(pos);
    if (r < Rs)   { ate = true; break; }
    if (r > 90.0) break;

    float dt = clamp(r * 0.18, 0.04, 1.6);

    // Gravity
    vec3  toBH = -pos / max(r, 1e-4);
    float pull = uLensStrength * Rs2 / max(r * r, 1e-4);
    vel += toBH * pull * dt;

    // Photon ring glow
    float pd = abs(r - 1.5 * Rs);
    if (pd < 0.18 * Rs) {
      float fo = 1.0 - pd / (0.18 * Rs);
      accum += vec3(1.0, 0.78, 0.32) * uPhotonIntensity * 0.05 * fo;
    }

    vec3 newPos = pos + vel * dt;

    // ── Hard disk slab crossing (provides disk definition) ─────────
    if (sign(pos.y) != sign(newPos.y) && opa < 0.99) {
      float t   = -pos.y / (vel.y + sign(vel.y) * 1e-5);
      vec3  hit = pos + vel * t;
      float hr  = length(hit.xz);
      if (hr > uDiskInner * 0.75 && hr < uDiskOuter * 1.15) {
        vec4 d = sampleDisk(hit, normalize(vel));
        accum += d.rgb * (1.0 - opa);
        opa   += d.a   * (1.0 - opa);
      }
    }

    // ── Soft vertical glow halo (provides the bleed / corona) ──────
    // Sample the disk at this xz position and weight by a narrow Gaussian in y.
    // The `0.04 * dt` scale keeps it as a soft bleed, not a fog filling.
    {
      float hr = length(pos.xz);
      if (hr > uDiskInner * 0.75 && hr < uDiskOuter * 1.15 && opa < 0.99) {
        float hw    = Rs * mix(0.20, 0.55, smoothstep(uDiskInner, uDiskOuter, hr));
        float yFall = exp(-(pos.y * pos.y) / (hw * hw));
        if (yFall > 0.01) {
          vec4 d = sampleDisk(vec3(pos.x, 0.0, pos.z), normalize(vel));
          accum += d.rgb * yFall * dt * 0.04 * (1.0 - opa);
        }
      }
    }

    pos = newPos;
  }

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
