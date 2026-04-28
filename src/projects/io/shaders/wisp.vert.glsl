attribute vec3 aAnchor;
attribute float aSeed;
attribute float aLife;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uReactivity;
uniform float uPixelScale;

varying float vAlpha;
varying float vSeed;

// 2D curl-noise approximation via gradient of noise
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
vec2 curl(vec2 p) {
  float e = 0.05;
  float n1 = noise(p + vec2(0.0, e));
  float n2 = noise(p - vec2(0.0, e));
  float n3 = noise(p + vec2(e, 0.0));
  float n4 = noise(p - vec2(e, 0.0));
  return vec2((n1 - n2), -(n3 - n4)) / (2.0 * e);
}

void main() {
  // Loop life [0..1] across particle
  float t = fract(uTime * 0.35 + aLife);

  // Spiral upward from anchor with curl drift
  float angle = aSeed * 6.2831 + uTime * (1.5 + aSeed * 0.8);
  float radius = 0.05 + t * 0.55 * (1.0 + uBass * 0.7);
  vec3 pos = aAnchor;
  pos.x += cos(angle) * radius;
  pos.z += sin(angle) * radius;
  pos.y += t * (1.6 + aSeed * 1.2 + uBass * 0.8);

  // Curl noise lateral drift
  vec2 c = curl(vec2(aSeed * 11.0, t * 4.0 + uTime * 0.3));
  pos.x += c.x * 0.3;
  pos.z += c.y * 0.3;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Size fades in/out across life
  float sizeShape = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.55, t);
  float size = 14.0 * sizeShape * (0.7 + uMid * 0.6 * uReactivity);
  gl_PointSize = size * uPixelScale / max(-mv.z, 0.1);

  vAlpha = sizeShape * (0.55 + uBass * 0.45);
  vSeed = aSeed;
}
