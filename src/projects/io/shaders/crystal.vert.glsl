attribute float aHeight;
attribute float aWidth;
attribute float aSeed;
attribute float aBand;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uReactivity;

varying vec3 vNormalW;
varying vec3 vViewDir;
varying float vHeight01;
varying float vSeed;
varying float vBand;
varying float vShimmer;

void main() {
  // Pick band response per instance
  float band = aBand < 0.5 ? uBass : (aBand < 1.5 ? uMid : uTreble);
  float audio = band * uReactivity;

  // Stretch along Y by height * audio scale; subtle width breathing
  vec3 p = position;
  float yScale = aHeight * (1.0 + audio * 0.18);
  float xzScale = aWidth * (1.0 + audio * 0.04);
  p.x *= xzScale;
  p.z *= xzScale;
  p.y *= yScale;

  // Tiny per-vertex jitter for organic facets (deterministic via seed)
  float jitter = sin(aSeed * 12.34 + position.y * 3.0) * 0.015;
  p.x += jitter;
  p.z -= jitter;

  vec4 wp = modelMatrix * vec4(p, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - wp.xyz);
  vHeight01 = clamp(p.y / max(yScale, 0.001), 0.0, 1.0);
  vSeed = aSeed;
  vBand = aBand;
  vShimmer = uTreble * uReactivity * (0.6 + 0.6 * sin(uTime * 6.0 + aSeed * 30.0));

  gl_Position = projectionMatrix * viewMatrix * wp;
}
