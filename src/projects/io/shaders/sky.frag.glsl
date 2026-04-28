precision highp float;

uniform float uTime;
uniform float uLevel;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;

varying vec3 vWorldDir;

// Cheap hash noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

void main() {
  // y in [-1, 1] with 1 at zenith
  float y = clamp(vWorldDir.y, -1.0, 1.0);
  // Remap so horizon (y≈0) is the lavender band, zenith deep indigo
  float t = smoothstep(-0.05, 0.95, y);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.55, t));
  col = mix(col, uTop, smoothstep(0.45, 1.0, t));

  // Subtle noise breathing — lifts slightly with audio level
  float n = noise(vWorldDir.xz * 4.0 + uTime * 0.03);
  col += (n - 0.5) * 0.04 * (1.0 + uLevel * 1.5);

  // Soft glow toward horizon to blend with beams
  float horizonGlow = smoothstep(0.25, -0.05, abs(y));
  col += uHorizon * horizonGlow * 0.18 * (0.6 + uLevel * 0.6);

  gl_FragColor = vec4(col, 1.0);
}
