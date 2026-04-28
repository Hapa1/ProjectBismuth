precision highp float;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uLevel;
uniform float uMoonY;
uniform vec3 uTintA;
uniform vec3 uTintB;
uniform vec3 uTintC;
uniform float uBands;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHue;
varying float vSeed;
varying float vAudio;
varying float vY01;

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

// Cheap hash for sparkle
float hash13(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);

  // Horizontal banding driven by world-y, time, and crystal seed (no longer audio-stretched)
  float bandCount = max(2.0, uBands);
  float waves = sin((vWorldPos.y * bandCount) + uTime * 1.2 + vSeed * 6.2831);
  float bandMix = 0.5 + 0.5 * waves;

  // Three-color gradient mixed by bands (purely positional)
  vec3 lower = mix(uTintA, uTintB, smoothstep(0.0, 0.6, vY01));
  vec3 upper = mix(uTintB, uTintC, smoothstep(0.4, 1.0, vY01));
  vec3 base = mix(lower, upper, bandMix);

  // Slow vertical hue drift — independent of audio so the body stays calm
  float hueShift = vHue + uTime * 0.03;
  vec3 neon = hsl2rgb(vec3(fract(hueShift), 0.85, 0.55));
  base = mix(base, neon, 0.30);

  // Edge glow from grazing angle — static rim, no audio reaction
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float rim = pow(1.0 - ndv, 3.0);
  vec3 rimColor = mix(vec3(0.85, 0.95, 1.0), uTintC, 0.5);
  base += rimColor * rim * 0.55;

  // Moonlight wash from above — static
  float moonDot = clamp(dot(N, normalize(vec3(0.2, uMoonY, 0.4))), 0.0, 1.0);
  base += vec3(0.55, 0.65, 0.95) * moonDot * 0.25;

  // Soft inner glow at tips — static
  base += vec3(1.0, 0.92, 0.78) * pow(vY01, 4.0) * 0.22;

  // ---------------------------------------------------------------------
  // Subtle audio sparkle: pinpoint twinkles on facets, riding on treble.
  // ---------------------------------------------------------------------
  vec3 sparkleSeed = floor(vWorldPos * 18.0 + vSeed * 7.0);
  float h = hash13(sparkleSeed);
  // Each cell twinkles at its own phase; treble decides who is currently lit.
  float phase = h * 6.2831 + uTime * (1.5 + h * 2.0);
  float twinkle = pow(0.5 + 0.5 * sin(phase), 24.0);
  // Threshold so only a few cells fire at once, scaled by treble + level.
  float threshold = 0.85 - clamp(uTreble * 0.45 + uLevel * 0.15, 0.0, 0.55);
  float gate = smoothstep(threshold, threshold + 0.02, h);
  float sparkle = twinkle * gate * (0.25 + uTreble * 1.6);
  // Sparkle favors faces that point toward the camera (catches the eye).
  sparkle *= 0.4 + 0.6 * ndv;
  base += vec3(1.0, 0.96, 0.85) * sparkle;

  // Very gentle overall lift with level so the field "breathes" rather than pumps.
  base *= 0.95 + uLevel * 0.10;

  gl_FragColor = vec4(base, 1.0);
}
