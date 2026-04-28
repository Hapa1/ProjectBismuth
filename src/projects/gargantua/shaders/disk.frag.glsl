// Accretion disk fragment shader
// Produces a blackbody-gradient disk with procedural turbulence noise.
// Inner region is hot (white/yellow), outer is cool (orange/deep red).

#define PI 3.14159265358979323

uniform float uTime;
uniform float uBrightness;
uniform float uOpacity;
uniform float uColorTemperature; // 0 = cooler, 1 = hotter overall
uniform float uTurbulenceStrength;

varying float vRadiusNorm; // 0 = inner, 1 = outer
varying float vAngle;      // -PI to PI

// ---- Procedural noise ----

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion — 5 octaves
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += amp * valueNoise(p);
    p = rot * p * 2.1 + vec2(3.1, 7.4);
    amp *= 0.5;
  }
  return v;
}

// ---- Blackbody color approximation ----
// t = 0 (cool/outer) → 1 (hot/inner)
vec3 hotColor(float t) {
  vec3 deep  = vec3(0.45, 0.02, 0.0);   // deep crimson
  vec3 warm  = vec3(1.0,  0.42, 0.04);  // vivid orange
  vec3 gold  = vec3(1.0,  0.88, 0.52);  // bright gold
  vec3 white = vec3(1.0,  0.97, 0.90);  // near white

  if (t < 0.33)  return mix(deep,  warm,  t / 0.33);
  if (t < 0.66)  return mix(warm,  gold,  (t - 0.33) / 0.33);
               return mix(gold,  white, (t - 0.66) / 0.34);
}

void main() {
  float r = clamp(vRadiusNorm, 0.0, 1.0);

  // Normalize angle to [0, 1]
  float angleNorm = (vAngle + PI) / (2.0 * PI);

  // Polar noise coords: flow radially inward + swirl angularly
  vec2 noiseUV = vec2(
    angleNorm * 6.0 + uTime * 0.08,
    r * 7.0 - uTime * 0.06
  );
  float turb = fbm(noiseUV);

  // Perturb the radial position with turbulence
  float rP = r + (turb - 0.5) * uTurbulenceStrength * 0.28;
  rP = clamp(rP, 0.0, 1.0);

  // Heat: 1 at inner edge, 0 at outer; shifted by colorTemperature
  float heat = pow(1.0 - rP, mix(1.8, 0.9, uColorTemperature));
  vec3 color = hotColor(heat);

  // Brightness: peaks at inner edge, turbulence adds bright hot-spots
  float brightness  = pow(1.0 - r, 1.4) * 2.2 * uBrightness;
  brightness       += pow(turb, 3.5) * uTurbulenceStrength * 1.8;
  brightness        = max(brightness, 0.0);

  // Soft fade at inner and outer boundaries
  float innerFade = smoothstep(0.0, 0.07, r);
  float outerFade = smoothstep(1.0, 0.80, r);
  float alpha = innerFade * outerFade * uOpacity;

  gl_FragColor = vec4(color * brightness, alpha);
}
