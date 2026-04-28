// Starfield vertex shader
// Each star is a point with a per-vertex seed (color type) and base size.
// Time-driven twinkle is applied to both brightness and point size.

attribute float aSeed;
attribute float aSize;

uniform float uTime;
uniform float uBrightness;

varying float vSeed;
varying float vAlpha;

void main() {
  vSeed = aSeed;

  // Each star twinkles at its own frequency, seeded by aSeed
  float twinkle = 0.80 + 0.20 * sin(uTime * (1.2 + aSeed * 5.0) + aSeed * 6.2832);
  vAlpha = twinkle * uBrightness;

  vec4 mvPos   = modelViewMatrix * vec4(position, 1.0);
  gl_Position  = projectionMatrix * mvPos;

  // Perspective-correct point size, clamped for performance
  gl_PointSize = clamp(aSize * twinkle * (180.0 / -mvPos.z), 0.5, 5.0);
}
