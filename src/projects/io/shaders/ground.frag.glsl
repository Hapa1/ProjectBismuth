precision highp float;

uniform float uTime;
uniform float uMid;
uniform float uTreble;
uniform float uBass;
uniform vec3 uBase;
uniform vec3 uRune;
uniform vec3 uBleed; // beam color bleed

varying vec3 vWorld;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = vWorld.xz;
  float r = length(p);

  // Distance fade to fog edge
  float fade = smoothstep(70.0, 18.0, r);
  if (fade < 0.001) discard;

  // Domain-warped rune linework — concentric drifting curves
  vec2 q = p * 0.12 + vec2(uTime * 0.03, -uTime * 0.02);
  float warp = fbm(q);
  vec2 q2 = q + warp * 1.3;
  float lines = sin(q2.x * 4.0 + warp * 6.0 + uTime * 0.4)
              * sin(q2.y * 3.5 - warp * 5.0 - uTime * 0.3);
  float rune = smoothstep(0.55, 0.95, abs(lines));

  // Add a few sharp polar arcs
  float ang = atan(p.y, p.x);
  float arcs = smoothstep(0.94, 0.99, sin(ang * 6.0 + r * 0.4 + uTime * 0.2));

  // Base lavender-white ice (transparent overlay — let reflective floor show through)
  vec3 col = uBase * 0.55;
  // Subtle noise tint
  col += (fbm(p * 0.4) - 0.5) * 0.04;

  // Magenta/pink rune glow — pulses with mid/treble
  float runeMix = (rune + arcs * 0.6) * (0.6 + uMid * 0.7 + uTreble * 0.4);
  col = mix(col, uRune, clamp(runeMix, 0.0, 0.85));

  // Beam-color bleed near origin (faux reflection of beams)
  float beamRing = exp(-pow(r - 5.0, 2.0) * 0.025);
  col += uBleed * beamRing * (0.18 + uBass * 0.5);

  // Soft vignette toward edge — blends into sky
  col *= mix(0.45, 1.0, fade);

  // Alpha so the reflective floor underneath shows through, denser near runes
  float alpha = mix(0.45, 0.95, clamp(runeMix + 0.25, 0.0, 1.0)) * fade;

  gl_FragColor = vec4(col, alpha);
}
